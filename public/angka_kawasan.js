"use strict";
/* angka_kawasan.js: hotspot, luas terbakar, belum padam di dalam satu poligon (kawasan atau konsesi dari kotak cari), hitungan murni tanpa DOM.
   Rumus = scripts/data/peta_karhutla.py versi kabupaten (deck BNPB), dijalankan pada baris hotspot.json di peramban:
   - hot   = titik sensor utama (hs.sensor_utama) pada hari WIB terpilih (sama dengan angka Hotspot panel peta);
   - luas  = titik NOAA-20/21 keyakinan nominal/tinggi hari itu x PORSI x 4,3 ha, dibulatkan sekali setengah ke atas;
   - belum = titik yang sama yang sel 3x3-nya (sel 0,003375 derajat) terdeteksi NOAA-20/21 n/h 12-36 jam sebelumnya (720-2160 menit) x PORSI x 4,3 ha.
   Beda yang diketahui dengan peta_karhutla.py: hotspot.json sudah membuang titik sumber panas tetap (titik_palsu.py) dan hanya memuat 7 hari terakhir,
   jadi kawasan berisi smelter/PLTU bisa sedikit lebih rendah; jam dibulatkan 0,01 jam. Diuji di tests/agen/angka-kawasan.test.mjs (paritas dengan bertahan() Python). */
(function (g) {
const G = 0.003375, LEBAR = 8192, HA = 4.3, PORSI = 0.5337924177818518;   /* PORSI = peta_karhutla.PORSI; uji menjaga keduanya sama */
const NB = [-1, 0, 1].flatMap(i => [-1, 0, 1].map(j => i * LEBAR + j));
const sel = (lon, lat) => Math.round(lon / G) * LEBAR + Math.round(lat / G) + LEBAR / 2;
const bul = v => Math.floor(v + 0.5);
const n2x = r => (r[3] === "N20" || r[3] === "N21") && r[5] >= 1;

/* baris = hotspot.json "baris" [lat, lon, jam, sensor, frp, keyakinan, wilayah, tgl_wib "MM-DD"]; bb = [barat, selatan, timur, utara];
   dalam(lon, lat) = titik di dalam poligon; utama = Set sensor utama; hari = "MM-DD" */
function hitung(baris, bb, dalam, utama, hari) {
  const e = 2 * G, det = new Map(), L = [];
  let hot = 0;
  for (const r of baris) {
    const la = r[0], lo = r[1];
    if (lo < bb[0] - e || lo > bb[2] + e || la < bb[1] - e || la > bb[3] + e) continue;
    const n = n2x(r);
    if (n) { const c = sel(lo, la); let a = det.get(c); if (!a) det.set(c, a = []); a.push(r[2] * 60); }
    if (r[7] !== hari || lo < bb[0] || lo > bb[2] || la < bb[1] || la > bb[3] || !dalam(lo, la)) continue;
    if (utama.has(r[3])) hot++;
    if (n) L.push([sel(lo, la), r[2] * 60]);
  }
  let tahan = 0;
  for (const [c, t] of L) if (NB.some(o => (det.get(c + o) || []).some(x => x >= t - 2160 - 1e-6 && x <= t - 720 + 1e-6))) tahan++;
  return {hot, titik: L.length, bertahan: tahan, luas: bul(L.length * PORSI * HA), belum: bul(tahan * PORSI * HA)};
}

g.AngkaKawasan = {G, HA, PORSI, sel, hitung};
})(typeof window !== "undefined" ? window : globalThis);
