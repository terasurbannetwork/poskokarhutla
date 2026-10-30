"use strict";
/* Panel Overlay (#lapis) bisa digeser lewat kepalanya (.lapis-hd), dipakai semua halaman peta (public/inti).
   Hanya layar lebar (> 900 px, saat panel selalu tampil); di ponsel panel tetap di tempatnya.
   Panel tinggal di .tools yang overflow-y:auto, jadi transform di dalamnya terpotong. Sebab itu begitu pointer bergerak
   lebih dari 4 px panel dijadikan position:fixed di posisi layarnya, lalu per frame hanya left/top yang ditulis.
   Posisi disimpan per halaman di localStorage (kenyamanan saja, boleh hilang). Klik ganda kepala panel mengembalikan. */
(() => {
  const KUNCI = "geserLapis:" + location.pathname, LEBAR = matchMedia("(min-width: 901px)"), AMBANG = 4;
  const simpan = v => { try { v ? localStorage.setItem(KUNCI, JSON.stringify(v)) : localStorage.removeItem(KUNCI); } catch {} };
  const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || "null"); } catch { return null; } };

  function pasang() {
    const p = document.getElementById("lapis"), hd = p?.querySelector(".lapis-hd");
    if (!hd || p.dataset.geser) return;
    p.dataset.geser = "1";
    let ukur = null;   /* {w, h} diukur sekali saat panel dicabut dari alur */

    const batas = (x, y) => [Math.max(0, Math.min(x, innerWidth - ukur.w)), Math.max(0, Math.min(y, innerHeight - 48))];
    const lepas = () => { ukur = null; for (const k of ["position", "left", "top", "right", "width", "zIndex", "maxHeight", "overflowY"]) p.style[k] = ""; };
    const cabut = () => {   /* sekali: ukur, lalu tulis gaya tetap */
      if (ukur) return true;
      if (!p.offsetWidth) return false;
      ukur = {w: p.offsetWidth};
      Object.assign(p.style, {position: "fixed", right: "auto", width: ukur.w + "px", zIndex: 30, overflowY: "auto"});
      return true;
    };
    const taruh = (x, y) => {
      [x, y] = batas(x, y);
      p.style.left = x + "px"; p.style.top = y + "px"; p.style.maxHeight = `calc(100dvh - ${y + 8}px)`;
      return [x, y];
    };
    const atur = () => {
      hd.style.cursor = LEBAR.matches ? "grab" : ""; hd.style.touchAction = LEBAR.matches ? "none" : "";
      hd.title = LEBAR.matches ? "Geser panel; klik ganda untuk kembali" : "";
      if (!LEBAR.matches) return lepas();
      const v = baca(); if (v && cabut()) taruh(v.x, v.y);
    };
    requestAnimationFrame(atur);
    LEBAR.addEventListener("change", atur);

    let g = null, rencana = 0;
    hd.addEventListener("pointerdown", e => {
      if (!LEBAR.matches || e.button !== 0 || g || e.target.closest("button")) return;
      const r = p.getBoundingClientRect();
      g = {id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, x: r.left, y: r.top, jalan: false};
      hd.setPointerCapture(e.pointerId);
    });
    hd.addEventListener("pointermove", e => {
      if (!g || e.pointerId !== g.id) return;
      if (!g.jalan) {
        if (Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) <= AMBANG) return;
        if (!cabut()) return;
        g.jalan = true; hd.style.cursor = "grabbing";
      }
      g.x = e.clientX - g.dx; g.y = e.clientY - g.dy;
      if (!rencana) rencana = requestAnimationFrame(() => { rencana = 0; if (g?.jalan) taruh(g.x, g.y); });
    });
    const selesai = e => {
      if (!g || e.pointerId !== g.id) return;
      if (g.jalan) { const [x, y] = taruh(g.x, g.y); simpan({x, y}); hd.style.cursor = "grab"; }
      g = null;
    };
    for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) hd.addEventListener(n, selesai);
    hd.addEventListener("dblclick", e => { if (!e.target.closest("button")) { lepas(); simpan(null); } });
    addEventListener("resize", () => { if (ukur) taruh(parseFloat(p.style.left) || 0, parseFloat(p.style.top) || 0); });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", pasang) : pasang();
})();
