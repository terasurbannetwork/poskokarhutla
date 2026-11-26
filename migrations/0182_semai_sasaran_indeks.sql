-- Indeks kuota harian sasaran semai banjir (tiket SB-07): hitung per akun tanpa pindai penuh (gerbang d1-pindai). Hanya CREATE INDEX IF NOT EXISTS; 0179 tidak diubah.
CREATE INDEX IF NOT EXISTS op_semai_sasaran_oleh ON op_semai_sasaran(oleh, dibuat);
CREATE INDEX IF NOT EXISTS op_semai_sasaran_hapus ON op_semai_sasaran(dihapus_oleh, terhapus);
