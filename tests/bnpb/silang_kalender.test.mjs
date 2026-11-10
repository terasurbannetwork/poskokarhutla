/* SS-53 Kalender ancaman: menjalankan kalender_ancaman.py sungguhan (fixture tulisan tangan) dan membandingkan kalender_ancaman.json nyata dengan kalender_risiko.json. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {py, uji_mandiri, AKAR} from "./_silang.mjs";

const baca = p => JSON.parse(readFileSync(AKAR + p, "utf8"));
const K = baca("public/data/kalender_ancaman.json");
const RISIKO = baca("public/prediksi/data/kalender_risiko.json");

test("self-check Python kalender_ancaman.py uji hijau", () => {
  const r = uji_mandiri("scripts/umum/kalender_ancaman.py");
  assert.equal(r.status, 0, r.err);
});

const S = py("scripts/umum", `
import kalender_ancaman as k
kode = {"1101": {"prov": "11", "nama": "Kab. Aceh Selatan", "kemendagri": "11.01"}, "3271": {"prov": "32", "nama": "Kota Bogor", "kemendagri": "32.71"}, "3201": {"prov": "32", "nama": "Kab. Bogor", "kemendagri": "32.01"}}
peta = k.Peta(kode, {"aceh": "11", "jawabarat": "32"})
risiko = {"n_tahun": 9, "tahun_penuh": ["2024"], "kab": {"1101": {
  "banjir": {"ada": [3] + [0] * 11, "n": [4] + [0] * 11, "kecil": False},
  "longsor": {"ada": [1] + [0] * 11, "n": [1] + [0] * 11, "kecil": True}}}}
cakup = {"dibi": set(range(12)), "logbook": set(range(12))}
# narasi BMKG hanya Maret 2027; nama di narasi memakai "Aceh Selatan" (tanpa Kab.), kode narasi 9999 tidak dipakai
arsip = {"pch_bln|X|Maret 2027": {"periode": "bulan Maret 2027", "diambil": "2026-11-10", "wilayah": [{"kategori": "Tinggi", "rentang": "300-500 mm", "kab": [{"prov": "Aceh", "nama": "Aceh Selatan", "kode": "9999"}]}]}}
bm, tak, ambil = k.tingkat(arsip, peta)
kab = k.bangun(risiko, {}, bm, ambil, cakup)
print(json.dumps({"kab": kab, "bm_kunci": sorted(bm), "tak": tak,
  "bogor": [peta.lewat_nama("Jawa Barat", "Kota Bogor"), peta.lewat_nama("Jawa Barat", "Bogor")]}))
`);

test("p null bila total setahun kecil (< 5); ada, dari, n tetap tampil", () => {
  const b = S.kab["1101"].banjir.bulan[0], l = S.kab["1101"].longsor.bulan[0];
  assert.deepEqual([b.p, b.ada, b.dari, b.n, b.kecil], [0.33, 3, 9, 4, false]);
  assert.deepEqual([l.p, l.ada, l.dari, l.n, l.kecil], [null, 1, 9, 1, true]);
});

test("BMKG dan laju kolom terpisah, tanpa skor gabungan", () => {
  const e = S.kab["1101"];
  assert.ok(Array.isArray(e.bmkg) && e.bmkg.length === 12, "bmkg satu blok per kabupaten, 12 bulan");
  assert.ok(!("bmkg" in e.banjir.bulan[0]) && !("bmkg" in e.banjir), "bmkg tidak dicampur ke kolom laju");
  const t = JSON.stringify(S.kab).toLowerCase();
  assert.doesNotMatch(t, /skor|gabungan|indeks_gabung|"risiko"/);
  const tn = JSON.stringify(K).toLowerCase().replace(/tanpa skor gabungan/g, "");
  assert.doesNotMatch(tn, /"skor|skor_/);
  for (const [kd, e2] of Object.entries(K.kab)) assert.ok(Object.keys(e2).every(x => ["banjir", "longsor", "karhutla", "kekeringan", "bmkg"].includes(x)), `${kd}: kunci asing`);
});

test("bulan tanpa narasi BMKG = null; nama dicocokkan lewat nama, bukan kode narasi", () => {
  const m = S.kab["1101"].bmkg;
  assert.equal(m[0], null);
  assert.equal(m[2].label, "curah hujan Tinggi (300-500 mm)");
  assert.equal(m[2].lembaga, "BMKG");
  assert.deepEqual(S.bm_kunci, ["1101"]);   // kode 9999 di narasi tidak dipakai
  assert.deepEqual(S.tak, []);
  assert.deepEqual(S.bogor, ["3271", "3201"]);   // Kota dan Kab. tidak tertukar
});

test("kalender_ancaman.json nyata konsisten dengan kalender_risiko.json untuk p dan n", () => {
  assert.equal(K.kecil_di_bawah, RISIKO.kecil_di_bawah);
  let dicek = 0;
  for (const [kd, e] of Object.entries(K.kab)) for (const b of ["banjir", "longsor", "karhutla"]) {
    const h = RISIKO.kab[kd]?.[b];
    if (!e[b] || !h) continue;
    e[b].bulan.forEach((m, i) => {
      assert.equal(m.n, h.n[i], `${kd} ${b} bulan ${i + 1}: n`);
      assert.equal(m.ada, h.ada[i], `${kd} ${b} bulan ${i + 1}: ada`);
      assert.equal(m.dari, RISIKO.n_tahun);
      const kecil = h.kecil || h.ada[i] <= 2 || h.n[i] < 3;   // aturan diperketat (validasi-model): total < 5, atau ada <= 2, atau n < 3
      assert.equal(m.kecil, kecil, `${kd} ${b} bulan ${i + 1}: kecil`);
      assert.equal(m.p, kecil ? null : h.p[i], `${kd} ${b} bulan ${i + 1}: p wajib null bila kecil, sama dengan kalender_risiko bila tidak`);
      dicek++;
    });
  }
  assert.ok(dicek > 1000, "terlalu sedikit sel dibandingkan: " + dicek);
});

test("kalender_ancaman.json nyata: p null persis saat kecil; p selalu punya ada/dari", () => {
  for (const [kd, e] of Object.entries(K.kab)) for (const b of ["banjir", "longsor", "karhutla", "kekeringan"]) for (const m of e[b]?.bulan ?? []) {
    if (m.kecil === true) assert.equal(m.p, null, `${kd} ${b}`);
    if (m.p !== null) { assert.ok(m.ada !== null && m.dari > 0, `${kd} ${b}: p tanpa pembilang/penyebut`); assert.equal(m.p, Math.round(m.ada / m.dari * 100) / 100); }
  }
  const t = JSON.stringify(K).toLowerCase();
  assert.doesNotMatch(t, /\baman\b/);
  assert.doesNotMatch(t, /pantau bencana/);
});
