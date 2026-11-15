# RISET: Kerusakan bangunan dari satelit

Fakta repo diperiksa 15 Nov 2026 (berkas:baris). Fakta luar dirujuk sebagai tolok ukur, belum diuji sendiri.

## Tolok ukur luar

| Rujukan | Pelajaran untuk kita |
| --- | --- |
| Copernicus EMS rapid mapping | Banjir dan kebakaran dipetakan rutin dari radar dan optik, tetapi kerusakan bangunan memakai citra sangat tinggi resolusi dan interpretasi analis. Peta otomatis selalu berstatus "perlu verifikasi". |
| Microsoft AI for Good, Venezuela 2026 | Penilaian kerusakan bangunan otomatis perlu citra resolusi tinggi; di 10 m, gejala kerusakan bangunan tunggal tidak terlihat. |
| Dataset xBD-S12 (10.315 pasang citra Sentinel-1 dan Sentinel-2, 16 bencana) | Sinyal 10 m cukup untuk "terdampak atau tidak" pada banjir dan kebakaran, lemah untuk gempa dan angin; tingkat kerusakan tidak dapat dipercaya. |
| Damage proxy map (ARIA, koherensi interferometri) | Metode gempa yang masuk akal memakai koherensi dari citra SLC, bukan amplitudo. |

## Fakta repo (diperiksa)

| Fakta | Lokasi |
| --- | --- |
| Percobaan gempa Cianjur 2022: z-score amplitudo Sentinel-1 kali Open Buildings lawan rumah rusak survei BNPB; vonis gagal, tidak mengalahkan plasebo (selisih -0,022, CI90 [-0,068, 0,022]) maupun tebakan naif mmi (-0,032); kecamatan hanya 11 unit. | `public/data/lab/kerusakan_ringkas.md` |
| Kriteria dikunci sebelum hasil radar dilihat: bootstrap berblok, ambang selisih plasebo 0,05, rho uji minimal 0,3, sel uji minimal 40. | `scripts/data/lab_kriteria/lab_kerusakan.json` |
| Keterbatasan tercatat: amplitudo bukan koherensi (Planetary Computer tidak menyediakan SLC), piksel 40 m, bangunan hanya titik pusat pada sel 110 m, satu orbit, hanya satu kejadian punya kebenaran di bawah kabupaten. | `public/data/lab/kerusakan_ringkas.md` bagian Keterbatasan |
| Mesin lab: `scripts/umum/lab_kerusakan.py` (35 KB). | berkas itu |
| Sentinel-1 RTC lewat Planetary Computer, token SAS anonim dari API-nya. | `scripts/banjir/citra_banjir.py:32-33` (alamat STAC dan SAS), `:100` (`token_sas`), `:120` (`contoh_s1`), `:164` (`gelap_baru`, deteksi gelap baru untuk air), `:172` (`kejadian_terbesar`) |
| Bangunan: Google Open Buildings v3, ambang keyakinan 0,70, grid 0,01 derajat dan halus 110 m, data terkunci, provinsi tanpa grid ditulis "tidak terliput". | `scripts/umum/bangunan.py`, `scripts/umum/paparan_bangunan.py`, `data/kajian-bnpb/siklus/ALGORITMA.md:177-179` |
| Penyajian bangunan hanya setelah masuk, dari R2 awalan `bangunan/`, tidak di `public/`. | `src/bangunan.js:1-2, 16-20` |
| Tabel Jitupasna: `sk_jitupasna_baris.unit_asal` hanya `isian` atau `rekap_rumah_rusak`; baris rusak wajib `tingkat` dan `unit`. | `migrations/0123_sk_pulih.sql:55`, CHECK baris `:67-68` |
| Kolom baris dibaca di `src/hak.js:241`; paket Jitupasna dirakit di `src/siklus_pulih.js:41` (`rekapRumah`) dan `:65`. | berkas itu |
| Rekap rumah rusak tingkat resmi: `rekapTingkat` memanggil `skRekapRumahRusak`; desain melarang tabel rumah rusak kedua. | `src/rumah_rusak.js:185` |
| Rumah gempa: "menunggu" karena kurva kerapuhan resmi BNPB tidak ditemukan. | `data/kajian-bnpb/siklus/PRD.md:157` (F3-03) |
| Klasifikasi tingkat: p di atas 70 RB, 30 sampai 70 RS, di bawah 30 RR. | `data/kajian-bnpb/siklus/ALGORITMA.md` F4.1 |
| Migrasi terakhir saat riset: 0145; nomor baru diambil saat tiket. | `migrations/` |

## Kesimpulan riset

1. Gempa: bukti kita sendiri dan tolok ukur luar sejalan, jangan dibangun lagi di 10 m amplitudo.
2. Banjir dan kebakaran: isyarat fisik ada, tetapi belum ada uji sendiri; uji dulu, tampil sesudah lulus.
3. Kebenaran per kabupaten membatasi kekuatan uji; ini risiko utama (Q5).
