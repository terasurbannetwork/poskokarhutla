"use strict";
/* ================================================================ mulai */
pasangTip();            /* tooltip [data-tip] bersama (inti/tip.js) */
PilihCantik.pasang();   /* <select> jadi pil, seperti karhutla */
(async () => {
  try { await muatData(); } catch (e) { $("#muat").innerHTML = `<div><b>Data belum tersedia.</b><br>${esc(e.message)}</div>`; return; }
  if (!metarSegar().length) document.querySelector('#lapis [data-l="metar"]')?.closest("label").remove();   /* tanpa laporan segar, ubinnya dibuang (A18) */
  renderHari(); renderDaftar(); await Peta.init(); renderLegenda();
  $("#muat").classList.add("hilang");
  const t = location.pathname.replace(/\/$/, "").split("/").pop();
  bukaTab(TABS.some(x => x[0] === t) ? t : "peta", false);
})();
