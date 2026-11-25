# CATATAN IG-01: periksa data dan impor (24 Nov 2026)

Dibuat `pipa-data`; dasar tiket `data/kajian-bnpb/insar-gambut/TIKET.md` IG-01. Semua dari pemeriksaan nyata hari ini.

## Bingkai LiCSAR
- Satu-satunya bingkai yang menutup Palangka Raya (113,9 BT, 2,2 LS) dari pemindaian 2.649 bingkai JASMIN: **003D_09241_131313** (track 3, turun, kotak 112,02-114,75 BT, 3,82-1,03 LS). Geometri naik tidak ditemukan (bingkai yang gagal dibaca E.tif-nya tidak dihitung). Metadata: master 20210805, sudut datang rata-rata 39,6 derajat.
- 1.481 pasangan terdaftar (2015-05 sampai 2026-01-23). **Tidak ada pasangan Jul-Sep 2026** (terakhir 20260111_20260123; bingkai Jakarta 098A sampai 2026-04, Pekalongan 076D sampai 2026-10). Musim D3 tidak tersedia: lab memakai musim api 2023 (Agu-Nov), 16 epoch 12-harian dari 2023-07-26.
- Berkas ada di JASMIN `LiCSAR_products.public/<track>/<frame>/interferograms/<pair>/<pair>.geo.{unw,cc}.tif`. Jalur CEDA `dap.ceda.ac.uk/.../licsar_products/3/003D_09241_131313/` memberi **404**, sehingga `~/licsbas/ambil.py` (CEDA) mengembalikan 0 dari 59. Salinan pengunduh dengan basis JASMIN public dipakai (scratchpad, di luar repo); `ambil.py` milik jalur paket penurunan-tanah tidak diubah. Indeks `LiCSAR_products/.../interferograms/<pair>` hanyalah berkas HTML tautan.
- GACOS (`epochs/` CEDA) untuk bingkai ini tidak ada: tanpa koreksi atmosfer.

## Keluaran LiCSBAS (dibaca, bukan diasumsikan)
`TS_GEOCml3/results/`: `vel`, `vel.filt`, `vel.filt.mskd` (float32, sama dengan yang dibaca `subsiden.baca_raw`), `vstd`, `coh_avg`, `n_unw`, `n_loop_err`, `n_gap`, `n_ifg_noloop`, `resid_rms`, `stc`, `maxTlen`, `mask`, `hgt`; deret waktu `cum_filt.h5` (16 epoch). Kisi 267 x 367 (ml3, sekitar 0,33 km). Koherensi dan galat loop tersedia untuk uji sebab (dipakai: `coh_avg`, `n_unw`, `resid_rms`, `n_loop_err`). `E.geo`, `U.geo`, `EQA.dem_par` dari `GEOCml3/`.

## Impor
- `scripts/banjir/subsiden.py` **dapat diimpor tanpa efek samping** (`python3 -I -c "sys.path.insert(0,'scripts/banjir'); import subsiden"`): `baca_par`, `baca_raw`, `vertikal`, `kuantil`, `Kisi`, `SAH_MM` ada. Tidak ada salinan, tidak ada perubahan di berkas `banjir`.
- `scripts/data/luas_citra.py` **tidak mengekspos piksel**: fungsinya per insiden pada grid 80 x 80 (`topeng`, `luas`). Hanya konstanta `DNBR` (0,27) dan `NBR_PASCA_MAKS` (0,2) diimpor. Raster kelas (terbakar, kontrol) dibuat di luar repo (Sentinel-2 L2A Earth Search, gdal di env `lb`) dengan ambang yang sama; tidak ada perubahan di `luas_citra.py` (ADR-2 tidak butuh perubahan, cukup konstanta).
- Pemrosesan di luar repo: skrip lab `~/licsbas/pky/{bakar_s2,stac,jendela,ambil_public}.py` dan `~/licsbas/jalan.sh pky`; data di `~/licsbas/pky` (140 MB).
