# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas, pemakai data, rute API, tabel, dan R2 milik modul Prediksi.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `public/prediksi/index.html` | Layar `/prediksi` (enam tab, dialog rincian) |
| `public/prediksi/prediksi.js`, `prediksi.css` | Tab Besok (tabel, pil, Perlu tindakan, pop-up, peta MapLibre), Ketepatan prakiraan, Paparan dampak, Konfirmasi |
| `public/prediksi/besok_inti.js` | Fungsi murni tab Besok (level sel, urutan, angka pil, kunci geo); dipakai juga oleh `/prediksi/ringkas` |
| `public/prediksi/tangga.js`, `tangga_inti.js`, `tangga.css` | Tab Tangga dan fungsi murninya |
| `public/prediksi/laporan_layar.js`, `laporan_prov.js` | Tab Laporan provinsi dan fungsi murninya (kelas warna, peta SVG, susunan laporan) |
| `public/prediksi/ringkas.html`, `ringkas.js`, `ringkas.css` | Halaman ringkas `/prediksi/ringkas` |
| `scripts/prediksi/dasar.py` | Pustaka bersama: daftar 514 kab, pencocok nama, arsip append-only, unduh Open-Meteo |
| `scripts/prediksi/catat.py` | Pembekuan prakiraan (HJN, API, BNJ, LSR, ASP, ROB, GEL, CEX) |
| `scripts/prediksi/nilai.py` | Penilaian prospektif, pasangan, vonis, uji balik retrospektif |
| `scripts/prediksi/kalibrasi.py`, `koreksi.py` | Kalibrasi harian dan koreksi bulanan banjir |
| `scripts/prediksi/konfirmasi.py` | Menarik konfirmasi lapangan dari Worker ke `amatan/konfirmasi.json` (tanpa kolom catatan) |
| `scripts/prediksi/terbit.py`, `aturan.json` | Penggabung ke `prediksi.json`, `lalu.json`, `lengas.json`; aturan "perlu tindakan" |
| `scripts/prediksi/tangga.py` | Pembangun `tangga.json` dan arsip tangga |
| `scripts/prediksi/musim_rawan.py` | Bulan rawan dari DIBI dan uji baliknya (manual) |
| `scripts/prediksi/kalender.py` | Kalender risiko dari logbook |
| `scripts/prediksi/dampak.py`, `jalan.py` | Paparan statis per kab (gempa, genangan, desa terisolir) dan graf jalan OSM |
| `scripts/prediksi/bayangan/model.py` | Model bayangan |
| `src/prediksi.js` | Rute konfirmasi lapangan di Worker |

## Pemakai data di luar /prediksi

Skema `prediksi.json` dan fungsi `besok_inti.js` dipakai bersama oleh fitur lain, sehingga perubahan formatnya harus diuji ke semua pemakai berikut.

| Pemakai | Berkas | Yang dibaca |
| --- | --- | --- |
| Peringatan dini warga lewat Web Push (paket `data/kajian-bnpb/pwa-peringatan/`), berjalan di cron Worker menit 29 tiap jam | `src/pw_peringatan.js:62`, `src/pw_peringatan.js:93`, `src/pw_inti.js`, `src/worker.js:1031` | `/prediksi/data/prediksi.json` (dibaca ulang tiap 10 menit) |
| Chat Lapor Bencana, angka prakiraan 3 hari sama dengan tab Besok | `src/lapor_besok.js:4` (memuat `public/prediksi/besok_inti.js`), `src/lapor_info.js:30` | `prediksi.json` dan fungsi level sel |
| Tren dan kalender risiko di halaman lain | `public/banjir/longsor.js`, `public/cuaca/tren.js` | `kalender_risiko.json` |
| Simulasi InaRISK | `public/bnpb/inarisk_simulasi.js:10` | `prediksi.json` |

## Rute API

| Metode dan jalur | Hak | Keterangan |
| --- | --- | --- |
| `POST /api/prediksi/konfirmasi` | Header `x-kode-regu` yang sah ATAU sesi staf | Upsert per (kab, tanggal, kode, pelapor). Batas laju 120 permintaan per jam per IP (`src/prediksi.js:24`). `kab` 2 sampai 80 karakter; `tanggal` YYYY-MM-DD dalam 7 hari terakhir WIB; `kode` salah satu HJN, API, BNJ, LSR, ASP, ROB; `terjadi` 0 atau 1; `nilai` -1000 sampai 100000; `catatan` maksimal 500 karakter. Staf dicatat sebagai `admin:<12 heksadesimal>` (`src/prediksi.js:38`) |
| `GET /api/prediksi/konfirmasi?sejak=YYYY-MM-DD` | Bearer `PIPA_TOKEN` | Menggabungkan baris regu, groundcheck karhutla (sumber `groundcheck`), dan laporan warga (positif saja, sedikitnya 2 laporan berbeda per kab-tanggal-bahaya). `sejak` paling jauh 60 hari; `terpotong: true` bila salah satu kueri menyentuh LIMIT 5000 (`src/prediksi.js:58`) |
| `/prediksi` dan `/prediksi/ringkas` (halaman) | Sesi (admin, staf `operator_cc`, atau pemirsa bertab yang sesuai) di host produksi | Dipetakan di `src/worker.js:748` dan `src/worker.js:749`; tidak termasuk `PUBLIK_TANPA_SESI` |
| `GET /api/dalops/lapor` | belum ada | Hanya rancangan PK-4 |

## Tabel D1 dan migrasi

`prediksi_konfirmasi` (`migrations/0079_prediksi_konfirmasi.sql`): `id`, `kab`, `tanggal`, `kode` (CHECK HJN, API, BNJ, LSR, ASP, ROB), `terjadi` (0 atau 1), `nilai`, `catatan` (maksimal 500), `sumber` (CHECK regu atau warga), `kode_regu`, `dibuat`; unik pada (kab, tanggal, kode, kode_regu); indeks pada `tanggal`. Laporan warga tidak disimpan di tabel ini, digabung saat GET dari tabel `laporan`. Tab Tangga dan tab Besok tidak memakai tabel D1 dan tidak menambah rute Worker.

## R2

Tidak ada prefiks R2 yang dipakai modul ini. Rencana Prakiraan lawan Kejadian akan membaca kejadian Dalops dari R2 `dalops/` (rancangan, belum dikode).
