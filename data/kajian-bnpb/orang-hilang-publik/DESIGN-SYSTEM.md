# DESIGN-SYSTEM: Orang hilang publik

Tiru `/lapor` yang ada (`public/lapor/lapor.css`, token `public/inti/tema.css`, kartu `public/inti/kartu.css`). Tanpa palet sendiri, tanpa literal warna baru di luar `tema.css` (gerbang token warna). Susunan atom, lalu elemen, lalu blok, lalu layar (AGENTS 3.9). Teks lewat skill `bahasa-indonesia-plain`.

## Komponen

| Komponen | Pakai | Keadaan |
| --- | --- | --- |
| `.oh-jalur` kartu pilihan tiga jalur | kartu ikon besar, satu teks pendek | normal, fokus, ditekan, nonaktif (jalur foto saat bendera mati disembunyikan, bukan nonaktif) |
| `.oh-setuju` kartu persetujuan | daftar "Tampil" dan "Tidak pernah tampil", dua tombol sama besar | normal, menunggu foto dipilih, ditolak (penutup) |
| `.oh-pilih-kejadian` | kartu kejadian (jenis, kab, tanggal) satu per baris, radio | normal, tidak ada kejadian (kartu kosong dengan arahan) |
| `.oh-profil` kartu profil publik | foto kiri, nama, panggilan, umur rentang, pakaian, kecamatan dan tanggal, label kejadian | normal, anak (tanpa foto, ikon siluet), turun (tidak tampil publik) |
| `.oh-pil` pil status | Masih dicari, Menunggu peninjauan (hanya pelapor dan petugas), Sudah turun | satu pil per kartu |
| `.oh-info` tombol "Saya punya informasi" | membuka formulir pendek dengan sesi `/masuk` | normal, perlu masuk, terkirim |
| `.oh-laporkan` tautan "Laporkan profil ini" | teks kecil di kaki kartu | normal, terkirim |
| `.oh-bukan-saya` tombol "Saya orang ini, mohon turunkan" | tautan di kaki kartu, tanpa sesi, pesan pendek | normal, terkirim (D35) |
| `.oh-hasil-foto` | kartu profil + alasan satu kalimat + pil Mungkin mirip atau Mirip sedikit | normal, kosong, tidak bisa dibandingkan |
| `.oh-meja` kartu tinjau di meja | pratinjau publik berdampingan dengan panel privat bertanda "tidak tampil" | normal, anak, ada saran cocok |
| `.oh-saran` | baris alasan boolean (centang atau silang) | normal |

## Aturan

1. Satu kartu per profil, kartu tidak menempel (jarak 20 px, gerbang kartu tidak menempel).
2. Kepala bagian = nama seksi berikon ("Orang hilang", "Antrean tinjau"), tanpa kalimat kesimpulan; kartu mengikuti `kartu.css` standar tanpa kaki Sumber (AGENTS 3.5).
3. Kata status: Masih dicari, Menunggu peninjauan, Sudah turun, Mungkin mirip, Mirip sedikit. Tidak pernah "aman", "pasti", "cocok", "terdampak", "korban" (kecuali mengutip kategori petugas).
4. Foto: rasio tetap, tanpa filter, tanpa tombol unduh, `draggable=false`, `loading=lazy`. Foto anak tidak tampil publik: ikon siluet dengan teks "Foto tidak ditampilkan".
5. Tombol Setuju dan Tidak setuju **sama besar dan sama bobot** (tanpa pola gelap yang mendorong setuju). Tidak setuju bukan tombol bahaya merah.
6. Tidak ada nomor telepon, alamat, titik di kartu publik. Tombol kontak hanya "Saya punya informasi".
7. Panel privat di meja berlatar redup dengan label "Hanya petugas".
8. Ikon tanpa garis luar (tombol ikon polos). Pilihan berderet ujung ke ujung dengan ikon dan label Indonesia.
9. Aksesibilitas: kontras sesuai token; alt foto "Foto <nama panggilan>, rentang umur" (tanpa ciri lain); tombol berfokus terlihat; seluruh alur tanpa mouse; tidak mengandalkan warna saja untuk status (pil berteks).
10. Pesan 13 bahasa: kerangka kartu mengikuti `edukasi.json` dan kamus pesan `/lapor` yang ada; teks persetujuan wajib tersedia di Indonesia dan Inggris sejak awal, bahasa lain menyusul sesudah tinjauan hukum (Q18).
11. Teks layar tidak mengutip pasal peraturan sebelum tinjauan hukum selesai (Q18); rujukan hukum hanya di dokumen paket.
12. Tanpa titik tengah, tanpa ALL-CAPS, tanpa data dummy, tanpa tombol 🧪.
13. Layar sempit dulu (HP): satu kolom; daftar publik dua kolom hanya di lebar tablet ke atas.

## Teks utama (Indonesia; draf, dinilai RASA sebelum tayang)

| Tempat | Teks |
| --- | --- |
| Kepala jalur | "Layanan ini untuk orang yang hilang karena bencana." |
| Jalur A | "Keluarga saya hilang" |
| Jalur B | "Saya menemukan seseorang" |
| Jalur C | "Cari lewat foto" |
| Penyaring | "Hilangnya karena kejadian apa?" |
| Penutup bukan bencana | "Layanan ini hanya untuk orang yang hilang karena bencana. Untuk kasus lain, laporkan ke kepolisian terdekat. Dalam keadaan darurat, hubungi 112." |
| Persetujuan, judul | "Boleh kami tampilkan profil ini ke publik?" |
| Tampil | "Nama, foto yang Anda pilih, umur dalam rentang, dan kecamatan terakhir terlihat." |
| Tidak pernah tampil | "Nomor telepon Anda, alamat rumah, titik lokasi, dan hubungan Anda dengan orang ini." |
| Catatan | "Petugas memeriksa dulu sebelum profil tampil. Anda bisa mencabut kapan saja, dan profil langsung turun. Profil yang tampil bisa dilihat dan dibagikan siapa saja." |
| Pengungkapan foto | "Foto yang Anda unggah dikirim ke penyedia model kecerdasan buatan di luar negeri untuk dibaca cirinya." (di langkah foto dan di kartu persetujuan; D33) |
| Setuju / tidak | "Saya setuju" / "Saya tidak setuju" |
| Tidak setuju | "Tanpa persetujuan, profil tidak bisa dibuat di sini. Anda tetap bisa melapor ke kepolisian terdekat atau menghubungi 112." |
| Setelah kirim | "Laporan Anda sudah diterima. Petugas akan memeriksa dulu sebelum profil tampil." |
| Kartu profil | "Masih dicari. Terakhir terlihat di Kec. <kecamatan>, <kab>, <tanggal>." |
| Kirim informasi | "Saya punya informasi" lalu "Pesan Anda dibaca petugas, lalu diteruskan ke keluarga. Nomor Anda tidak dibagikan." |
| Hasil foto, ada | "Profil di bawah mungkin mirip. Ini bukan kepastian. Petugas dapat membantu memeriksanya." |
| Hasil foto, kosong | "Kami tidak menemukan profil yang tampak mirip. Ini tidak berarti orang itu tidak dicari." |
| Foto tidak disimpan | "Foto Anda tidak disimpan." |
| Menemukan, penutup | "Terima kasih. Petugas akan menghubungi bila ada keluarga yang cocok. Orang ini tidak akan tampil di halaman publik tanpa izinnya." |
| Cabut | "Cabut persetujuan" lalu "Profil akan langsung turun dari halaman publik." |
