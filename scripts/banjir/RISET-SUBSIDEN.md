# Penurunan tanah: akses data dan resep LiCSBAS (21 Okt 2026)

Status: aksi LiCSBAS BELUM dijalankan (diblokir izin, lihat bagian akhir). Yang jadi: `subsiden_literatur.json`
(kutipan terverifikasi), `subsiden.py` (agregasi stdlib, `uji` hijau), kartu rob menampilkan "sampai X cm/th".

## Fakta akses data (diuji 20-21 Okt 2026)
- JASMIN `https://gws-access.jasmin.ac.uk/public/nceo_geohazards/LiCSAR_products/<track>/<frame>/metadata/`
  memuat E, N, U, hgt, landmask, baselines. `vlos_eur.tif` = proyeksi LOS gerak lempeng (12,9 sampai 14,1 mm/thn
  di Jakarta turun, halus), BUKAN deformasi.
- Interferogram `unw/cc` ada di CEDA: `https://dap.ceda.ac.uk/neodc/comet/data/licsar_products/<track>/<frame>/<pair>/<pair>.geo.{unw,cc}.tif`
  (HTTP Range jalan; 2 sampai 10 MB per berkas penuh). Daftar pasangan: JASMIN `.../interferograms/` (nama saja).
- LiCSBAS01 (v1.6.3, klon 29 Nov 2024) masih menunjuk `gws-access.ceda.ac.uk` yang sudah mati dan JASMIN
  `interferograms/<pair>/` yang kini hanya berkas teks tautan: ia gagal. Perlu pengunduh sendiri.
- Frame: Jakarta 047D_09652_111009 (turun) + 098A_09673_121312 (naik); Semarang/Demak 076D_09725_121107 + 127A_09749_121312;
  Pekalongan 076D_09725_121107 + 025A_09718_120810; Surabaya 003D_09757_111111 + 054A_09773_111213.
- Format unw beragam (strip deflate prediktor 3, tiled 256, BigTIFF PackBits); GDAL membacanya semua.

## Resep (di luar repo, ~/licsbas)
1. `~/licsbas/bin/micromamba` + env `lb` (conda-forge: python 3.11, numpy, scipy, h5py, matplotlib, gdal 3.13, cartopy,
   astropy, statsmodels, multiprocess). Klon `~/licsbas/LiCSBAS`. Pembungkus `~/licsbas/lb.sh <skrip LiCSBAS> args`.
2. Pengunduh sendiri (pengganti 01) dengan `gdal.Translate('/vsicurl/<url CEDA>', projWin=jendela kota)` untuk
   pasangan 2019-01 sampai 2025-10 yang Dt <= 60 hari: hasilnya GEOC/<pair>/<pair>.geo.{unw,cc}.tif terpotong
   (~0,5 MB per pasangan), plus E, N, U, hgt, baselines, metadata.txt terpotong. Jendela Jakarta lon 106,55 sampai
   107,20 dan lat -6,65 sampai -5,95 (selatan sampai Bogor sebagai acuan stabil).
3. `LiCSBAS02_ml_prep.py -n 3` (sekitar 330 m), lalu `11`, `12` (loop closure), `13`, `14`, `15`, `16 --deg_deramp 1`
   (tanpa GACOS bila tak diunduh; deramp WAJIB dinyatakan di laporan).
4. Hapus `GEOC/` mentah setelah GEOCml terbentuk.
5. `python3 scripts/banjir/subsiden.py hitung jakarta 31 <TS_naik> <TS_turun> 098A_... 047D_... 2019-2025 -6.55`.
   Gerbang pola: bila pesisir utara tidak turun lebih cepat dari selatan, tidak ada berkas yang ditulis.

## Jadwal usulan
Kuartalan atau tahunan, dijalankan manual di mesin lokal (bukan workflow); hanya `subsiden.json` yang dikomit.

## Hambatan 21 Okt 2026
Izin menolak menjalankan atau menyunting kode LiCSBAS hasil klon (kelas "Code from External") setelah env dan klon jadi.
Keputusan pemilik diperlukan: aturan izin untuk `~/licsbas/lb.sh` dan pengunduh `~/licsbas/ambil.py`.
