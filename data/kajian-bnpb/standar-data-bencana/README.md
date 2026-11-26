# Standar Data Kejadian dan Dampak Bencana

Folder program untuk dokumen standar data bencana yang saling berkait. Semua dokumen memakai istilah, angka kriteria, dan batas kelas yang sama. Ada dua jalur: jalur lengkap (01 sampai 06) dan jalur praktis (07 sampai 09) yang disusun sebagai pembanding. Kondisi terkini, keputusan yang menunggu pemilik, rencana lanjut, dan celah ada di `reports/STATUS-DAN-RENCANA.md`.

| No | Dokumen | Isi | Naskah | Keluaran |
| --- | --- | --- | --- | --- |
| 01 | Kajian Penentuan Kejadian Bencana, Kelas Bencana, dan Standar Data Lapangan | Studi literatur: definisi bencana, cara menentukan kejadian untuk sembilan jenis bencana alam, kelas intensif dan ekstensif, data umum dan data khusus, SOP lapangan, infografis 5 halaman | `01-kajian-penentuan-kejadian/` | `keluaran/01 Kajian Penentuan Kejadian Bencana/` |
| 02 | Kajian Telaah Juklak BNPB Nomor 7 Tahun 2023 | Penilaian 65 butir ketentuan Juklak 7/2023: dipertahankan, disesuaikan, diganti, atau ditambahkan | `02-kajian-telaah-juklak/` | `keluaran/02 Kajian Telaah Juklak 7-2023/` |
| 03 | Rancangan Juklak Standar Data Kejadian dan Dampak Bencana | Rancangan petunjuk pelaksanaan pengganti Juklak 7/2023, dengan Lampiran I sampai III | `03-juklak-baru/` | `keluaran/03 Rancangan Juklak Standar Data/` |
| 04 | Landasan Formulir Pelaporan Bencana (Excel) | Isian yang ditulis Pusdalops dalam laphar dan logbook 2026 per jenis bencana, struktur laporan menurut panduan Pusdalops 2025, dan usulan isian formulir baku | `04-landasan-formulir/` | `keluaran/04 Landasan Formulir Pelaporan/` |
| 06 | Buku Praktis Penentuan Kejadian Bencana, Kelas Bencana, dan Pengumpulan Data Lapangan | Bab Hasil Kajian 01 dipadatkan menjadi buku kerja 12 halaman: alur, kriteria, tabel per jenis bencana, aturan menghitung, kelas intensif, data lapangan, daftar periksa petugas | `06-pedoman-penentuan-kejadian/` | `keluaran/06 Buku Praktis Penentuan Kejadian Bencana/` |
| 07 | Rancangan Juklak Praktis dan Perbandingan | Versi praktis rancangan Juklak untuk masa darurat dan keadaan data Indonesia, beserta daftar 29 perubahan dari versi lengkap | `07-juklak-praktis/` | `keluaran/07 Rancangan Juklak Praktis/` |
| 08 | Kajian Versi Praktis | Kajian 01 yang diselaraskan dengan Rancangan Juklak Praktis, beserta lampiran | `08-kajian-praktis/` | `keluaran/08 Kajian Versi Praktis/` |
| 09 | Buku Praktis Versi Juklak Praktis | Buku praktis yang diselaraskan dengan Rancangan Juklak Praktis | `09-buku-praktis-juklak-praktis/` | `keluaran/09 Buku Praktis Versi Juklak Praktis/` |

Dokumen 04 sengaja membaca laphar dan logbook Pusdalops atas permintaan pemilik (17 November 2026), karena tujuannya memetakan isian yang selama ini ditulis petugas. Aturan "tidak dikaitkan dengan logbook" di bawah tetap berlaku untuk naskah kajian 01 sampai 03. Logbook bersifat internal: `isian.json` dan Excel hanya memuat hitungan per jenis, dan contoh tulisan diambil dari laphar saja.

Folder lain: `alat/cek_bahasa.py` (pemeriksa bahasa untuk semua naskah) dan `sumber/` (teks Juklak 7/2023 hasil ekstraksi salinan UNFPA Indonesia; halaman 1, 10, 26, dan 52 berupa gambar dan dibaca secara visual).

## Membangun ulang

Jalankan dari akar repo. Windows memerlukan `PYTHONUTF8=1`.

```
py data/kajian-bnpb/standar-data-bencana/alat/cek_bahasa.py
node data/kajian-bnpb/standar-data-bencana/01-kajian-penentuan-kejadian/gambar/gambar.mjs
node data/kajian-bnpb/standar-data-bencana/02-kajian-telaah-juklak/gambar/gambar.mjs
cd data/kajian-bnpb/hitung-bencana/mesin
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/01-kajian-penentuan-kejadian/urutan-penentuan.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/01-kajian-penentuan-kejadian/urutan-penentuan-lampiran.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/02-kajian-telaah-juklak/urutan.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/06-pedoman-penentuan-kejadian/urutan-praktis.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/06-pedoman-penentuan-kejadian/urutan-praktis-v2.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/07-juklak-praktis/urutan-perbandingan.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/08-kajian-praktis/urutan-kajian.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/08-kajian-praktis/urutan-lampiran.json
py bangun.py --tanpa-gambar --urutan ../../standar-data-bencana/09-buku-praktis-juklak-praktis/urutan-buku.json
cd -
py data/kajian-bnpb/standar-data-bencana/03-juklak-baru/susun_lampiran.py
py data/kajian-bnpb/standar-data-bencana/03-juklak-baru/bangun_juklak.py --pdf
JUKLAK_NASKAH=data/kajian-bnpb/standar-data-bencana/07-juklak-praktis/naskah JUKLAK_KELUARAN="data/kajian-bnpb/standar-data-bencana/keluaran/07 Rancangan Juklak Praktis" JUKLAK_NAMA="Rancangan Juklak Praktis Standar Data Kejadian dan Dampak Bencana" py data/kajian-bnpb/standar-data-bencana/03-juklak-baru/bangun_juklak.py --pdf
node data/kajian-bnpb/standar-data-bencana/01-kajian-penentuan-kejadian/infografis/cetak.mjs ddmmyy
py scripts/data/logbook_pusdalops.py --sumber "D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LOGBOOK 2026" --keluaran <folder di luar repo>
py data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/urai_isian.py --logbook <folder di luar repo>
py data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/buat_excel.py
```

Langkah `urai_isian.py` memerlukan laphar yang sudah diurai di `data/raw/laphar/hari/` (lihat `scripts/umum/laphar_arsip.mjs`) dan memakan waktu sekitar lima menit. Setelah Excel dibangun, buka dan simpan sekali di Excel supaya semua rumus terhitung.

Kajian 01 dan 02 dibangun dengan mesin kajian bersama di `data/kajian-bnpb/hitung-bencana/mesin/` (gaya kajian BNPB, logo BNPB dan KRIS, daftar isi yang dapat diklik). Rancangan Juklak dibangun dengan `03-juklak-baru/bangun_juklak.py` yang meniru format Juklak BNPB. Lampiran I dan III rancangan Juklak disusun otomatis dari kamus data dan lembar khusus Kajian 01; jangan menyunting kedua berkas itu dengan tangan. Lampiran Juklak Praktis di `07-juklak-praktis/naskah/` ditulis tangan dan tidak dibangkitkan ulang oleh `susun_lampiran.py`. Gambar varian praktis berakhiran `-p` di `gambar.html`, dan `pk-periksa-p` dibangkitkan dari Tabel 6.1 buku 09.

## Aturan naskah

- Pemeriksa bahasa harus berakhir dengan 0 galat sebelum DOCX dibangun.
- Tanpa kurung siku. Keterangan "masih usulan" ditulis sebagai kalimat.
- Istilah baru diikuti penjelasan dengan pola "X, yaitu Y".
- Naskah tidak dikaitkan dengan DIBI, logbook Pusdalops, atau kajian klasifikasi sebelumnya.
