/* Isi ulang data Operasi Udara dari ekspor WhatsApp grup satgas (mis. "KARHUTLA 6 PROVINSI"): pesan yang terkirim sebelum bot terpasang, atau saat gateway mati.
   Tiap pesan diputar lewat catatOperasi() yang SAMA dengan gerbang WA (src/operasi_udara.js), di atas SQLite memori yang dibangun dari semua migrasi,
   jadi aturan tanggal, pengurai, dedupe, dan penilaian tidak diduplikasi di sini. Keluaran: berkas SQL idempoten untuk D1:
   - op_temuan INSERT OR IGNORE (UNIQUE registrasi+tanggal+lat+lon), op_armada_status ON CONFLICT DO NOTHING (laporan bot di D1 menang),
   - op_gerak hanya bila belum ada (kunci tanggal+registrasi+jenis+jam_utc, sama dengan catatOperasi), op_gerak_hasil dipasang ke gerak itu bila belum ada.
   Isian manual menang (0126, K15): gerak tidak disisipkan bila ada penanda op_isian_kejadian aktif atau barisnya sudah dihapus manual; status dan hasil sudah DO NOTHING. SQL ini butuh migrasi 0126 di D1 tujuan.
   wa_id kosong (pesan tidak masuk wa_masuk; lampiran ekspor tidak diunggah). Nama kru dan nomor HP pengirim tidak dibaca.

   Pakai:  node scripts/operasi/isi_ulang_wa.mjs <keluar.sql> <ekspor1.txt> [ekspor2.txt ...]
   Lalu:   npx wrangler d1 execute poskowarga --local --file <keluar.sql>    (produksi: --remote, oleh pemilik)
   Format ekspor yang dikenali: Android "[8/21/26, 8:38:07 AM] Nama: teks" dan iOS "[01/11/26, 18.25.01] Nama: teks". Jam ekspor dianggap WIB. */
import {readFileSync, writeFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import path from "node:path";
import {fileURLToPath} from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
await import(path.join(AKAR, "src/worker.js"));   // worker dulu: modul saling impor
const {catatOperasi} = await import(path.join(AKAR, "src/operasi_udara.js"));
const {gerakHidup, kejadianGerak} = await import(path.join(AKAR, "src/operasi_hasil.js"));
const {pecah, migrasi} = await import(path.join(AKAR, "tests/warga/_bantu.mjs"));

/* D1 tipis di atas node:sqlite: prepare().bind().all/first/run, batch */
export function d1(db) {
  const siapkan = (sql, b = []) => ({
    bind: (...x) => siapkan(sql, x),
    all: async () => ({results: db.prepare(sql).all(...b)}),
    first: async () => db.prepare(sql).get(...b) ?? null,
    run: async () => { const r = db.prepare(sql).run(...b); return {meta: {last_row_id: Number(r.lastInsertRowid), changes: r.changes}}; },
  });
  return {prepare: sql => siapkan(sql), batch: async st => { db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(await s.run()); db.exec("COMMIT"); return o; } catch (e) { db.exec("ROLLBACK"); throw e; } }};
}

/* ekspor -> [{ms, teks}] urut waktu, ganda antar-ekspor dibuang (menit + 80 huruf pertama) */
export function bacaEkspor(isi) {
  const out = [];
  for (const blok of isi.split(/\n(?=‎?\[\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}[:.]\d{2}[:.]\d{2}(?: [AP]M)?\])/)) {
    const a = blok.match(/^\[(\d{1,2})\/(\d{1,2})\/(\d{2}), (\d{1,2}):(\d{2}):(\d{2}) ([AP])M\] [^:]+?: ([\s\S]*)$/);
    const i = !a && blok.replace(/^‎/, "").match(/^\[(\d{2})\/(\d{2})\/(\d{2}), (\d{2})\.(\d{2})\.(\d{2})\] [^:]+?: ([\s\S]*)$/);
    if (!a && !i) continue;
    const [bl, hr, th, j, mn, dt] = a ? [a[1], a[2], a[3], +a[4] % 12 + (a[7] === "P" ? 12 : 0), a[5], a[6]] : [i[2], i[1], i[3], +i[4], i[5], i[6]];
    const iso = `20${th}-${bl.padStart(2, "0")}-${hr.padStart(2, "0")}T${String(j).padStart(2, "0")}:${mn}:${dt}+07:00`;
    const teks = (a ? a[8] : i[7]).replace(/^\[Forwarded\]\s*/, "").replace(/‎?<attached: [^>]+>/g, "").replace(/<(?:image|video|audio|sticker|document) omitted>/g, "").trim();
    if (teks) out.push({ms: Date.parse(iso), teks});
  }
  const lihat = new Set();
  return out.sort((x, y) => x.ms - y.ms).filter(p => { const k = Math.floor(p.ms / 6e4) + "|" + p.teks.replace(/\s+/g, " ").slice(0, 80); return !lihat.has(k) && lihat.add(k); });
}

const q = v => v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const kunciGerak = (g, a = "") => ["tanggal = " + q(g.tanggal), "registrasi = " + q(g.registrasi), "jenis = " + q(g.jenis), "jam_utc IS " + q(g.jam_utc)].map(x => a + x).join(" AND ");

export async function isiUlang(pesan) {
  const db = new DatabaseSync(":memory:");
  for (const s of pecah(migrasi())) db.exec(s);
  const env = {DB: d1(db)}, hitung = {pesan: pesan.length, dikenali: 0};
  for (const p of pesan) {
    const tanggal = new Date(p.ms + 7 * 36e5).toISOString().slice(0, 10);
    if (await catatOperasi(env, {id: null, teks: p.teks, tanggal, diterima: p.ms})) hitung.dikenali++;
  }
  const baris = sql => db.prepare(sql).all();
  const sql = ["-- isi ulang Operasi Udara dari ekspor WA (scripts/operasi/isi_ulang_wa.mjs), idempoten"];
  for (const t of baris("SELECT * FROM op_temuan WHERE dummy = 0 ORDER BY id"))
    sql.push(`INSERT OR IGNORE INTO op_temuan (tanggal, jam_utc, registrasi, lat, lon, status, luas_klaim_ha, lokasi) VALUES (${[t.tanggal, t.jam_utc, t.registrasi, t.lat, t.lon, t.status, t.luas_klaim_ha, t.lokasi].map(q).join(", ")});`);
  for (const s of baris("SELECT * FROM op_armada_status ORDER BY tanggal, registrasi"))
    sql.push(`INSERT INTO op_armada_status (tanggal, registrasi, status, alasan, sumber, diubah) VALUES (${[s.tanggal, s.registrasi, s.status, s.alasan, "wa_ekspor", s.diubah].map(q).join(", ")}) ON CONFLICT (tanggal, registrasi) DO NOTHING;`);
  const hasil = new Map(baris("SELECT * FROM op_gerak_hasil").map(h => [h.gerak_id, h]));
  for (const g of baris("SELECT * FROM op_gerak WHERE dummy = 0 ORDER BY id")) {
    const kol = ["tanggal", "registrasi", "jenis", "jam_utc", "misi", "rute", "lokasi", "lat", "lon", "rujukan", "alasan"];
    sql.push(`INSERT INTO op_gerak (${kol.join(", ")}) SELECT ${kol.map(k => q(g[k])).join(", ")} WHERE NOT EXISTS (SELECT 1 FROM op_gerak x WHERE ${kunciGerak(g, "x.")} AND ${gerakHidup("x")}) AND NOT ${kejadianGerak(q(g.tanggal), q(g.registrasi), q(g.jenis))};`);   // penjagaan isian manual 0126 (DESAIN-TEKNIS 7.4)
    const h = hasil.get(g.id); if (!h) continue;
    const hk = Object.keys(h).filter(k => k !== "gerak_id" && h[k] != null);
    if (hk.length) sql.push(`INSERT INTO op_gerak_hasil (gerak_id, ${hk.join(", ")}) SELECT id, ${hk.map(k => q(h[k])).join(", ")} FROM op_gerak WHERE ${kunciGerak(g)} AND ${gerakHidup("op_gerak")} ORDER BY id LIMIT 1 ON CONFLICT (gerak_id) DO NOTHING;`);
  }
  for (const t of ["op_temuan", "op_armada_status", "op_gerak", "op_gerak_hasil"]) hitung[t] = db.prepare(`SELECT count(*) n FROM ${t}`).get().n;
  return {sql: sql.join("\n") + "\n", hitung, db};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [keluar, ...ekspor] = process.argv.slice(2);
  if (!keluar || !ekspor.length) { console.error("pakai: node scripts/operasi/isi_ulang_wa.mjs <keluar.sql> <ekspor.txt> [...]"); process.exit(2); }
  const pesan = bacaEkspor(ekspor.map(f => readFileSync(f, "utf8")).join("\n"));
  const {sql, hitung} = await isiUlang(pesan);
  writeFileSync(keluar, sql);
  console.log(JSON.stringify(hitung), "->", keluar);
}
