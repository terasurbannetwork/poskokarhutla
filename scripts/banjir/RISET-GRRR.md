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
