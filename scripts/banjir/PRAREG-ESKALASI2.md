# PRAREG-ESKALASI2: amandemen eskalasi banjir dengan label fisik dan debit sungai (KI-77)

Status: TERKUNCI SEBAGAI PROSPEKTIF. Tidak ada uji retrospektif yang dibuka dan tidak akan dibuka. `boleh_tampil` tetap false sampai vonis prospektif LOLOS dan gerbang tampil menyetujuinya.

## 1. Apa yang diamandemen, dan apa yang tidak

`PRAREG-ESKALASI.md` (`eskalasi.sidik` d5405318adc604ce) dibuka sekali pada 25 Nov 2026 dan **TIDAK LOLOS** (dBrier +0,0044, selang [-0,009; +0,019]; AUC 0,662 vs 0,651). Berkas itu, `eskalasi.py`, `eskalasi.buka`, dan `eskalasi.sidik` tidak disunting. Dokumen ini adalah amandemen tertulis baru dengan id baru (`PRAREG-ESKALASI2`) dan sidik baru (`eskalasi2.sidik`); aturan lama tidak dilonggarkan, ia diganti oleh definisi label dan fitur yang lebih fisik. Kegagalan lama diagnosa (R5 bagian 1): label dari kebiasaan pencatatan, hujan satu sel per provinsi, tanpa debit sungai.

## 2. Jendela: mengapa prospektif

Daftar buka (`model_kab_campur/daftar_buka.json`, 11 baris) dan sidik di `scripts/banjir/` membakar 2022-2025 (uji_balik UJI 2022-2025, uji_logbook 2022-2026, model_kab/DEBIT/HULU/GRRR/KAB2 uji 2024-2026-10-18, eskalasi lama 2024-2025). 2016-2021 dan 2016-2023 dipakai sebagai periode latih dan validasi LOYO oleh keluarga CAMPUR/KAB2 pada label Dalops/DIBI yang sama. Tidak ada jendela retrospektif yang belum pernah dipakai oleh sidik mana pun. Maka satu-satunya uji bersih:

- **Prospektif 2026-12-01 .. 2027-05-31.** Label dibaca hanya sesudah 2027-05-31 + 14 hari (jeda lapor Dalops). Tidak berhimpit dengan Uji B HULU/DEBIT atau CAMPUR (2026-11-01..2027-04-30) dalam arti keluarga uji: ia keluarga baru (m menjadi 15 untuk keluarga banjir kab-hari; selang Bonferroni baru dihitung orkestrator, angka di sini tidak mengklaim m).
- Periode 2016-2023 hanya untuk melatih dan untuk EKSPLORASI deskriptif (`eskalasi2.py hitung`), yang berlabel "bukan uji" dan tidak menghasilkan vonis.

## 3. Definisi

- Satuan (kab, d): kab dengan titik sungai layak (bagian 4) dan sampel hujan; d = hari sesudah awal episode s. Awal episode = ada kejadian banjir Dalops bertanggal s, tak ada kejadian di s-3..s-1, dan tercatat pada hari s itu sendiri. Pada d semua informasi di bawah sudah diketahui.
- **y = 1** bila ada kejadian banjir Dalops di KAB YANG SAMA bertanggal KEJADIAN d+1 atau d+2. Label fisik: tanggal kejadian, bukan tanggal dicatat, bukan "kab lain di provinsi".
- Satuan dengan kab-bulan tak teramati (Dalops tak menerbitkan apa pun bulan itu, lewat `label_mutu`) di s, d, d+1, d+2 dibuang dan dihitung; tak teramati tidak pernah menjadi 0.
- Perluasan GFM tidak dipakai: hanya pilot 34 kab-hari (`label_bersatu`), tidak cukup. DIBI tidak dipakai (label kedua, belum ada tanggal harian lengkap).

## 4. Fitur (hanya yang diketahui di hari d)

| Fitur | Isi |
| --- | --- |
| `lq` | log1p(debit GloFAS hari d / P90 titik itu). P90 dari hari <= 2023-12-31 saja |
| `fase` | +1 naik (q_d >= 1,10 q_(d-2)), -1 turun (<= 0,90), 0 datar/puncak |
| `lh13` | log1p(hujan d+1..d+3 / persentil-95 lokal kab dari jumlah 3 hari, hari <= 2023) |
| `tumbuh` | log1p(laporan dicatat di d tentang kejadian s..d) - log1p(laporan dicatat di s tentang s): pertumbuhan laporan 24 jam |
| `lap_d` | log1p(laporan dicatat di d tentang kejadian s..d) |
| `sinm`, `cosm` | musim |

Kab layak = titik sungai GloFAS (`debit_glofas.py`, titik dari `data/titik_glofas_kab.json`, dipakai ulang) dengan median debit >= 5 m3/s, minimal separuh hari terisi, dan titik tertempel <= 5 km dari titik tanya; selain itu `tanpa_sungai_besar` dan tidak dipakai. Himpunan kab ditentukan hanya oleh syarat data ini, tidak oleh hasil.

Fraksi anggota ansambel di atas P90 (`frak_ens`) DIARSIPKAN harian (`debit_glofas.py snapshot`, `data/raw/banjir/glofas/ensemble/`) tetapi TIDAK masuk model: reanalisis tak punya ansambel sehingga tidak ada riwayat latih. Ia dilaporkan terpisah sebagai bahan amandemen berikutnya. Pada prospektif, `lq` dan `fase` dibaca dari lari kontrol snapshot hari itu (d-2..d), bukan reanalisis; selisih sumber ini diakui. Hujan d+1..d+3 pada latih = ERA5 (batas atas informasi hujan, seperti uji lama), pada prospektif = `fitur.h3` lead 1 di `data/banjir/arsip_kab2`.

`API_k` (k = 0,88) dan hujan/persentil lokal tersedia di `debit_glofas.py` sebagai fitur kandidat, tetapi API_k tidak masuk model ini (tak ada deret hujan harian prospektif per kab di arsip).

## 5. Model, pembanding, vonis

- Model: regresi logistik L2 (lambda 1,0, IRLS `eskalasi.latih_lr`), standardisasi dari latih. Kalibrasi isotonik (PAV) dilatih pada skor OOF tinggalkan-satu-tahun, bukan skor dalam-sampel.
- Pembanding (semua dari latih): klimatologi provinsi x bulan, klimatologi bulan, persistensi pertumbuhan laporan (laju y menurut `tumbuh > 0`). Pembanding utama = Brier latih terkecil, dipilih sebelum uji.
- **Jumlah alarm sama**: alarm model = 25% satuan uji berperingkat teratas; pembanding utama dipasang ke jumlah alarm TEPAT sama (`pembanding.samakan_alarm`, imbang dipecah menurut (d, kab), dilaporkan).
- Kecukupan: kurang dari 150 satuan, kurang dari 40 y=1, atau kurang dari 4 provinsi -> **TAK_CUKUP**, tidak ada vonis dan tidak boleh diganti jendela atau ambang.
- **LOLOS** hanya bila batas bawah 95% (bootstrap blok provinsi x bulan, 2000 ulang, biji 7) dari dETS (model - pembanding utama, alarm sama) DAN dBrier (pembanding - model) keduanya > 0. Selain itu TIDAK_LOLOS; angka dilaporkan apa adanya.

## 6. Pembekuan dan penjaga

`eskalasi2.sidik` mengunci `eskalasi2.py`, `debit_glofas.py`, `eskalasi.py`, `pembanding.py`, berkas ini, dan `eskalasi2.kriteria.json`; masukan mencatat hash `label_dalops.py`, tabel titik, dan logbook saat sidik. `eskalasi2.py buka` menolak berjalan bila sidik/PRAREG belum di HEAD, jendela + 14 hari belum lewat, atau `eskalasi2.buka` sudah ada (O_EXCL, sekali). Menyunting salah satu berkas terkunci sesudah ini = amandemen tertulis dan sidik baru.

## 7. Batas yang diakui

Mesin debit GloFAS dari Open-Meteo Flood API menempelkan titik ke sungai terbesar dalam 5 km; kab tanpa sungai besar dikeluarkan, jadi hasil berlaku untuk kab bersungai. Pengambilan reanalisis (mulai 2014-01-01) dibatasi kuota (bobot ~337 per titik), sehingga cakupan kab bertambah bertahap. Label Dalops mencampur kejadian fisik dengan kebiasaan pelaporan; persistensi laporan sebagai pembanding menjaganya.
