# KEAMANAN-PRIVASI

| Data | Publik | Staf | Catatan |
| --- | --- | --- | --- |
| Status per kab per bahaya per hari | ya | ya | hipotesis |
| Analisis nasional, ringkasan, lapisan | ya | ya | tanpa data orang |
| Kelas bahaya per desa (BNPB) | ya | ya | data kelas, bukan paparan; atribusi BNPB |
| Keterpaparan per desa, fasilitas bernama | tidak | ya | induk D18 |
| Rekomendasi per pihak | tidak | ya | K1; katalog di Worker |
| Prakiraan BMKG per desa | ya | ya | data terbuka BMKG, atribusi wajib |
| ONI, IOD, debit, hari tanpa hujan | ya | ya | |

- Tab Rekomendasi tidak ada di HTML publik; dibangun hanya sesudah rute sesi menjawab sah. Rute menolak tanpa sesi (401) dan peran lain (403); diuji.
- Rute BMKG hanya menerima kode kab 4 angka dari daftar; tidak meneruskan URL bebas; IP tidak disimpan mentah: batas laju memakai hash IP bergaram di tabel `laju_bnpb` (`lajuIP`, `src/bnpb.js`) yang dibersihkan cron; batas panggilan ke BMKG per menit hanya penghitung di memori Worker (risiko diketahui: bisa dilewati lewat banyak isolat, pindahkan ke D1 bila terbukti jadi masalah).
- Respons publik lewat daftar izin kolom, seperti `/status` induk.
- Penarikan berkas BNPB: hanya alamat tetap di skrip, batas waktu, satu tarikan per bulan; isi diperiksa bentuknya sebelum ditulis; tidak ada kredensial.
- Alamat halaman hanya membawa tab, kode bahaya, hari, kode kab; tidak ada data orang.
