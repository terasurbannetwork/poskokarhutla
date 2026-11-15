/* Satu Pintu Masuk, PM-04 bagian Worker (RENCANA-UJI U-10, U-11): gerbang WA menarik dan melapor baris otp, pembersih, denyut, saluran.
   worker.js utuh di atas D1 lokal sungguhan. Nomor uji hanya berawalan 62800. */
import assert from "node:assert/strict";
import {siapkan, berantai} from "./_bnpb.mjs";
import "../../src/worker.js";
import {bersihkanLapangan} from "../../src/lapangan_panel.js";

const uji = berantai(), MENIT = 60e3, HARI = 24 * 3600e3;
const U = await siapkan("uji-masuk-wa", {ikat: {WA_KUNCI: "kunci-wa-uji", EMAIL_API_KEY: "kunci-email", EMAIL_FROM: "Centurisk <noreply@contoh.test>"}});
const BELUM = await siapkan("uji-masuk-wa-belum", {sampai: "0133_"});
const KUNCI = {"x-wa-kunci": "kunci-wa-uji"}, DB = U.DB;
const hex16 = n => n.toString(16).padStart(16, "0");
const antreBaris = (id, jenis, dibuat, tujuan = "628005550001") => DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat) VALUES (?, ?, 'isi pesan', ?, ?, 'antre', 0, ?)").bind(id, tujuan, jenis, id, dibuat).run();
const tarik = () => U.api("GET", "/api/petugas/wa/antre", undefined, KUNCI);
const lapor = (id, ok) => U.api("POST", "/api/petugas/wa/hasil", {hasil: [{id, ok}]}, KUNCI);
const OTP = hex16(1), OTP_BASI = hex16(2), LAIN = hex16(3);

uji("masuk U-10: otp ditarik lebih dulu, otp basi tidak pernah, ditarik ulang tiap 20 detik tanpa batas percobaan, jenis lain tetap aturan lama", async () => {
  const kini = Date.now();
  await antreBaris(LAIN, "penugasan", kini - 1000); await antreBaris(OTP, "otp", kini - 2000); await antreBaris(OTP_BASI, "otp", kini - 6 * MENIT);
  const a = await tarik(); assert.equal(a.s, 200);
  assert.deepEqual(a.j.pesan.map(x => x.id), [OTP, LAIN], "otp lebih dulu; otp 6 menit tidak ditarik");
  assert.deepEqual((await tarik()).j.pesan, [], "belum 20 detik dan belum 10 menit");
  await DB.prepare("UPDATE wa_antre SET dikirim = dikirim - 25000 WHERE id IN (?, ?)").bind(OTP, LAIN).run();
  assert.deepEqual((await tarik()).j.pesan.map(x => x.id), [OTP], "otp ulang sesudah 20 detik; jenis lain menunggu 10 menit");
  for (let i = 0; i < 5; i++) {   // lebih dari MAKS_PERCOBAAN jenis lain: otp tidak pernah menjadi gagal
    assert.equal((await lapor(OTP, false)).s, 200);
    await DB.prepare("UPDATE wa_antre SET dikirim = dikirim - 25000 WHERE id = ?").bind(OTP).run();
    assert.deepEqual((await tarik()).j.pesan.map(x => x.id), [OTP], "tarik ulang " + i);
  }
  assert.equal((await DB.prepare("SELECT status FROM wa_antre WHERE id = ?").bind(OTP).first()).status, "antre");
  assert.equal((await lapor(OTP, true)).j.n, 1);
  assert.equal(await U.n("wa_antre", "id = '" + OTP + "'"), 0, "terkirim = baris dihapus, bukan ditandai");
  assert.equal((await lapor(LAIN, true)).j.n, 1);
  assert.equal((await DB.prepare("SELECT status FROM wa_antre WHERE id = ?").bind(LAIN).first()).status, "dikirim", "jenis lain tetap ditandai dikirim");
  assert.equal(await U.n("wa_antre", "id = '" + OTP_BASI + "'"), 1);
});

uji("masuk U-10a: antrean penuh jenis lain tidak menggeser otp (otp dipilih lebih dulu di dalam batas tarik)", async () => {
  const kini = Date.now(), B = hex16(900);
  await DB.batch(Array.from({length: 25}, (_, i) => DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat) VALUES (?, '628005550002', 'x', 'penugasan', NULL, 'antre', 0, ?)").bind(hex16(100 + i), kini - 100000 - i)));
  await antreBaris(B, "otp", kini);
  const a = await tarik(); assert.equal(a.j.pesan.length, 20); assert.equal(a.j.pesan[0].id, B, "otp terbaru tetap ikut walau 25 baris lain lebih tua");
  await DB.prepare("DELETE FROM wa_antre WHERE id != ?").bind(OTP_BASI).run();
});

uji("masuk U-10b: pembersih menghapus otp lama, kode lama, sesi habis, undangan lewat masa; tabel mk_* belum ada tidak menggagalkan", async () => {
  const kini = Date.now(), akun = hex16(10), hari = n => kini - n * HARI;
  await DB.prepare("INSERT INTO mk_akun (id, wa, status, dibuat) VALUES (?, '628005550010', 'aktif', 1)").bind(akun).run();
  const kode = (id, dibuat) => DB.prepare("INSERT INTO mk_kode (id, nomor_sha, kode_sha, saluran, coba, dibuat, habis) VALUES (?, ?, ?, 'wa', 0, ?, ?)").bind(id, "a".repeat(64), "b".repeat(64), dibuat, dibuat + 5 * MENIT);
  const sesi = (t, habis) => DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, 1, 1, ?)").bind(t.repeat(64), akun, habis);
  const undang = (id, status, habis) => DB.prepare("INSERT INTO mk_undang (id, wa, tabel, akun_id, oleh_tabel, oleh_id, status, dibuat, habis) VALUES (?, '628005550011', 'instansi_akun', ?, 'mk_akun', ?, ?, 1, ?)").bind(id, hex16(99), akun, status, habis);
  const log = (id, waktu) => DB.prepare("INSERT INTO mk_masuk_log (id, mk_id, tabel, akun_id, waktu) VALUES (?, ?, 'instansi_akun', ?, ?)").bind(id, akun, hex16(99), waktu);
  await DB.batch([kode(hex16(20), hari(2)), kode(hex16(21), kini - MENIT), sesi("c", kini - 1000), sesi("d", kini + HARI),
    undang(hex16(30), "terkirim", kini - HARI), undang(hex16(31), "terkirim", kini + HARI), undang(hex16(32), "diterima", hari(100)),
    log(hex16(40), hari(401)), log(hex16(41), hari(399)), DB.prepare("UPDATE wa_antre SET dibuat = ? WHERE id = ?").bind(kini - 6 * MENIT, OTP_BASI)]);
  await bersihkanLapangan({DB}, kini);
  assert.equal(await U.n("wa_antre", "jenis = 'otp'"), 0, "otp lebih dari 5 menit hilang");
  assert.deepEqual((await DB.prepare("SELECT id FROM mk_kode ORDER BY id").all()).results.map(r => r.id).filter(i => [hex16(20), hex16(21)].includes(i)), [hex16(21)]);
  assert.equal(await U.n("mk_sesi", "token_sha = '" + "c".repeat(64) + "'"), 0); assert.equal(await U.n("mk_sesi", "token_sha = '" + "d".repeat(64) + "'"), 1);
  assert.equal((await DB.prepare("SELECT status FROM mk_undang WHERE id = ?").bind(hex16(30)).first()).status, "dicabut", "lewat masa berlaku dicabut, belum dihapus");
  assert.equal((await DB.prepare("SELECT status FROM mk_undang WHERE id = ?").bind(hex16(31)).first()).status, "terkirim");
  assert.equal(await U.n("mk_undang", "id = '" + hex16(32) + "'"), 0, "90 hari sesudah masa berlaku dihapus");
  assert.equal(await U.n("mk_masuk_log", "id = '" + hex16(40) + "'"), 0); assert.equal(await U.n("mk_masuk_log", "id = '" + hex16(41) + "'"), 1);
  /* migrasi masuk belum jalan: pembersihan lain tetap selesai */
  await BELUM.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat) VALUES (?, '628005550001', 'x', 'otp', ?, 'antre', 0, ?)").bind(hex16(50), hex16(50), kini - 6 * MENIT).run();
  await bersihkanLapangan({DB: BELUM.DB}, kini);
  assert.equal(await BELUM.n("wa_antre"), 0);
});

uji("masuk U-11: denyut ditulis paling sering sekali per 60 detik; saluran melaporkan WA terganggu bila denyut basi atau belum ada", async () => {
  const baca = async () => (await DB.prepare("SELECT waktu FROM mk_denyut WHERE nama = 'wa'").first())?.waktu;
  await DB.prepare("DELETE FROM mk_denyut").run();   // tarikan uji sebelumnya sudah berdenyut
  const s0 = await U.api("GET", "/api/masuk/saluran"); assert.equal(s0.s, 200); assert.deepEqual(s0.j, {wa: false, email: true}, "belum pernah berdenyut");
  assert.ok(!/cookie|wa_|628/.test(s0.t), "tanpa data pribadi");
  await tarik(); const t1 = await baca(); assert.ok(t1);
  await tarik(); await tarik(); assert.equal(await baca(), t1, "dua tarikan dalam 60 detik: tidak menulis");
  assert.equal((await U.api("GET", "/api/masuk/saluran")).j.wa, true);
  await DB.prepare("UPDATE mk_denyut SET waktu = ? WHERE nama = 'wa'").bind(t1 - 70e3).run();
  await tarik(); assert.ok((await baca()) >= t1, "denyut lama lebih dari 60 detik diperbarui");
  await DB.prepare("UPDATE mk_denyut SET waktu = ? WHERE nama = 'wa'").bind(Date.now() - 6 * MENIT).run();
  assert.equal((await U.api("GET", "/api/masuk/saluran")).j.wa, false, "denyut lebih dari 5 menit");
  /* tabel belum ada: tarikan tetap jalan, saluran menjawab 200 dengan wa false */
  const w = await BELUM.api("GET", "/api/petugas/wa/antre", undefined, KUNCI); assert.notEqual(w.s, 500);
  assert.equal((await BELUM.api("GET", "/api/masuk/saluran")).j.wa, false);
});
