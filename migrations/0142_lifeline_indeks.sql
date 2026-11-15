-- Indeks isyarat Lifeline (LF-03). Tanpa keduanya, kueri isyarat memindai laporan dan meja_catatan penuh (kuota baca D1). Hanya CREATE INDEX IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS laporan_jenis_dibuat ON laporan (jenis, dibuat);
-- Kueri dampak dan pengungsi menyaring (meja, prov, diubah) dan mengelompokkan kab sendiri, jadi kab tidak boleh berada di antara prov dan diubah.
CREATE INDEX IF NOT EXISTS meja_catatan_prov_diubah ON meja_catatan (meja, prov, diubah);
