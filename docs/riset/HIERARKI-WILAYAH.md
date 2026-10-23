# Model bertingkat wilayah: kecamatan, kabupaten, provinsi, nasional

23 Okt 2026, didaftarkan dan di-commit SEBELUM dijalankan. Permintaan pemilik: konstanta, variabel, dan tren jangan
memakai angka Indonesia secara umum; belajar dari unit terkecil sampai provinsi, dengan koreksi per daerah.

## Masalah yang dijawab

Uji balik 23 Okt menunjukkan ramalan lama kebakaran dari riwayat jendela ~16 km KALAH dari median nasional
(`riwayat_sel_uji.json`). Sebabnya: per jendela datanya sedikit (median beberapa episode), jadi angkanya goyang.
Memakai angka nasional untuk semua daerah juga salah, karena gambut Kalteng berbeda dengan sabana NTT.

## Cara: partial pooling (empirical Bayes), dari kecil ke besar

Untuk setiap besaran B (lama episode, akhir musim, laju dasar, kalibrasi peluang), taksiran di unit u dengan
induk par(u):

```
B_u = (n_u * Bmentah_u + k * B_par(u)) / (n_u + k)
nasional -> provinsi -> kabupaten -> kecamatan -> jendela ~16 km
```

- n_u = jumlah episode (atau tahun) di unit itu. Makin banyak data lokal, makin besar bobot lokal; unit tanpa data
  memakai induknya. k (kekuatan tarikan ke induk) dipilih per tingkat dengan validasi silang HANYA di tahun latih
  (tahun sebelum musim uji), tidak pernah dengan musim uji.
- Lama episode diolah dalam log (sebaran miring), lalu dikembalikan ke hari.
- Unit wilayah = kecamatan/kabupaten/provinsi tempat pusat jendela (`scripts/data/wilayah.py`, batas Kemendagri).

## Besaran yang diuji dan syarat lolos

| Besaran | Pembanding | Lolos bila |
| ------- | ---------- | ---------- |
| Lama episode (umur 3 dan 7 hari) | median nasional, jendela mentah | MAE bertingkat < median nasional dengan batas atas selang 95% bootstrap blok jendela < 0 di KEDUA umur |
| Akhir musim | median nasional, jendela mentah | MAE bertingkat < jendela mentah, batas atas selang < 0 |

- Musim uji sama dengan sebelumnya (2019, 2023), data latih hanya sebelum 1 Januari musim uji.
- Dilaporkan juga per provinsi: tingkat mana yang menang di mana.
- Lolos = boleh tampil di laci dengan nama tingkatnya ("menurut pola Kab. X"); gagal = tidak tampil, ditulis.

## Kalibrasi peluang "membesar" per wilayah (model lolos)

Peluang model dikoreksi per provinsi lalu kabupaten (Platt bertingkat, intersep per unit ditarik ke induk dengan k
yang sama caranya). Diuji dengan tinggalkan-satu-tahun di prediksi luar-lipatan 2015-2023. Lolos bila galat
kalibrasi (ECE) per provinsi turun di mayoritas provinsi dan Brier skill tidak turun di provinsi mana pun dengan
>= 300 api. Himpunan 2024-2026 TIDAK dipakai di sini (sudah dicadangkan untuk uji skor prioritas v2).

## Tren per wilayah

Seri tahunan MODIS 2003-2025 dan VIIRS 2012-2025 per kecamatan, kabupaten, dan provinsi (bukan hanya jendela dan
desa). Aturan tren sama (>= 30 titik di dua blok 10 tahun). Ini deskriptif, tidak ada klaim ramalan.

## Hasil kalibrasi wilayah (23 Okt 2026): GAGAL

`python3 scripts/sebaran/kalibrasi_wilayah.py` -> `public/data/kalibrasi_wilayah.json` (~200 dtk, cache
`data/raw/sebaran/kalibrasi_wilayah_cache.pkl`). Swauji `kalibrasi_wilayah.py uji` (termasuk kebocoran tahun-dinilai dan 2024+
yang DITOLAK). Hanya 2015-2023; 340.468 api, 9.514 lolos; 339.524 terpetakan ke kabupaten (`wilayah.py`), sisanya hanya
tingkat provinsi.

Cara: `logit p' = a + d_prov + e_kab + b logit(p)`; a, b global; geser mentah per unit = MLE dengan induk tetap, disusut
`n_u d / (n_u + k)` (n_u = jumlah api). k dipilih per tingkat (provinsi dulu) dengan tinggalkan-satu-tahun di dalam 8 tahun
latih (logloss), kisi 0-100.000 dan tak hingga. k terpilih per lipatan: k_prov 100 (2015), 10.000 (2016-17, 2020-22),
30.000 (2018, 2019, 2023); k_kab 3.000 (10.000 pada 2019 dan 2023). "Sebelum" = peluang produksi apa adanya.

| Provinsi | Api | Lolos | ECE sebelum | ECE sesudah | Brier skill sebelum | Brier skill sesudah |
| -------- | --- | ----- | ----------- | ----------- | ------------------- | ------------------- |
| 14 Riau | 13.658 | 692 | 0,0090 | 0,0058 | 0,3139 | 0,3162 |
| 15 Jambi | 11.643 | 457 | 0,0051 | 0,0026 | 0,3571 | 0,3605 |
| 16 Sumsel | 41.205 | 1.708 | 0,0027 | 0,0027 | 0,3287 | **0,3282** |
| 53 NTT | 51.501 | 257 | 0,0016 | 0,0015 | 0,1515 | 0,1546 |
| 61 Kalbar | 66.157 | 983 | 0,0016 | 0,0017 | 0,2909 | **0,2876** |
| 62 Kalteng | 56.266 | 3.265 | 0,0051 | 0,0057 | 0,2938 | **0,2890** |
| 63 Kalsel | 26.848 | 561 | 0,0018 | 0,0016 | 0,2285 | **0,2278** |
| 64 Kaltim | 29.681 | 610 | 0,0044 | 0,0036 | 0,2236 | **0,2217** |
| 93 Papua Selatan | 43.509 | 981 | 0,0064 | 0,0017 | 0,3079 | 0,3094 |
| Semua | 340.468 | 9.514 | 0,0012 | 0,0016 | 0,3016 | 0,3000 |

Syarat: ECE turun di mayoritas provinsi **lolos** (6 dari 9: 14, 15, 53, 63, 64, 93); Brier skill tidak turun di provinsi
>= 300 api **GAGAL** (turun di 16, 61, 62, 63, 64; selisih 0,0005-0,0048). Vonis GAGAL: koefisien produksi TIDAK ditulis,
peluang di layar tetap peluang model apa adanya.

Bacaan: geser wilayah membetulkan rata-rata (ECE) di provinsi yang modelnya miring (Riau, Jambi, Papua Selatan), tetapi
menambah sedikit galat di provinsi besar yang sudah terkalibrasi; total pun memburuk (ECE 0,0012 -> 0,0016). Catatan
keadilan pembanding: Platt produksi dipasang pada gabungan luar-lipatan 2015-2023, jadi "sebelum" pernah melihat tahun yang
dinilai; Platt global yang dipasang ulang tanpa tahun itu (kolom `global` di JSON) sedikit lebih buruk dari "sebelum" di
hampir semua provinsi. Dibanding pembanding jujur itu pun Brier skill bertingkat tetap turun di 16, 61, 62, 63, 64, jadi
vonisnya tidak bergantung pada keuntungan itu. Batas: ECE mutlak pada laju dasar 0,5-6% berskala per seribu; 2020-2022
sedikit data (3-44 lolos per tahun); hanya intersep per unit, kemiringan global (sesuai pendaftaran).

## Hasil lama episode dan akhir musim (23 Okt 2026): LOLOS, efek kecil

`python3 scripts/data/riwayat_sel.py ujibalik` -> kunci `hierarki` di `riwayat_sel_uji.json` (kasus, jendela, dan musim uji
SAMA dengan uji balik lama; latih < 1 Jan musim uji). `python3 scripts/data/riwayat_sel.py` -> `riwayat_hierarki.json`
(produksi, semua tahun penuh 2012-2025). Kriteria dan ambang tidak diubah sesudah melihat hasil.

Cara: susut berurutan B_u = (n B_mentah + k B_induk)/(n + k), nasional -> provinsi -> kabupaten -> kecamatan -> jendela;
B_mentah = median pooled unit (log hari untuk lama, hari-dalam-tahun untuk akhir musim); jendela di laut/luar batas
Kemendagri langsung di bawah nasional. k per tingkat dipilih berurutan (provinsi dulu) dengan tinggalkan-satu-tahun di tahun
latih saja (galat = MAE satuan asli, seri -> k lebih besar); `pilih_k` menolak data tahun >= musim uji (diuji di `uji`).

| Besaran | n | MAE nasional | MAE jendela mentah | MAE bertingkat | Selisih vs pembanding (CI 95% blok jendela) | Vonis |
| ------- | - | ------------ | ------------------ | -------------- | ------------------------------------------- | ----- |
| Lama, umur 3 | 13.550 | 4,97 | 5,01 | 4,91 | vs nasional [-0,07; -0,04] | lolos |
| Lama, umur 7 | 6.649 | 6,21 | 6,36 | 6,06 | vs nasional [-0,19; -0,11] | lolos |
| Akhir musim | 6.739 | 29,24 | 22,84 | 22,23 | vs mentah [-0,80; -0,43] | lolos |

`lama_unggul_hierarki` = true (kedua umur), `musim_unggul_hierarki` = true. Tambahan: bertingkat juga mengalahkan jendela
mentah di lama (umur 3 [-0,13; -0,07], umur 7 [-0,39; -0,22]); pada SEMUA episode uji, termasuk jendela dengan < 3 episode
latih (14.079 dan 7.212 kasus), selisih vs nasional [-0,07; -0,04] dan [-0,17; -0,10].

Bacaan jujur: yang membetulkan ramalan lama lama adalah susutnya (mentah kalah dari nasional, bertingkat menang), tetapi
besarnya hanya 0,06 hari (umur 3) dan 0,15 hari (umur 7), yaitu 1-2,5% galat. Pada akhir musim jendela mentah sudah jauh lebih
baik dari nasional (22,8 vs 29,2 hari); susut menambah 0,6 hari. Jadi keputusan "tampil di laci" lolos menurut aturan beku,
tetapi pantas ditulis sebagai "sedikit lebih baik dari angka nasional", bukan sebagai ramalan tajam.

k terpilih (p, a, c, w; 1e9 = ikut induk): lama umur 3: 2019 0,5 / 1e9 / 1e9 / 64, 2023 0,5 / 256 / 128 / 64; umur 7: 2019
1e9 / 64 / 128 / 32, 2023 8 / 64 / 64 / 32; akhir musim: 32 / 8 / 8 / 4 di kedua musim. Produksi (2012-2025) umur 1-14: p 4-256
(umur 7 dan 13: ikut nasional), a 16-256, c 32-64, w 32-64; musim 32 / 8 / 8 / 4. Artinya jendela perlu sekitar 30-60 episode
untuk setara bobot induknya: data lokal kecil hanya menggeser sedikit.

Per provinsi (pemenang MAE terkecil; n kasus kecil tidak bermakna): lama umur 3 menang bertingkat di 19 dari 38 unit
(termasuk "?"), nasional 14, mentah 5; umur 7 bertingkat 17, mentah 10, nasional 9; akhir musim bertingkat 30, mentah 5, nasional 4.
Mentah menang jelas di NTT (lama 7,42 vs 7,81 nasional, umur 7 8,53 vs 9,13) dan bertingkat di Sumsel, Kalteng, Kalsel,
Kaltim, Papua Selatan. Tabel lengkap di `riwayat_sel_uji.json` (`hierarki.per_provinsi`; "?" = pusat jendela di luar batas
Kemendagri yang disederhanakan, 1.840 kasus umur 3).

Berkas produksi `riwayat_hierarki.json` (630 KB): kunci provinsi = kode Kemendagri, kabupaten `kode|kab`, kecamatan
`kode|kab|kec` (nama, karena `wilayah.py` hanya punya kode provinsi); per unit `d[h-1]` ramalan total hari untuk umur h = 1..14
(null bila tak ada episode >= h), `n[h-1]`, `s` akhir musim (hari-dalam-tahun), `ns`; `k` per tingkat per umur; `w` memetakan
jendela `ix_iy` (pusat blok 3x3; sel mana pun -> `3*(i//3)+1`) ke indeks `kl` (kecamatan). Tidak ada perubahan di ubin
`riwayat_sel` (tetap 20 MB). Tingkat jendela dihitung di layar dari `r` ubin dan k `w`.
