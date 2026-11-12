# PRD: Log tindak lanjut Usulan langkah

## Lingkup

- Tiap baris langkah di seksi Usulan langkah (tab Banjir, menu Penanganan, `/bnpb/dalops`) punya tanda status: Belum, Dikerjakan, Selesai.
- Klik tanda status membuka dialog: teks langkah, pilihan status, catatan (maks 300 karakter), tombol Simpan, dan riwayat langkah itu (waktu, pengisi, status, catatan, teks langkah saat itu).
- Pita kelompok (Terdampak, Awas, Siaga, Pantauan) menunjukkan berapa langkah sudah Selesai dari semuanya.
- Pemirsa baca-saja dan Pimpinan melihat status dan riwayat tanpa bisa mengubah.

## Peran

| Peran | Baca | Tulis |
| --- | --- | --- |
| Pusdalops, Koordalops | ya | ya (staf berwilayah: hanya provinsi wilayahnya) |
| Pimpinan, pemirsa pusdalops | ya | tidak (Q2) |
| Moderator (ADMIN_TOKEN) | ya | ya |
| Akun gerbang situs, tamu | tidak | tidak |

## Larangan

- Tidak ada data log di `public/` (repo publik).
- Riwayat tidak bisa diubah atau dihapus lewat rute.
- Status tidak pernah mengubah daftar langkah; daftar tetap dihitung `H.mitigasi()`.
- Tidak ada kalimat kesimpulan di kartu (AGENTS 3.5).
