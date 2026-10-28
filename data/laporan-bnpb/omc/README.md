# Rekap OMC karhutla 2026 (gabungan)

Berkas data: `omc_rekap.csv` (106 baris). Hanya angka yang tertulis di sumber. `tanggal` = tanggal OPERASI. Kolom tambahan: `jam_mulai`, `jam_selesai` (dengan zona WIB/WITA/WIT, hanya bila tertulis), `wilayah_bnpb` (pembagian dari pemilik). `cao_kg` kosong semua: CaO hanya muncul sebagai stok SAM 2.000 kg (WA dan pptx), tidak ada sortie CaO.

Cara gabung: `omc_dari_wa_16-26okt.csv` (tidak disunting) jadi baris utama 16 sampai 26 Okt, termasuk 22 Okt (WA Laporan Penanganan 23 Okt; sebelumnya dari komentar deck, angka sama). Sumber lain yang beda angka disimpan dengan catatan "beda sumber". Baris 27 Okt dari `sumber/wa_27okt_posko_tni_jatim.txt` dan `LAPORAN_HARIAN_OMC_27102026.pptx` (pptx tidak memuat 25 Okt, tidak ada jam). Baris dengan tanggal berbentuk rentang (`..`) dan tanggal kosong adalah agregat/tanpa tanggal dan tidak dijumlahkan.

## Ringkasan per provinsi (baris harian bertanggal, 16 sampai 27 Okt, tanpa agregat dan tanpa baris "beda sumber")

| Provinsi | Wilayah BNPB | Sortie | NaCl (kg) | Dry ice (kg) |
| --- | --- | ---: | ---: | ---: |
| Kalimantan Tengah | I | 66 | 47.000 | 23.800 |
| Papua Selatan (PK-SCG, 27 Okt saja) | I | 2 | 2.000 | 0 |
| Riau | I | 0 | 0 | 0 |
| Sumatera Selatan | II | 55 | 32.600 | 27.700 |
| Jambi | II | 0 | 0 | 0 |
| Lampung (22 Okt, bahan tidak tertulis) | II | 1 | tidak tertulis | tidak tertulis |
| Kalimantan Selatan | III | 13 | 10.000 | 2.100 |
| Kalimantan Barat | III | 10 | 9.400 | 0 |
| Jawa Timur (PK-SCH 26 Okt) | III | 1 | 1.000 | 0 |

Per wilayah BNPB: Wilayah I 70 sortie, 49.000 kg NaCl, 23.800 kg dry ice (Kalteng, Papsel, Riau); Wilayah II 56 sortie, 32.600 kg NaCl, 27.700 kg dry ice (Sumsel, Lampung, Jambi); Wilayah III 24 sortie, 20.400 kg NaCl, 2.100 kg dry ice (Kalsel, Kalbar, Jatim). Tidak ikut: Kaltim (Wilayah II) 30 sortie 28.800 kg NaCl tanpa periode, Jabar (Wilayah II) PK-ALA 1 sortie 1.000 kg NaCl tanpa tanggal, Jatim 24-26 Okt agregat 3 sortie 3.000 kg.

## Rekap resmi posko (Lapsit Posko OMC hari ke-10, 27 Okt) dibanding jumlah baris harian kita

Laporan sendiri menyatakan angka rekap umum belum sesuai rincian per wilayah. Selisih tidak direkonsiliasi.

| Wilayah | Posko: sorti OMC | Posko: dry ice | Posko: NaCl | Kita: sortie | Kita: dry ice (kg) | Kita: NaCl (kg) |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| Sumsel (Lanud SMH) | 143 | 35 sorti, 28,6 ton | 35 sorti, 51 ton | 55 | 27.700 | 32.600 |
| Kalteng | 110 | 36 sorti, 29,1 ton | 39 sorti, 57,6 ton | 66 | 23.800 | 47.000 |
| Kalsel (Lanud SAM) | 80 | 4 sorti, 2,3 ton | 11 sorti, 10,6 ton | 13 | 2.100 | 10.000 |
| Jabar | 1 (PK-ALA) | | 1 ton | 0 bertanggal | | |

Rekap kumulatif posko SMH di rincian harian: NaCl 100 sortie 111.200 kg; dry ice 25 sortie 19.966 kg. Rincian harian posko: TNI AU 41 sortie (17.566 kg dry ice, 35.000 kg NaCl), PK-IKC 10 sortie (2.400 dry ice, 7.000 NaCl), PK-SNP 8 sortie (6.200 dry ice, 800 NaCl). Lain: Kaltim 30 sortie 28.800 kg NaCl; PK-SCG 8 sortie + 1 on progress, 20 jam 39 menit, 9.000 kg NaCl (kita: 2 sortie 27 Okt saja); Jateng 7 sorti 16.500 liter adalah water bombing, bukan OMC; kumulatif 333 sorti Sumsel+Kalteng+Kalsel dan 16 sorti Jabar+Jateng.

Selisih yang mencolok: (1) sortie kita jauh lebih sedikit (Sumsel 55 lawan 143), padahal 25 Okt kosong; (2) posko sendiri tidak konsisten: Sumsel 143 sorti tidak sama dengan 35 dry ice + 35 NaCl, dan 100 + 25 sortie rekap SMH tidak sama dengan 143; (3) dry ice Sumsel posko 28,6 ton (lapsit) lawan 19.966 kg (rekap SMH), kita 27.700 kg; (4) Kalteng NaCl kita 47.000 lawan 57,6 ton; (5) pembagian Kalteng dan Kalsel di lapsit tidak jelas terhadap Lanud SAM yang melayani keduanya. Juga beda antar dokumen 27 Okt: stok SAM NaCl 11.000 kg (WA) lawan 18.000 kg (pptx); stok SMH NaCl sisa 9.000 kg (WA) lawan 8.000 kg (pptx).

Dry ice Sumsel 16-20 Okt: Rekap Dry Ice 20 Okt 4.800 kg lawan jumlah harian WA 8.000 kg (beda sumber, tidak direkonsiliasi). PK-SNK lintas Kalteng-Kalsel 17 dan 18 Okt mungkin terhitung dua kali (batas atas 2 sortie, 2.000 kg NaCl).

## Klaim posko (bukan hasil kita)

- Sumsel 27 Okt: PM2.5 Palembang/Talang Betutu/Bukit Kecil turun 115 ke 68,8 ug/m3 (06.00-15.00 WIB); visibility 1.000 m ke 7 km; pptx: PM2.5 Palembang turun 19% dari berbahaya menjadi sedang.
- Kalsel 27 Okt: PM2.5 Banjarbaru turun 14,55% dari 88 ke 75,2 saat dry ice (11.00 ke 12.00 WITA); visibility Syamsudin Noor 1.500 m ke 5.000 m.
- Hujan 27 Okt (radar BMKG dan pptx): Kalteng ringan-lebat di Katingan, Palangka Raya, Pulang Pisau, Kotim, Kapuas; Kalsel sedang di Kotabaru dan Tanah Bumbu; Sumsel sedang-lebat di OKI dan OKU Timur; Jatim 26 Okt Kota/Kab Malang, Bondowoso, Jember. Sumber tidak menghitung keberhasilan OMC.

## OMC tidak dilaksanakan, operasi berakhir

Jambi dan Kalbar tanpa OMC sejak pesawat pindah (PK-ALA ke Jawa Barat, PK-SCH ke Jawa Timur pada 24 Okt; PK-SCH kemudian terbang di Jatim 24-26 Okt, 3 sortie). Kalsel 22 Okt armada siaga. Riau berakhir 25 Sep 2026. Per 27 Okt aktif: Sumsel (SMH), Kalteng dan Kalsel (SAM), Papua Selatan, Jatim (rencana 27 Okt 2 sortie), Jabar. PK-FPU Kalteng 26 Okt 3 x 1.000 kg NaCl sudah ada di berkas WA; 27 Okt ETD belum ditentukan.

## Celah

- 25 Okt kosong (laporan WA yang ditempel sebagai "25 Okt" adalah operasi 24 Okt; pptx 27 Okt tidak memuat 25 Okt); Jatim 24 dan 25 Okt tanpa rincian harian.
- Sebelum 16 Okt tidak ada data. A-2904 dan A-1328 27 Okt "on air": jam selesai dan kg terlaksana belum final.
- Jam 27 Okt hanya untuk SAM (WITA) dan PK-SCG; Sumsel 27 Okt tanpa jam.

## `scripts/omc/nilai.py`

Dijalankan ke scratchpad (`omc_hasil_27okt.json`, bukan `omc_hasil.json`) untuk 7 sortie SAM 27 Okt yang jam dan kab-nya jelas (WITA dikurangi 8 jam jadi UTC; sortie A-2119 S2, A-2904, A-1328, Sumsel tidak diikutkan karena sasaran bertentangan, belum selesai, atau tanpa jam). Hasil: 4 episode, semuanya `data_kurang`: PK-SNL (Katingan, Kotim) "tidak ada stasiun dalam atau dekat sasaran"; tiga lainnya "stasiun kontrol layak kurang dari 2". Sebab data: `omc_arsip.json` PM2,5 berhenti 23 Okt (sumber `pm25` gagal), METAR hanya sampai 27 Okt 07 UTC sehingga jendela pasca-sortie siang 27 Okt belum lengkap. Tidak ada penilaian hujan yang valid.
