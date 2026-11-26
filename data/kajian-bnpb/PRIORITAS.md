# Prioritas kerja semua paket (pemilik, 25 Nov 2026)

Pemilik: "kerjakan semua berdasarkan prioritas", "satu sesi ini dulu aja, pastiin lu jalan terus untuk menyelesaikan semuanya".
Urutan ini dipakai sampai pemilik mengubahnya. Satu sesi, agen penulis jalan satu per satu (berkasnya tidak boleh beririsan).
Tiap tiket: pengerja pemiliknya, lalu pemeriksa bersih, lalu commit dengan path spesifik. Centang di sini saat selesai.

Dasar urutan: musim hujan (banjir, longsor, cuaca dipakai tiap hari), modul hampir jadi ditutup dulu, riset satelit belakangan.

## P0: sekarang

- [x] Jawaban pemilik ke semua KEPUTUSAN (`PERTANYAAN-TERBUKA.md`, commit 9da879697)
- [x] PB-49 uji balik longsor: GAGAL, tetap hipotesis (f8c4cca7b)
- [x] PB-50 uji balik hujan 50 mm: GAGAL, hanya musim kemarau (aaa2db9fd)
- [x] Paket `peta-situs` (73f2495c6)
- [x] Peta situs PS-00 sampai PS-11 selesai 25 Nov (474ac23c0, 4b4f15d10, 05a870e59); tinjau lokal sesudah terbit
- [x] Paritas PB-51 sampai PB-67 (PB-51..PB-66 selesai 25 Nov, PB-67 penutup F3 selesai 26 Nov: tabel target lawan hasil di `paritas-bencana/TIKET.md` bagian Penutup F3; sasaran F3 belum tercapai, selisih 28 sampai 74 ADA per bencana. Masih tertahan: PB-61.x karena kunci, login, izin unduh, lisensi, atau jalur akses; PB-65.3 menunggu pemilik masuk; PB-65.4 menunggu lisensi di DATA-PUBLIK; A34 video tidak dikerjakan, Q7)
- [ ] Lapor Bencana sisa (LK-09..LK-12 selesai 25 Nov; LK-13 tinjauan pemilik dan saklar LAPOR_USUL; sisa LA-*)
- [ ] Genangan GS-12, GS-13 (kode GS-13 selesai 25 Nov; tertahan: migrasi GS-09 oleh pemilik, Q14, uji balik butuh izin jaringan)

## P1: berguna musim ini, kode belum ada

- [ ] EWS panel sensor dan CCTV (EW-01..EW-05, EW-09 selesai 25 Nov; migrasi 0176 diterapkan pemilik; EW-06/07/08/10 menunggu izin tertulis Q1, Q6)
- [ ] Laporan Berkala (LB-00..LB-03, LB-10 selesai 25 Nov; Q28 baru; sisa LB-04..LB-09, LB-11, LB-12)
- [ ] Lapor luring dan PWA: service worker `/lapor` (LR-*, PW-*)
- [ ] Lifeline LF-9..LF-11
- [ ] Kaji ulang KU-4..KU-12
- [ ] Segel SG-12, SG-13 (SG-14 migrasi menunggu pemilik)
- [ ] Lapor ke kejadian, Silang sumber, Desa Waspada terbit publik (Q1), Alat gambar, Tindakan operasi, 3W TW-10, Profil PF-0

## P2: riset dan validasi satelit (boleh gagal, tetap hipotesis bila gagal)

- [ ] Tsunami genangan (TS-*), ambang Aida K dan kappa, n_min 8
- [ ] Kerusakan satelit (KS-*), Bekas longsor (LS-*)
- [ ] Lereng bangunan (LT-*), DEMNAS diunduh Claude, sandi portal diketik pemilik
- [ ] Penurunan tanah (PT-*), LiCSBAS dan DeltaDTM diizinkan
- [ ] InSAR gambut IG-7, LiCSAR Palangka Raya diizinkan
- [ ] Insiden Kaya IK-1..IK-8, titik awal boleh publik

## P3: karhutla sepi dan administrasi

- [ ] Semai awan SA-22..SA-35, PKH, sisa SIPPA, Dashboard, InaRISK, Pembiayaan, Pemetaan relawan
- [ ] Alun-alun instansi (AT-*), rekap provinsi boleh publik
- [ ] LogPal dan Rantai: tertahan 26 pertanyaan tanpa bawaan
- [ ] Ruang Unit (kedeputian)

## Menunggu pemilik

- Migrasi D1 produksi: GS-09 (genangan), SG-14 (segel 0171, 0172), dan migrasi baru yang dibuat tiket berikutnya.
- Pertanyaan tanpa bawaan: LogPal 14, Rantai 12, cek-kabar Q6.
- Peta situs Q1-Q8 (bawaan sementara dipakai).
- Paritas Q23: angka ambang aktivasi Pusdalops tidak ada di repo; sementara kandidat = tercatat di Logbook.
- Batas pemakaian Sonnet habis sampai 29 Nov 23.00 WIB; pemilik memilih lanjut pakai Opus (25 Nov).
