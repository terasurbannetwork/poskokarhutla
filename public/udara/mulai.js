"use strict";
/* ================================================================ mulai */
pasangTip();            /* tooltip [data-tip] bersama (inti/tip.js) */
PilihCantik.pasang();   /* <select> jadi pil, seperti karhutla */
(async () => {
  try { await muatData(); } catch (e) { $("#muat").innerHTML = `<div><b>Data belum tersedia.</b><br>${esc(e.message)}</div>`; return; }
  if (!metarSegar().length) document.querySelector('#lapis [data-l="metar"]')?.closest("label").remove();   /* tanpa laporan segar, ubinnya dibuang (A18) */
  if (!S.prak) document.querySelector('#lapis [data-l="kota"]')?.closest("label").remove();   /* tanpa prakiraan 72 jam, lapisannya dibuang (A18) */
  if (!S.lin?.kompleks?.length) document.querySelector('#lapis [data-l="lintasan"]')?.closest("label").remove();
  renderHari(); renderDaftar(); renderCrumb(); await Peta.init(); Prak.kontrol(); renderLegenda();
  $("#muat").classList.add("hilang");
  const t = location.pathname.replace(/\/$/, "").split("/").pop(), kj = location.pathname.match(/^\/udara\/k\/(U\d+)\/?$/);
  if (kj) Kejadian.buka(kj[1], false);
  else { const ok = TABS.some(x => x[0] === t) && (t !== "kejadian" || Kejadian.ada()); bukaTab(ok ? t : "peta", false);
    if (!ok && t === "kejadian") history.replaceState(null, "", "/udara/peta" + location.search); }   /* tab Kejadian dibuang (tanpa kejadian segar): jangan tinggalkan URL mati */
})();

/* panel kiri & kanan bisa ditarik untuk dilebarkan; lebar diingat per perangkat (sama dengan karhutla dan banjir) */
(() => { const atur = (el, kunci, sisi, min, max) => { if (!el) return; const w0 = bacaLokal(kunci, null); if (w0 && innerWidth > 900) el.style.width = w0 + "px";
  const h = document.createElement("div"); h.className = "tarik"; h.title = "Tarik untuk mengubah lebar"; h.setAttribute("role", "separator"); h.setAttribute("aria-orientation", "vertical"); el.appendChild(h); el._tarik = h;
  h.addEventListener("pointerdown", e => { e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add("aktif"); const x0 = e.clientX, w = el.getBoundingClientRect().width;
    const gerak = ev => { const lebar = Math.max(min, Math.min(max, w + (sisi === "kanan" ? ev.clientX - x0 : x0 - ev.clientX))); el.style.width = lebar + "px"; };
    const lepas = () => { h.classList.remove("aktif"); h.removeEventListener("pointermove", gerak); h.removeEventListener("pointerup", lepas); simpanLokal(kunci, Math.round(el.getBoundingClientRect().width)); if (typeof peta !== "undefined" && peta) peta.resize(); };
    h.addEventListener("pointermove", gerak); h.addEventListener("pointerup", lepas); });
  h.addEventListener("dblclick", () => { el.style.width = ""; simpanLokal(kunci, null); }); };
  atur(document.querySelector(".panel"), "lebar-panel", "kanan", 320, Math.min(900, innerWidth * .6));
  atur(document.querySelector(".tools"), "lebar-tools", "kiri", 220, 520); })();
/* tombol lipat Overlay: tutup/buka semua grup sekaligus */
$("#lapisLipat").addEventListener("click", e => { e.stopPropagation(); const ds = [...document.querySelectorAll("#lapis details")], buka = ds.every(d => !d.open);
  ds.forEach(d => d.open = buka); const b = e.currentTarget; b.classList.toggle("tutup", !buka); b.title = b.ariaLabel = buka ? "Tutup semua grup" : "Buka semua grup"; });
