# Uji luar-sampel 2026 dengan label logbook Pusdalops BNPB

Skrip: `scripts/banjir/uji_logbook.py` (swauji: `... uji`). Keluaran: `public/data/validasi_logbook_banjir.json`.
Aturan yang diuji: `status.py` BERLAKU (k=0,8, geser -1; ambang H3 40/80/120 mm, bahaya InaRISK, imax >= 20 mm/jam).
2026 tidak pernah dipakai memilih aturan itu (dipilih 2016-2021, diuji 2022-2025), jadi ini uji luar-sampel sebenarnya.

## Cara

Satuan kabupaten-hari 1 Jan .. ~18 Okt 2026, hujan ERA5 (prakiraan sempurna, jadi skill nyata lebih rendah), metrik dan
bootstrap blok kabupaten sama dengan `uji_balik.py`. Label: `lb_mulai` (hanya hari mulai di logbook), `lb_aktif` (mulai..surut,
maks 30 hari), `dibi` (DIBI 2026 banjir, bukan rob), `gab_*` (gabungan). Vonis ditulis sebelum melihat hasil: LULUS bila batas
bawah CI95 ETS (>= Waspada) > 0,1.

## Cakupan (jujur)

Cache hilang (tidak dilacak git), jadi 435 sel diunduh ulang penuh (1 Nov 2026) dan semua terunduh. Dinilai 127 dari 127
kabupaten berlabel + 30 dari 30 kontrol tanpa laporan. Jalankan ulang bila perlu dengan `python3 scripts/banjir/uji_logbook.py ambil`
lalu `python3 scripts/banjir/uji_logbook.py` (cache `data/raw/banjir/uji_logbook`, tidak dilacak git). Rentang tetap 1 Jan .. 21 Okt 2026;
logbook lokal memuat sampai 29 Okt (12 kejadian banjir mulai sesudah 18 Okt) dan TIDAK ikut dinilai: memperpanjang rentang
berarti mengunduh ulang hujan dan mengubah definisi uji. Hasil sebelumnya (74 kab + 18 kontrol) ada di riwayat git.

## Hasil banjir, ">= Waspada" (kab berlabel; angka lain di JSON)

| Label | a / b / c / d | POD | FAR | CSI | ETS [CI95] |
| --- | --- | --- | --- | --- | --- |
| logbook, hari mulai | 167 / 6889 / 129 / 29899 | 0,56 | 0,976 | 0,023 | 0,016 [0,013-0,018] |
| logbook, hari aktif | 635 / 6421 / 579 / 29449 | 0,52 | 0,910 | 0,083 | 0,055 [0,043-0,068] |
| DIBI 2026 | 219 / 6837 / 187 / 29841 | 0,54 | 0,969 | 0,030 | 0,020 [0,015-0,025] |
| gabungan, hari mulai | 303 / 6753 / 256 / 29772 | 0,54 | 0,957 | 0,041 | 0,027 [0,022-0,033] |
| gabungan, hari aktif | 711 / 6345 / 663 / 29365 | 0,52 | 0,899 | 0,092 | 0,060 [0,048-0,075] |

(Sebelumnya, 74 kab: ETS 0,019 / 0,085 / 0,031 / 0,040 / 0,094.)

- Per KEJADIAN logbook (hari mulai +-1): Waspada tertangkap 69,6%, Siaga 21,4%, Awas 3,7% (299 kejadian; sebelumnya 66,8 / 20,1 / 1,0%, 199 kejadian).
- >= Siaga: POD 0,11-0,15, ETS 0,03-0,05. Awas: POD 0,01-0,02, ETS <= 0,013.
- Menambah kontrol (kab tanpa laporan) hanya menaikkan FAR sedikit; kontrol tanpa laporan bukan pasti tanpa banjir.
- Vonis (ditulis sebelum hasil, aturan tidak diubah): TIDAK LULUS di kelima label. ETS tertinggi 0,060 (batas bawah 0,048 < 0,1).
  Aturan hujan menangkap sekitar separuh hari kejadian tetapi menyalakan 90-98% alarm palsu; selaras dengan model_kab TIDAK LULUS (5ddc9c29).
  Cakupan penuh menurunkan ETS dibanding 74 kab pertama (yang dipilih berdasar kedalaman/durasi), bukan menaikkannya.

## Intensitas (kedalaman, durasi, rumah) vs hujan

Fitur di hari mulai, maks atas sel kabupaten. Spearman [CI95, bootstrap per kabupaten], OLS log1p(y) ~ log1p(H3) + log1p(A7),
leave-one-kab-out.

| Target | n (kab) | rho H3 | rho A7 | rho imax | rho sm | skill LOKO |
| --- | --- | --- | --- | --- | --- | --- |
| tma_cm maks | 140 (73) | -0,00 [-0,17; 0,16] | 0,09 [-0,06; 0,23] | -0,06 [-0,25; 0,11] | 0,15 [-0,06; 0,34] | -0,03 |
| durasi_hari | 161 (90) | 0,15 [-0,01; 0,30] | 0,17 [0,02; 0,31] | 0,11 [-0,07; 0,26] | 0,11 [-0,03; 0,26] | 0,02 |
| rumah | 249 (106) | 0,02 [-0,12; 0,15] | 0,07 [-0,05; 0,19] | -0,12 [-0,25; 0,01] | 0,00 [-0,16; 0,16] | -0,01 |

Tidak ada sinyal (kriteria: batas bawah rho > 0,3 DAN skill LOKO > 0,1). Rumus log-linear tidak mengalahkan rata-rata
latih (skill <= 0). Kedalaman dan durasi yang dilaporkan tidak dapat diprediksi dari hujan ERA5 di titik ini. Dugaan sebab
(belum diuji): kedalaman ditentukan limpasan sungai dan relief lokal, bukan hujan titik; angka TMA di logbook campur
(sungai, genangan, jalan); tanggal mulai di Kronologis kasar. `kedalaman_genangan.py` dan `dampak.py` tidak punya keluaran
per kejadian 2026 yang sebanding (FwDET: cache hanya Kalsel/Jateng/Sumbar tahun uji; dampak.py: penduduk kecamatan berstatus
hari ini), jadi tidak dibandingkan.

## Yang akan memperbaiki

1. Debit/TMA pos duga sungai (BBWS, SIHKA/PUPR, pos_sungai.json) di kabupaten berlabel, sebagai prediktor aliran, bukan hujan titik.
2. Hujan hulu DAS terakumulasi (bukan hujan sel kabupaten) dan kelembapan DAS; `hulu.py` sudah ada tetapi belum diuji terhadap label ini.
3. Label dengan kedalaman terukur (pos duga, kamera), bukan teks Kronologis.
4. Cakupan 2026 sudah lengkap (127/127). Perpanjang rentang di atas 21 Okt hanya dengan keputusan pemilik. Tidak ada ambang diubah di sini.

## Arsip Pusdalops 2016-2025 (`uji_logbook.py --arsip`, diperluas 1 Nov 2026)

**Headline = gabungan luar-sampel 2022-2025** (40 kab berlabel, level Waspada, aturan BERLAKU tak diubah). Aturan BERLAKU dipilih di 2016-2021, tetapi diterima lewat uji 2022-2025 pada label DIBI (`uji_balik.py` `LATIH, UJI`); label logbook belum dipakai menyetel apa pun. Pembanding tanpa hujan: persisten (alarm bila kemarin berlabel), klimatologi (alarm di bulan yang laju labelnya 2016-2021 di atas rata-rata kab itu), klimatologi berlaju alarm sama dengan model (bulan berlaju tertinggi sampai porsi hari sama dengan model di 2016-2021), acak.

lb_mulai (hari pemicu):

| Tahun | POD | FAR | ETS model (CI95) | ETS persisten | ETS klimatologi |
| --- | --- | --- | --- | --- | --- |
| 2022 | 0,48 | 0,979 | 0,006 (0,001-0,012) | 0,009 | 0,006 |
| 2023 | 0,53 | 0,982 | 0,011 (0,005-0,017) | 0,028 | 0,004 |
| 2024 | 0,62 | 0,977 | 0,011 (0,006-0,017) | 0,016 | 0,006 |
| 2025 | 0,62 | 0,973 | 0,012 (0,008-0,017) | 0,037 | 0,004 |
| **Gabungan 2022-2025** (631 hari kejadian) | **0,57** | **0,977** | **0,011 (0,008-0,014)** | **0,024** | **0,005** |

Pembanding gabungan: klimatologi POD 0,51 / FAR 0,983; persisten POD 0,06 / FAR 0,94; acak POD 0,30. **Vonis TIDAK LULUS** (batas bawah CI 0,008 < 0,1). lb_aktif gabungan 2022-2025 (2.618 hari): model ETS 0,025 (0,017-0,033), persisten 0,644 (tidak adil untuk label berdurasi), klimatologi 0,019; juga TIDAK LULUS. Dalam-sampel 2016-2021 lb_mulai ETS 0,008-0,016: luar-sampel tidak lebih buruk, juga tidak lebih baik.

Selisih ETS Waspada lb_mulai gabungan 2022-2025 dengan CI95 berpasangan (bootstrap kab-tahun): model dikurangi persisten -0,013 (-0,027 s.d. -0,001), jadi kalah dari persisten pada gabungan; per tahun CI memuat 0 (2022: -0,003, -0,012 s.d. 0,008; 2023: -0,017; 2024: -0,004; 2025: -0,025), jadi "kalah" tidak pasti di tiap tahun. Model dikurangi klimatologi +0,006 (0,003 s.d. 0,009) dan dikurangi klimatologi berlaju sama +0,008 (0,005 s.d. 0,011): unggul tipis tapi nyata, ETS tetap ~0,01. Uji kepekaan kab berlabel menurut 2016-2021 saja (38 kab): ETS 0,011 (0,008-0,014), POD 0,57, FAR 0,976.

**Bacaan jujur:** model hanya sedikit di atas klimatologi dan acak, kalah dari persisten pada gabungan, dan ~98 dari 100 alarm Waspada keliru. Dengan hujan sempurna pun ini bukan prakiraan kejadian harian yang layak; prakiraan sungguhan lebih buruk. Perluasan ke 2023-2025 tidak mengubah kesimpulan 2022.

Label: `data/pusdalops/logbook_kejadian.csv`, jenis `banjir`, hari `tgl_kejadian` (`lb_mulai`) dan sampai `terakhir_dicatat` maks 30 hari (`lb_aktif`). Hujan: ERA5 cache `uji_balik` (2015-12-22..2026-01-03, nol unduhan), 41 kab / 104 sel; 2011-2015 butuh unduhan. Keluaran: `public/data/validasi_logbook_banjir_arsip.json`.

Enam catatan bias: (1) tahun parsial hanya menilai hari tercatat (2021: 343, 2022: 272, 2023: 327 hari; piket bolong), hari tanpa laporan di luar itu bukan negatif; (2) 41 kab sampel dari cache `uji_balik` dipilih dari jumlah hari kejadian 2016-2025 TERMASUK tahun uji 2022-2025, jadi seleksi memakai hasil: skor OPTIMISTIS, POD dan laju dasar TIDAK berlaku nasional, FAR bukan batas atas yang pasti (uji kepekaan "kab berlabel menurut 2016-2021 saja" ada di JSON, tetapi 41 kab awal tetap terseleksi; memilih ulang kab dari 2016-2021 butuh unduhan ERA5 baru); (3) persisten tidak adil untuk label berdurasi/berjendela; (4) hujan ERA5 = prakiraan sempurna, prakiraan sungguhan hanya lebih buruk; (5) aturan BERLAKU dipilih di 2016-2021 tetapi diterima lewat uji 2022-2025 pada label DIBI (`uji_balik.py` `LATIH, UJI`), jadi 2022-2025 bukan sepenuhnya murni; label logbook belum dipakai menyetel apa pun; (6) klimatologi belajar hanya dari hari tercatat 2016-2021.
