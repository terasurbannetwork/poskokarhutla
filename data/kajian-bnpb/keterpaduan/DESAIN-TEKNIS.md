# DESAIN-TEKNIS: Keterpaduan

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `src/kejadian_tautan.js` | `GET /api/siklus/ingest/modul` (Bearer `PIPA_TOKEN` lewat `gerbangIngest`, kontrak `dari`, `sampai` maksimum 120 hari, `lanjut`, sama dengan `GET /api/siklus/ingest/jendela`), `GET /api/kejadian/tautan` (sesi staf atau instansi, hak baca per wilayah) | warga-api |
| `src/hak.js` bagian Keterpaduan | Fungsi SQL baca baris modul per jendela dan kursor, baca tautan per (sumber, kode), tulis `orang_akun` dan `orang_tinjau`, register titik | warga-api |
| `scripts/siklus/pasang.py` | Sumber baru `tugas_api`, `logbook_d1`, `sippa`, `lapangan`, `gempa_d1`, `lapsus` lewat `_tarik` yang sama; `masuk` memanggil rute modul di jendela yang sama dengan `siklus.yml:63-70`; tidak ada berkas titik di R2 | siklus |
| `public/inti/antre.js` | Antrean gabungan, saluran per modul, pita dan laci | inti-layar |
| `public/inti/spek.js` | Format spek, validator, penggambar form, adapter lama; modul ES dengan `export`, diimpor Worker dan dimuat peramban lewat `<script type="module">` (pola `public/pipa/formulir.js` yang diimpor `src/sippa.js:18`) | inti-layar |
| `public/inti/kj_tanda.js` | Komponen tanda kejadian | inti-layar |
| `scripts/agents/cocok_orang.mjs` | Pencocok orang sekali jalan, menulis SQL ke luar repo untuk diterapkan pemilik | warga-api |
| `tests/agen/gerbang-keterpaduan.test.mjs` | Gerbang F-10 | penulis-gerbang |

## D1

Nomor migrasi diambil saat tiket dikerjakan (D13); paket `paritas-bencana` sudah memesan 0130 dan 0131.

| Migrasi | Isi |
| --- | --- |
| `indeks_kursor_modul` | Indeks `logbook_kejadian(dibuat, id)`, `sippa_tugas(mulai, id)`, `lp_tugas(mulai, id)`, `lapsus_kejadian(dibuat)` (pola `0125_indeks_baca_d1.sql`). |
| `titik_pengungsian` | `CREATE TABLE IF NOT EXISTS titik_pengungsian (id TEXT PRIMARY KEY CHECK (id GLOB 'TP-????????'), prov TEXT NOT NULL, kab4 TEXT NOT NULL, kec TEXT, desa TEXT, nama TEXT NOT NULL, jenis_tempat TEXT NOT NULL, lat REAL, lon REAL, kejadian_id TEXT REFERENCES sk_kejadian(id) CHECK (kejadian_id IS NULL OR (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????')), buka TEXT, tutup TEXT, dibuat INTEGER NOT NULL, pembuat TEXT NOT NULL)`; indeks `(kab4, tutup)` dan `(kab4, lat, lon)`. |
| `meja_pengungsi_titik` | Indeks unik baru `meja_pengungsi_titik_hari` pada `(json_extract(data,'$.titik_id'), json_extract(data,'$.tgl_data')) WHERE meja='pengungsi' AND json_extract(data,'$.titik_id') IS NOT NULL`. Indeks lama `meja_pengungsi_hari` tetap untuk catatan tanpa titik. |
| `orang_akun` | `CREATE TABLE IF NOT EXISTS orang_akun (tabel TEXT NOT NULL CHECK (tabel IN ('staf','instansi_akun','pdt_akun','km_akun')), akun_id TEXT NOT NULL, orang_id TEXT NOT NULL REFERENCES orang(id), cara TEXT NOT NULL CHECK (cara IN ('nip','wa','admin')), dibuat INTEGER NOT NULL, PRIMARY KEY (tabel, akun_id))`; indeks `(orang_id)`. Tabel akun tidak disentuh. |
| `orang_tinjau` | `orang_tinjau (akun_tabel, akun_id, kandidat JSON, alasan, keputusan, diputus, pemutus)`. |

Kuota baca D1 (5 juta per hari, akun Free): `GET /api/siklus/ingest/modul` membaca per sumber hanya baris dalam jendela pada kolom kursornya (ALGORITMA 1), paling banyak 500 per panggilan, lewat indeks `indeks_kursor_modul`. Rute ini tidak boleh terbit sebelum migrasi indeks itu diterapkan di produksi.

## Rute

| Rute | Metode | Hak |
| --- | --- | --- |
| `/api/siklus/ingest/modul` | GET | kunci ingest |
| `/api/kejadian/tautan` | GET | staf, instansi (wilayahnya), petugas (tugasnya) |
| `/api/pengungsian/titik` | GET, POST | petugas kab meja kerja, staf pusat |
| `/api/orang/tinjau` | GET, POST | admin |
| `/api/orang/:id/jejak` | GET | orangnya sendiri, admin (Q2) |

## Pemindahan antrean

Tiap halaman: muat `public/inti/antre.js`, buka basis data lama, pindahkan butirnya ke saluran baru dengan `klien_id` yang sama, hapus basis data lama hanya sesudah saluran baru menerima semua. Kode antrean lama dihapus di commit yang sama dengan pemindahannya.

## Bukan bagian paket ini

Router WA bersama (K2), perubahan login (D12), tautan untuk `op_isian_kejadian` dan `pantau_tugas` (Q7).
