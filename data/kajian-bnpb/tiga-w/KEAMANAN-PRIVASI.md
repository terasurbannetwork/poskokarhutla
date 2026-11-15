# KEAMANAN-PRIVASI: 3W dan tawaran

| Data | Aturan |
| --- | --- |
| Register organisasi | Nama lembaga, bukan orang. Kontak orang tidak disimpan di `org`; bila perlu, lewat `kontak_pemangku` yang sudah ada. |
| Token organisasi | Hanya sha-256 disimpan; token tampil sekali saat dibuat; header `x-bantu`, tidak pernah di query string; dicabut lewat penanda, bukan hapus; berlaku sampai kejadian selesai. |
| Akses organisasi | Hanya baris 3W dan tawaran milik organisasinya di kejadian itu; tidak melihat organisasi lain, kebutuhan rinci per posko, atau keputusan tawaran organisasi lain. |
| Kebutuhan yang dicocokkan | Staf melihat rujukan meja/LogPal sesuai hak modul asalnya; organisasi hanya melihat status tawaran dan `alasan_organisasi`, tidak pernah `alasan_internal` (Q7). |
| Tidak publik | Q3. |
| Batas laju | Per token dan per akun staf untuk tulis. |
| Teks bebas | Kegiatan, syarat, alasan dibersihkan; nomor telepon ditolak. |

Pemeriksa: `guard-api`, `security-reviewer`, `migrasi-idempoten`.
