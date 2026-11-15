# RENCANA-UJI: Status Lifeline

Uji integrasi dengan D1 sungguhan (harness `tests/warga`), tanpa mock D1.

| Kode | Kriteria terima | Bukti |
| --- | --- | --- |
| T1 | Kejadian baru: semua sel abu untuk tiap kab di `sk_kejadian_kab`. | `node --test tests/warga/lifeline.test.mjs` |
| T2 | Tetapkan kuning tanpa bukti ditolak 400; dengan satu isyarat atau catatan 20+ karakter diterima. | sama |
| T3 | Riwayat bertambah tiap penetapan; tidak ada rute ubah/hapus riwayat. | sama |
| T4 | BPBD kab A tidak melihat dan tidak bisa menetapkan kab B; jawabannya sama dengan kejadian tidak ada. | sama |
| T5 | Usulan listrik: 3 `ip_hash` berbeda melapor padam dalam 24 jam = kuning; 2 = abu; satu `ip_hash` 5 laporan = abu; nama kab tak terpetakan = isyarat dilewati. | sama |
| T6 | Usulan tidak mengubah status resmi. | sama |
| T7 | IODA provinsi tidak pernah muncul sebagai warna sel. | sama |
| T8 | Bukti Lapor Warga tanpa nama, nomor, koordinat tepat. | sama |
| T9 | Basi: diperbarui 25 jam lalu tampil "lewat 24 jam", warna sama. | uji layar |
| T10 | Tiap kueri isyarat (Lapor Warga, logbook, meja, titik) terlayani indeks: EXPLAIN tanpa SCAN tabel besar, satu per isyarat. | sama |
| T11 | `PRAGMA foreign_key_list` ketiga tabel `lf_*` menunjuk `sk_kejadian` (gerbang keterpaduan hanya mencocokkan nama `*_kejadian`/`*_tugas`, jadi diuji sendiri). | `tests/warga/lifeline.test.mjs` |
| T12 | Sel jalan hijau, faskes hijau, faskes merah tidak pernah diusulkan otomatis (selalu abu tanpa staf). | sama |
| T13 | Dua kejadian aktif di kab yang sama menerima isyarat kab yang sama berlabel "isyarat kab". | sama |

Layar ditinjau pemilik di `http://localhost:8800/siklus/kejadian/<KJ>`.
