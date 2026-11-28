# RISET: Bangunan di lereng terjal

Riset ini disusun dari isi repo dan keterangan pemilik per 23 Nov 2026. Bagian 1 sampai 6 disusun dari isi repo dan keterangan pemilik tanpa membuka situs. Hal yang berasal dari ingatan ditandai **[periksa]**; sebagian sudah diperiksa di LT-02 (24 Nov 2026, bagian 7 di bawah) dan ditandai **[LT-02]**, sisanya tetap **[periksa]** atau **[tidak terverifikasi]**.

## 1. Video rujukan dan apa yang dikatakannya

Keterangan pemilik tentang video GeoImpact "Bandung Barat rawan longsor" (berkas unduhan pemilik, tidak masuk repo): bangunan di lereng di atas 40 persen dihitung per kecamatan dan desa; Bandung Barat lebih dari 5.000 bangunan dan Bandung Raya lebih dari 9.000 di empat kab/kota; lima kecamatan teratas dan kecamatan paling rapat; hanya dihitung bila DEMNAS 8 m dan Copernicus GLO-30 sepakat; wilayah tanpa DEMNAS ditandai; 687 ribu bangunan Overture di Bandung Barat; 21 desa longsor 2025 sampai 2026 dari BPBD, Badan Geologi, dan media; Sentinel-2 sebelum dan sesudah di atas DEMNAS untuk Cisarua dan Pasirlangu Januari 2026 ("awal lereng 45 sampai 60 persen"); potongan melintang cekungan; kolom 3D per kecamatan.

Yang tidak diketahui dari keterangan itu, dan harus dijawab paket ini: bagaimana lereng diberikan ke bangunan (titik, jejak, atau cincin), apakah "dua peta sepakat" berlaku per bangunan atau per piksel, seberapa lengkap Overture di tiap desa, dan apa yang dilakukan terhadap kesalahan model permukaan. Angka video dipakai sebagai sasaran pembanding hasil kita, tidak disetel (KEPUTUSAN D13).

## 2. Yang sudah ada di repo (dipakai ulang, tidak disalin)

| Kebutuhan | Yang ada | Catatan untuk modul ini |
| --- | --- | --- |
| Lereng kecamatan | `scripts/longsor/lab_lereng.py`: DEM Terrarium z10 (sekitar 150 m), p75 per kecamatan dalam derajat, sampel sampai 40 titik per kecamatan, numpy di venv | Terlalu kasar untuk bangunan; satuan derajat (`rumus.skor_lereng`). Tidak diubah. Modul baru hitung persen pada resolusi asli DEM. |
| Skor dan uji longsor | `rumus.py`, `model.py`, `model_lhasa2.py`, `PRAREG-LHASA2*.md`, `public/longsor/data/*` | Nowcast gagal uji balik (AUC 0,70 sampai 0,74 lawan klimatologi 0,78); tidak dipakai untuk menilai lapisan ini. |
| Kejadian longsor | `scripts/longsor/kejadian.py` (GLC, DIBI, PVMBG), `tanggapan_pvmbg.py` (MAGMA 1.096 kejadian 2016 sampai 2023, nama petugas dibuang) | Tingkat kab, hari. Untuk uji nasional tingkat kecamatan (LT-25), bukan untuk 21 desa 2025 sampai 2026. |
| DEMNAS dan GLO-30 | `scripts/banjir/genangan/medan.py`: DEMNAS 8 m (diunduh pemilik, hanya Jakarta), GLO-30 dari `copernicus-dem-30m` S3 per ubin 1 derajat COG; pembaca TIFF stdlib `tiff_mini.py`; keduanya digambarkan sebagai DSM (permukaan, bukan tanah gundul) | Pola unduh manual DEMNAS dan pembaca TIFF dipakai ulang. Berkas banjir tertentu beku sidik J4; hanya dibaca. |
| Tanah gundul | `scripts/banjir/fabdem.mjs`: FABDEM V1-2, CC BY-NC-SA 4.0, tidak tampil di layar publik | Hanya audit internal bias DSM (Q12). |
| Bangunan Overture | `scripts/siklus/sumber.json` entri `overture-buildings`: rilis 2026-10-21.0, 512 berkas zstd.parquet 276,9 GB, dibaca di tempat dengan DuckDB 1.4.5 httpfs, ODbL; bangunan Indonesia dalam bbox 115.179.810 (menghitung 711 dtk); atribut `height` terisi 0,07 persen, `num_floors` 1,3 persen, `class` 1,2 persen, `subtype` 1,4 persen (sampel Jakarta); keputusan 29: jangan salin utuh ke R2 | Dasar D4. Pemilik entri: `siklus`. |
| Bangunan Open Buildings | `scripts/umum/bangunan.py` (grid 0,01 derajat dan sel 110 m, terkunci di `data/terkunci/bangunan/`), `paparan_bangunan.py`, `.github/workflows/bangunan.yml` | Catatan siklus F2-01: grid baru untuk provinsi 13, 33, 63 (angka itu dari dokumen; Jawa Barat 32 tidak ada di `kec.json`, jadi Bandung Raya belum punya pembanding kelengkapan sampai grid 32 dibuat, LT-03). Belum ada bahaya longsor. |
| Paparan terpadu | `scripts/siklus/paparan.py` (F2: sel 110 m, ambang keyakinan 0,70, tiga sumber jiwa berdampingan), `bahaya_kelas.py` | Dasar satu mesin paparan (D3). |
| Batas wilayah | `scripts/geo/batas.py`: kecamatan BIG (Juni 2026), tally terhadap Kemendagri; `public/geo/desa/<kab>.json` 513 berkas, tiap fitur hanya `kd` (misal `11.01.01.2001`), MultiPolygon | Batas desa ada tetapi tanpa nama dan tanpa catatan asal (Q6). `kd[:8]` memberi kecamatan Kemendagri, bisa beda dari BIG (`selisih_kemendagri.json`). |
| Kelengkapan bangunan OSM | paket `data/kajian-bnpb/pemetaan-relawan/`, `scripts/pemetaan/kelengkapan.py` (ohsome, rasio terhadap Open Buildings, "tidak tersedia" bukan 0) | Pola "tidak tersedia bukan 0" dipakai ulang. OSM bukan pembanding sah untuk Overture (sekitar 80 persen Overture berasal dari OSM, rasio palsu memadai); ohsome tidak menghasilkan kelas kelengkapan di modul ini. |
| Citra | `scripts/umum/citra_terbuka.py` (indeks OpenAerialMap), paket `kerusakan-satelit/` (Sentinel 10 m kuat untuk banjir dan kebakaran, lemah untuk gempa) | Belum ada penarik Sentinel-2 untuk longsor; LT-15 menambahnya. |
| Peta di layar | MapLibre GL 4.7.1 sudah dipakai di `public/index.html`, `public/banjir/index.html` | Kolom 3D lewat `fill-extrusion`, bila lolos pemeriksaan skill `modern-web-guidance` (LT-18). |

## 3. Cara orang lain menghitung bangunan di lereng **[LT-02: ambang diperiksa, praktik jendela 3x3 tetap ingatan]**

Praktik umum (ingatan, bukan dari sumber yang dibuka): lereng dihitung dengan jendela 3 kali 3 (Horn) dari DEM, dinyatakan dalam persen atau derajat, lalu bangunan diberi nilai lereng titik pusat atau rata-rata zonal; ambang bergantung peraturan atau peneliti. Pemakaian lereng 40 persen sebagai batas kawasan lindung dan lahan curam lazim di peraturan Indonesia (dugaan: kriteria kelerengan penataan ruang dan kehutanan). Hasil pemeriksaan LT-02: lihat bagian 7. Ambang 40 persen ada di Keppres 32/1990 Pasal 8 huruf b sebagai kriteria hutan lindung ("40% atau lebih"), bukan ambang longsor; Permen PU 22/2007 memakai "lebih dari 40%" untuk zona tipe A rawan longsor. Jendela 3x3 (Horn) tetap ingatan, **[periksa]**.

## 4. Risiko yang diketahui

1. DSM bukan tanah. DEMNAS (menurut halaman produk BIG dibangun dari IFSAR 5 m, TerraSAR-X 5 m, ALOS PALSAR 11,25 m, ditambah data stereo titik massa **[LT-02]**) dan GLO-30 (TanDEM-X) menangkap permukaan: atap, pohon, dan tepi dinding menciptakan lereng lokal yang bukan lereng tanah. Lereng atap dan tepi bangunan naik, lereng di bawah kanopi bisa turun. Mitigasi di ALGORITMA 4.
2. Resolusi berbeda. Jendela 3 kali 3 memakai sekitar 24 m pada DEMNAS dan 90 m pada GLO-30. Lereng di tebing sempit lebih curam pada DEM halus. Karena itu "sepakat" memakai keduanya pada resolusi asli, dan kelas D (hanya DEMNAS) lebih banyak daripada G (hanya GLO-30) adalah pola yang diharapkan, bukan kesalahan.
3. Tanggal. Keduanya jauh lebih tua dari 2026. DEMNAS Jakarta tercatat sumber TerraSAR-X 2011 (`medan.py`). Lereng sebelum kejadian wajar untuk uji "awal lereng", tetapi bangunan Overture adalah 2026: bangunan baru di lereng tidak dilihat DEM lama, dan tanah yang dipotong untuk rumah (cut and fill) tidak ada di DEM. Overture rilis Oktober 2026 dibuat sesudah kejadian 2025 sampai Januari 2026, jadi uji desa membawa bias arah yang tidak pasti (ALGORITMA 8).
4. Datum vertikal. Keduanya EGM2008 menurut halaman sumber masing-masing **[LT-02]**; metadata berkas tetap diperiksa di LT-04; selisih datum tidak memengaruhi lereng tetapi memengaruhi potongan melintang bila dua DEM digambar bersama.
5. Kelengkapan Overture. Overture memadukan OSM (80,5 persen bangunan di sampel Jakarta), Microsoft ML (6,3), dan Google (13,3). Di desa pegunungan yang belum dipetakan, bangunan hilang atau tergabung. Angka bangunan adalah batas bawah. Pembanding hanya Open Buildings; provinsi tanpa grid (Jawa Barat) berkelas "tidak diketahui".
6. Bangunan bukan rumah. Kelas bangunan hampir tidak terisi.
7. Bias pemberitaan untuk uji. Desa longsor yang diberitakan cenderung berpenduduk lebih banyak dan lebih mudah diakses. Pembanding harus mengontrol jumlah bangunan total.
8. Hanya 21 desa. Selang kepercayaan lebar; hasil tidak boleh dibaca sebagai bukti prediktif.
9. Ambang dipilih dari video. 40 persen sudah ada sebelum data dilihat, tetapi kejadian Cisarua adalah alasan hipotesis ini ada; desa itu adalah kasus perintis, bukan bukti independen.
10. Lisensi. DEMNAS (syarat BIG), ODbL (Overture), CC BY (Open Buildings, FABDEM NC); lihat KEAMANAN-PRIVASI.
11. Awan. Citra Sentinel-2 Januari (musim hujan) sering tertutup awan; sebelum dan sesudah yang bersih mungkin berjarak berminggu-minggu.

## 5. Pelajaran dari modul longsor yang berlaku di sini

- Klimatologi kab dan bulan mengalahkan model hujan dan lereng; selisih laju lapor antar kab menipu. Uji desa harus dibandingkan di dalam wilayah yang sama (kab atau kecamatan), bukan antar kab.
- Menyetel setelah melihat hasil uji adalah bocor; kriteria dibekukan lebih dulu (LT-13), seperti PRAREG.
- Kuota dan ukuran: Open-Meteo harian habis; di sini yang mahal adalah waktu baca Overture (711 dtk untuk menghitung seluruh Indonesia, jauh lebih untuk mengambil geometri), jadi bekerja per kotak kab/kota.
- Mentah di `data/raw/` (gitignored) hilang bila worktree dibuang; simpan salinan di luar worktree (kasus 2 Nov).

## 6. Yang belum diketahui

Lisensi dan cakupan DEMNAS per lembar, sumber ambang 40 persen, asal batas desa, apakah grid Open Buildings Jawa Barat ada, ukuran waktu hitung per kab/kota, dan isi daftar 21 desa. Semuanya masuk Q atau tiket riset, tidak ditebak.

## 7. Hasil LT-02: pemeriksaan sumber (diakses 24 Nov 2026)

Dibaca dari halaman atau berkas sumber, bukan dari ingatan. Yang tidak bisa dibuka ditulis tidak terverifikasi.

**(a) Ambang 40 persen (menjawab Q1).**
- Keppres 32/1990 tentang Pengelolaan Kawasan Lindung, Pasal 8: "Kriteria kawasan hutan lindung adalah: a. Kawasan Hutan dengan faktor-faktor lereng lapangan, jenis tanah, curah hujan yang melebihi nilai skor 175, dan/atau; b. Kawasan hutan yang mempunyai lereng lapangan 40% atau lebih dan/atau c. ... ketinggian ... 2.000 meter atau lebih." Satuan persen; batas **atau lebih** (>=). Dibaca dari berkas PDF peraturan.bpk.go.id (https://peraturan.bpk.go.id/Download/54118/KEPPRES%20NO%2032%20TH%201990.pdf) dan dicocokkan dengan https://pasal.id/peraturan/keppres/keppres-no-32-tahun-1990. Konteksnya fungsi lindung hutan (erosi, sedimentasi, hidrologi, Pasal 7), bukan ambang longsor, dan berlaku untuk kawasan hutan.
- Permen PU 22/PRT/M/2007 (Pedoman Penataan Ruang Kawasan Rawan Bencana Longsor), dibaca dari PDF (https://bpbd.sukabumikota.go.id/wp-content/uploads/2021/10/PERATURAN-MENTERI-PEKERJAAN-UMUM-NOMOR-22-TAHUN-2007.pdf, salinan BPBD Kota Sukabumi): zona tipe A "kemiringan lereng lebih dari 40%" dengan ketinggian di atas 2000 m; tipe B 21% sampai 40% (500 sampai 2000 m); tipe C 0% sampai 20%; juga menyebut kawasan rawan longsor umumnya berkemiringan "lebih dari 40%". Batas di sini **lebih dari** (>), beda dari Keppres. Bagian lampiran pedoman, bukan pasal larangan; nomor halaman tidak dicatat.
- PP 26/2008 (RTRWN): tidak ditemukan kriteria persen lereng di bagian yang dibuka (hanya sebagian teks terbuka). **[tidak terverifikasi]**. Status berlaku Keppres 32/1990 terhadap PP 26/2008 dan PP 13/2017: **[tidak terverifikasi]** (pasal.id hanya melabeli "berlaku", belum ditinjau).
- SK Mentan 837/Kpts/Um/11/1980 (skor kelerengan): keberadaannya terkonfirmasi lewat makalah sekunder sebagai dasar skor lereng, jenis tanah, curah hujan; tabel skor dan kelas lereng **[tidak terverifikasi]** (tidak dibuka).
- Kesimpulan untuk Q1: sumber tertulis layar boleh berbunyi "kriteria lereng 40 persen atau lebih pada Keppres 32/1990 Pasal 8 (hutan lindung) dan lebih dari 40 persen pada Permen PU 22/2007 (zona rawan longsor tipe A); bukan ambang kejadian longsor". Pilihan >= atau > menentukan satu piksel pada tepat 40 persen; kepekaan 30, 45, 60 persen tetap dilaporkan. Bukan nasihat hukum.

**(b) Lisensi DEMNAS (Q2).** Halaman produk BIG (https://www.big.go.id/en/content/produk/demnas): resolusi 0,27 detik busur, datum vertikal EGM2008, sumber IFSAR, TerraSAR-X, ALOS PALSAR, ditambah data stereo titik massa; **tidak memuat lisensi, syarat penerbitan turunan, atau atribusi**. Halaman unduhan tanahair.indonesia.go.id/demnas tidak terbaca lewat alat. **Lisensi dan syarat turunan agregat: tidak terverifikasi.** Tindakan: pemilik atau BIG memastikan syaratnya saat mengunduh lembar (Q2); sementara atribusi "Badan Informasi Geospasial (DEMNAS)" tetap dipasang dan hanya agregat per desa dan kecamatan diterbitkan.

**(c) ODbL untuk agregat Overture (Q11).** Dokumentasi Overture (https://docs.overturemaps.org/attribution/): tema bangunan berlisensi ODbL; baris atribusi daftar: OpenStreetMap contributors (ODbL), Esri Community Maps contributors (CC BY 4.0), Microsoft Global ML Building Footprints (ODbL), Google Open Buildings (CC BY 4.0), dan lainnya; halaman itu tidak membahas data turunan secara eksplisit. Teks ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/): Produced Work (karya yang dihasilkan dari isi basis data, termasuk gambar dan teks) wajib diberi pemberitahuan sumber bila dipakai publik (4.3) dan tidak memicu berbagi-sama (4.5b); Derivative Database yang dipakai publik harus diterbitkan di bawah ODbL (4.4). Peta dan angka agregat per desa umumnya Produced Work, sedangkan berkas daftar per bangunan atau basis data turunan yang cukup besar adalah Derivative Database. Garis batas antara keduanya untuk tabel agregat **tidak terverifikasi** dan butuh pendapat hukum; keputusan bawaan "tidak menerbitkan basis data per bangunan" tetap benar. Atribusi minimum: "Building data © OpenStreetMap contributors, Microsoft, Esri Community Maps contributors, Google Open Buildings; Overture Maps Foundation" dengan tautan lisensi ODbL.

**(d) Atribusi Copernicus GLO-30.** (https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) Lisensi gratis di seluruh dunia. Bila data didistribusikan ke publik: "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved". Bila data diadaptasi atau diubah: "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved". Lereng turunan termasuk diadaptasi, jadi kalimat kedua dipakai. Pengguna riset diminta mengutip DOI 10.5270/ESA-c5d3d65. Halaman merujuk ESA User License untuk syarat penuh, yang **tidak dibaca**. GLO-30 adalah DSM, akurasi vertikal absolut kurang dari 4 m (90 persen).

**(e) Datum vertikal.** DEMNAS: EGM2008 (halaman produk BIG). GLO-30: EGM2008, EPSG:3855, satuan meter (halaman Copernicus di atas). Keduanya sama datum; metadata berkas tetap dicek di LT-04.

Sisa **[periksa]**: jendela 3x3 Horn sebagai praktik umum (bagian 3), SK Mentan 837/1980, status Keppres 32/1990, lisensi DEMNAS, ESA User License.

## 8. Hasil LT-03: batas desa dan grid pembanding (dijalankan 24 Nov 2026, `python3 scripts/longsor/lereng_bangunan.py batas`)

- Asal `public/geo/desa/<kab>.json` (menjawab Q6): dibangun `scripts/scrape/desa_cari.py` dari `cahyadsn/wilayah_boundaries` (MIT), kode Kepmendagri 300.2.2-2430/2025; batas disederhanakan, bukan SK batas desa; properti hanya `kd`, nama desa ada di `public/data/desa_cari.json`. Bukan batas BIG. Lisensi data turunan batas: MIT untuk berkas; hak atas batas administrasi sumbernya **[tidak terverifikasi]**.
- Bandung Raya: 611 desa (Bandung 280, Bandung Barat 165, Kota Bandung 151, Kota Cimahi 15). Semua desa jatuh (titik pusat dalam poligon) ke satu kecamatan BIG modul longsor; 0 desa tanpa kecamatan, 0 kecamatan BIG tanpa desa. Jumlah kecamatan BIG (31, 16, 30, 3) sama dengan jumlah `kd[:8]` Kemendagri tiap kab. Tally per kecamatan: `data/raw/lereng/batas.json` (gitignored, dihasilkan ulang murah).
- Grid Open Buildings (`data/terkunci/bangunan/kec.json`): hanya provinsi 13, 33, 63. Jawa Barat (32) tidak ada, jadi kelengkapan Overture Bandung Raya berkelas "tidak diketahui" (ALGORITMA 8) sampai grid 32 dibuat. Usulan ke `mekanik-mesin` dan `pipa-umum` (di luar wilayah longsor): `bangunan.yml` sudah punya kelompok `jawa-barat` (prov 31,32,36); jalankan kelompok itu secara manual dan commit `kec.json` baru, tanpa mengubah modul ini.
