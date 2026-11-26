# KEPUTUSAN-KERUSAKAN: Perkiraan kerusakan bangunan dari satelit untuk Jitupasna

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Jitupasna (F3 program Siklus) butuh jumlah bangunan rusak per tingkat. Cacah lapangan makan hari sampai minggu. Satelit melihat seluruh wilayah dalam hitungan hari, tetapi Sentinel 10 m kuat untuk banjir dan kebakaran, dan lemah untuk kerusakan akibat gempa. Percobaan sendiri sudah membuktikannya: laboratorium Cianjur 2022 (`scripts/umum/lab_kerusakan.py`) mengukur perubahan amplitudo radar Sentinel-1 terhadap Google Open Buildings lawan rumah rusak resmi, dan vonisnya gagal (tidak mengalahkan plasebo dan tidak mengalahkan tebakan naif dari intensitas guncangan; `public/data/lab/kerusakan_ringkas.md`). Fitur ini hanya boleh menampilkan angka untuk bahaya yang lulus uji.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026: F2 "peta kerusakan bangunan dari satelit sesudah kejadian, masuk Jitupasna /siklus" disetujui, dengan catatan jujur bahwa Sentinel 10 m kuat untuk banjir dan kebakaran tetapi lemah untuk gempa (tolok ukur: Copernicus EMS, Microsoft AI for Good Venezuela 2026, dataset xBD-S12 dengan 10.315 pasang citra dari 16 bencana). |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |
| K3 | 15/16 Nov 2026: pemilik menjawab "Boleh, kunci v2 (Recommended)" atas pertanyaan mengganti kriteria dengan versi 2 (baca 10 m, ambang cakupan, plasebo lebih bersih), dikunci ulang dengan sidik baru; v1 dicatat gagal kelayakan; bagian uji tetap belum pernah disentuh. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Validasi dulu per bahaya. Kriteria lulus dikunci sebelum hasil dilihat (pola `lab_kerusakan.json`), diuji balik pada kejadian lampau yang punya rumah rusak resmi (DIBI atau survei BNPB). | Pengalaman Cianjur: tanpa kriteria terkunci, angka tampak meyakinkan padahal tidak mengalahkan plasebo. |
| D2 | Angka jumlah bangunan rusak tidak pernah tampil untuk bahaya yang belum lulus. Yang tampil: status uji ("menunggu uji", "gagal uji", "lulus uji") dan alasannya. | Angka tanpa uji adalah klaim kosong; aturan "menunggu, bukan nol". |
| D3 | Kandidat pertama: bangunan terendam (banjir); bangunan di area terbakar (karhutla) menunggu target uji mandiri (Q9). Gempa tetap gagal sampai ada metode lebih baik (Q2). | Isyarat fisiknya terlihat di 10 m (air terbuka, bekas bakar). |
| D4 | Keluaran satelit masuk Jitupasna hanya sebagai perkiraan berlabel "perkiraan satelit, belum diverifikasi" (label keyakinan `estimasi-model`). Staf boleh menerimanya ke isian; tidak pernah menjadi cacah resmi sendiri. | Cacah resmi hanya dari isian staf (KA Siklus 7 dan 8). |
| D5 | Tidak ada tabel rumah rusak kedua. Perkiraan tinggal di R2; baris yang diterima staf masuk `sk_jitupasna_baris` dengan `unit_asal` baru, dan rekap resmi `rekapTingkat` (`src/rumah_rusak.js:185`) tidak berubah. | Keputusan desain Siklus: satu sumber rumah rusak. |
| D6 | Pakai ulang mesin yang ada: Sentinel-1 RTC lewat Planetary Computer (`scripts/banjir/citra_banjir.py`), bangunan Google Open Buildings v3 (`scripts/umum/bangunan.py`, `scripts/umum/paparan_bangunan.py`), kunci wilayah BPS 4 digit. Tidak ada pipeline bangunan kedua. | Aturan Siklus. |
| D7 | Keluaran tingkat bangunan hanya di R2 di balik sesi staf, tidak di `public/`. Layar memakai agregat per kab dan kecamatan. | Aturan paparan rinci Siklus. |
| D8 | Luas dan titik panas karhutla hanya dari sistem kita, bukan Koordalops. | Aturan Siklus. |
| D9 | Tingkat rusak (RB, RS, RR) tidak diturunkan dari satelit untuk bahaya apa pun pada tahap awal; keluaran satelit hanya "terdampak" (terendam atau terbakar), dan staf yang menetapkan tingkat. | Sentinel 10 m tidak menilai persentase kerusakan (Perka 15/2011 F4.1). |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Bahaya mana yang diuji lebih dulu? | **[BAWAAN SEMENTARA]** banjir dulu, karhutla sesudahnya. | KS-03 |
| Q2 | Jalur gempa? | **[BAWAAN SEMENTARA]** tetap gagal dan tidak dibangun; dibuka ulang hanya bila ada koherensi dari citra SLC atau citra sangat tinggi resolusi berlisensi dengan kebenaran lapangan. | tidak menahan |
| Q3 | Citra sangat tinggi resolusi berlisensi (sub-meter) atau rapid mapping Copernicus EMS dipakai? | **[BAWAAN SEMENTARA]** tidak; hanya data gratis dan anonim sampai pemilik memutuskan anggaran dan lisensi. | tidak menahan |
| Q4 | Ambang lulus? | **[BAWAAN SEMENTARA, HIPOTESIS]** angka di ALGORITMA 3, dikunci pemilik atau validasi-model sebelum satu piksel dihitung. | KS-03 |
| Q5 | Kebenaran uji banjir? | **[BAWAAN SEMENTARA]** DIBI rumah terendam per kabupaten dan kejadian (DIBI kurang mencatat kejadian kecil, kebenaran bias); bila hanya tingkat kabupaten, uji dinyatakan lemah dan vonis maksimal "lulus terbatas" (angka tampil per kab, bukan per kecamatan). Ini pembatas terbesar. | KS-03 |
| Q6 | Siapa yang boleh menerima perkiraan ke isian? | **[BAWAAN SEMENTARA]** peran yang sudah boleh mengisi Jitupasna (Pusdalops, Koordalops, BPBD kab wilayahnya). | KS-07 |
| Q7 | Nama nilai `unit_asal` baru? | **[BAWAAN SEMENTARA]** `satelit_diterima`. | KS-05 |
| Q9 | Target mandiri uji karhutla (bukan titik panas, bukan kebakaran permukiman)? | **[BAWAAN SEMENTARA]** uji karhutla ditunda; vonis menunggu uji. | KS-09 |
| Q10 | Untuk kerusakan bangunan, model gagal tampil tanpa angka (D2) atau dengan pil hipotesis seperti Siklus PRD F3-08 (KA 11)? | **[BAWAAN SEMENTARA]** D2 menang: tanpa angka. Alasan: angka rusak bangunan dibaca sebagai fakta oleh pimpinan, dan percobaan Cianjur gagal. | KS-08 |
| Q11 | Parameter skor dan pembanding uji banjir yang belum tertulis (KS-01, `scripts/siklus/kerusakan_kriteria.json`, sidik di `kerusakan_sidik.json`)? | **[BAWAAN SEMENTARA, HIPOTESIS, usulan validasi-model, perlu cek rujukan]** (a) skor satelit = jumlah bangunan terendam kabupaten (batas bawah, ALGORITMA 1); ambang absolut VV saja, kisi -16 sampai -20 dB, dipilih dengan rho Spearman tertinggi di bagian kalibrasi saja; (b) adegan sebelum = komposit median 3 adegan orbit sama dalam 60 hari sebelum `mulai`, sesudah 0 sampai 6 hari dari `mulai` (7 sampai 12 hari hanya sensitivitas deskriptif); (c) naif hujan = maks jumlah 3 hari bergeser mulai-2 sampai mulai+6, ERA5 lewat Open-Meteo archive (`scripts/banjir/uji_balik.py:6,38`), plus naif kerawanan HAND < 5 m dan frekuensi DIBI kabupaten pada kalibrasi; (d) CI resample blok sumber|bulan dan sensitivitas per kabupaten, wajib lolos di keduanya; (e) batas klaim: vonis hanya peringkat besar-kecil di antara kabupaten yang sudah banjir. | KS-02 |
| Q8 | Tampil juga di Laporan Berkala? | **[BAWAAN SEMENTARA]** tidak; hanya cacah resmi. | tidak menahan |
| Q12 | Masker sawah dan tambak untuk skor banjir? | **[BAWAAN SEMENTARA]** tanpa masker (WorldCover butuh GDAL); peringkat vonis berarti "peringkat termasuk sawah dan tambak", dikunci di `keterbatasan_wajib` kriteria v2 dan wajib ada di vonis. | KS-03 |
| Q13 | Naif HAND (Copernicus GLO-30) dihitung di mana? | **[BAWAAN SEMENTARA]** HAND tetap wajib; KS-03 menolak jalan (`kerusakan.py prasyarat`) selama naif HAND belum terhitung untuk semua kabupaten uji. Mesin lokal tanpa numpy dan GDAL tidak bisa; butuh mesin atau runner ber-numpy dan GDAL, keputusan pemilik soal tempatnya. | KS-03 |

## Riwayat kriteria

| Versi | Sidik | Jangkar | Status |
| --- | --- | --- | --- |
| 1 | `9493ddcc1ab3789d900d599212b6bb6995c882073d61946160563cee62ae60aa` | `16f7ec1928bebb2755e34494636665fde6617eb1` | Gagal kelayakan (validasi-model): satu piksel overview 110 m per sel, satelit mendekati plasebo. |
| 2 | `7eddd1f5e7c296cff8c5cd78ab700689e22a34140d2032d26bf2111497e1ba80` | diisi sesi induk sesudah push | Terkunci menunggu jangkar. Daftar pasangan, pemisahan kalibrasi/uji, ambang lulus, CI, dan naif tidak berubah. |

Pasangan KALIBRASI yang sudah dilihat sebelum v2 dikunci (indeks di `kerusakan_kriteria.json`): 205 (Kota Pekalongan 2026-01-17, dikeluarkan mekanis: adegan sesudah terdekat +8 hari), 209 (Kota Semarang 2026-01-16), 212 (Kota Semarang 2026-03-15), 218 (Kota Tegal 2025-12-26). Hasil v1 (bangunan terendam satelit lawan plasebo, ambang -16/-17 dB): 209 12 lawan 22 dan 12 lawan 10; 212 22 lawan 11 dan 6 lawan 5; 218 3 lawan 3 dan 0 lawan 0. Tidak ada pasangan bagian uji yang pernah dilihat.

Uji asap v2 (3 pasangan kalibrasi, belum vonis kelayakan karena n < 20): 209 satelit 0 lawan plasebo 0 (-16), 1 lawan 0 (-17); 212 8 lawan 76 (-16), 6 lawan 64 (-17); 218 34 lawan 0 (-16), 0 lawan 0 (-17). Unduhan per pasangan 36,5 MB (218), 107 MB (209), 118 MB (212) pada k=4.



## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

- Q4: ambang lulus angka ALGORITMA 3, dikunci sebelum dihitung.

## Kalibrasi KS-02 dengan kunci v2 berjangkar (26 Nov 2026)

Pemilik mengizinkan (26 Nov 2026) menarik Sentinel-1 RTC dari Planetary Computer, anggaran total sekitar 2,5 GB. Kunci lolos `periksa_kunci` penuh (sidik `7eddd1f5...`, jangkar `c2c20f19...`), tanpa `--asap-tanpa-jangkar` untuk pasangan baru. Hanya bagian kalibrasi yang dijalankan; bagian uji tidak dibuka. Aturan urutan ditulis di sini dan diverifikasi dari indeks keluaran (12 indeks kalibrasi pertama, 3 sampai 18, tanpa lubang): indeks naik di `kerusakan_kriteria.json` di antara pasangan `bagian` = kalibrasi, satu per satu; berhenti saat n >= 20 atau anggaran habis. Aturan urutan yang permanen butuh kriteria v3 (belum dibuat). Anggaran habis lebih dulu.

Pasangan dihitung (status ok, plasebo ada, n = 11): 3 (Aceh Besar 2025-11-11), 4 (Aceh Jaya 2025-11-04), 13 (Kota Cilegon 2025-12-17), 14 (Kota Cilegon 2025-12-31), 15 (Kota Cilegon 2026-03-07), 16 (Kota Serang 2025-11-10), 17 (Kota Serang 2025-12-18), 18 (Kota Serang 2026-01-03), 209, 212, 218 (tiga terakhir BUKAN menurut urutan indeks: diikutkan karena sudah dihitung di uji asap v2 dan sudah dilihat di v1 sebelum kunci v2; ditandai `tanpa_jangkar` di berkasnya).

Dikeluarkan atau tidak terhitung, tercatat dengan alasan mekanis (bukan melihat skor): 205 (dari catatan v1: adegan sesudah terdekat +8 hari, tidak diverifikasi ulang di v2); 7 dan 8 (Aceh Timur, `bagian_terliput` 0,0008 < 0,9); 12 (Kota Cilegon 2025-11-08, tanpa adegan sah); 10 (Kota Denpasar): menunggu karena keadaan mesin (grid bangunan provinsi 51 tidak ada), BUKAN pengecualian mekanis; bila grid ada nanti, 10 dihitung di luar urutan. Kegagalan kode: pasangan 15 sempat berhenti karena item STAC baru memakai `proj:code` bukan `proj:epsg`; `contoh_sel` kini membaca keduanya, lalu 15 dijalankan ulang tanpa mengubah kriteria.

Unduhan: sekitar 2,28 GB total (pasangan 3 dan 4 saja 497 dan 814 MB karena kabupaten luas). Pengendali berhenti di atas 2,2 GB sebelum pasangan berikutnya.

Kelayakan per ambang (n = 11, syarat n >= 20, proporsi menang >= 0,6, rasio jumlah >= 2,0):

| Ambang dB | n | Informatif | Menang | Proporsi | Jumlah satelit | Jumlah plasebo | Rasio | Vonis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| -16 | 11 | 6 | 3 | 0,5 | 71 | 91 | 0,78 | menunggu: n 11 < 20 |
| -17 | 11 | 6 | 4 | 0,667 | 16 | 69 | 0,23 | menunggu: n 11 < 20 |
| -18 | 11 | 4 | 2 | 0,5 | 7 | 41 | 0,17 | menunggu: n 11 < 20 |
| -19 | 11 | 2 | 0 | 0,0 | 10 | 12 | 0,83 | menunggu: n 11 < 20 |
| -20 | 11 | 1 | 0 | 0,0 | 0 | 1 | 0 | menunggu: n 11 < 20 |

Vonis: belum ada ambang layak, karena n belum mencapai 20 (anggaran unduhan habis). Sebagai catatan deskriptif, bukan vonis: tidak ada ambang yang rasio jumlahnya mencapai 2,0 (terbaik 0,83) dan hanya -17 yang proporsinya di atas 0,6. Jika n sampai 20 hasilnya tetap harus dihitung ulang apa adanya. KS-03 tidak jalan: gerbang butuh paling sedikit satu ambang layak. Tidak ada ambang baru yang diusulkan. Jalan keluar yang butuh keputusan pemilik: menambah anggaran unduhan (sekitar 1 GB lagi untuk 9 pasangan, lebih bila kabupaten luas) untuk melanjutkan urutan indeks yang sama.

Catatan sah dan batas:
- 209, 212, 218 sah menurut kriteria (sidik kriteria identik), tetapi versi kode saat ketiganya dijalankan tidak terbukti sama dengan kode sekarang.
- Pembacaan proyeksi kini `kode_epsg` (menerima 32748, "32748", "EPSG:32748"), diuji di `kerusakan.py uji`. `scripts/banjir/citra_banjir.py:131` (milik `banjir`, tidak disentuh) akan crash pada item `proj:code`.
- Fraksi dikeluarkan per sumber dan tahun mulai (`pengecualian_mekanis.lapor`), semuanya sumber DIBI publik 2025-10-28 sampai 2026-10-28: mulai 2025 n 11 (ok 7, dikeluarkan 3, menunggu 1, tanpa plasebo 0); mulai 2026 n 4 (ok 4, dikeluarkan 0). Revisit adegan: 12 hari 12 pasangan, 6 hari 1 pasangan.
- Ambang -19 dengan informatif = 2 (n 11) dan 0 (n 8) tidak bermakna; -20 sama.

Kelayakan di samping, n = 8 (hanya 3, 4, 13 sampai 18, tanpa 209, 212, 218) dan n = 11:

| Ambang dB | n=8 informatif | menang | proporsi | rasio | n=11 informatif | menang | proporsi | rasio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| -16 | 4 | 2 | 0,5 | 1,93 | 6 | 3 | 0,5 | 0,78 |
| -17 | 4 | 3 | 0,75 | 1,8 | 6 | 4 | 0,667 | 0,23 |
| -18 | 2 | 2 | 1,0 | 2,0 | 4 | 2 | 0,5 | 0,17 |
| -19 | 0 | 0 | tidak ada | tidak ada | 2 | 0 | 0,0 | 0,83 |
| -20 | 0 | 0 | tidak ada | tidak ada | 1 | 0 | 0,0 | 0 |

Kedua kolom berstatus menunggu (n < 20); beda arah antar kolom menunjukkan angka belum stabil.

## Kalibrasi KS-02 putaran kedua (26 Nov 2026, anggaran tambahan)

Pemilik mengizinkan tambahan unduhan (batas 2,5 GB unduhan baru). Aturan sama: hanya bagian kalibrasi, indeks naik dari sesudah 18, kunci penuh berjangkar, satu per satu, tanpa memilih berdasarkan hasil, pasangan uji tidak dibuka.

Dihitung baru (ok, plasebo ada): 19 (Kota Serang 2026-01-29), 20 (Kota Tangerang 2025-11-01), 24, 25, 26 (Kota Tangerang Selatan 2025-11-01, 2025-11-18, 2026-01-23), 34 (Pandeglang 2026-01-12, 810 MB). Total n = 17 (11 putaran 1 ditambah 6).
Dikeluarkan mekanis: 21 (Kota Tangerang 2026-03-08) dan 28 (Kota Tangerang Selatan 2026-03-08), tanpa adegan sah; 31, 32, 33 (Pandeglang), `bagian_terliput` 0,8371, 0,6838, 0,8375 di bawah 0,9. Indeks 22, 23, 27, 29, 30 bukan bagian kalibrasi.
Unduhan baru: sekitar 2,18 GB (di bawah 2,5 GB). Saya berhenti sebelum pasangan berikutnya (indeks 36) karena satu pasangan kabupaten luas bisa 800 MB dan akan melewati batas; n = 17 belum 20.

Fraksi per sumber dan tahun mulai (sumber DIBI publik 2025-10-28 sampai 2026-10-28; semua pasangan): mulai 2025 n 16 (ok 10, dikeluarkan 5, menunggu 1); mulai 2026 n 10 (ok 7, dikeluarkan 3). Revisit: 12 hari 21 pasangan, 6 hari 1 pasangan.

Kelayakan n = 17 (termasuk 209, 212, 218), syarat n >= 20, proporsi >= 0,6, rasio >= 2,0:

| Ambang dB | informatif | menang | proporsi | jumlah satelit | jumlah plasebo | rasio | vonis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| -16 | 7 | 3 | 0,429 | 84 | 105 | 0,8 | menunggu: n 17 < 20 |
| -17 | 8 | 4 | 0,5 | 22 | 85 | 0,26 | menunggu: n 17 < 20 |
| -18 | 5 | 2 | 0,4 | 11 | 54 | 0,2 | menunggu: n 17 < 20 |
| -19 | 3 | 1 | 0,333 | 12 | 12 | 1,0 | menunggu: n 17 < 20 |
| -20 | 1 | 0 | 0,0 | 0 | 1 | 0 | menunggu: n 17 < 20 |

Tanpa 209, 212, 218 (n = 14):

| Ambang dB | informatif | menang | proporsi | jumlah satelit | jumlah plasebo | rasio |
| --- | --- | --- | --- | --- | --- | --- |
| -16 | 5 | 2 | 0,4 | 42 | 29 | 1,45 |
| -17 | 6 | 3 | 0,5 | 15 | 21 | 0,71 |
| -18 | 3 | 2 | 0,667 | 8 | 15 | 0,53 |
| -19 | 1 | 1 | 1,0 | 2 | 0 | tak hingga |
| -20 | 0 | 0 | tidak ada | 0 | 0 | tidak ada |

Vonis apa adanya: tidak ada ambang layak; semua menunggu karena n 17 < 20. Pada n = 17 belum ada ambang yang memenuhi syarat angka (andai n cukup): proporsi menang tertinggi 0,5 (di bawah 0,6) dan rasio jumlah tertinggi 1,0 (di bawah 2,0). Ini deskriptif, bukan vonis resmi (n < 20); -19 dan -20 informatif <= 3 tidak bermakna. KS-03 tidak jalan: gerbang butuh paling sedikit satu ambang layak. Tanpa ambang baru. Sisa pasangan kalibrasi berurutan dari indeks 36 belum dihitung; melanjutkannya butuh keputusan pemilik soal anggaran lagi.
