"use strict";
/* sim_longsor.js: peluang longsor dangkal per sel dari kemiringan DEM + kejenuhan tanah akibat hujan. Murni (tanpa DOM).
   Model lereng tak-hingga (Hammond dkk. 1992 LISA; Pack, Tarboton, Goodwin 1998 SINMAP; Montgomery & Dietrich 1994):
     FS = [c' + (gs - m gw) z cos^2 b tan(phi)] / (gs z sin b cos b)
   m = tinggi muka air relatif, model ember: air bebas di atas kapasitas lapang / ruang pori di atas kapasitas lapang
     = (A + resapan) / (z (n - theta_fc)), dipotong 0..1 (tanpa drainase selama 72 jam: arah aman).
     A = hujan anteseden 7 hari (a7) yang masih tersimpan = a7 x (1 - HILANG); tanah "jenuh" menurut status.py (sm >= 0,45 dan
     a7 >= 25 mm) dianggap tidak kehilangan apa-apa (A = a7). sm (lapisan 3-27 cm) TIDAK dipakai sebagai kadar air kolom 1,5 m:
     itu pernah membuat lereng merah di jam 0 dengan hujan 5 mm (sm 0,43 -> m 0,86).
   Kohesi c' (tanah + akar) dan sudut gesek phi tidak diketahui per sel, jadi seragam pada rentang ASUMSI; peluang = bagian
   ruang (c', phi) dengan FS < 1, dihitung tepat untuk c' (linier) dan titik tengah 32 nilai phi. Lereng > BETA_MAKS diperlakukan
   BETA_MAKS: di atas ~45 derajat tanah biasanya tipis/batuan dan suku kohesi rumus ini malah naik lagi.
   Hasilnya INDEKS KERAWANAN RELATIF dari rentang parameter, bukan peluang kejadian dan bukan prakiraan teruji. */
(function (akar) {
const ASUMSI = {
  GS: 19, GW: 9.81,      /* kN/m3 berat isi tanah jenuh & air */
  TEBAL: 1.5,            /* m tebal tanah di atas bidang gelincir (umum untuk longsor dangkal tropis) */
  PORI: 0.45,            /* porositas */
  C: [2, 10],            /* kPa kohesi efektif + akar (Pack dkk. 1998, Hammond dkk. 1992: rentang tanah residual) */
  PHI: [26, 36],         /* derajat sudut gesek dalam */
  BETA_MAKS: 45,
  THETA_FC: 0.3,         /* m3/m3 kapasitas lapang tanah lempung-lanau tropis (asumsi; Saxton & Rawls 2006: 0,25-0,38) */
  HILANG: 0.5,           /* bagian hujan 7 hari lalu yang sudah hilang lewat evapotranspirasi dan aliran (asumsi) */
};
const salah = m => { throw new Error("SimLongsor: " + m); };
const NPHI = 32;
/* peluang FS < 1 untuk lereng beta (derajat) dan kejenuhan m (0..1) */
function peluang(beta, m, a = ASUMSI) {
  (Number.isFinite(beta) && Number.isFinite(m)) || salah(`lereng/kejenuhan bukan angka (${beta}, ${m})`);
  (beta >= 0 && m >= 0 && m <= 1) || salah(`lereng ${beta} atau kejenuhan ${m} di luar jangkauan`);
  const b = Math.min(beta, a.BETA_MAKS) * Math.PI / 180; if (b <= 0) return 0;
  const s = Math.sin(b), c = Math.cos(b), B = a.GS * a.TEBAL * s * c, Ak = (a.GS - m * a.GW) * a.TEBAL * c * c, [c0, c1] = a.C, [p0, p1] = a.PHI;
  let P = 0;
  for (let q = 0; q < NPHI; q++) { const t = Math.tan((p0 + (p1 - p0) * (q + .5) / NPHI) * Math.PI / 180), x = (B - Ak * t - c0) / (c1 - c0); P += x <= 0 ? 0 : x >= 1 ? 1 : x; }
  return P / NPHI;
}
/* kejenuhan relatif (ember): a7 = hujan 7 hari lalu (mm), resapMm = resapan kumulatif sejak jam 0 (mm), basah = penanda jenuh status.py */
function kejenuhan(a7, resapMm, basah = false, a = ASUMSI) {
  (Number.isFinite(a7) && Number.isFinite(resapMm)) || salah(`hujan anteseden/resapan bukan angka (${a7}, ${resapMm})`);
  (a7 >= 0 && resapMm >= 0) || salah(`hujan anteseden ${a7} atau resapan ${resapMm} negatif`);
  const A = basah ? a7 : a7 * (1 - a.HILANG);
  const isi = (a.PORI - a.THETA_FC) * a.TEBAL * 1000; /* mm air bebas sampai jenuh penuh (225 mm bawaan) */
  return Math.max(0, Math.min(1, (A + resapMm) / isi));
}
/* kemiringan (derajat) metode Horn 1981, tepi memakai sel tepi sendiri */
function lereng(z, nx, ny, dx) {
  (z && z.length === nx * ny && dx > 0) || salah("kisi lereng tidak sah");
  const o = new Float32Array(nx * ny), Z = (i, j) => z[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const gx = ((Z(i + 1, j - 1) + 2 * Z(i + 1, j) + Z(i + 1, j + 1)) - (Z(i - 1, j - 1) + 2 * Z(i - 1, j) + Z(i - 1, j + 1))) / (8 * dx);
    const gy = ((Z(i - 1, j + 1) + 2 * Z(i, j + 1) + Z(i + 1, j + 1)) - (Z(i - 1, j - 1) + 2 * Z(i, j - 1) + Z(i + 1, j - 1))) / (8 * dx);
    o[j * nx + i] = Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI; }
  return o;
}
/* tabel peluang per 0,5 derajat untuk satu m: peta per jam jadi pencarian murah */
function tabel(m, a = ASUMSI) { const t = new Float32Array(2 * a.BETA_MAKS + 1); for (let i = 0; i < t.length; i++) t[i] = peluang(i / 2, m, a); return t; }
function peta(lr, m, a = ASUMSI) { const t = tabel(m, a), o = new Float32Array(lr.length);
  for (let k = 0; k < lr.length; k++) o[k] = t[Math.min(t.length - 1, Math.round(lr[k] * 2))]; return o; }

const API = {ASUMSI, peluang, kejenuhan, lereng, tabel, peta};
if (typeof module !== "undefined" && module.exports) module.exports = API; else akar.SimLongsor = API;
})(typeof self !== "undefined" ? self : globalThis);
