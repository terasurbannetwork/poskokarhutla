# DESIGN-SYSTEM: Lapor tanpa sinyal

Mengikuti `~/.claude/DESAIN.md` dan AGENTS.md 3.9: token dari `public/inti/tema.css`, atom dulu, baru layar. Tidak ada literal warna baru di CSS di luar `tema.css` (gerbang token warna). Layar mengikuti gaya `/lapor` yang ada (`lapor.css`), tanpa palet lokal.

## Komponen

| Komponen | Pakai | Keadaan |
| --- | --- | --- |
| Pita koneksi `.lp-sinyal` | Kartu tipis di atas halaman | tersambung (tersembunyi), tanpa sinyal, sinyal lemah, menyambung kembali |
| Kartu Siapkan | Kartu beranda berikon, daftar centang | belum, sebagian (tiap baris punya keadaannya), siap |
| Formulir luring `.lp-luring` | Kartu bertahap: jenis, lokasi, waktu, korban, foto dan ringkasan | tiap langkah: kosong, terisi, galat |
| Kartu jenis | Kartu jenis bencana yang sudah ada | dipakai ulang tanpa gaya baru |
| Pilihan segmen | Baris pilihan rata penuh (waktu, korban), berikon, label Indonesia | normal, dipilih, galat |
| Kotak lokasi | Koordinat, akurasi, tombol Coba lagi, tombol Pilih kab/kota | membaca, berhasil, akurasi rendah, gagal |
| Pita belum terkirim | `.antre-pita` dari antre.js | menunggu, galat (ditolak), kosong |
| Layar tersimpan | Konfirmasi besar, ikon HP dan centang, ringkasan | tersimpan, terkirim |

## Aturan

- Gaya satu tangan: target sentuh paling kecil 44 px, tombol utama di bawah, tulisan paling kecil 14 px. Layar terang tampil jelas di bawah matahari: kontras tinggi, tanpa abu muda di atas putih.
- Tanpa HURUF KAPITAL SEMUA, tanpa titik tengah sebagai pemisah, tanpa tanda pisah panjang. Kata "aman" tidak dipakai.
- Kartu tidak menempel: jarak 20 px (gerbang yang ada).
- Pita tidak menampilkan lokasi, nomor, atau isi ringkasan; hanya jenis, jam, dan keadaan (KEAMANAN-PRIVASI).
- Gerak dikurangi bila `prefers-reduced-motion`; Sigap mengikuti aturan maskot yang ada (K76).
- Teks tetap pesan luring (tanpa sinyal, tersimpan, terkirim, ditolak, alasan galat) masuk berkas pesan tetap 13 bahasa (D82 paket induk) dan disimpan di cangkang; yang belum ditinjau penutur berlabel sama seperti pesan darurat.
- Peringatan 112: kartu 112 dan nomor penting selalu terlihat di formulir luring (K68, edukasi).

## Teks utama (Indonesia)

| Tempat | Teks |
| --- | --- |
| Pita | "Tanpa sinyal. Laporan tetap bisa disimpan di HP." |
| Tombol | "Lapor tanpa sinyal" |
| Konfirmasi | "Laporan tersimpan di HP. Akan terkirim otomatis begitu ada sinyal." |
| Pita terkirim | "Laporan terkirim. Nomor tiket {nomor}." |
| Ditolak | "Laporan belum bisa diterima: {alasan}. Anda bisa menyusun ulang." |
| Belum siap | "Perangkat ini belum disiapkan. Saat ada sinyal, ketuk Siapkan lapor tanpa sinyal. Untuk keadaan darurat sekarang, hubungi 112." |
| GPS gagal | "Lokasi belum terbaca. Coba di tempat terbuka, atau pilih kab/kota." |
| Foto tua | "Foto ini diambil lebih dari 5 menit lalu. Ambil foto baru langsung dengan kamera." |
| Penyimpanan penuh | "Penyimpanan HP penuh, laporan belum tersimpan. Kirim yang menunggu dulu atau kosongkan ruang." |
