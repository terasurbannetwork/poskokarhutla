# Dossier lapangan pilot SIPPA Kalteng (keputusan SIPPA 58, 59)

Pembangun dossier PDF 10 lokasi dan data web `/uji-pilot`. Jalan di mesin lokal (butuh Pillow, curl, Chrome untuk PDF),
bukan di CI. Berkas antara (`raw/`, `img/`, `ubin/`, `foto/`, `live_*.json`, `data.json`) ditulis ke folder kerja `OUT`
(folder skrip ini), jangan di-commit.

Urutan:

1. `live_*.json`: unduh `kluster.json`, `hotspot72.json`, `fwi.json`, `meta.json` dari worker produksi ke folder ini.
2. `python3 kumpul.py`: pilih kompleks dan lingkungan (lokasi ada di `SITUS`).
3. `python3 tarik.py`: PRIMS BRGM, cuaca Open-Meteo, ubin Esri.
4. `python3 analisis.py`: gambut, titik petak, sumber air, hidraulika (`scripts/data/sippa/hidraulika.py`), citra Sentinel-2 SWIR (`citra_pilot.py`), peta.
5. `python3 cetak.py`: `dossier.html`, lalu cetak PDF dengan Chrome headless.
6. `python3 ekspor_web.py`: `src/uji_pilot_data.js` dan `public/pipa/uji_pilot/img/` untuk `/uji-pilot`.

Teks untuk regu ada di `teks.py` (bahasa sehari-hari), lampiran alat di `lampiran.py` (foto Wikimedia Commons berlisensi bebas, kredit di kartu).
