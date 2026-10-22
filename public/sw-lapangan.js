/* Service worker regu lapangan: halaman /lapangan (kode regu) dan /lacak (token tugas) tetap terbuka tanpa sinyal.
   Satu skrip, didaftarkan dua kali (scope /lapangan oleh lapangan.js, scope /lacak oleh lacak.js). Terpisah dari sw-instansi.js (scope /instansi, hanya push).
   - Cangkang: HTML + JS + CSS (+ MapLibre lokal) disimpan saat pasang. Halaman network-first (batas 4 dtk) lalu simpanan; berkas ber-?v= cache-first; tanpa ?v= stale-while-revalidate.
   - API: HANYA GET /api/lapangan/saya, /api/lapangan/tugas, /api/lacak/info, network-first (batas 7 dtk), simpanan terakhir sebagai cadangan.
     Kunci simpanan = sha256(kode/token) + jalur, jadi tiap akun terpisah; hanya satu akun per jalur yang disimpan (yang lama dibuang). Hanya jawaban 200; 403/404/410 membuang simpanannya.
     Tanpa kode/token di header = tidak disimpan. POST tidak pernah disentuh (antrean draf ada di localStorage lapangan.js).
   - Peta luring: cache "pb-peta-luring" diisi lapangan_tugas.js ("Simpan peta area ini"); di sini hanya DIBACA (cache-first untuk tiles.openfreemap.org) dan TIDAK ikut dibersihkan saat versi naik.
   Naikkan VERSI bila logika berubah; cache cangkang/API versi lama dihapus saat aktif. */
"use strict";
const VERSI = 1, CANGKANG = `pb-lapangan-cangkang-v${VERSI}`, API = `pb-lapangan-api-v${VERSI}`, PETA = "pb-peta-luring-v1";
const TAWAR_MS = {halaman: 4000, api: 7000};
const JALUR_API = new Set(["/api/lapangan/saya", "/api/lapangan/tugas", "/api/lacak/info"]);
const KUNCI_KREDENSIAL = {"/api/lapangan/saya": "x-kode-regu", "/api/lapangan/tugas": "x-kode-regu", "/api/lacak/info": "x-lacak"};
const HALAMAN = {"/lapangan": "/lapangan", "/lapangan/": "/lapangan", "/lapangan.html": "/lapangan", "/lacak": "/lacak", "/lacak/": "/lacak"};
/* berkas yang dimuat belakangan (formulir rumah rusak, Kartu Api, peta): dipasang di muka supaya ada saat luring. URL persis sama dengan yang dimuat lapangan.js. */
const TAMBAHAN_LAPANGAN = ["/vendor/maplibre/maplibre-gl.js?v=4.7.1", "/vendor/maplibre/maplibre-gl.css?v=4.7.1", "/rumah_rusak.js?v=1", "/rumah_rusak.css?v=1", "/inti/lapor-gelap.css?v=1&k=2", "/img/logo.svg"];

/* src/href lokal .js/.css/.svg dari teks HTML (fungsi murni; diuji di Node lewat vm) */
function acuanLokal(html) {
  const keluar = new Set(), re = /<(?:script|link)\b[^>]*?\b(?:src|href)="(\/[^"#:]+\.(?:js|css|svg|webmanifest)(?:\?[^"#]*)?)"/gi;
  let m; while ((m = re.exec(html))) keluar.add(m[1].replace(/&amp;/g, "&"));
  return [...keluar];
}
const sha = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
const ujung = a => new Promise((_, no) => setTimeout(() => no(new Error("lambat")), a));
const jaringan = (req, ms) => Promise.race([fetch(req), ujung(ms)]);

self.addEventListener("install", e => e.waitUntil((async () => {
  const lapangan = self.registration.scope.replace(/\/$/, "").endsWith("/lapangan"), halaman = lapangan ? "/lapangan" : "/lacak";
  const c = await caches.open(CANGKANG), r = await fetch(halaman, {cache: "reload"});
  if (!r.ok) throw new Error("halaman tidak termuat");   // gagal pasang = dicoba lagi pada kunjungan berikut
  const html = await r.clone().text(); await c.put(halaman, r);
  await Promise.allSettled([...acuanLokal(html), ...(lapangan ? TAMBAHAN_LAPANGAN : ["/img/logo.svg"])].map(async u => { const x = await fetch(u); if (x.ok) await c.put(u, x); }));
  await self.skipWaiting();
})()));
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (/^pb-lapangan-/.test(k) && k !== CANGKANG && k !== API) await caches.delete(k);
  await self.clients.claim();
})()));

async function halaman(req, kunci) {
  const c = await caches.open(CANGKANG);
  try { const r = await jaringan(req, TAWAR_MS.halaman); if (r.ok) c.put(kunci, r.clone()); return r; }
  catch (x) { return (await c.match(kunci)) || Response.error(); }
}
async function aset(req, url) {
  const c = await caches.open(CANGKANG), ada = await c.match(req, {ignoreVary: true});
  if (ada && url.searchParams.has("v")) return ada;   // ber-?v= = isi tak berubah
  const ambil = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
  if (ada) { ambil.catch(() => {}); return ada; }   // tanpa ?v=: sajikan simpanan, segarkan di belakang
  return ambil;
}
async function api(req, url) {
  const nama = KUNCI_KREDENSIAL[url.pathname], kred = req.headers.get(nama);
  if (!kred) return fetch(req);
  const c = await caches.open(API), awalan = new URL(url.pathname, self.location.origin).href + "?k=", kunci = new Request(awalan + (await sha(kred)).slice(0, 24) + url.search.replace("?", "&"));
  const buang = async () => { for (const k of await c.keys()) if (k.url.startsWith(awalan) && k.url !== kunci.url) await c.delete(k); };
  try {
    const r = await jaringan(req, TAWAR_MS.api);
    if (r.status === 200) {
      const h = new Headers(r.headers); h.set("x-disimpan", String(Date.now())); h.delete("set-cookie");
      await buang(); await c.put(kunci, new Response(await r.clone().arrayBuffer(), {status: 200, headers: h}));
    } else if ([403, 404, 410].includes(r.status)) await c.delete(kunci);
    return r;
  } catch (x) {
    const s = await c.match(kunci); if (!s) throw x;
    const h = new Headers(s.headers); h.set("x-dari-cache", "1");
    return new Response(await s.arrayBuffer(), {status: 200, headers: h});
  }
}
async function peta(req) {
  const s = await (await caches.open(PETA)).match(req, {ignoreVary: true});
  return s || fetch(req);
}

self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "tiles.openfreemap.org") return e.respondWith(peta(req));
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate" && HALAMAN[url.pathname]) return e.respondWith(halaman(req, HALAMAN[url.pathname]));
  if (JALUR_API.has(url.pathname)) return e.respondWith(api(req, url));
  if (url.pathname.startsWith("/api/")) return;   // sisanya tidak pernah disimpan
  if (/\.(?:js|css|svg|webmanifest)$/.test(url.pathname) && !url.pathname.startsWith("/data/")) return e.respondWith(aset(req, url));
});
