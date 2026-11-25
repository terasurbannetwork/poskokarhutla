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

## 6. Versi publik (K4, GS-14)

Bagian ini menggantikan "tanpa versi publik (Q1)" di bagian 3 dan "tidak pernah ke `public/`" di bagian 4 untuk berkas yang disebut di sini. Sisanya (hak staf, JSON R2 kaji, rute berkas) tidak berubah.

| Data | Publik? | Alasan dan penjaga |
| --- | --- | --- |
| Luas tergenang baru, teramati, persen per kab | ya | sudah publik per kecamatan di `genangan_nasional.json`; label perkiraan radar |
| Luas per kecamatan | tidak | tidak ada di daftar putih; kecamatan tetap di staf |
| Lahan per kelas per kab | ya | rendah |
| Penduduk di area genangan | ya, hanya rentang dua ujung per sumber, bila ada | sedang; pil hipotesis, istilah "di area genangan", ditulis bukan korban; tanpa angka tunggal; kab tanpa angka tidak diberi 0 |
| Sel genangan 110 sampai 1.100 m (GeoJSON) | ya | hanya pusat sel dan `ha`; GeoJSON yang membawa properti lain ditolak pembuat; sel sebesar itu tidak menunjuk bangunan |
| Citra PNG Sentinel (radar, warna asli, SWIR) | ya | data terbuka Copernicus; atribusi di kartu Metode dan JSON |
| Titik atau sel per bangunan | tidak | tidak dibuat (D6) |
| Data orang, akun, ringkas akun BPBD, sidik, id adegan | tidak | tidak ada di daftar putih |
| Alasan kab tak sah | ya, satu kalimat pendek | bukan data orang |

Penjaga mesin: daftar putih di `scripts/banjir/genangan_terbit.py`, `kunci_terlarang`, daftar izin nama berkas, anggaran ukuran, uji `tests/banjir/genangan_kejadian.test.mjs` (invarian JSON publik, tanpa kunci terlarang, kab tak sah tanpa angka). Layar menulis teks lewat `esc`, jadi isi JSON tidak dieksekusi sebagai HTML.

Atribusi wajib tampil: Copernicus Emergency Management Service GFM, ESA WorldCover (CC BY 4.0), "Contains modified Copernicus Sentinel data", dan Google Open Buildings (CC BY 4.0) hanya bila penduduk tampil. Berkas kejadian uji (`KJ-UJI-*`) tidak pernah di-commit atau diterbitkan; di mesin pengembang keluarannya dikecualikan lewat `.git/info/exclude`.
