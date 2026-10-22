/* Notifikasi push /instansi (src/push.js). Terpisah dari instansi.js: hidup hanya saat akun aktif tampil (#vUtama tidak tersembunyi).
   Tanpa kunci VAPID di server (status.tersedia false) atau peramban tanpa Push, kotaknya tetap tersembunyi. CSP: tanpa skrip/gaya inline. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const TERPASANG = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  let reg = null, sub = null, mulai = false;
  const api = async (metode, url, body) => {
    try { const r = await fetch(url, {method: metode, headers: {...(metode === "POST" ? {"x-pb": "1", "content-type": "application/json"} : {})}, body: body === undefined ? undefined : JSON.stringify(body)});
      return {ok: r.ok, j: await r.json().catch(() => ({}))}; } catch (e) { return {ok: false, j: {galat: "Tidak ada sinyal. Coba lagi."}}; }
  };
  const kunciApp = s => { const t = s.replace(/-/g, "+").replace(/_/g, "/"), b = atob(t + "=".repeat((4 - t.length % 4) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  const info = t => { $("pushInfo").textContent = t; };
  function gambar() {
    const aktif = !!sub;
    $("pushNyala").hidden = aktif; $("pushUji").hidden = !aktif; $("pushMati").hidden = !aktif;
    info(aktif ? "Notifikasi aktif di perangkat ini. Kamu dikabari tiap 3 jam bila ada api baru atau tugas yang belum dicek di wilayahmu." : "Dapatkan kabar tiap 3 jam bila ada api baru atau tugas yang belum dicek di wilayahmu.");
  }
  async function siap() {
    if (mulai) return; mulai = true;
    if (IOS && !TERPASANG) { $("push").hidden = false; $("pushNyala").hidden = true; return info("Untuk notifikasi di iPhone atau iPad, pasang ke Layar Utama dulu: ketuk tombol Bagikan di Safari, pilih Tambah ke Layar Utama, lalu buka /instansi dari ikon itu."); }
    if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return;
    const st = await api("GET", "/api/instansi/push/status"); if (!st.ok || !st.j.tersedia) return;
    try { reg = await navigator.serviceWorker.register("/sw-instansi.js", {scope: "/instansi"}); await navigator.serviceWorker.ready; sub = await reg.pushManager.getSubscription(); } catch (e) { return; }
    $("push").hidden = false; $("push").dataset.publik = st.j.publik; gambar();
  }
  $("pushNyala").addEventListener("click", async () => {
    const t = $("pushNyala"); t.disabled = true;
    try {
      if (await Notification.requestPermission() !== "granted") return info("Izin notifikasi ditolak. Buka pengaturan peramban untuk situs ini lalu izinkan notifikasi.");
      const s = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: kunciApp($("push").dataset.publik)});
      const r = await api("POST", "/api/instansi/push/langganan", s.toJSON());
      if (!r.ok) { await s.unsubscribe(); return info(r.j.galat || "Notifikasi belum bisa dinyalakan."); }
      sub = s; gambar();
    } catch (e) { info("Notifikasi belum bisa dinyalakan di perangkat ini."); } finally { t.disabled = false; }
  });
  $("pushUji").addEventListener("click", async () => {
    const t = $("pushUji"); t.disabled = true; info("Mengirim notifikasi uji…");
    const r = await api("POST", "/api/instansi/push/uji", {});
    info(r.ok ? (r.j.terkirim ? "Notifikasi uji dikirim. Cek perangkatmu." : "Layanan notifikasi belum menerima kiriman. Coba lagi sebentar lagi.") : (r.j.galat || "Notifikasi uji gagal.")); t.disabled = false;
  });
  $("pushMati").addEventListener("click", async () => {
    const t = $("pushMati"); t.disabled = true;
    const r = await api("POST", "/api/instansi/push/berhenti", {endpoint: sub.endpoint});
    if (!r.ok) { info(r.j.galat || "Belum bisa dimatikan."); t.disabled = false; return; }
    await sub.unsubscribe(); sub = null; t.disabled = false; gambar();
  });
  /* keluar: cabut langganan perangkat ini DULU (server dan peramban), baru biarkan klik keluar jalan. Capture + klik ulang karena instansi.js memegang handler keluar. */
  let lepas = false;
  $("keluar").addEventListener("click", async e => {
    if (lepas || !sub) return;
    e.stopImmediatePropagation(); e.preventDefault();
    try { await api("POST", "/api/instansi/push/berhenti", {endpoint: sub.endpoint}); await sub.unsubscribe(); sub = null; } catch (x) {}
    lepas = true; $("keluar").click(); lepas = false;   // gagal jaringan tidak menahan keluar
  }, true);
  const utama = $("vUtama"), cek = () => { if (!utama.hidden) siap(); };
  new MutationObserver(cek).observe(utama, {attributes: true, attributeFilter: ["hidden"]}); cek();
})();
