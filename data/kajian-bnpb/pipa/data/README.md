# Data publik untuk kajian pipa/kit gambut, Kalimantan Tengah (prov 62)

Dibuat oleh `data/kajian-bnpb/bangun/pipa_data.py` (langkah: dasar osm_tarik osm dem gsw wc chirps mcd_unduh mcd_olah matriks;
`mcd_olah` dijalankan dengan `data/raw/pipa/venv-hdf/bin/python` karena butuh pyhdf, HDF4 tak terbaca GDAL Homebrew).
Mentah di `data/raw/pipa/` (gitignore). Unit: 865 kompleks api prov 62 di `public/data/kendala.json`, koordinat dari `public/data/operasi.json`.
Tanggal tarik: 24-25 Okt 2026.

| Berkas | Sumber | Isi | Lisensi | Keterbatasan |
|---|---|---|---|---|
| osm_jarak.csv | OpenStreetMap via Overpass API (overpass-api.de), ubin 0,5 derajat + tepi 0,15; `way` highway/waterway/natural=water/landuse=reservoir | jarak km ke jalan kendaraan (kend), jalan utama, setapak, air semua, air kecil + titik terdekat | ODbL (c) OpenStreetMap contributors | Geofabrik diblokir proxy; relasi multipolygon (danau besar) tak ikut; jarak ke vertex dipadatkan 150 m (galat <=75 m); dibatasi 16 km (kolom `_terpotong`); track belum tentu bisa dilalui musim hujan; kelengkapan OSM di gambut tak seragam |
| dem_elevasi.csv | Copernicus DEM GLO-30 (AWS open data) | elevasi kompleks, titik air dan titik jalan terdekat, beda | Copernicus (gratis, atribusi) | DSM termasuk kanopi (bias +beberapa m di hutan); presisi vertikal setinggi 1 m tak bermakna |
| gsw_air_terdekat.csv | JRC Global Surface Water v1.4 (2021), occurrence+seasonality, maks piksel 5x5 | permanen/musiman/tak_terdeteksi di titik air terdekat | CC-BY 4.0 (Pekel et al. 2016) | Sungai/parit kecil di bawah kanopi hampir tak terdeteksi satelit optik: `tak_terdeteksi` bukan berarti kering |
| area_terbakar.csv | MODIS MCD64A1 v061 (NASA LP DAAC, Earthdata), 600 granul h29v08/h29v09, 2001-2025 | jumlah tahun terbakar di jendela 5x5 piksel (~2,3 km) dan 11x11 (~5 km) | NASA open | Piksel 463 m; terbakar kecil di bawah ambang tak terpetakan |
| chirps_*.csv | CHIRPS v2.0 bulanan COG (data.chc.ucsb.edu) | total Jul-Okt, anomali vs klimatologi 2001-2020 per tahun; ringkas dan tingkat provinsi | CC0 | Sel 0,05 derajat (~5,5 km), banyak kompleks berbagi sel |
| worldcover.csv | ESA WorldCover 2021 v200 (AWS) | persen kelas dalam ~1 km | CC-BY 4.0 | resolusi 10 m, kelas "pohon" tak membedakan hutan gambut vs lain |
| matriks_jarak.md | turunan osm_jarak.csv | matriks zona A-D | | ambang air 2,5 km, jalan 5 km (dari koordinator) |
| kompleks.csv | kendala.json + operasi.json | id, kab, lat, lon, air/jalan lama | | |

## GloFAS (debit sungai model): tidak ditarik
Butuh akun Copernicus CDS + API key (dataset `cems-glofas-historical`). Tidak membuat akun; perlu pemilik mendaftar dan menaruh `CDSAPI_KEY` di .env.
Catatan: resolusi 0,05 derajat hanya relevan untuk sungai besar, bukan parit/kanal gambut.

## Status
Semua langkah 1-6 selesai; 7 dicatat saja.
