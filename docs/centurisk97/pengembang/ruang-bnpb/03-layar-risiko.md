# Layar data bencana dan risiko

Halaman ini mencatat layar data bencana, dashboard pimpinan, laporan situasi, dan risiko.

## Data Bencana Indonesia, /bnpb/data-bencana

Untuk BPBD, dengan filter ?prov= dan ?kab=. Memuat Ringkasan, rincian kab, Dampak, Kerusakan, daftar Belum di DIBI, peta koroplet (per jumlah kejadian atau per 100 ribu penduduk), serta tab Tren, Sebaran, dan Tabel DIBI (`public/bnpb/dibi_tren.js`). Hanya kejadian `is_bencana = TRUE`, sama dengan dasbor DIBI. Kolom yang tidak ada di data tampil strip. Ada unduh Excel dan cetak A4. Versi tanam yang sama dipakai di `/instansi/data-bencana`.

## Dashboard pimpinan, /bnpb/pimpinan dan /admin/pimpinan

Dua layar yang berbeda:

- `/bnpb/pimpinan`: dashboard lintas bencana, satu kartu per bencana, dari `GET /api/pb/ringkas`. Tiap kartu menampilkan status berkas ringkas (segar, basi, mati, belum tersedia) apa adanya dan enam angka operasi: renlap terbit hari ini, renlap terbit 30 hari, kepatuhan renlap (persen), tindakan terbuka, SK status darurat berlaku, dan SK yang akan berakhir dalam 7 hari. Ada pilihan provinsi (`?prov=`). Bila rute menjawab 401 atau 403, layar menawarkan tautan Masuk staf.
- `/admin/pimpinan`: satu layar lintas sistem untuk admin dan staf, dirakit di peramban. Sembilan kartu: Situasi per bencana, Prioritas dampak hari ini, Rapor BPBD (skor terendah), Tanda bahaya lintas meja, Relawan, Alun-alun (butuh bantuan), Kebutuhan 30 hari, Pengingat terbuka, dan Respons laporan warga. Kartu yang gagal dimuat menjadi "belum ada data" dan tidak mengganggu kartu lain.

## Laporan Situasi, /sitrep

Halaman publik (di centurisk97.id tetap perlu masuk) yang membaca berkas laporan tiap bencana, tidak menghitung ulang. Pilihan Cakupan memilih provinsi, pilihan Tanggal membuka arsip harian. Endpoint yang belum aktif tampil "belum aktif". Arsip harian disimpan di R2 (`sitrep/YYYY-MM-DD.json.gz`).

## Risiko kecamatan, /risiko

Indeks risiko operasional harian per kecamatan dengan kelas Rendah, Sedang, Tinggi, Sangat tinggi, peta SVG, dan tabel. Label wajib: "indeks komposit, belum diuji balik". Metode di bagian Metode.

## Perkiraan kebutuhan musim, /kebutuhan

Titik panas, kompleks, jam terbang, regu, masker, dan rupiah per provinsi untuk 30, 60, 90 hari, dalam dua skenario (rerata 2019 sampai 2025 dan tahun El Nino). Label: "perkiraan, belum diuji balik". Rentang rupiah rendah dan tinggi ikut ditampilkan.

## Risiko kebakaran permukiman, /risiko-kebakaran

Skor 0 sampai 100 per kelurahan untuk kota yang sudah dihitung (berkas yang ada: `kebakaran_31.json`, DKI Jakarta). Berlabel "hipotesis, belum lulus uji balik".
