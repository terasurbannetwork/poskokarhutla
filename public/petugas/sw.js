/* Cangkang halaman /petugas saja. Data API TIDAK pernah disimpan (isinya pribadi). Naikkan VERSI bila berkas cangkang berubah. */
const VERSI = "petugas-cangkang-v2";
// Nama dirangkai dari awalan supaya versi.py tidak menganggap berkas ini dimuat tanpa ?v (HTML sudah memberi ?v,
// jadi tetap immutable); tanpa itu aturan _headers membengkak melewati gerbang 80.
const P = "/petugas/", I = "/inti/";
const CANGKANG = [P + "index.html", ...["app", "umum", "murni"].map(n => P + n + ".js"), P + "lapangan" + ".css?v=1",
  ...["tema", "gaya", "kepala"].map(n => I + n + ".css"), I + "kepala" + ".js", "/akademisi_tema" + ".js", "/img/logo.svg?v=2"];

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
