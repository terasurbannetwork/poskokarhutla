# Berkas bukti Bab 7: AIR: PEMANFAATAN AKUIFER (AIR TANAH)

Kajian: Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030 (pembaca Kepala BNPB).
Disusun 25 Oktober 2026 oleh peneliti berkas bukti (subagent), dari `rehab/KERANGKA.md` Bab 7, riset `rehab/riset/C` (utama), `A`, `D`, `E`, `F`, paket `data/air-jawa`, `data/dibi`, `data/program-terbukti`, registri `data/angka.json` dan `pustaka.json`, korpus `data/raw/hukum/teks`, serta tujuh halaman yang dibuka ulang sesi ini (rilis ESDM 27 Juni 2019, 12 Februari 2019, 2 Desember 2020; Setneg 13 Agustus 2026 dan 6 Januari 2022; rilis PU 5 Februari 2026; abstrak Marohn dkk. 2012).

Konvensi. Path relatif ke `data/kajian-bnpb/` kecuali disebut lain. Label keyakinan: resmi, terverifikasi, estimasi-model, asumsi-kebijakan. Angka media ditandai **sekunder** dan hanya boleh masuk lampiran rekonsiliasi (KEPUTUSAN-AWAL R3, Q16), tidak masuk badan teks. Kunci `rehab.*` baru tercatat di `bab-07.angka.json`; kunci yang sudah ada di `data/angka.json` atau di `bab-01` sampai `bab-04.angka.json` disebut dengan namanya dan tidak diulang. Id pustaka merujuk `bab-07.pustaka.json`.

## Pegangan bab (dari KERANGKA §4 Bab 7)

- **Judul:** BAB 7 AIR: PEMANFAATAN AKUIFER (AIR TANAH) (perkiraan 12 hlm).
- **Subbab:** 7.1 Cekungan Air Tanah dan Zona Konservasi; 7.2 Sumur Bor Darurat dan Sumur Produksi: Praktik Badan Geologi, PU, TNI AD, Polri; 7.3 Mutu Air Tanah Pascabencana; 7.4 Intrusi Air Laut Pascatsunami; 7.5 Akuifer Terdampak Likuefaksi; 7.6 Batas Pengambilan: Penurunan Muka Tanah; 7.7 Air Tanah untuk Huntap; 7.8 Kesenjangan Spesifik Air Tanah.
- **Tujuan bab:** menentukan kapan air tanah menjadi jawaban RR dan kapan menjadi risiko baru.
- **Pertanyaan kunci:** (1) Di CAT dan zona mana sumur bor RR aman dibangun? (2) Berapa debit, kedalaman, jiwa terlayani, dan biaya satuan sumur bor? (3) Bagaimana mutu air diuji dan oleh siapa? (4) Apa yang terjadi pada akuifer setelah tsunami dan likuefaksi? (5) Bagaimana sumur darurat diserahkan dan dirawat sesudah status berakhir?
- **Temuan kunci yang diharapkan (KERANGKA):** 421 CAT; sumur Badan Geologi sekitar 125 m, 1–2,4 l/detik, sekitar 2.000 jiwa per sumur, kumulatif 2005–2018 2.290 unit untuk 6,6 juta jiwa; biaya sumur dalam Rp472–572 juta dan dangkal darurat sekitar Rp142 juta (estimasi-model); TNI AD 3.000 sumber air bersih (resmi) dan 3.300 titik (sekunder); Polri 569 titik (sekunder); PU 86 sumur dalam (sekunder) lawan 128 sumur bor (resmi); Permenkes 2/2023 E. coli 0 dan arsen 0,01 mg/L; Sphere 10 CFU/100 ml; salinitas Aceh Barat turun dari lebih dari 10 ke kurang dari 2 mS/cm dalam dua tahun; penurunan muka tanah Pantura Jateng 6–10 cm per tahun; huntap Tondo 1.102 unit.
- **Komponen (KERANGKA):** Gambar 7.1 peta CAT dan zona konservasi (G19 bila poligon diperoleh, bila tidak tabel provinsi); Tabel 7.1 pelaksana sumur bor; Tabel 7.2 standar mutu per lapis; Kotak 7.1 air tanah di kawasan penurunan muka tanah (L63); Halaman studi kasus 7.1 salinitas Aceh Barat atau Palu likuefaksi dan saluran Gumbasa.
- **Status data (KERANGKA):** sebagian (poligon zona konservasi tidak terunduh; izin air tanah darurat tidak diatur; status PP 43/2008 dan penerbit izin belum pasti, KERANGKA induk celah 32).

**Koreksi atas kerangka yang wajib dibawa penulis.**

| Butir KERANGKA | Temuan sesi ini | Status |
|---|---|---|
| "PU 86 sumur dalam (sekunder) lawan 128 sumur bor (resmi); rekonsiliasi" | Rilis PU 5 Februari 2026 (dibuka ulang) memuat keduanya: Ditjen SDA 25 sumur bor air dalam, Ditjen Cipta Karya 103 unit terdiri atas 17 sumur dangkal dan 86 sumur dalam. 86 adalah bagian, bukan versi lain dari 128. Angka 86 kini resmi | dibantah sebagai "dua versi"; sama dengan koreksi bab-01 butir 3 |
| 421 CAT "dicek ulang" dari Permen ESDM 2/2017 | 421 sudah terbaca langsung dari Keppres 26/2011 Lampiran I (205 dalam kab/kota, 176 lintas kab/kota, 36 lintas provinsi, 4 lintas negara), kunci `airjawa.nasional.cat_jumlah`. Rilis ESDM 2009 menulis 206 dalam kab/kota; rincian ITS menurut Permen 2/2017 menulis 381, 36, 4 | dikukuhkan; rincian ditulis berdampingan |
| "Penurunan muka tanah pesisir utara Jawa Tengah 6–10 cm per tahun (resmi [C50])" dipakai sebagai dasar kehati-hatian sumur bor | Rilis yang sama (dibuka ulang) menyebut penyebab utama lempung muda yang masih memadat dan menyatakan peran pengambilan air tanah belum terbukti ilmiah. Angka 6–10 cm benar, tetapi tidak boleh ditulis sebagai bukti bahwa air tanah penyebabnya | dikukuhkan dengan syarat tafsir |
| Daftar CAT rusak untuk syarat (d) daftar perhatian | `air-jawa/cat_air_tanah_rusak.csv` memuat 7 CAT termasuk Pekalongan-Pemalang, tanpa Palangkaraya; catatan pustaka `badangeologi-2024-cat` memuat Palangkaraya dan tidak memuat Pekalongan-Pemalang. Keduanya pernyataan, bukan penetapan | bertentangan; ditulis berdampingan (lihat PK1 butir 6) |

---

## Pertanyaan kunci 1. Di CAT dan zona mana sumur bor RR aman dibangun?

### Inti

Indonesia memiliki 421 CAT yang menjadi acuan wajib penetapan zona konservasi air tanah (aman, rawan, kritis, rusak), tetapi daftar zona resmi per CAT belum terbuka dan Badan Geologi sendiri baru menargetkan zona konservasi di CAT prioritas pada 2029 dan di seluruh CAT pada 2045. Karena itu jawaban "di zona mana aman" hari ini hanya dapat diberikan per lokasi oleh Badan Geologi, bukan dari peta nasional. Yang dapat dikunci sekarang adalah daftar negatif sementara: CAT yang dinyatakan rusak oleh Badan Geologi (pernyataan, bukan penetapan) dan kota pesisir dengan penurunan muka tanah terukur.

### Temuan bersumber

1. Jumlah CAT 421: 205 dalam kab/kota, 176 lintas kab/kota, 36 lintas provinsi, 4 lintas negara. Sumber: Keppres 26/2011 Lampiran I (pustaka `keppres-2011-cat`); kunci yang sudah ada `airjawa.nasional.cat_jumlah`. Label: resmi. **Berdampingan:** rilis ESDM 11 Juli 2009 menulis 206 dalam kab/kota (riset C [2]); materi ITS 2024 menurut Permen ESDM 2/2017 menulis 381 dalam provinsi, 36 lintas provinsi, 4 lintas negara (riset C [4], terverifikasi, dari cuplikan). Total sama di ketiganya.
2. Permen ESDM 2/2017 Pasal 6: CAT menjadi acuan Menteri dan gubernur dalam penetapan zona konservasi, pemakaian, pengusahaan, dan pengendalian daya rusak air tanah. Lampiran I dan II berupa pindaian. Sumber: riset C [3] (dibaca langsung oleh riset C; pustaka `esdm-2017-permen2-cat`). Label: resmi.
3. Kategori zona: zona perlindungan, dan zona pemanfaatan aman, rawan, kritis, rusak. Sumber: Permen ESDM 31/2018 (riset C [5], dari cuplikan dan rujukan jurnal; teks belum dibaca; pustaka `esdm-2018-permen31-zona`). Label: resmi (isi belum diverifikasi langsung).
4. Target penyusunan zona konservasi air tanah: CAT prioritas 2029, seluruh CAT 2045; 161 sumur pantau air tanah nasional (artikel yang sama juga menulis 131 + 37 = 168). Sumber: pustaka `badangeologi-2025-capaian`; kunci yang sudah ada `airjawa.nasional.sumur_pantau_air_tanah`. Label: resmi. Kunci baru `rehab.akuifer.zona_konservasi_target_semua_cat` (2045) dan `rehab.akuifer.zona_konservasi_target_prioritas` (2029).
5. Badan Geologi menyatakan enam CAT di Jawa rusak (Jakarta, Karawang-Bekasi, Semarang, Bandung-Soreang, Bogor, Serang-Tangerang) dalam artikel situs resminya 22 Januari 2024, mengutip pernyataan Plt. Kepala Badan Geologi pada konferensi pers 13 November 2023; artikel itu teks CNBC Indonesia yang dimuat ulang. Sumber: pustaka `badangeologi-2024-cat`; naskah kajian air `naskah/air/bab-04.md` (paragraf CAT rusak). Label: resmi untuk keberadaan pernyataan; status "rusak" tidak berdokumen penetapan.
6. **Bertentangan di repo:** `air-jawa/cat_air_tanah_rusak.csv` (label sekunder) memuat tujuh CAT, termasuk Pekalongan-Pemalang, sedangkan catatan pustaka `badangeologi-2024-cat` menulis tujuh nama dengan Palangkaraya dan tanpa Pekalongan-Pemalang, dan naskah kajian air menulis enam di Jawa dengan Pekalongan disebut hanya sebagai contoh penurunan tanah. Sumber: berkas dan pustaka tersebut. Label: resmi (pernyataan) dan sekunder (CSV). Penyajian: tulis enam CAT Jawa yang sama di kedua versi, sebut Palangkaraya dan Pekalongan-Pemalang sebagai beda versi.
7. CAT Jakarta: pada 2009 pengambilan air tanah dalam sekitar 21 juta m³ per tahun dari potensi 52 juta m³ (40%, anjuran maksimum 20%), dinyatakan kritis hingga rusak. Sumber: pustaka `esdm-2009-cat-jakarta`; kunci yang sudah ada `airjawa.jakarta.ambil_akuifer_dalam_2009`. Label: resmi.
8. Perizinan: Penjelasan UU 17/2019 menetapkan kebutuhan pokok minimal 60 liter per orang per hari dan "air dalam jumlah besar" untuk air tanah sebagai sumur bor berdiameter lebih dari 2 inci atau lebih dari 25 m³ per bulan per KK; sumur gali bertenaga manusia tidak memerlukan izin. Sumber: riset C [7] (dibaca langsung); pustaka `ri-2019-uu17`. Label: resmi.
9. Kepmen ESDM 291.K/GL.01/MEM.G/2023: persetujuan penggunaan air tanah wajib bila kebutuhan pokok sehari-hari paling sedikit 100 m³ per bulan per KK atau lebih dari 100 m³ per bulan per kelompok; teks tidak memuat ketentuan bencana atau keadaan darurat. Sumber: riset C [9] (dibaca langsung); kunci yang sudah ada `esdm.air_tanah.ambang_persetujuan_m3_bulan` (pustaka `esdm-2023-air-tanah`). Label: resmi.
10. **Dibantah oleh / berdampingan:** ambang UU 17/2019 (25 m³ per bulan per KK atau diameter lebih dari 2 inci) jauh lebih ketat daripada ambang Kepmen 291.K (100 m³ per bulan per KK). Satu sumur bor Badan Geologi 1–2,4 l/detik menghasilkan sekitar 2.590–6.220 m³ per bulan, jauh di atas kedua ambang, sehingga sumur bor RR berskala komunal tidak berada dalam pengecualian kebutuhan pokok mana pun. Sumber: butir 8–9; debit dari pustaka `esdm-2019-sumur-750`. Label: resmi (ambang); estimasi-model (volume bulanan, 1 l/detik × 86.400 × 30 hari).
11. PP 43/2008 tentang Air Tanah Pasal 65: dalam keadaan membahayakan lingkungan, pejabat mengambil tindakan darurat, dengan penjelasan antara lain menghentikan pengeboran. PP 30/2024 mencabut PP 121/2015, PP 22/1982, dan PP 6/1981 tanpa tercatat mencabut PP 43/2008. Sumber: riset C [6] (dibaca langsung) dan [8] (metadata BPK); pustaka `ri-2008-pp43`. Label: resmi. Status keberlakuan PP 43/2008 tetap "belum dapat dipastikan" (KERANGKA induk celah 32).
12. Permen ESDM 14/2024 memangkas syarat izin pengusahaan baru dari 13 menjadi 3, terintegrasi OSS, SLA 14 hari kerja; rilis menyebut daerah dengan cadangan air tanah "rawan, kritis, dan rusak" tanpa nama. Sumber: pustaka `esdm-2025-perizinan-air-tanah`. Label: resmi.
13. Kebergantungan rumah tangga pada air tanah di provinsi kejadian besar (Susenas 2023, persen rumah tangga dengan sumber air minum sumur bor/pompa ditambah sumur terlindung; leding di kurung): Aceh 33,77 (7,79); Sumatera Utara 33,00 (11,66); Sumatera Barat 23,35 (11,42); NTB 42,33 (12,80); Sulawesi Tengah 19,75 (7,76); Jawa Barat 33,68 (4,66); Indonesia 32,33 (8,92). Sumber: `air-jawa/mentah/bps/sumber_air_minum_prov_2023.txt`, kolom 2 dan 4 (nama kolom dikukuhkan dengan pembanding Kompas 13 Februari 2024 menurut `air-jawa/README.md` baris `air_minum.csv`), pustaka `bps-2024-sumber-air-minum-prov`. Label: resmi (olah penjumlahan dua kolom). Kunci baru `rehab.akuifer.rt_air_tanah_minum_2023.<prov>`. Batas bawah: sumur dan mata air tak terlindung tidak dihitung.

### Inferensi (analisis tim, bukan fakta bersumber)

- Pertanyaan "di zona mana aman" belum dapat dijawab dengan peta selama zona konservasi belum ditetapkan untuk sebagian besar CAT (target 2029 dan 2045). Selama itu, satu-satunya penjaga yang bekerja adalah rekomendasi teknis Badan Geologi per titik. Ini sejalan dengan bawaan Q10 dan menjadi alasan R-RR-10 (protokol sumur bor RR bersama Badan Geologi) perlu memuat langkah rekomendasi titik yang dapat diberikan dalam hari, bukan minggu.
- Di provinsi kejadian besar, sekitar seperempat sampai dua perlima rumah tangga sudah minum dari sumur, sedangkan leding hanya 8–13 persen. Pemulihan air pascabencana di sana karena itu bukan semata pemulihan SPAM (Bab 6); pemulihan sumur warga yang rusak, keruh, atau asin adalah pemulihan sumber air mayoritas. Ukuran "SPAM berfungsi" tidak menangkap ini (prinsip 4).
- Rezim izin air tanah tidak punya pintu darurat. Sumur bor komunal RR melampaui semua ambang pengecualian, sehingga secara hukum memerlukan persetujuan atau izin, padahal dibangun dalam hitungan hari oleh pelaksana yang bukan pemohon biasa (TNI, Polri, PU, BNPB). Celah ini lebih baik ditutup dengan prosedur pemutihan dan pencatatan sesudahnya daripada pengecualian penuh, karena pengecualian penuh justru menghapus satu-satunya jejak administratif sumur.
- Daftar CAT rusak hanya boleh dipakai sebagai penanda kehati-hatian (syarat (d) aturan daftar perhatian, KERANGKA §4 Bab 3), bukan dasar menolak bantuan air, selama statusnya tidak berdokumen penetapan.

### Celah

- Poligon CAT dan zona konservasi resmi tidak terunduh; berkas SIG Badan Geologi tidak terverifikasi tersedia. Gambar 7.1 disajikan sebagai tabel provinsi atau peta titik kota, bukan peta zona.
- Daftar nasional CAT berstatus rawan, kritis, atau rusak berikut dokumen penetapannya tidak ditemukan. Disajikan sebagai pernyataan dua versi.
- Teks Permen ESDM 31/2018 dan 14/2024 belum dibaca langsung; ketentuan pemutihan sumur darurat tidak ditemukan. Ditulis sebagai kesenjangan (Bab 9.5), tidak ditafsirkan.
- Air tanah per kab/kota (volume berizin, muka air tanah, intrusi) tidak ada di repo (`air-jawa/README.md` §5).

---

## Pertanyaan kunci 2. Berapa debit, kedalaman, jiwa terlayani, dan biaya satuan sumur bor?

### Inti

Satu-satunya pelaksana yang menerbitkan spesifikasi adalah Badan Geologi: sumur sekitar 125 m, debit 1–2,4 l/detik, sekitar 2.000 jiwa per sumur, dan 2.290 unit untuk sekitar 6,6 juta jiwa pada 2005–2018. Biaya per unit tidak diterbitkan; hasil bagi pagu memberi sekitar Rp472–572 juta untuk sumur dalam dan sekitar Rp142 juta untuk sumur dangkal tanggap bencana (estimasi-model). Pada Sumatra 2025 Kementerian PU membangun 128 sumur bor, tetapi baru 37 selesai per 2 Februari 2026; TNI AD dan Polri melaporkan ribuan dan ratusan titik tanpa spesifikasi, biaya, atau daftar.

### Temuan bersumber

1. Spesifikasi Badan Geologi: kedalaman sekitar 125 m; debit rata-rata 1 hingga 2,4 liter per detik; tiap sumur memenuhi kebutuhan sekitar 2.000 orang. Sumber: rilis ESDM 27 Juni 2019 (dibuka ulang 25 Oktober 2026), pustaka `esdm-2019-sumur-750`; kunci baru `rehab.akuifer.sumur_bg_kedalaman_tipikal`, `rehab.akuifer.sumur_bg_debit_min`, `rehab.akuifer.sumur_bg_debit_maks`, `rehab.akuifer.sumur_bg_jiwa_per_sumur`. Label: resmi.
2. Kumulatif Badan Geologi 2005–2018: 2.290 unit, sekitar 144,4 juta m³ per tahun, sekitar 6,6 juta jiwa; 2018: 506 titik di 175 kab/kota ditambah 55 titik untuk pengungsi bencana Bali, Lombok, dan Sulawesi. Sumber: pustaka `esdm-2019-sumur-750` (dibuka ulang). Label: resmi. Kunci baru `rehab.akuifer.sumur_bg_kumulatif_2005_2018`, `rehab.akuifer.sumur_bg_jiwa_kumulatif_2005_2018`, `rehab.akuifer.sumur_pengungsi_2018`. **Berdampingan:** rilis ESDM Maret 2018 menulis 1.782 unit di 312 kab/kota untuk sekitar 5 juta jiwa (2005–2017) (riset C [14], resmi); hasil cari web sesi ini juga memuat 2.288 unit sampai 2018 dari pernyataan Badan Geologi lain (tidak dibuka, tidak dipakai).
3. Contoh tanggap bencana Badan Geologi: Sulteng, 8 titik diserahkan 12 Februari 2019, kedalaman 78–125 m, debit rata-rata 1,9 l/detik, Pombewe sekitar 2.500 jiwa (biaya tidak disebut) (pustaka `esdm-2019-sumur-sulteng`, dibuka ulang); Lombok Utara 7 titik dipetakan, 2 beroperasi per 9–10 Agustus 2018 setelah gempa 5 Agustus (riset C [20]); Pidie Jaya 2016, 2 siap pakai dan 4 konstruksi, sekitar 1.020 dan 400 jiwa (riset C [22]); Cianjur 2022, 19 titik termasuk 4 untuk lokasi relokasi (riset C [21]). Label: resmi. Kunci baru `rehab.akuifer.sulteng_debit_rata_2019`, `rehab.akuifer.sulteng_titik_serah_2019`, `rehab.akuifer.cianjur_sumur_bor_bg_2022`.
4. Biaya per unit, hasil bagi pagu (bukan angka resmi per unit): Rp429,1 miliar / 750 sumur rencana 2020 = sekitar Rp572 juta; Rp125 miliar / 250 titik tambahan 2020 = Rp500 juta; nilai perolehan Rp8,5 miliar / 18 sumur dalam hibah BMN 2023 = sekitar Rp472 juta; sekitar Rp7,1 miliar / 50 sumur dangkal tanggap bencana = sekitar Rp142 juta. Sumber: pustaka `esdm-2019-sumur-750` (Rp429,1 miliar, 750, Rp7,1 miliar, 50 dibuka ulang), `esdm-2019-sumur-1000` (riset C [16]), `esdm-2023-hibah-bmn` (riset C [17]; rincian per kabupaten di rilis berjumlah 17, bukan 18). Label: estimasi-model (hasil bagi; komponen pompa, tandon, genset tidak seragam; tahun harga 2019–2023). Kunci baru `rehab.akuifer.biaya_sumur_dalam_per_unit_2020`, `rehab.akuifer.biaya_sumur_dalam_tambahan_per_unit_2020`, `rehab.akuifer.nilai_perolehan_sumur_dalam_per_unit_2023`, `rehab.akuifer.biaya_sumur_dangkal_darurat_per_unit`.
5. Turunan dari butir 1 dan 4: biaya per jiwa terlayani sumur dalam sekitar Rp286.000 (Rp572 juta / 2.000 jiwa); takaran yang tersirat dari 2.000 jiwa per sumur adalah sekitar 43–104 liter per orang per hari (1–2,4 l/detik × 86.400 detik / 2.000), di atas standar darurat 15 liter dan mengapit SPM 60 liter. Pada takaran darurat 15 liter, satu sumur yang sama secara hitungan cukup untuk sekitar 5.760–13.824 jiwa. Sumber: hitungan dari butir 1 dan 4; standar dari Perka BNPB 7/2008 (pustaka `bnpb-2008-kebutuhan-dasar`) dan Penjelasan UU 17/2019. Label: estimasi-model. Kunci baru `rehab.akuifer.biaya_sumur_dalam_per_jiwa`, `rehab.akuifer.takaran_tersirat_lpd_min`, `rehab.akuifer.takaran_tersirat_lpd_maks`.
6. Kementerian PU, Sumatra, data 2 Februari 2026: Ditjen SDA 25 sumur bor air dalam (Aceh 24: 11 selesai, 13 dikerjakan; Sumbar 1 di RSUP Dr. M. Djamil; Sumut belum ada); Ditjen Cipta Karya 103 unit, terdiri atas 17 sumur dangkal di Aceh (9 selesai, 8 dikerjakan) dan 86 sumur dalam (Aceh 17 selesai dan 46 dikerjakan; Sumut 5 dikerjakan; Sumbar 18 tahap survei dan geolistrik). Kedalaman tidak disebut. Sumber: rilis PU 5 Februari 2026 (dibuka ulang), pustaka `pu-2026-spam-sumatera-feb`; kunci yang sudah ada `rehab.pipa.sumatra2025.sumur_bor_feb2026` (128). Label: resmi. Kunci baru `rehab.akuifer.sumatra2025.pu_sumur_selesai_feb2026` (37), `rehab.akuifer.sumatra2025.pu_sumur_dalam_ck_feb2026` (86), `rehab.akuifer.sumatra2025.pu_sumur_dalam_sda_feb2026` (25).
7. Dari butir 6: 37 dari 128 sumur PU (28,9%) selesai sekitar 10 minggu setelah kejadian; 18 sumur dalam Sumatera Barat masih di tahap survei. Rilis menulis "86 unit tersebar di Provinsi Aceh" lalu merinci 17 selesai dan 46 dikerjakan di Aceh serta 5 Sumut dan 18 Sumbar; rincian menjumlah 86 hanya bila "86" dibaca sebagai total tiga provinsi (sama dengan bacaan bab-01 butir 3). Sumber: sama. Label: resmi (olah).
8. Lantai tercatat Lombok 2018: tanggap darurat mengaktifkan 83 sumur bor JIAT berkapasitas total 1.314 l/detik. Sumber: buku Satgas PUPR Lombok (riset D [10]; pustaka `kemenpupr-2019-satgas-lombok`). Label: resmi. Kunci (calon riset D) `rehab.pipa.lombok.sumur_bor_darurat`; dicatat di bab-07.angka.json karena belum ada di registri.
9. TNI AD: "3.000 sumber air bersih TNI Angkatan Darat" diresmikan 13 Agustus 2026; jenis, lokasi, penerima, dan biaya tidak disebut. Sumber: Setneg 13 Agustus 2026 (dibuka ulang), pustaka `setneg-2026-jembatan-tni-polri`. Label: resmi. Kunci KERANGKA `rehab.akuifer.tniad_sumber_air_2026_08`. **Sekunder (lampiran saja):** 3.300 titik air bersih per Januari 2025 dengan "bantuan dari pemerintah hanya 5 persen" (Antara, riset C T2).
10. **Sekunder (lampiran rekonsiliasi saja):** Polri target 569 sumur di Sumatra, realisasi 249 (236 aktif) per 4 Januari 2026 (Republika, riset C [43]); Kodam Iskandar Muda 121 sumur, Polri 146 titik (Katadata mengutip BNPB, riset C [42]); BNPB target 100 sumur Langkahan sekitar 40 m, 6 dari 10 berhasil (riset C [46]); Kemenhut 4 dari 10 di Aceh Tamiang (riset C [47]); PU 24 titik air baku Aceh Tamiang (riset C [45]). Rekonsiliasi: PU 24 (media) cocok dengan Ditjen SDA Aceh 24 (resmi, butir 6).
11. Lantai tsunami: MDF Aceh-Nias melaporkan hampir 8.000 sumur atau sumber air bersih per Desember 2011. Sumber: pustaka `mdf-2011-progress`; kunci yang sudah ada `rehab.pelajaran.aceh.mdf_sumur` (bab-02). Label: terverifikasi (laporan pengelola dana sendiri; bukti keluaran lemah menurut riset E).
12. Kebutuhan sumur pada lantai tercatat, model sederhana dengan rasio 2.000 jiwa per sumur: Sumatra 2025 dengan 970.876 mengungsi sekitar 485 sumur; Lombok 2018 dengan 406.202 mengungsi sekitar 203 sumur. **Disandingkan dengan angka tercatat:** PU 128 sumur di Sumatra (resmi), 83 sumur JIAT di Lombok (resmi). Sumber: `dibi/kejadian_besar.csv` [kode=sumatra2025 dan lombok2018, metrik=mengungsi, versi DIBI]; rasio butir 1. Label: estimasi-model (batas atas kasar: tidak semua pengungsi kehilangan sumber air, sumur warga dan SPAM yang selamat tidak dihitung). Kunci baru `rehab.akuifer.kebutuhan_sumur_model.sumatra2025`, `rehab.akuifer.kebutuhan_sumur_model.lombok2018`.

### Inferensi (analisis tim, bukan fakta bersumber)

- Rasio 2.000 jiwa per sumur adalah rasio program air bersih reguler (takaran tersirat 43–104 liter), bukan rasio darurat. Dipakai untuk lapis darurat 15 liter, rasio ini melebih-lebihkan kebutuhan sumur dua sampai tujuh kali; dipakai untuk huntap (60 liter SPM) rasio ini wajar. Kartu Bab 8 harus menyebut takaran yang dipakai ketika menghitung kebutuhan sumur.
- Lantai skenario air tanah (KERANGKA §1 prinsip 7) tidak boleh lebih ringan dari yang tercatat: untuk banjir besar, 128 sumur PU dalam satu kejadian adalah lantai minimal untuk satu pelaksana saja, dan hitungan model 485 sumur adalah pembanding atas. Keduanya ditulis berdampingan.
- Sumur dalam adalah pekerjaan minggu sampai bulan (survei geolistrik, pengeboran, konstruksi), bukan hari: 29% selesai dalam 10 minggu di Sumatra, di Lombok Utara Badan Geologi mengoperasikan 2 dari 7 titik dalam 4–5 hari, dan salah satunya (posko Tanjung) sumur gali yang direvitalisasi, bukan sumur bor baru. Dalam rantai tiga lapis, sumur dalam lebih tepat ditempatkan di lapis sementara, sedangkan lapis darurat bergantung pada sumur yang selamat, sumur dangkal, dan truk.
- Biaya satuan Rp472–572 juta adalah pembanding, bukan anggaran (P5, Q4); rentang 2019–2023 tanpa penyesuaian inflasi.

### Celah

- Data sumur Badan Geologi 2021–2025 (jumlah per tahun, Laporan Kinerja) tidak ditemukan; pencarian web sesi ini hanya menemukan rilis 2019 ke bawah. Disajikan sebagai seri berhenti di 2018 dan permintaan data (keputusan 14 hari butir 3).
- Keterlibatan Badan Geologi pada Sumatra 2025 tidak ditemukan dalam sumber resmi.
- Biaya per unit sumur PU, TNI AD, Polri, BNPB tidak diumumkan. Ditulis "tidak diumumkan".
- Tingkat kegagalan pengeboran (sumur kering, debit kecil, air asin) tidak tercatat sistematis. Laman ITERA tentang pemetaan titik sumur di Aceh Tamiang yang menurut cuplikan mesin pencari menyebut sumur gagal atau debit kecil tidak dapat dibuka (HTTP 403); tidak dikutip.
- Rincian jenis dan lokasi 3.000 sumber air TNI AD tidak ada. Tabel 7.1 menulis sel "tidak diumumkan".

---

## Pertanyaan kunci 3. Bagaimana mutu air diuji dan oleh siapa?

### Inti

Ada tiga patokan yang berbeda keketatan: Permenkes 2/2023 menuntut E. coli 0 CFU/100 ml dan arsen paling tinggi 0,01 mg/L untuk air minum; Sphere memakai ambang operasional darurat kurang dari 10 CFU/100 ml untuk air tanpa klorin; Perka BNPB 7/2008 hanya meminta air minum yang "kualitasnya cukup memadai" tanpa parameter. Tidak ditemukan protokol yang menyebut siapa menguji sumur bor darurat, parameter minimum, dan frekuensinya, dan tidak ditemukan satu pun data E. coli sumur darurat dari kejadian besar Indonesia.

### Temuan bersumber

1. Perka BNPB 7/2008: bantuan air bersih "diberikan dalam bentuk sumber air beserta peralatannya", 7 liter pada tiga hari pertama lalu 15 liter per orang per hari, sumber air paling jauh 500 meter dari tempat penampungan; air minum 2,5 liter per orang per hari, "kualitasnya cukup memadai untuk diminum tanpa menyebabkan resiko kesehatan". Sumber: `data/raw/hukum/teks/perka-nomor-7-tahun-2008.json` (dibaca sesi ini); pustaka `bnpb-2008-kebutuhan-dasar`; kunci yang sudah ada `perka_2008.air_bersih_3hari_liter`, `perka_2008.air_bersih_liter_hari`, `perka_2008.air_minum_liter_hari`, `perka_2008.jarak_sumber_air_m`. Label: resmi.
2. Permenkes 2/2023, parameter wajib air minum: E. coli dan total coliform 0 CFU/100 ml; TDS kurang dari 300 mg/L; kekeruhan kurang dari 3 NTU; besi 0,2; mangan 0,1; arsen 0,01; nitrat 20 mg/L. Dalam kondisi bencana pemerintah wajib melakukan penyehatan air dan menyediakan layanan alternatif. Sumber: riset C [25] (dibaca langsung, teks OCR); pustaka `kemenkes-2023-permenkes2`. Label: resmi. Kunci baru `rehab.akuifer.permenkes_ecoli_maks`, `rehab.akuifer.permenkes_arsen_maks`, `rehab.akuifer.permenkes_besi_maks`, `rehab.akuifer.permenkes_mangan_maks`, `rehab.akuifer.permenkes_tds_maks`.
3. Sphere 2018: minimum 15 liter per orang per hari; 250 orang per keran, 500 per pompa tangan, 400 per sumur gali terbuka; kurang dari 10 CFU/100 ml untuk air tanpa klorin; sisa klor 0,2–0,5 mg/l; kekeruhan kurang dari 5 NTU. Sumber: riset C [24] (dibaca langsung); pustaka `sphere-2018`. Label: terverifikasi. Kunci baru `rehab.akuifer.sphere_ecoli_tanpa_klorin_maks`, `rehab.akuifer.sphere_orang_per_pompa_tangan`.
4. **Berdampingan:** ambang E. coli nasional (0) lebih ketat daripada ambang darurat Sphere (kurang dari 10); kekeruhan nasional (kurang dari 3 NTU) lebih ketat daripada Sphere (kurang dari 5 NTU). Tidak ada peraturan BNPB yang memilih salah satunya untuk lapis darurat. Sumber: butir 1–3. Label: resmi dan terverifikasi.
5. Mutu geogenik air tanah Palu pascabencana: sampel menunjukkan kekeruhan 44,2 NTU, Fe 6,32 mg/L, Mn 1,47 mg/L, nitrat 66,2 mg/L (FTSL ITB, riset C [37], dari cuplikan; unduhan gagal); 25 sumber air Palu ber-TDS 170–4.733 mg/L dengan Fe dan Mn berasal dari akuifer (Atmaja dkk. 2025, riset C [36], dari cuplikan). Pustaka `itb-2021-wash-palu`, `atmaja-2025-palu-femn`. Label: terverifikasi (belum dibaca utuh; angka diperlakukan sebagai indikasi). Dibanding Permenkes: besi sekitar 31 kali, mangan sekitar 15 kali, nitrat sekitar 3 kali ambang (hitungan, estimasi-model).
6. Arsen: pengeboran dalam di dataran rendah Sumatra timur dan Jawa utara berpotensi mencemari arsen (BRIN, riset C [56], resmi, dari cuplikan; pustaka `brin-arsen`). **Sekunder:** 12 dari 97 sumur bor tabung di Sumatra Selatan melebihi 10 µg/L (Jakarta Post 2008 atas studi Winkel dkk., riset C [57]); makalah asli belum dibaca.
7. Pelajaran Sri Lanka pascatsunami: pembersihan sumur terlalu berfokus pada salinitas, kontaminasi patogen kurang diperhatikan. Sumber: Villholth dkk. 2011 (riset C [27]); pustaka `villholth-2011-srilanka`. Label: terverifikasi (analog luar negeri).

### Inferensi (analisis tim, bukan fakta bersumber)

- Standar BNPB mengatur kuantitas dan jarak air, bukan mutunya. Untuk sumur bor darurat, satu-satunya penjaga mutu yang berpasal adalah kewajiban penyehatan air dalam Permenkes 2/2023, yang dipegang dinas kesehatan, bukan pelaksana sumur. Protokol sumur RR (R-RR-10) perlu menautkan setiap sumur ke satu uji awal dan satu uji ulang oleh dinas kesehatan atau laboratorium daerah, dengan parameter minimum E. coli, kekeruhan, TDS/daya hantar listrik, besi, mangan, dan arsen di dataran rendah aluvial.
- Masalah mutu yang paling mungkin di sumur bor baru bukan bakteri tetapi geologi: besi, mangan, kekeruhan, dan arsen tidak hilang dengan klorinasi. Sumur yang lulus kuantitas tetapi gagal mutu akan berubah menjadi air mandi, dan warga kembali ke truk atau air kemasan. Paket sumur karenanya perlu menyertakan pengolahan sederhana (aerasi dan saringan) di akuifer yang dikenal berbesi.
- Pilihan ambang untuk lapis darurat adalah keputusan kebijakan, bukan teknis: Sphere (kurang dari 10 CFU) dengan klorinasi pada lapis darurat, Permenkes (0 CFU) sebagai syarat serah terima ke lapis sementara dan permanen. Usulan ini berlabel asumsi-kebijakan.

### Celah

- Data E. coli dan parameter kimia sumur darurat dari Aceh 2004, Lombok 2018, Palu 2018, Cianjur 2022, dan Sumatra 2025 tidak ditemukan. Ditulis apa adanya; kartu Bab 8 tidak memuat "persen sumur layak minum".
- Protokol uji mutu sumur darurat di BNPB, Kemenkes, atau Badan Geologi tidak ditemukan.
- Peta sebaran arsen, besi, dan mangan air tanah nasional tidak ditemukan.
- Teks Permenkes 2/2023 dibaca riset C lewat OCR; pasal tentang penyehatan air saat bencana belum dikutip nomornya. Penulis naskah wajib menyebut pasal setelah memeriksa salinan BPK.

---

## Pertanyaan kunci 4. Apa yang terjadi pada akuifer setelah tsunami dan likuefaksi?

### Inti

Tsunami menyalinisasi akuifer dangkal, tetapi di daerah bercurah hujan tinggi seperti Aceh Barat salinitas air tanah turun dari lebih dari 10 ke kurang dari 2 mS/cm dalam dua tahun, dan analog Sri Lanka menunjukkan pemulihnya hujan dan aliran air tanah, bukan pemompaan. Likuefaksi Palu 2018 tidak merusak akuifer secara terukur dalam sumber yang terbaca; arah sebabnya terbalik: muka air tanah dangkal yang dinaikkan irigasi Gumbasa ikut memicu aliran likuefaksi, sehingga sumber air RR di lembah Palu tidak boleh menaikkan muka air tanah di zona rawan.

### Temuan bersumber

1. Aceh Barat 2006–2008: dengan curah hujan tahunan lebih dari 3.000 mm, salinitas air tanah awal turun cepat dari lebih dari 10 menjadi kurang dari 2 mS/cm dalam dua tahun; fluktuasi musiman muka air tanah dan intrusi air asin memicu salinitas berulang yang cukup memengaruhi tanaman. 48 titik sampel, 10 transek, 40 km pantai. Sumber: Marohn dkk. 2012, NHESS 12: 2879–2891 (abstrak dibuka ulang 25 Oktober 2026); pustaka `marohn-2012-aceh`. Label: terverifikasi. Kunci baru `rehab.akuifer.aceh_barat_waktu_pulih_salinitas` (2 tahun), `rehab.akuifer.aceh_barat_salinitas_awal` (lebih dari 10 mS/cm), `rehab.akuifer.aceh_barat_salinitas_akhir` (kurang dari 2 mS/cm).
2. Sri Lanka timur: dampak salinitas terukur hingga 1,5 tahun; pemulih utama hujan dan aliran air tanah alami, bukan kampanye pemompaan. Sumber: Villholth dkk. 2011 (riset C [27]); pustaka `villholth-2011-srilanka`. Label: terverifikasi. Kunci baru `rehab.akuifer.srilanka_durasi_dampak_salinitas`.
3. Survei elektromagnetik helikopter BGR (Agustus–Oktober 2005) di Banda Aceh dan Aceh Besar memetakan air asin dalam sekitar kedalaman 30 m beberapa km ke darat dan air tawar potensial 5–10 km dari pantai. Sumber: riset C [28] (halaman HTTP 400; isi dari cuplikan); pustaka `bgr-2005-help-aceh`. Label: terverifikasi (belum dibaca langsung). **Sekunder:** lebih dari 30.000 sumur dangkal sekitar Banda Aceh tersalinisasi (blog Waterloo, riset C [29]); tidak masuk badan teks.
4. Sumur gali Meuraxa dan Kutaraja pada Oktober 2006 (hampir dua tahun pascatsunami) masih menunjukkan salinitas, TDS, dan logam tinggi. Sumber: Universitas Syiah Kuala (riset C [30], dari cuplikan); pustaka `usk-2007-banda-aceh`. Label: terverifikasi. **Bertentangan sebagian dengan butir 1:** pemulihan dua tahun di Aceh Barat tidak berlaku merata; sumur di pusat kota Banda Aceh masih bermasalah pada rentang waktu serupa.
5. Palu 2018: akuaduk irigasi berumur sekitar seabad menaikkan muka air tanah hampir ke permukaan (Bradley dkk. 2019, rilis NTU, riset C [31]); saluran Gumbasa melintas di puncak lokasi Petobo, Lolu, dan Jono Oge dan jebolnya saluran memicu aliran debris (riset C [32]); air tanah dangkal diduga tertekan sebelum gempa dan mata air muncul di semua area terdampak (LPPM ITB, riset C [34]). Pustaka `bradley-2019-palu`, `itb-palu-flowslide`. Label: terverifikasi (rilis dan cuplikan; makalah asli belum dibaca).
6. Ruas saluran Gumbasa di Petobo dialihkan ke lokasi lebih aman di Palu Selatan; potensi likuefaksi jalur baru masih perlu dievaluasi (riset C [35], repositori UGM, cuplikan). Peta risiko 1:50.000 Desember 2018 menempatkan area likuefaksi dengan buffer 100 m dalam zona merah (dokumen proyek Bank Dunia P169403, riset C [39], cuplikan). Pustaka `ugm-gumbasa`, `worldbank-p169403`. Label: terverifikasi.
7. Lantai tercatat yang relevan (dari bab lain, tidak dihitung ulang): Sulteng 2018 34.166 rumah RB gabungan gempa, tsunami, likuefaksi (`rehab.lantai.likuefaksi.sulteng2018.rumah_rb`, bab-04); DIBI tidak memisah porsi likuefaksi. Label: resmi.

### Inferensi (analisis tim, bukan fakta bersumber)

- Pascatsunami, sumur bor dalam bukan jawaban pertama untuk akuifer dangkal yang asin: mengebor di bawah lensa air asin pesisir berisiko menarik air asin naik, dan pemulih utama adalah hujan. Lapis darurat dan sementara di pesisir tsunami lebih aman bersandar pada air dari luar zona asin (5–10 km ke darat di Aceh) lewat truk atau pipa sementara, dengan pemantauan daya hantar listrik sumur warga bulanan sampai di bawah ambang. Ini pelajaran dari analog dan satu studi Indonesia; bukan bukti kuat.
- Durasi pulih dua tahun (Aceh Barat, hujan lebih dari 3.000 mm) tidak boleh dialihkan ke pesisir bercurah hujan rendah (selatan Jawa timur, Nusa Tenggara) tanpa catatan; di sana pemulihan dapat lebih lama. Kartu tsunami Bab 8 menulis "sekitar dua tahun pada curah hujan lebih dari 3.000 mm" sebagai lantai, bukan rerata.
- Untuk likuefaksi, risiko utama air tanah adalah risiko yang ditimbulkan pembangunan kembali: irigasi, kolam, atau sumur resapan yang menaikkan muka air tanah di zona merah. Protokol sumur RR perlu memuat larangan pembuangan air dan resapan di zona merah likuefaksi, bukan hanya larangan membangun huntap.

### Celah

- Hitungan resmi sumur tercemar dan waktu pulih di Banda Aceh dan Aceh Besar (BGS, BRR, pemerintah) tidak ditemukan.
- Kajian intrusi akibat tsunami Palu 2018 dan Selat Sunda 2018 tidak ditemukan.
- Kedalaman muka air tanah sebelum dan sesudah gempa di Petobo, Balaroa, Jono Oge, Sibalaya, dan dampaknya pada sumur warga tidak ditemukan.
- Aturan resmi yang membatasi sumur bor dan irigasi di zona merah likuefaksi tidak ditemukan. Ditulis sebagai kesenjangan, tidak diklaim ada.
- Studi kasus 7.1 dipilih Aceh Barat (terverifikasi, angka terbaca langsung); Palu ditulis sebagai kotak pelajaran berbukti lemah karena sumbernya cuplikan.

---

## Pertanyaan kunci 5. Bagaimana sumur darurat diserahkan dan dirawat sesudah status berakhir?

### Inti

Badan Geologi menyerahkan sumurnya sebagai hibah barang milik negara ke pemda, dan itu satu-satunya jalur serah terima yang terdokumentasi; jalur untuk sumur TNI AD, Polri, PU tanggap darurat, dan BNPB tidak ditemukan. Hibah RR tidak dapat membiayai operasi dan pemeliharaan, aset desa, pembelian lahan, maupun aset yang dulu dibangun dengan hibah RR, sehingga sumur darurat yang jatuh ke desa atau rusak lagi tidak punya sumber dana pemeliharaan dari jalur RR. Bukti dari Palu menunjukkan sumur bor cenderung menjadi sumber jangka menengah huntap karena sambungan perpipaan tertunda.

### Temuan bersumber

1. Perban BNPB 4/2024 Pasal 5: kegiatan rehabilitasi dan rekonstruksi tidak dapat membiayai (b) biaya perencanaan, pengawasan, operasional, dan pemeliharaan; (c) normalisasi sungai dan pekerjaan penanganan darurat; (d) pembelian lahan; (e) aset rusak milik pemerintah desa; (f) aset rusak dan/atau kegiatan lanjutan atas aset yang dibangun dengan hibah RR sebelumnya; (g) kegiatan yang sudah didanai sumber lain. Sumber: `data/raw/hukum/teks/perban-nomor-4-tahun-2024.json` (dibaca sesi ini); pustaka `bnpb-2024-hibah-rr`; kunci yang sudah ada `rehab.hukum.hibah_rr_larangan_pembiayaan_huruf` (bab-02). Label: resmi.
2. Hibah BMN Badan Geologi: 18 sumur bor air tanah dalam diserahkan ke pemda dengan nilai perolehan Rp8,5 miliar (13 Maret 2023); rincian per kabupaten di rilis berjumlah 17. Sumber: riset C [17]; pustaka `esdm-2023-hibah-bmn`. Label: resmi.
3. Serah terima Sulteng: 8 titik sumur bor diserahkan untuk warga 12 Februari 2019, sekitar 4,5 bulan setelah gempa 28 September 2018. Sumber: pustaka `esdm-2019-sumur-sulteng` (dibuka ulang). Label: resmi (selang waktu hitungan).
4. Huntap Tondo (1.102 unit di 65,3 ha): menurut Kepala Balai P2P Sulawesi II, pasokan "selama ini masih pakai sumur bor"; PUPR membangun IPA dari Sungai Lewara untuk menggantikannya. Artikel terbit 6 Januari 2022, lebih dari tiga tahun setelah bencana; teks menulis tanggal kunjungan "(6/7/22)", kemungkinan salah ketik. Sumber: Setneg 6 Januari 2022 (dibuka ulang); pustaka `setneg-2022-huntap-tondo`. Label: resmi. Kunci baru `rehab.akuifer.huntap_tondo_unit`. **Catatan:** riset C menulis IPA itu kapasitasnya "agak kurang"; teks yang dibuka sesi ini hanya mengukuhkan sumur bor dan rencana IPA.
5. Cianjur 2022: 4 dari 19 titik sumur bor Badan Geologi dicadangkan untuk lokasi relokasi. Sumber: riset C [21]. Label: resmi.
6. Pascagempa Lombok Utara, pengguna sumur naik 36,10% dan kebutuhan air PDAM turun 17,71% (abstrak lain menyebut 19,03). Sumber: repositori UGM (riset C [41], cuplikan); pustaka `ugm-lombok-air`. Label: terverifikasi (dua versi ditulis berdampingan).
7. PAMSIMAS sebagai model pengelolaan berbasis warga (BP-SPAMS dengan iuran), bukan program darurat: laporan penyelesaian Bank Dunia 2023 menyebut layanan berkelanjutan untuk sekitar 24,8 juta jiwa di lebih dari 35.553 desa dan sekitar 91% sistem berfungsi baik, tetapi evaluasi independen DFAT menilai data MIS terlalu optimistis. Kekuatan bukti **sedang**, posisi "Program dengan syarat (bukti sedang)". Sumber: `program-terbukti/kompendium_program.csv` [id=P13]. Label: terverifikasi. **Berdampingan:** riset D menulis sekitar 24,4 juta orang (D33); kompendium 24,8 juta. Tidak boleh ditulis "terbukti".
8. Pengendalian pengambilan air tanah Tokyo, Osaka, Bangkok berkekuatan bukti **kuat** (deret pra-pasca resmi): pengambilan di wilayah ku Tokyo turun dari 1.160.000 m³ per hari (1964) menjadi 128.000 (1975) dan laju penurunan tanah turun tiap tahun sejak 1972. Sumber: `program-terbukti/kompendium_program.csv` [id=P16]. Label: terverifikasi. Relevan untuk Kotak 7.1, bukan untuk serah terima.
9. Sumur bor tidak disebut dalam rumusan "sumber air beserta peralatannya" Perka 7/2008 sebagai aset yang harus diserahkan; Perka itu tidak mengatur akhir masa bantuan. Sumber: `perka-nomor-7-tahun-2008.json`. Label: resmi (ketiadaan ketentuan).
10. Tidak ditemukan ketentuan BNPB yang mewajibkan sumber air huntap ditetapkan sebelum lokasi huntap disahkan. Sumber: riset A §5 Celah. Label: resmi (ketiadaan ketentuan, dari pencarian korpus riset A).

### Inferensi (analisis tim, bukan fakta bersumber)

- Rantai sumur darurat putus di dua titik. Pertama, kepemilikan: sumur Badan Geologi punya jalur hibah BMN, sumur pelaksana lain tidak terlihat jalurnya, sehingga setelah status berakhir sumur bisa tidak tercatat sebagai aset siapa pun. Kedua, dana: hibah RR menutup pemeliharaan (Pasal 5 huruf b), aset desa (huruf e), dan aset hibah RR yang rusak lagi (huruf f). Sumur yang diserahkan ke desa karenanya bergantung pada APBDes dan iuran warga sejak hari pertama.
- Sumur darurat de facto menjadi sumber permanen ketika SPAM tertunda (Tondo lebih dari tiga tahun). Itu bukan kegagalan bila sumur dirancang dan diuji mutu sebagai sumur produksi; menjadi kegagalan bila sumur dibangun sebagai sumur darurat tanpa uji pompa, uji mutu, dan pengelola. Protokol R-RR-10 perlu memutuskan di muka apakah sumur akan dibongkar, dipertahankan sebagai cadangan, atau diserahkan sebagai sumur produksi.
- Model pengelola yang paling dekat tersedia adalah BP-SPAMS ala PAMSIMAS (bukti sedang, dengan syarat iuran dan pendampingan); evaluasi fungsi 12 bulan setelah serah terima (agenda bukti Bab 10.10) adalah cara mengujinya, bukan klaim bahwa ia berhasil untuk sumur darurat.

### Celah

- Jalur serah terima sumur TNI AD, Polri, PU tanggap darurat, dan BNPB/BPBD tidak ditemukan. Ditulis sebagai kesenjangan (Bab 9.2) dan permintaan data.
- Tidak ada data berapa sumur darurat masih berfungsi 12 bulan sesudah serah terima di kejadian mana pun. Disajikan sebagai agenda bukti, tanpa angka.
- Sumber air huntap Duyu, Pombewe saat ini, huntap Lombok, dan huntap Cianjur (Sirnagalih) tidak terkonfirmasi.
- Kajian keberlanjutan akuifer untuk huntap (debit aman, zona CAT, uji mutu jangka panjang) tidak ditemukan.

---

## Komponen

| Kode | Judul kerja | Isi dan sumber data | G / B5 | Catatan label |
|---|---|---|---|---|
| Gambar 7.1 | Kebergantungan air tanah dan CAT yang dinyatakan rusak | Varian tanpa poligon: batang mendatar per provinsi kejadian besar dan Indonesia, persen rumah tangga minum dari sumur bor/pompa dan sumur terlindung lawan leding (`air-jawa/mentah/bps/sumber_air_minum_prov_2023.txt`, kolom 1, 2, 4); panel kecil daftar CAT rusak dua versi (`badangeologi-2024-cat`; `air-jawa/cat_air_tanah_rusak.csv`) | G19 diganti G5/G9 batang (poligon zona tidak ada) | resmi; daftar CAT berpil "pernyataan, bukan penetapan" |
| Tabel 7.1 | Pelaksana sumur bor × jumlah × kedalaman × debit × jiwa × biaya satuan × sumber | Baris: Badan Geologi reguler (2.290 unit 2005–2018; 125 m; 1–2,4 l/detik; 2.000 jiwa; Rp472–572 juta estimasi-model); Badan Geologi tanggap bencana (Sulteng 8 titik, Cianjur 19, Pidie Jaya 6, sumur dangkal Rp142 juta estimasi-model); PU Sumatra 2025 (SDA 25 dalam, CK 17 dangkal dan 86 dalam; 37 selesai); PU Lombok 2018 (83 sumur JIAT, 1.314 l/detik); TNI AD (3.000 sumber air, jenis tidak disebut); Polri (lampiran saja, sekunder); MDF Aceh (hampir 8.000) | B5.7 | sel tanpa data ditulis "tidak diumumkan" |
| Tabel 7.2 | Standar mutu dan kuantitas air per lapis | Kolom: Perka 7/2008, Sphere 2018, Permenkes 2/2023, UU 17/2019; baris: liter per orang per hari, jarak, orang per titik, E. coli, kekeruhan, TDS, besi, mangan, arsen, nitrat; kolom usulan "dipakai pada lapis" berlabel asumsi-kebijakan | B5.7 | campuran; label per kolom |
| Gambar 7.2 | Kebutuhan sumur model lawan sumur tercatat | Batang berpasangan Sumatra 2025 dan Lombok 2018: model 2.000 jiwa per sumur (485; 203) lawan tercatat (PU 128; JIAT 83); `dibi/kejadian_besar.csv`, `pu-2026-spam-sumatera-feb`, `kemenpupr-2019-satgas-lombok` | G9 (berpasangan) | berpil estimasi-model pada batang model |
| Kotak 7.1 | Air tanah di kawasan penurunan muka tanah (argumen tandingan L63) | Pernyataan Badan Geologi 2020 (lempung muda penyebab utama, peran air tanah belum terbukti) berdampingan dengan Aditiya dan Ito 2023 (korelasi 0,86, 100–120 mm per tahun) dan Widodo dkk. 2024 (Pekalongan 10–19 cm); Tokyo P16 bukti kuat; posisi Q10 | B5.5 | resmi dan terverifikasi berdampingan |
| Studi kasus 7.1 | Pemulihan salinitas Aceh Barat 2006–2008 | Marohn dkk. 2012; pembanding Sri Lanka Villholth 2011; Meuraxa/Kutaraja 2006 sebagai tandingan | B5.30 | terverifikasi |
| Kotak 7.2 (usulan tambahan) | Palu: muka air tanah tinggi dan saluran Gumbasa | Riset C [31]–[35], [39] | B5.5 | terverifikasi, bukti lemah (cuplikan) |
| Gambar 7.3 (usulan tambahan) | Rantai sumur darurat: lokasi, uji mutu, serah terima, pengelola | Titik putus dari PK5 (Perban 4/2024 Pasal 5 huruf b, e, f; hibah BMN Badan Geologi) | B5.23, G21 | asumsi-kebijakan untuk rantai usulan |

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/rehab/bukti/bab-07.angka.json`. Kunci yang sudah ada dan dirujuk, tidak diulang: `airjawa.nasional.cat_jumlah`, `airjawa.nasional.sumur_pantau_air_tanah`, `airjawa.jakarta.ambil_akuifer_dalam_2009`, `esdm.air_tanah.ambang_persetujuan_m3_bulan`, `perka_2008.*`, `aditiya2023.semarang.korelasi_air_tanah`, `airjawa.turun_tanah.*`, `rehab.pipa.sumatra2025.sumur_bor_feb2026` (bab-01), `rehab.pelajaran.aceh.mdf_sumur` (bab-02), `rehab.hukum.hibah_rr_larangan_pembiayaan_huruf` (bab-02), `rehab.lantai.likuefaksi.sulteng2018.rumah_rb` (bab-04).

| Kunci | Nilai | Berkas / jalur atau pustaka | Label |
|---|---|---|---|
| rehab.akuifer.zona_konservasi_target_semua_cat | 2045 | `badangeologi-2025-capaian` | resmi |
| rehab.akuifer.zona_konservasi_target_prioritas | 2029 | `badangeologi-2025-capaian` | resmi |
| rehab.akuifer.kebutuhan_pokok_minimal_uu17 | 60 l/orang/hari | `ri-2019-uu17` Penjelasan Pasal 6 | resmi |
| rehab.akuifer.ambang_jumlah_besar_uu17 | 25 m³/bulan/KK | `ri-2019-uu17` | resmi |
| rehab.akuifer.volume_bulanan_sumur_bg_min / _maks | 2.592 / 6.221 m³ | olah dari `esdm-2019-sumur-750` | estimasi-model |
| rehab.akuifer.rt_air_tanah_minum_2023.{indonesia, aceh, sumut, sumbar, ntb, sulteng, jabar} | 32,33; 33,77; 33,00; 23,35; 42,33; 19,75; 33,68 % | `air-jawa/mentah/bps/sumber_air_minum_prov_2023.txt` kolom 2+4 | resmi (olah) |
| rehab.akuifer.sumur_bg_kedalaman_tipikal | 125 m | `esdm-2019-sumur-750` | resmi |
| rehab.akuifer.sumur_bg_debit_min / _maks | 1 / 2,4 l/detik | `esdm-2019-sumur-750` | resmi |
| rehab.akuifer.sumur_bg_jiwa_per_sumur | 2.000 | `esdm-2019-sumur-750` | resmi |
| rehab.akuifer.sumur_bg_kumulatif_2005_2018 | 2.290 unit | `esdm-2019-sumur-750` | resmi |
| rehab.akuifer.sumur_bg_jiwa_kumulatif_2005_2018 | 6,6 juta | `esdm-2019-sumur-750` | resmi |
| rehab.akuifer.sumur_pengungsi_2018 | 55 | `esdm-2019-sumur-750` | resmi |
| rehab.akuifer.sulteng_titik_serah_2019 | 8 | `esdm-2019-sumur-sulteng` | resmi |
| rehab.akuifer.sulteng_debit_rata_2019 | 1,9 l/detik | `esdm-2019-sumur-sulteng` | resmi |
| rehab.akuifer.cianjur_sumur_bor_bg_2022 | 19 | `esdm-2022-sumur-cianjur` | resmi |
| rehab.akuifer.biaya_sumur_dalam_per_unit_2020 | sekitar Rp572 juta | `esdm-2019-sumur-750` | estimasi-model |
| rehab.akuifer.biaya_sumur_dalam_tambahan_per_unit_2020 | Rp500 juta | `esdm-2019-sumur-1000` | estimasi-model |
| rehab.akuifer.nilai_perolehan_sumur_dalam_per_unit_2023 | sekitar Rp472 juta | `esdm-2023-hibah-bmn` | estimasi-model |
| rehab.akuifer.biaya_sumur_dangkal_darurat_per_unit | sekitar Rp142 juta | `esdm-2019-sumur-750` | estimasi-model |
| rehab.akuifer.biaya_sumur_dalam_per_jiwa | sekitar Rp286.000 | olah | estimasi-model |
| rehab.akuifer.takaran_tersirat_lpd_min / _maks | 43,2 / 103,7 l/orang/hari | olah | estimasi-model |
| rehab.akuifer.sumatra2025.pu_sumur_dalam_sda_feb2026 | 25 | `pu-2026-spam-sumatera-feb` | resmi |
| rehab.akuifer.sumatra2025.pu_sumur_dalam_ck_feb2026 | 86 | `pu-2026-spam-sumatera-feb` | resmi |
| rehab.akuifer.sumatra2025.pu_sumur_dangkal_ck_feb2026 | 17 | `pu-2026-spam-sumatera-feb` | resmi |
| rehab.akuifer.sumatra2025.pu_sumur_selesai_feb2026 | 37 | `pu-2026-spam-sumatera-feb` (11 + 9 + 17) | resmi (olah) |
| rehab.pipa.lombok.sumur_bor_darurat | 83 | `kemenpupr-2019-satgas-lombok` | resmi |
| rehab.pipa.lombok.sumur_bor_kapasitas | 1.314 l/detik | `kemenpupr-2019-satgas-lombok` | resmi |
| rehab.akuifer.tniad_sumber_air_2026_08 | 3.000 | `setneg-2026-jembatan-tni-polri` | resmi |
| rehab.akuifer.kebutuhan_sumur_model.sumatra2025 | sekitar 485 | `dibi/kejadian_besar.csv` [kode=sumatra2025, metrik=mengungsi, versi=DIBI] / 2.000 | estimasi-model |
| rehab.akuifer.kebutuhan_sumur_model.lombok2018 | sekitar 203 | `dibi/kejadian_besar.csv` [kode=lombok2018, metrik=mengungsi, versi=DIBI] / 2.000 | estimasi-model |
| rehab.akuifer.permenkes_ecoli_maks | 0 CFU/100 ml | `kemenkes-2023-permenkes2` | resmi |
| rehab.akuifer.permenkes_arsen_maks | 0,01 mg/L | idem | resmi |
| rehab.akuifer.permenkes_besi_maks | 0,2 mg/L | idem | resmi |
| rehab.akuifer.permenkes_mangan_maks | 0,1 mg/L | idem | resmi |
| rehab.akuifer.permenkes_tds_maks | 300 mg/L | idem | resmi |
| rehab.akuifer.sphere_ecoli_tanpa_klorin_maks | 10 CFU/100 ml | `sphere-2018` | terverifikasi |
| rehab.akuifer.sphere_orang_per_pompa_tangan | 500 | `sphere-2018` | terverifikasi |
| rehab.akuifer.aceh_barat_waktu_pulih_salinitas | 2 tahun | `marohn-2012-aceh` | terverifikasi |
| rehab.akuifer.aceh_barat_salinitas_awal / _akhir | lebih dari 10 / kurang dari 2 mS/cm | `marohn-2012-aceh` | terverifikasi |
| rehab.akuifer.srilanka_durasi_dampak_salinitas | 1,5 tahun | `villholth-2011-srilanka` | terverifikasi |
| rehab.akuifer.subsidence_pantura_jateng (rendah, tinggi) | 6 / 10 cm/tahun | `esdm-2020-penurunan-pantura` | resmi |
| rehab.akuifer.huntap_tondo_unit | 1.102 | `setneg-2022-huntap-tondo` | resmi |
| rehab.akuifer.hibah_bmn_sumur_2023 | 18 sumur, Rp8,5 miliar | `esdm-2023-hibah-bmn` | resmi |

Tidak didaftarkan (sekunder, lampiran rekonsiliasi saja): TNI AD 3.300 titik; Polri 569/249; Kodam IM 121; BNPB Langkahan 100; Kemenhut 4 dari 10; 30.000 sumur asin Banda Aceh; arsen 12 dari 97; ambang kota kritis 5 cm/tahun (JawaPos).

## Pustaka

Entri CSL-JSON di `naskah/rehab/bukti/bab-07.pustaka.json` (45 entri). Dibuka ulang sesi ini (akses 25 Oktober 2026): `esdm-2019-sumur-750`, `esdm-2019-sumur-sulteng`, `esdm-2020-penurunan-pantura`, `setneg-2026-jembatan-tni-polri`, `setneg-2022-huntap-tondo`, `pu-2026-spam-sumatera-feb`, `marohn-2012-aceh`, serta korpus lokal `bnpb-2008-kebutuhan-dasar` dan `bnpb-2024-hibah-rr`. Entri lain diambil dari riset C, D, E dan `pustaka.json` dengan catatan verifikasi aslinya; yang berasal dari cuplikan mesin pencari ditandai `verifikasi: cuplikan` dan tidak boleh menjadi satu-satunya penopang kalimat badan teks.
