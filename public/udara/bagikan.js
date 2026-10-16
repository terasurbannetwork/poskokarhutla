"use strict";
/* Adaptor Bagikan untuk kualitas udara: mesin di public/bagikan.js; di sini hanya isi udara (jiwa terpapar, PM2,5, keterangan, tautan).
   Nama, sumber, tagar dari `bagikan` di public/bencana.json. Semua angka perkiraan model CAMS, bukan ISPU resmi.
   Dimuat sesudah ../bagikan.js dan skrip halaman (butuh S, namaProv, ROW). */
(() => {
  const ts = p => p[2] + p[3] + p[4];
  const nas = () => S.uk.nasional[0].jiwa;
  Bagikan.tema.udara = {
    kata: "kualitas udara",
    siap: () => !!(S.uk && S.asap),
    tanggal: () => S.uk.hari[0],
    acuan: () => S.uk.dibuat,
    geo: () => S.geo?.features,
    titik: () => S.asap.grid.filter(r => (r[ROW.maks][0] || 0) >= 55.4).slice(0, 500).map(r => ({lat: r[0], lon: r[1], r: 3, w: Bagikan.LV[(r[ROW.maks][0] || 0) >= 150 ? 3 : 2]})),
    teksWil() {
      const n = nas(), tg = Bagikan.tglPendek();
      return `${Bagikan.jiwa(ts(n))} jiwa terpapar udara tidak sehat hari ini, PM2,5 rata-rata ${Bagikan.n(Math.round(S.uk.nasional[0].rata))} µg/m³ (${tg}).`;
    },
    keterangan(d, tg) { const K = d.kpi.map(q => q.v);
      return `Kualitas udara di Indonesia, ${tg}. Perkiraan model CAMS: ${K[0]} jiwa terpapar udara tidak sehat, ${K[1]} di antaranya sangat tidak sehat atau berbahaya. PM2,5 rata-rata penduduk ${K[2]}, ${K[3]} provinsi punya penduduk terpapar. Angka perkiraan model, bukan ISPU resmi.`; },
    data() {
      const n = nas(), P = Object.entries(S.uk.prov).map(([k, hs]) => ({k, p: hs[0], t: ts(hs[0])})).filter(x => x.t > 0).sort((a, b) => b.t - a.t);
      return {tpl: "ringkas", prov: "", lv: 0, label: "Ringkasan harian", judul: "Kualitas udara hari ini",
        sub: `Indonesia · ${Bagikan.jiwa(ts(n))} jiwa terpapar udara tidak sehat (perkiraan model)`,
        kpi: [
          {l: "Jiwa terpapar udara tidak sehat", s: "Tidak sehat", v: Bagikan.jiwa(ts(n)), ket: "PM2,5 di atas batas tidak sehat", ks: "perkiraan model", w: Bagikan.LV[2]},
          {l: "Sangat tidak sehat atau berbahaya", s: "Sangat tidak sehat", v: Bagikan.jiwa(n[3] + n[4]), ket: "jiwa pada kategori terburuk", ks: "kategori terburuk", w: Bagikan.LV[3]},
          {l: "PM2,5 rata-rata penduduk", s: "PM2,5 rata-rata", v: Bagikan.n(Math.round(S.uk.nasional[0].rata)) + " µg/m³", ket: "tertimbang jumlah penduduk", ks: "tertimbang penduduk", w: Bagikan.LV[1]},
          {l: "Provinsi berpenduduk terpapar", s: "Provinsi", v: Bagikan.n(P.length), ket: "punya penduduk di udara tidak sehat", ks: "hari ini", w: Bagikan.LV[2]}],
        bar: {judul: "Provinsi dengan jiwa terpapar terbanyak", pendek: "Jiwa terpapar per provinsi", rows: P.slice(0, 5).map(x => ({n: namaProv(x.k), k: x.k, v: x.t, t: Bagikan.jiwa(x.t) + " jiwa", w: Bagikan.LV[x.p[4] ? 3 : x.p[3] ? 3 : 2]}))}, rek: [],
        legenda: [[Bagikan.LV[3], "Sangat tidak sehat"], [Bagikan.LV[2], "Tidak sehat"], [Bagikan.LV[1], "Sedang"]], petaKet: "PM2,5 tidak sehat atau lebih buruk"};
    },
  };
  Bagikan.init("udara");
})();
