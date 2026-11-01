/* Cangkang halaman /petugas saja. Data API TIDAK pernah disimpan (isinya pribadi). Naikkan VERSI bila berkas cangkang berubah. */
const VERSI = "petugas-cangkang-v1";
const CANGKANG = ["/petugas/index.html", "/petugas/app.js", "/petugas/umum.js", "/petugas/murni.js", "/petugas/lapangan.css?v=1",
  "/inti/tema.css", "/inti/gaya.css", "/inti/kepala.css", "/inti/kepala.js", "/akademisi_tema.js", "/img/logo.svg?v=2"];

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSI).then(c => c.addAll(CANGKANG)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("petugas-cangkang-") && k !== VERSI).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;   // API selalu ke jaringan
  const navigasi = r.mode === "navigate" && (u.pathname === "/petugas" || u.pathname === "/petugas/");
  e.respondWith(
    fetch(r).then(res => { if (res.ok && (navigasi || CANGKANG.some(p => p.split("?")[0] === u.pathname))) { const salin = res.clone(); caches.open(VERSI).then(c => c.put(navigasi ? "/petugas/index.html" : r, salin)); } return res; })
      .catch(() => caches.match(navigasi ? "/petugas/index.html" : r))
  );
});
