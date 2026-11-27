-- 0191: penanda nomor belum terverifikasi untuk orang hilang publik (OH-10/OH-11, saran tinjauan keamanan 27 Nov 2026).
-- Satu baris = nomor pelapor laporan itu hanya diketik (bukan sesi /masuk atau mesin WA), jadi petugas harus memverifikasi sebelum memercayainya. Tanpa nomor, tanpa data orang.
-- jenis: cari (ref = lapor_cari.id) atau temu (ref = oh_temu.id). Hanya CREATE IF NOT EXISTS: tanpa trigger, ALTER, atau data. Ditulis hanya di belakang OH_TULIS; terapkan bersama 0188 dan 0190 sebelum OH_TULIS = 1.
CREATE TABLE IF NOT EXISTS oh_nomor_ketik (
  jenis TEXT NOT NULL CHECK (jenis IN ('cari', 'temu')),
  ref_id TEXT NOT NULL CHECK (length(ref_id) = 16),
  PRIMARY KEY (jenis, ref_id)
);
