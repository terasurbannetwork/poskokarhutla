# GLOSARIUM: Orang hilang publik

| Istilah | Arti di paket ini |
| --- | --- |
| Orang hilang | Orang yang hilang karena bencana (K116). Di luar itu tidak diterima di jalur ini |
| Orang dicari | Nama baris di `lapor_cari` untuk laporan orang hilang; sudah ada sejak 0173 |
| Profil publik | Tampilan terbatas dari laporan orang dicari yang tampil di halaman publik; dibentuk dari daftar putih bidang (D4) |
| Daftar putih bidang | `BIDANG_PUBLIK` di `src/orang_hilang_murni.js`: hanya bidang di dalamnya yang bisa tampil |
| Persetujuan tayang | Pernyataan pelapor bahwa profil boleh tampil, bernomor versi, dicatat (K111, D2) |
| Tayang | Status profil yang terlihat publik: sesudah setuju, tinjau petugas, dan kejadian bencana dikonfirmasi |
| Turun | Profil keluar dari publik; alasannya `ditemukan`, `ditutup`, `dicabut`, `ditolak`, `kedaluwarsa`, `dilaporkan` |
| Menunggu | Laporan sudah dikirim, belum ditinjau petugas |
| Tinjauan | Pemeriksaan manusia sebelum tayang untuk semua profil dan laporan menemukan (K113) |
| Verifikasi wali | Catatan petugas bahwa pelapor profil anak benar wali anak itu |
| Penyaring bencana | Dua lapis: pelapor memilih kejadian, petugas memastikan; syarat tayang (K116, D24) |
| Kejadian terkait | Satu baris kejadian di Buku Besar `sk_kejadian` yang ditautkan ke profil; bukan buku kejadian baru |
| Jendela waktu | Batas hari antara mulainya kejadian dan laporan (30 hari, HIPOTESIS, Q22) |
| Menemukan orang | Jalur B: warga melaporkan seseorang yang ditemukan dan belum diketahui keluarganya; tersimpan di `oh_temu` |
| Saran cocok | Daftar alasan dari saringan terstruktur antara orang hilang dan orang ditemukan; bukan skor, bukan vonis |
| Cari lewat foto | Jalur C: unggah foto, dibandingkan dengan foto profil publik; hasil "mungkin mirip" (D12) |
| Mungkin mirip, Mirip sedikit | Dua tingkat hasil pembanding foto; bukan kepastian |
| Pembanding visual | Panggilan model Claude yang menilai kemiripan ciri tampak dua atau lebih gambar; bukan pengenalan wajah biometrik |
| Biometrik | Data dari ciri tubuh yang dapat dipakai mengenali orang, termasuk vektor wajah; tidak dipakai di paket ini |
| Vektor wajah | Deretan angka dari wajah untuk dicocokkan; tidak dibuat dan tidak disimpan di Worker (aturan lapangan) |
| Foto turunan | Salinan foto yang dikecilkan dan bebas EXIF untuk publik; terpisah dari foto asli privat |
| Petugas | Akun meja BNPB atau BPBD kab/kota wilayah yang punya hak aksi |
| Hak `tayang` | Aksi meja yang boleh menayangkan, menolak, dan menurunkan profil |
| Bendera `OH_PUBLIK` | Variabel Worker yang menyalakan tayang publik; bawaan mati |
| Bendera `OH_FOTO` | Variabel Worker yang menyalakan cari lewat foto; bawaan mati |
| Saya orang ini | Tombol tanpa sesi di kartu profil agar orang yang dilaporkan meminta profilnya turun; diverifikasi petugas (D35) |
| Informasi | Pesan warga tentang profil, masuk antrean petugas, bukan ke pelapor langsung |
| Laporkan profil | Tanda warga bahwa profil bermasalah; masuk antrean petugas |
| Tidak ingin ditemukan | Penanda bahwa orang dewasa memilih tidak dihubungi keluarga; petugas hanya mengabarkan selamat tanpa lokasi (D19) |
| DPIA | Penilaian dampak pelindungan data pribadi, wajib sebelum fitur foto menyala |
| HIPOTESIS | Angka yang belum diukur; diubah lewat satu konstanta dan dinilai ulang |
| Token profil | Pengenal acak publik sebuah profil; bukan id berurutan |
| K91, K105 sampai K116, D126 sampai D130 | Keputusan dan rancangan paket `lapor-ai` yang mengikat paket ini |
