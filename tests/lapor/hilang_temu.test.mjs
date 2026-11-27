/* Orang hilang publik OH-10: jalur B (menemukan orang), mesin murni (temu_*) dan penulisan oh_temu lewat /api/lapor/pesan di Miniflare + D1 sungguhan. Tidak ada yang tayang (Q9).
   RENCANA-UJI bagian 3 (jalur B), 2.19 (sisi tulis). Jalankan: node --test tests/lapor/hilang_temu.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {putaran} from "../../src/lapor_mesin.js";
import {siapkan} from "../warga/_bnpb.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import "../../src/worker.js";

let jam = 1_800_000_000_000;
const W = async () => ({desa: "Sukamaju", kec: "Cibinong", kab: "Kab. Bogor", kabKode: "32.01", provKode: "32", kode: "32.01.01.2001", sekitar: []});
const KJ = [{id: "KJ-2026-00000001", jenis: "banjir", kab4: "3201", mulai: "2026-11-24"}];
async function sampaiKondisi({temuBuka = true, kejadianCari = async () => KJ, saluran} = {}) {
  let sesi = null, pelapor = null, h;
  const kirim = async t => { h = await putaran({sesi, pelapor, pesan: typeof t === "string" ? {teks: t, wa: "6280000000000", saluran} : {...t, wa: "6280000000000", saluran}, wilayah: W, kejadianCari, temuBuka, kini: ++jam}); sesi = h.sesi; pelapor = h.pelapor; return h; };
  for (const t of ["menemukan orang", "1", "1", "Rina Wati"]) await kirim(t);
  assert.match(h.balasan, /Di mana Anda menemukan orang itu/); assert.match(h.balasan, /112/);
  await kirim({lokasi: {lat: -6.61234, lon: 106.81234, akurasi: 12, sumber: "gps"}}); await kirim("1");
  return {kirim, sesi: () => sesi, h: () => h};
}

test("OH-10 tanpa temuBuka (OH_TULIS mati) jalur ditutup fail-closed: batal, tanpa kirimTemuan, arahan 112", async () => {
  let sesi = null, h; const kirim = async t => { h = await putaran({sesi, pelapor: null, pesan: {teks: t, wa: "6280000000000"}, wilayah: W, kejadianCari: async () => KJ, temuBuka: false, kini: ++jam}); sesi = h.sesi; return h; };
  await kirim("menemukan orang"); assert.equal(sesi.status, "batal"); assert.equal(h.kirimTemuan, undefined); assert.match(h.balasan, /belum dibuka/); assert.match(h.balasan, /112/); assert.ok(Number.isFinite(h.hapusRincian.sejak));
});

test("OH-10 alur lengkap orang sadar tanpa foto: kondisi, ucapan, bersama, ciri, izin foto, waktu, kejadian, kirim; sesi dibersihkan; kosong tidak jadi nol", async () => {
  const d = await sampaiKondisi();
  assert.equal(d.sesi().status, "temu_kondisi"); assert.equal(d.h().pilihan.length, 5); assert.match(d.h().balasan, /Lokasi tercatat/);
  assert.equal((await d.kirim("9")).sesi.status, "temu_kondisi", "di luar pilihan ditanya ulang");
  await d.kirim("1"); assert.equal(d.sesi().status, "temu_ucapan"); assert.ok(!/112/.test(d.h().balasan.split("*Apa yang")[0]), "orang sadar: tanpa kotak 112");
  await d.kirim("1"); assert.equal(d.sesi().status, "temu_bersama"); assert.equal(d.sesi().temu.ucapan, null, "tidak bicara = kosong, bukan teks");
  await d.kirim("2"); assert.equal(d.sesi().status, "temu_ciri"); assert.equal((await d.kirim("a")).sesi.status, "temu_ciri", "ciri terlalu pendek ditanya ulang");
  await d.kirim("Laki-laki sekitar 40 tahun, kaus biru, hubungi 0812 3456 7890"); assert.equal(d.sesi().status, "temu_foto_izin"); assert.match(d.h().balasan, /kepada orang itu/);
  await d.kirim("2"); assert.equal(d.sesi().status, "temu_waktu"); assert.equal(d.sesi().temu.fotoBoleh, false);
  await d.kirim("1"); assert.equal(d.sesi().status, "temu_kejadian"); assert.deepEqual(d.h().pilihan, ["Banjir, 24 November 2026", "Tidak ada yang sesuai atau belum tahu"]);
  await d.kirim("1"); assert.equal(d.sesi().status, "temu_konfirm"); assert.match(d.h().balasan, /tidak tampil di halaman publik/);
  await d.kirim("1"); const t = d.h().kirimTemuan; assert.equal(d.sesi().status, "temu_terkirim");
  assert.deepEqual([t.kab, t.kondisi, t.bersama, t.ucapan, t.foto_boleh, t.kejadian_id, t.lokasi_teks], ["32.01", "sadar", "pelapor", null, false, KJ[0].id, "Desa/Kel. Sukamaju, Kec. Cibinong"]);
  assert.deepEqual([t.lat, t.lon], [-6.612, 106.812], "dibulatkan 3 desimal"); assert.deepEqual(t.foto_ids, []); assert.ok(t.waktu_temu > 0 && !t.ciri.includes("3456 7890"), "nomor dalam ciri disamarkan");
  assert.deepEqual(d.sesi().temu, {}, "rincian tidak tertinggal di sesi"); assert.match(d.h().balasan, /tidak akan tampil di halaman publik/);
  const semua = JSON.stringify(d.sesi().transkrip.map(x => x.teks)); assert.ok(!/\b(aman|pasti)\b/i.test(semua) && !semua.includes("·"), "kata terlarang");
});

test("OH-10 tidak sadar atau terluka: 112 lebih dulu sebelum isian; orang tidak sadar tidak pernah ditawari foto", async () => {
  for (const [pil, sadar] of [["2", false], ["3", true]]) {
    const d = await sampaiKondisi(); await d.kirim(pil);
    assert.equal(d.sesi().status, "temu_ucapan"); assert.ok(d.h().balasan.startsWith("*Hubungi 112 sekarang*"), "112 mendahului pertanyaan: " + d.h().balasan.slice(0, 60));
    await d.kirim("1"); await d.kirim("1"); await d.kirim("Laki-laki tua, baju batik"); assert.equal(d.sesi().status, sadar ? "temu_foto_izin" : "temu_waktu", "tidak sadar langsung ke waktu");
  }
  const anak = await sampaiKondisi(); await anak.kirim("4"); await anak.kirim("1"); await anak.kirim("1"); await anak.kirim("Anak laki-laki sekitar 6 tahun"); assert.match(anak.h().balasan, /ke walinya/);
});

test("OH-10 foto hanya sesudah izin; paling 10; tanpa izin tombol foto tidak muncul; foto_ids hanya bila foto_boleh", async () => {
  const d = await sampaiKondisi(); for (const t of ["1", "1", "1", "Perempuan sekitar 30 tahun"]) await d.kirim(t);
  await d.kirim("1"); assert.equal(d.sesi().status, "temu_foto"); assert.equal(d.h().minta, "foto_cari");
  for (let i = 1; i <= 2; i++) await d.kirim({foto: {id: String(i).repeat(16), lencana: "tanpa"}});
  assert.equal(d.sesi().temu.fotoIds.length, 2); assert.deepEqual(d.h().pilihan, ["Lanjut"]);
  await d.kirim("1"); assert.equal(d.sesi().status, "temu_waktu"); for (const t of ["2", "1", "1"]) await d.kirim(t);
  assert.deepEqual(d.h().kirimTemuan.foto_ids, ["1".repeat(16), "2".repeat(16)]); assert.equal(d.h().kirimTemuan.foto_boleh, true); assert.equal(d.h().kirimTemuan.waktu_temu < jam, true);
  const tanpa = await sampaiKondisi(); for (const t of ["1", "1", "1", "Perempuan sekitar 30 tahun", "2"]) await tanpa.kirim(t);
  assert.equal(tanpa.sesi().status, "temu_waktu"); const f = await tanpa.kirim({foto: {id: "9".repeat(16)}}); assert.equal(f.sesi.status, "temu_waktu", "foto tanpa izin tidak diterima"); assert.equal(tanpa.sesi().temu.fotoIds, undefined);
});

test("OH-10 tanpa kejadian di daftar laporan tetap masuk (non-tayang); Batal membersihkan rincian dan menyamarkan arsip", async () => {
  const d = await sampaiKondisi({kejadianCari: async () => []}); for (const t of ["1", "1", "1", "Laki-laki muda, jaket hitam", "2", "2"]) await d.kirim(t);
  assert.equal(d.sesi().status, "temu_konfirm", "tanpa daftar kejadian langsung ringkasan"); await d.kirim("1"); assert.equal(d.h().kirimTemuan.kejadian_id, null);
  const b = await sampaiKondisi(); for (const t of ["1", "1", "1", "Laki-laki muda, jaket hitam", "2", "1", "1"]) await b.kirim(t);
  await b.kirim("2"); assert.equal(b.sesi().status, "batal"); assert.equal(b.h().kirimTemuan, undefined); assert.deepEqual(b.sesi().temu, {}); assert.ok(Number.isFinite(b.h().hapusRincian.sejak)); assert.deepEqual(b.sesi().transkrip, []);
});

test("OH-10 lewat /api/lapor/pesan: oh_temu menunggu, riwayat, foto terkait, nomor penemu hanya di D1; OH_TULIS mati tidak menulis", async () => {
  const WA = "6281200000301", MESIN = {authorization: "Bearer mesin-rahasia"};
  const jalan = async (U, foto = false) => {
    const kirimP = b => U.api("POST", "/api/lapor/pesan", {wa: WA, ...b}, MESIN);
    assert.equal((await U.api("POST", "/api/lapor/izin", {wa: WA}, MESIN)).s, 200);
    let r; for (const t of ["menemukan orang", "1", "1", "Rina Wati"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 200)); if (/belum dibuka/.test(r.t)) return r; }
    r = await kirimP({lokasi: {lat: -6.6, lon: 106.8, akurasi: 12}}); assert.equal(r.s, 200, r.t.slice(0, 200)); if (/Benar/.test(r.t)) r = await kirimP({teks: "1"});
    assert.match(r.t, /Bagaimana keadaan orang itu/);
    await U.DB.prepare("DELETE FROM laju_bnpb").run();
    const langkah = ["1", "Tidak bicara", "2", "Laki-laki sekitar 40 tahun, kaus biru", foto ? "1" : "2"];
    for (const t of langkah) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 200)); }
    if (foto) { const f = await U.api("POST", "/api/lapor/foto", {wa: WA, data: Buffer.from(JPEG_SAH).toString("base64")}, MESIN); assert.equal(f.s, 200, f.t.slice(0, 200)); r = await kirimP({teks: "Lanjut"}); }
    r = await kirimP({teks: "1"}); assert.equal(r.s, 200, r.t.slice(0, 200));   // waktu; tanpa kejadian di D1 langsung ringkasan
    assert.match(r.t, /Ringkasan laporan menemukan orang/); r = await kirimP({teks: "1"}); assert.equal(r.s, 200, r.t.slice(0, 300)); return r;
  };
  const A = await siapkan("uji-oh-temu-mati", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), tutup = await jalan(A);
  assert.match(tutup.t, /belum dibuka/); assert.equal(await A.n("oh_temu"), 0);
  const B = await siapkan("uji-oh-temu-hidup", {r2: true, ikat: {WA_MESIN: "mesin-rahasia", OH_TULIS: "1"}}), r = await jalan(B, true);
  assert.match(r.t, /Laporan diterima/); assert.equal(await B.n("oh_temu", "status = 'menunggu'"), 1);
  const t = await B.DB.prepare("SELECT * FROM oh_temu").first();
  assert.match(t.kab, /^\d{2}\.\d{2}$/); assert.deepEqual([t.kondisi, t.bersama, t.ucapan, t.foto_boleh, t.nomor_penemu, t.kejadian_id], ["sadar", "pelapor", null, 1, WA, null]);
  assert.ok(t.lat === Math.round(t.lat * 1000) / 1000 && t.lon === Math.round(t.lon * 1000) / 1000, "koordinat 3 desimal");
  assert.equal(await B.n("oh_temu_foto", `temu_id = '${t.id}'`), 1); assert.equal(await B.n("oh_riwayat", `temu_id = '${t.id}' AND ke = 'menunggu' AND oleh = 'penemu'`), 1);
  assert.equal(await B.n("oh_publik"), 0, "tidak pernah tayang"); assert.ok(!r.t.includes(WA), "nomor tidak diulang ke pelapor");
  const g = await B.api("GET", "/api/lapor/hilang", undefined, {"cf-connecting-ip": "198.51.100.200"}); assert.equal(g.s, 404, "bendera publik mati");
});
