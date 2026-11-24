# KEPUTUSAN-SEGEL: Segel dokumen dan halaman verifikasi `/verifikasi`

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Sistem sudah membekukan beberapa dokumen resmi dan menyimpan sidik sha256-nya: laporan harian karhutla (`lk_snapshot.hash`), laporan harian bencana lain (`lkb_snapshot.hash`), dokumen sitrep, renops, dan laporan per KIB (`pb_dokumen.sha`), dan nanti versi beku data lanjutan BPBD (`lj_beku.sidik`). Sidik itu hanya bisa dilihat staf di dalam sistem. Orang yang memegang lembar cetak atau PDF yang diteruskan lewat WA tidak punya cara memeriksa apakah lembar itu asli, apakah angkanya diubah sesudah terbit, dan apakah sudah ada ralat yang lebih baru.

Peta fitur 21 Nov 2026 (`docs/peta-fitur/PETA-2026-11-21.md`) mencatat dua butir katalog `~/.claude/FITUR.md` yang hilang: segel hash (§5) dan QR ke `/verifikasi/[kode]` (§7.4).

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 23 Nov 2026: pemilik meminta paket ini disusun ("susun paket segel") sesudah ditawari segel hash dan QR verifikasi. |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). Tiket pertama baru dikerjakan sesudah pemilik menjawab Q1 sampai Q3 atau menyetujui bawaannya. |
| K3 | 24 Nov 2026: pemilik menyetujui bawaan Q1, Q2, Q3 ("Setuju, mulai SG-01"). |
| K4 | 24 Nov 2026 malam: pemilik menyetujui bawaan Q5, Q6, Q10 ("Gw sepakat sama lu semua"): moderator dan staf pimpinan boleh mencabut, alasan hanya untuk staf; domain QR `centurisk97.id`; kalimat "Segel keaslian sistem, bukan tanda tangan elektronik." tanpa menyebut pasal. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Segel tidak membekukan apa pun sendiri. Segel menempel pada titik beku yang sudah ada dan memakai sidik yang sudah dihitung di sana. | Satu dokumen, satu pembeku. Dua pembeku bisa menghasilkan dua sidik berbeda untuk isi yang sama. |
| D2 | Satu tabel D1 `segel` untuk semua jenis dokumen, berisi kode, jenis, rujukan ke baris sumber, versi, sidik, sidik berkas PDF (boleh kosong), judul publik, unit penerbit, dan waktu terbit. Pencabutan di tabel append-only `segel_cabut`. | Satu pencarian per kode; halaman verifikasi tidak perlu tahu sepuluh tabel sumber. |
| D3 | Untuk lk dan lkb, baris segel ditulis dalam batch D1 yang sama dengan baris beku sumbernya. Worker memeriksa dulu apakah tabel `segel` sudah ada (sekali per isolate); bila belum, batch dikirim tanpa segel. Untuk `pb_dokumen`, segel ditulis sesudah `put` R2 dan `pbDokBeku` berhasil, dalam `batchTulis` log terbit; bila langkah itu gagal, dokumen beku ada tanpa segel (batas yang diketahui, terlihat di daftar staf). | Batch D1 atomik: satu statement ke tabel yang belum ada menggagalkan seluruh kunci. |
| D4 | Kode segel 10 huruf acak dari abjad Crockford base32 (tanpa I, L, O, U), sekitar 50 bit. Kode bukan nomor urut dan tidak memuat tanggal. | Tidak bisa ditebak berurutan; mudah diketik dari kertas. |
| D5 | Saat kode dibuka, Worker menghitung ulang sha256 isi sumber dan membandingkannya dengan sidik di segel ("dicek ulang saat dibaca", FITUR §5). Hasil tidak cocok tampil sebagai status "Tidak cocok" dan tercatat untuk staf. | Sidik yang hanya disimpan tidak menjaga apa-apa. |
| D6 | Halaman `/verifikasi/<kode>` publik tanpa login dan hanya menampilkan data sampul: jenis dokumen, judul publik, wilayah, periode, versi atau ralat, unit penerbit, waktu terbit, status, dan 12 huruf awal sidik (sidik penuh tidak dikirim). Angka isi, kalimat, lampiran, dan nama orang tidak pernah tampil. | Pemegang kertas sudah memegang isinya; yang ia butuhkan hanya bukti asal dan status. |
| D7 | Empat status: Berlaku, Ada versi lebih baru (dengan tautan ke kode versi terbaru), Dicabut, Tidak cocok. | Ralat adalah kejadian biasa di laporan harian; pembaca harus tahu lembarnya bukan yang terakhir. |
| D8 | Pembaca bisa memilih berkas PDF di halaman verifikasi; peramban menghitung sha256 berkas itu sendiri (`crypto.subtle`) dan membandingkannya dengan sidik berkas. Berkas tidak pernah diunggah. | Memeriksa PDF yang diteruskan lewat WA tanpa membocorkan isinya ke server. |
| D9 | QR berisi `https://centurisk97.id/verifikasi/<kode>`. Di bawah QR tercetak kode dan 12 huruf awal sidik, supaya bisa dicek tanpa kamera. | QR bisa rusak saat difotokopi. |
| D10 | Segel bukan tanda tangan elektronik. Halaman dan lembar cetak menulis "Segel keaslian sistem, bukan tanda tangan elektronik" (kalimat final menunggu Q10). | TTE tersertifikasi (BSrE) punya aturan sendiri dan di luar paket ini. |
| D11 | SQL hanya di `src/hak.js`; rute di `src/segel.js`; halaman `public/verifikasi.*`; penggambar blok QR untuk lembar cetak di `public/inti/segel.js` memakai `public/vendor/qrcode/qrcode.min.js` yang sudah ada. | Aturan repo, tanpa dependensi baru. |
| D12 | Batas laju pencarian kode per hash IP; kode yang tidak ada dan kode yang salah format dijawab sama (404). | Mencegah orang menyisir kode. |
| D13 | Tanpa data dummy (aturan pemilik 11 Nov 2026). Baris `lk_snapshot` dan `lkb_snapshot` berstempel `dummy = 1` tidak disegel; `pb_dokumen` tidak punya kolom dummy, jadi semua yang beku disegel. | Aturan pemilik. |
| D14 | Append-only tabel segel dijaga `src/hak.js` (tanpa fungsi UPDATE atau DELETE) dan gerbang, bukan trigger. Pilihan sadar: migrasi baru tanpa trigger lebih mudah diterapkan ulang; penjaga di tingkat DB bisa ditambah bila pemilik minta. | Sama dengan paket lain sejak alun-alun. |
| D15 | Jawaban publik tidak di-cache (`no-store`). | Segel yang baru dicabut langsung tampil Dicabut; bebannya kecil (paling banyak 3 baca D1 per pembukaan). |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Dokumen apa yang disegel lebih dulu? | **[DISETUJUI K3]** fase 1: laporan harian karhutla dan laporan harian bencana yang dikunci (lk, lkb) serta dokumen PB beku (sitrep, renops, laporan KIB). Fase 2: versi beku data lanjutan BPBD (`lj_beku`) dan Laporan Berkala begitu dibangun. Laporan warga Lapor Bencana tidak disegel karena bukan terbitan resmi; QR ke halaman laporannya (Lapor AI D21) tetap. | SG-05 sampai SG-07 |
| Q2 | Halaman verifikasi terbuka untuk siapa saja, atau hanya untuk penerima yang punya akun? | **[DISETUJUI K3]** siapa saja tanpa akun, hanya data sampul (D6). Ini mengikuti FITUR §7.4 "tanpa akun". | SG-08 |
| Q3 | Apa saja yang boleh tampil di halaman verifikasi? Bolehkah nama wilayah kab/kota? | **[DISETUJUI K3]** jenis, wilayah (provinsi atau kab/kota), periode, versi, unit penerbit, waktu terbit, status, 12 huruf sidik. Tanpa angka dan tanpa nama orang. | SG-08 |
| Q4 | Deck PPTX dan PDF yang dibuat generator Python (laporan harian BNPB, penanganan karhutla) ikut diberi QR? | **[BAWAAN SEMENTARA]** belum di fase 1. Generator hidup di luar Worker dan PDF-nya tidak dihasilkan dari isi beku yang sama byte-nya. | SG-12 |
| Q5 | Siapa boleh mencabut segel, dan apakah alasannya tampil publik? | **[DISETUJUI K4]** moderator dan staf berperan pimpinan; alasan wajib diisi; publik hanya melihat "Dicabut" dan tanggalnya, alasan hanya untuk staf. | SG-10 |
| Q6 | Domain di QR? | **[DISETUJUI K4]** `centurisk97.id`. | SG-09 |
| Q7 | Segel lama ditambahkan untuk snapshot yang sudah dibekukan sebelum fitur ini? | **[BAWAAN SEMENTARA]** tidak. Segel hanya untuk yang dibekukan sesudah migrasi diterapkan. Lembar lama tetap tanpa QR. | tidak menahan |
| Q8 | Berapa lama baris segel disimpan? | **[BAWAAN SEMENTARA]** selamanya; isinya hanya data sampul tanpa data pribadi. | tidak menahan |
| Q9 | Angka teknis: batas laju pencarian, panjang kode, ulang bentrok kode. | **[BAWAAN SEMENTARA]** 60 pencarian per 10 menit per hash IP, 10 huruf (50 bit), paling banyak 3 kali ulang. | tidak menahan |
| Q10 | Kalimat batas klaim hukum di halaman dan lembar cetak perlu ditinjau bagian hukum BNPB? | **[DISETUJUI K4]** "Segel keaslian sistem, bukan tanda tangan elektronik." tanpa menyebut pasal. | SG-08, SG-09 |
| Q11 | Di mana QR segel ditaruh pada slide laporan harian karhutla dan bencana? Slide 1 penuh sampai batas kaki. | **[BAWAAN SEMENTARA]** belum dipasang; pilihan (a) slide Keterangan, (b) slide tambahan di akhir, (c) QR 15 mm di kaki slide 1. Lembar cetak dokumen PB sudah ber-QR. | SG-09 bagian slide |

Migrasi segel harus diterapkan pemilik di D1 produksi. Sebelum itu rute verifikasi menjawab 503 dan pembeku tetap jalan tanpa segel (D3 memakai pemeriksa tabel seperti `tanpaTabelPb`).
