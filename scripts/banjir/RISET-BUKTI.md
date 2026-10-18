# RISET-BUKTI: bukti DAS hulu untuk daerah banjir (18 Okt 2026)

Skrip: `bukti_das.py` (DAS, hutan, konsesi), `citra_banjir.py` (Sentinel-2/1). Jalan MANUAL, jarang; bukan bagian `banjir.yml`.
Keluaran `public/banjir/data/bukti/` (di-commit); mentah `data/raw/banjir/das/` (tidak di-commit, ~70 MB zip + cache strip).

## Sumber yang diuji hidup (18 Okt 2026)
| Kebutuhan | Sumber | Catatan |
|---|---|---|
| Batas DAS | HydroBASINS v1c lev 9, `data.hydrosheds.org/file/HydroBASINS/standard/hybas_{as,au}_lev09_v1c.zip` (54 MB + 27 MB) | Indonesia terbelah: Sumatra utara di `as`, hampir semuanya di `au`. Unduhan 27 MB bisa terpotong; pakai `curl -C -` dan `unzip -t`. Shapefile dibaca `scripts/scrape/lahan.py baca_shp`. |
| Hutan | Hansen GFC v1.13 (2001-2025), `storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_{lossyear,treecover2000}_<atas>_<kiri>.tif` | BUKAN COG: TIFF 40.000 x 40.000, strip 1 baris, LZW, tanpa prediktor. Server mendukung Range, jadi cukup tabel strip + satu permintaan per 32 baris. Tidak ada GFW tile cache yang dipakai (v1.12 ke atas dialihkan ke renderer dinamis). Karhutla belum pernah memakai Hansen; yang ada hanya gambut, sawit, dan HPH dari GFW. |
| S2 | Earth Search (Element84) `sentinel-2-l2a`, pola `scripts/data/citra.py` | COG deflate, dibaca `citra.COG`. |
| S1 | Planetary Computer `sentinel-1-rtc`, token SAS anonim `api/sas/v1/token/sentinel1euwestrtc/sentinel1-grd-rtc` | COG float32 deflate prediktor 3 (BERBEDA dari `citra.buka_ubin` yang hanya prediktor 2), jadi `citra_banjir.buka_float_pred3`. Cakupan terbatas: banyak kejadian tak punya pengamatan 0-12 hari sesudahnya. Tepi swath memberi piksel kosong. |

## Pilihan desain
- Dissolve DAS dengan membuang sisi bersama (HydroBASINS berbagi simpul persis); invarian: luas gabungan 90-110% jumlah `SUB_AREA`.
- Cuplik 1 dari 4 piksel (120 m) supaya LZW + jaringan ~2-6 menit per daerah; tidak perlu mengunduh 85 MB (lossyear) dan 281 MB (treecover2000) per ubin.
- Konsesi dipotong ke DAS dengan scanline even-odd yang sama (satu cuplikan untuk semua), jadi luas konsesi, hutan awal, dan hutan hilang konsisten.
- Plafon: tiap `<slug>.json` <= 200 KB, tiap PNG <= 120 KB (320 px), seluruh folder <= 6 MB. Diuji di `uji`.

## Uji
`python3 scripts/banjir/bukti_das.py uji` (gabung poligon, scanline, potong/gabung interval, LZW bolak-balik, tally hanya piksel hutan, validasi menolak hutan hilang > hutan awal dan konsesi > DAS, plafon), `python3 scripts/banjir/citra_banjir.py uji` (prediktor 3, gelap baru, pemetaan abu), `node --test tests/banjir/bukti.test.mjs`.

## Perbaikan setelah pemeriksaan (18 Okt 2026)
- **Korelasi (kartu hanya memuat kalimat, angka r hanya di sini dan Metode).** Hanya tahun yang ada catatannya (tidak diisi 0). r ditahan bila kejadian < 30 atau tahun berkejadian > 0 kurang dari 8. Ambang kebetulan `r_kritis(n)` (uji dua sisi 5%, n = 14 -> 0,53). Di bawah ambang kartu menulis "tidak dapat dibedakan dari kebetulan"; kedua deret naik dan pencatatan DIBI membaik (2024 tidak lengkap, 2025 melonjak), jadi korelasi tingkat tidak membuktikan apa pun. Disertakan juga Spearman (rho) dan Pearson selisih tahunan.

| Daerah | n | kejadian | r | rho | r selisih | % DAS di kabupaten |
|---|---|---|---|---|---|---|
| 11|Aceh Selatan | 14 | 85 | 0.06 | -0.05 | -0.35 | 59.1 |
| 11|Aceh Tenggara | 13 | 74 | -0.25 | -0.08 | 0.25 | 66.0 |
| 14|Rokan Hulu | 13 | 74 | 0.71 | 0.5 | 0.66 | 38.7 |
| 32|Bandung | 14 | 283 | -0.24 | -0.1 | -0.23 | 66.5 |
| 32|Bogor | 14 | 189 | 0.53 | 0.73 | 0.07 | 75.9 |
| 33|Cilacap | 14 | 169 | -0.05 | -0.13 | 0.06 | 28.3 |
| 33|Pati | 14 | 111 | 0.28 | 0.24 | 0.16 | 77.8 |
| 35|Bojonegoro | 14 | 136 | -0.33 | -0.26 | -0.33 | 15.9 |
| 35|Gresik | 14 | 102 | 0.02 | 0.08 | -0.04 | 2.1 |
| 36|Serang | 14 | 99 | 0.25 | 0.27 | 0.3 | 23.4 |
| 63|Balangan | 11 | 85 | -0.26 | -0.11 | -0.51 | 88.8 |
| 72|Parigi Moutong | 13 | 82 | -0.32 | -0.32 | -0.18 | 95.7 |
| 73|Luwu Utara | 14 | 78 | -0.27 | -0.11 | -0.65 | 99.9 |
| 91|Sarmi | 5 | 6 | ditahan |  |  | 59.5 |
| 94|Paniai | 6 | 6 | ditahan |  |  | 41.3 |
| 96|Maybrat | 1 | 1 | ditahan |  |  | 32.6 |

  Hanya Rokan Hulu (0,71) dan Bogor (0,53) di atau melewati ambang; selisih tahunan Rokan Hulu 0,66 ikut lolos, Bogor tidak (0,07).
- **Catatan Hansen (satu kalimat di layar, bagian hutan dan konsesi):** "Hilang = kehilangan kanopi 30% atau lebih dari sebab apa pun (panen HTI/sawit, kebakaran, longsor), bukan deforestasi permanen; pertumbuhan kembali tidak dihitung dan batas konsesi adalah yang terakhir."
- **Aturan titik keluaran (satu kalimat di layar):** sub-DAS terbesar (di bawah 25.000 km2) yang memuat pusat kecamatan di kabupaten itu; bukan titik banjir persisnya. Akibatnya DAS bisa jauh melewati kabupaten (kolom % DAS di kabupaten: Gresik 2,1%) dan bertumpuk: DAS Gresik memuat titik keluaran DAS Bojonegoro (ditandai "Memuat/Bagian dari DAS").
- **Cuplikan S=1 lawan S=4** (Rokan Hulu, jendela 0,06 x 0,06 derajat = 4.431 ha): luas -0,0%, hutan awal +0,3%, hutan hilang total -1,4%, per tahun (> 100 ha) sampai +-4,2%, selisih mutlak per tahun maksimum 17 ha. Angka < 10 ha tampil "~".
- **Kelengkapan konsesi:** `konsesi.lengkap` = null bila 0 ha tercatat (tak diketahui, bukan "tidak ada"), false bila ada tetapi daftar tak dijamin lengkap; layar menulis "data konsesi belum lengkap" dan "–" di tabel.
- **S1:** jendela "sesudah" mulai tepat di tanggal kejadian dan `validasi` menolak sesudah < kejadian atau sebelum >= kejadian. Dua daerah melanggar (Rokan Hulu, Aceh Selatan) dihitung ulang; Rokan Hulu tidak punya pengamatan sesudah sehingga citra radarnya dibuang.
- **Golongan daerah:** "langganan banjir" (kejadian DIBI 2010-2023) dipisah dari "Siaga/Awas <rentang tanggal status.json>".
