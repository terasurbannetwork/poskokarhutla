# Layar petugas lapangan dan LogPal

Halaman ini menguraikan layar petugas lapangan dan layar Inventori LogPal.

## `/petugas`: pegawai dan relawan lapangan

Dibuka dengan tautan kode pribadi `https://centurisk97.id/petugas#k=<kode>`. Kode disimpan hanya di `sessionStorage` dan dikirim lewat header `x-kode`.

1. Beranda menampilkan tugas hari ini, status wajah, status absen, dan status logbook.
2. Persetujuan: sebelum mendaftarkan wajah, baca dan setujui teks persetujuan (versi `2026-11-01`). Persetujuan dapat dicabut; vektor dan foto acuan dihapus seketika, dan absen berikutnya selalu ditinjau petugas.
3. Daftar wajah: lima arah (depan, kiri, kanan, atas, bawah) lewat kamera depan, berpanduan di layar. Per arah, syarat sudut dan mutu harus terpenuhi 5 frame berturut-turut dalam 15 detik.
4. Absen masuk dan pulang: tantangan acak (kedip atau toleh), tiga sampel GPS, foto bercap waktu, koordinat, wilayah, nama, dan tugas. Absen dapat disimpan di HP tanpa sinyal dan dikirim otomatis saat ada sinyal.
5. Logbook harian: kegiatan, hasil, kendala, kebutuhan, kondisi lapangan terstruktur, dan paling banyak 6 foto bergeotag. Logbook terkunci sesudah pukul 23.59 WIB pada tanggalnya; tanggal ke depan ditolak; tanggal di luar periode tugas ditolak.
6. Riwayat dan Regu (ketua regu melihat anggota tugasnya).

Status absen yang tampil di riwayat: `lolos` (otomatis sah), `tinjau` (menunggu peninjau), `sah` atau `tolak` (diputus peninjau). Absen tidak pernah ditolak otomatis hanya karena skor wajah atau GPS rendah; yang meragukan masuk antrean tinjauan.

Panel Lapangan `/petugas/panel` dipakai staf berperan pimpinan atau koordalops dan moderator ke atas: ringkasan (peta personel, siapa belum absen atau mengisi logbook), antrean tinjau (putus `sah` atau `tolak`; menolak wajib catatan minimal 3 karakter), daftar orang, impor CSV pegawai (hanya Super Admin), tugas dan anggota, panggilan relawan lewat bot WhatsApp, keahlian, dan ekspor CSV. Peninjau tidak boleh memutus absennya sendiri.

Hal yang sering disalahpahami: kode regu Posko lama (`x-kode-regu`) diterima sebagai pegawai, tetapi hanya untuk logbook dan baca profil; wajah dan absen butuh kode pribadi.

## `/instansi/logpal`: Inventori LogPal

Hanya untuk sesi sah. Tanpa sesi, halaman mengalihkan (303) ke `/instansi`. Alamat `/logpal/index.html` dijaga dengan gerbang yang sama. LogPal tidak masuk daftar putih (keputusan pemilik 9 November 2026).

Dua belas tab:

| Tab | Isi |
| --- | --- |
| Stok | ringkasan gudang, sebaran per provinsi, rekap per gudang, daftar barang, cakupan laporan provinsi |
| Standar minimal | stok dibandingkan standar minimal (draf Juklak, berlabel) |
| Kebutuhan | analisa kebutuhan wilayah terdampak; hanya staf |
| Jaringan logistik | jangkauan gudang, peta rute, usulan titik gudang berikutnya |
| Pengantaran | rencana kirim per kecamatan, cuaca jalur bantuan (BMKG), peta waktu tiba |
| Bantuan | bantuan peralatan dan logistik per BPBD per tahun (hanya baca) |
| Permintaan bantuan | ajukan permintaan dan lihat tahapnya |
| Input stok | tambah gudang dan barang, ubah barang |
| Mutasi barang | catat Masuk, Keluar, atau Penghapusan dan konfirmasi diterima |
| Stok opname | hitung fisik, berita acara, label QR barang |
| Pembuat laporan | delapan jenis laporan, unduh CSV atau HTML |
| Kesiapan audit | sebelas uji yang lazim diperiksa auditor |

Aturan layar: BPBD hanya menulis di gudang miliknya; gudang yang terbaca tetapi bukan miliknya menjawab 403, gudang di luar jangkauan baca menjawab 404. Staf BNPB menulis hanya di gudang berpemilik BNPB. Stok tidak pernah negatif: mutasi yang melebihi stok ditolak dengan 409. Pil "Belum ada data" pada kesiapan audit berarti belum ada baris sasaran, bukan lolos.

Hal yang sering disalahpahami: Ubah barang dapat mengubah jumlah tanpa meninggalkan baris mutasi (belum diputuskan pemilik, pertanyaan Q6). Jam tempuh, nilai buku, dan stok perkiraan berlabel perkiraan.
