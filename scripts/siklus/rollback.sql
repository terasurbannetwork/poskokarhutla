-- Rollback Siklus Bencana (DT 3, DT 11 langkah 4). Di luar migrations/: dijalankan manual setelah ekspor baris nyata.
-- Urut terbalik dari pembuatan (anak dulu). Trigger dan indeks ikut gugur bersama tabelnya.
-- Jalankan: wrangler d1 execute poskowarga --remote --file scripts/siklus/rollback.sql
DROP TABLE IF EXISTS sk_gladi;
DROP TABLE IF EXISTS sk_renkon;
DROP TABLE IF EXISTS sk_r3p_kegiatan;
DROP TABLE IF EXISTS sk_r3p;
DROP TABLE IF EXISTS sk_jitupasna_baris;
DROP TABLE IF EXISTS sk_jitupasna;
DROP TABLE IF EXISTS sk_harga;
DROP TABLE IF EXISTS sk_kaji;
DROP TABLE IF EXISTS sk_jejak;
DROP TABLE IF EXISTS sk_kejadian_sumber;
DROP TABLE IF EXISTS sk_kejadian_alias;
DROP TABLE IF EXISTS sk_kejadian_kab;
DROP TABLE IF EXISTS sk_kejadian;
