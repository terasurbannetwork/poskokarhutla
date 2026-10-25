-- Uji lapangan karhutla (src/uji_lapangan.js, halaman /uji-lapangan): protokol + data supaya prediksi/klasifikasi platform bisa diuji terhadap kenyataan.
-- Hanya tabel baru, CREATE IF NOT EXISTS: aman diulang. tugas_isian TIDAK diubah (ALTER ADD COLUMN tidak idempoten di SQLite): medan baru tinggal di tabel samping 1:1 (pola 0041/0046).
-- Medan "gambut_teramati" tidak ditambah: tugas_isian.lahan_teramati (0029: gambut/mineral/campuran/tidak_tahu) sudah memuatnya. Waktu = ms epoch UTC.
-- Retensi: uji_tugas dan uji_isian ikut terhapus bersama tugasnya (ON DELETE CASCADE, 180 hari); uji_sampel dan uji_terlewat dibuang cron setelah 400 hari.

-- Strata dan potret platform per tugas, ditulis SEKALI saat tugas dibuat (level/firespot/luas bisa berubah sesudahnya karena tugas bergabung; uji memakai nilai awal).
-- sampel 'tugas' = tugas otomatis (level 3, level 2 bersyarat) ; 'kontrol' = sampel acak level 0-1 / firespot "mungkin" (tanpa ini presisi hanya dihitung pada positif).
-- p_lolos = peluang "lolos" (>= 10 sel VIIRS ~140 ha dalam 72 jam) yang dicatat prospektif oleh pipeline; kosong bila pipeline belum mengirim.
CREATE TABLE IF NOT EXISTS uji_tugas (
  tugas_id TEXT PRIMARY KEY REFERENCES tugas_api (id) ON DELETE CASCADE,
  sampel TEXT NOT NULL CHECK (sampel IN ('tugas', 'kontrol')),
  level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 9),
  firespot TEXT CHECK (firespot IS NULL OR firespot IN ('ya', 'mungkin')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  luas_platform_ha REAL CHECK (luas_platform_ha IS NULL OR (luas_platform_ha >= 0 AND luas_platform_ha <= 1000000)),
  p_lolos REAL CHECK (p_lolos IS NULL OR (p_lolos >= 0 AND p_lolos <= 1)),
  minggu TEXT CHECK (minggu IS NULL OR (length(minggu) = 8 AND minggu GLOB '[0-9][0-9][0-9][0-9]-W[0-9][0-9]')),
  dibuat INTEGER NOT NULL,
  CHECK (sampel = 'kontrol' OR minggu IS NULL),
  CHECK (sampel = 'tugas' OR minggu IS NOT NULL)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS uji_tugas_sampel ON uji_tugas (sampel, level);

-- Medan lapangan tambahan per isian (satu baris per isian yang membawa objek `uji`). Semua opsional; tutupan + metode_luas diwajibkan Worker bila luas_ha diisi.
-- Jalur GPS keliling TIDAK disimpan (minimisasi data, UU PDP): klien menghitung luas dari jalur dan hanya mengirim luas_ha + metode_luas + n_titik_jalur (jumlah titik).
-- Catatan metode_luas: 'taksiran' (taksiran mata) disimpan tetapi TIDAK masuk metrik luas (Q4).
CREATE TABLE IF NOT EXISTS uji_isian (
  isian_id TEXT PRIMARY KEY REFERENCES tugas_isian (id) ON DELETE CASCADE,
  tugas_id TEXT NOT NULL CHECK (length(tugas_id) = 16),
  dibuat INTEGER NOT NULL,
  tutupan TEXT CHECK (tutupan IS NULL OR tutupan IN ('gambut', 'semak_belukar', 'kebun_sawit', 'hti_akasia', 'hutan', 'pertanian', 'lain')),
  metode_luas TEXT CHECK (metode_luas IS NULL OR metode_luas IN ('keliling_gps', 'jalan_keliling', 'taksiran', 'drone')),
  n_titik_jalur INTEGER CHECK (n_titik_jalur IS NULL OR n_titik_jalur BETWEEN 0 AND 150),
  arah_jalar_deg INTEGER CHECK (arah_jalar_deg IS NULL OR arah_jalar_deg BETWEEN 0 AND 359),
  tepi_aktif TEXT CHECK (tepi_aktif IS NULL OR tepi_aktif IN ('ya', 'tidak')),
  tinggi_nyala TEXT CHECK (tinggi_nyala IS NULL OR tinggi_nyala IN ('lt05', '05_15', 'gt15')),
  angin_lokal TEXT CHECK (angin_lokal IS NULL OR angin_lokal IN ('tenang', 'lemah', 'sedang', 'kencang')),
  dugaan_penyebab TEXT CHECK (dugaan_penyebab IS NULL OR dugaan_penyebab IN ('pembukaan_lahan', 'tak_sengaja', 'tak_tahu', 'lain')),
  bekas_terbakar_baru TEXT CHECK (bekas_terbakar_baru IS NULL OR bekas_terbakar_baru IN ('ya', 'tidak', 'tak_tahu'))
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS uji_isian_tugas ON uji_isian (tugas_id);

-- Catatan pemilihan sampel kontrol: satu baris per (minggu ISO, provinsi), ditulis SEKALI sebelum tugas dibuat (klaim atomik; INSERT OR IGNORE).
-- n_kandidat = ukuran kolam kandidat saat dipilih, n_dipilih <= 5: peluang terpilih = n_dipilih / n_kandidat, bobot = kebalikannya. benih = "<minggu>|<prov>".
CREATE TABLE IF NOT EXISTS uji_sampel (
  minggu TEXT NOT NULL CHECK (length(minggu) = 8 AND minggu GLOB '[0-9][0-9][0-9][0-9]-W[0-9][0-9]'),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  benih TEXT NOT NULL CHECK (length(benih) = 11),
  n_kandidat INTEGER NOT NULL CHECK (n_kandidat >= 1),
  n_dipilih INTEGER NOT NULL CHECK (n_dipilih BETWEEN 0 AND 5 AND n_dipilih <= n_kandidat),
  n_tak_dikunjungi INTEGER NOT NULL DEFAULT 0 CHECK (n_tak_dikunjungi >= 0),
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (minggu, prov)
) WITHOUT ROWID;

-- Api yang DITEMUKAN regu tetapi tidak terlihat satelit (Q2, POD). Satu baris per laporan regu berkode (status menyala/bara, dipercaya) yang sudah dinilai.
-- hasil: terdeteksi = ada tugas api dalam 2 km atau titik satelit dalam 2 km pada 24 jam sesudah laporan; terlewat = tidak ada keduanya; tak_dinilai = putaran titik panas tidak mencakup jendelanya (tidak dihitung).
-- Sengaja tanpa koordinat dan tanpa REFERENCES (laporan lapangan dihapus lebih cepat daripada bukti ini).
CREATE TABLE IF NOT EXISTS uji_terlewat (
  lapangan_id TEXT PRIMARY KEY CHECK (length(lapangan_id) = 16),
  waktu INTEGER NOT NULL,
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  status TEXT NOT NULL CHECK (status IN ('menyala', 'bara')),
  hasil TEXT NOT NULL CHECK (hasil IN ('terdeteksi', 'terlewat', 'tak_dinilai')),
  dinilai INTEGER NOT NULL
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS uji_terlewat_waktu ON uji_terlewat (waktu);
