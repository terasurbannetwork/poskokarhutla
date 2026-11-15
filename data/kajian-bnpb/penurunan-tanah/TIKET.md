# TIKET: Penurunan tanah dan proyeksi rob

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya. Bukti tiap tiket ditambah `python3 scripts/banjir/genangan/kunci_j4.py cek` (hasil ok = berkas beku J4 tidak berubah, D7). Tiket PT-04 sampai PT-07 menunggu Q1.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| PT-01 | Pemilik menjawab Q1 (aturan izin untuk `~/licsbas/lb.sh` dan `~/licsbas/ambil.py`, atau menjalankan sendiri), Q3, Q5, Q7 | pemilik | jawaban tertulis di KEPUTUSAN | - |
| PT-02 | Tinjauan keamanan jalur LiCSBAS: catat hash komit klon, lisensi, dan isi dua skrip di `RISET-SUBSIDEN.md` | banjir (+ security-reviewer) | ringkasan tertulis | PT-01 |
| PT-03 | `subsiden.py`: tambah p10, galat baku median, tanggal deret, versi; pertahankan swa-uji | banjir | T1, T2 | - |
| PT-04 | Jalankan Jakarta: unduh, LiCSBAS, `subsiden.py hitung`, gerbang pola | pemilik atau banjir sesuai Q1 | `gerbang.lolos` benar di `subsiden.json` | PT-01, PT-02, PT-03 |
| PT-05 | Gerbang pola Semarang dan Pekalongan (dan Surabaya bila ada rujukan), jalankan ketiganya | banjir (+ validasi-model) | T3 | PT-04 |
| PT-06 | Ujian tahan-waktu dan perbandingan literatur (ALGORITMA 6.1 dan 6.2) | banjir (+ validasi-model) | T10 sebagian | PT-04 |
| PT-07 | Pembanding GNSS atau levelling bila datanya ada (Q11) | banjir (+ validasi-model) | T10 | PT-06 |
| PT-08 | `proyeksi_tanah.py` dengan swa-uji; keluaran `proyeksi_tanah.json` | banjir | T4, T6 | PT-03 |
| PT-09 | Lapis, kartu penurunan, kartu proyeksi, pembaruan kartu rob dan catatan kaki; tahap kelurahan hanya sesudah validasi | banjir (+ selera-angka, inp-reviewer) | T8, T9, tinjau lokal | PT-08 |
| PT-10 | DeltaDTM lokal, statistik elevasi per kecamatan, luas di bawah ambang (Q6) | banjir (+ validasi-model) | uji elevasi | PT-08, Q6 |
| PT-11 | Berkas `tests/banjir/subsiden.test.mjs`; daftar swa-uji di `banjir.yml` | banjir | T5, T7 | PT-08 |
| PT-12 | Pra-registrasi dan uji balik rob lawan penurunan sebelum angka gabungan (Q10) | pemilik memutuskan, banjir (+ validasi-model) | pra-registrasi terkunci | PT-07, Q10 |

Tiket tanpa Q1 yang tetap jalan: PT-03, PT-08 dengan data literatur per kota sebagai masukan (berlabel), PT-11.
