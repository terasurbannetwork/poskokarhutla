-- Keterpaduan KP-19: satu catatan meja pengungsi per (titik, tanggal). Catatan tanpa titik tetap memakai meja_pengungsi_hari (0118/0119). Idempoten.
CREATE UNIQUE INDEX IF NOT EXISTS meja_pengungsi_titik_hari ON meja_catatan (json_extract(data, '$.titik_id'), json_extract(data, '$.tgl_data')) WHERE meja = 'pengungsi' AND json_extract(data, '$.titik_id') IS NOT NULL;
