"use strict";
/* Fungsi murni prakiraan udara (tanpa DOM): dipakai layar dan diuji tests/udara/layar.test.mjs lewat node:test.
   Status kota = rata-rata 24 jam PM2,5 terkoreksi, titik potong Permen LHK P.14/2020 (sama dengan scripts/udara/kualitas.py). */
(function (root) {
  const POTONG = [55.4, 150.4, 250.4];
  const ST = ["normal", "waspada", "siaga", "awas"];
  /* dua skala berdampingan (docs/multi-bencana/bencana/udara.md §2): tingkat Pantau Bencana + kategori ISPU. Provinsi tetap kategori ISPU saja. */
  const ST_NAMA = {normal: "Normal (Baik/Sedang)", waspada: "Waspada (Tidak sehat)", siaga: "Siaga (Sangat tidak sehat)", awas: "Awas (Berbahaya)"};
  const labelStatus = s => ST_NAMA[s] || "–";
  const ST_WARNA = {normal: "#5a9e74", waspada: "#e8743b", siaga: "#d64545", awas: "#8a2be2"};
  const statusDari = v => ST[POTONG.reduce((n, b) => n + (v > b), 0)];
  const rank = s => ST.indexOf(s);
  /* rata-rata 24 jam yang berakhir di jam i (jendela terpotong di awal deret) */
  const rata24 = (pm, i) => { const a = pm.slice(Math.max(0, i - 23), i + 1).filter(v => v != null); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };
  const statusJam = (k, i) => { const r = rata24(k.pm, i); return r == null ? null : statusDari(r); };
  const statusHari = (k, h) => k.st?.[h] ?? (k.r24?.[h] != null ? statusDari(k.r24[h]) : null);
  /* kota dengan r24 hari h tertinggi; null bila tak ada data */
  const terburuk = (kota, h) => kota.filter(k => k.r24?.[h] != null).sort((a, b) => b.r24[h] - a.r24[h])[0] || null;
  /* indeks jam (ISO UTC) terakhir yang tidak melewati t (ms); 0 bila semuanya di depan */
  const indeksJam = (jam, t) => { let n = 0; for (let i = 0; i < jam.length; i++) if (Date.parse(jam[i]) <= t) n = i; return n; };
  /* naik/turun/sama; di bawah toleransi (bawaan 5 persen) dianggap sama */
  const banding = (skrg, lalu, tol = .05) => { if (skrg == null || lalu == null || !(lalu > 0)) return null; const d = skrg / lalu - 1;
    return {arah: d > tol ? "naik" : d < -tol ? "turun" : "sama", persen: Math.round(Math.abs(d) * 100)}; };
  const hitungStatus = (kota, h) => { const c = {normal: 0, waspada: 0, siaga: 0, awas: 0}; kota.forEach(k => { const s = statusHari(k, h); if (s in c) c[s]++; }); return c; };
  /* bagian atribusi -> lebar persen yang jumlahnya 100 (diskalakan bila tidak) dan urut terbesar dulu */
  const normBagian = bagian => { const b = [...bagian].filter(x => x.persen > 0).sort((x, y) => y.persen - x.persen), t = b.reduce((a, x) => a + x.persen, 0);
    return t ? b.map(x => ({...x, lebar: x.persen / t * 100})) : []; };
  /* lintasan satu lapis -> koleksi GeoJSON garis (koordinat [lon,lat]) */
  const garisLintasan = (lintasan, lapis) => ({type: "FeatureCollection", features: (lintasan?.kompleks || []).flatMap(k =>
    (k.jalur || []).filter(j => j.lapis === lapis && j.t?.length > 1).map(j => ({type: "Feature", properties: {id: k.id}, geometry: {type: "LineString", coordinates: j.t.map(p => [p[0], p[1]])}})))});
  const lapisAda = lintasan => [...new Set((lintasan?.kompleks || []).flatMap(k => (k.jalur || []).map(j => j.lapis)))];
  /* kalimat galat jujur: tanpa koreksi stasiun, angka belum dikoreksi */
  const persen = v => v == null ? "–" : (Math.round(v * 100)).toLocaleString("id-ID") + "%";
  const desimal = (v, n = 2) => v == null ? "–" : v.toLocaleString("id-ID", {maximumFractionDigits: n});
  const ringkasGalat = (galat, koreksi) => { const t = [];
    if (koreksi?.status !== "terkoreksi") t.push("Angka belum dikoreksi ke alat ukur di tanah; ini keluaran model CAMS apa adanya.");
    else t.push(`Dikoreksi memakai ${koreksi.n_stasiun} stasiun (${koreksi.metode}).`);
    return t; };
  const kataJam = (iso, tz = "Asia/Jakarta") => new Date(iso).toLocaleString("id-ID", {timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit"}).replace(/\./g, ":") + " WIB";
  const api = {POTONG, ST, ST_NAMA, labelStatus, ST_WARNA, statusDari, rank, rata24, statusJam, statusHari, terburuk, indeksJam, banding, hitungStatus, normBagian, garisLintasan, lapisAda, persen, desimal, ringkasGalat, kataJam};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Murni = api;
})(typeof window !== "undefined" ? window : globalThis);
