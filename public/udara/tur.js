/* Langkah tur laman Kualitas Udara (mesin dan langkah bersama: inti/tur.js). Pemilik 24 Nov 2026: pilihan tur singkat dan lengkap,
   interaksi seperti klik baris sampai rincian muncul di samping ikut diperagakan lalu dikembalikan. */
(() => {
  const T = window.Tur; if (!T) return; const U = T.umum;
  T.pasang({
    nama: "Kualitas Udara",
    sapa: "Pantau kualitas udara, PM2,5, dan penduduk terpapar asap per provinsi di seluruh Indonesia.",
    gambar: "/img/foto-asap.jpg",
    sorot: [["wilayah", "Per provinsi", "penduduk terpapar"], ["jam", "Prakiraan", "beberapa hari ke depan"], ["dok", "Laporan harian", "siap dibuka dan dibagikan"]],
    keadaan: {...T.keadaanUmum,
      async laci() { return T.telusur("#rows button.tb[data-k]", 1); },
    },
    pulihkan: T.pulihkanUmum,
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Insight, Berita, Tren, dan halaman lain."},
      {sel: "#panel", judul: "Panel provinsi", isi: "Provinsi diurutkan dari penduduk terpapar udara buruk terbanyak."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian provinsi", isi: "Tekan satu provinsi, rinciannya muncul di samping dan peta memperbesar.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.lapis,
      U.laporan,
      U.turBuka,
    ],
    lengkap: [
      U.bencana,
      ...T.langkahTab(["peta", "kejadian", "insight", "berita", "tren", "dampak", "simulasi", "foto", "tentang", "metode"]),
      U.bahasa, U.upd, U.brief, U.laporan, U.peringatan, U.tema, U.keluar,
      U.cari,
      {sel: "#rows", judul: "Daftar provinsi", isi: "Tiap baris satu provinsi: penduduk terpapar dan tingkat udaranya."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian provinsi", isi: "Tekan satu provinsi, panel rincian muncul di samping. Tekan lagi baris yang sama untuk melepas pilihan.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      {sel: "#crumb", keadaan: "laci", judul: "Jejak wilayah", isi: "Menunjukkan provinsi yang dipilih. Tekan Indonesia untuk kembali ke semua provinsi."},
      {sel: "#garisWaktu", judul: "Pilih hari", isi: "Lihat hari ini atau prakiraan hari-hari berikutnya."},
      U.peta, U.lapis, U.legenda, U.turBuka,
    ],
  });
})();
