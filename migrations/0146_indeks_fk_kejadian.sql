-- Indeks penunjuk FK ke sk_kejadian(id): tanpa ini DELETE FROM sk_kejadian (hapus dummy) memindai
-- tw_tawaran_riwayat, tw_token, titik_pengungsian penuh (UJ-F7-03). Idempoten.
CREATE INDEX IF NOT EXISTS tw_riwayat_kej ON tw_tawaran_riwayat (kejadian_id);
CREATE INDEX IF NOT EXISTS tw_token_kej ON tw_token (kejadian_id);
CREATE INDEX IF NOT EXISTS titik_pengungsian_kej ON titik_pengungsian (kejadian_id) WHERE kejadian_id IS NOT NULL;
