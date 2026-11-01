# Standar Pusdalops di sistem: logbook sesuai juklak, dokumen otomatis, modul operasi

Tanggal: 1 November 2026. Status: disetujui pemilik ("gas semua").
Dasar: bedah format isi Drive "00. PIKET PUSDALOPS" (`2026-11-01-katalog-format-pusdalops.md`), Juklak 7/2023,
Juklak 3/2022, Juklak 9/2023, Draft Panduan Logbook, `scripts/wa/panduan_resmi.json`.

Tiga tujuan pemilik untuk tiap butir: menambah informasi sistem, memberi insight, dan membakukan format supaya
Pusdalops tinggal isi dan keluarannya standar.

## Gelombang 1

| Kode | Butir | Pengerja | Berkas |
| ---- | ----- | -------- | ------ |
| W1 | Logbook sesuai Juklak 7/2023: KIB 16 digit + sufiks pengkinian, taksiran kerugian (juta), korban terpilah umur (0-17, 18-59, 60+) dan L/P, kelompok rentan, kerusakan prasarana dan layanan dasar, kebutuhan 5 kelompok berjumlah, pemberi informasi (maks 3), tautan dokumentasi, keposkoan, SK status per kejadian (tingkat, nomor, TMT, perpanjangan ke-N, tautan; SK provinsi didahulukan). Semua medan baru opsional, entri lama tetap sah. | `warga-api` | migrasi baru (nomor bebas berikutnya), `src/logbook.js`, `tests/warga/logbook*` |
| L1 | Dokumen otomatis dari logbook: BAST piket (kejadian baru vs pengkinian per hari, nomor surat), Laporan Menonjol (per provinsi, ambang menonjol dari json), Laporan Shift (3 shift), Rekap Mingguan (Kamis 18.00 s.d. Kamis 18.00, luas karhutla per provinsi). Cetak/PDF dan salin teks WA. | `ruang-bnpb` | `public/bnpb/dokumen.*`, tautan dari `/bnpb/logbook` |

## Gelombang 2 (setelah W1)

| Kode | Butir |
| ---- | ----- |
| W2 | Tracker pemulihan: huntara, huntap, dana tunggu hunian, jembatan gantung, sumur bor per kab/desa, progres, vendor. |
| W3 | Laporan Khusus operasi besar: induk operasi > provinsi > tim pendamping > kejadian; kebutuhan mendesak berjumlah; 4 indikator layanan dasar (BBM, sinyal, listrik, air); penanda data basi. |
| W4 | Roll call radio harian: ketaatan BPBD Prov, Kab/Kota, Komunitas. |

## Di luar
Kartu status gunung api (sudah ada di modul gunungapi). Kode `kecelakaan` tetap (dipetakan ke 203 saat ekspor), tidak dihapus.
Migrasi produksi diterapkan pemilik.
