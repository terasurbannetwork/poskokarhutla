"use strict";
/* Adaptor Brief pimpinan untuk kualitas udara (PB-85, F-35): mesin tata letak dua halaman A4 ada di public/inti/brief.js; di sini hanya angka dari data yang
   SUDAH dimuat halaman (S.uk, S.prak, Stasiun, Kejadian). Angka provinsi, kab/kota, dan jiwa = perkiraan model CAMS, belum dikoreksi ke alat ukur:
   berlabel hipotesis dan bukan ISPU resmi (D6). Pengukuran stasiun BMKG dipisah, tidak dicampur ke hitungan model. Tanpa model baru, tanpa kalimat kebijakan.
   Nilai yang tidak ada ditulis "belum tersedia" oleh mesin. Dimuat SESUDAH ../inti/brief.js dan skrip halaman (butuh S, KAT, kat, BATAS, namaProv, fmt, kr, jamWIB, Stasiun, Kejadian). */
(() => {
  const tglPanjang = iso => new Date(iso + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
  const des = v => Number(v).toLocaleString("id-ID", {maximumFractionDigits: 0});
  const jiwaTS = a => a[2] + a[3] + a[4];   /* jiwa di Tidak sehat, Sangat tidak sehat, Berbahaya */

  /* model murni (dipakai juga oleh uji lewat Brief.udara.bangun); in = {uk, prak, h, stasiun, kejadian, cutoff} */
  function bangun({uk, prak, h, stasiun, kejadian, cutoff}) {
    const kota = (prak?.kota || []).filter(k => k.jiwa > 0 && k.r24?.[h] != null), tinggi = kota.filter(k => k.r24[h] > BATAS[1]);
    const nas = uk.nasional[h], tsNas = nas ? jiwaTS(nas.jiwa) : null;
    const baris1 = Object.entries(uk.prov).map(([p, hs]) => [p, hs[h]]).filter(([, a]) => a).sort((a, b) => b[1][5] - a[1][5])
      .map(([p, a]) => [namaProv(p), des(a[5]), jiwaTS(a) ? "sekitar " + kr(jiwaTS(a)) : "0", KAT[kat(a[5])].n]);
    const sBmkg = stasiun || [], sTinggi = sBmkg.filter(s => kat(s.v) >= 2).length, aktif = kejadian ? kejadian.filter(k => k.aktif) : null;
    return {
      nama: "Kualitas udara dan asap", subjudul: "Brief pimpinan: perkiraan PM2,5 (model) dan pengukuran stasiun BMKG", cutoff, tanggal: tglPanjang(uk.hari[h]),
      kpi: [
        {l: "Jiwa di Tidak sehat atau lebih (model)", v: tsNas == null ? null : tsNas > 0 ? "sekitar " + kr(tsNas) : "0", k: "perkiraan model CAMS, hipotesis, belum dikoreksi ke alat ukur"},
        {l: "Kab/kota Tidak sehat atau lebih (model)", v: kota.length ? fmt(tinggi.length) : null, k: kota.length ? `dari ${fmt(kota.length)} kab/kota berpenduduk, PM2,5 24 jam di atas 55,4 µg/m³` : ""},
        {l: "PM2,5 rata-rata berbobot jiwa (model)", v: nas ? des(nas.rata) + " µg/m³" : null, k: nas ? KAT[kat(nas.rata)].n : ""},
        {l: "Stasiun BMKG Tidak sehat atau lebih (terukur)", v: sBmkg.length ? fmt(sTinggi) : null, k: sBmkg.length ? `dari ${fmt(sBmkg.length)} stasiun yang melapor, pengukuran bukan model` : "tidak ada stasiun yang melapor segar"}],
      tabel1: {judul: "II. Provinsi menurut PM2,5 rata-rata 24 jam (perkiraan model)", satuan: "provinsi", kolom: ["Provinsi", "PM2,5 (µg/m³)", "Jiwa Tidak sehat atau lebih", "Kategori"], baris: baris1,
        kosong: "belum tersedia: prakiraan model belum dimuat"},
      tabel2: {judul: "III. Kabupaten/kota dengan PM2,5 tertinggi (perkiraan model)", satuan: "kab/kota", kolom: ["Kabupaten/kota", "Provinsi", "PM2,5 (µg/m³)", "Kategori"],
        baris: (uk.kab[h] || []).slice(0, 10).map(r => [r[1], namaProv(r[0]), des(r[2]), KAT[kat(r[2])].n]), kosong: "belum tersedia"},
      daftar: {judul: "IV. Kejadian asap aktif (deteksi Centurisk97, hipotesis)", satuan: "kejadian", kosong: "belum tersedia", item: aktif
        ? aktif.slice(0, 8).map(k => `${k.kode}: ${k.nama}, ${fmt(k.n_kab || 0)} kabupaten atau kota, hipotesis dari prakiraan model`) : []},
      sumber: "Copernicus CAMS lewat Open-Meteo (perkiraan model), WorldPop (penduduk); BMKG (PM2,5 terukur stasiun, dipisah dari model).",
      catatan: "Angka provinsi, kab/kota, dan jiwa adalah perkiraan model dan belum dikoreksi ke alat ukur; bukan ISPU resmi dan bukan pernyataan resmi. Pengukuran stasiun BMKG tidak dicampur ke hitungan model. Wilayah tanpa angka berarti model belum memuatnya."};
  }

  Brief.tema({
    id: "udara",
    siap: () => !!(S.uk && S.prak),
    async data() {
      let kej = null; try { kej = typeof Kejadian !== "undefined" ? await Kejadian.muatAwal() : null; } catch (e) { kej = null; }
      /* berkas kejadian basi atau gagal dimuat (Kejadian.D kosong) = belum tersedia, bukan "0 kejadian" (D16) */
      return bangun({uk: S.uk, prak: S.prak, h: S.hari, stasiun: Stasiun.segar(), kejadian: Array.isArray(kej) && Kejadian.D ? kej : null, cutoff: jamWIB(S.uk.dibuat)});
    }});
  Brief.udara = {bangun};

  /* tombol di kepala halaman, sebelum ikon Laporan harian */
  Brief.pasang('a.iconbtn[href$="laporan.html"]');
})();
