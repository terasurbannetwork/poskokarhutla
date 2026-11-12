# KEAMANAN-PRIVASI: Log tindak lanjut Usulan langkah

| Hal | Aturan |
| --- | --- |
| Tempat data | Hanya D1 produksi (`dl_tindak`, `dl_tindak_log`). Tidak ada di `public/` atau R2 publik. |
| Pengisi | Disimpan `staf:<id>` atau `admin:<hash 12>`. Nama staf hanya dibaca saat menjawab rute ber-sesi (Q3), tidak disalin ke log. |
| Catatan | Teks bebas maks 300 karakter, karakter kendali dibuang. Layar menulisnya lewat `textContent` (tanpa HTML). Staf diingatkan di placeholder untuk tidak menulis nomor HP atau nama warga. |
| Hak tulis | `modOK` atau staf pusdalops/koordalops; staf berwilayah dibatasi provinsinya (`dalamWilayahStaf`). Akun gerbang situs ditolak (`modOK` menolaknya). |
| Pemirsa baca-saja | Hanya GET (`pemirsaLihat` memang hanya untuk GET). |
| Penyalahgunaan | Batas laju 120 tulis per 10 menit per pengisi; badan permintaan maks 4 KB. |
| Riwayat | Append-only lewat rute; tidak ada rute ubah atau hapus. |
