"use strict";
/* Adaptor Brief pimpinan untuk gunung api (PB-79b, F-35): mesin tata letak dua halaman A4 ada di public/inti/brief.js; di sini hanya angka dari status
   PVMBG yang SUDAH dimuat halaman (S.st). Level adalah pernyataan resmi PVMBG apa adanya (tanpa tafsir ulang), tanpa model baru, tanpa kalimat kebijakan.
   Nilai yang tidak ada ditulis "belum tersedia" oleh mesin. Dimuat SESUDAH ../inti/brief.js dan skrip halaman (butuh S, LEVEL, tglJam, fmt). */
(() => {
  const tglPanjang = t => new Date(t).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
  const lv = l => `Level ${LEVEL[l][0]} ${LEVEL[l][1]}`;

  /* model murni dari status gunung api (dipakai juga oleh uji lewat Brief.gunungapi.bangun) */
  function bangun(st, {tglJamFn = tglJam, sekarang = Date.now()} = {}) {
    const G = st.gunung || [], ERU = st.letusan || [], n = l => G.filter(g => g.level === l).length;
    const aktif = G.filter(g => g.level >= 2).sort((a, b) => b.level - a.level || (b.radius_km || 0) - (a.radius_km || 0) || a.nama.localeCompare(b.nama));
    const per = (st.perubahan || []).slice().sort((a, b) => (a.tgl < b.tgl ? 1 : -1));
    const cak = st.letusan_cakupan;
    return {
      nama: "Gunung api", subjudul: "Brief pimpinan: status gunung api menurut PVMBG", cutoff: st.dibuat ? tglJamFn(st.dibuat) : null, tanggal: tglPanjang(sekarang),
      kpi: [
        {l: "Level IV Awas", v: fmt(n(4)), k: "gunung api"},
        {l: "Level III Siaga", v: fmt(n(3)), k: "gunung api"},
        {l: "Level II Waspada", v: fmt(n(2)), k: "gunung api"},
        {l: "Erupsi tercatat", v: ERU.length || cak ? fmt(ERU.length) : null, k: cak ? "pada jendela data MAGMA" : ""}],
      tabel1: {judul: "II. Gunung api berstatus Waspada ke atas", satuan: "gunung", kolom: ["Gunung", "Provinsi", "Status", "Radius"],
        baris: aktif.map(g => [g.nama, g.prov, lv(g.level), g.radius_km ? fmt(g.radius_km) + " km" : "belum tersedia"]), kosong: "belum tersedia: tidak ada gunung api berstatus Waspada ke atas pada data"},
      tabel2: {judul: "III. Erupsi terbaru yang tercatat", satuan: "erupsi", kolom: ["Waktu", "Gunung", "Provinsi"],
        baris: ERU.slice().sort((a, b) => Date.parse(b.waktu) - Date.parse(a.waktu)).slice(0, 10).map(e => [tglJamFn(e.waktu), e.gunung, G.find(g => g.nama === e.gunung)?.prov || "belum tersedia"]), kosong: "belum tersedia"},
      daftar: {judul: "IV. Perubahan level terbaru", satuan: "perubahan", kosong: "belum tersedia",
        item: per.slice(0, 8).map(p => `${p.nama}: dari ${LEVEL[p.dari] ? lv(p.dari) : "belum tersedia"} menjadi ${LEVEL[p.ke] ? lv(p.ke) : "belum tersedia"} (${p.tgl})`)},
      sumber: "Sumber: PVMBG, Badan Geologi KESDM (MAGMA Indonesia): level aktivitas, rekomendasi, dan erupsi tercatat.",
      catatan: "Level adalah pernyataan resmi PVMBG, tidak ditafsir ulang. Level I Normal bukan pernyataan bebas bahaya."};
  }

  Brief.tema({
    id: "gunungapi",
    siap: () => !!S.st?.gunung?.length,
    async data() { return bangun(S.st); }});
  Brief.gunungapi = {bangun};

  /* tombol di kepala halaman, sebelum ikon Laporan harian */
  Brief.pasang('a.iconbtn[href$="laporan.html"]');
})();
