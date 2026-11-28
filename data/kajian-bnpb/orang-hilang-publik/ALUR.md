# ALUR: Orang hilang publik, menemukan orang, mencari lewat foto

Bagian bercetak [bendera] aktif hanya bila bendera menyala (`OH_PUBLIK` untuk tayang, `OH_FOTO` untuk cari lewat foto). Sampai menyala, perilaku lama berlaku.

## 1. Pilih jalur (di `/lapor`, menu Orang hilang)

Tiga kartu bergambar, tanpa teks panjang: "Keluarga saya hilang", "Saya menemukan seseorang", "Cari lewat foto" ([OH_FOTO]; bila mati kartunya tidak tampil). Di atas kartu: "Layanan ini untuk orang yang hilang karena bencana." dan tautan 112.

## 2. Jalur A: melaporkan orang hilang

1. Identitas pelapor dan lokasi terakhir terlihat (alur K105 yang ada: nama, panggilan, kelamin, umur, hubungan, tinggi, berat, pakaian, waktu terakhir, foto sampai 10).
2. **Penyaring bencana (D24, langkah baru `cari_kejadian`)**: mesin mengambil daftar kejadian untuk kab/kota lokasi terakhir dalam jendela waktu (ALGORITMA 3) dan menampilkannya sebagai kartu "Kejadian apa?" (jenis, kab, tanggal). Pilihan: salah satu kejadian, "Bencana lain yang belum terdaftar" (Q23), atau "Bukan karena bencana". Bila "Bukan karena bencana": penutup jujur dengan arahan kepolisian dan 112 (D26), laporan tidak disimpan.
3. **Persetujuan tayang (D2, langkah `cari_setuju`)**: kartu menjelaskan dengan bahasa polos bidang apa yang akan tampil (nama, foto terpilih, umur, lokasi), apa yang tidak pernah tampil (nomor kontak, alamat rumah, titik, hubungan Anda), bahwa petugas memeriksa dulu, bahwa Anda bisa mencabut kapan saja, dan bahwa kabar bisa dibagikan orang lain. Pelapor memilih sampai 3 foto untuk tampil. Dua tombol: "Saya setuju" dan "Saya tidak setuju". Tidak setuju: jalur ditutup dengan arahan Polsek dan 112 (K111).
4. Anak: bila umur di bawah 18 atau tidak diketahui, kartu tambahan: "Anda wali anak ini?" Pilihan wali atau bukan; bukan wali dicatat dan menunggu keputusan petugas (Q5).
5. Ringkasan dan kirim. Hasil: baris `lapor_cari` (0173) ditambah baris `oh_publik` berstatus `menunggu`. Layar akhir: nomor laporan, "Petugas akan memeriksa dulu sebelum profil tampil. Anda akan melihat statusnya di Laporan saya."

## 3. Jalur B: melaporkan menemukan orang

1. Lokasi penemuan (GPS, atau pilih desa) dan waktu.
2. Kondisi orang itu (kartu): sadar dan bisa bicara, tidak sadar, terluka, anak, tampak bingung atau tidak bisa menyebut asalnya.
3. Apa yang diucapkan orang itu (nama, asal) dalam kata sendiri, dan siapa yang kini bersamanya (sendiri, saya, petugas, rumah sakit).
4. Ciri yang terlihat: perkiraan umur, kelamin, pakaian, tanda khusus. Foto: hanya bila orang itu atau walinya setuju ("Orang ini setuju difoto?" ya atau tidak). Tanpa setuju, tombol foto tidak tampil.
5. Kejadian terkait: seperti penyaring A. Bila tidak ada, laporan tetap masuk meja sebagai laporan non-tayang (menemukan orang membutuhkan pertolongan, bukan penyaringan; hanya **tayang** yang disaring K116).
6. Persetujuan tayang untuk daftar "Ditemukan, mencari keluarga" (Q9) ditawarkan **hanya bila orang itu dewasa, sadar, dan sendiri setuju** (dicatat petugas, bukan pelapor).
7. Kirim: baris `oh_temu` berstatus `menunggu`. Layar akhir: "Terima kasih. Petugas akan menghubungi bila ada keluarga yang cocok. Orang ini tidak akan tampil di halaman publik tanpa izinnya." Bila kondisi "tidak sadar" atau "terluka", kartu pertama justru menampilkan 112 dan nomor posko sebelum isian.

## 4. Jalur C: cari lewat foto [OH_FOTO]

1. Sesi `/masuk` wajib (D14): bila belum, kartu minta kode WA. Pesan: "Foto Anda tidak disimpan."
2. Kartu konfirmasi: "Foto ini orang yang Anda kenal atau yang Anda temukan? Unggah hanya bila Anda berhak." Tidak menanyakan nama.
3. Unggah satu foto (galeri atau kamera). Layar memproses dengan kata jujur: "Mencari yang mirip, ini bukan kepastian."
4. Hasil, salah satu: (a) sampai 3 kartu profil publik berlabel "Mungkin mirip" atau "Mirip sedikit" dengan alasan teks dan tombol "Hubungi petugas tentang profil ini"; (b) "Tidak ada profil yang tampak mirip. Ini tidak berarti orang itu tidak dicari" dengan tautan ke daftar publik dan jalur Menemukan orang; (c) "Foto tidak bisa dibandingkan" (buram, banyak wajah, bukan wajah); (d) bila foto tampak anak atau umur tidak jelas: berhenti sebelum pembanding dan diarahkan ke petugas (D32).
5. "Hubungi petugas" membuat baris di antrean `oh_info` bertipe `foto` yang memuat id profil, tingkat, dan pesan opsional, tanpa foto penanya.

## 5. Di meja (tinjauan, K113)

Tiap profil dan tiap laporan menemukan masuk antrean. Satu kartu per entri berisi: pratinjau persis yang akan publik; data privat (nomor, hubungan, foto asli, berat, lokasi rinci) di panel bertanda "tidak tampil"; kejadian terkait dan jendela waktu; tanda anak dan bukti wali; saran kandidat cocok (ALGORITMA 6); riwayat.

Aksi petugas (hak aksi `tayang`): **Tayang**, **Minta perbaikan** (catatan baku plus teks pendek, profil kembali ke `draf` dan muncul di Laporan saya), **Tolak** (alasan: bukan karena bencana, data tidak masuk akal, duplikat, anak tanpa wali sah, lainnya), **Ganti foto publik** (pilih atau coret), **Ubah kejadian**. Tayang butuh kejadian terkait terisi dan terkonfirmasi petugas (D24). Tiap aksi menulis `oh_riwayat`. **Daftar periksa wajib sebelum Tayang untuk dewasa (D34)**: petugas menelepon `nomor_dicari` bila ada untuk memastikan orang itu ingin dicari, menandai hasilnya (baku), dan memeriksa penanda "mungkin tidak ingin ditemukan" dari pihak ketiga; tanpa tanda centang tombol Tayang tidak aktif.

## 6. Setelah tayang

| Peristiwa | Hasil |
| --- | --- |
| Petugas menutup laporan `ditemukan_selamat`, `ditemukan_meninggal`, atau `tutup` (`ke_sar` tidak menurunkan, Q25) | Profil `turun` alasan `ditemukan` atau `ditutup`, seketika (K115, D11); foto publik dihapus |
| Pelapor menekan "Cabut persetujuan" (K114) | Hanya dengan sesi `/masuk` terbukti atau gateway WA; nomor ketikan ditolak 401 (D28). Profil `turun` alasan `dicabut`, seketika; foto publik dihapus; laporan privat tetap untuk petugas. Tanpa sesi: "Minta petugas mencabut", petugas memverifikasi lewat telepon ke nomor tercatat |
| Orang yang dilaporkan menekan "Saya orang ini, mohon turunkan" (D35) | Masuk antrean `oh_info`; petugas memverifikasi lewat jalur lain lalu menurunkan alasan `dicabut`; lokasi tidak pernah dibuka ke pelapor |
| 30 hari lewat tanpa perpanjangan (Q4) | `turun` alasan `kedaluwarsa`; di Laporan saya tombol "Masih dicari, tayangkan lagi 30 hari" mengembalikan ke `menunggu` bila persetujuan masih sah |
| Warga menekan "Laporkan profil ini" | Masuk antrean petugas; tidak turun otomatis kecuali 3 pelapor berbeda dalam 24 jam (HIPOTESIS), lalu `turun` alasan `dilaporkan` menunggu peninjauan |
| Warga menekan "Saya punya informasi" | Baris `oh_info` ke antrean petugas; petugas meneruskan ke pelapor lewat kontak yang ia pegang |
| Petugas mengonfirmasi cocok hilang dan ditemukan | Petugas yang menghubungi dua pihak; sistem hanya mencatat status kedua baris; profil hilang turun alasan `ditemukan` hanya bila petugas menutup laporan |

## 7. Keadaan profil

`draf` (di tengah obrolan, belum kirim) lalu `menunggu` lalu `tayang`, dan dari `tayang` atau `menunggu` ke `turun` dengan alasan; `turun` karena `kedaluwarsa` bisa kembali ke `menunggu`. `ditolak` dan `dicabut` tidak kembali (laporan baru dibuat bila perlu). Perpindahan lain ditolak mesin.

## 8. Kasus tepi

| Kasus | Perilaku |
| --- | --- |
| Pelapor tidak punya kejadian di daftar karena belum tercatat | Pilih "belum terdaftar"; petugas boleh menautkan ke kejadian yang ada atau menolak (Q23); tidak ada kejadian baru dibuat |
| Dua keluarga melapor orang yang sama | Duplikasi ditandai saringan kandidat (kab, kelamin, rentang umur, nama panggilan berbeda tidak dipakai); petugas menggabung satu tayang |
| Orang yang dilaporkan hilang sendiri menghubungi petugas dan tidak mau dikabari | D19, petugas hanya mengabarkan selamat tanpa lokasi |
| Foto menampilkan orang lain | Petugas memotong atau menolak foto (Q2) |
| Pelapor kehilangan nomor atau tidak punya sesi | Hubungi petugas dengan nomor laporan; petugas memverifikasi lewat telepon ke nomor tercatat (D28) |
