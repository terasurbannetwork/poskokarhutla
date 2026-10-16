/* Tab Foto banjir: galeri, rincian, dan alur kirim ("Ambil foto", Turnstile, EXIF/GPS, batas ukuran, pernyataan) memakai kode yang SAMA dengan karhutla
   (public/foto.js, satu implementasi). Berkas ini hanya menandai bencananya; kategori banjir (genangan, arus, longsor, rob, evakuasi, lainnya) ada di tabel KAT_AWAL public/foto.js
   dan di server (src/foto.js KAT_BENCANA). Dimuat tepat sebelum ../foto.js di index.html. */
window.FOTO_BENCANA = "banjir";
