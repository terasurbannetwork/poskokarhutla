/* Skema migrasi 0130 (paritas bencana: tugas_bencana_x, pb_titik, pb_renlap, pb_renlap_hasil, pb_log) di SQLite sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/warga/pb_skema.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const SQL0130 = pecah(readFileSync(path.join(AKAR, "migrations/0130_paritas_operasi.sql"), "utf8"));
const baru = () => { const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON"); for (const s of pecah(migrasi())) db.exec(s); return db; };
const db = baru();
const ditolak = (sql, ...p) => assert.throws(() => db.prepare(sql).run(...p), /CHECK|UNIQUE|FOREIGN KEY|constraint/i, sql.slice(0, 70));
const T = ["tugas_bencana_x", "pb_titik", "pb_renlap", "pb_renlap_hasil", "pb_log"];

const titik = (o = {}) => ({id: "a".repeat(16), golongan: "sarana", jenis: "perahu_karet", bencana: "banjir", prov: "61", kab: "", nama: "Pos A", lat: -1, lon: 110, kapasitas: 10, status: "siap", catatan: null, oleh: "staf:1", dibuat: 1, diubah: 1, dihapus: null, ...o});
const masukTitik = o => { const t = titik(o), k = Object.keys(t); db.prepare(`INSERT INTO pb_titik (${k}) VALUES (${k.map(() => "?")})`).run(...Object.values(t)); };
const renlap = (o = {}) => ({id: "b".repeat(16), bencana: "longsor", prov: "32", kab: "3201", tanggal: "2026-11-15", versi: 1, status: "diminta", oleh: "staf:1", dibuat: 1, diubah: 1, ...o});
const masukRenlap = o => { const t = renlap(o), k = Object.keys(t); db.prepare(`INSERT INTO pb_renlap (${k}) VALUES (${k.map(() => "?")})`).run(...Object.values(t)); };

uji("migrasi 0130 dijalankan dua kali tanpa galat dan tanpa mengubah data", () => {
  masukTitik(); masukRenlap();
  const foto = () => JSON.stringify(T.map(t => db.prepare(`SELECT * FROM ${t}`).all()));
  const sebelum = foto();
  for (const s of SQL0130) db.exec(s);
  assert.equal(foto(), sebelum);
  assert.ok(SQL0130.every(s => /^CREATE (TABLE|INDEX) IF NOT EXISTS/i.test(s)), "hanya CREATE ... IF NOT EXISTS");
  const mentah = readFileSync(path.join(AKAR, "migrations/0130_paritas_operasi.sql"), "utf8");
  assert.ok(!/^\s*(ALTER|DROP|INSERT|UPDATE|DELETE)\b/im.test(mentah.replace(/--.*$/gm, "")), "tanpa ALTER/DROP/seed");
});

uji("pb_skema CHECK titik: jenis, bencana, status, bbox, kab, golongan di luar daftar ditolak", () => {
  db.exec("DELETE FROM pb_titik");
  for (const o of [{jenis: "ufo"}, {bencana: "tsunami"}, {status: "hilang"}, {golongan: "x"}, {lat: 20}, {lat: -12}, {lon: 90}, {lon: 142}, {kab: "320"}, {prov: "3"}, {nama: ""}, {kapasitas: -1}, {id: "pendek"}])
    assert.throws(() => masukTitik(o), /CHECK/i, JSON.stringify(o));
  masukTitik({kab: "3201"}); masukTitik({id: "c".repeat(16), kab: ""});
  assert.equal(db.prepare("SELECT count(*) n FROM pb_titik").get().n, 2);
});

uji("pb_skema CHECK renlap: bencana, status, tanggal, versi, kab; UNIQUE versi menolak ganda", () => {
  db.exec("DELETE FROM pb_renlap");
  for (const o of [{bencana: "tsunami"}, {status: "acak"}, {tanggal: "15-11-2026"}, {tanggal: "2026/11/15"}, {versi: 0}, {versi: 100}, {kab: "32"}, {sha: "pendek"}, {jml_target: 501}])
    assert.throws(() => masukRenlap(o), /CHECK/i, JSON.stringify(o));
  masukRenlap();
  assert.throws(() => masukRenlap({id: "d".repeat(16)}), /UNIQUE/i);
  masukRenlap({id: "d".repeat(16), versi: 2});
});

uji("pb_skema tugas_bencana_x menolak karhutla dan reda negatif; FK ke tugas_api", () => {
  ditolak("INSERT INTO tugas_bencana_x (tugas_id, bencana) VALUES ('t1', 'karhutla')");
  ditolak("INSERT INTO tugas_bencana_x (tugas_id, bencana) VALUES ('t1', 'longsor')");   // FK: tugas t1 tidak ada
  ditolak("INSERT INTO tugas_bencana_x (tugas_id, bencana, reda) VALUES ('t1', 'longsor', -1)");
});

uji("pb_skema pb_renlap_hasil mengikuti FK, PK, dan daftar alasan/hasil", () => {
  const hasil = (id, no, alasan = null, h = null, d = 1) => db.prepare("INSERT INTO pb_renlap_hasil (renlap_id,target_no,didatangi,alasan,hasil,oleh,waktu) VALUES (?,?,?,?,?,?,?)").run(id, no, d, alasan, h, "staf:1", 1);
  const id = "b".repeat(16);
  assert.throws(() => hasil("z".repeat(16), 1), /FOREIGN KEY/i);
  hasil(id, 1, "cuaca", "belum");
  assert.throws(() => hasil(id, 1), /UNIQUE|PRIMARY/i);
  assert.throws(() => hasil(id, 0), /CHECK/i);
  assert.throws(() => hasil(id, 501), /CHECK/i);
  assert.throws(() => hasil(id, 2, "karangan"), /CHECK/i);
  assert.throws(() => hasil(id, 2, null, "mungkin"), /CHECK/i);
  assert.throws(() => hasil(id, 2, null, null, 2), /CHECK/i);
  db.prepare("DELETE FROM pb_renlap WHERE id = ?").run(id);   // cascade
  assert.equal(db.prepare("SELECT count(*) n FROM pb_renlap_hasil").get().n, 0);
});

uji("pb_skema pb_log menolak JSON tidak sah, lebih dari 8192, tabel dan aksi liar", () => {
  const log = (tabel, aksi, sebelum = null, sesudah = null, kunci = "k") => db.prepare("INSERT INTO pb_log (waktu,oleh,tabel,kunci,aksi,sebelum,sesudah) VALUES (1,'staf:1',?,?,?,?,?)").run(tabel, kunci, aksi, sebelum, sesudah);
  log("pb_titik", "isi", null, '{"a":1}');
  assert.throws(() => log("pb_titik", "isi", null, "bukan json"), /CHECK/i);
  assert.throws(() => log("pb_titik", "isi", null, JSON.stringify({x: "a".repeat(8200)})), /CHECK/i);
  assert.throws(() => log("lain", "isi"), /CHECK/i);
  assert.throws(() => log("pb_titik", "musnah"), /CHECK/i);
  assert.throws(() => log("pb_titik", "isi", null, null, ""), /CHECK/i);
});

uji("pb_skema tanpa kolom nama orang di tabel pb_* dan tugas_bencana_x", () => {
  const liar = /nama_kru|pelapor|korban|no_hp|\bwa\b|nik|email|telepon|jabatan/i;
  for (const t of T) {
    const kol = db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map(r => r.name);
    assert.deepEqual(kol.filter(k => liar.test(k)), [], t);
  }
  assert.ok(db.prepare("SELECT name FROM pragma_table_info('pb_titik')").all().some(r => r.name === "nama"), "nama = tempat/unit, bukan orang");
});

uji("pb_skema EXPLAIN QUERY PLAN kueri utama memakai SEARCH lewat indeks", () => {
  const rencana = (sql, ...p) => db.prepare("EXPLAIN QUERY PLAN " + sql).all(...p).map(r => r.detail).join(" | ");
  const harus = [
    ["SELECT * FROM pb_titik WHERE prov = '61' AND kab = '' AND bencana = 'banjir' AND dihapus IS NULL", "pb_titik_wilayah"],
    ["SELECT * FROM pb_titik WHERE bencana = 'banjir' AND golongan = 'sarana' AND jenis = 'perahu_karet'", "pb_titik_bencana"],
    ["SELECT * FROM pb_renlap WHERE tanggal = '2026-11-15' AND bencana = 'longsor'", "pb_renlap_tanggal"],
    ["SELECT * FROM pb_renlap WHERE prov = '32' AND tanggal >= '2026-11-01'", "pb_renlap_wilayah"],
    ["SELECT max(versi) FROM pb_renlap WHERE bencana = 'longsor' AND prov = '32' AND kab = '3201' AND tanggal = '2026-11-15'", "USING"],
    ["SELECT * FROM pb_renlap_hasil WHERE renlap_id = 'x'", "USING"],
    ["SELECT * FROM pb_log WHERE tabel = 'pb_titik' AND kunci = 'k' ORDER BY waktu", "pb_log_kunci"],
    ["SELECT count(*) FROM pb_log WHERE oleh = 'staf:1' AND waktu > 0", "pb_log_oleh"],
    ["SELECT bencana FROM tugas_bencana_x WHERE tugas_id IN (SELECT value FROM json_each('[\"a\"]'))", "tugas_id"],
    ["SELECT tugas_id FROM tugas_bencana_x WHERE bencana = 'longsor'", "tugas_bencana_x_jenis"],
  ];
  for (const [q, indeks] of harus) {
    const r = rencana(q);
    assert.match(r, /SEARCH/, `${q}\n${r}`);
    assert.ok(r.includes(indeks) || indeks === "USING" && /USING/.test(r), `${q} -> ${r}`);
    assert.ok(!/SCAN (pb_|tugas_bencana_x)/.test(r), r);
  }
});

/* ---- Migrasi 0131: pb_dokumen, pb_tindakan, indeks logbook_sk_selesai (PB-20) ---- */
const T31 = ["pb_dokumen", "pb_tindakan"];
const dok = (o = {}) => ({id: "e".repeat(16), jenis: "sitrep", bencana: "longsor", prov: "32", kab: "", kib: null, periode: "2026-11-15", versi: 1, status: "draf", oleh: "staf:1", dibuat: 1, ...o});
const masukDok = o => { const t = dok(o), k = Object.keys(t); db.prepare(`INSERT INTO pb_dokumen (${k}) VALUES (${k.map(() => "?")})`).run(...Object.values(t)); };
const tind = (o = {}) => ({peringatan: "gempa:abc", butir: 0, pelaksana: "bpbd", selesai: 0, waktu: 1, ...o});
const masukTind = o => { const t = tind(o), k = Object.keys(t); db.prepare(`INSERT INTO pb_tindakan (${k}) VALUES (${k.map(() => "?")})`).run(...Object.values(t)); };

uji("0131 dijalankan dua kali tanpa galat dan tanpa mengubah data; hanya CREATE IF NOT EXISTS", () => {
  const mentah = readFileSync(path.join(AKAR, "migrations/0131_paritas_dokumen.sql"), "utf8");
  const sql = pecah(mentah);
  masukDok(); masukTind();
  const foto = () => JSON.stringify(T31.map(t => db.prepare(`SELECT * FROM ${t}`).all()));
  const sebelum = foto();
  for (const s of sql) db.exec(s);
  assert.equal(foto(), sebelum);
  assert.ok(sql.every(s => /^CREATE (TABLE|INDEX) IF NOT EXISTS/i.test(s)), "hanya CREATE ... IF NOT EXISTS");
  assert.ok(!/^\s*(ALTER|DROP|INSERT|UPDATE|DELETE)\b/im.test(mentah.replace(/--.*$/gm, "")), "tanpa ALTER/DROP/seed");
});

uji("pb_skema pb_dokumen CHECK: jenis, bencana, status, periode, versi, kab, kib, sha ditolak; UNIQUE versi", () => {
  db.exec("DELETE FROM pb_dokumen");
  for (const o of [{jenis: "memo"}, {bencana: "tsunami"}, {status: "terbit"}, {periode: "abc"}, {periode: "x".repeat(21)}, {versi: 0}, {versi: 100}, {kab: "32"}, {prov: "3"}, {kib: "123"}, {kib: "12345678901234ab"}, {sha: "pendek"}, {id: "pendek"}])
    assert.throws(() => masukDok(o), /CHECK/i, JSON.stringify(o));
  masukDok({kib: "1234567890123456", jenis: "laporan_kib"});
  assert.throws(() => masukDok({kib: "1234567890123456", jenis: "laporan_kib"}), /UNIQUE|PRIMARY/i);
  masukDok({id: "f".repeat(16), versi: 2, status: "beku", dibekukan: 2});
  assert.equal(db.prepare("SELECT count(*) n FROM pb_dokumen").get().n, 2);
});

uji("pb_skema pb_tindakan CHECK: butir, pelaksana, selesai, peringatan kosong ditolak; PK ganda ditolak", () => {
  db.exec("DELETE FROM pb_tindakan");
  for (const o of [{butir: -1}, {butir: 31}, {pelaksana: "presiden"}, {selesai: 2}, {peringatan: ""}, {peringatan: "x".repeat(121)}])
    assert.throws(() => masukTind(o), /CHECK/i, JSON.stringify(o));
  masukTind(); masukTind({butir: 1, pelaksana: null});
  assert.throws(() => masukTind(), /UNIQUE|PRIMARY/i);
  assert.equal(db.prepare("SELECT selesai FROM pb_tindakan WHERE butir = 1").get().selesai, 0);
});

uji("0131 tanpa kolom nama orang; kueri utama SEARCH lewat indeks", () => {
  const liar = /nama_kru|pelapor|korban|no_hp|\bwa\b|nik|email|telepon|jabatan|^nama$/i;
  for (const t of T31) {
    const kol = db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map(r => r.name);
    assert.deepEqual(kol.filter(k => liar.test(k)), [], t);
  }
  const rencana = q => db.prepare("EXPLAIN QUERY PLAN " + q).all().map(r => r.detail).join(" | ");
  for (const [q, indeks] of [
    ["SELECT * FROM pb_dokumen WHERE periode = '2026-11-15' AND jenis = 'sitrep'", "pb_dokumen_periode"],
    ["SELECT * FROM pb_dokumen WHERE kib = '1234567890123456' AND jenis = 'laporan_kib'", "pb_dokumen_kib"],
    ["SELECT * FROM pb_tindakan WHERE peringatan = 'x'", "USING"],
    ["SELECT * FROM pb_tindakan WHERE waktu < 5", "pb_tindakan_waktu"],
    ["SELECT * FROM logbook_sk WHERE tmt_selesai >= '2026-11-15'", "logbook_sk_selesai"],
  ]) {
    const r = rencana(q);
    assert.match(r, /SEARCH/, `${q}\n${r}`);
    assert.ok(r.includes(indeks) || indeks === "USING" && /USING/.test(r), `${q} -> ${r}`);
  }
});
