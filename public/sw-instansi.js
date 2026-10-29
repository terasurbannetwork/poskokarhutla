/* Service worker /instansi: hanya menerima push dan menampilkannya. Payload JSON {judul, isi, tag, url} dari src/push.js.
   Tanpa cache, tanpa fetch: halaman dan API tetap langsung ke jaringan. Scope /instansi (di dalam folder skrip, jadi tanpa header Service-Worker-Allowed). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
/* hanya /instansi atau di bawahnya di situs sendiri; selain itu /instansi */
const jalur = u => { try { const x = new URL(u, self.location.origin); return x.origin === self.location.origin && (x.pathname === "/instansi" || x.pathname.startsWith("/instansi/")) ? x.pathname + x.search : "/instansi"; } catch (e) { return "/instansi"; } };
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = {isi: e.data && e.data.text()}; }
  e.waitUntil(self.registration.showNotification(String(d.judul || "Centurisk97").slice(0, 120), {body: String(d.isi || "").slice(0, 240), tag: String(d.tag || "pb").slice(0, 64),
    renotify: true, icon: "/img/logo.svg", data: {url: jalur(d.url)}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = jalur(e.notification.data && e.notification.data.url);
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(daftar => {
    const ada = daftar.find(c => new URL(c.url).pathname === url.split("?")[0] && "focus" in c);
    return ada ? ada.focus() : self.clients.openWindow(url);
  }));
});
