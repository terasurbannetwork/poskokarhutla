"use strict";
/* Adaptor Brief pimpinan untuk kekeringan (PB-79a, F-35): tata letak dua halaman A4 ada di public/inti/brief.js; di sini hanya angka dari data yang
   SUDAH dimuat halaman (S.meta, S.wil). Tanpa model baru dan tanpa kalimat kebijakan. Status wilayah dari ambang yang belum lolos uji balik DIBI
   selalu dibawa bersama pil ambang (AMBANG_PIL) di subjudul dan catatan, jadi angka status tidak berdiri tanpa label. Nilai yang tidak ada ditulis "belum tersedia" oleh mesin.
   Dimuat SESUDAH ../inti/brief.js dan skrip halaman (butuh S, LEVEL, namaProv, spiBulan, AMBANG_PIL, AMBANG_KAKI, rb, fmt, F2). */
(() => {
  const tglPanjang = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
  const spi = v => v == null ? null : F2(v);

  /* model murni dari data halaman (dipakai juga oleh uji lewat Brief.kekeringan.bangun) */
  function bangun({meta, wil, nama, spiTeks, ambang, kaki, cutoff}) {
    const N = meta?.nasional, kn = N?.kab_n, pn = N?.prov_n;
    const prov = Object.entries(wil?.prov || {}).filter(([, a]) => a.lv > 0).sort((a, b) => b[1].lv - a[1].lv || b[1].jiwa[0] - a[1].jiwa[0]);
    const awas = Object.entries(wil?.kab || {}).filter(([, a]) => a.lv >= 3).sort((a, b) => b[1].jiwa[0] - a[1].jiwa[0]);
    return {
      nama: "Kekeringan", subjudul: `Brief pimpinan: situasi kekeringan, ${ambang || "ambang masih hipotesis"}`, cutoff, tanggal: meta?.hari_ini ? tglPanjang(meta.hari_ini) : null,
      kpi: [
        {l: "Kabupaten/kota Awas", v: kn ? fmt(kn[2]) : null, k: pn ? `di ${fmt(pn[2])} provinsi` : ""},
        {l: "Kabupaten/kota Siaga atau Awas", v: kn ? fmt(kn[1]) : null, k: kn ? `${fmt(kn[0])} kabupaten/kota Waspada atau lebih` : ""},
        {l: "Jiwa di wilayah Waspada atau lebih", v: N?.jiwa ? jt(N.jiwa[0]) : null, k: N?.total ? `dari ${jt(N.total)} jiwa penduduk` : ""},
        {l: "Jiwa di kecamatan Awas", v: N?.jiwa ? jt(N.jiwa[2]) : null, k: spiTeks ? `SPI ${spiTeks}` : ""}],
      tabel1: {judul: "II. Provinsi berstatus Waspada atau lebih", satuan: "provinsi", kolom: ["Provinsi", "Status", "SPI", "Jiwa terdampak", "Kab./kota Awas"],
        baris: prov.map(([k, a]) => [nama(k), LEVEL[a.lv], spi(a.spi3), rb(a.jiwa[0]), a.kab_n ? fmt(a.kab_n[2]) : null]), kosong: "belum tersedia: tidak ada provinsi berstatus Waspada atau lebih"},
      tabel2: {judul: "III. Kabupaten/kota Awas dengan jiwa terdampak terbanyak", satuan: "kabupaten/kota", kolom: ["Kabupaten/kota", "Provinsi", "SPI", "Jiwa terdampak"],
        baris: awas.slice(0, 10).map(([k, a]) => { const p = k.split("|"); return [p[1], nama(p[0]), spi(a.spi3), rb(a.jiwa[0])]; }), kosong: "belum tersedia: tidak ada kabupaten/kota Awas"},
      sumber: "Sumber: deteksi Centurisk97 dari hujan satelit (SPI), kelembapan tanah, dan kode kekeringan; BMKG hanya menerbitkan peta gambar.",
      catatan: (kaki || "Ambang status masih hipotesis.") + " Jiwa terdampak = penduduk wilayah berstatus, bukan jumlah penerima bantuan."};
  }

  Brief.tema({
    id: "kekeringan",
    siap: () => !!(S.meta && S.wil),
    async data() {
      const m = S.meta;
      return bangun({meta: m, wil: S.wil, nama: namaProv, spiTeks: m?.spi ? spiBulan() : "", ambang: AMBANG_PIL(), kaki: AMBANG_KAKI(), cutoff: m?.dibuat ? jamWIB(m.dibuat) : null});
    }});
  Brief.kekeringan = {bangun};

  /* tombol di kepala halaman, sebelum ikon Laporan harian */
  Brief.pasang('a.iconbtn[href$="laporan.html"]');
})();
