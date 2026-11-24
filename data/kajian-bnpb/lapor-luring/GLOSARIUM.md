# GLOSARIUM: Lapor tanpa sinyal

| Istilah | Arti |
| --- | --- |
| Luring | Tanpa sambungan jaringan ke server; HP masih dapat memotret dan membaca GPS |
| Butir | Satu rekaman di antrean `pb-antre`; laporan luring = satu butir laporan plus butir foto |
| Antrean (antre.js) | Pustaka bersama `public/inti/antre.js` yang menyimpan butir di IndexedDB dan mengirimnya saat tersambung |
| Saluran | Kelompok butir di antrean dengan aturan sendiri; di sini `lapor` (dan `lapor-video` yang sudah ada) |
| `klien_id` | Nomor acak butir yang dibuat di HP; kunci idempotensi di Worker |
| `waktu_klien` | Jam HP saat warga menekan Simpan; waktu dilaporkan menurut HP |
| Waktu diterima | Jam server saat butir masuk; dicatat terpisah (K17) |
| Siapkan | Langkah sekali saat ada sinyal agar perangkat bisa melapor luring (service worker, izin, penyimpanan) |
| Service worker | Skrip peramban yang menyajikan halaman dari simpanan saat tanpa sinyal; `public/sw-lapor.js` |
| Cangkang | Berkas halaman (HTML, JS, CSS, gambar) yang disimpan service worker |
| Formulir luring | Kartu pendek: jenis, lokasi, waktu, korban, ringkasan, foto; cermin Lapor darurat |
| Dikirim dari luring | Lencana di meja dan PDF untuk laporan yang dibuat tanpa sinyal |
| Dikirim terlambat | Laporan luring yang diterima lebih dari 2 jam setelah waktu simpan (Q3); tidak membunyikan pita darurat |
| Lencana GPS perangkat, luring | Bukti lokasi foto yang lebih lemah daripada GPS perangkat saat online, karena server tidak melihat jaringan saat foto diambil |
| Jam HP belum diverifikasi | Tanda bila selisih jam HP lawan server tidak pernah diukur |
| Selisih jam | Jam server dikurangi jam HP, diukur saat tersambung dan disimpan di HP |
| Background Sync | Fitur Chrome Android untuk mengirim saat sinyal kembali tanpa halaman terbuka; tidak ada di iOS Safari |
| Pembuangan penyimpanan | Peramban menghapus data situs (iOS Safari setelah tujuh hari tanpa interaksi bila tidak dipasang ke layar utama) |
| Pita belum terkirim | Elemen `.antre-pita` yang menampilkan jumlah butir menunggu |
| Spek luring | Definisi bersama isian formulir luring (`public/inti/luring_spek.js`), dipakai klien dan Worker |
| Susulan | Tambahan isian sesudah laporan terkirim (D36 paket induk) |
| Q | Pertanyaan terbuka untuk pemilik dengan bawaan sementara |
