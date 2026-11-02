/* Cangkang halaman /petugas saja. Data API TIDAK pernah disimpan (isinya pribadi). Naikkan VERSI bila berkas cangkang berubah. */
const VERSI = "petugas-cangkang-v3";
// Nama dirangkai dari awalan supaya versi.py tidak menganggap berkas ini dimuat tanpa ?v (mereka diberi ?v oleh HTML,
// jadi tetap immutable); tanpa itu aturan _headers membengkak melewati gerbang 80.
const P = "/petugas/", I = "/inti/";
const CANGKANG = [P + "index.html", ...["app", "umum", "murni", "layar_kamera", "layar_logbook", "layar_regu", "tinjau_kartu", "panel_murni", "wajah", "wajah_murni", "antispoof", "antispoof_murni", "stempel", "antre", "luring", "gps", "ikon", "logbook_murni"].map(n => P + n + ".js"), P + "lapangan" + ".css?v=1",
  ...["tema", "gaya", "kepala"].map(n => I + n + ".css"), I + "kepala" + ".js", "/akademisi_tema" + ".js", "/img/logo.svg?v=2"];

/* model wajah (sekitar 10 MB) dan pustaka Human: cache-first sekali per HP. Nama berkas model tetap; ganti MODEL saat versi Human/model berubah. */
const MODEL = "petugas-model-v2", BERAT = [P + "model/", P + "vendor/"];

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSI).then(c => c.addAll(CANGKANG)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("petugas-cangkang-") && k !== VERSI).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;   // API selalu ke jaringan
  if (BERAT.some(b => u.pathname.startsWith(b))) {
    e.respondWith(caches.open(MODEL).then(c => c.match(r).then(h => h || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  const navigasi = r.mode === "navigate" && (u.pathname === "/petugas" || u.pathname === "/petugas/");
  e.respondWith(
    fetch(r).then(res => { if (res.ok && (navigasi || CANGKANG.some(p => p.split("?")[0] === u.pathname))) { const salin = res.clone(); caches.open(VERSI).then(c => c.put(navigasi ? "/petugas/index.html" : r, salin)); } return res; })
      .catch(() => caches.match(navigasi ? "/petugas/index.html" : r))
  );
});
