# Pembekuan prakiraan

Halaman ini menjelaskan urutan eksekusi harian dan cara prakiraan dibekukan ke arsip.

Gambaran alur harian:

![Alur harian prediksi: sumber dibekukan oleh catat.py ke arsip, dinilai oleh nilai.py, dikalibrasi, diterbitkan oleh terbit.py dan tangga.py, lalu dibaca layar /prediksi. Sumber: urutan langkah di .github/workflows/prediksi.yml.](gambar/prediksi-alur-harian.svg)

Urutan eksekusi di `.github/workflows/prediksi.yml`: uji mandiri, tarik masukan segar dari situs, `catat.py`, `nilai.py`, `kalibrasi.py`, `koreksi.py`, `terbit.py`, `dampak.py`, lalu giliran ruas jalan (`jalan.py giliran --maks 15`) yang lebih dulu memanggil `tangga.py`.


## Pembekuan prakiraan (`catat.py`)

Setiap hari terbit `t`, satu baris arsip dibuat per kode untuk tenggang +1, +2, +3 (hari sasaran `t+1`, `t+2`, `t+3`). Baris arsip tidak pernah diubah atau dihapus; jalan ulang di hari yang sama tidak menimpa (prakiraan pertama yang dinilai). Arsip lokal yang lebih pendek atau berbeda dari git HEAD menghentikan proses dengan kode 3 (`scripts/prediksi/dasar.py`, fungsi `cek_arsip` dan `periksa_arsip`). Masukan yang tidak ada atau tidak mencakup ketiga hari sasaran membuat kode itu dilewati dan dicatat di log, bukan dikarang.

Daftar kab/kota (514) dibaca dari `scripts/udara/kota.json` (kode Kepmendagri 2025, titik = rata-rata pusat kecamatan berbobot penduduk, jiwa WorldPop 2026). Kunci nama lintas berkas dicocokkan lewat `kota.kunci()` dan `dasar.pencari()`, bukan lewat kode, karena kode DIBI berbeda dari Kepmendagri (169 dari 461 berbeda).

Delapan kode arsip:

| Kode | Kolom | Sumber dan olah |
| --- | --- | --- |
| HJN (hujan) | `p1 p20 p50 tot mulai lama puncak sm m` | Open-Meteo per jam (best_match, zona Asia/Jakarta) di titik pusat kab, 100 lokasi per panggilan (6 panggilan), dengan riwayat 10 hari ke belakang. `tot` = jumlah 24 jam (mm); `mulai` = jam pertama dengan hujan 0,5 mm atau lebih; `lama` = jumlah jam dengan hujan 0,5 mm atau lebih; `puncak` = jam dengan hujan terbesar; `sm` = kelembapan tanah rata-rata berbobot lapisan 3 sampai 9 cm (bobot 6) dan 9 sampai 27 cm (bobot 18). Hari dengan kurang dari 20 jam terisi dibuang |
| API (titik panas) | `p d pt ps` | `d` = jumlah hari bertitik panas (lokasi unik keyakinan sedang atau tinggi) dari 3 hari terakhir (`hotspot.json`, cadangan `titik_hari`); `pt` dan `ps` = P(FWI >= 7) dan P(FWI >= 14) dari sel ansambel FWI ECMWF terdekat (maksimum 0,5 derajat; hanya provinsi prioritas). Skor mentah `p = 0,03 + 0,94 x rata-rata(d/3, pt)`; bila `pt` kosong hanya `d/3` |
| BNJ (banjir) dan LSR (longsor) | `lv ps` | `lv` = level tertinggi kecamatan di kab dari `public/banjir/data/status.json` (0 Normal sampai 3 Awas); `ps` = peluang jalur hujan mencapai Siaga dari `prakiraan72.json` (kosong bila ansambel tidak jalan). Kab tanpa kecamatan berstatus dicatat Normal |
| ASP (asap) | `pm kat` | PM2,5 rata-rata 24 jam prakiraan CAMS (`public/udara/data/prakiraan.json`). `kat` = jumlah batas yang dilewati dari 55,4, 150,4, 250,4 µg/m³ (batas ISPU P.14/2020: Tidak sehat, Sangat tidak sehat, Berbahaya) |
| ROB | `lewat sel` | Muka laut harian maksimum di titik rob kab dibanding ambang p95 titik itu (`rob.json`); `lewat` = 1 bila selisih >= 0, `sel` = selisih (m). Hanya kab yang punya titik rob |
| GEL (gelombang) | `hs lv` | Open-Meteo Marine `wave_height_max` di titik pesisir `cuaca_gelombang.json`, maksimum per kab. `lv`: di bawah 1,25 m = 0; 1,25 sampai di bawah 2,5 = 1 (Sedang); 2,5 sampai di bawah 4,0 = 2 (Tinggi); 4,0 ke atas = 3 (Awas). Titik ke kab: di dalam poligon, atau simpul poligon provinsi sama dalam 25 km; selain itu titik dibuang dan dicatat. Kab tanpa titik tidak dicatat |
| CEX (angin) | `emb lv` | Embusan angin 10 m maksimum harian (`wind_gusts_10m`, km/jam) dari panggilan hujan yang sama; hari dengan kurang dari 20 jam terisi dibuang. `lv`: < 46 = 0; < 63 = 1; < 89 = 2; 89 ke atas = 3 (setara 25, 34, 48 knot) |

Peluang hujan HJN:

```
bila ansambel ECMWF tersedia (m = 1) dan mencakup tiga hari sasaran:
  p50 = pecahan anggota >= 50 mm
  p1, p20 = p_persentil(q10, q50, q90, ambang)
    ambang <= q10 -> 0,95 ; ambang > q90 -> 0,05
    q10 < ambang <= q50 -> 0,9 - 0,4 x (ambang - q10)/(q50 - q10)
    q50 < ambang <= q90 -> 0,5 - 0,4 x (ambang - q50)/(q90 - q50)
selain itu (m = 0), skor kasar dari jumlah deterministik:
  tot >= 1 x ambang -> 0,8 ; tot >= 0,5 x ambang -> 0,4 ; selain itu 0,05
selalu dijaga: p1 >= p20 >= p50
```

Ambang hujan adalah 1, 20, dan 50 mm per 24 jam (`scripts/prediksi/catat.py:47`). Kuota Open-Meteo menjadi pertimbangan: ada 6 panggilan HJN per hari dan `KuotaHabis` ditangani, bukan diulang.
