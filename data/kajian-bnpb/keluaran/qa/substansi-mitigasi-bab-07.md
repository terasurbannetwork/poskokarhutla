# QA lapis (b) penyunting substansi: kajian mitigasi Bab 7

Berkas: `naskah/mitigasi/bab-07.md`. Pembanding: `naskah/mitigasi/bukti/bab-07.md`, `bab-07.angka.json`, `data/angka.json`
dan `naskah/mitigasi/bukti/bab-*.angka.json`, KERANGKA §2 (butir 5–10, 12, 17) dan §5 Bab 7. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 157 token angka unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` (bab-07 menang) dan pustaka gabungan `bukti/bab-*.pustaka.json`: semua kunci
  ada, nilai cocok dengan berkas bukti, label sah. Hitungan turunan dicek ulang: 1.692 = 1.421 + 202 + 40 + 26 + 3;
  79,3% = 1.342/1.692; 2,8 kali = 1.692/600; 5,6 kali = 1.692/301,5; 1,77 = 1.692/954,3; 1.490 = 1.692 − 202;
  penurunan 39,7% dan 0,2% dari faktor 0,6034 dan 0,9980; kelas kependudukan karhutla 2 (12 jiwa) dan kekeringan 1 (6 jiwa).
  `baca()` atas bab utuh lulus setelah suntingan (371 angka disuntik).
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Subbab 7.9 paragraf 3 dan 4 | Hasil efek R = 8 (39,7% lawan 0,2%; 1.490 ke 899,1 dan 1.487) di kalimat pembuka tebal, padahal KERANGKA §2 butir 10 melarangnya di judul temuan, dan kalimat yang sama berkata hasil hanya tampil di kartu dan gambar (bukti P3 Inti) | Pembuka tebal menjadi metode (koefisien 8 kali, asosiasi lintas negara) dan komposisi tercatat (banjir 1.421 dari 1.490); angka jiwa hasil efek dibuang dari prosa dan tetap di kartu dan Gambar peringatan dini; persen penurunan tetap di badan teks berlabel asumsi kebijakan, sama dengan preseden air Bab 3 |
| 2 | Subbab 7.9 paragraf terakhir | "Tidak satu pun program peringatan dini hidrometeorologi ... InaTEWS berkekuatan sedang" menyiratkan InaTEWS program hidrometeorologi; InaTEWS adalah peringatan dini tsunami (bukti P3 butir 11 menyebutnya "program terkait") | Ditulis "program Indonesia yang terkait peringatan dini"; InaTEWS disebut sistem peringatan dini tsunami; pembuka tebal diberi angka (Haque, lebih dari 100 kali); kalimat meta "tidak diberi status Indonesia" diganti "kekuatan bukti itu tidak dialihkan ke program Indonesia" |
| 3 | Kartu longsor, kepekaan baris musim acuan | "lantai tetap musim 2025/2026" mengklaim 202 sebagai lantai, padahal lantai per jenis belum ada dan kandidat tahun terburuk longsor (2014) lebih berat (bukti P1 butir 9, Bahan subbab butir 6); pelanggaran potensial KERANGKA §2 butir 9 | "angka kartu tetap musim 2025/2026; lantai per jenis menunggu turunan" |
| 4 | Subbab 7.1 paragraf lantai; 7.10 paragraf 1 | Kartu banjir, longsor, cuaca ekstrem memakai korban satu musim tanpa peringatan bahwa angka itu dapat lebih ringan daripada tahun tercatat terburuk per jenis (kandidat bukti: banjir 2025, longsor 2014, cuaca ekstrem 2025 semuanya lebih berat) | Satu kalimat di 7.1 dan 7.10: korban musim bukan lantai per jenis dan dapat lebih ringan; angka kandidat tetap tidak diketik (bukti Komponen Kartu 7.6–7.8) |
| 5 | Subbab 7.6 paragraf 1 | "satu-satunya penilaian kerugian utuh" bertentangan dengan blok kebijakan kartu yang sama (2015 tanpa biaya regional dan global, 2019 tanpa kesehatan dan pendidikan) | "satu-satunya penilaian kerugian ekonomi berskala nasional ...; untuk banjir hanya tersedia DaLA Jabodetabek 2007" (bukti P4 Inferensi 2) |
| 6 | Subbab 7.5 paragraf 3 | Keluaran model neraca air dan padi platform dikutip `[@bnpb-2026-dibi]`; sumbernya `skenario-hidromet/README.md` dan `kekeringan_ujibalik.json`, bukan DIBI (bukti Bahan P2 butir 13) | Kutipan DIBI dibuang; ditulis "lampiran metode paket data skenario hidrometeorologi" |
| 7 | Ringkasan bab butir 3 | Angka model Koplitz 91.600 tampil tanpa label di samping angka tercatat 12 | Ditambah "model Koplitz dkk." dan "(estimasi model, belum diuji balik terhadap data kematian Indonesia)" |
| 8 | Subbab 7.1 paragraf Sumatra | "terberat di antara kejadian hidrometeorologi besar dalam DIBI": dasar bukti hanya daftar `kejadian_besar.csv` pilihan penyusun paket, bukan pemindaian seluruh DIBI (bukti P1 butir 9) | "terberat dalam daftar kejadian hidrometeorologi besar DIBI yang dihimpun paket data" |
| 9 | Subbab 7.5 paragraf Puncak | "Rumusan bahwa korban jiwa kekeringan tidak berlaku karena itu tidak dipakai" adalah meta-komentar atas KERANGKA | "Korban jiwa kekeringan karena itu jarang tetapi bukan nol" (bukti Bahan Inferensi 2) |
| 10 | Tabel karhutla per provinsi, catatan | Alasan ISPA tidak dimuat ("versi pers dan DPR bertentangan") berbeda dengan badan teks dan kartu (semua versi bersumber pers; bukti P4 butir 4 dan 6) | Diselaraskan: semua versi bersumber pers, termasuk rangkuman Badan Keahlian DPR, dan angka per provinsi bertentangan |
| 11 | Kartu karhutla, kepekaan baris kemarau tahun kedua | Nilai dasar dan nilai digeser sama tanpa alasan | "lantai tetap: 2015 adalah tahun kedua El Niño 2014–2016 sekaligus tahun lantai" (bukti P2 butir 14) |
| 12 | Tabel kesenjangan, baris lantai per jenis | Pemegang data "pengerja paket skenario hidrometeorologi" adalah istilah internal repo | "tim penyusun kajian ini, turunan paket data skenario hidrometeorologi" |
| 13 | Akhir bab: `matriks-rekomendasi` r-a02, r-a03, r-a04, r-a06, r-a08, r-a09, r-a10, r-a11 | KERANGKA §2 butir 17: rekomendasi hanya di bab kesimpulan; kedelapan ID juga didefinisikan di `bab-13.md`, sehingga ID ganda | Blok dihapus; rujukan `@rek:` di ringkasan, badan teks, dan kartu tetap dan menunjuk Bab 13 |
| 14 | Subbab 7.9 dan 7.10 | Dua kalimat terlalu panjang dan satu tiga-serangkai (slop S-30, S-18) | Dipecah dan diringkas |

## Diperiksa dan tidak diubah

- Lantai: kartu musim hujan terburuk dan kartu 2026/2027 memakai lantai 1.692; ekspektasi tiga musim El Niño kuat
  (199–373) dipisah dari skenario terburuk; gelombang memakai 2011 (36), bukan analog paket 2021 (4); kekeringan
  memakai 2018 (terdampak) dan Puncak 2023 (6 meninggal); karhutla 2015. Ketiganya ditulis kandidat, sesuai bukti.
- Model selalu bersanding tercatat dan berlabel: pita musim 2025/2026 (396–954 lawan 1.692), banjir (229–580 lawan
  1.421), La Niña (525–1.204 lawan 537), longsor (pita tidak dipakai karena batas rendah di atas 153), Koplitz lawan
  DIBI 12, rob Jratunseluna simulasi berlabel estimasi model. Pita gelombang (17,7 kali) tidak tampil.
- Angka bertentangan berdampingan: Sumatra RB 63.019 lawan 62.956 (dua jendela), Jabodetabek 2020 51 lawan 61, Seroja
  154 + 34 lawan 184 + 47, paparan gelombang tiga versi, potensi kerugian gelombang dua versi, indeks ENSO NOAA lawan
  BMKG dengan nama indeksnya, Bekasi 2020 sebagai baris kepekaan.
- "Terbukti": tidak ada program disebut terbukti; kekuatan bukti InaTEWS, Sekolah Lapang Iklim, dan Bangladesh sesuai
  `kompendium_program.csv`.
- Kewenangan: tidak ada klaim BNPB sebagai regulator; kartu menempatkan Kementerian PU, Kementerian Kehutanan, BMKG
  sebagai pemegang data atau pelaksana; platform peringatan dini di Deputi Bidang Pencegahan (Perban 2/2024 Pasal 3).
- Pertanyaan kunci 1–4 terjawab. Komponen KERANGKA ada: Gambar IRBI (G19), Gambar musim hujan (G1), kartu per jenis
  banjir, longsor, cuaca ekstrem, gelombang, kekeringan, karhutla, kartu agregat terburuk dan 2026/2027, Gambar
  peringatan dini (G14), Tabel karhutla per provinsi; ditambah Gambar kalender (G16) dan Tabel kesenjangan.
- ISPA 450.431 dan 919.516 (KERANGKA) tidak dimuat: semua bersumber pers (bukti P4). "Korban jiwa kekeringan tidak
  berlaku" (KERANGKA) dibantah bukti dan diganti Puncak 2023.

## Sisa untuk orkestrator (di luar berkas ini)

1. `skenario-hidromet/lantai_jenis.csv` (pemilik `pipa-data`) belum ada; kartu banjir, longsor, cuaca ekstrem tetap
   tanpa lantai, dan kandidat bukti (banjir 2025 1.585, longsor 2014 354, cuaca ekstrem 2025 81) semuanya di atas
   angka musim yang dipakai kartu. Begitu turunan ada, kartu dan kepekaan bab ini harus diisi ulang.
2. Angka BPK (19,68%, 82,82%, kekurangan radar, AWS, ARG) dikutip dari ringkasan Badan Keahlian DPR; LHP BPK tidak
   dibuka. Label registri "resmi; dikutip lembaga negara" dan kajian air memakai hal yang sama. Bila KERANGKA §2
   butir 5 dibaca ketat (sumber primer tidak terbuka dikeluarkan), paragraf hulu 7.9 dan dua kutipan kartu ikut keluar;
   keputusan lintas kajian.
3. Persen penurunan efek R = 8 (39,7% dan 0,2%) masih di badan teks 7.9 (bukan judul), sejalan preseden QA air Bab 3;
   bila prinsip 10 dibaca "hanya kartu dan grafik" secara harfiah, kalimat itu ikut dipindah.
4. Berkas gambar `gambar/mitigasi/bab07-*.png` (G19, G1, G14, G16, enam peta kartu) belum diperiksa keberadaannya.
5. Bukti P1 butir 3: `hidromet.nasional.terberat.stimulan_rumah_semua_jenis` dan `hidromet.sumatra2025.stimulan_rumah_semua_jenis`
   sengaja tidak dipakai (KERANGKA §2 butir 9 (c)); kunci boleh tetap di usulan registri tanpa token.
6. Pustaka mitigasi tersebar di `bukti/bab-*.pustaka.json`, belum digabung ke `pustaka.json`; `_akhiran_tahun()`
   gagal (lebih dari 10 entri berpenulis dan tahun sama, misalnya BNPB 2026) saat semua berkas digabung. Perlu
   diputus sebelum bangun final.
