# KEPUTUSAN-PEMBIAYAAN: Pembiayaan risiko per kejadian

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Pimpinan bertanya dua hal sesudah kejadian besar: "kira-kira kerugiannya berapa?" dan "dananya cukup atau tidak?". Sistem belum menjawab keduanya dalam satu tempat. Sisi kerugian: Jitupasna di `/siklus` menghitung nilai kerusakan dan kerugian rupiah (`src/siklus_hitung.js:95` `nilaiKerusakan`, `:119` `nilaiKerugian`), tetapi baru ada sesudah pendataan selesai. Sebelum itu, PAGER (`scripts/gempa/pager.py`, `public/gempa/pager.js`) hanya memperkirakan korban jiwa (`jiwa`, `bawah`, `atas`, `kelas`); tidak ada model kerugian ekonomi di repo. Sisi dana: meja Dana Siap Pakai mencatat nilai diajukan, disetujui, cair, dan realisasi per permohonan (`src/meja_spek.js:156-175`), tetapi tidak ada satu pun data saldo DSP, Pooling Fund Bencana (PFB), APBN, atau DIPA di repo (hanya sebutan di prosa dokumen).

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026: Pembiayaan risiko disetujui sebagai fitur F5 ("Oke apa lagi", menerima butir 2 daftar ketiga: perkiraan kerugian per kejadian dibanding dana yang tersedia, dan pemantau ambang parametrik). |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satuan = kejadian `KJ-` (Buku Besar). Tidak ada tabel kejadian baru; tabel baru membawa `kejadian_id` FK ke `sk_kejadian`. | Gerbang keterpaduan; satu nomor kejadian. |
| D2 | Sisi kerugian punya dua tingkat yang tidak pernah dijumlah: (a) resmi sesudah kejadian = nilai Jitupasna; (b) perkiraan awal = rentang dari model kerugian yang didaftarkan lebih dulu dan diuji balik. Layar selalu menyebut tingkatnya. | Perkiraan tidak boleh tampil seolah angka resmi. |
| D3 | Tidak ada model kerugian ekonomi hari ini. Perkiraan awal tidak tampil sampai satu model lulus pra-registrasi dan uji balik (ALGORITMA 2). Sebelum itu, sisi kerugian hanya Jitupasna, dan bila Jitupasna belum ada kartu berkata "belum ada angka resmi". | PAGER di repo hanya jiwa; mengarang rupiah dilarang. |
| D4 | Sisi dana punya dua sumber: realisasi meja DSP (ada, tetapi kolom `kejadian` meja berupa teks bebas tanpa `kejadian_id`; sebelum PR-02b kartu Dana tidak boleh menyebut "per kejadian") dan saldo DSP/PFB (tidak ada; harus dimasukkan staf berwenang dari BNPB atau Kemenkeu, bertanggal dan bersumber). Saldo yang belum dimasukkan tampil "belum diisi", tidak pernah 0. | Aturan menunggu, bukan nol diam-diam (pola `siklus_hitung.js`). |
| D5 | Pembandingan hanya dua baris berdampingan (kerugian lawan dana), tanpa rasio tunggal, tanpa kata "cukup" atau "kurang" sebagai vonis. Selisih ditampilkan sebagai angka dengan tingkat keyakinan kedua sisinya. | Satu skor gabungan menyembunyikan ketidakpastian. |
| D6 | Pemantau parametrik hanya aktif bila ada polis atau skema parametrik resmi yang tercatat staf (nama, penerbit, pemicu, besar pembayaran, masa berlaku). Tanpa catatan itu bagian parametrik tidak ada di layar. Sistem tidak pernah menciptakan pemicu sendiri. | Tidak ada skema parametrik resmi yang dikenal hari ini (RISET 1). |
| D7 | Semua data uang hanya untuk staf berwenang, tidak ada apa pun di `public/`. | Data fiskal sensitif (KEAMANAN-PRIVASI). |
| D8 | Angka dari sumber berbeda tidak dijumlah (Jitupasna, realisasi DSP, saldo PFB berbeda definisi dan waktu). | Menghindari hitung ganda. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Siapa yang menyediakan saldo DSP dan PFB, dan seberapa sering? | **[BAWAAN SEMENTARA]** staf Biro/Direktorat keuangan BNPB memasukkan lewat form staf, bertanggal, sebulan sekali dan tiap ada pencairan besar; sumber ditulis (surat, laporan BPDLH). | PR-04 |
| Q2 | Apakah saldo PFB dan DSP boleh disimpan di sistem ini? Siapa yang boleh melihat? | **[BAWAAN SEMENTARA]** boleh, hanya akun staf pembiayaan dan pimpinan (baca); BPBD tidak melihat saldo pusat. | PR-04 |
| Q3 | Model kerugian awal apa yang dipakai? | **[BAWAAN SEMENTARA]** tidak ada dulu. Calon yang dievaluasi: koefisien kerugian ekonomi USGS PAGER (belum diverifikasi apakah dipublikasikan untuk Indonesia), atau paparan per bangunan x kerentanan x harga satuan (`public/siklus/paparan.js` dan `sk_harga`). Keduanya HIPOTESIS sampai lulus uji balik. | PR-06 |
| Q4 | Adakah skema asuransi atau pendanaan parametrik resmi yang berlaku (BMN, gempa, banjir)? | **[BAWAAN SEMENTARA]** tidak diketahui; bagian parametrik mati sampai pemilik atau staf mencatat satu. | PR-08 |
| Q5 | Skala kejadian yang dibandingkan: semua KJ, atau hanya yang berstatus darurat atau punya permohonan DSP? | **[BAWAAN SEMENTARA]** hanya KJ yang punya paling sedikit satu permohonan DSP tertaut (PR-02b) atau Jitupasna. | PR-10 dan A1 |
| Q6 | Masuk Laporan Berkala ke Presiden? | **[BAWAAN SEMENTARA]** tidak sampai Q1, Q2, dan Q9 terjawab. | PR-09 |
| Q7 | Perlu koordinasi dengan Kemenkeu (DJPPR) atau BPDLH untuk memakai istilah dan angka PFB? | **[BAWAAN SEMENTARA]** ya, lewat pemilik; sistem tidak mengutip angka PFB yang belum diberikan resmi. | PR-04 |
| Q8 | Satuan dan tahun harga: rupiah berjalan tahun kejadian, atau konstan? | **[BAWAAN SEMENTARA]** rupiah berjalan, tahun harga ditulis di tiap angka. | catatan tahun harga di ALGORITMA 4 |
| Q9 | Peran apa yang membaca dan menulis? (siklus/KEPUTUSAN-AWAL.md butir 27a melarang peran baru) | **[BAWAAN SEMENTARA]** baca: pimpinan, Pusdalops, Koordalops; tulis saldo dan skema: Super Admin; BPBD tidak melihat saldo pusat. Tanpa peran baru. | PR-02 |
