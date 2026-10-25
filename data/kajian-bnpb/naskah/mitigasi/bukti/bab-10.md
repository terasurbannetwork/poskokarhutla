# Berkas bukti BAB 10 ANALISIS KESENJANGAN SISTEM PENANGGULANGAN BENCANA

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9). Penulis bab menulis hanya dari berkas ini
dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-10.angka.json`: 32 kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/mitigasi/bukti/bab-10.pustaka.json`: entri CSL-JSON (43 sumber).

Bahan yang dibaca: `KERANGKA.md` §1 (C02–C17, M07–M10), §2, §5 (Bab 10, juga Bab 8, 9, 11, 12 untuk batas isi), §6, §7,
§8; `KEPUTUSAN.md`; Buku Pegangan L56–L64 (titik tengah dilarang, angka kunci di depan); `PEDOMAN-DESAIN.md` §C9 dan
tabel kode grafik G1–G25; `riset/A`–`E`; paket `data/lembaga/` (README, `celah.csv`, `klaster.csv`, `sumber.csv`),
`data/program-terbukti/` (README, `kompendium_program.csv`, `renstra_bnpb_2025_2029.csv`, `organisasi_bnpb.csv`),
`data/dibi/README.md`, `data/nonalam-sosial/README.md`, `data/irbi/README.md`, `data/angka.json`; berkas bukti mitigasi Bab
1–5 dan 7 serta kajian air Bab 7, 9, 10 (supaya kunci tidak berganda); korpus JDIH lokal `data/raw/hukum/teks/` (Perban
5/2025 Renstra hlm. 70–76, 126–138; Perban 1/2025 Renas hlm. 26–28, 32; Perpres 46/2026; Perban 5/2018; Kepka 327/2025;
Juklak 16/2025; Perka 3/2016; Perban 1/2023; Perban 6/2025); indeks `data/raw/hukum/indeks.json`; sumber web yang dibuka
24 Oktober 2026: IHPS II 2024 BPK (PDF 368 hlm., SHA-1 `d743fad15988...`), siaran pers BPK Perwakilan Sulawesi Utara 23
Desember 2024 (SHA-1 `f0bab44b53f4...`), Putusan MK 261/PUU-XXIII/2025 (PDF 241 hlm., SHA-1 `2987f693a99d...`), dua
halaman BPBD DIY.

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah atau lembaga negara RI (termasuk BPK dan MK), dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah RI yang dibuka (jurnal bertinjauan, evaluasi independen) |
| estimasi-model | Keluaran model yang belum diuji balik |
| asumsi-kebijakan | Pilihan penyusun (pemetaan program ke sel, rubrik kekuatan bukti, koefisien R) |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**. Kode C01–C17
merujuk baris `data/lembaga/celah.csv`; kutipan di baris itu sudah dicocokkan mesin ke teks peraturan pada halaman yang
disebut (`lembaga/README.md` §1). Kode P01–P25 merujuk `program-terbukti/kompendium_program.csv`.

---

## Kerangka bab (dari KERANGKA.md §5, BAB 10)

- **Judul:** BAB 10 ANALISIS KESENJANGAN SISTEM PENANGGULANGAN BENCANA (9 hlm).
- **Subbab:** 10.1 Regulasi; 10.2 Kelembagaan dan Komando; 10.3 Data dan Peringatan Dini; 10.4 Kapasitas BPBD dan SPM;
  10.5 Logistik; 10.6 Pembiayaan; 10.7 Rehabilitasi dan Rekonstruksi; 10.8 Kesenjangan Bukti; 10.9 Yang Sudah Berjalan dan
  Tidak Boleh Dikorbankan.
- **Tujuan bab:** menamai kesenjangan yang paling menahan, dengan bukti dan lembaga pembukanya.
- **Pertanyaan kunci:**
  1. Norma apa yang belum ada atau tidak saling terhubung?
  2. Di mana rantai komando dan klaster berubah atau usang?
  3. Mengapa cakupan peringatan dini berbeda antara Renstra dan Renas?
  4. Apa hambatan daerah?
  5. Berapa sel matriks fase × jenis tanpa program terbukti?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Perpres status dan tingkatan bencana (UU 24/2007 Pasal 7 ayat (3)) ditulis sebagai kesenjangan hanya bila tidak ditemukan di JDIH Setneg | **Naik ke resmi tiga sumber:** BPK (IHPS II 2024, Bab IV hlm. 188–189) menulis "Belum disusunnya Perpres penetapan status dan tingkatan bencana"; Mahkamah Konstitusi dalam pertimbangan Putusan 261/PUU-XXIII/2025 menyatakan amanat Pasal 7 ayat (3) "hingga saat ini belum dilakukan oleh pemerintah" (hlm. 228), dan Pemerintah mengakui Perpres itu "belum dibentuk secara tersendiri" (hlm. 190); tulisan hukum BPK Jawa Barat 3 Februari 2025. JDIH Setneg tetap tidak dapat dicari; tidak ditemukan Perpres terbit sampai 24 Oktober 2026. **Ditambah:** MK (28 Agustus 2026) memaknai ulang Pasal 7 ayat (2): status bencana nasional cukup 3 dari 5 indikator dengan jumlah korban wajib (P1 temuan 2) |
| Dua rezim status epidemi tanpa norma pengait (C09) | Dikonfirmasi (`celah.csv` C09). **Ditambah:** BPK menemukan Permenkes 75/2019 tentang penanggulangan krisis kesehatan belum dimutakhirkan dengan PP 28/2024 (IHPS hlm. 184) |
| Perban 5/2018 belum melaksanakan Perpres 46/2026 | Dikonfirmasi pada korpus: Perban 5/2018 melaksanakan Perpres 17/2018 dan tidak memuat kata "konflik"; Perpres 46/2026 (16 Juli 2026) terbit sesudah Progsun 2026 (31 Desember 2025), dan Progsun tidak memuat perubahan Perban 5/2018 |
| Inpres 3/2020 menyebut lembaga yang sudah tidak ada (C04) | Dikonfirmasi (C04; status BPK Inpres: Berlaku) |
| Unsur Pengarah dan Perban 6/2018 memakai nomenklatur lama (C12) | **Dikoreksi sebagian:** Perpres 1/2019 Pasal 13 dan Perban 6/2018 Pasal 17 ayat (2) memang memakai nama lama, tetapi Perban 6/2025 Pasal 10 ayat (2) sudah memakai nama baru (Kemenko Bidang Politik dan Keamanan, Kementerian PU). Kesenjangan tinggal di tingkat Perpres dan Perban 6/2018 |
| Klaster 8 menjadi 6 (Kepka 173 lawan 308/2024; C08) | Dikonfirmasi; teks kedua SK tetap tidak dibuka (pencarian web 24 Oktober 2026 hanya menemukan berita). **Ditambah:** BPK menemukan Pusat Krisis Kesehatan belum membentuk klaster kesehatan nasional (IHPS hlm. 185), padahal versi 308/2024 menunjuk Kementerian Kesehatan sebagai koordinator; tahun SK 173 berbeda bahkan antara dua halaman BPBD DIY (2014 dan 2015) |
| SKPDB lemah (Renas, C02) | Dikonfirmasi (Renas hlm. 27). **Ditambah:** Renstra mencatat empat kelemahan komando sendiri (kelemahan 9–12, hlm. 73); juklak SKPDB yang ada di indeks JDIH hanya untuk status kabupaten/kota (Juklak 10/2023) |
| Rantai peringatan dini lintas tiga Kemenko (C15) | Dikonfirmasi |
| Data: lubang DIBI nonalam; patahan 2024; jalur Walidata (Perban 1/2023) | Dikonfirmasi. **Ditambah:** Perban 1/2023 mendefinisikan produsen Data Bencana hanya unit kerja di lingkungan BNPB; BPK menemukan KRB dan peta risiko belum memuat seluruh ancaman (IHPS hlm. 189) |
| Peringatan dini: IKP Renstra 6,10% ke 6,32% lawan Renas 1.c 11.060 ke 52.000 per 100.000 (penyebut berbeda) | Dikonfirmasi. **Ditambah:** bila 11.060 per 100.000 dibaca sebagai persen (11,06%), angka 2025 Renas hampir dua kali IKP Renstra untuk tahun yang sama; BPK menemukan BNPB belum menyusun Rencana Induk Sistem Peringatan Dini Multi Ancaman dan merekomendasikan Perpres penguatan kelembagaan (IHPS hlm. 189–190) |
| BPBD: kapasitas kab rendah 315 dari 508; SPM; BTT dan DSP belum sinkron | Dikonfirmasi. **Ditambah:** temuan BPK atas 25 objek pemda (IHPS II 2024): RPKB dan renkon per jenis belum ada, logistik tidak berdasarkan renkon, KRB dan RPB tidak mutakhir atau tidak ditetapkan; Pemerintah Aceh dan Pemprov Sumatera Barat termasuk yang disebut |
| RR: hambatan Renstra (SDM Jitupasna dan R3P di daerah, komitmen anggaran pascabencana, ketidaksinkronan Permendagri) | Dikonfirmasi (Renstra ancaman 3, 6, 7, hlm. 75–76). **Keterbukaan R3P (diperiksa ulang, Bahan temuan 13a):** R3P Lombok dan Sulteng tidak ditemukan di sumber terbuka, dikonfirmasi; klaim R3P Cianjur "tanpa nomor penetapan" ditolak, karena berkasnya memuat Keputusan Bupati Cianjur 360/KEP.118-BAPPERIDA/2023 (hlm. PDF 7). **Ditambah:** Renas mencatat perbedaan instrumen penilaian kerusakan rumah dan belum adanya standar tipe hunian tetap (hlm. 28); Progsun 2026 butir 4 merujuk "Peraturan BNPB Nomor 5 Tahun 2024 tentang Perencanaan RR", padahal Perban 5/2024 di korpus adalah Kamus Kompetensi Teknis dan R3P diatur Perban 5/2017 |
| Bukti: dua program berbukti kuat, keduanya luar negeri; tidak ada program untuk epidemi, kebakaran industri, kebakaran TPA, konflik | Dikonfirmasi. **Ditambah hitungan sel:** 39 sel; 15 berbukti kuat atau sedang (hanya 5 dalam negeri, semuanya sedang); 4 lemah atau belum terbukti; 20 tanpa program |

- **Komponen (KERANGKA):** Kartu temuan 10.1–10.8 (B5.6); Tabel 10.1 celah kewenangan (B5.7, `lembaga/celah.csv`); Tabel 10.2
  klaster dua versi (B5.7, `lembaga/klaster.csv`); Tabel 10.3 empat angka cakupan peringatan dini (B5.7); Gambar 10.1 sel matriks
  per kategori bukti (G16); Kotak 10.1 yang tidak boleh dikorbankan (B5.5). Rincian di bagian Komponen.
- **Status data (KERANGKA):** ada; isi temuan BPK belum dibaca dan tidak diklaim. **Pembaruan:** isi temuan BPK atas
  penanggulangan bencana kini terbaca dari IHPS II 2024 (30 objek: 5 pusat, 25 pemda; ringkasan per entitas di Bab IV hlm.
  176–191). LHP per entitas tidak dibuka; yang dikutip hanya isi IHPS. Teks Kepka 173 dan 308/2024 tetap tidak terbuka.

Catatan lingkup: prinsip 17 berlaku. Bab ini tidak memuat kartu skenario, jadi aturan lantai skenario (KERANGKA §2 butir 9)
tidak dipakai di sini; satu angka kepekaan (asumsi-kebijakan) di P3 disandingkan dengan lantai tercatat DIBI. Strategi dan
rekomendasi tidak ditulis di bab ini; bagian Inferensi hanya menamai lembaga pembuka untuk kartu temuan. Ketidaksesuaian
dokumen internal BNPB ditulis sebagai butir lampiran Penyelarasan dokumen BNPB dengan suara BNPB (prinsip 1), tidak masuk
Ringkasan Eksekutif. Temuan BPK ditulis dengan atribusi "menurut IHPS II 2024 BPK", bukan sebagai temuan kajian.

---

## P1. Norma apa yang belum ada atau tidak saling terhubung?

### Inti

Norma yang diperintahkan undang-undang tetapi belum ada adalah Perpres penetapan status dan tingkatan bencana (UU 24/2007
Pasal 7 ayat (3)); ketiadaannya dinyatakan MK dalam pertimbangan putusannya, diakui Pemerintah, dan dicatat BPK, dan sejak 28 Agustus 2026 indikator Pasal 7
ayat (2) sudah dimaknai ulang MK (3 dari 5 indikator, jumlah korban wajib). BPK juga mencatat 6 peraturan pelaksana yang belum
disahkan dan 11 yang belum diinisiasi BNPB. Norma yang ada tetapi tidak saling terhubung: dua rezim status untuk epidemi (KLB
dan darurat bencana) dan untuk konflik, Perban 5/2018 yang belum melaksanakan Perpres 46/2026, sistem peringatan dini per
wilayah sungai yang tidak tersambung ke Perban 2/2024, serta Inpres 3/2020, Perpres 1/2019, dan Perban 6/2018 yang masih
menyebut lembaga lama.

### Temuan bersumber

1. **Perpres status dan tingkatan bencana belum ada (tiga sumber resmi berdampingan):**
   - IHPS II 2024 BPK, pemeriksaan kinerja BNPB: "Regulasi penyelenggaraan penanggulangan bencana belum sepenuhnya lengkap,
     selaras, dan terpadu", ditunjukkan antara lain oleh "(1) Belum disusunnya Perpres penetapan status dan tingkatan bencana;
     (2) Enam peraturan pelaksana belum disahkan oleh BNPB; dan (3) Sebelas peraturan pelaksana belum diinisiasi oleh BNPB";
     rekomendasi: Kepala BNPB mengesahkan 6 peraturan pelaksana dan menginisiasi Perpres status dan tingkatan bencana serta 11
     peraturan pelaksana lain. Sumber: BPK, IHPS II 2024, Bab IV hlm. 188–189 (https://jatim.bpk.go.id/wp-content/uploads/2025/12/ihps_ii_2024_1762309845-red-1.pdf,
     diakses 24 Oktober 2026) [`bpk-2025-ihps2-2024`]; kunci baru `bpk.ihps2_2024.bnpb.peraturan_belum_disahkan`,
     `bpk.ihps2_2024.bnpb.peraturan_belum_diinisiasi`. Label: resmi. Judul ke-6 dan ke-11 peraturan tidak disebut di IHPS.
   - Putusan MK 261/PUU-XXIII/2025: Mahkamah sendiri menulis bahwa "sejauh penelusuran Mahkamah terhadap amanat norma Pasal 7
     ayat (3) UU 24/2007 untuk mengatur lebih lanjut status dan tingkatan bencana ... hingga saat ini belum dilakukan oleh
     pemerintah", dan bahwa PP 21/2008, PP 22/2008, PP 23/2008, dan Perpres 8/2008 tidak mengatur apakah lima indikator harus
     terpenuhi kumulatif maupun cara menentukan status ([3.13.4], hlm. 227–228). Pemerintah dalam keterangannya juga menyatakan
     Perpres itu "belum dibentuk secara tersendiri" (hlm. 190). Sumber:
     https://s.mkri.id/public/content/persidangan/putusan/putusan_mkri_14870_1787908105.pdf (diunduh dan dibaca 24 Oktober
     2026) [`mk-2026-putusan261`]. Label: resmi.
   - Tulisan hukum BPK Perwakilan Jawa Barat (3 Februari 2025): Perpres amanat Pasal 7 ayat (3) "belum dibuat dan diterbitkan"
     (riset E14) [`bpk-2025-status-bencana`]. Label: resmi.
   - **Berdampingan (bukan bantahan):** Pemerintah berpendapat substansi operasional Pasal 7 ayat (3) sudah dielaborasi dalam PP
     21/2008 dan praktik penyelenggaraan (hlm. 190); Penjelasan Pasal 21 ayat (1) huruf b PP 21/2008 memasukkan penentuan
     tingkatan bencana ke penentuan status (riset E11d [`ri-2008-pp21`]). Mahkamah tetap menyatakan aturan lanjut itu belum
     dibuat (butir di atas). Penelusuran web 24 Oktober 2026 tidak menemukan Perpres terbit sesudah putusan; JDIH Setneg tidak
     dapat dicari (riset E14). Status "belum terbit" adalah hasil penelusuran.
2. **Putusan MK atas indikator status (28 Agustus 2026):** amar butir 2 menyatakan Pasal 7 ayat (2) UU 24/2007 bertentangan
   dengan UUD 1945 secara bersyarat sepanjang tidak dimaknai bahwa penetapan status dan tingkat bencana nasional "didasarkan
   pada pemenuhan sekurang-kurangnya 3 (tiga) indikator dengan menempatkan jumlah korban sebagai indikator utama yang harus
   dipenuhi" (amar, hlm. 240); permohonan atas Pasal 7 ayat (3) (Perpres diganti PP) dan Pasal 84 ditolak ([3.14]–[3.16], hlm.
   234–239). Pertimbangan [3.13.6]
   memberi rambu: status menjadi nasional bila dampak melampaui kemampuan pemerintah daerah ([3.13.6], hlm. 229). Permohonan diajukan
   dengan latar banjir akhir 2025 di Aceh dan Sumatera Utara ([3.12.1], hlm. 221); Sumatera Barat disebut di [3.12.2] (hlm. 222). Sumber:
   [`mk-2026-putusan261`]; kunci baru `uu24.pasal7.indikator`, `mk.putusan261_2025.indikator_minimal`. Label: resmi.
3. **Epidemi, dua rezim status tanpa pengait (C09):** KLB ditetapkan bupati/wali kota, gubernur, atau Menteri Kesehatan (UU
   17/2023); status darurat bencana oleh Presiden, gubernur, bupati/wali kota (Perpres 17/2018 Pasal 2); norma pengait tidak
   ditemukan; UU 6/2018 sudah dicabut UU 17/2023. Sumber: `lembaga/celah.csv` C09 [`pantaubencana-2026-paket-lembaga`,
   `ri-2023-uu17`, `ri-2018-perpres17`]. Label: resmi; ketiadaan pengait disimpulkan penyusun dari teks yang dibaca.
   **Ditambah:** BPK menemukan Menteri Kesehatan belum memutakhirkan Permenkes 75/2019 tentang Penanggulangan Krisis Kesehatan
   dengan PP 28/2024, dan merekomendasikan finalisasi rancangan Permenkes krisis kesehatan (IHPS II 2024 hlm. 184)
   [`bpk-2025-ihps2-2024`]. Label: resmi.
4. **Konflik, dua rezim (C10):** status keadaan konflik oleh kepala daerah atau Presiden (UU 7/2012 Pasal 16–20); konflik
   antarkelompok juga bencana sosial (UU 24/2007 Pasal 1 angka 4); Satgas UU 7/2012 merujuk fungsi koordinasi polhukam yang sejak
   2024 terbelah dan fungsi kesra (kini Kemenko PMK, pemetaan penyusun). Sumber: `celah.csv` C10 [`ri-2012-uu7`, `ri-2007-uu24`].
   Label: resmi; pemetaan penyusun ditandai.
5. **Perban 5/2018 belum melaksanakan Perpres 46/2026:** Perpres 46/2026 (ditetapkan dan diundangkan 16 Juli 2026, LN 2026/83)
   mengubah Pasal 3 Perpres 17/2018: keadaan tertentu kini mencakup potensi bencana "yang disebabkan oleh faktor alam, nonalam,
   dan/atau sosial" (ayat (2) huruf a) dan "pemerintah daerah yang wilayahnya dalam proses rekonsiliasi pascakonflik sosial dan
   memiliki kapasitas fiskal sangat rendah atau rendah" (huruf c); ketentuan lebih lanjut "diatur dalam pedoman yang ditetapkan
   oleh Kepala" BNPB (ayat (4)). Perban 5/2018 (27 Agustus 2018) menimbang Pasal 3 ayat (4) Perpres 17/2018 versi lama; teksnya
   tidak memuat kata "konflik", dan daftar anggota rakornya masih menyebut "Kementerian Pekerjaan Umum dan Perumahan Rakyat"
   (hlm. 6). Progsun BNPB 2026 (Kepka 327/2025, 31 Desember 2025) tidak memuat perubahan Perban 5/2018. Sumber: korpus
   `perpres-nomor-46-tahun-2026.json` hlm. 3–4 [`ri-2026-perpres46`]; `perban-nomor-5-tahun-2018.json` hlm. 1, 3, 6, 9
   [`bnpb-2018-keadaan-tertentu`]; `keputusan-kepala-nomor-327-tahun-2025.json` hlm. 2–5 [`bnpb-2025-progsun`]. Label: resmi.
6. **Lembaga yang sudah tidak ada di norma berlaku (C04, C12), berdampingan dengan yang sudah diselaraskan:**
   - Inpres 3/2020 (status BPK: Berlaku) masih ditujukan ke Menteri LHK, Kepala LAPAN, Kepala BPPT, Menteri BUMN, dan Sekretaris
     Kabinet, padahal pengendalian kebakaran hutan kini di Kemenhut, kebakaran lahan di BPLH, LAPAN dan BPPT dilebur ke BRIN, dan
     Sekretariat Kabinet dibubarkan. Sumber: `celah.csv` C04 [`ri-2020-inpres3`]. Label: resmi.
   - Perpres 1/2019 Pasal 13 (Unsur Pengarah) memuat Kemenko Polhukam dan Kementerian PUPR; Perban 6/2018 Pasal 17 ayat (2)
     membagi peran bantuan internasional ke 23 K/L dengan nama lama (KLHK, Kemenkumham, Kominfo, PUPR, LAPAN, BPPT). Sumber:
     `celah.csv` C12 [`ri-2019-perpres1`, `bnpb-2018-bantuan-internasional`]. Label: resmi.
   - **Dibantah sebagian oleh:** Perban 6/2025 Pasal 10 ayat (2) sudah menyebut pejabat dari "Kementerian Koordinator Bidang
     Politik dan Keamanan" dan "Kementerian Pekerjaan Umum" sebagai anggota Unsur Pengarah (11 instansi). Sumber: korpus
     `perban-nomor-6-tahun-2025.json` hlm. 3–4 [`bnpb-2025-otk`]; kunci lama `perban2025_6.unsur_pengarah.instansi`. Label: resmi.
7. **Peringatan dini, regulasi diakui belum memadai:** Renas mencatat "Belum optimalnya regulasi peringatan dini yang ada terutama
   untuk multi ancaman bencana" (hlm. 26; C03). BPK menemukan regulasi fungsi peringatan dini MKG di BMKG belum sepenuhnya
   ditetapkan, termasuk "kekosongan peraturan khususnya pengaturan peringatan dini banjir yang disebabkan bukan dari luapan daerah
   aliran sungai", dan merekomendasikan landasan hukum SIH3 diusulkan kepada Presiden (IHPS II 2024 hlm. 186–187). Rezim SDA
   menetapkan sistem peringatan dini pada setiap WS (PP 30/2024 Pasal 96) tanpa norma yang menyambungkannya ke Perban 2/2024
   (C17). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 26 [`bnpb-2025-renas`]; [`bpk-2025-ihps2-2024`]; `celah.csv`
   C03, C17. Label: resmi; ketiadaan sambungan C17 disimpulkan penyusun.
8. **Pengakuan BNPB sendiri:** Renstra mencatat kelemahan 1 "Masih terdapat peraturan perundang-undangan dan peraturan Internal
   BNPB yang tidak harmonis/ saling bertentangan", kelemahan 9 "Pendefinisian 'status siaga darurat' belum jelas", dan kelemahan
   13 belum optimalnya implementasi Perka BNPB tentang proses bisnis (hlm. 73); C01 mengutip National Assessment Report 2023
   bahwa ketidakjelasan regulasi dan pembagian kewenangan mengakibatkan tumpang tindih (hlm. 24). Analisis SWOT Renstra memuat
   28 kelemahan dan 11 ancaman (hlm. 73–76). Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 24, 73–76
   [`bnpb-2025-renstra`]; kunci baru `renstra.swot.kelemahan`, `renstra.swot.ancaman`. Label: resmi.
9. **Daerah dan perencanaan, norma yang belum ada (menurut BPK):** Kemendagri belum menyelesaikan perubahan Permendagri 46/2008
   tentang Pedoman OTK BPBD; belum ada NSPK pemaduan dokumen kebencanaan ke dokumen perencanaan daerah (IHPS II 2024 hlm.
   182–183) [`bpk-2025-ihps2-2024`]. Label: resmi.
10. **Analisis risiko bencana dalam perizinan:** Renas mencatat belum optimalnya penerapan persyaratan analisis risiko bencana
    untuk kegiatan investasi "yang disebabkan oleh belum optimalnya dukungan regulasi untuk persyaratan analisis risiko bencana
    dalam perizinan berusaha" (hlm. 28); Progsun 2026 butir 3 memuat rancangan Perban analisis risiko bencana pada kegiatan
    pembangunan berisiko tinggi (Direktorat Pemetaan dan Evaluasi Risiko Bencana); instrumen yang berlaku Perka 5/2008 (indeks
    JDIH: Berlaku; teks tidak di korpus) (berkas bukti air bab-09 T4.3). Sumber: [`bnpb-2025-renas`, `bnpb-2025-progsun`]. Label:
    resmi.
11. **Instrumen yang terbit sesudah Progsun dan tidak masuk Progsun 2026:** pedoman Perpres 46/2026 Pasal 3 ayat (4), perubahan
    Renas PB, perubahan Perban 2/2024, syarat manfaat-biaya Dana Bersama (berkas bukti air bab-09 T4.4). Progsun berlaku satu tahun
    (Diktum KEDUA). Kunci lama `progsun.2026.jumlah_rancangan` (11). Sumber: [`bnpb-2025-progsun`]. Label: resmi; daftar kebutuhan
    pemetaan penyusun.
12. **Tabel 10.1 bahan (celah kewenangan):** dari 17 baris `celah.csv`, 3 dinyatakan sumber (C01, C02, C03) dan 14 disimpulkan
    penyusun dari teks resmi; yang relevan bagi Kajian 2 di luar air: C01, C02, C03, C04, C08, C09, C10, C11, C12, C14, C15, C17.
    Sumber: `lembaga/celah.csv`, `lembaga/README.md` §5; kunci lama `lembaga.celah.n`. Label: resmi (bukti), disimpulkan penyusun
    (14 baris).

### Inferensi

- **[Inferensi tim]** Kesenjangan norma yang paling menahan bergeser sejak Agustus 2026: indikator status kini punya tafsir
  mengikat dari MK, tetapi tata cara, ambang tiap indikator, dan penetapan "tingkatan" yang diperintahkan Pasal 7 ayat (3) tetap
  tanpa Perpres. Jumlah korban sebagai indikator wajib membuat DIBI (meninggal dan hilang) menjadi data penentu status; ini
  mengaitkan kesenjangan regulasi dengan kesenjangan data (Bahan subbab 10.3).
- **[Inferensi tim]** Pola yang berulang adalah perubahan norma di atas yang tidak diikuti norma pelaksana di bawahnya dalam
  jendela Progsun yang sama: Perpres 46/2026 sesudah Progsun 2026; Perban 11/2025 (OTK) tanpa menyesuaikan Perban 2/2024
  (lihat P2 temuan 7); Perpres organisasi kementerian 2024–2025 tanpa menyesuaikan Inpres 3/2020, Perpres 1/2019, dan Perban
  6/2018. Penulis tidak boleh menyebutnya kelalaian; datanya hanya menunjukkan selisih waktu.
- **[Inferensi tim]** Norma yang tidak terhubung lebih banyak menyangkut nonalam dan sosial (epidemi, konflik, keadaan tertentu
  pascakonflik) daripada bencana alam, sejalan dengan P5: jenis yang normanya paling tidak terhubung juga jenis tanpa program.
- **[Inferensi tim]** Lembaga pembuka untuk Kartu temuan 10.1: Biro Hukum, Organisasi, dan Kerja Sama (Progsun 2027); Deputi
  Bidang Sistem dan Strategi; Kemenko PMK (rakor, jalur Perpres); Kementerian Kesehatan (pengait KLB); Kementerian Sekretariat
  Negara (penyesuaian Inpres 3/2020 dan Perpres 1/2019).

### Celah

- Judul 6 peraturan pelaksana yang belum disahkan dan 11 yang belum diinisiasi tidak disebut di IHPS. **Permintaan:** Inspektorat
  Utama BNPB atau BPK untuk LHP Kinerja BNPB (pemeriksaan Semester II 2024). **Penyajian:** angka 6 dan 11 dengan atribusi IHPS,
  tanpa daftar.
- JDIH Setneg tetap tidak dapat dicari (pencarian berbasis skrip). **Penyajian:** "belum ditemukan terbit per 24 Oktober 2026;
  diakui belum dibentuk oleh Pemerintah di persidangan MK dan dicatat BPK".
- Hasil Putusan MK lanjutan 94/PUU-XXIV/2026 hanya terbaca dari berita (sekunder); tidak dikutip.
- Teks Juklak 10/2023 (SKPDB kab/kota) tidak ada di korpus lokal; hanya metadata.

---

## P2. Di mana rantai komando dan klaster berubah atau usang?

### Inti

Klaster nasional berubah dari 8 (Kepka 173, tahun 2014 atau 2015 menurut sumber; daftar 8 klaster hanya dari berita instansi, label sekunder) menjadi 6 (Kepka 308/2024): klaster Sarana dan
Prasarana (Kementerian PU) dan Ekonomi (Kementan) hilang, nama koordinator pendidikan usang, dan BPK menemukan klaster kesehatan
nasional belum dibentuk Kementerian Kesehatan. Komando darurat berubah karena OTK BNPB baru (Perban 11/2025: satu direktorat
koordinasi dan tiga direktorat wilayah), sementara Renstra, Perban 2/2024, dan Perban 5/2018 masih memakai unit atau nama lama.
BNPB sendiri mencatat fase tanggap darurat belum terkoordinasi baik, peran unit per fase darurat belum terdefinisi, status siaga
darurat belum jelas, TRC PB multisektor tanpa aturan, dan koordinasi multisektor SKPDB kurang optimal.

### Temuan bersumber

1. **Tabel 10.2 bahan, klaster dua versi:**

   | No | Kepka 173 (2014/2015), 8 klaster | Koordinator menurut sumber | Kepka 308/2024, 6 klaster | Koordinator menurut sumber |
   | --- | --- | --- | --- | --- |
   | 1 | Kesehatan | Kapus Penanggulangan Krisis Kesehatan, Kemenkes | Pencarian dan Pertolongan | Basarnas |
   | 2 | Pencarian dan Penyelamatan | Direktur Operasi dan Pelatihan, Basarnas | Pengungsian dan Perlindungan | Kementerian Sosial |
   | 3 | Logistik | Direktur Logistik, BNPB | Logistik | BNPB |
   | 4 | Pengungsian dan Perlindungan | Direktur PSKBA, Kemensos | Kesehatan | Kementerian Kesehatan |
   | 5 | Pendidikan | Karo Perencanaan dan KLN, Kemendikbud | Pendidikan | "Kementerian Pendidikan dan Kebudayaan" |
   | 6 | Sarana dan Prasarana | Sekretaris Ditjen Cipta Karya, Kementerian PU | – | – |
   | 7 | Ekonomi | Sekretaris Ditjen Hortikultura, Kementan | – | – |
   | 8 | Pemulihan Dini | Direktur Pencegahan dan PB, Kemendagri | Pemulihan | Kementerian Dalam Negeri |

   Sumber: `lembaga/klaster.csv` (versi 173 dari berita BPBD DIY 8 Juli 2019, berita instansi, sekunder terhadap SK; versi
   308/2024 dari Juklak BNPB 16/2025 hlm. 1) [`pantaubencana-2026-paket-lembaga`, `bpbddiy-2019-klaster`, `bnpb-2025-juklak16`];
   kunci baru `lembaga.klaster.kepka308`. Label: resmi untuk versi 308/2024 (lewat dokumen BNPB); sekunder (berita instansi) untuk
   versi 173, karena teks SK tidak dibuka; jumlah 8 klaster versi 173 tidak dimasukkan ke registri dan hanya dipakai sebagai pembanding. "Kementerian Pendidikan dan Kebudayaan" tidak ada di daftar Perpres 90/2025 (C08).
2. **Tahun SK 173 bertentangan, ditulis berdampingan:** BPBD DIY (8 Juli 2019) menulis "Nomor 173 Tahun 2015"; BPBD DIY (29 Maret
   2023) menulis "Keputusan Kepala BNPB Nomor 173 Tahun 2014 yang mengatur tentang Klaster Nasional Penanggulangan Bencana";
   suarapemerintah.id (5 Juli 2024) mengutip Direktur BNPB "Nomor 173 Tahun 2014" (sekunder). Sumber: `klaster.csv` kolom
   `catatan`; https://bpbd.jogjaprov.go.id/berita/pentingnya-klaster-pengungsian-dan-perlindungan-dalam-penanggulangan-bencana
   (diakses 24 Oktober 2026) [`bpbddiy-2023-klaster`]. Label: sekunder (berita instansi). Apakah 308/2024
   mencabut 173 tidak tertulis di sumber yang dibuka.
3. **Judul SK 308/2024 berbeda di satu dokumen:** Juklak 16/2025 (ditetapkan 18 Desember 2025) menulis "Surat Keputusan Nomor 308
   Tahun 2024 tentang Klaster Penanggulangan Bencana" (hlm. 1, 32) dan "Keputusan Kepala Badan Nasional Penanggulangan Bencana
   Nomor 308 Tahun 2024 tentang Klaster Nasional Penanggulangan Bencana" (hlm. 19); integrasi layanan klaster ke Pos Komando
   Tanggap Darurat dan Pos Pendamping "sesuai dengan" SK 308/2024 (hlm. 37). Juklak yang sama menyebut "Peraturan Badan Nasional
   Penanggulangan Bencana Nomor 3 tahun 2016 tentang Sistem Komando" (hlm. 32), padahal 3/2016 adalah Peraturan Kepala. Sumber:
   korpus `juklak-nomor-16-tahun-2025.json` [`bnpb-2025-juklak16`]. Label: resmi. Penyajian: lampiran Penyelarasan dokumen BNPB.
4. **Klaster kesehatan menurut BPK, berdampingan dengan SK 308/2024:** "Puskriskes belum membentuk klaster kesehatan nasional" dan
   belum optimal mengadvokasi pembentukan klaster kesehatan provinsi dan kab/kota; BPK merekomendasikan konsep Keputusan Menteri
   Kesehatan tentang Klaster Kesehatan Nasional. Advokasi renkon sektor kesehatan baru di 3 dinkes provinsi, dan advokasi faskes
   aman bencana di 1 provinsi (Jawa Barat) pada 2023–2024. Sumber: IHPS II 2024 Bab IV hlm. 185–186 [`bpk-2025-ihps2-2024`];
   kunci baru `bpk.ihps2_2024.kemenkes.renkon_kesehatan_dinkes_prov`. Label: resmi. **Berdampingan dengan:** Kepka 308/2024
   menunjuk Kementerian Kesehatan sebagai koordinator klaster kesehatan (temuan 1). Urutan waktu pemeriksaan (TA 2023 sampai
   2024) terhadap tanggal SK 308/2024 tidak diketahui; keduanya ditulis tanpa menyimpulkan yang mana yang kini berlaku.
5. **SKPDB dan TRC menurut BNPB sendiri:** Renas mencatat "belum adanya peraturan perundangan dan petunjuk pelaksanaan bagaimana
   operasional dan pembentukan Tim Reaksi Cepat Penanggulangan Bencana (TRC PB) multisektor" dan "kurang optimalnya koordinasi
   multisektor dalam penerapan Sistem Komando Penanganan Kedaruratan Bencana (SKPDB) pada saat darurat bencana" (hlm. 26–27; C02).
   Yang berlaku untuk TRC adalah Perka BNPB 9/2008 tentang Protap TRC BNPB (17 Desember 2008; indeks JDIH: Berlaku), khusus
   BNPB. Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 26–27 [`bnpb-2025-renas`]; `data/raw/hukum/indeks.json`
   [`bnpb-2008-protap-trc`]. Label: resmi.
6. **Kelemahan komando yang dicatat Renstra (hlm. 73):** kelemahan 9 definisi status siaga darurat belum jelas; 10 "Peran
   pusat-pusat dan unit-unit lainnya dalam setiap fase darurat belum terdefinisikan dengan baik"; 11 "Peran BNPB sebagai faktor
   pendukung di daerah belum jelas"; 12 "Fase tanggap darurat masih belum terkoordinasi dengan baik oleh BNPB"; kelemahan 26
   kepemimpinan BNPB belum optimal di tingkat nasional, provinsi, kab/kota (hlm. 75). Sumber: korpus
   `perban-nomor-5-tahun-2025.json` hlm. 73, 75 [`bnpb-2025-renstra`]. Label: resmi.
7. **OTK berubah, dokumen ikutan belum:** Perban 11/2025 (30 Desember 2025) mengubah Deputi Bidang Penanganan Darurat menjadi satu
   direktorat koordinasi dan tiga direktorat wilayah, dan mengganti Pusat Pengendalian Operasi dengan Pusat Pembinaan Jabatan
   Fungsional Kebencanaan; 38 provinsi terbagi habis ke tiga Direktorat Penanganan Darurat Wilayah. Renstra 2025–2029 masih memakai
   unit OTK lama untuk Deputi Penanganan Darurat dan Deputi RR (indikator aktivasi posko 15% ke 35% dipegang "Pusat Pengendalian
   Operasi"); Perban 2/2024 Pasal 12, 14, 19 menyebut Pusat Pengendalian Operasi dan Direktorat Fasilitasi Penanganan Korban dan
   Pengungsi; Perban 11/2025 tidak ikut mengubah Pasal 104 dan 106 Perban 6/2025. Sumber: `program-terbukti/README.md` §4 butir
   4–5, `organisasi_bnpb.csv`, `renstra_bnpb_2025_2029.csv` [`pantaubencana-2026-program-terbukti`, `bnpb-2025-otk-ubah`];
   berkas bukti air bab-07 P2 temuan 5; kunci lama `renstra.ikk_posko_status.2025`, `.2029`. Label: resmi.
8. **Juklak SKPDB hanya untuk kab/kota di indeks JDIH:** Perka BNPB 3/2016 tentang SKPDB (15 November 2016) mendefinisikan klaster
   dan menempatkan "bidang/klaster" di struktur komando (hlm. 6, 12); juklak pelaksanaannya di indeks JDIH hanya Juklak 10/2023
   "pada Status Keadaan Darurat Bencana Kabupaten/Kota" (29 Desember 2023). Juklak untuk status provinsi atau nasional tidak
   ditemukan di indeks. Sumber: korpus `perka-nomor-3-tahun-2016.json` [`bnpb-2016-skpdb`]; indeks JDIH [`bnpb-2023-juklak-skpdb`].
   Label: resmi; ketiadaan juklak tingkat lain disimpulkan dari indeks lokal (233 dokumen), bukan dari JDIH daring.
9. **Rantai peringatan dini dan pertolongan lintas tiga Kemenko (C15):** BMKG bertanggung jawab kepada Presiden melalui menteri
   bidang transportasi dan Basarnas dikoordinasikan menteri perhubungan (Kemenko IPK); Kementerian PU (banjir, bendungan) di bawah
   Kemenko IPK; BNPB dikoordinasikan kementerian koordinator pembidang PB (Perpres 1/2019 hlm. 4), kini Kemenko PMK menurut pemetaan
   penyusun; Badan Geologi (ESDM) di bawah Kemenko Perekonomian. Sumber: `celah.csv` C15. Label: campuran, resmi untuk kutipan
   peraturan dan pemetaan penyusun untuk nama Kemenko BNPB (celah.csv C15 berjenis "disimpulkan dari teks resmi"). Keadaan tertentu kini butuh rakor yang dikoordinasikan menko pembidang PB (Perpres 46/2026 Pasal 3 ayat (1));
   pemetaan ke Kemenko PMK lewat Perpres 1/2019 Pasal 6 adalah pemetaan penyusun (`lembaga/README.md` §4.1).
10. **Pertolongan menurut BPK:** tingkat kesiapan sarana, prasarana, dan sistem komunikasi pencarian dan pertolongan Basarnas
    92,86% terhadap target 93,91%; Basarnas belum menyusun roadmap sarpras secara memadai, pengelolaan SDM pengawakan belum memadai,
    dan sistem informasi belum terintegrasi dengan instansi kebencanaan. Sumber: IHPS II 2024 Bab IV hlm. 182, 187–188
    [`bpk-2025-ihps2-2024`]; kunci baru `bpk.ihps2_2024.basarnas.kesiapan_sarpras_persen`, `.kesiapan_sarpras_target_persen`.
    Label: resmi.

### Inferensi

- **[Inferensi tim]** Dua klaster yang hilang (Sarana dan Prasarana, Ekonomi) adalah klaster yang paling dekat dengan transisi dari
  tanggap darurat ke pemulihan. Fungsi itu kini hanya tersisa di klaster Pemulihan (Kemendagri), sementara pemulihan prasarana
  darurat dipegang direktorat BNPB yang sudah diganti (Direktorat Dukungan Infrastruktur Darurat di Renstra). Penulis menulis ini
  sebagai potensi celah peran, bukan kegagalan yang terbukti; tidak ada data kejadian di bahan.
- **[Inferensi tim]** Rantai komando yang paling usang bukan SKPDB-nya (Perka 3/2016 masih berlaku dan memuat klaster), melainkan
  dokumen yang menempelkan unit ke rantai itu: Renstra, Perban 2/2024, dan Perban 5/2018 menyebut unit atau kementerian yang
  sudah diganti. Akibat praktisnya: penanggung jawab indikator aktivasi posko dan kelompok kerja peringatan dini tidak dapat
  dibaca langsung dari OTK berlaku.
- **[Inferensi tim]** Temuan BPK atas klaster kesehatan dan atas renkon sektor kesehatan (3 provinsi) menunjukkan bahwa klaster
  yang tercantum di SK belum tentu sudah dibentuk dan dilatih oleh koordinatornya. Ini relevan untuk epidemi (P5: tanpa program).
- **[Inferensi tim]** Lembaga pembuka untuk Kartu temuan 10.2: Deputi Bidang Penanganan Darurat (Direktorat Koordinasi
  Pengendalian Operasi Darurat), Biro Hukum, Organisasi, dan Kerja Sama (penyelarasan OTK), koordinator enam klaster (Basarnas,
  Kemensos, BNPB, Kemenkes, Kemendikdasmen, Kemendagri), Kemenko PMK.

### Celah

- Teks Kepka 173 dan Kepka 308/2024 tidak dibuka (tidak di korpus lokal; pencarian web 24 Oktober 2026 hanya menemukan berita).
  **Penyajian:** dua versi berdampingan berlabel sumber (KERANGKA §7 butir 30). **Permintaan:** Biro Hukum, Organisasi, dan Kerja
  Sama BNPB.
- Status pembentukan klaster di provinsi dan kab/kota (berapa yang sudah ber-SK kepala daerah) tidak ditemukan. **Permintaan:**
  Deputi Bidang Logistik dan Peralatan (klaster logistik), Kemenkes (klaster kesehatan).
- Evaluasi penerapan SKPDB per kejadian (misalnya Sumatra November 2025) tidak ditemukan terbuka; bab ini tidak mengklaim kegagalan
  komando pada kejadian tertentu.

---

## P3. Mengapa cakupan peringatan dini berbeda antara Renstra dan Renas?

### Inti

Karena keduanya mengukur hal berbeda dengan penyebut berbeda dan tidak satu pun mendefinisikan cara menghitung "tercakup":
Renstra (sama dengan RPJMN KP 08.04.02) memakai persentase cakupan layanan di daerah berisiko, 6,10% (2025) ke 6,32% (2029),
naik 0,22 poin; Renas 1.c memakai penduduk per 100.000 di daerah berisiko yang tercakup informasi peringatan dini lewat pemda atau
diseminasi nasional, 11.060 ke 52.000, naik 4,7 kali, dan dicantumkan sebagai target lintas K/L. Dibaca sebagai persen, angka 2025
Renas (11,06%) hampir dua kali IKP Renstra untuk tahun yang sama, sedangkan Renstra sendiri menulis keterpenuhan 6%. BPK menambah
sebab kelembagaan: Rencana Induk Sistem Peringatan Dini Multi Ancaman belum disusun.

### Temuan bersumber

1. **Tabel 10.3 bahan, empat angka cakupan (berdampingan, tidak dijejerkan sebagai satu deret):**

   | Dokumen | Indikator verbatim (ringkas) | Nilai | Satuan dan penyebut | Kunci |
   | --- | --- | --- | --- | --- |
   | Renstra hlm. 70 (isu RPJMN) | "tingkat keterpenuhan sistem peringatan dini bencana baru mencapai 6 persen dari total potensi masyarakat yang terpapar di kawasan yang berisiko tinggi" | 6% | persen masyarakat terpapar di kawasan risiko tinggi | `renstra.peringatan_dini.keterpenuhan_persen` (lama) |
   | RPJMN Lampiran III hlm. 913, KP 08.04.02 | "Persentase cakupan layanan peringatan dini di daerah berisiko bencana" | 6,00 (baseline), 6,10 (2025), 6,32 (2029) | persen | `rpjmn.peringatan_dini.baseline` (lama) |
   | Renstra hlm. 130, 132–133, IKP Program 2 | "Persentase cakupan layanan peringatan dini di daerah berisiko bencana" | N/A (baseline); 6,10% ke 6,32% | persen | `renstra.ikp_peringatan_dini.2025`, `.2029` (lama) |
   | Renas Tabel 2.8 hlm. 32, indikator 1.c | "Proporsi penduduk per 100.000 jiwa di daerah berisiko bencana yang tercakup oleh informasi peringatan dini melalui pemerintah daerah atau melalui mekanisme diseminasi nasional" | 11.060 (kolom "PROYEKSI 2025") ke 52.000 (2029) | penduduk per 100.000 di daerah berisiko | `renas.indikator_1c.2025`, `.2029` (lama) |

   Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 70, 130, 132–133 [`bnpb-2025-renstra`]; `perban-nomor-1-tahun-2025.json`
   hlm. 32 [`bnpb-2025-renas`]; riset E11b [`ri-2025-perpres12-rpjmn`]. Label: resmi.
2. **Laju lintasan:** Renas 1.c naik 4,70 kali (52.000/11.060); IKP Renstra naik 0,22 poin persen (×1,036). Sumber: kunci lama
   `renas.indikator_1c.kelipatan_2025_2029`, `renstra.ikp_peringatan_dini.kenaikan_poin_2025_2029`,
   `renstra.ikp_peringatan_dini.kelipatan_2025_2029` (air bab-10). Label: resmi (olah).
3. **Angka 2025 dibaca dalam satuan sama:** 11.060 per 100.000 setara 11,06% penduduk daerah berisiko; IKP Renstra 2025 6,10%;
   keterpenuhan Renstra hlm. 70 6%. Sumber: olah(resmi) dari temuan 1; kunci baru `renas.indikator_1c.2025_persen`. Label: resmi
   (olah). **Bertentangan dengan** IKP 6,10% bila keduanya dianggap mengukur hal yang sama; karena penyebut dan definisinya beda,
   keduanya ditulis berdampingan, tidak dinyatakan salah satu keliru.
4. **Pemilik indikator berbeda:** IKP dipegang Deputi Bidang Pencegahan (Renstra hlm. 130; `renstra_bnpb_2025_2029.csv` baris P2);
   Renas 1.c adalah indikator sasaran nasional lintas K/L (Renas Tabel 2.8). Aksi sarana diseminasi di daerah (Renas 1.1.2.a)
   dipimpin 11 K/L sektor bahaya dengan kontributor Kemendagri, tanpa BNPB (berkas bukti air bab-07 P2 temuan 6; kunci lama
   `renas.aksi_112a.*`). Label: resmi.
5. **Definisi "tercakup" tidak tertulis:** Perban 2/2024 menetapkan platform peringatan dini multiancaman dan analisis dampak, tetapi
   tidak mendefinisikan cara menghitung cakupan (berkas bukti mitigasi bab-07 P3 temuan 10 [`bnpb-2024-spdb`]); Renstra ancaman 9:
   "Adanya perbedaan interpretasi sistem peringatan dini di lingkup nasional, daerah, dan masyarakat" (hlm. 76). Label: resmi.
6. **Sebab kelembagaan menurut BPK:** penyelenggaraan sistem peringatan dini lewat Platform dan Rencana Induk MHEWS "belum didukung
   dengan kebijakan penguatan kelembagaan yang memadai, antara lain BNPB belum menyusun Rencana Induk Sistem Peringatan Dini Multi
   Ancaman Bencana"; rekomendasi: Kepala BNPB menginisiasi Perpres penguatan kelembagaan sistem peringatan dini terpadu dan menyusun
   rencana induk itu beserta Platform MHEWS menyeluruh. BMKG belum merancang strategi dan media diseminasi yang efektif dan belum
   mengklasifikasi informasi peringatan dini menurut kebutuhan pemangku kepentingan. Pemda (antara lain Sumatera Barat, Jambi,
   Indragiri Hulu, Rokan Hulu) belum optimal berkoordinasi untuk memperoleh data gejala bencana, terutama banjir dan banjir bandang.
   Sumber: IHPS II 2024 Bab IV hlm. 186–187, 189–191 [`bpk-2025-ihps2-2024`]. Label: resmi. **Berdampingan dengan:** Renstra
   kekuatan 15 "Sudah terbentuknya master plan Multi Hazard Early Warning System (MHEWS)" (hlm. 74). Master plan dan rencana induk
   sistem multiancaman mungkin dokumen berbeda; teks keduanya tidak dibuka.
7. **Hulu peringatan (berkas bukti sebelumnya):** menurut ringkasan Badan Keahlian DPR atas LHP Kinerja BPK 2022, hanya 19,68% kejadian
   banjir yang mendapat peringatan dini dari Impact Based Forecasting BMKG [`dpr-2022-deteksi-dini`]; kunci lama
   `bpk.bmkg.ibf_banjir_terperingatkan_persen`. Label: sekunder (ringkasan 4 halaman Badan Keahlian DPR; LHP Kinerja BPK 2022 atas
   BMKG tidak dibuka). Hanya pembanding, tidak masuk badan teks, sampai LHP dibuka atau pemilik KERANGKA menyetujui label khusus
   "lembaga negara mengutip LHP". Label kunci lama di registri perlu diturunkan oleh pemiliknya (lihat Koreksi).
8. **Arti selisih bagi korban (kepekaan, disandingkan dengan angka tercatat):** lantai tercatat musim hujan 2025/2026 = 1.506
   meninggal dan 186 hilang (1.692; DIBI, resmi; kunci lama `hidromet.nasional.musim_2025.hilang`). Dengan rumus yang sama dan
   koefisien WMO R = 8, lintasan Renas memberi faktor 0,603 (lantai 1.692 menjadi sekitar 1.021, turun 39,7%) dan lintasan Renstra
   0,998 (sekitar 1.689, turun 0,2%). Sumber: berkas bukti mitigasi bab-07 P3 temuan 6, 8; kunci lama
   `hidromet.nasional.lantai.pd_renas.korban_jiwa`, `hidromet.nasional.lantai.pd_renstra.korban_jiwa`,
   `hidromet.nasional.pd_renas.penurunan_persen`, `hidromet.nasional.pd_renstra.penurunan_persen` [`wmo-2022-peringatan-dini`].
   Label: asumsi-kebijakan (koefisien asosiasi lintas negara); tidak masuk tesis, Pesan Kunci, atau judul (prinsip 10).
   **Catatan kepekaan:** hitungan ini (`skenario-hidromet/kepekaan_peringatan_dini.csv`, c0 = 0,1106 untuk Renas dan c0 = 0,061
   untuk Renstra) memasukkan kedua indikator ke rumus cakupan yang sama, artinya keduanya diperlakukan sebagai pecahan cakupan
   setara. Definisi sumber tidak mendukung perlakuan itu (temuan 3, Tabel 10.3: penyebut dan definisi berbeda), jadi angka 0,603
   dan 0,998 hanya ilustrasi arah, bukan pembanding kinerja; rujuk KD-2. Koefisien R = 8 masih bersandar pada siaran pers WMO
   [`wmo-2022-peringatan-dini`]; laporan UNDRR-WMO 2022 (`undrr-wmo-2022-mhews`, berkas bukti mitigasi bab-03) belum dapat
   dibuka (lihat Celah), sehingga halaman tabelnya belum dapat dirujuk.
9. **Rancangan Perpres sistem peringatan dini:** Renstra menargetkan 1 Rancangan Perpres tentang Peringatan Dini Bencana pada 2025
   (hlm. 161); seleksi konsultan penyusunannya diumumkan BNPB 1 Juli 2024 (proyek IDRIP); Perpres itu tidak ditemukan terbit per 24
   Oktober 2026 (berkas bukti air bab-07 P2 temuan 3). Label: resmi; status "belum terbit" hasil penelusuran.

### Inferensi

- **[Inferensi tim]** Selisihnya terutama selisih definisi, bukan selisih kinerja. Redaksi Renas 1.c mengikuti pola indikator
  global (penduduk per 100.000 yang tercakup informasi peringatan dini "melalui pemerintah daerah atau melalui mekanisme
  diseminasi nasional"), sedangkan IKP Renstra mengikuti matriks kinerja RPJMN. Kemiripan dengan indikator Kerangka Sendai Target
  G belum dapat dikutip karena halaman UNDRR menolak akses (lihat Celah); penulis tidak menyebut asal indikator di badan teks.
- **[Inferensi tim]** Dua indikator yang sama-sama "resmi" tetapi berbeda arah besaran membuat capaian 2029 dapat dilaporkan
  berhasil di satu dokumen dan gagal di dokumen lain untuk kenyataan yang sama. Ini dasar KD-2 (KERANGKA §6); pilihan (b) KD-2
  ("manfaat korban yang dapat dikaitkan ke lintasan Renstra sekitar 0,2%") sejalan dengan hitungan kepekaan temuan 8
  (asumsi-kebijakan). Ini inferensi, bukan pembuktian: kepekaan itu memperlakukan kedua indikator sebagai pecahan cakupan, sesuatu
  yang tidak didukung definisi sumber (lihat catatan kepekaan temuan 8 dan KD-2).
- **[Inferensi tim]** Rekomendasi BPK (Perpres penguatan kelembagaan dan rencana induk multiancaman) dan target Renstra
  (Rancangan Perpres peringatan dini 2025) menunjuk instrumen yang sama dan belum terbit; definisi operasional "tercakup" paling
  wajar ditempatkan di instrumen itu.
- **[Inferensi tim]** Lembaga pembuka untuk Kartu temuan 10.3: Direktorat Peringatan Dini (definisi, baseline per daerah),
  Biro Perencanaan (penyelarasan Renstra dan Renas), BMKG, Kementerian PU (sistem peringatan dini per WS), Kemendagri.

### Celah

- Baseline Renas 1.c per provinsi dan kab tidak ada; cara hitung "tercakup" tidak tertulis (KERANGKA §7 butir 33).
  **Permintaan:** Direktorat Peringatan Dini. **Penyajian:** sasaran nasional saja.
- Manual indikator (definisi operasional) IKP Renstra dan KP 08.04.02 RPJMN tidak ditemukan. **Permintaan:** Biro Perencanaan BNPB,
  Kementerian PPN/Bappenas.
- Teks indikator Kerangka Sendai Target G tidak terbuka (preventionweb.net dan gar.undrr.org menolak akses 403, 24 Oktober 2026);
  kemiripan redaksi hanya tampak di ringkasan mesin pencari. **Penyajian:** tidak dikutip.
- Teks master plan MHEWS dan rencana induk peringatan dini multiancaman tidak dibuka.
- LHP Kinerja BPK 2022 atas BMKG (sumber 19,68%) tidak dibuka; angka itu sekunder sampai LHP dibuka. **Permintaan:** BPK (PPID) atau
  BMKG.
- Laporan UNDRR-WMO 2022 Global Status of MHEWS (sumber R = 8) tidak terbuka: undrr.org dan preventionweb.net menjawab HTTP 403,
  library.wmo.int hanya menyajikan halaman yang dirender skrip (dicoba 24 Oktober 2026). **Penyajian:** R = 8 tetap dirujuk ke
  siaran pers WMO dengan label asumsi-kebijakan; halaman tabel menyusul bila PDF dibuka.

---

## P4. Apa hambatan daerah?

### Inti

Kapasitas daerah diukur dengan dua alat yang hasilnya bertentangan: 62% daerah berkapasitas minimal sedang (RPJMN, 2023) dan 67%
(titik awal Renstra) lawan 37,99% kab/kota menurut kelas kapasitas KRB 2022–2026 (315 dari 508 rendah). Hambatan yang tercatat
lembaga negara: 63 daerah belum menuntaskan SPM sub-urusan bencana, 87 belum mengaktifkan KRB, 79 belum menyusun IKD 2024 (Kemenko
PMK, September 2025); BPK menemukan di pemda yang diperiksa RPKB dan renkon per jenis belum ada, logistik tidak disiapkan
berdasarkan renkon, KRB dan RPB tidak mutakhir atau tidak ditetapkan, dan kelembagaan BPBD belum sesuai ketentuan; Renas mencatat
BTT dan DSP belum sinkron. Pemerintah Aceh dan Pemprov Sumatera Barat termasuk pemda yang disebut BPK pada pemeriksaan 2024,
setahun sebelum banjir dan longsor November 2025.

### Temuan bersumber

1. **Kapasitas, dua alat ukur tiga angka (berdampingan, KD-3):** RPJMN KP 08.04.01 baseline 62% (2023), target 67% (2025) dan 90%
   (2029); Renstra IKS "dari 67% menjadi 90%" (67, 73, 79, 85, 90 untuk 2025–2029; hlm. 132); kelas kapasitas KRB 2022–2026:
   rendah 315, sedang 190, tinggi 3 dari 508 kab/kota berkelas, minimal sedang 37,99%. Sumber: riset E11b
   [`ri-2025-perpres12-rpjmn`]; `renstra_bnpb_2025_2029.csv` baris SS1 [`bnpb-2025-renstra`]; `nonalam-sosial/krb_covid19_wilayah.csv`
   [`bnpb-2026-krb`]; kunci lama `rpjmn.kp_kapasitas.baseline_2023`, `renstra.iks_kapasitas_minimal_sedang.awal`,
   `krb.nasional.kab_kapasitas_rendah`, `.kab_kapasitas_sedang`, `.kab_kapasitas_tinggi`, `krb.nasional.kapasitas_minimal_sedang_persen`.
   Label: resmi; persen KRB olah(resmi). Renas Tabel 2.7: tingkat kapasitas provinsi "SEDANG" di 30 dari 34 provinsi, "RENDAH" di
   Bangka Belitung, Kalimantan Selatan, Papua Barat, "TINGGI" di Jawa Tengah (hlm. 25) [`bnpb-2025-renas`]. Label: resmi.
2. **Kepatuhan daerah (nasional):** 63 daerah belum menuntaskan SPM sub-urusan bencana, 87 belum mengaktifkan KRB, 79 belum menyusun
   IKD 2024 (Direktur MPBG Kemendagri, rapat 4 September 2025). Sumber: Kemenko PMK, siaran 12 September 2025,
   https://kemenkopmk.go.id/node/5841 [`kemenkopmk-2025-sinkronisasi-irb`]; kunci lama `kemenkopmk.daerah_belum_spm_bencana`,
   `kemenkopmk.daerah_belum_krb`, `kemenkopmk.daerah_belum_ikd_2024`. Label: resmi. Jenis daerah (provinsi atau kab/kota) tidak
   dirinci.
3. **Temuan BPK atas pemda (pemeriksaan kinerja penanggulangan bencana, 25 objek pemda dari 30 objek):**
   - Pemda "belum memiliki rencana penanggulangan kedaruratan bencana (RPKB) dan belum sepenuhnya menyusun rencana kontinjensi (Renkon)
     per jenis bencana", belum melaksanakan pengorganisasian, penyuluhan, pelatihan, dan gladi mekanisme tanggap darurat, dan belum
     sepenuhnya menyiapkan sistem manajemen logistik dan peralatan berdasarkan renkon; disebut antara lain Pemerintah Aceh, Pemprov
     Sumatera Barat, Pemprov Jambi, Pemkab Karo, Pemkab Mandailing Natal, Pemkab Indragiri Hulu, Pemkab Rokan Hulu (hlm. 190–191).
   - Pemda belum memutakhirkan KRB dan RPB; RPB tidak ditetapkan kepala daerah dan tidak dipadukan dengan rencana pembangunan; tata
     ruang belum berdasar analisis risiko; disebut antara lain Pemprov Sumatera Barat, Pemprov Jambi, Pemkab Karo, Mandailing Natal,
     Indragiri Hulu, Rokan Hulu, Pemkot Sorong (hlm. 190).
   - Pemda belum menyusun regulasi penanggulangan banjir yang lengkap dan terpadu, antara lain Pemprov Jambi (hlm. 190).
   Sumber: IHPS II 2024 Ringkasan Eksekutif hlm. 11–12 dan Bab IV hlm. 190–191 [`bpk-2025-ihps2-2024`]; kunci baru
   `bpk.ihps2_2024.pb.objek`, `.objek_pusat`, `.objek_pemda`. Label: resmi. Daftar pemda adalah contoh ("di antaranya"), bukan
   daftar lengkap; periode pemeriksaan tidak tertulis di bagian yang terbaca.
4. **Temuan BPK atas pembinaan pusat ke daerah:** Kemendagri belum sepenuhnya mendorong pembentukan kelembagaan PB di daerah sesuai UU
   24/2007 dan belum menyelesaikan perubahan Permendagri 46/2008 tentang Pedoman OTK BPBD; rekomendasi memutakhirkan data
   kelembagaan dan memprioritaskan pembinaan pemda "yang belum membentuk BPBD maupun belum sesuai eseloneering". Keterpaduan dokumen
   kebencanaan ke perencanaan daerah belum optimal; target nasional potensi kehilangan PDB akibat bencana 1,10% pada 2023 yang
   didukung target daerah tidak tercapai. Sumber: IHPS II 2024 Bab IV hlm. 183–184 [`bpk-2025-ihps2-2024`]; kunci baru
   `bpk.ihps2_2024.kemendagri.target_kehilangan_pdb_2023_persen`. Label: resmi.
5. **Contoh provinsi (BPK Perwakilan Sulawesi Utara, 23 Desember 2024):** pemeriksaan kinerja penanggulangan bencana tahap prabencana
   TA 2023 sampai triwulan III 2024 menemukan empat permasalahan signifikan: regulasi dan kebijakan kebencanaan belum memadai, dokumen
   perencanaan PB belum sepenuhnya disusun dan ditetapkan, sarana dan prasarana pendukung belum memadai, dan KIE untuk kesiapsiagaan,
   peringatan dini, dan mitigasi belum memadai. Sumber: https://sulut.bpk.go.id/wp-content/uploads/2025/01/Press-Release-Penyerahan-LHP-LKPD-3-Entitas-23.12.24.pdf
   (diakses 24 Oktober 2026) [`bpksulut-2024-lhp-pb`]; kunci baru `bpksulut.2024.lhp_pb.permasalahan`. Label: resmi (siaran pers BPK).
6. **Hambatan yang dicatat BNPB sendiri (Renstra, ancaman):** 3 "Kurang pedulinya Pemerintah Daerah terhadap SDM yang melakukan
   perhitungan jitupasna dan penyusunan dokumen R3P"; 4 kab/kota yang belum mencapai RPB sehingga tidak bisa integrasi ke rencana
   pembangunan; 6 "Kurangnya komitmen Pemda untuk mengalokasikan anggaran pascabencana"; 10 alokasi anggaran dan komitmen pemda untuk
   pembangunan dan pemeliharaan sarana peringatan dini; kelemahan 21 diseminasi dari BPBD ke masyarakat belum merata. Sumber: korpus
   `perban-nomor-5-tahun-2025.json` hlm. 74–76 [`bnpb-2025-renstra`]. Label: resmi.
7. **Hambatan yang dicatat Renas:** potensi ketidakjelasan akuntabilitas BTT; pemda belum memaksimalkan peran lembaga usaha dan lembaga
   nonpemerintah saat darurat; "belum tersinkronisasinya pemahaman dan pengelolaan dana untuk penanganan darurat bencana" BTT dan DSP;
   program ketangguhan belum menjadi prioritas desa dan dana desa belum optimal; KRB belum tersedia di seluruh kab/kota; belum seluruh
   daerah memiliki RTRW dan RDTR berbasis mitigasi (hlm. 26–27). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 26–27
   [`bnpb-2025-renas`]; `celah.csv` C02. Label: resmi.
8. **Instrumen daerah yang baru ditetapkan (normanya ada, capaiannya belum):** Juklak SPM sub-urusan bencana kab/kota 4/2026 (gladi),
   5/2026, 6/2026, 7/2026 (KIE) ditetapkan 15 September 2026; Perban 9/2025 rencana penanggulangan kedaruratan daerah (22 Desember
   2025); Perban 2/2023 renkon berlaku 3 tahun dan direviu paling sedikit 6 bulan sekali. Sumber: berkas bukti air bab-07 P4 temuan 7
   dan P2 temuan 10 [`bnpb-2026-juklak-spm`]; kunci lama `perban2_2023.renkon_masa_berlaku_tahun`, `perban2_2023.renkon_reviu_bulan`.
   Label: resmi.
9. **Syarat akses Dana Bersama bergantung dokumen daerah:** kriteria usulan prabencana pemda adalah kesesuaian dengan RKPD, RPBD, dan/atau
   SPM (Perban 1/2026 Pasal 14 ayat (4)); pemda membentuk tim dengan BPBD sebagai koordinator (Pasal 11). Sumber: korpus
   `perban-nomor-1-tahun-2026.json` [`bnpb-2026-dana-bersama`]; berkas bukti air bab-09 T3.9. Label: resmi.

### Inferensi

- **[Inferensi tim]** Hambatan daerah yang paling menahan adalah dokumen dasar yang tidak ada atau kedaluwarsa (KRB, RPB, RPKB,
  renkon per jenis), karena dokumen itu sekaligus syarat akses Dana Bersama (temuan 9), dasar logistik menurut BPK (temuan 3),
  dan bahan SPM. Daerah tanpa dokumen itu tertahan di tiga jalur sekaligus.
- **[Inferensi tim]** Bahwa Pemerintah Aceh dan Pemprov Sumatera Barat tercatat BPK pada 2024 belum memiliki RPKB dan renkon per
  jenis yang memadai, lalu mengalami kejadian 1.202 meninggal dan 140 hilang pada November 2025 (kunci lama
  `kasus_sumatra_nov2025` di paket skenario-hidromet), adalah koinsidensi yang patut dicatat, bukan bukti sebab-akibat. Penulis
  dilarang menulis bahwa ketiadaan renkon menyebabkan korban.
- **[Inferensi tim]** Dua angka kapasitas (62–67% dan 37,99%) tidak saling membantah secara langsung karena alat ukurnya berbeda
  (IKD Perka 3/2012 lawan kelas kapasitas KRB). Yang bermasalah adalah sasaran 90% pada 2029 yang tidak menyebut alatnya; itu
  pokok KD-3.
- **[Inferensi tim]** Lembaga pembuka untuk Kartu temuan 10.4: Kemendagri (Ditjen Bina Administrasi Kewilayahan, Ditjen Bina
  Pembangunan Daerah; Permendagri 46/2008, SPM), Direktorat Kesiapsiagaan (renkon, RPKB), Direktorat Pemetaan dan Evaluasi Risiko
  Bencana (KRB, RPB), BPBD provinsi.

### Celah

- Jumlah kab/kota tanpa BPBD atau dengan BPBD tidak sesuai eselonering tidak disebut IHPS. **Permintaan:** Kemendagri (Ditjen Bina
  Administrasi Kewilayahan).
- Jumlah renkon dan RPKB per jenis yang berlaku per kab/kota tidak ditemukan. **Permintaan:** Direktorat Kesiapsiagaan, BPBD provinsi.
- Rasio anggaran PB terhadap APBD dan realisasi BTT per daerah tidak ditemukan (KERANGKA §7 butir 31). **Permintaan:** Kemendagri
  (Ditjen Bina Keuangan Daerah).
- LHP per pemda (Aceh, Sumatera Barat, dan lainnya) tidak dibuka; yang dikutip hanya ringkasan IHPS. Teks PP 2/2018 dan Permendagri
  101/2018 (jenis layanan dasar SPM bencana) belum dibaca (berkas bukti mitigasi bab-02 C2.5).

---

## P5. Berapa sel matriks fase × jenis tanpa program terbukti?

### Inti

Pertanyaan KERANGKA memakai kata "terbukti"; sesuai larangan di temuan 6 (InaTEWS dan PAMSIMAS berbukti sedang tidak boleh disebut
terbukti), "terbukti" di sini dibaca sebagai berbukti kuat. Jawabannya dua angka berdampingan: dari 39 sel (3 fase × 13 jenis),
34 sel tanpa program berbukti kuat, dan seluruh 39 sel tanpa program dalam negeri berbukti kuat; bila bukti sedang ikut dihitung,
24 sel tanpa program berbukti kuat atau sedang (20 tanpa program sama sekali dan 4 hanya berprogram lemah atau belum terbukti). Dari 15 sel yang berbukti kuat atau sedang, hanya 5 yang bersandar pada program dalam negeri,
semuanya berbukti sedang (InaTEWS untuk gempa dan tsunami di prabencana dan tanggap darurat; PAMSIMAS untuk kekeringan di
prabencana); tidak ada sel dengan program dalam negeri berbukti kuat. Seluruh 12 sel nonalam dan sosial (epidemi, kebakaran
industri, kebakaran TPA, konflik) tanpa program, dan 8 dari 13 sel tanggap darurat serta 8 dari 13 sel pascabencana juga tanpa
program.

### Temuan bersumber

1. **Kompendium:** 25 program; berbukti kuat 2, keduanya luar negeri (P16 pengendalian air tanah Tokyo, Osaka, Bangkok; P19
   kesiapsiagaan siklon Bangladesh, yang terbukti paketnya, bukan unsur tunggal); program dalam negeri terbaik berbukti sedang:
   InaTEWS (P03, posisi "Program berjalan, wajib evaluasi dampak") dan PAMSIMAS (P13, "Program dengan syarat (bukti sedang)").
   Destana (P01) dan SPAB (P02) "belum-terbukti" meski berjalan lebih dari 10 tahun. Sumber: `program-terbukti/kompendium_program.csv`
   kolom `kekuatan`, `posisi`, `kekuatan_catatan`; README §4 butir 1–2 [`pantaubencana-2026-program-terbukti`]; kunci lama
   `program.kompendium.n`, `program.kompendium.kuat`, `program.kompendium.kuat_dalam_negeri`, `program.kompendium.sedang_dalam_negeri`.
   Label: asumsi-kebijakan (rubrik kekuatan bukti paket).
2. **Hitungan sel (pemetaan penyusun):** 39 sel; kuat luar negeri 5; sedang dalam negeri 5; sedang luar negeri 5; lemah atau belum
   terbukti saja 4; tanpa program 20. Tanpa kuat = 34 (39 − 5), tanpa kuat dalam negeri = 39 (jawaban utama pertanyaan 5, "terbukti"
   = kuat). Tanpa kuat atau sedang = 24; tanpa kuat atau sedang dalam negeri = 34. Per fase: prabencana 4
   tanpa program (keempatnya nonalam dan sosial), tanggap darurat 8, pascabencana 8. Jenis tanpa sel kuat atau sedang di fase mana pun:
   7 (gunung api, longsor, karhutla, epidemi, kebakaran industri, kebakaran TPA, konflik). Sumber: olah dari `kompendium_program.csv`
   dengan aturan di butir 4; kunci baru `mitigasi.sel_program.*`. Label: asumsi-kebijakan.
3. **Pemetaan program ke sel (kategori terbaik per sel; P03 = InaTEWS, P13 = PAMSIMAS):**

   | Jenis | Prabencana | Tanggap darurat | Pascabencana |
   | --- | --- | --- | --- |
   | Gempa bumi | sedang DN (P03; luar negeri P21, P22, P24 sedang; P01, P02 belum terbukti) | sedang DN (P03) | sedang LN (P23; P07, P08, P09 lemah) |
   | Tsunami | sedang DN (P03; P21 sedang LN; P01, P02 belum terbukti) | sedang DN (P03) | lemah (P08) |
   | Gunung api | lemah (P01, P02 belum terbukti) | tanpa program | tanpa program |
   | Banjir dan banjir bandang (termasuk rob) | kuat LN (P16; P18, P20, P24 sedang LN; P04, P11, P12, P14, P17 lemah; P01, P02, P15 belum terbukti) | sedang LN (P20) | sedang LN (P23) |
   | Tanah longsor | lemah (P01 belum terbukti) | tanpa program | tanpa program |
   | Cuaca ekstrem | kuat LN (P19; P20, P24 sedang; P25 lemah) | kuat LN (P19; P20 sedang; P25 lemah) | sedang LN (P23) |
   | Gelombang ekstrem dan abrasi | kuat LN (P19) | kuat LN (P19) | tanpa program |
   | Kekeringan | sedang DN (P13; P04, P17 lemah; P01, P10 belum terbukti) | tanpa program | sedang LN (P23) |
   | Karhutla | lemah (P05, P06 lemah; P01 belum terbukti) | tanpa program | tanpa program |
   | Epidemi dan pandemi | tanpa program | tanpa program | tanpa program |
   | Kebakaran industri | tanpa program | tanpa program | tanpa program |
   | Kebakaran TPA | tanpa program | tanpa program | tanpa program |
   | Konflik sosial | tanpa program | tanpa program | tanpa program |

   DN = dalam negeri; LN = luar negeri (kolom `kelompok`). Sumber: `kompendium_program.csv` kolom `fase`, `bencana`, `kekuatan`,
   `kelompok`. Label: asumsi-kebijakan.
4. **Aturan pemetaan:** 13 jenis lingkup Kajian 2 (KERANGKA §5); kode `rob` dipetakan ke banjir (paket `lembaga` memasukkan rob ke
   banjir) dan `likuefaksi` ke gempa; tiap program ditempatkan di semua sel kombinasi kolom `fase` × `bencana`; kategori sel = kekuatan
   terbaik program di sel itu. Program luar negeri tidak diberi status Indonesia; padanannya ada di kolom `padanan`. Label:
   asumsi-kebijakan.
5. **Uji kepekaan:** (a) bila InaTEWS (P03) dibatasi ke tsunami (bukti Palu 2018 adalah peringatan tsunami), sel dalam negeri
   kuat atau sedang turun dari 5 ke 3 dan sel tanpa program naik dari 20 ke 21 (gempa tanggap darurat menjadi tanpa program; gempa
   prabencana tetap sedang lewat P21, P22, P24 luar negeri); (b) bila rob dipisah sebagai jenis ke-14, total 42 sel, tanpa program
   22, sel dalam negeri kuat atau sedang tetap 5. Sumber: olah dari `kompendium_program.csv`; kunci baru
   `mitigasi.sel_program.kepekaan_p03.tanpa_program`. Label: asumsi-kebijakan.
6. **Posisi bukti yang wajib dijaga penulis:** InaTEWS berbukti "sedang" dari kronologi satu kejadian (Palu 2018) dan posisinya
   "Program berjalan, wajib evaluasi dampak", bukan "terbukti"; PAMSIMAS berbukti sedang dengan bantahan internal (evaluasi DFAT
   2023 menilai data MIS terlalu optimistis) dan periode proyek 2008–2023 sudah berakhir; P23 (asuransi, CCRIF dan ARC) berbukti
   sedang untuk pooling regional luar negeri, sedangkan padanan Indonesia (Dana Bersama, Asuransi BMN) berstatus "dikembangkan" dan
   belum dievaluasi. Sumber: `kompendium_program.csv` P03, P13, P23; berkas bukti air bab-07 P3 temuan 3. Label: sesuai kolom sumber.
7. **Nonalam dan sosial tanpa program, tetapi tidak tanpa norma:** mandat tertulis keselamatan migas (Menteri ESDM), industri
   (Menteri Perindustrian), K3 (Menaker) untuk kebakaran industri (riset E12); KLB dan wabah (UU 17/2023); sistem tanggap darurat
   sampah kab/kota (UU 18/2008 Pasal 9) untuk kebakaran TPA; UU 7/2012 untuk konflik. Sumber: riset E12; `lembaga/README.md` §4.2.
   Label: resmi. Sel itu kosong bukti program, bukan kosong norma.

### Inferensi

- **[Inferensi tim]** Kesenjangan bukti tersusun menurut fase: hampir semua bukti ada di prabencana, tempat kompendium memang
  berfokus. Kosongnya 8 sel tanggap darurat dan 8 sel pascabencana berarti dampak operasi darurat dan pemulihan belum pernah
  diukur dengan cara yang dapat dikutip, bukan bahwa operasi itu tidak berjalan atau tidak efektif. Penulis wajib menulis "belum
  ada bukti dampak yang ditemukan".
- **[Inferensi tim]** Tiga jenis alam dengan korban besar di DIBI (longsor, karhutla, gunung api) tidak punya satu pun sel berbukti
  kuat atau sedang. Longsor menonjol karena menyumbang korban terbanyak di Jawa (berkas bukti air) dan tidak tersentuh program
  berbukti di fase mana pun.
- **[Inferensi tim]** Semua sel berbukti kuat bersandar pada program luar negeri; naskah menulis "Padanan di Indonesia: <program>"
  beserta statusnya (prinsip 12), tidak menulis bahwa padanan itu terbukti.
- **[Inferensi tim]** Lembaga pembuka untuk Kartu temuan 10.8 dan Gambar 10.1: Direktorat Mitigasi Bencana dan Direktorat
  Kesiapsiagaan (agenda bukti Bab 11.10; evaluasi Destana dengan tingkat ketangguhan Perban 7/2025), BMKG (InaTEWS), Kemenkes
  (epidemi), KLH/BPLH dan pemda (kebakaran TPA), Kementerian ESDM dan Kementerian Perindustrian (kebakaran industri), Kemenko PMK
  (konflik).

### Celah

- Kompendium tidak memuat program kesiapsiagaan gunung api (evakuasi berbasis status PVMBG) atau peringatan dini longsor; studi
  Merapi 2010 (Surono dkk. 2012, riset E16: 10.000–20.000 jiwa terselamatkan menurut penulis) belum masuk kompendium. **Penyajian:**
  sel "tanpa program di kompendium"; Merapi hanya studi kasus bila pemilik paket menambahkannya.
- DLNA Siklon Fani 2019 (dapat menaikkan Odisha ke kuat) tidak terbaca (`program-terbukti/README.md` §5).
- Pemetaan program ke sel adalah pilihan penyusun dan belum punya berkas data paket. **Usul:** `pipa-data` menulis
  `program-terbukti/sel_mitigasi.csv` dari tabel temuan 3 supaya angka identik di DOCX, PPTX, dan web.

---

## Bahan subbab 10.3, 10.5, 10.6, 10.7, 10.9 (konteks, bukan pertanyaan kunci)

### Inti

Data: seri DIBI patah di 2024 dan nonalam serta sosial praktis baru tercatat sejak 2024; COVID-19, Plumpang, Balongan, dan
Morowali tidak punya baris; kebakaran TPA tanpa jenis; produsen Data Bencana menurut Perban 1/2023 hanya unit BNPB. Logistik: BNPB
sendiri menyebut NSPK logistik belum sistematis dan regulasi standar logistik untuk pemda tidak relevan lagi; perubahan Perban
4/2018 sudah masuk Progsun 2026; target Renstra 35% ke 75% daerah terfasilitasi. Pembiayaan: BTT dan DSP belum sinkron, DSP terbatas
tiga keadaan, Dana Bersama prabencana tanpa syarat manfaat-biaya (dirinci Bab 12). RR: hambatan SDM Jitupasna dan R3P di daerah,
komitmen anggaran pascabencana, ketidaksinkronan Permendagri, dan beda instrumen penilaian kerusakan rumah. Yang tidak boleh
dikorbankan: InaRISK dan DIBI, Dana Bersama, renkon, Pusdalops, InaTEWS, klaster dan forum PRB, INALOGPAL, call center 117.

### Temuan bersumber

**Data (10.3)**

1. **Patahan seri 2024:** `is_bencana = false` baru dipakai sejak data 2024, dan kategori nonalam, sosial, lainnya praktis baru
   tercatat sejak 2024 (2018–2023: 0–15 kejadian per tahun; 2025: 363 kejadian dengan 295 meninggal); 2023 ke 2024 (5.400 ke 3.548)
   bukan penurunan 34%. Sumber: `dibi/README.md` bagian Patahan seri 2024 [`bnpb-2026-dibi`]; kunci lama
   `dibi.nasional.nonalam_sosial_lainnya.kejadian.2025`, `.meninggal.2025`, `dibi.nasional.kejadian.2023`, `.2024`. Label: resmi.
2. **Lubang pencatatan nonalam dan sosial:** COVID-19 dan Plumpang 2023 tidak tercatat di DIBI; Balongan dan Morowali tidak punya
   baris; kebakaran TPA tidak punya jenis tersendiri; entri ganda subjenis epidemi (Nias Selatan Januari 2025, 14 meninggal tercatat
   dua kali); "gagal teknologi" memuat runtuhnya bangunan; seri konflik tidak dipakai sebagai tren (kerusuhan akhir Agustus 2025 tidak
   tercatat sebagai konflik sosial). Sumber: `dibi/README.md` Keterbatasan; `nonalam-sosial/README.md` (rekonsiliasi DIBI)
   [`pantaubencana-2026-paket-nonalam-sosial`]. Label: resmi (data), pengamatan penyusun.
3. **Walidata dan produsen:** Walidata Bencana adalah unit kerja BNPB yang mengumpulkan, memeriksa, mengelola, dan menyebarluaskan
   data dari produsen; "Produsen Data Bencana adalah unit kerja di lingkungan Badan Nasional Penanggulangan Bencana yang menghasilkan
   Data berdasarkan tugas dan kewenangannya" (Pasal 1 angka 5–6); penyebarluasan oleh Walidata lewat portal (Pasal 28). Perban
   1/2023 menimbang Perpres 39/2019 dan masih mengingat Perban 4/2019 (OTK lama). Sumber: korpus `perban-nomor-1-tahun-2023.json`
   hlm. 1–2, 12 [`bnpb-2023-satudata`]. Label: resmi. Keluaran simulasi platform Pantau Bencana bukan Data Bencana menurut definisi
   ini (prinsip 19).
4. **Pengakuan BNPB atas data:** Renstra ancaman 2 implementasi Satu Data Indonesia "masih kurang optimal"; kelemahan 27 "Integrasi
   dan interoperabilitas sistem aplikasi di BNPB masih sangat rendah"; kelemahan 2 data terpilah sulit diterapkan (hlm. 73, 75).
   BPK: KRB dan peta risiko bencana "belum memuat seluruh ancaman bencana", rekomendasi memutakhirkan pedoman umum pengkajian risiko
   dan pedoman RPB dengan memasukkan seluruh jenis ancaman, IKD, IKM, dan dampak perubahan iklim (IHPS II 2024 hlm. 189). Sumber:
   [`bnpb-2025-renstra`, `bpk-2025-ihps2-2024`]. Label: resmi.
5. **IRBI 2025 tidak sebanding dengan 2015–2024:** nilai per bahaya 2025 semuanya bilangan bulat, sedangkan 2021–2024 kontinu; cara
   BNPB menghitung indeks provinsi 2025 belum terdokumentasi (KD-4). Sumber: `irbi/README.md` §4 [`bnpb-irbi`]. Label: resmi (data);
   simpulan "skala berubah" asumsi-kebijakan.
6. **Kerugian rupiah:** kolom DIBI `estimasi_kerugian_rumah` tidak diterbitkan paket karena satuannya tidak didokumentasikan; seri
   nilai kerusakan dan kerugian R3P 2015–2024 di CKAN belum ditarik. Sumber: `dibi/README.md` Keterbatasan. Label: resmi (pengamatan).

**Logistik (10.5)**

7. **Diagnosis BNPB:** Renas: "regulasi manajemen standar logistik dan peralatan penanggulangan bencana untuk pemerintah daerah sudah
   tidak relevan", "belum tersedianya sistem informasi logistik dan peralatannya yang dimutakhirkan untuk semua tahapan", dan beda
   standar minimum bantuan kemanusiaan antara lembaga kebencanaan dan lembaga usaha (hlm. 26–27). Renstra kelemahan 8 "Regulasi
   (NSPK) mengenai manajemen logistik belum tersusun dengan sistematis"; kekuatan 3 sistem database logistik INALOGPAL (hlm. 73).
   Sumber: [`bnpb-2025-renas`, `bnpb-2025-renstra`]. Label: resmi.
8. **Instrumen dan target:** Perban 4/2018 Sistem Manajemen Logistik dan Peralatan (27 Juni 2018); Perban 6/2022 Klaster Logistik;
   Juklak 2/2023 pembentukan klaster logistik daerah; Juklak 16/2025 penyelenggaraan klaster logistik; Perka 10/2012 dan 16/2012
   (bantuan logistik dan gudang pada status darurat; indeks JDIH: Berlaku). Progsun 2026 butir 6: perubahan Perban 4/2018 (Deputi
   Bidang Logistik dan Peralatan). IKP Renstra Program 5: daerah yang difasilitasi logistik dan peralatan serta SDM pengelolanya 35%
   (2025) ke 75% (2029); SDM pengelola logpal 35% ke 75%; daerah yang difasilitasi logistik 75% tiap tahun. Sumber: indeks JDIH
   [`bnpb-2018-sismanlogpal`, `bnpb-2025-juklak16`]; korpus Kepka 327/2025 hlm. 4 [`bnpb-2025-progsun`];
   `renstra_bnpb_2025_2029.csv` baris P5 (hlm. 130–137); kunci baru `renstra.ikp_logistik.2025`, `renstra.ikp_logistik.2029`. Label: resmi.
9. **BPK:** pemda yang diperiksa belum sepenuhnya menyiapkan sistem manajemen logistik dan peralatan berdasarkan renkon (P4 temuan 3);
   BNPB disebut telah melakukan perencanaan dan pemenuhan logistik dan peralatan (IHPS II 2024 hlm. 182). Label: resmi.

**Pembiayaan (10.6; rincian di Bab 12)**

10. **Celah yang dinyatakan sumber:** BTT dan DSP belum sinkron dan akuntabilitas BTT tidak jelas (Renas hlm. 26; C02); DSP dipakai
    selama keadaan darurat, keadaan tertentu, dan risiko berdampak luas yang ditetapkan Kepala BNPB (Perban 4/2020 Pasal 20 ayat
    (1)); Perban 1/2026 Pasal 14 ayat (4) dan Pasal 16 ayat (3) tidak mensyaratkan analisis manfaat-biaya (`program-terbukti/README.md`
    §4 butir 6); Renstra kelemahan 19 keterbatasan anggaran pemulihan pascabencana dan ancaman 11 pinjaman luar negeri (IDRIP)
    menambah beban kerja di luar tupoksi (hlm. 74, 76). Sumber: [`bnpb-2025-renas`, `bnpb-2020-dsp`, `bnpb-2026-dana-bersama`,
    `bnpb-2025-renstra`]. Label: resmi. Tanpa nominal (P5 KEPUTUSAN).

**Rehabilitasi dan rekonstruksi (10.7)**

11. **Hambatan RR menurut BNPB:** Renstra ancaman 5 kebijakan pemda dalam RR kurang memperhatikan risiko bencana; ancaman 7 "Terdapat
    ketidaksinkronan antara Permendagri yang diimplementasikan oleh rehabilitasi dan rekonstruksi BNPB dengan OPD atau unit lain";
    kelemahan 16 mutasi pegawai yang sudah dilatih Jitupasna dan R3P; 17 RR "hanya sampai mengakomodasi pembangunan kembali yang
    lebih aman, sehingga belum berkelanjutan"; 18 monev R3P belum optimal; 20 KRB belum dijadikan acuan RR (hlm. 74–76). Renas:
    rendahnya pemahaman pemda dalam perencanaan RR dan Jitupasna, penganggaran biaya perencanaan dan pengawasan hibah RR belum optimal,
    perbedaan instrumen penilaian tingkat kerusakan rumah, belum ada standar tipe hunian tetap, belum ada pelaporan terpusat bantuan
    CSR dan nonpemerintah (hlm. 28). Sumber: [`bnpb-2025-renstra`, `bnpb-2025-renas`]. Label: resmi.
12. **Instrumen RR dan rujukan yang keliru di Progsun:** R3P diatur Perban 5/2017 (7 November 2017), penyelenggaraan RR Perban 6/2017,
    hibah RR Perban 4/2024, Dana Tunggu Hunian Sumatra Juklak 15/2025 (15 Desember 2025, untuk Aceh, Sumatera Utara, Sumatera Barat).
    Progsun 2026 butir 4 berjudul perubahan "Peraturan BNPB Nomor 5 Tahun 2024 tentang Perencanaan Rehabilitasi dan Rekonstruksi
    Pascabencana" (Kepka 327/2025 hlm. 4), sedangkan Perban 5/2024 di indeks JDIH adalah "Kamus Kompetensi Teknis Bidang Penanggulangan
    Bencana" (25 Oktober 2024). Sumber: indeks JDIH [`bnpb-2017-r3p`, `bnpb-2025-juklak15`]; korpus Kepka 327/2025 [`bnpb-2025-progsun`].
    Label: resmi. Penyajian: lampiran Penyelarasan dokumen BNPB ("BNPB menyelaraskan rujukan Progsun butir 4 dengan Perban 5/2017").
13a. **Keterbukaan dokumen R3P (diperiksa ulang 24 Oktober 2026):** KERANGKA §5 Bab 10 menyebut R3P Cianjur "diunggah BNPB
    sebagai contoh tanpa nomor penetapan". Setelah berkas dibuka, klaim "tanpa nomor penetapan" **ditolak**: R3P Cianjur
    (https://eproposalrr.bnpb.go.id/manual/panduan_contoh-dokumen-r3p-bencana-masif_1739152465.pdf, 162 hlm., SHA-1
    c575d0b2dd970dcbe0df6c200aab83bde5c43768) memuat di hlm. PDF 7 (romawi vi) judul "Keputusan Bupati Kabupaten Cianjur No
    360/KEP.118-BAPPERIDA/2023 tentang Rencana Rehabilitasi dan Rekonstruksi Pasca Bencana Gempa Bumi di Kabupaten Cianjur Tahun
    2022". Dokumen yang sama di bab penutup menulis R3P "ditetapkan melalui Peraturan Bupati", jadi bentuk instrumennya tidak
    konsisten di dalam dokumen (Keputusan lawan Peraturan Bupati), ditulis berdampingan. Status di portal tetap "contoh dokumen".
    R3P Lombok dan Sulteng: dokumen R3P tidak ditemukan di sumber terbuka (riset E5). Pencarian web 24 Oktober 2026 menemukan
    instrumen penetapannya di indeks JDIH BPK: Pergub Sulawesi Tengah 10/2019 (R3P Sulteng) dan Pergub NTB 35/2018 (Rencana Aksi RR
    gempa NTB 2018–2019), tetapi kedua PDF menjawab HTTP 503 saat diunduh, sehingga isi dan lampirannya belum dibaca (sekunder).
    Lombok hanya punya total kebutuhan R3P Rp11,44 triliun dari Kemenko PMK (20 Mei 2024). Kesenjangan keterbukaan tetap ada,
    dengan bentuk yang lebih tepat: dokumen R3P tidak diterbitkan di kanal BNPB yang mudah ditemukan, satu-satunya yang terbuka
    diunggah sebagai contoh, dan Pergub Lombok/Sulteng tidak dapat diunduh. Sumber: [`bnpb-2017-r3p`]; riset E5. Label: resmi
    (R3P Cianjur, dibuka); sekunder (keberadaan Pergub Sulteng dan NTB, PDF tidak terbuka).
13. **Indikator RR adalah keluaran:** IKP Program 4 "Persentase Daerah pasca bencana masif yang ditangani" 100% tiap tahun 2025–2029
    (sama dengan RPJMN KP 08.04.03). Sumber: `renstra_bnpb_2025_2029.csv` baris P4; riset E11b. Label: resmi.

**Yang tidak boleh dikorbankan (10.9)**

14. **Aset yang dicatat BNPB sendiri sebagai kekuatan (Renstra hlm. 73–74):** standardisasi peralatan (1); peraturan dan pedoman
    teknis yang mendukung PB (2); INALOGPAL (3); pendampingan Jitupasna dan R3P lintas sektor (5); KRB wilayah terdampak dalam RR (6);
    InaRISK dan DIBI (11); pengalaman Gugus Tugas COVID-19 (12); contact center 117 (14); master plan MHEWS (15). Peluang 1 pooling fund
    dan peluang 5 klaster dan forum PRB tingkat nasional dan provinsi (hlm. 75). Sumber: [`bnpb-2025-renstra`]. Label: resmi.
15. **Instrumen berdasar peraturan yang dipakai kajian ini:** Satu Data Bencana (Perban 1/2023); Dana Bersama (Perpres 75/2021; Perban
    1/2026); renkon (Perban 2/2023, format tiga blok Pasal 7 yang dipakai kartu skenario Bab 6–9); SKPDB (Perka 3/2016); pembinaan
    Pusdalops daerah 395 ke 525 daerah 2024–2029 (Renas 1.2.1.c, PJ BNPB; kunci lama `renas.aksi_121c.pusdalops.2024`, `.2029`);
    InaTEWS (P03, bukti sedang); Destana dengan tingkat ketangguhan Perban 7/2025 sebagai garis dasar evaluasi (P01, belum terbukti).
    Sumber: berkas bukti air bab-07 P4 [`bnpb-2023-satudata`, `bnpb-2026-dana-bersama`, `bnpb-2016-skpdb`,
    `pantaubencana-2026-program-terbukti`]. Label: resmi (instrumen); asumsi-kebijakan (posisi program).

### Inferensi

- **[Inferensi tim]** Patahan DIBI 2024 menguntungkan sekaligus menyulitkan: sejak 2024 nonalam dan sosial mulai tercatat (lubang
  mengecil), tetapi tren lintas 2023/2024 tidak boleh dibaca. Karena Putusan MK menjadikan jumlah korban indikator wajib status
  nasional, mutu baris korban DIBI (entri ganda, kejadian tanpa baris) kini berakibat hukum, bukan hanya statistik.
- **[Inferensi tim]** Definisi produsen Data Bencana yang terbatas pada unit BNPB membuat data K/L (Kemenkes untuk epidemi, KLH untuk
  TPA, ESDM untuk industri migas) tidak masuk sebagai produsen menurut Perban 1/2023; jalurnya harus lewat Forum Satu Data Indonesia.
  Ini sejalan dengan lubang nonalam di DIBI. Penulis menulisnya sebagai hasil membaca definisi, bukan sebab yang terbukti.
- **[Inferensi tim]** Logistik adalah satu-satunya kesenjangan di bab ini yang instrumen perbaikannya sudah masuk Progsun 2026
  (butir 6). Kartu temuan 10.5 menulis statusnya "Sudah ada, perlu dikembangkan", bukan usulan baru.
- **[Inferensi tim]** "Tidak boleh dikorbankan" berarti instrumennya dipertahankan; itu tidak berarti dampaknya terbukti. Argumen
  tandingan yang wajib di Kotak 10.1: IRBI 2025 tidak sebanding dengan seri lama; Dana Bersama prabencana tanpa syarat manfaat-biaya;
  cakupan renkon daerah tidak diketahui dan BPK menemukan banyak yang belum ada; InaTEWS berbukti satu kejadian; Destana belum
  dievaluasi.
- **[Inferensi tim]** Lembaga pembuka: Pusdatinkom (Walidata; data nonalam lintas K/L), Deputi Bidang Logistik dan Peralatan
  (Perban 4/2018), Deputi Bidang RR (Progsun butir 4 dan 5; sinkronisasi dengan Kemendagri), Direktorat Pengembangan Strategi PB
  (Dana Bersama).

### Celah

- Jumlah gudang logistik BNPB dan BPBD, isinya terhadap kebutuhan skenario, dan data INALOGPAL tidak terbuka. **Permintaan:** Deputi
  Bidang Logistik dan Peralatan (sudah masuk keputusan 14 hari KERANGKA §6 butir 4).
- Seri CKAN kerusakan dan kerugian R3P 2015–2024 belum ditarik; R3P Lombok dan Sulteng tidak ditemukan (riset E5). **Permintaan:**
  Deputi Bidang RR.
- Teks Permendagri yang dimaksud Renstra ancaman 7 tidak disebut nomornya. **Permintaan:** Deputi Bidang RR.
- Evaluasi dampak Dana Tunggu Hunian Sumatra 2025 belum ada (program berjalan).

---

## Koreksi untuk KERANGKA dan paket data (dibawa ke pemiliknya; berkas ini tidak menyunting berkas lain)

| Tertulis | Temuan | Pemilik |
| --- | --- | --- |
| KERANGKA §5 Bab 10 dan §7 butir 31: "isi temuan BPK belum dibaca dan tidak diklaim" | IHPS II 2024 dibuka: pemeriksaan kinerja PB atas 30 objek (5 pusat, 25 pemda), temuan per entitas di Bab IV hlm. 176–191 | pemilik KERANGKA |
| KERANGKA §8: Perpres status dan tingkatan bencana "butir tidak ditulis sebagai kesenjangan" bila JDIH Setneg tidak terbuka | Tiga sumber resmi (BPK IHPS, keterangan Pemerintah di MK, tulisan hukum BPK) menyatakan belum ada; Putusan MK 261/PUU-XXIII/2025 memaknai ulang Pasal 7 ayat (2). Usul: tulis sebagai kesenjangan dengan atribusi, catat JDIH Setneg di log QA | pemilik KERANGKA |
| KERANGKA §5 Bab 12: indikator UU 24/2007 Pasal 7 ayat (2) "dikuantifikasi dari DIBI tanpa ambang rekaan" | Sejak 28 Agustus 2026 tafsir MK mengikat: minimal 3 dari 5 indikator, jumlah korban wajib. Bab 12 wajib merujuk putusan ini | pemilik KERANGKA; penulis Bab 12 |
| KERANGKA §1 C12 dan §5 Bab 10: Unsur Pengarah memakai nomenklatur lama | Perban 6/2025 Pasal 10 ayat (2) sudah memakai nama baru; yang lama tinggal Perpres 1/2019 Pasal 13 dan Perban 6/2018 | pemilik KERANGKA; `lembaga/celah.csv` C12 (`pipa-data`) |
| `lembaga/klaster.csv` catatan tahun SK 173 | BPBD DIY sendiri menulis dua tahun berbeda (2015 di berita 2019; 2014 di berita 29 Maret 2023) | `pipa-data` (bangun/lembaga.py) |
| KERANGKA §5 Bab 10: R3P Cianjur "diunggah BNPB sebagai contoh tanpa nomor penetapan" | Berkas yang diunggah memuat Keputusan Bupati Cianjur 360/KEP.118-BAPPERIDA/2023 (hlm. PDF 7); bab penutupnya menyebut Peraturan Bupati. Kesenjangan keterbukaan tetap: Lombok dan Sulteng tidak ditemukan (Bahan temuan 13a) | pemilik KERANGKA; riset E5 |
| `data/angka.json` kunci `bpk.bmkg.ibf_banjir_terperingatkan_persen` (19,68%) berlabel resmi | Sumbernya ringkasan Badan Keahlian DPR atas LHP yang tidak dibuka; menurut konvensi label, sekunder (atau label khusus "lembaga negara mengutip LHP" bila disetujui) | pemilik KERANGKA; pemilik registri |
| Lampiran Penyelarasan dokumen BNPB | (a) Progsun 2026 butir 4 merujuk Perban 5/2024 sebagai perencanaan RR (seharusnya Perban 5/2017); (b) Juklak 16/2025 memberi dua judul berbeda untuk SK 308/2024 dan menyebut Perka 3/2016 sebagai "Peraturan Badan"; (c) Perban 5/2018 dan Perban 1/2023 masih menyebut nomenklatur atau OTK lama | penyusun lampiran |

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Kartu temuan 10.1 Regulasi | Bukti: Perpres status belum ada (BPK, pertimbangan MK, keterangan Pemerintah); MK 3 dari 5 indikator; 6 dan 11 peraturan pelaksana (BPK); C09, C10; Perban 5/2018 lawan Perpres 46/2026. Dampak: penetapan status bergantung tafsir MK tanpa tata cara. Lembaga pembuka: Biro Hukum, Organisasi, dan Kerja Sama; Kemenko PMK; Kemenkes | P1 temuan 1–5, 9 | B5.6 | Atribusi "menurut IHPS II 2024 BPK"; status "belum ditemukan terbit per 24 Oktober 2026" |
| Kartu temuan 10.2 Kelembagaan dan komando | Klaster 8 menjadi 6; klaster kesehatan nasional belum dibentuk (BPK); Renstra kelemahan 9–12; OTK baru lawan Renstra dan Perban 2/2024 | P2 | B5.6 | Dua versi klaster berlabel sumber; tanpa klaim kegagalan per kejadian |
| Kartu temuan 10.3 Data dan peringatan dini | 6% / 6,10% / 11.060 per 100.000; Rencana Induk SPD multiancaman belum ada (BPK); patahan DIBI 2024; produsen data hanya unit BNPB | P3; Bahan subbab temuan 1–5 | B5.6 | Pil asumsi-kebijakan untuk angka kepekaan; catatan penyebut berbeda (S24) |
| Kartu temuan 10.4 Kapasitas BPBD dan SPM | 62% / 67% / 37,99%; 63, 87, 79 daerah; BPK: RPKB, renkon, KRB, RPB, kelembagaan BPBD | P4 | B5.6 | Tiga angka kapasitas satu tabel dengan nama alat ukur; KD-3 |
| Kartu temuan 10.5 Logistik | Regulasi logistik pemda tidak relevan (Renas); NSPK belum sistematis (Renstra); Progsun butir 6; IKP 35% ke 75% | Bahan subbab temuan 7–9 | B5.6 | Status "Sudah ada, perlu dikembangkan" |
| Kartu temuan 10.6 Pembiayaan | BTT dan DSP belum sinkron; DSP tiga keadaan; Dana Bersama tanpa syarat manfaat-biaya | Bahan subbab temuan 10 | B5.6 | Tanpa nominal; rujuk Bab 12 |
| Kartu temuan 10.7 RR | Renstra ancaman 3, 5, 6, 7; kelemahan 16–20; Renas beda instrumen kerusakan rumah; keterbukaan dokumen R3P (Cianjur terbuka sebagai contoh dengan Keputusan Bupati 360/KEP.118-BAPPERIDA/2023; Lombok dan Sulteng tidak ditemukan, Pergub tidak dapat diunduh) | Bahan subbab temuan 11–13, 13a | B5.6 | Butir Progsun butir 4 ke lampiran Penyelarasan, bukan kartu |
| Kartu temuan 10.8 Kesenjangan bukti | 39 sel, 34 tanpa program berbukti kuat (39 tanpa program dalam negeri berbukti kuat) berdampingan dengan 24 tanpa kuat atau sedang, 5 dalam negeri sedang, 0 dalam negeri kuat; 12 sel nonalam dan sosial kosong | P5 | B5.6 | Kata "terbukti" dilarang untuk InaTEWS, PAMSIMAS, Destana |
| Tabel 10.1 Celah kewenangan | C01, C02, C03, C04, C08, C09, C10, C11, C12, C14, C15, C17: topik, jenis (tumpang tindih, celah, nomenklatur usang, dicabut), lembaga, bukti berpasal, jenis bukti | `lembaga/celah.csv` | B5.7 | Kolom jenis_bukti; 14 baris disimpulkan penyusun ditandai |
| Tabel 10.2 Klaster dua versi | Tabel P2 temuan 1 dengan kolom nama Oktober 2026 | `lembaga/klaster.csv` | B5.7 | Kolom versi 173 diberi pil "sekunder (berita instansi)"; tahun SK 173 ditulis "2014/2015"; teks SK tidak dibuka |
| Tabel 10.3 Empat angka cakupan peringatan dini | Tabel P3 temuan 1 ditambah kolom pemilik indikator | P3 temuan 1–4; kunci lama `renas.indikator_1c.*`, `renstra.ikp_peringatan_dini.*`, `rpjmn.peringatan_dini.baseline`, `renstra.peringatan_dini.keterpenuhan_persen` | B5.7 | Tidak digambar sebagai satu deret garis |
| Gambar 10.1 Sel matriks per kategori bukti | 13 jenis × 3 fase; warna: kuat (luar negeri), sedang dalam negeri, sedang luar negeri, lemah/belum terbukti, tanpa program | P5 temuan 3; kunci `mitigasi.sel_program.*` | G16 (tabel peta panas) | Belum ada berkas data; usul `program-terbukti/sel_mitigasi.csv`. Isi berbeda untuk luar negeri; pil asumsi-kebijakan; catatan kepekaan P03 |
| Kotak 10.1 Yang tidak boleh dikorbankan | Renstra kekuatan 1–3, 5, 11, 14, 15; Dana Bersama; renkon; SKPDB; Pusdalops 395 ke 525; InaTEWS; Destana; tiap butir satu argumen tandingan | Bahan subbab temuan 14–15 | B5.5 | Kalimat penutup: dipertahankan bukan berarti terbukti |

---

## Angka untuk registri

Kunci baru (juga di `bab-10.angka.json`). Kunci yang sudah ada di `data/angka.json` atau di berkas bukti lain dirujuk di badan
berkas ini dan tidak diulang (antara lain `renas.indikator_1c.*`, `renstra.ikp_peringatan_dini.*`, `krb.nasional.*`,
`kemenkopmk.*`, `program.kompendium.*`, `hidromet.nasional.lantai.*`, `dibi.nasional.*`, `progsun.2026.jumlah_rancangan`). Angka
sekunder tidak dimasukkan.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| mitigasi.sel_program.total | 39 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan | olah: 13 jenis × 3 fase |
| mitigasi.sel_program.kuat_luar_negeri | 5 sel | idem | asumsi-kebijakan | P16, P19 |
| mitigasi.sel_program.sedang_dalam_negeri | 5 sel | idem | asumsi-kebijakan | P03 (4 sel), P13 (1 sel) |
| mitigasi.sel_program.sedang_luar_negeri | 5 sel | idem | asumsi-kebijakan | P20, P23 |
| mitigasi.sel_program.lemah_belum_terbukti | 4 sel | idem | asumsi-kebijakan | gunung api, longsor, karhutla prabencana; tsunami pascabencana |
| mitigasi.sel_program.tanpa_program | 20 sel | idem | asumsi-kebijakan | olah |
| mitigasi.sel_program.tanpa_kuat | 34 sel | idem | asumsi-kebijakan | 39 − 5 sel kuat luar negeri; jawaban utama P5 |
| mitigasi.sel_program.tanpa_kuat_dalam_negeri | 39 sel | idem | asumsi-kebijakan | tidak ada program dalam negeri berbukti kuat |
| mitigasi.sel_program.tanpa_kuat_sedang | 24 sel | idem | asumsi-kebijakan | 20 + 4 |
| mitigasi.sel_program.tanpa_kuat_sedang_dalam_negeri | 34 sel | idem | asumsi-kebijakan | 39 − 5 |
| mitigasi.sel_program.nonalam_sosial_tanpa | 12 sel | idem | asumsi-kebijakan | 4 jenis × 3 fase |
| mitigasi.sel_program.tanggap_darurat_tanpa | 8 sel | idem | asumsi-kebijakan | dari 13 |
| mitigasi.sel_program.pascabencana_tanpa | 8 sel | idem | asumsi-kebijakan | dari 13 |
| mitigasi.sel_program.jenis_tanpa_kuat_sedang | 7 jenis | idem | asumsi-kebijakan | gunung api, longsor, karhutla, epidemi, kebakaran industri, kebakaran TPA, konflik |
| mitigasi.sel_program.kepekaan_p03.tanpa_program | 21 sel | idem | asumsi-kebijakan | P03 dibatasi tsunami |
| bpk.ihps2_2024.pb.objek | 30 objek | pustaka bpk-2025-ihps2-2024 | resmi | IHPS II 2024 Ringkasan Eksekutif hlm. 11 |
| bpk.ihps2_2024.pb.objek_pusat | 5 objek | idem | resmi | idem |
| bpk.ihps2_2024.pb.objek_pemda | 25 objek | idem | resmi | idem |
| bpk.ihps2_2024.bnpb.peraturan_belum_disahkan | 6 peraturan | idem | resmi | Bab IV hlm. 188 |
| bpk.ihps2_2024.bnpb.peraturan_belum_diinisiasi | 11 peraturan | idem | resmi | Bab IV hlm. 188–189 |
| bpk.ihps2_2024.basarnas.kesiapan_sarpras_persen | 92,86% | idem | resmi | Bab IV hlm. 182 |
| bpk.ihps2_2024.basarnas.kesiapan_sarpras_target_persen | 93,91% | idem | resmi | idem |
| bpk.ihps2_2024.kemenkes.renkon_kesehatan_dinkes_prov | 3 dinkes provinsi | idem | resmi | Bab IV hlm. 185 |
| bpk.ihps2_2024.kemendagri.target_kehilangan_pdb_2023_persen | 1,10% | idem | resmi | Bab IV hlm. 184 |
| bpksulut.2024.lhp_pb.permasalahan | 4 permasalahan | pustaka bpksulut-2024-lhp-pb | resmi | siaran pers 23 Des 2024 |
| uu24.pasal7.indikator | 5 indikator | pustaka mk-2026-putusan261 | resmi | UU 24/2007 Pasal 7 ayat (2), dikutip amar |
| mk.putusan261_2025.indikator_minimal | 3 indikator | idem | resmi | amar butir 2, hlm. 240 |
| lembaga.klaster.kepka308 | 6 klaster | pustaka pantaubencana-2026-paket-lembaga | resmi | `lembaga/klaster.csv` (Juklak 16/2025) |
| renstra.ikp_logistik.2025 | 35% | pustaka bnpb-2025-renstra | resmi | Renstra hlm. 132–133, IKP Program 5 |
| renstra.ikp_logistik.2029 | 75% | idem | resmi | idem |
| renstra.swot.kelemahan | 28 kelemahan | idem | resmi | Renstra Tabel 1.13 hlm. 73–75 |
| renstra.swot.ancaman | 11 ancaman | idem | resmi | Renstra Tabel 1.13 hlm. 75–76 |
| renas.indikator_1c.2025_persen | 11,06% | pustaka bnpb-2025-renas | resmi (olah) | 11.060 / 1.000 |

---

## Pustaka

Entri CSL-JSON di `bab-10.pustaka.json` (43 sumber). Sumber baru yang dibuka untuk bab ini: `bpk-2025-ihps2-2024`,
`mk-2026-putusan261`, `bpksulut-2024-lhp-pb`, `bpbddiy-2023-klaster`, `bnpb-2018-keadaan-tertentu`, `bnpb-2025-juklak16`,
`bnpb-2018-sismanlogpal`, `bnpb-2008-protap-trc`, `bnpb-2018-bantuan-internasional`, `bnpb-2025-juklak15`, `ri-2020-inpres3`,
`bpbddiy-2019-klaster`, `pantaubencana-2026-paket-nonalam-sosial`. Sumber lain disalin dari entri berkas bukti sebelumnya dengan id
yang sama: `bnpb-2025-renstra`, `bnpb-2025-renas`, `bnpb-2025-progsun`, `bnpb-2023-satudata`, `bnpb-2024-spdb`, `bnpb-2025-otk`,
`bnpb-2025-otk-ubah`, `bnpb-2016-skpdb`, `bnpb-2023-juklak-skpdb`, `bnpb-2026-juklak-spm`, `bnpb-2026-dana-bersama`, `bnpb-2020-dsp`,
`bnpb-2017-r3p`, `bnpb-2026-dibi`, `bnpb-irbi`, `bnpb-2026-krb`, `ri-2007-uu24`, `ri-2026-perpres46`, `ri-2018-perpres17`,
`ri-2019-perpres1`, `ri-2023-uu17`, `ri-2012-uu7`, `ri-2008-pp21`, `ri-2025-perpres12-rpjmn`, `kemenkopmk-2025-sinkronisasi-irb`,
`bpk-2025-status-bencana`, `dpr-2022-deteksi-dini`, `wmo-2022-peringatan-dini`, `pantaubencana-2026-paket-lembaga`,
`pantaubencana-2026-program-terbukti`.

---

## Catatan atas temuan pemeriksa (24 Oktober 2026)

Semua temuan dicek ke sumber (IHPS II 2024 SHA-1 d743fad1..., Putusan MK 261 SHA-1 2987f693..., `kompendium_program.csv`,
`celah.csv` C15, R3P Cianjur). Yang diterima diterapkan di berkas ini, `bab-10.angka.json`, dan `bab-10.pustaka.json`.
Bagian yang ditolak atau diterima sebagian:

1. **MK, kalimat "melampaui kemampuan pemerintah daerah":** pemeriksa menulis kalimat itu ada di hlm. 229 sebelum judul [3.13.6],
   jadi bagian dari [3.13.5]. Dicek dengan pdftotext: judul [3.13.6] ada di hlm. 229 baris atas, dan kedua kemunculan "melampaui
   ... kemampuan pemerintah daerah" berada sesudah judul itu, di halaman yang sama. Jadi rujukannya tetap [3.13.6], halamannya
   dibetulkan dari 230 ke 229. Tidak dirujuk ke [3.13.5].
2. **MK [3.13.4]:** tidak disebut pemeriksa, tetapi pergeseran yang sama berlaku: [3.13.4] ada di hlm. 227–228 (ditulis 228–229)
   dan kalimat "hingga saat ini belum dilakukan oleh pemerintah" ada di hlm. 228. Dibetulkan.
3. **R3P Cianjur "tanpa nomor penetapan" (temuan keterbukaan R3P):** butir ditambahkan sesuai permintaan, tetapi klaim KERANGKA
   bahwa R3P Cianjur tanpa nomor penetapan ditolak setelah berkas dibuka (Keputusan Bupati 360/KEP.118-BAPPERIDA/2023, hlm. PDF 7).
   Bagian Lombok dan Sulteng diterima. Lihat Bahan temuan 13a dan Koreksi.
4. **19,68% dan R = 8:** LHP BPK 2022 tidak publik dan tidak dibuka; laporan UNDRR-WMO 2022 menolak akses. Maka dipakai jalur
   sementara yang diminta: 19,68% diturunkan ke sekunder (tidak masuk badan teks), R = 8 tetap dirujuk ke siaran pers dengan catatan
   di Celah. Kunci 19,68% adalah kunci lama di `data/angka.json`; labelnya di registri hanya bisa diubah pemiliknya (Koreksi).
5. **Kepka 173:** dipilih opsi menurunkan ke sekunder dan mengeluarkan kunci `lembaga.klaster.kepka173` dari `bab-10.angka.json`
   dan tabel registri; label khusus "berita instansi" tidak dipakai karena belum disepakati pemilik KERANGKA.

