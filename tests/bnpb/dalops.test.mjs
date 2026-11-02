/* Fungsi murni layar Pantau Banjir Dalops (public/bnpb/dalops_hitung.js): kelompok per kab dan status surut, lama banjir, perlu ditanya,
   status banjir per kab, urutan siaga, teks WA. Kasus diambil dari deck "Situasi Banjir Sepekan" 2 Nov 2026.
   Jalan: node --test tests/bnpb/dalops.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import "../../public/bnpb/dalops_hitung.js";
const H = globalThis.DalopsHitung, HARI = "2026-11-01";
const K = (id, kab, mulai, terakhir, surut, x = {}) => ({id, prov: "Aceh", prov_kode: "11", kab: ["Kab. " + kab], kab_kode: ["11|" + kab], mulai, pertama: mulai, terakhir,
  kk: null, jiwa: null, mengungsi: null, rumah_terendam: null, tinggi_cm: null, surut, kondisi: "", ...x});

test("dua kejadian sekab dan sestatus dalam sepekan jadi satu baris: mulai paling awal, kabar paling akhir, angka terakhir", () => {
  const kel = H.kelompok([K("a", "Aceh Tenggara", "2026-10-26", "2026-10-26", false), K("b", "Aceh Tenggara", "2026-10-28", "2026-10-30", false, {kk: 532, jiwa: 1920})], HARI);
  assert.equal(kel.length, 1);
  assert.deepEqual([kel[0].mulai, kel[0].terakhir, kel[0].kk, kel[0].jiwa], ["2026-10-26", "2026-10-30", 532, 1920]);
  assert.equal(H.lama(kel[0], HARI), 7, "belum surut: dihitung s.d. hari logbook, termasuk hari mulai (deck: 7)");
});

test("kab yang punya kejadian surut dan belum muncul di dua kelompok; kejadian senyap > sepekan tidak memanjangkan lama", () => {
  const kel = H.kelompok([K("a", "Langkat", "2026-10-28", "2026-11-01", true), K("b", "Langkat", "2026-10-29", "2026-10-30", false), K("c", "Langkat", "2026-10-05", "2026-10-05", false)], HARI);
  assert.equal(kel.length, 3);
  const pekan = H.sepekan(kel, HARI);
  assert.equal(pekan.length, 2, "kejadian 5 Okt tidak masuk sepekan");
  assert.equal(H.lama(pekan.find(x => !x.surut), HARI), 4, "deck: Langkat belum surut 4 hari");
  assert.equal(H.lama(pekan.find(x => x.surut), HARI), 5, "sudah surut: s.d. kabar terakhir");
});

test("perlu ditanya: belum surut dengan kabar >= 1 hari atau angka bolong; surut tidak; urut kabar paling lama", () => {
  const kel = H.kelompok([K("a", "Nagan Raya", "2026-10-25", "2026-10-26", false), K("b", "Aceh Selatan", "2026-10-28", "2026-11-01", false, {kk: 81, jiwa: 314, tinggi_cm: [10, 20]}),
    K("c", "Pidie Jaya", "2026-10-25", "2026-11-01", false), K("d", "Gayo Lues", "2026-10-28", "2026-10-30", true), K("e", "Nias Selatan", "2026-10-02", "2026-10-02", false)], HARI);
  const t = H.perluDitanya(kel, HARI);
  assert.deepEqual(t.map(x => x.nama), ["Nias Selatan", "Nagan Raya", "Pidie Jaya"], "Aceh Selatan lengkap dan baru, Gayo Lues surut");
  assert.equal(t[0].senyap, true); assert.equal(t[1].umur, 6);
  assert.deepEqual(t[1].kurang, ["kabar", "kk", "jiwa", "tinggi"]);
  assert.deepEqual(t[2].kurang, ["kk", "jiwa", "tinggi"], "kabar hari ini tidak dianggap kurang");
});

test("status per kab = tertinggi di kecamatannya; siaga urut level, sudah banjir dulu, lalu hujan", () => {
  const st = {hari: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"], kec: {
    "11|Nagan Raya|A": {b: [1, 2, 0, 1], h3: 100}, "11|Nagan Raya|B": {b: [0, 1, 2, 2], h3: 114.7},
    "61|Ketapang|A": {b: [2, 2, 0, 1], h3: 91.7}, "35|Lumajang|A": {b: [2, 2, 0, 0], h3: 89.3}, "11|Aceh Barat|A": {b: [2, 1, 1, 1], h3: 81.7}, "13|Pesisir Selatan|A": {b: [1, 1, 1, 1], h3: 85.8}}};
  const sk = H.statusKab(st);
  assert.deepEqual(sk["11|Nagan Raya"].b, [1, 2, 2, 2]); assert.equal(sk["11|Nagan Raya"].h3, 114.7);
  const s = H.siaga(sk, new Set(["11|Nagan Raya", "11|Aceh Barat"]));
  assert.deepEqual(s.map(x => x.nama), ["Nagan Raya", "Aceh Barat", "Ketapang", "Lumajang"], "Waspada saja tidak ikut pada ambang bawaan");
  assert.equal(H.siaga(sk, new Set(), 1).length, 5);
});

test("teks WA: menyebut kab, tanggal, daftar yang diminta bernomor, tanpa sapaan nama", () => {
  const [x] = H.perluDitanya(H.kelompok([K("a", "Dairi", "2026-10-23", "2026-10-26", false, {kk: 10})], HARI), HARI);
  const t = H.pesanWA(x);
  assert.match(t, /BPBD Dairi/); assert.match(t, /sejak 23 Oktober 2026, kabar terakhir 26 Oktober 2026/);
  assert.match(t, /1\. Kondisi terkini dan apakah banjir sudah surut\n2\. Jumlah jiwa terdampak\n3\. Tinggi genangan \(cm\)\n4\. Jumlah warga mengungsi/);
  assert.doesNotMatch(t, /KK terdampak/, "KK sudah ada, tidak diminta"); assert.doesNotMatch(t, /Bapak|Pak |·/);
});
