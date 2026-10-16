"use strict";
/* Beranda semua bencana (/semua): peta gabungan, pil saring bencana (multi-pilih), satu kartu situasi per bencana.
   Digerakkan registry (/bencana.json) dan adaptor data (inti/adapter.js): bencana tanpa adaptor atau tanpa data tidak tampil, diam-diam. */
import {muatSemua} from "/inti/adapter.js";
import {IKON} from "/inti/kepala.js";
import {susunLegenda} from "/inti/peta/legenda.js";

const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const bacaLokal = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const svg = (isi, w) => `<svg class="ik" viewBox="0 0 24 24" aria-hidden="true">${isi || `<circle cx="12" cy="12" r="6" fill="${w}"/>`}</svg>`;
const IK_BAGI = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];

const tema = bacaLokal("pb-tema"); if (tema) document.documentElement.dataset.theme = tema;
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";

/* ---------- data: registry lalu adaptor */
const H = (async () => {
  const reg = await (await fetch("/bencana.json")).json();
  return muatSemua(reg);
})().catch(() => []);
const dipilih = new Set();

/* ---------- peta */
const peta = new maplibregl.Map({container: "peta", style: DASAR(), bounds: BB_ID, fitBoundsOptions: {padding: {top: 72, bottom: 24, left: 16, right: 16}, maxZoom: 5.5}, attributionControl: {compact: true}});
peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
const popup = new maplibregl.Popup({closeButton: false, offset: 8});

async function pasang() {
  const daftar = await H;
  for (const h of daftar) {
    const id = "s-" + h.b.id;
    if (peta.getSource(id)) continue;
    peta.addSource(id, {type: "geojson", data: {type: "FeatureCollection", features: h.titik.filter(t => isFinite(t[0]) && isFinite(t[1]))
      .map(([lo, la, r, t]) => ({type: "Feature", geometry: {type: "Point", coordinates: [lo, la]}, properties: {r, t: t || ""}}))}});
    peta.addLayer({id: "l-" + h.b.id, type: "circle", source: id, layout: {visibility: dipilih.has(h.b.id) ? "visible" : "none"},
      paint: {"circle-radius": ["get", "r"], "circle-color": h.b.warna, "circle-opacity": .78, "circle-stroke-color": "#fff", "circle-stroke-width": ["case", ["<", ["get", "r"], 4], 0, 1]}});
    peta.on("mouseenter", "l-" + h.b.id, () => peta.getCanvas().style.cursor = "pointer");
    peta.on("mouseleave", "l-" + h.b.id, () => peta.getCanvas().style.cursor = "");
    peta.on("click", "l-" + h.b.id, e => popup.setLngLat(e.features[0].geometry.coordinates)
      .setHTML(`<b>${esc(h.b.nama)}</b>${e.features[0].properties.t ? `<br>${esc(e.features[0].properties.t)}` : ""}<br><a href="${esc(h.b.rute)}">Lihat halaman</a>`).addTo(peta));
  }
}
peta.on("style.load", pasang);

/* ---------- pil saring, kartu, legenda */
const atur = (id, nyala) => {
  nyala ? dipilih.add(id) : dipilih.delete(id);
  if (peta.getLayer("l-" + id)) peta.setLayoutProperty("l-" + id, "visibility", nyala ? "visible" : "none");
  document.querySelectorAll(`[data-h="${id}"]`).forEach(e => e.hidden = !nyala);
  $("#legenda").hidden = !dipilih.size;
};

H.then(daftar => {
  if (!daftar.length) { $("#kartu").innerHTML = '<p class="kosong">Belum ada data bencana yang bisa ditampilkan. Coba lagi nanti.</p>'; $("#saring").hidden = true; $("#legenda").hidden = true; return; }
  daftar.forEach(h => dipilih.add(h.b.id));
  $("#saring").innerHTML = daftar.map(h => `<label class="pf" style="--w:${h.b.warna}"><input type="checkbox" data-id="${h.b.id}" checked>${svg(IKON[h.b.ikon], h.b.warna)}<span>${esc(h.b.nama)}</span></label>`).join("");
  $("#saring").addEventListener("change", e => atur(e.target.dataset.id, e.target.checked));
  $("#kartu").innerHTML = daftar.map(h => Kartu.ex(h.judul, "", "", `<div class="pls">${h.pil.map(([t, w]) => `<span class="pl" style="--w:${w || h.b.warna}">${esc(t)}</span>`).join("")}</div>
      <div class="aksi"><a class="lihat" href="${esc(h.b.rute)}">Lihat halaman</a><button class="iconbtn-k" data-bagi="${esc(h.b.rute)}" data-nama="${esc(h.b.nama)}" aria-label="Bagikan" title="Bagikan">${IK_BAGI}</button></div>`, "Sumber: " + h.sumber)
    .replace('<span class="ex-ey"></span>', `<span class="ex-ey" style="--w:${h.b.warna}">${svg(IKON[h.b.ikon], h.b.warna)}${esc(h.b.nama)}</span>`)
    .replace("<article", `<article data-h="${h.b.id}"`)).join("");
  $("#legenda").innerHTML = `<details id="legDet" open><summary class="lbl">Legenda</summary><div class="lg-isi">${daftar.filter(h => h.titik.length).map(h => `<div class="lbl" data-h="${h.b.id}">${esc(h.b.nama)}</div>${h.legenda.map(([w, n]) => `<div class="leg" data-h="${h.b.id}"><span><i class="sw" style="background:${w}"></i>${esc(n)}</span></div>`).join("")}`).join("")}</div></details>`;
  susunLegenda($("#legenda"), {saatBuka: () => {}});
  /* susunLegenda membungkus tiap judul + keterangan dalam .lg-g: tandai kelompok dengan bencananya supaya ikut pil */
  document.querySelectorAll("#legenda .lg-g").forEach(g => g.dataset.h = g.firstElementChild.dataset.h);
});

/* ---------- bagikan (ikon saja, lembar bersama public/bagi.js) dan tema */
function bagikan(url, nama, kampanye) {
  const u = new URL(url, location.origin).href;
  if (window.Bagi) Bagi.buka({judul: nama, teks: nama + ". Pantau Bencana:", url: u, kampanye}); else toast("Bagikan belum siap, coba lagi.");
}
$("#bagikan").onclick = () => bagikan("/semua", "Semua bencana · Pantau Bencana", "semua");
$("#kartu").addEventListener("click", e => { const b = e.target.closest("[data-bagi]"); if (b) bagikan(b.dataset.bagi, b.dataset.nama + " · Pantau Bencana", "semua-" + b.closest("article").dataset.h); });
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pb-tema", t); } catch (e) {} nanti(() => peta.setStyle(DASAR(), {diff: false})); };
