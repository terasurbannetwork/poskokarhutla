# SIM-KRITERIA: uji kriteria pencatatan kejadian Juklak 7/2023 pada data nyata

Dibuat 12 Nov 2026. Skrip dan angka mentah: `data/kajian-bnpb/hitung-bencana/analisis/` (`tarik_dibi.py`, `uji_kriteria.py`, `urai_logbook_mentah.py`, `uji_kunci_logbook.py`, `uji_logbook_csv.py`; keluaran di `hasil/*.json`). Semua angka di bawah berasal dari berkas itu; sumber dan periodenya disebut per tabel.

## 0. Data dan batasannya

| Sumber | Berkas | Periode | Catatan |
| --- | --- | --- | --- |
| DIBI baris mentah | `hasil/dibi_mentah_2024_2026.json` (tarikan Superset dasbor publik, 12 Nov 2026, tanpa penggabungan baris kembar) | 1 Jan 2024 sampai 12 Nov 2026, 15.974 baris | DIBI 2024 jelas tidak lengkap: 3.752 baris, dibanding 8.946 baris di 2025 |
| Logbook DOCX harian | arsip 302 hari, diurai ulang menjadi 9.329 baris harian mentah (`hasil/logbook_baris_harian.json`) | 1 Jan sampai 29 Okt 2026 | 1.461 baris tabel tidak terurai (tanpa tanggal atau provinsi), dilewati seperti pengurai acuan; angka dampak dari teks bebas |
| Logbook CSV | `data/pusdalops/logbook_kejadian.csv` | 2011 sampai 1 Nov 2026, 56.685 baris | |
| Logbook Koordalops | `data/laporan-bnpb/bulanan/2026-10/masukan/logbook_kejadian.json` | 1 Jan sampai 11 Nov 2026 | |

Definisi yang dipakai: satuan = baris DIBI (hari x kabupaten x jenis); K1 = meninggal >= 1; K2 = menderita + luka + mengungsi (dijumlah) >= 50; K3 = rumah rusak berat+sedang+ringan + sekolah + ibadah + kesehatan + kantor + jembatan >= 5 (fasum_rusak dipisah dan tidak dihitung). Temuan sampingan: DIBI ternyata PUNYA kolom `rumah_ibadat_rusak` dan `fasyankes_rusak`, bertentangan dengan catatan di `public/data/dibi_kejadian.json` yang menyebut tidak ada. K4 (lahan >= 1 ha) tidak bisa diuji: DIBI tidak punya kolom luas (sudah dicoba kolom sawah, kebun, hutan, lahan dan sejenisnya, semua ditolak). K5 dan K6 tidak ada di DIBI.

## 1. Uji kriteria pada DIBI

### 1.1 Lolos sedikitnya satu dari K1 sampai K3

| Periode | Baris | Lolos | % lolos | Tidak satu pun | % tidak |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024 (tak lengkap) | 3.752 | 2.609 | 69,5 | 1.143 | 30,5 |
| 2025 | 8.946 | 3.682 | 41,2 | 5.264 | 58,8 |
| 2026 (1 Jan sampai 12 Nov) | 3.276 | 1.363 | 41,6 | 1.913 | 58,4 |
| 12 bulan (13 Nov 2025 sampai 12 Nov 2026) | 4.185 | 1.903 | 45,5 | 2.282 | 54,5 |
| Semua 2024 sampai 2026 | 15.974 | 7.654 | 47,9 | 8.320 | 52,1 |

Sebagian besar yang "tidak lolos" adalah karhutla (K4 tidak terukur). Tanpa karhutla, lolos 2025: 3.588 dari 3.969 baris `is_bencana=true` (lihat 1.4).

### 1.2 Penentu tunggal (12 bulan, 4.185 baris)

Kombinasi: tidak ada 2.282; hanya K2 973; K2+K3 440; hanya K3 273; hanya K1 106; K1+K2+K3 67; K1+K2 32; K1+K3 12. Jadi 973 dari 1.903 yang lolos (51,1%) lolos hanya karena K2 (>= 50 jiwa terdampak, luka, atau mengungsi); hanya K3 14,3%; hanya K1 5,6%. Pada semua periode (7.654 lolos): hanya K2 3.934, hanya K3 1.436, hanya K1 389.

### 1.3 Per jenis (12 bulan; "tunggal" = lolos hanya oleh kriteria itu)

| Jenis | Baris | % lolos | K1 | K2 | K3 | Tunggal terbanyak |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Karhutla | 1.208 | 1,4 | 5 | 10 | 3 | K2 (9) |
| Banjir | 1.188 | 76,6 | 82 | 883 | 154 | K2 (717) |
| Cuaca ekstrem dan angin | 922 | 56,3 | 27 | 317 | 441 | K3 (178) |
| Longsor | 431 | 36,4 | 38 | 81 | 86 | K3 (45) |
| Kebakaran permukiman | 188 | 48,9 | 34 | 39 | 52 | K1 (25) |
| Kekeringan | 129 | 94,6 | 0 | 122 | 0 | K2 (122) |
| Gempa | 60 | 71,7 | 13 | 31 | 38 | K3 (9) |
| Gelombang dan abrasi | 21 | 81,0 | 0 | 16 | 7 | K2 (10) |
| Erupsi | 14 | 42,9 | 2 | 5 | 2 | K2 (3) |

Kekeringan lolos 94,6% sepenuhnya lewat K2 (K1 dan K3 nol), sehingga "jumlah kejadian" kekeringan praktis ditentukan oleh ambang 50 jiwa, bukan oleh kekeringan itu sendiri. Cuaca ekstrem didominasi K3 (rumah rusak, kerap ringan).

### 1.4 `is_bencana` DIBI lawan kriteria

Kolom `is_bencana` bukan konstanta: 2024 true 3.659 dan false 93; 2025 true 5.241 dan false 3.705; 2026 true 2.505 dan false 771. Jadi mulai 2025 DIBI memberi tanda "bukan bencana" pada kira-kira 41% baris. Tanpa karhutla, tanda itu hampir sama dengan kriteria K1 sampai K3:

| Tahun, tanpa karhutla | true dan lolos | true tak lolos | false tak lolos | false dan lolos |
| --- | ---: | ---: | ---: | ---: |
| 2024 | 2.602 | 69 | 89 | 1 |
| 2025 | 3.588 | 381 | 3.403 | 87 |
| 2026 | 1.316 | 85 | 677 | 30 |

Kesesuaian 2025: (3.588+3.403)/7.459 = 93,7%. Untuk 2026: (1.316+677)/2.108 = 94,5%. Jadi `is_bencana` sangat mungkin hasil penerapan ambang (ditambah K5 dan K6 yang tidak terlihat), dan baru diterapkan penuh sejak 2025. Pengecualian: karhutla (2.353 baris true tak lolos di 2025 sampai 2026, karena K4 luas tidak ada kolomnya) dan kebakaran permukiman (104 true tak lolos). Pada `is_bencana=false`: 8 baris punya meninggal >= 1, 69 punya K2, 68 punya K3 (total 119 baris false tetap memenuhi satu kriteria; kemungkinan dikoreksi susulan atau ditandai oleh aturan lain). Artinya angka "kejadian" yang diumumkan DIBI sebelum 2025 dan sesudah 2025 tidak sebanding.

## 2. Kepekaan ambang (DIBI 12 bulan; baris yang lolos jika satu kriteria saja diubah)

| Ambang | Nilai | Baris lolos |
| --- | --- | ---: |
| K1 meninggal | 1 / 3 / 10 | 217 / 65 / 33 |
| K2 jiwa | 10 / 50 / 100 / 500 | 2.095 / 1.512 / 1.207 / 700 |
| K3 unit | 1 / 5 / 10 / 50 | 1.291 / 792 / 540 / 180 |
| K1, K2, K3 digabung (ATAU), basis 1, 50, 5 | 1.903 | |
| 3, 100, 10 | | 1.433 (-24,7%) |
| 10, 500, 50 | | 787 (-58,6%) |
| 1, 10, 1 | | 2.484 (+30,5%) |
| 1, 100, 5 | | 1.753 (-7,9%) |
| 1, 50, 10 | | 1.691 (-11,1%) |
| EM-DAT (>= 10 meninggal ATAU >= 100 terdampak) | | 1.212 (-36,3%) |

Kepekaan terbesar ada di K1 (nol ke tiga: -70%), K2 antara 50 dan 100 (-20%) dan K3 dari 5 ke 10 (-32%). Per jenis (12 bulan, ambang tunggal; kolom EM-DAT = aturan EM-DAT): banjir K2 50 ke 500 turun dari 883 ke 529; cuaca ekstrem K3 5 ke 50 turun dari 441 ke 60 dan K2 50 ke 500 dari 317 ke 18; longsor K3 5 ke 50 dari 86 ke 6; kekeringan K2 50 ke 500 dari 122 ke 105 (paling tahan); kebakaran permukiman K3 52 ke 7. EM-DAT per jenis: banjir 783, cuaca 175, kekeringan 121, longsor 50, kebakaran permukiman 30, gempa 23, karhutla 10. Rincian lengkap 8 jenis ada di `hasil/uji_kriteria.json` kunci `kepekaan ...`, termasuk periode 2025 dan 2024 sampai 2026.

## 3. Logika ATAU, dan ekor panjang dampak (DIBI 12 bulan)

- Lolos hanya karena K3 (tanpa K1 dan K2): 273 baris; 212 di antaranya hanya 5 sampai 9 unit; 28 baris K3 tanpa satu pun korban (meninggal, hilang, luka, terdampak, mengungsi sama dengan nol).
- Lolos hanya K1 dengan tepat 1 meninggal: 71. Lolos hanya K2 pada 50 sampai 99 jiwa: 150.
- Lolos ketiganya sekaligus: 67 (1,6%), jadi jika memakai logika DAN, kejadian turun dari 1.903 menjadi 67 (-96,5%). Lolos dua dari tiga: 551.
- 100 baris dengan rumah terendam > 0 tidak lolos satu pun; fasum_rusak tidak menambah baris baru (0).
- Jembatan: 96 baris punya jembatan rusak; hanya 6 baris yang K3-nya ditentukan jembatan.
- Konsentrasi (12 bulan): total meninggal 1.897, 85,5% berasal dari 1% baris teratas (41 baris) dan 100% dari 10% teratas; baris dengan meninggal nol 3.968 dari 4.185 (94,8%). Terdampak (menderita+luka+mengungsi) 12.501.851: 64,0% dari 1% teratas, 96,6% dari 10% teratas. Mengungsi 95,8% dan rumah rusak 92,8% dari 1% teratas. Pada semua periode: meninggal 78,0% dan terdampak 57,4% dari 1% teratas. Satu baris tunggal (Aceh Utara, banjir 28 Nov 2025) menyumbang 246 meninggal dan 739.710 terdampak. Jadi rata-rata nasional tidak mewakili kejadian tipikal; median hampir selalu nol.

## 4. Kunci penghapus duplikat logbook 2026 (DOCX harian, 302 hari, 9.329 baris mentah)

Periode kejadian = tanggal kejadian. Kolom md/jiwa/rumah = total dampak seluruh kejadian dengan aturan angka tertulis.

| Varian | Okt 2026 kejadian | Jan sampai Okt kejadian | lolos K1-K3 Jan sampai Okt (aturan maks) |
| --- | ---: | ---: | ---: |
| V1 (jenis, prov, kab, tgl) | 293 | 3.860 | 924 |
| V1g (V1 + gabung kab beririsan; sama dengan `logbook_2026.json`: 3.827 total) | 284 | 3.756 | 914 |
| V2 (jenis, prov, kab, jeda <= 7 hari, tanpa tgl) | 175 | 2.809 | 865 |
| V3 (jenis, prov, tgl, tanpa kab) | 194 | 2.913 | 793 |
| V4 (tanpa dedup, tiap baris harian) | 544 | 8.715 | 2.865 |

Aturan angka pada Jan sampai Okt (md = meninggal, jiwa terdampak, rumah RB+RS+RR, semuanya hasil urai teks):

| Varian | md maks / jumlah / terakhir | jiwa maks / jumlah / terakhir | rumah maks / jumlah / terakhir |
| --- | --- | --- | --- |
| V1 | 609 / 12.523 / 565 | 3,23 jt / 27,57 jt / 3,00 jt | 120.116 / 3.555.343 / 44.938 |
| V2 | 618 / 12.505 / 583 | 4,14 jt / 27,55 jt / 3,78 jt | 118.056 / 3.554.558 / 42.052 |
| V3 | 603 / 12.523 / 528 | 3,08 jt / 27,57 jt / 2,74 jt | 118.695 / 3.555.343 / 41.899 |

Pembacaan: (a) jumlah kejadian bergeser 27% antar varian (V1 3.860 lawan V2 2.809; V4 tanpa dedup 8.715, 2,3 kali V1); (b) aturan JUMLAH melipatgandakan dampak 8 sampai 30 kali (md 20x, jiwa 8,5x, rumah 30x) karena logbook menulis angka kumulatif, jadi aturan jumlah salah; (c) maks lawan terakhir berbeda: terakhir lebih rendah 7% (md V1), 7% (jiwa), 63% (rumah), karena angka sering diturunkan pada laporan berikutnya; (d) V2 menggabung kejadian yang tanggal kejadiannya ditulis berbeda antar hari: 464 dari 1.256 kejadian multi-hari (36,9%) punya lebih dari satu tanggal, jadi V1 yang berkunci tanggal memecah kejadian yang sama menjadi beberapa kejadian; (e) V3 membuang kabupaten sehingga menyatukan kejadian berbeda kabupaten di provinsi dan hari yang sama (V1 2.913 turun dari 3.860).

Dinamika (V1, 3.935 kejadian semua tanggal; 1.349 muncul di 2 hari laporan atau lebih; 65,7% hanya satu hari):

- Koreksi turun antarhari (salah satu dari md, jiwa terdampak, rumah, terdampak+luka+mengungsi): 157 kejadian (11,6% dari yang multi-hari); rinci: jiwa 105, k2 136, rumah 57, md 17.
- Naik kelas (tidak lolos di hari pertama, lolos di laporan kemudian): 124 kejadian, 12,7% dari 975 yang akhirnya lolos; pemicunya K2 87, K1 19, K3 18. Artinya hampir 1 dari 8 kejadian yang memenuhi syarat baru kelihatan di laporan susulan; pencatatan hari pertama saja akan melewatkannya.
- Selisih tanggal kejadian ke pertama dilaporkan: median 1 hari, p90 3 hari, p99 80 hari, 7,8% lebih dari 3 hari, 5,9% beda bulan. Ada 29 kejadian dengan tanggal kejadian setelah tanggal laporan dan 46 dengan tahun tanggal di luar 2026 atau Des 2025 (salah ketik).

Keterbatasan: md, jiwa, dan ha berasal dari regex pada teks bebas. Contoh: ha maks Jan sampai Okt 2,1 jt ha jelas terinflasi oleh salah urai; jangan dipakai untuk K4 sebelum divalidasi.

## 5. logbook_kejadian.csv 2011 sampai 2026

- 56.685 baris. Tanggal kejadian tidak sah: 659, yaitu 644 kosong, ditambah tahun 2104 (2), 2109 (2), 2923 (2), 2103, 2201, 2108, 2030, 9202, 2010, 2009, 2014 (salah ketik tahun). 885 baris bertanggal kejadian setelah pertama dicatat.
- n_laporan: median 1, p90 2, p99 10, maks 308; 75,9% hanya satu laporan, 9,3% tiga laporan atau lebih. hari_dilaporkan: median 1, p90 2, p99 9, maks 275; 79,1% satu hari, 1,3% lebih dari 7 hari, 0,2% lebih dari 30 hari. Jeda kejadian ke pertama dicatat: median 1, p90 3, 6,9% lebih dari 3 hari, 1,6% negatif.
- Multi-kabupaten (kolom kabkota memuat ';'): 1.481 baris (2,6%), maks 35 kabupaten; terbanyak banjir 553, karhutla 237, cuaca 163, gempa bumi 152. Kabupaten kosong 2.395, provinsi kosong 424.
- Per tahun (tanggal kejadian): 2011 131, 2012 247, 2013 2.201, 2014 3.385, 2015 3.734, 2016 4.596, 2017 4.618, 2018 4.621, 2019 4.719, 2020 4.308, 2021 3.768, 2022 3.119, 2023 3.080, 2024 3.977, 2025 5.899, 2026 (sampai 1 Nov) 3.623. Lonjakan 2013 (dari 247): arsip baru lengkap sejak 2013 (hari pencatatan 349 lawan 67 pada 2012 dan 44 pada 2011), bukan kejadian naik 9 kali. Lonjakan 2025 (dari 3.977 ke 5.899, +48%): banjir 1.473 ke 1.989, cuaca 980 ke 1.700, longsor 662 ke 1.143, kebakaran permukiman 183 ke 432. Hari pencatatan sama (365). Porsi n_laporan = 1 turun dari 71,9% (2024) ke 67,2% (2025) dan 64,9% (2026), jadi pencatatan makin detail per kabupaten. Kedua lonjakan bukan bukti tren bahaya.
- Kunci kembar (jenis, tgl, kab, prov): 312 kunci memiliki lebih dari satu baris dari 55.680 kunci unik.
- Karhutla: 4.523 baris punya `ha`; 7 baris >= 100.000 ha dan 18 >= 10.000 ha (salah urai, mis. 11.919.173 ha di Majalengka, 13 Sep 2023). Median 3 ha. Jumlah seluruhnya 14,1 jt ha, tetapi jika baris < 10.000 ha saja 290.029 ha.

## 6. Katalog anomali (contoh nyata, tanpa nama orang)

DIBI (tarikan 12 Nov 2026):

1. Brebes (Jateng), banjir 26 Feb 2024: dua baris masing-masing 0,5 kejadian, terdampak 56.399 dan 31.380. Satu banjir terhitung 1 kejadian untuk dua baris.
2. Bogor (Jabar), banjir 3 Mar 2025: 0,5 kejadian, 1 meninggal, 29.555 terdampak, 131 rumah rusak.
3. Nagekeo dan Manggarai (NTT), gempa 15 Agu 2026: tiap kabupaten 0,091 kejadian (satu gempa dibagi 11 kabupaten); Nagekeo 20 meninggal, Manggarai 62 meninggal, 51.332 dan 23.034 rumah rusak. Bila yang dihitung `jumlah_kejadian`, bencana ini hampir tidak tampak; bila dihitung baris, 11.
4. Jembrana (Bali), banjir 10 Sep 2025: 0,25 kejadian, 61.610 terdampak.
5. Bandung (Jabar), gempa 18 Sep 2024: 0,167 kejadian, 56.489 terdampak, 6.126 rumah rusak.
6. Total: 643 baris (4,0%) berpecahan, terbanyak 0,5 (379), 0,333 (99), 0,25 (45); 82 baris pecahan itu punya meninggal atau terdampak >= 1.000. Sebaliknya 556 baris punya jumlah_kejadian >= 2 dalam satu baris (mis. Pohuwato banjir 4 dan 30 Des 2025: 3 kejadian).
7. Satu hari, satu provinsi, banyak kabupaten: gempa Jabar 28 Apr 2024 (18 kabupaten); cuaca ekstrem Sulsel 7 Feb 2025 (14); banjir Jateng 21 Jan 2025 (12); banjir Aceh 26 Nov 2025 (11); angin kencang Jatim 24 Jan 2026 (11). Total 182 kombinasi dengan 5 kabupaten atau lebih, 9 dengan 10 atau lebih.
8. Dampak nol semua: 5.250 baris (32,9%), 3.597 di antaranya karhutla. Karhutla: 3.646 baris DIBI, 98,7% berdampak nol, hanya 10 yang ada korban jiwa. Karhutla memenuhi syarat nyaris selalu lewat K4, K5, atau K6, yang tidak terlihat di DIBI.
9. `is_bencana=true` tanpa dampak sama sekali dan bukan karhutla: 327 baris (mis. banjir Jakarta Selatan 7 dan 13 Jan 2024 berpecahan 0,5 dan 0,333; banjir Pinrang 28 Apr 2024; banjir Bojonegoro 7 Mar 2024; longsor Padang Sidempuan 30 Des 2024).
10. Meninggal tanpa terdampak atau rumah rusak: 184 baris (mis. longsor Tabanan 14 Mar 2024, 2 meninggal; cuaca ekstrem Jayapura 17 Des 2024; banjir Belu 5 Mar 2024; longsor Agam 14 Okt 2024).
11. Jembatan rusak: 381 baris; satu jembatan saja tanpa korban dan rumah: 49 baris. Ekstrem: banjir Bener Meriah 26 Nov 2025 144 jembatan; banjir Padang Pariaman 7 Mar 2024 103 jembatan; banjir Aceh Utara 28 Nov 2025 66 jembatan. Satu jembatan dan 144 jembatan sama-sama satu "unit" pada K3.
12. Banjir Aceh Utara 28 Nov 2025: satu baris dengan 246 meninggal, 739.710 terdampak, 91.286 rumah rusak: ekor panjang dalam satu sel kabupaten-hari.
13. Kekeringan: 269 baris, bertumpuk di bulan kemarau (Jun sampai Sep) dan hari tertentu (11 Jun 2024 enam baris, 28 Jul 2026 empat baris): tanggal bukan hari mulai tetapi hari pencatatan.
14. DIBI 2024: 3.752 baris, 2025: 8.946: kenaikan 138% yang mencerminkan kelengkapan, bukan kejadian.

Logbook:

15. CSV: 152 kejadian gempa bumi tercatat multi-kabupaten; maks satu baris memuat 35 kabupaten (semua jenis).
16. Tanggal kejadian 9202-11-09 (banjir Kota Sukabumi), 2923-03-06 (banjir Kalbar, ditulis juga dengan provinsi salah eja), 2104-01-02 (longsor Gianyar), 2103-10-10 (kebakaran Lebak), 2030-06-22 (cuaca Bogor): salah ketik tahun.
17. 557 baris punya tahun tanggal kejadian beda dengan tahun terakhir dicatat (lintas tahun): banjir 255, cuaca 106, longsor 83, kebakaran permukiman 27.
18. 644 baris CSV tanpa tanggal kejadian (158 jenis "lainnya", 97 gempa, 78 karhutla, 71 banjir); 148 di antaranya dicatat di 2026.
19. Karhutla luas tanpa korban jiwa: CSV tidak punya kolom korban, tetapi 4.523 baris punya luas; lihat anomali parse (11.919.173 ha Majalengka).
20. logbook_2026.json: 71 kejadian bertanggal di luar 2026 (kejadian Des 2025 yang masih dipantau), dan 29 kejadian bertanggal setelah tanggal laporan pertama (V1).

## 7. Jumlah kejadian 2026 antar sumber (jangan dijumlah; berdampingan)

Periode kejadian 1 Jan sampai 31 Okt 2026, kecuali bila disebut lain.

| Sumber (berkas) | Kejadian | Karhutla | Banjir | Cuaca | Longsor | Kekeringan | Kebakaran permukiman | Gempa |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DIBI baris mentah (tarikan 12 Nov; sama dengan `masukan/dibi_kejadian.json` yang digabung: 3.181) | 3.181 baris (jumlah_kejadian = 3.124; `is_bencana=true` 2.436) | 1.132 | 741 | 612 | 312 | 129 | 152 | 58 |
| Logbook DOCX harian (`logbook_2026.json`, kunci V1g) | 3.756 | 1.160 | 794 | 785 | 424 | 137 | 248 | 55 |
| Logbook CSV (`pusdalops/logbook_kejadian.csv`) | 3.622 (Okt saja: 314) | 1.030 | 795 | 777 | 429 | 146 | 261 | 54 |
| Logbook Koordalops (`masukan/logbook_kejadian.json`; mulai atau pertama terlihat) | 2.220 dari 2.346 total; 446 tanpa tanggal mulai | 898 | 454 | 317 | 120 | 330 | tidak ada | 23 |

Pembacaan: logbook DOCX dan CSV hampir sama (3.756 lawan 3.622) karena keduanya berbasis laporan harian Pusdalops; DIBI lebih rendah di cuaca, longsor, dan kebakaran permukiman, lebih tinggi di karhutla; Koordalops memisah kekeringan (330) dan hampir tidak memuat kebakaran permukiman. Silang resmi: `public/data/bnpb/rekonsiliasi_dalops_dibi.json` (2026: 3.660 baris Dalops, 3.064 DIBI, 2.722 pasangan, 938 hanya Dalops, 342 hanya DIBI; satuan hari x kabupaten x jenis, jendela 3 hari) dan `public/data/silang_dibi_logbook.json` (7 tahun 2015 sampai 2022: 79,5% sel logbook ada di DIBI, 88,8% sel DIBI ada di logbook, rasio 1,07; tidak mencakup 2026).

## 8. Keterbatasan

- K4, K5, K6 tidak dapat diuji pada DIBI; hasil karhutla (1,4% lolos) adalah batas bawah.
- DIBI 2024 tidak lengkap; DIBI sering dikoreksi susulan, sehingga 12 bulan terakhir bisa berubah.
- Satuan baris DIBI bukan kejadian: pecahan `jumlah_kejadian` (4,0% baris) dan kejadian lintas kabupaten dicatat per kabupaten.
- K2 dijumlah dari menderita + luka + mengungsi; bila DIBI menumpuk kategori itu, K2 sedikit terlalu longgar. Bila K2 dimaknai satu kategori saja >= 50, angka turun (belum dihitung terpisah).
- Logbook DOCX: dampak dari regex teks bebas; ha dan md dapat terinflasi; 1.461 baris tidak terurai; arsip berakhir 29 Okt 2026.
- Logbook CSV tidak punya kolom korban jiwa maupun terdampak.
