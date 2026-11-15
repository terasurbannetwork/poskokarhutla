# ALUR: Keterpaduan

## A1. Baris modul ke nomor kejadian

1. Modul menulis baris seperti biasa (misal `tugas_api` dibuat otomatis dari kompleks api level 3).
2. `scripts/siklus/pasang.py masuk` (jadwal `siklus.yml`, jendela 3 hari yang sudah ada) memanggil `GET /api/siklus/ingest/modul?dari=&sampai=&lanjut=` dan menerima baris modul yang dibuat dalam jendela itu: sumber, kode, jenis, prov, nama kab atau koordinat, mulai. Pengiriman ulang aman karena `(sumber, kode)` unik.
3. Python mengubah nama kab atau koordinat ke `kab4`, lalu menjalankan aturan pencocok yang sama dengan sumber lain.
4. Keputusan (tambah, baru, ambigu, tanpa_wilayah) dikirim lewat `POST /api/siklus/ingest/kejadian` yang sudah ada.
5. Ambigu masuk antrean tinjau staf yang sudah ada di `/siklus`; staf memilih kejadian atau menolak.
6. Layar modul membaca tautan lewat `GET /api/kejadian/tautan?sumber=&kode=` dan menampilkan tanda `KJ-`.

## A2. Isian luring

1. Petugas mengisi form; spek memvalidasi di ponsel.
2. Butir masuk saluran modulnya di `pb-antre`; foto masuk penyimpan blob.
3. Pita "belum terkirim: N" muncul di halaman.
4. Saat daring: foto diunggah dulu, lalu butir; kunci `klien_id` mencegah ganda.
5. Butir ditolak server tetap di ponsel dengan alasan, sampai diperbaiki atau dibuang.

## A3. Kaji titik pengungsian

1. Petugas kab membuka meja pengungsi, memilih titik dari daftar kab atau membuat titik baru (nama, jenis tempat, koordinat dari GPS atau peta).
2. Sistem memeriksa titik lain dalam 200 m dan menanyakan bila ada (Q4).
3. Petugas mengisi putaran: kk, jiwa per umur dan jenis kelamin, rentan, enam kebutuhan.
4. Titik ditautkan ke kejadian `KJ-` yang aktif di kab itu; bila lebih dari satu, petugas memilih.
5. Rekap kab tetap memakai catatan terakhir per titik yang masih berjalan.

## A4. Satu orang

1. Migrasi membuat tabel samping `orang_akun` dan `orang_tinjau`; tabel akun tidak diubah.
2. Skrip pencocok mengukur dulu berapa akun ber-NIP tidak baku, lalu mengusulkan pasangan: NIP baku sama persis, lalu WA sama persis sesudah dinormalkan.
3. Pasangan tunggal ditulis otomatis; satu akun yang cocok ke dua orang berbeda masuk daftar tinjau admin.
4. Akun baru yang dibuat sesudahnya langsung dicari pasangannya di `orang`.
5. Halaman jejak per orang menampilkan absen, laporan, isian meja, dan tugas dari semua tabel lewat `orang_akun`.
