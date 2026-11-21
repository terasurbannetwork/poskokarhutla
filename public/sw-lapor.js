/* Service worker Pantau Bencana /lapor (satu-satunya untuk lingkup ini; paket pwa-peringatan PW-04 dan lapor-luring LR-03).
   1. Peringatan dini: menerima push {judul, isi, tag, url} dari src/pw_peringatan.js dan membuka /lapor/ saat diketuk.
   2. Lapor tanpa sinyal: menyimpan cangkang halaman /lapor/ beserta aset bervesi supaya aplikasi tetap terbuka tanpa sinyal.
      Halaman: jaringan dulu, salinan simpanan bila gagal. Aset statis bervesi (?v=): simpanan dulu. /api/ tidak pernah disimpan.
   Naikkan VERSI tiap berkas ini berubah. */
const VERSI = "pb-lapor-1", SIMPAN = `${VERSI}-cangkang`;
const DASAR = ["/lapor/", "/lapor/manifest.webmanifest", "/lapor/ikon/192.png", "/lapor/lambang-bnpb.png", "/lapor/edukasi.json"];
/* aset yang dimuat index.html dibaca dari halamannya sendiri, jadi daftar ini tidak perlu disunting tiap versi aset naik */
const asetHalaman = html => [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map(m => m[1]).filter(u => !u.startsWith("/api/") && /\.(css|js|png|svg|jpg|json|webmanifest)(\?|$)/.test(u));
self.addEventListener("install", e => e.waitUntil((async () => {
  const c = await caches.open(SIMPAN);
  const r = await fetch("/lapor/", {cache: "no-store"}).catch(() => null);
  const daftar = new Set(DASAR); if (r?.ok) { const t = await r.clone().text(); asetHalaman(t).forEach(u => daftar.add(u)); await c.put("/lapor/", r); }
  await Promise.all([...daftar].filter(u => u !== "/lapor/").map(u => c.add(u).catch(() => {})));   // satu aset gagal tidak menggagalkan pemasangan
  await self.skipWaiting();
})()));
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("pb-lapor-") && k !== SIMPAN) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== self.location.origin || u.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate" && u.pathname.startsWith("/lapor")) {
    e.respondWith(fetch(req).then(r => { if (r.ok && u.pathname === "/lapor/") caches.open(SIMPAN).then(c => c.put("/lapor/", r.clone())); return r; })
      .catch(async () => (await caches.match("/lapor/")) || Response.error()));
    return;
  }
  const statis = /\.(css|js|png|svg|jpg|webp|json|webmanifest|woff2?)$/.test(u.pathname) && (u.pathname.startsWith("/lapor/") || u.pathname.startsWith("/inti/") || u.pathname.startsWith("/img/") || u.pathname.startsWith("/bnpb/") || u.pathname === "/bagi.js");
  if (!statis) return;
  e.respondWith(caches.match(req).then(ada => ada || fetch(req).then(r => { if (r.ok) { const salin = r.clone(); caches.open(SIMPAN).then(c => c.put(req, salin)); } return r; })));
});
/* ---- peringatan dini ---- */
const jalur = x => { try { const v = new URL(x || "/lapor/", self.location.origin); return v.origin === self.location.origin && v.pathname.startsWith("/lapor") ? v.pathname + v.search : "/lapor/"; } catch { return "/lapor/"; } };
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = {isi: e.data && e.data.text()}; }
  e.waitUntil(self.registration.showNotification(String(d.judul || "Pantau Bencana").slice(0, 120), {body: String(d.isi || "").slice(0, 300), tag: String(d.tag || "pw").slice(0, 64),
    renotify: true, icon: "/lapor/ikon/192.png", badge: "/lapor/ikon/lencana-96.png", lang: "id", data: {url: jalur(d.url)}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = jalur(e.notification.data && e.notification.data.url);
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(d => { const ada = d.find(c => new URL(c.url).pathname.startsWith("/lapor") && "focus" in c); return ada ? ada.focus().then(c => c.navigate?.(url)) : self.clients.openWindow(url); }));
});
self.addEventListener("pushsubscriptionchange", e => e.waitUntil((async () => {
  // langganan diganti peramban: daftarkan ulang dengan kecamatan yang sama (tersimpan di IndexedDB oleh peringatan.js tidak tersedia di sini; halaman memperbarui saat dibuka)
  const c = await self.clients.matchAll({type: "window"}); c.forEach(x => x.postMessage({pw: "langganan-berubah"}));
})()));
