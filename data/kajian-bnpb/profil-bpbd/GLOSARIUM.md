# GLOSARIUM: Akun BPBD dengan profil PIC

Istilah dipakai sama di semua dokumen paket ini dan di kode. Urut abjad.

| Istilah | Arti di paket ini |
| --- | --- |
| Admin BNPB | pemegang cookie moderator ke atas atau staf verifikator yang menyetujui akun dan profil; stafnya terbatas pada wilayahnya |
| Akun | satu baris `instansi_akun` untuk satu lembaga (satu username dan satu sandi). Untuk BPBD jenisnya `pemprov`, `pemkab`, atau `pemkot` |
| Akun pemda | akun berjenis `pemprov`, `pemkab`, `pemkot`; satu-satunya jenis yang memakai profil |
| BPBD | Badan Penanggulangan Bencana Daerah, provinsi atau kabupaten/kota; 553 lembaga yang perlu akun |
| Buat massal | rute `POST /api/instansi/admin/buat` yang menyusun akun dari `pusat_kec.json`; di paket ini hanya untuk akun pemda |
| Cabut | aksi admin yang mematikan profil (`dicabut`) atau akun; berlaku seketika |
| Draf | status profil yang belum diajukan bersama akunnya |
| Kisi profil | layar L2: foto, nama, jabatan tiap profil aktif, untuk dipilih |
| Kunci admin | `kunci_admin = 1`: profil terkunci sampai admin membuka (10 PIN salah dalam satu hari) |
| Kunci sementara | `kunci_sampai` di masa depan: profil terkunci 15 menit setelah 5 PIN salah beruntun |
| Lengkap | profil dengan nama, jabatan, NIP, email, HP, foto, dan PIN terisi |
| Log profil | tabel `instansi_profil_log`, hanya menambah, disimpan 730 hari |
| Meja | halaman `/lapor/meja` tempat BPBD melihat dan menanggapi laporan Lapor Bencana |
| N1 sampai N6 | pertanyaan baru dari penyusunan paket ini, di `PRD.md` bagian 5, dengan bawaan sementara |
| Pelaku | teks yang tertulis di riwayat meja untuk orang yang bertindak, berisi nama BPBD dan nama profil |
| PIC | person in charge: orang yang ditunjuk BPBD sebagai pengguna akun; satu orang satu profil |
| PIN | enam angka rahasia milik satu profil; disimpan sebagai HMAC bergaram dengan `PROFIL_KUNCI` |
| PIN sementara | PIN acak hasil atur ulang admin; tampil sekali; wajib diganti saat masuk berikutnya |
| Profil | satu orang dalam satu akun: nama, jabatan, NIP, email, HP, foto, PIN; paling banyak 4 aktif |
| Profil mode | tanda di jawaban `masuk` bahwa akun memakai pilih profil dan PIN |
| `PROFIL_KUNCI` | rahasia Worker minimal 32 karakter untuk menghitung HMAC PIN |
| Reservasi percobaan | langkah menambah hitungan salah sebelum PIN dibandingkan, supaya tebakan serentak tetap terhitung |
| Sandi lembaga | sandi akun yang dipegang semua PIC; sandi awalnya dari CSV admin dan wajib diganti |
| Sesi akun | sesi dari username dan sandi benar (`sesi_instansi`, 30 hari); hanya memberi akses ke pendaftaran dan pilih profil |
| Sesi profil | sesi dari sesi akun ditambah PIN benar (`sesi_profil`, 12 jam); memberi akses ke rute kerja dan meja |
| Surat tugas dan kartu pegawai | dokumen verifikasi yang ada, satu per akun, tetap wajib (bawaan Q4) |
| Tolak | aksi admin yang mengembalikan pengajuan dengan alasan; akun `ditolak` dan profil kembali `draf` |
| UP, GP, L, P | kode uji: integrasi, gerbang, lokal oleh pemilik, produksi |
