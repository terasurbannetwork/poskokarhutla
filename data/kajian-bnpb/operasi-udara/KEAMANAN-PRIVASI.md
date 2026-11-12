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

## 5. Isian manual (K12)

| Data | Kelas | Tempat | Siapa boleh tulis | Siapa boleh baca |
| ---- | ----- | ------ | ----------------- | ---------------- |
| Gelar armada, sortie, hasil, temuan, armada | operasional internal | D1 `op_*` | `pusdalops`, moderator (K14) | `PERAN_BACA` |
| Kontrak tanpa harga | internal | D1 `op_kontrak` | `pusdalops`, moderator | `PERAN_BACA` |
| Personel darat per provinsi | internal teragregasi, tanpa nama | D1 `op_personel` | `pusdalops`, moderator | `PERAN_BACA` |
| Foto unggahan | operasional internal | R2 `operasi/foto/` + D1 `op_foto_unggah` | sama | `PERAN_BACA`, lewat rute baca berkas (pola `fotoBerkas`) |
| Riwayat isian (siapa mengubah apa) | jejak audit | D1 `op_isian_log` | Worker saja | `PERAN_BACA` |

Aturan tambahan:

1. **Pengisi dicatat sebagai `staf:<id>` atau `admin:<hash12>`**, bukan nama atau nomor HP; akun gerbang `AKUN_SITUS*` (pembaca pimpinan) tidak pernah bisa menulis (`modOK`, bukan `adminOK`); nama staf diambil saat tampil dari tabel staf yang sudah ada.
2. **Nama kru tetap haram**: formulir menampilkan peringatan "tanpa nama kru" di kolom bebas (`alasan`, `lokasi`, `ket`, `catatan`), dan kolom itu dibatasi panjangnya. Pengurai WA sekarang tidak punya pemeriksa pola nama otomatis yang bisa dipakai ulang; pemeriksa seperti itu belum dirancang dan tidak diklaim ada.
3. **Validasi di Worker**, bukan di layar: tanggal sah dan tidak di depan, koordinat di BBOX Indonesia, `registrasi` dan `base_id` harus ada di `op_armada`/`op_base` (kecuali formulir armada yang membuat baru), angka dalam rentang skema, teks dipangkas dan dibatasi panjangnya.
4. **Foto**: cek tanda tangan berkas (JPEG `FF D8`, PNG `89 50 4E 47`, WEBP `RIFF....WEBP`), SVG/GIF/HEIC ditolak, ≤ 8 MB dengan penjaga `Content-Length` sebelum `formData()`; koordinat dan jam WAJIB dari EXIF GPS (K18), foto tanpa GPS ditolak; EXIF menyimpan lokasi pemotret, jadi berkas hanya dibaca lewat rute berhak baca. Metadata lain BELUM dibuang (berkas disimpan apa adanya, sama dengan `src/foto.js`); kunci R2 disusun server; rute baca sendiri dengan `nosniff` dan `CSP sandbox` (DESAIN-TEKNIS §7.7).
5. **CSRF**: sudah dijaga terpusat di `src/worker.js` (POST bercookie `sesi_staf`/`sesi_admin` wajib Origin sama-situs); rute baru tidak boleh dikecualikan dari pemeriksaan itu, dan rute tulis hanya menerima `application/json` atau `multipart/form-data`.
6. **Tidak menulis ke `public/`**: isian manual tidak pernah memicu berkas statis; layar membaca lewat rute berhak baca.

| Ancaman | Penangkal |
| ------- | --------- |
| Pimpinan atau akun baca mengubah data | hak tulis terpisah `PERAN_TULIS` + `modOK`; akun gerbang `AKUN_SITUS*` 403; uji 403 |
| Bot menimpa koreksi staf | aturan §7.4 DESAIN-TEKNIS, uji pemutaran ulang |
| Isian massal merusak data | batas laju per staf, riwayat sebelum-sesudah, hapus lunak |
| Berkas berbahaya menyamar foto | cek tanda tangan, tipe dibatasi, `nosniff`, `attachment` tidak dipakai untuk pratinjau tetapi `content-type` dari tabel |

Pengulas: `guard-api` + `security-reviewer` untuk `src/operasi_isian.js`; `migrasi-idempoten` untuk 0126.
