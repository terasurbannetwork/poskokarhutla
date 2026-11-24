# KEAMANAN-PRIVASI: Pemetaan bekas longsor dari satelit

## Data

| Data | Sifat | Tempat |
| --- | --- | --- |
| Citra Sentinel-1, Sentinel-2, DEM Copernicus, Hansen GFC | terbuka, berlisensi atribusi | dibaca langsung, tidak disimpan mentah di repo |
| Poligon dan agregat bekas longsor | tanpa data orang; klaim sensitif | R2 `longsor/bekas/`, rute staf |
| Lembar digitasi penafsir | nama penafsir = data orang | nama tidak masuk repo; lembar memakai kode penafsir, daftar kode di R2 staf |
| Citra resolusi tinggi pihak lain | lisensi terbatas | hanya ditafsirkan di layar, tidak diunduh (Q2) |

## Aturan

- Rute baca di balik sesi staf; tanpa sesi = 401 sebelum R2 disentuh.
- Tidak ada kalimat yang menuduh pihak tertentu (pemegang konsesi, penebang) sebagai penyebab; irisan dengan konsesi tidak dihitung dalam paket ini.
- Atribusi sumber citra wajib tampil di layar dan di metadata JSON.
- Tidak ada kunci API: semua sumber anonim (token SAS Planetary Computer diambil dari API-nya tiap jalan, tidak disimpan).

## Pemeriksa

`security-reviewer` dan `guard-api` untuk rute; `higiene-repo` memastikan tidak ada raster besar atau lembar penafsir bernama yang ter-commit.
