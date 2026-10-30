# Bank Masalah Riset Kebencanaan untuk Kemitraan Perguruan Tinggi

Disusun 30 Oktober 2026 dari hasil uji model Pantau Bencana terhadap logbook Pusdalops BNPB 2026. Tiap masalah di
bawah berangkat dari model yang sudah diuji dan GAGAL, atau dari data yang terbukti bolong. Angkanya bisa diulang
dengan perintah yang disebut, jadi tim kampus mulai dari titik yang sama dengan kami, bukan dari nol.

Cara memakai: satu masalah = satu proposal riset bersama (joint research) yang diajukan ke pendanaan luar. Datanya
sudah siap dan dibagikan. Kriteria berhasilnya ditetapkan SEBELUM riset dimulai (pra-registrasi), supaya hasil
negatif tetap sah sebagai temuan dan tidak disetel ulang sampai "lulus".

## 1. Peringatan dini banjir dari hujan tidak cukup

**Masalahnya.** Kaidah status banjir berbasis hujan (`scripts/banjir/status.py`) diuji pada 2026, tahun yang tidak
pernah dipakai menyusunnya. Status Waspada menangkap 54% hari banjir, tetapi 88% Waspada tidak diikuti banjir.
ETS 0,078; syarat lulus batas bawah ETS > 0,1. Model GBDT kabupaten-hari juga TIDAK LULUS pada uji 2024-2025:
lebih baik dari kaidah, tetapi tidak lebih baik dari regresi logistik biasa. Hujan ERA5 di titik kabupaten tidak
memprediksi tinggi air, lama banjir, maupun rumah terdampak (korelasi Spearman antara -0,11 dan 0,16).

**Kenapa sulit.** Banjir ditentukan aliran sungai dari hulu ("air kiriman"), kapasitas drainase, relief lokal, dan
tutupan lahan, bukan hujan di satu titik. Label kejadian (DIBI) kurang lapor dan tanggalnya kasar.

**Pertanyaan riset.**
- Seberapa besar keterampilan bertambah bila debit sungai (GloFAS, pos duga BBWS/SIHKA) dan hujan hulu DAS masuk
  model? Prapendaftaran sudah ada: `scripts/banjir/PRAREG-DEBIT.md`, uji prospektif Nov 2026 - Apr 2027.
- Apakah koefisien per daerah (kapasitas tampung, Curve Number, luas hulu) yang dipelajari dari 20 tahun kejadian
  bisa memprediksi tinggi air dan KK terdampak lebih baik dari rata-rata historis kabupaten itu?
- Bagaimana menggabungkan label DIBI, logbook BPBD, dan berita (Google Groundsource) jadi satu katalog yang
  bisa dipercaya?

**Data siap.** Logbook 2026 (2.232 kejadian; tinggi air, lama, KK, rumah per kejadian): `public/data/logbook_kejadian.json`.
DIBI kabupaten-hari, hujan ERA5, debit GloFAS, cache uji balik. Rincian: `scripts/banjir/RISET-LOGBOOK.md`,
`RISET-MODEL-KAB.md`.

**Bidang ilmu.** Hidrologi, teknik sipil (drainase), statistika, sains data, geografi.

**Berhasil bila** batas bawah CI95 selisih ETS terhadap model tanpa variabel baru > 0 di periode uji yang belum dibuka.

## 2. Peringatan longsor terlalu banyak meleset

**Masalahnya.** Nowcast longsor (gaya LHASA) bagus untuk menyaring kabupaten rawan: AUC kabupaten 0,83, 76%
kejadian logbook tertangkap. Tetapi 98% peringatannya tidak diikuti kejadian. Peringatan yang hampir selalu salah
akan diabaikan di lapangan.

**Kenapa sulit.** Ambang hujan pemicu longsor berbeda per daerah (tanah, lereng, vegetasi, lapisan batuan), sedangkan
kejadian per kabupaten sedikit. Label lokasi sering hanya sampai kecamatan.

**Yang sudah dicoba dan gagal (30 Okt 2026, `scripts/longsor/RISET-AMBANG-KAB.md`).** Ambang persentil hujan 3/7 hari per
kabupaten yang ditarik ke ambang regional (empiris Bayes), dilatih DIBI 2015-2025 dan diuji logbook 2026: pada jumlah alarm
sama, ETS turun dari 0,0098 ke 0,0033 (dETS -0,0065, CI95 -0,010 s.d. -0,003). Ambang per kab tidak lebih baik dari satu ambang
regional. Saringan kecamatan dengan bahaya InaRISK tidak berpengaruh (nilainya ~1 hampir di mana-mana); saringan riwayat
kejadian membuang 94% alarm tetapi juga 92-97% kejadian. Hujan NASA POWER 0,5 derajat satu titik per kab kalah dari ERA5
per sel, jadi sumber hujan dan metode belum terpisahkan. Repo belum punya lapisan lereng/tanah/sesar per kecamatan.

**Pertanyaan riset.**
- Ambang hujan per kabupaten atau per kelompok daerah serupa (partial pooling) dari kejadian sebelum 2026: berapa
  alarm palsu yang turun dan berapa kejadian yang hilang?
- Apakah penyaringan sampai kecamatan (kerentanan lereng, tanah, sesar, riwayat) menurunkan alarm palsu tanpa
  kehilangan kejadian besar?
- Apakah pengukuran lapangan murah (penakar hujan dan sensor kelembapan tanah di desa rawan) mengubah hasilnya?

**Data siap.** Label longsor logbook (115 kejadian + 40 banjir-longsor, dengan kecamatan), DIBI, NASA Global
Landslide Catalog, nowcast harian `public/longsor/data`. Rincian: `scripts/banjir/RISET-LOGBOOK-LONGSOR.md`,
`scripts/longsor/RISET-AMBANG-KAB.md`.

**Bidang ilmu.** Geologi teknik, geoteknik, statistika spasial, mahasiswa KKN untuk pengukuran lapangan.

**Berhasil bila** pada jumlah kejadian tertangkap yang sama, alarm palsu turun dengan batas atas CI95 di bawah kaidah sekarang.

## 3. Laporan karhutla BPBD kurang lengkap

**Masalahnya.** 94% kejadian karhutla di logbook punya titik panas di kabupatennya, tetapi kabupaten atau tanggal
acak juga mendapat 82-85%; nilai tambah sebenarnya hanya 1,15-1,21 kali dari kebetulan. Sebaliknya, 85%
kabupaten-minggu dengan 30 titik panas atau lebih tidak punya laporan BPBD sama sekali. Logbook tidak memuat
koordinat api, jadi luas versi BPBD tidak bisa dipakai mengkalibrasi luas dari satelit.

**Kenapa sulit.** Kapasitas pelaporan BPBD berbeda jauh antar-daerah; tidak jelas apakah titik panas tanpa laporan
berarti api tidak ada, api kecil yang tidak ditangani, atau api yang ditangani tanpa dilaporkan.

**Pertanyaan riset.**
- Dari sampel kabupaten-minggu "titik panas tinggi, belum lapor", berapa yang sungguh terbakar (citra Sentinel-2,
  cek lapangan) dan berapa yang ditangani tanpa laporan?
- Faktor apa yang menjelaskan kelengkapan laporan: jarak, kapasitas BPBD, status siaga, jaringan?
- Format laporan minimal apa (koordinat, luas, status padam) yang realistis diisi BPBD?

**Data siap.** Daftar harian kabupaten belum lapor `public/data/karhutla_belum_lapor.json`, titik panas lokasi unik
375 m (4 satelit), cluster dan luas harian, logbook. Rincian: `scripts/data/RISET-LOGBOOK-KARHUTLA.md`.

**Bidang ilmu.** Kehutanan, penginderaan jauh, administrasi publik, mahasiswa KKN sebagai verifikator lapangan.

**Berhasil bila** proporsi "belum lapor yang sungguh terbakar" diperkirakan dengan selang kepercayaan 95% dari
sampel acak berlapis, dan usulan format laporan diuji coba di sedikitnya tiga BPBD.
