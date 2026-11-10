# KEAMANAN-PRIVASI

| Data | Tempat | Siapa membaca |
| --- | --- | --- |
| Pengaduan tanpa identitas | `meja_catatan.data` | moderator, staf Irtama/ULP |
| Identitas pelapor | `meja_pelapor` | hanya peran Irtama/ULP lewat `GET /api/meja/pelapor/:id` |
| Agregat pengungsi | `meja_catatan.data`, `meja_ringkas` | petugas kabupaten, admin; `/api/meja/ringkas` publik hanya angka per provinsi |
| Register risiko | `meja_catatan.data` | moderator; tidak publik |

Aturan:

- Identitas ditulis hanya oleh peran Irtama/ULP, tidak masuk `data`, jejak, rekap, ekspor, atau balasan daftar. Diuji oleh `tests/warga/meja.test.mjs` pada setiap jalur baca.
- Tiap pembukaan identitas tercatat di `meja_jejak` tanpa isi identitasnya, dengan batas laju per staf.
- Pelapor anonim: tidak ada baris di `meja_pelapor`.
- Peran Irtama/ULP belum terdaftar (Q1): sampai saat itu identitas tertutup untuk semua, tidak terbuka.
- Pengungsi tanpa nama atau NIK: kolom lain ditolak spek.
- Identitas Terlapor belum disimpan (Q6); masa simpan identitas pelapor belum ditetapkan (Q8).
- Data dummy memakai identitas berlabel `[DUMMY]` dan hanya di D1, terhapus tombol hapus.
