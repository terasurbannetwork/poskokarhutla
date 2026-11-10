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

/* UJ-F3-01: sk_kaji (migrations/0122_sk_kaji.sql) */
const kaji = (o = {}) => {
  const r = {id: (++n).toString(16).padStart(16, "0"), kejadian_id: null, model: "gempa", versi: 1, status: "dihitung", masukan: '{"sumber":"usgs-shakemap"}', ringkas: '{"rentang":[22.1,353.8]}', hasil_r2: null, galat_kalibrasi: null,
    alasan_tarik: null, dihitung: T0, diubah: T0, oleh: "sistem:ingest", dummy: 0, ...o};
  const k = Object.keys(r);
  return db.prepare(`INSERT INTO sk_kaji (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).run(...k.map(x => r[x]));
};
uji("UJ-F3-01: sk_kaji: yakin terkunci estimasi-model (KA 9), rentang selalu larik dua, FK kejadian, batas panjang", () => {
  const a = kejadian();
  assert.equal(kaji({kejadian_id: a}).changes, 1);
  assert.equal(db.prepare("SELECT yakin FROM sk_kaji WHERE kejadian_id = ?").get(a).yakin, "estimasi-model", "bawaan");
  for (const yakin of ["resmi", "terverifikasi", "hipotesis", "menunggu", "asumsi-kebijakan"]) ditolak(() => kaji({kejadian_id: a, versi: 2, yakin}), `yakin ${yakin}`);
  for (const ringkas of ['{"rentang":[1]}', '{"rentang":[1,2,3]}', '{"rentang":5}', '{"korban":1}', "[1,2]", "bukan json", JSON.stringify({rentang: [1, 2], x: "y".repeat(1500)})]) ditolak(() => kaji({kejadian_id: a, versi: 2, ringkas}), `ringkas ${ringkas.slice(0, 30)}`);
  assert.equal(kaji({kejadian_id: a, versi: 2, status: "menunggu_data", ringkas: '{"rentang":null}'}).changes, 1, "menunggu_data boleh tanpa rentang");
  ditolak(() => kaji({kejadian_id: "KJ-2026-ZZZZZZZZ", versi: 3}), "FK kejadian");
  for (const [k, v] of [["model", "tsunami"], ["status", "final"], ["versi", 0], ["versi", 100], ["hasil_r2", "siklus/saji/lain/KJ-2026-AAAAAAAA.json"], ["masukan", "[]"], ["masukan", JSON.stringify({x: "y".repeat(800)})],
    ["galat_kalibrasi", "x"], ["galat_kalibrasi", JSON.stringify({x: "y".repeat(400)})], ["oleh", ""], ["dummy", 2], ["id", "ABCDEF0123456789"], ["id", "abc"]]) ditolak(() => kaji({kejadian_id: a, versi: 4, [k]: v}), `${k}=${String(v).slice(0, 20)}`);
  assert.equal(kaji({kejadian_id: a, versi: 5, hasil_r2: `siklus/saji/kaji/${a}.json`, galat_kalibrasi: '{"kalibrasi":3.06}', model: "banjir_jam1"}).changes, 1);
});
uji("UJ-F3-01: sk_kaji: ditarik wajib alasan_tarik dan sebaliknya; UNIQUE (kejadian, model, versi, dummy)", () => {
  const a = kejadian();
  ditolak(() => kaji({kejadian_id: a, status: "ditarik"}), "ditarik tanpa alasan");
  ditolak(() => kaji({kejadian_id: a, alasan_tarik: "salah hitung"}), "alasan tanpa ditarik");
  ditolak(() => kaji({kejadian_id: a, status: "ditarik", alasan_tarik: "x"}), "alasan 1 huruf");
  assert.equal(kaji({kejadian_id: a, status: "ditarik", alasan_tarik: "masukan USGS salah"}).changes, 1);
  ditolak(() => kaji({kejadian_id: a}), "versi kembar (kejadian, model, versi, dummy)");
  assert.equal(kaji({kejadian_id: a, dummy: 1}).changes, 1, "dummy memisahkan kunci unik");
  assert.equal(kaji({kejadian_id: a, model: "banjir_jam1"}).changes, 1, "model lain, versi sama sah");
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

/* ---------- G3 (migrations/0123_sk_pulih.sql): UJ-F4-01, UJ-F4-10, UJ-KP-07 (lapis database) ---------- */
const ID16 = () => (++n).toString(16).padStart(16, "0");
function ins(tabel, r) { const k = Object.keys(r); return db.prepare(`INSERT INTO ${tabel} (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).run(...k.map(x => r[x])); }
const jitupasna = (o = {}) => { const r = {id: ID16(), kejadian_id: o.kejadian_id ?? kejadian({fase: "tanggap"}), prov: "32", kab4: "3201", status: "dibuka", versi: 1, dibuat: T0, diubah: T0, oleh: "staf:ko", dummy: 0, ...o}; ins("sk_jitupasna", r); return r.id; };
const HITUNG = '{"yakin":"asumsi-kebijakan"}';
const baris = (jp, o = {}) => { const r = {id: ID16(), jitupasna_id: jp, jenis: "rusak", sektor: "perumahan", tingkat: "rb", unit: 3, dibuat: T0, oleh: "staf:ko", ...o}; ins("sk_jitupasna_baris", r); return r.id; };
const r3p = (jp, o = {}) => { const r = {id: ID16(), jitupasna_id: jp, kejadian_id: db.prepare("SELECT kejadian_id k FROM sk_jitupasna WHERE id = ?").get(jp).k, dibuat: T0, diubah: T0, oleh: "staf:ko", ...o}; ins("sk_r3p", r); return r.id; };
const final = (o = {}) => jitupasna({status: "final", hitung: HITUNG, ...o});

uji("UJ-F4-01: sk_jitupasna: status, panjang, kab4/prov, hitung JSON objek, status sesudah pengumpulan wajib berhitung, UNIQUE (kejadian, kab4, versi, dummy)", () => {
  const k = kejadian({fase: "tanggap"});
  for (const [c, v] of [["status", "selesai"], ["prov", "3"], ["kab4", "32"], ["versi", 0], ["versi", 100], ["tim_sk", ""], ["tim_sk", "x".repeat(121)], ["tahun_harga", 1999], ["hitung", "bukan json"], ["hitung", "[1]"], ["hitung", JSON.stringify({x: "y".repeat(3000)})], ["oleh", ""], ["dummy", 2], ["kaji_id", "xyz"]])
    ditolak(() => jitupasna({kejadian_id: k, [c]: v}), `${c}=${String(v).slice(0, 12)}`);
  ditolak(() => jitupasna({kejadian_id: k, status: "dihitung"}), "dihitung tanpa hitung (menunggu bukan 0)");
  ditolak(() => jitupasna({kejadian_id: "KJ-2026-ZZZZZZZZ"}), "FK kejadian");
  jitupasna({kejadian_id: k, versi: 2});
  ditolak(() => jitupasna({kejadian_id: k, versi: 2}), "versi kembar"); assert.ok(jitupasna({kejadian_id: k, versi: 2, dummy: 1}), "dummy memisahkan kunci unik");
});
uji("UJ-F4-01: sk_jitupasna_baris: jenis rusak wajib tingkat dan unit tanpa komponen/arus/bulan; rugi sebaliknya; UNIQUE (jitupasna, klien_id); rentang", () => {
  const jp = jitupasna();
  baris(jp, {klien_id: "klien-001"});
  ditolak(() => baris(jp, {klien_id: "klien-001"}), "klien_id kembar");
  baris(jp, {klien_id: null}); baris(jp, {klien_id: null});   // NULL tidak saling bentrok
  for (const o of [{tingkat: null}, {unit: null}, {tingkat: "berat"}, {unit: -1}, {unit: 10000001}, {komponen: "air_minum"}, {arus_rp: 1}, {bulan: 3}, {jenis: "lain"}, {sektor: "x"}, {klien_id: "pendek"}, {unit_asal: "lain"}, {asumsi: "x".repeat(301)}, {nilai_rp: -1}, {dummy: 2}])
    ditolak(() => baris(jp, o), JSON.stringify(o));
  const rugi = {jenis: "rugi", tingkat: null, unit: null, komponen: "air_minum", arus_rp: 2_000_000, bulan: 3};
  baris(jp, rugi);
  for (const o of [{komponen: null}, {arus_rp: null}, {bulan: null}, {tingkat: "rb"}, {unit: 1}, {bulan: 0}, {bulan: 121}, {arus_rp: -1}, {arus_rp: 100000000001}, {komponen: "x"}]) ditolak(() => baris(jp, {...rugi, ...o}), JSON.stringify(o));
  ditolak(() => baris("ffffffffffffffff"), "FK jitupasna");
});
uji("UJ-F4-01: sk_harga: rentang harga, tingkat, tahun, dokumen wajib 3 sampai 200 karakter, yakin hanya asumsi-kebijakan atau resmi, kab4 nasional NULL", () => {
  const h = (o = {}) => ins("sk_harga", {id: ID16(), sektor: "perumahan", tingkat: "rb", satuan: "unit", harga_rp: 100_000_000, tahun: 2026, dokumen: "HSBGN 2026", dibuat: T0, oleh: "staf:pd", ...o});
  h(); h({kab4: "3201", tingkat: "hancur"});
  for (const o of [{harga_rp: 0}, {harga_rp: 100000000001}, {tingkat: "berat"}, {tahun: 1999}, {tahun: 2101}, {dokumen: ""}, {dokumen: "ab"}, {dokumen: "x".repeat(201)}, {yakin: "terverifikasi"}, {yakin: "hipotesis"}, {kab4: "32"}, {satuan: ""}, {sektor: "x"}, {dummy: 2}])
    ditolak(() => h(o), JSON.stringify(o).slice(0, 40));
  assert.equal(db.prepare("SELECT yakin FROM sk_harga LIMIT 1").get().yakin, "asumsi-kebijakan", "bawaan asumsi-kebijakan (U4)");
});
uji("UJ-F4-01: sk_jitupasna_final menolak ubah Jitupasna final dan tambah/ubah/hapus barisnya; Jitupasna lain dan baris dummy tetap bisa", () => {
  const jp = jitupasna({status: "ditinjau", hitung: HITUNG}), b = baris(jp);
  db.prepare("UPDATE sk_jitupasna SET status = 'final' WHERE id = ?").run(jp);
  ditolak(() => db.prepare("UPDATE sk_jitupasna SET tim_sk = 'X' WHERE id = ?").run(jp), "ubah Jitupasna final", /sk_jitupasna_final/);
  ditolak(() => db.prepare("UPDATE sk_jitupasna SET status = 'ditinjau' WHERE id = ?").run(jp), "mundur dari final", /sk_jitupasna_final/);
  ditolak(() => baris(jp), "tambah baris", /sk_jitupasna_final/);
  ditolak(() => db.prepare("UPDATE sk_jitupasna_baris SET unit = 9 WHERE id = ?").run(b), "ubah baris", /sk_jitupasna_final/);
  ditolak(() => db.prepare("DELETE FROM sk_jitupasna_baris WHERE id = ?").run(b), "hapus baris", /sk_jitupasna_final/);
  const lain = jitupasna({kab4: "3202"}); baris(lain); db.prepare("UPDATE sk_jitupasna_baris SET unit = 9 WHERE jitupasna_id = ?").run(lain);
  const dum = jitupasna({status: "final", hitung: HITUNG, dummy: 1, kab4: "3203"}); assert.equal(db.prepare("SELECT count(*) n FROM sk_jitupasna WHERE id = ?").get(dum).n, 1);
});
uji("UJ-F4-01 dan UJ-KP-07: sk_r3p: R3P baru hanya draf dan hanya dari Jitupasna final; disetujui_* terisi hanya dari disetujui_pm ke atas; ditetapkan_resmi wajib nomor dan tanggal keputusan", () => {
  ditolak(() => r3p(jitupasna()), "Jitupasna belum final", /sk_r3p_status/);
  ditolak(() => r3p(final(), {status: "diusulkan"}), "R3P baru bukan draf", /sk_r3p_status/);
  const jp = final(), id = r3p(jp);
  assert.equal(db.prepare("SELECT status FROM sk_r3p WHERE id = ?").get(id).status, "draf");
  ditolak(() => db.prepare("UPDATE sk_r3p SET disetujui_oleh = 'staf:pm', disetujui_pada = 1 WHERE id = ?").run(id), "setuju pada draf (bukan diusulkan)", /sk_r3p_setuju|constraint/);
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'disetujui_pm' WHERE id = ?").run(id), "lompat draf ke disetujui_pm", /sk_r3p_status/);
  db.prepare("UPDATE sk_r3p SET status = 'diusulkan' WHERE id = ?").run(id);
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'disetujui_pm' WHERE id = ?").run(id), "status disetujui_pm tanpa disetujui_oleh");
  ditolak(() => db.prepare("UPDATE sk_r3p SET disetujui_oleh = 'staf:pm', disetujui_pada = 1 WHERE id = ?").run(id), "disetujui_oleh terisi tanpa status disetujui_pm");
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'disetujui_pm', disetujui_oleh = 'admin:kuat', disetujui_pada = 1 WHERE id = ?").run(id), "bukan staf:<id>", /sk_r3p_setuju/);
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'disetujui_pm', disetujui_oleh = 'staf:ko', disetujui_pada = 1 WHERE id = ?").run(id), "pembuat draf menyetujui sendiri (UJ-KP-07)", /sk_r3p_setuju/);
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'disetujui_pm', disetujui_oleh = 'staf:pm' WHERE id = ?").run(id), "disetujui_pada kosong");
  db.prepare("UPDATE sk_r3p SET status = 'disetujui_pm', disetujui_oleh = 'staf:pm', disetujui_pada = 5 WHERE id = ?").run(id);
  ditolak(() => db.prepare("UPDATE sk_r3p SET disetujui_oleh = 'staf:lain' WHERE id = ?").run(id), "ganti pemberi tanda setuju", /sk_r3p_setuju/);
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'ditetapkan_resmi' WHERE id = ?").run(id), "ditetapkan_resmi tanpa nomor dan tanggal");
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'ditetapkan_resmi', no_keputusan = 'SK/1' WHERE id = ?").run(id), "tanpa tanggal keputusan");
  ditolak(() => db.prepare("UPDATE sk_r3p SET status = 'ditetapkan_resmi', no_keputusan = 'SK/1', tgl_keputusan = '5-9-2026' WHERE id = ?").run(id), "tanggal salah format");
  db.prepare("UPDATE sk_r3p SET status = 'ditetapkan_resmi', no_keputusan = 'SK/1', tgl_keputusan = '2026-09-05' WHERE id = ?").run(id);
  for (const ke of ["draf", "diusulkan", "disetujui_pm", "selesai"]) ditolak(() => db.prepare("UPDATE sk_r3p SET status = ? WHERE id = ?").run(ke, id), `mundur atau lompat ke ${ke}`, /sk_r3p_status|constraint/);
  db.prepare("UPDATE sk_r3p SET status = 'berjalan' WHERE id = ?").run(id); db.prepare("UPDATE sk_r3p SET status = 'selesai' WHERE id = ?").run(id);
  ditolak(() => r3p(jp, {versi: 1}), "UNIQUE (jitupasna, versi, dummy)"); assert.ok(r3p(jp, {versi: 2}), "versi 2 sah");
});
uji("UJ-F4-01: sk_r3p_kegiatan: tautan berpasangan, status, sektor tanpa daftar di DB; nilai R3P yang ditetapkan tidak berubah (sk_r3p_beku, sk_r3pk_beku)", () => {
  const id = r3p(final()), k = (o = {}) => { const r = {id: ID16(), r3p_id: id, sektor: "permukiman", nama: "Hunian tetap", dibuat: T0, diubah: T0, oleh: "staf:ko", ...o}; ins("sk_r3p_kegiatan", r); return r.id; };
  const a = k({nilai_rp: 500, tautan_jenis: "pemulihan", tautan_id: "0123456789abcdef"}); k({status: "macet"});
  for (const o of [{tautan_jenis: "pemulihan"}, {tautan_id: "x"}, {tautan_jenis: "lain", tautan_id: "x"}, {status: "ditunda"}, {nama: "ab"}, {target: -1}, {nilai_rp: -1}, {satuan: ""}, {dummy: 2}]) ditolak(() => k(o), JSON.stringify(o));
  ditolak(() => k({r3p_id: "ffffffffffffffff"}), "FK r3p");
  db.prepare("UPDATE sk_r3p_kegiatan SET nilai_rp = 900 WHERE id = ?").run(a);   // masih draf: boleh
  db.prepare("UPDATE sk_r3p SET status = 'diusulkan' WHERE id = ?").run(id);
  db.prepare("UPDATE sk_r3p SET total_rp = 900, status = 'disetujui_pm', disetujui_oleh = 'staf:pm', disetujui_pada = 1 WHERE id = ?").run(id);
  db.prepare("UPDATE sk_r3p SET status = 'ditetapkan_resmi', no_keputusan = 'SK/1', tgl_keputusan = '2026-09-05' WHERE id = ?").run(id);
  ditolak(() => db.prepare("UPDATE sk_r3p SET total_rp = 1 WHERE id = ?").run(id), "total_rp berubah sesudah ditetapkan", /sk_r3p_beku/);
  ditolak(() => db.prepare("UPDATE sk_r3p_kegiatan SET nilai_rp = 1 WHERE id = ?").run(a), "nilai kegiatan berubah sesudah ditetapkan", /sk_r3p_beku/);
  db.prepare("UPDATE sk_r3p_kegiatan SET status = 'berjalan' WHERE id = ?").run(a);   // status kegiatan boleh bergerak
});
uji("UJ-F4-10: tidak ada tabel rumah rusak kedua; kolom G3 tanpa nama, NIK, KK, KTP, koordinat, foto, pelapor", () => {
  const tabel = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'sk\\_%' ESCAPE '\\'").all().map(r => r.name);
  for (const t of ["sk_harga", "sk_jitupasna", "sk_jitupasna_baris", "sk_r3p", "sk_r3p_kegiatan"]) assert.ok(tabel.includes(t), t);
  assert.deepEqual(tabel.filter(t => /rumah|rusak|pengungsi/.test(t)), [], "tidak ada tabel rumah rusak atau pengungsi kedua");
  for (const t of ["sk_harga", "sk_jitupasna", "sk_jitupasna_baris", "sk_r3p", "sk_r3p_kegiatan"])
    for (const kol of db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map(r => r.name)) {
      if (t === "sk_r3p_kegiatan" && kol === "nama") continue;   // nama kegiatan, bukan nama orang
      assert.doesNotMatch(kol, /nama$|^nama_|nik|^kk$|ktp|^lat$|^lon$|lat_|lon_|koordinat|foto|pelapor|alamat|wa$|telp/i, `${t}.${kol}`);
    }
  const sql = readFileSync(path.join(AKAR, "migrations/0123_sk_pulih.sql"), "utf8");
  assert.doesNotMatch(sql.replace(/^--.*$/gm, ""), /INSERT OR IGNORE|ALTER TABLE|DROP |meja_\w+\s*\(/i, "migrasi hanya CREATE IF NOT EXISTS dan tidak menyentuh meja_*");
  assert.ok((sql.match(/CREATE (TABLE|INDEX|TRIGGER) /g) ?? []).length === (sql.match(/CREATE (TABLE|INDEX|TRIGGER) IF NOT EXISTS /g) ?? []).length, "semua CREATE idempoten");
});
