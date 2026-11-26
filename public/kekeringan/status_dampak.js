"use strict";
/* DP: status prakiraan kekeringan (kek) di peta /kekeringan lewat inti/dampak_peringatan.js. Kotak mati bawaan, berpil hipotesis.
   Chrome (centang) langsung, muat berat di rAF. */
(() => {
  const kartu = Object.assign(document.createElement("div"), {hidden: true});
  kartu.style.cssText = "position:absolute;left:12px;bottom:12px;z-index:5;max-width:min(380px,calc(100% - 24px));max-height:60%;overflow:auto";
  document.getElementById("p-peta").append(kartu);
  let alat;
  const modul = () => modul.j ||= new Promise(ok => { if (window.DampakPeringatan) return ok();
    document.head.append(Object.assign(document.createElement("link"), {rel: "stylesheet", href: "../inti/dampak_peringatan.css?v=1"}));
    document.head.append(Object.assign(document.createElement("script"), {src: "../inti/dampak_peringatan.js?v=2", onload: ok, onerror: ok})); });
  document.getElementById("lapis").addEventListener("change", e => {
    const i = e.target.closest("input"); if (i?.dataset.l !== "dp_kek") return;
    requestAnimationFrame(async () => {
      await modul(); if (!window.DampakPeringatan || typeof peta === "undefined" || !peta) return;
      if (!i.checked) return alat?.matikan();
      kartu.hidden = true; kartu.replaceChildren();
      alat ||= DampakPeringatan.pasang(peta, {bahaya: "kek", kartu});
      if (!await alat.nyalakan()) { i.checked = false; i.parentElement.title = "Status prakiraan belum terukur"; }
    });
  });
})();
