/* Service worker Pantau Bencana /lapor (satu-satunya untuk lingkup ini; paket pwa-peringatan PW-04 dan lapor-luring LR-03, LR-04).
   1. Peringatan dini: menerima push {judul, isi, tag, url} dari src/pw_peringatan.js dan membuka /lapor/ saat diketuk.
   2. Lapor tanpa sinyal: menyimpan cangkang halaman /lapor/ beserta asetnya supaya aplikasi tetap terbuka tanpa sinyal (DESAIN-TEKNIS 2.1).
      Halaman: jaringan dulu (batas 4 detik), salinan simpanan bila gagal. Aset ber-?v=: simpanan dulu. Aset tanpa ?v=: simpanan sambil diperbarui.
      /api/ tidak pernah disimpan, kecuali GET /api/lapor/penting (nomor penting, tanpa data pribadi): jaringan dulu, simpanan bila gagal.
      Foto hiasan /img/*.jpg tidak disimpan (LR-04: 1,67 MB dari 2,43 MB cangkang); tanpa sinyal latarnya tampil warna dasar.
   Naikkan VERSI tiap berkas ini berubah. */
const VERSI = "pb-lapor-3", SIMPAN = `${VERSI}-cangkang`;
const DASAR = ["/lapor/", "/lapor/manifest.webmanifest", "/lapor/ikon/192.png", "/lapor/lambang-bnpb.png", "/lapor/edukasi.json", "/bencana.json", "/bagi.css"];
/* aset yang dimuat index.html dibaca dari halamannya sendiri, jadi daftar ini tidak perlu disunting tiap versi aset naik */
const asetHalaman = html => [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map(m => m[1]).filter(u => !u.startsWith("/api/") && /\.(css|js|png|svg|json|webmanifest)(\?|$)/.test(u));
const imporCss = css => [...css.matchAll(/@import\s+url\(\s*["']?(\/[^"')]+)["']?\s*\)/g)].map(m => m[1]);   // mis. /bnpb/bnpb.css -> /admin/admin.css?v=7
const AWALAN = ["/lapor/", "/inti/", "/img/", "/bnpb/", "/admin/admin.css", "/halaman_awal.js", "/bagi.js", "/bagi.css", "/bencana.json"];
const statis = u => /\.(css|js|png|svg|webp|json|webmanifest|woff2?)$/.test(u.pathname) && AWALAN.some(a => u.pathname.startsWith(a));
self.addEventListener("install", e => e.waitUntil((async () => {
  const c = await caches.open(SIMPAN);
  const r = await fetch("/lapor/", {cache: "no-store"}).catch(() => null);
  const daftar = new Set(DASAR); if (r?.ok) { const t = await r.clone().text(); asetHalaman(t).forEach(u => daftar.add(u)); await c.put("/lapor/", r); }
  const pasang = async u => { try { const x = await fetch(u); if (!x.ok) return; if (/\.css(\?|$)/.test(u)) for (const i of imporCss(await x.clone().text())) daftar.has(i) || (daftar.add(i), await pasang(i)); await c.put(u, x); } catch {} };   // satu aset gagal tidak menggagalkan pemasangan
  await Promise.all([...daftar].filter(u => u !== "/lapor/").map(pasang));
  await self.skipWaiting();
})()));
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("pb-lapor-") && k !== SIMPAN) await caches.delete(k);
  await self.clients.claim();
})()));
const simpanSalin = (req, r) => { if (r.ok) { const s = r.clone(); caches.open(SIMPAN).then(c => c.put(req, s)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== self.location.origin) return;
  if (u.pathname === "/api/lapor/penting") { e.respondWith(fetch(req).then(r => simpanSalin(req, r)).catch(async () => (await caches.match(req)) || Response.error())); return; }
  if (u.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate" && u.pathname.startsWith("/lapor")) {
    const jaring = fetch(req).then(r => { if (u.pathname === "/lapor/") simpanSalin("/lapor/", r); return r; });
    e.respondWith(Promise.race([jaring, new Promise((_, gagal) => setTimeout(gagal, 4000))])
      .catch(async () => (await caches.match("/lapor/")) || jaring));   // lewat 4 detik tanpa salinan: tetap tunggu jaringan
    return;
  }
  if (!statis(u) || /^\/img\/.*\.jpe?g$/.test(u.pathname)) return;
  if (u.searchParams.has("v")) { e.respondWith(caches.match(req).then(ada => ada || fetch(req).then(r => simpanSalin(req, r)))); return; }
  // tanpa ?v=: simpanan langsung dipakai, salinan baru diambil di latar (stale-while-revalidate)
  e.respondWith(caches.match(req).then(ada => { const baru = fetch(req).then(r => simpanSalin(req, r)); if (ada) { e.waitUntil(baru.catch(() => {})); return ada; } return baru; }));
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
