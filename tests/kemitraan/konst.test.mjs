// KM-A02: konst.py = konst.js (parse kedua berkas), bobot tiap rumus = 1,00, kamus memenuhi batas, acuan.json utuh.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baca = (p) => readFileSync(join(AKAR, p), "utf8");
const JSON_PY = () => JSON.parse(execFileSync("python3", ["-I", join(AKAR, "scripts/kemitraan/konst.py"), "--json"], { encoding: "utf8" }));
const dariJs = (teks) => {
  const m = teks.match(/const KM_KONST = (\{[\s\S]*?\n\});\n/);
  assert.ok(m, "konst.js: blok 'const KM_KONST = {...};' tidak ditemukan");
  return JSON.parse(m[1]);
};

// daftar jalur yang berbeda (kosong = identik)
function beda(a, b, jalur = "") {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) return [`${jalur}: tipe ${JSON.stringify(a)} vs ${JSON.stringify(b)}`];
  if (a === null || typeof a !== "object") return Object.is(a, b) ? [] : [`${jalur}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`];
  const kunci = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return kunci.flatMap((k) => (k in a && k in b ? beda(a[k], b[k], `${jalur}/${k}`) : [`${jalur}/${k}: hanya di satu sisi`]));
}

const PY = JSON_PY();
const JS = dariJs(baca("public/kemitraan/konst.js"));

test("konst.py dan konst.js identik", () => {
  const d = beda(PY, JS);
  assert.deepEqual(d, [], `konst.py != konst.js pada ${d.length} jalur: ${d.slice(0, 5).join("; ")}`);
});

test("fixture sengaja tak identik DITOLAK", () => {
  const rusak = baca("public/kemitraan/konst.js").replace('"P": 0.15', '"P": 0.16');
  assert.notEqual(rusak, baca("public/kemitraan/konst.js"), "fixture tidak berubah, uji tak bermakna");
  assert.ok(beda(PY, dariJs(rusak)).length >= 1, "perbedaan bobot P tidak terdeteksi");
  const hilang = baca("public/kemitraan/konst.js").replace('"JAM_PER_SKS": 170', '"JAM_PER_SKS_X": 170');
  assert.ok(beda(PY, dariJs(hilang)).length >= 1, "kunci berganti nama tidak terdeteksi");
  const tipe = baca("public/kemitraan/konst.js").replace('"KM_MAKS_POSTING": 20000', '"KM_MAKS_POSTING": "20000"');
  assert.ok(beda(PY, dariJs(tipe)).length >= 1, "angka vs string tidak terdeteksi");
});

test("jumlah bobot tiap rumus = 1,00 (dan penolak bobot rusak)", () => {
  const jumlah = (g) => Object.values(g).reduce((s, v) => s + v, 0);
  for (const [k, g] of Object.entries(PY.BOBOT)) assert.ok(Math.abs(jumlah(g) - 1) < 1e-9, `bobot '${k}' berjumlah ${jumlah(g)}`);
  assert.equal(Object.keys(PY.BOBOT).length, 7);
  assert.ok(Math.abs(jumlah({ ...PY.BOBOT.auto, H: 0.3 }) - 1) > 1e-9, "bobot rusak lolos");
});

test("taksonomi, ambang, dan konstanta wajib", () => {
  assert.equal(PY.BAHAYA.length, 11);
  assert.deepEqual(Object.keys(PY.ASPEK), Array.from({ length: 10 }, (_, i) => `A${i + 1}`));
  assert.equal(Object.keys(PY.NARASUMBER).length, 8);
  assert.deepEqual(PY.ARAH, ["konfirmasi", "akar", "kapasitas", "upaya", "kebutuhan", "harapan"]);
  assert.equal(PY.KM_MAKS_POSTING, 20000);
  assert.equal(PY.JAM_PER_SKS, 170);
  assert.ok(PY.ASUMSI_KEBIJAKAN.includes("JAM_PER_SKS") && PY.ASUMSI_KEBIJAKAN.includes("BOBOT"));
  assert.deepEqual(PY.KELAS, { P1_S: 0.7, P1_H: 0.8, P1_K: 0.6, P2_S: 0.5 });
  assert.deepEqual(Object.keys(PY.RUMPUN_BAHAYA).sort(), [...PY.BAHAYA].sort());
});

test("KE_REGISTRI cocok dengan public/bencana.json", () => {
  const reg = new Set(JSON.parse(baca("public/bencana.json")).bencana.map((x) => x.id));
  const nilai = Object.values(PY.KE_REGISTRI);
  assert.deepEqual(Object.keys(PY.KE_REGISTRI).sort(), [...PY.BAHAYA].sort());
  const luar = nilai.filter((v) => v !== "lintas" && !reg.has(v));
  assert.deepEqual(luar, [], `id registri tak ada di bencana.json (${[...reg].join(",")}): ${luar}`);
  assert.equal(PY.KE_REGISTRI.multi, "lintas");
});

test("kamus memenuhi batas minimum", () => {
  const km = JSON.parse(baca("scripts/kemitraan/kamus.json"));
  assert.deepEqual(Object.keys(km.bahaya).sort(), [...PY.BAHAYA].sort());
  assert.deepEqual(Object.keys(km.aspek).sort(), Object.keys(PY.ASPEK).sort());
  for (const [b, t] of Object.entries(km.bahaya)) assert.ok(new Set(t).size >= 8, `bahaya ${b}: ${new Set(t).size} istilah < 8`);
  for (const [a, t] of Object.entries(km.aspek)) assert.ok(new Set(t).size >= 6, `aspek ${a}: ${new Set(t).size} istilah < 6`);
  assert.ok(new Set(km.henti).size >= 150, `henti ${new Set(km.henti).size} < 150`);
  for (const t of Object.values(km.bahaya).flat().concat(Object.values(km.aspek).flat(), km.henti)) assert.equal(t, t.toLowerCase(), `istilah bukan huruf kecil: ${t}`);
  assert.deepEqual(km.stem, ["nya", "kan", "an", "s", "ing", "ed"]);
  for (const p of ["we propose", "early warning", "mitigat", "dikembangkan", "teknologi"]) assert.ok(km.solusi.includes(p), `penanda solusi '${p}' hilang`);
  assert.ok(km.bahaya.banjir.includes("flood") && km.bahaya.banjir.includes("banjir"));
  const s = JSON.parse(JSON.stringify(km)); s.bahaya.gempa = s.bahaya.gempa.slice(0, 7);
  assert.ok(new Set(s.bahaya.gempa).size < 8, "kamus 7 istilah tak terdeteksi");
});

test("acuan.json: A1-A13 lengkap, tiap kasus bercatatan; angka tangan cocok bobot konst", () => {
  const ac = JSON.parse(baca("tests/kemitraan/fixtures/acuan.json"));
  const ids = Object.values(ac).filter(Array.isArray).flat().map((k) => k.id);
  for (let i = 1; i <= 13; i++) assert.ok(ids.includes(`A${i}`), `kasus A${i} hilang`);
  for (const k of Object.values(ac).filter(Array.isArray).flat()) assert.ok(typeof k.catatan === "string" && k.catatan.length >= 20, `kasus ${k.id}: catatan kosong`);
  const w = PY.BOBOT.auto;
  const S = (komp) => {
    const ada = Object.keys(w).filter((c) => komp[c] != null);
    return ada.length < PY.MASALAH.KOMP_MIN ? null : ada.reduce((s, c) => s + w[c] * komp[c], 0) / ada.reduce((s, c) => s + w[c], 0);
  };
  for (const k of ac.skor_auto) {
    const h = S(k.masuk);
    assert.ok(k.keluar === null ? h === null : Math.abs(h - k.keluar) <= 1e-9, `skor_auto ${k.id}: tangan ${k.keluar} vs rumus ${h}`);
  }
  const d = PY.BOBOT.panggil;
  const exp3 = d.jarak * Math.exp(-3) + d.keahlian * 0.5 + d.latih + d.jam * 0.5;
  assert.ok(Math.abs(exp3 - ac.urut_panggil[0].keluar[1].skor) <= 1e-9, `A12 b: ${exp3}`);
  const dn = PY.BOBOT.donor;
  assert.ok(Math.abs(dn.bahaya + dn.aspek + dn.syarat + dn.panggilan + dn.status - ac.cocok_donor[1].keluar) <= 1e-9);
});
