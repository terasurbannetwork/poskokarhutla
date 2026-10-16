/* Lapor Warga — API /api/warga di atas D1 (binding DB). Selain /api/warga* diteruskan ke aset statis (binding ASSETS),
   jadi situs tetap jalan seperti sebelumnya. Rahasia: IP_SALT (wajib untuk menulis), ADMIN_TOKEN, TURNSTILE_SECRET (opsional).
   Aturan privasi: IP mentah tidak pernah disimpan (SHA-256 bergaram), kontak WA tidak pernah ikut di daftar/rincian,
   hanya lewat POST /:id/kontak yang dibatasi lajunya, dan dihapus cron setelah 72 jam. */
import {JENIS, BAHAYA} from "../public/informasi_jenis.js";
import {perbaruiTitik, titikTerbaru} from "./titik.js";
import * as St from "./statistik.js";
import * as Pub from "./publik.js";
import {terapkanOg} from "./og_meta.js";
import {ruteBencana, sumberStatus, sitemap} from "./bencana.js";
import {halamanMasuk, halamanStatistik, halamanPesan, halamanPublik, halamanFoto} from "./admin_halaman.js";
import {RUTE_FOTO, bersihkanFoto, ogFoto} from "./foto.js";

const JAM = 3600e3, HARI = 24 * JAM, CRON_TITIK = "15 */3 * * *";
const BATAS_ID = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};
/* aksi -> [[jendela ms, maks], ...] per hash IP */
export const BATAS = {lapor: [[JAM, 10], [HARI, 30]], konfirmasi: [[JAM, 60]], aduan: [[JAM, 20]], kontak: [[JAM, 5], [HARI, 15]], selesai: [[JAM, 30]],
  masuk: [[JAM / 4, 8], [HARI, 40]], pesan: [[JAM, 5], [HARI, 20]]};
const LAJU_BARU = ["masuk", "pesan"];   // dicatat di tabel laju (CHECK tabel jejak tidak bisa diubah)
const BATAS_GLOBAL_LAPOR = 600;          // laporan baru per jam dari semua orang; di atasnya API menolak (banjir spam)
const MAKS_DAFTAR = 1000, MAKS_TEKS = 280, MAKS_BODY = 4096;
const KONTAK_UMUR = 72 * JAM, RADIUS_LANJUT = 150, RADIUS_KEMBAR = 200, RADIUS_API = 2000;
const KASAR = ["anjing lu", "bangsat", "kontol", "memek", "ngentot", "jancok", "jancuk", "bajingan", "goblok", "tolol", "kampret", "pelacur", "lonte"];

export const json = (data, status = 200, h = {}) => new Response(JSON.stringify(data), {status,
  headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...h}});
export const gagal = (status, pesan, h) => json({galat: pesan}, status, h);
export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export const sha = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
export const acak = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const jarak = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371e3; };
const kelas = (j, s) => JENIS[j]?.sub[s]?.[1];

/* ---------------- teks publik: buang tautan & nomor, tolak kata kasar ---------------- */
const RE_URL = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|id|co|io|xyz|me|info|biz|site|online|link|ly|gl|app|top|club|shop|store|click)(?:\/\S*)?/gi;
const RE_HP = /(?:\+|\b)\d(?:[\s.\-()]?\d){8,}/g;
export function bersihTeks(t) {
  const asli = String(t ?? "").normalize("NFC").replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮]/g, "");
  if (asli.length > MAKS_TEKS) return {galat: `teks ${asli.length} karakter, maksimal ${MAKS_TEKS}`};
  const kecil = asli.toLowerCase();
  if (KASAR.some(k => new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(kecil))) return {galat: "teks memuat kata kasar"};
  if (/(.)\1{7,}/u.test(asli)) return {galat: "teks berisi karakter berulang (spam)"};
  const teks = asli.replace(RE_URL, "[tautan dihapus]").replace(RE_HP, "[nomor dihapus]").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return {teks: teks.slice(0, MAKS_TEKS)};
}

/* ---------------- isian tambahan per jenis -> objek detail yang sudah bersih ---------------- */
export function bersihDetail(jenis, d) {
  const spek = JENIS[jenis].isian || {}, keluar = {};
  if (d != null && (typeof d !== "object" || Array.isArray(d))) return {galat: "detail harus objek"};
  for (const k of Object.keys(d || {})) {
    const s = spek[k], v = d[k];
    if (!s) return {galat: `isian '${k}' tidak dikenal untuk jenis ${jenis}`};
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (s.tipe === "pilih") { if (!(v in s.nilai)) return {galat: `nilai '${v}' tidak sah untuk ${k}`}; keluar[k] = v; }
    else if (s.tipe === "multi") { if (!Array.isArray(v) || v.some(x => !(x in s.nilai)) || v.length > 10) return {galat: `nilai tidak sah untuk ${k}`}; keluar[k] = [...new Set(v)]; }
    else if (s.tipe === "ya") { if (typeof v !== "boolean") return {galat: `${k} harus true/false`}; keluar[k] = v; }
  }
  for (const [k, s] of Object.entries(spek)) if (s.wajib && !(k in keluar)) return {galat: `isian '${k}' wajib untuk jenis ${jenis}`};
  return {detail: keluar};
}

export function normalWA(s) {
  const d = String(s ?? "").replace(/[\s\-().]/g, "");
  const m = d.match(/^(?:\+?62|0)(8\d{7,12})$/);
  return m ? "62" + m[1] : null;
}

/* ---------------- titik panas 24 jam (public/data/titik24.json dari scripts/warga/titik24.py) ---------------- */
let TITIK = null;
async function titikPanas(env, asal) {
  if (TITIK && Date.now() - TITIK.dimuat < 10 * 60e3) return TITIK;
  try {
    const r = await env.ASSETS.fetch(new Request(new URL("/data/titik24.json", asal)));
    if (!r.ok) throw new Error(r.status);
    const d = await r.json(), sel = new Map();
    for (const [la, lo, k] of d.titik) { const key = Math.floor(la / .02) + "," + Math.floor(lo / .02); (sel.get(key) || sel.set(key, []).get(key)).push([la, lo, k]); }
    TITIK = {dimuat: Date.now(), acuan: Date.parse(d.acuan), laci: d.laci, sel};
  } catch (e) { TITIK = {dimuat: Date.now(), acuan: 0, laci: [], sel: new Map()}; }
  return TITIK;
}
async function dekatApi(env, asal, lat, lon, kini) {
  const T = await titikPanas(env, asal);
  if (!T.acuan || kini - T.acuan > 30 * JAM) return {dekat: 0, laci: null};   // data basi: jangan memberi lencana
  const i = Math.floor(lat / .02), j = Math.floor(lon / .02);
  let dekat = 0, laci = null, bl = RADIUS_API;   // kompleks: titik berlaci terdekat dalam radius, walau titik tanpa laci lebih dekat
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++)
    for (const t of T.sel.get(i + a + "," + (j + b)) || []) { const m = jarak(lat, lon, t[0], t[1]); if (m > RADIUS_API) continue; dekat = 1;
      if (t[2] >= 0 && m <= bl) { bl = m; laci = T.laci[t[2]] ?? null; } }
  return {dekat, laci};
}

/* ---------------- batas laju ---------------- */
export async function cekLaju(env, ip, aksi, kini) {
  const tabel = LAJU_BARU.includes(aksi) ? "laju" : "jejak";
  for (const [jendela, maks] of BATAS[aksi]) {
    const r = await env.DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ip_hash = ? AND aksi = ? AND waktu > ?`).bind(ip, aksi, kini - jendela).first();
    if (r.n >= maks) return gagal(429, `batas ${aksi}: ${maks} per ${jendela / JAM} jam sudah tercapai (${r.n})`, {"retry-after": String(Math.ceil(jendela / 1000))});
  }
  await env.DB.prepare(`INSERT INTO ${tabel} (ip_hash, aksi, waktu) VALUES (?, ?, ?)`).bind(ip, aksi, kini).run();
  return null;
}
/* IPv6: satu pelanggan biasanya memegang satu /64 utuh, jadi batas laju per alamat penuh bisa diakali dengan memutar
   alamat (panen nomor WA di /kontak, banjir laporan). Kunci laju = prefiks /64. IPv4 apa adanya.
   ponytail: CGNAT IPv4 seluler membuat banyak warga berbagi satu IP; naikkan batas atau pakai Turnstile bila keluhan muncul. */
export function kunciIP(ip) {
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [a, b] = ip.split("::"), h = a ? a.split(":") : [], t = b ? b.split(":") : [];
  return [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t].slice(0, 4).map(x => parseInt(x || "0", 16).toString(16)).join(":") + "::/64";
}
export const ipHash = (env, req) => sha(env.IP_SALT + "|" + kunciIP(req.headers.get("cf-connecting-ip") || "lokal"));

export async function bacaBody(req) {
  const t = await req.text();
  if (t.length > MAKS_BODY) return {galat: `body ${t.length} byte, maksimal ${MAKS_BODY}`};
  try { const o = JSON.parse(t || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? {o} : {galat: "body harus objek JSON"}; }
  catch (e) { return {galat: "body bukan JSON"}; }
}

/* Turnstile aktif hanya bila KEDUANYA diset: TURNSTILE_SITEKEY (vars, dipantulkan /api/warga/konfig ke peramban) dan
   TURNSTILE_SECRET (secret). Rahasia tanpa sitekey = peramban tak pernah merender widget -> semua kiriman ditolak; jadi dilewati. */
export async function turnstileOK(env, token, req) {
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_SITEKEY) return true;
  if (typeof token !== "string" || !token) return false;
  const f = new FormData(); f.append("secret", env.TURNSTILE_SECRET); f.append("response", token);
  const ip = req.headers.get("cf-connecting-ip"); if (ip) f.append("remoteip", ip);
  try { return (await (await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {method: "POST", body: f})).json()).success === true; }
  catch (e) { return false; }
}

/* ---------------- baris -> GeoJSON (tanpa kontak, tanpa hash) ---------------- */
const KOLOM = "l.id, l.jenis, l.sub, l.bahaya, l.lat, l.lon, l.teks, l.detail, l.jumlah, l.dibuat, l.kedaluwarsa, l.selesai, l.benar, l.salah, l.dekat_titik_panas, l.laci, l.induk, l.durasi_buruk";
const fitur = (r, kini) => ({type: "Feature", id: r.id, geometry: {type: "Point", coordinates: [r.lon, r.lat]},
  properties: {id: r.id, jenis: r.jenis, sub: r.sub, bahaya: r.bahaya, teks: r.teks, detail: JSON.parse(r.detail || "{}"), jumlah: r.jumlah,
    dibuat: r.dibuat, kedaluwarsa: r.kedaluwarsa, selesai: !!r.selesai, benar: r.benar, salah: r.salah, titik_panas: !!r.dekat_titik_panas,
    laci: r.laci, induk: r.induk, durasi_buruk: r.durasi_buruk, kontak: !!r.ada_kontak, kedaluwarsa_lewat: r.kedaluwarsa <= kini}});
const ADA_KONTAK = kini => `EXISTS (SELECT 1 FROM kontak k WHERE k.laporan_id = l.id AND k.dibuat > ${Math.floor(kini - KONTAK_UMUR)}) AS ada_kontak`;

async function rantai(env, id) {
  return (await env.DB.prepare(`WITH RECURSIVE r(id, induk, d) AS (SELECT id, induk, 0 FROM laporan WHERE id = ?
    UNION ALL SELECT l.id, l.induk, r.d + 1 FROM laporan l JOIN r ON l.id = r.induk WHERE r.d < 50)
    SELECT l.id, l.sub, l.dibuat, l.teks, l.disembunyikan, r.d FROM r JOIN laporan l ON l.id = r.id ORDER BY r.d`).bind(id).all()).results;
}

/* ================================================================ rute */
async function daftar(env, url, kini) {
  const q = url.searchParams, ikat = [kini];
  let where = `l.disembunyikan = 0 AND l.selesai = 0 AND l.kedaluwarsa > ? AND NOT (l.salah >= 3 AND l.salah > l.benar)
    AND NOT EXISTS (SELECT 1 FROM laporan c WHERE c.induk = l.id AND c.disembunyikan = 0)`;
  const jam = q.has("jam") ? Number(q.get("jam")) : 168;
  if (!Number.isInteger(jam) || jam < 1 || jam > 168) return gagal(400, `jam harus bilangan bulat 1–168, diterima '${q.get("jam")}'`);
  where += " AND l.dibuat >= ?"; ikat.push(kini - jam * JAM);
  if (q.get("bbox")) {
    const b = q.get("bbox").split(",").map(Number);
    if (b.length !== 4 || b.some(x => !Number.isFinite(x)) || b[0] > b[2] || b[1] > b[3]) return gagal(400, "bbox harus barat,selatan,timur,utara");
    where += " AND l.lon BETWEEN ? AND ? AND l.lat BETWEEN ? AND ?"; ikat.push(b[0], b[2], b[1], b[3]);
  }
  if (q.get("jenis")) {
    const js = q.get("jenis").split(",");
    const salah = js.find(j => !JENIS[j]); if (salah) return gagal(400, `jenis '${salah}' tidak dikenal`);
    where += ` AND l.jenis IN (${js.map(() => "?").join(",")})`; ikat.push(...js);
  }
  if (q.get("bahaya")) { if (!BAHAYA[q.get("bahaya")]) return gagal(400, "bahaya tidak dikenal"); }
  const r = await env.DB.prepare(`SELECT ${KOLOM}, ${ADA_KONTAK(kini)} FROM laporan l WHERE ${where} ORDER BY l.dibuat DESC LIMIT ${MAKS_DAFTAR + 1}`).bind(...ikat).all();
  const rows = r.results;
  return json({type: "FeatureCollection", terpotong: rows.length > MAKS_DAFTAR, kini, features: rows.slice(0, MAKS_DAFTAR).map(x => fitur(x, kini))});
}

async function rincian(env, id, kini) {
  const r = await env.DB.prepare(`SELECT ${KOLOM}, l.disembunyikan, ${ADA_KONTAK(kini)} FROM laporan l WHERE l.id = ?`).bind(id).first();
  if (!r || r.disembunyikan) return gagal(404, "laporan tidak ada atau disembunyikan");
  const f = fitur(r, kini);
  f.properties.riwayat = (await rantai(env, id)).filter(x => x.d > 0 && !x.disembunyikan).map(x => ({id: x.id, sub: x.sub, dibuat: x.dibuat, teks: x.teks}));
  const anak = await env.DB.prepare("SELECT id FROM laporan WHERE induk = ? AND disembunyikan = 0 ORDER BY dibuat DESC LIMIT 1").bind(id).first();
  f.properties.digantikan = anak?.id || null;
  return json(f);
}

async function buat(env, req, url, kini) {
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const o = b.o, J = JENIS[o.jenis];
  if (!J) return gagal(400, `jenis '${o.jenis}' tidak dikenal`);
  if (!J.sub[o.sub]) return gagal(400, `sub '${o.sub}' tidak sah untuk jenis ${o.jenis}`);
  const bahaya = o.bahaya || "umum";
  if (!BAHAYA[bahaya]) return gagal(400, `bahaya '${bahaya}' tidak dikenal`);
  if (J.bahaya && !J.bahaya.includes(bahaya)) return gagal(400, `jenis ${o.jenis} hanya untuk bahaya ${J.bahaya.join("/")}`);
  let lat = Number(o.lat), lon = Number(o.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < BATAS_ID.latMin || lat > BATAS_ID.latMaks || lon < BATAS_ID.lonMin || lon > BATAS_ID.lonMaks)
    return gagal(400, `koordinat ${o.lat},${o.lon} di luar Indonesia (lat ${BATAS_ID.latMin}..${BATAS_ID.latMaks}, lon ${BATAS_ID.lonMin}..${BATAS_ID.lonMaks})`);
  const t = bersihTeks(o.teks); if (t.galat) return gagal(400, t.galat);
  if (o.jenis === "info" && t.teks.length < 5) return gagal(400, "pesan minimal 5 karakter");
  const d = bersihDetail(o.jenis, o.detail); if (d.galat) return gagal(400, d.galat);
  let jumlah = null;
  if (o.jumlah != null && o.jumlah !== "") {
    if (!J.jumlah) return gagal(400, `jenis ${o.jenis} tidak memakai jumlah`);
    jumlah = Number(o.jumlah); if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 100000) return gagal(400, `jumlah ${o.jumlah} harus 1–100000`);
  }
  let wa = null;
  if (o.kontak != null && o.kontak !== "") {
    if (!J.bantuan) return gagal(400, `kontak hanya untuk laporan bantuan, bukan ${o.jenis}`);
    wa = normalWA(o.kontak); if (!wa) return gagal(400, "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)");
  }
  if (!(await turnstileOK(env, o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const ip = await ipHash(env, req);
  const g = await env.DB.prepare("SELECT count(*) n FROM jejak WHERE aksi = 'lapor' AND waktu > ?").bind(kini - JAM).first();
  if (g.n >= BATAS_GLOBAL_LAPOR) return gagal(503, `sistem menerima ${g.n} laporan dalam sejam terakhir; coba lagi nanti`, {"retry-after": "600"});
  const laju = await cekLaju(env, ip, "lapor", kini); if (laju) return laju;

  // laporan lanjutan: eksplisit (induk) atau otomatis (jenis lanjut, ≤150 m, laporan aktif terbaru tanpa anak)
  let induk = null;
  if (o.induk != null) {
    if (!J.lanjut) return gagal(400, `jenis ${o.jenis} tidak bisa diberi laporan lanjutan`);
    const p = await env.DB.prepare("SELECT id, jenis, lat, lon, bahaya, disembunyikan FROM laporan WHERE id = ?").bind(String(o.induk)).first();
    if (!p || p.disembunyikan) return gagal(404, `laporan induk '${o.induk}' tidak ada atau disembunyikan`);
    if (p.jenis !== o.jenis) return gagal(400, `laporan lanjutan harus berjenis ${p.jenis}, diterima ${o.jenis}`);
    induk = p.id; lat = p.lat; lon = p.lon;
  } else if (J.lanjut) {
    const dl = RADIUS_LANJUT / 111e3, dn = dl / Math.cos(lat * Math.PI / 180);
    const c = (await env.DB.prepare(`SELECT id, lat, lon FROM laporan l WHERE jenis = ? AND disembunyikan = 0 AND kedaluwarsa > ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
      AND NOT EXISTS (SELECT 1 FROM laporan c WHERE c.induk = l.id AND c.disembunyikan = 0) ORDER BY dibuat DESC LIMIT 20`)
      .bind(o.jenis, kini, lat - dl, lat + dl, lon - dn, lon + dn).all()).results.find(x => jarak(lat, lon, x.lat, x.lon) <= RADIUS_LANJUT);
    if (c) induk = c.id;
  }
  if (!induk) {   // laporan kembar dari orang yang sama: tolak
    const dl = RADIUS_KEMBAR / 111e3, dn = dl / Math.cos(lat * Math.PI / 180);
    const k = (await env.DB.prepare("SELECT lat, lon FROM laporan WHERE ip_hash = ? AND jenis = ? AND sub = ? AND dibuat > ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?")
      .bind(ip, o.jenis, o.sub, kini - 30 * 60e3, lat - dl, lat + dl, lon - dn, lon + dn).all()).results.find(x => jarak(lat, lon, x.lat, x.lon) <= RADIUS_KEMBAR);
    if (k) return gagal(409, "laporan yang sama dari Anda di titik ini sudah ada dalam 30 menit terakhir");
  }
  if (J.bulat) { lat = Math.round(lat * 100) / 100; lon = Math.round(lon * 100) / 100; }
  else { lat = Math.round(lat * 1e5) / 1e5; lon = Math.round(lon * 1e5) / 1e5; }

  let durasi = null;
  if (induk && kelas(o.jenis, o.sub) !== "buruk") {
    const r = await rantai(env, induk); let awal = null;
    for (const x of r) { if (x.disembunyikan) continue; if (kelas(o.jenis, x.sub) !== "buruk") break; awal = x.dibuat; }
    if (awal != null) durasi = kini - awal;
  }
  const api = o.jenis === "api" ? await dekatApi(env, url, lat, lon, kini) : {dekat: 0, laci: null};
  const id = acak(8), token = acak(16);
  const st = [env.DB.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, teks, detail, jumlah, dibuat, kedaluwarsa, dekat_titik_panas, laci, induk, durasi_buruk, ip_hash, token_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, o.jenis, o.sub, bahaya, lat, lon, t.teks, JSON.stringify(d.detail), jumlah, kini, kini + J.umur * JAM, api.dekat, api.laci, induk, durasi, ip, await sha(token))];
  if (wa) st.push(env.DB.prepare("INSERT INTO kontak (laporan_id, wa, dibuat) VALUES (?, ?, ?)").bind(id, wa, kini));
  await env.DB.batch(st);
  return json({id, token, induk, durasi_buruk: durasi, titik_panas: !!api.dekat, laci: api.laci}, 201);
}

async function suara(env, req, id, kelompok, kini) {
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const nilai = String(b.o.nilai ?? (kelompok === "aduan" ? "lainnya" : ""));
  const sah = kelompok === "konfirmasi" ? ["benar", "salah"] : ["spam", "palsu", "kasar", "pribadi", "lainnya"];
  if (!sah.includes(nilai)) return gagal(400, `nilai '${nilai}' tidak sah; pilih ${sah.join("/")}`);
  const ada = await env.DB.prepare("SELECT disembunyikan FROM laporan WHERE id = ?").bind(id).first();
  if (!ada || ada.disembunyikan) return gagal(404, "laporan tidak ada atau disembunyikan");
  const ip = await ipHash(env, req);
  const laju = await cekLaju(env, ip, kelompok === "aduan" ? "aduan" : "konfirmasi", kini); if (laju) return laju;
  await env.DB.prepare(`INSERT INTO suara (laporan_id, ip_hash, kelompok, nilai, waktu) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (laporan_id, ip_hash, kelompok) DO UPDATE SET nilai = excluded.nilai, waktu = excluded.waktu`).bind(id, ip, kelompok, nilai, kini).run();
  const r = await env.DB.prepare("SELECT benar, salah, aduan, disembunyikan FROM laporan WHERE id = ?").bind(id).first();
  return json({benar: r.benar, salah: r.salah, disembunyikan: !!r.disembunyikan});
}

async function kontak(env, req, id, kini) {
  const ip = await ipHash(env, req);
  const laju = await cekLaju(env, ip, "kontak", kini); if (laju) return laju;
  const r = await env.DB.prepare(`SELECT k.wa FROM kontak k JOIN laporan l ON l.id = k.laporan_id
    WHERE k.laporan_id = ? AND k.dibuat > ? AND l.disembunyikan = 0 AND l.selesai = 0 AND l.kedaluwarsa > ?`).bind(id, kini - KONTAK_UMUR, kini).first();
  if (!r) return gagal(404, "kontak tidak tersedia (tidak diisi, sudah lewat 72 jam, atau laporan selesai)");
  return json({wa: r.wa, tautan: "https://wa.me/" + r.wa});
}

async function selesai(env, req, id, kini) {
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const ip = await ipHash(env, req);
  const laju = await cekLaju(env, ip, "selesai", kini); if (laju) return laju;
  const r = await env.DB.prepare("SELECT jenis, token_hash FROM laporan WHERE id = ?").bind(id).first();
  if (!r || r.token_hash !== await sha(String(b.o.token ?? ""))) return gagal(403, "token pelapor tidak cocok");
  await env.DB.batch([env.DB.prepare("UPDATE laporan SET selesai = 1 WHERE id = ?").bind(id), env.DB.prepare("DELETE FROM kontak WHERE laporan_id = ?").bind(id)]);
  return json({selesai: true});
}

/* ADMIN_TOKEN boleh berisi beberapa token dipisah koma (satu per moderator); yang cocok -> 12 karakter awal hash-nya = moderator.
   Entri berbentuk "email:sandi" adalah akun untuk form /admin/masuk (sandi tanpa koma, tanpa spasi di ujung).
   Diterima lewat header x-admin-token / Authorization: Bearer (skrip), atau cookie sesi dari /admin/masuk (peramban). */
export async function adminOK(env, req, kini = Date.now()) {
  if (!env.ADMIN_TOKEN) return null;
  const sah = await Promise.all(env.ADMIN_TOKEN.split(",").map(x => x.trim()).filter(Boolean).map(sha));
  const t = req.headers.get("x-admin-token") ?? (req.headers.get("authorization") || "").match(/^Bearer\s+(\S+)/i)?.[1];
  if (t != null) { const a = await sha(t.trim()); return sah.includes(a) ? a.slice(0, 12) : null; }
  return St.sesiOK(env, req, kini, sah.map(a => a.slice(0, 12)));
}
const AKSI_ADMIN = ["sembunyikan", "tampilkan", "hapus", "hapus_pengirim"];
async function admin(env, req, url, id, kini) {
  const mod = await adminOK(env, req);
  if (!mod) return gagal(403, "token admin salah atau ADMIN_TOKEN belum diset");
  if (req.method === "GET") {
    if (url.searchParams.get("audit") === "1")
      return json((await env.DB.prepare("SELECT waktu, moderator, aksi, laporan_id, jumlah, alasan FROM audit_moderasi ORDER BY id DESC LIMIT 300").all()).results);
    const tersembunyi = url.searchParams.get("tersembunyi") === "1";
    const r = await env.DB.prepare(`SELECT ${KOLOM}, l.aduan, l.disembunyikan, l.ip_hash FROM laporan l ${tersembunyi ? "WHERE l.disembunyikan = 1 OR l.aduan > 0" : ""} ORDER BY l.dibuat DESC LIMIT 300`).all();
    return json(r.results.map(x => ({...x, detail: JSON.parse(x.detail)})));
  }
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const aksi = b.o.aksi, alasan = String(b.o.alasan ?? "").slice(0, 200);
  if (!AKSI_ADMIN.includes(aksi)) return gagal(400, `aksi harus ${AKSI_ADMIN.join("/")}`);
  const p = await env.DB.prepare("SELECT ip_hash FROM laporan WHERE id = ?").bind(id).first();
  if (!p) return gagal(404, "laporan tidak ada");
  const catat = (n = 1) => env.DB.prepare("INSERT INTO audit_moderasi (waktu, moderator, aksi, laporan_id, jumlah, alasan) VALUES (?, ?, ?, ?, ?, ?)").bind(kini, mod, aksi, id, n, alasan);
  /* hapus = soft-delete: tersembunyi (bisa dipulihkan lewat 'tampilkan' sampai cron membuangnya 30 hari kemudian), kontak WA langsung dibuang */
  const sembunyi = (kolom, nilai) => [env.DB.prepare(`UPDATE laporan SET disembunyikan = 1 WHERE ${kolom} = ?`).bind(nilai),
    env.DB.prepare(`DELETE FROM kontak WHERE laporan_id IN (SELECT id FROM laporan WHERE ${kolom} = ?)`).bind(nilai)];
  if (aksi === "sembunyikan") await env.DB.batch([env.DB.prepare("UPDATE laporan SET disembunyikan = 1 WHERE id = ?").bind(id), catat()]);
  else if (aksi === "tampilkan") await env.DB.batch([env.DB.prepare("DELETE FROM suara WHERE laporan_id = ? AND kelompok = 'aduan'").bind(id), env.DB.prepare("UPDATE laporan SET disembunyikan = 0 WHERE id = ?").bind(id), catat()]);
  else if (aksi === "hapus") await env.DB.batch([...sembunyi("id", id), catat()]);
  else {
    /* satu hash IP bisa milik banyak warga (CGNAT seluler): wajib konfirmasi = jumlah laporan yang akan kena, dilihat dulu tanpa konfirmasi */
    const n = (await env.DB.prepare("SELECT count(*) n FROM laporan WHERE ip_hash = ? AND disembunyikan = 0").bind(p.ip_hash).first()).n;
    if (b.o.konfirmasi !== n) {
      const contoh = (await env.DB.prepare("SELECT id, jenis, sub, teks, dibuat FROM laporan WHERE ip_hash = ? AND disembunyikan = 0 ORDER BY dibuat DESC LIMIT 20").bind(p.ip_hash).all()).results;
      return json({galat: `hapus_pengirim akan menyembunyikan ${n} laporan dari pengirim yang sama (bisa banyak warga di balik satu IP seluler). Periksa contoh lalu kirim ulang dengan "konfirmasi": ${n}.`, perlu_konfirmasi: n, contoh}, 409);
    }
    await env.DB.batch([...sembunyi("ip_hash", p.ip_hash), catat(n)]);
    return json({ok: true, terhapus: n});
  }
  return json({ok: true});
}

/* ---------------- /api/status: umur data per sumber, 503 bila sumber kunci basi (untuk monitor uptime & langkah akhir CI) ---------------- */
/* [nama, berkas aset, ambang jam (null = hanya dilaporkan)]. data/meta.json ditulis harian.py tiap 3 jam (titik.yml). */
export const SUMBER_STATUS = sumberStatus();   // dari registry (public/bencana.json), bukan ditulis tangan
/* "dibuat" selalu kunci pertama berkas: baca 1 KB awal saja, jangan urai berita.json 5 MB (batas CPU Workers) */
async function dibuatAset(env, asal, jalur) {
  try {
    const r = await env.ASSETS.fetch(new Request(new URL(jalur, asal)));
    if (!r.ok) { r.body?.cancel(); return null; }
    const rd = r.body.getReader(), dec = new TextDecoder(); let t = "";
    while (t.length < 1024) { const {value, done} = await rd.read(); if (done) break; t += dec.decode(value, {stream: true}); }
    rd.cancel().catch(() => {});
    const m = t.match(/"dibuat"\s*:\s*"([^"]+)"/), w = m ? Date.parse(m[1]) : NaN;
    return Number.isNaN(w) ? null : w;
  } catch (e) { return null; }
}
async function periksaStatus(env, url, kini) {
  const sumber = {}, basi = [];
  await Promise.all(SUMBER_STATUS.map(async ([nama, jalur, ambang]) => {
    const w = await dibuatAset(env, url, jalur), jam = w == null ? null : Math.round((kini - w) / JAM * 10) / 10;
    sumber[nama] = {dibuat: w == null ? null : new Date(w).toISOString(), umur_jam: jam, ambang_jam: ambang};
    if (ambang != null && (jam == null || jam > ambang)) basi.push(nama);
  }));
  return {ok: !basi.length, basi: basi.sort(), kini: new Date(kini).toISOString(), sumber};
}
const status = async (env, url, kini) => { const h = await periksaStatus(env, url, kini); return json(h, h.ok ? 200 : 503); };

export async function bersihkan(env, kini = Date.now()) {
  const r = await env.DB.batch([
    env.DB.prepare(`DELETE FROM kontak WHERE dibuat <= ? OR laporan_id IN (SELECT id FROM laporan WHERE selesai = 1 OR disembunyikan = 1 OR kedaluwarsa <= ?)`).bind(kini - KONTAK_UMUR, kini),
    env.DB.prepare("DELETE FROM laporan WHERE kedaluwarsa <= ? OR (disembunyikan = 1 AND dibuat <= ?)").bind(kini - 7 * HARI, kini - 30 * HARI),
    env.DB.prepare("DELETE FROM jejak WHERE waktu <= ?").bind(kini - 2 * HARI),
    ...St.bersihkanStatistik(env, kini),
  ]);
  return {kontak: r[0].meta.changes, laporan: r[1].meta.changes, jejak: r[2].meta.changes};
}

/* rute statistik, sesi admin, dan kotak pesan: "METODE /jalur" (":id" = 16 hex). Gerbang uji membaca kunci tabel ini. */
const RUTE = {
  "POST /api/jejak": (env, req, url, kini) => St.jejak(env, req, kini),
  "GET /api/statistik": (env, req, url, kini) => St.statistik(env, req, url, kini),
  "POST /api/pesan": (env, req, url, kini, ctx) => St.kirimPesan(env, req, ctx, kini),
  "GET /api/pesan": (env, req, url, kini) => St.daftarPesan(env, req, url, kini),
  "POST /api/pesan/:id": (env, req, url, kini, ctx, id) => St.ubahPesan(env, req, id, kini),
  "GET /admin": () => new Response(null, {status: 303, headers: {location: "/admin/statistik"}}),
  "GET /admin/masuk": (env, req, url, kini) => St.masuk(env, req, kini, halamanMasuk),
  "POST /admin/masuk": (env, req, url, kini) => St.masuk(env, req, kini, halamanMasuk),
  "POST /admin/keluar": () => St.keluar(),
  "GET /admin/statistik": (env, req, url, kini) => St.halamanAdmin(env, req, kini, halamanStatistik()),
  "GET /admin/pesan": (env, req, url, kini) => St.halamanAdmin(env, req, kini, halamanPesan()),
  "GET /statistik": (env, req, url, kini, ctx) => { catatHTML(env, req, "/statistik", ctx); return halamanPublik(); },
  "GET /api/publik": (env, req, url, kini, ctx) => Pub.publik(env, req, url, ctx, kini),
  "GET /admin/foto": (env, req, url, kini) => St.halamanAdmin(env, req, kini, halamanFoto()),
  /* tautan bagikan foto lapangan: index.html dengan pratinjau foto itu; peramban membuka rinciannya (public/foto.js) */
  "GET /f/:id": async (env, req, url, kini, ctx, id) => { catatHTML(env, req, "/f", ctx);
    return terapkanOg(env, url, await env.ASSETS.fetch(new Request(new URL("/index.html", url), req)), await ogFoto(env, url, id).catch(() => null)); },
  ...RUTE_FOTO,
};
async function rute(env, req, url, ctx) {
  const jalur = url.pathname.replace(/\/+$/, "") || "/", id = jalur.match(/\/([0-9a-f]{16})$/)?.[1];
  const f = RUTE[req.method + " " + (id ? jalur.slice(0, -16) + ":id" : jalur)];
  if (!f) return null;
  if (req.method === "POST") {   // CSRF: POST dari origin lain ditolak (cookie sesi juga SameSite=Strict)
    const o = req.headers.get("origin");
    if (o && o !== "null" && new URL(o).host !== url.host) return gagal(403, "origin lain ditolak");
    if (!env.IP_SALT && !url.pathname.startsWith("/api/jejak")) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  }
  try { return await f(env, req, url, Date.now(), ctx, id); }
  catch (e) { console.error("rute", url.pathname, e); return gagal(500, "galat server"); }
}

/* ================= HTML lewat Worker (statistik publik) — dipisah supaya mudah digabung dengan perubahan routing lain =================
   Hanya rute HTML di daftar ini yang memanggil Worker; JS/CSS/JSON/gambar tetap aset statis tanpa pemanggilan Worker.
   Syarat: wrangler.jsonc assets.html_handling = "none", supaya "/" dan "/banjir/" tidak dijawab aset otomatis.
   [pola jalur, berkas aset, kunci jalur untuk statistik (null = pakai jalur yang dinormalkan)] */
export const HTML_RUTE = [
  ...ruteBencana(),   // "/", "/banjir/", tab dan kejadian dari registry; bencana "mati" tanpa rute
  [/^\/tentang-halaman\/?$/, "/tentang.html", "/tentang-halaman"],   /* /tentang kini tab di index.html (registry) */   // html_handling "none" mematikan /tentang -> tentang.html otomatis
  [/^\/privasi\/?$/, "/privasi.html", "/privasi"],
];
function catatHTML(env, req, jalur, ctx) {
  if (env.DB) ctx?.waitUntil?.(Pub.catatHit(env, req, jalur).catch(e => console.error("hit", e)));
}
async function layaniHTML(req, env, ctx, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  const cocok = HTML_RUTE.find(([re]) => re.test(url.pathname)); if (!cocok) return null;
  const jalur = cocok[2] || url.pathname.replace(/\/+$/, "");
  // meta og/twitter/canonical per rute dari data/og/meta.json (src/og_meta.js); gagal = HTML apa adanya
  const aset = await terapkanOg(env, url, await env.ASSETS.fetch(new Request(new URL(cocok[1], url), req)));
  if (!aset.ok || req.method === "HEAD") return aset;
  catatHTML(env, req, jalur, ctx);
  /* pil header "N online · N tampilan": angka ditaruh di atribut <html>, digambar public/persetujuan.js (tanpa panggilan API tambahan) */
  let a = null; try { a = await Pub.angkaPil(env); } catch (e) {}
  if (!a || (!a.online && !a.tampilan)) return aset;
  return new HTMLRewriter().on("html", {element: el => { el.setAttribute("data-pb-online", String(a.online)); el.setAttribute("data-pb-tampil", String(a.tampilan)); }}).transform(aset);
}

/* ================= cache tepi untuk GET publik tanpa data per pengguna (caches.default, per pusat data Cloudflare) =================
   Hanya dipanggil dari rute GET publik di fetch() (/api/warga daftar & konfig, /api/titik, /api/status); admin, POST, dan rute
   bercookie tidak pernah lewat sini. Kunci = URL dengan parameter diurutkan. Hanya 200 yang disimpan. Pemanggilan Worker tetap
   terhitung; yang dihemat bacaan D1 dan CPU. Respons keluar dengan Cache-Control public max-age=detik (peramban ikut menyimpan). */
export async function cacheTepi(req, ctx, detik, buat) {
  const u = new URL(req.url); u.searchParams.sort();
  const kunci = new Request(u.toString(), {method: "GET"}), c = globalThis.caches?.default;
  if (c) { const ada = await c.match(kunci); if (ada) return ada; }
  const r = await buat();
  if (r.status !== 200) return r;
  const h = new Headers(r.headers); h.set("cache-control", `public, max-age=${detik}`);
  const out = new Response(r.body, {status: 200, headers: h});
  if (c) ctx?.waitUntil?.(c.put(kunci, out.clone()).catch(() => {}));
  return out;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === "/api/titik" && req.method === "GET") return cacheTepi(req, ctx, 600, () => titikTerbaru(env));
    if (url.pathname === "/api/status" && req.method === "GET") return cacheTepi(req, ctx, 60, () => status(env, url, Date.now()));
    /* tautan bersih halaman karhutla (/peta, /k/K0001, /sim/K0001): sajikan index.html, routing di peramban */
    if (url.pathname === "/sitemap.xml" && (req.method === "GET" || req.method === "HEAD"))
      return new Response(req.method === "HEAD" ? null : sitemap(url.origin), {headers: {"content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600"}});
    const r = await rute(env, req, url, ctx); if (r) return r;
    const h = await layaniHTML(req, env, ctx, url); if (h) return h;
    if (!url.pathname.startsWith("/api/warga")) return env.ASSETS.fetch(req);
    const kini = Date.now(), p = url.pathname.replace(/\/+$/, "").split("/").slice(3);   // ["", "api", "warga", ...]
    try {
      if (req.method === "POST") {
        const o = req.headers.get("origin");
        if (o && new URL(o).host !== url.host) return gagal(403, "origin lain ditolak");
        if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
      }
      if (p.length === 0 && req.method === "GET") return cacheTepi(req, ctx, 30, () => daftar(env, url, kini));
      if (p.length === 0 && req.method === "POST") return buat(env, req, url, kini);
      if (p[0] === "konfig" && req.method === "GET") return cacheTepi(req, ctx, 300, () => json({turnstile: env.TURNSTILE_SITEKEY || null, batas: BATAS}));
      if (p[0] === "admin" && p.length === 1 && req.method === "GET") return admin(env, req, url, null, kini);
      const id = p[0];
      if (!/^[0-9a-f]{16}$/.test(id || "")) return gagal(404, "rute tidak ada");
      if (p.length === 1 && req.method === "GET") return rincian(env, id, kini);
      if (p.length === 2 && req.method === "POST") {
        if (p[1] === "konfirmasi") return suara(env, req, id, "konfirmasi", kini);
        if (p[1] === "lapor") return suara(env, req, id, "aduan", kini);
        if (p[1] === "kontak") return kontak(env, req, id, kini);
        if (p[1] === "selesai") return selesai(env, req, id, kini);
        if (p[1] === "admin") return admin(env, req, url, id, kini);
      }
      return gagal(404, "rute tidak ada");
    } catch (e) {
      console.error("warga", e);
      return gagal(500, "galat server");
    }
  },
  // cron CRON_TITIK = titik panas FIRMS; "17 * * * *" = bersih-bersih Lapor Warga
  async scheduled(ev, env) {
    if (ev.cron === CRON_TITIK) return console.log("titik", JSON.stringify(await perbaruiTitik(env)));
    await bersihkan(env);
    try { console.log("foto", JSON.stringify(await bersihkanFoto(env))); } catch (e) { console.error("foto", e); }   // migrasi 0007 belum jalan = cron lain tetap jalan
    const kini = Date.now();   // pita gangguan di grafik statistik: sumber basi tercatat per jam
    await St.catatGangguan(env, await periksaStatus(env, new URL("http://aset.lokal/"), kini), kini);
    await Pub.musnahkanGaram(env, kini).run();   // garam hari sebelumnya dimusnahkan: hash kemarin tak bisa dicocokkan lagi
    const ip = await env.DB.prepare("SELECT min(diambil) t, count(*) n FROM stat_ip").first();   // daftar IP perayap: sehari sekali
    if (!ip.n || kini - ip.t > 24 * JAM) console.log("rentang ip", JSON.stringify(await Pub.perbaruiRentang(env, kini)));
  },
};
