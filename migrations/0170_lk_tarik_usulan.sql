-- 0170: tarikan halaman publik dan usulan ke Buku Besar (paket data/kajian-bnpb/lapor-kejadian/, tiket LK-03, DESAIN-TEKNIS bagian 3, D8, D9, A7, A8).
-- Kode kejadian laporan: gugus GL-ddmmyy-NN (src/lapor_gugus.js) atau nomor tiket tunggal LA-ddmmyy-NN. Kode usulan LU-ddmmyy-NN, bukan nomor kejadian resmi.
-- Append-only: matriks hak hanya memberi baca dan tambah. Mencabut tarikan = baris baru aktif = 0. Status usulan dibaca dari sk_kejadian_sumber (D11, A7).
-- Satu usulan per (kejadian laporan, putaran): tabel tidak punya kolom status, jadi indeks unik parsial "belum ditolak" (DESAIN-TEKNIS) diganti putaran.
-- Rute menulis putaran 1; klik ganda pada putaran yang sama gagal UNIQUE (409). Mengusulkan ulang sesudah ditolak staf Siklus = putaran berikutnya,
-- dan itu menunggu keputusan pemilik di rute, bukan migrasi baru. Akhiran kode (NN) hanya angka, boleh lebih dari dua digit.
-- Tanpa nama pelapor; `oleh` = pelaku sesi meja. Hanya CREATE ... IF NOT EXISTS; tanpa ALTER, tanpa trigger, tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.
CREATE TABLE IF NOT EXISTS lk_tarik (
  id INTEGER PRIMARY KEY,
  kode TEXT NOT NULL CHECK ((kode GLOB 'GL-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*' OR kode GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*')
    AND substr(kode, 11) NOT GLOB '*[^0-9]*'),
  aktif INTEGER NOT NULL CHECK (aktif IN (0, 1)),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  waktu INTEGER NOT NULL CHECK (waktu > 0)
);
CREATE INDEX IF NOT EXISTS lk_tarik_kode ON lk_tarik (kode, waktu, id);

CREATE TABLE IF NOT EXISTS lk_usulan (
  kode TEXT PRIMARY KEY CHECK (kode GLOB 'LU-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*' AND substr(kode, 11) NOT GLOB '*[^0-9]*'),
  kejadian_laporan TEXT NOT NULL CHECK ((kejadian_laporan GLOB 'GL-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*' OR kejadian_laporan GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*')
    AND substr(kejadian_laporan, 11) NOT GLOB '*[^0-9]*'),
  putaran INTEGER NOT NULL DEFAULT 1 CHECK (putaran BETWEEN 1 AND 20),
  anggota TEXT NOT NULL CHECK (json_valid(anggota) AND json_type(anggota) = 'array' AND json_array_length(anggota) BETWEEN 1 AND 200),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 1 AND 40),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  waktu INTEGER NOT NULL CHECK (waktu > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS lk_usulan_kejadian ON lk_usulan (kejadian_laporan, putaran);
CREATE INDEX IF NOT EXISTS lk_usulan_waktu ON lk_usulan (waktu);
