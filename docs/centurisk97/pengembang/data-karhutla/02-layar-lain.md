# Layar prioritas, provinsi, satelit

Halaman ini menjelaskan layar prioritas provinsi, peta provinsi dan kabupaten, halaman data satelit, lapisan lahan, lab InSAR, dan berkas data untuk pengembang.

## Prioritas provinsi (ikon di kepala halaman)

Akses: publik. Kode: `public/prioritas.js`. Data: `harian_panjang.json`.

1. Klik ikon "Prioritas provinsi" di kepala halaman. Data dimuat saat ikon diklik.
2. Tabel menampilkan tiap provinsi dengan status `Prioritas`, `Bertahan`, atau di luar daftar, tujuh batang harian, H3 (rata-rata hotspot harian tiga hari lengkap terakhir), jumlah hari ini, dan "Sejak".
3. Provinsi masuk daftar saat H3 mencapai garis masuk. Provinsi keluar bila H3 berada di bawah garis keluar tiga hari berturut-turut. Hari berjalan belum dihitung.
4. Garis dalam satuan laporan BNPB: 180 masuk dan 90 keluar untuk jendela yang berakhir sampai 2 November 2026; 144 masuk dan 72 keluar sesudahnya (`public/prioritas.js:8`).
5. Panel menampilkan catatan akhir musim: kajian mencatat ambang situasional naik sekitar 1,5 kali pada Oktober dan 2 kali pada November, dan lebih tinggi saat La Niña. Garis masuk di layar tetap, tidak ikut naik.

Sering disalahpahami: daftar ini bukan status darurat resmi dan tidak menggantikan penetapan BNPB atau pemerintah daerah. Daftar enam provinsi teratas per hari yang lama tidak lagi dipakai karena jumlahnya selalu enam berapa pun besar kebakarannya.

## Peta provinsi dan overlay kabupaten (luas terbakar, belum padam)

Akses: publik. Kode: `public/peta_karhutla.js`, `public/peta_kab.js`. Data: `peta_karhutla.json`, `peta_karhutla_kab.json`, `peta_karhutla_wil.json`.

1. Kartu "Peta provinsi" di `/laporan` dan overlay kabupaten di peta utama memiliki mode Hari, Minggu, Bulan, Rentang, dan 12 Bulan.
2. Tiga metrik: **Hotspot**, **Luas terbakar**, dan **Belum padam**. Hotspot dan luas dijumlahkan antar hari. Belum padam adalah persediaan pada hari terakhir periode dan tidak pernah dijumlahkan antar hari.
3. Luas terbakar di sini adalah perkiraan dari titik satelit, bukan luas resmi.
4. Hari yang kehilangan satu satelit ditandai "celah" dan tidak dikoreksi.

Sering disalahpahami: jumlah kabupaten dapat berbeda sampai (m + 1) / 2 ha per hari dari angka provinsi karena pembulatan dilakukan sendiri-sendiri; m adalah jumlah kabupaten tercatat di provinsi itu.

## Data satelit (`/satelit`, tersembunyi)

Akses: publik, tetapi tidak ada di menu. Satu-satunya pintu adalah tautan di kaki popover lintasan satelit. Kode: `public/satelit_data.js`. Data: `public/data/satelit/riwayat.json`.

1. Halaman menampilkan jumlah deteksi per hari per satelit (NOAA-20, NOAA-21, Terra, Aqua, S-NPP), dibagi rendah, sedang, tinggi, dan gugus lintasan.
2. Satuan di halaman ini adalah deteksi (baris FIRMS), bukan lokasi unik.
3. Rentang sampai 31 hari memuat lintasan perkiraan SGP4 yang dicocokkan dengan gugus deteksi. Rentang lebih panjang memuat gugus data saja.
4. Bila berkas belum ada, halaman menulis "Riwayat sedang disiapkan", bukan nol.

## Lapisan konsesi, gambut, dan KHG

Akses: publik, sebagai lapisan peta.

1. Konsesi: poligon sawit, HTI, HPH, dan tambang dari `public/data/lahan/konsesi.geojson`. Berkas ini memuat nama pemegang dan grup, tanpa nomor izin dan tanpa kasus perusahaan.
2. Pop-up kompleks memuat porsi titik yang berada di dalam areal konsesi per jenis (`kompleks_konsesi.json`). Bahasa keluarannya netral: titik panas berada di dalam areal konsesi, bukan pernyataan bahwa pemegang izin membakar.
3. Gambut: `public/data/lahan/gambut.geojson`. KHG: `public/data/lahan/khg.geojson` (518 unit).
4. Layar konsesi wajib memuat catatan bahwa kaitan lokasi bukan bukti (dijaga `tests/agen/gerbang-konsesi.test.mjs`).

Sering disalahpahami: batas konsesi berumur. Poligon sawit bersumber data tahun 2012 sampai 2014, bukan tutupan kebun saat ini.

## Kedalaman gambut hilang dari InSAR (lab, belum ada layar)

Tidak ada halaman dan tidak ada angka di produk. Skrip lab `scripts/data/insar_gambut.py` belum ada di repo; yang ada baru paket rancangan `data/kajian-bnpb/insar-gambut/`. Lihat [Lab InSAR gambut](/docs/pengembang/data-karhutla/insar-gambut) dan [Batasan dan pertanyaan terbuka](/docs/pengembang/data-karhutla/batasan).

## Berkas dan API data untuk pengembang

| Kebutuhan | Cara | Akses |
| --- | --- | --- |
| Titik panas 8 putaran terakhir (3 jam) | `GET /api/titik` | publik, cache tepi 600 detik (`src/worker.js:920`) |
| Kesegaran data per sumber | `GET /api/status` | publik, cache 60 detik, balasan 503 bila sumber kunci basi (`src/worker.js:939`) |
| Jeda lintasan satelit ke data tampil | `GET` atau `HEAD /api/satelit/jeda` | publik, cache 6 jam (`src/worker.js:923`) |
| Berkas hasil pipeline | `https://centurisk97.id/data/<nama>.json` | publik |
