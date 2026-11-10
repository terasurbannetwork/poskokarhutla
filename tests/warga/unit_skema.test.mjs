/* Skema F0-3 (migrations/0110_meja_rehab_lepas.sql; RENCANA-UJI §3.3 R1-R10): meja 'rehab' boleh tanpa kaji_id, tanpa kehilangan meja_jejak dan meja_stok.
   SQLite memori (node:sqlite), migrasi apa adanya, foreign_keys ON. Uji tulis dibungkus BEGIN...ROLLBACK. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";

const DIR = path.join(AKAR, "migrations"), F0110 = "0110_meja_rehab_lepas.sql";
const berkas = readdirSync(DIR).filter(f => f.endsWith(".sql")).sort();
const jalankan = (db, f) => { for (const s of pecah(readFileSync(path.join(DIR, f), "utf8"))) db.exec(s); };
const terap0110 = db => { db.exec("BEGIN"); try { jalankan(db, F0110); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } };   // seperti D1: satu transaksi per migrasi
function basisLama() {   // semua migrasi SEBELUM 0110 (migrasi sesudahnya, mis. 0118, membangun ulang tabel yang sama dan harus jalan sesudah 0110)
  const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON;");
  for (const f of berkas) if (f < F0110) jalankan(db, f);
  return db;
}
let n = 0; const hex = () => (++n).toString(16).padStart(16, "0");
const T = 1_790_000_000_000;
const cat = (db, o) => { const b = {id: hex(), meja: "kaji_cepat", prov: "71", kab: "Kab A", kec: null, desa: "Desa D", data: "{}", status: "masuk_jitupasna", dibuat: T, diubah: T, ...o}, k = Object.keys(b);
  db.prepare(`INSERT INTO meja_catatan (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => b[x])); return b.id; };
const rehab = (db, kaji, o = {}) => cat(db, {meja: "rehab", status: "jitupasna", desa: null, kaji_id: kaji, ...o});
const gudang = (db, o = {}) => cat(db, {meja: "gudang", status: "tercatat", desa: null, stok: 10, data: JSON.stringify({gudang: "G" + hex(), barang: "B"}), ...o});

function isiLama(db) {   // 3 rehab tertaut, 2 gudang, 4 meja_stok, 5 meja_jejak (R1)
  const ids = {rehab: [], gudang: []};
  for (let i = 0; i < 3; i++) ids.rehab.push(rehab(db, cat(db, {kab: "Kab " + i}), {kab: "Kab " + i}));
  for (let i = 0; i < 2; i++) ids.gudang.push(gudang(db));
  const st = db.prepare("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, waktu) VALUES (?, 'masuk', ?, ?, ?)");
  for (let i = 0; i < 4; i++) st.run(ids.gudang[i % 2], 5, 15, T + i);
  const jj = db.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu) VALUES (?, NULL, 'jitupasna', ?)");
  for (let i = 0; i < 5; i++) jj.run(ids.rehab[i % 3], T + i);
  return ids;
}
const TABEL = ["meja_catatan", "meja_jejak", "meja_stok"];
const foto = db => Object.fromEntries(TABEL.map(t => [t, db.prepare(`SELECT * FROM ${t} ORDER BY id`).all().map(r => ({...r}))]));
const objek = db => db.prepare("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all().map(r => `${r.type}:${r.name}`);

test("R1: bangun ulang menyimpan tiap baris meja_catatan, meja_jejak, meja_stok; foreign_key_check kosong", () => {
  const db = basisLama(); isiLama(db);
  const sebelum = foto(db);
  assert.deepEqual(TABEL.map(t => sebelum[t].length), [8, 5, 4], "prasyarat: seed tidak terisi (3 kaji + 3 rehab + 2 gudang = 8)");
  terap0110(db);
  const sesudah = foto(db);
  for (const t of TABEL) assert.deepEqual(sesudah[t], sebelum[t], `${t}: isi berubah sesudah 0110 (CASCADE DROP mengosongkan meja_jejak bila cadangan gagal)`);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), [], "ada pelanggaran foreign key sesudah 0110");
});

test("R2: semua objek skema sebelum 0110 masih ada sesudahnya (indeks dan trigger meja)", () => {
  const db = basisLama(), sebelum = objek(db);
  terap0110(db);
  const sesudah = objek(db);
  for (const o of ["index:meja_catatan_wilayah", "index:meja_catatan_klien", "index:meja_rehab_satu", "index:meja_gudang_unik", "trigger:meja_rehab_tautan", "trigger:meja_catatan_ubah", "trigger:meja_stok_sah"])
    assert.ok(sesudah.includes(o), `${o} hilang sesudah 0110`);
  assert.deepEqual(sebelum.filter(o => !sesudah.includes(o)), [], "objek skema yang hilang dibanding sebelum 0110");
  assert.ok(sesudah.includes("index:meja_rehab_kejadian"), "indeks baru meja_rehab_kejadian tidak ada");
  assert.deepEqual(sesudah.filter(o => /meja_(catatan|jejak)_cadang/.test(o)), [], "tabel sementara tertinggal");
});

test("R3: dijalankan dua kali tanpa galat dan tanpa mengubah isi (idempoten, basis berisi)", () => {
  const db = basisLama(); isiLama(db); terap0110(db);
  const satu = foto(db), objekSatu = objek(db);
  assert.doesNotThrow(() => terap0110(db), "0110 kedua gagal");
  assert.deepEqual(foto(db), satu, "jalan kedua mengubah isi tabel");
  assert.deepEqual(objek(db), objekSatu, "jalan kedua mengubah daftar objek");
});

// ---- R4-R10 pada skema hasil 0110 ----
const db = basisLama(); terap0110(db);
const rb = f => { db.exec("BEGIN"); try { return f(); } finally { db.exec("ROLLBACK"); } };
const tolak = (f, pola, pesan) => rb(() => assert.throws(f, pola, `${pesan}: DITERIMA`));
const lolos = (f, pesan) => rb(() => assert.doesNotThrow(f, `${pesan}: DITOLAK`));

test("R4: rehab tanpa kaji_id diterima", () => lolos(() => rehab(db, null), "rehab tanpa kaji_id"));
test("R5: rehab dengan kaji_id liar ditolak", () => tolak(() => rehab(db, hex()), /rehab harus tertaut|FOREIGN KEY/, "kaji_id liar"));
test("R6: rehab dengan kaji cepat kab lain ditolak dengan pesan tautan", () => rb(() => {
  const k = cat(db, {kab: "Kab Lain"});
  assert.throws(() => rehab(db, k, {kab: "Kab A"}), /rehab harus tertaut ke kaji cepat masuk_jitupasna di kabupaten yang sama/);
}));
test("R7: gudang dengan kaji_id ditolak (kaji_id hanya untuk rehab)", () => rb(() => {
  const k = cat(db); assert.throws(() => gudang(db, {kaji_id: k}), /constraint failed/);
}));
test("R8: dua rehab tanpa kaji_id di kab yang sama diterima; kejadian_ref kembar di kab sama ditolak, di kab lain diterima", () => rb(() => {
  rehab(db, null); rehab(db, null);
  rehab(db, null, {data: '{"kejadian_ref":"A"}'}); rehab(db, null, {data: '{"kejadian_ref":"B"}'});
  assert.throws(() => rehab(db, null, {data: '{"kejadian_ref":"A"}'}), /UNIQUE constraint failed/, "kejadian_ref kembar di kab sama diterima");
  assert.doesNotThrow(() => rehab(db, null, {kab: "Kab B", data: '{"kejadian_ref":"A"}'}), "kejadian_ref sama di kab lain ditolak");
}));
test("R9: rehab kedua untuk kaji_id yang sama ditolak (satu rehab per kaji cepat)", () => rb(() => {
  const k = cat(db); rehab(db, k); assert.throws(() => rehab(db, k), /UNIQUE constraint failed/);
}));
test("R10: kaji_id rehab tidak bisa diubah dari NULL ke id sah (meja_catatan_ubah)", () => rb(() => {
  const k = cat(db), r = rehab(db, null);
  assert.throws(() => db.prepare("UPDATE meja_catatan SET kaji_id = ? WHERE id = ?").run(k, r), /perubahan meja, wilayah, atau status tidak sah/);
}));
