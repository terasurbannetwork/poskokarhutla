-- Lapor Warga (warga bantu warga). Waktu = milidetik epoch UTC.
-- Daftar jenis:sub dan jenis:bahaya di bawah HARUS sama dengan public/informasi_jenis.js;
-- tests/warga/skema.test.mjs mencoba tiap pasangan katalog (harus diterima) dan tiap pasangan silang (harus ditolak).

CREATE TABLE laporan (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 8 AND 24),
  jenis TEXT NOT NULL,
  sub TEXT NOT NULL,
  bahaya TEXT NOT NULL CHECK (bahaya IN ('karhutla', 'banjir', 'longsor', 'rob', 'umum')),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  teks TEXT NOT NULL DEFAULT '' CHECK (length(teks) <= 280),
  detail TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(detail) AND json_type(detail) = 'object' AND length(detail) <= 400),
  jumlah INTEGER CHECK (jumlah IS NULL OR jumlah BETWEEN 1 AND 100000),
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL,
  selesai INTEGER NOT NULL DEFAULT 0 CHECK (selesai IN (0, 1)),
  disembunyikan INTEGER NOT NULL DEFAULT 0 CHECK (disembunyikan IN (0, 1)),
  benar INTEGER NOT NULL DEFAULT 0 CHECK (benar >= 0),
  salah INTEGER NOT NULL DEFAULT 0 CHECK (salah >= 0),
  aduan INTEGER NOT NULL DEFAULT 0 CHECK (aduan >= 0),
  dekat_titik_panas INTEGER NOT NULL DEFAULT 0 CHECK (dekat_titik_panas IN (0, 1)),
  laci TEXT CHECK (laci IS NULL OR length(laci) BETWEEN 1 AND 12),
  induk TEXT REFERENCES laporan(id) ON DELETE SET NULL,
  durasi_buruk INTEGER CHECK (durasi_buruk IS NULL OR durasi_buruk >= 0),
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
  CHECK (jenis || ':' || sub IN ('listrik:padam', 'listrik:genset', 'listrik:hidup', 'sinyal:tidak_ada', 'sinyal:lemah', 'sinyal:lancar',
    'bbm:tersedia', 'bbm:terbatas', 'bbm:habis', 'elpiji:tersedia', 'elpiji:terbatas', 'elpiji:habis',
    'minta:makanan', 'minta:air', 'minta:pakaian', 'minta:obat', 'minta:evakuasi', 'minta:tempat', 'minta:lainnya',
    'tawar:makanan', 'tawar:air', 'tawar:pakaian', 'tawar:obat', 'tawar:evakuasi', 'tawar:tempat', 'tawar:lainnya', 'info:umum',
    'api:kecil', 'api:besar', 'api:bara', 'api:asap', 'udara:p100', 'udara:p500', 'udara:p1000', 'udara:jauh',
    'sehat:masker', 'sehat:oksigen', 'sehat:obat_ispa', 'sehat:rujukan', 'sehat:faskes_penuh', 'ruang:tersedia', 'ruang:penuh',
    'air_padam:embung', 'air_padam:sumur_bor', 'air_padam:kanal', 'air_padam:hidran',
    'padam:butuh_regu', 'padam:butuh_alat', 'padam:tawar_relawan', 'padam:tawar_alat', 'sekolah:libur', 'sekolah:daring',
    'satwa:orangutan', 'satwa:beruang', 'satwa:harimau', 'satwa:gajah', 'satwa:lainnya',
    'banjir:kaki', 'banjir:lutut', 'banjir:pinggang', 'banjir:dada', 'banjir:atap', 'longsor:jalan', 'longsor:rumah', 'longsor:retakan',
    'rob:kaki', 'rob:lutut', 'rob:pinggang', 'akses:truk', 'akses:motor', 'akses:tergenang', 'akses:asap', 'akses:tertimbun', 'akses:putus',
    'evakuasi:mengungsi', 'evakuasi:perlu')),
  -- jenis umum boleh di bahaya apa pun; jenis khusus hanya di bahayanya
  CHECK (jenis IN ('listrik', 'sinyal', 'bbm', 'elpiji', 'minta', 'tawar', 'info', 'akses', 'evakuasi')
    OR jenis || ':' || bahaya IN ('api:karhutla', 'udara:karhutla', 'sehat:karhutla', 'ruang:karhutla', 'air_padam:karhutla',
      'padam:karhutla', 'sekolah:karhutla', 'satwa:karhutla', 'banjir:banjir', 'longsor:longsor', 'rob:rob')),
  CHECK (jumlah IS NULL OR jenis IN ('minta', 'tawar', 'sehat', 'ruang', 'padam', 'evakuasi')),
  CHECK (kedaluwarsa > dibuat AND kedaluwarsa <= dibuat + 604800000),
  CHECK (jenis <> 'air_padam' OR coalesce(json_extract(detail, '$.status'), '') IN ('ada', 'dangkal', 'kering')),
  -- lokasi satwa tidak boleh tepat: dibulatkan ke 0,01 derajat (~1 km)
  CHECK (jenis <> 'satwa' OR (abs(lat - round(lat, 2)) < 1e-9 AND abs(lon - round(lon, 2)) < 1e-9)),
  CHECK (induk IS NULL OR induk <> id)
);
CREATE INDEX laporan_aktif ON laporan (disembunyikan, kedaluwarsa);
CREATE INDEX laporan_lokasi ON laporan (lat, lon);
CREATE INDEX laporan_induk ON laporan (induk);
CREATE INDEX laporan_ip ON laporan (ip_hash, dibuat);

-- Kontak WA hanya untuk jenis bantuan, tabel terpisah supaya query daftar tidak pernah menyentuhnya. Dihapus cron setelah 72 jam.
CREATE TABLE kontak (
  laporan_id TEXT PRIMARY KEY REFERENCES laporan(id) ON DELETE CASCADE,
  wa TEXT NOT NULL CHECK (wa GLOB '628[0-9]*' AND wa NOT GLOB '*[^0-9]*' AND length(wa) BETWEEN 10 AND 15),
  dibuat INTEGER NOT NULL
);
CREATE INDEX kontak_dibuat ON kontak (dibuat);
CREATE TRIGGER kontak_hanya_bantuan BEFORE INSERT ON kontak
WHEN (SELECT jenis FROM laporan WHERE id = NEW.laporan_id) NOT IN ('minta', 'tawar', 'sehat', 'padam', 'evakuasi')
BEGIN SELECT RAISE(ABORT, 'kontak hanya untuk laporan bantuan'); END;

-- Satu suara per IP-hash per laporan per kelompok; hitungan di laporan dijaga trigger, 3 aduan = disembunyikan.
CREATE TABLE suara (
  laporan_id TEXT NOT NULL REFERENCES laporan(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  kelompok TEXT NOT NULL CHECK (kelompok IN ('konfirmasi', 'aduan')),
  nilai TEXT NOT NULL,
  waktu INTEGER NOT NULL,
  PRIMARY KEY (laporan_id, ip_hash, kelompok),
  CHECK ((kelompok = 'konfirmasi' AND nilai IN ('benar', 'salah'))
      OR (kelompok = 'aduan' AND nilai IN ('spam', 'palsu', 'kasar', 'pribadi', 'lainnya')))
);
CREATE TRIGGER suara_tambah AFTER INSERT ON suara BEGIN
  UPDATE laporan SET
    benar = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND nilai = 'benar'),
    salah = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND nilai = 'salah'),
    aduan = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND kelompok = 'aduan'),
    disembunyikan = CASE WHEN (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND kelompok = 'aduan') >= 3 THEN 1 ELSE disembunyikan END
  WHERE id = NEW.laporan_id;
END;
CREATE TRIGGER suara_ubah AFTER UPDATE ON suara BEGIN
  UPDATE laporan SET
    benar = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND nilai = 'benar'),
    salah = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND nilai = 'salah')
  WHERE id = NEW.laporan_id;
END;
CREATE TRIGGER suara_hapus AFTER DELETE ON suara BEGIN
  UPDATE laporan SET
    benar = (SELECT count(*) FROM suara WHERE laporan_id = OLD.laporan_id AND nilai = 'benar'),
    salah = (SELECT count(*) FROM suara WHERE laporan_id = OLD.laporan_id AND nilai = 'salah'),
    aduan = (SELECT count(*) FROM suara WHERE laporan_id = OLD.laporan_id AND kelompok = 'aduan')
  WHERE id = OLD.laporan_id;
END;

-- Jejak untuk batas laju. Hanya hash IP bergaram, tidak pernah IP mentah. Dihapus cron setelah 2 hari.
CREATE TABLE jejak (
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  aksi TEXT NOT NULL CHECK (aksi IN ('lapor', 'konfirmasi', 'aduan', 'kontak', 'selesai')),
  waktu INTEGER NOT NULL
);
CREATE INDEX jejak_ip ON jejak (ip_hash, aksi, waktu);
CREATE INDEX jejak_waktu ON jejak (aksi, waktu);
