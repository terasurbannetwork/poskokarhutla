/* EW-03 / U4 (data/kajian-bnpb/ews/RENCANA-UJI.md): migrasi 0176 menambah jenis 'geofon' di sensor_alat. Dijalankan dua kali tanpa galat,
   baris alat lama utuh, FK sensor_baca dan sensor_lapor tetap menunjuk sensor_alat (bukan tabel sementara) dan masih ditegakkan.
   D1 lokal sungguhan (Miniflare, FK menyala seperti D1 produksi) + SQLite node dengan PRAGMA foreign_keys = ON sebagai pembanding.
   Jalankan: node --test tests/warga/alat_migrasi.test.mjs */
import {test as uji, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync, readdirSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {Miniflare} from "miniflare";
import {AKAR, pecah} from "./_bantu.mjs";

const DIR = path.join(AKAR, "migrations"), BARU = "0176_sensor_geofon.sql";
const sql = f => readFileSync(path.join(DIR, f), "utf8");
const sebelum = readdirSync(DIR).filter(f => /^\d{4}_.*\.sql$/.test(f) && f < BARU).sort().map(sql).join("\n");
const FP = "0123456789abcdef";
const SEMAI = [
  `INSERT INTO sensor_alat (id, jenis, kab, desa, lat, lon, ambang, kunci_hash, aktif, dibuat) VALUES ('TMA-01', 'tma', '33|Banjarnegara', 'Tulis', -7.3, 109.7, '{"tma_cm":{"waspada":100,"siaga":150,"awas":200}}', '${FP}', 1, 11)`,
  `INSERT INTO sensor_alat (id, jenis, kunci_hash, aktif, dibuat) VALUES ('GW-01', 'gateway', '${FP}', 0, 12)`,
  `INSERT INTO sensor_baca (alat_id, waktu, nilai, baterai, rssi, diterima) VALUES ('TMA-01', 1000, '{"tma_cm":42}', 88, -70, 1001)`,
  `INSERT INTO sensor_lapor (id, alat_id, waktu, pengirim_node, teks, diterima) VALUES ('aaaaaaaaaaaaaaaa', 'GW-01', 2000, 'node-1', 'jalan putus', 2001)`,
];
const ALAT = "SELECT id, jenis, kab, desa, lat, lon, ambang, kunci_hash, aktif, dibuat FROM sensor_alat ORDER BY id";
const ANAK = ["SELECT * FROM sensor_baca ORDER BY alat_id, waktu", "SELECT * FROM sensor_lapor ORDER BY id"];
const SEMENTARA = "SELECT count(*) n FROM sqlite_master WHERE name IN ('sensor_alat_baru', 'sensor_baca_cad', 'sensor_lapor_cad')";
const GEOFON = `INSERT INTO sensor_alat (id, jenis, kunci_hash, dibuat) VALUES ('GEO-IBU-01', 'geofon', '${FP}', 13)`;

const mf = new Miniflare({modules: true, script: "export default {fetch() { return new Response('') }}", compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-alat-migrasi"}});
after(() => mf.dispose());
const DB = await mf.getD1Database("DB");

uji("U4: migrasi geofon idempoten di D1; baris alat lama utuh, FK sensor_baca dan sensor_lapor terjaga", async () => {
  await DB.batch(pecah(sebelum).map(s => DB.prepare(s)));   // skema sampai 0175, seperti produksi sebelum 0176
  await assert.rejects(DB.prepare(GEOFON).run(), /CHECK/i, "sebelum 0176 geofon ditolak");
  for (const s of SEMAI) await DB.prepare(s).run();
  const lama = (await DB.prepare(ALAT).all()).results, anak = (await DB.batch(ANAK.map(q => DB.prepare(q)))).map(r => r.results);

  await DB.batch(pecah(sql(BARU)).map(s => DB.prepare(s)));   // batch = satu transaksi, seperti satu berkas migrasi
  await DB.batch(pecah(sql(BARU)).map(s => DB.prepare(s)));   // kedua kali: tanpa galat
  assert.deepEqual((await DB.prepare(ALAT).all()).results, lama, "isi sensor_alat utuh");
  assert.deepEqual((await DB.batch(ANAK.map(q => DB.prepare(q)))).map(r => r.results), anak, "isi sensor_baca dan sensor_lapor utuh");
  assert.equal(anak.flat().length, 2);
  assert.equal((await DB.prepare(SEMENTARA).first()).n, 0, "tabel sementara tidak tertinggal");
  for (const t of ["sensor_baca", "sensor_lapor"]) {
    const fk = (await DB.prepare(`SELECT "table" t FROM pragma_foreign_key_list('${t}')`).all()).results.map(r => r.t);
    assert.deepEqual(fk, ["sensor_alat"], `FK ${t} tetap ke sensor_alat`);
  }
  assert.deepEqual((await DB.prepare("SELECT * FROM pragma_foreign_key_check").all()).results, [], "tanpa pelanggaran FK");

  assert.equal((await DB.prepare(GEOFON).run()).meta.changes, 1, "geofon diterima");
  await assert.rejects(DB.prepare(`INSERT INTO sensor_alat (id, jenis, kunci_hash, dibuat) VALUES ('X-001', 'seismik', '${FP}', 1)`).run(), /CHECK/i, "jenis lain tetap ditolak");
  await assert.rejects(DB.prepare(`INSERT INTO sensor_alat (id, jenis, kunci_hash, dibuat) VALUES ('X-002', 'geofon', 'BUKANHEX', 1)`).run(), /CHECK/i, "CHECK lain terpasang ulang");
  await assert.rejects(DB.prepare("INSERT INTO sensor_baca (alat_id, waktu, nilai, diterima) VALUES ('TIDAK-ADA', 1, '{}', 1)").run(), /FOREIGN KEY/i, "FK anak masih ditegakkan");
  assert.equal((await DB.prepare("INSERT INTO sensor_baca (alat_id, waktu, nilai, diterima) VALUES ('GEO-IBU-01', 3000, '{\"pgv_mm_s\":0.4,\"hz\":5}', 3001)").run()).meta.changes, 1, "bacaan geofon tersimpan");
});

uji("U4 pembanding: SQLite dengan foreign_keys ON, migrasi dua kali, isi dan FK sama", () => {
  const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON;");
  for (const s of pecah(sebelum)) db.exec(s);
  for (const s of SEMAI) db.exec(s);
  const lama = db.prepare(ALAT).all(), anak = ANAK.map(q => db.prepare(q).all());
  for (let i = 0; i < 2; i++) { db.exec("BEGIN"); for (const s of pecah(sql(BARU))) db.exec(s); db.exec("COMMIT"); }
  assert.deepEqual(db.prepare(ALAT).all(), lama);
  assert.deepEqual(ANAK.map(q => db.prepare(q).all()), anak);
  assert.equal(db.prepare(SEMENTARA).get().n, 0);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  for (const t of ["sensor_baca", "sensor_lapor"]) assert.deepEqual(db.prepare(`SELECT "table" t FROM pragma_foreign_key_list('${t}')`).all().map(r => r.t), ["sensor_alat"]);
  assert.equal(db.prepare(GEOFON).run().changes, 1);
});

uji("U4 terputus: tiap titik putus lalu ulang penuh = isi utuh, atau galat keras dengan salinan utuh; tidak pernah hilang diam-diam", () => {
  const S = pecah(sql(BARU));
  const ada = (db, t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
  const isi = (db, q, t, cad) => { const r = ada(db, t) ? db.prepare(q).all() : []; return r.length || !ada(db, cad) ? r : db.prepare(q.replace(t, cad)).all(); };
  const BACA = ANAK[0], LAPOR = ANAK[1];
  for (let n = 1; n < S.length; n++) {
    const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON;");
    for (const s of pecah(sebelum)) db.exec(s);
    for (const s of SEMAI) db.exec(s);
    const lama = [db.prepare(ALAT).all(), db.prepare(BACA).all(), db.prepare(LAPOR).all()];
    for (const s of S.slice(0, n)) db.exec(s);   // penerapan terputus sesudah pernyataan ke-n (tanpa transaksi = kasus terburuk)
    let galat = null;
    try { db.exec("BEGIN"); for (const s of S) db.exec(s); db.exec("COMMIT"); } catch (e) { galat = e; db.exec("ROLLBACK"); }
    const kini = [isi(db, ALAT, "sensor_alat", "sensor_alat_baru"), isi(db, BACA, "sensor_baca", "sensor_baca_cad"), isi(db, LAPOR, "sensor_lapor", "sensor_lapor_cad")];
    assert.deepEqual(kini, lama, `putus sesudah pernyataan ${n}: ${galat ? "galat tetapi salinan tidak utuh" : "ulang tanpa galat tetapi isi berubah"}`);
    if (galat) assert.match(String(galat.message), /already exists/, `putus sesudah ${n}: galat harus keras dan jelas`);
  }
});
