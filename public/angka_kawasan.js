"use strict";
/* angka_kawasan.js: hotspot, luas terbakar, belum padam di dalam satu poligon (kawasan atau konsesi dari kotak cari), hitungan murni tanpa DOM.
   Rumus = scripts/data/peta_karhutla.py versi kabupaten (deck BNPB), dijalankan pada baris hotspot.json di peramban:
   - hot   = titik yang dihitung (dihitung(r), di halaman = S.dihitung: lokasi unik ~375 m per hari WIB, 4 satelit, keyakinan sedang/tinggi;
             unik() di bawah) pada hari WIB terpilih (sama dengan angka Hotspot panel peta);
   - luas  = (titik NOAA-20 x F.N20 + titik NOAA-21 x F.N21) / 2, keyakinan nominal/tinggi hari itu, dibulatkan sekali setengah ke atas
             (kalibrasi langsung ke luas resmi BNPB per satelit, keputusan pemilik 25 Okt 2026); satelit yang hari itu tak punya titik se-Indonesia
             tidak ikut dan yang lain dipakai sendiri tanpa dibagi 2, sama dengan peta_karhutla.py;
   - belum = rumus yang sama pada titik yang sel 3x3-nya (sel 0,003375 derajat) terdeteksi NOAA-20/21 n/h 12-36 jam sebelumnya (720-2160 menit).
   Beda yang diketahui dengan peta_karhutla.py: hotspot.json sudah membuang titik sumber panas tetap (titik_palsu.py) dan hanya memuat 7 hari terakhir,
   jadi kawasan berisi smelter/PLTU bisa sedikit lebih rendah; jam dibulatkan 0,01 jam. Diuji di tests/agen/angka-kawasan.test.mjs (paritas dengan bertahan() Python). */
(function (g) {
const G = 0.003375, LEBAR = 8192, F = {N20: 4.12, N21: 4.16};   /* F = peta_karhutla.F20/F21; uji menjaga keduanya sama */
const NB = [-1, 0, 1].flatMap(i => [-1, 0, 1].map(j => i * LEBAR + j));
const sel = (lon, lat) => Math.round(lon / G) * LEBAR + Math.round(lat / G) + LEBAR / 2;
const bul = v => Math.floor(v + 0.5);
const n2x = r => (r[3] === "N20" || r[3] === "N21") && r[5] >= 1;

/* LOKASI UNIK (keputusan pemilik 25 Okt 2026; cermin scripts/data/titik_unik.py, paritas diuji tests/agen/angka-kawasan.test.mjs):
   satu sel ~375 m dihitung sekali per hari WIB dari M, N, N20, N21 keyakinan >= kmin; yang dihitung = deteksi paling awal (kolom jam).
   -> Set baris yang dihitung. Baris data harian dan /api/titik digabung di peramban, jadi kolom "hitung" berkas tidak dipakai di sini. */
const SENSOR_UNIK = new Set(["M", "N", "N20", "N21"]);
const selUnik = (lat, lon) => Math.round(lat / G) + "," + Math.round(lon * Math.cos(lat * Math.PI / 180) / G);
function unik(baris, kmin = 1) {
  const lihat = new Set(), out = new Set();
  for (const r of [...baris].sort((a, b) => a[2] - b[2])) {
    if (!SENSOR_UNIK.has(r[3]) || r[5] < kmin) continue;
    const k = r[7] + "|" + selUnik(r[0], r[1]);
    if (!lihat.has(k)) { lihat.add(k); out.add(r); }
  }
  return out;
}

/* baris = hotspot.json "baris" [lat, lon, jam, sensor, frp, keyakinan, wilayah, tgl_wib "MM-DD", ...]; bb = [barat, selatan, timur, utara];
   dalam(lon, lat) = titik di dalam poligon; dihitung(r) = baris ini terhitung hotspot (halaman: S.dihitung); hari = "MM-DD" */
function hitung(baris, bb, dalam, dihitung, hari) {
  const e = 2 * G, det = new Map(), L = [], ada = {N20: 0, N21: 0};
  let hot = 0;
  for (const r of baris) {
    if (r[7] === hari && n2x(r)) ada[r[3]]++;   /* titik se-Indonesia per satelit hari itu: satelit tanpa lintasan tak ikut dirata-rata */
    const la = r[0], lo = r[1];
    if (lo < bb[0] - e || lo > bb[2] + e || la < bb[1] - e || la > bb[3] + e) continue;
    const n = n2x(r);
    if (n) { const c = sel(lo, la); let a = det.get(c); if (!a) det.set(c, a = []); a.push(r[2] * 60); }
    if (r[7] !== hari || lo < bb[0] || lo > bb[2] || la < bb[1] || la > bb[3] || !dalam(lo, la)) continue;
    if (dihitung(r)) hot++;
    if (n) L.push([sel(lo, la), r[2] * 60, r[3]]);
  }
  const pakai = ["N20", "N21"].filter(s => ada[s] > 0), bagi = Math.max(1, pakai.length);
  const ha = s => pakai.includes(s) ? F[s] / bagi : 0;
  let tahan = 0, luas = 0, belum = 0;
  for (const [c, t, s] of L) {
    luas += ha(s);
    if (NB.some(o => (det.get(c + o) || []).some(x => x >= t - 2160 - 1e-6 && x <= t - 720 + 1e-6))) { tahan++; belum += ha(s); }
  }
  return {hot, titik: L.length, bertahan: tahan, luas: bul(luas), belum: bul(belum)};
}

g.AngkaKawasan = {G, F, sel, selUnik, unik, hitung};
})(typeof window !== "undefined" ? window : globalThis);
