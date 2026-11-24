# Ringkasan Blueprint

:::kalimat
Blueprint ini merinci rancangan teknis sistem pemantauan kabar kebencanaan: sumber dan penariknya, bentuk data, langkah pengolahan, model sinyal kejadian, dashboard, notifikasi, keamanan, dan ukuran keberhasilan. Dokumen ini menjadi bahan awal paket dokumen modul sebelum kode ditulis.
:::

:::kartu
6 penarik | Satu penarik terpisah untuk tiap sumber, dijalankan tiap 5 sampai 15 menit
5 tabel D1 | Kabar bersih, sinyal, keputusan piket, notifikasi, dan status sumber
6 status sinyal | Dari pantau sampai terkonfirmasi, dengan riwayat yang hanya bertambah
0 nama akun | Nama akun warga tidak masuk tabel olahan, dashboard, maupun notifikasi
:::

## Prinsip rancangan

:::temuan
#### 1. Satu penarik per sumber
Sumber yang gagal atau berubah aturan hanya mematikan penariknya sendiri. Status tiap sumber tampil di dashboard.
#### 2. Pakai ulang mesin yang ada
Penentu wilayah, penyaring bahasa, dan pengelompok cerita dari pipeline berita, pencocok kejadian, serta antrean kirim bot WhatsApp dipakai ulang tanpa salinan.
#### 3. Mesin tidak pernah mencatat kejadian
Sinyal hanya bahan periksa. Kejadian baru dicatat piket sesudah BPBD atau sumber resmi lain mengonfirmasi.
#### 4. Privasi sejak rancangan
Kabar mentah hanya di penyimpanan privat selama 30 hari. Tabel olahan tidak memuat nama akun.
:::
