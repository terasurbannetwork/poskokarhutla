/* Rumah rusak per rumah (/rumah-rusak): RB / RS / RR seperti kolom Laporan Kejadian Bencana Harian BNPB. Skema: migrations/0024_rumah_rusak.sql.
   Pelapor = akun masuk (adminOK: ADMIN_TOKEN, AKUN_SITUS*, sesi) ATAU regu berkode (reguDari di src/posko.js, header x-kode-regu, dicek TIAP panggilan).
   Tidak ada rute publik: semua jawaban butuh salah satunya. Koreksi = adminOK saja, dalam satu batch dengan jejak (rumah_rusak_koreksi).
   Router worker.js hanya mengenal GET dan POST, jadi koreksi = POST /api/rumah-rusak/:id (bukan PATCH).
   Lokasi: titik yang ditandai (ketuk peta atau GPS) divalidasi bbox Indonesia; prov/kab/kec ditentukan SERVER dari wilayah() (klien tidak mengirimnya).
   ponytail: tanpa pemeriksaan GPS anti-palsu (src/gps.js): tim boleh menandai rumah dari jauh lewat peta. Pengaman = batas laju + dedup 10 m + koreksi admin. */
import {json, gagal, acak, adminOK, bersihTeks, bacaBody, bacaBytes, situsCenturisk} from "./worker.js";
import {reguDari, wib, tx, num, tglSah, buangExif} from "./posko.js";
import {laju, lajuIP} from "./bnpb.js";
import {wilayah, cariWilayah} from "./titik.js";
import {jenisBerkas} from "./foto.js";
import REGISTRY from "./bencana.generated.js";

const JAM = 3600e3, HARI = 24 * JAM, BBOX = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};
export const TINGKAT = ["berat", "sedang", "ringan"];
export const STATUS = ["sah", "ditolak"];
const MAKS_FOTO = 1.5 * 1048576, DEDUP_DERAJAT = 0.0001 /* ~11 m */, MAKS_DAFTAR = 500, MAKS_REKAP = 3000, JENDELA_TANGGAL = 120 * HARI, MAKS_RENTANG_REKAP = 366 * HARI;
const BATAS_BUAT = [[JAM, 60], [HARI, 400]], BATAS_IP = [[JAM, 240]], BATAS_FOTO = [[JAM, 60]];
const bencanaSah = id => typeof id === "string" && REGISTRY.bencana.some(b => b.id === id && b.status !== "mati");

/* siapa yang bertanya: {pid, admin, mod, regu} atau Response galat. Admin dicoba dulu; header kode hanya dibaca bila bukan admin. */
async function siapa(env, req, kini) {
  const mod = await adminOK(env, req, kini);
  if (mod) return {pid: `akun:${mod}`, admin: true, mod};
  if (!req.headers.get("x-kode-regu")) return gagal(403, "perlu masuk akun atau kode regu");
  const g = await reguDari(env, req, kini); if (g instanceof Response) return g;
  return {pid: `regu:${g.id}`, admin: false, regu: g};
}
const pakaiLaju = async (env, req, s, aksi, batas, kini) => (await laju(env, s.pid, aksi, batas, kini)) || (await lajuIP(env, req, aksi + ".ip", BATAS_IP, kini));

const KOLOM = "id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, foto, catatan, waktu, status, dikoreksi_oleh, dikoreksi_waktu";
const publik = (r, admin) => admin ? r : (({dikoreksi_oleh, ...x}) => x)(r);

/* ---------------------------------------------------------------- buat */
async function buat(env, req, url, kini) {
  const s = await siapa(env, req, kini); if (s instanceof Response) return s;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (!bencanaSah(o.bencana)) return gagal(400, `bencana harus salah satu dari ${REGISTRY.bencana.filter(x => x.status !== "mati").map(x => x.id).join(", ")}`);
  if (!TINGKAT.includes(o.tingkat)) return gagal(400, "tingkat harus berat, sedang, atau ringan");
  const tanggal = o.tanggal ?? wib(kini);
  if (typeof tanggal !== "string" || !tglSah(tanggal) || tanggal > wib(kini) || tanggal < wib(kini - JENDELA_TANGGAL)) return gagal(400, "tanggal kejadian harus YYYY-MM-DD, tidak di masa depan dan paling lama 120 hari lalu");
  const lat = num(o.lat, BBOX.latMin, BBOX.latMaks), lon = num(o.lon, BBOX.lonMin, BBOX.lonMaks);
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return gagal(400, "lat dan lon wajib berupa angka di dalam Indonesia");
  let catatan = tx(o.catatan, 300); if (catatan === undefined) return gagal(400, "catatan maksimal 300 karakter");
  if (catatan) { const c = bersihTeks(catatan); if (c.galat) return gagal(400, "catatan: " + c.galat); catatan = c.teks || null; }   // buang tautan dan nomor HP seperti laporan warga
  const k = cariWilayah(await wilayah(env), lat, lon); if (!k) return gagal(400, "titik ini tidak berada di wilayah daratan Indonesia");
  const [prov, kab, kec] = k.split("|");
  const la = Math.round(lat * 1e5) / 1e5, lo = Math.round(lon * 1e5) / 1e5;
  const g = await pakaiLaju(env, req, s, "rumah.buat", BATAS_BUAT, kini); if (g) return g;
  const id = acak(8);
  /* dedup ATOMIK: bencana + tanggal kejadian sama, ~10 m, dari SIAPA PUN (satu rumah = satu laporan), yang masih sah -> tidak disisipkan (cek-lalu-sisip bisa dilompati kiriman serentak) */
  const r = await env.DB.prepare(`INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, catatan, pelapor, waktu)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
    WHERE NOT EXISTS (SELECT 1 FROM rumah_rusak WHERE bencana = ?2 AND tanggal = ?3 AND status = 'sah' AND abs(lat - ?4) < ?13 AND abs(lon - ?5) < ?13)`)
    .bind(id, o.bencana, tanggal, la, lo, prov, kab, kec, o.tingkat, catatan, s.pid, kini, DEDUP_DERAJAT).run();
  if (!r.meta.changes) return gagal(409, "rumah ini (jarak sekitar 10 m, tanggal kejadian sama) sudah dilaporkan");
  return json({id, prov, kab, kec, tingkat: o.tingkat, tanggal}, 201);
}

/* ---------------------------------------------------------------- daftar */
function bboxDari(t) {
  if (t == null) return null;
  const a = t.split(",").map(x => x.trim() === "" ? NaN : Number(x));
  return a.length === 4 && a.every(Number.isFinite) && a[0] < a[2] && a[1] < a[3] ? a : false;
}
async function daftar(env, req, url, kini) {
  const s = await siapa(env, req, kini); if (s instanceof Response) return s;
  const q = url.searchParams, w = [], p = [];
  const bencana = q.get("bencana"), dari = q.get("dari"), sampai = q.get("sampai"), status = q.get("status"), bb = bboxDari(q.get("bbox"));
  if (bencana != null) { if (!bencanaSah(bencana)) return gagal(400, "bencana tidak dikenal"); w.push("bencana = ?"); p.push(bencana); }
  if (dari != null) { if (!tglSah(dari)) return gagal(400, "dari harus YYYY-MM-DD"); w.push("tanggal >= ?"); p.push(dari); }
  if (sampai != null) { if (!tglSah(sampai)) return gagal(400, "sampai harus YYYY-MM-DD"); w.push("tanggal <= ?"); p.push(sampai); }
  if (status != null) { if (!STATUS.includes(status)) return gagal(400, "status harus sah atau ditolak"); w.push("status = ?"); p.push(status); }
  if (bb === false) return gagal(400, "bbox harus latMin,lonMin,latMaks,lonMaks (angka, min < maks)");
  if (bb) { w.push("lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?"); p.push(bb[0], bb[2], bb[1], bb[3]); }
  const saya = q.get("saya") === "1" || !s.admin;   // regu hanya melihat laporannya sendiri; akun boleh semua, atau ?saya=1
  if (saya) { w.push("pelapor = ?"); p.push(s.pid); }
  const baris = (await env.DB.prepare(`SELECT ${KOLOM}${s.admin ? ", pelapor" : ""} FROM rumah_rusak ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY waktu DESC LIMIT ${MAKS_DAFTAR}`).bind(...p).all()).results;
  return json({jumlah: baris.length, batas: MAKS_DAFTAR, laporan: baris.map(r => publik(r, s.admin))}, 200, {"cache-control": "no-store"});
}

/* ---------------------------------------------------------------- rekap (kolom RB/RS/RR laporan harian BNPB) */
async function rekap(env, req, url, kini) {
  const s = await siapa(env, req, kini); if (s instanceof Response) return s;
  const q = url.searchParams, hariIni = wib(kini), dari = q.get("dari") ?? hariIni, sampai = q.get("sampai") ?? dari, bencana = q.get("bencana"), prov = q.get("prov");
  if (!tglSah(dari) || !tglSah(sampai) || dari > sampai) return gagal(400, "dari/sampai harus YYYY-MM-DD dan dari <= sampai");
  if (Date.parse(sampai) - Date.parse(dari) > MAKS_RENTANG_REKAP) return gagal(400, "rentang maksimal 366 hari");
  if (bencana != null && !bencanaSah(bencana)) return gagal(400, "bencana tidak dikenal");
  if (prov != null && !/^\d{2}$/.test(prov)) return gagal(400, "prov harus kode 2 digit");
  const w = ["status = 'sah'", "tanggal BETWEEN ? AND ?"], p = [dari, sampai];
  if (bencana) { w.push("bencana = ?"); p.push(bencana); }
  if (prov) { w.push("prov = ?"); p.push(prov); }
  const kec = (await env.DB.prepare(`SELECT bencana, prov, kab, kec, sum(tingkat = 'berat') berat, sum(tingkat = 'sedang') sedang, sum(tingkat = 'ringan') ringan, count(*) total
    FROM rumah_rusak WHERE ${w.join(" AND ")} GROUP BY bencana, prov, kab, kec ORDER BY bencana, prov, kab, kec LIMIT ${MAKS_REKAP}`).bind(...p).all()).results;
  const kabMap = new Map(), total = {berat: 0, sedang: 0, ringan: 0, total: 0};
  for (const r of kec) {
    const k = `${r.bencana}|${r.prov}|${r.kab}`, a = kabMap.get(k) || kabMap.set(k, {bencana: r.bencana, prov: r.prov, kab: r.kab, berat: 0, sedang: 0, ringan: 0, total: 0}).get(k);
    for (const t of Object.keys(total)) { a[t] += r[t]; total[t] += r[t]; }
  }
  return json({dari, sampai, bencana: bencana || null, prov: prov || null, kec, kab: [...kabMap.values()], total}, 200, {"cache-control": "no-store"});
}

/* ---------------------------------------------------------------- koreksi admin */
async function koreksi(env, req, id, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "koreksi hanya untuk admin");
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, alasan = tx(o.alasan, 200);
  if (!alasan || alasan.length < 3) return gagal(400, "alasan koreksi wajib (3-200 karakter)");
  const ada = await env.DB.prepare("SELECT tingkat, status, catatan FROM rumah_rusak WHERE id = ?").bind(id).first(); if (!ada) return gagal(404, "laporan tidak ada");
  const baru = {...ada};
  if ("tingkat" in o) { if (!TINGKAT.includes(o.tingkat)) return gagal(400, "tingkat harus berat, sedang, atau ringan"); baru.tingkat = o.tingkat; }
  if ("status" in o) { if (!STATUS.includes(o.status)) return gagal(400, "status harus sah atau ditolak"); baru.status = o.status; }
  if ("catatan" in o) { const c = tx(o.catatan, 300); if (c === undefined) return gagal(400, "catatan maksimal 300 karakter"); baru.catatan = c; }
  if (baru.tingkat === ada.tingkat && baru.status === ada.status && baru.catatan === ada.catatan) return gagal(400, "tidak ada yang berubah (tingkat, status, atau catatan)");
  await env.DB.batch([
    env.DB.prepare("UPDATE rumah_rusak SET tingkat = ?, status = ?, catatan = ?, dikoreksi_oleh = ?, dikoreksi_waktu = ? WHERE id = ?").bind(baru.tingkat, baru.status, baru.catatan, mod, kini, id),
    env.DB.prepare("INSERT INTO rumah_rusak_koreksi (rumah_id, waktu, oleh, sebelum, sesudah, alasan) VALUES (?, ?, ?, ?, ?, ?)").bind(id, kini, mod, JSON.stringify(ada), JSON.stringify(baru), alasan)]);
  return json({id, ...baru});
}

/* ---------------------------------------------------------------- foto (R2 MEDIA, kunci rumah/<id>) */
async function fotoUnggah(env, req, id, kini) {
  const s = await siapa(env, req, kini); if (s instanceof Response) return s;
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum aktif (R2 MEDIA); laporan tetap tersimpan tanpa foto");
  const r = await env.DB.prepare("SELECT foto, pelapor FROM rumah_rusak WHERE id = ?").bind(id).first();
  if (!r || r.pelapor !== s.pid) return gagal(404, "laporan tidak ada");   // hanya pelapor aslinya; koreksi admin tidak mengganti foto
  if (r.foto) return gagal(409, "laporan ini sudah punya foto");
  const g = await laju(env, s.pid, "rumah.foto", BATAS_FOTO, kini); if (g) return g;   // laju SEBELUM membaca badan
  const u = await bacaBytes(req, MAKS_FOTO); if (u.galat) return gagal(u.status || 400, u.galat);
  if (jenisBerkas(u.b) !== "image/jpeg") return gagal(400, "berkas harus foto JPEG");   // klien selalu mengodekan ulang lewat canvas
  /* klaim dulu (UPDATE ... foto = 0), baru tulis R2: unggahan serentak yang kalah dapat 409 dan tidak menimpa berkas pemenang */
  const ubah = await env.DB.prepare("UPDATE rumah_rusak SET foto = 1 WHERE id = ? AND foto = 0").bind(id).run();
  if (!ubah.meta.changes) return gagal(409, "laporan ini sudah punya foto");
  try { await env.MEDIA.put(`rumah/${id}`, buangExif(u.b), {httpMetadata: {contentType: "image/jpeg"}}); }   // EXIF/GPS perangkat tidak disimpan
  catch (e) { await env.DB.prepare("UPDATE rumah_rusak SET foto = 0 WHERE id = ?").bind(id).run(); throw e; }   // R2 gagal: tidak ada baris bertanda foto tanpa berkas
  return json({id, foto: true});
}
async function fotoBaca(env, req, id, kini) {
  const s = await siapa(env, req, kini); if (s instanceof Response) return s;
  const r = await env.DB.prepare("SELECT foto, pelapor FROM rumah_rusak WHERE id = ?").bind(id).first();
  const o = r?.foto && (s.admin || r.pelapor === s.pid) && env.MEDIA ? await env.MEDIA.get(`rumah/${id}`) : null;
  return o ? new Response(o.body, {headers: {"content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff"}}) : gagal(404, "foto tidak ada");
}

/* ---------------------------------------------------------------- halaman: hanya situs Centurisk97; CSP ketat (peta MapLibre dari cdnjs + ubin OpenFreeMap) */
const CSP = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.openfreemap.org; connect-src 'self' https://*.openfreemap.org; worker-src blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
async function halaman(env, url) {
  if (!situsCenturisk(url.hostname) && url.hostname !== "localhost") return new Response("Tidak ditemukan", {status: 404});
  const r = await env.ASSETS.fetch(new Request(new URL("/rumah_rusak.html", url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman rumah rusak tidak ada"); }
  return new Response(r.body, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow", "content-security-policy": CSP}});
}

/* digabung ke RUTE di src/worker.js. "GET /rumah-rusak" = kerangka halaman tanpa data (data tetap menuntut akun/kode di tiap panggilan API) */
export const RUTE_RUMAH_RUSAK = {
  "GET /rumah-rusak": (env, req, url) => halaman(env, url),
  "POST /api/rumah-rusak": (env, req, url, kini) => buat(env, req, url, kini),
  "GET /api/rumah-rusak": (env, req, url, kini) => daftar(env, req, url, kini),
  "GET /api/rumah-rusak/rekap": (env, req, url, kini) => rekap(env, req, url, kini),
  "POST /api/rumah-rusak/:id": (env, req, url, kini, ctx, id) => koreksi(env, req, id, kini),
  "POST /api/rumah-rusak/foto/:id": (env, req, url, kini, ctx, id) => fotoUnggah(env, req, id, kini),
  "GET /api/rumah-rusak/foto/:id": (env, req, url, kini, ctx, id) => fotoBaca(env, req, id, kini),
};
