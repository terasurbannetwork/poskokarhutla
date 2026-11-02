"use strict";
/* Hitungan murni modul Gelombang Pasang & Abrasi (tanpa DOM, supaya bisa diuji di node: tests/pesisir/layar.test.mjs).
   Semua angka Insight dan Tren dihitung dari berkas data, tidak ada yang ditulis tangan. */
(g => {
  const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  /* kelas gelombang BMKG Maritim (tinggi, m) */
  const KELAS_GEL = [[6, "Ekstrem", "#2a1f6b"], [4, "Sangat tinggi", "#5b4fb0"], [2.5, "Tinggi", "#3f7fb8"], [1.25, "Sedang", "#7fb3d5"], [0, "Rendah", "#b9cfdc"]];
  const kelasGel = m => KELAS_GEL.find(k => m >= k[0]);
  const tglWIB = t => new Date(t + 7 * 36e5).toISOString().slice(0, 10);
  const hariKe = (tgl, n) => tglWIB(Date.parse(tgl + "T12:00:00+07:00") + n * 864e5);

  /* tinjau = lompatan > 300 m dalam satu tahun di mana pun dalam deret (tangga klasifikasi tambak/mangrove, tanggul, awan); gangguan = bangunan (tanggul tol, Patimban) */
  const tinjau = (a, t) => !!(t.tinjau?.length) || (a.situs.find(s => s.id === t.situs)?.tinjau || []).includes(t.id);
  const bersih = (a, t) => t.laju != null && !t.gangguan && !tinjau(a, t);
  /* transek abrasi nyata (keyakinan sedang atau tinggi) yang lolos saringan lompatan dan gangguan, urut mundur tercepat */
  const abrasiBersih = a => a.transek.filter(t => t.kelas === "abrasi" && t.keyakinan !== "rendah" && bersih(a, t)).sort((x, y) => x.laju - y.laju);
  const abrasiTercepat = (a, n = 8) => abrasiBersih(a).slice(0, n);
  /* median laju transek abrasi bersih per situs (minimal 3 transek); urut paling mundur dulu */
  function abrasiSitus(a, minimal = 3) {
    return a.situs.map(s => { const T = abrasiBersih(a).filter(t => t.situs === s.id); return {id: s.id, nama: s.nama, kab: s.kab, n: T.length, median: med(T.map(t => t.laju))}; })
      .filter(x => x.n >= minimal).sort((x, y) => x.median - y.median); }
  /* per situs: kelas dihitung hanya dari transek bersih; yang bertanda tinjau dan gangguan dihitung terpisah supaya sebanding */
  function perSitus(a) {
    return a.situs.map(s => { const T = a.transek.filter(t => t.situs === s.id && t.kelas), B = T.filter(t => bersih(a, t));
      return {id: s.id, nama: s.nama, kab: s.kab, prov: s.prov, n: T.length, bersih: B.length, abrasi: B.filter(t => t.kelas === "abrasi").length, akresi: B.filter(t => t.kelas === "akresi").length,
        tidak: B.filter(t => t.kelas === "tidak nyata").length, tinjau: T.filter(t => !t.gangguan && tinjau(a, t)).length, gangguan: T.filter(t => t.gangguan).length, median: med(B.map(t => t.laju))}; }); }

  /* seri tahunan per situs: median perubahan jarak terhadap baseline tiap transek (median posisi 1988-1992, hanya transek yang punya titik di jendela itu), negatif = mundur.
     Transek gangguan (bangunan) dibuang; yang bertanda tinjau tetap ikut karena median meredam tangga. Tahun dipakai bila minimal 60% transek BERBASELINE situs itu terbaca. */
  const BASE = [1988, 1992];
  function seriSitus(a) {
    return a.situs.map(s => { const T = a.transek.filter(t => t.situs === s.id && t.jarak?.length && !t.gangguan), per = {}; let nB = 0;
      for (const t of T) { const b = med(t.jarak.filter(p => p[0] >= BASE[0] && p[0] <= BASE[1]).map(p => p[1])); if (b == null) continue; nB++;
        for (const [y, v] of t.jarak) (per[y] ||= []).push(v - b); }
      const titik = Object.keys(per).map(Number).sort((x, y) => x - y).filter(y => per[y].length >= .6 * nB).map(y => ({y, v: Math.round(med(per[y])), n: per[y].length}));
      /* arah: cacah transek (yang punya data di tahun akhir seri) yang mundur lebih dari 100 m dari baseline; besar perubahan hanya sebagai median dan rentang antarkuartil */
      const yA = titik.length ? titik[titik.length - 1].y : null, dA = [], d5 = [];
      if (yA != null) for (const t of T) { const b = med(t.jarak.filter(p => p[0] >= BASE[0] && p[0] <= BASE[1]).map(p => p[1])); if (b == null) continue;
        const pa = t.jarak.find(p => p[0] === yA); if (pa) dA.push({v: pa[1] - b, tinjau: tinjau(a, t)});
        for (const [y, v] of t.jarak) if (y > yA - 5 && y <= yA) d5.push(v - b); }
      const kuartil = (A, q) => { const x = A.filter(Number.isFinite).sort((m, n) => m - n); if (!x.length) return null; const i = (x.length - 1) * q, l = Math.floor(i); return x[l] + (x[Math.min(l + 1, x.length - 1)] - x[l]) * (i - l); };
      const V = dA.map(x => x.v), arah = yA == null ? null : {yAkhir: yA, M: dA.length, mundur100: dA.filter(x => x.v < -100).length, tinjau: dA.filter(x => x.tinjau).length,
        med: med(V), q1: kuartil(V, .25), q3: kuartil(V, .75), med5: med(d5)};
      return {id: s.id, nama: s.nama, nT: nB, titik, arah}; }).filter(s => s.titik.length > 1 && s.nT >= 5); }

  /* rob: indeks hari data untuk tanggal, -1 bila di luar jangkauan (data basi) */
  const idxHari = (hari, tgl) => (hari || []).indexOf(tgl);
  function robHari(rob, tgl) { const i = idxHari(rob?.hari, tgl); if (i < 0) return null;
    const L = rob.titik.map(t => ({t, lv: t.lv[i] == null ? -1 : t.lv[i], h: t.h[i]})); /* lv -1 = titik tanpa arsip, ambang tak ada */ return {i, L, ada: L.filter(x => x.lv >= 0), cacah: [0, 1, 2, 3].map(k => L.filter(x => x.lv === k).length), aktif: L.filter(x => x.lv > 0).sort((x, y) => y.lv - x.lv || (y.h - y.t.p95) - (x.h - x.t.p95))}; }
  /* cacah titik rob berstatus Waspada atau lebih per hari data (untuk batang 7 hari ke depan dari tgl) */
  function robSeri(rob, tgl, n = 7) { const o = []; for (let k = 0; k < n; k++) { const d = hariKe(tgl, k), r = robHari(rob, d); if (r) o.push({tgl: d, n: r.L.filter(x => x.lv > 0).length, siaga: r.L.filter(x => x.lv > 1).length, ada: r.ada.length}); } return o; }
  /* peringatan rob BMKG yang masa berlakunya mencakup tgl */
  const robBmkg = (rob, tgl) => (rob?.bmkg?.rob || []).filter(r => r.tanggal_mulai <= tgl && tgl <= r.tanggal_selesai);
  /* kejadian "Banjir Rob" DIBI per tahun */
  function robTahun(rob) { const P = {}; for (const k of rob?.kejadian || []) { const y = k.tanggal.slice(0, 4), o = P[y] ||= {y: +y, n: 0, terdampak: 0, rumah: 0}; o.n++; o.terdampak += k.terdampak || 0; o.rumah += k.rumah_terendam || 0; }
    const ys = Object.values(P).sort((a, b) => a.y - b.y), akhir = (rob?.kejadian || []).reduce((m, k) => k.tanggal > m ? k.tanggal : m, ""); return {tahun: ys, akhir}; }

  /* pasut: puncak tertinggi stasiun dalam n hari dari tgl, dibanding p90-nya sendiri */
  function pasutPekan(ps, tgl, n = 7) { const sampai = hariKe(tgl, n - 1);
    return (ps?.stasiun || []).map(s => { const H = (s.hari || []).filter(h => h[0] >= tgl && h[0] <= sampai); if (!H.length) return null; const m = H.reduce((a, h) => h[1] > a[1] ? h : a);
      return {s, tgl: m[0], cm: m[1], jam: m[2], lebih: m[1] - s.p90}; }).filter(Boolean).sort((a, b) => b.cm - a.cm); }

  /* gelombang model (Open-Meteo Marine, dm per jam dari t0): tertinggi satu hari WIB; null bila hari di luar data */
  function hsHari(gel, r, tgl) { const a = Math.round((Date.parse(tgl + "T00:00:00+07:00") - Date.parse(gel.t0)) / 36e5), s = r[4]; if (a + 24 <= 0 || a >= s.length) return null;
    let m = -1; for (let i = Math.max(0, a); i < Math.min(s.length, a + 24); i++) if (s[i] > m) m = s[i]; return m < 0 ? null : m / 10; }
  const gelHari = (gel, tgl) => (gel?.titik || []).map(r => ({r, nama: r[3], prov: r[2], lat: r[0], lon: r[1], hs: hsHari(gel, r, tgl)})).filter(x => x.hs != null).sort((x, y) => y.hs - x.hs);

  /* peringatan gelombang BMKG yang masih berlaku pada jam t: satu provinsi satu baris, kelas tertinggi (1 tinggi, 2 sangat tinggi, 3 ekstrem; "sedang" bukan peringatan) */
  const OFS = {WIB: "+07:00", WITA: "+08:00", WIT: "+09:00"}, KEYS = ["tinggi", "sangat_tinggi", "ekstrem"];
  function gelBmkg(per, t) { const P = {};
    for (const g of per?.gelombang || []) { if (!g.prov || Date.parse(g.sampai + (OFS[g.zona] || "+07:00")) <= t) continue;
      const o = P[g.prov] ||= {prov: g.prov, nama: g.wilayah, kelas: [0, 0, 0], perairan: [[], [], []], dari: g.dari, sampai: g.sampai, zona: g.zona};
      KEYS.forEach((k, i) => { o.kelas[i] += g[k].length; o.perairan[i].push(...g[k]); }); if (g.sampai > o.sampai) o.sampai = g.sampai; }
    return Object.values(P).map(o => ({...o, lv: o.kelas.reduce((a, n, i) => n ? i + 1 : a, 0), total: o.kelas.reduce((a, b) => a + b, 0)})).filter(o => o.lv).sort((a, b) => b.lv - a.lv || b.total - a.total); }

  g.Pesisir = {med, KELAS_GEL, kelasGel, tglWIB, hariKe, abrasiTercepat, abrasiBersih, abrasiSitus, tinjau, bersih, BASE, perSitus, seriSitus, robHari, robSeri, robBmkg, robTahun, pasutPekan, hsHari, gelHari, gelBmkg, idxHari};
})(typeof globalThis !== "undefined" ? globalThis : window);
