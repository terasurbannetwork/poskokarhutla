# KEAMANAN-PRIVASI: Kedalaman gambut hilang dari InSAR

## 1. Data dan sensitivitasnya

| Data | Sumber | Sensitivitas | Boleh publik |
| ---- | ------ | ------------ | ------------ |
| Laju LOS dan vertikal per piksel | LiCSAR dan LiCSBAS (Sentinel-1, Copernicus) | rendah; atribusi wajib | tidak diterbitkan per piksel |
| Topeng terbakar | Sentinel-2 | rendah | tidak diterbitkan per piksel |
| Poligon gambut | `gambut.geojson` (PRIMS) | rendah | sudah publik, tidak diubah |
| Angka ringkas lab | `hasil_lab.json` | rendah | boleh di repo, bukan di `public/` |
| Tambahan: L-band ALOS-2 | pihak ketiga, lisensi belum diperiksa | tidak diketahui | belum diunduh (Q4) |

Tidak ada data pribadi. Paket ini tidak punya input pengguna dan tidak punya rute tulis.

## 2. Aturan keras

1. Tidak ada koordinat piksel, topeng, atau poligon area terbakar individual di berkas yang terbit.
2. Unduhan LiCSAR atau data lain hanya sesudah izin pemilik (Q1); tidak ada kunci akses di berkas yang dilacak git.
3. Atribusi LiCSAR dan Copernicus ikut di laporan lab (`ATRIBUSI` di `subsiden.py`).
4. Tidak ada kata sebab atau pelaku; tidak ada nama lahan, perusahaan, atau konsesi di laporan.
5. Data dari luar (nama berkas LiCSBAS) tidak dieksekusi; dibaca sebagai data.
6. Berkas mentah tidak masuk repo (`data/raw/` di luar pelacakan).
