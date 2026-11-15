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

Isian "Kabupaten atau kota" menjadi pilihan dari daftar yang menyesuaikan provinsi (isian teks dengan daftar pilihan; nilai yang dikirim adalah kode kabupaten). Teks yang tidak cocok dengan daftar ditolak dengan satu baris pesan di bawah isian: "Pilih kabupaten atau kota dari daftar." Bila daftar gagal dimuat, isian dinonaktifkan dan utas tetap bisa dikirim tanpa kabupaten.

### L2. Tanda di utas (`/alun-alun`)

Di baris daftar dan kepala rincian, sesudah pil yang ada:

- Pil "Terkait kejadian KJ-2026-0123" (ikon teruskan), menaut ke ringkasan publik kejadian. Hanya untuk kejadian yang sudah dipublikasikan. Di rincian, satu baris keterangan kecil: "Tanda ini menunjukkan keterkaitan, bukan kebenaran isi."
- Balasan lembaga: pil berikon perisai dengan nama lembaga ("BPBD Kabupaten Demak"). Kiriman pribadi orang yang masuk hanya berpil "Terverifikasi", tanpa nama lembaga.

Status bantuan memakai pil yang sudah ada (Terbuka, Ditangani, Selesai). Di rincian kebutuhan, bagian "Riwayat penanganan" berupa daftar ringkas: status, lembaga atau pelaku, alasan, waktu relatif. Catatan staf tidak tampil di sini.

### L3. Tombol "Belum selesai" (`/alun-alun`)

Di rincian kebutuhan yang berstatus Selesai, bagi penulisnya selama 14 hari: tombol "Belum selesai". Menekannya menampilkan konfirmasi di dalam halaman ("Buka lagi kebutuhan ini?"), bukan dialog bawaan peramban.

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
- Menekan "Buka" menampilkan rincian di panel yang sama: isi utas, balasan, riwayat (termasuk catatan staf), form "Balas sebagai <nama lembaga>", dan untuk kebutuhan deretan pilihan status tiga butir selebar wadah (Terbuka, Ditangani, Selesai).
- Memilih Selesai menampilkan deretan pilihan alasan baku selebar wadah dan isian "Catatan untuk staf (opsional)".
- Tombol "Tandai tidak valid" di kaki panel, dengan pilihan alasan baku dan konfirmasi di dalam halaman.
- Tidak ada dialog bawaan peramban; semua konfirmasi tampil di dalam halaman.

### L5. Kartu "Alun-alun" di Layar Pimpinan (`/admin/pimpinan`)

Kartu standar menggantikan kartu alun-alun yang ada.

- Baris angka (kiriman terverifikasi): Kebutuhan terbuka, Lama tak terjawab, Waktu respons (median 7 hari), Terjawab.
- Satu baris kecil di bawahnya: angka yang sama untuk kiriman tamu, berlabel "Kiriman tanpa akun".
- Tabel per provinsi: Provinsi, Terbuka, Lama tak terjawab, Terjawab, Belum ada di Buku Besar. Urut abjad provinsi; kepala kolom bisa diurutkan. Tidak ada kata peringkat.
- Baris kecil di pojok kartu: "Rekap <tanggal jam WIB>"; berwarna peringatan bila lebih dari 36 jam.
- Kosong: "Rekap belum tersedia."

Dasbor pimpinan `/bnpb/pimpinan` tidak diubah paket ini (KEPUTUSAN Q11).

### L6. Antrean "Ditandai tidak valid" (`/admin/alun`)

Kartu standar bernama "Ditandai tidak valid": tabel Judul, Wilayah, Alasan, Lembaga penanda, Waktu, tombol ikon "Sembunyikan" dan "Cabut tanda". Moderator yang mengubah status kebutuhan memilih alasan baku yang sama dengan kotak masuk.

### L7. "Belum ada di Buku Besar" (`/admin/alun`)

Kartu standar bernama "Belum ada di Buku Besar": hitungan per provinsi dari rekap, dan tabel Jenis, Judul, Wilayah, Bencana, Umur, tombol ikon "Buka" yang dimuat dari basis data saat provinsi dipilih. Pemilih provinsi di kanan judul.

### L8. "Kabar warga" di halaman kejadian (`/siklus`)

Kartu standar bernama "Kabar warga" di halaman satu kejadian: tabel Jenis, Judul, Wilayah, Waktu, Status bantuan, Balasan. Kosong: "Belum ada kabar warga yang terkait."

## Warna status

Memakai token pil yang sudah ada: Terbuka (kuning), Ditangani (biru), Selesai (hijau), Lama tak terjawab (jingga), Terverifikasi dan lembaga (hijau perisai), tanda kejadian (netral).

## Teks

Lugas dan sama di semua layar. Contoh: "Kebutuhan baru di alun-alun: <judul>, <kabupaten>.", "Belum ada utas di wilayah ini.", "Rekap belum tersedia.", "Terkait kejadian KJ-2026-0123". Kalimat galat lewat `PesanLayar.galat`.

## Seluler

Satu kolom di bawah 480 px, tanpa geser mendatar, sasaran sentuh paling kecil 44 px, ukuran huruf dalam rem.
