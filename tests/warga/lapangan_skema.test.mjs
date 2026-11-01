/* Skema modul Lapangan tahap A (migrations/0095_lapangan_orang.sql): enum CHECK == konstanta JS, nilai di luar enum DITOLAK, kembar sah LOLOS,
   indeks unik bersyarat, FK cascade, idempoten. SQLite memori (node:sqlite) dengan migrasi apa adanya, foreign_keys ON. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import * as K from "../../src/lapangan_konst.js";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(migrasi());
const tabelSql = t => db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(t).sql;
const enumDi = (tabel, kolom) => { const m = tabelSql(tabel).match(new RegExp(`\\b${kolom}\\s+TEXT[^,]*?CHECK \\(${kolom} IN \\(([^)]*)\\)\\)`)); assert.ok(m, `${tabel}.${kolom}: CHECK IN tidak ditemukan`); return [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]); };

let n = 0;
const id16 = () => (++n).toString(16).padStart(16, "0"), sha = () => (++n).toString(16).padStart(64, "0");
const T = 1_790_000_000_000;
const DASAR = {
  orang: () => ({id: id16(), jenis: "pegawai", nama: "Budi Santoso", status: "aktif", wajah_status: "belum", dibuat: T, diubah: T, dummy: 0}),
  orang_setuju: () => ({id: id16(), orang_id: ORANG, versi_teks: "2026-11-01", setuju: 1, waktu: T}),
  orang_wajah: () => ({orang_id: ORANG, arah: "depan", vektor: "AACAPw==", versi: "human-3.3", mutu: 0.9, dibuat: T}),
  wa_antre: () => ({id: id16(), tujuan: "6281234567890", pesan: "halo", jenis: "tautan", status: "antre", percobaan: 0, dibuat: T, dummy: 0}),
};
let ORANG;
function masuk(tabel, u = {}) {
  const b = {...DASAR[tabel](), ...u}, k = Object.keys(b);
  db.prepare(`INSERT INTO ${tabel} (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => b[x]));
  return b;
}
const sp = f => { db.exec("SAVEPOINT s"); try { return f(); } finally { db.exec("ROLLBACK TO s"); db.exec("RELEASE s"); } };
const tolak = (t, u, pola = /constraint failed/) => sp(() => assert.throws(() => masuk(t, u), pola, `${t} ${JSON.stringify(u)} DITERIMA`));
const lolos = (t, u) => sp(() => assert.doesNotThrow(() => masuk(t, u), `${t} ${JSON.stringify(u)} DITOLAK`));
ORANG = masuk("orang").id;

test("enum CHECK di D1 sama persis dengan konstanta JS", () => {
  assert.deepEqual(enumDi("orang", "jenis"), K.JENIS_ORANG);
  assert.deepEqual(enumDi("orang", "status"), K.STATUS_ORANG);
  assert.deepEqual(enumDi("orang", "wajah_status"), K.WAJAH_STATUS);
  assert.deepEqual(enumDi("orang_wajah", "arah"), K.ARAH);
  assert.deepEqual(enumDi("wa_antre", "status"), K.STATUS_WA_ANTRE);
});

test("nilai di luar enum ditolak, nilai enum lolos", () => {
  for (const [t, kol, daftar] of [["orang", "jenis", K.JENIS_ORANG], ["orang", "status", K.STATUS_ORANG], ["orang", "wajah_status", K.WAJAH_STATUS], ["wa_antre", "status", K.STATUS_WA_ANTRE]]) {
    tolak(t, {[kol]: "liar"}); tolak(t, {[kol]: null}); tolak(t, {[kol]: ""});
    for (const v of daftar) lolos(t, {[kol]: v});
  }
  tolak("orang_wajah", {arah: "serong"}); for (const a of K.ARAH) lolos("orang_wajah", {arah: a});
});

test("orang: batas isian (nip 18 digit, wa, email, prov, nama, kode_sha, dummy)", () => {
  tolak("orang", {nip: "12345"}); tolak("orang", {nip: "19800101200501100A"}); tolak("orang", {nip: "1980010120050110011"}); lolos("orang", {nip: "198001012005011001"});
  tolak("orang", {nama: "A"}); tolak("orang", {nama: "a".repeat(121)}); lolos("orang", {nama: "a".repeat(120)});
  tolak("orang", {wa: "0812345"}); tolak("orang", {wa: "62812abc4567"}); lolos("orang", {wa: "6281234567890"});
  tolak("orang", {email: "bukan-email"}); lolos("orang", {email: "a@b.id"});
  tolak("orang", {prov: "6"}); tolak("orang", {prov: "6a"}); lolos("orang", {prov: "62"});
  tolak("orang", {kode_sha: "abc"}); lolos("orang", {kode_sha: sha()});
  tolak("orang", {dummy: 2}); tolak("orang", {dibuat: null});
  tolak("orang", {unit: "u".repeat(121)}); tolak("orang", {kab: "k".repeat(61)});
});

test("orang: nip, kode_sha, staf_id, relawan_id unik; NULL boleh banyak", () => {
  masuk("orang", {nip: "198001012005011001", kode_sha: "a".repeat(64), staf_id: "1".repeat(16), relawan_id: "2".repeat(16)});
  tolak("orang", {nip: "198001012005011001"}, /UNIQUE/); tolak("orang", {kode_sha: "a".repeat(64)}, /UNIQUE/);
  tolak("orang", {staf_id: "1".repeat(16)}, /UNIQUE/); tolak("orang", {relawan_id: "2".repeat(16)}, /UNIQUE/);
  tolak("orang", {staf_id: "pendek"}); tolak("orang", {relawan_id: "pendek"});
  masuk("orang"); masuk("orang");   // tanpa nip/kode/staf/relawan: lolos berkali-kali
});

test("orang_setuju, orang_wajah, wa_antre: batas isian dan kunci", () => {
  tolak("orang_setuju", {setuju: 2}); tolak("orang_setuju", {versi_teks: ""}); tolak("orang_setuju", {ip_hash: "pendek"}); lolos("orang_setuju", {setuju: 0, ip_hash: sha()});
  tolak("orang_setuju", {orang_id: "f".repeat(16)}, /FOREIGN KEY/);
  tolak("orang_wajah", {vektor: "x"}); tolak("orang_wajah", {mutu: 1.5}); tolak("orang_wajah", {orang_id: "f".repeat(16)}, /FOREIGN KEY/);
  masuk("orang_wajah"); tolak("orang_wajah", {}, /UNIQUE/);
  tolak("wa_antre", {tujuan: "0812"}); tolak("wa_antre", {tujuan: "+6281234567890"}); tolak("wa_antre", {pesan: ""}); tolak("wa_antre", {jenis: ""}); tolak("wa_antre", {percobaan: -1}); tolak("wa_antre", {dummy: 2});
});

test("hapus orang ikut menghapus persetujuan dan vektor (cascade)", () => {
  const o = masuk("orang").id;
  masuk("orang_setuju", {orang_id: o}); masuk("orang_wajah", {orang_id: o});
  sp(() => { db.prepare("DELETE FROM orang WHERE id = ?").run(o);
    assert.equal(db.prepare("SELECT count(*) n FROM orang_setuju WHERE orang_id = ?").get(o).n, 0);
    assert.equal(db.prepare("SELECT count(*) n FROM orang_wajah WHERE orang_id = ?").get(o).n, 0); });
});

test("migrasi 0095 idempoten: dijalankan dua kali tidak gagal dan tidak mengubah data", () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0095_lapangan_orang.sql"), "utf8");
  const sebelum = db.prepare("SELECT count(*) n FROM orang").get().n;
  assert.doesNotThrow(() => { for (const s of pecah(sql)) db.exec(s); });
  assert.equal(db.prepare("SELECT count(*) n FROM orang").get().n, sebelum);
  assert.ok(!/ALTER TABLE|DROP /i.test(sql), "hanya CREATE ... IF NOT EXISTS");
  for (const s of pecah(sql)) assert.match(s, /IF NOT EXISTS/, s.slice(0, 60));
});
