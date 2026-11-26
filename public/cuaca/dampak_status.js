"use strict";
/* DP-20: lapisan "Status prakiraan dan peringatan" untuk bahaya cuaca ekstrem (cex), modul bersama inti/dampak_peringatan.js.
   Mati bawaan; saklar di kontrol Overlay. Klik kontrol ringan, kerja berat (muat data, gambar) di rAF. Berpil hipotesis di kartu (modul bersama). */
const DampakStatus = (() => {
  let lap = null, wadah = null;
  const sudahPeta = () => typeof peta !== "undefined" && peta && peta.getStyle?.();
  function kontrol() {
    $("#lapis").insertAdjacentHTML("beforeend", `<details open><summary>Status prakiraan</summary><label><input type="checkbox" data-dp="cex"> Status cuaca ekstrem per kab/kota <span class="pl" style="--w:var(--ink3)">Hipotesis</span></label></details>`);
    $("#lapis").addEventListener("change", e => { const i = e.target.closest("input[data-dp]"); if (!i) return;
      requestAnimationFrame(() => setTimeout(() => nyala(i.checked, i), 0)); });
  }
  async function nyala(on, i) {
    if (!window.DampakPeringatan || !sudahPeta()) { if (i) i.checked = false; return; }
    if (!lap) {
      wadah = document.createElement("div"); wadah.className = "dp-kartu-wadah"; wadah.hidden = true;
      wadah.style.cssText = "position:absolute;right:12px;top:12px;max-width:320px;z-index:5";
      $("#peta").parentElement.append(wadah);
      lap = DampakPeringatan.pasang(peta, {bahaya: "cex", nama: null, kartu: wadah});
    }
    if (on) { const ok = await lap.nyalakan(); if (!ok && i) i.checked = false; } else lap.matikan();
  }
  return {kontrol};
})();
