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

/* Hasil padi: FAO-33 (Doorenbos & Kassam 1979) Ya/Ym = 1 - ky (1 - sum ETa / sum ETc), ky padi 1,09 dan batas gagal 50% sama dengan scripts/kekeringan/padi.py.
   Kebun (sawit, HTI): bak kedua per sel, Kc 0,95, p 0,65, Zr 0,9 m (FAO-56 Tabel 12 dan 22, kelompok palem; belum dicocokkan ke teks seperti padi). */
const AMBANG_JIWA = 1000, SPI_KERING = -1.5, KY = 1.09, GAGAL = 0.5, KEBUN = {kc: 0.95, p: 0.65, zr: 0.9};

/* jalankan bak untuk sel idx (bawaan semua). cfg = {tanam, laju, kap, omc} (omc = pecahan tambahan hujan pada hari yang sudah hujan) */
function jalankan(D, sk, hj, cfg, idx) {
  const N = D.n, P = D.param, dr = new Float32Array(N * H), ks = new Float32Array(N * H), eta = new Float32Array(N * H), irg = new Float32Array(N * H), loss = new Float32Array(N);
  const musim = P.fase.reduce((a, b) => a + b, 0), jiwa = new Float64Array(H), luas = new Float64Array(H), kebun = new Float64Array(H);
  for (const i of idx || Array.from({length: N}, (_, k) => k)) {
    const taw = D.taw[i], raw = P.p * taw, E = sk.et0[i], kHa = D.kebun ? D.kebun[i] : 0, tawK = taw * KEBUN.zr / P.zr;
    let d = D.dr0[i], dK = d / taw * tawK, dT = d, sisa = cfg.kap, sEta = 0, sEtc = 0, nK = D.nKering || 14;
    let seri = D.spi && D.spi[i] != null && D.spi[i] <= SPI_KERING ? nK : 0, rentan = D.rentan ? D.rentan[i] : 1;   /* seri = hari berturut-turut tanah stres; SPI-3 teramati kering dihitung sudah memenuhi N hari */
    for (let t = 0; t < H; t++) {
      const umur = t - cfg.tanam, h0 = hj[i * H + t], h = h0 * (1 + (h0 > 0 ? cfg.omc : 0)), e0 = E[Math.min(E.length - 1, Math.floor(t / 30))], kc = kcPadi(umur, P);
      let ir = 0;
      if (cfg.laju > 0 && umur >= 0 && umur < musim && d > raw) { ir = Math.min(cfg.laju, d - raw, sisa); sisa -= ir; }
      const r = langkah(d, taw, P.p, kc, e0, h, ir);
      d = r[0]; dr[i * H + t] = d; eta[i * H + t] = r[1]; ks[i * H + t] = r[2]; irg[i * H + t] = ir;
      if (umur >= 0 && umur < musim) { sEta += r[1]; sEtc += kc * e0; }
      if (r[2] < P.ambang_berat) luas[t] += D.km2[i];
      /* krisis air: tanah acuan (Kc 1,0, tak bergantung padi) stres berat sekurangnya N hari berturut-turut; hanya porsi penduduk yang bergantung sumber musiman */
      const rT = langkah(dT, taw, P.p, 1.0, e0, h); dT = rT[0]; seri = rT[2] < P.ambang_berat ? seri + 1 : 0;
      if (seri >= nK) jiwa[t] += D.jiwa[i] * rentan;
      if (kHa > 0) { const rk = langkah(dK, tawK, KEBUN.p, KEBUN.kc, e0, h); dK = rk[0]; if (rk[2] < P.ambang_berat) kebun[t] += kHa; }
    }
    loss[i] = sEtc > 0 ? Math.min(1, Math.max(0, KY * (1 - sEta / sEtc))) : 0;
  }
  return {dr, ks, eta, irg, jiwa, luas, loss, kebun, cfg};
}

/* ringkasan dampak satu jalan atas sel idx. Sawah dari tutupan.json (BUKAN pengamatan: lihat scripts/kekeringan/tutupan.py). */
function dampak(D, R, idx) {
  let sawah = 0, hilang = 0, puso = 0;
  for (const i of idx) { const s = D.sawah ? D.sawah[i] : 0; sawah += s; hilang += s * R.loss[i]; if (R.loss[i] >= GAGAL) puso += s; }
  let jiwaPuncak = 0, hariKrisis = 0, kebunPuncak = 0;
  for (let t = 0; t < H; t++) { if (R.jiwa[t] > jiwaPuncak) jiwaPuncak = R.jiwa[t]; if (R.jiwa[t] >= AMBANG_JIWA) hariKrisis++; if (R.kebun[t] > kebunPuncak) kebunPuncak = R.kebun[t]; }
  return {sawah, hilang, puso, jiwaPuncak, hariKrisis, kebunPuncak, kebutuhanL: jiwaPuncak * 15};
}
/* Pita ketidakpastian dari anggota SEAS5 utuh (p10, p50, p90 total hujan; neraca.py) : tiap anggota dijalankan lewat evaluasi yang sama.
   Hasil: rentang [min, maks] untuk padi hilang dan jiwa puncak, dan rentang padi diselamatkan tiap kandidat. null bila skenario tak punya anggota. */
function pita(T, D, sk, idx, ctx) {
  if (!sk.anggota || !idx.some(i => sk.ada_anggota ? sk.ada_anggota[i] : 1)) return null;   /* sel tanpa anggota ECMWF jatuh ke Normal: bukan pita */
  const E = ["p10", "p50", "p90"].map(q => evaluasi(T, D, {...sk, hujan: sk.anggota[q]}, hujanHarian(D, {...sk, hujan: sk.anggota[q]}), idx, ctx));
  const rg = f => { const v = E.map(f); return [Math.min(...v), Math.max(...v)]; };
  return {hilang: rg(e => e.dasar.hilang), puso: rg(e => e.dasar.puso), jiwa: rg(e => e.dasar.jiwaPuncak), kand: Object.fromEntries(E[0].kand.map((k, i) => [k.id, rg(e => e.kand[i].padiHa)]))};
}
/* sel di sekitar sel i0: kotak +-r derajat. Perlakuan dinilai atas kawasan ini, bukan satu sel 55 km */
const fokusSel = (D, i0, r = 1) => { const o = []; for (let i = 0; i < D.n; i++) if (Math.abs(D.lat[i] - D.lat[i0]) <= r + 1e-6 && Math.abs(D.lon[i] - D.lon[i0]) <= r + 1e-6) o.push(i); return o; };

/* Kandidat perlakuan: tiap satu dijalankan lewat bak yang sama atas kawasan idx, lalu dihitung manfaat (setara ha padi, jiwa) dan biaya (Rp).
   T = Tanggap (sim_tanggap.js); ctx = {tanam, pangkalan, biayaOmcHari}. Pompa/tanam awal hanya menyelamatkan padi; tangki/sumur bor hanya air bersih;
   hujan buatan dinilai dari keduanya lewat model (jiwa = turunnya puncak jiwa di sel stres). */
function evaluasi(T, D, sk, hj, idx, ctx) {
  const A = ctx.asumsi || T.ASUMSI, dasar = jalankan(D, sk, hj, {tanam: ctx.tanam, laju: 0, kap: 0, omc: 0}, idx), md = dampak(D, dasar, idx), nP = ctx.pangkalan.length;
  const cakup = ha => md.sawah > 0 ? Math.min(1, ha / md.sawah) : 0;
  const DEF = [
    {id: "t2", nama: "Truk tangki, 2 per pangkalan", jenis: "tangki", n: 2}, {id: "t10", nama: "Truk tangki, 10 per pangkalan", jenis: "tangki", n: 10},
    {id: "s10", nama: "Sumur bor air bersih, 10 titik", jenis: "sumur", n: 10}, {id: "s30", nama: "Sumur bor air bersih, 30 titik", jenis: "sumur", n: 30},
    {id: "p20", nama: "Pompanisasi, 20 pompa", jenis: "pompa", n: 20}, {id: "p60", nama: "Pompanisasi, 60 pompa", jenis: "pompa", n: 60},
    {id: "awal", nama: "Tanam 14 hari lebih awal", jenis: "awal", hari: 14}, {id: "omc", nama: "Hujan buatan, +10% di hari hujan", jenis: "omc", persen: 10}];
  const kand = DEF.map(k => {
    let cfg = {tanam: ctx.tanam, laju: 0, kap: 0, omc: 0}, jiwa = 0, biaya = 0, rinci = "";
    if (k.jenis === "tangki") { const kap = T.kapasitasTangki(ctx.pangkalan, k.n, A); jiwa = T.jiwaTerlayani(md.jiwaPuncak, kap, A); biaya = k.n * nP * A.sewa_tangki_hari * md.hariKrisis;
      rinci = `${k.n * nP} truk × ${md.hariKrisis} hari krisis; angkut ${Math.round(kap).toLocaleString("id-ID")} L/hari`; }
    else if (k.jenis === "sumur") { const kap = k.n * T.sumurL(A); jiwa = T.jiwaTerlayani(md.jiwaPuncak, kap, A); biaya = k.n * A.sumur_modal; rinci = `${k.n} titik × ${A.sumur_ls} L/detik, ${A.sumur_jam} jam/hari`; }
    else if (k.jenis === "pompa") { const c = cakup(k.n * A.pompa_ha); cfg.laju = A.laju_irigasi * c; cfg.kap = A.pompa_kap_mm * c; biaya = k.n * (A.pompa_modal + A.pompa_bbm_hari * 60); rinci = `${k.n * A.pompa_ha} ha terjangkau, ${Math.round(c * 100)}% sawah kawasan`; }
    else if (k.jenis === "awal") { cfg.tanam = Math.max(0, ctx.tanam - k.hari); biaya = md.sawah * A.awal_ha; rinci = `seluruh sawah kawasan`; }
    else { cfg.omc = k.persen / 100; biaya = A.omc_hari * (ctx.biayaOmcHari || A.omc_rp_hari); rinci = `${A.omc_hari} hari operasi`; }
    const R = k.jenis === "tangki" || k.jenis === "sumur" ? dasar : jalankan(D, sk, hj, cfg, idx), m = dampak(D, R, idx);
    const padiHa = Math.max(0, md.hilang - m.hilang), jw = k.jenis === "omc" ? Math.max(0, md.jiwaPuncak - m.jiwaPuncak) : jiwa;
    return {...k, padiHa, jiwa: Math.round(jw), biaya, rinci, perHa: T.perUnit(biaya, padiHa), perJiwa: T.perUnit(biaya, jw)};
  });
  return {dasar: md, kand, n: idx.length};
}

if (typeof module !== "undefined") module.exports = {langkah, kcPadi, fasePadi, hujanHarian, jalankan, dampak, fokusSel, evaluasi, pita, H, KY, GAGAL, AMBANG_JIWA};

if (typeof document !== "undefined") (() => {
const $ = s => document.querySelector(s), fmt1 = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const S = {D: null, sk: null, pl: "none", mode: "air", hari: 0, sel: 0, main: false, kec: 8, d3: false, tanam: 10, par: {laju: 4, kap: 150, cak: 30, geser: 10, omc: 10}, hj: {}, A: null, B: null, urut: "padi", As: {...Tanggap.ASUMSI}, airMinum: null, dibi: null, hind: null, kal: null, tutupan: false, posko: [], pangkalan: [], grid: null, omcRp: 0, ev: null};
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
    sawah: raw.tutupan ? raw.tutupan.sawah : null, kebun: raw.tutupan ? raw.tutupan.sawit.map((v, i) => v + raw.tutupan.hti[i]) : null,
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
  const D = S.mulai === "kemarau" ? {...S.D, dr0: S.D.nol, spi: null} : S.D;   /* awal kemarau: simpanan penuh (Dr = 0), SPI hari ini tak berlaku */
  S.A = jalanCache(D, key, S.hj[key]);
  S.B = S.pl === "none" ? S.A : jalankan(D, sk, S.hj[key], cfgPerlakuan());
  const kn = "normal" + (S.mulai === "kemarau" ? "_k" : ""), skn = S.D.skenario[kn];   /* pembanding: Normal, tanggal mulai dan tanam sama, tanpa perlakuan */
  if (S.sk !== "normal" && skn) { S.hj[kn] ||= hujanHarian(S.D, skn); S.N = jalanCache(D, kn, S.hj[kn]); } else S.N = null;
  S.pA = pcOf(S.A); S.pB = pcOf(S.B); S.pN = S.N ? pcOf(S.N) : null; S.mxA = Math.max(...S.pA); S.mxB = Math.max(...S.pB); S.mxN = S.pN ? Math.max(...S.pN) : 0;
  gambarSemua(); tanggap();
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
    peta.addSource("fokus", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    peta.addLayer({id: "fokus-tepi", type: "line", source: "fokus", paint: {"line-color": "#ffffff", "line-width": 1.4, "line-dasharray": [3, 2]}});
    peta.addLayer({id: "sm-pilih", type: "line", source: "sm", filter: ["==", ["get", "i"], S.sel], paint: {"line-color": "#ffffff", "line-width": 2.4}});
    peta.on("click", "sm-isi", e => { const f = e.features && e.features[0]; if (f) { S.sel = f.properties.i; peta.setFilter("sm-pilih", ["==", ["get", "i"], S.sel]); gambarGrafik(); segarHari(false); tanggap(); } });
    peta.on("mouseenter", "sm-isi", () => peta.getCanvas().style.cursor = "pointer");
    peta.on("mouseleave", "sm-isi", () => peta.getCanvas().style.cursor = "");
    $("#muat").classList.add("hilang");
    warnaLama = []; warnaPeta(); gambarFokus();
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
function renderAsumsi() {
  const A = S.As, v = [...(S.airMinum ? [] : [["porsi_rentan", "Penduduk bergantung sumber musiman", 0, 60, .5, Math.round(A.porsi_rentan * 1000) / 10, "%"]]), ["hari_kering", "Hari kering sebelum krisis", 3, 45, 1, A.hari_kering, " hari"],
    ["laju_kmj", "Kecepatan truk", 20, 70, 5, A.laju_kmj, " km/jam"], ["jarak_dalam_sel_km", "Jarak tujuan minimal", 5, 50, 5, A.jarak_dalam_sel_km, " km"]];
  const el = $("#slAs"); if (!el.firstChild) el.innerHTML = v.map(([k, n, a, b, st, nil]) => `<label class="sm-sl"><span>${n}<b data-n="${k}"></b></span><input type="range" data-k="${k}" min="${a}" max="${b}" step="${st}" value="${nil}" aria-label="${n}"></label>`).join("");
  v.forEach(([k, , , , , nil, sat]) => { const b = el.querySelector(`[data-n="${k}"]`); if (b) b.textContent = fmt1(nil) + sat; });
}
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
    + `<div class="sm-h sm-jw"><span class="sm-pil2">Jiwa rentan krisis air</span><b>${fmt(Math.round(B.jiwa[t]))}</b>` + (sama ? "" : `<small>${B.jiwa[t] - A.jiwa[t] < 0 ? "−" : "+"}${fmt(Math.abs(Math.round(B.jiwa[t] - A.jiwa[t])))} vs tanpa perlakuan</small>`) + (S.N ? `<small>${B.jiwa[t] - S.N.jiwa[t] < 0 ? "−" : "+"}${fmt(Math.abs(Math.round(B.jiwa[t] - S.N.jiwa[t])))} vs Normal</small>` : "") + `<small>Penduduk × porsi yang bergantung sumber air musiman, di sel kering. Bukan jumlah korban.</small></div>`;
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

/* porsi rentan per sel: per provinsi dari air_minum.json (Susenas, bila ada), selain itu satu angka ASUMSI; SPI-3 teramati per sel dari kekeringan_grid.json */
function terapkanAsumsi() {
  const D = S.D, g = S.grid, ip = g ? g.kolom.indexOf("prov") : -1, is = g ? g.kolom.indexOf("spi3") : -1, m = new Map(g ? g.grid.map(r => [r[0] + "," + r[1], r]) : []), am = S.airMinum && S.airMinum.prov || {};
  D.rentan = D.lat.map((la, i) => { const r = m.get(la + "," + D.lon[i]), p = r && ip >= 0 ? r[ip] : null; return p && am[p] ? am[p].rentan_pct / 100 : S.As.porsi_rentan; });
  D.spi = D.lat.map((la, i) => { const r = m.get(la + "," + D.lon[i]); return r && is >= 0 ? r[is] : null; });
  D.nKering = S.As.hari_kering; cache.clear();
}
/* Kalibrasi satu pengali (porsi rentan) terhadap jiwa terdampak DIBI. Hindcast = hujan dan ET0 bulanan NASA POWER tahun nyata (hindcast.json; hanya 2015 dan 2023 ada, 2019 tidak),
   mulai 1 Juni simpanan penuh. Porsi tahun y = DIBI_y / jiwa kering puncak model (porsi 100%). Dipakai tahun terbaru ber-DIBI; tahun lain menguji (LOO dua tahun). */
function kalibrasi() {
  const H_ = S.hind, th = S.dibi || {}; if (!H_) return null;
  const D = {...S.D, dr0: S.D.nol, spi: null, rentan: S.D.lat.map(() => 1), nKering: S.As.hari_kering}, rows = [];
  for (const y of Object.keys(H_.tahun)) {
    const sk = {int: 15, ...H_.tahun[y]}, R = jalankan(D, sk, hujanHarian(D, sk), cfgDasar()), obs = th[y] ? th[y].terdampak : 0, kej = th[y] ? th[y].kejadian : 0;
    if (obs > 0) rows.push({y, model: Math.max(...R.jiwa), obs, kej, k: obs / Math.max(...R.jiwa)});
  }
  if (!rows.length) return null;
  rows.sort((a, b) => b.y - a.y); const ref = rows[0];
  rows.forEach(r => { const lain = rows.find(x => x !== r); r.loo = lain ? r.model * lain.k / r.obs : null; r.dari = lain ? lain.y : null; });   /* prediksi tahun r dengan pengali tahun lain, dibagi pengamatan */
  return {porsi: ref.k, ref: ref.y, rows};
}
const kaliTeks = () => { const K = S.kal; if (!K) return ""; const x = r => `${r.y}: model ${bulatan(r.model)} jiwa kering puncak, DIBI ${bulatan(r.obs)} jiwa dari ${fmt(r.kej)} kejadian`;
  return `Kalibrasi: porsi rentan ${fmt1(K.porsi * 100)}% dari ${K.ref} (${x(K.rows[0])}). Uji silang dua tahun: ` + K.rows.filter(r => r.dari).map(r => `pengali ${r.dari} memprediksi ${r.y} sebesar ${r.loo.toLocaleString("id-ID", {maximumSignificantDigits: 2})}× pengamatan${r === K.rows[0] ? "" : ` (${x(r)})`}`).join("; ") + `. DIBI hanya jiwa yang dilaporkan dan pencatatannya beda antartahun, jadi satu pengali belum tervalidasi; hindcast 2019 tak ada (bahan iklim hanya 2015 dan 2023).`; };
/* ---------- dampak dan lapis tanggap di kawasan sekitar sel pilihan ---------- */
const rp = n => "Rp" + (n >= 1e9 ? fmt1(n / 1e9) + " M" : n >= 1e6 ? fmt1(n / 1e6) + " jt" : fmt(Math.round(n)));
const bulatan = n => n >= 1000 ? fmt(Math.round(n / 100) * 100) : fmt(Math.round(n));
/* kabupaten terdekat dari titik posko kekeringan (BNPB/BPS lewat posko.py); null bila jauh dari semua titik */
function namaKab(i) {
  let b = null, jd = 1e9;
  for (const p of S.posko) { const d = Tanggap.jarakKm(S.D.lat[i], S.D.lon[i], p.lat, p.lon); if (d < jd) { jd = d; b = p; } }
  return b && jd < 80 ? b.kab.split("|")[1] : null;
}
const kunciKab = i => { let b = null, jd = 1e9; for (const p of S.posko) { const d = Tanggap.jarakKm(S.D.lat[i], S.D.lon[i], p.lat, p.lon); if (d < jd) { jd = d; b = p; } } return b && jd < 80 ? b.kab : null; };
/* bawaan = sel paling kering hari ini: SPI-3 terendah (kekeringan_grid.json) di antara sel berpenduduk 50 ribu ke atas; seri dipecah simpanan tanah terkini */
function selTerkering() {
  const D = S.D, g = S.grid, ik = g ? g.kolom.indexOf("spi3") : -1, peta = new Map(g ? g.grid.map(r => [r[0] + "," + r[1], r]) : []);
  let best = -1, bs = Infinity;
  for (let i = 0; i < D.n; i++) {
    if (D.jiwa[i] < 5e4 || (D.sawah && !(D.sawah[i] > 0))) continue;
    const r = peta.get(D.lat[i] + "," + D.lon[i]), lembap = D.dr0[i] / D.taw[i], iq = g ? g.kolom.indexOf("q3") : -1;
    if (r && iq >= 0 && r[iq] > .5) continue;   /* massa nol hujan > 50%: fit gamma SPI tak andal, jangan dijadikan bawaan */
    const spi = r && ik >= 0 && r[ik] != null ? Math.max(-3, r[ik]) : null;
    const sk = (spi == null ? 0 : spi) - .5 * lembap;
    if (sk < bs) { bs = sk; best = i; }
  }
  if (best < 0) best = D.jiwa.indexOf(Math.max(...D.jiwa));
  const r = peta.get(D.lat[best] + "," + D.lon[best]);
  return {i: best, spi: r && ik >= 0 && r[ik] != null ? Math.max(-3, r[ik]) : null, isi: Math.round((1 - D.dr0[best] / D.taw[best]) * 100)};
}
function kartuAwal() {
  const a = S.awal, kab = namaKab(a.i), el = $("#awalTeks");
  el.textContent = `Sel berpenduduk di atas 50.000 jiwa dengan SPI-3 terendah hari ini${kab ? ", dekat " + kab : ""}: SPI-3 ${a.spi == null ? "tak tersedia" : fmt1(a.spi)}, tanah terisi ${fmt(a.isi)}% dari kapasitas. Klik sel lain untuk menggantinya.`;
}
function gambarFokus() {
  let src; try { src = peta && peta.getSource("fokus"); } catch (x) {} if (!src || !S.D) return;
  const D = S.D, r = 1 + D.sel / 2, la = D.lat[S.sel], lo = D.lon[S.sel];
  src.setData({type: "FeatureCollection", features: [{type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [[[lo - r, la - r], [lo + r, la - r], [lo + r, la + r], [lo - r, la + r], [lo - r, la - r]]]}}]});
}
let antriT = false;
function tanggap() { if (antriT) return; antriT = true; nanti(() => { antriT = false; hitungTanggap(); }); }
function hitungTanggap() {
  const D = S.D, key = kunciSk(), sk = D.skenario[key], Dm = S.mulai === "kemarau" ? {...D, dr0: D.nol, spi: null} : D, idx = fokusSel(D, S.sel, 1);
  S.hj[key] ||= hujanHarian(D, sk);
  const pang = S.pangkalan.length ? Tanggap.pangkalanTerdekat(D.lat[S.sel], D.lon[S.sel], S.pangkalan, S.As.pangkalan_n, S.As) : [];
  S.ev = evaluasi(Tanggap, Dm, sk, S.hj[key], idx, {tanam: S.tanam, pangkalan: pang, biayaOmcHari: S.omcRp || undefined, asumsi: S.As}); S.ev.pang = pang; S.ev.pita = pita(Tanggap, Dm, sk, idx, {tanam: S.tanam, pangkalan: pang, biayaOmcHari: S.omcRp || undefined, asumsi: S.As});
  gambarFokus(); renderTanggap();
}
function renderTanggap() {
  const E = S.ev, m = E.dasar, ada = !!S.D.sawah, kab = namaKab(S.sel);
  $("#dampakJudul").textContent = `Dampak di sekitar ${kab || "sel pilihan"}`;
  const sel = (judul, nil, kat) => `<div class="sm-h"><span class="sm-pil2">${judul}</span><b>${nil}</b>${kat ? `<small>${kat}</small>` : ""}</div>`;
  $("#dampak").innerHTML = (ada ? sel("Padi hilang", fmt(Math.round(m.hilang / 100) * 100) + "<i>ha</i>", `dari sawah perkiraan ${bulatan(m.sawah)} ha`) + sel("Padi puso", bulatan(m.puso) + "<i>ha</i>", "hilang hasil 50% atau lebih") : "")
    + sel("Jiwa rentan krisis air", bulatan(m.jiwaPuncak), `puncak; porsi rentan ${fmt1(S.As.porsi_rentan * 100)}%${S.airMinum ? " (Susenas)" : S.kal ? " (kalibrasi DIBI)" : " (asumsi)"}`) + sel("Kebutuhan air", bulatan(m.kebutuhanL / 1000) + "<i>m³/hari</i>", "15 liter per orang")
    + (D_kebun() ? sel("Kebun tertekan", bulatan(m.kebunPuncak) + "<i>ha</i>", "sawit dan HTI, puncak") : "")
    + (E.pita ? `<small class="sm-cat" style="grid-column:1/-1"><b>Pita 51 anggota SEAS5</b> (anggota hujan p10 sampai p90): padi hilang ${bulatan(E.pita.hilang[0])} sampai ${bulatan(E.pita.hilang[1])} ha, puso ${bulatan(E.pita.puso[0])} sampai ${bulatan(E.pita.puso[1])} ha, jiwa rentan krisis air ${bulatan(E.pita.jiwa[0])} sampai ${bulatan(E.pita.jiwa[1])}.${bss()}</small>` : S.D.skenario[kunciSk()].nama === "Prakiraan ECMWF" ? `<small class="sm-cat" style="grid-column:1/-1">Pita anggota SEAS5 muncul sesudah data simulasi diperbarui pipeline berikutnya.</small>` : `<small class="sm-cat" style="grid-column:1/-1">Pita anggota hanya ada pada Prakiraan ECMWF; skenario ini satu jalan.</small>`)
    + pembanding() + `<small class="sm-cat" style="grid-column:1/-1">${kaliTeks()}</small>`
    + `<small class="sm-cat" style="grid-column:1/-1">Kawasan ${fmt(E.n)} sel (±1°) di sekitar sel pilihan, simulasi ${tgl(0, true)} sampai ${tgl(H - 1, true)}. ${ada ? "Luas sawah adalah perkiraan dari tutupan lahan, bukan data sawah." : "Tutupan lahan belum tersedia: padi tidak dihitung."}</small>`;
  const urut = Tanggap.urutkan(E.kand.filter(k => ada || (k.jenis !== "pompa" && k.jenis !== "awal")), S.urut);
  seg($("#segUrut"), ada ? [["padi", "Padi"], ["jiwa", "Jiwa"], ["biaya", "Biaya"]] : [["jiwa", "Jiwa"], ["biaya", "Biaya"]], S.urut, "urut");
  $("#peringkat").innerHTML = `<table class="sm-tb"><thead><tr><th>Perlakuan</th>${ada ? "<th>Padi (ha)</th>" : ""}<th>Jiwa</th><th>Biaya</th></tr></thead><tbody>`
    + urut.map((k, n) => `<tr title="${esc(k.rinci)}"><td><b>${n + 1}.</b> ${esc(k.nama)}</td>${ada ? `<td>${k.padiHa > 0 ? bulatan(k.padiHa) + (k.perHa ? `<small>${rp(k.perHa)}/ha</small>` : "") : "–"}</td>` : ""}`
      + `<td>${k.jiwa > 0 ? bulatan(k.jiwa) + (k.perJiwa ? `<small>${rp(k.perJiwa)}/jiwa</small>` : "") : "–"}</td><td>${rp(k.biaya)}</td></tr>`).join("") + `</tbody></table>`
    + `<small class="sm-cat">Pangkalan truk: ${E.pang.length ? E.pang.map(b => `${esc(b.nama)} (${fmt(Math.round(b.km))} km, ${fmt1(b.tJam)} jam, ${b.rit} rit/hari)`).join("; ") : "tidak ada BPBD terdata"}. Waktu tempuh dari jarak lurus × 1,4 ÷ 40 km/jam, bukan jaringan jalan. Harga satuan asumsi perencanaan; ganti dengan harga resmi sebelum dipakai.</small>`;
}
/* pembanding teramati dan hasil 51 anggota per kabupaten (kekeringan_padi.json), dibaca apa adanya */
const bss = () => { const b = S.uji && S.uji.prospek && S.uji.prospek.semua ? S.uji.prospek.semua.bss : null; return b == null ? "" : ` Prakiraan musiman belum terbukti lebih baik dari klimatologi: BSS uji balik ${fmt(b)} (hindcast SEAS5 tak tersedia).`; };
function pembanding() {
  const a = S.awal, kk = kunciKab(S.sel), pk = kk && S.padi && S.padi.kab ? S.padi.kab[kk] : null, g = S.grid, ik = g ? g.kolom.indexOf("spi3") : -1, D = S.D;
  const r = g && ik >= 0 ? g.grid.find(x => x[0] === D.lat[S.sel] && x[1] === D.lon[S.sel]) : null, spi = r && r[ik] != null ? Math.max(-3, r[ik]) : null, iq = g ? g.kolom.indexOf("q3") : -1, lemah = r && iq >= 0 && r[iq] > .5;
  const t = [];
  if (spi != null || D.dr0[S.sel] != null) t.push(`Teramati sel ini: SPI-3 ${spi == null ? "tak tersedia" : fmt1(spi) + (spi <= -3 ? " (batas tampilan, sebenarnya lebih rendah)" : "") + (lemah ? " (fit gamma kurang andal: lebih dari separuh tahun dasar tanpa hujan)" : "")}, tanah terisi ${fmt(Math.round((1 - D.dr0[S.sel] / D.taw[S.sel]) * 100))}% (kelembapan tanah 7-28 cm).`);
  if (pk && !pk.sawah_kosong) t.push(`Indikator padi kabupaten dari 51 anggota (kekeringan_padi.json): penurunan hasil median ${fmt(pk.turun_med)}%, p90 ${fmt(pk.turun_p90)}%, Normal ${fmt(pk.turun_normal)}%.`);
  return t.length ? `<small class="sm-cat" style="grid-column:1/-1">${t.join(" ")}</small>` : "";
}
const D_kebun = () => !!S.D.kebun;

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
  <li>Jiwa rentan krisis air bukan jumlah petani atau korban; lihat bagian Tutupan lahan di bawah.</li></ul>
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
  <h4>Tutupan lahan, dampak, dan peringkat perlakuan</h4>
  <ul><li>Bawaan simulasi: sel dengan SPI-3 terendah hari ini (kekeringan_grid.json, dibatasi −3 dan tanpa sel yang lebih dari separuh tahun dasarnya tanpa hujan) di antara sel berpenduduk di atas 50.000 jiwa, dengan prakiraan ECMWF dari hari ini. Bukan sel berpenduduk terbanyak.</li>
  <li>Tutupan dari lapisan repo (scripts/kekeringan/tutupan.py): hutan = kawasan hutan KLHK dan konsesi HPH, kebun = konsesi sawit dan HTI, gambut = peta gambut. Dirasterkan ke piksel 5,6 km. <b>Luas sawah tidak ada di data terbuka mana pun di repo.</b> Sawah per sel = lahan budidaya (daratan dikurangi hutan, konsesi, gambut) dikali faktor supaya jumlahnya ${f(S.D.tutupan ? Math.round(S.D.tutupan.lbs_ha / 1e5) / 10 : 0)} juta ha: ${S.D.tutupan ? esc(S.D.tutupan.lbs_dari) : ""}. Luas baku sawah per provinsi tidak bisa diunduh otomatis (BPS webapi butuh kunci, ATR/BPN tanpa unduhan terbuka); begitu data/lbs_provinsi.json ada, tiap provinsi memakai angkanya sendiri. Sebaran merata di dalam provinsi. Pakai sebagai urutan besaran dan untuk membandingkan perlakuan, bukan sebagai luas sawah sel itu.</li>
  <li>Padi hilang = luas sawah × turunnya hasil FAO-33 (1 − ky × (1 − ΣETa/ΣETc), ky padi ${f(KY)}), puso bila turun 50% atau lebih (sama dengan padi.py). Kebun: bak kedua, Kc 0,95, p 0,65, Zr 0,9 m. Jiwa rentan krisis air = penduduk sel × porsi yang bergantung sumber air musiman (sumur gali, mata air, hujan, air permukaan), pada hari tanah acuan (Kc 1,0, tak bergantung padi) stres berat sekurangnya N hari berturut-turut; sel dengan SPI-3 teramati ≤ −1,5 dianggap sudah memenuhi N hari selama tanahnya masih stres. Porsi bawaan ${f(Math.round(S.As.porsi_rentan * 1000) / 10)}% ${S.kal && !S.airMinum ? "hasil kalibrasi ke DIBI (lihat bawah)" : "ASUMSI"} dan N = ${f(S.As.hari_kering)} hari (ASUMSI) bisa diubah di kartu Asumsi; tabel Susenas per provinsi belum ada (BPS webapi butuh kunci, tabel web tak terunduh), begitu data/air_minum.json ada porsi per provinsi dipakai. Kebutuhan air 15 liter per orang per hari (Sphere 2018). Hari krisis = hari dengan jiwa rentan sekurangnya ${f(AMBANG_JIWA)} (ASUMSI).</li>
  <li>Kawasan dampak dan peringkat: sel dalam ±1° dari sel pilihan. Tiap kandidat dijalankan lewat bak yang sama, manfaat = selisih terhadap tanpa perlakuan.</li>
  <li>Truk tangki: kecepatan ${f(S.As.laju_kmj)} km/jam dan jarak tujuan minimal ${f(S.As.jarak_dalam_sel_km)} km (keduanya ASUMSI, ubah di kartu Asumsi); pangkalan = tiga kantor BPBD kabupaten terdekat (posko_kekeringan.json, hanya yang terdata); waktu tempuh dari jarak lurus × 1,4 ÷ 40 km/jam seperti posko.py, bukan jaringan jalan; satu putaran = pergi, pulang, 1 jam isi dan bongkar; kerja 10 jam; tangki 5.000 liter. Jumlah truk adalah pengandaian, bukan data armada BPBD. Sumur bor 2 liter/detik, 12 jam/hari, untuk air bersih. Pompanisasi 10 ha per pompa, 6 mm/hari, sumber 150 mm (sungai atau embung terbatas).</li>
  <li>Biaya: sewa truk Rp1,5 jt/hari, sumur bor Rp200 jt/titik, pompa Rp30 jt + BBM Rp300 rb/hari, tanam awal Rp400 rb/ha, hujan buatan 5 hari × Rp220 jt (keputusan.json, Kemenhut 2026). Selain hujan buatan semuanya asumsi perencanaan, belum harga resmi.</li>
  <li>${esc(kaliTeks())} Hindcast: scripts/kekeringan/hindcast.py (hujan, suhu, RH, angin, radiasi NASA POWER bulanan 2015 dan 2023).</li>
  <li>Sumber data nyata yang dicoba tanpa kunci dan gagal: tabel Susenas air minum dan luas baku sawah per provinsi BPS (halaman statistics-table memuat tabel lewat skrip, judul yang dicari tak ditemukan; webapi butuh kunci), Kepmen ATR/BPN 686/2019 (tak ada unduhan terbuka yang bisa dicapai). air_minum.json dan lbs_provinsi.json karena itu belum ada.</li>
  <li>Padi dan jiwa tidak dijumlahkan; pilih urutan di atas peringkat. Hasil model, belum divalidasi terhadap puso Kementan atau laporan BPBD.</li></ul>
  <h4>Batas model</h4>
  <ul><li>Bak satu lapis: tanpa aliran lateral, muka air tanah, genangan sawah, atau irigasi nyata. Padi dianggap tadah hujan.</li>
  <li>Semua hujan meresap; limpasan dan perkolasi tidak dilacak.</li>
  <li>Resolusi 0,5 derajat (sekitar 55 km): satu sel mewakili banyak jenis tanah dan tanam sekaligus; padi memakai satu bak per sel, bukan per petak sawah.</li>
  <li>Skenario iklim bukan prakiraan; angka jiwa adalah perkiraan penduduk rentan, bukan jumlah petani atau korban.</li></ul></div>`;
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
    else if (kunci === "urut") { S.urut = v; renderTanggap(); }
    else if (kunci === "kec") { S.kec = +v; seg($("#segKec"), [[4, "Pelan"], [8, "Sedang"], [20, "Cepat"]], v, "kec"); }
    else if (kunci === "mode") { S.mode = v; seg($("#segMode"), [["air", "Air tanah"], ["stres", "Stres"]], v, "mode"); legendaPeta(); warnaLama = []; warnaPeta(); }
  });
  $("#rHari").addEventListener("input", e => { S.hari = +e.target.value; segarHari(false); });
  $("#rTanam").addEventListener("input", e => { S.tanam = +e.target.value; jadwal(); });
  $("#slAs").addEventListener("input", e => { const k = e.target.dataset.k; if (!k) return; S.As[k] = k === "porsi_rentan" ? +e.target.value / 100 : +e.target.value; renderAsumsi();
    if (k === "porsi_rentan" || k === "hari_kering") { terapkanAsumsi(); jadwal(); } else tanggap(); });
  $("#slPl").addEventListener("input", e => { const k = e.target.dataset.k; if (k) { S.par[k] = +e.target.value; jadwal(); } });
  $("#dlg").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  const tema = $("#tema"); if (tema) tema.onclick = () => { const g = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches, t = g ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pb-tema", JSON.stringify(t)); } catch (x) {} };
}
(async () => {
  try { const t = JSON.parse(localStorage.getItem("pb-tema")); if (t) document.documentElement.dataset.theme = t; } catch (x) {}
  let raw;
  try { const r = await fetch("../data/kekeringan_neraca.json"); if (!r.ok) throw new Error(r.status); raw = await r.json(); }
  catch (e) { $("#muat").innerHTML = `<div><b>Data simulasi belum tersedia.</b></div>`; return; }
  const lain = async u => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch (x) { return null; } };
  const [tut, pk, gr, kp, pd, am, dk, ub, hd] = await Promise.all([lain("data/tutupan.json"), lain("../data/posko_kekeringan.json"), lain("../data/kekeringan_grid.json"), lain("../data/keputusan.json"), lain("../data/kekeringan_padi.json"), lain("data/air_minum.json"), lain("../data/dampak_kekeringan.json"), lain("../data/kekeringan_ujibalik.json"), lain("data/hindcast.json")]);
  raw.tutupan = tut && tut.lat.length === raw.sel_data.lat.length && tut.lat.every((v, i) => v === raw.sel_data.lat[i] && tut.lon[i] === raw.sel_data.lon[i]) ? tut : null;   /* urutan sel harus sama dengan neraca; bila beda, tutupan dibuang */
  S.D = siapkan(raw); S.grid = gr; S.padi = pd; S.uji = ub; S.hind = hd && hd.lat.length === raw.sel_data.lat.length ? hd : null; S.airMinum = am; S.dibi = dk && dk.tahunan ? dk.tahunan : null;
  S.posko = pk && pk.posko ? pk.posko : [];
  S.pangkalan = pk && pk.kabupaten ? pk.kabupaten.filter(k => k.bpbd && k.bpbd.lat != null).map(k => ({nama: "BPBD " + k.nama, lat: k.bpbd.lat, lon: k.bpbd.lon})) : [];
  S.omcRp = kp && kp.param && kp.param.biaya_omc_hari ? kp.param.biaya_omc_hari[0] : 0;
  const ids = Object.keys(S.D.skenario); if (!ids.length) { $("#muat").innerHTML = `<div><b>Data simulasi belum tersedia.</b></div>`; return; }
  S.mulai = S.D.mulai.hariini ? "hariini" : "kemarau"; S.tanam = S.D.mulai[S.mulai].tanam;   /* bawaan: kejadian hari ini dengan prakiraan ECMWF; Awal kemarau tetap bisa dipilih */
  S.sk = ["ecmwf", "nino"].find(k => listSk().some(([x]) => x === k)) || listSk()[0][0];
  S.kal = kalibrasi(); if (S.kal && !S.airMinum) S.As.porsi_rentan = Math.round(S.kal.porsi * 1000) / 1000;
  terapkanAsumsi(); S.awal = selTerkering(); S.sel = S.awal.i; kartuAwal();
  seg($("#segMulai"), listMulai(), S.mulai, "mulai"); $("#kartuMulai").hidden = Object.keys(S.D.mulai).length < 2; seg($("#segSk"), listSk(), S.sk, "sk"); seg($("#segPl"), PL, S.pl, "pl");
  seg($("#segKec"), [[4, "Pelan"], [8, "Sedang"], [20, "Cepat"]], S.kec, "kec"); seg($("#segMode"), [["air", "Air tanah"], ["stres", "Stres"]], S.mode, "mode");
  $("#rTanam").value = S.tanam; $("#play").innerHTML = ik('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>');
  renderAsumsi(); legendaPeta(); hubung(); petaInit(); hitung(); $("#muat").classList.add("hilang");
  window.__sim = {S, jalankan, langkah, get peta() { return peta; }};   /* untuk pemeriksaan di konsol */
})();
})();
