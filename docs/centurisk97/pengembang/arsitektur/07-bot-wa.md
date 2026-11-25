# Bot WhatsApp: pemakaian

Halaman ini menjelaskan pemakaian Bot Laporan BNPB untuk nomor terdaftar. Pipeline dan pagar angka ada di [halaman berikutnya](/docs/pengembang/arsitektur/bot-wa-pipeline).

## Pemakaian bot untuk nomor terdaftar

Akses: hanya nomor yang terdaftar. Nomor asing hanya dibalas satu kali sehari dengan pemberitahuan bahwa bot hanya bisa dipakai nomor terdaftar. Pendaftaran dilakukan pemilik sistem dengan perintah `setuju <nomor> [nama]` dan dicabut dengan `tolak <nomor>`. Bot membuat laporan resmi BNPB dari bahan yang dikirim, merevisinya lewat percakapan, lalu mengunggah hasil final ke Drive tim IT.

Langkah memakai (jenis yang dikenal: laporan harian bencana dan laporan penanganan karhutla; daftar `LAPORAN_PROYEK` menambah paparan banjir sepekan dan laporan khusus gempa, tanpa bahan WhatsApp):

1. Ketik `buat harian` atau `buat penanganan` (boleh kalimat biasa seperti "bikinin laporan harian kemarin"). Tanggal boleh `kemarin`, `26 okt`, `26/10`, atau `2026-10-26`.
2. Bot menjawab daftar bahan wajib dan tambahan, dengan yang sudah masuk ditandai. Kirim bahan (teks, PDF, foto, atau Excel). PDF dan foto dibaca menjadi teks dulu; bila hasilnya kosong bot memberi tahu dan tidak menebak.
3. Laporan selalu menunggu perintah `lanjut`. `lanjut` saat bahan wajib belum lengkap membangun dengan bahan yang ada dan mencatat kekurangannya.
4. Bot mengirim pratinjau slide yang berubah lebih dulu, lalu PDF menyusul. Pada tahap draf: `1` atau `revisi` (kirim beberapa pesan revisi lalu `selesai`), `2` atau `final`, `3` atau `pptx`, `4` atau `versi`, `5` atau `batal`, `balik v2` (pakai isi versi 2), atau kalimat biasa untuk merevisi atau bertanya isi draf.
5. `final` (juga dari kalimat bebas, yang selalu ditanya dulu) mengunggah berkas final ke Drive tim IT.
6. Lainnya: `status`, `ulangi`, `batal`, `bantuan`, `panduan` (PDF), `changelog`, dan `infografis 2025`, `infografis 2026-10`, atau `infografis 2026-T3` (infografis bencana dari data DIBI, hanya dikirim ke pengirim). Hanya nomor pemilik: `kirim ulang harian <tanggal>`, `status <tanggal>`, dan `biaya` (`scripts/wa/proyek.mjs:150-190`, `scripts/wa/perintah.mjs`).

Hal yang sering disalahpahami:

- Angka titik panas, firespot, luas terbakar, dan luas belum padam hanya dari sistem Centurisk97. Pesan WhatsApp dan revisi tidak bisa mengubahnya; bot menolak dan menawarkan catatan kecil di slide sebagai gantinya.
- Revisi bukan menyunting PPTX secara bebas. Deck dibangun ulang oleh generator, lalu perubahan diterapkan di atasnya, sehingga format tetap konsisten pada revisi ke berapa pun.
- Pesan yang masuk selagi mesin bot mati tidak disimpan dan tidak diproses saat mesin menyala. Rute `GET /api/wa/proyek/daftar` mengembalikan detak mesin (`src/wa_proyek.js:267-271`), yang dipakai untuk memberi tahu rentang mati; penampil di layar belum terdokumentasi di kode.
- Bot ini tidak sama dengan pintu WhatsApp Lapor Bencana untuk warga. Keduanya dapat berjalan di nomor terpisah (`WA_PERAN`, lihat [pipeline bot](/docs/pengembang/arsitektur/bot-wa)).
