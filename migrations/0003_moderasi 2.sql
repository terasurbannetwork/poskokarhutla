-- Jejak audit moderasi: tiap aksi admin (sembunyikan/tampilkan/hapus/hapus_pengirim) dicatat di sini oleh src/worker.js,
-- dalam batch yang sama dengan perubahannya. "Hapus" kini soft-delete (disembunyikan = 1, kontak dibuang); baris laporan
-- dibuang cron 30 hari kemudian, jejak audit tetap (tidak memuat isi laporan, IP, atau kontak).
-- moderator = 12 karakter awal SHA-256 token admin yang dipakai (ADMIN_TOKEN boleh berisi beberapa token dipisah koma).
CREATE TABLE audit_moderasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  moderator TEXT NOT NULL CHECK (length(moderator) = 12 AND moderator NOT GLOB '*[^0-9a-f]*'),
  aksi TEXT NOT NULL CHECK (aksi IN ('sembunyikan', 'tampilkan', 'hapus', 'hapus_pengirim')),
  laporan_id TEXT NOT NULL,
  jumlah INTEGER NOT NULL DEFAULT 1 CHECK (jumlah >= 0),
  alasan TEXT NOT NULL DEFAULT '' CHECK (length(alasan) <= 200)
);
CREATE INDEX audit_waktu ON audit_moderasi (waktu);
-- jejak audit hanya boleh ditambah: ubah/hapus ditolak database
CREATE TRIGGER audit_tetap_ubah BEFORE UPDATE ON audit_moderasi BEGIN SELECT RAISE(ABORT, 'audit moderasi tidak boleh diubah'); END;
CREATE TRIGGER audit_tetap_hapus BEFORE DELETE ON audit_moderasi BEGIN SELECT RAISE(ABORT, 'audit moderasi tidak boleh dihapus'); END;
