/* Halaman staf /monitor: per tugas api, apakah peringatan sudah DIBACA Dit. Dalops dan BPBD, groundcheck (tugas_isian 'konfirmasi') dan tindak lanjut ('tindakan') berfoto.
   Skema baca: migrations/0062_monitor_baca.sql; isian dan foto dibaca dari tabel instansi yang sudah ada (tidak disalin).
   Pelaku: admin/moderator dan staf berperan dalops (pusdalops, koordalops, pimpinan, verifikator) -> pihak 'dalops'; akun instansi aktif pemprov/pemkab/pemkot -> pihak 'bpbd'. */
import {json, gagal, bacaBody, cacheTepi, normalWA} from "./worker.js";
import {pemirsaSesi} from "./pemirsa.js";
import {modOK} from "./posko.js";
import {stafSesi} from "./staf.js";
import {akunAktif, lingkupSql, dalamLingkup, KECUALI_LAIN, tanpaBencana, tanpaTabel, kirimMedia, jsonAman, PROV} from "./instansi.js";
import {laju} from "./bnpb.js";

const JAM = 36e5, RE_ID = /^[0-9A-Za-z]{16}$/;
const PERAN_DALOPS = ["pusdalops", "koordalops", "pimpinan", "verifikator"], JENIS_BPBD = ["pemprov", "pemkab", "pemkot"];
const tabelBaca = e => /no such table: (main\.)?monitor_baca/i.test(String(e?.message || e));
const FILTER_BENCANA = {karhutla: KECUALI_LAIN, banjir: "AND EXISTS (SELECT 1 FROM tugas_bencana bb WHERE bb.tugas_id = t.id AND bb.bencana = 'banjir')"};
const DARI_IDS = "IN (SELECT value FROM json_each(?))";   // json_each, bukan ?,?,?: batas 100 parameter D1

/* {pihak, pembaca, nama, unit, dummy, sql: [klausa, bind], boleh(t)} atau Response galat. Tanpa sesi apa pun: 401 dari akunAktif. */
async function pelaku(env, req, kini) {
  const m = await modOK(env, req);
  if (m) return {pihak: "dalops", pembaca: "admin:" + m, nama: "Admin", unit: null, dummy: true, sql: ["1", []], boleh: () => true};
  const s = await stafSesi(env, req, kini);
  if (s) {
    if (!PERAN_DALOPS.some(p => s.peran.includes(p))) return gagal(403, "peran staf ini tidak membuka halaman monitor");
    const luas = s.wilayah.length === 0;   // wilayah kosong = nasional; sama dengan dalamWilayahStaf, tapi di SQL supaya LIMIT 300 jatuh pada tugas yang boleh dilihat
    return {pihak: "dalops", pembaca: "staf:" + s.id, nama: s.nama, unit: s.unit, dummy: !!s.dummy,
      sql: [`${luas ? "1" : "t.prov IN (SELECT value FROM json_each(?))"} AND ${s.dummy ? "1" : "t.dummy = 0"}`, luas ? [] : [JSON.stringify(s.wilayah)]],
      boleh: t => (luas || s.wilayah.includes(t.prov)) && (s.dummy || !t.dummy)};
  }
  /* akun instansi BPBD didahulukan; akun pemirsa (0036/0077) jadi cadangan: hanya BACA, nasional, tanpa data contoh */
  const a = await akunAktif(env, req, kini), bpbd = !(a instanceof Response) && JENIS_BPBD.includes(a.jenis);
  if (!bpbd) {
    const pm = await pemirsaSesi(env, req, kini);
    if (pm?.tab.includes("monitor")) return {pihak: "pemirsa", pembaca: "pemirsa:" + pm.id, nama: pm.nama, unit: null, dummy: false, sql: ["t.dummy = 0", []], boleh: t => !t.dummy};
    if (pm) return gagal(403, "akun pemirsa ini tidak membuka tab Monitor");
    if (a instanceof Response) return a;
    return gagal(403, "halaman monitor untuk BNPB dan pemerintah daerah (BPBD)");
  }
  const [w, p] = lingkupSql(a);
  return {pihak: "bpbd", pembaca: "akun:" + a.id, nama: a.nama || a.username, unit: a.unit || a.wilayah, dummy: !!a.dummy, sql: [w, p], boleh: t => dalamLingkup(a, t)};
}
const bentukMedia = (m, t) => ({id: m.id, jenis: m.jenis, waktu_ambil: m.waktu_ambil, sumber_waktu: m.sumber_waktu, lat: m.lat, lon: m.lon, kec: t.kec, kab: t.kab, prov: t.prov,
  thumb: `/api/monitor/thumb/${m.id}`, url: `/api/monitor/media/${m.id}`});

async function daftar(env, req, url, kini) {
  const bencana = url.searchParams.get("bencana") ?? "karhutla";
  if (!Object.hasOwn(FILTER_BENCANA, bencana)) return gagal(400, "bencana harus karhutla atau banjir");
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  const baca = bagian => env.DB.prepare(`SELECT t.id, t.prov, t.kab, t.kec, t.lat, t.lon, t.level, t.status, t.dibuat, t.terakhir_terdeteksi, t.padam_verif FROM tugas_api t
    WHERE ${p.sql[0]} ${bagian} AND (t.status = 'buka' OR t.dibuat > ? OR t.padam_pada > ?) ORDER BY t.dibuat DESC LIMIT 300`).bind(...p.sql[1], kini - 72 * JAM, kini - 72 * JAM).all();
  let T; try { T = (await baca(FILTER_BENCANA[bencana])).results; } catch (e) { if (!tanpaBencana(e)) throw e; T = bencana === "banjir" ? [] : (await baca("")).results; }   // 0047 belum ada = semua tugas karhutla, tak ada banjir
  const ids = JSON.stringify(T.map(t => t.id)), per = (m, t, f) => (m.get(t) || m.set(t, []).get(t)).push(f), B = new Map(), I = new Map(), M = new Map();
  if (T.length) {
    let baris = [];
    try { baris = (await env.DB.prepare(`SELECT tugas_id, pihak, nama, unit, waktu FROM monitor_baca WHERE tugas_id ${DARI_IDS} ${p.dummy ? "" : "AND dummy = 0"} ORDER BY waktu`).bind(ids).all()).results; }
    catch (e) { if (!tabelBaca(e)) throw e; }   // 0062 belum diterapkan: daftar tetap tampil, tanpa tanda baca
    for (const b of baris) per(B, b.tugas_id + "|" + b.pihak, {nama: b.nama, unit: b.unit, waktu: b.waktu});
    for (const i of (await env.DB.prepare(`SELECT i.id, i.tugas_id, i.langkah, i.dibuat, i.hasil, i.pic_nama, i.jarak_km, i.gps_curiga, i.tindakan, i.status_api, i.kendala, a.wilayah oleh
      FROM tugas_isian i JOIN instansi_akun a ON a.id = i.akun_id WHERE i.tugas_id ${DARI_IDS} ORDER BY i.dibuat`).bind(ids).all()).results) per(I, i.tugas_id, i);
    for (const m of (await env.DB.prepare(`SELECT id, tugas_id, isian_id, jenis, waktu_ambil, sumber_waktu, coalesce(exif_lat, lat) lat, coalesce(exif_lon, lon) lon
      FROM instansi_media WHERE tugas_id ${DARI_IDS} AND isian_id IS NOT NULL ORDER BY waktu_ambil`).bind(ids).all()).results) per(M, m.isian_id, m);
  }
  const tugas = T.map(t => {
    const isian = I.get(t.id) || [], gc = isian.findLast(i => i.langkah === "konfirmasi"), tn = isian.filter(i => i.langkah === "tindakan"), tk = tn.at(-1), med = i => (M.get(i.id) || []).map(m => bentukMedia(m, t));
    return {id: t.id, prov: t.prov, prov_nama: PROV[t.prov]?.[1] ?? t.prov, kab: t.kab, kec: t.kec, lat: t.lat, lon: t.lon, level: t.level, status: t.status, dibuat: t.dibuat, terakhir_terdeteksi: t.terakhir_terdeteksi, padam_verif: t.padam_verif,
      baca: {dalops: B.get(t.id + "|dalops") || [], bpbd: B.get(t.id + "|bpbd") || []},
      groundcheck: gc ? {waktu: gc.dibuat, hasil: gc.hasil, oleh: gc.oleh, pic_nama: gc.pic_nama, jarak_km: gc.jarak_km, gps_curiga: gc.gps_curiga, media: med(gc)} : null,
      tindak: tk ? {waktu: tk.dibuat, tindakan: tk.tindakan, status_api: tk.status_api, kendala: jsonAman(tk.kendala) ?? [], oleh: tk.oleh, media: med(tk)} : null, n_tindakan: tn.length};
  });
  return json({kini, bencana, pihak: p.pihak, saya: {nama: p.nama, unit: p.unit}, tugas});
}

async function tandaiBaca(env, req, kini) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  if (p.pihak === "pemirsa") return gagal(403, "akun pemirsa hanya membaca");
  if (req.headers.get("x-pb") !== "1" && !p.pembaca.startsWith("admin:")) return gagal(403, "kiriman wajib membawa header x-pb: 1");   // staf sudah dijaga stafSesi; akun instansi di sini; admin lewat CSRF origin worker.js
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const ids = b.o.tugas;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || !ids.every(x => typeof x === "string" && RE_ID.test(x))) return gagal(400, "tugas harus larik 1 sampai 50 id tugas (16 karakter)");
  const lim = await laju(env, p.pembaca, "monitor.baca", [[JAM, 300]], kini); if (lim) return lim;
  const ada = (await env.DB.prepare(`SELECT id, prov, kab, dummy FROM tugas_api WHERE id ${DARI_IDS}`).bind(JSON.stringify([...new Set(ids)])).all()).results.filter(p.boleh);   // di luar wilayah dan tak ada: diam, tidak dicatat
  if (!ada.length) return json({dicatat: 0});
  try {
    const r = await env.DB.batch(ada.map(t => env.DB.prepare("INSERT OR IGNORE INTO monitor_baca (tugas_id, pihak, pembaca, nama, unit, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(t.id, p.pihak, p.pembaca, p.nama, p.unit, kini, p.dummy || t.dummy ? 1 : 0)));
    return json({dicatat: r.reduce((n, x) => n + x.meta.changes, 0)});
  } catch (e) { if (tabelBaca(e)) return gagal(503, "tanda baca belum aktif (migrasi 0062_monitor_baca belum diterapkan)"); throw e; }
}

async function berkas(env, req, id, kini, thumb) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  const m = await env.DB.prepare("SELECT m.mime, m.isian_id, m.dummy md, t.prov, t.kab, t.dummy FROM instansi_media m JOIN tugas_api t ON t.id = m.tugas_id WHERE m.id = ?").bind(id).first();
  if (!m || !m.isian_id || (m.md && !p.dummy) || !p.boleh(m)) return gagal(404, "berkas tidak ada");   // tidak ada, di luar wilayah, data contoh bagi pelaku nyata: 404 yang sama
  return kirimMedia(env, req, m, id, thumb);
}

/* Ringkasan publik untuk popup "situasi hari ini": hitungan agregat per provinsi, tanpa data pribadi. Tanpa sesi. Cache tepi 300 dtk (D1 Free: pindai tugas_api mahal). Hanya data nyata (dummy = 0). */
const ADA = (tbl, kond) => `EXISTS (SELECT 1 FROM ${tbl} x WHERE x.tugas_id = t.id AND ${kond})`;
const AGREGAT = baca => `SELECT t.prov, count(*) kejadian, sum(${baca ? ADA("monitor_baca", "x.pihak = 'dalops' AND x.dummy = 0") : "0"}) dimonitor, sum(${baca ? ADA("monitor_baca", "x.pihak = 'bpbd' AND x.dummy = 0") : "0"}) diinfokan,
  sum(${ADA("tugas_isian", "x.langkah = 'konfirmasi'")}) groundcheck, sum(${ADA("tugas_isian", "x.langkah = 'tindakan'")}) tindak, sum(t.status != 'buka') selesai
  FROM tugas_api t WHERE t.dummy = 0 AND (t.status = 'buka' OR t.dibuat > ? OR t.padam_pada > ?) AND ?1 GROUP BY t.prov`;
const NOL = {kejadian: 0, dimonitor: 0, diinfokan: 0, groundcheck: 0, tindak: 0, selesai: 0}, KUNCI = Object.keys(NOL);
async function ringkas(env, req, ctx, url, kini) {
  const bencana = url.searchParams.get("bencana") ?? "karhutla";
  if (!Object.hasOwn(FILTER_BENCANA, bencana)) return gagal(400, "bencana harus karhutla atau banjir");
  const kunci = new Request(`${url.origin}/api/pantau/ringkas?bencana=${bencana}`);
  return cacheTepi(kunci, ctx, 300, async () => {
    const jalan = async (baca, filter) => (await env.DB.prepare(AGREGAT(baca).replace("?1", filter.replace(/^AND /, "") || "1")).bind(kini - 72 * JAM, kini - 72 * JAM).all()).results;
    let R = [];
    try {
      try { R = await jalan(true, FILTER_BENCANA[bencana]); } catch (e) { if (!tabelBaca(e)) throw e; R = await jalan(false, FILTER_BENCANA[bencana]); }
    } catch (e) {
      if (tanpaBencana(e)) R = bencana === "banjir" ? [] : await jalan(true, "").catch(() => []);
      else if (!tanpaTabel(e)) throw e;
    }
    const prov = R.map(r => ({prov: r.prov, nama: PROV[r.prov]?.[1] ?? r.prov, ...Object.fromEntries(KUNCI.map(k => [k, r[k] ?? 0]))})).sort((a, b) => b.kejadian - a.kejadian);
    const total = {...NOL}; for (const r of prov) for (const k of KUNCI) total[k] += r[k];
    return json({bencana, kini, wa: normalWA(env.WA_NOMOR), total, prov});
  });
}

/* digabung ke RUTE di src/worker.js. Tabel instansi (0029) belum ada: 503 yang jelas, seperti RUTE_INSTANSI. */
export const RUTE_MONITOR = Object.fromEntries(Object.entries({
  "GET /api/monitor": (env, req, url, kini) => daftar(env, req, url, kini),
  "GET /api/pantau/ringkas": (env, req, url, kini, ctx) => ringkas(env, req, ctx, url, kini),
  "POST /api/monitor/baca": (env, req, url, kini) => tandaiBaca(env, req, kini),
  "GET /api/monitor/media/:id": (env, req, url, kini, ctx, id) => berkas(env, req, id, kini, false),
  "GET /api/monitor/thumb/:id": (env, req, url, kini, ctx, id) => berkas(env, req, id, kini, true),
}).map(([k, f]) => [k, async (...a) => { try { return await f(...a); } catch (e) { if (tanpaTabel(e)) return gagal(503, "fitur instansi belum diaktifkan (migrasi 0029 belum diterapkan)"); throw e; } }]));
