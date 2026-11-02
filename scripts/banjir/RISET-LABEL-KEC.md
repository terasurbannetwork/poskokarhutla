# Label kejadian banjir per kecamatan (Groundsource)

Skrip: `scripts/banjir/label_kec.py` (`ambil`, `susun`, `uji`). Perantara dan `label_kec.json` di `data/raw/banjir/label_kec/` (tidak dilacak git).
Ringkasan publik: `public/banjir/data/label_kec_ringkas.json` (2 KB). Tujuan: bahan uji/kalibrasi model bahaya tingkat kecamatan
(`RISET-INARISK.md` bagian 4 langkah 2).

## Sumber dan metode
- Google Groundsource, Zenodo 10.5281/zenodo.18647053 (berkas di rekaman 18647054), CC BY 4.0. 2.646.302 poligon dunia; 375.634 berpusat di kotak Indonesia.
  Klaim penulis: presisi ~82%. Itu klaim mereka, belum kami ukur.
- Titik wakil = titik berat (berbobot luas) cincin luar. Dicari kecamatannya dengan titik-dalam-poligon (`wilayah._di_dalam`, indeks sel 0,5 derajat)
  pada `public/geo/kecamatan/<prov>.json`. Kunci `prov|kab|kec`, sama dengan `bahaya_kelas.json`.
- Poligon yang simpul cincinnya (disampel, <= 64 simpul) menyentuh > 1 kecamatan diberi tanda `lintas` dan jumlah kecamatan tersentuh dicatat; bentang kotak
  > 0,2 derajat diberi `luas`. Dihitung HANYA di kecamatan titik beratnya, tidak dibagi.
- Satuan hitung: kejadian unik (kecamatan, tanggal mulai), per tahun 2016-2025. `n_th_tunggal` = hanya poligon kecil, satu kecamatan, titik berat di dalam: label terbersih.
- Ekstraksi butuh Python ber-pyarrow; unduhan dari Zenodo lambat per sambungan (~100 KB/s), rentang paralel jauh lebih cepat.

## Hasil (31 Okt 2026, setelah perbaikan prasaring WKB)
Versi pertama salah baca offset simpul Polygon (byte 17, seharusnya 13) sehingga hanya MultiPolygon yang lolos (25.341 poligon) dan kesimpulan
"kebanyakan poligon lintas kecamatan" adalah bias seleksi. Angka di bawah sudah diperbaiki.

| angka | lama (salah) | baru |
| --- | --- | --- |
| poligon di kotak Indonesia (memuat sebagian Malaysia/Filipina; saring akhir titik-dalam-kecamatan) | 25.341 | 375.634 |
| dipetakan ke kecamatan, 2016-2025 | 21.140 | 303.329 |
| kecamatan berlabel dari 7.270 | 1.887 | 6.539 (90%) |
| kecamatan dengan label tunggal (bersih) | 879 | 5.295 |
| poligon `lintas` / `luas` (2016-2025) | 16.523 / 8.085 | 195.388 / 33.615 |
| tanpa kecamatan / titik berat di luar (2016-2025) | 2.011 / 2.296 | 36.850 / 38.115 |
| Spearman lawan DIBI | 0,40 (n=439) | 0,71 (n=516 nol diisi; 0,70 n=512 keduanya ada) |

Mutu kecamatan: ragu 5.606, campur 754, bersih 179 (`bersih` = SEMUA poligonnya tunggal; untuk uji pakai `n_th_tunggal`). Median bentang kotak 0,03 derajat (~3 km), persentil 90 = 0,22.
Cakupan naik dari 13.224 poligon dan 2.606 kecamatan (2016) ke 64.706 dan 5.254 (2025): liputan berita, bukan tren banjir.
Provinsi terbanyak: Jatim 659, Jabar 626, Jateng 573, Sumut 427 kecamatan; Kalteng 133, Papua Selatan 31.

## Cek silang dengan DIBI (kabupaten, 2016-2025)
Kejadian unik kecamatan-hari Groundsource dijumlah ke kabupaten, lawan DIBI banjir+bandang (`kejadian.json` `kab`): Spearman **0,71** (n=516 nol diisi).
Total GS 168.381 kecamatan-hari lawan DIBI 13.558 kab-hari: ukuran berbeda, jangan dibandingkan mutlak. 4 kunci GS tak cocok dengan DIBI
(`73|None`, `75|Pahuwato`, `92|Kaimana`, `95|Yalimo`). Korelasi peringkat kuat tidak membuktikan label mengukur bahaya: keduanya bisa sama-sama mengikuti
kepadatan penduduk dan pelaporan.

## Keterbatasan
- Bias berita: kota, pulau Jawa, pelapor aktif. Kalteng dan Papua Selatan jauh lebih sedikit berlabel: bukan berarti aman.
- Hanya label positif. Kecamatan tanpa label bukan negatif; negatif butuh kontrol kepadatan media (mis. jumlah artikel apa pun per kecamatan) atau sumber lain (PetaBencana, GFM).
- Tanggal = tanggal berita; tanpa kedalaman atau dampak. Tipis sebelum 2016; berhenti 29 Jan 2026 (2026 tidak dihitung).
- Kecamatan di peta disederhanakan; simpul poligon disampel 64, jadi `lintas` bisa melebih/kurang-hitung di perbatasan.
- Kecamatan pemekaran baru: peta dan nama berita tak selalu sama; yang tak menyentuh kecamatan mana pun dibuang.

## Langkah berikut
Ulangi uji InaRISK lawan kejadian per kecamatan (`RISET-INARISK.md` bagian 2) memakai `n_th_tunggal`, blok provinsi dan periode terpisah, dengan kontrol kepadatan media.
