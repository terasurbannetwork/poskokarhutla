"use strict";
pasangTip(); /* tooltip [data-tip] bersama (inti/tip.js) */
PilihCantik.pasang();

(async () => {
  try { await muatData(); } catch (e) { $("#muat").innerHTML = `<div><b>Data belum tersedia.</b><br>${esc(e.message)}</div>`; return; }
  renderLevelSeg(); renderDaftar(); await Peta.init(); renderLegenda(); Peta.segarkan();
  $("#muat").classList.add("hilang");
  Kejadian.muat();   /* kecil (±8 KB); kode V dipakai laci dan tombol bagikan */
  /* /gunungapi/<tab> bersih; tab tak dikenal jatuh ke Peta */
  const j = location.pathname.replace(/^\/gunungapi\/?/, "").replace(/\/+$/, "").replace(/^index\.html$/, "");
  const kj = j.match(/^k\/(V\d+)$/);
  if (kj) Kejadian.buka(kj[1], false); else if (TABS.some(t => t[0] === j)) bukaTab(j, false); else if (j) history.replaceState(null, "", "/gunungapi/peta");
})();
/* panel kiri dan kanan bisa ditarik; lebar diingat per perangkat */
(() => { const atur = (el, kunci, sisi, min, max) => { if (!el) return; const w0 = bacaLokal(kunci, null); if (w0 && innerWidth > 900) el.style.width = w0 + "px";
  const h = document.createElement("div"); h.className = "tarik"; h.title = "Tarik untuk mengubah lebar"; h.setAttribute("role", "separator"); h.setAttribute("aria-orientation", "vertical"); el.appendChild(h);
  h.addEventListener("pointerdown", e => { e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add("aktif"); const x0 = e.clientX, w = el.getBoundingClientRect().width;
    const gerak = ev => { el.style.width = Math.max(min, Math.min(max, w + (sisi === "kanan" ? ev.clientX - x0 : x0 - ev.clientX))) + "px"; };
    const lepas = () => { h.classList.remove("aktif"); h.removeEventListener("pointermove", gerak); h.removeEventListener("pointerup", lepas); simpanLokal(kunci, Math.round(el.getBoundingClientRect().width)); peta?.resize(); };
    h.addEventListener("pointermove", gerak); h.addEventListener("pointerup", lepas); });
  h.addEventListener("dblclick", () => { el.style.width = ""; simpanLokal(kunci, null); }); };
  atur(document.querySelector(".panel"), "lebar-panel", "kanan", 320, Math.min(900, innerWidth * .6));
  atur(document.querySelector(".tools"), "lebar-tools", "kiri", 220, 520); })();
document.addEventListener("click", e => { const d = document.querySelector(".bencana"); if (d && d.open && !e.target.closest(".bencana")) d.open = false; });
/* tombol lipat Overlay: tutup/buka semua grup sekaligus (sama dengan karhutla) */
$("#lapisLipat").addEventListener("click", e => { e.stopPropagation(); const ds = [...document.querySelectorAll("#lapis details")], buka = ds.every(d => !d.open);
  ds.forEach(d => d.open = buka); const b = e.currentTarget; b.classList.toggle("tutup", !buka); b.title = b.ariaLabel = buka ? "Tutup semua grup" : "Buka semua grup"; });
