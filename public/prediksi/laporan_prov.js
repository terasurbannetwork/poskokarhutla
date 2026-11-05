"use strict";
/* laporan_prov.js: fungsi murni tab "Laporan provinsi" /prediksi (gaya laporan FFGS BMKG). Tanpa DOM dan tanpa fetch;
   laporan_layar.js menggambar, tests/prediksi/laporan_prov.test.mjs menjalankannya nyata di node.
   Spec: docs/superpowers/specs/2026-11-04-laporan-prov-banjir-design.md */
(() => {
  /* nama prediksi.json ("Kab. Kep. Siau ...", "Kota Administrasi Jakarta Utara ") dan geo/kabupaten ("Kepulauan Siau ...") -> kunci sama.
     ALIAS = ejaan yang beda huruf, bukan cuma spasi/tanda baca. */
  const ALIAS = {kotapadangsidimpuan: "kotapadangsidempuan"};
  const kunci = n => {
    const k = String(n).trim().toLowerCase().replace(/^kab\.\s+/, "").replace("kota administrasi", "kota")
      .replace(/\bkep\.\s*/g, "kepulauan ").replace(/\bdan\b/g, "").replace(/[^a-z]/g, "");
    return ALIAS[k] || k;
  };

  const cincin = g => !g ? [] : g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : [];
  /* GeoJSON provinsi -> path SVG per kunci kab. Ekuirektangular dengan koreksi cos(lintang tengah); cukup untuk satu provinsi. */
  function petaSvg(geo, lebar = 400) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const f of geo.features) for (const r of cincin(f.geometry)) for (const [x, y] of r) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const c = Math.cos((y0 + y1) / 2 * Math.PI / 180), s = lebar / (((x1 - x0) * c) || 1);
    const px = ([x, y]) => `${((x - x0) * c * s).toFixed(1)},${((y1 - y) * s).toFixed(1)}`;
    const d = {};
    for (const f of geo.features) d[kunci(f.properties.kab)] = cincin(f.geometry).map(r => "M" + r.map(px).join("L") + "Z").join("");
    return {lebar, tinggi: Math.round((y1 - y0) * s), d};
  }

  /* Kelas warna: batas kiri inklusif; warna[i] untuk kelas i; label untuk legenda. */
  const KELAS = {
    hujan: {batas: [1, 20, 50, 100, 150], warna: ["#eef2f7", "#c6dbef", "#6baed6", "#2171b5", "#08306b", "#54278f"],
      label: ["<1", "1–20", "20–50", "50–100", "100–150", "≥150"]},
    lengas: {batas: [0.15, 0.25, 0.35, 0.45], warna: ["#a6611a", "#dfc27d", "#e9eef3", "#80cdc1", "#018571"],
      label: ["<0,15", "0,15–0,25", "0,25–0,35", "0,35–0,45", "≥0,45"]},
    ambang: {batas: [40, 60, 80, 120], warna: ["#7a0177", "#c51b8a", "#f768a1", "#fbb4b9", "#fde0dd"],
      label: ["<40", "40–60", "60–80", "80–120", "≥120"]},
    lebih: {batas: [0.5, 10, 25, 50], warna: ["#eef2f7", "#fee391", "#fe9929", "#d95f0e", "#993404"],
      label: ["tidak lewat", "0,5–10", "10–25", "25–50", "≥50"]},
    level: {batas: [1, 2, 3], warna: ["#e2e8f0", "#f2c94c", "#f2994a", "#c9503a"], label: ["Normal", "Waspada", "Siaga", "Awas"]},
  };
  const TANPA = "#cbd5e1";
  const kelas = (v, batas) => {
    if (v == null || Number.isNaN(v)) return -1;
    let i = 0;
    while (i < batas.length && v >= batas[i]) i++;
    return i;
  };

  const bulat1 = v => Math.round(v * 10) / 10;
  const indeksAmbang = ap => new Map(Object.entries(ap?.ambang_mm || {}).map(([x, v]) => {
    const i = x.indexOf("|");
    return [x.slice(0, i) + "|" + kunci(x.slice(i + 1)), v.waspada];
  }));
  function ambangKab(ap, idx, prov, nama) {
    if (!ap) return null;
    const mm = idx.get(prov + "|" + kunci(nama));
    return mm != null ? {mm, sumber: "kab"} : ap.nasional_mm?.waspada != null ? {mm: ap.nasional_mm.waspada, sumber: "nasional"} : null;
  }
  const lebih = (prak, ambang) => prak == null || ambang == null ? null : bulat1(prak - ambang);

  function susun({d, amatan, lengas, ap, prov}) {
    const ih = c => d.kode.HJN?.kol.indexOf(c), ib = c => d.kode.BNJ?.kol.indexOf(c);
    const hariA = amatan ? Object.keys(amatan).sort().at(-1) : null, a = hariA ? amatan[hariA] : null;
    const idx = indeksAmbang(ap);
    const kab = d.kab.filter(k => k.prov === prov);
    const baris = kab.map(k => {
      const h = k.HJN?.[0], am = ambangKab(ap, idx, prov, k.nama), prak = h ? h[ih("tot")] : null;
      const lv = [0, 1, 2].map(n => k.BNJ?.[n] ? k.BNJ[n][ib("lv")] : null);
      const ps = [0, 1, 2].map(n => k.BNJ?.[n] ? k.BNJ[n][ib("ps")] : null);
      return {id: k.id, nama: k.nama, kunci: kunci(k.nama), hujan: a?.kab[k.id]?.[0] ?? null, lengas: lengas?.kab[k.id] ?? null,
        prak, p50: h ? h[ih("p50")] : null, ambang: am?.mm ?? null, sumberAmbang: am?.sumber ?? null, lebih: lebih(prak, am?.mm), lv, ps};
    });
    return {prov, nama: kab[0]?.pn ?? prov, amatan: a ? {hari: hariA, j: a.j} : null, n: baris.length, baris};
  }

  const lvMaks = b => Math.max(-1, ...b.lv.map(v => v ?? -1));
  const waspada = (baris, n) => baris.filter(b => (b.lv[n - 1] ?? 0) >= 1)
    .sort((a, b) => b.lv[n - 1] - a.lv[n - 1] || a.nama.localeCompare(b.nama, "id"));
  const tabel = baris => baris.filter(b => lvMaks(b) >= 1).sort((a, b) => lvMaks(b) - lvMaks(a) || a.nama.localeCompare(b.nama, "id"));

  window.LaporanProv = {kunci, petaSvg, KELAS, TANPA, kelas, indeksAmbang, ambangKab, lebih, susun, waspada, tabel};
})();
