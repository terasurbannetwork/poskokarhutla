# QA lapis (b) penyunting substansi: kajian air Bab 8

Berkas: `naskah/air/bab-08.md`. Pembanding: `naskah/air/bukti/bab-08.md`, `bab-08.angka.json`, `data/angka.json` dan
`bab-01` sampai `bab-10.angka.json`, KERANGKA §2, §4 (Bab 8), register §6 (lewat `bab-10.md`), `riset/E-dokumen-primer.md`
E8, `kompendium_program.csv`. Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 128 token angka unik (kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai tampil cocok dengan berkas bukti, label keyakinan sah.
  `baca_teks()` atas bab utuh lulus tanpa galat. Semua kunci pustaka yang dikutip ada.
- `qa/slop.py --final`: LOLOS, skor 0 (5.107 kata). Em dash dan titik tengah: nol.
- Hitungan sel matriks dihitung ulang dari `tbl:matriks-komponen`: AW 15 (AW-s 2), PE 6, TB 6, BK 3, jumlah 30; cocok
  dengan token `matriks.air.sel.*`. Daftar 27 kabupaten tiga bahaya, rincian per provinsi (jumlah 98), dan 14 kab tertaut
  BBWS cocok dengan bukti T2.17 dan T2.18. Sembilan belas nama bendungan PSN cocok dengan riset E8. Aritmetika hari ke-100
  benar.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | 8.10 kalimat pembuka | "Destana dan OMC termasuk 7 dari 8 program yang wajib dievaluasi": OMC tidak berbaris di kompendium (bukti T2.12: P01, P04, P10, P11, P12, P14, P15) | Ditulis: 7 dari 8 program kompendium, termasuk Destana, wajib dievaluasi; OMC tidak berbaris di kompendium dan belum punya bukti dampak terukur |
| 2 | Tabel agenda bukti | Baris embung (P10) dan Citarum Harum (P12) yang diwajibkan KERANGKA §4 Tabel 8.6 hilang | Dua baris ditambah dari celah kompendium T5.7 dan pemimpin T2.13; kolom metode tetap usulan penyusun (catatan tabel) |
| 3 | 8.9 kalimat pembuka | Lantai kemarau memakai 76 kab/kota, padahal paragraf yang sama menyatakan jumlah kab/kota mengukur pelaporan; KERANGKA V07 mengganti ukuran itu dengan terdampak tercatat terbesar | Lantai = 4.924.057 terdampak (2018); 76 kab/kota (2019) menjadi pembanding dengan catatan pelaporan |
| 4 | Tabel rekomendasi teknis, baris pesisir | Posisi "aksi wajib (PP 30/2024 Pasal 96)" untuk pemakaian prosedur kegagalan tanggul di rencana kontinjensi BPBD; pasal itu hanya mewajibkan penetapan SOP oleh pengelola sumber daya air (bukti T1.12, I4.1) | Dipisah: SOP wajib; pemakaian di rencana kontinjensi usulan penyusun |
| 5 | Tabel rekomendasi teknis, baris banjir dan longsor | "Aksi wajib" mencakup penyambungan ke platform dan kaji ulang, padahal Pasal 21 Perban 2/2023 berbunyi "dapat" | Dipisah: penetapan per WS wajib (Pasal 96 ayat (1) huruf b); penyambungan dan kaji ulang usulan penyusun |
| 6 | 8.4 paragraf PSN | "Bendungan PSN masuk lapis kedua tbl:bbws" padahal tabel tidak punya kolom PSN | Ditulis bahwa pemetaan per BBWS belum disusun sehingga tidak tampil di tabel |
| 7 | 8.6 kalimat tebal kedua | "Kota pesisir utara turun paling sedikit 9 kali laju muka laut" menggeneralisasi; Susilo dkk. menyebut empat kota, dan CSEM Semarang 0,08 cm/th tercatat di bab yang sama | Ditulis "Jakarta, Pekalongan, Semarang, dan Demak" (bukti T4.7) |
| 8 | 8.3 paragraf 1 | Jaringan tersier Kementan dirujuk ke Permen PUPR 14/2015; bukti T2.3 memakai Permen itu untuk pembagian DI per luas | Kalimat dipecah: pembagian DI per luas (Permen 14/2015); jaringan tersier Kementan |
| 9 | 8.3 paragraf DSP | Pasal 20 ayat (1) Perban 4/2020 dipotong; klausul pertimbangan risiko berdampak luas oleh Kepala BNPB hilang (bukti T2.7) | Klausul ditambah |
| 10 | 8.5 kalimat tebal kedua | Kalimat pembuka temuan tanpa angka (L16) | Diberi angka 87 daerah belum mengaktifkan KRB; singkatan KRB dipindah ke kalimat itu |
| 11 | 8.4 paragraf tiga lapis | RPSDA Serayu-Bogowonto disebut tanpa kutipan | Ditambah @kemenpupr-pola-rpsda-jawa |
| 12 | 8.2 paragraf target nasional | "Naik dari 11.060 menjadi 52.000" tanpa tahun | Tahun 2025 dan 2029 ditambah |
| 13 | 8.8 | Paragraf satu kalimat "Butir RTD ... bertumpu pada catatan ini" | Digabung ke kalimat penutup paragraf sebelumnya |

## Diperiksa dan tidak diubah

- Lantai skenario: musim hujan memakai 270 dengan catatan Situ Gintung (193 dari 270) dan baris kepekaan 237; pita model
  La Niña 250 sampai 550 berlabel estimasi model, belum diuji balik, dan dinyatakan di bawah lantai. Lantai kemarau kini
  terdampak tercatat terbesar (suntingan 3).
- Angka model disandingkan: genangan Novita (estimasi model) dengan pernyataan bahwa genangan teramati belum ada; rob
  Jratunseluna dan defisit air baku berlabel keluaran simulasi atau neraca rencana; EIRR PAMSIMAS disandingkan temuan
  lapangan.
- "Terbukti": kata itu tidak dipakai untuk program apa pun. P16 hanya "padanan program berbukti kuat luar negeri"; PAMSIMAS
  berbukti sedang (program dengan syarat); Destana, polder, sumur resapan, embung, OMC ditulis wajib evaluasi atau belum
  punya bukti dampak.
- Angka bertentangan berdampingan: GNSS CPKL dan CSEM dengan Badan Geologi 2018; penyebab Situ Gintung dua sumber;
  garis dasar peringatan dini RPJMN 6,00% dengan Renstra N/A; semua bencana lawan hidrometeorologi dengan komposisi nonalam
  2025.
- Kewenangan: batas mandat UU 17/2019 Pasal 35 tertulis; RTD tetap pada Pembangun dan Pemilik (PP 37/2010), integrasi ke
  rencana kontinjensi ditandai usulan penyusun; OMC fungsi BMKG; NSPK subsiden pada KLH/BPLH; BNPB tidak disebut regulator.
- Pertanyaan kunci KERANGKA §4 terjawab: sasaran dan garis dasar (8.2, tiga tabel), aksi per komponen dan musim (8.3),
  tenggat sebelum puncak (8.8, kalender dan keputusan 14 hari), dua lapis teknis (tbl:rek-teknis), Tanggul Laut Pantura
  (8.6, kartu temuan), agenda bukti (8.10). Semua komponen yang direncanakan ada (halaman kerangka, Tabel 8.1 sampai 8.7,
  dua garis waktu, kalender, kotak tanggul sebagai `::: temuan`, studi kasus PAMSIMAS).
- Empat Sungai Korea tidak ada di badan teks: sesuai bukti I4.3 (laporan BAI tidak dibuka).

## Sisa untuk orkestrator (di luar berkas ini)

1. KERANGKA §4 meminta Perka 7/2008 "7 liter pada tiga hari pertama, lalu 15 liter"; bukti T2.7 hanya memuat 15 liter dan
   2,5 liter. Naskah memakai angka bukti; bila 7 liter ingin masuk, peneliti perlu menambah kunci dan halaman Perka.
2. Garis dasar kemarau (ii) puso kekeringan per kab/kota (Kementan) dan (iii) kab/kota berstatus siaga atau tanggap darurat
   dari SK (KERANGKA V07) tidak ada di bukti, sehingga tidak ditulis di `tbl:garis-dasar`. Perlu butir bukti bila wajib.
3. Lapis 2 KERANGKA memuat relokasi longsor (R3P Cianjur) dan normalisasi lawan naturalisasi dengan argumen tandingan L63;
   bukti Bab 8 tidak membuka sumbernya (Room for the River sengaja tidak dipetakan, I2.2). Pemilik KERANGKA memutuskan
   apakah butir itu pindah ke bab lain atau dicoret.
4. Instrumen keputusan 14 hari butir 1 ("Perban BNPB 1/2025 Pasal 7") mengikuti `rek:r-a01` di Bab 10; pasal itu mengatur
   peninjauan Renas, bukan penetapan hari ke-0. Konsistensi dijaga; penulis Bab 10 dapat menimbang dasar yang lebih tepat.
5. Inti P5 berkas bukti juga menulis OMC di antara tujuh program wajib evaluasi; perlu dikoreksi di bukti agar tidak
   terulang.
6. Registri: kunci bab ini tersebar di `bab-01` sampai `bab-10.angka.json`; bab gagal dibangun sampai registri digabung.
