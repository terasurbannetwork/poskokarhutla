# Standar Data Kejadian dan Dampak Bencana

Folder program untuk tiga dokumen yang saling berkait. Semua dokumen memakai istilah, angka kriteria, dan batas kelas yang sama.

| No | Dokumen | Isi | Naskah | Keluaran |
| --- | --- | --- | --- | --- |
| 01 | Kajian Penentuan Kejadian Bencana, Kelas Mayor dan Minor, dan Standar Data Lapangan | Studi literatur: definisi bencana, cara menentukan kejadian untuk sembilan jenis bencana alam, kelas mayor dan minor, data umum dan data khusus, SOP lapangan, infografis 5 halaman | `01-kajian-penentuan-kejadian/` | `keluaran/01 Kajian Penentuan Kejadian Bencana/` |
| 02 | Kajian Telaah Juklak BNPB Nomor 7 Tahun 2023 | Penilaian 65 butir ketentuan Juklak 7/2023: dipertahankan, disesuaikan, diganti, atau ditambahkan | `02-kajian-telaah-juklak/` | `keluaran/02 Kajian Telaah Juklak 7-2023/` |
| 03 | Rancangan Juklak Standar Data Kejadian dan Dampak Bencana | Rancangan petunjuk pelaksanaan pengganti Juklak 7/2023, dengan Lampiran I sampai III | `03-juklak-baru/` | `keluaran/03 Rancangan Juklak Standar Data/` |
| 04 | Landasan Formulir Pelaporan Bencana (Excel) | Isian yang ditulis Pusdalops dalam laphar dan logbook 2026 per jenis bencana, struktur laporan menurut panduan Pusdalops 2025, dan usulan isian formulir baku | `04-landasan-formulir/` | `keluaran/04 Landasan Formulir Pelaporan/` |

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
cd -
py data/kajian-bnpb/standar-data-bencana/03-juklak-baru/susun_lampiran.py
py data/kajian-bnpb/standar-data-bencana/03-juklak-baru/bangun_juklak.py --pdf
node data/kajian-bnpb/standar-data-bencana/01-kajian-penentuan-kejadian/infografis/cetak.mjs ddmmyy
py scripts/data/logbook_pusdalops.py --sumber "D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LOGBOOK 2026" --keluaran <folder di luar repo>
py data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/urai_isian.py --logbook <folder di luar repo>
py data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/buat_excel.py
```

Langkah `urai_isian.py` memerlukan laphar yang sudah diurai di `data/raw/laphar/hari/` (lihat `scripts/umum/laphar_arsip.mjs`) dan memakan waktu sekitar lima menit. Setelah Excel dibangun, buka dan simpan sekali di Excel supaya semua rumus terhitung.

Kajian 01 dan 02 dibangun dengan mesin kajian bersama di `data/kajian-bnpb/hitung-bencana/mesin/` (gaya kajian BNPB, logo BNPB dan KRIS, daftar isi yang dapat diklik). Rancangan Juklak dibangun dengan `03-juklak-baru/bangun_juklak.py` yang meniru format Juklak BNPB. Lampiran I dan III rancangan Juklak disusun otomatis dari kamus data dan lembar khusus Kajian 01; jangan menyunting kedua berkas itu dengan tangan.

## Aturan naskah

- Pemeriksa bahasa harus berakhir dengan 0 galat sebelum DOCX dibangun.
- Tanpa kurung siku. Keterangan "masih usulan" ditulis sebagai kalimat.
- Istilah baru diikuti penjelasan dengan pola "X, yaitu Y".
- Naskah tidak dikaitkan dengan DIBI, logbook Pusdalops, atau kajian klasifikasi sebelumnya.
