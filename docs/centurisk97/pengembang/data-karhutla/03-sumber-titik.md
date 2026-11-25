# Sumber deteksi dan angka utama

Halaman ini menjelaskan dari mana deteksi titik panas diambil, bagaimana satu angka utama didefinisikan, dan bagaimana pensiunnya S-NPP ditangani.

## 1. Sumber deteksi dan pengambilan

Sumber: NASA FIRMS, empat produk NRT: `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, dan `MODIS_NRT` (Terra dan Aqua). Kotak data `94,-11.5,141.5,6.5` (`scripts/data/harian.py:25`). Jendela: 7 hari x 24 jam (`HARI = 7`). Unduhan selalu 10 hari UTC dalam dua jendela 5 hari, lalu dipotong.

Kelas keyakinan dikodekan 0 rendah, 1 sedang, 2 tinggi:

- VIIRS: `l`, `n`, `h`; nilai tak dikenal dianggap sedang.
- MODIS: angka 0 sampai 29 rendah, 30 sampai 79 sedang, 80 sampai 100 tinggi (`scripts/data/firms_sumber.py:85`).

Resolusi piksel: VIIRS 375 m, MODIS sekitar 1 km, Himawari sekitar 2 km (dipakai terpisah untuk api baru di sela lintasan, di luar modul ini). Frekuensi: Worker mengambil FIRMS tiap 3 jam ke D1 (menit 15 UTC); pipeline `titik.yml` tiap 3 jam; `data.yml` harian.

Arsip standar (SP) tertinggal sekitar 3 bulan dari NRT dan jangkauannya berbeda per sensor, jadi pemilihan sumber per hari memakai `/api/data_availability` FIRMS, bukan umur hari. Balasan berstatus 200 yang bukan CSV (galat kunci atau kuota) dianggap gagal (`firms_sumber.py`).

## 2. Definisi angka utama: lokasi unik

Keputusan pemilik 25 Oktober 2026, diubah 28 Oktober 2026 (`scripts/data/titik_unik.py`):

```
sel(lat, lon) = ( round(lat / 0,003375),
                  round(lon x cos(lat) / 0,003375) )          # sekitar 375 m
titik yang dihitung  = sensor di {M, N, N20, N21}
                       dan keyakinan >= KEYAKINAN_MIN (= 0, rendah ikut)
angka hari D         = banyak pasangan (hari WIB, sel) yang berbeda
                       dari titik yang dihitung, tanpa sel sumber panas tetap
```

Alasan lokasi unik: NOAA-20 dan NOAA-21 lewat berselang sekitar 50 menit di orbit yang sama. Pada 25 Oktober 2026, 433 dari 704 titik NOAA-21 di Kalimantan Tengah jatuh di sel yang sudah terdeteksi satelit lain hari itu; hanya 271 sel yang benar-benar baru. Keyakinan rendah dikembalikan karena api gambut membara bersuhu rendah dan sering tertutup asap, sehingga sinyalnya jatuh di kelas rendah (rujukan literatur ada di docstring `titik_unik.py`). Akibatnya ada lebih banyak alarm palsu di luar gambut.

Bagian yang tetap memakai nominal dan tinggi karena koefisiennya diukur dari kelas itu: luas terbakar, faktor insiden, rasio N20/S-NPP, pembanding riwayat S-NPP, dan kompleks.

Pembanding definisi BMKG (`titik_unik.py:BMKG_DEFINISI`): titik mentah tanpa membuang kembaran, MODIS, S-NPP, NOAA-20, keyakinan tinggi saja; cocok persis 1.744 titik nasional pada 18 Oktober 2026. Ini bukan angka utama.

Status uji: definisi, bukan model; diuji lewat swa-uji `python3 scripts/data/titik_unik.py`.

## 3. Sumber panas tetap dan gunung api

**Sumber panas tetap** (`scripts/data/titik_palsu.py`, keluaran `titik_palsu.json`). Data NRT tidak membawa kolom `type`, sedangkan arsip SP membawanya (0 vegetasi, 1 gunung api, 2 sumber panas tetap darat, 3 lepas pantai). Daftar sel diturunkan dari arsip:

```
sel 0,01 derajat (sekitar 1,1 km) masuk daftar bila menyala
>= 30 hari dalam setahun, di >= 8 bulan berbeda, pada >= 2 tahun berbeda
(HARI_MIN, BULAN_MIN, TAHUN_MIN = 30, 8, 2; titik_palsu.py:43)
```

Jenis: PLTU (radius 1 km), kawah (dalam radius gunung api), tipe FIRMS mayoritas, atau "persisten". Suar gas ditambah dari data World Bank GGFR, hanya benih yang lolos uji FIRMS (menyala >= 30 hari di >= 6 bulan dalam satu tahun). Kebakaran gambut besar menyala berminggu-minggu di musim kemarau (3 sampai 5 bulan) dan tidak di sel yang sama tiap tahun, jadi tidak tersaring. Penyegaran bulanan `titik_palsu.yml` (`0 20 3 * *`) menarik arsip SP S-NPP untuk 4 tahun penuh terakhir (`TAHUN_JENDELA`); berkas hasil tidak ditimpa bila jumlah sel turun lebih dari 50 persen. Mask bergulir 365 hari hanya mencatat laporan, belum menyaring, karena menyaring mengubah angka utama dan itu keputusan pemilik.

**Gunung api** (`scripts/data/aturan.py:30-31`, konstanta `RADIUS_GUNUNG_API` dan daftar `GUNUNG_API`): titik dalam radius 3 km dari puncak 40 gunung api yang meletus sejak tahun 2000 (daftar statis) tidak menjadi kompleks karhutla; titiknya tetap ada di `hotspot.json`. Daftar diperbarui manual.

## 4. Berhentinya S-NPP dan rasio NOAA-20 per S-NPP

S-NPP berhenti didistribusikan FIRMS pada 1 November 2026, 13.00 UTC. Satu konstanta `SNPP_AKHIR` (`firms_sumber.py:22`) menjadi satu-satunya tempat batas ini. Aturannya menurut tanggal data, bukan jam dinding: hari UTC sesudah batas tidak menuntut S-NPP, hari sampai batas tetap diminta. Galat S-NPP tidak fatal; sensor lain tetap fatal.

Untuk menyambung deret luas yang dikalibrasi memakai S-NPP, deteksi NOAA-20 dibagi rasio (`firms_sumber.py:44`):

| Konstanta | Nilai | Pemakai |
| --- | --- | --- |
| `RASIO_N20_N` | 0,97 | laporan nasional (`laporan.py`) |
| `RASIO_N20_N_LOKAL` | 0,89, IQR 0,72 sampai 1,07 | insiden dan watak kluster |

Rasio diukur per satuan pemakaian (hari laporan, jendela 3 x 3 sel), rasio dari jumlah dengan bootstrap antar-hari; satu minggu (0,89) menyesatkan. Komponen Oktober 2026 (12 hari tanpa celah): 0,907, selang 95 persen 0,80 sampai 1,04. Agustus 0,98, September 1,00. Rasio nasional dan lokal sengaja berbeda; jangan dijadikan satu angka. Pada hitungan kajian ambang, setelah S-NPP pensiun hitungan tanpa S-NPP tersisa sekitar 79 persen (diukur 6 sampai 12 Oktober 2026).

Perbandingan lintas tahun wajib setara sensor. Contoh dari kode: 149 persen terhadap 2015 ternyata 82 persen bila hanya MODIS dan S-NPP (`data/kumulatif_mn.json`); NOAA-20 ada sejak 2018-04, NOAA-21 sejak 2023-03-01.
