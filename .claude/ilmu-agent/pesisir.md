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
- 2026-11-01 · Halaman /pesisir/ (1 Nov 2026) memakai ../inti (format, nanti.js, kartu, tip, peta/lapis, legenda) dan data banjir/rob.json, pasut_30h.json, cuaca_gelombang.json (baca saja). nanti() ada di inti/nanti.js, BUKAN format.js; tanpa itu bukaTab error. rob.json: 22 dari 66 titik p95/lv null (tanpa arsip), jadi status ditulis Tanpa ambang, bukan Normal; m1(null) harus '-' bukan 0. Logbook punya 13 jenis tanpa gelombang pasang/abrasi: kartu Tren jujur, tanpa deret karangan. Polyline garis pantai antar-transek berantakan di Sayung (tanggul): ganti jadi transek garis dasar ke garis pantai terakhir. Data lokal basi (rob 13 Okt, gelombang 18 Okt): uji dengan ?sekarang=2026-10-20T08:00:00+07:00. jejak.js/kaki.js sengaja tidak dimuat sampai registry + migrasi stat_hari (CHECK hal) ada.
- 2026-11-01 · Validasi 1 Nov: laju transek tunggal tercepat (bekasi-32 -107 m/th) artefak tangga klasifikasi tambak (lompatan 300-1190 m/th). lompatan_mana_pun() menandai tinjau di mana pun dalam deret (86 dari 167 transek); judul pakai median situs dari transek abrasi bersih; seri Tren baseline median 1988-1992 tanpa transek gangguan; abrasi.json ditulis ulang lewat abrasi.py ringkas (tanpa citra).
- 2026-11-01 · Label rob 1 Nov: rekap Pusdalops xlsx 2023-2024 hanya 69 baris berisi (829 baris lembar sisanya kosong berformat); dibaca lewat zipfile (bukan openpyxl) agar stdlib. Gabung dengan logbook (jenis_teks \brob\b, bukan 'rob' polos: 'Rumah Roboh' ikut) dan DIBI = 624 kejadian unik 179 kab; kode kab lewat logbook_bersih.kode_kab. Arsip muka laut harian (data/raw/banjir/rob/arsip_*.json) TIDAK ada lokal, jadi uji balik rob menunggu unduh ulang atau arsip prakiraan; validasi DIBI lama ada di rob.json validasi. Klimatologi: 38% kejadian dalam 2 hari dari bulan baru/purnama (rata-rata orbit) vs 27% acak, permutasi z ~6,6.
