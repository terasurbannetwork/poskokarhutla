# ALUR: Lapor tanpa sinyal

## 1. Siapkan (saat ada sinyal, sekali per perangkat)

1. Warga sudah memakai `/lapor` dengan nomor dikenal dan persetujuan tercatat (alur online yang ada).
2. Beranda menampilkan kartu "Siapkan lapor tanpa sinyal" (sekali, bisa ditutup, muncul lagi di menu Bantuan).
3. Ketuk Siapkan: (a) service worker `sw-lapor.js` terpasang dan cangkang disimpan; (b) izin lokasi diminta; (c) izin kamera diminta lewat pemilih foto kamera uji; (d) `navigator.storage.persist()` diminta bila ada; (e) ajakan Pasang ke layar utama (Q11); (f) selisih jam HP lawan jam server dicatat.
4. Status berubah menjadi "Siap" dengan daftar apa yang berhasil dan apa yang belum (misalnya "Izin lokasi ditolak"). Yang gagal tidak menyembunyikan yang berhasil.

## 2. Melapor tanpa sinyal

1. Halaman `/lapor/` terbuka dari simpanan. Pita "Tanpa sinyal" tampil bila `navigator.onLine` false atau kirim gagal dengan `s = 0`.
2. Warga mengetuk Lapor darurat atau Lapor kejadian. Bila tidak ada jaringan, layar membuka formulir luring (kartu "Lapor tanpa sinyal") dan bukan chat. Warga yang belum Siap melihat 112, nomor penting, dan ajakan Siapkan (Q2).
3. Langkah formulir, satu kartu bertahap:
   1. Jenis bencana (kartu bergambar, tanpa "Lainnya", K78).
   2. Lokasi: "Pakai lokasi saat ini" membaca GPS dan menampilkan koordinat serta akurasi. Gagal: pilih kab/kota dari daftar (Q7) atau coba lagi.
   3. Kapan: Sedang berlangsung, Kurang dari 1 jam lalu, Hari ini, Kemarin.
   4. Ada korban atau orang terjebak: Ya, Tidak, Belum tahu (jawaban kosong tidak diterima).
   5. Foto dari kamera, sampai 3, opsional; tiap foto langsung diperiksa (ALGORITMA 3). Ringkasan teks opsional sampai 500 huruf.
4. Ketuk Simpan. Formulir menolak bila empat isian wajib belum lengkap dan menyebut yang kurang.
5. Layar konfirmasi: "Laporan tersimpan di HP. Akan terkirim otomatis saat ada sinyal." Isinya ringkasan, jam simpan, dan tombol Buka daftar belum terkirim. Tidak ada nomor tiket (belum ada).

## 3. Sinyal kembali

1. Peramban memicu `online`, atau tab terlihat, atau ketukan berkala. Antre.js mengambil butir terlama.
2. Butir foto diunggah dulu (`POST /api/lapor/luring/foto`); butir laporan dikirim paling akhir ke `POST /api/lapor/luring` dan merujuk foto lewat `klien_id`.
3. Worker memeriksa ulang, membuat laporan terkirim versi 1, tiket, dan PDF, dan menjawab `{nomor, lacak}`.
4. Halaman membuang butir, menampilkan "Laporan Anda sudah terkirim. Nomor tiket LA-...", dan menawarkan susulan.
5. Gagal sementara (0, 408, 429, 5xx): butir tetap, antre.js mundur. Ditolak (4xx): butir ditahan berlabel "Ditolak" dengan alasan; warga bisa membuang atau menyusun ulang.

## 4. Di meja

Laporan tampil dengan lencana "Dikirim dari luring", waktu dibuat (HP) dan waktu diterima, serta lencana foto "GPS perangkat, luring". Laporan darurat luring hanya membunyikan pita darurat bila memenuhi Q3.

## 5. Keadaan butir

| Keadaan | Arti | Keluar lewat |
| --- | --- | --- |
| menunggu | Tersimpan, belum terkirim | terkirim, ditolak, kedaluwarsa 14 hari, dibuang warga |
| mengirim | Antre.js sedang memproses | menunggu atau terkirim |
| ditolak | Server menolak (4xx) | dibuang warga atau kedaluwarsa |
| berubah | Server melaporkan keadaan berubah (409) | dibuang warga |
| terkirim | Dihapus dari HP | tidak ada |
