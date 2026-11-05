/* scripts/operasi/isi_ulang_wa.mjs: ekspor WA -> catatOperasi() -> SQL isi ulang. SQL-nya dijalankan sungguhan ke SQLite yang dibangun dari semua migrasi.
   Dibuktikan: dua format ekspor terbaca dan pesan ganda antar-ekspor dibuang; SQL diulang tidak menggandakan apa pun;
   status armada yang sudah ditulis bot di D1 TIDAK ditimpa ekspor; gerak yang sudah ada tidak digandakan. */
import assert from "node:assert/strict";
import {test} from "node:test";
import {DatabaseSync} from "node:sqlite";
import {pecah, migrasi} from "./_bantu.mjs";
const {bacaEkspor, isiUlang} = await import("../../scripts/operasi/isi_ulang_wa.mjs");

const ANDROID = `[11/2/26, 8:10:00 AM] +62 811-0000-0000: Ijin melaporkan kegiatan Pendampingan Penanganan Karhutla pada hari Senin, 2 November 2026, sbb :
b) Heli MI-8AMT Reg. RA-22747: 2 Sortie (09 jam 35 menit / 50x WB)
5) Heli MI8 MSB-T Reg. UR-VBC: Unserviceable (7 Consecutive day) dan maintenance 500 jam.
[11/2/26, 8:12:00 AM] +62 811-0000-0000: Siap, terima kasih
[11/2/26, 9:00:00 AM] +62 811-0000-0000: [Forwarded] <image omitted>`;
const IOS = `[02/11/26, 08.10.00] ~ Anggota: Ijin melaporkan kegiatan Pendampingan Penanganan Karhutla pada hari Senin, 2 November 2026, sbb :
b) Heli MI-8AMT Reg. RA-22747: 2 Sortie (09 jam 35 menit / 50x WB)
5) Heli MI8 MSB-T Reg. UR-VBC: Unserviceable (7 Consecutive day) dan maintenance 500 jam.
‎[02/11/26, 09.30.00] ~ Anggota: *MVT DEPARTURE*
REG : VN-8416
ATD : 01.28 Z
Senin, 2 November 2026
TARGET WATER BOMBING
Air Hitam Besar
S 02° 50' 34" E 110° 12' 10"`;

const baris = (db, sql) => ({...db.prepare(sql).get()});   // node:sqlite memberi objek tanpa prototipe
const dbBaru = () => { const db = new DatabaseSync(":memory:"); for (const s of pecah(migrasi())) db.exec(s); return db; };
const n = (db, t, w = "1 = 1") => db.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).get().n;

test("bacaEkspor: Android dan iOS terbaca, ganda antar-ekspor dan pesan media kosong dibuang", () => {
  const p = bacaEkspor(ANDROID + "\n" + IOS);
  assert.equal(p.length, 3, JSON.stringify(p.map(x => x.teks.slice(0, 30))));
  assert.equal(p[0].ms, Date.parse("2026-11-02T08:10:00+07:00"), "jam ekspor dibaca sebagai WIB");
});

test("SQL isi ulang: idempoten, tidak menimpa status bot, tidak menggandakan gerak", async () => {
  const {sql, hitung} = await isiUlang(bacaEkspor(ANDROID + "\n" + IOS));
  assert.deepEqual([hitung.op_armada_status, hitung.op_gerak], [2, 1], JSON.stringify(hitung));
  const db = dbBaru();
  db.prepare("INSERT INTO op_armada_status (tanggal, registrasi, status, alasan, sumber, diubah) VALUES ('2026-11-02', 'RA-22747', 'tidak_siap', 'lapor bot', 'wa', 1)").run();
  db.exec(sql); db.exec(sql);
  assert.equal(n(db, "op_armada_status"), 2, "dua pesawat, diulang tetap dua");
  assert.deepEqual(baris(db, "SELECT status, alasan, sumber FROM op_armada_status WHERE registrasi = 'RA-22747'"), {status: "tidak_siap", alasan: "lapor bot", sumber: "wa"}, "laporan bot di D1 menang atas ekspor");
  assert.deepEqual(baris(db, "SELECT status, sumber FROM op_armada_status WHERE registrasi = 'UR-VBC'"), {status: "tidak_siap", sumber: "wa_ekspor"});
  assert.equal(n(db, "op_gerak"), 1, "gerak tidak berganda walau SQL diulang");
  assert.deepEqual(baris(db, "SELECT tanggal, registrasi, jenis, jam_utc FROM op_gerak"),{tanggal: "2026-11-02", registrasi: "VN-8416", jenis: "berangkat", jam_utc: Date.parse("2026-11-02T01:28Z")});
});
