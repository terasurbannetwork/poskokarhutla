import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {existsSync, readFileSync, statSync} from "node:fs";

const DIR = "public/banjir/data/bukti";

for (const s of ["bukti_das", "citra_banjir"]) {
  test(`${s}.py uji lulus`, () => {
    const r = spawnSync("python3", [`scripts/banjir/${s}.py`, "uji"], {encoding: "utf8"});
    assert.equal(r.status, 0, r.stderr);
  });
}

const adaBukti = existsSync(`${DIR}/index.json`);
const dalam = (x, y, rings) => { let c = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };

test("bukti DAS: invarian tiap daerah (dibaca ulang tanpa Python)", {skip: !adaBukti}, () => {
  const idx = JSON.parse(readFileSync(`${DIR}/index.json`, "utf8"));
  assert.ok(idx.daerah.length >= 5, `hanya ${idx.daerah.length} daerah, minimal 5`);
  for (const e of idx.daerah) {
    const d = JSON.parse(readFileSync(`${DIR}/${e.slug}.json`, "utf8"));
    const ha = d.das.luas_km2 * 100;
    assert.ok(d.das.luas_km2 > 0, `${d.kunci}: luas DAS ${d.das.luas_km2}`);
    const cincin = d.das.geom.coordinates.map(p => p[0]);
    assert.ok(dalam(d.keluaran.lon, d.keluaran.lat, cincin), `${d.kunci}: titik keluaran di luar DAS`);
    assert.ok(d.hutan.hilang_ha <= d.hutan.awal_ha, `${d.kunci}: hilang ${d.hutan.hilang_ha} > hutan awal ${d.hutan.awal_ha}`);
    assert.ok(d.hutan.awal_ha <= ha * 1.05, `${d.kunci}: hutan awal ${d.hutan.awal_ha} > luas DAS ${ha} ha`);
    let jumlahJenis = 0;
    for (const [j, k] of Object.entries(d.konsesi)) {
      if (typeof k !== "object" || k === null) continue;   // "lengkap" (null/false)
      assert.ok(k.luas_ha <= ha * 1.05, `${d.kunci}: konsesi ${j} ${k.luas_ha} ha > DAS ${ha} ha`);
      assert.ok(k.hilang_ha <= d.hutan.hilang_ha + 1, `${d.kunci}: hilang di konsesi ${j} > hilang di DAS`);
      const sm = Object.values(k.hilang_tahun).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sm - k.hilang_ha) <= Object.keys(k.hilang_tahun).length, `${d.kunci}: konsesi ${j}: jumlah hilang per tahun ${sm} != total ${k.hilang_ha}`);
      if (j !== "semua") jumlahJenis += k.luas_ha;
    }
    assert.ok(d.konsesi.semua.luas_ha <= jumlahJenis + 1, `${d.kunci}: konsesi semua ${d.konsesi.semua.luas_ha} ha > jumlah per jenis ${jumlahJenis} ha`);
    assert.ok("lengkap" in d.konsesi, `${d.kunci}: penanda kelengkapan konsesi hilang`);
    const s1 = d.citra?.s1;
    if (s1) assert.ok(s1.sesudah.tgl >= s1.kejadian.tanggal && s1.sebelum.tgl < s1.kejadian.tanggal, `${d.kunci}: tanggal S1 ${s1.sebelum.tgl}/${s1.sesudah.tgl} vs kejadian ${s1.kejadian.tanggal}`);
    if (!d.korelasi.bisa) assert.equal(d.korelasi.r, null, `${d.kunci}: r harus null bila data tak cukup`);
    assert.ok(statSync(`${DIR}/${e.slug}.json`).size <= 200000, `${e.slug}.json melebihi plafon 200 KB`);
    for (const g of d.citra?.gambar || []) assert.ok(statSync(`${DIR}/${g}`).size <= 120000, `${g} melebihi plafon 120 KB`);
  }
});

test("bukti DAS: halaman merujuk berkas yang ada dan bukti.js tetap dimuat index banjir", () => {
  const h = readFileSync("public/banjir/laporan-das.html", "utf8");
  for (const m of h.matchAll(/(?:src|href)="(\/banjir\/[^"?#]+)"/g)) assert.ok(existsSync("public" + m[1]), `${m[1]} tidak ada`);
  assert.match(readFileSync("public/banjir/index.html", "utf8"), /<script src="bukti\.js"><\/script>/);
});
