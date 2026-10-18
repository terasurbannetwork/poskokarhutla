"use strict";
/* Simulasi neraca air tanah (bak FAO-56) per sel 0,5 derajat. Data disiapkan scripts/kekeringan/neraca.py -> data/kekeringan_neraca.json.
   Berkas ini bisa dimuat node (require) untuk uji kesetaraan `langkah` dengan neraca.py; UI hanya jalan bila ada document. */
const H = 180;

/* satu hari bak; HARUS sama dengan neraca.langkah (uji: python3 scripts/kekeringan/neraca.py uji) */
function langkah(dr, taw, p, kc, et0, hujan, irigasi = 0) {
  const raw = p * taw, ks = dr <= raw ? 1 : Math.max(0, (taw - dr) / (taw - raw)), eta = ks * kc * et0, baru = dr - hujan - irigasi + eta;
  return [Math.min(Math.max(baru, 0), taw), eta, ks];
}
function kcPadi(umur, par) {
  const [a, b, c, d] = par.fase, [k0, k1, k2] = par.kc;
  if (umur < 0 || umur >= a + b + c + d) return par.kc_bera;
  if (umur < a) return k0;
  if (umur < a + b) return k0 + (k1 - k0) * (umur - a) / b;
  if (umur < a + b + c) return k1;
  return k1 + (k2 - k1) * (umur - a - b - c) / d;
}
const fasePadi = (umur, par) => { const [a, b, c, d] = par.fase; return umur < 0 ? "Belum tanam" : umur < a ? "Awal" : umur < a + b ? "Perkembangan" : umur < a + b + c ? "Tengah" : umur < a + b + c + d ? "Akhir" : "Sudah panen"; };

/* hujan mingguan -> harian: jumlah hari hujan = total / intensitas (maks 7), hari dipilih deterministik; sel sewilayah (1,5 derajat) berbagi hari hujan */
const campur = (a, b, c) => { let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
function hujanHarian(D, sk) {
  const N = D.n, out = new Float32Array(N * H);
  for (let i = 0; i < N; i++) {
    const bibit = (Math.floor(D.lat[i] / 1.5) + 100) * 1000 + Math.floor(D.lon[i] / 1.5) + 100, mg = sk.hujan[i];
    for (let w = 0; w * 7 < H; w++) {
      const R = mg[w], n = Math.min(7, H - w * 7); if (!(R >= 1)) continue;
      const k = Math.min(n, Math.max(1, Math.round(R / sk.int))), hari = [];
      for (let j = 0; j < n; j++) hari.push([campur(bibit, w, j), j]);
      hari.sort((x, y) => x[0] - y[0]);
      for (let j = 0; j < k; j++) out[i * H + w * 7 + hari[j][1]] = R / k;
    }
  }
  return out;
}

/* jalankan bak untuk semua sel. cfg = {tanam, laju, kap, omc} (omc = pecahan tambahan hujan pada hari yang sudah hujan) */
function jalankan(D, sk, hj, cfg) {
  const N = D.n, P = D.param, dr = new Float32Array(N * H), ks = new Float32Array(N * H), eta = new Float32Array(N * H), irg = new Float32Array(N * H);
  const musim = P.fase.reduce((a, b) => a + b, 0), jiwa = new Float64Array(H), luas = new Float64Array(H);
  for (let i = 0; i < N; i++) {
    const taw = D.taw[i], raw = P.p * taw, E = sk.et0[i]; let d = D.dr0[i], sisa = cfg.kap;
    for (let t = 0; t < H; t++) {
      const umur = t - cfg.tanam, h0 = hj[i * H + t], h = h0 * (1 + (h0 > 0 ? cfg.omc : 0));
      let ir = 0;
      if (cfg.laju > 0 && umur >= 0 && umur < musim && d > raw) { ir = Math.min(cfg.laju, d - raw, sisa); sisa -= ir; }
      const r = langkah(d, taw, P.p, kcPadi(umur, P), E[Math.min(E.length - 1, Math.floor(t / 30))], h, ir);
      d = r[0]; dr[i * H + t] = d; eta[i * H + t] = r[1]; ks[i * H + t] = r[2]; irg[i * H + t] = ir;
      if (r[2] < P.ambang_berat) { jiwa[t] += D.jiwa[i]; luas[t] += D.km2[i]; }
    }
  }
  return {dr, ks, eta, irg, jiwa, luas, cfg};
}

if (typeof module !== "undefined") module.exports = {langkah, kcPadi, fasePadi, hujanHarian, jalankan, H};

if (typeof document !== "undefined") (() => {
const $ = s => document.querySelector(s), fmt1 = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const S = {D: null, sk: null, pl: "none", mode: "air", hari: 0, sel: 0, main: false, kec: 8, d3: false, tanam: 10, par: {laju: 4, kap: 150, cak: 30, geser: 10, omc: 10}, hj: {}, A: null, B: null};
const PL = [["none", "Tanpa"], ["pompa", "Pompa"], ["awal", "Tanam awal"], ["omc", "Hujan buatan"]];
const RAMP = [[0, [164, 52, 58]], [.25, [224, 121, 59]], [.5, [232, 197, 71]], [.75, [121, 184, 106]], [1, [46, 127, 184]]];
const KS_WARNA = ["#a4343a", "#e8b84a", "#5aa56e"];   /* berat, ringan, tak stres */
const FASE_WARNA = {"Belum tanam": "#9aa4b2", "Sudah panen": "#9aa4b2", Awal: "#9bc27a", Perkembangan: "#5aa56e", Tengah: "#2f8a5a", Akhir: "#d9a441"};
const warnaAir = s => { s = Math.min(1, Math.max(0, s)); let k = 1; while (k < RAMP.length - 1 && RAMP[k][0] < s) k++;
  const [a, ca] = RAMP[k - 1], [b, cb] = RAMP[k], f = (s - a) / (b - a); return "rgb(" + ca.map((v, j) => Math.round(v + (cb[j] - v) * f)).join(",") + ")"; };
const t0 = () => Date.parse((S.D.skenario[kunciSk()].tgl || S.D.mulai[S.mulai].tgl) + "T00:00:00Z");   /* ECMWF bawaan lama bertanggal sendiri */
const kunciSk = () => S.sk + (S.mulai === "kemarau" ? "_k" : "");
const listSk = () => Object.entries(S.D.skenario).filter(([, x]) => x.mulai === S.mulai).map(([k, x]) => [k.replace(/_k$/, ""), x.nama]);
const tgl = (t, thn) => new Date(t0() + t * 864e5).toLocaleDateString("id-ID", {day: "numeric", month: "short", ...(thn ? {year: "numeric"} : {}), timeZone: "UTC"});
const ik = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const listMulai = () => Object.entries(S.D.mulai).map(([k, x]) => [k, x.nama]);
const seg = (el, opsi, aktif, kunci) => {   /* daftar opsi tetap: hanya aria-pressed yang diubah (fokus keyboard tidak hilang); dibangun ulang bila daftar berubah */
  el.dataset.k = kunci; const ada = [...el.children];
  if (ada.length === opsi.length && ada.every((b, i) => b.dataset.v === String(opsi[i][0]) && b.textContent === opsi[i][1])) { ada.forEach(b => b.setAttribute("aria-pressed", b.dataset.v === String(aktif))); return; }
  el.innerHTML = opsi.map(([v, n]) => `<button data-v="${v}" aria-pressed="${String(v) === String(aktif)}">${n}</button>`).join("");
};
/* tunda kerja berat sesudah frame berikutnya (sama dengan nanti() di app.js) supaya klik langsung terasa */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };

function siapkan(raw) {
  const c = raw.sel_data, n = c.lat.length;
  return {...raw, n, lat: c.lat, lon: c.lon, taw: c.taw, gb: c.gb, jiwa: c.jiwa, dr0: c.dr0, nol: c.dr0.map(() => 0),
    km2: c.lat.map(la => 3098 * Math.cos(la * Math.PI / 180)), tot: c.lat.reduce((a, la) => a + 3098 * Math.cos(la * Math.PI / 180), 0)};
}
const cfgDasar = () => ({tanam: S.tanam, laju: 0, kap: 0, omc: 0});
const cfgPerlakuan = () => { const c = cfgDasar(); if (S.pl === "pompa") { c.laju = S.par.laju * S.par.cak / 100; c.kap = S.par.kap * S.par.cak / 100; }   /* laju dan kapasitas = rata-rata sel: hanya sebagian lahan terjangkau */ else if (S.pl === "awal") c.tanam = Math.max(0, S.tanam - S.par.geser); else if (S.pl === "omc") c.omc = S.par.omc / 100; return c; };

/* ---------- hitung ulang: dua jalan (tanpa perlakuan, dengan perlakuan); murah (~20 ms), digabung per frame ---------- */
let antri = false;
function jadwal() { if (antri) return; antri = true; nanti(() => { antri = false; hitung(); }); }
/* jalan tanpa perlakuan (A) dan Normal (N) dipakai ulang selama skenario, mulai, dan tanggal tanam sama: penggeser perlakuan hanya menjalankan satu jalan */
const cache = new Map();
function jalanCache(D, key, hj) { const ck = key + "|" + S.mulai + "|" + S.tanam; let r = cache.get(ck); if (!r) { r = jalankan(D, S.D.skenario[key], hj, cfgDasar()); cache.set(ck, r); if (cache.size > 10) cache.delete(cache.keys().next().value); } return r; }
const pcOf = R => R.pct ||= Array.from(R.luas, v => v / S.D.tot * 100);
function hitung() {
  const key = kunciSk(), sk = S.D.skenario[key]; S.hj[key] ||= hujanHarian(S.D, sk);
  const D = S.mulai === "kemarau" ? {...S.D, dr0: S.D.nol} : S.D;   /* awal kemarau: simpanan penuh (Dr = 0) */
  S.A = jalanCache(D, key, S.hj[key]);
  S.B = S.pl === "none" ? S.A : jalankan(D, sk, S.hj[key], cfgPerlakuan());
  const kn = "normal" + (S.mulai === "kemarau" ? "_k" : ""), skn = S.D.skenario[kn];   /* pembanding: Normal, tanggal mulai dan tanam sama, tanpa perlakuan */
  if (S.sk !== "normal" && skn) { S.hj[kn] ||= hujanHarian(S.D, skn); S.N = jalanCache(D, kn, S.hj[kn]); } else S.N = null;
  S.pA = pcOf(S.A); S.pB = pcOf(S.B); S.pN = S.N ? pcOf(S.N) : null; S.mxA = Math.max(...S.pA); S.mxB = Math.max(...S.pB); S.mxN = S.pN ? Math.max(...S.pN) : 0;
  gambarSemua();
}
function gambarSemua() { renderSlider(); gambarSpark(); gambarGrafik(); segarHari(true); }

/* ---------- peta ---------- */
let peta, warnaLama = [];
/* kamera = batas Indonesia dengan padding dari panel yang terukur (kiri, grafik kanan, bilah waktu + legenda); tata letak kolom di bawah 1181 px */
function pasPeta() {
  const kolom = matchMedia("(max-width:1180px)").matches, r = id => $(id).getBoundingClientRect(), m = peta.getContainer().getBoundingClientRect();
  const pad = kolom ? {top: 8, left: 8, right: 8, bottom: 8} : {top: 16, left: r("#kiri").right - m.left + 20, right: m.right - r("#bagan").left + 16, bottom: m.bottom - r("#bawah").top + 52};
  peta.resize(); peta.fitBounds([[95, -11], [141, 6]], {padding: pad, duration: 0});
}
function petaInit() {
  const D = S.D, fitur = D.lat.map((la, i) => { const lo = D.lon[i], h = D.sel / 2;
    return {type: "Feature", properties: {i}, geometry: {type: "Polygon", coordinates: [[[lo - h, la - h], [lo + h, la - h], [lo + h, la + h], [lo - h, la + h], [lo - h, la - h]]]}}; });
  peta = new maplibregl.Map({container: "peta", center: [118, -2.4], zoom: 3.6, minZoom: 3, maxZoom: 11, maxPitch: 70, attributionControl: {compact: true},
    style: {version: 8, sources: {
      sat: {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar"},
      dem: {type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 12}},
      layers: [{id: "bg", type: "background", paint: {"background-color": "#0b2545"}}, {id: "sat", type: "raster", source: "sat"}]}});
  peta.touchZoomRotate.disableRotation();
  peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-left");
  peta.on("movestart", e => { if (e.originalEvent) S.sentuh = true; });
  pasPeta(); addEventListener("resize", () => nanti(() => { if (!S.sentuh) pasPeta(); }));
  peta.on("load", () => {
    peta.addSource("sm", {type: "geojson", data: {type: "FeatureCollection", features: fitur}, promoteId: "i"});
    peta.addLayer({id: "sm-isi", type: "fill", source: "sm", paint: {"fill-color": ["coalesce", ["feature-state", "c"], "rgba(0,0,0,0)"], "fill-opacity": .8}});
    peta.addLayer({id: "sm-tepi", type: "line", source: "sm", paint: {"line-color": "rgba(0,0,0,.35)", "line-width": .6}});
    peta.addLayer({id: "sm-pilih", type: "line", source: "sm", filter: ["==", ["get", "i"], S.sel], paint: {"line-color": "#ffffff", "line-width": 2.4}});
    peta.on("click", "sm-isi", e => { const f = e.features && e.features[0]; if (f) { S.sel = f.properties.i; peta.setFilter("sm-pilih", ["==", ["get", "i"], S.sel]); gambarGrafik(); segarHari(false); } });
    peta.on("mouseenter", "sm-isi", () => peta.getCanvas().style.cursor = "pointer");
    peta.on("mouseleave", "sm-isi", () => peta.getCanvas().style.cursor = "");
    $("#muat").classList.add("hilang");
    warnaLama = []; warnaPeta();
  });
}
function warnaPeta() {
  if (!peta || !peta.getSource("sm")) return;
  const D = S.D, R = S.B, t = S.hari, amb = D.param.ambang_berat;
  for (let i = 0; i < D.n; i++) {
    const k = i * H + t;
    const c = S.mode === "air" ? warnaAir(1 - R.dr[k] / D.taw[i]) : (R.ks[k] < amb ? KS_WARNA[0] : R.ks[k] < 1 ? KS_WARNA[1] : KS_WARNA[2]);
    if (warnaLama[i] !== c) { warnaLama[i] = c; peta.setFeatureState({source: "sm", id: i}, {c}); }
  }
}
function atur3d() {
  $("#b3d").setAttribute("aria-pressed", S.d3);
  if (S.d3) { if (!peta.getTerrain()) peta.setTerrain({source: "dem", exaggeration: 1.6}); peta.dragRotate.enable(); peta.easeTo({pitch: 55, duration: 700}); }
  else { peta.setTerrain(null); peta.dragRotate.disable(); peta.easeTo({pitch: 0, bearing: 0, duration: 500}); }
}

/* ---------- panel ---------- */
function renderSlider() {
  $("#rTanam").value = S.tanam;
  const p = S.par, v = {
    pompa: [["laju", "Laju di lahan terjangkau", 0, 10, 1, p.laju, " mm/hari"], ["kap", "Kapasitas di lahan terjangkau", 0, 400, 10, p.kap, " mm"], ["cak", "Lahan terjangkau", 0, 100, 5, p.cak, "%"]],
    awal: [["geser", "Tanam lebih awal", 0, 30, 1, p.geser, " hari"]],
    omc: [["omc", "Tambahan hujan di hari berhujan", 0, 20, 1, p.omc, "%"]]}[S.pl] || [];
  const el = $("#slPl"), sudah = [...el.querySelectorAll("input")].map(i => i.dataset.k).join();
  if (sudah !== v.map(x => x[0]).join()) el.innerHTML = v.map(([k, n, a, b, st, nil, sat]) => `<label class="sm-sl"><span>${n}<b data-n="${k}"></b></span><input type="range" data-k="${k}" min="${a}" max="${b}" step="${st}" value="${nil}" aria-label="${n}"></label>`).join("");
  v.forEach(([k, , , , , nil, sat]) => { const b = el.querySelector(`[data-n="${k}"]`); if (b) b.textContent = fmt(nil) + sat; });
  $("#vTanam").textContent = tgl(S.tanam, true);
}
function segarHari(penuh) {
  const D = S.D, t = S.hari, i = S.sel, A = S.A, B = S.B, P = D.param, k = i * H + t, sama = S.pl === "none";
  $("#tgl").textContent = tgl(t, true); $("#hHari").textContent = tgl(t, true);
  $("#rHari").value = t;
  /* fase padi */
  const umur = t - B.cfg.tanam, fs = fasePadi(umur, P), panen = B.cfg.tanam + P.fase.reduce((a, b) => a + b, 0);
  $("#fase").innerHTML = `<span class="sm-pil2" style="--w:${FASE_WARNA[fs]}">${fs}</span>` + (panen < H ? `<span>Panen ${tgl(panen, true)}</span>` : `<span>Panen sesudah ${tgl(H - 1, true)}</span>`);
  /* hasil nasional */
  const pA = S.pA, pB = S.pB, pN = S.pN;
  const ds = (d, kata) => { const r = Math.round(d * 10) / 10; return `<small class="${r < 0 ? "baik" : r > 0 ? "buruk" : ""}">${r > 0 ? "+" : r < 0 ? "−" : ""}${fmt1(Math.abs(r))} poin ${kata}</small>`; };
  const blok = (judul, nil, dA, dN) => `<div class="sm-h"><span class="sm-pil2">${judul}</span><b>${fmt1(nil)}<i>%</i></b>${sama ? "" : ds(nil - dA, "vs tanpa perlakuan")}${pN ? ds(nil - dN, "vs Normal") : ""}</div>`;
  $("#hasil").innerHTML = `<p class="sm-cat">Porsi luas sel stres, termasuk lahan tanpa tanaman.</p>` + blok("Luas hari ini", pB[t], pA[t], pN && pN[t]) + blok("Luas puncak", S.mxB, S.mxA, S.mxN)
    + `<div class="sm-h sm-jw"><span class="sm-pil2">Jiwa di sel stres</span><b>${fmt(Math.round(B.jiwa[t]))}</b>` + (sama ? "" : `<small>${B.jiwa[t] - A.jiwa[t] < 0 ? "−" : "+"}${fmt(Math.abs(Math.round(B.jiwa[t] - A.jiwa[t])))} vs tanpa perlakuan</small>`) + (S.N ? `<small>${B.jiwa[t] - S.N.jiwa[t] < 0 ? "−" : "+"}${fmt(Math.abs(Math.round(B.jiwa[t] - S.N.jiwa[t])))} vs Normal</small>` : "") + `<small>Penduduk di sel stres, bukan jumlah petani.</small></div>`;
  /* sel terpilih */
  const taw = D.taw[i], sim = taw - B.dr[k], h0 = S.hj[kunciSk()][k] * (1 + (S.hj[kunciSk()][k] > 0 ? B.cfg.omc : 0));
  $("#selNama").textContent = `${fmt1(Math.abs(D.lat[i]))}° ${D.lat[i] < 0 ? "LS" : "LU"}, ${fmt1(D.lon[i])}° BT`;
  $("#selNilai").innerHTML = `<span style="--w:#3b82c4">Hujan ${fmt1(h0)}${B.irg[k] ? " + " + fmt1(B.irg[k]) + " pompa" : ""} mm</span><span style="--w:#d9822b">Penguapan ${fmt1(B.eta[k])} mm</span><span style="--w:#2f8a5a">Simpanan ${fmt(Math.round(sim))} mm (${fmt(Math.round(sim / taw * 100))}%)</span>`;
  const kur = $("#kur"); if (kur) { const x = sbX(t); kur.setAttribute("x1", x); kur.setAttribute("x2", x); }
  warnaPeta();
}

/* ---------- grafik sel terpilih ---------- */
const GW = 440, PL_ = 34, PR_ = 8, sbX = t => PL_ + (t + .5) / H * (GW - PL_ - PR_);
function gambarGrafik() {
  const D = S.D, P = D.param, i = S.sel, A = S.A, B = S.B, taw = D.taw[i], raw = P.p * taw, hj = S.hj[kunciSk()], beda = S.pl !== "none";
  const r = [], e = [], eA = [], s = [], sA = [];
  for (let t = 0; t < H; t++) { const k = i * H + t, h0 = hj[k]; r.push(h0 * (1 + (h0 > 0 ? B.cfg.omc : 0))); e.push(B.eta[k]); eA.push(A.eta[k]); s.push(taw - B.dr[k]); sA.push(taw - A.dr[k]); }
  const maxR = Math.max(...r.map((v, t) => v + B.irg[i * H + t])), rm = Math.max(10, Math.ceil(maxR / 10) * 10), tinggiA = 88, yA = 14, yB = 128, tinggiB = 84;
  const ya = v => yA + tinggiA - Math.min(v, rm) / rm * tinggiA, yb = v => yB + tinggiB - v / taw * tinggiB, lebar = (GW - PL_ - PR_) / H;
  const bar = r.map((v, t) => v > .05 ? `<rect x="${sbX(t) - lebar / 2 + .2}" y="${ya(v + B.irg[i * H + t])}" width="${Math.max(.8, lebar - .4)}" height="${yA + tinggiA - ya(v)}" fill="#3b82c4"/>` + (B.irg[i * H + t] > 0 ? `<rect x="${sbX(t) - lebar / 2 + .2}" y="${ya(v + B.irg[i * H + t])}" width="${Math.max(.8, lebar - .4)}" height="${ya(v) - ya(v + B.irg[i * H + t])}" fill="#2bb3a3"/>` : "") : (B.irg[i * H + t] > 0 ? `<rect x="${sbX(t) - lebar / 2 + .2}" y="${ya(B.irg[i * H + t])}" width="${Math.max(.8, lebar - .4)}" height="${yA + tinggiA - ya(B.irg[i * H + t])}" fill="#2bb3a3"/>` : "")).join("");
  const gar = (arr, y) => arr.map((v, t) => (t ? "L" : "M") + sbX(t).toFixed(1) + " " + y(v).toFixed(1)).join("");
  const luasS = gar(s, yb) + `L${sbX(H - 1)} ${yB + tinggiB}L${sbX(0)} ${yB + tinggiB}Z`;
  const rIdx = r.indexOf(Math.max(...r)), mn = Math.min(...s), mnT = s.indexOf(mn), mnA = Math.min(...sA);
  const lab = (x, y, tx, a = "middle", w = "") => `<text x="${x}" y="${y}" text-anchor="${a}" ${w}>${tx}</text>`;
  /* sumbu waktu: awal tiap bulan */
  let sb = "";
  for (let t = 0; t < H; t++) { const d = new Date(t0() + t * 864e5); if (d.getUTCDate() === 1 || t === 0) sb += `<line class="gr" x1="${sbX(t)}" x2="${sbX(t)}" y1="${yA}" y2="${yB + tinggiB}"/>` + lab(sbX(t) + 2, 232 + 16, d.toLocaleDateString("id-ID", {month: "short", timeZone: "UTC"}), "start"); }
  /* pita fase tanam */
  let pita = "", ta = 0, fp = fasePadi(-B.cfg.tanam, P);
  for (let t = 1; t <= H; t++) { const f = t < H ? fasePadi(t - B.cfg.tanam, P) : null;
    if (f !== fp) { const x0 = sbX(ta) - lebar / 2, x1 = sbX(t - 1) + lebar / 2; pita += `<rect x="${x0}" y="228" width="${x1 - x0}" height="8" fill="${FASE_WARNA[fp]}"/>` + (x1 - x0 > 42 ? `<text class="pf" x="${(x0 + x1) / 2}" y="235.5" text-anchor="middle">${fp}</text>` : ""); ta = t; fp = f; } }
  $("#grafik").innerHTML = `<svg viewBox="0 0 ${GW} 258" role="img" aria-label="Hujan, penguapan, dan simpanan air tanah sel terpilih">
    <line class="gr" x1="${PL_}" x2="${GW - PR_}" y1="${yA + tinggiA}" y2="${yA + tinggiA}"/><line class="gr" x1="${PL_}" x2="${GW - PR_}" y1="${yB + tinggiB}" y2="${yB + tinggiB}"/>
    ${lab(PL_ - 4, yA + 8, rm, "end")}${lab(PL_ - 4, yA + tinggiA, 0, "end")}${lab(PL_ - 4, yB + 8, fmt(Math.round(taw)), "end")}${lab(PL_ - 4, yB + tinggiB, 0, "end")}
    ${lab(PL_ + 2, yA - 4, "mm/hari", "start", 'class="ks"')}${lab(PL_ + 2, yB - 5, "simpanan mm", "start", 'class="ks"')}
    ${sb}${bar}
    ${beda ? `<path d="${gar(eA, v => ya(v))}" fill="none" stroke="#d9822b" stroke-width="1.3" stroke-dasharray="3 3" opacity=".7"/>` : ""}
    <path d="${gar(e, v => ya(v))}" fill="none" stroke="#d9822b" stroke-width="1.8"/>
    <path d="${luasS}" fill="#2f8a5a" fill-opacity=".22"/>
    ${beda ? `<path d="${gar(sA, yb)}" fill="none" stroke="#2f8a5a" stroke-width="1.3" stroke-dasharray="3 3" opacity=".7"/>` : ""}
    <path d="${gar(s, yb)}" fill="none" stroke="#2f8a5a" stroke-width="1.8"/>
    <line x1="${PL_}" x2="${GW - PR_}" y1="${yb(taw - raw)}" y2="${yb(taw - raw)}" stroke="#a4343a" stroke-width="1" stroke-dasharray="4 3"/>
    ${lab(GW - PR_, yB + tinggiB - 3, "batas stres " + fmt(Math.round(taw - raw)) + " mm", "end", 'class="ks" fill="#a4343a"')}
    ${r[rIdx] > 0 ? lab(Math.min(Math.max(sbX(rIdx), 22), GW - 22), ya(r[rIdx] + B.irg[i * H + rIdx]) - 3, fmt(Math.round(r[rIdx])), "middle", 'class="v" fill="#3b82c4"') : ""}
    ${lab(Math.min(Math.max(sbX(mnT), 40), GW - 40), Math.min(yb(mn) + 12, yB + tinggiB - 3), "terendah " + fmt(Math.round(mn)) + (beda ? " (tanpa: " + fmt(Math.round(mnA)) + ")" : ""), "middle", 'class="v" fill="#2f8a5a"')}
    ${pita}
    <line id="kur" class="kur" x1="${sbX(S.hari)}" x2="${sbX(S.hari)}" y1="${yA - 6}" y2="236"/></svg>`;
  $("#legGr").innerHTML = `<span style="--w:#3b82c4">Hujan</span>` + (S.pl === "pompa" ? `<span style="--w:#2bb3a3">Pompa</span>` : "") + `<span style="--w:#d9822b">Penguapan</span><span style="--w:#2f8a5a">Simpanan air</span>` + (beda ? `<span class="pt" style="--w:#7b8794">Garis putus = tanpa perlakuan</span>` : "");
}
function gambarSpark() {
  const A = S.A, B = S.B, mx = Math.max(1, ...A.luas, ...B.luas), jalan = R => Array.from(R.luas, (v, t) => (t ? "L" : "M") + (t / (H - 1) * 100).toFixed(2) + " " + (24 - v / mx * 22).toFixed(1)).join("");
  $("#spark").setAttribute("viewBox", "0 0 100 24");
  $("#spark").innerHTML = (S.pl !== "none" ? `<path d="${jalan(A)}" fill="none" stroke="#7b8794" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>` : "") + `<path d="${jalan(B)}L100 24L0 24Z" fill="#a4343a" fill-opacity=".18" stroke="#a4343a" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
}
function legendaPeta() {
  $("#legPeta").innerHTML = S.mode === "air"
    ? `<span class="gl">Kering</span><span class="sm-grad"></span><span class="gl">Basah</span>`
    : [["Stres berat (Ks < " + fmt(S.D.param.ambang_berat) + ")", KS_WARNA[0]], ["Stres ringan", KS_WARNA[1]], ["Tanpa stres", KS_WARNA[2]]].map(([n, c]) => `<span style="--w:${c}">${n}</span>`).join("");
}

/* ---------- putar ---------- */
let rafId = 0, terakhir = 0, sisa = 0;
function putar(on) {
  S.main = on; $("#play").innerHTML = on ? ik('<path d="M8 5v14M16 5v14" stroke-width="3"/>') : ik('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>');
  $("#play").setAttribute("aria-label", on ? "Jeda" : "Putar"); cancelAnimationFrame(rafId);
  if (!on) return; if (S.hari >= H - 1) S.hari = 0; terakhir = 0; sisa = 0;
  const langkahRaf = ts => {
    if (!S.main) return; if (terakhir) { sisa += Math.min(ts - terakhir, 100) / 1000 * S.kec; const n = Math.floor(sisa); if (n >= 1) { sisa -= n; S.hari = Math.min(H - 1, S.hari + n); segarHari(false); } }
    terakhir = ts; if (S.hari >= H - 1) { putar(false); return; } rafId = requestAnimationFrame(langkahRaf); };
  rafId = requestAnimationFrame(langkahRaf);
}

/* ---------- metode ---------- */
function metode() {
  const P = S.D.param, f = fmt, d = $("#dlg");
  const dtanam = m => new Date(Date.parse(S.D.mulai[m].tgl + "T00:00:00Z") + S.D.mulai[m].tanam * 864e5).toLocaleDateString("id-ID", {day: "numeric", month: "long", timeZone: "UTC"});
  const bd = S.D.et0_banding, F = S.D.fao, aw = S.D.awal_dari, ec = S.D.ecmwf, e0 = S.D.et0_dari;
  d.innerHTML = `<div class="dh"><b>Metode dan batas model</b><button data-tutup aria-label="Tutup">×</button></div><div class="db">
  <h4>Rumus</h4><p>Bak air satu lapis FAO-56 (Allen dkk. 1998, Bab 8), satu langkah per hari untuk tiap sel:</p>
  <pre>TAW = 1000 × (KL − TL) × Zr           (pers. 82)
RAW = p × TAW                         (pers. 83)
Ks  = 1                bila Dr ≤ RAW
Ks  = (TAW − Dr) / ((1 − p) × TAW)    bila Dr &gt; RAW   (pers. 84)
ETa = Ks × Kc × ET0                   (pers. 80 dan 81)
Dr' = Dr − hujan − irigasi + ETa      (pers. 85), dipotong ke 0 sampai TAW</pre>
  <p>Dr = defisit air di zona akar (mm), TAW = air tersedia total, RAW = air yang bisa diambil tanpa stres, KL = kapasitas lapang, TL = titik layu, Zr = kedalaman akar, Ks = faktor stres, Kc = koefisien tanaman. Kelebihan di atas kapasitas lapang hilang hari itu juga (FAO-56 Bab 8, batas Dr). Stres berat = Ks di bawah ${f(P.ambang_berat)}: pengelompokan kami, bukan baku FAO.</p>
  <h4>Konstanta, dicocokkan ke teks FAO-56</h4>
  <ul><li>p = ${f(P.p)} (${F.p}, padi, catatan: 0,20 dari jenuh). Zr = ${f(P.zr)} m (${F.zr}: padi 0,5 sampai 1,0 m, diambil batas bawah).</li>
  <li>Kc padi ${f(P.kc[0])} / ${f(P.kc[1])} / ${f(P.kc[2])} (${F.kc}: Kc awal 1,05, tengah 1,20, akhir 0,90 sampai 0,60; diambil 0,90). Fase ${P.fase.join(" / ")} hari = ${P.fase.reduce((a, b) => a + b, 0)} hari (${F.fase}, padi tropis).</li>
  <li>Tanah mineral: lempung, KL ${f(P.fc)} dan TL ${f(P.wp)} m³/m³, titik tengah kisaran ${F.fc} (KL 0,20 sampai 0,30; TL 0,07 sampai 0,17). TAW = ${f(P.taw[0])} mm. Satu kelas tanah untuk semua sel mineral.</li>
  <li>Gambut: air tersedia ${f(P.aw_gambut)} m³/m³, TAW ${f(P.taw[1])} mm. Ini asumsi kami; FAO-56 tidak memuat gambut. TAW sel = campuran menurut porsi gambut dari peta gambut.</li>
  <li>Kc lahan belum ditanam atau sudah dipanen ${f(P.kc_bera)}: asumsi kami.</li></ul>
  <h4>Tanggal tanam dan metrik</h4>
  <ul><li>Bawaan tanam: ${dtanam("hariini")} untuk Hari ini (awal tanam musim hujan)${S.D.mulai.kemarau ? ` dan ${dtanam("kemarau")} untuk Awal kemarau (tanam gadu)` : ""}. Keduanya asumsi kami; semua sel ditanam serentak, padahal tanggal tanam nyata berbeda tiap daerah. Geser sendiri dengan penggeser Tanam padi.</li>
  <li>Padi tadah hujan yang ditanam di kemarau memang kekurangan air hampir tiap tahun; angka stres besar di skenario Awal kemarau, juga pada Normal, bukan berarti tahun itu luar biasa. Bandingkan dengan Normal lewat selisih "vs Normal".</li>
  <li>Angka utama adalah porsi luas sel yang sedang stres berat (Ks di bawah ${f(P.ambang_berat)}) dari luas seluruh sel, dalam persen. Semua sel dihitung, termasuk kota, lahan bera, dan masa sebelum tanam, jadi ini ukuran kondisi tanah, bukan luas tanaman padi yang gagal.</li>
  <li>Jiwa di sel stres adalah penduduk seluruh sel itu (WorldPop), bukan jumlah petani atau korban.</li></ul>
  <h4>Titik mulai</h4>
  <ul><li>Awal kemarau: 1 Juni, simpanan penuh (kapasitas lapang di akhir musim hujan) di semua sel, dugaan sederhana. Hanya skenario iklim; Prakiraan ECMWF memang mulai hari ini.</li>
  <li>Hari ini: ${esc(aw.hariini)}.</li></ul>
  <h4>Skenario hujan dan penguapan</h4>
  <ul>${ec ? `<li>Prakiraan ECMWF (terbit ${esc(ec.terbit || "")}${ec.dari_lama ? `, dibawa dari ${ec.dari_lama} hari lalu karena data baru tak tersedia` : ""}): median anggota prakiraan musiman untuk ${ec.hari} hari pertama; sisa hari dilengkapi klimatologi Normal sel itu.${ec.et0_ecmwf ? "" : " ET0 memakai klimatologi karena prakiraan ET0 belum ada."}</li>` : ""}
  <li>El Niño kuat: rata-rata hujan bulanan NASA POWER tahun 1997, 2015, 2023 untuk bulan-bulan di tahun mulai, dan 1998, 2016, 2024 untuk bulan-bulan di tahun berikutnya.</li>
  <li>Normal: rata-rata 1991 sampai 2020.</li>
  <li>ET0 skenario iklim: Penman-Monteith FAO-56 (${F.et0}) dari suhu maks/min, kelembapan, angin 2 m, dan radiasi matahari bulanan NASA POWER; pada ${f(e0.pm)} dari ${f(e0.pm + e0.hs)} deret sel memakai Penman-Monteith penuh, sisanya Hargreaves-Samani karena variabel POWER kurang. Elevasi dari POWER, G = 0. ${bd ? `Dibandingkan dengan ET0 Open-Meteo (${esc(bd.jendela)}, ${f(bd.n)} sel), PM POWER rata-rata ${f(Math.abs(bd.selisih_pct))}% ${bd.selisih_pct < 0 ? "lebih rendah" : "lebih tinggi"} (rasio median ${f(bd.rasio_median)})${bd.selisih_pct < 0 ? ", jadi skenario iklim mungkin terlalu ringan" : ""}.` : ""} El Niño memakai variabel tahun-tahun itu.</li>
  <li>Hujan bulanan dibagi harian: jumlah hari hujan = total ÷ ${f(P.intensitas)} mm per hari hujan (asumsi), hari dipilih acak tetap dan dibagi bersama oleh sel sewilayah. Hasilnya skenario, bukan prakiraan hari tertentu.</li></ul>
  <h4>Perlakuan</h4>
  <ul><li>Pompa: menambah air saat Dr melewati RAW, sebesar laju yang kamu atur, selama musim tanam, sampai kapasitas habis. Laju dan kapasitas berlaku di lahan terjangkau; di tingkat sel dikalikan porsi lahan terjangkau. Semuanya angka pengaturan, bukan data pompa atau embung nyata.</li>
  <li>Tanam lebih awal: menggeser tanggal tanam, sehingga kebutuhan air puncak jatuh di waktu lain.</li>
  <li>Hujan buatan: menambah hujan sekian persen hanya di hari yang sudah berhujan. Rentang 0 sampai 20% adalah rentang pengaturan, tanpa klaim hasil: kami tidak menemukan rujukan WMO atau BRIN yang bisa dikutip untuk angka efeknya.</li></ul>
  <h4>Batas model</h4>
  <ul><li>Bak satu lapis: tanpa aliran lateral, muka air tanah, genangan sawah, atau irigasi nyata. Padi dianggap tadah hujan.</li>
  <li>Semua hujan meresap; limpasan dan perkolasi tidak dilacak.</li>
  <li>Resolusi 0,5 derajat (sekitar 55 km): satu sel mewakili banyak jenis tanah dan tanam sekaligus.</li>
  <li>Skenario iklim bukan prakiraan; angka jiwa adalah penduduk di sel yang sedang stres berat, bukan jumlah petani atau korban.</li></ul></div>`;
  d.showModal();
}

/* ---------- mulai ---------- */
function hubung() {
  document.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tutup !== undefined) { $("#dlg").close(); return; }
    const kunci = b.parentElement && b.parentElement.dataset.k, v = b.dataset.v;
    if (b.id === "info") metode();
    else if (b.id === "play") putar(!S.main);
    else if (b.id === "b3d") { S.d3 = !S.d3; atur3d(); }
    else if (kunci === "sk") { S.sk = v; seg($("#segSk"), listSk(), v, "sk"); jadwal(); }
    else if (kunci === "mulai") { S.mulai = v; S.tanam = S.D.mulai[v].tanam; if (!listSk().some(([k]) => k === S.sk)) S.sk = "nino"; seg($("#segMulai"), listMulai(), v, "mulai"); seg($("#segSk"), listSk(), S.sk, "sk"); S.hari = 0; jadwal(); }
    else if (kunci === "pl") { S.pl = v; seg($("#segPl"), PL, v, "pl"); jadwal(); }
    else if (kunci === "kec") { S.kec = +v; seg($("#segKec"), [[4, "Pelan"], [8, "Sedang"], [20, "Cepat"]], v, "kec"); }
    else if (kunci === "mode") { S.mode = v; seg($("#segMode"), [["air", "Air tanah"], ["stres", "Stres"]], v, "mode"); legendaPeta(); warnaLama = []; warnaPeta(); }
  });
  $("#rHari").addEventListener("input", e => { S.hari = +e.target.value; segarHari(false); });
  $("#rTanam").addEventListener("input", e => { S.tanam = +e.target.value; jadwal(); });
  $("#slPl").addEventListener("input", e => { const k = e.target.dataset.k; if (k) { S.par[k] = +e.target.value; jadwal(); } });
  $("#dlg").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  const tema = $("#tema"); if (tema) tema.onclick = () => { const g = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches, t = g ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pb-tema", JSON.stringify(t)); } catch (x) {} };
}
(async () => {
  try { const t = JSON.parse(localStorage.getItem("pb-tema")); if (t) document.documentElement.dataset.theme = t; } catch (x) {}
  let raw;
  try { const r = await fetch("../data/kekeringan_neraca.json"); if (!r.ok) throw new Error(r.status); raw = await r.json(); }
  catch (e) { $("#muat").innerHTML = `<div><b>Data simulasi belum tersedia.</b></div>`; return; }
  S.D = siapkan(raw);
  const ids = Object.keys(S.D.skenario); if (!ids.length) { $("#muat").innerHTML = `<div><b>Data simulasi belum tersedia.</b></div>`; return; }
  S.mulai = S.D.mulai.kemarau ? "kemarau" : "hariini"; S.tanam = S.D.mulai[S.mulai].tanam;   /* bawaan: awal kemarau (kekeringan dan perlakuan terlihat Jun-Okt); ECMWF hanya ada di Hari ini */
  S.sk = listSk().some(([k]) => k === "nino") ? "nino" : listSk()[0][0];
  S.sel = S.D.jiwa.indexOf(Math.max(...S.D.jiwa));
  seg($("#segMulai"), listMulai(), S.mulai, "mulai"); $("#kartuMulai").hidden = Object.keys(S.D.mulai).length < 2; seg($("#segSk"), listSk(), S.sk, "sk"); seg($("#segPl"), PL, S.pl, "pl");
  seg($("#segKec"), [[4, "Pelan"], [8, "Sedang"], [20, "Cepat"]], S.kec, "kec"); seg($("#segMode"), [["air", "Air tanah"], ["stres", "Stres"]], S.mode, "mode");
  $("#rTanam").value = S.tanam; $("#play").innerHTML = ik('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>');
  legendaPeta(); hubung(); petaInit(); hitung(); $("#muat").classList.add("hilang");
  window.__sim = {S, jalankan, langkah, get peta() { return peta; }};   /* untuk pemeriksaan di konsol */
})();
})();
