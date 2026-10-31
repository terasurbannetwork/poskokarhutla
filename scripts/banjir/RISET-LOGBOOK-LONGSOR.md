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

## Arsip Pusdalops 2016-2022 (`uji_logbook_longsor.py --arsip`, 31 Okt 2026)

**Hasil utama = 2022 (satu-satunya tahun luar-sampel):** AUC h3 x bahaya 0,66 (CI 0,52-0,75), nyaris tak memuat 0,5; Waspada ETS 0,013 (CI -0,001-0,030), FAR 0,95. Vonis mengikuti 2022: lemah. Angka gabungan 2016-2020 di bawah = konsistensi saja (ikut menyetel ambang).

**Model kalah dari persisten:** ETS persisten ~0,6 (2016: 0,594) lawan Waspada 0,01-0,06, karena jendela +-1 hari membuat "kemarin berlabel" prediktor kuat. **Sampel 41 kab** dari cache uji_balik kab sering terdampak (seleksi pada hasil): POD dan laju dasar TIDAK berlaku nasional.

Label: csv arsip jenis `longsor`, positif = `tgl_kejadian` -1..+1; hanya hari tercakup logbook (2016-2020 penuh, 2022 = 271 hari; 2021 tak ada). Hujan ERA5 dari cache `uji_balik`: 41 kabupaten, 104 sel, tanpa unduhan; 2011-2015 tak dinilai. Satuan kabupaten-hari, level kab = maks sel. Keluaran: `public/data/validasi_logbook_longsor_arsip.json`.

Gabungan 2016-2020+2022 (4.194 hari kejadian): AUC h3 x bahaya 0,69 (CI 0,64-0,74); AUC hujan 3 hari saja 0,69. Per tahun AUC: 0,76 / 0,70 / 0,70 / 0,67 / 0,63 / 0,66. Level >= Waspada: POD 0,64, FAR 0,91, ETS 0,041 (0,029-0,056); Siaga POD 0,20 FAR 0,83 ETS 0,073; Awas POD 0,05 FAR 0,74 ETS 0,032. Alarm acak berlaju sama: POD 0,35. Jadi aturan lebih baik dari acak (AUC > 0,5, CI tak memuat 0,5) tapi lebih rendah dari AUC 2026 (0,83) dan perkalian dengan bahaya InaRISK tidak menambah apa pun dibanding hujan saja (0,69 vs 0,69). AUC menurun dari 2016 ke 2022.

Catatan jujur: sama dengan banjir (kab cache bias ke yang sering berkejadian; 2016-2021 ikut dipakai uji_balik; persisten tidak adil karena jendela +-1 hari; hari tanpa laporan = negatif sehingga FAR batas atas).
