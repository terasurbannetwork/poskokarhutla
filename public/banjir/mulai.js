"use strict";
/* ================================================================ cari */
$("#cari").addEventListener("input", async e => {
  const q = e.target.value.trim().toLowerCase(), h = $("#hasil"); if (q.length < 2) { h.hidden = true; return; }
  const idx = [...Object.entries(S.meta.provinsi).map(([k, n]) => ({k, n, j: "Provinsi"})), ...Object.keys(S.st.kec).map(k => { const p = k.split("|"); return {k, n: p[2], j: "Kec. · " + p[1]}; })];
  const hs = idx.filter(i => i.n.toLowerCase().includes(q)).slice(0, 12);
  h.innerHTML = hs.length ? hs.map(i => `<button data-k="${esc(i.k)}">${esc(i.n)}<br><small>${esc(i.j)}</small></button>`).join("") : `<div class="kosong" style="padding:12px">Tidak ditemukan di wilayah berstatus.</div>`; h.hidden = false; });
$("#hasil").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $("#hasil").hidden = true; $("#cari").value = ""; const p = b.dataset.k.split("|");
  if (p.length === 3) { S.jalur = p.slice(0, 2); Peta.aturWilayah().then(() => Analisa.wilayah(b.dataset.k)); } else turun(b.dataset.k); });

pasangTip(); /* tooltip [data-tip] bersama (inti/tip.js) */
PilihCantik.pasang(); /* semua <select> di <main> jadi pil (inti/pilih.js), seperti karhutla */
const BASI_TAMPIL = false; /* spanduk merah "Prakiraan terakhir diperbarui": disembunyikan pemilik di karhutla (`if (false && umur > 26)`); ubah ke true untuk memulihkan */

/* ================================================================ mulai */
(async () => {
  try { await muatData(); }  catch (e) { $("#muat").innerHTML = `<div><b>Data belum tersedia.</b><br>${esc(e.message)}</div>`; return; }
  if (!BASI_TAMPIL) $("#basi").hidden = true; renderHari(); await Peta.init(); renderLegenda();
  $("#muat").classList.add("hilang");
  /* /banjir/<tab> (bersih) atau #tab lama (dialihkan ke /banjir/<tab>); tab tanpa isi jatuh ke Peta */
  const j = location.pathname.replace(/^\/banjir\/?/, "").replace(/\/+$/, "").replace(/^index\.html$/, ""), hs = location.hash.slice(1), h = ID_JADI(j || hs);
  if (TABS.some(t => t[0] === h) && halamanAda(h)) bukaTab(h, !j || ID_JADI(j) !== j || !!hs);
  else if (j) history.replaceState(null, "", "/banjir/peta");
})();
/* panel kiri & kanan bisa ditarik untuk dilebarkan; lebar diingat per perangkat */
(() => { const atur = (el, kunci, sisi, min, max) => { if (!el) return; const w0 = bacaLokal(kunci, null); if (w0 && innerWidth > 900) el.style.width = w0 + "px";
  const h = document.createElement("div"); h.className = "tarik"; h.title = "Tarik untuk mengubah lebar"; h.setAttribute("role", "separator"); h.setAttribute("aria-orientation", "vertical"); el.appendChild(h);
  h.addEventListener("pointerdown", e => { e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add("aktif"); const x0 = e.clientX, w = el.getBoundingClientRect().width;
    const gerak = ev => { const lebar = Math.max(min, Math.min(max, w + (sisi === "kanan" ? ev.clientX - x0 : x0 - ev.clientX))); el.style.width = lebar + "px"; };
    const lepas = () => { h.classList.remove("aktif"); h.removeEventListener("pointermove", gerak); h.removeEventListener("pointerup", lepas); simpanLokal(kunci, Math.round(el.getBoundingClientRect().width)); if (typeof peta !== "undefined" && peta) peta.resize(); };
    h.addEventListener("pointermove", gerak); h.addEventListener("pointerup", lepas); });
  h.addEventListener("dblclick", () => { el.style.width = ""; simpanLokal(kunci, null); }); };
  atur(document.querySelector(".panel"), "lebar-panel", "kanan", 320, Math.min(900, innerWidth * .6));
  atur(document.querySelector(".tools"), "lebar-tools", "kiri", 220, 520); })();
document.addEventListener("click", e => { const d = document.querySelector(".bencana"); if (d && d.open && !e.target.closest(".bencana")) d.open = false; });
/* tombol lipat Overlay: tutup/buka semua grup sekaligus (sama dengan karhutla) */
$("#lapisLipat").addEventListener("click", e => { e.stopPropagation(); const ds = [...document.querySelectorAll("#lapis details")], buka = ds.every(d => !d.open);
  ds.forEach(d => d.open = buka); const b = e.currentTarget; b.classList.toggle("tutup", !buka); b.title = b.ariaLabel = buka ? "Tutup semua grup" : "Buka semua grup"; });
