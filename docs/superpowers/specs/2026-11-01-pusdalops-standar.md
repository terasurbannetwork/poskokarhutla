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

## Gelombang 3 (2 Nov 2026, pemilik memilih 15 butir dari 20 rekomendasi)

Dasar angka: logbook 2011-2026 (tahun dasar 2014-2020, 2024, 2025), SK status 2018-2024 (902), laphar 2022-2025,
rekapan 2016-2019, pantauan medsos 2025. Semua turunan publik agregat, tanpa nama orang dan teks bebas.

| Kode | Butir | Pengerja | Berkas |
| ---- | ----- | -------- | ------ |
| G1 | Wajib tutup kejadian (tanggal tuntas + kondisi akhir; pengingat 24/72 jam yang ada dipertegas; kejadian tanpa tutup > N hari ditandai) | `warga-api` | `src/logbook.js`, `src/pengingat.js` |
| G2 | Papan SK status aktif nasional + tanda "SK aktif tapi kejadian sudah tutup/tanpa entri > 7 hari" (rute baca) | `warga-api` | `src/logbook.js` |
| G3 | Peringatan bencana berantai: entri banjir/cuaca membuat peringatan longsor + banjir susulan 3 hari untuk kab itu (lift dari `logbook_susulan.json`) | `warga-api` | `src/berantai.js` |
| G4 | Antrean verifikasi pantauan medsos/TV ke logbook: butir masuk, diverifikasi staf, jadi kejadian; jeda medsos ke logbook diukur | `warga-api` | `src/medsos_antre.js` |
| G5 | Bot WA ke logbook: laporan BPBD di grup WA diurai jadi entri logbook baku ber-KIB, staf mengonfirmasi | `wa-bot` | `scripts/wa/**` |
| G6 | Laphar otomatis dari logbook (bentuk laphar 2022-2026) dan Sitrep per kejadian besar (gunung api, gempa) dari logbook + data instansi | `ruang-bnpb` | `public/bnpb/dokumen*` |
| G7 | Turunan perencanaan: paket kab prioritas (kab dengan beban kumulatif 46%), kalender operasi dua musim per provinsi, rencana stok logistik pra-musim per gudang, rapor BPBD diperluas (jeda, tuntas, kelengkapan, roll call) | `ruang-bnpb` | `scripts/bnpb/**`, `public/data/bnpb/**` |
| G8 | Arsip jadi label uji balik kekeringan (SK kekeringan, laphar, rekapan) | `gunungapi-kering` → `validasi-model` | `scripts/kekeringan/**` |
| L3 | Layar untuk G1-G4 dan G7 (setelah rute/berkas ada) | `ruang-bnpb` | `public/bnpb/**` |

Butir 1 (logbook satu pintu) dan butir 8 (tracker pemulihan) sudah ada di Gelombang 1-2; sisanya kebijakan (Word/Drive dihentikan) diputuskan pemilik.
