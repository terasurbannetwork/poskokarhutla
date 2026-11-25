# Neraca air Jawa: metode

Bagian ini memerinci metode neraca air Jawa, termasuk GRACE dan proyeksi iklim.

## Neraca air Jawa: metode

Dokumen rujukan: `data/kajian-bnpb/neraca-air/RANCANGAN.md`, `VALIDASI.md`, `HASIL.md`. Kode: `scripts/air/neraca/`. Unit: 119 kabupaten/kota di enam provinsi Jawa (kode Kemendagri). Periode klimatologi 1991 sampai 2025. Langkah waktu bulanan. Berlabel estimasi-model.

Sumber:

- Hujan: CHIRPS v2.0 bulanan 0,05 derajat (UCSB CHC) lewat IRI Data Library, dirata-ratakan ke sel 0,1 derajat. Jalur ERA5 Open-Meteo (`iklim.py`) hanya pembanding sejak 27 Oktober 2026, karena Open-Meteo tidak punya hujan ERA5-Land untuk Jawa dan kuotanya sekitar 54 sel per hari.
- ET0: FAO-56 Penman-Monteith dari rerata bulanan NASA POWER (MERRA-2, kisi 0,5 x 0,625 derajat, 88 titik).
- Topologi aliran: HydroBASINS v1c level 09 (555 sub-DAS) beririsan dengan peta 119 kabupaten/kota dan sel iklim (`topologi.py`, dijalankan sekali secara lokal). RANCANGAN menyebut level 12; yang tersedia di repositori level 09 sehingga kota kecil memakai pecahan luas.
- Penduduk: WorldPop 2026 diskala ke proyeksi penduduk BPS 2010-2035 per provinsi (2025 dan 2030). Pangsa perkotaan dipaskan ke persen perkotaan BPS.
- Ternak dan industri: tabel BPS (`masukan_bps.py` dan `tarik_bps.mjs`). Kosong berarti tidak tersedia.
- Waduk: enam waduk dan transfer Tarum Barat (`waduk.csv`), satu sumber dan label per baris.

Model per sel iklim, bak lengas Thornthwaite-Mather (merujuk SNI 19-6728.1-2002 bagian 5):

```
PET = Kc * ET0
bila P >= PET : ETa = PET, sisa mengisi bak, lebih dari TAW = surplus
bila P <  PET : SM = SM * exp(-(PET - P) / TAW), ETa = P + penurunan SM
surplus dipecah: alpha langsung jadi aliran; sisanya ke tampungan linear G (keluar G * (1 - exp(-1/k)) per bulan)
```

Parameter (`neraca.py:39`): TAW 130 mm (lempung FAO-56 zona akar 1 m, asumsi lanskap campuran), Kc 1,0, alpha 0,6 (dikalibrasi dari 0,5 pada NA-06), k 2,0 bulan. Berlabel asumsi-kebijakan dengan kalibrasi terhadap GloFAS.

Routing per sub-DAS dari hulu ke hilir: ketersediaan irisan kabupaten/kota = pecahan luas x aliran masuk dari hulu + limpasan lokal irisan (+ transfer). Pasok = minimum (tersedia, kebutuhan konsumtif irisan). Sisa mengalir ke outlet sub-DAS. Waduk menampung lalu melepas target tetap sebesar rerata aliran 1991-2025 (jalan pertama tanpa waduk), dijepit antara nol dan tampungan.

Kebutuhan (`kebutuhan.py`):

- Domestik: 120 L per kapita per hari perkotaan dan 60 L pedesaan (SNI 19-6728.1-2002, resmi).
- Irigasi gaya KP-01: padi memakai Kc x ET0 + perkolasi 2 mm/hari + penyiapan lahan 250 mm di bulan pertama tiap musim - 0,7 x hujan; palawija memakai Kc 0,7 x ET0 - 0,7 x hujan; dibagi efisiensi 0,65. Pola tanam padi November-Februari, padi Maret-Juni, palawija Juli-Oktober. Intensitas musim ketiga 0,5 dari luas jaringan.
- Konsumtif = kebutuhan dikurangi aliran balik irigasi 30 persen (keputusan pemilik 3).
- Proyeksi 2030 hanya menumbuhkan penduduk domestik.

Indikator per kabupaten/kota: A = limpasan lokal + aliran masuk, C = kebutuhan konsumtif, N = A - C. N80 kemarau = persentil ke-20 dari total N Juni sampai Oktober tiap tahun (terlampaui di 80 persen tahun). Status DDL gaya Permen LH 17/2009: SA = limpasan lokal tahunan (pengganti rumus aslinya), DA = penduduk x 1.600 m3 per kapita per tahun. Konservasi massa diperiksa tiap jalan dengan toleransi galat 0,1 persen. Hanya sub-DAS yang semua selnya dan hulunya ada di data iklim yang dipakai, dan kabupaten/kota masuk keluaran bila semua irisannya ada (saat ini 119 dari 119 lengkap).

Hasil v1 (HASIL.md, rerata 1991-2025, Jawa): hujan 340.910 Mm3 per tahun, ETa 155.032, limpasan lokal 185.590, kebutuhan konsumtif 2025 sebesar 33.193 Mm3 (17,9 persen limpasan tahunan dan 32,3 persen limpasan Juni-Oktober). Pada Juni-Oktober klimatologi 16 kabupaten/kota defisit; skenario 1997 membuat 99 kabupaten/kota defisit, 2015 sebanyak 63, 2019 sebanyak 74, dan 2023 sebanyak 47.

Uji balik dan validasi (`validasi.py`, `VALIDASI.md`), label tetap estimasi-model karena tanpa data pos duga BBWS (keputusan 8):

| Pemeriksaan | Ambang | Hasil sesudah kalibrasi |
| --- | --- | --- |
| Limpasan total Jawa terhadap BPS 2020 | bias mutlak 15 persen atau kurang | +5,9 persen, lolos |
| Muara 12 sungai, median rasio model terhadap GloFAS v4, tahunan | 0,80 sampai 1,25 | 1,01, lolos |
| Sungai dengan rasio tahunan di luar 0,5 sampai 2 | 0 | 0 dari 12, lolos |
| Median korelasi bulanan | 0,80 atau lebih | 0,85, lolos |
| Median rasio Juni-Oktober | 0,80 sampai 1,25 | 1,34, tidak lolos |
| Sungai dengan rasio Juni-Oktober di luar 0,5 sampai 2 | 0 | 1 dari 12, tidak lolos |

Jadi model baik untuk rerata tahunan dan pola bulanan, tetapi kurang tepat pada aliran dasar musim kemarau. Arah bias bergantung tahun: pada 1997 model memadamkan aliran di sebagian sungai sehingga kekurangan dilebih-lebihkan, sedangkan pada 2015, 2019, dan 2023 model mengalirkan lebih dari GloFAS di sejumlah muara (contoh Jratunseluna 7,5 sampai 8,5 kali) sehingga kekurangan diremehkan. GloFAS sendiri adalah model global, bukan pengukuran.

### GRACE

`grace.py` memakai produk JPL mascon RL06.3Mv04 CRI (anomali simpanan air terestrial, cm setara tinggi air, relatif terhadap rerata 2004-2009). Resolusi asli sekitar 330 km, sehingga 119 kabupaten/kota hanya memakai 7 mascon dan berbagi sinyal. Deret kabupaten/kota adalah rerata berbobot luas atas sel GRACE daratan. Tren memakai kemiringan Sen dengan selang kepercayaan Hirsch-Slack yang dikoreksi autokorelasi lag-1 (n efektif = n(1 - r1)/(1 + r1)). Prakiraan tiga bulan memakai AR(1) pada anomali tanpa musim. Hindcast origin bergulir dibandingkan dengan persistensi dan klimatologi, dan dinyatakan lolos bila galat kuadrat rerata (RMSE) terkumpul model lebih kecil dari keduanya pada horizon 1, 2, dan 3 bulan. Vonis di `grace.json`: LOLOS. Ini bukan pengganti peringatan kekeringan; modul ini hanya memberi konteks simpanan wilayah.

### Proyeksi iklim dan deret bulanan

- `proyeksi_iklim.py`: perubahan hujan (persen) dan suhu (derajat Celsius) 2041-2060 terhadap 1995-2014 per kabupaten/kota dari NASA NEX-GDDP-CMIP6 (0,25 derajat, harian) untuk skenario ssp245 dan ssp585, sebaran lima model (median, p10, p90). Ini proyeksi berbias model, bukan prakiraan.
- `proyeksi_neraca.py`: menjalankan neraca ulang untuk tiap model dengan pendekatan delta-change (keputusan pemilik 11 November 2026): hujan dikalikan rasio, suhu digeser, ET0 dihitung ulang dengan rumus Penman-Monteith yang sama, kebutuhan tetap 2025. Lima model: ACCESS-CM2, MPI-ESM1-2-HR, MRI-ESM2-0, NorESM2-MM, CMCC-ESM2. Indikator: N_kemarau, N_tahunan, N80_kemarau, R_tahunan, bulan_defisit.
- `deret.py`: deret bulanan P, ETa, R, S per kabupaten/kota sejak 2010 memakai bak yang sama tanpa routing, waduk, dan kebutuhan, sebagai fitur untuk model banjir kabupaten/kota. Nilai bulan terakhir bergantung keterlambatan data: radiasi NASA POWER terlambat sekitar 3 bulan, suhu dan CHIRPS sekitar 1 bulan, sehingga ET0 lengkap berhenti di bulan radiasi terakhir.
