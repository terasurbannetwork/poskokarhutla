# GLOSARIUM: Kejadian dari Laporan Warga

| Istilah | Arti di paket ini |
| --- | --- |
| Laporan | satu kiriman warga atau petugas lewat Lapor, bernomor tiket `LA-DDMMYY-NN` |
| Gugus | kelompok laporan berjenis sama yang berdekatan waktu dan tempat dari paling sedikit dua nomor pelapor berbeda, kode `GL-DDMMYY-NN` (A9) |
| Aturan satu desa | tambahan K85: laporan berjenis sama dengan kode desa sama dalam `JENDELA_DESA_JAM` disambung, selain aturan radius lama (ALGORITMA A1) |
| Kejadian laporan | satuan di paket ini: gugus, atau laporan tunggal. Bukan kejadian resmi |
| Kejadian K66 | kejadian yang dikonfirmasi pelapor saat melapor, kode `KJ-ddmmyy-NN`, hanya mengelompokkan laporan (`migrations/0160_lapor_kelompok.sql`) |
| Kejadian resmi | baris Buku Besar Kejadian, ID `KJ-` dari `scripts/siklus/pasang.py` |
| Buku Besar Kejadian | satu-satunya buku kejadian (`data/kajian-bnpb/siklus/`, F1); tidak ada buku kedua |
| Pencocok | `scripts/siklus/pasang.py`, satu-satunya jalan menempelkan atau mendirikan kejadian resmi |
| Pelapor | nomor WA berbeda; satu nomor yang melapor berulang dihitung satu |
| Pengecekan | tindakan BPBD atau staf pada kartu Pengecekan lapangan: Valid, Sebagian benar, Tidak valid (`lapor_periksa`) |
| Terverifikasi BPBD | lima syarat D4 / ALGORITMA A3; kata ini dipakai hanya untuk arti itu |
| Tayang | kejadian laporan memenuhi A3 dan tidak ditarik, sehingga muncul di `/lapor/hari-ini` |
| Tarik | staf menyembunyikan kejadian laporan dari halaman publik (`lk_tarik`, append-only) |
| Usulan | satu klik staf "Usulkan ke Buku Besar" menulis `lk_usulan`; kode `LU-DDMMYY-NN`; bukan nomor kejadian resmi |
| `usulan_staf` | tanda pada rekaman `lapor_ai` yang mengizinkan pencocok mendirikan kejadian baru (perubahan D29 oleh K87) |
| Alun-alun | tab publik di `/lapor` berisi laporan berstatus ditindaklanjuti atau selesai (K30, Q14); tidak berubah |
| Hari ini | 24 jam terakhir bergulir dari waktu verifikasi (Q9, bawaan sementara) |
| Rentang | angka terkecil sampai terbesar antarlaporan; tidak dijumlah (D28) |
| Daftar putih kolom | daftar kolom yang boleh keluar ke publik; objek publik dibangun dari kosong |
| Sinyal awal | lapisan peta utama laporan belum terverifikasi hanya bagi staf (D55); tidak terkait halaman publik ini |
| Saklar | `LAPOR_HARI_INI`, `LAPOR_USUL`; mati berarti rute 404 |
| Antrean tinjau | daftar sumber `ambigu` atau `tanpa_wilayah` yang diputuskan staf Siklus (`src/siklus_kejadian.js:295`) |
| HIPOTESIS | ambang tanpa sumber, menunggu data, tertulis sebagai konstanta tunggal |
| Bawaan sementara | jawaban sementara agent atas pertanyaan terbuka, bisa diganti pemilik |
