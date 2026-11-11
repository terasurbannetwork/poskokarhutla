# KEAMANAN-PRIVASI: Pantauan Operasi Udara

## 1. Kelas data

| Data | Kelas | Tempat | Siapa boleh baca |
| ---- | ----- | ------ | ---------------- |
| Status armada, aksi, renlap, temuan pilot, foto dokumentasi | operasional internal | D1 `op_*`, R2 foto | staf berperan `PERAN_BACA`, moderator, akun gerbang (sama dengan `/api/operasi/peta`) |
| Jejak ADS-B | publik di sumbernya, tetapi dirangkai jadi gerak operasi | D1/R2 sesuai `src/operasi_udara.js` | sama dengan di atas |
| PDF renlap (F-15) | operasional internal | R2 `operasi/renlap/<tanggal>/<versi>/<BASE>.pdf` | sama dengan di atas (Q12) |
| Renlap JSON/TXT | **saat ini publik** | `public/data/operasi/renlap_<tanggal>_<versi>.json/.txt` (22 berkas: target dan koordinat) | siapa pun; menutup PDF tidak melindungi isi yang sama. Q12 memutuskan apakah berkas ini dipindah ke R2 di balik sesi |
| Kontrak, jam operasi | internal | `public/data/operasi/rekap_udara.json` (tanpa nama kru) | sudah publik di aset statis; tidak menambah kolom biaya ke berkas publik |
| Harga kontrak, biaya per jam (F-20) | **rahasia anggaran** | belum ada; bila Q7 mengizinkan: R2 di balik sesi, bukan `public/data` | ditentukan Q7 |
| Jam kerja kru (F-17) | personal teragregasi | dihitung per pesawat per hari | tanpa nama, NIK, nomor HP kru |
| Insiden dan nyaris celaka (F-18) | sensitif keselamatan | belum dibangun (Q5) | ditentukan Q5 |

## 2. Aturan tetap

1. **Nama kru dan pilot tidak pernah disimpan.** Pesan WA yang menyebut nama diurai tanpa menyimpan nama (`catatOperasi`).
2. **Tidak ada data operasi di `public/data` yang belum ada sekarang** (kecuali prakiraan cuaca per base `prakiraan_base.json`, yang berisi cuaca bandara publik, bukan gerak armada). Angka baru (respons, kepatuhan, hasil per kabupaten) dihitung di Worker dari D1 dan dilayani lewat rute berhak baca, atau dihitung di klien dari data yang sudah dibaca.
3. **Unggahan mesin** (PDF renlap) hanya dengan `Authorization: Bearer WA_MESIN`, dibandingkan lewat hash (pola `bacaMesin` di `src/operasi_udara.js` dan `src/jarak_pandang.js`).
4. **Validasi unggahan PDF:** tipe `application/pdf`, tanda tangan berkas `%PDF-`, ukuran ≤ 15 MB, tanggal `YYYY-MM-DD` sah, versi `pagi|malam`, kode base ada di `op_base` atau `SEMUA`. Nama kunci R2 disusun server, tidak dari nama berkas kiriman.
5. **Rute baca PDF** mengembalikan `content-disposition: attachment`, `cache-control: private, no-store`, `x-content-type-options: nosniff`.
6. **Tinjau lokal** (`localhost:8800`) meneruskan cookie sesi produksi: hanya mendengar di loopback, login diketik pemilik sendiri; Claude tidak mengetik sandi produksi.
7. **Tautan luar** (Google Maps, berkas unduhan) dibuka dengan `rel="noopener noreferrer"`; koordinat tidak dimasukkan ke parameter yang membawa data pribadi.
8. **Kuota D1** (memori `d1-kuota-baca`): rute baru membaca dengan batas baris dan rentang tanggal maksimal 31 hari, tanpa kueri terjadwal tambahan per menit.

## 3. Ancaman dan penangkal

| Ancaman | Penangkal |
| ------- | --------- |
| Orang luar mengunggah PDF palsu sebagai renlap | Bearer `WA_MESIN`, cek tanda tangan PDF, base harus ada |
| Pengguna tamu membaca renlap atau gerak armada | Rute baca memakai pemeriksa hak yang sama dengan `/api/operasi/peta`; tamu 403 |
| Cache CDN menyimpan PDF untuk orang lain | `cache-control: private, no-store`, `vary: cookie` |
| Penamaan berkas memecah jalur R2 (`../`) | kunci R2 disusun dari nilai tervalidasi saja |
| XSS dari lokasi atau alasan target renlap | semua teks lewat `esc()`/`xml()` sebelum masuk HTML atau KML/GPX |
| Angka biaya bocor ke berkas statis publik | biaya tidak pernah ditulis ke `public/` (gerbang di RENCANA-UJI §2) |

## 4. Pengulas wajib

Rute Worker baru dan unggahan: `guard-api` + `security-reviewer`. Migrasi D1 bila ada: `migrasi-idempoten`. Layar: `selera-angka` + `inp-reviewer`.
