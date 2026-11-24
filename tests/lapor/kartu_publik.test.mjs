/* LK-04 (paket data/kajian-bnpb/lapor-kejadian/, RENCANA-UJI U3): kartuPublik hanya dari daftar putih, tanpa bocor.
   Tiap kolom baris berisi penanda unik; kartu tidak boleh memuat satu pun penanda selain yang memang daftar putih.
   Jalan: node --test tests/lapor/kartu_publik.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {kartuPublik} from "../../src/lapor_kejadian.js";
import {barisAlun, dasarPublik, dampakRingkas} from "../../src/lapor_tampil.js";

const JAM = 3600e3, T = Date.UTC(2026, 10, 23, 3, 41, 17);   // 10.41 WIB, sengaja tidak tepat jam
const ID = "a1b2c3d4e5";
const W = {kode: "BOCOR-KODEDESA", desa: "Desa Uji", kec: "Kec Uji", kab: "Kab. Uji", kabKode: "BOCOR-KABKODE", prov: "Prov Uji", provKode: "BOCOR-PROVKODE"};
const ringkas = (o = {}) => JSON.stringify({waktuMs: T, waktuKejadian: "BOCOR-WAKTUTEKS", subjenis: "Luapan sungai", wilayah: W, lengkap: 0.9, foto: 3,
  dampakMeja: {meninggal: 1, hilang: null, luka: 4, mengungsi: 30, rumah: null}, dampak: {meninggal: 1, hilang: 0}, tempat: {sekolah: ["BOCOR-SEKOLAH"]},
  darurat: {korban: "BOCOR-DARURAT"}, bahasa: "BOCOR-BAHASA", kolomBaru: "BOCOR-KOLOMBARU", ...o});
const baris = (o = {}, rk = {}) => ({id: "BOCOR-IDLAPORAN", nomor: "BOCOR-NOMOR", jenis: "banjir", wa: "6281299990001", nama: "BOCOR-NAMA", peran: "BOCOR-PERAN",
  lat: -6.123456789, lon: 106.987654321, ketelitian: 999, terkirim: T + 60e3, status: "BOCOR-STATUS", tingkat: "BOCOR-TINGKAT", catatan: "BOCOR-CATATAN",
  perubahan: "BOCOR-PERUBAHAN", oleh: "BOCOR-PETUGAS", ip: "BOCOR-IP", perangkat: "BOCOR-PERANGKAT", kronologi: "BOCOR-KRONOLOGI", kolom_baru_d1: "BOCOR-D1",
  ringkas: ringkas(rk), ...o});
const ver = (waktu = T + 2 * JAM, tingkat = "kab") => ({waktu, tingkat, oleh: "BOCOR-OLEH", nama: "BOCOR-NAMAPETUGAS"});
const PUSAT = {lat: -6.20001234, lon: 106.81239876};
const KUNCI = ["dampak", "id", "jenis", "lokasi", "subjenis", "titik", "verifikasi", "waktu"];

test("satu pelapor: kunci hanya daftar putih, tanpa penanda bocor, nWarga tidak ada, waktu dibulatkan ke jam", () => {
  const k = kartuPublik({id: ID, anggota: [{r: baris(), verifikasi: ver()}], pusat: PUSAT});
  assert.deepEqual(Object.keys(k).sort(), KUNCI);
  const teks = JSON.stringify(k);
  assert.ok(!/BOCOR|6281299990001|-6\.12|106\.98|Luapan sungai BOCOR/.test(teks), `bocor: ${teks}`);
  assert.deepEqual(Object.keys(k.lokasi).sort(), ["desa", "kab", "kec", "prov"]);
  assert.deepEqual(Object.keys(k.verifikasi).sort(), ["oleh", "waktu"]);
  assert.equal(k.nWarga, undefined);
  assert.equal(k.waktu % JAM, 0, "dibulatkan ke jam");
  assert.equal(k.waktu, Date.UTC(2026, 10, 23, 4), "10.41 WIB dibulatkan ke 11.00 WIB (jam terdekat)");
  assert.equal(k.jenis, "Banjir"); assert.equal(k.subjenis, "Luapan sungai");
  assert.deepEqual(k.lokasi, {desa: "Desa Uji", kec: "Kec Uji", kab: "Kab. Uji", prov: "Prov Uji"});
  assert.deepEqual(k.verifikasi, {oleh: "BPBD Kab. Uji", waktu: T + 2 * JAM});
});

test("titik 4 desimal dari pusat desa, bukan koordinat laporan; tanpa pusat = null", () => {
  assert.deepEqual(kartuPublik({id: ID, anggota: [{r: baris(), verifikasi: ver()}], pusat: PUSAT}).titik, {lat: -6.2, lon: 106.8124});
  assert.equal(kartuPublik({id: ID, anggota: [{r: baris(), verifikasi: ver()}], pusat: null}).titik, null);
  assert.equal(kartuPublik({id: ID, anggota: [{r: baris(), verifikasi: ver()}], pusat: {lat: NaN, lon: 1}}).titik, null);
});

test("dua pelapor: nWarga 2, waktu tetap dibulatkan dari kejadian paling awal, verifikasi terakhir", () => {
  const a = {r: baris(), verifikasi: ver(T + 2 * JAM)}, b = {r: baris({wa: "6281299990002"}, {waktuMs: T + 30 * 60e3}), verifikasi: ver(T + 5 * JAM, "prov")};
  const k = kartuPublik({id: ID, anggota: [a, b], pusat: PUSAT});
  assert.equal(k.nWarga, 2); assert.equal(k.waktu, Date.UTC(2026, 10, 23, 4), "menit asli pelapor pertama tidak terbuka saat pelapor kedua masuk");
  assert.deepEqual(k.verifikasi, {oleh: "BPBD Provinsi Prov Uji", waktu: T + 5 * JAM});
  assert.equal(kartuPublik({id: ID, anggota: [a, {...a}], pusat: PUSAT}).nWarga, undefined, "satu nomor dua kali tetap satu pelapor (D3)");
});

test("dampak: rentang min dan maks, tidak dijumlah; kosong tidak pernah jadi 0; 0 yang dilaporkan tetap 0", () => {
  const a = {r: baris(), verifikasi: ver()};
  const b = {r: baris({wa: "6281299990002"}, {dampakMeja: {meninggal: 3, hilang: 0, luka: null, mengungsi: 10, rumah: null}}), verifikasi: ver()};
  const {dampak} = kartuPublik({id: ID, anggota: [a, b], pusat: PUSAT});
  assert.deepEqual(dampak, {meninggal: {min: 1, max: 3}, hilang: {min: 0, max: 0}, luka: {min: 4, max: 4}, mengungsi: {min: 10, max: 30}});
  assert.equal("rumah" in dampak, false, "rumah kosong di semua laporan: tidak tampil, bukan 0");
  const lama = kartuPublik({id: ID, anggota: [{r: baris({}, {dampakMeja: undefined}), verifikasi: ver()}], pusat: PUSAT});
  assert.deepEqual(lama.dampak, {}, "ringkas lama tanpa dampakMeja: kosong, tidak memakai dampak Alun-alun yang mengisi 0");
});

test("tanpa anggota terverifikasi, id bukan hash, atau waktu verifikasi rusak: tidak ada kartu", () => {
  assert.equal(kartuPublik({id: ID, anggota: [], pusat: PUSAT}), null);
  assert.equal(kartuPublik({id: "BOCOR-NOMOR", anggota: [{r: baris(), verifikasi: ver()}], pusat: PUSAT}), null);
  assert.equal(kartuPublik({id: ID, anggota: [{r: baris(), verifikasi: {waktu: null}}], pusat: PUSAT}), null);
});

test("barisAlun lewat pembentuk bersama: keluaran Alun-alun tetap sama", () => {
  const r = baris({status: "ditindaklanjuti", tingkat: "bpbd"}, {subjenis: "Belum diketahui"});
  assert.deepEqual(barisAlun(r), {ms: T, id: "BOCOR-IDLAPORAN", jenisId: "banjir", jenis: "Banjir", subjenis: null, waktu: "BOCOR-WAKTUTEKS",
    lokasi: {desa: "Desa Uji", kec: "Kec Uji", kab: "Kab. Uji", prov: "Prov Uji", provKode: "BOCOR-PROVKODE"}, dampak: {meninggal: 1, hilang: 0},
    status: "ditindaklanjuti", statusLabel: barisAlun(r).statusLabel, tingkat: "Petugas BPBD"});
});

test("label lembaga memakai kab akun pemeriksa; waktu kejadian kosong = null", () => {
  const k = kartuPublik({id: ID, anggota: [{r: baris({}, {waktuMs: undefined}), verifikasi: {...ver(), kab_nama: "Kab. Pemeriksa"}}], pusat: PUSAT});
  assert.equal(k.verifikasi.oleh, "BPBD Kab. Pemeriksa"); assert.equal(k.waktu, null);
});

test("dasarPublik tidak mengembalikan ringkasan mentah; dampakRingkas: isian tanpa angka kosong, bukan 0", () => {
  assert.deepEqual(Object.keys(dasarPublik(baris(), JSON.parse(ringkas()))).sort(), ["jenis", "jenisId", "lokasi", "subjenis"]);
  const d = dampakRingkas({isian: {meninggal: {nilai: undefined}, hilang: {nilai: ""}, luka: {nilai: "3"}, mengungsi_jiwa: {nihil: true}, rumah_berat: {belum: true}}});
  assert.deepEqual(d, {meninggal: null, hilang: null, luka: 3, mengungsi: 0, rumah: null});
});
