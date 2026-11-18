# KEPUTUSAN-BOT-LAPORAN: Bot WA pembuat laporan dengan Claude API

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Sekarang laporan BNPB (Laporan Kejadian Bencana Harian, Laporan Penanganan Pengendalian Karhutla, dan deck lain) dibuat lewat sesi aplikasi Claude atau lewat bot WA `scripts/wa/otomatis.mjs` yang membangun dua jenis laporan pada jam tetap tanpa bisa direvisi lewat chat. Pemilik ingin cukup mem-forward pesan atau dokumen ke bot, lalu menerima laporan jadi dalam waktu hampir seketika, merevisinya lewat chat, dan menutupnya dengan unggahan ke Drive, tanpa membuka aplikasi Claude.

## Keputusan pemilik (18 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Bot memakai Claude API dari kredit paket Ultra ($200 per bulan), bukan Workers AI dan bukan aplikasi Claude: "kita full utilize pake API claude aja". |
| K2 | Alur: bahan masuk, laporan dibuat, lalu "bisa tweak/iterasi/revisi dulu, baru setelah jadi final, lakukan closing projectnya". |
| K3 | Hasilnya harus hampir seketika ("almost realtime"). |
| K4 | Sistem mengambil data internal platform secara otomatis. Angka hotspot, firespot, luas terbakar, dan luas belum padam hanya dari sistem, tidak pernah dari pesan WA dan tidak bisa diubah lewat revisi (aturan pemilik 29 Okt 2026, `src/wa_jenis.js`). |
| K5 | Target: hasil semirip mungkin dengan laporan yang selama ini dibuat ("99% mirip"). Kemiripan diukur dengan uji balik, bukan diklaim. |
| K6 | Pemakai: siapa saja yang nomornya terdaftar. Nomor yang belum terdaftar hanya dibalas cara mendaftar. Semua nomor terdaftar boleh membuat, merevisi, dan mengetik `final`. |
| K7 | Closing mengunggah hasil final ke Drive tim IT BNPB lewat Drive API, "bukan di local saya". |
| K8 | Bot bertanya dulu sebelum membangun kalau bahan kurang atau saling bertentangan. |
| K9 | Tiap draf diperiksa mesin sebelum dikirim (gerbang format, gerbang bahasa, banding 7 hari terakhir). |
| K10 | Revisi yang berulang diusulkan jadi aturan tetap, berlaku sesudah disetujui pemilik. |
| K11 | (18 Nov, menggantikan usulan antre) Pesan yang masuk ke bot proyek selama mesin mati tidak disimpan dan tidak diproses saat mesin menyala: "klo mati berarti gausah simpen data dlu takutnya nanti overwhelmed". Tab Pelaporan menampilkan "mesin bot mati sejak ..." (pemilik: "ya"). |
| K14 | (18 Nov, menjawab Q8: "Oke, pakai ini") Terdaftar = nomor di `WA_IZIN` atau nomor yang mengirim `daftar <nama> <instansi>` lalu disetujui pemilik dengan `setuju <nomor>`. Hanya pemilik yang menyetujui. Akun `/masuk` tidak otomatis terhitung. |
| K15 | (18 Nov, "ikut usul") PDF dan foto bahan diekstrak jadi teks dulu (`pdftotext -layout` untuk PDF, OCR Vision Mac `scripts/wa/ocr.cjs` untuk foto), disamarkan, lalu hanya teks yang dikirim ke Claude. Berkas asli tidak dikirim. Bila teks hasil ekstraksi kosong atau terlalu sedikit, bot memberi tahu pengirim ("tidak terbaca, kirim teks atau PDF") dan tidak menebak. |
| K16 | (18 Nov, "setuju yang ini, fokus bot baru aja") Jalur terjadwal lama (`otomatis.mjs`: harian 12.00, penanganan 18.00, banjir) dimatikan lewat `WA_OTOMATIS=0` di `.env` mesin; semua laporan lewat `buat` di bot proyek. Renlap, jarak pandang, dan perintah manual bertanggal (`kirim ulang`) tetap jalan. Ini mengubah D9 untuk laporan: kode jalur lama tetap ada, tapi tidak dipicu. |
| K17 | (18 Nov) Alur dituntun: pemakai mengirim perintah dulu ("buat penanganan"), bot menjawab daftar bahan yang harus dikirim (wajib dan tambahan, yang sudah ada ditandai), tiap bahan yang masuk dikonfirmasi dengan sisa yang kurang, dan laporan **selalu menunggu `lanjut`** sebelum dibangun, juga saat bahan wajib sudah lengkap ("selalu menunggu lanjut"). `lanjut` saat bahan wajib belum lengkap membangun dengan bahan yang ada dan mencatat kekurangannya (menggantikan `buat saja`, yang tetap dikenali). Bahan yang dikirim sebelum perintah tetap disimpan dan dipakai. |
| K12 | Ditolak: bot membuat draf duluan secara terjadwal ("gausah"). Ditunda: satu laporan dengan banyak penyumbang ("nanti aja"). |
| K13 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Claude tidak pernah menyunting berkas PPTX dan tidak pernah menulis angka sistem. Claude hanya menghasilkan dua jenis keluaran JSON yang dicek skema: isian bahan (saat membuat) dan daftar operasi ubah (saat revisi). Deck selalu dibangun ulang oleh generator yang sudah ada, lalu operasi ubah diterapkan di atasnya. | Format tetap konsisten di revisi ke berapa pun; generator yang sudah lolos gerbang tetap satu-satunya pembuat slide. |
| D2 | Tiap angka yang diambil Claude dari bahan wajib disertai kutipan teks asalnya. Validator menolak angka yang kutipannya tidak ditemukan di bahan. | Mencegah angka karangan. |
| D3 | Shape yang memuat angka sistem dikunci lewat manifest dari generator. Operasi ubah yang menyentuh shape terkunci ditolak, dan bot menawarkan catatan di slide sebagai gantinya. | K4. |
| D4 | Claude API dipanggil dari mesin bot (Node, `@anthropic-ai/sdk`), bukan dari Worker. Kunci API hanya di `scripts/wa/.env`. | Mesin bot sudah memegang bahan dan generator; Worker paket Free punya batas waktu kerja latar. |
| D5 | Keadaan proyek (status, bahan, versi, operasi ubah) disimpan di D1 dan R2 lewat rute Worker `/api/wa/proyek*` (Bearer `WA_MESIN`), bukan hanya di `~/.wa-bot/state.json`. | Riwayat versi tahan mesin rusak dan bisa dilihat di tab Pelaporan (`/pelaporan`). |
| D10 | Daftar nomor terdaftar dipegang gateway sebagai salinan yang disegarkan tiap 5 menit dari `GET /api/wa/terdaftar`, bukan dicek ke D1 tiap pesan. Gateway yang menyaring dan membalas nomor asing (paling banyak satu balasan T-DAFTAR per nomor per hari). | Gateway sekarang membuang nomor di luar `WA_IZIN` sebelum meneruskan (`gateway/index.js`), jadi Worker tidak pernah melihat nomor asing; cek per pesan juga memakan kuota baca D1 Free. |
| D12 | Pengirim di `WA_IZIN` (termasuk pemilik) memakai semua bahan hari itu dari nomor `WA_IZIN` dan grup operasi, sama dengan jalur terjadwal; nomor `bl_daftar` hanya memakai bahannya sendiri (Q6). | Supaya `buat harian` dan `buat penanganan` dari pemilik menghasilkan deck yang sama dengan jalur lama (Q14); bahan orang lain tidak bocor ke pemakai umum. |
| D13 | Final dari bot tidak dikirim ke `POST /api/wa/hasil`; arsipnya `bl_versi` dan Drive tim IT. | Kunci arsip `/api/wa/hasil` (`lapor-otomatis/<tanggal>/<laporan>`) tanpa nomor revisi, jadi final bot dan jalur terjadwal di tanggal yang sama akan saling timpa. |
| D11 | Retry Claude API memakai bawaan SDK (`maxRetries` 2), tanpa loop ulang sendiri. | Ulang ganda melipatgandakan waktu tunggu dan biaya. |
| D6 | Riwayat versi append-only: versi lama tidak pernah ditimpa. Versi n = generator(bahan) + operasi ubah 1..n. | "Balik ke v2" selalu bisa. |
| D7 | Model bawaan `claude-opus-5-5`, effort `low` untuk mengurai dan `medium` untuk revisi; bagian prompt yang tetap (aturan, contoh arsip, aturan tetap dari K10) di-cache. | Mutu tertinggi; cache memangkas biaya contoh yang berulang. |
| D8 | Pratinjau gambar slide yang berubah dikirim lebih dulu; PDF menyusul. | Terasa seketika walau PDF butuh 20 sampai 60 detik. |
| D9 | Bot ini hidup berdampingan dengan jalur terjadwal `otomatis.mjs` yang sudah ada dan tidak mengubah perilakunya. Fungsinya dipakai ulang; argumen generator diperluas hanya lewat medan baru yang tidak aktif bila tidak diisi. | Jalur yang sudah dipakai pemilik tidak boleh mundur. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Limiter WA sekarang: jeda acak 15 sampai 20 detik antarkiriman, 3 per menit, dan **8 kiriman per tujuan per hari** (`scripts/wa/gateway/limiter.js`), ditambah batas pemanasan yang lebih rendah selama 7 hari sesudah perangkat baru ditautkan (`WARMUP_PER_DAY`). Satu draf berisi pratinjau, PDF, dan PPTX sudah 3 kiriman, jadi 8 per hari habis dalam 2 sampai 3 versi. Batas dilonggarkan untuk balasan ke orang yang baru menulis? | **[BAWAAN SEMENTARA]** Draf hanya mengirim pratinjau dan PDF; PPTX dikirim saat `final` atau atas perintah `pptx`. Balasan ke pengirim yang menulis dalam 10 menit terakhir memakai batas terpisah 40 per tujuan per hari. Batas global per jam dan per hari tidak diubah. | BL-09 |
| Q2 | Mesin bot (gateway Baileys dan generator) ada di satu komputer. Kalau komputer itu mati, bot tidak menerima pesan sama sekali, jadi Worker tidak bisa membalas "pembangun sedang mati". Pindahkan gateway ke mesin yang selalu menyala (VPS kecil atau Cloudflare Containers berbayar)? | **[BAWAAN SEMENTARA]** Tetap satu mesin. Sesuai K11, pesan susulan (gateway menandainya `lama:true`) tidak masuk proyek bot sama sekali: tidak disimpan ke proyek, tidak memicu Claude, perintahnya tidak dijalankan. Tiap nomor terdaftar yang mengirim pesan selama mati mendapat satu pemberitahuan saat mesin menyala: "Bot tadi mati dari jam X sampai Y, pesan di jam itu tidak diproses. Kirim ulang bila masih perlu." Jalur terjadwal lama tetap memakai susulan seperti sekarang (D9). Worker mencatat detak terakhir mesin dan tab Pelaporan menampilkan "mesin bot mati sejak ...". | BL-14 |
| Q3 | Jenis laporan di versi pertama? | **[BAWAAN SEMENTARA]** Laporan Kejadian Bencana Harian dan Laporan Penanganan Pengendalian Karhutla. Penanganan banjir, gempa, dan kekeringan (generatornya sudah ada) di tahap 2. Jenis tanpa generator tidak bisa dibuat bot. | BL-16 |
| Q4 | Teks bahan (bisa memuat nama korban atau nomor HP) dikirim ke server Anthropic. Ada aturan BNPB soal data yang boleh dikirim ke layanan luar? | **[BAWAAN SEMENTARA]** Nomor HP, NIK, dan alamat email disamarkan sebelum dikirim; nama orang tetap dikirim karena dibutuhkan isi laporan. | produksi |
| Q5 | Batas belanja API? | **[BAWAAN SEMENTARA]** Mesin berhenti memanggil Claude bila pemakaian hari itu lewat $10 dan memberi tahu pemilik. Pemilik juga memasang spend limit di Console. | tidak menahan |
| Q6 | Satu proyek terbuka per apa? | **[BAWAAN SEMENTARA]** Per (nomor pengirim, jenis laporan, tanggal laporan). Bahan dari nomor lain tidak masuk proyek orang lain (K12). | tidak menahan |
| Q7 | Proyek yang dibiarkan terbuka? | **[BAWAAN SEMENTARA]** Ditutup otomatis tanpa unggah sesudah 24 jam tanpa aktivitas, pemegangnya diberi tahu. | tidak menahan |
| Q8 | Pendaftaran lewat pesan `daftar`: siapa yang menyetujui, dan apakah akun `/masuk` ikut terhitung? Akun umum `/masuk` dibuat otomatis untuk nomor mana pun dengan status `aktif` (`pintu-masuk/KEPUTUSAN-MASUK.md` D5), jadi kalau dihitung, siapa saja bisa memakai kredit API dan menerima laporan internal. | **Dijawab pemilik 18 Nov (K14).** | tidak menahan |
| Q9 | Susunan folder Drive tim IT? `unggahLaporan()` sekarang hanya memberi awalan "Revisi " di nama berkas dan tidak membuat subfolder. | **[BAWAAN SEMENTARA]** `<DRIVE_LAPORAN>/1. Laporan Harian Bencana` atau `2. Laporan Harian Karhutla/<tanggal>/Revisi N/` dengan nama berkas tanpa `(revN)` (pola AGENTS 3.6); `unggahLaporan()` diperluas untuk subfolder itu. | BL-12 |
| Q10 | Hasil `final` juga dikirim ke daftar `PENERIMA` jalur terjadwal? | **[BAWAAN SEMENTARA]** Tidak. Final hanya ke pemegang proyek dan Drive. | tidak menahan |
| Q11 | Ambang peringatan banding 7 hari? | **[BAWAAN SEMENTARA]** Angka naik atau turun lebih dari 3 kali median 7 hari, atau jadi nol padahal 7 hari sebelumnya tidak pernah nol. Peringatan tidak menahan draf. | tidak menahan |
| Q12 | Kapan revisi berulang diusulkan jadi aturan tetap? | **[BAWAAN SEMENTARA]** Pola yang sama muncul 3 kali dalam 14 hari, dari minimal 2 proyek berbeda. | BL-15 |
| Q13 | Bot bertanya dulu, tapi penanya tidak menjawab? | **[BAWAAN SEMENTARA]** Bot menunggu. Perintah `buat saja` membangun dengan bahan yang ada dan menuliskan kekurangannya di catatan draf. | tidak menahan |
| Q14 | `scripts/wa/perintah.mjs` sudah memakai `buat harian|penanganan [tanggal]`, `status`, dan `bantuan` untuk nomor PEMILIK, dan gateway mencegatnya lebih dulu. Perintah mana yang dipakai bot baru? | **[BAWAAN SEMENTARA]** `buat`, `status` tanpa tanggal, dan `bantuan` pindah ke mesin proyek untuk semua nomor terdaftar (termasuk pemilik); hasil `buat harian` dan `buat penanganan` sama dengan deck jalur lama. `kirim ulang ...` dan `status <tanggal>` tetap di `perintah.mjs`. | BL-08 |

Izin Drive bot WA menurut pemilik (18 Nov 2026) sudah memakai akun tim IT BNPB (unggahan bot terlihat dari akun itu); pemilik cukup memastikannya dengan perintah cek di `PANDUAN-PEMILIK.md` langkah 2, dan `drive-masuk.mjs` hanya dijalankan ulang bila hasil cek bukan akun tim IT. Kunci Claude API dibuat pemilik di Console sesudah menautkan organisasi API di pengaturan paket Ultra.
