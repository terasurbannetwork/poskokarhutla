# RISET-GRRR: Google Runoff Reanalysis & Reforecast untuk Indonesia, dan bandingnya dengan ambang sungai kita

Ditulis 1 Nov 2026. Status: PANEN SELESAI, belum dipakai di model atau layar. Sumber wajib disebut: **Google Runoff Reanalysis & Reforecast, CC BY 4.0**
(`gs://flood-forecasting/hydrologic_predictions/`, publik tanpa kunci). Skrip: `scripts/banjir/grrr.py` (lokal, butuh zarr>=3; BUKAN di workflow).

## 1. Model yang dipilih: `distributed_model_2026_11`

| Sifat | `model_id_8583a5c2_v0` (lama) | `distributed_model_2026_11` (baru, DIPAKAI) |
| --- | --- | --- |
| Format | zarr v2, blosc lz4 | zarr v3, zstd (butuh zarr>=3; tanpa `.zmetadata`, metadata di `zarr.json`) |
| Gauge (global) | 1.031.646 (`hybas_*`) | 970.005 di deret, 1.034.083 di berkas lokasi (`subhybas_*`) |
| Reanalisis | 1980-01-01 .. 2023, 16.063 hari | 1980-12-31 .. 2025-12-30, 16.436 hari |
| Reforecast | 2016 .. 2023, 2.738 issue x 8 lead (0-7) | 2016-01-01 .. 2025-12-31, 3.653 issue x 11 lead (0-10) |
| Periode ulang | zarr: 2,5,7,10,15,20,25,50,100,200 | parquet: 1,01; 2; 5; 10; 20; 25; 50; 100 |
| Outlet di bbox Indonesia (lat -11,5..6,5; lon 94,5..141,5) | 17.314 | 17.314, **koordinat identik titik demi titik** |

Alasan: cakupan Indonesia sama (17.314 outlet, koordinat sama), rentang lebih panjang dan lebih baru (sampai akhir 2025, sama dengan
rentang ambang sungai kita 1997-2025), lead lebih panjang (0-10 hari), dan Google menyebutnya model terbaru. Harga: tidak ada Q200, dan
format v3 (stdlib tidak bisa; zarr<3 gagal). **Hidrologinya BERBEDA dari model lama pada outlet yang sama**: untuk 17.030 outlet yang
bisa dicocokkan, Q2 baru / Q2 lama median 1,07 (P5-P95 0,53-2,07), Q20 median 1,05 (0,50-2,15). Jadi bukan sekadar pembaruan; hasil yang
dibangun di atas satu model tidak boleh dibawa ke model lain.

Urutan gauge di zarr TIDAK terurut menurut id (Indonesia ada di posisi 569.849-953.526 dari 970.005, 96% berurutan); 389 dari 7.579
chunk (128 gauge) menyentuh Indonesia. Itu yang membuat unduhan hemat: 389 chunk reanalisis (~7,5 MB tersimpan per chunk penuh) dan
389 chunk reforecast, bukan 54 GB.

## 2. Hasil panen

- 17.314 outlet bbox; **12.574 jatuh di poligon kabupaten Indonesia (471 kabupaten)**, 4.740 tidak (laut, pesisir, Malaysia, PNG, Timor Leste).
  Terbanyak: Kalteng 1.140, Kalbar 1.102, Kaltim 911, Papua Selatan 844, Sumsel 654, Riau 643, Papua 589.
- Q2 per outlet: median 47 m3/s (P25 22,7; P75 138,8; maks 18.775). 953 outlet Q2 >= 1.000 m3/s, 5.353 outlet Q2 >= 100 m3/s.
  Median Q20/Q2 = 1,47; Q100/Q2 = 1,74.
- Reanalisis 16.436 hari, 0,43% NaN, maks 26.934 m3/s. Reforecast float16 (maks 27.616 m3/s, < 60.000 lolos).
- Sanity ambang: Gumbel-momen (metode yang sama dengan `sungai.py`) pada reanalisis GRRR 1981-2025 terhadap periode ulang resmi
  parquet, 17.308 outlet: rasio median Q2 0,997, Q5 0,992, Q20 1,001 (P25-P75 0,985-1,017; Q2 min 0,58, maks 2,36; Q5 maks 3,31).
  Gumbel pada reanalisis GRRR menyamai fit resmi Google; sisa selisih terhadap ambang kita = model, lokasi, dan skala sel, **tidak dipisahkan**.
- Angka model lama vs baru, float16 maks (27.616 m3/s), dan chunk (389 dari 7.579) kini tersimpan: `grrr.py bandingmodel` -> `ringkas.json[model_lama_vs_baru]`.

Ukuran berkas:

| Jalur | Ukuran | Git |
| --- | --- | --- |
| `data/raw/banjir/grrr/reanalisis/ck*.npz` (389 berkas, float32) | 1,00 GB | git-ignore (`data/raw/banjir/*`) |
| `data/raw/banjir/grrr/reforecast/ck*.npz` (389 berkas, float16) | 1,11 GB | git-ignore |
| `data/raw/banjir/grrr/{outlet_baru.npz, indeks_*.json, ringkas.json, banding.json, unduhan.json}` | < 2 MB | git-ignore |
| `public/banjir/data/grrr_ambang.json` | 1,35 MB | belum dilacak; layak commit (< 3 MB) bila dipakai |

R2 `arsip/grrr/`: TIDAK diunggah (tanpa `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` di sesi ini; `unggah_r2()` melewatinya). Dua GB
mentah mudah diunduh ulang (~5 menit reanalisis, ~12 menit reforecast dengan 8 thread), jadi arsip R2 tidak mendesak.

## 3. Banding dengan ambang sungai kita

Ambang kita (`data/raw/banjir/sungai_ambang.json`): Gumbel-momen dari debit harian GloFAS 1997-2025 (Open-Meteo), **baru 14 titik**,
semuanya di Papua Selatan (lat -7,1..-5,1; lon 137,9..140,9), karena langkah B jalan 6 titik/hari. Debit GloFAS di titik itu 540-9.443
m3/s (sel 0,05 derajat di sungai besar: Digul, Eilanden, Mappi). Pencocokan titik kita ke outlet GRRR dalam radius 30 km (16-29 calon
per titik) memakai tiga aturan, karena DAS tidak tersedia:

| Aturan pasangan | Q2 GRRR / kita (median) | Q5 | Q20 | Catatan |
| --- | --- | --- | --- | --- |
| Outlet terdekat | 0,229 (P25 0,018; P75 0,777) | 0,251 | 0,272 | bias rendah: sub-DAS terdekat, bukan batang utama (14 outlet unik) |
| Terdekat, Gumbel GRRR 1997-2025 (tahun sama dengan kita) | 0,254 | 0,267 | 0,280 | hampir sama: metode dan tahun bukan penyebab |
| Calon yang Q2-nya paling dekat dengan kita | **0,837** (P25 0,616; P75 0,920; rentang 0,27-1,45) | 0,876 | 0,875 | BIAS ke 1 oleh konstruksinya: batas atas kecocokan |
| Median semua calon | 0,052 | 0,070 | 0,076 | seluruh sub-DAS di radius, kebanyakan kecil |

Bacaan:
1. **Pencocokan lokasi adalah masalah utamanya.** Outlet terdekat memberi rasio 0,004-0,99 (median 0,23): sub-DAS `subhybas` di dekat titik GloFAS
   sebagian besar anak sungai, bukan batang utama. Contoh: Asmat (-5,625; 138,625) kita Q2 9.443 m3/s, outlet terdekat 3,8 km Q2 37,7 m3/s.
2. Aturan "terbaik" memilih calon dengan Q2 terdekat ke Q2 kita, jadi rasionya mendekati 1 **menurut konstruksinya** (median 0,84; 8 dari 14
   titik di 0,6-0,95, 2 titik di bawah 0,5 yaitu 0,27 dan 0,47, satu di 0,50, satu di 1,45). Itu BUKAN bukti kesepadanan atau bias GRRR.
   n efektif: 12 outlet unik, karena satu outlet (`subhybas_5120043470`) dipilih untuk 3 titik, sehingga 14 titik tidak independen.
3. Bentuk kurva, berpasangan: (Q20/Q2 GRRR) / (Q20/Q2 kita) pada pasangan yang sama, median 1,01 (terdekat; P25-P75 0,97-1,11) dan 0,98
   (terbaik; 0,89-1,03). Bentuk kurva searah pada 14 titik ini (kita Q20/Q2 = 1,31-1,46). Perbandingan lama dengan median se-Indonesia 1,47
   dihapus karena bukan berpasangan (populasi beda).
4. Kesimpulan: **tidak ada bukti** GRRR sepadan, lebih tinggi, atau lebih rendah dari ambang kita, karena pencocokan DAS (luas, batang utama)
   tidak tersedia. Yang terbukti hanya: (a) jarak saja menyesatkan, (b) bentuk kurva Q20/Q2 searah, (c) metode Gumbel bukan sumber selisih.
5. **n = 14 titik di satu provinsi (Papua Selatan), sungai besar saja; jangan diekstrapolasi** ke Jawa, Sumatera, Kalimantan, atau sungai kecil.
   Pembanding GloFAS (Open-Meteo) sendiri belum divalidasi ke debit terukur, jadi rasio ini bukan bias GRRR terhadap kebenaran.

## 4. Batas dan ranjau

- Lokasi outlet berlabel **UNOFFICIAL** oleh Google; outlet pesisir rancu (muara, delta, atau sub-DAS kecil di garis pantai). 4.740 dari
  17.314 outlet tidak masuk poligon kabupaten mana pun, termasuk negara tetangga di dalam bbox.
- Ini **reanalisis** (model hidrologi dipaksa cuaca historis), bukan prakiraan langsung. Reforecast (2016-2025) adalah prakiraan ulang
  historis: mereka sudah ada sebagai berkas, bukan umpan operasional.
- Ukuran sampel kita 14 titik, satu wilayah (Papua Selatan). Sungai Jawa, Sumatera, dan Kalimantan belum punya ambang kita sama
  sekali; banding di sana menunggu `sungai.py` langkah B selesai (~192 titik) atau GRRR dipakai langsung.
- Zarr v3: `numcodecs` murni tidak cukup; butuh `zarr>=3`. Kode gcsfs menutup sesi aiohttp dengan galat bising saat keluar
  (`Task was destroyed but it is pending`); tidak memengaruhi hasil.
- Daftar gauge reanalisis (970.005) lebih sedikit dari daftar lokasi (1.034.083); 17.314 outlet bbox semuanya ada di reanalisis.
- `gauge_id` string bertipe `StringDType` (numpy 2): jangan mengandalkan `S`/`U` dtype lama.

## 5. Usulan rancangan pemakaian di model (BUTUH PRAREG terpisah; TIDAK dikerjakan di sini)

Pertanyaan: apakah sinyal GRRR menambah daya pisah kejadian banjir kabupaten-hari (DIBI) di atas acuan, seperti `PRAREG-FLOODHUB.md`?
Syarat bekukan sebelum melihat label.

1. **Pembagian waktu:** latih/pilih 2016-2021, uji 2022-2025 dibuka SEKALI. CI bootstrap blok kabupaten x tahun. Terima hanya bila CI
   selisih ETS (model + GRRR minus pembanding) seluruhnya > 0. Hasil negatif dilaporkan apa adanya.
2. **Ambang** Q2/Q5/Q20 dihitung hanya dari tahun <= 2021 (Gumbel-momen pada reanalisis GRRR, bukan RP resmi yang memakai seluruh deret).
3. **Periode latih model Google:** catat dari dokumentasi Google periode latih `distributed_model_2026_11` (BELUM diketahui pembuat).
   Bila tumpang tindih dengan 2022-2025, uji TIDAK boleh disebut murni di luar-sampel.
4. **Fitur B (dinamis):** `Q_reanalisis / Q2` per kabupaten-hari, jendela trailing t-2..t (bukan terpusat). Wajib berlabel
   **"prakiraan sempurna (reanalisis)"**: reanalisis memakai cuaca teramati, jadi batas atas keterampilan operasional.
5. **Pemilihan outlet per kabupaten:** kabupaten tanpa outlet dikeluarkan dari SEMUA pembanding dan jumlahnya dilaporkan (saat ini 471
   kabupaten punya outlet). Fitur = maks (Q/Q2) atas SEMUA outlet kabupaten dengan Q2 >= persentil tetap (dibekukan), bukan satu outlet.
   Batas: banjir kota kecil/drainase perkotaan tidak tertangkap sub-DAS ini.
6. **Fitur C (reforecast, label "hindcast"):** dinilai langsung ke DIBI pada lead 1/3/5/7/10 hari dan dibandingkan dengan Fitur B.
   Prakiraan operasional harian GRRR tidak ada di bucket publik; itu syarat sebelum status atau layar bergantung pada GRRR.
7. **Label DIBI:** dibatasi ke tahun pencatatan stabil dan hasil dilaporkan per tahun (bukan hanya agregat).
8. **Pembanding utama:** `model_kab` + hujan 3 hari (`status.py`). Ambang GloFAS 14 titik hanya untuk kabupaten yang tercakup.
9. Rujukan metodologi selang kejadian: ikuti `PRAREG-FLOODHUB.md` (rujukan Nearing et al. 2024 di sana; belum dicek ke Crossref oleh dokumen ini).

## 6. Cara mengulang

```
uv run --with "zarr>=3" --with numcodecs --with numpy --with fsspec --with gcsfs --with pyarrow --with aiohttp \
    python scripts/banjir/grrr.py tarik        # lanjut bila putus; --tanpa-reforecast untuk reanalisis saja
... grrr.py ringkas        # data/raw/banjir/grrr/ringkas.json
... grrr.py bandingmodel   # ringkas.json[model_lama_vs_baru]
... grrr.py banding        # data/raw/banjir/grrr/banding.json (--radius 30)
python3 scripts/banjir/grrr.py uji      # luring, stdlib saja
```

## 7. Hasil uji (2 Nov 2026)

Sumber seluruh angka: `data/raw/banjir/model_kab_grrr/sia.json` dan `buka.json` (sidik `f15902e992611792`, latih ulang 1x karena galat teknis A1/A2,
`PRAREG-GRRR.md` §8; label Uji A sha256 `5425247046beb3df...`, Uji B `a4ca24ad577bf266...`). `sia` 2024 dijalankan sekali, `buka` 2024-2025 sekali.
Cakupan: n = 18.759 kab-hari, 306 hari kejadian (laju 1,63%), **27 kabupaten** (8.358 baris dari kabupaten tanpa outlet GRRR dikeluarkan dari
keempat model; 1.287 baris tanpa CHIRPS dan 66 tanpa hulu dikeluarkan lebih dulu oleh kerangka HULU). Angka ini TIDAK sebanding dengan angka HULU (39 kabupaten).

### 7.1 Kesia-siaan (`sia`, Uji A 2024: n 9.882, 139 kejadian, 27 kab)

AUC M0 0,7387, M3 0,7773, M0G 0,8044, **M3G 0,8143**, klimatologi 0,6552. M3G-M3: dBSS +0,01559 (CI99,2 [+0,00535, +0,02673], 10.000 ulangan); dETS Waspada +0,00276 ([-0,00109, +0,00727]); dETS Siaga +0,01074 ([-0,00583, +0,02816]).
M0G-M0: dETS Waspada +0,0037. Vonis `sia` kedua kontras: "lanjut" (titik dETS Waspada > 0; `sia` hanya bisa menolak).

### 7.2 Uji final (`buka`, 2024-2025 gabungan)

| Model | AUC | Brier | logloss |
| --- | --- | --- | --- |
| M0 (HULU, baris sama) | 0,7355 | 0,015746 | 0,07726 |
| M3 (HULU + CHIRPS/hulu) | 0,7692 | 0,015676 | 0,07504 |
| M0G (M0 + GRRR) | 0,7915 | 0,015439 | 0,07284 |
| **M3G (M3 + GRRR)** | **0,8039** | **0,015418** | **0,07196** |
| klimatologi kab-bulan terkalibrasi | 0,6536 | 0,015957 | 0,08115 |

ETS pada jumlah alarm sama dengan aturan `status.py`: Waspada M0 0,0156, M3 0,0176, M0G 0,0191, M3G 0,0207, aturan 0,0128 (6.532 alarm);
Siaga M0 0,0459, M3 0,0511, M0G 0,0662, M3G 0,0647, aturan 0,0271 (1.217 alarm).

Kontras (selang 99,2% = persentil 0,4 dan 99,6; bawah = terkecil dari dua skema blok, atas = terbesar; 10.000 ulangan):

| Kontras | dBSS | dETS Waspada | dETS Siaga |
| --- | --- | --- | --- |
| G1 M3G - M3 | +0,01616 [+0,00603, +0,02662] | +0,00314 [+0,00042, +0,00638] | +0,01358 [+0,00113, +0,02758] |
| G2 M0G - M0 | +0,01927 [+0,01081, +0,02812] | +0,00359 [+0,00039, +0,00703] | +0,02030 [+0,00548, +0,03520] |

**Vonis (apa adanya, kedua kontras sama):** "LULUS (daya rendah); bukti-konsep prakiraan sempurna (uji pakai-ulang); bukan bukti operasional".
Semua syarat batas bawah > 0 terpenuhi; veto 2025 lolos (titik dETS Waspada 2025 > 0, §7.3); bukan "PEKA LABEL" (kontrol DIBI-saja G1 Waspada +0,00392
[+0,00076, +0,00756], G2 +0,00328 [+0,00003, +0,00674]). "Daya rendah": MDE 80% dETS Waspada G1 0,0051 dan G2 0,0057, melebihi ambang relatif 0,0026
(0,25 x ETS aturan validasi 0,0104); selisih terukur (0,0031 dan 0,0036) lebih kecil dari yang bisa dibedakan dengan daya 80%.
Batas bawah dETS Waspada hanya 0,0004: lulus dengan margin tipis.

### 7.3 Per tahun (deskriptif, bukan gerbang; 2.000 ulangan, selang 99,2%)

| Tahun | Kontras | dBSS | dETS Waspada | dETS Siaga |
| --- | --- | --- | --- | --- |
| 2024 | M3G-M3 | +0,01559 [+0,00508, +0,02719] | +0,00276 [-0,00102, +0,00753] | +0,01074 [-0,00577, +0,02890] |
| 2024 | M0G-M0 | +0,02265 [+0,01120, +0,03526] | +0,00366 [-0,00033, +0,00836] | +0,02914 [+0,00746, +0,05037] |
| 2025 | M3G-M3 | +0,01665 [-0,00065, +0,03270] | +0,00096 [-0,00348, +0,00525] | +0,01487 [-0,00406, +0,03823] |
| 2025 | M0G-M0 | +0,01645 [+0,00487, +0,02985] | +0,00320 [-0,00239, +0,00945] | +0,01180 [-0,00831, +0,03303] |

**Veto 2025 (§6a butir 3):** LOLOS untuk kedua kontras (titik dETS Waspada 2025: G1 +0,00096, G2 +0,00320; keduanya > 0), tetapi hanya tipis untuk G1:
+0,00096 dengan selang [-0,00348, +0,00525] (3.199 alarm) tidak bisa dibedakan dari nol, dan dBSS G1 2025 selang pulau-minggu memuat 0. Tahun yang paling bersih
dari hidrologi latih Google (§6 ancaman a) memberi dETS Waspada paling kecil untuk G1 (dBSS 2025 +0,01665 tidak lebih kecil dari 2024 +0,01559); arah dETS itu mencurigakan terhadap kebocoran periode latih Google pada 2024,
meski dengan dua tahun dan selang selebar ini tidak bisa dipastikan. Per pulau (G1 dETS Waspada, dengan jumlah kejadian): Jawa +0,0033 (138 kej),
Kalimantan +0,0017 (58), Sulawesi +0,0057 (46), Sumatra +0,0032 (46), Maluku-Papua -0,0103 (17), Bali-Nusa Tenggara -0,0011 (1 kej, tidak bermakna).

### 7.4 Uji sekunder hindcast (reforecast, deskriptif, bukan vonis)

Model reanalisis dipakai apa adanya dengan kolom GRRR diganti reforecast pada lead L (n 18.759, 306 kej, 2.000 ulangan):

| Masukan GRRR | AUC `g_rasio` sendirian | G1 dETS Waspada | G1 dBSS |
| --- | --- | --- | --- |
| reanalisis (prakiraan sempurna) | 0,7936 | +0,00314 [+0,00051, +0,00604] | +0,01616 [+0,00603, +0,02751] |
| hindcast lead 1 | 0,7162 | +0,00016 [-0,00263, +0,00282] | +0,00089 [-0,00905, +0,01124] |
| hindcast lead 3 | 0,6877 | -0,00078 [-0,00318, +0,00149] | -0,00348 [-0,01154, +0,00494] |
| hindcast lead 5 | 0,6763 | -0,00109 [-0,00364, +0,00137] | -0,00520 [-0,01404, +0,00372] |
| hindcast lead 7 | 0,6709 | -0,00078 [-0,00324, +0,00159] | -0,00669 [-0,01505, +0,00269] |
| hindcast lead 10 | 0,6642 | -0,00109 [-0,00373, +0,00121] | -0,00701 [-0,01732, +0,00327] |

Baris "reanalisis" di sini memakai 2.000 ulangan (sekunder), sedangkan G1 di §7.2 memakai 10.000, maka selangnya sedikit berbeda untuk titik yang sama.

Kenaikan keterampilan menghilang begitu GRRR diganti prakiraan: sudah pada lead 1 titiknya ~0 dan dari lead 3 negatif (selang memuat 0). Hasil G2 sama arahnya
(lead 3 dETS 0,0000, lead 5 -0,00093). Inilah bukti terkuat bahwa kenaikan §7.2 adalah sifat "prakiraan sempurna", bukan keterampilan operasional.

### 7.5 Batasan

- Reanalisis dipaksa cuaca teramati, jadi §7.2 adalah batas atas; hindcast (§7.4) menunjukkan keuntungan lenyap pada prakiraan nyata. Prakiraan harian operasional GRRR tidak ada di bucket publik.
- Uji pakai-ulang: 2024-2025 sudah dilihat empat kali sebelum rancangan ini (`PRAREG-GRRR.md` §5, m = 6); selang 99,2% penalti ad hoc, bukan jaminan galat keluarga.
- Hanya 27 kabupaten beroutlet; Maluku-Papua dan Bali-NT nyaris tak punya kejadian; banjir kota/drainase perkotaan tidak tertangkap sub-DAS.
- Kenaikan ETS kecil (+0,003 Waspada; +0,014 Siaga) dan daya rendah; periode latih Google belum diketahui, 2024 mungkin tercemar.
- Lulus berarti layak diuji prospektif pada sumber debit operasional, BUKAN boleh dipasang; `status.py` tidak ditimpa.

### 7.6 Uji bergulir per tahun (deskriptif, BUKAN uji konfirmasi)

`python3 scripts/banjir/model_kab_grrr.py bergulir` -> `data/raw/banjir/model_kab_grrr/bergulir.json`. Untuk tiap T di 2020..2025: pohon M3 dan M3G dilatih
pada 2016..T-2 (label gabungan DIBI + logbook seperti kandidat; frekuensi, persentil, klimatologi dihitung ulang hanya dari tahun itu), Platt 5 biji
pada **satu** tahun T-1 (kandidat memakai dua tahun validasi; ini penyimpangan terpaksa karena tak ada validasi lain), dinilai pada T dengan label DIBI.
Kelompok (GBDT), fitur aktif, dan hiperparameter per model diambil dari `kandidat.json` tanpa disetel ulang per T. Ini BUKAN berarti bersih: pilihan itu dibuat di validasi 2022-2023, jadi T=2022 dan 2023 memakai seleksi yang melihat tahun ujinya sendiri, dan T=2020-2021 memakai pilihan dari data sesudah T. Tanpa bootstrap, hanya titik.
Q2 GRRR tetap dari <= 2021 (`fitur.json.gz`, tanpa label) untuk semua T, jadi untuk T <= 2021 Q2 memakai deret sesudah T (tanpa label, tetapi bukan prakiraan murni); hanya T=2022-2025 bebas pandangan ke depan untuk skala debit. Selain itu logbook 2022-2023 ikut melatih untuk T >= 2024 (protokol memotong label latih di 2021), beda dari PRAREG.
Baris yang dinilai sama dengan `sia`/`buka` (27 kab); 2025 hanya 8.877 baris karena CHIRPS 2025-05 hilang dan GRRR berakhir 2025-12-30.

| T | latih (th, kej) | n, kej uji | AUC M3 | AUC M3G | dBSS M3G-M3 | dETS Waspada M3G-M3 | ETS Waspada M3, M3G |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2020 | 2016-2018, 468 | 9.882, 185 | 0,7961 | 0,8313 | +0,02063 | +0,00352 | 0,0223, 0,0258 |
| 2021 | 2016-2019, 612 | 9.855, 175 | 0,7564 | 0,8107 | +0,01609 | +0,00433 | 0,0211, 0,0254 |
| 2022 | 2016-2020, 896 | 9.855, 173 | 0,7470 | 0,7779 | +0,00715 | +0,00204 | 0,0181, 0,0202 |
| 2023 | 2016-2021, 1.071 | 9.855, 124 | 0,8069 | 0,8332 | +0,01220 | +0,00197 | 0,0213, 0,0233 |
| 2024 | 2016-2022, 1.315 | 9.882, 139 | 0,8081 | 0,8379 | +0,02194 | +0,00338 | 0,0175, 0,0209 |
| 2025 | 2016-2023, 1.483 | 8.877, 167 | 0,7889 | 0,8149 | +0,01811 | -0,00032 | 0,0239, 0,0236 |

Terbaca: dBSS positif di keenam tahun (rerata +0,0160), AUC M3G > M3 di keenam tahun (+0,026 sampai +0,055), dETS Waspada positif di lima dari enam tahun,
**negatif di 2025 (-0,00032)**, tahun yang paling bersih dari hidrologi latih Google. Hasil 2024 dan 2025 di sini berbeda dari angka `buka` (2024 dBSS
+0,02194 vs +0,01559; 2025 dETS -0,00032 vs +0,00096) karena latihnya berbeda (2016-2022 / 2016-2023 dengan label 2022-2023 ikut melatih, Platt satu tahun),
bukan karena data uji berbeda; itu mengukur seberapa peka kenaikan terhadap resep latih, dan 2025 tetap tanpa bukti ETS. Dengan 124-185 kejadian per tahun
dan tanpa selang, tidak ada kesimpulan formal; ini hanya menunjukkan tanda dBSS/AUC konsisten dan dETS Waspada rapuh.

### 7.7 Model final M3G (2016-2025) dan kalibrasi luar-lipat

`python3 scripts/banjir/model_kab_grrr.py final` -> `data/raw/banjir/model_kab_grrr/final.json` (202 KB; model, `frek` per kab, tabel kalibrasi). Resep M3G kandidat
(GBDT kedalaman 3, laju 0,05, 160 pohon, fitur aktif sama, 5 biji), pohon dilatih pada seluruh 97.113 kab-hari 2016-2025 (27 kab; 1.789 hari kejadian
gabungan DIBI + logbook sebagai label latih; 1.410 hari DIBI sebagai label nilai). Platt tiap biji dipasang pada logit **luar-lipat**: 5 lipat dua tahun
(2016-17, 2018-19, 2020-21, 2022-23, 2024-25), tiap lipat dinilai oleh pohon yang tidak melihat tahunnya; peluang = rerata 5 biji. Tabel di bawah dari
peluang luar-lipat itu (label DIBI): AUC 0.8296, Brier 0.01378, logloss 0.06421 (klimatologi kab-bulan mentah dalam-sampel Brier 0.01406).

| Desil | n | rentang peluang | rata-rata prediksi | kejadian | frekuensi kejadian |
| --- | --- | --- | --- | --- | --- |
| 1 | 9711 | 0.00016 - 0.00079 | 0.00053 | 3 | 0.00031 |
| 2 | 9711 | 0.00079 - 0.00143 | 0.00108 | 6 | 0.00062 |
| 3 | 9711 | 0.00143 - 0.00244 | 0.00190 | 19 | 0.00196 |
| 4 | 9712 | 0.00245 - 0.00392 | 0.00314 | 30 | 0.00309 |
| 5 | 9711 | 0.00392 - 0.00601 | 0.00490 | 40 | 0.00412 |
| 6 | 9711 | 0.00601 - 0.00901 | 0.00740 | 75 | 0.00772 |
| 7 | 9712 | 0.00901 - 0.01365 | 0.01113 | 138 | 0.01421 |
| 8 | 9711 | 0.01365 - 0.02135 | 0.01709 | 155 | 0.01596 |
| 9 | 9711 | 0.02135 - 0.03841 | 0.02859 | 265 | 0.02729 |
| 10 | 9712 | 0.03841 - 0.35429 | 0.06942 | 679 | 0.06991 |

Terbaca: kalibrasi baik di ekor atas (desil 10: prediksi 0,0694 vs frekuensi 0,0699; desil 9 0,0286 vs 0,0273) dan di tengah; desil 7 meremehkan (0,0111 vs 0,0142)
dan desil 1-2 menaksir terlalu tinggi dari kejadian yang sangat sedikit (3 dan 6 kejadian; tidak bermakna). Selisih kecil seperti itu tidak melewati ketidakpastian
sampling. Brier model 0,01378 hanya sekitar 2% lebih baik daripada klimatologi mentah 0,01406: skill mutlak kecil, tajamnya ada di desil 10 (679 dari 1.410 kejadian).

**Catatan jujur:** ini model REANALISIS, bukan operasional. Fitur `g_rasio`/`g_porsi` memakai debit reanalisis yang dipaksa cuaca teramati (prakiraan sempurna);
§7.4 menunjukkan keuntungannya hilang bila diganti reforecast. Platt dan tabel kalibrasi berasal dari lipat dua tahun yang saling berdekatan di waktu (korelasi
tahun ke tahun, Q2 dari <= 2021 untuk semua tahun), frek_dibi bocor kecil: frekuensi ekspansif membawa label tahun yang sedang menjadi lipat uji ke baris latih tahun sesudahnya, dan tahun kedua tiap lipat uji memakai label tahun pertama lipatnya (kecil karena dihaluskan 30 hari, tetapi arahnya bocor), dan Platt dipasang pada seluruh logit luar-lipat lalu tabel dihitung pada baris yang sama, jadi kecocokan rata-rata prediksi dengan frekuensi pasti secara konstruksi dan desil atas bukan bukti independen. Model final memakai 100% baris sedangkan Platt berasal dari logit pohon 80% baris (ketidakcocokan skala kecil). Vonis §7.2 dijalankan oleh kode di commit fc5d5fa57 (sidik f15902e992611792), sebelum perintah `bergulir`/`final` ditambahkan ke berkas ini. Tidak boleh dipasang di `status.py` atau layar;
syarat sebelum itu: prakiraan debit operasional dan uji prospektif.
