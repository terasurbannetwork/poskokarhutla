# ALGORITMA: Pemicu, deduplikasi, antrean, titik evakuasi

Semua fungsi murni (tanpa D1 dan tanpa fetch) agar bisa diuji di node. Letak: `src/pw_peringatan.js` (PW-02).

## 1. Masukan

`P = prediksi.json`; `P.kab[]` baris per kab dengan `id` (empat digit, `kode.replace(".", "")`), `nama`, `pn`, dan kunci jenis. `KOL = P.kode[jenis].kol`. Level sel per hari memakai `Besok.levelKode(k, KOL, n, jenis)` dari `public/prediksi/besok_inti.js` (n = 1 sampai 3), hasil 0 sampai 3 atau `null` (tidak ada data). Jangan menulis ulang rumus: modul itu dimuat ulang atau diekstrak ke berkas bersama yang dipakai layar dan Worker (PW-02, uji kesamaan).

Pemetaan jenis: banjir = `BNJ`, longsor = `LSR`, asap = `ASP`, angin = `CEX`. Jenis lain di `prediksi.json` (hujan, titik panas, rob) tidak dikirim pada rilis ini.

## 2. Peristiwa

Satu peristiwa = (kab, jenis, tanggal sasaran, level). Tanggal sasaran = `P.kode.HJN.hari[n-1]`.

```
untuk tiap kab, jenis, n in 1..3:
  lv = levelKode(...)
  jika lv == null atau lv < 1: lanjut          // di bawah Waspada tidak ada peristiwa
  tercatat = pw_status[kab, jenis, tanggal]    // 0 bila belum ada
  jika lv > tercatat: peristiwa baru, simpan lv di pw_status
```

Sifat yang harus benar: (a) tingkat yang sama dua kali tidak menghasilkan peristiwa; (b) turun lalu naik kembali ke tingkat yang pernah tercatat tidak menghasilkan peristiwa lagi untuk tanggal itu; (c) tanggal sasaran berbeda dihitung terpisah; (d) `null` tidak pernah dianggap 0 untuk menurunkan tingkat tercatat; (e) tidak ada keluaran bila `dibuat` lebih tua dari 36 jam.

Baris `pw_status` yang tanggalnya sudah lewat dihapus bersih-bersih (30 hari).

## 3. Penerima

Penerima peristiwa (kab, jenis, tanggal, lv) = baris `pw_langganan` dengan `kab_kode = kab`, bit jenis menyala, dan `ambang <= lv`. Satu perangkat dengan dua kecamatan di kab yang sama menerima satu notifikasi. Satu perangkat dengan kecamatan di dua kab menerima satu notifikasi per kab (tag berbeda).

Notifikasi per perangkat per kab menggabung semua peristiwa baru dari terbitan itu: tingkat tertinggi ditulis di judul, jenis lain di isi. Urutan jenis: banjir, longsor, asap, angin.

## 4. Teks

Judul: `{Jenis} {Tingkat} di {Nama kab/kota}`; bila gabungan: `{Tingkat tertinggi} di {Nama kab/kota}`.
Isi: `Prakiraan {hari}: {daftar jenis dan tingkat}. Kecamatan {nama kecamatan pilihan}. Prakiraan Pantau Bencana, bukan peringatan resmi.` Jenis belum teruji ditambah `(belum teruji)`.
Panjang isi dipotong dari kanan kalimat terakhir hingga muat 3993 byte; judul tidak dipotong (paling banyak 80 karakter, disingkat nama kab).
Tidak ada kata "aman". Tidak ada angka kepastian (persen) tanpa sumber.

## 5. Jam tenang dan penyaring

Bawaan Q4: bila lv = 1 dan jam WIB antara 22.00 dan 05.00, peristiwa ditahan (`ditahan = 1`) dan dikirim pada putaran pertama sesudah 05.00. lv 2 dan 3 tidak pernah ditahan. Bila saat dikirim peristiwa sudah tidak berlaku (tanggal sasaran lewat), dilewati.

## 6. Antrean dan kecepatan

`pw_peristiwa.kursor` = id langganan terakhir yang sudah dicoba. Tiap menit: ambil peristiwa tertua yang belum selesai, ambil sampai 40 langganan dengan `id > kursor` urut id, kirim, geser kursor, tandai selesai bila tidak ada sisa. Hasil kirim dicatat agregat di kolom `ok`, `gagal`, `mati`. Status 404 dan 410 menghapus baris. Status 429 atau 5xx tidak menghapus dan tidak diulang pada peristiwa yang sama (batas satu kali coba per perangkat; peristiwa berikutnya akan mencoba lagi).

Ceiling: 40 kiriman per menit, sekitar 2.400 per jam. Dengan 5.000 langganan seluruhnya dalam satu kab, peristiwa memakan sekitar dua jam. Jalur naik: Cloudflare Queues atau pembagian per kab bersamaan (Q7).

## 7. Titik evakuasi

Masukan: kab, titik asal (GPS perangkat bila ada, kalau tidak titik tengah kecamatan), daftar sumber.

1. Sumber A: baris `titik_pengungsian` kab itu dengan `publik = 1` (Q8).
2. Sumber B: OSM lokal provinsi: `titik_kumpul`, `pemerintahan`, `sekolah`, rumah ibadah (data `ibadah/<prov>.json`), dengan nama tidak kosong.
3. Jarak garis lurus (haversine, fungsi `km` di `src/lapor_tampil.js`). Ambil radius 5 km.
4. Urut: sumber A sebelum B; dalam satu sumber menurut jarak. Hasil tiga titik: nama, jenis, jarak satu desimal km, label sumber ("ditetapkan BPBD" untuk A, "perkiraan dari OpenStreetMap" untuk B), tautan Arah.
5. Tidak ada titik dalam 5 km: kartu menulis "Belum ada titik berkumpul tercatat dalam 5 km. Hubungi BPBD setempat" beserta nomor dari K27.
6. Teks pendamping selalu: "Jarak garis lurus, bukan rute. Tempat ini belum tentu ditetapkan sebagai titik evakuasi."

Tidak ada klaim ketinggian, kerentanan, atau kapasitas titik; data itu tidak ada (Q8). Untuk banjir dan longsor titik tidak disaring menurut bahaya; kalimat pendamping di atas mengatasi hal itu dengan jujur.

## 8. Kunci idempoten pendaftaran

`id` baris = 16 karakter pertama SHA-256 (base64url) dari `endpoint|kec_kode`. Pendaftaran ulang menimpa baris itu (jenis, ambang, bahasa) dan memperbarui `terakhir_aktif`. `ubah` yang mengganti daftar kecamatan menghapus baris endpoint itu yang tidak ada di daftar baru, lalu menyisipkan sisanya dalam satu batch.
