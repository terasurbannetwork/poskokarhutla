/* Tab Foto cuaca ekstrem: galeri, rincian, dan alur kirim ("Ambil foto", Turnstile, EXIF/GPS, batas ukuran, pernyataan) memakai kode yang SAMA dengan karhutla
   dan banjir (public/foto.js, satu implementasi). Berkas ini hanya menandai bencananya; kategori cuaca (pohon tumbang, genangan, atap rusak, lainnya) ada di registry
   public/bencana.json (foto_kategori) dan di server (src/foto.js KAT_BENCANA). Dimuat tepat sebelum ../foto.js di index.html. */
window.FOTO_BENCANA = "cuaca";
