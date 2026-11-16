# BAB 8 Penyajian Data Bencana

Status: Fase 2, draf. Pertanyaan terbuka memakai bawaan sementara di `KEPUTUSAN.md`. Angka baru bab ini dihitung oleh `analisis/tambahan_H.py` (keluaran `analisis/hasil/tambahan_H.json`).


## 8.1 Masalah penyajian saat ini

Bab 6 menetapkan cara menghitung. Bab ini menetapkan cara menyampaikan hasil hitungan kepada pimpinan, pemerintah daerah, dan publik. Angka yang benar masih bisa menyesatkan bila disajikan dengan cara yang salah, dan angka kejadian bencana kita mengalami hal itu dalam enam bentuk.

### 8.1.1 Satu kejadian pecah menjadi pecahan

DIBI menyimpan kolom jumlah kejadian yang tidak selalu bernilai satu. Dari 15.974 baris yang ditarik pada 12 November 2026, sebanyak 643 baris (4,0 persen) berisi pecahan seperti 0,5, 0,333, atau 0,25, dan 82 di antaranya memuat 1.000 atau lebih orang meninggal atau terdampak. Gempa 15 Agustus 2026 di Nusa Tenggara Timur dicatat 0,091 kejadian di tiap kabupaten, yaitu satu gempa dibagi 11 kabupaten. Manggarai mencatat 62 meninggal dan Nagekeo 20 meninggal, tetapi di kolom jumlah kejadian keduanya hampir tidak tampak. Sebaliknya 556 baris memuat dua kejadian atau lebih dalam satu baris. Pembaca yang menjumlah kolom itu mendapat 3.124 kejadian untuk 1 Januari sampai 31 Oktober 2026, sedangkan hitungan baris memberi 3.181. Dua angka yang sama-sama "jumlah kejadian" berbeda 57 (paradoks P-48 dan P-01; Lampiran A).

### 8.1.2 Series break deret yang tidak ditandai

Jumlah baris DIBI naik dari 3.752 pada 2024 menjadi 8.946 pada 2025, kenaikan 138 persen. Untuk Januari sampai Oktober, baris naik 153 persen (3.058 ke 7.746) sedangkan korban meninggal naik 46 persen (453 ke 663). Pada 2026 baris turun lagi ke 3.181 dan korban meninggal ke 556. Tidak ada bukti bahwa bahaya berubah sebesar itu. Penyebab yang terlihat adalah kelengkapan DIBI 2024 yang rendah dan penanda `is_bencana`, yang bernilai salah pada 93 baris (2024), 3.705 baris (2025), dan 771 baris (2026). Logbook Pusdalops dalam berkas CSV melonjak dari 247 kejadian (2012) ke 2.201 (2013) karena arsip baru lengkap sejak 2013 (349 hari pencatatan lawan 67), dan dari 3.977 (2024) ke 5.899 (2025) karena pencatatan per kabupaten makin rinci. Kejadian yang hanya sekali dilaporkan turun dari 71,9 persen (2024) ke 67,2 persen (2025) (P-35, P-39).

### 8.1.3 Long tail

Dalam 12 bulan terakhir DIBI (13 November 2025 sampai 12 November 2026, 4.185 baris), 94,8 persen baris tidak memuat korban meninggal. Satu persen baris teratas, yaitu 41 baris, memikul 85,5 persen dari 1.897 korban meninggal dan 64,0 persen dari 12.501.851 orang terdampak, luka, atau mengungsi. Satu baris saja, banjir Aceh Utara 28 November 2025, memuat 246 meninggal, 739.710 terdampak, dan 91.286 rumah rusak. Median terdampak per baris adalah 10, sedangkan rata-ratanya 2.987. Pimpinan yang membaca rata-rata 2.987 membayangkan kejadian tipikal yang tidak pernah ada (P-37).

### 8.1.4 Angka kumulatif dijumlah

Logbook harian menulis angka kumulatif: laporan hari kedua memuat angka hari pertama ditambah tambahannya. Pada logbook 2026 (Januari sampai Oktober, kunci jenis, provinsi, kabupaten, dan tanggal), nilai meninggal terbesar per kejadian bila dijumlah antar kejadian adalah 609, tetapi bila seluruh laporan harian dijumlah menjadi 12.523, yaitu 20 kali lipat. Untuk terdampak selisihnya 8,5 kali (3,23 juta lawan 27,57 juta) dan untuk rumah rusak 30 kali (120.116 lawan 3.555.343). Setiap rekap yang menjumlah kolom harian melipatgandakan dampak sebesar itu (P-41).

### 8.1.5 Hotspot antarsistem dan antarwaktu

Dua lembaga bisa memakai kata "hotspot" untuk dua ukuran. Pada arsip FIRMS 25 Oktober sampai 11 November 2026 (18 hari, sel 375 meter, semua keyakinan), deteksi mentah berjumlah 117.910 sedangkan lokasi-hari unik 97.875, rasio total 1,20. Bila hanya satelit dan keyakinan yang dipakai definisi Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) yang dihitung, lokasi unik 26 Oktober sampai 11 November (81.239) berbanding 3.268 titik, rasio 24,9, sebagian besar dari saringan keyakinan. Angka juga tidak sebanding antarwaktu: S-NPP berhenti pada 1 November 2026, dan rata-rata lokasi unik per hari turun dari 6.431 (26 sampai 31 Oktober) ke 3.727 (3 sampai 11 November), turun 42 persen. Pensiun S-NPP menjelaskan sekitar 20 persen; sisanya belum bisa dipisahkan dari hujan awal musim (P-43, P-44).

### 8.1.6 Wilayah yang batasnya berubah

Rekap DIBI per provinsi menempatkan kejadian sejak 2008 pada Papua Tengah (kode 94), padahal provinsi itu baru dibentuk belakangan; Kalimantan Utara (kode 65) memuat kejadian sejak 2009. Itu tanda bahwa kejadian lama diberi kode provinsi baru. Tren per provinsi dan angka per kapita yang memakai kode ini mencampur dua batas wilayah tanpa pemberitahuan (P-55; dasar hukum pembentukan provinsi [BELUM TERVERIFIKASI]).

Satu hal lagi menyertai semuanya: hari tanpa catatan dibaca sebagai hari tanpa kejadian. Logbook CSV tidak punya catatan pada 94 hari di 2022 dan 38 hari di 2023, padahal 2024 dan 2025 hampir tanpa hari kosong (P-61).

## 8.2 Aturan penyajian

Sebelas butir aturan Bab 6.6 diuraikan di sini dengan contoh. Setiap contoh memakai angka yang sudah tersumber di Bab 4, Bab 5, atau Lampiran A.

**Aturan 1. KJN dan CK diberi nama berbeda.** Tabel menyebut "jumlah kejadian (KJN)" untuk kejadian utuh dan "jumlah catatan kabupaten (CK)" untuk bagian di tiap kabupaten. Gempa NTT 15 Agustus 2026 menjadi satu KJN dan 11 CK. Pecahan 0,091 tidak muncul di laporan mana pun. Satu kolom tidak boleh memuat KJN pada satu baris dan CK pada baris lain.

**Aturan 2. Jumlah kejadian selalu bersama dampak dan sebaran kelas.** Tabel jumlah kejadian tanpa kolom meninggal dan hilang, mengungsi, rumah setara rusak berat, dan sebaran kelas R, S, B, K tidak boleh terbit. Dari 12 bulan DIBI, kekeringan (129 baris) dan banjir (1.188 baris) sama-sama mencatat ribuan terdampak, tetapi kekeringan tanpa satu pun korban meninggal sedangkan banjir 1.282 meninggal. Jumlah baris saja menyembunyikan perbedaan itu (Tabel 8.1).

**Aturan 3. Median, total, dan porsi 1 persen teratas menyertai rata-rata.** Rata-rata berdiri sendiri dilarang. Contoh bentuk baku: "Terdampak 12.501.851; median 10 per baris; 1 persen baris teratas memikul 64,0 persen." Tiga angka itu bersama-sama memberi gambaran yang benar tentang long tail.

**Aturan 4. Tren hanya pada deret yang sebanding.** Setiap grafik deret memberi garis series break pada titik pergantian aturan atau alat ukur: 2013 dan 2025 untuk logbook, 2025 untuk DIBI, 1 November 2026 untuk hotspot (Gambar 8.1 dan 8.2). Tren jumlah kejadian selalu didampingi tren korban meninggal. Pada Januari sampai Oktober, baris DIBI bergerak 3.058, 7.746, 3.181 sedangkan korban meninggal 453, 663, 556; pembaca langsung melihat bahwa lonjakan baris 2025 jauh lebih besar daripada lonjakan korban.

**Aturan 5. Angka per 100.000 penduduk berdampingan dengan angka mutlak.** Dua kabupaten dengan jumlah terdampak sama menanggung beban berbeda bila penduduknya berbeda. Contoh bentuk [ILUSTRASI]: kabupaten X dan Y masing-masing 20.000 terdampak; X berpenduduk 100.000 (20 persen), Y berpenduduk 2.000.000 (1 persen). Angka penduduk resmi tidak termuat di bahan kajian ini sehingga contoh nyata ditunda sampai tabel kependudukan Badan Pusat Statistik terhubung. Kolom per 100.000 penduduk tidak pernah menggantikan kolom mutlak, dan persen penduduk yang dipakai penaik kelas (Bab 6.4.2) juga tidak menggantikannya.

**Aturan 6. Angka antarsumber tidak dijumlah.** Tabel berdampingan menyebut sumber, periode, dan satuan tiap kolom, dan tidak punya baris "jumlah". Tabel 8.2 menunjukkan bentuknya: logbook DOCX 3.756, logbook CSV 3.622, DIBI 3.181 baris, dan logbook Koordalops 2.220 untuk Januari sampai Oktober 2026. Menjumlahkan keempatnya, atau memilih diam-diam yang terbesar, adalah kesalahan penyajian (P-31, P-43).

**Aturan 7. Setiap angka di laporan pimpinan menyebut nomor versi dan tanggalnya.** Kalimat baku: "Meninggal 556 (DIBI, tarikan 12 November 2026, versi 2026.10)". Angka yang tidak punya versi tidak dapat diperiksa ketika berubah, dan di DIBI angka sering dikoreksi susulan. Nomor versi memakai bentuk tahun-bulan rilis dan nomor urut koreksi (P-27, P-46). Bentuk contoh pada kalimat ini [ILUSTRASI], karena rilis bernomor versi belum berjalan.

**Aturan 8. Tren nasional terbit bersama jumlah provinsi yang berlawanan arah.** Pada DIBI Januari sampai Oktober 2025 lawan 2026, baris nasional turun dari 7.746 ke 3.181 dan 36 dari 38 provinsi ikut turun. Korban meninggal nasional turun 16 persen (663 ke 556), tetapi 11 provinsi naik; orang terdampak nasional turun 8,5 persen, tetapi 13 provinsi naik. Kalimat baku: "Korban meninggal turun 16 persen secara nasional; 11 provinsi naik." Pembalikan Simpson yang tegas tidak ditemukan pada periode ini (P-36); mesin tetap menandainya bila muncul.

**Aturan 9. Wilayah memakai batas terkini untuk penyajian dan kode saat kejadian untuk arsip.** Tabel konkordansi mengubah kode lama menjadi kode terkini. Kejadian 2008 di Papua Tengah disajikan dengan catatan "provinsi pada batas terkini; kode saat kejadian tertera di arsip" (P-55).

**Aturan 10. Jumlah kejadian provinsi tidak dijumlah menjadi angka nasional, dan deret lintas berlakunya kerangka diberi series break.** Satu kejadian lintas provinsi terhitung satu kali di tiap provinsi yang disentuhnya dan satu kali secara nasional, sehingga jumlah baris provinsi lebih besar daripada angka nasional. Tabel provinsi memberi catatan itu, dan tidak punya baris jumlah. Deret yang melintasi tahun mulai berlakunya kerangka ini juga diberi garis series break, karena kejadian dihitung sebagai KJN dan CK tanpa pecahan, dan deret lama baru dihitung ulang sejauh datanya ada (Bab 9.3 butir 5).

**Aturan 11. Daftar larangan.** Lima bentuk dilarang di semua laporan: pecahan kejadian sebagai satuan; menjumlah angka kumulatif harian; grafik jumlah kejadian lintas 2024 dan 2025 tanpa tanda series break; peringkat provinsi menurut jumlah kejadian tanpa dampak; dan angka rupiah lintas tahun tanpa harga konstan. Bagian 8.5 memberi contoh dan perbaikannya.

Dua aturan tambahan dari simulasi kita ikut berlaku. Hari tanpa berkas ditandai "tidak ada berkas", dikeluarkan dari penyebut tren, dan tidak diisi nol (P-61). Hotspot selalu bernama: "lokasi unik per hari kalender WIB, semua satelit, semua keyakinan" atau "titik mentah menurut definisi BMKG", dengan daftar satelit aktif hari itu (P-43, P-44).

## 8.3 Tabel baku

Tiga tabel berikut adalah contoh yang dipakai ulang oleh mesin laporan. Semua angka berasal dari analisis di repo; kolom yang bergantung pada simulasi Bab 7 diberi rujukan, bukan angka.

### 8.3.1 Kejadian, dampak, dan sebaran kelas

Tabel 8.1. Baris DIBI, dampak, dan sebaran kelas menurut jenis bahaya, 13 November 2025 sampai 12 November 2026

| Jenis | Baris DIBI | Meninggal | Terdampak, luka, mengungsi | Rumah rusak (RB+RS+RR) | Sebaran kelas R, S, B, K |
| --- | ---: | ---: | ---: | ---: | --- |
| Karhutla | 1.208 | 9 | 31.063 | 395 | lihat Bab 7 |
| Banjir (termasuk bandang, genangan, rob, banjir dan longsor) | 1.188 | 1.282 | 9.200.608 | 236.672 | lihat Bab 7 |
| Cuaca ekstrem (termasuk angin kencang, topan, puting beliung) | 922 | 32 | 92.764 | 13.326 | lihat Bab 7 |
| Longsor (termasuk gerakan tanah) | 431 | 207 | 41.337 | 2.451 | lihat Bab 7 |
| Kebakaran permukiman | 188 | 122 | 10.203 | 1.523 | lihat Bab 7 |
| Kekeringan | 129 | 0 | 2.099.909 | 0 | lihat Bab 7 |
| Gempa bumi | 60 | 160 | 301.836 | 142.000 | lihat Bab 7 |
| Erupsi (termasuk banjir lahar) | 14 | 6 | 713.328 | 246 | lihat Bab 7 |
| Jenis lain | 45 | 79 | 10.803 | 1.057 | lihat Bab 7 |
| Semua jenis | 4.185 | 1.897 | 12.501.851 | 397.670 | lihat Bab 7 |

Sumber: tarikan DIBI 12 November 2026 (`analisis/hasil/dibi_mentah_2024_2026.json`), dihitung `analisis/tambahan_H.py`. Satuan baris DIBI (hari x kabupaten x jenis), bukan KJN. Kolom terdampak menjumlah menderita, luka, dan mengungsi tanpa menghapus kemungkinan double counting antar kategori. Rumah dihitung tanpa bobot RBS sehingga tidak sama dengan kolom RBS di Tabel 6.5. Kolom sebaran kelas menunggu Bab 7.

Cara membaca tabel ini: banjir menyumbang 28 persen baris tetapi 68 persen korban meninggal dan 74 persen terdampak. Karhutla menyumbang 29 persen baris, tetapi hanya 0,5 persen korban meninggal. Gempa hanya 1,4 persen baris dan 36 persen rumah rusak. Jumlah kejadian tanpa kolom lain tidak dapat menunjukkan perbedaan ini.

### 8.3.2 Antarsumber, berdampingan

Tabel 8.2. Jumlah kejadian 1 Januari sampai 31 Oktober 2026 menurut empat sumber (tidak dijumlah)

| Sumber dan satuannya | Semua jenis | Karhutla | Banjir | Cuaca | Longsor | Kekeringan | Kebakaran permukiman | Gempa |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DIBI, baris hari x kabupaten x jenis (jumlah_kejadian = 3.124; `is_bencana` benar 2.436) | 3.181 | 1.132 | 741 | 612 | 312 | 129 | 152 | 58 |
| Logbook DOCX harian, kejadian (kunci jenis, provinsi, kabupaten beririsan, tanggal) | 3.756 | 1.160 | 794 | 785 | 424 | 137 | 248 | 55 |
| Logbook CSV Pusdalops, kejadian menurut tanggal kejadian | 3.622 | 1.030 | 795 | 777 | 429 | 146 | 261 | 54 |
| Logbook Koordalops, kejadian menurut mulai atau pertama terlihat | 2.220 | 898 | 454 | 317 | 120 | 330 | tidak ada | 23 |

Sumber: `riset/SIM-KRITERIA.md` bagian 7; `analisis/hasil/banding_sumber_2026.json`. Logbook DOCX dan CSV berbasis laporan harian yang sama; Koordalops memisah kekeringan dan hampir tidak memuat kebakaran permukiman. Sebanyak 446 kejadian Koordalops tanpa tanggal mulai tidak masuk 2.220. Tabel ini tidak punya baris jumlah.

Pembaca yang ingin satu angka diberi aturan Q-33: DIBI adalah angka utama, dan sumber lain tampil di sampingnya dengan label. Selisih terbesar ada pada kekeringan (129 lawan 330) dan cuaca ekstrem (612 lawan 317 sampai 785). Selisih ini berasal dari definisi satuan, bukan dari salah hitung.

### 8.3.3 Angka terbit lawan angka kini

Koreksi susulan DIBI belum tersimpan sebagai rilis bernomor, sehingga tabel "terbit lawan kini" sungguhan baru bisa dibuat setelah rilis statis pertama (Q-41). Sebagai gantinya, tabel berikut memakai logbook 2026 untuk memperlihatkan bentuknya dan besarnya selisih antara dua aturan versi angka.

Tabel 8.3. Angka yang sama menurut aturan versi berbeda, logbook 1 Januari sampai 31 Oktober 2026 (kunci V1)

| Variabel | Nilai terbesar per kejadian (aturan Juklak untuk hilang, luka, terdampak) | Nilai laporan terakhir (aturan Juklak untuk meninggal, kerusakan) | Selisih terakhir lawan terbesar | Dijumlah semua laporan harian (dilarang) |
| --- | ---: | ---: | ---: | ---: |
| Meninggal | 609 | 565 | -7,2 persen | 12.523 |
| Jiwa terdampak | 3,23 juta | 3,00 juta | -7 persen | 27,57 juta |
| Rumah rusak (RB+RS+RR) | 120.116 | 44.938 | -62,6 persen | 3.555.343 |

Sumber: `riset/SIM-KRITERIA.md` bagian 4; `analisis/hasil/uji_kunci_logbook.json`. Seluruh dampak dibaca dari teks bebas dengan ungkapan reguler dan belum divalidasi. Kolom kedua dan ketiga adalah dua versi angka yang sah menurut variabelnya; kolom kelima adalah kesalahan penyajian.

Bentuk baku tabel terbit lawan kini setelah rilis bernomor ada: kolom variabel, angka terbit (nomor versi dan tanggal), angka kini (nomor versi dan tanggal), selisih, dan alasan koreksi. Hanya baris yang berubah ditampilkan, dengan jumlah baris yang tidak berubah di catatan kaki. Dari pengamatan logbook, 157 dari 1.349 kejadian yang muncul lebih dari satu hari (11,6 persen) pernah menurun angkanya, jadi tabel itu tidak akan kosong.

## 8.4 Grafik baku

Tiga grafik (Gambar 8.1 sampai 8.3, dari 16 tahun logbook dan 4.185 baris DIBI) mengikuti spesifikasi di `mesin/gambar/` (jenis, judul, sumbu x, seri, satuan, sumber, ditambah kolom `penanda` untuk garis series break dan `catatan`). Setiap grafik wajib memuat sumber, periode, dan satuan, dan wajib bertanda series break bila deretnya melewati satu.

### 8.4.1 Deret logbook per tahun dengan tanda series break

![Gambar 8.1. Kejadian logbook Pusdalops per tahun, 2011 sampai 2026, dengan garis patah deret 2013 dan 2025](gbr/s8-logbook-per-tahun.png)
Sumber: `data/pusdalops/logbook_kejadian.csv`, 56.685 baris; `analisis/hasil/logbook_csv.json`. Spesifikasi: `mesin/gambar/s8-logbook-per-tahun.json`. Tahun 2026 sampai 1 November.

Cara membaca: batang 2011 dan 2012 (131 dan 247) tidak berarti sedikit bencana; arsip baru lengkap sejak 2013. Tinggi batang 2014 sampai 2024 relatif datar di kisaran 3.000 sampai 4.700, lalu melonjak 48 persen pada 2025. Garis series break 2013 dan 2025 memberitahu pembaca untuk tidak membandingkan batang di seberang garis. Dua tahun yang tampak turun, 2022 dan 2023, bercacat lain: hari pencatatan hanya 271 dan 327 dari 365 hari.

### 8.4.2 Baris lawan korban meninggal

![Gambar 8.2. Baris DIBI lawan korban meninggal, Januari sampai Oktober (indeks 2024 = 100)](gbr/s8-dibi-baris-lawan-meninggal.png)
Sumber: tarikan DIBI 12 November 2026; `analisis/tambahan_H.py`. Spesifikasi: `mesin/gambar/s8-dibi-baris-lawan-meninggal.json`.

Dua garis memakai indeks agar satuan yang berbeda (baris dan jiwa) bisa digambar bersama. Garis baris melonjak ke 253,3 lalu turun ke 104,0, sedangkan korban meninggal bergerak 100, 146,4, 122,7. Jarak antara kedua garis pada 2025 adalah jejak perubahan pencatatan. Indeks memakai 2024 sebagai dasar padahal 2024 paling tidak lengkap, sehingga catatan di bawah grafik wajib menyebutnya.

### 8.4.3 Konsentrasi dampak

![Gambar 8.3. Porsi dampak yang dipikul kejadian teratas, DIBI 12 bulan](gbr/s8-konsentrasi-dampak.png)
Sumber: tarikan DIBI 12 November 2026; `riset/SIM-KRITERIA.md` bagian 3; `analisis/tambahan_H.py`. Spesifikasi: `mesin/gambar/s8-konsentrasi-dampak.json`.

Satu persen baris teratas memikul 85,5 persen korban meninggal, 64,0 persen terdampak, dan 92,8 persen rumah rusak; sepuluh persen teratas memikul 100, 96,6, dan 99,1 persen. Grafik ini menggantikan rata-rata sebagai ringkasan dampak dan menunjukkan kepada pimpinan bahwa hampir semua baris adalah kejadian kecil yang ikut dihitung dalam jumlah tetapi nyaris tak menambah dampak. Bila 1 persen teratas dibulatkan ke 42 baris, porsi korban meninggal menjadi 85,7 persen; bab ini memakai 41 baris (85,5 persen) agar sejajar dengan Lampiran A.

## 8.5 Yang dilarang

Lima contoh berikut adalah penyajian yang benar secara hitungan tetapi menyesatkan pembaca.

**Larangan 1. Grafik jumlah kejadian lintas 2024 dan 2025 tanpa tanda series break.** Grafik batang baris DIBI Januari sampai Oktober 2024, 2025, dan 2026 (3.058; 7.746; 3.181) tanpa garis series break terbaca sebagai "bencana naik 2,5 kali lalu turun 59 persen". Korban meninggal bergerak 453, 663, 556. Perbaikan: Gambar 8.2, yaitu garis series break 2025 dan korban meninggal sebagai pendamping.

**Larangan 2. Peringkat provinsi menurut jumlah kejadian tanpa dampak.** Provinsi yang mencatat banyak baris karhutla berdampak nol (98,7 persen dari 3.646 baris karhutla DIBI 2024 sampai 2026 berdampak nol) akan menempati puncak peringkat jumlah kejadian, di atas provinsi yang kehilangan ratusan jiwa karena banjir atau gempa. Perbaikan: peringkat memuat tiga kolom, yaitu jumlah KJN, meninggal dan hilang, dan sebaran kelas, dan peringkat utama disusun menurut kelas lalu dampak. Bentuk tabel peringkat contoh [ILUSTRASI]: provinsi A, 300 KJN, 0 meninggal, semuanya kelas R; provinsi B, 20 KJN, 150 meninggal, 2 kelas B.

**Larangan 3. Pecahan kejadian sebagai satuan.** Kolom "0,091 kejadian per kabupaten" membuat gempa NTT yang menewaskan sedikitnya 82 orang di dua kabupaten tampak seperti seperseratus kejadian. Perbaikan: satu KJN dan 11 CK, masing-masing dengan nama, dan angka dampak per CK di tabel lampiran.

**Larangan 4. Rata-rata dampak per kejadian sebagai satu-satunya ringkasan.** Rata-rata terdampak 2.987 per baris tidak mewakili baris mana pun: median 10, dan 19 baris memikul separuh total. Perbaikan: median, total, dan porsi 1 persen teratas (Gambar 8.3) di kalimat yang sama.

**Larangan 5. Menjumlah angka kumulatif harian dan angka rupiah lintas tahun tanpa harga konstan.** Jumlah semua laporan harian logbook memberi 12.523 meninggal, padahal nilai terbesar per kejadian bila dijumlah 609 (Tabel 8.3). Perbaikan: ambil satu nilai per kejadian menurut aturan versi, lalu jumlah antarkejadian. Rupiah: bentuk [ILUSTRASI], dua kejadian yang masing-masing tertulis kerugian 100 miliar rupiah, satu pada 2019 dan satu pada 2026, tampak sama besar di tabel padahal daya belinya berbeda; angka ini bukan data kejadian nyata, dan indeks harga yang dipakai mengikuti Q-32. Perbaikan: kolom tahun harga dan, untuk perbandingan, rasio terhadap produk domestik regional bruto (PDRB) atau anggaran daerah.

Daftar larangan ini dapat dijaga dua cara, dan keduanya masih usulan. Pertama, mesin laporan menolak tabel kejadian tanpa kolom dampak dan grafik deret yang melewati tanggal series break tanpa penanda. Kedua, pemeriksa laporan pimpinan memakai daftar periksa sebelas aturan Bab 8.2 sebelum berkas terbit.
