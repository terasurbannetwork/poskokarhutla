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

/* ================================================================ tahap B (migrations/0097_lapangan_absen.sql): enum == konstanta, nilai liar DITOLAK, kembar sah LOLOS, unik, cascade, idempoten */
const TUGAS_ID = "7".repeat(16), LB_ID = "8".repeat(16);
Object.assign(DASAR, {
  lp_tugas: () => ({id: id16(), judul: "Patroli", bencana: "karhutla", lat: -0.05, lon: 116.4, radius_m: 2000, mulai: T, selesai: T + 86400e3, dibuat: T, dummy: 0}),
  lp_anggota: () => ({tugas_id: TUGAS_ID, orang_id: ORANG, peran: "anggota"}),
  lp_nonce: () => ({nonce_sha: sha(), orang_id: ORANG, tantangan: "kedip", kedaluwarsa: T, dipakai: 0, dibuat: T}),
  lp_absen: () => ({id: id16(), orang_id: ORANG, tugas_id: TUGAS_ID, jenis: "masuk", tanggal: "2026-11-02", waktu: T, lat: -0.05, lon: 116.4, foto_key: "lapangan/absen/x.jpg", foto_sha256: sha(), status: "lolos", alasan: "[]", dummy: 0}),
  lp_logbook: () => ({id: id16(), orang_id: ORANG, tugas_id: TUGAS_ID, tanggal: "2026-11-02", kegiatan: "Patroli", waktu: T, diubah: T}),
  lp_logbook_foto: () => ({id: id16(), logbook_id: LB_ID, foto_key: "lapangan/logbook/x.jpg", sha256: sha(), waktu: T}),
  lapangan_label: () => ({id: id16(), sumber_id: LB_ID, jenis: "api", nilai: "{}", lat: -0.05, lon: 116.4, waktu: T}),
});
const tbl = t => db.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(t).sql;
const enumKolom = (tabel, kolom) => { const m = tbl(tabel).match(new RegExp(`\\b${kolom}\\s+TEXT[^,]*?CHECK \\(${kolom} IN \\(([^)]*)\\)\\)`)); assert.ok(m, `${tabel}.${kolom}`); return [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]); };
masuk("lp_tugas", {id: TUGAS_ID}); masuk("lp_logbook", {id: LB_ID});

test("tahap B: enum CHECK di D1 sama persis dengan konstanta JS", () => {
  assert.deepEqual(enumKolom("lp_anggota", "peran"), K.PERAN_ANGGOTA); assert.deepEqual(enumKolom("lp_nonce", "tantangan"), K.TANTANGAN);
  assert.deepEqual(enumKolom("lp_absen", "jenis"), K.JENIS_ABSEN); assert.deepEqual(enumKolom("lp_absen", "status"), K.STATUS_ABSEN); assert.deepEqual(enumKolom("lapangan_label", "jenis"), K.JENIS_LABEL);
  assert.ok(K.ALASAN_TINJAU.length && K.ALASAN_TOLAK.length);
});

test("tahap B: nilai di luar enum ditolak, nilai enum lolos", () => {
  for (const [t, kol, daftar] of [["lp_anggota", "peran", K.PERAN_ANGGOTA], ["lp_nonce", "tantangan", K.TANTANGAN], ["lp_absen", "jenis", K.JENIS_ABSEN], ["lp_absen", "status", K.STATUS_ABSEN], ["lapangan_label", "jenis", K.JENIS_LABEL]]) {
    tolak(t, {[kol]: "liar"}); tolak(t, {[kol]: null}); for (const v of daftar) lolos(t, {[kol]: v, ...(t === "lp_absen" && kol === "jenis" ? {} : {})});
  }
});

test("tahap B: lp_tugas batas isian (titik Indonesia, radius, jendela waktu, renlap https)", () => {
  tolak("lp_tugas", {lat: 20}); tolak("lp_tugas", {lon: 10}); tolak("lp_tugas", {radius_m: 10}); tolak("lp_tugas", {radius_m: 60000}); tolak("lp_tugas", {selesai: T}); tolak("lp_tugas", {judul: "x"});
  tolak("lp_tugas", {bencana: "Banjir!"}); tolak("lp_tugas", {renlap_url: "http://x.id/renlap"}); lolos("lp_tugas", {renlap_url: "https://centurisk97.id/renlap/x"}); tolak("lp_tugas", {ketua_id: "pendek"});
});

test("tahap B: lp_absen batas isian dan unik (foto sha, satu masuk/pulang per orang-tugas-hari kecuali yang ditolak)", () => {
  tolak("lp_absen", {lat: 40}); tolak("lp_absen", {tanggal: "02-11-2026"}); tolak("lp_absen", {foto_sha256: "pendek"}); tolak("lp_absen", {alasan: "bukan json"}); tolak("lp_absen", {alasan: "{}"}); tolak("lp_absen", {skor_wajah: 2});
  tolak("lp_absen", {skor_hidup: 2}); tolak("lp_absen", {luring: 2}); tolak("lp_absen", {tugas_id: "f".repeat(16)}, /FOREIGN KEY/); tolak("lp_absen", {orang_id: "f".repeat(16)}, /FOREIGN KEY/);
  const a = masuk("lp_absen", {jenis: "pulang"});
  tolak("lp_absen", {foto_sha256: a.foto_sha256, jenis: "masuk"}, /UNIQUE/);
  tolak("lp_absen", {jenis: "pulang"}, /UNIQUE/); lolos("lp_absen", {jenis: "pulang", tanggal: "2026-11-03"});
  sp(() => { db.prepare("UPDATE lp_absen SET status = 'tolak' WHERE id = ?").run(a.id); assert.doesNotThrow(() => masuk("lp_absen", {jenis: "pulang"}), "yang ditolak boleh diulang"); });
});

test("tahap B: lp_logbook satu per orang-tugas-tanggal, label satu per logbook-jenis, foto sha unik, json divalidasi", () => {
  tolak("lp_logbook", {}, /UNIQUE/); lolos("lp_logbook", {tanggal: "2026-11-03"});
  tolak("lp_logbook", {tanggal: "2026-11-04", kegiatan: "x"}); tolak("lp_logbook", {tanggal: "2026-11-04", kendala: "bukan json"}); tolak("lp_logbook", {tanggal: "2026-11-04", kondisi: "[]"});
  tolak("lp_logbook", {tanggal: "2026-11-04", terkunci: 2}); tolak("lp_logbook", {tanggal: "2026-11-04", uraian: "u".repeat(2001)});
  const f = masuk("lp_logbook_foto"); tolak("lp_logbook_foto", {sha256: f.sha256}, /UNIQUE/); tolak("lp_logbook_foto", {logbook_id: "f".repeat(16)}, /FOREIGN KEY/); tolak("lp_logbook_foto", {lat: 50});
  masuk("lapangan_label"); tolak("lapangan_label", {}, /UNIQUE/); lolos("lapangan_label", {jenis: "banjir"}); tolak("lapangan_label", {nilai: "[]", jenis: "banjir"}); tolak("lapangan_label", {nilai: "x", jenis: "banjir"});
  tolak("lapangan_label", {lat: 40, jenis: "banjir"}); tolak("lapangan_label", {sumber_id: "pendek", jenis: "banjir"});
});

test("tahap B: hapus orang menghapus absen, logbook, nonce, anggota (cascade); hapus tugas menghapus anggota dan absennya", () => {
  const o = masuk("orang").id, t = masuk("lp_tugas").id;
  masuk("lp_anggota", {tugas_id: t, orang_id: o}); masuk("lp_nonce", {orang_id: o}); masuk("lp_absen", {orang_id: o, tugas_id: t}); const lb = masuk("lp_logbook", {orang_id: o, tugas_id: t});
  sp(() => { db.prepare("DELETE FROM orang WHERE id = ?").run(o);
    for (const x of ["lp_anggota", "lp_nonce", "lp_absen", "lp_logbook"]) assert.equal(db.prepare(`SELECT count(*) n FROM ${x} WHERE orang_id = ?`).get(o).n, 0, x); });
  /* ON DELETE RESTRICT (retensi 2 tahun, LP-049): tugas dengan absen atau logbook TIDAK bisa dihapus; bukti kehadiran tidak ikut hilang. Urutan: absen, logbook, lalu tugas. */
  sp(() => { const o2 = masuk("orang").id; masuk("lp_anggota", {tugas_id: t, orang_id: o2}); masuk("lp_absen", {orang_id: o2, tugas_id: t}); masuk("lp_logbook", {orang_id: o2, tugas_id: t});
    assert.throws(() => db.prepare("DELETE FROM lp_tugas WHERE id = ?").run(t), /FOREIGN KEY/, "tugas ber-absen tidak bisa dihapus");
    db.prepare("DELETE FROM lp_absen WHERE tugas_id = ?").run(t); assert.throws(() => db.prepare("DELETE FROM lp_tugas WHERE id = ?").run(t), /FOREIGN KEY/, "tugas ber-logbook tidak bisa dihapus");
    db.prepare("DELETE FROM lp_logbook WHERE tugas_id = ?").run(t); db.prepare("DELETE FROM lp_absen WHERE tugas_id = ?").run(t); db.prepare("DELETE FROM lp_tugas WHERE id = ?").run(t);
    assert.equal(db.prepare("SELECT count(*) n FROM lp_anggota WHERE tugas_id = ?").get(t).n, 0, "anggota ikut (CASCADE)"); });
  sp(() => { masuk("lp_logbook_foto", {logbook_id: lb.id}); db.prepare("DELETE FROM lp_logbook WHERE id = ?").run(lb.id); assert.equal(db.prepare("SELECT count(*) n FROM lp_logbook_foto WHERE logbook_id = ?").get(lb.id).n, 0); });
});

test("migrasi 0097 idempoten: dua kali tidak gagal dan tidak mengubah data; hanya CREATE ... IF NOT EXISTS", () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0097_lapangan_absen.sql"), "utf8");
  const sebelum = db.prepare("SELECT (SELECT count(*) FROM lp_absen) a, (SELECT count(*) FROM lp_tugas) t").get();
  assert.doesNotThrow(() => { for (const s of pecah(sql)) db.exec(s); });
  assert.deepEqual({...db.prepare("SELECT (SELECT count(*) FROM lp_absen) a, (SELECT count(*) FROM lp_tugas) t").get()}, {...sebelum});
  assert.ok(!/ALTER TABLE|DROP /i.test(sql));
  for (const s of pecah(sql)) assert.match(s, /IF NOT EXISTS/, s.slice(0, 60));
});

/* ================================================================ tahap C (migrations/0101_lapangan_panggil.sql) */
const TUGAS_C = id16(), PANGGIL = id16();
Object.assign(DASAR, {
  lp_panggil: () => ({id: id16(), tugas_id: TUGAS_C, keahlian: '["pemadaman"]', prov: "62", kuota: 3, batas: T + 3600e3, status: "buka", dibuat: T, dummy: 0}),
  lp_panggil_penerima: () => ({panggil_id: PANGGIL, relawan_id: id16(), kode_balas: "ABCDEF", status: "antre", waktu: T}),
  orang_keahlian: () => ({orang_id: ORANG, keahlian: "drone", dibuat: T}),
  lp_logbook_kit: () => ({logbook_id: LB_ID, kit_id: "pompa", jumlah: 1}),
});
masuk("lp_tugas", {id: TUGAS_C}); masuk("lp_panggil", {id: PANGGIL});

test("tahap C: enum CHECK panggilan sama persis dengan konstanta JS; nilai liar ditolak, nilai enum lolos", () => {
  assert.deepEqual(enumKolom("lp_panggil", "status"), K.STATUS_PANGGIL); assert.deepEqual(enumKolom("lp_panggil_penerima", "status"), K.STATUS_PENERIMA);
  for (const [t, kol, daftar] of [["lp_panggil", "status", K.STATUS_PANGGIL], ["lp_panggil_penerima", "status", K.STATUS_PENERIMA]]) {
    tolak(t, {[kol]: "liar"}); tolak(t, {[kol]: null}); for (const v of daftar) lolos(t, {[kol]: v, ...(t === "lp_panggil_penerima" ? {kode_balas: "ZZZZZZ"} : {})});
  }
});

test("tahap C: batas isian panggilan, penerima (kode 6 huruf besar unik), keahlian orang, kit logbook", () => {
  tolak("lp_panggil", {kuota: 0}); tolak("lp_panggil", {kuota: 101}); tolak("lp_panggil", {keahlian: "[]"}); tolak("lp_panggil", {keahlian: "bukan json"}); tolak("lp_panggil", {prov: "6"}); tolak("lp_panggil", {tugas_id: "f".repeat(16)}, /FOREIGN KEY/);
  masuk("lp_panggil_penerima"); tolak("lp_panggil_penerima", {}, /UNIQUE/);
  for (const k of ["abcdef", "ABCDE", "ABCDEFG", "ABC1EF"]) tolak("lp_panggil_penerima", {kode_balas: k});
  tolak("lp_panggil_penerima", {panggil_id: "f".repeat(16), kode_balas: "QQQQQQ"}, /FOREIGN KEY/);
  masuk("orang_keahlian"); tolak("orang_keahlian", {}, /UNIQUE/); tolak("orang_keahlian", {keahlian: "Drone"}); tolak("orang_keahlian", {keahlian: "x"}); tolak("orang_keahlian", {orang_id: "f".repeat(16), keahlian: "pompa"}, /FOREIGN KEY/); lolos("orang_keahlian", {keahlian: "pompa"});
  masuk("lp_logbook_kit"); tolak("lp_logbook_kit", {}, /UNIQUE/); tolak("lp_logbook_kit", {kit_id: "tandu", jumlah: 0}); tolak("lp_logbook_kit", {kit_id: ""}); tolak("lp_logbook_kit", {logbook_id: "f".repeat(16), kit_id: "tandu"}, /FOREIGN KEY/);
});

test("tahap C: hapus tugas menghapus panggilan dan penerimanya; hapus orang/logbook menghapus keahlian/kit (cascade)", () => {
  sp(() => { db.prepare("DELETE FROM lp_tugas WHERE id = ?").run(TUGAS_C); assert.equal(db.prepare("SELECT count(*) n FROM lp_panggil WHERE tugas_id = ?").get(TUGAS_C).n, 0); });
  const o = masuk("orang").id; masuk("orang_keahlian", {orang_id: o});
  sp(() => { db.prepare("DELETE FROM orang WHERE id = ?").run(o); assert.equal(db.prepare("SELECT count(*) n FROM orang_keahlian WHERE orang_id = ?").get(o).n, 0); });
  sp(() => { masuk("lp_logbook_kit", {kit_id: "selang"}); db.prepare("DELETE FROM lp_logbook WHERE id = ?").run(LB_ID); assert.equal(db.prepare("SELECT count(*) n FROM lp_logbook_kit WHERE logbook_id = ?").get(LB_ID).n, 0); });
});

test("migrasi 0101 idempoten: dua kali tidak gagal dan tidak mengubah data; hanya CREATE ... IF NOT EXISTS", () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0101_lapangan_panggil.sql"), "utf8");
  const n = () => ({...db.prepare("SELECT (SELECT count(*) FROM lp_panggil) a, (SELECT count(*) FROM orang_keahlian) b").get()}), sebelum = n();
  assert.doesNotThrow(() => { for (const s of pecah(sql)) db.exec(s); });
  assert.deepEqual(n(), sebelum);
  assert.ok(!/ALTER TABLE|DROP /i.test(sql));
  for (const s of pecah(sql)) assert.match(s, /IF NOT EXISTS/, s.slice(0, 60));
});
