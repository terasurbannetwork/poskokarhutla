# Petugas lapangan dan LogPal

Halaman ini menjelaskan layar petugas lapangan, inventori logistik LogPal, dan halaman keaslian dokumen yang masih rencana.

## Petugas lapangan (centurisk97.id/petugas)

Dibuka dengan tautan kode pribadi yang dibagikan kepada pegawai atau relawan.

1. Beranda menampilkan tugas hari ini serta status wajah, absen, dan catatan harian.
2. Persetujuan: sebelum mendaftarkan wajah, baca dan setujui teksnya. Persetujuan boleh dicabut. Begitu dicabut, data wajah dan foto acuan langsung dihapus, dan absen berikutnya selalu ditinjau petugas.
3. Daftar wajah: lima arah (depan, kiri, kanan, atas, bawah) lewat kamera depan, dengan petunjuk di layar. Untuk tiap arah, posisi kepala dan mutu gambar harus terpenuhi pada 5 gambar berturut-turut dalam 15 detik.
4. Absen masuk dan pulang: layar meminta satu gerakan acak (kedip atau menoleh), mengambil tiga titik GPS, dan memotret wajah dengan cap waktu, koordinat, wilayah, nama, dan tugas. Absen dapat disimpan di HP saat tidak ada sinyal dan terkirim otomatis begitu sinyal kembali.
5. Catatan harian: kegiatan, hasil, kendala, kebutuhan, kondisi lapangan, dan paling banyak 6 foto yang menyimpan lokasi pengambilan. Catatan terkunci setelah pukul 23.59 WIB pada tanggalnya. Tanggal ke depan atau di luar masa tugas ditolak.
6. Riwayat dan Regu (ketua regu melihat anggota tugasnya).

Status absen di riwayat:

| Status | Artinya |
| --- | --- |
| lolos | sah otomatis |
| tinjau | menunggu diperiksa petugas peninjau |
| sah | diputuskan sah oleh peninjau |
| tolak | diputuskan ditolak oleh peninjau |

Absen tidak pernah ditolak otomatis hanya karena kecocokan wajah atau GPS rendah. Yang meragukan masuk antrean tinjauan manusia.

Panel Lapangan (centurisk97.id/petugas/panel) dipakai staf pimpinan atau koordalops dan moderator ke atas. Isinya: peta personel, siapa belum absen atau mengisi catatan, antrean tinjau, daftar orang, impor data pegawai (hanya Super Admin), tugas dan anggota, panggilan relawan lewat WhatsApp, keahlian, dan unduhan tabel. Menolak absen wajib disertai catatan, dan peninjau tidak boleh memutus absennya sendiri.

## Inventori LogPal (centurisk97.id/instansi/logpal)

Hanya untuk yang sudah masuk. Tanpa masuk, Anda dialihkan ke /instansi. Ada dua belas tab:

| Tab | Isi |
| --- | --- |
| Stok | ringkasan gudang, sebaran per provinsi, daftar barang, cakupan laporan provinsi |
| Standar minimal | stok dibandingkan standar minimal (masih draf, berlabel) |
| Kebutuhan | analisa kebutuhan wilayah terdampak, hanya untuk staf |
| Jaringan logistik | jangkauan gudang, peta rute, usulan titik gudang berikutnya |
| Pengantaran | rencana kirim per kecamatan, cuaca jalur bantuan dari BMKG |
| Bantuan | bantuan peralatan dan logistik per BPBD per tahun (hanya baca) |
| Permintaan bantuan | ajukan permintaan dan pantau tahapnya |
| Input stok | tambah gudang dan barang |
| Mutasi barang | catat barang Masuk, Keluar, atau Penghapusan (dibuang karena rusak atau hilang) dan konfirmasi penerimaan |
| Stok opname | hitung fisik barang di gudang, berita acara, label QR barang |
| Pembuat laporan | delapan jenis laporan, unduh sebagai tabel atau halaman |
| Kesiapan audit | sebelas pemeriksaan yang lazim dilakukan auditor |

Aturan layar: BPBD hanya boleh mengubah gudang miliknya. Staf BNPB hanya mengubah gudang milik BNPB. Stok tidak pernah menjadi minus: pengeluaran yang melebihi stok ditolak. Tulisan "Belum ada data" pada kesiapan audit berarti belum ada barang yang diperiksa, bukan berarti lolos. Hati-hati: Ubah barang tidak tercatat di riwayat mutasi. Gunakan Mutasi bila perlu jejak. Jam tempuh, nilai buku, dan stok perkiraan berlabel perkiraan.

## Keaslian dokumen (centurisk97.id/verifikasi): masih rencana

Halaman ini belum tersedia. Rancangannya: siapa pun dapat membukanya tanpa akun lewat kode atau QR di lembar cetak. Halaman hanya menampilkan data sampul (jenis dokumen, judul, wilayah, periode, versi, penerbit, waktu terbit, status, dan 12 huruf awal sidik). Angka isi dan nama orang tidak pernah tampil. Status yang dirancang: Berlaku, Ada versi lebih baru, Dicabut, dan Tidak cocok. Pembaca juga dapat memilih berkas PDF yang dipegang; browser menghitung sidik digital berkas itu sendiri tanpa mengunggahnya.
