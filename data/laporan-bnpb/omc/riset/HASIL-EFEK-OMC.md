# Hasil: efek OMC karhutla Okt 2026 terhadap hujan

Dijalankan 28 Okt 2026 sesuai `PRAREG-EFEK-OMC.md` (sha256 `21733ea91d55ddc718f0db6bf7ebac6d26037a16aea6ff0d257421ce3367c419`, dicocokkan ulang sebelum menulis ini). Skrip: `scripts/omc/efek.py`; angka mentah `hasil_efek.json`; mentah di `data/raw/omc_efek` (ignored).

## Kesimpulan satu paragraf

Efek OMC terhadap hujan harian kabupaten **tidak terdeteksi**: taksiran utama -24% dengan selang 95% dari -121% sampai +73% (permutasi p = 0,54). Selang selebar itu berarti data ini tidak informatif: efek minimum yang bisa dideteksi (daya 80%) sekitar 106% dari hujan kontrafaktual. Efek nyata sebesar 10 sampai 50% tidak akan terlihat, dan juga tidak bisa dikesampingkan. Ini bukan bukti bahwa OMC tidak bekerja.

## Data yang benar-benar dipakai

- Hujan: CHIRPS-2.0 prelim harian 0,05 derajat (satelit + stasiun), hari UTC, rata-rata sel dalam poligon kab/kota. Tersedia 1 sampai 25 Okt; 25 Okt dibuang sesuai PRAREG (tanpa catatan sortie), 26 dan 27 Okt belum terbit. Jadi hari operasi yang dianalisis hanya 16 sampai 24 Okt (9 hari), baseline 15 hari. GSMaP/IMERG tidak tersedia (tanpa kredensial).
- Prakiraan model IFS (Open-Meteo, `ecmwf_ifs025`) di titik pusat kab sebagai kovariat dan anomali.
- Panel: 200 kab/kota Sumatera + Kalimantan (tanpa Kaltim), 24 hari; setelah membuang penyangga tetangga, provinsi-hari terkontaminasi, dan 25 Okt: 4.434 sel, 109 sel perlakuan (kab-hari disemai), 4.325 sel kontrol. Perlakuan per provinsi: Kalteng 46, Kalsel 27, Sumsel 19, Kalbar 15, sisanya Lampung 2.
- Sasaran Sumsel sebagian besar ditulis arah ("timur laut Palembang", "tenggara"), tidak cocok ke kab; hari itu provinsi dibuang dari kontrol. Akibatnya Sumsel (provinsi dengan dry ice terbanyak) nyaris tak teruji. 32 token sasaran tak cocok (Jatim dan Papua Selatan di luar domain).

## Efek total (hujan harian, spesifikasi primer = TWFE + kovariat IFS)

| Spesifikasi | Efek | Selang 90% | Selang 95% | p permutasi | MDE | n perlakuan / kontrol |
|---|---:|---:|---:|---:|---:|---|
| Primer: mm ~ D + IFS, FE kab + hari | -24% (-0,55 mm, SE 1,07) | -104 sampai +56 | -121 sampai +73 | 0,54 | 106% | 109 / 4.325 |
| Tanpa kovariat | -30% | -125 sampai +65 | -144 sampai +84 | 0,48 | 119% | sama |
| Anomali CHIRPS minus IFS | +0,19 mm (SE 0,93) | | | 0,79 | | sama |
| Indikator hujan >= 1 mm | +49% (peluang) | -18 sampai +116 | -32 sampai +130 | 0,13 | 91% | sama |
| ln(1 + mm) | +9% | -22 sampai +52 | -28 sampai +63 | 0,62 | 57% | sama |

Semua selang memuat 0: tidak terdeteksi. Persen anomali tidak dilaporkan (rata-rata perlakuan negatif, penyebutnya tak bermakna); lihat mm. Batas bawah di bawah -100% hanya artefak pendekatan normal pada n klaster kecil (24 hari), bukan efek yang mungkin. Rata-rata hujan sel perlakuan 1,7 mm/hari.

## Per bahan (satu regresi, kab yang kena dua bahan masuk keduanya)

| Bahan | Efek | Selang 90% | Selang 95% | p permutasi | MDE | n |
|---|---:|---:|---:|---:|---:|---:|
| NaCl | -8% | -109 sampai +94 | -130 sampai +115 | 0,87 | 128% | 103 |
| Dry ice | -83% | -142 sampai -25 | -154 sampai -13 | 0,02 | 100% | 35 |

Dry ice memberi koefisien negatif yang melewati batas, arah BERLAWANAN dengan harapan. Jangan dibaca sebagai "dry ice menurunkan hujan": rata-rata hujan di sel dry ice hanya 0,3 mm, operasi dry ice terpusat di Sumsel dan Kalsel pada hari-hari kering yang dipilih operator, dan kovariat IFS tidak menyerap seleksi itu. Ini satu dari dua uji bahan dan 1 dari belasan uji, tanpa koreksi; perlakukan sebagai kesesuaian berlawanan, bukan sebab.

## Per provinsi (eksploratori, Holm pada keluarga empat provinsi)

| Provinsi | Efek | Selang 95% | p permutasi | MDE | n perlakuan |
|---|---:|---:|---:|---:|---:|
| Kalimantan Tengah | -35% | -131 sampai +60 | 0,42 | 122% | 46 |
| Sumatera Selatan | -28% | -128 sampai +72 | 0,62 | 152% | 19 |
| Kalimantan Selatan | -54% | -223 sampai +116 | 0,33 | 154% | 27 |
| Kalimantan Barat | +22% | -45 sampai +90 | 0,56 | 106% | 15 |

Tidak ada yang lolos Holm. Semua selang memuat 0.

## Plasebo

- Pola perlakuan digeser 15 hari ke baseline (1 sampai 9 Okt, tanpa OMC): -59% (selang 95% -178 sampai +60), p = 0,30. Tidak ada efek palsu terdeteksi, tetapi besarnya (-59%) sama dengan skala hasil riil: menegaskan derau, bukan sinyal.
- Plasebo ruang: 3 kab acak per hari di Jambi + Riau (23 kab, nol sortie) pada 16 sampai 24 Okt, 300 ulangan: galat tipe I uji t-klaster 6,7% (nominal 5%). SD taksiran palsu 0,68 mm, setara SE riil 1,07 mm: prosedur wajar kalibrasinya.

## Kekuatan statistik

MDE (daya 80%, 5% dua sisi) = 2,8 x SD permutasi: 106% untuk spesifikasi primer, 100 sampai 128% per bahan, 106 sampai 154% per provinsi. Desain ini hanya bisa mendeteksi OMC yang melipatduakan hujan harian kab. Penyebab: hujan harian sangat berderau antar kab, hanya 9 hari operasi, perlakuan hanya 109 sel.

## Eksploratori kecil

- PM2.5 BMKG (ln, 16 sampai 23 Okt saja, 17 stasiun dalam poligon kab, 22 stasiun-hari perlakuan): +9% (95% -54 sampai +158), p = 0,76, MDE 109%. Tidak terdeteksi.
- Jarak pandang METAR siang (9 bandara, hanya 4 bandara-hari perlakuan): +2.643 m (95% +88 sampai +5.199), p permutasi 0,02. Empat observasi tidak cukup untuk disimpulkan apa pun; jarak pandang membaik juga oleh hujan alami dan angin. Tidak dilaporkan sebagai efek OMC.

## Jendela jam (deskriptif, PRAREG 8)

METAR IEM Banjarmasin/Banjarbaru (WAOO) 27 Okt, sortie 11.14 sampai 14.37 WITA plus 3 jam: 0 dari 7 jam melapor hujan; Palembang (WIPP) 20 Okt, sortie 11.29 sampai 13.04 WIB: 0 dari 6 jam. Baseline 1 sampai 15 Okt di kedua bandara juga nol hari berhujan pada jam yang sama. Tidak informatif. Palangka Raya, Pangkalan Bun, Jambi tidak ada di IEM.

## Keterbatasan

1. Seleksi: sortie dilakukan di hari dan tempat yang dinilai berpotensi awan; ini menaikkan hujan di kelompok sasaran tanpa efek semai (arah bias positif), sementara hari kering untuk dry ice menurunkannya. Kovariat IFS hanya mengendalikan sebagian.
2. Sasaran tidak presisi: sortie lintas kab, penyemaian di hulu lalu hujan jatuh di hilir (NaCl, awan bergerak); label kab sasaran bukan kab tempat hujan jatuh. Penyangga tetangga mengurangi tetapi tidak menghapus spillover.
3. Hujan di CHIRPS: resolusi 5 km, hari UTC (07 WIB sampai 07 WIB), kualitas satelit IR untuk hujan konvektif kecil terbatas; versi prelim.
4. 25 Okt tanpa catatan dibuang; 26 dan 27 Okt (hari operasi terbanyak, 32 sortie) belum ada CHIRPS, jadi tidak ikut. Sortie sebelum 16 Okt tidak tercatat di rekap (dianggap baseline); Kaltim dikeluarkan (30 sortie tanpa periode).
5. Asap: PM2.5 BMKG gagal sejak 23 Okt; asap menekan konveksi dan memengaruhi jarak pandang sehingga dua ukuran ini confounded.
6. Uji permutasi mengacak vektor D antar hari tanpa memperbarui penyangga; sel yang tak ada di hari asal bernilai D=0.
7. Banyak spesifikasi; semuanya dilaporkan; hanya dry ice yang melewati batas dan ia tidak lolos akal sehat (butir seleksi di atas).

## Penyimpangan dari PRAREG (dibuat sebelum melihat hasil)

- Pencocokan nama sasaran: keterangan dalam kurung dibuang ("Palangka Raya (dry ice)") dan alias OKI, OKU, OKU Timur diterima. PRAREG menulis "harus sama persis"; tanpa perubahan ini 64 token (OKI, Kotawaringin Barat (NaCl), dst.) gagal cocok karena penulisan, bukan karena kabur.
- Plasebo ruang: 3 kab acak per hari (PRAREG tidak menetapkan jumlah).
- Kolom D dengan kurang dari 3 sel perlakuan tidak dihitung (Lampung, "lain").
- Jarak pandang dilaporkan dalam meter, bukan persen.

## Verifikasi klaim hujan (tambahan)

Lihat `VERIFIKASI-KLAIM-HUJAN.md` dan `.csv`.
