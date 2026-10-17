/* sim_topo.js — peta topografi krem berkontur di mode forensik tab Simulasi (2D saja), meniru peta FireTrace.
   Mandiri: tidak mengubah sim_3d.js/index.html. Lapisan ditambah DI BAWAH lapisan sim; warna basemap positron diubah lewat
   setPaintProperty dan nilai aslinya disimpan untuk dikembalikan. Setelah setStyle (ganti tema) semuanya dipasang ulang.
   KEPUTUSAN TEMA: terang = topo krem penuh (latar, hutan berbintik, air, jalan, label); gelap = hanya kontur, kisi, puncak
   (warna basemap gelap tidak disentuh). Kontur: maplibre-contour dari DEM terrarium; interval menurut zoom DAN relief sekitar
   pusat peta. Pustaka gagal dimuat -> hillshade krem lembut sebagai cadangan, tanpa error. */
(() => {
if (typeof Sim === "undefined" || typeof maplibregl === "undefined") return;
const hal = document.getElementById("p-sim"); if (!hal) return;
const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const CDN = "https://cdn.jsdelivr.net/npm/maplibre-contour@0.1.1/dist/index.min.js";
const S = {on: false, m: null, asli: new Map(), ds: null, kunci: "", R: 30, ubin: "", lib: null, grid: null, rafG: 0, nyala: false};
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const ada = (m, id) => !!m.getLayer(id);
const ID = ["topo-kontur", "topo-indeks", "topo-kontur-lbl", "topo-puncak", "topo-hill"];

/* ---------- pustaka kontur (dimuat sekali, boleh gagal) ---------- */
function muatLib() {
  return S.lib || (S.lib = new Promise(res => {
    if (window.mlcontour) return res(window.mlcontour);
    const s = document.createElement("script"); s.src = CDN; s.async = true;
    s.onload = () => res(window.mlcontour || null); s.onerror = () => res(null); document.head.append(s);
  }));
}

/* ---------- relief sekitar pusat: ubin terrarium z9, p5..p95 (m) ---------- */
async function relief(m) {
  const c = m.getCenter(), n = 512, x = Math.floor((c.lng + 180) / 360 * n), r = c.lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n), u = `9/${x}/${y}`;
  if (u === S.ubin) return S.R;
  try {
    const bm = await createImageBitmap(await (await fetch(DEM.replace("{z}/{x}/{y}", u))).blob());
    const cv = document.createElement("canvas"); cv.width = bm.width; cv.height = bm.height;
    const g = cv.getContext("2d", {willReadFrequently: true}); g.drawImage(bm, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height).data, e = [];
    for (let i = 0; i < d.length; i += 64) { const h = d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768; if (h > 0.5) e.push(h); }
    e.sort((a, b) => a - b);
    S.R = e.length > 20 ? e[Math.floor(e.length * .95)] - e[Math.floor(e.length * .05)] : 30; S.ubin = u;
  } catch { /* jaringan gagal: pakai relief terakhir */ }
  return S.R;
}
/* interval garis tipis/indeks (m): gambut datar 2/10, gunung 50/250; makin jauh makin jarang */
function ambang(R) {
  const [a, b] = R < 20 ? [2, 10] : R < 60 ? [5, 25] : R < 150 ? [10, 50] : R < 400 ? [20, 100] : [50, 250];
  return {8: [a * 4, b * 4], 10: [a * 2, b * 2], 12: [a, b]};
}

/* ---------- warna basemap (terang saja) ---------- */
const KREM = [
  ["background", "background-color", "#f3eee2"], ["water", "fill-color", "#c3d2d6"], ["waterway", "line-color", "#a3bbc2"],
  ["park", "fill-color", "#e4e9d3"], ["landuse_residential", "fill-color", "#ebe4d3"],
  ["highway_path", "line-color", "#d3cbb9"], ["highway_minor", "line-color", "#cdc5b3"], ["highway_major_casing", "line-color", "#b9b19e"],
  ["highway_major_inner", "line-color", "#e0d9c9"], ["highway_motorway_casing", "line-color", "#b0a893"], ["highway_motorway_inner", "line-color", "#dad2bf"],
  ["highway_major_subtle", "line-color", "#d3ccbb"], ["highway_motorway_subtle", "line-color", "#d3ccbb"],
  ["waterway_line_label", "text-color", "#6f8c97"], ["water_name_point_label", "text-color", "#6f8c97"], ["water_name_line_label", "text-color", "#6f8c97"]];
const TEKS = ["label_other", "label_village", "label_town", "label_state", "label_city", "label_city_capital", "highway-name-minor", "highway-name-major", "highway-name-path"];
function ubah(m, id, p, v) { if (!ada(m, id)) return; const k = id + "|" + p; if (!S.asli.has(k)) S.asli.set(k, m.getPaintProperty(id, p)); m.setPaintProperty(id, p, v); }
function warnai(m) {
  for (const [id, p, v] of KREM) ubah(m, id, p, v);
  for (const id of TEKS) { ubah(m, id, "text-color", "#857e70"); ubah(m, id, "text-halo-color", "#f6f1e4"); }
  if (!m.hasImage("topo-hutan")) { /* hijau pucat berbintik, bintik acak berbenih tetap agar tidak berkedip */
    const n = 32, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d");
    g.fillStyle = "#dde7c8"; g.fillRect(0, 0, n, n); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) { g.fillStyle = r() < .5 ? "#bfd0a2" : "#cddbb3"; g.beginPath(); g.arc(2 + r() * 28, 2 + r() * 28, .8 + r() * 1.3, 0, 7); g.fill(); }
    m.addImage("topo-hutan", g.getImageData(0, 0, n, n)); }
  if (ada(m, "landcover_wood")) { ubah(m, "landcover_wood", "fill-pattern", "topo-hutan"); ubah(m, "landcover_wood", "fill-opacity", ["interpolate", ["linear"], ["zoom"], 5, .7, 12, 1]); }
}
function pulihkan(m) {
  for (const [k, v] of S.asli) { const [id, p] = k.split("|"); if (ada(m, id)) try { m.setPaintProperty(id, p, v ?? undefined); } catch { /* gaya sudah berganti */ } }
  S.asli.clear();
}

/* ---------- kontur / hillshade / puncak ---------- */
function posisi(m) { /* garis di bawah label basemap; label kontur & puncak di bawah lapis sim */
  const L = m.getStyle().layers, mine = l => /^(sim-|s3-|topo-)/.test(l.id);
  const atas = L.find(mine)?.id, simbol = L.find(l => l.type === "symbol" && !mine(l))?.id;
  return {garis: simbol || atas, label: atas};
}
function bersihKontur(m) { for (const l of ["topo-kontur", "topo-indeks", "topo-kontur-lbl", "topo-hill"]) if (ada(m, l)) m.removeLayer(l); for (const s of ["topo-kontur", "topo-dem"]) if (m.getSource(s)) m.removeSource(s); S.kunci = ""; }
async function pasangKontur(m) {
  const R = await relief(m); if (!S.on || S.m !== m) return;
  const th = ambang(R), kunci = JSON.stringify(th); if (kunci === S.kunci && m.getSource("topo-kontur")) return;
  const lib = await muatLib(); if (!S.on || S.m !== m) return;
  bersihKontur(m); const p = posisi(m), tr = gelap();
  if (!lib) { /* cadangan: hillshade krem lembut */
    m.addSource("topo-dem", {type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 13, attribution: "Medan © Mapzen, NASA SRTM, USGS"});
    m.addLayer({id: "topo-hill", type: "hillshade", source: "topo-dem", paint: {"hillshade-exaggeration": .35, "hillshade-shadow-color": tr ? "#000" : "#8a7a58", "hillshade-highlight-color": tr ? "#5a6a85" : "#fff"}}, p.garis);
    S.kunci = "hill"; return; }
  try {
    if (!S.ds) { S.ds = new lib.DemSource({url: DEM, encoding: "terrarium", maxzoom: 13, worker: true}); S.ds.setupMaplibre(maplibregl); }
    m.addSource("topo-kontur", {type: "vector", maxzoom: 15, attribution: "Medan © Mapzen, NASA SRTM, USGS",
      tiles: [S.ds.contourProtocolUrl({thresholds: th, contourLayer: "contours", elevationKey: "ele", levelKey: "level", overzoom: 1})]});
    const c = tr ? ["rgba(210,200,180,.28)", "rgba(225,215,195,.6)", "#e8dfc9", "#14120e"] : ["#cbbb9c", "#a8956f", "#8a7653", "#f6f1e4"];
    const ln = (id, lv, col, w) => m.addLayer({id, type: "line", source: "topo-kontur", "source-layer": "contours", minzoom: 8, filter: ["==", ["get", "level"], lv], layout: {"line-join": "round"},
      paint: {"line-color": col, "line-width": w}}, p.garis);
    ln("topo-kontur", 0, c[0], ["interpolate", ["linear"], ["zoom"], 8, .3, 14, .7]); ln("topo-indeks", 1, c[1], ["interpolate", ["linear"], ["zoom"], 8, .6, 14, 1.2]);
    m.addLayer({id: "topo-kontur-lbl", type: "symbol", source: "topo-kontur", "source-layer": "contours", minzoom: 10, filter: ["==", ["get", "level"], 1],
      layout: {"symbol-placement": "line", "text-field": ["concat", ["number-format", ["get", "ele"], {locale: "id-ID"}], " m"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-max-angle": 30},
      paint: {"text-color": c[2], "text-halo-color": c[3], "text-halo-width": 1.3}}, p.label);
    S.kunci = kunci;
  } catch { bersihKontur(m); }
}
function pasangPuncak(m) {
  const sembunyi = on => { if (ada(m, "s3-puncak")) m.setLayoutProperty("s3-puncak", "visibility", on ? "none" : "visible"); };
  if (!m.getSource("openmaptiles")) return;
  const tr = gelap(), col = tr ? "#d9d2c0" : "#7a6d57";
  if (!m.hasImage("topo-seg")) { const c = document.createElement("canvas"); c.width = c.height = 28; const g = c.getContext("2d"); g.fillStyle = col; g.strokeStyle = tr ? "#14120e" : "#f6f1e4"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(14, 4); g.lineTo(25, 24); g.lineTo(3, 24); g.closePath(); g.stroke(); g.fill(); m.addImage("topo-seg", g.getImageData(0, 0, 28, 28), {pixelRatio: 2}); }
  if (!ada(m, "topo-puncak")) m.addLayer({id: "topo-puncak", type: "symbol", source: "openmaptiles", "source-layer": "mountain_peak", minzoom: 8,
    filter: ["all", ["has", "name"], [">", ["to-number", ["get", "ele"], 0], 0]],
    layout: {"icon-image": "topo-seg", "icon-anchor": "bottom", "text-field": ["format", ["get", "name"], {}, "\n", {}, ["concat", ["number-format", ["to-number", ["get", "ele"], 0], {locale: "id-ID"}], " m"], {"font-scale": .88}],
      "text-font": ["Noto Sans Regular"], "text-size": 11.5, "text-anchor": "top", "text-offset": [0, .1], "symbol-sort-key": ["*", -1, ["to-number", ["get", "ele"], 0]]},
    paint: {"text-color": col, "text-halo-color": tr ? "#14120e" : "#f6f1e4", "text-halo-width": 1.4}}, posisi(m).label);
  sembunyi(true);
}

/* ---------- kisi lintang/bujur berlabel di tepi ---------- */
const LANGKAH = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const p2 = n => String(n).padStart(2, "0");
const dm = (mnt) => { const a = Math.round(Math.abs(mnt)), d = Math.floor(a / 60); return `${d}°${p2(a % 60)}'`; };
function gambarKisi() {
  S.rafG = 0; const m = S.m, el = S.grid; if (!m || !el) return;
  if (Math.abs(m.getBearing()) > .5 || m.getPitch() > .5) { el.replaceChildren(); return; }
  const b = m.getBounds(), w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
  const lebar = (b.getEast() - b.getWest()) * 60, tinggi = (b.getNorth() - b.getSouth()) * 60;
  const st = LANGKAH.find(s => lebar / s <= 7) || 600, sv = LANGKAH.find(s => tinggi / s <= 5) || 600;
  const tg = (a, s, fn) => { const o = []; for (let k = Math.ceil(a[0] * 60 / s); k * s <= a[1] * 60; k++) o.push(fn(k * s)); return o; };
  let ln = "", tx = "";
  const pil = (x, y, t, anc) => { const pw = t.length * 5.8 + 10, x0 = anc === "r" ? x - pw : x - pw / 2; return `<rect x="${x0.toFixed(1)}" y="${(y - 8).toFixed(1)}" width="${pw}" height="16" rx="4"/><text x="${(x0 + pw / 2).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle">${t}</text>`; };
  for (const mnt of tg([b.getWest(), b.getEast()], st, v => v)) {
    const x = m.project([mnt / 60, b.getCenter().lat]).x; ln += `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${h}"/>`;
    if (x > 70 && x < w - 70) tx += pil(x, 14, `${dm(mnt)} ${mnt >= 0 ? "BT" : "BB"}`); }
  for (const mnt of tg([b.getSouth(), b.getNorth()], sv, v => v)) {
    const y = m.project([b.getCenter().lng, mnt / 60]).y; ln += `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}"/>`;
    if (y > 40 && y < h - 120) tx += pil(w - 8, y, `${dm(mnt)} ${mnt >= 0 ? "LU" : "LS"}`, "r"); }
  el.innerHTML = `<g class="tk-g">${ln}</g><g class="tk-l">${tx}</g>`;
}
const jadwalKisi = () => { if (!S.rafG) S.rafG = requestAnimationFrame(gambarKisi); };
function pasangKisi(m) {
  if (S.grid) return;
  const el = S.grid = document.createElementNS("http://www.w3.org/2000/svg", "svg"); el.setAttribute("class", "topo-kisi"); el.setAttribute("aria-hidden", "true");
  m.getContainer().append(el); m.on("move", jadwalKisi); m.on("resize", jadwalKisi); jadwalKisi();
}
function lepasKisi(m) { if (!S.grid) return; m.off("move", jadwalKisi); m.off("resize", jadwalKisi); S.grid.remove(); S.grid = null; }

/* ---------- kondisi lahan nyata bergaya topo (terang saja): gambut, kawasan hutan, konsesi, kanal, jalan tanah, hutan hilang ---------- */
const kanvas = (n, gambar) => { const c = document.createElement("canvas"); c.width = c.height = n; gambar(c.getContext("2d"), n); return c; };
const dot = (g, x, y, r, w) => { g.fillStyle = w; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
const gar = (g, a, b, c, d, w, lw = 1) => { g.strokeStyle = w; g.lineWidth = lw; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
const POLA = { /* nama: [ukuran, gambar] */
  rawa: [16, (g, n) => { g.fillStyle = "rgba(190,175,120,.3)"; g.fillRect(0, 0, n, n); gar(g, 2, 5, 8, 5, "#8c7a45"); gar(g, 9, 13, 15, 13, "#8c7a45"); dot(g, 12, 5, .9, "#8c7a45"); dot(g, 4, 13, .9, "#8c7a45"); }],
  lindung: [10, (g, n) => { g.fillStyle = "rgba(120,170,100,.5)"; g.fillRect(0, 0, n, n); dot(g, 2.5, 2.5, 1.3, "#4f8a4a"); dot(g, 7.5, 7.5, 1.3, "#4f8a4a"); }],
  produksi: [12, (g, n) => { g.fillStyle = "rgba(195,218,155,.4)"; g.fillRect(0, 0, n, n); dot(g, 6, 6, 1.1, "#8fb270"); }],
  sawit: [12, (g, n) => { g.fillStyle = "rgba(235,220,170,.32)"; g.fillRect(0, 0, n, n); for (const x of [3, 9]) for (const y of [3, 9]) dot(g, x, y, 1, "#9a7a3a"); }],
  hti: [8, (g, n) => { g.fillStyle = "rgba(200,215,160,.3)"; g.fillRect(0, 0, n, n); gar(g, 0, 2, n, 2, "#7a9a5a"); gar(g, 0, 6, n, 6, "#7a9a5a"); }],
  tambang: [10, (g, n) => { g.fillStyle = "rgba(205,205,205,.35)"; g.fillRect(0, 0, n, n); gar(g, 0, n, n, 0, "#8f8f8f"); gar(g, -2, 2, 2, -2, "#8f8f8f"); gar(g, n - 2, n + 2, n + 2, n - 2, "#8f8f8f"); }]};
const swatch = k => POLA[k][0] && kanvas(POLA[k][0], POLA[k][1]).toDataURL();
const LEG = [["rawa", "Gambut"], ["lindung", "Hutan lindung"], ["produksi", "Hutan produksi"], ["sawit", "Sawit"], ["hti", "HTI"], ["tambang", "Tambang"], ["#e8a3bd", "Hutan hilang"], ["#2a5a8a", "Kanal"]];
async function data(k, u) {
  const c = typeof Lapis !== "undefined" ? Lapis.cache : null; if (c?.[k]) return c[k];
  const d = typeof muatJSON === "function" ? await muatJSON(u) : await (await fetch(u)).json(); if (c && !c[k]) c[k] = d; return d;
}
function bersihLahan(m) {
  for (const l of m.getStyle().layers.filter(l => l.id.startsWith("topo-l-"))) m.removeLayer(l.id);
  for (const k of Object.keys(m.getStyle().sources).filter(k => k.startsWith("topo-s-"))) m.removeSource(k);
  document.querySelector(".topo-leg")?.remove();
}
async function pasangLahan(m) {
  const [gb, kw, ks, lt, kn] = await Promise.all([["gambut", "data/lahan/gambut.geojson"], ["kawasan", "data/lahan/kawasan.geojson"], ["konsesi", "data/lahan/konsesi.geojson"],
    ["lapisan_tambahan", "data/lapisan_tambahan.json"], ["kanal", "data/kanal.json"]].map(([k, u]) => data(k, u).catch(() => null)));
  if (!S.on || S.m !== m || gelap()) return;
  for (const k in POLA) if (!m.hasImage("topo-" + k)) { const [n, f] = POLA[k]; m.addImage("topo-" + k, kanvas(n, f).getContext("2d").getImageData(0, 0, n, n)); }
  const tgt = ada(m, "waterway") ? "waterway" : posisi(m).garis, src = (id, d) => m.addSource("topo-s-" + id, {type: "geojson", data: d});
  const fl = (id, sr, pola, filter, op = .9) => m.addLayer({id: "topo-l-" + id, type: "fill", source: sr, ...(filter ? {filter} : {}), paint: {"fill-pattern": "topo-" + pola, "fill-opacity": op}}, tgt);
  const jt = (id, sr, warna, lebar, filter, dash, minzoom = 5) => m.addLayer({id: "topo-l-" + id, type: "line", source: sr, minzoom, ...(filter ? {filter} : {}), paint: {"line-color": warna, "line-width": lebar, ...(dash ? {"line-dasharray": dash} : {})}}, tgt);
  try {
    if (gb) { src("gambut", gb); fl("gambut", "topo-s-gambut", "rawa", null); }
    if (kw) { src("kawasan", kw); const L = ["in", ["get", "fungsi"], ["literal", ["HK", "HL", "THR"]]], P = ["in", ["get", "fungsi"], ["literal", ["HP", "HPT", "HPK"]]];
      fl("kw-l", "topo-s-kawasan", "lindung", L); fl("kw-p", "topo-s-kawasan", "produksi", P);
      jt("kw-gs", "topo-s-kawasan", "#4f8a4a", .9, null, [4, 2], 7); }
    if (ks) { src("konsesi", ks); const J = j => ["==", ["get", "jenis"], j];
      fl("ks-sawit", "topo-s-konsesi", "sawit", J("sawit")); fl("ks-hti", "topo-s-konsesi", "hti", J("hti")); fl("ks-tambang", "topo-s-konsesi", "tambang", J("tambang"));
      jt("ks-gs", "topo-s-konsesi", "#8a5a7a", .7, null, null, 7);
      m.addLayer({id: "topo-l-ks-nama", type: "symbol", source: "topo-s-konsesi", minzoom: 10, filter: ["has", "nama"], layout: {"text-field": ["get", "nama"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-max-width": 8},
        paint: {"text-color": "#7b5a6b", "text-halo-color": "#f6f1e4", "text-halo-width": 1.2}}, posisi(m).label); }
    if (kn?.grid) { src("kanal", {type: "FeatureCollection", features: kn.grid.map(([la, lo, km]) => ({type: "Feature", properties: {km}, geometry: {type: "Point", coordinates: [lo, la]}}))});
      m.addLayer({id: "topo-l-kanal-pita", type: "heatmap", source: "topo-s-kanal", maxzoom: 11, paint: {"heatmap-weight": ["interpolate", ["linear"], ["get", "km"], 0, 0, 20, 1], "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 30],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(42,90,138,0)", .3, "rgba(42,90,138,.35)", 1, "rgba(30,60,120,.8)"], "heatmap-opacity": .8}}, tgt); }
    if (ada(m, "waterway") || m.getSource("openmaptiles")) {
      const om = (id, filter, w, dash, mz) => m.addLayer({id: "topo-l-" + id, type: "line", source: "openmaptiles", "source-layer": id.startsWith("kanal") ? "waterway" : "transportation", minzoom: mz, filter,
        layout: {"line-cap": "butt"}, paint: {"line-color": id.startsWith("kanal") ? "#2a5a8a" : "#9a7650", "line-width": w, ...(dash ? {"line-dasharray": dash} : {})}}, posisi(m).garis);
      if (m.getSource("openmaptiles")) { om("kanal", ["in", ["get", "class"], ["literal", ["canal", "ditch", "drain"]]], ["interpolate", ["linear"], ["zoom"], 11, .5, 16, 1.4], null, 11);
        om("jalan-tanah", ["in", ["get", "class"], ["literal", ["track", "path"]]], ["interpolate", ["linear"], ["zoom"], 11, .6, 16, 1.3], [3, 2], 11); } }
    ubah(m, "waterway", "line-color", "#5f94bd"); ubah(m, "waterway", "line-width", ["interpolate", ["linear"], ["zoom"], 8, .5, 14, 1.8]);
    if (lt?.lapisan?.hilang) { const c = lt.lapisan.hilang, a = new Date().toISOString().slice(0, 10);
      m.addSource("topo-s-hilang", {type: "raster", tiles: c.tiles.map(t => t.replace("{mulai}", a).replace("{akhir}", a)), tileSize: c.tileSize, minzoom: c.minzoom, maxzoom: c.maxzoom, attribution: c.atribusi});
      m.addLayer({id: "topo-l-hilang", type: "raster", source: "topo-s-hilang", paint: {"raster-opacity": .55, "raster-fade-duration": 0}}, tgt); }
  } catch { bersihLahan(m); return; }
  const el = document.createElement("div"); el.className = "topo-leg";
  el.innerHTML = LEG.map(([k, n]) => `<span><i style="${k[0] === "#" ? `background:${k}` : `background-image:url(${swatch(k)})`}"></i>${n}</span>`).join("");
  m.getContainer().append(el);
}

/* ---------- pasang / lepas ---------- */
function pasang(m) {
  S.on = true; S.m = m;
  if (!gelap()) { warnai(m); pasangLahan(m); }
  pasangPuncak(m); pasangKisi(m); pasangKontur(m);
}
function lepas(m) {
  S.on = false; bersihLahan(m); pulihkan(m); bersihKontur(m);
  if (ada(m, "topo-puncak")) m.removeLayer("topo-puncak");
  if (ada(m, "s3-puncak")) m.setLayoutProperty("s3-puncak", "visibility", "visible");
  lepasKisi(m);
}
const mode2D = () => { const b = hal.querySelector('.s3-m [data-m="3d"]'); return !b || b.getAttribute("aria-pressed") !== "true"; };
function evaluasi() {
  const m = Sim.peta; if (!m) return;
  if (S.m !== m) { S.m = m; m.on("style.load", () => { S.asli.clear(); S.on = false; document.querySelector(".topo-leg")?.remove(); lepasKisi(m); S.kunci = ""; S.ubin = ""; evaluasi(); });
    m.on("moveend", () => { if (S.on) { const l = m.getLayer("s3-puncak"); if (l) m.setLayoutProperty("s3-puncak", "visibility", "none"); pasangKontur(m); } }); }
  if (!m.getLayer("sim-k") && !m.getLayer("sim-lahan")) { if (S.on) return; if (!m.isStyleLoaded()) return; } /* gaya baru belum diisi lapisan Sim */
  const mau = hal.classList.contains("s3f") && mode2D();
  if (mau && !S.on) pasang(m); else if (!mau && S.on) lepas(m);
}
let jt = 0; const tunda = () => { cancelAnimationFrame(jt); jt = requestAnimationFrame(evaluasi); };
new MutationObserver(tunda).observe(hal, {attributes: true, attributeFilter: ["class", "aria-pressed"], subtree: true});
const tunggu = setInterval(() => { if (Sim.peta) { clearInterval(tunggu); evaluasi(); } }, 700);
window.SimTopo = {ambang, evaluasi};
})();
