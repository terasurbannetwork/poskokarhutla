"use strict";
/* Peta gunung api: segitiga berwarna level PVMBG, cincin radius rekomendasi, daftar kiri, legenda dok bawah, pop-up detail. */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const UBIN = {gunung: ["#7a2e1d", "#e58a45", "peringatan"], radius: ["#7a3b0b", "#f2b544", "perisai"], nama: ["#1f3a5f", "#6d8fc0", "mata"], satelit: ["#13324d", "#4d8a5e", "satelit"]};
const UBIN_PENDEK = {gunung: "Gunung", radius: "Radius", nama: "Nama", satelit: "Satelit"};
const kiriPad = () => { const r = s => document.querySelector(s)?.getBoundingClientRect(), pt = r("#p-peta"), pn = r(".panel"), tl = r(".tools"), lg = r("#dok");
  if (innerWidth <= 900) return {top: 70, bottom: (pn?.height || innerHeight * .46) + 16, left: 16, right: 16};
  const kiri = (pn?.width || 400) + 30, kanan = (tl?.width || 250) + 30, sisa = Math.max(0, kiri + kanan - (pt?.width || innerWidth) + 160), k = sisa ? Math.max(0, 1 - sisa / (kiri + kanan)) : 1;
  return {top: 56, left: kiri * k, right: kanan * k, bottom: Math.max(30, lg && pt ? pt.bottom - lg.top + 16 : 90)}; };

/* lingkaran radius sebagai poligon (64 titik), tanpa pustaka */
function cincin(lat, lon, rKm, n = 64) {
  const dLat = rKm / 111.2, dLon = rKm / (111.2 * Math.cos(lat * Math.PI / 180)), k = [];
  for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; k.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]); }
  return k; }
const urut = (a, b) => b.level - a.level || a.nama.localeCompare(b.nama);
const letusanDari = nama => (S.st.letusan || []).filter(e => e.gunung === nama);
const saring = () => { const q = S.q.trim().toLowerCase(); return S.st.gunung.filter(g => (!S.level || g.level === S.level) && (!q || (g.nama + " " + g.prov).toLowerCase().includes(q))).sort(urut); };

const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    PI?.ubinLapis($("#lapis"), {katalog: UBIN, pendek: UBIN_PENDEK});
    LG = await import("../inti/peta/legenda.js").catch(() => null);
    const lebar = () => { const w = $(".panel")?.getBoundingClientRect().width, t = $(".tools")?.getBoundingClientRect().width, p = $("#p-peta");
      if (w) p.style.setProperty("--lp", w + "px"); if (t) p.style.setProperty("--tw", t + "px"); };
    const ro = new ResizeObserver(lebar); ro.observe($(".panel")); ro.observe($(".tools")); lebar();
    peta = new maplibregl.Map({container: "peta", style: DASAR(), center: [118, -2.4], zoom: 4.1, minZoom: 3, maxZoom: 15, attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false});
    peta.touchZoomRotate.disableRotation();
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    peta.on("style.load", () => this.pasang());
    await new Promise(r => peta.isStyleLoaded() ? r() : peta.once("style.load", r));
    peta.fitBounds(BB_ID, {padding: kiriPad(), duration: 0}); },
  lihat(k) { const i = document.querySelector(`#lapis input[data-l="${k}"]`); return i ? i.checked : false; },
  geoTitik() { return {type: "FeatureCollection", features: saring().map(g => ({type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]}, properties: {nama: g.nama, lv: g.level}}))}; },
  geoRadius() { return {type: "FeatureCollection", features: saring().filter(g => g.radius_km).map(g => ({type: "Feature", geometry: {type: "Polygon", coordinates: [cincin(g.lat, g.lon, g.radius_km)]}, properties: {nama: g.nama, lv: g.level}}))}; },
  pasang() {
    if (peta.getSource("titik")) return;
    const vis = k => ({visibility: this.lihat(k) ? "visible" : "none"}), warna = ["match", ["get", "lv"], 4, WARNA_LV[4], 3, WARNA_LV[3], 2, WARNA_LV[2], WARNA_LV[1]];
    const sebelum = peta.getStyle().layers.find(l => l.type === "symbol")?.id;
    peta.addSource("radius", {type: "geojson", data: this.geoRadius()});
    peta.addLayer({id: "radius-isi", type: "fill", source: "radius", layout: vis("radius"), paint: {"fill-color": warna, "fill-opacity": .14}}, sebelum);
    peta.addLayer({id: "radius-garis", type: "line", source: "radius", layout: vis("radius"), paint: {"line-color": warna, "line-width": 2, "line-dasharray": [2, 1.5]}}, sebelum);
    peta.addSource("titik", {type: "geojson", data: this.geoTitik()});
    const ukuran = ["interpolate", ["linear"], ["zoom"], 3, ["match", ["get", "lv"], 1, 9, 12], 9, ["match", ["get", "lv"], 1, 16, 24]];
    peta.addLayer({id: "titik", type: "symbol", source: "titik", layout: {...vis("gunung"), "text-field": "▲", "text-font": ["Noto Sans Bold"], "text-size": ukuran, "text-allow-overlap": true, "symbol-sort-key": ["get", "lv"]},
      paint: {"text-color": warna, "text-halo-color": gelap() ? "#0b1220" : "#fff", "text-halo-width": 1.6}});
    peta.addLayer({id: "nama", type: "symbol", source: "titik", minzoom: 5, layout: {...vis("nama"), "text-field": ["get", "nama"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top", "text-optional": true},
      paint: {"text-color": gelap() ? "#e6edf7" : "#1b2740", "text-halo-color": gelap() ? "#0b1220" : "#fff", "text-halo-width": 1.4}});
    if (this.lihat("satelit")) this.satelit();
    this.interaksi(); renderLegenda(); },
  satelit() {
    if (peta.getSource("satelit")) return;
    peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
    peta.addLayer({id: "satelit", type: "raster", source: "satelit", layout: {visibility: this.lihat("satelit") ? "visible" : "none"}}, peta.getLayer("radius-isi") ? "radius-isi" : undefined); },
  segarkan() { peta?.getSource("titik")?.setData(this.geoTitik()); peta?.getSource("radius")?.setData(this.geoRadius()); renderDaftar(); },
  kartu(g) { const stat = [["perisai", `Level ${LEVEL[g.level][0]}`, LEVEL[g.level][1], WARNA_LV[g.level], g.level >= 3]];
    if (g.radius_km) stat.push(["peringatan", fmt(g.radius_km) + " km", "radius rekomendasi", WARNA_LV[g.level]]);
    return PI.kartuTip({judul: esc(g.nama), sub: `<small>${esc(g.prov)}</small>`, stat}); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    const cari = nama => S.st.gunung.find(g => g.nama === nama);
    peta.on("mousemove", "titik", e => { peta.getCanvas().style.cursor = "pointer"; const g = cari(e.features[0].properties.nama); g && PI?.tampilTip(this.kartu(g), e.originalEvent); });
    peta.on("mouseleave", "titik", () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); });
    peta.on("click", "titik", e => { const g = cari(e.features[0].properties.nama); g && Detail.buka(g); });
    /* sentuh: tanpa hover, ketuk langsung membuka detail (di atas) */
    document.querySelector("#lapis").addEventListener("change", e => { const k = e.target.dataset.l; if (!k) return;
      if (k === "satelit") this.satelit();
      const ids = {gunung: ["titik"], radius: ["radius-isi", "radius-garis"], nama: ["nama"], satelit: ["satelit"]}[k] || [];
      ids.forEach(id => peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", e.target.checked ? "visible" : "none")); renderLegenda(); });
  },
  terbang(g) { peta.flyTo({center: [g.lon, g.lat], zoom: Math.max(peta.getZoom(), g.radius_km ? 9 : 8), duration: 700}); },
};

/* ---------- daftar kiri ---------- */
function renderLevelSeg() {
  const op = [[0, "Semua"], [4, "Awas"], [3, "Siaga"], [2, "Waspada"], [1, "Normal"]].filter(([l]) => !l || S.n[l]);
  $("#levelSeg").innerHTML = op.map(([l, n]) => `<button data-l="${l}" aria-pressed="${S.level === l}">${n}${l ? ` <b class="num">${S.n[l]}</b>` : ""}</button>`).join(""); }
function renderDaftar() {
  const L = saring();
  $("#rows").innerHTML = L.length ? L.map(g => `<button class="row gn" role="listitem" data-n="${esc(g.nama)}"><span class="rk" style="color:${WARNA_LV[g.level]}">▲</span>
    <span><span class="nm">${esc(g.nama)}</span><span class="sub">${esc(g.prov)}${g.radius_km ? ` · radius ${fmt(g.radius_km)} km` : ""}</span></span>${pilLv(g.level, true)}</button>`).join("")
    : `<div class="kosong">Tidak ada gunung yang cocok.</div>`; }
$("#rows").addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (!b) return; const g = S.st.gunung.find(x => x.nama === b.dataset.n); if (g) { Peta.terbang(g); Detail.buka(g); } });
$("#levelSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.level = +b.dataset.l; renderLevelSeg(); nanti(() => Peta.segarkan()); });
$("#cari").addEventListener("input", e => { S.q = e.target.value; nanti(() => Peta.segarkan()); });

/* ---------- legenda dok ---------- */
function renderLegenda() {
  const ada = l => S.n[l] > 0;
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${Peta.lihat("gunung") ? `<div class="lbl">Level resmi PVMBG</div><div class="leg" style="margin:4px 0 8px">${[4, 3, 2, 1].filter(ada).map(l => `<span><b style="color:${WARNA_LV[l]}">▲</b> Level ${LEVEL[l][0]} ${LEVEL[l][1]} · ${S.n[l]}</span>`).join("")}</div>` : ""}
    ${Peta.lihat("radius") ? `<div class="lbl">Radius rekomendasi</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw ring"></i>lingkaran putus-putus</span></div>` : ""}</div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }

/* ---------- pop-up detail ---------- */
const Detail = {
  buka(g) {
    const ev = letusanDari(g.nama).slice(0, 3), kv = (v, l) => !v ? "" : `<div><b>${v}</b><span>${l}</span></div>`;
    const kot = [kv(g.radius_km && fmt(g.radius_km) + " km", "radius"), kv(g.sektor_km && fmt(g.sektor_km) + " km", "jarak sektor"), kv(g.penduduk_radius > 0 ? "±" + rb(g.penduduk_radius) : null, "jiwa dalam radius"), kv(g.tinggi > 0 && fmt(g.tinggi) + " m", "tinggi puncak")].join("");
    $("#dlg").innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${esc(g.nama)}</h3><p>${esc(g.prov)}</p><div style="margin-top:8px">${pilLv(g.level)}</div></div><button type="button" aria-label="Tutup" data-tutup>×</button></div>
      <div class="db">${kot ? `<div class="kv gn-kv">${kot}</div>` : ""}
      ${g.rekomendasi ? `<details class="lipat" open><summary>Rekomendasi PVMBG</summary><div class="isi"><p class="rek-teks">${esc(g.rekomendasi)}</p><p class="rek-sumber">${esc(g.periode || "")}${g.periode ? " · " : ""}MAGMA Indonesia</p></div></details>` : ""}
      ${ev.length ? `<details class="lipat" open><summary>Erupsi terbaru</summary><div class="isi"><ul class="ev">${ev.map(x => `<li><b>${tglJam(x.waktu)}</b>${x.tinggi_m ? ` <span class="pl" style="--w:#b5523b">kolom abu ${fmt(x.tinggi_m)} m</span>` : ""}<br>${esc(x.ket)}</li>`).join("")}</ul></div></details>` : ""}
      <div class="dk"><a class="btn sec" href="${escUrl(g.laporan)}" target="_blank" rel="noopener">Laporan lengkap di MAGMA</a>
      <button class="btn sec" type="button" data-bagi aria-label="Bagikan" title="Bagikan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.7 7.4-4.3M8.3 13.3l7.4 4.3"/></svg></button></div></div>`;
    const d = $("#dlg"); d.querySelector("[data-tutup]").onclick = () => d.close();
    d.querySelector("[data-bagi]").onclick = () => bagikan(`${g.nama}: Level ${LEVEL[g.level][0]} ${LEVEL[g.level][1]}`, "/gunungapi/peta");
    d.onclick = e => { if (e.target === d) d.close(); };
    if (!d.open) d.showModal();
  },
};
