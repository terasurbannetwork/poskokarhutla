# Paparan Karhutla Provinsi Lampung 241026

Per 24 Oktober, cut-off 24 Okt 2026 06.44 WIB, jendela 17–24 Okt (24 Okt sementara). Templat: deck pemilik
"Paparan Karhutla Jawa Timur - Malang - Arjuno 231026.pptx"; isi ditulis ulang native di XML (`buat.py` + `pp.py`). Empat slide:
provinsi, Kab. Lampung Timur, TN Way Kambas, kebutuhan penanganan TNWK. Kepala slide dirapatkan ke atas dan isi diregang mengisi ruang.

Sumber angka (semua luas dan belum padam = data kita, bukan angka lapangan):

- Titik provinsi dan kabupaten: `harian30.json` website (tarikan 24 Okt, dibuat 08.39), tanpa titik industri. Lampung 24 Okt = 110.
- Luas dan belum padam 17–23 Okt: `peta_karhutla.json` dan `peta_karhutla_kab.json`. 24 Okt belum terbit di website, jadi dihitung dari
  titik FIRMS mentah s.d. 06.44 WIB dengan rumus website (`luas.py`; untuk 23 Okt rumus ini sama persis dengan website, diassert di `angka.py`).
- Kecamatan dan kawasan TNWK: titik FIRMS mentah (MODIS + S-NPP + NOAA-20, titik industri dibuang; `data.py`). Jumlah per hari provinsi
  sama persis dengan `harian30.json` (diassert). Batas TNWK: relasi OSM 7757736 (`tnwk.geojson`).
- Cluster: `kluster_awal.json` (yang dimuat app). Lampung 284 cluster: 0 Prioritas, 74 Siaga, 173 Patroli, 37 Rutin.
- Fakta lapangan non-luas (sortie, drop, liter, tim, ISPU, jarak pandang, kebutuhan sarpras): Laporan Harian Dit. Koordalops BNPB 23 Okt 2026
  entri 05 dan ringkasan WA.

Bangun ulang (folder kerja berisi `raw/*.csv` FIRMS 15–24 Okt UTC, `osm/tnwk.json`, `web/*.json`, `ref/j.pptx`):

    python3 data.py && python3 angka.py && python3 peta.py && node ikon.mjs
    node render.mjs peta-lampung.svg peta-lampung.png peta-tnwk-dasar.svg peta-tnwk.png
    python3 buat.py ref/j.pptx keluar.pptx

`buat.py` menolak titik tengah, em dash, dan angka luas lapangan (29,8 ha, ±40 ha, ±12 ha) di teks slide.
