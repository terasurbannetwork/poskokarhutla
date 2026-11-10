# ALUR: Silang Sumber

Peran: staf pusdalops (membaca semua), analis (membaca semua dan mengunduh CSV), pemilik (mengubah ambang lewat berkas konfigurasi di repo, bukan lewat layar).

## F1 Rapor Sumber

1. Pipeline harian membaca arsip prakiraan (BMKG 3 hari, sepekan, maritim, Open-Meteo, status Centurisk97) dan kejadian (DIBI, Logbook, SYNOP).
2. Tiap prakiraan yang sudah beku dipasangkan dengan kejadian pada tanggal target dan tenggangnya.
3. Tabel a, b, c, d dihitung per sumber, bahaya, daerah, tenggang. Hasil ditambahkan ke arsip skor.
4. Staf membuka `/bnpb/rapor-sumber`, memilih bahaya, melihat tabel dan catatan telat lapor. Status: "data belum cukup", "n kejadian kurang dari 30, tanpa persen", atau angka.

## F2 Tsunami per zona

1. Buletin BMKG baru masuk ke `inatews_tsunami.json`.
2. Zona dipetakan ke kabupaten/kota lewat kamus; yang tak cocok tetap tampil dengan nama aslinya.
3. Staf memilih kejadian, melihat tingkat resmi tiap zona, kabupaten terkait, eksposur, pengukuran muka air, dan urutan buletin.
4. Mode latihan memutar ulang lima kejadian arsip buletin demi buletin.

## F3 Alarm beda sumber

1. Pipeline harian membandingkan resmi dan model per kabupaten atau perairan per hari.
2. Beda yang melewati ambang diberi tanda "perlu dicek" lengkap dengan kedua nilai dan lembaganya.
3. Staf melihat daftar di `/bnpb/silang`; keputusan mana yang dipercaya ada di staf.

## F4 Jendela kirim bantuan

Mengikuti LG-14 di dokumen logpal.

## F5 Deteksi gempa beruntun

1. Pipeline membaca katalog, menentukan Mc, menghitung laju di sekitar sasaran, membandingkan dengan baseline.
2. Statistik kejutan di atas ambang menjadi "perlu dicek", berlabel "Deteksi Centurisk97", dengan keterangan bahwa ini bukan prediksi gempa.
3. Silang ke kegempaan MAGMA di `public/gunungapi` ditampilkan berdampingan.

## F6 Kalender ancaman daerah

1. Pipeline bulanan membaca laju kejadian dan narasi iklim BMKG yang sudah dipetakan ke kabupaten.
2. Keluaran per kabupaten dan bulan dibaca oleh profil daerah dan laporan.
