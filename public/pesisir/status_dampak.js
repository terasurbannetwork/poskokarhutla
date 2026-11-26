"use strict";
/* DP-18/K11: status prakiraan gelombang (gel) di peta /pesisir lewat modul bersama inti/dampak_peringatan.js.
   Satu kotak di Overlay, mati bawaan; berpil hipotesis (modul menaruhnya di kartu). Chrome (centang) langsung, muat berat di rAF. */
(() => {
  const ALAT = {}, KODE = {dp_gel: "gel"};
  const kartu = Object.assign(document.createElement("div"), {hidden: true});
  kartu.style.cssText = "position:absolute;left:12px;bottom:12px;z-index:5;max-width:min(380px,calc(100% - 24px));max-height:60%;overflow:auto";
  document.getElementById("p-peta").append(kartu);
  const modul = () => modul.j ||= new Promise(ok => { if (window.DampakPeringatan) return ok();
    document.head.append(Object.assign(document.createElement("link"), {rel: "stylesheet", href: "../inti/dampak_peringatan.css?v=1"}));
    document.head.append(Object.assign(document.createElement("script"), {src: "../inti/dampak_peringatan.js?v=2", onload: ok, onerror: ok})); });
  document.getElementById("lapis").addEventListener("change", e => {
    const i = e.target.closest("input"), kode = KODE[i?.dataset.l]; if (!kode) return;
    for (const [k, a] of Object.entries(ALAT)) if (k !== kode && i.checked) { a.matikan(); document.querySelector(`[data-l=dp_${k}]`).checked = false; }
    requestAnimationFrame(async () => {
      await modul(); if (!window.DampakPeringatan || typeof peta === "undefined" || !peta) return;
      if (!i.checked) return ALAT[kode]?.matikan();
      kartu.hidden = true; kartu.replaceChildren();
      ALAT[kode] ||= DampakPeringatan.pasang(peta, {bahaya: kode, kartu});
      if (!await ALAT[kode].nyalakan()) { i.checked = false; i.parentElement.title = "Status prakiraan belum terukur"; }
    });
  });
})();
