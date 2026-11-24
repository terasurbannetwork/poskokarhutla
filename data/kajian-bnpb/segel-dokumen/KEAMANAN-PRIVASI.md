# KEAMANAN-PRIVASI: Segel dokumen

## 1. Data yang keluar ke publik

Hanya kolom sampul di tabel `segel` dan status hasil hitungan. Kolom `judul`, `wilayah`, `periode`, dan `penerbit` diisi dari daftar tetap di kode (bukan dari kalimat staf), sehingga tidak bisa membawa nama orang, nomor telepon, atau NIK. Isi dokumen tidak pernah dikirim oleh rute publik.

## 2. Ancaman dan penangkal

| Ancaman | Penangkal |
| --- | --- |
| Menyisir kode untuk menemukan dokumen | kode 50 bit acak; batas laju per hash IP; 404 seragam; jawaban tidak memuat isi |
| Memalsukan lembar dengan QR ke situs tiruan | lembar mencetak domain `centurisk97.id` sebagai teks; halaman verifikasi hanya di domain itu |
| Menyalin QR asli ke lembar yang angkanya diubah | halaman menampilkan wilayah, periode, versi, dan sidik pendek untuk dicocokkan; pencocok PDF menghitung sidik berkas |
| Menebak isi dari sidik penuh | rute publik hanya mengirim 12 huruf sidik isi |
| Status basi sesudah dicabut | jawaban publik `no-store` (D15) |
| Isi beku di D1 atau R2 diubah lewat jalur lain | hitung ulang saat dibaca (D5) menampilkan Tidak cocok dan mencatatnya |
| Berkas PDF pembaca bocor ke server | pencocokan di peramban, berkas tidak diunggah |
| Penyalahgunaan cabut | hanya moderator dan pimpinan; alasan wajib; tercatat; tidak bisa dibatalkan |
| XSS dari data sampul | layar memakai `textContent`, tidak `innerHTML` untuk data |

## 3. Batas klaim

Segel membuktikan bahwa lembar sama dengan yang tercatat di sistem saat terbit. Segel tidak membuktikan siapa yang menandatangani dan bukan tanda tangan elektronik tersertifikasi. Kalimat batas ini wajib tampil di halaman verifikasi; bunyi finalnya menunggu Q10.

## 4. Penyimpanan

Baris segel disimpan selamanya (Q8). Tidak ada data pribadi, jadi tidak ada jadwal hapus. Log pemeriksaan hanya menyimpan hash IP harian dan kode, untuk batas laju, dan ikut pembersihan `laju_*` yang sudah ada.
