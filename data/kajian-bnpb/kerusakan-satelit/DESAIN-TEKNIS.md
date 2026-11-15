# DESAIN-TEKNIS: Perkiraan kerusakan satelit

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `scripts/siklus/kerusakan.py` | Pipeline per bahaya: cari citra (pakai `scripts/banjir/citra_banjir.py`), peta terdampak, tumpang tindih dengan grid bangunan (`scripts/umum/paparan_bangunan.py`), agregat; self-check `uji` | siklus |
| `scripts/siklus/kerusakan_kriteria.json` | Kriteria lulus terkunci per bahaya, daftar kejadian uji, pemisahan kalibrasi dan uji (ALGORITMA 3) | siklus (+ validasi-model) |
| `scripts/siklus/kerusakan_uji.py` | Uji balik: hitung vonis, tulis `vonis.json` dan ringkasan | siklus (+ validasi-model) |
| `public/siklus/kerusakan.js` | Kartu dan laci | siklus |
| `src/siklus_kerusakan.js`, bagian di `src/hak.js` | Rute baca dan terima | warga-api |
| `migrations/NNNN_sk_unit_asal_satelit.sql` | Perluasan CHECK `unit_asal` | warga-api (+ migrasi-idempoten) |

## R2

| Kunci | Isi | Akses |
| --- | --- | --- |
| `siklus/kerusakan/vonis.json` | vonis per bahaya, sidik kriteria, tanggal uji | rute sesudah masuk |
| `siklus/kerusakan/<KJ>/<jenis>_<tanggal>.json` | agregat per kab dan kecamatan, label, tanggal citra, cakupan | rute sesudah masuk |
| `siklus/kerusakan/<KJ>/bangunan_<jenis>_<tanggal>.jsonl.gz` | tingkat bangunan; hanya untuk audit, tidak dilayani rute | tidak dilayani |

Awalan `siklus/` termasuk plafon 4 GB (ALGORITMA Siklus G0.3); anggaran ditulis di `sumber.json` oleh KS-04.

## D1

Satu perubahan: `sk_jitupasna_baris.unit_asal` memperluas CHECK dengan nilai baru (Q7, bawaan `satelit_diterima`). SQLite tidak dapat mengubah CHECK, jadi migrasi membangun ulang tabel: buat tabel baru, salin, hapus lama, ganti nama, buat ulang indeks `sk_jpb_jp` dan `sk_jpb_dummy`, dengan WAJIB membuat ulang tiga pemicu pembeku `sk_jpb_beku_tambah`, `sk_jpb_beku_ubah`, `sk_jpb_beku_hapus` (`migrations/0123_sk_pulih.sql:124-140`) yang ikut hilang saat tabel dihapus, dengan penangguhan kunci asing (`PRAGMA defer_foreign_keys`) dan idempoten (aman dijalankan ulang). Nomor migrasi diambil saat tiket (cek `migrations/` dan reservasi di `data/kajian-bnpb/*`; terakhir terlihat 0145). Sidik migrasi beku dan cakupan uji diperbarui di tiket yang sama; migrasi produksi dijalankan pemilik. Tidak ada tabel baru; D1 tidak memuat angka perkiraan, hanya baris yang sudah diterima staf.

## Rute

| Rute | Hak |
| --- | --- |
| `GET /api/siklus/kejadian/:id/kerusakan` | staf dan BPBD kab wilayahnya; mengembalikan vonis dan, bila lulus, agregat |
| `POST /api/siklus/kejadian/:id/kerusakan/terima` | peran pengisi Jitupasna (Q6); menulis baris isian dengan `unit_asal` baru dalam satu batch bersama catatan asal |

BPBD lewat `/api/instansi/siklus/...` (pola cookie instansi). Server menolak terima bila vonis bahaya itu bukan lulus atau lulus terbatas, dan menolak tingkat yang tidak diisi staf.

## Jadwal dan kuota

Pipeline dipicu lewat `siklus.yml` (milik mekanik-mesin) saat kejadian banjir atau karhutla aktif; tidak ada pindai D1 di cron. Planetary Computer memakai token anonim, jeda minimal 2 detik, ulang 3 kali lalu pertahankan saji terakhir dengan "menunggu".
