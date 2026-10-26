/* Lapor Warga — API /api/warga di atas D1 (binding DB). Selain /api/warga* diteruskan ke aset statis (binding ASSETS),
   jadi situs tetap jalan seperti sebelumnya. Rahasia: IP_SALT (wajib untuk menulis), ADMIN_TOKEN, TURNSTILE_SECRET (opsional).
   Aturan privasi: IP mentah tidak pernah disimpan (SHA-256 bergaram), kontak WA tidak pernah ikut di daftar/rincian,
   hanya lewat POST /:id/kontak yang dibatasi lajunya, dan dihapus cron setelah 72 jam. */
import {himawariRespons} from "./himawari.js";
import {JENIS, BAHAYA} from "../public/informasi_jenis.js";
import {perbaruiTitik, titikTerbaru, wilayah, cariWilayah} from "./titik.js";
import * as St from "./statistik.js";
import * as Pub from "./publik.js";
import {terapkanOg} from "./og_meta.js";
import {ruteBencana, sumberStatus, sumberUji, sitemap} from "./bencana.js";
import {halamanMasuk, halamanStatistik, halamanPesan, halamanPublik, halamanFoto, halamanSosmed, halamanKunciApi, halamanKontak} from "./admin_halaman.js";
import {RUTE_SOSMED} from "./sosmed.js";
import {RUTE_POSKO, buatAntrean, bersihkanPosko} from "./posko.js";
import {RUTE_FOTO, bersihkanFoto, ogFoto} from "./foto.js";
import {bersihkanBnpb, RUTE_BNPB} from "./bnpb.js";
import {RUTE_HUKUM} from "./hukum.js";
import {RUTE_KONTAK} from "./kontak.js";
import {RUTE_SITREP, arsipkanSitrep, bersihkanArsipSitrep} from "./sitrep.js";
import {RUTE_RELAWAN, bersihkanRelawan} from "./relawan.js";
import {RUTE_LAPORAN_BNPB} from "./laporan_bnpb.js";
import {RUTE_RUMAH_RUSAK} from "./rumah_rusak.js";
import {RUTE_BANGUNAN} from "./bangunan.js";
import {RUTE_RISIKO7} from "./risiko7.js";
import {RUTE_PENDATAAN} from "./pendataan.js";
import {RUTE_ALUN} from "./alun.js";
import {RUTE_RISET} from "./riset.js";
import {RUTE_MEJA, segarkanRingkas} from "./meja.js";
import {RUTE_PENGINGAT, buatPengingat, buatPengingatPrioritas} from "./pengingat.js";
import {RUTE_OPS, nilaiDropTertunda} from "./operasi_lapangan.js";
import {RUTE_INSTANSI, tugasBaruDariBerkas, bersihkanInstansi} from "./instansi.js";
import {RUTE_PENUGASAN, halamanLacak} from "./penugasan.js";
import {RUTE_PUSH, kirimPushDaerah} from "./push.js";
import {RUTE_SLA, catatRiwayatStatus} from "./sla.js";
import {RUTE_PIPA} from "./pipa.js";
import {RUTE_SIPPA} from "./sippa.js";
import {alarmHimawari, bersihkanAlarm} from "./alarm_himawari.js";
import {bersihkanKabar, ulangiKabar} from "./kabar.js";
import {RUTE_UJI, jalankanUji} from "./uji_lapangan.js";
import {RUTE_STAF, bersihkanStaf} from "./staf.js";
import {layaniApiV1, RUTE_KUNCI_API} from "./api_v1.js";
import {layaniMcp} from "./mcp.js";
import {RUTE_PEMIRSA, bersihkanPemirsa, pemirsaSesi, arahPemirsa, hapusSesiPemirsa, cookiePemirsa} from "./pemirsa.js";
import {RUTE_PANTAU, bersihkanPantau} from "./pantau.js";
import {RUTE_INVENTARIS} from "./inventaris.js";
import {RUTE_KORBAN} from "./korban.js";
import {RUTE_OMC} from "./omc.js";
import {RUTE_LAPORAN_KARHUTLA, buatDrafLaporanKarhutla} from "./laporan_karhutla.js";
import {perbaruiGempa, bersihkanGempa, layaniGempa, gempaDibuat} from "./gempa.js";
import {perbaruiNowcast, layaniNowcast, nowcastDibuat} from "./nowcast.js";
import {perbaruiGunungapi, layaniGunungapi} from "./gunungapi.js";
import {perbaruiSihka, dasarSihka, ruteSihka} from "./sihka.js";
import {himawariDibuat} from "./himawari.js";
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
export const shaBytes = async b => hex(await crypto.subtle.digest("SHA-256", b));
export const acak = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const jarak = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371e3; };
const kelas = (j, s) => JENIS[j]?.sub[s]?.[1];

/* ---------------- teks publik: buang tautan & nomor, tolak kata kasar ---------------- */
const RE_URL = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|id|co|io|xyz|me|info|biz|site|online|link|ly|gl|app|top|club|shop|store|click)(?:\/\S*)?/gi;
const RE_HP = /(?:\+|\b)\d(?:[\s.\-()]?\d){8,}/g;
export function bersihTeks(t, maks = MAKS_TEKS) {
  const asli = String(t ?? "").normalize("NFC").replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮]/g, "");
  if (asli.length > maks) return {galat: `teks ${asli.length} karakter, maksimal ${maks}`};
  const kecil = asli.toLowerCase();
  if (KASAR.some(k => new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(kecil))) return {galat: "teks memuat kata kasar"};
  if (/(.)\1{7,}/u.test(asli)) return {galat: "teks berisi karakter berulang (spam)"};
  const teks = asli.replace(RE_URL, "[tautan dihapus]").replace(RE_HP, "[nomor dihapus]").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return {teks: teks.slice(0, maks)};
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
export async function dekatApi(env, asal, lat, lon, kini) {
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

/* Body dibaca bertahap dan dihitung bytenya: lewat batas = berhenti membaca, galat status 413 (berlaku juga untuk body chunked tanpa Content-Length). */
export async function bacaBytes(req, maks) {
  /* kelebihan dibuang (dibaca tanpa disimpan, sampai 8x batas) supaya sambungan keep-alive klien tidak putus di tengah kirim; di atas itu dibatalkan */
  const buang = async (rd, sudah) => { try { for (let n = sudah; n <= maks * 8;) { const {value, done} = await rd.read(); if (done) return; n += value.length; } await rd.cancel(); } catch (e) {} };
  const cl = Number(req.headers.get("content-length"));
  if (cl > maks) { if (req.body) await buang(req.body.getReader(), 0); return {galat: `body ${cl} byte, maksimal ${maks}`, status: 413}; }
  const bagian = []; let n = 0;
  if (req.body) {
    const rd = req.body.getReader();
    for (;;) {
      const {value, done} = await rd.read(); if (done) break;
      n += value.length;
      if (n > maks) { await buang(rd, n); return {galat: `body lebih dari ${maks} byte`, status: 413}; }
      bagian.push(value);
    }
  }
  const b = new Uint8Array(n); let p = 0; for (const x of bagian) { b.set(x, p); p += x.length; }
  return {b};
}
export async function bacaBody(req, maks = MAKS_BODY) {
  const r = await bacaBytes(req, maks * 4);   // UTF-8 paling banyak 4 byte per huruf; jumlah huruf diperiksa di bawah
  if (r.galat) return r;
  const t = new TextDecoder().decode(r.b);
  if (t.length > maks) return {galat: `body ${t.length} byte, maksimal ${maks}`, status: 413};
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
const KOLOM = "l.id, l.jenis, l.sub, l.bahaya, l.lat, l.lon, l.teks, l.detail, l.jumlah, l.dibuat, l.kedaluwarsa, l.selesai, l.benar, l.salah, l.dekat_titik_panas, l.laci, l.induk, l.durasi_buruk, w.prov, w.kab";
const fitur = (r, kini) => ({type: "Feature", id: r.id, geometry: {type: "Point", coordinates: [r.lon, r.lat]},
  properties: {id: r.id, jenis: r.jenis, sub: r.sub, bahaya: r.bahaya, teks: r.teks, detail: JSON.parse(r.detail || "{}"), jumlah: r.jumlah,
    dibuat: r.dibuat, kedaluwarsa: r.kedaluwarsa, selesai: !!r.selesai, benar: r.benar, salah: r.salah, titik_panas: !!r.dekat_titik_panas,
    laci: r.laci, induk: r.induk, durasi_buruk: r.durasi_buruk, prov: r.prov ?? null, kab: r.kab ?? null, kontak: !!r.ada_kontak, kedaluwarsa_lewat: r.kedaluwarsa <= kini}});
const ADA_KONTAK = kini => `EXISTS (SELECT 1 FROM kontak k WHERE k.laporan_id = l.id AND k.dibuat > ${Math.floor(kini - KONTAK_UMUR)}) AS ada_kontak`;

async function rantai(env, id) {
  return (await env.DB.prepare(`WITH RECURSIVE r(id, induk, d) AS (SELECT id, induk, 0 FROM laporan WHERE id = ?
    UNION ALL SELECT l.id, l.induk, r.d + 1 FROM laporan l JOIN r ON l.id = r.induk WHERE r.d < 50)
    SELECT l.id, l.sub, l.dibuat, l.teks, l.disembunyikan, r.d FROM r JOIN laporan l ON l.id = r.id ORDER BY r.d`).bind(id).all()).results;
}

/* wilayah laporan (migrasi 0027). Worker bisa terbit SEBELUM migrasinya diterapkan di D1 produksi: tanpa tabel itu
   Lapor Warga tetap jalan dengan prov/kab null (subkueri kosong menggantikan JOIN), bukan 500. */
const GABUNG_WIL = "LEFT JOIN laporan_wilayah w ON w.laporan_id = l.id";
async function denganWilayah(env, sql, ikat, cara) {
  try { return await env.DB.prepare(sql).bind(...ikat)[cara](); }
  catch (e) {
    if (!/no such table: laporan_wilayah/i.test(String(e?.message || e))) throw e;
    if (sql.includes("w.prov = ?")) return null;   // filter ?prov= tanpa tabel wilayah: pemanggil menjawab 503, bukan daftar kosong yang menyesatkan
    return env.DB.prepare(sql.replace(GABUNG_WIL, "LEFT JOIN (SELECT NULL laporan_id, NULL prov, NULL kab) w ON 0")).bind(...ikat)[cara]();
  }
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
  if (q.get("bahaya")) { if (!BAHAYA[q.get("bahaya")]) return gagal(400, "bahaya tidak dikenal"); where += " AND l.bahaya = ?"; ikat.push(q.get("bahaya")); }
  if (q.has("prov")) {
    if (!/^\d{2}$/.test(q.get("prov"))) return gagal(400, "prov harus 2 digit kode provinsi");
    where += " AND w.prov = ?"; ikat.push(q.get("prov"));
  }
  const r = await denganWilayah(env, `SELECT ${KOLOM}, ${ADA_KONTAK(kini)} FROM laporan l ${GABUNG_WIL} WHERE ${where} ORDER BY l.dibuat DESC LIMIT ${MAKS_DAFTAR + 1}`, ikat, "all");
  if (r === null) return gagal(503, "filter provinsi belum aktif (migrasi 0027_laporan_wilayah belum diterapkan)");
  const rows = r.results;
  return json({type: "FeatureCollection", terpotong: rows.length > MAKS_DAFTAR, kini, features: rows.slice(0, MAKS_DAFTAR).map(x => fitur(x, kini))});
}

async function rincian(env, id, kini) {
  const r = await denganWilayah(env, `SELECT ${KOLOM}, l.disembunyikan, ${ADA_KONTAK(kini)} FROM laporan l ${GABUNG_WIL} WHERE l.id = ?`, [id], "first");
  if (!r || r.disembunyikan) return gagal(404, "laporan tidak ada atau disembunyikan");
  const f = fitur(r, kini);
  f.properties.riwayat = (await rantai(env, id)).filter(x => x.d > 0 && !x.disembunyikan).map(x => ({id: x.id, sub: x.sub, dibuat: x.dibuat, teks: x.teks}));
  const anak = await env.DB.prepare("SELECT id FROM laporan WHERE induk = ? AND disembunyikan = 0 ORDER BY dibuat DESC LIMIT 1").bind(id).first();
  f.properties.digantikan = anak?.id || null;
  return json(f);
}

async function buat(env, req, url, kini, ctx) {
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
  try { await env.DB.batch(st); }
  catch (e) {   // mis. CHECK D1 lama (migrasi belum diterapkan) atau D1 sesaat gagal: detail ke log, bukan ke publik
    console.error("simpan laporan", bahaya, o.jenis, e?.message);
    return gagal(503, "Laporan belum bisa disimpan. Coba lagi beberapa menit lagi.", {"retry-after": "600"});
  }
  // wilayah dihitung SESUDAH jawaban (poligon 700 KB di-parse sekali per isolat; di luar jalur kritis Workers Free 10 ms). Gagal = isi-mundur cron menyusul.
  const wil = tulisWilayah(env, id, lat, lon, "masuk").catch(e => console.error("wilayah laporan", e?.message));
  if (ctx?.waitUntil) ctx.waitUntil(wil); else await wil;
  return json({id, token, induk, durasi_buruk: durasi, titik_panas: !!api.dekat, laci: api.laci}, 201);
}

/* C5: prov/kab laporan dari poligon provinsi + kecamatan terdekat (titik.js). Di luar wilayah: buat() tak menulis baris; isi-mundur menulis penanda tak_ada. */
async function tulisWilayah(env, id, lat, lon, sumber) {
  const w = cariWilayah(await wilayah(env), lat, lon);   // "kodeProv|Kabupaten|Kecamatan"
  if (!w) return false;
  const [prov, kab] = w.split("|");
  await env.DB.prepare("INSERT OR IGNORE INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES (?, ?, ?, ?)").bind(id, prov, kab || null, sumber).run();
  return true;
}

/* Isi mundur (cron menit 17): paling banyak 50 laporan tanpa baris wilayah per panggilan, terbaru dulu. Titik di laut dapat penanda tak_ada agar tidak diulang. */
export async function isiWilayahLaporan(env, kini = Date.now()) {
  const r = (await env.DB.prepare(`SELECT l.id, l.lat, l.lon FROM laporan l WHERE NOT EXISTS (SELECT 1 FROM laporan_wilayah w WHERE w.laporan_id = l.id)
    ORDER BY l.dibuat DESC LIMIT 50`).all()).results;
  if (!r.length) return {diproses: 0, terisi: 0};
  let terisi = 0;
  for (const x of r) {
    if (await tulisWilayah(env, x.id, x.lat, x.lon, "mundur")) terisi++;
    else await env.DB.prepare("INSERT OR IGNORE INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES (?, NULL, NULL, 'tak_ada')").bind(x.id).run();
  }
  return {diproses: r.length, terisi};
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
const MAKS_GAGAL_ADMIN = 300;
/* kegagalan autentikasi per kunci (hash IP bergaram) di tabel laju_posko (migrasi 0019); aksi: kode_gagal, admin_gagal, foto */
export async function gagalSudahBanyak(env, kunci, aksi, maks, kini) {
  return (await env.DB.prepare("SELECT count(*) n FROM laju_posko WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(kunci, aksi, kini - JAM).first()).n >= maks;
}
export const catatGagal = (env, kunci, aksi, kini) => env.DB.prepare("INSERT INTO laju_posko (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(kunci, aksi, kini).run();
export async function adminOK(env, req, kini = Date.now()) {
  /* AKUN_SITUS dan AKUN_SITUS_<NAMA>: akun "user:sandi" tambahan (gerbang centurisk97.id). Satu secret per orang supaya akun baru
     tidak perlu membaca ulang secret lama (Cloudflare tidak bisa menampilkan nilai secret). */
  const daftar = [env.ADMIN_TOKEN, ...Object.keys(env).filter(k => /^AKUN_SITUS(_[A-Z0-9_]+)?$/.test(k)).sort().map(k => env[k])].filter(x => typeof x === "string" && x).join(",");
  if (!daftar) return null;
  const sah = await Promise.all(daftar.split(",").map(x => x.trim()).filter(Boolean).map(sha));
  const t = req.headers.get("x-admin-token") ?? (req.headers.get("authorization") || "").match(/^Bearer\s+(\S+)/i)?.[1];
  if (t != null) {
    const a = await sha(t.trim()), ok = sah.includes(a);
    /* RISIKO DITERIMA: IP bersama (CGNAT seluler, IPv6 /64 per pelanggan) berbagi satu hitungan, jadi satu penebak bisa mengunci admin sah dari IP yang sama
       selama sejam (admin masuk lewat IP lain atau form /admin/masuk, yang tidak ikut terkunci). Tebakan token lewat header dihitung per IP (di atas MAKS_GAGAL_ADMIN per jam, token benar pun ditolak dari IP itu). Tanpa cf-connecting-ip
       (panggilan internal seperti form masuk, yang punya batas sendiri) atau tanpa DB/IP_SALT: tidak dihitung. */
    if (env.DB && env.IP_SALT && req.headers.get("cf-connecting-ip")) {
      try {
        const k = await ipHash(env, req);
        if (await gagalSudahBanyak(env, k, "admin_gagal", MAKS_GAGAL_ADMIN, kini)) return null;
        if (!ok) { await catatGagal(env, k, "admin_gagal", kini); return null; }
      } catch (e) { if (!/no such table/i.test(String(e?.message || e))) console.error("adminOK laju", e?.message); }   // migrasi 0019 belum jalan = tanpa batas; galat lain tetap dicatat
    }
    return ok ? a.slice(0, 12) : null;
  }
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
    const r = await denganWilayah(env, `SELECT ${KOLOM}, l.aduan, l.disembunyikan, l.ip_hash FROM laporan l ${GABUNG_WIL} ${tersembunyi ? "WHERE l.disembunyikan = 1 OR l.aduan > 0" : ""} ORDER BY l.dibuat DESC LIMIT 300`, [], "all");
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
async function dibuatAset(env, asal, jalur, kunci = "dibuat") {
  try {
    const r = await env.ASSETS.fetch(new Request(new URL(jalur, asal)));
    if (!r.ok) { r.body?.cancel(); return null; }
    const rd = r.body.getReader(), dec = new TextDecoder(); let t = "";
    while (t.length < 1024) { const {value, done} = await rd.read(); if (done) break; t += dec.decode(value, {stream: true}); }
    rd.cancel().catch(() => {});
    const m = t.match(new RegExp(`"${kunci}"\\s*:\\s*"([^"]+)"`)), w = m ? Date.parse(m[1]) : NaN;
    return Number.isNaN(w) ? null : w;
  } catch (e) { return null; }
}
async function umurSumber(env, url, kini, [jalur, ambang]) {
  if (jalur === "/api/himawari" && !env.MEDIA) return {dibuat: null, umur_jam: null, ambang_jam: ambang, basi: false};   // R2 tidak terpasang (uji/dev): tidak dinilai
  const w = jalur === "/api/himawari" ? await himawariDibuat(env) : jalur.startsWith("/api/gempa/") ? await gempaDibuat(env) : jalur === "/api/cuaca/nowcast" ? await nowcastDibuat(env) : await dibuatAset(env, url, jalur), jam = w == null ? null : Math.round((kini - w) / JAM * 10) / 10;
  return {dibuat: w == null ? null : new Date(w).toISOString(), umur_jam: jam, ambang_jam: ambang, basi: ambang != null && (jam == null || jam > ambang)};
}
async function periksaStatus(env, url, kini) {
  const sumber = {}, uji = {}, basi = [];
  await Promise.all([
    ...SUMBER_STATUS.map(async ([nama, ...r]) => { const {basi: b, ...o} = await umurSumber(env, url, kini, r); sumber[nama] = o; if (b) basi.push(nama); }),
    ...SUMBER_UJI.map(async ([nama, ...r]) => { uji[nama] = await umurSumber(env, url, kini, r); }),   // informatif: `basi` di sini tidak memengaruhi ok
  ]);
  /* jeda satelit lewat -> data terbit (PROGRAM-15-JAM blok E): pengamatan terbaru (meta.json data_terakhir) sampai meta.json dibuat. Tanpa ambang: tidak pernah 503,
     tapi ikut status_riwayat tiap jam sehingga /api/sla dan dashboard kinerja punya median dan p95-nya. */
  const [dib, lewat] = await Promise.all([dibuatAset(env, url, "/data/meta.json"), dibuatAset(env, url, "/data/meta.json", "data_terakhir")]);
  if (dib != null && lewat != null && dib >= lewat) sumber.jeda_satelit = {dibuat: new Date(lewat).toISOString(), umur_jam: Math.round((dib - lewat) / JAM * 10) / 10, ambang_jam: null};
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
  "POST /admin/keluar": async (env, req) => { await hapusSesiPemirsa(env, req); const k = St.keluar(); k.headers.append("set-cookie", cookiePemirsa("", 0)); return k; },   // keluar = sesi admin dan pemirsa
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
  ...RUTE_POSKO,
  ...RUTE_SITREP,   // arsip sitrep harian (src/sitrep.js)
  ...RUTE_BNPB,   // Ruang Koordinasi BNPB (docs/bnpb/ARSITEKTUR.md)
  ...RUTE_HUKUM,   // Pustaka Hukum BNPB (docs/bnpb/HUKUM.md)
  ...RUTE_KONTAK,   // buku kontak pemangku kepentingan, hanya admin (src/kontak.js)
  ...RUTE_RELAWAN,
  ...RUTE_ALUN,
  ...RUTE_RISET,
  ...RUTE_MEJA,
  ...RUTE_UJI,   // uji lapangan karhutla: GET /api/uji-lapangan agregat Q1-Q5, tanpa data pribadi (src/uji_lapangan.js)
  ...RUTE_INSTANSI,   // akun instansi (pemda, polisi, TNI) dan tugas api per kompleks (src/instansi.js)
  ...RUTE_SLA,   // analitik SLA + data dummy (src/sla.js, 0042/0043)
  ...RUTE_PIPA,   // isian lapangan teranonim untuk pipeline, Bearer PIPA_TOKEN (src/pipa.js)
  ...RUTE_SIPPA,   // SIPPA: web /pipa staf BNPB, kit, tugas, log gelar, lapangan berkode (src/sippa.js; awalan /api/sippa/*, bukan /api/pipa/*)
  ...RUTE_PUSH,   // Web Push akun instansi: langganan perangkat, status, uji (src/push.js)
  ...RUTE_PENUGASAN,   // penugasan orang ke tugas api dan pelacak GPS lewat tautan /lacak/<token> (src/penugasan.js)
  ...RUTE_STAF,   // akun staf BNPB per orang dan peran (src/staf.js)
  ...RUTE_PEMIRSA,   // akun pemirsa: hanya melihat tab tertentu situs Centurisk97 (src/pemirsa.js)
  ...RUTE_INVENTARIS,   // inventaris peralatan pemadam per pihak dan gudang (src/inventaris.js)
  ...RUTE_KORBAN,   // laporan korban jiwa: instansi dan Pusdalops melapor, verifikasi, butir Meja Pantau (src/korban.js)
  ...RUTE_OMC,   // catatan sortie OMC: staf TMC mengisi, GET /api/omc/sortie publik untuk pipeline (src/omc.js)
  ...RUTE_LAPORAN_KARHUTLA,   // Laporan Karhutla otomatis: draf, kirim, verifikasi, kunci, ralat, snapshot (src/laporan_karhutla.js)
  ...RUTE_PANTAU,   // Meja Pantau: antrean kerja harian staf (src/pantau.js)
  ...RUTE_OPS,   // operasi pemadaman lapangan (src/operasi_lapangan.js)
  ...RUTE_PENGINGAT,   // antrean pengingat harian Ruang Koordinasi (src/pengingat.js)
  ...RUTE_LAPORAN_BNPB,   // Laporan Harian & Paparan Presiden BNPB yang diketik tim (public/laporan_bnpb*)
  ...RUTE_RUMAH_RUSAK,   // rumah rusak RB/RS/RR per rumah, akun atau regu berkode (public/rumah_rusak*)
  ...RUTE_KUNCI_API,   // penerbitan kunci API mitra (/api/v1/*, src/api_v1.js); API-nya sendiri ditangani langsung di fetch()
  "GET /admin/kunci-api": (env, req, url, kini) => St.halamanAdmin(env, req, kini, halamanKunciApi()),
  "GET /admin/kontak": (env, req, url, kini) => St.halamanAdmin(env, req, kini, halamanKontak()),
  ...RUTE_BANGUNAN,   // paparan bangunan Open Buildings dari R2 MEDIA bangunan/, hanya pengguna masuk (src/bangunan.js)
  ...RUTE_RISIKO7,   // peta peluang api 7 hari (eksperimental) dari R2 MEDIA risiko/, hanya admin atau akun pemirsa (src/risiko7.js)
  ...RUTE_PENDATAAN,   // pendataan Satu Data BNPB Fase 1: akun responden, isian data/aplikasi, monitoring Super Admin (src/pendataan.js)
};
let GABUNG = null;
const tabelRute = () => GABUNG ||= {...RUTE, ...Ews.RUTE_EWS};
/* CSRF untuk POST: origin lain ditolak. POST yang membawa cookie sesi_admin atau sesi_pendataan wajib Origin sama-situs: Origin kosong atau "null" (iframe tersandbox, pengalihan lintas situs)
   ditolak, karena SameSite=Lax tidak menahannya. Tanpa cookie sesi (publik, token header): seperti semula.
   Pengecualian: halaman admin ber-Referrer-Policy no-referrer, jadi form POST sama-situs (Keluar, Masuk dengan cookie lama) dikirim peramban dengan
   Origin "null". Itu diterima HANYA bila Sec-Fetch-Site = same-origin (header terlarang, tak bisa dipalsukan halaman; iframe tersandbox mengirim cross-site). */
export const tolakOrigin = (req, url) => {
  const o = req.headers.get("origin"), sesi = /(?:^|;\s*)(?:sesi_admin|sesi_pendataan)=/.test(req.headers.get("cookie") || "");
  const kosong = !o || o === "null", samaPeramban = kosong && req.headers.get("sec-fetch-site") === "same-origin";
  if (sesi ? (!samaPeramban && (kosong || !URL.canParse(o) || new URL(o).host !== url.host)) : (!kosong && (!URL.canParse(o) || new URL(o).host !== url.host))) return gagal(403, "origin lain ditolak");
  return null;
};
async function rute(env, req, url, ctx) {
  /* /lacak (halaman statis; token di fragmen #<36 hex>, dibaca peramban); API-nya (/api/lacak/*) membawa token di header x-lacak */
  if (url.pathname === "/lacak" || url.pathname === "/lacak/") { const h = await halamanLacak(env, req, url); if (h) return h; }
  const jalur = url.pathname.replace(/\/+$/, "") || "/", tgl = jalur.match(/^(\/api\/laporan-karhutla\/snapshot)\/(\d{4}-\d{2}-\d{2})$/), id = tgl ? tgl[2] : jalur.match(/\/([0-9a-f]{16})$/)?.[1];
  const kunci = tgl ? tgl[1] + "/:tanggal" : id ? jalur.slice(0, -16) + ":id" : jalur, tabel = tabelRute();
  const f = tabel[req.method + " " + kunci];
  if (!f) {   // jalur ada tapi metode lain: 405, bukan jatuh ke aset statis (HEAD/OPTIONS tetap lewat seperti semula)
    const ok = ["GET", "POST"].filter(m => tabel[m + " " + kunci]);
    return ok.length && req.method !== "HEAD" && req.method !== "OPTIONS" ? gagal(405, "metode tidak diizinkan", {allow: ok.join(", ")}) : null;
  }
  if (req.method === "POST") {   // CSRF: POST dari origin lain ditolak (cookie sesi SameSite=Lax)
    const x = tolakOrigin(req, url); if (x) return x;
    if (!env.IP_SALT && !url.pathname.startsWith("/api/jejak")) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  }
  try { return await f(env, req, url, Date.now(), ctx, id); }
  catch (e) { console.error("rute", url.pathname, e); return gagal(500, "galat server"); }
}

/* ================= HTML lewat Worker (statistik publik) — dipisah supaya mudah digabung dengan perubahan routing lain =================
   Hanya rute HTML di daftar ini yang memanggil Worker; JS/CSS/JSON/gambar tetap aset statis tanpa pemanggilan Worker.
   Syarat: wrangler.jsonc assets.html_handling = "none", supaya "/" dan "/banjir/" tidak dijawab aset otomatis.
   [pola jalur, berkas aset, kunci jalur untuk statistik (null = pakai jalur yang dinormalkan)] */
const BNPB_BERSIH = {index: "/bnpb", relawan: "/relawan", "relawan-saya": "/relawan/saya", kampus: "/kampus", "alun-alun": "/alun-alun", riset: "/riset", mitra: "/riset/mitra",
  meja: "/meja", risiko: "/risiko", sitrep: "/sitrep", kebutuhan: "/kebutuhan", kebakaran: "/risiko-kebakaran", hukum: "/bnpb/hukum", pendataan: "/pendataan"};
export const HOST_TERKUNCI = new Set(["centurisk97.id", "www.centurisk97.id"]);
/* centurisk97.id tampil sama dengan centurisk97.*.workers.dev: data perusahaan, merek Centurisk97 (pemilik, 19 Okt 2026) */
export const situsCenturisk = h => h.endsWith(".workers.dev") || HOST_TERKUNCI.has(h);
export const HTML_RUTE = [
  ...ruteBencana(),   // "/", "/banjir/", tab dan kejadian dari registry; bencana "mati" tanpa rute
  [/^\/tentang-halaman\/?$/, "/tentang.html", "/tentang-halaman"],   /* /tentang kini tab di index.html (registry) */   // html_handling "none" mematikan /tentang -> tentang.html otomatis
  [/^\/privasi\/?$/, "/privasi.html", "/privasi"],
  [/^\/peringatan\/?$/, "/peringatan.html", "/peringatan"],
  [/^\/laporan\/?$/, "/laporan.html", "/laporan"],
  [/^\/paparan\/?$/, "/paparan.html", "/paparan"],   // deck paparan rakor karhutla per provinsi (public/paparan*)
  [/^\/laporan-konsesi\/?$/, "/laporan_konsesi.html", "/laporan-konsesi"],   // laporan konsesi terbakar 2026, hanya *.workers.dev   // laporan harian karhutla (public/laporan.*)
  [/^\/presiden\/?$/, "/presiden.html", "/presiden"],   // panel publik agregat karhutla untuk dashboard presiden (public/presiden*); boleh di-iframe dari domain mana pun
  [/^\/uji-lapangan\/?$/, "/instansi_uji.html", "/uji-lapangan"],   // protokol + hasil uji lapangan karhutla (public/instansi_uji*, src/uji_lapangan.js); di centurisk97.id wajib masuk
  [/^\/kabar\/?$/, "/kabar.html", "/kabar"],   // kabar api prioritas per kabupaten, diteruskan Pusdalops ke WA BPBD (public/kabar*, data scripts/data/kabar_kab.py)
  [/^\/laporan-bnpb\/?$/, "/laporan_bnpb.html", "/laporan-bnpb"],
  [/^\/dokumen\/?$/, "/dokumen.html", "/dokumen"],   // generator dokumen: laporan dan data ke Excel, PDF, Word, PowerPoint (public/dokumen*)   // input + ekspor Laporan Harian & Paparan Presiden BNPB, hanya situs Centurisk97
];
/* Gerbang centurisk97.id: DEFAULT TERTUTUP. Halaman = /f/, HTML_RUTE, dan tiap rute GET di tabel RUTE yang bukan /api/, /admin (menjaga diri sendiri
   dan /admin/masuk harus terbuka), /ews/ (tautan surel konfirmasi/berhenti) atau /ubin/. Halaman baru otomatis ikut terkunci; yang boleh terbuka HARUS tercatat di sini. */
/* Cakupan: gerbang ini menutup CANGKANG HALAMAN (HTML, termasuk berkas .html yang dibuka langsung lewat run_worker_first di wrangler*.jsonc),
   BUKAN /data/*.json, JS, CSS, atau gambar: itu tetap aset statis publik tanpa Worker. */
export const PUBLIK_TANPA_SESI = new Map([["/lapangan", "regu lapangan masuk dengan KODE tanpa akun (keputusan pemilik 19 Okt 2026); kode dicek di tiap panggilan API"],
  ["/daftar-kontak", "registrasi kontak pemangku kepentingan (kepala daerah, BPBD, TNI, Polri) yang tidak punya akun situs (permintaan pemilik 23 Okt 2026); hanya menulis baris menunggu, tidak membaca apa pun"],
  ["/presiden", "panel publik agregat karhutla untuk dashboard presiden, tanpa data pribadi (keputusan pemilik 22 Okt 2026)"],
  ["/instansi", "pemda, polisi, dan TNI masuk dengan username dan sandi akun instansi sendiri, bukan sesi admin (keputusan pemilik 21 Okt 2026); sesi, status aktif, dan cakupan wilayah dicek di tiap panggilan API"],
  ["/pendataan", "pendataan Satu Data BNPB: staf direktorat membuat akun sendiri tanpa akun situs (keputusan pemilik 26 Okt 2026); akun baru menunggu persetujuan Super Admin, sesi dan status aktif dicek di tiap panggilan API"]]);
function halamanTerkunci(url) {
  const jalur = url.pathname.replace(/\/+$/, "") || "/";
  if (/\.html$/i.test(url.pathname)) return true;   // berkas HTML statis dibuka langsung lewat nama (Worker dipanggil hanya untuk pola ini)
  if (PUBLIK_TANPA_SESI.has(jalur)) return false;
  if (url.pathname.startsWith("/f/") || HTML_RUTE.some(([re]) => re.test(url.pathname))) return true;
  const kunci = /\/[0-9a-f]{16}$/.test(jalur) ? jalur.slice(0, -16) + ":id" : jalur;
  return !!tabelRute()["GET " + kunci] && !/^\/(api|admin|ews|ubin|pipa)(\/|$)/.test(jalur);   // /pipa* menjaga dirinya sendiri (src/sippa.js, DESAIN-TEKNIS SIPPA §1.4): tamu 303 ke /admin/pantau?ke=, bukan ke /admin/masuk
}
function catatHTML(env, req, jalur, ctx) {
  if (env.DB) ctx?.waitUntil?.(Pub.catatHit(env, req, jalur).catch(e => console.error("hit", e)));
}
async function layaniHTML(req, env, ctx, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  const cocok = HTML_RUTE.find(([re]) => re.test(url.pathname)); if (!cocok) return null;
  const jalur = cocok[2] || url.pathname.replace(/\/+$/, "");
  /* situs Centurisk97 tanpa halaman Tentang di bencana mana pun (pemilik, 19 Okt 2026): /tentang, /tentang-halaman, /<bencana>/tentang -> peta */
  const tt = situsCenturisk(url.hostname) && url.pathname.match(/^(\/[a-z]+)?\/tentang(-halaman)?\/?$/);
  if (tt) return Response.redirect(new URL(tt[1] ? `${tt[1]}/peta` : "/", url), 302);
  /* laporan konsesi hanya di alamat Centurisk97 (*.workers.dev), pemilik 18 Okt 2026 */
  if ((jalur === "/laporan-konsesi" || jalur === "/laporan-bnpb") && !situsCenturisk(url.hostname) && url.hostname !== "localhost") return new Response("Tidak ditemukan", {status: 404});
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
  /* akun pemirsa: tab yang boleh dilihat ditulis di <html data-pemirsa-tab>, public/index.html menyembunyikan tab lain (admin tidak dibatasi) */
  const pm = await pemirsaSesi(env, req), pmTab = pm && !await adminOK(env, req) ? pm.tab.join(",") : null;
  /* merek: semua berkas sudah bertulisan "Centurisk97" di sumbernya (pemilik, 26 Okt 2026), jadi tidak ada penulisan ulang merek per alamat */
  const keluaran = new HTMLRewriter().on("html", {element: el => {
    if (a) { el.setAttribute("data-pb-online", String(a.online)); el.setAttribute("data-pb-tampil", String(a.tampilan)); }
    if (situsW) el.setAttribute("data-situs", "w");
    if (pmTab) el.setAttribute("data-pemirsa-tab", pmTab);
  }}).transform(aset);
  /* HTML per orang (pemirsa) dan di balik login (host terkunci): jangan disimpan cache bersama */
  if (pmTab || HOST_TERKUNCI.has(url.hostname) || jalur === "/uji-lapangan") { keluaran.headers.set("cache-control", "private, no-store"); keluaran.headers.append("vary", "cookie"); }
  return keluaran;
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

/* /presiden saja: boleh di-iframe dari domain mana pun (pemilik 22 Okt 2026). ASSETS.fetch membawa X-Frame-Options SAMEORIGIN
   dari /* di public/_headers, jadi ditimpa di sini (satu-satunya tempat). 'unsafe-inline' untuk skrip tema di kepala presiden.html;
   tiles.openfreemap.org + blob: untuk peta MapLibre di tab Peta. */
const CSP_PRESIDEN = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://tiles.openfreemap.org; worker-src 'self' blob:; child-src 'self' blob:; frame-ancestors *; object-src 'none'; base-uri 'self'; form-action 'none'";
function bisaDiIframe(res) {
  const h = new Headers(res.headers); h.delete("x-frame-options"); h.delete("content-security-policy");
  h.set("content-security-policy-report-only", CSP_PRESIDEN);
  return new Response(res.body, {status: res.status, statusText: res.statusText, headers: h});
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    /* API terbuka mitra: di SEMUA host (termasuk centurisk97.id), sebelum gerbang halaman dan pencatatan pemirsa. /api = dokumentasinya (public/api.html). */
    if (url.pathname === "/api/v1" || url.pathname.startsWith("/api/v1/")) return layaniApiV1(req, env, ctx, url);
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") return layaniMcp(req, env, ctx, url);   // server MCP remote (src/mcp.js), juga di semua host
    if ((url.pathname === "/api" || url.pathname === "/api/") && (req.method === "GET" || req.method === "HEAD")) {
      /* dokumentasi di centurisk97.id hanya untuk yang masuk: admin atau akun pemirsa (pemilik 23 Okt 2026, akun mitra); endpoint /api/v1 dan /mcp tetap terbuka */
      const kunci = HOST_TERKUNCI.has(url.hostname);
      if (kunci && !await adminOK(env, req) && !await pemirsaSesi(env, req)) return new Response(null, {status: 303, headers: {location: "/admin/masuk?ke=%2Fapi", "cache-control": "no-store"}});
      const d = await env.ASSETS.fetch(new Request(new URL("/api.html", url)));
      return new Response(d.body, {status: d.status, headers: {"content-type": "text/html; charset=utf-8", "cache-control": kunci ? "private, no-store" : "public, max-age=300", "x-content-type-options": "nosniff"}});
    }
    if (url.pathname.startsWith("/ubin/")) return layaniUbin(req, env, ctx);   // ubin PMTiles dari R2 (src/ubin.js)
    if (url.pathname === "/api/titik" && req.method === "GET") return cacheTepi(req, ctx, 600, () => titikTerbaru(env));
    if (url.pathname === "/api/himawari" && req.method === "GET") return cacheTepi(req, ctx, 300, async () => {   // hotspot Himawari: R2 data/himawari.json (diunggah Action 30 menit); hilang = kosong, bukan 500
      return new Response(JSON.stringify(await himawariRespons(env)), {headers: {"content-type": "application/json; charset=utf-8"}});
    });
    if (url.pathname.startsWith("/api/cuaca/")) { const c = await layaniNowcast(req, env, ctx, url); if (c) return c; }   // nowcast BMKG D1 (src/nowcast.js)
    if (url.pathname.startsWith("/api/gunungapi/")) { const g = await layaniGunungapi(req, env, ctx, url); if (g) return g; }   // level gunung api MAGMA D1 (src/gunungapi.js)
    if (url.pathname.startsWith("/api/banjir/")) { const b = await ruteSihka(req, env, ctx, url); if (b) return b; }   // sungai terukur SIHKA D1 (src/sihka.js)
    if (url.pathname.startsWith("/api/gempa/")) { const g = await layaniGempa(req, env, ctx, url); if (g) return g; }   // katalog gempa D1 (src/gempa.js)
    if (url.pathname.startsWith("/api/peringatan/") || url.pathname.startsWith("/api/admin/peringatan/")) { const p = await layaniPeringatan(req, env, ctx, url); if (p) return p; }   // peringatan dini (src/peringatan.js)
    if (url.pathname === "/api/status" && req.method === "GET") return cacheTepi(req, ctx, 60, () => status(env, url, Date.now()));
    /* tautan bersih halaman karhutla (/peta, /k/K0001, /sim/K0001): sajikan index.html, routing di peramban */
    if (url.pathname === "/sitemap.xml" && (req.method === "GET" || req.method === "HEAD"))
      return new Response(req.method === "HEAD" ? null : sitemap(url.origin), {headers: {"content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600"}});
    /* centurisk97.id: semua halaman HTML wajib masuk admin dulu (pemilik 19 Okt 2026). Aset statis (JS/JSON/gambar) tidak lewat Worker. */
    /* Ruang Koordinasi: berkas /bnpb/*.html hanya lewat jalur bersihnya (halamanBnpbPublik memberi CSP ketat, no-store untuk halaman berkode);
       dibuka langsung = 301 ke jalur bersih (fragmen #k= ikut dibawa peramban), berkas tak dikenal = 404 */
    if (url.pathname.startsWith("/bnpb/") && url.pathname.endsWith(".html")) {
      const ke = BNPB_BERSIH[url.pathname.slice(6, -5)];
      return ke ? new Response(null, {status: 301, headers: {location: ke + url.search, "cache-control": "no-store"}}) : new Response("Tidak ditemukan", {status: 404});
    }
    if (HOST_TERKUNCI.has(url.hostname) && url.pathname === "/lapangan.html") return new Response(null, {status: 303, headers: {location: "/lapangan", "cache-control": "no-store"}});   // satu pintu: /lapangan (CSP ketat)
    if (url.pathname === "/instansi.html") return new Response(null, {status: 303, headers: {location: "/instansi", "cache-control": "no-store"}});   // satu pintu: /instansi (CSP ketat)
    if (url.pathname === "/instansi_uji.html") return new Response(null, {status: 303, headers: {location: "/uji-lapangan", "cache-control": "no-store"}});   // satu pintu: /uji-lapangan
    if (url.pathname === "/presiden.html") return new Response(null, {status: 303, headers: {location: "/presiden" + url.search, "cache-control": "no-store"}});   // satu pintu: /presiden (publik, bisa di-iframe)
    if (url.pathname === "/rumah_rusak.html") return new Response(null, {status: 303, headers: {location: "/rumah-rusak", "cache-control": "no-store"}});   // satu pintu: /rumah-rusak (CSP ketat, 404 di luar Centurisk97)
    /* /uji-lapangan (evaluasi internal): admin ATAU pemirsa di SEMUA host; pemirsa tidak dialihkan ke tab pertamanya oleh gerbang di bawah */
    let ujiOK = false;
    if (/^\/uji-lapangan\/?$/.test(url.pathname) && (req.method === "GET" || req.method === "HEAD")) {
      if (!await adminOK(env, req) && !await pemirsaSesi(env, req)) return new Response(null, {status: 303, headers: {location: "/admin/masuk?ke=" + encodeURIComponent(url.pathname), "cache-control": "no-store"}});
      ujiOK = true;
    }
    if (!ujiOK && HOST_TERKUNCI.has(url.hostname) && (req.method === "GET" || req.method === "HEAD") && halamanTerkunci(url) && !await adminOK(env, req)) {
      /* akun pemirsa (src/pemirsa.js): hanya tab miliknya; halaman lain dialihkan ke tab pertamanya */
      const p = await pemirsaSesi(env, req), ke = p ? arahPemirsa(p, url.pathname) : "/admin/masuk?ke=" + encodeURIComponent(url.pathname + url.search);
      if (ke) return new Response(null, {status: 303, headers: {location: ke, "cache-control": "no-store"}});
    }
    const r = await rute(env, req, url, ctx); if (r) return r;
    const h = await layaniHTML(req, env, ctx, url);
    if (h) return /^\/presiden\/?$/.test(url.pathname) ? bisaDiIframe(h) : h;
    if (!url.pathname.startsWith("/api/warga")) return env.ASSETS.fetch(req);
    const kini = Date.now(), p = url.pathname.replace(/\/+$/, "").split("/").slice(3);   // ["", "api", "warga", ...]
    try {
      if (req.method === "POST") {
        const x = tolakOrigin(req, url); if (x) return x;
        if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
      }
      if (p.length === 0 && req.method === "GET") return cacheTepi(req, ctx, 30, () => daftar(env, url, kini));
      if (p.length === 0 && req.method === "POST") return buat(env, req, url, kini, ctx);
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
      /* antrean panggilan perusahaan: invokasi sendiri (menit 16, sesudah titik di menit 15) supaya parse konsesi2026/<prov>.json punya anggaran CPU sendiri */
      if (m === 16 && w.getUTCHours() % 3 === 0) try { console.log("antrean", JSON.stringify(await buatAntrean(env, sekarang))); } catch (e) { console.error("antrean", e?.message); }
      /* tugas api instansi: tiap menit memeriksa `dibuat` tugas_kompleks.json (murah) dan membuat tugas sekali per versi baru; verifikasi padam tetap menit 18 jam kelipatan 3 */
      try { const h = await tugasBaruDariBerkas(env, sekarang); if (!h.lewat || h.padam) console.log("tugas api", JSON.stringify(h)); } catch (e) { console.error("tugas api", e?.message); }
      if (m >= 25 && w.getUTCHours() % 3 === 0) try { const r = await kirimPushDaerah(env, sekarang); if (r.akun) console.log("push daerah", JSON.stringify(r)); } catch (e) { console.error("push daerah", e?.message); }   // push 3 jam: menit 25 (sesudah tugas api menit 18), menit 26+ melanjutkan sisa akun
      if (w.getUTCHours() === 0 && (m === 5 || m === 35)) try { console.log("sitrep", JSON.stringify(await arsipkanSitrep(env, sekarang, m === 35))); } catch (e) { console.error("sitrep", e?.message); }   // arsip sitrep 07 WIB (menit 35 = ulang bila gagal)
      if (w.getUTCHours() === 0 && (m === 1 || m === 31)) try { console.log("laporan karhutla", JSON.stringify(await buatDrafLaporanKarhutla(env, sekarang))); } catch (e) { console.error("laporan karhutla", e?.message); }   // draf harian 07.01 WIB (menit 31 = ulang bila gagal; idempoten)
      if (w.getUTCHours() === 0 && m === 40) try { console.log("pengingat", JSON.stringify(await buatPengingat(env, sekarang))); } catch (e) { console.error("pengingat", e?.message); }   // antrean pengingat 07.40 WIB (idempoten)
      if (m === 55 && w.getUTCHours() % 6 === 0) try { console.log("pengingat prioritas", JSON.stringify(await buatPengingatPrioritas(env, sekarang))); } catch (e) { console.error("pengingat prioritas", e?.message); }   // F2 jam 00/06/12/18 UTC menit 55, sesudah titik.yml menerbitkan risiko_prioritas.json (idempoten)
      if (m === 20) try { console.log("uji lapangan", JSON.stringify(await jalankanUji(env, sekarang))); } catch (e) { console.error("uji lapangan", e?.message); }   // sampel kontrol mingguan, kedaluwarsa kontrol, penilaian api terlewat (Q2); tiap jam, murah bila tak ada pekerjaan
      if (m === 23) try { console.log("drop", JSON.stringify(await nilaiDropTertunda(env, sekarang))); } catch (e) { console.error("drop", e?.message); }   // L11: nilai drop heli yang jendela 6 jamnya lewat, tiap jam
      try { const h = await ulangiKabar(env, sekarang); if (h.coba) console.log("kabar ulang", JSON.stringify(h)); } catch (e) { console.error("kabar ulang", e?.message); }   // kabar seketika yang gagal: coba lagi (jeda 1/5/15/60 menit)
      try { const h = await alarmHimawari(env, sekarang); if (h.baru || h.hilang) console.log("alarm himawari", JSON.stringify(h)); } catch (e) { console.error("alarm himawari", e?.message); }   // etag R2 berubah -> tandaiBaru -> alarm_himawari + kabar Posko pusat
      if (m === 17) try { await bersihSemua(env, sekarang); } catch (e) { console.error("bersih", e?.message); }
    }
    if (ev.cron === CRON_TITIK) return console.log("titik", JSON.stringify(await perbaruiTitik(env)));
    if (ev.cron === CRON_GEMPA) {
      /* tiap langkah dibungkus sendiri: galat katalog gempa tidak boleh menahan email tsunami/gempa ke pelanggan EWS di bawah */
      try { console.log("gempa", JSON.stringify(await perbaruiGempa(env, ev.scheduledTime))); } catch (e) { console.error("gempa", e?.message); }
      if (new Date(sekarang).getUTCMinutes() % 10 === 0) try { console.log("nowcast", JSON.stringify(await perbaruiNowcast(env, sekarang))); } catch (e) { console.error("nowcast", e?.message); }
      if (new Date(sekarang).getUTCMinutes() % 30 === 7) try { console.log("gunungapi", JSON.stringify(await perbaruiGunungapi(env, sekarang))); } catch (e) { console.error("gunungapi", e?.message); }   // MAGMA: satu permintaan per 30 menit
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
    try { await bersihkan(env); } catch (e) { console.error("bersihkan", e); }
    try { console.log("foto", JSON.stringify(await bersihkanFoto(env))); } catch (e) { console.error("foto", e); }
    try { await bersihkanStaf(env, Date.now()); await bersihkanPantau(env, Date.now()); } catch (e) { console.error("pantau", e?.message); }   // migrasi 0030 belum jalan = cron lain tetap jalan
    try { await bersihkanPemirsa(env, Date.now()); } catch (e) { console.error("pemirsa", e?.message); }
    try { await bersihkanInstansi(env, Date.now()); } catch (e) { console.error("instansi", e?.message); }   // migrasi 0029 belum jalan = cron lain tetap jalan
    try { await bersihkanPosko(env, Date.now()); } catch (e) { console.error("posko", e?.message); }   // migrasi 0018 belum jalan = cron lain tetap jalan
    try { await isiWilayahLaporan(env, Date.now()); } catch (e) { console.error("wilayah laporan", e?.message); }   // migrasi 0027 belum jalan = cron lain tetap jalan
    try { await bersihkanBnpb(env, Date.now()); } catch (e) { console.error("bnpb", e?.message); }   // migrasi 0022 belum jalan = cron lain tetap jalan
    try { await segarkanRingkas(env); } catch (e) { console.error("meja ringkas", e?.message); }   // tanda berbasis waktu (logistik >24 jam dst.) di agregat Meja Kerja
    try { await bersihkanArsipSitrep(env, Date.now()); } catch (e) { console.error("arsip sitrep", e?.message); }   // retensi 400 hari
    try { await bersihkanRelawan(env, Date.now()); } catch (e) { console.error("relawan", e?.message); }   // retensi UU PDP: ditolak/nonaktif > 180 hari dianonimkan
    try { await bersihkanGempa(env, Date.now()); } catch (e) { console.error("gempa", e); }
    try { await bersihkanPeringatan(env, Date.now()); } catch (e) { console.error("peringatan", e?.message); }   // migrasi 0009 belum jalan = cron lain tetap jalan
    try { console.log("ews", JSON.stringify(await Ews.bersihkanEws(env, sekarang)), JSON.stringify(await Ews.kirimEws(env, sekarang))); } catch (e) { console.error("ews", e); }   // migrasi 0011 belum jalan = cron lain tetap jalan
    const kini = Date.now();   // pita gangguan di grafik statistik: sumber basi tercatat per jam
    let hs = null;
    try { hs = await periksaStatus(env, new URL("http://aset.lokal/"), kini); await St.catatGangguan(env, hs, kini); } catch (e) { console.error("gangguan", e?.message); }
    if (hs) try { await catatRiwayatStatus(env, hs, kini); } catch (e) { console.error("riwayat status", e?.message); }   // migrasi 0042 belum jalan = dilewati
    try { await bersihkanKabar(env, kini); await bersihkanAlarm(env, kini); } catch (e) { console.error("kabar/alarm", e?.message); }
    try { await Pub.musnahkanGaram(env, kini).run(); } catch (e) { console.error("garam", e?.message); }   // garam hari sebelumnya dimusnahkan: hash kemarin tak bisa dicocokkan lagi
    try {
      const ip = await env.DB.prepare("SELECT min(diambil) t, count(*) n FROM stat_ip").first();   // daftar IP perayap: sehari sekali
      if (!ip.n || kini - ip.t > 24 * JAM) console.log("rentang ip", JSON.stringify(await Pub.perbaruiRentang(env, kini)));
    } catch (e) { console.error("rentang ip", e?.message); }
}
