"use strict";
/* Adaptor Bagikan untuk kekeringan: mesin di public/bagikan.js; di sini hanya isi kekeringan (kabupaten/kota per tingkat, jiwa, keterangan).
   Nama, sumber, tagar dari `bagikan` di public/bencana.json. Dimuat sesudah ../bagikan.js dan skrip halaman (butuh S, LEVEL, WARNA_LV, namaProv, rb). */
(() => {
  const nas = () => S.meta.nasional, tp = () => tepat(nas().kab_n).reverse();   /* [awas, siaga, waspada] */
  Bagikan.tema.kekeringan = {
    kata: "kekeringan",
    siap: () => !!(S.meta && S.wil && S.grid),
    tanggal: () => S.meta.hari_ini,
    acuan: () => S.meta.dibuat,
    geo: () => S.geo.prov?.features,
    titik: () => S.grid.grid.filter(r => r[7] >= 2).map(r => ({lat: r[0], lon: r[1], r: 3, w: WARNA_LV[r[7]]})),
    teksWil() {
      const n = nas(), tg = Bagikan.tglPendek();
      return `${Bagikan.n(n.kab_n[2])} kabupaten/kota Awas dan ${Bagikan.n(n.kab_n[1] - n.kab_n[2])} Siaga kekeringan, ${jt(n.jiwa[2])} jiwa tinggal di kecamatan Awas (status gabungan, hujan sampai ${spiBulan()}; ${tg}).`;
    },
    keterangan(d, tg) { const K = d.kpi.map(q => q.v);
      return `Kekeringan di Indonesia, ${tg}. ${K[0]} kabupaten/kota berstatus Awas, ${K[1]} Siaga, dan ${K[2]} Waspada. Sekitar ${jt(nas().jiwa[2])} jiwa tinggal di kecamatan Awas. Hujan (SPI) sampai ${spiBulan()}.`; },
    data() {
      const n = nas(), [aw, si, wa] = tp();
      const P = Object.entries(S.wil.prov).map(([k, v]) => ({k, n: v.jiwa[2], lv: v.lv})).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);
      return {tpl: "ringkas", prov: "", lv: 0, label: "Ringkasan harian", judul: "Kekeringan hari ini",
        sub: `Indonesia · ${Bagikan.n(n.kab_n[2])} kabupaten/kota Awas · SPI ${spiBulan()}`,
        kpi: [
          {l: "Kabupaten/kota Awas", s: "Awas", v: Bagikan.n(aw), ket: "kabupaten/kota berstatus Awas", ks: "status Awas", w: WARNA_LV[3]},
          {l: "Kabupaten/kota Siaga", s: "Siaga", v: Bagikan.n(si), ket: "kabupaten/kota berstatus Siaga", ks: "status Siaga", w: WARNA_LV[2]},
          {l: "Kabupaten/kota Waspada", s: "Waspada", v: Bagikan.n(wa), ket: "kabupaten/kota berstatus Waspada", ks: "status Waspada", w: WARNA_LV[1]},
          {l: "Jiwa di kecamatan Awas", s: "Jiwa", v: rb(n.jiwa[2]), ket: "tinggal di kecamatan Awas", ks: "kecamatan Awas", w: WARNA_LV[3]}],
        bar: {judul: "Provinsi dengan jiwa terbanyak di kecamatan Awas", pendek: "Jiwa di kecamatan Awas", rows: P.map(x => ({n: namaProv(x.k), k: x.k, v: x.n, t: rb(x.n) + " jiwa", w: WARNA_LV[x.lv]}))}, rek: [],
        legenda: [[WARNA_LV[3], "Awas"], [WARNA_LV[2], "Siaga"], [WARNA_LV[1], "Waspada"]], petaKet: "Kekeringan Siaga ke atas"};
    },
  };
  Bagikan.init("kekeringan");
})();
