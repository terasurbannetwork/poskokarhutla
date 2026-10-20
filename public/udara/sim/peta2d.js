/* peta2d.js — alternatif 2D: MapLibre (global maplibregl dari halaman) + awan asap sebagai sumber canvas (play(); pause() menyegarkan,
   tanpa gambar data: agar CSP tidak mencatat pelanggaran), sumber berikon api/cerobong, kota berlabel konsentrasi dan warna kategori ISPU. */
const DASAR = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches) ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
function ikon(jenis) {
  const c = document.createElement("canvas"); c.width = c.height = 48; const g = c.getContext("2d"); g.lineJoin = "round"; g.lineWidth = 3; g.strokeStyle = "#fff";
  if (jenis === "api") { g.fillStyle = "#e8541e"; g.beginPath(); g.moveTo(24, 3); g.bezierCurveTo(26, 15, 39, 20, 39, 31); g.bezierCurveTo(39, 41, 31, 45, 24, 45); g.bezierCurveTo(17, 45, 9, 41, 9, 31); g.bezierCurveTo(9, 24, 14, 21, 16, 15); g.bezierCurveTo(19, 19, 20, 21, 22, 22); g.bezierCurveTo(23, 15, 22, 9, 24, 3); g.closePath(); g.stroke(); g.fill(); g.fillStyle = "#ffd25e"; g.beginPath(); g.ellipse(24, 34, 5.5, 8, 0, 0, 7); g.fill(); }
  else { g.fillStyle = "#4b5563"; g.beginPath(); g.moveTo(17, 45); g.lineTo(20, 12); g.lineTo(28, 12); g.lineTo(31, 45); g.closePath(); g.stroke(); g.fill(); g.fillStyle = "#e5e7eb"; g.fillRect(19, 20, 10, 3); g.fillRect(18, 30, 12, 3); }
  return g.getImageData(0, 0, 48, 48);
}
export async function buat(wadah, o) {
  const [w, s, e, n] = o.bbox, kis = o.kisi;
  const m = new maplibregl.Map({container: wadah, style: DASAR(), bounds: [[w, s], [e, n]], fitBoundsOptions: {padding: 20}, attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false, minZoom: 3, maxZoom: 9});
  m.touchZoomRotate.disableRotation();
  await new Promise(r => m.loaded() ? r() : m.once("load", r));
  m.addImage("su-api", ikon("api"), {pixelRatio: 2}); m.addImage("su-pltu", ikon("pltu"), {pixelRatio: 2});
  const i0 = Math.max(0, Math.floor((w - kis.lon0) / kis.s)), i1 = Math.min(kis.nx - 1, Math.ceil((e - kis.lon0) / kis.s)), j0 = Math.max(0, Math.floor((s - kis.lat0) / kis.s)), j1 = Math.min(kis.ny - 1, Math.ceil((n - kis.lat0) / kis.s));
  const W = i1 - i0 + 1, H = j1 - j0 + 1, kecil = document.createElement("canvas"); kecil.width = W; kecil.height = H;
  const besar = document.createElement("canvas"); besar.width = W * 6; besar.height = H * 6; const gk = kecil.getContext("2d"), gb = besar.getContext("2d"), img = gk.createImageData(W, H);
  const lon0 = kis.lon0 + i0 * kis.s, lon1 = kis.lon0 + (i1 + 1) * kis.s, la0 = kis.lat0 + j0 * kis.s, la1 = kis.lat0 + (j1 + 1) * kis.s;
  m.addSource("su-awan", {type: "canvas", canvas: besar, coordinates: [[lon0, la1], [lon1, la1], [lon1, la0], [lon0, la0]], animate: false});
  m.addLayer({id: "su-awan", type: "raster", source: "su-awan", paint: {"raster-opacity": .9, "raster-resampling": "linear", "raster-fade-duration": 0}});
  const fs = (list, f) => ({type: "FeatureCollection", features: list.map(f)});
  m.addSource("su-sumber", {type: "geojson", data: fs(o.sumber, q => ({type: "Feature", geometry: {type: "Point", coordinates: [q.lon, q.lat]}, properties: {jenis: q.jenis, id: q.id, f: 1, ukr: q.jenis === "api" ? .45 + .5 * Math.sqrt((q.frp || 0) / Math.max(1, ...o.sumber.map(x => x.frp || 0))) : .6}}))});
  m.addLayer({id: "su-sumber", type: "symbol", source: "su-sumber", layout: {"icon-image": ["concat", "su-", ["get", "jenis"]], "icon-size": ["get", "ukr"], "icon-allow-overlap": true}, paint: {"icon-opacity": ["case", ["<=", ["get", "f"], 0], .25, ["<", ["get", "f"], 1], .6, 1]}});
  m.addSource("su-kota", {type: "geojson", data: fs(o.kota, (k, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [k.lon, k.lat]}, properties: {i, r: i, nama: k.nama.replace(/^(Kota|Kabupaten|Kab\.) /, ""), v: "", c: "#888"}}))});
  m.addLayer({id: "su-kota-c", type: "circle", source: "su-kota", paint: {"circle-radius": 6, "circle-color": ["get", "c"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}});
  m.addLayer({id: "su-kota-t", type: "symbol", source: "su-kota", layout: {"text-field": ["concat", ["get", "nama"], " ", ["get", "v"]], "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top", "text-font": ["Noto Sans Bold"], "symbol-sort-key": ["get", "r"], "text-optional": true}, paint: {"text-color": "#1f2937", "text-halo-color": "#fff", "text-halo-width": 1.4}});
  const rgb = (v, K) => { const t = Math.min(1, v / 250); return [Math.round(235 - 150 * t), Math.round(190 - 130 * t), Math.round(90 - 60 * t), Math.round(Math.min(.8, .08 + v / 300) * 255)]; };
  const cv = m.getSource("su-awan");
  function ubah(st) {
    const { jam, hasil, Kal, nilaiKota, faktorSumber } = st, b0 = Math.min(Math.floor(jam), 72), b1 = Math.min(b0 + 1, 72), f = jam - b0, N = kis.n, d = img.data;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const c = (j0 + j) * kis.nx + i0 + i, v = Kal * (hasil.sfcA[b0 * N + c] * (1 - f) + hasil.sfcA[b1 * N + c] * f) + hasil.sfcP[b0 * N + c] * (1 - f) + hasil.sfcP[b1 * N + c] * f;
      const o2 = ((H - 1 - j) * W + i) * 4; if (v < 2) { d[o2 + 3] = 0; continue; } const r = rgb(v); d[o2] = r[0]; d[o2 + 1] = r[1]; d[o2 + 2] = r[2]; d[o2 + 3] = r[3]; }
    gk.putImageData(img, 0, 0); gb.imageSmoothingEnabled = true; gb.imageSmoothingQuality = "high"; gb.clearRect(0, 0, besar.width, besar.height); gb.drawImage(kecil, 0, 0, besar.width, besar.height); cv.play(); cv.pause();
    m.getSource("su-kota").setData(fs(o.kota, (k, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [k.lon, k.lat]}, properties: {i, r: i, nama: k.nama.replace(/^(Kota|Kabupaten|Kab\.) /, ""), v: Math.round(nilaiKota[i].v) + (nilaiKota[i].tanda ? "*" : ""), c: nilaiKota[i].kat.w}})));
    if (st.sknBaru) m.getSource("su-sumber").setData(fs(o.sumber, q => ({type: "Feature", geometry: {type: "Point", coordinates: [q.lon, q.lat]}, properties: {jenis: q.jenis, id: q.id, f: faktorSumber(q), ukr: q.jenis === "api" ? .45 + .5 * Math.sqrt((q.frp || 0) / Math.max(1, ...o.sumber.map(x => x.frp || 0))) : .6}})));
  }
  return {ubah, ukuran: () => m.resize(), hancur: () => m.remove()};
}
