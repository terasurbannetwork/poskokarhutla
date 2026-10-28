/* Atur drone ke gambut membara (/admin/drone, pemilik 28 Okt 2026). Panduan: docs/bnpb/PANDUAN-DRONE-GAMBUT.md.
   Tahap 1: halaman saja. Data dari /data/kluster_awal.json (bara.sel dari scripts/data/harian.py), rute sapuan dan KMZ dihitung di peramban
   (public/admin/drone.js), jadi tidak ada rute tulis, tabel D1, atau batas laju di sini. Tahap 2 (kirim ke dock) menambah rute POST sendiri.
   Hak buka: admin moderator, staf BNPB peran apa pun, atau akun instansi aktif. Akun gerbang situs saja = 403 polos; tamu = 303 ke Meja Pantau. */
import {adminOK} from "./worker.js";
import {stafSesi} from "./staf.js";
import {modOK, superOK} from "./posko.js";
import {akunAktif} from "./instansi.js";
import {CSP_SIPPA} from "./admin_halaman.js";

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const H = {"content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "content-security-policy": CSP_SIPPA, "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "same-origin", "x-content-type-options": "nosniff", "x-frame-options": "DENY"};

export const halamanDrone = ctx => `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Atur drone gambut, Centurisk97</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link href="/vendor/maplibre/maplibre-gl.css" rel="stylesheet">
<link href="/admin/admin.css?v=7" rel="stylesheet">
<link href="/admin/drone.css?v=1" rel="stylesheet">
</head>
<body data-staf="1" data-super="${ctx.super ? 1 : 0}">
<header class="ad-top">
  <a class="ad-logo" href="/"><img src="/img/logo.svg?v=2" alt="" width="30" height="30">Centurisk97</a><span class="ad-sep staf">Drone</span>
  <nav aria-label="Halaman"><a href="/">🗺️ Peta</a><a href="/admin/drone" aria-current="page">🛸 Atur drone gambut</a></nav>
  ${ctx.nama ? `<span class="ad-staf-nama">${esc(ctx.nama)}</span>` : ""}
</header>
<main class="ad-wrap dr-wrap">
  <div class="ad-judul"><span class="ad-ikon" aria-hidden="true">🛸</span><h1>Atur drone gambut</h1><div class="ad-judul-aksi" id="aksiJudul"></div></div>
  <div class="ad-isi" id="app"><p class="ad-redup">Memuat cluster gambut membara…</p></div>
</main>
<script src="/vendor/maplibre/maplibre-gl.js"></script>
<script src="/laporan_koordalops.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/drone_rute.js?v=1"></script>
<script src="/admin/drone.js?v=1"></script>
</body></html>`;

async function konteks(env, req, kini) {
  if (await modOK(env, req)) return {nama: "Admin", super: !!await superOK(env, req)};
  const s = await stafSesi(env, req, kini);
  if (s) return {nama: s.nama, super: false};
  const a = await akunAktif(env, req, kini);
  if (!(a instanceof Response)) return {nama: a.nama || a.username, super: false};
  return await adminOK(env, req, kini) ? "gerbang" : null;
}

async function halaman(env, req, url, kini) {
  const ctx = await konteks(env, req, kini);
  if (ctx === "gerbang") return new Response(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Atur drone gambut, Centurisk97</title></head><body><p>Halaman ini untuk staf BNPB dan akun instansi. Masuk dengan akun staf atau akun instansi.</p></body></html>`, {status: 403, headers: H});
  if (!ctx) return new Response(null, {status: 303, headers: {location: "/admin/pantau?ke=" + encodeURIComponent(url.pathname + url.search), "cache-control": "no-store"}});
  return new Response(halamanDrone(ctx), {headers: H});
}

export const RUTE_DRONE = {
  "GET /admin/drone": (env, req, url, kini) => halaman(env, req, url, kini),
};
