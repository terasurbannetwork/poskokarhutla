/* Satu bentuk statistik, dua penyusun: scripts/karbon/statistik.py (penyaringan massal) dan public/karbon/susun_stat.js
   (worker, tombol "Tarik data satelit"). Uji ini menyusun respons GFW nyata Pangean (fixture) dengan keduanya dan menuntut
   hasil identik, lalu memastikan akuntansi berjalan wajar di atas stat nyata itu. Jalankan: node --test tests/karbon/*.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {susunStat} from "../../public/karbon/susun_stat.js";
import {baseline, proyeksiKredit, skorSaring, gabungAsumsi} from "../../public/karbon/akuntansi.js";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baca = p => JSON.parse(readFileSync(path.join(AKAR, p), "utf8"));
const mentah = baca("tests/karbon/fixtures/pangean_gfw.json"), kontrak = baca("public/karbon/gfw_kueri.json");
const tanpaWaktu = s => { const {diambil, ...sisa} = s; return sisa; };

function statPython() {
  const kode = "import sys, json; sys.path.insert(0, 'scripts/karbon'); import statistik; " +
    "print(json.dumps(statistik.susun(json.load(open('tests/karbon/fixtures/pangean_gfw.json')))))";
  const r = spawnSync("python3", ["-I", "-c", kode], {cwd: AKAR, encoding: "utf8"});
  assert.equal(r.status, 0, `statistik.py gagal: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

test("susun stat: Python dan JS identik pada respons GFW nyata Pangean", () => {
  const py = tanpaWaktu(statPython()), js = tanpaWaktu(susunStat(mentah, kontrak));
  assert.deepEqual(js, py, "statistik.py dan susun_stat.js menyusun bentuk §3.2 berbeda");
});

test("susun stat Pangean: invarian fisik (hutan <= luas, hilang per tahun <= hutan, pendorong <= hilang)", () => {
  const s = susunStat(mentah, kontrak);
  assert.ok(s.hutan2000_ha > 0 && s.hutan2000_ha <= s.luas_ha, `hutan ${s.hutan2000_ha} vs luas ${s.luas_ha}`);
  assert.equal(s.tahun_data_akhir, 2025);
  let total = 0;
  for (const [th, h] of Object.entries(s.hilang)) {
    total += h.ha;
    const pd = Object.values(h.pendorong || {}).reduce((a, p) => a + p.ha, 0);
    assert.ok(pd <= h.ha + 0.05, `${th}: pendorong ${pd} > hilang ${h.ha}`);
    assert.ok(h.ha_gambut <= h.ha + 0.01 && h.ha_primer <= h.ha + 0.01, `${th}: gambut/primer melebihi hilang`);
  }
  assert.ok(total < s.hutan2000_ha, `kumulatif hilang ${total} melebihi hutan 2000`);
});

test("akuntansi di atas stat nyata: angka hingga, kredit >= 0, saringan pendorong menurunkan baseline", () => {
  const s = susunStat(mentah, kontrak), a = gabungAsumsi({});
  const semua = baseline(s, {...a, pendorong_baseline: ["1", "2", "3", "4", "5", "6", "7"]}), cegah = baseline(s, a);
  assert.ok(cegah.hilang_rerata_ha < semua.hilang_rerata_ha,
    `Pangean = konsesi tebang: baseline tak terencana ${cegah.hilang_rerata_ha} ha/th harus < semua ${semua.hilang_rerata_ha} ha/th`);
  assert.ok(cegah.hilang_tebang_rerata_ha > 0, "tebang teramati (indikasi IFM) harus terbaca");
  const p = proyeksiKredit(s, a);
  for (const r of p.baris) for (const [k, v] of Object.entries(r)) if (typeof v === "number") assert.ok(Number.isFinite(v) && v >= 0, `${r.tahun} ${k}=${v}`);
  const sk = skorSaring(s, a);
  assert.ok(Number.isFinite(sk.npv_usd) && Array.isArray(sk.alasan) && Array.isArray(sk.peringatan));
});
