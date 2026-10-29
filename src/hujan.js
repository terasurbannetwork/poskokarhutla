/* Curah hujan terukur SIHKA (type 'CURAH HUJAN') untuk Jawa. Panen tiap 10 menit (menit % 10 = 3; menit 23 ikut tarikan SIHKA jam-an), teks sumber TIDAK di-JSON.parse Worker (json_each di SQLite).
   ARTI NILAI (dibuktikan dari tiga cuplikan feed nyata 27 Okt 2026 berjarak 5 menit): per INTERVAL, bukan kumulatif. Gauge yang sama melaporkan 4,5 lalu 0, 5 lalu 1, 134 lalu 0, 2,68 lalu 2,68;
   timestamp tiap 5 atau 10 menit. Feed hanya memuat bacaan TERAKHIR (raw <= 3, hampir selalu 1), jadi mm_hari dan mm_1jam = jumlah bacaan yang sempat dipanen (batas bawah; bacaan di antara
   dua tarikan tidak terlihat, gauge 5 menit kehilangan sekitar separuh). 10 menit adalah kompromi KUOTA: D1 Free = 100 ribu baris tulis/hari; tiap 10 menit ~ 25 ribu/hari (heartbeat 368 pos x 24 jam ~ 9 ribu,
   bacaan > 0, status 144) dan tiap 5 menit hampir dua kali lipat. Hanya bacaan > 0 yang disimpan (hujan_baca); bacaan 0 memajukan t_akhir pos (hujan_pos) paling cepat sekali per jam.
   rows_written tiap siklus dicatat (console.log + kumulatif harian UTC di cuaca_sumber 'hujan') supaya angka nyata terlihat di produksi.
   Buang: nilai < 0 atau > 100 mm per interval (pos nyata melaporkan 134, 787, 1178: galat sensor), satuan selain mm/null (m, cm: 4 pos), pos di luar kotak Jawa-Bali. mm_hari sejak 00.00 WIB.
   status: lama (bacaan terakhir > 3 jam), macet (nilai > 0 sama persis >= 6 jam), biasa. */
import {gagal, cacheTepi} from "./worker.js";

const PENGELOLA = "Kementerian Pekerjaan Umum, Direktorat Jenderal Sumber Daya Air (SIHKA)", MAKS_MM = 100, SIMPAN_HARI = 3;
const LON = "(x / 6378137.0 * 57.29577951308232)", LAT = "((2 * atan(exp(y / 6378137.0)) - 1.5707963267948966) * 57.29577951308232)";
const NUM = "typeof(json_extract(r.value,'$.value')) IN ('integer','real') AND typeof(json_extract(r.value,'$.timestamp')) = 'text' AND (json_extract(r.value,'$.unit') IS NULL OR lower(json_extract(r.value,'$.unit')) = 'mm')";

/* pos Jawa-Bali (kotak) dari teks; ?2 = kini (detik). Bacaan terakhir = timestamp terbesar yang numerik dan tidak > 10 menit di masa depan. */
export const SQL_POS = `INSERT INTO hujan_pos (pos, nama, lon, lat, tz, merek, satuan, dilihat, t_akhir, v_akhir, sama_sejak)
  SELECT pos, nama, lon, lat, tz, merek, 'mm', ?2, t, v, t FROM (
    SELECT pos, nama, tz, merek, ${LON} lon, ${LAT} lat, t, v FROM (
      SELECT json_extract(p.value,'$.id') pos, substr(json_extract(p.value,'$.name'), 1, 80) nama, substr(json_extract(p.value,'$.tz'), 1, 16) tz,
        CAST(substr(json_extract(p.value,'$.coordinate'), 1, instr(json_extract(p.value,'$.coordinate'), ',') - 1) AS REAL) x,
        CAST(substr(json_extract(p.value,'$.coordinate'), instr(json_extract(p.value,'$.coordinate'), ',') + 1) AS REAL) y,
        (SELECT substr(json_extract(r.value,'$.merek'), 1, 16) FROM json_each(json_extract(p.value,'$.raw')) r WHERE json_extract(r.value,'$.merek') IS NOT NULL LIMIT 1) merek,
        (SELECT unixepoch(json_extract(r.value,'$.timestamp')) FROM json_each(json_extract(p.value,'$.raw')) r WHERE ${NUM} AND unixepoch(json_extract(r.value,'$.timestamp')) <= ?2 + 600
          ORDER BY unixepoch(json_extract(r.value,'$.timestamp')) DESC LIMIT 1) t,
        (SELECT json_extract(r.value,'$.value') FROM json_each(json_extract(p.value,'$.raw')) r WHERE ${NUM} AND unixepoch(json_extract(r.value,'$.timestamp')) <= ?2 + 600
          ORDER BY unixepoch(json_extract(r.value,'$.timestamp')) DESC LIMIT 1) v
      FROM json_each(?1) p WHERE json_extract(p.value,'$.type') = 'CURAH HUJAN' AND typeof(json_extract(p.value,'$.id')) = 'text' AND length(json_extract(p.value,'$.id')) <= 40
        AND typeof(json_extract(p.value,'$.coordinate')) = 'text' AND json_extract(p.value,'$.coordinate') LIKE '%,%')
    WHERE t IS NOT NULL AND abs(v) < 1e5)
  WHERE lon BETWEEN 105 AND 115.7 AND lat BETWEEN -8.9 AND -5.8 LIMIT 1000
  ON CONFLICT(pos) DO UPDATE SET nama = excluded.nama, lon = excluded.lon, lat = excluded.lat, tz = excluded.tz, merek = excluded.merek, dilihat = excluded.dilihat,
    sama_sejak = CASE WHEN excluded.v_akhir > 0 AND excluded.v_akhir = hujan_pos.v_akhir THEN hujan_pos.sama_sejak ELSE excluded.t_akhir END, t_akhir = excluded.t_akhir, v_akhir = excluded.v_akhir
  WHERE excluded.t_akhir > coalesce(hujan_pos.t_akhir, 0) AND (excluded.v_akhir > 0 OR hujan_pos.v_akhir > 0 OR excluded.t_akhir - hujan_pos.t_akhir >= 3000)`;

/* hanya bacaan hujan sungguhan (0 < v <= 100 mm) dari pos terdaftar; ?2 = kini (detik) */
export const SQL_BACA = `INSERT OR IGNORE INTO hujan_baca (pos, t, v)
  SELECT json_extract(p.value,'$.id'), unixepoch(json_extract(r.value,'$.timestamp')), json_extract(r.value,'$.value')
  FROM json_each(?1) p, json_each(json_extract(p.value,'$.raw')) r
  WHERE json_extract(p.value,'$.type') = 'CURAH HUJAN' AND typeof(json_extract(p.value,'$.id')) = 'text' AND json_extract(p.value,'$.id') IN (SELECT pos FROM hujan_pos)
    AND ${NUM} AND json_extract(r.value,'$.value') > 0 AND json_extract(r.value,'$.value') <= ${MAKS_MM}
    AND unixepoch(json_extract(r.value,'$.timestamp')) BETWEEN ?2 - ${SIMPAN_HARI} * 86400 AND ?2 + 600
  LIMIT 1500`;

/* ?1 = kini (detik), ?2 = kini (ms), ?3 = awal hari ini 00.00 WIB (detik) */
export const SQL_STATUS = `INSERT INTO cuaca_sumber (kunci, isi, dibuat)
  SELECT 'hujan_status', json_object('dibuat', ?2, 'sumber', 'Kementerian PU, Ditjen SDA (SIHKA)',
    'catatan', 'mm_hari dan mm_1jam = jumlah bacaan per interval yang sempat dipanen (batas bawah; tarikan tiap 10 menit); mm_hari sejak 00.00 WIB',
    'pos', json((SELECT coalesce(json_group_array(json_object('id', pos, 'nama', nama, 'lon', round(lon, 6), 'lat', round(lat, 6),
      'mm_hari', round(coalesce((SELECT sum(v) FROM hujan_baca b WHERE b.pos = h.pos AND b.t >= ?3 AND b.t <= ?1 + 600), 0), 2),
      'mm_1jam', round(coalesce((SELECT sum(v) FROM hujan_baca b WHERE b.pos = h.pos AND b.t > ?1 - 3600 AND b.t <= ?1 + 600), 0), 2),
      't', t_akhir, 'status', CASE WHEN t_akhir < ?1 - 3*3600 THEN 'lama' WHEN v_akhir > 0 AND ?1 - sama_sejak >= 6*3600 THEN 'macet' ELSE 'biasa' END,
      'pengelola', '${PENGELOLA}')), '[]') FROM hujan_pos h WHERE t_akhir > ?1 - 30*86400))), ?2
  ON CONFLICT(kunci) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat`;

/* teks SIHKA sudah di tangan (satu unduhan dipakai bersama); menit < 10 = bersih-bersih jam-an. Menjumlah meta.rows_written semua tulisan siklus ini ke stempel harian 'hujan'. */
const tulis = m => m?.meta?.rows_written ?? 0;
export async function panenHujan(env, teks, kini = Date.now()) {
  const detik = Math.floor(kini / 1000), awal = Math.floor((detik + 7 * 3600) / 86400) * 86400 - 7 * 3600;
  let rw = 0;
  rw += tulis(await env.DB.prepare(SQL_POS).bind(teks, detik).run());
  const b = await env.DB.prepare(SQL_BACA).bind(teks, detik).run(); rw += tulis(b);
  if (new Date(kini).getUTCMinutes() < 10) {
    rw += tulis(await env.DB.prepare("DELETE FROM hujan_baca WHERE t < ?").bind(detik - SIMPAN_HARI * 86400).run());
    rw += tulis(await env.DB.prepare("DELETE FROM hujan_pos WHERE dilihat < ?").bind(detik - 30 * 86400).run());
  }
  rw += tulis(await env.DB.prepare(SQL_STATUS).bind(detik, kini, awal).run()) + 1;   // +1: stempel di bawah
  const hari = new Date(kini).toISOString().slice(0, 10);
  await env.DB.prepare(`INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES ('hujan', json_object('hari', ?1, 'tulis', ?2, 'siklus', 1, 'terakhir', ?2, 'ok', ?3), ?3)
    ON CONFLICT(kunci) DO UPDATE SET isi = json_object('hari', ?1, 'tulis', CASE WHEN json_extract(isi, '$.hari') = ?1 THEN json_extract(isi, '$.tulis') + ?2 ELSE ?2 END,
      'siklus', CASE WHEN json_extract(isi, '$.hari') = ?1 THEN json_extract(isi, '$.siklus') + 1 ELSE 1 END, 'terakhir', ?2, 'ok', ?3), dibuat = ?3`).bind(hari, rw, kini).run();
  console.log("hujan rows_written", rw);
  return {baru: b.meta.changes, rows_written: rw};
}

/* GET/HEAD /api/banjir/hujan-ukur: teks hujan_status apa adanya, cache tepi 5 menit; belum terisi = 503 */
export async function ruteHujan(req, env, ctx, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET dan HEAD", {allow: "GET, HEAD"});
  const r = await cacheTepi(new Request(url.origin + "/api/banjir/hujan-ukur"), ctx, 300, async () => {
    let isi; try { isi = (await env.DB.prepare("SELECT isi FROM cuaca_sumber WHERE kunci = 'hujan_status'").first())?.isi; } catch (e) { console.error("hujan api", e?.message); return gagal(503, "hujan terukur belum siap"); }
    return isi ? new Response(isi, {headers: {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"}}) : gagal(503, "hujan terukur belum terisi");
  });
  return req.method === "HEAD" ? new Response(null, {status: r.status, headers: r.headers}) : r;
}
