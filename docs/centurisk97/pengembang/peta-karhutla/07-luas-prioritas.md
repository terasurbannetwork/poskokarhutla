# Luas terbakar dan Prioritas provinsi

Halaman ini menguraikan rumus luas terbakar, belum padam, dan padam, serta ambang masuk dan keluar Prioritas provinsi.

## Luas terbakar, belum padam, dan padam

Dihitung di `scripts/data/peta_karhutla.py` per provinsi per hari WIB dan per kabupaten:

```
luas  = (n_N20 x 4,12 + n_N21 x 4,16) / 2     [ha]  (F20 dan F21, baris 84)
belum = (A + B) x 2,25                         [ha]  (F_LOK, baris 89)
padam(d) = titik NOAA-20/21 hari d-2 yang sel 3x3-nya tanpa deteksi pada hari d-1 dan d
```

- n adalah titik NOAA-20 atau NOAA-21 berkeyakinan nominal atau tinggi yang lolos saringan sumber panas tetap.
- F20 adalah median luas resmi BNPB 2019 sampai 2025 dibagi titik N20; F21 median 2024 sampai 2025. Uji Januari sampai Juli 2026: jumlah nasional 219.174 ha, 8,5 persen di atas SiPongi (202.011 ha) (teks Metode di `public/index.html:6446`).
- Per pita bujur 5 derajat: bila satu satelit hilang (nol titik sementara satelit lain sedikitnya `CELAH_MIN`), titik pita itu dihitung dari satelit yang ada saja dengan bobot penuh.
- Belum padam adalah lokasi unik hari itu yang A) bertahan (ada deteksi di sel 3x3 12 sampai 36 jam sebelumnya) atau B) baru tetapi berada di cluster firespot "ya". Hasilnya stok, tidak dijumlah antarhari.
- Padam memakai aturan pemilik: 48 jam tanpa titik. Ini berbeda dengan `harian.py` (72 jam, 168 jam di gambut).
- Angka dibulatkan sekali per provinsi (setengah ke atas) dan nasional adalah jumlah angka provinsi; jumlah kabupaten bisa bergeser paling banyak (m + 1)/2 ha per hari dari angka provinsi.
- Hari yang lintasan satelitnya hilang di FIRMS ditandai celah, dan tidak dikoreksi.

Ini perkiraan satelit. Angka resmi tetap dari KLHK dan BNPB. Luas resmi BNPB 129.899 ha adalah luas dipadamkan, bukan luas terbakar (catatan memori pemilik).

## Prioritas provinsi (ambang masuk dan keluar)

Aturan di `public/prioritas.js:8` sampai `27`, dasar pilihan pemilik 11 November 2026 sesudah uji balik ulang (`scripts/data/uji_ambang_prioritas.py`, VIIRS S-NPP 2023 sampai 2025, dinilai tiap Senin Juli sampai November, kejadian besar = rata-rata 14 hari berikutnya sedikitnya 50,3 VIIRS per hari):

```
h = rata-rata 3 hari lengkap dari hotspot lokasi unik semua satelit (satuan laporan BNPB)
masuk  bila h >= garis masuk
keluar bila h < garis keluar selama 3 hari berturut-turut
garis dasar VIIRS: masuk 60, keluar 30
satuan laporan = garis dasar x rasio satelit:
  jendela berakhir sampai 2 Nov 2026: rasio 3,0 -> masuk 180, keluar 90
  sesudahnya (S-NPP pensiun):        rasio 2,4 -> masuk 144, keluar 72
```

![Grafik batang garis masuk dan keluar Prioritas provinsi: 180 dan 90 sampai 2 November 2026, lalu 144 dan 72 sesudah S-NPP pensiun. Sumber angka: public/prioritas.js.](gambar/peta-karhutla-ambang-prioritas.svg)

Status: Prioritas (h di atas garis masuk), Bertahan (sudah masuk dan belum keluar), Di luar daftar. Kajian awal memakai rata-rata 7 hari dengan masuk 50 dan keluar 25; angka itu sudah digantikan oleh aturan di atas. Dokumen kajian ada di `data/kajian-bnpb/ambang-hotspot/` berupa kajian lengkap (PDF dan PPTX, 10 November 2026), tiga ringkasan (11 November 2026), dan berkas Word `Dokumen Kajian Treshold.docx` sebagai sumber teks kajian; tidak ada versi Markdown. Pensiun S-NPP memotong hitungan lokasi unik sekitar 21 persen menurut catatan kajian, yang tidak tertulis di docstring `titik_unik.py` (tidak terverifikasi di kode). Angka masuk 60 dan keluar 30 adalah garis dasar VIIRS (`public/prioritas.js:5` sampai `9`).
