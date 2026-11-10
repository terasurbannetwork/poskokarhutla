# ALGORITMA

Semua di `src/meja_spek.js`, dipanggil lewat `validasi`, `statusEfektif`, `tandaBahaya`.

- Pengungsi, kolom turunan `jiwa_l`, `jiwa_p`, `jiwa_total`, `umur_*`: dihitung server di `MEJA.pengungsi.hitung`, tidak diterima dari klien.
- Pengungsi, rekap (`kumpul` di `src/meja.js`, `rekapTerakhir`): untuk tiap (kab, nama tempat) hanya catatan bertanggal terbaru yang menyumbang kolom rekap, dan hanya bila status efektifnya `berjalan`.
- Pengungsi, status efektif: `ditutup` bila `tgl_tutup` sebelum hari ini WIB, selain itu `berjalan`.
- Pengaduan, tenggat: `tenggat(kunci, tgl_terima)` Jam Aturan; `kunci` tak berkadar bila kategori `tidak_berkadar_pengawasan`, selain itu berkadar (termasuk sebelum telaah). Tanda `lewat_tenggat` bila hari ini sesudah tenggat dan status bukan `selesai` atau `ditolak`. Selesai sesudah tenggat tanpa `penjelasan_lambat` ditolak.
- Risiko: tanda dan status `di_atas_selera` bila `res_level > selera`. Bila pengendalian belum ada atau belum memadai, `res_level` tidak boleh di bawah `level`.
- Kaji cepat: rekomendasi Ya wajib `rek_status_hari`; Tidak melarangnya.
