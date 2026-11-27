// Orang hilang publik OH-04: penyaring bencana (cari_kejadian) dan persetujuan tayang (cari_setuju) di mesin murni; kejadianCari disuntik, tanpa jaringan.
// RENCANA-UJI bagian 3 + barisOh (RENCANA-UJI 1, jepit ke CHECK 0188). Jalankan: node --test tests/lapor/hilang_mesin.test.mjs
import {test} from "node:test";
import assert from "node:assert/strict";
import {putaran} from "../../src/lapor_mesin.js";
import {barisOh, SETUJU_VERSI} from "../../src/orang_hilang_murni.js";

let jam = 1_800_000_000_000;
const W = async () => ({desa: "Sukamaju", kec: "Cibinong", kab: "Kab. Bogor", kabKode: "32.01", provKode: "32", kode: "32.01.01.2001", sekitar: []});
const KJ = [{id: "KJ-2026-00000001", jenis: "banjir", kab4: "3201", mulai: "2026-11-24"}, {id: "KJ-2026-00000002", jenis: "tsunami", kab4: "3201", mulai: "2026-11-02"}];
/* sampai langkah tempat; kejadianCari = null berarti jalur lama */
async function sampaiTempat(kejadianCari, saluran = undefined) {
  let sesi = null, pelapor = null, h;
  const kirim = async teks => { h = await putaran({sesi, pelapor, pesan: typeof teks === "string" ? {teks, wa: "6280000000000", saluran} : {...teks, wa: "6280000000000", saluran}, wilayah: W, kejadianCari, kini: ++jam}); sesi = h.sesi; pelapor = h.pelapor; return h; };
  for (const t of ["orang hilang", "1", "1", "Budi Santoso"]) await kirim(t);
  await kirim({lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}); await kirim("1");
  await kirim("Siti Aminah"); await kirim("Ami"); await kirim("1"); await kirim("2"); await kirim("30"); await kirim("1"); await kirim("1");   // hubungan, kelamin, umur 30, tinggi dan berat tidak tahu
  await kirim("kaos merah"); await kirim("tahi lalat di pipi"); await kirim("Lewati"); await kirim("1"); await kirim("1"); await kirim("1");   // foto, waktu hari ini, nomor tidak tahu, kontak nomor saya
  assert.equal(sesi.status, "cari_tempat");
  return {kirim, sesi: () => sesi, h: () => h};
}
const TEMPAT = "Posko Masjid Al Ikhlas, Jl. Raya Cibinong No 12";

test("OH-04 tempat lalu cari_kejadian lalu cari_setuju lalu ringkasan; daftar kejadian dari pembaca, dua pilihan penutup selalu ada", async () => {
  let dipanggil = null;
  const d = await sampaiTempat(async a => { dipanggil = a; return KJ; });
  await d.kirim(TEMPAT); assert.equal(d.sesi().status, "cari_kejadian");
  assert.deepEqual(dipanggil.kab, "32.01"); assert.ok(dipanggil.kini > 0);
  assert.deepEqual(d.h().pilihan, ["Banjir, 24 November 2026", "Tsunami, 2 November 2026", "Bencana lain yang belum terdaftar", "Bukan karena bencana"]);
  assert.match(d.h().balasan, /Kab\. Bogor/); assert.match(d.h().balasan, /hanya untuk orang yang hilang karena bencana/);
  assert.equal((await d.kirim("9")).sesi.status, "cari_kejadian", "di luar pilihan ditanya ulang");
  await d.kirim("1"); assert.equal(d.sesi().status, "cari_setuju"); assert.deepEqual(d.sesi().cari.kej, KJ[0]); assert.equal(d.sesi().cari.kejDaftar, undefined);
  assert.deepEqual(d.h().pilihan, ["Saya setuju", "Saya tidak setuju"]);
  for (const t of ["menyetujui bahwa nama", "kerabat atau wali", "penyedia model kecerdasan buatan di luar negeri", "tidak menggantikan laporan ke kepolisian", "mencabut persetujuan kapan saja", "Petugas BNPB atau BPBD memeriksa dulu"]) assert.ok(d.h().balasan.includes(t), t);
  assert.equal((await d.kirim("mungkin")).sesi.status, "cari_setuju", "bukan jawaban ditanya ulang");
  await d.kirim("1"); assert.equal(d.sesi().status, "cari_konfirm"); assert.deepEqual(d.sesi().cari.setuju, {versi: SETUJU_VERSI, waktu: jam});
  await d.kirim("1"); const kc = d.h().kirimCari; assert.equal(d.sesi().status, "cari_terkirim");
  assert.deepEqual(kc.kejadian, KJ[0]); assert.deepEqual(kc.setuju, {versi: 1, waktu: kc.setuju.waktu}); assert.deepEqual([kc.panggilan, kc.kec, kc.kab_nama], ["Ami", "Cibinong", "Kab. Bogor"]);
  assert.equal(kc.cr.umur, 30); assert.equal(kc.cr.kelamin, "Perempuan"); assert.equal(kc.cr.tinggi, null, "kosong tidak jadi 0"); assert.equal(kc.cr.pakaian, "kaos merah"); assert.ok(Number.isFinite(kc.waktu_ms));
  const b = barisOh(kc, "1".repeat(16), "a".repeat(32)); assert.equal(b.kelas, "dewasa"); assert.equal(b.status, "menunggu"); assert.equal(b.kejadian_id, KJ[0].id); assert.equal(b.kab, "32.01"); assert.equal(b.tinggi, null);
  assert.deepEqual(d.sesi().cari, {nama: "Siti Aminah"}, "rincian tidak tertinggal di sesi");
});

test("OH-04 belum terdaftar: kejadian_id kosong, petugas yang menautkan; tanpa kejadian hanya dua pilihan; galat pembaca tidak memutus laporan", async () => {
  for (const baca of [async () => [], async () => { throw new Error("D1 mati"); }]) {
    const d = await sampaiTempat(baca); await d.kirim(TEMPAT);
    assert.deepEqual(d.h().pilihan, ["Bencana lain yang belum terdaftar", "Bukan karena bencana"]);
    await d.kirim("1"); assert.deepEqual(d.sesi().cari.kej, {id: null}); await d.kirim("saya setuju"); await d.kirim("kirim");
    const b = barisOh(d.h().kirimCari, "2".repeat(16), "b".repeat(32)); assert.deepEqual([b.kejadian_id, b.kejadian_jenis, b.kejadian_kab, b.kejadian_mulai], [null, null, null, null]); assert.equal(b.setuju_versi, 1);
  }
});

test("OH-04 bukan karena bencana dan tidak setuju menutup jalur: tanpa kirimCari, rincian dibuang, arahan polisi dan 112", async () => {
  for (const [langkah, teks] of [[["4"], /Layanan ini hanya untuk orang yang hilang karena bencana/], [["1", "2"], /Tanpa persetujuan/], [["1", "tidak setuju"], /Tanpa persetujuan/]]) {
    const d = await sampaiTempat(async () => KJ); await d.kirim(TEMPAT); for (const l of langkah) await d.kirim(l);
    assert.equal(d.sesi().status, "batal"); assert.equal(d.h().kirimCari, undefined); assert.deepEqual(d.sesi().cari, {}); assert.match(d.h().balasan, teks); assert.match(d.h().balasan, /112/); assert.match(d.h().balasan, /kepolisian/);
  }
});

test("OH-04 sesi lama sebelum penyaring (sudah di konfirmasi tanpa persetujuan) diarahkan ke langkah yang kurang; tanpa kejadianCari jalur lama tidak berubah", async () => {
  const d = await sampaiTempat(async () => KJ); await d.kirim(TEMPAT); await d.kirim("1"); await d.kirim("1");
  d.sesi().status = "cari_konfirm"; delete d.sesi().cari.setuju; await d.kirim("1"); assert.equal(d.sesi().status, "cari_setuju", "persetujuan dulu");
  d.sesi().status = "cari_konfirm"; delete d.sesi().cari.setuju; delete d.sesi().cari.kej; await d.kirim("1"); assert.equal(d.sesi().status, "cari_kejadian", "kejadian dulu");
  const lama = await sampaiTempat(null); await lama.kirim(TEMPAT); assert.equal(lama.sesi().status, "cari_konfirm"); await lama.kirim("1");
  assert.equal(lama.h().kirimCari.setuju, null); assert.equal(lama.h().kirimCari.kejadian, null);
});

test("OH-04 teks: tanpa 'aman' dan 'pasti', tanpa titik tengah, tombol setuju dan tidak setuju sama bobot (dua pilihan tunggal)", async () => {
  const d = await sampaiTempat(async () => KJ); await d.kirim(TEMPAT); const kej = d.h().balasan + (d.h().pilihan || []).join(" "); await d.kirim("1");
  const semua = kej + d.h().balasan + d.h().pilihan.join(" ") + (d.h().pilihanKet || []).join(" ");
  assert.ok(!/\b(aman|pasti)\b/i.test(semua), "larangan kata"); assert.ok(!semua.includes("·"), "tanpa titik tengah");
  assert.equal(d.h().pilihan.length, 2); assert.ok(Math.abs(d.h().pilihan[0].length - d.h().pilihan[1].length) <= 8);
  assert.equal(d.h().form, null, "kartu pilihan, bukan kotak isian");
});

test("barisOh menjepit tiap nilai ke batas CHECK 0188: isian aneh tidak menggagalkan batch; di luar batas jadi null, bukan 0", () => {
  const b = barisOh({nama_dicari: "x".repeat(200), panggilan: "y".repeat(90), cr: {umur: 150, kelamin: "Tidak tahu", tinggi: 10, pakaian: "z".repeat(500)}, kec: "k".repeat(300), kab: "320", kab_nama: "n".repeat(300), waktu_ms: NaN,
    kejadian: {id: "pendek", jenis: "banjir", kab4: "3201", mulai: "2026-11-24"}, setuju: {versi: 0, waktu: "x"}}, "3".repeat(16), "c".repeat(32));
  assert.equal(b.nama.length, 80); assert.equal(b.panggilan.length, 40); assert.equal(b.pakaian.length, 200); assert.equal(b.kec.length, 80); assert.equal(b.kab_nama.length, 80);
  assert.deepEqual([b.umur, b.kelamin, b.tinggi, b.kab, b.waktu_terakhir, b.kejadian_id, b.kejadian_jenis, b.setuju_versi, b.setuju_waktu], [null, null, null, null, null, null, null, null, null]);
  assert.equal(b.kelas, "anak", "umur tak diketahui = anak sampai petugas memutuskan");
  assert.equal(barisOh({nama_dicari: "A", cr: {umur: 0}}, "3".repeat(16), "c".repeat(32)).umur, 0, "0 tahun sah, bukan kosong");
});
