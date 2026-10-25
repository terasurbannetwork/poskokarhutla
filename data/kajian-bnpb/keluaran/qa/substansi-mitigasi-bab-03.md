# QA lapis (b) penyunting substansi: kajian mitigasi Bab 3

Berkas: `naskah/mitigasi/bab-03.md`. Pembanding: `naskah/mitigasi/bukti/bab-03.md`, `bab-03.angka.json`, `data/angka.json`
dan `naskah/mitigasi/bukti/bab-*.angka.json`, KERANGKA §2 (butir 5–10, 17) dan §5 Bab 3. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 181 token angka unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` (bab-03 menang): semua kunci ada, nilai cocok dengan berkas bukti, label sah.
  `baca()` atas bab utuh lulus setelah suntingan.
- `qa/slop.py --final`: LOLOS, skor 0 (hanya temuan rendah S-18 atas daftar faktual). Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab butir 3; pembuka tebal 3.9 | Rentang "2.107 sampai 5.593" memakai dua angka sekunder (konferensi pers; 5.593 via Antara berstatus tidak terbukti, bukti P4 butir 1) di ringkasan dan judul temuan, padahal sekunder hanya pembanding di tabel rekonsiliasi (KERANGKA §2 butir 5; bukti P4 Inti) | Diganti rentang versi resmi primer CKAN 3.472 sampai DIBI semua laporan 3.636; di Tabel 3.8, 5.593 ditandai "sekunder, belum terverifikasi" |
| 2 | Subbab 3.4 paragraf lantai | "Pita La Niña 525–1.204 justru melampaui 465 meninggal dan 72 hilang": batas rendah 525 di bawah 537 tercatat; yang melampaui hanya batas tinggi (2,24 kali, bukti P2) | Ditulis "berbatas tinggi lebih dari dua kali" dan diberi label Estimasi model, belum diuji balik |
| 3 | Subbab 3.9 butir ketiga | "Enam belas segmen dibantah PuSGeN 2024 yang mencatat 14": bantahannya adalah 13 segmen untuk peta 2017 (bukti P4 butir 5) | Ditulis 13 untuk peta 2017 dan 14 untuk peta 2024 |
| 4 | Subbab 3.2 paragraf 2 | "Kenaikan itu efek patahan skala" ditulis sebagai fakta, padahal paragraf sebelumnya menyebutnya tafsiran penyusun yang belum dikonfirmasi BNPB | "dibaca sebagai efek patahan skala, bukan perubahan risiko" |
| 5 | Subbab 3.4 pembuka | Periode acuan 1996–2025 hanya disebut untuk geologi; KERANGKA §2 butir 9 juga untuk nonalam dan sosial | Ditambah |
| 6 | Subbab 3.1 | Empat label tanpa penjelasan, padahal KERANGKA §2 butir 6 lima label | "empat dari lima label; Penilaian pakar tidak dipakai" (dicek: tak ada bab mitigasi yang memakainya) |
| 7 | Subbab 3.6 pembuka | "Untuk kesembilan jenis ... korban, pengungsi, rumah rusak resmi" berlaku juga untuk kekeringan, padahal tabel menulis "–" | Ditambah "kekeringan tidak memiliki korban tercatat" |
| 8 | Tabel 3.5 catatan | Matriks tanpa keterangan kepekaan (KERANGKA §2 butir 10: kepekaan kualitatif ditulis di matriks) | Catatan tuas berkalkulasi (evakuasi tsunami, kepatuhan bangunan, peringatan dini selain longsor) dan sisanya analog tanpa perkalian; longsor kualitatif |
| 9 | Subbab 3.7 paragraf 2 | "Jitupasna menurut Perka 15/2011" mencampur nama: Perka 15/2011 menamai PDNA, istilah Jitupasna lahir di Perban 5/2017 (bukti P3 Inferensi) | "Jitupasna; Perka BNPB 15/2011 dan Perban BNPB 5/2017" |
| 10 | Subbab 3.10 paragraf 1 | "Empat hitungan turunan penyusun" tidak ada di bukti (hitungan penyusun lebih dari empat) | Diganti daftar jenis hitungan yang memang disebut bukti |
| 11 | Akhir bab: `matriks-rekomendasi` r-m01, r-m08, r-m20 | KERANGKA §2 butir 17: rekomendasi hanya di bab kesimpulan; ketiga ID juga didefinisikan di `bab-13.md` dengan isi berbeda, sehingga ID ganda | Blok dihapus; rujukan `@rek:` di ringkasan, 3.2, 3.3, 3.4, 3.8 tetap dan menunjuk Bab 13; kalimat penutup 3.10 tidak lagi merujuk `@tbl:rekomendasi-metode` |

## Diperiksa dan tidak diubah

- Lantai: lantai musim nasional 1.692 di atas batas tinggi semua pita; korban skenario nasional sama dengan lantai; lantai
  per jenis tidak diketik (menunggu `lantai_jenis.csv`); lantai geologi sesuai KERANGKA (Pangandaran 665, Mentawai
  447 + 56, Selat Sunda 437 + 16); Yogyakarta 2006 dan Padang 2009 disebut bukan megathrust. Tidak ada kejadian disisihkan.
- Angka model berlabel dan bersanding angka tercatat (pita terberat lawan 1.506 + 186; COVID-19 kematian berlebih lawan
  161.870). Pita megathrust lebih lebar dari satu orde tidak dikutip; korban tsunami tidak dikuantifikasi.
- Angka bertentangan berdampingan: Cianjur 2022 (DIBI lawan R3P, dua baris), Jabodetabek 2020, jiwa terpapar, kapasitas
  62/67/37,99 (KD-3), peringatan dini (KD-2), provinsi utama dua kriteria, lapisan berat lawan maksimum 2018.
- "Terbukti": tidak ada program disebut terbukti di Bab 3.
- Kewenangan: tidak ada klaim BNPB sebagai regulator; KRB dan IRBI pada unit BNPB; produsen Data Bencana sesuai Perban
  1/2023 Pasal 1 angka 6.
- Pertanyaan kunci 1–4 KERANGKA terjawab; Tabel 3.1 sampai 3.8 dan Gambar 3.1 ada di naskah.

## Sisa untuk orkestrator (di luar berkas ini)

1. Konflik satuan `r3p.cianjur2022.kerusakan_kerugian`: `bab-03.angka.json` 4,55 (triliun) lawan `bab-06.angka.json`
   4.550.000.000.000 (rupiah). Bab 3 memakai `|fmt=2|satuan`; saat digabung, satuan harus diputus satu dan token di Bab 3
   dan Bab 6 disesuaikan.
2. Berkas `gambar/mitigasi/rantai-metode.png` (Gambar 3.1) belum ada; baru versi air.
3. ID rekomendasi juga masih didefinisikan di bab non-kesimpulan lain (`matriks-rekomendasi` di bab-04, 05, 06, 07, 11);
   periksa ID ganda terhadap bab-13.
4. `data/angka.json` memberi `nonalam.plumpang2023.meninggal_akhir` (29) label resmi padahal paket melabelinya sekunder
   (bukti P4 butir 17); Tabel 3.8 sudah menulis "(sekunder)".
5. Lantai per jenis menunggu `skenario-hidromet/lantai_jenis.csv` (pemilik `pipa-data`); Tabel 3.4 baris banjir, banjir
   bandang, longsor, cuaca ekstrem tetap "tidak dinilai" sampai itu.
6. Hitungan [dihitung penyusun bukti] (korelasi IRBI dan DIBI, syarat daftar perhatian, Weibull, pita NRR, pengali)
   belum di skrip bangun paket.
