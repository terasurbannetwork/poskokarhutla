# GLOSARIUM

| Istilah | Arti di paket ini |
| --- | --- |
| PWA | aplikasi web yang bisa dipasang ke layar utama dari peramban, berjalan tanpa bilah alamat (mode standalone) |
| Manifest | berkas `manifest.webmanifest` yang memberi nama, ikon, dan ruang lingkup aplikasi |
| Service worker | skrip latar peramban (`sw.js`) yang menerima push dan klik notifikasi; di sini tanpa cache |
| Web Push | cara server mengirim pesan terenkripsi ke peramban lewat layanan push Google, Apple, atau Mozilla |
| Endpoint | alamat layanan push milik satu perangkat; rahasia pemegangnya |
| Kunci perangkat (`p256dh`, `auth`) | pasangan kunci untuk mengenkripsi isi pesan ke satu perangkat |
| VAPID | identitas server pengirim (kunci publik dan privat milik kita) yang dibaca layanan push |
| Langganan | satu baris di `pw_langganan`: satu perangkat, satu kecamatan, jenis, ambang, bahasa |
| Ambang | tingkat terendah yang memicu pesan: Waspada (1), Siaga (2), Awas (3) |
| Tingkat | Normal 0, Waspada 1, Siaga 2, Awas 3 pada prakiraan kita; bukan status resmi BMKG atau BNPB |
| Peristiwa | (kab, jenis, tanggal sasaran, tingkat) yang naik dari yang sudah dicatat |
| Tanggal sasaran | hari prakiraan 1, 2, atau 3 ke depan |
| Teruji, belum teruji | penanda dari uji balik prakiraan terhadap baseline; belum teruji ditulis di pesan |
| Kursor | penanda langganan terakhir yang sudah dicoba pada satu peristiwa |
| Jeda global | tombol staf yang menghentikan semua kiriman |
| Titik berkumpul, titik evakuasi | tempat terdekat dari register BPBD (`titik_pengungsian` yang ditandai publik) atau perkiraan dari OpenStreetMap; belum tentu ditetapkan resmi |
| Standalone | keadaan aplikasi dibuka dari ikon layar utama, bukan dari tab peramban |
| Jam tenang | jam saat pesan tingkat Waspada ditahan (Q4) |
| Q | pertanyaan terbuka untuk pemilik di `KEPUTUSAN-PWA.md` |
