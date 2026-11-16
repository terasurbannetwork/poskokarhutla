"use strict";
/* Adaptor Brief pimpinan untuk gempa (PB-72, F-35): mesin tata letak dua halaman A4 ada di public/inti/brief.js; di sini hanya angka
   dari data yang SUDAH dimuat halaman (S.gempa, Sus yang sudah ada di cache). Tanpa model baru, tanpa kalimat kebijakan, tanpa
   tingkat Siaga untuk status provinsi (K12 (c), PB-44). Nilai yang tidak ada ditulis "belum tersedia" oleh mesin.
   Dimuat SESUDAH ../inti/brief.js dan skrip halaman (butuh S, mTulis, wilayahPendek, waktuGempa, ROMAWI, TSUNAMI, NamaWil, fmt). */
(() => {
  const H7 = () => Date.now() - 7 * 864e5;
  const tglPanjang = t => new Date(t).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
  const mmi = g => g.mmi_maks > 0 ? (typeof ROMAWI !== "undefined" ? ROMAWI[Math.min(12, Math.round(g.mmi_maks))] : g.mmi_maks) : "–";
  const nm = k => k === "-" || !k ? "Perairan lepas" : S.nama?.[k] || k;

  /* model murni dari daftar gempa (dipakai juga oleh uji lewat Brief gempa.model bila dimuat) */
  function bangun(gempa, {kejadian, cutoff, sekarang, nama}) {
    const A = gempa.filter(g => g.t >= sekarang - 7 * 864e5), M5 = A.filter(g => g.m >= 5);
    const kuat = [...M5].sort((a, b) => b.m - a.m || b.t - a.t), k = kuat[0];
    const rasa = A.filter(g => g.mmi_maks > 0).length, tsu = A.filter(g => (g.tsunami?.kode ?? 0) >= 1).length;
    const per = {}; M5.forEach(g => { const o = per[g.prov || "-"] ||= {n: 0, m: 0, r: 0}; o.n++; o.m = Math.max(o.m, g.m); if (g.mmi_maks > 0) o.r++; });
    const baris = Object.entries(per).sort((a, b) => b[1].n - a[1].n || b[1].m - a[1].m).map(([p, o]) => [nama(p), fmt(o.n), mTulis(o.m), fmt(o.r)]);
    return {
      nama: "Gempa bumi", subjudul: "Brief pimpinan: situasi gempa 7 hari terakhir", cutoff, tanggal: tglPanjang(sekarang),
      kpi: [
        {l: "Gempa M 5+ (7 hari)", v: fmt(M5.length), k: `${fmt(M5.filter(g => g.m >= 6).length)} di antaranya M 6 atau lebih`},
        {l: "Gempa terkuat", v: k ? mTulis(k.m) : null, k: k ? wilayahPendek(k.wilayah) : ""},
        {l: "Dirasakan warga", v: fmt(rasa), k: "gempa dengan laporan MMI, 7 hari"},
        {l: "Status tsunami BMKG", v: fmt(tsu), k: "gempa dinyatakan berpotensi tsunami, 7 hari"}],
      tabel1: {judul: "II. Provinsi dengan gempa M 5+ dalam 7 hari terakhir", kolom: ["Provinsi", "Gempa M 5+", "Terkuat", "Dirasakan"], baris,
        kosong: "belum tersedia: tidak ada gempa M 5+ pada data 7 hari terakhir"},
      tabel2: {judul: "III. Gempa terkuat 7 hari terakhir", kolom: ["Waktu", "Lokasi", "Kekuatan", "MMI"],
        baris: kuat.slice(0, 10).map(g => [waktuGempa(g.waktu), wilayahPendek(g.wilayah), mTulis(g.m), mmi(g)]), kosong: "belum tersedia"},
      daftar: {judul: "IV. Kejadian gempa aktif", kosong: "belum tersedia", item: kejadian
        ? kejadian.filter(x => x.aktif).sort((a, b) => b.m - a.m).slice(0, 8).map(x => `${x.kode}: ${mTulis(x.m)}, ${wilayahPendek(x.nama)}, ${fmt(Math.max(0, (x.jumlah || 1) - 1))} susulan tercatat`) : []},
      sumber: "Sumber: BMKG dan USGS (katalog gempa), status tsunami resmi BMKG; kejadian aktif dari tab Kejadian.",
      catatan: "Status tsunami hanya dari BMKG; gempa tanpa status berarti BMKG belum menerbitkan pernyataan potensi tsunami untuk gempa itu."};
  }

  Brief.tema({
    id: "gempa",
    siap: () => !!S.tersedia && S.gempa.length > 0,
    async data() {
      if (typeof NamaWil !== "undefined") await NamaWil.siap();   /* nama kab BMKG dirapikan sebelum ditulis (PB-68.1) */
      const kej = typeof Sus !== "undefined" ? Sus._daftar?.v : null;   /* hanya bila tab Kejadian sudah memuat datanya */
      return bangun(S.gempa, {kejadian: Array.isArray(kej) ? kej : null, cutoff: S.dibuat ? waktuGempa(S.dibuat) : null, sekarang: Date.now(), nama: nm});
    }});
  Brief.gempa = {bangun};

  /* tombol di kepala halaman, sebelum ikon Laporan harian */
  Brief.pasang('a.iconbtn[href$="laporan.html"]');
})();
