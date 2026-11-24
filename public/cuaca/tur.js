/* Langkah tur laman Cuaca Ekstrem (mesin dan langkah bersama: inti/tur.js). Pemilik 24 Nov 2026: pilihan tur singkat dan lengkap,
   interaksi seperti klik baris sampai rincian muncul di samping ikut diperagakan lalu dikembalikan. */
(() => {
  const T = window.Tur; if (!T) return; const U = T.umum;
  T.pasang({
    nama: "Cuaca Ekstrem",
    sapa: "Pantau hujan lebat, angin kencang, gelombang tinggi, dan status peringatan cuaca per wilayah.",
    gambar: "/img/bencana-cuaca.jpg",
    sorot: [["jam", "Prakiraan", "per jam dan per hari"], ["wilayah", "Status wilayah", "provinsi sampai kecamatan"], ["dok", "Laporan harian", "siap dibuka dan dibagikan"]],
    keadaan: {...T.keadaanUmum,
      async provinsi({klik, tunggu}) { if (!await klik("#rows button[data-st]")) return null; return tunggu("#rows button[data-kb]"); },
      async laci() { return T.telusur("#rows button[data-st], #rows button[data-kb], #rows button[data-kc], #rows button[data-nc], #rows button[data-gl]"); },
    },
    pulihkan: T.pulihkanUmum,
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Insight, Berita, Tren, dan halaman lain."},
      {sel: "#modePeta", judul: "Isi peta", isi: "Pilih yang tampil di peta: hujan, angin, ansambel prakiraan, atau status."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian wilayah", isi: "Tekan wilayah sampai tingkat kecamatan, rinciannya muncul di samping.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.lapis,
      U.laporan,
      U.turBuka,
    ],
    lengkap: [
      U.bencana,
      ...T.langkahTab(["peta", "kejadian", "insight", "berita", "tren", "dampak", "simulasi", "foto", "metode"]),
      U.bahasa, U.upd, U.sapa, U.brief, U.laporan, U.peringatan, U.tema, U.keluar,
      {sel: "#modePeta", judul: "Isi peta", isi: "Hujan dan Angin dari prakiraan, Ansambel untuk peluang dari banyak model, Status untuk tingkat peringatan per wilayah."},
      {sel: "#panelMode", judul: "Isi panel", isi: "Nowcast untuk peringatan beberapa jam ke depan, Gelombang untuk laut, Status untuk tingkat per provinsi."},
      U.cari,
      {sel: "#rows", judul: "Daftar wilayah", isi: "Tiap baris satu provinsi dengan statusnya, diurutkan dari yang paling tinggi."},
      {sel: "#panel", keadaan: "provinsi", judul: "Masuk ke satu wilayah", isi: "Tekan satu baris, panel turun ke kabupaten/kota di dalamnya.", peraga: "Kami membuka provinsi teratas untuk Anda."},
      {sel: "#crumb", keadaan: "provinsi", judul: "Kembali ke atas", isi: "Jejak wilayah yang sedang dibuka. Tekan Indonesia untuk kembali."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian kecamatan", isi: "Di tingkat kecamatan, baris membuka panel rincian di samping dan peta terbang ke sana.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      {sel: "#garisWaktu", judul: "Pilih hari", isi: "Lihat prakiraan untuk hari yang dipilih. Peta dan panel ikut berganti."},
      U.peta, U.lapis, U.legenda, U.turBuka,
    ],
  });
})();
