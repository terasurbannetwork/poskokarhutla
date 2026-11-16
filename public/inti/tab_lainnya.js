/* inti/tab_lainnya.js: menu "Lainnya" otomatis untuk deretan tab kepala (nav.tabs) semua laman bencana (pemilik, 16 Nov 2026:
   tab "suka kepotong"). Tab yang muat tetap di deretan; sisanya dipindah satu per satu dari ujung kanan ke <details class="lainnya">
   di dalam nav yang sama, jadi penangan klik halaman (delegasi di #tabs, closest("button")) tetap jalan. Gaya .lainnya sudah ada di
   inti/gaya.css. Di layar yang memakai burger (nav menjadi menu tarik), semua tab dikembalikan ke susunan semula.
   Halaman yang sudah membuat .lainnya sendiri (karhutla bila tab > 12) tidak disentuh. Urutan asli disimpan di data-urut-tab. */
export function pasangLainnya(nav) {
  if (!nav || nav.dataset.lainnyaOto || nav.querySelector(":scope > .lainnya:not([data-oto])")) return;
  nav.dataset.lainnyaOto = "1";
  let det = null, sibuk = false, jadwal = 0;
  const burgerAktif = () => { const b = document.getElementById("burger"); return !!b && getComputedStyle(b).display !== "none"; };
  const semuaTombol = () => [...nav.querySelectorAll(":scope > button, :scope > .lainnya[data-oto] .menu > button")];
  const tandai = () => semuaTombol().forEach((b, i) => { if (b.dataset.urutTab == null) b.dataset.urutTab = String(i); });
  const pulihkan = () => {   /* semua tab kembali ke deretan, urutan asli */
    const T = semuaTombol().sort((a, b) => +a.dataset.urutTab - +b.dataset.urutTab);
    T.forEach(b => nav.insertBefore(b, det && det.parentNode === nav ? det : null)); det?.remove(); det = null; };
  const luap = () => nav.scrollWidth > nav.clientWidth + 1;
  const susun = () => {
    if (sibuk) return; sibuk = true; amat.disconnect();
    try {
      tandai(); pulihkan();
      if (!burgerAktif() && luap()) {
        det = document.createElement("details"); det.className = "lainnya"; det.dataset.oto = "1";
        det.innerHTML = `<summary>Lainnya</summary><div class="menu" role="menu"></div>`; nav.appendChild(det);
        const menu = det.querySelector(".menu");
        const tampak = () => [...nav.querySelectorAll(":scope > button")].filter(b => !b.hidden);
        /* pindahkan tab paling kanan sampai muat; paling sedikit satu tab tetap di deretan */
        while (luap() && tampak().length > 1) { const T = tampak(); menu.prepend(T[T.length - 1]); }
        if (!menu.querySelector("button:not([hidden])")) { det.remove(); det = null; }
      }
    } finally { amat.observe(nav, {childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"]}); sibuk = false; }
  };
  /* setTimeout, bukan requestAnimationFrame: rAF tidak jalan di tab latar, sehingga tab bisa tetap terpotong saat tab dibuka kembali */
  const minta = () => { clearTimeout(jadwal); jadwal = setTimeout(susun, 60); };
  /* tab baru, tab yang muncul/hilang (mis. Operasi hanya untuk staf), atau halaman menggambar ulang tab */
  const amat = new MutationObserver(m => { if (!sibuk && m.some(x => x.type === "childList" || x.target.tagName === "BUTTON")) minta(); });
  /* ruang kepala bisa bertambah sesudah muat (huruf, jam data, menu bencana): amati nav dan induknya, hitung ulang sesudah huruf siap */
  if (window.ResizeObserver) { const ro = new ResizeObserver(minta); ro.observe(nav.parentElement || nav); ro.observe(nav); } else addEventListener("resize", minta);
  document.fonts?.ready.then(minta).catch(() => {}); addEventListener("load", minta);
  addEventListener("resize", minta); document.addEventListener("visibilitychange", () => { if (!document.hidden) minta(); });   /* cadangan bila ResizeObserver tidak jalan (tab latar) */
  /* menu: posisi di bawah ringkasannya, rata kanan; tutup saat tab dipilih, klik di luar, atau Escape */
  nav.addEventListener("toggle", e => { const d = e.target; if (d !== det || !d.open) return;
    const r = d.querySelector("summary").getBoundingClientRect(), m = d.querySelector(".menu");
    m.style.top = Math.round(r.bottom + 6) + "px"; m.style.right = Math.max(8, Math.round(innerWidth - r.right)) + "px"; m.style.left = "auto"; }, true);
  nav.addEventListener("click", e => { if (det?.open && e.target.closest(".lainnya[data-oto] .menu button")) det.open = false; });
  document.addEventListener("click", e => { if (det?.open && !det.contains(e.target)) det.open = false; });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && det?.open) { det.open = false; det.querySelector("summary").focus(); } });
  susun();
}
