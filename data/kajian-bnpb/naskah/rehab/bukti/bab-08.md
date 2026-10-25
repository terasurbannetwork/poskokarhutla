# Berkas bukti Bab 8: SKENARIO TERBURUK BEBAN REHABILITASI DAN REKONSTRUKSI PER JENIS BENCANA

Kajian: Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030 (pembaca Kepala BNPB).
Disusun 25 Oktober 2026 oleh peneliti berkas bukti (subagent), dari `rehab/KERANGKA.md` Bab 8 dan prinsip 7, `rehab/KEPUTUSAN-AWAL.md` (Q6, Q10, Q11, R3, R4), berkas bukti Bab 4 (`naskah/rehab/bukti/bab-04.md`, tabel koreksi per jenis), riset `rehab/riset/B`, `C`, `D`, `E`, `F`, paket `data/dibi`, `data/skenario-hidromet`, `data/skenario-geologi`, `data/irbi`, `data/program-terbukti`, cache `riset/mentah/dibi_geologi.json`, korpus `data/raw/hukum/teks`, dan empat halaman resmi yang dibuka sesi ini (dua rilis BNPB dan satu artikel BMKG tentang gempa Flores 2026; daftar di Pustaka).

Konvensi. Path relatif ke `data/kajian-bnpb/` kecuali disebut lain. Label: resmi, terverifikasi, estimasi-model, asumsi-kebijakan. Angka media berstatus **sekunder**, hanya lampiran rekonsiliasi (R3). Semua hitungan DIBI dijalankan ulang sesi ini dengan Python stdlib (filter `klasifikasi = alam`, `cakupan = bencana` untuk berkas rekap). "Lantai" = kejadian tercatat terburuk untuk jenis yang sama (KERANGKA induk prinsip 9; KERANGKA rehab prinsip 7); skenario tidak boleh lebih ringan dari lantai untuk wilayah yang sama. Kunci baru di `bab-08.angka.json`; kunci yang sudah ada di `data/angka.json` atau `bab-04.angka.json` disebut dengan namanya.

## Pegangan bab (dari KERANGKA §4 Bab 8)

- **Judul:** BAB 8 SKENARIO TERBURUK BEBAN REHABILITASI DAN REKONSTRUKSI PER JENIS BENCANA (perkiraan 14 hlm).
- **Subbab:** 8.1 Aturan Kartu; 8.2 Gempa Bumi; 8.3 Tsunami; 8.4 Likuefaksi; 8.5 Banjir dan Banjir Bandang; 8.6 Tanah Longsor; 8.7 Erupsi Gunung Api; 8.8 Cuaca Ekstrem; 8.9 Kartu Agregat Musim Hujan 2026/2027 untuk Kesiapan RR; 8.10 Sebaran per Provinsi dan Kab/Kota; 8.11 Matriks Kemungkinan × Dampak RR.
- **Tujuan bab:** memberi tiap jenis satu kartu beban RR yang dapat disalin ke R3P dan rencana kontingensi.
- **Pertanyaan kunci:** (1) Berapa rumah, jembatan, layanan air, dan durasi pulih pada skenario terburuk yang masuk akal per jenis? (2) Di provinsi dan kab/kota mana beban itu jatuh? (3) Apa kebutuhan lapis darurat (bailey, sumur, kit pipa, truk) per skenario?
- **Format kartu:** karakteristik ancaman; skenario kejadian; lantai tercatat (kejadian, tahun, sumber, label); empat besaran RR (rumah, jembatan/akses, layanan air, durasi pulih; Q6); kebutuhan lapis darurat (standar Perka 7/2008 × rasio satuan Bab 6–7, asumsi-kebijakan); baris kepekaan; matriks mini.
- **Temuan yang diharapkan:** tabel kartu KERANGKA (8.2–8.8) dan sebaran 8.10.
- **Komponen (KERANGKA):** Kartu 8.2–8.8; Kartu agregat 8.9; Tabel 8.1 matriks ketersediaan kuantifikasi (G16); Gambar 8.1 matriks kemungkinan × dampak RR (G17, B5.27); Gambar 8.2 peta kecil berganda per provinsi (G20, L33, L34); Tabel 8.2 kebutuhan lapis darurat per kartu (B5.7).
- **Status data (KERANGKA):** sebagian.

## Koreksi atas tabel kartu KERANGKA yang wajib dibawa penulis

Pemeriksaan sesi ini menemukan enam sel tabel kartu KERANGKA yang salah atau melanggar lantai. Penulis bab memakai kolom ketiga.

| Sel KERANGKA | Tertulis | Hasil pemeriksaan | Status |
|---|---|---|---|
| 8.2 jembatan gempa 2018–2025 | 90 | 52 (Bab 4, tabel koreksi) | dibantah |
| 8.6 jembatan longsor 2018–2025; RB longsor 2015–2025 | 250; 13.580 | 246; 12.865 (Bab 4) | dibantah |
| 8.7 jembatan erupsi 2018–2025 | 52 | 51 (Bab 4) | dibantah |
| 8.8 RB cuaca ekstrem 2015–2025 | 25.469 | 24.876 (Bab 4) | dibantah |
| 8.7 lantai rumah erupsi | Merapi 2010: 2.465 RB | **Kelud 2014: 12.404 RB**, lima kali Merapi; Merapi tetap lantai pengungsi (447.982) | lantai KERANGKA lebih ringan dari tercatat; diganti |
| 8.2 lantai jembatan gempa | "per kejadian: perlu turunan" | provinsi-tahun terberat 2018–2025: 10 (Maluku 2019); **NTT 2026: 36** (gempa Flores 15 Agu 2026, DIBI sementara) | diisi; 2026 berdampingan |
| 8.5 lantai jembatan banjir | 1.088 nasional; Aceh 480 | sel menulis "1.088 jembatan nasional DIBI": 1.088 adalah semua jenis dan semua status jalan, bukan jembatan nasional. Banjir saja 2025 = 1.021; lantai wilayah Sumatra = PU 1.181 jembatan daerah terdampak, lebih berat dari DIBI tiga provinsi 744 (Bab 4 inferensi) | dikoreksi |

Satu kejadian di luar periode acuan juga harus masuk kartu: **gempa Mw 7,7 Flores, 15 Agustus 2026 04.58 WIB, Sesar Naik Flores** (BMKG). DIBI per tarik 23 Oktober 2026 mencatat 131.331 rumah rusak dan 29.303 RB di 11 kab/kota, ketiga terbesar untuk gempa setelah Padang 2009 dan Lombok 2018, dan 36 jembatan rusak di NTT pada 2026 (kategori Gempabumi), lebih dari tiga kali lantai provinsi-tahun gempa 2018–2025. Angka ini sementara dan berbeda jauh antarversi (lihat PK1 butir A6).

---

## Pertanyaan kunci 1. Berapa rumah, jembatan, layanan air, dan durasi pulih pada skenario terburuk yang masuk akal per jenis?

### Inti

Lantai tercatat per jenis menempatkan empat jenis di kelas beban rumah tertinggi: gempa (Padang 2009, 271.540 rumah rusak), banjir (Sumatra 2025, 228.006), tsunami (Aceh–Nias 2004, 139.195 hancur atau rusak berat menurut BRR), dan likuefaksi dalam gabungan Sulawesi Tengah 2018 (110.214). Beban akses jauh lebih timpang: banjir merusak 1.021 jembatan pada 2025 saja dan 479 dalam satu provinsi-tahun (Aceh 2025), sedangkan lantai jenis lain hanya 10–61 jembatan, kecuali gempa Flores 2026 (36, sementara) dan erupsi Marapi 2024 (31). Layanan air hanya terkuantifikasi untuk tiga jenis (gempa: 37 titik SPAM Lombok; banjir: 178 SPAM Sumatra; tsunami: hampir 8.000 sumur dibangun ulang MDF di Aceh), dan durasi pulih permanen yang tercatat (huntap Sulawesi Tengah lebih dari lima tahun delapan bulan, Palu IV tujuh tahun empat bulan, SPAM Sumatra sampai Agustus 2028) selalu melampaui masa R3P paling lama tiga tahun.

### Temuan bersumber

**A. Gempa bumi (Kartu 8.2)**

1. Lantai rumah: Padang 2009, 119.005 RB, 271.540 rumah rusak (RS 0, RR 152.535), 1.195 meninggal, 6.554 mengungsi, 16 kab terdampak. Sumber: `dibi/kejadian_besar.csv` [kode=padang2009, versi=DIBI]; kunci ada `dibi.padang2009.rumah_rb`, `rehab.lantai.gempa.padang2009.rumah_rusak` (bab-04). Label: resmi. Tahun terberat gempa nasional 2009: 190.612 RB, 532.931 rumah rusak (Padang dan Tasikmalaya; `dibi/rekap_nasional_tahunan.csv` [tahun=2009, kategori=Gempabumi]), resmi.
2. Lantai pengungsi gempa: Lombok 2018, 406.202 mengungsi tercatat; 75.160 RB, 33.951 RS, 108.744 RR. Sumber: `dibi/kejadian_besar.csv` [kode=lombok2018]; kunci ada `dibi.lombok2018.mengungsi`, `dibi.lombok2018.rumah_rusak`. Label: resmi. Padang 2009 mencatat pengungsi hanya 6.554 walau RB terbesar; jiwa kehilangan hunian Padang (RB + RS) × 3,9 = 464.120 (kunci `rehab.lantai.gempa.padang2009.jiwa_kehilangan_hunian`, asumsi-kebijakan, rasio 3,9 jiwa per rumah dari `public/gempa/kerusakan.js`, sama dengan `naskah/mitigasi/bukti/bab-11.md`).
3. **Dibantah oleh / versi lain (Cianjur 2022):** DIBI 57.337 rumah rusak lawan R3P Cianjur 114.315 (`cianjur-2022-r3p`, kunci ada `r3p.cianjur2022.rumah_rusak`), resmi keduanya (Bab 4 PK3 butir 4).
4. Lantai jembatan gempa: 52 jembatan 2018–2025 nasional; tahun terberat 21 (2019); provinsi-tahun terberat 10 (Maluku 2019, gempa Ambon). Sumber: `dibi/rekap_nasional_tahunan.csv`, `dibi/rekap_provinsi_tahunan.csv` [kategori=Gempabumi]; kunci `rehab.dibi.jembatan_rusak.gempa.2018_2025` (bab-04), `rehab.dibi.jembatan_rusak.gempa.tahun_maks_2018_2025`, `rehab.dibi.jembatan_rusak.gempa.prov_tahun_maks_2018_2025`. Label: resmi.
5. Gempa Flores 15 Agustus 2026 (Mw 7,7, Sesar Naik Flores; BMKG 21 Agu 2026, https://www.bmkg.go.id/artikel/model-kinematika-sumber-gempa-bumi-flores-2026-mw-77-dan-kompleksitas-rangkaian-gempa-bumi-di-sesar-naik-flores, diakses 25 Okt 2026), DIBI: 151 meninggal, 171.287 mengungsi, 29.303 RB, 34.460 RS, 67.568 RR, total 131.331 rumah rusak di 11 kab/kota (Manggarai, Manggarai Timur, Manggarai Barat, Nagekeo, Ngada, Ende, Sikka, Sumba Timur, Bima, Kota Bima, Kepulauan Selayar); NTT 2026 kategori Gempabumi 36 jembatan dan 2.918 fasum rusak; nasional gempa 2026 38 jembatan. Sumber: `riset/mentah/dibi_geologi.json` (11 baris dt 15 Agu 2026, jumlah_kejadian 0,090909 per kab); `dibi/rekap_provinsi_tahunan.csv` [tahun=2026, provinsi=Nusa Tenggara Timur, kategori=Gempabumi]; kunci `rehab.lantai.gempa.flores2026.*`, `rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026`, `rehab.dibi.jembatan_rusak.gempa.2026`; kunci ada `dibi.ntt2026.gempa.rumah_rusak_berat` (provinsi, 29.315, termasuk gempa NTT lain 2026). Label: resmi, sementara (tahun berjalan).
6. **Dibantah oleh / versi lain (Flores 2026), ditulis berdampingan:** BNPB per 22 Agu 2026: 53.971 rumah rusak (RB 19.006, RS 11.777, RR 23.188), data sementara (https://www.bnpb.go.id/berita/hari-kedelapan-bnpb-catat-53971-rumah-rusak-dan-pendataan-dilakukan-secara-paralel, rilis 23 Agu 2026, diakses 25 Okt 2026); BNPB 7 Sep 2026: 102.384 data awal, 51.591 terverifikasi (50,39%) dengan hasil RB 2.382, RS 7.276, RR 14.177, tidak rusak 27.756, "masih bersifat dinamis" (https://www.bnpb.go.id/berita/sebanyak-51591-rumah-pascagempa-m77-flores-telah-diverifikasi, diakses 25 Okt 2026); USGS: sedikitnya 136 meninggal, 27.414 rumah hancur, 71.486 rusak, tsunami tercatat 169 cm di Pelabuhan Pota (kunci ada `usgs.flores2026.*`, terverifikasi). Label: resmi (BNPB), terverifikasi (USGS). Versi DIBI (29.303 RB) adalah yang terbesar; hasil verifikasi menurunkan RB tajam (2.382 dari separuh data), sehingga lantai Flores belum stabil.
7. Layanan air gempa: Lombok 2018, 37 titik SPAM rusak, umumnya pipa HDPE; respons 83 sumur bor JIAT (1.314 l/dt), 242 hidran 2.000 liter dan 65 hidran 1.000 liter, 28 mobil tangki 4.000 liter, 26 IPA (358 l/dt). Cianjur 2022: 10 titik kerusakan pipa SPAM; hidran puncak 172 unit (18 Des 2022); PDAM 10 mobil tangki × 5 rit per hari. Sumber: Buku Satgas Penanganan Gempa Lombok (Kementerian PUPR, 2019) dan Buku Penanganan Gempa Cianjur 2022 (Kementerian PUPR, 2023), via riset D [10][12] (dibaca utuh oleh riset, tidak dibuka ulang sesi ini); kunci `rehab.pipa.lombok.*`, `rehab.pipa.cianjur.*`; kunci KERANGKA `rehab.pipa.lombok.spam_rusak`. Label: resmi. Kerusakan air Flores 2026 tidak disebut di kedua rilis BNPB yang dibuka.
8. Durasi pulih gempa: Lombok, 170.559 dari 226.204 rumah sasaran selesai (75,40%) per Maret 2020, sekitar 19 bulan; realisasi R3P 94,73% per 11 Sep 2023 (Kemenko PMK; kunci ada `rehab.pulih.lombok2018.*` bab-04, `kemenkopmk.lombok2018.realisasi_persen`). Perbaikan SPAM reguler, Pamsimas, dan swadaya Lombok selesai akhir 2018 (riset D [10]). Cianjur: rehab lima SPAM sekitar 98% per September 2023, sekitar 10 bulan (riset D [12]). Label: resmi.

**B. Tsunami (Kartu 8.3)**

9. Lantai rumah dan akses tsunami: Aceh–Nias 2004, 139.195 rumah hancur atau rusak berat; 2.618 km jalan rusak; BRR membangun 140.304 rumah dan 3.696 km jalan dalam masa kerja 4 tahun. Sumber: BRR, *The Scattered Beads* (2009), hlm. x dan xiii (`program-terbukti/bukti_dampak.csv` B049, B054, B055; dibuka langsung 23 Okt 2026); kunci `rehab.lantai.tsunami.aceh2004.rumah_rusak_brr`, `rehab.lantai.tsunami.aceh2004.jalan_rusak_km`, `rehab.lantai.tsunami.aceh2004.jalan_dibangun_km`; `rehab.lantai.tsunami.aceh2004.rumah_brr` (bab-04). Label: resmi (T14, laporan pelaksana sendiri).
10. Pengungsi tsunami: 635.384 orang kehilangan tempat tinggal, Aceh dan Nias tidak terpilah (BRR, *Nias: Membangun Melalui Jalan yang Jarang Dilalui*, Tabel 1.1, menurut riset E §E4; belum dibuka ulang; kunci usulan `brr.aceh2004.kehilangan_tempat_tinggal` di `naskah/mitigasi/bukti/bab-11.md`). Label: resmi; definisi "kehilangan tempat tinggal", bukan pengungsi tercatat DIBI.
11. Lantai tsunami di DIBI: Selat Sunda 22 Des 2018, 1.583 RB, 2.752 rumah rusak, 42.325 mengungsi, 437 meninggal; jembatan tsunami DIBI 0 di semua tahun. Sumber: `dibi/kejadian_besar.csv` [kode=selatsunda2018]; `dibi/rekap_nasional_tahunan.csv` [kategori=Tsunami]; kunci `rehab.lantai.tsunami.selatsunda2018.*`. Label: resmi. Tsunami Palu 2018 dan Mentawai 2010 tercatat dengan kategori gabungan (Bab 4 PK1 butir 5).
12. Layanan air tsunami: MDF Aceh–Nias melaporkan hampir 8.000 sumur dibangun (MDF Progress Report Desember 2011, riset E [4]); salinitas air tanah Aceh Barat turun dari lebih dari 10 ke kurang dari 2 mS/cm dalam dua tahun pada curah hujan lebih dari 3.000 mm/tahun (Marohn dkk. 2012, NHESS 12: 2879–2891, riset C [26], dibaca langsung oleh riset). Kunci `rehab.lantai.tsunami.aceh2004.sumur_mdf`; kunci KERANGKA `rehab.akuifer.aceh_barat_waktu_pulih_salinitas`. Label: terverifikasi.
13. Durasi pulih tsunami: Rencana Induk RR Aceh–Nias berlaku 4 tahun (Perpres 30/2005, riset E [3]); masa kerja BRR 4 tahun (B047). Label: resmi.

**C. Likuefaksi (Kartu 8.4)**

14. Lantai rumah likuefaksi tidak terpisah: Sulawesi Tengah 2018 (gempa, tsunami, likuefaksi), 34.166 RB, 28.899 RS, 47.149 RR, 110.214 rumah rusak, 212.719 mengungsi, 4.140 meninggal, 705 hilang. Kota Palu 55.102, Sigi 28.152, Donggala 21.378 rumah rusak. Sumber: `dibi/kejadian_besar.csv` [kode=sulteng2018]; `skenario-hidromet/dibi_geologi_kab_tahun.csv` [jenis=gempa_tsunami, tahun=2018]; kunci ada `dibi.sulteng2018.rumah_rusak`, `dibi.sulteng2018.mengungsi`; `rehab.lantai.likuefaksi.sulteng2018.rumah_rb`. Label: resmi.
15. Akses likuefaksi: DIBI Sulawesi Tengah 2018 kategori Gempabumi 7 jembatan (`dibi/rekap_provinsi_tahunan.csv`), resmi. Jembatan Palu IV runtuh 28 Sep 2018, dibangun ulang 250 m dengan jalan pesisir sekitar 5 km, dibuka 13 Feb 2026 (Oriental Consultants Global, 19 Feb 2026; terverifikasi; Bab 4 PK3 butir 15).
16. Air likuefaksi: Kementerian ESDM mengoperasikan 17 unit pengolah air di 15 lokasi mulai 17 Okt 2018 (19 hari setelah gempa) untuk 22.241 jiwa (riset D [17], resmi; kunci `rehab.akuifer.sulteng2018.ipa_esdm_jiwa`); kebutuhan 25 sumur Badan Geologi dan 8 titik diserahkan Februari 2019 (riset C [18][19], resmi). Angka "SPAM Pasigala rusak sekitar 90%" hanya dari media (riset D [16]), **sekunder**, lampiran saja.
17. Durasi pulih likuefaksi: huntap Sulawesi Tengah 5.598 ditetapkan, 382 belum selesai per 15 Juni 2024 (Kemenko PMK; kunci `rehab.pelajaran.sulteng.huntap_sisa_jun2024`, bab-04). Label: resmi.

**D. Banjir dan banjir bandang (Kartu 8.5)**

18. Lantai rumah banjir: Sumatra 15 Nov–31 Des 2025 (banjir dan longsor; Aceh, Sumut, Sumbar), 62.956 RB, 53.530 RS, 111.520 RR, 228.006 rumah rusak, 970.876 mengungsi, 55 kab terdampak. Sumber: `dibi/kejadian_besar.csv` [kode=sumatra2025]; kunci ada `dibi.sumatra2025.*`, `rehab.lantai.banjir.sumatra2025.rumah_rusak` (bab-04). Label: resmi. **Versi lain dalam repo:** jendela sama dengan semua jenis musim hujan 63.019 RB (kunci ada `hidromet.sumatra2025.rumah_rusak_berat`); BNPB sekitar 147.000 rumah rusak dan Kementerian PKP 189.308 terdampak (Info Singkat DPR, Bab 4).
19. Pengungsi banjir: DIBI menjumlah per laporan (Aceh 946.889), sedangkan Buletin Info Bencana BNPB Desember 2025 menulis stok Aceh 356.655 per 31 Des 2025 (kunci ada `dibi.sumatra2025.mengungsi_aceh_buletin`). Label: resmi keduanya; 970.876 adalah batas atas pengungsi serentak.
20. Lantai jembatan banjir: banjir 2025 nasional 1.021 jembatan; provinsi-tahun terberat Aceh 2025 kategori Banjir 479 (semua jenis 480); tiga provinsi Sumatra 2025 744. **Berdampingan:** Kementerian PU 1.181 jembatan daerah terdampak per 7 Mei 2026; Bina Marga 14 jembatan nasional putus di Aceh per 1 Des 2025. Sumber: `dibi/rekap_*_tahunan.csv`; pustaka `pu-2026-pemulihan-sumatera-mei`, `binamarga-2025-jembatan-aceh`; kunci `rehab.dibi.jembatan_rusak.banjir.2025`, `rehab.dibi.jembatan_rusak.banjir.prov_tahun_maks`, `rehab.pulih.sumatra2025.jembatan_daerah_terdampak` (bab-04). Label: resmi.
21. Layanan air banjir: 176 SPAM terdampak per 2 Feb 2026 (Aceh 71, Sumut 45, Sumbar 60), 143 berfungsi, 537 sarana darurat, 128 sumur bor dibangun atau dalam proses; 178 SPAM dan sekitar 95,5% berfungsi per 7 Mei 2026. Sumber: Kementerian PU ePPID 5 Feb dan 11 Mei 2026; kunci `rehab.pipa.sumatra2025.*`. Label: resmi. Sumur TNI dan Polri Sumatra (Polri realisasi 249 dari target 569; Kodam Iskandar Muda 121) hanya dari media (riset C [42][43]), **sekunder**.
22. Durasi pulih banjir: jalan dan jembatan nasional 100%, SPAM sekitar 95,5%, jalan daerah sekitar 94%, jembatan daerah sekitar 67% per 7 Mei 2026 (sekitar lima setengah bulan); perbaikan permanen SPAM ditargetkan Agustus 2028 (riset D [21][23]). Label: resmi (target 2028 dari rilis PU dan keterangan Menteri PU di DPR via media; status label di registri KERANGKA resmi).

**E. Tanah longsor (Kartu 8.6)**

23. Lantai rumah longsor tidak punya kejadian tunggal besar di paket. Kab-tahun terberat: Kab. Pacitan 2017, 4.700 rumah rusak, 15 meninggal; Kab. Bima 2011, 4.266; Kab. Cianjur 2024, 3.820 dengan 4.634 mengungsi. Tahun nasional terberat: RB 2.992 (2017); rumah rusak 8.582 dan mengungsi 17.484 (2025); jembatan 61 (2020); provinsi-tahun jembatan terberat Jawa Tengah 2020 (28). Sumber: `skenario-hidromet/dibi_kab_tahun.csv` [jenis=longsor]; `dibi/rekap_*_tahunan.csv` [kategori=Longsor]; kunci `rehab.lantai.longsor.pacitan2017.rumah_rusak`, `rehab.dibi.rumah_rb.longsor.tahun_maks`, `rehab.dibi.mengungsi.longsor.tahun_maks`, `rehab.dibi.jembatan_rusak.longsor.*`. Label: resmi. Batas: DIBI 2024 longsor tidak lengkap (README `skenario-hidromet`); kategori "Banjir dan Tanah Longsor" terpisah sejak 2018.
24. Air dan durasi longsor: tidak ada data di paket maupun riset. Label: resmi (ketiadaan data).

**F. Erupsi gunung api (Kartu 8.7)**

25. Lantai rumah erupsi: Kelud 13–14 Feb 2014, 12.404 RB (Kediri 8.622, Malang 3.782), RR 5.426, 87.629 mengungsi (Blitar, Jombang, Kediri, Malang, Kota Batu), 7 meninggal; sama dengan rekap nasional erupsi 2014 (12.404 RB, 17.833 rumah rusak). Sumber: `riset/mentah/dibi_geologi.json` baris Erupsi Gunung Api 2014; `dibi/rekap_nasional_tahunan.csv` [tahun=2014, kategori=Erupsi gunung api]; kunci `rehab.lantai.erupsi.kelud2014.*`. Label: resmi. **Membantah:** KERANGKA tabel kartu 8.7 menulis lantai Merapi 2010 2.465 RB (kunci bab-04 `rehab.lantai.erupsi.merapi2010.rumah_rb` tetap benar sebagai angka Merapi, tetapi bukan lantai jenis).
26. Lantai pengungsi erupsi: Merapi 2010, 447.982 mengungsi (jendela 26 Okt–31 Des 2010), 386 meninggal; nasional erupsi 2010 506.794 termasuk Sinabung. Lewotobi 2024: 2.384 RB, 12.658 mengungsi. Sumber: `dibi/kejadian_besar.csv` [kode=merapi2010, lewotobi2024]; kunci ada `dibi.merapi2010.mengungsi`. Label: resmi.
27. Lantai jembatan erupsi: Sumatera Barat 2024 (erupsi Marapi, Mei 2024) 31 jembatan; Jawa Timur 2018–2025 18. Sumber: `dibi/rekap_provinsi_tahunan.csv` [kategori=Erupsi gunung api]; kunci `rehab.dibi.jembatan_rusak.erupsi.prov_tahun_maks`. Label: resmi. Batas teknis bailey: Gladak Perak (Semeru 2021) bentang 192 m dinilai tidak memungkinkan untuk bailey (Kemenko PMK 6 Des 2021, riset B [37], resmi).
28. Air erupsi: tidak dikuantifikasi; tidak ada sumber yang ditemukan.

**G. Cuaca ekstrem (Kartu 8.8)**

29. Lantai cuaca ekstrem: kab-tahun terberat Kab. Bandung 2019, 4.745 rumah rusak, 6.743 mengungsi; tahun nasional terberat rumah rusak 33.820 dan mengungsi 10.680 (2019), RB 6.039 (2012); jembatan provinsi-tahun terberat Jawa Tengah 2025 (11), nasional 2025 12. Sumber: `skenario-hidromet/dibi_kab_tahun.csv` [jenis=cuaca_ekstrem]; `dibi/rekap_*_tahunan.csv`; kunci `rehab.lantai.cuaca_ekstrem.bandung2019.rumah_rusak`, `rehab.dibi.rumah_rusak.cuaca_ekstrem.tahun_maks`, `rehab.dibi.rumah_rb.cuaca_ekstrem.tahun_maks`, `rehab.dibi.mengungsi.cuaca_ekstrem.tahun_maks`, `rehab.dibi.jembatan_rusak.cuaca_ekstrem.prov_tahun_maks`. Label: resmi. Patahan kategori 2018–2023 (Puting Beliung, Angin Kencang) diredam penggabungan paket, tidak ditutup untuk 2024.

**H. Aturan waktu dan standar yang mengikat semua kartu**

30. R3P disusun paling lama 90 hari (Perban BNPB 5/2017 Pasal 2) dan berlaku paling lama 3 tahun (Pasal 10). Sumber: korpus `data/raw/hukum/teks/perban-nomor-5-tahun-2017.json`, dicek Bab 4; kunci ada `perban2017_5.r3p_hari_maks`, `perban2017_5.r3p_masa_tahun`. Label: resmi.
31. Bantuan air bersih 7 liter pada tiga hari pertama, selanjutnya 15 liter per orang per hari; jarak terjauh ke titik air 500 meter. Sumber: Perka BNPB 7/2008, dicek sesi ini ke korpus `data/raw/hukum/teks/perka-nomor-7-tahun-2008.json` ("Bantuan air bersih diberikan sejumlah 7 liter pada tiga hari pertama, selanjutnya 15 liter per orang per hari"); kunci ada `perka_2008.air_bersih_awal_liter_hari`, `perka_2008.air_bersih_liter_hari`. Label: resmi (R4).
32. Waktu pulih pembanding air: Kobe 1995 90% dalam 38 hari dan 100% dalam 81 hari; Tohoku 2011 90% dalam 36 hari (JSCE, riset D [36]; kunci `rehab.pipa.pulih.kobe_90`, `tohoku_90`, bab-04). Label: terverifikasi.

### Inferensi (analisis tim, bukan fakta bersumber)

- **Tabel kartu yang diusulkan (isi empat besaran, berdampingan, menggantikan tabel KERANGKA):**

  | Kartu | Rumah (lantai; label) | Jembatan/akses (lantai; label) | Layanan air (lantai; label) | Durasi pulih acuan | Kepekaan wajib |
  |---|---|---|---|---|---|
  | 8.2 Gempa | Padang 2009: 119.005 RB, 271.540 rusak (resmi); Flores 2026: 131.331 rusak DIBI, 53.971 BNPB 22 Agu, RB terverifikasi 2.382 dari separuh data (resmi, sementara) | 10 per provinsi-tahun 2018–2025 (Maluku 2019); NTT 2026: 36 (sementara); 52 nasional 2018–2025 (resmi) | Lombok: 37 titik SPAM (resmi); Cianjur: 10 titik (resmi) | SPAM Lombok sekitar 5 bulan; rumah Lombok 75% dalam 19 bulan; R3P Lombok 94,73% setelah 5 tahun (resmi) | DIBI lawan R3P (Cianjur 57.337 lawan 114.315); empat versi Flores; magnitudo megathrust Jawa 8,5 lawan Mmaks 9,1 (paket `skenario-geologi`, estimasi-model, belum layak kutip) |
  | 8.3 Tsunami | Aceh–Nias 2004: 139.195 hancur atau RB (resmi, BRR); DIBI Selat Sunda 2018: 1.583 RB | Aceh 2004: 2.618 km jalan rusak (resmi, BRR); jembatan tidak tercatat (DIBI 0) | hampir 8.000 sumur dibangun ulang (terverifikasi, MDF); salinitas pulih sekitar 2 tahun (terverifikasi) | 4 tahun Rencana Induk dan BRR (resmi) | dengan dan tanpa Aceh 2004; tsunami Flores 2026 169 cm (USGS) tercatat sebagai bagian gempa |
  | 8.4 Likuefaksi | Sulteng 2018 gabungan: 34.166 RB, 110.214 rusak (resmi) | Palu IV runtuh, pengganti 250 m dibuka setelah 7 tahun 4 bulan (terverifikasi); 7 jembatan DIBI provinsi | IPA ESDM untuk 22.241 jiwa, mulai hari ke-19 (resmi); Pasigala 90% (sekunder, lampiran) | huntap tersisa 382 dari 5.598 setelah 5 tahun 8 bulan (resmi) | porsi likuefaksi tidak terpisah; tidak dikuantifikasi terpisah |
  | 8.5 Banjir | Sumatra 2025: 62.956 RB, 228.006 rusak (resmi) | PU 1.181 jembatan daerah terdampak dan DIBI 744 tiga provinsi, berdampingan; lantai akses 1.181 (resmi) | 178 SPAM terdampak (resmi) | SPAM 95,5% dan jembatan daerah 67% dalam 5,5 bulan; permanen SPAM Agustus 2028 (resmi) | rumah: DIBI lawan BNPB lawan PKP; pengungsi: DIBI 946.889 lawan Buletin 356.655 (Aceh) |
  | 8.6 Longsor | kab-tahun Pacitan 2017: 4.700 rusak; tahun nasional 8.582 rusak (2025) (resmi) | 61 jembatan (2020), 28 per provinsi-tahun (resmi) | tidak dikuantifikasi | tidak dikuantifikasi | porsi longsor dalam rangkaian Sumatra 2025; lubang DIBI 2024 |
  | 8.7 Erupsi | **Kelud 2014: 12.404 RB** (resmi); Merapi 2010: 2.465 RB | Sumbar 2024: 31 jembatan (resmi); batas bailey bentang panjang (Gladak Perak) | tidak dikuantifikasi; mata air dan pipa gravitasi lereng sebagai risiko kualitatif | tidak dikuantifikasi | relokasi KRB III (kualitatif); pengungsi Merapi 447.982 lawan Kelud 87.629 |
  | 8.8 Cuaca ekstrem | tahun nasional 33.820 rusak (2019); kab-tahun Bandung 2019: 4.745 (resmi) | 11 per provinsi-tahun (Jateng 2025) (resmi) | tidak berlaku | lapis darurat saja | patahan kategori 2018 dan 2024 |

- **Satuan tidak seragam.** Lima kartu (gempa, tsunami, likuefaksi, banjir, erupsi untuk rumah) memakai satu kejadian; longsor dan cuaca ekstrem memakai kab-tahun atau tahun nasional, yang merupakan batas atas satu kejadian. Catatan kartu wajib menyebut ini agar pembaca tidak membandingkan sel secara langsung.
- **Jembatan adalah besaran banjir.** Di semua jenis selain banjir, lantai jembatan per provinsi-tahun berada di 10–36. Hanya banjir yang menghasilkan ratusan jembatan dalam satu provinsi dan satu musim. Kesiapan bailey nasional (R-RR-06) karena itu harus dihitung dari kartu 8.5 dan kartu agregat 8.9, sedangkan kartu geologi menentukan kebutuhan bentang panjang dan kapasitas beban (Palu IV, Gladak Perak), bukan jumlah.
- **Flores 2026 memaksa kartu gempa memuat lantai akses baru.** 36 jembatan dalam satu provinsi-tahun gempa menggeser lantai yang selama 2018–2025 hanya 10. Karena angkanya sementara dan versi rumah BNPB turun tajam setelah verifikasi, kartu menulis keduanya dengan pil "sementara" dan tidak memilih satu; ini juga contoh langsung kebutuhan R-RR-01 (kolom jembatan per status jalan dan per kejadian di DIBI).
- **Durasi pulih adalah besaran yang paling konsisten antarjenis.** Untuk setiap jenis yang punya data, lapis darurat air pulih dalam hari sampai minggu (Palu hari ke-19; Cianjur hidran puncak hari ke-27), layanan sementara dalam bulan, dan aset permanen (huntap, jembatan bentang panjang, SPAM permanen) dalam 3–7 tahun. Kartu sebaiknya menulis durasi per lapis, bukan satu angka, sesuai prinsip 3.
- **Skenario model tidak dipakai sebagai angka kartu.** Paket `skenario-geologi` menyatakan skenario dasarnya di bawah Mmaks dan korban tsunaminya belum layak kutip; rumah model = jiwa/3,9, bukan data bangunan. Bila penulis ingin menampilkan RB model megathrust Jawa M9,1 (pita 120.000–6,2 juta, tengah 900.000; estimasi-model), ia hanya boleh di baris kepekaan, disandingkan dengan lantai Padang 2009 (resmi), dan tidak boleh lebih kecil dari lantai.

### Celah

- Jembatan per kejadian dan per status jalan tidak ada di DIBI; lantai jembatan memakai provinsi-tahun, yang dapat menggabungkan lebih dari satu kejadian. Disajikan dengan catatan "provinsi-tahun, bukan kejadian"; permintaan data ke Pusdatinkom (turunan per kab, KERANGKA §10 celah 2).
- Kerusakan air untuk longsor, erupsi, dan cuaca ekstrem tidak ditemukan di sumber mana pun; sel ditulis "tidak dikuantifikasi", bukan nol.
- Kerusakan air dan jembatan per kab Flores 2026 tidak ada di rilis BNPB yang dibuka; Buletin Info Bencana Agustus 2026 (https://www.bnpb.go.id/storage/app/media/Buletin%20Info%20Bencana/2026%20Buletin%20Info%20Bencana/Buletin%20Info%20Bencana%20Agustus%202026.pdf) ditemukan lewat pencarian tetapi tidak dibuka sesi ini; wajib dibuka sebelum kartu 8.2 dikunci.
- R3P Lombok, Sulawesi Tengah, dan Sumatra (Aceh, Sumut, Sumbar) dengan angka air dan jembatan terpisah tidak diperoleh (KERANGKA §10 celah 5); R3P Aceh diketahui ditandatangani 30 Des 2025 (`kemenkopmk-2026-r3p-aceh`) tetapi isinya tidak dibuka.
- Durasi sampai akses darurat terbuka per kejadian (hari) tidak ditemukan untuk satu kejadian pun di sumber resmi; tidak diperkirakan.
- Jumlah jembatan rusak Aceh 2004 tidak ditemukan di buku BRR yang tercatat di repo; sel jembatan kartu 8.3 menulis panjang jalan saja.

---

## Pertanyaan kunci 2. Di provinsi dan kab/kota mana beban itu jatuh?

### Inti

Beban per jenis jatuh di geografi yang berbeda dan hanya sebagian tumpang tindih: jembatan rusak karena banjir terpusat di Aceh, Sumatera Barat, Sulawesi Selatan, dan Kalimantan Barat (36 provinsi mencatatnya); rumah rusak berat karena gempa terpusat di NTB, Sulawesi Tengah, dan Jawa Barat, ditambah NTT pada 2026; longsor dan cuaca ekstrem berulang setiap tahun di Jawa Barat dan Jawa Tengah. Di tingkat kab/kota, kab yang menanggung beban berulang (19 kab dengan rumah rusak longsor dan 51 kab dengan rumah rusak cuaca ekstrem di setiap tahun 2015–2025; Kab. Sukabumi dengan rumah rusak gempa di 13 tahun berbeda) berbeda dari kab penanggung beban puncak (Kota Padang, Kab. Lombok Barat, Kota Palu, Kab. Aceh Utara, Kab. Nagekeo).

### Temuan bersumber

1. RB 2015–2025 per jenis, provinsi teratas: banjir Aceh 54.925, Sumatera Utara 7.697, NTT 6.892; gempa NTB 76.106, Sulawesi Tengah 34.385, Jawa Barat 16.712, Maluku 6.421; longsor Jawa Barat 4.829, Jawa Timur 2.268, Jawa Tengah 2.233, Papua Pegunungan 1.187; cuaca ekstrem Jawa Barat 3.922, Jawa Tengah 2.863, Sumatera Utara 2.691; erupsi NTT 2.384, Jawa Timur 1.081; tsunami Banten 983, Lampung 600. Sumber: `dibi/rekap_provinsi_tahunan.csv`, Σ `rumah_rusak_berat` per `kategori_dibi`, 2015–2025. Label: resmi (olahan).
2. Jembatan rusak 2018–2025 per jenis, provinsi teratas: banjir Aceh 616, Sumatera Barat 480, Sulawesi Selatan 268, Kalimantan Barat 189 (36 provinsi mencatat); longsor Jawa Barat 61, Jawa Tengah 60 (29 provinsi); cuaca ekstrem Jawa Tengah 13 (13 provinsi); erupsi Sumatera Barat 31, Jawa Timur 18 (3 provinsi); gempa Maluku 11, Maluku Utara 8, Papua 8, Sulawesi Tengah 7 (10 provinsi). Sumber: sama, kolom `jembatan_rusak`. Label: resmi (olahan). Total semua jenis per provinsi ada di Bab 4 PK2.
3. Kab/kota penanggung beban puncak geologi (rumah rusak, 2008–2026): gempa Kota Padang 116.503, Kab. Padang Pariaman 87.895, Kab. Cianjur 74.991, Kab. Lombok Barat 72.222, Kab. Bandung 52.547, Kab. Nagekeo 51.332 (2026, sementara); gempa-tsunami Kota Palu 55.102, Sigi 28.152, Donggala 21.378; gunung api Kab. Kediri 14.048, Kab. Malang 3.782, Kab. Flores Timur 2.384, Kab. Sleman 2.346; tsunami Kab. Lampung Selatan 1.560, Kab. Pandeglang 1.012, Kab. Kepulauan Mentawai 721. 226 kab/kota mencatat rumah rusak gempa. Sumber: `skenario-hidromet/dibi_geologi_kab_tahun.csv`, Σ `rumah_rusak` per kab per jenis. Label: resmi (olahan).
4. Kab/kota dengan rumah rusak gempa di banyak tahun berbeda 2008–2026: Kab. Sukabumi 13 tahun, Kab. Bogor 11, Kab. Garut 8, Kab. Cianjur, Kab. Bandung, Kab. Tasikmalaya, Kab. Jember masing-masing 7. Sumber: sama, hitungan tahun dengan `rumah_rusak > 0` untuk jenis gempa dan gempa_tsunami. Label: resmi (olahan).
5. Longsor 2015–2025 (rumah rusak): Kab. Pacitan 4.906 (10 tahun), Kab. Cianjur 4.396, Kab. Sukabumi 4.255, Kab. Bogor 2.551, Kab. Kuningan 1.389 (masing-masing 11 tahun); 339 kab mencatat, 19 kab di setiap tahun. Cuaca ekstrem 2015–2025: Kab. Bogor 12.588, Kab. Bandung 7.885, Kab. Sidoarjo 5.739, Kab. Bojonegoro 4.615 (semua 11 tahun); 461 kab mencatat, 51 kab di setiap tahun. Sumber: `skenario-hidromet/dibi_kab_tahun.csv` [jenis=longsor, cuaca_ekstrem; 2015–2025]. Label: resmi (olahan). Batas: berkas memuat rumah rusak total, bukan RB.
6. Banjir (RB 2008–2026 per kab): Kab. Aceh Tamiang 16.194, Kab. Aceh Utara 13.622, Kab. Aceh Timur 5.080, Kab. Belu 4.170, Kab. Gayo Lues 4.123, Kab. Bireuen 3.902; rumah rusak kab-tahun terbesar Kab. Aceh Utara 2025, 91.286 dengan 304.631 mengungsi. Sumber: `skenario-hidromet/dibi_kab.csv` kolom `rb`; `dibi_kab_tahun.csv`. Label: resmi.
7. Gempa Flores 2026 per kab (DIBI, rumah rusak): Nagekeo 51.332, Manggarai 23.034, Manggarai Timur 22.731, Ngada 11.103, Manggarai Barat 9.742, Ende 9.100, Sikka 4.264. **Berdampingan BNPB 22 Agu 2026:** Manggarai Timur 17.039, Manggarai Barat 9.402, Ngada 8.129, Manggarai 7.045, Nagekeo 4.829, Ende 3.953, Sikka 3.574; data awal verifikasi Nagekeo 15.929 (BNPB 7 Sep 2026). Sumber: `riset/mentah/dibi_geologi.json`; pustaka `bnpb-2026-flores-hari8`, `bnpb-2026-flores-verifikasi`. Label: resmi, sementara. Urutan kab berbeda antarversi (Nagekeo terbesar di DIBI, kelima di BNPB 22 Agu).
8. IRBI 2025 per bahaya berbentuk skor bilangan bulat per kab tanpa kelas resmi per bahaya; kelas resmi hanya untuk total (Tinggi 169, Sedang 345 kab). Sumber: `irbi/README.md`; `irbi/irbi_kab_2025.csv`. Label: resmi. Akibatnya syarat (a) daftar perhatian RR ("kelas nilai teratas nasional") memerlukan ambang buatan kajian (asumsi-kebijakan, Bab 3).

### Inferensi (analisis tim, bukan fakta bersumber)

- Peta 8.2 (G20) sebaiknya berpanel per besaran, bukan per jenis: panel jembatan (didominasi banjir) dan panel rumah RB (didominasi gempa) memberi dua geografi yang berbeda; panel ketiga "beban berulang" (kab dengan kerusakan di hampir setiap tahun) menangkap Jawa bagian barat yang tidak muncul di dua panel puncak.
- Jawa Barat bagian selatan (Sukabumi, Cianjur, Garut, Tasikmalaya, Bogor, Bandung) adalah satu-satunya kawasan yang muncul di daftar berulang untuk tiga jenis sekaligus (gempa, longsor, cuaca ekstrem). Ini calon daftar perhatian RR yang kuat pada syarat frekuensi, walau jembatan per kab belum terhitung.
- Aceh tetap calon terkuat uji coba paket air dan akses (R-RR-14): pemegang lantai banjir untuk rumah, jembatan, dan air sekaligus.
- NTT perlu ditambahkan ke daftar provinsi beban gempa setelah 2026; sebelum itu NTT muncul hanya untuk banjir (Seroja 2021), cuaca ekstrem, dan erupsi (Lewotobi 2024).

### Celah

- Jembatan rusak per kab/kota tidak ada di paket; sebaran jembatan hanya sampai provinsi (Q17). Peta kab menunggu turunan DIBI.
- RB per kab untuk hidrometeorologi per tahun tidak ada (berkas tahunan memuat rumah rusak total); kuartil RB per kab (syarat c) belum dihitung.
- Ambang "kelas teratas" IRBI per bahaya belum ditetapkan; tidak diganti perkiraan di bab ini.
- Kab layanan air terdampak (SPAM per kab) hanya tersedia per provinsi untuk Sumatra 2025 (Aceh 71, Sumut 45, Sumbar 60); permintaan data ke Kementerian PU.

---

## Pertanyaan kunci 3. Apa kebutuhan lapis darurat (bailey, sumur, kit pipa, truk) per skenario?

### Inti

Dengan standar Perka BNPB 7/2008 dan rasio satuan yang tercatat, lantai banjir (970.876 pengungsi tercatat Sumatra 2025) setara sekitar 14.563 m³ air bersih per hari setelah hari ketiga, atau sekitar 729 truk tangki 4.000 liter yang masing-masing lima rit sehari, atau sekitar 486 sumur setara sumur Badan Geologi, ditambah sekitar 3.884 keran; kartu agregat musim hujan 2025/2026 sedikit di atasnya (15.656 m³ per hari). Semua angka ini asumsi-kebijakan, bukan kebutuhan terukur, dan respons yang benar-benar tercatat di Sumatra (537 sarana darurat PU, 128 sumur bor PU, ditambah sumur TNI dan Polri) sudah berada di orde yang sama. Kebutuhan bailey tidak dapat dihitung dari data yang ada karena DIBI tidak membedakan jembatan putus dari rusak dan tidak mencatat bentang.

### Temuan bersumber

1. Standar yang dipakai: air bersih 7 liter per orang per hari tiga hari pertama lalu 15 liter (Perka BNPB 7/2008, resmi, dicek ke korpus); 250 orang per keran (Sphere 2018, terverifikasi; riset C [24], D [35]); sumur Badan Geologi tipikal sekitar 125 m, debit 1–2,4 l/detik, sekitar 2.000 jiwa per sumur (Kementerian ESDM 27 Jun 2019, riset C [15], resmi); mobil tangki 4.000 liter (Buku Satgas Lombok, resmi); 5 rit per truk per hari (Buku Cianjur 2023, resmi). Kunci `rehab.darurat.asumsi.*`.
2. Respons tercatat sebagai pembanding hasil hitung: Lombok 2018 (406.202 mengungsi): 83 sumur bor, 307 hidran, 28 truk, 26 IPA; Cianjur 2022 (115.382 mengungsi): hidran puncak 172, 10 truk PDAM, 19 sumur Badan Geologi (riset C [21]); Sulawesi Tengah 2018: 17 IPA ESDM untuk 22.241 jiwa, kebutuhan 25 sumur Badan Geologi; Sumatra 2025: 537 sarana darurat dan 128 sumur bor PU per 2 Feb 2026. Sumber: riset D [10][12][17][21], C [19][21]; kunci `rehab.pipa.lombok.*`, `rehab.pipa.cianjur.*`, `rehab.akuifer.sulteng2018.ipa_esdm_jiwa`, `rehab.pipa.sumatra2025.*`. Label: resmi.
3. Bailey dan akses darurat tercatat: Sumatra 2025, 14 jembatan nasional putus di Aceh per 1 Des 2025 (Bina Marga, resmi); "puluhan" bailey fungsional per 18 Jan 2026 di sembilan kab Aceh (PU, riset B [30], resmi); BNPB mengganti bailey yang dipakai darurat 2 unit (2024) dan 5 unit (2025) di luar Sumatra, diadakan dari DSP sebagai barang hibah, dibayar setelah audit BPKP (BNPB 31 Des 2025, riset B [33], resmi); Satgas Pembangunan Jembatan TNI AD: 798 titik di wilayah bencana per 13 Agu 2026 (Setneg, riset B [1], resmi). Komposisi jenis jembatan Satgas (bailey 112 target) hanya media, **sekunder**.
4. Stok bailey nasional, stok IPA mobile Depo Cipta Karya Bekasi, dan daftar kit pipa bergerak tidak ditemukan (riset B §5, D §2 Celah). Label: resmi (ketiadaan data).
5. Kit pipa bergerak SIPPA: kajian terpisah, pilot Oktober 2026, belum ada klaim terbukti; dirujuk satu kotak tanpa angka biaya (R1; riset D §7). Label: asumsi-kebijakan.

### Inferensi (analisis tim; semua angka asumsi-kebijakan, kunci `rehab.darurat.<jenis>.*`)

- **Tabel 8.2 usulan (kebutuhan lapis darurat air per kartu).** Basis = jiwa lantai; air = basis × 7 liter (hari 1–3) dan × 15 liter (sesudahnya); truk = air hari ke-4 ÷ 20 m³; keran = basis ÷ 250; sumur setara = basis ÷ 2.000. Truk dan sumur adalah **alternatif, tidak dijumlah**.

  | Kartu | Basis jiwa (sumber; label) | Air hari 1–3 (m³/hari) | Air sesudahnya (m³/hari) | Truk setara | Keran | Sumur setara | Respons tercatat (pembanding) |
  |---|---|---|---|---|---|---|---|
  | 8.2 Gempa | 464.120 Padang 2009 (RB+RS)×3,9 (asumsi-kebijakan); pengungsi tercatat terbesar 406.202 Lombok (resmi) | 3.249 | 6.962 | 349 | 1.857 | 233 | Lombok: 83 sumur, 28 truk, 307 hidran, 26 IPA |
  | 8.3 Tsunami | 635.384 kehilangan tempat tinggal Aceh–Nias 2004 (resmi, BRR; definisi beda) | 4.448 | 9.531 | 477 | 2.542 | 318 | hampir 8.000 sumur dibangun ulang dalam masa RR (MDF), bukan lapis darurat |
  | 8.4 Likuefaksi | 245.954 Sulteng (RB+RS)×3,9; tercatat 212.719 (resmi) | 1.722 | 3.689 | 185 | 984 | 123 | 17 IPA ESDM (22.241 jiwa); kebutuhan 25 sumur BG |
  | 8.5 Banjir | 970.876 Sumatra 2025 DIBI, jumlah per laporan (resmi; batas atas) | 6.796 | 14.563 | 729 | 3.884 | 486 | 537 sarana darurat dan 128 sumur bor PU; sumur TNI dan Polri sekunder |
  | 8.6 Longsor | 17.484 mengungsi longsor 2025, setahun nasional (resmi; batas atas) | 122 | 262 | 14 | 70 | 9 | tidak tercatat |
  | 8.7 Erupsi | 447.982 Merapi 2010 (resmi) | 3.136 | 6.720 | 336 | 1.792 | 224 | tidak tercatat di sumber yang dibuka |
  | 8.8 Cuaca ekstrem | 10.680 mengungsi 2019, setahun nasional (resmi) | 75 | 160 | 8 | 43 | 6 | tidak tercatat |
  | 8.9 Musim 2025/2026 | 1.043.740 mengungsi musim (resmi) | 7.306 | 15.656 | 783 | 4.175 | 522 | idem kartu 8.5 untuk Sumatra |

- **Hitungan lebih ringan dari respons tercatat untuk sumur di Sumatra.** Sumur PU saja 128, dan media menyebut ratusan sumur TNI dan Polri; kebutuhan 486 sumur setara hanya untuk pengungsi tercatat. Karena pengguna sumur darurat bukan hanya pengungsi (pelanggan PDAM yang terputus juga beralih ke sumur; Lombok Utara pengguna sumur naik 36,10%, riset C [41], terverifikasi), angka hitungan adalah batas bawah untuk kebutuhan air permukiman, dan batas atas untuk kebutuhan pengungsi serentak (karena DIBI menjumlah pengungsi per laporan). Kartu menulis dua catatan itu berdampingan.
- **Sumur bukan jawaban di semua kartu.** Kartu 8.3 (salinisasi pascatsunami pulih sekitar dua tahun) dan kartu banjir di pesisir utara Jawa (penurunan muka tanah; Q10) memerlukan baris "sumur hanya dengan rekomendasi Badan Geologi"; kartu 8.4 memerlukan larangan menaikkan muka air tanah di zona merah likuefaksi (riset C §5). Untuk kartu ini kolom truk dan IPA lebih relevan.
- **Bailey: kebutuhan ditulis sebagai rentang kualitatif per kartu, bukan angka.** Dari data yang ada, satu-satunya rasio yang bisa disusun adalah 14 jembatan nasional putus terhadap 480 jembatan rusak DIBI di Aceh 2025 (sekitar 3%), tetapi definisi dan status jalan berbeda sehingga rasio ini tidak boleh dipakai sebagai koefisien. Usulan penyajian: kartu 8.5 dan 8.9 menulis "lantai 1.181 jembatan daerah terdampak; jumlah yang membutuhkan bailey tidak tercatat"; kartu 8.2, 8.4, 8.7 menulis kebutuhan bentang panjang dan beban (Palu IV 250 m; Gladak Perak 192 m di luar kemampuan bailey). Ini menjadi dasar R-RR-06 (hitung stok bailey) dan R-RR-05 (standar hari).
- **Kit pipa bergerak** cocok mengisi celah transmisi sementara antara sumber yang selamat dan hidran di kartu dengan pengungsian terpusat (8.2, 8.5, 8.7), sehingga mengurangi kebutuhan truk; tidak dihitung karena SIPPA belum punya hasil pilot (R1).

### Celah

- Stok dan lokasi bailey, IPA mobile, truk tangki, dan kit pipa per Direktorat PD Wilayah tidak ditemukan; kartu 8.9 tidak dapat dibandingkan dengan stok. Permintaan data ke Kementerian PU (Bina Marga, Cipta Karya), TNI, dan Deputi Bidang Logistik dan Peralatan BNPB (keputusan 14 hari butir 2).
- Hari sampai sumur darurat berfungsi, tingkat sumur kering, dan uji mutu air sumur darurat tidak tercatat sistematis (riset C §2, §3); kolom sumur dibaca sebagai setara kapasitas, bukan janji layanan.
- Biaya per unit sumur, truk, dan bailey berlabel estimasi-model ada di Bab 6–7 dan tidak dijumlah ke kartu (P5).

---

## Kartu agregat 8.9 dan matriks 8.11 (bahan pertanyaan kunci 1 dan 3)

### Temuan bersumber

1. Musim hujan terberat tercatat nasional 2025/2026 (1 Okt 2025–30 Apr 2026; banjir, bandang, longsor, banjir_longsor, cuaca ekstrem): 65.929 RB, 57.141 RS, 131.235 RR, 1.043.740 mengungsi, 1.506 meninggal, 186 hilang; ONI NDJ −0,60, bukan episode La Niña. Musim La Niña analog 2020/2021: 13.675 RB, 508.914 mengungsi. Sumber: `skenario-hidromet/kartu_skenario.csv` [skenario=musim_hujan_terberat_tercatat dan musim_hujan_lanina, wilayah=nasional]; kunci `rehab.musim.2025_26.*`, `rehab.musim.lanina_2020_21.*`; kunci ada `hidromet.nasional.terberat.*`. Label: resmi (angka DIBI); pemilihan analog asumsi-kebijakan.
2. Peluang paling sedikit satu musim seburuk lantai dalam lima musim: 23,7% (1 − (18/19)^5; pita 4 NRR). Kunci ada `hidromet.nasional.lantai.peluang_5_musim`. Label: asumsi-kebijakan.
3. Peluang lima tahun megathrust Jawa (turunan Poisson dari periode ulang PuSGeN 2024 Tabel 6.2): Mw 9,1 gabungan 0,83% (pita 2); Mw 8,9 per segmen 1,24% (pita 3). Kunci ada `geologi.jawa_gabungan.peluang_5th`, `geologi.jawa_segmen.peluang_5th`. Label: asumsi-kebijakan (turunan, bukan angka PuSGeN).
4. Jenis tanpa dasar peluang yang dipasangkan dengan skenario dampaknya: gempa sesar darat, tsunami selain megathrust Jawa, likuefaksi, gunung api, longsor, cuaca ekstrem. Sumber: `naskah/mitigasi/bukti/bab-05.md` T4.18 dan I4.1. Label: asumsi-kebijakan (keputusan kajian saudara).

### Inferensi

- **Kartu 8.9** memakai musim 2025/2026 sebagai lantai kesiapan RR musim 2026/2027 dan menulis 2020/2021 sebagai musim La Niña pembanding yang jauh lebih ringan (RB seperlima). Kepekaan ENSO hanya sebagai baris, karena lantai terjadi pada musim yang tidak ditandai La Niña.
- **Gambar 8.1 (G17)** sebaiknya mengambil posisi kemungkinan dari Kajian 2 Bab 5 tanpa mengubahnya, dan hanya mengganti sumbu dampak ke dampak RR. Usulan kelas dampak RR (asumsi-kebijakan, belum dikunci di Bab 3): kelas 5 bila lantai rumah rusak ≥ 100.000; kelas 4 untuk 10.000–99.999; kelas 3 untuk 1.000–9.999. Hasil: gempa 5, tsunami 5, likuefaksi 5 (gabungan), banjir 5; erupsi 4 (Kelud 2014, 17.833 rumah rusak tahun itu); longsor ≤ 4 dan cuaca ekstrem ≤ 4 (dari jumlah setahun, batas atas). Di matriks: banjir (kartu musim, pita 4) dan megathrust Jawa (pita 2 dan 3); lainnya di panel "dampak dinilai, kemungkinan tidak dinilai". Titik megathrust Jawa memakai lantai Pangandaran 2006 menurut Kajian 2, bukan Padang 2009 (slab); catatan gambar wajib menyebut perbedaan itu. Kemungkinan dan dampak tidak dikalikan menjadi skor.
- **Tabel 8.1 (G16)** ketersediaan kuantifikasi: rumah terkuantifikasi untuk 7 dari 7 jenis (dua dengan satuan setahun); jembatan 6 dari 7 (tsunami tidak); air 3 dari 7 (gempa, tsunami, banjir) ditambah likuefaksi sebagian (IPA ESDM); durasi pulih 4 dari 7 (gempa, tsunami, likuefaksi, banjir).

### Celah

- Ambang kelas dampak RR belum dikunci di Bab 3; semua kelas di atas harus dihitung ulang bila Bab 3 menetapkan ambang lain.
- Jembatan rusak musim hujan (Oktober–April) tidak dapat dihitung dari rekap tahunan; kartu 8.9 memakai jembatan tahun 2025 (1.088, semua jenis) dengan catatan periode berbeda.

---

## Komponen

| Kode | Komponen | Isi | Sumber data | Kode G / B5 | Catatan penulis |
|---|---|---|---|---|---|
| Kartu 8.2–8.8 | Satu kartu per jenis (NASKAH-SPEK §11.4) | Ancaman; skenario; lantai (kejadian, tahun, label); empat besaran; lapis darurat; kepekaan; matriks mini | tabel kartu PK1 Inferensi; Tabel 8.2 | B5.6 | Angka versi lain berdampingan; Flores 2026 berpil "sementara"; Kelud 2014 lantai erupsi |
| Kartu 8.9 | Agregat musim hujan 2026/2027 | Lantai musim 2025/2026 dan pembanding La Niña 2020/2021; kebutuhan air darurat; jembatan 2025 | `skenario-hidromet/kartu_skenario.csv`; `dibi/rekap_nasional_tahunan.csv` | B5.6 | Peluang 23,7% berpil asumsi-kebijakan |
| Tabel 8.1 | Matriks ketersediaan kuantifikasi jenis × besaran RR | 7 jenis × 4 besaran; sel: angka, "sementara", "setahun", atau "tidak dikuantifikasi" | PK1 Temuan A–G | G16 | Tanpa nol untuk sel kosong |
| Gambar 8.1 | Matriks kemungkinan × dampak RR | Kelas dampak RR 1–5 × pita kemungkinan NRR; panel jenis tanpa dasar peluang | `naskah/mitigasi/bukti/bab-05.md` I4.1; kunci `hidromet.nasional.lantai.peluang_5_musim`, `geologi.jawa_*` | G17, B5.27 | Posisi, bukan peringkat; angka di samping kelas |
| Gambar 8.2 | Peta kecil berganda per provinsi | Panel jembatan rusak 2018–2025 (bulatan), panel RB 2015–2025, panel beban berulang | `dibi/rekap_provinsi_tahunan.csv` | G20 (L33, L34) | NTT 2026 sebagai sisipan bertanda sementara |
| Tabel 8.2 | Kebutuhan lapis darurat per kartu | Air, truk setara, keran, sumur setara, respons tercatat | `bab-08.angka.json` kunci `rehab.darurat.*`; riset D, C | B5.7 | Pil asumsi-kebijakan; truk dan sumur alternatif |
| Kotak 8.1 (usulan) | Perbandingan dengan sumber lain | Flores 2026 empat versi; Sumatra rumah dan pengungsi; Cianjur DIBI lawan R3P | PK1 butir 3, 6, 18, 19 | L22 | Angka sekunder hanya lampiran |
| Tabel 8.3 (usulan) | Kab/kota beban puncak dan beban berulang per jenis | Daftar PK2 butir 3–7 | `skenario-hidromet/dibi_*_kab*.csv`; `riset/mentah/dibi_geologi.json` | B5.7 | Bukan daftar perhatian RR; penanda frekuensi |

## Angka untuk registri

Ditulis lengkap di `naskah/rehab/bukti/bab-08.angka.json` (97 kunci; `data/angka.json` tidak disunting). Kunci yang dipakai ulang: `dibi.padang2009.rumah_rb`, `dibi.lombok2018.mengungsi`, `dibi.lombok2018.rumah_rusak`, `dibi.sulteng2018.rumah_rusak`, `dibi.sulteng2018.mengungsi`, `dibi.merapi2010.mengungsi`, `dibi.sumatra2025.*`, `dibi.sumatra2025.mengungsi_aceh_buletin`, `dibi.ntt2026.gempa.*`, `usgs.flores2026.*`, `hidromet.sumatra2025.rumah_rusak_berat`, `hidromet.nasional.terberat.*`, `hidromet.nasional.lantai.peluang_5_musim`, `geologi.jawa_gabungan.peluang_5th`, `geologi.jawa_segmen.peluang_5th`, `r3p.cianjur2022.rumah_rusak`, `perban2017_5.r3p_hari_maks`, `perban2017_5.r3p_masa_tahun`, `perka_2008.air_bersih_awal_liter_hari`, `perka_2008.air_bersih_liter_hari`, serta kunci `rehab.*` dari `bab-04.angka.json`.

| Kunci | Nilai | Berkas + jalur / pustaka | Label | Sumber |
|---|---|---|---|---|
| rehab.lantai.gempa.padang2009.jiwa_kehilangan_hunian | 464.120 | `dibi/kejadian_besar.csv` olah (RB+RS)×3,9 | asumsi-kebijakan | DIBI; olah |
| rehab.lantai.gempa.lombok2018.jiwa_kehilangan_hunian | 425.533 | sama | asumsi-kebijakan | DIBI; olah |
| rehab.lantai.gempa.flores2026.rumah_rb_dibi | 29.303 | `riset/mentah/dibi_geologi.json` olah 11 kab | resmi (sementara) | DIBI |
| rehab.lantai.gempa.flores2026.rumah_rusak_dibi | 131.331 | sama | resmi (sementara) | DIBI |
| rehab.lantai.gempa.flores2026.mengungsi_dibi | 171.287 | sama | resmi (sementara) | DIBI |
| rehab.lantai.gempa.flores2026.meninggal_dibi | 151 | sama | resmi (sementara) | DIBI |
| rehab.lantai.gempa.flores2026.jiwa_kehilangan_hunian | 248.676 | sama, (RB+RS)×3,9 | asumsi-kebijakan | DIBI; olah |
| rehab.lantai.gempa.flores2026.rumah_rusak_bnpb_2026_08_22 | 53.971 | `bnpb-2026-flores-hari8` | resmi | BNPB |
| rehab.lantai.gempa.flores2026.rumah_rb_bnpb_2026_08_22 | 19.006 | sama | resmi | BNPB |
| rehab.lantai.gempa.flores2026.rumah_data_awal | 102.384 | `bnpb-2026-flores-verifikasi` | resmi | BNPB |
| rehab.lantai.gempa.flores2026.rumah_terverifikasi | 51.591 | sama | resmi | BNPB |
| rehab.lantai.gempa.flores2026.rumah_rb_terverifikasi | 2.382 | sama | resmi | BNPB |
| rehab.dibi.jembatan_rusak.gempa.2026 | 38 | `dibi/rekap_nasional_tahunan.csv` olah | resmi (sementara) | DIBI |
| rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026 | 36 | `dibi/rekap_provinsi_tahunan.csv` olah | resmi (sementara) | DIBI |
| rehab.dibi.jembatan_rusak.gempa.prov_tahun_maks_2018_2025 | 10 | sama | resmi | DIBI |
| rehab.dibi.jembatan_rusak.gempa.tahun_maks_2018_2025 | 21 | `dibi/rekap_nasional_tahunan.csv` | resmi | DIBI |
| rehab.lantai.erupsi.kelud2014.rumah_rb | 12.404 | `riset/mentah/dibi_geologi.json` olah | resmi | DIBI |
| rehab.lantai.erupsi.kelud2014.mengungsi | 87.629 | sama | resmi | DIBI |
| rehab.dibi.jembatan_rusak.erupsi.prov_tahun_maks | 31 | `dibi/rekap_provinsi_tahunan.csv` | resmi | DIBI |
| rehab.dibi.jembatan_rusak.banjir.prov_tahun_maks | 479 | sama | resmi | DIBI |
| rehab.dibi.jembatan_rusak.banjir.2025 | 1.021 | `dibi/rekap_nasional_tahunan.csv` | resmi | DIBI |
| rehab.dibi.jembatan_rusak.longsor.tahun_maks | 61 | sama | resmi | DIBI |
| rehab.dibi.jembatan_rusak.longsor.prov_tahun_maks | 28 | `dibi/rekap_provinsi_tahunan.csv` | resmi | DIBI |
| rehab.dibi.rumah_rb.longsor.tahun_maks | 2.992 | `dibi/rekap_nasional_tahunan.csv` | resmi | DIBI |
| rehab.dibi.mengungsi.longsor.tahun_maks | 17.484 | sama | resmi | DIBI |
| rehab.lantai.longsor.pacitan2017.rumah_rusak | 4.700 | `skenario-hidromet/dibi_kab_tahun.csv` [nama=Kab. Pacitan,jenis=longsor,tahun=2017].rumah_rusak | resmi | DIBI |
| rehab.dibi.rumah_rusak.cuaca_ekstrem.tahun_maks | 33.820 | `dibi/rekap_nasional_tahunan.csv` | resmi | DIBI |
| rehab.dibi.rumah_rb.cuaca_ekstrem.tahun_maks | 6.039 | sama | resmi | DIBI |
| rehab.dibi.mengungsi.cuaca_ekstrem.tahun_maks | 10.680 | sama | resmi | DIBI |
| rehab.dibi.jembatan_rusak.cuaca_ekstrem.prov_tahun_maks | 11 | `dibi/rekap_provinsi_tahunan.csv` | resmi | DIBI |
| rehab.lantai.cuaca_ekstrem.bandung2019.rumah_rusak | 4.745 | `skenario-hidromet/dibi_kab_tahun.csv` [nama=Kab. Bandung,jenis=cuaca_ekstrem,tahun=2019].rumah_rusak | resmi | DIBI |
| rehab.lantai.tsunami.selatsunda2018.rumah_rb | 1.583 | `dibi/kejadian_besar.csv` [kode=selatsunda2018,metrik=rumah_rusak_berat,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.tsunami.selatsunda2018.mengungsi | 42.325 | [kode=selatsunda2018,metrik=mengungsi,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.tsunami.aceh2004.rumah_rusak_brr | 139.195 | `brr-2009-scattered-beads` hlm. x | resmi | BRR |
| rehab.lantai.tsunami.aceh2004.jalan_rusak_km | 2.618 | sama, hlm. xiii | resmi | BRR |
| rehab.lantai.tsunami.aceh2004.jalan_dibangun_km | 3.696 | sama | resmi | BRR |
| rehab.lantai.tsunami.aceh2004.sumur_mdf | 8.000 | `mdf-2011-progress` | terverifikasi | MDF |
| rehab.lantai.likuefaksi.sulteng2018.rumah_rb | 34.166 | `dibi/kejadian_besar.csv` [kode=sulteng2018,metrik=rumah_rusak_berat,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.likuefaksi.sulteng2018.jiwa_kehilangan_hunian | 245.954 | olah (RB+RS)×3,9 | asumsi-kebijakan | DIBI; olah |
| rehab.musim.2025_26.rumah_rb / rumah_rs / rumah_rr / mengungsi | 65.929 / 57.141 / 131.235 / 1.043.740 | `skenario-hidromet/kartu_skenario.csv` [skenario=musim_hujan_terberat_tercatat,wilayah=nasional,metrik=…].nilai | resmi | DIBI |
| rehab.musim.lanina_2020_21.rumah_rb / mengungsi | 13.675 / 508.914 | [skenario=musim_hujan_lanina,wilayah=nasional,metrik=…].nilai | resmi | DIBI |
| rehab.pipa.lombok.sumur_bor_darurat / hidran_2000l / truk_tangki / ipa_darurat | 83 / 242 / 28 / 26 | `pupr-2019-satgas-lombok` | resmi | Kementerian PUPR |
| rehab.pipa.cianjur.titik_spam_rusak / hidran_puncak | 10 / 172 | `pupr-2023-cianjur` | resmi | Kementerian PUPR |
| rehab.pipa.sumatra2025.sarana_darurat / sumur_bor_pu | 537 / 128 | `pu-2026-spam-februari` | resmi | Kementerian PU |
| rehab.akuifer.sulteng2018.ipa_esdm_jiwa | 22.241 | `esdm-2018-air-sulteng` | resmi | Kementerian ESDM |
| rehab.darurat.asumsi.truk_m3_hari | 20 | `pupr-2019-satgas-lombok`, `pupr-2023-cianjur` | asumsi-kebijakan | olah |
| rehab.darurat.asumsi.orang_per_keran | 250 | `sphere-2018` | terverifikasi | Sphere |
| rehab.darurat.asumsi.jiwa_per_sumur | 2.000 | `esdm-2019-sumur-bor` | resmi | Kementerian ESDM |
| rehab.darurat.{gempa,tsunami,likuefaksi,banjir,longsor,erupsi,cuaca_ekstrem,musim}.{air_m3_hari_awal,air_m3_hari,truk_setara,keran,sumur_setara} | lihat Tabel 8.2 usulan (40 kunci) | `bnpb-2008-kebutuhan-dasar`, `sphere-2018`, `esdm-2019-sumur-bor` | asumsi-kebijakan | olah |

## Pustaka

CSL-JSON di `naskah/rehab/bukti/bab-08.pustaka.json`, 25 entri: `bnpb-dibi`, `bnpb-2008-kebutuhan-dasar`, `bnpb-2017-r3p`, `brr-2009-scattered-beads`, `brr-2009-nias`, `kemenkopmk-2020-lombok-percepatan`, `kemenkopmk-2024-huntap-sulteng`, `pu-2026-spam-februari`, `pu-2026-pemulihan-sumatera-mei`, `binamarga-2025-jembatan-aceh`, `ocg-2026-palu4`, `jsce-2011-nojima`, `pusgen-2024-peta-gempa`, `usgs-us6000tkt2` (disalin apa adanya dari `pustaka.json` utama, `bab-04.pustaka.json`, atau `naskah/mitigasi/bukti/bab-11.pustaka.json`), dan 11 entri baru: `bnpb-2026-flores-hari8`, `bnpb-2026-flores-verifikasi`, `bmkg-2026-flores` (ketiganya dibuka sesi ini 25 Okt 2026), `pupr-2019-satgas-lombok`, `pupr-2023-cianjur`, `esdm-2019-sumur-bor`, `esdm-2018-air-sulteng`, `sphere-2018`, `mdf-2011-progress`, `marohn-2012-aceh-barat`, `setneg-2026-jembatan-air` (dari riset rehab B, C, D, E; tidak dibuka ulang, dicatat di `note`). Sumber sekunder untuk lampiran rekonsiliasi saja (tidak dimasukkan ke berkas pustaka bab ini): Bisnis.com 15 Okt 2018 (Pasigala 90%), Republika 4 Jan 2026 dan Katadata 2 Jan 2026 (sumur Polri dan Kodam), Investortrust 9 Mar 2026 dan Detik 29 Jul 2026 (jenis jembatan Satgas), Metro TV dan Investortrust 22–23 Agu 2026 (Flores, menyalin rilis BNPB).
