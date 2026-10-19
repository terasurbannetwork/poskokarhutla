"use strict";
/* Fungsi murni prakiraan udara (tanpa DOM): dipakai layar dan diuji tests/udara/layar.test.mjs lewat node:test.
   Status kota = rata-rata 24 jam PM2,5 terkoreksi, titik potong Permen LHK P.14/2020 (sama dengan scripts/udara/kualitas.py). */
(function (root) {
  const POTONG = [55.4, 150.4, 250.4];
  const ST = ["normal", "waspada", "siaga", "awas"];
  const ST_NAMA = {normal: "Normal", waspada: "Waspada", siaga: "Siaga", awas: "Awas"};
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
  /* Satu jalur data: prakiraan.json (514 kab/kota x 72 jam, tiap kota berjiwa) -> bentuk ringkasan yang dibaca Peta, Insight, Tren, bagikan, sapa:
     {hari, dibuat, nasional[h]: {jiwa: [baik, sedang, tidak sehat, sangat tidak sehat, berbahaya], rata}, prov[kode][h]: [5 kategori jiwa, rata, maks], kab[h]: 30 kab/kota teratas [prov, nama, rata, maks, jiwa, jiwa tidak sehat]}.
     Kategori memakai batas PM2,5 24 jam P.14/2020; rata = berbobot jiwa; maks = puncak per jam di hari WIB itu. Kota tanpa jiwa atau r24 dilewati. */
  const BATAS_KAT = [15.5, 55.4, 150.4, 250.4];
  const katPM = v => BATAS_KAT.reduce((n, b) => n + (v > b), 0);
  const tglWIBjam = iso => new Date(Date.parse(iso) + 7 * 36e5).toISOString().slice(0, 10);
  const satukan = prak => {
    const H = prak.hari.length, hJam = prak.jam.map(tglWIBjam), kosong = () => Array.from({length: H}, () => ({j: [0, 0, 0, 0, 0], w: 0, t: 0, m: 0}));
    const nas = kosong(), prov = {}, kab = Array.from({length: H}, () => []), mk = {};
    for (const k of prak.kota) {
      if (!(k.jiwa > 0) || !k.r24) continue;
      /* puncak per jam = max(jam yang ada di hari itu, r24 hari itu): hari ini k.pm hanya memuat jam sejak sekarang, r24 seluruh hari WIB, jadi puncak tak boleh di bawah rata-rata. Tanpa jam hari itu = null. */
      mk[k.kode] = prak.hari.map((t, h) => { const a = k.pm.filter((v, i) => v != null && hJam[i] === t); return a.length ? Math.max(...a, k.r24[h] ?? 0) : null; });
      const P = prov[k.prov] ??= kosong();
      for (let h = 0; h < H; h++) {
        const v = k.r24[h]; if (v == null) continue;
        for (const A of [nas[h], P[h]]) { A.j[katPM(v)] += k.jiwa; A.w += k.jiwa * v; A.t += k.jiwa; A.m = Math.max(A.m, mk[k.kode][h] ?? 0); }
        kab[h].push([k.prov, k.nama, v, mk[k.kode][h], k.jiwa, v > BATAS_KAT[1] ? k.jiwa : 0]);
      }
    }
    return {uk: {hari: prak.hari, dibuat: prak.dibuat,
      nasional: nas.map(A => ({jiwa: A.j, rata: A.t ? A.w / A.t : 0})),
      prov: Object.fromEntries(Object.entries(prov).map(([p, hs]) => [p, hs.map(A => [...A.j, A.t ? A.w / A.t : 0, A.m])])),
      kab: kab.map(r => r.sort((a, b) => b[2] - a[2]).slice(0, 30))}, mk};
  };
  const api = {satukan, katPM, POTONG, ST, ST_NAMA, ST_WARNA, statusDari, rank, rata24, statusJam, statusHari, terburuk, indeksJam, banding, hitungStatus, normBagian, garisLintasan, lapisAda, persen, desimal, ringkasGalat, kataJam};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Murni = api;
})(typeof window !== "undefined" ? window : globalThis);
