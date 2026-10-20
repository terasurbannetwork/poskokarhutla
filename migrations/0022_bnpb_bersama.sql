-- Ruang Koordinasi BNPB (docs/bnpb/ARSITEKTUR.md): tabel bersama keempat modul (relawan, alun-alun, riset, meja kerja). Idempoten.
-- Batas laju dan kegagalan kode per kunci (hash IP bergaram, atau id pemegang kode). aksi bebas (diawali nama modul, mis. 'relawan.daftar'),
-- supaya modul baru tidak perlu membangun ulang CHECK seperti laju_posko. Dibersihkan cron menit 17 (2 hari).
CREATE TABLE IF NOT EXISTS laju_bnpb (
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 3 AND 64),
  aksi TEXT NOT NULL CHECK (length(aksi) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS laju_bnpb_k ON laju_bnpb (kunci, aksi, waktu);
