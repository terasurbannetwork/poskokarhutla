# Bukti luas kebakaran resmi: DITAHAN (25 Okt 2026)

Pemilik menahan pekerjaan ini; rencana dilanjutkan sekitar akhir November 2026. Belum prioritas.

## Keadaan saat ditahan

- Sampling acak berlapis 2023 selesai ditandai otomatis (`scripts/data/sampling_luas.py`, 1.000 titik, strata A/B/C x gambut/mineral).
- Aturan ketat (jeda pra-pasca <= 60 hari, dNBR >= 0,27, NBR pasca < 0,1, NIR turun, koreksi latar di B/C):
  1.959.610 ha (selang 95% 514.687-3.404.532) vs resmi 1.161.193 ha. Skenario ragu = tidak terbakar: 1.060.238 ha.
- Kesimpulan saat ini: BELUM membuktikan luas resmi terlalu kecil. 50% titik tanpa citra bersih <= 60 hari,
  strata C (250 dari 300 titik) praktis tak teramati, label belum diperiksa manusia.
- Bukti pendukung lain yang sudah ada: uji dNBR 38 cluster 2023 (`scripts/data/ujiluas_kab.py`, median 2,25x luas harian
  kita); Lohberger dkk. 2018 (2015 ~4,6 juta ha vs resmi 2,6 juta ha).

## Langkah berikut saat dilanjutkan

1. Periksa visual 39 titik terbakar + contoh ragu/tidak di `periksa_2023.html` (dua penilai manusia; ukur kecocokan).
2. Tutup celah awan: Landsat 8/9 dan radar Sentinel-1 sebagai sumber tambahan, jendela lebih panjang untuk strata C.
3. Perluas ke 2019 (Sentinel-2) dan 2015 (Landsat; aset Earth Search requester-pays, cari sumber lain).
4. Baru sesudah itu: deck "bukti data dan usulan" (gaya deck metode, templat BNPB), dibingkai sebagai estimasi independen.
