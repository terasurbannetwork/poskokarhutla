-- Operasi Udara isian manual (K12..K19, data/kajian-bnpb/operasi-udara/DESAIN-TEKNIS.md bagian 7.3). Hanya CREATE ... IF NOT EXISTS, tanpa ALTER, tanpa seed.
-- Penanda sumber per butir: tabel op_* lama tidak punya kolom oleh/terhapus, dan ALTER tidak idempoten di D1. Waktu = ms epoch UTC.
CREATE TABLE IF NOT EXISTS op_isian (
  tabel TEXT NOT NULL CHECK (tabel IN ('op_armada_status','op_gerak','op_gerak_hasil','op_temuan','op_armada','op_kontrak','op_personel','op_foto_unggah')),
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 1 AND 80),
  sumber TEXT NOT NULL DEFAULT 'manual' CHECK (sumber = 'manual'),
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL,
  terhapus INTEGER NOT NULL DEFAULT 0 CHECK (terhapus IN (0,1)),
  PRIMARY KEY (tabel, kunci));
CREATE TABLE IF NOT EXISTS op_isian_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, waktu INTEGER NOT NULL, oleh TEXT, tabel TEXT NOT NULL, kunci TEXT NOT NULL,
  aksi TEXT NOT NULL CHECK (aksi IN ('isi','ubah','hapus','bot_dilewati','lengkapi')),
  sebelum TEXT CHECK (sebelum IS NULL OR (json_valid(sebelum) AND length(sebelum) <= 8192)),
  sesudah TEXT CHECK (sesudah IS NULL OR (json_valid(sesudah) AND length(sesudah) <= 8192)),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300));
CREATE INDEX IF NOT EXISTS op_isian_log_kunci ON op_isian_log(tabel, kunci, waktu);
CREATE INDEX IF NOT EXISTS op_isian_log_waktu ON op_isian_log(waktu);
CREATE INDEX IF NOT EXISTS op_isian_log_oleh ON op_isian_log(oleh, waktu);
CREATE TABLE IF NOT EXISTS op_isian_kejadian (
  jenis TEXT NOT NULL CHECK (jenis IN ('gerak','temuan')), tanggal TEXT NOT NULL, registrasi TEXT NOT NULL, sub TEXT NOT NULL,
  id INTEGER NOT NULL, PRIMARY KEY (jenis, tanggal, registrasi, sub, id));
CREATE TABLE IF NOT EXISTS op_kontrak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16), operator TEXT NOT NULL, registrasi TEXT, peran TEXT CHECK (peran IS NULL OR peran IN ('patroli','wb','omc','patroli_wb')),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2), mulai TEXT NOT NULL, selesai TEXT, plafon_jam REAL CHECK (plafon_jam IS NULL OR plafon_jam BETWEEN 0 AND 10000),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300));
CREATE TABLE IF NOT EXISTS op_personel (
  tanggal TEXT NOT NULL, prov TEXT NOT NULL CHECK (length(prov) = 2), unsur TEXT NOT NULL CHECK (unsur IN ('tni','polri','manggala','bpbd','masyarakat','lainnya')),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 0 AND 200000),
  sumber_teks TEXT CHECK (sumber_teks IS NULL OR length(sumber_teks) <= 120),
  PRIMARY KEY (tanggal, prov, unsur));
CREATE TABLE IF NOT EXISTS op_foto_unggah (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT NOT NULL, berkas TEXT NOT NULL, tipe TEXT NOT NULL CHECK (tipe IN ('image/jpeg','image/png','image/webp')),
  registrasi TEXT, base_id TEXT, jam_utc INTEGER, lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5), lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  ket TEXT CHECK (ket IS NULL OR length(ket) <= 200));
