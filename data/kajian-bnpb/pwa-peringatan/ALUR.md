# ALUR: Pasang, berlangganan, menerima, berhenti

## 1. Pasang di Android (Chrome)

1. Warga membuka `/lapor`, memilih bahasa (alur induk).
2. Chrome menembakkan `beforeinstallprompt`; halaman menyimpannya dan menampilkan kartu Pasang (F-2) bersama SIGAP.
3. Warga mengetuk Pasang; peramban menampilkan dialog sistem; ikon masuk layar utama.
4. Dibuka dari ikon, aplikasi berjalan standalone dengan `start_url` `/lapor/?dari=pwa` (parameter hanya untuk menampilkan beranda tanpa kartu Pasang).

## 2. Pasang di iPhone (Safari)

1. Kartu Pasang mendeteksi iOS dan tidak ada `display-mode: standalone`; menampilkan tiga langkah bergambar: Bagikan, Tambah ke Layar Utama, Tambah.
2. Bila bukan Safari (peramban lain atau tampilan dalam aplikasi), kartu meminta membuka tautan di Safari.
3. Notifikasi hanya ditawarkan sesudah aplikasi dibuka dari ikon Layar Utama; sebelum itu tombol Nyalakan peringatan menjelaskan langkah pasang dulu (R1, perlu verifikasi).

## 3. Berlangganan

1. Dari beranda: tombol Peringatan untuk daerah saya, atau gelembung SIGAP.
2. Layar kelola (F-3, F-4): cari kecamatan, pilih sampai 3, jenis, ambang, lalu Nyalakan.
3. Halaman menjelaskan satu kalimat dulu: "Kami menyimpan kecamatan pilihan Anda dan kunci notifikasi perangkat ini. Tidak ada lokasi GPS, nama, atau nomor." Tautan ke kebijakan privasi (K23, K28).
4. Ketukan Nyalakan memanggil izin notifikasi; bila diizinkan, `pushManager.subscribe` lalu `POST /api/lapor/peringatan/langganan`.
5. Sukses: satu notifikasi uji lokal ("Peringatan menyala untuk Kecamatan X"), bukan dari server, supaya tidak memakai kuota kirim.
6. Ditolak: kartu menulis cara mengubah izin di pengaturan perangkat; tidak diminta lagi sampai warga mengetuk Nyalakan.

## 4. Menerima

1. Prakiraan terbit (`prediksi.json` berganti `dibuat`).
2. Cron menit menghitung peristiwa baru (ALGORITMA bagian 3), mengantre per kab.
3. Cron mengirim potongan 40 perangkat per menit.
4. Perangkat menerima: service worker menampilkan notifikasi (judul, isi, tag kab).
5. Klik: aplikasi dibuka di `/lapor/?peringatan=<kab>`, kartu arahan (F-7) tampil; bila aplikasi sedang terbuka, jendela itu difokuskan.
6. Kartu arahan: tingkat 3 hari, imbauan, tiga titik berkumpul. Bila warga mengizinkan GPS, jarak dihitung dari GPS (di perangkat); bila tidak, dari titik tengah kecamatan.

## 5. Berhenti

| Jalan | Hasil |
| --- | --- |
| Tombol Matikan di kelola | `POST /berhenti`, baris dihapus, `unsubscribe()` di perangkat |
| Mematikan izin di pengaturan sistem | pengiriman berikutnya dijawab 404 atau 410; baris dihapus (D15) |
| Hapus aplikasi dari layar utama | sama dengan baris di atas |
| Tanpa kunjungan 180 hari | cron bersih-bersih menghapus baris (Q6) |

## 6. Keadaan khusus

| Keadaan | Perlakuan |
| --- | --- |
| Peramban tidak mendukung push | kartu menulis "Peringatan belum didukung di peramban ini", pasang tetap ditawarkan |
| Kunci VAPID belum terpasang | rute status menjawab `{tersedia:false}` dan tombol Nyalakan tidak tampil (pola `push.js`) |
| Prakiraan basi lebih dari 36 jam | tidak mengirim; peristiwa dicatat dilewati |
| Wilayah tanpa data prakiraan | kartu menulis "Data prakiraan untuk daerah ini belum ada", tidak menampilkan Normal |
| Satu perangkat berganti kecamatan | `POST /ubah` menimpa daftar kecamatan; peristiwa lama tidak dikirim ulang karena `pw_status` bersifat per kab |
| Peringatan jenis sama naik dua kali sehari | hanya yang tingkatnya lebih tinggi dari yang tercatat |
