# TIKET (JK-*)

Selesai: JK-1 migrasi 0118, JK-2 spek lima juklak, JK-3 rute identitas pelapor, JK-4 ekspor Format 2-4, JK-5 dummy, JK-6 uji integrasi.
Selesai (Worker dan D1, 10 Nov 2026): JK-12 meja `dampak` dan migrasi 0119, JK-13 aturan kelengkapan `public/inti/kelengkapan.js`, JK-14 terima ke Logbook, JK-15 impor 200 baris, JK-16 kelengkapan per kabupaten dan tab admin, JK-17 tanda `belum_dimutakhirkan` (Jam Aturan `data_dinamis_darurat`).

Belum:

- JK-7. Daftarkan peran `irtama`, `ulp` (lima ubahan, Q1), plus akses staf ke `/admin/meja`. Pemilik berkas: `warga-api`.
- JK-8. Tanda "tempat pengungsian belum diperbarui" pakai `pengungsi_mutakhir` (butuh pembanding antarcatatan).
- JK-9. Format 6, 8, 9, 10 Juklak 17/2025 (rencana tindak, peristiwa, pemantauan, usulan risiko baru).
- JK-10. Laporan Format 1 dan 4 Juklak 9/2023 dalam bentuk surat, dan kaji cepat lanjutan Format 5/6 Juklak 3/2022.
- JK-11. Bila pemilik memutuskan (Q6): identitas Terlapor di tabel terpisah.
- JK-18. Layar `/meja` (bnpb) untuk meja `dampak`: formulir per `bagian` dengan meter kelengkapan hidup (fungsi `kelengkapan` dari `/inti/kelengkapan.js`, kolom dari `GET /api/meja/spek`), kolom bertipe `wilayah` (kec, desa) dikirim sebagai `kec`/`desa` di badan catatan, bukan di `data`; pilihan nihil per bagian. Pemilik: pengerja layar `public/bnpb/*`.
- JK-19. Dalops tab Laporan Masuk: bagian Data BPBD (`GET /api/meja/catatan?meja=dampak&status=diverifikasi`) dengan tombol Terima ke Logbook (`POST /api/meja/catatan/:id` `{aksi:"status", ke:"masuk_logbook"}`; 409 membawa `kandidat`, kirim ulang dengan `logbook_id`; 400 dengan `wajar` boleh dikirim ulang dengan `yakin:true`). Pemilik: pengerja layar `public/bnpb/*`.
- JK-20. Templat `public/bnpb/templat/data-dampak.xlsx` dan pembaca berkasnya di peramban (satu baris per kejadian, kolom sama dengan nama kolom spek; kirim ke `POST /api/meja/impor` `{baris:[{prov,kab,kec,desa,data}]}`). Pemilik: pengerja layar `public/bnpb/*`.
- JK-21. Pelatihan pengisian (materi, simulasi dengan data contoh). Bukan kode.
