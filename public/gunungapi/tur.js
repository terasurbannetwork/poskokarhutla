/* Langkah tur laman Gunung Api (mesin dan langkah bersama: inti/tur.js). Pemilik 24 Nov 2026: pilihan tur singkat dan lengkap,
   interaksi seperti klik baris sampai rincian muncul di samping ikut diperagakan lalu dikembalikan. */
(() => {
  const T = window.Tur; if (!T) return; const U = T.umum;
  T.pasang({
    nama: "Gunung Api",
    sapa: "Pantau tingkat aktivitas gunung api, radius bahaya, erupsi terbaru, dan sebaran abu.",
    gambar: "/img/bencana-gunungapi.jpg",
    sorot: [["titik", "Tingkat aktivitas", "tiap gunung api"], ["wilayah", "Radius bahaya", "dan sebaran abu"], ["dok", "Laporan harian", "siap dibuka dan dibagikan"]],
    keadaan: {...T.keadaanUmum,
      async laci() { return T.telusur("#rows button.tb[data-n]", 1); },
    },
    pulihkan: T.pulihkanUmum,
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Kejadian, Insight, dan halaman lain."},
      {sel: "#levelSeg", judul: "Saring tingkat", isi: "Tampilkan semua gunung atau hanya yang berstatus Siaga, Waspada, atau Normal."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian gunung api", isi: "Tekan satu gunung, rinciannya muncul di samping: tingkat aktivitas, radius bahaya, dan erupsi terakhir.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.lapis,
      U.laporan,
      U.turBuka,
    ],
    lengkap: [
      U.bencana,
      ...T.langkahTab(["peta", "kejadian", "insight", "berita", "tren", "dampak", "simulasi", "foto", "tentang", "metode"]),
      U.bahasa, U.upd, U.brief, U.laporan, U.peringatan, U.tema, U.keluar,
      {sel: "#levelSeg", judul: "Saring tingkat", isi: "Semua, Siaga, Waspada, atau Normal. Angka di tiap pilihan adalah jumlah gunungnya."},
      {sel: "#pilihTanggal", judul: "Tanggal data", isi: "Pilih tanggal untuk melihat status pada hari itu."},
      U.cari,
      {sel: "#rows", judul: "Daftar gunung api", isi: "Diurutkan dari tingkat tertinggi. Kolom menunjukkan radius bahaya, erupsi, dan tinggi kolom abu."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian gunung api", isi: "Tekan satu gunung, peta terbang ke sana dan panel rincian muncul di samping.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.peta, U.lapis, U.legenda, U.turBuka,
    ],
  });
})();
