# Model peluang banjir kabupaten-hari vs aturan status.py

Tanggal protokol: 27 Oktober 2026. Skrip: `scripts/banjir/model_kab.py`. Keluaran kandidat: `data/raw/banjir/model_kab/`
(`kandidat.json`, `latih.json`; bukan `public/`). Status: **kandidat, uji 2024-2025 BELUM dibuka.**

## 1. Pertanyaan

Apakah GBDT pohon dangkal (resep karhutla, `scripts/sebaran/gbdt.py`, diimpor) atas hujan ERA5 + memori basah + riwayat
kabupaten mengalahkan aturan ambang `status.py` untuk kabupaten-hari, pada jumlah alarm yang SAMA? Aturan sekarang lemah
(`validasi.json`: Waspada POD 0,565 FAR 0,964 ETS 0,019; Siaga POD 0,132 FAR 0,939 ETS 0,031).

## 2. Data dan pembagian (sama dengan `uji_balik.py` / `ambang_wilayah.py`)

- Unit kabupaten-hari; level aturan kabupaten = level kecamatan tertinggi (sel hujan dengan level tertinggi).
- Label: ada baris DIBI `banjir` atau `bandang` dengan kejadian >= 1 di kabupaten itu tanggal itu (`dibi_tanggal.json`).
- Hujan: ERA5 Open-Meteo archive 0,25 derajat, prakiraan sempurna (batas atas; tidak berlaku langsung untuk IFS produksi).
- Sampel kabupaten: `ub.pilih()` dengan kejadian dipotong <= 2021 (sama `ambang_wilayah.muat()`), jadi tahun validasi/uji tidak ikut
  memilih kabupaten. Beda beberapa kabupaten dari 42 kab di `validasi.json` (yang dipilih memakai semua tahun). Aturan dan model
  dinilai pada sampel yang SAMA, jadi adu tetap adil, tetapi angka aturan di sini bukan angka `validasi.json`.
- latih 2016-2021, validasi 2022-2023, uji 2024-2025. Hari dinilai mulai indeks 30 (2016-01-21) karena A30 butuh 30 hari ke belakang.

## 3. Fitur (hanya yang diketahui saat meramal, jendela aturan = hari d-1..d+1)

Tiap fitur kabupaten = maksimum atas sel hujan kabupaten itu (sama cara aturan menurunkan level kabupaten).

| Kelompok | Fitur | Sumber |
| --- | --- | --- |
| hujan | `h1` hujan hari e | ERA5 `precipitation_sum` |
| hujan | `h3` hujan e-1..e+1 | ERA5, sama dengan H3 `status.py` (`GESER = -1`) |
| hujan | `imax` hujan per jam terbesar e-1..e+1 | ERA5 `precipitation` per jam |
| hujan | `pers_h3` peringkat persentil H3 terhadap H3 sel itu di hari latih | ERA5, batas dihitung dari 2016-2021 saja |
| anteseden | `a7`, `a30` hujan 7 dan 30 hari sebelum e | ERA5 |
| anteseden | `api85`, `api90`, `api95` indeks hujan anteseden API_k = k API + hujan, sampai hari e-1 | ERA5, k 0,85 / 0,90 / 0,95 |
| tanah | `sm` lengas tanah 7-28 cm | ERA5 `soil_moisture_7_to_28cm_mean` |
| musim | `bulan_sin`, `bulan_cos` | tanggal |
| statis | `frek_dibi` laju hari kejadian DIBI kabupaten | DIBI, EKSPANSIF: baris tahun latih y memakai hanya tahun latih < y (2016 = laju nasional sampel 2008-2015), dihaluskan 30 hari; validasi/uji memakai semua tahun latih. Nilai baris tahun y tidak bergantung pada label tahun y (asersi di `uji`) |
| statis | `bahaya_b` indeks bahaya banjir InaRISK (maksimum kecamatan sampel) | `public/banjir/data/bahaya.json` (`bahaya.py`, sama dengan `status.py`) |
| aturan | `level_aturan` 0..3 | `status.level_banjir` dengan konstanta berlaku (model = aturan + koreksi) |

Fitur tidak dipakai: arah/kecepatan angin dan CAPE (tidak ada di cache uji balik; menambahnya = unduhan baru), sungai GloFAS dan
ansambel (tidak ada historis).

## 4. Pembanding

(a) aturan `status.py` (biner Waspada/Siaga; sebagai probabilitas: laju empiris per level di latih); (b) klimatologi kabupaten-bulan
dari latih, dihaluskan ke laju kabupaten (bobot 30 hari); (c) regresi logistik (`gbdt.latih_lr`) pada fitur yang sama (log1p untuk hujan).

## 5. Penyetelan (hanya validasi)

Kisi kedalaman {2, 3, 4} x laju belajar {0,05; 0,1} x jumlah pohon {20..200 langkah 10}, kriteria logloss validasi (Platt dipasang
per kandidat). Lalu ablasi kelompok fitur satu putaran berurutan: kelompok dibuang bila logloss validasi tidak memburuk. Platt
dipasang di validasi (dua parameter). Model TIDAK dilatih ulang pada latih+validasi: kandidat yang dibekukan = yang dinilai di uji.

## 6. Metrik

AUC, Brier, Brier skill vs klimatologi, reliabilitas 10 bin; pada ambang yang membuat jumlah alarm model SAMA dengan alarm aturan
(>= Waspada dan >= Siaga, periode yang sama): POD, FAR, CSI, ETS, PSS. CI 95% bootstrap blok (kabupaten x tahun), 1.000 ulangan,
berpasangan model vs aturan (blok yang sama untuk keduanya), persentil 2,5 dan 97,5, biji 11. Ambang alarm tetap pada tiap ulangan
(ditetapkan pada seluruh periode).

## 7. Kriteria lulus (DIBEKUKAN, sidik `c890cedf7b4ca4dd`)

Dibekukan di kode (`KRITERIA`, `sidik_kriteria()`); `uji` menegaskan sidik di atas tercantum di berkas ini. `buka` menolak bila sidik
penuh berubah sejak `latih`: sidik penuh = kriteria + kandidat (pohon, Platt model/LR/klimatologi, pembanding, daftar sel) + isi
`model_kab.py`, `uji_balik.py`, `status.py`, `umum.py`, `scripts/sebaran/gbdt.py`, `bahaya.json`, `dibi_tanggal.json` + manifest cache
ERA5 (nama, ukuran, sha256 per sel). Kalibrasi setara: model, regresi logistik dan klimatologi sama-sama dikalibrasi Platt di validasi.
Lulus bila SEMUA:

1. batas bawah CI95 dETS (model - aturan) > 0 pada >= Waspada DAN >= Siaga;
2. batas bawah CI95 dETS (model - regresi logistik) > 0 pada Waspada DAN Siaga;
3. batas bawah CI95 dETS (model - klimatologi) > 0 pada Waspada DAN Siaga;
4. batas bawah CI95 Brier skill model vs klimatologi (terkalibrasi) > 0;
5. penjaga titik: AUC model >= AUC regresi logistik.

Seri skor pada ambang alarm dipecah acak berbiji tetap 11 (jumlah seri dilaporkan di keluaran). Lulus berarti kandidat boleh dipasang
SEBAGAI pelengkap berlabel (status resmi tidak ditimpa). Tidak lulus: aturan tetap. Uji dibuka SEKALI (`uji.json` = penanda); sesudah
`buka`, hasil + sidik ditambahkan otomatis ke §10 berkas ini (ikut git). Latih ulang = eksperimen baru dengan periode uji baru.

## 8. Hasil validasi 2022-2023

BELUM ADA untuk sampel penuh. Per 27 Okt 2026 malam baru 25 dari 104 sel ERA5 ter-cache (kuota harian Open-Meteo habis), jadi hanya
10 kabupaten yang lengkap. `MODEL_KAB_SEBAGIAN=1 python3 scripts/banjir/model_kab.py latih` menjalankan pipa pada 10 kabupaten itu
(21.720 baris latih, 145 kejadian; 7.300 baris validasi, 27 kejadian) ke `data/raw/banjir/model_kab_sebagian/`: HANYA pratinjau pipa,
terlalu tipis untuk vonis (CI lebar, `buka` menolak mode ini). Setelah kuota pulih (00.00 UTC = 07.00 WIB):
`python3 scripts/banjir/model_kab.py ambil` (lanjut dari cache) lalu `python3 scripts/banjir/model_kab.py latih` (perkiraan 5-10 menit).

## 9. Ranjau

- `ambil_cuaca` mengambil 5 sel per panggilan dengan jeda 330 dtk; bobot ~79 per sel. 104 sel = ~8.216 bobot (harian 10.000).
- `gbdt.py` stdlib: sekitar satu detik per pohon pada 80 ribu baris, jadi `latih` memakan puluhan menit.
- Kuota nyata lebih boros dari taksiran 79/sel: 25 sel (5 panggilan x 5 sel) sudah menabrak batas jam, dan batas harian habis sebelum 30 sel
  (kuota dibagi proses lain di jaringan yang sama). Satu panggilan 5 sel x 10 tahun per jam bisa 15-55 menit (server lambat).
  Beberapa proses `ambil` paralel pada irisan sel berbeda mempercepat, tetapi menghabiskan kuota jam lebih cepat.
- Python 3.9 di mesin ini: tanpa `match` dan `X | Y`.
- Keterbatasan statistik (diakui, tidak mengubah kriteria): (a) bootstrap blok kab x tahun tidak menangkap korelasi ANTAR-kabupaten pada
  hari/minggu yang sama (hujan besar satu sistem cuaca), jadi CI cenderung terlalu sempit; sensitivitas blok pulau x minggu dilaporkan
  di keluaran (`d_ets_model_vs_aturan_pulau_minggu`) tetapi tidak menentukan vonis. (b) `pers_h3` memuat dirinya sendiri: batas persentil
  sel dihitung dari H3 hari latih, termasuk hari yang sedang dinilai pada baris latih (tidak pada validasi/uji). (c) `bahaya_b` InaRISK
  belum terbukti bebas dari DIBI (InaRISK disusun dari data kejadian historis); bila ya, model mewarisi sebagian label. (d) laju
  `frek_dibi` ekspansif tahun pertama latih memakai DIBI 2008-2015 yang lebih kurang lengkap dari tahun-tahun belakangan.
