# GLOSARIUM: Lapor Bencana BNPB

| Istilah | Arti |
| --- | --- |
| Pintu | Jalan masuk percakapan: WA (gateway bot) atau web (`/lapor`). Satu mesin untuk keduanya |
| Sesi lapor | Satu laporan sejak pesan pertama sampai terkirim, batal, atau kedaluwarsa |
| Isian | Satu butir data laporan dari spek (misalnya "meninggal", "kedalaman genangan") |
| Data umum | Isian Lampiran I yang berlaku untuk semua jenis bencana |
| Data khusus | Isian Lampiran III yang hanya berlaku untuk jenis tertentu |
| Wajib awal | Isian yang harus ada sebelum laporan bisa dikirim: jenis dan subjenis, waktu, lokasi |
| Nihil | Pelapor menyatakan "tidak ada"; dihitung terjawab |
| Belum didata | Pelapor belum tahu atau tidak menjawab; tidak pernah ditulis sebagai 0 |
| Kutipan | Potongan pesan pelapor yang menjadi dasar satu angka; angka tanpa kutipan dibuang |
| Asal isian | Catatan dari mana nilai datang: pesan, GPS perangkat, lokasi WA, EXIF, atau sistem |
| Tingkat sumber | `warga`, `bpbd_klaim` (mengaku petugas, belum dikonfirmasi), atau `bpbd` (dikonfirmasi) |
| Lencana foto | Kekuatan bukti lokasi foto: GPS perangkat, EXIF cocok, lokasi WA, tanpa lokasi; ditambah tanda curiga |
| Tiket | Catatan tindak lanjut satu laporan, bernomor sama `LA-DDMMYY-NN`, dengan status dan riwayat append-only |
| Monitoring | Layar staf `/lapor/meja`: Peta, Daftar, Foto |
| Izin uji | Daftar nomor yang boleh memakai layanan pada F0, diatur PEMILIK lewat `lapor izin` |
| PEMILIK | Nomor WA pemilik di `.env` mesin bot |
| F0, F1, F2 | Fase uji satu pengguna, rintisan BPBD, dan publik |
