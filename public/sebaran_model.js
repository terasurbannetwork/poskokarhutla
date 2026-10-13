/* sebaran_model.js — "Model data (dilatih)": peluang terbakar per sel 375 m untuk 72 jam dari satu titik api baru.
   Model = gradient boosting (public/data/model_sebaran.json) yang dilatih pada 12 musim deteksi VIIRS (scripts/sebaran/).
   Fitur dihitung PERSIS seperti scripts/sebaran/fitur.py: cuaca per jam (Open-Meteo, 30 hari lalu + 4 hari ke depan),
   kode FWI dengan masa panas 30 hari, lahan (gambut/kawasan/konsesi), kanal, jalan, desa, riwayat MODIS, ENSO/IOD.
   Langkah = 24 jam; 3 langkah; Monte Carlo n kali -> peluang per sel per hari, sebaran luas (P10/P50/P90), peluang lolos.
   Per jam: luas harian dibagi ke jam menurut ISI per jam (interpolasi, BUKAN pengamatan; VIIRS hanya melihat ~2x sehari).
   Tanpa dependensi. API: SebaranModel.{muat, cuaca, lahan, ramal, uji}. */
(function (G) {
"use strict";
const D = 0.003375, X0 = 94, Y0 = -12, NX = 14300, HA = 14.0625;
const sel = (lon, lat) => Math.floor((lat - Y0) / D) * NX + Math.floor((lon - X0) / D);
const ij = k => [k % NX, Math.floor(k / NX)];
const pusat = k => [X0 + (k % NX + .5) * D, Y0 + (Math.floor(k / NX) + .5) * D];
const rad = Math.PI / 180;
const jarakM = (x1, y1, x2, y2) => Math.hypot((x2 - x1) * 111320 * Math.cos((y1 + y2) / 2 * rad), (y2 - y1) * 110574);
const arah = (x1, y1, x2, y2) => (Math.atan2((x2 - x1) * Math.cos((y1 + y2) / 2 * rad), y2 - y1) / rad + 360) % 360;

/* ---------------- FWI (port scripts/data/fwi.py) ---------------- */
const LE = 9.0, LF = 1.39;
function ffmcH(f0, t, h, w, r) {
  let mo = 147.2 * (101 - f0) / (59.5 + f0);
  if (r > .5) { const rf = r - .5; let tb = 42.5 * rf * Math.exp(-100 / (251 - mo)) * (1 - Math.exp(-6.93 / rf)); if (mo > 150) tb += .0015 * (mo - 150) ** 2 * Math.sqrt(rf); mo = Math.min(mo + tb, 250); }
  const ed = .942 * h ** .679 + 11 * Math.exp((h - 100) / 10) + .18 * (21.1 - t) * (1 - Math.exp(-.115 * h));
  let m;
  if (mo > ed) { const ko = .424 * (1 - (h / 100) ** 1.7) + .0694 * Math.sqrt(w) * (1 - (h / 100) ** 8); m = ed + (mo - ed) * 10 ** (-ko * .581 * Math.exp(.0365 * t)); }
  else { const ew = .618 * h ** .753 + 10 * Math.exp((h - 100) / 10) + .18 * (21.1 - t) * (1 - Math.exp(-.115 * h));
    if (mo < ew) { const k1 = .424 * (1 - ((100 - h) / 100) ** 1.7) + .0694 * Math.sqrt(w) * (1 - ((100 - h) / 100) ** 8); m = ew - (ew - mo) * 10 ** (-k1 * .581 * Math.exp(.0365 * t)); } else m = mo; }
  return Math.min(Math.max(59.5 * (250 - m) / (147.2 + m), 0), 101);
}
function dmcH(d0, t, h, r) {
  t = Math.max(t, -1.1); const rk = 1.894 * (t + 1.1) * (100 - h) * LE * 1e-4; let pr = d0;
  if (r > 1.5) { const rw = .92 * r - 1.27, wmi = 20 + 280 / Math.exp(.023 * d0), b = d0 <= 33 ? 100 / (.5 + .3 * d0) : d0 <= 65 ? 14 - 1.3 * Math.log(d0) : 6.2 * Math.log(d0) - 17.2;
    const wmr = wmi + 1000 * rw / (48.77 + b * rw); pr = 43.43 * (5.6348 - Math.log(wmr - 20)); }
  return Math.max(Math.max(pr, 0) + rk, 0);
}
function dcH(c0, t, r) {
  t = Math.max(t, -2.8); const pe = Math.max((.36 * (t + 2.8) + LF) / 2, 0); let dr = c0;
  if (r > 2.8) { const rw = .83 * r - 1.27, smi = 800 * Math.exp(-c0 / 400); dr = Math.max(c0 - 400 * Math.log(1 + 3.937 * rw / smi), 0); }
  return dr + pe;
}
const isiD = (f, w) => { const fm = 147.2 * (101 - f) / (59.5 + f); return 19.115 * Math.exp(-.1386 * fm) * (1 + fm ** 5.31 / 4.93e7) * Math.exp(.05039 * w); };
const buiD = (d, c) => d === 0 && c === 0 ? 0 : Math.max(d <= .4 * c ? .8 * c * d / (d + .4 * c) : d - (1 - .8 * c / (d + .4 * c)) * (.92 + (.0114 * d) ** 1.7), 0);
const fwiD = (i, b) => { const bb = b <= 80 ? .1 * i * (.626 * b ** .809 + 2) : .1 * i * (1000 / (25 + 108.64 * Math.exp(-.023 * b))); return bb <= 1 ? bb : Math.exp(2.72 * (.434 * Math.log(bb)) ** .647); };
/* FFMC per jam (port hffmc di index.html / fitur.py) */
function hffmc(F, T, H, W, R) {
  let mo = Math.max(0, 147.27723 * (101 - F) / (59.5 + F));
  if (R > 0) { const m0 = mo; mo += 42.5 * R * Math.exp(-100 / (251 - m0)) * (1 - Math.exp(-6.93 / R)); if (m0 > 150) mo += .0015 * (m0 - 150) ** 2 * Math.sqrt(R); mo = Math.min(250, mo); }
  const e = 1 - Math.exp(-.115 * H), ed = .942 * H ** .679 + 11 * Math.exp((H - 100) / 10) + .18 * (21.1 - T) * e, ew = .618 * H ** .753 + 10 * Math.exp((H - 100) / 10) + .18 * (21.1 - T) * e;
  const k = a => (.424 * (1 - a ** 1.7) + .0694 * Math.sqrt(W) * (1 - a ** 8)) * .0579 * Math.exp(.0365 * T);
  const m = mo > ed ? ed + (mo - ed) * 10 ** -k(H / 100) : mo < ew ? ew - (ew - mo) * 10 ** -k((100 - H) / 100) : mo;
  return Math.max(0, Math.min(101, 59.5 * (250 - m) / (147.27723 + m)));
}
const fFF = F => { const m = 147.27723 * (101 - F) / (59.5 + F); return 91.9 * Math.exp(-.1386 * m) * (1 + m ** 5.31 / 4.93e7); };
const fWI = W => W > 40 ? 12 * (1 - Math.exp(-.0818 * (W - 28))) : Math.exp(.05039 * W);
const isih = (F, W) => .208 * fWI(W) * fFF(F);

/* ---------------- cuaca per jam ---------------- */
/* C = {m0: ms UTC jam pertama (00:00 UTC), tc, rh, hujan, ws, wd} (km/jam, derajat asal angin) */
function Cuaca(C, lon) {
  const n = C.ws.length, isi = (xs, b) => { let last = null; return xs.map(x => (last = x ?? last) ?? b); };
  const W = {m0: C.m0, lon, n, tc: isi(C.tc, 28), rh: isi(C.rh, 80), hujan: isi(C.hujan, 0), ws: isi(C.ws, 5), wd: isi(C.wd, 0), cache: new Map()};
  W.jam = t => Math.floor((t - W.m0) / 36e5);
  W.cukup = (t, maju = 72) => { const i = W.jam(t); return i - 30 * 24 - 24 >= 0 && i + maju <= n; };
  W.kode = i => {
    const hari = Math.floor(i / 24); let dd = W.cache.get(hari);
    if (!dd) {
      /* jam siang setempat dari pusat sel 0,5 derajat (sama dengan data latih: seri cuaca per sel 0,5 derajat) */
      const lo5 = Math.floor(lon / .5) * .5 + .25, siang = ((Math.round(12 - lo5 / 15)) % 24 + 24) % 24; let f = 85, d = 6, c = 15, r;
      for (let h = hari - 30; h < hari; h++) { const j = h * 24 + siang; let hj = 0; for (let q = Math.max(0, j - 23); q <= j; q++) hj += W.hujan[q];
        const t = W.tc[j], rh = Math.min(Math.max(W.rh[j], 0), 100), w = W.ws[j];
        f = ffmcH(f, t, rh, w, hj); d = dmcH(d, t, rh, hj); c = dcH(c, t, hj); const ii = isiD(f, w), bb = buiD(d, c); r = {f, d, c, b: bb, fw: fwiD(ii, bb)}; }
      let Fh = r.f; for (let j = (hari - 1) * 24 + siang + 1; j < hari * 24; j++) Fh = hffmc(Fh, W.tc[j], W.rh[j], W.ws[j], W.hujan[j]);
      dd = [Fh, r.d, r.c, r.b, r.fw]; W.cache.set(hari, dd);
    }
    let Fh = dd[0]; for (let j = hari * 24; j <= i; j++) Fh = hffmc(Fh, W.tc[j], W.rh[j], W.ws[j], W.hujan[j]);
    return [Fh, dd[1], dd[2], dd[3], dd[4]];
  };
  W.jendela = t => {
    const i = W.jam(t), [Fh, dmc, dc, bui, fw] = W.kode(i);
    let u = 0, v = 0, wsum = 0, wmax = 0, rhmin = 1e9, tmax = -1e9, h24 = 0, h72 = 0, F2 = Fh, isimax = 0;
    for (let j = i; j < i + 24; j++) { const w = W.ws[j]; u += w * Math.sin(W.wd[j] * rad); v += w * Math.cos(W.wd[j] * rad); wsum += w; wmax = Math.max(wmax, w);
      rhmin = Math.min(rhmin, W.rh[j]); tmax = Math.max(tmax, W.tc[j]); h24 += W.hujan[j]; F2 = hffmc(F2, W.tc[j], W.rh[j], W.ws[j], W.hujan[j]); isimax = Math.max(isimax, isih(F2, W.ws[j])); }
    for (let j = Math.max(0, i - 72); j < i; j++) h72 += W.hujan[j];
    let kering = 0;
    for (let h = 1; h <= 30; h++) { let s = 0; for (let j = Math.max(0, i - 24 * h); j < i - 24 * (h - 1); j++) s += W.hujan[j]; if (s >= 1) break; kering = h; }
    const dari = (Math.atan2(u / 24, v / 24) / rad + 360) % 360;
    return {ws: wsum / 24, ws_maks: wmax, ke: (dari + 180) % 360, rh_min: rhmin, t_maks: tmax, hujan24: h24, hujan72: h72, hari_kering: kering,
      ffmc: Fh, dmc, dc, bui, isi_maks: isimax, fwi: fw};
  };
  /* ISI per jam (untuk membagi luas harian ke jam) */
  W.isiJam = (t, jam) => { const i = W.jam(t); let F = W.kode(i)[0]; const out = []; for (let j = i; j < i + jam; j++) { F = hffmc(F, W.tc[j], W.rh[j], W.ws[j], W.hujan[j]); out.push(isih(F, W.ws[j])); } return out; };
  return W;
}

/* ---------------- lahan & konteks ---------------- */
const HUTAN = new Set(["HK", "THR", "HL", "KSA", "KPA"]), PRODUKSI = new Set(["HP", "HPT", "HPK"]);
function indeksPoligon(fc, box) {
  const idx = [];
  for (const f of fc?.features || []) { const g = f.geometry; if (!g) continue;
    const P = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of P) { const r = poly[0]; let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of r) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; }
      if (c < box[0] || a > box[2] || d < box[1] || b > box[3]) continue; idx.push([a, b, c, d, r, f.properties || {}]); } }
  return (x, y) => { for (const [a, b, c, d, r, p] of idx) { if (x < a || x > c || y < b || y > d) continue; let ins = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; }
    if (ins) return p; } return null; };
}
/* L = {gambut, kawasan, konsesi (GeoJSON), kanal (kanal.json), jalan (jalan.geojson), desa (osm/desa.json), riwayat (riwayat_grid.json), penduduk (penduduk.json)} */
function Lahan(L, lon, lat, rDeg = .6) {
  const box = [lon - rDeg, lat - rDeg, lon + rDeg, lat + rDeg];
  const gb = indeksPoligon(L.gambut, box), kw = indeksPoligon(L.kawasan, box), ks = indeksPoligon(L.konsesi, box);
  const kanal = new Map(); if (L.kanal) for (const [a, b, km] of L.kanal.grid) if (Math.abs(a - lat) < rDeg + .1 && Math.abs(b - lon) < rDeg + .1) kanal.set(Math.floor(a / L.kanal.sel) + "," + Math.floor(b / L.kanal.sel), km);
  const jalan = new Map(), J = .05;
  for (const f of L.jalan?.features || []) for (const ln of f.geometry.coordinates) for (let q = 0; q + 1 < ln.length; q++) {
    const [x1, y1] = ln[q], [x2, y2] = ln[q + 1]; if (Math.max(x1, x2) < box[0] - .2 || Math.min(x1, x2) > box[2] + .2 || Math.max(y1, y2) < box[1] - .2 || Math.min(y1, y2) > box[3] + .2) continue;
    const n = Math.max(1, Math.floor(jarakM(x1, y1, x2, y2) / 300));
    for (let s = 0; s <= n; s++) { const x = x1 + (x2 - x1) * s / n, y = y1 + (y2 - y1) * s / n, k = Math.floor(x / J) + "," + Math.floor(y / J); (jalan.get(k) || jalan.set(k, []).get(k)).push([x, y]); } }
  const desa = new Map(), daftarDesa = [];
  for (const daf of Object.values(L.desa || {})) for (const [la, lo, kode, nama] of daf) { if (Math.abs(la - lat) > rDeg + .2 || Math.abs(lo - lon) > rDeg + .2) continue;
    const k = Math.floor(lo / J) + "," + Math.floor(la / J); (desa.get(k) || desa.set(k, []).get(k)).push([lo, la]); daftarDesa.push({nama, kode, lon: lo, lat: la}); }
  const rg = new Map(); if (L.riwayat) for (const [a, b, f] of L.riwayat.sel_data) rg.set(a + "," + b, f);
  const cache = new Map();
  const jarakJalan = (x, y) => { const gx = Math.floor(x / J), gy = Math.floor(y / J); let best = 1e4;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const [a, b] of jalan.get((gx + dx) + "," + (gy + dy)) || []) best = Math.min(best, jarakM(x, y, a, b));
    if (best >= 5000) for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.abs(dx) === 2 || Math.abs(dy) === 2) for (const [a, b] of jalan.get((gx + dx) + "," + (gy + dy)) || []) best = Math.min(best, jarakM(x, y, a, b));
    return best; };
  const jarakDesa = (x, y) => { const gx = Math.floor(x / J), gy = Math.floor(y / J); let best = 15;
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (const [a, b] of desa.get((gx + dx) + "," + (gy + dy)) || []) best = Math.min(best, Math.hypot((a - x) * 111.32 * Math.cos(y * rad), (b - y) * 110.57));
    return best; };
  return {
    daftarDesa, penduduk: L.penduduk,
    sel(k) { let r = cache.get(k); if (r) return r; const [x, y] = pusat(k);
      const kwp = kw(x, y) || {}, ksp = ks(x, y) || {};
      r = {gambut: gb(x, y) ? 1 : 0, hutan: HUTAN.has(kwp.fungsi) ? 1 : 0, semak: PRODUKSI.has(kwp.fungsi) || ksp.jenis === "hph" ? 1 : 0, kebun: ksp.jenis === "sawit" ? 1 : 0,
        kanal_km: L.kanal ? kanal.get(Math.floor(y / L.kanal.sel) + "," + Math.floor(x / L.kanal.sel)) || 0 : 0, jalan_km: jarakJalan(x, y) / 1000, desa_km: jarakDesa(x, y),
        riwayat_f: L.riwayat ? rg.get(Math.trunc((x - L.riwayat.x0) / .1) + "," + Math.trunc((L.riwayat.y1 - y) / .1)) || 0 : 0,
        lindung: kwp.fungsi && (HUTAN.has(kwp.fungsi)) ? 1 : 0};
      cache.set(k, r); return r; },
  };
}

/* ---------------- model ---------------- */
function nilaiPohon(s, x) { let k = 0; while (s[k].length > 1) { const [f, a, l, r] = s[k]; k = x[f] <= a ? l : r; } return s[k][0]; }
function prediksi(M, x) { let z = M.bias; for (const s of M.pohon) z += nilaiPohon(s, x); return 1 / (1 + Math.exp(-z)); }
function indeksIklim(tabel, d) { let th = d.getUTCFullYear(), bl = d.getUTCMonth() + 1;
  for (let q = 0; q <= 6; q++) { const v = tabel?.[`${th}-${String(bl).padStart(2, "0")}`]; if (v != null) return v; if (--bl < 1) { bl = 12; th--; } } return 0; }
/* acak berbiji (mulberry32) supaya hasil bisa diulang */
const acak = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

function calon(terbakar, aktif, R) {
  const out = new Map();
  for (const a of aktif.keys()) { const [ai, aj] = ij(a);
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) { const k = (aj + dj) * NX + ai + di; if (terbakar.has(k)) continue;
      const d = Math.hypot(di, dj), o = out.get(k); if (!o || d < o[0] || (d === o[0] && a < o[1])) out.set(k, [d, a]); } }
  return out;
}
function vektor(M, k, [d, a], terbakar, aktif, w, ev, lh) {
  const [ki, kj] = ij(k), [ai, aj] = ij(a);
  let b8 = 0, a24 = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (terbakar.has((kj + dj) * NX + ki + di)) b8++;
  for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) if (aktif.has((kj + dj) * NX + ki + di)) a24++;
  const br = Math.atan2(ki - ai, kj - aj), se = d > 0 ? Math.cos(br - w.ke * rad) : 0, s = lh.sel(k);
  const v = {jarak_m: d * 375, tetangga8: b8, aktif24: a24, searah: se, angin_searah: se * w.ws, ...w, ...ev, ...s};
  return M.fitur.map(f => v[f]);
}

/* ---------------- ramalan ---------------- */
/* o = {model, lat, lon, waktu (Date/ms, saat titik terlihat), cuaca (Cuaca mentah), lahan (objek L), sel0 (opsional: kunci sel awal), frp (MW, opsional),
        mc = 40, seed = 1, hari = 3}  -> hasil (lihat akhir fungsi) */
function ramal(o) {
  const M = o.model;
  if (!M || !Array.isArray(M.pohon) || !Array.isArray(M.fitur)) throw new Error("model tidak sah");
  const lat = +o.lat, lon = +o.lon, t0 = +new Date(o.waktu);
  if (!isFinite(lat) || !isFinite(lon) || lat < -11.5 || lat > 6.5 || lon < 94.5 || lon > 141.5) throw new Error("koordinat di luar Indonesia");
  if (!isFinite(t0)) throw new Error("waktu tidak sah");
  const hari = o.hari ?? 3, nmc = Math.max(0, Math.min(200, o.mc ?? 40));
  if (!(hari >= 1 && hari <= 3)) throw new Error("hari harus 1-3");
  if (!o.cuaca || !Array.isArray(o.cuaca.ws)) throw new Error("cuaca per jam wajib");
  const W = Cuaca(o.cuaca, lon);
  if (!W.cukup(t0, hari * 24)) throw new Error("seri cuaca harus mencakup 31 hari sebelum dan " + hari * 24 + " jam sesudah waktu titik");
  const lh = Lahan(o.lahan || {}, lon, lat), R = M.R || 5;
  const sel0 = o.sel0?.length ? o.sel0 : [sel(lon, lat)];
  const tb0 = new Set(sel0), ak0 = new Map(sel0.map(k => [k, t0]));
  const iklim = {oni: indeksIklim(M.iklim?.oni, new Date(t0)), dmi: indeksIklim(M.iklim?.dmi, new Date(t0))};
  /* FRP maks (MW) titik awal; tidak diketahui -> median deteksi pertama di data latih */
  const frp = o.frp != null ? +o.frp : (M.frp_bawaan ?? 8);
  if (!(frp >= 0 && frp < 1e5)) throw new Error("FRP tidak sah");
  const jendela = [...Array(hari)].map((_, d) => W.jendela(t0 + d * 864e5));
  const jalan = (rnd, catat) => {
    const tb = new Set(tb0), baru = new Set(); let ak = new Map(ak0), b24 = sel0.length; const luas = [];
    for (let d = 0; d < hari; d++) {
      const t = t0 + d * 864e5, w = jendela[d], jl = ((t / 6e4 + lon * 4) / 60 % 24 + 24) % 24;
      const ev = {log_luas: Math.log(tb.size + baru.size), log_baru24: Math.log1p(b24), umur_jam: (t - t0) / 36e5, log_frp: Math.log1p(frp), ...iklim, malam: jl >= 6 && jl < 18 ? 0 : 1};
      const semua = new Set([...tb, ...baru]), c = calon(semua, ak, R), nb = [];
      for (const [k, info] of c) { const p = prediksi(M, vektor(M, k, info, semua, ak, w, ev, lh)); if (catat) catat(d, k, p); if (rnd ? rnd() < p : p >= M.tau) nb.push(k); }
      for (const k of nb) baru.add(k);
      if (nb.length) ak = new Map(nb.map(k => [k, t + 864e5]));
      b24 = nb.length; luas.push(baru.size);
    }
    return {baru, luas};
  };
  /* deterministik (p >= tau) + peluang hari-1 tiap sel */
  const p1 = new Map(), det = jalan(null, (d, k, p) => { if (d === 0) p1.set(k, p); });
  const frek = new Map(), runs = [], rnd = acak(o.seed ?? 1);
  for (let r = 0; r < nmc; r++) {
    const tiba = new Map(), res = jalan(rnd, null);
    /* hari tiba per sel: urutan masuk ke 'baru' mengikuti hari */
    let i = 0, batas = res.luas; for (const k of res.baru) { const d = batas.findIndex(n => i < n); tiba.set(k, d); i++; }
    for (const [k, d] of tiba) { const f = frek.get(k) || new Array(hari).fill(0); for (let q = d; q < hari; q++) f[q]++; frek.set(k, f); }
    runs.push(res.luas.map(n => n + sel0.length));
  }
  const q = (xs, a) => { const s = [...xs].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(a * s.length))]; };
  const luas = [...Array(hari)].map((_, d) => { const xs = runs.map(r => r[d] * HA); return nmc ? {p10: q(xs, .1), p50: q(xs, .5), p90: q(xs, .9), rata: xs.reduce((a, b) => a + b, 0) / xs.length} : null; });
  const sel_ = [...frek].map(([k, f]) => { const [x, y] = pusat(k); return {k, lon: x, lat: y, p: f.map(v => v / nmc)}; });
  /* arah utama = pusat berbobot peluang hari terakhir relatif titik awal */
  let sx = 0, sy = 0, sw = 0; for (const s of sel_) { const w = s.p[hari - 1]; sx += w * (s.lon - lon); sy += w * (s.lat - lat); sw += w; }
  const arahUtama = sw > 0 ? {deg: Math.round(arah(lon, lat, lon + sx / sw, lat + sy / sw)), km: Math.round(jarakM(lon, lat, lon + sx / sw, lat + sy / sw)) / 1000} : null;
  /* luas harapan per jam: bagi pertambahan harian menurut ISI per jam */
  const isi = W.isiJam(t0, hari * 24), perJam = [sel0.length * HA];
  for (let d = 0; d < hari; d++) { const a = d ? luas[d - 1]?.rata ?? 0 : sel0.length * HA, b = luas[d]?.rata ?? a, seg = isi.slice(d * 24, d * 24 + 24), tot = seg.reduce((x, y) => x + y, 0) || 1;
    let c = 0; for (let h = 0; h < 24; h++) { c += seg[h]; perJam.push(a + (b - a) * c / tot); } }
  /* apa yang terkena (peluang hari terakhir >= 0,1) */
  const kena = dampak(sel_, lh, hari, lon, lat);
  return {waktu: new Date(t0).toISOString(), sel0, cuaca: jendela.map(w => ({ws: +w.ws.toFixed(1), ke: Math.round(w.ke), rh_min: Math.round(w.rh_min), hujan24: +w.hujan24.toFixed(1), ffmc: +w.ffmc.toFixed(1), dc: Math.round(w.dc), fwi: +w.fwi.toFixed(1)})),
    p_lepas: nmc ? kalLepas(M, runs.filter(r => r[hari - 1] >= (M.lepas_sel || 10)).length / nmc) : null, luas, luasJam: perJam, arah: arahUtama, sel: sel_,
    p1: [...p1].map(([k, p]) => ({k, p})), deterministik: [...det.baru], kena, n_mc: nmc, iklim};
}

/* peluang lolos Monte Carlo dikalibrasi (Platt, titik awal validasi 2023) */
function kalLepas(M, p) { const K = M.kal_lepas; if (!K) return p; const q = Math.min(Math.max(p, .01), .99), z = Math.log(q / (1 - q));
  return 1 / (1 + Math.exp(-(K.b[0] + K.b[1] * (z - K.mu[0]) / K.sd[0]))); }

function dampak(sel_, lh, hari, lon, lat) {
  const kena = sel_.filter(s => s.p[hari - 1] >= .1);
  let gambut = 0, lindung = 0, jalan = 0, harap = 0;
  for (const s of sel_) { const a = lh.sel(s.k), p = s.p[hari - 1]; harap += p * HA; gambut += p * HA * a.gambut; lindung += p * HA * a.lindung; if (a.jalan_km < .375) jalan += p; }
  const desa = [];
  for (const d of lh.daftarDesa) { const k = sel(d.lon, d.lat); let best = 0, eta = null;
    for (const s of kena) { const [i1, j1] = ij(s.k), [i2, j2] = ij(k); if (Math.abs(i1 - i2) <= 2 && Math.abs(j1 - j2) <= 2) { const p = s.p[hari - 1]; if (p > best) { best = p; eta = s.p.findIndex(v => v >= .1); } } }
    if (best > 0) desa.push({nama: d.nama, kode: d.kode, p: +best.toFixed(2), hari: eta + 1, km: Math.round(jarakM(lon, lat, d.lon, d.lat) / 100) / 10}); }
  desa.sort((a, b) => b.p - a.p);
  /* penduduk terpapar: kepadatan sel 0,25 derajat x luas harapan (kasar: WorldPop 1 km dirata-rata 0,25 derajat) */
  let jiwa = null; const P = lh.penduduk;
  if (P?.grid) { jiwa = 0; const pad = new Map(); for (const [la, lo, n] of P.grid) { const k = la + "," + lo; pad.set(k, (pad.get(k) || 0) + n); }
    const kot = P.sel || .25, luasSel = (la) => (kot * 111.32) * (kot * 111.32 * Math.cos(la * rad)) * 100; /* ha */
    for (const s of sel_) { const la = Math.floor(s.lat / kot) * kot + kot / 2, lo = Math.floor(s.lon / kot) * kot + kot / 2, n = pad.get(la + "," + lo) || 0; jiwa += s.p[hari - 1] * HA * n / luasSel(la); }
    jiwa = Math.round(jiwa); }
  return {ha_harapan: Math.round(harap), gambut_ha: Math.round(gambut), lindung_ha: Math.round(lindung), sel_jalan: Math.round(jalan), desa: desa.slice(0, 30), jiwa};
}

/* ---------------- pembantu ---------------- */
async function muat(url = "data/model_sebaran.json") { const r = await fetch(url); if (!r.ok) throw new Error("model tidak termuat: " + r.status); return r.json(); }
/* Open-Meteo forecast: 40 hari lalu + 4 hari ke depan per jam, UTC (masa panas FWI butuh 31 hari sebelum waktu titik) */
async function cuaca(lat, lon) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m&past_days=40&forecast_days=4&timezone=GMT&wind_speed_unit=kmh`;
  const r = await fetch(u); if (!r.ok) throw new Error("cuaca gagal: " + r.status); const h = (await r.json()).hourly;
  return {m0: Date.parse(h.time[0] + "Z"), tc: h.temperature_2m, rh: h.relative_humidity_2m, hujan: h.precipitation, ws: h.wind_speed_10m, wd: h.wind_direction_10m};
}

/* cuaca untuk tanggal mana pun: <= 8 hari lalu s.d. +2 hari pakai forecast (past_days=40); lebih lama pakai arsip ERA5 */
async function cuacaTanggal(lat, lon, waktu) {
  const t = +new Date(waktu), kini = Date.now();
  if (!isFinite(t)) throw new Error("waktu tidak sah");
  if (t > kini + 2 * 864e5) throw new Error("prakiraan hanya sampai 2 hari ke depan");
  if (t >= kini - 8 * 864e5) return cuaca(lat, lon);
  const a = new Date(t - 32 * 864e5).toISOString().slice(0, 10), b = new Date(t + 4 * 864e5).toISOString().slice(0, 10);
  const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m&start_date=${a}&end_date=${b}&timezone=GMT&wind_speed_unit=kmh`;
  const r = await fetch(u); if (!r.ok) throw new Error("arsip cuaca gagal: " + r.status); const h = (await r.json()).hourly;
  return {m0: Date.parse(h.time[0] + "Z"), tc: h.temperature_2m, rh: h.relative_humidity_2m, hujan: h.precipitation, ws: h.wind_speed_10m, wd: h.wind_direction_10m};
}

G.SebaranModel = {muat, cuaca, cuacaTanggal, ramal, Cuaca, Lahan, prediksi, calon, vektor, sel, pusat, ij, versi: 1};
if (typeof module !== "undefined") module.exports = G.SebaranModel;
})(typeof window !== "undefined" ? window : globalThis);
