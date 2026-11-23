# DESAIN-TEKNIS: Lapor tanpa sinyal

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `public/sw-lapor.js` (baru) | Service worker cangkang `/lapor/`; tanpa menyentuh POST | `layar-peta` |
| `public/inti/luring_spek.js` (baru) | Spek luring bersama klien dan Worker (jenis, waktu, korban, batas teks, batas foto); skrip klasik dan dimuat Worker seperti `pipa/formulir.js` | `inti-layar` |
| `public/lapor/luring.js` (baru) | Deteksi koneksi, kartu Siapkan, formulir luring, penyimpanan butir, pita; dimuat `index.html` | `layar-peta` |
| `public/lapor/luring.css` (baru) | Gaya komponen DESIGN-SYSTEM, hanya token | `layar-peta` |
| `public/lapor/lapor.js` | Titik masuk: pilih jalur (ALGORITMA 1), `bukanKamera` diekspor ke luring.js; perubahan sekecil mungkin | `layar-peta` |
| `public/inti/antre.js` | Tidak diubah, kecuali bila uji LR-05 membuktikan perlu satu opsi tampilan `label` (lihat 4) | `inti-layar` |
| `src/lapor_mesin.js` | Fungsi murni `bentukLuring` (ALGORITMA 4) | `warga-api` |
| `src/lapor_luring.js` (baru) | Rute `POST /api/lapor/luring`, validasi, lencana foto, idempotensi | `warga-api` |
| `src/lapor_ai.js` | Satu baris pemetaan rute ke `src/lapor_luring.js`; foto luring memakai pengunggah baru (2.2) | `warga-api` |
| `scripts/lapor/lokal.mjs` | Salinan rute luring dan penyedia `sw-lapor.js` tanpa SW cache untuk tinjau | `layar-peta` |
| `migrations/<nomor>_lapor_luring.sql` (baru) | `lapor_luring`, `lapor_foto_luring`; nomor diambil saat tiket dikerjakan (terakhir 0162 pada 21 Nov 2026) | `warga-api` |
| `public/lapor/manifest.webmanifest` (baru, Q11) | Nama, ikon, `start_url: /lapor/`, `display: standalone` | `layar-peta` |
| `tests/lapor/luring_*.test.mjs`, `tests/agen/gerbang-lapor-luring.test.mjs` | RENCANA-UJI | `penulis-gerbang` |

## 2. Service worker

### 2.1 Cakupan dan cangkang

- Didaftarkan dari `luring.js` dengan `navigator.serviceWorker.register("/sw-lapor.js", {scope: "/lapor/"})`. Bila URL kanonik halaman adalah `/lapor` tanpa garis miring, tiket LR-01 memverifikasi bahwa pengalihan ke `/lapor/` terjadi dan scope menjangkaunya; **jangan** memakai scope `/lapor` (juga menjangkau `/laporan-bnpb` dan sejenisnya). Bila perlu, tambahkan header `Service-Worker-Allowed`.
- Cangkang disimpan saat pasang: `/lapor/`, `lapor.js`, `lapor.css`, `luring.js`, `luring.css`, `maskot.js`, `ilustrasi.js`, `edukasi.json`, `lambang-bnpb.png`, `luring_spek.js`, `antre.js`, ikon, daftar kab/kota, nomor penting, berkas pesan tetap. URL persis sama dengan yang dimuat halaman (termasuk `?v=`), seperti `sw-lapangan.js`.
- Strategi: halaman network-first dengan batas 4 detik lalu simpanan; berkas ber-`?v=` cache-first; tanpa `?v=` stale-while-revalidate. Konstanta `VERSI`; versi lama dihapus saat aktif.
- **Hanya GET.** POST ke `/api/lapor/*` tidak pernah disentuh SW; kegagalannya ditangani antre.js. GET `/api/lapor/*` (daerah, penting, sesi) tidak disimpan SW kecuali `GET /api/lapor/penting` (nomor penting, tidak berisi data pribadi), supaya tidak ada data pelapor di cache SW.
- Ukuran: total cangkang diukur di LR-01 (lapor.js 163 KB, lapor.css 188 KB, ditambah yang lain) dan dilaporkan; batas ukur HIPOTESIS 2 MB tanpa foto.

### 2.2 Pengiriman butir

Antre.js memanggil `kirim(badan)` yang diberikan saluran `lapor`:

```
saluran("lapor", {
  umurMs: 14 * 86400000, langsung: true,
  media: {unggah: (blob, butir) => unggahFotoLuring(blob, butir)},   // POST /api/lapor/luring/foto, kunci = klien_id butir foto
  kirim: badan => fetch("/api/lapor/luring", POST, {butir: badan[0]})
})
```

Foto memakai rute baru `POST /api/lapor/luring/foto` (satu foto per permintaan, JPEG ke R2 `lapor/luring/<klien_id_foto>.jpg`, tanpa memeriksa status sesi) karena `/api/lapor/foto` hanya menerima foto saat sesi chat berstatus `foto`. Rute ini membuang EXIF dengan `bersihMedia` seperti rute lama dan mencatat baris `lapor_foto_luring`.

Antre.js menyimpan satu blob per butir, jadi satu laporan dengan 3 foto menjadi 4 butir: tiga butir foto (`saluran "lapor"`, `data.jenis_butir = "foto"`, `data.kelompok = <klien_id laporan>`, `data.exif`, `data.gps`) lalu satu butir laporan yang dibuat paling akhir (jam `dibuat` lebih besar) dan memuat `foto: [klien_id foto]`. Antre.js mengirim terlama dulu, jadi foto mendahului laporan. Worker mencocokkan `foto` lewat `klien_id`; foto yang ditolak (ditandai ditolak dan dilewati antre.js) tidak ada barisnya dan laporan terbit tanpa foto itu, dengan alasan di jawaban. Butir foto dan laporan dibuat dalam satu langkah simpan; bila salah satu gagal ditulis, yang sudah tertulis dibuang (tanpa butir yatim). Pita menghitung satu laporan, bukan empat (LR-05 menyaring butir `jenis_butir = "foto"` lewat label kosong atau pita sendiri bila antre.js tidak mendukung penyaringan). Alternatif satu gambar tersusun ditolak karena merusak EXIF per foto.

## 3. Rute Worker

| Rute | Gerbang | Isi |
| --- | --- | --- |
| `POST /api/lapor/luring` | `identitasSah` sebelum membaca badan; badan paling 16 KB; `kuota` aksi `lapor.luring` (10 per jam per nomor, per IP, per perangkat); `MAKS_TERKIRIM_HARI` | Validasi spek luring, `bentukLuring`, simpan sesi, tiket, antre PDF, jawab `{nomor, lacak, diterima}` |
| `POST /api/lapor/luring/foto` | `identitasSah`; badan paling 3,5 MB; kuota `lapor.luringfoto` 30 per jam | JPEG sah, buang EXIF, simpan R2, catat `lapor_foto_luring` |

Keduanya didaftarkan di tabel rute `src/lapor_ai.js` dan disalin ke `lokal.mjs`; gerbang kesejajaran di RENCANA-UJI bagian 7.

## 4. Antre.js: yang dipakai tanpa diubah

- `PbAntre.saluran("lapor", ...)` dan pita (`pasangPita`); `klien_id` dan `waktu_klien`; blob dua tahap; mundur eksponensial; 401 menahan butir; 413 membelah gugus (tak relevan, `batch: 1`).
- **Risiko tampilan:** kolom "Isi" di pita adalah tiga nilai teks pertama `data`. Karena itu `data.label` selalu kunci pertama dan tidak memuat lokasi atau nomor; gerbang LR-05 menguji urutan kunci. Bila ternyata `Object.values` tidak cukup (kunci angka dinaikkan), tambahkan opsi `o.ringkas(data)` ke antre.js lewat tiket terpisah ke `inti-layar` dan uji `tests/inti/antre.test.mjs`.
- Satu-satunya berkas pemegang `indexedDB.open` tetap `antre.js` (gerbang keterpaduan). `luring.js` dan SW tidak membuka IndexedDB sendiri. Cangkang SW tidak membaca antrean.

## 5. Tabel D1

```
lapor_luring(
  klien_id TEXT PRIMARY KEY,
  wa_hash TEXT NOT NULL,            -- sha256 nomor, bukan nomor terang
  sesi_id TEXT, nomor TEXT,         -- laporan yang terbit; NULL bila belum selesai
  waktu_klien INTEGER NOT NULL, waktu_terima INTEGER NOT NULL,
  jam_selisih_ms INTEGER, jam_status TEXT,          -- terverifikasi, bergeser, belum
  keputusan TEXT NOT NULL,          -- diterima, ditolak
  alasan TEXT
)
lapor_foto_luring(
  foto_id TEXT PRIMARY KEY, klien_id TEXT NOT NULL,
  lencana TEXT NOT NULL,            -- gps_luring, exif_luring, tanpa
  tanda_jam TEXT, waktu_ambil INTEGER, jarak_gps_exif_m INTEGER
)
```

`CREATE TABLE IF NOT EXISTS`, tanpa `ALTER` dan tanpa trigger (pola paket induk untuk tabel samping). Indeks `lapor_luring(wa_hash, waktu_terima)`. Nomor terang tetap hanya di sesi laporan seperti saat ini. `lapor_luring` dibuang bersama sesi saat hapus data (A7 paket induk).

## 6. Sinkron dengan `lokal.mjs`

`scripts/lapor/lokal.mjs` menyalin rute. Tiap rute baru ada di keduanya dan gerbang `gerbang-lapor-luring` membandingkan daftar rute Worker lawan lokal. Server lokal menyajikan `sw-lapor.js` dengan `Cache-Control: no-store` supaya tinjau tidak tersangkut versi lama.

## 7. Versi dan kompatibilitas

`luring_spek.js` membawa `VERSI_SPEK`. Butir membawa `spek`. Worker menerima versi sekarang dan satu versi sebelumnya; yang lebih lama ditolak 4xx berisi "Perbarui halaman" dan butir ditahan (warga menyusun ulang). Naikkan `VERSI` SW bila cangkang berubah.
