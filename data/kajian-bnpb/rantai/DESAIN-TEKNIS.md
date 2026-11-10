# DESAIN-TEKNIS

Prinsip: pakai ulang. Tidak ada mesin baru; tiga tabel samping, dua meja lewat mesin Meja Kerja, satu modul rute, dua layar. Akses D1 baru hanya di `src/hak.js` (`tests/agen/gerbang-d1.test.mjs` merah bila `src/rantai.js` menyentuh `env.DB` atau `.prepare(`).

## 1. Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `migrations/<nomor>_rantai.sql` | `rantai_tautan`, `rantai_tahap_batal`, `rantai_ringkas` | warga-api |
| `migrations/<nomor>_kalender.sql` | `kw_jangkar`, `kw_penuhi` | warga-api |
| `migrations/<nomor>_meja_spm.sql` | membangun ulang CHECK `meja_catatan` dan trigger `meja_petugas_sah` untuk meja `spm_respons`, `spm_kie`; pola `0118_meja_juklak.sql` | warga-api |
| `src/hak.js` | fungsi D1 baru (§3) | warga-api |
| `src/rantai.js` | rute rantai, kalender, dummy; tidak menyentuh D1 | warga-api |
| `src/meja.js`, `src/meja_spek.js` | ekspor `pelaku`/`adminSaja`; `tandaBahaya` (sudah diekspor `meja_spek.js`) dipakai ulang; tipe kolom `waktu`; dua meja SPM; blok `spm` di `hitungRapor` | warga-api |
| `public/inti/rantai.js` | fungsi murni ALGORITMA §1 (Node, Worker, peramban) | ruang-bnpb |
| `public/inti/kalender.js` | fungsi murni ALGORITMA §2 | ruang-bnpb |
| `public/inti/jam_aturan.js` dan `.json` | kunci baru (§5), satuan `menit` dan `kali_per_tahun` | ruang-bnpb (dengan `penulis-gerbang` untuk gerbang) |
| `public/bnpb/rantai.{html,js,css}`, `public/bnpb/kalender.{html,js,css}` | layar | ruang-bnpb |
| `public/admin/pimpinan.js` | kartu SPM | ruang-bnpb |
| `tests/warga/rantai.test.mjs`, `tests/bnpb/rantai_murni.test.mjs` | uji | penulis-gerbang |

Rute baru didaftarkan di peta halaman `src/worker.js` (`rantai: "/bnpb/rantai"`, `kalender: "/bnpb/kalender"`) dan di `tests/warga/cakupan.json`; nomor migrasi dibekukan di `tests/warga/migrasi_beku.json`. Nomor migrasi diambil saat mengerjakan (`ls migrations`), setelah 0118 yang dipegang pengerja lain.

## 2. Skema

```sql
-- tautan catatan meja ke kejadian; 1:1, tanpa ALTER meja_catatan
CREATE TABLE IF NOT EXISTS rantai_tautan (
  catatan_id TEXT PRIMARY KEY REFERENCES meja_catatan (id) ON DELETE CASCADE,
  kib TEXT NOT NULL CHECK (length(kib) = 16 AND kib NOT GLOB '*[^0-9]*'),
  oleh TEXT, dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS rantai_tautan_kib ON rantai_tautan (kib);

-- penanda "tahap tidak berlaku" oleh admin
CREATE TABLE IF NOT EXISTS rantai_tahap_batal (
  kib TEXT NOT NULL CHECK (length(kib) = 16 AND kib NOT GLOB '*[^0-9]*'),
  jalur TEXT NOT NULL CHECK (jalur IN ('awal','kaji','sk','posko','logistik','dsp','jitupasna','hibah')),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 3 AND 200),
  oleh TEXT, dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (kib, jalur)
) WITHOUT ROWID;

-- ringkasan untuk daftar dan corong, dibangun ulang tiap jam (pola meja_ringkas)
CREATE TABLE IF NOT EXISTS rantai_ringkas (
  kib TEXT PRIMARY KEY, prov TEXT NOT NULL, kab TEXT NOT NULL, jenis TEXT NOT NULL,
  posisi TEXT NOT NULL, macet_jalur TEXT, macet_jenis TEXT CHECK (macet_jenis IN ('pasal','mandek')),
  macet_sejak INTEGER, n_macet INTEGER NOT NULL DEFAULT 0, terakhir INTEGER NOT NULL, diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS kw_jangkar (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kunci TEXT NOT NULL CHECK (kunci IN ('hibah_spph','hibah_akhir_pelaksanaan','rpbd_tetap','rpbd_tinjau_terakhir','rpbd_monev_terakhir','pelatihan_selesai')),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  rujukan TEXT NOT NULL DEFAULT '' CHECK (length(rujukan) <= 80),   -- nomor SPPH, nama pelatihan
  kib TEXT CHECK (kib IS NULL OR (length(kib) = 16 AND kib NOT GLOB '*[^0-9]*')),
  oleh TEXT, dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (prov, kab, kunci, rujukan)
);
CREATE TABLE IF NOT EXISTS kw_penuhi (
  jangkar_id TEXT NOT NULL REFERENCES kw_jangkar (id) ON DELETE CASCADE,
  baris TEXT NOT NULL CHECK (length(baris) BETWEEN 3 AND 40),   -- mis. hibah_berkala_3, hibah_akhir
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  ket TEXT NOT NULL DEFAULT '' CHECK (length(ket) <= 120),
  oleh TEXT, dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (jangkar_id, baris)
) WITHOUT ROWID;
```

Trigger: `rantai_tautan` ditolak untuk catatan `meja = 'pengaduan'` (`RAISE(ABORT, ...)`), dan `kw_penuhi` ditolak bila `tanggal` lebih dari hari ini. Daftar kunci `kw_jangkar` yang diizinkan mengikuti kunci Jam Aturan di §5; uji integrasi menjaga keduanya sama.

Meja SPM (migrasi ketiga) mengikuti spek di `src/meja_spek.js`:
- `spm_respons` (pusat: false, rapor: false): `t_lapor`, `t_siap`, `t_kerah`, `t_tiba` (tipe `waktu`), `hambatan` (pilih: tidak, cuaca, jalan, keamanan, lain), `tgl_henti`, `tgl_laporan_akhir` (tanggal), `kib` opsional; status `tercatat`. Validasi urutan dan selisih di `cek` (ALGORITMA §3).
- `spm_kie` (rapor: false): `tanggal`, `bentuk` (pilih: tatap_muka, media_sosial, multimedia), `sasaran_jiwa`, wilayah kec dan desa true; status `tercatat`.
- Tipe kolom baru `waktu`: string ISO bersel zona WIB `YYYY-MM-DDTHH:MM:00+07:00`, menit penuh, tidak di masa depan lebih dari 5 menit; disimpan dalam `data` JSON seperti kolom lain.

## 3. `src/hak.js` (fungsi bernama, semua `.bind()`, kolom dari daftar putih)

Baca: `kibBuka(env, filter, halaman)`, `kejadianByKib(env, kib)`, `entriPertamaKib`, `skByKib`, `adaPoskoKib`, `tautanByKib`, `tautanByCatatan`, `batalByKib`, `ringkasRantai(env, filter)`, `jangkarWilayah(env, prov, kab)`, `penuhiByJangkar`, `rekapJangkar(env)`, `kandidatKejadian(env, prov, kab, tanggal)`.

Tulis (mengembalikan pernyataan untuk `env.DB.batch`, selalu bersama `stmtJejak`): `stmtTautan`, `stmtLepasTautan`, `stmtBatalJalur`, `stmtPulihJalur`, `stmtJangkar`, `stmtPenuhi`, `stmtRingkasUlang`, `stmtHapusDummyRantai`, `stmtHapusDummyKalender`.

Pemeriksaan wilayah (KIB dan catatan satu `prov|kab`) dilakukan di `src/rantai.js` memakai hasil baca; jawaban untuk "tidak ada" dan "di luar wilayah" sama.

## 4. Rute

| Rute | Hak | Isi |
| --- | --- | --- |
| `GET /bnpb/rantai`, `GET /bnpb/kalender` | sesi sah | halaman |
| `GET /api/rantai/daftar` | staf wilayah, petugas kabupatennya, admin | daftar dan corong dari `rantai_ringkas`, paginasi 25 |
| `GET /api/rantai/:kib` | sama | detail dihitung langsung (satu KIB murah) |
| `GET /api/rantai/saran?catatan=` | pemilik catatan atau admin | maksimal 5 kejadian |
| `POST /api/rantai/tautan` | pemilik catatan atau admin | `{catatan_id, kib}`; `kib: null` melepas |
| `POST /api/rantai/batal` | admin | `{kib, jalur, alasan}` atau `{kib, jalur, pulihkan: true}` |
| `GET /api/kalender` | petugas kabupatennya, staf wilayah, admin | baris satu BPBD |
| `GET /api/kalender/rekap` | staf, admin | per kunci, per BPBD, dari tabel ringkas yang ada |
| `POST /api/kalender/jangkar` | menurut Q5, Q6 | `{kunci, tanggal, rujukan, kib?}` |
| `POST /api/kalender/penuhi` | petugas kabupatennya, admin | `{jangkar_id, baris, tanggal, ket}` |
| `POST /api/rantai/dummy` | Super Admin | rantai dan kalender contoh |
| `GET /api/meja/rapor` | admin (sudah ada) | ditambah `spm` |

Semua `POST`: `bacaBody` dengan batas ukuran, validasi tipe, batas laju lewat `laju()` seperti rute Meja, jejak `pantau_jejak`. Tidak ada rute tulis tanpa sesi; tidak ada rute publik.

## 5. Kunci Jam Aturan baru

Ditulis literal di `jam_aturan.js` dan `jam_aturan.json` (kembar; `tests/bnpb/unit_kembar.test.mjs` menjaga), kutipan persis dari teks (spasi dan pindah baris dinormalkan oleh gerbang).

| Kunci | Jenis | Nilai | Acuan dan letak | Kutipan |
| --- | --- | --- | --- | --- |
| `hibah_rr_tahap_batas` | tenggat | 15 hari_kalender | `perban-4-2024`, Pasal 28 ayat (2) | "paling lama 15 (lima belas) hari kalender setelah berakhirnya setiap tahapan" |
| `hibah_rr_akhir` | tenggat | 60 hari_kalender | `perban-4-2024`, Pasal 28 ayat (3) | "paling lama 60 (enam puluh) hari kalender sejak berakhirnya masa pelaksanaan" |
| `hibah_rr_setor` | tenggat | 120 hari_kalender | `perban-4-2024`, Pasal 29 ayat (2) | "paling lama 120 (seratus dua puluh) hari kalender sejak berakhirnya batas waktu pelaksanaan Hibah RR" |
| `hibah_rr_bukti_setor` | tenggat | 3 hari_kalender | `juklak-9-2024`, hal. 12 | "paling lambat 3 (tiga) hari kalender setelah batas waktu penyetoran sisa dana berakhir" |
| `rpbd_tinjau` | tenggat | 2 tahun | `perban-3-2026`, Pasal 44 ayat (1) | "dilakukan secara berkala setiap 2 (dua) tahun atau sewaktu-waktu apabila terjadi bencana" |
| `std_spm_respons_menit` | standar | 25 menit | `juklak-6-2026`, hal. 8 | "Tingkat waktu respons cepat paling lama 25 (dua puluh lima) menit" |
| `std_spm_tempuh_menit` | standar | 150 menit | `juklak-6-2026`, hal. 8 | "ditentukan paling lama 150 (seratus lima puluh) menit" |
| `spm_laporan_akhir` | tenggat | 14 hari_kalender | `juklak-6-2026`, hal. 13 | "paling lama 14 (empat belas) hari setelah operasi dihentikan" |
| `std_spm_kie_tinggi` | standar | 2 kali_per_tahun | `juklak-7-2026`, hal. 7 | "setidaknya dilakukan dua kali setahun di kabupaten/kota yang memiliki risiko tinggi" |
| `std_spm_kie_sedang` | standar | 1 kali_per_tahun | `juklak-7-2026`, hal. 7 | "sekali setahun di kabupaten/kota dengan risiko sedang" |

Satuan `menit` dan `kali_per_tahun` ditambahkan ke `SATUAN`. Entri `hibah_rr_lapor` (3 bulan) yang sudah ada dipakai untuk `akhir tahap = SPPH + 3k bulan`; catatannya diperbarui agar menunjuk `hibah_rr_tahap_batas`. Kutipan melintasi beberapa baris di teks sumber; gerbang menormalkan spasi. Pengerja menjalankan `gerbang-jam-aturan` sebelum menyimpan, dan kutipan yang tidak cocok diganti, bukan diperlonggar.

## 6. Beban D1

Gratis 5 juta pembacaan per hari (memori `d1-kuota-baca`). Rancangan tidak memindai: daftar dan corong dari `rantai_ringkas` (kejadian buka saja, dibangun ulang tiap jam lewat jalur cron Meja `segarkanRingkas`, tanpa jadwal cron baru, karena AGENTS.md §2 mencatat satu cron `* * * * *` dan batas 5 jadwal akun Free); detail satu KIB menjalankan paling banyak delapan pembacaan kecil; rekap Kalender dari `kw_jangkar` (baris sedikit) dan `meja_ringkas` untuk baris dari meja; blok SPM membaca `meja_catatan` dua meja baru per `prov|kab` dalam satu kueri dengan jendela tahun berjalan. Ujinya mencatat jumlah pernyataan per rute (RENCANA-UJI §3).

## 7. Dummy

`POST /api/rantai/dummy` (Super Admin, dua ikon, isi ditentukan halaman): rantai: tiga kejadian logbook di tiga kabupaten contoh dengan jalur berbeda (satu macet pasal, satu mandek, satu lengkap), catatan meja bertautan; kalender: jangkar contoh dengan satu lewat tenggat dan satu tanpa jangkar. Rapor SPM: `POST /api/meja/dummy` yang sudah ada diperluas dengan catatan `spm_respons` dan `spm_kie`. Semua baris `dummy = 1`, tidak masuk rute publik, dapat dihapus. Dicakup `gerbang-dummy` dan `tests/e2e/05-dummy-jejak.sql`.

## 8. Keputusan rancangan (ADR ringkas)

- Tabel samping 1:1 untuk tautan, bukan kolom baru: ALTER ADD COLUMN tidak idempoten di SQLite dan `meja_catatan` sudah dibangun ulang berkali-kali.
- Status jalur dihitung, tidak disimpan: sumber tunggal, tidak bisa menyimpang. Satu-satunya penyimpanan turunan adalah `rantai_ringkas`, murni cache yang boleh dibuang.
- Kalender menghitung saat dibaca dari jangkar: mengubah tanggal jangkar atau kunci Jam Aturan langsung mengubah semua baris, tanpa migrasi data.
- SPM sebagai meja: formulir, offline, dummy, ekspor, dan jejak sudah ada.
