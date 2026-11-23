"use strict";
/* sim_hand.js: skenario muka sungai berbasis HAND (Height Above Nearest Drainage; Rennó dkk. 2008, Nobre dkk. 2011) untuk mode Genangan 3D,
   murni (tanpa DOM). Dipakai tiga cara seperti sim_genangan.js: <script> (window.SimHand), importScripts di sim_kerja.js, vm di
   tests/banjir/sim_hand.test.mjs. Gagasan diambil dari RainFlow Lab (ITB x Sagamartha, Nov 2026): geser muka air sungai, genangan langsung
   berubah, lalu bangunan, penduduk, jalan, dan akses ke titik aman dihitung ulang.
   Alur: DEM siap mesin (prep.z dari SimGenangan.siapkanArea) -> isiCekungan + arahD8 (fungsi SimGenangan, TIDAK disalin dan TIDAK
   diubah: sim_genangan.js dibekukan sidik J4) -> sel alur = laut atau tangkapan >= ALUR_KM2 -> tiap sel ikut arah D8 sampai alur
   pertama -> HAND = tinggi sel - tinggi sel alur itu. Muka air m di atas dasar alur menggenangi sel dengan HAND < m, sedalam m - HAND.
   Ini penyaringan statis: tanpa waktu, tanpa debit, tanpa tanggul, semua alur dianggap naik sama tinggi. Bukan prakiraan. */
(function (akar) {
const salah = m => { throw new Error("SimHand: " + m); };
const ASUMSI = {
  ALUR_KM2: 1,      /* km2; tangkapan minimum supaya sel dihitung alur sungai (asumsi; HAND peka terhadap ambang ini, Nobre dkk. 2011 memakai
                       ambang yang dipilih per DAS) */
  TERGENANG: 0.1,   /* m; sama dengan SimGenangan.ASUMSI.TERGENANG */
  MAKS: 10,         /* m; batas atas penggeser muka air */
};

/* prep {z, laut, acc} dari siapkanArea, dem {nx, ny, dx}, SG = SimGenangan, air = Uint8Array air permanen (waduk, danau, sungai lebar dari
   WorldCover; boleh null): ikut jadi alur, jadi tanah di tepinya diukur dari permukaan air itu, bukan dari dasar DEM.
   Kembali {hand: Float32Array (NaN = mengalir keluar kotak sebelum bertemu alur), alur: Uint8Array, nTak, amb (sel)} */
function hitung(prep, dem, SG, alurKm2 = ASUMSI.ALUR_KM2, air = null) {
  const {nx, ny, dx} = dem, N = nx * ny, {z, laut, acc} = prep;
  (z && z.length === N && laut && laut.length === N && acc && acc.length === N) || salah("prep tidak cocok dengan ukuran kisi");
  (alurKm2 > 0) || salah(`ambang alur ${alurKm2} km2 tidak sah`);
  /* benih dan isian sama persis dengan siapkanArea, jadi arah konsisten dengan prep.acc */
  const benih = SG.benihTepi(nx, ny, laut), f = SG.isiCekungan(z, nx, ny, benih), arah = SG.arahD8(f, nx, ny, benih);
  const amb = Math.max(1, alurKm2 * 1e6 / (dx * dx)), alur = new Uint8Array(N);
  for (let k = 0; k < N; k++) if (laut[k] || acc[k] >= amb || (air && air[k])) alur[k] = 1;
  /* urut naik f: penerima D8 selalu lebih rendah tegas (Priority-Flood+eps), jadi hilirnya sudah selesai lebih dulu */
  const urut = Int32Array.from({length: N}, (_, k) => k).sort((a, b) => f[a] - f[b]), lepas = new Int32Array(N), hand = new Float32Array(N);
  let nTak = 0;
  for (const c of urut) {
    lepas[c] = alur[c] ? c : arah[c] < 0 ? -1 : lepas[arah[c]];
    if (lepas[c] < 0) { hand[c] = NaN; if (!laut[c]) nTak++; } else hand[c] = Math.max(0, z[c] - z[lepas[c]]);
  }
  return {hand, alur, nTak, amb};
}

/* kedalaman (m) per sel pada muka air m; laut dan sel tanpa HAND = 0 */
function kedalaman(hand, laut, m, o = new Float32Array(hand.length)) {
  for (let k = 0; k < hand.length; k++) { const h = hand[k]; o[k] = laut[k] || !(h < m) ? 0 : m - h; }
  return o;
}

/* angka paparan pada muka air m. pop {lo, hi} per sel (boleh null), laju km/jam per sel (rasterJalan, boleh null), bangunan = HAND per bangunan.
   Jalan terendam = sel jalan dengan air >= ambangJalan, dikali dx (perkiraan panjang; ruas diagonal sedikit terlalu pendek).
   Jalan di sel alur (alur, boleh null) dianggap jembatan atau gorong-gorong yang tetap bisa dilewati (asumsi; tinggi jembatan tidak diketahui) */
function ringkas(hand, laut, m, dx, {pop, laju, bangunan, alur, ambangJalan = 0.3} = {}) {
  let sel = 0, lo = 0, hi = 0, jl = 0, dalam = 0;
  for (let k = 0; k < hand.length; k++) { if (laut[k]) continue; const h = hand[k]; if (!(h < m)) continue; const d = m - h;
    if (d >= ASUMSI.TERGENANG) { sel++; if (d > dalam) dalam = d; if (pop) { lo += pop.lo[k]; hi += pop.hi[k]; } }
    if (laju && laju[k] > 0 && d >= ambangJalan && !(alur && alur[k])) jl++; }
  let bg = 0; if (bangunan) for (const h of bangunan) if (m - h >= ASUMSI.TERGENANG) bg++;
  return {luas: sel * dx * dx, dalam, jiwa: pop ? [lo, hi] : null, jalanKm: laju ? jl * dx / 1000 : null, bangunan: bangunan ? bg : null};
}

/* akses ke titik aman lewat darat pada satu peta kedalaman. Kendaraan di jalan kering, jalan kaki di tanah kering, tanpa mengarungi dan tanpa
   perahu: sel dengan air >= AMBANG_JALAN tertutup. Titik aman = sel sekolah/faskes yang tidak tergenang (< TERGENANG).
   Terkurung = penduduk di sel yang belum tergenang dalam (< AMBANG_JALAN) tapi semua jalannya ke titik aman terputus air.
   Jalan di sel alur = jembatan, tetap terbuka (lihat ringkas). ctx {nx, ny, dx, laju, dalam, laut, aman: [k], pop {lo, hi}, alur}, ST = SimTanggap */
function akses(ctx, ST) {
  const {nx, ny, dx, laju, dalam, laut, aman, pop, alur} = ctx, N = nx * ny, A = ST.ASUMSI.AMBANG_JALAN;
  const sumber = [...new Set(aman)].filter(k => k >= 0 && k < N && !laut[k] && dalam[k] < ASUMSI.TERGENANG).map(k => ({k, t: 0}));
  if (!sumber.length) return {nAman: 0, nAmanSemua: aman.length};
  const {v} = ST.kecepatan(laju, dalam, laut, "terpadu");
  for (let k = 0; k < N; k++) if (dalam[k] >= A) v[k] = alur && alur[k] && laju[k] > 0 && !laut[k] ? laju[k] : 0;
  const T = ST.waktuTempuh(nx, ny, dx, v, new Uint8Array(N), sumber), w = [];
  let lo = 0, hi = 0, tot = 0;
  for (let k = 0; k < N; k++) { if (laut[k] || dalam[k] >= A) continue; const mid = (pop.lo[k] + pop.hi[k]) / 2; if (!(mid > 0)) continue;
    if (T[k] === Infinity) { lo += pop.lo[k]; hi += pop.hi[k]; } else w.push([T[k], mid]); tot += mid; }
  w.sort((a, b) => a[0] - b[0]); const q = p => { let c = 0; for (const [t, b] of w) { c += b; if (c >= p * (tot - (lo + hi) / 2)) return t; } return null; };
  return {nAman: sumber.length, nAmanSemua: aman.length, terkurung: [lo, hi], median: q(.5), p90: q(.9)};
}

const API = {ASUMSI, hitung, kedalaman, ringkas, akses};
if (typeof module !== "undefined" && module.exports) module.exports = API; else akar.SimHand = API;
})(typeof self !== "undefined" ? self : globalThis);
