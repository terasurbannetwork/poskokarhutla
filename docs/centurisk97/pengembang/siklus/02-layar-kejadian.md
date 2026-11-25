# Layar daftar dan halaman kejadian

Halaman ini merinci daftar Buku Besar, halaman satu kejadian, ringkasan publik, dan antrean nomor GLIDE.

## Daftar Buku Besar, `/siklus/kejadian`

Siapa: staf dan akun BPBD (hanya wilayahnya). Membuat kejadian baru hanya Pusdalops, Koordalops, atau Super Admin.

Langkah pakai:

1. Pilih kelompok bencana pada segmen teratas.
2. Pilih rentang 7 hari, 30 hari, 1 tahun, atau Arsip. Daftar hidup menampilkan 100 kejadian sekali muat, tombol "Muat 100 lagi" melanjutkan.
3. Saring menurut fase, provinsi, atau kata cari (nomor, nama, wilayah). Tabel dipaginasi 50 baris.
4. Untuk arsip, pilih tahun dan provinsi dahulu. Baris arsip hanya bisa dibuka bila wilayahnya terpetakan.
5. Klik baris untuk membuka halaman kejadian.

Arti isian: kolom KJ adalah nomor kejadian yang tidak berubah sepanjang hidup kejadian. Kolom Publik menunjukkan apakah ringkasan resmi sudah dibuka untuk umum. Tanda "contoh" menandai baris dummy. "wilayah belum terpetakan" berarti kabupaten belum dapat dipasangkan, dan pil menunggu menyertainya.

Yang sering disalahpahami: arsip adalah kejadian riwayat 2011 sampai sekarang yang disimpan di R2, bukan di D1. Kejadian arsip baru masuk D1 bila "dipromosikan" oleh Pusdalops atau Koordalops, dan hanya yang punya kabupaten.

## Halaman satu kejadian, `/siklus/kejadian/KJ-tahun-kode`

Siapa: staf dan akun BPBD (wilayahnya) melihat versi lengkap. Tamu dan sesi tanpa hak melihat ringkasan publik (lihat bagian berikutnya).

Kartu yang tampil (urutan dapat bergeser menurut peran dan data):

1. Identitas dan fase kejadian, dengan tombol sesuai peran: Verifikasi, Naikkan, Mundur, Batalkan, Gabung, Promosikan, Pindahkan (koreksi sumber), dan Nomor GLIDE.
2. Garis waktu (jejak perpindahan fase, gabung, koreksi, publikasi).
3. Dampak per sumber: tabel metrik (meninggal, hilang, luka, terdampak, mengungsi, rumah rusak berat, sedang, ringan, terendam) dengan satu kolom per sumber dan kolom Selisih. Tidak ada kolom total.
4. Sumber terpasang: baris DIBI, Logbook, gempa, banjir, dan sumber hidup lain yang sudah dipasangkan ke kejadian ini.
5. Tahap kejadian: kartu tahap kejadian. Rancangan paket Rantai (kaji, SK status, posko, logistik, DSP, Jitupasna, hibah) belum terimplementasi, sehingga isi kartu ini mengikuti kode layar dan belum terdokumentasi lengkap.
6. Sekitar titik pusat (atau "Sekitar pusat desa (perkiraan)"): ringkasan paparan bangunan dan jiwa.
7. Layanan: kisi Status Lifeline.
8. 3W dan Bantuan: kartu siapa mengerjakan apa dan tawaran bantuan.
9. Ringkasan resmi dan tombol publikasi (Koordalops saja).

![Enam fase hidup satu kejadian dan pembagian wewenang Pusdalops, Koordalops, dan sistem.](gambar/siklus-fase-kejadian.svg)

Langkah mengubah fase:

1. Fase hidup berurutan: terdeteksi, terverifikasi, tanggap, transisi, pemulihan, selesai. Hanya maju atau mundur satu langkah yang sah.
2. Pusdalops hanya boleh memverifikasi atau membatalkan kejadian terdeteksi. Perpindahan fase lain hanya oleh Koordalops atau Super Admin.
3. Masuk fase tanggap mewajibkan tanggal tanggap mulai. Masuk transisi mewajibkan tanggal tanggap akhir. Mundur, selesai, dan dibatalkan mewajibkan alasan 3 sampai 200 karakter.
4. Verifikasi mewajibkan kabupaten sudah terpetakan.
5. Dari transisi ke pemulihan, sistem menolak bila belum ada R3P berstatus diusulkan atau lebih (bila tabel R3P sudah ada).

Gabung kejadian hanya oleh Koordalops, hanya antar kejadian berfase sama, dan tidak ada fungsi pecah. Kesalahan gabung dibetulkan dengan memindahkan satu baris sumber (Pindahkan) ke kejadian lain atau ke kejadian baru. Kejadian dummy dan nyata tidak bisa dicampur.

Yang sering disalahpahami: sistem hanya membuat kejadian berfase terdeteksi dan menandai siap verifikasi (dua nama sumber berbeda). Sistem tidak pernah menaikkan fase sendiri. Kejadian "basi" (terdeteksi lebih dari 3 hari tanpa pembaruan) hanya mendapat tanda tampilan, fasenya tidak berubah.

## Ringkasan publik satu kejadian

Siapa: siapa saja, di `/siklus/kejadian/<nomor KJ>`, hanya bila Koordalops sudah mempublikasikannya.

Isi: jenis, wilayah (kabupaten atau provinsi), fase, tanggal mulai, ringkasan resmi 20 sampai 600 karakter, label keyakinan, dan waktu diperbarui. Ada panel "Lisensi dan atribusi" dari daftar sumber. Halaman sengaja tanpa nama korban dan tanpa rincian per orang. Angka korban atau terdampak di bawah 5 ditulis "di bawah 5".

Syarat publikasi: kejadian bukan terdeteksi, bukan dibatalkan atau digabung, dan bukan dummy. Bila belum dibuka atau nomor tidak ada, halaman menulis "Ringkasan resmi untuk kejadian ini belum dibuka untuk umum, atau nomornya tidak ditemukan".

## Antrean dan nomor GLIDE

Siapa: Pusdalops, Koordalops, Super Admin.

Antrean memuat dua jenis butir: ambigu (lebih dari satu kejadian kandidat) dan tanpa wilayah. Untuk tiap butir pilih salah satu kandidat, "baru" untuk membuat kejadian baru, atau tolak. Butir tanpa wilayah membutuhkan kabupaten. Sistem tidak pernah menebak.

Kartu "Kejadian besar tanpa GLIDE" mengingatkan staf untuk meminta nomor GLIDE ke ADRC. Kejadian besar di sini berarti kejadian yang tanggal tanggap daruratnya sudah terisi. Nomor yang diterima diisi lewat tombol "Isi nomor", dan disimpan sebagai sumber `glide` pada kejadian.
