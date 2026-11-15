# KEAMANAN-PRIVASI: Status Lifeline

| Data | Aturan |
| --- | --- |
| Status dan riwayat | Data operasi, tidak publik (Q4). BPBD hanya kab wilayahnya; di luar wilayah dijawab sama dengan kejadian tidak ada. |
| Bukti dari Lapor Warga | Hanya jumlah pelapor dan waktu terakhir; tanpa nama, nomor, foto, koordinat tepat, atau `ip_hash` pelapor. |
| Bukti dari meja dan logbook | Hanya kode isyarat dan jumlah; tautan ke rincian mengikuti hak modul asalnya. |
| Catatan staf | 20-300 karakter, dibersihkan; tidak boleh memuat nomor telepon (ditolak bila cocok pola nomor). |
| `oleh` | id akun, tampil sebagai nama staf hanya untuk staf; pimpinan melihat peran. |
| Tetapkan status | Batas laju per akun; semua tulisan masuk `lf_riwayat`, tidak pernah diubah atau dihapus lewat rute. |

Pemeriksa: `guard-api`, `security-reviewer`, `migrasi-idempoten`; `validasi-model` untuk ambang usulan dan uji jujur.
