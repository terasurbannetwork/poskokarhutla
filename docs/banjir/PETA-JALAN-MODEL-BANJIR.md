# Peta jalan model banjir: dari aturan hujan ke model yang teruji

Disusun 1 Nov 2026 atas permintaan pemilik, sesudah membandingkan dengan Noah AI (ITB, AI Ready ASEAN 2026). Pemilik
menyetujui enam arah: hujan hulu DAS, IMERG, debit sungai plus Google Flood Hub, ganti satuan ramalan, label yang lebih
tajam, dan model dampak. Dokumen ini urutan kerja, bukan hasil. Tiap tahap baru boleh mengklaim "lebih baik" sesudah
vonisnya keluar. Diperiksa validasi-model (konteks bersih) 1 Nov 2026; koreksinya sudah masuk.

## 1. Titik berangkat (sudah diuji, angka dari berkas di repo)

| Uji | Hasil | Berkas |
| --- | --- | --- |
| Aturan `status.py`, arsip logbook 2022 | ETS Waspada 0,006, FAR 0,98, kalah dari persistensi (0,010) pada label hari-mulai | `scripts/banjir/RISET-LOGBOOK.md` |
| Aturan `status.py`, label 2026 (logbook + DIBI) | ETS hari-mulai 0,019 sampai 0,040; tertinggi 0,094 pada label gabungan hari-aktif; batas lulus 0,1, TIDAK LULUS | idem |
| GBDT kabupaten-hari, uji 2024-2025 | AUC 0,77, mengalahkan klimatologi tetapi tidak mengalahkan aturan pada jumlah alarm sama, TIDAK LULUS | `scripts/banjir/RISET-MODEL-KAB.md` §10 |
| Kedalaman, durasi, rumah vs hujan di hari mulai | tidak ada yang memenuhi kriteria (batas bawah rho > 0,3 dan skill > 0,1); durasi rho 0,16 paling kuat | `scripts/banjir/RISET-LOGBOOK.md` |
| Model dampak bertingkat, uji 2024-2026 | besaran KK skill 0,037 dan rumah 0,027, LULUS tetapi lemah; peluang kejadian 2026 TIDAK LULUS | `scripts/banjir/RISET-DAMPAK.md` §4 |
| Debit GloFAS sebagai fitur | protokol beku, dibuka sesudah 2027-06-01 | `scripts/banjir/PRAREG-DEBIT.md` |
| Status banjir prospektif | prakiraan dibekukan sejak 19 Okt 2026 | `scripts/banjir/PRAREG-PROSPEKTIF.md` |

Dugaan kerja (belum diuji): hujan ERA5 0,25 derajat di sel kabupaten terlalu kasar untuk banjir yang digerakkan sungai dan
hujan deras singkat. Penyebab pesaing: label kurang lapor (hari tanpa laporan dihitung negatif, jadi FAR terlihat lebih buruk).
Tahap 0 sampai 2 dirancang untuk membedakan keduanya.

## 2. Aturan main untuk semua tahap

1. **Satu penggaris.** Ukuran utama: ETS kabupaten-hari pada label hari-mulai, pada jumlah alarm yang SAMA dengan aturan
   berlaku, dibandingkan dengan persistensi dan klimatologi, selang 95% bootstrap blok kabupaten. Satuan baru (DAS, pos,
   kota) di Tahap 4 punya penggaris sendiri yang ditulis sebelum datanya dibuka.
2. **Arsip menyaring, prospektif memutus.** Semua tahun 2016-2025 sudah pernah dilihat rancangan lain (2022 adalah
   validasi `model_kab.py` dan tahun uji aturan; 2024-2025 uji `model_kab.py` dan `ambang_wilayah.py`). Jadi uji arsip
   hanya boleh MENOLAK: bila M1 tidak lebih baik dari M0 di arsip, berhenti. Bila lolos, rumus dibekukan dan dinilai
   prospektif dengan kriteria `PRAREG-PROSPEKTIF.md` (dua pembanding, minimal 60 hari dan 100 kejadian, dibuka sekali).
   Hanya vonis prospektif yang boleh disebut LULUS.
3. **Protokol beku dulu.** Tiap uji punya `PRAREG-*.md` atau `lab_kriteria/*.json` dengan sidik sha256 yang di-commit
   SEBELUM data uji dibuka. Hiperparameter M0 dilatih ulang dari nol di protokol baru dengan kisi dan anggaran tertulis,
   tidak memakai ulang hasil setelan lama.
4. **Yang beku tidak disentuh.** `PRAREG-DEBIT.md`, `PRAREG-PROSPEKTIF.md`, `PRAREG-DAMPAK.md`, dan semua berkas yang masuk
   sidik `model_kab.py` (`model_kab.py`, `uji_balik.py`, `status.py`, `data/raw/banjir/dibi_tanggal.json`,
   `data/raw/banjir/model_kab/kandidat.json`) hanya dibaca atau diimpor, tidak diubah atau dibangun ulang. Berkas yang
   dibekukan sidik genangan Jakarta J4 (`sim_genangan.js`, `umum.py`) tidak diubah sampai Apr 2027.
5. **Label 2026 tidak dipakai menyetel apa pun.** DIBI dan logbook 2026 hanya dibuka oleh uji beku (Uji A/B
   PRAREG-DEBIT dan uji prospektif).
6. **Sampel kabupaten dipilih dari kejadian sampai tahun latih terakhir saja** (pola `model_kab.py`), dibekukan sidik
   sebelum uji. Groundsource tidak dipakai untuk memilih sampel atau sebagai fitur frekuensi.
7. **Logbook itu label, bukan fitur.** Logbook Pusdalops: 9.046 baris banjir 2011-2023 sesudah arsip 2023 masuk
   (2021 hanya 14 baris, 2022 dan 2023 sebagian, 2011-2013 tipis), tingkat kabupaten. Hujan ERA5 di cache mulai Des 2015; mengunduh 2011-2015
   menambah sekitar 1.800 hari.
8. **Status resmi tidak ditimpa diam-diam.** Model yang lulus prospektif dipasang sebagai pelengkap dengan pil "teruji"
   dan angkanya. Mengganti `status.py` adalah keputusan pemilik.

## 3. Arti "self-correcting" di sini

Rumus yang mengubah dirinya sendiri setiap hari tanpa diuji akan menyesuaikan diri ke derau dan tidak bisa diaudit. Jadi
koreksi diri dibangun berlapis, dan tiap lapis harus menang di data yang belum ia lihat:

| Lapis | Apa yang dikoreksi | Keadaan sekarang | Yang perlu diperketat |
| --- | --- | --- | --- |
| Kalibrasi peluang | peluang mentah ke frekuensi nyata (regresi isotonik) | harian di `/prediksi` (`scripts/prediksi/kalibrasi.py`, `prediksi.yml`): fit 46 tanggal, dipakai hanya bila Brier 14 tanggal terakhir lebih kecil dari peluang mentah, minimal 30 pasangan di fit dan di uji | penjaga ini lemah (jendela 14 hari, tanpa selang). Model banjir baru memakai marjin minimum atau selang |
| Ambang per wilayah | pengali ambang hujan dan ambang intensitas per kabupaten | `ambang_wilayah.py` luring, uji 2024-2025 sudah dibuka sekali, `pakai: false` | pemasangan hanya lewat eksperimen baru dengan periode uji baru (prospektif) |
| Juara lawan penantang | rumus baru lawan rumus berlaku | belum ada | penantang dinilai pada kabupaten-hari dan jumlah alarm yang sama, dengan kriteria `PRAREG-PROSPEKTIF.md`, dibuka sekali; menang baru menggantikan |

Hasilnya: rumus memperbaiki diri dari kejadian nyata, tetapi tiap perubahan tercatat dan bisa dibuktikan. Karena laju
kejadian banjir sekitar 1,4% kabupaten-hari, satu putaran juara lawan penantang butuh berbulan-bulan, bukan harian.

## 4. Tahap kerja

Urutan disusun dari yang paling murah dan paling banyak memberi informasi. Tahap 0 menjadi dasar semua tahap lain.

### Tahap 0: Label bersatu (dasar untuk semua uji)

Gabungkan semua sumber kejadian ke satu tabel kabupaten-hari (dan kecamatan-hari bila ada), satu kolom per sumber. Tidak ada
sumber yang dianggap kebenaran tunggal; vonis nanti dihitung per sumber, dan gabungan hanya pada kabupaten-hari yang punya
kontrol cakupan media.

| Sumber | Rentang | Kerapatan | Sudah ada |
| --- | --- | --- | --- |
| Logbook Pusdalops | 2011-2023 | kabupaten, tanggal kasar | `data/pusdalops/logbook_kejadian.csv` |
| DIBI BNPB | 2008-sekarang, terisi susulan | kabupaten | `data/raw/banjir/dibi_tanggal.json` (hanya dibaca) |
| Google Groundsource (poligon dari berita) | 2016-2025 (berhenti 29 Jan 2026), 303.329 poligon di kecamatan, tumbuh 5 kali dari 2016 ke 2025 | kecamatan | `scripts/banjir/label_kec.py` |
| Copernicus GFM (radar Sentinel-1) | katalog mulai 2015, cakupan dicek di langkah ini | piksel radar, lintasan beberapa hari | `scripts/banjir/genangan_nasional.py` |
| MODIS MCDWD (NASA) | 2021-03-22 sampai sekarang, ada dua sela | indeks kehadiran ~2 km, harian | `scripts/banjir/mcdwd.py` |
| PetaBencana.id | DKI | titik laporan warga | `scripts/banjir/genangan/petabencana.py` (data di `data/raw/banjir/genangan/`) |

- Keluaran: `data/raw/banjir/label_bersatu/` (tidak dilacak git) dan `public/banjir/data/label_bersatu_ringkas.json`.
- Bukti siap: self-check `uji`, tabel cakupan per tahun per sumber, angka silang antarsumber, catatan pertumbuhan Groundsource.
- Pengerja: `banjir`; logbook milik `pipa-data` (`scripts/data/logbook_bersih.py`), dipanggil, tidak disalin.
- Pemeriksa: `validasi-model` (kebocoran label, hitung ganda kejadian berhari-jamak, pergeseran laju dasar antartahun).

### Tahap 1: Hujan hulu DAS

`scripts/banjir/hulu.py` menghitung sumbangan hujan hari ini per sub-DAS hanya untuk 16 daerah di `bukti/index.json`, dan
belum pernah diuji terhadap label. Tahap ini membangun fitur baru, bukan sekadar memperluas skrip itu.

1. Topologi sub-DAS HydroBASINS level 9 untuk semua kabupaten sampel: Jawa memakai `scripts/air/neraca/topologi.json`
   (534 sub-DAS, sudah ada), luar Jawa HydroBASINS level 9 yang sama.
2. Fitur per kabupaten-hari: hujan hulu terakumulasi 1, 3, 7 hari dengan waktu tempuh kasar (panjang alur dibagi
   kecepatan tetap), dan indeks hujan anteseden DAS.
3. Kabupaten Jawa: keadaan neraca air bulan sebelumnya (lengas bak dan tampungan dari `scripts/air/neraca/neraca.py`).
   Batas: neraca air bulanan dan hanya Jawa, jadi ia memberi "seberapa jenuh DAS", bukan pemicu harian.
4. Uji arsip penyaring 2016-2022 (aturan §2.2), M0 = fitur `model_kab.py` dilatih ulang dari nol, M1 = M0 + hulu.
   Lolos penyaring, lalu prospektif.

- Protokol: `scripts/banjir/PRAREG-HULU.md`, beku sebelum uji.
- Bukti siap: dETS M1 - M0 arsip dengan selang di `public/data/validasi_hulu_arsip.json`, lalu arsip prospektif berjalan.
- Pengerja: `banjir`, dibantu `neraca-air` untuk keluaran bulanan. Pemeriksa: `validasi-model`.

### Tahap 2: Hujan satelit (CHIRPS sekarang, IMERG menyusul)

Pembaruan 1 Nov 2026: token Earthdata di `.env` lokal ternyata kosong, jadi uji pertama memakai CHIRPS v2.0 harian
(satelit + penakar, terbuka tanpa login, kisi 0,25 derajat sama dengan ERA5). Protokolnya `scripts/banjir/PRAREG-HULU.md`
(Tahap 1 dan 2 dibekukan bersama). Langkah IMERG di bawah menjadi protokol terpisah begitu token tersedia.

ERA5 0,25 derajat menghaluskan hujan deras singkat. GPM IMERG Final (0,1 derajat, per 30 menit, 2000-sekarang) lebih dekat
ke hujan konvektif.

1. Ambil IMERG Final harian dan maksimum per jam untuk sel sampel 2016-2022 lewat NASA Earthdata. Rujukan secret
   `EARTHDATA_TOKEN` sudah ada di `udara.yml`; pemilik memastikan token itu aktif dan punya akses GES DISC (IMERG).
2. Uji yang sama dengan Tahap 1, tiga varian: hujan ERA5, hujan IMERG, gabungan. Fitur lain tidak berubah.
3. Bila IMERG lolos, pemantauan produksi memakai IMERG Early/Late (latensi beberapa jam); prakiraan tetap dari ansambel ECMWF.

- Protokol: bagian dari `PRAREG-HULU.md` (dibekukan bersama, satu kali buka).
- Pengerja: `banjir`. Pemeriksa: `validasi-model`.

### Tahap 3: Debit sungai dan Google Flood Hub

**3a. GloFAS (berjalan).** `PRAREG-DEBIT.md` jalan terus apa adanya sampai dibuka 2027-06-01. Logbook tidak disisipkan
ke sana karena periode latihnya (2016-2023) tumpang tindih dengan logbook, dan labelnya dikunci ke DIBI saja.

**3b. Arsip pos duga air (sudah jalan, perlu disimpan permanen).** Bacaan SIHKA PU, DSDA DKI, dan SIPANTAU Tangerang sudah
masuk D1 `sihka_baca` tiap jam sejak 19 Okt 2026 (`src/sihka.js`, `src/sungai_resmi.js`, migrasi 0016). Masalahnya:
retensi 180 hari (`TAHAN_HARI`), lalu dihapus. Yang perlu dikerjakan:
- Ekspor bulanan ke R2 (satu berkas per bulan) sebelum terhapus, supaya seri bertambah panjang setiap bulan.
- Laporan cakupan: jumlah pos aktif, jam bolong, pos macet. Jaga kuota baca D1 (5 juta per hari): ekspor membaca
  satu bulan sekali jalan, di luar jam sibuk.
- Pengerja: `warga-api`. Pemeriksa: `guard-api`, `migrasi-idempoten` bila skema berubah.

**3c. Google Flood Forecasting API (butuh pendaftaran pemilik).** Gratis, CC BY 4.0, kunci API Google Cloud.
- `floodStatus:searchLatestFloodStatusByArea` dengan `regionCode: "ID"`: status banjir sungai per pos (EXTREME, SEVERE,
  ABOVE_NORMAL, NO_FLOODING). `cutoffTime` bisa mundur sampai 2025-08-01: status yang diterbitkan Google sejak Agustus 2025
  bisa dinilai lawan DIBI 2025. Penilaian atas 2026 dibuka hanya lewat protokol prospektif (aturan §2.5).
- `flashFloods:search` dengan `countryCodes: ["ID"]`: poligon banjir kilat 24 jam (likely, highly likely). Hanya status
  terkini, jadi dibekukan harian ke arsip `/prediksi` mulai hari kunci aktif.
- `gauges:queryGaugeForecasts`: prakiraan per pos sejak 2023-10-01, maksimal 500 pos per panggilan.
- Masuk `/prediksi` sebagai kode baru (mis. `GFH` sungai, `GFK` kilat), dinilai `nilai.py` lawan persistensi dan
  klimatologi. Di peta: lapisan "Google Flood Hub" bersama rapornya.
- Secret `GOOGLE_FLOOD_API_KEY` di GitHub Actions, tidak pernah di berkas.
- Pengerja: `banjir` (pengambil), `prediksi` (arsip dan nilai). Pemeriksa: `validasi-model`, `security-reviewer`.

### Tahap 4: Ganti satuan ramalan

"Kabupaten X, satu hari, ada banjir atau tidak" terlalu kasar untuk tiga jenis banjir yang penyebabnya berbeda.

| Jenis | Satuan baru | Pemicu | Label |
| --- | --- | --- | --- |
| Banjir sungai | DAS atau pos duga air | debit GloFAS, TMA arsip 3b, Flood Hub, hujan hulu (Tahap 1) | GFM, Groundsource, logbook dipetakan ke DAS |
| Banjir kota (genangan) | kota/kecamatan | IMERG per jam, radar BMKG, Flood Hub kilat | PetaBencana, Groundsource kecamatan |
| Bandang | sub-DAS hulu kecil berlereng | hujan per jam ekstrem, lereng | logbook dan DIBI jenis bandang |

Layar tetap menampilkan kabupaten (dirangkum dari satuan kecil) supaya akrab bagi BPBD. Tahap ini menunggu Tahap 0 sampai 3.

- Protokol per jenis: `PRAREG-SATUAN-<jenis>.md`.
- Pengerja: `banjir`. Pemeriksa: `validasi-model`, `selera-angka` dan `inp-reviewer` bila layar berubah.

### Tahap 5: Label yang lebih tajam lokasinya

Melanjutkan Tahap 0 untuk tahun-tahun berikutnya:

1. Groundsource diperbarui saat Google menerbitkan versi baru (`label_kec.py ambil`).
2. GFM dan MODIS dijalankan rutin per kejadian besar (`genangan_nasional.py luas --aktif`, `mcdwd.py`).
3. Laporan warga `/warga` dan konfirmasi `/prediksi` dihitung sebagai label lokasi, dengan penanda bias pelapor.
4. Kedalaman terukur dari arsip pos (3b) menggantikan angka TMA teks di logbook untuk uji intensitas.

### Tahap 6: Perluasan model dampak

Model dampak bertingkat sudah ada (`scripts/banjir/model_dampak.py`, `PRAREG-DAMPAK.md` beku, vonis di `RISET-DAMPAK.md`):
besaran KK dan rumah LULUS dengan skill kecil (0,03-0,04). Tahap ini menambah keterpaparan, tidak membangun ulang.

1. M0 = model dampak berlaku. M1 = M0 + penduduk WorldPop di zona rendah dekat sungai (HAND MERIT Hydro,
   `scripts/banjir/hand_kab.py`, menunggu kunci pemilik), luas genangan GFM bila ada, jumlah kecamatan tersentuh.
2. Target tambahan dari logbook 2011-2023: `rumah_terendam` (3.379 baris), `kk` (4.763), `jiwa` (2.017).
3. Protokol baru `PRAREG-DAMPAK-PAPARAN.md` dengan periode uji baru (prospektif); kriteria `PRAREG-DAMPAK.md` tidak diubah.
4. Bila lolos, kartu `/prediksi` dan `dampak.json` menampilkan rentang terdampak berlabel "perkiraan".

- Pengerja: `banjir`, `prediksi` untuk kartu. Pemeriksa: `validasi-model`, `selera-angka`.

### Di luar enam arah (belum diputuskan pemilik)

- **CCTV jalan Pemda untuk deteksi genangan** (ide Noah AI): label kedalaman nyata dan verifikasi cepat. Butuh daftar
  aliran CCTV publik per kota dan model deteksi genangan. Diusulkan sesudah Tahap 3.
- **SMS dua arah**: CAP dan bot WA sudah ada; SMS ke HP tanpa internet butuh kerja sama operator. Keputusan pemilik.

## 5. Urutan dan ketergantungan

| Urutan | Tahap | Bergantung pada | Bisa paralel dengan |
| --- | --- | --- | --- |
| 1 | 3b Ekspor arsip pos ke R2 | tidak ada (data lebih tua dari 180 hari mulai terhapus April 2027) | semua |
| 2 | 0 Label bersatu | tidak ada | 3b, 3c |
| 3 | 1 Hujan hulu | 0 | 2 |
| 4 | 2 IMERG | 0 | 1 (dibuka bersama) |
| 5 | 3c Flood Hub | kunci API dari pemilik | 0, 1, 2 |
| 6 | 6 Perluasan dampak | 0, kunci HAND | 1, 2 |
| 7 | 4 Ganti satuan | 0, 1, 2, 3 | 5 |
| 8 | 5 Label tajam | 0 | berjalan terus |

3a (PRAREG-DEBIT) berjalan sendiri sampai 2027-06-01.

## 6. Yang perlu pemilik lakukan

| Langkah | Untuk tahap | Cara |
| --- | --- | --- |
| Daftar waitlist Google Flood Forecasting API, lalu kirim ID Google Cloud Project lewat balasan email persetujuan | 3c | https://developers.google.com/flood-forecasting |
| Aktifkan API, buat kunci API, simpan sebagai secret `GOOGLE_FLOOD_API_KEY` di GitHub | 3c | Google Cloud console, GitHub Settings > Secrets |
| Isi `EARTHDATA_TOKEN` di `.env` lokal (sekarang kosong) dan pastikan secret GitHub-nya aktif, akun sudah menyetujui aplikasi GES DISC | 2 (IMERG) | urs.earthdata.nasa.gov |
| Isi formulir MERIT Hydro, simpan `MERIT_USER` dan `MERIT_PASS` di `.env` | 6 | https://global-hydrodynamics.github.io/MERIT_Hydro/ |
| Setujui pemasangan model yang lulus prospektif sebagai pelengkap status resmi | tiap vonis LULUS | keputusan |

## 7. Status

| Tahap | Status |
| --- | --- |
| 0 Label bersatu | selesai 1 Nov 2026: `scripts/banjir/label_bersatu.py`, ringkasan `public/banjir/data/label_bersatu_ringkas.json`; GFM dan MODIS belum layak jadi label |
| 1 Hujan hulu | protokol `PRAREG-HULU.md` dan kode `model_kab_hulu.py` di-commit 1 Nov 2026 sebelum data dibuka; 22 dari 39 kabupaten sampel punya hulu. Latih selesai dan sidik `08aef5bbab265d33` dibekukan 1 Nov 2026. Angka validasi 2024-2025 (bukan vonis): hujan CHIRPS lokal menaikkan BSS +0,0037 (CI98,3 di atas nol tipis), hujan hulu menambah +0,0021 (CI melintasi nol), ETS pada jumlah alarm sama belum berbeda. Vonis dari Uji A (sia paling cepat 15 Feb 2027) dan Uji B (buka paling cepat 15 Sep 2027). Catatan: CHIRPS April dan Mei 2026 belum ada di server CHC, sementara gerbang kelengkapan `sia` hanya menerima Mei 2025 sebagai bulan hilang; unduh ulang sebelum Feb 2027, dan bila server tetap kosong, pengecualiannya diputuskan lewat amandemen protokol, bukan dengan menyunting kode beku |
| 2 Hujan satelit | CHIRPS (pengganti IMERG) dibekukan bersama Tahap 1; IMERG menunggu token Earthdata |
| 3a GloFAS | protokol beku, menunggu 2027-06-01 |
| 3b Arsip pos | ekspor harian ke R2 (`arsip_pos.py`, langkah `banjir.yml`), diuji nyata 19-20 Okt; sisanya disusul workflow 7 hari per jalan |
| 3c Flood Hub | pengambil `floodhub.py` siap; langkah `banjir.yml` aktif begitu secret `GOOGLE_FLOOD_API_KEY` ada |
| 4 Ganti satuan | menunggu 0-3 |
| 5 Label tajam | belum mulai |
| 6 Perluasan dampak | model dasar LULUS lemah; fitur paparan menunggu kunci HAND |
