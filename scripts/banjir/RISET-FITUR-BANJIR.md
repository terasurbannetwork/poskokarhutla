# Tabel fitur per kabupaten untuk model banjir empiris (penggerak saja, tanpa label)

Dibuat 30 Oktober 2026. Skrip `scripts/banjir/fitur_banjir.py` (`ambil`, `susun`, `uji`). Cache dan keluaran di
`data/raw/banjir/fitur/` (tidak dilacak git): `statis.json` (satu baris per kab), `harian/<kab_kode>.json` (kolom per hari,
`hari0` = 2005-01-01, indeks = hari ke-n). Pasangan dokumen: `PRAREG-DAMPAK.md` (bentuk model: hujan -> limpasan SCS-CN ->
kelebihan atas kapasitas -> air kiriman -> peluang/KK). Tidak ada ambang, `status.py`, atau `public/` yang diubah.

Himpunan kab: 225 kab dengan kejadian `banjir`/`banjir_bandang`/`banjir_longsor` di `public/data/logbook_kejadian.json`
(urut jumlah kejadian). `data/raw_logbook/banjir/model_kab/kandidat.json` (39 kab) TIDAK ada di mesin ini; bila muncul, hapus
`fitur/kab.json` dan jalankan ulang `ambil daftar` (kab kandidat otomatis ikut). `--semua` memperluas ke seluruh kab (cache `kab_semua.json`).
Kode kab = kode Kemendagri `PP.KK` (sama dengan logbook); kab dipetakan lewat nama poligon `public/geo/kabupaten` (sama dengan `uji_logbook_longsor.muat_unit`).

Titik hujan kab = pusat kecamatan berbobot penduduk (WorldPop kecamatan). Titik tanah = pusat kecamatan terpadat.

## Tabel variabel

K = KONSTAN per daerah (tak berubah dalam waktu; berubah hanya bila datanya diganti). V = VARIABEL harian.

### Statis (statis.json)

| Variabel | Satuan | Sumber | Resolusi | Tahun | K/V |
| --- | --- | --- | --- | --- | --- |
| `luas_poligon_km2` | km2 | poligon `public/geo/kabupaten` (disederhanakan, lubang diabaikan) | vektor | batas kini | K |
| `penduduk`, `kk_proksi` (=jiwa/3,5), `kepadatan_jiwa_km2` | jiwa, KK, jiwa/km2 | WorldPop Global2 R2025A, `public/data/penduduk.json` per kecamatan | 1 km | 2026 | K (KK = ASUMSI 3,5 jiwa/KK, sama dengan PRAREG-DAMPAK) |
| `lereng_med_deg`, `lereng_p90_deg` | derajat | Copernicus DEM GLO-30 (AWS Open Data), gradien pada sel terdesimasi | 100-400 m (`px_m`) | ~2011-2015 | K. Lereng pada sel kasar MENGECILKAN lereng sebenarnya |
| `elev_p05/p50/p95`, `relief_m` (p95-p05), `elev_lt10`, `elev_lt25` (porsi darat < 10/25 m dpl) | m, porsi | Copernicus DEM GLO-30 | 100-400 m | idem | K |
| `hand_lt1/2/5/10` (porsi darat dengan HAND < t m), `hand_p50` | porsi, m | GLO-30 HAND v1 (ASF, CC0, turunan Copernicus DEM) | 30 m dibaca terdesimasi (nearest) 100-400 m | 2021 | K |
| `lc` / `lc_kode` (porsi 11 kelas tutupan di darat) | porsi | ESA WorldCover v200 2021 (10 m, CC BY 4.0), contoh nearest | 100-400 m dari 10 m | 2021 | K |
| `terbangun_km2`, `terbangun_hand_lt2`, `terbangun_hand_lt5` | km2, porsi dari area terbangun | WorldCover kelas 50 x HAND | idem | 2021 | K |
| `penduduk_hand2_proksi`, `kk_hand2_proksi` | jiwa, KK | penduduk x `terbangun_hand_lt2` | proksi | - | K. PROKSI: mengandaikan penduduk menyebar seperti area terbangun |
| `air_porsi_poligon` | porsi | WorldCover kelas 80 / poligon | idem | 2021 | K |
| `tanah` (`clay`, `sand` %, `hsg` A-D) | %, kelompok | SoilGrids v2 REST (ISRIC), 0-5 dan 5-15 cm rata-rata, SATU titik: kecamatan terpadat | 250 m | 2020 | K. Satu titik tidak mewakili kab |
| `cn_ii` | - | TR-55 (tabel di `statis.json > asumsi.cn_tabel`) x porsi `lc` x `hsg` | kab | - | K. ASUMSI, belum dikalibrasi Indonesia |
| `r2_mm`, `r5_mm` | mm/hari | Gumbel (momen) atas maks tahunan hujan harian POWER kab itu, 2005-2025 | kab | 2005-2025 | K |
| `i2_tc1_mmjam`, `i5_tc1_mmjam` | mm/jam | Mononobe I=(R24/24)(24/tc)^(2/3), tc=1 jam | kab | idem | K |
| `q2_mm`, `q5_mm`, `kapasitas_mm`, `kala_ulang_rencana` | mm | limpasan SCS-CN pada CN_II dari R2 / R5; kapasitas = Q5 bila nama "Kota ..." selain itu Q2 | kab | idem | K. PROKSI kapasitas drainase (lihat Asumsi) |
| `glofas_titik` (lat, lon, n_probe) | derajat | sel GloFAS 0,05 derajat berdebit rata-rata terbesar di dalam poligon (probe grid <=36 titik, 14 hari) | 0,05 | - | K |
| `q_rata_m3s`, `q_p95_m3s`, `q_rata_per_luas_mm_hari` | m3/s, mm/hari | GloFAS v4 reanalisis (Open-Meteo flood API) di titik itu, 2005-2026 | 0,05 | 2005-2026 | K |
| `das_hydrobasins_km2` | km2 | `public/banjir/data/bukti/*.json` (HydroBASINS v1c L9 yang dipakai `hulu.py`) | sub-DAS | - | K. HANYA 17 kab ber-bukti; lainnya kosong |
| `n_logbook_banjir` | kejadian | logbook Pusdalops 2026 | - | 2026 | K (untuk prioritas unduhan, bukan fitur model) |

### Harian (harian/<kab>.json, kolom sepanjang 2005-01-01 s.d. hari POWER valid terakhir)

| Kolom | Satuan | Sumber | Resolusi | Tahun | K/V |
| --- | --- | --- | --- | --- | --- |
| `p` | mm/hari | NASA POWER PRECTOTCORR (MERRA-2 terkoreksi GPCP), titik pusat berbobot penduduk | 0,5 x 0,625 derajat | 2005-2026 | V |
| `a3`, `a7`, `a30` | mm | jumlah p 3/7/30 hari berakhir hari itu | idem | idem | V |
| `api` | mm | API_t = 0,9 API_{t-1} + p (k=0,9 ASUMSI) | idem | idem | V |
| `p_pct_a3`, `p_pct_a7` | persentil 0-100 | peringkat a3/a7 terhadap SELURUH hari kab itu (bukan musiman) | - | idem | V |
| `gwet_akar` | 0-1 | POWER GWETROOT (kebasahan zona akar, MERRA-2) | 0,5 x 0,625 | 2005-2026 | V |
| `ro3_mm` | mm | SCS-CN atas a3 dengan CN_II kab digeser AMC I/II/III dari hujan 5 hari SEBELUM hari ini (<36/36-53/>53 mm) | kab | idem | V (null bila `cn_ii` belum ada) |
| `lebih_kap_mm` | mm | max(0, ro3 - `kapasitas_mm`) | kab | idem | V |
| `q_m3s` | m3/s | GloFAS v4 debit harian di `glofas_titik` | 0,05 | 2005-2026 | V (hanya kab yang sudah diunduh) |
| `q_pct` | persentil | peringkat q terhadap seluruh hari 2005-2026 titik itu | - | idem | V |
| `q_rasio_rata` | - | q / debit rata-rata titik itu | - | idem | V |

## Dikerjakan vs dilewati (dan sebabnya)

- Hujan jam-jaman (`h1`, `imax`): DILEWATI untuk 2005-2026. Satu-satunya sumber jam-jaman 20 tahun adalah Open-Meteo archive (kuota
  harian terbagi, 225 kab x 21 tahun jam-jaman tidak muat); cache ERA5 jam-jaman yang ada hanya 2025-12-25 s.d. 2026-10-22. `i2/i5`
  Mononobe adalah penggantinya untuk kapasitas, bukan untuk kejadian.
- Kelembapan tanah ERA5-Land: DIGANTI `gwet_akar` POWER (bebas kuota); skala dan resolusi berbeda dengan `sm` di `status.py`, jangan dicampur.
- Kerapatan jaringan sungai dan nama sungai utama: DILEWATI (HydroRIVERS ~0,5 GB per benua; tidak dimuat di repo). Gantinya:
  `glofas_titik` + `q_rata_per_luas_mm_hari` (skala sungai utama) dan `das_hydrobasins_km2` untuk 17 kab.
- Hujan hulu DAS (logika `hulu.py`): DILEWATI untuk kab di luar 17 kab ber-bukti dan tidak dihitung per hari di sini (butuh sel hujan
  0,25 derajat per sub-DAS; hujan POWER 0,5 derajat terlalu kasar). Air kiriman diwakili `q_*` GloFAS yang sudah mengintegrasikan hujan hulu
  (GloFAS dipaksa ERA5). Pakai `q_pct` dan `q_rasio_rata`, bukan menambahkan hujan hulu sekali lagi.
- Jumlah bangunan Open Buildings: DILEWATI. `scripts/umum/bangunan.py` baru menghasilkan Kalimantan Tengah (62) di mesin induk
  (puluhan GB untuk seluruh negeri). Gantinya `terbangun_km2` dan `terbangun_hand_lt2` (WorldCover) dan penduduk WorldPop.
- Kapasitas drainase terukur (kanal, pompa, polder): DILEWATI; tidak ada data nasional. Proksi di bawah.

## Asumsi yang dinyatakan

1. Kapasitas drainase = limpasan dari hujan rencana kala ulang 2 tahun (5 tahun untuk nama "Kota ..."), mengikuti Permen PU 12/PRT/M/2014
   (kota kecil 2 tahun; kota sedang/besar 2-5 tahun; metropolitan 5-10/10-25 tahun). Kab perkotaan non-"Kota" tetap 2 tahun. Ini batas bawah
   rancangan; kenyataan drainase banyak kota di bawah standar.
2. R2/R5 dari POWER (MERRA-2, ~50 km) meremehkan hujan titik ekstrem; nilai absolut kapasitas rendah-bias, urutan antar kab lebih bisa dipercaya.
   Belum dikalibrasi terhadap stasiun BMKG.
3. CN: TR-55, AMC II. Pemetaan WorldCover -> TR-55: pohon = woods fair; semak = brush fair; rumput = pasture fair; budidaya = row crops
   straight row good (dipakai juga untuk sawah; padi tergenang sebenarnya CN lebih tinggi); terbangun = residential 1/8 acre 65% kedap;
   terbuka = newly graded; air = 98; lahan basah dan mangrove = 85 (pilihan penulis). Kelompok tanah dari tekstur SoilGrids lewat segitiga USDA
   yang disederhanakan (A pasir/lempung berpasir, B lempung, C lempung liat berpasir, D liat/lempung liat). Tanah tropis berliat tinggi
   tetapi berstruktur (Oxisol/Ultisol) sering lebih permeabel daripada tekstur menyiratkan, jadi D terlalu sering; CN bias tinggi.
4. AMC: ambang TR-55 musim tanam dipakai sepanjang tahun; hujan 5 hari antara dihitung dari hari -5..-1.
5. KK = jiwa / 3,5 (PRAREG-DAMPAK). 6. API k = 0,9.

## Pemakaian dan lanjut

```
python3 scripts/banjir/fitur_banjir.py ambil [daftar,power,tutupan,tanah,glofas] [--semua] [--maks N]   # semuanya bisa dilanjut
python3 scripts/banjir/fitur_banjir.py susun      # setelah (sebagian) unduhan selesai; kab tanpa POWER dilewati
python3 scripts/banjir/fitur_banjir.py uji        # swauji luring
```
- `power` (bebas kuota), `tutupan` (GDAL ke S3 publik, ~70 dtk/kab, 4 paralel), `tanah` (SoilGrids REST, jeda 14 dtk), `glofas` (Open-Meteo flood API).
- GloFAS memakan kuota: satu seri 2005-2026 ~ 570 bobot (batas harian 10.000 ~ 17 kab/hari; batas jam 5.000). Skrip menunggu 20 menit
  pada batas jam dan berhenti pada batas harian; jalankan ulang `ambil glofas` hari berikutnya (kab yang sudah tersimpan dilewati, urutan = jumlah kejadian logbook menurun).
- Berkas bernama `<kab>.json.gz` kosong `{}` di `glofas/` = kab tanpa sel sungai di probe (tidak diulang).
