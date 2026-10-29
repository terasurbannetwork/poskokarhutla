"use strict";
/* sim.js: simulasi erupsi gunung api (3D). window.Sim = {buka({id, akar}), tutup()}.
   Abu: window.AbuModel (abu_model.js) + angin nyata 72 jam. Lahar & awan panas: sim_lahar.js di Web Worker (DEM terrarium z12).
   Desa dari data/paparan.json bila ada; rute evakuasi dari data/paparan_geo.json bila ada. Format dari ../inti/format.js, tabel dari ../inti/tabel.js. */
(() => {
const Z = 12, JU = 5;                       /* mosaik ubin DEM JU x JU pada zoom Z (~49 km, piksel ~38 m) */
const TERRARIUM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const KOLOM = [1, 3, 5, 10, 15], DURASI = [1, 3, 6, 12, 24], VOL = [1e5, 1e6, 1e7], HL = [0.2, 0.25, 0.3, 0.35];
const T_LAHAR = 1;  /* jam setelah erupsi saat hujan memicu lahar: ASUMSI skenario. Kecepatan awan panas dan lahar = hasil model (sim_lahar.js), bukan angka tetap */
const AMBANG_HULU = "0,5"; /* km2, sama dengan bawaan ambangHulu di sim_lahar.js */
const WARNA = {abu: "#8a7a6b", lahar: "#3f7cc4", pdc: "#d64545", tebal: "#6b4a1f", sedang: "#b08a4f", tipis: "#dcc99b"};
/* SATU aturan dengan abu.id_gunung (scripts/gunungapi/abu.py): "Lewotobi Laki-laki" = lewotobi-laki-laki */
const slug = n => String(n).toLowerCase().replace(/[^\p{L}\p{N} -]/gu, "").split(/\s+/).filter(Boolean).join("-");
const R_BUMI = 6371;
const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, h = Math.sin(y / 2) ** 2 + Math.cos(b * r) * Math.cos(d * r) * Math.sin(x / 2) ** 2; return 2 * R_BUMI * Math.asin(Math.sqrt(h)); };
const ambil = async u => { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
/* app.js (index.html) membagikan status dan loader berkas turunan lewat window.Pb; halaman mandiri simulasi.html mengambil sendiri */
const Pb = window.Pb, mem = {}, muatS = (k, u) => mem[k] ||= ambil(u).catch(() => { delete mem[k]; return null; });
const DT = {st: () => Pb?.st ? Promise.resolve(Pb.st) : ambil("../banjir/data/gunungapi_status.json"), abu: () => Pb ? Pb.Data.abu() : muatS("abu", "../banjir/data/abu_gunungapi.json"),
  pap: () => Pb ? Pb.Data.pap() : muatS("pap", "data/paparan.json"), band: () => Pb ? Pb.Data.bandara() : muatS("band", "data/bandara.json"), geo: () => Pb ? Pb.Data.geo() : muatS("geo", "data/paparan_geo.json")};
const pil = (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`;
const kosongFC = () => ({type: "FeatureCollection", features: []});
const BULAT = (x, d = 0) => fmt(Math.round(x * 10 ** d) / 10 ** d);
const rupiah = v => v >= 1e9 ? BULAT(v / 1e9, 1) + " miliar" : BULAT(v / 1e6) + " juta";   /* "Rp" ditulis di pemanggil */
const jiwaBulat = v => fmt(Math.round(v / 10) * 10);
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
    for (let coba = 0; coba < 4 && !ok; coba++) try { const r = await fetch(TERRARIUM(Z, tx0 + i, ty0 + j)); if (!r.ok) throw 0; const bm = await createImageBitmap(await r.blob()); g.drawImage(bm, i * 256, j * 256); ok = true; } catch {}
    if (!ok) gagal++; } };
  await Promise.all(Array.from({length: 6}, kerja));
  if (gagal > JU * JU / 2) throw new Error("ubin medan gagal dimuat");
  const dem = Lahar.elevasi(g.getImageData(0, 0, n, n).data, n * n);
  const sampel = []; for (let i = 0; i < dem.length; i += 97) if (dem[i] > 1) sampel.push(dem[i]); sampel.sort((a, b) => a - b);
  const relief = sampel.length > 50 ? sampel[Math.floor(sampel.length * .98)] - sampel[Math.floor(sampel.length * .05)] : 500;
  return {dem, n, tx0, ty0, gagal, pusat: [gx - tx0 * 256, gy - ty0 * 256], relief, ex: relief < 600 ? 2 : relief < 1500 ? 1.6 : 1.3};
}

/* ---------------------------------------------------------------- bentuk geojson */
function cincin(lon, lat, rKm, n = 24) { const k = Math.cos(lat * Math.PI / 180), c = []; for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; c.push([lon + Math.cos(a) * rKm / 111.32 / k, lat + Math.sin(a) * rKm / 110.57]); } return c; }
const kotak = (lon, lat, s) => [[lon - s, lat - s], [lon + s, lat - s], [lon + s, lat + s], [lon - s, lat + s], [lon - s, lat - s]];

/* ================================================================ buka / tutup */
async function buka(o = {}) {
  tutup();
  const akar = o.akar || $("#sim-akar"); if (!akar) return;
  const mine = S = {akar, id: o.id || "", g: null, st: null, abu: null, pap: null, geo: null, peta: null, siap: false, hasil: null, angin: null, anginSumber: "", dem: null, lahar: null, seq: 0, t: 0, main: false, kec: 3,
    p: {kolom: 5, durasi: 6, V: 1e6, hl: 0.3, radius: 5, mulai: 0, armada: 0}, tutup: new Set(), tabel: {urut: "abu", turun: true, hal: 0}, desa: [], tick: 0};
  akar.innerHTML = `<div class="sm"><div class="sm-peta" id="smPeta"></div><div class="sm-muat" id="smMuat">Menghitung…</div><div class="box sm-leg" id="smLeg"></div>
    <aside class="card sm-panel" id="smPanel"><div class="sm-hd"><h2 id="smJudul">Simulasi erupsi</h2><p>Ilustrasi bahaya, bukan prakiraan letusan.</p></div><div class="sm-bd" id="smBd"><p class="sm-msg">Memuat data gunung…</p></div></aside>
    <div class="box sm-waktu" id="smWaktu"></div></div>`;
  try {
    const [st, abu, pap, band] = await Promise.all([DT.st(), DT.abu(), DT.pap(), DT.band()]);
    if (S !== mine) return;
    mine.st = st; mine.abu = abu; mine.pap = pap; mine.band = band || [];
    /* bawaan = gunung dengan level MAGMA tertinggi hari ini, seri dimenangkan erupsi terbaru (Tanggap.gunungBawaan) */
    mine.g = st.gunung.find(g => slug(g.nama) === mine.id) || Tanggap.gunungBawaan(st); mine.id = slug(mine.g.nama);
    const ga = abu?.gunung?.find(x => x.id === mine.id); if (ga?.kolom_m) mine.p.kolom = KOLOM.reduce((a, b) => Math.abs(b * 1000 - ga.kolom_m) < Math.abs(a * 1000 - ga.kolom_m) ? b : a);
    mine.p.radius = Math.round(mine.g.radius_km || 5);
    mine.pg = pap?.gunung?.find(x => x.id === mine.id) || null;
    mine.popP = ambil(`data/pop/${mine.id}.json`).catch(() => null);   /* piksel WorldPop 1 km (scripts/gunungapi/pop_grid.py) */
    mine.desa = (mine.pg?.desa || []).map(d => ({...d, km: jarakKm(mine.g.lon, mine.g.lat, d.lon, d.lat)}));
    mine.demP = muatDem(mine.g.lat, mine.g.lon); mine.demP.catch(() => {}); /* mulai sebelum peta: ubin S3 bersaing dengan ubin peta untuk 6 sambungan */
    panel(); legenda(); waktu(); petaBaru();
    DT.geo().then(j => { if (S !== mine) return; mine.geo = j?.[mine.id] || null; rute(); });
    hitungAngin().then(() => { if (S === mine) { hitungAbu(); } });
    demDanLahar();
  } catch (e) { console.error("Sim:", e); if (S === mine) $("#smBd").innerHTML = `<p class="sm-msg">Simulasi belum bisa dimuat: ${esc(e.message)}</p>`; }
}
function tutup() {
  if (!S) return;
  cancelAnimationFrame(S.raf); S.wA?.terminate(); S.wL?.terminate(); try { S.peta?.remove(); } catch {} if (S.akar) S.akar.innerHTML = ""; S = null;
}

/* ---------------------------------------------------------------- angin & abu */
async function hitungAngin() {
  const s = S, ga = s.abu?.gunung?.find(x => x.id === s.id);
  let a = anginSekarang(ga?.angin); s.anginSumber = a ? "angin prakiraan harian Centurisk97 (Open-Meteo, ECMWF IFS)" : "";
  if (!a) { try { a = await anginOpenMeteo(s.g.lat, s.g.lon); s.anginSumber = "angin prakiraan Open-Meteo (ECMWF IFS), diambil langsung"; } catch (e) { console.error("angin:", e); } }
  if (S === s) s.angin = a;
}
/* satu Worker per pekerjaan (sim_kerja.js); gagal dibuat = pesan, bukan hitung di utas utama (klik tak boleh membeku) */
function bikinKerja(s, k) {
  const f = k === "A" ? "wA" : "wL"; if (s[f] !== undefined) return s[f];
  try { const w = new Worker("/gunungapi/sim_kerja.js"); w.onerror = e => { console.error("worker " + k, e.message); s[f] = null; w.terminate(); pesanKerja(s, k); }; return s[f] = w; } catch (e) { s[f] = null; return null; }
}
const pesanKerja = (s, k) => { if (S !== s) return; $("#smMuat")?.classList.remove("on"); const el = $(k === "A" ? "#smHasil" : "#smLahar"); if (el) el.innerHTML = `<p class="sm-msg">${k === "A" ? "Sebaran abu" : "Lahar dan awan panas"} belum bisa dihitung di perangkat ini (Web Worker tidak tersedia).</p>`; };
function hitungAbu() {
  const s = S; if (!s) return;
  if (!s.angin || !window.AbuModel) { $("#smHasil").innerHTML = `<p class="sm-msg">Sebaran abu belum bisa dihitung: ${!window.AbuModel ? "mesin abu belum dimuat" : "angin prakiraan tidak terjangkau"}.</p>`; return; }
  const w = bikinKerja(s, "A"); if (!w) return pesanKerja(s, "A");
  const seq = ++s.seq; $("#smMuat").classList.add("on");
  w.onmessage = e => { const d = e.data; if (S !== s || d.seq !== seq) return;
    $("#smMuat").classList.remove("on");
    if (!d.ok) { console.error("abu:", d.galat); $("#smHasil").innerHTML = `<p class="sm-msg">Sebaran abu gagal dihitung.</p>`; return; }
    s.hasil = d.r.hasil; s.maks = d.r.maks; s.bandaraTutup = d.r.bandara; s.pitaAbu = d.r.pita; s.msAbu = d.r.ms; s.kisiR = d.r.kisi; s.desa.forEach((x, i) => { x.abu = d.r.desaAbu[i]; });
    hasilKartu();   /* ringan: kartu kalimat; sisanya sesudah paint */
    nanti(() => { if (S !== s || s.seq !== seq) return; terapkanKisi(); gambarKolom(); gambarAbu(); tabelDesa(); evakuasi(); }); };
  w.postMessage({tipe: "abu", seq, lat: s.g.lat, lon: s.g.lon, puncak: s.g.tinggi, kolom_m: s.p.kolom * 1000, durasi: s.p.durasi, angin: s.angin, desa: s.desa.map(d => ({lat: d.lat, lon: d.lon})), bandara: s.band.filter(b => jarakKm(s.g.lon, s.g.lat, b.lon, b.lat) < 900)});
}
/* kisi endapan dari Worker (massa relatif per sel) -> poligon sel; tepi dipudarkan lewat opacity peta */
function terapkanKisi() {
  const s = S, k = s.kisiR; if (!k) { s.kisi = null; return; }
  const fs = []; for (let q = 0; q < k.rel.length; q++) if (k.rel[q] > 0.01) { const i = q % k.K, j = (q / k.K) | 0, x0 = k.w + i * k.dw, y0 = k.so + j * k.dn;
    fs.push({type: "Feature", geometry: {type: "Polygon", coordinates: [[[x0, y0], [x0 + k.dw, y0], [x0 + k.dw, y0 + k.dn], [x0, y0 + k.dn], [x0, y0]]]}, properties: {r: k.rel[q]}}); }
  s.kisi = {type: "FeatureCollection", features: fs}; s.peta?.getSource("endap")?.setData(s.kisi);
}
const kelasAbu = r => r >= .5 ? ["Tebal", WARNA.tebal] : r >= .1 ? ["Sedang", WARNA.sedang] : r >= .02 ? ["Tipis", "#a8946a"] : null;

/* ---------------------------------------------------------------- lahar & awan panas */
async function demDanLahar() {
  const s = S;
  try { s.dem = await s.demP; } catch (e) { console.error("DEM:", e); if (S === s) { $("#smLahar").innerHTML = `<p class="sm-msg">Lahar dan awan panas tidak bisa dihitung: ${esc(e.message)}.</p>`; } return; }
  if (S !== s) return;
  if (s.peta?.getSource("dem")) { try { s.peta.setTerrain({source: "dem", exaggeration: s.dem.ex}); } catch {} gambarKolom(); gambarAbu(); }
  const w = bikinKerja(s, "L"); if (!w) return pesanKerja(s, "L");
  /* DEM dikirim SEKALI (buffer dipindah); pesan berikutnya hanya V dan hl */
  w.postMessage({tipe: "dem", dem: s.dem.dem, n: s.dem.n, z: Z, lat: s.g.lat, pusat: s.dem.pusat}, [s.dem.dem.buffer]); s.dem.dem = null;
  hitungLahar();
}
function hitungLahar() {
  const s = S; if (!s?.dem || !s.wL) return; const seq = s.laharSeq = (s.laharSeq || 0) + 1; $("#smMuat").classList.add("on");
  s.wL.onmessage = e => { const d = e.data; if (S !== s || d.seq !== seq) return;
    if (d.pita) { s.pitaLahar = d.pita; hasilKartu(); return; }   /* pita volume menyusul hasil utama */
    $("#smMuat").classList.remove("on");
    if (!d.ok) { console.error("lahar:", d.galat); $("#smLahar").innerHTML = `<p class="sm-msg">Lahar dan awan panas gagal dihitung.</p>`; return; }
    s.lahar = d.r; terapkanLahar(); };
  s.pitaLahar = null; s.wL.postMessage({tipe: "lahar", seq, V: s.p.V, hl: s.p.hl});
}
/* urgent: hanya kartu ringkas; kanvas, lapisan, himpunan indeks, desa, tabel menyusul sesudah paint */
function terapkanLahar() {
  const s = S, r = s.lahar; if (!r || !s.siap) { s.laharTunda = true; return; }
  s.laharTunda = false; hasilKartu();
  nanti(() => { if (S !== s || s.lahar !== r) return; const d = s.dem, m = s.peta;
    const [x0, y0, x1, y1] = r.bbox, w = x1 - x0 + 1, h = y1 - y0 + 1, gx = d.tx0 * 256, gy = d.ty0 * 256;
    const ll = (x, y) => Lahar.pxKeLL(Z, gx + x, gy + y);
    s.kanvas = {w, h, x0, y0, coords: [ll(x0, y0), ll(x1 + 1, y0), ll(x1 + 1, y1 + 1), ll(x0, y1 + 1)]};
    /* tiap lapis: kanvas topeng w x h (satu piksel per sel DEM, tepi keras) + kanvas tampil 2w x 2h yang diburamkan, supaya tepi lembut dan tidak berpiksel */
    for (const k of ["lahar", "pdc"]) { const c = document.createElement("canvas"), mk = document.createElement("canvas"); c.width = 2 * w; c.height = 2 * h; mk.width = w; mk.height = h;
      s.kanvas[k] = {c, g: c.getContext("2d"), mk, gm: mk.getContext("2d"), data: null, ptr: 0}; s.kanvas[k].data = s.kanvas[k].gm.createImageData(w, h); }
    /* sumber canvas (bukan image + data URL: CSP halaman melarang connect-src data:); ukuran canvas tetap per hasil, jadi sumber dipasang ulang */
    for (const k of ["lahar", "pdc"]) { const id = k + "-img"; if (m.getLayer(id)) m.removeLayer(id); if (m.getSource(id)) m.removeSource(id);
      m.addSource(id, {type: "canvas", canvas: s.kanvas[k].c, coordinates: s.kanvas.coords, animate: false}); m.addLayer({id, type: "raster", source: id, paint: {"raster-fade-duration": 0, "raster-resampling": "linear", "raster-opacity": .9}}, "jalur"); }
    m.getSource("jalur").setData({type: "FeatureCollection", features: r.jalur.map(j => ({type: "Feature", geometry: {type: "LineString", coordinates: j.titik.map(([x, y]) => ll(x, y))}, properties: {utama: j.utama ? 1 : 0}}))});
    gambarLahar(true);   /* piksel digambar SEGERA setelah sumber kanvas dipasang: tekstur pertama sudah berisi */
    nanti(async () => { if (S !== s || s.lahar !== r) return; s.laharIdx = new Map(Array.from(r.lahar.idx, (v, q) => [v, r.lahar.t[q]])); s.pdcIdx = new Map(Array.from(r.pdc.idx, (v, q) => [v, r.pdc.t[q]])); desaTerpapar();
      const pop = await s.popP; if (S !== s || s.lahar !== r) return; s.unit = paparanUnit(pop, r); s.bahayaRuas = null; tabelDesa(); evakuasi(); gambarRute(); }); });
}
/* tekstur kanvas hanya diunggah ulang selama play: jeda sesudah 2 frame digambar (satu frame yang sedang berjalan belum tentu memuat piksel baru). "idle" tak cocok: sumber yang play membuat peta tak pernah idle. */
/* tepi bergradasi: topeng diperbesar 2x lalu diburamkan, ditimpa inti yang lebih tajam (ctx.filter belum ada di Safari lama: di sana hanya diperhalus oleh skala) */
function lembut(o) { const g = o.g, W = o.c.width, H = o.c.height; g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  try { g.filter = "blur(4px)"; } catch {} g.drawImage(o.mk, 0, 0, W, H); g.filter = "none"; g.globalAlpha = .45; try { g.filter = "blur(1.2px)"; } catch {} g.drawImage(o.mk, 0, 0, W, H); g.filter = "none"; g.globalAlpha = 1; }
/* Terrain menyimpan hasil gambar lapis raster per ubin (render-to-texture); pembaruan isi kanvas tidak membatalkan cache itu (terbukti: tekstur GL berisi 44 rb piksel
   tetapi layar kosong). setCoordinates() menembakkan event data "content" yang membatalkannya. play lalu pause setelah jeda: pause() mengunggah isi kanvas terakhir. */
function unggahKanvas(m, src, koor) { src.play(); clearTimeout(src._tp); src._tp = setTimeout(() => { try { src.pause(); src.setCoordinates(koor); m.triggerRepaint(); } catch {} }, 400); }
/* gambar sel yang sudah dicapai muka aliran pada jam t; maju = hanya tambahan, mundur = ulang dari nol */
function gambarLahar(paksa) {
  const s = S, r = s.lahar, K = s.kanvas, m = s.peta; if (!r || !K || !m?.getSource("lahar-img")) return;
  const hit = (nama, tabel, front, rgb, rad) => { const o = K[nama]; if (!o) return; let ptr = o.ptr;
    if (paksa || (ptr > 0 && tabel.t[ptr - 1] > front)) { o.data.data.fill(0); ptr = 0; }
    const px = o.data.data, n = s.dem.n; let tambah = paksa || ptr === 0;
    /* satu sel DEM (~38 m) kurang dari 1 piksel layar pada zoom 10-11: digambar membesar (rad sel ke tiap sisi) agar alur sempit tetap terbaca */
    while (ptr < tabel.t.length && tabel.t[ptr] <= front) { const i = tabel.idx[ptr], x0 = (i % n) - K.x0, y0 = ((i / n) | 0) - K.y0;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const x = x0 + dx, y = y0 + dy; if (x >= 0 && y >= 0 && x < K.w && y < K.h) { const q = (y * K.w + x) * 4; px[q] = rgb[0]; px[q + 1] = rgb[1]; px[q + 2] = rgb[2]; px[q + 3] = 255; } }
      ptr++; tambah = true; }
    if (!tambah && ptr === o.ptr) return;
    o.ptr = ptr; o.gm.putImageData(o.data, 0, 0); lembut(o); unggahKanvas(m, m.getSource(nama + "-img"), K.coords); };
  /* muka aliran = sel yang waktu tibanya (hasil model, dtk sejak pemicu) <= jam sekarang */
  hit("pdc", r.pdc, s.t * 3600, [214, 69, 69], 1);
  hit("lahar", r.lahar, Math.max(-1, (s.t - T_LAHAR) * 3600), [63, 124, 196], 2);
}
/* jam bahaya (sejak erupsi) di titik lon/lat menurut model: terkecil dari awan panas dan lahar (lahar terpicu T_LAHAR jam kemudian); sel tetangga 1 piksel ikut; null bila tak kena */
function bahayaDi(lon, lat) {
  const s = S, n = s.dem.n, [a, b] = Lahar.llKePx(Z, lon, lat), px = Math.round(a - s.dem.tx0 * 256), py = Math.round(b - s.dem.ty0 * 256); if (px < 2 || py < 2 || px >= n - 2 || py >= n - 2) return null;
  let t = Infinity; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = (py + dy) * n + px + dx, p = s.pdcIdx.get(i), l = s.laharIdx.get(i); if (p != null) t = Math.min(t, p / 3600); if (l != null) t = Math.min(t, T_LAHAR + l / 3600); }
  return isFinite(t) ? t : null;
}
/* paparan penduduk dari grid WorldPop 1 km: bagian luas piksel yang disapu sel awan panas/lahar x jiwa piksel (desa OSM hanya label). Satu unit per piksel. */
function paparanUnit(pop, r) {
  const s = S, d = s.dem, gx = d.tx0 * 256, gy = d.ty0 * 256;
  const u = Tanggap.paparanUnit(pop, r, (x, y) => Lahar.pxKeLL(Z, gx + x + .5, gy + y + .5), d.n, (r.dx / 1000) ** 2, T_LAHAR); if (!u) return null;
  return u.map(x => ({...x, km: jarakKm(s.g.lon, s.g.lat, x.lon, x.lat)}));
}
/* desa yang titiknya (atau tetangga 1 piksel) kena lahar / awan panas; tpdc/tlahar = jam sejak erupsi saat bahaya tiba (waktu model terkecil di sekitar titik desa) */
function desaTerpapar() {
  const s = S, n = s.dem.n, gx = s.dem.tx0 * 256, gy = s.dem.ty0 * 256;
  const tiba = (peta, px, py) => { let t = Infinity; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = peta.get((py + dy) * n + px + dx); if (v != null && v < t) t = v; } return t; };
  for (const d of s.desa) { const [a, b] = Lahar.llKePx(Z, d.lon, d.lat), px = Math.round(a - gx), py = Math.round(b - gy), dalam = px > 1 && py > 1 && px < n - 2 && py < n - 2;
    const tl = dalam ? tiba(s.laharIdx, px, py) : Infinity, tp = dalam ? tiba(s.pdcIdx, px, py) : Infinity;
    d.lahar = isFinite(tl); d.pdc = isFinite(tp); d.tlahar = d.lahar ? T_LAHAR + tl / 3600 : null; d.tpdc = d.pdc ? tp / 3600 : null; }
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
    tulisTitik(out, s.g.lon + (Math.cos(a) * rr + lean[0] / ln * bengkok) / kx, s.g.lat + (Math.sin(a) * rr + lean[1] / ln * bengkok) / 110570, z, Math.max(700, H * (.1 + .08 * u) * (umb > 0 ? 1.6 : 1)), (umb > 0 ? .22 : .32) + (H < 3000 ? .15 : 0), Math.min(1, z / 12000), ex); }
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
  const kol = s.t <= s.p.durasi ? (s.kolomBuf || []) : []; const ab = s.abuBuf || [], f = new Float32Array(kol.length + ab.length); f.set(kol); f.set(ab, kol.length); l.set(f);
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
    m.addSource("desa", {type: "geojson", data: kosongFC()}); m.addSource("kumpul", {type: "geojson", data: kosongFC()}); m.addSource("ungsi", {type: "geojson", data: kosongFC()});
    m.addSource("puncak", {type: "geojson", data: {type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]}, properties: {nama: g.nama}}});
    m.addLayer({id: "endap", type: "fill", source: "endap", paint: {"fill-color": ["step", ["get", "r"], WARNA.tipis, .1, WARNA.sedang, .5, WARNA.tebal], "fill-opacity": ["interpolate", ["linear"], ["get", "r"], .01, 0, .1, .06, .3, .25, 1, .6], "fill-antialias": false}});
    m.addLayer({id: "jalur", type: "line", source: "jalur", paint: {"line-color": "#5aa2ea", "line-width": ["case", ["==", ["get", "utama"], 1], 3, 1.6], "line-opacity": .9, "line-dasharray": [2, 1.5]}});
    m.addLayer({id: "radius-f", type: "fill", source: "radius", paint: {"fill-color": "#e8743b", "fill-opacity": .1}});
    m.addLayer({id: "radius-l", type: "line", source: "radius", paint: {"line-color": "#e8743b", "line-width": 2.5, "line-dasharray": [3, 2]}});
    m.addLayer({id: "rute", type: "line", source: "rute", layout: {"line-cap": "round", "line-join": "round"}, paint: {"line-color": ["case", ["==", ["get", "tutup"], 1], "#d64545", ["==", ["get", "bahaya"], 1], "#8e44ad", "#2fb36a"], "line-width": ["case", ["==", ["get", "tutup"], 1], 5, 3.5], "line-opacity": .95, "line-dasharray": [1]}});
    m.addLayer({id: "desa", type: "circle", source: "desa", paint: {"circle-radius": 4.5, "circle-color": ["case", ["==", ["get", "kena"], 1], "#d64545", ["==", ["get", "dalam"], 1], "#e8743b", "#ffffff"], "circle-stroke-color": "#1b2230", "circle-stroke-width": 1.2}});
    m.addLayer({id: "desa-l", type: "symbol", source: "desa", minzoom: 11.5, layout: {"text-field": ["get", "nama"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true}, paint: {"text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 1.2}});
    m.addLayer({id: "ungsi", type: "circle", source: "ungsi", paint: {"circle-radius": 4, "circle-color": "#3f7cc4", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.2}});
    m.addLayer({id: "kumpul", type: "circle", source: "kumpul", paint: {"circle-radius": 6, "circle-color": "#2fb36a", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2}});
    m.addLayer(lapisAwan());
    m.addLayer({id: "puncak", type: "symbol", source: "puncak", layout: {"text-field": ["get", "nama"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-offset": [0, -1], "text-anchor": "bottom", "text-allow-overlap": true}, paint: {"text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 1.5}});
    m.on("click", "rute", e => { const i = e.features?.[0]?.properties?.i; if (i == null) return; s.tutup.has(+i) ? s.tutup.delete(+i) : s.tutup.add(+i); rute(); });
    m.on("mouseenter", "rute", () => { m.getCanvas().style.cursor = "pointer"; }); m.on("mouseleave", "rute", () => { m.getCanvas().style.cursor = ""; });
    s.siap = true; gambarRadius(); gambarDesa(); gambarTanggap(); gambarKolom(); gambarAbu(); if (s.kisi) m.getSource("endap").setData(s.kisi); if (s.laharTunda || s.lahar) terapkanLahar(); rute();
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
    <div class="sm-kartu"><h3>Perlakuan evakuasi</h3>
      <div class="sm-fld"><label for="smRad" style="font-size:12.5px">Radius evakuasi <b id="smRadV">${p.radius} km</b></label><input id="smRad" type="range" min="0" max="30" step="1" value="${p.radius}" aria-label="Radius evakuasi (km)"></div>
      <div class="sm-fld">${pil("Mulai evakuasi", "#2fb36a")}${seg("mulai", [[-12, "12 jam sebelum"], [-3, "3 jam sebelum"], [0, "Saat erupsi"], [1, "1 jam sesudah"]], p.mulai)}</div>
      <div class="sm-fld">${pil("Armada tambahan (kendaraan)", "#3f7cc4")}${seg("armada", [[0, "Tidak ada"], [10, "10"], [30, "30"], [60, "60"]], p.armada)}</div>
      <div id="smEvak"></div></div>
    <div class="sm-kartu"><h3>Peringkat perlakuan</h3><div id="smRank"><p class="sm-msg">Menunggu hasil model…</p></div></div>
    <div class="sm-kartu"><h3>Jalan evakuasi</h3><div id="smRute"></div></div>
    <div class="sm-kartu"><h3>Titik kumpul dan pengungsian</h3><div id="smKumpul"></div></div>
    <div class="sm-kartu"><h3>Masker dan bandara</h3><div id="smLogistik"></div></div>
    <details class="sm-met"><summary>Metode dan batas model</summary><div id="smMet"></div></details>`;
  $("#smMet").innerHTML = `<ul style="margin:0;padding-left:18px">
    <li><b>Skenario, bukan prakiraan.</b> Erupsi diandaikan mulai sekarang; kolom, lama, dan volume pilihanmu. Level resmi tetap dari PVMBG.</li>
    <li><b>Abu:</b> 2.000 partikel digeser angin nyata 72 jam (${esc(s.anginSumber || "tidak tersedia")}), jatuh menurut ukuran butir, plus sebaran acak. Endapan desa berupa angka <i>relatif</i> (100% = titik terbanyak), bukan milimeter, dan tanpa hujan, gedung, atau abu yang terangkat lagi.</li>
    <li><b>Lahar:</b> LAHARZ (Iverson dkk. 1998): penampang 0,05 V^(2/3) dan luas sebaran 200 V^(2/3), diisi dari lembah DEM terrarium ~38 m. Awal lahar = titik alur mulai terkonsentrasi (aliran terkumpul &ge; 0,5 km², asumsi umum, belum dicocokkan ke hulu sungai bernama); LAHARZ klasik memulai di batas zona proksimal H/L 0,2-0,3, sengaja tidak dipakai karena lahar hujan di sini bersumber di lereng atas. Volume dibagi: separuh ke alur dari dasar kawah, sisanya rata ke alur lain, dan luas total sama dengan B(V). Kecepatan tiap langkah alur dari persamaan Manning v = R<sup>2/3</sup> S<sup>1/2</sup> / n (n = 0,06, kekasaran aliran debris: asumsi, belum dikalibrasi), R = kedalaman rata-rata penampang LAHARZ, S = kemiringan dasar alur di DEM, dibatasi 0,5 sampai 25 m/dtk. Lahar diandaikan terpicu hujan ${T_LAHAR} jam setelah erupsi (asumsi skenario). Pita: volume dibagi 3 dan dikali 3.</li>
    <li><b>Awan panas:</b> kerucut energi H/L dari puncak (Malin &amp; Sheridan 1982) dengan pengungkungan lembah (tebal ${15} m). Kecepatan dari garis energi (Heim; Malin &amp; Sheridan 1982): v = &radic;(2g &times; (z<sub>kawah</sub> &minus; H/L &times; jarak &minus; z<sub>tanah</sub>)), dibatasi 3 sampai 50 m/dtk (garis energi adalah batas atas, tanpa gesekan); waktu tiba = jumlah jarak/kecepatan sepanjang alur. Di lereng terbuka lidahnya melebar setengah-lebar 0,2 &times; jarak dari kawah di tiap sisi; angka 0,2 ilustrasi tanpa kalibrasi. Lembah sempit di bawah ~80 m tak terpisah di DEM ini; kawah, kubah, dan tanggul baru tidak terbaca.</li>
    <li><b>Evakuasi:</b> penduduk dan desa dari ${s.pg ? esc(s.pg.zona_sumber || "data paparan") : "<i>data paparan belum tersedia untuk gunung ini</i>"}; waktu tempuh dari rute jalan OSM ${s.geo ? "(kecepatan per kelas jalan dari paparan.py, 15 sampai 50 km/jam)" : "(data rute belum ada, dipakai menit paparan atau garis lurus)"}. Penduduk dari grid WorldPop 1 km (piksel, bukan titik desa OSM); terpapar = jiwa piksel x bagian luas piksel yang disapu sel model (anggapan merata di piksel). Aman = tiba di titik kumpul sebelum bahaya sampai di pikselnya, di titik kumpul, atau di ruas jalan yang dilalui (ruas terpotong ungu di peta); truk hanya berangkat bila sempat tiba sebelum bahaya. Menit tiba adalah ilustrasi model. Kendaraan pribadi 60% warga, 3,5 orang per kendaraan, 600 kendaraan per jam keluar lewat satu titik kumpul (antrean), armada 40 orang per rit, jeda siap 30 menit. Biaya Rp 50.000 per jiwa per hari mengungsi (3 hari, ditambah hari bila mulai sebelum erupsi) dan Rp 2,5 juta per kendaraan armada per hari. Semua satuan ini asumsi sampai diganti data BPBD. Penutupan jalan baru dievaluasi lewat waktu tempuh (klik ruas), belum masuk peringkat.</li>
    <li><b>Masker dan bandara:</b> masker untuk desa dengan hujan abu relatif &ge; 0,1 (2 per orang per hari, lama erupsi + 2 hari, Rp 3.500). Bandara dihitung tertutup bila ada di dalam jejak abu di atas ambang penerbangan 2 mg/m³ (AbuModel.jejak) pada jam 1 sampai 72.</li>
    <li><b>Pembanding Merapi 2010</b> (<code>scripts/gunungapi/cek_merapi2010.mjs</code>, dihitung 22 Okt 2026): skenario setara (V 10 jt m³, H/L 0,15, awan panas model 17,6 km; 2010 nyata ±15-17 km di Kali Gendol) menyapu area berpenduduk sekitar 90.000 jiwa pada grid WorldPop 1 km bila tak ada yang mengungsi. Catatan 2010 (BNPB/PVMBG): ±367 meninggal dengan evakuasi dan sekitar 350.000 orang mengungsi. Rasio paparan model terhadap korban jiwa ±245 kali; ini bukan prakiraan kematian: model menghitung penduduk di area sapuan tanpa evakuasi, sedangkan 2010 zona bahaya diperluas bertahap (10, 15, 20 km) sebelum awan panas besar tiba. Skenario bawaan layar (V 1 jt m³, H/L 0,3) menyapu sekitar 1.000 jiwa.</li>
    <li><b>Ketidakpastian:</b> jangkauan abu dihitung ulang pada tinggi kolom &times;0,7 dan &times;1,4; panjang lahar pada volume &divide;3 dan &times;3. Hasil model, belum divalidasi terhadap kejadian nyata.</li>
    ${s.pg ? "" : "<li>Tanpa data desa, endapan abu hanya tampil sebagai peta kisi.</li>"}</ul>`;
  const el = $("#smBd");
  el.addEventListener("click", e => { const b = e.target.closest("button[data-p]"); if (!b) return; const k = b.dataset.p, v = +b.dataset.v;
    if (s.p[k] === v) return; s.p[k] = v; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    clearTimeout(s.deb); s.deb = setTimeout(() => (k === "kolom" || k === "durasi") ? hitungAbu() : (k === "mulai" || k === "armada") ? evakuasi() : hitungLahar(), 120); });
  $("#smGn").onchange = e => { const id = e.target.value; history.replaceState(null, "", "?g=" + id); const akar = s.akar; buka({id, akar}); };
  $("#smRad").oninput = e => { s.p.radius = +e.target.value; $("#smRadV").textContent = s.p.radius + " km"; clearTimeout(s.deb2); s.deb2 = setTimeout(() => { gambarRadius(); gambarDesa(); evakuasi(); }, 60); };
  $("#smDesa").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.h != null) { s.tabel.hal = +b.dataset.h; tabelDesa(); } });
}
function legenda() {
  $("#smLeg").innerHTML = `<div><i style="background:${WARNA.abu}"></i>Awan abu</div><div><i style="background:${WARNA.pdc}"></i>Awan panas</div><div><i style="background:${WARNA.lahar}"></i>Lahar</div>
    <div><i style="background:${WARNA.tebal}"></i>Hujan abu tebal<i style="background:${WARNA.sedang};margin-left:8px"></i>sedang<i style="background:${WARNA.tipis};margin-left:8px"></i>tipis</div><div><i style="background:#e8743b"></i>Radius evakuasi</div><div><i style="background:#8e44ad"></i>Jalan terpotong lahar/awan panas</div><div><i style="background:#2fb36a;border-radius:50%"></i>Titik kumpul<i style="background:#3f7cc4;border-radius:50%;margin-left:8px"></i>Calon pengungsian</div>`;
}
function hasilKartu() {
  const s = S, h = $("#smHasil"), r = s.lahar?.ringkas, hs = s.hasil; if (!h) return;
  const hl = Kartu.hl; let abuTxt = "";
  if (hs) { const M = s.maks;   /* jejak terjauh dihitung SEKALI di Worker (AbuModel.jejakMaks) */
    abuTxt = M ? `abu di atas ambang penerbangan 2 mg/m³ menjangkau sampai ${hl(km5(M.jangkau_km) + " km")} ke arah ${arahMata(M.arah_deg)} dalam 72 jam pertama`
      : `abu tetap ${hl("di bawah ambang penerbangan 2 mg/m³")} selama 72 jam, bukan berarti tanpa abu`; }
  /* lahar: jarak awal dan panjang dihitung sepanjang alur dari kawah; bila nol, tulis sebabnya (jangan diam-diam) */
  const I = s.lahar?.info || [], ada = I.filter(i => i.berhenti !== "tak ada zona lahar"), utama = ada.slice().sort((a, b) => b.lahar_km - a.lahar_km)[0];
  const tepi = I.some(i => i.berhenti === "tepi"), laut = I.some(i => i.berhenti === "laut"), tanpa = I.filter(i => i.berhenti === "tak ada zona lahar");
  let laharTxt = "", catatan = "";
  if (r && I.length) {
    if (!ada.length) laharTxt = `lahar ${hl("tidak terbentuk")}: ${tanpa.every(i => i.alasan_tak_ada === "proksimal") ? "seluruh alur lembah masih di zona proksimal (H/L > 0,2 dari puncak)" : tanpa.every(i => i.alasan_tak_ada === "hulu") ? `lembah tak pernah mengumpulkan aliran sebesar ${AMBANG_HULU} km² hulu` : "alur lembah tak memenuhi syarat awal lahar"}`;
    else laharTxt = `lahar mulai ${hl(BULAT(utama.awal_km, 1) + " km")} dari kawah dan menempuh ${hl(BULAT(Math.max(0, utama.lahar_km - utama.awal_km), 1) + " km")} di lembah`;
    if (tepi) catatan += " Lahar mencapai tepi peta DEM (±24 km dari kawah), jadi jangkauan sebenarnya bisa lebih jauh.";
    if (laut) catatan += " Sebagian lahar berhenti di laut.";
    if (ada.length && tanpa.length) catatan += ` ${tanpa.length} dari ${I.length} alur tidak membentuk lahar (${tanpa[0].alasan_tak_ada === "hulu" ? "hulu terlalu kecil" : "masih di zona proksimal"}).`;
  }
  /* pita ketidakpastian: abu = kolom x0,7 dan x1,4; lahar = volume /3 dan x3 */
  const pa = s.pitaAbu, pL = s.pitaLahar;
  if (abuTxt && s.maks && pa?.some(v => v > 0)) abuTxt += ` (rentang ${km5(Math.min(...pa, s.maks.jangkau_km))} sampai ${km5(Math.max(...pa, s.maks.jangkau_km))} km bila kolom meleset 0,7 sampai 1,4 kali)`;
  if (laharTxt && pL && utama) laharTxt += ` (${BULAT(Math.min(...pL, r.lahar_km), 1)} sampai ${BULAT(Math.max(...pL, r.lahar_km), 1)} km pada volume sepertiga sampai tiga kali)`;
  const kec = r && r.pdc_km > 0 ? ` dalam sekitar ${hl(mnt5(utamaPdcMenit(I)))}, laju puncak ${hl(BULAT(r.pdc_v_maks) + " m/dtk")} (ilustrasi model, batas atas garis energi, bukan prakiraan)` : "";
  const bagian = [abuTxt, laharTxt, r ? `awan panas sampai ${hl(BULAT(r.pdc_km, 1) + " km")}${kec}` : ""].filter(Boolean);
  if (!bagian.length) { h.innerHTML = `<p class="sm-msg">Menghitung…</p>`; return; }
  const judul = "Skenario: " + bagian.join(", ") + ".";
  h.innerHTML = Kartu.kartu("Hasil simulasi", judul, r ? `<p class="sm-msg">Lahar menutup ${BULAT(r.lahar_km2, 1)} km² lembah dan awan panas ${BULAT(r.pdc_km2, 1)} km².${catatan} Putar waktunya di bawah peta.</p>` : "", "Model skenario Centurisk97 (abu_model.js dan LAHARZ)");
}
const utamaPdcMenit = I => Math.max(0, ...I.map(i => i.pdc_menit || 0));
const arahMata = d => ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"][Math.round(d / 45) % 8];

/* ---------------------------------------------------------------- tabel desa */
function tabelDesa() {
  const s = S, el = $("#smDesa"); if (!el) return;
  if (!s.pg) { el.innerHTML = `<p class="sm-msg">Data desa belum tersedia untuk gunung ini, jadi hujan abu hanya tampil sebagai peta kisi di peta.</p>`; return; }
  const per = 6, T = s.tabel, nil = {abu: d => d.abu || 0, penduduk: d => d.penduduk || 0, km: d => d.km, nama: d => d.nama};
  const urut = s.desa.filter(d => d.abu != null).sort((a, b) => { const x = nil[T.urut](a), y = nil[T.urut](b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * (T.turun ? -1 : 1); });
  const baris = urut.slice(T.hal * per, T.hal * per + per);
  el.innerHTML = `<div class="tw"><table><thead><tr><th><button data-k="nama">Desa<i></i></button></th><th class="n"><button data-k="penduduk">Jiwa<i></i></button></th><th class="n"><button data-k="km">Jarak<i></i></button></th><th><button data-k="abu">Hujan abu<i>${T.urut === "abu" ? (T.turun ? "↓" : "↑") : ""}</i></button></th><th>Lahar/awan panas (tiba, ilustrasi model)</th></tr></thead><tbody>${baris.map(d => { const k = kelasAbu(d.abu || 0);
    return `<tr><td>${esc(d.nama)}</td><td class="n">${jiwaTxt(d.penduduk)}</td><td class="n">${BULAT(d.km, 1)} km</td><td>${k ? pil(k[0], k[1]) : "–"}</td><td>${d.pdc ? pil("Awan panas", WARNA.pdc) + ` <small>${mnt5(d.tpdc * 60)}</small> ` : ""}${d.lahar ? pil("Lahar", WARNA.lahar) + ` <small>jam ${BULAT(d.tlahar, 1)}</small>` : ""}${!d.pdc && !d.lahar ? "–" : ""}</td></tr>`; }).join("") || `<tr><td colspan="5" class="kosong">Belum ada hasil.</td></tr>`}</tbody></table></div>${paginasi(T.hal, urut.length, per, "desa")}`;
  pengurutKepala(T, el.querySelector("thead tr"), tabelDesa);
}

/* ---------------------------------------------------------------- perlakuan: radius & rute */
function evakuasi() {
  const s = S, el = $("#smEvak"); if (!el) return;
  gambarDesa(); gambarTanggap();
  if (!s.pg) { el.innerHTML = `<p class="sm-msg">${s.g.penduduk_radius ? `Sekitar <b>${jiwaTxt(s.g.penduduk_radius)}</b> jiwa tinggal dalam radius rekomendasi PVMBG ${fmt(s.g.radius_km)} km (perkiraan WorldPop 1 km). ` : ""}Data desa per gunung ini belum tersedia, jadi penduduk dalam radius pilihanmu belum bisa dihitung.</p>`;
    for (const k of ["#smRank", "#smKumpul", "#smLogistik"]) { const e = $(k); if (e) e.innerHTML = `<p class="sm-msg">Butuh data desa gunung ini; belum tersedia.</p>`; } return; }
  const dalam = s.desa.filter(d => d.km <= s.p.radius), luar = s.desa.filter(d => d.km > s.p.radius), jiwa = a => a.reduce((x, d) => x + (d.penduduk || 0), 0);
  const kena = luar.filter(d => d.lahar || d.pdc), abuTebal = luar.filter(d => (d.abu || 0) >= .5 && !d.lahar && !d.pdc);
  const hl = Kartu.hl;
  /* jiwa dalam radius = cincin WorldPop 1 km (3/5/10/15 km); di antara cincin diinterpolasi menurut LUAS (r kuadrat), bukan r: penduduk tersebar di bidang */
  const C = [[0, 0], ...(s.pg.cincin || []).map(c => [c.km, c.penduduk])], r = Math.min(s.p.radius, C.at(-1)[0]);
  let jr = null; if (C.length > 1) { const k = C.findIndex(c => c[0] >= r); jr = k <= 0 ? 0 : C[k - 1][1] + (C[k][1] - C[k - 1][1]) * (r * r - C[k - 1][0] ** 2) / (C[k][0] ** 2 - C[k - 1][0] ** 2); }
  const teksRadius = `<p class="sm-msg">${jr != null ? `${hl(jiwaTxt(jr) + " jiwa")} tinggal dalam radius ${fmt(s.p.radius)} km (perkiraan WorldPop 1 km${s.p.radius > C.at(-1)[0] ? `, dihitung sampai ${C.at(-1)[0]} km` : ""}), ${hl(fmt(dalam.length) + " desa")} terdaftar di dalamnya; ` : `${hl(fmt(dalam.length) + " desa")} (${jiwaTxt(jiwa(dalam))} jiwa di desa terdaftar) ada di dalam radius; `}${hl(fmt(kena.length) + " desa")} (${jiwaTxt(jiwa(kena))} jiwa) di luar radius tetapi kena lahar atau awan panas; ${hl(fmt(abuTebal.length) + " desa")} (${jiwaTxt(jiwa(abuTebal))} jiwa) di luar radius dengan hujan abu tebal.</p>`;
  if (!s.laharIdx) { el.innerHTML = teksRadius + `<p class="sm-msg">Menunggu hitungan lahar dan awan panas…</p>`; return; }
  if (!s.unit) { el.innerHTML = teksRadius + `<p class="sm-msg">Grid penduduk WorldPop gunung ini belum tersedia, jadi jiwa terpapar belum bisa dihitung per piksel.</p>`; return; }
  const D = tanggapUnit(s), dasar = {radius_km: s.p.radius, mulai_jam: s.p.mulai, armada: {n: s.p.armada}};
  const res = Tanggap.evakuasi({...dasar, desa: D, dalam: Tanggap.dalamRadius(D, s.p.radius)});
  el.innerHTML = teksRadius + `<p class="sm-msg">${res.terpapar0 > 0 ? `Menurut model (grid WorldPop 1 km, dibobot luas yang tersapu), ${hl(jiwaBulat(res.terpapar0) + " jiwa")} berada di area awan panas atau lahar bila tak ada yang mengungsi. Dengan rencana ini ${hl(jiwaBulat(res.terselamatkan) + " jiwa")} sempat tiba di titik kumpul sebelum bahaya sampai, ${hl(jiwaBulat(res.terpapar1) + " jiwa")} masih terpapar.` : "Pada skenario ini tak ada penduduk di area awan panas atau lahar."} ${res.diungsi > 0 ? `Pengungsian ${jiwaBulat(res.diungsi)} jiwa selesai di titik kumpul pada jam ${BULAT(res.selesai_jam, 1)} dan memakan sekitar Rp ${rupiah(res.biaya)} (${res.hari} hari).` : "Tak ada penduduk di dalam radius ini, jadi tak ada yang diungsikan."} ${res.terpotong ? "Perhitungan armada dipotong di 50.000 rit, jadi hasilnya batas bawah. " : ""}${s.dem?.gagal ? `${s.dem.gagal} dari 25 ubin medan gagal diunduh (dianggap 0 m): muat ulang halaman untuk hasil lengkap. ` : ""}Jam dan biaya adalah ilustrasi model; satuan biaya, kapasitas jalan, dan bagian warga berkendaraan pribadi (60%) adalah asumsi.</p>`;
  peringkatKartu(D, dasar, res); kumpulKartu(D); logistikKartu();
}
/* data per desa (label): waktu tempuh dari jalan nyata (graf rute paparan, kecepatan per kelas jalan OSM, ruas tertutup ikut), jatuh ke menit paparan, lalu ke garis lurus x 1,4 / kecepatan median jalan.
   ruas = ruas di jalur desa itu yang tersentuh bahaya model: [[menit dari desa, jam bahaya]] */
function tanggapDesa(s) {
  s.tujuan ||= [...new Map((s.pg?.evakuasi || []).filter(e => e.ke).map(e => [e.ke.join(","), e.ke])).values()];
  const G = siapGraf(s), d1 = G?.d0 ? (s.tutup.size ? dijkstra(G, s.tutup) : G.d0) : null, ev = new Map((s.pg?.evakuasi || []).map(e => [e.desa, e])), vmed = G?.vmed || 20;
  if (G && !s.bahayaRuas) s.bahayaRuas = G.ruasJam = bahayaRuasJam(s);
  return s.desa.map((d, i) => { const n = G?.dn[i], e = ev.get(d.nama); let m = null, ruas = [];
    if (d1 && n && isFinite(G.d0[n[0]])) { m = isFinite(d1[n[0]]) ? d1[n[0]] + n[1] / 15 * 60 : Infinity; if (isFinite(m)) ruas = Tanggap.ruasBahaya(d1, n[0], s.bahayaRuas).map(([o, t]) => [o + n[1] / 15 * 60, t]); }
    if (m == null && e) m = e.menit; if (m == null) m = d.km * 1.4 / vmed * 60;
    /* desa tanpa entri evakuasi: titik kumpul terdekat (garis lurus) dari daftar tujuan, bukan satu antrean bersama */
    const tj = e?.ke ? {kunci: Tanggap.kunciTitik(e.ke), titik: e.ke} : s.tujuan.length ? Tanggap.tujuanTerdekat(s.tujuan, d.lon, d.lat) : null;
    return {m, ruas, key: tj?.kunci ?? "-", label: e?.titik_kumpul || "", tb: tj ? bahayaDi(tj.titik[0], tj.titik[1]) : null, nama: d.nama, lon: d.lon, lat: d.lat}; });
}
/* satu unit per piksel WorldPop: ikut waktu tempuh, titik kumpul, dan ruas desa OSM terdekat (<= 6 km, ditambah jarak ke desa pada 15 km/jam); tanpa desa dekat: garis lurus x 1,4 / kecepatan median */
function tanggapUnit(s) {
  const T = tanggapDesa(s), vmed = s.graf?.vmed || 20;
  return s.unit.map(u => { let b = -1, bd = 6; if (!u.dekat) { for (let i = 0; i < T.length; i++) { const k = jarakKm(u.lon, u.lat, T[i].lon, T[i].lat); if (k < bd) { bd = k; b = i; } } u.dekat = [b, bd]; } const [i, off] = u.dekat, t = i >= 0 ? T[i] : null;
    return {jiwa: u.jiwa, frak: u.frak, km: u.km, bahaya_jam: u.bahaya_jam, tempuh_menit: t ? t.m + off / 15 * 60 : u.km * 1.4 / vmed * 60, titik: t ? t.key : (u.tj ||= Tanggap.tujuanTerdekat(s.tujuan, u.lon, u.lat)?.kunci ?? "-"), label: t?.label || "", titik_bahaya_jam: t?.tb ?? null, ruas: t ? t.ruas.map(([o, th]) => [o + off / 15 * 60, th]) : []}; });
}
/* jam bahaya tiba di tiap ruas rute (simpul pertama yang tersentuh sel model) atau null */
function bahayaRuasJam(s) {
  return (s.geo?.rute || []).map(c => { let t = Infinity; for (const [lo, la] of c) { const b = bahayaDi(lo, la); if (b != null && b < t) t = b; } return isFinite(t) ? t : null; });
}
const barisRp = v => "Rp " + rupiah(v);
function peringkatKartu(D, dasar, res) {
  const el = $("#smRank"); if (!el) return;
  const rk = Tanggap.peringkat(dasar, D, {radius: [3, 5, 8, 10, 15, 20], mulai: [-12, -6, -3, 0, 1], armada: [0, 10, 30, 60]}), isi = rk.pareto.slice(0, 8);
  el.innerHTML = `<p class="sm-msg">Dari ${fmt(rk.semua)} paket radius, waktu mulai, dan armada, ini yang tak terkalahkan: tak ada paket lain yang menyelamatkan sama banyak atau lebih dengan biaya lebih murah. Urut menurut biaya. Rencana saat ini: ${jiwaBulat(res.terselamatkan)} jiwa terselamatkan, ${barisRp(res.biaya)}.</p>
    ${isi.length ? `<div class="tw"><table><thead><tr><th>Paket</th><th class="n">Jiwa terselamatkan</th><th class="n">Biaya</th><th class="n">Jiwa per Rp miliar (tambahan)</th></tr></thead><tbody>${isi.map(b => `<tr><td>${esc(b.nama)}${b.peka ? " " + pil("Peka asumsi", "#e0b400") : ""}</td><td class="n">${jiwaBulat(b.selamat)}</td><td class="n">${barisRp(b.biaya)}</td><td class="n">${b.per_miliar != null ? fmt(Math.round(b.per_miliar)) : "–"}</td></tr>`).join("")}</tbody></table></div>
    <p class="sm-msg">Peka asumsi = jiwa terselamatkan turun lebih dari 20% bila kapasitas jalan separuh atau kendaraan pribadi hanya 40%. Hasil model, belum divalidasi.</p>` : `<p class="sm-msg">Tak ada paket yang menyelamatkan lebih banyak dari rencana saat ini pada skenario ini.</p>`}`;
}
function kumpulKartu(D) {
  const s = S, el = $("#smKumpul"); if (!el) return; const per = new Map();
  D.forEach((d, i) => { if (d.km > s.p.radius || !isFinite(d.tempuh_menit)) return; const k = per.get(d.titik) || per.set(d.titik, {label: d.label, jiwa: 0, desa: 0}).get(d.titik); k.jiwa += d.jiwa; k.desa++; if (!k.label) k.label = d.label; });
  const baris = [...per.values()].sort((a, b) => b.jiwa - a.jiwa).slice(0, 6), ungsi = (s.pg.sekolah || []).filter(x => !["III", "II"].includes(x.zona) && x.km >= s.p.radius).length;
  el.innerHTML = `<p class="sm-msg">${ungsi ? `${fmt(ungsi)} sekolah di luar KRB III/II dan di luar radius tampil di peta sebagai calon tempat pengungsian; daya tampungnya belum ada datanya. ` : ""}Titik kumpul dari jalan aman OSM di luar zona bahaya.</p>
    ${baris.length ? `<div class="tw"><table><thead><tr><th>Titik kumpul</th><th class="n">Desa</th><th class="n">Jiwa dituju</th></tr></thead><tbody>${baris.map(b => `<tr><td>${esc(b.label || "Jalan aman di luar zona")}</td><td class="n">${fmt(b.desa)}</td><td class="n">${jiwaTxt(b.jiwa)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
}
function logistikKartu() {
  const s = S, el = $("#smLogistik"); if (!el) return;
  if (!s.hasil) { el.innerHTML = `<p class="sm-msg">Menunggu sebaran abu…</p>`; return; }
  const m = Tanggap.masker(s.desa.map(d => ({jiwa: d.penduduk || 0, abu: d.abu})), {durasi_jam: s.p.durasi}), top = m.baris.slice().sort((a, b) => b.n - a.n).slice(0, 5), B = s.bandaraTutup || [];
  el.innerHTML = `<p class="sm-msg">${m.baris.length ? `${Kartu.hl(fmt(Math.round(m.total / 100) * 100) + " masker")} untuk ${fmt(m.baris.length)} desa dengan hujan abu sedang atau tebal (2 per orang per hari, ${m.hari} hari), sekitar ${barisRp(m.biaya)} bila Rp 3.500 per masker.` : "Tak ada desa terdaftar dengan hujan abu sedang atau tebal."}</p>
    ${top.length ? `<div class="tw"><table><thead><tr><th>Desa</th><th class="n">Masker</th></tr></thead><tbody>${top.map(b => `<tr><td>${esc(s.desa[b.i].nama)}</td><td class="n">${fmt(Math.round(b.n / 10) * 10)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    <p class="sm-msg">${B.length ? `Bandara di bawah jejak abu di atas ambang penerbangan (2 mg/m³): ${B.slice(0, 5).map(b => `${esc(b.nama)} (jam ke-${b.jam})`).join(", ")}${B.length > 5 ? ` dan ${B.length - 5} lainnya` : ""}. Penutupan bandara ditentukan otoritas penerbangan.` : "Tak ada bandara dalam jejak abu di atas ambang penerbangan pada 72 jam pertama."}</p>`;
}
function gambarTanggap() {
  const s = S, m = s.peta; if (!m?.getSource("kumpul") || !s.pg) return;
  const u = new Map(); for (const e of s.pg.evakuasi || []) if (e.ke) u.set(e.ke.join(","), {type: "Feature", geometry: {type: "Point", coordinates: e.ke}, properties: {}});
  m.getSource("kumpul").setData({type: "FeatureCollection", features: [...u.values()]});
  m.getSource("ungsi").setData({type: "FeatureCollection", features: (s.pg.sekolah || []).filter(x => !["III", "II"].includes(x.zona) && x.km >= s.p.radius).map(x => ({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {nama: x.nama}}))});
}
/* Graf jalan dibangun SEKALI per s.geo (Tanggap.bangunGraf: bobot menit dari kecepatan per kelas jalan OSM hasil paparan); desa dipasangkan ke simpul terdekat sekali.
   Klik ruas hanya menjalankan satu Dijkstra (d0 tanpa ruas ditutup di-cache). */
function siapGraf(s) {
  if (s.graf !== undefined && s.grafGeo === s.geo) return s.graf; s.grafGeo = s.geo;
  const R = s.geo?.rute; if (!R?.length || !s.pg) return s.graf = null;
  const kec = Tanggap.kecepatanRute(R, s.pg.evakuasi), tujuan = [...new Map((s.pg.evakuasi || []).filter(e => e.ke).map(e => [e.ke.join(","), e.ke])).values()];
  const G = Tanggap.bangunGraf(R, kec, tujuan, s.desa.map(d => [d.lon, d.lat]), Tanggap.median(kec) || 20); G.vmed = Tanggap.median(kec) || 20;
  G.d0 = G.tujuan.length ? Tanggap.dijkstra(G, new Set()) : null; return s.graf = G;
}
const dijkstra = (G, t) => Tanggap.dijkstra(G, t);
function gambarRute() {
  const s = S, R = s.geo?.rute, m = s.peta; if (!R?.length || !m?.getSource("rute")) return;
  m.getSource("rute").setData({type: "FeatureCollection", features: R.map((c, i) => ({type: "Feature", geometry: {type: "LineString", coordinates: c}, properties: {i, tutup: s.tutup.has(i) ? 1 : 0, bahaya: s.bahayaRuas?.[i] != null ? 1 : 0}}))});
}
function rute() {
  const s = S, el = $("#smRute"); if (!el) return;
  if (!s.geo?.rute?.length) { el.innerHTML = `<p class="sm-msg">Data rute evakuasi belum tersedia untuk gunung ini, jadi menutup jalan dan waktu tempuh belum bisa dihitung.</p>`; return; }
  gambarRute();
  const G = siapGraf(s);
  if (!G?.d0) { el.innerHTML = `<p class="sm-msg">Titik kumpul evakuasi belum tersedia, jadi waktu tempuh belum bisa dihitung.</p>`; return; }
  const d1 = s.tutup.size ? dijkstra(G, s.tutup) : G.d0;
  const menit = (d, i) => { const n = G.dn[i]; return n && isFinite(d[n[0]]) ? Math.round(d[n[0]] + n[1] / 15 * 60) : null; };
  const baris = s.desa.map((d, i) => ({d, a: menit(G.d0, i), b: menit(d1, i)}));
  const hasil = baris.filter(x => x.a != null && (x.b == null || x.b !== x.a)).sort((x, y) => ((y.b ?? 9e3) - y.a) - ((x.b ?? 9e3) - x.a)).slice(0, 8);
  const putus = baris.filter(x => x.a != null && x.b == null).length;
  el.innerHTML = `<p class="sm-msg">Klik ruas hijau di peta untuk menutup jalan. ${s.tutup.size ? `<b>${s.tutup.size} ruas</b> ditutup, <b>${fmt(putus)} desa</b> terputus.` : "Belum ada ruas yang ditutup."} ${s.tutup.size ? `<button type="button" class="btn sec" id="smBuka" style="height:28px;padding:0 10px">Buka semua</button>` : ""}</p>
    ${hasil.length ? `<div class="tw"><table><thead><tr><th>Desa</th><th class="n">Sebelum</th><th class="n">Sesudah</th></tr></thead><tbody>${hasil.map(x => `<tr><td>${esc(x.d.nama)}</td><td class="n">${mnt5(x.a)}</td><td class="n">${x.b == null ? pil("Terputus", WARNA.pdc) : mnt5(x.b)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  $("#smBuka")?.addEventListener("click", () => { s.tutup.clear(); rute(); });
  if (s.laharIdx) evakuasi();   /* ruas tertutup mengubah waktu tempuh -> hitung ulang evakuasi dan peringkat */
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
