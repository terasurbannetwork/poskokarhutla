-- 0190: indeks usia untuk retensi 90 hari oh_cari_foto (OH-08, paket data/kajian-bnpb/orang-hilang-publik/). Indeks 0188 (nomor_sha, waktu) tidak melayani DELETE ... WHERE waktu < ?, jadi cron menit 17 memindai seluruh tabel.
-- Hanya CREATE INDEX IF NOT EXISTS: tanpa trigger, tanpa ALTER, tanpa data. Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply), bersama 0188.
CREATE INDEX IF NOT EXISTS oh_cari_foto_usia ON oh_cari_foto (waktu);
