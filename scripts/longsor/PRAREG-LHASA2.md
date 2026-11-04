# Pra-registrasi: nowcast longsor kab-hari resep LHASA v2 (lantai klimatologi sebagai offset, formula boleh beda per wilayah)

Status: DRAF REVISI 2, 4 Nov 2026 (rev. 2 menjawab tinjauan `validasi-model` rev. 1 dan keputusan pemilik 4 Nov, §9). Belum disetujui pemilik, belum ditinjau `validasi-model`, BELUM DIBEKUKAN. Ditulis SEBELUM satu baris
kode `model_lhasa2.py` ada dan sebelum satu skor model ini dihitung di tahun mana pun. Label >= 2026-10-19 TIDAK dibuka oleh dokumen ini.
Tanda **BELUM DICEK** = asumsi yang harus dibuktikan dulu (§7); bila salah, protokol diamandemen SEBELUM `sidik`, bukan sesudahnya.

Pola, ukuran, dan penjaga disalin dari `scripts/banjir/PRAREG-CAMPUR.md` (+ `PRAREG-CAMPUR-AMANDEMEN.md`): lantai klimatologi sebagai offset, partial
pooling per wilayah, validasi bersarang LOYO, Platt per wilayah, vonis hanya prospektif dengan koreksi uji, QA susulan L1/L2. Ini percobaan TERPISAH dari
CAMPUR (keluarga uji sendiri, §5.1); hasilnya tidak digabung angka demi angka dengan banjir.

## 0. Latar

Model longsor yang hidup (`scripts/longsor/model.py`, v1/v2: bobot tetap lereng/zona PVMBG/sesar x hujan 7 hari di atas P95, sel 0,5 derajat):

- GAGAL tiga kali (29 Okt v1, 30 Okt v2, 2 Nov 515 sel): AUC model 0,7045 (CI 0,684-0,720) vs klimatologi kab x bulan 0,7772 (CI 0,758-0,799);
  3 Nov setelah perbaikan label g=1: 0,7047 vs 0,7773. Makin banyak sel, model makin turun (170 sel 0,736; 320 sel 0,727; 515 sel 0,705), klimatologi stabil.
- Audit 3 Nov (`scripts/banjir/AUDIT-MODEL-2026-11.md`): di dalam satu kab model 0,689 = hujan-saja 0,694; hujan baru menambah bila kebiasaan lapor dijadikan dasar
  (klimatologi + hujan 0,823, eksplorasi di tahun uji yang terbakar, hanya petunjuk, tidak dipakai sebagai bukti).
- Diagnosis yang dipegang: hambatan utama LABEL (laju lapor antar-kab, DIBI longsor 2024 hanya 219 baris, 2026 terisi susulan) dan fitur (hujan hanya R7/P95, tanpa
  hujan hari-H kontinu, anteseden, lengas), bukan kekurangan kerumitan model.
- Bukti luar (`research_notes/Prediktor banjir dan longsor tropis/longsor.md`, `reports/Benchmark peringatan dini internasional.md`): LHASA v2 (Stanley dkk. 2021,
  doi:10.3389/feart.2021.640043; XGBoost kedalaman 2 monoton; gain hujan hari-H dinormalisasi P99 sel 0,74, sesar 0,10, lereng 0,08, anteseden 2 hari 0,05, lengas SMAP
  0,02; deteksi validasi 45% naik ke 93% pada FPR sama, tetapi tanpa AUC, tanpa inventaris Indonesia, dan Indonesia titik panas alarm >10% hari); ambang Indonesia yang
  terbit AUC 0,64-0,73, TSS ~0,32; Steger dkk. 2017 (efek acak aksesibilitas untuk inventaris tak lengkap). Sumbernya sebagian ringkasan (ditandai di catatan riset);
  LHASA v2 di sini adalah RESEP (hujan hari-H kontinu, anteseden terpisah, statis sebagai interaksi hujan, monoton lewat beta nonneg; pohonnya dibuang rev. 2), bukan klaim bahwa 93% berlaku di Indonesia.

## 1. Pertanyaan

Satu pertanyaan, satu kontras gerbang: apakah resep LHASA v2 yang dilatih (hujan hari-H ternormalisasi, anteseden terpisah, lengas, statis sebagai interaksi) menambah
keterampilan DALAM-KAB dan TOTAL di atas klimatologi kab x bulan yang sudah dihaluskan, pada jumlah alarm yang sama, DAN di atas hujan-saja, ILEWS, ambang ID TRMM,
dan model v1 yang ada?

- **H1:** ya, kecil tetapi nyata. **H0 (sama sahnya, apriori kuat: lima kegagalan longsor + lima model banjir):** tidak menambah. Konsekuensi H0 di §5.5.
- **Hasil paling mungkin: TIDAK MEYAKINKAN.** Satu kandidat harus menang sekaligus di ~8 kontras (klimatologi Waspada/Siaga, dAUC dalam-kab, hujan-saja x2, ILEWS x2, Muntohar, v1) pada selang 99,5% dengan
  positif prospektif ratusan; daya gabungan rendah menurut konstruksi, dan itu ditulis sekarang agar TIDAK MEYAKINKAN tidak dibaca sebagai kegagalan model.
- Sekunder (dilaporkan, bukan gerbang): per wilayah, per tenggang +1..+3, kec-hari, SWI, nilai ekonomi.

## 2. Satuan, tenggang, label

### 2.1 Satuan dan tenggang

- **Primer: kab-hari** (`prov|kab` dari `daftar_kec`, indeks `kej["kab"]`), hari `e` = hari kalender WIB (Asia/Jakarta). Hujan harian Open-Meteo Archive
  `timezone=Asia/Jakarta` (00-24 WIB), DIBI tanggal lokal, logbook `mulai` tanggal WIB. Jam ERA5 (UTC, hanya untuk SWI) digeser ke WIB SEBELUM dijumlah; tidak ada
  jendela memakai hari UTC.
- Kab yang dinilai = kab yang SEMUA sel 0,5 derajatnya (sel yang memuat >= 1 kecamatan kab itu) ada di `data/raw/longsor/hujan.json`. Daftar kab dan sel dibekukan di
  `latih.json` saat `sidik` (cakupan 515 dari 948 sel saat ini; keputusan pemilik 4 Nov: `sidik` MENUNGGU 948 sel, §6 dan §7A1). Lima poligon kab bernama "None" (prov 12, 13, 35, 64) DIKELUARKAN dari semua
  penilai (tergabung jadi satu kab per provinsi; bug Pencocok, audit §3). Skor kab = maksimum atas sel kab (§6 mencatat bias luas kab; ditangani stratifikasi `n_sel`).
- **Sekunder: kec-hari**, hanya untuk kec yang tercocok pada logbook (nama) 2025-2026; tanpa vonis; DIBI hanya per kab. **BELUM DICEK:** n positif kec-hari (§7B).
- **Tenggang** (waktu terbit terhadap hari sasaran `e`):
  - **k = 0 (nowcast):** terbit setelah hari `e` selesai (00:00 WIB `e+1`); fitur memakai hujan teramati hari `e`. Satu-satunya tenggang yang punya vonis langsung.
  - **k = +1, +2, +3 (prakiraan):** terbit pada hari `e-k`; hujan hari `e` (dan hari `e-k..e-1` yang belum teramati) diganti PRAKIRAAN beku yang terbit saat itu. Dinilai
    TERPISAH per k, tiap k satu tabel. Di tingkat P1 (hindcast ERA5) ketiganya tidak bermakna (hujan sempurna = k=0), jadi tenggang +k hanya dinilai di P2 dari arsip
    prakiraan beku (§4.3). Vonis tenggang berjenjang tetap (fixed-sequence, tanpa koreksi tambahan): +1 dinilai hanya bila kandidat itu LULUS di k=0; +2 hanya bila +1 LULUS;
    +3 hanya bila +2 LULUS. Hasil +2/+3 tanpa jenjang ini = laporan.

### 2.2 Label

| Lapis | Sumber | Dipakai untuk |
| --- | --- | --- |
| Latih (`y0`, bobot 1,0) | DIBI longsor SAJA, `kejadian.json`: "Tanah Longsor" + "Gerakan Tanah" (g=0) DAN "Banjir dan Tanah Longsor" (g=1), semuanya POSITIF (keputusan pemilik 4 Nov) | lantai, koefisien, Platt |
| Evaluasi (`y1`) | DIBI (g=0 atau g=1) ATAU logbook `longsor`/`banjir_longsor` (hari `mulai`): positif bila ada kejadian di `e-1..e+1` (simetris, 3 hari) | semua skor gerbang |
| Kontrol | K1 = evaluasi DIBI saja (tanpa logbook); K2 = hari g=1 murni DIBUANG dari latih dan evaluasi | "PEKA LABEL" (§5.3), bukan gerbang |

- **Heterogenitas label antar-era (ditetapkan):** lantai dan koefisien memakai SATU sumber saja, DIBI, supaya definisi y0 sama di semua tahun latih. Logbook Pusdalops (2025-2026 di repo, arsip lama BELUM DICEK) hanya masuk
  label EVALUASI dan kontrol; NASA GLC (berhenti 2021, 2017-2018 saja yang beririsan dengan hujan, skema kolom beda antar-salinan) TIDAK dipakai untuk latih; hanya dilaporkan sebagai kontrol recall 2017-2018 tanpa
  vonis. Laporan wajib per tahun: porsi `y1` positif dari DIBI vs logbook, dan laju `y0` per tahun (laju lapor tumbuh; 2024 dikeluarkan). Penyebut `bulan_hari` lantai = jumlah hari kalender bulan `b` di tahun latih
  yang dipakai (2024 TIDAK dihitung; kode `model.klimatologi` lama membagi dengan semua hari 2017-2021, dan dibuat ulang di `model_lhasa2.py` dengan penyebut yang sama dengan tahun yang dinilai).
- **Aturan g=1 (keputusan pemilik 4 Nov):** hari DIBI "Banjir dan Tanah Longsor" DIHITUNG POSITIF di latih dan evaluasi. Ini BERBEDA dari perbaikan e979e5d di `model.py` v1 (sasaran v1 tetap g=0, g=1 murni
  dikeluarkan dari negatif) dan v1 sebagai pembanding tetap dihitung pada definisi sasarannya sendiri DAN pada definisi ini (keduanya dilaporkan). Tidak ada aturan "buang g=1 di `e-1..e+1`". Risiko diterima: sebagian
  g=1 adalah banjir tanpa longsor (inflasi positif); K2 mengukur sensitivitasnya. Selaras dengan `ambang_kab.py`/`uji_logbook_longsor.py` yang menghitung banjir+longsor positif.
- **Mengapa gerbang `y1` (+-1 hari), bukan hari tepat seperti CAMPUR:** tanggal DIBI longsor kasar (Progo: hanya 51,6% kejadian punya jam; Guzzetti 2020: waktu tak pasti
  menghasilkan ambang dan verifikasi keliru); praktik LHASA/Norwegia/benchmark: toleransi +-1 hari simetris. Pilihan ditetapkan SEKARANG, bukan sesudah melihat mana yang
  lolos. Konsekuensi diterima: laju dasar ~2,5 kali `y0`, MDE dihitung pada `y1`; `y0` (hari tepat) dilaporkan sebagai sekunder tanpa vonis dan TIDAK menyelamatkan vonis.
- **Negatif:** kab-hari lain dari tahun terliput. Tahun yang dinilai: 2017-2023, 2025, 2026-01-01..2026-10-18. **2024 DIBUANG seluruhnya** (DIBI longsor 219 baris,
  lubang pelaporan; hari tanpa baris bukan negatif sah; ilmu longsor). Kab tanpa satu pun kejadian longsor resmi di seluruh tahun latih (nol nyata kota/pantai; 59 kab
  bersel hujan tanpa DIBI g=0; 22 di antaranya hanya g=1, kini positif) tetap ikut penilai total tetapi ditandai "tak diketahui" dan dianalisis sensitivitas (negatifnya dikeluarkan, §5.3c).
- **Pemotongan label (kode, bukan janji):** semua label bertanggal > **2026-10-18** dipotong DI KODE sebelum `latih`/`sidik` (DIBI longsor di repo sudah memuat sampai
  2026-10-28; tanggal 10-19..10-28 tidak dibaca). `buka` memakai `awal_prospektif` (§4.4). Swauji: mutasi label > potong tidak mengubah keluaran apa pun.

## 3. Model

Notasi: `p0` lantai; `eta` skor linear; `p` peluang akhir; `e` hari sasaran; semua jendela hujan hari WIB.

### 3.1 Tingkat 1: lantai klimatologi kab x bulan, plus aksesibilitas pelapor

`p0(k,b)` = laju kab-hari berlabel `y0` kab `k` bulan `b`, DARI TAHUN LATIH SAJA, berbobot, tanpa 2024, persis penghalusan CAMPUR §3.1 (indeks musim provinsi `s(prov,b)`, prior
kab `r_kab*s`, bobot 30, jepit [1e-5; 0,5], aturan jatuh-ke-pulau bila < 3 kab/provinsi). Wajib LOYO untuk baris latih (lantai tak pernah melihat label tahun barisnya),
penuh untuk baris uji. Tidak memakai `frek_dibi`.

**Bias lapor (Steger dkk. 2017; keputusan, bukan opsi):** dua lapis.
1. **Efek acak kab** sudah ada: penghalusan bobot 30 kab -> provinsi setara efek acak gamma-Poisson (kab sedikit lapor ditarik ke bentuk musim provinsi).
2. **Indeks aksesibilitas `a_k` = log kepadatan penduduk kab** dari `public/data/penduduk.json` (WorldPop Global2 R2025A 2026, 1 km constrained, kunci per kec,
   sumber SUDAH ada di repo) dibagi luas kab. Prior kab menjadi `r_prov(b)*exp(gamma*(a_k - rerata_prov(a)))`, `gamma` = koefisien regresi Poisson jumlah hari berlabel kab
   (offset log hari terliput, efek tetap provinsi) di tahun latih; `gamma` ditetapkan SEKALI per lipatan. Bila CI bootstrap kab (B = 500) `gamma` <= 0 atau melewati 0, `gamma := 0`
   (tidak ada klaim aksesibilitas tanpa bukti). Kepadatan jalan OSM TIDAK dipakai: `public/data/jalan.geojson` ada (2,8 MB) tetapi cakupan nasional dan lengkapnya BELUM DICEK, dan unduhan
   OSM baru bukan bagian protokol. `a_k` memakai penduduk 2026 untuk semua tahun (statis; mencerminkan kepadatan relatif, bukan jumlah); jumlah penduduk per kab dijumlah langsung dari kunci `kec` (`prov|kab|kec`) di `penduduk.json` (2026); hanya LUAS kab (dari poligon `public/geo/kabupaten`) BELUM DICEK (§7A9).
   `a_k` TIDAK masuk tingkat 2 sebagai efek utama (laju lapor sudah di lantai).
3. Selain itu `a_k` dipakai sebagai STRATUM verifikasi (tertil kepadatan: rendah/tengah/tinggi), supaya FAR/POD tidak dibaca di kab yang hampir tak melapor (§5.4).

### 3.2 Tingkat 2: koreksi dengan offset

`eta = logit(p0) + sum_j beta_wj * z_j`, koefisien `logit(p0)` TETAP 1, tanpa intersep bebas, `z_j` distandardisasi (baris latih berbobot), `beta >= 0` (semua fitur hanya
menaikkan peluang, sejalan kendala monoton LHASA), L2 kuat tetap `tau` dari {0,05; 0,10; 0,25}. Dengan `z = 0` -> `p = p0`.

Fitur (nama = kolom nyata; sumber dan jendela tertulis; tidak ada fitur lain sesudah pembekuan). `P99_s`, persentil, dan standardisasi dari TAHUN LATIH saja (LOYO bersarang):

| Fitur | Definisi | Sumber / jendela |
| --- | --- | --- |
| `rH` | `log1p( max_sel hujan_s[e] / P99_s )`; `P99_s` = persentil ke-99 hujan harian HARI BASAH (>= 1 mm) sel `s` (gaya LHASA v2: P99 per sel) | hujan harian `hujan.json`, hari `e` utuh WIB |
| `a2` | persentil sel jumlah hujan `e-2..e-1`, maks atas sel kab | jendela <= `e-1`, tak bertumpang tindih `rH` |
| `a7` | idem, jumlah `e-7..e-3` | terpisah dari `a2` |
| `a14` | idem, jumlah `e-14..e-8` | terpisah dari `a7` |
| `lr_lereng`, `lr_sesar`, `lr_pv` | interaksi `rH * peringkat(statis)`: lereng p75 kab (rerata kec dari `lab_lereng`), kedekatan sesar `-log1p(jarak_km)`, zona PVMBG `unsur` statis 0-1 (`pvmbg.json`) | statis, tiap `statis` diganti PERINGKAT 0-1 (persentil antar-kab dari tahun latih, nonneg) SEBELUM dikali `rH` (juga `rH >= 0`), sehingga `beta >= 0` menjamin peluang monoton naik terhadap `rH`; `z` distandardisasi kolom interaksi sesudah itu; `zona_perki` (prakiraan Des 2024) DILARANG (bocor) |
| `sm`, `rH_sm` | lengas ERA5-Land `soil_moisture_0_to_7cm` + `7_to_28cm` (rerata) akhir hari `e-1`, anomali z per kab-bulan (tahun latih); interaksi `rH * peringkat(sm)` (peringkat 0-1 anomali, nonneg) | **BELUM ADA di cache** (hujan.json hanya `precipitation_sum`; §7A4) |
| `lr_lahan` | `rH * peringkat(porsi tutupan non-hutan dan non-urban)` WorldCover v200 2021 (kelas 20/30/40/60 per kab) | **BELUM DICEK** ketersediaan ubin (§7A5) |
| `swi` (ekstensi) | SWI JMA tiga tangki, parameter TERVERIFIKASI di PRAREG-CAMPUR §3.2d (L1 15, a1 0,1, L2 60, a2 0,15, b1 0,12; L3 15, a3 0,05, b2 0,05; L4 15, a4 0,01, b3 0,01; per jam), dt = 1/6 jam dari hujan JAM-AN ERA5, akhir hari `e-2` (tidak tumpang tindih `a2`), + interaksi `rH * peringkat(swi)`; hujan harian dibagi rata DILARANG | cache jam-an `data/raw/banjir/jam_era5/` (104 sel 0,25 derajat milik banjir, 64 sel tersimpan 4 Nov); cakupan sel longsor BELUM DICEK (§7A6) |

**Tanpa efek utama statis** (aturan CAMPUR §3.2): lereng, sesar, PVMBG, lahan hanya sebagai interaksi dengan `rH`, karena efek utama statis akan mengajari ulang laju lapor kab
(masalah label). Ini berbeda dari LHASA v2 (statis sebagai efek utama + kendala interaksi dengan hujan); kendala interaksinya setara.

**Set kandidat (dipilih SEKALI, nasional, lipatan F1-F4, aturan satu-SE §3.3; irisan baris valid untuk semua set yang dibandingkan):** `S0 = {rH, a2, a7, a14}`;
`S1 = S0 + {lr_lereng, lr_sesar, lr_pv}`; `S2 = S1 + {sm, rH_sm}`; `S3 = S2 + {lr_lahan}`. Bila `sm` tak tersedia (§7A4) S2 dan S3 dicoret dan S3' = S1 + `lr_lahan`.
`swi`: DIPERLAKUKAN sebagai ekstensi bersyarat: masuk model vonis HANYA bila cache jam-an menutup >= 80% sel kab yang dinilai SEBELUM `latih`; selain itu `swi` dilaporkan sebagai
studi sekunder pada irisan kab yang tercakup (tanpa vonis, tanpa memengaruhi model vonis). SWI TETAP sekunder pada rev. ini (grid jam-an 0,25 derajat vs sel longsor 0,5 derajat belum dipetakan; §7A6). Bila nanti masuk: diterima bila logloss turun > 1 SE selisih berpasangan dan turun pada >= 3 dari 4 lipatan.

### 3.3 Penyelesai, aturan pilihan model, dan wilayah (TETAP; ditulis sebelum hasil apa pun)

**Wilayah (zona litologi tidak bisa: peta litologi nasional 1:250k tidak tersedia, geologi.esdm.go.id dilarang robots; jadi unit = pulau):** enam calon dari kode provinsi BPS:
Sumatera (11-21), Jawa (31-36), Bali-NT (51-53), Kalimantan (61-65), Sulawesi (71-76), Maluku-Papua (81-82, 91-96). Calon dipertahankan terpisah bila SEMUA: (i) `n_kab(w) >= 15`
(kab yang dinilai), (ii) `P_w >= 200` (positif `y0` berbobot latih), (iii) `T_w >= 4` tahun latih dengan >= 10 positif berbobot. Yang gagal menjadi satu wilayah **Lainnya** (penampung; hanya
koefisien nasional bila di bawah syarat; vonisnya "belum cukup data"). `n_kab`, `P_w`, `T_w`, hasil gabung DITULIS ke `latih.json` sebelum langkah berikut dan dibekukan `sidik`.
Bila wilayah efektif < 3: kandidat LH-W turun jadi sekunder tanpa vonis (m turun satu, §5.1).

**Model (keputusan 4 Nov, GBDT DIBUANG):** semua wilayah efektif memakai **regresi logistik nonneg berpooling** (`beta_w = beta_nas + delta_w`, `delta_w ~ N(0, tau_w^2)`, `tau_w` dari {0,02; 0,05}),
penyelesai IRLS himpunan-aktif `scripts/banjir/model_kab_campur.py` (`selesai`, `lantai_fit`, `lantai_loyo`, `satu_se`, `platt_wil`, `standarisasi`) DIIMPOR lewat importlib dan tidak disunting (milik banjir;
hash dikunci di `.sidik`; perubahan sesudah itu mematahkan sidik dan dilaporkan). Alasan GBDT keluar: `scripts/sebaran/gbdt.py:latih_gbdt` (baris ~101-114) tidak punya skor awal/offset, sehingga lantai klimatologi tidak
bisa ditanam sebagai offset; menyalin atau menyunting modul itu melanggar kepemilikan (`model-sebaran`). Konsekuensi diakui: resep v2 yang dikerjakan adalah FITUR LHASA v2 (hujan hari-H/P99, anteseden, statis
sebagai interaksi hujan, monoton lewat `beta >= 0`), BUKAN pohonnya; pohon di luar protokol ini. Tidak ada ambang jumlah positif untuk memilih model; ambang `P_w >= 200` hanya untuk pemisahan wilayah (di atas).
Berlaku amandemen A-2 (satu-SE sampel), A-9 (pooling hanya pasangan aktif), A-10 (jendela di luar awal deret -> hilang/netral).
- `tau`, `tau_w` dipilih lewat satu-SE pada logloss F1-F4 (pooled), `tau` dulu lalu dikunci; sama dengan CAMPUR §3.2b langkah 3.
- **Dua kandidat bervonis (§5):** **LH-N** = satu regresi nonneg nasional, set terpilih, tanpa `delta_w`; **LH-W** = regresi berpooling per wilayah (`delta_w`) dan Platt per wilayah.
  LH-N adalah pembanding wajib LH-W; LH-W hanya boleh tayang bila menang atas LH-N (§5.2). Dengan GBDT keluar, kandidat tetap dua, jadi m tetap 10 (§5.1).

### 3.4 Tingkat 3: kalibrasi Platt per wilayah efektif, LOYO bersarang

Platt (`b0 + b1*logit`) pada `eta` luar-lipatan LOYO per wilayah efektif; model akhir dilatih semua tahun latih. **Platt dilatih pada `y0`** (label yang sama dengan lantai dan `beta`, bukan `y1`). TSS pada alarm tetap (10%/3%) hanya bergantung URUTAN skor; Platt per wilayah
mengubah hasil gerbang hanya lewat urutan lintas wilayah (kalibrasi berbeda per wilayah menggeser peringkat antar-wilayah), tidak lewat urutan dalam wilayah. Validasi bersarang dua tingkat persis CAMPUR §3.2c (lantai, `beta`, `tau`,
Platt, `P99_s`, persentil, standardisasi untuk skor tahun `z` dilatih pada `{tahun latih} \ {z}`). Swauji: mengubah label tahun `z` tidak mengubah logit luar-lipatan tahun `z`, lantai LOYO
baris `z`, atau fitur baris `z`. Tiap pembanding berprobabilitas diberi Platt LOYO yang sama; klimatologi terkalibrasi adalah acuan Brier.

### 3.5 Pembanding (alarm sama, Platt sama, baris sama)

1. **Klimatologi** `p0` + Platt (model nol).
2. **Hujan-saja v1** (`model.py`: `r7/P95` biner-kontinu, kerentanan nonaktif) dan **hujan-saja berlantai** `B2b = lantai + {rH}` (satu fitur, regresi sama). Kemenangan atas `B2b` menjawab
   "apakah lebih dari satu fitur hujan menambah".
3. **ILEWS Balai Sabo** (Hidayat dkk. 2019, doi:10.3390/geosciences9100451): `P1(e)` = hujan hari `e`, `P3(e)` = jumlah `e-2..e`, per sel lalu maks atas sel kab; **kuning** = tepat satu ambang
   terlampaui (`P1 >= 61` mm ATAU `P3 >= 91` mm), **merah** = kedua terlampaui. Skor ordinal 0/1/2, seri dipecah acak biji 11. Catatan: asli dipasang pada TRMM 0,25 derajat dari 83
   kejadian dan "belum divalidasi" (Guzzetti 2020); satuan di sini ERA5-harian 0,5 derajat (ERA5 meremehkan puncak; ambang tak dipindah). Angka dari ringkasan pencarian (teks penuh 403): **BELUM DICEK** (§7B).
4. **Ambang ID TRMM Muntohar dkk. 2021** (`I = 7,83 * D^-0,328`, D = 2-18 hari; TPR 0,92, FPR 0,60, TSS 0,32, AUC 0,66 pada data mereka): skor = `max_{D=2..18} (rerata intensitas mm/jam hari `e-D+1..e`) / I(D)`,
   alarm alami bila >= 1. Satuan mm/jam hanya konstanta pengali (tak mengubah urutan skor dan alarm pada jumlah alarm sama); definisi D berakhir di `e` ditetapkan di sini. Revisi Yuniawan dkk. 2022 (420 longsor Jawa, GPM; metode 4 terbaik): nilai ambang TIDAK terbaca (403), jadi TIDAK
   dipakai; dicatat sebagai pembanding yang hilang, bukan diganti angka karangan.
5. **Model v1 dan v2 yang ada** (`model.uji_balik`, bobot tetap, P95 tahun latih) dihitung ulang di himpunan kab/baris beku ini.
6. Tidak ada persistensi (label hari lalu tidak tersedia operasional; tidak relevan untuk longsor).
Tiap pembanding dinilai pada jumlah alarm SAMA dengan kandidat di tiap tingkat (Waspada 10%, Siaga 3% kab-hari); ILEWS juga pada jumlah alarm alaminya (kuning/merah) dengan kandidat disamakan ke angka itu.

## 4. Pembagian waktu dan status terbakar

### 4.1 Pemeriksaan jujur

| Periode | Sudah dilihat oleh | Status |
| --- | --- | --- |
| 2017-2020 | hujan-riwayat; fit `ambang_kab` (<= 2020); arsip Pusdalops 2016-2022 (`uji_logbook_longsor --arsip`) | latih; sudah DITATAP lewat #4/#5 |
| 2021 | P95 v1; validasi `ambang_kab` 2021-2025 (CSI); arsip Pusdalops | lipatan; DITATAP (terbakar ringan) |
| 2022, 2023, 2025 | uji balik v1, v2, 515 sel, uji ulang g=1, eksplorasi 0,823 (dalam-kab), `uji_logbook_longsor --arsip` | **TERBAKAR** |
| 2024 | tidak dipakai (DIBI bolong) | dibuang |
| 2026-01-01..10-18 | `ambang_kab uji2026`, `uji_logbook_longsor` (aturan `level_longsor`, logbook 2026) | **TERBAKAR** |
| 2026-10-19..T | label tak dibuka protokol ini, tetapi DIBI/logbook publik sudah memuat sampai ~28 Okt dan terbaca sesi lain | **TIDAK DIJAMIN BERSIH**, dikeluarkan dari vonis |
| T+1..2027-04-30 | belum dinilai siapa pun (musim hujan 2026/27) | **BERSIH: satu-satunya uji** |

Akibatnya **tidak ada uji A bersih** untuk longsor: semua tahun yang punya label sudah ditatap. Lipatan bergulir hanya untuk memilih (`tau`, `tau_w`, set fitur) dan menguji ketahanan antar-tahun, bukan vonis.

### 4.2 Pembagian dibekukan

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih penuh | 2017-01-01..2026-10-18 tanpa 2024 | model akhir |
| Lipatan bergulir F1..F5 | F1 = 2021 (latih 2017-2020), F2 = 2022, F3 = 2023, F4 = 2025 (latih 2017-2023), F5 = 2026-01-01..10-18 (latih 2017-2023 + 2025) | **F1-F4 memilih**; F5 TIDAK memilih, dipakai di gerbang pembekuan; DIAGNOSTIK |
| Uji prospektif | T+1..2027-04-30 (T = §4.4) | satu-satunya uji, dibuka sekali |

**Gerbang pembekuan (kesia-siaan):** bila dTSS(kandidat - klimatologi) Waspada gabungan lipatan titiknya <= 0, ATAU titiknya > 0 pada kurang dari 4 dari 5 lipatan, kandidat DIHENTIKAN
("tidak terbukti, tidak layak dibekukan"), `sidik` tidak ditulis. Aturan ini hanya bisa menolak; lolos tidak berarti apa pun (semua tahun terbakar).

### 4.3 Dua tingkat masukan di prospektif

- **P1, hujan sempurna:** fitur dari ERA5 (Open-Meteo Archive, latensi ~5 hari) untuk T+1..2027-04-30; tingkat yang dinilai vonis k = 0; batas ATAS operasional.
- **P2, masukan operasional terarsip:** hujan harian operasional (`public/banjir/data/hujan.json`, Open-Meteo forecast; dua model hujan berbeda dari ERA5, ilmu longsor) diarsip harian sejak sidik;
  prakiraan beku per tenggang +1..+3 diarsip saat terbit. P2 dilaporkan dengan dan tanpa koreksi bias kuantil (skrip `koreksi_bias.py` banjir menjadi acuan; koreksi longsor sendiri BELUM ADA, §7B). Dasar izin
  tayang (keputusan pemilik) hanya bila P2 tidak jauh di bawah P1. `sm` dan `swi` P2 BELUM DICEK (sumber operasional lengas).
- Fitur tanpa P2 dicopot dari **model tayang** (dilatih ulang dengan resep sama, tanpa pemilihan ulang); vonis memberi izin tayang dijatuhkan HANYA pada model tayang (pola CAMPUR §5.2b); model penuh = batas atas.

### 4.4 Awal prospektif (pola CAMPUR §4.4)

Jendela mulai hari kalender SESUDAH tanggal commit `model_lhasa2.sidik` (T+1): T = tanggal WIB dari COMMITTER date commit pertama yang memuat baris `sidik`, dibaca dari `origin/main`; bila terdapat
penanda workflow/`gh api` yang lebih lambat, yang PALING AKHIR menjadi T. `buka` menolak bila tanggal commit `.sidik` lebih baru dari awal jendela. `sidik` mencatat sha256 berkas label
(`kejadian.json`, `dibi_kejadian.json`, `logbook_kejadian.json`) sebagai bukti keadaan (bukan bukti tak dibaca). Pemotongan label 2026-10-18 di kode (§2.2). Label prospektif dibekukan (salinan + sha256) tepat sebelum `buka`.

## 5. Kriteria (ditetapkan sekarang, sebelum angka apa pun)

### 5.1 Ukuran dan koreksi uji

- **Alarm:** Waspada = 10% teratas kab-hari, Siaga = 3% teratas (Norwegia kuning 10,9% hari, oranye 1,4%; LHASA Indonesia titik panas >10%); level 3 = 1%, level 4 = 0,3% (laporan). Seri dipecah acak biji 11.
  Alarm sama untuk semua penilai yang dikontraskan.
- **Ukuran gerbang:** **TSS** = POD - POFD pada `y1`; **AUC dalam-kab** = rerata AUC per kab (kab dengan >= 5 hari `y1`=1 dan >= 30 hari `y1`=0 di jendela dinilai), berbobot jumlah positif, mengukur apakah
  hujan memisahkan HARI di dalam kab (bukti audit: model 0,689 = hujan-saja 0,694). Dilaporkan berdampingan: POD, FAR, bias frekuensi, **SEDI**, AUC total, AUC-PR, dBSS vs klimatologi terkalibrasi.
- **Bootstrap blok:** 5.000 ulangan di validasi/gerbang, 20.000 di `buka` (biji 11); dua skema (kab x bulan-tahun; pulau x minggu), resampel identik untuk semua penilai; batas bawah = yang lebih kecil dari dua
  skema, batas atas = yang lebih besar.
- **Daftar buka longsor (m, dihitung dari git, `git log`/jejak 4 Nov):** tatapan terhadap 2022-2026 yang bisa memengaruhi rancangan ini:

| # | Tanggal | Uji | Periode | Bukti |
| --- | --- | --- | --- | --- |
| 1 | 29 Okt | uji balik v1 | 2022, 2023, 2025 | ilmu longsor, kasus 29 Okt |
| 2 | 29-30 Okt | `uji_logbook_longsor` aturan `level_longsor` | 2026-01..10 | commit 70023133, d531cbf8 |
| 3 | 30 Okt | uji balik v2 (+ PVMBG) | 2022, 2023, 2025 | 3336ba7d |
| 4 | 30 Okt | `ambang_kab` (latih 2015-2025 DIBI, `uji2026`) | fit <= 2020; validasi 2021-2025 DITATAP; 2026 uji | commit 76f54e1e; tanggal kerja sebenarnya BELUM DICEK |
| 5 | 1 Nov | `uji_logbook_longsor --arsip` | arsip Pusdalops 2016-2022 (mencakup 2017-2021) dan 2022-2025 | 2683dcc6, 2934f7b9 |
| 6 | 2 Nov | uji ulang 515 sel + bootstrap blok | 2022, 2023, 2025 | 16173b93 |
| 7 | 3 Nov | uji ulang setelah perbaikan g=1 | 2022, 2023, 2025 | e979e5de / f4349d6c |
| 8 | 3 Nov | eksplorasi klimatologi + hujan dalam-kab (0,823) | tahun uji | audit §1 |

  Tatapan = 8; kandidat bervonis baru = 2 (LH-N, LH-W). **m = 10**; kontras tenggang +1..+3 berjenjang (fixed-sequence) dan semua kontras dalam satu kandidat (irisan-gabungan) tidak menambah m.
  Satu-sisi per kontras `2,5%/10 = 0,25%`, **selang tengah 99,5%**. Bila LH-W turun jadi sekunder (§3.3), m = 9: `2,5%/9 = 0,2778%`, dibulatkan ke bawah 0,27%, selang 99,46%. m = 10 KONSERVATIF: delapan tatapan dihitung penuh walau beberapa (v1/v2 pada tahun sama) mengintip himpunan tahun yang sama, dan tidak ada yang dicoret. Sidik/`latih` MENULIS ulang tabel ini dari git;
  jika menemukan tatapan ke-9, m naik dan angkanya diperbarui SEBELUM sidik. Selang ini ad hoc, bukan jaminan galat keluarga. **Keluarga ini TERPISAH dari keluarga banjir** (anggaran 5% banjir sudah habis;
  longsor tidak memakai Uji B banjir). **BELUM DICEK:** apakah sesi lain mengintip data longsor di luar jejak yang ada (prompt pemilik 2 Nov 00:51 "uji sendiri" tidak meninggalkan skrip lain).

### 5.2 LULUS, TIDAK LULUS, TIDAK MEYAKINKAN (tenggang 0, P1, model tayang, `y1`, `buka` sekali, label L2)

"Batas bawah" = pada KEDUA skema blok (yang lebih kecil), selang 99,5%. Kandidat C ∈ {LH-N, LH-W}, masing-masing.

**LULUS** bila SEMUA:
1. batas bawah dTSS (C - klimatologi) Waspada > 0 dan Siaga > 0;
2. batas bawah dAUC dalam-kab (C - klimatologi) > 0;
3. batas bawah dTSS (C - hujan-saja berlantai `B2b`) Waspada > 0 dan (C - hujan-saja v1) Waspada > 0;
4. batas bawah dTSS (C - ILEWS) > 0 pada alarm kuning DAN pada alarm merah; batas bawah dTSS (C - Muntohar) Waspada > 0;
5. batas bawah dTSS (C - model v1) Waspada > 0.

**TIDAK LULUS** bila dTSS (C - klimatologi) Waspada titik <= 0, ATAU batas atas dTSS (C - `B2b`) Waspada < 0, ATAU batas atas dTSS (C - ILEWS) < 0. **TIDAK MEYAKINKAN** selain itu; "(daya rendah)" bila
`mde_80` > 0,25 x TSS klimatologi Waspada prospektif.

**LH-W** hanya boleh tayang bila LH-W LULUS dan batas bawah dTSS (LH-W - LH-N) Waspada > 0 dan batas bawah dAUC dalam-kab (LH-W - LH-N) > 0; selain itu yang dipertimbangkan LH-N bila LULUS. Urutan kesederhanaan
untuk tayang: klimatologi < `B2b` < LH-N < LH-W.

**Per wilayah:** dinilai bila positif `y1` prospektif >= 40; kurang dari itu "belum cukup data". Per wilayah hanya bisa MENAHAN (titik dTSS Waspada <= 0 -> "tidak terbukti di wilayah ini", tidak tayang
di wilayah itu walau nasional LULUS), tidak bisa meluluskan.

### 5.3 Penjaga label dan sensitivitas

- **PEKA LABEL (pola HULU):** K1 = evaluasi DIBI saja tanpa logbook (latih sama, sudah DIBI saja); K2 = hari g=1 murni DIBUANG dari latih dan evaluasi (sensitivitas keputusan pemilik 4 Nov; latih ulang dengan resep, `tau`, set terpilih yang sama). Bila C LULUS tetapi titik dTSS Waspada K1 atau K2 <= 0 -> "LULUS, PEKA LABEL", pasang hanya setelah pemilik memutuskan.
- **Kab aktif** (>= 1 hari longsor resmi di >= 3 dari tahun latih): hasil dipisah aktif vs "tak diketahui", negatif kab tak aktif dikeluarkan sebagai sensitivitas (§5.4 melaporkan, tidak menjadi gerbang).
- **Stratifikasi** (laporan): tertil kepadatan penduduk (§3.1), tertil `n_sel` (bias luas kab), per wilayah, per bulan, `y0` hari tepat.

### 5.4 Verifikasi tambahan (laporan, tidak mengubah vonis)

1. **Kurang lapor:** FAR dilaporkan sebagai BATAS ATAS pada tiap stratum; "alarm palsu" di kab berlaju lapor rendah sebagian tak dapat diverifikasi. Ambang tidak boleh disetel untuk menekan FAR teramati di kab jarang melapor (benchmark Q2).
2. **POD/FAR per kab-hari +-1 hari SIMETRIS (F-beta, beta = 0,8):** alarm di `e` kena bila ada kejadian di `e-1..e+1` (presisi); kejadian di `d` tertangkap bila ada alarm di `d-1..d+1` (recall).
3. **Per tingkat:** konfusi per level 1-4 (Emilia-Romagna), frekuensi alarm per level (% kab-hari), bias frekuensi; skor tingkat-kejadian (gugus kejadian per kab).
4. **Nilai ekonomi relatif (cost-loss, Richardson 2000):** `V(a)` untuk `a` = 0,02, 0,10, 0,30 pada empat tingkat tindakan (alarm 10%, 3%, 1%, 0,3% kab-hari) untuk C, klimatologi, ILEWS; rumus sama dengan CAMPUR §5.3d. Hanya laporan.
5. **Metrik sekunder tenggang:** tiap k = 1, 2, 3 satu tabel sendiri; kec-hari sekunder; SWI irisan.
6. **QA susulan L1/L2 (ala Norwegia):** L1 = 7 hari sesudah 2027-04-30 (2027-05-07) dengan label pertama, bacaan awal tanpa `buka`; **L2 = paling cepat 2027-06-29** dengan label susulan. **Vonis memakai L2 saja**, sekali (`buka` menulis `.mulai`).

### 5.5 Daya, MDE, dan hasil nol

- `latih` mencatat dTSS minimum terdeteksi (`mde`, `mde_80`) dari simulasi bootstrap lipatan bergulir pada jumlah kejadian setara prospektif (5 biji, 100 ulangan) pada `y1`. Taksiran positif `y0` prospektif Nov-Apr: DIBI
  longsor 2025 total 1.040 kab-hari/tahun dan 2026 s.d. 28 Okt 280 (+35 g=1); musim hujan lebih padat, kasar 400-900 `y0` nasional (y1 ~2,5 kali). **BELUM DICEK**; `buka` memakai jumlah nyata.
- **Hasil nol (ditetapkan sekarang):** bila C TIDAK LULUS atau gerbang pembekuan menghentikannya, yang tertulis: "Pada data yang tersedia, sinyal hujan, lengas, dan kerentanan tidak mengalahkan klimatologi kab x bulan yang
  dihaluskan untuk longsor kab-hari; hambatan di label (kebiasaan lapor) dan hujan 0,5 derajat, bukan bentuk model." Konsekuensi (keputusan pemilik 4 Nov): **layar TETAP menayangkan model v1** yang ada (tidak dicabut), dengan label status uji GAGAL/TIDAK LULUS yang jujur dan tanpa klaim keterampilan; klimatologi kab x bulan hanya PEMBANDING, bukan tayangan baru. Model longsor TIDAK dikerjakan lagi pada label/sampel ini; protokol berikut harus menyatakan apa yang berubah dari DATA (label satelit, inventaris baru), bukan dari model. TIDAK MEYAKINKAN tidak membuka tayang; hanya boleh memperpanjang prospektif satu musim.

### 5.6 Komunikasi di layar (bila LULUS)

3-4 tingkat berdeskripsi dampak (pola Norwegia/Hong Kong; tingkat bawah murah, FAR >= 50% diterima, jangan dibaca "aman"): tingkat 3-4 menyebut dampak yang dapat terjadi (lereng curam, ruas jalan, permukiman di bawah tebing)
dan tindakan; peluang ditampilkan sebagai **"k dari n"**: "pada kondisi serupa (wilayah, bulan, tingkat ini), k dari n hari sebelumnya tercatat longsor di kab itu", k/n dari sel kalibrasi (wilayah x level) tahun latih.
Dilarang kata kepastian ("pasti", "akan terjadi", "aman"); dilarang menayangkan tingkat 3-4 untuk wilayah berstatus "belum cukup data"; hari hijau ditulis "tidak ada sinyal, bukan jaminan aman".

## 6. Kejujuran dan batas

- **Risiko seleksi 515 sel (ditutup lewat Q5 pemilik 4 Nov):** panen hujan berjalan urut kab DIBI terbanyak (320 sel pertama lancar), jadi 515 sel pertama diseleksi MENURUT LABEL (kab langganan lapor) dan himpunan kab
  yang tersisa lebih "mudah" bagi klimatologi. Karena itu `sidik` MENUNGGU 948 sel (tidak ada vonis, tidak ada sidik, pada himpunan 515). Rencana panen sisa 433 sel: `python3 scripts/longsor/hujan_riwayat.py` (lanjut otomatis,
  `KuotaHabis` berhenti), dijalankan SESUDAH `scripts/banjir/jam_era5.py` selesai dan SATU proses saja (server Open-Meteo menggantung bila > 2 proses). Anggaran bobot (angka ilmu longsor: ~23 bobot per lokasi 2017-kini):
  433 x 23 ~ 9.960 bobot, sekitar satu kuota harian penuh (batas harian 10.000 BELUM DICEK; batas per jam 5.000 = ~217 sel/jam), jadi 1-2 hari kalender dengan jeda tiap jam. Salinan `data/raw/longsor/hujan.json` disimpan di luar
  worktree sebelum dan sesudah panen (ranjau worktree dibuang). Bila kab bersel utuh 948 sel tetap tidak lengkap, kab parsial dikeluarkan dan daftar dibekukan di `latih.json`.

- Hujan ERA5 harian 0,5 derajat jauh lebih kasar dari LHASA (IMERG 0,1 derajat/30 menit); ERA5 meremehkan puncak (replay Bekasi 4-17 kali). Ambang dan P99 dalam "satuan ERA5" dan tidak berpindah ke satuan lain tanpa bukti. Hujan jam-an
  (IMERG Late/Final, GSMaP) belum ada; kurang bukti bahwa resep akan menambah di data sekasar ini.
- Skor kab = maks atas sel: kab besar tergelembung (audit §3, "arah belum jelas"); ditangani stratifikasi `n_sel`, tidak dikoreksi.
- Lantai menyerap bias antar-kab, BUKAN bias waktu (laju lapor tumbuh; DIBI 2026 terisi susulan; 2024 bolong). Platt per wilayah meredam sebagian.
- Statis PVMBG disusun dari inventaris yang bisa memuat longsor 2015-2024 (kebocoran lunak); WorldCover 2021 dipakai untuk 2017-2026 (statis); `lereng` dan `sesar` dari lab, bukan label.
- LHASA v2 dilatih pada ~96 ribu longsor dipool global; di sini ribuan, per wilayah ratusan. Bukti ML-menang bergantung pooling skala besar (benchmark), jadi H0 diharapkan kuat.
- Titik panas alarm Indonesia dalam LHASA (>10% hari) menandai bahwa FAR tinggi adalah gejala medan, bukan hanya model.
- ILEWS/Muntohar dipasang di sini dalam satuan yang tidak sama dengan aslinya (TRMM); kekalahan/kemenangan atas keduanya TIDAK menyatakan apa pun tentang sistem operasional aslinya.
- Hasil C tidak boleh dikutip sebagai kemajuan fisika longsor.

## 7. Daftar BELUM DICEK, dipisah

### A. MEMBLOKIR `latih`/`sidik` (harus selesai dan bukti ditulis ke `latih.json`; kegagalan = amandemen SEBELUM membekukan, atau aturan penurunan yang tertulis di bagian terkait)

1. Cakupan sel hujan: 515 dari 948 sel; kuota Open-Meteo harian. `sidik` MENUNGGU 433 sel sisa (rencana §6). Himpunan kab bersel utuh, `n_kab`, `P_w`, `T_w` dihitung dan dibekukan (§3.3) sesudah panen.
2. Penyelesai impor `model_kab_campur.py` (sedang dikerjakan agen banjir): fungsi yang dipakai stabil, hash dikunci; swauji (a) `beta = 0` -> `p = p0`, (b) `logit(p0)` berkoefisien 1, (c) `beta >= 0`, (d) mutasi label tahun `z` tidak mengubah lantai LOYO/fitur `z`.
3. (GBDT dibuang rev. 2; butir ini kosong.)
4. Lengas ERA5-Land per sel: BELUM ADA di cache (`precipitation_sum` saja); kuota untuk unduh jam-an/harian turunan. Gagal = S2/S3 dicoret (tertulis §3.2).
5. Tutupan WorldCover per kab (`scripts/banjir/kedap_kab.py` memuat pola ubin; kelas 20/30/40/60 vs kelas 50 yang dipakai banjir): ketersediaan ubin. Gagal = `lr_lahan` dihapus.
6. Cakupan jam-an ERA5 untuk sel longsor dan pemetaan grid 0,25 derajat (jam-an banjir) ke sel 0,5 derajat belum ada (64 sel tersimpan 4 Nov): SWI tetap sekunder pada rev. ini (§3.2); tidak memblokir.
7. Guard kode: pemotongan label 2026-10-18, pembuangan 2024, g=1 DIHITUNG POSITIF di `model_lhasa2.py` (dan v1 `model.label_dibi` tidak berubah), 5 poligon kab "None" dikeluarkan.
8. Sumber label evaluasi tahun 2022-2024: `public/data/logbook_kejadian.json` hanya 2025-2026 (115 `longsor` + 40 `banjir_longsor` terlihat); arsip `data/pusdalops/logbook_kejadian.csv` (`uji_logbook.arsip_baca`) dan rentang tahunnya BELUM DICEK.
   Sampai dipasang, `y1` lipatan F2-F3 = DIBI saja (kelonggaran dilaporkan, pola A-8 CAMPUR); F4-F5 gabungan.
9. Luas kab (poligon `public/geo/kabupaten`) untuk `a_k`; penduduk per kab dijumlah dari kunci `kec` `penduduk.json` (cek nama kec cocok dengan `daftar_kec`); stabilitas `gamma` (CI bootstrap kab).
10. Arsip PRAKIRAAN beku hujan per sel longsor untuk tenggang +1..+3 sudah berjalan atau tidak (hanya memblokir klaim prakiraan, bukan sidik nowcast; tidak bisa diisi mundur): bila belum mulai sebelum T, tenggang +1..+3 "tidak dinilai musim ini".
11. Kolom `n`/`gab` dan jenis DIBI ("Gerakan Tanah") pada `kejadian.json`; GLC hanya kontrol recall 2017-2018 (kolom akurasi lokasi).

### B. BOLEH MENYUSUL (laporan atau tahap berikutnya; tidak mengubah vonis atau sidik)

12. Nilai ambang Yuniawan dkk. 2022 (tak terbaca) dan verifikasi angka ILEWS 61/91 mm (hanya ringkasan; Guzzetti 2020 memuat 83 kejadian); satuan mm/jam dan definisi D untuk Muntohar.
13. Positif kec-hari 2025-2026 (nama kec tercocok) untuk analisis sekunder; positif prospektif per wilayah dan MDE80; jumlah kab aktif; waktu hitung 20.000 ulangan.
14. Koreksi bias hujan operasional -> ERA5 untuk longsor (acuan `koreksi_bias.py` banjir, per wilayah x tenggang), P2 untuk `sm` dan `swi`.
15. LHASA v2 resmi (probabilitas NASA) sebagai fitur/pembanding: akses IMERG/Earthdata batch BELUM DICEK; tidak dipakai di protokol ini.
16. IMERG Late/Final atau GSMaP jam-an 0,1 derajat sebagai pengganti hujan (peningkatan di luar protokol ini).
17. `jalan.geojson` cakupan nasional (alternatif `a_k`); EDuMaP matriks durasi (definisi belum dibaca ulang, Calvello dan Piciullo 2016); DEMNAS (menunggu akun) dan litologi (diblokir robots).
18. Identifikasi lain tatapan data longsor di luar jejak git (menaikkan m).

## 8. Kode dan sidik

- Berkas baru `scripts/longsor/model_lhasa2.py` (milik longsor) yang MENGIMPOR `model.py`, `dasar.py`, `kejadian.py` longsor dan, lewat importlib, `scripts/banjir/model_kab_campur.py`,
  `scripts/banjir/uji_logbook.py` (`label_dari`) tanpa mengubahnya. Mode: `baris` (fitur, tanpa label), `latih [--ulang]`, `gerbang` (lima lipatan), `sidik`, `buka --kering`, `buka`, `uji` (swauji tanpa jaringan).
  Keluaran `data/raw/longsor/model_lhasa2/` (bukan `public/`).
- **Swauji wajib** (tanpa jaringan, data mainan): lihat §7A2; ditambah (e) fitur baris hari `e` tidak berubah bila hujan > `e` dimutasi (kecuali `rH` yang memakai hari `e` utuh); `a2`, `a7`, `a14` hanya <= `e-1` dan terpisah;
  (f) `P99_s`/persentil/standardisasi lipatan tak berubah bila hujan tahun uji dimutasi; (g) pembeda indeks hari WIB vs UTC (SWI); (h) `zona_perki` tidak terbaca; (i) pemotongan label dan penolakan `buka` bila commit `.sidik` melewati awal jendela;
  (j) tenggang +k memakai prakiraan hanya dari terbit `<= e-k`; (k) 2024 tidak masuk latih/evaluasi, g=1 menjadi positif (mutasi tipe g mengubah `y0`), GLC/logbook tidak masuk latih; (k2) kolom statis ternormalisasi peringkat nonneg dan `beta >= 0` menjamin peluang tak turun saat `rH` naik (uji monoton); (k3) impor `model_kab_campur` (yang menambal `MK.LATIH` lewat `model_kab2`) TIDAK mengubah konstanta longsor (`model.LATIH`, `UJI_TAHUN`, `MULAI`) dan tidak mengubah keluaran `model.uji_balik` v1 (bandingkan sebelum/sesudah impor); (l) mutasi konstanta (`TAU`, ambang 500, alarm 10%/3%) tertangkap sidik.
- `latih` membekukan sha256: dokumen ini dan `PRAREG-LHASA2-AMANDEMEN.md` (bila ada), `model_lhasa2.py`, `model.py`, `rumus.py`, `dasar.py`, `kejadian.py`, `model_kab_campur.py`, `uji_logbook.py`, `kerentanan.json`,
  `pvmbg.json`, `fitur_statis.json`, `penduduk.json`, daftar kab/sel + manifest `hujan.json` (hash per sel), manifest `jam_era5` dan berkas lengas (bila dipakai), parameter SWI, berkas label + `label_26`. Sidik ditulis ke
  `scripts/longsor/model_lhasa2.sidik` dan di-commit sebelum hari prospektif pertama. Default argumen terikat saat `def`: baca konstanta global di badan fungsi (kasus ilmu 1 Nov).
- Pengulas: `validasi-model` (konteks bersih, bukan penulis dokumen ini) SEBELUM dibekukan; `penulis-gerbang` bila gerbang `tests/longsor` perlu aturan baru.

## 9. Keputusan pemilik (4 Nov 2026)

Diputuskan:
- **Q1** gerbang `y1` (+-1 hari), default draf. **Q2** alarm 10% (Waspada) dan 3% (Siaga), default draf. **Q6** m keluarga terpisah dari banjir, default draf (m = 10).
- **Q4** hari DIBI "Banjir dan Tanah Longsor" (g=1) DIHITUNG POSITIF; sensitivitas "g=1 dibuang" = kontrol K2 (bukan gerbang). Beda dari e979e5d di `model.py` v1 (sasaran v1 tetap g=0).
- **Q5** TUNGGU 433 sel hujan sebelum `sidik` (menutup seleksi kab menurut label); rencana panen di §6.
- **Q7** hasil nol: layar TETAP model v1 (tidak dicabut); klimatologi hanya pembanding (§5.5).
Dari tinjauan `validasi-model`: GBDT dibuang (semua wilayah regresi nonneg berpooling); Platt pada `y0`; statis berskala peringkat nonneg; lantai hanya DIBI (logbook/GLC bukan label latih).

Masih terbuka (ke pemilik): (a) ambang pemisahan wilayah `P_w >= 200`, `n_kab >= 15`, `T_w >= 4`; (b) tingkat 3-4 (1% dan 0,3% alarm) sebagai deskripsi dampak.
