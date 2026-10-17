/* sim_3d.js — tampilan "FireTrace" di tab Simulasi: titik api pilihan sendiri, medan 3D, garis depan api yang menyala,
   jalur kepala api berlabel jam, dan dasbor bawah (timeline berpenanda kejadian, 3 grafik, kejadian kunci).
   Tambalan seperti sim_data.js / sim_perlakuan.js: membungkus Sim.pilih / panel / klikPeta / pasangLapis / gambar / waktu,
   TIDAK mengubah atau menyalin mesin sebar/tabelLaju. Semua angka berasal dari hasil Sim (H.T, H.luas, H.W, H.desa, H.tahan, H.tepi).
   Insiden pada titik pilihan itu buatan (hari:0, tanpa pertumbuhan teramati); cuacanya tetap prakiraan nyata (Sim.cuacaJam). */
(() => {
if (typeof Sim === "undefined") return;
const JAM = [0, 6, 12, 24, 36, 48, 60, 72];
/* cadangan bila tak ada kompleks <= 300 km: nilai tengah kemarau Indonesia (FFMC 85 = bawaan Sim; BUI 40 = bawaan tabelLaju).
   Cuaca per jam tetap dari Open-Meteo; ini hanya FFMC awal, BUI, DC, dan cadangan bila prakiraan gagal. */
const CAD = {prov: "", ffmc: 85, bui: 40, dc: 300, isi: 5, ws: 10, wd: 90, rh: 60, t: 30};
const TG = {on: false, f: null, dataMati: false, dataAsal: true};
const T3 = {d3: false, citra: true}; /* 3D = citra satelit + medan seperti FireTrace; pill Citra mematikannya */
const D = {H: null, t: 72, buka: null, cv: null, img: null, jalur: new WeakMap()};
const ikon = d => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IK = {tengah: ikon('<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'), grafik: ikon('<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'), api: ikon('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/>')};
const wib = (S, h) => jamWIB(new Date(S.cuaca.mulai.getTime() + h * 36e5)).replace(" WIB", "");
const nol = x => Math.round(x);

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
  if (this.k === "titik") { const info = pa.querySelector("h2 + div"); if (info) info.innerHTML = `<span class="s3-pill s3-sim">${IK.api}SIMULASI</span> ${esc(namaProv(this.f.properties.prov) || "Indonesia")}`; }
  sel.closest("label").insertAdjacentHTML("beforebegin", `<button type="button" class="s3-pill" id="s3Pilih" aria-pressed="${TG.on}" style="margin-top:12px">${IK.tengah}Pilih titik api</button>`);
  $("#s3Pilih").onclick = e => {
    if (this._gambarSekat) return toast("Selesaikan gambar sekat dulu");
    TG.on = !TG.on; e.currentTarget.setAttribute("aria-pressed", TG.on); this.peta.getCanvas().style.cursor = TG.on ? "crosshair" : "";
    if (TG.on) toast("Klik titik di peta");
  };
  return r;
};

/* ---------- 2. medan 3D ---------- */
function atur3D(S) {
  const m = S.peta; if (!m?.getLayer("sim-k")) return; /* sim-k ada = gaya sudah dimuat (isStyleLoaded() false selama ubin dimuat) */
  const sebelum = ["sim-lahan", "sim-img", "sim-k"].find(l => m.getLayer(l));
  for (const l of ["s3-hill", "s3-sat"]) if (m.getLayer(l) && (!T3.d3 || (l === "s3-sat" && !T3.citra))) m.removeLayer(l);
  if (!T3.d3) {
    if (m.getTerrain()) m.setTerrain(null);
    if (m.getSource("s3-dem")) m.removeSource("s3-dem");
    if (m.getSource("s3-sat")) m.removeSource("s3-sat");
    if (m.getLayer("sim-img")) { m.setPaintProperty("sim-img", "raster-brightness-max", 1); m.setPaintProperty("sim-img", "raster-opacity", .8); }
    return;
  }
  if (!m.getSource("s3-dem")) m.addSource("s3-dem", {type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 15,
    attribution: "Medan © Mapzen, NASA SRTM, USGS"});
  if (T3.citra && !m.getSource("s3-sat")) m.addSource("s3-sat", {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar"});
  if (T3.citra && !m.getLayer("s3-sat")) m.addLayer({id: "s3-sat", type: "raster", source: "s3-sat"}, m.getLayer("s3-hill") ? "s3-hill" : sebelum);
  if (!m.getLayer("s3-hill")) m.addLayer({id: "s3-hill", type: "hillshade", source: "s3-dem", paint: {"hillshade-exaggeration": T3.citra ? .25 : .45,
    "hillshade-shadow-color": gelap() ? "#000000" : "#473b24", "hillshade-highlight-color": gelap() ? "#5a6a85" : "#ffffff"}}, sebelum);
  m.setPaintProperty("s3-hill", "hillshade-exaggeration", T3.citra ? .25 : .45);
  if (!m.getTerrain()) m.setTerrain({source: "s3-dem", exaggeration: 1.5});
  /* area yang sudah terbakar digelapkan jadi bekas bakar; garis depan (sim-depan) tetap menyala */
  if (m.getLayer("sim-img")) { m.setPaintProperty("sim-img", "raster-brightness-max", .5); m.setPaintProperty("sim-img", "raster-opacity", .85); }
}
function mode(d3, citra) {
  if (d3 != null) T3.d3 = d3; if (citra != null) T3.citra = citra;
  document.querySelectorAll("#s3Mode [data-m]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.m === "3d") === T3.d3));
  $("#s3Citra").hidden = !T3.d3; $("#s3Citra").setAttribute("aria-pressed", T3.citra);
  requestAnimationFrame(() => { /* chrome urgent di atas; kerja peta menyusul */
    const m = Sim.peta; if (!m) return;
    atur3D(Sim);
    if (T3.d3) { m.dragRotate.enable(); m.touchZoomRotate.enableRotation(); m.easeTo({pitch: 60, duration: 700}); }
    else { m.dragRotate.disable(); m.touchZoomRotate.disableRotation(); m.easeTo({pitch: 0, bearing: 0, duration: 500}); }
  });
}

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

/* ---------- 4. jalur kepala api ---------- */
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
function pasangJalur(S) {
  const m = S.peta, H = S.hasil?.[S.lihat]; if (!m || !H || !S.K || !m.getLayer("sim-k")) return;
  let pts = D.jalur.get(H); if (!pts) D.jalur.set(H, pts = hitungJalur(S, H));
  const fs = pts.map(p => ({type: "Feature", geometry: {type: "Point", coordinates: [p.lon, p.lat]}, properties: {jam: p.jam, lbl: (p.jam === 0 ? "Penyulutan\n" : "") + wib(S, p.jam)}}));
  m.addSource("s3-jalur", {type: "geojson", data: {type: "FeatureCollection", features: [...(pts.length > 1 ? [{type: "Feature", geometry: {type: "LineString", coordinates: pts.map(p => [p.lon, p.lat])}, properties: {}}] : []), ...fs]}});
  m.addLayer({id: "s3-jalur-bg", type: "line", source: "s3-jalur", filter: ["==", ["geometry-type"], "LineString"], paint: {"line-color": gelap() ? "#0b1424" : "#1d1d1d", "line-width": 5, "line-opacity": .55}, layout: {"line-cap": "round", "line-join": "round"}});
  m.addLayer({id: "s3-jalur", type: "line", source: "s3-jalur", filter: ["==", ["geometry-type"], "LineString"], paint: {"line-color": "#ffd24a", "line-width": 2.5}, layout: {"line-cap": "round", "line-join": "round"}});
  m.addLayer({id: "s3-jalur-t", type: "circle", source: "s3-jalur", filter: ["==", ["geometry-type"], "Point"], paint: {"circle-radius": 5, "circle-color": "#ffd24a", "circle-stroke-color": gelap() ? "#0b1424" : "#1d1d1d", "circle-stroke-width": 1.6}});
  m.addLayer({id: "s3-jalur-l", type: "symbol", source: "s3-jalur", filter: ["==", ["geometry-type"], "Point"], layout: {"text-field": ["get", "lbl"], "text-size": 11.5, "text-offset": [.9, 0], "text-anchor": "left", "text-justify": "left", "text-font": ["Noto Sans Bold"], "symbol-sort-key": ["get", "jam"]},
    paint: {"text-color": "#fff", "text-halo-color": "rgba(29,29,29,.82)", "text-halo-width": 3}}); /* kotak label gelap ala FireTrace */
  redupJalur(S, D.t);
}
function redupJalur(S, t) { /* titik di masa depan (> jam geser) dipudarkan; murah, hanya paint */
  const m = S.peta; if (!m?.getLayer("s3-jalur-t")) return; const ex = ["case", ["<=", ["get", "jam"], t], 1, .3];
  m.setPaintProperty("s3-jalur-t", "circle-opacity", ex); m.setPaintProperty("s3-jalur-t", "circle-stroke-opacity", ex); m.setPaintProperty("s3-jalur-l", "text-opacity", ex);
}
const lapis0 = Sim.pasangLapis;
Sim.pasangLapis = function (...a) {
  const r = lapis0.apply(this, a), m = this.peta;
  if (!m?.getLayer("sim-k")) return r;
  for (const l of ["s3-jalur-l", "s3-jalur-t", "s3-jalur", "s3-jalur-bg", "sim-depan"]) if (m.getLayer(l)) m.removeLayer(l);
  for (const s of ["s3-jalur", "sim-depan"]) if (m.getSource(s)) m.removeSource(s);
  atur3D(this);
  if (this.hasil?.[this.lihat] && this.K) {
    D.t = +$("#simT").value;
    m.addSource("sim-depan", {type: "image", url: urlDepan(this, D.t), coordinates: koorKisi(this.K)});
    m.addLayer({id: "sim-depan", type: "raster", source: "sim-depan", paint: {"raster-opacity": 1, "raster-resampling": "nearest", "raster-fade-duration": 0}}, "sim-k");
    pasangJalur(this);
  }
  return r;
};
const gambar0 = Sim.gambar;
Sim.gambar = function (t, ...a) { /* sudah 1x per frame (rAF di Sim.waktu): satu updateImage tambahan */
  const r = gambar0.call(this, t, ...a), src = this.peta?.getSource("sim-depan");
  if (src && this.hasil?.[this.lihat] && this.K) src.updateImage({url: urlDepan(this, t), coordinates: koorKisi(this.K)});
  return r;
};

/* ---------- 5. dasbor bawah ---------- */
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
function bangun(S, H) {
  D.H = H; D.mulai = S.cuaca.mulai;
  $("#s3Gr").innerHTML = grafikLuas(S, H) + grafikLaju(S, H) + grafikCuaca(S, H);
  const ev = kejadian(S, H);
  $("#s3Kj").innerHTML = `<span class="s3-pill s3-jdl">Kejadian kunci</span>` + ev.map(e => `<button type="button" class="s3-kjb" data-jam="${e.jam}" style="--w:${e.w}"><i></i><span class="s3-kn">${e.n}</span><span class="s3-kd">+${e.jam} j · ${wib(S, e.jam)}</span><span class="s3-kv">${e.esc ? esc(e.d) : e.d}</span></button>`).join("");
  $("#s3Tks").innerHTML = `${ev.map(e => `<button type="button" class="s3-mk" data-jam="${e.jam}" style="--f:${e.jam / 72};--w:${e.w}" title="${e.n}, +${e.jam} j" aria-label="${e.n}, +${e.jam} jam"></button>`).join("")}
    ${[0, 12, 24, 36, 48, 60, 72].map(h => `<span class="s3-tk${h % 24 ? " s" : ""}" style="--f:${h / 72}"><em>+${h} j</em><small>${wib(S, h)}</small></span>`).join("")}`;
  if (D.buka == null) D.buka = innerWidth > 900;
  $("#s3Dash").hidden = !D.buka; $("#s3Tog").setAttribute("aria-pressed", D.buka);
}
function kursor(t) { /* hanya memindah garis kursor; SVG tidak dibangun ulang */
  document.querySelectorAll("#s3Gr .s3-kursor").forEach(l => { const x = +l.dataset.pl + t / 72 * +l.dataset.pw; l.setAttribute("x1", x); l.setAttribute("x2", x); });
}
const waktu0 = Sim.waktu;
Sim.waktu = function (t, ...a) {
  const r = waktu0.call(this, t, ...a), H = this.hasil?.[this.lihat]; if (!H || !this.cuaca) return r;
  if (D.H !== H || D.mulai !== this.cuaca.mulai) bangun(this, H);
  D.t = t; kursor(t); redupJalur(this, t); return r;
};

/* ---------- pasang DOM sekali ---------- */
const hal = $("#p-sim"), wk = $("#simWaktu");
if (hal && wk) {
  hal.insertAdjacentHTML("beforeend", `<div class="s3-mode" id="s3Mode" role="group" aria-label="Tampilan peta"><button type="button" data-m="2d" aria-pressed="true">2D</button><button type="button" data-m="3d" aria-pressed="false">3D</button><button type="button" id="s3Citra" aria-pressed="false" hidden>Citra</button></div>
    <div class="s3-label" id="s3Label" hidden title="Data insiden buatan; cuaca dari prakiraan nyata"><span class="s3-pill s3-sim">${IK.api}SIMULASI · insiden buatan</span></div>`);
  $("#s3Mode").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.id === "s3Citra") mode(null, !T3.citra); else mode(b.dataset.m === "3d", null); });
  const rng = $("#simT"), lin = document.createElement("div"); lin.className = "s3-lintas"; rng.before(lin); lin.append(rng); /* id & handler slider tetap */
  lin.insertAdjacentHTML("beforeend", `<div class="s3-tks" id="s3Tks"></div>`);
  $("#simInfo").insertAdjacentHTML("afterend", `<button type="button" class="s3-pill" id="s3Tog" aria-pressed="false" aria-controls="s3Dash">${IK.grafik}Grafik</button>
    <div class="s3-dash" id="s3Dash" hidden><div class="s3-gr" id="s3Gr"></div><div class="s3-kj" id="s3Kj"></div></div>`);
  wk.classList.add("s3");
  $("#s3Tog").onclick = e => { D.buka = !D.buka; $("#s3Dash").hidden = !D.buka; e.currentTarget.setAttribute("aria-pressed", D.buka); };
  const ke = e => { const b = e.target.closest("[data-jam]"); if (!b) return; const s = $("#simT"); s.value = b.dataset.jam; s.dispatchEvent(new Event("input")); };
  $("#s3Kj").addEventListener("click", ke); $("#s3Tks").addEventListener("click", ke);
}
/* bila tab Simulasi sudah termuat sebelum modul ini */
if (Sim.f && $("#simPanel")?.innerHTML && !$("#s3Pilih")) Sim.panel();
if (Sim.peta?.getLayer("sim-k")) Sim.pasangLapis();
})();
