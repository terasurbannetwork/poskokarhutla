# PRD: Cermin InaRISK (`/bnpb/inarisk`)

## Pengguna

Staf BNPB dan BPBD yang perlu melihat indeks risiko, kapasitas daerah, dan peta bahaya tanpa pindah
situs, dengan angka yang sama dengan InaRISK.

## Fitur

| ID | Tab | Isi |
| --- | --- | --- |
| F-1 | IRBI | filter tahun (2015-2025), jenis bahaya, provinsi, kab/kota; lima kartu (indeks nasional, risiko tertinggi, risiko terendah, rerata kab, jumlah kab Tinggi); peta koroplet 514 kab; tabel peringkat (skor, kelas, skor sebelumnya, perubahan); kartu metodologi singkat |
| F-2 | IRBI detail | dialog per kab: penduduk, skor dan kelas, peringkat, tren 5 tahun dua dasar, perubahan peringkat, jiwa terpapar 11 bahaya (batang 100%), jarum IKD, radar P1-P7, rekomendasi kebijakan per prioritas |
| F-3 | IRBI detail | Unduh ringkasan PDF lewat cetak peramban |
| F-4 | IKD | filter tahun (2019-2026), provinsi, kab; tabel indeks dan tingkat kapasitas; dialog analisa (jarum, radar, batang P1-P7, rekomendasi berindikator) |
| F-5 | Web GIS | peta MapLibre; peta dasar (citra, jalan); batas administrasi; lapisan bahaya 12 jenis, risiko, kerentanan, kapasitas dengan opasitas; matikan semua |
| F-6 | Web GIS | gambar titik, lingkaran, poligon, lalu hitung dampak (penduduk dan 12 jenis sarana) |
| F-7 | Web GIS | lapisan Lapor Kegiatan dan Sosialisasi per rentang tanggal; unduh GeoJSON tanpa nama petugas |
| F-8 | Unduhan | cari, filter provinsi, kab, kategori, format, urutan; tabel dan kisi; tautan unduh ke server BNPB |
| F-9 | Tautan | daftar tautan luar per kategori |
| F-10 | Metodologi | kerangka 6 langkah, rumus risiko, komponen H V C, sumber data |
| F-11 | Tentang, Disclaimer | profil InaRISK, perjalanan 2012-sekarang, enam butir disclaimer |

## Larangan

- Tidak menampilkan angka pengisi InaRISK (penduduk karangan, persen jenis kelamin, komponen V dan C nasional).
- Tidak menghitung ulang IRBI sendiri: angka dari InaRISK apa adanya, kelas dengan ambang D4.
- Tidak menyimpan nama petugas Lapor Kegiatan di repo atau mengirimnya ke peramban.
- Tidak menulis "aman".

## Ukuran berhasil

Angka uji RISET §6 tampil sama persis; layar 1440 dan 390 tanpa galat konsol; klik tab dan baris
tabel di bawah 200 ms INP.
