# DESIGN-SYSTEM: Alun-alun Terpadu

Tidak ada palet atau komponen baru. Layar memakai kepala situs bersama, token Centurisk97, kartu standar `.ex.ex-std` dan tabel `.ex-tabel` dari `public/inti/kartu.css`, serta modul teks bersama `window.PesanLayar` (`public/inti/pesan.js`) untuk kalimat galat, tanggal, tanggal relatif, dan label.

## Aturan pemilik yang berlaku di sini

- Kepala situs bersama; tanpa palet lokal; warna lewat token (gerbang token warna).
- Kepala kartu adalah nama seksi berikon; tanpa kalimat kesimpulan; tanpa kaki sumber.
- Tanpa teks huruf kapital semua; tanpa titik tengah sebagai pemisah.
- Tombol ikon polos tanpa garis luar.
- Deretan pilihan selebar wadah, dibagi rata, berikon.
- Kartu tidak menempel; jarak 20 px. Kolom berdampingan berakhir sejajar.
- Angka dan tanggal format Indonesia; satu gaya tanggal (WIB) lewat `PesanLayar`; durasi lewat `fmt.durasi`.
- Klik tidak membekukan layar: kontrol berubah seketika, isi menyusul.
- Tanpa data contoh. Tidak pernah menulis "aman".

## Layar

### L1. Form tulis utas (`/alun-alun`)

Isian "Kabupaten atau kota" menjadi isian teks dengan daftar pilihan yang menyesuaikan provinsi (sama dengan langkah lengkapi di `/masuk`). Tetap bisa diketik bila daftar gagal dimuat. Tidak ada perubahan lain di form.

### L2. Tanda di utas (`/alun-alun`)

Di baris daftar dan kepala rincian, sesudah pil yang ada:

- Pil "Terkait kejadian KJ-2026-0123" (ikon teruskan), menaut ke ringkasan publik kejadian. Hanya untuk kejadian yang sudah dipublikasikan.
- Balasan lembaga: pil berikon perisai dengan nama lembaga ("BPBD Kabupaten Demak"), gaya sama dengan pil "Petugas" yang ada.

Status bantuan memakai pil yang sudah ada (Terbuka, Ditangani, Selesai). Di rincian utas "butuh bantuan", bagian "Riwayat penanganan" berupa daftar ringkas: status, lembaga, waktu relatif, catatan.

### L3. Balas sebagai lembaga dari halaman alun-alun

Di form balasan, bagi yang berhak: satu kotak centang "Balas sebagai <nama lembaga>". Saat dicentang, isian nama tampil disembunyikan dan tombol berbunyi "Kirim sebagai <nama lembaga>".

### L4. Kotak masuk di `/instansi` (tab "Alun-alun")

Kartu standar bernama "Alun-alun".

```
[ikon] Alun-alun                         [Jenis v] [Status v] [ ] Belum dijawab lembaga
| Jenis | Judul | Wilayah | Umur | Status | Tanda | Aksi |
```

- Tabel `.ex-tabel` menempel penuh, kepala navy bertulisan putih rata tengah.
- Kolom Tanda: "Terverifikasi", "Terkait kejadian KJ-...".
- Kolom Aksi: tombol ikon "Buka".
- Urutan bawaan: kebutuhan terbuka paling lama di atas.
- Di bawah 480 px: tabel menjadi daftar kartu baris.
- Menekan "Buka" menampilkan rincian di panel yang sama: isi utas, balasan, form "Balas sebagai <nama lembaga>", dan untuk utas "butuh bantuan" deretan pilihan status tiga butir selebar wadah (Terbuka, Ditangani, Selesai) dengan isian catatan saat memilih Selesai.
- Mengubah status dan menolak tidak memakai dialog bawaan peramban; konfirmasi tampil di dalam halaman.

### L5. Kartu "Alun-alun" di Layar Pimpinan (`/admin/pimpinan`)

Kartu standar menggantikan kartu alun-alun yang ada.

- Baris angka: Kebutuhan terbuka, Lama tak terjawab, Waktu respons (median 7 hari), Terjawab lembaga.
- Tabel "Kabupaten dengan kebutuhan terbuka terbanyak": Kabupaten atau kota, Terbuka, Lama tak terjawab, Terakhir dijawab. Sepuluh baris.
- Baris kecil di pojok kartu: "Rekap <tanggal jam WIB>"; berwarna peringatan bila lebih dari 36 jam.
- Kosong: "Rekap belum tersedia."

### L6. Dasbor pimpinan (`/bnpb/pimpinan`)

Dua baris angka baru di kelompok operasi tiap bencana: "Kebutuhan warga terbuka" dan "Lama tak terjawab", dengan keterangan sumber dan waktu seperti baris operasi lain.

### L7. "Belum ada di Buku Besar" (`/admin/alun`)

Kartu standar bernama "Belum ada di Buku Besar": tabel Jenis, Judul, Wilayah, Bencana, Umur, tombol ikon "Buka". Pemilih provinsi di kanan judul.

### L8. "Kabar warga" di halaman kejadian (`/siklus`)

Kartu standar bernama "Kabar warga" di halaman satu kejadian: tabel Jenis, Judul, Wilayah, Waktu, Status bantuan, Balasan. Kosong: "Belum ada kabar warga yang terkait."

## Warna status

Memakai token pil yang sudah ada: Terbuka (kuning), Ditangani (biru), Selesai (hijau), Lama tak terjawab (jingga), Terverifikasi dan lembaga (hijau perisai), tanda kejadian (netral).

## Teks

Lugas dan sama di semua layar. Contoh: "Kebutuhan baru di alun-alun: <judul>, <kabupaten>.", "Belum ada utas di wilayah ini.", "Rekap belum tersedia.", "Terkait kejadian KJ-2026-0123". Kalimat galat lewat `PesanLayar.galat`.

## Seluler

Satu kolom di bawah 480 px, tanpa geser mendatar, sasaran sentuh paling kecil 44 px, ukuran huruf dalam rem.
