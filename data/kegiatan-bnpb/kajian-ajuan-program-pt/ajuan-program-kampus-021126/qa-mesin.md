# Laporan QA deck Ajuan Program Flagship Campus-first 031126

Berkas `Ajuan Program Flagship Campus-first 031126.pptx` dan `Ajuan Program Flagship Campus-first 031126.pdf`, spek `kampus-swasta-031126`, diperiksa 03-11-2026 05.24 WIB.
Vonis: **LOLOS**. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Tiap kampus koordinator memimpin satu flagship yang lahir dari asetnya sendiri, bersama perusahaan yang sudah terbukti bekerja dengannya.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-BoldItalic, Roboto-Italic, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 183 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck scripts/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 36 slide, huruf terkecil 6.5 pt, 372 angka, judul PDF [2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1] baris |
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
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > grafik > matriks > tabel > panel > navigasi > peta > tabel > grafik > panel > grafik > tabel > panel > tabel > grafik > panel > grafik > panel > tabel > panel > matriks > tabel > panel > matriks > grafik > rekomendasi |
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
| 6 | matriks; temuan | Kekuatan khas tiap kampus berbeda, dan hanya {{angka:ks.swasta_kuat}} dari {{angka:ks.kampus}} kampus sudah punya jejaring swasta kebencanaan yang kuat | Kekuatan tiap kampus berbeda dan jejaring swasta kebencanaan masih tipis di separuh kampus |
| 7 | tabel; temuan | Di {{angka:dibi.beda}} regional, korban jiwa terbanyak datang dari gempa atau tsunami walau kejadian terbanyaknya banjir atau cuaca ekstrem | Bahaya yang paling sering tidak selalu yang paling mematikan |
| 8 | panel; temuan | Kampus koordinator terbagi {{angka:ks.tipe}} tipe, dan tipenya menentukan aset swasta yang paling berguna, dari pabrik sampai karyawan relawan | Tipe kampus menentukan aset swasta yang paling berguna |
| 9 | pembatas-seksi | – | – |
| 10 | navigasi; deskriptif | Dua belas kampus koordinator dan flagship yang dipimpinnya | Dua belas kampus memimpin flagship masing-masing |
| 11 | peta; temuan | Sulawesi mencatat korban jiwa tertinggi, {{angka:dibi.Unhas.mati}} jiwa, dan tiap regional dipimpin satu flagship; {{angka:ks.l1}} di antaranya bercalon mitra lapis satu | Flagship menjangkau semua regional dan sebagian besar memakai mitra yang sudah bekerja dengan kampusnya |
| 12 | tabel; temuan | USK yang melayani lebih dari {{angka:usk.warga}} warga saat Senyar diusulkan membuka flume tsunami {{angka:usk.flume}} m sebagai pusat uji nasional | Fasilitas uji tsunami USK paling langka di antara kampus koordinator |
| 13 | grafik; temuan | Unand dan Pegadaian sudah menyerahkan model megathrust berisi {{angka:unand.komponen}} komponen; flagship diusulkan menetapkan gedung dan masjid Padang sebagai tempat evakuasi | Cetak biru Unand sudah ada; flagship mengubahnya jadi tempat evakuasi resmi |
| 14 | panel; temuan | Banjir mencapai {{angka:dibi.UI.banjir_pct}} persen kejadian di DKI dan Banten; DRRC UI mengajak calon mitra korporasi menguji keberlangsungan usaha gedung kantornya | UI paling kuat di kesehatan dan keberlangsungan usaha |
| 15 | grafik; temuan | ITB memasang {{angka:itb.muf}} unit pengolah air di Sumatera; bersama calon mitra ParagonCorp, unit itu bisa disiagakan di gudang regional sebelum bencana | Respons teknis ITB dan kedekatan Paragon dipakai untuk air bersih siaga |
| 16 | tabel; temuan | Telkom University membawa laboratorium metaverse ke sekolah; Telkom, yang menyalurkan {{angka:telkom.paket}} paket di Cianjur, diajak mendanai Sekolah Siaga VR | Contoh pemilik: platform Telkom, kampus Tel-U, turun ke sekolah |
| 17 | panel; temuan | Longsor menelan {{angka:dibi.UGM.longsor}} jiwa di Jateng dan DIY; UGM membawa GAMA-EWS yang sudah ada di {{angka:ugm.kab}} kabupaten ke lebih banyak desa bersama calon mitra Telkom | UGM punya produk kebencanaan paling matang |
| 18 | tabel; temuan | Mahasiswa ITS sudah merancang rumah sakit terapung di atas kapal {{angka:its.kapal}} m buatan PT PAL; flagship mematangkan rancangan itu untuk bencana kepulauan | Teknik perkapalan ITS tidak dimiliki kampus koordinator lain |
| 19 | grafik; temuan | Bali dan Nusa Tenggara mencatat {{angka:dibi.Unram.rumah}} rumah rusak, tertinggi antarregional; Unram dan calon mitra AMMAN membawa rumah ferosemen tahan gempa | Unram tuan rumah gempa Lombok; flagship menjawab rumah rusak |
| 20 | panel; temuan | Karhutla mencapai {{angka:dibi.ULM.karhutla}} persen kejadian di Kalimantan; ULM memetakan risiko banjir dan api bersama calon mitra PLN, yang memulihkan {{angka:pln.gardu}} gardu saat banjir 2021 | ULM kuat di data lahan basah; PLN berkepentingan melindungi gardunya |
| 21 | grafik; temuan | Gempa dan tsunami menelan {{angka:dibi.Unhas.gempa}} jiwa di Sulawesi; Unhas memperluas kajian bencana bersama Masmindo ke calon mitra industri lain | Unhas sudah punya MoU kajian bencana dengan perusahaan |
| 22 | panel; temuan | Gempa Ambon 2019 membuat {{angka:ambon.mengungsi}} warga mengungsi; Unpatti membawa kesiapsiagaan tsunami ke pulau kecil bersama calon mitra Telkomsel dan INPEX | Unpatti kampus di dalam zona bencana, kembaran USK untuk pulau kecil |
| 23 | tabel; temuan | IPB sudah melatih {{angka:ipb.peserta}} peserta dari {{angka:ipb.negara}} negara; Akademi Pemadam Gambut diusulkan menyeragamkan latihan semua regu pemadam gambut | Pusat latih api IPB dijadikan tempat sertifikasi regu |
| 24 | panel; temuan | Sebanyak {{angka:ks.kembar}} kelompok kampus saling menguatkan; alat satu kampus ikut dipakai di regional lain | Kampus saling menguatkan lewat kelompok kembaran |
| 25 | pembatas-seksi | – | – |
| 26 | matriks; temuan | Sebanyak {{angka:ks.ajuan}} ajuan program menyentuh keenam unit BNPB, dengan {{angka:ks.pencegahan}} ajuan untuk Pencegahan | Ajuan program menyentuh keenam unit BNPB dan keempat pilar paparan |
| 27 | tabel; temuan | Sumbangan bencana dan litbang ke kampus dapat dibiayakan hingga {{angka:pmk114.batas/persen}} penghasilan neto, tetapi insentif litbang baru dipakai sekitar {{angka:sd.wp}} wajib pajak | Aturan sudah memberi insentif bagi swasta, tetapi jarang dipakai |
| 28 | panel; temuan | Sebanyak {{angka:ks.l3}} calon mitra lapis tiga hanya membawa aset, {{angka:ks.ut}} kelompok wajib uji tuntas, dan perusahaan tersanksi tidak diajukan | Calon mitra berisiko dibedakan: lapis tiga membawa aset saja, sisanya wajib uji tuntas |
| 29 | matriks; temuan | Sebanyak {{angka:ks.gel1}} flagship paling siap dijalankan pada 2027; {{angka:ks.gel2}} lainnya masuk gelombang kedua setelah celah bukti dan calon mitranya dicek | Flagship dijalankan dalam dua gelombang menurut kesiapannya |
| 30 | grafik; temuan | Flagship mengikuti {{angka:ks.tahap}} tahap peta jalan paparan sebelumnya: seratus hari pertama, percontohan 2027, lalu perluasan 2028 sampai 2029 | Flagship berjalan tiga tahap |
| 31 | rekomendasi; temuan | Sebanyak {{angka:ks.keputusan}} langkah yang diminta dari Kepala BNPB untuk memulai flagship kampus dan swasta | Keputusan Kepala BNPB untuk memulai flagship |
| 32 | penutup | – | – |
| 33 | pembatas-lampiran | – | – |
| 34 | lampiran; deskriptif | A1. Daftar flagship dan ajuan pendukung beserta calon mitra | Daftar lengkap ajuan |
| 35 | lampiran; deskriptif | A1. Daftar flagship dan ajuan pendukung beserta calon mitra (lanjutan 2/2) | Daftar lengkap ajuan |
| 36 | lampiran; deskriptif | A2. Celah bukti yang perlu dicek ke kampus dan calon mitra sebelum MoU | Celah bukti yang perlu dicek |
