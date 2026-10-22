"use strict";
/* replay.js: layar Replay Banjir (public/banjir/replay.html). Data: data/replay/maret2025.json (+ .bin.gz dibuka di replay_kerja.js,
   + _cari.json lazy). Semua teks dari JSON disisipkan lewat textContent (tanpa HTML mentah dari data).
   INP: klik mengubah chrome dulu; terbang kamera dan isi kanvas sesudah dua requestAnimationFrame; dekode biner di worker. */
(() => {
const SG = window.SimGenangan;
const DIR = "data/replay/", ID = "maret2025";
const $ = s => document.querySelector(s);
const nf = (x, d = 0) => Number.isFinite(x) ? x.toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}) : "–";
const n1 = x => nf(x, Number.isInteger(x) ? 0 : 1);
/* rapikan teks dari data: "00:40" jadi "00.40", "Mar 3" jadi "3 Mar", "3x3" jadi "3 × 3", m3 jadi m³ */
const BL = "Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des";
const rapikan = t => String(t ?? "").replace(/\s*\((?:validasi|alur|penyetelan)\.[^)]*\)/g, "").replace(/\bl\d\d-l\d\d\b/g, "").replace(/\b(\d{1,2}):(\d{2})\b/g, "$1.$2").replace(new RegExp(`\\b(${BL})\\s+(\\d{1,2})\\b`, "g"), "$2 $1").replace(/\b(\d)\s?[x×]\s?(\d)\b/g, "$1 × $2").replace(/m3\/dtk/g, "m³/dtk");
const bersih = n => String(n || "").replace(/\s*\([^)]*\)/g, "").trim();
/* kedalaman model dibulatkan 10 cm; sejak 1 m dalam meter: "sekitar 5,1 m" */
const dalamBulat = cm => cm >= 100 ? `sekitar ${nf(Math.round(cm / 10) / 10, 1)} m` : `sekitar ${nf(Math.round(cm / 10) * 10)} cm`;
const tautan = (u, t) => el("a", {href: u, target: "_blank", rel: "noopener noreferrer", text: t});
const aman = u => /^https?:\/\//i.test(u || "") ? u : null;
function el(tag, a, ...kids) {
  const e = document.createElement(tag);
  if (a) for (const [k, v] of Object.entries(a)) { if (v == null || v === false) continue; if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const set = (e, v) => { if (e && e.textContent !== v) e.textContent = v; };
const kurang = matchMedia("(prefers-reduced-motion: reduce)").matches;
const dua2 = f => requestAnimationFrame(() => requestAnimationFrame(f));
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const AREA = [
  {n: "Ringkasan", c: [106.945, -6.26], z: 10.75, p: 58, b: -18},
  {n: "Pondok Gede Permai", c: [106.9705, -6.3015], z: 15.2, p: 62, b: -25},
  {n: "Jatiasih", c: [106.9523, -6.3055], z: 15, p: 60, b: 20},
  {n: "Bekasi Kota", c: [106.9946, -6.235], z: 14.7, p: 62, b: -30},
  {n: "Kampung Melayu", c: [106.8636, -6.2194], z: 15.2, p: 62, b: 25},
  {n: "Cawang", c: [106.8675, -6.2503], z: 15.2, p: 62, b: -20}];

const S = {t: 40, main: false, laju: 1, sDraw: -1, pin: null, B: null, map: null, lapis: {citra: true, gedung: true, genangan: true, hujan: true, kejadian: true, label: true},
  gedung: new Map(), basah: new Set(), rb: {}, lapTerbuka: null, ukuran: ""};
let meta, J, PJ, M0, serie = {}, kejadian = [], dpr = 1;

/* ---------- waktu ---------- */
const fT = t => { const d = new Date(M0 + t * 3600e3 + 7 * 3600e3); return d; };
const jamTeks = d => `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`;
const tglPendek = d => `${d.getUTCDate()} ${BLN[d.getUTCMonth()]}`;
const fmtT = t => { const d = fT(t); return `${HARI[d.getUTCDay()]} ${tglPendek(d)}, ${jamTeks(d)}`; };
const fmtS = s => fmtT(s);
const hariT = t => { const d = fT(t); return `${HARI[d.getUTCDay()]} ${tglPendek(d)}`; };
const tDari = iso => (Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + ":00+07:00") - M0) / 3600e3;
const jamBulat = t => fmtT(Math.floor(t));
const val = (a, s) => s < 1 ? 0 : a[Math.min(s, J) - 1];

/* ---------- data ---------- */
async function muatJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json(); }
function siapkanSeri() {
  const R = meta.ringkasan;
  serie.hujan = PJ.map((p, i) => p.mm_area_jam ?? R.mm_area_jam?.[i] ?? p.hujan_mm ?? 0);
  serie.luas = PJ.map(p => p.luas_km2 ?? 0);
  serie.gedung = PJ.map(p => p.gedung ?? 0);
  serie.sungai = PJ.map((p, i) => p.muka_sungai_m ?? R.muka_sungai_m?.[i] ?? p.pantau?.p2c ?? p.pantau?.kali_bekasi ?? 0);
  const maks = a => a.reduce((x, y) => y > x ? y : x, 0);
  serie.maks = {hujan: maks(serie.hujan), luas: maks(serie.luas), gedung: maks(serie.gedung), sungai: maks(serie.sungai)};
  serie.minSungai = serie.sungai.reduce((x, y) => y < x ? y : x, 0);
}
function siapkanKejadian() {
  const ev = [], P = (s, teks, extra) => ev.push({t: s, teks, jenis: "model", ...extra});
  const h = serie.hujan, iH = h.findIndex(v => v >= 2); if (iH >= 0) P(iH + 1, `Hujan mulai deras, ${nf(h[iH], 1)} mm/jam`);
  const iM = h.indexOf(serie.maks.hujan); if (serie.maks.hujan > 0) P(iM + 1, `Hujan terderas, ${nf(serie.maks.hujan, 1)} mm/jam`);
  for (const th of [1, 10, 50, 100, 200]) { const i = serie.luas.findIndex(v => v >= th); if (i >= 0) P(i + 1, `Lahan tergenang 10 cm atau lebih melewati ${nf(th)} km²`); }
  P(meta.ringkasan.jam_luas_puncak, `Genangan terluas, ${nf(meta.ringkasan.luas_puncak_km2, 1)} km²`);
  const iS = serie.sungai.indexOf(serie.maks.sungai); if (serie.maks.sungai > 0) P(iS + 1, `Air di alur Kali Bekasi (P2C) tertinggi, ${nf(serie.maks.sungai, 1)} m di atas dasar alur`);
  const lap = (meta.rujukan?.laporan_semua || []).filter(l => l.waktu).map(l => ({...l, t: tDari(l.waktu)})).filter(l => l.t >= 0 && l.t <= J);
  S.laporan = lap;
  const pilih = lap.slice().sort((a, b) => (b.kedalaman_cm || 0) - (a.kedalaman_cm || 0)).slice(0, 14);
  for (const l of pilih) ev.push({t: l.t, jenis: "lap", teks: `${bersih(l.nama)}: dilaporkan banjir${l.kedalaman_cm ? `, ${nf(l.kedalaman_cm)} cm` : ""}`, lap: l});
  for (const p of (meta.rujukan?.linimasa_pos || []).filter(p => /^siaga 1|^awas/i.test(p.status || "")).slice(0, 4)) { const t = tDari(p.waktu_wib); if (t >= 0 && t <= J) ev.push({t, jenis: "lap", teks: rapikan(`${p.pos}: ${p.status}`)}); }
  const dm = meta.rujukan?.dampak?.[0]; if (dm) { const m = /(\d+) Mar(?:\w*)?\s+(\d\d):(\d\d)/.exec(dm.sumber || ""), t = m ? tDari(`2025-03-${m[1].padStart(2, "0")}T${m[2]}:${m[3]}`) : J; ev.push({t: Math.min(J, Math.max(0, t)), jenis: "lap", teks: rapikan(dm.isi), sub: rapikan(dm.sumber)}); }
  ev.sort((a, b) => a.t - b.t); kejadian = ev;
}

/* ---------- genangan: kanvas halus HR x HR diisi di worker (replay_kerja.js), utas utama hanya putImageData ---------- */
const KISI = 400, SC = 4, HR = KISI * SC, dep = new Uint16Array(KISI * KISI);
const cv = Object.assign(document.createElement("canvas"), {width: HR, height: HR}), cx = cv.getContext("2d");
S.bufs = [new ArrayBuffer(HR * HR * 4)]; S.sGambar = -2; S.minta = -1; S.sibuk = false; S.ukur = {gambar: [], taruh: []};
/* dep (cm per sel, kisi kasar) untuk gedung dan pin; kanvas halus diminta dari worker, satu permintaan sekaligus, hanya jam terakhir yang diminta */
function isiKanvas(s) {
  dep.fill(0);
  if (S.B && s >= 1) { const {indeks: ix, jam} = S.B, M = ix.length, base = (s - 1) * M; for (let m = 0; m < M; m++) dep[ix[m]] = jam[base + m]; }
  S.minta = s; mintaGambar();
}
function mintaGambar() {
  if (S.sibuk || !S.pekerja || !S.B || S.minta === S.sGambar || !S.bufs.length) return;
  S.sibuk = true; const b = S.bufs.pop(); S.pekerja.postMessage({gambar: true, s: S.minta, buf: b}, [b]);
}
function terimaGambar(d) {
  const t = performance.now(); cx.putImageData(new ImageData(new Uint8ClampedArray(d.buf), HR, HR), 0, 0); S.bufs.push(d.buf);
  const sc = S.map?.getSource("air"); if (sc && !S.jeda) { S.jeda = true; sc.play(); S.map.once("render", () => { S.jeda = false; sc.pause(); }); }
  S.ukur.taruh.push(performance.now() - t); S.ukur.gambar.push(d.dt); S.sGambar = d.s; S.sibuk = false; mintaGambar();
}

/* ---------- peta ---------- */
const OMT = "https://tiles.openfreemap.org/planet";
function gayaPeta() {
  const lab = (id, extra) => ({type: "symbol", source: "omt", layout: {"text-font": ["Noto Sans Bold"], "text-transform": "uppercase", "text-letter-spacing": .06, "text-max-width": 8, ...extra.layout}, paint: {"text-color": "#fff", "text-halo-color": "rgba(20,20,20,.85)", "text-halo-width": 1.5}, id, ...extra.top});
  return {version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {sat: {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar"},
      dem: {type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 13, attribution: "Medan © Mapzen, NASA SRTM"},
      omt: {type: "vector", url: OMT, attribution: "© OpenFreeMap © OpenStreetMap" + (meta.lisensi_dem ? `, model medan ${meta.lisensi_dem.nama} (Hawker dkk. 2022), ${meta.lisensi_dem.lisensi}` : "")}},
    terrain: {source: "dem", exaggeration: 1.15},
    layers: [{id: "latar", type: "background", paint: {"background-color": "#c9d0d2"}}, {id: "sat", type: "raster", source: "sat"},
      {id: "bangunan", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13, paint: {"fill-extrusion-color": "#e6d9bd", "fill-extrusion-opacity": .92,
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0]}},
      lab("l-tempat", {top: {"source-layer": "place", filter: ["in", ["get", "class"], ["literal", ["city", "town", "suburb", "village", "quarter", "neighbourhood"]]], minzoom: 9},
        layout: {"text-field": ["coalesce", ["get", "name:id"], ["get", "name"]], "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 15, 15]}}),
      lab("l-jalan", {top: {"source-layer": "transportation_name", minzoom: 14.5}, layout: {"symbol-placement": "line", "text-font": ["Noto Sans Regular"], "text-field": ["coalesce", ["get", "name:id"], ["get", "name"]], "text-size": 11, "text-letter-spacing": .02}})]};
}
function bangunPeta() {
  const K = meta.kisi, a = AREA[0];
  const m = S.map = new maplibregl.Map({container: "peta", style: gayaPeta(), center: a.c, zoom: a.z, pitch: a.p, bearing: a.b, maxPitch: 75, attributionControl: {compact: true}, fadeDuration: 0});
  m.addControl(new maplibregl.NavigationControl({visualizePitch: true}), "bottom-right");
  /* MapLibre membuka atribusi ringkas saat muat bila peta lebar; video hanya menampilkan tombol (i) */
  m.once("idle", () => document.querySelector("#peta .maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
  m.on("load", () => {
    m.addSource("air", {type: "canvas", canvas: cv, coordinates: K.sudut_lonlat, animate: false});
    m.addLayer({id: "air", type: "raster", source: "air", paint: {"raster-opacity": 1, "raster-fade-duration": 0, "raster-resampling": "linear"}}, "bangunan");
    m.addSource("gb", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "c"});
    m.addLayer({id: "gb", type: "fill-extrusion", source: "gb", minzoom: 13, paint: {"fill-extrusion-color": ["case", ["boolean", ["feature-state", "b"], false], "#f0a45d", "#e6d9bd"], "fill-extrusion-opacity": .92,
      "fill-extrusion-height": ["coalesce", ["get", "h"], 6], "fill-extrusion-base": ["coalesce", ["get", "h0"], 0]}}, "l-tempat");
    m.addSource("lap", {type: "geojson", data: {type: "FeatureCollection", features: (S.laporan || []).filter(l => l.lat != null && l.lon != null).map((l, i) => ({type: "Feature", properties: {k: i, t: l.t}, geometry: {type: "Point", coordinates: [l.lon, l.lat]}}))}});
    m.addLayer({id: "lap-titik", type: "circle", source: "lap", minzoom: 13, filter: ["<=", ["get", "t"], S.t], paint: {"circle-radius": 5, "circle-color": "#cc3a2f", "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
    m.on("click", e => { if (m.queryRenderedFeatures(e.point, {layers: ["lap-titik"]}).length) return; pasPin(e.lngLat.lat, e.lngLat.lng, {}); });
    m.on("click", "lap-titik", e => { const l = S.laporan.filter(l => l.lat != null)[e.features[0].properties.k]; if (l) tampilLaporan(l, true); });
    m.on("mouseenter", "lap-titik", () => m.getCanvas().style.cursor = "pointer"); m.on("mouseleave", "lap-titik", () => m.getCanvas().style.cursor = "");
    let tm; m.on("idle", () => { clearTimeout(tm); tm = setTimeout(() => dua2(panenGedung), 200); });
    terapkanLapis(); isiKanvas(Math.floor(S.t)); S.sDraw = Math.floor(S.t); pasangTerdalam(); pasangKartuLaporan();
    const q = new URLSearchParams(location.search), la = (q.get("lat") || "").trim(), lo = (q.get("lon") || "").trim(); if (la && lo) pasPin(+la, +lo, {terbang: true});
  });
}
function terbang(c, z, p, b) { dua2(() => S.map?.flyTo({center: c, zoom: z, pitch: p, bearing: b, duration: kurang ? 0 : 1600, essential: true})); }
/* gedung di sel >= 10 cm jadi oranye: lapisan kedua dari geojson gedung yang sedang terlihat (id = nomor sel, feature-state per sel).
   Lebih ringan daripada menyaring tiap bingkai: hanya selisih sel yang berganti status per jam yang memanggil setFeatureState. */
function panenGedung() {
  const m = S.map; if (!m || m.getZoom() < 13.2 || !m.getLayer("bangunan")) return; let baru = 0;
  if (S.gedung.size > 16000) { S.gedung.clear(); S.basah.clear(); baru = 1; } /* kosongkan SEBELUM menambah */
  for (const f of m.queryRenderedFeatures({layers: ["bangunan"]})) { const g = f.geometry, p = g.type === "Polygon" ? g.coordinates[0][0] : g.type === "MultiPolygon" ? g.coordinates[0][0][0] : null; if (!p) continue;
    const key = p[0].toFixed(5) + "," + p[1].toFixed(5); if (S.gedung.has(key)) continue;
    const [fi, fj] = SG.keSel(meta.kisi, p[0], p[1]), i = Math.round(fi), j = Math.round(fj); if (i < 0 || j < 0 || i >= KISI || j >= KISI) continue;
    S.gedung.set(key, {type: "Feature", properties: {c: j * KISI + i, h: f.properties.render_height, h0: f.properties.render_min_height}, geometry: g}); baru++; }
  if (!baru) return; /* koleksi tak berubah: tidak setData ulang */
  m.getSource("gb").setData({type: "FeatureCollection", features: [...S.gedung.values()]}); S.basah.clear(); setTimeout(terapkanGedung, 60);
}
function terapkanGedung() {
  const m = S.map; if (!m?.getSource("gb") || !S.gedung.size) return; const cel = new Set(); for (const f of S.gedung.values()) cel.add(f.properties.c);
  for (const c of cel) { const b = dep[c] >= 10; if (b !== S.basah.has(c)) { m.setFeatureState({source: "gb", id: c}, {b}); b ? S.basah.add(c) : S.basah.delete(c); } }
}
function terapkanLapis() {
  const m = S.map; if (!m?.getLayer("air")) return; const L = S.lapis, v = (id, on) => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  v("sat", L.citra); v("air", L.genangan); v("bangunan", L.gedung); v("gb", L.gedung); v("lap-titik", L.kejadian); v("l-tempat", L.label); v("l-jalan", L.label);
  for (const k of ["mkDalam", "mkLap"]) if (S[k]) S[k].getElement().style.display = L.kejadian ? "" : "none";
  kartuLaporanWaktu();
  gambarDasar(); gambarLini(); gambarKecilSemua();
}

/* ---------- penanda ---------- */
function penanda(kelas, judul, sub) { const e = el("div", {class: "mk " + kelas}, el("div", {class: "kt"}, el("b", {text: judul}), el("small", {text: sub})), el("div", {class: "tg"}), el("div", {class: "tt"})); return e; }
function pasangMarker(e, lon, lat, offset) { return new maplibregl.Marker({element: e, anchor: "bottom", offset: offset || [0, 6]}).setLngLat([lon, lat]).addTo(S.map); }
/* jumlah jam sel >= 10 cm (0 bila sel tak pernah basah); indeks terurut, jadi cari biner */
function jam10(c) { const ix = S.B.indeks, M = ix.length; let lo = 0, hi = M - 1, m = -1;
  while (lo <= hi) { const md = (lo + hi) >> 1; if (ix[md] === c) { m = md; break; } ix[md] < c ? lo = md + 1 : hi = md - 1; }
  let n = 0; if (m >= 0) for (let s = 0; s < J; s++) if (S.B.jam[s * M + m] >= 10) n++; return n; }
/* "Genangan terdalam": bukan sel alur dan bukan sungai/kolam permanen (>= 10 cm lebih dari 80 jam); tak ada yang lolos = kartu disembunyikan */
function pasangTerdalam() {
  if (!S.B || !S.map?.getLayer("air") || S.mkDalam !== undefined) return;
  const L = meta.genangan_terdalam || meta.ringkasan.genangan_terdalam || [], p = L.find(x => !x.di_alur && jam10(x.j * KISI + x.i) <= 80); S.mkDalam = null; if (!p) return;
  const [lon, lat] = p.lonlat || SG.dariSel(meta.kisi, p.i, p.j);
  S.mkDalam = pasangMarker(penanda("dalam", `Genangan terdalam (model): ${dalamBulat(p.cm)}`, fmtS(p.s)), lon, lat); terapkanLapis();
}
/* kartu laporan tetap: paling banyak 3, hanya laporan di kisi dengan kedalaman tercatat, saling berjarak 5 km; muncul sesudah waktunya */
function pasangKartuLaporan() {
  if (S.kartuLap) return; const di = new Set((meta.validasi.laporan || []).filter(v => v.di_kisi).map(v => v.id)), kx = 110000;
  const cand = (S.laporan || []).filter(l => l.lat != null && l.kedalaman_cm > 0 && di.has(l.id)).sort((a, b) => b.kedalaman_cm - a.kedalaman_cm), pil = [];
  for (const l of cand) { if (pil.every(p => Math.hypot((p.lon - l.lon) * kx, (p.lat - l.lat) * kx) > 5000)) pil.push(l); if (pil.length >= 3) break; }
  S.kartuLap = pil.map(l => ({l, mk: pasangMarker(penanda("lap", `${bersih(l.nama)}: dilaporkan banjir`, `${rapikan(l.media || "Laporan").slice(0, 44)}, ${tglPendek(fT(l.t))}`), l.lon, l.lat)}));
  terapkanLapis(); kartuLaporanWaktu();
}
function kartuLaporanWaktu() { for (const k of S.kartuLap || []) k.mk.getElement().style.visibility = S.lapis.kejadian && S.t >= k.l.t ? "" : "hidden"; }
function tampilLaporan(l, klik) {
  if (S.mkLap) S.mkLap.remove(); S.lapTerbuka = l;
  const rm = rapikan(l.media || "Laporan").slice(0, 44), d = fT(l.t);
  S.mkLap = pasangMarker(penanda("lap", `${bersih(l.nama)}: dilaporkan banjir`, `${rm}, ${tglPendek(d)}`), l.lon, l.lat);
  if (!S.lapis.kejadian) S.mkLap.getElement().style.display = "none"; if (klik) S.map.easeTo({center: [l.lon, l.lat], duration: kurang ? 0 : 600});
}
/* ---------- pencarian ---------- */
function muatCari() { return S.cariP ||= muatJSON(DIR + ID + "_cari.json").then(c => { c.rendah = c.baris.map(r => r[0].toLowerCase()); S.cari = c; return c; }); }
function cariCocok(q) {
  const c = S.cari, tk = q.toLowerCase().split(/\s+/).filter(Boolean), awal = [], isi = [], lihat = new Set();
  if (!tk.length) return [];
  for (let k = 0; k < c.rendah.length && awal.length < 8; k++) { const n = c.rendah[k]; if (!tk.every(t => n.includes(t))) continue;
    const r = c.baris[k], key = r[0] + "|" + r[4]; if (lihat.has(key)) continue; lihat.add(key); (n.startsWith(tk[0]) ? awal : isi).push(r); }
  return awal.concat(isi).slice(0, 8);
}
const kelTeks = r => [r[4] >= 0 ? S.cari.wilayah[r[4]] : null, S.cari.wilayah[r[5]]].filter(Boolean).join(", ");
function bangunCari() {
  const inp = $("#cari"), ul = $("#hasil"); let sel = -1, daftar = [];
  const tutup = () => { ul.hidden = true; inp.setAttribute("aria-expanded", "false"); sel = -1; };
  const gambar = () => { ul.replaceChildren(...daftar.map((r, i) => el("li", {role: "option", "aria-selected": i === sel ? "true" : "false", onmousedown: e => { e.preventDefault(); pilih(r); }}, r[0], el("small", {text: kelTeks(r)}))));
    ul.hidden = !daftar.length; inp.setAttribute("aria-expanded", String(!!daftar.length)); };
  const pilih = r => { inp.value = r[0]; tutup(); pasPin(r[3], r[2], {nama: r[0], kel: kelTeks(r), terbang: true}); inp.blur(); };
  inp.addEventListener("focus", () => muatCari());
  inp.addEventListener("input", async () => { const v = inp.value.trim(); if (v.length < 2) { daftar = []; return gambar(); } await muatCari(); if (inp.value.trim() === v) { daftar = cariCocok(v); sel = -1; gambar(); } });
  inp.addEventListener("keydown", e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (daftar.length) { sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + daftar.length) % daftar.length; gambar(); } }
    else if (e.key === "Enter" && daftar.length) { e.preventDefault(); pilih(daftar[Math.max(0, sel)]); } else if (e.key === "Escape") tutup(); });
  inp.addEventListener("blur", () => setTimeout(tutup, 120));
}

/* ---------- tempat dipin ---------- */
function terdekat(lat, lon) {
  const c = S.cari; if (!c) return null; let best = null, bd = 1e9; const kx = Math.cos(lat * Math.PI / 180) * 111320;
  for (const r of c.baris) { const dx = (r[2] - lon) * kx, dy = (r[3] - lat) * 110574; if (Math.abs(dx) > 300 || Math.abs(dy) > 300) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = r; } }
  return best;
}
function pasPin(lat, lon, o) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
  const [fi, fj] = SG.keSel(meta.kisi, lon, lat), i = Math.round(fi), j = Math.round(fj), dalam = i >= 0 && j >= 0 && i < KISI && j < KISI, c = dalam ? j * KISI + i : -1;
  const P = S.pin = {lat, lon, c, nama: o.nama || "Titik di peta", kel: o.kel || `${nf(lat, 4)}; ${nf(lon, 4)}`, dalam};
  bangunPin(); $("#pin").hidden = false; S.mkPin?.remove();
  S.mkPin = pasangMarker(el("div", {class: "tiang"}, el("i")), lon, lat, [0, 5]);
  segarPin(true);
  if (!o.nama) muatCari().then(() => { if (S.pin !== P) return; const r = terdekat(lat, lon); if (r) { P.nama = r[0]; P.kel = kelTeks(r); bangunPin(); segarPin(true); } }).catch(() => {});
  if (o.terbang) terbang([lon, lat], Math.max(S.map.getZoom(), 16.2), 62, S.map.getBearing());
}
function bangunPin() {
  const P = S.pin, R = S.pr = {}, box = $("#pin");
  box.replaceChildren(
    el("button", {class: "tutup", "aria-label": "Tutup", onclick: tutupPin}, svg("M6 6l12 12M18 6L6 18")),
    el("div", {class: "k", text: "TEMPAT DIPIN"}), el("h3", {text: P.nama}), el("div", {class: "kel", text: P.kel}),
    R.besar = el("div", {class: "besar"}), R.grafik = (() => { const c = el("canvas"); roC.observe(c); return c; })(),
    R.dl = el("dl"),
    el("p", {class: "cat", text: P.dalam ? "Perkiraan model untuk petak 60 m di sekitar titik ini. Bukan pengukuran." : "Titik ini di luar kisi model (24 km), jadi tidak ada angka genangan."}),
    el("div", {class: "aksi"}, P.dalam ? (R.btn = el("button", {class: "gelap", text: "Ke genangan tertinggi", onclick: keTertinggi})) : null, el("button", {text: "Salin tautan", onclick: e => salin(e.currentTarget)})));
}
const svg = d => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "ikon"); const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.append(p); return s; };
function tutupPin() { S.pin = null; $("#pin").hidden = true; S.mkPin?.remove(); S.mkPin = null; }
function seriPin() { const P = S.pin; if (!S.B || !P?.dalam) return null; if (P.seri) return P.seri; const ix = S.B.indeks, M = ix.length; let lo = 0, hi = M - 1, m = -1;
  while (lo <= hi) { const md = (lo + hi) >> 1; if (ix[md] === P.c) { m = md; break; } ix[md] < P.c ? lo = md + 1 : hi = md - 1; }
  const a = new Uint16Array(J + 1); if (m >= 0) for (let s = 1; s <= J; s++) a[s] = S.B.jam[(s - 1) * M + m]; return P.seri = a; }
function segarPin(penuh) {
  const P = S.pin, R = S.pr; if (!P || !R) return; const s = Math.max(0, Math.min(J, Math.floor(S.t))), a = seriPin();
  if (!P.dalam) { R.besar.replaceChildren(); R.grafik.style.display = "none"; R.dl.replaceChildren(); return; }
  if (!a) { R.besar.replaceChildren(el("span", {text: "Menunggu data genangan"})); return; }
  const d = a[s], txt = `${nf(d)} cm`; if (penuh || R.dv !== d || R.ds !== s) { R.dv = d; R.ds = s; R.besar.replaceChildren(txt, el("span", {text: `air pada ${jamBulat(S.t)}`})); }
  if (penuh) { const hm = S.B.hmaks[P.c], jh = S.B.jamHmaks[P.c]; let n10 = 0; for (let k = 1; k <= J; k++) if (a[k] >= 10) n10++; P.jh = hm >= 1 ? jh : 0; if (R.btn) R.btn.hidden = !P.jh;
    R.dl.replaceChildren(...[["Genangan tertinggi", hm >= 1 ? `${dalamBulat(hm)}, ${fmtS(jh).replace(",", "")}` : "Tidak ada"], ["Jam dengan 10 cm atau lebih", `${nf(n10)} jam`], ["Tinggi tanah", `sekitar ${nf(Math.round(S.B.dem[P.c] / 10))} m di atas laut`]].flatMap(([k, v]) => [el("dt", {text: k}), el("dd", {text: v})])); }
  gambarPin(a);
}
function gambarPin(a) {
  const c = S.pr.grafik, {w, h} = uk(c); if (!w) return; if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  let mx = 20; for (let k = 1; k <= J; k++) if (a[k] > mx) mx = a[k]; mx *= 1.1; const b = h - 13, X = t => t / J * w, Y = v => b - v / mx * (b - 4);
  g.beginPath(); g.moveTo(X(0), b); for (let k = 0; k <= J; k++) g.lineTo(X(k), Y(a[k])); g.lineTo(X(J), b); g.closePath(); g.fillStyle = "#e3edf6"; g.fill();
  g.beginPath(); for (let k = 0; k <= J; k++) k ? g.lineTo(X(k), Y(a[k])) : g.moveTo(X(k), Y(a[k])); g.strokeStyle = "#1f6fb2"; g.lineWidth = 1.5; g.stroke();
  g.setLineDash([3, 3]); g.strokeStyle = "#e8892a"; g.beginPath(); g.moveTo(0, Y(10)); g.lineTo(w, Y(10)); g.stroke(); g.setLineDash([]);
  g.fillStyle = "#d97a1f"; g.font = "10px Inter,system-ui,sans-serif"; g.textBaseline = "bottom"; g.fillText("10 cm", 2, Y(10) - 2);
  g.fillStyle = "#7d7869"; g.textBaseline = "alphabetic"; for (let d = 0; d < J / 24; d++) g.fillText(HARI[fT(d * 24 + 12).getUTCDay()], X(d * 24 + 12) - 8, h - 1);
  const x = X(Math.max(0, Math.min(J, S.t))); g.strokeStyle = "#262420"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, b); g.stroke();
}
function keTertinggi() { if (!S.pin?.jh) return; berhenti(); setT(S.pin.jh); }
function salin(btn) { const P = S.pin; if (!P) return; const u = `${location.origin}/banjir/replay?lat=${P.lat.toFixed(5)}&lon=${P.lon.toFixed(5)}&t=${S.t.toFixed(1)}`;
  const ok = () => { btn.textContent = "Tautan tersalin"; setTimeout(() => btn.textContent = "Salin tautan", 1600); };
  (navigator.clipboard?.writeText(u).then(ok, () => window.prompt("Salin tautan ini", u)) ?? window.prompt("Salin tautan ini", u)); }

/* ---------- linimasa dan grafik kecil ---------- */
const LC = $("#cvLini"), ADA = {}, PAD = 14;
const bufDasar = {}, UKM = new Map(), uk = c => UKM.get(c) || {w: c.clientWidth, h: c.clientHeight};
const roC = new ResizeObserver(es => { for (const e of es) UKM.set(e.target, {w: e.contentRect.width, h: e.contentRect.height}); if (!S.roJ) { S.roJ = true; requestAnimationFrame(() => { S.roJ = false; ukuranBerubah(); }); } });
function ukur(c) { const {w, h} = uk(c); if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); return true; } return false; }
function gambarDasar() {
  const {w, h} = uk(LC); if (!w || !h) return; ukur(LC);
  const b = bufDasar.lini = bufDasar.lini || document.createElement("canvas"); b.width = LC.width; b.height = LC.height; const g = b.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = w - PAD * 2, X = t => PAD + t / J * W, base = h - 20, atas = 6;
  g.fillStyle = "#efebe0"; for (let d = -1; d <= J / 24; d++) { const a = Math.max(0, d * 24 + 18), z = Math.min(J, d * 24 + 30); if (z > a) g.fillRect(X(a), 0, X(z) - X(a), base); }
  if (S.lapis.hujan) { g.fillStyle = "#a9b2bd"; const bw = Math.max(1, W / J - 1), mk = serie.maks.hujan || 1; for (let s = 1; s <= J; s++) { const v = serie.hujan[s - 1]; g.fillRect(X(s - 1) + .5, 14, bw, v / mk * 30); } }
  const mx = serie.maks.luas || 1, Y = v => base - v / mx * (base - 40); g.beginPath(); g.moveTo(X(0), base); for (let s = 1; s <= J; s++) g.lineTo(X(s), Y(serie.luas[s - 1])); g.lineTo(X(J), base); g.closePath();
  const gr = g.createLinearGradient(0, 40, 0, base); gr.addColorStop(0, "rgba(31,111,178,.55)"); gr.addColorStop(1, "rgba(31,111,178,.1)"); g.fillStyle = gr; g.fill();
  g.beginPath(); for (let s = 1; s <= J; s++) s > 1 ? g.lineTo(X(s), Y(serie.luas[s - 1])) : g.moveTo(X(s), Y(serie.luas[s - 1])); g.strokeStyle = "#1f6fb2"; g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = "#cfc8b6"; g.lineWidth = 1; g.beginPath(); g.moveTo(PAD, base + .5); g.lineTo(PAD + W, base + .5); g.stroke();
  g.fillStyle = "#6f6a5d"; g.font = "11px Inter,system-ui,sans-serif"; g.textBaseline = "alphabetic"; for (let d = 0; d < J / 24; d++) g.fillText(hariT(d * 24 + 12), X(d * 24) + 2, h - 3);
  if (S.lapis.kejadian) for (const e of kejadian) { g.beginPath(); g.fillStyle = e.jenis === "lap" ? "#cc3a2f" : "#1f6fb2"; g.arc(X(e.t), 6, 3, 0, 7); g.fill(); }
}
function gambarLini() {
  const {w, h} = uk(LC); if (!w || !bufDasar.lini) return; const g = LC.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LC.width, LC.height); g.drawImage(bufDasar.lini, 0, 0);
  g.setTransform(dpr, 0, 0, dpr, 0, 0); const x = PAD + Math.max(0, Math.min(J, S.t)) / J * (w - PAD * 2), y = h - 20;
  g.strokeStyle = "#111"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y + 2); g.stroke(); g.beginPath(); g.fillStyle = "#fff"; g.arc(x, y + 7, 4, 0, 7); g.fill(); g.stroke();
  LC.setAttribute("aria-valuenow", String(Math.round(S.t))); LC.setAttribute("aria-valuetext", fmtT(S.t));
}
const KECIL = {Hujan: {k: "hujan", w: "#8b95a3", isi: false, id: "cvHujan", n: "nHujan", f: v => `${nf(v, 1)} mm/jam`},
  Luas: {k: "luas", w: "#1f6fb2", isi: "rgba(31,111,178,.2)", id: "cvLuas", n: "nLuas", f: v => `${nf(v, 1)} km²`},
  Gedung: {k: "gedung", w: "#e8892a", isi: "rgba(232,137,42,.2)", id: "cvGedung", n: "nGedung", f: v => nf(v)},
  Sungai: {k: "sungai", w: "#1f6fb2", isi: "rgba(31,111,178,.12)", id: "cvSungai", n: "nSungai", f: v => `${nf(v, 1)} m`}};
function gambarKecilSemua() { for (const q of Object.values(KECIL)) { const c = $("#" + q.id), {w, h} = uk(c); if (!w) continue; ukur(c); const b = q.buf = q.buf || document.createElement("canvas"); b.width = c.width; b.height = c.height;
  const g = b.getContext("2d"), a = serie[q.k]; g.setTransform(dpr, 0, 0, dpr, 0, 0); if (q.k === "hujan" && !S.lapis.hujan) { gambarKecil(q); continue; }
  const lo = q.k === "sungai" ? Math.min(0, serie.minSungai) : 0, hi = (serie.maks[q.k] || 1), X = i => i / (J - 1) * w, Y = v => h - 2 - (v - lo) / (hi - lo || 1) * (h - 5);
  g.beginPath(); a.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); if (q.isi) { g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = q.isi; g.fill(); g.beginPath(); a.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); }
  g.strokeStyle = q.w; g.lineWidth = 1.3; g.stroke(); gambarKecil(q); } }
function gambarKecil(q) { const c = $("#" + q.id), g = c.getContext("2d"), {w, h: ch} = uk(c); if (!q.buf) return; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(q.buf, 0, 0);
  g.setTransform(dpr, 0, 0, dpr, 0, 0); const x = (Math.max(1, Math.min(J, S.t)) - 1) / (J - 1) * w; g.strokeStyle = "#262420"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); }

/* ---------- waktu: setT, segar, putar ---------- */
function setT(t) { S.t = Math.max(0, Math.min(J, t)); if (!S.sched) { S.sched = true; requestAnimationFrame(() => { S.sched = false; segar(); }); } }
function segar() {
  const t = S.t, s = Math.floor(t);
  set($("#jam"), jamBulat(t)); set($("#nHujan"), KECIL.Hujan.f(val(serie.hujan, s))); set($("#nLuas"), KECIL.Luas.f(val(serie.luas, s))); set($("#nGedung"), KECIL.Gedung.f(val(serie.gedung, s))); set($("#nSungai"), KECIL.Sungai.f(val(serie.sungai, s)));
  set(S.rb.luas, nf(val(serie.luas, s), 1)); set(S.rb.gedung, nf(val(serie.gedung, s))); set(S.rb.hujan, nf(val(serie.hujan, s), 1)); set(S.rb.sungai, nf(val(serie.sungai, s), 1));
  gambarLini(); for (const q of Object.values(KECIL)) gambarKecil(q); segarPin(false); kartuLaporanWaktu();
  /* kerja berat (kanvas, filter titik, status gedung) sesudah chrome tergambar; saat putar boleh sinkron; hanya jam terbaru yang dikerjakan */
  if (s !== S.sDraw) { S.sDraw = s; if (S.main) berat(s); else dua2(() => { if (S.sDraw === s) berat(s); }); }
}
function berat(s) { isiKanvas(s); S.map?.getLayer("lap-titik") && S.map.setFilter("lap-titik", ["<=", ["get", "t"], S.t]); terapkanGedung(); }
function putar() { if (!S.B) return; if (S.t >= J) setT(1); S.main = true; S.akhir = performance.now(); ikon(); requestAnimationFrame(tick); }
function berhenti() { S.main = false; ikon(); }
function tick(ts) { if (!S.main) return; const dt = Math.min(.25, (ts - S.akhir) / 1000); S.akhir = ts; S.t = Math.min(J, S.t + dt * 2 * S.laju); segar(); if (S.t >= J) return berhenti(); requestAnimationFrame(tick); }
function ikon() { $("#ikPutar").setAttribute("d", S.main ? "M7 5h3.6v14H7zM13.4 5H17v14h-3.4z" : "M8 5.5v13l10.5-6.5z"); $("#putar").setAttribute("aria-label", S.main ? "Jeda" : "Putar"); }
function lompatWaktu(e) { const r = LC.getBoundingClientRect(); setT((e.clientX - r.left - PAD) / (r.width - PAD * 2) * J); }

/* ---------- panel kanan ---------- */
const areaTeks = () => { const a = meta.area; const n = Array.isArray(a) ? a.map(x => typeof x === "string" ? x : x.nama) : typeof a === "string" ? [a] : AREA.slice(1).map(x => x.n); return n.filter(Boolean).join(", "); };
function bangunKanan() {
  const R = meta.ringkasan, rb = S.rb = {}, kb = (kls, ref, label) => { const b = el("b"); rb[ref] = b; return el("div", {class: "kb " + kls}, b, el("span", {text: label})); };
  const d0 = fT(0), d1 = fT(J - 1), h = meta.hujan || {}, pn = meta.penyebab, kv = [["Tanggal", `${tglPendek(d0)} sampai ${tglPendek(d1)} ${d1.getUTCFullYear()}`], ["Area", areaTeks()]];
  if (Number.isFinite(h.area_mm)) kv.push(["Hujan dalam data", `${nf(h.area_mm)} mm dalam 4 hari (rata-rata area, sesudah pengali ${n1(h.pengali_area)}; ERA5 mentah ${nf(h.era5_area_mm, 1)} mm)`]);
  if (Number.isFinite(R.luas_puncak_km2)) kv.push(["Puncak model", `${nf(R.luas_puncak_km2, 1)} km² pada ${fmtS(R.jam_luas_puncak)}`]);
  if (pn) { const teks = typeof pn === "string" ? pn : pn.teks || pn.isi, lem = pn.lembaga, u = aman(pn.url); kv.push(["Penyebab resmi", el("span", {}, rapikan(teks), lem ? " (" : "", lem ? (u ? tautan(u, lem) : lem) : "", lem ? ")" : "")]); }
  $("#p-ringkasan").replaceChildren(el("div", {class: "sek", text: "Saat ini di replay"}),
    el("div", {class: "kotak4"}, kb("", "luas", "km² lahan dengan air 10 cm atau lebih"), kb("o", "gedung", "bangunan dengan air di pintu"), kb("", "hujan", "mm/jam hujan di jam ini"), kb("", "sungai", "m air di alur Kali Bekasi (P2C), di atas dasar alur")),
    el("div", {class: "sek", text: "Kejadian"}), el("dl", {class: "kv"}, kv.flatMap(([k, v]) => [el("dt", {text: k}), el("dd", {}, v)])),
    el("div", {class: "sek", text: "Kejadian penting"}),
    el("ul", {class: "pen"}, kejadian.map(e => el("li", {class: e.jenis === "lap" ? "mer" : "", tabindex: "0", onclick: () => lompatKejadian(e), onkeydown: ev => ev.key === "Enter" && lompatKejadian(e)}, el("i"), el("div", {}, el("small", {text: e.sub || fmtT(e.t)}), el("b", {text: e.teks}))))));
  const sk = (id, label) => el("label", {class: "sakelar"}, label, el("input", {type: "checkbox", checked: S.lapis[id], onchange: ev => { S.lapis[id] = ev.target.checked; terapkanLapis(); }}));
  $("#p-lapisan").replaceChildren(el("div", {class: "sek", text: "Lapisan"}), sk("citra", "Citra satelit"), sk("gedung", "Gedung 3D"), sk("genangan", "Genangan"), sk("hujan", "Hujan"), sk("kejadian", "Kejadian"), sk("label", "Label tempat"));
  try { bangunModel(); } catch (e) { console.warn("Model:", e); }
}
function lompatKejadian(e) { berhenti(); setT(e.t); if (e.lap?.lat != null) { tampilLaporan(e.lap, true); S.lapKlik = true; } }
/* tab Model: tiap bagian dibangun terpisah dan hanya muncul bila medannya ada; satu galat tidak menghentikan halaman */
const PCT = x => `${nf(x * 100)}%`;
function bangunModel() {
  const box = $("#p-model"), P = t => el("p", {text: rapikan(t)}), H = t => el("div", {class: "sek", text: t}), ok = (...v) => v.every(x => x != null && Number.isFinite(+x));
  const out = [], bagian = (judul, f) => { try { const isi = f(); if (isi && isi.length) out.push(judul ? H(judul) : null, ...isi); } catch (e) { console.warn("Model:", judul, e); } };
  const V = meta.validasi?.ringkas || {}, SB = meta.sungai || {}, KB = SB.kali_bekasi, CW = SB.ciliwung, hj = meta.hujan || {}, lic = meta.lisensi_dem, PN = meta.penyetelan, AL = meta.alur;
  const tabel = (kepala, baris) => el("table", {class: "tb"}, el("tr", {}, kepala.map(k => el("th", {text: k}))), baris.map(r => el("tr", {}, r.map(c => el("td", {text: String(c)})))));
  bagian("", () => ok(V.pod_10cm, V.n_utama, V.pod_10cm_3x3) ? [el("div", {class: "jujur kes"}, `Replay ini menunjukkan pola waktu dan sebaran kasar genangan, bukan kedalaman tepat di rumah tertentu. Pada laporan bebas, genangan 10 cm atau lebih hanya muncul di ${nf(Math.round(V.pod_10cm * V.n_utama))} dari ${nf(V.n_utama)} sel laporan (${PCT(V.pod_10cm_3x3)} dengan toleransi sekitar 1 km).`)] : []);
  bagian("Metode", () => [P("Replay ini adalah model genangan sederhana. Tanah dibagi jadi petak 60 m, lalu air dari hujan dan dari sungai dialirkan antar petak mengikuti kontur tanah, jam demi jam. Hasilnya perkiraan, bukan pengukuran dan bukan prakiraan."), ok(meta.drainase?.terbangun_mm_jam) && P(`Saluran kota dianggap menyedot ${nf(meta.drainase.terbangun_mm_jam)} mm/jam hujan di kawasan terbangun dan ${nf(meta.drainase.lainnya_mm_jam)} mm/jam di tempat lain. Ini asumsi, belum diverifikasi ke dokumen.`)].filter(Boolean));
  bagian("Data", () => { const l = [];
    if (ok(hj.area_mm, hj.era5_area_mm, hj.pengali_area)) l.push(el("li", {text: `Hujan: ERA5 per jam dikali pengali agar mendekati alat ukur, dijepit paling tinggi ${n1(meta.pengali_maks?.nilai ?? 3)}. Hasilnya ${nf(hj.area_mm)} mm dalam 4 hari (ERA5 mentah ${nf(hj.era5_area_mm, 1)} mm, pengali rata-rata ${n1(hj.pengali_area)}).`}));
    if (lic) l.push(el("li", {text: `Medan: ${lic.nama || "FABDEM"}${lic.median_k ? `, diratakan median ${nf(lic.median_k)} × ${nf(lic.median_k)} piksel` : ""}. Lisensi ${lic.lisensi || ""}.`})); else if (meta.sumber?.dem) l.push(el("li", {text: `Medan: ${rapikan(meta.sumber.dem)}`}));
    if (meta.sumber?.lahan) l.push(el("li", {text: `Tutupan lahan: ${rapikan(meta.sumber.lahan)}`})); l.push(el("li", {text: "Gedung dan nama tempat: OpenFreeMap, data OpenStreetMap. Citra: Esri World Imagery."}));
    l.push(el("li", {text: "Air di pintu: gedung yang titik beratnya ada di petak dengan air 10 cm atau lebih."})); return [el("ul", {class: "sumber"}, l)]; });
  bagian("Pengali hujan", () => { const r = meta.pengali?.per_sel_era5; if (!r?.length) return null; const m = r.map(x => x.pengali_mentah ?? x.pengali).filter(Number.isFinite);
    return [P(`ERA5 dikali ${n1(meta.pengali_maks?.nilai ?? 3)} rata${m.length ? `; ERA5 di hulu kurang ${nf(Math.ceil(Math.min(...m)))} sampai ${nf(Math.round(Math.max(...m)))} kali dari alat ukur` : ""}. Pengali mentah dijepit supaya satu alat titik tidak dianggap mewakili seluruh petak.`),
      tabel(["Alat ukur", "Alat mm", "ERA5 mm", "Mentah", "Dipakai"], r.map(x => [(x.stasiun || []).join(", ") || `${nf(x.lat, 2)}; ${nf(x.lon, 2)}`, nf(x.alat_mm), nf(x.era5_mm), n1(x.pengali_mentah ?? x.pengali), n1(x.pengali_dipakai ?? meta.pengali_maks?.nilai)]))]; });
  bagian("Sungai", () => { const l = [], hu = KB?.hulu_terukur, cu = CW?.hulu_terukur, bf = AL?.bankfull?.kali_bekasi, bc = AL?.bankfull?.ciliwung, rg = AL?.kepekaan_kurva_debit?.rentang;
    if (hu && ok(hu.puncak_m3s)) l.push(P(`Kali Bekasi: debit masuk dihitung dari tinggi air terukur di ${hu.pos || "pos hulu"} lewat kurva debit asumsi. Puncaknya ${nf(hu.puncak_m3s)} m³/dtk pada ${fmtS(hu.jam_puncak)}.`));
    if (cu && ok(cu.puncak_hulu_m3s)) l.push(P(`Ciliwung: debit terukur ${cu.pos || "pos hulu"} (puncak ${nf(cu.puncak_hulu_m3s)} m³/dtk) digeser waktu tempuh ${nf(cu.tempuh_jam, 1)} jam ke tepi kisi, ditambah hujan DAS antara seluas ${nf(CW.luas_km2)} km².`));
    if (bf && ok(bf.qbf_m3s)) l.push(P(`Kapasitas alur Kali Bekasi ${nf(bf.qbf_m3s)} m³/dtk${rg && ok(rg.qbf_m3s?.[0], rg.qbf_m3s?.[1]) ? `, tetapi bergantung pada kurva debit yang diasumsikan: ${nf(rg.qbf_m3s[0])} sampai ${nf(rg.qbf_m3s[1])} m³/dtk` : ""}. Alur dimodelkan selebar satu petak, jadi bentuk gelombangnya kasar.`));
    if (bc && ok(bc.qbf_m3s)) l.push(P(`Kapasitas alur Ciliwung ${nf(bc.qbf_m3s)} m³/dtk adalah asumsi, belum bersumber.`)); return l; });
  bagian("Disetel ke laporan, dan dipilih sesudah melihat hasil", () => { const l = []; if (!PN) return l;
    const kep = k => Array.isArray(k) && k.length && typeof k[0] === "object" ? (() => { const kol = Object.keys(k[0]).filter(x => !["keterangan", "sumber"].includes(x)), nm = {terbangun_lainnya: "Drainase", pod_sel: "POD sel", pod_3x3: "POD 3 × 3", luas_kota_bekasi_ha: "Luas ha", k: "k", keterangan: ""};
      return tabel(kol.map(x => nm[x] || x), k.map(r => kol.map(x => /^pod/.test(x) ? [].concat(r[x]).map(PCT).join(" dan ") : Array.isArray(r[x]) ? r[x].map(n1).join(" dan ") : /ha$/.test(x) ? nf(r[x]) : typeof r[x] === "number" ? n1(r[x]) : rapikan(r[x])))); })() : typeof k === "string" ? P(`Kepekaan: ${k}.`) : k && k.sebelum ? P(`Sebelum: ${nf(k.sebelum.n)} laporan, POD sel ${PCT(k.sebelum.pod_sel)}. Sesudah: ${nf(k.sesudah.n)} laporan bebas, POD sel ${PCT(k.sesudah.pod_sel)}, 3 × 3 ${PCT(k.sesudah.pod_3x3)}.`) : null;
    l.push(el("p", {class: "kecil", text: "Disetel ke laporan berarti angkanya dipilih supaya cocok dengan satu laporan, jadi laporan itu tidak lagi menguji model."}));
    for (const x of PN.disetel_ke_laporan || []) { l.push(el("p", {}, el("b", {text: rapikan(x.butir)}), x.laporan ? el("span", {text: `. Laporan acuan: ${rapikan(x.laporan)}.`}) : null)); const t = kep(x.kepekaan); if (t) l.push(t); if (x.catatan) l.push(el("p", {class: "kecil", text: rapikan(x.catatan)})); }
    l.push(el("p", {class: "kecil", text: "Dipilih sesudah melihat hasil berarti angkanya diubah setelah melihat seberapa cocok modelnya, jadi validasi di bawah sedikit terlalu optimistis."}));
    for (const x of PN.dipilih_sesudah_melihat_hasil || []) { l.push(el("p", {}, el("b", {text: rapikan(x.butir)}), x.alasan ? el("span", {text: `. ${rapikan(x.alasan)}.`}) : null)); const t = kep(x.kepekaan); if (t) l.push(t); }
    return l; });
  bagian("Validasi", () => { const l = [], pg = V.pondok_gede_permai, kk = V.kelompok_kalibrasi, pl = V.per_lokasi_bebas, jt = V.jakarta_timur_10;
    if (ok(V.pod_10cm, V.n_utama)) l.push(P(`Laporan bebas yang lokasinya cocok di peta (OpenStreetMap atau Nominatim): ${nf(V.n_utama)} laporan. Air 10 cm atau lebih muncul di sel laporan pada ${PCT(V.pod_10cm)} (${nf(Math.round(V.pod_10cm * V.n_utama))} laporan), dan ${PCT(V.pod_10cm_3x3)} bila boleh meleset ke petak sekitarnya (3 × 3, sekitar 1 km).`));
    if (kk && ok(kk.n)) l.push(P(`Laporan yang dipakai untuk menyetel model dipisah: ${nf(kk.n)} laporan, ${PCT(kk.pod_sel)} terdeteksi. Angka ini tidak boleh dibaca sebagai bukti.`));
    if (pl) { const nm = {tepat: "Lokasi tepat (OSM)", pusat_kelurahan: "Pusat kelurahan", nominatim_lain: "Nominatim lain", perkiraan: "Perkiraan peneliti"}; l.push(tabel(["Lokasi laporan", "Jumlah", "Sel", "3 × 3"], Object.entries(pl).map(([k, v]) => [nm[k] || k, nf(v.n), PCT(v.pod_sel), PCT(v.pod_3x3)]))); }
    if (jt && jt.bertentangan_kalibrasi) l.push(P(`Jakarta Timur (${nf(jt.n)} laporan): ${String(jt.catatan || "").replace(/[.;\s]+$/, "")}. Terdeteksi ${PCT(jt.pod_jam_laporan_10)} pada jam laporan dan ${PCT(jt.pod_12)} pada pukul 12.00.`));
    const sl = V.selisih_sel; if (sl && ok(sl.bias_cm)) l.push(P(`Kedalaman: rata-rata selisih model dengan laporan ${nf(sl.bias_cm / 100, 1)} m, jadi model ${sl.bias_cm < 0 ? "lebih dangkal" : "lebih dalam"} daripada laporan.`));
    if (pg) { const lp = (S.laporan || []).find(x => /pondok\s*gede\s*permai/i.test(x.nama) && x.kedalaman_cm), w = x => x ? fmtS(tDari(x)) : null;
      const ks = Object.entries(pg.kedalaman_cm || {}).map(([wk, v]) => `${fmtS(tDari(wk))}: model ${n1(v.sel)} cm di sel, ${n1(v.maks_3x3)} cm maksimum 3 × 3${lp ? `, laporan ${nf(lp.kedalaman_cm)} cm` : ""}`);
      l.push(P(`Pondok Gede Permai: laporan menyebut air mulai menggenang ${w(pg.sasaran)}. Air pertama 10 cm di model ${pg.air_pertama_10cm_wib ? w(pg.air_pertama_10cm_wib) : "tidak muncul"}${pg.air_pertama_10cm_3x3_wib ? ` (3 × 3: ${w(pg.air_pertama_10cm_3x3_wib)})` : ""}.`)); if (ks.length) l.push(el("ul", {class: "sumber"}, ks.map(t => el("li", {text: t})))); }
    const it = V.luas_kota_bekasi; if (it && ok(it.tergenang_ge10cm_hmaks_ha) && it.itb) l.push(P(`Luas Kota Bekasi tergenang 10 cm atau lebih (jam terburuk tiap petak): sekitar ${nf(Math.round(it.tergenang_ge10cm_hmaks_ha / 100) * 100)} ha (poligon kasar), ${nf(it.tergenang_ge10cm_hmaks_ha / it.itb.survei_ha, 1)} kali survei ITB (${nf(it.itb.survei_ha)} ha). Simulasi ITB ${nf(it.itb.simulasi_itb_ha)} ha.`));
    const pp = (V.puncak_pantau || []).filter(p => ok(p.muka_maks_m_relatif_dasar_alur ?? p.kedalaman_maks_m)); if (pp.length) l.push(el("ul", {class: "sumber"}, pp.map(p => { const lp = p.laporan_puncak; return el("li", {text: `${p.nama}: air di alur tertinggi ${nf(p.muka_maks_m_relatif_dasar_alur ?? p.kedalaman_maks_m, 1)} m di atas dasar alur, ${fmtS(p.s)}${lp ? `. Laporan puncak ${lp.pos ? rapikan(lp.pos.split("(")[0].trim()) : "pos"}: TMA ${nf(lp.tma_cm)} cm, ${fmtS(tDari(lp.waktu_wib))}${ok(p.selisih_jam) ? `. Model ${p.selisih_jam > 0 ? "terlambat" : "lebih awal"} ${nf(Math.abs(p.selisih_jam), 1)} jam` : ""}` : ""}`}); })));
    if (V.pod_10cm < .5) l.push(el("div", {class: "jujur", text: "Kecocokan dengan laporan rendah. Pakai replay ini untuk melihat pola kasar, bukan untuk menunjuk rumah tertentu."})); return l; });
  bagian("Batas", () => Array.isArray(meta.batas) && meta.batas.length ? [el("ul", {class: "sumber"}, meta.batas.map(t => el("li", {text: rapikan(t)}))), el("p", {class: "kecil", text: "Ini replay kejadian lampau, bukan prakiraan."})] : []);
  bagian("Sumber dan lisensi", () => { const l = [];
    for (const s of (meta.pengali?.stasiun || []).filter(s => s.dipakai !== false)) l.push(el("li", {}, aman(s.url) ? tautan(s.url, `${s.nama}: ${nf(s.mm)} mm, ${rapikan(s.periode)}`) : `${s.nama}: ${nf(s.mm)} mm`));
    for (const d of meta.rujukan?.dampak || []) l.push(el("li", {}, aman(d.url) ? tautan(d.url, rapikan(d.sumber)) : rapikan(d.sumber)));
    const lihat = new Set(); for (const x of S.laporan || []) if (aman(x.url) && !lihat.has(x.url)) { lihat.add(x.url); l.push(el("li", {}, tautan(x.url, rapikan(x.media || "Media")))); }
    if (lic) l.unshift(el("li", {text: `${lic.nama || "FABDEM"}, lisensi ${lic.lisensi || ""}. ${lic.atribusi || ""}`.trim()}));
    return [el("ul", {class: "sumber"}, l)]; });
  box.replaceChildren(...(out.filter(Boolean).length ? out.filter(Boolean) : [P("Rincian model belum tersedia.")]));
}

/* ---------- tur ---------- */
const LANGKAH = [["#chip", "Pilih area untuk terbang ke sana. Ringkasan kembali ke pandangan seluruh kisi."], ["#cariBungkus", "Ketik nama jalan, perumahan, atau tempat, lalu pilih hasilnya. Kamera terbang dan tempatnya dipin."],
  ["#peta", "Klik di peta untuk memin titik mana pun dan melihat kedalaman airnya dari jam ke jam."], ["#bilah", "Putar atau jeda replay, dan pilih kecepatan 1x, 2x, atau 4x."], ["#lini", "Klik atau geser linimasa untuk melompat waktu. Titik merah adalah laporan media, titik biru kejadian dari model."],
  ["#kanan", "Angka saat ini, kejadian penting, lapisan, dan cara model bekerja ada di sini."]];
let langkah = -1;
function tur(k) { document.querySelectorAll(".sorot").forEach(e => e.classList.remove("sorot")); const kt = $("#turKartu"); if (k >= LANGKAH.length || k < 0) { langkah = -1; kt.hidden = true; return; } langkah = k;
  const [sel, teks] = LANGKAH[k], tg = $(sel); if (sel === "#kanan" && innerWidth <= 900) $("#kanan").classList.add("buka"); tg.classList.add("sorot");
  kt.replaceChildren(el("p", {text: teks}), el("div", {class: "ba"}, el("span", {text: `${k + 1} dari ${LANGKAH.length}`}), el("span", {}, el("button", {text: "Tutup", onclick: () => tur(-1)}), " ", el("button", {class: "gelap", text: k === LANGKAH.length - 1 ? "Selesai" : "Lanjut", onclick: () => tur(k + 1)}))));
  kt.hidden = false; const r = tg.getBoundingClientRect(), w = 260, hk = kt.offsetHeight; let x = Math.min(innerWidth - w - 8, Math.max(8, r.left + 12)), y = r.bottom + 12;
  if (y + hk > innerHeight - 8) y = Math.max(8, Math.min(r.top + 60, innerHeight - hk - 8)); if (r.height > innerHeight * .6) y = Math.min(innerHeight - hk - 8, r.top + 70); if (sel === "#kanan" && innerWidth > 900) x = Math.max(8, r.left - w - 12);
  if (innerWidth <= 900) { x = 8; y = Math.min(y, innerHeight - hk - 56); } kt.style.left = x + "px"; kt.style.top = y + "px"; }

/* ---------- mulai ---------- */
function bangunChip() { const box = $("#chip"); AREA.forEach((a, i) => box.append(el("button", {type: "button", class: i ? "" : "on", onclick: e => { box.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === e.currentTarget)); terbang(a.c, a.z, a.p, a.b); }, text: a.n}))); }
function bangunTab() { const tabs = [...document.querySelectorAll("#tab button")];
  tabs.forEach(b => b.addEventListener("click", () => { const sudah = b.getAttribute("aria-selected") === "true", kecil = innerWidth <= 900;
    tabs.forEach(x => { x.setAttribute("aria-selected", String(x === b)); $("#p-" + x.dataset.p).hidden = x !== b; });
    if (kecil) $("#kanan").classList.toggle("buka", !sudah || !$("#kanan").classList.contains("buka")); })); 
  if (innerWidth <= 900) $("#tab").addEventListener("click", e => { if (e.target.id === "tab") $("#kanan").classList.toggle("buka"); }); }
function ukuranBerubah() { dpr = Math.min(2, devicePixelRatio || 1); gambarDasar(); gambarLini(); gambarKecilSemua(); if (S.pin && S.pr?.grafik) segarPin(false); S.map?.resize(); }
async function mulai() {
  try { meta = await muatJSON(DIR + ID + ".json"); } catch (e) { set($("#muat"), "Data replay belum tersedia. Muat ulang nanti."); console.warn(e); return; }
  J = meta.jam; PJ = meta.ringkasan.per_jam; M0 = Date.parse(meta.mulai); dpr = Math.min(2, devicePixelRatio || 1);
  if (meta.ringkasan.jam_luas_puncak) S.t = Math.max(1, meta.ringkasan.jam_luas_puncak - 6);
  const q = new URLSearchParams(location.search); if ((q.get("t") || "").trim() && Number.isFinite(+q.get("t"))) S.t = Math.max(0, Math.min(J, +q.get("t")));
  if (meta.kisi.pusat) AREA[0].c = [meta.kisi.pusat.lon, meta.kisi.pusat.lat];
  siapkanSeri(); siapkanKejadian();
  set($("#judul"), meta.judul); set($("#rentang"), `${tglPendek(fT(0))} sampai ${tglPendek(fT(J - 1))} ${fT(J - 1).getUTCFullYear()}`); set($("#areaTeks"), areaTeks());
  document.title = `${meta.judul}, ${tglPendek(fT(0))} sampai ${tglPendek(fT(J - 1))} ${fT(J - 1).getUTCFullYear()}`;
  bangunChip(); bangunTab(); try { bangunKanan(); } catch (e) { console.warn("Panel kanan:", e); } try { bangunCari(); } catch (e) { console.warn(e); } bangunPeta();
  $("#putar").addEventListener("click", () => S.main ? berhenti() : putar());
  document.querySelectorAll("#laju button").forEach(b => b.addEventListener("click", () => { S.laju = +b.dataset.x; document.querySelectorAll("#laju button").forEach(x => x.classList.toggle("on", x === b)); }));
  LC.addEventListener("pointerdown", e => { if (S.main) berhenti(); LC.setPointerCapture(e.pointerId); S.seret = true; lompatWaktu(e); });
  LC.addEventListener("pointermove", e => { if (S.seret) lompatWaktu(e); }); LC.addEventListener("pointerup", () => S.seret = false); LC.addEventListener("pointercancel", () => S.seret = false);
  LC.addEventListener("keydown", e => { const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (d) { e.preventDefault(); setT(S.t + d); } });
  $("#tur").addEventListener("click", () => tur(0)); document.addEventListener("keydown", e => { if (e.key === "Escape" && langkah >= 0) tur(-1); });
  new ResizeObserver(() => { const u = innerWidth + "x" + innerHeight + "," + LC.clientWidth; if (u !== S.ukuran) { S.ukuran = u; ukuranBerubah(); } }).observe(document.body);
  [LC, ...Object.values(KECIL).map(q => $("#" + q.id))].forEach(c => roC.observe(c));
  ukuranBerubah(); segar();
  const w = S.pekerja = new Worker("replay_kerja.js"), b = meta.biner;
  w.onmessage = e => { const d = e.data;
    if (d.p != null) set($("#muat"), `Memuat data genangan ${nf(d.p * 100)}%`);
    else if (d.gambar) terimaGambar(d);
    else if (d.galat) { set($("#muat"), "Data genangan gagal dimuat. Muat ulang halaman."); console.warn(d.galat); }
    else if (d.selesai) { S.B = d.selesai; $("#muat").hidden = true; $("#putar").disabled = false; S.sDraw = -1; S.sGambar = -2; pasangTerdalam(); if (S.pin) S.pin.seri = null; setT(S.t); } };
  w.onerror = e => set($("#muat"), "Data genangan gagal dimuat. Muat ulang halaman.");
  w.postMessage({url: DIR + b.berkas, bagian: b.bagian, jam: J, ukuran: b.ukuran_mentah});
}
mulai();
window.Replay = {S, setT, pasPin, AREA};
})();
