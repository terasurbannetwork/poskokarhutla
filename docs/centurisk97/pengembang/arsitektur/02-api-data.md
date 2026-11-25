# API data terbuka v1

Halaman ini mendokumentasikan API data terbuka v1 dan berkas JSON langsung.

## Halaman dokumentasi API (`/api`)

Akses: publik di host non-produksi. Di `centurisk97.id` halaman ini hanya terbuka untuk pengguna yang sudah masuk (admin atau akun pemirsa); yang belum masuk dialihkan ke `/admin/masuk?ke=%2Fapi` (`src/worker.js:911-918`). Endpoint `/api/v1/*` dan `/mcp` tetap terbuka untuk semua tanpa masuk.

Langkah:

1. Buka `https://centurisk97.id/api` setelah masuk. Halaman memuat tabel data publik, endpoint berkunci, contoh kode, daftar tool MCP, kode galat, dan batas laju (`public/api.html`).
2. Untuk melihat daftar endpoint dalam bentuk mesin, ambil `https://centurisk97.id/api/v1` (tanpa kunci). Jawabannya memuat versi, alamat dokumentasi, dan tiap endpoint beserta ada tidaknya kunci dan cakupan (`src/api_v1.js:82-91`).

## Data JSON terbuka lewat `/api/v1/data/<nama>`

Akses: publik, tanpa kunci, hanya `GET` dan `HEAD`. CORS terbuka (`Access-Control-Allow-Origin: *`) tanpa cookie, sehingga boleh dipanggil dari peramban situs mana pun (`src/api_v1.js:24`).

Langkah:

1. Pilih nama dari daftar putih di bawah.
2. Panggil `GET https://centurisk97.id/api/v1/data/<nama>`. Contoh: `curl "https://centurisk97.id/api/v1/data/meta"`.
3. Baca kolom `dibuat` atau `acuan` di dalam berkas untuk mengetahui umur data. Struktur kolom dijelaskan oleh kunci `kolom` atau `definisi` di tiap berkas.
4. Nama di luar daftar dijawab 404 beserta daftar nama sah.

| Nama | Isi | Pembaruan nominal |
| --- | --- | --- |
| `titik24` | Titik panas 24 jam terakhir, ringkas, dengan kode kompleks | Tiap 3 jam |
| `hotspot24` | Titik panas 24 jam: koordinat, jam relatif, sensor, FRP, keyakinan, indeks wilayah, tanggal WIB | Tiap 3 jam |
| `hotspot72` | Sama dengan `hotspot24`, rentang 72 jam | Tiap 3 jam |
| `meta` | Waktu data terakhir, jumlah titik dan kluster, daftar provinsi | Tiap 3 jam |
| `laporan` | Laporan harian karhutla: luas dan titik tahun berjalan per provinsi | Tiap 3 jam, ditutup malam hari |
| `peta_karhutla`, `peta_karhutla_kab` | Titik panas harian sepanjang tahun, per provinsi dan per kabupaten/kota | Harian |
| `wilayah` | Ringkasan per provinsi: titik harian, kluster, tingkat, FWI maksimum | Tiap 3 jam |
| `kumulatif` | Titik panas kumulatif tahun berjalan dibanding tahun lalu | Harian |
| `musim_harian` | Titik panas per hari per provinsi sejak 2019 | Harian |
| `fwi` | Indeks cuaca kebakaran (FWI) per sel 0,5 derajat | Harian |
| `peringatan` | Peringatan dini cuaca dan gelombang BMKG | Beberapa kali sehari |
| `udara_kualitas` | Prakiraan PM2,5 per provinsi dan kabupaten/kota, dengan jiwa terpapar | Dua kali sehari |

Arti pembaruan: itu jadwal pipeline, bukan jaminan. Jawaban disimpan cache 5 menit (`public, max-age=300, stale-while-revalidate=3600`), sehingga mengambil lebih sering dari sekali per jam tidak berguna (`src/api_v1.js:94-100`).

Hal yang sering disalahpahami:

- `hotspot24` dan `hotspot72` menyimpan baris sebagai larik menurut urutan `kolom`, dengan wilayah berupa indeks ke tabel `wilayah` di berkas yang sama. Baca `kolom` dulu, jangan menebak urutan.
- Titik panas adalah indikasi dari satelit, belum tentu kebakaran. Angka utama dihitung sebagai lokasi unik sekitar 375 m per hari WIB (lihat dokumen 02).
- Nilai `0` berarti sudah dihitung dan hasilnya nol. Berkas atau sumber yang belum ada dijawab 404, bukan 0.

## Berkas JSON langsung di `/data/*.json`

Seluruh isi `public/data` (sekitar 200 entri) dilayani sebagai aset statis tanpa melalui Worker, dengan `Cache-Control: public, max-age=300, stale-while-revalidate=3600` dan CORS terbuka (`public/_headers`, bagian `/data/*`). Contoh: `https://centurisk97.id/data/meta.json`. Direktori lain yang berpola sama: `/banjir/data/*` (cache dan CORS sama), `/geo/*` dan `/lambang/*` (cache 1 hari).

Perlu diketahui:

- Kontrak yang stabil hanya daftar putih `/api/v1/data/*` di atas. Nama dan struktur berkas lain di `public/data` boleh berubah mengikuti kebutuhan layar tanpa pemberitahuan.
- Berkas tertentu sengaja tidak diterbitkan (daftar di `public/.assetsignore`, misalnya data perusahaan bernama dan data tanpa izin penerbitan).
- Data peran terbatas (rumah rusak, bangunan, direktori pakar, dan sejenisnya) tidak ada di `public/`, melainkan di R2 atau D1 di balik sesi atau kunci.

## Riwayat titik panas satu lokasi (`/api/v1/riwayat`)

Akses: publik, batas 600 permintaan per jam per jaringan (`src/api_v1.js:142-151`).

1. Panggil `GET /api/v1/riwayat?lat=-2.21&lon=113.92`. `lat` wajib antara -11,5 dan 6,5, `lon` antara 94,5 dan 141,5.
2. Jawaban memuat `sumber`, `th0`, `sd`, nomor `sel`, dan `data`. Isi `data`: `y` titik per tahun, `yd` titik sampai tanggal `sd`, `m` per bulan, `r` lama episode (hari), `k` episode per tahun, `x` jangkauan (km), `v` pergeseran pusat api, `s` awal dan akhir musim, `nm` persen deteksi malam.
3. Sel tanpa riwayat menjawab `data: null` disertai catatan. Artinya lokasi itu tidak punya 20 titik atau lebih dalam sekitar 16 km sejak 2012, jadi kebakaran di sana tidak biasa. Itu bukan galat dan bukan angka nol.

Riwayat adalah pola masa lalu, bukan prakiraan fisika.

## Firespot per wilayah (`/api/v1/firespot`)

Akses: publik.

1. Panggil `GET /api/v1/firespot?hari=2026-11-04&prov=14`. Kedua parameter opsional: `hari` bawaan hari ini WIB (mundur ke kemarin bila arsip hari ini belum ada), `prov` berupa kode provinsi 2 digit.
2. Tiap baris `wilayah` memuat `prov`, `kab`, `kec`, `firespot`, `cluster_hari`, `cluster_aktif`, `cluster_firespot_aktif`, dan `level_maks` (0 sampai 3). `kab` kosong berarti baris provinsi, `kec` kosong berarti baris kabupaten/kota.
3. Arsip hanya disimpan 8 hari terakhir. Hari di luar arsip dijawab 404.

Firespot adalah titik panas (lokasi unik 375 m) yang disentuh kluster yang lolos uji firespot pada hari itu, dijumlah ke wilayah titiknya (`src/api_v1.js:123-140`).
