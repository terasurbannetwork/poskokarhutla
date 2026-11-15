# Laporan QA deck Operasi Lapangan Karhutla dan Centurisk97 151126

Berkas `Operasi Lapangan Karhutla dan Centurisk97 151126.pptx` dan `Operasi Lapangan Karhutla dan Centurisk97 151126.pdf`, spek `lapangan-1511`, diperiksa 15-11-2026 13.22 WIB.
Vonis: **GAGAL** (1 pemeriksaan gagal). Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Cara kerja renlap dan pompa di Kalteng siap diduplikasi, pantauan udara Papua Selatan membuktikan data satelit, dan semuanya berjalan di Centurisk97.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 38 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck scripts/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 4 slide, huruf terkecil 7.4 pt, 32 angka, judul PDF [2, 2, 2, 2] baris |
| Tata letak | qa/periksa.py T-2 Jumlah halaman PDF = dokumen asal | LOLOS | – |
| Tata letak | qa/periksa.py D-17 Judul paling banyak 2 baris, tanpa teks terpotong | LOLOS | – |
| Tata letak | qa/periksa.py T-6 Kerangka slide (Buku Pegangan: garis y95 dan y507,6, nomor halaman, pil CUT OFF di slide data) | LOLOS | – |
| Tata letak | qa/periksa.py T-7 Teks slide tidak beririsan; isi >= 7 pt dari tepi bawah panel (Buku Pegangan Alur kerja 4) | LOLOS | – |
| Tata letak | qa/periksa.py D-14 Label keyakinan di tabel dan kartu | LOLOS | – |
| Tata letak | qa/periksa.py D-9 Hex di luar tema.json nol | LOLOS | – |
| Tata letak | qa/periksa.py D-16 Format angka id-ID | LOLOS | – |
| Tata letak | qa/periksa.py D-22 Angka ketikan nol | GAGAL | slide 2 'TextBox 49': angka "97." diketik, tidak ada di manifest injeksi: "u renlap harian Centurisk97."; slide 4 'TextBox 1': angka "97" diketik, tidak ada di manifest injeksi: "Centurisk97 memantau 8 jenis bencana"; slide 4 'TextBox 61': angka "97" diketik, tidak ada di manifest injeksi: "a dan prakiraan Centurisk97 terbuka untuk publik; la" (dan 1 lagi) |
| Tata letak | qa/periksa.py D-6 Angka silang | LOLOS | – |
| Tata letak | qa/periksa.py D-52 Teks isi dua baris atau lebih rata kanan-kiri | LOLOS | – |
| Tata letak | Garis besar: pesan_kunci, lalu pesan, jenis_slide S35, judul_bentuk S7 tiap slide isi (S34) | LOLOS | – |
| Tata letak | Tiap slide isi selain navigasi memuat grafik native, tabel native, atau peta (S36) | LOLOS | – |
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > panel > panel > navigasi |
| Tata letak | Judul slide isi tidak kembar setelah angka dibuang (S6) | LOLOS | – |
| Tata letak | Paling banyak 6 butir per kotak teks (S38) | LOLOS | – |
| Anti-AI | qa/periksa.py D-1 Em dash nol | LOLOS | – |
| Anti-AI | qa/periksa.py D-2 Titik tengah nol | LOLOS | – |
| Anti-AI | qa/periksa.py D-3 Emoji nol | LOLOS | – |
| Anti-AI | qa/periksa.py D-10 Istilah terlarang nol | LOLOS | – |
| Anti-AI | qa/periksa.py T-4 Bebas AI slop (ANTI-SLOP.md, qa/slop.py ambang final) | LOLOS | – |
| Anti-AI | qa/periksa.py T-8 Ambang anti-AI per bab dan slide: vonis LULUS (Buku Pegangan Angka & copy; qa/slop.py AMBANG_KODE) | LOLOS | – |

## Garis besar (S6, S34)

Judul dibaca berurutan sebagai ringkasan sebelum dikirim.

| Slide | Jenis | Judul | Pesan |
| --- | --- | --- | --- |
| 1 | navigasi; deskriptif | Renlap Kalimantan Tengah memandu regu ke gambut terbakar dekat jalan dan air; satu pompa portabel mengairi {{angka:pp.ha/satuan}} lahan terbakar | Metode renlap Kalteng |
| 2 | panel; deskriptif | Tim mobile yang menyusun renlap dan menaruh pompa di Kalimantan Tengah diduplikasi ke Kalimantan Timur; satu pompa mengairi {{angka:pp.ha/satuan}} | Duplikasi tim mobile |
| 3 | panel; deskriptif | Pantauan udara Merauke menyusuri {{angka:mk.cp.jumlah/satuan}} dari renlap; cluster terpadat di data sama dengan api yang terlihat dari udara | Pantauan udara Papua Selatan |
| 4 | navigasi; deskriptif | Centurisk97 memantau {{angka:ct.bencana/satuan}} di {{angka:pr.kab/satuan}} dalam satu sistem, dari data satelit sampai renlap regu lapangan | Tentang Centurisk97 |
