"use strict";
/* Adaptor Bagikan untuk gunung api: mesin di public/bagikan.js; di sini hanya isi gunung api (level PVMBG, keterangan, tautan).
   Nama, sumber, tagar dari `bagikan` di public/bencana.json. Dimuat sesudah ../bagikan.js dan skrip halaman (butuh S, LEVEL, WARNA_LV). */
(() => {
  let G = null;   /* batas provinsi untuk peta gambar; dimuat saat senggang */
  (window.requestIdleCallback || setTimeout)(() => fetch("../geo/provinsi.json").then(r => r.ok ? r.json() : null).then(j => { G = j; }).catch(() => {}));
  const lv = g => `Level ${LEVEL[g.level][0]} ${LEVEL[g.level][1]}`;
  const aktif = () => S.st.gunung.filter(g => g.level >= 2).sort((a, b) => b.level - a.level || a.nama.localeCompare(b.nama));
  Bagikan.tema.gunungapi = {
    kata: "gunung api",
    siap: () => !!(S.st?.gunung?.length && G),
    tanggal: () => new Date(Date.parse(S.st.dibuat) + 7 * 36e5).toISOString().slice(0, 10),
    acuan: () => S.st.dibuat,
    geo: () => G?.features,
    titik: () => S.st.gunung.filter(g => g.level >= 2).map(g => ({lon: g.lon, lat: g.lat, r: 3 + g.level, w: WARNA_LV[g.level]})),
    teksWil() {
      const n = S.n, tg = Bagikan.tglPendek();
      return `${Bagikan.n(n[4] + n[3])} gunung api berstatus Awas atau Siaga, ${Bagikan.n(n[2])} Waspada, dari ${Bagikan.n(S.st.gunung.length)} gunung yang dipantau PVMBG (${tg}).`;
    },
    keterangan(d, tg) { const K = d.kpi.map(q => q.v);
      return `Gunung api di Indonesia, ${tg}. PVMBG menetapkan ${K[0]} gunung berstatus Level IV (Awas), ${K[1]} Level III (Siaga), dan ${K[2]} Level II (Waspada) dari ${K[3]} gunung yang dipantau.`; },
    /* satu gunung dari pop-up peta: Bagikan.bagi({...Bagikan.konteks("gunung", g), lainnya: () => Bagikan.buka()}) */
    konteks(jenis, g, {o}) {
      if (jenis !== "gunung") return null;
      return {judul: g.nama + " · Centurisk97", teks: `${g.nama} (${g.prov}): ${lv(g)} menurut PVMBG. Pantau gunung api di Centurisk97:`, url: o + (Kejadian.kode(g) ? "/gunungapi/k/" + Kejadian.kode(g) : "/gunungapi/peta"), kampanye: "gunungapi-gunung"};
    },
    data() {
      const n = S.n, A = aktif();
      return {tpl: "ringkas", prov: "", lv: 0, label: "Ringkasan harian", judul: "Status gunung api hari ini",
        sub: `Indonesia · ${Bagikan.n(n[4] + n[3] + n[2])} gunung berstatus Waspada ke atas`,
        kpi: [
          {l: "Level IV (Awas)", s: "Awas", v: Bagikan.n(n[4]), ket: "gunung berstatus Awas", ks: "status PVMBG", w: WARNA_LV[4]},
          {l: "Level III (Siaga)", s: "Siaga", v: Bagikan.n(n[3]), ket: "gunung berstatus Siaga", ks: "status PVMBG", w: WARNA_LV[3]},
          {l: "Level II (Waspada)", s: "Waspada", v: Bagikan.n(n[2]), ket: "gunung berstatus Waspada", ks: "status PVMBG", w: WARNA_LV[2]},
          {l: "Gunung dipantau", s: "Dipantau", v: Bagikan.n(S.st.gunung.length), ket: "gunung api aktif di MAGMA Indonesia", ks: "MAGMA Indonesia", w: WARNA_LV[1]}],
        bar: {judul: "Gunung dengan status tertinggi", pendek: "Gunung berstatus tinggi", rows: A.slice(0, 5).map(g => ({n: g.nama, v: g.level, t: "Level " + LEVEL[g.level][0], w: WARNA_LV[g.level]}))}, rek: [],
        legenda: [[WARNA_LV[4], "Awas"], [WARNA_LV[3], "Siaga"], [WARNA_LV[2], "Waspada"]], petaKet: "Gunung api Waspada ke atas"};
    },
  };
  Bagikan.init("gunungapi");
})();
