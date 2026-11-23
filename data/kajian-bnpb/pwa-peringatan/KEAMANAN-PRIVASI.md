# KEAMANAN-PRIVASI: Peringatan dan aplikasi terpasang

Berlaku bersama `data/kajian-bnpb/lapor-ai/KEAMANAN-PRIVASI.md` (repo publik; penyamaran, data pribadi tidak di `public/`).

## Data yang disimpan

| Data | Disimpan | Di mana | Tujuan | Retensi |
| --- | --- | --- | --- | --- |
| Endpoint push dan dua kunci perangkat (`p256dh`, `auth`) | ya | D1 `pw_langganan` | mengirim notifikasi | sampai Matikan, 404 atau 410, atau 180 hari tanpa kunjungan |
| Kode dan nama kecamatan, kode kab | ya | D1 | menentukan prakiraan mana | sama |
| Jenis, ambang, bahasa | ya | D1 | menyaring pesan | sama |
| Waktu daftar, kunjungan terakhir, status kirim terakhir | ya | D1 | kedaluwarsa dan diagnosis | sama |
| Lokasi GPS | tidak | hanya di perangkat, dipakai menghitung jarak saat kartu Arahan dibuka | arahan titik | tidak keluar dari perangkat; parameter `lat` dan `lon` pada rute `arah` bersifat opsional dan tidak dicatat di log |
| Nama, nomor WA, surel, akun | tidak | tidak ada | tidak perlu | tidak ada |
| Alamat IP | tidak disimpan di tabel; hanya dipakai batas laju sementara | memori batas laju | cegah penyalahgunaan | sesuai mekanisme `laju` yang ada |

Endpoint push adalah rahasia pemegangnya: siapa pun yang mengetahuinya bisa mengirim ke perangkat itu bila punya kunci VAPID kita. Karena itu endpoint dan kunci tidak pernah ditampilkan, tidak ada di log, tidak ada di ekspor staf, dan rute staf hanya memberi agregat.

## Ancaman dan penjaga

| Ancaman | Penjaga |
| --- | --- |
| Pendaftaran massal palsu (menghabiskan kuota kirim) | header `x-pb: 1`, `HOST_PUSH` mengizinkan hanya layanan push dikenal, batas laju per IP, batas 3 kecamatan per endpoint, batas total 5.000 (Q7), Turnstile ditunda ke Q12 |
| Endpoint diarahkan ke host internal (SSRF) | endpoint wajib `https://` dengan host di daftar putih `HOST_PUSH`; `redirect: "manual"` seperti `kirimKe` |
| Membaca langganan orang lain | rute `status` dan `ubah` mensyaratkan endpoint penuh (rahasia); tidak ada daftar publik |
| Pesan palsu atas nama BNPB | hanya server yang memegang kunci VAPID privat yang dapat mengirim; isi push dibuat dari `prediksi.json` kita, tidak dari masukan pengguna |
| Peringatan salah (kegagalan model) | label prakiraan, label belum teruji, tidak ada kepastian; tombol jeda global; pencatatan peristiwa untuk ditinjau |
| Kelelahan peringatan | D7 dan D8, jam tenang Q4 |
| XSS lewat nama kecamatan atau judul | nama berasal dari data wilayah repo dan dipasang dengan `textContent`; service worker memakai `showNotification` yang tidak menafsirkan HTML; tautan klik dibatasi ke `/lapor/` di situs sendiri |
| Pelacakan lintas situs | cookie tidak dipakai; tidak ada pihak ketiga selain layanan push peramban |
| Pesan basi dikirim | D13 |
| Rahasia VAPID bocor | secret hanya di dasbor Workers; `.env` dan repo tidak memuatnya; rotasi dengan membuat pasangan baru, langganan lama dihapus karena kunci aplikasi berubah (peramban mengikat langganan ke kunci server) |

## Persetujuan dan hak

1. Notifikasi dinyalakan hanya oleh ketukan pengguna sesudah penjelasan satu kalimat dan tautan kebijakan privasi (K23, K28; ditinjau bagian hukum BNPB sebelum publik, Q2).
2. Berhenti kapan saja dengan satu ketukan; menghapus baris, bukan menandainya.
3. Pengguna bisa melihat apa yang tersimpan (kecamatan, jenis, ambang) lewat kartu kelola.
4. Penyedia layanan push (Google, Apple, Mozilla) melihat bahwa sebuah perangkat menerima pesan dari server kita pada waktu tertentu; isi terenkripsi. Kebijakan privasi menyebut ini.
5. Anak di bawah umur: tidak ada identifikasi, tidak ada data pribadi, jadi tidak ada ketentuan khusus selain kebijakan privasi umum (ditinjau hukum BNPB).

## Pencatatan

Log Worker tidak memuat endpoint, kunci, `lat`, `lon`, atau IP. Catatan peristiwa (`pw_peristiwa`) hanya berisi kab, jenis, tanggal, tingkat, dan hitungan hasil kirim.

## Pemeriksa

`security-reviewer` untuk PW-02, PW-04, PW-06; `guard-api` untuk semua rute; `migrasi-idempoten` untuk 0163; `selera-angka` untuk teks pesan dan kartu.
