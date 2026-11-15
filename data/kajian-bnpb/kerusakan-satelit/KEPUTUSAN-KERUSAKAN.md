# KEPUTUSAN-KERUSAKAN: Perkiraan kerusakan bangunan dari satelit untuk Jitupasna

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Jitupasna (F3 program Siklus) butuh jumlah bangunan rusak per tingkat. Cacah lapangan makan hari sampai minggu. Satelit melihat seluruh wilayah dalam hitungan hari, tetapi Sentinel 10 m kuat untuk banjir dan kebakaran, dan lemah untuk kerusakan akibat gempa. Percobaan sendiri sudah membuktikannya: laboratorium Cianjur 2022 (`scripts/umum/lab_kerusakan.py`) mengukur perubahan amplitudo radar Sentinel-1 terhadap Google Open Buildings lawan rumah rusak resmi, dan vonisnya gagal (tidak mengalahkan plasebo dan tidak mengalahkan tebakan naif dari intensitas guncangan; `public/data/lab/kerusakan_ringkas.md`). Fitur ini hanya boleh menampilkan angka untuk bahaya yang lulus uji.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026: F2 "peta kerusakan bangunan dari satelit sesudah kejadian, masuk Jitupasna /siklus" disetujui, dengan catatan jujur bahwa Sentinel 10 m kuat untuk banjir dan kebakaran tetapi lemah untuk gempa (tolok ukur: Copernicus EMS, Microsoft AI for Good Venezuela 2026, dataset xBD-S12 dengan 10.315 pasang citra dari 16 bencana). |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Validasi dulu per bahaya. Kriteria lulus dikunci sebelum hasil dilihat (pola `lab_kerusakan.json`), diuji balik pada kejadian lampau yang punya rumah rusak resmi (DIBI atau survei BNPB). | Pengalaman Cianjur: tanpa kriteria terkunci, angka tampak meyakinkan padahal tidak mengalahkan plasebo. |
| D2 | Angka jumlah bangunan rusak tidak pernah tampil untuk bahaya yang belum lulus. Yang tampil: status uji ("menunggu uji", "gagal uji", "lulus uji") dan alasannya. | Angka tanpa uji adalah klaim kosong; aturan "menunggu, bukan nol". |
| D3 | Kandidat pertama: bangunan terendam (banjir); bangunan di area terbakar (karhutla) menunggu target uji mandiri (Q9). Gempa tetap gagal sampai ada metode lebih baik (Q2). | Isyarat fisiknya terlihat di 10 m (air terbuka, bekas bakar). |
| D4 | Keluaran satelit masuk Jitupasna hanya sebagai perkiraan berlabel "perkiraan satelit, belum diverifikasi" (label keyakinan `estimasi-model`). Staf boleh menerimanya ke isian; tidak pernah menjadi cacah resmi sendiri. | Cacah resmi hanya dari isian staf (KA Siklus 7 dan 8). |
| D5 | Tidak ada tabel rumah rusak kedua. Perkiraan tinggal di R2; baris yang diterima staf masuk `sk_jitupasna_baris` dengan `unit_asal` baru, dan rekap resmi `rekapTingkat` (`src/rumah_rusak.js:185`) tidak berubah. | Keputusan desain Siklus: satu sumber rumah rusak. |
| D6 | Pakai ulang mesin yang ada: Sentinel-1 RTC lewat Planetary Computer (`scripts/banjir/citra_banjir.py`), bangunan Google Open Buildings v3 (`scripts/umum/bangunan.py`, `scripts/umum/paparan_bangunan.py`), kunci wilayah BPS 4 digit. Tidak ada pipeline bangunan kedua. | Aturan Siklus. |
| D7 | Keluaran tingkat bangunan hanya di R2 di balik sesi staf, tidak di `public/`. Layar memakai agregat per kab dan kecamatan. | Aturan paparan rinci Siklus. |
| D8 | Luas dan titik panas karhutla hanya dari sistem kita, bukan Koordalops. | Aturan Siklus. |
| D9 | Tingkat rusak (RB, RS, RR) tidak diturunkan dari satelit untuk bahaya apa pun pada tahap awal; keluaran satelit hanya "terdampak" (terendam atau terbakar), dan staf yang menetapkan tingkat. | Sentinel 10 m tidak menilai persentase kerusakan (Perka 15/2011 F4.1). |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Bahaya mana yang diuji lebih dulu? | **[BAWAAN SEMENTARA]** banjir dulu, karhutla sesudahnya. | KS-03 |
| Q2 | Jalur gempa? | **[BAWAAN SEMENTARA]** tetap gagal dan tidak dibangun; dibuka ulang hanya bila ada koherensi dari citra SLC atau citra sangat tinggi resolusi berlisensi dengan kebenaran lapangan. | tidak menahan |
| Q3 | Citra sangat tinggi resolusi berlisensi (sub-meter) atau rapid mapping Copernicus EMS dipakai? | **[BAWAAN SEMENTARA]** tidak; hanya data gratis dan anonim sampai pemilik memutuskan anggaran dan lisensi. | tidak menahan |
| Q4 | Ambang lulus? | **[BAWAAN SEMENTARA, HIPOTESIS]** angka di ALGORITMA 3, dikunci pemilik atau validasi-model sebelum satu piksel dihitung. | KS-03 |
| Q5 | Kebenaran uji banjir? | **[BAWAAN SEMENTARA]** DIBI rumah terendam per kabupaten dan kejadian (DIBI kurang mencatat kejadian kecil, kebenaran bias); bila hanya tingkat kabupaten, uji dinyatakan lemah dan vonis maksimal "lulus terbatas" (angka tampil per kab, bukan per kecamatan). Ini pembatas terbesar. | KS-03 |
| Q6 | Siapa yang boleh menerima perkiraan ke isian? | **[BAWAAN SEMENTARA]** peran yang sudah boleh mengisi Jitupasna (Pusdalops, Koordalops, BPBD kab wilayahnya). | KS-07 |
| Q7 | Nama nilai `unit_asal` baru? | **[BAWAAN SEMENTARA]** `satelit_diterima`. | KS-05 |
| Q9 | Target mandiri uji karhutla (bukan titik panas, bukan kebakaran permukiman)? | **[BAWAAN SEMENTARA]** uji karhutla ditunda; vonis menunggu uji. | KS-09 |
| Q10 | Untuk kerusakan bangunan, model gagal tampil tanpa angka (D2) atau dengan pil hipotesis seperti Siklus PRD F3-08 (KA 11)? | **[BAWAAN SEMENTARA]** D2 menang: tanpa angka. Alasan: angka rusak bangunan dibaca sebagai fakta oleh pimpinan, dan percobaan Cianjur gagal. | KS-08 |
| Q8 | Tampil juga di Laporan Berkala? | **[BAWAAN SEMENTARA]** tidak; hanya cacah resmi. | tidak menahan |
