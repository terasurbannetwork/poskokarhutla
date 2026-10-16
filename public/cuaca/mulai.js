"use strict";
pasangTip(); /* tooltip [data-tip] bersama (inti/tip.js) */
PilihCantik.pasang();

/* ================================================================ mulai */
(async () => {
  try { await muatData(); } catch (e) { $("#muat").innerHTML = `<div><b>Data belum tersedia.</b><br>${esc(e.message)}</div>`; return; }
  renderHari(); await Peta.init();
  $("#muat").classList.add("hilang");
  /* /cuaca/<tab> bersih; tab yang tak ada jatuh ke Peta */
  const j = location.pathname.replace(/^\/cuaca\/?/, "").replace(/\/+$/, "").replace(/^index\.html$/, "");
  if (TABS.some(t => t[0] === j) && halamanAda(j)) bukaTab(j, false);
  else if (j) history.replaceState(null, "", "/cuaca/peta" + location.search);
})();
document.addEventListener("click", e => { const d = document.querySelector(".bencana"); if (d && d.open && !e.target.closest(".bencana")) d.open = false; });
