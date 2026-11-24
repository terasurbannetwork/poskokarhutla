/* Langkah tur laman Kekeringan (mesin dan langkah bersama: inti/tur.js). Pemilik 24 Nov 2026: pilihan tur singkat dan lengkap,
   interaksi seperti klik baris sampai rincian muncul di samping ikut diperagakan lalu dikembalikan. */
(() => {
  const T = window.Tur; if (!T) return; const U = T.umum;
  T.pasang({
    nama: "Kekeringan",
    sapa: "Pantau status kekeringan, hari tanpa hujan, prakiraan, lahan padi, dan kelembapan tanah per wilayah.",
    gambar: "/img/bencana-kekeringan.jpg",
    sorot: [["wilayah", "Per wilayah", "provinsi sampai kabupaten"], ["jam", "Prakiraan", "bulan ke depan"], ["dok", "Laporan harian", "siap dibuka dan dibagikan"]],
    keadaan: {...T.keadaanUmum,
      async provinsi({klik, tunggu}) { if (!await klik("#rows button.tb[data-k]")) return null; return tunggu('#crumb button[data-n]:not([data-n="0"])'); },
      async laci() { return T.telusur("#rows button.tb[data-k]"); },
    },
    pulihkan: T.pulihkanUmum,
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Insight, Berita, Tren, dan halaman lain."},
      {sel: "#modePeta", judul: "Isi peta", isi: "Pilih yang tampil di peta: status, hari tanpa hujan, prakiraan, padi, hujan, tanah, atau kode kering."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian wilayah", isi: "Tekan provinsi lalu kabupaten, rinciannya muncul di samping.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.lapis,
      U.laporan,
      U.turBuka,
    ],
    lengkap: [
      U.bencana,
      ...T.langkahTab(["peta", "insight", "berita", "tren", "dampak", "simulasi", "foto", "tentang", "metode"]),
      U.bahasa, U.upd, U.brief, U.laporan, U.peringatan, U.tema, U.keluar,
      {sel: "#modePeta", judul: "Isi peta", isi: "Status kekeringan, hari tanpa hujan berturut-turut, prakiraan, lahan padi, hujan, kelembapan tanah, atau kode kering."},
      {sel: "#pilihTanggal", judul: "Tanggal data", isi: "Pilih tanggal, daftar berganti menjadi data hari itu."},
      U.cari,
      {sel: "#rows", judul: "Daftar wilayah", isi: "Tiap baris satu wilayah dengan status, indeks hujan, dan jiwa terdampak. Tekan judul kolom untuk mengurutkan."},
      {sel: "#panel", keadaan: "provinsi", judul: "Masuk ke satu wilayah", isi: "Tekan satu provinsi, panel turun ke kabupaten/kota di dalamnya.", peraga: "Kami membuka provinsi teratas untuk Anda."},
      {sel: "#crumb", keadaan: "provinsi", judul: "Kembali ke atas", isi: "Tekan Indonesia di jejak wilayah untuk kembali."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian kabupaten", isi: "Di tingkat kabupaten, baris membuka panel rincian di samping.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.peta, U.lapis, U.legenda, U.turBuka,
    ],
  });
})();
