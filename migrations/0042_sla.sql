-- Riwayat umur data per sumber untuk layar SLA (src/sla.js). Waktu = jam epoch UTC (slot = floor(ms / 3600000)). Idempoten (IF NOT EXISTS). Hanya tabel baru.
-- Cron bersih-bersih (menit 17) menulis satu baris per sumber per jam dari hasil periksaStatus (/api/status); retensi 90 hari.
-- umur_menit / batas_menit NULL = tidak terbaca / sumber hanya dilaporkan tanpa batas; segar = 0 bila basi (atau tidak terbaca padahal punya batas).
-- Tanpa tabel ini /api/sla menjawab 503 dan cron melewati langkahnya; sisa Worker tidak terganggu.
CREATE TABLE IF NOT EXISTS status_riwayat (
  slot INTEGER NOT NULL,
  sumber TEXT NOT NULL CHECK (length(sumber) BETWEEN 1 AND 40),
  umur_menit INTEGER CHECK (umur_menit IS NULL OR umur_menit >= 0),
  batas_menit INTEGER CHECK (batas_menit IS NULL OR batas_menit > 0),
  segar INTEGER NOT NULL DEFAULT 1 CHECK (segar IN (0, 1)),
  PRIMARY KEY (slot, sumber)
) WITHOUT ROWID;
