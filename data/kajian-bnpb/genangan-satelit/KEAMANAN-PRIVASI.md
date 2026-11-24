# KEAMANAN-PRIVASI: Genangan satelit per kejadian

## 1. Data dan kepekaannya

| Data | Kepekaan | Tempat |
| --- | --- | --- |
| Luas genangan per kab dan kecamatan | rendah (sudah publik di `genangan_nasional.json`) | D1 ringkas, R2 |
| Rentang penduduk di area genangan per kab | sedang (bisa dibaca sebagai angka korban) | D1 ringkas, R2, di balik sesi |
| Sel 110 m tergenang | sedang | R2 di balik sesi |
| Lahan per kelas per kab | rendah | R2 |
| Citra PNG | rendah (citra publik) | R2 di balik sesi (Q1) |
| Bangunan per titik | tidak dibuat (D6) | tidak ada |
| Data orang | tidak ada | tidak ada |

## 2. Hak

Sama dengan Kaji Cepat Siklus (`src/hak.js` bagian Siklus): PD dan KO semua, BP wilayah kab sendiri, tanpa sesi ditolak 401, peran lain 403. Tidak ada hak baru. Ubah status hanya PD dan KO, tarik wajib alasan 3 sampai 300 karakter.

## 3. Ancaman dan penjaga

| Ancaman | Penjaga |
| --- | --- |
| Angka radar dibaca sebagai korban resmi | label `estimasi-model`, pil perkiraan radar, istilah "di area genangan", berdampingan dengan DIBI; tanpa versi publik (Q1) |
| Nol palsu di kab tak teramati | ALGORITMA 1 dan 2; uji T1, T4, T8 menolak 0 tanpa cakupan sah |
| Ingest palsu ke `sk_kaji` | rute `ingest/kaji` yang ada dengan token pipeline; model di daftar `MODEL` |
| R2 membengkak | batas ukuran per berkas (DESAIN-TEKNIS 4), penolakan di Worker |
| Lisensi | atribusi GFM, WorldCover CC BY 4.0, Copernicus Sentinel di kartu Metode dan JSON R2 kaji |
| SSRF lewat URL citra | pipeline yang mengambil citra, bukan Worker |
| Penjelajahan kunci R2 lewat rute berkas | `:nama` dicocokkan daftar izin tetap; kunci R2 disusun server dari baris `sk_kaji`, tidak dari masukan; BP dicek kab4 di nama berkas (DESAIN-TEKNIS 5) |
| BP melihat kab lain dalam kejadian multi-kab | JSON hasil disaring ke `lingkupKab4` sesi sebelum dikirim; sel dan PNG per kab4 (DESAIN-TEKNIS 4) |

## 4. Privasi

Tanpa koordinat bangunan, tanpa nama, tanpa NIK. Sel 110 m menampung puluhan bangunan di kota dan bisa satu rumah di desa; karena itu sel hanya di balik sesi dan tidak pernah ke `public/`.

## 5. Pemeriksa

`security-reviewer` dan `guard-api` untuk perubahan `src/siklus_kaji.js` dan migrasi; `migrasi-idempoten` untuk migrasi.
