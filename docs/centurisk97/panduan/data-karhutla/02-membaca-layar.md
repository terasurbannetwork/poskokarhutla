# Peta, tanggal, kelompok api, insiden

Semua halaman di bawah dapat dibuka tanpa masuk (login), kecuali disebut lain.

## Peta utama dan angka titik panas

Alamat: `centurisk97.id`. Tidak perlu masuk.

1. Buka halaman utama. Peta menampilkan titik panas 7 hari terakhir, diwarnai menurut tingkat keyakinan satelit.
2. Angka titik panas di kartu dan ringkasan adalah jumlah lokasi berbeda dalam satu hari kalender WIB (pukul 00.00 sampai 23.59). Satu lokasi adalah satu kotak sekitar 375 meter. Bila beberapa satelit atau beberapa lintasan melihat kotak yang sama pada hari yang sama, kotak itu dihitung satu kali.
3. Titik berkeyakinan rendah tetap digambar dan ikut dihitung sejak 28 Oktober 2026. Perhitungan luas terbakar dan pembentukan kelompok api hanya memakai titik berkeyakinan sedang dan tinggi.
4. Klik titik atau kelompok api untuk membuka jendela keterangannya.

Tips: angka di Centurisk97 sengaja tidak sama dengan angka SiPongi atau GIS BNPB, karena definisinya berbeda (lihat [Dari titik panas ke kelompok api](/docs/data-karhutla/titik-kelompok), bagian 2).

## Pilih tanggal

Alamat: peta utama, tombol "Pilih tanggal". Tidak perlu masuk.

1. Buka pemilih tanggal di peta utama.
2. Setiap hari menampilkan jumlah titik panas nasional hari itu. Contoh: klik 25 Oktober, layar menampilkan jumlah titik panas seluruh Indonesia pada tanggal itu.
3. Hari yang bisa dibuka adalah 7 hari terakhir dan hari yang memuat sedikitnya 1.000 lokasi titik panas. Bagian "Terbanyak 2026" menampilkan hari dengan titik terbanyak.
4. Hari yang tidak punya arsip tampil nonaktif dengan keterangan "tidak tersedia". Itu bukan berarti nol titik.

## Kelompok api dan firespot

Alamat: klik kelompok di peta, atau tautan berbentuk `centurisk97.id/k/K0001`. Tidak perlu masuk.

1. Jendela keterangan memuat jumlah titik, jumlah titik 24 jam terakhir, lama bertahan, status tindakan, kelas cuaca kebakaran, dan penilaian firespot ("ya" atau "mungkin").
2. Nomor seperti K0001 diberikan ulang setiap putaran data, jadi bukan nama tetap sebuah api. Untuk api yang dilacak dari hari ke hari, lihat Insiden api di bawah.
3. Status tindakan ada empat tingkat: Pencegahan rutin, Patroli terpadu, Siaga pemadaman awal, dan Prioritas pemadaman. "Tanggap darurat" adalah status hukum yang ditetapkan bupati atau gubernur dan tidak pernah diberikan oleh sistem.
4. Firespot "mungkin" menahan status paling tinggi di "Patroli terpadu" sampai ada pengecekan lapangan.

Salah paham yang sering terjadi: kelompok yang tidak terdeteksi 24 jam belum tentu padam. Aturan waktunya ada di [Sekilas dan aturan waktu](/docs/data-karhutla/sekilas).

## Insiden api

Alamat: klik insiden di peta. Tidak perlu masuk.

1. Insiden adalah api yang dilacak dari hari ke hari dengan nomor tetap, berbentuk kode provinsi, tanggal mulai, dan nomor urut.
2. Jendela keterangan memuat garis depan api terbaru, titik masuk terdekat (garis lurus, bukan rute jalan), lingkaran ketidakpastian, perkiraan luas, dan kecenderungan.
3. Status "tak terdeteksi" berarti tidak ada deteksi baru. Itu bukan pernyataan padam. Penutupan insiden hanya dari laporan resmi.
4. Perkembangan per hari (garis depan, kecepatan, lompatan, perkiraan titik awal) berlabel HIPOTESIS. Perkiraan titik awal hanya berupa lingkaran perkiraan lokasi, tanpa pernyataan tentang sebab atau pihak mana pun.
