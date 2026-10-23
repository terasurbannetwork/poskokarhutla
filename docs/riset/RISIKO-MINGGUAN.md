# Model risiko api 7 hari per sel ~5,5 km: rancangan dan syarat lolos

23 Okt 2026, didaftarkan dan di-commit SEBELUM dibangun. Pemicu: peta prediksi mingguan Kalsel 5x5 km (Dr Adilan
Mahdiyasa, ITB; postingan 22 Okt 2026) dan permintaan pemilik membuat model prediktif serupa untuk keputusan lapangan.

## Pembanding luar yang sudah kita uji

- Metode PFVI Mahdiyasa dkk. (paket peatfr, *Ecological Informatics* 2025; repo `bagaswibowo/peatfr`) sudah diuji di
  repo ini 15 Okt (`scripts/sebaran/RISET-PFVI.md`): PFVI sendiri tidak lebih baik dari FWI (AUC 0,767 vs 0,783), FWI +
  PFVI menambah +0,02 AUC. PFVI masuk sebagai kandidat fitur, bukan model.
- Makalah peta mingguan mereka (*Natural Hazards Research* 2026, "A Calibrated Spatio-Temporal Machine Learning Model for
  Tropical Peatland Fire Risk") belum bisa dibaca (akses ditolak); angka kinerjanya tidak dikutip di sini.

## Yang diramal

- **Satuan:** sel kisi 0,05 derajat (~5,5 km; kisi yang sama dengan `riwayat_sel`).
- **Target:** sel punya >= 1 titik VIIRS keyakinan sedang/tinggi, api vegetasi, dalam 7 hari WIB sesudah hari terbit.
- **Tahan pensiun S-NPP (1 Nov 2026):** target dan fitur harus bisa dihitung TANPA S-NPP. Pengerja menetapkan sensor
  (NOAA-20 sejak 2018, dan/atau S-NPP sebelumnya dengan faktor penyetara yang diukur di masa tumpang tindih) dan
  menuliskan pilihannya sebelum melatih.

## Fitur (hanya yang diketahui pada hari terbit; tanpa melihat masa depan)

Api: titik 7 dan 30 hari di sel, jendela 3x3 dan ~55 km; hari sejak api terakhir. Riwayat: frekuensi sel di minggu
kalender yang sama dan kekerapan tahunan, dihitung dari tahun SEBELUM tahun target saja. Lahan: gambut, kawasan,
konsesi, jarak kanal/jalan/desa (lapisan yang sudah dipakai model sebaran). Iklim: ONI, DMI (bulan sebelumnya).
Cuaca: hujan 7/30/60 hari, hari tanpa hujan, DC/FWI dari ERA5 harian per sel 0,25-0,5 derajat; hujan 7 hari ke depan
hanya dari prakiraan yang benar-benar tersedia saat itu (tidak memakai ERA5 masa depan sebagai prakiraan). PFVI
kandidat. Wilayah: efek provinsi dan kabupaten bertingkat (cara `HIERARKI-WILAYAH.md`), dihitung dari tahun latih saja.

## Pembanding (harus dikalahkan)

1. **Persistensi:** sel yang ada api 7 hari terakhir.
2. **Klimatologi:** frekuensi sel di minggu kalender yang sama, tahun-tahun sebelumnya.
3. **Gabungan sederhana:** regresi logistik persistensi + klimatologi.

## Uji

- Tinggalkan-satu-tahun, 2015-2025 (semua fitur riwayat dan efek wilayah dihitung ulang tanpa tahun uji).
- Dinilai per sel-minggu musim Juli-November, juga sepanjang tahun.
- Ukuran: AUC, Brier skill terhadap pembanding terbaik, kurva kalibrasi (kemiringan), recall pada 10% luas teratas per
  provinsi-minggu. Selang 95% bootstrap blok provinsi x tahun.
- Rincian: per provinsi, per fase ENSO (El Niño, netral, La Niña), per lahan (gambut/mineral).

## Syarat lolos (dibekukan)

1. Brier skill terhadap pembanding terbaik > 0 dengan batas bawah selang > 0, dan AUC lebih tinggi dengan batas bawah
   selisih > 0.
2. Tidak kalah dari pembanding terbaik (Brier skill) di provinsi prioritas mana pun yang punya >= 200 sel-minggu berapi.
3. Kemiringan kalibrasi 0,8-1,2 pada tahun uji gabungan.
4. Tidak kalah di fase ENSO mana pun (El Niño dan bukan El Niño dinilai terpisah).

Lolos: lapisan peta "Peluang api 7 hari" dengan keterangan keandalan, PLUS catatan prospektif mingguan (ramalan dibekukan
hari terbit, dinilai 7 hari kemudian). Gagal: tidak tampil; hasil ditulis di dokumen ini.

## Hasil (23 Okt 2026): LOLOS keempat syarat, produksi DITAHAN

`python3 scripts/sebaran/risiko_mingguan.py api | lahan | cuaca | balik` -> `public/data/risiko_mingguan_uji.json`
(angka di bawah dibaca dari berkas itu). Swauji: `risiko_mingguan.py uji` dan `gbdt_np.py uji` (`ok`). Kriteria dan
ambang tidak diubah sesudah melihat hasil; hiperparameter (`HP`: 300 pohon, kedalaman 6, laju 0,05, min hessian 20,
sub 0,7) ditetapkan sebelum lipatan pertama dan tidak disetel.

### Keputusan yang ditetapkan sebelum melatih

- **Sensor.** S-NPP sebelum 1 Apr 2018, NOAA-20 sesudahnya (arsip NOAA-20 mulai hari itu). Di masa tumpang tindih
  (1 Apr 2018 - 12 Okt 2026, 3.066 hari yang dua sensornya punya data): titik NOAA-20 / S-NPP = 0,997, sel-minggu berapi
  1,031 (per tahun 1,013-1,060). Hitungan S-NPP dikali 0,997; target biner tidak diubah. Model dan fitur hidup tanpa
  S-NPP sesudah 1 Nov 2026. Catatan penting: hanya ~49% sel-minggu berapi menurut satu sensor juga berapi menurut sensor
  lain (`p_n20_bila_snpp` 0,49). Sebagian besar sel-minggu berapi berisi 1-2 titik yang tertangkap atau tidak
  tergantung lintasan; ini batas atas ketajaman ramalan apa pun pada target ini.
- **Sel.** Sel 0,05 derajat yang pernah punya >= 1 titik (seri tergabung 2012-2026) + penyangga 1 sel, lalu hanya yang
  jatuh di batas Kemendagri: 58.190 sel (sel laut penyangga dan Malaysia/PNG/Timor Leste dibuang). Hampir seluruh daratan
  Indonesia masuk, jadi pemilihan sel hampir tidak memihak. Penilaian pada SEMUA sel-minggu himpunan ini.
- **Minggu.** Minggu kalender k = 0..51 (hari-dalam-tahun 7k+1..7k+7); hari terbit = sehari sebelumnya; fitur dari hari
  <= hari terbit. Hari WIB.
- **Cuaca: NASA POWER (MERRA-2), bukan ERA5.** Open-Meteo archive menghitung 1 panggilan per lokasi per 14 hari:
  2012-2025 = ~365 panggilan per lokasi x 1.097 sel 0,5 derajat = ~400 rb panggilan = ~40 hari kuota gratis. POWER
  memberi seluruh rentang dalam satu permintaan per titik (~3,5 dtk). Diukur: permintaan yang menyentuh 2026 (sumber
  GEOS-IT) mengalikan SELURUH deret hujan 24x, termasuk tahun MERRA-2 lama; unduhan pertama (`data/raw/risiko/cuaca/`)
  kena dan tidak dipakai; respons dengan GEOSIT kini ditolak (assert). Unduhan uji balik berhenti 31 Des 2025.
  Pendekatan FWI harian: suhu siang = T2M_MAX, RH = RH pada T2M_MAX dari QV2M dan PS, angin = WS10M rata-rata.
- **Hujan 7 hari ke depan tidak dipakai.** Arsip prakiraan harian 2015-2025 tidak ada; reanalisis sesudah hari terbit =
  prakiraan sempurna (`hujan_depan()` menolaknya, diuji). Model memakai cuaca sampai hari terbit saja.
- **PFVI tidak dipakai** (kandidat): butuh ET0 harian yang tidak ada di permintaan POWER ini, dan uji 15 Okt
  (`RISET-PFVI.md`) menunjukkan PFVI tidak menambah setelah kode FWI masuk.
- **Riwayat dan wilayah.** Untuk baris tahun Y pada lipatan uji T: klimatologi minggu sama, +-2 minggu, 3x3 sekitar, dan
  kekerapan tahunan dari tahun 2012..Y-1 KECUALI T (`cek_riwayat` menolak sebaliknya). Efek wilayah: laju sel-minggu
  berapi +-2 minggu per provinsi dan kabupaten, susut `(s + k*induk)/(n + k)` nasional -> provinsi -> kabupaten; k dipilih
  tinggalkan-satu-tahun di tahun latih saja (`pilih_k_wilayah` menolak tahun uji). Terpilih k provinsi 1.000, kabupaten 100
  di semua lipatan. Fitur api terbaru (7/30 hari, 3x3, 11x11 ~55 km, hari sejak api, dipotong 90): baris latih yang
  jendelanya (<= 90 hari) menyentuh tahun uji dibuang (embargo 12 minggu pertama tahun T+1).
- **ENSO.** ONI musim berpusat 2 bulan sebelum bulan terbit (musim itu berakhir bulan lalu), DMI bulan lalu. Fase per
  tahun dari ONI JAS: >= 0,5 El Nino (2015, 2023), <= -0,5 La Nina (2022), selain itu netral. Nilai ONI di
  `enso.json` adalah versi terkini (revisi ERSST), bukan yang terbit saat itu: sedikit optimistis.
- **Sampel latih.** Semua tahun latih; positif peluang 0,5 (bobot 2), negatif 0,02 (bobot 50), sampel tetap per tahun.
  Uji pada SEMUA baris tahun uji. Pembanding logistik dilatih pada sampel yang sama.
- **Pembanding terbaik** = Brier terkecil di antara tiga pembanding pada himpunan yang dinilai (untuk Brier skill), AUC
  terbesar (untuk selisih AUC); di provinsi dan fase ENSO dipilih ulang per subset (lebih ketat). Syarat diterapkan di
  dua himpunan, Jul-Nov dan sepanjang tahun; LOLOS hanya bila keduanya lolos.
### Angka utama

| Himpunan | Sel-minggu | Berapi | AUC model | AUC logistik | AUC klimatologi | AUC persistensi | Selisih AUC (CI 95%) | Brier skill vs logistik (CI 95%) | Kemiringan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jul-Nov | 14.081.980 | 526.571 | 0,915 | 0,759 | 0,748 | 0,654 | 0,156 [0,143; 0,170] | 0,126 [0,111; 0,141] | 0,929 |
| Sepanjang tahun | 33.284.680 | 650.234 | 0,928 | 0,751 | 0,748 | 0,641 | 0,177 [0,164; 0,190] | 0,111 [0,099; 0,123] | 0,949 |

Pembanding terbaik (Brier dan AUC) di kedua himpunan: logistik persistensi + klimatologi.
Recall bila 10% sel teratas tiap provinsi-minggu ditandai (Jul-Nov): model 0,414, logistik 0,343, klimatologi 0,296, persistensi 0,255; sepanjang tahun model 0,438, logistik 0,347.

Kalibrasi Jul-Nov, 10 kantong sama isi (rata peluang -> laju teramati): 0,02% -> 0,01%; 0,05% -> 0,04%; 0,11% -> 0,11%; 0,21% -> 0,22%; 0,40% -> 0,42%; 0,71% -> 0,77%; 1,30% -> 1,43%; 2,57% -> 2,79%; 5,97% -> 6,34%; 26,75% -> 25,26%.

### Syarat beku

| Syarat | Jul-Nov | Sepanjang tahun |
| --- | --- | --- |
| 1. Brier skill > 0 dan selisih AUC > 0, batas bawah selang > 0 | lolos | lolos |
| 2. Tidak kalah di provinsi prioritas >= 200 sel-minggu berapi | lolos | lolos |
| 3. Kemiringan kalibrasi 0,8-1,2 | lolos | lolos |
| 4. Tidak kalah di El Nino dan bukan El Nino | lolos | lolos |

### Per provinsi (Jul-Nov; prioritas + provinsi dengan >= 5.000 sel-minggu berapi)

| Provinsi | Berapi | AUC model | AUC logistik | Brier skill (CI 95% blok tahun) |
| --- | --- | --- | --- | --- |
| 61 Kalimantan Barat * | 67.690 | 0,886 | 0,785 | 0,102 [0,060; 0,135] |
| 53 Nusa Tenggara Timur * | 62.141 | 0,857 | 0,793 | 0,140 [0,130; 0,149] |
| 62 Kalimantan Tengah * | 44.568 | 0,920 | 0,753 | 0,180 [0,081; 0,262] |
| 16 Sumatera Selatan * | 36.345 | 0,882 | 0,722 | 0,157 [0,096; 0,199] |
| 93 Papua Selatan * | 32.977 | 0,939 | 0,770 | 0,157 [0,111; 0,195] |
| 64 Kalimantan Timur * | 32.626 | 0,900 | 0,728 | 0,130 [0,073; 0,181] |
| 52 Nusa Tenggara Barat | 23.055 | 0,885 | 0,809 | 0,152 [0,130; 0,166] |
| 35 Jawa Timur | 22.534 | 0,874 | 0,730 | 0,106 [0,096; 0,115] |
| 63 Kalimantan Selatan * | 20.517 | 0,904 | 0,762 | 0,176 [0,120; 0,228] |
| 72 Sulawesi Tengah | 15.248 | 0,901 | 0,703 | 0,106 [0,080; 0,132] |
| 74 Sulawesi Tenggara | 14.504 | 0,896 | 0,747 | 0,119 [0,090; 0,144] |
| 14 Riau * | 14.352 | 0,904 | 0,700 | 0,111 [0,051; 0,135] |
| 81 Maluku | 13.360 | 0,930 | 0,748 | 0,122 [0,089; 0,157] |
| 73 Sulawesi Selatan | 13.154 | 0,882 | 0,676 | 0,098 [0,067; 0,121] |
| 19 Kep. Bangka Belitung | 12.873 | 0,814 | 0,688 | 0,122 [0,087; 0,158] |
| 15 Jambi * | 12.516 | 0,876 | 0,671 | 0,133 [0,061; 0,178] |
| 18 Lampung | 12.087 | 0,881 | 0,683 | 0,120 [0,082; 0,148] |
| 32 Jawa Barat | 8.945 | 0,889 | 0,661 | 0,091 [0,081; 0,102] |
| 12 Sumatera Utara | 8.339 | 0,878 | 0,695 | 0,055 [0,036; 0,076] |
| 33 Jawa Tengah | 8.225 | 0,885 | 0,669 | 0,083 [0,072; 0,091] |
| 65 Kalimantan Utara | 6.104 | 0,918 | 0,738 | 0,070 [0,050; 0,093] |
| 11 Aceh | 5.907 | 0,901 | 0,708 | 0,058 [0,043; 0,066] |
| 13 Sumatera Barat | 5.698 | 0,873 | 0,653 | 0,054 [0,042; 0,066] |

`*` = prioritas. Provinsi mana pun dengan Brier skill < 0 (Jul-Nov): tidak ada. Tabel lengkap 38 provinsi di JSON (`himpunan.*.per_provinsi`).

### Per fase ENSO dan lahan (Jul-Nov)

| Subset | Berapi | AUC model | Selisih AUC (CI 95%) | Brier skill (CI 95%) |
| --- | --- | --- | --- | --- |
| El Nino (2015, 2023) | 196.248 | 0,904 | 0,144 [0,127; 0,162] | 0,170 [0,140; 0,195] |
| Netral | 311.885 | 0,909 | 0,128 [0,118; 0,139] | 0,105 [0,097; 0,114] |
| La Nina (2022) | 18.438 | 0,907 | 0,102 [0,079; 0,138] | 0,049 [-0,010; 0,091] |
| Bukan El Nino | 330.323 | 0,911 | 0,131 [0,120; 0,143] | 0,102 [0,092; 0,110] |
| Gambut (>= 50% sel) | 106.628 | 0,927 | 0,162 [0,142; 0,179] | 0,190 [0,149; 0,229] |
| Mineral | 419.943 | 0,911 | 0,154 [0,140; 0,169] | 0,110 [0,101; 0,119] |

### Per tahun uji (Jul-Nov)

| Tahun | Fase | Laju berapi | AUC model | AUC logistik | Brier skill |
| --- | --- | --- | --- | --- | --- |
| 2015 | el nino | 10,23% | 0,896 | 0,777 | 0,206 |
| 2016 | netral | 2,18% | 0,891 | 0,757 | 0,152 |
| 2017 | netral | 2,40% | 0,907 | 0,783 | 0,079 |
| 2018 | netral | 4,13% | 0,906 | 0,803 | 0,099 |
| 2019 | netral | 6,18% | 0,897 | 0,807 | 0,127 |
| 2020 | netral | 2,24% | 0,916 | 0,816 | 0,096 |
| 2021 | netral | 1,75% | 0,911 | 0,807 | 0,094 |
| 2022 | la nina | 1,44% | 0,907 | 0,805 | 0,049 |
| 2023 | el nino | 5,10% | 0,906 | 0,824 | 0,099 |
| 2024 | netral | 3,02% | 0,907 | 0,823 | 0,085 |
| 2025 | netral | 2,46% | 0,906 | 0,814 | 0,087 |

### Ablasi (info, bukan model terdaftar)

Tanpa 11 fitur cuaca, Jul-Nov: AUC 0,910 (model 0,915), Brier skill vs logistik 0,116 (model 0,126); sepanjang tahun AUC 0,925 (model 0,928), Brier skill 0,102 (model 0,111).

Fitur paling sering dibelah (11 lipatan): minggu 12.320, hari_sejak 10.734, oni 9.578, kekerapan 8.860, dmi 8.523, klim5 7.760, reg_prov 7.722, penduduk_km2 7.627, tmaks7 7.531, angin7 7.369.

### Produksi DITAHAN: tidak ada cuaca operasional yang setara dengan cuaca latih

Syarat lolos, tetapi `public/data/risiko_mingguan.json` TIDAK ditulis. Peta minggu berjalan butuh cuaca 2026 sampai hari
terbit, dan sumbernya belum ada:

- POWER untuk 2026 memakai GEOS-IT, bukan MERRA-2. Selain bug hujan x24, setelah dibagi 24 hujannya masih tidak cocok
  dengan ERA5 Open-Meteo di sel Kalteng (-2,25; 113,75): Des 2025 (MERRA-2) 396 vs 418 mm dan Jan 2026 242 vs 236 mm cocok,
  tetapi Mei 2026 165 vs 411, Sep 2026 0,2 vs 78 mm. Memakai deret ini berarti kode kekeringan (DC, hujan 60 hari) di layar
  salah arah tepat di musim api.
- Ablasi tanpa cuaca hanya turun sedikit (AUC 0,910 vs 0,915; Brier skill 0,116 vs 0,126, Jul-Nov), jadi model TANPA cuaca
  bisa menjadi jalan cepat ke produksi. Tetapi itu model lain: harus didaftarkan dulu sebagai model produksi (dengan angka
  ablasi ini sebagai uji baliknya) sebelum tampil; tidak diputuskan di sini.
- Pilihan sumber cuaca operasional (ERA5 Open-Meteo 2026 ~22 panggilan per sel x 1.097 sel = ~24 rb panggilan sekali, lalu
  harian; atau `fwi.json` pipeline harian yang berbeda produk) adalah keputusan pipa-data/orkestrator. Apa pun pilihannya,
  beda produk reanalisis latih (MERRA-2) vs operasional harus diukur di masa tumpang tindih sebelum peta tampil.
- Catatan prospektif mingguan (ramalan dibekukan hari terbit, dinilai 7 hari kemudian) belum ada; butuh workflow terjadwal
  dan FIRMS NRT NOAA-20 harian.

### Bacaan jujur dan batas

- Keunggulan terbesar ada di pemeringkatan (AUC 0,915 vs 0,759). Sebagian besar datang dari riwayat api yang lebih kaya
  (hari sejak api, tetangga 3x3/11x11, kekerapan, musim) dan ENSO, bukan dari cuaca: lihat ablasi. Pembanding logistik
  hanya dua peubah sesuai rancangan, jadi selisih AUC ini mengukur "model lengkap vs aturan sederhana", bukan "cuaca vs
  tanpa cuaca".
- Brier skill 0,11-0,13 berarti galat kuadrat turun 11-13% dari pembanding terbaik. Peluang absolut tetap kecil: delapan dari
  sepuluh kantong sama isi berrata-rata <= 2,6%, dan kantong teratas (rata 26,8%) teramati 25,3%.
- La Nina (hanya 2022) Brier skill 0,049 dengan selang [-0,010; 0,091]: di tahun basah keunggulannya paling tipis dan tidak
  pasti. Syarat 4 dinilai El Nino vs bukan El Nino sesuai rancangan, jadi lolos; La Nina terpisah tidak diuji sebagai syarat.
- Cuaca = reanalisis pada hari terbit (sudah diketahui saat itu, tetapi reanalisis lebih bersih dari data operasional), dan
  ONI versi revisi. Keduanya sedikit optimistis.
- Target berderau: sensor kedua hanya mengonfirmasi ~49% sel-minggu berapi. Peluang yang tampil adalah peluang "NOAA-20
  menangkap >= 1 titik", bukan peluang "ada api".
- 2015-2017 dinilai dengan target S-NPP, 2018-2025 dengan NOAA-20 (laju NOAA-20 ~3% lebih tinggi); Brier skill positif di
  kedua masa.
- Selang provinsi = bootstrap 11 blok tahun (300 ulangan); lebar, terutama Kalteng [0,081; 0,262].

Waktu jalan: `api` 70 dtk; `lahan` 2 mnt; `cuaca` 65 mnt (1.097 sel, ~3,5 dtk/sel); `balik` 77 mnt (siapkan 20 dtk,
lipatan 290-560 dtk, nilai 8 mnt); ablasi 75 mnt. Mesin 8 GB, puncak memori lipatan ~1,6 GB. Berkas: `risiko_mingguan_uji.json`
69 KB; cache `data/raw/risiko/` 3,3 GB (`tetap_<th>.npy` 11 x 242 MB, `cuaca_harian.npz` 235 MB, `cuaca_merra2/` 242 MB,
`lipat_*.npz` ~10 MB, `model_<th>.json` ~745 KB). `data/raw/risiko/cuaca/` (54 MB) = unduhan x24 yang salah, aman dihapus.

## Koreksi audit validasi-model (23 Okt 2026)

Tidak ada kebocoran (fitur api dan riwayat dihitung ulang dari CSV FIRMS mentah: 0 beda; maju-berantai = LOYO). Tetapi:

- **Pembanding terdaftar lemah.** Logistik dari ~20 fitur riwayat api milik model sendiri (tanpa cuaca, ENSO, lahan) sudah
  AUC 0,902 (Jul-Nov). Tambahan GBDT + ENSO + cuaca + lahan di atasnya: Brier skill 0,030 [0,016; 0,042] (blok tahun),
  menang 9 dari 11 tahun dan di 30 dari 30 provinsi dengan >= 2.000 positif. **Angka "0,915 vs 0,759" tidak dipakai di
  teks pengguna.**
- **Angka utama yang dipakai:** AUC di dalam provinsi-minggu (cara tim lapangan memilah) model 0,847, logistik riwayat
  0,840, pembanding terdaftar 0,750. Recall bila 10% sel teratas per provinsi-minggu ditandai: 0,414 / 0,408 / 0,343.
  Top-1%: presisi 28%, recall 7,8%. Level peluang bergeser antar tahun (rasio rata-rata peluang / laju 0,88-1,41).
- **Selang:** blok tahun (11 blok), bukan provinsi x tahun: Brier skill Jul-Nov [0,090; 0,160]. Syarat 1 tetap lolos.
- **Bahaya produksi:** NaN cuaca/ONI/DMI lewat diam-diam dan menggandakan peluang (cuaca NaN di 2023: rasio 2,15).
  Produksi wajib menolak NaN dan dilatih pada fitur yang benar-benar diterima.
- **Cuaca nyaris tak dipakai** sebagai dinamika (cuaca diganti klimatologi: -0,001 sampai -0,006 AUC). Varian tanpa
  cuaca dan tanpa ONI/DMI setara di 2026 (AUC dalam provinsi-minggu 0,855 vs 0,854).
- **Sumber panas statis** (smelter, tambang, kilang; 108 sel menyala > 20% minggu) masih di target: wajib ditapis.
- **Prosedural:** keputusan sensor/HP tertulis di commit hasil, bukan sebelum menjalankan; La Nina hanya satu tahun
  (2022, Brier skill 0,049 [-0,010; 0,091]).

Konsekuensi: model produksi = model BARU (tanpa cuaca, sel statis ditapis, tolak NaN), didaftarkan dulu dengan logistik
riwayat sebagai pembanding wajib. LOYO 2015-2025 dan 2026 s.d. minggu 39 sudah dilihat, jadi bukti konfirmasinya hanya
dari catatan prospektif mingguan mulai sekarang.
