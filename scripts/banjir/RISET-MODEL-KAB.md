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
| statis | `frek_dibi` laju hari kejadian DIBI kabupaten | DIBI, tahun latih saja; baris latih memakai leave-one-year-out agar tidak melihat label sendiri |
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

## 7. Kriteria lulus (DIBEKUKAN, sidik `b369bedf1b3ca622`)

Dibekukan di kode (`KRITERIA`, `sidik_kriteria()`); `uji` menegaskan sidik di atas tercantum di berkas ini, dan `buka` menolak bila
sidik kriteria, kandidat, `model_kab.py`, `uji_balik.py`, `status.py` atau `dibi_tanggal.json` berubah sejak `latih`. Lulus bila SEMUA:

1. batas bawah CI95 selisih ETS (model - aturan) > 0 pada >= Waspada;
2. batas bawah CI95 selisih ETS (model - aturan) > 0 pada >= Siaga;
3. Brier skill model vs klimatologi > 0 (titik);
4. penjaga (usulan pengerja, pemilik boleh mencoret sebelum mengunci): AUC model >= AUC regresi logistik dan Brier model <= Brier
   regresi logistik (titik). Model yang tidak mengalahkan pembanding sederhana tidak layak dipakai.

Lulus berarti kandidat boleh dipasang SEBAGAI pelengkap berlabel (status resmi tidak ditimpa), bukan menggantikan `status.py`.
Tidak lulus: aturan tetap. Uji dibuka SEKALI (`uji.json` menjadi penanda); latih ulang = eksperimen baru dengan periode uji baru.

## 8. Hasil validasi 2022-2023

(Diisi dari `latih.json` setelah `latih`.)

## 9. Ranjau

- `ambil_cuaca` mengambil 5 sel per panggilan dengan jeda 330 dtk; bobot ~79 per sel. 104 sel = ~8.216 bobot (harian 10.000).
- `gbdt.py` stdlib: sekitar satu detik per pohon pada 80 ribu baris, jadi `latih` memakan puluhan menit.
- Python 3.9 di mesin ini: tanpa `match` dan `X | Y`.
