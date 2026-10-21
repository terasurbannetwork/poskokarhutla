-- C5: wilayah (provinsi, kabupaten) untuk Lapor Warga. Tabel `laporan` sudah berisi data produksi dan ALTER TABLE ADD COLUMN
-- tidak idempoten di SQLite, jadi wilayah disimpan di tabel samping (pola 0019 lapangan_tahan): aman diulang, laporan lama tak disentuh.
-- Tidak ada baris = belum diketahui (laporan baru diisi saat masuk, laporan lama diisi mundur cron menit 17).
-- prov NULL + sumber 'tak_ada' = sudah dicoba tetapi titiknya di laut/luar negeri: penanda supaya isi-mundur tidak mengulang selamanya.
-- Wilayah bukan data pribadi (titik laporan sudah publik). Baris ikut terhapus bersama laporannya.
CREATE TABLE IF NOT EXISTS laporan_wilayah (
  laporan_id TEXT PRIMARY KEY REFERENCES laporan (id) ON DELETE CASCADE,
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 80),
  sumber TEXT NOT NULL CHECK (sumber IN ('masuk', 'mundur', 'tak_ada'))
);
CREATE INDEX IF NOT EXISTS laporan_wilayah_pk ON laporan_wilayah (prov, kab);
