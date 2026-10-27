"use strict";
/* Pegangan geser lebar laci kanan #laci /banjir, pola Laci karhutla (index.html, atur()): tepi kiri, lebar diingat per perangkat (localStorage, try/catch),
   dijepit 340 px sampai 60% layar, dobel klik = bawaan, panah kiri/kanan menggeser 24 px. peta.js (Analisa.buka) memasang ulang el._tarik tiap isi laci diganti. */
(() => {
  const el = document.querySelector("#laci"); if (!el) return;
  const KUNCI = "lebar-laci", maks = () => Math.max(340, innerWidth * .6), jepit = w => Math.max(340, Math.min(maks(), w));
  const simpan = v => { try { localStorage.setItem(KUNCI, JSON.stringify(v)); } catch (e) {} };
  const selesai = () => { simpan(Math.round(el.getBoundingClientRect().width)); if (typeof peta !== "undefined" && peta) peta.resize(); };
  let w0 = null; try { w0 = JSON.parse(localStorage.getItem(KUNCI)); } catch (e) {}
  if (w0 && innerWidth > 900) el.style.width = jepit(w0) + "px";
  const h = document.createElement("div"); h.className = "tarik"; h.title = "Tarik untuk mengubah lebar"; h.tabIndex = 0;
  h.setAttribute("role", "separator"); h.setAttribute("aria-orientation", "vertical"); h.setAttribute("aria-label", "Ubah lebar rincian, panah kiri dan kanan");
  el.appendChild(h); el._tarik = h;
  h.addEventListener("pointerdown", e => { e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add("aktif"); const x0 = e.clientX, w = el.getBoundingClientRect().width;
    const gerak = ev => { el.style.width = jepit(w + x0 - ev.clientX) + "px"; };
    const lepas = () => { h.classList.remove("aktif"); h.removeEventListener("pointermove", gerak); h.removeEventListener("pointerup", lepas); selesai(); };
    h.addEventListener("pointermove", gerak); h.addEventListener("pointerup", lepas); });
  h.addEventListener("keydown", e => { const d = e.key === "ArrowLeft" ? 24 : e.key === "ArrowRight" ? -24 : 0; if (!d) return; e.preventDefault(); el.style.width = jepit(el.getBoundingClientRect().width + d) + "px"; selesai(); });
  h.addEventListener("dblclick", () => { el.style.width = ""; simpan(null); if (typeof peta !== "undefined" && peta) peta.resize(); });
})();
