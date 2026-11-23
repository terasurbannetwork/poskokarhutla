# PRD: Akun BPBD dengan profil PIC

Keputusan pemilik K1 sampai K9 di `KEPUTUSAN-PROFIL.md` menang atas dokumen ini. Fitur yang tidak ada di tabel F-* tidak dibuat.

## 1. Tujuan

Setiap BPBD provinsi dan kab/kota (553 lembaga) punya satu akun dengan satu username dan satu sandi. Di dalam akun ada paling banyak 4 profil orang (PIC) yang masing-masing berfoto, ber-PIN, dan tercatat dalam log. Akun baru bisa dipakai sesudah 3 PIC terdaftar lengkap dan admin BNPB menyetujui. Pemilik bisa menguji meja Lapor Bencana sebagai BPBD Sumatera Barat.

## 2. Peran

| Peran | Hak |
| --- | --- |
| Tamu | Hanya halaman `/instansi` untuk masuk |
| Sesi akun (username dan sandi benar) | Melihat daftar profil lembaganya, membuat dan melengkapi profil, mengunggah foto, mengatur PIN profil yang belum ber-PIN, mengunggah surat tugas dan kartu pegawai, mengirim untuk persetujuan, memilih profil dan memasukkan PIN. Tidak ada rute kerja |
| Sesi profil (sesi akun + PIN benar) | Semua rute kerja akun lembaga (tugas, isian, inventaris, meja Lapor Bencana, dan seterusnya) atas nama profil itu; melihat log lembaganya; mengganti PIN sendiri; mengubah datanya sendiri |
| Staf BNPB di meja (`hakMeja` jenis `bnpb`) | Melihat penangan tiap laporan, daftar PIC aktif BPBD wilayah laporan (tersamar sampai "Tampilkan"), dan angka respons per BPBD di layar Pimpinan. Tidak bisa mengambil laporan |
| Admin BNPB (moderator ke atas) | Membuat akun massal, menyetujui atau menolak pengajuan, menyetujui profil keempat, mencabut profil, mengatur ulang PIN, membuka kunci, melihat log semua lembaga |
| Staf verifikator BNPB | Menyetujui atau menolak akun di wilayahnya saja (aturan `ubahAkun` yang ada) |

## 3. Fitur

| No | Fitur | Keputusan | Larangan |
| --- | --- | --- | --- |
| F-1 | Akun pemda massal: 553 akun jenis `pemprov`, `pemkab`, `pemkot` lewat `POST /api/instansi/admin/buat`, disaring jenis pemda; sandi awal hanya tampil sekali | K1, D1, D7 | Tidak membuat Polda, Polres, Kodam, Kodim (Q6); tidak jenis akun baru |
| F-2 | Teks undangan baru dan CSV: username, sandi awal, tautan `/instansi`, langkah daftarkan 3 PIC. Teks "tugas api" dibuang | D7 | Teks tidak menyebut "Pantau Bencana"; tidak meneruskan sandi lewat saluran lain |
| F-3 | Masuk akun: username dan sandi, aturan batas laju dan sandi awal wajib diganti yang ada tidak berubah | K2 | Tidak ada kode WA untuk akun pemda (K9, Q1) |
| F-4 | Layar pilih profil: kisi foto dan nama, tanpa data pribadi lain | K2 | Tidak menampilkan NIP, email, HP |
| F-5 | PIN: klik foto, ketik PIN 6 angka; salah 5 kali mengunci 15 menit; 10 kali sehari mengunci sampai admin membuka | K3, Q2 | PIN tidak pernah di URL, log, atau jawaban API |
| F-6 | Data PIC: email, no. HP, NIP, foto muka, jabatan (nama tampil di profil) | K4 | Tidak ada kolom lain |
| F-7 | Foto muka sebagai foto profil: ambil dari kamera atau galeri, diperkecil di peramban, EXIF dibuang server, disimpan di R2 di balik sesi | K8, D6 | Tidak ada vektor wajah, tidak ada pencocokan, tidak ada pemeriksaan wajah |
| F-8 | Pendaftaran PIC oleh BPBD sendiri: paling banyak 4 profil per akun, 3 lengkap sebelum bisa dikirim; surat tugas dan kartu pegawai satu per akun tetap wajib (bawaan Q4) | K6, K7, D2, D5 | Profil kelima ditolak Worker dan D1 |
| F-9 | Persetujuan admin: akun naik `menunggu` lalu `aktif`; profil keempat memakai persetujuan sendiri | K7, D5 | Profil tidak bisa dipakai kerja sebelum akunnya aktif |
| F-10 | Log tindakan per profil: masuk akun, PIN benar, PIN salah, terkunci, ganti profil, keluar, dan tiap kiriman (POST) yang berhasil di rute kerja | K5, D4 | Isi pesan, foto, dan isian tidak masuk log; hanya jenis tindakan dan id objek |
| F-11 | Atur ulang PIN oleh admin: PIN sementara acak tampil sekali ke admin, profil wajib mengganti saat masuk berikutnya | Q3 | PIC lain tidak bisa mengatur ulang |
| F-12 | Cabut profil: sesi profil mati seketika walau sandi lembaga benar | Q5 | Sandi lembaga tidak berganti sendiri |
| F-13 | Meja Lapor Bencana dan data lanjutan membaca sesi profil, pelaku di riwayat meja memuat nama profil | D3, K5 | Meja tidak lagi membaca sesi `/masuk` untuk akun pemda |
| F-14 | Layar admin: daftar profil per akun, setujui, cabut, atur ulang PIN, buka kunci, log | K7, Q7 | Tidak ada ekspor massal data pribadi |
| F-15 | Tiap tindakan butuh sesi profil: rute kerja menolak sesi akun tanpa PIN | K3, D3 | Tidak ada jalan pintas "ingat saya" |
| F-16 | Papan aktivasi profil (K11, D9): papan yang ada di `public/admin/aktivasi.js` diperluas dengan kolom jumlah PIC (0 sampai 4), status akun, menunggu persetujuan, terakhir masuk per profil, dan tombol kirim ulang undangan (antrean `wa_antre`, atau teks salin bila tanpa WA) | K11, D9 | Tidak ada layar kedua; NIP, email, HP tidak tampil di papan; nomor tersamar; sandi tidak masuk antrean WA |
| F-17 | Pengambil laporan (K12, D10): profil BPBD mengambil laporan di meja, label "Ditangani: <nama>, <jabatan> BPBD <wilayah>"; waktu respons per BPBD (masuk ke dilihat, masuk ke ditangani; median dan p90) untuk staf BNPB di layar Pimpinan yang sudah ada | K12, D10, Q10 | Laporan yang belum diambil tidak dihitung nol; tanpa peringkat; tidak ada layar baru; tidak tampil ke pelapor |
| F-18 | Kontak PIC untuk Pusdalops (K13, D11, D12): PIC aktif tampil di meja BNPB dan di buku kontak `/admin/kontak` untuk staf BNPB; urut yang terakhir aktif di meja lebih dulu; kab tanpa PIC aktif memakai kontak panen | K13, D11, D12, Q9 | Nomor PIC tidak pernah ke pelapor, tidak di `public/`, tidak di `bpbd_kontak.json`; pelapor tetap memakai `src/lapor_kontak.js` |

## 4. Di luar paket

Akun Polda dan TNI (Q6), pencocokan wajah, pembacaan WA masuk, pengiriman PIN lewat WA atau email, tautan isian lama ke profil pembuatnya, dan papan aktivasi per kab (milik paket pintu masuk) tidak dibuat di sini.

## 5. Pertanyaan baru dari penyusunan paket (bawaan sementara)

Jawaban pemilik atas Q1 sampai Q8 tetap di `KEPUTUSAN-PROFIL.md`. Hal berikut muncul saat merancang dan belum diputuskan pemilik; semuanya **[BAWAAN SEMENTARA]**.

| No | Pertanyaan | Bawaan sementara | Tiket |
| --- | --- | --- | --- |
| N1 | Siapa mengatur PIN sebuah profil: pembuat profil atau pemilik profil? | Pemilik profil sendiri, saat pertama kali ia memilih profil itu, sebelum akun dikirim. Pendaftar tidak pernah mengetik PIN orang lain | PF-03 |
| N2 | Kolom data wakil di baris `instansi_akun` (nama, NIP, jabatan, unit, email, wa) terisi dari profil siapa? | Salinan PIC pertama yang lengkap saat akun naik `menunggu`, supaya CHECK `0029` terpenuhi tanpa membangun ulang tabel. Kolom `unit` diisi nama BPBD dari `wilayah` | PF-02 |
| N3 | Bila PIC pindah tugas, siapa menggantikan? | Admin mencabut profilnya dan BPBD menambah profil baru (persetujuan sendiri); tidak ada penggantian di tempat | PF-06 |
| N4 | Apakah foto diperiksa berisi wajah? | Tidak diperiksa mesin (K8); admin melihat foto saat menyetujui | PF-02 |
| N5 | Apakah halaman `/lapor/meja` boleh dibuka langsung tanpa melewati `/instansi`? | Halaman statis tetap terbuka; rute API-nya menolak tanpa sesi profil, tautan masuknya menunjuk `/instansi` untuk BPBD | PF-04 |
| N6 | Siapa menghapus data PIC atas permintaan pemilik data, dan lewat apa? | Pemilik repo menghapus baris profil `dicabut` lewat perintah D1; belum ada tombol admin | PF-06 |
| N7 | Pemegang sandi lembaga bisa mengunci profil orang lain dengan menebak PIN salah sengaja (DoS). Bagaimana kunci dibatasi? | Kunci 15 menit dihitung per profil dan IP; kunci harian (10 salah, sampai admin membuka) tetap per profil. Sisa risiko diterima dan dicatat | PF-02 |
| N8 | Siapa menangani laporan bila profil pengambilnya dicabut atau pindah? | Laporan yang pengambilnya berstatus `dicabut` boleh diambil ulang oleh profil BPBD lain di wilayah itu; tidak ada tombol "lepas" di paket ini | PF-08 |
| N9 | Apakah papan aktivasi ikut memuat 38 BPBD provinsi? | Ya: papan yang ada hanya memuat kab/kota (`mkPapanHitung` menyaring `tingkat = 'kab'`); K11 menyebut 553 BPBD, jadi baris provinsi ditambahkan di bagian atas | PF-07 |
| N10 | Apakah pesan kirim ulang undangan boleh memuat sandi awal? | Tidak. Sandi awal hanya ada di CSV; pesan antrean WA memuat username, tautan, dan petunjuk menghubungi admin. Sandi baru hanya lewat tombol atur ulang sandi yang ada dan hanya masuk teks salin, tidak ke `wa_antre` | PF-07 |
| N11 | Apakah nomor PIC cukup "disetujui admin" atau perlu bukti kepemilikan nomor (kode WA)? | Cukup disetujui admin (nomor diisi PIC, dilihat admin saat setuju); layar menulis "disetujui admin", bukan "terverifikasi kode" | PF-09 |
| N12 | Apakah label penangan terlihat oleh pelapor di halaman lacak? | Tidak | PF-08 |
| N13 | Apakah buku kontak `/admin/kontak` boleh menampilkan nomor PIC penuh? | Tidak: tersamar saja; nomor penuh hanya lewat meja BNPB yang mencatat pembukaan di `lapor_akses` | PF-09 |

## 6. Ukuran berhasil

553 akun terbuat; pemilik masuk sebagai BPBD uji, memilih profil, mengisi PIN, lalu melihat `/lapor/meja` dengan cakupan wilayah yang benar; log memuat satu baris per tindakan atas nama profil itu; profil yang dicabut gagal masuk walau sandi benar.
