# Layar Ruang Instansi dan profil BPBD

Halaman ini menguraikan layar Ruang Instansi untuk akun lembaga dan alur profil BPBD dengan PIN.

## `/instansi`: Ruang Instansi (akun lembaga)
![Halaman Ruang Instansi di /instansi: form username dan sandi akun lembaga, dengan keterangan bahwa BPBD memilih profil lalu mengisi PIN.](gambar/layar-masuk-instansi.webp)


Halaman terbuka bagi tamu, tetapi isinya hanya hidup sesudah sesi sah. Alur layar:

1. Masuk dengan username dan sandi yang dibuat admin. Username dan sandi akun massal diberikan admin; sandi acak tampil sekali kepada admin.
2. Akun yang masih bersandi awal (`wajib_ganti = 1`) diarahkan membuat sandi baru. Sandi baru dibuat acak oleh server dan tampil sekali. Sesi lain akun itu dicabut.
3. Akun bukan BPBD: isi Verifikasi (nama, NIP atau NRP, pangkat, jabatan, unit, email dinas, nomor WhatsApp, telepon kantor), unggah surat tugas atau SK (PDF atau JPEG) dan foto kartu pegawai, lalu kirim. Status berubah dari `belum_klaim` menjadi `menunggu`, lalu admin atau staf menyetujui atau menolak dengan alasan.
4. Akun BPBD: lihat bagian Profil BPBD di bawah.
5. Akun aktif membuka menu: Tugas api, Kontak konsesi, tautan Inventori LogPal, tautan Data bencana, dan tab sisipan Peralatan, Korban, serta Laporan harian (khusus Pemerintah Provinsi).

Fitur utama akun aktif:

| Fitur | Isi | Berkas |
| --- | --- | --- |
| Tugas api | Daftar tugas per lokasi. Dua langkah: Konfirmasi (tenggat 6 jam: GPS, foto, PIC lapangan) dan Kabar tindakan (tiap 24 jam sampai padam) | `public/instansi.js`, `src/instansi.js` |
| Kartu Api | Satu layar: di mana, sebesar apa, situasi, kebutuhan | `public/instansi_kartu.js` |
| Penugasan dan pelacakan | Tugaskan orang, tautan `/lacak/<token>` tampil sekali, jejak posisi | `public/instansi_tugaskan.js` |
| Operasi per tugas | Layar operasi lapangan, API `/api/ops/*` | `public/instansi_ops.js` |
| Peralatan | Gudang dan alat per kategori, tandai sudah dicek | `public/instansi_alat.js` |
| Korban | Form cepat korban jiwa: meninggal, luka berat, hilang | `public/instansi_korban.js` |
| Laporan harian provinsi | Form laporan karhutla provinsi, terisi dari draf server | `public/instansi_laporan.js` |
| Notifikasi push | Opsional, hanya bila kunci VAPID ada di server | `public/instansi_push.js` |

Sebagian besar angka di kartu dan kebutuhan adalah perkiraan; kartu memuat label itu sendiri. Kunci tugas adalah lokasi, bukan identitas kompleks: kompleks yang berjarak 2 km atau kurang di kabupaten yang sama digabung (`GABUNG_KM = 2`, `src/instansi.js:33`).

## Profil BPBD: pilih profil, lalu PIN
![Alur akun BPBD dari sandi lembaga, pilih profil, dan PIN sampai sesi profil 12 jam, serta jalur pendaftaran akun baru dan status profil.](gambar/akses-instansi-profil-bpbd.svg)


Satu akun lembaga pemda (pemprov, pemkab, pemkot) memiliki paling banyak 4 profil orang (PIC). Cara pakai:

1. Masuk dengan username dan sandi lembaga. Setelah sandi awal diganti, layar menampilkan daftar profil seperti layar profil layanan streaming.
2. Akun baru (`belum_klaim` atau `ditolak`) harus mendaftarkan 3 PIC lengkap. Tiap PIC diisi nama, jabatan, NIP, email, nomor HP, dengan centang persetujuan data pribadi, foto muka (JPEG, maksimal 2 MB), dan PIN.
3. Unggah surat tugas dan foto kartu pegawai di akun, lalu tekan Kirim. Admin BNPB atau staf berwilayah menyetujui akun, kemudian profil.
4. Setelah akun aktif, klik foto profil dan ketik PIN enam angka. Sesi profil berlaku 12 jam. Ganti profil selalu lewat layar pilih profil dan PIN.
5. Profil tambahan (hingga 4) diajukan dan disetujui admin sesudah akun aktif.
6. Lupa PIN: admin BNPB mengatur ulang dari `/admin/instansi`. PIN sementara tampil sekali ke admin, dan PIC diminta menggantinya (`pin_wajib_ganti`).
7. Log lembaga (`GET /api/instansi/profil/log`) menampilkan tindakan per profil untuk lembaga itu sendiri.

Arti status profil: `draf` (disunting pemilik akun), `menunggu` (diajukan, menunggu admin), `aktif`, `dicabut` (tidak bisa masuk walau tahu sandi lembaga). Pil terkunci: terkunci sementara (hitung mundur ke jam buka) atau terkunci admin (hanya admin yang membuka).

Hal yang sering disalahpahami: sandi lembaga dipegang semua PIC (bawaan sementara Q5), sehingga PIC yang dicabut profilnya tidak bisa bekerja, tetapi sandi lembaga tetap sama kecuali admin mengatur ulangnya.

Meja `/lapor/meja` memakai sesi profil untuk akun BPBD; laporan yang diambil memakai nama profil pengambil dan waktunya masuk ke log (paket profil-bpbd K12). Nomor PIC hanya terlihat oleh staf BNPB.
