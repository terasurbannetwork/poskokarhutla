"use strict";
/* waktu_kluster.js: waktu deteksi pertama/terakhir satu cluster untuk laci dan kotak cari, murni tanpa DOM.
   Sebab: harian.py memangkas cluster level < 2 ke atribut inti (INTI) di kluster_awal.json: awal, akhir, frp hilang, jam_sejak tetap ada.
   new Date(undefined) = "Invalid Date". Akhir dipulihkan dari dibuat (meta.dibuat) - jam_sejak; awal tidak bisa dipulihkan -> null (layar menulis teks jujur). */
(function (g) {
const sah = t => { const d = t ? new Date(t) : null; return d && !isNaN(d) ? d : null };
const lalu = (akhir, kini) => akhir ? Math.round((kini - akhir) / 36e5 * 10) / 10 : null;
function deteksi(p, dibuat, kini = Date.now()) {
  const dib = sah(dibuat), awal = sah(p.awal);
  const akhir = sah(p.akhir) || (dib && Number.isFinite(p.jam_sejak) ? new Date(dib - p.jam_sejak * 36e5) : null);
  return {awal, akhir, lalu: lalu(akhir, kini)};
}
/* gabungan banyak cluster (kotak cari): awal terawal / akhir terakhir dari yang punya data */
function gabung(KL, dibuat, kini = Date.now()) {
  const d = KL.map(p => deteksi(p, dibuat, kini)), min = (a, b) => !b ? a : !a || b < a ? b : a, mak = (a, b) => !b ? a : !a || b > a ? b : a;
  const awal = d.reduce((m, x) => min(m, x.awal), null), akhir = d.reduce((m, x) => mak(m, x.akhir), null);
  return {awal, akhir, lalu: lalu(akhir, kini)};
}
const TANPA = "tidak tercatat (cluster ringkas, tidak ada deteksi 24 jam)";
g.WaktuKluster = {deteksi, gabung, TANPA};
})(typeof window !== "undefined" ? window : globalThis);
