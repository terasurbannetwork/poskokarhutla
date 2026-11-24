# ALUR

1. Pipeline harian (`data.yml`, tidak berubah) menjalankan `catat.py`, `nilai.py`, `terbit.py`: `prediksi.json` dan `lalu.json` diperbarui.
2. Staf membuka `/bnpb/dalops`, memilih jenis (mis. Banjir).
3. Layar memuat `/api/dalops/banjir` (kejadian), `/prediksi/data/prediksi.json` (tiga hari ke depan), `/prediksi/data/lalu.json` (hari lampau), dan `/api/dalops/lapor?jenis=banjir&sejak=<tanggal>` (titik laporan, F-4).
4. Bagian Peringatan dini menampilkan prakiraan tiga hari dari `prediksi.json` (pengganti `status.json`).
5. Seksi "Prakiraan dan kejadian" memakai tanggal bawaan = kemarin. Staf bisa memilih tanggal lain sampai 7 hari lalu. Tanggal hari ini dan ke depan tidak punya kotak (belum terjadi).
6. Fungsi murni `pasangkan()` menghitung kotak tiap kab; ubin dan tabel diperbarui. Klik ubin menyaring tabel dan peta.
7. Klik kab (baris atau peta) membuka pop-up kab dengan prakiraan, kejadian, laporan yang cocok.
8. Kotak "Belum ada laporan" untuk tanggal yang belum matang (Q2) ditulis "menunggu laporan".
9. Untuk F-6: `konfirmasi.py` menarik baris berlabel `logbook` dari `GET /api/prediksi/konfirmasi`; `nilai.py` menilai dengan label itu terpisah dari DIBI.
