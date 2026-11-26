/* Halaman publik /lapor/hari-ini (LK-06). Satu fetch tanpa parameter; saring jenis di klien (kartu hanya punya label jenis).
   Saring provinsi dilewati: kartu tidak membawa kode provinsi dan tidak ada daftar kode yang diekspor di public/. */
import {kartuPublik, el, ikon, jam} from "/lapor/kartu_publik.js";
import {IKON as IKON_BENCANA} from "/inti/kepala.js";

const $ = id => document.getElementById(id);
const ikonJenis = j => { const t = j.toLowerCase();
  const k = t.includes("banjir") ? "banjir" : t.includes("gempa") ? "gempa" : t.includes("cuaca") ? "cuaca" : t.includes("kering") ? "kekeringan" : t.includes("gunung") ? "gunungapi" : t.includes("gelombang") || t.includes("abrasi") ? "pesisir" : t.includes("kebakaran") || t.includes("karhutla") ? "karhutla" : null;
  return k ? ikon("x", IKON_BENCANA[k]) : ikon("titik"); };
const state = {baris: [], jenis: ""};
let peta = null, petaSiap = null;

async function muat() {
  $("daftar").setAttribute("aria-busy", "true"); rangka();
  try {
    const r = await fetch("/api/lapor/hari-ini", {headers: {accept: "application/json"}});
    if (r.status === 404) return keadaan("Halaman ini belum dibuka.");
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    state.baris = Array.isArray(d.baris) ? d.baris : [];
    $("stempel").textContent = d.dibuat ? `Diperbarui ${jam(d.dibuat)} WIB` : "";
    gambarSaring(); gambarDaftar(); $("daftar").setAttribute("aria-busy", "false");
  } catch { keadaan("Data belum bisa dimuat. Coba lagi.", true); }
}
function rangka() {
  const w = $("daftar"); w.replaceChildren(...[0, 1, 2].map(() => { const s = el("div", "hi-kartu hi-rangka"); s.append(el("i"), el("i"), el("i")); return s; }));
  w.setAttribute("aria-label", "Memuat daftar kejadian");
}
function keadaan(teks, ulang) {
  const b = el("div", "hi-keadaan"); b.setAttribute("role", ulang ? "alert" : "status"); b.append(el("p", null, teks));
  if (ulang) { const t = el("button", "hi-tombol", "Coba lagi"); t.type = "button"; t.addEventListener("click", muat); b.append(t); }
  $("daftar").replaceChildren(b); $("daftar").setAttribute("aria-busy", "false"); $("daftar").setAttribute("aria-label", "Daftar kejadian");
  $("saring").hidden = true; $("kolomPeta").hidden = true; $("stempel").textContent = "";
}
function gambarSaring() {
  const w = $("saring"), jenis = [...new Set(state.baris.map(b => b.jenis))].sort((a, b) => a.localeCompare(b, "id"));
  $("kolomPeta").hidden = false;
  if (jenis.length < 2) { w.hidden = true; state.jenis = ""; return; }
  const buat = (nilai, label, ik) => { const b = el("button", "hi-chip"); b.type = "button"; b.dataset.jenis = nilai; b.setAttribute("aria-pressed", String(state.jenis === nilai));
    if (ik) b.append(ik); b.append(el("span", null, label)); return b; };
  w.replaceChildren(buat("", "Semua", null), ...jenis.map(j => buat(j, j, ikonJenis(j)))); w.hidden = false;
}
$("saring").addEventListener("click", e => {
  const b = e.target.closest(".hi-chip"); if (!b) return;
  state.jenis = b.dataset.jenis;
  for (const c of $("saring").children) c.setAttribute("aria-pressed", String(c === b));   // chrome kontrol: langsung
  requestAnimationFrame(() => setTimeout(gambarDaftar));                                    // isi berat: ditunda
});
function tampil() { return state.jenis ? state.baris.filter(b => b.jenis === state.jenis) : state.baris; }
function gambarDaftar() {
  const w = $("daftar"), t = tampil(); w.setAttribute("aria-label", "Daftar kejadian");
  if (!t.length) { const b = el("div", "hi-keadaan"); b.setAttribute("role", "status");
    b.append(el("p", null, "Belum ada laporan terverifikasi dalam 24 jam terakhir. Ini bukan berarti tidak ada kejadian. Lihat Alun-alun atau hubungi BPBD setempat.")); w.replaceChildren(b); }
  else w.replaceChildren(...t.map(kartuPublik));
  gambarPeta(t);
  const id = location.hash.startsWith("#k-") ? document.getElementById(location.hash.slice(1)) : null; if (id) id.scrollIntoView({block: "nearest"});
}
/* peta: dimuat saat luang, bukan di handler klik */
function muatMaplibre() {
  if (window.maplibregl) return Promise.resolve();
  return muatMaplibre.j ||= new Promise((ok, gagal) => {
    document.head.append(Object.assign(document.createElement("link"), {rel: "stylesheet", href: "/vendor/maplibre/maplibre-gl.css"}));
    document.head.append(Object.assign(document.createElement("script"), {src: "/vendor/maplibre/maplibre-gl.js", onload: ok, onerror: gagal})); });
}
const tok = v => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = getComputedStyle(document.body).getPropertyValue(v).trim() || "gray"; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`; };
const fc = t => ({type: "FeatureCollection", features: t.filter(b => b.titik).map(b => ({type: "Feature", geometry: {type: "Point", coordinates: [b.titik.lon, b.titik.lat]},
  properties: {id: b.id, judul: b.jenis, tempat: [b.lokasi.desa && `Desa/Kel. ${b.lokasi.desa}`, b.lokasi.kab].filter(Boolean).join(", ")}}))});
function pas(data) {
  if (!data.features.length) return peta.jumpTo({center: [118, -2], zoom: 3.6});
  const b = new maplibregl.LngLatBounds(); for (const f of data.features) b.extend(f.geometry.coordinates);
  peta.fitBounds(b, {padding: 48, maxZoom: 11, duration: 0});
}
function gambarPeta(t) {
  const idle = window.requestIdleCallback ? f => requestIdleCallback(f, {timeout: 3000}) : f => setTimeout(f, 200);
  idle(async () => {
    try { await muatMaplibre(); } catch { return; }
    const data = fc(t);
    if (peta) { await petaSiap; peta.getSource("hi")?.setData(data); pas(data); return; }
    try { peta = new maplibregl.Map({container: $("peta"), style: "https://tiles.openfreemap.org/styles/positron", center: [118, -2], zoom: 3.6, attributionControl: {compact: true}}); }
    catch { $("kolomPeta").hidden = true; return; }   // tanpa WebGL: daftar kartu tetap lengkap
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
    petaSiap = new Promise(ok => peta.on("load", () => {
      peta.addSource("hi", {type: "geojson", data, cluster: true, clusterRadius: 40, clusterMaxZoom: 10});
      peta.addLayer({id: "kelompok", type: "circle", source: "hi", filter: ["has", "point_count"], paint: {"circle-color": tok("--head-bg"), "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28], "circle-stroke-width": 3, "circle-stroke-color": tok("--card")}});
      peta.addLayer({id: "kelompok-n", type: "symbol", source: "hi", filter: ["has", "point_count"], layout: {"text-field": ["get", "point_count"], "text-size": 13, "text-font": ["Noto Sans Bold"]}, paint: {"text-color": tok("--on-head")}});
      peta.addLayer({id: "titik", type: "circle", source: "hi", filter: ["!", ["has", "point_count"]], paint: {"circle-color": tok("--warn"), "circle-radius": 8, "circle-stroke-width": 2, "circle-stroke-color": tok("--card")}});
      peta.on("click", "kelompok", e => { const f = e.features[0]; peta.getSource("hi").getClusterExpansionZoom(f.properties.cluster_id).then(z => peta.easeTo({center: f.geometry.coordinates, zoom: z})); });
      peta.on("click", "titik", e => { const p = e.features[0].properties, box = el("div", "hi-pop"); box.append(el("b", null, p.judul), el("small", null, p.tempat));
        const l = el("button", "hi-tombol", "Lihat kartu"); l.type = "button";
        l.addEventListener("click", () => { const k = document.getElementById(`k-${p.id}`); if (!k) return; k.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "nearest"}); k.focus({preventScroll: true}); k.classList.remove("sorot"); requestAnimationFrame(() => requestAnimationFrame(() => k.classList.add("sorot"))); });
        box.append(l); new maplibregl.Popup({offset: 10, closeButton: false}).setLngLat(e.features[0].geometry.coordinates).setDOMContent(box).addTo(peta); });
      for (const l of ["kelompok", "titik"]) { peta.on("mouseenter", l, () => { peta.getCanvas().style.cursor = "pointer"; }); peta.on("mouseleave", l, () => { peta.getCanvas().style.cursor = ""; }); }
      pas(data); ok(); }));
  });
}
muat();
