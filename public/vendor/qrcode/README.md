# qrcode-generator 1.4.4

- Sumber: paket npm `qrcode-generator@1.4.4` (https://github.com/kazuhikoarase/qrcode-generator), berkas `qrcode.js`.
- Lisensi: MIT (Kazuhiko Arase), lihat `LICENSE`.
- `qrcode.min.js` = `qrcode.js` diperkecil dengan `npx terser@5 qrcode.js -c -m --comments '/Copyright/'` (20.470 byte). Tanpa perubahan isi.
- Hasil: `globalThis.qrcode` (skrip klasik, `var qrcode`). Dimuat dengan `/vendor/qrcode/qrcode.min.js?v=1`.
- Tanpa CDN (CSP `script-src 'self'`). Untuk menaikkan versi: ganti berkas, naikkan `?v=` di sw-lapangan.js dan halaman pemuat.
