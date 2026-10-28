# Laporan QA deck neraca-air-deck

Berkas `neraca-air-deck.pptx` dan `neraca-air-deck.pdf`, spek `deck`, diperiksa 28-10-2026 09.46 WIB.
Vonis: **LOLOS**. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Air Pulau Jawa cukup dalam setahun tetapi kurang di sebagian kab/kota pada musim kemarau; peringkat kab/kota model dipakai sebagai daftar periksa kemarau 2027 bersama data BPBD sambil data pos duga dan waduk diminta untuk validasi.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 94 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck bangun/pptx/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 14 slide, huruf terkecil 6.4 pt, 418 angka, judul PDF [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] baris |
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
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > tabel > peta > tabel > peta > tabel > grafik > peta > tabel > matriks > rekomendasi > navigasi |
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
| 2 | navigasi; deskriptif | Pesan Kunci: air Jawa cukup setahun, kurang di sebagian kab/kota saat kemarau, dan dua keputusan | Tesis, lima temuan, dan dua keputusan yang diminta |
| 3 | tabel; temuan | A1. Kebutuhan konsumtif Jawa {{angka:neraca.jawa.rasio_c_r_persen/persen}} dari limpasan tahunan, naik ke {{angka:neraca.jawa.rasio_c_r_kemarau_persen/persen}} pada Juni–Oktober | Setahun air cukup, kemarau tidak |
| 4 | peta; temuan | A2. Di {{angka:neraca.hitung.rasio_kemarau_lebih_100}} kab/kota kebutuhan Juni–Oktober melebihi limpasan lokalnya; kab/kota ini bergantung pada aliran dari hulu | Kab/kota yang tak bisa memenuhi kemarau dari limpasannya sendiri |
| 5 | tabel; temuan | A3. Air Kabupaten Indramayu {{angka:neraca.kab.indramayu.qin_persen/persen}} berasal dari hulu; delapan dari sepuluh surplus lokal terbesar ada di Jawa Barat dan Banten | Surplus lokal di hulu menjadi pasokan hilir |
| 6 | peta; temuan | B1. {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota kekurangan air Juni–Oktober pada sedikitnya satu dari lima tahun bila irigasi potensial dipenuhi | Neraca kemarau andalan menunjuk kab/kota prioritas |
| 7 | tabel; temuan | B2. {{angka:neraca.kab.n80_1.nama/teks}} mencatat neraca kemarau andalan {{angka:neraca.kab.n80_1.n80/satuan}}, terendah di Pulau Jawa | Kekurangan terdalam di kabupaten beririgasi luas |
| 8 | grafik; temuan | B3. Iklim 1997 membuat neraca Juni–Oktober negatif di {{angka:neraca.skenario.1997.n_kab_neg}} kab/kota, dibanding {{angka:neraca.skenario.klim.n_kab_neg}} pada iklim rerata | Tahun kering menaikkan jumlah kab/kota defisit berlipat |
| 9 | peta; temuan | B4. Cara daya dukung Permen LH menandai {{angka:neraca.hitung.ddl_defisit}} kab/kota defisit; {{angka:neraca.hitung.ddl_defisit_n_positif}} di antaranya punya neraca tahunan positif | Status gaya Permen LH berbeda dengan neraca bulanan |
| 10 | tabel; temuan | C1. Aliran tahunan model {{angka:neraca.validasi.rasio_rentang/rentang}} kali GloFAS di {{angka:neraca.validasi.n_muara}} muara; median Juni–Oktober {{angka:neraca.validasi.rasio_kemarau_median}} kali | Validasi tahunan lolos, kemarau belum |
| 11 | matriks; temuan | C2. Kebutuhan industri kosong di {{angka:neraca.hitung.industri_kosong}} kab/kota dan lima dari enam tampungan waduk bersumber sekunder | Lima celah data menahan label estimasi model |
| 12 | rekomendasi; deskriptif | Rekomendasi {{sorot:100 hari}} dan peta jalan {{sorot:2026–2027}}: langkah, rincian, penanggung jawab | Lima rekomendasi: dua pemakaian dan tiga permintaan data |
| 13 | navigasi; deskriptif | Kesimpulan: delapan temuan berangka tentang neraca air Jawa dan keputusan yang diminta | Delapan kesimpulan berangka dan keputusan yang diminta |
| 14 | penutup | – | – |
