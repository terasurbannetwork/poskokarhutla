# Sumber lapisan peta setara daftar Nusantara Atlas, hanya yang sah dipakai

Diperiksa 17 Okt 2026. Data Nusantara Atlas/TheTreeMap sendiri berpemilik: **tidak diambil, tidak di-scrape**.
Yang dicantumkan di sini hanya data berlisensi terbuka atau layanan publik pemerintah.

Tanda status repo: **SUDAH ADA** (berkasnya ada dan bisa langsung dipakai) · **SEBAGIAN** (ada, tapi versinya lama,
cakupannya kurang, atau berupa izin dan bukan tutupan) · **BELUM**.
Tanda akses: **UBIN** (XYZ/WMTS/ArcGIS export, bisa langsung jadi sumber `raster`/`vector` MapLibre tanpa
pengolahan) · **OLAH** (harus diunduh lalu dijadikan PMTiles/GeoJSON).

"Diuji" artinya ubinnya sudah diambil dengan `curl` untuk satu ubin Indonesia (z8 x208 y129, Kalimantan Tengah) dan
membalas 200 dengan header CORS.

## Tabel ringkas

| # | Lapisan | Status repo | Kandidat terbaik | Lisensi (sesuai teks penerbit) | Akses |
|---|---|---|---|---|---|
| 1 | Kawasan lindung | SEBAGIAN: `public/data/lahan/kawasan.geojson` (KLHK 2017 via GFW, fungsi `HK` 292 poligon) | Kemenhut `KWSHUTAN_AR_250K` (Juni 2026), `ZONA_TN_AR_50K` · WDPA | Kemenhut: tidak ada lisensi tertulis, BELUM TERVERIFIKASI · WDPA: "Terms of Use" Protected Planet, **non-komersial, tidak boleh diunduhkan ulang** | UBIN (ArcGIS export) |
| 2 | Kota & desa | SEBAGIAN: `public/data/osm/<kode>.json` kunci `desa` (OSM `place=*`, 9 provinsi prioritas), batas desa mentah `data/raw/desa/` (cahyadsn/wilayah_boundaries, MIT), batas kecamatan BIG di `public/geo/` | OSM `place=city/town/village/hamlet` (Geofabrik) + ibu kota dari Kepmendagri | ODbL 1.0 | OLAH |
| 3 | Jalan trans | SEBAGIAN: `public/data/jalan.geojson` kelas 1 (trunk/primary) | OSM `route=road` + `highway=trunk/primary` bernama "Trans …" | ODbL 1.0 | OLAH |
| 4 | Jalan per kelas | SEBAGIAN: `jalan.geojson` cuma kelas 1–3 + sungai; `unclassified`/`track` hanya di graf waktu tempuh, mentah 9 provinsi di `data/raw/osm/prov-jalan-*.json` | OSM `highway=*` (+ `tracktype`, `service`) · Gaveau dkk. jalan logging Borneo 1973–2010 | ODbL 1.0 · CIFOR: CC BY 4.0 (disimpulkan dari berkas saudara, BELUM TERVERIFIKASI untuk berkas jalan) | OLAH |
| 5 | Perairan | SEBAGIAN: `jalan.geojson` kelas 6 (`waterway=river`), titik `air` di `public/data/osm/`, `public/data/kanal.json`, sungai mentah `data/raw/osm/*-sungai-*` | OSM `waterway=*`, `natural=water` · Kemenhut PL2025 kelas Tubuh Air | ODbL 1.0 · Kemenhut BELUM TERVERIFIKASI | OLAH / UBIN |
| 6 | Kawasan terbangun | BELUM | JRC GHSL GHS-BUILT-S R2023A, epoch 2025 (100 m) atau 2018 (10 m) · Kemenhut PL2025 kelas Permukiman | GHSL: "Reuse of this data is authorised with proper acknowledgment of the source" (AWS Open Data menulis CC BY 4.0) | OLAH / UBIN |
| 7 | Kebun sawit industri | SEBAGIAN: `konsesi.geojson` jenis sawit (izin KLHK ~2014, bukan tutupan) | Descals dkk. 2024, global oil palm extent 2021 kelas 1 = industri | CC BY 4.0 | OLAH (304 MB) |
| 8 | Hutan tanaman industri | SEBAGIAN: `konsesi.geojson` jenis hti (Trase, izin 2020–2022) | Kemenhut PL2025 kelas HTI · WRI SDPT v2.0 (`gfw_planted_forests`) | Kemenhut BELUM TERVERIFIKASI · SDPT: CC BY 4.0 | UBIN, diuji |
| 9 | Sawit rakyat | BELUM | Descals dkk. 2024 kelas 2 = smallholder | CC BY 4.0 | OLAH (berkas sama dengan #7) |
| 10 | Kebun kelapa | BELUM | Descals dkk. 2023, Global Coconut Layer 2020 v1-2 | CC BY 4.0 | OLAH (45 MB) |
| 11 | Tambang | SEBAGIAN: `konsesi.geojson` jenis tambang (PPKH Jan 2026, izin di kawasan hutan saja) | Maus dkk. 2022 v2 (ada ubin GFW) · Tang & Werner 2023 · Kemenhut PL2025 kelas Pertambangan | Maus: CC-BY-SA-4.0 · Tang & Werner: CC BY 4.0 | UBIN (Maus, diuji) / OLAH |
| 12 | Hutan primer (lahan kering, mangrove, rawa) | BELUM (yang ada cuma kehilangan tutupan di `lapisan_tambahan.json`) | Kemenhut PL2025 skala 1:50.000 (kelas 2001/2004/2005) · Turubanova 2018 (2001) · GMW v3 · JRC TMF v1.2025 | Kemenhut BELUM TERVERIFIKASI · Turubanova: bebas pakai dengan sitasi, nama lisensi BELUM TERVERIFIKASI · GMW: CC BY 4.0 · TMF: "Copernicus / JRC open data", bebas dengan atribusi | UBIN, diuji |
| 13 | Tutupan pohon 2020 JRC (EUDR) | BELUM | JRC GFC2020 (ubin GFW `v2020.3`; terbaru di JRC V4) | "free of charge … without restriction of use" (Regulasi Copernicus), wajib sitasi | UBIN, diuji |
| + | Gambut | SUDAH ADA: `public/data/lahan/gambut.geojson` (GFW peatlands v20230315, CC BY 4.0) | tetap yang ada; KHG resmi tidak ditemukan terbuka | — | — |
| + | Status kawasan hutan | SUDAH ADA (versi 2017): `public/data/lahan/kawasan.geojson` | Kemenhut `KWSHUTAN_AR_250K` Juni 2026 | BELUM TERVERIFIKASI | UBIN |

## Catatan per lapisan

### Sumber pemerintah yang menutup paling banyak baris: Kemenhut Penutupan Lahan 2025

`https://geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026/PL_AR_250K/MapServer`
Nama servisnya "250K" tetapi isinya layer `PL2025_AR_50K`: IGT Penutupan Lahan 2025 skala 1:50.000, mosaik Landsat
Jan–Des 2025, 23 kelas, 734.912 poligon, kapabilitas `Map,Query,Data`. Ada juga `PL2024_AR_50K` (2024). Hak cipta
tertulis: Direktorat Inventarisasi dan Pemantauan Sumber Daya Hutan, Ditjen Planologi Kehutanan, Kemenhut.

Kelas yang memetakan langsung ke daftar Nusantara Atlas (kode dari renderer PL2024): Hutan Lahan Kering Primer
`2001`, Hutan Mangrove Primer `2004`, Hutan Rawa Primer `2005`, HTI `2006`, Perkebunan `2010` (sawit dan lainnya
tidak dipisah), Permukiman `2012`, Pertambangan `20141`, Transmigrasi `20122`/`6000`, Tubuh Air `5001`.

Sumber MapLibre tanpa pengolahan (diuji: 200, `image/png`, CORS memantulkan origin, ±1 detik per ubin):

```
https://geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026/PL_AR_250K/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image
```

Untuk satu kelas saja tambahkan `&layerDefs={"0":"<kolom kelas> IN (2001,2004,2005)"}`. Nama kolom PL2025 belum
dicek (di PL2024 kolomnya `PL2024_ID_50K`). Risikonya: server lambat (permintaan `KWSHUTAN` dengan bbox besar habis
waktu 120 detik), dan tidak ada lisensi tertulis. Pakai sebagai ubin tampilan saja, jangan ditarik massal lalu
diterbitkan ulang sebagai berkas. Pola yang sama sudah dipakai `scripts/scrape/konsesi.py` untuk PPKH.

### 1. Kawasan lindung

- **Kemenhut** `Peta_Interaktif_2026/KWSHUTAN_AR_250K` (layer `KWSHUTAN_AR_250K_JUNI2026_REV1`, kapabilitas `Map`
  saja, jadi cuma export gambar). Fungsi KSA/KPA = kawasan konservasi. Juga ada `ZONA_TN_AR_50K` (zonasi taman
  nasional, `Query,Map,Data`) dan `KPHK_AR_250K`.
- **WDPA** (UNEP-WCMC & IUCN). Ubin GFW tersedia (`wdpa_protected_areas/v202308/default/{z}/{x}/{y}.pbf`, diuji).
  Syaratnya: komersial butuh izin tertulis, sub-lisensi dan redistribusi dilarang, boleh ditampilkan daring asal
  **tidak bisa diunduh** dan atribusi terlihat. Karena layar kita membuka data untuk diunduh dan bisa dipakai pihak
  komersial, **Kemenhut lebih aman**. WDPA cukup sebagai cadangan tampilan.

### 2. Kota & desa

OSM `place=city/town/village/hamlet` sudah ditarik untuk 9 provinsi prioritas lewat Overpass (`scripts/scrape/osm.py`).
Untuk seluruh Indonesia: Geofabrik `https://download.geofabrik.de/asia/indonesia-latest.osm.pbf` (1,74 GB, versi
261016), ODbL 1.0. Tingkat ibu kota negara/provinsi/kabupaten tidak andal di tag OSM, jadi tempelkan dari daftar
Kepmendagri yang sudah dipakai `DESA_REPO` (MIT). Pusat kecamatan dan pusat desa bisa diturunkan dari titik dalam
poligon batas BIG/cahyadsn yang sudah ada di repo.
BIG punya gasetir (`geoservices.big.go.id/rbi/rest/services/TOPONIMI/Gasetir_RI_2023_Penetapan_1`), tetapi
permintaannya habis waktu saat diuji: BELUM TERVERIFIKASI.

### 3–4. Jalan trans dan jalan per kelas

- OSM: `trunk/primary` = utama, `secondary/tertiary/unclassified/residential` = lokal, `track` = jalan tanah/kebun/
  logging (dengan `tracktype=grade1..5`), `service`, `highway=construction`/`proposed` = rencana (cakupannya tipis).
  Jalan trans: relasi `route=road` atau ruas `trunk` yang bernama "Trans Sumatera/Kalimantan/Papua/Sulawesi".
- **Jalan logging**: Gaveau, Salim, Arjasakusuma 2016, *Deforestation and industrial plantations development in
  Borneo*, CIFOR Dataverse doi:10.17528/CIFOR/DATA.00049, `Logging_road.7z` v2.1 ±39 MB, digitasi tangan dari Landsat
  1972–2010, **Borneo saja**. Lisensinya disimpulkan dari berkas lain di dataset yang sama (CC BY 4.0): cek ulang di
  `https://data.cifor.org/file.xhtml?fileId=928` sebelum terbit. `wur_forest_roads` di GFW hanya Lembah Kongo.
- **Tanpa sumber terbuka**: pemisahan *jalan kebun*, *jalan transmigrasi*, *jalan petani/smallholder*, dan *rencana
  jalan* seperti di Nusantara Atlas. Itu hasil digitasi mereka sendiri. Pendekatan sah yang paling dekat: klasifikasi
  `track` OSM per poligon tempatnya (dalam HGU sawit atau HTI = jalan kebun/HTI, dalam kelas Transmigrasi PL2025 =
  jalan transmigrasi, dalam sawit rakyat Descals = jalan petani). Itu turunan kita sendiri dan harus disebut begitu
  di legenda.
- Repo sudah memegang mentahnya untuk 9 provinsi. Kelas 4–5 tinggal dikeluarkan dari `scripts/scrape/akses.py` ke
  PMTiles terpisah, tidak perlu ditarik ulang.

### 5. Perairan

OSM `waterway=river/stream/canal` + `natural=water` (ODbL). Sungai besar sudah ada di `jalan.geojson` kelas 6, kanal
di `kanal.json`. Untuk poligon danau/waduk: kelas Tubuh Air PL2025 (ubin), atau JRC Global Surface Water
(`jrc_surface_water_transitions_1984_2020` di GFW, "Source open licence") kalau perlu.

### 6. Kawasan terbangun

JRC GHSL `GHS_BUILT_S_GLOBE_R2023A` di `https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_BUILT_S_GLOBE_R2023A/`:
`GHS_BUILT_S_E2025_GLOBE_R2023A_54009_100` (proyeksi 2025, 100 m), `…_E2020_…_4326_3ss` (±90 m), dan
`GHS_BUILT_S_E2018_GLOBE_R2023A_54009_10` (10 m dari Sentinel-2, paling tajam). Teks penerbit: "© European Union,
1995-2025. Reuse of this data is authorised with proper acknowledgment of the source." Tidak ada layanan ubin, jadi
OLAH: potong ke Indonesia lalu jadikan PMTiles raster (ratusan MB untuk 10 m, puluhan MB untuk 100 m).
ESA WorldCover 2021 v200 (10 m, CC BY 4.0) punya WMTS di `services.terrascope.be/wmts/v2`, tetapi koneksinya diputus
saat diuji: BELUM TERVERIFIKASI. Cara tercepat tanpa unduh: kelas Permukiman PL2025.

### 7 & 9. Sawit industri dan sawit rakyat

Descals dkk. 2024, *Global mapping of oil palm planting year from 1990 to 2021*, ESSD 16:5111, Zenodo
`https://doi.org/10.5281/zenodo.13379129` v1.2. Lisensi: Creative Commons Attribution 4.0 International.
`GlobalOilPalm_OP-extent.zip` 156,5 MB (10 m, 2021; 0 = lain, **1 = industri, 2 = rakyat**) dan
`GlobalOilPalm_OP-YoP.zip` 146,5 MB (tahun tanam 1990–2021, 30 m), 609 ubin GeoTIFF 100 × 100 km.
Ini satu-satunya sumber terbuka yang memisahkan industri dan rakyat. Peta 2019-nya (zenodo.4473715) tertulis CC BY 3.0
di katalog komunitas GEE, belum dicek di Zenodo. Peta sawit terbuka yang lebih baru dari 2021 tidak ditemukan.
GFW `gfw_oil_palm` berlisensi "CC BY 4.0 (excluding Indonesia)", jadi bukan jalan keluar.

### 8. HTI

- Kelas HTI PL2025 (ubin Kemenhut).
- WRI SDPT v2.0 = GFW `gfw_planted_forests/v20231128`, lisensi "CC BY 4.0" menurut metadata GFW (dicek lewat API).
  Ubin raster `https://tiles.globalforestwatch.org/gfw_planted_forests/v20231128/default/{z}/{x}/{y}.png` diuji, 200,
  CORS `*`. Ubin vektornya (`dynamic/….pbf`) 7,9 MB per ubin z8, terlalu berat. Datanya mencampur sawit, kayu serat,
  dan tanaman lain dari tahun yang berbeda-beda; WRI sendiri menyebut ada "definitional and temporal inconsistencies".
  GFW `idn_wood_fiber` bertanda "View Only, Not Downloadable".

### 10. Kelapa

Descals dkk. 2023, *High-resolution global map of closed-canopy coconut palm*, ESSD 15:3991, Zenodo
`https://doi.org/10.5281/zenodo.8128183` v1-2. Lisensi: Creative Commons Attribution 4.0 International.
`GlobalCoconutLayer_2020_v1-2.zip` 45,3 MB (20 m, 878 ubin) dan peta kerapatan 1 km 2,3 MB. Ini hanya kelapa
**berkanopi rapat**. Akurasi produsen turun ke ±11 % kalau kelapa jarang ikut dihitung, jadi legenda wajib menyebutnya.

### 11. Tambang

- Maus dkk. 2022, *Global-scale mining polygons (Version 2)*, PANGAEA doi:10.1594/PANGAEA.942325, 44.929 poligon,
  GPKG. Lisensi: Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA-4.0). Konsekuensi SA: turunan
  yang kita terbitkan juga harus CC BY-SA. Ubin GFW `https://tiles.globalforestwatch.org/pangaea_global_mining/v2/dynamic/{z}/{x}/{y}.pbf`
  diuji (200, CORS `*`).
- Tang & Werner 2023, *Global mining footprint mapped from high-resolution satellite imagery*, Zenodo
  `https://doi.org/10.5281/zenodo.7894216`, 74.548 poligon, shapefile 320 MB. Lisensi: Creative Commons Attribution
  4.0 International. Lebih rinci (pit, timbunan, tailing). OLAH: potong ke Indonesia lalu PMTiles.
- Kelas Pertambangan PL2025. WIUP ESDM (MODI) butuh token: tidak dipakai.

### 12. Hutan primer

- Kemenhut PL2025: satu-satunya yang memisahkan primer lahan kering / mangrove / rawa dan **terbaru (2025)**.
- Turubanova dkk. 2018, primary humid tropical forest **2001**, 30 m. GFW `umd_regional_primary_forest_2001/v201901`,
  ubin `…/default/{z}/{x}/{y}.png` diuji. Keadaan 2001; gabungkan dengan lapisan kehilangan tutupan yang sudah ada
  supaya "primer tersisa" tampil benar.
- Global Mangrove Watch v3.0 (1996–2020), GFW `gmw_global_mangrove_extent/v3/default/{z}/{x}/{y}.png`, "Creative
  Commons Attribution 4.0 International License", diuji. GMW v4.0 (10 m, 2020) tidak ditemukan di Zenodo: BELUM
  TERVERIFIKASI.
- SBTN Natural Forests (GFW `sbtn_natural_forests_map/v202504/natural_forest/…png`), diuji, lisensi tidak tercantum
  di metadata: BELUM TERVERIFIKASI.
- JRC TMF v1.2025 (1990–2025, 30 m): "Copernicus / JRC open data", bebas dengan atribusi. Tidak ada ubin; cermin COG
  `https://data.source.coop/epoch/jrc-tmf/v1_2025/<TILE_ID>/<Produk>.tif` (117 GiB global). Bisa dibaca langsung
  di peramban dengan pustaka COG, atau dipotong lalu jadi PMTiles. Simpan untuk tahap belakang.

### 13. Tutupan pohon 2020 JRC (EUDR)

JRC GFC2020 (Bourgoin dkk. 2024), doi:10.2905/JRC.3KATEH8. Halaman JRC: "free of charge … without restriction of use",
syarat penuh merujuk ke Regulasi Copernicus, wajib sitasi. Versi terbaru V4 (`JRC_GFC2020_V4_[lat]_[lon].tif`, ubin
10°, mosaik global ±50 GB). WMS resmi `https://ies-ows.jrc.ec.europa.eu/iforce/gfc2020/wms.py` (RGB saja). Paling
murah: ubin GFW `https://tiles.globalforestwatch.org/jrc_global_forest_cover/v2020.3/default/{z}/{x}/{y}.png`, diuji
(200, CORS `*`); ini V3, bukan V4.

### Gambut dan KHG

`gambut.geojson` yang sudah ada cukup. KHG nasional (651 unit, SK.130/MENLHK/2017) tidak ditemukan sebagai unduhan
atau layanan terbuka. Server SIPPEG (`sippeg.menlhk.go.id/arcgis/.../FEG_50K_Nasional_Agustus_2022`, fungsi ekosistem
gambut 1:50.000) tidak membalas saat diuji: BELUM TERVERIFIKASI. Alternatif ubin: GFW `gfw_peatlands/v20230315`,
"CC BY 4.0", diuji.

## Urutan bangun yang disarankan

Yang termurah dan paling bernilai lebih dulu. Langkah 1–3 cuma menambah entri di `public/data/lapisan_tambahan.json`,
tanpa skrip dan tanpa berkas data baru.

1. **Ubin GFW langsung** (raster PNG, CORS `*`, pola sama dengan entri yang sudah ada): JRC GFC2020 (#13), hutan
   primer 2001 (#12), mangrove GMW v3 (#12), SDPT perkebunan & HTI (#8). Perlu ±0 MB dan sudah diuji.
2. **Kemenhut PL2025 lewat ArcGIS export**: satu sumber untuk hutan primer per tipe, HTI, perkebunan, tambang,
   permukiman, tubuh air, transmigrasi. Satu lapisan dengan filter `layerDefs` per kelas. Uji dulu waktu muat di zoom
   5–7; kalau server terlalu lambat, ubinnya disimpan di cache Worker. Sekalian ganti `kawasan.geojson` 2017 dengan
   `KWSHUTAN` Juni 2026 sebagai ubin.
3. **Tambang Maus v2** lewat ubin vektor GFW (#11). Legenda menyebut CC BY-SA.
4. **Jalan kelas 4–5 dan sungai kecil dari mentah yang sudah ada** (`data/raw/osm/prov-jalan-*.json`, 9 provinsi) →
   PMTiles. Tanpa tarik ulang.
5. **Sawit industri vs rakyat, Descals 2021** (#7, #9): 304 MB unduh, potong ke Indonesia, PMTiles raster (perkiraan
   puluhan MB). Nilai unik tertinggi: tidak ada sumber terbuka lain.
6. **Kelapa Descals 2020** (#10): 45 MB, PMTiles.
7. **GHSL BUILT-S** (#6): epoch 2025 100 m dulu (kecil), 10 m 2018 kalau perlu tajam.
8. **OSM Indonesia penuh** (Geofabrik 1,74 GB) → PMTiles untuk tempat (#2) dan semua kelas jalan (#3–4) di luar 9
   provinsi prioritas, plus klasifikasi turunan jalan kebun/transmigrasi/petani.
9. **Tang & Werner** (#11, 320 MB) dan **jalan logging Gaveau** (Borneo, 39 MB) setelah lisensi berkas CIFOR dicek.
10. **JRC TMF** (117 GiB global) terakhir, hanya kalau perlu riwayat tahunan 1990–2025.

## Tidak ada sumber terbuka yang sah

- Jalan kebun, jalan transmigrasi, jalan petani/smallholder sebagai kelas tersendiri, dan rencana jalan: hanya bisa
  diturunkan sendiri dari OSM `track` dengan poligon tempatnya, dan legendanya harus menyebut itu turunan.
- KHG nasional resmi: tidak ada unduhan atau layanan terbuka yang bisa diverifikasi.
- Sawit (industri/rakyat) yang lebih baru dari 2021: tidak ditemukan.
- WDPA ada, tetapi syaratnya (non-komersial, tidak boleh bisa diunduh) bertabrakan dengan keterbukaan layar ini;
  pakai Kemenhut.
- Semua layanan Kemenhut dan BIG yang dipakai di sini publik tanpa login, tetapi lisensinya tidak tertulis (BELUM
  TERVERIFIKASI). Untuk BIG, `scripts/geo/batas.py` merujuk UU 4/2011 untuk Informasi Geospasial Dasar; peta
  Kemenhut adalah Informasi Geospasial Tematik, dan status pakai ulangnya perlu dikonfirmasi ke Ditjen Planologi
  sebelum ditarik massal atau diterbitkan ulang sebagai berkas.
