# Berkas bukti BAB 6 PROFIL RISIKO MUSIM HUJAN

Kajian: Grand Design Ketahanan Air Pulau Jawa 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9). Penulis bab menulis hanya dari berkas ini
dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/air/bukti/bab-06.angka.json`: kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/air/bukti/bab-06.pustaka.json`: entri CSL-JSON (lihat bagian Pustaka).

Bahan yang dibaca: `KERANGKA.md` §2, §4 (Bab 6), §6, §7, §8; `KEPUTUSAN.md`; Buku Pegangan L56–L69 (bahasa lugas,
tanpa titik tengah); `PEDOMAN-DESAIN.md` §C9; `riset/A`–`E`; paket `data/dibi/` (README, `jawa_kab_hidromet.csv`,
`jawa_kab_hidromet_ringkas.csv`, `kejadian_besar.csv`, `rekonsiliasi.csv`), `data/skenario-hidromet/` (README,
`musim_hujan.csv`, `kartu_skenario.csv`, `kepekaan_peringatan_dini.csv`, `kalender_bulanan_pulau.csv`), `data/air-jawa/`
(README, `dibi_kab_tahun.csv`, `kab_jawa.csv`, `subsiden_kota.csv`), `data/turunan/` (`daftar_perhatian.csv`,
`daftar_perhatian_kepekaan.csv`), `data/lembaga/` (README §4.3, `celah.csv`, `peran.csv`, teks PP 37/2010 dan PP 30/2024
di `mentah/teks/`), `data/program-terbukti/` (`kompendium_program.csv`, `bukti_dampak.csv`), `data/angka.json`; cache
tanggal-kab DIBI `riset/mentah/dibi_hidromet.json` (ditarik 23 Okt 2026); `riset/mentah/oni_cpc.txt`; korpus
`data/raw/hukum/teks/` (Perban BNPB 2/2023, 2/2024, 5/2020); `public/banjir/data/validasi.json`; berkas bukti Bab 1–4
(supaya angka dan kunci tidak berbenturan). Sumber web dibuka 24 Oktober 2026 (disebut per butir).

Hitungan baru penyusun bukti direproduksi oleh skrip sekali pakai di scratchpad sesi (`bab06_hitung.py`): pemisahan
korban per jenis per musim dari `riset/mentah/dibi_hidromet.json` memakai pemetaan wilayah dan tanggal WIB yang sama
dengan `bangun/skenario-hidromet.py`; skrip itu meng-assert bahwa total meninggal dan hilang tiap musim sama persis
dengan `skenario-hidromet/musim_hujan.csv` (18 dari 18 musim cocok). Sebelum naskah final, pemilik paket
`skenario-hidromet` memindahkan hitungan ini ke paket (lihat Celah P2).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah, dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal bertinjauan, data terbuka akademik) |
| estimasi-model | Keluaran model yang belum diuji balik, termasuk simulasi dalam dokumen resmi K/L |
| asumsi-kebijakan | Pilihan penyusun (aturan, ambang, rumus proyeksi) |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**.

Semua angka DIBI 2026 berstatus sementara (data sampai tarik 23 Oktober 2026). DIBI berpatahan seri 2024 (`is_bencana`
dan kelengkapan) dan patahan kategori 2018 (Banjir Bandang, Banjir dan Tanah Longsor, Banjir Rob baru muncul; kosong 2019
dan 2024); Tanah Longsor 2024 tidak lengkap (`skenario-hidromet/README.md` bagian Metode DIBI).

---

## Kerangka bab (dari KERANGKA.md §4, BAB 6)

- **Judul:** BAB 6 PROFIL RISIKO MUSIM HUJAN (15 hlm).
- **Subbab:** 6.1 Korban per Bahaya di Jawa 2015–2026; 6.2 Tanah Longsor; 6.3 Banjir dan Banjir Bandang; 6.4 Kejadian
  Besar dan Pelajarannya; 6.5 Rob, Penurunan Muka Tanah, dan Risiko Kronis; 6.6 Keamanan Bendungan dan Tanggul saat
  Hujan Ekstrem; 6.7 Pengelolaan Air Saat Musim Hujan: Siapa Mengerjakan Apa; 6.8 Kartu Skenario Musim Hujan; 6.9
  Kepekaan Peringatan Dini.
- **Tujuan bab:** menunjukkan bahaya musim hujan yang paling mematikan, menetapkan lantai skenario dari korban
  tercatat, dan menyiapkan musim 2026/2027 setelah El Niño kuat.
- **Pertanyaan kunci:**
  1. Bahaya apa yang mencatat korban terbanyak di Jawa, dan kab/kota mana yang berulang?
  2. Seberapa berat musim hujan tercatat terburuk, dan apa yang diharapkan pada musim 2026/2027?
  3. Di mana penurunan muka tanah memperbesar genangan rob dan banjir sampai 2030?
  4. Bendungan dan tanggul mana yang punya RTD dan terhubung ke rencana kontingensi BPBD?
  5. Seberapa jauh peringatan dini dapat menurunkan korban, dan untuk bahaya apa angka itu tidak dihitung?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Meninggal hidromet Jawa 2015–2026: longsor 924 (53%), banjir 488, cuaca ekstrem 207, banjir dan longsor 71, karhutla 32, banjir bandang 11, gelombang dan abrasi 5 | **Dikonfirmasi** (jumlah 1.738). **Ditambah:** hilang per bahaya (longsor 106, banjir 74), pengungsi (banjir 87,1% dari semua pengungsi hidromet), rumah rusak (cuaca ekstrem 61,6%), dan konsentrasi kab (P1) |
| Lantai 270 (2008/09); 10 musim terakhir 237 (2025/26); "musim terberat" 2019/20 bergantung rekaman Kota Bekasi; model rasio 2020/21 (254–547) dan 2019/20 (205–447) berdampingan | **Dikonfirmasi, dengan dua koreksi penting.** (a) 193 dari 270 (71,5%) berasal dari satu baris DIBI (banjir Kab. Tangerang, 27 Maret 2009); tanggalnya sama dengan jebolnya tanggul Situ Gintung menurut Harsoyo (2010), jadi syarat KERANGKA K19 terpenuhi, tetapi DIBI sendiri mencatat jenis Banjir dan tidak menyebut Situ Gintung. (b) Uji kepekaan Bekasi sudah dijalankan paket: musim terberat tetap 2019/20 dengan atau tanpa rekaman itu, jadi pilihan analog tidak bergantung padanya; yang bergantung adalah angka pengungsinya (532.321 lawan 166.047). (c) Batas bawah kedua pita model (254, 205) jatuh di bawah lantai 270 |
| Musim setelah El Niño kuat: 2009/10 (153 + 16), 2015/16 (62 + 6), 2023/24 (84 + 6) | **Dikonfirmasi.** **Ditambah:** ketiganya di bawah lantai; longsor 115 dari 169, 43 dari 68, 39 dari 90. Jendela musim 1 Okt–30 Apr tidak menangkap 19,8% korban bahaya musim hujan; Mei–Sep 2016, setelah El Niño 2015/16, mencatat 217 meninggal dan hilang, terbesar di luar jendela sejak 2008 |
| Kejadian besar: DaLA Jabodetabek 2007 Rp5.184,43 M; Jakarta 2013 dan 2020; Demak 2024; Situ Gintung bila tanggal cocok; Bengawan Solo 2007 kualitatif | **Dikonfirmasi.** Baris DIBI 27 Maret 2009 dimuat (tanggal cocok dengan jebolnya Situ Gintung menurut Harsoyo 2010; DIBI mencatatnya sebagai Banjir). **Ditambah:** Cisarua, Bandung Barat, 24 Januari 2026, 94 meninggal (DIBI dan Buletin BNPB), terjadi saat status siaga darurat kab dan provinsi berlaku. Jabodetabek 2020 punya dua angka DIBI (51 dan 52 meninggal) menurut jendela dan jenis |
| Tambahan penurunan muka tanah 2026–2030 = laju terverifikasi × 4 tahun; Pekalongan 10–19 cm/th memberi 40–76 cm | **Dikoreksi:** angka 10–19 cm/th adalah kalimat latar abstrak Widodo dkk. (Bab 4 P4 butir 3). Baris utama memakai GNSS CPKL 10,7 cm/th → 42,8 cm; versi 40–76 cm ditulis berdampingan sebagai turunan kutipan latar. **Ditambah:** angka resmi Badan Geologi 2018 untuk Semarang dan Demak lewat RPSDA Jratunseluna 2024, dan luas rawan rob resmi K/L (simulasi) 22.897 ha |
| Peringatan dini per WS (PP 30/2024 Pasal 96) belum terhubung ke Perban 2/2024 (C17); RTD bendungan (PP 37/2010 Pasal 52–54) | **Dikonfirmasi pada teks, dengan koreksi.** PP 37/2010 Pasal 56 ayat (3) dan Penjelasannya menyerahkan penyelamatan masyarakat dalam RTD ke peraturan di bidang penanggulangan bencana; PP 30/2024 Pasal 94 ayat (5) menyebut menteri/pimpinan LPNK sebagai penanggung jawab pengendalian daya rusak air tanpa rincian. **Ditambah:** Perban BNPB 2/2023 (rencana kontingensi) tidak memberi panduan per jenis ancaman (bendungan, tanggul, longsor, dan kekeringan sama-sama tidak disebut); Perban 2/2024 Pasal 7 ayat (2) tidak menyebut kegagalan bendungan secara eksplisit, tetapi huruf b (banjir) dan huruf l (bahaya lain sesuai peraturan) dapat menampungnya. Satu contoh resmi RTD yang disosialisasikan dan disiapkan untuk BPBD (Bendungan Banyukuwung, Rembang); penetapan dan integrasi ke renkon belum terverifikasi |
| Kepekaan: Renas 1.c faktor 0,603; Renstra IKP sekitar 0,998; longsor tidak dihitung (POD 0,151) | **Dikonfirmasi untuk faktor; dibantah untuk pelaksanaan.** CSV paket mengenakan faktor pada semua korban termasuk longsor, padahal KERANGKA §2 butir 10 meminta longsor tidak dihitung. Dihitung ulang per jenis: lantai 270 menjadi 175,6 (bukan 162,9); musim 2025/26 237 menjadi 214,0 (bukan 143,0) |

- **Komponen (KERANGKA):** Tabel 6.1 korban per bahaya; Gambar 6.1 peta kecil berganda IRBI 2025 banjir, longsor,
  abrasi (G19); Gambar 6.2 jumlah tahun tercatat longsor per kab (G19); Tabel 6.2 daftar perhatian banjir dan longsor;
  Gambar 6.3 meninggal dan hilang per musim 2008/09–2025/26 (G1); Tabel 6.3 kejadian besar; Gambar 6.4 rantai risiko
  kronis (B5.23); Gambar 6.5 tambahan penurunan muka tanah 2026–2030 (G12); Tabel 6.4 siapa mengerjakan apa; Kartu 6.1,
  6.2, 6.3 (B5.11); Gambar 6.6 kepekaan peringatan dini (G14). Rincian dan usul perubahan di bagian Komponen.
- **Status data (KERANGKA):** ada (DIBI, IRBI, KRB, musim); sebagian (GNSS; status RTD per bendungan; Situ Gintung
  menunggu cek tanggal); celah (luas genangan rob; debit sungai Jawa; kedalaman genangan teruji). **Pembaruan:** tanggal
  Situ Gintung sudah dicek (cocok dengan Harsoyo 2010); luas rawan rob ada untuk satu WS sebagai simulasi resmi K/L;
  status RTD per bendungan tetap celah dengan satu contoh RTD yang disosialisasikan (penetapan belum terverifikasi).

Catatan lingkup: Bab 6 memuat kartu skenario, jadi aturan lantai (KERANGKA §2 butir 9) berlaku penuh. Setiap angka
model di bab ini (pita rasio, kepekaan, abrasi platform, luas rawan rob simulasi) disandingkan dengan angka tercatat.
Strategi dan program tidak dibahas di bab ini (prinsip 17); posisi bukti program yang disebut hanya dicatat supaya
penulis tidak menyebutnya "terbukti".

---

## P1. Bahaya apa yang mencatat korban terbanyak di Jawa, dan kab/kota mana yang berulang?

### Inti

Pada 2015–2026, tanah longsor mencatat 924 dari 1.738 korban meninggal bencana hidrometeorologi di Jawa (53,2%) dan
banjir 488 (28,1%); bersama banjir dan longsor (71) serta banjir bandang (11), bahaya air musim hujan mencatat 1.494
meninggal (86,0%). Ukuran lain menunjuk bahaya lain: banjir mencatat 87,1% pengungsi dan cuaca ekstrem 61,6% rumah rusak.
Korban longsor terkumpul: 10 kab mencatat 52,4% meninggal longsor, dan 18 kab mencatat korban longsor pada paling sedikit
5 dari 12 tahun, dipimpin Kab. Bogor (10 tahun), Kab. Sukabumi dan Wonosobo (9). Menurut aturan dua syarat (asumsi
kebijakan), 67 kab masuk daftar perhatian banjir dan 57 kab daftar perhatian longsor, 38 kab di keduanya.

### Temuan bersumber

1. **Korban per bahaya, Jawa, 2015–2026 (cakupan `bencana`):**

   | Bahaya | Kejadian | Meninggal | Hilang | Mengungsi | Rumah rusak | Rumah rusak berat |
   | --- | ---: | ---: | ---: | ---: | ---: | ---: |
   | Tanah longsor | 5.617,67 | 924 | 106 | 75.411 | 34.820 | 10.245 |
   | Banjir | 4.930,09 | 488 | 74 | 1.222.590 | 46.268 | 6.714 |
   | Cuaca ekstrem | 7.266,65 | 207 | 6 | 15.772 | 147.711 | 9.705 |
   | Banjir dan longsor | 170,18 | 71 | 9 | 76.317 | 8.971 | 2.920 |
   | Karhutla | 1.819,5 | 32 | 4 | 743 | 4 | 2 |
   | Banjir bandang | 47,33 | 11 | 1 | 6.089 | 1.367 | 397 |
   | Gelombang dan abrasi | 66 | 5 | 1 | 293 | 108 | 32 |
   | Banjir rob | 99,5 | 0 | 0 | 6.569 | 636 | 210 |
   | Kekeringan | 462,99 | 0 | 0 | 0 | 0 | 0 |
   | **Jumlah** | **20.479,91** | **1.738** | **201** | **1.403.784** | **239.885** | **30.225** |

   Sumber: `data/dibi/jawa_kab_hidromet.csv` (jumlah baris `cakupan = bencana`, `tahun` 2015–2026) [olah(resmi), dihitung
   penyusun bukti]; meninggal sama dengan `dibi/README.md` kalimat Jawa (longsor 924, banjir 488, jumlah 1.738). Kejadian
   README 20.479,98; selisih 0,07 pembulatan pecahan. Kunci lama: `dibi.jawa.longsor.meninggal_2015_2026`,
   `dibi.jawa.banjir.meninggal_2015_2026`, `dibi.jawa.hidromet.meninggal_2015_2026` (BAB 1). Label: resmi.
2. **Porsi:** longsor 53,2% meninggal (924/1.738); banjir 28,1%; longsor, banjir, banjir dan longsor, dan banjir bandang
   bersama 86,0% (1.494/1.738). Banjir 87,1% pengungsi (1.222.590/1.403.784). Cuaca ekstrem 61,6% rumah rusak
   (147.711/239.885). Sumber: butir 1 [olah(resmi)]. Label: resmi.
3. **Meninggal per kejadian:** longsor 0,164 (924/5.617,67), banjir 0,099, cuaca ekstrem 0,028. Sumber: butir 1
   [olah(resmi)]. Catatan: jumlah kejadian DIBI dipengaruhi intensitas pelaporan (KERANGKA §2 butir 7), jadi rasio ini
   hanya pembanding antarbahaya dalam satu sumber. Label: resmi.
4. **Longsor per provinsi (meninggal 2015–2026):** Jawa Barat 468 (50,6%), Jawa Tengah 294, Jawa Timur 126, DI Yogyakarta
   24, Banten 10, DKI Jakarta 2. Banjir (banjir, banjir bandang, banjir dan longsor; 570 meninggal): Jawa Barat 187, Jawa
   Tengah 164, Jawa Timur 113, DKI 50, Banten 50, DIY 6. Sumber: `dibi/jawa_kab_hidromet.csv` [olah(resmi)]. Label: resmi.
5. **Kab dengan korban longsor terbanyak (meninggal + hilang 2015–2026):** Bandung Barat 119 (115 + 4), Sukabumi 82, Sumedang
   59, Purworejo 59, Bogor 56, Banjarnegara 47, Cirebon 39, Ponorogo 33, Bandung 29, Pekalongan 28. Sepuluh kab teratas
   mencatat 484 dari 924 meninggal longsor (52,4%); 81 kab mencatat paling sedikit satu korban longsor. Sumber:
   `dibi/jawa_kab_hidromet.csv` [olah(resmi)]; meninggal per kab juga di `dibi/jawa_kab_hidromet_ringkas.csv` kolom
   `tanah_longsor__meninggal` (Bandung Barat 115, Sukabumi 76). Label: resmi.
6. **Kab berkorban longsor berulang:** 18 kab mencatat meninggal atau hilang akibat longsor pada paling sedikit 5 dari 12
   tahun 2015–2026: Bogor 10; Sukabumi, Wonosobo 9; Cianjur, Bandung, Bandung Barat, Kota Bogor 8; Tasikmalaya, Sumedang 7;
   Garut, Banjarnegara, Malang 6; Purwakarta, Purworejo, Magelang, Karanganyar, Brebes, Kota Semarang 5. Untuk banjir
   (tiga jenis banjir) hanya 9 kab: Bogor 8; Kota Jakarta Selatan 7; Kota Bekasi 6; Sukabumi, Cianjur, Bandung, Grobogan,
   Kota Semarang, Jember 5. Sumber: `dibi/jawa_kab_hidromet.csv` [olah(resmi)]. Label: resmi.
7. **Kab dengan korban banjir terbanyak (tiga jenis banjir, meninggal + hilang 2015–2026):** Purworejo 60, Garut 57,
   Pacitan 35, Lebak 23, Kota Bekasi 22, Kota Jakarta Selatan 21, Bogor 21, Magelang 20, Kota Jakarta Timur 17. Kota
   Bekasi juga mencatat 373.202 pengungsi banjir, didominasi rekaman 1 Januari 2020 (366.274; status tidak terbukti,
   `dibi/rekonsiliasi.csv`). Sumber: `dibi/jawa_kab_hidromet.csv` [olah(resmi)]. Label: resmi.
8. **Sepuluh rekaman tanggal-kab terbesar (meninggal + hilang, bahaya musim hujan, 2008–2026):** satuan = satu tanggal
   WIB di satu kab/kota, dijumlah lintas jenis bahaya musim hujan (banjir, banjir bandang, longsor, banjir dan longsor,
   cuaca ekstrem).

   | Peringkat | Tanggal (DIBI) | Kab/kota | Jenis DIBI | Meninggal | Hilang | Jumlah | Catatan |
   | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
   | 1 | 27 Mar 2009 | Kab. Tangerang | Banjir | 100 | 93 | 193 | tanggal sama dengan jebolnya Situ Gintung (Harsoyo 2010); DIBI mencatat Banjir (P2 butir 3) |
   | 2 | 12 Des 2014 | Banjarnegara | Tanah Longsor | 99 | 11 | 110 | musim 2014/2015; kab-tahun 2014: 100 meninggal, 11 hilang |
   | 3 | 18 Jun 2016 | Purworejo | Banjir; Tanah Longsor (dua baris) | 85 | 18 | 103 | di luar jendela musim 1 Okt–30 Apr |
   | 4 | 24 Jan 2026 | Bandung Barat | Tanah Longsor | 94 | 0 | 94 | Cisarua (P2 butir 6, P5) |
   | 5 | 20 Sep 2016 | Garut | Banjir | 34 | 19 | 53 | di luar jendela musim |
   | 6 | 23 Feb 2010 | Bandung | Tanah Longsor | 33 | 11 | 44 | |
   | 7 | 9 Jan 2021 | Sumedang | Tanah Longsor | 40 | 0 | 40 | |
   | 8 | 31 Des 2018 | Sukabumi | Tanah Longsor | 32 | 1 | 33 | |
   | 9 | 1 Apr 2017 | Ponorogo | Tanah Longsor | 7 | 21 | 28 | |
   | 9 | 16 Nov 2025 | Banjarnegara | Tanah Longsor | 17 | 11 | 28 | |

   Berikutnya: Pekalongan 21 Jan 2025 (26; dua baris), Pacitan 28 Nov 2017 (25), Cirebon 30 Mei 2025 (25; di luar
   jendela), Pacitan 27 Nov 2017 (25). **Pacitan:** tiga baris pada dua tanggal berurutan, Banjir 27/11 (25 + 0), Banjir
   28/11 (5 + 1), Tanah Longsor 28/11 (15 + 4), jadi 45 meninggal dan 5 hilang (kab-tahun 2017: 50); bila tanggal
   berurutan digabung, Pacitan berada di peringkat 5. **Berdampingan, satuan kab-tahun:** Kab. Tangerang 2009 (193),
   Banjarnegara 2014 (111), Purworejo 2016 (110), Bandung Barat 2026 (94), Garut 2016 (57), Bandung 2010 (54), Pacitan
   2017 (50), Sumedang 2021 (43), Kudus 2014 (41; lima baris banjir dan longsor 19–22 Jan 2014), Sukabumi 2018 (34).
   Sumber: `riset/mentah/dibi_hidromet.json` (baris tanggal-kab-jenis, `dt` dikonversi ke WIB, provinsi kode 31–36)
   [olah(resmi), dihitung ulang 24 Oktober 2026]. Nama lokasi dalam kolom Catatan hanya untuk baris yang dikaitkan dengan
   sumber lain (Situ Gintung: kecocokan tanggal dengan jurnal; Cisarua: Buletin BNPB, P2 butir 6). Label: resmi.
9. **Daftar perhatian (varian dasar paket, KERANGKA Bab 3.5):** banjir 67 kab (2 kab memenuhi 4 syarat: Kab. Bekasi dan
   Kota Pekalongan; 17 kab 3 syarat; 48 kab 2 syarat), longsor 57 kab (17 kab 3 syarat; 40 kab 2 syarat); 38 kab di
   kedua daftar. Per provinsi, banjir: Jawa Timur 23, Jawa Tengah 17, Jawa Barat 16, Banten 6, DKI 4, DIY 1; longsor: Jawa
   Tengah 22, Jawa Barat 17, Jawa Timur 14, DIY 2, Banten 2. Ambang IRBI kelas teratas (syarat a): banjir 16, longsor 13.
   Kab longsor 3 syarat: Sukabumi, Cianjur, Bandung, Cirebon, Subang, Bandung Barat, Purbalingga, Karanganyar, Jepara,
   Pekalongan, Kota Semarang, Pacitan, Ponorogo, Trenggalek, Malang, Jember, Nganjuk. Sumber:
   `data/turunan/daftar_perhatian.csv` (`kajian = air`) [olah(asumsi-kebijakan)]; kunci lama `perhatian.air.banjir.n`,
   `perhatian.air.longsor.n`. Label: asumsi-kebijakan (aturan); data di baliknya resmi.
10. **Kepekaan daftar (paket):** banjir 67 tetap 67 bila ambang (b) diturunkan ke 2 tahun dan menjadi 66 bila dinaikkan ke 4
    tahun; menjadi 78 bila (a) memakai dua kelas teratas. Longsor 57 menjadi 58, 56, dan 63. Sumber:
    `data/turunan/daftar_perhatian_kepekaan.csv`. Label: asumsi-kebijakan.
11. **IRBI kelas teratas lawan korban tercatat:** dari 9 kab dengan meninggal dan hilang banjir terbanyak 2015–2025,
    **tidak satu pun** bernilai IRBI 2025 banjir di kelas teratas (ambang 16; nilai mereka 10 sampai 15). Peringkat 10
    adalah seri tiga kab dengan 12 jiwa: Subang (IRBI 14), Kab. Bekasi (19) dan Brebes (16), dua yang terakhir di kelas
    teratas; jadi untuk 10 teratas hasilnya 0 atau 1 bergantung pemutus seri, dan angka yang tegas adalah 0 dari 9. Dari
    10 kab teratas longsor (peringkat 9 dan 10 seri 26 jiwa, peringkat 11 25 jiwa, jadi batasnya tegas), 6 di kelas teratas (Sukabumi, Cirebon, Ponorogo, Pekalongan, Bandung, Nganjuk), sedangkan Purworejo
    (IRBI 8), Bogor (11), Sumedang (10), dan Banjarnegara (10) tidak. Kesepuluhnya tetap masuk daftar perhatian lewat
    syarat (b) dan (c). Bandung Barat (Cisarua 2026) bernilai IRBI longsor 20, nilai tertinggi Jawa. Sumber:
    `data/turunan/daftar_perhatian.csv` kolom `irbi2025`, `ambang_irbi`, `meninggal_hilang_2015_2025`, `masuk`;
    `air-jawa/kab_jawa.csv` kolom `irbi2025_longsor` [olah(resmi)]. Label: resmi (nilai); asumsi-kebijakan (kelas).
12. **IRBI dan DIBI dibaca berdampingan:** Spearman IRBI 2025 lawan kejadian DIBI 2015–2025: banjir 0,187 (n = 118),
    longsor 0,199 (n = 96); IRBI longsor kosong di 23 kab, 15 di antaranya berkejadian longsor (Kota Jakarta Selatan 15,
    Jakarta Timur 13, Kota Yogyakarta 11). Sumber: Bab 3 berkas bukti P2; kunci `airjawa.jawa.spearman_irbi_dibi.*`,
    `airjawa.jawa.irbi2025.longsor_kosong_berkejadian`. Label: resmi (data); asumsi-kebijakan (analisis).
13. **Paparan resmi (KRB 2022–2026 Jawa):** terpapar banjir 63.189.232 jiwa, luas bahaya tinggi 1.526.491 ha; longsor
    13.054.323 jiwa, 3.244.158 ha; banjir bandang 8.104.449 jiwa; cuaca ekstrem 147.925.402 jiwa. Nilai aset terpapar
    (bukan kerugian, tidak dijumlah antarbahaya): banjir Rp406,46 T, longsor Rp351,72 T. Sumber:
    `skenario-hidromet/kartu_skenario.csv` baris `musim_hujan_terberat_tercatat, jawa`; kunci lama
    `hidromet.jawa.banjir.krb_terpapar`, `hidromet.jawa.longsor.krb_terpapar`, `hidromet.jawa.longsor.luas_bahaya_tinggi`,
    `hidromet.jawa.lanina.luas_bahaya_tinggi_banjir`. Label: resmi.
14. **Konsentrasi kematian longsor per kejadian, 2015–2026:** dari 926 meninggal longsor di cache tanggal-kab (924 di
    `dibi/jawa_kab_hidromet.csv`; porsi di bawah sama sampai satu desimal dengan kedua penyebut), satu rekaman
    tanggal-kab terbesar (Bandung Barat 24 Januari 2026, 94) = 10,2%; lima terbesar 230 = 24,8%; sepuluh terbesar 323 =
    34,9%. Lima terbesar: Bandung Barat 24 Jan 2026 (94), Sumedang 9 Jan 2021 (40), Purworejo 18 Jun 2016 (39, baris
    longsor saja), Sukabumi 31 Des 2018 (32), Pekalongan 21 Jan 2025 (25). Banjarnegara 12 Desember 2014 (99 meninggal)
    di luar periode ini. Sumber: `riset/mentah/dibi_hidromet.json` (jenis Tanah Longsor dan Gerakan Tanah, `tahun`
    2015–2026) [olah(resmi)]. Label: resmi.

### Inferensi

- **[Inferensi tim]** Ukuran keberhasilan musim hujan menurut tesis kajian (korban jiwa) menempatkan longsor sebagai
  bahaya utama, tetapi beban layanan BPBD selama musim hujan ditentukan banjir (pengungsi) dan cuaca ekstrem (rumah
  rusak). Bab 6 perlu menulis tiga ukuran itu berdampingan agar Bab 8 tidak menyusun strategi musim hujan hanya untuk
  satu ukuran.
- **[Inferensi tim]** Longsor di Jawa adalah bahaya dataran tinggi Jawa Barat dan Jawa Tengah bagian tengah: Jawa Barat
  sendiri mencatat setengah meninggal longsor, dan 17 dari 18 kab berkorban berulang ada di Jawa Barat (10) dan Jawa
  Tengah (7).
  Banjir yang mematikan berbeda dengan banjir yang mengungsikan: kab berkorban banjir terbanyak adalah Purworejo, Garut,
  Pacitan, Lebak (banjir bandang dan banjir lereng), sedangkan pengungsi terkumpul di Jabodetabek dan pesisir utara.
- **[Inferensi tim]** Hasil uji IRBI kelas teratas (banjir: 0 dari 9 teratas; peringkat 10 seri tiga kab, dua di
  antaranya kelas teratas) memperkuat aturan daftar perhatian dua syarat: tanpa syarat riwayat DIBI, sembilan kab yang
  paling banyak kehilangan warga akibat banjir tidak akan masuk daftar. Ini bukan kritik pada IRBI; IRBI mengukur risiko
  termodelkan (paparan dan kapasitas), DIBI mengukur kejadian (KERANGKA §2 butir 7).
- **[Inferensi tim]** Kematian longsor 2015–2026 tersebar: lima kejadian terbesar hanya sekitar 25% dan sepuluh
  terbesar sekitar 35% (butir 14); Banjarnegara Desember 2014 berada di luar periode. Daftar perhatian menangkap kab yang
  berulang mencatat korban, tetapi tidak dapat memperkirakan lereng mana yang runtuh berikutnya; satuan kerja untuk
  longsor tetap desa dan lereng, bukan kab.

### Celah

- Kerugian rupiah per kejadian banjir dan longsor tidak ada di DIBI yang diterbitkan; seri CKAN nilai kerusakan dan
  kerugian 2015–2024 belum ditarik (`dibi/README.md` bagian Keterbatasan). **Penyajian:** kolom kerugian Tabel 6.1
  "tidak tersedia di DIBI"; pembanding DaLA 2007 di P2.
- Luka-luka tidak dipakai (tidak stabil dan tidak ada di DIBI Superset; KERANGKA §7 butir 7).
- Daftar perhatian memakai varian dasar paket; Bab 3 berkas bukti mengusulkan ambang (b) kuartil atas, yang memberi
  banjir 27–35 kab dan longsor 31–38 kab. **Penyajian:** Tabel 6.2 memakai varian yang dikunci di subbab 3.5; bila belum
  dikunci saat naskah ditulis, Tabel 6.2 memakai varian dasar dengan catatan kaki varian.
- Syarat (e) status siaga atau tanggap darurat berulang tidak diisi karena SK per kab tidak dikumpulkan. **Permintaan:**
  BPBD provinsi dan Pusdatinkom.

---

## P2. Seberapa berat musim hujan tercatat terburuk, dan apa yang diharapkan pada musim 2026/2027?

### Inti

Musim hujan tercatat terburuk di Jawa dalam 18 musim 2008/2009–2025/2026 mencatat 270 meninggal dan hilang (2008/2009),
dan 193 di antaranya (71,5%) berasal dari satu baris DIBI: banjir Kab. Tangerang, 27 Maret 2009, tanggal yang sama
dengan jebolnya tanggul Situ Gintung menurut Harsoyo (2010). Dalam 10 musim terakhir, musim 2025/2026 terberat dengan
237 meninggal dan hilang, 75,5% akibat longsor, termasuk longsor Cisarua 24 Januari 2026 (94 meninggal). Lantai Kartu
6.1 adalah 270; pita model rasio (2020/2021: 254–547; 2019/2020: 205–447) tampil di sampingnya, dengan batas bawah yang
dinaikkan ke lantai. Untuk 2026/2027, BMKG memprakirakan awal musim hujan mundur (sebagian besar Jawa Desember), puncak
Januari–Februari, dan musim lebih pendek; di tingkat nasional sifat hujan normal di 510 ZOM, atas normal 147, dan bawah
normal 42. Tiga musim analog setelah El Niño kuat mencatat 169, 68, dan 90 meninggal dan hilang, semuanya di bawah
lantai; menurut penilaian tim (n = 3), analog tidak menunjukkan korban yang lebih besar. Mei–September 2016, setelah
El Niño 2015/2016, mencatat 217 meninggal dan hilang di luar jendela musim.

### Temuan bersumber

1. **Seri 18 musim (1 Okt–30 Apr), Jawa, meninggal + hilang, dipecah per jenis:**

   | Musim | ONI NDJ | La Niña | Meninggal | Hilang | Longsor | Banjir | Banjir dan longsor | Banjir bandang | Cuaca ekstrem |
   | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
   | 2008/09 | −0,79 | ya | 173 | 97 | 32 | 236 | 0 | 0 | 2 |
   | 2009/10 | 1,50 | | 153 | 16 | 115 | 43 | 0 | 0 | 11 |
   | 2010/11 | −1,48 | ya | 128 | 25 | 82 | 53 | 0 | 0 | 18 |
   | 2011/12 | −0,92 | ya | 106 | 8 | 39 | 42 | 0 | 0 | 33 |
   | 2012/13 | −0,03 | | 128 | 19 | 74 | 71 | 0 | 0 | 2 |
   | 2013/14 | −0,11 | | 205 | 11 | 111 | 92 | 0 | 0 | 13 |
   | 2014/15 | 0,80 | | 180 | 24 | 169 | 12 | 0 | 0 | 23 |
   | 2015/16 | 2,59 | | 62 | 6 | 43 | 10 | 0 | 0 | 15 |
   | 2016/17 | −0,37 | | 97 | 38 | 67 | 54 | 0 | 0 | 14 |
   | 2017/18 | −0,76 | ya | 175 | 21 | 117 | 61 | 0 | 0 | 18 |
   | 2018/19 | 1,05 | | 105 | 5 | 56 | 39 | 0 | 0 | 15 |
   | 2019/20 | 0,75 | | 124 | 3 | 21 | 66 | 24 | 0 | 16 |
   | 2020/21 | −1,06 | ya | 146 | 10 | 89 | 36 | 22 | 0 | 9 |
   | 2021/22 | −0,83 | ya | 62 | 3 | 23 | 21 | 5 | 1 | 15 |
   | 2022/23 | −0,70 | ya | 79 | 3 | 33 | 23 | 17 | 0 | 9 |
   | 2023/24 | 1,99 | | 84 | 6 | 39 | 30 | 0 | 2 | 19 |
   | 2024/25 | −0,43 | | 124 | 12 | 87 | 29 | 0 | 0 | 20 |
   | 2025/26 | −0,60 | | 216 | 21 | 179 | 27 | 1 | 4 | 26 |

   Sumber: kolom ONI sampai Hilang dari `skenario-hidromet/musim_hujan.csv` (wilayah `jawa`; label resmi); kolom per jenis
   [olah(resmi)] dari `riset/mentah/dibi_hidromet.json` dengan pemetaan paket (assert: jumlah meninggal dan hilang per
   musim sama dengan `musim_hujan.csv`). Jumlah 18 musim 2.675; longsor 1.376 (51,4%), banjir 945, cuaca ekstrem 278,
   banjir dan longsor 69, banjir bandang 7. Kategori banjir bandang dan banjir dan longsor baru ada sejak 2018 (patahan
   kategori); sebelum itu kejadian serupa tercatat sebagai banjir atau longsor. Label: resmi.
2. **Lantai:** meninggal + hilang terbesar dalam 18 musim = 270 (2008/2009: 173 + 97); terbesar dalam 10 musim terakhir =
   237 (2025/2026). Lantai per metrik lain: meninggal 216 (2025/2026); mengungsi 532.321 (2019/2020) atau 525.861
   (2013/2014) bila rekaman Kota Bekasi 1 Januari 2020 dikeluarkan; rumah rusak berat 6.905 (2009/2010). Sumber:
   `skenario-hidromet/kartu_skenario.csv` baris `musim_hujan_lantai, jawa`; `musim_hujan.csv`; kunci lama
   `hidromet.jawa.lantai.meninggal_hilang`, `hidromet.jawa.lantai.meninggal_hilang_10_musim`,
   `hidromet.jawa.musim_2025.meninggal`, `hidromet.jawa.musim_2013.mengungsi`,
   `hidromet.jawa.musim_2019.mengungsi_tanpa_bekasi`, `hidromet.jawa.musim_2009.rumah_rb`. Label: resmi.
3. **Komposisi lantai:** banjir 236 dari 270 meninggal dan hilang musim 2008/2009; satu baris DIBI Kab. Tangerang
   bertanggal 27 Maret 2009, jenis "Banjir", mencatat 100 meninggal dan 93 hilang (193, atau 71,5% lantai). Tanpa baris
   ini musim 2008/2009 tinggal 77, dan lantai 18 musim berpindah ke 2025/2026 (237). Sumber:
   `riset/mentah/dibi_hidromet.json` baris `[dt 2009-03-27, Banten, Tangerang, Banjir]` [olah(resmi)]. Label: resmi.
   **Tanggal pembanding:** Harsoyo (2010), artikel jurnal bertinjauan (*Jurnal Sains & Teknologi Modifikasi Cuaca*
   11(1): 9–17), menyebut "insiden jebolnya Situ Gintung pada 27 Maret 2009" (halaman artikel dan abstrak dibuka 24
   Oktober 2026; pustaka `harsoyo-2010-situgintung`). Label: terverifikasi (tanggal). Abstrak itu tidak menyebut lokasi
   administratif, jam, maupun korban. KERANGKA K19 mensyaratkan Situ Gintung dimuat bila tanggal di mentah DIBI cocok,
   dan syarat itu terpenuhi. **Batas klaim:** DIBI mencatat baris ini sebagai banjir di Kab. Tangerang, bukan sebagai
   kegagalan tanggul, dan tidak menyebut Situ Gintung; keterkaitan baris ini dengan Situ Gintung hanya kecocokan tanggal
   (sumber yang dibuka tidak menyebut kab), bukan keterangan DIBI. Badan teks menulis "baris DIBI Kab. Tangerang 27 Maret 2009 (tanggal sama dengan
   jebolnya Situ Gintung)". **Berdampingan:** angka korban Situ Gintung dalam ringkasan media berbeda-beda (laporan awal
   21 meninggal; Antara 73 hilang; sebuah jurnal 94 meninggal); semuanya sekunder, tidak diverifikasi, dan tidak masuk
   badan teks.
3a. **Pembanding musim lain dengan satu rekaman besar:** rekaman tanggal-kab di atas 90 jiwa dalam jendela musim terjadi
    di tiga musim: 2008/2009 (Kab. Tangerang, 193 dari 270; sisa musim 77), 2014/2015 (Banjarnegara 12 Desember 2014,
    110 dari 204, atau 53,9%; sisa musim 94), dan 2025/2026 (Bandung Barat, 94 dari 237, atau 39,7%; sisa musim 143).
    Di luar jendela ada satu: Purworejo 18 Juni 2016 (103). Musim 2014/2015 tetap di bawah lantai 270 dan di bawah 237
    walaupun satu rekaman menyumbang lebih dari separuh korbannya. Sumber: butir 1 dan P1 butir 8
    [olah(resmi)]; `musim_hujan.csv` (2014/2015: 180 meninggal, 24 hilang). Label: resmi.
4. **Komposisi musim 2025/2026:** longsor 179 dari 237 (75,5%). Baris terbesar: Bandung Barat 24 Januari 2026 (94
   meninggal), Banjarnegara 16 November 2025 (17 meninggal, 11 hilang), Cilacap 14 November 2025 (21 meninggal, 3 hilang).
   Sumber: `riset/mentah/dibi_hidromet.json` [olah(resmi)]. Label: resmi.
5. **"Musim terberat tercatat" menurut paket dan uji kepekaan Bekasi:** peringkat gabungan lima metrik memilih 2019/2020
   (124 meninggal, 3 hilang); paket menjalankan uji kepekaan dan musim terberat tetap 2019/2020 baik dengan maupun tanpa
   rekaman Kota Bekasi 366.274 mengungsi. Yang berubah hanya pengungsi musim itu: 532.321 dengan rekaman, 166.047 tanpa.
   Sumber: `kartu_skenario.csv` baris `uji_kepekaan_bekasi, jawa` (`musim_terberat_dengan_rekaman` = 2019,
   `musim_terberat_tanpa_rekaman` = 2019). Label: asumsi-kebijakan (aturan pemilihan); resmi (angka DIBI).
6. **Cisarua, Bandung Barat, 24 Januari 2026:** longsor di Desa Pasirlangu, Kecamatan Cisarua, terjadi Sabtu dini hari dan
   mengakibatkan 94 orang meninggal (data per 12 Februari 2026); panjang aliran longsor sekitar 2,56 km, lebar rata-rata
   sekitar 150 m, luas terdampak sekitar 21,55 ha; terbentuk bendungan alam di salah satu hulu sungai. Saat kejadian,
   Kabupaten Bandung Barat berstatus Siaga Darurat Bencana Banjir, Banjir Bandang, Cuaca Ekstrem, dan Tanah Longsor
   (Keputusan Bupati Nomor 100.3.3.2/Kep.359-BPBD/2025, berlaku 1 Oktober 2025–30 April 2026) dan Provinsi Jawa Barat
   berstatus Siaga Darurat Bencana Hidrometeorologi (Keputusan Gubernur Nomor 360/Kep.626-BPBD/2025, 15 September 2025–30
   April 2026). Sumber: BNPB, *Buletin Info Bencana* Januari 2026, hlm. 2 dan 13–15,
   https://www.bnpb.go.id/storage/app/media/Buletin%20Info%20Bencana/2026%20Buletin%20Info%20Bencana/Buletin%20Info%20Bencana%20Januari%202026.pdf
   (diakses 24 Oktober 2026); DIBI baris `[dt 2026-01-24, Bandung Barat, Tanah Longsor]` 94 meninggal. Label: resmi.
   **Catatan berdampingan:** sampul buletin menamai foto "Dampak Banjir Bandang di Desa Pasir Langu", sedangkan isi dan DIBI
   menulis tanah longsor; laporan hari pertama menyebut 7–8 meninggal dan 82–83 dalam pencarian (sekunder, Kemenko PMK
   dan media).
7. **Pita model rasio berdampingan dengan angka tercatat:**

   | Musim analog | Model korban (meninggal + hilang) | Tercatat meninggal | Tercatat meninggal + hilang | Lantai |
   | --- | --- | ---: | ---: | ---: |
   | 2020/2021 (La Niña) | 254–547 | 146 | 156 | 270 |
   | 2019/2020 (terberat menurut paket) | 205–447 | 124 | 127 | 270 |

   Metode: korban = Σ kejadian analog × rasio (meninggal + hilang)/kejadian per jenis 2010–2025; batas tinggi = persentil 90
   yang dibatasi nilai terbesar kedua sehingga tahun terburuk tercatat disisihkan; belum diuji balik. Per jenis, model
   memberi longsor 164–344 untuk 2020/2021 lawan 89 tercatat, dan banjir dan longsor 10,8–11,0 lawan 22 tercatat (model di
   bawah tercatat). Sumber: `kartu_skenario.csv` baris `musim_hujan_lanina, jawa` dan `musim_hujan_terberat_tercatat,
   jawa`; `skenario-hidromet/README.md` bagian Korban jiwa; kunci lama `hidromet.jawa.lanina.korban_jiwa`,
   `hidromet.jawa.terberat.korban_jiwa`. Label: estimasi-model (pita); resmi (tercatat). **Dibantah oleh** KERANGKA §2
   butir 9: batas bawah 254 dan 205 lebih ringan daripada lantai 270, jadi di kartu keduanya ditulis "dinaikkan ke lantai
   tercatat" (aturan Bab 3 P3 Inferensi: nilai kartu = maks(batas tinggi model, lantai); untuk La Niña Jawa 270–547).
8. **Musim analog setelah El Niño kuat (ONI NDJ ≥ 1,5):** 2009/2010 (ONI 1,50) 169 meninggal + hilang, 184.298 mengungsi,
   721 kejadian; 2015/2016 (2,59) 68, 40.930, 844; 2023/2024 (1,99) 90, 79.521, 743,5. Longsor 115 dari 169, 43 dari 68,
   39 dari 90. Ketiganya di bawah lantai 270 dan di bawah median 18 musim (141,5) kecuali 2009/2010. Sumber:
   `kartu_skenario.csv` baris `musim_hujan_pasca_elnino, jawa`; butir 1; kunci lama `hidromet.jawa.pasca_elnino.n_musim`.
   Label: resmi.
9. **Prakiraan BMKG (22 September 2026):** El Niño sangat kuat (indeks ENSO JAS +2,63); awal musim hujan mundur di 529 ZOM
   (61,08% luas daratan); di Jawa awal "sebagian" November dan "sebagian besar" Desember 2026; puncak "sebagian" Januari
   dan "sebagian besar" Februari 2027; musim lebih pendek di 482 ZOM. Sifat hujan musim 2026/2027 tingkat nasional:
   normal 510 ZOM, atas normal 147 ZOM, bawah normal 42 ZOM; siaran tidak merinci sifat hujan untuk Jawa, dan subtotal
   kategori ZOM di siaran tidak saling menjumlah, jadi dikutip per kategori. Sumber: siaran pers BMKG 22 September 2026
   (riset E §E9; pustaka `bmkg-2026-musim-hujan`; kunci `bmkg.musim_2026.*`, BAB 1). Label: resmi (sifat hujan: resmi,
   tingkat nasional; konteks, bukan angka Jawa). BMKG tidak menyebut korban; penilaian bahwa musim analog tidak
   menunjukkan korban lebih besar adalah inferensi tim (bagian Inferensi). Penekanan "awal dan puncak
   berdekatan" hanya ada di InfoPublik 2 Oktober 2026 yang mengutip pejabat BMKG (pustaka `infopublik-2026-awal-puncak`,
   verifikasi sekunder): dipakai sebagai pembanding, bukan badan teks; badan teks cukup menyandingkan awal Desember dan
   puncak Januari–Februari dari siaran 22 September. Rilis 2 Oktober 2026 dan tabel per ZOM tidak ditemukan (riset E §4);
   penelusuran web 24 Oktober 2026 tidak menemukan siaran pers BMKG yang lebih baru. ONI JAS 2026 = 2,16 (`oni.jas_2026`,
   BAB 1).
10. **Korban di luar jendela musim:** dari 3.277 meninggal dan hilang bahaya musim hujan (banjir, banjir bandang, longsor,
    banjir dan longsor, cuaca ekstrem) di Jawa 2008–2025, 650 (19,8%) tercatat Mei–September; longsor saja 376 dari 1.650.
    Per tahun, Mei–September 2016 mencatat 217 (175 meninggal, 42 hilang; terbesar 2008–2026); berikutnya 2025 (68), 2011
    (58), dan 2010 (52); tahun lain 7 sampai 39. ONI 2016 bergerak dari 2,50 (DJF) ke −0,51 (SON); ONI 2010 dari 1,47 (DJF)
    ke −1,54 (SON). Sumber: `skenario-hidromet/kalender_bulanan_pulau.csv` (pulau Jawa, bulan 5–9) dan `riset/mentah/dibi_hidromet.json`
    [olah(resmi)]; `riset/mentah/oni_cpc.txt`. Label: resmi.
11. **Kejadian besar berangka resmi (Tabel 6.3):**

    | Kejadian | Versi | Meninggal | Hilang | Mengungsi | Lain | Sumber dan label |
    | --- | --- | ---: | ---: | ---: | --- | --- |
    | Banjir Jabodetabek awal Februari 2007 | DaLA Bappenas | | | | kerusakan Rp1.765,89 M + kerugian Rp3.418,70 M = Rp5.184,43 M (Tabel III.1) | `bukti.dala_jabodetabek_2007.kerugian` (BAB 3); resmi |
    | Banjir Kab. Tangerang, 27 Mar 2009 (tanggal jebolnya Situ Gintung, Harsoyo 2010) | DIBI (jenis Banjir) | 100 | 93 | 902 | rumah rusak berat 327 | butir 3; resmi |
    | Banjir Jakarta, 15–31 Jan 2013 | DIBI (DKI, kategori Banjir, semua laporan) | 38 | 0 | 83.930 | 5 kab/kota | `dibi/kejadian_besar.csv` `jakarta2013`; resmi, jendela pilihan penyusun |
    | Banjir Jabodetabek, 31 Des 2019–8 Jan 2020 | DIBI kategori Banjir, 13 kab | 51 | 0 | 433.628 | rumah rusak 7.410 | `kejadian_besar.csv` `jabodetabek2020`; resmi |
    | idem | DIBI jenis musim hujan, 14 kab | 52 | 0 | 433.628 | rumah rusak 7.417 | `kartu_skenario.csv` `kasus_jabodetabek_2020`; resmi |
    | idem | DIBI + Lebak | 61 | 2 | 449.791 | | idem; resmi |
    | idem | Renstra BNPB 2025–2029 hlm. 11 | 61 | | 11.569 | rumah rusak 3.245 | idem; resmi |
    | Banjir Demak–Kudus, 5 Feb–31 Mar 2024 | DIBI (kategori Banjir, Demak dan Kudus) | 11 | 0 | 60.706 | menderita 257.387; rumah rusak 0 | `kejadian_besar.csv` `demak2024`; resmi, jendela pilihan penyusun |
    | Cisarua, Bandung Barat, 24 Jan 2026 | DIBI dan Buletin BNPB | 94 | 0 | 75 (DIBI) | luas sekitar 21,55 ha | butir 6; resmi |

    Pengungsi Jabodetabek 2020 berbeda jauh antarversi karena satu rekaman Kota Bekasi (366.274; status tidak terbukti).
    Pengungsi Demak 2024 di media 12.982 sampai sekitar 25.000 dan BNPB via media 13.022 (24 Maret 2024): sekunder,
    berdampingan dengan DIBI 60.706 yang menjumlah puncak tiap laporan. Bengawan Solo Desember 2007: korban tidak ditemukan
    (riset B §8.4); kualitatif saja. Label per baris.
12. **Kerugian materiil berlabel tetap (Kartu 6.1):** (a) nilai aset terpapar KRB banjir Rp406,46 T dan longsor Rp351,72 T
    (resmi; batas atas, bukan kerugian); (b) DaLA 2007 Rp5.184,43 M per kejadian (resmi); (c) kebutuhan stimulan rumah
    hanya untuk longsor dan banjir bandang: musim 2008/2009 rumah rusak berat 1.331, ringan 745 → Rp74,0–91,0 M; musim
    2025/2026 rusak berat 1.113, sedang 689, ringan 858 → Rp81,5–100,3 M (skema lama Rp50/25/10 juta, skema 2022 ke atas
    Rp60/30/15 juta). Sumber: (a) `kartu_skenario.csv`; (b) Bab 3; (c) `riset/mentah/dibi_hidromet.json` kolom rumah rusak
    jenis longsor dan banjir bandang [olah(resmi)] × `public/banjir/data/param_banjir.json` `param.stimulan_rumah_*`.
    Label: (a) dan (b) resmi; (c) asumsi-kebijakan (dasar besaran stimulan sekunder, Bab 3 P3).

### Inferensi

- **[Inferensi tim]** Kedua musim lantai Jawa memuat satu rekaman besar: baris banjir Kab. Tangerang 27 Maret 2009
  (tanggal sama dengan jebolnya Situ Gintung) dan longsor Cisarua 2026; masing-masing menyumbang lebih dari sepertiga
  korban musimnya. Tetapi satu rekaman besar tidak cukup: musim 2014/2015 juga memuat satu rekaman besar (Banjarnegara,
  110 jiwa, 54% musimnya) dan tetap di bawah lantai karena sisa musimnya hanya 94 (butir 3a). Musim terburuk Jawa
  ditentukan gabungan besarnya satu kejadian dan berat sisa musim (77, 94, dan 143 setelah rekaman terbesar dikeluarkan);
  skenario terburuk yang masuk akal untuk 2026/2027 adalah musim di atas median ditambah satu kejadian besar, dengan
  2025/2026 (143 + 94) sebagai contoh tercatat terdekat.
- **[Inferensi tim]** Tidak ada musim Jawa yang boleh disisihkan dari lantai: rekaman tanggal-kab di atas 90 jiwa
  terjadi tiga kali dalam 18 musim (2008/2009, 2014/2015, 2025/2026; empat kali bila Purworejo Juni 2016, 103 jiwa, di
  luar jendela dihitung), jauh di atas pita 1 (< 0,2% dalam lima tahun). Bila baris 27 Maret 2009 memang jebolnya Situ
  Gintung, kejadian itu bukan "bencana hujan" murni; tetapi terjadi di musim hujan dan dicatat DIBI sebagai banjir, jadi
  tetap dalam jenis dan wilayah yang sama.
- **[Inferensi tim]** Tiga musim analog setelah El Niño kuat tidak memberi bukti bahwa musim hujan setelah El Niño lebih
  mematikan di Jawa (n = 3; dua di bawah median). Yang perlu disiapkan untuk 2026/2027 adalah pemampatan waktu (awal
  Desember, puncak Januari–Februari, musim lebih pendek, menurut siaran BMKG 22 September) di atas tanah kering
  pascakemarau, dan kemungkinan kejadian mematikan di luar
  jendela musim pada 2027. Tahun 2016, ketika ENSO berbalik dari El Niño kuat ke arah La Niña, adalah satu-satunya tahun
  dengan korban luar jendela jauh di atas tahun lain (217 lawan paling banyak 68); itu satu tahun, jadi alasan untuk tidak
  menutup Rencana Aksi Musim Hujan pada 30 April 2027, bukan prakiraan.
- **[Inferensi tim]** Kartu 6.2 (operasional) boleh memakai analog setelah El Niño sebagai gambaran "musim tipikal yang
  diharapkan", tetapi tidak boleh tampil sebagai skenario terburuk: angka analognya di bawah lantai. Kartu 6.2 perlu
  baris "lantai 270 tetap berlaku" agar pembaca tidak menyimpulkan bahwa 2026/2027 lebih ringan.
- **[Inferensi tim]** Model rasio meleset ke dua arah: terlalu tinggi untuk longsor dan terlalu rendah untuk banjir dan
  longsor (2020/2021). Pita model cocok sebagai "musim berat tipikal", sesuai KERANGKA, dan tidak menangkap kejadian
  katastrofik; lantai Jawa justru ditetapkan kejadian katastrofik di atas sisa musim (butir 3a).

### Celah

- Pemecahan per jenis per musim (butir 1) dan porsi luar musim (butir 10) dihitung penyusun bukti, belum ada di paket.
  **Permintaan internal:** pemilik `skenario-hidromet` menambah kolom per jenis ke `musim_hujan.csv` dan baris luar musim,
  dengan self-check yang sama (assert total).
- Fasilitas rusak per musim tidak ada di cache tanggal-kab (`dibi_hidromet.json` hanya rumah). **Penyajian:** aspek
  layanan sipil Kartu 6.1 memakai fasilitas rusak DIBI 2015–2026 per jenis (pendidikan 1.800, fasyankes 141, jembatan 726
  untuk semua hidromet; `dibi/jawa_kab_hidromet.csv`) dengan catatan periode tahunan, bukan musim.
- Angka resmi tentang Situ Gintung di luar DIBI (laporan tanggap darurat Bakornas PB 2009, laporan BBWS
  Ciliwung-Cisadane) tidak ditemukan; penelusuran 24 Oktober 2026 dengan batas situs bnpb.go.id dan pu.go.id tidak
  memberi hasil. Satu-satunya sumber primer yang dibuka (Harsoyo 2010) hanya memastikan tanggal. Angka media
  bertentangan. **Penyajian:** DIBI saja, dengan catatan bahwa DIBI mencatat baris itu sebagai banjir di Kab. Tangerang
  dan bahwa kaitannya dengan Situ Gintung berdasar kecocokan tanggal. **Permintaan:** Kementerian PU (BBWS
  Ciliwung-Cisadane), Pusdatinkom BNPB (rincian baris DIBI 27 Maret 2009).
- Rilis BMKG per ZOM dan HTH per pos tidak ditemukan (KERANGKA §7 butir 35). **Penyajian:** prakiraan tingkat pulau.
- Prakiraan fase ENSO 2027 dari sumber resmi tidak dibuka (BMKG hanya menyebut El Niño bertahan sampai awal 2027).
  **Penyajian:** La Niña sebagai baris kepekaan fase ENSO 2027–2030 (7 dari 18 musim La Niña), bukan judul.

---

## P3. Di mana penurunan muka tanah memperbesar genangan rob dan banjir sampai 2030?

### Inti

Bila laju terverifikasi tetap (asumsi kebijakan), tambahan penurunan muka tanah 2026–2030 adalah sekitar 43 cm di titik
GNSS Kota Pekalongan (10,7 cm/th × 4 tahun), sampai 40–48 cm di Semarang utara-timur dan Demak (maksimum InSAR 10–12
cm/th), dan 0,16–25,2 cm di CAT Jakarta menurut angka resmi Badan Geologi 2015–2022; titik tertinggi Cekungan Bandung
(sekitar 22 cm/th) memberi sekitar 88 cm, tetapi itu nilai titik, bukan kab. Kota Pekalongan, Kab. Pekalongan, dan Demak
mencatat terdampak rob DIBI terbanyak 2015–2025 (103.540, 88.629, dan 84.875 jiwa); rob tidak mencatat korban jiwa.
Luas genangan rob teramati tidak ada; satu-satunya luas resmi adalah simulasi Kementerian PU untuk WS Jratunseluna,
22.897 ha. Pengendalian pengambilan air tanah dengan pasokan pengganti adalah tuas berlabel bukti kuat di kompendium
paket (evaluasi sebelum dan sesudah tanpa pembanding; Tokyo dari sumber yang dibuka, Bangkok lewat kutipan tidak
langsung), dan hasilnya butuh lebih dari satu dekade.

### Temuan bersumber

1. **Laju terverifikasi yang dipakai (dari Bab 4 P4, tidak diulang di sini):** GNSS CPKL Kota Pekalongan −107,0 mm/th
   (2010–2021); CROL Indramayu −15,9; CTGL Kota Tegal −12,5; CJKT Jakarta Utara −6,4; CSEM Kota Semarang −0,8 (Susilo dkk.
   2023, Tabel 2); Semarang utara-timur dan Demak maksimum 100–120 mm/th, Kendal 50 mm/th (Aditiya dan Ito 2023, SBAS
   InSAR 2015–2022); Kab. Bandung 22,3 dan Bandung Barat 22,0 cm/th, titik tertinggi (Virtriana dkk. 2026); CAT Jakarta
   0,04–6,30 cm/th 2015–2022 (Kementerian ESDM, siaran pers 10 November 2023). Kunci lama
   `airjawa.turun_tanah.pekalongan.gnss_cpkl`, `airjawa.turun_tanah.semarang_demak.aditiya2023`,
   `airjawa.turun_tanah.jakarta.esdm_2015_2022`, `airjawa.turun_tanah.kab_bandung.virtriana2026` (Bab 4 dan registri).
   Label: terverifikasi; Jakarta resmi.
2. **Angka resmi Badan Geologi lewat dokumen RPSDA:** RPSDA Jratunseluna 2024 Tabel 5.83 hlm. 262 mengutip Badan Geologi
   2018: penurunan muka tanah Kota Semarang 2–10 cm/th, Demak lebih dari 10 cm/th. Sumber: riset E §E6; pustaka
   `kemenpupr-2024-rpsda-jratunseluna`. Label: resmi (dokumen K/L mengutip instansi; sumber Badan Geologi 2018 sendiri
   tidak dibuka).
3. **Tambahan 2026–2030 = laju × 4 tahun (rumus KERANGKA; asumsi laju tetap):**

   | Lokasi | Laju | Tambahan 2026–2030 | Dasar laju | Label |
   | --- | --- | --- | --- | --- |
   | Kota Pekalongan, titik GNSS CPKL | 10,7 cm/th | 42,8 cm | GNSS 2010–2021 | asumsi-kebijakan (laju terverifikasi) |
   | Kota Pekalongan, kalimat latar Widodo dkk. | 10–19 cm/th | 40–76 cm | kutipan latar abstrak, bukan hasil studi | asumsi-kebijakan; versi KERANGKA, ditulis berdampingan |
   | Semarang utara-timur dan Demak, maksimum | 10–12 cm/th | 40–48 cm | SBAS InSAR 2015–2022 | asumsi-kebijakan (terverifikasi) |
   | Kota Semarang, Badan Geologi 2018 | 2–10 cm/th | 8–40 cm | lewat RPSDA Jratunseluna 2024 | asumsi-kebijakan (resmi) |
   | Demak, Badan Geologi 2018 | > 10 cm/th | > 40 cm | idem | asumsi-kebijakan (resmi) |
   | CAT Jakarta | 0,04–6,30 cm/th | 0,16–25,2 cm | Kementerian ESDM 2015–2022 | asumsi-kebijakan (resmi) |
   | Kab. Bandung dan Bandung Barat, titik tertinggi | 22,0–22,3 cm/th | 88,0–89,2 cm | InSAR Sentinel-1 | asumsi-kebijakan (terverifikasi); nilai titik |
   | Indramayu, titik GNSS CROL | 1,59 cm/th | 6,4 cm | GNSS | asumsi-kebijakan |
   | Kota Tegal, titik GNSS CTGL | 1,25 cm/th | 5,0 cm | GNSS | asumsi-kebijakan |

   Sumber: butir 1 dan 2 [olah]. Faktor 4 tahun mengikuti KERANGKA (akhir 2026 ke akhir 2030); bila dihitung lima tahun
   kalender 2026–2030, angka naik 25%.
4. **Penurunan muka tanah lawan kenaikan muka laut (ditulis berdampingan):** abstrak Susilo dkk. (2023) menyatakan
   Jakarta, Pekalongan, Semarang, dan Demak turun paling sedikit sekitar 9 kali lebih cepat daripada laju kenaikan muka
   laut global saat ini; abstrak tidak menyebut angka laju muka laut yang dipakai. **Catatan:** Tabel 2 studi yang sama
   tidak mendukung klaim itu untuk dua kota. Stasiun CJKT (Jakarta Utara) 6,4 mm/th dan CSEM (Kota Semarang) 0,8 mm/th
   hanya memenuhi rasio 9 kali bila muka laut global naik tidak lebih dari 0,71 dan 0,09 mm/th. Batas bawah resmi
   Kementerian ESDM untuk CAT Jakarta (0,4 mm/th, 2015–2022) juga tidak memenuhinya, dan Demak tidak punya stasiun di
   Tabel 2. Yang didukung angka terbuka hanya Pekalongan (CPKL 107 mm/th) dan maksimum InSAR Semarang utara-timur dan
   Demak (100–120 mm/th). **Penyajian:** badan teks membatasi perbandingan ini ke Pekalongan dan maksimum Semarang–Demak,
   atau menulis klaim abstrak bersama catatan ini. Sumber: Susilo dkk. (2023), abstrak (CC BY; dibuka ulang lewat Europe
   PMC 24 Oktober 2026) dan Tabel 2; butir 1 [olah]. Label: terverifikasi (klaim abstrak, terbatas pada Pekalongan dan
   maksimum Semarang–Demak).
5. **Kaitan dengan air tanah:** korelasi 0,86 antara muka air tanah dan deformasi di Semarang. Sumber: Aditiya dan Ito
   (2023) lewat `riset/B-air-jawa.md` §6.1. Label: terverifikasi.
6. **Rob tercatat DIBI 2015–2025:** 35 kab/kota mencatat kejadian rob (`is_bencana`); 0 meninggal dan hilang. Kab dengan
   tahun berkejadian terbanyak: Pemalang 4; Kab. Bekasi, Cilacap, Batang, Kota Pekalongan, Kota Tegal, Situbondo 3.
   Terdampak (menderita + mengungsi) terbanyak: Kota Pekalongan 103.540, Kab. Pekalongan 88.629, Demak 84.875, Indramayu
   40.162, Kota Semarang 29.648, Cirebon 20.565. Gelombang dan abrasi: 31 kab, 6 meninggal dan hilang. Sumber:
   `air-jawa/dibi_kab_tahun.csv` kelompok `rob` dan `gelombang_abrasi` [olah(resmi)]; Kota Pekalongan rob menderita 2015–2026
   101.971 di `dibi/jawa_kab_hidromet_ringkas.csv`. Catatan: kategori Banjir Rob DIBI baru ada sejak 2018 dan kosong pada
   2019 dan 2024. Label: resmi.
7. **Luas rawan rob resmi (simulasi):** RPSDA Jratunseluna 2024 hlm. 27–28 menulis genangan rob 22.897 ha; Tabel 5.86
   hlm. 265 merinci luas rawan rob per kecamatan dari simulasi pasang 1,8 m ("Hasil Analisis, 2023"). Sumber: riset E
   §E6; pustaka `kemenpupr-2024-rpsda-jratunseluna`. Label: estimasi-model (dokumen resmi Kementerian PU; simulasi, bukan
   genangan teramati).
8. **Model rob platform tidak layak:** 0 dari 44 titik mencapai p95 saat BMKG menerbitkan 19–20 peringatan rob per hari;
   platform tidak punya luas genangan rob maupun jiwa terpapar rob. Yang boleh dibawa: baris peringatan rob BMKG aktif.
   Sumber: `riset/D-inventaris-platform.md` §1.4. Label: estimasi-model; vonis audit tidak layak.
9. **Paparan pesisir resmi (KRB 2022–2026 Jawa):** terpapar gelombang ekstrem dan abrasi 728.643 jiwa; luas bahaya tinggi
   40.298 ha; nilai aset terpapar Rp5,65 T. IRBI 2025 abrasi dinilai di 61 kab (58 kab tidak dinilai); Demak bernilai 4,
   Kota Semarang dan Kota Pekalongan 16. Sumber: `kartu_skenario.csv` baris `gelombang_abrasi_rob, jawa`;
   `air-jawa/kab_jawa.csv` kolom `irbi2025_abrasi` [olah(resmi)]; kunci lama `hidromet.jawa.gelombang_abrasi.krb_terpapar`.
   Label: resmi.
10. **Garis pantai mundur (platform, estimasi):** laju median Sayung (Demak) −16,9 m/th (12 transek abrasi nyata dari 23),
    Muara Gembong (Bekasi) −3,3, Subang −2,4, Pekalongan −2,0, Indramayu +0,1; Landsat 1988–2025, belum dikoreksi pasang
    surut, tanpa uji lapangan. Sumber: `kartu_skenario.csv` baris `laju_garis_pantai_*`; `public/pesisir/data/abrasi.json`.
    Label: estimasi-model. **Berdampingan dengan** IRBI abrasi Demak 4 (butir 9): dua ukuran yang tidak saling
    memvalidasi.
11. **Tuas: pengendalian pengambilan air tanah (P16; kekuatan "kuat" menurut rubrik paket, posisi "Program (bukti
    kuat)"):** jenis evaluasinya `data-resmi-pra-pasca`, yaitu deret sebelum dan sesudah tanpa pembanding; "kuat" berarti
    kuat di dalam kompendium paket (dua program berlabel kuat: P16 dan P19), bukan hasil evaluasi kausal. Tokyo,
    pengambilan air tanah wilayah ku turun dari 1.160.000 m³/hari (1964) ke 128.000 (1975), laju penurunan maksimum 27
    cm/th dan turun tiap tahun sejak 1972 (Yamamoto 1984, dibuka langsung). Bangkok timur 120 mm/th (1981) menjadi sekitar
    20 mm/th (2007–2010) setelah pembatasan pompa: angka dari abstrak konferensi Tanaka dan Mio (2013) yang mengutip
    Phien-wej dkk. (2006); sumber asli tidak dibuka, jadi kutipan tidak langsung.
    Syarat: pasokan air pengganti sebelum larangan, zona kritis berbasis pengukuran, tarif air tanah lebih mahal dari air
    perpipaan, penegakan izin; hasil butuh lebih dari satu dekade. Padanan di Indonesia: zona bebas air tanah DKI dan
    pengendalian izin air tanah, status "Sudah ada, perlu dikembangkan". Sumber: `program-terbukti/kompendium_program.csv`
    baris P16 (`jenis_eval`, `kekuatan`); `bukti_dampak.csv` B095–B101. Label: terverifikasi (Tokyo); terverifikasi,
    kutipan tidak langsung (Bangkok). Penulis menulis "berlabel bukti kuat di kompendium paket", bukan "satu-satunya
    tuas berbukti kuat".
12. **Tanggul tanpa penghentian pengambilan air tanah:** sistem polder dan pompa kota pesisir (P15) berkekuatan bukti
    "belum terbukti"; tanggul Pekalongan 2019 dilaporkan tenggelam pada 2022 (sekunder; laporan Bappenas 2019 tidak
    ditemukan, riset E §E19). Sumber: `kompendium_program.csv` baris P15. Label: resmi (rubrik paket); kejadian tanggul
    sekunder. Penulis tidak menyebut P15 "terbukti".
13. **Dasar hukum dan pelaku:** tanah ambles termasuk daya rusak air (UU 17/2019 Penjelasan Pasal 35 ayat (3) huruf i);
    penurunan muka tanah diatur dua rezim (PP 43/2008 dan PP 30/2024) tanpa pemegang tunggal (C06); BOP Pantura Jawa
    (Perpres 77/2025) menyebut "ancaman banjir laut yang semakin besar", dan Kementerian ESDM serta BNPB tidak duduk di
    Dewan Pengarahnya. Sumber: `lembaga/celah.csv` C06; `lembaga/peran.csv` R066. Label: resmi.

### Inferensi

- **[Inferensi tim]** Pesisir utara Jawa Tengah dari Pekalongan sampai Demak adalah satu-satunya ruas dengan tiga garis
  bukti yang bertemu: laju penurunan terverifikasi tertinggi, terdampak rob DIBI terbanyak, dan luas rawan rob resmi
  (simulasi) di WS Jratunseluna. Di ruas ini, tambahan sekitar 40 cm sampai 2030 setara dengan menaikkan pasang acuan
  rencana kontingensi rob, sehingga renkon yang disusun dengan genangan hari ini akan kurang besar pada 2030.
- **[Inferensi tim]** Jakarta kini turun lebih lambat (angka resmi 2015–2022) daripada Pekalongan dan Demak; urutan
  prioritas risiko kronis berbeda dengan urutan perhatian publik dan anggaran tanggul. Bab 6 tidak dapat menyatakan sebab
  perlambatan Jakarta (Bab 4 P4 Inferensi).
- **[Inferensi tim]** Rob tidak mencatat korban jiwa, jadi tidak muncul di ukuran keberhasilan musim hujan (korban jiwa);
  kerugiannya kronis: rumah terendam berulang dan pengungsian berulang. Kartu 6.3 perlu ukuran terdampak dan rumah, bukan
  korban.
- **[Inferensi tim]** Penurunan muka tanah di Cekungan Bandung (sekitar 22 cm/th di titik tertinggi) memperbesar genangan
  banjir sungai, bukan rob; kab Bandung masuk daftar perhatian banjir dan longsor (3 syarat). Bab 6 menyebutnya agar
  "risiko kronis" tidak dibaca sebagai masalah pesisir saja.

### Celah

- Luas genangan rob teramati dan kedalaman genangan teruji tidak ada untuk Jawa (KERANGKA §7 butir 23). **Penyajian:**
  Kartu 6.3 menulis luas genangan rob "tidak dikuantifikasi", dengan baris terpisah luas rawan rob simulasi Kementerian PU
  (Jratunseluna) berlabel estimasi-model. **Permintaan:** Kementerian PU (BBWS Pemali-Juana, Ciliwung-Cisadane), BIG
  (pasang surut), BMKG (titik peringatan rob).
- Laju per kab (bukan per titik atau kota) tidak ada; deret GNSS Zenodo belum diolah; pengukuran sendiri (LiCSBAS) butuh
  keputusan pemilik (Bab 4 P4 Celah). **Penyajian:** Gambar 6.5 per titik atau kota berlabel, "kota tanpa titik = belum
  diukur".
- Pola dan RPSDA Pemali-Comal (Pekalongan, Pemalang, Tegal, Brebes) tidak ditemukan (riset E §E6), padahal ruas itu
  mencatat rob DIBI berulang. **Permintaan:** Kementerian PU (BBWS Pemali-Juana).
- Proyeksi linear mengabaikan percepatan atau perlambatan; tidak ada data untuk memilih. **Penyajian:** label asumsi
  kebijakan dan rumus tertulis di bawah Gambar 6.5.

---

## P4. Bendungan dan tanggul mana yang punya RTD dan terhubung ke rencana kontingensi BPBD?

### Inti

Daftar bendungan di Jawa yang RTD-nya sudah ditetapkan tidak ditemukan terbuka. Satu contoh resmi adalah Bendungan
Banyukuwung (BBWS Pemali-Juana): RTD-nya disosialisasikan pada 10 September 2024 untuk 32 desa di 4 kecamatan
Kabupaten Rembang dan disiapkan untuk dilaksanakan BPBD Rembang; penetapannya oleh Pemilik (Pasal 54) dan masuknya ke
rencana kontingensi BPBD belum terverifikasi. PP 37/2010 mewajibkan RTD per bendungan, disusun Pembangun dengan instansi
teknis (contohnya perangkat daerah penanggulangan bencana), dikonsultasikan ke bupati dan gubernur, dan disosialisasikan
ke pemda; tindakan penyelamatan masyarakat dalam RTD diserahkan ke peraturan di bidang penanggulangan bencana (Pasal 56
ayat (3) dan Penjelasannya). Sisi BNPB belum menurunkannya: Perban BNPB 2/2023 tentang rencana kontingensi tidak memberi
panduan per jenis ancaman (hanya contoh tsunami, gempa, dan banjir; longsor dan kegagalan bendungan sama-sama tidak
disebut), dan Perban 2/2024 tidak menyebut kegagalan bendungan secara eksplisit. Baris DIBI yang menetapkan lantai Jawa
(banjir Kab. Tangerang, 27 Maret 2009, 193 meninggal dan hilang) bertanggal sama dengan jebolnya tanggul Situ Gintung
(Harsoyo 2010).

### Temuan bersumber

1. **Kewajiban RTD (PP 37/2010):** RTD dipakai bila ada gejala atau terjadi kegagalan bendungan (Pasal 51 ayat (1));
   disusun Pembangun bendungan dengan mengikutsertakan instansi teknis dan unsur masyarakat terpengaruh, memuat pengamanan
   bendungan dan penyelamatan masyarakat serta lingkungan, dilengkapi analisis keruntuhan (Pasal 52); dikonsultasikan ke
   bupati/wali kota dan gubernur yang wilayahnya terpengaruh (Pasal 53); ditetapkan Pemilik untuk setiap bendungan
   (Pasal 54); satu DAS dengan lebih dari satu bendungan memerlukan satu kesatuan RTD (Pasal 55); disosialisasikan ke
   masyarakat terpengaruh dan pemerintah provinsi dan kab/kota (Pasal 57); ditinjau kembali bila kondisi hilir berubah
   (Pasal 58); tata cara diatur peraturan Menteri (Pasal 59). Penjelasan Pasal 52 ayat (1): instansi teknis "misalnya
   satuan kerja perangkat daerah yang menyelenggarakan urusan pemerintahan di bidang penanggulangan bencana".
   **Pasal 56 (pembagian tindakan dalam RTD):** tindakan pengamanan bendungan (Pasal 52 ayat (2) huruf a) dilakukan
   dengan memberitahukan pihak terkait, mengoperasikan peralatan hidro-elektro mekanikal, dan mencegah keruntuhan
   bendungan (ayat (1)), oleh Pengelola bendungan (ayat (2)); "Tindakan penyelamatan masyarakat sebagaimana dimaksud
   dalam Pasal 52 ayat (2) huruf b dilakukan sesuai dengan ketentuan peraturan perundang-undangan" (ayat (3)). Penjelasan
   ayat (3): yang dimaksud adalah "peraturan perundang-undangan di bidang penanggulangan bencana". Jadi PP 37/2010
   secara tegas menyerahkan bagian penyelamatan masyarakat dalam RTD ke rezim penanggulangan bencana (UU 24/2007,
   BNPB/BPBD). Sumber: `data/lembaga/mentah/teks/pp-37-2010.json.gz` hlm. 23–26 (Pasal 56 di hlm. 25) dan 83–84
   (Penjelasan Pasal 52 di hlm. 83, Penjelasan Pasal 56 ayat (3) di hlm. 84); pustaka `ri-2010-pp37`. Label: resmi.
2. **Rencana kontingensi BNPB tidak memberi panduan per jenis ancaman (ditulis berdampingan):** teks Perban BNPB 2/2023
   tentang Penyusunan Rencana Kontingensi Bencana memuat 0 kemunculan kata "bendungan", "tanggul", "waduk", dan
   "kegagalan", tetapi juga 0 kemunculan "longsor", "kekeringan", "erupsi", "kebakaran", dan "cuaca". Jenis ancaman hanya
   muncul sebagai contoh di lampiran: tsunami akibat gempa megathrust Jawa Timur dan Kabupaten Malang (hlm. 17 dan
   23–32) dan banjir Kabupaten Pandeglang (hlm. 17). Perban ini pedoman umum lintas ancaman, jadi ketiadaan kata
   "bendungan" bukan bukti bahwa kegagalan bendungan diabaikan secara khusus; longsor, bahaya paling mematikan di Jawa
   (P1), juga tidak disebut. Di korpus JDIH BNPB lokal (191 berkas teks), frasa "kegagalan bendungan", "keruntuhan
   bendungan", dan "rencana tindak darurat" hanya ditemukan di Perban 5/2020 yang sudah habis masa berlakunya (butir 4).
   Sumber: korpus `data/raw/hukum/teks/perban-nomor-2-tahun-2023.json` (OCR, mutu 0,989; dicari seluruh 35 halaman, 24
   Oktober 2026); `data/raw/hukum/teks/*.json`; pustaka `bnpb-2023-renkon`. Label: resmi (ketiadaan dalam teks).
3. **Daftar data peringatan dini Perban BNPB 2/2024:** Pasal 7 ayat (2) mendaftar data peringatan dini bahaya dari K/L:
   a. tsunami; b. banjir; c. erupsi gunungapi; d. pergerakan tanah; e. kekeringan; f. cuaca ekstrim; g. kebakaran hutan
   dan lahan; h. gempa bumi; i. epidemik; j. kegagalan nuklir dan radiologi; k. teknologi industri; dan l. "layanan
   informasi peringatan dini Bahaya lainnya sesuai dengan ketentuan peraturan perundang-undangan". Kegagalan bendungan
   atau tanggul tidak disebut eksplisit; banjir akibat kegagalan bendungan dan peringatan dini dalam RTD menurut PP
   37/2010 dapat masuk lewat huruf b atau huruf l bila ada peraturan penyedia. Ayat (3): K/L menyampaikan data "sesuai
   dengan ketentuan peraturan perundang-undangan". Sumber: korpus `data/raw/hukum/teks/perban-nomor-2-tahun-2024.json`
   hlm. 5; pustaka `bnpb-2024-peringatan-dini`. Label: resmi.
4. **Renstra BNPB lama sudah mengenali jenis ini:** Perban BNPB 5/2020 (Renstra 2020–2024) menggolongkan "banjir yang
   disebabkan oleh kegagalan bangunan air buatan manusia seperti bendungan, tanggul, dan bangunan pengendali banjir".
   Sumber: korpus `data/raw/hukum/teks/perban-nomor-5-tahun-2020.json` hlm. 10. Label: resmi (dokumen yang sudah habis
   masa berlakunya).
5. **Contoh RTD yang disosialisasikan dan disiapkan untuk BPBD:** BBWS Pemali-Juana menyosialisasikan RTD Bendungan
   Banyukuwung pada Selasa, 10 September 2024; wilayah terdampak 32 desa di 4 kecamatan Rembang (Sumber 3, Sulang 1,
   Kaliori 19, Rembang 9); artikel menyebut RTD "disusun" dan disiapkan untuk diimplementasikan BPBD Rembang sesuai SOP
   dan Perda, berlaku 5 tahun, dan diperbarui BBWS tiap 5 tahun. Sumber: Pemerintah Kabupaten Rembang, "Rawan Potensi
   Banjir Bendungan Banyukuwung, Pemerintah Tingkatkan Kesiapsiagaan 32 Desa", 10 September 2024,
   https://rembangkab.go.id/?p=24363 (diakses ulang 24 Oktober 2026). Label: resmi (situs pemkab), untuk sosialisasi dan
   penyiapan saja. **Batas klaim:** artikel tidak menyatakan RTD sudah ditetapkan Pemilik (PP 37/2010 Pasal 54), tidak
   menyatakan RTD sudah masuk rencana kontingensi BPBD Rembang, dan tidak merinci isi analisis keruntuhan. Penulis
   menulis "RTD disosialisasikan dan disiapkan untuk BPBD (penetapan dan integrasi ke renkon belum terverifikasi)", bukan
   "tersambung ke BPBD".
6. **Baris DIBI yang bertanggal sama dengan kegagalan tanggul, dan Demak 2024:** baris banjir Kab. Tangerang 27 Maret
   2009, 100 meninggal dan 93 hilang, rekaman tanggal-kab bahaya musim hujan terbesar di Jawa 2008–2026 (P1 butir 8);
   tanggalnya sama dengan jebolnya tanggul Situ Gintung menurut Harsoyo (2010), tetapi DIBI mencatatnya sebagai banjir
   (P2 butir 3). Demak–Kudus 2024: DIBI 11 meninggal, 60.706 mengungsi, 257.387 menderita (5 Februari–31 Maret 2024),
   tanpa keterangan tanggul. Jebolnya tanggul Sungai Wulan (Februari dan 17 Maret 2024) dan jumlah tanggul yang jebol
   hanya ada di media; penelusuran 24 Oktober 2026 tidak menemukan dokumen BBWS Pemali-Juana, Kementerian PU, atau BNPB
   yang dapat dibuka. Sumber: DIBI (`riset/mentah/dibi_hidromet.json`; `dibi/kejadian_besar.csv` `demak2024`);
   keterangan tanggul Demak hanya dari ringkasan hasil penelusuran web 24 Oktober 2026 (Metro TV, Antara Jateng, iNews,
   Medcom; halaman tidak dibuka) dan riset B §8.4. Label: resmi (DIBI); terverifikasi (tanggal Situ Gintung); keterangan
   tanggul Demak sekunder, tidak masuk badan teks.
7. **Bendungan alam setelah longsor:** pada longsor Cisarua 2026 terbentuk bendungan alam di salah satu hulu sungai yang
   berpotensi jebol dan memicu aliran lumpur dan material rombakan ke hilir. Sumber: BNPB, *Buletin Info Bencana* Januari
   2026, hlm. 14. Label: resmi.
8. **Instrumen keamanan bendungan yang rusak (dari Bab 4 P3):** Kedung Ombo memegang 85,2% tampungan 2021 BBWS
   Pemali-Juana; inklinometer rusak 11 dari 13, settlement 21 dari 48, piezometer 3 dari 58; seluruh 18 bendungan balai:
   V-notch rusak 26 dari 48, inklinometer 13 dari 24, piezometer 87 dari 543. Sumber: Bab 4 berkas bukti P3; kunci
   `airjawa.bendungan.kedungombo.*`, `airjawa.bendungan.pj.*`. Label: resmi (status Juli 2021).
9. **Bendungan PSN baru di Jawa:** 19 bendungan PSN di Jawa (Permenko Perekonomian 16/2025), antara lain Ciawi, Sukamahi,
   Karian, Jragung, Bener, Semantok. Sumber: riset E §E8; pustaka `kemenko-ekon-2025-permenko16`. Label: resmi. Menurut
   PP 37/2010 Pasal 52, RTD tiap bendungan baru disusun Pembangun.
10. **Tanggul pesisir Jakarta:** NCICD trase kewenangan DKI 20,9 km, terbangun 9,4 km, sisa 11,5 km per 17 Juli 2025; total
    Fase A 39 km (PU dan DKI), target 2030; tiga pelaku tanggul (PU, Pemprov DKI, BOP Pantura Jawa). Sumber:
    `lembaga/celah.csv` C13; pustaka `dsda-2025-ncicd`. Label: resmi (data sekitar 15 bulan sebelum batas data).
11. **Pelaku pengendalian banjir menurut teks (Tabel 6.4):** Kementerian PU dan pemda menetapkan kawasan daya rusak air
    termasuk banjir, longsor, ambles (PP 30/2024 Pasal 97; R062, R063, R067); penetapan sistem peringatan dini pada setiap
    WS (PP 30/2024 Pasal 96 ayat (1) huruf b; R078, R079 memetakan pelakunya ke Kementerian PU dan pemda, padahal Pasal 94
    ayat (5) menyebut pengendalian daya rusak air "menjadi tanggung jawab Menteri, menteri/pimpinan lembaga pemerintah
    nonkementerian, gubernur, dan/atau bupati/wali kota, serta Pengelola Sumber Daya Air Wilayah Sungai dan Masyarakat";
    BNPB dan BMKG berjenis LPNK menurut `lembaga/lembaga.csv`, jadi LPNK disebut sebagai penanggung jawab tetapi tidak
    dirinci); penetapan prosedur operasi standar evakuasi korban bencana akibat daya rusak air (Pasal 96 ayat (1) huruf
    d) dan pelatihan tanggap darurat (Pasal 96 ayat (2) huruf b), dua kegiatan yang paling dekat dengan BPBD, pelaku
    tidak disebut dan belum ada di `peran.csv` (teks PP 30/2024 hlm. 64–65); PJT I dan II
    pengendalian banjir di wilayah kerja (PP 46/2010; PP 25/2022; R064, R065); Kementerian ESDM (Badan Geologi) peringatan
    dini gerakan tanah (UU 23/2014 Lampiran CC bagian yang masih berlaku; R055); tindakan darurat kewenangan gubernur dan
    bupati/wali kota (UU 17/2019 Pasal 35 ayat (6)); penanggulangan daya rusak air yang dinyatakan bencana tunduk pada UU
    24/2007 (ayat (5)). Sumber: `data/lembaga/peran.csv`; `lembaga/README.md` §4.3; KERANGKA §2 butir 2. Label: resmi;
    kolom `jenis_bukti` membedakan "tertulis" dan "dipetakan penyusun".
12. **Forum:** Kepala BNPB anggota Dewan SDA Nasional (Perpres 53/2022 Pasal 7 ayat (1) huruf d angka 14; Keppres 18/2024);
    TKPSDA WS ditetapkan Menteri (Permen PU 2/2024), teksnya tidak menyebut BNPB atau BPBD; beberapa RPSDA menempatkan BPBD
    dan BNPB sebagai pelaksana kegiatan pengendalian daya rusak air (kata BPBD 50 kali di RPSDA Brantas 2021, 29 kali di
    Jratunseluna 2024). Sumber: riset E §E6 dan §E13. Label: resmi.

### Inferensi

- **[Inferensi tim]** Serah-terima RTD ke rezim penanggulangan bencana sudah tertulis di sisi SDA: PP 37/2010 Pasal 56
  ayat (3) dan Penjelasannya menyerahkan tindakan penyelamatan masyarakat ke peraturan di bidang penanggulangan
  bencana, ditambah konsultasi ke kepala daerah, contoh instansi teknis, dan sosialisasi. Yang belum ada adalah
  penerimaan dan pengaturannya di sisi BNPB: Perban 2/2023 tidak memberi panduan per jenis ancaman, termasuk kegagalan
  bendungan, dan Perban 2/2024 tidak menyebut kegagalan bendungan secara eksplisit (dapat masuk lewat Pasal 7 ayat (2)
  huruf b atau l bila ada peraturan penyedia). PP 37/2010 menyerahkan penyelamatan masyarakat ke peraturan PB, tetapi
  Perban 2/2023 dan 2/2024 belum menurunkannya. Akibatnya keterhubungan bergantung pada inisiatif balai, seperti di
  Banyukuwung, dan tidak dapat diaudit secara nasional.
- **[Inferensi tim]** Baris DIBI yang menetapkan lantai Jawa bertanggal sama dengan jebolnya tanggul Situ Gintung
  (Harsoyo 2010), dan Kedung Ombo (tampungan terbesar balai) punya instrumen deformasi yang paling rusak. Gabungan dua
  fakta ini menjadikan "kegagalan bendungan atau tanggul saat hujan ekstrem" skenario yang perlu tercantum di renkon kab
  hilir, walaupun peluangnya per bendungan tidak diketahui.
- **[Inferensi tim]** Bendungan alam setelah longsor (Cisarua, resmi) menunjukkan bahwa "bangunan air" yang gagal tidak
  selalu bendungan berizin; renkon kab perlu memuat bendungan alam, dan tanggul sungai bila kegagalannya dikonfirmasi
  dokumen resmi (keterangan tanggul Demak 2024 masih sekunder, butir 6). Keduanya tidak diatur PP 37/2010.

### Celah

- Daftar bendungan dengan RTD yang sudah ditetapkan, tanggal penetapan, dan kab hilir yang dikonsultasikan tidak
  ditemukan; peraturan Menteri pelaksana Pasal 59 PP 37/2010 tidak dibuka (Permen PUPR 27/PRT/M/2015 hanya disebut di hasil
  penelusuran, belum dibuka). **Permintaan:** Kementerian PU (Ditjen SDA, Balai Teknik Bendungan), PJT I dan II; tembusan
  ke BPBD kab hilir. **Penyajian:** Tabel 6.4 menulis "status RTD per bendungan: permintaan data"; Banyukuwung sebagai
  contoh berlabel resmi.
- Klasifikasi bahaya bendungan dan rekomendasi Komisi Keamanan Bendungan tidak ditemukan (Bab 4 P3 Celah).
- Inventaris tanggul sungai, situ, dan kondisinya tidak ditemukan. **Permintaan:** BBWS dan dinas SDA provinsi.
- Dokumen resmi tentang jebolnya tanggul Sungai Wulan 2024 (BBWS Pemali-Juana atau BNPB) tidak terbuka; server Buletin
  BNPB Maret 2024 membalas HTTP 521 saat dicoba 24 Oktober 2026, dan penelusuran ulang hari yang sama hanya memberi
  berita. **Penyajian:** DIBI saja; keterangan tanggul ditulis sebagai celah sampai dokumen resmi dibuka. Inti P4 tidak
  menyebut Demak 2024.
- Status penetapan RTD Banyukuwung (Pasal 54) dan integrasinya ke renkon BPBD Rembang tidak terverifikasi.
  **Permintaan:** BBWS Pemali-Juana (SK penetapan RTD), BPBD Kabupaten Rembang (dokumen renkon).

---

## P5. Seberapa jauh peringatan dini dapat menurunkan korban, dan untuk bahaya apa angka itu tidak dihitung?

### Inti

Dengan rumus kajian (R = 8, asosiasi lintas negara), lintasan Renas indikator 1.c (11.060 ke 52.000 per 100.000) memberi
faktor 0,603, sedangkan lintasan IKP Renstra (6,10% ke 6,32%) memberi 0,998, atau manfaat sekitar 0,2%. Bila faktor
Renas hanya dikenakan pada bahaya selain longsor, sesuai KERANGKA, lantai 270 turun ke sekitar 176 dan musim 2025/2026
(237) hanya turun ke sekitar 214, karena 75,5% korbannya longsor; angka paket (162,9 dan 143,0) mengenakan faktor juga
pada longsor. Longsor tidak dihitung karena koefisien lintas negara tidak berlaku untuk bahaya berwaktu tunggu pendek
dan status longsor platform hanya menangkap 15,1% kejadian pada tingkat Siaga; longsor Cisarua terjadi dini hari saat
status siaga darurat kab dan provinsi sudah berlaku.

### Temuan bersumber

1. **Rumus dan dua lintasan:** faktor = ((1 − c1) + c1/R) / ((1 − c0) + c0/R), R = 8. Renas 1.c: c0 = 11,06% (2025),
   c1 = 52% (target 2029), faktor 0,6034. Renstra IKP: c0 = 6,10%, c1 = 6,32%, faktor 0,998. Sumber:
   `skenario-hidromet/kepekaan_peringatan_dini.csv`; kunci lama `renas.indikator_1c.2025`, `renas.indikator_1c.2029`,
   `renstra.ikp_peringatan_dini.2025`, `renstra.ikp_peringatan_dini.2029` (BAB 1), `hidromet.jawa.lanina.pd_renas.faktor`,
   `hidromet.jawa.lanina.pd_renstra_ikp.faktor`. Label: asumsi-kebijakan (rumus); resmi (target).
2. **R = 8:** mortalitas bencana di negara bercakupan peringatan dini terbatas delapan kali lebih tinggi daripada negara
   bercakupan substansial sampai komprehensif; asosiasi lintas negara, bukan efek kausal. Sumber: WMO, siaran pers 13
   Oktober 2022 (pustaka `wmo-2022-peringatan-dini`); kunci `bukti.wmo_2022.rasio_mortalitas`. Label: terverifikasi.
3. **Hasil paket (faktor dikenakan pada semua korban, termasuk longsor):** lantai Jawa 270 → 162,9 (Renas) atau 269,5
   (Renstra IKP); La Niña Jawa 254–547 → 153–330. Sumber: `kepekaan_peringatan_dini.csv` baris `musim_hujan_lantai, jawa` dan
   `musim_hujan_lanina, jawa`; kunci lama `hidromet.jawa.lantai.pd_renas.korban_jiwa`. Label: asumsi-kebijakan. **Dibantah
   oleh** KERANGKA §2 butir 10 dan §4 Bab 6: kepekaan "dipecah per jenis; longsor tidak dihitung". CSV tidak memecah per
   jenis.
4. **Dihitung ulang per jenis (longsor tidak dikenai faktor; faktor Renas 0,6034):**

   | Musim | Meninggal + hilang | Longsor | Paket (semua × faktor) | Longsor tidak dihitung | Manfaat tanpa longsor |
   | --- | ---: | ---: | ---: | ---: | --- |
   | 2008/2009 (lantai) | 270 | 32 | 162,9 | 175,6 | 94,4 jiwa (35,0%) |
   | 2025/2026 (10 musim terakhir) | 237 | 179 | 143,0 | 214,0 | 23,0 jiwa (9,7%) |
   | 2009/2010 (setelah El Niño) | 169 | 115 | 102,0 | 147,6 | 21,4 jiwa (12,7%) |
   | 2015/2016 (setelah El Niño) | 68 | 43 | 41,0 | 58,1 | 9,9 jiwa (14,6%) |
   | 2023/2024 (setelah El Niño) | 90 | 39 | 54,3 | 69,8 | 20,2 jiwa (22,4%) |

   Rumus: (meninggal + hilang − longsor) × 0,6034 + longsor. Sumber: P2 butir 1 [olah(resmi) untuk pemecahan;
   asumsi-kebijakan untuk faktor]. Label: asumsi-kebijakan. Lantai 2008/2009 sendiri didominasi satu baris banjir
   bertanggal sama dengan jebolnya Situ Gintung (P2 butir 3); bila memang kegagalan tanggul, kejadian itu juga bukan
   bahaya berwaktu tunggu panjang. Faktor tetap dikenakan karena DIBI mencatatnya sebagai banjir.
5. **Porsi longsor:** longsor 1.376 dari 2.675 meninggal dan hilang musim hujan Jawa 2008/2009–2025/2026 (51,4%). Sumber:
   P2 butir 1 [olah(resmi)]. Label: resmi.
6. **Uji balik status platform (latih 2016–2021, uji 2022–2025, kab-hari):** longsor Waspada POD 0,543, FAR 0,976; Siaga
   POD 0,151, FAR 0,954; Awas POD 0,046, FAR 0,923. Banjir Siaga POD 0,132, FAR 0,939. Hujan ERA5 dipakai sebagai prakiraan
   sempurna, jadi skill nyata lebih rendah; DIBI kurang mencatat kejadian kecil. Sumber: `public/banjir/data/validasi.json`
   (dibuat 13 Oktober 2026; git `7cadb255`); `riset/D-inventaris-platform.md` §1.2–1.3. Label: estimasi-model (uji balik
   gagal: lemah). Keluaran platform bukan Data Bencana menurut Perban BNPB 1/2023 (KERANGKA §2 butir 19).
7. **Status siaga bukan peringatan dini:** Cisarua terjadi Sabtu dini hari 24 Januari 2026 ketika status siaga darurat
   Kabupaten Bandung Barat (1 Oktober 2025–30 April 2026) dan Provinsi Jawa Barat (15 September 2025–30 April 2026) sudah
   berlaku (P2 butir 6). Sumber: BNPB, *Buletin Info Bencana* Januari 2026, hlm. 13. Label: resmi.
8. **Penyedia peringatan dini per bahaya (C17):** BMKG untuk cuaca ekstrem, iklim ekstrem, gelombang, tsunami (UU 31/2009);
   Badan Geologi untuk gerakan tanah (UU 23/2014 Lampiran CC, masih berlaku); rezim SDA untuk sistem peringatan dini pada
   setiap WS (PP 30/2024 Pasal 96 ayat (1) huruf b). Sistem per WS adalah bagian pengendalian daya rusak air yang menurut
   Pasal 94 ayat (5) "menjadi tanggung jawab Menteri, menteri/pimpinan lembaga pemerintah nonkementerian, gubernur,
   dan/atau bupati/wali kota, serta Pengelola Sumber Daya Air Wilayah Sungai dan Masyarakat" (hlm. 64). BNPB dan BMKG
   berjenis LPNK (`lembaga/lembaga.csv`), jadi LPNK disebut sebagai penanggung jawab tetapi tidak dirinci siapa
   mengerjakan apa; `peran.csv` R078 dan R079 memetakan penetapan sistem per WS hanya ke Kementerian PU dan pemda
   (dipetakan penyusun). Pasal 96 juga memuat penetapan prosedur operasi standar evakuasi korban bencana akibat daya
   rusak air (ayat (1) huruf d) dan pelatihan tanggap darurat (ayat (2) huruf b), dua kegiatan yang paling dekat dengan
   BPBD, tanpa menyebut pelaku (hlm. 65). Yang tidak ditemukan adalah norma yang menghubungkan sistem per WS dengan Perban
   BNPB 2/2024 dan platform BNPB (C17 butir a); Perban 2/2024 sendiri menyerahkan penyedia data ke peraturan lain (Pasal 7
   ayat (3), hlm. 5). Sumber: `lembaga/celah.csv` C17; teks PP 30/2024 hlm. 64–65 (`data/lembaga/mentah/teks/pp-30-2024.json.gz`);
   `lembaga/lembaga.csv` baris BNPB dan BMKG. Label: resmi (teks); pemetaan pelaku oleh penyusun paket.
9. **Baseline berbeda versi:** target peringatan dini RPJMN 6,00 ke 6,32 (Lampiran I, terbaca primer) dan IKP Renstra 6,10
   ke 6,32; Renas 1.c dalam satuan per 100.000 penduduk di daerah berisiko. Sumber: riset E §3 butir 5; kunci BAB 1. Label:
   resmi; ditulis berdampingan. Baseline Renas 1.c per provinsi dan kab tidak ada (KERANGKA §7 butir 33).
10. **Pembanding paket kesiapsiagaan (P19, kekuatan bukti kuat):** kematian siklon Bangladesh 138.958 (1991) dan 4.234 (Sidr
    2007); yang terbukti adalah paket peringatan dini CPP, shelter, tanggul pesisir, dan penyadaran sebagai satu kesatuan;
    CPP sendirian tidak terbukti, dan efek terpisah tiap komponen belum dibuktikan. Padanan di Indonesia: relawan PB,
    Destana (P01, belum terbukti), InaTEWS (P03, sedang), status "Sudah ada, perlu dikembangkan". Sumber:
    `program-terbukti/kompendium_program.csv` baris P19, P01, P03; `bukti_dampak.csv` B108–B109; Haque dkk. (2012). Label:
    terverifikasi. Bangladesh tidak dipakai sebagai koefisien (`skenario-hidromet/README.md` bagian Kepekaan).

### Inferensi

- **[Inferensi tim]** Manfaat peringatan dini yang dapat ditulis untuk Jawa bergantung pada komposisi korban musim:
  besar bila musim didominasi banjir (2008/2009: 35%), kecil bila didominasi longsor (2025/2026: 9,7%). Karena longsor
  adalah separuh korban 18 musim dan tiga perempat korban musim terakhir, kepekaan peringatan dini bukan tuas utama untuk
  menurunkan korban musim hujan Jawa sampai ada peringatan dini longsor yang teruji.
- **[Inferensi tim]** Cisarua menunjukkan jarak antara status dan tindakan: status siaga darurat berlaku tujuh bulan untuk
  seluruh kab, tetapi tidak menunjuk lereng, waktu, atau rumah yang harus dikosongkan. Yang hilang adalah peringatan
  berbasis lokasi dan waktu (gerakan tanah, Badan Geologi) dan rantai ke rumah tangga, bukan status.
- **[Inferensi tim]** Selisih faktor 0,603 dan 0,998 bukan selisih keyakinan, melainkan selisih target: lintasan Renstra
  hampir tidak bergerak. Ini bahan KD-2 di Bab 10, bukan kesimpulan Bab 6.
- **[Inferensi tim]** Hasil kepekaan ini batas atas manfaat (R asosiasi), dan peringatan dini tidak mengurangi rumah rusak.
  Kartu dan grafik memakai pil Asumsi kebijakan; angka ini tidak masuk tesis, Pesan Kunci, atau judul temuan (KERANGKA §2
  butir 10).

### Celah

- `kepekaan_peringatan_dini.csv` tidak memecah per jenis; hitungan butir 4 dibuat penyusun bukti. **Permintaan internal:**
  pemilik `skenario-hidromet` menambah baris per jenis dan kolom `longsor_dikecualikan`, lalu kunci registri
  `*_tanpa_longsor` menunjuk ke paket.
- Uji balik peringatan dini longsor resmi (Badan Geologi) terhadap DIBI tidak ditemukan; hanya uji balik platform.
  **Permintaan:** Kementerian ESDM (Badan Geologi), BMKG.
- Cakupan peringatan dini per provinsi dan kab (penyebut Renas 1.c) tidak ada. **Permintaan:** Direktorat Peringatan
  Dini BNPB.
- Waktu kejadian (jam) per baris DIBI tidak ada, jadi porsi korban malam hari tidak dapat dihitung.
- `lembaga/peran.csv` belum memuat PP 30/2024 Pasal 96 ayat (1) huruf d (prosedur evakuasi korban) dan ayat (2) huruf b
  (pelatihan tanggap darurat), dan R078 serta R079 tidak mencatat LPNK dari Pasal 94 ayat (5). **Permintaan internal:**
  pemilik paket `lembaga` menambah baris dan catatan pemetaan.

---

## Bahan kartu skenario (6.8)

Kartu memakai format tiga blok Perban BNPB 2/2023 Pasal 7 ditambah baris kebutuhan respons (KERANGKA §2 butir 9).

| Kartu | Isi yang sudah berangka | Sumber di berkas ini | Yang ditulis "tidak dikuantifikasi" atau permintaan data |
| --- | --- | --- | --- |
| 6.1 Musim hujan tercatat terburuk | Lantai 270 (2008/2009; 71,5% dari satu baris DIBI 27 Maret 2009, tanggal jebolnya Situ Gintung); baris 237 (2025/2026) dan 127 (2019/2020) berdampingan; mengungsi 525.861 tanpa / 532.321 dengan rekaman Bekasi; rumah rusak berat 6.905 (2009/2010); luas bahaya tinggi banjir 1.526.491 ha, longsor 3.244.158 ha; nilai aset terpapar banjir Rp406,46 T, longsor Rp351,72 T (bukan kerugian); stimulan rumah longsor dan banjir bandang Rp74,0–91,0 M (2008/2009) dan Rp81,5–100,3 M (2025/2026); DaLA 2007 Rp5.184,43 M; pita model 254–547 berlabel, batas bawah dinaikkan ke lantai | P1, P2 | Fasilitas rusak per musim (pakai tahunan, berlabel); lingkungan tidak dikuantifikasi; luka tidak dipakai |
| 6.2 Musim 2026/2027 setelah El Niño kuat | Analog 2009/2010 (169), 2015/2016 (68), 2023/2024 (90) dengan komposisi longsor; prakiraan BMKG 22 September 2026; La Niña 7 dari 18 musim sebagai kepekaan fase ENSO; baris "lantai 270 tetap berlaku"; baris luar jendela musim (Mei–September 2016: 217) | P2 | Peluang per ZOM; pita peluang tidak dinilai |
| 6.3 Gelombang, abrasi, rob pesisir utara | Korban gelombang dan abrasi 5 meninggal, 1 hilang (2015–2026); terpapar KRB 728.643 jiwa; 35 kab berkejadian rob DIBI 2015–2025, terdampak Kota Pekalongan 103.540; luas rawan rob simulasi Jratunseluna 22.897 ha (estimasi-model); tambahan penurunan muka tanah 2026–2030 per titik | P3 | Luas genangan rob teramati "tidak dikuantifikasi"; model rob platform tidak dipakai |

Kebutuhan respons (standar Perka BNPB 7/2008; pengungsi Perban 3/2018): air bersih 7 liter per orang per hari tiga hari
pertama lalu 15 liter; air minum 2,5 liter (Bab 3 P3; kunci `perka_2008.*`). Kebutuhan dihitung dari pengungsi lantai
per metrik; hari mengungsi memakai asumsi 7 hari (rendah 3, tinggi 30) berlabel asumsi-kebijakan.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Tabel 6.1 | Korban per bahaya Jawa 2015–2026: kejadian, meninggal, hilang, mengungsi, rumah rusak, porsi | `dibi/jawa_kab_hidromet.csv` (cakupan bencana) | B5.7 | Tambah kolom hilang dan porsi (P1 butir 1–2); tanda "2026 sementara" |
| Gambar 6.1 | Peta kecil berganda IRBI 2025 banjir, longsor, abrasi, 5 kelas nilai | `air-jawa/kab_jawa.csv` kolom `irbi2025_*`; `air-jawa/peta_kab.geojson` | G19 | Sel kosong "tidak dinilai": longsor 23 kab, abrasi 58 kab, banjir 1 kab; batas kelas sama dengan aturan 3.5 (kuantil) |
| Gambar 6.2 | Jumlah tahun tercatat longsor per kab 2015–2025 | `air-jawa/dibi_kab_tahun.csv` (kelompok `longsor`) | G19 | Pita "IRBI longsor tidak dinilai di 23 kab"; patahan 2024 di catatan |
| Tabel 6.2 | Daftar perhatian banjir (67) dan longsor (57), syarat yang dipenuhi, urut kode wilayah | `turunan/daftar_perhatian.csv`; `turunan/daftar_perhatian_kepekaan.csv` | B5.7 | Bukan peringkat; baris kepekaan (78/66, 63/56); tandai kab di kedua daftar (38) |
| Gambar 6.3 | Meninggal + hilang per musim 2008/2009–2025/2026 | `skenario-hidromet/musim_hujan.csv`; pemecahan per jenis (P2 butir 1) | G1 | **Usul:** batang bertumpuk tiga warna (longsor, banjir termasuk bandang dan banjir dan longsor, cuaca ekstrem); garis lantai 270; penanda La Niña dan setelah El Niño kuat; label rekaman di atas 90 jiwa: 27 Mar 2009 ("tanggal jebolnya Situ Gintung"), Banjarnegara Des 2014, Cisarua Jan 2026 |
| Tabel 6.3 | Kejadian besar dan pelajarannya | P2 butir 11 | B5.7 | Semua versi berdampingan per baris; kolom "jendela dan wilayah dipilih penyusun" |
| Gambar 6.4 | Rantai risiko kronis: pengambilan air tanah, penurunan muka tanah, rob dan banjir, tanggul tenggelam | P3 butir 4–5, 11–12 | B5.23 | Contoh berangka ruas Pekalongan–Demak; tuas P16 dengan syarat |
| Gambar 6.5 | Tambahan penurunan muka tanah 2026–2030 per titik atau kota terverifikasi | P3 butir 3 | G12 | Baris utama GNSS 42,8 cm untuk Pekalongan; versi 40–76 cm sebagai baris pembanding bertanda; pil Asumsi kebijakan; "kota tanpa titik = belum diukur" |
| Tabel 6.4 | Siapa mengerjakan apa saat musim hujan: kawasan daya rusak air, peringatan dini per bahaya, prosedur evakuasi korban dan pelatihan tanggap darurat (PP 30/2024 Pasal 96 ayat (1) huruf d, ayat (2) huruf b), RTD bendungan (pengamanan oleh Pengelola; penyelamatan masyarakat diserahkan ke peraturan PB, PP 37/2010 Pasal 56), tindakan darurat, status, renkon | `lembaga/peran.csv` (R055, R060–R067, R078–R079); P4 butir 1–5, 11; P5 butir 8 | B5.7 | Kolom "jenis bukti" (tertulis atau dipetakan penyusun); baris peringatan dini per WS memuat "LPNK disebut penanggung jawab (Pasal 94 ayat (5)), tidak dirinci"; baris "status RTD per bendungan: permintaan data"; Banyukuwung "RTD disosialisasikan dan disiapkan untuk BPBD (penetapan dan integrasi ke renkon belum terverifikasi)" |
| Kartu 6.1, 6.2, 6.3 | Lihat bagian Bahan kartu | P1–P3 | B5.11 | Kartu 6.2 wajib memuat baris lantai |
| Gambar 6.6 | Kepekaan peringatan dini, dua lintasan | `kepekaan_peringatan_dini.csv`; P5 butir 4 | G14 | **Usul:** tiga batang per musim (tercatat, paket, longsor tidak dihitung) untuk lantai dan 2025/2026; pil Asumsi kebijakan |
| Gambar 6.7 (usulan) | Meninggal + hilang per bulan kalender 2008–2025, bahaya musim hujan | `skenario-hidromet/kalender_bulanan_pulau.csv` (Jawa) | G1 | Hanya bila halaman cukup; arsir Mei–September (19,8%) |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/air/bukti/bab-06.angka.json` dengan bentuk entri `data/angka.json` (bentuk A:
`berkas` + `jalur` relatif ke `data/`; bentuk B: `nilai` + `pustaka`). `data/angka.json` tidak disunting. Kunci yang sudah
ada di registri atau berkas bukti Bab 1–4 dipakai ulang dan tidak didaftar lagi (antara lain `dibi.jawa.*.meninggal_2015_2026`,
`hidromet.jawa.lantai.*`, `hidromet.jawa.musim_20xx.*`, `hidromet.jawa.lanina.*`, `hidromet.jawa.terberat.*`,
`hidromet.jawa.pasca_elnino.n_musim`, `perhatian.air.*.n`, `airjawa.turun_tanah.*`, `bmkg.musim_2026.*`, `renas.indikator_1c.*`,
`renstra.ikp_peringatan_dini.*`, `bukti.*`). Angka sekunder tidak masuk registri.

**Catatan untuk kunci lama:** `hidromet.jawa.lantai.pd_renas.korban_jiwa` (162,9) mengenakan faktor pada longsor. Kunci
tidak diganti maknanya; penulis memakai kunci baru `hidromet.jawa.lantai.pd_renas_tanpa_longsor.korban_jiwa` untuk teks
yang mengikuti KERANGKA, atau menulis keduanya berdampingan.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| dibi.jawa.longsor.hilang_2015_2026 | 106 jiwa | pustaka bnpb-dibi (olah `dibi/jawa_kab_hidromet.csv`) | resmi | DIBI BNPB |
| dibi.jawa.banjir.hilang_2015_2026 | 74 jiwa | idem | resmi | DIBI BNPB |
| dibi.jawa.hidromet.hilang_2015_2026 | 201 jiwa | idem | resmi | DIBI BNPB |
| dibi.jawa.longsor.porsi_meninggal_persen | 53,2% | idem (924/1.738) | resmi | olah |
| dibi.jawa.air_musim_hujan.meninggal_2015_2026 | 1.494 jiwa | idem (longsor + banjir + banjir dan longsor + banjir bandang) | resmi | olah |
| dibi.jawa.air_musim_hujan.porsi_meninggal_persen | 86,0% | idem | resmi | olah |
| dibi.jawa.banjir.mengungsi_2015_2026 | 1.222.590 jiwa | idem | resmi | DIBI BNPB |
| dibi.jawa.hidromet.mengungsi_2015_2026 | 1.403.784 jiwa | idem | resmi | DIBI BNPB |
| dibi.jawa.banjir.porsi_mengungsi_persen | 87,1% | idem | resmi | olah |
| dibi.jawa.cuaca_ekstrem.rumah_rusak_2015_2026 | 147.711 unit | idem | resmi | DIBI BNPB |
| dibi.jawa.hidromet.rumah_rusak_2015_2026 | 239.885 unit | idem | resmi | DIBI BNPB |
| dibi.jawa.cuaca_ekstrem.porsi_rumah_rusak_persen | 61,6% | idem | resmi | olah |
| dibi.jawa.longsor.meninggal_per_kejadian | 0,164 | idem | resmi | olah |
| dibi.jawa.banjir.meninggal_per_kejadian | 0,099 | idem | resmi | olah |
| dibi.jabar.longsor.meninggal_2015_2026 | 468 jiwa | idem | resmi | DIBI BNPB |
| dibi.jawa.longsor.top10_porsi_meninggal_persen | 52,4% | idem (484/924) | resmi | olah |
| dibi.jawa.longsor.n_kab_berkorban | 81 kab/kota | idem | resmi | olah |
| dibi.jawa.longsor.n_kab_berkorban_5_tahun | 18 kab/kota | idem | resmi | olah |
| dibi.jawa.banjir.n_kab_berkorban_5_tahun | 9 kab/kota | idem | resmi | olah |
| dibi.bandungbarat.longsor.meninggal_2015_2026 | 115 jiwa | dibi/jawa_kab_hidromet_ringkas.csv `[kode_kab_bps=3217].tanah_longsor__meninggal` | resmi | DIBI BNPB |
| dibi.sukabumi.longsor.meninggal_2015_2026 | 76 jiwa | dibi/jawa_kab_hidromet_ringkas.csv `[kode_kab_bps=3202].tanah_longsor__meninggal` | resmi | DIBI BNPB |
| perhatian.air.banjir_longsor.irisan_n | 38 kab/kota | pustaka bnpb-irbi (olah `turunan/daftar_perhatian.csv`) | asumsi-kebijakan | olah |
| perhatian.air.banjir.n_dua_kelas | 78 kab/kota | turunan/daftar_perhatian_kepekaan.csv `[kajian=air,bahaya=banjir,varian=syarat_a_dua_kelas_teratas].n_masuk` | asumsi-kebijakan | olah |
| perhatian.air.banjir.n_b4 | 66 kab/kota | idem `[...,varian=syarat_b_4_tahun].n_masuk` | asumsi-kebijakan | olah |
| perhatian.air.longsor.n_dua_kelas | 63 kab/kota | idem `[kajian=air,bahaya=longsor,varian=syarat_a_dua_kelas_teratas].n_masuk` | asumsi-kebijakan | olah |
| perhatian.air.longsor.n_b4 | 56 kab/kota | idem `[...,varian=syarat_b_4_tahun].n_masuk` | asumsi-kebijakan | olah |
| airjawa.irbi2025.banjir.ambang_kelas_teratas | 16 | turunan/daftar_perhatian.csv `[kajian=air,bahaya=banjir,kode=3201].ambang_irbi` | asumsi-kebijakan | olah IRBI |
| airjawa.irbi2025.longsor.ambang_kelas_teratas | 13 | idem `[kajian=air,bahaya=longsor,kode=3201].ambang_irbi` | asumsi-kebijakan | olah IRBI |
| airjawa.irbi2025.banjir.top9_korban_kelas_teratas | 0 dari 9 kab (peringkat 10 seri tiga kab: Subang, Kab. Bekasi, Brebes; dua kelas teratas) | pustaka bnpb-irbi (olah) | resmi | IRBI 2025, DIBI 2015–2025 |
| airjawa.irbi2025.longsor.top10_korban_kelas_teratas | 6 dari 10 kab | idem | resmi | idem |
| dibi.jawa.longsor.porsi_top5_kejadian_persen | 24,8% | pustaka bnpb-dibi (olah `dibi_hidromet.json`, 230/926) | resmi | olah |
| dibi.jawa.longsor.porsi_top10_kejadian_persen | 34,9% | idem (323/926) | resmi | olah |
| hidromet.jawa.musim_2014.meninggal_hilang | 204 jiwa | pustaka bnpb-dibi (olah `musim_hujan.csv` 180 + 24) | resmi | olah |
| dibi.banjarnegara2014.meninggal_hilang | 110 jiwa | pustaka bnpb-dibi (baris 12 Des 2014, Banjarnegara, Tanah Longsor) | resmi | DIBI |
| hidromet.jawa.musim_2014.porsi_kejadian_terbesar_persen | 53,9% | idem (110/204) | resmi | olah |
| dibi.pacitan2017.meninggal_hilang_27_28nov | 50 jiwa | pustaka bnpb-dibi (tiga baris 27–28 Nov 2017: 45 meninggal, 5 hilang) | resmi | DIBI |
| airjawa.bandungbarat.irbi2025_longsor | 20 | air-jawa/kab_jawa.csv `[kode=3217].irbi2025_longsor` | resmi | IRBI 2025 |
| airjawa.jawa.irbi2025.abrasi_dinilai | 61 kab/kota | pustaka bnpb-irbi (olah `kab_jawa.csv`) | resmi | olah |
| hidromet.jawa.musim.mh_18_musim | 2.675 jiwa | pustaka bnpb-dibi (olah `musim_hujan.csv`) | resmi | olah |
| hidromet.jawa.musim.longsor_mh_18_musim | 1.376 jiwa | pustaka bnpb-dibi (olah `riset/mentah/dibi_hidromet.json`) | resmi | olah |
| hidromet.jawa.musim.longsor_porsi_persen | 51,4% | idem | resmi | olah |
| hidromet.jawa.musim_2008.banjir_mh | 236 jiwa | idem | resmi | olah |
| hidromet.jawa.musim_2025.longsor_mh | 179 jiwa | idem | resmi | olah |
| hidromet.jawa.musim_2025.longsor_porsi_persen | 75,5% | idem | resmi | olah |
| hidromet.jawa.musim_2009.longsor_mh | 115 jiwa | idem | resmi | olah |
| hidromet.jawa.musim_2019.meninggal_hilang | 127 jiwa | pustaka bnpb-dibi (olah `musim_hujan.csv` 124 + 3) | resmi | olah |
| hidromet.jawa.pasca_elnino.mh_2009 | 169 jiwa | skenario-hidromet/kartu_skenario.csv `[skenario=musim_hujan_pasca_elnino,wilayah=jawa,metrik=meninggal_hilang_2009].nilai` | resmi | DIBI |
| hidromet.jawa.pasca_elnino.mh_2015 | 68 jiwa | idem `metrik=meninggal_hilang_2015` | resmi | DIBI |
| hidromet.jawa.pasca_elnino.mh_2023 | 90 jiwa | idem `metrik=meninggal_hilang_2023` | resmi | DIBI |
| hidromet.jawa.musim.median_mh | 141,5 jiwa | pustaka bnpb-dibi (olah `musim_hujan.csv`) | resmi | olah |
| hidromet.jawa.luar_musim.porsi_mh_persen | 19,8% | pustaka bnpb-dibi (olah `kalender_bulanan_pulau.csv`, 650/3.277) | resmi | olah |
| hidromet.jawa.luar_musim.mh_2016 | 217 jiwa | pustaka bnpb-dibi (olah `dibi_hidromet.json`, Mei–Sep 2016) | resmi | olah |
| dibi.situgintung2009.meninggal | 100 jiwa | pustaka bnpb-dibi (baris banjir 27 Mar 2009, Kab. Tangerang; kaitan dengan Situ Gintung lewat tanggal, Harsoyo 2010) | resmi | DIBI |
| dibi.situgintung2009.hilang | 93 jiwa | idem | resmi | DIBI |
| hidromet.jawa.lantai.porsi_situgintung_persen | 71,5% | idem (193/270) | resmi | olah |
| dibi.cisarua2026.meninggal | 94 jiwa | pustaka bnpb-2026-buletin-januari (hlm. 2) | resmi | BNPB; sama dengan DIBI |
| dibi.cisarua2026.luas_ha | 21,55 ha | pustaka bnpb-2026-buletin-januari (hlm. 14) | resmi | BNPB |
| dibi.jakarta2013.meninggal | 38 jiwa | dibi/kejadian_besar.csv `[kode=jakarta2013,metrik=meninggal,versi=DIBI].nilai` | resmi | DIBI |
| dibi.jakarta2013.mengungsi | 83.930 jiwa | idem `metrik=mengungsi` | resmi | DIBI |
| dibi.jabodetabek2020.meninggal_banjir_13kab | 51 jiwa | dibi/kejadian_besar.csv `[kode=jabodetabek2020,metrik=meninggal,versi=DIBI].nilai` | resmi | DIBI |
| hidromet.jawa.jabodetabek2020.meninggal_14kab | 52 jiwa | skenario-hidromet/kartu_skenario.csv `[skenario=kasus_jabodetabek_2020,wilayah=jawa,metrik=meninggal_tercatat].nilai` | resmi | DIBI |
| dibi.demak2024.meninggal | 11 jiwa | dibi/kejadian_besar.csv `[kode=demak2024,metrik=meninggal,versi=DIBI].nilai` | resmi | DIBI |
| dibi.demak2024.mengungsi | 60.706 jiwa | idem `metrik=mengungsi` | resmi | DIBI |
| dibi.demak2024.menderita | 257.387 jiwa | idem `metrik=menderita` | resmi | DIBI |
| hidromet.jawa.musim_2008.stimulan_longsor_bandang | Rp74,0–91,0 M | pustaka bnpb-dibi (olah rumah rusak × stimulan) | asumsi-kebijakan | olah |
| hidromet.jawa.musim_2025.stimulan_longsor_bandang | Rp81,5–100,3 M | idem | asumsi-kebijakan | olah |
| airjawa.turun_tanah.pekalongan.tambahan_2026_2030_gnss | 42,8 cm | pustaka susilo-2023-gnss (10,7 × 4) | asumsi-kebijakan | olah |
| airjawa.turun_tanah.pekalongan.tambahan_2026_2030_latar | 40–76 cm | pustaka widodo-2024-pekalongan (10–19 × 4; kutipan latar) | asumsi-kebijakan | olah |
| airjawa.turun_tanah.semarang_demak.tambahan_2026_2030 | 40–48 cm | pustaka aditiya-2023-semarang (10–12 × 4) | asumsi-kebijakan | olah |
| airjawa.turun_tanah.jakarta.tambahan_2026_2030 | 0,16–25,2 cm | pustaka esdm-2023-air-tanah (0,04–6,30 × 4) | asumsi-kebijakan | olah |
| airjawa.turun_tanah.bandung.tambahan_2026_2030_titik | 88,0–89,2 cm | pustaka virtriana-2026-bandung (22,0–22,3 × 4) | asumsi-kebijakan | olah |
| airjawa.turun_tanah.semarang.badangeologi2018 | 2–10 cm/th | pustaka kemenpupr-2024-rpsda-jratunseluna (Tabel 5.83 hlm. 262) | resmi | Badan Geologi 2018 via RPSDA |
| airjawa.turun_tanah.demak.badangeologi2018 | > 10 cm/th | idem | resmi | idem |
| airjawa.rob.jratunseluna.luas_rawan_ha | 22.897 ha | pustaka kemenpupr-2024-rpsda-jratunseluna (hlm. 27–28) | estimasi-model | Kementerian PU, simulasi |
| dibi.jawa.rob.n_kab_2015_2025 | 35 kab/kota | pustaka bnpb-dibi (olah `air-jawa/dibi_kab_tahun.csv`) | resmi | olah |
| dibi.jawa.rob.meninggal_hilang_2015_2025 | 0 jiwa | idem | resmi | olah |
| dibi.kotapekalongan.rob.terdampak_2015_2025 | 103.540 jiwa | idem (menderita + mengungsi) | resmi | olah |
| dibi.jawa.gelombang_abrasi.n_kab_2015_2025 | 31 kab/kota | idem | resmi | olah |
| hidromet.jawa.gelombang_abrasi.luas_bahaya_tinggi | 40.298 ha | skenario-hidromet/kartu_skenario.csv `[skenario=gelombang_abrasi_rob,wilayah=jawa,metrik=luas_bahaya_tinggi_gelombang_abrasi].nilai` | resmi | KRB 2022–2026 |
| airjawa.bendungan.banyukuwung.rtd_desa | 32 desa | pustaka rembangkab-2024-rtd-banyukuwung (RTD disosialisasikan; penetapan belum terverifikasi) | resmi | Pemkab Rembang |
| airjawa.bendungan.banyukuwung.rtd_kecamatan | 4 kecamatan | idem | resmi | idem |
| hidromet.jawa.lantai.pd_renas_tanpa_longsor.korban_jiwa | 175,6 jiwa | pustaka bnpb-2025-renas (olah: (270 − 32) × 0,6034 + 32) | asumsi-kebijakan | olah |
| hidromet.jawa.musim_2025.pd_renas.korban_jiwa | 143,0 jiwa | idem (237 × 0,6034) | asumsi-kebijakan | olah |
| hidromet.jawa.musim_2025.pd_renas_tanpa_longsor.korban_jiwa | 214,0 jiwa | idem ((237 − 179) × 0,6034 + 179) | asumsi-kebijakan | olah |
| platform.longsor.siaga.pod | 0,151 | pustaka pantaubencana-2026-validasi-banjir | estimasi-model | uji balik platform |
| platform.longsor.siaga.far | 0,954 | idem | estimasi-model | idem |
| platform.banjir.siaga.pod | 0,132 | idem | estimasi-model | idem |

---

## Pustaka

Entri CSL-JSON di `naskah/air/bukti/bab-06.pustaka.json` (45 entri). Entri yang sudah ada di `pustaka.json` utama,
berkas bukti Bab 1–4, atau `riset/E-pustaka.json` disalin dengan id yang sama (38 entri, antara lain `bnpb-dibi`,
`bnpb-irbi`, `bnpb-2026-krb`, `bmkg-2026-musim-hujan`, `bnpb-2025-renas`, `bnpb-2025-renstra`, `bnpb-2023-renkon`,
`bappenas-2007-dala`, `wmo-2022-peringatan-dini`, `haque-2012-siklon`, `ri-2010-pp37`, `ri-2024-pp30`, `ri-2019-uu17`,
`kemenpupr-2024-rpsda-jratunseluna`, `susilo-2023-gnss`, `aditiya-2023-semarang`, `widodo-2024-pekalongan`,
`virtriana-2026-bandung`, `esdm-2023-air-tanah` versi Bab 4 (siaran pers 10 November 2023), `yamamoto-1984-tokyo`,
`tanaka-2013-bangkok`, `dsda-2025-ncicd`, `kemenko-ekon-2025-permenko16`). Entri baru (7): `bnpb-2026-buletin-januari`,
`rembangkab-2024-rtd-banyukuwung`, `bnpb-2024-peringatan-dini`, `bnpb-2020-renstra`, `pantaubencana-2026-validasi-banjir`,
`pantaubencana-2026-kompendium-program`, `harsoyo-2010-situgintung`. Catatan: id `esdm-2023-air-tanah` berbeda isi antara Bab 2 dan Bab 4; saat
registri disatukan, salah satunya perlu id baru. Sumber berita (Metro TV, Antara, media Demak 2024) hanya pembanding dan
tidak didaftar sebagai pustaka naskah.

---

## Catatan perbaikan atas temuan pemeriksa (24 Oktober 2026)

Ketiga belas temuan dicek ke sumber dan semuanya benar; tidak ada temuan yang ditolak. Ringkasan tindakan:

1. **Situ Gintung dan Demak (P2, P4, P5):** baris DIBI kini ditulis "banjir Kab. Tangerang 27 Maret 2009 (tanggal sama
   dengan jebolnya Situ Gintung)". Pembanding tanggal naik dari judul berita yang tidak dibuka ke artikel jurnal yang
   dibuka (Harsoyo 2010, terverifikasi, hanya untuk tanggal). "Kegagalan tanggul" dan "memperparah Demak 2024" dihapus
   dari Inti P4. Kata "malam hari" dihapus dari P5 butir 4. Dokumen resmi BBWS atau Bakornas PB tidak ditemukan (Celah P2
   dan P4).
2. **PP 37/2010 Pasal 56:** ayat (1) sampai (3) dan Penjelasan ayat (3) ditambahkan (hlm. 25 dan 84); inferensi
   dirumuskan ulang: serah-terima tertulis di sisi SDA, belum diturunkan Perban 2/2023 dan 2/2024.
3. **Perban 2/2023:** ketiadaan kata "bendungan" ditulis berdampingan dengan ketiadaan "longsor", "kekeringan",
   "erupsi", "kebakaran", dan "cuaca"; inferensi menjadi "tidak memberi panduan per jenis ancaman".
4. **Tabel rekaman terbesar (P1 butir 8):** satuan dipilih tanggal-kab, dihitung ulang, 10 teratas; Pacitan dikoreksi
   menjadi 45 + 5 (tiga baris, dua tanggal); peringkat kab-tahun ditulis berdampingan.
5. **IRBI banjir:** "0 dari 9; peringkat 10 seri tiga kab, dua kelas teratas"; kunci registri diganti menjadi
   `airjawa.irbi2025.banjir.top9_korban_kelas_teratas`. Longsor 6 dari 10 dicek: batas peringkat 10 tegas.
6. **Frekuensi kejadian besar:** "tiga kali dalam 18 musim (empat dengan luar jendela)"; musim 2014/2015 dimasukkan
   sebagai pembanding (P2 butir 3a) dan inferensi pertama P2 dirumuskan ulang.
7. **Konsentrasi kematian longsor:** inferensi diganti dengan angka butir 14 (5 terbesar sekitar 25%); nama Jemblung
   dihapus.
8. **Prakiraan BMKG:** isi siaran (resmi) dipisah dari penilaian tim; sifat hujan nasional ditambahkan berlabel tingkat
   nasional.
9. **Susilo dkk. (2023):** klaim abstrak ditulis berdampingan dengan stasiun CJKT, CSEM, dan batas bawah ESDM; badan
   teks dibatasi ke Pekalongan dan maksimum Semarang–Demak.
10. **PP 30/2024:** Pasal 94 ayat (5) dan Pasal 96 ayat (1) huruf d serta ayat (2) huruf b ditambahkan; "tanpa norma"
    diganti "LPNK disebut sebagai penanggung jawab tetapi tidak dirinci".
11. **Perban 2/2024 Pasal 7 ayat (2):** huruf b dan l ditulis sebagai pintu yang mungkin; halaman dikoreksi ke hlm. 5.
12. **Banyukuwung:** "RTD disosialisasikan dan disiapkan untuk BPBD (penetapan dan integrasi ke renkon belum
    terverifikasi)"; artikel dibuka ulang 24 Oktober 2026.
13. **P16:** "tuas berlabel bukti kuat di kompendium paket (evaluasi pra-pasca)"; Bangkok dilabeli kutipan tidak langsung
    (Phien-wej dkk. 2006 tidak berhasil dibuka).

**Di luar berkas ini:** `naskah/air/bukti/bab-10.md` baris 124 dan 372 masih menulis "jebolnya Situ Gintung" sebagai
fakta DIBI; perlu disesuaikan oleh penyusun bukti Bab 10. Kunci `dibi.situgintung2009.*` dan
`hidromet.jawa.lantai.porsi_situgintung_persen` tidak diganti namanya karena dipakai Bab 10; makna dan catatannya
diperjelas.
