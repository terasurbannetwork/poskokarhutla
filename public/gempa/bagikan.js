"use strict";
/* Adaptor Bagikan untuk gempa: mesin lembar + ekspor gambar tinggal di public/bagikan.js; di sini hanya isi gempa
   (angka ringkasan, kalimat keterangan, tautan). Nama, sumber, dan tagar dari `bagikan` di public/bencana.json.
   Dimuat SESUDAH ../bagikan.js dan skrip halaman (butuh S, mTulis, warnaM, wilayahPendek dari halaman). */
(() => {
  const E7 = () => Date.now() - 7 * 864e5, M5 = () => S.gempa.filter(g => g.m >= 5 && g.t >= E7());
  const kuat = A => A.reduce((a, g) => !a || g.m > a.m ? g : a, null);
  Bagikan.tema.gempa = {
    kata: "gempa",
    siap: () => !!S.tersedia,
    tanggal: () => new Date(Date.parse(S.dibuat) + 7 * 36e5).toISOString().slice(0, 10),
    acuan: () => S.dibuat,
    geo: () => S.geo?.features,
    titik: () => M5().map(g => ({lon: g.lon, lat: g.lat, r: 1.6 + (g.m - 5) * 1.6, w: warnaM(g.m)})),
    teksWil() {
      const A = M5(), k = kuat(A), tg = Bagikan.tglPendek();
      return A.length ? `${Bagikan.n(A.length)} gempa M 5+ dalam 7 hari terakhir, terkuat ${mTulis(k.m)} di ${wilayahPendek(k.wilayah)} (${tg}).` : `Tidak ada gempa M 5+ dalam 7 hari terakhir (${tg}).`;
    },
    keterangan(d, tg) { const K = d.kpi.map(q => q.v);
      return `Gempa bumi di Indonesia, ${tg}. BMKG dan USGS mencatat ${K[0]} gempa M 5+ dalam 7 hari terakhir; yang terkuat ${K[1]}. ${K[2]} gempa dirasakan warga, ${K[3]} dinyatakan BMKG berpotensi tsunami.`; },
    data() {
      const A = M5(), k = kuat(A), per = {}; A.forEach(g => { const o = per[g.prov || "-"] ||= {n: 0, m: 0}; o.n++; o.m = Math.max(o.m, g.m); });
      const rasa = S.gempa.filter(g => g.t >= E7() && g.mmi_maks > 0).length, tsu = S.gempa.filter(g => g.t >= E7() && (g.tsunami?.kode ?? 0) >= 1).length;
      const rows = Object.entries(per).sort((a, b) => b[1].n - a[1].n || b[1].m - a[1].m).slice(0, 5)
        .map(([p, o]) => ({n: p === "-" ? "Perairan lepas" : S.nama[p] || p, k: p, v: o.n, t: fmt(o.n) + " gempa", w: warnaM(o.m)}));
      return {tpl: "ringkas", prov: "", lv: 0, label: "Ringkasan harian", judul: "Gempa bumi 7 hari terakhir",
        sub: `Indonesia · ${fmt(A.length)} gempa M 5+${k ? " · terkuat " + mTulis(k.m) : ""}`,
        kpi: [
          {l: "Gempa M 5+ (7 hari)", s: "Gempa M 5+", v: fmt(A.length), ket: `${fmt(A.filter(g => g.m >= 6).length)} di antaranya M 6 atau lebih`, ks: "7 hari terakhir", w: Bagikan.LV[2]},
          {l: "Gempa terkuat", s: "Terkuat", v: k ? mTulis(k.m) : "–", ket: k ? wilayahPendek(k.wilayah) : "–", ks: k ? waktuGempa(k.waktu) : "–", w: k ? warnaM(k.m) : Bagikan.LV[0]},
          {l: "Dirasakan warga", s: "Dirasakan", v: fmt(rasa), ket: "gempa dengan laporan MMI, 7 hari", ks: "7 hari terakhir", w: Bagikan.LV[1]},
          {l: "Berpotensi tsunami", s: "Tsunami", v: fmt(tsu), ket: "menurut status resmi BMKG", ks: "status BMKG", w: tsu ? Bagikan.LV[3] : Bagikan.LV[0]}],
        bar: {judul: "Provinsi dengan gempa M 5+ terbanyak", pendek: "Gempa M 5+ per provinsi", rows}, rek: [],
        legenda: [[warnaM(7), "M 7+"], [warnaM(6), "M 6"], [warnaM(5), "M 5"]], petaKet: "Gempa M 5+ tujuh hari terakhir"};
    },
  };
  Bagikan.init("gempa");
})();
