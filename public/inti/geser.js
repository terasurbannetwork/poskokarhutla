"use strict";
/* Penggeser sebelum/sesudah bersama (GS-10; pindahan geserCitra dan .bk-geser dari banjir/bukti.js).
   Skrip klasik: window.Geser.html({sebelum:{src,tgl}, sesudah:{src,tgl}}) menghasilkan markup, Geser.pasang(el) menghidupkannya.
   Kendali = <input type="range"> asli (papan ketik, sentuh, pembaca layar); tanpa pointer handler sendiri. */
(() => {
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const html = ({sebelum, sesudah, label = "Geser sebelum dan sesudah"}) => `<div class="geser">
      <img class="geser-b" src="${e(sesudah.src)}" alt="Sesudah" decoding="async">
      <img class="geser-a" src="${e(sebelum.src)}" alt="Sebelum" decoding="async">
      <i class="geser-garis"></i><span class="geser-lb geser-lb-a">Sebelum ${e(sebelum.tgl)}</span><span class="geser-lb geser-lb-b">Sesudah ${e(sesudah.tgl)}</span>
      <p class="geser-gagal" hidden>Citra tidak dapat dimuat.</p>
      <input type="range" min="0" max="100" value="50" aria-label="${e(label)}"></div>`;
  const pasang = w => {
    const s = w.querySelector("input"), a = w.querySelector(".geser-a"), g = w.querySelector(".geser-garis");
    const sync = () => {
      a.style.clipPath = `inset(0 ${100 - s.value}% 0 0)`; g.style.left = s.value + "%";
      s.setAttribute("aria-valuetext", `Sebelum ${s.value} persen, sesudah ${100 - s.value} persen`);
    };
    const gagal = () => { w.classList.add("gagal"); w.querySelector(".geser-gagal").hidden = false; };
    w.querySelectorAll("img").forEach(i => { i.addEventListener("error", gagal); if (i.complete && i.naturalWidth === 0 && i.getAttribute("src")) gagal(); });
    s.addEventListener("input", sync); sync();
  };
  window.Geser = {html, pasang};
})();
