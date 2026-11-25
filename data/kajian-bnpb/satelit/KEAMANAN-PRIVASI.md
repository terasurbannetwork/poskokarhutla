# KEAMANAN-PRIVASI: Pemantauan satelit

## 1. Data dan kepekaannya

| Data | Kepekaan | Tempat |
| --- | --- | --- |
| L1b Himawari, FIRMS, TROPOMI, GFM, VHI | rendah (data publik) | tidak disimpan mentah; hanya turunan |
| Titik panas Himawari per pindaian | rendah sampai sedang (bisa dibaca sebagai tuduhan pembakaran lahan tertentu) | R2, layar staf; publik hanya sesudah Q7 |
| Piksel abu, konveksi, kawah, SO2 | rendah | R2, `public/*/data` ringkasan |
| Genangan harian per kab | rendah | R2 di balik sesi (Q10) |
| Baris alarm D1 | sedang (memicu tugas api) | D1, hanya sumber ber-vonis lolos |
| Label Dalops | sedang | `data/raw/label/` lokal, di-gitignore; tidak ke `public/` |
| Data orang | tidak ada | tidak ada |

## 2. Ancaman dan penjaga

| Ancaman | Penjaga |
| --- | --- |
| Deteksi model dibaca sebagai status resmi | pil hipotesis, kartu status resmi terpisah di atas (D9), kosakata D15; tanpa alarm ke luar sebelum vonis (D8) |
| Diam saat sumber mati (kejadian 18 Nov) | `status_sumber` wajib (D3), uji ST-01 menolak keluaran tanpa medan itu |
| Nol palsu (awan, di luar lintasan, sumber putus) | `awan_persen` dan status per kab wajib; uji layar menolak 0 tanpa status `ok` |
| Tuduhan pelaku dari titik panas | tanpa nama lahan, konsesi, atau pemilik di keluaran satelit; tanpa kata "pelaku", "penyebab" |
| Ambang disetel sesudah melihat data uji | kriteria dan sidik sebelum uji (D5), `prasyarat` menolak sidik tak cocok |
| Pemicu dispatch disalahgunakan | dispatch hanya dari cron Worker, host S3 tetap (bukan masukan), `GITHUB_TOKEN` yang sudah ada dengan cakupan `actions:write` saja; tanpa rute HTTP publik baru |
| SSRF | Worker hanya memanggil `noaa-himawari9.s3.amazonaws.com` dan API GitHub; alamat disusun dari waktu, tidak dari masukan |
| Kebocoran token | `EARTHDATA_TOKEN` hanya ke host OPeNDAP, redirect ditolak (pola `tropomi.py`); `FIRMS_MAP_KEY` tidak dicetak; tidak ada secret di berkas yang dilacak |
| Kuota baca D1 Free (pernah menjatuhkan situs, 28 Okt) | tanpa kueri D1 per pindaian kecuali sisip alarm lolos; layar membaca R2 |
| R2 membengkak | batas ukuran per berkas (DESAIN-TEKNIS 4), anggaran Q5, retensi 13 bulan |
| Lisensi dan atribusi | JMA lewat NOAA ODD (Q7 dicek di ST-00), FIRMS (NASA LANCE), TROPOMI (Copernicus Sentinel-5P), GFM (Copernicus EMS), NOAA STAR VHI; ditulis di Metode dan JSON |

## 3. Hak

Tidak ada peran atau hak baru. Layar staf memakai sesi dan hak layar yang sudah ada; BP hanya wilayah kab sendiri lewat layar yang sudah menyaringnya. Data satelit publik tidak mengubah hak.

## 4. Pemeriksa

`guard-api` dan `security-reviewer` untuk `src/satelit_picu.js`, `src/alarm_himawari.js`, `src/himawari.js`; `migrasi-idempoten` untuk migrasi `alarm_himawari`; `validasi-model` untuk tiap vonis; `selera-angka` dan `inp-reviewer` untuk kartu.
