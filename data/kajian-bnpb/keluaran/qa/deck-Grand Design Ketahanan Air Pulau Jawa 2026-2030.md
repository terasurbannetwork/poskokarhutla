# Laporan QA deck Grand Design Ketahanan Air Pulau Jawa 2026-2030

Berkas `Grand Design Ketahanan Air Pulau Jawa 2026-2030.pptx` dan `Grand Design Ketahanan Air Pulau Jawa 2026-2030.pdf`, spek `deck`, diperiksa 24-10-2026 14.52 WIB.
Vonis: **LOLOS**. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Musim hujan Jawa diukur dengan korban jiwa karena longsor dan banjir mencatat korban terbanyak, musim kemarau dengan gangguan air bersih; keputusan Kepala BNPB dalam November 2026 menentukan apakah 100 hari pertama selesai di puncak musim hujan.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 211 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck bangun/pptx/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 17 slide, huruf terkecil 6.4 pt, 262 angka, judul PDF [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2] baris |
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
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > tabel > peta > kartu-skenario > peta > peta > kartu-skenario > matriks > tabel > grafik > tabel > rekomendasi > rekomendasi > rekomendasi > navigasi |
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
| 2 | navigasi; deskriptif | Pesan Kunci: ukuran keberhasilan musim hujan dan musim kemarau, tiga keputusan Kepala BNPB | Tesis, tiga keputusan yang diminta, dan satu temuan per bagian A sampai E |
| 3 | tabel; temuan | A1. Muka tanah di stasiun GNSS Kota Pekalongan turun {{angka:airjawa.turun_tanah.pekalongan.gnss_cpkl/satuan}} pada 2010–2021, tercepat di antara stasiun pesisir utara Jawa | Penurunan muka tanah pesisir utara adalah kondisi air kronis yang memperbesar rob |
| 4 | peta; temuan | B1. {{angka:perhatian.air.kekeringan.n}} kab/kota masuk daftar perhatian kekeringan, {{angka:perhatian.air.kekeringan.n_syarat_d}} di antaranya lewat syarat daerah irigasi kewenangan pusat | Daftar perhatian kekeringan disusun dengan syarat; peta resmi dan catatan lapangan berbeda |
| 5 | kartu-skenario; temuan | B2. Skenario kemarau tidak lebih ringan dari {{angka:dibi.jawa.kab_kekeringan.2019}} kab/kota (2019) dan {{angka:hidromet.jawa.kekeringan.dibi_terdampak_2018/ringkas}} jiwa terdampak (2018) | Kartu kemarau memakai lantai tercatat per metrik, tanpa keluaran model |
| 6 | peta; temuan | C1. Tanah longsor mencatat {{angka:dibi.jawa.longsor.meninggal_2015_2026}} dari {{angka:dibi.jawa.meninggal_hidromet_2015_2026}} korban meninggal hidrometeorologi di Pulau Jawa pada 2015–2026 | Tanah longsor adalah bahaya musim hujan paling mematikan di Jawa |
| 7 | peta; temuan | C2. Banjir memaksa {{angka:dibi.jawa.banjir.mengungsi_2015_2026/ringkas}} jiwa mengungsi, {{angka:dibi.jawa.banjir.porsi_mengungsi_persen/persen}} pengungsi hidrometeorologi di Pulau Jawa pada 2015–2026 | Banjir adalah bahaya musim hujan dengan pengungsi terbanyak di Jawa |
| 8 | kartu-skenario; temuan | C3. Musim hujan 2026/2027 direncanakan tidak lebih ringan dari {{angka:hidromet.jawa.lantai.meninggal_hilang}} meninggal dan hilang, angka musim 2008/2009 | Lantai skenario musim hujan 2026/2027 dan kepekaan peringatan dini |
| 9 | matriks; temuan | D1. Tidak satu pun dari {{angka:lembaga.matriks_air.baris_total}} baris kewenangan air menyebut BNPB; peringatan dini baru memenuhi {{angka:renstra.pd_keterpenuhan_persen/persen}} masyarakat terpapar | Kesenjangan kewenangan dan peringatan dini yang menahan kerja BNPB di air |
| 10 | tabel; temuan | D2. Hanya {{angka:air.sel_program.bukti_kuat_sedang}} dari {{angka:air.sel_program.total/satuan}} matriks air punya program berbukti kuat atau sedang; {{angka:program.air.dalam_negeri.wajib_evaluasi}} program dalam negeri wajib evaluasi | Kesenjangan bukti: program air berjalan belum punya evaluasi dampak berpembanding |
| 11 | grafik; deskriptif | E1. Aksi Rencana Aksi Musim Hujan 2026/2027 per Fase, Bertaut ke Kode Rekomendasi | Aksi musim hujan per fase merujuk rekomendasi berkode |
| 12 | tabel; deskriptif | E2. Kalender Rencana Aksi Musim Hujan 2026/2027 dan Kesiapan Musim Kemarau 2027 | Aksi bulanan November 2026 sampai April 2027 dan pemicu kemarau 2027 |
| 13 | rekomendasi; deskriptif | E3. Rekomendasi {{sorot:100 hari}} pertama: langkah sebelum puncak musim hujan 2026/2027 | Delapan dari sembilan rekomendasi 100 hari pertama |
| 14 | rekomendasi; deskriptif | E4. Rekomendasi penutup {{sorot:100 hari}} dan awal peta jalan 2026–2027 | Rekomendasi 100 hari terakhir dan awal horizon 2026–2027 |
| 15 | rekomendasi; deskriptif | E5. Rekomendasi lanjutan peta jalan {{sorot:2026–2027}} dan arah 2028–2030 | Rekomendasi sisa horizon 2026–2027 dan horizon 2028–2030 |
| 16 | navigasi; deskriptif | Kesimpulan: delapan temuan berangka tentang air Pulau Jawa dan keputusan yang diminta | Delapan kesimpulan berangka dan keputusan yang sama dengan slide Pesan Kunci |
| 17 | penutup | – | – |
