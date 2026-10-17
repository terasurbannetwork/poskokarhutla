/* sim_3d.js — tampilan "FireTrace" di tab Simulasi: titik api pilihan sendiri, medan 3D, garis depan api yang menyala,
   jalur kepala api, dan MODE FORENSIK (bar insiden, panel kanan, timeline + 3 grafik, tab lewat window.SimFT).
   Tambalan seperti sim_data.js / sim_perlakuan.js: membungkus Sim.pilih / panel / klikPeta / pasangLapis / gambar / waktu,
   TIDAK mengubah atau menyalin mesin sebar/tabelLaju (tabelLaju hanya DIPANGGIL untuk laju kepala per jam).
   Semua angka berasal dari hasil Sim (H.T, H.luas, H.W, H.desa, H.tahan, H.tepi). Insiden pada titik pilihan itu buatan
   (hari:0, tanpa pertumbuhan teramati); cuacanya tetap prakiraan nyata (Sim.cuacaJam). */
(() => {
if (typeof Sim === "undefined") return;
const JAM = [0, 6, 12, 24, 36, 48, 60, 72];
/* cadangan bila tak ada kompleks <= 300 km: nilai tengah kemarau Indonesia (FFMC 85 = bawaan Sim; BUI 40 = bawaan tabelLaju).
   Cuaca per jam tetap dari Open-Meteo; ini hanya FFMC awal, BUI, DC, dan cadangan bila prakiraan gagal. */
const CAD = {prov: "", ffmc: 85, bui: 40, dc: 300, isi: 5, ws: 10, wd: 90, rh: 60, t: 30};
const TG = {on: false, f: null, dataMati: false, dataAsal: true};
const T3 = {d3: false, citra: true}; /* 3D = citra satelit + medan seperti FireTrace; checkbox Citra mematikannya */
const D = {H: null, t: 72, buka: null, cv: null, img: null, jalur: new WeakMap(), jh: new WeakMap(), tab: new WeakMap(), prof: new WeakMap(), mk: [], pts: null,
  hasilObj: null, keluar: false, user2d: false, zb: null, aw: -1, ev: [], mulai: null, rafF: 0, rt: 0, kam: 0};
const F = {on: false, tabs: new Map(), aktif: "insiden", terbuka: null, el: {}};
/* lapisan di panel kanan: on/op disimpan di sini (peta bisa dibangun ulang kapan saja); medan & citra mengikuti T3, lahan mengikuti Sim.op.lahanTampil */
const LP = {medan: {n: "Medan 3D", op: 100}, citra: {n: "Citra satelit", op: 100}, bekas: {n: "Bekas bakar", on: true, op: 85}, depan: {n: "Garis depan api", on: true, op: 100},
  jalur: {n: "Jalur kepala api", on: true, op: 100}, angin: {n: "Angin (vektor)", on: false, op: 70}, desa: {n: "Desa", on: true, op: 100}, lahan: {n: "Bahan bakar", op: 55}};
const ik = (d, w = 14) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const P = {tengah: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>', grafik: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  api: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/>', pin: '<path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
  kal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', main: '<path d="M7 5l12 7-12 7z"/>', jeda: '<path d="M8 5v14M16 5v14"/>',
  maju: '<path d="M6 5l9 7-9 7zM19 5v14"/>', atur: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  keluar: '<path d="M9 4H5v16h4M13 8l4 4-4 4M17 12H8"/>', panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>', lapis: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>', angin: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3"/>',
  suhu: '<path d="M12 3v11M8 14a4 4 0 1 0 8 0"/><circle cx="12" cy="16" r="2"/>', tetes: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  daun: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/>', laju: '<path d="M4 12h14M13 6l6 6-6 6"/>'};
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], p2 = n => String(n).padStart(2, "0");
const wib = (S, h) => jamWIB(new Date(S.cuaca.mulai.getTime() + h * 36e5)).replace(" WIB", "");
const wp = (S, h) => { const d = new Date(S.cuaca.mulai.getTime() + (h + 7) * 36e5); return {tg: `${d.getUTCDate()} ${BLN[d.getUTCMonth()]}`, jam: `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`, h: d.getUTCHours()}; }; /* WIB = UTC+7, tanpa DST */
const wt = (S, h) => { const q = wp(S, h); return `${q.tg} ${q.jam}`; };
const nol = x => Math.round(x);
const bulat = v => v >= 1e3 ? nol(v / 10) * 10 : nol(v); /* tanpa presisi palsu: ribuan dibulatkan puluhan */
const aman = fn => { try { return fn(); } catch (e) { console.error("SimFT:", e); } };
const setT = j => { const s = $("#simT"); s.value = j; s.dispatchEvent(new Event("input")); };
const hal = $("#p-sim"), wk = $("#simWaktu");

/* ---------- 1. titik pilihan ---------- */
function terdekat(lat, lon) {
  const cs = Math.cos(lat * Math.PI / 180); let b = null, bd = Infinity;
  for (const f of S.kluster?.features || []) { const p = f.properties, d = ((p.lon - lon) * cs) ** 2 + (p.lat - lat) ** 2; if (d < bd) { bd = d; b = f; } }
  return b && {f: b, jarak: km(lat, lon, b.properties.lat, b.properties.lon)};
}
const koor = (lat, lon) => { const n = v => Math.abs(v).toLocaleString("id-ID", {minimumFractionDigits: 3, maximumFractionDigits: 3}); return `${n(lat)}° ${lat < 0 ? "LS" : "LU"}, ${n(lon)}° BT`; };
function buatTitik(lon, lat) {
  const t = terdekat(lat, lon), c = t && t.jarak <= 300 ? t.f.properties : {};
  const v = k => c[k] ?? CAD[k];
  return {type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties: {id: "titik", kec: "Titik pilihan", kab: koor(lat, lon), prov: v("prov"), lat, lon, api24: [[lon, lat]], n: 1, level: 0,
    ffmc: v("ffmc"), bui: v("bui"), dc: v("dc"), isi: v("isi"), ws: v("ws"), wd: v("wd"), rh: v("rh"), t: v("t"), hari: 0, luas: 0}};
}
function labelSim() { $("#s3Label").hidden = Sim.k !== "titik"; }
function pilihTitik(lon, lat) {
  TG.f = buatTitik(lon, lat); Sim.pk = null; if (window.SimData) SimData.hasil = null; /* id sama dengan titik sebelumnya: buang sisa hitungan lama */
  Sim.pilih("titik"); toast("Titik dipilih. Tekan Jalankan untuk menghitung.");
}
const pilih0 = Sim.pilih;
Sim.pilih = function (id, ...a) {
  if (id === "titik" && !TG.f) id = S.kluster.features[0]?.properties.id; /* tautan /sim/titik lama */
  const titik = id === "titik";
  /* model data (hotspot) tak berlaku untuk insiden buatan: matikan sementara, pulihkan saat kembali ke kompleks nyata */
  if (titik && !TG.dataMati) { TG.dataAsal = this.op.data; this.op.data = false; TG.dataMati = true; }
  else if (!titik && TG.dataMati) { this.op.data = TG.dataAsal; TG.dataMati = false; }
  let r;
  if (titik) { S.kluster.features.push(TG.f); try { r = pilih0.call(this, id, ...a); } finally { S.kluster.features.pop(); } } /* pilih() mencari fitur di S.kluster; sinkron, tak bocor */
  else r = pilih0.call(this, id, ...a);
  D.H = null; D.hasilObj = null; D.keluar = false; if (F.on) keluarF(); /* hasil dibuang: mode forensik tak punya isi */
  labelSim(); return r;
};
const klik0 = Sim.klikPeta;
Sim.klikPeta = function (e) {
  if (this._gambarSekat || !TG.on) return klik0.call(this, e);
  const {lng, lat} = e.lngLat;
  if (lat < -11.5 || lat > 6.5 || lng < 94 || lng > 141.5) return toast("Pilih titik di wilayah Indonesia");
  TG.on = false; this.peta.getCanvas().style.cursor = "";
  document.querySelectorAll("#s3Pilih").forEach(b => b.setAttribute("aria-pressed", "false"));
  requestAnimationFrame(() => pilihTitik(lng, lat));
};
const panel0 = Sim.panel;
Sim.panel = function (...a) {
  const r = panel0.apply(this, a), pa = $("#simPanel"), sel = pa.querySelector("#simK");
  if (!sel || !this.f) return r;
  if (TG.f) { const q = TG.f.properties; sel.insertAdjacentHTML("afterbegin", `<option value="titik" ${this.k === "titik" ? "selected" : ""}>Titik pilihan · ${esc(q.kab)}</option>`); if (this.k === "titik") sel.value = "titik"; }
  if (this.k === "titik") { const info = pa.querySelector("h2 + div"); if (info) info.innerHTML = `<span class="s3-pill s3-sim">${ik(P.api)}SIMULASI</span> ${esc(namaProv(this.f.properties.prov) || "Indonesia")}`; }
  sel.closest("label").insertAdjacentHTML("beforebegin", `<button type="button" class="s3-pill" id="s3Pilih" aria-pressed="${TG.on}" style="margin-top:12px">${ik(P.tengah)}Pilih titik api</button>`);
  $("#s3Pilih").onclick = e => {
    if (this._gambarSekat) return toast("Selesaikan gambar sekat dulu");
    TG.on = !TG.on; e.currentTarget.setAttribute("aria-pressed", TG.on); this.peta.getCanvas().style.cursor = TG.on ? "crosshair" : "";
    if (TG.on) toast("Klik titik di peta");
  };
  /* jalan masuk/keluar mode forensik dari panel pengaturan */
  if (this.hasil) { pa.insertAdjacentHTML("afterbegin", `<button type="button" class="s3-pill" id="s3Msk" style="margin-bottom:8px">${ik(F.on ? P.keluar : P.grafik)}${F.on ? "Tutup pengaturan" : "Mode forensik"}</button>`);
    $("#s3Msk").onclick = () => { if (F.on) { aturPa(false); return; } D.keluar = false; masukF(false); }; }
  return r;
};
const tb0 = Sim.tandaiBasi;
Sim.tandaiBasi = function (...a) { const r = tb0.apply(this, a); const el = $("#s3Stat"); if (el) el.textContent = this.basi ? "Pengaturan berubah, jalankan ulang" : "Hasil model, belum divalidasi"; return r; };

/* ---------- 2. medan 3D ---------- */
function atur3D(S) {
  const m = S.peta; if (!m?.getLayer("sim-k")) return; /* sim-k ada = gaya sudah dimuat (isStyleLoaded() false selama ubin dimuat) */
  const sebelum = ["sim-lahan", "sim-img", "sim-k"].find(l => m.getLayer(l));
  for (const l of ["s3-hill", "s3-sat"]) if (m.getLayer(l) && (!T3.d3 || (l === "s3-sat" && !T3.citra))) m.removeLayer(l);
  if (!T3.d3) {
    if (m.getTerrain()) m.setTerrain(null);
    if (m.getSource("s3-dem")) m.removeSource("s3-dem");
    if (m.getSource("s3-sat")) m.removeSource("s3-sat");
    if (m.getLayer("sim-img")) m.setPaintProperty("sim-img", "raster-brightness-max", 1);
    return;
  }
  if (!m.getSource("s3-dem")) m.addSource("s3-dem", {type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 15,
    attribution: "Medan © Mapzen, NASA SRTM, USGS"});
  if (T3.citra && !m.getSource("s3-sat")) m.addSource("s3-sat", {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar"});
  if (T3.citra && !m.getLayer("s3-sat")) m.addLayer({id: "s3-sat", type: "raster", source: "s3-sat"}, m.getLayer("s3-hill") ? "s3-hill" : sebelum);
  if (!m.getLayer("s3-hill")) m.addLayer({id: "s3-hill", type: "hillshade", source: "s3-dem", paint: {"hillshade-exaggeration": T3.citra ? .25 : .45,
    "hillshade-shadow-color": gelap() ? "#000000" : "#473b24", "hillshade-highlight-color": gelap() ? "#5a6a85" : "#ffffff"}}, sebelum);
  if (!m.getTerrain()) m.setTerrain({source: "s3-dem", exaggeration: 1.5});
  /* area yang sudah terbakar digelapkan jadi bekas bakar; garis depan (sim-depan) tetap menyala. Keburaman: terapkan() */
  if (m.getLayer("sim-img")) m.setPaintProperty("sim-img", "raster-brightness-max", .5);
}
function mode(d3, citra) {
  if (d3 != null) { T3.d3 = d3; D.user2d = !d3; } if (citra != null) T3.citra = citra;
  document.querySelectorAll(".s3-m [data-m]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.m === "3d") === T3.d3));
  $("#s3Citra").hidden = !T3.d3; $("#s3Citra").setAttribute("aria-pressed", T3.citra); segarkanLapis();
  requestAnimationFrame(() => { /* chrome urgent di atas; kerja peta menyusul */
    const m = Sim.peta; if (!m) return;
    atur3D(Sim); terapkan();
    if (T3.d3) { m.dragRotate.enable(); m.touchZoomRotate.enableRotation(); m.easeTo({pitch: 60, duration: 700}); }
    else { m.dragRotate.disable(); m.touchZoomRotate.disableRotation(); m.easeTo({pitch: 0, bearing: 0, duration: 500}); }
  });
}
/* keburaman & visibilitas lapis di panel kanan -> properti MapLibre. Murah; dipanggil dari rAF */
function terapkan() {
  const m = Sim.peta; if (!m?.getLayer("sim-k")) return;
  const vis = (ids, on) => { for (const id of ids) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", on ? "visible" : "none"); };
  const po = (id, pr, v) => { if (m.getLayer(id)) m.setPaintProperty(id, pr, v); };
  po("s3-sat", "raster-opacity", LP.citra.op / 100);
  po("s3-hill", "hillshade-exaggeration", (T3.citra ? .25 : .45) * LP.medan.op / 100);
  vis(["sim-img"], LP.bekas.on); po("sim-img", "raster-opacity", LP.bekas.op / 100);
  vis(["sim-depan"], LP.depan.on); po("sim-depan", "raster-opacity", LP.depan.op / 100);
  const j = LP.jalur, o = j.op / 100;
  vis(["s3-jalur-bg", "s3-jalur", "s3-jalur-f", "s3-panah"], j.on);
  po("s3-jalur-bg", "line-opacity", .55 * o); po("s3-jalur", "line-opacity", o); po("s3-jalur-f", "line-opacity", .85 * o); po("s3-panah", "icon-opacity", o);
  for (const x of D.mk) { const e = x.getElement().firstChild; e.style.display = j.on ? "" : "none"; e.style.opacity = o; }
  vis(["s3-angin", "s3-angin-bg"], LP.angin.on); po("s3-angin", "line-opacity", .85 * LP.angin.op / 100); po("s3-angin-bg", "line-opacity", .3 * LP.angin.op / 100);
  vis(["sim-desa", "sim-desa-lbl"], LP.desa.on); po("sim-desa", "circle-opacity", LP.desa.op / 100); po("sim-desa", "circle-stroke-opacity", LP.desa.op / 100);
  po("sim-lahan", "raster-opacity", LP.lahan.op / 100);
}
const tunda = () => { if (!D.rt) D.rt = requestAnimationFrame(() => { D.rt = 0; terapkan(); if (LP.angin.on) { D.aw = -1; petaF(D.t); } }); };

/* ---------- 3. garis depan api (sim-depan) ---------- */
function urlDepan(S, t) {
  const H = S.hasil[S.lihat], n = S.K.n;
  if (!D.cv || D.cv.width !== n) { D.cv = document.createElement("canvas"); D.cv.width = D.cv.height = n; D.ctx = D.cv.getContext("2d"); D.img = D.ctx.createImageData(n, n); }
  const px = D.img.data, T = H.T; px.fill(0);
  for (let k = 0; k < T.length; k++) { const v = T[k]; if (!(v > t - 1 && v <= t)) continue;
    const a = v - (t - 1), o = ((n - 1 - ((k / n) | 0)) * n + k % n) * 4; /* baru = kuning terang, lebih tua = oranye */
    px[o] = 255; px[o + 1] = 122 + 114 * a; px[o + 2] = 24 + 96 * a; px[o + 3] = 240; }
  D.ctx.putImageData(D.img, 0, 0); return D.cv.toDataURL();
}
const koorKisi = K => [[K.x0, K.y1], [K.x1, K.y1], [K.x1, K.y0], [K.x0, K.y0]];

/* ---------- 4. jalur kepala api: garis padat sampai jam geser, putus-putus sesudahnya, panah arah, penanda berlabel ---------- */
function hitungJalur(S, H) {
  const K = S.K, n = K.n, B = K.benih, langkah = Math.ceil(B.length / 60), bs = [];
  for (let q = 0; q < B.length; q += langkah) bs.push([B[q] % n, (B[q] / n) | 0]); /* ponytail: <= 60 benih terpilih sebagai asal; cukup untuk jarak terdekat */
  const best = JAM.map(() => ({d: -1, k: -1})), T = H.T;
  for (let k = 0; k < T.length; k++) { const t = T[k]; if (!(t <= 72)) continue;
    const i = k % n, j = (k / n) | 0; let d = Infinity; for (const [bi, bj] of bs) { const e = (i - bi) ** 2 + (j - bj) ** 2; if (e < d) d = e; }
    let b = 0; while (JAM[b] < t) b++;
    if (d > best[b].d) best[b] = {d, k}; }
  const out = []; let cur = {d: -1, k: -1};
  JAM.forEach((jam, b) => { if (best[b].d > cur.d) cur = best[b]; const k = jam === 0 ? B[0] : cur.k; const q = out[out.length - 1]; if (k < 0 || (q && Math.hypot(k % n - q.k % n, ((k / n) | 0) - ((q.k / n) | 0)) < 4)) return;
    out.push({jam, k, lon: K.x0 + ((k % n) + .5) / n * (K.x1 - K.x0), lat: K.y0 + (((k / n) | 0) + .5) / n * (K.y1 - K.y0)}); });
  return out;
}
const jalurH = (S, H) => { let p = D.jalur.get(H); if (!p) D.jalur.set(H, p = hitungJalur(S, H)); return p; };
function posisiT(pts, t) {
  if (t <= pts[0].jam) return pts[0];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i].jam) { const a = pts[i - 1], b = pts[i], f = (t - a.jam) / (b.jam - a.jam); return {jam: t, lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f}; }
  return pts[pts.length - 1];
}
function dataJalur(pts, t) {
  const fs = [], ll = q => [q.lon, q.lat], ln = (c, k) => c.length > 1 && fs.push({type: "Feature", geometry: {type: "LineString", coordinates: c}, properties: {k}});
  if (pts.length > 1) { const p = posisiT(pts, t);
    ln(pts.map(ll), "semua"); ln([...pts.filter(q => q.jam < t), p].map(ll), "lalu"); ln([p, ...pts.filter(q => q.jam > t)].map(ll), "depan"); }
  return {type: "FeatureCollection", features: fs};
}
function gambarIkon(m) { /* segitiga panah oranye (menghadap timur; MapLibre memutar sepanjang garis) dan segitiga putih puncak */
  const buat = (id, gambar) => { if (m.hasImage(id)) return; const c = document.createElement("canvas"); c.width = c.height = 48; const g = c.getContext("2d"); g.lineJoin = "round"; gambar(g); m.addImage(id, g.getImageData(0, 0, 48, 48), {pixelRatio: 2}); };
  buat("s3-panah", g => { g.fillStyle = "#f08a3c"; g.strokeStyle = "rgba(29,29,29,.75)"; g.lineWidth = 3; g.beginPath(); g.moveTo(8, 8); g.lineTo(42, 24); g.lineTo(8, 40); g.lineTo(16, 24); g.closePath(); g.fill(); g.stroke(); });
  buat("s3-seg", g => { g.fillStyle = "#fff"; g.strokeStyle = "rgba(29,29,29,.8)"; g.lineWidth = 3; g.beginPath(); g.moveTo(24, 10); g.lineTo(40, 38); g.lineTo(8, 38); g.closePath(); g.fill(); g.stroke(); });
}
function pasangJalur(S) {
  const m = S.peta, H = S.hasil?.[S.lihat]; if (!m || !H || !S.K || !m.getLayer("sim-k")) return;
  const pts = D.pts = jalurH(S, H); gambarIkon(m);
  m.addSource("s3-jalur", {type: "geojson", data: dataJalur(pts, D.t)});
  const ln = k => ["==", ["get", "k"], k], tepi = gelap() ? "#0b1424" : "#1d1d1d";
  m.addLayer({id: "s3-jalur-bg", type: "line", source: "s3-jalur", filter: ln("semua"), paint: {"line-color": tepi, "line-width": 5, "line-opacity": .55}, layout: {"line-cap": "round", "line-join": "round"}});
  m.addLayer({id: "s3-jalur-f", type: "line", source: "s3-jalur", filter: ln("depan"), paint: {"line-color": "#ffd24a", "line-width": 2.5, "line-dasharray": [2, 1.6], "line-opacity": .85}, layout: {"line-join": "round"}});
  m.addLayer({id: "s3-jalur", type: "line", source: "s3-jalur", filter: ln("lalu"), paint: {"line-color": "#ffd24a", "line-width": 3}, layout: {"line-cap": "round", "line-join": "round"}});
  m.addLayer({id: "s3-panah", type: "symbol", source: "s3-jalur", filter: ln("semua"), layout: {"symbol-placement": "line", "symbol-spacing": 80, "icon-image": "s3-panah", "icon-size": .8, "icon-allow-overlap": true, "icon-rotation-alignment": "map", "icon-pitch-alignment": "map"}});
  /* penanda DOM: kotak label gelap per titik; penyulutan = titik merah berdenyut */
  for (const x of D.mk) x.remove();
  D.mk = pts.map((p, i) => { const e = document.createElement("div"); e.className = "s3-pin" + (i ? "" : " s3-nyala");
    e.innerHTML = `<div class="s3-pin-in"><i></i><span class="s3-lb">${i ? "" : "<b>Penyulutan</b>"}${wt(S, p.jam)}</span></div>`;
    e.addEventListener("click", ev => { ev.stopPropagation(); setT(p.jam); });
    return new maplibregl.Marker({element: e, anchor: "center"}).setLngLat([p.lon, p.lat]).addTo(m); });
  redupJalur(S, D.t);
}
function redupJalur(S, t) { /* titik di masa depan (> jam geser) dipudarkan; murah, hanya kelas */
  const pts = D.pts; if (!pts) return; D.mk.forEach((x, i) => x.getElement().classList.toggle("s3-fut", pts[i].jam > t));
}
/* angin: garis arus pendek berjajar di seluruh kisi, arah & panjang dari W.wd/W.ws jam geser (ringan: 121 garis) */
function dataAngin(t) {
  const K = Sim.K, H = D.H; if (!K || !H) return null;
  const h = Math.min(72, Math.floor(t)), ws = H.W.ws[h], to = (H.W.wd[h] + 180) * Math.PI / 180, ex = Math.sin(to), ey = Math.cos(to);
  const n = 11, dx = (K.x1 - K.x0) / n, dy = (K.y1 - K.y0) / n, kx = 111320 * Math.cos((K.y0 + K.y1) / 2 * Math.PI / 180), ky = 110574;
  const pan = Math.min(dx * kx, dy * ky) * .8 * Math.max(.25, Math.min(1, ws / 25)), fs = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const cx = K.x0 + (i + .25 + (j % 2) * .5) * dx, cy = K.y0 + (j + .5) * dy, c = [];
    for (let s = 0; s <= 4; s++) { const f = s / 4 - .5, al = f * pan, off = Math.sin(f * 6.283 + i * 1.7 + j * 2.3) * pan * .08; c.push([cx + (ex * al - ey * off) / kx, cy + (ey * al + ex * off) / ky]); }
    fs.push({type: "Feature", geometry: {type: "LineString", coordinates: c}, properties: {}}); }
  return {type: "FeatureCollection", features: fs};
}
function petaF(t) { /* kerja peta per frame (dipanggil dari rAF): jalur terpecah di jam t, angin per jam */
  const m = Sim.peta; if (!m || !D.H) return;
  const src = m.getSource("s3-jalur"); if (src && D.pts) src.setData(dataJalur(D.pts, t));
  if (F.on && LP.angin.on) { const h = Math.floor(t); if (h !== D.aw) { const s = m.getSource("s3-angin"), d = s && dataAngin(t); if (d) { s.setData(d); D.aw = h; } } }
}
const lapis0 = Sim.pasangLapis;
Sim.pasangLapis = function (...a) {
  const r = lapis0.apply(this, a), m = this.peta;
  if (!m?.getLayer("sim-k")) return r;
  for (const l of ["s3-jalur-l", "s3-jalur-t", "s3-panah", "s3-jalur-f", "s3-jalur", "s3-jalur-bg", "s3-angin", "s3-angin-bg", "s3-puncak", "sim-depan"]) if (m.getLayer(l)) m.removeLayer(l);
  for (const s of ["s3-jalur", "s3-angin", "sim-depan"]) if (m.getSource(s)) m.removeSource(s);
  for (const x of D.mk) x.remove(); D.mk = []; D.pts = null; D.aw = -1;
  atur3D(this);
  if (this.hasil?.[this.lihat] && this.K) {
    D.t = +$("#simT").value;
    m.addSource("sim-depan", {type: "image", url: urlDepan(this, D.t), coordinates: koorKisi(this.K)});
    m.addLayer({id: "sim-depan", type: "raster", source: "sim-depan", paint: {"raster-opacity": 1, "raster-resampling": "nearest", "raster-fade-duration": 0}}, "sim-k");
    pasangJalur(this);
    if (F.on) pasangFT();
  }
  LP.lahan.on = !!this.op.lahanTampil; terapkan(); segarkanLapis();
  return r;
};
const gambar0 = Sim.gambar;
Sim.gambar = function (t, ...a) { /* sudah 1x per frame (rAF di Sim.waktu): satu updateImage tambahan */
  const r = gambar0.call(this, t, ...a), src = this.peta?.getSource("sim-depan");
  if (src && this.hasil?.[this.lihat] && this.K) src.updateImage({url: urlDepan(this, t), coordinates: koorKisi(this.K)});
  return r;
};

/* ---------- 5. data turunan: laju kepala, jarak kepala, ketinggian ---------- */
/* ponytail: <= 60 benih sebagai asal jarak (seperti hitungJalur); jarak kepala jadi sedikit lebih besar bila benih jarang */
function jarakKepala(S, H) {
  let r = D.jh.get(H); if (r) return r;
  const K = S.K, n = K.n, B = K.benih, langkah = Math.ceil(B.length / 60), bs = [], dk = new Float64Array(73), T = H.T;
  for (let q = 0; q < B.length; q += langkah) bs.push([B[q] % n, (B[q] / n) | 0]);
  for (let k = 0; k < T.length; k++) { const t = T[k]; if (!(t <= 72)) continue;
    const i = k % n, j = (k / n) | 0; let d = Infinity; for (const [bi, bj] of bs) { const e = (i - bi) ** 2 + (j - bj) ** 2; if (e < d) d = e; }
    const b = Math.ceil(t), dm = Math.sqrt(d) * K.d; if (dm > dk[b]) dk[b] = dm; }
  for (let h = 1; h <= 72; h++) dk[h] = Math.max(dk[h], dk[h - 1]); /* jarak kepala kumulatif (m) */
  const mentah = Array.from(dk, (v, h) => h ? v - dk[h - 1] : 0); /* m/jam, dirata-ratakan 3 jam: sel 120+ m membuat selisih per jam bergerigi */
  const laju = mentah.map((_, h) => { if (!h) return 0; let s = 0, c = 0; for (let q = h - 1; q <= h + 1; q++) if (q >= 1 && q <= 72) { s += mentah[q]; c++; } return s / c; });
  D.jh.set(H, r = {dk, laju}); return r;
}
/* sfc = konsumsi bahan bakar permukaan (kg/m2): ASUMSI per tipe bahan bakar, bukan keluaran model; hanya untuk panjang nyala indikatif */
const SFC = {gambut: .5, rumput: .35, sabana: .3, semak: 1, hutan: 1.5, kebun: .5};
function lajuT(H, h) { /* laju kepala (m/menit) = maks 16 arah di tabelLaju jam h x faktor kalibrasi; intensitas Byram I = 18000 kJ/kg x sfc x ROS/60 = 300 x sfc x ROS(m/menit) */
  const f = H.W.utama; if (!f) return null;
  let tb = D.tab.get(H); if (!tb) D.tab.set(H, tb = tabelLaju(H.W, Sim.f.properties.bui ?? 40));
  let mx = 0; for (let q = 0; q < 16; q++) mx = Math.max(mx, tb[(h * NF + f) * 16 + q]);
  const ros = mx * (Sim.kal?.m ?? 1), sfc = SFC[FUEL[f - 1]] ?? .5, I = 300 * sfc * ros, L = I > 0 ? .0775 * I ** .46 : 0; /* Byram 1959 */
  return {ros, I, L};
}
const TER = new Map(); /* tile terrarium z12 -> Promise<ImageData|null>, di-cache per sesi */
function ubinTerrarium(z, x, y) {
  const k = `${z}/${x}/${y}`; if (TER.has(k)) return TER.get(k);
  const p = fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${k}.png`).then(r => r.ok ? r.blob() : Promise.reject(r.status)).then(b => createImageBitmap(b))
    .then(bm => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d", {willReadFrequently: true}); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, 256, 256); }).catch(() => null);
  TER.set(k, p); return p;
}
async function elevasi(lon, lat, z = 12) {
  const n = 2 ** z, fx = (lon + 180) / 360 * n, r = lat * Math.PI / 180, fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n, x = Math.floor(fx), y = Math.floor(fy);
  const im = await ubinTerrarium(z, x, y); if (!im) return null;
  const o = (Math.min(255, Math.floor((fy - y) * 256)) * 256 + Math.min(255, Math.floor((fx - x) * 256))) * 4, d = im.data;
  return d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768;
}
function profil(H) { /* ketinggian sepanjang jalur kepala api: ~48 sampel, km kumulatif vs m dpl */
  let pr = D.prof.get(H); if (pr) return pr;
  pr = (async () => {
    const pts = jalurH(Sim, H); if (!pts || pts.length < 2) return null;
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + km(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon));
    const L = cum[cum.length - 1], N = 48, at = [];
    for (let s = 0; s < N; s++) { const d = L * s / (N - 1); let i = 1; while (i < pts.length - 1 && cum[i] < d) i++; const f = cum[i] > cum[i - 1] ? (d - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0; at.push({km: d, lon: pts[i - 1].lon + (pts[i].lon - pts[i - 1].lon) * f, lat: pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * f}); }
    const z = await Promise.all(at.map(p => elevasi(p.lon, p.lat))), ok = at.map((p, i) => z[i] == null ? null : {km: p.km, z: z[i]}).filter(Boolean);
    return ok.length > 1 ? {pts: ok, L, cum, jalur: pts} : null;
  })();
  D.prof.set(H, pr); return pr;
}
const kmT = (pr, t) => { const pt = pr.jalur, c = pr.cum; if (t <= pt[0].jam) return 0; for (let i = 1; i < pt.length; i++) if (t <= pt[i].jam) return c[i - 1] + (c[i] - c[i - 1]) * (t - pt[i - 1].jam) / (pt[i].jam - pt[i - 1].jam); return c[c.length - 1]; };

/* ---------- 6. dasbor (tampilan lama) & komponen timeline bersama ---------- */
const GW = 220, GH = 100;
function kerangka(judul, pl, pr, isi, nama) {
  return `<figure class="s3-fig"><span class="s3-pill s3-jdl">${judul}</span><svg class="s3-g" viewBox="0 0 ${GW} ${GH}" role="img" aria-label="${nama}">${isi}
    <line class="s3-kursor" data-pl="${pl}" data-pw="${GW - pl - pr}" x1="${pl}" x2="${pl}" y1="8" y2="${GH - 16}"/></svg></figure>`;
}
function grafikLuas(S, H) {
  const pl = 34, pr = 6, pt = 12, pb = 16, ymax = Math.max(1, H.luas.hi[72]), X = h => pl + h / 72 * (GW - pl - pr), Y = v => pt + (1 - v / ymax) * (GH - pt - pb);
  const gs = a => Array.from(a, (v, h) => `${h ? "L" : "M"}${X(h).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const pita = gs(H.luas.hi) + Array.from(H.luas.lo, (_, h) => `L${X(72 - h).toFixed(1)},${Y(H.luas.lo[72 - h]).toFixed(1)}`).join("") + "Z";
  return kerangka("Luas terbakar (ha)", pl, pr, `${[0, 1].map(f => `<line x1="${pl}" x2="${GW - pr}" y1="${Y(ymax * f)}" y2="${Y(ymax * f)}"/><text x="${pl - 3}" y="${Y(ymax * f) + 3}" text-anchor="end">${rb(ymax * f)}</text>`).join("")}
    ${[0, 24, 48, 72].map(h => `<text x="${X(h)}" y="${GH - 4}" text-anchor="middle">${h} j</text>`).join("")}
    <path d="${pita}" fill="${H.s.w}" opacity=".2"/><path d="${gs(H.luas.mid)}" fill="none" stroke="${H.s.w}" stroke-width="2"/>
    <text class="v" x="${X(72)}" y="${Math.max(10, Y(H.luas.mid[72]) - 4)}" text-anchor="end">${fmt(nol(H.luas.mid[72]))} ha</text>`, "Luas terbakar kumulatif terhadap jam, pita rendah sampai tinggi");
}
const lajuDari = H => Array.from({length: 73}, (_, h) => h ? Math.max(0, H.luas.mid[h] - H.luas.mid[h - 1]) : 0);
function grafikLaju(S, H) {
  const pl = 34, pr = 6, pt = 12, pb = 16, L = lajuDari(H), mx = Math.max(...L), ymax = Math.max(mx, 1e-6), X = h => pl + h / 72 * (GW - pl - pr), Y = v => pt + (1 - v / ymax) * (GH - pt - pb), bw = (GW - pl - pr) / 72 * .8;
  const ip = L.indexOf(mx);
  return kerangka("Laju pertumbuhan (ha/jam)", pl, pr, `${[0, 1].map(f => `<line x1="${pl}" x2="${GW - pr}" y1="${Y(ymax * f)}" y2="${Y(ymax * f)}"/><text x="${pl - 3}" y="${Y(ymax * f) + 3}" text-anchor="end">${rb(ymax * f)}</text>`).join("")}
    ${[0, 24, 48, 72].map(h => `<text x="${X(h)}" y="${GH - 4}" text-anchor="middle">${h} j</text>`).join("")}
    ${L.map((v, h) => h && v > 0 ? `<rect x="${(X(h) - bw / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(GH - pb - Y(v)).toFixed(1)}" fill="#e58a45"/>` : "").join("")}
    ${mx > 0 ? `<text class="v" x="${X(ip)}" y="${Math.max(10, Y(mx) - 3)}" text-anchor="${ip > 40 ? "end" : "start"}">${fmt(nol(mx))} ha/jam</text>` : ""}`, "Pertambahan luas terbakar per jam");
}
function grafikCuaca(S, H) {
  const pl = 28, pr = 28, pt = 14, pb = 16, W = H.W, wmax = Math.max(5, Math.ceil(Math.max(...W.ws) / 5) * 5), hmax = Math.max(3, ...W.hujan), X = h => pl + h / 72 * (GW - pl - pr);
  const Yw = v => pt + (1 - v / wmax) * (GH - pt - pb), Yr = v => pt + (1 - v / 100) * (GH - pt - pb), ph = (GH - pt - pb) * .3, bw = (GW - pl - pr) / 72 * .8;
  const gs = (a, Y) => Array.from({length: 73}, (_, h) => `${h ? "L" : "M"}${X(h).toFixed(1)},${Y(a[h]).toFixed(1)}`).join("");
  return kerangka("Cuaca", pl, pr, `<line x1="${pl}" x2="${GW - pr}" y1="${Yw(0)}" y2="${Yw(0)}"/><line x1="${pl}" x2="${GW - pr}" y1="${Yw(wmax)}" y2="${Yw(wmax)}"/>
    <text x="${pl - 3}" y="${Yw(wmax) + 3}" text-anchor="end" fill="#e58a45">${wmax}</text><text x="${pl - 3}" y="${Yw(0) + 3}" text-anchor="end" fill="#e58a45">0</text>
    <text x="${GW - pr + 3}" y="${Yr(100) + 3}" fill="#5f6fb0">100</text><text x="${GW - pr + 3}" y="${Yr(0) + 3}" fill="#5f6fb0">0</text>
    ${[0, 24, 48, 72].map(h => `<text x="${X(h)}" y="${GH - 4}" text-anchor="middle">${h} j</text>`).join("")}
    ${W.hujan.map((v, h) => v >= .1 ? `<rect x="${(X(h) - bw / 2).toFixed(1)}" y="${(GH - pb - v / hmax * ph).toFixed(1)}" width="${bw.toFixed(1)}" height="${(v / hmax * ph).toFixed(1)}" fill="#4f8fc4" opacity="${v >= 3 ? .95 : .5}"/>` : "").join("")}
    <path d="${gs(W.rh, Yr)}" fill="none" stroke="#5f6fb0" stroke-width="1.6"/><path d="${gs(W.ws, Yw)}" fill="none" stroke="#e58a45" stroke-width="1.8"/>
    <text x="${pl}" y="9" fill="#e58a45" class="v">Angin km/j</text><text x="${pl + 52}" y="9" fill="#5f6fb0" class="v">RH %</text><text x="${pl + 80}" y="9" fill="#4f8fc4" class="v">Hujan ${W.hujan.some(v => v >= .1) ? fmt(Math.round(Math.max(...W.hujan) * 10) / 10) + " mm maks" : "mm"}</text>`, "Angin, kelembapan relatif, dan hujan per jam");
}
/* kejadian kunci: semua dari hasil Sim; jam = jam integer di slider */
function kejadian(S, H) {
  const ev = [{jam: 0, n: "Penyulutan", d: "titik awal api", w: "#c9503a"}], L = lajuDari(H), mx = Math.max(...L), n = S.K.n;
  if (mx > 0) ev.push({jam: L.indexOf(mx), n: "Pertumbuhan tercepat", d: `${fmt(nol(mx))} ha/jam`, w: "#e58a45"});
  const d0 = H.desa[0]; if (d0) ev.push({jam: Math.min(72, Math.ceil(d0.eta)), n: "Desa pertama tercapai", d: `${d0.nama}, ± ${fmt(Math.round(d0.km * 10) / 10)} km`, w: "#8a4a3a", esc: 1});
  const hj = H.W.hujan.findIndex(v => v >= 3); if (hj >= 0) ev.push({jam: hj, n: "Hujan ≥ 3 mm pertama", d: `${fmt(Math.round(H.W.hujan[hj] * 10) / 10)} mm`, w: "#4f8fc4"});
  if (H.tahan != null) ev.push({jam: Math.min(72, Math.round(H.tahan)), n: "Tertahan", d: "garis kendali menutup api", w: "#5a9e74"});
  if (H.tepi) { let mn = Infinity; for (let k = 0; k < H.T.length; k++) { const i = k % n, j = (k / n) | 0; if ((i < 2 || j < 2 || i > n - 3 || j > n - 3) && H.T[k] < mn) mn = H.T[k]; }
    if (mn <= 72) ev.push({jam: Math.ceil(mn), n: "Mencapai tepi kisi", d: "luas sebenarnya bisa lebih besar", w: "#a8842e"}); }
  return ev.sort((a, b) => a.jam - b.jam);
}
const kjHTML = (S, ev) => `<span class="s3-pill s3-jdl">Kejadian kunci</span>` + ev.map(e => `<button type="button" class="s3-kjb" data-jam="${e.jam}" style="--w:${e.w}"><i></i><span class="s3-kn">${e.n}</span><span class="s3-kd">+${e.jam} j · ${wib(S, e.jam)}</span><span class="s3-kv">${e.esc ? esc(e.d) : e.d}</span></button>`).join("");
function tandaiKj(t) { document.querySelectorAll(".s3-kjb").forEach(b => b.classList.toggle("on", +b.dataset.jam <= t && !(b.nextElementSibling && +b.nextElementSibling.dataset.jam <= t))); }
function ticksHTML(S, H, ev) { /* label hari+jam WIB tiap 6 jam (hari tebal di 00:00), penanda kejadian berwarna, pita laju tumbuh di lintasan */
  const L = lajuDari(H), mx = Math.max(...L, 1e-6), band = `linear-gradient(90deg,${L.map((v, h) => `rgba(201,80,58,${(.06 + .8 * v / mx).toFixed(2)}) ${(h / 72 * 100).toFixed(1)}%`).join(",")})`;
  let o = `<i class="s3-band" style="background:${band}"></i>` + ev.map(e => `<button type="button" class="s3-mk" data-jam="${e.jam}" style="--f:${e.jam / 72};--w:${e.w}" title="${e.n}, +${e.jam} j" aria-label="${e.n}, +${e.jam} jam"></button>`).join("");
  for (let h = 0; h <= 72; h++) { const q = wp(S, h); if (q.h % 6) continue; o += `<span class="s3-tk${q.h % 12 ? " s" : ""}${h === 0 ? " a0" : h === 72 ? " a1" : ""}" style="--f:${h / 72}"><em>${q.h === 0 ? q.tg : ""}</em><small>${q.jam}</small></span>`; }
  return o;
}
function bangun(S, H) {
  D.H = H; D.mulai = S.cuaca.mulai;
  $("#s3Gr").innerHTML = grafikLuas(S, H) + grafikLaju(S, H) + grafikCuaca(S, H);
  const ev = D.ev = kejadian(S, H);
  $("#s3Kj").innerHTML = kjHTML(S, ev);
  $("#s3Tks").innerHTML = ticksHTML(S, H, ev);
  $("#s3TlRg").textContent = `${wt(S, 0)} – ${wt(S, 72)} WIB`;
  if (D.buka == null) D.buka = innerWidth > 900;
  $("#s3Dash").hidden = !D.buka; $("#s3Tog").setAttribute("aria-pressed", D.buka);
}
function kursor(t) { /* hanya memindah garis kursor & chip; SVG tidak dibangun ulang */
  document.querySelectorAll("#s3Gr .s3-kursor").forEach(l => { const x = +l.dataset.pl + t / 72 * +l.dataset.pw; l.setAttribute("x1", x); l.setAttribute("x2", x); });
  const c = $("#s3Chip"); if (c && Sim.cuaca) { const f = t / 72; c.textContent = wt(Sim, t); c.style.left = `calc(8px + (100% - 16px) * ${f})`; c.style.transform = `translateX(${f > .9 ? "-100%" : f < .1 ? "0" : "-50%"})`; }
  tandaiKj(t);
}

/* ---------- 7. MODE FORENSIK: bar insiden, tab, panel kanan, timeline, grafik ---------- */
function ctx() {
  const H = Sim.hasil?.[Sim.lihat] ?? null, K = Sim.K;
  return {Sim, H, K, W: H?.W ?? null, t: +$("#simT").value, mulai: Sim.cuaca?.mulai ?? null, peta: Sim.peta,
    ll: k => [K.x0 + ((k % K.n) + .5) / K.n * (K.x1 - K.x0), K.y0 + (((k / K.n) | 0) + .5) / K.n * (K.y1 - K.y0)],
    jamKe: t => new Date(Sim.cuaca.mulai.getTime() + t * 36e5), el: F.el};
}
function segarkanBar() {
  const p = Sim.f?.properties; if (!p) return; const titik = Sim.k === "titik";
  $("#s3Nm").textContent = titik ? "Insiden simulasi" : `Kompleks ${p.kec}`;
  $("#s3Lok").innerHTML = `${ik(P.pin, 13)}<span>${esc(titik ? p.kab : `${p.kec}, ${p.kab}`)}</span>`;
  if (Sim.cuaca) $("#s3Rg").innerHTML = `${ik(P.kal, 13)}<span>${wt(Sim, 0)} – ${wt(Sim, 72)} WIB</span>`;
}
function segarkanTabs() {
  const c = ctx();
  $("#s3Tabs").innerHTML = [...F.tabs.values()].map(t => { const n = aman(() => t.lencana?.(c));
    return `<button type="button" role="tab" data-tab="${esc(t.id)}" aria-selected="${t.id === F.aktif}">${t.ikon || ""}<span>${esc(t.nama)}</span>${n ? `<i class="s3-bdg">${esc(n)}</i>` : ""}</button>`; }).join("");
}
function pilihTab(id) {
  const t = F.tabs.get(id); if (!t) return;
  const lama = F.tabs.get(F.terbuka); if (lama) aman(() => lama.tutup?.(ctx()));
  F.el.kanan.replaceChildren(); F.el.bawah.replaceChildren();
  F.aktif = SimFT.aktif = id; F.terbuka = id;
  aman(() => t.buka?.(ctx())); aman(() => t.waktu?.(+$("#simT").value, ctx())); segarkanTabs();
}
function masukF(baru) {
  if (F.on || !D.H || !Sim.peta) return;
  F.on = true; hal.classList.add("s3f"); $("#s3Tl").append(wk);
  if (!D.user2d) mode(true, null);
  segarkanBar();
  for (const t of F.tabs.values()) aman(() => t.hasilBaru?.(ctx()));
  pilihTab(F.tabs.has(F.aktif) ? F.aktif : "insiden");
  requestAnimationFrame(() => { const m = Sim.peta; if (!m || !F.on) return; m.resize(); pasangFT(); terapkan(); petaF(D.t); if (baru) kamera(); });
}
function keluarF() {
  const t = F.tabs.get(F.terbuka); if (t) aman(() => t.tutup?.(ctx()));
  F.on = false; F.terbuka = null; F.el.kanan.replaceChildren(); F.el.bawah.replaceChildren();
  hal.classList.remove("s3f", "s3-pa", "s3-kn"); hal.append(wk);
  const m = Sim.peta; if (m) { for (const l of ["s3-puncak", "s3-angin", "s3-angin-bg"]) if (m.getLayer(l)) m.removeLayer(l); if (m.getSource("s3-angin")) m.removeSource("s3-angin"); requestAnimationFrame(() => m.resize()); }
}
const aturPa = on => { hal.classList.toggle("s3-pa", on); $("#s3Gear").setAttribute("aria-pressed", on); };
function hasilBaruF(objBaru) {
  if (!F.on) { if (!D.keluar) masukF(objBaru); return; }
  for (const t of F.tabs.values()) aman(() => t.hasilBaru?.(ctx()));
  segarkanBar(); segarkanTabs(); if (objBaru) requestAnimationFrame(kamera);
}
/* peta khusus forensik: kompas, skala metrik, 2D|3D + pembesaran, layar penuh, label puncak, lapis angin */
class KontrolFT {
  onAdd(m) { this.m = m; const c = this._c = document.createElement("div"); c.className = "maplibregl-ctrl s3-grp";
    c.innerHTML = `<div class="s3-m s3-seg" role="group" aria-label="Tampilan peta"><button type="button" data-m="2d" aria-pressed="${!T3.d3}">2D</button><button type="button" data-m="3d" aria-pressed="${T3.d3}">3D</button></div>
      <select class="s3-zm" aria-label="Pembesaran peta"><option value="">1×</option>${[1, 2, 4, 8].map(v => `<option value="${v}">${v}×</option>`).join("")}</select>`;
    c.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) mode(b.dataset.m === "3d", null); });
    c.querySelector("select").addEventListener("change", e => { if (e.target.value) m.easeTo({zoom: (D.zb ?? m.getZoom()) + Math.log2(+e.target.value), duration: 600}); e.target.selectedIndex = 0; });
    const lbl = () => { c.querySelector("option").textContent = fmt(Math.round(2 ** (m.getZoom() - (D.zb ?? m.getZoom())) * 10) / 10) + "×"; };
    m.on("zoom", lbl); lbl(); return c; }
  onRemove() { this._c.remove(); }
}
function pasangFT() {
  const m = Sim.peta; if (!m || !F.on) return;
  if (!m._s3k) { m._s3k = 1;
    const add = (c, pos) => { m.addControl(c, pos); (c._container || c._c)?.classList.add("s3-ctl-f"); };
    add(new maplibregl.NavigationControl({showCompass: true, showZoom: false, visualizePitch: true}), "top-left");
    add(new maplibregl.ScaleControl({maxWidth: 110, unit: "metric"}), "bottom-right");
    add(new maplibregl.FullscreenControl({container: hal}), "bottom-right");
    add(new KontrolFT(), "bottom-right"); }
  gambarIkon(m);
  if (m.getSource("openmaptiles") && !m.getLayer("s3-puncak")) aman(() => m.addLayer({id: "s3-puncak", type: "symbol", source: "openmaptiles", "source-layer": "mountain_peak", minzoom: 8, filter: ["has", "name"],
    layout: {"icon-image": "s3-seg", "icon-size": .5, "icon-anchor": "bottom", "text-field": ["format", ["get", "name"], {}, "\n", {}, ["concat", ["number-format", ["to-number", ["get", "ele"], 0], {locale: "id-ID"}], " m"], {"font-scale": .88}],
      "text-font": ["Noto Sans Bold"], "text-size": 11.5, "text-anchor": "top", "text-offset": [0, .1], "symbol-sort-key": ["*", -1, ["to-number", ["get", "ele"], 0]]},
    paint: {"text-color": "#fff", "text-halo-color": "rgba(29,29,29,.85)", "text-halo-width": 1.4}}));
  if (D.H && !m.getSource("s3-angin")) { m.addSource("s3-angin", {type: "geojson", data: dataAngin(D.t) || {type: "FeatureCollection", features: []}});
    const ke = m.getLayer("s3-jalur-bg") ? "s3-jalur-bg" : undefined, ly = {"line-cap": "round", "line-join": "round"};
    m.addLayer({id: "s3-angin-bg", type: "line", source: "s3-angin", paint: {"line-color": "#000", "line-width": 2.8, "line-opacity": .3}, layout: ly}, ke);
    m.addLayer({id: "s3-angin", type: "line", source: "s3-angin", paint: {"line-color": "#fff", "line-width": 1.3, "line-opacity": .85}, layout: ly}, ke); D.aw = Math.floor(D.t); }
  terapkan();
}
function kamera() { /* terbang ke api, pitch 60 lalu putar pelan sekali; hormati prefers-reduced-motion */
  const m = Sim.peta, H = D.H, K = Sim.K; if (!m || !H || !K) return;
  const n = K.n; let i0 = n, i1 = -1, j0 = n, j1 = -1;
  for (let k = 0; k < H.T.length; k++) if (H.T[k] <= 72) { const i = k % n, j = (k / n) | 0; if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
  if (i1 < 0) return;
  const lo = [K.x0 + i0 / n * (K.x1 - K.x0), K.y0 + j0 / n * (K.y1 - K.y0)], hi = [K.x0 + (i1 + 1) / n * (K.x1 - K.x0), K.y0 + (j1 + 1) / n * (K.y1 - K.y0)];
  const jl = D.pts, bearing = jl && jl.length > 1 ? (Math.atan2((jl[jl.length - 1].lon - jl[0].lon) * Math.cos(jl[0].lat * Math.PI / 180), jl[jl.length - 1].lat - jl[0].lat) * 180 / Math.PI + 360) % 360 : 0;
  m.resize(); const cam = m.cameraForBounds([lo, hi], {padding: 70, maxZoom: 14}), gerak = !matchMedia("(prefers-reduced-motion: reduce)").matches, tok = ++D.kam;
  if (!cam) return; D.zb = cam.zoom;
  if (!T3.d3) { m.fitBounds([lo, hi], {padding: 70, maxZoom: 14, duration: gerak ? 900 : 0}); return; }
  const o = {center: cam.center, zoom: Math.max(8, cam.zoom - .3), pitch: 60, bearing};
  if (!gerak) return void m.jumpTo(o);
  m.flyTo({...o, duration: 2800, essential: false});
  m.once("moveend", e => { if (e.originalEvent || tok !== D.kam) return; m.once("dragstart", () => m.stop()); m.easeTo({bearing: bearing + 30, duration: 9000, easing: x => x}); });
}
/* lapisan panel kanan */
const THM = ["medan", "citra", "bekas", "depan", "jalur", "angin", "desa", "lahan"];
function nyala(k) { return k === "medan" ? T3.d3 : k === "citra" ? T3.d3 && T3.citra : k === "lahan" ? !!Sim.op.lahanTampil : LP[k].on; }
const htmlLapis = () => THM.map(k => `<div class="s3-ly"><label class="s3-cb"><input type="checkbox" data-c="${k}" ${nyala(k) ? "checked" : ""} ${k === "citra" && !T3.d3 ? "disabled" : ""}><span class="s3-th s3-th-${k}"></span><span class="s3-ln">${LP[k].n}</span></label>
  <input type="range" class="s3-op" data-o="${k}" min="0" max="100" step="5" value="${LP[k].op}" aria-label="Keburaman ${LP[k].n}"><span class="s3-pc">${LP[k].op}%</span></div>`).join("");
function segarkanLapis() { document.querySelectorAll("#s3Kanan [data-c]").forEach(c => { c.checked = nyala(c.dataset.c); c.disabled = c.dataset.c === "citra" && !T3.d3; }); }
function aturLapis(k, on) {
  if (k === "medan") return mode(on, null);
  if (k === "citra") return T3.d3 && mode(null, on);
  if (k === "lahan") { const c = $("#simLT"); if (c) { c.checked = on; c.dispatchEvent(new Event("change")); } return; }
  LP[k].on = on; tunda();
}
/* tab "Insiden": panel kanan (lapisan, ringkasan, cuaca & perilaku api) + bawah (3 grafik, kejadian kunci) */
const I = {r: null, up: []};
const SEG = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"], arah8 = d => SEG[Math.round(((d || 0) % 360) / 45) % 8];
const idInsiden = (p, titik) => titik ? `SIM-${Math.abs(p.lat).toFixed(2)}${p.lat < 0 ? "S" : "N"}-${Math.abs(p.lon).toFixed(2)}${p.lon < 0 ? "W" : "E"}` : p.id;
function lay(id, judul, isi, nama) { return `<figure class="s3-fig" id="${id}"><span class="s3-pill s3-jdl">${judul}</span><svg class="s3-g s3-gf" viewBox="0 0 300 122" role="img" aria-label="${nama}">${isi}</svg></figure>`; }
const PL = 38, PR = 8, PT = 14, PB = 18, FW = 300, FH = 122, FX = h => PL + h / 72 * (FW - PL - PR);
const bagus = v => { const e = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9))), f = v / e; return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => s >= f * .999) ?? 10) * e; };
const sumbuY = (ymax, Y, fmtv) => [0, .5, 1].map(f => `<line x1="${PL}" x2="${FW - PR}" y1="${Y(ymax * f).toFixed(1)}" y2="${Y(ymax * f).toFixed(1)}"/><text x="${PL - 3}" y="${(Y(ymax * f) + 3).toFixed(1)}" text-anchor="end">${fmtv(ymax * f)}</text>`).join("");
const gp = (a, X, Y) => Array.from(a, (v, h) => `${h ? "L" : "M"}${X(h).toFixed(1)},${Y(v).toFixed(1)}`).join(""); /* Array.from: .map pada Float32Array mengembalikan typed array (NaN) */
const klip = (id, x0, x1) => { const r = document.querySelector(`#${id} rect`); if (r) { r.setAttribute("x", x0); r.setAttribute("width", Math.max(0, x1 - x0)); } };
function grafikFLuas(S, H) {
  const ymax = bagus(Math.max(1, H.luas.hi[72])), Y = v => PT + (1 - v / ymax) * (FH - PT - PB), ln = gp(H.luas.mid, FX, Y), ar = `${ln}L${FX(72)},${Y(0)}L${FX(0)},${Y(0)}Z`, w = H.s.w;
  const isi = `<defs><clipPath id="s3cl1"><rect x="0" y="0" width="${PL}" height="${FH}"/></clipPath></defs>${sumbuY(ymax, Y, rb)}
    ${[0, 24, 48, 72].map(h => `<text x="${FX(h)}" y="${FH - 4}" text-anchor="${h ? h === 72 ? "end" : "middle" : "start"}">${wp(S, h).tg}</text>`).join("")}
    <path d="${ar}" fill="${w}" opacity=".16"/><path d="${ar}" fill="${w}" opacity=".5" clip-path="url(#s3cl1)"/><path d="${ln}" fill="none" stroke="${w}" stroke-width="2"/>
    <text class="v" x="${FX(72) - 3}" y="${Math.max(11, Y(H.luas.mid[72]) - 5)}" text-anchor="end">${fmt(bulat(H.luas.mid[72]))} ha</text>
    <line class="s3-kursor" y1="${PT}" y2="${FH - PB}"/><circle class="s3-dot" r="3.6" fill="${w}"/>`;
  return {html: lay("s3FigA", "Luas terbakar (ha)", isi, "Luas terbakar kumulatif terhadap jam"), pasang(el) { const k = el.querySelector("#s3FigA .s3-kursor"), d = el.querySelector("#s3FigA .s3-dot");
    return t => { const x = FX(t), v = H.luas.mid[Math.min(72, Math.ceil(t))]; klip("s3cl1", 0, x); k.setAttribute("x1", x); k.setAttribute("x2", x); d.setAttribute("cx", x); d.setAttribute("cy", Y(v)); }; }};
}
function grafikFLaju(S, H) {
  const L = jarakKepala(S, H).laju, mx = Math.max(...L), ymax = bagus(Math.max(mx, 1)), Y = v => PT + (1 - v / ymax) * (FH - PT - PB), ln = gp(L, FX, Y), ip = L.indexOf(mx), w = "#c9503a";
  const isi = `<defs><clipPath id="s3cl2"><rect x="0" y="0" width="${PL}" height="${FH}"/></clipPath><clipPath id="s3cl3"><rect x="${PL}" y="0" width="${FW}" height="${FH}"/></clipPath></defs>${sumbuY(ymax, Y, v => fmt(nol(v)))}
    ${[0, 24, 48, 72].map(h => `<text x="${FX(h)}" y="${FH - 4}" text-anchor="${h ? h === 72 ? "end" : "middle" : "start"}">${wp(S, h).tg}</text>`).join("")}
    <path d="${ln}L${FX(72)},${Y(0)}L${FX(0)},${Y(0)}Z" fill="${w}" opacity=".16" clip-path="url(#s3cl2)"/><path d="${ln}" fill="none" stroke="${w}" stroke-width="2" clip-path="url(#s3cl2)"/>
    <path d="${ln}" fill="none" stroke="${w}" stroke-width="1.6" stroke-dasharray="3 3" opacity=".7" clip-path="url(#s3cl3)"/>
    ${mx > 0 ? `<text class="v" x="${FX(ip)}" y="${Math.max(11, Y(mx) - 4)}" text-anchor="${ip > 40 ? "end" : "start"}">${fmt(nol(mx))} m/jam</text>` : ""}
    <line class="s3-kursor" y1="${PT}" y2="${FH - PB}"/><circle class="s3-dot" r="3.6" fill="${w}"/>`;
  return {html: lay("s3FigB", "Laju sebaran (m/jam, kepala api)", isi, "Laju sebaran kepala api per jam, padat sampai jam geser lalu putus-putus"), pasang(el) { const k = el.querySelector("#s3FigB .s3-kursor"), d = el.querySelector("#s3FigB .s3-dot");
    return t => { const x = FX(t); klip("s3cl2", 0, x); klip("s3cl3", x, FW); k.setAttribute("x1", x); k.setAttribute("x2", x); d.setAttribute("cx", x); d.setAttribute("cy", Y(L[Math.min(72, Math.round(t))])); }; }};
}
function grafikFElev(pr) { /* profil ketinggian: km sepanjang jalur kepala api (x) vs m dpl (y); titik = posisi api di jam geser */
  const zs = pr.pts.map(p => p.z), zmin = Math.floor(Math.min(...zs) / 50) * 50, zmax = Math.max(zmin + 50, Math.ceil(Math.max(...zs) / 50) * 50), Lk = pr.pts[pr.pts.length - 1].km || 1;
  const X = k => PL + k / Lk * (FW - PL - PR), Y = z => PT + (1 - (z - zmin) / (zmax - zmin)) * (FH - PT - PB), ln = pr.pts.map((p, i) => `${i ? "L" : "M"}${X(p.km).toFixed(1)},${Y(p.z).toFixed(1)}`).join(""), w = "#5a9e74";
  const zat = k => { const q = pr.pts; let i = 1; while (i < q.length - 1 && q[i].km < k) i++; const f = q[i].km > q[i - 1].km ? Math.max(0, Math.min(1, (k - q[i - 1].km) / (q[i].km - q[i - 1].km))) : 0; return q[i - 1].z + (q[i].z - q[i - 1].z) * f; };
  const isi = `<defs><clipPath id="s3cl4"><rect x="0" y="0" width="${PL}" height="${FH}"/></clipPath></defs>
    ${[0, .5, 1].map(f => { const z = zmin + (zmax - zmin) * f; return `<line x1="${PL}" x2="${FW - PR}" y1="${Y(z).toFixed(1)}" y2="${Y(z).toFixed(1)}"/><text x="${PL - 3}" y="${(Y(z) + 3).toFixed(1)}" text-anchor="end">${fmt(nol(z))}</text>`; }).join("")}
    ${[0, .5, 1].map(f => `<text x="${X(Lk * f)}" y="${FH - 4}" text-anchor="${f ? f === 1 ? "end" : "middle" : "start"}">${fmt(Math.round(Lk * f * 10) / 10)} km</text>`).join("")}
    <path d="${ln}L${X(Lk)},${Y(zmin)}L${X(0)},${Y(zmin)}Z" fill="${w}" opacity=".16"/><path d="${ln}L${X(Lk)},${Y(zmin)}L${X(0)},${Y(zmin)}Z" fill="${w}" opacity=".5" clip-path="url(#s3cl4)"/>
    <path d="${ln}" fill="none" stroke="${w}" stroke-width="2"/><line class="s3-kursor" y1="${PT}" y2="${FH - PB}"/><circle class="s3-dot" r="3.6" fill="#c9503a"/>`;
  return {html: lay("s3FigC", "Profil ketinggian (m dpl)", isi, "Profil ketinggian sepanjang jalur kepala api"), pasang(el) { const k = el.querySelector("#s3FigC .s3-kursor"), d = el.querySelector("#s3FigC .s3-dot");
    return t => { const kk = kmT(pr, t), x = X(kk); klip("s3cl4", 0, x); k.setAttribute("x1", x); k.setAttribute("x2", x); d.setAttribute("cx", x); d.setAttribute("cy", Y(zat(kk))); }; }};
}
function isiInsiden(c) {
  const H = c.H, p = c.Sim.f?.properties; if (!H || !p || !c.Sim.cuaca) return;
  const titik = c.Sim.k === "titik", L = H.luas, S = c.Sim, kv = (a, b, id) => `<dt>${a}</dt><dd${id ? ` id="${id}"` : ""}>${b}</dd>`;
  const ws = SKEN.filter(s => S.hasil[s.id]);
  c.el.kanan.innerHTML = `<section class="s3-sec"><h3>${ik(P.lapis)}Lapisan</h3><div class="s3-lyl">${htmlLapis()}</div></section>
    <section class="s3-sec"><h3>${ik(P.info)}Ringkasan insiden</h3><dl class="s3-kv2">
      ${kv("Nama", titik ? "Insiden simulasi" : `Kompleks ${esc(p.kec)}`)}${kv("ID", esc(idInsiden(p, titik)))}${kv("Lokasi", esc(titik ? p.kab : `${p.kec}, ${p.kab}`))}
      ${kv("Mulai", `${wt(S, 0)} WIB`)}${kv("Selesai simulasi", `${wt(S, 72)} WIB <small>(+72 j)</small>`)}
      ${kv("Luas total", `<b>${fmt(bulat(L.mid[72]))} ha</b> <small>${fmt(bulat(L.lo[72]))}–${fmt(bulat(L.hi[72]))}</small>`)}${kv("Penyebab", "Simulasi")}
      ${kv("Status analisis", `<span class="s3-st"><i></i><span id="s3Stat">${S.basi ? "Pengaturan berubah, jalankan ulang" : "Hasil model, belum divalidasi"}</span></span>`)}</dl>
      <div class="s3-sk" role="group" aria-label="Skenario yang dilihat">${ws.map(s => `<button type="button" data-sk="${s.id}" aria-pressed="${s.id === S.lihat}" style="--w:${s.w}"><i></i>${esc(s.n)}</button>`).join("")}</div></section>
    <section class="s3-sec"><h3>${ik(P.api)}Cuaca &amp; perilaku api <small id="s3wJam"></small></h3><div class="s3-wg">
      ${[["ang", P.angin, "Angin"], ["suhu", P.suhu, "Suhu"], ["rh", P.tetes, "RH"], ["ff", P.daun, "FFMC"], ["laju", P.laju, "Laju kepala"], ["nyala", P.api, "Panjang nyala"]]
        .map(([k, d, n]) => `<div class="s3-wt"><span class="s3-wn">${ik(d, 12)}${n}</span><b id="s3w-${k}">–</b><small id="s3w-${k}s"></small></div>`).join("")}</div>
      <p class="s3-cat">Laju kepala = tabel laju mesin × kalibrasi, bahan bakar di benih. Panjang nyala: Byram dari asumsi konsumsi bahan bakar tipe itu, indikatif.</p></section>`;
  I.r = Object.fromEntries(["ang", "angs", "suhu", "suhus", "rh", "rhs", "ff", "ffs", "laju", "lajus", "nyala", "nyalas"].map(k => [k, c.el.kanan.querySelector("#s3w-" + k)]));
  I.r.jam = c.el.kanan.querySelector("#s3wJam");
  c.el.bawah.innerHTML = `<div class="s3-fd"><div class="s3-fgr" id="s3FGr"></div><div class="s3-fkj" id="s3FKj">${kjHTML(S, D.ev)}</div></div>`;
  const gr = c.el.bawah.querySelector("#s3FGr"), a = grafikFLuas(S, H), b = grafikFLaju(S, H);
  gr.innerHTML = a.html + b.html + lay("s3FigC", "Profil ketinggian (m dpl)", `<text class="v" x="${FW / 2}" y="${FH / 2}" text-anchor="middle">Memuat ketinggian…</text>`, "Profil ketinggian sepanjang jalur kepala api");
  I.up = [a.pasang(gr), b.pasang(gr)];
  profil(H).then(pr => { if (D.H !== H || !gr.isConnected) return; const f = pr ? grafikFElev(pr) : null;
    gr.querySelector("#s3FigC").outerHTML = f ? f.html : lay("s3FigC", "Profil ketinggian (m dpl)", `<text x="${FW / 2}" y="${FH / 2}" text-anchor="middle">Ketinggian tidak tersedia</text>`, "Profil ketinggian tidak tersedia");
    if (f) { I.up.push(f.pasang(gr)); perbaruiInsiden(+$("#simT").value, ctx()); } });
  perbaruiInsiden(c.t, c);
}
function perbaruiInsiden(t, c) { /* hanya teks & kursor; tak ada SVG baru */
  const H = c.H, r = I.r; if (!H || !r) return; const h = Math.min(72, Math.floor(t)), W = H.W, lj = aman(() => lajuT(H, h));
  r.jam.textContent = wt(c.Sim, h) + " WIB";
  r.ang.textContent = `${fmt(nol(W.ws[h]))} km/j`; r.angs.textContent = `dari ${arah8(W.wd[h])} (${nol(W.wd[h])}°)`;
  r.suhu.textContent = `${fmt(nol(W.tc[h]))} °C`; r.suhus.textContent = "";
  r.rh.textContent = `${fmt(nol(W.rh[h]))} %`; r.rhs.textContent = W.hujan[h] >= .1 ? `hujan ${fmt(Math.round(W.hujan[h] * 10) / 10)} mm` : "";
  r.ff.textContent = fmt(nol(W.F[h])); r.ffs.textContent = "";
  if (lj) { r.laju.textContent = `${lj.ros < .1 ? "< 0,1" : fmt(lj.ros < 10 ? Math.round(lj.ros * 10) / 10 : nol(lj.ros))} m/menit`; r.lajus.textContent = "";
    r.nyala.textContent = lj.L < .1 ? "–" : `± ${fmt(Math.round(lj.L * 10) / 10)} m`; r.nyalas.textContent = lj.I >= 10 ? `I ≈ ${fmt(lj.I < 100 ? nol(lj.I) : nol(lj.I / 10) * 10)} kW/m` : ""; }
  for (const f of I.up) f(t);
}
const insiden = {id: "insiden", nama: "Insiden", ikon: ik(P.pin), lencana: () => null, buka: c => isiInsiden(c), tutup: () => { I.r = null; I.up = []; }, waktu: (t, c) => perbaruiInsiden(t, c), hasilBaru: c => { if (F.terbuka === "insiden") isiInsiden(c); }};

/* ---------- registri tab: window.SimFT ---------- */
const SimFT = window.SimFT = {
  aktif: "insiden",
  daftar(tab) { if (!tab?.id) return; F.tabs.set(tab.id, tab); if (F.on) { segarkanTabs(); if (D.H) aman(() => tab.hasilBaru?.(ctx())); } },
  ctx, buka: pilihTab,
};
SimFT.daftar(insiden);

const waktu0 = Sim.waktu;
Sim.waktu = function (t, ...a) {
  const r = waktu0.call(this, t, ...a), H = this.hasil?.[this.lihat]; if (!H || !this.cuaca) return r;
  D.t = t;
  if (D.H !== H || D.mulai !== this.cuaca.mulai) { const baru = D.hasilObj !== this.hasil; D.hasilObj = this.hasil; bangun(this, H); hasilBaruF(baru); }
  kursor(t); redupJalur(this, t);
  if (!D.rafF) D.rafF = requestAnimationFrame(() => { D.rafF = 0; const tt = +$("#simT").value; D.t = tt; petaF(tt); if (F.on) { const tab = F.tabs.get(F.terbuka); if (tab) aman(() => tab.waktu?.(tt, ctx())); } });
  return r;
};

/* ---------- putar: rAF dengan kecepatan 1×/2×/4× (1× = 9 jam/detik seperti pemutar lama) ---------- */
const PM = {on: false, k: 1, t: 0, last: 0};
function henti() { PM.on = false; const b = $("#simPlay"); b.innerHTML = `${ik(P.main)}<span class="s3-tx">Putar</span>`; b.setAttribute("aria-label", "Putar animasi"); }
function putar() {
  if (Sim._putar) { clearInterval(Sim._putar); Sim._putar = null; }
  if (PM.on) return henti();
  const s = $("#simT"); if (+s.value >= 72) setT(0);
  PM.on = true; PM.t = +s.value; PM.last = performance.now(); const b = $("#simPlay"); b.innerHTML = `${ik(P.jeda)}<span class="s3-tx">Jeda</span>`; b.setAttribute("aria-label", "Jeda animasi");
  const lup = ts => { if (!PM.on) return; if (!hal.offsetParent) return henti();
    if (Math.floor(PM.t) !== +s.value) PM.t = +s.value; /* slider digeser tangan: ikuti */
    PM.t = Math.min(72, PM.t + (ts - PM.last) / 1000 * 9 * PM.k); PM.last = ts;
    if (Math.floor(PM.t) !== +s.value) setT(Math.floor(PM.t));
    if (PM.t >= 72) return henti(); requestAnimationFrame(lup); };
  requestAnimationFrame(lup);
}

/* ---------- pasang DOM sekali ---------- */
if (hal && wk) {
  hal.insertAdjacentHTML("beforeend", `<div class="s3-mode s3-m" id="s3Mode" role="group" aria-label="Tampilan peta"><button type="button" data-m="2d" aria-pressed="true">2D</button><button type="button" data-m="3d" aria-pressed="false">3D</button><button type="button" id="s3Citra" aria-pressed="false" hidden>Citra</button></div>
    <div class="s3-label" id="s3Label" hidden title="Data insiden buatan; cuaca dari prakiraan nyata"><span class="s3-pill s3-sim">${ik(P.api)}SIMULASI · insiden buatan</span></div>
    <div class="s3-bar s3f-only" id="s3Bar"><b class="s3-nm" id="s3Nm">Insiden simulasi</b><span class="s3-info" id="s3Lok"></span><span class="s3-info" id="s3Rg"></span>
      <div class="s3-tabs" id="s3Tabs" role="tablist" aria-label="Tab insiden"></div><span class="s3-pill s3-sim">${ik(P.api)}SIMULASI</span><span class="s3-sp"></span>
      <button type="button" class="s3-pill" id="s3Gear" aria-pressed="false" title="Pengaturan skenario">${ik(P.atur)}Skenario</button>
      <button type="button" class="s3-pill" id="s3Lama" title="Kembali ke tampilan lama">${ik(P.keluar)}Tampilan lama</button>
      <button type="button" class="s3-pill s3-nar" id="s3Pn" aria-pressed="false">${ik(P.panel)}Panel</button></div>
    <aside class="s3-kanan s3f-only" id="s3Kanan" aria-label="Panel insiden"></aside>
    <section class="s3-bawah s3f-only" id="s3Bawah" aria-label="Timeline dan grafik"><div class="s3-th2"><b>Timeline</b><span id="s3TlRg"></span></div><div id="s3Tl"></div><div class="s3-isi" id="s3Isi"></div></section>`);
  F.el = {kanan: $("#s3Kanan"), bawah: $("#s3Isi"), peta: $("#simPeta")};
  $("#s3Mode").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.id === "s3Citra") mode(null, !T3.citra); else mode(b.dataset.m === "3d", null); });
  const rng = $("#simT"), lin = document.createElement("div"); lin.className = "s3-lintas"; rng.before(lin); lin.append(rng); /* id & handler slider tetap */
  lin.insertAdjacentHTML("afterbegin", `<span class="s3-chip s3f-only" id="s3Chip"></span>`);
  lin.insertAdjacentHTML("beforeend", `<div class="s3-tks" id="s3Tks"></div>`);
  const play = $("#simPlay"); play.onclick = putar; henti();
  play.insertAdjacentHTML("afterend", `<button type="button" class="s3-ib s3f-only" id="s3Step" aria-label="Maju satu jam" title="Maju satu jam">${ik(P.maju)}</button>
    <div class="s3-spd s3f-only" role="group" aria-label="Kecepatan putar">${[1, 2, 4].map(k => `<button type="button" data-k="${k}" aria-pressed="${k === 1}">${k}×</button>`).join("")}</div>`);
  $("#s3Step").onclick = () => setT(Math.min(72, +$("#simT").value + 1));
  wk.querySelector(".s3-spd").addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (!b) return; PM.k = +b.dataset.k; wk.querySelectorAll(".s3-spd button").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  $("#simInfo").insertAdjacentHTML("afterend", `<button type="button" class="s3-pill" id="s3Tog" aria-pressed="false" aria-controls="s3Dash">${ik(P.grafik)}Grafik</button>
    <div class="s3-dash" id="s3Dash" hidden><div class="s3-gr" id="s3Gr"></div><div class="s3-kj" id="s3Kj"></div></div>`);
  wk.classList.add("s3");
  $("#s3Tog").onclick = e => { D.buka = !D.buka; $("#s3Dash").hidden = !D.buka; e.currentTarget.setAttribute("aria-pressed", D.buka); };
  const ke = e => { const b = e.target.closest("[data-jam]"); if (b) setT(+b.dataset.jam); };
  $("#s3Kj").addEventListener("click", ke); $("#s3Tks").addEventListener("click", ke); $("#s3Isi").addEventListener("click", ke);
  /* bar & panel kanan: chrome urgent (kelas/atribut), kerja peta ditunda rAF */
  $("#s3Tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b && b.dataset.tab !== F.aktif) pilihTab(b.dataset.tab); });
  $("#s3Gear").onclick = e => aturPa(!hal.classList.contains("s3-pa"));
  $("#s3Lama").onclick = () => { D.keluar = true; keluarF(); };
  $("#s3Pn").onclick = e => { const on = !hal.classList.contains("s3-kn"); hal.classList.toggle("s3-kn", on); e.currentTarget.setAttribute("aria-pressed", on); };
  F.el.kanan.addEventListener("change", e => { const c = e.target.closest("[data-c]"); if (c) aturLapis(c.dataset.c, c.checked); });
  F.el.kanan.addEventListener("input", e => { const o = e.target.closest("[data-o]"); if (!o) return; LP[o.dataset.o].op = +o.value; o.nextElementSibling.textContent = o.value + "%"; tunda(); });
  F.el.kanan.addEventListener("click", e => { const b = e.target.closest("[data-sk]"); if (b) document.querySelector(`.simkartu[data-lihat="${b.dataset.sk}"]`)?.click(); });
}
/* bila tab Simulasi sudah termuat sebelum modul ini */
if (Sim.f && $("#simPanel")?.innerHTML && !$("#s3Pilih")) Sim.panel();
if (Sim.peta?.getLayer("sim-k")) Sim.pasangLapis();
})();
