# Luring, peringatan dini PWA, bahasa

Halaman ini menjelaskan jalur lapor tanpa sinyal, peringatan dini PWA dengan Web Push, dan terjemahan antarmuka.

## Lapor tanpa sinyal: pemutaran ulang alur darurat

Jalur luring tidak memakai rute server baru. `public/lapor/luring.js:21` (`putarUlang`) memutar ulang alur Lapor darurat langkah demi langkah ke `POST /api/lapor/pesan` saat sinyal kembali (paling banyak 14 langkah): kata `darurat`, lokasi dari butir, pilihan jenis, pilihan korban, lewati foto, setuju, ringkasan, kirim. Hasilnya laporan biasa sehingga mesin percakapan tetap satu. Antrean memakai `public/inti/antre.js` dengan saluran `lapor-luring`: kunci idempoten per butir (`klien_id`), jeda ulang bertambah dua kali lipat sampai batas 30 menit, butir ditahan paling lama 14 hari. Waktu pelapor menekan Simpan disimpan di butir (`waktu_simpan`); apakah waktu itu dipakai sebagai waktu dilaporkan di server belum terdokumentasi di kode. Layanan worker menyimpan cangkang halaman `/lapor/` supaya aplikasi terbuka tanpa sinyal: halaman memakai jaringan dulu lalu salinan simpanan, aset bervesi memakai simpanan dulu, dan `/api/` tidak pernah disimpan (`public/sw-lapor.js:6`, versi simpanan `pb-lapor-1`).

## Peringatan dini PWA

![Alur peringatan dini dari prediksi.json sampai notifikasi dan arahan titik berkumpul; sumber: src/pw_inti.js](gambar/lapor-peringatan.svg)

Sumber: `public/prediksi/data/prediksi.json` (200 KB, dibuat oleh pipeline prediksi; kolom `dibuat` dan kode jenis BNJ banjir, LSR longsor, ASP asap, CEX angin). Berkas: `src/pw_inti.js`, `src/pw_peringatan.js`.

Langkah (`hitungPeristiwa`, `src/pw_inti.js:31`):

```
untuk tiap kab, jenis in {BNJ, LSR, ASP, CEX}, hari n = 1..3:
  tanggal = P.kode.HJN.hari[n-1]   (lewati bila sebelum hari ini WIB)
  lv = Besok.levelKode(kab, KOL, n, jenis)   (0..3 atau null)
  bila lv null atau lv < 1: lewati            # null tidak pernah dianggap 0
  bila lv <= level tercatat di pw_status[kab, jenis, tanggal]: lewati
  selain itu: peristiwa baru, simpan lv
tidak ada keluaran bila P.dibuat lebih tua dari 36 jam (SEGAR_JAM)
```

- Notifikasi hanya bila tingkat naik; turun tidak dikirim, dan pulih ke tingkat yang pernah tercatat tidak menghasilkan peristiwa lagi.
- Penerima (`penerima`, `src/pw_inti.js`): langganan dengan `kab_kode` sama, bit jenis menyala (banjir 1, longsor 2, asap 4, angin 8), dan `ambang` kurang dari atau sama dengan tingkat. Satu perangkat menerima satu notifikasi per kab, menggabung semua jenis yang naik; tingkat tertinggi ada di judul.
- Jam tenang (`tahanSampai`, `src/pw_inti.js:21`): peristiwa tingkat Waspada ditahan antara 22.00 dan 05.00 WIB dan dikirim sesudah 05.00; Siaga dan Awas tidak ditahan.
- Pengiriman: Web Push berenkripsi lewat `src/push.js` dengan pasangan kunci VAPID khusus warga (terpisah dari kunci instansi). Paling banyak 40 kiriman per putaran cron (`PER_MENIT` di `src/pw_inti.js:12`, sejalan `MAKS_KIRIM` di `src/push.js:15`); kursor `pw_peristiwa.kursor` melanjutkan antrean di putaran berikutnya. Satu putaran hanya melayani satu peristiwa kab/kota (urut id, `LIMIT 1`), dan pembacaan penerima diambil paling banyak 60 baris per halaman; peristiwa kab/kota lain menunggu putaran berikutnya. Karena cron peringatan berjalan sekali per jam, kenaikan tingkat di banyak kab/kota dikirim bergiliran, kira-kira satu kab/kota per jam (`src/hak.js:1811-1814`, `src/pw_peringatan.js:103-120`). Status 404 atau 410 menghapus langganan.
- Tidak ada GPS yang dikirim saat berlangganan; yang disimpan adalah endpoint push, kode kecamatan dan kab, jenis, ambang, dan bahasa. Batas 3 kecamatan per perangkat dan 5.000 langganan aktif (langganan ke-5.001 ditolak).
- Titik berkumpul (`titikTerdekat`, `src/pw_inti.js:85`): dari data OpenStreetMap lokal (`titik_kumpul`, `pemerintahan`, `sekolah`, dan rumah ibadah), radius 5 km dari titik tengah desa pertama kecamatan atau GPS perangkat (tidak dicatat), diurutkan titik kumpul lebih dulu lalu jarak, tiga teratas, berlabel "perkiraan dari OpenStreetMap". Register `titik_pengungsian` resmi belum dipakai.
- Tingkat dihitung per kab/kota karena prakiraan sistem memang per kab/kota; teks tidak mengklaim tingkat kecamatan.
- Status uji balik: tingkat ditulis "(belum teruji)" bila vonis jenis itu belum "mengalahkan baseline" di `prediksi.json`. Jenis angin (CEX) secara bawaan belum teruji. Prakiraan ini terpisah dari peringatan resmi BMKG.

## Terjemahan antarmuka

`src/lapor_bahasa.js:8` mendaftar 24 bahasa. Mesin dan data tetap berbahasa Indonesia: pesan pelapor diterjemahkan ke Indonesia sebelum masuk mesin dan teks asli disimpan berdampingan, sementara balasan mesin diterjemahkan ke bahasa pilihan. Terjemahan masuk yang mengubah angka ditolak. Terjemahan yang jauh lebih panjang dari aslinya dibuang. Kamus statis dibuat dengan `node scripts/lapor/tr_buat.mjs [kode ...]` dari teks yang dikumpulkan `tr_kumpul.mjs`. Plafon harian seluruh situs untuk panggilan model terjemahan adalah 3.000 (`BATAS_TERJEMAH_HARI`). Mutu model per bahasa daerah belum diukur; status uji mutu: belum diuji.
