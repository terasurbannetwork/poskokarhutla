"use strict";
/* ================================================================ peta */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const kiriPad = () => { const r = s => document.querySelector(s)?.getBoundingClientRect(), pt = r("#p-peta"), pn = r(".panel"), tl = r(".tools"), gw = r("#garisWaktu");
  if (innerWidth <= 900) return {top: Math.max(60, gw?.width && pt ? gw.bottom - pt.top + 12 : 60), bottom: (pn?.height || innerHeight * .46) + 16, left: 16, right: 16};
  const kiri = (pn?.width || 400) + 30, kanan = (tl?.width || 250) + 30, sisa = Math.max(0, kiri + kanan - (pt?.width || innerWidth) + 160), k = sisa ? Math.max(0, 1 - sisa / (kiri + kanan)) : 1;
  return {top: 56, left: kiri * k, right: kanan * k, bottom: Math.max(30, gw?.width && pt ? pt.bottom - gw.top + 16 : 90)}; };
const UBIN = {bmkg: ["#7a3b0b", "#f2b544", "peringatan"], gelombang: ["#16405c", "#4fa3c4", "ombak"], satelit: ["#13324d", "#4d8a5e", "satelit"]};
const UBIN_PENDEK = {bmkg: "BMKG", gelombang: "Ombak", satelit: "Satelit"};
function kotak(fitur) { let a = [180, 90, -180, -90];
  const jalan = c => { if (typeof c[0] === "number") { a[0] = Math.min(a[0], c[0]); a[1] = Math.min(a[1], c[1]); a[2] = Math.max(a[2], c[0]); a[3] = Math.max(a[3], c[1]); } else c.forEach(jalan); };
  fitur.forEach(f => jalan(f.geometry.coordinates)); return [[a[0], a[1]], [a[2], a[3]]]; }
const MEDAN_KOR = [[94.5, 6.5], [141.5, 6.5], [141.5, -11.5], [94.5, -11.5]]; /* kotak gambar hujan: barat laut, timur laut, tenggara, barat daya */
const sevWarna = s => WARNA_SEV[s] || SEV_ASAL;
const pilSev = s => `<span class="pl" style="--w:${sevWarna(s)}" translate="no">${esc(s)}</span>`;
const pilGel = i => `<span class="pl" style="--w:${GEL[i][3]}">${GEL[i][1]}</span>`;

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
  bawahLabel() { const l = peta.getStyle().layers.find(l => l.type === "symbol"); return l && l.id; },
  pasang() {
    if (peta.getSource("prov")) return;
    const bl = this.bawahLabel(), vis = k => ({visibility: this.lihat(k) ? "visible" : "none"});
    peta.addSource("medan", {type: "canvas", canvas: this.gambarMedan(), coordinates: MEDAN_KOR, animate: false});
    peta.addLayer({id: "medan", type: "raster", source: "medan", paint: {"raster-opacity": .75, "raster-resampling": "linear", "raster-fade-duration": 0}}, bl);
    peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
    peta.addLayer({id: "satelit", type: "raster", source: "satelit", layout: vis("satelit")}, "medan");
    peta.addSource("prov", {type: "geojson", data: this.geoGelombang(), promoteId: "kode"});
    peta.addLayer({id: "gelombang", type: "fill", source: "prov", layout: vis("gelombang"), filter: [">", ["get", "lv"], 0],
      paint: {"fill-color": ["match", ["get", "lv"], 4, GEL[3][3], 3, GEL[2][3], 2, GEL[1][3], GEL[0][3]], "fill-opacity": .3}}, bl);
    peta.addLayer({id: "prov-line", type: "line", source: "prov", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": 1, "line-opacity": .5}});
    peta.addSource("bmkg", {type: "geojson", data: this.geoBmkg()});
    peta.addLayer({id: "bmkg-fill", type: "fill", source: "bmkg", layout: vis("bmkg"), paint: {"fill-color": ["get", "w"], "fill-opacity": .4}});
    peta.addLayer({id: "bmkg-line", type: "line", source: "bmkg", layout: vis("bmkg"), paint: {"line-color": ["get", "w"], "line-width": 2.2}});
    peta.addSource("ens", {type: "geojson", data: this.geoEns()});
    peta.addLayer({id: "ens", type: "circle", source: "ens", layout: {visibility: S.mode === "ens" ? "visible" : "none"},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 14], "circle-color": ["interpolate", ["linear"], ["get", "p"], 0, "#bcd6f0", .25, "#6aa7e3", .5, "#7a4fc4", .8, "#c9503a"],
        "circle-stroke-color": "#fff", "circle-stroke-width": 1, "circle-opacity": .9}});
    this.sesuaikanMode(); this.interaksi(); renderLegenda(); renderPanel(); },
  /* hujan atau embusan digambar 1 piksel per sel di kanvas yang sama; MapLibre menghaluskan antarsel. Sumber kanvas, bukan gambar berurl data:
     (url data: dilaporkan CSP connect-src di konsol). */
  gambarMedan() {
    const sel = S.meta.sel, w = Math.round((MEDAN_KOR[1][0] - MEDAN_KOR[0][0]) / sel), h = Math.round((MEDAN_KOR[0][1] - MEDAN_KOR[2][1]) / sel);
    const cv = this.cv ||= document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), i = S.hari, angin = S.mode === "angin";
    for (const r of S.pr.sel) { const v = r[angin ? 4 : 3][i]; if (v == null) continue;
      const cx = Math.floor((r[1] - MEDAN_KOR[0][0]) / sel), cy = Math.floor((MEDAN_KOR[0][1] - r[0]) / sel); if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      img.data.set(gradasi(angin ? ST_ANGIN : ST_HUJAN, v), (cy * w + cx) * 4); }
    ctx.putImageData(img, 0, 0); return cv; },
  /* provinsi dengan peringatan gelombang berlaku: lv 1..4 menurut kelas tertinggi */
  geoGelombang() { const m = new Map(S.gl.map(o => [o.prov, o.lv]));
    return {type: "FeatureCollection", features: S.geo.features.map(f => ({type: "Feature", geometry: f.geometry, properties: {kode: f.properties.kode, lv: m.get(f.properties.kode) || 0}}))}; },
  /* tiap cincin poligon CAP berdiri sendiri (MultiPolygon) */
  geoBmkg() { return {type: "FeatureCollection", features: S.nc.map((a, i) => ({type: "Feature", geometry: {type: "MultiPolygon", coordinates: a.polygon.map(r => [r])}, properties: {i, w: sevWarna(a.severity)}}))}; },
  geoEns() { const i = S.hari;
    return {type: "FeatureCollection", features: S.pr.ens.filter(r => (r[3][i] || 0) >= .1).map(r => ({type: "Feature", geometry: {type: "Point", coordinates: [r[1], r[0]]}, properties: {k: Math.round(r[0]) + "," + Math.round(r[1]), p: r[3][i]}}))}; },
  sesuaikanMode() { if (!peta.getLayer("medan")) return;
    peta.setLayoutProperty("medan", "visibility", S.mode === "ens" ? "none" : "visible"); peta.setLayoutProperty("ens", "visibility", S.mode === "ens" ? "visible" : "none"); },
  segarkan() {
    if (!peta?.getSource("medan")) return;
    this.gambarMedan(); const m = peta.getSource("medan"); m.play(); m.pause(); peta.getSource("ens").setData(this.geoEns()); this.sesuaikanMode(); renderLegenda(); },
  /* kartu hover satu baris berikon: sel terdekat (hujan, embusan, peluang ansambel) */
  kartuSel(r) { const i = S.hari, p = S.ensK.get(Math.round(r[0]) + "," + Math.round(r[1])), pe = p?.[3][i];
    return PI.kartuTip({judul: `<span translate="no">${esc(namaProv(r[2]))}</span>`, stat: [["hujan", fmt(Math.round(r[3][i] || 0)) + " mm", "hujan", "#3f7fb8", tingkat(r[3][i], AMB().hujan) > 0],
      ["angin", fmt(Math.round(r[4][i] || 0)) + " km/jam", "embusan", "#2b8c86", tingkat(r[4][i], AMB().angin_kmj) > 0], ...(pe != null ? [["rasio", Math.round(pe * 100) + "%", "peluang ≥ 50 mm", "#7a4fc4", pe >= .5]] : [])]}); },
  kartuProv(o) { return PI.kartuTip({judul: `<span translate="no">${esc(namaProv(o.prov))}</span>`, stat: [["ombak", GEL[o.lv - 1][1], "gelombang", GEL[o.lv - 1][3], o.lv >= 3], ["peringatan", o.total, "perairan", "#3f7fb8"]]}); },
  kartuBmkg(a) { return PI.kartuTip({judul: `<span translate="no">${esc(a.event)}</span>`, stat: [["peringatan", a.severity, "BMKG", sevWarna(a.severity), a.severity === "Severe" || a.severity === "Extreme"], ["mata", a.n, "kecamatan", "#3f7fb8"]]}); },
  popupBmkg(i, ll) { const a = S.nc[i]; if (!a) return;
    new maplibregl.Popup({maxWidth: "420px", offset: 8}).setLngLat(ll).setHTML(`<div class="pp"><div class="pp-hd">${pilSev(a.severity)}<b translate="no">${esc(a.event)}</b></div>
      <p class="pp-w" translate="no">${esc(a.wilayah)}</p><p>${waktuBerlaku(a.mulai, a.selesai)}</p>${a.deskripsi ? `<p translate="no">${esc(a.deskripsi)}</p>` : ""}
      <em>Sumber: BMKG, terbit ${jamWIB(S.per.dibuat)}</em>${a.web ? ` <a href="${escUrl(a.web)}" target="_blank" rel="noopener">Infografis</a>` : ""}</div>`).addTo(peta); },
  popupProv(o, ll) { new maplibregl.Popup({maxWidth: "420px", offset: 8}).setLngLat(ll).setHTML(`<div class="pp"><div class="pp-hd">${pilGel(o.lv - 1)}<b translate="no">${esc(namaProv(o.prov))}</b></div>
      ${GEL.map((k, i) => o.kelas[i] ? `<p>${pilGel(i)} <span translate="no">${esc(o.perairan[i].join(", "))}</span></p>` : "").join("")}
      <p>${waktuBerlaku(o.dari + (OFS[o.zona] || "+07:00"), o.sampai + (OFS[o.zona] || "+07:00"))}</p><em>Sumber: BMKG Maritim, terbit ${jamWIB(S.per.dibuat)}</em></div>`).addTo(peta); },
  /* terbang ke satu peringatan: nowcast ke kotaknya, gelombang ke provinsinya */
  fokus(jenis, k) {
    const nc = jenis === "nc", f = nc ? {geometry: {coordinates: S.nc[k].polygon}} : S.geo.features.find(x => x.properties.kode === k); if (!f) return;
    const b = kotak([f]), c = [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
    peta.fitBounds(b, {padding: kiriPad(), duration: 700, maxZoom: nc ? 10 : 8});
    nanti(() => nc ? this.popupBmkg(k, c) : this.popupProv(S.gl.find(o => o.prov === k), c)); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    const tip = () => PI?.sembunyiTip();
    peta.on("mousemove", e => { if (!PI) return;
      const ada = id => peta.getLayer(id) && peta.queryRenderedFeatures(e.point, {layers: [id]})[0];
      const b = this.lihat("bmkg") && ada("bmkg-fill"), gl = !b && this.lihat("gelombang") && ada("gelombang");
      peta.getCanvas().style.cursor = b || gl ? "pointer" : "";
      if (b) return PI.tampilTip(this.kartuBmkg(S.nc[b.properties.i]), e.originalEvent);
      if (gl) return PI.tampilTip(this.kartuProv(S.gl.find(o => o.prov === gl.properties.kode)), e.originalEvent);
      const { lng, lat } = e.lngLat, r = S.sel.get((Math.floor(lat / .25) * .25 + .125).toFixed(3) + "," + (Math.floor(lng / .25) * .25 + .125).toFixed(3));
      r ? PI.tampilTip(this.kartuSel(r), e.originalEvent) : tip(); });
    peta.getCanvas().addEventListener("mouseleave", tip);
    peta.on("click", e => {
      const b = this.lihat("bmkg") && peta.queryRenderedFeatures(e.point, {layers: ["bmkg-fill"]})[0];
      if (b) return this.popupBmkg(b.properties.i, e.lngLat);
      const gl = this.lihat("gelombang") && peta.queryRenderedFeatures(e.point, {layers: ["gelombang"]})[0];
      if (gl) this.popupProv(S.gl.find(o => o.prov === gl.properties.kode), e.lngLat); }); },
};

/* ================================================================ panel kiri: peringatan BMKG yang berlaku */
let panelMode = "nc";
function renderPanel() {
  const rows = $("#rows"), nc = S.nc, gl = [...S.gl].sort((a, b) => b.lv - a.lv || b.total - a.total);
  $("#panelMode").innerHTML = `<button data-m="nc" aria-pressed="${panelMode === "nc"}">Nowcast ${nc.length}</button><button data-m="gl" aria-pressed="${panelMode === "gl"}">Gelombang ${gl.length}</button>`;
  rows.innerHTML = panelMode === "nc"
    ? nc.map((a, i) => `<button class="rw" data-nc="${i}"><span class="rw-hd">${pilSev(a.severity)}<b translate="no">${esc(a.event)}</b></span><span class="rw-wil" translate="no">${esc(a.wilayah)}</span><span class="rw-jam">${waktuBerlaku(a.mulai, a.selesai)}</span></button>`).join("")
    : gl.map(o => `<button class="rw" data-gl="${o.prov}"><span class="rw-hd">${pilGel(o.lv - 1)}<b translate="no">${esc(namaProv(o.prov))}</b></span><span class="rw-wil">${o.total} perairan</span></button>`).join("");
  if (!rows.innerHTML) rows.innerHTML = `<p class="kosong">Tidak ada peringatan yang berlaku.</p>`;
}
$("#panelMode").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; panelMode = b.dataset.m; renderPanel(); });
$("#rows").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.nc != null) Peta.fokus("nc", +b.dataset.nc); else if (b.dataset.gl) Peta.fokus("gl", b.dataset.gl); });

/* ================================================================ legenda dok */
const bar = (st, nilai) => `<div class="legscale">${nilai.map(v => `<i style="background:rgba(${gradasi(st, v).slice(0, 3).join(",")},1)"></i>`).join("")}</div><div class="legnum">${nilai.map(v => `<span>${v}</span>`).join("")}</div>`;
function renderLegenda() {
  const T = k => Peta.lihat(k);
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${S.mode === "hujan" ? `<div class="lbl">Hujan harian (mm)</div>${bar(ST_HUJAN, [1, 20, 50, 100, 150, 250])}` : ""}
    ${S.mode === "angin" ? `<div class="lbl">Embusan angin (km/jam)</div>${bar(ST_ANGIN, [25, 40, 54, 72, 90, 130])}` : ""}
    ${S.mode === "ens" ? `<div class="lbl">Peluang hujan ≥ 50 mm (ansambel)</div><div class="legscale">${["#bcd6f0", "#6aa7e3", "#7a4fc4", "#c9503a"].map(c => `<i style="background:${c}"></i>`).join("")}</div><div class="legnum"><span>10%</span><span>25%</span><span>50%</span><span>80%</span></div>` : ""}
    ${T("bmkg") && S.nc.length ? `<div class="lbl">Peringatan nowcast BMKG</div><div class="leg" style="margin:4px 0 8px">${Object.entries(WARNA_SEV).filter(([k]) => S.nc.some(a => a.severity === k)).map(([k, w]) => `<span><i class="sw" style="background:${w}"></i><span translate="no">${k}</span></span>`).join("")}</div>` : ""}
    ${T("gelombang") && S.gl.length ? `<div class="lbl">Gelombang BMKG Maritim</div><div class="leg" style="margin:4px 0 8px">${GEL.map((k, i) => S.gl.some(o => o.lv === i + 1) ? `<span><i class="sw" style="background:${k[3]}"></i>${k[1]} (${k[2]})</span>` : "").join("")}</div>` : ""}
    </div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }

/* ================================================================ kontrol */
function renderHari() {
  $("#hariSeg").innerHTML = `<div class="seg penuh" role="group" style="box-shadow:none">${hariTampil().map(i => `<button data-h="${i}" aria-pressed="${i === S.hari}">${labelHari(i)}</button>`).join("")}</div>`; }
$("#hariSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.hari = +b.dataset.h; renderHari(); Peta.segarkan(); });
$("#modePeta").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.mode = b.dataset.mp;
  $("#modePeta").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); Peta.segarkan(); });
$("#lapis").addEventListener("change", e => { const i = e.target.closest("input[data-l]"); if (!i || !peta) return; const k = i.dataset.l;
  const ids = {bmkg: ["bmkg-fill", "bmkg-line"], gelombang: ["gelombang"], satelit: ["satelit"]}[k] || [];
  ids.forEach(id => peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", i.checked ? "visible" : "none")); renderLegenda(); });
$("#lapisBtn").addEventListener("click", () => $("#lapis").classList.toggle("buka"));
$("#handle").addEventListener("click", () => $("#panel").classList.toggle("min"));
