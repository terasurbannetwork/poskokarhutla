"use strict";
/* sim_tampak.js: mode "Genangan 3D" tab Simulasi. Area persegi di sekitar kecamatan/titik pilihan, DEM Terrarium (sama dengan medan
   3D MapLibre), genangan 72 jam dari sim_genangan.js di Web Worker sim_kerja.js, peluang longsor dari sim_longsor.js, perlakuan
   tanggul/pompa/pintu air, banding tanpa/dengan perlakuan. Masukan dari data nyata halaman: hujan.json (sel terdekat),
   hujan_ansambel.json (batas bawah P90 dari peluang >= 50/100 mm), sungai.json (debit di atas Q2 = luapan), rob.json (muka laut).
   Dipanggil dari Simulasi.render() bila Simulasi.mode === "genangan". Pola kamera & medan: public/sim_3d.js. */
const SimTampak = (() => {
/* sim_longsor.js dimuat SESUDAH berkas ini (urutan index.html): SL diisi saat render pertama */
const SG = window.SimGenangan, J = 72, DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
let SL = window.SimLongsor;
const SKN = [{id: "dasar", n: "Prakiraan", w: "#5f6fb0"}, {id: "ansambel", n: "Ansambel basah", w: "#4f8fc4"}, {id: "ekstrem", n: "Hujan ekstrem", w: "#c9503a"},
  {id: "sungai", n: "Sungai meluap", w: "#3f7fb8"}, {id: "pasang", n: "Pasang tinggi", w: "#5a9e74"}];
const T = {k: null, prov: null, titik: null, sisi: 6000, n: 100, sk: "dasar", op: {ekstrem: 250, sungai: 3, pasang: .5}, cn: SG.ASUMSI.CN,
  tanggul: [], pompa: [], pintu: false, tinggi: 2, laju: .5, alat: null, draf: [],
  dem: null, demKunci: "", prep: null, hasil: null, lihat: "dengan", t: 0, main: false, basi: false,
  lapis: {air: true, longsor: true, citra: true}, kanvas: {}, peta: null, sibuk: false, kerja: undefined, ex: 1.5, pend: undefined, raf: 0};
const ik = d => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IK = {main: '<path d="M7 5l12 7-12 7z"/>', jeda: '<path d="M8 5v14M16 5v14"/>', putar: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'};
const jeda = () => new Promise(r => nanti(r));
const ha = m2 => m2 / 1e4;
const angka1 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const pukul = t => new Date(new Date(S.hujan.hari_ini + "T00:00:00+07:00").getTime() + t * 36e5).toLocaleString("id-ID", {...WIB, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "");

/* ---------- worker ---------- */
let idN = 0; const tunggu = new Map();
function kerja(pesan, kabar) {
  if (T.kerja === undefined) try {
    T.kerja = new Worker("sim_kerja.js");
    T.kerja.onmessage = e => { const d = e.data, w = tunggu.get(d.id); if (!w) return; if ("kabar" in d) return w.kabar?.(d.kabar); tunggu.delete(d.id); d.ok ? w.ok(d) : w.gagal(new Error(d.galat)); };
    T.kerja.onerror = e => { e.preventDefault(); for (const w of tunggu.values()) w.gagal(new Error(e.message || "worker gagal")); tunggu.clear(); T.kerja = null; };
  } catch { T.kerja = null; }
  if (!T.kerja) /* cadangan tanpa worker: utas utama (layar bisa tersendat) */
    return pesan.jenis === "dem" ? SG.ambilDEM(pesan.lat, pesan.lon, pesan.sisi, pesan.n).then(dem => ({dem})) : jeda().then(() => ({hasil: SG.jalankan(pesan.cfg, kabar)}));
  return new Promise((ok, gagal) => { const id = ++idN; tunggu.set(id, {ok, gagal, kabar}); T.kerja.postMessage({...pesan, id}); });
}

/* ---------- area & masukan ---------- */
function pusat() {
  if (T.titik) return T.titik;
  const c = Simulasi.kec?.[T.k]; return c ? {lat: c.lat, lon: c.lon, nama: c.nama, kab: c.kab} : null;
}
function kecAwal() { /* kecamatan dengan hujan 3 hari prakiraan tertinggi di provinsi */
  const D = Simulasi.dasar || {}; let best = null, v = -1;
  for (const k of Object.keys(Simulasi.kec || {})) { const h = D[k]?.h3 ?? 0; if (h > v) { v = h; best = k; } }
  return best;
}
const dekat = (xs, la, lo) => xs.reduce((m, g) => !m || (g.lat - la) ** 2 + (g.lon - lo) ** 2 < (m.lat - la) ** 2 + (m.lon - lo) ** 2 ? g : m, null);
function masukan(P) {
  const H = S.hujan, i0 = H.hari.indexOf(H.hari_ini), g = dekat(H.grid, P.lat, P.lon);
  const hari = [0, 1, 2].map(d => ({p: g.h[i0 + d] ?? 0, jam: g.jam?.[i0 + d] ?? 1, imax: g.imax?.[i0 + d] ?? 0}));
  const E = Simulasi.ens && Simulasi.ens.hari.includes(H.hari_ini) ? Simulasi.ens : null, e = E && dekat(E.grid, P.lat, P.lon);
  const ens = e && Math.abs(e.lat - P.lat) <= 1 && Math.abs(e.lon - P.lon) <= 1 ? {e, e0: E.hari.indexOf(H.hari_ini)} : null;
  let sg = null, js = 25; (S.sungai?.titik || []).forEach(t => { const d = km(P.lat, P.lon, t.lat, t.lon); if (d <= js) { js = d; sg = t; } });
  let rob = null, jr = 50; (S.rob?.titik || []).forEach(t => { const d = km(P.lat, P.lon, t.lat, t.lon); if (d <= jr) { jr = d; rob = t; } });
  return {g, i0, hari, ens, sg, js, rob, jr, sm: g.sm?.[i0] ?? null, a7: g.a7 ?? 0};
}
function hariSkenario(M) {
  let h = M.hari.map(x => ({...x}));
  if (T.sk === "ansambel" && M.ens) h = h.map((x, d) => { const j = M.ens.e0 + d, e = M.ens.e, lb = (e.p100?.[j] || 0) >= .1 ? 100 : (e.p50?.[j] || 0) >= .1 ? 50 : 0;
    return lb > x.p ? {p: lb, jam: Math.max(x.jam, 6), imax: x.p > 0 ? x.imax * lb / x.p : lb / 4} : x; });
  if (T.sk === "ekstrem") { const tot = h.reduce((a, x) => a + x.p, 0), X = T.op.ekstrem;
    h = tot > 0 ? h.map(x => ({p: x.p * X / tot, jam: Math.max(x.jam, 3), imax: x.imax * X / tot})) : h.map(() => ({p: X / 3, jam: 6, imax: X / 12})); }
  return h;
}
/* debit per jam di atas Q2 (kapasitas alur penuh = Q2, asumsi Leopold 1964: alur terisi penuh ~1,5-2 tahun sekali) */
function luapan(sg) {
  const R = S.sungai, j0 = R.hari.indexOf(S.hujan.hari_ini), q = sg.q, o = new Float64Array(J + 1);
  const harian = d => q[Math.max(0, Math.min(q.length - 1, j0 + d))] ?? 0, tgt = T.sk === "sungai" ? (T.op.sungai === 3 ? sg.q20 : sg.q5) : 0;
  for (let t = 0; t <= J; t++) { const x = (t - 12) / 24, a = Math.floor(x), f = x - a; let v = harian(a) * (1 - f) + harian(a + 1) * f;
    if (tgt) v = Math.max(v, sg.q2 + (tgt - sg.q2) * (t <= 30 ? t / 30 : Math.max(0, 1 - (t - 30) / 42))); /* hidrograf segitiga, puncak jam 30 (asumsi) */
    o[t] = Math.max(0, v - sg.q2); }
  return o;
}
function siapkan(dem) {
  const {nx, ny, dx} = dem, z0 = dem.z;
  const N = nx * ny, laut = SG.topengLaut(z0, nx, ny), benih = SG.benihTepi(nx, ny, laut);
  const f0 = SG.isiCekungan(z0, nx, ny, benih), z = SG.batasiCekungan(z0, f0, SG.ASUMSI.CEKUNGAN_MAKS);
  const f = SG.isiCekungan(z, nx, ny, benih), arah = SG.arahD8(f, nx, ny, benih), acc = SG.akumulasi(f, arah), lr = SL.lereng(z0, nx, ny, dx);
  let kel = -1; for (let k = 0; k < N; k++) { const i = k % nx, j = (k / nx) | 0; if ((!i || !j || i === nx - 1 || j === ny - 1) && !laut[k] && (kel < 0 || acc[k] > acc[kel])) kel = k; }
  const pintu = new Uint8Array(N), ki = kel % nx, kj = (kel / nx) | 0;
  for (let k = 0; k < N; k++) { const i = k % nx, j = (k / nx) | 0; if (laut[k] || ((!i || !j || i === nx - 1 || j === ny - 1) && Math.abs(i - ki) <= 3 && Math.abs(j - kj) <= 3)) pintu[k] = 1; }
  const dar = [...z].filter((_, k) => !laut[k]).sort((a, b) => a - b), relief = dar.length ? dar[Math.floor(dar.length * .95)] - dar[Math.floor(dar.length * .05)] : 0;
  let isi = 0; for (let k = 0; k < N; k++) if (z[k] > z0[k]) isi++;
  return {z, isi, laut, acc, lr, kel, pintu, relief: Math.max(1, relief), nLaut: laut.reduce((a, x) => a + x, 0), zMin: dar[0] ?? 0, zMaks: dar[dar.length - 1] ?? 0};
}
function susun() {
  const P = pusat(), D = T.dem, pr = T.prep, M = masukan(P), hari = hariSkenario(M), amc = SG.kelasAMC(M.a7, M.sm);
  const hu = SG.hietograf(hari), L = SG.limpasan(hu, T.cn, amc), N = D.nx * D.ny;
  let sungai = null;
  if (M.sg) { const [i, j] = SG.keSel(D, M.sg.lon, M.sg.lat), r = 3000 / D.dx;
    if (i > -r && j > -r && i < D.nx + r && j < D.ny + r) {
      if (!M.sg.q2) sungai = {catat: "tanpa ambang Q2"};
      else { let k = -1; for (let jj = Math.max(0, Math.floor(j - r)); jj <= Math.min(D.ny - 1, Math.ceil(j + r)); jj++) for (let ii = Math.max(0, Math.floor(i - r)); ii <= Math.min(D.nx - 1, Math.ceil(i + r)); ii++) {
          const kk = jj * D.nx + ii; if (!pr.laut[kk] && (ii - i) ** 2 + (jj - j) ** 2 <= r * r && (k < 0 || pr.acc[kk] > pr.acc[k])) k = kk; }
        if (k >= 0) sungai = {k, q: luapan(M.sg), sg: M.sg}; } } }
  let muka = null, mukaSumber = null;
  if (pr.nLaut) { const R = S.rob, r0 = M.rob && R ? R.hari.indexOf(S.hujan.hari_ini) : -1;
    const maks = [0, 1, 2].map(d => M.rob && r0 >= 0 && M.rob.h[r0 + d] != null ? M.rob.h[r0 + d] : .5).map(v => v + (T.sk === "pasang" ? T.op.pasang : 0));
    mukaSumber = M.rob && r0 >= 0 ? "rob" : "asumsi"; muka = SG.pasang(maks); }
  return {P, M, hari, amc, cn: L.cn, hujan: hu, efektif: L.efektif, resap: L.resap, sungai, muka, mukaSumber, N};
}
function cfgDari(X, perlakuan) {
  const D = T.dem, pr = T.prep, N = D.nx * D.ny; let z = pr.z; const tutup = new Uint8Array(N), pompa = [];
  if (perlakuan) {
    for (const tg of T.tanggul) z = SG.naikkan(z, SG.garisSel(tg.garis.map(([lo, la]) => SG.keSel(D, lo, la)), D.nx, D.ny), tg.tinggi);
    for (const p of T.pompa) { const [i, j] = SG.keSel(D, p.lon, p.lat).map(Math.round), k = j * D.nx + i; if (i >= 0 && j >= 0 && i < D.nx && j < D.ny && !pr.laut[k]) pompa.push({k, q: p.q}); }
    if (T.pintu) tutup.set(pr.pintu); }
  return {nx: D.nx, ny: D.ny, dx: D.dx, z, laut: pr.laut, muka: X.muka, hujan: X.efektif, masuk: X.sungai?.k != null ? [{k: X.sungai.k, q: X.sungai.q}] : [], pompa, tutup, jam: J};
}
const adaPerlakuan = () => T.tanggul.length || T.pompa.length || T.pintu;

/* ---------- jalan ---------- */
function status(s) { const el = $("#gnStatus"); if (el) el.textContent = s; }
async function jalan() {
  if (T.sibuk) return; const P = pusat(); if (!P) return toast("Pilih kecamatan atau titik dulu");
  T.sibuk = true; berhenti(); const b = $("#gnJalan"); if (b) b.disabled = true;
  try {
    const kunci = [P.lat.toFixed(4), P.lon.toFixed(4), T.sisi, T.n].join("|");
    if (T.demKunci !== kunci) { status("Mengunduh medan (DEM)…"); const r = await kerja({jenis: "dem", lat: P.lat, lon: P.lon, sisi: T.sisi, n: T.n}); T.dem = r.dem; T.prep = null; T.demKunci = kunci; }
    await jeda(); if (!T.prep) T.prep = siapkan(T.dem);
    T.ex = Math.round(Math.min(10, Math.max(1.5, 250 / T.prep.relief)) * 2) / 2;
    const X = susun(), ada = adaPerlakuan(), tahap = ada ? 2 : 1;
    const run = (pl, i) => kerja({jenis: "jalan", cfg: cfgDari(X, pl)}, p => status(`Menghitung genangan 72 jam${tahap > 1 ? ` (${i}/${tahap})` : ""}… ${fmt(Math.round(p * 100))} %`)).then(r => r.hasil);
    const dasar = await run(false, 1), dengan = ada ? await run(true, 2) : null;
    T.hasil = {dasar, dengan, X}; T.nJalan = (T.nJalan || 0) + 1; T.lihat = dengan ? "dengan" : "dasar"; T.basi = false;
    const R = dengan || dasar; T.t = R.luas.indexOf(Math.max(...R.luas)); status("");
    muatPenduduk();
  } catch (e) { console.warn("SimTampak:", e); status("Gagal: " + e.message); T.sibuk = false; if (b) b.disabled = false; return; }
  T.sibuk = false; panel(); await petaSiap(); pasangArea(true); gambar();
}
function tandaiBasi() { if (!T.hasil) return; T.basi = true; const b = $("#gnJalan"); if (b) b.textContent = "Jalankan ulang"; }

/* ---------- penduduk (public/data/penduduk.json, WorldPop 2026 sel 0,25 derajat + total per kecamatan) ---------- */
function muatPenduduk() {
  if (T.pend !== undefined) return;
  T.pend = null; muatJSON("../data/penduduk.json").then(d => { T.pend = d; if (T.hasil) panel(); }).catch(() => {});
}
function luasKec(k) { const f = S.geo.kec[Simulasi.kode]?.features.filter(x => `${Simulasi.kode}|${x.properties.kab}|${x.properties.kec}` === k) || []; let a = 0;
  for (const x of f) for (const pol of x.geometry.type === "MultiPolygon" ? x.geometry.coordinates : [x.geometry.coordinates]) { const r = pol[0], c = Math.cos(r[0][1] * Math.PI / 180);
    let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } a += Math.abs(s) / 2 * 111.32 * 111.32 * c; }
  return a; }
/* kepadatan (jiwa/km2): rentang antara sel 0,25 derajat terdekat dan kecamatan; sebaran di dalamnya tidak diketahui (asumsi rata) */
function kepadatan(P) {
  const d = T.pend; if (!d) return null; const sel = d.sel, la = Math.floor(P.lat / sel) * sel + sel / 2, lo = Math.floor(P.lon / sel) * sel + sel / 2;
  const jml = d.grid.filter(g => Math.abs(g[0] - la) < 1e-6 && Math.abs(g[1] - lo) < 1e-6).reduce((a, g) => a + g[2], 0), luasSel = (sel * 111.32) ** 2 * Math.cos(la * Math.PI / 180);
  const v = [jml / luasSel]; const k = T.titik ? null : T.k; if (k && d.kec[k]) { const a = luasKec(k); if (a > .5) v.push(d.kec[k] / a); }
  return [Math.min(...v), Math.max(...v)];
}

/* ---------- peta 3D ---------- */
async function petaSiap() {
  let el = $("#simPeta3"); if (!el) { $("#simPeta").insertAdjacentHTML("afterend", `<div id="simPeta3" role="img" aria-label="Peta 3D genangan dan longsor"></div>`); el = $("#simPeta3"); }
  $("#simPeta").hidden = true; el.hidden = false;
  if (T.peta && document.body.contains(T.peta.getContainer())) { T.peta.resize(); return; }
  const P = pusat() || {lat: -6.2, lon: 106.8};
  const m = T.peta = new maplibregl.Map({container: "simPeta3", style: DASAR(), center: [P.lon, P.lat], zoom: 12, pitch: 55, maxPitch: 75, attributionControl: {compact: true}});
  m.addControl(new maplibregl.NavigationControl({visualizePitch: true}), "bottom-right");
  await new Promise(r => m.once("load", r));
  m.addSource("gn-dem", {type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 13, attribution: "Medan © Mapzen, NASA SRTM, USGS"});
  m.addSource("gn-dem2", {type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 13}); /* hillshade terpisah dari medan (saran MapLibre) */
  m.addSource("gn-sat", {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar"});
  const atas = m.getStyle().layers.find(l => l.type === "symbol")?.id;
  m.addLayer({id: "gn-sat", type: "raster", source: "gn-sat", layout: {visibility: T.lapis.citra ? "visible" : "none"}}, atas);
  m.addLayer({id: "gn-hill", type: "hillshade", source: "gn-dem2", paint: {"hillshade-exaggeration": .3, "hillshade-shadow-color": "#3a3020"}}, atas);
  m.setTerrain({source: "gn-dem", exaggeration: T.ex});
  m.addSource("gn-alat", {type: "geojson", data: dataAlat()});
  m.addLayer({id: "gn-kotak", type: "line", source: "gn-alat", filter: ["==", ["get", "j"], "kotak"], paint: {"line-color": "#ffffff", "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": .9}});
  m.addLayer({id: "gn-tanggul", type: "line", source: "gn-alat", filter: ["in", ["get", "j"], ["literal", ["tanggul", "draf"]]], layout: {"line-cap": "round", "line-join": "round"},
    paint: {"line-color": ["case", ["==", ["get", "j"], "draf"], "#ffd24a", "#7a4a1f"], "line-width": 5}});
  m.addLayer({id: "gn-titik", type: "circle", source: "gn-alat", filter: ["==", ["geometry-type"], "Point"], paint: {"circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#fff",
    "circle-color": ["match", ["get", "j"], "pompa", "#c9503a", "sungai", "#1d6fd1", "#ffd24a"]}});
  m.addLayer({id: "gn-titik-lbl", type: "symbol", source: "gn-alat", filter: ["==", ["geometry-type"], "Point"], layout: {"text-field": ["get", "n"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top"},
    paint: {"text-color": "#fff", "text-halo-color": "#0b2545", "text-halo-width": 1.4}});
  m.on("click", klik); m.on("dblclick", e => { if (T.alat === "tanggul") { e.preventDefault(); selesaiTanggul(); } });
  m.on("mousemove", e => { T.tipE = e; if (!T.rafTip) T.rafTip = requestAnimationFrame(tip); });
  m.on("mouseout", () => $("#tip").classList.remove("on"));
}
function pasangArea(terbang) {
  const m = T.peta, D = T.dem; if (!m || !D || !m.getSource("gn-alat")) return;
  m.setTerrain({source: "gn-dem", exaggeration: T.ex});
  /* sumber kanvas (bukan image + dataURL: updateImage beruntun membatalkan muatan sebelumnya dan mengotori konsol) */
  for (const id of ["gn-air", "gn-longsor"]) { let c = T.kanvas[id];
    if (!c || c.cv.width !== D.nx) { const cv = document.createElement("canvas"); cv.width = D.nx; cv.height = D.ny; const cx = cv.getContext("2d", {willReadFrequently: true}); /* tetap di CPU: tanpa baca-balik GPU */ c = T.kanvas[id] = {cv, cx, img: cx.createImageData(D.nx, D.ny)};
      if (m.getLayer(id)) m.removeLayer(id); if (m.getSource(id)) m.removeSource(id); }
    const s = m.getSource(id); if (s) s.setCoordinates(D.sudut);
    else { m.addSource(id, {type: "canvas", canvas: c.cv, coordinates: D.sudut, animate: false}); m.addLayer({id, type: "raster", source: id, paint: {"raster-opacity": 1, "raster-fade-duration": 0, "raster-resampling": id === "gn-air" ? "linear" : "nearest"}}, "gn-kotak"); } }
  m.getSource("gn-alat").setData(dataAlat());
  if (terbang) { const hp = innerWidth <= 900, xs = D.sudut.map(c => c[0]), ys = D.sudut.map(c => c[1]);
    m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {padding: hp ? {top: 210, left: 16, right: 16, bottom: innerHeight * .42} : {top: 60, left: 420, right: 60, bottom: 130},
      pitch: 55, bearing: -20, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900}); }
  terapkanLapis();
}
function dataAlat() {
  const fs = [], D = T.dem, X = T.hasil?.X;
  if (D) fs.push({type: "Feature", properties: {j: "kotak"}, geometry: {type: "LineString", coordinates: [...D.sudut, D.sudut[0]]}});
  T.tanggul.forEach(tg => fs.push({type: "Feature", properties: {j: "tanggul"}, geometry: {type: "LineString", coordinates: tg.garis}}));
  if (T.draf.length > 1) fs.push({type: "Feature", properties: {j: "draf"}, geometry: {type: "LineString", coordinates: T.draf}});
  T.pompa.forEach(p => fs.push({type: "Feature", properties: {j: "pompa", n: `Pompa ${fmt(p.q)} m³/dtk`}, geometry: {type: "Point", coordinates: [p.lon, p.lat]}}));
  if (X?.sungai?.k != null) { const [lo, la] = SG.dariSel(D, X.sungai.k % D.nx, Math.floor(X.sungai.k / D.nx)); fs.push({type: "Feature", properties: {j: "sungai", n: "Luapan sungai masuk"}, geometry: {type: "Point", coordinates: [lo, la]}}); }
  return {type: "FeatureCollection", features: fs};
}
function terapkanLapis() { const m = T.peta; if (!m?.getLayer("gn-sat")) return;
  const v = (id, on) => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  v("gn-sat", T.lapis.citra); v("gn-air", T.lapis.air); v("gn-longsor", T.lapis.longsor);
  m.setPaintProperty("gn-kotak", "line-color", T.lapis.citra || gelap() ? "#ffffff" : "#0b2545"); }
const hasilLihat = () => T.hasil && (T.lihat === "dengan" && T.hasil.dengan ? T.hasil.dengan : T.hasil.dasar);
/* warna kedalaman (m) dan peluang longsor */
const RAMP = [[.02, [170, 215, 255, 60]], [.1, [120, 190, 250, 150]], [.5, [60, 140, 230, 190]], [1, [30, 95, 200, 210]], [2, [15, 55, 150, 225]], [4, [8, 25, 90, 235]]];
function warnaAir(d) { if (d < RAMP[0][0]) return null; for (let q = 1; q < RAMP.length; q++) if (d <= RAMP[q][0]) { const [a, ca] = RAMP[q - 1], [b, cb] = RAMP[q], f = (d - a) / (b - a); return ca.map((c, i) => c + (cb[i] - c) * f); } return RAMP[RAMP.length - 1][1]; }
const warnaLongsor = p => p < .05 ? null : p < .2 ? [242, 200, 75, 120] : p < .4 ? [229, 138, 69, 165] : [201, 80, 58, 200];
function petaLongsor(t) { const X = T.hasil.X, th = X.M.sm ?? SL.ASUMSI.THETA0, m = SL.kejenuhan(th, X.resap[Math.min(J, Math.round(t))]); return SL.peta(T.prep.lr, m); }
/* kanvas berubah -> unggah tekstur: sumber kanvas MapLibre hanya mengunggah ulang saat "play"; jeda lagi dua bingkai kemudian */
function segarKanvas(id) { const s = T.peta.getSource(id); if (!s) return; s.play(); clearTimeout(T.jedaK?.[id]); (T.jedaK ||= {})[id] = setTimeout(() => s.pause(), 120); }
function lukis(id, N, warna) { const c = T.kanvas[id]; if (!c) return; const px = c.img.data; px.fill(0);
  for (let k = 0; k < N; k++) { const w = warna(k); if (w) { const o = k * 4; px[o] = w[0]; px[o + 1] = w[1]; px[o + 2] = w[2]; px[o + 3] = w[3]; } }
  c.cx.putImageData(c.img, 0, 0); segarKanvas(id); }
function gambar() {
  T.raf = 0; const m = T.peta, R = hasilLihat(); if (!m || !R || !m.getSource("gn-air")) return;
  const N = R.nx * R.ny, t = T.t, a = Math.floor(t), b = Math.min(J, a + 1), f = t - a, K = R.kedalaman;
  lukis("gn-air", N, k => warnaAir(K[a * N + k] * (1 - f) + K[b * N + k] * f));
  if (T.lapis.longsor) { const L = petaLongsor(t); lukis("gn-longsor", N, k => warnaLongsor(L[k])); }
  const lb = $("#gnJam"); if (lb) lb.textContent = `+${Math.floor(t)} j · ${pukul(Math.floor(t))}`;
  const lu = $("#gnLuasT"); if (lu) lu.textContent = `${fmt(Math.round(ha(R.luas[a])))} ha tergenang`;
}
const jadwal = () => { if (!T.raf) T.raf = requestAnimationFrame(gambar); };
function tip() {
  T.rafTip = 0; const e = T.tipE, D = T.dem, R = hasilLihat(), el = $("#tip"); if (!e || !D || !R || T.alat) return el.classList.remove("on");
  const [fi, fj] = SG.keSel(D, e.lngLat.lng, e.lngLat.lat), i = Math.round(fi), j = Math.round(fj); if (i < 0 || j < 0 || i >= D.nx || j >= D.ny) return el.classList.remove("on");
  const k = j * D.nx + i, N = D.nx * D.ny, d = R.kedalaman[Math.floor(T.t) * N + k], p = petaLongsorSel(k);
  el.innerHTML = T.prep.laut[k] ? "<b>Laut</b>" : `<b>${d >= .02 ? `Air ${F2(d)} m` : "Kering"}</b><br>Tinggi tanah ${fmt(Math.round(D.z[k] * 10) / 10)} m · maks 72 jam ${F2(R.hmaks[k])} m<br>Lereng ${fmt(Math.round(T.prep.lr[k]))}° · peluang longsor ${fmt(Math.round(p * 100))} %`;
  el.classList.add("on"); el.style.left = Math.min(innerWidth - el.offsetWidth - 8, e.originalEvent.clientX + 14) + "px"; el.style.top = Math.max(8, e.originalEvent.clientY - el.offsetHeight - 12) + "px";
}
function petaLongsorSel(k) { const X = T.hasil.X, m = SL.kejenuhan(X.M.sm ?? SL.ASUMSI.THETA0, X.resap[Math.min(J, Math.round(T.t))]); return SL.peluang(T.prep.lr[k], m); }

/* ---------- animasi ---------- */
function putar() { if (T.main) return berhenti(); if (!hasilLihat()) return; if (T.t >= J) T.t = 0; T.main = true; ikonMain(); let lalu = performance.now();
  const lup = s => { if (!T.main) return; T.t = Math.min(J, T.t + (s - lalu) / 1000 * 6); lalu = s; const g = $("#gnT"); if (g) g.value = Math.floor(T.t); gambar(); if (T.t >= J) return berhenti(); requestAnimationFrame(lup); };
  requestAnimationFrame(lup); }
function berhenti() { T.main = false; ikonMain(); }
function ikonMain() { const b = $("#gnMain"); if (b) { b.innerHTML = ik(T.main ? IK.jeda : IK.main); b.setAttribute("aria-label", T.main ? "Jeda" : "Putar 72 jam"); } }

/* ---------- alat perlakuan ---------- */
function klik(e) {
  const {lng, lat} = e.lngLat;
  if (T.alat === "titik") { if (lat < -11.5 || lat > 6.5 || lng < 94 || lng > 141.5) return toast("Pilih titik di wilayah Indonesia");
    T.alat = null; T.titik = {lat, lon: lng, nama: "Titik pilihan", kab: `${Math.abs(lat).toLocaleString("id-ID", {maximumFractionDigits: 3})}° ${lat < 0 ? "LS" : "LU"}, ${lng.toLocaleString("id-ID", {maximumFractionDigits: 3})}° BT`};
    T.hasil = null; T.tanggul = []; T.pompa = []; T.peta.getCanvas().style.cursor = ""; nanti(() => { panel(); jalan(); }); return; }
  if (T.alat === "tanggul") { T.draf.push([lng, lat]); T.peta.getSource("gn-alat")?.setData(dataAlat()); return; }
  if (T.alat === "pompa") { const D = T.dem; if (D) { const [i, j] = SG.keSel(D, lng, lat).map(Math.round); if (i < 0 || j < 0 || i >= D.nx || j >= D.ny) return toast("Pompa harus di dalam kotak area");
      if (T.prep.laut[j * D.nx + i]) return toast("Pompa harus di darat"); }
    T.pompa.push({lon: lng, lat, q: T.laju}); T.alat = null; T.peta.getCanvas().style.cursor = ""; T.peta.getSource("gn-alat")?.setData(dataAlat()); tandaiBasi(); nanti(panel); }
}
function selesaiTanggul() {
  if (T.draf.length > 1) { T.tanggul.push({garis: T.draf, tinggi: T.tinggi}); tandaiBasi(); }
  T.draf = []; T.alat = null; if (T.peta) { T.peta.getCanvas().style.cursor = ""; T.peta.doubleClickZoom.enable(); T.peta.getSource("gn-alat")?.setData(dataAlat()); }
  nanti(panel);
}
function pakaiAlat(a) {
  if (T.alat === "tanggul") return selesaiTanggul();
  if (!T.dem && a !== "titik") return toast("Jalankan simulasi sekali dulu supaya medan termuat");
  T.alat = T.alat === a ? null : a; T.draf = [];
  if (T.peta) { T.peta.getCanvas().style.cursor = T.alat ? "crosshair" : ""; T.alat === "tanggul" ? T.peta.doubleClickZoom.disable() : T.peta.doubleClickZoom.enable(); }
  if (T.alat) toast({tanggul: "Klik titik-titik tanggul di peta, klik dua kali untuk selesai", pompa: "Klik lokasi pompa di peta", titik: "Klik pusat area di peta"}[T.alat]);
}

/* ---------- panel ---------- */
const geser = (id, lbl, min, max, step, v, tampil) => `<label class="simgeser"><span>${lbl}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><b class="num" id="${id}V">${tampil(v)}</b></label>`;
function panel() {
  const el = $("#simPanel"); if (!el) return; const atas = el.scrollTop, P = pusat(), R = hasilLihat(), H = T.hasil;
  const kecs = Object.entries(Simulasi.kec || {}).sort((a, b) => a[1].kab.localeCompare(b[1].kab) || a[1].nama.localeCompare(b[1].nama));
  const atur = {ekstrem: geser("gnE", "Hujan 3 hari", 100, 500, 25, T.op.ekstrem, v => fmt(v) + " mm"),
    sungai: geser("gnS", "Debit puncak", 2, 3, 1, T.op.sungai, v => v === 3 ? "Q20" : "Q5"), pasang: geser("gnP", "Muka laut naik", .2, 1.5, .1, T.op.pasang, v => angka1(v) + " m")}[T.sk] || "";
  const nPl = [T.tanggul.length && `${fmt(T.tanggul.length)} tanggul`, T.pompa.length && `${fmt(T.pompa.length)} pompa`, T.pintu && "pintu air tertutup"].filter(Boolean).join(" · ");
  el.innerHTML = `<div class="lbl">Simulasi genangan 72 jam · model</div><h2><span translate="no">${esc(P?.nama || "Pilih area")}</span></h2>
    <div style="font-size:12.5px;color:var(--ink2)"><span translate="no">${esc(P?.kab || "")}</span>${T.dem ? ` · sel ${fmt(Math.round(T.dem.dx))} m` : ""}${T.dem ? ` · <span id="gnEx">ketinggian ×${fmt(T.ex)}</span>` : ""}</div>
    ${Simulasi.modeHtml()}
    <label class="fld"><span class="lbl">Provinsi</span><select id="gnProv" aria-label="Provinsi">${Object.entries(S.meta.provinsi).map(([k, n]) => `<option value="${k}" ${k === Simulasi.prov ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="fld"><span class="lbl">Kecamatan</span><select id="gnKec" aria-label="Kecamatan">${T.titik ? `<option value="" selected>Titik pilihan</option>` : ""}${kecs.map(([k, c]) => `<option value="${esc(k)}" ${!T.titik && k === T.k ? "selected" : ""}>${esc(c.nama)} · ${esc(c.kab)}</option>`).join("")}</select></label>
    <div class="simchips" style="margin-top:8px"><button type="button" data-alat="titik" aria-pressed="${T.alat === "titik"}">Pilih titik di peta</button><span></span></div>
    ${geser("gnSisi", "Lebar area", 3, 12, 1, T.sisi / 1000, v => fmt(v) + " km")}
    <div class="lbl" style="margin:12px 0 6px">Skenario</div>
    <div class="simchips" role="group" aria-label="Skenario genangan">${SKN.map(s => `<button type="button" data-gsk="${s.id}" aria-pressed="${T.sk === s.id}"><i style="background:${s.w}"></i>${s.n}</button>`).join("")}</div>
    ${atur ? `<div class="simatur">${atur}</div>` : ""}
    <div class="lbl" style="margin:12px 0 6px">Perlakuan</div>
    <div class="simchips" role="group" aria-label="Perlakuan">
      <button type="button" data-alat="tanggul" aria-pressed="${T.alat === "tanggul"}">${T.alat === "tanggul" ? "Selesai menggambar" : "Gambar tanggul"}</button>
      <button type="button" data-alat="pompa" aria-pressed="${T.alat === "pompa"}">Pasang pompa</button>
      <button type="button" data-pintu aria-pressed="${T.pintu}">Pintu air tertutup</button>
      <button type="button" data-hapus ${adaPerlakuan() ? "" : "disabled"}>Hapus perlakuan</button></div>
    <div class="simatur">${geser("gnTg", "Tinggi tanggul", .5, 4, .5, T.tinggi, v => angka1(v) + " m")}${geser("gnPq", "Laju pompa", .1, 3, .1, T.laju, v => angka1(v) + " m³/dtk")}
      <p class="fnd">${nPl ? esc(nPl) : "Belum ada perlakuan."} <span class="pill l1" style="height:17px;font-size:9.5px">asumsi</span> pompa apung BPBD umumnya 0,1 sampai 0,5 m³/dtk</p></div>
    <details class="simatur-grup"><summary class="lbl">Asumsi model</summary><div class="simatur">${geser("gnCN", "Bilangan kurva CN", 60, 95, 1, T.cn, v => fmt(v))}
      <p class="fnd">CN tinggi = tanah kedap (kota), rendah = tanah menyerap (hutan). Bawaan ${fmt(SG.ASUMSI.CN)}.</p></div></details>
    <button class="btn pri" id="gnJalan" style="width:100%;margin-top:10px" ${T.sibuk ? "disabled" : ""}>${H ? (T.basi ? "Jalankan ulang" : "Jalankan lagi") : "Jalankan simulasi"}</button>
    <p class="fnd" id="gnStatus" aria-live="polite" style="margin-top:6px"></p>
    <div id="gnHasil">${R ? hasilHtml() : ""}</div>`;
  el.onclick = klikPanel;
  $("#gnProv").onchange = async e => { Simulasi.prov = e.target.value; Simulasi.kab = ""; T.titik = null; T.hasil = null; status("Menyiapkan kecamatan…"); await Simulasi.siapkan(Simulasi.prov); T.k = kecAwal(); panel(); };
  $("#gnKec").onchange = e => { if (!e.target.value) return; T.k = e.target.value; T.titik = null; T.hasil = null; T.tanggul = []; T.pompa = []; nanti(() => { panel(); jalan(); }); };
  const gs = (id, set, t) => { const i = $("#" + id); if (i) i.oninput = () => { set(+i.value); $("#" + id + "V").textContent = t(+i.value); tandaiBasi(); }; };
  gs("gnSisi", v => T.sisi = v * 1000, v => fmt(v) + " km"); gs("gnE", v => T.op.ekstrem = v, v => fmt(v) + " mm"); gs("gnS", v => T.op.sungai = v, v => v === 3 ? "Q20" : "Q5");
  gs("gnP", v => T.op.pasang = v, v => angka1(v) + " m"); gs("gnTg", v => T.tinggi = v, v => angka1(v) + " m"); gs("gnPq", v => T.laju = v, v => angka1(v) + " m³/dtk"); gs("gnCN", v => T.cn = v, v => fmt(v));
  el.scrollTop = atas; dok();
}
function klikPanel(e) {
  const b = e.target.closest("button"); if (!b || b.disabled) return; const d = b.dataset;
  if (d.mode) return Simulasi.gantiMode(d.mode);
  if (d.gsk) { T.sk = d.gsk; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); tandaiBasi(); return nanti(panel); }
  if (d.alat) { pakaiAlat(d.alat); b.setAttribute("aria-pressed", T.alat === d.alat); return nanti(panel); }
  if ("pintu" in d) { T.pintu = !T.pintu; b.setAttribute("aria-pressed", T.pintu); tandaiBasi(); return nanti(panel); }
  if ("hapus" in d) { T.tanggul = []; T.pompa = []; T.pintu = false; T.draf = []; tandaiBasi(); T.peta?.getSource("gn-alat")?.setData(dataAlat()); return nanti(panel); }
  if (d.glihat) { T.lihat = d.glihat; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); return nanti(() => { panel(); jadwal(); }); }
  if (d.glapis) { const k = d.glapis; T.lapis[k] = !T.lapis[k]; b.setAttribute("aria-pressed", T.lapis[k]); return nanti(() => { terapkanLapis(); jadwal(); }); }
  if (b.id === "gnJalan") { b.textContent = "Menghitung…"; return nanti(jalan); }
  if (b.id === "gnKamera") return nanti(() => T.peta?.easeTo({bearing: T.peta.getBearing() + 90, pitch: 60, duration: 1200}));
}
function ringkas(R) {
  const lu = Math.max(...R.luas), tp = R.luas.indexOf(lu); let dm = 0; for (let k = 0; k < R.hmaks.length; k++) if (!T.prep.laut[k] && R.hmaks[k] > dm) dm = R.hmaks[k];
  return {lu, tp, dm, vol: Math.max(...R.volume), l72: R.luas[J], kering: R.neraca.pompaMinta > 0 ? R.neraca.pompa / R.neraca.pompaMinta : 1};
}
function hasilHtml() {
  const H = T.hasil, X = H.X, a = ringkas(H.dasar), b = H.dengan ? ringkas(H.dengan) : null, R = hasilLihat(), r = R === H.dengan ? b : a, P = X.P, kp = kepadatan(P);
  const orang = s => { if (!kp) return "–"; const a = rb(s.lu / 1e6 * kp[0]), z = rb(s.lu / 1e6 * kp[1]); return a === z ? a : `${a}–${z}`; }, sk = SKN.find(s => s.id === T.sk), n = R.neraca;
  const persen = x => x < 1e-4 ? "< 0,01 %" : F2(x * 100) + " %";
  const tot = X.hari.reduce((s, x) => s + x.p, 0), M = X.M;
  const nL = (() => { const L = petaLongsor(J); let c = 0; for (let k = 0; k < L.length; k++) if (L[k] >= .4 && !T.prep.laut[k]) c++; return c * T.dem.dx ** 2; })();
  const baris = (nm, f, sat) => `<tr><td>${nm}</td><td class="n num">${f(a)}${sat}</td><td class="n num">${f(b)}${sat}</td><td class="n num">${(() => { const x = f(b, 1) - f(a, 1); return (x > 0 ? "+" : "") + (Math.abs(x) < 100 ? F2(x) : fmt(Math.round(x))); })()}</td></tr>`;
  return `<span class="pill l3" style="margin-top:12px">Model, belum divalidasi</span>
    <div class="kv"><div><b>${fmt(Math.round(ha(r.lu)))}</b><span>Hektare tergenang puncak${b ? `<em>tanpa perlakuan ${fmt(Math.round(ha(a.lu)))}</em>` : ""}</span></div>
      <div><b>${F2(r.dm)}</b><span>Meter kedalaman maks${b ? `<em>tanpa ${F2(a.dm)}</em>` : ""}</span></div>
      <div><b>${orang(r)}</b><span>Orang di genangan<em>asumsi kepadatan</em></span></div></div>
    <div class="simringkas"><div class="lbl"><span>Ringkasan</span> · <span>${sk.n}</span></div>
      <p>${r.lu ? `Genangan 10 cm ke atas terluas <b>${fmt(Math.round(ha(r.lu)))} ha</b> pada jam +${fmt(r.tp)} (${pukul(r.tp)})` : "Tidak ada genangan 10 cm ke atas dalam 72 jam"}, dari hujan ${fmt(Math.round(tot))} mm dalam 3 hari${X.sungai?.k != null ? " dan luapan sungai" : ""}${X.muka ? " dengan pasang laut" : ""}.${b ? ` Perlakuan ${b.lu <= a.lu ? "mengurangi" : "menambah"} luas puncak dari ${fmt(Math.round(ha(a.lu)))} ha menjadi ${fmt(Math.round(ha(b.lu)))} ha.` : ""}${nL ? ` ${fmt(Math.round(ha(nL)))} ha lereng berpeluang longsor 40 % ke atas di jam +72.` : ""}</p></div>
    <div class="simchips" role="group" aria-label="Lapisan peta" style="margin-top:10px">${[["air", "Genangan"], ["longsor", "Longsor"], ["citra", "Citra satelit"]].map(([k, nm]) => `<button type="button" data-glapis="${k}" aria-pressed="${T.lapis[k]}">${nm}</button>`).join("")}
      <button type="button" id="gnKamera">Putar kamera</button></div>
    ${b ? `<div class="simchips" role="group" aria-label="Hasil yang dilihat" style="margin-top:6px"><button type="button" data-glihat="dasar" aria-pressed="${T.lihat === "dasar"}">Tanpa perlakuan</button><button type="button" data-glihat="dengan" aria-pressed="${T.lihat === "dengan"}">Dengan perlakuan</button></div>
    <div class="lbl" style="margin-top:12px">Sebelum dan sesudah perlakuan</div>
    <table class="tb3" style="margin-top:4px"><thead><tr><th></th><th class="n">Tanpa</th><th class="n">Dengan</th><th class="n">Selisih</th></tr></thead><tbody>
      ${baris("Luas puncak", (s, raw) => raw ? ha(s.lu) : fmt(Math.round(ha(s.lu))), " ha")}${baris("Luas jam +72", (s, raw) => raw ? ha(s.l72) : fmt(Math.round(ha(s.l72))), " ha")}
      ${baris("Kedalaman maks", (s, raw) => raw ? s.dm : F2(s.dm), " m")}${baris("Volume puncak", (s, raw) => raw ? s.vol / 1e3 : fmt(Math.round(s.vol / 1e3)), " rb m³")}
      ${kp ? baris("Orang di genangan", (s, raw) => raw ? s.lu / 1e6 * (kp[0] + kp[1]) / 2 : rb(s.lu / 1e6 * (kp[0] + kp[1]) / 2), "") : ""}</tbody></table>
    ${b.kering < .999 ? `<p class="fnd">Pompa hanya bekerja ${fmt(Math.round(b.kering * 100))} % dari kapasitas: lokasinya sering kering.</p>` : ""}` : ""}
    <div class="lbl" style="margin-top:12px">Masukan dari data</div>
    <table class="tb2" style="margin-top:4px"><tbody>
      ${X.hari.map((x, d) => `<tr><td>Hujan ${tglPendek(S.hujan.hari[M.i0 + d])}</td><td class="n">${fmt(Math.round(x.p * 10) / 10)} mm</td></tr>`).join("")}
      <tr><td>Bilangan kurva (CN ${fmt(T.cn)}, kelembapan ${["", "kering", "normal", "basah"][X.amc]})</td><td class="n">${fmt(Math.round(X.cn))}</td></tr>
      <tr><td>Hujan menjadi limpasan</td><td class="n">${fmt(Math.round(X.efektif.reduce((s, v) => s + v, 0)))} mm</td></tr>
      <tr><td>Sungai${X.sungai?.sg ? ` <span translate="no">${esc(X.sungai.sg.kec)}</span>` : ""}</td><td class="n">${X.sungai?.k != null ? `luapan puncak ${fmt(Math.round(Math.max(...X.sungai.q)))} m³/dtk` : X.sungai?.catat || (M.sg ? "di luar area" : "tidak ada titik ≤ 25 km")}</td></tr>
      <tr><td>Muka laut maks</td><td class="n">${X.muka ? `${F2(Math.max(...X.muka))} m${X.mukaSumber === "asumsi" ? " (asumsi)" : ""}` : "bukan pesisir"}</td></tr></tbody></table>
    <div class="lbl" style="margin-top:12px">Neraca massa</div>
    <table class="tb2" style="margin-top:4px"><tbody>
      <tr><td>Masuk: limpasan + sungai + laut</td><td class="n">${rb(n.masuk)} m³</td></tr>
      <tr><td>Keluar: tepi area + laut + pompa</td><td class="n">${rb(n.keluar)} m³</td></tr>
      <tr><td>Tersimpan di jam +72</td><td class="n">${rb(n.simpan)} m³</td></tr>
      <tr><td>Galat neraca</td><td class="n">${persen(n.galat)}</td></tr></tbody></table>`;
}
function dok() {
  const el = $("#simLegenda"); if (!el) return; const R = hasilLihat();
  el.innerHTML = R ? `<div class="gn-waktu"><button type="button" class="gn-ib" id="gnMain" aria-label="Putar 72 jam">${ik(IK.main)}</button>
      <input type="range" id="gnT" min="0" max="${J}" step="1" value="${Math.floor(T.t)}" aria-label="Jam simulasi"><b id="gnJam" class="num"></b></div>
    <div class="leg row"><span id="gnLuasT" class="num"></span>${[[.1, "10 cm"], [.5, "50 cm"], [1, "1 m"], [2, "2 m"], [4, "≥ 4 m"]].map(([d, n]) => `<span><i class="sw" style="background:rgba(${warnaAir(d).slice(0, 3).join(",")},.9)"></i>${n}</span>`).join("")}
      ${T.lapis.longsor ? `<span><i class="sw" style="background:#c9503a"></i>longsor ≥ 40 %</span>` : ""}</div>`
    : `<div class="lbl" style="margin:0">Genangan 72 jam</div><div class="fnd">Pilih area lalu jalankan simulasi.</div>`;
  if (!R) return;
  ikonMain(); $("#gnMain").onclick = putar;
  $("#gnT").oninput = e => { berhenti(); T.t = +e.target.value; jadwal(); };
  jadwal();
}

/* ---------- masuk / keluar mode ---------- */
async function render() {
  const pa = $("#simPanel"); if (!pa) return; SL = window.SimLongsor;
  if (!Simulasi.kec || Simulasi.kode !== Simulasi.prov) { pa.innerHTML = `<div class="kosong"><div class="spin"></div>Menyiapkan kecamatan…</div>`; await Simulasi.siapkan(Simulasi.prov); }
  if (!T.k || !Simulasi.kec[T.k]) T.k = kecAwal();
  $("#p-sim").classList.add("gn");
  panel(); await petaSiap(); if (T.dem) { pasangArea(false); jadwal(); }
}
function lepas() { berhenti(); $("#p-sim")?.classList.remove("gn"); const el = $("#simPeta3"); if (el) el.hidden = true; const p = $("#simPeta"); if (p) p.hidden = false; $("#tip")?.classList.remove("on"); }
return {render, lepas, jalan, T, _uji: {susun, cfgDari, siapkan, masukan, hariSkenario}};
})();
window.SimTampak = SimTampak;
