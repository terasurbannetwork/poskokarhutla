/* LK-01 (paket data/kajian-bnpb/lapor-kejadian/, RENCANA-UJI U1): aturan satu desa dan batas rantai (ALGORITMA A1) di hitungGugus.
   Kasus 1-10 RENCANA-UJI U1; uji emas membandingkan dengan salinan beku sebelum A1 (tests/lapor/fixtures/gugus_lama.mjs).
   Jalan: node --test tests/lapor/gugus_desa.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {hitungGugus, JENDELA_DESA_JAM, RANTAI_MAKS_JAM} from "../../src/lapor_gugus.js";
import {hitungGugus as gugusLama} from "./fixtures/gugus_lama.mjs";

const J = 3600e3, T0 = Date.UTC(2026, 10, 19, 3);
// titik B sengaja 8 km dari A (di luar radius 3 km banjir) supaya hanya aturan desa yang bisa menyambung
const L = (nomor, o) => ({nomor, jenis: "banjir", lat: -6.2, lon: 106.85, kab: "Kota Jakarta Timur", desa: "3175031001", t: T0, wa: nomor, fotoSah: false, status: "baru", ...o});
const JAUH = {lat: -6.272};

test("konstanta HIPOTESIS bawaan Q1 dan Q2", () => { assert.equal(JENDELA_DESA_JAM, 24); assert.equal(RANTAI_MAKS_JAM, 72); });

test("1: desa sama, selisih 10 jam, jarak 8 km: tersambung oleh aturan desa, chip satu desa", () => {
  const h = hitungGugus([L("A"), L("B", {...JAUH, t: T0 + 10 * J})]);
  assert.equal(h.gugus.length, 1); assert.equal(h.gugus[0].n_pelapor, 2); assert.equal(h.gugus[0].satu_desa, true);
});

test("2: desa sama, selisih 30 jam: tidak tersambung", () => assert.equal(hitungGugus([L("A"), L("B", {...JAUH, t: T0 + 30 * J})]).gugus.length, 0));

test("3: desa berbeda, jarak 2 km, selisih 3 jam: radius lama, bukan chip satu desa", () => {
  const h = hitungGugus([L("A"), L("B", {desa: "3175031002", lat: -6.218, t: T0 + 3 * J})]);
  assert.equal(h.gugus.length, 1); assert.equal(h.gugus[0].satu_desa, false);
});

test("4: satu nomor tiga kali di desa sama: tidak ada gugus", () =>
  assert.equal(hitungGugus([L("A"), L("A2", {wa: "A", t: T0 + 5 * J}), L("A3", {wa: "A", t: T0 + 20 * J})]).gugus.length, 0));

test("5: rantai 76 jam di satu desa (tiap celah <= 24 jam, satu komponen) dipotong di celah terbesar jadi dua kejadian laporan", () => {
  // celah 10, 10, 24, 10, 22 jam: tanpa pemotongan semuanya satu komponen; potongan di celah 24 jam (C ke D)
  const h = hitungGugus([L("A"), L("B", {t: T0 + 10 * J}), L("C", {t: T0 + 20 * J}), L("D", {t: T0 + 44 * J}), L("E", {t: T0 + 54 * J}), L("F", {t: T0 + 76 * J})]);
  assert.deepEqual(h.gugus.map(g => g.anggota), [["A", "B", "C"], ["D", "E", "F"]]);
  for (const g of h.gugus) assert.ok(g.akhir - g.mulai <= RANTAI_MAKS_JAM * J);
  // celah seri 20, 20, 20, 20: celah paling awal dipilih, A sendirian tidak mendirikan gugus, sisanya 60 jam
  assert.deepEqual(hitungGugus([0, 20, 40, 60, 80].map((x, k) => L("ABCDE"[k], {t: T0 + x * J}))).gugus.map(g => g.anggota), [["B", "C", "D", "E"]]);
  // pemotongan berulang: 0..120 jam bercelah 20 jam
  for (const g of hitungGugus([0, 20, 40, 60, 80, 100, 120].map((x, k) => L(`R${k}`, {t: T0 + x * J}))).gugus) assert.ok(g.akhir - g.mulai <= RANTAI_MAKS_JAM * J);
});

test("6: laporan tidak_valid tidak ikut menyambung", () =>
  assert.equal(hitungGugus([L("A"), L("B", {...JAUH, t: T0 + 10 * J, status: "tidak_valid"})]).gugus.length, 0));

test("7: kekeringan dan abrasi tidak dihitung (Q3)", () => {
  for (const jenis of ["kekeringan", "abrasi"]) assert.equal(hitungGugus([L("A", {jenis}), L("B", {jenis, t: T0 + 2 * J})]).gugus.length, 0, jenis);
});

test("8: mode luas (gempa) tidak memakai aturan desa", () => {
  assert.equal(hitungGugus([L("A", {jenis: "gempa"}), L("B", {jenis: "gempa", kab: "Lain", t: T0 + 10 * J})]).gugus.length, 0);
  assert.equal(hitungGugus([L("A", {jenis: "gempa"}), L("B", {jenis: "gempa", t: T0 + 10 * J})]).gugus.length, 1, "kab sama dalam 12 jam tetap (aturan lama)");
});

test("10: kode desa kosong pada salah satu: aturan desa tidak berlaku", () => {
  assert.equal(hitungGugus([L("A", {desa: null}), L("B", {...JAUH, t: T0 + 10 * J})]).gugus.length, 0);
  assert.equal(hitungGugus([L("A", {desa: ""}), L("B", {...JAUH, desa: "", t: T0 + 10 * J})]).gugus.length, 0);
});

test("9 emas: masukan tanpa desa sama di luar jendela lama dan tanpa rantai di atas 72 jam = keluaran identik dengan versi lama", () => {
  let benih = 7; const acak = () => (benih = (benih * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const JENIS = ["banjir", "longsor", "cuaca", "karhutla", "kebakaran_gedung", "gempa", "erupsi", "kekeringan"];
  let kasus = 0;
  for (let r = 0; r < 400; r++) {
    const n = 2 + Math.floor(acak() * 9), xs = [];
    for (let i = 0; i < n; i++) xs.push({nomor: `N${r}-${i}`, jenis: JENIS[Math.floor(acak() * JENIS.length)], lat: acak() < 0.1 ? null : -6.2 + acak() * 0.08, lon: 106.85 + acak() * 0.08,
      kab: ["K1", "K2"][Math.floor(acak() * 2)], desa: acak() < 0.15 ? null : `D${Math.floor(acak() * 4)}`, t: T0 + Math.floor(acak() * 40) * J, wa: `W${Math.floor(acak() * 4)}`,
      fotoSah: acak() < 0.3, status: acak() < 0.1 ? "tidak_valid" : "baru"});
    // syarat emas: tidak ada pasangan desa sama yang hanya tersambung di luar jendela lama (rentang waktu 40 jam < 72 jam, jadi rantai tidak dipotong)
    const desaLuar = xs.some((a, i) => xs.some((b, j) => j > i && a.jenis === b.jenis && a.desa && a.desa === b.desa && Math.abs(a.t - b.t) > 6 * J));
    if (desaLuar) continue;
    kasus++;
    const baru = hitungGugus(xs), lama = gugusLama(xs);
    assert.deepEqual(baru.gugus.map(({satu_desa, ...g}) => g), lama.gugus, `putaran ${r}`);
    assert.deepEqual(baru.per, lama.per, `putaran ${r}`);
    assert.ok(baru.gugus.every(g => g.satu_desa === false), "tanpa sambungan desa di luar jendela lama tidak ada chip satu desa");
  }
  assert.ok(kasus >= 50, `kasus emas terlalu sedikit: ${kasus}`);
});
