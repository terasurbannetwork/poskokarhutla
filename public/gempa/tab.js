"use strict";
/* Tab, kepala, burger, tema. Urutan dan ikon mengikuti banjir; daftar tab = "tab" di public/bencana.json. */
const TABS = [["peta", "Peta"], ["insight", "Insight"], ["tren", "Tren"], ["berita", "Berita"], ["dampak", "Dampak"], ["foto", "Foto"], ["tentang", "Tentang"]];
/* tidak tampil di nav: halaman yang belum berisi disembunyikan, bukan dipamerkan kosong (A18, A24). */
const TAB_SEMBUNYI = new Set();
const ISI_TAB = {insight: () => Insight.render(), tren: () => Tren.render(), berita: () => Berita.render(), dampak: () => Dampak.render(), foto: () => Foto.render()};
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  berita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', dampak: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
const halamanAda = id => { const p = $("#p-" + id); return !!p && !TAB_SEMBUNYI.has(id); };
function bukaTab(id, dorong = true) {
  if (!halamanAda(id)) id = "peta";
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  /* tautan bersih tanpa tagar: /gempa/peta (worker mengarahkan jalur ini ke index.html) */
  if (dorong) history.replaceState(null, "", "/gempa/" + id);
  nanti(() => { if (id === "peta" && typeof peta !== "undefined" && peta) peta.resize(); ISI_TAB[id]?.();
    if (id === "tentang") { const f = $("#tentangBingkai"); if (!f.src) { f.style.opacity = 0; f.src = "/tentang.html?tertanam=1"; } } });
}
{ const tb = ([k, n]) => `<button data-t="${k}" aria-current="${k === "peta" ? "page" : "false"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k] || ""}</svg>${n}</button>`;
  $("#tabs").innerHTML = TABS.filter(t => !TAB_SEMBUNYI.has(t[0])).map(tb).join("");
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => typeof peta !== "undefined" && peta && peta.setStyle(DASAR(), {diff: false})); };
