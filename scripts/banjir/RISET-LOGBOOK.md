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

Kuota jam Open-Meteo habis dua kali (tunggu 20 menit); dari 435 sel yang diminta, 220 sel sempat diunduh. Dinilai 74 dari
127 kabupaten berlabel (urutan: yang punya kedalaman/durasi dulu, lalu hari label terbanyak) + 18 dari 30 kontrol tanpa laporan.
Kabupaten berlabel lain belum dinilai; lanjutkan dengan `python3 scripts/banjir/uji_logbook.py ambil` lalu jalankan ulang
(cache `data/raw/banjir/uji_logbook`, tidak dilacak git).

## Hasil banjir, ">= Waspada" (kab berlabel; angka lain di JSON)

| Label | a / b / c / d | POD | FAR | CSI | ETS [CI95] |
| --- | --- | --- | --- | --- | --- |
| logbook, hari mulai | 103 / 3448 / 95 / 17962 | 0,52 | 0,971 | 0,028 | 0,019 [0,015-0,024] |
| logbook, hari aktif | 459 / 3092 / 381 / 17676 | 0,55 | 0,871 | 0,117 | 0,085 [0,063-0,108] |
| DIBI 2026 | 164 / 3387 / 152 / 17905 | 0,52 | 0,954 | 0,044 | 0,031 [0,023-0,039] |
| gabungan, hari mulai | 213 / 3338 / 195 / 17862 | 0,52 | 0,940 | 0,057 | 0,040 [0,031-0,050] |
| gabungan, hari aktif | 519 / 3032 / 440 / 17617 | 0,54 | 0,854 | 0,130 | 0,094 [0,073-0,118] |

- Per KEJADIAN logbook (hari mulai +-1): Waspada tertangkap 66,8%, Siaga 20,1%, Awas 1,0% (199 kejadian).
- >= Siaga: POD 0,10-0,15, ETS 0,04-0,07. Awas: nyaris tak pernah menyala (0-3 hit dari 240-960 hari kejadian).
- Menambah kontrol (kab tanpa laporan) hanya menaikkan FAR sedikit; kontrol tanpa laporan bukan pasti tanpa banjir.
- Vonis: TIDAK LULUS di kelima label. ETS tertinggi 0,094 (batas bawah 0,073 < 0,1). Aturan hujan menangkap sekitar separuh
  hari kejadian tetapi menyalakan 85-97% alarm palsu; selaras dengan vonis model_kab TIDAK LULUS (5ddc9c29).

## Intensitas (kedalaman, durasi, rumah) vs hujan

Fitur di hari mulai, maks atas sel kabupaten. Spearman [CI95, bootstrap per kabupaten], OLS log1p(y) ~ log1p(H3) + log1p(A7),
leave-one-kab-out.

| Target | n (kab) | rho H3 | rho A7 | rho imax | rho sm | skill LOKO |
| --- | --- | --- | --- | --- | --- | --- |
| tma_cm maks | 102 (45) | -0,01 [-0,21; 0,19] | 0,15 [-0,01; 0,32] | -0,07 [-0,26; 0,11] | 0,04 [-0,24; 0,24] | -0,04 |
| durasi_hari | 107 (55) | 0,16 [0,02; 0,32] | 0,10 [-0,07; 0,28] | 0,15 [-0,06; 0,32] | 0,16 [0,02; 0,31] | 0,00 |
| rumah | 163 (62) | 0,04 [-0,12; 0,20] | 0,04 [-0,10; 0,19] | -0,11 [-0,28; 0,06] | -0,06 [-0,23; 0,13] | -0,02 |

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
4. Lengkapi 53 kabupaten berlabel yang belum dinilai; ulangi sebelum mengambil keputusan ambang. Tidak ada ambang diubah di sini.
