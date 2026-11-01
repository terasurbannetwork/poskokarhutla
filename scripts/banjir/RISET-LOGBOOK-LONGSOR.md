# Uji aturan longsor terhadap logbook BNPB 2026

Skrip: `scripts/banjir/uji_logbook_longsor.py` (`uji` = swauji luring, `ambil` = hujan ERA5, tanpa argumen = hitung).
Keluaran: `public/data/validasi_logbook_longsor.json` (`dibuat` kunci pertama, `riwayat` = satu cuplikan per tanggal jalan, maks 400).

## Apa yang diuji

- Aturan: `level_longsor` di `scripts/banjir/status.py` (bahaya InaRISK x hujan 3 hari x tanah jenuh; k 0,6, geser -1). Di repo
  tidak ada nowcast longsor terpisah dan tidak ada rumus LHASA/P95, jadi yang dinilai aturan hidup itu. Tidak diubah.
- Label: logbook longsor + banjir_longsor (positif = hari mulai -1..+1), dan DIBI "Tanah Longsor" 2026 (hari persis).
- Hujan: ERA5 Open-Meteo per sel 0,25 derajat, prakiraan "sempurna" (hujan nyata), 1 Jan - 21 Okt 2026.
- Satuan: kecamatan-hari (nama kecamatan logbook dicocokkan ke poligon: persis, lalu mirip >= 0,85) dan kabupaten-hari (kab = kec tertinggi).
- CI 95%: bootstrap blok per kabupaten, 500 ulangan.

## Hasil (46 kab, 114 sel; >= Waspada; angka dan CI lengkap tiga level di JSON, tabel ini dibulatkan dari jalan terakhir)

| Satuan / label | POD | FAR | CSI | ETS (CI95) |
| --- | --- | --- | --- | --- |
| kecamatan-hari / logbook | 0,52 | 0,995 | 0,005 | 0,004 (lihat JSON) |
| kabupaten-hari / logbook | 0,76 | 0,981 | 0,019 | 0,014 (lihat JSON) |
| kabupaten-hari / DIBI | 0,71 | 0,986 | 0,014 | 0,010 (lihat JSON) |

Siaga: POD 0,07 (kec), 0,07 (kab logbook), 0,20 (DIBI); Awas: POD 0-0,01. Awas hampir tak pernah menyala.

AUC skor kontinu (CI95): kab-hari H3 x bahaya 0,84 (0,80-0,89), H3 saja 0,79, bahaya saja 0,67; kec-hari H3 x bahaya 0,77 (0,66-0,88),
H3 saja 0,79 (0,74-0,85), bahaya saja 0,68. Urutan risiko benar (jauh di atas 0,5), tetapi di tingkat kecamatan bahaya statis tidak menambah apa pun di atas hujan.

Varian (hanya dilaporkan): k 0,4 / 0,8 / 1,0 dan tanpa syarat jenuh. Semua selisih ETS terhadap aturan berlaku
berselang kepercayaan yang melewati 0 (kecuali "tanpa jenuh" di kec-hari, +0,004, CI 0,001-0,007, terlalu kecil bermakna).
Tidak ada bukti ambang lain lebih baik; k lebih kecil menaikkan POD dan FAR bersama (k 0,4: POD kab 0,87).

## Dampak vs kelas bahaya

109 kejadian ber-kecamatan/kab bertaut: 94 jatuh di kelas "tinggi", 10 rendah, 5 sedang. Spearman bahaya vs meninggal 0,03 (CI -0,20..0,20),
vs rumah 0,02 (-0,17..0,20). Tidak ada hubungan terdeteksi; kelas bahaya InaRISK hampir semuanya "tinggi" di tempat longsor dilapor,
sehingga tidak memilah keparahan. Satu kejadian logbook (Bandung Barat, 108 meninggal) tampak angka gabungan hari-hari lain; median dipakai agar tahan pencilan.

## Vonis: GAGAL sebagai peringatan presisi, LAYAK sebagai penyaring

FAR 98-99% pada semua satuan: hampir semua hari berstatus Waspada tidak punya laporan. Sebagian besar alasan ini ada di label
(logbook hanya memuat yang dilapor BPBD; hari tanpa laporan dihitung negatif, jadi FAR batas atas), tetapi ETS 0,004-0,014 tetap
sangat rendah. POD kab 0,71-0,76 dan AUC 0,84 menunjukkan aturan menangkap sebagian besar kejadian dan mengurutkan hari dengan wajar.
Tingkat Siaga/Awas tidak menangkap kejadian (POD <= 0,2). Tidak ada yang dilolosikan sebagai "LULUS" untuk dasar eskalasi.

## Catatan cakupan (jujur)

- SUBSET: hanya kabupaten yang selnya sudah terunduh (lihat `sampel` di JSON: kab dipakai, kab berlabel tak masuk sampel). Kuota jam Open-Meteo
  habis dibagi dengan unduhan modul banjir; kontrol acak (seed 7) memengaruhi FAR/laju dasar.
- Logbook berakhir 29 Okt, hujan ERA5 sampai 22 Okt: kejadian sesudahnya tidak terhitung.
- 46 kejadian punya nama kecamatan yang gagal dicocokkan; hari berlabel tanpa kecamatan dikeluarkan dari negatif kec-hari.
- Unit geo tanpa kode kab (nama kab/kec kosong di poligon, Fak Fak) tak ikut; daftarnya di JSON `unit_geo_tanpa_kode_kab`.
- Logbook vs DIBI hanya beririsan sebagian pada hari persis (7 dari 25/55 hari kab), jadi dua label ini memang berbeda populasi.
- Satu tahun, 2026, belum satu musim penuh; CI melebar.

## Data yang akan menolong

Hujan per jam dari gauge/radar (bukan ERA5) untuk waktu pemicu; peta kerentanan lereng/tanah per kecamatan yang membedakan di dalam kelas "tinggi";
logbook beberapa tahun supaya tahun latih dan uji terpisah; catatan hari tanpa kejadian (negatif sungguhan) dari BPBD; koordinat kejadian, bukan nama kecamatan.

## Arsip Pusdalops 2016-2025 (`uji_logbook_longsor.py --arsip`, diperluas 1 Nov 2026)

**Headline = gabungan luar-sampel 2022-2025** (41 kab, level Waspada, 2.001 hari kejadian). Aturan BERLAKU dipilih di 2016-2021, tetapi diterima lewat uji 2022-2025 pada label DIBI (`uji_balik.py` `LATIH, UJI`); label logbook belum dipakai menyetel apa pun. Positif = `tgl_kejadian` -1..+1. AUC memakai skor h3 x bahaya longsor. Pembanding: persisten, klimatologi (bulan dengan laju label 2016-2021 di atas rata-rata kab), acak.

| Tahun | AUC h3 x bahaya (CI95) | POD | FAR | ETS model | ETS persisten | ETS klimatologi |
| --- | --- | --- | --- | --- | --- | --- |
| 2022 | 0,661 (0,519-0,748) | 0,54 | 0,952 | 0,013 | 0,631 | 0,021 |
| 2023 | 0,681 (0,495-0,756) | 0,42 | 0,962 | 0,014 | 0,589 | 0,024 |
| 2024 | 0,643 (0,484-0,758) | 0,61 | 0,931 | 0,030 | 0,583 | 0,038 |
| 2025 | 0,646 (0,524-0,744) | 0,59 | 0,926 | 0,026 | 0,594 | 0,035 |
| **Gabungan 2022-2025** | **0,651 (0,587-0,705)** | **0,56** | **0,940** | **0,023** | **0,598** | **0,030** |

Pembanding gabungan: klimatologi POD 0,60 / FAR 0,933; persisten POD 0,76 / FAR 0,245; acak POD 0,34. Skrip tidak memuat vonis lulus/tidak untuk longsor.

**AUC skor klimatologi kontinu** (laju label bulan x kab 2016-2021, tanpa hujan): **0,807** (CI 0,762-0,839) pada luar-sampel 2022-2025, per tahun 0,778 / 0,782 / 0,833 / 0,810. Selisih AUC berpasangan h3 x bahaya dikurangi klimatologi **-0,155** (CI -0,212 s.d. -0,083): model hujan LEBIH BURUK daripada musiman kab sederhana. Hujan 3 hari saja 0,661 lebih tinggi daripada h3 x bahaya 0,651 (selisih -0,010, CI -0,067 s.d. 0,028: setara), jadi pengali bahaya longsor tidak menambah daya pada label logbook; bahaya saja 0,573. Catatan: skor klimatologi sebagian menangkap perbedaan laju antar-kabupaten (AUC dipool seluruh kab-hari), yang juga tidak ditangkap rapi oleh h3.

Selisih ETS Waspada dengan CI berpasangan, gabungan 2022-2025: model - persisten -0,575 (-0,602 s.d. -0,543), kalah jelas (persisten tidak adil untuk jendela +-1 hari); model - klimatologi -0,008 (-0,018 s.d. 0,002), setara; model - klimatologi berlaju alarm sama +0,011 (0,000 s.d. 0,021), unggul sangat tipis. Per tahun CI selisih vs klimatologi memuat 0 di keempat tahun.

**Bacaan jujur:** AUC 0,65 sebelumnya tampak "lebih baik dari acak", tetapi musiman kab saja mencapai 0,81, jadi hujan 3 hari + bahaya belum menambah informasi di atas pola musim dan lokasi. Dengan hujan sempurna pun belum layak sebagai prakiraan harian. Dalam-sampel 2016-2021 AUC 0,58-0,76 (menurun dari 2016 ke 2021).

Label: csv arsip jenis `longsor`; hanya hari tercakup logbook. Hujan ERA5 cache `uji_balik`: 41 kab, 104 sel, tanpa unduhan; 2011-2015 tak dinilai. Keluaran: `public/data/validasi_logbook_longsor_arsip.json`.

Enam catatan bias: (1) tahun parsial hanya menilai hari tercatat (2021: 343, 2022: 272, 2023: 327 hari; piket bolong), hari tanpa laporan di luar itu bukan negatif; (2) 41 kab sampel dari cache `uji_balik` dipilih dari jumlah hari kejadian 2016-2025 TERMASUK tahun uji 2022-2025, jadi seleksi memakai hasil: skor OPTIMISTIS, POD dan laju dasar TIDAK berlaku nasional, FAR bukan batas atas yang pasti (memilih ulang kab dari 2016-2021 butuh unduhan ERA5 baru; longsor memakai semua 41 kab); (3) persisten tidak adil untuk label berdurasi/berjendela; (4) hujan ERA5 = prakiraan sempurna, prakiraan sungguhan hanya lebih buruk; (5) aturan BERLAKU dipilih di 2016-2021 tetapi diterima lewat uji 2022-2025 pada label DIBI (`uji_balik.py` `LATIH, UJI`), jadi 2022-2025 bukan sepenuhnya murni; label logbook belum dipakai menyetel apa pun; (6) klimatologi belajar hanya dari hari tercatat 2016-2021.
