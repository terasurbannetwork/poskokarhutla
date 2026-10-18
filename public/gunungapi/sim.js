"use strict";
/* sim.js: simulasi erupsi gunung api (3D). window.Sim = {buka({id, akar}), tutup()}.
   Abu: window.AbuModel (abu_model.js) + angin nyata 72 jam. Lahar & awan panas: sim_lahar.js di Web Worker (DEM terrarium z12).
   Desa dari data/paparan.json bila ada; rute evakuasi dari data/paparan_geo.json bila ada. Format dari ../inti/format.js, tabel dari ../inti/tabel.js. */
(() => {
const Z = 12, JU = 5;                       /* mosaik ubin DEM JU x JU pada zoom Z (~49 km, piksel ~38 m) */
const TERRARIUM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const KOLOM = [1, 3, 5, 10, 15], DURASI = [1, 3, 6, 12, 24], VOL = [1e5, 1e6, 1e7], HL = [0.2, 0.25, 0.3, 0.35];
const V_PDC = 20, V_LAHAR = 6, T_LAHAR = 1;  /* m/dtk dan jam mulai lahar: ilustrasi, bukan hasil model */
const KM_JAM_EVAKUASI = 25;                  /* kecepatan kendaraan di jalan evakuasi (asumsi) */
const WARNA = {abu: "#8a7a6b", lahar: "#3f7cc4", pdc: "#d64545", tebal: "#6b4a1f", sedang: "#b08a4f", tipis: "#dcc99b"};
const slug = n => String(n).toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "-");
const R_BUMI = 6371;
const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, h = Math.sin(y / 2) ** 2 + Math.cos(b * r) * Math.cos(d * r) * Math.sin(x / 2) ** 2; return 2 * R_BUMI * Math.asin(Math.sqrt(h)); };
const ambil = async u => { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const pil = (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`;
const kosongFC = () => ({type: "FeatureCollection", features: []});
const BULAT = (x, d = 0) => fmt(Math.round(x * 10 ** d) / 10 ** d);
const tanyaGelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const toastS = m => { const t = $("#toast"); if (!t) return; t.textContent = m; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };

let S = null; /* keadaan satu sesi simulasi; null = tutup */

/* ---------------------------------------------------------------- angin */
async function anginOpenMeteo(lat, lon) {
  const HPA = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200], v = HPA.flatMap(h => [`wind_speed_${h}hPa`, `wind_direction_${h}hPa`, `geopotential_height_${h}hPa`]);
  const d = await ambil(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&hourly=${v.join(",")}&wind_speed_unit=ms&timezone=GMT&forecast_days=5`);
  const T = d.hourly.time, nowH = Math.floor(Date.now() / 36e5) * 36e5;
  let i0 = T.findIndex(t => Date.parse(t + "Z") >= nowH); if (i0 < 0 || T.length - i0 < 73) i0 = Math.max(0, T.length - 73);
  const potong = a => a.slice(i0, i0 + 73);
  return {mulai: new Date(Date.parse(T[i0] + "Z")).toISOString(), langkah_jam: 1, jam: 72, lapis: HPA.map(h => {
    const sp = potong(d.hourly[`wind_speed_${h}hPa`]), dr = potong(d.hourly[`wind_direction_${h}hPa`]);
    return {hpa: h, z_m: potong(d.hourly[`geopotential_height_${h}hPa`]), u: sp.map((s, i) => -s * Math.sin(dr[i] * Math.PI / 180)), v: sp.map((s, i) => -s * Math.cos(dr[i] * Math.PI / 180))}; })};
}
/* potong angin berkas harian ke jam sekarang; null bila sisa < 73 jam (minta Open-Meteo) */
function anginSekarang(a) {
  if (!a?.lapis?.length || !a.mulai) return null;
  const off = Math.max(0, Math.floor((Date.now() - Date.parse(a.mulai)) / 36e5)), n = a.lapis[0].u.length;
  if (n - off < 73) return null;
  return {...a, mulai: new Date(Date.parse(a.mulai) + off * 36e5).toISOString(), jam: 72, lapis: a.lapis.map(l => ({...l, z_m: l.z_m.slice(off), u: l.u.slice(off), v: l.v.slice(off)}))};
}

/* ---------------------------------------------------------------- DEM */
async function muatDem(lat, lon) {
  const [gx, gy] = Lahar.llKePx(Z, lon, lat), tx0 = Math.floor(gx / 256) - 2, ty0 = Math.floor(gy / 256) - 2, n = JU * 256;
  const cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d", {willReadFrequently: true});
  g.fillStyle = "rgb(128,0,0)"; g.fillRect(0, 0, n, n); /* ubin gagal dianggap 0 m (laut) */
  let gagal = 0;
  const antre = Array.from({length: JU * JU}, (_, k) => k); /* 6 unduhan sekaligus + 1 ulangan: puluhan permintaan serentak ke S3 sering terputus */
  const kerja = async () => { for (let k; (k = antre.shift()) != null;) { const i = k % JU, j = (k / JU) | 0; let ok = false;
    for (let coba = 0; coba < 2 && !ok; coba++) try { const r = await fetch(TERRARIUM(Z, tx0 + i, ty0 + j)); if (!r.ok) throw 0; const bm = await createImageBitmap(await r.blob()); g.drawImage(bm, i * 256, j * 256); ok = true; } catch {}
    if (!ok) gagal++; } };
  await Promise.all(Array.from({length: 6}, kerja));
  if (gagal > JU * JU / 2) throw new Error("ubin medan gagal dimuat");
  const dem = Lahar.elevasi(g.getImageData(0, 0, n, n).data, n * n);
  const sampel = []; for (let i = 0; i < dem.length; i += 97) if (dem[i] > 1) sampel.push(dem[i]); sampel.sort((a, b) => a - b);
  const relief = sampel.length > 50 ? sampel[Math.floor(sampel.length * .98)] - sampel[Math.floor(sampel.length * .05)] : 500;
  return {dem, n, tx0, ty0, pusat: [gx - tx0 * 256, gy - ty0 * 256], relief, ex: relief < 600 ? 2 : relief < 1500 ? 1.6 : 1.3};
}

/* ---------------------------------------------------------------- bentuk geojson */
function cincin(lon, lat, rKm, n = 24) { const k = Math.cos(lat * Math.PI / 180), c = []; for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; c.push([lon + Math.cos(a) * rKm / 111.32 / k, lat + Math.sin(a) * rKm / 110.57]); } return c; }
const kotak = (lon, lat, s) => [[lon - s, lat - s], [lon + s, lat - s], [lon + s, lat + s], [lon - s, lat + s], [lon - s, lat - s]];

/* ================================================================ buka / tutup */
async function buka(o = {}) {
  tutup();
  const akar = o.akar || $("#sim-akar"); if (!akar) return;
  const mine = S = {akar, id: o.id || "semeru", g: null, st: null, abu: null, pap: null, geo: null, peta: null, siap: false, hasil: null, angin: null, anginSumber: "", dem: null, lahar: null, seq: 0, t: 0, main: false, kec: 3,
    p: {kolom: 5, durasi: 6, V: 1e6, hl: 0.3, radius: 5}, tutup: new Set(), tabel: {urut: "abu", turun: true, hal: 0}, desa: [], tick: 0};
  akar.innerHTML = `<div class="sm"><div class="sm-peta" id="smPeta"></div><div class="sm-muat" id="smMuat">Menghitung…</div><div class="box sm-leg" id="smLeg"></div>
    <aside class="card sm-panel" id="smPanel"><div class="sm-hd"><h2 id="smJudul">Simulasi erupsi</h2><p>Ilustrasi bahaya, bukan prakiraan letusan.</p></div><div class="sm-bd" id="smBd"><p class="sm-msg">Memuat data gunung…</p></div></aside>
    <div class="box sm-waktu" id="smWaktu"></div></div>`;
  try {
    const [st, abu, pap] = await Promise.all([ambil("../banjir/data/gunungapi_status.json"), ambil("../banjir/data/abu_gunungapi.json").catch(() => null), ambil("data/paparan.json").catch(() => null)]);
    if (S !== mine) return;
    mine.st = st; mine.abu = abu; mine.pap = pap;
    mine.g = st.gunung.find(g => slug(g.nama) === mine.id) || st.gunung.find(g => slug(g.nama) === "semeru") || st.gunung[0]; mine.id = slug(mine.g.nama);
    const ga = abu?.gunung?.find(x => x.id === mine.id); if (ga?.kolom_m) mine.p.kolom = KOLOM.reduce((a, b) => Math.abs(b * 1000 - ga.kolom_m) < Math.abs(a * 1000 - ga.kolom_m) ? b : a);
    mine.p.radius = Math.round(mine.g.radius_km || 5);
    mine.pg = pap?.gunung?.find(x => x.id === mine.id) || null;
    mine.desa = (mine.pg?.desa || []).map(d => ({...d, km: jarakKm(mine.g.lon, mine.g.lat, d.lon, d.lat)}));
    mine.demP = muatDem(mine.g.lat, mine.g.lon); mine.demP.catch(() => {}); /* mulai sebelum peta: ubin S3 bersaing dengan ubin peta untuk 6 sambungan */
    panel(); legenda(); waktu(); petaBaru();
    ambil("data/paparan_geo.json").then(j => { if (S !== mine) return; mine.geo = j[mine.id] || null; rute(); }).catch(() => { if (S === mine) rute(); });
    hitungAngin().then(() => { if (S === mine) { hitungAbu(); } });
    demDanLahar();
  } catch (e) { console.error("Sim:", e); if (S === mine) $("#smBd").innerHTML = `<p class="sm-msg">Simulasi belum bisa dimuat: ${esc(e.message)}</p>`; }
}
function tutup() {
  if (!S) return;
  cancelAnimationFrame(S.raf); S.worker?.terminate(); try { S.peta?.remove(); } catch {} if (S.akar) S.akar.innerHTML = ""; S = null;
}

/* ---------------------------------------------------------------- angin & abu */
async function hitungAngin() {
  const s = S, ga = s.abu?.gunung?.find(x => x.id === s.id);
  let a = anginSekarang(ga?.angin); s.anginSumber = a ? "angin prakiraan harian Pantau Bencana (Open-Meteo, ECMWF IFS)" : "";
  if (!a) { try { a = await anginOpenMeteo(s.g.lat, s.g.lon); s.anginSumber = "angin prakiraan Open-Meteo (ECMWF IFS), diambil langsung"; } catch (e) { console.error("angin:", e); } }
  if (S === s) s.angin = a;
}
function hitungAbu() {
  const s = S; if (!s) return;
  if (!s.angin || !window.AbuModel) { $("#smHasil").innerHTML = `<p class="sm-msg">Sebaran abu belum bisa dihitung: ${!window.AbuModel ? "mesin abu belum dimuat" : "angin prakiraan tidak terjangkau"}.</p>`; return; }
  const seq = ++s.seq; $("#smMuat").classList.add("on");
  setTimeout(() => { if (S !== s || seq !== s.seq) return;
    const t0 = performance.now();
    s.hasil = AbuModel.jalankan({lat: s.g.lat, lon: s.g.lon, puncak_m: s.g.tinggi, kolom_m: s.p.kolom * 1000, durasi_jam: s.p.durasi, angin: s.angin, jam: 72, n: 2000, seed: 1});
    s.msAbu = Math.round(performance.now() - t0);
    endapan(); $("#smMuat").classList.remove("on"); gambarKolom(); gambarAbu(); hasilKartu(); tabelDesa(); evakuasi(); }, 30);
}
/* massa relatif di kisi + desa dalam SATU panggilan (normalisasi sama) */
function endapan() {
  const s = S, h = s.hasil, akhir = h.snap[h.snap.length - 1]; let w = 1e9, e = -1e9, so = 1e9, n = -1e9;
  for (let i = 0; i < akhir.lon.length; i++) if (akhir.aktif[i] || akhir.darat[i]) { w = Math.min(w, akhir.lon[i]); e = Math.max(e, akhir.lon[i]); so = Math.min(so, akhir.lat[i]); n = Math.max(n, akhir.lat[i]); }
  if (w > e) { s.kisi = null; return; }
  const m = 0.15, c = 1.4; /* kisi dibatasi ~150 km dari kawah: lebih jauh dari itu abu terlalu tipis untuk dibedakan */
  w = Math.max(w - m, s.g.lon - c); e = Math.min(e + m, s.g.lon + c); so = Math.max(so - m, s.g.lat - c); n = Math.min(n + m, s.g.lat + c); const K = 32, dw = (e - w) / K, dn = (n - so) / K, titik = [];
  for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) titik.push({lon: w + (i + .5) * dw, lat: so + (j + .5) * dn});
  const radKisi = Math.max(1, Math.min(8, Math.hypot(dw * 111 * Math.cos(s.g.lat * Math.PI / 180), dn * 111) * .7));
  const nK = titik.length; s.desa.forEach(d => titik.push({lat: d.lat, lon: d.lon}));
  const rel = AbuModel.endapan(h, {titik, radius_km: radKisi});
  const fs = []; for (let q = 0; q < nK; q++) if (rel[q] > 0.01) { const t = titik[q]; fs.push({type: "Feature", geometry: {type: "Polygon", coordinates: [[[t.lon - dw / 2, t.lat - dn / 2], [t.lon + dw / 2, t.lat - dn / 2], [t.lon + dw / 2, t.lat + dn / 2], [t.lon - dw / 2, t.lat + dn / 2], [t.lon - dw / 2, t.lat - dn / 2]]]}, properties: {r: rel[q]}}); }
  s.kisi = {type: "FeatureCollection", features: fs};
  s.desa.forEach((d, i) => { d.abu = rel[nK + i]; });
  const src = s.peta?.getSource("endap"); src?.setData(s.kisi);
}
const kelasAbu = r => r >= .5 ? ["Tebal", WARNA.tebal] : r >= .1 ? ["Sedang", WARNA.sedang] : r >= .02 ? ["Tipis", "#a8946a"] : null;

/* ---------------------------------------------------------------- lahar & awan panas */
async function demDanLahar() {
  const s = S;
  try { s.dem = await s.demP; } catch (e) { console.error("DEM:", e); if (S === s) { $("#smLahar").innerHTML = `<p class="sm-msg">Lahar dan awan panas tidak bisa dihitung: ${esc(e.message)}.</p>`; } return; }
  if (S !== s) return;
  if (s.peta?.getSource("dem")) { try { s.peta.setTerrain({source: "dem", exaggeration: s.dem.ex}); } catch {} gambarKolom(); gambarAbu(); }
  hitungLahar();
}
function hitungLahar() {
  const s = S; if (!s?.dem) return; const seq = ++s.laharSeq || (s.laharSeq = 1); s.laharSeq = seq; $("#smMuat").classList.add("on");
  const opsi = {dem: s.dem.dem, n: s.dem.n, m: s.dem.n, z: Z, lat: s.g.lat, pusat: s.dem.pusat, V: s.p.V, hl: s.p.hl};
  const selesai = r => { if (S !== s || seq !== s.laharSeq) return; $("#smMuat").classList.remove("on"); s.lahar = r; terapkanLahar(); };
  const gagal = e => { console.error("lahar:", e); if (S === s) { $("#smMuat").classList.remove("on"); $("#smLahar").innerHTML = `<p class="sm-msg">Lahar dan awan panas gagal dihitung.</p>`; } };
  try {
    s.worker ||= new Worker("/gunungapi/sim_lahar.js");
    s.worker.onmessage = e => e.data.ok ? selesai(e.data.r) : gagal(e.data.galat);
    s.worker.onerror = () => { s.worker.terminate(); s.worker = null; setTimeout(() => { try { selesai(Lahar.simulasi(opsi)); } catch (e) { gagal(e); } }, 30); }; /* worker gagal dimuat: hitung di utas utama */
    s.worker.postMessage(opsi);
  } catch { setTimeout(() => { try { selesai(Lahar.simulasi(opsi)); } catch (e) { gagal(e); } }, 30); }
}
function terapkanLahar() {
  const s = S, r = s.lahar, d = s.dem, m = s.peta; if (!r || !s.siap) { s.laharTunda = true; return; }
  s.laharTunda = false;
  const [x0, y0, x1, y1] = r.bbox, w = x1 - x0 + 1, h = y1 - y0 + 1, gx = d.tx0 * 256, gy = d.ty0 * 256;
  const ll = (x, y) => Lahar.pxKeLL(Z, gx + x, gy + y);
  s.kanvas = {w, h, x0, y0, coords: [ll(x0, y0), ll(x1 + 1, y0), ll(x1 + 1, y1 + 1), ll(x0, y1 + 1)]};
  for (const k of ["lahar", "pdc"]) { const c = document.createElement("canvas"); c.width = w; c.height = h; s.kanvas[k] = {c, g: c.getContext("2d"), data: null, ptr: 0}; s.kanvas[k].data = s.kanvas[k].g.createImageData(w, h); }
  /* sumber canvas (bukan image + data URL: CSP halaman melarang connect-src data:); ukuran canvas tetap per hasil, jadi sumber dipasang ulang */
  for (const k of ["pdc", "lahar"]) { const id = k + "-img"; if (m.getLayer(id)) m.removeLayer(id); if (m.getSource(id)) m.removeSource(id);
    m.addSource(id, {type: "canvas", canvas: s.kanvas[k].c, coordinates: s.kanvas.coords, animate: false}); m.addLayer({id, type: "raster", source: id, paint: {"raster-fade-duration": 0, "raster-resampling": "nearest"}}, "jalur"); }
  m.getSource("jalur").setData({type: "FeatureCollection", features: r.jalur.map(j => ({type: "Feature", geometry: {type: "LineString", coordinates: j.titik.map(([x, y]) => ll(x, y))}, properties: {utama: j.utama ? 1 : 0}}))});
  s.laharIdx = new Set(r.lahar.idx); s.pdcIdx = new Set(r.pdc.idx);
  desaTerpapar(); gambarLahar(true); hasilKartu(); tabelDesa(); evakuasi();
}
/* gambar sel yang sudah dicapai muka aliran pada jam t; maju = hanya tambahan, mundur = ulang dari nol */
function gambarLahar(paksa) {
  const s = S, r = s.lahar, K = s.kanvas, m = s.peta; if (!r || !K || !m?.getSource("lahar-img")) return;
  const hit = (nama, tabel, front, rgb) => { const o = K[nama]; if (!o) return; let ptr = o.ptr;
    if (paksa || (ptr > 0 && tabel.s[ptr - 1] > front)) { o.data.data.fill(0); ptr = 0; }
    const px = o.data.data, n = s.dem.n; let tambah = paksa || ptr === 0;
    while (ptr < tabel.s.length && tabel.s[ptr] <= front) { const i = tabel.idx[ptr], x = (i % n) - K.x0, y = ((i / n) | 0) - K.y0; if (x >= 0 && y >= 0 && x < K.w && y < K.h) { const q = (y * K.w + x) * 4; px[q] = rgb[0]; px[q + 1] = rgb[1]; px[q + 2] = rgb[2]; px[q + 3] = 215; } ptr++; tambah = true; }
    if (!tambah && ptr === o.ptr) return;
    o.ptr = ptr; o.g.putImageData(o.data, 0, 0); const src = m.getSource(nama + "-img"); src.play(); src.pause(); /* play+pause = unggah ulang tekstur sekali */ };
  hit("pdc", r.pdc, s.t * 3600 * V_PDC, [214, 69, 69]);
  hit("lahar", r.lahar, Math.max(-1, (s.t - T_LAHAR) * 3600 * V_LAHAR), [63, 124, 196]);
}
/* desa yang titiknya (atau tetangga 1 piksel) kena lahar / awan panas */
function desaTerpapar() {
  const s = S, n = s.dem.n, gx = s.dem.tx0 * 256, gy = s.dem.ty0 * 256;
  const kena = (set, px, py) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (set.has((py + dy) * n + px + dx)) return true; return false; };
  for (const d of s.desa) { const [a, b] = Lahar.llKePx(Z, d.lon, d.lat), px = Math.round(a - gx), py = Math.round(b - gy);
    d.lahar = px > 1 && py > 1 && px < n - 2 && py < n - 2 && kena(s.laharIdx, px, py); d.pdc = px > 1 && py > 1 && px < n - 2 && py < n - 2 && kena(s.pdcIdx, px, py); }
}

/* ---------------------------------------------------------------- gambar di peta */
/* Awan abu dan kolom erupsi = lapisan custom WebGL (titik bersprite bulat ber-blur, seperti asap sim_adegan.js tetapi tanpa three.js).
   Posisi = mercator + tinggi z (m di atas laut) x pembesaran relief, jadi ikut terrain dan tertutup bukit lewat uji kedalaman. Alpha menumpuk = kerapatan. */
const VS = `uniform mat4 uM; uniform float uPxM; uniform float uCam; uniform float uDpr; attribute vec3 aP; attribute vec3 aS; varying float vA; varying float vH;
  void main(){ vec4 p = uM * vec4(aP, 1.); gl_Position = p; gl_PointSize = clamp(aS.x * uPxM * uCam / max(p.w, 1.) * uDpr, 8., 80.); vA = aS.y; vH = aS.z; }`;
const FS = `precision mediump float; varying float vA; varying float vH;
  void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d); a = a * a * vA; if (a < .004) discard;
    vec3 c = mix(vec3(.78,.68,.56), vec3(.62,.64,.70), clamp(vH, 0., 1.)); gl_FragColor = vec4(c * a, a); }`;
function lapisAwan() {
  const L = {id: "awan", type: "custom", renderingMode: "3d", n: 0, data: null, dirty: false,
    onAdd(map, gl) { this.map = map; this.gl = gl;
      const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
      const pr = this.prog = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      this.u = {m: gl.getUniformLocation(pr, "uM"), px: gl.getUniformLocation(pr, "uPxM"), cam: gl.getUniformLocation(pr, "uCam"), dpr: gl.getUniformLocation(pr, "uDpr")};
      this.a = {p: gl.getAttribLocation(pr, "aP"), s: gl.getAttribLocation(pr, "aS")}; this.buf = gl.createBuffer(); },
    onRemove(map, gl) { gl.deleteBuffer(this.buf); gl.deleteProgram(this.prog); },
    set(arr) { this.data = arr; this.n = arr.length / 6; this.dirty = true; this.map?.triggerRepaint(); },
    render(gl, matrix) {
      if (!this.n) return;
      const t = this.map.transform, lat = t.center.lat, pxM = 512 * 2 ** t.zoom / (40075016.686 * Math.cos(lat * Math.PI / 180));
      gl.useProgram(this.prog); gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      if (this.dirty) { gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW); this.dirty = false; }
      gl.uniformMatrix4fv(this.u.m, false, matrix); gl.uniform1f(this.u.px, pxM); gl.uniform1f(this.u.cam, t.cameraToCenterDistance); gl.uniform1f(this.u.dpr, devicePixelRatio || 1);
      gl.enableVertexAttribArray(this.a.p); gl.vertexAttribPointer(this.a.p, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(this.a.s); gl.vertexAttribPointer(this.a.s, 3, gl.FLOAT, false, 24, 12);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, this.n); gl.disableVertexAttribArray(this.a.p); gl.disableVertexAttribArray(this.a.s); }};
  return L;
}
/* mengisi larik titik: [x, y, z (satuan mercator), ukuran m, alpha, warna 0..1] */
function tulisTitik(out, lon, lat, zAsl, ukuran, alpha, warna, ex) {
  const mc = maplibregl.MercatorCoordinate.fromLngLat([lon, lat], zAsl * ex); out.push(mc.x, mc.y, mc.z, ukuran, alpha, warna);
}
function gambarKolom() {
  const s = S; if (!s || !window.AbuModel) return; const H = s.p.kolom * 1000, rng = AbuModel.mulberry32(7), ex = s.dem?.ex || 1.5, out = [], kx = 111320 * Math.cos(s.g.lat * Math.PI / 180), N = 900;
  /* batang sempit yang membesar ke atas, lalu payung melebar di ujung (umbrella); sedikit miring searah angin bawah */
  const mir = s.angin?.lapis?.[2], lean = mir ? [mir.u[0], mir.v[0]] : [0, 0], ln = Math.hypot(lean[0], lean[1]) || 1;
  for (let i = 0; i < N; i++) { const u = Math.pow(i / N, .85), umb = Math.max(0, (u - .78) / .22), r = H * (.025 + .05 * u) + H * .45 * Math.sin(Math.min(1, umb) * Math.PI / 2) * (umb > 0 ? 1 : 0);
    const a = rng() * 2 * Math.PI, rr = r * Math.sqrt(rng()), z = s.g.tinggi + u * H, bengkok = H * .12 * u * u;
    tulisTitik(out, s.g.lon + (Math.cos(a) * rr + lean[0] / ln * bengkok) / kx, s.g.lat + (Math.sin(a) * rr + lean[1] / ln * bengkok) / 110570, z, Math.max(300, H * (.1 + .08 * u) * (umb > 0 ? 1.6 : 1)), umb > 0 ? .22 : .32, Math.min(1, z / 12000), ex); }
  s.kolomBuf = out; awanSet();
}
function gambarAbu() {
  const s = S, h = s.hasil; if (!s || !h) return;
  const k = Math.min(72, Math.floor(s.t)), k2 = Math.min(72, k + 1), f = s.t - k, a = h.snap[k], b = h.snap[k2], ex = s.dem?.ex || 1.5, out = [];
  for (let i = 0; i < a.lon.length; i++) { if (!a.aktif[i]) continue;
    const lon = a.lon[i] + (b.lon[i] - a.lon[i]) * f, lat = a.lat[i] + (b.lat[i] - a.lat[i]) * f, z = a.z[i] + (b.z[i] - a.z[i]) * f, umur = Math.max(0, s.t - h.lepas[i]), uk = 1200 + 1800 * Math.min(1, umur / 12);
    /* 2 anak sprite per partikel: awan menebal tanpa menambah partikel model */
    for (let q = 0; q < 2; q++) { const j = Math.sin(i * 12.9898 + q * 78.233) * 43758.5453, fx = (j - Math.floor(j)) - .5, j2 = Math.sin(i * 39.346 + q * 11.135) * 24634.6345, fy = (j2 - Math.floor(j2)) - .5;
      tulisTitik(out, lon + fx * uk * .9 / 111320 / Math.cos(lat * Math.PI / 180), lat + fy * uk * .9 / 110570, z, uk, .3, Math.min(1, z / 12000), ex); } }
  s.abuBuf = out; awanSet();
}
function awanSet() {
  const s = S, l = s.peta?.getLayer("awan")?.implementation; if (!l) return;
  const kol = s.t <= s.p.durasi ? (s.kolomBuf || []) : []; l.set(new Float32Array([...kol, ...(s.abuBuf || [])]));
}
function gambarRadius() {
  const s = S, m = s.peta; if (!m?.getSource("radius")) return;
  m.getSource("radius").setData({type: "Feature", geometry: {type: "Polygon", coordinates: [cincin(s.g.lon, s.g.lat, s.p.radius, 64)]}, properties: {}});
}
function gambarDesa() {
  const s = S, m = s.peta; if (!m?.getSource("desa")) return;
  m.getSource("desa").setData({type: "FeatureCollection", features: s.desa.map(d => ({type: "Feature", geometry: {type: "Point", coordinates: [d.lon, d.lat]},
    properties: {nama: d.nama, dalam: d.km <= s.p.radius ? 1 : 0, kena: d.lahar || d.pdc ? 1 : 0}}))});
}

/* ---------------------------------------------------------------- peta */
function petaBaru() {
  const s = S, g = s.g, desktop = innerWidth > 900;
  const m = s.peta = new maplibregl.Map({container: "smPeta", maxPitch: 82, attributionControl: {compact: true}, center: [g.lon, g.lat], zoom: 10.6, pitch: 62, bearing: -15,
    style: {version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf", sources: {
      sat: {type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 18, attribution: "Citra © Esri, Maxar, Earthstar"},
      dem: {type: "raster-dem", tiles: [TERRARIUM("{z}", "{x}", "{y}")], encoding: "terrarium", tileSize: 256, maxzoom: 13, attribution: "Medan © Mapzen, NASA SRTM, USGS"},
      dem2: {type: "raster-dem", tiles: [TERRARIUM("{z}", "{x}", "{y}")], encoding: "terrarium", tileSize: 256, maxzoom: 13}},
      layers: [{id: "bg", type: "background", paint: {"background-color": "#1b2230"}}, {id: "sat", type: "raster", source: "sat"},
        {id: "hill", type: "hillshade", source: "dem2", paint: {"hillshade-exaggeration": .3, "hillshade-shadow-color": "#000000", "hillshade-highlight-color": "#ffffff"}}]}});
  m.addControl(new maplibregl.NavigationControl({visualizePitch: true}), "bottom-right");
  m.once("style.load", () => {
    m.jumpTo({center: [g.lon, g.lat], padding: {left: desktop ? 430 : 0, bottom: desktop ? 70 : (innerHeight * .5)}});
    m.setTerrain({source: "dem", exaggeration: s.dem?.ex || 1.5});
    m.addSource("endap", {type: "geojson", data: s.kisi || kosongFC()});
    m.addSource("jalur", {type: "geojson", data: kosongFC()}); m.addSource("radius", {type: "geojson", data: kosongFC()}); m.addSource("rute", {type: "geojson", data: kosongFC(), promoteId: "i"});
    m.addSource("desa", {type: "geojson", data: kosongFC()});
    m.addSource("puncak", {type: "geojson", data: {type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]}, properties: {nama: g.nama}}});
    m.addLayer({id: "endap", type: "fill", source: "endap", paint: {"fill-color": ["step", ["get", "r"], WARNA.tipis, .1, WARNA.sedang, .5, WARNA.tebal], "fill-opacity": ["interpolate", ["linear"], ["get", "r"], .01, .15, 1, .6]}});
    m.addLayer({id: "jalur", type: "line", source: "jalur", paint: {"line-color": "#ffffff", "line-width": ["case", ["==", ["get", "utama"], 1], 2, 1], "line-opacity": .55, "line-dasharray": [2, 2]}});
    m.addLayer({id: "radius-f", type: "fill", source: "radius", paint: {"fill-color": "#e8743b", "fill-opacity": .1}});
    m.addLayer({id: "radius-l", type: "line", source: "radius", paint: {"line-color": "#e8743b", "line-width": 2.5, "line-dasharray": [3, 2]}});
    m.addLayer({id: "rute", type: "line", source: "rute", layout: {"line-cap": "round", "line-join": "round"}, paint: {"line-color": ["case", ["==", ["get", "tutup"], 1], "#d64545", "#2fb36a"], "line-width": ["case", ["==", ["get", "tutup"], 1], 5, 3.5], "line-opacity": .95, "line-dasharray": [1]}});
    m.addLayer({id: "desa", type: "circle", source: "desa", paint: {"circle-radius": 4.5, "circle-color": ["case", ["==", ["get", "kena"], 1], "#d64545", ["==", ["get", "dalam"], 1], "#e8743b", "#ffffff"], "circle-stroke-color": "#1b2230", "circle-stroke-width": 1.2}});
    m.addLayer({id: "desa-l", type: "symbol", source: "desa", minzoom: 11.5, layout: {"text-field": ["get", "nama"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true}, paint: {"text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 1.2}});
    m.addLayer(lapisAwan());
    m.addLayer({id: "puncak", type: "symbol", source: "puncak", layout: {"text-field": ["get", "nama"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-offset": [0, -1], "text-anchor": "bottom", "text-allow-overlap": true}, paint: {"text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 1.5}});
    m.on("click", "rute", e => { const i = e.features?.[0]?.properties?.i; if (i == null) return; s.tutup.has(+i) ? s.tutup.delete(+i) : s.tutup.add(+i); rute(); });
    m.on("mouseenter", "rute", () => { m.getCanvas().style.cursor = "pointer"; }); m.on("mouseleave", "rute", () => { m.getCanvas().style.cursor = ""; });
    s.siap = true; gambarRadius(); gambarDesa(); gambarKolom(); gambarAbu(); if (s.kisi) m.getSource("endap").setData(s.kisi); if (s.laharTunda || s.lahar) terapkanLahar(); rute();
  });
}

/* ---------------------------------------------------------------- panel */
const seg = (k, opsi, aktif) => `<div class="seg" role="group">${opsi.map(([v, n]) => `<button type="button" data-p="${k}" data-v="${v}" aria-pressed="${String(v) === String(aktif)}">${n}</button>`).join("")}</div>`;
function panel() {
  const s = S, g = s.g, p = s.p;
  $("#smJudul").textContent = "Simulasi erupsi " + g.nama;
  $("#smBd").innerHTML = `
    <div class="sm-fld"><select id="smGn" aria-label="Gunung api">${s.st.gunung.slice().sort((a, b) => a.nama.localeCompare(b.nama)).map(x => `<option value="${slug(x.nama)}"${x === g ? " selected" : ""}>${esc(x.nama)} · Level ${["I", "II", "III", "IV"][x.level - 1]}</option>`).join("")}</select></div>
    <div class="sm-fld">${pil("Mulai", "#6b7a90")}<span style="font-size:12.5px">Sekarang, ${esc(jamWIB(Date.now()))}</span></div>
    <div class="sm-fld">${pil("Tinggi kolom di atas puncak", "#e8743b")}${seg("kolom", KOLOM.map(k => [k, k + " km"]), p.kolom)}</div>
    <div class="sm-fld">${pil("Lama erupsi", "#c9503a")}${seg("durasi", DURASI.map(k => [k, k + " jam"]), p.durasi)}</div>
    <div class="sm-fld">${pil("Volume lahar", "#3f7cc4")}${seg("V", [[1e5, "100 rb m³"], [1e6, "1 jt m³"], [1e7, "10 jt m³"]], p.V)}</div>
    <div class="sm-fld">${pil("Awan panas (H/L)", "#d64545")}${seg("hl", HL.map(k => [k, String(k).replace(".", ",")]), p.hl)}</div>
    <div id="smHasil"><p class="sm-msg">Menghitung sebaran abu…</p></div>
    <div class="sm-kartu" id="smKartuDesa"><h3>Hujan abu di desa terdekat</h3><div id="smDesa"></div></div>
    <div class="sm-kartu" id="smLahar"></div>
    <div class="sm-kartu"><h3>Perlakuan: radius evakuasi dan jalan</h3>
      <div class="sm-fld"><label for="smRad" style="font-size:12.5px">Radius evakuasi <b id="smRadV">${p.radius} km</b></label><input id="smRad" type="range" min="0" max="30" step="1" value="${p.radius}" aria-label="Radius evakuasi (km)"></div>
      <div id="smEvak"></div><div id="smRute"></div></div>
    <details class="sm-met"><summary>Metode dan batas model</summary><div id="smMet"></div></details>`;
  $("#smMet").innerHTML = `<ul style="margin:0;padding-left:18px">
    <li><b>Skenario, bukan prakiraan.</b> Erupsi diandaikan mulai sekarang; kolom, lama, dan volume pilihanmu. Level resmi tetap dari PVMBG.</li>
    <li><b>Abu:</b> 2.000 partikel digeser angin nyata 72 jam (${esc(s.anginSumber || "tidak tersedia")}), jatuh menurut ukuran butir, plus sebaran acak. Endapan desa berupa angka <i>relatif</i> (100% = titik terbanyak), bukan milimeter, dan tanpa hujan, gedung, atau abu yang terangkat lagi.</li>
    <li><b>Lahar:</b> LAHARZ (Iverson dkk. 1998): penampang 0,05 V^(2/3) dan luas sebaran 200 V^(2/3), diisi dari lembah DEM terrarium ~38 m. Volume dibagi: separuh ke lembah dari dasar kawah, sisanya rata ke lembah lain. Waktu tempuh ilustrasi (${V_LAHAR} m/dtk, mulai jam ${T_LAHAR} setelah hujan memicu).</li>
    <li><b>Awan panas:</b> kerucut energi H/L dari puncak, dibatasi lembah (tebal ${15} m), ${V_PDC} m/dtk. Lembah sempit di bawah ~80 m tak terpisah di DEM ini; kawah, kubah, dan tanggul baru tidak terbaca.</li>
    <li><b>Evakuasi:</b> penduduk dan desa dari ${s.pg ? esc(s.pg.zona_sumber || "data paparan") : "<i>data paparan belum tersedia untuk gunung ini</i>"}; waktu tempuh ${KM_JAM_EVAKUASI} km/jam di ruas rute ${s.geo ? "yang ada" : "(data rute belum ada)"}.</li>
    ${s.pg ? "" : "<li>Tanpa data desa, endapan abu hanya tampil sebagai peta kisi.</li>"}</ul>`;
  const el = $("#smBd");
  el.addEventListener("click", e => { const b = e.target.closest("button[data-p]"); if (!b) return; const k = b.dataset.p, v = +b.dataset.v;
    if (s.p[k] === v) return; s.p[k] = v; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    clearTimeout(s.deb); s.deb = setTimeout(() => (k === "kolom" || k === "durasi") ? hitungAbu() : hitungLahar(), 120); });
  $("#smGn").onchange = e => { const id = e.target.value; history.replaceState(null, "", "?g=" + id); const akar = s.akar; buka({id, akar}); };
  $("#smRad").oninput = e => { s.p.radius = +e.target.value; $("#smRadV").textContent = s.p.radius + " km"; clearTimeout(s.deb2); s.deb2 = setTimeout(() => { gambarRadius(); gambarDesa(); evakuasi(); }, 60); };
  $("#smDesa").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.h != null) { s.tabel.hal = +b.dataset.h; tabelDesa(); } });
}
function legenda() {
  $("#smLeg").innerHTML = `<div><i style="background:${WARNA.abu}"></i>Awan abu</div><div><i style="background:${WARNA.pdc}"></i>Awan panas</div><div><i style="background:${WARNA.lahar}"></i>Lahar</div>
    <div><i style="background:${WARNA.tebal}"></i>Hujan abu tebal<i style="background:${WARNA.sedang};margin-left:8px"></i>sedang<i style="background:${WARNA.tipis};margin-left:8px"></i>tipis</div><div><i style="background:#e8743b"></i>Radius evakuasi</div>`;
}
function hasilKartu() {
  const s = S, h = $("#smHasil"), r = s.lahar?.ringkas, hs = s.hasil; if (!h) return;
  const hl = Kartu.hl; let abuTxt = "";
  if (hs) { let terjauh = null; for (let j = 1; j <= 24; j++) { const x = AbuModel.jejak(hs, j); if (x.poligon.length && (!terjauh || x.jangkau_km > terjauh.x.jangkau_km)) terjauh = {x, j}; }
    abuTxt = terjauh ? `abu di atas ambang penerbangan 2 mg/m³ menjangkau ${hl(BULAT(terjauh.x.jangkau_km) + " km")} ke arah ${arahMata(terjauh.x.arah_deg)} (paling jauh jam ${terjauh.j})`
      : `abu tetap ${hl("di bawah ambang penerbangan 2 mg/m³")} selama 24 jam pertama`; }
  const bagian = [abuTxt, r ? `lahar menempuh ${hl(BULAT(r.lahar_km, 1) + " km")} di lembah` : "", r ? `awan panas sampai ${hl(BULAT(r.pdc_km, 1) + " km")}` : ""].filter(Boolean);
  if (!bagian.length) { h.innerHTML = `<p class="sm-msg">Menghitung…</p>`; return; }
  const kal = bagian.join(", "), judul = kal.charAt(0).toUpperCase() + kal.slice(1) + ".";
  h.innerHTML = Kartu.kartu("Hasil simulasi", judul, r ? `<p class="sm-msg">Lahar menutup ${BULAT(r.lahar_km2, 1)} km² lembah dan awan panas ${BULAT(r.pdc_km2, 1)} km². Putar waktunya di bawah peta.</p>` : "", "Model skenario Pantau Bencana (abu_model.js dan LAHARZ)");
}
const arahMata = d => ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"][Math.round(d / 45) % 8];

/* ---------------------------------------------------------------- tabel desa */
function tabelDesa() {
  const s = S, el = $("#smDesa"); if (!el) return;
  if (!s.pg) { el.innerHTML = `<p class="sm-msg">Data desa belum tersedia untuk gunung ini, jadi hujan abu hanya tampil sebagai peta kisi di peta.</p>`; return; }
  const per = 6, T = s.tabel, nil = {abu: d => d.abu || 0, penduduk: d => d.penduduk || 0, km: d => d.km, nama: d => d.nama};
  const urut = s.desa.filter(d => d.abu != null).sort((a, b) => { const x = nil[T.urut](a), y = nil[T.urut](b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * (T.turun ? -1 : 1); });
  const baris = urut.slice(T.hal * per, T.hal * per + per);
  el.innerHTML = `<div class="tw"><table><thead><tr><th><button data-k="nama">Desa<i></i></button></th><th class="n"><button data-k="penduduk">Jiwa<i></i></button></th><th class="n"><button data-k="km">Jarak<i></i></button></th><th><button data-k="abu">Hujan abu<i>${T.urut === "abu" ? (T.turun ? "↓" : "↑") : ""}</i></button></th><th>Lahar/awan panas</th></tr></thead><tbody>${baris.map(d => { const k = kelasAbu(d.abu || 0);
    return `<tr><td>${esc(d.nama)}</td><td class="n">${fmt(d.penduduk)}</td><td class="n">${BULAT(d.km, 1)} km</td><td>${k ? pil(k[0], k[1]) : "–"}</td><td>${d.pdc ? pil("Awan panas", WARNA.pdc) + " " : ""}${d.lahar ? pil("Lahar", WARNA.lahar) : ""}${!d.pdc && !d.lahar ? "–" : ""}</td></tr>`; }).join("") || `<tr><td colspan="5" class="kosong">Belum ada hasil.</td></tr>`}</tbody></table></div>${paginasi(T.hal, urut.length, per, "desa")}`;
  pengurutKepala(T, el.querySelector("thead tr"), tabelDesa);
}

/* ---------------------------------------------------------------- perlakuan: radius & rute */
function evakuasi() {
  const s = S, el = $("#smEvak"); if (!el) return;
  gambarDesa();
  if (!s.pg) { el.innerHTML = `<p class="sm-msg">${s.g.penduduk_radius ? `Menurut data resmi, sekitar <b>${fmt(s.g.penduduk_radius)}</b> jiwa tinggal dalam radius rekomendasi PVMBG ${fmt(s.g.radius_km)} km. ` : ""}Data desa per gunung ini belum tersedia, jadi penduduk dalam radius pilihanmu belum bisa dihitung.</p>`; return; }
  const dalam = s.desa.filter(d => d.km <= s.p.radius), luar = s.desa.filter(d => d.km > s.p.radius), jiwa = a => a.reduce((x, d) => x + (d.penduduk || 0), 0);
  const kena = luar.filter(d => d.lahar || d.pdc), abuTebal = luar.filter(d => (d.abu || 0) >= .5 && !d.lahar && !d.pdc);
  const hl = Kartu.hl;
  el.innerHTML = `<p class="sm-msg">${hl(fmt(dalam.length) + " desa")} (${fmt(jiwa(dalam))} jiwa) ada di dalam radius dan harus dievakuasi; ${hl(fmt(kena.length) + " desa")} (${fmt(jiwa(kena))} jiwa) di luar radius tetapi kena lahar atau awan panas; ${hl(fmt(abuTebal.length) + " desa")} (${fmt(jiwa(abuTebal))} jiwa) di luar radius dengan hujan abu tebal.</p>`;
}
/* Dijkstra kecil: rute = polilinea, simpul dibulatkan 1e-4 derajat; tujuan = titik kumpul dari paparan.evakuasi */
function rute() {
  const s = S, el = $("#smRute"); if (!el) return;
  const R = s.geo?.rute;
  if (!R?.length) { el.innerHTML = `<p class="sm-msg">Data rute evakuasi belum tersedia untuk gunung ini, jadi menutup jalan dan waktu tempuh belum bisa dihitung.</p>`; return; }
  const m = s.peta; if (m?.getSource("rute")) m.getSource("rute").setData({type: "FeatureCollection", features: R.map((c, i) => ({type: "Feature", geometry: {type: "LineString", coordinates: c}, properties: {i, tutup: s.tutup.has(i) ? 1 : 0}}))});
  const kunci = p => Math.round(p[0] * 1e4) + "," + Math.round(p[1] * 1e4), id = new Map(), pos = [], adj = [];
  const simpul = p => { const k = kunci(p); let i = id.get(k); if (i == null) { i = pos.length; id.set(k, i); pos.push(p); adj.push([]); } return i; };
  R.forEach((c, ri) => { for (let q = 1; q < c.length; q++) { const a = simpul(c[q - 1]), b = simpul(c[q]), w = jarakKm(c[q - 1][0], c[q - 1][1], c[q][0], c[q][1]); adj[a].push([b, w, ri]); adj[b].push([a, w, ri]); } });
  const dekat = p => { let b = -1, bd = 3; for (let i = 0; i < pos.length; i++) { const d = jarakKm(p[0], p[1], pos[i][0], pos[i][1]); if (d < bd) { bd = d; b = i; } } return b < 0 ? null : [b, bd]; };
  const tujuan = [...new Map((s.pg.evakuasi || []).filter(e => e.ke).map(e => [kunci(e.ke), e.ke])).values()].map(dekat).filter(Boolean);
  if (!tujuan.length) { el.innerHTML = `<p class="sm-msg">Titik kumpul evakuasi belum tersedia, jadi waktu tempuh belum bisa dihitung.</p>`; return; }
  const dij = tutupSet => { const d = new Float64Array(pos.length).fill(Infinity), h = [];
    const dorong = x => { h.push(x); let c = h.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (h[p][0] <= x[0]) break; h[c] = h[p]; c = p; } h[c] = x; };
    const ambilH = () => { const t = h[0], x = h.pop(); if (h.length) { let c = 0; for (;;) { let a = 2 * c + 1; if (a >= h.length) break; if (a + 1 < h.length && h[a + 1][0] < h[a][0]) a++; if (h[a][0] >= x[0]) break; h[c] = h[a]; c = a; } h[c] = x; } return t; };
    for (const [i] of tujuan) { d[i] = 0; dorong([0, i]); }
    while (h.length) { const [du, u] = ambilH(); if (du > d[u]) continue; for (const [v, w, ri] of adj[u]) { if (tutupSet.has(ri)) continue; if (du + w < d[v]) { d[v] = du + w; dorong([d[v], v]); } } }
    return d; };
  const d0 = dij(new Set()), d1 = dij(s.tutup);
  const menit = (d, p) => { const n = dekat(p); return n && isFinite(d[n[0]]) ? Math.round((d[n[0]] + n[1]) / KM_JAM_EVAKUASI * 60) : null; };
  const hasil = s.desa.map(d => ({d, a: menit(d0, [d.lon, d.lat]), b: menit(d1, [d.lon, d.lat])})).filter(x => x.a != null && (x.b == null || x.b !== x.a)).sort((x, y) => ((y.b ?? 9e3) - y.a) - ((x.b ?? 9e3) - x.a)).slice(0, 8);
  const putus = s.desa.filter(d => { const a = menit(d0, [d.lon, d.lat]); return a != null && menit(d1, [d.lon, d.lat]) == null; }).length;
  el.innerHTML = `<p class="sm-msg">Klik ruas hijau di peta untuk menutup jalan. ${s.tutup.size ? `<b>${s.tutup.size} ruas</b> ditutup, <b>${fmt(putus)} desa</b> terputus.` : "Belum ada ruas yang ditutup."} ${s.tutup.size ? `<button type="button" class="btn sec" id="smBuka" style="height:28px;padding:0 10px">Buka semua</button>` : ""}</p>
    ${hasil.length ? `<div class="tw"><table><thead><tr><th>Desa</th><th class="n">Sebelum</th><th class="n">Sesudah</th></tr></thead><tbody>${hasil.map(x => `<tr><td>${esc(x.d.nama)}</td><td class="n">${x.a} mnt</td><td class="n">${x.b == null ? pil("Terputus", WARNA.pdc) : x.b + " mnt"}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  $("#smBuka")?.addEventListener("click", () => { s.tutup.clear(); rute(); });
}

/* ---------------------------------------------------------------- pemutar waktu */
function waktu() {
  const s = S, el = $("#smWaktu"), IK = {main: '<path d="M7 5l12 7-12 7z"/>', jeda: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>'};
  el.innerHTML = `<button type="button" class="sm-main" id="smMain" aria-label="Putar"><svg viewBox="0 0 24 24" aria-hidden="true">${IK.main}</svg></button><b id="smJam"></b>
    <input id="smT" type="range" min="0" max="72" step="0.25" value="0" aria-label="Jam sejak erupsi (0 sampai 72)"><button type="button" class="btn sec" id="smAwan" style="height:32px;padding:0 12px">Lihat awan</button>${seg("kec", [[0.25, "0,25 jam/dtk"], [1, "1 jam/dtk"], [3, "3 jam/dtk"], [12, "12 jam/dtk"]], 3)}`;
  const label = () => { const ms = (s.angin ? Date.parse(s.angin.mulai) : Date.now()) + s.t * 36e5; $("#smJam").textContent = `Jam ${fmt(s.t)} · ${jamWIB(ms)}`; };
  const atur = t => { s.t = Math.max(0, Math.min(72, t)); $("#smT").value = s.t; label(); };
  const gambar = () => { gambarAbu(); gambarLahar(); };
  $("#smT").oninput = e => { s.t = +e.target.value; label(); cancelAnimationFrame(s.rafG); s.rafG = requestAnimationFrame(gambar); };
  el.querySelector(".seg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; s.kec = +b.dataset.v; el.querySelectorAll(".seg button").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  $("#smAwan").onclick = () => { const h = s.hasil, m = s.peta; if (!h || !m) return; const jt = AbuModel.jejakTipis(h, Math.min(72, Math.max(1, Math.round(s.t))));
    const P = [[s.g.lon, s.g.lat], ...jt.poligon]; const w = Math.min(...P.map(q => q[0])), e = Math.max(...P.map(q => q[0])), so = Math.min(...P.map(q => q[1])), n = Math.max(...P.map(q => q[1]));
    m.fitBounds([[w, so], [e, n]], {padding: {left: innerWidth > 900 ? 450 : 30, right: 40, top: innerWidth > 900 ? 80 : 20, bottom: innerWidth > 900 ? 110 : Math.round(m.getContainer().clientHeight * .42)}, maxZoom: 10.5, duration: 900}); };
  let terakhir = 0, gambarTerakhir = 0;
  const lari = ts => { if (!s.main || S !== s) return; const dt = Math.min(0.1, (ts - terakhir) / 1000); terakhir = ts; atur(s.t + dt * s.kec);
    if (ts - gambarTerakhir > 70) { gambarTerakhir = ts; gambar(); }
    if (s.t >= 72) { s.main = false; $("#smMain").innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${IK.main}</svg>`; return; } s.raf = requestAnimationFrame(lari); };
  $("#smMain").onclick = () => { s.main = !s.main; $("#smMain").innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${s.main ? IK.jeda : IK.main}</svg>`; $("#smMain").setAttribute("aria-label", s.main ? "Jeda" : "Putar");
    if (s.main) { if (s.t >= 72) atur(0); terakhir = performance.now(); s.raf = requestAnimationFrame(lari); } };
  s.setT = atur; s.gambar = gambar; label();
}

window.Sim = {buka, tutup, get keadaan() { return S; }, ujiSetT(t) { S?.setT(t); S?.gambar(); }};
})();
