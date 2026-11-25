# Cermin InaRISK

Halaman ini menjelaskan metode cermin InaRISK.

## Cara kerja cermin

Sumber: API `inarisk.bnpb.go.id/apiv4`, topojson kabupaten, ArcGIS `gis.bnpb.go.id`, dan SPAB di `inarisk2.bnpb.go.id/spab/api/get-data/{prov}` (kode Kemendagri). Tarikan mingguan di `inarisk.yml` (Selasa 04.45 UTC); `bangun` membandingkan dengan cermin lama, hanya menulis bila berubah, dan mengisi `perubahan.json`.

Kelas risiko, salinan fungsi InaRISK (`public/bnpb/inarisk_hitung.js:7`):

```
total, tahun 2025 ke atas : < 14,67 Rendah; <= 176 Sedang; selebihnya Tinggi
total, tahun sebelum 2025 : < 13 Rendah; > 144 Tinggi; selebihnya Sedang
per bahaya                : < rendah[b] Rendah; > tinggi[b] Tinggi; selebihnya Sedang
rendah = longsor 6,67; gunung api 4; lainnya 5,33   tinggi = longsor 15; gunung api 9; lainnya 12
```

Uji menjaga bahwa data 2025 memberi 169 Tinggi dan 345 Sedang. Peringkat: kab berskor lebih dari 0, urut menurun, seri dipecah kode wilayah; peringkat sebelumnya adalah tahun dikurangi satu. Indeks nasional adalah rerata skor lebih dari 0. Tren dipisah per dasar: HV 2015 (sembilan bahaya, 2015 sampai 2024) dan HV 2021 (sebelas bahaya, 2025); selisih lintas dasar tidak dihitung naik atau turun. Tahun tanpa skor tampil "belum ada skor". Nilai 0 atau null berarti tidak ada nilai.

IKD: tingkat Rendah di bawah 0,40, Sedang sampai 0,80, Tinggi di atas 0,80. Rumus IKD dari tujuh prioritas ditemukan dengan regresi atas 532 analisa (galat terbesar 0,0003) dan bukan rumus resmi, diuji ulang tiap tarik:

```
IKD = 0,06 P1 + 0,06 P2 + 0,075 P3 + 0,105 P4 + 0,21 P5 + 0,35 P6 + 0,14 P7
```

Simulasi kapasitas (HIPOTESIS, berlabel perkiraan): skor tiap bahaya dibagi kelas C; IRBI simulasi = IRBI x C lama / C baru. Rencana termurah menaikkan prioritas berbobot terbesar yang masih punya ruang sampai melewati ambang kelas berikutnya.

Risiko besok: aturan prakiraan Centurisk97 (`waspada` dengan `tenggang` 1 di `/prediksi/data/prediksi.json`) dipetakan ke kolom IRBI (banjir ke banjir, longsor ke longsor, karhutla dan asap ke karhutla, melaut ke abrasi, angin ke cuaca ekstrem), diurut menurut kelas IRBI total lalu skor bahaya padanan. Ini prakiraan Centurisk97, bukan BMKG.

Uji IRBI lawan DIBI (`inarisk.py:275`, hasil di `public/data/inarisk/uji_dibi.json`): korelasi peringkat Spearman antar kab, IRBI tahun Y lawan DIBI tahun Y+1 untuk dasar 2015 dan tahun sama untuk dasar 2021, dibandingkan dengan persistensi (peringkat DIBI tahun Y), plus tangkapan 20 persen teratas. Hasil 24 November 2026 menurut dokumen keputusan: IRBI kalah dari persistensi di 10 dari 10 tahun dasar 2015 (rerata korelasi kejadian 0,10, korban 0,03), dan korelasi kejadian dasar 2021 negatif 0,30. Karena itu IRBI tampil sebagai indeks InaRISK apa adanya dan tidak dipakai meramalkan kejadian tahun depan; tabelnya berlabel "uji kami".

Yang sengaja tidak ditiru: penduduk total di layar IRBI InaRISK memakai rumus pengisi `75000 + 3 digit akhir kode wilayah x 8450`, persen laki-laki dan perempuan konstan untuk 514 kab, dan komponen V dan C nasional memakai pengisi (V sama dengan skor H, C sama dengan skor tambah 18,7). Kita memakai penduduk dari API `data-jiwa-terpapar`.

Dampak radius (`POST /api/inarisk/dampak`): lingkaran atau poligon dikirim ke kueri spasial InaRISK, hasilnya penduduk, sekolah, rumah sakit, puskesmas. Radius paling besar 50 km (`radius_meter` 1 sampai 50000), poligon paling banyak 2000 titik, badan paling besar 64 KB. Dicache Worker. Tanpa titik, kartu dampak tidak tampil dan tidak pernah nol. Titik kejadian logbook dari nama desa hanya bila tepat satu desa dan satu kab dan nama cocok, titik pusat poligon desa, berlabel perkiraan (cakupan 34,0 persen kejadian logbook 2011 sampai 2026; Dalops 24 November 2026 sebanyak 6 dari 187).

Proksi: daftar izin `LAPISAN` untuk ubin (bahaya 12 jenis, risiko 11 jenis tanpa longsor, kerentanan 11 jenis tanpa banjir, kapasitas, batas administrasi); tiga layanan berkunci token dilewati. Nama petugas dibuang dari titik Lapor Kegiatan (properti yang lolos: Kegiatan, Lokasi, Deskripsi, Tgl, Foto, Pcode, Organisasi). Foto hanya dari host inarisk dan inarisk2 dan dinaikkan ke https. Cache `caches.default` satu jam untuk data dan tujuh hari untuk ubin; batas laju per jaringan (60 per menit, ubin 600 per menit) dihitung hanya saat cache luput; tenggat 20 detik (ubin 60 detik, karena server ArcGIS sering membalas 503).
