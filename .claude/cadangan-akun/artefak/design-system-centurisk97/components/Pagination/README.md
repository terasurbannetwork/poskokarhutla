# Pagination

Paginasi di kaki tabel dan daftar: ringkasan jumlah di kiri, tombol halaman di kanan.

- `.pgn` dengan garis atas `line`; ringkasan `caption` tabular.
- Tombol `.pgn-b` 32px, radius `r-xs`; aktif bergradasi navy, nonaktif opasitas 35%.
- Pindah halaman tidak boleh membekukan layar: tombolnya diperbarui segera, isi tabel yang berat ditunda (transition).
