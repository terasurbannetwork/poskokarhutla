# Laporan QA deck Paparan Kebencanaan Sumatera Barat 231126

Berkas `Paparan Kebencanaan Sumatera Barat 231126.pptx` dan `Paparan Kebencanaan Sumatera Barat 231126.pdf`, spek `banjir-sumbar`, diperiksa 23-11-2026 13.18 WIB.
Vonis: **GAGAL** (2 pemeriksaan gagal). Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Banjir dan longsor 2025 menelan korban terbesar di Sumatera Barat; di awal musim hujan 2026 banjir kembali melanda dan kecamatan berstatus banjir perlu disiapkan.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 143 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck scripts/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 16 slide, huruf terkecil 6.5 pt, 544 angka, judul PDF [3, 2, 2, 2, 2, 1] baris |
| Tata letak | qa/periksa.py T-2 Jumlah halaman PDF = dokumen asal | LOLOS | – |
| Tata letak | qa/periksa.py D-17 Judul paling banyak 2 baris, tanpa teks terpotong | GAGAL | slide 7 'TextBox 1': judul 3 baris (perkiraan lebar teks) > 2; slide 8 'TextBox 1': judul 3 baris (perkiraan lebar teks) > 2; slide 9 'TextBox 1': judul 3 baris (perkiraan lebar teks) > 2 (dan 1 lagi) |
| Tata letak | qa/periksa.py T-6 Kerangka slide (Buku Pegangan: garis y95 dan y507,6, nomor halaman, pil CUT OFF di slide data) | LOLOS | – |
| Tata letak | qa/periksa.py T-7 Teks slide tidak beririsan; isi >= 7 pt dari tepi bawah panel (Buku Pegangan Alur kerja 4) | GAGAL | slide 10: teks "Hujan tiga hari 80 mm atau ..." berjarak 0.0 pt dari tepi bawah panel (< 7 pt, tema.json qa.jarak_tepi_bawah_panel_pt) |
| Tata letak | qa/periksa.py D-14 Label keyakinan di tabel dan kartu | LOLOS | – |
| Tata letak | qa/periksa.py D-9 Hex di luar tema.json nol | LOLOS | – |
| Tata letak | qa/periksa.py D-16 Format angka id-ID | LOLOS | – |
| Tata letak | qa/periksa.py D-22 Angka ketikan nol | LOLOS | – |
| Tata letak | qa/periksa.py D-6 Angka silang | LOLOS | – |
| Tata letak | qa/periksa.py D-52 Teks isi dua baris atau lebih rata kanan-kiri | LOLOS | – |
| Tata letak | Garis besar: pesan_kunci, lalu pesan, jenis_slide S35, judul_bentuk S7 tiap slide isi (S34) | LOLOS | – |
| Tata letak | Tiap slide isi selain navigasi memuat grafik native, tabel native, atau peta (S36) | LOLOS | – |
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | tabel > grafik > peta > matriks |
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
| 3 | impor | – | – |
| 4 | pembatas-seksi | – | – |
| 5 | tabel; deskriptif | Banjir dan Longsor 2025: {{angka:wb.sb.25.m/satuan}} Meninggal dan Hilang di {{angka:wb.sb.25.kab/satuan}} Sumatera Barat | Banjir dan longsor 2025 |
| 6 | pembatas-seksi | – | – |
| 7 | impor | – | – |
| 8 | impor | – | – |
| 9 | impor | – | – |
| 10 | impor | – | – |
| 11 | pembatas-seksi | – | – |
| 12 | grafik; temuan | Gempa dan Tsunami: Skor risiko tertinggi {{angka:wb.sb.g.top}} di Kepulauan Mentawai; korban {{angka:wb.sb.g.m/satuan}} sejak 2008 | Gempa dan tsunami |
| 13 | peta; temuan | Karhutla dan Gunung Api: Seluas {{angka:wb.sb.k.luas/satuan}} lahan terbakar sepanjang 2026; Kerinci dan Marapi berstatus Waspada | Karhutla dan gunung api |
| 14 | pembatas-seksi | – | – |
| 15 | matriks; temuan | Bantuan Peralatan dan Logistik 2026 Diserahkan 23 November 2026 kepada {{angka:wb.sb.lg.n/satuan}} di Sumatera Barat | Bantuan logistik |
| 16 | penutup | – | – |
