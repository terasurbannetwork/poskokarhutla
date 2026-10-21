# Ilmu pesisir

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/pesisir.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca pesisir`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus pesisir "..."`.

## Peta berkas & tabel

Wilayahmu: `scripts/pesisir/**`, `public/pesisir/**`, `tests/pesisir/**` (per 21 Okt 2026):
- `scripts/pesisir/abrasi.py`: abrasi garis pantai tahunan ala DEA Coastlines. `SITUS` = kotak per situs (ditulis tangan),
  transek 1 km tegak lurus garis pantai OSM, 3 km ke darat dan 4 km ke laut, sampel 15 m. Landsat 4-9 C2 L2 dari
  Microsoft Planetary Computer (token SAS anonim), MNDWI hijau/SWIR1, median tahunan, Otsu dijepit [-0,25; 0,5] (ambang 0 ala DEA salah: tambak terbaca laut), garis =
  penyeberangan air->darat pertama dari ujung laut (darat bersambung >= 60 m), laju = regresi + selang 95% t dilebarkan AR(1)
  (`nilai_transek` menghitung statistik dari deret `jarak` saja; `abrasi.py ringkas` mengulangnya tanpa citra).
- Keluaran `public/pesisir/data/abrasi.json`: `situs[]` (ringkasan, ambang dan jumlah adegan per tahun), `transek[]`
  (`id`, `lat/lon/arah` garis dasar, `jarak` [[tahun, m ke laut dari garis dasar]], `laju`, `ci95`, `r2`, `n`,
  `keyakinan`, `kelas`, `laju_10th`, `perubahan_m`, `garis_terakhir`), `catatan[]` (batas kejujuran), `sumber`.
- Cache per adegan `data/raw/pesisir/adegan/<situs>-<hash transek>/<id adegan>.bin` (array int16 MNDWI x 1000; berkas
  kosong = adegan ditolak berawan). Hash ikut DARAT/LAUT/LANGKAH dan letak transek; berubah = cache lama tak terpakai, jadi cache lama tak terpakai.
- Bahan milik `pipa-data` (impor, jangan sunting): `scripts/data/citra.py` (`COG`, `ambil`, `ke_utm`, `buka_ubin`).
- Validasi dan usulan jadwal: `docs/multi-bencana/bencana/abrasi.md`.

## Aturan & invarian

- Transek tidak pernah diletakkan ulang diam-diam: `main()` membaca transek situs dari keluaran lama; OSM hanya bila
  situs belum punya transek. Mengubah transek = hapus entri situs di abrasi.json dengan sadar (ID berubah).
- Tahun berjalan tidak dipakai (komposit musimnya timpang); `tahun_akhir = tahun ini - 1`.
- Keyakinan turun satu bila membuang pencilan membalik arah atau baru membuat nyata; rendah = "tidak nyata".
  `GANGGUAN` (id: (teks, tahun mulai)) memotong deret di tahun bangunan; lompatan > 300 m dua tahun terakhir = `tinjau`.
- Tiap angka laju tampil bersama selang 95% dan keyakinan; "tidak nyata" bila selang memuat nol. Belum ada koreksi
  pasang surut: jangan menulis posisi satu tahun sebagai fakta.
- Situs gagal (jaringan) memakai data lama situs itu; skrip tidak menulis keluaran setengah jadi.

## Ranjau yang pernah meledak

- Python 3.9 bawaan macOS gagal jabat tangan TLS ke overpass-api.de; jalankan lokal dengan Python >= 3.11. Overpass
  sering 502: `overpass()` mengulang di tiga cermin.
- Landsat belahan selatan di Planetary Computer memakai zona UTM utara (326xx) dengan northing negatif: `ke_piksel`
  mengurangi 10.000 km. Landsat 5 di Jawa bolong 2001-2006 (hanya Landsat 7, bergaris SLC-off sesudah Mei 2003).
- Tambak: yang tanggulnya jebol terbaca laut, yang utuh terbaca darat. Pulau mangrove / tanggul lepas pantai > 60 m
  terbaca garis pantai.

## Gerbang yang menghakimi

- `python3 scripts/pesisir/abrasi.py uji` (swa-uji tanpa jaringan: rangkai, normal ke laut, piksel UTM selatan,
  baca ubin, MNDWI/QA, bilinear, median, Otsu, garis subpiksel, gosong vs pulau, regresi + pencilan).
- `npm run uji:agen` sesudah `git add`; pemeriksa `validasi-model` untuk metode/angka laju, `selera-angka` bila tampil.
- Kamu tidak memverifikasi kerjamu sendiri (AGENTS.md §3.2); tidak commit, tidak push, tidak menyunting `.github/workflows`.

## Kasus
- 2026-10-21 · 2026-10-21 · Jalan pertama 5 situs pantura (1988-2025, 167 transek). Ambang 0 ala DEA salah di pantura: tambak MNDWI 0-0,5 terbaca laut; Otsu ~0,3-0,45. Transek 2 km ke darat tidak cukup di Sayung (mundur >1,7 km), dinaikkan 3 km. Overpass sering tak menjawab berjam-jam; menjalankan beberapa situs paralel menimpa abrasi.json satu sama lain (tiap proses menulis lama+situsnya), jadi satukan dengan satu jalan penuh dari cache sesudahnya. Tanggul Tol Semarang-Demak (sayung-03..06) dan reklamasi Patimban (subang-45,47) muncul sebagai lompatan maju 2024-2025: daftar GANGGUAN. Nominatim tidak memberi nama desa di Blanakan (validasi pakai rentang bujur).
