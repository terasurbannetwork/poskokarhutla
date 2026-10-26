# Laporan QA deck deck-rehab

Berkas `deck-rehab.pptx` dan `deck-rehab.pdf`, spek `deck`, diperiksa 26-10-2026 03.18 WIB.
Vonis: **LOLOS**. Kosakata vonis LOLOS dan GAGAL mengikuti qa/periksa.py (Buku Pegangan S39); LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah.

Pesan kunci: Waktu pulih air dan akses diusulkan menjadi ukuran keberhasilan rehabilitasi dan rekonstruksi; program jembatan diikat ke rencana RR dan baseline layanan air dibentuk paling lambat 2027.

| Kelompok | Pemeriksaan | Vonis | Rincian |
| --- | --- | --- | --- |
| Font | pdffonts PDF deck hanya Roboto | LOLOS | Roboto-Bold, Roboto-Regular |
| Font | qa/periksa.py D-4 Font hanya Roboto | LOLOS | – |
| Font | qa/periksa.py D-5 Huruf terkecil | LOLOS | – |
| Font | qa/periksa.py D-23 Glif di luar Roboto nol | LOLOS | – |
| Ikon | Gambar raster hanya logo, foto Commons, peta dasar, dan ikon (S37) | LOLOS | – |
| Ikon | Ikon garis dari registri tema.json ikon dalam lingkaran (B5.14; konsep asing ditolak saat membangun) | LOLOS | 137 ikon; D-25 asal ikon per berkas masih antre di qa/cakupan.json |
| Tata letak | Gerbang mesin deck bangun/pptx/periksa.py (footer, nomor, garis bingkai, batas 6 pt, D-17 PDF, D-22, D-24, D-8) | LOLOS | 18 slide, huruf terkecil 6 pt, 160 angka, judul PDF [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] baris |
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
| Tata letak | Dua slide isi berurutan tidak berjenis sama, kecuali seri dan lampiran (S35) | LOLOS | navigasi > grafik > tabel > peta > matriks > tabel > matriks > tabel > matriks > tabel > matriks > tabel > matriks > rekomendasi > rekomendasi > navigasi |
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
| 2 | navigasi; deskriptif | Pesan Kunci: waktu pulih air dan akses sebagai ukuran keberhasilan rehabilitasi dan rekonstruksi, empat keputusan Kepala BNPB | Tesis dan empat keputusan Kepala BNPB dengan temuan penopang |
| 3 | grafik; temuan | A1. Bencana alam merusak {{angka:rehab.dibi.jembatan_rusak.2018_2025}} jembatan pada 2018–2025, {{angka:rehab.dibi.jembatan_rusak.2025}} di antaranya pada 2025 | Beban akses naik tajam pada 2025 |
| 4 | tabel; temuan | A2. Enam kejadian besar sejak 2009 masing-masing merusak lebih dari {{angka:rehab.preseden.ambang_rumah_rusak}} rumah menurut DIBI | Enam kejadian besar sebagai preseden beban RR |
| 5 | peta; temuan | A3. Enam provinsi menanggung {{angka:rehab.dibi.jembatan_rusak.porsi_6prov_persen/fmt=1/persen}} jembatan rusak pada 2018–2025 | Jembatan rusak terkonsentrasi di enam provinsi |
| 6 | matriks; temuan | B1. Program jembatan TNI AD mengerjakan {{angka:rehab.jembatan.garuda.titik_2026_08}} titik, {{angka:rehab.jembatan.garuda.titik_wilayah_bencana_2026_08}} di daerah bencana; biaya satuan dan tautan ke rencana RR tidak diumumkan | Program jembatan yang ada tidak terikat ke rencana RR |
| 7 | tabel; temuan | B2. {{angka:rehab.pipa.sumatra2025.persen_fungsi_mei2026/fmt=1/persen}} dari {{angka:rehab.pipa.sumatra2025.spam_terdampak}} SPAM Sumatra berfungsi pada Mei 2026, tetapi jiwa yang kembali mendapat air tidak tercatat | SPAM Sumatra pulih sebagai unit; jiwa terlayani tidak diketahui |
| 8 | matriks; temuan | B3. Baru {{angka:rehab.pipa.sumatra2025.sumur_bor_selesai_feb2026}} dari {{angka:rehab.pipa.sumatra2025.sumur_bor_feb2026}} sumur bor Kementerian PU untuk Sumatra 2025 selesai per Februari 2026, tanpa data E. coli sumur darurat | Air tanah: sumur Sumatra belum selesai dan mutu tidak dilaporkan |
| 9 | tabel; temuan | C1. Lantai skenario tertinggi: gempa Padang 2009 merusak {{angka:rehab.lantai.gempa.padang2009.rumah_rusak}} rumah dan banjir Sumatra 2025 {{angka:rehab.lantai.banjir.sumatra2025.rumah_rusak}} | Kartu ringkas beban RR tujuh jenis bencana |
| 10 | matriks; temuan | C2. Kemungkinan lima tahun hanya dinilai untuk musim hujan setara lantai ({{angka:hidromet.nasional.lantai.peluang_5_musim/fmt=1/persen}}) dan megathrust Jawa ({{angka:geologi.jawa_gabungan.peluang_5th/fmt=2/persen}}) | Dampak RR dinilai untuk semua jenis, kemungkinan hanya untuk dua |
| 11 | tabel; temuan | D1. Hibah RR mengecualikan {{angka:rehab.hukum.hibah_rr_larangan_pembiayaan_huruf}} jenis pembiayaan, termasuk aset rusak milik pemerintah desa dan lahan | Hibah RR tidak menjangkau aset desa dan lahan |
| 12 | matriks; temuan | D2. DIBI memuat {{angka:rehab.dibi.kolom_dampak_n}} kolom dampak dan {{angka:rehab.dibi.kolom_air_n}} kolom air, sehingga pemulihan air tidak dapat diukur dari data BNPB | DIBI tidak mencatat air dan status jalan |
| 13 | tabel; deskriptif | E1. Kerangka Program dan Alur Tiga Lapis: Sebelas Program dalam Lima Pilar, Tiga Berstatus Sudah Ada | Sebelas program dalam lima pilar dengan status |
| 14 | matriks; deskriptif | E2. Tugas per Lapis: K Koordinasi, P Pelaksana, R Regulator, I Informasi | Mandat tertulis lembaga per lapis dan sektor |
| 15 | rekomendasi; deskriptif | E3. Rekomendasi {{sorot:100 hari}} dan awal peta jalan {{sorot:2026–2027}}: langkah, rincian, penanggung jawab | Delapan rekomendasi pertama: empat dalam 100 hari |
| 16 | rekomendasi; deskriptif | E4. Rekomendasi lanjutan peta jalan {{sorot:2026–2027}} dan arah {{sorot:2028–2030}} (lanjutan) | Tujuh rekomendasi lanjutan sampai 2030 |
| 17 | navigasi; deskriptif | Kesimpulan: delapan temuan berangka tentang air dan akses pascabencana dan keputusan yang diminta | Delapan kesimpulan berangka dan keputusan yang sama dengan Pesan Kunci |
| 18 | penutup | – | – |
