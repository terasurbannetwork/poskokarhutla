# Batasan dan pertanyaan terbuka

Batasan data dan metode:

1. Titik panas bukan perimeter: piksel 375 m melebihkan api kecil, awan dan asap menyembunyikan api besar. VIIRS hanya dua lintasan per hari; peta per jam di peramban adalah pembagian luas harian.
2. Uji balik memakai cuaca reanalisis (seolah prakiraan sempurna); prakiraan sungguhan menurunkan kinerja. Uji prospektif memakai prakiraan sungguhan dan menjadi hakim terakhir.
3. Cuaca latih hanya 1.623 ditambah 681 pasangan (tahun, sel 0,5 derajat); 2020 sampai 2022 dan 2024 sampai 2025 hanya sebagian. Data CAPE dan suhu lapisan 850 dan 700 hPa tidak tersedia di arsip ERA5 Open-Meteo, sehingga indeks Haines tidak dapat dihitung.
4. Data 2015 (El Niño besar) mendominasi data latih; 2024 (tahun kecil) memberi F1 0 pada uji dengan n 57.
5. Rentang luas P10 sampai P90 tetap terlalu sempit untuk api yang benar-benar besar; tanda WASPADA yang memberi peringatan, bukan rentangnya.
6. Mesin fisika memakai satu keluarga model bahan bakar dan belum divalidasi untuk Indonesia; kalibrasi pertumbuhan di Simulasi belum punya uji balik terpisah; lereng, jalan, loncatan bara, dan tutupan lahan nyata belum diperhitungkan.
7. Pemadaman tidak ada di data, sehingga api yang diperkirakan tumbuh padahal dipadamkan dihitung sebagai salah positif.
8. Peluang indeks 7 hari adalah peluang tertangkapnya titik oleh satu sensor, ONI versi revisi dan cuaca reanalisis sedikit optimistis, dan La Niña hanya diwakili satu tahun (2022; Brier skill 0,049 dengan selang yang memuat nol).
9. Model dilatih pada S-NPP yang berhenti 1 Nov 2026; kinerja dengan NOAA-20 dan NOAA-21 baru dicatat lewat uji prospektif. Pergeseran sebaran NOAA-21 terhadap S-NPP belum diukur. Jendela buta antara deteksi S-NPP terakhir dan peralihan membuat titik baru yang mulai di sana dan sudah lebih dari 24 jam saat peralihan tidak pernah diramal.
10. Kehilangan cache Actions berarti hilangnya catatan prospektif (arsip R2 menjadi cadangan). Pada 20 Okt 2026 satu run yang gagal sebelum langkah pulihkan pernah menyimpan salinan kosong sebagai cache terbaru dan menghapus 4.592 ramalan yang tercatat; `dinilai: 0` pada `prospektif.json` bukan selalu bug, tetapi harus dibandingkan dengan jumlah `dicatat` dan `kesehatan.macet`.
11. Penyetelan hiperparameter dengan angka uji adalah kebocoran. Uji 2024 sampai 2026 sudah tidak netral untuk model membesar. Gunakan `SEBARAN_TANPA_UJI=1` dan `lolos.py cv`.

Selisih antara dokumen dan kode yang ditemukan saat menulis:

1. `scripts/sebaran/SEBARAN_MODEL.md` bagian 2 dan ilmu agent masih menyebut selisih "32 lawan 50" pada efek BUI antara `index.html` dan Python. Kode sekarang sudah sama di kedua sisi: `index.html:6741` dan `simfisika.py:35` memakai `exp(50 ln 0,90 (1/BUI - 1/32))`; 32 adalah BUI0, bukan pengali. Tulisan di dokumen itu usang.
2. `SEBARAN_MODEL.md` bagian 1 menyebut eksibit Insight "Apa yang membuat api membesar", "Uji model pada kejadian lalu", "Di mana model masih keliru", dan "Musim 2026" sebagai tayang; kode memperlihatkan eksibit itu dimatikan (tidak ada di `Insight.EX`) sejak 14 Okt 2026. Yang tayang adalah cerita "Musim 2026" dan "Pendorong" lewat `cerita_karhutla.js`.
3. Ilmu agent mencatat angka "ambang 0,0484, recall 0,674, presisi 0,216"; berkas `model_sebaran.json` sekarang berisi ambang 0,0492, recall uji 0,678, presisi 0,209 (dihitung ulang 26 Okt 2026 dengan peta gambut baru). Tulisan ini mengikuti berkas.
4. `RISET-SEBARAN.md` bagian 6 menulis F1 mikro sel baru 24 jam boosting 0,136 dan "F1 0,124" pada uji 604 titik, sedangkan `model_sebaran.json` (`kinerja_uji.f1_24`) dan kartu Metode di `index.html` menulis 0,3835. Selisih itu tidak dapat direkonsiliasi hanya dari repo (kemungkinan perubahan definisi F1 antara tabel awal dan ekspor akhir). Tulisan ini memakai angka JSON, dan tidak dapat memastikan mana definisi yang berlaku untuk tabel awal itu: belum terdokumentasi di kode.
5. `RISET-SEBARAN.md` bagian 6 memuat AUC "lolos" 0,70 sebagai model produksi; bagian 12 dan kode memakai model khusus `lolos.py`, dan 0,70 hanya pembanding cara lama.
6. Salinan lokal `prospektif.json` dan `gerbang_model.json` bertanggal 23 Okt 2026; keadaan tayang bisa berbeda karena CI memperbaruinya tiap 3 jam. Status vonis harus dibaca dari berkas yang tayang.

Pertanyaan terbuka (keputusan pemilik yang belum ada di berkas repo, sehingga belum diputuskan):

1. Apakah indeks 7 hari P1 dibuka untuk publik setelah lolos syarat prospektif; sampai saat ini belum diputuskan (bawaan sementara: hanya admin dan akun pemirsa, berlabel eksperimental, sesuai pendaftaran 23 Okt 2026 dan `src/risiko7.js`).
2. Apakah prakiraan PFVI harian disambung ke pipeline ansambel; belum diputuskan (bawaan sementara: hanya riset, tidak dipasang, sesuai `RISET-PFVI.md`).
3. Apakah eksibit Insight yang disembunyikan (`sebLolos`, `sebUji`, `sebGalat`, `sebModel`, `sebMusim`) dipulihkan; belum diputuskan (bawaan sementara: tetap disembunyikan sejak 14 Okt 2026).
4. Apakah arsip Himawari-9 per 10 menit dibuat untuk melatih model langkah per jam; belum diputuskan (bawaan sementara: tidak ada arsip, tidak ada model per jam; `SEBARAN_MODEL.md` bagian 5).
5. Sumber cuaca operasional untuk model 7 hari yang lengkap dengan cuaca (ERA5 Open-Meteo versus `fwi.json` pipeline harian): belum diputuskan (bawaan sementara: P1 tanpa cuaca).
6. Kapan model latih diperbarui memakai data 2026 penuh dan NOAA-20 sebagai sensor primer: belum diputuskan; rekalibrasi tidak dipasang karena risiko penyetelan ulang ambang.
7. Koefisien alometri tinggi kanopi ke bahan bakar (`bahan_bakar.py`) masih asumsi dan harus dikalibrasi ke plot sebelum dipakai untuk angka tonase: belum diputuskan (bawaan sementara: laboratorium saja).
