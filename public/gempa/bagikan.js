"use strict";
/* Adaptor Bagikan untuk gempa: mesin lembar + ekspor gambar tinggal di public/bagikan.js; di sini hanya isi gempa
   (angka ringkasan, kalimat keterangan, tautan). Nama, sumber, dan tagar dari `bagikan` di public/bencana.json.
   Dimuat SESUDAH ../bagikan.js dan skrip halaman (butuh S, mTulis, warnaM, wilayahPendek dari halaman). */
(() => {
  const E7 = () => Date.now() - 7 * 864e5, M5 = () => S.gempa.filter(g => g.m >= 5 && g.t >= E7());
  const kuat = A => A.reduce((a, g) => !a || g.m > a.m ? g : a, null);
  /* ikon KPI khas gempa (mesin hanya punya api/lapis/awas/cuaca; nilai ikon diambil dari Bagikan.IKK) */
  Object.assign(Bagikan.IKK, {gempa: "M2 12h4l2-6 4 12 3-9 2 3h5", rasa: "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4",
    ombak: "M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5S16 16 18 16s2-1.5 4-1.5M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5S16 20 18 20s2-1.5 4-1.5M12 3v7"});
  Bagikan.tema.gempa = {
    kata: "gempa",
    siap: () => !!S.tersedia,
    tanggal: () => new Date(Date.parse(S.dibuat) + 7 * 36e5).toISOString().slice(0, 10),
    acuan: () => S.dibuat,
    geo: () => S.geo?.features,
    titik: () => M5().map(g => ({lon: g.lon, lat: g.lat, r: 1.6 + (g.m - 5) * 1.6, w: warnaM(g.m)})),
    teksWil() {
      const A = M5(), k = kuat(A), tg = Bagikan.tglPendek();
      const jd = jendelaGempa(7, S.gempa.filter(g => g.m >= 5)).teks;
      if (Bagikan.en()) return A.length ? `${Bagikan.n(A.length)} M 5+ earthquakes in the last 7 days, strongest ${mTulis(k.m)}, ${wilayahPendek(k.wilayah)} (${tg}).` : `No M 5+ earthquakes ${jd.startsWith("sejak") ? "since " + jd.slice(6) : "in the last 7 days"} (${tg}).`;
      return A.length ? `${Bagikan.n(A.length)} gempa M 5+ dalam 7 hari terakhir, terkuat ${mTulis(k.m)} di ${wilayahPendek(k.wilayah)} (${tg}).` : `Tidak ada gempa M 5+ ${jd} (${tg}).`;
    },
    keterangan(d, tg) { const K = d.kpi.map(q => q.v);
      if (Bagikan.en()) return `Earthquakes in Indonesia, ${tg}. BMKG and USGS recorded ${K[0]} M 5+ earthquakes in the last 7 days; the strongest ${K[1]}. ${K[2]} were felt by residents and ${K[3]} were declared by BMKG as having tsunami potential.`;
      return `Gempa bumi di Indonesia, ${tg}. BMKG dan USGS mencatat ${K[0]} gempa M 5+ dalam 7 hari terakhir; yang terkuat ${K[1]}. ${K[2]} gempa dirasakan warga, ${K[3]} dinyatakan BMKG berpotensi tsunami.`; },
    data() {
      const A = M5(), k = kuat(A), per = {}; A.forEach(g => { const o = per[g.prov || "-"] ||= {n: 0, m: 0}; o.n++; o.m = Math.max(o.m, g.m); });
      const rasa = S.gempa.filter(g => g.t >= E7() && g.mmi_maks > 0).length, tsu = S.gempa.filter(g => g.t >= E7() && (g.tsunami?.kode ?? 0) >= 1).length;
      const rows = Object.entries(per).sort((a, b) => b[1].n - a[1].n || b[1].m - a[1].m).slice(0, 5)
        .map(([p, o]) => ({n: p === "-" ? "Perairan lepas" : S.nama[p] || p, k: p, v: o.n, t: fmt(o.n) + " gempa", w: warnaM(o.m)}));
      return {tpl: "ringkas", prov: "", lv: 0, label: "Ringkasan harian", judul: "Gempa bumi 7 hari terakhir",
        sub: `Indonesia · ${fmt(A.length)} gempa M 5+${k ? " · terkuat " + mTulis(k.m) : ""}`,
        kpi: [
          {l: "Gempa M 5+ (7 hari)", s: "Gempa M 5+", v: fmt(A.length), ket: `${fmt(A.filter(g => g.m >= 6).length)} di antaranya M 6 atau lebih`, ks: "7 hari terakhir", ik: "gempa", w: Bagikan.LV[2]},
          {l: "Gempa terkuat", s: "Terkuat", v: k ? mTulis(k.m) : "–", ket: k ? wilayahPendek(k.wilayah) : "–", ks: k ? waktuGempa(k.waktu) : "–", ik: "gempa", w: k ? warnaM(k.m) : Bagikan.LV[0]},
          {l: "Dirasakan warga", s: "Dirasakan", v: fmt(rasa), ket: "gempa dengan laporan MMI, 7 hari", ks: "7 hari terakhir", ik: "rasa", w: Bagikan.LV[1]},
          {l: "Berpotensi tsunami", s: "Tsunami", v: fmt(tsu), ket: "menurut status resmi BMKG", ks: "status BMKG", ik: "ombak", w: tsu ? Bagikan.LV[3] : Bagikan.LV[0]}],
        bar: {judul: "Provinsi dengan gempa M 5+ terbanyak", pendek: "Gempa M 5+ per provinsi", rows}, rek: [],
        legenda: [[warnaM(7), "M 7+"], [warnaM(6), "M 6"], [warnaM(5), "M 5"]], petaKet: "Gempa M 5+ tujuh hari terakhir"};
    },
  };
  Bagikan.init("gempa");
})();
