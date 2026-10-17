/* sim_adegan.js — "Adegan": tampilan 3D bergaya mesin game untuk mode forensik tab Simulasi (three.js 0.169, dimuat malas dari CDN
   hanya saat Adegan dibuka). Kanvas menutup #simPeta; MapLibre tetap hidup di bawahnya untuk 2D & panel.
   Semua data dari hasil Sim (H.T jam tiba per sel, Sim.fuelDasar, K.air, H.W cuaca); modul ini tidak mengubah mesin sebar.
   Bagian atas = logika murni (tanpa DOM/WebGL, diekspor untuk smoke); bagian bawah = runtime peramban. */

/* ====================== 1. LOGIKA MURNI ====================== */
export const LEBAR_M = 24000, G = 256, ZUBIN = 12, BATAS_POHON = [0, 3, 12]; /* jam sesudah terbakar: 0 = membara (3 jam), 3 = arang hitam (sampai 12), 12 = abu-abu */
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const klem = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const t = klem((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const h2 = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function noise2(x, y) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return mix(mix(h2(xi, yi), h2(xi + 1, yi), u), mix(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v); }

/* "30 Okt 13.00" WIB (UTC+7, tanpa DST) */
export function fmtWaktu(d) { const q = new Date(d.getTime() + 7 * 36e5), p = n => String(n).padStart(2, "0"); return `${q.getUTCDate()} ${BLN[q.getUTCMonth()]} ${p(q.getUTCHours())}.${p(q.getUTCMinutes())}`; }

/* kotak adegan dalam indeks sel kisi: seluruh kisi, atau dipotong ke LEBAR_M di sekitar benih (pusat = rata-rata benih, dijepit ke kisi) */
export function ventana(K, maks = LEBAR_M) {
  const n = K.n, w = Math.min(n, Math.ceil(maks / K.d)), B = K.benih || []; let si = 0, sj = 0;
  for (const k of B) { si += k % n; sj += (k / n) | 0; }
  const ci = B.length ? si / B.length : n / 2, cj = B.length ? sj / B.length : n / 2;
  return {w, d: K.d, n, i0: klem(Math.round(ci - w / 2), 0, n - w), j0: klem(Math.round(cj - w / 2), 0, n - w)};
}
export function potong(arr, vt, Tipe = Uint8Array) { /* nilai kisi n×n -> larik w×w (baris j ke utara) */
  const o = new Tipe(vt.w * vt.w); for (let b = 0; b < vt.w; b++) for (let a = 0; a < vt.w; a++) o[b * vt.w + a] = arr[(vt.j0 + b) * vt.n + vt.i0 + a]; return o;
}
/* lon/lat -> koordinat dunia (x timur, z = -utara, meter, pusat kotak = 0,0) */
export function keDunia(K, vt, lon, lat) {
  const cx = (lon - K.x0) / (K.x1 - K.x0) * K.n, cy = (lat - K.y0) / (K.y1 - K.y0) * K.n;
  return {x: (cx - vt.i0 - vt.w / 2) * vt.d, z: -((cy - vt.j0 - vt.w / 2) * vt.d)};
}
export const selDunia = (vt, a, b) => ({x: (a + .5 - vt.w / 2) * vt.d, z: -((b + .5 - vt.w / 2) * vt.d)});

/* ---- ketinggian: tile Terrarium (tiles = Map "x,y" -> ImageData) disampel bilinear sinkron ---- */
export function sampelTerrarium(tiles, z, lon, lat) {
  const n = 2 ** z, r = lat * Math.PI / 180, fx = (lon + 180) / 360 * n * 256 - .5, fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * 256 - .5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const px = (X, Y) => { const im = tiles.get(`${Math.floor(X / 256)},${Math.floor(Y / 256)}`); if (!im) return NaN; const o = ((Y & 255) * 256 + (X & 255)) * 4, d = im.data; return d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768; };
  return mix(mix(px(x0, y0), px(x0 + 1, y0), tx), mix(px(x0, y0 + 1), px(x0 + 1, y0 + 1), tx), ty);
}
export function ubinDiperlukan(K, vt, z = ZUBIN) {
  const n = 2 ** z, f = (lon, lat) => { const r = lat * Math.PI / 180; return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)]; };
  const lo = (c) => K.x0 + c / K.n * (K.x1 - K.x0), la = (c) => K.y0 + c / K.n * (K.y1 - K.y0);
  const a = f(lo(vt.i0), la(vt.j0)), b = f(lo(vt.i0 + vt.w), la(vt.j0 + vt.w)), out = [];
  for (let x = Math.min(a[0], b[0]) - 0; x <= Math.max(a[0], b[0]); x++) for (let y = Math.min(a[1], b[1]); y <= Math.max(a[1], b[1]); y++) out.push([z, x, y]);
  return out;
}

/* ---- kelas lahan per sel (id = indeks FUEL 1..6 diperluas): 0 air, 1 gambut, 2 rumput, 3 sabana, 4 semak, 5 hutan lebat, 6 kebun, 7 sawit, 8 HTI, 9 tambang, 10 hutan jarang (HP/HPT/HPK/HPH), 11 hutan hilang (GFW) ---- */
export function gabungKelas(w, L) {
  const N = w * w, o = new Uint8Array(N);
  for (let c = 0; c < N; c++) { let k;
    if (L.air?.[c]) k = 0; else if (L.tambang?.[c]) k = 9; else if (L.sawit?.[c]) k = 7; else if (L.hti?.[c]) k = 8; else if (L.gb?.[c]) k = 1;
    else if (L.lebat?.[c]) k = 5; else if (L.jarang?.[c]) k = 10; else if (L.lcWet?.[c]) k = 1; else if (L.lcWood?.[c]) k = 5; else if (L.lcFarm?.[c] || L.lcGrass?.[c]) k = 2;
    else { const f = L.fuel?.[c] || 4; k = f === 6 ? 7 : f; }
    if (L.hilang?.[c] && (k === 5 || k === 10 || k === 4)) k = 11;
    o[c] = k; }
  return o;
}

/* ---- warna medan: palet kering ala FireTrace + lahan nyata. Hasil linear 0..1 ---- */
const PAL = {air: [74, 111, 138], pasir: [217, 199, 155], krem: [196, 176, 130]};
const DASAR = [PAL.air, [104, 112, 66], [205, 186, 128], [214, 194, 140], [111, 122, 62], [47, 74, 42], [128, 132, 70], [118, 120, 70], [92, 108, 62], [184, 128, 78], [70, 98, 50], [168, 150, 112]];
const KERING = [0, .1, 1, 1, .8, .5, .7, .6, .5, .9, .7, 1]; /* seberapa mudah lereng jadi pasir kering; gambut tetap cokelat basah */
const lin = c => Math.pow(c / 255, 2.2);
export function warnaVertex(f, lereng, tinggi, n1 = .5, n2 = .5) {
  let b = DASAR[f] || DASAR[3];
  if (!f) return [lin(b[0] * (.92 + .16 * n1)), lin(b[1] * (.92 + .16 * n1)), lin(b[2] * (.92 + .16 * n1))];
  if (f === 1 && n2 > .82) b = [50, 62, 60]; /* genangan kecil di gambut */
  if (f === 9 && Math.floor(tinggi * 60) % 2) b = [140, 134, 126]; /* tambang bertingkat: jenjang oranye/abu */
  const kc = [mix(PAL.pasir[0], PAL.krem[0], n2), mix(PAL.pasir[1], PAL.krem[1], n2), mix(PAL.pasir[2], PAL.krem[2], n2)];
  const k = klem(ss(.08, .36, lereng) * KERING[f] + (f === 1 ? 0 : (n2 - .5) * .22 + tinggi * .14)), br = .86 + .28 * n1;
  return [0, 1, 2].map(i => lin(mix(b[i], kc[i], k) * br));
}

/* ---- pohon: lima tipe. 0 konifer (hutan alam), 1 semak, 2 sawit, 3 akasia/HTI, 4 tunggul (gambut). Sawit & HTI = kisi segitiga rapi dengan
   celah jalan kebun; tipe lain acak per sel. Jarak kisi dibesarkan secara visual (anggaran pohon terbatas), bukan 9 m nyata. ---- */
const DENS = [0, .75, .1, .06, .8, 1.7, 1, 1, 1, 0, .85, .08], LAT = {6: 2, 7: 2, 8: 3};
const MIX = {1: [[1, .72], [3, .16], [4, .12]], 2: [[1, 1]], 3: [[1, 1]], 4: [[1, .75], [0, .25]], 5: [[0, .88], [1, .12]], 10: [[0, .6], [1, .4]], 11: [[1, 1]]};
export function sebarPohon(kelas, w, d, anggaran, seed = 1337, blok = null) {
  const R = mulberry32(seed), N = w * w, Wm = w * d; let W = 0; for (let c = 0; c < N; c++) W += DENS[kelas[c]] || 0;
  let nLat = 1; for (let c = 0; c < N; c++) if (LAT[kelas[c]] !== undefined) nLat++;
  const Ls = Array.from({length: 5}, () => ({c: [], x: [], z: [], s: [], y: []})), sp = {};
  const taruh = (t, c, x, z, s, y) => { if (blok && blok(x, z)) return; const l = Ls[t]; l.c.push(c); l.x.push(x); l.z.push(z); l.s.push(s); l.y.push(y); };
  if (W > 0) for (let c = 0; c < N; c++) { const k = kelas[c], dn = DENS[k] || 0; if (!dn) continue; const e = anggaran * dn / W, a = c % w, b = (c / w) | 0;
    if (LAT[k] !== undefined) { const s = sp[k] ||= klem(d / Math.sqrt(.866 * Math.max(e, Math.min(2.5, anggaran * .5 / nLat))), 14, 2 * d), rs = s * .866, x0 = a * d, x1 = x0 + d, z0 = b * d, z1 = z0 + d;
      for (let r = Math.ceil(z0 / rs); r < Math.ceil(z1 / rs); r++) { if (r % 14 === 0) continue; const off = (r & 1) * .5;
        for (let i = Math.ceil(x0 / s - off); i < Math.ceil(x1 / s - off); i++) { if ((((i % 26) + 26) % 26) === 0) continue;
          const jx = (h2(i * 7 + r, r * 13 + i) - .5) * s * .16, jz = (h2(r * 5 + 1, i * 3 + 9) - .5) * s * .16;
          taruh(LAT[k], c, (i + off) * s + jx - Wm / 2, -(r * rs + jz - Wm / 2), h2(i, r), h2(r + 3, i + 5) * 6.2832); } } continue; }
    let m = Math.floor(e); if (R() < e - m) m++; const mix_ = MIX[k] || [[1, 1]];
    for (let q = 0; q < m; q++) { let u = R(), t = mix_[mix_.length - 1][0]; for (const [tt, p] of mix_) { if (u < p) { t = tt; break; } u -= p; }
      taruh(t, c, (a + R() - w / 2) * d, -((b + R() - w / 2) * d), R(), R() * 6.2832); } }
  const off = [0]; for (const l of Ls) off.push(off[off.length - 1] + l.c.length); const n = off[5], o = {n, off, tipe: new Uint8Array(n), cell: new Uint32Array(n), x: new Float32Array(n), z: new Float32Array(n), s: new Float32Array(n), yaw: new Float32Array(n)};
  Ls.forEach((l, t) => { o.cell.set(l.c, off[t]); o.x.set(l.x, off[t]); o.z.set(l.z, off[t]); o.s.set(l.s, off[t]); o.yaw.set(l.y, off[t]); o.tipe.fill(t, off[t], off[t + 1]); });
  return o;
}
export function indeksSel(cell, nCell) { /* CSR: pohon milik sel c = list[start[c] .. start[c+1]) */
  const start = new Uint32Array(nCell + 1); for (let i = 0; i < cell.length; i++) start[cell[i] + 1]++;
  for (let c = 0; c < nCell; c++) start[c + 1] += start[c];
  const list = new Uint32Array(cell.length), pos = start.slice(0, nCell); for (let i = 0; i < cell.length; i++) list[pos[cell[i]]++] = i;
  return {start, list};
}
/* sel berurut menurut jam tiba (hanya yang <= 72): pencarian rentang tanpa menyapu semua sel */
export function urutT(Tw) {
  const idx = []; for (let c = 0; c < Tw.length; c++) if (Tw[c] <= 72) idx.push(c);
  idx.sort((p, q) => Tw[p] - Tw[q]); const sel = Uint32Array.from(idx), Ts = Float32Array.from(idx, c => Tw[c]); return {sel, Ts};
}
export function batas(Ts, v) { let lo = 0, hi = Ts.length; while (lo < hi) { const m = (lo + hi) >> 1; if (Ts[m] <= v) lo = m + 1; else hi = m; } return lo; } /* jumlah entri dengan T <= v */
export const keadaanPohon = (T, t) => T > t ? 0 : T > t - 3 ? 1 : T > t - 12 ? 2 : 3; /* 0 hidup, 1 kanopi membara, 2 batang arang, 3 abu */
/* sel yang keadaan pohonnya bisa berubah antara tLama dan tBaru: T di (a,b] pada ambang BATAS_POHON */
export function sentuh(urut, tLama, tBaru, fn) {
  const lo = Math.min(tLama, tBaru), hi = Math.max(tLama, tBaru); let n = 0; if (lo === hi) return 0;
  for (const th of BATAS_POHON) { const a = batas(urut.Ts, lo - th), b = batas(urut.Ts, hi - th); for (let q = a; q < b; q++) { fn(urut.sel[q]); n++; } }
  return n;
}
/* data tekstur api: R = T*mask, G = mask (mask 1 bila sel terbakar <= 72 jam). Interpolasi bilinear R/G = jam tiba tanpa bocor dari sel tak terbakar */
export function isiT(Tw, out) { for (let c = 0; c < Tw.length; c++) { const ok = Tw[c] <= 72; out[c * 2] = ok ? Tw[c] : 0; out[c * 2 + 1] = ok ? 1 : 0; } return out; }

/* ---- vektor lahan: poligon -> raster (pemindai garis), garis -> rintangan berhash ---- */
export function rasterRings(polys, n, W, mode = "sel") { /* polys: [[ring,...]], ring = [[x,z],...] dunia; even-odd per poligon; mode sel (pusat sel) | vert (titik sudut) */
  const o = new Uint8Array(n * n), pos = a => mode === "sel" ? ((a + .5) / n - .5) * W : (a / (n - 1) - .5) * W, inv = x => mode === "sel" ? (x / W + .5) * n - .5 : (x / W + .5) * (n - 1);
  for (const rings of polys) { let z0 = Infinity, z1 = -Infinity; for (const r of rings) for (const q of r) { if (q[1] < z0) z0 = q[1]; if (q[1] > z1) z1 = q[1]; }
    for (let b = Math.max(0, Math.floor(inv(-z1)) - 1); b <= Math.min(n - 1, Math.ceil(inv(-z0)) + 1); b++) { const zr = -pos(b), xs = [];
      for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const p = r[i], q = r[j]; if ((p[1] <= zr) !== (q[1] <= zr)) xs.push(p[0] + (zr - p[1]) * (q[0] - p[0]) / (q[1] - p[1])); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let a = Math.max(0, Math.ceil(inv(xs[k]))); a <= Math.min(n - 1, Math.floor(inv(xs[k + 1]))); a++) o[b * n + a] = 1; } }
  return o;
}
/* tipe garis: 0 sungai, 1 anak sungai, 2 kanal/parit, 3 jalan aspal, 4 jalan tanah. mask bit = 1 << tipe */
export const MASK_AIR = 7, MASK_JALAN = 24;
export function buatRintangan(garis, W, sel = 250) {
  const H = new Map(), segs = [], key = (i, j) => i * 100003 + j;
  for (const g of garis) { const p = g.p; for (let q = 0; q + 3 < p.length; q += 2) { segs.push([p[q], p[q + 1], p[q + 2], p[q + 3], g.lebar, g.tipe]); const id = segs.length - 1, r = g.lebar / 2 + sel * .5;
    const x0 = Math.min(p[q], p[q + 2]) - r, x1 = Math.max(p[q], p[q + 2]) + r, z0 = Math.min(p[q + 1], p[q + 3]) - r, z1 = Math.max(p[q + 1], p[q + 3]) + r;
    for (let i = Math.floor((x0 + W / 2) / sel); i <= Math.floor((x1 + W / 2) / sel); i++) for (let j = Math.floor((z0 + W / 2) / sel); j <= Math.floor((z1 + W / 2) / sel); j++) { const k = key(i, j), l = H.get(k); l ? l.push(id) : H.set(k, [id]); } } }
  /* jarak bersih (m) ke tepi garis terdekat bertipe dalam mask; Infinity bila jauh; negatif = di dalam lebar garis */
  const dekat = (x, z, mask = 15) => { const l = H.get(key(Math.floor((x + W / 2) / sel), Math.floor((z + W / 2) / sel))); let best = Infinity; if (!l) return best;
    for (const id of l) { const s = segs[id]; if (!(mask & (1 << s[5]))) continue; const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz, t = L2 ? klem(((x - s[0]) * dx + (z - s[1]) * dz) / L2) : 0, c = Math.hypot(x - s[0] - t * dx, z - s[1] - t * dz) - s[4] / 2; if (c < best) best = c; }
    return best; };
  return {dekat, n: segs.length};
}
export function resample(p, step) { /* p = [x,z,x,z,...] -> titik [[x,z]] berjarak <= step */
  const o = []; for (let q = 0; q + 1 < p.length; q += 2) { if (q === 0) { o.push([p[0], p[1]]); continue; } const a = o[o.length - 1], dx = p[q] - a[0], dz = p[q + 1] - a[1], m = Math.max(1, Math.ceil(Math.hypot(dx, dz) / step));
    for (let i = 1; i <= m; i++) o.push([a[0] + dx * i / m, a[1] + dz * i / m]); } return o;
}
const LEBAR_AIR = {river: [0, 36], stream: [1, 9], canal: [2, 14], ditch: [2, 7], drain: [2, 7]};
const LEBAR_JALAN = {motorway: [3, 12], trunk: [3, 11], primary: [3, 10], secondary: [3, 9], tertiary: [3, 8], minor: [3, 6], service: [3, 5], track: [4, 5], path: [4, 3]};
function garisDunia(geom, K, vt) { const ls = geom.type === "LineString" ? [geom.coordinates] : geom.type === "MultiLineString" ? geom.coordinates : []; return ls.map(l => l.flatMap(([lo, la]) => { const q = keDunia(K, vt, lo, la); return [q.x, q.z]; })); }
export function dalamKotak(p, lim) { /* potong polyline [x,z,...] di tepi kotak: kembalikan potongan yang seluruhnya di dalam (>= 2 titik) */
  const o = []; let run = []; for (let q = 0; q + 1 < p.length; q += 2) { if (Math.abs(p[q]) <= lim && Math.abs(p[q + 1]) <= lim) run.push(p[q], p[q + 1]); else { if (run.length >= 4) o.push(run); run = []; } } if (run.length >= 4) o.push(run); return o;
}
export function keGaris(feats, tabel, K, vt) { /* fitur OSM (waterway|transportation) -> [{p,lebar,tipe}] */
  const out = [], seen = new Set(); for (const f of feats || []) { const t = tabel[f.properties?.class]; if (!t || !f.geometry) continue;
    for (const p0 of garisDunia(f.geometry, K, vt)) for (const p of dalamKotak(p0, vt.w * vt.d / 2)) { const k = `${t[0]}|${p[0].toFixed(0)},${p[1].toFixed(0)}|${p.length}`; if (seen.has(k)) continue; seen.add(k); out.push({p, lebar: t[1], tipe: t[0]}); } }
  return out;
}
export const keGarisAir = (f, K, vt) => keGaris(f, LEBAR_AIR, K, vt), keGarisJalan = (f, K, vt) => keGaris(f, LEBAR_JALAN, K, vt);
export function keRings(feats, K, vt) { /* poligon OSM -> [[ring,...]] dunia */
  const out = []; for (const f of feats || []) { const g = f.geometry; if (!g) continue; const P = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of P) out.push(poly.map(r => r.map(([lo, la]) => { const q = keDunia(K, vt, lo, la); return [q.x, q.z]; }))); }
  return out;
}
/* cadangan bila tile OSM tidak termuat: jalan.geojson (k 1-3 jalan, 6 sungai) dan kanal sintetis dari grid kepadatan data/osm/kanal.json.
   PERKIRAAN: posisi kanal sintetis hanya mengikuti kepadatan km per sel 0,02°, bukan jaringan nyata. */
export function garisJalanGeojson(gj, K, vt, W) {
  const out = []; for (const f of gj?.features || []) { const k = f.properties?.k, tipe = k === 6 ? 0 : k >= 1 && k <= 3 ? 3 : -1; if (tipe < 0) continue;
    for (const p of garisDunia(f.geometry, K, vt)) { let run = []; for (let q = 0; q + 1 < p.length; q += 2) { if (Math.abs(p[q]) < W * .55 && Math.abs(p[q + 1]) < W * .55) run.push(p[q], p[q + 1]); else { if (run.length >= 4) out.push({p: run, lebar: tipe ? 9 : 30, tipe}); run = []; } }
      if (run.length >= 4) out.push({p: run, lebar: tipe ? 9 : 30, tipe}); } } return out;
}
export function kanalSintetis(grid, K, vt, W, sel = .02) {
  const out = [], kx = 111320 * Math.cos((K.y0 + K.y1) / 2 * Math.PI / 180), ky = 110574;
  for (const [la, lo, km] of grid || []) { const c = keDunia(K, vt, lo + sel / 2, la + sel / 2), sx = sel * kx, sz = sel * ky; if (Math.abs(c.x) > W / 2 + sx || Math.abs(c.z) > W / 2 + sz || km < .3) continue;
    const n = klem(Math.round(km / 2), 1, 6), ang = h2(Math.round(lo * 50), Math.round(la * 50)) > .5 ? .14 : Math.PI / 2 + .14, ux = Math.cos(ang), uz = Math.sin(ang), L = Math.min(sx, km / n * 1000 * 1.3);
    for (let q = 0; q < n; q++) { const o = (q + .5) / n - .5, cx = c.x + (-uz) * o * sx, cz = c.z + ux * o * sz; for (const p of dalamKotak([cx - ux * L / 2, cz - uz * L / 2, cx + ux * L / 2, cz + uz * L / 2], W / 2)) out.push({p, lebar: 10, tipe: 2}); } }
  return out;
}

/* ---- medan: ketinggian, air, kemiringan, warna vertex (semua larik, tanpa three) ---- */
export function hitungMedan({K, vt, fuelW, airW, airV, ukir, sampel, ex, g = G}) { /* fuelW = kelas lahan; airV = air poligon per titik; ukir(x,z) = kedalaman alur (m) */
  const W = vt.w * vt.d, N = g * g, Z = new Float32Array(N), step = W / (g - 1); let jml = 0, valid = 0;
  for (let b = 0; b < g; b++) for (let a = 0; a < g; a++) { const lon = K.x0 + (vt.i0 + a / (g - 1) * vt.w) / K.n * (K.x1 - K.x0), lat = K.y0 + (vt.j0 + b / (g - 1) * vt.w) / K.n * (K.y1 - K.y0), z = sampel(lon, lat);
    Z[b * g + a] = z; if (Number.isFinite(z)) { jml += z; valid++; } }
  const rata = valid ? jml / valid : 0; for (let i = 0; i < N; i++) if (!Number.isFinite(Z[i])) Z[i] = rata;
  const urut = Float32Array.from(Z).sort(), p5 = urut[Math.floor(N * .05)], p95 = urut[Math.floor(N * .95)], relief = Math.max(1, p95 - p5);
  if (!ex) ex = Math.round(klem(400 / relief, 1.5, 12) * 2) / 2;
  const zmin = urut[0], zmax = urut[N - 1], Y = new Float32Array(N), air = new Uint8Array(N), lereng = new Float32Array(N), warna = new Float32Array(N * 3), w = vt.w;
  /* air: bobot sel bertetangga (bilinear di pusat sel) */
  const bobot = (u, v) => { const cx = u * w - .5, cy = v * w - .5, i = Math.floor(cx), j = Math.floor(cy), fx = cx - i, fy = cy - j, o = [];
    for (const [di, dj, wt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) o.push([klem(j + dj, 0, w - 1) * w + klem(i + di, 0, w - 1), wt]); return o; };
  const nb = new Array(N); for (let b = 0; b < g; b++) for (let a = 0; a < g; a++) { const q = bobot(a / (g - 1), b / (g - 1)); nb[b * g + a] = q; let wa = 0; for (const [c, wt] of q) if (airW[c]) wa += wt; air[b * g + a] = wa >= .5 || airV?.[b * g + a] ? 1 : 0; }
  /* permukaan air rata: terendah di sekitar 7×7 di antara titik air, sedikit di bawah tepi */
  const Zw = Float32Array.from(Z); for (let b = 0; b < g; b++) for (let a = 0; a < g; a++) { if (!air[b * g + a]) continue; let m = Z[b * g + a];
    for (let db = -3; db <= 3; db++) for (let da = -3; da <= 3; da++) { const bb = b + db, aa = a + da; if (bb < 0 || aa < 0 || bb >= g || aa >= g || !air[bb * g + aa]) continue; if (Z[bb * g + aa] < m) m = Z[bb * g + aa]; }
    Zw[b * g + a] = m - 1.5; }
  if (ukir) for (let b = 0; b < g; b++) for (let a = 0; a < g; a++) { const i = b * g + a; if (!air[i]) { const dd = ukir((a / (g - 1) - .5) * W, -(b / (g - 1) - .5) * W); if (dd > 0) Zw[i] -= dd; } }
  for (let i = 0; i < N; i++) Y[i] = (Zw[i] - zmin) * ex;
  const hZ = (a, b) => Y[klem(b, 0, g - 1) * g + klem(a, 0, g - 1)];
  for (let b = 0; b < g; b++) for (let a = 0; a < g; a++) { const i = b * g + a, gx = (hZ(a + 1, b) - hZ(a - 1, b)) / (2 * step), gz = (hZ(a, b + 1) - hZ(a, b - 1)) / (2 * step);
    lereng[i] = 1 - 1 / Math.sqrt(1 + gx * gx + gz * gz);
    const n1 = .6 * noise2(a * .45, b * .45) + .4 * noise2(a * 1.7 + 9, b * 1.7), n2 = noise2(a * .11 + 50, b * .11 + 50), th = (Zw[i] - zmin) / Math.max(1, zmax - zmin);
    let r = 0, gg = 0, bl = 0; for (const [c, wt] of nb[i]) { const f = airW[c] ? 0 : (fuelW[c] || 3), k = warnaVertex(f, lereng[i], th, n1, n2); r += k[0] * wt; gg += k[1] * wt; bl += k[2] * wt; }
    warna[i * 3] = r; warna[i * 3 + 1] = gg; warna[i * 3 + 2] = bl; }
  let ipuncak = 0; for (let i = 1; i < N; i++) if (!air[i] && Z[i] > Z[ipuncak]) ipuncak = i;
  return {g, W, Z, Y, air, lereng, warna, zmin, zmax, relief, ex, ipuncak, puncak: Z[ipuncak]};
}
export function tinggiDi(M, x, z) { /* y dunia di (x, z) persis pada segitiga mesh (diagonal i10-i01) */
  const g = M.g, u = klem(x / M.W + .5) * (g - 1), v = klem(.5 - z / M.W) * (g - 1), a = Math.min(g - 2, Math.floor(u)), b = Math.min(g - 2, Math.floor(v)), fx = u - a, fy = v - b, Y = M.Y;
  const y00 = Y[b * g + a], y10 = Y[b * g + a + 1], y01 = Y[(b + 1) * g + a], y11 = Y[(b + 1) * g + a + 1];
  return fx + fy <= 1 ? y00 + fx * (y10 - y00) + fy * (y01 - y00) : y11 + (1 - fx) * (y01 - y11) + (1 - fy) * (y10 - y11);
}


/* ---- cincin luar: medan 3x kotak, resolusi rendah (sel 1/24 lebar kotak), menyatu ke tepi kotak dalam, warna pudar ke kabut; tanpa pohon ---- */
export function hitungCincin({K, vt, sampel, zmin, ex, M, k = 24}) {
  const W = M.W, L = 3 * W, nb = 3 * k + 1, N = nb * nb, Z = new Float32Array(N), Y = new Float32Array(N), warna = new Float32Array(N * 3), laut = new Uint8Array(N); let jml = 0, v = 0;
  for (let b = 0; b < nb; b++) for (let a = 0; a < nb; a++) { const x = (a / (nb - 1) - .5) * L, z = -(b / (nb - 1) - .5) * L, lon = K.x0 + (vt.i0 + vt.w / 2 + x / vt.d) / K.n * (K.x1 - K.x0), lat = K.y0 + (vt.j0 + vt.w / 2 - z / vt.d) / K.n * (K.y1 - K.y0), q = sampel(lon, lat); Z[b * nb + a] = q; if (Number.isFinite(q)) { jml += q; v++; } }
  const rata = v ? jml / v : 0, hor = [212, 210, 198]; let zmax = 1; for (let i = 0; i < N; i++) { if (!Number.isFinite(Z[i])) Z[i] = rata; if (Z[i] > zmax) zmax = Z[i]; }
  for (let b = 0; b < nb; b++) for (let a = 0; a < nb; a++) { const i = b * nb + a, x = (a / (nb - 1) - .5) * L, z = -(b / (nb - 1) - .5) * L, dx = Math.max(Math.abs(x) - W / 2, 0), dz = Math.max(Math.abs(z) - W / 2, 0), d = Math.hypot(dx, dz);
    const own = (Math.max(Z[i], 0) - zmin) * ex, edge = tinggiDi(M, klem(x, -W / 2, W / 2), klem(z, -W / 2, W / 2)); Y[i] = mix(edge, own, ss(0, 4000, d)) - 8; laut[i] = Z[i] <= .8 ? 1 : 0;
    const n1 = noise2(a * .55, b * .55), n2 = noise2(a * .17 + 9, b * .17), th = Z[i] / zmax, kabut = .08 + .5 * ss(0, L / 2, d);
    let c = laut[i] ? [74, 111, 138] : [0, 1, 2].map(q => mix(mix([101, 114, 70][q], [58, 84, 52][q], ss(.35, .65, n1)), [186, 170, 125][q], ss(.45, .9, th) * .6 + (n2 > .7 ? .25 : 0)));
    for (let q = 0; q < 3; q++) warna[i * 3 + q] = lin(mix(c[q], hor[q], kabut)); }
  return {nb, L, W, Y, warna, k};
}
export function geomCincin(T, R) {
  const {nb, L, W, Y, warna} = R, idx = []; for (let b = 0; b < nb - 1; b++) for (let a = 0; a < nb - 1; a++) { const cx = ((a + .5) / (nb - 1) - .5) * L, cz = -((b + .5) / (nb - 1) - .5) * L; if (Math.abs(cx) < W / 2 && Math.abs(cz) < W / 2) continue;
    const i00 = b * nb + a, i10 = i00 + 1, i01 = i00 + nb, i11 = i01 + 1; idx.push(i00, i10, i01, i10, i11, i01); }
  const pos = new Float32Array(nb * nb * 3); for (let b = 0; b < nb; b++) for (let a = 0; a < nb; a++) { const i = b * nb + a; pos[i * 3] = (a / (nb - 1) - .5) * L; pos[i * 3 + 1] = Y[i]; pos[i * 3 + 2] = -(b / (nb - 1) - .5) * L; }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(warna, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

/* ---- partikel: ring buffer, tanpa alokasi per frame ---- */
export function buatPartikel(N) {
  const p = {N, i: 0, pos: new Float32Array(N * 3), v: new Float32Array(N * 3), umur: new Float32Array(N).fill(1e9), hidup: new Float32Array(N).fill(1), s0: new Float32Array(N), a0: new Float32Array(N), size: new Float32Array(N), alpha: new Float32Array(N), hitungHidup: 0};
  p.emit = (x, y, z, vx, vy, vz, hidup, s0, a0) => { const i = p.i; p.i = (i + 1) % N; p.pos[i * 3] = x; p.pos[i * 3 + 1] = y; p.pos[i * 3 + 2] = z; p.v[i * 3] = vx; p.v[i * 3 + 1] = vy; p.v[i * 3 + 2] = vz; p.umur[i] = 0; p.hidup[i] = hidup; p.s0[i] = s0; p.a0[i] = a0; };
  p.maju = (dt, grow = 2.5) => { let h = 0; for (let i = 0; i < N; i++) { if (p.umur[i] >= p.hidup[i]) { p.alpha[i] = 0; continue; } h++;
      p.umur[i] += dt; const f = p.umur[i] / p.hidup[i]; p.pos[i * 3] += p.v[i * 3] * dt; p.pos[i * 3 + 1] += p.v[i * 3 + 1] * dt; p.pos[i * 3 + 2] += p.v[i * 3 + 2] * dt;
      p.size[i] = p.s0[i] * (1 + f * grow); p.alpha[i] = p.a0[i] * Math.pow(Math.max(0, 1 - f), 1.5) * Math.min(1, p.umur[i] * 3); }
    return p.hitungHidup = h; };
  return p;
}

/* ====================== 2. GEOMETRI (butuh three, tanpa DOM/WebGL) ====================== */
export function geomMedan(T, M) {
  const g = M.g, N = g * g, pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = new Uint32Array((g - 1) * (g - 1) * 6);
  for (let b = 0; b < g; b++) for (let a = 0; a < g; a++) { const i = b * g + a, u = a / (g - 1), v = b / (g - 1);
    pos[i * 3] = (u - .5) * M.W; pos[i * 3 + 1] = M.Y[i]; pos[i * 3 + 2] = -(v - .5) * M.W; uv[i * 2] = u; uv[i * 2 + 1] = v; }
  let q = 0; for (let b = 0; b < g - 1; b++) for (let a = 0; a < g - 1; a++) { const i00 = b * g + a, i10 = i00 + 1, i01 = i00 + g, i11 = i01 + 1; idx[q++] = i00; idx[q++] = i10; idx[q++] = i01; idx[q++] = i10; idx[q++] = i11; idx[q++] = i01; }
  const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("color", new T.BufferAttribute(M.warna, 3)); geo.setAttribute("aUvF", new T.BufferAttribute(uv, 2));
  geo.setIndex(new T.BufferAttribute(idx, 1)); geo.computeVertexNormals(); geo.computeBoundingSphere(); return geo;
}
export function geomPohon(T, BGU) { /* urutan = tipe: 0 konifer, 1 semak, 2 sawit, 3 akasia, 4 tunggul; tinggi satuan 1. Atribut color: batang gelap, kanopi putih (dikali warna instance) */
  const cat = (g, r, gg, b) => { const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; } g.setAttribute("color", new T.BufferAttribute(c, 3)); return g; };
  const kanopi = g => cat(g, 1, 1, 1), kerucut = (r, h, y, sg = 6) => kanopi(new T.ConeGeometry(r, h, sg, 1).translate(0, y + h / 2, 0)), batang = (r0, r1, h, w = 0) => cat(new T.CylinderGeometry(r0, r1, h, 5).translate(0, h / 2, 0), .16, .12, .09);
  const kon = BGU.mergeGeometries([kerucut(.27, .44, .2), kerucut(.21, .4, .44), kerucut(.14, .36, .68), batang(.035, .045, .26)]);
  const semak = kanopi(new T.IcosahedronGeometry(.5, 0).translate(0, .4, 0).scale(1, .75, 1));
  const sawit = BGU.mergeGeometries([batang(.025, .04, .5), kerucut(.5, .16, .46, 8), kerucut(.3, .22, .56, 8)]);
  const akasia = BGU.mergeGeometries([batang(.03, .04, .3), kanopi(new T.SphereGeometry(.5, 6, 5).scale(.46, 1.1, .46).translate(0, .66, 0))]);
  const tunggul = BGU.mergeGeometries([batang(.04, .07, .55), cat(new T.ConeGeometry(.1, .12, 5).translate(0, .56, 0), .3, .22, .14)]);
  return {kon, semak, sawit, akasia, tunggul, urut: [kon, semak, sawit, akasia, tunggul]};
}
/* pita di atas medan (air, tanggul, jalan): strip bertinggi bilinear medan + yoff; lebarKali memperlebar (tanggul) */
export function geomPita(T, M, garis, lebarKali, yoff, step = 45) {
  const P = [], I = []; let base = 0;
  for (const g of garis) { const pts = resample(g.p, step); if (pts.length < 2) continue;
    for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const h = g.lebar * lebarKali / 2, x = pts[i][0], z = pts[i][1], y = tinggiDi(M, x, z) + yoff; P.push(x - dz * h, y, z + dx * h, x + dz * h, y, z - dx * h);
      if (i) { const q = base + (i - 1) * 2; I.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } }
    base += pts.length * 2; }
  if (!I.length) return null;
  const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(new Float32Array(P), 3)); const nm = new Float32Array(P.length); for (let i = 1; i < nm.length; i += 3) nm[i] = 1;
  geo.setAttribute("normal", new T.BufferAttribute(nm, 3)); geo.setIndex(I); geo.computeBoundingSphere(); return geo;
}
/* jalur kepala api: tabung di atas medan; aS = posisi sepanjang jalur 0..1 (untuk padat/putus-putus) */
export function geomJalur(T, M, titik, radius) {
  const kasar = titik.map(p => new T.Vector3(p.x, 0, p.z)), c0 = new T.CatmullRomCurve3(kasar, false, "centripetal"), pk = c0.getSpacedPoints(180).map(v => new T.Vector3(v.x, tinggiDi(M, v.x, v.z) + radius * 3 + 10, v.z));
  const kurva = new T.CatmullRomCurve3(pk, false, "centripetal"), geo = new T.TubeGeometry(kurva, 240, radius, 6, false), rs = 7, aS = new Float32Array(geo.attributes.position.count);
  for (let i = 0; i <= 240; i++) for (let j = 0; j < rs; j++) aS[i * rs + j] = i / 240; geo.setAttribute("aS", new T.BufferAttribute(aS, 1));
  /* fraksi panjang tiap titik asli (jam -> s) */
  const cum = [0]; for (let i = 1; i < titik.length; i++) cum.push(cum[i - 1] + Math.hypot(titik[i].x - titik[i - 1].x, titik[i].z - titik[i - 1].z)); const L = cum[cum.length - 1] || 1;
  return {geo, kurva, sTitik: cum.map(c => c / L)};
}
export function sJam(titik, sTitik, t) { /* jam -> posisi 0..1 sepanjang jalur */
  if (t <= titik[0].jam) return 0; for (let i = 1; i < titik.length; i++) if (t <= titik[i].jam) return mix(sTitik[i - 1], sTitik[i], (t - titik[i - 1].jam) / ((titik[i].jam - titik[i - 1].jam) || 1)); return 1;
}

/* ====================== 3. RUNTIME PERAMBAN ====================== */
const GLSL_NOISE = `
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hsh(i), hsh(i+vec2(1.,0.)), f.x), mix(hsh(i+vec2(0.,1.)), hsh(i+vec2(1.,1.)), f.x), f.y); }
float fbm(vec2 p){ return .55*vn(p) + .3*vn(p*2.07+3.1) + .15*vn(p*4.3+7.7); }`;
/* shader patch medan: tekstur RG half-float (R = T*mask, G = mask). Jam tiba dihaluskan bilinear => garis depan halus, bukan blok sel */
const GLSL_API = `
vec2 tg = texture2D(uTT, vUvF).rg;
float ins = smoothstep(.30, .62, tg.g);
float Tm = tg.r / max(tg.g, .05);
float umur = uT - Tm;
float lebarB = clamp(fwidth(Tm) * 3.0, 1.0, 9.0);
float nz = fbm(vWp.xz * .004), nm = fbm(vWp.xz * .03), nf = fbm(vWp.xz * .06 + uTime * .35);
diffuseColor.rgb *= .84 + .32 * fbm(vWp.xz * .02);
float bakar = ins * smoothstep(-.02, .15, umur);
vec3 arang = mix(vec3(.05,.03,.025), vec3(.17,.075,.05), nz) * (.65 + .7 * nm);
diffuseColor.rgb = mix(diffuseColor.rgb, arang, bakar * .94);
vec3 fireEm = vec3(0.);
float bara = bakar * (1. - smoothstep(0., 6., umur)) * smoothstep(.45, .8, nm + (1. - umur / 6.) * .3);
fireEm += vec3(.85, .16, .035) * bara * (.7 + .6 * nf) * 1.3;
float fa = clamp(umur / lebarB, 0., 1.);
float depan = ins * smoothstep(-.06, .04, umur / lebarB) * (1. - smoothstep(.55, 1., fa));
fireEm += mix(vec3(1., .88, .42), vec3(1., .27, .03), fa) * depan * 2.6 * (.75 + .5 * nf);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.6,.16,.02), depan * .5);`;

const A = {tok: 0}; /* keadaan runtime; direset oleh tutup() */
let cacheGL;
const SF = () => window.SimFT;
const punyaGL = () => { if (cacheGL !== undefined) return cacheGL; try { const c = document.createElement("canvas"), g = c.getContext("webgl2"); cacheGL = !!g; g?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { cacheGL = false; } return cacheGL; };
const HP = () => innerWidth <= 900 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const tick = () => new Promise(r => window.requestIdleCallback ? requestIdleCallback(() => r(), {timeout: 120}) : setTimeout(r, 0));
const gerakKurang = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const idr = n => Math.round(n).toLocaleString("id-ID");
const ik = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/></svg>';

function kerangkaDOM() {
  const r = document.createElement("div"); r.className = "sa"; r.setAttribute("aria-label", "Adegan 3D simulasi");
  r.innerHTML = `<div class="sa-lbl"></div><div class="sa-lbu"></div><span class="sa-msg s3-pill">${ik}<span>Menyiapkan adegan…</span></span><span class="sa-attr">Medan © Mapzen, NASA SRTM, USGS · Adegan 3D bergaya, bukan citra</span>
    <div class="sa-kmp" aria-hidden="true"><svg viewBox="0 0 40 40" width="38" height="38"><circle cx="20" cy="20" r="18" fill="rgba(255,255,255,.85)" stroke="rgba(29,29,29,.25)"/><path d="M20 6l5 14h-10z" fill="#c9503a"/><path d="M20 34l-5-14h10z" fill="#8a8a8a"/></svg><b>U</b></div>`;
  return r;
}
const pesan = (teks) => { const m = A.root?.querySelector(".sa-msg"); if (!m) return; m.style.display = teks ? "" : "none"; if (teks) m.lastElementChild.textContent = teks; };

function buka(ctx) {
  if (!punyaGL()) return false;
  const H = ctx.H, K = ctx.K; if (!H || !K) return false;
  if (A.root && (A.K !== K || A.fuel !== ctx.Sim.fuelDasar)) tutup(); /* lokasi atau bahan bakar baru: bangun ulang */
  if (!A.root) {
    A.tok++; Object.assign(A, {K, H, fuel: ctx.Sim.fuelDasar, root: kerangkaDOM(), hp: HP(), t: ctx.t, kotor: true, aktifSampai: 0});
    document.querySelector("#simPeta").append(A.root); const tok = A.tok; setTimeout(() => bangun(tok), 0);
  } else if (A.H !== H) { A.H = H; if (A.siap) ganti(); }
  tampil(true); return true;
}
function tampil(on) { if (!A.root) return; A.root.style.display = on ? "" : "none"; A.terlihat = on; if (on) { sentuhUser(); jadwal(); } else { cancelAnimationFrame(A.raf); A.raf = 0; } }
function jeda() { tampil(false); }
function tutup() {
  A.tok++; cancelAnimationFrame(A.raf); A.ro?.disconnect(); document.removeEventListener("visibilitychange", A.vis); document.removeEventListener("keydown", A.esc); A.rtP?.dispose(); A.matIR?.dispose(); A.controls?.dispose();
  A.scene?.traverse(o => { o.geometry?.dispose(); o.dispose?.(); const m = o.material; for (const x of Array.isArray(m) ? m : m ? [m] : []) { for (const k in x) if (x[k]?.isTexture) x[k].dispose(); x.dispose(); } });
  A.texT?.dispose(); A.composer?.dispose?.(); A.r?.dispose(); A.r?.forceContextLoss(); A.root?.remove();
  for (const k of Object.keys(A)) if (k !== "tok") delete A[k];
}
const sentuhUser = () => { A.aktifSampai = performance.now() + 30000; };
function jadwal() { if (!A.raf && A.terlihat && A.siap && !document.hidden) A.raf = requestAnimationFrame(lup); }

/* ---------- membangun adegan (bertahap, tiap tahap dicek tok) ---------- */
async function bangun(tok) {
  const hidup = () => tok === A.tok && A.root;
  try {
    const [T, {OrbitControls}, {EffectComposer}, {RenderPass}, {UnrealBloomPass}, {OutputPass}, BGU] = await Promise.all([import("three"), import("three/addons/controls/OrbitControls.js"), import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"), import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js"), import("three/addons/utils/BufferGeometryUtils.js")]);
    if (!hidup()) return; A.T = T;
    const c0 = SF().ctx(), K = A.K, vt = A.vt = ventana(K), hp = A.hp;
    /* --- renderer, adegan, cahaya, langit --- */
    const cv = document.createElement("canvas"); A.root.prepend(cv);
    const r = A.r = new T.WebGLRenderer({canvas: cv, antialias: !hp, powerPreference: "high-performance"});
    r.setPixelRatio(Math.min(devicePixelRatio || 1, hp ? 1.5 : 2)); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.toneMapping = T.NeutralToneMapping;
    const scene = A.scene = new T.Scene(), horizon = new T.Color("#d4d2c6"), atas = new T.Color("#a9bfd4");
    scene.fog = new T.FogExp2(horizon, 0.000024);
    scene.add(new T.HemisphereLight(0xbcd0e6, 0x75643f, 1.5));
    const sun = new T.DirectionalLight(0xfff0d8, 3.6), W = vt.w * vt.d; sun.position.set(-.62 * 20000, .52 * 20000, .46 * 20000); sun.castShadow = true;
    sun.shadow.mapSize.set(hp ? 1024 : 2048, hp ? 1024 : 2048); Object.assign(sun.shadow.camera, {left: -W * .75, right: W * .75, top: W * .75, bottom: -W * .75, near: 100, far: 60000}); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -.0004; sun.shadow.normalBias = 18;
    scene.add(sun, sun.target);
    const langit = A.langit = new T.Mesh(new T.SphereGeometry(100000, 24, 12), new T.ShaderMaterial({side: T.BackSide, depthWrite: false, uniforms: {hor: {value: horizon}, atas: {value: atas}},
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "uniform vec3 hor; uniform vec3 atas; varying vec3 vD; void main(){ float h = clamp(vD.y, 0., 1.); gl_FragColor = vec4(mix(hor, atas, pow(h, .55)), 1.); }"}));
    langit.renderOrder = -1; langit.frustumCulled = false; scene.add(langit);
    /* --- medan: ubin Terrarium (cache sim_3d) -> tinggi bilinear --- */
    pesan("Memuat medan dan data lahan…");
    const z = ZUBIN, perlu = ubinDiperlukan(K, vt, z), tiles = new Map(), Wm = vt.w * vt.d;
    const tilesP = Promise.all(perlu.map(async ([zz, x, y]) => { const im = await SF().ubin(zz, x, y); if (im) tiles.set(`${x},${y}`, im); }));
    const tiles9 = new Map(), t9P = Promise.all(ubinDiperlukan(K, {i0: vt.i0 - vt.w, j0: vt.j0 - vt.w, w: 3 * vt.w}, 9).map(async ([zz, x, y]) => { const im = await SF().ubin(zz, x, y); if (im) tiles9.set(`${x},${y}`, im); }));
    const [, , vek, hilang] = await Promise.all([tilesP, t9P, muatVektor(K, vt, Wm), muatHilang(K, vt)]);
    if (!hidup()) return; await tick(); if (!hidup()) return;
    const ras = rasterLahan(vt), sum = A.sumber = {}; let garis = [], lc = {}, airV = null, airC = potong(K.air || new Uint8Array(K.n * K.n), vt);
    if (vek) { garis = [...keGarisAir(vek.waterway, K, vt), ...keGarisJalan(vek.transport, K, vt)]; const pa = keRings(vek.water, K, vt);
      if (pa.length) { const ac = rasterRings(pa, vt.w, Wm, "sel"); for (let i = 0; i < airC.length; i++) airC[i] |= ac[i]; airV = rasterRings(pa, G, Wm, "vert"); }
      for (const k of ["wetland", "wood", "farmland", "grass"]) { const f = vek.landcover.filter(q => q.properties?.class === k); if (f.length) lc[k] = rasterRings(keRings(f, K, vt), vt.w, Wm, "sel"); }
      sum.vektor = "OSM (OpenFreeMap): sungai, kanal, parit, jalan, danau, tutupan lahan"; }
    else { const [gj, kn] = await Promise.all([fetchJ("data/osm/jalan.geojson"), fetchJ("data/osm/kanal.json")]); garis = [...garisJalanGeojson(gj, K, vt, Wm), ...kanalSintetis(kn?.grid, K, vt, Wm)];
      sum.vektor = "cadangan: jalan.geojson + kanal sintetis dari kepadatan (posisi kanal perkiraan)"; }
    if (hilang) sum.hilang = "GFW"; await tick(); if (!hidup()) return;
    const kelas = A.kelas = gabungKelas(vt.w, {air: airC, gb: ras.gb, sawit: ras.sawit, hti: ras.hti, tambang: ras.tambang, lebat: ras.lebat, jarang: ras.jarang, lcWet: lc.wetland, lcWood: lc.wood, lcFarm: lc.farmland, lcGrass: lc.grass, hilang,
      fuel: potong(A.fuel || c0.H.fuel, vt)});
    const R = A.R = buatRintangan(garis, Wm), langkah = Wm / (G - 1) * .7; A.garis = garis;
    A.blok = (x, zz) => { if (R.dekat(x, zz) < 5) return true; const M = A.M; return !!M && M.air[Math.round((.5 - zz / M.W) * (M.g - 1)) * M.g + Math.round((x / M.W + .5) * (M.g - 1))]; };
    const M = A.M = hitungMedan({K, vt, fuelW: kelas, airW: airC, airV, ukir: (x, zz) => { const c = R.dekat(x, zz, MASK_AIR); return c < langkah ? 2.2 * (1 - klem(c / langkah)) : 0; }, sampel: (lo, la) => sampelTerrarium(tiles, z, lo, la), ex: SF().ex?.() || 0});
    A.tanpaDem = tiles.size === 0; await tick(); if (!hidup()) return;
    const tex = A.texT = new T.DataTexture(new Uint16Array(vt.w * vt.w * 2), vt.w, vt.w, T.RGFormat, T.HalfFloatType);
    tex.minFilter = tex.magFilter = T.LinearFilter; tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.generateMipmaps = false;
    const U = A.U = {uT: {value: c0.t}, uTT: {value: tex}, uTime: {value: 0}};
    const mat = new T.MeshStandardMaterial({vertexColors: true, roughness: .96, metalness: 0});
    mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aUvF;\nvarying vec2 vUvF;\nvarying vec3 vWp;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvUvF = aUvF; vWp = position;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec2 vUvF; varying vec3 vWp; uniform float uT; uniform float uTime; uniform sampler2D uTT;${GLSL_NOISE}`)
        .replace("#include <color_fragment>", `#include <color_fragment>${GLSL_API}`).replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += fireEm;"); };
    mat.customProgramCacheKey = () => "sa-medan";
    const medan = A.medan = new T.Mesh(geomMedan(T, M), mat); medan.castShadow = medan.receiveShadow = true; medan.frustumCulled = false; scene.add(medan);
    isiTekstur();
    { const rg = hitungCincin({K, vt, sampel: (lo, la) => sampelTerrarium(tiles9, 9, lo, la), zmin: M.zmin, ex: M.ex, M}), cm = new T.Mesh(geomCincin(T, rg), new T.MeshStandardMaterial({vertexColors: true, roughness: 1, metalness: 0})); cm.frustumCulled = false; scene.add(cm); }
    { let pjg = 0; for (const g of garis) for (let q = 2; q < g.p.length; q += 2) pjg += Math.hypot(g.p[q] - g.p[q - 2], g.p[q + 1] - g.p[q - 1]); const st = Math.max(45, pjg / 15000);
      const pita = (arr, warna, kali, yoff, ru, me) => { const geo = geomPita(T, M, arr, kali, yoff, st); if (!geo) return; const mm = new T.Mesh(geo, new T.MeshStandardMaterial({color: warna, roughness: ru, metalness: me, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
        mm.receiveShadow = true; mm.frustumCulled = false; scene.add(mm); };
      const mn = (arr, m) => arr.map(g => ({...g, lebar: Math.max(g.lebar, m)})); /* lebar dunia adaptif: minimal ~2-3 piksel dari jarak pandang awal */
      pita(mn(garis.filter(g => g.tipe === 2), Wm * .0012), "#6e5a3b", 2.4, 3, 1, 0); pita(mn(garis.filter(g => g.tipe <= 2), Wm * .0016), "#3f7390", 1, 5, .6, 0); pita(mn(garis.filter(g => g.tipe === 3), Wm * .0011), "#5b5d60", 1, 4, .9, 0); pita(mn(garis.filter(g => g.tipe === 4), Wm * .0008), "#b8a072", 1, 4, 1, 0); }
    A.root.querySelector(".sa-attr").textContent = `Medan © Mapzen, SRTM · ${A.sumber.vektor.startsWith("OSM") ? "Sungai, kanal, jalan © OpenStreetMap · " : "Jalan/sungai situs, kanal perkiraan · "}Gambut, konsesi, kawasan hutan: data situs${A.sumber.hilang ? " · Hutan hilang: GFW" : ""} · Adegan bergaya, bukan citra`;
    /* --- kamera, kendali, komposer --- */
    const cam = A.cam = new T.PerspectiveCamera(hp ? 52 : 45, 1, 30, 130000);
    const rc = A.rc = rencanaKamera(); const ctl = A.controls = new OrbitControls(cam, cv);
    Object.assign(ctl, {enableDamping: true, dampingFactor: .08, minDistance: 250, maxDistance: W * 2.2, maxPolarAngle: 1.43, minPolarAngle: .12, screenSpacePanning: false, zoomSpeed: .9});
    ctl.target.set(rc.tx, tinggiDi(M, rc.tx, rc.tz), rc.tz);
    ctl.addEventListener("change", () => { const c = ctl.target; c.x = klem(c.x, -W / 2, W / 2); c.z = klem(c.z, -W / 2, W / 2); const h = tinggiDi(M, cam.position.x, cam.position.z) + 60; if (cam.position.y < h) cam.position.y = h; A.kotor = true; jadwal(); });
    ctl.addEventListener("start", () => { A.terbang = null; A.ikut = null; sentuhUser(); });
    pasangKlik(cv);
    for (const ev of ["pointerdown", "wheel", "keydown"]) cv.addEventListener(ev, () => { sentuhUser(); jadwal(); }, {passive: true});
    const hdr = r.extensions.has("EXT_color_buffer_float") || r.extensions.has("EXT_color_buffer_half_float");
    if (hdr) { try { const rt = new T.WebGLRenderTarget(4, 4, {type: T.HalfFloatType, samples: hp ? 0 : 4}), cp = A.composer = new EffectComposer(r, rt); cp.addPass(new RenderPass(scene, cam));
      A.bloom = new UnrealBloomPass(new T.Vector2(512, 512), .6, .55, .92); cp.addPass(A.bloom); cp.addPass(new OutputPass()); } catch (e) { console.warn("Adegan: bloom nonaktif", e); A.composer = null; } }
    A.ro = new ResizeObserver(() => ukuran()); A.ro.observe(A.root); ukuran();
    A.vis = () => { if (document.hidden) { cancelAnimationFrame(A.raf); A.raf = 0; } else { A.kotor = true; jadwal(); } }; document.addEventListener("visibilitychange", A.vis);
    const f0 = c0.t; A.siap = true; mulaiKamera(); A.kotor = true; jadwal(); pesan("Menyiapkan pohon…");
    /* --- pohon (bertahap) --- */
    await tick(); if (!hidup()) return; await bangunPohon(T, BGU, tok, f0); if (!hidup()) return;
    /* --- overlay: jalur, label, penyulutan, partikel, unit --- */
    await tick(); if (!hidup()) return; bangunOverlay(T); bangunPartikel(T); pesan(""); if (A.tanpaDem) pesan("Ketinggian tidak termuat; medan datar");
    waktu(+SF().ctx().t); A.kotor = true; jadwal();
  } catch (e) {
    console.error("Adegan gagal:", e); if (tok !== A.tok) return; tutup(); SF().adeganGagal?.("Adegan 3D tidak bisa dimuat, memakai peta 3D.");
  }
}
function isiTekstur() {
  const vt = A.vt, d = new Float32Array(vt.w * vt.w * 2), Tw = A.Tw = potong(A.H.T, vt, Float32Array); isiT(Tw, d);
  const dat = A.texT.image.data, DU = A.T.DataUtils; for (let i = 0; i < d.length; i++) dat[i] = DU.toHalfFloat(d[i]); A.texT.needsUpdate = true; A.urut = urutT(Tw);
  let i0 = 1e9, i1 = -1, j0 = 1e9, j1 = -1; for (const c of A.urut.sel) { const a = c % vt.w, b = (c / vt.w) | 0; if (a < i0) i0 = a; if (a > i1) i1 = a; if (b < j0) j0 = b; if (b > j1) j1 = b; }
  A.bb = i1 < 0 ? null : {i0, i1, j0, j1};
}
function rencanaKamera() { /* target = pusat area terbakar; arah pandang = arah sebaran (awal -> akhir jalur kepala api) */
  const vt = A.vt, bb = A.bb, K = A.K; let tx = 0, tz = 0, ext = 3000;
  if (bb) { const a = selDunia(vt, (bb.i0 + bb.i1) / 2 - .5, (bb.j0 + bb.j1) / 2 - .5); tx = a.x; tz = a.z; ext = Math.max(3000, Math.max(bb.i1 - bb.i0 + 1, bb.j1 - bb.j0 + 1) * vt.d); }
  let az = 0; const jl = SF().jalur?.(A.H);
  if (jl && jl.length > 1) { const p = keDunia(K, vt, jl[0].lon, jl[0].lat), q = keDunia(K, vt, jl[jl.length - 1].lon, jl[jl.length - 1].lat); az = Math.atan2(-(q.x - p.x), -(q.z - p.z)); }
  return {tx, tz, ext, az};
}
function mulaiKamera() {
  const {cam, controls: ctl, rc, M} = A, W = M.W, vf = cam.fov * Math.PI / 360, asp = Math.min(Math.max(cam.aspect, .5), 1.6);
  const dist = klem(rc.ext / (1.3 * Math.tan(vf) * asp), 1500, W * 1.6), phi = 64 * Math.PI / 180, ty = tinggiDi(M, rc.tx, rc.tz);
  const pos = (d, ph, az) => [rc.tx + d * Math.sin(ph) * Math.sin(az), ty + d * Math.cos(ph), rc.tz + d * Math.sin(ph) * Math.cos(az)];
  A.posKam = pos; const akhir = {d: dist, ph: phi, az: rc.az};
  if (gerakKurang()) { cam.position.set(...pos(akhir.d, akhir.ph, akhir.az)); ctl.update(); return; }
  A.terbang = {t0: performance.now(), dur: 3200, dari: {d: dist * 1.55, ph: 44 * Math.PI / 180, az: rc.az + .6}, ke: akhir};
  cam.position.set(...pos(A.terbang.dari.d, A.terbang.dari.ph, A.terbang.dari.az)); ctl.update();
}
function ukuran() {
  const r = A.root, c = A.r; if (!r || !c) return; const w = Math.max(2, r.clientWidth), h = Math.max(2, r.clientHeight);
  c.setSize(w, h, false); A.cam.aspect = w / h; A.cam.updateProjectionMatrix(); A.composer?.setSize(w, h); A.composer && A.composer.setPixelRatio(c.getPixelRatio());
  A.px = h * c.getPixelRatio() / (2 * Math.tan(A.cam.fov * Math.PI / 360)); if (A.partikel) for (const s of A.partikel.sistem) s.mat.uniforms.uPx.value = A.px; A.kotor = true; jadwal();
}

/* ---------- data lahan nyata (semua dari data situs; tidak ada yang dikarang) ---------- */
const fetchJ = async u => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
function rasterLahan(vt) { /* gambut = K.gb; konsesi per jenis & kawasan hutan per fungsi dari cache Lapis (via SimFT.lahan) */
  const L = SF().lahan?.(); if (!L) return {}; const r = (f, p) => potong(L.raster(f, p), vt), atau = (a, b) => { for (let i = 0; i < a.length; i++) a[i] |= b[i]; return a; };
  return {gb: A.K.gb ? potong(A.K.gb, vt) : null, sawit: r(L.kons, q => q.jenis === "sawit"), hti: r(L.kons, q => q.jenis === "hti"), tambang: r(L.kons, q => q.jenis === "tambang"),
    lebat: r(L.kaw, q => ["HK", "HL", "KSA", "KPA", "THR"].includes(q.fungsi)), jarang: atau(r(L.kaw, q => ["HP", "HPT", "HPK"].includes(q.fungsi)), r(L.kons, q => q.jenis === "hph"))};
}
/* fitur OSM detail: peta MapLibre tersembunyi di luar layar (zoom 13, hanya sumber openmaptiles), tanpa menggerakkan peta utama */
async function muatVektor(K, vt, W) {
  let el, m; try {
    const L = SF().lahan?.(), src = L?.peta?.getStyle?.().sources?.openmaptiles; if (!src || !window.maplibregl) return null;
    const lon = K.x0 + (vt.i0 + vt.w / 2) / K.n * (K.x1 - K.x0), lat = K.y0 + (vt.j0 + vt.w / 2) / K.n * (K.y1 - K.y0), zm = A.hp ? 12 : 13, mpp = 78271.52 * Math.cos(lat * Math.PI / 180) / 2 ** zm, px = Math.min(2800, Math.ceil(W * 1.05 / mpp));
    el = document.createElement("div"); el.style.cssText = `position:fixed;left:-9999px;top:0;width:${px}px;height:${px}px;visibility:hidden`; document.body.append(el);
    const ly = (id, sl, type) => ({id, type, source: "openmaptiles", "source-layer": sl, paint: {[type + "-opacity"]: 0}});
    m = new maplibregl.Map({container: el, interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: 1, center: [lon, lat], zoom: zm,
      style: {version: 8, sources: {openmaptiles: src}, layers: [ly("w", "waterway", "line"), ly("t", "transportation", "line"), ly("a", "water", "fill"), ly("l", "landcover", "fill")]}});
    await new Promise(res => { const to = setTimeout(res, 14000); m.once("idle", () => { clearTimeout(to); res(); }); });
    const q = sl => m.querySourceFeatures("openmaptiles", {sourceLayer: sl}).map(f => ({geometry: f.geometry, properties: f.properties}));
    const o = {waterway: q("waterway"), transport: q("transportation"), water: q("water"), landcover: q("landcover")};
    return o.waterway.length + o.transport.length + o.water.length + o.landcover.length ? o : null;
  } catch (e) { console.warn("Adegan: tile OSM tidak termuat, memakai cadangan", e); return null; }
  finally { try { m?.remove(); } catch {} el?.remove(); }
}
/* hutan hilang: ubin GFW umd_tree_cover_loss (true_color; piksel tak transparan = hilang) disampel per sel. Perlu CORS; gagal = dilewati */
async function muatHilang(K, vt) {
  try {
    const j = await fetchJ("data/lapisan_tambahan.json"), tpl = j?.lapisan?.hilang?.tiles?.[0]; if (!tpl) return null; const z = 11, n = 2 ** z, img = new Map();
    await Promise.all(ubinDiperlukan(K, vt, z).map(async ([zz, x, y]) => { const r = await fetch(tpl.replace("{z}", zz).replace("{x}", x).replace("{y}", y), {signal: AbortSignal.timeout(9000)}); if (!r.ok) throw 0;
      const bm = await createImageBitmap(await r.blob()), c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height; const g = c.getContext("2d", {willReadFrequently: true}); g.drawImage(bm, 0, 0); img.set(`${x},${y}`, g.getImageData(0, 0, bm.width, bm.height)); }));
    const o = new Uint8Array(vt.w * vt.w); let ada = 0;
    for (let b = 0; b < vt.w; b++) for (let a = 0; a < vt.w; a++) { const lon = K.x0 + (vt.i0 + a + .5) / K.n * (K.x1 - K.x0), lat = K.y0 + (vt.j0 + b + .5) / K.n * (K.y1 - K.y0), r = lat * Math.PI / 180,
      fx = (lon + 180) / 360 * n, fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n, im = img.get(`${Math.floor(fx)},${Math.floor(fy)}`); if (!im) continue;
      const X = Math.floor((fx - Math.floor(fx)) * im.width), Y = Math.floor((fy - Math.floor(fy)) * im.height); if (im.data[(Y * im.width + X) * 4 + 3] > 30) { o[b * vt.w + a] = 1; ada++; } }
    return ada ? o : null;
  } catch { return null; }
}

/* ---------- pohon ---------- */
const SKALA = [s => 150 + 90 * s, s => 55 + 35 * s, s => 60 + 16 * s, s => 90 + 25 * s, s => 45 + 25 * s]; /* tinggi visual (m), dibesarkan supaya terbaca pada kotak 24 km */
function warnaPohon(c, t, R) { /* HSL per tipe */
  if (t === 0) c.setHSL(.29 + .05 * R(), .34 + .14 * R(), .09 + .07 * R()); else if (t === 1) c.setHSL(.2 + .05 * R(), .36 + .1 * R(), .11 + .08 * R());
  else if (t === 2) c.setHSL(.26 + .03 * R(), .5, .2 + .06 * R()); else if (t === 3) c.setHSL(.24 + .03 * R(), .3, .26 + .07 * R()); else c.setHSL(.08, .15 + .1 * R(), .13 + .05 * R());
}
const tandaiPohon = () => { for (const m of A.mesh) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
async function bangunPohon(T, BGU, tok, t) {
  const vt = A.vt, M = A.M, hp = A.hp, P = A.P = sebarPohon(A.kelas, vt.w, vt.d, hp ? 6500 : 26000, 20261017, A.blok);
  const gm = geomPohon(T, BGU), mt = () => new T.MeshStandardMaterial({color: 0xffffff, roughness: 1, metalness: 0, flatShading: true, vertexColors: true});
  A.mesh = gm.urut.map((g, k) => { const n = P.off[k + 1] - P.off[k], m = new T.InstancedMesh(g, mt(), Math.max(1, n)); m.count = n; m.frustumCulled = false; m.receiveShadow = true; A.scene.add(m); return m; });
  const py = P.py = new Float32Array(P.n), sk = P.sk = new Float32Array(P.n), col = P.col = new Float32Array(P.n * 3), c = new T.Color(), R = mulberry32(99);
  for (let i = 0; i < P.n; i++) { py[i] = tinggiDi(M, P.x[i], P.z[i]) - 1.5; sk[i] = SKALA[P.tipe[i]](P.s[i]); warnaPohon(c, P.tipe[i], R); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    if (i % 4000 === 3999) { await tick(); if (tok !== A.tok) return; } }
  P.idx = indeksSel(P.cell, vt.w * vt.w); P.m4 = new T.Matrix4(); P.q = new T.Quaternion(); P.v3 = new T.Vector3(); P.s3 = new T.Vector3(); P.up = new T.Vector3(0, 1, 0); P.cc = new T.Color();
  for (let i = 0; i < P.n; i++) terapPohon(i, keadaanPohon(A.Tw[P.cell[i]], t)); /* sekali di awal; selanjutnya hanya yang berubah */
  tandaiPohon(); A.tPohon = t; A.kotor = true;
}
function terapPohon(i, st) {
  const P = A.P, k = P.tipe[i], m = A.mesh[k], li = i - P.off[k], f = [1, 1, .7, .45][st];
  P.q.setFromAxisAngle(P.up, P.yaw[i]); P.v3.set(P.x[i], P.py[i], P.z[i]); P.s3.set(P.sk[i] * f, P.sk[i] * f, P.sk[i] * f); P.m4.compose(P.v3, P.q, P.s3); m.setMatrixAt(li, P.m4);
  if (st === 0) P.cc.setRGB(P.col[i * 3], P.col[i * 3 + 1], P.col[i * 3 + 2]); else if (st === 1) P.cc.setRGB(2.6, .55, .08); else if (st === 2) P.cc.setRGB(.035, .032, .03); else P.cc.setRGB(.24, .23, .22); /* membara oranye, batang hitam, abu */
  m.setColorAt(li, P.cc);
}
function perbaruiPohon(tLama, tBaru) { /* hanya sel yang T-nya melewati ambang di antara dua jam */
  const P = A.P; if (!P || !A.urut) return 0;
  const n = sentuh(A.urut, tLama, tBaru, c => { for (let q = P.idx.start[c]; q < P.idx.start[c + 1]; q++) { const i = P.idx.list[q]; terapPohon(i, keadaanPohon(A.Tw[c], tBaru)); } });
  if (n) tandaiPohon(); return n;
}

/* ---------- overlay ---------- */
function bangunOverlay(T) {
  const vt = A.vt, M = A.M, K = A.K, c = SF().ctx(), lbl = A.root.querySelector(".sa-lbl"), W = M.W; lbl.replaceChildren(); A.lb = [];
  for (const o of A.ov || []) { A.scene.remove(o); o.geometry?.dispose(); o.material?.dispose(); } A.ov = [];
  const dalam = p => Math.abs(p.x) < W / 2 && Math.abs(p.z) < W / 2, jl = (SF().jalur?.(A.H) || []).map(p => ({...p, ...keDunia(K, vt, p.lon, p.lat)})).filter(dalam);
  const label = (x, y, z, html, jam) => { const e = document.createElement("div"); e.className = "sa-lb"; e.innerHTML = html; lbl.append(e); A.lb.push({e, p: new T.Vector3(x, y, z), jam}); };
  A.jl = jl; A.tube = null; A.ign = null;
  if (jl.length > 1) { const rad = Math.max(14, W * .0011), {geo, kurva, sTitik} = geomJalur(T, M, jl, rad);
    const mat = new T.ShaderMaterial({uniforms: {uS: {value: 0}, uC: {value: new T.Color("#ffd24a")}}, side: T.DoubleSide,
      vertexShader: "attribute float aS; varying float vS; varying vec3 vN; void main(){ vS = aS; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "uniform float uS; uniform vec3 uC; varying float vS; varying vec3 vN; void main(){ bool padat = vS <= uS; if (!padat && fract(vS * 90.) < .5) discard; float l = .62 + .38 * clamp(dot(normalize(vN), normalize(vec3(.4,.8,.3))), 0., 1.); gl_FragColor = vec4(uC * l * (padat ? 1.25 : .7), 1.); }"});
    const tb = new T.Mesh(geo, mat); tb.frustumCulled = false; A.scene.add(tb); A.ov.push(tb);
    const kep = new T.Mesh(new T.ConeGeometry(rad * 3.4, rad * 10, 10), new T.MeshBasicMaterial({color: new T.Color(1.6, 1.25, .35)})); kep.frustumCulled = false; A.scene.add(kep); A.ov.push(kep);
    A.tube = {tb, kep, kurva, sTitik, up: new T.Vector3(0, 1, 0)}; }
  jl.forEach((p, i) => { const y = tinggiDi(M, p.x, p.z) + 160; label(p.x, y, p.z, `<i></i><span>${i ? "" : "<b>Penyulutan</b>"}${fmtWaktu(c.jamKe(p.jam))}</span>`, p.jam); });
  const a0 = jl[0] || (K.benih?.[0] != null ? (() => { const k = K.benih[0], q = selDunia(vt, k % K.n - vt.i0, ((k / K.n) | 0) - vt.j0); return Math.abs(q.x) < W / 2 && Math.abs(q.z) < W / 2 ? q : null; })() : null);
  if (a0) { const y = tinggiDi(M, a0.x, a0.z), bola = new T.Mesh(new T.SphereGeometry(Math.max(40, W * .0028), 16, 12), new T.MeshBasicMaterial({color: new T.Color(3, .12, .08)})),
      cincin = new T.Mesh(new T.RingGeometry(.8, 1, 40), new T.MeshBasicMaterial({color: new T.Color(2.4, .15, .1), transparent: true, depthWrite: false, side: T.DoubleSide})); cincin.rotation.x = -Math.PI / 2;
    bola.position.set(a0.x, y + 30, a0.z); cincin.position.set(a0.x, y + 25, a0.z); for (const o of [bola, cincin]) { o.frustumCulled = false; A.scene.add(o); A.ov.push(o); } A.ign = {bola, cincin, r: Math.max(40, W * .0028)}; }
  const ip = M.ipuncak, gx = ip % M.g, gz = (ip / M.g) | 0, px = (gx / (M.g - 1) - .5) * W, pz = -(gz / (M.g - 1) - .5) * W;
  label(px, M.Y[ip] + 120, pz, `<span class="sa-pk">▲ Puncak · ${idr(M.puncak)} m</span>`, -1);
  A.kotor = true;
}
function bangunPartikel(T) {
  if (A.partikel || gerakKurang()) return; const hp = A.hp;
  const buat = (N, warna, add, amt) => { const geo = new T.BufferGeometry(), p = buatPartikel(N); geo.setAttribute("position", new T.BufferAttribute(p.pos, 3)); geo.setAttribute("aSize", new T.BufferAttribute(p.size, 1)); geo.setAttribute("aA", new T.BufferAttribute(p.alpha, 1));
    const mat = new T.ShaderMaterial({transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending, uniforms: {uPx: {value: A.px || 800}, uCol: {value: new T.Color(...warna)}, uAmt: {value: amt}},
      vertexShader: "attribute float aSize; attribute float aA; uniform float uPx; varying float vA; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = clamp(aSize * uPx / -mv.z, 0., 96.); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform vec3 uCol; uniform float uAmt; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .12, d) * vA; if (a < .01) discard; gl_FragColor = vec4(uCol, a * uAmt); }"});
    const pt = new T.Points(geo, mat); pt.frustumCulled = false; A.scene.add(pt); return {p, geo, mat, pt}; };
  A.partikel = {asap: buat(hp ? 400 : 1100, [.3, .29, .28], false, .5), bara: buat(hp ? 150 : 420, [3.2, 1, .25], true, 1)}; A.partikel.tirai = [buat(hp ? 300 : 700, [.9, .2, .15], false, .75), buat(hp ? 300 : 700, [.3, .55, .9], false, .75)]; A.partikel.sistem = [A.partikel.asap, A.partikel.bara, ...A.partikel.tirai]; A.partikel.sisa = 0;
}

/* ---------- unit armada 3D (posisi dari SimArmada.unit; model prosedural low-poly, tanpa glTF) ---------- */
const SKU = {quad: 160, vtol: 90, heli: 32, AT: 24, H: 32, E: 34, WT: 34, DZ: 34, C: 55}; /* pembesaran visual: kotak 24 km */
const WARNA_U = {putih: 0xf1f1ee, merah: 0xc8352b, abu: 0x3a3d42, kuning: 0xe8b923, biru: 0x4f7a99, oranye: 0xe8762b, kulit: 0xd9a77c, hitam: 0x16171a, terang: 0xdfe6ea};
function modelUnit(T, jenis) { /* grup + daftar bagian berputar; depan = -Z */
  const g = new T.Group(), spin = [], mats = {};
  const mat = c => mats[c] ||= new T.MeshStandardMaterial({color: c, roughness: .65, metalness: .1, flatShading: true});
  const box = (w, h, d, c, x = 0, y = 0, z = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const cyl = (r, h, c, x = 0, y = 0, z = 0, rx = 0, rz = 0, sg = 10) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, sg), mat(c)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
  const rotor = (r, x, y, z, v = 40) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, .02, 14), new T.MeshBasicMaterial({color: 0xcfd6db, transparent: true, opacity: .45})); m.position.set(x, y, z); g.add(m); spin.push([m, v]); return m; };
  const W = WARNA_U;
  if (jenis === "quad") { box(.5, .14, .5, W.abu, 0, 0, 0); for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { box(.5, .04, .05, W.abu, a * .27, .02, b * .27).rotation.y = a * b * .785; cyl(.03, .1, W.hitam, a * .38, .06, b * .38); rotor(.24, a * .38, .12, b * .38); } box(.12, .12, .12, W.hitam, 0, -.12, -.2); }
  else if (jenis === "vtol") { box(.3, .26, 2.4, W.putih, 0, 0, 0); box(3.4, .05, .42, W.putih, 0, .1, -.2); box(.05, .5, .4, W.merah, 0, .3, 1.0); box(1.2, .05, .3, W.putih, 0, .1, 1.05); for (const x of [-1, 1]) { box(.06, .06, 1.6, W.abu, x * 1, .12, .2); rotor(.3, x * 1, .17, -.55, 50); rotor(.3, x * 1, .17, .95, 50); } }
  else if (jenis === "heli" || jenis === "H") { const b = new T.Mesh(new T.SphereGeometry(1, 10, 8), mat(W.merah)); b.scale.set(1.15, 1.05, 2.4); b.castShadow = true; g.add(b); box(.35, .35, 3.6, W.putih, 0, .25, 3.2); box(.1, 1.1, .8, W.merah, 0, .8, 4.8); box(.1, .9, .1, W.abu, 0, 1.15, 0);
    const r = new T.Group(); r.position.y = 1.5; for (const a of [0, 1.5708]) { const m = new T.Mesh(new T.BoxGeometry(9.5, .05, .3), mat(W.hitam)); m.rotation.y = a; r.add(m); } g.add(r); spin.push([r, 30]); box(.1, .1, 3, W.abu, -.9, -1.1, 0); box(.1, .1, 3, W.abu, .9, -1.1, 0);
    cyl(.8, 1.4, W.biru, 0, -1.25, 0, 0, 0, 8); rotor(.9, 0, 1.45, 4.6, 40).rotation.z = 1.5708; }
  else if (jenis === "AT") { cyl(.75, 9, W.putih, 0, 0, 0, 1.5708, 0, 10); const nose = new T.Mesh(new T.ConeGeometry(.75, 1.6, 10), mat(W.putih)); nose.rotation.x = -1.5708; nose.position.z = -5.2; g.add(nose); box(14, .25, 1.9, W.putih, 0, 1.0, -.6); box(2.2, .26, 1.9, W.merah, -6, 1.0, -.6); box(2.2, .26, 1.9, W.merah, 6, 1.0, -.6);
    box(4.6, .18, 1.3, W.putih, 0, .3, 4.3); box(.2, 2.2, 1.6, W.merah, 0, 1.4, 4.3); for (const x of [-2.6, 2.6]) cyl(.4, 2.2, W.abu, x, .25, -1.4, 1.5708, 0, 8); rotor(1.5, 0, 0, -6.2, 60).rotation.x = 1.5708; box(.9, .5, .9, W.merah, 0, -.9, -.6); }
  else if (jenis === "E") { box(2.5, 1.9, 5.6, W.merah, 0, 1.2, .4); box(2.4, 1.6, 1.8, W.merah, 0, 1.0, -3.3); box(2.5, .25, 5.8, W.putih, 0, 1.2, .4); box(2.2, .5, .9, W.terang, 0, 1.7, -3.9); for (const [x, z] of [[-1.2, -3], [1.2, -3], [-1.2, 2.4], [1.2, 2.4]]) cyl(.55, .4, W.hitam, x, .55, z, 0, 1.5708, 8); box(.3, .2, 5, W.abu, 0, 2.3, .6); }
  else if (jenis === "WT") { box(2.5, .5, 8, W.hitam, 0, .75, 0); cyl(1.2, 6.2, W.biru, 0, 1.9, 1, 1.5708, 0, 12); box(2.4, 1.9, 1.8, W.merah, 0, 1.4, -3.4); for (const z of [-3.2, 1.4, 3.2]) for (const x of [-1.25, 1.25]) cyl(.55, .4, W.hitam, x, .55, z, 0, 1.5708, 8); }
  else if (jenis === "DZ") { for (const x of [-1.35, 1.35]) box(.95, .95, 4.2, W.hitam, x, .5, 0); box(2.4, 1.3, 3.4, W.kuning, 0, 1.3, .2); box(1.6, 1.3, 1.5, W.kuning, 0, 2.3, .6); box(3.9, 1.3, .3, W.kuning, 0, .9, -2.4); box(.2, .2, .2, W.merah, 0, 3.1, .6); }
  else { for (const [x, z] of [[-.7, 0], [.6, .3], [-.2, .9], [.9, -.6], [-.9, -.8]]) { cyl(.22, .9, W.oranye, x, .75, z, 0, 0, 6); const h = new T.Mesh(new T.SphereGeometry(.2, 6, 5), mat(W.kulit)); h.position.set(x, 1.4, z); g.add(h); box(.14, .7, .14, W.abu, x, .35, z); } }
  const s = SKU[jenis] || 14; g.scale.setScalar(s); g.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); g.userData.spin = spin; return g;
}
const JENIS_UNIT = u => u.grup === "drone" ? u.jenis : u.jenis === "H" ? "heli" : u.jenis; /* jenis model */
const udara = u => u.grup === "drone" || u.jenis === "H" || u.jenis === "AT";
function segarUnit(sec) {
  const SA = window.SimArmada, tab = SF().aktif, ada = A.units || (A.units = new Map()), lbu = A.root.querySelector(".sa-lbu");
  const ok = (tab === "drones" || tab === "resources") && SA?.unit; let L = [];
  if (ok) { try { L = SA.unit(SF().ctx(), A.t, sec, tab) || []; } catch (e) { console.warn("Adegan: unit gagal", e); } }
  const lihat = new Set(), M = A.M, K = A.K, vt = A.vt;
  for (const u of L) { const q = keDunia(K, vt, u.lon, u.lat); if (Math.abs(q.x) > M.W / 2 || Math.abs(q.z) > M.W / 2) continue; lihat.add(u.kode);
    let e = ada.get(u.kode); if (!e) { const jm = JENIS_UNIT(u), g = modelUnit(A.T, jm); g.userData.kode = u.kode; A.scene.add(g); const el = document.createElement("button"); el.type = "button"; el.className = "sa-un"; el.textContent = u.kode; el.addEventListener("click", ev => { ev.stopPropagation(); pilihUnit(u.kode); }); lbu.append(el);
      e = {g, el, p: new A.T.Vector3(), jm}; ada.set(u.kode, e); }
    const y = tinggiDi(M, q.x, q.z) + (udara(u) ? Math.max(u.alt, 0) + 30 : 6); e.g.position.set(q.x, y, q.z); e.g.rotation.y = -(u.arah ?? 0) * Math.PI / 180; e.g.visible = true; e.u = u; e.p.set(q.x, y + (SKU[e.jm] || 14) * 1.6 + 40, q.z); e.el.classList.toggle("on", !!u.terpilih || A.ikut === u.kode); e.el.title = `${u.kode} · ${u.status}`; }
  for (const [k, e] of ada) { const on = lihat.has(k); e.g.visible = on; e.el.style.display = on ? "" : "none"; e.vis = on; }
  A.unitL = L; if (A.ikut && !lihat.has(A.ikut)) A.ikut = null;
}
function pilihUnit(kode) { window.SimArmada?.pilih?.(kode); A.ikut = kode; A.terbang = null; sentuhUser(); A.unitSegar = true; jadwal(); }
function ikutiKamera(dt) { /* kamera di belakang-atas unit, mulus; geser/Esc melepas */
  const e = A.ikut && A.units?.get(A.ikut); if (!e || !e.vis) return false; const a = -e.g.rotation.y, f = new A.T.Vector3(Math.sin(a), 0, -Math.cos(a)), s = SKU[e.jm] || 14, jr = udara(e.u) ? s * 38 : s * 22, tg = e.g.position;
  const want = new A.T.Vector3(tg.x - f.x * jr, tg.y + jr * .42 + 40, tg.z - f.z * jr), k = 1 - Math.exp(-dt * 3);
  A.controls.target.lerp(tg, k); A.cam.position.lerp(want, k); return true;
}
/* jejak siraman: noda di medan (dari SimArmada.jejak) yang memudar menurut umur; tirai partikel dari pesawat saat status "Siram" */
function segarNoda() {
  const SA = window.SimArmada, tab = SF().aktif, ada = A.noda || (A.noda = new Map()); let L = [];
  if (tab === "resources" && SA?.jejak) { try { L = SA.jejak(SF().ctx(), A.t) || []; } catch (e) { console.warn("Adegan: jejak gagal", e); } }
  const lihat = new Set(), K = A.K, vt = A.vt, M = A.M, T = A.T;
  for (const e of L) { const key = e.kode + "|" + e.tj; lihat.add(key); let n = ada.get(key);
    if (!n) { const p = []; for (const [lo, la] of e.pts) { const q = keDunia(K, vt, lo, la); p.push(q.x, q.z); } const pp = dalamKotak(p, M.W / 2)[0]; if (!pp) continue;
      const geo = geomPita(T, M, [{p: pp, lebar: Math.max(30, M.W * .0018), tipe: 9}], 1, 6, 30); if (!geo) continue; const mm = new T.Mesh(geo, new T.MeshBasicMaterial({color: e.jenis === "AT" ? 0xe5483b : 0x4f8fc4, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3}));
      mm.frustumCulled = false; A.scene.add(mm); n = {mm}; ada.set(key, n); }
    n.mm.visible = true; n.mm.material.opacity = .75 * Math.max(.1, 1 - (A.t - e.tj) / 48); }
  for (const [k, n] of ada) if (!lihat.has(k)) n.mm.visible = false;
  A.kotor = true;
}
function tirai(dt) { /* partikel merah (retardan) / biru (air) jatuh dari pesawat yang menyiram */
  const P = A.partikel; if (!P?.tirai) return;
  for (const e of A.units?.values() || []) { if (!e.vis || !e.u || e.u.status !== "Siram" || !udara(e.u)) continue; const sy = P.tirai[e.u.jenis === "AT" ? 0 : 1], n = Math.ceil(dt * 120), h = e.g.position.y - tinggiDi(A.M, e.g.position.x, e.g.position.z);
    for (let i = 0; i < n; i++) sy.p.emit(e.g.position.x + (Math.random() - .5) * 40, e.g.position.y - 20, e.g.position.z + (Math.random() - .5) * 40, (Math.random() - .5) * 8, -Math.max(60, h / 1.6), (Math.random() - .5) * 8, 1.5 + Math.random() * .5, 50 + Math.random() * 40, .7); }
}
/* klik unit di adegan (raycast), Esc melepas kamera */
function pasangKlik(cv) {
  const T = A.T, ray = new T.Raycaster(), v = new T.Vector2(); let d0 = null;
  cv.addEventListener("pointerdown", e => { d0 = {x: e.clientX, y: e.clientY, t: performance.now()}; });
  cv.addEventListener("pointerup", e => { if (!d0 || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 5 || performance.now() - d0.t > 500 || !A.units?.size) return; const r = cv.getBoundingClientRect();
    v.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v, A.cam); const hit = ray.intersectObjects([...A.units.values()].filter(x => x.vis).map(x => x.g), true)[0];
    let o = hit?.object; while (o && !o.userData.kode) o = o.parent; if (o) pilihUnit(o.userData.kode); });
  A.esc = e => { if (e.key === "Escape" && A.ikut) { A.ikut = null; A.unitSegar = true; jadwal(); } }; document.addEventListener("keydown", A.esc);
}

/* ---------- kamera drone di adegan: PIP dirender dari adegan YANG SAMA ke render target kecil (EO = warna, IR = termal dari tekstur jam tiba) ---------- */
const GLSL_IR_V = "varying vec3 vWp; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.);\n#ifdef USE_INSTANCING\n mv = modelViewMatrix * instanceMatrix * vec4(position, 1.);\n#endif\n vWp = (inverse(viewMatrix) * mv).xyz; gl_Position = projectionMatrix * mv; }";
const GLSL_IR_F = `uniform float uT; uniform float uTc; uniform float uW; uniform sampler2D uTT; varying vec3 vWp;${GLSL_NOISE}
void main(){ vec2 uv = vec2(vWp.x / uW + .5, .5 - vWp.z / uW); bool dlm = abs(uv.x - .5) < .5 && abs(uv.y - .5) < .5; vec2 tg = texture2D(uTT, uv).rg; float ins = dlm ? smoothstep(.3, .62, tg.g) : 0.;
  float Tm = tg.r / max(tg.g, .05), umur = uT - Tm; vec3 n = normalize(cross(dFdx(vWp), dFdy(vWp))); float temp = uTc + 1.5 + 6. * abs(n.y) + 4. * fbm(vWp.xz * .01);
  if (ins > .01 && umur >= 0.) { float t1 = umur < 1. ? 1000. - 400. * umur : uTc + (600. - uTc) * exp(-(umur - 1.) / 3.); temp = mix(temp, t1 * (.9 + .2 * fbm(vWp.xz * .05)), ins); }
  float lo = uTc - 8.; float v = pow(clamp((temp - lo) / (1000. - lo), 0., 1.), .45); gl_FragColor = vec4(vec3(v), 1.); }`;
const GAMMA = Uint8Array.from({length: 256}, (_, i) => Math.round(255 * Math.pow(i / 255, 1 / 2.2)));
function kameraPIP(el, d, mode, pal) {
  if (!A.siap || !A.r || !A.U || !A.M) return false;
  try {
    const T = A.T, M = A.M, K = A.K, vt = A.vt, W = mode === "ir" ? 360 : 480, H = mode === "ir" ? 240 : 270;
    let cv = el; if (el.tagName !== "CANVAS") { cv = el.querySelector("canvas.sa-eo"); if (!cv) { cv = document.createElement("canvas"); cv.className = "sa-eo"; el.replaceChildren(cv); } }
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const p = keDunia(K, vt, d.lon, d.lat), q = keDunia(K, vt, d.tlon, d.tlat); if (Math.abs(p.x) > M.W / 2 || Math.abs(p.z) > M.W / 2) return false;
    const cam = A.camP ||= new T.PerspectiveCamera(42, W / H, 5, 130000); cam.fov = 2 * Math.atan(Math.tan(d.fov * Math.PI / 360) / Math.max(1, d.zoom || 1)) * 180 / Math.PI; cam.aspect = W / H; cam.updateProjectionMatrix();
    cam.position.set(p.x, tinggiDi(M, p.x, p.z) + Math.max(d.alt, 20) + 20, p.z); cam.lookAt(q.x, tinggiDi(M, q.x, q.z), q.z);
    const rt = A.rtP ||= new T.WebGLRenderTarget(W, H, {depthBuffer: true}); if (rt.width !== W || rt.height !== H) rt.setSize(W, H);
    const r = A.r, sc = A.scene, vis = [A.langit.visible, A.partikel ? A.partikel.sistem.map(s => s.pt.visible) : null]; let lut = null;
    if (mode === "ir") { lut = window.SimArmada?.inti?.LUT?.[pal === "white" ? "white" : "ironbow"]; if (!lut) return false;
      const m = A.matIR ||= new T.ShaderMaterial({uniforms: {uT: A.U.uT, uTT: A.U.uTT, uTc: {value: 28}, uW: {value: M.W}}, vertexShader: GLSL_IR_V, fragmentShader: GLSL_IR_F, extensions: {derivatives: true}});
      m.uniforms.uTc.value = A.H.W?.tc?.[Math.min(72, Math.floor(A.t))] ?? 28; sc.overrideMaterial = m; A.langit.visible = false; if (A.partikel) for (const s of A.partikel.sistem) s.pt.visible = false; for (const e of A.units?.values() || []) e.g.visible = false; if (A.ign) { A.ign.bola.visible = A.ign.cincin.visible = false; } }
    r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.render(sc, cam); r.setRenderTarget(null); sc.overrideMaterial = null; A.langit.visible = vis[0]; if (A.partikel) A.partikel.sistem.forEach((s, i) => { s.pt.visible = vis[1][i]; });
    if (mode === "ir") { for (const e of A.units?.values() || []) e.g.visible = !!e.vis; if (A.ign) A.ign.bola.visible = A.ign.cincin.visible = true; }
    const buf = A.bufP && A.bufP.length === W * H * 4 ? A.bufP : A.bufP = new Uint8Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    const g = cv.getContext("2d"), img = A.imgP && A.imgP.width === W ? A.imgP : A.imgP = g.createImageData(W, H), px = img.data;
    for (let y = 0; y < H; y++) { const so = (H - 1 - y) * W * 4, dO = y * W * 4; for (let x = 0; x < W; x++) { const s = so + x * 4, o = dO + x * 4;
      if (lut) { const i = buf[s] * 3; px[o] = lut[i]; px[o + 1] = lut[i + 1]; px[o + 2] = lut[i + 2]; } else { px[o] = GAMMA[buf[s]]; px[o + 1] = GAMMA[buf[s + 1]]; px[o + 2] = GAMMA[buf[s + 2]]; } px[o + 3] = 255; } }
    g.putImageData(img, 0, 0); A.kotor = true; return true;
  } catch (e) { console.warn("Adegan: kamera drone gagal", e); A.r.setRenderTarget(null); A.scene.overrideMaterial = null; A.langit.visible = true; return false; }
}

/* ---------- waktu & ganti hasil ---------- */
function waktu(t) {
  A.t = t; if (!A.siap) return; const lama = A.tPohon ?? t; A.U.uT.value = t; sentuhUser();
  if (A.P && A.tPohon !== undefined) { perbaruiPohon(lama, t); A.tPohon = t; }
  if (A.tube) { const s = sJam(A.jl, A.tube.sTitik, t); A.tube.tb.material.uniforms.uS.value = s; const k = A.tube.kurva, p = k.getPointAt(Math.min(1, Math.max(0, s))), tg = k.getTangentAt(Math.min(1, Math.max(0, s)));
    A.tube.kep.position.copy(p); A.tube.kep.quaternion.setFromUnitVectors(A.tube.up, tg); }
  A.unitSegar = true; segarNoda(); A.kotor = true; jadwal();
}
function ganti() { /* hasil baru pada kisi yang sama (skenario lain / jalankan ulang): perbarui api, pohon, jalur; medan tetap */
  if (!A.texT) return; isiTekstur(); const t = +SF().ctx().t;
  if (A.P && A.tPohon !== undefined) { for (let i = 0; i < A.P.n; i++) terapPohon(i, keadaanPohon(A.Tw[A.P.cell[i]], t));
    tandaiPohon(); A.tPohon = t; }
  if (A.ov) bangunOverlay(A.T); waktu(t);
}
function segar() { A.unitSegar = true; if (A.siap) segarNoda(); A.kotor = true; sentuhUser(); jadwal(); }

/* ---------- loop: render on demand; animasi (asap, denyut) hanya 30 dtk sesudah interaksi terakhir ---------- */
function lup(ts) {
  A.raf = 0; if (!A.siap || !A.terlihat || document.hidden || !A.root.offsetParent) return;
  const dt = Math.min(.1, (ts - (A.ultimo || ts)) / 1000); A.ultimo = ts; const aktif = ts < A.aktifSampai && !gerakKurang(); let lagi = false;
  if (A.terbang) { const f = klem((performance.now() - A.terbang.t0) / A.terbang.dur), e = f * f * (3 - 2 * f), a = A.terbang.dari, b = A.terbang.ke;
    A.cam.position.set(...A.posKam(mix(a.d, b.d, e), mix(a.ph, b.ph, e), mix(a.az, b.az, e))); A.kotor = true; if (f >= 1) A.terbang = null; lagi = true; }
  if (A.controls.update()) { A.kotor = true; lagi = true; }
  const tabU = SF().aktif === "drones" || SF().aktif === "resources";
  if (A.unitSegar || (tabU && ts - (A.tUnit || 0) > 50 && ts < A.aktifSampai)) { A.unitSegar = false; A.tUnit = ts; segarUnit(ts / 1000); A.kotor = true; if (tabU) lagi = true; }
  if (A.ikut && ikutiKamera(dt)) { A.kotor = true; lagi = true; }
  let anim = false;
  if (aktif) { anim = true; A.U.uTime.value = ts / 1000;
    if (A.ign) { const s = 1 + .22 * Math.sin(ts / 190), q = (ts % 1600) / 1600; A.ign.bola.scale.setScalar(s); A.ign.cincin.scale.setScalar(A.ign.r * (2 + q * 5)); A.ign.cincin.material.opacity = .85 * (1 - q); }
    if (A.partikel) { const h = Math.min(72, Math.floor(A.t)), W = A.H.W, ke = ((W?.wd?.[h] ?? 90) + 180) * Math.PI / 180, v = klem((W?.ws?.[h] ?? 10) * 1.6, 8, 60), wx = Math.sin(ke) * v, wz = -Math.cos(ke) * v, U = A.urut, M = A.M, vt = A.vt;
      const a = batas(U.Ts, A.t - 1), b = batas(U.Ts, A.t); A.partikel.sisa += dt * (A.hp ? 40 : 110); let n = Math.floor(A.partikel.sisa); A.partikel.sisa -= n;
      if (b > a) while (n-- > 0) { const c = U.sel[a + Math.floor(Math.random() * (b - a))], x = ((c % vt.w) + Math.random() - vt.w / 2) * vt.d, z = -(((c / vt.w | 0) + Math.random() - vt.w / 2) * vt.d), y = tinggiDi(M, x, z);
        A.partikel.asap.p.emit(x, y + 20, z, wx * (.6 + Math.random() * .5), 22 + Math.random() * 30, wz * (.6 + Math.random() * .5), 6 + Math.random() * 4, 170 + Math.random() * 120, .55);
        if (Math.random() < .35) A.partikel.bara.p.emit(x + (Math.random() - .5) * 60, y + 10, z + (Math.random() - .5) * 60, wx * .5 + (Math.random() - .5) * 20, 30 + Math.random() * 50, wz * .5 + (Math.random() - .5) * 20, 1.4 + Math.random() * 1.6, 28 + Math.random() * 22, 1); }
      let hidup = 0; for (const s of A.partikel.sistem) { hidup += s.p.maju(dt, s === A.partikel.asap ? 2.5 : s === A.partikel.bara ? .4 : .6); s.geo.attributes.position.needsUpdate = s.geo.attributes.aSize.needsUpdate = s.geo.attributes.aA.needsUpdate = true; } anim = anim || hidup > 0; }
    for (const e of A.units?.values() || []) for (const [m, v] of e.g.userData.spin) m.rotation.y += v * dt;
    tirai(dt); A.kotor = true; lagi = true; }
  if (A.kotor) { render(ts); A.kotor = false; }
  if (lagi || anim) jadwal();
}
function render(ts) {
  const cam = A.cam, c = A.controls; A.langit.position.copy(cam.position);
  const t0 = performance.now(); if (A.composer) A.composer.render(); else A.r.render(A.scene, cam);
  const ms = performance.now() - t0; A.msF = (A.msF || ms) * .9 + ms * .1; A.nFrame = (A.nFrame || 0) + 1;
  if (A.nFrame % 40 === 0 && A.msF > 48) turunMutu(); /* kinerja adaptif: pixelRatio dulu, lalu bloom */
  const w = A.root.clientWidth, h = A.root.clientHeight, v = A.v3 ||= new A.T.Vector3();
  for (const l of A.lb || []) { v.copy(l.p).project(cam); const ok = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15; l.e.style.display = ok ? "" : "none"; if (!ok) continue;
    l.e.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px)`; l.e.classList.toggle("sa-fut", l.jam > A.t); }
  for (const e of A.units?.values() || []) { if (!e.vis) continue; v.copy(e.p).project(cam); const ok = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15; e.el.style.display = ok ? "" : "none"; if (ok) e.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%,-100%)`; }
  const kmp = A.root.querySelector(".sa-kmp"); if (kmp) kmp.style.transform = `rotate(${(c.getAzimuthalAngle() * 180 / Math.PI).toFixed(1)}deg)`;
}
function turunMutu() {
  const r = A.r; if (r.getPixelRatio() > 1) { r.setPixelRatio(Math.max(1, r.getPixelRatio() * .75)); ukuran(); } else if (A.bloom && A.bloom.strength > 0) { A.bloom.strength = 0; A.bloom.enabled = false; }
  A.msF = 0; A.nFrame = 1;
}

/* ====================== 4. REGISTRASI ====================== */
export const adegan = {get tersedia() { return punyaGL(); }, buka, jeda, tutup, waktu, segar, get terbuka() { return !!A.root; },
  ikuti(kode) { A.ikut = kode || null; A.terbang = null; A.unitSegar = true; sentuhUser(); jadwal(); },
  lihat({x = 0, z = 0, jarak = 4000, polar = 62, az = 0} = {}) { /* pembantu uji/foto: arahkan kamera ke (x,z) dunia */
    if (!A.siap) return false; A.terbang = null; const ty = tinggiDi(A.M, x, z), ph = polar * Math.PI / 180; A.controls.target.set(x, ty, z); A.cam.position.set(x + jarak * Math.sin(ph) * Math.sin(az), ty + jarak * Math.cos(ph), z + jarak * Math.sin(ph) * Math.cos(az));
    A.controls.update(); A.kotor = true; sentuhUser(); jadwal(); return true; },
  get info() { const g = A.garis || [], t = [0, 0, 0, 0, 0]; for (const x of g) t[x.tipe]++; return {garisPerTipe: t, sumber: A.sumber, pohon: A.P && A.P.off.slice(1).map((v, i) => v - A.P.off[i]), ex: A.M?.ex, contoh: A.garis?.[0] && {x: A.garis[0].p[0], z: A.garis[0].p[1], tipe: A.garis[0].tipe}, W: A.M?.W, tanpaDem: A.tanpaDem, msF: A.msF}; }};
if (typeof window !== "undefined" && window.SimFT) { window.SimFT.adegan = adegan; window.SimFT.adeganIR = (cv, d, pal) => kameraPIP(cv, d, "ir", pal); window.SimFT.adeganEO = (el, d) => kameraPIP(el, d, "eo"); window.SimFT.segarAdegan?.(); }
