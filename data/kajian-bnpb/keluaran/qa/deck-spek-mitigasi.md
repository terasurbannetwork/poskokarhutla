# Laporan QA deck spek-mitigasi

Berkas `spek-mitigasi.pptx` dan `spek-mitigasi.pdf`, spek `spek-mitigasi`, diperiksa 24-10-2026 03.19 WIB.
Vonis: **LOLOS**. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Indeks risiko bencana nasional turun dalam sepuluh tahun, tetapi kab/kota berkelas risiko Tinggi masih tersebar luas, terutama di Sumatra.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 40 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck bangun/pptx/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 9 slide, huruf terkecil 6 pt, 252 angka, judul PDF [3, 2, 2, 2, 1, 1, 2] baris |
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
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > grafik > peta > navigasi |
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
| 2 | navigasi; deskriptif | IRB nasional {{angka:irbi.nasional.persen_2015_2024/fmt=1/persen/arah}} pada 2015–2024; {{angka:irbi.kab.tinggi.2023}} dari {{angka:irbi.kab.dinilai.2023}} kab/kota masih berkelas risiko Tinggi pada 2023 | Risiko nasional turun, kelas Tinggi masih luas |
| 3 | grafik; temuan | Indeks risiko bencana nasional {{angka:irbi.nasional.persen_2015_2024/fmt=1/persen/arah}} dalam sepuluh tahun, dari {{angka:irbi.nasional.2015/fmt=2}} menjadi {{angka:irbi.nasional.2024/fmt=2}} | Tren indeks risiko nasional 2015 sampai 2024 |
| 4 | peta; temuan | {{angka:irbi.kab.tinggi.2023}} kab/kota berkelas risiko Tinggi pada 2023, terbanyak di {{tempat:Sumatra}} dengan {{angka:irbi.sumatra.kab_tinggi.2023}} dari {{angka:irbi.sumatra.kab.2023}} kab/kota | Sebaran kab/kota kelas Tinggi per pulau |
| 5 | navigasi; deskriptif | Kesimpulan | Delapan kesimpulan dan arahan |
| 6 | penutup | – | – |
| 7 | pembatas-lampiran | – | – |
| 8 | lampiran; deskriptif | A1. IRB per provinsi 2023, diurutkan dari indeks tertinggi | Rincian indeks per provinsi |
| 9 | lampiran; deskriptif | A1. IRB per provinsi 2023, diurutkan dari indeks tertinggi (lanjutan 2/2) | Rincian indeks per provinsi |
