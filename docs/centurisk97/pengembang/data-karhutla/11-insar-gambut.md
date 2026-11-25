# Lab InSAR gambut (rancangan)

Halaman ini menjelaskan rancangan lab yang membandingkan penurunan permukaan gambut dari InSAR dengan kedalaman bakar literatur, yang belum memiliki kode.

## Pertanyaan yang dijawab

Paket `data/kajian-bnpb/insar-gambut/` menjawab satu pertanyaan: apakah penurunan permukaan tambahan di area terbakar dibanding area tidak terbakar di sekitarnya (dari InSAR) cukup dekat dengan kedalaman bakar literatur 15 sampai 51 cm (`gambut_bara.py:11`) untuk menggantikannya. Jawaban "tidak, dan inilah sebabnya" adalah hasil yang sah.

## Rancangan

Rancangan (D1 sampai D10, `KEPUTUSAN-INSAR.md`):

- satu mesin InSAR: LiCSBAS lewat paket `penurunan-tanah` di luar repo; skrip lab hanya membaca keluaran lewat fungsi `scripts/banjir/subsiden.py` (`baca_par`, `baca_raw`, `vertikal`, `kuantil`), tanpa menghitung interferogram;
- wilayah Palangka Raya, 1 Juli sampai 30 September 2026, ditambah jendela pasca-api 30 sampai 90 hari;
- topeng terbakar dari dNBR (> 0,27 dan NBR pasca < 0,2) dipotong pada gambut; kontrol = piksel gambut tidak terbakar di cincin 2 sampai 20 km;
- `D_insar = ALPHA x (-selisih median vertikal)` dengan `ALPHA` bawaan 1,0 (SEMENTARA);
- konstanta: `MIN_PIKSEL` 50 per kelompok, `MIN_KOHEREN_PCT` 30, piksel dengan |LOS| > 400 mm per tahun dibuang;
- tiga dugaan penjelasan selisih diuji, bukan diduga: fase salah bungkus pada panjang gelombang C-band 5,6 cm, dekorelasi dan bias seleksi, oksidasi pasca-api;
- vonis dikunci sebelum angka dilihat: `selaras`, `meremehkan`, atau `tak_terukur`; hanya `selaras` membuka jalur kalibrasi lewat `pasang_kalibrasi`, dan itu pun berlabel hipotesis;
- area tanpa piksel koheren tampil "tak terukur", tidak 0 cm.

## Status

Status: belum diuji, bahkan belum ada kode. `scripts/data/insar_gambut.py` dan `tests/insar-gambut/` belum ada di repo. Tidak ada angka InSAR di produk.
