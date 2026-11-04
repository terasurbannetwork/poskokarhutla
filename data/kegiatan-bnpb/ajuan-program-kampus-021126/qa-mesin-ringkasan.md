# Laporan QA deck Ringkasan Ajuan Program Flagship Campus-first 031126

Berkas `Ringkasan Ajuan Program Flagship Campus-first 031126.pptx` dan `Ringkasan Ajuan Program Flagship Campus-first 031126.pdf`, spek `ringkas-kampus-swasta-031126`, diperiksa 03-11-2026 05.25 WIB.
Vonis: **LOLOS**. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Tiap kampus koordinator memimpin satu flagship yang lahir dari asetnya sendiri, bersama perusahaan yang sudah terbukti bekerja dengannya.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-BoldItalic, Roboto-Italic, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 75 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck scripts/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 20 slide, huruf terkecil 6.5 pt, 155 angka, judul PDF [2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1, 1, 1, 1] baris |
| Tata letak | qa/periksa.py T-2 Jumlah halaman PDF = dokumen asal | LOLOS | – |
| Tata letak | qa/periksa.py D-17 Judul paling banyak 2 baris, tanpa teks terpotong | LOLOS | – |
| Tata letak | qa/periksa.py T-6 Kerangka slide (Buku Pegangan: garis y95 dan y507,6, nomor halaman, pil CUT OFF di slide data) | LOLOS | – |
| Tata letak | qa/periksa.py T-7 Teks slide tidak beririsan; isi >= 7 pt dari tepi bawah panel (Buku Pegangan Alur kerja 4) | LOLOS | – |
| Tata letak | qa/periksa.py D-14 Label keyakinan di tabel dan kartu | LOLOS | – |
| Tata letak | qa/periksa.py D-9 Hex di luar tema.json nol | LOLOS | – |
| Tata letak | qa/periksa.py D-16 Format angka id-ID | LOLOS | – |
| Tata letak | qa/periksa.py D-22 Angka ketikan nol | LOLOS | – |
| Tata letak | qa/periksa.py D-6 Angka silang | LOLOS | – |
| Tata letak | Garis besar: pesan_kunci, lalu pesan, jenis_slide S35, judul_bentuk S7 tiap slide isi (S34) | LOLOS | – |
| Tata letak | Tiap slide isi selain navigasi memuat grafik native, tabel native, atau peta (S36) | LOLOS | – |
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > grafik > panel > tabel > peta > navigasi > matriks > tabel > grafik > panel > rekomendasi |
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
| 1 | sampul | – | – |
| 2 | daftar-isi | – | – |
| 3 | navigasi; deskriptif | Ringkasan: tiap kampus memimpin satu flagship dari asetnya sendiri, dengan calon mitra swasta yang diutamakan dari perusahaan yang sudah bekerja dengannya | Ringkasan ajuan flagship berangkat dari kampus |
| 4 | pembatas-seksi | – | – |
| 5 | grafik; temuan | Program diturunkan dari kampus dalam {{angka:ks.langkah}} langkah, dan mitra swasta dipilih dari {{angka:ks.lapis}} lapis yang dimulai dari perusahaan yang sudah bekerja dengan kampusnya | Program diturunkan dari aset kampus, dan mitra swasta dipilih berlapis |
| 6 | panel; temuan | Kampus koordinator terbagi {{angka:ks.tipe}} tipe, dan tipenya menentukan aset swasta yang paling berguna, dari pabrik sampai karyawan relawan | Tipe kampus menentukan aset swasta yang paling berguna |
| 7 | tabel; temuan | Sumbangan bencana dan litbang ke kampus dapat dibiayakan hingga {{angka:pmk114.batas/persen}} penghasilan neto, tetapi insentif litbang baru dipakai sekitar {{angka:sd.wp}} wajib pajak | Aturan sudah memberi insentif bagi swasta, tetapi jarang dipakai |
| 8 | peta; temuan | Sulawesi mencatat korban jiwa tertinggi, {{angka:dibi.Unhas.mati}} jiwa, dan tiap regional dipimpin satu flagship; {{angka:ks.l1}} di antaranya bercalon mitra lapis satu | Flagship menjangkau semua regional dan sebagian besar memakai mitra yang sudah bekerja dengan kampusnya |
| 9 | navigasi; deskriptif | Dua belas kampus koordinator dan flagship yang dipimpinnya | Dua belas kampus memimpin flagship masing-masing |
| 10 | pembatas-seksi | – | – |
| 11 | matriks; temuan | Sebanyak {{angka:ks.gel1}} flagship paling siap dijalankan pada 2027; {{angka:ks.gel2}} lainnya masuk gelombang kedua setelah celah bukti dan calon mitranya dicek | Flagship dijalankan dalam dua gelombang menurut kesiapannya |
| 12 | tabel; temuan | Sebanyak {{angka:ks.gel1}} flagship gelombang satu yang diminta disetujui untuk 2027 sudah punya bukti lapangan dan calon mitra lapis satu | Lima flagship gelombang satu dan isinya |
| 13 | grafik; temuan | Flagship mengikuti {{angka:ks.tahap}} tahap peta jalan paparan sebelumnya: seratus hari pertama, percontohan 2027, lalu perluasan 2028 sampai 2029 | Flagship berjalan tiga tahap |
| 14 | panel; temuan | Sebanyak {{angka:ks.l3}} calon mitra lapis tiga hanya membawa aset, {{angka:ks.ut}} kelompok wajib uji tuntas, dan perusahaan tersanksi tidak diajukan | Calon mitra berisiko dibedakan: lapis tiga membawa aset saja, sisanya wajib uji tuntas |
| 15 | rekomendasi; temuan | Sebanyak {{angka:ks.keputusan}} langkah yang diminta dari Kepala BNPB untuk memulai flagship kampus dan swasta | Keputusan Kepala BNPB untuk memulai flagship |
| 16 | penutup | – | – |
| 17 | pembatas-lampiran | – | – |
| 18 | lampiran; deskriptif | A1. Daftar flagship dan ajuan pendukung beserta calon mitra | Daftar lengkap ajuan |
| 19 | lampiran; deskriptif | A1. Daftar flagship dan ajuan pendukung beserta calon mitra (lanjutan 2/2) | Daftar lengkap ajuan |
| 20 | lampiran; deskriptif | A2. Celah bukti yang perlu dicek ke kampus dan calon mitra sebelum MoU | Celah bukti yang perlu dicek |
