# RISET: model "kalau hujan segini, banjir atau tergenang berapa dalam, surut berapa lama" per kecamatan

Tanggal: 27 Okt 2026. Status: riset dan usulan, belum ada kode produksi. Tidak menyunting berkas lain.
Penyusun: sub-agen riset. Pemeriksa yang disarankan sebelum dibangun: `validasi-model` (wajib), `selera-angka`, `inp-reviewer`.
Tanda **[BELUM DICEK]** = belum dibuka dari sumber primer. Hasil pencarian web diringkas dari cuplikan mesin pencari, bukan dari
membaca naskah penuh, kecuali dinyatakan lain; semua angka paper harus dibuka ulang sebelum dikutip di layar.

## 0. Ringkasan satu halaman

1. Repo ini SUDAH jauh: `docs/multi-bencana/RANCANGAN-GENANGAN-JAKARTA.md` (27 Okt) sudah merancang hampir persis pertanyaan pemilik,
   panen data J1 sudah jalan (PetaBencana 27.944 laporan, GFM, ERA5/IFS per jam, DEMNAS, saluran OSM, GloFAS hulu), dan mesin
   headless `scripts/banjir/genangan/mesin.mjs` memakai `public/banjir/sim_genangan.js` (Priority-Flood, D8, SCS-CN, inersia lokal
   Bates 2010). Yang belum ada: kalibrasi, kapasitas drainase per kecamatan, koreksi bias hujan, lama surut, tabel keluaran, kartu.
2. Rekomendasi utama: JANGAN menjalankan simulasi di peramban atau Worker untuk kartu. Jalankan mesin di CI/lokal untuk kisi
   skenario (hujan x durasi x pasang x kondisi tanah) per kecamatan, tulis tabel kecil ke `public/data`, dan biarkan layar hanya
   menginterpolasi tabel (pola `sebaran_model.js`: pohon/tabel diekspor, evaluator kecil di peramban, uji kesetaraan Python-JS).
   Ini cocok dengan batas CPU Worker 10 ms (Worker tidak perlu menghitung apa pun).
3. Urutan bertingkat: **M0** kurva hujan-pemicu empiris (tanpa fisika, hanya PetaBencana x hujan jam, dengan POD/FAR jujur) ->
   **M1** model tangki per kecamatan (SCS-CN + kapasitas drainase efektif Kd + tampungan + lama surut dari resesi) stdlib murni ->
   **M2** sebaran kedalaman dalam kecamatan dari mesin D8/fill-spill yang sudah ada -> **M3** residu GBDT/kalibrasi, prospektif.
   Tiap tingkat harus mengalahkan pembanding tingkat di bawahnya di uji 2024-2025 sebelum jadi angka utama.
4. Peringatan kejujuran: uji balik aturan hujan harian kita sendiri (`validasi.json`, 2022-2025, kabupaten-hari) memberi POD 0,565
   tetapi FAR 0,964 dan ETS 0,019 pada level Waspada. Pendekatan berbasis hujan murni di skala kabupaten-hari terbukti lemah. Kecamatan
   dan jam lebih tajam, tetapi jangan berjanji lebih baik sebelum diuji. Label kebenaran terbaik (laporan PetaBencana) bias pelapor,
   dan satu studi UGM melaporkan ketepatan model kredibilitas laporan hanya 64% (Jan 2020) dan 77,2% (Feb 2020) **[BELUM DICEK naskah]**.
5. Tidak ada repo open source Jakarta yang layak dipakai sebagai model (lihat §7). Yang layak dipakai: ide dan, bila perlu,
   kode lisensi permisif (CAFlood MIT, SWMM domain publik/lisensi EPA **[BELUM DICEK]**), tetapi semuanya berat dependensi atau
   C++; untuk stack kami lebih masuk akal menulis ulang algoritma ringan (SCS-CN, tangki, resesi) di Python stdlib dan memakai ulang
   mesin JS yang sudah ada.

## 1. Yang sudah ada di repo (dibaca 27 Okt 2026)

### 1.1 `scripts/banjir/**` (pipeline harian)
| Komponen | Isi | Catatan untuk pertanyaan ini |
| --- | --- | --- |
| `status.py`, `bahaya.py`, `peringatan.py` | level Normal/Waspada/Siaga/Awas per kecamatan dari H3 (hujan 3 hari prakiraan), A7 (7 hari sebelum), kelembapan tanah, imax | aturan ambang, bukan model kedalaman |
| `uji_balik.py` | kabupaten-hari vs DIBI, POD/FAR/CSI/PSS/ETS, bootstrap blok kab x tahun, pilih 2016-2021, uji 2022-2025, terima hanya bila CI ΔETS > 0 | kerangka uji yang bisa dipakai ulang; hasil: Waspada POD 0,565, FAR 0,964, ETS 0,019 (n a=602, b=15.946, c=463, d=44.351) |
| `ambang_wilayah.py` + `RISET-AMBANG-WILAYAH.md` | ambang per kab (k, iw), protokol dikunci sebelum angka dilihat, uji dibuka sekali (`buka`, sidik sha256), `pakai=false` sampai ditinjau | pola pra-registrasi yang HARUS ditiru |
| `prospektif.py` + `PRAREG-PROSPEKTIF.md` | log append-only tiap hari, dinilai saat DIBI terbit, kriteria beku (hash), skor vs persistensi/klimatologi | prospektif untuk model baru wajib mengikuti |
| `peluang_banjir.py`, `ansambel_hujan.py` | peluang hujan >= 50/100 mm per hari dari ECMWF IFS ENS 51 anggota, agregasi MAKSIMUM per kab | masukan prakiraan; resolusi 1 derajat dan harian |
| `rob.py`, `pasut.py`, `pasang_astro.py`, `subsiden.py` | rob, pasang, penurunan tanah (`subsiden_literatur.json`) | batas laut dan koreksi DEM sudah tersedia |
| `hulu.py`, `sungai.py`, `jaga_banjir.py`, `bukti_das.py` | tinggi air pos, DAS HydroBASINS | kiriman hulu |
| `genangan/*` (J1) | `petabencana.py`, `gfm.py`, `hujan_jam.py` (ERA5-Land, IFS, IMERG belum terbaca), `gsmap.py` (butuh secret GSMAP_USER/PASS, nama berkas BELUM terverifikasi), `medan.py` (DEMNAS/GLO-30), `saluran.py` (OSM drain/canal/pompa), `gedung.py` (OSM per ubin 5 km), `debit_hulu.py` (GloFAS 8 titik), `tiff_mini.py`/`equi7.py` (GeoTIFF stdlib), `mesin.mjs` (J2, belum dikalibrasi) | basis data sudah ada |
| `public/banjir/data/genangan/` | `riwayat_kec.json` (hari/hari_ge10cm/n_laporan per kecamatan per tahun), `gfm_kec.json`, `hujan_jam.json`, `hulu.json`, `medan.json`, `saluran_kec.json` | satu-satunya data kecamatan yang sudah diterbitkan |

### 1.2 `public/banjir/sim*.js` (simulasi di layar)
`sim_genangan.js` (32 KB) murni, tanpa DOM: ubin Terrarium AWS -> Priority-Flood+eps (Barnes dkk. 2014) -> D8 -> hietograf + SCS-CN
-> inersia lokal Bates 2010 dengan pembatas fluks -> kedalaman per sel per jam + neraca massa. Semua asumsi di objek `ASUMSI` dengan
sumber (CN 80, Manning 0,06, ambang genangan 10 cm, puncak hujan 15 WIB, CEKUNGAN_MAKS 0,5 m). Berjalan di Web Worker (`sim_kerja.js`),
di halaman, dan di Node lewat `vm` (`tests/banjir/sim_genangan.test.mjs`, `genangan_swauji.test.mjs`). Ini simulasi satu lokasi yang
dipilih pengguna dengan DEM global, BUKAN per kecamatan, tidak dikalibrasi, dan tanpa kapasitas drainase (satu CN).

### 1.3 `scripts/air/neraca/**` dan `data/kajian-bnpb/neraca-air/**`
Neraca air bulanan Thornthwaite-Mather per kab/kota Jawa (119 unit) dengan routing HydroBASINS antar-kab. Skala BULANAN dan untuk
ketersediaan air, bukan peristiwa jam. Tidak bisa menjawab genangan. Yang layak dipakai ulang: `topologi.py` (sub-DAS x kab, rantai
`NEXT_DOWN`), klimatologi hujan ERA5-Land bulanan sebagai prior lengas, dan label keyakinan `estimasi-model`.

### 1.4 `docs/multi-bencana/**`
- `RANCANGAN-GENANGAN-JAKARTA.md`: pertanyaan, neraca per unit, Kd per kecamatan, badai rancangan 1-24 jam, 25-400 mm, kriteria uji §7
  (POD ≥ 0,6 dgn batas bawah CI > pembanding, ketajaman, galat kedalaman median ≤ 40 cm, Spearman ≥ 0,5), tahap J1-J8. Menunggu persetujuan
  pemilik; usulan revisi: kalibrasi 2017-2023, uji 2024-2025 (13.177 laporan).
- `PELATIHAN-MODEL.md`: kerangka latih bersama `scripts/umum/latih/` (gbdt, dataset, bagi, setel, kalibrasi, verifikasi, ekspor, prospektif) dan
  aturan: uji dibuka sekali; pembanding sederhana; kesetaraan Python-JS; prospektif sejak hari pertama; fitur non-peramban tidak dipakai model peramban.
- `MODUL-PLUG-AND-PLAY.md`, `PARITAS-BANJIR.md`, `RINCI-BANJIR.md`, `REPLAY-BANJIR.md`: parity dengan karhutla; replay bukan fokus (keputusan pemilik 27 Okt).
- Gaya karhutla (acuan kartu): `scripts/sebaran/**` (fitur 40, GBDT stdlib, Platt, CQR P10/P90, prospektif), `public/sebaran_model.js`
  (`SebaranModel.ramal()` Monte Carlo, P10/P50/P90, `kinerja_uji` ditampilkan apa adanya), uji kesetaraan `uji_js.py`.

### 1.5 Celah (urut kepentingan)
1. **Kapasitas drainase tidak diketahui.** OSM memberi panjang saluran dan 150 rumah pompa, tidak memberi dimensi/kapasitas. Kd belum ada.
2. **Hujan jam belum dikoreksi bias.** RANCANGAN sendiri menulis ERA5 meremehkan puncak konvektif kota 2-5x (angka ini dari RANCANGAN, **[BELUM DICEK]**
   terhadap literatur); IMERG tidak terbaca stdlib; GSMaP butuh login dan belum terverifikasi. Tanpa pos hujan jam (DSDA/BMKG tidak publik), faktor bias tidak punya acuan.
3. **Label tidak punya kedalaman andal dan tidak punya lama surut.** PetaBencana: ~20% tanpa kedalaman, bias pelapor, lisensi tidak tertera di API. GFM: ~75% luas DKI ter-mask, tidak dipakai di DKI.
4. **Mesin belum dikalibrasi dan belum per kecamatan.** Kriteria §7 belum disetujui, jadi belum ada vonis. Kalibrasi Kd per kecamatan pada 44 kecamatan x sedikit kejadian rawan overfit (lihat §5).
5. **Tidak ada IDF/kala ulang.** Kartu perlu bahasa "hujan setara kala ulang X tahun"; belum ada tabelnya.
6. **Tidak ada tutupan lahan/kedap air.** `gedung.py` kasar (5 km). WorldCover/GHSL belum diambil.
7. **Tidak ada lapisan keluaran dan kartu.** Belum ada tabel hujan x durasi -> kedalaman/luas/lama surut dan evaluator JS.
8. **Cakupan hanya Jakarta.** Jawa dan luar Jawa belum; label di sana hanya DIBI (tanpa kedalaman) dan GFM.
9. **DEM:** DEMNAS 2011 (DSM-hidro) dengan koreksi subsidensi; FABDEM CC BY-NC-SA bermasalah untuk situs publik (keputusan pemilik tertunda).

## 2. Perbandingan pendekatan

Kolom "stack kami": Python 3.12 stdlib di Actions, JSON ke `public/data`, Worker 10 ms, JS vanilla.

| Pendekatan | Input | Akurasi yang dilaporkan (sumber) | Biaya hitung | Cocok? |
| --- | --- | --- | --- | --- |
| **Ambang hujan empiris** (kurva hujan-pemicu dari laporan) | hujan jam/harian, label kejadian | Jakarta: tidak ada POD/FAR hujan-jam yang ditemukan. Studi lain: ambang harian 122/126 mm (Jakarta Pusat/Utara) dengan peluang pengulangan, tanpa POD/FAR (BIO Web Conf. 2025). Kita sendiri: ETS 0,019 di kab-hari | nol | Ya, M0; jadikan pembanding wajib |
| **SCS-CN** (limpasan) | CN dari tutupan+tanah, hujan | CN dikalibrasi dari kejadian aslinya bisa baik; CN tabel sering bias besar; **[BELUM DICEK]** angka ketidakpastian (Hawkins) | O(1) per langkah | Ya, M1 |
| **Rational method** | C, i, A | untuk puncak debit DAS kecil (<~ 1 km2); tidak menghasilkan volume/ kedalaman genangan | O(1) | Hanya untuk cek kapasitas saluran; bukan inti |
| **Unit hydrograph (SCS/Snyder/Nakayasu)** | hujan efektif, luas, waktu konsentrasi | Nakayasu umum di Indonesia (SNI/PUPR) **[BELUM DICEK pasal]** | konvolusi, sangat murah | Ya, untuk debit sungai/hulu dan puncak kecamatan di M1 |
| **Tangki / bucket per unit** (tampungan + Kd + resesi) | luas, tampungan, Kd, CN | tidak ada paper yang menguji "bucket Kd" sebagai skor POD/FAR yang ditemukan; pembanding terdekat: kapasitas drainase sebagai fraksi hujan tereduksi (rainfall reduction method) kalah dari jaringan saluran virtual di Spanyol (J. Hydrology, ringkasan) | O(langkah) | Ya, M1, tetapi jujur: ini model buatan kami, perlu uji |
| **Bathtub / fill-spill (FSM)** | DEM resolusi tinggi + limpasan per cekungan | Seleem dkk. 2021 (Water): FSM jauh mengungguli TWI terhadap TELEMAC-2D di dua titik Berlin; angka tidak terbaca **[BELUM DICEK]** | Priority-Flood O(n log n) | Ya, sudah ada di `sim_genangan.js` |
| **HAND** (Rennó 2008, Nobre 2011/2016) | DEM + jaringan drainase turunan | Nobre 2016: baik untuk kanal pembawa gelombang banjir, berlebih di kanal lain; Aristizabal 2024: DEM 3 m membaik di ~80% DAS, tanpa efek umum resolusi 3-20 m. Dirancang fluvial, lemah untuk genangan kota datar yang dominan hujan | O(n) | Sebagai indikator topografi cekungan saja, tidak sebagai kedalaman |
| **FastFlood** (van den Bout dkk. 2023, Environ. Model. Softw. 168) | DEM, hujan, infiltrasi | F1 0,79 luas, MAE 0,46 m, RMSE 0,76 m terhadap model fisika 10 m, 212x lebih cepat (cuplikan) | WebAssembly, cepat | Model bagus tetapi bukan Python stdlib; kode/lisensi tidak terverifikasi. Rujukan konsep (sweeping + steady-state) |
| **CADDIES/CAFlood (WCA2D)** | DEM, hujan, CN, bangunan | sudah dibandingkan dengan model komersial (InfoWorks ICM); validasi dengan saluran bawah tanah belum ada pada cuplikan; MIT (ada repo) | C++, CPU/GPU | Tidak: dependensi C++; ide automata sudah setara mesin kami |
| **LISFLOOD-FP** (Bates dkk. 2010, inersia lokal) | DEM, hujan, Manning | formulasi inersia lokal 67x lebih cepat dengan akurasi setara (Neal dkk., Tewkesbury 2007) | Fortran/C++ | Algoritma sudah ada di `sim_genangan.js`; kodenya GPL-3, jangan disalin |
| **SWMM** (EPA) | jaringan pipa lengkap | akurat bila ada data jaringan; kritik 2023: menebak kapasitas drain menyederhanakan sumber bahaya (tersumbat, surcharge) | C, pyswmm | Tidak: jaringan Jakarta tidak publik |
| **RIM2D** (GFZ) | DEM, hujan, kapasitas saluran sebagai laju | divalidasi pada debit saluran Dresden | GPU | Rujukan: kapasitas sebagai LAJU tetap (mm/jam) di sel kedap, persis konsep Kd kita |
| **ML murni** (RF, XGBoost, LightGBM Jakarta 2025; tesis GIST RF 99,9% akurasi) | fitur cuaca, label harian | akurasi 99,9% hampir pasti artefak kelas tak seimbang **[BELUM DICEK]**; jangan dikutip | murah | Hanya sebagai residu terhadap M1 dengan skor yang tak bergantung laju dasar |

Kesimpulan: tak ada metode yang "terbukti" untuk Jakarta pada skor yang kami inginkan. Yang bisa kami lakukan secara jujur adalah
(a) membangun tingkat berlapis, (b) mengukurnya dengan pembanding kuat, (c) melabel yang gagal sebagai hipotesis.

## 3. Memperkirakan kapasitas drainase tanpa data selokan

Prinsip: Kd (mm/jam hujan yang masih dibuang tanpa genangan) = prior dari standar desain + penyesuaian kerapatan/kedap, lalu
DIKALIBRASI dengan penalti ke prior. Prior tidak boleh tampil sebagai "kapasitas terukur".

1. **Prior desain:** kapasitas saluran kota biasanya didesain untuk hujan kala ulang tertentu (2 sampai 10 tahun, tergantung kelas saluran).
   Kala ulang yang dipakai DKI Jakarta **[BELUM DICEK: Pergub/Perda drainase DKI, PUPR Permen PU 12/2014 tentang sistem drainase perkotaan]**. Kd prior = intensitas IDF
   kala ulang desain pada durasi waktu konsentrasi (1-3 jam) x faktor realisasi (sedimentasi, sampah, pasang) yang kami kalibrasi sebagai parameter global, bukan per kejadian.
2. **IDF Indonesia:**
   - ITB: IDF dari GSMaP, grid 1 derajat per jam, durasi 1-24 jam, kala ulang 10/25/50/100 tahun, `idf.meteo.itb.ac.id` (halaman proyek ITB; unduhan dan lisensi **[BELUM DICEK]**). Kelemahan: GSMaP v8 vs pos hujan Maritime Continent korelasi jam hanya 0,14-0,29 dan cenderung berlebih (Remote Sensing 15(4):1115, 2023); kala ulang 2 dan 5 tahun tidak ada, padahal itu yang relevan untuk saluran.
   - Jakarta harian: analisis frekuensi regional 11 pos, 15-22 tahun, kala ulang 2-300 tahun dengan CI 90% (Natural Hazards 75, 2015, hlm. 1075-1104), harian bukan jam.
   - Pola waktu hujan Jakarta/Bogor jam (Kemayoran, Citeko): kejadian didominasi ≤ 4 jam, volume terbesar di awal; pola Mononobe/ABM berbeda dari pengamatan (Jurnal Teknik Sipil 2021). Pakai pola teramati, bukan Mononobe, untuk hietograf.
   - Alternatif kami sendiri: ERA5-Land jam 1940- (Open-Meteo) dengan Gumbel/GEV maksimum tahunan per durasi di kisi 0,1 derajat. Murah dan sudah ada, tetapi meremehkan puncak konvektif; koreksi dengan rasio ke IMERG/GSMaP/pos bila ada, dan nyatakan sebagai hipotesis.
3. **Kedap air:** ESA WorldCover (10 m, built-up, CC BY 4.0 **[BELUM DICEK versi]**), GHSL built-up (CC BY 4.0 **[BELUM DICEK]**), gedung OSM/Overture (Overture butuh pyarrow/duckdb, tidak ada; `gedung.py` kasar). Pembacaan GeoTIFF stdlib sudah ada (`tiff_mini.py`). CN = kombinasi fraksi kedap (CN 98) dan sisa (CN dari lahan+tanah).
4. **Proksi kerapatan drainase:** panjang jalan per km2 (OSM highway), panjang saluran OSM per km2 (`saluran_kec.json`, tidak lengkap), jumlah rumah pompa per kecamatan (150 di DKI). Dipakai sebagai kovariat PRIOR Kd, bukan pengganti kalibrasi. Rumah pompa: kapasitas resmi tidak publik (surat ke Dinas SDA DKI belum dikirim).
5. **Kalibrasi tegar:** Kd per kecamatan diatur sebagai `Kd = Kd_kota x f_kec`, `f_kec` dari penyusutan hierarkis (kecamatan -> kota -> global) dengan n_min, persis pola penyusutan `ambang_wilayah.py`. Kecamatan dengan sedikit hari laporan memakai nilai kota.

## 4. Memperkirakan lama surut (resesi)

- Satu-satunya cara berbasis satelit gratis: runtun waktu Sentinel-1/GFM. Kesimpulan literatur: durasi genangan dari SAR sangat tergantung frekuensi kunjungan (6-12 hari) dan kualitas masker; kunjungan jarang menghasilkan galat durasi besar (Remote Sensing 2016; DLR 2020; Sardoba 2022). Di kota padat 75% ter-mask, jadi TIDAK dipakai untuk lama surut perkotaan.
- Dari PetaBencana: jejak laporan per RW/kecamatan (laporan pertama dan terakhir dengan status tergenang, jam ke jam) memberi proksi durasi genangan. Bias: laporan terakhir bukan saat air surut (orang berhenti melapor), jadi ini BATAS BAWAH lama surut. Label ini harus berkata "teramati dilaporkan", bukan "lama surut".
- Dari model: resesi tangki. Setelah hujan berhenti, kedalaman h turun menurut `dh/dt = -(Kd_efektif_sisa + infiltrasi)/porositas_cekungan`, dengan Kd_efektif dikurangi ketika pasang melewati ambang mulut saluran (RANCANGAN §4: Qlaut ditahan). Lama surut = waktu sampai h < 10 cm (sama dengan definisi `sim_genangan.js` TERGENANG). Ini model buatan; uji dengan jejak laporan (batas bawah) dan dengan runtun pos tinggi air SIHKA/DSDA untuk sungai.
- Sebut selalu sebagai rentang dan hipotesis sampai ada pembanding durasi teramati bukan laporan (mis. log operasi rumah pompa, permintaan resmi).

## 5. Label dan uji balik

| Dataset | Isi | Akses | Kegunaan | Keterbatasan |
| --- | --- | --- | --- | --- |
| PetaBencana.id arsip | laporan titik, kedalaman cm, waktu | bebas, 2017-2025 (+2026); lisensi API tidak tertera | label utama POD (kecamatan-jam) dan kedalaman | bias pelapor; ~20% tanpa kedalaman; kredibilitas laporan 64-77% pada studi UGM 2020; ketiadaan laporan bukan bukti kering |
| DIBI BNPB | kejadian per kab/hari, dampak | bebas | label kab-hari (sudah dipakai `uji_balik.py`) | tanpa kedalaman; kab bukan kecamatan; DIBI 2024 longsor tidak lengkap |
| Copernicus GFM (Sentinel-1) | luas tergenang 20 m, ensemble 3 algoritma (DLR, LIST, TUW) | bebas, EODC STAC | label luas untuk pinggiran/kota non-padat | di kota padat under-estimasi (no-sensitivity mask hanya diterapkan pada piksel non-banjir; flooded pixel tidak dimask); lewat sekali per 6-12 hari |
| Global Flood Database (Tellman dkk. 2021, Nature) | 913 peristiwa 2000-2018, MODIS 250 m | bebas (Earth Engine) | konteks regional, kejadian besar | 250 m, harian awan; tidak melihat genangan kota |
| Hujan acuan | pos DSDA/BMKG jam | tidak publik (surat) | satu-satunya cara mengukur bias hujan | belum ada |
| Pos tinggi air SIHKA/DSDA/SIPANTAU | 180 hari live | live | resesi sungai | arsip lama tidak publik |

### 5.1 Desain uji balik yang disarankan (menggabungkan RANCANGAN §7 dan pola `ambang_wilayah`/`prospektif`)

- **Unit:** kecamatan-hari (M0) dan kecamatan-kejadian (M1/M2). Positif = hari dengan ≥ 3 laporan tergenang (ambang n_lap dipilih di latih, bukan di uji), atau ≥ 1 dengan kedalaman ≥ 10 cm. Negatif = semua hari musim hujan lain yang punya data hujan, TIDAK dicocokkan ke positif (menjaga laju dasar, pelajaran `uji_balik.py`).
- **Pembagian waktu:** latih 2017-2022, validasi 2023, uji 2024-2025 dibuka sekali, sidik sha256 parameter+kode (pola `buka` di `ambang_wilayah.py`). 2024 berisi 11.236 laporan (satu musim ekstrem), jadi laporkan juga 2025 sendiri, dan jangan memilih ambang pada 2024.
- **Pembanding wajib:** (a) persistensi/klimatologi per bulan; (b) ambang hujan satu angka seragam kota; (c) aturan `status.py` yang berlaku; (d) bathtub tanpa Kd. Model naik tingkat hanya bila selang CI 95% bootstrap blok (kecamatan x tahun, berpasangan) selisih ETS atau CSI di atas 0.
- **Metrik:** POD, FAR, CSI, PSS, ETS (modul `verifikasi.py` yang direncanakan di PELATIHAN-MODEL), ditambah Brier dan diagram reliabilitas bila keluaran berupa peluang. Kedalaman: galat absolut median dan bias pada laporan ber-kedalaman, dengan peringatan kuantisasi pelapor. Lama surut: hanya terhadap batas bawah laporan, tidak dilaporkan sebagai akurasi.
- **Kriteria kejujuran:** kriteria RANCANGAN §7 (POD ≥ 0,6, batas bawah > pembanding; ketajaman; galat kedalaman ≤ 40 cm; Spearman ≥ 0,5) dipertahankan; tambah batas FAR eksplisit karena FAR 0,96 dari aturan harian menunjukkan POD saja menyesatkan. Angka kriteria baru adalah usulan dan HARUS dikunci sebelum angka dilihat, lalu hash-nya ditulis seperti `KRITERIA_SHA256` di `prospektif.py`.
- **Gagal = label "Hipotesis, belum lolos uji"** (pola `kekeringan-hipotesis`), angka tetap tampil dengan rentang, bukan angka utama.
- **Prospektif:** tiap hari catat prakiraan per kecamatan (level model baru + peluang dari ansambel IFS), append-only, dinilai terhadap PetaBencana dan DIBI saat tersedia (pola `prospektif.py`).
- **Risiko overfit:** 44 kecamatan x ~7 musim = parameter Kd banyak untuk sedikit kejadian bermakna. Batasi parameter bebas (Kd kota, f_kec terpenyusutan, satu faktor bias hujan per musim), laporkan ketidakpastian bootstrap atas laporan.

## 6. Arsitektur bertahap

Prinsip: layar tidak menghitung model; layar membaca tabel `kecamatan_genangan.json` dan menginterpolasi. Ruang kombinasi kecil:
jumlah hujan (25-400 mm, ~10 titik) x durasi (1, 3, 6, 12, 24 jam) x pasang (rendah/tinggi) x keadaan tanah (kering/basah) = ~200 kasus per kecamatan x 44 kecamatan, hasil ~9.000 baris; muat < 300 KB.

| Tahap | Isi | Keluaran | Jalan di | Gerbang |
| --- | --- | --- | --- | --- |
| **M0** (1-2 minggu) | Kurva hujan-pemicu per kecamatan: P(hari tergenang | hujan maks 1 jam, 3 jam, total harian, A7). Regresi logistik monotonik stdlib (`gbdt.py` sudah punya LR), penyusutan hierarkis | `kecamatan_pemicu.json`: tiap kecamatan peluang pada grid hujan + selang bootstrap + kinerja uji | lokal/CI, sekali | uji balik §5.1; pembanding (a)-(c) |
| **M1** (2-4 minggu) | Model tangki per kecamatan: CN dari kedap, hietograf pola Jakarta, limpasan SCS-CN, tampungan cekungan dari histogram DEM kecamatan, Kd = Kd_kota x f_kec, pasang menahan keluaran, resesi untuk lama surut. Python stdlib (loop sederhana, tanpa numpy) | `kecamatan_genangan.json`: kedalaman rata-rata dan P90 sel basah, fraksi luas tergenang, lama surut per skenario | CI harian tidak perlu; ulang tiap kali Kd diperbarui | sama + `genangan_swauji` analog Python |
| **M2** | Sebaran kedalaman dalam kecamatan dari `sim_genangan.js` (headless, `mesin.mjs`) sebagai pengganti tampungan seragam; hasil agregat per kecamatan menggantikan atau menyetel M1; hasil sel 30 m TIDAK diterbitkan, hanya persentil | tabel yang sama, kolom bertambah | lokal (jam), hasil di-commit; seperti `model_sebaran.json` | uji kesetaraan M1 vs M2 pada skenario acuan; M2 harus mengalahkan M1 |
| **M3** | Residu GBDT di atas M1/M2 untuk kovariat yang tidak terwakili (hari berurutan, banjir kiriman GloFAS hulu, subsiden); Platt/CQR untuk peluang | `model_genangan.json` (kontrak PELATIHAN-MODEL) + evaluator `public/inti/model.js` | lokal, ±menit | uji kesetaraan Python-JS (<1e-4), prospektif |
| **M4** | Jawa: Semarang, Surabaya, Bandung, Pekalongan; label dari GFM pinggiran + DIBI + PetaBencana kota lain; Kd dari prior desain tanpa kalibrasi lokal berlabel hipotesis | tabel per kota | sama | sama |

Kartu di layar tidak butuh Worker. Bila perlu peluang harian per kecamatan dengan prakiraan, gabungkan: `peluang.json` (ansambel IFS) menjadi masukan hujan -> baca tabel -> level. Itu satu interpolasi di peramban.

### 6.1 Isi kartu (meniru karhutla, dengan tata bahasa pemilik: tanpa " · ", pil label, tanpa subjudul KPI, angka kunci pertama berwarna jingga)
1. **Kondisi kini:** hujan 1 jam/3 jam/24 jam terakhir di kecamatan (pos atau satelit, sumber disebut), level, peluang Siaga dari ansambel.
2. **Riwayat:** berapa hari tergenang per tahun 2017-2025 (`riwayat_kec.json`), terparah (tanggal, kedalaman laporan maksimum), hujan saat itu.
3. **Tren:** hari tergenang per tahun dengan catatan bias pelapor (2024 = 11.236 laporan di DKI, bukan berarti banjir 4x lebih banyak dari 2023).
4. **Prakiraan dari pola kecamatan:** kurva hujan-pemicu (M0): hujan terkecil yang pernah memicu, peluang pada hujan prakiraan P10/P50/P90.
5. **Model:** "kalau hujan X mm selama Y jam": slider dua sumbu membaca tabel M1/M2, keluaran kedalaman (rentang), luas tergenang, lama surut (rentang), dengan pil **Eksperimental** atau **Hipotesis** bila belum lolos uji.
6. **Kinerja uji:** POD, FAR, CSI, n, periode, pembanding, apa adanya (`kinerja_uji`), plus tanggal pembukaan uji.
7. **Yang tidak diketahui:** saluran tersumbat, kapasitas pompa, pasang tahun lampau dari harmonik, sel 30 m (RANCANGAN §6).
8. **Hormati aturan pemilik:** `selera-angka` untuk format Indonesia dan tanpa presisi palsu; `inp-reviewer` untuk slider (kontrol urgent, tabel deferred).

## 7. Repo dan paper

### 7.1 Repo GitHub (diperiksa lewat `gh`, 27 Okt 2026)
| Repo | Kegunaan | Lisensi | Bintang/aktif | Dipakai? |
| --- | --- | --- | --- | --- |
| [pysheds/pysheds](https://github.com/pysheds/pysheds) | delineasi DAS, HAND di Python | GPL-3.0 | 913, aktif | Hanya sebagai rujukan algoritma; GPL, bergantung numpy; jangan disalin |
| [FluiditLtd/caddies-caflood](https://github.com/FluiditLtd/caddies-caflood) dan [WaterDesk/caflood](https://github.com/WaterDesk/caflood) | CAFlood/WCA2D automata genangan | WaterDesk MIT; Fluidit "other" **[BELUM DICEK]** | 25 / 3 | Rujukan; C++ |
| [openearth/lisflood-fp-bmi](https://github.com/openearth/lisflood-fp-bmi) | LISFLOOD-FP v5.9 | GPL-3.0 | 48, 2021 | Rujukan; jangan salin |
| [pyswmm/pyswmm](https://github.com/pyswmm/pyswmm) | pembungkus SWMM | "other" (lisensi SWMM/EPA tidak terbaca otomatis) **[BELUM DICEK]** | 384, aktif | Tidak: butuh jaringan pipa |
| [Geo-Twin/GeoTwin](https://github.com/Geo-Twin/GeoTwin) | kerangka digital twin memakai model FastFlood | MIT | 16 | Rujukan arsitektur |
| [Sruthie-36/3D_FastfloodApp](https://github.com/Sruthie-36/3D_FastfloodApp) | add-on visual FastFlood | GPL-3.0 | 1 | Tidak |
| [giscience/jakarta_thesis_klipper](https://github.com/giscience/jakarta_thesis_klipper) | dampak banjir pada jalan/layanan kesehatan Jakarta | **[BELUM DICEK]** | – | Rujukan, bukan prediksi |
| [kartoza/jakarta-flood-maps](https://github.com/kartoza/jakarta-flood-maps) | peta banjir web Jakarta 2015 | "other" | 1, 2015 | Usang |
| [Fouzay/jakarta-flood-risk-spatial-analysis](https://github.com/Fouzay/jakarta-flood-risk-spatial-analysis) | analisis kerentanan multikriteria | tidak tertera | 3 | Tidak |
| [firdysani/Jakarta-Flood-Prediction](https://github.com/firdysani/Jakarta-Flood-Prediction) | capstone Bangkit 2022 | tidak tertera | 0 | Tidak |
| [keanteng/flood_risk_model_2](https://github.com/keanteng/flood_risk_model_2) | regresi logistik Malaysia | MIT (hasil pencarian) | – | Contoh metode saja |
| [petabencana/cognicity-server](https://github.com/petabencana/cognicity-server) | server PetaBencana | "other" **[BELUM DICEK]** | – | Rujukan skema laporan |

Tidak ditemukan repo open source Jakarta yang menyediakan model genangan terlatih dan teruji. Klaim akurasi 99,9% pada tesis RF 33 wilayah (GIST) dan situs
"Flood Early Detection System" (shemilael.github.io) tidak diverifikasi dan tidak boleh dikutip. Kode untuk dependensi di atas tidak dipanggil dari pipeline kami.

### 7.2 Paper dan sumber (lihat peringatan: hanya cuplikan dibaca)
- van den Bout, Jetten, van Westen, Lombardo 2023, FastFlood, Environmental Modelling & Software 168:105787, doi:10.1016/j.envsoft.2023.105787; abstrak EGU23-3611 https://meetingorganizer.copernicus.org/EGU23/EGU23-3611.html (F1 0,79; MAE 0,46 m; RMSE 0,76 m; 212x lebih cepat, sebagaimana diringkas).
- Seleem, Heistermann, Bronstert 2021, Water, FSM vs TWI terhadap TELEMAC-2D: https://doaj.org/article/378ac6b649c74885965ce002e0f56e13 dan disertasi https://publishup.uni-potsdam.de/files/59813/seleem_diss.pdf.
- Nobre dkk. 2016, HAND contour; Aristizabal dkk. 2024 HESS 28:1287 https://hess.copernicus.org/articles/28/1287/2024/ (kualitas HAND-FIM vs resolusi DEM).
- Bates, Horritt, Fewtrell 2010, LISFLOOD-FP inersia lokal; Neal dkk., Tewkesbury 2007 https://centaur.reading.ac.uk/20011 (67x lebih cepat).
- Guidolin dkk. 2016 CADDIES; Exeter https://www.exeter.ac.uk/research/centres/cws/resources/caddies/ dan https://ore.exeter.ac.uk/repository/handle/10036/3742.
- RIM2D, validasi terhadap debit saluran Dresden: https://www.frontiersin.org/articles/10.3389/frwa.2024.1310182.
- Saluran virtual dari data terbuka vs rainfall reduction method (J. Hydrology): https://eprints.whiterose.ac.uk/id/eprint/200376/1/1-s2.0-S0022169423006601-main.pdf.
- Pluvial tanpa data saluran, pendekatan fisika: https://fis.tu-dresden.de/portal/de/publications/urban-pluvial-flood-modelling-in-the-absence-of-sewer-drainage-network-data(f561216c-5de1-47c0-94af-94bf65eaebee).html.
- RUFIDAM (Monash): https://research.monash.edu/en/publications/a-rapid-urban-flood-inundation-and-damage-assessment-model/.
- GFM: ensemble likelihood https://arxiv.org/pdf/2304.12488; peta masker https://isprs-annals.copernicus.org/articles/X-1-W1-2023/911/2023/; panduan https://extwiki.eodc.eu/GFM/PUM/TechnicalOverview.
- Tellman/Doyle dkk. 2021 Global Flood Database, Nature, doi:10.1038/s41586-021-03695-w https://www.nature.com/articles/s41586-021-03695-w (MODIS 250 m).
- IDF Jakarta harian, Natural Hazards 75(2):1075-1104 (2015) https://ideas.repec.org/a/spr/nathaz/v75y2015i2p1075-1104.html; IDF ITB GSMaP https://pengabdian.drpm.itb.ac.id/proyek/identifikasi-dan-karakterisasi-kejadian-dan-dampak-cuaca-dan-iklim-ekstrem-di-indonesia; GSMaP v8 vs gauge https://www.mdpi.com/2072-4292/15/4/1115; pola hujan jam Jakarta-Bogor https://journals.itb.ac.id/index.php/jts/article/download/15111/5375.
- Ambang hujan banjir Jakarta (peluang pengulangan, tanpa POD/FAR): https://www.bio-conferences.org/10.1051/bioconf/202515711002; tren hujan jam 81 tahun https://www.jstage.jst.go.jp/article/jmsj/100/3/100_2022-023/_article/-char/en.
- Durasi genangan dari SAR: https://elib.dlr.de/134179/1/remotesensing-12-00643.pdf; https://hal-univ-rennes1.archives-ouvertes.fr/hal-01374453; https://journal.hep.com.cn/jes/EN/10.1007/s12583-022-1670-9.
- Kredibilitas laporan PetaBencana (UGM): https://etd.repository.ugm.ac.id/home/detail_pencarian_downloadfiles/1599340; ITU https://www.itu.int/hub/2022/08/crowdsourcing-helps-mitigate-disasters/.
- CityCAT Jakarta 2007 (BGS/NERC, data kedalaman model): https://hosted-metadata.bgs.ac.uk/geonetwork/srv/api/records/8e58f0bb-3ff1-41e8-b8f4-380983ec68bc.

### 7.3 Yang TIDAK ditemukan (supaya tidak diklaim)
- Skor POD/FAR hujan-jam terhadap genangan kecamatan Jakarta: tidak ada.
- Validasi GFM perkotaan terhadap laporan lapangan Jakarta: tidak ditemukan; ringkasan produk hanya menyatakan no-sensitivity cenderung under-estimasi di kota.
- Akurasi "bucket Kd" sebagai skor: tidak ada; ini model buatan kami dan mesti dibuktikan sendiri.
- Standar kala ulang desain drainase DKI: belum terbuka dari naskah primer.

## 8. Keputusan yang dibutuhkan dari pemilik
1. Setujui urutan M0 -> M1 -> M2 dan kriteria §5.1 (termasuk batas FAR) sebelum hasil pertama; dikunci ke git.
2. Gantikan rancangan "simulasi per kecamatan di layar" dengan "tabel pra-hitung + interpolasi" (alasan: Worker 10 ms, uji kesetaraan, seragam dengan karhutla).
3. Izin mengambil ESA WorldCover/GHSL (CC BY 4.0, periksa) dan IDF ITB, atau pakai Gumbel ERA5 sendiri (hipotesis).
4. Surat ke Dinas SDA DKI/BMKG (pos hujan jam, kapasitas pompa, log operasi, arsip tinggi air); tanpa ini faktor bias hujan dan Kd tetap berlabel hipotesis.
5. Lisensi PetaBencana: periksa syarat resmi sebelum menerbitkan lebih dari agregat.
6. FABDEM (CC BY-NC-SA) tidak dipakai di situs publik sampai ada keputusan; DEMNAS 2011 dengan koreksi subsidensi tetap acuan.
