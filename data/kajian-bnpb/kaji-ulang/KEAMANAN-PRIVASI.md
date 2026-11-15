# KEAMANAN-PRIVASI: Kaji ulang pasca-kejadian

| Data | Aturan |
| --- | --- |
| Kaji ulang, pelajaran, rekomendasi | Data operasi, tidak publik (Q6). Tidak ada berkas atau JSON di `public/`. Draf dihitung di Worker; potret beku di D1. Jawaban `private, no-store`. |
| Hak | Baca: staf Pusdalops, Koordalops, Pimpinan. Tulis pelajaran dan rekomendasi: Pusdalops, Koordalops (Q2). Sahkan: Koordalops atau Super Admin (Q3). Akun BPBD baca-saja (MATRIKS_SK `sk_instansi`), hanya kab wilayahnya dan kaji ulang yang sudah disahkan; di luar wilayah dijawab sama dengan kejadian tidak ada. Akun gerbang situs dan pemirsa baca-saja tidak menulis (sama dengan `dl_tindak`). |
| Nama personel lapangan | `penugasan.nama` dan `ops_pelajaran.oleh` tidak pernah masuk draf, potret, atau ekspor. Draf hanya memuat peran dan hitungan. Pola pencarian di uji menolak nama contoh yang ditanam di fixture. |
| Warga pelapor | Tidak ada nama, nomor, foto, koordinat tepat, atau `ip_hash`. Lifeline masuk hanya sebagai warna, kab, layanan, waktu. |
| Organisasi 3W | Hanya nama organisasi dan klaster yang sudah dipakai di 3W staf; tidak ada token, kontak, atau `alasan_internal` tawaran. |
| Teks pelajaran dan rekomendasi | Dibersihkan karakter kontrol dan spasi ganda; ditolak bila memuat nomor telepon atau surel (pola `teks()` di `src/pusdalops_umum.js`). Panduan isian: tulis sistem dan prosedur, bukan menyalahkan orang. |
| Catatan penutup | 20 sampai 300 karakter, bukan nomor telepon. |
| Penanggung jawab | Teks unit atau instansi, bukan akun orang dan bukan nama pribadi. |
| `oleh` | id akun; tampil sebagai nama staf hanya untuk staf, Pimpinan melihat peran (pola `dlNamaStaf`). |
| Kunci `kaji\|` di `dl_tindak` | Rute Dalops tidak menampilkan baris berawalan `kaji\|` supaya pembaca layar Dalops tidak melihat isi kaji ulang. |
| Tanpa registri orang | Tidak ada registri pengungsi per orang dan tanpa NIK. |
| Sumber luar | Hanya data sistem kita; tidak ada tarikan berita atau kabar luar; angka karhutla hanya dari sistem kita. |
| Riwayat | Riwayat status append-only lewat `dl_tindak_log`; batas laju 120 tulis per 10 menit per pengisi. |

Pemeriksa: `guard-api`, `security-reviewer`, `migrasi-idempoten`, `selera-angka` untuk teks layar.
