# KEAMANAN-PRIVASI

Repo ini publik. Tidak ada data asli, secret, atau nomor kontak di berkas paket ini maupun di `public/`.

## 1. Data

| Data | Sifat | Penanganan |
| --- | --- | --- |
| KIB | Identitas kejadian, bukan data pribadi | Boleh di layar berhak; tidak di URL publik |
| Catatan meja tertaut | Angka dampak, nilai rupiah, nama barang, teks bebas pendek | Sudah diatur Meja Kerja; rantai tidak menyalin |
| Cap waktu SPM | Waktu operasi, tanpa nama personel | Tidak ada kolom nama petugas operasi |
| Jangkar kalender | Tanggal dan nomor surat (SPPH, PHD) | Nomor surat teks ringkas, tanpa lampiran |
| Identitas pelapor pengaduan | Data pribadi | Rantai menolak tautan meja `pengaduan` (trigger dan validasi); tidak pernah masuk ringkasan |
| Pengungsi | Agregat per tempat | Rantai hanya menautkan, tidak membaca isi |

Tidak ada kolom nama orang, NIK, telepon, atau alamat baru. Teks bebas (`alasan`, `ket`, `rujukan`) dibatasi panjang dan dibersihkan seperti Meja Kerja; awalan `=`, `+`, `-`, `@` ditolak atau dinetralkan di ekspor CSV (pola T4 LogPal).

## 2. Hak

| Peran | Rantai | Kalender | Rapor SPM |
| --- | --- | --- | --- |
| Publik | tidak ada | tidak ada | tidak ada |
| Petugas BPBD berkode | kabupatennya; menautkan catatan miliknya | kabupatennya; isi jangkar dan "terpenuhi" menurut Q5, Q6 | tidak melihat blok lintas kabupaten; kabupatennya sendiri bila Q13 memutuskan |
| Staf berperan | wilayah perannya (Q1) | wilayah perannya | wilayah perannya |
| Admin moderator ke atas | semua; tandai tidak berlaku | semua | semua |
| Super Admin | dummy | dummy | dummy |

Aturan lintas wilayah: KIB atau catatan di luar `prov|kab` pemanggil dijawab sama dengan "tidak ditemukan", supaya KIB wilayah lain tidak bisa ditebak (pola `cariInduk` di `src/logbook.js`). Daftar rantai untuk petugas disaring di server, bukan di klien.

## 3. Rute dan masukan

- Semua `POST` lewat `bacaBody` berbatas ukuran, validasi tipe dan panjang, batas laju `laju()`, dan jejak `pantau_jejak` (siapa, apa, kapan) dalam satu batch dengan tulisnya (`tulisJejak`).
- Semua pernyataan SQL memakai `.bind()`; kolom dari daftar putih di `src/hak.js`.
- Respons galat tidak membocorkan isi kejadian wilayah lain.
- Penolakan tautan ke `pengaduan` dijaga trigger D1 dan diuji dengan D1 sungguhan, bukan mock.
- HTML layar memakai `textContent`; teks dari catatan meja tidak pernah disisipkan sebagai HTML.
- Rapor SPM tidak masuk `/api/meja/rapor/publik` dan tidak di-cache tepi (`cacheTepi`) kecuali untuk blok tanpa data wilayah.

## 4. Dummy

Baris dummy bertanda `dummy = 1`, diberi nama kabupaten contoh, tidak muncul di rute publik, dan dihapus tuntas oleh pasangan fungsi hapus. Gerbang dummy memeriksa jejak dan cakupan tabel baru.

## 5. Pemeriksaan

`security-reviewer` dan `guard-api` memeriksa `src/rantai.js` dan perubahan `src/meja.js`; `migrasi-idempoten` memeriksa tiga migrasi; `selera-angka` memeriksa kartu angka (aturan n < 5, label asumsi, satuan); `inp-reviewer` memeriksa handler klik dan tab. Mereka melapor, tidak memperbaiki.
