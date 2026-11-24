# ALGORITMA: Pemetaan bekas longsor dari satelit

Konvensi: label keyakinan `estimasi-model` untuk keluaran dan `hipotesis` untuk parameter yang belum teruji; data tidak ada ditulis `null` dan tampil "menunggu"; kunci wilayah BPS, batas kecamatan dari `public/geo/kecamatan/<prov>.json` (batas wilayah BIG, `scripts/geo/batas.py`); angka antarsumber tidak dijumlah. Semua angka bertanda **[HIPOTESIS]** dipilih di kalibrasi atau dikunci di LS-01, tidak disetel di kejadian uji.

## 1. Komposit

- Sentinel-2 L2A, piksel 10 m (B03, B04, B08; B11 20 m dicuplik ulang ke 10 m untuk MNDWI), masker awan dari SCL (kelas 3, 8, 9, 10 dibuang).
- Sebelum: median piksel bersih 12 bulan sebelum tanggal kejadian. Sesudah: median piksel bersih dari hari ke-3 sampai ke-90 sesudah kejadian. **[HIPOTESIS]**
- Piksel dengan kurang dari 2 pengamatan bersih di salah satu jendela = tidak terliput. Kecamatan dengan bagian terliput di bawah 50 persen luas lereng bervegetasinya = kecamatan tidak terliput, tanpa angka; titik uji di kecamatan itu tetap dihitung (sebagai luput bila kebenarannya bekas) agar vonis tidak hanya dari daerah terbuka. **[HIPOTESIS]**
- Jendela sesudah 90 hari dapat mencampur tumbuh kembali dan longsor susulan; jendela 3 sampai 45 hari diuji sebagai sensitivitas deskriptif, tidak dipakai memilih.

## 2. Isyarat optik

- NDVI = (B08 - B04) / (B08 + B04); rdNDVI = (NDVI_sesudah - NDVI_sebelum) / NDVI_sebelum.
- Kandidat = rdNDVI <= ambang, NDVI_sebelum >= 0,5, lereng >= 10 derajat dari DEM Copernicus GLO-30 (30 m, dicuplik ulang bilinear ke 10 m; lereng dari DEM sebelum kejadian, jadi perubahan lereng oleh longsor itu sendiri tidak terlihat) **[HIPOTESIS]**.
- Pemilihan ambang (dikunci di kriteria): kisi -0,20 sampai -0,50 langkah 0,05; fungsi tujuan F1 kelas bekas maksimum pada titik KALIBRASI saja; seri dipecah ke ambang lebih ketat (lebih negatif). Titik dan kejadian uji tidak dibuka sebelum sidik kriteria dan ambang terpilih tertulis. Ambang tidak pernah disetel dari citra unggahan media sosial yang memicu paket ini.
- Saringan pengecoh (D5): MNDWI = (B03 - B11) / (B03 + B11); MNDWI sesudah > 0 (air terbuka) dibuang. Saringan ini juga bisa membuang tanah longsor basah; efeknya diukur di kalibrasi (F1 dengan dan tanpa saringan) dan pilihannya dikunci, tidak dipilih di uji; piksel dalam 30 m dari alur sungai OSM dibuang; piksel hilang tutupan Hansen tahun-tahun SEBELUM tahun kejadian, dan peringatan tebangan BERTANGGAL (GFW integrated alerts, tanggal per piksel) dalam 180 hari sebelum kejadian, dipisah ke lapis "tumpang tindih tebangan", tidak dihitung sebagai bekas longsor. Hansen tahun kejadian TIDAK dipakai karena tidak membedakan sebelum dan sesudah tanggal kejadian (longsor sendiri tercatat sebagai hilang tutupan). `public/data/alert_tebang.json` tidak cukup: jendelanya 90 dan 30 hari terakhir, tanpa riwayat. Batas: tebangan di antara peringatan terakhir dan tanggal kejadian tidak tersaring.
- Poligon = gugus 8-tetangga kandidat dengan luas >= 300 m2 (3 piksel); gugus memanjang searah lereng diberi tanda bentuk, tidak dipakai untuk saring sebelum dikunci.

## 3. Isyarat radar (jalur terpisah)

- Sentinel-1 RTC VV dan VH, orbit sama, rasio log median 3 adegan sesudah lawan 3 adegan sebelum; kerapatan piksel berubah melewati ambang per sel 1 km, hanya di lereng >= 10 derajat. **[HIPOTESIS]**
- Diuji dan divonis terpisah dari optik; tidak digabung jadi satu angka sebelum keduanya lulus.

## 4. Uji balik terkunci

- Berkas kriteria: `scripts/longsor/bekas_kriteria.json`, sidik SHA-256 di `scripts/longsor/bekas_sidik.json` dengan jangkar commit. Pipeline menolak jalan bila sidik tidak cocok atau jangkar null.
- Kebenaran (Q1): titik sampel acak berlapis dari peta keluaran yang DIBEKUKAN (ambang final hasil kalibrasi; sidik peta ditulis di vonis) per strata: bekas, tumpang tindih tebangan, bukan-bekas lereng curam (>= 25 derajat), bukan-bekas lereng sedang (10 sampai 25 derajat). Alokasi minimum 100 titik per strata, sisanya sebanding luas; total paling sedikit 600 titik uji dan 300 titik kalibrasi **[HIPOTESIS]**. Strata bukan-bekas berlereng ada untuk mengukur luput (omisi). Rencana daya dihitung di LS-01: n strata bekas cukup agar lebar CI95 presisi <= 0,10 pada presisi 0,7.
- Dua penafsir buta; kesepakatan kappa Cohen >= 0,6 syarat sah **[HIPOTESIS]**. Titik yang tidak sepakat diputuskan penafsir ketiga yang juga buta; tidak ada titik dibuang sepihak. Titik yang tidak dapat ditafsirkan (awan di citra rujukan) dikeluarkan dan jumlahnya dilaporkan per strata.
- Akurasi per luas dihitung dengan bobot strata (Olofsson dkk. 2014), dengan CI 95 persen.
- Pembanding wajib: (a) plasebo musim sama: pasangan komposit dengan jendela kalender identik dengan pasangan uji tetapi satu tahun lebih awal (keduanya sebelum kejadian), jadi fenologi dan panen sebanding; (b) NDVI sesudah saja, ambang dipilih di kalibrasi dengan aturan yang sama; (c) dNDVI absolut (NDVI sesudah - NDVI sebelum), ambang dipilih sama; (d) naif kerentanan, zona PVMBG Tinggi; (e) naif lereng, lereng >= 25 derajat; (f) naif tebangan, hilang tutupan saja. (d) sampai (f) bukan model perubahan, jadi pembanding terkuat hampir pasti (b) atau (c).
- Lulus jalur optik: F1 kelas bekas >= 0,6 dan presisi >= 0,7; mengalahkan pembanding terkuat (b sampai f) dengan selisih F1 >= 0,10 secara global DAN di kedua strata lereng; batas bawah CI90 selisih di atas nol, CI dari bootstrap berpasangan per titik berlapis strata (2.000 ulangan, benih terkunci); luas bekas pada plasebo (a), dihitung dengan cara sama, dibagi luas bekas pada pasangan uji di wilayah yang sama, <= 10 persen. **[HIPOTESIS, belum dikunci; dikunci pemilik atau `validasi-model` di LS-01 (Q4)]** Selain itu gagal.
- Kriteria tidak diubah sesudah hasil dilihat; perubahan = berkas baru, sidik baru, uji ulang di kejadian lain.

## 5. Keluaran

`{"kejadian","kab","tanggal","sidik","vonis","jalur":{"optik":{...},"radar":{...}},"kec":[{"kode","ha_bekas","ha_tebang_tumpang","bagian_terliput"}]}`; bila vonis bukan lulus, `kec` dan `ha_*` = null.
