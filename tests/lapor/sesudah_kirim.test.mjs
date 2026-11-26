/* Sesudah laporan terkirim dan tempat menunggu orang dicari (pemilik 26 Nov 2026):
   1. kartu Nomor penting (yang sama dengan menu Nomor penting) tampil sesudah lapor kejadian, darurat, dan orang dicari, terdekat dari lokasi laporan;
   2. "Ke mana ... diantar" di web memakai kartu cari tempat (minta "antar"), hasilnya tetap teks di tempat_tunggu; WA tetap mengetik.
   Jalankan: node --test tests/lapor/sesudah_kirim.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {putaran} from "../../src/lapor_mesin.js";

const js = readFileSync(new URL("../../public/lapor/lapor.js", import.meta.url), "utf8");
const potong = (awal, akhir) => { const i = js.indexOf(awal); assert.ok(i >= 0, awal); return js.slice(i, js.indexOf(akhir, i)); };

let jam = 0;
async function keTempat(saluran) {
  const W = async () => ({desa: "Sukamaju", kec: "Cibinong", kab: "Kab. Bogor", kabKode: "32.01", provKode: "32", kode: "32.01.01.2001", sekitar: []});
  let sesi = null, pelapor = null, h;
  const kirim = async p => { h = await putaran({sesi, pelapor, pesan: {...(typeof p === "string" ? {teks: p} : p), wa: "6280000000000", ...(saluran ? {saluran} : {})}, wilayah: W, kini: ++jam}); sesi = h.sesi; pelapor = h.pelapor; return h; };
  for (const t of ["orang hilang", "1", "1", "Budi Santoso"]) await kirim(t);
  await kirim({lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}});
  if (saluran === "web") {   // web: nama, panggilan, kelamin, umur satu kartu; tinggi dan berat satu kartu (pemilik 26 Nov 2026)
    await kirim("1"); await kirim({form: {nama: "Siti Aminah", panggilan: "Ami", kelamin: "Perempuan", umur: "9"}}); await kirim("1"); await kirim({form: {tinggi: "", berat: ""}});
    for (const t of ["kaos merah", "Lewati", "Lewati"]) await kirim(t);
  } else for (const t of ["1", "Siti Aminah", "Ami", "1", "2", "9", "1", "1", "kaos merah", "1", "Lewati"]) await kirim(t);   // tinggi dan berat: Tidak tahu
  if (saluran === "web") await kirim({form: {tanggal: "1970-01-01", jam: ""}}); else await kirim("1");
  for (const t of ["0813 1122 4455", "1"]) await kirim(t);
  return {h, kirim, sesi: () => sesi};
}

test("web: langkah tempat meminta kartu cari tempat, pilihan tersimpan sebagai teks", async () => {
  const {h, kirim, sesi} = await keTempat("web");
  assert.equal(sesi().status, "cari_tempat"); assert.equal(h.minta, "antar"); assert.equal(h.form, null, "tanpa kotak isian mesin");
  assert.match(h.balasan, /Ke mana Siti Aminah diantar/); assert.match(h.balasan, /Cari tempat Anda menunggu/);
  const pendek = await kirim("ok"); assert.equal(pendek.sesi.status, "cari_tempat"); assert.equal(pendek.minta, "antar", "tanya ulang tetap kartu cari");
  await kirim("SD Negeri 1 Sukamaju (sekolah), 0,4 km dari lokasi terakhir terlihat"); assert.equal(sesi().status, "cari_konfirm");
  const akhir = await kirim("1");
  assert.equal(akhir.kirimTemu.tempat_tunggu, "SD Negeri 1 Sukamaju (sekolah), 0,4 km dari lokasi terakhir terlihat");
});

test("WA: langkah tempat tetap teks tanpa kartu", async () => {
  const {h} = await keTempat();
  assert.equal(h.sesi.status, "cari_tempat"); assert.equal(h.minta, null); assert.match(h.balasan, /nama jalan, RT\/RW, dan patokan/);
});

test("layar: minta antar dan cari_terkirim punya kartu; kartu tempat memakai sumber pencarian yang ada", () => {
  const t = potong("function terapkan(", "\n}\n");
  assert.match(t, /j\.minta === "antar"\) kartuAntar\(j\)/); assert.match(t, /j\.status === "cari_terkirim"\) kartuCariTerkirim\(j?\)/);
  const a = potong("function kartuAntar(", "\n}\n");
  assert.match(a, /\/api\/lapor\/sekitar\?/); assert.match(a, /cariTempat\(/); assert.match(a, /"lp-cari-hasil"/); assert.match(a, /Ketik alamat sendiri/);
  assert.doesNotMatch(a, /https?:\/\//, "tanpa penyedia peta baru");
  assert.doesNotMatch(a, /\baman\b|·/);
});

test("layar: kartu Nomor penting sesudah kirim di tiga jalur, satu pembuat kartu", () => {
  assert.match(potong("function kartuTiket(", "\n}\n"), /wadah\.append\(kartuPentingLapor\(cache\.lokasiLapor\)\)/, "lapor kejadian dan darurat lewat obrolan");
  assert.match(potong("function kartuCariTerkirim(", "\n}\n"), /kartuPentingLapor\(cache\.lokasiLapor\)/, "orang dicari");
  assert.match(potong("function sekaliKetuk(", "\n}\n"), /kartuPentingLapor\(acuanPenting\(terbaik\)\)/, "darurat sekali ketuk");
  const p = potong("function kartuPentingLapor(", "\n}\n");
  assert.match(p, /kartuPenting\(/); assert.match(p, /\/api\/lapor\/penting\?/);
  assert.equal((js.match(/"Nomor darurat nasional"/g) || []).length, 1, "kartu nasional tidak disalin");
  assert.match(potong("async function kirim(", "\n}\n"), /cache\.lokasiLapor = acuanPenting\(lokasi\)/);
});

test("acuan nomor penting: kode desa apa adanya, titik dibulatkan 3 desimal, selain itu kosong", () => {
  const f = new Function(`${js.match(/const acuanPenting = [^\n]+/)[0]}; return acuanPenting;`)();
  assert.deepEqual(f({kode: "32.01.01.2001", poster: true}), {kode: "32.01.01.2001"});
  assert.deepEqual(f({lat: -6.123456, lon: 106.987654, akurasi: 9, sumber: "gps"}), {lat: -6.123, lon: 106.988});
  assert.equal(f(null), null); assert.equal(f({lat: "x"}), null);
});
