/* Siklus Bencana G1: CHECK, trigger, unik, dan FK tabel sk_* (migrations/0120_sk_kejadian.sql) dijalankan apa adanya di SQLite sungguhan.
   UJ-F1-01, 02, 03 dan UJ-G0-13 (RENCANA-UJI). Tiap nilai salah harus DITOLAK database. Jalankan: node --test tests/warga/siklus_skema.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {existsSync, readFileSync} from "node:fs";
import path from "node:path";
import {migrasi, pecah, AKAR} from "./_bantu.mjs";

const SQL_SK = readFileSync(path.join(AKAR, "migrations/0120_sk_kejadian.sql"), "utf8");
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(migrasi());

let rusak = null;
const uji = (nama, fn) => test(nama, () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  db.exec("BEGIN");
  try { fn(); } catch (e) { rusak = nama; throw e; } finally { db.exec("ROLLBACK"); }
});
const ditolak = (fn, sebab, pola = /constraint|sk_fase|sk_publik|FOREIGN KEY/i) => assert.throws(fn, pola, `harus DITOLAK database: ${sebab}`);

const T0 = 1_760_000_000_000;
let n = 0;
const ALFABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KJ = () => { let v = ++n, k = ""; for (let i = 0; i < 8; i++, v = Math.floor(v / 32)) k = ALFABET[v % 32] + k; return "KJ-2026-" + k; };
function kejadian(o = {}) {
  const r = {id: KJ(), jenis: "banjir", nama: "Banjir uji", prov: "32", kab4: "3201", mulai: "2026-03-02", akhir: null, pusat_lat: -6.5, pusat_lon: 106.8, fase: "terdeteksi", fase_diubah: T0, ke: null,
    tanggap_mulai: null, tanggap_akhir: null, nomor_induk: null, asal: "manual", arsip_tahun: null, publik: 0, ringkasan_publik: null, yakin: "terverifikasi", dibuat: T0, diubah: T0, oleh: "staf:uji", dummy: 0, ...o};
  const k = Object.keys(r);
  db.prepare(`INSERT INTO sk_kejadian (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).run(...k.map(x => r[x]));
  return r.id;
}
const sumber = (o = {}) => {
  const r = {id: (++n).toString(16).padStart(16, "0"), sumber: "dibi", kode: "banjir|3201|2026-03-02", kode_hari: null, pengenal_luar: null, kejadian_id: null, asal_id: null, status: "tanpa_wilayah",
    jenis: "banjir", kab4: null, mulai: "2026-03-02", kandidat: null, dampak: null, diambil: T0, dibuat: T0, diubah: T0, dummy: 0, ...o};
  const k = Object.keys(r);
  return db.prepare(`INSERT INTO sk_kejadian_sumber (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")}) ON CONFLICT (sumber, kode, dummy) DO NOTHING`).run(...k.map(x => r[x]));
};

uji("UJ-F1-01: id KJ- hanya 16 karakter, 4 digit tahun, alfabet Crockford (tanpa I, L, O, U, huruf kecil)", () => {
  kejadian({id: "KJ-2026-9A2WGN3G"});
  for (const salah of ["KJ-2026-9A2WGN3", "KJ-2026-9A2WGN3GX", "KJ-26-9A2WGN3GXX", "kj-2026-9A2WGN3G", "KJ-2026-9A2WGN3I", "KJ-2026-9A2WGN3L", "KJ-2026-9A2WGN3O", "KJ-2026-9A2WGN3U", "KJ-2026-9a2wgn3g", "XX-2026-9A2WGN3G", "KJ-20X6-9A2WGN3G", "2026-KJ-9A2WGN3G"])
    ditolak(() => kejadian({id: salah}), `id ${salah}`);
});

uji("UJ-F1-01: rentang koordinat, tanggal, kab4, prov, fase, asal, yakin, panjang teks", () => {
  for (const [k, v] of [["pusat_lat", 7], ["pusat_lat", -12], ["pusat_lon", 93], ["pusat_lon", 143], ["mulai", "2026-3-2"], ["mulai", "02-03-2026"], ["akhir", "besok"], ["kab4", "320"], ["kab4", "32a1"], ["prov", "3"], ["prov", "ab"],
    ["fase", "selesai-ya"], ["asal", "lain"], ["yakin", "pasti"], ["nama", "ab"], ["nama", "x".repeat(161)], ["jenis", "ab"], ["jenis", "x".repeat(25)], ["publik", 2], ["dummy", 2], ["arsip_tahun", 2010], ["ringkasan_publik", "x".repeat(601)], ["oleh", ""]])
    ditolak(() => kejadian({[k]: v}), `${k}=${v}`);
  kejadian({kab4: null, prov: null, pusat_lat: null, pusat_lon: null});   // wilayah belum terpetakan sah
});

uji("UJ-F1-01: fase digabung hanya bersama ke; publik hanya dengan ringkasan dan fase yang boleh", () => {
  const a = kejadian();
  ditolak(() => kejadian({fase: "digabung", ke: null}), "digabung tanpa ke");
  ditolak(() => kejadian({fase: "terdeteksi", ke: a}), "ke tanpa digabung");
  kejadian({fase: "digabung", ke: a});
  ditolak(() => kejadian({publik: 1, ringkasan_publik: null, fase: "tanggap"}), "publik tanpa ringkasan");
  ditolak(() => kejadian({publik: 1, ringkasan_publik: "Banjir di kabupaten.", fase: "terdeteksi"}), "publik pada terdeteksi");
  ditolak(() => kejadian({publik: 1, ringkasan_publik: "Banjir di kabupaten.", fase: "dibatalkan"}), "publik pada dibatalkan");
  kejadian({publik: 1, ringkasan_publik: "Banjir di kabupaten.", fase: "tanggap"});
});

uji("UJ-F1-01: sk_kejadian_kab dan alias: format id, FK, kab4 4 digit", () => {
  const a = kejadian();
  db.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '3201', '2026-03-02', ?)").run(a, T0);
  ditolak(() => db.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '3201', '2026-03-02', ?)").run(a, T0), "pasangan ganda");
  ditolak(() => db.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '320', '2026-03-02', ?)").run(a, T0), "kab4 pendek");
  ditolak(() => db.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES ('KJ-2026-ZZZZZZZZ', '3202', '2026-03-02', ?)").run(T0), "kejadian tak ada (FK)");
  ditolak(() => db.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES ('abc', '3202', '2026-03-02', ?)").run(T0), "format id");
  ditolak(() => db.prepare("INSERT INTO sk_kejadian_alias (alias_id, ke_id, alasan, dibuat, oleh) VALUES ('KJ-2026-ZZZZZZZZ', 'KJ-2026-YYYYYYYY', 'gabung uji', ?, 'x')").run(T0), "alias ke kejadian tak ada");
  db.prepare("INSERT INTO sk_kejadian_alias (alias_id, ke_id, alasan, dibuat, oleh) VALUES ('KJ-2026-ZZZZZZZZ', ?, 'gabung uji', ?, 'x')").run(a, T0);
  ditolak(() => db.prepare("INSERT INTO sk_kejadian_alias (alias_id, ke_id, alasan, dibuat, oleh) VALUES ('KJ-2026-YYYYYYYY', ?, 'x', ?, 'x')").run(a, T0), "alasan terlalu pendek");
});

uji("UJ-F1-01: dummy ada di semua tabel sk_*", () => {
  const tabel = [...SQL_SK.matchAll(/CREATE TABLE IF NOT EXISTS (sk_\w+)/g)].map(m => m[1]);
  assert.deepEqual(tabel.sort(), ["sk_jejak", "sk_kejadian", "sk_kejadian_alias", "sk_kejadian_kab", "sk_kejadian_sumber"]);
  for (const t of tabel) assert.ok(db.prepare(`PRAGMA table_info(${t})`).all().some(c => c.name === "dummy" && c.notnull === 1 && c.dflt_value === "0"), `${t} tanpa kolom dummy NOT NULL DEFAULT 0`);
});

uji("UJ-F1-01: migrasi dua kali tanpa galat dan tanpa mengubah isi (idempoten)", () => {
  const a = kejadian();
  const sebelum = db.prepare("SELECT count(*) n FROM sqlite_master").get().n;
  db.exec(SQL_SK);
  db.exec(SQL_SK);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master").get().n, sebelum);
  assert.equal(db.prepare("SELECT id FROM sk_kejadian WHERE id = ?").get(a).id, a);
  assert.ok(!/INSERT OR IGNORE/i.test(SQL_SK) && !/\bALTER\b/i.test(SQL_SK), "hanya IF NOT EXISTS / ON CONFLICT, tanpa ALTER");
});

/* pasangan sah ALUR 2.1 */
const URUT = ["terdeteksi", "terverifikasi", "tanggap", "transisi", "pemulihan", "selesai"];
const SAH = new Set();
URUT.forEach((f, i) => { if (URUT[i + 1]) { SAH.add(f + ">" + URUT[i + 1]); SAH.add(URUT[i + 1] + ">" + f); } SAH.add(f + ">digabung"); });
SAH.add("terdeteksi>dibatalkan");
const SEMUA = [...URUT, "dibatalkan", "digabung"];

uji("UJ-F1-02: trigger sk_kejadian_fase menolak semua pasangan selain maju/mundur satu langkah, dibatalkan dari terdeteksi, digabung", () => {
  const ke = kejadian({id: "KJ-2026-00000000"});
  let sah = 0, tolak = 0;
  for (const dari of SEMUA) for (const ke_ of SEMUA) {
    if (dari === ke_) continue;
    const id = kejadian({fase: dari, ke: dari === "digabung" ? ke : null, publik: 0});
    const set = ke_ === "digabung" ? "fase = ?, ke = ?" : "fase = ?";
    const arg = ke_ === "digabung" ? [ke_, ke, id] : [ke_, id];
    const run = () => db.prepare(`UPDATE sk_kejadian SET ${set} WHERE id = ?`).run(...arg);
    if (SAH.has(dari + ">" + ke_)) { run(); sah++; assert.equal(db.prepare("SELECT fase FROM sk_kejadian WHERE id = ?").get(id).fase, ke_); }
    else { assert.throws(run, dari === "digabung" || ke_ !== "digabung" ? /sk_fase/ : /sk_fase|constraint/i, `${dari} > ${ke_} harus ditolak`); tolak++; }
  }
  assert.equal(sah, 17, "17 pasangan sah (5 maju + 5 mundur + 6 digabung + 1 dibatalkan)");
  assert.equal(tolak, 56 - 17 - 0);
});

uji("UJ-F1-02: lompat terdeteksi ke pemulihan ditolak dengan sk_fase:; langkah sah lolos; digabung dan dibatalkan tidak pernah keluar", () => {
  const a = kejadian();
  assert.throws(() => db.prepare("UPDATE sk_kejadian SET fase = 'pemulihan' WHERE id = ?").run(a), /sk_fase:/);
  db.prepare("UPDATE sk_kejadian SET fase = 'terverifikasi' WHERE id = ?").run(a);
  const b = kejadian({fase: "dibatalkan"});
  assert.throws(() => db.prepare("UPDATE sk_kejadian SET fase = 'terdeteksi' WHERE id = ?").run(b), /sk_fase:/);
  const c = kejadian({fase: "digabung", ke: a});
  assert.throws(() => db.prepare("UPDATE sk_kejadian SET fase = 'terverifikasi', ke = NULL WHERE id = ?").run(c), /sk_fase:/);
});

uji("UJ-F1-02: sk_kejadian_publik menolak publik = 1 saat dibatalkan atau digabung (INSERT dan UPDATE), pesan sk_publik", () => {
  const a = kejadian({fase: "tanggap"});
  assert.throws(() => kejadian({fase: "dibatalkan", publik: 1, ringkasan_publik: "Ringkasan uji."}), /sk_publik:/);
  assert.throws(() => kejadian({fase: "digabung", ke: a, publik: 1, ringkasan_publik: "Ringkasan uji."}), /sk_publik:/);
  const b = kejadian({fase: "terdeteksi"});
  assert.throws(() => db.prepare("UPDATE sk_kejadian SET fase = 'dibatalkan', publik = 1, ringkasan_publik = 'Ringkasan uji.' WHERE id = ?").run(b), /sk_publik:|sk_fase|constraint/i);
  db.prepare("UPDATE sk_kejadian SET publik = 1, ringkasan_publik = 'Ringkasan uji.' WHERE id = ?").run(a);   // tanggap boleh
  assert.throws(() => db.prepare("UPDATE sk_kejadian SET fase = 'digabung', ke = ? WHERE id = ?").run(b, a), /sk_publik:/, "digabung sambil publik tetap 1");
  db.prepare("UPDATE sk_kejadian SET fase = 'digabung', ke = ?, publik = 0 WHERE id = ?").run(b, a);   // rute menurunkan publik dalam pernyataan yang sama
});

uji("UJ-F1-03: UNIQUE (sumber, kode, dummy): kiriman kedua tidak menimpa; dummy terpisah; terpasang butuh kejadian_id", () => {
  const a = kejadian();
  assert.equal(sumber({kode: "k1", dampak: '{"meninggal":{"n":2}}'}).changes, 1);
  assert.equal(sumber({kode: "k1", dampak: '{"meninggal":{"n":99}}'}).changes, 0, "baris kedua DO NOTHING");
  assert.match(db.prepare("SELECT dampak FROM sk_kejadian_sumber WHERE kode = 'k1'").get().dampak, /"n":2/);
  assert.equal(sumber({kode: "k1", dummy: 1}).changes, 1, "dummy = 1 kunci terpisah");
  assert.equal(sumber({kode: "k1", sumber: "logbook"}).changes, 1, "sumber lain, kode sama");
  assert.throws(() => db.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, mulai, diambil, dibuat, diubah) VALUES ('aaaaaaaaaaaaaaaa', 'dibi', 'k1', 'tanpa_wilayah', 'banjir', '2026-03-02', 1, 1, 1)").run(), /UNIQUE/);
  ditolak(() => sumber({kode: "t1", status: "terpasang", kejadian_id: null}), "terpasang tanpa kejadian_id");
  ditolak(() => sumber({kode: "t2", status: "ambigu", kejadian_id: a}), "kejadian_id pada non-terpasang");
  ditolak(() => sumber({kode: "t3", status: "lain"}), "status tak dikenal");
  ditolak(() => sumber({kode: "t4", kandidat: "bukan json"}), "kandidat bukan JSON");
  ditolak(() => sumber({kode: "t5", dampak: JSON.stringify({x: "y".repeat(2000)})}), "dampak > 2000");
  ditolak(() => sumber({kode: "t6", status: "terpasang", kejadian_id: "KJ-2026-ZZZZZZZZ"}), "FK kejadian");
  assert.equal(sumber({kode: "t7", status: "terpasang", kejadian_id: a, asal_id: "KJ-2026-AAAAAAAA"}).changes, 1);
});

uji("sk_jejak: panjang kolom dan catatan <= 200", () => {
  const ins = (o = {}) => { const r = {waktu: T0, oleh: "staf:x", obyek: "kejadian", obyek_id: "KJ-2026-AAAAAAAA", aksi: "fase", dari: null, ke: null, catatan: null, dummy: 0, ...o}; const k = Object.keys(r);
    return db.prepare(`INSERT INTO sk_jejak (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).run(...k.map(x => r[x])); };
  ins(); ins({catatan: "x".repeat(200)});
  ditolak(() => ins({catatan: "x".repeat(201)}), "catatan 201");
  ditolak(() => ins({oleh: ""}), "oleh kosong");
  ditolak(() => ins({aksi: "x"}), "aksi 1 huruf");
});

/* UJ-G0-13: rollback.sql memuat DROP urut terbalik semua tabel sk_* (dibuat tiket SK-013); jalan mengosongkan skema */
const ROLLBACK = path.join(AKAR, "scripts/siklus/rollback.sql");
test("UJ-G0-13: tiap tabel migrasi ada di rollback.sql dan skrip itu mengosongkan skema sk_*", {skip: existsSync(ROLLBACK) ? false : "scripts/siklus/rollback.sql belum ada (tiket SK-013 siklus): uji ini berjalan otomatis begitu berkasnya ada"}, () => {
  const rb = readFileSync(ROLLBACK, "utf8"), tabel = [...SQL_SK.matchAll(/CREATE TABLE IF NOT EXISTS (sk_\w+)/g)].map(m => m[1]);
  for (const t of tabel) assert.match(rb, new RegExp(`DROP TABLE IF EXISTS ${t}\\b`), `${t} tidak ada di rollback.sql`);
  const urut = tabel.map(t => rb.search(new RegExp(`DROP TABLE IF EXISTS ${t}\\b`)));
  assert.ok(urut.indexOf(Math.min(...urut)) !== tabel.indexOf("sk_kejadian"), "anak harus di-DROP sebelum sk_kejadian (urut terbalik)");
  const d2 = new DatabaseSync(":memory:"); d2.exec("PRAGMA foreign_keys = ON;"); d2.exec(migrasi());
  d2.exec(rb);
  assert.deepEqual(d2.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'sk\\_%' ESCAPE '\\'").all(), [], "skema sk_* harus kosong sesudah rollback");
});
