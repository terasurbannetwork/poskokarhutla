/* LJ-02: src/lapor_lanjut_spek.js (data/kajian-bnpb/lapor-lanjutan/ALGORITMA, RENCANA-UJI bagian 1). Fungsi murni, tanpa D1.
   Kunci rekap dicocokkan ke kolom meja dampak dan pengungsi yang sebenarnya (src/meja_spek.js), supaya LJ-12 tidak menulis kolom karangan.
   Jalan: node --test tests/lapor/lanjut_spek.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import "../../src/worker.js";   // worker dulu: meja_spek ikut rantai impor worker
import {MEJA} from "../../src/meja_spek.js";
import * as L from "../../src/lapor_lanjut_spek.js";

let n = 0;
const ob = (jenis, data, o = {}) => ({id: String(++n).padStart(16, "0"), jenis, urut: n, data, pribadi: o.pribadi ?? null, status: o.status ?? "aktif", lat: o.lat ?? null, lon: o.lon ?? null});
const rumah = (tingkat, o) => ob("rumah", {tingkat, terendam: false}, o);
const korban = (status, d = {}) => ob("korban", {status, umur: 30, jk: "l", ...d});
const jiwa = (d = {}) => ob("jiwa", {titik: "TP-AAAA1111", umur: 30, jk: "p", masuk: "2026-11-19", kk: "diri", ...d});

test("validasi: tiap jenis menolak isian wajib kosong, memisahkan isian pribadi, membuang isian tak dikenal", () => {
  for (const j of L.JENIS) assert.ok(L.validasi(j, {}).galat.length > 0, j);
  const v = L.validasi("rumah", {kk: " Budi  Santoso ", nik_kk: "3175-0101-0101-0001", desa: "Utan Kayu", kec: "Matraman", alamat: "RT 1", tingkat: "rb", terendam: true, huni: "tidak_tahu", jiwa: "4", asing: "x"});
  assert.deepEqual(v.galat, []);
  assert.deepEqual(v.pribadi, {kk: "Budi Santoso", nik_kk: "3175010101010001"});
  assert.equal(v.data.jiwa, 4); assert.equal(v.data.asing, undefined); assert.equal(v.data.kk, undefined);
  assert.deepEqual(L.validasi("rumah", {tingkat: "hancur"}).galat.includes("tingkat"), true);
});

test("validasi: wajib bersyarat dan nomor HP", () => {
  // jalan dan jembatan wajib panjang dan kendaraan; sekolah tidak
  assert.ok(L.validasi("prasarana", {jenis: "jembatan", nama: "J", desa: "D", tingkat: "rb", fungsi: "putus"}).galat.includes("panjang_m"));
  assert.ok(!L.validasi("prasarana", {jenis: "sekolah", nama: "S", desa: "D", tingkat: "rs", fungsi: "terbatas"}).galat.includes("panjang_m"));
  // kepala keluarga wajib HP (boleh "tidak_ada"); anggota keluarga tidak
  const dasar = {titik: "TP-AAAA1111", nama: "Sari", umur: 30, jk: "p", desa_asal: "D", masuk: "2026-11-19"};
  assert.ok(L.validasi("jiwa", {...dasar, kk: "diri"}).galat.includes("hp"));
  assert.equal(L.validasi("jiwa", {...dasar, kk: "diri", hp: "0812-3456-7890"}).pribadi.hp, "6281234567890");
  assert.deepEqual(L.validasi("jiwa", {...dasar, kk: "diri", hp: "tidak_ada"}).galat, []);
  assert.deepEqual(L.validasi("jiwa", {...dasar, kk: "0000000000000001"}).galat, []);
  assert.ok(L.validasi("jiwa", {...dasar, kk: "diri", hp: "tidak_ada", keluar: "2026-11-18"}).galat.includes("keluar"));
  // hilang wajib lokasi, waktu, dan status pencarian
  assert.ok(L.validasi("korban", {status: "hilang", nama: "A", umur: 9, jk: "l", desa: "D", kontak_nama: "B", kontak_hp: "tidak_ada"}).galat.includes("pencarian"));
});

test("isian teks hanya menerima teks atau angka, bukan objek atau larik (tinjauan guard-api LJ-04)", () => {
  assert.ok(L.validasi("rumah", {kk: {x: 1}}).galat.includes("kk"));
  assert.ok(L.validasi("rumah", {alamat: ["a", "b"]}).galat.includes("alamat"));
});

test("isian pribadi tercatat per jenis (tidak pernah ke AI, D19)", () => {
  assert.deepEqual(L.NAMA_PRIBADI.jiwa, ["nama", "hp", "nik", "rentan", "kebutuhan"]);
  assert.deepEqual(L.NAMA_PRIBADI.korban, ["nama", "kontak_nama", "kontak_hp", "ciri", "nik"]);
  assert.deepEqual(L.NAMA_PRIBADI.prasarana, []);
});

test("foto wajib: rumah 2, wajah hanya dewasa yang tidak menolak (Q10, Q13)", () => {
  assert.deepEqual(L.kurangFoto("rumah", {}, [{jenis: "foto"}]), {foto: 1, wajah: 0});
  assert.deepEqual(L.fotoWajib("jiwa", {umur: 17}), {foto: 0, wajah: 0});
  assert.deepEqual(L.fotoWajib("jiwa", {umur: 18}), {foto: 0, wajah: 1});
  assert.deepEqual(L.fotoWajib("jiwa", {umur: 40, menolak_foto: true}), {foto: 0, wajah: 0});
});

test("nilai metrik: jumlah bila ada objek, 0 bila nihil, null bila belum didata; batal tidak ikut", () => {
  const r = L.rekap([rumah("rb"), rumah("rb"), rumah("rb", {status: "batal"}), korban("hilang", {pencarian: "dicari"})]);
  assert.equal(r.rumah_rb, 2);
  assert.equal(r.hilang, 1);
  assert.equal(r.meninggal, null);   // hanya ada korban hilang: meninggal belum didata, bukan 0
  assert.equal(L.rekap([], {nihil: new Set(["meninggal"])}).meninggal, 0);
  assert.equal(L.rekap([korban("hilang", {pencarian: "ditemukan_meninggal"})]).meninggal, 1);
});

test("mengisi objek pada metrik nihil mencabut nihilnya", () => {
  assert.deepEqual([...L.cabutNihil(new Set(["meninggal", "hilang"]), [korban("meninggal")])], ["hilang"]);
});

test("rumah terendam tanpa rusak dihitung terendam, bukan RB/RS/RR (D8)", () => {
  const r = L.rekap([ob("rumah", {tingkat: "tidak_rusak", terendam: true})]);
  assert.equal(r.rumah_terendam, 1); assert.equal(r.rumah_rb, null);
});

test("mengungsi(t): keluar = t tidak dihitung; titikHari terpilah umur dan L/P", () => {
  const xs = [jiwa(), jiwa({keluar: "2026-11-20"}), jiwa({umur: 0, jk: "l", kk: "x"}), jiwa({masuk: "2026-11-21"})];
  assert.equal(L.rekap(xs, {tgl: "2026-11-20"}).mengungsi, 2);
  assert.deepEqual(L.titikHari(xs, "TP-AAAA1111", "2026-11-20"), {kk: 1, jiwa_total: 2, dewasa_p: 1, bayi_l: 1});
  assert.equal(L.titikHari(xs, "TP-BBBB2222", "2026-11-20"), null);
});

test("prasarana ke kolom meja: jembatan per tingkat, jalan km, sinyal ke telekom, layanan per tingkat, putus terhitung", () => {
  const r = L.rekap([ob("prasarana", {jenis: "jembatan", tingkat: "rb", fungsi: "putus"}), ob("prasarana", {jenis: "jalan", tingkat: "rs", fungsi: "terbatas", panjang_m: 1250}),
    ob("prasarana", {jenis: "sinyal", tingkat: "rr", fungsi: "berfungsi"}), ob("prasarana", {jenis: "faskes", tingkat: "rs", fungsi: "terbatas"})]);
  assert.equal(r.jembatan_rb, 1); assert.equal(r.jalan_km, 1.25); assert.equal(r.telekom_unit, 1); assert.equal(r.faskes_rs, 1); assert.equal(r.prasarana_putus, 1);
});

test("kunci rekap = kolom meja dampak; kunci titikHari = kolom meja pengungsi", () => {
  const dampak = new Set(MEJA.dampak.kolom.map(c => c.nama)), ungsi = new Set(MEJA.pengungsi.kolom.map(c => c.nama));
  assert.ok(dampak.has("rumah_rb") && dampak.has("meninggal_anak_l") && dampak.has("telekom_unit") && ungsi.has("bayi_l") && ungsi.has("kk"));   // pemeriksa tidak buta
  const xs = [rumah("rb"), rumah("rs"), rumah("rr"), ob("rumah", {tingkat: "tidak_rusak", terendam: true}), korban("meninggal", {umur: 5}), korban("luka_berat", {umur: 70, jk: "p"}),
    korban("hilang", {pencarian: "dicari"}), jiwa(), ...L.PRASARANA.filter(p => p !== "lainnya").map(p => ob("prasarana", {jenis: p, tingkat: "rs", fungsi: "terbatas", panjang_m: 10}))];
  const tanpaMeja = Object.keys(L.rekap(xs, {tgl: "2026-11-20"})).filter(k => !dampak.has(k) && k !== "prasarana_putus");
  assert.deepEqual(tanpaMeja, []);
  const umur = [0, 2, 8, 15, 30, 70].map(u => jiwa({umur: u, jk: "l", kk: "x"}));
  const tanpaUngsi = Object.keys(L.titikHari(umur, "TP-AAAA1111", "2026-11-20")).filter(k => !ungsi.has(k));
  assert.deepEqual(tanpaUngsi, []);
});

/* ambang 500 m, 72 jam, 10 m: HIPOTESIS rancangan (ALGORITMA 3, L.AMBANG); uji ini mengunci perilakunya, bukan kebenaran angkanya */
test("penanda tepat di ambang; nik_ganda tidak antarjenis dan hanya objek berkas yang diberikan", () => {
  const t = {lat: -6.2, lon: 106.85}, dLat = m => m / 111195;   // meter ke derajat lintang
  const a = rumah("rb", t);
  assert.deepEqual(L.penanda(a, {media: [{lencana: "gps", lat: t.lat + dLat(499), lon: t.lon}]}), []);
  assert.deepEqual(L.penanda(a, {media: [{lencana: "gps", lat: t.lat + dLat(501), lon: t.lon}]}), ["foto_jauh"]);
  assert.deepEqual(L.penanda(rumah("rb")), ["tanpa_titik"]);
  assert.deepEqual(L.penanda(rumah("rb"), {media: [{lencana: "exif", lat: t.lat, lon: t.lon}]}), []);   // titik dari foto
  assert.ok(L.penanda(a, {objek: [a, rumah("rs", {lat: t.lat + dLat(9), lon: t.lon})]}).includes("dobel_titik"));
  assert.ok(!L.penanda(a, {objek: [a, rumah("rs", {lat: t.lat + dLat(11), lon: t.lon})]}).includes("dobel_titik"));
  const k = Date.parse("2026-11-20T00:00:00Z");
  assert.ok(L.penanda(a, {media: [{waktu_ambil: k - 73 * 3600e3}], waktuKejadian: k}).includes("foto_lama"));
  assert.ok(!L.penanda(a, {media: [{waktu_ambil: k - 71 * 3600e3}], waktuKejadian: k}).includes("foto_lama"));
  const nik = {pribadi: {nik: "1".repeat(16)}};
  const j1 = jiwa(), j2 = jiwa(), k1 = korban("hilang", {pencarian: "dicari"});
  j1.pribadi = nik.pribadi; j2.pribadi = nik.pribadi; k1.pribadi = nik.pribadi;
  assert.ok(L.penanda(j1, {objek: [j1, j2]}).includes("nik_ganda"));
  assert.ok(!L.penanda(j1, {objek: [j1, k1]}).includes("nik_ganda"));   // jiwa tidak dibandingkan dengan korban (K8, D16)
  assert.ok(L.penanda(a, {dalamKab: () => false}).includes("luar_kab"));
});

test("temuan validasi-model: nihil mengungsi dicabut jiwa; 0 dari data yang sudah tuntas; tanpa tgl mengungsi null; umur/jk kosong tidak dirinci; nihil karangan diabaikan", () => {
  assert.deepEqual([...L.cabutNihil(new Set(["mengungsi", "hilang"]), [jiwa()])], ["hilang"]);
  const tuntas = [korban("hilang", {pencarian: "ditemukan_hidup"}), jiwa({keluar: "2026-11-10", masuk: "2026-11-01"}), ob("prasarana", {jenis: "jalan", tingkat: "rr", fungsi: "berfungsi", panjang_m: 5})];
  const r = L.rekap(tuntas, {tgl: "2026-11-20"});
  assert.deepEqual([r.hilang, r.mengungsi, r.prasarana_putus], [0, 0, 0]);
  assert.equal(L.kondisiAkhir(r).status, "selesai");
  assert.equal(L.rekap([jiwa()], {nihil: new Set(["mengungsi"])}).mengungsi, null);   // tanpa tgl: tidak pernah 0 diam-diam
  const tanpa = L.rekap([korban("meninggal", {umur: null, jk: null}), ob("korban", {status: "meninggal"})], {nihil: new Set(["foo_bar"])});
  assert.equal(tanpa.meninggal, 2);
  assert.deepEqual(Object.keys(tanpa).filter(k => k.includes("undefined") || k.includes("null") || k === "foo_bar"), []);
  assert.deepEqual(Object.keys(L.titikHari([jiwa({umur: null})], "TP-AAAA1111", "2026-11-20")), ["kk", "jiwa_total"]);
});

test("kondisi akhir: selesai hanya bila hilang, mengungsi, putus semuanya 0; null = selesai dengan catatan", () => {
  assert.equal(L.kondisiAkhir({hilang: 0, mengungsi: 0, prasarana_putus: 0, meninggal: null}).status, "selesai");
  assert.equal(L.kondisiAkhir({hilang: 1, mengungsi: 0, prasarana_putus: 0}).status, "selesai_catatan");
  assert.equal(L.kondisiAkhir({hilang: 0, mengungsi: 3, prasarana_putus: 0}).status, "selesai_catatan");
  assert.equal(L.kondisiAkhir({hilang: 0, mengungsi: 0, prasarana_putus: 2}).status, "selesai_catatan");
  const k = L.kondisiAkhir({hilang: null, mengungsi: 0, prasarana_putus: 0, meninggal: null});
  assert.equal(k.status, "selesai_catatan"); assert.match(k.alasan[0].teks, /belum didata/); assert.deepEqual(k.belum_didata, ["meninggal"]);
});

test("versi beku: sidik stabil terhadap urutan, berubah bila satu objek berubah, tanpa data pribadi", async () => {
  const berkas = {id: "b".repeat(16), induk: "LA-201126-01", kab: "31.75"};
  const x = jiwa(), y = rumah("rb"); x.pribadi = {nama: "Sari Rahasia", hp: "6281234567890"};
  const a = await L.isiBeku({berkas, semua: [x, y], rekap: {}, kondisi: {}, penutupan: {}});
  const b = await L.isiBeku({berkas, semua: [y, x], rekap: {}, kondisi: {}, penutupan: {}});
  assert.equal(a.sidik, b.sidik); assert.match(a.sidik, /^[0-9a-f]{64}$/);
  assert.ok(!a.isi.includes("Sari Rahasia") && !a.isi.includes("6281234567890") && !a.isi.includes("pribadi"));
  const c = await L.isiBeku({berkas, semua: [{...x, pribadi: {nama: "Sari R"}}, y], rekap: {}, kondisi: {}, penutupan: {}});
  assert.notEqual(c.sidik, a.sidik);
});

test("penanda: jiwa tidak pernah bertanda tanpa_titik (lokasi orang tidak disimpan, LJ-06); rumah tanpa titik tetap bertanda", () => {
  assert.deepEqual(L.penanda({id: "a", jenis: "jiwa", data: {}, pribadi: null, status: "aktif"}), []);
  assert.deepEqual(L.penanda({id: "b", jenis: "rumah", data: {}, pribadi: null, status: "aktif"}), ["tanpa_titik"]);
});

test("LJ-07 wajahBoleh satu fungsi per jenis: jiwa dewasa tidak menolak; korban hanya hilang yang masih dicari; jenis lain tidak pernah", () => {
  assert.ok(L.wajahBoleh("jiwa", {umur: 18})); assert.ok(!L.wajahBoleh("jiwa", {umur: 17})); assert.ok(!L.wajahBoleh("jiwa", {umur: 30, menolak_foto: true})); assert.ok(!L.wajahBoleh("jiwa", {}));
  assert.ok(L.wajahBoleh("korban", {status: "hilang", pencarian: "dicari"}));
  for (const d of [{status: "hilang", pencarian: "ditemukan_hidup"}, {status: "hilang", pencarian: "ditemukan_meninggal"}, {status: "meninggal"}, {status: "luka_berat"}, {status: "luka_ringan"}, {}]) assert.ok(!L.wajahBoleh("korban", d), JSON.stringify(d));
  assert.ok(!L.wajahBoleh("rumah", {status: "hilang", pencarian: "dicari"})); assert.deepEqual([...L.JENIS_WAJAH], ["jiwa", "korban"]);
  assert.deepEqual(L.kurangFoto("korban", {status: "hilang", pencarian: "dicari"}), {foto: 0, wajah: 0}, "foto semasa hidup opsional");
});

test("LJ-07 penanda: korban tidak bertanda tanpa_titik (lokasi orang tidak disimpan); nik_ganda korban dengan korban menyala", () => {
  const a = ob("korban", {status: "meninggal"}, {pribadi: {nik: "3171010101010077"}}), b = ob("korban", {status: "luka_berat"}, {pribadi: {nik: "3171010101010077"}});
  assert.deepEqual(L.penanda(a, {objek: [a]}), []); assert.ok(L.penanda(a, {objek: [a, b]}).includes("nik_ganda"));
});
