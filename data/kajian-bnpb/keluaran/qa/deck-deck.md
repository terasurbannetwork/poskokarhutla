# Laporan QA deck deck

Berkas `deck.pptx` dan `deck.pdf`, spek `deck`, diperiksa 25-10-2026 22.15 WIB.
Vonis: **LOLOS**. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Korban bencana alam 2025 tertinggi sejak 2018 walau indeks risiko turun; Grand Design 2026–2030 mengukur keberhasilan dengan indikator korban Renas PB, dan keputusan Kepala BNPB dalam November 2026 menjaga jalur berkala yang berakhir 2027.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 220 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck bangun/pptx/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 17 slide, huruf terkecil 6 pt, 279 angka, judul PDF [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] baris |
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
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > grafik > peta > matriks > kartu-skenario > kartu-skenario > grafik > panel > grafik > tabel > matriks > rekomendasi > rekomendasi > rekomendasi > navigasi |
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
| 2 | navigasi; deskriptif | Pesan Kunci: korban jiwa sebagai ukuran keberhasilan Grand Design, tiga keputusan Kepala BNPB | Tesis, tiga keputusan yang diminta, dan satu temuan per bagian A sampai E |
| 3 | grafik; temuan | A1. Bencana alam 2025 menelan {{angka:dibi.alam.meninggal_hilang.2025}} jiwa meninggal dan hilang, tertinggi sejak 2018 dan {{angka:dibi.alam.rasio_median.2025/fmt=1}} kali median 2015–2024 | Korban naik meskipun indeks turun |
| 4 | peta; temuan | B1. {{angka:irbi.kab.tinggi.2025}} dari {{angka:irbi.kab.dinilai.2025}} kab/kota berstatus Tinggi pada IRBI 2025, terbanyak di {{tempat:Sumatra}} dengan {{angka:irbi.pulau.sumatra.kab_tinggi.2025}} kab/kota | Sebaran risiko dari pulau ke kab/kota |
| 5 | matriks; temuan | B2. {{angka:matriks.mitigasi.kelas5_fatalitas}} dari {{angka:matriks.mitigasi.jenis_lingkup}} jenis bencana berkelas fatalitas tertinggi; peluang lima tahun hanya dapat dinilai untuk {{angka:matriks.mitigasi.kemungkinan_dinilai/satuan}} | Penilaian terbanding semua jenis bencana |
| 6 | kartu-skenario; temuan | C1. Penduduk terpapar tsunami mencapai {{angka:renas.krb.terpapar_tsunami}} jiwa menurut KRB 2022–2026; korban skenario belum dihitung dari genangan resmi | Skenario geologi dinyatakan dengan paparan; korban tsunami belum dapat dihitung |
| 7 | kartu-skenario; temuan | C2. Musim hujan 2025/2026 mencatat {{angka:hidromet.nasional.lantai.meninggal_hilang}} meninggal dan hilang, lantai skenario terburuk hidrometeorologi nasional | Lantai hidrometeorologi dari kejadian nyata, bukan dari pita model |
| 8 | grafik; temuan | C3. Pandemi COVID menjadi analog nonalam terburuk dengan {{angka:nonalam.covid19.meninggal}} kematian tercatat resmi; konflik Maluku sedikitnya {{angka:sosial.maluku.meninggal_bawah}} meninggal | Nonalam dan sosial dikuantifikasi dari analog tanpa perkalian |
| 9 | panel; temuan | D1. Target cakupan peringatan dini 2029: Renstra {{angka:renstra.ikp_peringatan_dini.2029/fmt=2/persen}} lawan Renas PB {{angka:renas.indikator_1c.2029/satuan}}; {{angka:lembaga.celah.n}} celah kewenangan tercatat | Kesenjangan yang menuntut keputusan |
| 10 | grafik; deskriptif | E1. Langkah Grand Design per Fase, Bertaut ke Kode Rekomendasi 2026–2030 | Langkah per fase yang bertaut ke rekomendasi berkode |
| 11 | tabel; deskriptif | E2. Kalender Rencana Aksi Musim Hujan 2026/2027 Tingkat Nasional dan Kesiapan Kemarau 2027 | Apa yang dikerjakan per bulan selama musim hujan dan menjelang kemarau |
| 12 | matriks; temuan | E3. {{angka:lembaga.peran.baris_tertulis}} dari {{angka:lembaga.peran.baris_total}} baris peran lembaga tertulis di norma; {{angka:lembaga.peran.ancaman_tanpa_tertulis}} dari {{angka:lembaga.matriks.ancaman_n/satuan}} tanpa baris khusus jenis | Siapa mengerjakan apa per fase menurut mandat tertulis |
| 13 | rekomendasi; deskriptif | E4. Rekomendasi {{sorot:100 hari}} pertama: keputusan empat belas hari dan langkah sebelum puncak musim hujan | Delapan dari dua belas rekomendasi 100 hari pertama |
| 14 | rekomendasi; deskriptif | E5. Rekomendasi penutup {{sorot:100 hari}} dan awal peta jalan 2026–2027 | Rekomendasi 100 hari sisanya dan awal horizon 2026–2027 |
| 15 | rekomendasi; deskriptif | E6. Rekomendasi lanjutan peta jalan {{sorot:2026–2027}} dan arah 2028–2030 | Rekomendasi lanjutan horizon 2026–2027 dan arah 2028–2030 |
| 16 | navigasi; deskriptif | Kesimpulan: delapan temuan berangka tentang bencana Indonesia dan keputusan yang diminta | Delapan kesimpulan berangka dan keputusan yang sama dengan slide Pesan Kunci |
| 17 | penutup | – | – |
