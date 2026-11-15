# KEAMANAN-PRIVASI: Keterpaduan

| Data | Aturan |
| --- | --- |
| Tautan kejadian | Hanya nomor `KJ-`, sumber, dan kode; tidak memuat nama orang. Instansi hanya melihat tautan wilayahnya. |
| `GET /api/siklus/ingest/modul` | Kunci ingest saja; isi hanya kolom yang dibutuhkan pencocok (sumber, kode, jenis, prov, kab atau koordinat, mulai). Tidak ada nama PIC, nomor WA, atau isi laporan. |
| Antrean luring | Data tinggal di ponsel petugas sampai terkirim. Kode akses (`x-kode`, `x-lacak`) dibaca saat kirim dan tidak disimpan di butir. Vektor wajah hanya di IndexedDB, tidak pernah di cadangan localStorage, dihapus sesudah terkirim atau sesudah 36 jam. Keluar akun ditolak selama masih ada butir, seperti `public/pipa/antre.js`. |
| Spek | Tidak memuat data; aman disajikan publik seperti `GET /api/meja/spek`. |
| Titik pengungsian | Nama tempat dan koordinat adalah data operasi, tidak tampil di layar publik. Isian tetap agregat tanpa nama dan NIK (Juklak 9/2023). |
| `orang_akun` | Tidak menambah salinan nomor WA atau NIP; hanya penunjuk. Daftar tinjau hanya admin. |
| Jejak per orang | Orangnya sendiri dan admin (Q2); pimpinan hanya angka agregat. Akses jejak dicatat di `pantau_jejak`. |
| Pencocok orang | Berjalan di mesin pemilik, menulis SQL ke luar repo; daftar pasangan tidak pernah masuk git (repo publik). |

Pemeriksa: `security-reviewer` dan `guard-api` untuk rute baru; `migrasi-idempoten` untuk semua migrasi paket ini.
