# KEAMANAN-PRIVASI

- Semua data tab Besok publik-statis (`public/prediksi/data/*.json`), tanpa data orang. Halaman tetap `noindex` seperti sekarang.
- Teks dari berkas data disisipkan lewat `esc()` (`public/inti/format.js`); tidak ada `innerHTML` dari string sumber luar tanpa `esc`.
- Panggilan Open-Meteo dan Open-Meteo Marine tanpa kunci; tidak ada secret baru.
- Peta memuat ubin dasar `tiles.openfreemap.org` yang sudah dipakai dalops; tidak ada asal baru di CSP selain yang sudah diizinkan untuk dalops (diperiksa saat pemasangan).
- Tidak ada rute Worker baru dan tidak ada tabel D1 baru. Formulir Konfirmasi tidak berubah (Q4).
- Kalimat dampak tetap berlabel perkiraan; tidak pernah menulis "aman".
