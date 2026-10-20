-- Lapor Warga multi-bahaya: laporan.bahaya dan katalog jenis:sub diperlebar ke semua lapor_bahaya registry (public/bencana.json):
-- gempa, tsunami, cuaca, udara, gunungapi, kekeringan, ditambah 16 jenis baru (guncang, rusak_gedung, tsunami_tanda, abu, lahar, gemuruh,
-- pohon_tumbang, atap_rusak, puting_beliung, hujan_es, asap_tebal, sesak_napas, jarak_pandang, sumur_kering, gagal_panen, antre_air).
-- Daftar di bawah HARUS sama dengan public/informasi_jenis.js; tests/warga/skema.test.mjs menjaganya dua arah.
-- CHECK SQLite tidak bisa di-ALTER, jadi laporan dibangun ulang (pola 0006/0017). Bedanya: laporan punya anak (kontak, suara; ON DELETE CASCADE)
-- dan trigger yang menyebut laporan. DROP TABLE melakukan DELETE implisit yang MENGALIRKAN CASCADE, jadi anak disalin ke tabel cadangan dulu
-- dan dipulihkan sesudahnya; trigger anak dibuang dan dibuat lagi (RENAME/DROP tak boleh meninggalkan trigger yang menunjuk tabel hilang).
-- Kolom induk (FK ke diri sendiri) diisi setelah semua baris masuk. Indeks laporan_* dibuat ulang. Idempoten: sisa cadangan dibuang dulu.
-- Satu transaksi (migrasi D1): gagal di tengah = tidak berubah.
DROP TRIGGER IF EXISTS kontak_hanya_bantuan;
DROP TRIGGER IF EXISTS suara_tambah;
DROP TRIGGER IF EXISTS suara_ubah;
DROP TRIGGER IF EXISTS suara_hapus;
DROP TABLE IF EXISTS laporan_cad;
DROP TABLE IF EXISTS kontak_cad;
DROP TABLE IF EXISTS suara_cad;
CREATE TABLE laporan_cad AS SELECT id, jenis, sub, bahaya, lat, lon, teks, detail, jumlah, dibuat, kedaluwarsa, selesai, disembunyikan, benar, salah, aduan, dekat_titik_panas, laci, induk, durasi_buruk, ip_hash, token_hash FROM laporan;
CREATE TABLE kontak_cad AS SELECT * FROM kontak;
CREATE TABLE suara_cad AS SELECT * FROM suara;
DROP TABLE laporan;
CREATE TABLE laporan (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 8 AND 24),
  jenis TEXT NOT NULL,
  sub TEXT NOT NULL,
  bahaya TEXT NOT NULL CHECK (bahaya IN ('karhutla', 'banjir', 'longsor', 'rob', 'gempa', 'tsunami', 'cuaca', 'udara', 'gunungapi', 'kekeringan', 'umum')),
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
  CHECK (jenis || ':' || sub IN (
    'listrik:padam', 'listrik:genset', 'listrik:hidup', 'sinyal:tidak_ada', 'sinyal:lemah',
    'sinyal:lancar', 'bbm:tersedia', 'bbm:terbatas', 'bbm:habis', 'elpiji:tersedia',
    'elpiji:terbatas', 'elpiji:habis', 'minta:makanan', 'minta:air', 'minta:pakaian',
    'minta:obat', 'minta:evakuasi', 'minta:tempat', 'minta:lainnya', 'tawar:makanan',
    'tawar:air', 'tawar:pakaian', 'tawar:obat', 'tawar:evakuasi', 'tawar:tempat',
    'tawar:lainnya', 'info:umum', 'api:kecil', 'api:besar', 'api:bara',
    'api:asap', 'udara:p100', 'udara:p500', 'udara:p1000', 'udara:jauh',
    'sehat:masker', 'sehat:oksigen', 'sehat:obat_ispa', 'sehat:rujukan', 'sehat:faskes_penuh',
    'ruang:tersedia', 'ruang:penuh', 'air_padam:embung', 'air_padam:sumur_bor', 'air_padam:kanal',
    'air_padam:hidran', 'padam:butuh_regu', 'padam:butuh_alat', 'padam:tawar_relawan', 'padam:tawar_alat',
    'sekolah:libur', 'sekolah:daring', 'satwa:orangutan', 'satwa:beruang', 'satwa:harimau',
    'satwa:gajah', 'satwa:lainnya', 'banjir:kaki', 'banjir:lutut', 'banjir:pinggang',
    'banjir:dada', 'banjir:atap', 'longsor:jalan', 'longsor:rumah', 'longsor:retakan',
    'rob:kaki', 'rob:lutut', 'rob:pinggang', 'guncang:ringan', 'guncang:kuat',
    'guncang:hebat', 'rusak_gedung:retak', 'rusak_gedung:rusak', 'rusak_gedung:roboh', 'tsunami_tanda:surut',
    'tsunami_tanda:ombak', 'tsunami_tanda:sirene', 'abu:tipis', 'abu:tebal', 'abu:kerikil',
    'lahar:sungai', 'lahar:meluap', 'lahar:putus', 'gemuruh:gemuruh', 'gemuruh:dentuman',
    'gemuruh:sinar', 'pohon_tumbang:jalan', 'pohon_tumbang:rumah', 'pohon_tumbang:kabel', 'atap_rusak:sebagian',
    'atap_rusak:banyak', 'atap_rusak:umum', 'puting_beliung:terlihat', 'puting_beliung:merusak', 'hujan_es:kecil',
    'hujan_es:besar', 'asap_tebal:bau', 'asap_tebal:tebal', 'asap_tebal:sangat', 'sesak_napas:perih',
    'sesak_napas:sesak', 'sesak_napas:berat', 'jarak_pandang:p500', 'jarak_pandang:p1000', 'jarak_pandang:p3000',
    'sumur_kering:surut', 'sumur_kering:kering', 'gagal_panen:sebagian', 'gagal_panen:seluruh', 'antre_air:antre',
    'antre_air:tangki', 'antre_air:habis', 'akses:truk', 'akses:motor', 'akses:tergenang',
    'akses:asap', 'akses:tertimbun', 'akses:putus', 'evakuasi:mengungsi', 'evakuasi:perlu')),
  -- jenis umum boleh di bahaya apa pun; jenis khusus hanya di bahayanya
  CHECK (jenis IN ('listrik', 'sinyal', 'bbm', 'elpiji', 'minta', 'tawar', 'info', 'akses', 'evakuasi')
    OR jenis || ':' || bahaya IN (
    'api:karhutla', 'udara:karhutla', 'sehat:karhutla', 'ruang:karhutla',
    'air_padam:karhutla', 'padam:karhutla', 'sekolah:karhutla', 'satwa:karhutla',
    'banjir:banjir', 'longsor:longsor', 'rob:rob', 'guncang:gempa',
    'rusak_gedung:gempa', 'tsunami_tanda:gempa', 'tsunami_tanda:tsunami', 'abu:gunungapi',
    'lahar:gunungapi', 'gemuruh:gunungapi', 'pohon_tumbang:cuaca', 'atap_rusak:cuaca',
    'puting_beliung:cuaca', 'hujan_es:cuaca', 'asap_tebal:udara', 'sesak_napas:udara',
    'jarak_pandang:udara', 'sumur_kering:kekeringan', 'gagal_panen:kekeringan', 'antre_air:kekeringan')),
  CHECK (jumlah IS NULL OR jenis IN ('minta', 'tawar', 'sehat', 'ruang', 'padam', 'evakuasi')),
  CHECK (kedaluwarsa > dibuat AND kedaluwarsa <= dibuat + 604800000),
  CHECK (jenis <> 'air_padam' OR coalesce(json_extract(detail, '$.status'), '') IN ('ada', 'dangkal', 'kering')),
  -- lokasi satwa tidak boleh tepat: dibulatkan ke 0,01 derajat (~1 km)
  CHECK (jenis <> 'satwa' OR (abs(lat - round(lat, 2)) < 1e-9 AND abs(lon - round(lon, 2)) < 1e-9)),
  CHECK (induk IS NULL OR induk <> id)
);
INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, teks, detail, jumlah, dibuat, kedaluwarsa, selesai, disembunyikan, benar, salah, aduan, dekat_titik_panas, laci, durasi_buruk, ip_hash, token_hash)
  SELECT id, jenis, sub, bahaya, lat, lon, teks, detail, jumlah, dibuat, kedaluwarsa, selesai, disembunyikan, benar, salah, aduan, dekat_titik_panas, laci, durasi_buruk, ip_hash, token_hash FROM laporan_cad;
UPDATE laporan SET induk = (SELECT c.induk FROM laporan_cad c WHERE c.id = laporan.id) WHERE id IN (SELECT id FROM laporan_cad WHERE induk IS NOT NULL);
CREATE INDEX laporan_aktif ON laporan (disembunyikan, kedaluwarsa);
CREATE INDEX laporan_lokasi ON laporan (lat, lon);
CREATE INDEX laporan_induk ON laporan (induk);
CREATE INDEX laporan_ip ON laporan (ip_hash, dibuat);
INSERT INTO kontak SELECT * FROM kontak_cad;
INSERT INTO suara SELECT * FROM suara_cad;
DROP TABLE laporan_cad;
DROP TABLE kontak_cad;
DROP TABLE suara_cad;
CREATE TRIGGER kontak_hanya_bantuan BEFORE INSERT ON kontak
WHEN (SELECT jenis FROM laporan WHERE id = NEW.laporan_id) NOT IN ('minta', 'tawar', 'sehat', 'padam', 'evakuasi')
BEGIN SELECT RAISE(ABORT, 'kontak hanya untuk laporan bantuan'); END;
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
