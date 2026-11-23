# ALUR: Akun BPBD dengan profil PIC

Alur ujung ke ujung per peran dan per status. Nama rute lengkap ada di `DESAIN-TEKNIS.md`; aturan hitung ada di `ALGORITMA.md`.

## 1. Status

Akun (`instansi_akun.status`, enum yang ada, tidak ditambah): `belum_klaim` lalu `menunggu` lalu `aktif`; cabang `ditolak` (kembali ke `menunggu` sesudah diperbaiki) dan `dicabut`.

Profil (`instansi_profil.status`, baru): `draf` (belum diajukan), `menunggu` (diajukan, belum disetujui), `aktif`, `dicabut`.

```
akun:    belum_klaim --kirim (3 profil lengkap + surat + kartu)--> menunggu --setuju--> aktif
                                                                  menunggu --tolak--> ditolak --kirim ulang--> menunggu
profil:  draf --akun dikirim--> menunggu --akun disetujui--> aktif
         aktif --cabut--> dicabut
profil keempat, sesudah akun aktif: draf --ajukan--> menunggu --setuju profil--> aktif
```

## 2. Alur A: admin menyiapkan akun

1. Admin membuka `/admin/instansi`, menekan tombol buat massal. Layar memanggil `POST /api/instansi/admin/buat` berulang (mulai, batas 100) sampai `berikut` kosong. Hanya definisi `pemprov`, `pemkab`, `pemkot` yang dibuat (553).
2. Layar menyusun CSV: username, jenis, wilayah, sandi awal, teks undangan baru. Sandi tidak disimpan di mana pun selain CSV itu.
3. Admin mengirim teks ke kontak BPBD. Teks berisi username, sandi awal, tautan `/instansi`, dan tiga langkah: ganti sandi, daftarkan 3 PIC, tunggu persetujuan.

## 3. Alur B: BPBD mengaktifkan akun (K6, K7)

1. Wakil BPBD membuka `/instansi`, memasukkan username dan sandi awal. Jawaban `masuk` membawa `profil_mode: true` untuk akun pemda.
2. Akun masih `belum_klaim` dan `wajib_ganti = 1`: layar "Buat sandi baru" tampil, sandi acak tampil sekali. Layar berpesan: sandi ini dipegang semua PIC, simpan di pengelola sandi bersama.
3. Layar "Daftarkan PIC" tampil: kartu profil kosong 1 sampai 3 dan tombol tambah (sampai 4). Untuk tiap PIC: nama, jabatan, NIP, email, no. HP, foto (kamera atau galeri). Simpan membuat profil `draf`.
4. Tiap PIC memilih kartunya sendiri lalu mengatur PIN 6 angka dua kali (N1). Profil `lengkap` bila data, foto, dan PIN ada.
5. Satu orang mengunggah surat tugas (PDF atau JPEG) dan foto kartu pegawai (JPEG), seperti verifikasi yang ada (bawaan Q4).
6. Tombol "Kirim untuk disetujui" aktif bila 3 profil lengkap, surat dan kartu ada. Kirim menaikkan akun ke `menunggu`, profil lengkap ke `menunggu`, dan menyalin data PIC pertama ke kolom akun (N2), dalam satu batch.
7. Layar menunggu: "Menunggu persetujuan admin BNPB." Tidak ada rute kerja.

## 4. Alur C: admin menyetujui

1. Admin membuka antrean `menunggu`. Kartu akun menampilkan tiga profil: foto, nama, jabatan, NIP, email, HP, serta tautan surat dan kartu.
2. Setuju: akun `aktif`, semua profil `menunggu` miliknya menjadi `aktif`, jejak `setuju` dan log profil tertulis. Tolak: alasan wajib 3 sampai 300 karakter; akun `ditolak`, BPBD memperbaiki lalu kirim ulang.
3. Staf verifikator hanya untuk wilayahnya (aturan `ubahAkun`).

## 5. Alur D: kerja harian (K2, K3)

1. `/instansi` tanpa sesi: formulir username dan sandi.
2. Sandi benar: layar "Siapa yang bekerja?" berisi kisi foto profil aktif lembaga itu (maksimal 4) dengan nama dan jabatan. Profil terkunci tampil redup dengan keterangan "terkunci sampai 14.35" tanpa menghitung sisa percobaan.
3. Klik foto: dialog PIN 6 kotak. PIN benar: sesi profil terbit (12 jam), layar kerja `/instansi` tampil dengan nama profil di kepala. Meja `/lapor/meja` ikut terbuka tanpa masuk lagi.
4. Ganti orang: tombol "Ganti profil" memanggil keluar profil, kembali ke kisi; sesi akun tetap, PIN wajib lagi (Q8).
5. Keluar penuh: mencabut sesi profil dan sesi akun.

## 6. Alur E: PIN salah dan terkunci (Q2)

| Kejadian | Hasil |
| --- | --- |
| PIN salah ke 1 sampai 4 | "PIN salah", hitungan naik, log `pin_salah` |
| PIN salah ke 5 dalam 15 menit dari IP yang sama | PIN dari IP itu ditolak 15 menit, log `terkunci`; IP lain tetap bisa mencoba; PIN benar pun ditolak dari IP itu selama jendela (N7) |
| 10 PIN salah dalam satu hari kalender WIB | profil terkunci sampai admin membuka, log `terkunci_admin` |
| PIN benar | hitungan beruntun kembali 0, log `pin_ok` |

## 7. Alur F: PIN lupa (Q3)

PIC menghubungi admin BNPB. Admin menekan "Atur ulang PIN" di kartu profil; layar admin menampilkan PIN sementara 6 angka sekali. Admin menyampaikannya ke PIC. Saat PIC masuk dengan PIN sementara, layar langsung meminta PIN baru (`pin_wajib_ganti`). PIC lain di lembaga yang sama tidak punya tombol ini.

## 8. Alur G: PIC pindah tugas atau profil keempat (N3)

Admin mencabut profil lama (sesi profilnya mati saat itu juga). BPBD menambah profil baru lewat layar akun, mengunggah foto, PIC mengatur PIN, lalu menekan "Ajukan". Admin menyetujui profil itu. Akun tetap `aktif` selama paling sedikit satu profil aktif.

## 9. Alur H: pembukaan meja Lapor Bencana

1. Sesudah PIN benar, peramban memegang kuki `sesi_profil` berjalur `/instansi`, `/api/instansi`, dan `/api/lapor`.
2. Peramban membuka `/lapor/meja`; skrip memanggil `/api/lapor/meja`. `hakMeja` membaca sesi profil, mencari akun lewat id akun di sesi, dan menurunkan cakupan dari jenis dan wilayah akun.
3. Balasan atau perubahan status di meja memakai pelaku "BPBD Provinsi Sumatera Barat, <nama profil>" dan menulis satu baris log profil.
4. Tanpa sesi profil, meja menjawab 403 dan tautan masuknya membawa BPBD ke `/instansi`, bukan `/masuk`.

## 10. Alur I: pintu `/masuk` untuk akun pemda (K9, Q1)

Nomor WA yang cocok dengan `instansi_akun.wa` pemda tidak lagi menghasilkan ruang instansi atau sesi di `/masuk`. Halaman `/masuk` menampilkan petunjuk "Akun BPBD masuk lewat /instansi". Anggota `mk_anggota` untuk akun pemda tidak menghasilkan hak meja.

## 11. Alur galat

| Keadaan | Perilaku |
| --- | --- |
| Rahasia PIN (`PROFIL_KUNCI`) belum diisi | semua rute profil 503 dengan pesan "profil belum dikonfigurasi"; rute lain tetap jalan; tidak ada baris ditulis |
| Migrasi profil belum diterapkan | 503 "fitur profil belum diaktifkan (migrasi belum diterapkan)"; akun lama tanpa profil tidak terpengaruh |
| Sesi akun basi (tab lain memakai akun lain) | 401 lewat `x-akun`, seperti sekarang |
| Akun `dicabut` | semua sesi mati, masuk ditolak dengan pesan umum |
| Profil dicabut saat sedang bekerja | permintaan berikutnya 401 "profil tidak aktif; pilih profil lagi" |
