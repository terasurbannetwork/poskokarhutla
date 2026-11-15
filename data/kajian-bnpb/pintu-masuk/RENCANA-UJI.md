# RENCANA-UJI: Satu Pintu Masuk

Semua perilaku di sini tinggal di luar TypeScript (D1, rute, cookie, batas laju), jadi buktinya uji integrasi yang benar-benar menjalankan Worker dan D1 lokal dengan pola `tests/warga/*.test.mjs`. Uji bermock tidak dihitung sebagai bukti.

## 1. Uji integrasi (`tests/warga/masuk*.test.mjs`)

| No | Kriteria terima | Tiket |
| --- | --- | --- |
| U-1 | Minta kode menulis satu baris `mk_kode` dan satu baris `wa_antre` berjenis `otp`; kode tidak ada di jawaban API | PM-03 |
| U-2 | Kode benar menerbitkan `sesi_masuk`; kode yang sama dipakai dua kali ditolak; dua periksa serentak hanya satu yang berhasil | PM-03 |
| U-3 | Kode salah enam kali: kode hangus dan kode benar pun ditolak | PM-03 |
| U-4 | Jawaban minta kode untuk nomor dikenal dan tidak dikenal sama isi dan statusnya | PM-03 |
| U-5 | Batas laju: kode keempat dalam 15 menit untuk satu nomor ditolak 429; batas global ditolak 429 | PM-03 |
| U-6 | Tanpa `MASUK_KUNCI`, `TURNSTILE_SECRET`, atau `TURNSTILE_SITEKEY`: 503, tidak ada baris ditulis | PM-03 |
| U-7 | Tabel `mk_*` belum ada: 503 dengan pesan migrasi; pintu sandi lama tetap 200 | PM-03 |
| U-8 | Tanpa header `x-pb` atau dengan `Origin` situs lain: semua `POST /api/masuk/*` ditolak; form `text/plain` lintas situs ditolak | PM-03 |
| U-9 | Tanpa `cf-connecting-ip`: minta kode ditolak | PM-03 |
| U-10 | Gerbang menarik `otp` sebelum jenis lain; `otp` berumur lebih dari 5 menit tidak ditarik; lapor terkirim menghapus barisnya; pembersihan menghapus `otp` lama | PM-04 |
| U-11 | Denyut gerbang: dua tarikan dalam 60 detik hanya satu tulis ke `mk_denyut`; denyut lebih dari 5 menit membuat `/api/masuk/saya` melaporkan saluran WA terganggu | PM-04 |
| U-12 | `/masuk` dan `/alun-alun` menjawab 200 untuk tamu; `/`, daftar relawan, dan halaman lain tetap 303 | PM-05 |
| U-13 | Nomor yang sama dengan `instansi_akun.wa` aktif mendapat cookie instansi (dua Path) yang diterima rute `/api/instansi/*` | PM-06 |
| U-14 | Akun berstatus tidak aktif, atau akun yang nomornya berbeda dari nomor terbukti, tidak mendapat sesi | PM-06 |
| U-15 | Nomor dengan dua akun mendapat dua sesi dan daftar dua ruang | PM-06 |
| U-16 | Relawan dan petugas: sesi bernomor sama membuka profil ringkas dan logbook; rute wajah, absen, dan data kesehatan menolak tanpa `x-kode`; dua baris bernomor sama tidak dibuka; status di luar `STATUS_RELAWAN_SAH` tidak dibuka; tautan kode lama tetap diterima | PM-06 |
| U-17 | Keluar mencabut `mk_sesi` dan tiap sesi peran; cookie instansi dihapus di kedua Path | PM-06 |
| U-18 | Staf tidak mendapat `sesi_staf` sebelum sandi benar; sandi salah menaikkan hitungan gagal staf | PM-07 |
| U-19 | Tidak ada rute `/api/masuk/*` yang pernah menerbitkan `sesi_admin` | PM-07 |
| U-20 | Nomor baru membuat `mk_akun` sesudah lengkapi; tanpa persetujuan ditolak | PM-08 |
| U-21 | Tautan "Masuk" di `/admin/masuk`, `/instansi`, `/pendataan`, `/kemitraan` menuju `/masuk`; form sandi lama tetap berfungsi | PM-08 |
| U-22 | Permohonan anggota dengan nomor di `kontak_pemangku` aktif, kategori dan wilayah cocok, akun tujuan aktif: anggota aktif berjalur `kontak` | PM-09 |
| U-23 | Nomor ajudan, kontak menunggu, wilayah beda, atau akun tujuan belum aktif: anggota berstatus menunggu; tidak ada baris `instansi_akun` yang dibuat atau diubah | PM-09 |
| U-24 | Akun pendataan milik nomor yang cocok kontak kategori `bnpb` berpindah dari menunggu ke aktif | PM-09 |
| U-25 | Email yang domainnya ada di `mk_domain` untuk akun itu dengan kode sah: anggota aktif; `.go.id` atau `.ac.id` tanpa peta ditolak; akhiran dicocokkan berbatas titik (`xgo.id` ditolak) | PM-10 |
| U-26 | Undangan sah mengaktifkan anggota saat kode sah; undangan dicabut atau lewat 14 hari tidak | PM-11 |
| U-27 | Undangan ke tabel `staf`, ke akun lain, atau ke akun tidak aktif ditolak; undangan ke-21 dalam sehari dan ke-101 terbuka ditolak | PM-11 |
| U-28 | Pesan undangan hanya memuat templat dan nama lembaga dari basis data; nama ketikan pengundang tidak masuk pesan | PM-11 |
| U-29 | Papan aktivasi: angka per kabupaten cocok dengan isi tabel uji; tamu dan anggota instansi ditolak | PM-12 |
| U-30 | Atur sandi ditolak bila `kode_pada` lebih dari 15 menit, ditolak untuk staf, ditolak untuk anggota yang bukan pemilik nomor akun; berhasil mencabut sesi lain akun itu | PM-13 |
| U-31 | Hapus akun umum membuang `mk_akun`, `mk_sesi`, `mk_anggota`, `alun_penulis`; kiriman tetap ada tanpa nama | PM-14 |
| U-32 | Anggota yang 180 hari tidak masuk diperiksa ulang; tidak lolos menjadi menunggu | PM-14 |
| U-33 | Kiriman alun-alun dari akun yang masuk menulis `alun_penulis`; tamu tetap bisa menulis tanpa baris itu; rute contoh alun-alun sudah tidak ada | PM-15 |
| U-34 | Kode lewat email: jawaban sama untuk semua alamat; email hanya terkirim bila alamat sama dengan email akun bernomor itu | PM-16 |
| U-35 | Nomor di `mk_pemirsa_wa` milik pemirsa aktif mendapat `sesi_pemirsa` dan hanya tab yang diizinkan; pemirsa yang diputus tidak; hanya Super Admin yang bisa mengisi nomor pemirsa | PM-06 |

## 2. Gerbang (`tests/agen/gerbang-pintu-masuk.test.mjs`)

| No | Yang dijaga |
| --- | --- |
| G-1 | Tidak ada `console.log` atau `console.error` yang memuat variabel kode di `src/masuk*.js` |
| G-2 | `src/masuk*.js` tidak mengimpor `src/wa.js` (pembaca WA masuk) |
| G-3 | Berkas paket ini tidak punya rute atau tombol isi dan hapus data contoh |
| G-4 | `PUBLIK_TANPA_SESI` hanya bertambah jalur yang tertulis di KEPUTUSAN K8 (`/masuk`, `/alun-alun`); tiap entri baru membawa alasan |
| G-5 | Berkas uji tidak memuat nomor WA selain awalan `62800` |
| G-6 | Semua ambang ALGORITMA hanya ada di `src/masuk_konst.js` |
| G-7 | `src/masuk*.js` tidak menulis ke `staf`, `instansi_akun`, atau tabel sesi modul lain |

Tiap gerbang punya uji mode gagal (contoh pelanggaran yang benar-benar ditolak).

## 3. Uji layar

| No | Yang diperiksa | Cara |
| --- | --- | --- |
| L-1 | `/masuk` di 390 px dan 1280 px tanpa geser mendatar; isi otomatis kode jalan | tinjau lokal `http://localhost:8800/masuk` |
| L-2 | Papan aktivasi: urut dan saring tidak membekukan layar | `inp-reviewer` |
| L-3 | Angka dan tanggal berformat Indonesia | `selera-angka` |
| L-4 | Kepala situs, kartu, dan pil sesuai DESIGN-SYSTEM | `gerbang-kartu-std`, tinjau pemilik |

## 4. Uji di produksi sesudah migrasi (dijalankan pemilik atau atas izinnya; PM-16)

| No | Langkah | Lulus bila |
| --- | --- | --- |
| P-1 | Minta kode ke nomor pemilik | pesan tiba di bawah 30 detik |
| P-2 | Masuk dengan nomor akun instansi aktif | tiba di `/instansi` tanpa sandi |
| P-3 | Masuk dengan nomor staf | diminta sandi |
| P-4 | Matikan gerbang 6 menit | `/masuk` menulis kode WA terganggu |
| P-5 | Baca D1 sehari sesudah jeda tarik 5 detik | di bawah 100 ribu baris per hari dari tarikan |

## 5. Perintah bukti

```bash
npm run uji:warga
```

```bash
npm run uji:agen
```

Tiket dianggap selesai bila uji bernomor miliknya hijau, kedua perintah di atas hijau, dan pemeriksa bersih (bukan pengerjanya) sudah melapor.
