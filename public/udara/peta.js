"use strict";
/* ================================================================ peta
   Lapisan: PM2,5 CAMS (gambar 1 piksel per sel 1 derajat, dihaluskan peramban seperti hujan di banjir), titik jarak pandang METAR, citra satelit.
   Ubin Overlay, kartu hover, dan susunan legenda dari public/inti/peta. */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const UBIN = {pm25: ["#3b6e5a", "#e8743b", "angin"], metar: ["#1f5f8b", "#9fb3d1", "mata"], satelit: ["#13324d", "#4d8a5e", "satelit"]};
const UBIN_PENDEK = {pm25: "PM2,5", metar: "Jarak pandang", satelit: "Satelit"};
const kiriPad = () => { const r = s => document.querySelector(s)?.getBoundingClientRect(), pt = r("#p-peta"), pn = r(".panel"), tl = r(".tools"), gw = r("#garisWaktu");
  if (innerWidth <= 900) return {top: Math.max(60, gw?.width && pt ? gw.bottom - pt.top + 12 : 60), bottom: (pn?.height || innerHeight * .46) + 16, left: 16, right: 16};
  const kiri = (pn?.width || 400) + 30, kanan = (tl?.width || 250) + 30, sisa = Math.max(0, kiri + kanan - (pt?.width || innerWidth) + 160), k = sisa ? Math.max(0, 1 - sisa / (kiri + kanan)) : 1;
  return {top: 56, left: kiri * k, right: kanan * k, bottom: Math.max(30, gw?.width && pt ? pt.bottom - gw.top + 16 : 90)}; };
function kotak(fitur) { const a = [180, 90, -180, -90];
  const jalan = c => { if (typeof c[0] === "number") { a[0] = Math.min(a[0], c[0]); a[1] = Math.min(a[1], c[1]); a[2] = Math.max(a[2], c[0]); a[3] = Math.max(a[3], c[1]); } else c.forEach(jalan); };
  fitur.forEach(f => jalan(f.geometry.coordinates)); return [[a[0], a[1]], [a[2], a[3]]]; }

const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    PI?.ubinLapis($("#lapis"), {katalog: UBIN, pendek: UBIN_PENDEK});
    LG = await import("../inti/peta/legenda.js").catch(() => null);
    const lebar = () => { const w = $(".panel")?.getBoundingClientRect().width, t = $(".tools")?.getBoundingClientRect().width, p = $("#p-peta");
      if (w) p.style.setProperty("--lp", w + "px"); if (t) p.style.setProperty("--tw", t + "px"); };
    const ro = new ResizeObserver(lebar); ro.observe($(".panel")); ro.observe($(".tools")); lebar();
    peta = new maplibregl.Map({container: "peta", style: DASAR(), center: [118, -2.4], zoom: 4.1, minZoom: 3, maxZoom: 12, attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false});
    peta.touchZoomRotate.disableRotation();
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    peta.on("style.load", () => this.pasang());
    await new Promise(r => peta.isStyleLoaded() ? r() : peta.once("style.load", r));
    peta.fitBounds(BB_ID, {padding: kiriPad(), duration: 0}); },
  lihat(k) { const i = document.querySelector(`#lapis input[data-l="${k}"]`); return i ? i.checked : false; },
  bawahLabel() { const l = peta.getStyle().layers.find(l => l.type === "symbol"); return l && l.id; },
  pasang() {
    if (peta.getSource("pm")) return;
    const bl = this.bawahLabel(), vis = on => ({visibility: on ? "visible" : "none"});
    const g = this.gambarPM();
    peta.addSource("pm", {type: "image", url: g.url, coordinates: g.kor});
    peta.addLayer({id: "pm", type: "raster", source: "pm", layout: vis(this.lihat("pm25")), paint: {"raster-opacity": .8, "raster-resampling": "linear", "raster-fade-duration": 0}}, bl);
    peta.addSource("prov", {type: "geojson", data: S.geo, promoteId: "kode"});
    peta.addLayer({id: "prov-fill", type: "fill", source: "prov", paint: {"fill-color": "#000", "fill-opacity": 0.01}});
    peta.addLayer({id: "prov-line", type: "line", source: "prov", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": ["case", ["boolean", ["feature-state", "pilih"], false], 3, 1], "line-opacity": ["case", ["boolean", ["feature-state", "pilih"], false], .95, .4]}});
    const m = this.geoMetar();
    peta.addSource("metar", {type: "geojson", data: m});
    peta.addLayer({id: "metar", type: "circle", source: "metar", layout: {...vis(this.lihat("metar")), "circle-sort-key": ["-", 0, ["get", "k"]]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 9, 11], "circle-color": ["match", ["get", "k"], 3, JP[3].w, 2, JP[2].w, 1, JP[1].w, JP[0].w], "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
    if (S.pilih) peta.setFeatureState({source: "prov", id: S.pilih}, {pilih: true});
    this.interaksi(); },
  /* PM2,5 rata-rata 24 jam hari aktif sebagai gambar: satu piksel per sel, diperbesar 8x dengan penghalusan supaya tepi sel tidak kotak */
  gambarPM() {
    const rows = S.asap.grid, las = rows.map(r => r[0]), los = rows.map(r => r[1]), x0 = Math.min(...los) - .5, x1 = Math.max(...los) + .5, y0 = Math.min(...las) - .5, y1 = Math.max(...las) + .5;
    const w = Math.round(x1 - x0), h = Math.round(y1 - y0), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h);
    for (const r of rows) { const v = r[ROW.rata][S.hari]; if (v == null) continue; const cx = Math.floor(r[1] - x0), cy = Math.floor(y1 - r[0]);
      if (cx >= 0 && cy >= 0 && cx < w && cy < h) img.data.set(gradasi(ST_PM, v), (cy * w + cx) * 4); }
    ctx.putImageData(img, 0, 0);
    const K = 8, bs = document.createElement("canvas"); bs.width = w * K; bs.height = h * K; const c2 = bs.getContext("2d"); c2.imageSmoothingEnabled = true; c2.imageSmoothingQuality = "high"; c2.drawImage(cv, 0, 0, bs.width, bs.height);
    return {url: bs.toDataURL(), kor: [[x0, y1], [x1, y1], [x1, y0], [x0, y0]]}; },
  geoMetar() { return {type: "FeatureCollection", features: metarSegar().map((m, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [m.lon, m.lat]}, properties: {i, k: kelasJP(m.vis_m)}}))}; },
  terlihat(k) { return this.lihat(k); },
  segarkan() { if (!peta?.getSource("pm")) return; const g = this.gambarPM(); peta.getSource("pm").updateImage({url: g.url, coordinates: g.kor}); peta.getSource("metar")?.setData(this.geoMetar()); },
  kartuSel(la, lo) { const r = sel(la, lo); if (!r) return ""; const v = r[ROW.rata][S.hari], mk = r[ROW.maks][S.hari]; if (v == null) return "";
    const c = kat(v);
    return PI.kartuTip({judul: `${KAT[c].n}`, stat: [["perisai", KAT[c].n, "kategori", KAT[c].w, c >= 2], ["debit", fmt(Math.round(v)) + " µg/m³", "rata-rata 24 jam", KAT[c].w], ["peringatan", fmt(Math.round(mk)) + " µg/m³", "puncak per jam", "#7d8ca3"]]}); },
  kartuMetar(i) { const m = metarSegar()[i]; if (!m) return ""; const k = kelasJP(m.vis_m), w = wxNama(m.wx);
    return PI.kartuTip({judul: esc(m.nama), sub: `<small>${esc(m.icao)}</small>`, stat: [["mata", m.vis_m >= 9999 ? "10 km atau lebih" : fmt(m.vis_m / 1000) + " km", "jarak pandang", JP[k].w, k >= 2], ...(w ? [["peringatan", w, "cuaca", "#e8743b"]] : [])]}); },
  pilihProv(kode, terbang = true) {
    if (S.pilih && peta?.getSource("prov")) peta.setFeatureState({source: "prov", id: S.pilih}, {pilih: false});
    S.pilih = kode || null;
    if (S.pilih && peta?.getSource("prov")) peta.setFeatureState({source: "prov", id: S.pilih}, {pilih: true});
    if (terbang && peta) { const f = S.geo.features.find(f => f.properties.kode === kode); peta.fitBounds(f ? kotak([f]) : BB_ID, {padding: kiriPad(), duration: 700, maxZoom: 8}); }
    renderDaftar(); },
  interaksi() {
    if (this._ia) return; this._ia = true; let diTitik = false;
    peta.on("mousemove", "metar", e => { diTitik = true; peta.getCanvas().style.cursor = "pointer"; PI?.tampilTip(this.kartuMetar(e.features[0].properties.i), e.originalEvent); });
    peta.on("mouseleave", "metar", () => { diTitik = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); });
    peta.on("mousemove", e => { if (diTitik || !PI || !this.lihat("pm25")) return;
      const ada = peta.queryRenderedFeatures(e.point, {layers: ["prov-fill"]}).length; peta.getCanvas().style.cursor = ada ? "pointer" : "";
      const h = ada ? this.kartuSel(e.lngLat.lat, e.lngLat.lng) : ""; h ? PI.tampilTip(h, e.originalEvent) : PI.sembunyiTip(); });
    peta.getCanvas().addEventListener("mouseleave", () => PI?.sembunyiTip());
    peta.on("click", e => { const f = peta.queryRenderedFeatures(e.point, {layers: ["prov-fill"]})[0]; if (f) this.pilihProv(f.properties.kode); }); },
};

/* ---------- panel ---------- */
function renderRingkas() {
  const n = S.uk.nasional[S.hari].jiwa, ts = n[2] + n[3] + n[4];
  $("#crumb").innerHTML = `<div class="kv" style="grid-template-columns:repeat(3,1fr);width:100%;margin:0 0 8px">${[["Tidak sehat atau lebih", ts, KAT[2].w], ["Sedang", n[1], KAT[1].w], ["Baik", n[0], KAT[0].w]].map(([t, v, w]) => `<div><b style="color:${w}">${rb(v)}</b><span>${t}</span></div>`).join("")}</div>`; }
function renderDaftar() {
  renderRingkas();
  const q = ($("#cari").value || "").trim().toLowerCase(), g = "grid-template-columns:20px minmax(0,1fr) 56px 54px 122px";
  const item = Object.entries(S.uk.prov).map(([k, h]) => { const p = h[S.hari]; return {k, nama: namaProv(k), rata: p[5], ts: p[2] + p[3] + p[4], c: kat(p[5])}; })
    .filter(i => !q || i.nama.toLowerCase().includes(q)).sort((a, b) => b.rata - a.rata);
  $("#rows").innerHTML = `<div class="tb kepala" style="${g}"><span></span><span>Provinsi</span><span class="n" style="text-transform:none">µg/m³</span><span class="n">Jiwa</span><span style="text-align:right">Kategori</span></div>`
    + (item.map((i, n) => `<button class="tb${i.k === S.pilih ? " dipilih" : ""}" data-k="${i.k}" style="${g}"><span class="rk">${n + 1}</span><span style="font-weight:600" translate="no">${esc(i.nama)}</span>
      <span class="n">${fmt(Math.round(i.rata))}</span><span class="n">${i.ts ? rb(i.ts) : "–"}</span><span style="text-align:right">${pilKat(i.c)}</span></button>`).join("") || `<div class="kosong">Tidak ditemukan.</div>`); }
$("#rows").addEventListener("click", e => { const b = e.target.closest(".tb:not(.kepala)"); if (b) Peta.pilihProv(b.dataset.k === S.pilih ? null : b.dataset.k, b.dataset.k !== S.pilih); });
$("#cari").addEventListener("input", renderDaftar);
$("#handle").onclick = () => $("#panel").classList.toggle("min");

/* ---------- hari, overlay, legenda ---------- */
function renderHari() {
  $("#hariSeg").innerHTML = `<div class="seg penuh" style="box-shadow:none">${S.uk.hari.map((t, i) => `<button data-i="${i}" aria-pressed="${S.hari === i}">${i ? tglPendek(t) : "Hari ini"}</button>`).join("")}</div>`; }
$("#hariSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.hari = +b.dataset.i;
  $("#hariSeg").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => { Peta.segarkan(); renderDaftar(); }); });
$("#lapis").addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !peta) return; const k = i.dataset.l;
  if (k === "satelit") { if (!peta.getSource("satelit")) { peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
      peta.addLayer({id: "satelit", type: "raster", source: "satelit"}, "pm"); } }
  const id = {pm25: "pm", metar: "metar", satelit: "satelit"}[k]; peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", i.checked ? "visible" : "none");
  renderLegenda(); });
$("#lapisBtn").onclick = () => $("#lapis").classList.toggle("buka");
function renderLegenda() {
  const adaMetar = metarSegar().length > 0;   /* tanpa stasiun segar, keterangannya dibuang (A18) */
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${Peta.terlihat("pm25") ? `<div class="lbl">PM2,5 rata-rata 24 jam <span style="text-transform:none">(µg/m³)</span></div><div class="leg" style="margin:4px 0 8px">${KAT.map(k => `<span><i class="sw" style="background:${k.w}"></i>${k.n} · ${k.r}</span>`).join("")}</div>` : ""}
    ${adaMetar && Peta.terlihat("metar") ? `<div class="lbl">Jarak pandang bandara (METAR)</div><div class="leg" style="margin:4px 0 8px">${JP.map(j => `<span><i class="sw dot" style="background:${j.w}"></i>${j.n}</span>`).join("")}</div>` : ""}
  </div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: v => legBuka = v}); }
