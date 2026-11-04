# Header

Bilah atas navy bergradasi yang wajib ada di tiap halaman centurisk97.id, termasuk halaman staf.

- Kelas: `header.top` di situs (`.c97-top` di pratinjau). Tinggi `--top` (58px), gradasi 135deg dari `header-from` ke `header-to`, teks putih.
- Isi berurutan: logo + nama (`brand-name`), menu pilihan bencana (`details.bencana`, digambar `/inti/kepala.js`), tab navigasi rata tengah, status jam, tombol tema (`.iconbtn`).
- Tab aktif memakai `aria-current="page"` dengan latar putih 16%; hover 8%.
- Di bawah 1280px tab pindah ke menu garis tiga (`#burger`); di bawah 640px menu bencana dan tombol tema disembunyikan.
- Halaman yang bergulir: `<main>` dibuat fixed oleh gaya.css, jadi pakai wadah div dan `body{padding-top:var(--top)}`.
- Jangan membuat palet halaman sendiri; ambil markup dari `public/tentang.html` atau `public/akademisi.html`.
