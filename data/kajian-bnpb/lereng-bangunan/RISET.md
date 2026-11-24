# RISET: Bangunan di lereng terjal

Riset ini disusun dari isi repo dan keterangan pemilik per 23 Nov 2026. Tidak ada data yang diunduh dan tidak ada situs yang dibuka untuk menulisnya. Hal yang berasal dari ingatan, bukan dari berkas repo, ditandai **[periksa]** dan diperiksa ke sumbernya di LT-02 sebelum dipakai.

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

## 3. Cara orang lain menghitung bangunan di lereng **[periksa]**

Praktik umum (ingatan, bukan dari sumber yang dibuka): lereng dihitung dengan jendela 3 kali 3 (Horn) dari DEM, dinyatakan dalam persen atau derajat, lalu bangunan diberi nilai lereng titik pusat atau rata-rata zonal; ambang bergantung peraturan atau peneliti. Pemakaian lereng 40 persen sebagai batas kawasan lindung dan lahan curam lazim di peraturan Indonesia (dugaan: kriteria kelerengan penataan ruang dan kehutanan). Yang harus diverifikasi ke teksnya di LT-02: nama peraturan, bunyi ambang (40 persen atau lebih? lebih dari 40 persen?), dan apakah itu ambang longsor atau ambang fungsi lindung. Tidak satu pun dari ini ditulis sebagai fakta di layar sebelum diperiksa.

## 4. Risiko yang diketahui

1. DSM bukan tanah. DEMNAS (SAR dan stereo, **[periksa]** dasar TerraSAR-X, ALOS, dan titik massa) dan GLO-30 (TanDEM-X) menangkap permukaan: atap, pohon, dan tepi dinding menciptakan lereng lokal yang bukan lereng tanah. Lereng atap dan tepi bangunan naik, lereng di bawah kanopi bisa turun. Mitigasi di ALGORITMA 4.
2. Resolusi berbeda. Jendela 3 kali 3 memakai sekitar 24 m pada DEMNAS dan 90 m pada GLO-30. Lereng di tebing sempit lebih curam pada DEM halus. Karena itu "sepakat" memakai keduanya pada resolusi asli, dan kelas D (hanya DEMNAS) lebih banyak daripada G (hanya GLO-30) adalah pola yang diharapkan, bukan kesalahan.
3. Tanggal. Keduanya jauh lebih tua dari 2026. DEMNAS Jakarta tercatat sumber TerraSAR-X 2011 (`medan.py`). Lereng sebelum kejadian wajar untuk uji "awal lereng", tetapi bangunan Overture adalah 2026: bangunan baru di lereng tidak dilihat DEM lama, dan tanah yang dipotong untuk rumah (cut and fill) tidak ada di DEM. Overture rilis Oktober 2026 dibuat sesudah kejadian 2025 sampai Januari 2026, jadi uji desa membawa bias arah yang tidak pasti (ALGORITMA 8).
4. Datum vertikal. Keduanya diharapkan EGM2008 **[periksa dari metadata di LT-04]**; selisih datum tidak memengaruhi lereng tetapi memengaruhi potongan melintang bila dua DEM digambar bersama.
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
