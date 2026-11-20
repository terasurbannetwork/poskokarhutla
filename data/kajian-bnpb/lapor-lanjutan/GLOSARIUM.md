# GLOSARIUM: Data lanjutan BPBD

| Istilah | Arti |
| --- | --- |
| Tahap 1, laporan awal | Laporan Lapor Bencana yang sama untuk warga dan BPBD (K1) |
| Tahap 2, data lanjutan | Pendataan per objek oleh BPBD sesudah laporan awal (K2) |
| Tahap 3, penutupan | Jawaban "selesai" beserta kondisi akhir dan versi beku (K3) |
| Berkas | Satu kejadian per kab/kota, berinduk nomor `LA-` laporan awal atau laporan induk kelompok KJ |
| Ketua berkas | Pelapor tahap 1 bertingkat `bpbd` |
| Anggota tim, `bpbd_tim` | Nomor WA yang ditambah ketua; hanya berhak atas berkas itu |
| Objek | Satu rumah, prasarana, tempat pengungsian, jiwa, korban, usaha, atau kebutuhan |
| Jiwa | Satu orang pengungsi, berinduk kepala keluarga |
| RB, RS, RR | Rusak berat (lebih dari 70%), sedang (30 sampai 70%), ringan (kurang dari 30%); sumber pedoman Q1 |
| Fungsi prasarana | Putus, terbatas, atau berfungsi |
| Nihil | Bagian sudah diperiksa dan memang tidak ada; bernilai 0 |
| Belum didata | Bagian belum diisi; bernilai kosong, tidak pernah 0 |
| Penanda | Peringatan mesin pada objek (tanpa titik, foto jauh, foto lama, dobel titik, NIK ganda, luar kab); tidak menolak simpan |
| Lencana foto | Asal titik foto: `gps` (peramban), `exif`, `wa` (bagikan lokasi), `tanpa` |
| Selesai dengan catatan | Ditutup BPBD tetapi masih ada korban hilang, pengungsi, atau prasarana putus |
| Versi beku | Salinan berkas saat ditutup, bersidik SHA-256, tidak pernah ditimpa |
| Pertanyaan harian | Satu pesan per berkas terbuka per hari ke ketua: masih berlangsung atau selesai |
| `TP-` | Nomor tetap tempat pengungsian (register `titik_pengungsian`) |
