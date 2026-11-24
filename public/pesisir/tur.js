/* Langkah tur laman Pesisir (mesin dan langkah bersama: inti/tur.js). Pemilik 24 Nov 2026: pilihan tur singkat dan lengkap,
   interaksi seperti klik baris sampai rincian muncul di samping ikut diperagakan lalu dikembalikan. */
(() => {
  const T = window.Tur; if (!T) return; const U = T.umum;
  T.pasang({
    nama: "Pesisir",
    sapa: "Pantau abrasi pantai, banjir rob, pasang surut, dan tinggi ombak di sepanjang pesisir Indonesia.",
    gambar: "/img/bencana-rob.jpg",
    sorot: [["wilayah", "Per lokasi pantai", "abrasi dan rob"], ["jam", "Pasang dan ombak", "beberapa hari ke depan"], ["grafik", "Tren", "riwayat garis pantai"]],
    keadaan: {...T.keadaanUmum,
      async laci() { return T.telusur("#rows button.rw", 1); },
      async rob({klik, tunggu}) { if (!await klik('#panelMode [data-m="rob"]')) return null; return tunggu("#rows button.rw"); },
    },
    // peragaan Rob mengganti jenis pantauan; kembalikan ke Abrasi (bawaan laman)
    pulihkan: async () => { await T.pulihkanUmum(); const a = document.querySelector('#panelMode [data-m="abrasi"]'); if (a && a.getAttribute("aria-pressed") !== "true") a.click(); },
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Insight, Tren, Dampak, dan Metode."},
      {sel: "#panelMode", judul: "Jenis pantauan", isi: "Pilih Abrasi, Rob, Pasang, atau Ombak. Daftar dan peta ikut berganti."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian lokasi", isi: "Tekan satu lokasi di daftar atau peta, rinciannya muncul di samping.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      U.lapis,
      U.upd,
      U.turBuka,
    ],
    lengkap: [
      U.bencana,
      ...T.langkahTab(["peta", "insight", "tren", "dampak", "foto", "metode", "operasi"]),
      U.bahasa, U.upd, U.brief, U.tema, U.keluar,
      {sel: "#panelMode", judul: "Jenis pantauan", isi: "Abrasi untuk laju mundur garis pantai, Rob untuk genangan air laut, Pasang untuk pasang surut, Ombak untuk tinggi gelombang."},
      U.cari,
      {sel: "#rows", judul: "Daftar lokasi", isi: "Lokasi diurutkan dari yang paling parah. Angka di kiri adalah laju perubahan garis pantai per tahun."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian lokasi", isi: "Tekan satu lokasi, panel rincian muncul di samping dan peta terbang ke sana.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X di pojok panel."},
      {sel: "#rows", keadaan: "rob", judul: "Ganti ke Rob", isi: "Pilihan lain mengganti isi daftar. Di Rob, tiap baris lokasi yang berpotensi tergenang air laut.", peraga: "Kami memindahkan pantauan ke Rob."},
      {sel: "#garisWaktu", judul: "Pilih hari", isi: "Lihat hari ini atau hari-hari berikutnya untuk pasang dan ombak."},
      U.peta, U.lapis, U.legenda, U.turBuka,
    ],
  });
})();
