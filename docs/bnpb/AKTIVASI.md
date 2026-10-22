# Aktivasi produksi api padam

Dijalankan pemilik di mesinnya sendiri, berurutan. Tiap langkah bisa dicek ulang dengan
`scripts/bnpb/aktivasi.sh` (tanpa argumen hanya memeriksa, tidak mengubah apa pun).

1. **Migrasi D1.** `scripts/bnpb/aktivasi.sh --terapkan`. Skrip menguji kering semua migrasi tertunda
   di salinan skema produksi, mencadangkan D1 ke `~/cadangan-poskowarga-<waktu>.sql`, lalu menerapkan.
   Per 22 Okt 2026 malam produksi sudah sampai 0041; yang tertunda 0042 sampai 0049, dan kedelapannya lolos uji kering.
   Kedelapannya hanya membuat tabel/trigger baru dan menambah kolom boleh-kosong (tanpa indeks unik, isi data, atau bangun ulang tabel),
   jadi isi data produksi tidak bisa menggagalkannya. 0047-0049 menyalakan tugas dan laporan harian untuk bencana selain karhutla.
   Jalan mundur: pulihkan dari berkas cadangan dengan `npx wrangler d1 execute poskowarga --remote --file <cadangan>`
   ke database baru, lalu arahkan `database_id`.
2. **Push.** `node scripts/bnpb/vapid.mjs`, lalu pasang `VAPID_PRIVAT`, `VAPID_PUBLIK`, `VAPID_SUBJEK`
   sesuai petunjuk yang dicetaknya.
3. **Token pipeline.** Buat satu nilai acak (`openssl rand -hex 32`), pasang sebagai secret Worker
   `PIPA_TOKEN` dan secret GitHub `PIPA_TOKEN` dengan nilai yang sama.
4. **Email.** Verifikasi domain `centurisk97.id` di Resend, lalu ganti `EMAIL_FROM` di `wrangler.jsonc`
   menjadi `Pantau Bencana <kabar@centurisk97.id>`. Selama masih `@resend.dev`, email hanya sampai ke
   pemilik akun Resend.

Setelah langkah 1, tugas api mulai dibuat otomatis pada putaran data berikutnya (level 3 dan level 2
bersyarat), dan dashboard kinerja mulai mengisi angka.
