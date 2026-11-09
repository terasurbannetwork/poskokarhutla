# DESIGN-SYSTEM-LOGPAL

- Kerangka: `header.top` navy bersama (`/inti/kepala.css`, `/inti/kepala.js`), `/inti/tema.css` untuk token, `/inti/gaya.css`. Halaman bergulir biasa: `body{padding-top:var(--top)}`, bukan `main` tetap.
- Warna dari token Centurisk97 (`--paper`, `--card`, `--surface`, `--ink`, `--ink2`, `--line`, `--brand2`, `--f2` oranye untuk angka kunci). `logpal.css` hanya membuat alias pendek (`--bg`, `--panel`, `--fg`, `--muted`, `--head`, `--acc`); terang dan gelap ikut tema.
- Navigasi: 10 tombol tab sebaris penuh (`.seg`), pilihan terpilih memakai `aria-pressed`. Klik tab mengganti keadaan seketika; hitungan berat dijalankan sesudah paint (`nanti`).
- Komponen: kartu `.kr` dan `.km-kartu`, ubin angka `.km-u`, tabel dengan kepala navy dan teks tengah, pil status, kolom angka rata kanan, tabel panjang memakai `content-visibility:auto`.
- Peta: SVG d3 (geoMercator) dengan tooltip berisi nilai dan satuan; legenda hanya yang digambar.
- Dummy: dua tombol ikon polos (tanpa garis dan latar) di kanan bawah, tampil hanya untuk Super Admin.
- Teks: bahasa Indonesia lugas, tanpa titik tengah sebagai pemisah, angka format id-ID, jam tempuh bulat berlabel perkiraan.
- Tanpa CDN: d3 di `/vendor/d3`, qrcode di `/vendor/qrcode`.
