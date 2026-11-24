/* Langkah tur laman Banjir (mesin dan langkah bersama: inti/tur.js). Pemilik 24 Nov 2026: pilihan tur singkat dan lengkap,
   interaksi seperti klik baris sampai rincian muncul di samping ikut diperagakan lalu dikembalikan. */
(() => {
  const T = window.Tur; if (!T) return; const U = T.umum;
  T.pasang({
    nama: "Banjir",
    sapa: "Pantau status banjir, hujan, muka air sungai, dan longsor per wilayah di seluruh Indonesia dari satu peta.",
    gambar: "/img/bencana-banjir.jpg",
    sorot: [["wilayah", "Per wilayah", "provinsi sampai kecamatan"], ["jam", "Prakiraan", "beberapa hari ke depan"], ["dok", "Peringatan dini", "dari sumber resmi"]],
    keadaan: {...T.keadaanUmum,
      async provinsi({klik, tunggu}) { if (!await klik("#rows button.tb[data-k]")) return null; return tunggu('#crumb button[data-n]:not([data-n="0"])'); },
      async laci() { return T.telusur("#rows button.tb[data-k]"); },
    },
    pulihkan: T.pulihkanUmum,
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Insight, Longsor, Berita, Tren, dan halaman lain."},
      {sel: "#panel", judul: "Panel wilayah", isi: "Daftar wilayah diurutkan dari status paling tinggi, lengkap dengan hujan dan muka air."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian wilayah", isi: "Tekan wilayah sampai tingkat kecamatan, rinciannya muncul di samping: status, hujan, sungai, dan riwayat kejadian.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.lapis,
      U.peringatan,
      U.turBuka,
    ],
    lengkap: [
      U.bencana,
      ...T.langkahTab(["peta", "insight", "longsor", "berita", "tren", "dampak", "sim", "foto", "metode"]),
      U.bahasa, U.upd, U.peringatan, U.sapa, U.brief, U.tema, U.keluar,
      U.cari,
      {sel: "#utamaSeg", judul: "Isi panel", isi: "Real Time untuk kondisi terkini, Riwayat untuk kejadian tahun-tahun sebelumnya, Wilayah Siaga untuk prakiraan."},
      {sel: "#indikatorSeg", judul: "Indikator", isi: "Pilih yang diwarnai di peta dan panel: banjir, longsor, hujan, atau sungai."},
      {sel: "#rows", judul: "Daftar wilayah", isi: "Tiap baris satu wilayah dengan status dan angkanya. Tekan judul kolom untuk mengurutkan."},
      {sel: "#panel", keadaan: "provinsi", judul: "Masuk ke satu wilayah", isi: "Tekan satu baris, panel turun ke kabupaten/kota di dalamnya dan peta memperbesar.", peraga: "Kami membuka wilayah teratas untuk Anda."},
      {sel: "#crumb", keadaan: "provinsi", judul: "Kembali ke atas", isi: "Jejak wilayah yang sedang dibuka. Tekan Indonesia atau tingkat di atasnya untuk kembali."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian kecamatan", isi: "Di tingkat kecamatan, baris membuka panel rincian di samping: status, hujan, muka air sungai terdekat, dan riwayat kejadian.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      {sel: "#garisWaktu", judul: "Pilih hari", isi: "Lihat hari ini atau prakiraan hari-hari berikutnya. Peta dan panel ikut berganti."},
      U.peta, U.lapis, U.legenda, U.turBuka,
    ],
  });
})();
