"use strict";
/* Adaptor Bagikan untuk cuaca ekstrem: mesin di public/bagikan.js; di sini hanya isi cuaca (angka hari ini, keterangan, tautan).
   Nama, sumber, tagar dari `bagikan` di public/bencana.json. Dimuat sesudah ../bagikan.js dan skrip halaman (butuh S, Insight, namaProv, warnaHujan, warnaAngin). */
(() => {
  const nm = k => namaProv(k);
  const hari = () => {   /* hari ini: sel terlebat per provinsi */
    const P = {}; for (const r of S.pr.sel) { const p = P[r[2]] ||= {k: r[2], hujan: 0, angin: 0}; p.hujan = Math.max(p.hujan, r[3][S.h0] || 0); p.angin = Math.max(p.angin, r[4][S.h0] || 0); }
    return Object.values(P); };
  Bagikan.tema.cuaca = {
    kata: "cuaca ekstrem",
    siap: () => !!(S.pr && S.meta),
    tanggal: () => S.pr.hari[S.h0],
    acuan: () => S.meta.dibuat,
    geo: () => S.geo?.features,
    titik: () => S.pr.sel.filter(r => (r[3][S.h0] || 0) >= 50).slice(0, 400).map(r => ({lon: r[1], lat: r[0], r: 3, w: warnaHujan(r[3][S.h0])})),
    teksWil() {
      const h = Insight.maksHari(S.h0, 3), a = Insight.maksHari(S.h0, 4), tg = Bagikan.tglPendek();
      return h.r ? `Hujan terlebat ${Bagikan.n(Math.round(h.v))} mm di ${nm(h.r[2])}, embusan terkuat ${Bagikan.n(Math.round(a.v))} km/jam, ${Bagikan.n(S.nc.length)} peringatan nowcast BMKG berlaku (${tg}).` : `Cuaca ekstrem hari ini (${tg}).`;
    },
    keterangan(d, tg) { const K = d.kpi.map(q => q.v);
      return `Cuaca ekstrem di Indonesia, ${tg}. Hujan terlebat diprakirakan ${K[0]}, embusan angin terkuat ${K[1]}. ${K[2]} peringatan nowcast BMKG masih berlaku dan ${K[3]} provinsi berada dalam peringatan gelombang tinggi.`; },
    data() {
      const h = Insight.maksHari(S.h0, 3), a = Insight.maksHari(S.h0, 4), P = hari().sort((x, y) => y.hujan - x.hujan).slice(0, 5);
      const nKec = S.nc.reduce((s, x) => s + x.n, 0), top = S.nc.reduce((m, x) => Math.max(m, ["Minor", "Moderate", "Severe", "Extreme"].indexOf(x.severity)), -1);
      return {tpl: "ringkas", prov: "", lv: 0, label: "Ringkasan harian", judul: "Cuaca ekstrem hari ini",
        sub: `Indonesia · ${fmt(S.nc.length)} peringatan nowcast · hujan hingga ${fmt(Math.round(h.v))} mm`,
        kpi: [
          {l: "Hujan terlebat", s: "Hujan terlebat", v: fmt(Math.round(h.v)) + " mm", ket: h.r ? "di " + nm(h.r[2]) : "–", ks: h.r ? nm(h.r[2]) : "–", w: warnaHujan(h.v)},
          {l: "Embusan angin terkuat", s: "Embusan", v: fmt(Math.round(a.v)) + " km/jam", ket: a.r ? "di " + nm(a.r[2]) : "–", ks: a.r ? nm(a.r[2]) : "–", w: warnaAngin(a.v)},
          {l: "Peringatan nowcast BMKG", s: "Nowcast", v: fmt(S.nc.length), ket: `${fmt(nKec)} kecamatan dalam peringatan`, ks: `${fmt(nKec)} kecamatan`, w: top < 0 ? Bagikan.LV[0] : Object.values(WARNA_SEV)[top]},
          {l: "Provinsi bergelombang tinggi", s: "Gelombang", v: fmt(S.gl.length), ket: "peringatan BMKG Maritim yang berlaku", ks: "BMKG Maritim", w: "#3f7fb8"}],
        bar: {judul: "Provinsi dengan hujan terlebat hari ini", pendek: "Hujan terlebat per provinsi", rows: P.map(p => ({n: nm(p.k), k: p.k, v: p.hujan, t: fmt(Math.round(p.hujan)) + " mm", w: warnaHujan(p.hujan)}))}, rek: [],
        legenda: [[WARNA_LV[3], "Ekstrem"], [WARNA_LV[2], "Sangat lebat"], ["#c99a1e", "Lebat"]], petaKet: "Hujan 50 mm atau lebih"};
    },
  };
  Bagikan.init("cuaca");
})();
