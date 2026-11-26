# ALUR: Kabar Alun-alun ujung ke ujung

## Alur data harian

1. Mesin pemilik menjalankan `jalan.py` hari itu; generator menulis `kerja-DDMMYY/data.json`.
2. Langkah ekspor di `jalan.py` hari itu memanggil `python3 scripts/data/alun_kabar.py` (Q3, bawaan sementara). Skrip mencari `data.json` hari itu dan 8 hari ke belakang dengan glob `data/laporan-bnpb/harian/<bulan>/<hari>/kerja-*/data.json` (folder `kerja-DDMMYY` bernama tanggal hari berikutnya; folder hari yang tidak ada dilewati).
3. Tiap kejadian diberi kunci (ALGORITMA 1), kode kab dipasang dari nama (ALGORITMA 2), titik tengah kab ditambahkan.
4. Berita tayang di `public/` (hasil `lintas.yml`) dicocokkan lewat `cocok()` (ALGORITMA 3).
5. Hasil ditulis ke `public/data/alun/kabar.json`. Sejak K5 berkas ini ikut commit laporan harian dan terbit.
6. Gagal membaca berita atau geo: kejadian tetap ditulis tanpa berita atau tanpa titik, jalan tidak berhenti dan tidak ada angka nol.

## Alur pembaca

1. Buka `/lapor`, tab Alun-alun.
2. Klien memuat `GET /api/lapor/alun` (laporan warga) dan, bila berkasnya terjangkau, `/data/alun/kabar.json`. Bila berkas kabar tidak ada (belum terbit), Alun-alun tampil seperti sekarang.
3. Klien menempelkan klaster warga ke kejadian resmi (ALGORITMA 4). Sisa klaster warga menjadi kejadian "belum ada laporan resmi".
4. Peta menampilkan satu titik per kejadian. Sentuh titik atau baris daftar: kartu kejadian terbuka dengan empat pita.
5. Tautan berita membuka situs media di tab baru. Pita Media sosial menulis "Belum tersambung" (D9).

## Status kejadian

```
laporan harian: berjalan | belum | selesai   (satu-satunya sumber status, D13)
selesai + 7 hari tanpa laporan baru ---> tetap di berkas (tanda selesai_lama), tersembunyi dari tampilan bawaan, muncul di saringan Selesai
laporan resmi TERAKHIR kejadian itu > 48 jam ---> kartunya menulis "Laporan resmi terakhir <tanggal>" (per kejadian)
```

Kejadian yang hanya punya laporan warga tidak punya status resmi; kartunya menulis "Belum ada laporan resmi" dan status warga apa adanya ("ditindaklanjuti" atau "selesai" menurut BPBD).
