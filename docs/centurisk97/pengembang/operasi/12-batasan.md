# Batasan teknis

Halaman ini merangkum batasan teknis modul Operasi yang perlu diketahui.

## Batasan teknis yang perlu diketahui

- Penilaian "padam" bergantung pada putaran FIRMS yang masuk tiap 3 jam UTC (`src/worker.js:1010`, `src/titik.js:143`); cron jam menit 23 (`src/worker.js:1027`) hanya menilai operasi lapangan darat, bukan aksi udara. Aksi yang tidak sempat dinilai sebelum jendela habis jatuh ke `tak_dinilai`.
- Titik panas satelit bukan pengukuran api di lapangan. "Padam" dari satelit berarti tidak ada deteksi, bukan konfirmasi lapangan.
- Metrik dengan kurang dari 5 kejadian tidak diberi angka. Metrik M5, M8, M9, M10 belum punya sumber data.
- Foto grup satgas yang tidak memuat stempel koordinat dan jam yang terbaca tidak bisa memasang koordinat otomatis. OCR stempel dikirim gateway Mac mini; tanpa itu pemasangan foto bergantung pada registrasi dan jam.
- Pengurai pesan WA tidak menebak. Pesan yang tak terbaca ditahan; saat ini yang ditahan tidak disimpan, hanya dikembalikan di respons gerbang (`ponytail` di `src/operasi_udara.js`).
- Kontrak 2026 di layar berasal dari berkas statis berlabel per 25 Oktober, bukan dari D1.
- Pendeteksi badan air dari OpenStreetMap menggunakan kotak batas; bentuk tak beraturan diperkirakan dengan faktor 0,5 untuk luas. Kedalaman, rintangan (kabel, pohon), dan izin penggunaan tidak diketahui.
- Persen tindakan logbook adalah pencocokan kata kunci pada teks; bisa lebih tinggi atau lebih rendah dari kenyataan.
- Pemicu renlap karhutla di Mac mini mati bawaan, dan hanya bekerja bila mesin itu hidup dan gateway tersambung. Bila bot terlambat, data hari itu bisa kurang; ekspor WhatsApp dapat diputar ulang lewat `scripts/operasi/isi_ulang_wa.mjs` (menghasilkan SQL idempoten yang dijalankan pemilik).
- Aksi atau keputusan terbang selalu pada pilot dan komando. Seluruh keluaran modul ini adalah usulan dan perkiraan.
