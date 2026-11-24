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
  /* jenis lompatan (abrasi.py jenis_lompatan): bolak-balik = artefak citra, searah = bertahan, belum pasti = terlalu dekat dengan tahun terakhir */
  const ketLompatan = t => { const th = (t.lompatan || []).map(x => x[0]).join(", ");
    return t.lompatan_jenis === "searah" ? `Lompatan permanen (${th}): garis bergeser lebih dari 300 m dan tidak kembali. Kemungkinan reklamasi, bangunan pantai, atau erosi besar; perlu cek citra.`
      : t.lompatan_jenis === "bolak-balik" ? `Lompatan bolak-balik (${th}): garis melompat lebih dari 300 m lalu kembali dalam satu sampai dua tahun. Hampir pasti salah baca citra (awan, pasang, ambang air), bukan gerak pantai; tahun itu dibuang dari laju.`
      : `Lompatan lebih dari 300 m (${th}) terlalu dekat dengan tahun terakhir untuk dibedakan antara salah baca citra dan perubahan permanen; belum diperiksa tangan.`; };
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

  /* Dampak (PB-84): kab/kota yang titik robnya berstatus Waspada atau lebih pada hari dari tgl sampai akhir data, dengan penduduk seluruh kab/kota
     (WorldPop lewat paparan_kab.json, kolom jiwa_total). Penduduk BUKAN area tergenang: titik rob hanya titik model. Tanpa pasangan nama yang jelas, jiwa = null. */
  function jiwaKab(pk, prov, kab, kodeProv) {
    const C = Object.entries(pk?.kab || {}).filter(([k]) => k.split("|").slice(1).join("|").toLowerCase() === String(kab).toLowerCase()); if (!C.length) return null;
    const k = C.length === 1 ? C[0] : C.filter(([x]) => kodeProv?.[prov] && x.split("|")[0] === kodeProv[prov]).length === 1 ? C.filter(([x]) => x.split("|")[0] === kodeProv[prov])[0] : null;
    const i = (pk.kolom || []).indexOf("jiwa_total"); return k && i >= 0 && Number.isFinite(k[1][i]) ? k[1][i] : null; }
  function dampakRob(rob, pk, tgl, kodeProv) {
    const d0 = (rob?.hari || []).findIndex(h => h >= tgl), n = rob?.hari?.length || 0; if (d0 < 0 || !rob.titik?.length) return null;
    const K = {};
    for (const t of rob.titik) { let m = -1, hm = null; for (let i = d0; i < n; i++) { const v = t.lv?.[i]; if (v != null && v > m) { m = v; hm = rob.hari[i]; } }
      if (m < 1) continue; const o = K[t.prov + "|" + t.kab] ||= {prov: t.prov, kab: t.kab, lv: 0, titik: 0, hari: null}; o.titik++; if (m > o.lv) { o.lv = m; o.hari = hm; } }
    const L = Object.values(K).map(o => ({...o, jiwa: jiwaKab(pk, o.prov, o.kab, kodeProv)})).sort((a, b) => b.lv - a.lv || (b.jiwa ?? -1) - (a.jiwa ?? -1) || b.titik - a.titik);
    return {sampai: rob.hari[n - 1], daftar: L, jiwa: L.reduce((a, x) => a + (x.jiwa || 0), 0), tanpaJiwa: L.filter(x => x.jiwa == null).length}; }
  /* KI-67: pelabuhan (pelabuhan_kab.json) di kab/kota berstatus rob >= Waspada atau yang titik gelombangnya >= kelas Tinggi (2,5 m) pada hari tgl.
     D = hasil dampakRob (null bila data rob tak mencakup hari itu: status rob tak dikarang, lv 0). Titik gelombang dipasang lewat koordinat tepat. */
  function pelabuhanZona(pel, D, gel, tgl) {
    const rob = new Map((D?.daftar || []).map(x => [x.prov + "|" + x.kab, x])), gi = new Map((gel?.titik || []).map(r => [r[0] + "|" + r[1], r]));
    return (pel?.pelabuhan || []).map(([nama, , , jenis, prov, kab, , gl, go]) => { const g = gl == null ? null : gi.get(gl + "|" + go), hs = g ? hsHari(gel, g, tgl) : null;
      return {nama, jenis, prov, kab, lv: rob.get(prov + "|" + kab)?.lv || 0, hs, kelas: hs == null ? null : kelasGel(hs)[1]}; })
      .filter(x => x.lv >= 1 || (x.hs != null && x.hs >= KELAS_GEL[2][0])).sort((x, y) => y.lv - x.lv || (y.hs ?? -1) - (x.hs ?? -1) || x.nama.localeCompare(y.nama, "id")); }
  /* dampak tercatat kejadian Banjir Rob (DIBI) per kab/kota, seluruh tahun */
  function dampakRiwayat(rob) { const P = {};
    for (const k of rob?.kejadian || []) { const o = P[k.prov + "|" + k.kab] ||= {prov: k.prov, kab: k.kab, n: 0, terdampak: 0, mengungsi: 0, rumah: 0, rusak: 0, meninggal: 0, akhir: ""};
      o.n++; o.terdampak += k.terdampak || 0; o.mengungsi += k.mengungsi || 0; o.rumah += k.rumah_terendam || 0; o.rusak += k.rumah_rusak || 0; o.meninggal += k.meninggal || 0; if (k.tanggal > o.akhir) o.akhir = k.tanggal; }
    return Object.values(P).sort((a, b) => b.terdampak - a.terdampak || b.rumah - a.rumah || b.n - a.n); }

  g.Pesisir = {dampakRob, pelabuhanZona, dampakRiwayat, jiwaKab, ketLompatan, med, KELAS_GEL, kelasGel, tglWIB, hariKe, abrasiTercepat, abrasiBersih, abrasiSitus, tinjau, bersih, BASE, perSitus, seriSitus, robHari, robSeri, robBmkg, robTahun, pasutPekan, hsHari, gelHari, gelBmkg, idxHari};
})(typeof globalThis !== "undefined" ? globalThis : window);
