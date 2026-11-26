"use strict";
/* Tarik lebar panel di atas peta (aturan pemilik 3 Nov 2026, diulang 26 Nov 2026: "selalu catet kalo gini kan dia bisa digeser ke kanan kiri").
   Satu mekanisme bersama, pola .tarik peta utama (public/index.html): pegangan tegak di tepi kanan panel, tarik dengan pointer,
   panah kiri/kanan dari papan ketik, klik ganda mengembalikan lebar bawaan. Lebar diingat per peramban di localStorage (boleh hilang).
   Pegangan ditaruh di induk panel, bukan di dalamnya, supaya tidak ikut tergulung panel yang overflow:auto.
   Lebar terpasang juga diisi ke --tarik-lebar di induk panel, supaya kontrol lain di sebelahnya bisa ikut bergeser.
   Pakai: <aside data-tarik-lebar-kunci="nama"> + <script src="/inti/tarik_lebar.js">, atau TarikLebar.pasang(el, {kunci}). Hanya layar lebar. */
(() => {
  const GAYA = `.tarik-lebar{position:absolute;width:10px;cursor:col-resize;z-index:5;touch-action:none;outline-offset:-2px}
.tarik-lebar::after{content:"";position:absolute;top:50%;left:3px;width:4px;height:44px;margin-top:-22px;border-radius:4px;background:var(--line);transition:background .15s}
.tarik-lebar:hover::after,.tarik-lebar:focus-visible::after,.tarik-lebar.aktif::after{background:var(--brand2)}
.tarik-lebar[hidden]{display:none}`;
  const pasang = (panel, {kunci, min = 320, maks = .6, media = "(min-width: 901px)"} = {}) => {
    if (!panel || panel.dataset.tarikLebarAda) return;
    panel.dataset.tarikLebarAda = "1";
    if (!document.getElementById("tarik-lebar-gaya")) { const s = document.createElement("style"); s.id = "tarik-lebar-gaya"; s.textContent = GAYA; document.head.append(s); }
    const induk = panel.parentElement, h = document.createElement("div"), mq = matchMedia(media);
    h.className = "tarik-lebar"; h.tabIndex = 0; h.title = "Tarik untuk mengubah lebar panel";
    h.setAttribute("role", "separator"); h.setAttribute("aria-orientation", "vertical"); h.setAttribute("aria-label", "Ubah lebar panel");
    if (getComputedStyle(induk).position === "static") induk.style.position = "relative";
    induk.append(h);
    const letak = () => {
      const tampil = mq.matches && panel.offsetParent !== null && panel.offsetWidth > 0;
      h.hidden = !tampil; if (!tampil) return;
      h.style.left = panel.offsetLeft + panel.offsetWidth - 5 + "px"; h.style.top = panel.offsetTop + "px"; h.style.height = panel.offsetHeight + "px";
    };
    const set = w => { w = Math.round(Math.max(min, Math.min(w, induk.clientWidth * maks))); panel.style.width = w + "px"; induk.style.setProperty("--tarik-lebar", w + "px"); h.setAttribute("aria-valuenow", String(w)); letak(); return w; };
    const simpan = w => { try { localStorage.setItem("tarikLebar:" + kunci, String(w)); } catch {} };
    try { const w = +localStorage.getItem("tarikLebar:" + kunci); if (w && mq.matches) set(w); } catch {}
    let x0 = 0, w0 = 0, w = 0;
    const gerak = e => { w = set(w0 + e.clientX - x0); };
    const lepas = () => { h.classList.remove("aktif"); removeEventListener("pointermove", gerak); removeEventListener("pointerup", lepas); simpan(w); };
    h.addEventListener("pointerdown", e => { e.preventDefault(); x0 = e.clientX; w0 = w = panel.offsetWidth; h.classList.add("aktif"); addEventListener("pointermove", gerak); addEventListener("pointerup", lepas); });
    h.addEventListener("keydown", e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); simpan(set(panel.offsetWidth + (e.key === "ArrowRight" ? 24 : -24))); });
    h.addEventListener("dblclick", () => { panel.style.width = ""; induk.style.removeProperty("--tarik-lebar"); try { localStorage.removeItem("tarikLebar:" + kunci); } catch {} letak(); });
    new ResizeObserver(letak).observe(panel);
    mq.addEventListener("change", () => { if (!mq.matches) { panel.style.width = ""; induk.style.removeProperty("--tarik-lebar"); } letak(); });
    addEventListener("resize", letak, {passive: true});
    letak();
  };
  window.TarikLebar = {pasang};
  const cari = () => document.querySelectorAll("[data-tarik-lebar-kunci]").forEach(p => pasang(p, {kunci: p.dataset.tarikLebarKunci}));
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", cari) : cari();
})();
