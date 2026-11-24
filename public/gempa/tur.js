/* Langkah tur laman Gempa Bumi (mesin dan langkah bersama: inti/tur.js). Pemilik 24 Nov 2026: pilihan tur singkat dan lengkap,
   interaksi seperti klik baris sampai rincian muncul di samping ikut diperagakan lalu dikembalikan. */
(() => {
  const T = window.Tur; if (!T) return; const U = T.umum;
  T.pasang({
    nama: "Gempa Bumi",
    sapa: "Pantau gempa terkini, gempa yang dirasakan, potensi tsunami, dan riwayat gempa per wilayah.",
    gambar: "/img/bencana-gempa.jpg",
    sorot: [["titik", "Gempa terkini", "langsung dari sumber resmi"], ["wilayah", "Per wilayah", "provinsi dan kabupaten"], ["grafik", "Katalog", "riwayat bisa disaring"]],
    keadaan: {...T.keadaanUmum,
      async provinsi({klik, tunggu}) { if (!await klik("#rows button.tb[data-k]")) return null; return tunggu("#rows button.tb-g[data-g]"); },
      async laci({klik, tunggu}) { if (!await klik("#rows button.tb[data-k]")) return null; await klik("#rows button.tb-g[data-g]"); return tunggu("#laci.on"); },
    },
    pulihkan: T.pulihkanUmum,
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Kejadian, Katalog, Insight, dan halaman lain."},
      {sel: "#panel", judul: "Panel wilayah", isi: "Daftar provinsi dengan jumlah gempa, bisa disaring Semua, Dirasakan, atau M 5 ke atas."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian gempa", isi: "Tekan satu gempa, rinciannya muncul di samping: kekuatan, kedalaman, lokasi, dan wilayah yang merasakan.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.lapis,
      U.laporan,
      U.turBuka,
    ],
    lengkap: [
      U.bencana,
      ...T.langkahTab(["peta", "kejadian", "katalog", "insight", "tren", "berita", "dampak", "sim", "foto", "tentang", "metode"]),
      U.bahasa, U.upd, U.brief, U.laporan, U.peringatan, U.tema, U.keluar,
      {sel: "#pita", judul: "Pita tsunami", isi: "Muncul bila ada peringatan atau potensi tsunami dari sumber resmi."},
      {sel: "#panelMode", judul: "Isi panel", isi: "Terkini untuk gempa dalam rentang waktu yang dipilih, Riwayat untuk tahun-tahun sebelumnya."},
      U.cari,
      {sel: "#rows", judul: "Daftar wilayah", isi: "Saring dengan Semua, Dirasakan, atau M 5+, urutkan lewat judul kolom, dan unduh sebagai CSV."},
      {sel: "#panel", keadaan: "provinsi", judul: "Masuk ke satu wilayah", isi: "Tekan satu provinsi, panel menampilkan daftar gempa di wilayah itu dan peta memperbesar.", peraga: "Kami membuka provinsi teratas untuk Anda."},
      {sel: "#crumb", keadaan: "provinsi", judul: "Kembali ke atas", isi: "Tekan Indonesia di jejak wilayah untuk kembali ke semua provinsi."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian gempa", isi: "Tekan satu gempa, panel rincian muncul di samping dan bisa dibagikan lewat tautan.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      {sel: "#garisWaktu", judul: "Rentang waktu", isi: "Pilih 24 jam, 72 jam, atau 7 hari terakhir."},
      U.peta, U.lapis, U.legenda, U.turBuka,
    ],
  });
})();
