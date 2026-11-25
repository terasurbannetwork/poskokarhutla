# Genangan satelit GFM dan Kaji Cepat

Halaman ini menjelaskan genangan satelit Copernicus GFM se-Indonesia dan rancangannya untuk Kaji Cepat.

## 14. Genangan satelit Copernicus GFM se-Indonesia (`scripts/banjir/genangan_nasional.py`)

Sumber: Copernicus Global Flood Monitoring (EODC), produk `ensemble_flood_extent`, `exclusion_mask`, dan `reference_water_mask` pada grid Equi7 (Oseania `OC` dan Asia `AS`, sehingga Aceh dan Sumatera utara jatuh di ubin Asia). Resolusi 20 m, lintasan Sentinel-1 sekitar 6 sampai 12 hari sekali. Akses tanpa GDAL: pembaca TIFF sendiri (`tiff_mini`) dengan permintaan HTTP Range (header 256 KB lalu blok yang dibutuhkan), kompresi ZSTD lewat perintah `zstd`, LZW untuk `reference_water_mask`. Ubin 15.000 kali 15.000 piksel tetap di server.

Mode: `katalog` (metadata STAC per bulan sejak 2015-01, tanpa raster), `luas` (hitung pasangan kabupaten dan tanggal acuan), `terbit` (susun ulang dari cache), `uji`. Dua jenis pasangan: aktif (kejadian aktif, lintasan 0 sampai 12 hari sesudah tanggal `sejak`) dan riwayat (kabupaten-hari banjir atau bandang DIBI, lintasan 0 sampai 6 hari sesudah tanggal DIBI) (`genangan_nasional.py:59-61`).

Langkah hitung per pasangan (`hitung`, `genangan_nasional.py:421`):

```
titik sampel: langkah = maks(0,0006 derajat, akar(luas / 600.000)); kabupaten besar melebar
lintasan  : bingkai satu ubin berselang <= 10 menit = SATU lintasan; kandidat maksimum 4; dipilih (cakupan, diamati) terbesar
pra       : ubin sama, jam lintas +- 90 menit, 8 sampai 45 hari sebelum lintasan (pilih_pra, :527)
per titik (bobot = luas sel titik):
  diamati  = flood != 255 (termasuk yang ter-mask)
  mask     = exclusion_mask == 1
  tergenang = flood == 1, bukan mask, bukan air tetap
  baru     = tergenang sesudah DAN teramati kering (0) pada pra
  latar    = tergenang pada pra dengan pra tidak ter-mask, pada domain yang sama
cakupan_pct  = (diamati - mask) / luas kabupaten x 100      (cakupan, :510)
sinyal_lemah = benar bila nilai <= 0; selain itu baru < 2 x latar; kosong bila tanpa pra dan nilai > 0   (lemah, :515)
```

Keluaran `public/banjir/data/genangan_nasional.json` (maksimum 380.000 byte, riwayat dipangkas bila melebihi) dan `label_kab_hari.csv` di `data/raw`. Status berkas saat ini: dibuat 27 Oktober 2026, 34 pasangan `ok`, 0 tanpa lintasan, 4 tanpa cakupan, 21 pasangan riwayat. Skrip ini belum dijadwalkan di `banjir.yml`; berkas dipakai `scripts/prediksi/dampak.py` dan uji kriteria paket genangan-satelit, belum oleh layar `/banjir`.

Batas yang ditulis di berkas: luas adalah perkiraan radar; cenderung di bawah di permukiman dan hutan karena mask; sawah yang baru dialiri dan tanah basah bisa terhitung tergenang; banjir singkat yang surut di antara dua lintasan terlewat; sampel titik 65 m atau lebih lebar, ketelitian sekitar beberapa persen luas. Tentang bangunan: `boleh_tampil.bangunan` bernilai `false` ("menunggu koreksi permukiman FwDET; Demak 2024 5-12x di bawah DIBI"), jadi jumlah bangunan terendam dari berkas ini tidak ditampilkan. Sekitar 75 persen DKI ter-mask GFM, sehingga GFM nyaris tidak berguna untuk kalibrasi kota padat.

Lapisan "Riwayat genangan satelit (Jakarta)" di peta memakai berkas lain, `genangan/gfm_kec.json`, dari panen lima jendela kejadian (tiga kecamatan pernah tergenang).

Lapisan "Genangan historis" (`scripts/banjir/genangan_historis.py`): data statis Google Flood Forecasting `inundation_history` (turunan GLAD 1999 sampai 2020, CC BY 4.0), tiga kelas: High (piksel 128 m basah 5 persen waktu atau lebih), Medium (1 persen atau lebih), Low (0,5 persen atau lebih). Persen per kecamatan memakai kisi sampling 0,002 derajat dengan aturan genap-ganjil; kelas bersarang dihitung pada kelas tertinggi yang meliputinya. Kota padat dan sawah Jawa yang 100 persen kelas tinggi adalah isi sumber (artefak deteksi optik), bukan prakiraan.

## 15. Genangan satelit per kejadian di Kaji Cepat (paket `genangan-satelit`, RANCANGAN, belum dikodekan)

Status: paket dokumen lengkap dan satu tiket kode selesai, yaitu GS-02 (kriteria uji balik terkunci, commit `408f10b5a`, jangkar `afbdc9b5e`). Tiket GS-01 dan GS-03 sampai GS-14 belum dikerjakan: tidak ada `genangan_lahan.py`, `genangan_kaji.py`, `zona_dari_sel` di `scripts/siklus/paparan.py`, model `banjir_gfm`, migrasi `sk_kaji` baru, rute berkas kaji, atau `public/inti/geser.js` (yang ada baru `public/inti/geser_lapis.js`); mode `kejadian` dan opsi `--pra-sebelum-acuan` belum ada di `genangan_nasional.py`. Bagian ini mendokumentasikan rancangan yang sudah diputuskan.

Keputusan pemilik (24 November 2026): siapkan paket, dengan tiga hal yang tidak ditiru dari pembanding (ambang radar buatan sendiri tanpa uji, penggeser ambang di tangan pengguna, hitung ulang di area tampilan). Rancangan agen: satu sumber genangan (GFM), satuan kerja kejadian Buku Besar, model kaji baru `banjir_gfm` di samping `banjir_jam1` (yang tidak berubah), tanpa bangunan terendam, semua angka berlabel `estimasi-model` dan berdampingan dengan DIBI dan isian petugas tanpa dijumlah.

Algoritma rancangan (`data/kajian-bnpb/genangan-satelit/ALGORITMA.md`):

```
pasangan : lintasan GFM terbaik 0 sampai 12 hari sesudah mulai kejadian; pra 8 sampai 45 hari sebelum lintasan DAN sebelum mulai
sah      : status ok, cakupan_pct >= 10, sinyal_lemah == false          (HIPOTESIS, dikunci GS-02)
persen   : baru_ha / teramati_ha x 100 (yang tampil); baru_ha / luas_kab x 100 (keterangan, selalu dengan cakupan)
penduduk : mesin paparan F2 apa adanya; dua zona dari sel halus (110 m):
           zona atas  = sel dengan ha_baru > 0
           zona bawah = sel dengan ha_baru / ha_sel >= 0,5              (HIPOTESIS, dibekukan)
           rentang tiap sumber jiwa = [pada zona bawah, pada zona atas]; sumber tidak dicampur
lahan    : kelas ESA WorldCover v200 2021 di bawah tiap titik baru; kelas 50 kecil bukan bukti permukiman tidak tergenang
citra    : PNG radar VV, optik warna asli, optik semu SWIR (B12, B8A, B4) sebelum dan sesudah, kotak maksimum 40 km, <= 120 KB per citra
```

Status tak sah tidak pernah bernilai 0: `tanpa_lintasan`, `tanpa_cakupan`, `tanpa_pra`, `sinyal lemah`. Kabupaten tanpa genangan teramati ditulis "tidak ada genangan yang teramati radar pada lintasan <tanggal>". Kata "tidak banjir", "surut", dan "terdampak" tidak dipakai untuk angka radar (yang dipakai: "di area genangan", "teramati radar").

Kriteria uji balik (terkunci di `scripts/siklus/genangan_kriteria.json`, versi 1):

- Satuan: pasangan kabupaten-hari DIBI banjir atau bandang dengan terdampak lebih dari 0 (populasi 10.009), lintasan 0 sampai 6 hari sesudah tanggal DIBI, cakupan sah. Kalibrasi (tanggal DIBI sebelum 2024-01-01, ditambah pasangan dekat episode yang pernah terlihat: 6.100 layak) dipisahkan dari uji (2024-01-01 dan sesudahnya, berjarak lebih dari 30 hari dari episode terlihat: 3.566 layak). Sampel uji 300 pasangan pertama menurut urutan sha256 `prov|kab|tanggal` (255 blok), tanpa menambah atau berhenti lebih awal.
- Statistik: `x` = WorldPop tengah = (bawah + atas) / 2, `y` = terdampak DIBI, `rho` = Spearman(x, y). Naif: luas kabupaten, penduduk WorldPop seluruh kabupaten, luas tergenang baru. Selisih `rho` model dikurangi `rho` naif dengan selang 90 persen bootstrap berpasangan per blok (provinsi kali minggu ISO), 2.000 ulangan, benih 20261124.
- LULUS (HIPOTESIS): blok sah 20 atau lebih, `rho >= 0,4`, dan batas bawah selang selisih terhadap ketiga naif di atas 0. Blok sah kurang dari 20 atau sah per dipilih kurang dari 0,30: "tak dapat dinilai" dan pil hipotesis tetap. Klaim hanya "peringkat kabupaten menurut penduduk di area genangan sejalan dengan DIBI", bukan angka mutlak.
- Riwayat saat ini hanya 21 pasangan dengan 10 sah, sehingga "tak dapat dinilai" adalah hasil yang diharapkan sampai sampel uji dibaca.
- Anggaran (Q7, HIPOTESIS): baca Range GFM 400 MB per kejadian, WorldCover 300 MB, PNG 120 KB per citra, R2 5 MB per kejadian.
