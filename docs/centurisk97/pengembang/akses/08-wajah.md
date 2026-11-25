# Pencocokan wajah, GPS, status absen

Halaman ini menguraikan metode pencocokan wajah, GPS, dan keputusan status absen beserta ambangnya.

## M6. Pencocokan wajah, GPS, dan keputusan status absen

Pencocokan wajah dihitung di HP dengan pustaka Human (MIT); Worker hanya menyimpan vektor dan membandingkan. Vektor wajah tidak pernah keluar dari Worker. Langkah:

1. Pendaftaran lima arah. Syarat sudut kepala (`SYARAT_SUDUT`): depan yaw dan pitch dalam ±8 derajat; kiri yaw ≤ -22; kanan yaw ≥ 22; atas pitch ≤ -15; bawah pitch ≥ 15 (batas pitch dan yaw lain sesuai tabel di kode). Tanda yaw dan pitch (`TANDA_YAW`, `TANDA_PITCH`) bernilai sementara 1 dan baru diverifikasi pada uji perangkat.
2. Gerbang mutu per frame (`MUTU`): skor deteksi ≥ 0,80; lebar wajah 30 sampai 75 persen lebar video; ketajaman ≥ 40; antispoof ≥ 0,50 (angka antispoof tidak dikirim ke klien); 5 frame berturut-turut; 3 frame terbaik dirata-rata menjadi satu vektor per arah; batas 15 detik per arah.
3. Server memeriksa kemiripan kosinus tiap vektor arah terhadap vektor depan ≥ `AMBANG_DAFTAR` = 0,45; bila gagal arah itu diminta ulang.
4. Saat absen: server memberi tantangan acak (kedip, toleh kiri, toleh kanan) dengan batas 8 detik. `skor_wajah` adalah kosinus tertinggi antara vektor absen dan lima vektor terdaftar.
5. GPS: tiga sampai sepuluh sampel `{lat, lon, akurasi, waktu}`; titik absen adalah sampel terakhir; ditolak bila di luar kotak Indonesia atau akurasi lebih dari 5000 m. Jarak Haversine ke titik tugas; `dalam_radius` bila jarak ≤ radius + min(akurasi, 200 m). Lompatan mustahil antar-absen orang yang sama: kecepatan lebih dari 900 km/jam (hanya dihitung bila jarak 1 km atau lebih).
6. Waktu resmi adalah waktu server. Absen daring dengan selisih jam HP lebih dari 300 detik diberi tanda `jam_hp`. Absen luring memakai jam HP bila dalam 24 jam ke belakang dan 5 menit ke depan; klaim lebih dari 2 jam sebelum jam server diberi `luring_lama`.
7. Nonce sekali pakai: 5 menit untuk daring; 6 nonce berumur 36 jam untuk simpanan luring.

Ambang wajah (`src/lapangan_konst.js:52`, bertanda kalibrasi, disetel dari 200 pasang absen pertama yang sah):

| Ambang | Nilai | Arti |
| --- | --- | --- |
| `AMBANG_LOLOS` | 0,60 | di atas ini wajah cocok |
| `AMBANG_TINJAU` | 0,45 | antara 0,45 dan 0,60 `wajah_rendah`; di bawah 0,45 `wajah_berbeda` (tetap tinjau, bukan tolak) |
| `AMBANG_HIDUP` | 0,50 | skor antispoof dan liveness minimum; di bawahnya hanya `hidup_rendah` |
| `SAMPEL_TINJAU` | 0,10 | 10 persen absen yang selainnya lolos dipindah ke tinjauan secara acak (hanya di server) |
![Skor kemiripan wajah dibagi tiga kawasan oleh ambang 0,45 dan 0,60; skor di bawah 0,60 masuk antrean tinjau manusia. Semua ambang berstatus hipotesis. Sumber: src/lapangan_konst.js:52.](gambar/akses-instansi-ambang-wajah.svg)


Keputusan status (`putusStatus`, `src/lapangan_konst.js:141`):

```
tolak   bila foto sudah pernah dipakai, ATAU nonce tidak sah, ATAU GPS ditolak
lolos   bila wajah terdaftar, skor_wajah >= 0,60, tantangan lolos, hidup >= 0,50,
        tidak gps_curiga, dalam_radius, tidak jam_hp, tanpa tanda lain
tinjau  selain itu, dengan daftar alasan
```

Alasan tinjau: `wajah_belum_daftar`, `wajah_rendah`, `wajah_berbeda`, `tantangan_gagal`, `hidup_rendah`, `gps_curiga`, `luar_radius`, `jam_hp`, `luring`, `luring_lama`, `jaringan_beda` (kode sama dari `ip_hash` lain dalam 12 jam), `wajah_baru` (3 absen pertama sesudah daftar ulang wajah), `sampel_acak`.

Status uji balik: kalibrasi ambang belum selesai. `AMBANG_HIDUP` adalah nilai sementara dan menunggu uji foto cetak dan layar (U-20 di dokumen). Seluruh ambang wajah di atas diperlakukan sebagai HIPOTESIS sampai 200 pasang absen sah terkumpul; karena skor rendah hanya mengirim ke tinjauan manusia, kesalahan ambang berdampak pada beban peninjau, bukan penolakan otomatis.

Batasan dan ketidakpastian: peramban tidak dapat mendeteksi GPS palsu; GPS curiga hanya heuristik. Helm, hujan, dan HP murah menurunkan skor wajah. Aplikasi Android native untuk mendeteksi lokasi tiruan belum diputuskan (U2).
