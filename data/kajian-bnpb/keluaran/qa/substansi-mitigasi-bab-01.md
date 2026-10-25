# QA lapis (b) penyunting substansi: kajian mitigasi Bab 1

Berkas: `naskah/mitigasi/bab-01.md`. Pembanding: `naskah/mitigasi/bukti/bab-01.md`, `bab-01.angka.json`, `data/angka.json`,
`naskah/mitigasi/bukti/bab-13.md` (T1.30 sampai T1.34, LKIP BNPB 2025) dan `bab-13.angka.json`, register `naskah/mitigasi/bab-13.md`,
KERANGKA §2 dan §5 Bab 1, NASKAH-SPEK, Buku Pegangan L16 dan L60. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 62 token angka unik (kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json`: semua kunci ada, label keyakinan sah, `baca()` atas bab utuh lulus. Hitungan turunan
  dicek ulang: 1.735 + 221 = 1.956; 1.342 / 1.956 = 68,6%; 1.956 / 583,5 = 3,35; 1.956 / 287.198.383 x 100.000 = 0,68;
  0,22 x 287.198.383 / 100.000 = 632; (144,02 - 128,52) / 144,02 = 10,76%.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Latar Belakang paragraf 1; Angka kunci | Korban 2025 punya dua angka resmi (DIBI alam 1.735 dan 221; LKIP BNPB 2025, data terverifikasi, 1.666 dan 214), tetapi bab hanya memuat DIBI (bukti bab-13 T1.30) | LKIP ditulis berdampingan dengan tanggal terbitnya; "tertinggi sejak 2018" tetap benar untuk keduanya; selisih dirujuk ke permintaan data di Bab 13 |
| 2 | Paragraf IRBI 2025 | "BNPB belum menerbitkan rerata nasional 2025" dan "skala berubah adalah tafsiran penyusun yang belum dikonfirmasi" gugur: LKIP 2025 menetapkan 147,95 sebagai baseline 2026 sampai 2029 dan mengakui IRB 2025 berbeda dari IRB 2013 sampai 2024 (T1.5 dibantah, T1.31) | Ditulis ulang: baseline LKIP 147,95; penurunan 2025 1,03% terhadap target 1,2% (tidak tercapai); IRB 2024 171,95 (LKIP, KRB 2021) berdampingan dengan 128,52 (seri IRBI), tidak dirata-rata; yang belum terbit adalah bobot komponen dan agregasi kab/kota (@rek:r-m01). Kalimat pembuka dipendekkan (S-30), kata "signifikan" dibuang (S-32) |
| 3 | Ringkasan butir 2 | Hanya tren IRB 2019 sampai 2024; capaian 2025 yang tidak memenuhi target tidak tampil | Ditambah penurunan 2025 1,03% terhadap target 1,2%; kalimat dipecah (S-30) |
| 4 | Posisi terhadap Renas PB, paragraf indikator | (a) 38% kab/kota ditulis "kelas kapasitas KRB 2022 sampai 2026" tanpa menyebut bahwa kelas itu berasal dari ringkasan KRB bahaya COVID-19 (catatan entri `krb.nasional.kab_kapasitas_minimal_sedang_persen`); (b) "definisi dan penyebut keduanya tidak tertulis" tidak lagi benar untuk IKP Renstra, yang rumusnya tertulis di LKIP Tabel 3.4; (c) ukuran resmi kapasitas 2025 (50% provinsi, Manual IKU Kepka 318/2025) tidak tampil | (a) disebut "ringkasan KRB 2022 sampai 2026 untuk bahaya COVID-19"; (b) IKP 6,10% = rerata sederhana tsunami 12,19% dan banjir 0,01%, definisi Renas 1.c tetap tidak tertulis; (c) 50% provinsi berkategori IKD sedang atau tinggi ditulis berdampingan dengan 62%, 67%, dan 38% |
| 5 | Ringkasan, Rekomendasi | Tidak cocok dengan register Bab 13: R-A05 unit kedua (Deputi Sistem dan Strategi, register: Direktorat Pengembangan Strategi PB) dan horizon (14 hari, register: 100-hari); R-M02 tanpa Deputi Bidang Penanganan Darurat dan horizon 14 hari; R-M01 horizon | Diselaraskan dengan register; tenggat 14 hari dipertahankan sebagai langkah di dalam horizon 100 hari |
| 6 | Status Dokumen, paragraf Progsun | Kutipan `bnpb-2014-perka6` (pustaka bab-01) menduplikasi `bnpb-2014-produkhukum` di `pustaka.json` untuk dokumen yang sama, sehingga Perka 6/2014 akan tampil dua kali di daftar pustaka | Diganti `bnpb-2014-produkhukum` |

## Diperiksa dan tidak diubah

- Lantai skenario: Bab 1 tidak menyusun skenario; kalimat sasaran korban merujuk skenario terburuk Bab 6 dan Bab 7, bukan
  rerata. Tidak ada angka di bawah lantai.
- Angka model: tidak ada. Rasio per 100.000 berlabel proksi penyusun dan bukan realisasi resmi 1.a; 632 jiwa berlabel asumsi
  kebijakan.
- Angka bertentangan berdampingan: Renas 1.c lawan RPJMN KP 08.04.02; kapasitas 62/67/50/38; korban DIBI lawan LKIP; IRB 2024
  dua versi; DIBI alam lawan semua klasifikasi dengan patahan 2024.
- Kewenangan: Pasal 7 Perban 1/2025, Perpres 87/2020, PP 21/2008, Perpres 1/2019, UU 2/2002 Pasal 13, UU 7/2012, Perpres 46/2026
  dikutip sesuai bukti; jalur rakor Kemenko PMK ditandai usulan penyusun; tidak ada klaim BNPB sebagai regulator.
- "Terbukti": tidak ada klaim program terbukti di bab ini.
- Kebakaran gedung dan permukiman: naskah menulis pengecualian sebagai keputusan lingkup, bukan akibat kewenangan (UU 23/2014
  Lampiran E hlm. 332 sampai 333, bukti T3.6, putusan uji butir 4). Ini bertentangan dengan teks KERANGKA §2 butir 3 ("urusan
  pemadam kebakaran kab/kota"), tetapi bukti primer mendukung naskah; dibiarkan.
- Pertanyaan kunci KERANGKA §5 Bab 1 terjawab: PK1 di 1.1, PK2 di 1.2 dan 1.5, PK3 di 1.4. Komponen ada: Gambar 1.1
  (`gbr:korban-alam`, anotasi 2018 dan 2025, penanda patahan 2024), Kotak 1.1 definisi operasional (direktif `catatan`, B5.5),
  Tabel 1.1 taksonomi (`tbl:taksonomi`). Subbab dan judul sesuai KERANGKA.

## Sisa untuk orkestrator (di luar berkas ini)

1. Bab 1 kini memakai 12 kunci `bnpb.lkip2025.*` dan pustaka `bnpb-2026-lkip2025` yang baru ada di `bab-13.angka.json` dan
   `bab-13.pustaka.json`; gabungkan ke registri utama sebelum bangun. `Konteks._akhiran_tahun()` galat (string index out of range)
   saat pustaka mitigasi digabung, sama dengan temuan kajian air (entri penulis tanpa `family`).
2. `bab-03.angka.json` `irbi.nasional.2025_rerata` masih bercatatan "belum pernah diterbitkan BNPB" dan berlabel asumsi-kebijakan;
   LKIP menyatakan nilai yang sama secara resmi. Bab 3 dan Bab 5 perlu diselaraskan.
3. Bukti bab-13 meminta angka LKIP masuk lebih dulu ke Bab 5.4 (kapasitas) dan Bab 10.3 (peringatan dini); `lkip` belum muncul
   di naskah Bab 2 sampai 12. Rujukan Bab 1 "pilihannya dibahas di Bab 5" bergantung pada itu.
4. KERANGKA §5 pesan inti ("sampai baseline IRBI 2025 skala baru diterbitkan") dan §2 butir 3 (alasan kewenangan kebakaran)
   sudah tertinggal dari bukti; perlu disunting pemilik KERANGKA.
5. Pembacaan bahwa IKP peringatan dini Renstra sejalan dengan RPJMN KP 08.04.02 mengikuti KERANGKA §2 butir 10 dan bab-13;
   tidak dicek ulang ke teks RPJMN.
