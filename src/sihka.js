/* Tinggi muka air sungai terukur (SIHKA, Kementerian PU Ditjen SDA) se-Indonesia. Cron "* * * * *" memanggil perbaruiSihka tiap jam (menit 23)
   dan dasarSihka sekali sehari (20 UTC). BATAS CPU Workers Free 10 ms: Worker TIDAK PERNAH JSON.parse teks sumber (~470 KB); teks diikat sebagai
   parameter dan SQLite yang mengurai lewat json_each. Status per pos juga dibangun SQL (json_group_array) dan disimpan sebagai SATU baris
   cuaca_sumber ('sihka_status'); rute hanya meneruskan teksnya. Gagal-lunak: sumber mati/bukan daftar = bacaan & stempel sehat ('sihka'.dibuat, juga `ok` di status)
   utuh, tetapi status DIHITUNG ULANG supaya pos yang berhenti melapor jadi 'lama'.
   Sumber luar: badan dibaca bertahap dan dibatalkan > 2 MB, tanpa redirect; tiap tulisan D1 dari teks luar punya LIMIT dan batas panjang.
   Status per pos (prioritas): bukan_tinggi (satuan debit/mdpl) > lama (> 5 jam) > macet (nilai sama 12 jam) > riwayat_kurang (< 7 hari atau n < 100)
   > data_bolong (pembanding 1/2/3 jam hilang) > naik_di_atas_biasa (kenaikan 3 jam > p99 pos itu, n >= 300, >= 14 hari, tiga langkah tak turun, lantai 20 cm
   bila satuan diketahui, bila tidak v >= p95 dan kenaikan >= 2x p99) > tertinggi (v > rekor, >= 30 hari) > biasa. Dasar persentil tidak memuat 24 jam terakhir. */
import {gagal, cacheTepi} from "./worker.js";

const SUMBER = "https://sihka.dev-tunnels.id/api/v1s/telemetry-list", TIMEOUT_MS = 8000, MAKS_BYTE = 2e6, TAHAN_HARI = 180, DASAR_HARI = 90, DASAR_SIKLUS = 14;   // bacaan mentah 180 hari (uji balik satu musim hujan); jendela dasar 90 hari
const UA = "pantaubencana-sihka/1.0 (+https://centurisk97.id; pemantauan banjir nonkomersial)";
const SUMBER_TEKS = "Kementerian PU, Ditjen SDA (SIHKA)";

/* teks SIHKA -> baris sihka_baca. ?2 = kini (detik): hanya bacaan 6 jam terakhir dan tidak lebih dari 10 menit di masa depan (ada cap waktu 2026-11 nyasar).
   Hanya pos terdaftar (sihka_pos), id teks <= 40, |nilai| < 1e5 (tolak Inf), paling banyak 5000 baris per tarikan (sekitar 400 normalnya). */
export const SQL_BACA = `INSERT OR IGNORE INTO sihka_baca (pos, t, v)
  SELECT json_extract(p.value,'$.id'), CAST(unixepoch(json_extract(r.value,'$.timestamp')) AS INTEGER), json_extract(r.value,'$.value')
  FROM json_each(?1) p, json_each(json_extract(p.value,'$.raw')) r
  WHERE json_extract(p.value,'$.type') = 'DUGA AIR' AND typeof(json_extract(p.value,'$.id')) = 'text' AND length(json_extract(p.value,'$.id')) <= 40
    AND json_extract(p.value,'$.id') IN (SELECT pos FROM sihka_pos)
    AND typeof(json_extract(r.value,'$.value')) IN ('integer','real') AND abs(json_extract(r.value,'$.value')) < 1e5
    AND unixepoch(json_extract(r.value,'$.timestamp')) > ?2 - 6*3600
    AND unixepoch(json_extract(r.value,'$.timestamp')) <= ?2 + 600
  LIMIT 5000`;

/* metadata pos (hanya DUGA AIR), upsert; `dilihat` ikut maju = 1 tulisan per pos per hari. Paling banyak 1500 pos, teks dipotong, koordinat di luar Indonesia (EPSG:3857) ditolak. */
const SQL_POS = `INSERT INTO sihka_pos (pos, nama, x, y, satuan, tz, merek, dilihat)
  SELECT pos, nama, x, y, satuan, tz, merek, ?2 FROM (
    SELECT json_extract(j,'$.id') pos, substr(json_extract(j,'$.name'), 1, 80) nama,
      CAST(substr(c, 1, instr(c, ',') - 1) AS REAL) x, CAST(substr(c, instr(c, ',') + 1) AS REAL) y,
      substr((SELECT json_extract(r.value,'$.unit') FROM json_each(json_extract(j,'$.raw')) r WHERE json_extract(r.value,'$.unit') IS NOT NULL LIMIT 1), 1, 16) satuan,
      substr(json_extract(j,'$.tz'), 1, 16) tz,
      substr((SELECT json_extract(r.value,'$.merek') FROM json_each(json_extract(j,'$.raw')) r WHERE json_extract(r.value,'$.merek') IS NOT NULL LIMIT 1), 1, 16) merek
    FROM (SELECT p.value j, json_extract(p.value,'$.coordinate') c FROM json_each(?1) p WHERE json_extract(p.value,'$.type') = 'DUGA AIR') o
    WHERE typeof(json_extract(j,'$.id')) = 'text' AND length(json_extract(j,'$.id')) <= 40 AND typeof(c) = 'text' AND c LIKE '%,%')
  WHERE x BETWEEN 10.4e6 AND 15.9e6 AND y BETWEEN -1.35e6 AND 0.75e6
  LIMIT 1500
  ON CONFLICT(pos) DO UPDATE SET nama = excluded.nama, x = excluded.x, y = excluded.y, satuan = excluded.satuan, tz = excluded.tz, merek = excluded.merek, dilihat = excluded.dilihat`;

/* kenaikan 3 jam = v - bacaan terdekat pada [t-3j-20mnt, t-3j+20mnt]. */
const REF = (pos, t, geser) => {   // tanpa ORDER BY yang merujuk kolom luar: SQLite di D1 menolaknya ("no such column") bila kolom luar berasal dari CTE
  const w = (x) => `${x}.pos = ${pos} AND ${x}.t BETWEEN ${t} - ${geser} - 1200 AND ${t} - ${geser} + 1200`;
  return `(SELECT a.v FROM sihka_baca a WHERE ${w("a")} AND abs(a.t - (${t} - ${geser})) = (SELECT min(abs(c.t - (${t} - ${geser}))) FROM sihka_baca c WHERE ${w("c")}) LIMIT 1)`;
};
/* Dasar: SATU lintasan per pos (tanpa subquery berkorelasi: itu 17 jt baris baca untuk 864 rb baris). Pembanding 3 jam = rata-rata bacaan di [t-3j20m, t-2j40m]
   lewat window RANGE; NULL bila tak ada = bukan sampel. Biaya: ~20 baris baca per baris jendela (window + dua sortir), jadi pos hanya dihitung ulang sekali tiap DASAR_SIKLUS (14) hari (bucket dari id, digeser per hari); pos tanpa baris dasar langsung. Jendela dihitung (t-90h, t-1h]; 3j20m sebelum batas bawah hanya dibaca sebagai pembanding. */
export const SQL_DASAR = `INSERT OR REPLACE INTO sihka_dasar (pos, n, d3_p50, d3_p99, v_p95, v_max, hari, dihitung)
  WITH w AS (SELECT pos, t, v, v - avg(v) OVER (PARTITION BY pos ORDER BY t RANGE BETWEEN 12000 PRECEDING AND 9600 PRECEDING) d3
    FROM sihka_baca WHERE pos IN (SELECT pos FROM sihka_pos WHERE pos NOT IN (SELECT pos FROM sihka_dasar)
      OR (unicode(substr(pos, -1)) * 31 + unicode(substr(pos, -2, 1))) % ${DASAR_SIKLUS} = (?1 / 86400) % ${DASAR_SIKLUS})
    AND t > ?1 - ${DASAR_HARI} * 86400 - 12000 AND t <= ?1 - 86400),
  b AS (SELECT pos, t, v, d3 FROM w WHERE t > ?1 - ${DASAR_HARI} * 86400),
  dr AS (SELECT pos, d3, row_number() OVER (PARTITION BY pos ORDER BY d3) rn, count(*) OVER (PARTITION BY pos) n FROM b WHERE d3 IS NOT NULL),
  dp AS (SELECT pos, max(n) n, max(CASE WHEN rn = (n * 50 + 99) / 100 THEN d3 END) p50, max(CASE WHEN rn = (n * 99 + 99) / 100 THEN d3 END) p99 FROM dr GROUP BY pos),
  vr AS (SELECT pos, t, v, row_number() OVER (PARTITION BY pos ORDER BY v) rn, count(*) OVER (PARTITION BY pos) n FROM b),
  vp AS (SELECT pos, max(CASE WHEN rn = (n * 95 + 99) / 100 THEN v END) p95, max(v) vmax, (max(t) - min(t)) / 86400.0 hari FROM vr GROUP BY pos)
  SELECT vp.pos, coalesce(dp.n, 0), dp.p50, dp.p99, vp.p95, vp.vmax, vp.hari, ?1 FROM vp LEFT JOIN dp ON dp.pos = vp.pos`;

/* Hapus tanpa pindai penuh (seek PK per pos): bacaan lama; bacaan pos yang akan dibuang (dilihat < ?) dulu, baru barisnya. SQL_BACA hanya menerima pos terdaftar, jadi tak ada yatim. */
export const SQL_HAPUS_LAMA = "DELETE FROM sihka_baca WHERE pos IN (SELECT pos FROM sihka_pos) AND t < ?";
export const SQL_HAPUS_BACA_POS = "DELETE FROM sihka_baca WHERE pos IN (SELECT pos FROM sihka_pos WHERE dilihat < ?)";

/* lantai kenaikan setara 20 cm hanya untuk satuan yang diketahui (cm/m/mm); satuan lain/NULL tanpa lantai */
const LANTAI = `CASE lower(u.satuan) WHEN 'cm' THEN 20.0 WHEN 'centimeter' THEN 20.0 WHEN 'm' THEN 0.2 WHEN 'meter' THEN 0.2 WHEN 'mm' THEN 200.0 ELSE NULL END`;
/* status per pos (urutan prioritas di kepala berkas). ?1 = kini (detik), ?2 = kini (ms). `ok` = stempel tarikan sehat terakhir ('sihka'.dibuat), `dibuat` = waktu hitung. */
export const SQL_STATUS = `INSERT INTO cuaca_sumber (kunci, isi, dibuat)
  WITH u AS (SELECT s.pos, s.nama, s.x, s.y, s.satuan, (SELECT max(t) FROM sihka_baca WHERE pos = s.pos) lt FROM sihka_pos s),
  l AS (SELECT u.pos, u.nama, u.x, u.y, u.satuan, u.lt, (SELECT v FROM sihka_baca WHERE pos = u.pos AND t = u.lt) v FROM u WHERE lt IS NOT NULL),
  m AS (SELECT l.pos, l.nama, l.x, l.y, l.satuan, l.lt, l.v, ${REF("l.pos", "l.lt", 10800)} r3, ${REF("l.pos", "l.lt", 7200)} r2, ${REF("l.pos", "l.lt", 3600)} r1,
    (SELECT count(*) FROM sihka_baca WHERE pos = l.pos AND t > ?1 - 12*3600) n12,
    (SELECT max(v) - min(v) FROM sihka_baca WHERE pos = l.pos AND t > ?1 - 12*3600) sebar12 FROM l),
  e AS MATERIALIZED (SELECT u.pos id, u.nama, u.x, u.y, u.satuan, u.v, u.lt t, round(u.v - u.r3, 3) d3, d.hari,
    CASE
      WHEN lower(u.satuan) IN ('m3/s', 'm³/s', 'mdpl') THEN 'bukan_tinggi'
      WHEN u.lt < ?1 - 5*3600 THEN 'lama'
      WHEN u.n12 >= 6 AND u.sebar12 = 0 THEN 'macet'
      WHEN coalesce(d.hari, 0) < 7 OR coalesce(d.n, 0) < 100 THEN 'riwayat_kurang'
      WHEN u.r1 IS NULL OR u.r2 IS NULL OR u.r3 IS NULL THEN 'data_bolong'
      WHEN d.n >= 300 AND d.hari >= 14 AND d.d3_p99 > 0 AND u.v - u.r3 > d.d3_p99 AND u.v >= u.r1 AND u.r1 >= u.r2 AND u.r2 >= u.r3
        AND ((${LANTAI} IS NOT NULL AND u.v - u.r3 >= ${LANTAI})
          OR (${LANTAI} IS NULL AND u.v >= d.v_p95 AND u.v - u.r3 >= 2 * d.d3_p99)) THEN 'naik_di_atas_biasa'
      WHEN d.hari >= 30 AND u.v > d.v_max THEN 'tertinggi'
      ELSE 'biasa' END status
    FROM m u LEFT JOIN sihka_dasar d ON d.pos = u.pos)
  SELECT 'sihka_status', json_object('dibuat', ?2, 'ok', (SELECT dibuat FROM cuaca_sumber WHERE kunci = 'sihka'), 'sumber', '${SUMBER_TEKS}',
    'ringkas', json((SELECT coalesce(json_group_object(status, c), '{}') FROM (SELECT status, count(*) c FROM e GROUP BY status))),
    'pos', json((SELECT coalesce(json_group_array(json_object('id', id, 'nama', nama, 'x', x, 'y', y, 'satuan', satuan, 'v', v, 't', t, 'd3', d3, 'status', status, 'hari', round(hari, 1))), '[]') FROM e))), ?2
  ON CONFLICT(kunci) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat`;

async function tarik() {
  const r = await fetch(SUMBER, {headers: {"user-agent": UA, accept: "application/json"}, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual"});   // workerd tidak mendukung "error"; 3xx jatuh ke cek status !== 200
  if (r.status !== 200) { r.body?.cancel(); throw new Error(`HTTP ${r.status}`); }
  if (+r.headers.get("content-length") > MAKS_BYTE) { r.body?.cancel(); throw new Error("badan terlalu besar"); }
  const rd = r.body.getReader(), bagian = []; let n = 0;   // hitung byte sambil membaca: tanpa content-length pun berhenti begitu > MAKS_BYTE
  for (;;) {
    const {done, value} = await rd.read(); if (done) break;
    n += value.byteLength; if (n > MAKS_BYTE) { await rd.cancel(); throw new Error("badan terlalu besar"); }
    bagian.push(value);
  }
  const buf = new Uint8Array(n); let o = 0; for (const b of bagian) { buf.set(b, o); o += b.byteLength; }
  const t = new TextDecoder().decode(buf);
  if (!t.startsWith("[") || !t.includes('"DUGA AIR"')) throw new Error("bukan daftar telemetri");
  return t;
}

const bangunStatus = (env, kini) => env.DB.prepare(SQL_STATUS).bind(Math.floor(kini / 1000), kini).run();

/* tiap jam. Sumber gagal = bacaan & stempel sehat lama utuh (hanya galat dicatat di isi); status tetap dihitung ulang agar pos yang berhenti melapor jadi 'lama'. */
export async function perbaruiSihka(env, kini = Date.now()) {
  const detik = Math.floor(kini / 1000);
  let teks; try { teks = await tarik(); } catch (e) {
    await env.DB.prepare("UPDATE cuaca_sumber SET isi = json_set(coalesce(isi, '{}'), '$.galat', ?) WHERE kunci = 'sihka'").bind(e.message).run().catch(() => {});
    await bangunStatus(env, kini);
    return {galat: e.message};
  }
  if (!(await env.DB.prepare("SELECT 1 FROM sihka_pos LIMIT 1").first())) await env.DB.prepare(SQL_POS).bind(teks, detik).run();   // pertama kali: metadata dulu (SQL_BACA hanya menerima pos terdaftar)
  const baru = (await env.DB.prepare(SQL_BACA).bind(teks, detik).run()).meta.changes;
  await env.DB.prepare("INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES ('sihka', ?, ?) ON CONFLICT(kunci) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat")
    .bind(JSON.stringify({ok: kini, baru, galat: null, dibaca: teks.length}), kini).run();
  await bangunStatus(env, kini);   // sesudah stempel sehat, supaya `ok` di status = tarikan ini
  return {baru, dibaca: teks.length};
}

/* harian: metadata pos, dasar historis, buang bacaan > 180 hari dan pos tak terlihat > 30 hari, lalu status disegarkan. Tarikan sendiri; gagal = tak ada yang berubah. */
export async function dasarSihka(env, kini = Date.now()) {
  const detik = Math.floor(kini / 1000);
  let teks; try { teks = await tarik(); } catch (e) { return {galat: e.message}; }
  await env.DB.prepare(SQL_POS).bind(teks, detik).run();
  await env.DB.prepare(SQL_DASAR).bind(detik).run();
  // tanpa pindai penuh: seek PK per pos terdaftar; bacaan pos yang akan dibuang dihapus dulu (SQL_BACA hanya menerima pos terdaftar, jadi tak ada yatim)
  const buang = (await env.DB.prepare(SQL_HAPUS_LAMA).bind(detik - TAHAN_HARI * 86400).run()).meta.changes;
  const hilang = detik - 30 * 86400;
  await env.DB.prepare(SQL_HAPUS_BACA_POS).bind(hilang).run();
  const pos = (await env.DB.prepare("DELETE FROM sihka_pos WHERE dilihat < ?").bind(hilang).run()).meta.changes;
  await bangunStatus(env, kini);
  return {buang, pos};
}

/* untuk /api/status: kapan tarikan sehat terakhir */
export async function sihkaDibuat(env) {
  try { return (await env.DB.prepare("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'sihka'").first())?.dibuat ?? null; } catch (e) { return null; }
}

/* GET/HEAD /api/banjir/sungai-ukur: baris sihka_status apa adanya (tanpa parse), cache tepi 10 menit; tabel/isi belum ada = 503 */
export async function ruteSihka(req, env, ctx, url) {
  if (url.pathname.replace(/\/+$/, "") !== "/api/banjir/sungai-ukur") return null;
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET dan HEAD", {allow: "GET, HEAD"});
  const r = await cacheTepi(new Request(url.origin + "/api/banjir/sungai-ukur"), ctx, 600, async () => {
    let isi; try { isi = (await env.DB.prepare("SELECT isi FROM cuaca_sumber WHERE kunci = 'sihka_status'").first())?.isi; } catch (e) { console.error("sihka api", e?.message); return gagal(503, "sungai terukur belum siap"); }
    return isi ? new Response(isi, {headers: {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"}}) : gagal(503, "sungai terukur belum terisi");
  });
  return req.method === "HEAD" ? new Response(null, {status: r.status, headers: r.headers}) : r;
}
