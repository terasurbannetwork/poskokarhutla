# KEPUTUSAN-MISI: Renlap Flight Semua Bencana (flight plan helikopter per jenis misi)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik ditulis dengan tanggal dan kalimat aslinya.
Pertanyaan yang belum dijawab pemilik ditulis sebagai **Q** dengan bawaan sementara bertanda **[SEMENTARA]**. Bawaan sementara
boleh dipakai untuk membangun, tetapi tampil di keluaran dengan label "sementara" sampai Q dijawab.

## Masalah

Flight plan helikopter untuk banjir Aceh dan Sumatera Utara (15 Nov 2026) dibuat dengan fungsi darurat `rencana` di
`scripts/operasi/renlap_banjir.py`: rute tetap, tanpa jenis misi, tanpa pemeriksaan keselamatan, dan hanya untuk banjir.
Renlap udara yang sudah ada (`scripts/operasi/renlap.py`) hanya untuk patroli dan water bombing karhutla. Bencana lain belum
punya flight plan, padahal batas terbangnya berbeda: gunung api punya radius larangan, asap menurunkan jarak pandang,
peringatan tsunami menutup pesisir.

## Keputusan pemilik

| No | Tanggal | Keputusan | Kalimat pemilik |
| -- | ------- | --------- | --------------- |
| K1 | 15 Nov 2026 | Flight plan dibuat dari urutan titik yang ditentukan orang (base, titik tujuan berurutan, kembali ke base). Titik yang belum pasti boleh diisi belakangan. | "Tolong buatkan Flight Plan: Medan (Lanud Suwondo) - Subulussalam (titik dropping Heli menyusul) - Tapanuli Tengah (titik dropping Heli menyusul) - Medan (Lanud Suwondo)" |
| K2 | 15 Nov 2026 | Flight plan seperti itu tersedia untuk semua bencana. | "tolong buatkan renlap flight gini untuk semua bencana ya" |
| K3 | 15 Nov 2026 | Ada jenis misi. Dua yang disebut pemilik: dropping bantuan dan pantau kondisi. Jenis lain yang memungkinkan diusulkan (lihat D3 dan Q1). | "Jadi ada renlap untuk 1. Dropping bantuan 2. Pantau kondisi 3. apa lagi ya yang memungkinkan" |
| K4 | 15 Nov 2026 | Aturan terbang berbeda per bencana. Contoh pemilik: gunung api tidak boleh didekati. | "Tapi untuk setiap bencana beda, misal kalo misalnya gunung api kan ga boleh dekat" |
| K5 | 15 Nov 2026 | Titik tujuan datang dari koordinasi lapangan dan dikirim sebagai tautan Google Maps; sistem harus bisa membacanya. | "sudah koord dgn pak walikota yg akan di kunjungi Desa Jabi2 kecamatan Sultan Doulat dan landing Zone di Lapangan SMP 2 Sultan Daulat" disertai dua tautan `maps.app.goo.gl` |
| K6 | 15 Nov 2026 | Paket dokumen disusun dulu, baru kode (AGENTS 3.7). | "Ya, susun paketnya" |
| K7 | 24 Nov 2026 | Lapisan bahaya InaRISK dipakai modul Misi Udara lewat tiket modulnya sendiri (diteruskan dari K6 butir 6 paket `inarisk/`). Hasil penyelidikan sumber: lihat D10 dan MU-15. | "gas lanjut semua yang tadi berhenti" (jawaban atas daftar pengembangan 23 Nov, butir 6) |
| K8 | 24 Nov 2026 | Raster InaRISK (indeks bahaya letusan gunung api dan tsunami) dipakai sebagai catatan tingkat `perhatian` saja: tidak pernah larangan, tidak pernah membelokkan rute (jawaban Q18, bagian raster). | "Sebagai catatan" |

## Prinsip yang mengikat semua tiket

1. **Usulan, bukan perintah terbang.** Tiap keluaran memuat kalimat bahwa rute, ketinggian, dan izin wilayah udara ditetapkan pilot (PIC) dan komando. Sistem tidak pernah menulis "aman".
2. **Zona dan ambang hanya dari sumber.** Radius gunung api dari rekomendasi PVMBG per gunung, poligon dari BMKG. Angka tanpa sumber tidak dikodekan; kalau datanya kosong, keluaran menulis "perlu diputuskan orang", bukan angka tebakan.
3. **Tanpa nama orang.** Nama kru, penumpang, dan pejabat yang dikunjungi tidak disimpan dan tidak dicetak (pola Operasi Udara).
4. **Tidak ada data dummy.** Kolom yang belum ada datanya tampil "–".
5. **Satu mesin.** Tidak ada `renlap_<bencana>.py` baru (Paritas D1). Mesin tinggal di `scripts/umum/`.
6. **Data basi ditandai.** Tiap pemeriksaan zona mencetak jam data sumbernya; data di atas batas basi diperlakukan sebagai tidak ada.

## Keputusan rancangan (boleh diubah pemilik)

| No | Keputusan | Alasan |
| -- | --------- | ------ |
| D1 | Modul bernama Misi Udara, kode tiket `MU-`. Ia bagian dari renlap generik Paritas (PB-13), bukan mesin kedua: mesin di `scripts/umum/misi_udara.py`, memakai keluaran bersama `scripts/umum/renlap_keluaran.py`. | Paritas D1 melarang salinan per bencana; PB-15 akan menghapus `renlap_banjir.py`. |
| D2 | Renlap karhutla yang sudah ada (patroli, water bombing) dan zona semai awan tidak diubah dan tidak diduplikasi. Misi Udara hanya menambah jenis misi yang belum ada. | Paket Operasi Udara dan Semai Awan sudah mengaturnya; karhutla tidak boleh mundur. |
| D3 | Enam jenis misi di tahap pertama: dropping bantuan, pantau kondisi, evakuasi, angkut personel dan alat, pencarian (SAR), kunjungan lapangan. Rincian di PRD bagian 3. | K3; riset RISET bagian 2. |
| D4 | Dua tingkat pemeriksaan: **larangan** (rute atau titik darat masuk zona larang bersumber resmi: mesin membelokkan leg atau menolak titik) dan **perhatian** (kondisi yang perlu dilihat pilot: dicetak sebagai catatan, rute tidak diubah). | Hanya zona bersumber resmi yang layak mengubah rute; sisanya keputusan pilot. |
| D5 | Aturan per bencana dinyatakan sebagai data di `scripts/umum/batas_terbang.json`: tiap baris punya nilai, satuan, sumber, dan tingkat keyakinan: A (resmi dibaca langsung), B (sekunder), atau S (bawaan sementara, wajib menyebut nomor Q). Uji menolak baris tanpa sumber, baris berkeyakinan C, dan baris S tanpa nomor Q. Angka S selalu tampil berlabel "sementara". | Pola `TARIF` Paritas (ALGORITMA 6); memudahkan pemilik mengganti angka. |
| D6 | Tahap 1 berjalan tanpa D1 dan tanpa rute Worker baru: perintah baris dan bot WA menghasilkan PDF, KML, GPX, teks WA, JSON. Tahap 2 menyimpan di tabel sendiri `pb_misi` dan `pb_misi_hasil` dengan awalan R2 `operasi/misi/`, meniru pola pemicu workflow renlap Paritas (PB-12, PB-14) tanpa memakai tabelnya. Tahap 3 layar isian di `/operasi`. | Kebutuhan hari ini adalah berkas untuk pilot; `pb_renlap` satu renlap per provinsi per tanggal sehingga tidak cocok untuk flight plan lintas provinsi. |
| D7 | Keluaran flight plan tidak ditulis ke `public/`. Keluaran yang memuat kunjungan lapangan tidak di-commit ke repo (repo ini publik). | KEAMANAN-PRIVASI bagian 2; lihat Q9. |
| D8 | Titik diterima dalam empat bentuk: koordinat desimal, DMS, tautan Google Maps (panjang atau pendek), dan plus code. Nama tempat saja tidak diterima sebagai titik. | K5; nama tempat ambigu. |
| D9 | Fungsi `rencana` dan `susun_tetap` di `scripts/operasi/renlap_banjir.py` dipindah ke mesin umum di tiket MU-03, lalu dua fungsi itu dihapus dari sana di tiket yang sama; berkasnya sendiri dihapus PB-15. Sampai itu selesai, fungsi itu tetap dipakai untuk kebutuhan mendesak. | Menghindari dua mesin; PB-15. |
| D10 | Lapisan bahaya InaRISK (`gis.bnpb.go.id/server/rest/services/inarisk`) belum menjadi sumber zona. Probe 24 Nov 2026: semua lapisan bahaya letusan gunung api dan tsunami yang terbuka berupa raster (`layer_bahaya_letusan_gunungapi` dan `_30`, `layer_bahaya_tsunami` dan `_30`: MapServer berisi satu "Raster Layer"; ImageServer `INDEKS_BAHAYA_*` piksel F32; `FeatureServer` tidak ada; `query` ditolak). Layanan vektor KRB yang bernama jelas (`layer_risiko_*`, `layer_kerentanan_*`, `Gunung_Semeru`, `gunung_agung`) menjawab "Token Required". Satu-satunya lapisan vektor tsunami (`RENEVAK_tsunami`) hanya jalur evakuasi ITDC Bali. Raster indeks tidak divektorkan dengan ambang karangan sendiri (prinsip 2). Tiket MU-15 memuat pilihannya. | Zona harus bersumber dan berbentuk pasti; raster indeks tanpa ambang resmi bukan zona larangan. |
| D11 | Pencari kelas InaRISK ada di `scripts/umum/zona_terbang.py` (MU-15): ImageServer `INDEKS_BAHAYA_GUNUNGAPI` dan `INDEKS_BAHAYA_TSUNAMI` lewat `identify` per titik darat dan simpul rute. Legenda layanan bertipe "Stretched" (ramp 0 sampai 1, tanpa batas kelas; MapServer tsunami "Token Required"), jadi tiap baris mencatat nilai indeks mentah dan kelas "belum ada dari legenda"; tidak ada ambang karangan. Baris hanya tingkat `perhatian`, wajib memuat URL layanan dan tanggal ambil (tanpa itu ditolak). Titik tanpa nilai (NoData) dicatat "tidak ada nilai", bukan 0; gagal atau timeout dicatat "InaRISK tidak menjawab", bukan galat fatal. Tembolok di `data/raw/misi_udara/` (digitignore, tidak ke `public/`). | K8; prinsip 2 (ambang hanya dari sumber). |

## Pertanyaan terbuka untuk pemilik

| Q | Pertanyaan | Bawaan sementara | Menahan |
| - | ---------- | ---------------- | ------- |
| Q1 | Enam jenis misi di D3 sudah pas? Ada yang ditambah (muatan gantung, pemetaan drone, relai komunikasi) atau dibuang? | [SEMENTARA] enam jenis di D3; tiga lainnya di luar lingkup | tidak menahan |
| Q2 | Tipe helikopter apa yang dipakai BNPB dan mitranya, dan angka kecepatan jelajah, daya tahan, dan muatannya dari mana (operator, kontrak)? Riset hanya menemukan angka sekunder. | [SEMENTARA] tipe dipilih dari daftar di ALGORITMA bagian 6 berlabel "angka umum, belum dari operator"; bawaan 200 km/jam bila tipe tidak dipilih; pemeriksaan daya tahan hanya jalan bila tipe dipilih | MU-06 |
| Q3 | Cadangan bahan bakar: 20 menit (siang, visual) dan 30 menit (malam) seperti aturan Eropa dan Amerika, atau ketentuan operator? Aturan Indonesia belum terbaca. | [SEMENTARA] 30 menit untuk semua, berlabel sementara | MU-06 |
| Q4 | Jarak penyangga di luar radius larangan gunung api: berapa km di luar radius PVMBG rute boleh lewat? | [SEMENTARA] 5 km di luar radius PVMBG, berlabel sementara; tidak ada sumber resmi untuk angka ini | MU-05 |
| Q5 | Gunung api Level I (Normal) tanpa radius rekomendasi: boleh dilintasi tanpa catatan? | [SEMENTARA] tidak dibelokkan, dicetak sebagai perhatian dengan nama gunung dan levelnya | tidak menahan |
| Q6 | Syarat lapangan pendaratan memakai standar mana? Yang terbaca hanya NWCG PMS 510 (Amerika, kebakaran hutan). | [SEMENTARA] angka PMS 510 dicetak sebagai daftar periksa untuk tim darat, berlabel sumbernya; mesin tidak menilai lapangan dari citra | tidak menahan |
| Q7 | Ambang cuaca: tetap memakai ambang kelayakan terbang Operasi Udara (jarak pandang 1.500 m dan 5.000 m, angin 20 dan 30 knot, badai guntur)? Ambang itu rancangan agent, bukan ketentuan resmi. | [SEMENTARA] dipakai sama persis, satu sumber rumus, berlabel "perkiraan" | MU-07 |
| Q8 | Saat peringatan tsunami aktif, titik darat di kabupaten pesisir yang kena peringatan ditolak, atau hanya diberi catatan? | [SEMENTARA] ditolak sebagai titik darat (larangan), lintasan di atasnya tetap boleh | MU-07 |
| Q9 | Flight plan yang memuat kunjungan pejabat boleh disimpan di repo publik? Flight plan 15 Nov (kunjungan ke Sultan Daulat) sudah ter-commit di `data/laporan-bnpb/paparan/flight-plan-banjir-2026-11-15/`. | [SEMENTARA] tidak: keluaran berjenis kunjungan ditulis ke luar repo; berkas 15 Nov dibiarkan sampai pemilik memutuskan dihapus atau tidak | MU-04 |
| Q10 | Siapa boleh membuat dan membaca flight plan di layar: hanya peran `pusdalops`, atau juga akun instansi BPBD untuk wilayahnya (pola Paritas Q3)? | [SEMENTARA] buat: `pusdalops`; baca: sama dengan hak baca `/api/operasi/peta`; jenis kunjungan hanya `pusdalops` | MU-10 |
| Q11 | Tautan pendek Google Maps harus dibuka ke Google untuk mendapat koordinat. Boleh mesin membukanya (alamat titik terkirim ke Google), atau staf menempel koordinat saja? | [SEMENTARA] perintah baris dan bot WA di Mac mini boleh membuka tautan; Worker tidak | MU-02 |
| Q12 | Base selain sembilan base karhutla (misal Lanud Soewondo): diisi staf per kejadian, atau dibuat daftar tetap bandara dan lanud? | [SEMENTARA] diambil dari `public/data/udara.json` (864 titik bandara, helipad, pangkalan) atau diketik sebagai titik | tidak menahan |
| Q13 | Pola pencarian SAR: cukup pola kotak melebar dan lintasan sejajar dengan jarak lintasan yang diketik staf, atau menunggu tabel resmi IAMSAR (belum terbaca)? | [SEMENTARA] dua pola itu, jarak lintasan wajib diketik, tanpa bawaan | MU-08 |
| Q14 | Zona hening SAR runtuhan gempa dan sektor larangan gunung api di luar lingkaran (misal sektor tenggara Semeru 20 km): diisi staf sebagai zona manual per kejadian? | [SEMENTARA] ya, zona manual (lingkaran atau poligon) dengan alasan dan sumber wajib | MU-05 |
| Q15 | Misi malam: dibuat atau ditolak? | [SEMENTARA] tidak ditolak; jam berangkat di luar 06.00 sampai 18.00 waktu setempat dicetak sebagai perhatian | tidak menahan |
| Q16 | Tiga jarak pemeriksaan tanpa sumber resmi: gunung Level II ke atas tanpa radius diperiksa dalam 30 km dari rute, gunung Level I dicatat dalam 15 km, siklon aktif dicatat dalam 300 km. Angkanya pas? | [SEMENTARA] 30 km, 15 km, 300 km, berlabel sementara | MU-05, MU-07 |
| Q17 | Angka kerja mesin yang tidak punya sumber resmi: batas basi data (gunung api 48 jam, abu 12 jam, tsunami 6 jam, siklon 12 jam, banjir dan longsor 24 jam, METAR 3 jam), kelonggaran belokan 5 persen di luar jari-jari, saran isi ulang dalam 30 km dari rute, titik acuan plus code pendek dalam 50 km, 2 menit per titik untuk dropping lempar rendah, dan 2 menit orbit per titik pantau (mengikuti `ORBIT_MNT` renlap karhutla). Angkanya pas? | [SEMENTARA] seperti tertulis, semuanya di `batas_terbang.json` berkeyakinan S | tidak menahan |
| Q18 | [TERJAWAB 24 Nov 2026, K8] Raster InaRISK dipakai sebagai catatan **perhatian** saja, tidak pernah larangan atau pembelok rute. **Bagian token tetap terbuka**: adakah token resmi untuk layanan "Token Required" (KRB vektor, MapServer tsunami)? Sampai ada, layanan itu dilewati; tidak ada token di repo. Kelas dari legenda belum bisa karena legenda Stretched tanpa batas kelas (D11). | [SEMENTARA, bagian token] tidak ada token; hanya ImageServer terbuka | tidak menahan |
