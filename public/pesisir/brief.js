"use strict";
/* Adaptor Brief pimpinan untuk pesisir (PB-86, F-35): mesin tata letak dua halaman A4 ada di public/inti/brief.js; di sini hanya angka dari data yang SUDAH dimuat halaman
   (S.rob, S.abr, S.pas, S.glb). Status rob adalah hipotesis model (D6) dan abrasi perkiraan satelit; peringatan gelombang hanya yang resmi dari BMKG Maritim.
   Tanpa model baru, tanpa kalimat kebijakan. Nilai yang tidak ada ditulis "belum tersedia" oleh mesin (D16). Dimuat SESUDAH ../inti/brief.js dan skrip halaman
   (butuh S, Pesisir, HARI_INI, SEKARANG, tglSgk, jamWIB, namaProv, fmt, m1, TINGKAT). */
(() => {
  const tglPanjang = t => new Date(t).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
  const NM_GEL = ["Tinggi", "Sangat tinggi", "Ekstrem"];

  /* model murni dari data yang sudah dimuat; dipakai juga oleh uji lewat Brief.pesisir.bangun. per = berkas peringatan BMKG (null bila tak terbaca) */
  function bangun({rob, abr, pas, glb, per, tgl, sekarang, cutoff, nama}) {
    const r = rob ? Pesisir.robHari(rob, tgl) : null, ada = r ? r.L.filter(x => x.lv >= 0) : [], status = r ? ada.filter(x => x.lv > 0) : null;
    const D = r ? Pesisir.dampakRob(rob, null, tgl, {}) : null;
    const bersih = abr ? Pesisir.abrasiBersih(abr) : null, S3 = abr ? Pesisir.perSitus(abr).filter(s => s.median != null).sort((a, b) => a.median - b.median) : [];
    const pasHi = pas ? pas.stasiun.map(s => ({s, h: s.hari?.find(h => h[0] === tgl)})).filter(x => x.h && Number.isFinite(x.s.p90)) : null, atas = pasHi ? pasHi.filter(x => x.h[1] >= x.s.p90) : null;
    const tertinggi = (glb || []).reduce((m, o) => Math.max(m, o.lv), 0);
    return {
      nama: "Gelombang pasang dan abrasi", subjudul: "Brief pimpinan: rob, gelombang, pasang surut, dan abrasi pantai", cutoff, tanggal: tglPanjang(sekarang),
      kpi: [
        {l: "Titik rob berstatus Waspada atau lebih", v: status ? fmt(status.length) : null, k: status ? `hipotesis model, dari ${fmt(ada.length)} titik berambang, ${tglSgk(tgl)}` : "data rob tidak mencakup tanggal ini"},
        {l: "Provinsi berperingatan gelombang BMKG", v: per ? fmt(glb.length) : null, k: tertinggi ? `tertinggi: ${NM_GEL[tertinggi - 1].toLowerCase()}` : "tidak ada peringatan gelombang berlaku pada data BMKG"},
        {l: "Stasiun pasang di atas p90", v: atas ? fmt(atas.length) : null, k: pasHi ? `dari ${fmt(pasHi.length)} stasiun berdata ${tglSgk(tgl)}` : "data pasang surut tidak terbaca"},
        {l: "Transek abrasi nyata", v: bersih ? fmt(bersih.length) : null, k: "perkiraan satelit, transek bersih keyakinan sedang atau tinggi"}],
      tabel1: {judul: "II. Kab/kota berstatus rob (hipotesis model)", satuan: "kab/kota", kolom: ["Kab/kota", "Provinsi", "Status tertinggi", "Hari puncak", "Titik"],
        baris: D ? D.daftar.map(x => [x.kab, x.prov, TINGKAT[x.lv][0], tglSgk(x.hari), fmt(x.titik)]) : [],
        kosong: D ? "belum tersedia: tidak ada kab/kota berstatus Waspada atau lebih pada data model, ini bukan pernyataan bahwa pesisir bebas rob" : "belum tersedia: data rob tidak mencakup tanggal ini"},
      tabel2: {judul: "III. Situs abrasi dengan garis pantai paling mundur (perkiraan satelit)", satuan: "situs", kolom: ["Situs", "Kab/kota", "Laju median (m/th)", "Abrasi nyata"],
        baris: S3.slice(0, 10).map(s => [s.nama, s.kab, m1(s.median), fmt(s.abrasi)]), kosong: "belum tersedia"},
      daftar: {judul: "IV. Peringatan gelombang tinggi BMKG Maritim", satuan: "provinsi", kosong: "belum tersedia: tidak ada peringatan gelombang berlaku pada data BMKG",
        item: per ? [...glb].sort((a, b) => b.lv - a.lv || b.total - a.total).slice(0, 8).map(o => `${nama(o.prov)}: ${NM_GEL[o.lv - 1].toLowerCase()}, ${fmt(o.total)} perairan, berlaku sampai ${tglSgk(o.sampai.slice(0, 10))} ${o.sampai.slice(11, 16)} ${o.zona}`) : []},
      sumber: "BMKG Maritim (peringatan gelombang, prediksi pasang surut), Open-Meteo Marine (muka laut dan gelombang model), USGS Landsat lewat Microsoft Planetary Computer (garis pantai).",
      catatan: "Status rob berasal dari muka laut model terhadap ambang tiap titik, belum lolos uji balik, dan bukan peringatan resmi; laju abrasi adalah perkiraan citra satelit yang belum dikoreksi pasang surut dan belum dicek lapangan. Tidak ada peringatan berlaku berarti BMKG belum menerbitkannya, bukan jaminan keadaan lapangan."};
  }

  Brief.tema({
    id: "pesisir",
    siap: () => !!(S.rob || S.abr || S.pas || S.per),
    async data() {
      const w = [["Rob", S.rob?.dibuat], ["Ombak", S.gel?.dibuat], ["Peringatan BMKG", S.per?.dibuat]].filter(x => x[1] && Number.isFinite(Date.parse(x[1])));
      return bangun({rob: S.rob, abr: S.abr, pas: S.pas, glb: S.glb, per: S.per, tgl: HARI_INI(), sekarang: SEKARANG(), cutoff: w.length ? w.map(([n, t]) => `${n} ${jamWIB(t)}`).join(", ") : null, nama: namaProv});
    }});
  Brief.pesisir = {bangun};

  /* tombol di kepala halaman, sebelum tombol ganti tema (pesisir belum punya laporan.html) */
  Brief.pasang("#tema");
})();
