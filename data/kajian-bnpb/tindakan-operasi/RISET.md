# RISET: tindakan yang biasa dilakukan BNPB dan BPBD per bencana

## 1. Sumber

Arsip logbook harian Pusdalops BNPB 2011-2026 (`data/raw/logbook/arsip/*/baris.jsonl`, tidak di git, dari `logbook_arsip.tar.gz`). Satu baris = satu entri harian; satu kejadian (`id_kejadian`) bisa punya banyak entri. Kolom yang dibaca: `upaya`, `kondisi`, `peralatan`. Satuan hitung = kejadian, bukan entri. Kejadian "berisi" = paling sedikit satu entrinya punya teks di tiga kolom itu (5 huruf ke atas).

Ini laporan Pusdalops, bukan seluruh kejadian. Kategori dari kata kunci pada teks bebas, jadi bisa kurang (kata lain) atau lebih (salah tangkap). Persen = kejadian bertindakan itu dibagi kejadian berisi.

## 2. Hasil (17 Nov 2026, ambang 2 persen)

| Bencana (jenis logbook) | Kejadian berisi | Tindakan (persen) |
| --- | --- | --- |
| Banjir | 14.805 | kaji cepat 73, evakuasi 26, logistik 25, pantau 21, pembersihan 18, pengungsian 9, posko 9, imbauan 9, perbaikan darurat 9, dapur umum 8, kesehatan 6, alat berat 5, tanggul 4, buka akses 4, pompa 4, SAR 4, air bersih 3, status darurat 2 |
| Cuaca ekstrem | 12.167 | kaji cepat 75, pembersihan 26, logistik 24, evakuasi 17, pohon tumbang 16, perbaikan darurat 15, imbauan 7, pantau 4, buka akses 2 |
| Tanah longsor | 10.294 | kaji cepat 66, pembersihan 32, logistik 19, evakuasi 15, imbauan 12, perbaikan darurat 8, alat berat 7, buka akses 6, pantau 4, rambu 4, posko 3, kesehatan 3, SAR 2, pengungsian 2 |
| Gempa bumi | 2.242 | pantau 23, kaji cepat 14, logistik 6, imbauan 5, pengungsian 5, perbaikan darurat 4, evakuasi 3, posko 3, kesehatan 3 |
| Kekeringan | 815 | air bersih 93, kaji cepat 33, logistik 25, imbauan 5, posko 4, pantau 3, status darurat 2 (perbaikan darurat 1,7: di bawah ambang) |

Angka di tabel ini dibulatkan dari hitung pertama; angka resmi dan urutan registri mengikuti `public/data/bnpb/logbook_tindakan.json` (pola ALGORITMA 1).
| Gelombang pasang (pesisir) | 304 | kaji cepat 66, logistik 18, pantau 13, evakuasi 13, tanggul 9, imbauan 9, perbaikan darurat 8, pembersihan 6, posko 4, pengungsian 3, SAR 3, dapur umum 2 |
| Gunung api | 209 | pantau 43, masker 43, imbauan 38, kaji cepat 37, evakuasi 33, logistik 31, posko 31, pengungsian 28, kesehatan 26, air bersih 21, pembersihan 18, dapur umum 15, SAR 14, rambu 13, perbaikan darurat 12, status darurat 11, alat berat 9, buka akses 9, patroli 8, tanggul 5 |

Gempa rendah karena sebagian besar entrinya gempa dirasakan tanpa kerusakan. Kualitas udara tidak punya jenis di logbook (KEPUTUSAN Q2). Kebakaran permukiman 8.252 kejadian (pemadaman 66) belum ada di registri (Q1).

## 3. Sumber kedua: OMC

`public/data/bnpb/logbook_omc.json` (dari logbook yang sama): 120 kejadian OMC, 65 bertujuan karhutla, 24 hujan dan banjir (Jawa Barat, Jawa Tengah, Banten, Jawa Timur, Sumatera Utara, Oktober sampai Desember 2025), 31 tidak jelas. OMC masuk daftar banjir (KEPUTUSAN D2).

## 4. Salah tangkap yang dibuang

- "pemadaman" di banjir 3 persen sebagian besar "pemadaman listrik": pola kata kunci mengecualikan listrik dan aliran.
- Pemadaman api 10 persen dan water bombing 2 persen di gunung api, pemadaman 2 persen di kekeringan: kebakaran lahan yang menyertai, wilayah modul karhutla (KEPUTUSAN D4).

## 5. Kode repo yang dipakai ulang

- `scripts/umum/bencana.py` `JENIS_LOGBOOK_KE_BENCANA` memetakan jenis logbook ke id registri.
- `scripts/data/logbook_turunan.py`: pola agregat logbook tanpa teks asli.
- `src/pb_isian.js` `POST /api/pb/hasil` dan `GET /api/pb/kepatuhan`; `public/inti/renlap.js` kartu Hasil tindakan dan Kepatuhan.
- `scripts/umum/renlap.py` `target_longsor` sudah ada untuk menyalakan operasi longsor.
