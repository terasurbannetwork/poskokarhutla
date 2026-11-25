# Batasan dan pertanyaan terbuka

Halaman ini mencatat beda antara dokumen dan kode, keterbatasan, dan hal yang belum terdokumentasi.

## Beda antara dokumen dan kode

Kode yang menang.

- `AGENTS.md` peta modul menyebut Worker menjalankan FIRMS di menit 15 dan bersih-bersih di menit 17 saja. Kode menjalankan lebih dari 30 tugas pada menit tetap (tabel di [penjadwalan](/docs/pengembang/arsitektur/penjadwalan)). Peta modul merupakan ringkasan, bukan daftar lengkap.
- `public/api.html` dan tool MCP `titik_api_terkini` menyebut tiga sensor (MODIS, VIIRS S-NPP, VIIRS NOAA-20), sedangkan catatan hasil di `src/mcp.js:68-77` menyebut empat sensor termasuk VIIRS NOAA-21 (kode `N21`). Daftar sensor di halaman dokumentasi belum diperbarui.
- `public/api.html` mendaftar tujuh tool publik, sedangkan `src/mcp.js` menyediakan sebelas (ditambah tiga tool peraturan BNPB dan `kejadian_resmi`).
- `AGENTS.md` §3.3 melarang branch selain `main`, tetapi `terbit_antre.yml:16-17` masih menyebut `staging` dan `terbit.yml` memuat jalur pratinjau staging, dan `lab.yml` memicu pada branch `claude/**`. Jalur itu hanya aktif bila branch tersebut ada.
- Berkas `wrangler.warga.jsonc` masih memuat `database_id` placeholder dan merupakan usulan lama; hanya `wrangler.jsonc` yang diterbitkan (`gerbang-wrangler`).
- Konstanta `CRON_TITIK = "15 */3 * * *"` di `src/worker.js` tidak lagi menjadi jadwal di `wrangler.jsonc` (hanya `* * * * *`); cabang `ev.cron === CRON_TITIK` adalah warisan.
- Salinan data di `public/data` pada checkout lokal bisa jauh lebih tua dari produksi karena data harian diterbitkan oleh Actions. Jangan menilai kesegaran dari berkas lokal; baca `/api/status`.
- Catatan ilmu agent `wa-bot` yang lebih lama menyebut cut-off laporan penanganan 17.00 WIB, sedangkan `scripts/wa/README.md` dan `LAPORAN` di `scripts/wa/otomatis.mjs:44` memakai 18.00 (keputusan pemilik 16 November 2026). Penanganan banjir, longsor, dan rob memakai 17.00 (`otomatis.mjs:53`).
- Dokumen paket `bot-laporan` (`data/kajian-bnpb/bot-laporan/`) menjadi rujukan keputusan K1 sampai K47, rancangan D1 sampai D42, dan pertanyaan Q1 sampai Q26 (`data/kajian-bnpb/bot-laporan/KEPUTUSAN-BOT-LAPORAN.md`). Pemeriksaan baris demi baris antara paket itu dan seluruh `scripts/wa/**` tidak dilakukan untuk dokumen ini; yang dikutip di atas adalah nilai yang terbaca langsung di kode.

## Keterbatasan

- Penjadwalan GitHub tidak dapat diandalkan. Cadangan hanya mencakup delapan workflow di daftar `JADWAL` dan titik panas lewat cron Worker; workflow lain bisa terlewat tanpa dipulihkan otomatis.
- Satu cron Worker per menit berarti semua tugas berbagi anggaran waktu satu invokasi; tugas berat harus dipisah ke menit sendiri, dan batas D1 Free (sekitar 5 juta baca per hari) pernah menjatuhkan situs akibat pemindaian tabel.
- Server MCP tanpa sesi dan tanpa OAuth: tool berkunci hanya bisa dipakai klien yang dapat mengirim header.
- Kunci API kedaluwarsa tetap 365 hari tanpa perpanjangan otomatis. Menurut catatan di `src/api_v1.js:14`, masa ini adalah bawaan sementara.
- Bot WhatsApp memakai WhatsApp Web tidak resmi (Baileys). Nomor dapat diblokir; anjuran memakai nomor khusus ada di `scripts/wa/README.md`. Bot dan generator berjalan di satu mesin; bila mesin mati, bot tidak menerima pesan sama sekali.
- Pembatas laju: kiriman biasa tetap 8 per tujuan per hari, tetapi balasan ke orang yang baru menulis (jendela 10 menit) memakai batas terpisah 150 per tujuan per hari, jeda 2 sampai 4 detik, dan 10 per menit (`scripts/wa/gateway/limiter.js:33-49`). Pertanyaan Q1 mencatat bawaan sementara 40 per hari (`KEPUTUSAN-BOT-LAPORAN.md:57`); kode sudah memakai 150, jadi bawaan itu tertinggal. Draf mengirim gambar tiap slide (paling banyak 15) selain PDF, sehingga hitungan kiriman per draf tidak lagi tiga.
- Metode di bagian arsitektur ini adalah mekanisme operasional, bukan model prediksi, sehingga tidak ada uji balik. Model risiko dan prediksi yang memakai kerangka ini dijelaskan di halaman modulnya, dan yang belum lulus uji balik tampil sebagai hipotesis.

## Belum terdokumentasi di kode atau repo

- Daftar lengkap nama secret Worker dan GitHub beserta pemiliknya tidak dikumpulkan di satu berkas; hanya terlihat tersebar di komentar kode (misalnya `IP_SALT`, `ADMIN_TOKEN`, `AKUN_SITUS*`, `SUPER_ADMIN`, `WA_MESIN`, `GITHUB_TOKEN`).
- Prosedur pemulihan bencana untuk D1 dan R2 (cadangan, pemulihan) belum terdokumentasi di kode.
- Alur pemasangan bot WhatsApp di Windows tidak ada; panduan hanya untuk macOS (launchd).
- Keputusan pemilik yang masih terbuka di paket `bot-laporan` ditulis sebagai "belum diputuskan (bawaan sementara: ...)". Contoh: batas kiriman WhatsApp untuk balasan ke orang yang baru menulis (Q1, bawaan sementara: draf hanya mengirim pratinjau dan PDF, PPTX menyusul bila diminta); pemindahan gateway ke mesin yang selalu menyala (Q2, bawaan sementara: tetap satu mesin); pengiriman nama orang di bahan ke layanan luar (Q4, bawaan sementara: nomor HP, NIK, dan surel disamarkan, nama tetap).

## Yang sengaja tidak dicakup

Isi dan metode modul bencana, SIPPA, Kemitraan Kampus, LogPal, Siklus Bencana, Lapor Bencana (selain sambungan WhatsApp), Meja Kerja, dan modul akun instansi, yang punya dokumen sendiri di folder ini dan paket di `data/kajian-bnpb/`.
