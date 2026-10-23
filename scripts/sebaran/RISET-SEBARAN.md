# Riset sebaran karhutla: kapan mulai, dari mana, ke mana, dan seberapa bisa diramal

Dibuat 13 Okt 2026. Semua angka dari skrip di folder ini (stdlib Python 3.14; numpy/sklearn/lightgbm TIDAK terpasang,
jadi regresi logistik dan gradient boosting ditulis sendiri di `gbdt.py`). Berkas angka mentah:
`data/raw/sebaran/hasil.json` (latih/validasi/uji), `pendorong.json`, `pendorong_panjang.json`, `galat_val.json`,
`galat_uji.json`, `public/data/sebaran_kasus.json`. Selang = 95% bootstrap per peristiwa (1.000 ulangan), kecuali tertulis lain.

## 1. Data

| Data | Isi | Catatan |
| --- | --- | --- |
| VIIRS S-NPP 375 m | `viirs.csv` 2015–12 Okt 2026 (3,33 jt baris; 2,92 jt vegetasi n/h) + `viirs_2012_2014.csv` (diunduh hari ini, 1,29 jt) | arsip hanya **S-NPP**: ±2 lintasan/hari (13:30 & 01:30 lokal). Celah FIRMS 8 Mei–1 Jun 2026. Jul–Okt 2026 = NRT |
| VIIRS NOAA-20 | `viirs_noaa20.csv` Apr 2018–2026 (2,13 jt baris) | dipakai sebagai fitur model "akan membesar" (§12), bukan untuk definisi peristiwa |
| MODIS | 2002–2026, 1,9 jt baris | tren 25 tahun |
| Cuaca per jam | ERA5 (Open-Meteo archive) untuk 1.623 pasangan (tahun, sel 0,5°) = 90% peristiwa tumbuh 9 provinsi Jul–Nov (14 Okt: +681 pasangan 2017/2018/2019/2023, bobot 6.373) | 2020–2022, 2024–2025 masih sebagian; uji 2024–2026 sengaja tidak ditambah supaya himpunan uji sama |
| Variabel tambahan | lengas tanah 0–7/7–28 cm, tinggi lapisan batas, awan, radiasi: 448 blok (sel 0,5° × 14 hari) yang memuat 110 rb peristiwa | **CAPE dan suhu/titik embun 850/700 hPa tidak tersedia di arsip ERA5 Open-Meteo** (diperiksa: null) → indeks Haines tidak bisa dihitung |
| Elevasi/kemiringan | OpenTopoData SRTM 90 m, 24 rb titik awal (72 rb titik) | hanya analisis pendorong |
| Lahan | gambut, kawasan hutan (HK/HL/HP/HPT/HPK/APL), konsesi (sawit 1.823, HTI 306, HPH 508, tambang 852), sanksi karhutla (32 kasus), kanal OSM, jalan, desa, sungai OSM, penduduk WorldPop 0,25° | sanksi dihitung hanya bila **sudah** dijatuhkan pada tahun api |
| ENSO/IOD | ONI NOAA CPC, DMI HadISST | ONI JAS 2026 = 2,16 (El Niño kuat) |

Tidak diambil: muka air gambut BRGM SiPALAGA (situs membalas HTTP 403 tanpa login), GFW tree-cover loss (raster besar,
tidak ada di repo), AOD/asap kemarin (arsip Open-Meteo kualitas udara tidak menjangkau 2015–2021; tidak diuji).

## 2. Kapan musim 2026 mulai (`musim_awal.py` → `public/data/musim_awal.json`)

Definisi pemilik: hari pertama jumlah titik VIIRS 7 hari > 2× median (dihaluskan ±7 hari) tahun dasar, bertahan ≥ 14
hari, dicari mulai 8 Juni. Dasar = **2012–2025** (rekaman terpanjang). Dengan dasar 2015–2025 hasilnya ikut ditulis karena
ambangnya peka terhadap tahun dasar:

| Provinsi | Mulai 2026 (dasar 2012–25) | vs median | (dasar 2015–25) | Puncak 7-hari | Titik VIIRS 2026 | Kompleks besar pertama |
| --- | --- | --- | --- | --- | --- | --- |
| Papua Selatan | 9 Jun | 68 hari lebih awal | 9 Jun (45 hr) | 12 Okt | 60.525 | Merauke, 21 Jul (984 ha) |
| Kalimantan Selatan | 18 Jun | 29 hr lebih awal | 18 Jun | 17 Sep | 19.832 | Tapin, 14 Agu |
| Kalimantan Timur | 21 Jun | 32 hr lebih awal | 20 Jun | 27 Sep | 24.523 | Kutai Kartanegara, 16 Agu |
| Kalimantan Tengah | 26 Jun | 12 hr lebih awal | 24 Jun | 25 Sep | 129.500 | Pulang Pisau, 20 Jul |
| Kalimantan Barat | 20 Jul | 27 hr lebih lambat | 25 Jun | 3 Sep | 74.301 | Kayong Utara, 22 Jul |
| Sumatera Selatan | 6 Agu | 34 hr lebih lambat | 30 Jun | 11 Okt | 40.302 | OKI, 20 Agu (3.966 ha) |
| Jambi | 8 Agu | 50 hr lebih lambat | 8 Agu | 11 Okt | 5.751 | Sarolangun, 21 Agu |
| Riau | 22 Agu | 38 hr lebih lambat | 12 Agu | 28 Agu | 5.762 | Pelalawan, 15 Agu |
| NTT | belum memenuhi | – | – | 23 Agu | 9.582 | – |

Bacaan: musim 2026 dibuka dari **timur** (Papua Selatan, lalu Kalimantan Selatan/Timur/Tengah) pada pertengahan–akhir
Juni, Sumatra menyusul Agustus. Kalbar dan Sumsel "lebih awal" atau "lebih lambat" bergantung tahun dasar (2014 adalah
tahun besar di Kalbar/Riau dan menaikkan median); tanggal mulainya sendiri (Jun–Agu) stabil. 53% titik VIIRS 2026 jatuh di
sel 375 m yang pernah terbakar 2012–2025 (27% di sel yang terbakar ≥ 2 tahun).

## 3. Tren 25 tahun (MODIS 2002–2025, `public/data/tren_karhutla.json`)

- Nasional: −7,8%/tahun (Theil–Sen, Mann–Kendall p = 0,003). Hati-hati: orbit Terra/Aqua bergeser sejak ±2020 sehingga
  sebagian penurunan adalah artefak satelit; VIIRS 2015–2025 menunjukkan arah yang sama.
- Tahun terbesar: 2015 (144.846 titik), 2006, 2002, 2014, 2004. 2026 sampai 12 Okt: 102.462 (hanya 4 tahun sejak 2002 lebih
  banyak). Tahun El Niño (ONI SON ≥ 0,5): 2002, 2004, 2006, 2009, 2014, 2015, 2018, 2019, 2023.
- Rasio median titik El Niño ÷ tahun biasa: Kalteng 14,3×, Kalsel 11,9×, Sumsel 6,3×, Jambi 4,4×, Papua Sel. 3,9×,
  Kaltim 3,1×, Kalbar 3,0×, Riau 1,9×, NTT 1,8×.
- Tren per provinsi (%/th, * p < 0,05): Kalteng −13,4*, Jambi −11,1*, Riau −10,8*, Sumsel −10,2*, Kalsel −9,3*,
  Kaltim −5,7*, Kalbar −5,5*, Papua Sel. −5,3, NTT −3,1.
- Pergeseran awal musim (MODIS, hari/dekade): mayoritas **lebih lambat** +10 s.d. +19 (Kaltim +18,4*, p = 0,04; lainnya
  tidak signifikan); akhir musim tidak bergeser bermakna. 2026 menyimpang: mulai lebih awal di timur.
- Gambut menentukan tahun besar: porsi titik VIIRS di gambut 50–55% di 2014/2015/2019, 35% di 2023, 48% di 2026, vs
  10–23% di tahun biasa.
- Keberulangan: 40 sel 0,1° terbakar ≥ 3 titik pada hampir semua 24 tahun, mis. Mempawah & Kubu Raya (Kalbar), Pelalawan
  (Riau), Alor, Sumba Timur, Kupang (NTT), Merauke. Kabupaten dengan peristiwa ≥ 1.000 ha terbanyak 2015–2026: Ogan
  Komering Ilir (100), Pulang Pisau (92), Ketapang (49), Kotawaringin Timur (42), Merauke (36).

## 4. Dataset peristiwa (`lacak.py`)

Dua deteksi dihubungkan bila ≤ 750 m **dan** ≤ 24 jam (diuji: tidak ada sambungan > 24 jam; terpanjang 1.423 menit).
2015–2026: **1.153.289 peristiwa** dari 2,92 jt deteksi (68% satu sel; 557 peristiwa ≥ 100 sel = 1.400 ha). 2012–2026:
1.613.565. Per peristiwa: titik & waktu awal, deteksi per lintasan, sel baru per hari kebakaran (06–06 lokal), arah,
jarak dan laju harian. 9 provinsi, Jul–Nov, dengan cuaca: 385 rb peristiwa.

Sampel latih: tiap jangkar (lintasan) → sel calon dalam 5 sel (1,9 km; menampung 97% sel baru), target = sel baru 24 jam.
747.674 baris berbobot (latih 2015–2022: 474 rb; validasi 2023: 79 rb; uji 2024–2026: 194 rb). 44 kolom: 40 fitur peramban
+ 4 riset (bekas terbakar 1–3 th, tahun lalu, tahun sejak terbakar, jarak sungai).

## 5. Pendorong (`pendorong.py`)

### (a) Kapan titik api membesar ("lolos" = ≥ 10 sel ≈ 140 ha dalam 72 jam)

370.112 titik api baru (9 provinsi, Jul–Nov, berkas cuaca); 11.622 lolos (3,1%). Model: logistik AUC uji (2023–26) 0,889;
boosting 0,896. Urutan kepentingan boosting (penurunan AUC bila diacak): sel di lintasan pertama 0,113 ≫ malam 0,028 >
FRP awal 0,010 > riwayat terbakar MODIS 0,009 > hujan 24 jam 0,007 > angin 0,006 = gambut 0,006 > kanal 0,004 = jarak jalan
0,004 > FFMC > suhu > jarak desa > VPD > FWI > kepadatan penduduk.

**Lahan & konsesi (tabel polos; rasio peluang lolos, selang 95%)** — data Jul–Nov dengan cuaca (dan rekaman panjang
2012–2026 semua bulan, tanpa cuaca, 930 rb titik):

| Perbandingan | Peluang lolos | Rasio (Jul–Nov) | Rasio 2012–26 | Luas baru/hari | Geser pusat/hari |
| --- | --- | --- | --- | --- | --- |
| Sawit di gambut vs di luar konsesi (semua lahan) | 5,4% vs 3,2% | **1,71× (1,61–1,82)** | 1,93× (1,84–2,01) | 66 vs 67 ha (0,98×) | 0,58 vs 0,59 km |
| Sawit di gambut vs gambut di luar konsesi | 5,4% vs 5,0% | 1,09× (1,03–1,15) | 1,06× | 0,89× | sama |
| Sawit di mineral vs mineral di luar konsesi | 1,4% vs 1,2% | 1,17× (1,06–1,30) | 1,08× (0,99–1,19) | 1,10× | sama |
| HTI (kayu pulp) vs luar konsesi | 3,4% vs 3,2% | 1,05× (0,99–1,11) | 1,10× | 1,06× | 0,62 vs 0,59 |
| HTI di gambut vs gambut luar konsesi | 5,7% vs 5,0% | 1,14× (1,07–1,22) | 1,19× | 1,12× | |
| HPH (penebangan) vs luar konsesi | 2,5% vs 3,2% | 0,79× (0,72–0,85) | 0,65× | 0,82× | |
| Izin tambang vs luar konsesi | 1,8% vs 3,2% | 0,57× (0,41–0,77) | 0,34× | 0,44× | 0,43 vs 0,59 |
| **Pemegang konsesi yang sudah disanksi vs konsesi lain** | 7,6% vs 3,0% | **2,57× (2,14–2,97)** | 3,71× (3,16–4,32) | 1,32× (1,19–1,45) | 0,75 vs 0,59 |
| **Gambut vs tanah mineral** | 5,1% vs 1,4% | **3,60× (3,45–3,75)** | 4,66× (4,51–4,82) | 1,60× (1,55–1,65) | sama |
| Kawasan lindung/konservasi vs APL | 4,5% vs 2,2% | 2,05× (1,97–2,17) | 2,34× | 1,45× | 0,64 vs 0,57 |
| Hutan produksi vs APL | 3,7% vs 2,2% | 1,70× (1,64–1,77) | 1,97× | 1,23× | |
| Terbakar tahun lalu (375 m) vs tidak | 1,5% vs 3,4% | 0,45× (0,42–0,49) | – | – | |

Bacaan: "sawit di gambut" tampak 1,7–1,9× lebih berbahaya dibanding rata-rata di luar konsesi, tetapi **hampir seluruhnya
karena gambutnya**: dibanding gambut di luar konsesi bedanya hanya 1,06–1,09×. Yang menonjol justru konsesi milik
pemegang yang sudah pernah disanksi (2,6–3,7×) dan kawasan lindung/konservasi (2×, gambut terdegradasi di taman nasional).
Bekas terbakar tahun lalu lebih jarang lolos (bahan bakar sudah habis).

**Cuaca & api (peluang lolos per kelas, rasio terhadap kelas acuan):** DC 100–200 / 200–300 vs < 100: 2,5× / 2,7×;
VPD ≥ 3,5 kPa vs < 1,5: 3,5×; RH min ≥ 60% vs < 40%: 0,41×; hujan 24 jam 5–20 mm / ≥ 20 mm vs 0: 0,33× / 0,13×;
FWI ≥ 14 vs < 2: 1,7×; angin 10–15 km/jam vs < 10: 1,6× (≥ 20: 0,97×, sampel kecil); hari tanpa hujan: datar (0,95–1,14×);
lengas tanah 0–7 cm 0,30–0,40 / 0,40–0,50 vs < 0,30: 0,49× / 0,19× (sampel 102 rb); lapisan batas ≥ 2 km vs < 1 km:
0,76×; awan ≥ 75% vs < 25%: 0,82×; lereng ≥ 8% vs < 1%: 0,17× dan elevasi ≥ 300 m vs < 20 m: 0,13× (gambut datar).
Api: ≥ 5 sel di lintasan pertama vs 1: 41× (ukuran awal); pertama terlihat malam: 3,4×; FRP awal ≥ 50 MW vs < 5: 3,8×.
Akses: jarak jalan ≥ 10 km vs < 1 km: 3,1×; desa ≥ 6 km vs < 1 km: 3,0×; sungai ≥ 6 km vs < 1 km: 2,3×;
kanal ≥ 3 km/sel 2 km vs tanpa kanal: 2,8×; penduduk < 10 jiwa/km² paling tinggi. ENSO: El Niño ≥ 1 vs La Niña 9×
(La Niña hanya 10 rb titik).

Regresi logistik (2015–2022, rasio odds per 1 SD, selang Wald): sel awal 4,09 (3,88–4,31), hujan 24 j 0,56 (0,48–0,65),
malam 1,53 (1,45–1,61), FWI 0,65 (0,57–0,75; berkorelasi dengan BUI/DC), gambut 1,45 (1,33–1,57), angin maks 1,22
(1,03–1,46), DMI 1,19 (1,09–1,31), bekas 1–3 th 0,84 (0,74–0,96), riwayat MODIS 0,87 (0,81–0,93), jarak desa 1,12
(1,06–1,18), HTI 1,10 (1,03–1,18), FRP 1,10 (1,06–1,14).

### (b) Ke mana dan seberapa jauh (68.482 hari-menjalar)

- **Arah angin hanya sedikit menjelaskan arah pergeseran harian**: pada 24.245 hari dengan pergeseran pusat ≥ 750 m,
  30,3% jatuh dalam ±45° arah angin bertiup (acak = 25%), median selisih 80°. Kasus paling "bersih" (geser ≥ 2 km, angin
  ≥ 10 km/jam, n = 1.403): 40% dalam ±45°, 61% dalam ±90°. Pada piksel 375 m dan langkah 24 jam, api gambut tumbuh dari
  tepi ke tepi, bukan satu kepala api.
- Luas baru per hari (rata-rata): angin < 5 km/jam 44 ha, 5–10: 66 ha (1,5×), 10–15: 71 ha (1,6×), 15–20: 70 ha;
  gambut 74 vs mineral 46 ha (1,6×); RH min ≥ 60% 49 vs < 40% 75 ha (0,65×); kanal ≥ 1 km 78 vs tanpa kanal 58 ha (1,34×).
- OLS log(ha baru/hari) per 1 SD: angin ×1,054 (1,045–1,062), RH ×0,911, gambut ×1,115, FFMC ×0,969, hari kering ×0,966.
  Efeknya kecil per hari; yang membedakan api besar adalah lamanya menyala (median peristiwa terbesar 2026 bertambah
  luas selama puluhan hari).

## 6. Model penjalaran

### Model yang dibandingkan
1. **Persistensi** (tidak tumbuh).
2. **Sim situs** (port Python setia dari `tabelLaju` + `sebar`, FBP Kanada di mesin waktu-tempuh-minimum) tanpa kalibrasi,
   dan dengan `kalibrasi()` asli (hanya bisa bila riwayat ≥ 2 hari dan ≥ 100 ha).
3. **Sim hibrida**: parameter FBP dikalibrasi pada titik awal latih (k_angin 0,5, m_gambut 4, m 0,03).
4. Model negara lain di mesin yang sama (Huygens/MTT seperti FlamMap/FARSITE), satu pengali laju dikalibrasi di latih:
   **Rothermel/BehavePlus** (AS; Scott & Burgan GR4/GR3/GR2/SH5/TL6/TU1; m 0,1), **McArthur Mk5** GFDI/FFDI
   (Australia; m 0,3), **CSIRO padang rumput + Vesta** (Australia; m 0,1), **elips angin saja** (m 0,3). Versi tanpa
   kalibrasi juga diuji di pustaka kasus. CNN "Next Day Wildfire Spread" tidak layak tanpa numpy/GPU; regresi logistik sel
   (pembanding statistik terdekat) dan boosting dipakai sebagai gantinya.
5. **Regresi logistik sel** dan **gradient boosting sel** (150 pohon, kedalaman 4, dipilih di validasi dari kisi 3/4/5 ×
   50–200 pohon). Satu langkah = 24 jam; 72 jam = 3 langkah. Peta deterministik (p ≥ τ = 0,08) dan Monte Carlo (20–60
   jalan) untuk peluang, sebaran luas, dan peluang lolos (dikalibrasi Platt di validasi).

### Penyetelan di validasi 2023 saja
- Kisi boosting: logloss validasi terbaik 0,02487 (kedalaman 4, 150 pohon); logistik 0,02586.
- Ablasi (boosting kecil, 150 rb baris; Δlogloss validasi bila dibuang, + = memburuk): kelompok keadaan api +0,00070,
  umur +0,00050, jarak +0,00036, malam +0,00035, jarak jalan +0,00024, gambut +0,00021, riwayat MODIS +0,00021, kelompok
  akses manusia +0,00021, log sel baru +0,00020, jarak desa +0,00020, VPD +0,00019, kanal +0,00017, hujan 24 j +0,00016,
  kelompok kekeringan/FWI +0,00015, **kelompok konsesi +0,00014**, kawasan hutan +0,00007; **sawit, tambang, sanksi
  sendiri-sendiri 0** (terwakili kelompoknya), ENSO/IOD +0,00003, **kelompok angin −0,00006 (membuang angin sedikit
  MEMPERBAIKI validasi)**. Fitur riset: bekas terbakar 1–3 th 0, tahun lalu 0, tahun sejak terbakar −0,00001, sungai
  +0,00013 (tidak tersedia di peramban). Pemangkasan (buang kelompok angin, hujan 72 j, suhu, aktif24) diuji dengan model
  penuh: logloss 0,02494 vs 0,02487 → **dibatalkan**, semua 40 fitur dipakai.
- Kurva belajar (logloss validasi): latih 2021–22 saja 0,0419 (AUC 0,50, terlalu sedikit api), 2019–22 0,0253,
  2017–22 0,0251, 2016–22 (tanpa 2015) 0,0253, 2015–22 **0,0249**. Data lebih panjang membantu; 2015 (El Niño besar)
  paling bernilai. 2012–2014 belum punya cuaca (kuota) sehingga belum masuk model sel; dipakai di musim & lahan.
- Analisis kesalahan (lihat §8) → **kalibrasi ulang per strata** (pergeseran logit gambut −0,5, mineral −0,25, sabana 0)
  yang membuat bias log-luas 72 jam Monte Carlo di validasi ≈ 0 (sebelumnya +0,30 gambut, +0,10 mineral). Ambang peta
  ikut digeser sehingga peta deterministik tidak berubah.
- Pemilihan per strata di validasi: gambut → boosting, mineral → boosting, sabana (NTT/Papua mineral) → McArthur.

### Uji 2024–2026 (dibuka sekali; 604 titik awal: deteksi pertama + satu jangkar tengah, 2024 n = 57, 2025 n = 51, 2026 n = 496)

| Model | F1 mikro sel baru 24 j | IoU 24 j (95%) | F1 mikro 72 j | IoU 72 j | \|log luas\| 72 j | Bias log luas 72 j | AUC lolos | Salah arah 24 j |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Persistensi | 0 | 0,798 (0,777–0,821) | 0 | 0,766 | 0,65 | −0,65 | – | – |
| **Boosting (data)** | **0,136** | 0,648 (0,626–0,672) | **0,125** | 0,593 (0,566–0,621) | **0,98** (0,90–1,06) | +0,37 | 0,70 (kalibrasi Brier 0,062 vs iklim 0,077) | 81° (70–92) |
| Logistik sel | 0,134 | 0,638 | 0,091 | 0,502 | 1,40 | +0,88 | **0,76** | 71° (60–81) |
| Sim situs (FBP, tanpa kalibrasi) | 0,011 | 0,267 | 0,004 | 0,159 | 4,59 | +4,43 | 0,66 | 82° |
| Sim + kalibrasi kompleks (n = 23) | 0,183 | 0,699 | 0,117 | 0,383 | 2,07 | +2,07 | – | 53° (32–76) |
| Sim hibrida (FBP terkalibrasi) | 0,104 | 0,702 | 0,116 | 0,513 | 1,30 | +0,80 | 0,72 | 81° |
| Rothermel terkalibrasi | 0,066 | 0,717 | 0,077 | 0,576 | 1,09 | +0,29 | 0,61 | 76° |
| McArthur terkalibrasi | 0,073 | 0,536 | 0,049 | 0,285 | 2,17 | +1,99 | 0,68 | 79° |
| CSIRO + Vesta terkalibrasi | 0,062 | 0,495 | 0,032 | 0,291 | 2,34 | +2,11 | 0,67 | 81° |
| Elips angin saja | 0,062 | 0,682 | 0,098 | 0,253 | 1,79 | +1,71 | 0,70 | 77° |
| Gabungan per strata | 0,120 | 0,608 | 0,082 | 0,520 | 1,26 | +0,72 | – | – |
| Arah = bawah angin | | | | | | | | 87° (79–96) |
| Arah = arah kemarin (n kecil) | | | | | | | | 58° (34–86) |

- Pada titik api yang benar-benar tumbuh: F1 mikro boosting 0,191, logistik 0,191, hibrida 0,137, Rothermel 0,087.
- Per strata (F1 mikro 24 j): gambut boosting 0,157 (terbaik; hibrida 0,126, McArthur 0,096, Rothermel 0,082);
  mineral logistik 0,120 > boosting 0,087 > elips 0,070; sabana boosting 0,054 > Rothermel 0,039 > McArthur 0,028.
  **Pilihan McArthur untuk sabana dari validasi tidak bertahan di uji**, jadi "gabungan" lebih buruk dari boosting saja;
  model peramban tetap boosting di semua strata.
- Keandalan peluang sel hari-1 (boosting): AUC 0,896; peluang 0,13 → 11% terbakar, 0,24 → 21%, 0,36 → 29% (sedikit
  melebihkan di peluang tinggi).
- Peluang lolos (deteksi pertama, n = 500, 42 lolos): AUC 0,70, presisi 0,24, recall 0,60. Rentang luas P10–P90 memuat yang
  teramati 76% (24 j), 72% (48 j), 70% (72 j); ideal 80%.
- **IoU kumulatif lebih tinggi untuk persistensi** karena sel awal mendominasi; ramalan pertumbuhan apa pun menambah
  salah-positif. F1 sel baru adalah ukuran yang adil untuk "ke mana menyebar".
- **Arah tidak bisa diramal** dengan data ini: semua model 71–87° salah (acak = 90°); selisih berpasangan boosting vs
  bawah-angin +1° (−12 s.d. +14).

## 7. Pustaka uji-balik: 123 kejadian lalu (`kasus.py` → `public/data/sebaran_kasus.json`)

Tanpa bocoran: mulai dari **deteksi pertama** saja, cuaca reanalisis hari itu, model yang tidak pernah melihat tahun kasus
(lipatan {2015}, {2016–18}, {2019}, {2020–22}; kasus 2023–2026 memakai model 2015–2022). 128 dipilih, 123 dapat dihitung:
12 tahun (7–13 kasus/tahun), 9 provinsi (NTT 34, Kalbar 21, Kalteng 18, Sumsel 12, Kalsel 10, Riau 9, Papua Sel. 8,
Kaltim 6, Jambi 5), 60 di gambut; 32 besar (≥ 1.000 ha), 47 sedang, 44 tetap kecil. 58 kasus lolos (diperkaya; dasar
alami 3%).

| Model | F1 rata-rata 24 j (95%) | IoU 72 j | Salah arah | \|log luas\| 72 j |
| --- | --- | --- | --- | --- |
| Boosting (data) | 0,44 (0,35–0,51) | 0,55 (0,48–0,61) | 78° (59–96, n 36) | 0,84 (0,67–1,04) |
| Sim hibrida | 0,49 (0,41–0,57) | 0,52 (0,46–0,58) | 45° (31–61) | 0,77 (0,64–0,90) |
| Rothermel terkalibrasi | 0,44 (0,36–0,53) | 0,52 (0,45–0,59) | 37° (23–50) | 0,99 |
| Elips angin | 0,36 | 0,29 | 69° | 1,11 |
| CSIRO+Vesta / McArthur terkalibrasi | 0,26 / 0,25 | 0,29 / 0,27 | 64° / 61° | 1,48 / 1,45 |
| Rothermel / McArthur / CSIRO / elips TANPA kalibrasi | 0,26 / 0,13 / 0,05 / 0,12 | 0,29 / 0,13 / 0,04 / 0,12 | | 2,3 / 3,1 / 5,4 / 2,6 |
| Sim situs tanpa kalibrasi | 0,20 | 0,18 | 63° | 3,50 |
| Persistensi | – | IoU 24 j 0,67 | – | – |

F1 rata-rata memberi nilai 1 bila model dan satelit sama-sama "tidak tumbuh", sehingga model yang jarang meramal tumbuh
(hibrida, Rothermel) diuntungkan di 44 kasus kecil; arah per model dihitung pada kasus yang berbeda-beda (hanya bila
model meramal tumbuh). Per kelas (boosting): tetap kecil F1 0,95 dan **benar 100%**; sedang F1 0,10, benar 53%;
**besar F1 0,22, IoU 72 j 0,22, "akan lolos" benar hanya 34%**. Peluang lolos (kalibrasi) di 123 kasus: AUC 0,72;
ambang 0,5 → 18 dari 58 lolos tertangkap, 3 alarm palsu (akurasi 65%); ambang 0,2 → 28 tertangkap, 8 palsu (69%);
ambang 0,1 → 34 tertangkap (59%), 10 palsu. Rentang P10–P90 memuat luas teramati hanya 52% (24 j) dan 42% (72 j):
**sebaran Monte Carlo terlalu sempit untuk api yang baru muncul.** Per strata F1 24 j: gambut 0,27, mineral 0,54,
sabana 0,63 (banyak kasus kecil).

## 8. Analisis kesalahan (`galat.py` → `public/data/sebaran_galat.json`)

Validasi 2023 (530 titik awal, sebelum perbaikan): ramalan luas 72 j (median MC) **terlalu besar rata-rata +23%**
(bias log +0,21), paling besar di gambut (+0,30), Papua Selatan (+0,45), Kaltim (+0,55), jauh dari jalan ≥ 10 km (+0,51)
dan saat api awal 3–6 / ≥ 6 sel (+0,45). Terlalu kecil bila satelit kehilangan ≥ 2 lintasan (3,6% titik; bias −1,04,
separuhnya lolos) atau api "meloncat" > 1,9 km (0,9%; bias −1,85). Hujan ≥ 5 mm: F1 0 (model tetap meramal tumbuh).
NTT: F1 0.
15 terburuk: 3 karena loncatan/titik baru menyatu, 3 karena awan/asap (lintasan kosong; 2 kasus keduanya), 5 tumbuh jauh lebih besar
tanpa tanda di data (kemungkinan bahan bakar/variabel tak terlihat), 6 diramal tumbuh padahal padam (pemadaman tidak ada
di data).

Perbaikan yang diterapkan: kalibrasi ulang per strata (di atas). Uji 2024–2026 sesudahnya: bias log-luas MC **−0,02**
(gambut −0,06, mineral +0,01); pola sisa sama: lintasan kosong ≥ 2 → −1,62; Kaltim −0,29; Papua Sel. +0,24; jauh dari
jalan ≥ 10 km +0,69; 33 kasus lolos terlewat (24 di gambut) pada ambang 0,5, alarm palsu 1. Perbaikan yang dicoba dan ditolak: pemangkasan fitur
(lebih buruk), McArthur untuk sabana (lebih baik di validasi, lebih buruk di uji). Belum bisa diperbaiki dengan data ini:
pemadaman (tak ada data operasi), awan/asap (butuh Himawari), titik api baru yang dinyalakan di dekatnya.

## 9. Batas yang jujur

1. VIIRS S-NPP saja untuk peristiwa & model sel: 2 lintasan/hari, jadi "per jam" di peramban adalah pembagian luas harian
   menurut ISI per jam, bukan pengamatan. NOAA-20 hanya masuk model "akan membesar" (§12) dan tidak menambah skill pada
   deteksi pertama: lintasannya ± 50 menit dari S-NPP, jadi tidak memberi pandangan kedua yang lebih awal.
2. Titik panas ≠ perimeter: piksel 375 m melebihkan api kecil, awan/asap menyembunyikan api besar.
3. Uji memakai ERA5 (seolah prakiraan sempurna); prakiraan sungguhan menurunkan skill.
4. Cuaca untuk 90% peristiwa tumbuh (kuota); 2020–22 dan 2024–25 kurang terwakili. Model sel (§6) masih dilatih dengan
   cakupan lama 81%; model "akan membesar" (§12) memakai cakupan 90%.
5. 2015 (El Niño) mendominasi data latih; 2024 (tahun kecil) F1 0 di uji (n = 57).
6. Kemiringan dan lengas tanah hanya di analisis pendorong (sampel), bukan di model sel.

## 10. Per jam sungguhan

Lihat SEBARAN_MODEL.md §5b: Himawari-9 WLF (JAXA P-Tree, 10 menit) sudah terpasang (`scripts/data/himawari.py`, `himawari.yml`, jendela 3 jam), belum diarsip,
jadi belum ada riwayat untuk melatih model per jam. §5a: pergantian VIIRS S-NPP -> NOAA-21 pada 1 Nov 2026 (`sensor.py`); pergeseran distribusinya belum diukur.

## 11. Berkas

`scripts/sebaran/`: umum.py, lacak.py, musim_awal.py, cuaca.py, fitur.py, gbdt.py (+ kendala monoton & fokal), simfisika.py,
latih.py, latih_jalan.py, kasus.py, pendorong.py, galat.py, lolos.py, prospektif.py, cerita_data.py, uji_js.py,
splice_sebaran.py, SEBARAN_MODEL.md. Angka §12: `data/raw/sebaran/lolos_cv.json`, `lolos_hasil.json`.
Semua punya `uji` (invarian) kecuali latih_jalan.py (tahap berat; diuji lewat `SEBARAN_CEPAT=1`).
`public/`: sebaran_model.js, cerita_karhutla.js/.css, insight_sebaran.js, sim_data.js; data: model_sebaran.json (+ lolos, lolos_ulang, selang), prospektif.json,
musim_awal.json, tren_karhutla.json, sebaran_cerita.json, sebaran_kasus.json, sebaran_pendorong.json, sebaran_galat.json.
Kesetaraan Python ↔ JS: `uji_js.py` → selisih peluang maks 1,5e-16 pada 850 sel dari 6 titik awal nyata; peluang membesar
(awal & ulang) 1,9e-16, fitur membesar sama < 1e-6.

## 12. Model khusus "akan membesar" (`lolos.py`, 14 Okt 2026)

Masalah: peluang lolos lama = porsi run Monte Carlo model sel yang mencapai 10 sel. Uji 2024–2026 AUC 0,70; di 123 kasus
pada ambang 50% hanya 18 dari 58 api yang membesar tertangkap (31%; kelas "besar" benar 34%). Penggantinya satu
pengklasifikasi GBDT per titik api baru (438.217 titik api baru 9 provinsi Jul–Nov dengan cuaca, 12.436 lolos = 2,8%).
Semua positif + 5% negatif (bobot 20) per lipatan (mesin 8 GB, stdlib). Penyetelan HANYA dengan validasi silang
tinggal-satu-tahun 2015–2023 (9 lipatan; El Niño 2015, 2019, 2023 masing-masing pernah jadi tahun uji).

**Ablasi (luar-lipatan 2015–2023, n 340.468, 9.514 lolos; ambang = recall 70%):**

| Konfigurasi | AUC | AP (acak 0,028) | Presisi @ recall 70% | Alarm palsu per api kecil |
| --- | --- | --- | --- | --- |
| A: cuaca + lahan + ukuran & FRP awal (setara pendorong.py) | 0,902 | 0,469 | 17,9% | 9,2% |
| **B: A + konteks titik sekitar** (titik S-NPP 5/10 km 3 hari, jarak titik aktif 24 j, hari aktif 7 hari) | **0,909** | **0,484** | 19,1% | 8,5% |
| C: B + NOAA-20 ±3 jam di 750 m | 0,909 | 0,479 | 19,3% | 8,4% |
| D: C + bobot kelas lolos 5× | 0,909 | 0,478 | 19,2% | 8,5% |
| E: C + kendala monoton (lebih kering/lebih besar → tidak turun) | 0,910 | 0,483 | 19,4% | 8,3% |
| F: C + bobot fokal γ = 2 | 0,905 | 0,418 | 18,5% | 8,8% |
| **U: C + ramal ulang 14 jam** (sel S-NPP s.d. lintasan berikutnya, terlihat lagi?, FRP, sel N20) | **0,952** | **0,676** | **43,6%** | **2,6%** |

Bacaan: yang berarti hanya (1) konteks titik sekitar (+0,007 AUC, alarm palsu −8%) dan (2) menunggu satu lintasan
(ramal ulang). NOAA-20 pada deteksi pertama, bobot kelas, monoton, dan fokal tidak menambah (selisih di bawah derau
antar-lipatan); bobot kelas & fokal hanya menggeser peluang, dan ambang sudah memilih titik operasi. Monoton setara
(dipertahankan sebagai opsi; tidak dipakai karena aturan pilih = AP tertinggi). Kisi: kedalaman 5 / 150 pohon / lr 0,06
(AP 0,486) > 4/150 (0,484) > 3/300 (0,479). Terpilih B (38 fitur) dan U (B + 4 fitur ulang + NOAA-20).

**Ambang WASPADA** (dipilih di luar-lipatan, peluang terkalibrasi Platt): 4,84% = recall 70%, presisi 19%, 10 dari tiap
100 titik baru ditandai. Ambang biaya (anggapan: api besar terlewat 10× lebih mahal dari alarm palsu, p ≥ 1/11):
recall 58%, presisi 30%. Ramal ulang: ambang 10,1%. Per tahun (luar-lipatan) recall 45–74% (tahun sepi seperti 2020/2022
lebih rendah, n lolos kecil); per lahan recall gambut 76%, mineral 52%, sabana 47% (ambang tunggal; lahan mineral/sabana
jarang lolos sehingga ambang global tidak menjangkaunya).

**Sebelum → sesudah** (uji 2024–2026 = LIHAT KEDUA, sedikit optimistis; kasus 2015–2023 memakai prediksi luar-lipatan):

| Himpunan | Model | AUC | Api besar tertangkap | Tanda yang benar | Alarm palsu per api kecil |
| --- | --- | --- | --- | --- | --- |
| 500 deteksi pertama uji (42 lolos) | lama, MC ≥ 50% | 0,70 | 21% | 90% | 0,2% |
| 〃 | lama, MC ≥ 20% | 0,70 | 31% | 43% | 3,7% |
| 〃 | **baru** | **0,81** | **64%** | 22% | 20,5% |
| 〃 | baru, ramal ulang 14 j | 0,84 | 62% | 32% | 12,0% |
| Semua titik baru uji (97.749; 2.922 lolos) | baru | 0,908 | 67% | 22% | 7,5% |
| 〃 | baru, ramal ulang 14 j | 0,955 | 76% | 37% | 4,0% |
| 123 kasus (58 lolos) | lama, MC ≥ 50% | 0,72 | 31% | 86% | 4,6% |
| 〃 | **baru** | **0,83** | **64%** | 76% | 18,5% |
| 〃 | baru, ramal ulang 14 j | 0,90 | 72% | 79% | 16,9% |

Kelas "besar" (≥ 1.000 ha) di 123 kasus: benar 34% → 72% (ramal ulang 75%); "sedang" 53% → 49% (ulang 60%); "tetap kecil"
100% → 100%. Akurasi seluruhnya 65% → 73%. Uji per lahan (semua titik baru): gambut AUC 0,88, recall 73%, presisi 22%,
alarm palsu 14%; mineral 0,92 / 52% / 21% / 2,9%; sabana 0,92 / 57% / 24% / 2,8%. Per tahun uji: 2024 recall 63%,
2025 54%, 2026 68%. Harga yang dibayar jelas: 500 titik uji yang diperkaya api ≥ 3 sel (dan 46% gambut) membuat 1 dari 5
api kecil ikut ditandai; pada populasi titik baru sebenarnya 1 dari 13. Pada ramal ulang, titik yang sudah ≥ 10 sel pada
14 jam dikeluarkan pun AUC masih 0,93 (recall 64%, presisi 24%).

**Selang luas terkalibrasi (konformal, `lolos.py selang`).** CQR di ruang log(1 + sel baru): P10/P90 Monte Carlo dilebarkan
q per lahan × tanda WASPADA × hari, dikalibrasi pada 540 titik awal deteksi pertama 2015–2023 dengan model sel yang tidak
melihat tahunnya. q = 0 untuk titik non-WASPADA (sudah ≥ 80% tercakup), gambut-WASPADA 0,41/0,69/0,69, gabungan-WASPADA
0/0,69/0,69. Cakupan 24/48/72 j: uji 2024–2026 76/72/70% → **78/75/73%** (deteksi pertama 80/76/74%; gambut 73/64/61%
→ 77/69/67%); 123 kasus 52/48/42% → 55/57/55%; kelas "besar" 3% → 22% pada 72 jam. **Belum tercapai untuk api yang benar-benar
besar**: selang 80% pada populasi memang meleset untuk ~10% teratas, dan pustaka kasus diperkaya api terbesar tiap tahun.
Cakupan pada populasi mendekati 80%; untuk api besar selang tetap terlalu sempit dan tanda WASPADA-lah yang memberi
peringatan, bukan rentangnya.

**Uji prospektif (`prospektif.py`, CI tiap 3 jam di titik.yml).** Tiap titik api baru S-NPP (6–24 jam sesudah deteksi
pertama, 9 provinsi) diramal sekali dengan cuaca PRAKIRAAN Open-Meteo dan dicatat append-only (`data/raw/sebaran/
prospektif/ramalan.jsonl`, cache Actions); ramal ulang dicatat 15–26 jam sesudahnya; dinilai 78 jam sesudah deteksi pertama
dengan FIRMS NRT (`nilai.jsonl`); ringkasan `public/data/prospektif.json` (recall, presisi, AUC, Brier, per bulan & lahan)
tampil di Insight. Gudang bergulir 12 hari (titik.json.gz) mulai dari hotspot.json 7 hari, jadi ramalan pertama ± 1 hari
sesudah jalan CI pertama dan nilai pertama ± 4 hari sesudahnya (belum ada angka saat ditulis). Hilangnya cache Actions (tak dipakai > 7 hari) = riwayat prospektif hilang.

Yang tidak dikerjakan: kedalaman gambut (poligon gambut hanya punya kode provinsi), kanal per konsesi, prakiraan hujan
sebagai fitur terpisah (hujan24 di latih = ERA5, di prospektif = prakiraan: itulah yang diuji prospektif).
