/* Lapor Warga — API /api/warga di atas D1 (binding DB). Selain /api/warga* diteruskan ke aset statis (binding ASSETS),
   jadi situs tetap jalan seperti sebelumnya. Rahasia: IP_SALT (wajib untuk menulis), ADMIN_TOKEN, TURNSTILE_SECRET (opsional).
   Aturan privasi: IP mentah tidak pernah disimpan (SHA-256 bergaram), kontak WA tidak pernah ikut di daftar/rincian,
   hanya lewat POST /:id/kontak yang dibatasi lajunya, dan dihapus cron setelah 72 jam. */
import {himawariRespons} from "./himawari.js";
import {JENIS, BAHAYA} from "../public/informasi_jenis.js";
import {perbaruiTitik, titikTerbaru} from "./titik.js";
import * as St from "./statistik.js";
import * as Pub from "./publik.js";
import {terapkanOg} from "./og_meta.js";
import {ruteBencana, sumberStatus, sumberUji, sitemap} from "./bencana.js";
import {halamanMasuk, halamanStatistik, halamanPesan, halamanPublik, halamanFoto, halamanSosmed} from "./admin_halaman.js";
import {RUTE_SOSMED} from "./sosmed.js";
import {RUTE_FOTO, bersihkanFoto, ogFoto} from "./foto.js";
import {perbaruiGempa, bersihkanGempa, layaniGempa, gempaDibuat} from "./gempa.js";
import {perbaruiNowcast, layaniNowcast, nowcastDibuat} from "./nowcast.js";
import {perbaruiSihka, dasarSihka, ruteSihka} from "./sihka.js";
import {periksaPeringatan, bersihkanPeringatan, layaniPeringatan} from "./peringatan.js";
import {layaniUbin} from "./ubin.js";
import * as Ews from "./ews.js";   // namespace, dibaca saat jalan: ews.js dan worker.js saling impor, jadi ews.js bisa diimpor sendirian

const JAM = 3600e3, HARI = 24 * JAM, CRON_TITIK = "15 */3 * * *", CRON_GEMPA = "* * * * *";
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
  const daftar = [env.ADMIN_TOKEN, env.AKUN_SITUS].filter(Boolean).join(",");   // AKUN_SITUS: akun "user:sandi" tambahan (gerbang centurisk97.id)
  if (!daftar) return null;
  const sah = await Promise.all(daftar.split(",").map(x => x.trim()).filter(Boolean).map(sha));
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
export const SUMBER_STATUS = sumberStatus();
export const SUMBER_UJI = sumberUji();   // tahap uji: dilaporkan di `uji`, tidak pernah ikut 503   // dari registry (public/bencana.json), bukan ditulis tangan
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
async function umurSumber(env, url, kini, [jalur, ambang]) {
  const w = jalur.startsWith("/api/gempa/") ? await gempaDibuat(env) : jalur === "/api/cuaca/nowcast" ? await nowcastDibuat(env) : await dibuatAset(env, url, jalur), jam = w == null ? null : Math.round((kini - w) / JAM * 10) / 10;
  return {dibuat: w == null ? null : new Date(w).toISOString(), umur_jam: jam, ambang_jam: ambang, basi: ambang != null && (jam == null || jam > ambang)};
}
async function periksaStatus(env, url, kini) {
  const sumber = {}, uji = {}, basi = [];
  await Promise.all([
    ...SUMBER_STATUS.map(async ([nama, ...r]) => { const {basi: b, ...o} = await umurSumber(env, url, kini, r); sumber[nama] = o; if (b) basi.push(nama); }),
    ...SUMBER_UJI.map(async ([nama, ...r]) => { uji[nama] = await umurSumber(env, url, kini, r); }),   // informatif: `basi` di sini tidak memengaruhi ok
  ]);
  return {ok: !basi.length, basi: basi.sort(), kini: new Date(kini).toISOString(), sumber, uji};
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
  "GET /admin/sosmed": (env, req, url, kini) => St.halamanAdmin(env, req, kini, halamanSosmed()),
  ...RUTE_FOTO,
  ...RUTE_SOSMED,
};
let GABUNG = null;
async function rute(env, req, url, ctx) {
  const jalur = url.pathname.replace(/\/+$/, "") || "/", id = jalur.match(/\/([0-9a-f]{16})$/)?.[1];
  const kunci = id ? jalur.slice(0, -16) + ":id" : jalur, tabel = (GABUNG ||= {...RUTE, ...Ews.RUTE_EWS});
  const f = tabel[req.method + " " + kunci];
  if (!f) {   // jalur ada tapi metode lain: 405, bukan jatuh ke aset statis (HEAD/OPTIONS tetap lewat seperti semula)
    const ok = ["GET", "POST"].filter(m => tabel[m + " " + kunci]);
    return ok.length && req.method !== "HEAD" && req.method !== "OPTIONS" ? gagal(405, "metode tidak diizinkan", {allow: ok.join(", ")}) : null;
  }
  if (req.method === "POST") {   // CSRF: POST dari origin lain ditolak (cookie sesi SameSite=Lax)
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
export const HOST_TERKUNCI = new Set(["centurisk97.id", "www.centurisk97.id"]);
/* centurisk97.id tampil sama dengan centurisk97.*.workers.dev: data perusahaan, merek Centurisk97 (pemilik, 19 Okt 2026) */
export const situsCenturisk = h => h.endsWith(".workers.dev") || HOST_TERKUNCI.has(h);
export const HTML_RUTE = [
  ...ruteBencana(),   // "/", "/banjir/", tab dan kejadian dari registry; bencana "mati" tanpa rute
  [/^\/tentang-halaman\/?$/, "/tentang.html", "/tentang-halaman"],   /* /tentang kini tab di index.html (registry) */   // html_handling "none" mematikan /tentang -> tentang.html otomatis
  [/^\/privasi\/?$/, "/privasi.html", "/privasi"],
  [/^\/peringatan\/?$/, "/peringatan.html", "/peringatan"],
  [/^\/laporan\/?$/, "/laporan.html", "/laporan"],
  [/^\/laporan-konsesi\/?$/, "/laporan_konsesi.html", "/laporan-konsesi"],   // laporan konsesi terbakar 2026, hanya *.workers.dev   // laporan harian karhutla (public/laporan.*)
];
function catatHTML(env, req, jalur, ctx) {
  if (env.DB) ctx?.waitUntil?.(Pub.catatHit(env, req, jalur).catch(e => console.error("hit", e)));
}
async function layaniHTML(req, env, ctx, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  const cocok = HTML_RUTE.find(([re]) => re.test(url.pathname)); if (!cocok) return null;
  const jalur = cocok[2] || url.pathname.replace(/\/+$/, "");
  /* laporan konsesi hanya di alamat Centurisk97 (*.workers.dev), pemilik 18 Okt 2026 */
  if (jalur === "/laporan-konsesi" && !situsCenturisk(url.hostname) && url.hostname !== "localhost") return new Response("Tidak ditemukan", {status: 404});
  // meta og/twitter/canonical per rute dari data/og/meta.json (src/og_meta.js); gagal = HTML apa adanya
  const aset = await terapkanOg(env, url, await env.ASSETS.fetch(new Request(new URL(cocok[1], url), req)));
  if (!aset.ok || req.method === "HEAD") return aset;
  catatHTML(env, req, jalur, ctx);
  /* pil header "N online · N tampilan": angka ditaruh di atribut <html>, digambar public/persetujuan.js (tanpa panggilan API tambahan) */
  let a = null; try { a = await Pub.angkaPil(env); } catch (e) {}
  if (a && !a.online && !a.tampilan) a = null;
  /* situs per alamat: *.workers.dev dan centurisk97.id = "w" (data perusahaan, tanpa Chat Admin & tab Tentang, lihat CSS html[data-situs=w]);
     pantau.terasurban.com tanpa atribut */
  const situsW = situsCenturisk(url.hostname);
  /* merek: situs Centurisk97 (*.workers.dev, centurisk97.id) semua "Centurisk97"; selain itu "Pantau Bencana" di judul, meta, logo, dan kop laporan */
  const [dari, ke] = situsW ? ["Pantau Bencana", "Centurisk97"] : ["Centurisk97", "Pantau Bencana"];
  const ganti = t => t.replaceAll(dari, ke);
  const rw = new HTMLRewriter().on("html", {element: el => {
    if (a) { el.setAttribute("data-pb-online", String(a.online)); el.setAttribute("data-pb-tampil", String(a.tampilan)); }
    if (situsW) el.setAttribute("data-situs", "w");
  }});
  let buf = "";   // teks <title>/<b> bisa terpecah antar potongan: kumpulkan lalu tulis sekali di potongan terakhir
  const teks = {text(t) { buf += t.text; if (t.lastInTextNode) { t.replace(ganti(buf), {html: true}); buf = ""; } else t.remove(); }};
  const atr = n => ({element: el => el.setAttribute(n, ganti(el.getAttribute(n)))});
  rw.on("title", teks).on(".lp-kop b", teks).on(`meta[content*="${dari}"]`, atr("content"))
    .on(`[title*="${dari}"]`, atr("title")).on(`img[alt*="${dari}"]`, atr("alt")).on(`[aria-label*="${dari}"]`, atr("aria-label"));
  return rw.transform(aset);
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
    if (url.pathname.startsWith("/ubin/")) return layaniUbin(req, env, ctx);   // ubin PMTiles dari R2 (src/ubin.js)
    if (url.pathname === "/api/titik" && req.method === "GET") return cacheTepi(req, ctx, 600, () => titikTerbaru(env));
    if (url.pathname === "/api/himawari" && req.method === "GET") return cacheTepi(req, ctx, 300, async () => {   // hotspot Himawari: R2 data/himawari.json (diunggah Action 30 menit); hilang = kosong, bukan 500
      return new Response(JSON.stringify(await himawariRespons(env)), {headers: {"content-type": "application/json; charset=utf-8"}});
    });
    if (url.pathname.startsWith("/api/cuaca/")) { const c = await layaniNowcast(req, env, ctx, url); if (c) return c; }   // nowcast BMKG D1 (src/nowcast.js)
    if (url.pathname.startsWith("/api/banjir/")) { const b = await ruteSihka(req, env, ctx, url); if (b) return b; }   // sungai terukur SIHKA D1 (src/sihka.js)
    if (url.pathname.startsWith("/api/gempa/")) { const g = await layaniGempa(req, env, ctx, url); if (g) return g; }   // katalog gempa D1 (src/gempa.js)
    if (url.pathname.startsWith("/api/peringatan/") || url.pathname.startsWith("/api/admin/peringatan/")) { const p = await layaniPeringatan(req, env, ctx, url); if (p) return p; }   // peringatan dini (src/peringatan.js)
    if (url.pathname === "/api/status" && req.method === "GET") return cacheTepi(req, ctx, 60, () => status(env, url, Date.now()));
    /* tautan bersih halaman karhutla (/peta, /k/K0001, /sim/K0001): sajikan index.html, routing di peramban */
    if (url.pathname === "/sitemap.xml" && (req.method === "GET" || req.method === "HEAD"))
      return new Response(req.method === "HEAD" ? null : sitemap(url.origin), {headers: {"content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600"}});
    /* centurisk97.id: semua halaman HTML wajib masuk admin dulu (pemilik 19 Okt 2026). Aset statis (JS/JSON/gambar) tidak lewat Worker. */
    if (HOST_TERKUNCI.has(url.hostname) && (req.method === "GET" || req.method === "HEAD")
      && (url.pathname.startsWith("/f/") || HTML_RUTE.some(([re]) => re.test(url.pathname))) && !await adminOK(env, req))
      return new Response(null, {status: 303, headers: {location: "/admin/masuk?ke=" + encodeURIComponent(url.pathname + url.search), "cache-control": "no-store"}});
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
  // cron CRON_TITIK = titik panas FIRMS; CRON_GEMPA = BMKG/USGS tiap menit; "17 * * * *" = bersih-bersih Lapor Warga
  /* Akun Workers Free hanya boleh 5 jadwal cron untuk SEMUA worker di akun (16 Okt 2026 terbit gagal karena worker lain menambah jadwal).
     Karena itu wrangler.jsonc cukup satu jadwal "* * * * *"; tugas titik (menit 15 tiap 3 jam UTC) dan bersih-bersih (menit 17) dipilih
     dari scheduledTime di sini. Jadwal lama (CRON_TITIK, "17 * * * *") tetap dikenali supaya uji dan pemanggilan manual tidak berubah. */
  async scheduled(ev, env) {
    const sekarang = ev.scheduledTime || Date.now(), w = new Date(sekarang), m = w.getUTCMinutes();
    if (ev.cron === CRON_GEMPA) {
      if (m === 15 && w.getUTCHours() % 3 === 0) try { console.log("titik", JSON.stringify(await perbaruiTitik(env))); } catch (e) { console.error("titik", e?.message); }
      if (m === 17) try { await bersihSemua(env, sekarang); } catch (e) { console.error("bersih", e?.message); }
    }
    if (ev.cron === CRON_TITIK) return console.log("titik", JSON.stringify(await perbaruiTitik(env)));
    if (ev.cron === CRON_GEMPA) {
      /* tiap langkah dibungkus sendiri: galat katalog gempa tidak boleh menahan email tsunami/gempa ke pelanggan EWS di bawah */
      try { console.log("gempa", JSON.stringify(await perbaruiGempa(env, ev.scheduledTime))); } catch (e) { console.error("gempa", e?.message); }
      if (new Date(sekarang).getUTCMinutes() % 10 === 0) try { console.log("nowcast", JSON.stringify(await perbaruiNowcast(env, sekarang))); } catch (e) { console.error("nowcast", e?.message); }
      try { console.log("peringatan", JSON.stringify(await periksaPeringatan(env, ev.scheduledTime))); } catch (e) { console.error("peringatan", e?.message); }   // sesudah gempa baru tersimpan
      console.log("ews gempa", JSON.stringify(await Ews.prosesGempa(env, sekarang).catch(e => ({galat: e.message}))));   // email pelanggan EWS dekat pusat gempa
      /* SIHKA paling akhir: email EWS tidak boleh tertahan langkah ini */
      if (new Date(sekarang).getUTCMinutes() === 23) {   // SIHKA: tiap jam menit 23; dasar historis sekali sehari 20 UTC
        try { console.log("sihka", JSON.stringify(await perbaruiSihka(env, sekarang))); } catch (e) { console.error("sihka", e?.message); }
        if (new Date(sekarang).getUTCHours() === 20) try { console.log("sihka dasar", JSON.stringify(await dasarSihka(env, sekarang))); } catch (e) { console.error("sihka dasar", e?.message); }
      }
      return;
    }
    return bersihSemua(env, sekarang);
  },
};

// bersih-bersih Lapor Warga, foto, gempa, peringatan, EWS, gangguan, garam IP (dulu cron "17 * * * *", kini menit 17 dari cron tiap menit)
async function bersihSemua(env, sekarang) {
    await bersihkan(env);
    try { console.log("foto", JSON.stringify(await bersihkanFoto(env))); } catch (e) { console.error("foto", e); }
    try { await bersihkanGempa(env, Date.now()); } catch (e) { console.error("gempa", e); }
    try { await bersihkanPeringatan(env, Date.now()); } catch (e) { console.error("peringatan", e?.message); }   // migrasi 0009 belum jalan = cron lain tetap jalan
    try { console.log("ews", JSON.stringify(await Ews.bersihkanEws(env, sekarang)), JSON.stringify(await Ews.kirimEws(env, sekarang))); } catch (e) { console.error("ews", e); }   // migrasi 0011 belum jalan = cron lain tetap jalan
    const kini = Date.now();   // pita gangguan di grafik statistik: sumber basi tercatat per jam
    await St.catatGangguan(env, await periksaStatus(env, new URL("http://aset.lokal/"), kini), kini);
    await Pub.musnahkanGaram(env, kini).run();   // garam hari sebelumnya dimusnahkan: hash kemarin tak bisa dicocokkan lagi
    const ip = await env.DB.prepare("SELECT min(diambil) t, count(*) n FROM stat_ip").first();   // daftar IP perayap: sehari sekali
    if (!ip.n || kini - ip.t > 24 * JAM) console.log("rentang ip", JSON.stringify(await Pub.perbaruiRentang(env, kini)));
}
