# DESIGN-SYSTEM: Log tindak lanjut Usulan langkah

Ikut `public/bnpb/dalops.css` dan kartu `.ex-std`; tanpa token baru.

| Komponen | Kelas | Bentuk |
| --- | --- | --- |
| Tanda status | `.dl-st-tl` + `data-st="belum|proses|selesai"` | Tombol pil kecil di ujung kanan baris langkah: Belum abu, Dikerjakan kuning, Selesai hijau dengan tanggal pendek. Ikon `tunggu`, `lanjut`, `ok`. |
| Hitungan pita | `.dl-tl-n` | Label biru di pita kelompok, sebelum jumlah kab/kota: "3 dari 12 selesai". |
| Dialog | `dialog.dl-tl-dlg` | Judul kab/kota dan jenis langkah, teks langkah, deretan tiga pilihan status ujung ke ujung sama lebar berikon, catatan (textarea 300 karakter), Simpan, lalu tabel riwayat (kepala navy). |
| Riwayat | `.dl-tl-rw` | Tabel: Waktu (tanggal dan jam WIB), Pengisi, Status, Catatan. Teks langkah saat itu di `title` baris. |

Tanpa huruf kapital semua, tanpa pemisah "·", tanpa kalimat kesimpulan. Tombol ikon tanpa garis luar. Mobile: dialog selebar layar dikurangi 16 px tiap sisi.
