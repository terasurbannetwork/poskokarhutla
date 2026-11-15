# DESIGN-SYSTEM: Keterpaduan

Paket ini hampir tidak membuat layar baru. Komponen yang ditambahkan ke layar yang sudah ada mengikuti `public/inti/kartu.css` dan kartu standar AGENTS 3.5 (kepala kartu nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber).

| Komponen | Kelas | Isi | Tempat |
| --- | --- | --- | --- |
| Tanda kejadian | `.kj-tanda` | Pil kecil berisi `KJ-2026-XXXXXXXX`, ikon tautan, klik membuka `/siklus` di kejadian itu. Belum bertaut: pil abu "belum bertaut". Ambigu: pil kuning "perlu dipilih". | Baris tugas di `/instansi`, logbook, SIPPA, tugas lapangan `/petugas`, gempa |
| Pita antrean | `.antre-pita` (pakai ulang kelas yang ada di `public/bnpb/antre.js`) | "Belum terkirim: 3", tombol ikon kirim sekarang, tombol buka daftar. Hilang bila nol. | Semua halaman yang memakai antrean |
| Daftar antrean | `.antre-daftar` | Tabel: isi singkat, waktu, keadaan (menunggu, ditolak, keadaan berubah), alasan, tombol buang. | Laci dari pita |
| Titik pengungsian | kartu `.ex.ex-std` "Titik pengungsian" | Tabel titik per kab: nama, jenis, putaran terakhir, tanggal, jiwa, tanda basi. Peta kecil titik. | Meja pengungsi |
| Jejak orang | kartu `.ex.ex-std` "Jejak kerja" | Tabel per hari: absen, laporan, isian, tugas. | Profil orang di panel lapangan |
| Tinjau pasangan | kartu `.ex.ex-std` "Pasangan akun" | Akun, kandidat orang, alasan bentrok, tombol pilih atau lewati. | Admin |

Aturan bawaan: angka format Indonesia, tanpa huruf kapital semua, tanpa pemisah titik tengah, kartu tidak menempel (jarak 20 px), tombol ikon polos tanpa garis luar, tabel kepala navy tulisan putih.
