/* LJ-10: pertanyaan harian ke ketua berkas data lanjutan (D12, Q3). worker.js utuh di workerd, D1 sungguhan, tanpa mock.
   Nomor WA rekaan, bukan nomor pemilik. Jalan: node --test tests/lapor/lanjut_harian.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "../warga/_bnpb.mjs";
import worker from "../../src/worker.js";
import {tanyaHarian, saatTanya} from "../../src/lapor_lanjut.js";
import {tglWib} from "../../src/lapor_tampil.js";
import {perintahJawab} from "../../src/lapor_lanjut_mesin.js";

const uji = berantai();
const U = await siapkan("uji-lapor-harian", {ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const env = {DB}, kini0 = Date.now(), MESIN = {authorization: "Bearer mesin-rahasia"};
const K1 = "6281299881001", K2 = "6281299881002", K3 = "6281299881003", AGT = "6281299881004", LUAR = "6281299881005";
const WIB16 = Date.UTC(2026, 10, 24, 9, 0, 0);   // 24 Nov 2026 16.00 WIB
const TGL_INI = tglWib(Date.now()), WIB16_INI = Date.parse(TGL_INI + "T09:00:00Z");   // jawaban WA memakai jam dinding: pertanyaan untuk tanggal WIB hari ini
const id = c => c.repeat(16);
const wa = (nomor, teks) => api("POST", "/api/lapor/pesan", {wa: nomor, teks}, MESIN);
async function berkas(c, induk, kab, ketua, {status = "terbuka", izin = true, nama = "Kota Bogor"} = {}) {
  await DB.prepare("INSERT INTO lj_berkas (id, induk, kab, status, isian, ditutup, dibuat, diubah) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id(c), induk, kab, status, JSON.stringify({kab_nama: nama}), status === "selesai" ? kini0 : null, kini0, kini0).run();
  await DB.prepare("INSERT INTO lj_tim (berkas, wa, nama, peran, oleh, dibuat) VALUES (?, ?, 'Nama Rahasia', 'ketua', 'uji', ?)").bind(id(c), ketua, kini0).run();
  if (izin) await DB.prepare("INSERT OR IGNORE INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', ?, 'uji', ?)").bind(ketua, nama, kini0).run();
}
const objek = (b, jenis, urut, pribadi = null) => DB.prepare("INSERT INTO lj_objek (id, berkas, jenis, urut, data, pribadi, oleh, dibuat, diubah) VALUES (?, ?, ?, ?, '{}', ?, 'uji', ?, ?)").bind(id(b) .slice(0, 12) + String(urut).padStart(2, "0") + jenis.slice(0, 2), id(b), jenis, urut, pribadi, kini0, kini0).run();
const kabar = x => DB.prepare("SELECT * FROM lj_kabar WHERE wa = ? AND jenis = 'harian' ORDER BY id").bind(x).all().then(r => r.results);
const tanya = b => DB.prepare("SELECT * FROM lj_tanya WHERE berkas = ? ORDER BY tgl").bind(id(b)).all().then(r => r.results);

uji("saatTanya: hanya 16.00 dan 16.30 WIB; perintahJawab: bentuk benar, bukan perintah -> null", () => {
  assert.equal(saatTanya(WIB16), true); assert.equal(saatTanya(WIB16 + 30 * 60e3), true);
  for (const d of [1, 5, 29, 31, 59]) assert.equal(saatTanya(WIB16 + d * 60e3), false);
  assert.equal(saatTanya(WIB16 - 3600e3), false); assert.equal(saatTanya(WIB16 + 3600e3), false);
  assert.equal(saatTanya(Date.UTC(2026, 10, 23, 16, 0)), false, "16.00 UTC = 23.00 WIB");
  assert.deepEqual(perintahJawab("Masih"), {jawab: "masih", nomor: null}); assert.deepEqual(perintahJawab("selesai 2"), {jawab: "selesai", nomor: 2});
  assert.deepEqual(perintahJawab(" MASIH 12. "), {jawab: "masih", nomor: 12});
  assert.equal(perintahJawab("masih banyak korban"), null); assert.equal(perintahJawab("data rumah"), null); assert.equal(perintahJawab("selesai 1 2"), null);
});

uji("persiapan data: dua berkas terbuka satu ketua, satu ditutup, satu tanpa izin, satu ketua dicabut", async () => {
  await berkas("a", "LA-231124-01", "32.71", K1, {nama: "Kota Bogor"});
  await berkas("b", "LA-231124-02", "32.73", K1, {nama: "Kota Bandung"});
  await berkas("c", "LA-231124-03", "32.01", K2, {status: "selesai", nama: "Kab Bogor"});
  await berkas("d", "LA-231124-04", "32.02", LUAR, {izin: false, nama: "Kab Sukabumi"});
  await berkas("e", "LA-231124-05", "32.03", K3, {nama: "Kab Cianjur"});
  await DB.prepare("UPDATE lj_tim SET dicabut = ? WHERE berkas = ?").bind(kini0, id("e")).run();
  await DB.prepare("INSERT INTO lj_tim (berkas, wa, nama, peran, oleh, dibuat) VALUES (?, ?, 'Anggota Rahasia', 'anggota', 'uji', ?)").bind(id("a"), AGT, kini0).run();
  await objek("a", "rumah", 1); await objek("a", "rumah", 2); await objek("a", "korban", 1, JSON.stringify({nama: "Siti Rahasia", hp: "081200000000"}));
});

uji("di luar menit jam kirim tidak menulis apa pun", async () => {
  for (const t of [WIB16 - 60e3, WIB16 + 60e3, WIB16 + 3600e3]) assert.deepEqual(await tanyaHarian(env, t), {lewat: true});
  assert.equal(await n("lj_tanya"), 0); assert.equal(await n("lj_kabar", "jenis = 'harian'"), 0);
});

uji("16.00 WIB: satu pesan bernomor per ketua, satu baris lj_tanya per berkas; hanya terbuka, berketua aktif, bernomor izin", async () => {
  const h = await tanyaHarian(env, WIB16); assert.deepEqual(h, {berkas: 2, ketua: 1});
  assert.equal(await n("lj_tanya"), 2); assert.equal((await tanya("a"))[0].tgl, "2026-11-24"); assert.equal((await tanya("a"))[0].jawab, null);
  assert.equal((await tanya("c")).length + (await tanya("d")).length + (await tanya("e")).length, 0, "ditutup, tanpa izin, ketua dicabut: tidak ditanya");
  const k = await kabar(K1); assert.equal(k.length, 1); assert.equal(k[0].terkirim, null);
  assert.match(k[0].teks, /Ada 2 berkas/); assert.match(k[0].teks, /1\. Kota Bogor \(LA-231124-01\): Tercatat: rumah 2, korban 1\. Belum didata: prasarana, tempat pengungsian, pengungsi, usaha, kebutuhan\./);
  assert.match(k[0].teks, /2\. Kota Bandung \(LA-231124-02\): Belum ada data tercatat\./); assert.match(k[0].teks, /Balas \*masih 1\* atau \*selesai 2\*/);
  assert.equal((await kabar(K2)).length + (await kabar(LUAR)).length + (await kabar(K3)).length + (await kabar(AGT)).length, 0);
});

uji("pesan tanpa nama, HP, NIK; tanpa titik tengah, huruf kapital penuh, kata aman; panjang <= 2000; kosong tidak pernah ditulis 0", async () => {
  const t = (await kabar(K1))[0].teks;
  assert.ok(!/Siti|Rahasia|081200000000|6281|nik/i.test(t), t); assert.ok(!/·/.test(t) && !/aman/i.test(t) && !/\b[A-Z]{4,}\b/.test(t.replace(/LA-\d+-\d+/g, "")), t);
  assert.ok(t.length <= 2000); assert.ok(!/\b0\b/.test(t), "kosong bukan nol");
});

uji("idempoten: panggilan kedua dan ulang menit 30 tidak menambah baris; berkas baru sesudahnya tetap ditanya sekali", async () => {
  assert.deepEqual(await tanyaHarian(env, WIB16), {berkas: 0, ketua: 0}); assert.deepEqual(await tanyaHarian(env, WIB16 + 30 * 60e3), {berkas: 0, ketua: 0});
  assert.equal(await n("lj_tanya"), 2); assert.equal((await kabar(K1)).length, 1);
  await berkas("f", "LA-231124-06", "32.04", K3, {nama: "Kab Garut"});   // dibuka antara 16.00 dan 16.30
  assert.deepEqual(await tanyaHarian(env, WIB16 + 30 * 60e3), {berkas: 1, ketua: 1}); assert.equal(await n("lj_tanya"), 3);
  assert.match((await kabar(K3))[0].teks, /^Pertanyaan harian data lanjutan Kab Garut \(LA-231124-06\)\.\nBelum ada data tercatat\./);
  assert.deepEqual(await tanyaHarian(env, WIB16 + 30 * 60e3), {berkas: 0, ketua: 0}); assert.equal((await kabar(K3)).length, 1);
});

uji("balapan dua putaran serentak: tetap satu baris lj_tanya per berkas dan satu pesan per ketua", async () => {
  await berkas("g", "LA-231124-07", "32.05", LUAR, {nama: "Kab Bekasi"});   // LUAR tadi tanpa izin: izin diberikan baru kini
  await DB.prepare("INSERT OR IGNORE INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', 'x', 'uji', ?)").bind(LUAR, kini0).run();
  await berkas("h", "LA-231124-08", "32.06", LUAR, {nama: "Kab Bekasi"});
  await Promise.all([tanyaHarian(env, WIB16 + 30 * 60e3), tanyaHarian(env, WIB16 + 30 * 60e3)]);
  assert.equal((await tanya("g")).length + (await tanya("h")).length, 2); assert.equal((await kabar(LUAR)).length, 1, "satu pesan walau dua putaran");
});

uji("hari berikutnya (batas tengah malam UTC): tanggal WIB baru, ditanya lagi sekali", async () => {
  const esok = WIB16 + 24 * 3600e3;   // 25 Nov 09.00 UTC = 16.00 WIB; tanggal WIB dan UTC sama, tetapi 24 Nov 17.00 UTC sudah 25 Nov WIB
  const h = await tanyaHarian(env, esok); assert.equal(h.berkas, 6, "a, b, f, g, h dan d (izin LUAR diberikan di uji balapan)"); assert.deepEqual((await tanya("a")).map(x => x.tgl), ["2026-11-24", "2026-11-25"]);
  assert.equal((await kabar(K1)).length, 2);
  const {tglWib} = await import("../../src/lapor_tampil.js");
  assert.equal(tglWib(Date.UTC(2026, 10, 24, 17, 0)), "2026-11-25"); assert.equal(tglWib(Date.UTC(2026, 10, 24, 16, 59)), "2026-11-24");
});

uji("scheduled: cron menit 09.00 UTC memicu pertanyaan, menit lain tidak", async () => {
  await DB.prepare("DELETE FROM lj_tanya").run(); await DB.prepare("DELETE FROM lj_kabar").run();
  const ev = t => ({cron: "* * * * *", scheduledTime: t});
  await worker.scheduled(ev(WIB16 + 60e3), env); assert.equal(await n("lj_tanya"), 0);
  await worker.scheduled(ev(WIB16), env); assert.ok(await n("lj_tanya") >= 2);
});

uji("jawaban WA: masih dan selesai tercatat; satu berkas tanpa nomor; bernomor bila beberapa; anggota dan luar konteks tidak menangkap", async () => {
  await DB.prepare("DELETE FROM lj_tanya").run(); await DB.prepare("DELETE FROM lj_kabar").run();
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai', ditutup = 1 WHERE id IN (?, ?, ?, ?)").bind(id("b"), id("f"), id("g"), id("h")).run();   // K1 tinggal berkas a
  await tanyaHarian(env, WIB16_INI);
  const tgl = TGL_INI;
  const r0 = await wa(AGT, "masih"); assert.ok(!/dicatat/i.test(r0.t) || r0.j.status !== "data_lanjutan" || !/masih berlangsung/.test(r0.t), "anggota tidak menjawab");
  assert.equal((await tanya("a"))[0].jawab, null);
  const r1 = await wa(K1, "Masih"); assert.equal(r1.s, 200, r1.t); assert.equal(r1.j.status, "data_lanjutan"); assert.match(r1.j.balasan, /masih berlangsung/); assert.match(r1.j.balasan, /Bagian yang belum didata: prasarana/);
  assert.equal((await tanya("a")).find(x => x.tgl === tgl).jawab, "masih");
  const r2 = await wa(K1, "selesai"); assert.match(r2.j.balasan, /sudah selesai/); assert.match(r2.j.balasan, /belum ditutup/);
  assert.equal((await tanya("a")).find(x => x.tgl === tgl).jawab, "selesai"); assert.equal((await DB.prepare("SELECT status FROM lj_berkas WHERE id = ?").bind(id("a")).first()).status, "terbuka", "tidak ada penutupan otomatis");
  // tanpa pertanyaan hari ini: bukan jawaban
  const r3 = await wa(K3, "selesai"); assert.notEqual(r3.j?.status, "data_lanjutan");
});

uji("ketua dengan dua berkas: tanpa nomor diminta nomor, nomor salah ditolak, nomor memilih berkas; berkas ditutup tidak dijawab", async () => {
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL WHERE id = ?").bind(id("b")).run(); await DB.prepare("DELETE FROM lj_tanya").run();
  await tanyaHarian(env, WIB16_INI);
  const baris = (await DB.prepare(`SELECT berkas FROM lj_tanya WHERE tgl = '${TGL_INI}' AND berkas IN (?, ?) ORDER BY waktu, berkas`).bind(id("a"), id("b")).all()).results.map(x => x.berkas);
  const s = await wa(K1, "masih"); assert.match(s.j.balasan, /Tulis nomor berkasnya/); assert.equal((await tanya("a")).filter(x => x.jawab).length, 0);
  assert.match((await wa(K1, "masih 3")).j.balasan, /tidak ada/);
  assert.match((await wa(K1, "selesai 2")).j.balasan, /sudah selesai/);
  assert.equal((await DB.prepare(`SELECT jawab FROM lj_tanya WHERE berkas = ? AND tgl = '${TGL_INI}'`).bind(baris[1]).first()).jawab, "selesai");
  assert.equal((await DB.prepare(`SELECT jawab FROM lj_tanya WHERE berkas = ? AND tgl = '${TGL_INI}'`).bind(baris[0]).first()).jawab, null);
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai', ditutup = 1 WHERE id = ?").bind(baris[0]).run();
  assert.match((await wa(K1, "masih 1")).j.balasan, /sudah ditutup/);
});

uji("banyak berkas: dipotong 'dan N berkas lain', pesan <= 2000, yang terpotong ditanya putaran menit 30 dengan nomor melanjutkan", async () => {
  for (const t of ["lj_tanya", "lj_kabar", "lj_tim", "lj_objek", "lj_berkas"]) await DB.prepare(`DELETE FROM ${t}`).run();
  const M = "6281299882001", NM = "Kabupaten Dengan Nama Yang Sangat Panjang Sekali Sekali Untuk Menguji";
  for (let i = 0; i < 20; i++) await berkas(String.fromCharCode(97 + i), `LA-231124-${String(10 + i)}`, `32.${10 + i}`, M, {nama: NM + " " + i});
  await tanyaHarian(env, WIB16_INI); const k = await kabar(M); assert.equal(k.length, 1); assert.ok(k[0].teks.length <= 2000, String(k[0].teks.length));
  const m = /dan (\d+) berkas lain/.exec(k[0].teks); assert.ok(m, k[0].teks); const sisa = Number(m[1]);
  assert.equal(await n("lj_tanya"), 20 - sisa, "hanya yang tercantum ditanya");
  await tanyaHarian(env, WIB16_INI + 30 * 60e3); const k2 = await kabar(M); assert.equal(k2.length, 2);
  assert.match(k2[1].teks, new RegExp(`\\n${20 - sisa + 1}\\. `), "nomor melanjutkan pesan pertama");
});

const bersih = async () => { for (const t of ["lj_jejak", "lj_tanya", "lj_kabar", "lj_sesi", "lj_tim", "lj_objek", "lj_berkas"]) await DB.prepare(`DELETE FROM ${t}`).run(); };
const sidikWa = async nomor => {   // sama dengan sidikPribadi di src/lapor_lanjut.js
  const {createHmac} = await import("node:crypto"); return createHmac("sha256", "lj-pribadi:kunci-sesi-uji").update(nomor).digest("hex");
};

uji("ketua berkas A yang juga anggota berkas B (lebih baru) tetap bisa menjawab A; jawaban tercatat di lj_jejak, boleh ditimpa", async () => {
  await bersih(); const X = "6281299883001";
  await berkas("p", "LA-231124-31", "32.11", X, {nama: "Kab A"}); await berkas("q", "LA-231124-32", "32.12", K2, {nama: "Kab B"});
  await DB.prepare("INSERT INTO lj_tim (berkas, wa, nama, peran, oleh, dibuat) VALUES (?, ?, 'N', 'anggota', 'uji', ?)").bind(id("q"), X, kini0 + 1000).run();
  await tanyaHarian(env, WIB16_INI);
  const r = await wa(X, "masih"); assert.equal(r.j.status, "data_lanjutan", r.t); assert.match(r.j.balasan, /Kab A/);
  assert.equal((await tanya("p")).find(x => x.tgl === TGL_INI).jawab, "masih");
  await wa(X, "selesai"); assert.equal((await tanya("p")).find(x => x.tgl === TGL_INI).jawab, "selesai", "jawaban terakhir menang");
  const j = (await DB.prepare("SELECT aksi, oleh, sesudah, pribadi_sidik FROM lj_jejak WHERE berkas = ? ORDER BY id").bind(id("p")).all()).results;
  assert.deepEqual(j.map(x => x.aksi), ["tanya_masih", "tanya_selesai"], "riwayat append-only");
  assert.equal(j[0].pribadi_sidik, await sidikWa(X)); assert.ok(!j[0].sesudah.includes(X) && !j[0].oleh.includes("*"));
});

uji("ketua baru sesudah pertanyaan dikirim tidak bisa menjawabnya; ketua lama yang sudah turun juga tidak", async () => {
  await bersih(); const Y = "6281299883011", Z = "6281299883012";
  await berkas("r", "LA-231124-33", "32.13", Y, {nama: "Kab C"});
  await DB.prepare("INSERT INTO lj_tim (berkas, wa, nama, peran, oleh, dibuat) VALUES (?, ?, 'N', 'anggota', 'uji', ?)").bind(id("r"), Z, kini0).run();
  await tanyaHarian(env, WIB16_INI);
  await DB.batch([DB.prepare("UPDATE lj_tim SET peran = 'ketua' WHERE berkas = ? AND wa = ?").bind(id("r"), Z), DB.prepare("UPDATE lj_tim SET peran = 'anggota' WHERE berkas = ? AND wa = ?").bind(id("r"), Y),
    DB.prepare("INSERT INTO lj_jejak (berkas, aksi, sesudah, pribadi_sidik, oleh, waktu) VALUES (?, 'tim_pindah_ketua', '{}', ?, 'staf', ?)").bind(id("r"), await sidikWa(Z), WIB16_INI + 60e3)]);
  for (const x of [Z, Y]) { const r = await wa(x, "masih"); assert.notEqual(r.j?.status, "data_lanjutan", x); }
  assert.equal((await tanya("r")).find(x => x.tgl === TGL_INI).jawab, null); assert.equal(await n("lj_jejak", "aksi LIKE 'tanya_%'"), 0);
});

uji("putaran ulang: jumlah SELECT tetap (daftar, hitung jenis, offset) berapa pun jumlah ketua", async () => {
  const hitung = async N => {
    await bersih(); const M = i => "62812998840" + String(10 + i);
    for (let i = 0; i < N; i++) await berkas(String.fromCharCode(97 + i), `LA-231124-${40 + i}`, `32.${20 + i}`, M(i), {nama: "K" + i});
    await tanyaHarian(env, WIB16_INI);
    for (let i = 0; i < N; i++) await berkas(String.fromCharCode(110 + i), `LA-231124-${60 + i}`, `32.${40 + i}`, M(i), {nama: "L" + i});
    let sel = 0; const db = new Proxy(DB, {get: (t, k) => k === "prepare" ? sql => { if (/^\s*SELECT/i.test(sql)) sel++; return t.prepare(sql); } : typeof t[k] === "function" ? t[k].bind(t) : t[k]});
    const h = await tanyaHarian({DB: db}, WIB16_INI + 30 * 60e3); assert.equal(h.ketua, N);
    assert.match((await kabar(M(0)))[1].teks, /^Ada 2 berkas/, "nomor melanjutkan pesan pagi"); return sel;
  };
  const a = await hitung(3), b = await hitung(9); assert.equal(a, b); assert.equal(a, 3);
});
