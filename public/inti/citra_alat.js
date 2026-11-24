/* inti/citra_alat.js: alat bersama banding citra dan timelapse, dipakai public/banding.js + public/timelapse.js (karhutla)
   dan inti/banding.js + inti/timelapse.js (bencana lain). Dulu disalin di kedua pasang berkas (gerbang-inti, 23 Nov 2026).
   Dimuat SEBELUM berkas banding dan timelapse. */
(() => {
  /* pembatas geser peta dibelah dua: satu tulis CSS per frame (INP), papan ketik ← → Home End */
  function pembatas(root, gar) {
    let p = 50, rafP = 0, r = null;
    const atur = v => { p = Math.max(0, Math.min(100, v)); if (rafP) return;
      rafP = requestAnimationFrame(() => { rafP = 0; root.style.setProperty("--p", p + "%"); gar.setAttribute("aria-valuenow", Math.round(p)); }); };
    gar.onpointerdown = e => { r = root.getBoundingClientRect(); gar.setPointerCapture(e.pointerId); root.classList.add("geser"); e.preventDefault(); };
    gar.onpointermove = e => { if (r) atur((e.clientX - r.left) / r.width * 100); };
    gar.onpointerup = gar.onpointercancel = () => { r = null; root.classList.remove("geser"); };
    gar.onkeydown = e => { const d = {ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100}[e.key]; if (d != null) { atur(p + d); e.preventDefault(); } };
    return {atur};
  }
  /* pustaka gif.js dimuat malas sekali; gagal = boleh dicoba lagi */
  let pustaka = null;
  const siapkanGif = () => pustaka ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = "/vendor/gif/gif.js";
    s.onload = ok; s.onerror = () => { pustaka = null; s.remove(); gagal(new Error("gif.js")); }; document.head.appendChild(s); });
  window.CitraAlat = {pembatas, siapkanGif};
})();
