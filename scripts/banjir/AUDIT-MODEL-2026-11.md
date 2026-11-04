# Audit model dan simulasi banjir & longsor (3 Nov 2026)

Empat pemeriksa `validasi-model` berkonteks bersih, baca-saja, satu per keluarga:
aturan status/ambang, model statistik kab-hari, simulasi genangan/nowcast/rob, longsor.
Angka disalin dari berkas repo; yang tak diuji ditandai BELUM DICEK AKSES.
Keputusan pemilik 3 Nov 2026: formula BOLEH berbeda per wilayah.

## 1. Satu akar untuk hampir semua kegagalan: label

Label = "ada laporan DIBI/logbook di kab-hari itu". Hari tanpa laporan dianggap negatif,
padahal banyak yang banjir tapi tak dilapor (positif-tak-berlabel).

- Laju positif 1,2-1,7% kab-hari; Waspada menyala di 27-32% kab-hari, FAR 0,96-0,98
  (RISET-UJI-BALIK.md:31,87). ETS kecil menurut konstruksi.
- Laju lapor tumbuh: 823 hari banjir (2016) jadi 2.938 (2025) (RISET-UJI-BALIK.md:164);
  longsor DIBI 2024 hanya 219.
- 69% kejadian DIBI tak punya padanan Groundsource (RISET-LABEL-BANJIR.md).
- Klimatologi kab×bulan menang karena ia mengukur KEBIASAAN LAPOR per kab.
  Longsor: di dalam satu kab, model 0,689 = hujan-saja 0,694; begitu kebiasaan lapor
  dijadikan dasar, hujan menambah (0,823 vs 0,777, eksplorasi di tahun uji, jadi petunjuk saja).
- Model rumit tak menambah: GBDT = regresi logistik (dETS +0,0005, CI −0,0016..+0,0028).
- Genangan Jakarta: 99,6% laporan uji 2024-08 adalah laporan latihan (genangan/DIAGNOSIS-J3.md H4).

**Uji terbakar.** 2024-2025 sudah dibuka ≥8 kali, 2026-01..10-18 juga.
Satu-satunya uji bersih: prospektif 2026-11-01..2027-04-30 (lihat PRAREG-CAMPUR.md).

## 2. Kelemahan per keluarga

| Keluarga | Kelemahan terbesar | Bukti |
| --- | --- | --- |
| Aturan status (`status.py`) | H3 sendirian di plafon; ambang per kab = alarm persis sama | RISET-AMBANG-WILAYAH.md:125-127 |
| | Jalur sungai RK, P3, CAPE tak pernah diuji (14/192 titik punya ambang) | PRAREG-AMBANG-PERSENTIL.md:42 |
| | Ambang dipilih di ERA5, operasi pakai IFS; sm beda lapisan (7-28 vs 3-27 cm) | status.py:25-36 |
| Model statistik kab-hari | Sampel 39-40 kab dipilih dari kab paling sering lapor | uji_balik.py:96-107 |
| | Tak ada fitur "tipe banjir" (sungai/pasang/kota/bandang); anteseden dibuang ablasi | model_kab.py:215; RISET-GRRR §7.2 |
| | Persistensi pakai label kemarin yang tak tersedia saat prakiraan | PRAREG-PROSPEKTIF.md |
| Genangan J3/J4 | Belum mengalahkan peta elevasi (AUC 0,602 vs 0,646) | PRAREG-J4.md 1.1 |
| | DEM = DSM (gedung/tanggul); 23,5% sel DKI diangkat | DIAGNOSIS-J3.md H2 |
| | Kd mentok di batas grid; Kd per kec kalah dari seragam 3/3 | DIAGNOSIS-J3.md H6 |
| Nowcast Jakarta | BSS vs klimatologi 0,001; IMERG Early terlambat 4,4-4,9 jam | nowcast_jkt_vonis.json |
| Rob | Persentil dipilih di 26 kejadian yang sama dengan uji; datum global | rob.py:646 |
| Longsor | Hujan 0,5°, hanya R7/P95; tanpa intensitas-durasi atau anteseden 14/30 hari | dasar.py:16; rumus.py:134 |
| | Kerentanan nyaris tak membedakan (S AUC 0,581; tanah 95% HSG D) | model.py; ilmu longsor |

## 3. Bug dan ketidakcocokan kode (dibetulkan pengerja pemiliknya)

| Berkas | Masalah | Dampak | Pemilik |
| --- | --- | --- | --- |
| `scripts/longsor/model.py:112,131` | Hari "Banjir dan Tanah Longsor" (g=1) jadi NEGATIF | DIBETULKAN 3 Nov (`label_dibi`, 275 negatif keluar); AUC model 0,7045 → 0,7047, vonis GAGAL tetap | longsor |
| `scripts/longsor/model.py:111,135` | 81 kab tanpa DIBI g=0 (59 tanpa baris, 22 hanya g=1) | DIPERIKSA 3 Nov: bukan salah cocok (guard nama di tests/longsor), nol nyata (kota/pantai) | longsor |
| poligon kab bernama "None" | 5 poligon (prov 12, 13, 35, 64) tergabung jadi satu kab per provinsi | belum dibetulkan | banjir (Pencocok) |
| `scripts/longsor/model.py:132-134` | Skor kab = maks atas kec, kab besar tergelembung | arah belum jelas | longsor |
| `scripts/banjir/status.py:230,244` | `a7` hari ini dipakai untuk keempat hari; uji_balik menghitung per hari | aturan longsor produksi d>0 ≠ yang diuji | banjir |
| `scripts/banjir/status.py:250` | Pembanding "lama" tanpa imax/cape/p3 | hanya diagnostik stderr salah baca | banjir |
| `scripts/banjir/PRAREG-CAMPUR.md` §3.2 | `q_q2` log1p ganda (q3 sudah log1p, model_kab_debit.py:391) | rumus draf salah | banjir (sedang direvisi) |

## 4. Solusi, urut prioritas

1. **Label lepas dari kebiasaan lapor.**
   Klimatologi dijadikan offset (PRAREG-CAMPUR), bukan lawan.
   Tambah label yang tak bergantung pelapor:
   - GFM Sentinel-1: STAC `https://stac.eodc.eu/api/v1/collections/GFM` (HTTP 200, 3 Nov). Hanya penguat positif di luar kota dan hutan.
   - TMA pos duga BBWS/SIHKA melewati siaga: terkumpul sejak 19-27 Okt 2026, masih terlalu pendek untuk latih.
   - Groundsource: Zenodo 18647053, CC BY 4.0. Berhenti Jan 2026.
2. **Metrik jujur.**
   - Peringkat pada laju alarm 1% dan 3% kab-hari, AUC-PR, dan Brier skill.
   - Evaluasi toleran tanggal (d-1..d+2) sebagai sekunder.
   - Bootstrap blok pulau×minggu.
   - Tabel "daftar buka" supaya jumlah uji terhitung dari berkas.
3. **Fitur yang hilang.**
   - Debit dan hujan anteseden (e-7..e-2).
   - Tren debit.
   - Tipe banjir statis kab: Q2/luas DAS hulu pola GRRR, dan HAND.
   - Neraca air dan GRACE bulan sebelumnya, khusus Jawa.

   Semua masuk PRAREG-CAMPUR S3.
4. **Hujan lebih halus.**
   - IMERG Late/Final: 0,1°, 30 menit, butuh Earthdata, BELUM DICEK AKSES batch.
   - GSMaP gauge: arsip 2016-2025 belum diunduh.
   - CHIRPS: jalur `cogs/p05` 404 pada 3 Nov, cek jalur di `model_kab_hulu.py`.
   - Untuk longsor: ambang intensitas-durasi per zona dan anteseden 14/30 hari.
5. **Simulasi genangan.**
   - FABDEM (DEM tanpa gedung, 30 m) memakai CC BY-NC-SA 4.0 = NON-KOMERSIAL. Cek kecocokan untuk BNPB sebelum dipakai.
   - Parameter per sistem polder (Pluit, Ancol-Sunter), bukan per kecamatan.
   - Hanya pakai kejadian kalibrasi bersih (2017-01, 2018-01, 2020-01, 2021-02).
6. **Rob.**
   - Koreksi datum lokal per stasiun (IOC 200 OK; UHSLC BELUM DICEK AKSES).
   - Tambah surja dari angin dan tekanan.
   - Pilih persentil di luar data uji.
7. **Kerentanan longsor.**
   - Tutupan lahan ESA WorldCover (CC BY 4.0).
   - DEMNAS (menunggu akun).
   - LHASA v2 NASA sebagai pembanding eksternal.

## 5. Formula per wilayah: di mana membantu

Ketiga keluarga sepakat: **membantu bila wilayahnya besar dan ditetapkan sebelum melihat skor**.
Per kab atau kec kalah karena kejadian per unit terlalu sedikit:
- ambang per kab = alarm sama;
- Kd per kec kalah 3/3;
- ambang longsor per kab GAGAL.

| Wilayah | Bukti | Arah formula |
| --- | --- | --- |
| Jawa | Satu-satunya dengan Siaga berskill (PSS 0,11, CI 0,07-0,17); 138 kejadian uji GRRR | persentil hujan lokal + neraca air/GRACE |
| Kalimantan | Siaga tanpa skill (PSS 0,03, CI memuat 0) | jalur sungai/pasang mendahului hujan |
| Sumatera, Sulawesi | ~46 kejadian tiap pulau; Siaga longsor Sulawesi PSS 0,50 (CI 0,18-0,89) | ditarik ke nasional (partial pooling) |
| Bali-NT, Maluku-Papua | data uji hampir nol | model nasional saja |
| Kota polder (Jakarta, Semarang-Demak) | genangan dikendalikan pompa/pintu air | parameter per sistem polder |
| Longsor | 5-8 zona litologi/iklim, ratusan positif tiap zona | ambang I = a·D^-b per zona, validasi LOYO |

Penjaga, berlaku semua:
- Koefisien wilayah ditarik ke nasional.
- Pembanding wajib versi tanpa per-wilayah.
- Validasi leave-one-year-out dan leave-one-region-out.
- Wilayah yang kurang kejadian ditulis "belum cukup data".

## 6. Status

- PRAREG-CAMPUR.md: draf, sedang direvisi (5 butir HARUS dari review + fitur S3).
  Sidik wajib di-commit sebelum label Nov 2026 dibuka.
- Bug §3: belum dibetulkan; pengerja `longsor` dan `banjir`.
- Keputusan pemilik yang tertunda: daftar di PRAREG-CAMPUR §9.
