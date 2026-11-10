# PRD: lima juklak di Meja Kerja

Peran: petugas BPBD berkode (per kabupaten, meja yang diizinkan), admin moderator ke atas, staf berperan Irtama/ULP (hanya meja pengaduan), Super Admin (dummy).

| Meja | Isi | Akses tulis | Keluaran |
| --- | --- | --- | --- |
| Pengungsi terpilah | Satu catatan per tempat per hari: jenis tempat, KK, jiwa L/P enam umur, kelompok rentan, kebutuhan enam sektor Ada/Tidak, tanggal tutup. Tanpa nama atau NIK | petugas, admin | rekap per kabupaten dari catatan terbaru |
| Kaji cepat | Kolom tambahan opsional: terancam, terdampak, rentan, kesehatan, air dan sanitasi, kebutuhan, rekomendasi status Ya/Tidak, lama status | petugas, admin | DIBI tetap sama |
| Pengaduan masyarakat | Register, telaah, diteruskan atau ditolak, tindak lanjut, selesai; identitas pelapor terpisah | moderator, staf Irtama/ULP (identitas hanya Irtama/ULP) | tidak ada ekspor, tidak publik |
| Klaster logistik | SK, rencana kerja, laporan triwulan, laporan tahunan | petugas kab, admin | daftar dokumen |
| Register risiko | Per unit per tahun: Format 2, 3, 4 | admin | CSV Format 2, 3, 4 |

Larangan: identitas pelapor tidak masuk `data`, daftar, rekap, ekspor, jejak; pengaduan, klaster, risiko tidak tampil di layar publik; stok tidak masuk klaster; angka tenggat tidak ditulis di luar Jam Aturan.

Kriteria selesai ada di `RENCANA-UJI.md`.
