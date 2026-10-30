# RISET-DAMPAK: hujan -> kejadian -> besaran (KK, rumah) per kabupaten

Dokumen pasangan `PRAREG-DAMPAK.md` (dibekukan). Skrip `model_dampak.py`. Ditulis bertahap: `latih` (bagian 1-3), `buka` (bagian 4), `skenario` (bagian 5).

## 1. Data dan penyimpangan yang dicatat

- Kab dimodelkan: 223 (punya CN, kapasitas, paparan lahan rendah). Kab berdebit GloFAS: 105.
- Kelompok tanah SoilGrids hilang untuk kab: CN diisi dengan modus provinsi/nasional (`cn_imputasi`): 45 kab dimodelkan terdampak (43 modus provinsi, 2 modus nasional). Asumsi, bukan pengukuran.
- Peluang dilatih 2016-2021 (berita Groundsource baru memadai sejak 2016); besaran memakai semua kejadian bertarget >0 sejak 2008.
- Positif = hari mulai kejadian (semua sumber); hari lanjutan kejadian (maks 30 hari) dikeluarkan dari latih. Fitur E/D besaran = maks hari mulai +-1.
- KK = logbook `kk`, selain itu DIBI menderita/3,5; target rumah terpisah (logbook rumah, selain itu DIBI terendam). Target <=0 dibuang.
- Fitur hujan POWER (MERRA-2, ~50 km) dan CN/kapasitas TR-55 adalah asumsi (lihat RISET-FITUR-BANJIR.md).
- **Penyimpangan §4**: pembanding `status.py` Waspada 2026 tidak dapat direproduksi: cache ERA5 `uji_logbook` yang ada hanya 20 sel (dari 220) dan tidak ada InaRISK/imax per kab. Penggantinya proksi **a3 POWER >= 40 mm** (ambang H3 Waspada status.py) dengan jumlah alarm model disamakan. Proksi bukan status.py sebenarnya.
- Debit D = (persentil debit - 50)/50, 0 bila tidak ada GloFAS. Musim = sin/cos hari-dalam-tahun. Hujan hulu DAS tidak ada (diwakili D).
- Tinggi/lama: hanya 2025-2026 (247/196 kejadian) < 150 kejadian pada masa latih, jadi PRAREG §1.6: sebaran empiris per kab bersyarat kelas hujan, bukan regresi.

## 2. Penyetelan (validasi 2022-2023)

- Peluang: varian **penuh**, m = 10 (logloss validasi terendah dari 15 kombinasi).
- KK: varian **penuh**, m = 10; B0 m = 10; MAE validasi B1 1.598 vs B0 1.637; skala selang s = 1.15.
- Rumah: varian **tanpa_D**, m = 10; B0 m = 10; MAE validasi B1 1.494 vs B0 1.537; s = 1.1.

### Latihan-kering pada VALIDASI 2022-2023 (bukan vonis; uji fungsi yang sama dengan `buka`)

Peluang kejadian (kab-hari): n=160600, kejadian=2267, alarm=23152, ETS model 0.024, ETS proksi status 0.017, dETS 0.006 [0.002; 0.011], BSS 0.002 [0.001; 0.004], LULUS=True

| target | n | blok | MAE B1 | MAE B0 | skill [CI95] | cakupan 80% [CI95] | LULUS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kk | 1201 | 343 | 1.598 | 1.637 | 0.024 [0.006; 0.037] | 0.796 [0.767; 0.820] | True |
| rumah | 1143 | 339 | 1.494 | 1.537 | 0.028 [0.014; 0.041] | 0.787 [0.766; 0.813] | True |

Ablasi debit pada 105 kab berdebit GloFAS (dilaporkan, bukan gerbang):

| model | dETS | BSS |
| --- | --- | --- |
| peluang dengan D | 0.006 [0.001; 0.012] | 0.005 [0.003; 0.007] |
| peluang tanpa D | -0.001 [-0.006; 0.005] | 0.001 [-0.002; 0.003] |

- KK mag_dengan_D: n=631, skill 0.019 [-0.006; 0.043], cakupan80 0.797 [0.763; 0.828]
- KK mag_tanpa_D: n=631, skill 0.017 [-0.001; 0.034], cakupan80 0.786 [0.754; 0.817]

## 3. Konstanta dan koefisien

Lihat tabel di bawah dan `data/raw/banjir/dampak/konstanta.json` (per kab: CN, kapasitas, a_k, c_k).

| model | variabel | koefisien | CI95 (bootstrap kab) |
| --- | --- | --- | --- |
| peluang b | log1p(E) | 0.2885 | [0.2657; 0.3257] |
| peluang b | D (debit pct) | 1.0629 | [0.9943; 1.2074] |
| peluang b | musim sin | 0.1102 | [0.0655; 0.1673] |
| peluang b | musim cos | 0.2753 | [0.2079; 0.3573] |
| KK d | log1p(E) | 0.1492 | [0.0827; 0.2029] |
| KK d | D (debit pct) | 0.6084 | [0.3115; 0.9387] |
| KK d | log paparan | 0.4127 | [0.2231; 0.5796] |
| rumah d | log1p(E) | 0.1660 | [0.1147; 0.2100] |
| rumah d | log paparan | 0.4030 | [0.2464; 0.5269] |

Konstanta per kab: a_k (intersep logit peluang), c_k (intersep log1p KK), CN_II, kapasitas_mm; a_k dan c_k ditarik ke provinsi lalu nasional dengan bobot n/(n+m). Koefisien b/d bersama seluruh kab; hanya intersep yang berbeda per daerah.


## 4. Hasil uji 2024-01-01..2026-09-30 (dibuka sekali)

Penanda: `model_dampak.buka`. Besaran: kejadian bertarget >0 pada 6939..7942 (indeks hari); peluang: hanya 2026.

### Vonis

Peluang kejadian (kab-hari): n=58789, kejadian=1197, alarm=6933, ETS model 0.026, ETS proksi status 0.021, dETS 0.005 [-0.002; 0.012], BSS 0.002 [0.000; 0.003], LULUS=False

| target | n | blok | MAE B1 | MAE B0 | skill [CI95] | cakupan 80% [CI95] | LULUS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kk | 1939 | 582 | 1.545 | 1.605 | 0.037 [0.024; 0.051] | 0.805 [0.783; 0.825] | True |
| rumah | 1807 | 564 | 1.486 | 1.527 | 0.027 [0.015; 0.038] | 0.789 [0.768; 0.811] | True |

Ablasi debit pada 105 kab berdebit GloFAS (dilaporkan, bukan gerbang):

| model | dETS | BSS |
| --- | --- | --- |
| peluang dengan D | 0.001 [-0.008; 0.011] | 0.001 [-0.001; 0.003] |
| peluang tanpa D | -0.007 [-0.016; 0.003] | 0.002 [-0.000; 0.004] |

- KK mag_dengan_D: n=292, skill 0.041 [0.005; 0.076], cakupan80 0.781 [0.738; 0.828]
- KK mag_tanpa_D: n=292, skill 0.027 [-0.000; 0.053], cakupan80 0.777 [0.726; 0.827]

Peluang 2024-2025 (INFORMASI, bukan vonis; sudah dibuka di RISET-MODEL-KAB): {"n_baris": 158508, "n_pos": 3190, "n_alarm": 26979, "ETS_model": 0.029486471682430647, "ETS_ref": 0.017280855206091076, "dETS": [0.012205616476339571, 0.00772066037905009, 0.016611428052583865], "BSS": [0.0038265094548131096, 0.0026005784335014714, 0.005115111439153985], "lulus": true}

**Vonis KK: LULUS; rumah: LULUS; peluang 2026: TIDAK LULUS.**

Aturan PRAREG §4: bila tidak lulus, model tidak tayang sebagai prediksi; yang tayang hanya sebaran empiris historis per kab berlabel 'berdasarkan N kejadian'.

## 5. Contoh: hujan 200 mm / 3 hari di Aceh Tenggara (11.02)

Basis: 56 kejadian terlapor (latih peluang 2016-2021), 24 kejadian ber-KK dan 21 ber-rumah (latih <=2021).

- Kondisi kering: hujan 200 mm 3 hari di Aceh Tenggara: peluang banjir terlapor pada hari itu 7.7%; bila terjadi ~1145 KK (rentang 70-11538) dan ~145 rumah (74-8973); limpasan 89.8 mm, kelebihan atas kapasitas 65.3 mm.
- Kondisi normal: hujan 200 mm 3 hari di Aceh Tenggara: peluang banjir terlapor pada hari itu 8.9%; bila terjadi ~1242 KK (rentang 76-12516) dan ~159 rumah (82-9823); limpasan 137.8 mm, kelebihan atas kapasitas 113.3 mm.
- Kondisi basah: hujan 200 mm 3 hari di Aceh Tenggara: peluang banjir terlapor pada hari itu 9.4%; bila terjadi ~1288 KK (rentang 79-12984) dan ~165 rumah (85-10232); limpasan 169.6 mm, kelebihan atas kapasitas 145.1 mm.
- tinggi air (cm): empiris p10/p50/p90 = 169/200/1500, berdasarkan 5 kejadian (tingkat: nasional+kelas).
- lama (hari): empiris p10/p50/p90 = 5/48/86, berdasarkan 6 kejadian (tingkat: nasional+kelas).

Catatan: peluang per HARI-kab, bukan 'peluang banjir pada hujan itu'; angka KK memakai asumsi 3,5 jiwa/KK untuk DIBI. Bila vonis model di bagian 4 TIDAK LULUS, angka model di atas tidak tayang sebagai prediksi; hanya sebaran empiris historis yang boleh tayang, dengan label 'berdasarkan N kejadian'.
