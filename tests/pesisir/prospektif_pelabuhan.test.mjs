// KI-25 (abrasi prospektif) dan KI-67 (pelabuhan di zona rob dan gelombang): hitungan murni + kontrak berkas.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
await import("../../public/pesisir/hitung.js");
const P = globalThis.Pesisir;
const baca = f => JSON.parse(fs.readFileSync(new URL(`../../public/${f}`, import.meta.url)));
const gel = baca("banjir/data/cuaca_gelombang.json");

test("KI-67 pelabuhan: masuk daftar bila kab berstatus rob >= Waspada ATAU gelombang >= 2,5 m; tanpa data tidak dikarang", () => {
  const g = {t0: "2026-11-16T00:00:00Z", titik: [[-6.9, 110.4, "33", "Emas", [30, 30]], [-7.7, 113.1, "35", "Tenang", [10, 10]]]};
  const pel = {pelabuhan: [["Semarang", -6.9, 110.4, "umum", "Jawa Tengah", "Semarang", 1, -6.9, 110.4], ["Rob", -7.7, 113, "perikanan", "Jawa Timur", "Probolinggo", 2, null, null],
    ["Tenang", -7.7, 113.1, "umum", "Jawa Timur", "Pasuruan", 3, -7.7, 113.1]]};
  const D = {daftar: [{prov: "Jawa Timur", kab: "Probolinggo", lv: 2}]};
  const L = P.pelabuhanZona(pel, D, g, "2026-11-16");
  assert.deepEqual(L.map(x => [x.nama, x.lv, x.hs, x.kelas]), [["Rob", 2, null, null], ["Semarang", 0, 3, "Tinggi"]], "Tenang (1,0 m, tanpa rob) tak masuk; Rob tanpa titik gelombang: hs null");
  assert.deepEqual(P.pelabuhanZona(pel, null, null, "2026-11-16"), [], "tanpa data rob dan gelombang: kosong, bukan tebakan");
  assert.deepEqual(P.pelabuhanZona(null, D, g, "2026-11-16"), []);
});

test("KI-67 pelabuhan_kab.json: kolom sejajar, kab terisi, titik gelombang ada di berkas gelombang", () => {
  const pk = baca("pesisir/data/pelabuhan_kab.json"), n = pk.kolom.length;
  assert.ok(pk.pelabuhan.length > 0);
  const gl = new Set(gel.titik.map(r => r[0] + "|" + r[1]));
  for (const r of pk.pelabuhan) {
    assert.equal(r.length, n);
    assert.ok(r[4] && r[5], r[0] + " tanpa kab");
    assert.ok(r[6] <= pk.batas_km);
    if (r[7] != null) assert.ok(gl.has(r[7] + "|" + r[8]), r[0] + " titik gelombang tak ada");
  }
});

test("KI-67 dampak.js: kartu pelabuhan memakai kepala nama seksi dan 'belum tersedia' untuk kosong", () => {
  const js = fs.readFileSync(new URL("../../public/pesisir/dampak.js", import.meta.url), "utf8");
  assert.match(js, /Pelabuhan di zona rob dan gelombang/);
  assert.match(js, /belum tersedia/);
});

test("KI-25: arsip prospektif terbaca, ramalan = laju x 1 tahun, tanpa kunci ganda; gerbang tertutup tanpa vonis lolos", () => {
  const a = baca("pesisir/data/abrasi_prospektif.json"), g = baca("data/gerbang/pesisir.json").keluaran.abrasi_prakiraan_setahun;
  assert.ok(a.baris.length > 0);
  for (const r of a.baris) { assert.equal(r.ramalan_tahun, r.tahun_dasar + 1); assert.ok(Math.abs(r.pred_delta - r.laju) < 0.006, r.id); }
  assert.equal(new Set(a.baris.map(r => r.id + "|" + r.tahun_dasar)).size, a.baris.length, "kunci ganda");
  if (g.vonis_prospektif !== "lolos") assert.equal(g.boleh_tampil, false);
});
