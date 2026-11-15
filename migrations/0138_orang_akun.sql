-- Keterpaduan KP-21 (data/kajian-bnpb/keterpaduan/DESAIN-TEKNIS.md D1, KEPUTUSAN D10): pasangan akun ke orang di tabel samping; tabel akun tidak disentuh. Idempoten.
-- akun_id polimorfik (tanpa FK, pola foto_label 0071); orang_id FK ke orang(id). Pemirsa tidak dipetakan (K10).
CREATE TABLE IF NOT EXISTS orang_akun (
  tabel TEXT NOT NULL CHECK (tabel IN ('staf', 'instansi_akun', 'pdt_akun', 'km_akun')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  orang_id TEXT NOT NULL REFERENCES orang (id),
  cara TEXT NOT NULL CHECK (cara IN ('nip', 'wa', 'admin')),
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (tabel, akun_id)
);
CREATE INDEX IF NOT EXISTS orang_akun_orang ON orang_akun (orang_id);
