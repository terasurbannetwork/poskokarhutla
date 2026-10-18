/* sim_lahar.js: lahar (LAHARZ) dan awan panas (kerucut energi H/L) menurut lembah, dari DEM terrarium.
   Fungsi murni tanpa DOM: jalan di peramban (window.Lahar), di Web Worker (pesan = opsi simulasi), dan di node (uji_lahar.mjs).
   Alur: elevasi terrarium -> isi sink (priority-flood, selalu berhenti) -> D8 (lereng terjal) -> jalur dari kawah -> LAHARZ / H/L.
   Batas model: ilustrasi bahaya, bukan prakiraan. Penampang diselesaikan pada DEM ~38 m (z12), jadi lembah sempit < 80 m tak terpisah. */
(function (root, buat) {
  const L = buat();
  if (typeof module === "object" && module.exports) module.exports = L; else root.Lahar = L;
  if (typeof WorkerGlobalScope !== "undefined" && root instanceof WorkerGlobalScope) {
    root.onmessage = e => { try { root.postMessage({ok: true, r: L.simulasi(e.data)}); } catch (err) { root.postMessage({ok: false, galat: String(err && err.message || err)}); } };
  }
})(typeof self !== "undefined" ? self : globalThis, function () {
"use strict";
const EPS = 5e-4;                         /* kemiringan minimal buatan di dataran hasil isi sink (m per sel) */
const TETANGGA = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2]];

/* ---------- terrarium & koordinat ubin ---------- */
const dekode = (r, g, b) => r * 256 + g + b / 256 - 32768;
function elevasi(rgba, jml) { const e = new Float32Array(jml); for (let i = 0; i < jml; i++) e[i] = dekode(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]); return e; }
const mPerPx = (lat, z) => 156543.03392 * Math.cos(lat * Math.PI / 180) / 2 ** z;
function llKePx(z, lon, lat) { const w = 256 * 2 ** z, s = Math.sin(lat * Math.PI / 180); return [(lon + 180) / 360 * w, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * w]; }
function pxKeLL(z, gx, gy) { const w = 256 * 2 ** z; return [gx / w * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * gy / w))) * 180 / Math.PI]; }

/* ---------- isi sink: priority-flood (Barnes dkk. 2014) dengan EPS; tiap sel dikunjungi sekali, jadi pasti berhenti ---------- */
function isiSink(dem, n, m) {
  const N = n * m, z = Float64Array.from(dem), tutup = new Uint8Array(N), hk = new Float64Array(N), hi = new Int32Array(N); let sz = 0;
  const dorong = (k, i) => { let c = sz++; while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= k) break; hk[c] = hk[p]; hi[c] = hi[p]; c = p; } hk[c] = k; hi[c] = i; };
  const ambil = () => { const k0 = hk[0], i0 = hi[0], k = hk[--sz], i = hi[sz]; let c = 0;
    for (;;) { let a = c * 2 + 1; if (a >= sz) break; if (a + 1 < sz && hk[a + 1] < hk[a]) a++; if (hk[a] >= k) break; hk[c] = hk[a]; hi[c] = hi[a]; c = a; }
    hk[c] = k; hi[c] = i; return [k0, i0]; };
  for (let i = 0; i < N; i++) { const x = i % n, y = (i / n) | 0; if (x === 0 || y === 0 || x === n - 1 || y === m - 1 || z[i] <= 0.5) { tutup[i] = 1; dorong(z[i], i); } } /* tepi peta dan laut = muara */
  while (sz) {
    const [k, i] = ambil(), x = i % n, y = (i / n) | 0;
    for (const [dx, dy] of TETANGGA) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= m) continue;
      const j = yy * n + xx; if (tutup[j]) continue; tutup[j] = 1; if (z[j] <= k) z[j] = k + EPS; dorong(z[j], j); }
  }
  return z;
}

/* ---------- D8: tiap sel mengalir ke tetangga terendah paling curam; -1 = muara (tepi, laut, atau datar mentok) ---------- */
function arahD8(z, n, m) {
  const dir = new Int32Array(n * m).fill(-1);
  for (let y = 1; y < m - 1; y++) for (let x = 1; x < n - 1; x++) { const i = y * n + x; if (z[i] <= 0.5) continue;
    let b = 0, bj = -1; for (const [dx, dy, d] of TETANGGA) { const j = i + dy * n + dx, s = (z[i] - z[j]) / d; if (s > b) { b = s; bj = j; } }
    dir[i] = bj; }
  return dir;
}
/* ikuti arah sampai muara; penjaga panjang mencegah putaran tanpa akhir bila dir rusak */
function alur(dir, mulai, maks) {
  const out = [mulai]; let i = mulai;
  while (dir[i] >= 0 && out.length < maks) { i = dir[i]; out.push(i); }
  return out;
}

/* ---------- LAHARZ (Iverson dkk. 1998): penampang A = 0,05 V^(2/3), planimetrik B = 200 V^(2/3) ---------- */
const laharz = V => ({A: 0.05 * V ** (2 / 3), B: 200 * V ** (2 / 3)});

/* garis potong tegak lurus jalur di indeks i: kembalikan sampel [{idx, dz}] dari tengah ke dua sisi, selama masih satu lembah (kontigu) */
function potong(z, n, m, P, i, bed, W, tinggiMaks) {
  const a = P[Math.max(0, i - 3)], b = P[Math.min(P.length - 1, i + 3)];
  let tx = (b % n) - (a % n), ty = ((b / n) | 0) - ((a / n) | 0); const pj = Math.hypot(tx, ty) || 1; tx /= pj; ty /= pj;
  const cx = P[i] % n, cy = (P[i] / n) | 0, nx = -ty, ny = tx, sisi = [[], []];
  for (let s = 0; s < 2; s++) { const arah = s ? -1 : 1;
    for (let j = 1; j <= W; j++) { const x = Math.round(cx + nx * j * arah), y = Math.round(cy + ny * j * arah); if (x < 0 || y < 0 || x >= n || y >= m) break;
      const idx = y * n + x, dz = z[idx] - bed; if (dz >= tinggiMaks) break; sisi[s].push([idx, dz]); } }
  return sisi;
}
/* luas penampang untuk muka air h di atas dasar: hanya sel kontigu dari tengah (dz < h) */
function luasPenampang(sisi, h, dx) { let a = h * dx; for (const s of sisi) for (const [, dz] of s) { if (dz >= h) break; a += (h - dz) * dx; } return a; }

function laharAlur(z, n, m, P, S, Vp, dx, stamp, mulai, W) {
  const {A, B} = laharz(Vp); let luas = 0, s1 = 0, tinggi = 0;
  for (let i = mulai; i < P.length && luas < B; i++) {
    if (z[P[i]] <= 0.5) break;
    const sisi = potong(z, n, m, P, i, z[P[i]], W, 400);
    let lo = 0, hi = 400; for (let k = 0; k < 28; k++) { const h = (lo + hi) / 2; if (luasPenampang(sisi, h, dx) < A) lo = h; else hi = h; }
    const h = hi; tinggi = Math.max(tinggi, h);
    const tandai = idx => { if (stamp[idx] < 0) { stamp[idx] = S[i]; luas += dx * dx; } };
    tandai(P[i]); for (const s of sisi) for (const [idx, dz] of s) { if (dz >= h) break; tandai(idx); }
    s1 = S[i];
  }
  return {luas, panjang: s1, tinggi};
}

/* awan panas: sel masuk bila di dalam kerucut energi (z0 - z)/jarak >= HL dan di lembah (sampai `tebal` m di atas dasar jalur) */
function awanPanasAlur(z, n, m, P, S, z0, px0, py0, hl, dx, stamp, tebal, W) {
  let s1 = 0, luas = 0;
  const dalam = idx => { const d = Math.hypot(idx % n - px0, ((idx / n) | 0) - py0) * dx; return d > 0 && (z0 - z[idx]) / d >= hl ? d : -1; };
  for (let i = 0; i < P.length; i++) {
    const d0 = dalam(P[i]); if (d0 < 0) { if (Math.hypot(P[i] % n - px0, ((P[i] / n) | 0) - py0) * dx > dx * 3) break; else continue; }
    const sisi = potong(z, n, m, P, i, z[P[i]], W, tebal + 1);
    const tandai = idx => { const d = dalam(idx); if (d >= 0 && stamp[idx] < 0) { stamp[idx] = d; luas += dx * dx; } };
    tandai(P[i]); for (const s of sisi) for (const [idx, dz] of s) { if (dz >= tebal) break; tandai(idx); }
    s1 = Math.max(s1, d0);
  }
  return {luas, panjang: s1};
}

/* titik tertinggi di sekitar pusat (puncak sebenarnya bisa meleset beberapa ratus meter dari koordinat daftar) */
function cariPuncak(dem, n, m, cx, cy, r) {
  let b = -Infinity, bi = -1; for (let y = Math.max(0, cy - r); y <= Math.min(m - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(n - 1, cx + r); x++) { const i = y * n + x; if (dem[i] > b) { b = dem[i]; bi = i; } }
  return bi;
}

/* simulasi penuh. opsi: {dem:Float32Array n*m, n, m, z (zoom ubin), lat, pusat:[px,py], V (m3 total lahar), hl, tebalPdc (m)} */
function simulasi(o) {
  const {dem, n, m} = o, N = n * m, dx = mPerPx(o.lat, o.z), W = Math.max(8, Math.min(90, Math.round(3500 / dx)));
  const zf = isiSink(dem, n, m), dir = arahD8(zf, n, m);
  const pi = cariPuncak(dem, n, m, Math.round(o.pusat[0]), Math.round(o.pusat[1]), Math.max(2, Math.round(800 / dx))), px0 = pi % n, py0 = (pi / n) | 0, z0 = dem[pi];
  /* titik awal: dasar kawah (hasil isi sink: air keluar lewat bibir terendah = bukaan kawah) + cincin di bibir kawah */
  const rr = Math.max(3, Math.round(350 / dx)), awal = [pi];
  for (let k = 0; k < 12; k++) { const a = k / 12 * 2 * Math.PI, x = Math.round(px0 + Math.cos(a) * rr), y = Math.round(py0 + Math.sin(a) * rr); if (x > 0 && y > 0 && x < n - 1 && y < m - 1) awal.push(y * n + x); }
  const jalur = [], titikJauh = []; /* titikJauh: sel pada ~2,5 km sepanjang jalur, dipakai membedakan lembah */
  for (const s0 of awal) {
    const P = alur(dir, s0, N), S = new Float32Array(P.length); for (let i = 1; i < P.length; i++) S[i] = S[i - 1] + dx * (Math.abs((P[i] % n) - (P[i - 1] % n)) + Math.abs(((P[i] / n) | 0) - ((P[i - 1] / n) | 0)) === 2 ? Math.SQRT2 : 1);
    let q = P.length - 1; for (let i = 0; i < P.length; i++) if (Math.hypot(P[i] % n - px0, ((P[i] / n) | 0) - py0) * dx >= 2500) { q = i; break; }
    const kunci = [P[q] % n, (P[q] / n) | 0];
    if (P.length < 8) continue;
    if (s0 !== pi && titikJauh.some(t => Math.hypot(t[0] - kunci[0], t[1] - kunci[1]) < 8)) continue;
    if (s0 !== pi) { const sama = jalur.find(j => j.P.includes(P[Math.min(P.length - 1, 10)]) && j.P.indexOf(P[Math.min(P.length - 1, 10)]) > 0 && false); if (sama) continue; }
    titikJauh.push(kunci); jalur.push({P, S, utama: s0 === pi});
    if (jalur.length >= 5) break;
  }
  const bobot = jalur.map((j, i) => jalur.length === 1 ? 1 : i === 0 ? 0.5 : 0.5 / (jalur.length - 1));
  const stL = new Float32Array(N).fill(-1), stP = new Float32Array(N).fill(-1), infoJ = [];
  jalur.forEach((j, k) => {
    let mulai = 0; /* mulai lahar di batas zona proksimal: H/L terhadap puncak turun ke 0,3 */
    while (mulai < j.P.length - 1 && (z0 - zf[j.P[mulai]]) / Math.max(dx, Math.hypot(j.P[mulai] % n - px0, ((j.P[mulai] / n) | 0) - py0) * dx) > 0.3) mulai++;
    const Vp = o.V * bobot[k], lz = mulai < j.P.length - 1 && Vp > 0 ? laharAlur(zf, n, m, j.P, j.S, Vp, dx, stL, mulai, W) : {luas: 0, panjang: 0, tinggi: 0};
    const pd = awanPanasAlur(zf, n, m, j.P, j.S, z0, px0, py0, o.hl, dx, stP, o.tebalPdc || 15, W);
    infoJ.push({utama: j.utama, bobot: bobot[k], V: Vp, lahar_km: lz.panjang / 1000, lahar_km2: lz.luas / 1e6, tinggi_m: lz.tinggi, pdc_km: pd.panjang / 1000, pdc_km2: pd.luas / 1e6});
  });
  const rakit = st => { const id = []; for (let i = 0; i < N; i++) if (st[i] >= 0) id.push(i); id.sort((a, b) => st[a] - st[b]); const idx = Uint32Array.from(id), s = new Float32Array(id.length); id.forEach((v, q) => { s[q] = st[v]; }); return {idx, s}; };
  const lahar = rakit(stL), pdc = rakit(stP);
  let x0 = n, y0 = m, x1 = 0, y1 = 0; for (const t of [lahar, pdc]) for (const i of t.idx) { const x = i % n, y = (i / n) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const bbox = lahar.idx.length + pdc.idx.length ? [Math.max(0, x0 - 4), Math.max(0, y0 - 4), Math.min(n - 1, x1 + 4), Math.min(m - 1, y1 + 4)] : [px0 - 5, py0 - 5, px0 + 5, py0 + 5];
  return {dx, puncak: [px0, py0], z0, lahar, pdc, bbox, jalur: jalur.map(j => ({utama: j.utama, titik: Array.from(j.P.filter((_, q) => q % 3 === 0), i => [i % n, (i / n) | 0]), S: Array.from(j.S.filter((_, q) => q % 3 === 0))})), info: infoJ,
    ringkas: {lahar_km: Math.max(0, ...infoJ.map(i => i.lahar_km)), lahar_km2: infoJ.reduce((a, i) => a + i.lahar_km2, 0), pdc_km: Math.max(0, ...infoJ.map(i => i.pdc_km)), pdc_km2: infoJ.reduce((a, i) => a + i.pdc_km2, 0)}};
}

return {dekode, elevasi, mPerPx, llKePx, pxKeLL, isiSink, arahD8, alur, laharz, simulasi, cariPuncak};
});
