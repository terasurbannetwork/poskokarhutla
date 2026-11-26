/* Skema Ruang Unit MB-7 (RU-032; migrations/0187_unit.sql; kedeputian DESAIN-TEKNIS §2.2, §9.3): SQL langsung yang salah DITOLAK, migrasi dua kali tanpa galat,
   kueri ketuk memakai indeks. SQLite memori (node:sqlite), semua migrasi apa adanya. Jalankan: node --test tests/warga/unit_ketuk_skema.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const F = "0187_unit.sql", db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
for (const s of pecah(migrasi())) db.exec(s);
const T = 1_790_000_000_000, ID = "9f2c0a1b3d4e5f60", HX = n => n.toString(16).padStart(16, "0");
const tolak = (sql, ...a) => assert.throws(() => db.prepare(sql).run(...a), undefined, sql.slice(0, 70));
const ketuk = (o = {}) => { const b = {berkas: "usulan_rpbd", usulan_id: ID, keputusan: "terima", koreksi: null, catatan: null, oleh: "staf:abc", waktu: T, dummy: 0, ...o}, k = Object.keys(b);
  return db.prepare(`INSERT INTO unit_ketuk (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => b[x])); };

uji("migrasi 0187 dua kali tanpa galat (idempoten) dan tidak mengubah isi", () => {
  ketuk({usulan_id: HX(1)});
  for (const s of pecah(readFileSync(path.join(AKAR, "migrations", F), "utf8"))) db.exec(s);
  assert.equal(db.prepare("SELECT count(*) n FROM unit_ketuk").get().n, 1);
  for (const t of ["unit_ketuk", "akses_status", "hibah_bast", "diklat_angkatan"]) assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t), t);
});

uji("unit_ketuk: UPDATE ditolak, DELETE baris nyata ditolak (dummy boleh), koreksi harus berpasangan dengan keputusan koreksi", () => {
  const id = ketuk({usulan_id: HX(2)}).lastInsertRowid;
  tolak("UPDATE unit_ketuk SET keputusan = 'tolak' WHERE id = ?", id);
  tolak("DELETE FROM unit_ketuk WHERE id = ?", id);
  const d = ketuk({usulan_id: HX(3), dummy: 1}).lastInsertRowid; db.prepare("DELETE FROM unit_ketuk WHERE id = ?").run(d);
  assert.throws(() => ketuk({keputusan: "koreksi"}), "koreksi tanpa isi");
  assert.throws(() => ketuk({keputusan: "terima", koreksi: '{"status":"habis"}'}), "isi koreksi pada keputusan terima");
  assert.throws(() => ketuk({keputusan: "koreksi", koreksi: "bukan json"}));
  assert.throws(() => ketuk({keputusan: "koreksi", koreksi: "[1]"}), "koreksi harus objek");
  assert.throws(() => ketuk({keputusan: "koreksi", koreksi: JSON.stringify({s: "a".repeat(2000)})}), "lebih dari 2000 huruf");
  ketuk({usulan_id: HX(4), keputusan: "koreksi", koreksi: '{"status":"habis"}'});
});

uji("unit_ketuk: berkas, usulan_id, keputusan, catatan, oleh di luar batas ditolak", () => {
  for (const o of [{berkas: "Usulan"}, {berkas: "ab"}, {berkas: "usulan-rpbd"}, {usulan_id: "XYZ"}, {usulan_id: ID.toUpperCase()}, {usulan_id: ID + "0"}, {keputusan: "hapus"},
    {catatan: "a".repeat(201)}, {oleh: "ab"}, {dummy: 2}, {oleh: null}, {waktu: null}]) assert.throws(() => ketuk(o), JSON.stringify(o));
});

uji("akses_status: status di luar tiga nilai dan tanggal rusak ditolak; (titik, tgl, status) kembar ditolak; UPDATE ditolak", () => {
  const a = (o = {}) => { const b = {titik_id: ID, tgl: "2026-11-05", status: "putus", sumber: "isian", catatan: null, oleh: "staf:abc", waktu: T, ...o}, k = Object.keys(b);
    return db.prepare(`INSERT INTO akses_status (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => b[x])); };
  const id = a().lastInsertRowid;
  assert.throws(() => a(), "baris kembar per (titik, tgl, status)");
  a({status: "pulih"}); a({tgl: "2026-11-06"});
  for (const o of [{status: "banjir"}, {tgl: "2026-13-40"}, {tgl: "5 Nov"}, {sumber: "lain"}, {titik_id: "zz"}]) assert.throws(() => a({tgl: "2026-12-01", ...o}), JSON.stringify(o));
  tolak("UPDATE akses_status SET status = 'pulih' WHERE id = ?", id);
});

uji("hibah_bast: hanya tgl_lapor yang boleh berubah; tgl_lapor sebelum tgl_bast ditolak; kab harus di prov-nya", () => {
  const h = (o = {}) => { const b = {id: HX(9), tahun: 2026, prov: "33", kab: "3303", barang: "Tenda keluarga", jumlah: 10, satuan: "unit", tgl_bast: "2026-05-01", kedaluwarsa: null, tgl_lapor: null, sumber: "kepdep", dibuat: T, diubah: T, oleh: "staf:abc", ...o}, k = Object.keys(b);
    return db.prepare(`INSERT INTO hibah_bast (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => b[x])); };
  h();
  assert.throws(() => h({id: HX(10), tgl_lapor: "2026-04-30"}), "tgl_lapor sebelum tgl_bast");
  assert.throws(() => h({id: HX(11), kab: "3503"}), "kab di luar prov");
  assert.throws(() => h({id: HX(12), jumlah: 0}));
  db.prepare("UPDATE hibah_bast SET tgl_lapor = '2026-06-01' WHERE id = ?").run(HX(9));
  assert.throws(() => db.prepare("UPDATE hibah_bast SET tgl_lapor = '2026-04-01' WHERE id = ?").run(HX(9)), "tgl_lapor mundur melewati tgl_bast");
  for (const [k, v] of [["jumlah", 99], ["barang", "Lain"], ["tgl_bast", "2026-05-02"], ["prov", "35"], ["kab", null], ["tahun", 2025], ["sumber", "isian"], ["dibuat", T + 1], ["id", HX(13)]])
    tolak(`UPDATE hibah_bast SET ${k} = ? WHERE id = ?`, v, HX(9));
});

uji("diklat_angkatan: n_lulus > n_peserta ditolak; angkatan kembar ditolak termasuk kab NULL; jenis di luar daftar ditolak", () => {
  const d = (o = {}) => { const b = {id: HX(20), program: "Diklat Dasar", jenis: "teknis_dasar", tgl_mulai: "2026-03-01", tgl_selesai: "2026-03-10", prov: "33", kab: null, n_peserta: 30, n_lulus: 28, penyelenggara: "Pusdiklat PB", dibuat: T, oleh: "staf:abc", ...o}, k = Object.keys(b);
    return db.prepare(`INSERT INTO diklat_angkatan (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => b[x])); };
  d();
  assert.throws(() => d({id: HX(21), n_lulus: 31}), "n_lulus > n_peserta");
  assert.throws(() => d({id: HX(22)}), "kembar dengan kab NULL (ifnull di indeks unik)");
  assert.throws(() => d({id: HX(23), jenis: "lain", kab: "3303"}));
  assert.throws(() => d({id: HX(24), tgl_selesai: "2026-02-01", kab: "3303"}), "selesai sebelum mulai");
  assert.throws(() => d({id: HX(25), n_peserta: 0, n_lulus: 0, kab: "3303"}));
  d({id: HX(26), kab: "3303"});
});

uji("EXPLAIN QUERY PLAN: kueri GET /api/unit/ketuk memakai indeks unit_ketuk_berkas (DT §9.3), tanpa pindai penuh", () => {
  const sql = readFileSync(path.join(AKAR, "src/hak.js"), "utf8").match(/"(SELECT id, usulan_id[^"]*FROM unit_ketuk[^"]*)"/)?.[1];
  assert.ok(sql, "kueri ketukTerbaru tidak ditemukan di src/hak.js");
  const rencana = db.prepare("EXPLAIN QUERY PLAN " + sql.replace(/\?/g, "'usulan_rpbd'")).all().map(r => r.detail).join(" | ");
  assert.match(rencana, /unit_ketuk_berkas/, rencana); assert.doesNotMatch(rencana, /SCAN unit_ketuk(?! USING)/, rencana);
});

uji("INSERT OR REPLACE tidak bisa menimpa baris yang sudah ada; akses_status tidak boleh dihapus; satuan BAST beku (tinjauan migrasi 26 Nov 2026)", () => {
  const id = ketuk({usulan_id: HX(40)}).lastInsertRowid;
  tolak("INSERT OR REPLACE INTO unit_ketuk (id, berkas, usulan_id, keputusan, oleh, waktu) VALUES (?, 'usulan_rpbd', ?, 'tolak', 'staf:abc', ?)", id, HX(41), T);
  assert.equal(db.prepare("SELECT usulan_id FROM unit_ketuk WHERE id = ?").get(id).usulan_id, HX(40));
  const ak = db.prepare("INSERT INTO akses_status (titik_id, tgl, status, sumber, oleh, waktu) VALUES (?, '2026-11-20', 'putus', 'wa', 'staf:abc', ?)").run(HX(42), T).lastInsertRowid;
  tolak("INSERT OR REPLACE INTO akses_status (titik_id, tgl, status, sumber, oleh, waktu) VALUES (?, '2026-11-20', 'putus', 'isian', 'staf:abc', ?)", HX(42), T);
  tolak("DELETE FROM akses_status WHERE id = ?", ak);
  db.prepare("INSERT INTO hibah_bast (id, tahun, prov, barang, jumlah, satuan, tgl_bast, sumber, dibuat, diubah, oleh) VALUES (?, 2025, '11', 'Perahu karet', 2, 'unit', '2025-03-01', 'kepdep', ?, ?, 'skrip:impor')").run(HX(43), T, T);
  tolak("INSERT OR REPLACE INTO hibah_bast (id, tahun, prov, barang, jumlah, satuan, tgl_bast, sumber, dibuat, diubah, oleh) VALUES (?, 2025, '11', 'Perahu karet', 9, 'unit', '2025-03-01', 'kepdep', ?, ?, 'skrip:impor')", HX(43), T, T);
  tolak("UPDATE hibah_bast SET satuan = 'set' WHERE id = ?", HX(43));
  assert.equal(db.prepare("SELECT jumlah FROM hibah_bast WHERE id = ?").get(HX(43)).jumlah, 2);
});
