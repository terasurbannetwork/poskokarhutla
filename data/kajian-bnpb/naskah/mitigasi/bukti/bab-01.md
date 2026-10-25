---
kajian: mitigasi
bab: 1
judul: BAB 1 PENDAHULUAN
jenis: berkas bukti
disusun: 24 Oktober 2026
status: bukti draf (belum melewati penyunting substansi)
pemilik_berkas: pipa-data (ilmu.mjs pemilik)
pasangan: bab-01.angka.json (45 usulan kunci registri), bab-01.pustaka.json (CSL-JSON, 21 sumber)
revisi: 24 Oktober 2026, sesudah pemeriksaan (sejalan dengan KERANGKA V06; catatan di akhir berkas)
---

# Berkas bukti BAB 1 PENDAHULUAN, Grand Design Mitigasi Bencana Indonesia 2026–2030

Aturan yang dipakai: Buku Pegangan L56–L64 dan `PEDOMAN-DESAIN.md` §C9 (empat bagian per pertanyaan kunci), `KERANGKA.md`
§2 (prinsip), §5 BAB 1, §6 (register dan keputusan yang diminta), §7 (celah), dan `KEPUTUSAN.md`. Label keyakinan memakai
empat kode registri: **resmi**, **terverifikasi**, **estimasi-model**, **asumsi-kebijakan**. Kolom verifikasi (primer atau
sekunder) ditulis bila sumbernya kutipan pihak lain. Butir bertanda **[Inferensi tim]** adalah penilaian penyusun, bukan
fakta bersumber. Bab ini tidak memuat keluaran model, jadi label estimasi-model tidak dipakai.

Bahan yang dibaca: `riset/A-dokumen-bnpb.md` (§1.1–1.4, §2, §3, §4, §5, §7, §8), `riset/E-dokumen-primer.md` (§1, §E11,
§E14, §3), `riset/D-inventaris-platform.md` (tidak dipakai: bab ini tanpa angka platform), `riset/B-air-jawa.md` dan
`riset/C-benchmark.md` (tidak dipakai: lingkup air dan praktik pembanding tinggal di Kajian 1 dan Bab 2). Paket data:
`data/dibi`, `data/irbi`, `data/skenario-hidromet`, `data/nonalam-sosial`, `data/lembaga`, `data/air-jawa` (penduduk BPS);
registri `data/angka.json`; korpus `data/raw/hukum/teks` dan `data/lembaga/mentah/teks`. Sumber web dibuka 24 Oktober 2026
(halaman WorldRiskReport 2025 Welthungerhilfe, berita SUPAS 2025 BPS Provinsi Bengkulu, metadata UU 39/1999 JDIH BPK).

## 0. Kerangka bab dari KERANGKA.md §5

- **Judul:** BAB 1 PENDAHULUAN (7 hlm).
- **Subbab:** 1.1 Latar Belakang; 1.2 Posisi terhadap RIPB dan Renas PB; 1.3 Tujuan; 1.4 Lingkup, Taksonomi, dan
  Definisi Operasional; 1.5 Status Dokumen dan Jalur Adopsi; 1.6 Sistematika.
- **Tujuan bab:** menjelaskan mengapa Grand Design dibutuhkan sekarang dan apa yang dicakup.
- **Pertanyaan kunci:** (1) Mengapa korban bencana 2025 menuntut Grand Design sekarang, meskipun nilai IRB 2024 turun?
  (2) Bagaimana kajian ini menjadi masukan peninjauan Renas PB 2025–2029? (3) Jenis bencana apa yang dicakup, dan apa arti
  kerusuhan sosial dan mitigasi dalam kajian ini?
- **Temuan kunci yang diharapkan (KERANGKA §5 BAB 1, diperbarui V06):** 2025, bencana alam: 1.735 meninggal dan 221
  hilang, tertinggi sejak 2018 (5.477 meninggal); sekitar 0,7 meninggal dan hilang per 100.000 (DIBI dan penduduk BPS 2026)
  lawan 0,22 pada indikator Renas 1.a; versi semua klasifikasi 2.030 meninggal dan 246 hilang hanya sebagai komposisi dan
  tidak dibandingkan dengan tahun sebelum 2024; Sumatra November 2025: 1.202 meninggal, 140 hilang, 970.876 mengungsi,
  63.019 rumah rusak berat; IRB 2024 128,52, turun 10,76% dari 2019, dibahas di Bab 5 sebagai capaian dengan catatan korban
  tidak ikut turun (NAR 2023), WorldRiskReport 2025 hanya pembanding; Perban 1/2025 Pasal 7 ayat (1)–(2) dan hlm. 125;
  definisi operasional kerusuhan sosial dan mitigasi; kebakaran gedung dan permukiman di luar lingkup (DIBI 2025: 881
  kejadian, 149 meninggal, konteks).
- **Komponen:** Gambar 1.1 meninggal dan hilang akibat bencana alam 2015–2025 dengan anotasi 2018 dan 2025 dan penanda
  patahan 2024 (G1, `dibi/rekap_nasional_tahunan.csv`); Kotak 1.1 definisi operasional (B5.5); Tabel 1.1 taksonomi dan
  lingkup (B5.7).
- **Status data menurut KERANGKA:** ada.
- **Pesan inti yang ditopang bab ini:** pesan inti KERANGKA (V06) memakai angka alam: `dibi.alam.meninggal.2025`,
  `dibi.alam.hilang.2025`, `dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang`. Kunci `tesis.mitigasi` di registri
  utama masih merujuk `dibi.nasional.meninggal.2025` dan `dibi.nasional.hilang.2025` (semua klasifikasi) dan perlu
  disesuaikan penggabung (lihat Catatan untuk penggabung).
- **Keputusan yang diminta yang bergantung pada bab ini:** KD-1 (masukan peninjauan Renas PB dan hari ke-0), KD-4 (catatan
  metode dan baseline IRBI 2025). KD-2 dan KD-3 hanya disebut sebagai angka berdampingan di 1.2; pembahasannya di Bab 5.
- **Keputusan atas temuan uji yang mengikat bab ini (KERANGKA §1):** P04 (latar memakai korban 2025, IRB 2024 pindah ke Bab
  5), M01 dan P24 (definisi kerusuhan; Agustus 2025 hanya celah pencatatan), K21 (paragraf lingkup menjelaskan pengecualian
  kebakaran permukiman), D21 (penyebut resmi penduduk).

### 0.1 Hasil cek terhadap KERANGKA yang wajib diketahui penulis bab

1. **Angka 0,22 di Renas adalah proyeksi 2025, bukan baseline.** Kolom Tabel 2.8 berjudul "PROYEKSI 2025" dan target 2029
   hanya "Menurun". Renas tidak menulis tahun dasar, penyebut, atau jenis bencana yang dihitung. Kalimat naskah: "proyeksi
   2025 indikator Renas 1.a", bukan "baseline" atau "target 2025".
2. **Angka utama adalah bencana alam (V06): 1.735 meninggal dan 221 hilang (1.956).** Versi semua klasifikasi 2.030
   meninggal dan 246 hilang memuat nonalam 242 meninggal (kebakaran permukiman 145, gagal teknologi 69, epidemi 28),
   lainnya 45 (kode 999, di luar 13 jenis Juklak 7/2023), dan sosial 8. Jenis nonalam, sosial, dan lainnya praktis baru
   tercatat sejak 2024, jadi versi itu hanya ditulis sebagai kalimat komposisi dan tidak dibandingkan dengan tahun sebelum
   2024. Jenis dalam lingkup kajian: 2.063 (juga memuat jenis yang baru tercatat sejak 2024, jadi tidak dipakai untuk
   perbandingan antartahun). Seri alam: tertinggi sejak 2018 (6.240), 3,4 kali median alam 2015–2024 (583,5).
3. **Angka utama per 100.000: sekitar 0,7 (alam)**, yaitu 0,68 (BPS 2026), 0,69 (SUPAS 2025), 0,72 (penduduk KRB InaRISK);
   meninggal alam saja 0,60 (BPS 2026). Versi semua klasifikasi 0,79 / 0,80 / 0,84 hanya berdampingan. Semua angka ini
   **proksi penyusun** (DIBI dibagi penduduk), bukan realisasi resmi indikator 1.a: Renstra BNPB Tabel 1.7 memuat seri
   resmi BNPB untuk IKU kematian "saat keadaan darurat" per 100.000 yang tidak dapat direproduksi dengan rumus ini (T1.15).
4. **881 kejadian dan 149 meninggal kebakaran permukiman adalah versi semua laporan.** Versi kejadian bencana (cakupan
   yang dipakai untuk 2.030): 327 kejadian dan 145 meninggal. Keduanya ditulis berdampingan, atau naskah memilih versi
   kejadian bencana agar sebanding dengan 2.030.
5. **Rumah rusak berat Sumatra punya dua versi DIBI:** 63.019 (kartu skenario, semua jenis musim hujan) dan 62.956 (paket
   dibi, kategori banjir dan longsor). Meninggal, hilang, dan mengungsi identik di keduanya. Angka KERANGKA (63.019) sah bila
   definisinya ditulis.
6. **Klaim NAR 2023 "kejadian menurun tiga tahun terakhir" tidak dapat direproduksi dari DIBI kini.** Kejadian 2019–2023:
   3.829, 4.649, 5.402, 3.544, 5.400; tidak ada tiga tahun turun berturut-turut di seri 2015–2023. Bagian "korban naik"
   cocok: meninggal 2020–2022 = 376, 728, 858. Naskah mengutip NAR lewat Renstra Tabel 1.4 dan menulis seri DIBI di
   sebelahnya, atau cukup memakai angka DIBI.
7. **"Mitigasi dalam arti luas lintas tiga tahap" adalah pilihan definisi kajian.** UU 24/2007 Pasal 1 angka 9 mendefinisikan
   mitigasi tanpa batas tahap, tetapi sistematika undang-undang menaruh "mitigasi bencana" sebagai satu dari tiga kegiatan
   prabencana dalam situasi terdapat potensi bencana (Pasal 44 huruf c, Pasal 47). Naskah menulis "dalam kajian ini" dan
   menyebut kedua pasal.
8. **Taksonomi kajian berbeda dari taksonomi data BNPB.** Juklak 7/2023 menggolongkan kebakaran gedung dan pemukiman (202)
   sebagai bencana nonalam dan memasukkan teror serta kerusuhan sosial ke kode 301 tanpa syarat antarkelompok. KRB 2022–2026
   memuat 14 bahaya tanpa konflik, kebakaran permukiman, dan TPA. IRBI memuat 9 ancaman. Tabel 1.1 wajib memuat kolom
   padanan ketiganya.
9. **RPJMN dibaca primer oleh riset E:** baseline penurunan IRB 1,54% (2023), target 1,2% per tahun; baseline kapasitas
   daerah minimal sedang 62% (2023), target 67% (2025) dan 90% (2029). Renstra menulis "dari 67% menjadi 90%". Untuk 1.2,
   angka 62% (RPJMN) dan 67% (Renstra) ditulis berdampingan dengan 38% (kapasitas KRB 2022–2026).
10. **Perpres 87/2020 Pasal 7 juga membuka peninjauan RIPB** (berkala lima tahunan atau sewaktu-waktu) dan PP 21/2008 Pasal 6
    menetapkan peninjauan rencana PB tiap dua tahun (riset E §E11). Kajian dapat disebut masukan peninjauan Renas PB dan
    RIPB sekaligus.
11. **Jendela evaluasi tahunan Renas 2025 sudah lewat** (paling lambat minggu terakhir triwulan II 2026). Titik masuk yang
    tersisa: pemantauan pra-pelaksanaan triwulan IV 2026 (Renja 2027), evaluasi tahunan 2026 (paling lambat akhir triwulan
    II 2027), dan evaluasi paruh waktu 2027.
12. **WorldRiskReport 2025 sudah dicek di halaman penerbit:** Indonesia peringkat 3 dari 193 negara, WRI 39,80. Label
    terverifikasi (lembaga nonpemerintah), hanya pembanding.

---

## PK1. Mengapa korban bencana 2025 menuntut Grand Design sekarang, meskipun nilai IRB 2024 turun?

### Inti

Pada 2025 DIBI mencatat 1.735 meninggal dan 221 hilang akibat bencana alam (1.956), tertinggi sejak 2018 (6.240) dan
sekitar 3,4 kali median alam 2015–2024 (583,5). Dibagi penduduk BPS 2026, hasilnya sekitar 0,7 per 100.000; ini proksi
penyusun, bukan realisasi resmi indikator Renas 1.a, dan berada di atas proyeksi Renas untuk 2025 (0,22), yang cara
hitungnya tidak tertulis. Satu rangkaian banjir dan longsor di Aceh, Sumatera Utara, dan Sumatera Barat menyumbang 69%
(1.342 dari 1.956); tanpa rangkaian itu, 2025 (614) berada dalam rentang tahun biasa, di bawah 2021 dan 2022. Versi semua
klasifikasi (2.030 meninggal, 246 hilang) memuat jenis yang baru tercatat sejak 2024 dan hanya ditulis sebagai komposisi.
Sebelumnya, IRB nasional turun 10,76% pada 2019–2024, dan Renstra juga menyatakan IKU kematian akibat bencana saat keadaan
darurat per 100.000 tercapai pada 2022–2024 (0,14; 0,10; 0,15). Kedua ukuran resmi itu tidak menjawab berapa korban
tercatat per tahun: IRB mengukur risiko termodelkan, dan IKU kematian memakai metode yang tidak sama dengan DIBI dibagi
penduduk. Grand Design karena itu membutuhkan sasaran korban dengan definisi, penyebut, dan baseline yang tertulis.

### Temuan bersumber

- **T1.1** DIBI 2025, cakupan kejadian bencana, semua klasifikasi: 2.030 meninggal, 246 hilang (jumlah 2.276), 5.440,45
  kejadian, 1.179.213 mengungsi, 11.809.388 menderita. Versi semua laporan: 2.037 meninggal, 252 hilang, 9.305,45 kejadian.
  Status: final menurut jadwal DIBI. Sumber: `data/dibi/rekap_nasional_tahunan.csv` [tahun=2025,klasifikasi=semua] dan
  `data/dibi/README.md` (Angka kunci; Definisi) [`bnpb-dibi`]; kunci `dibi.nasional.meninggal.2025`,
  `dibi.nasional.hilang.2025`, `dibi.nasional.kejadian.2025` (lama), `dibi.nasional.meninggal_hilang.2025`,
  `dibi.nasional.meninggal_semua_laporan.2025`, `dibi.nasional.hilang_semua_laporan.2025` (baru). **resmi** (primer).
  - *Angka berdampingan:* riset A §4.1 menulis 9.305 kejadian dan 2.037 meninggal untuk 2025; itu versi semua laporan.
    `dibi/README.md` melarang 9.305 dipakai sebagai "kejadian bencana 2025".
  - *Status di naskah (V06):* T1.1 adalah versi semua klasifikasi, dipakai hanya untuk kalimat komposisi (T1.3) dan
    tidak dibandingkan dengan tahun sebelum 2024. Angka utama bab: seri alam (T1.2).
- **T1.2** Pembanding antartahun, seri bencana alam (kode 101–109, kejadian bencana), meninggal dan hilang: 2015 = 276;
  2016 = 578; 2017 = 378; 2018 = 6.240 (5.477 meninggal, 763 hilang); 2019 = 589; 2020 = 418; 2021 = 815; 2022 = 895;
  2023 = 308; 2024 = 603; 2025 = 1.956 (1.735 meninggal, 221 hilang). Median 2015–2024 = 583,5; 2025 = 3,35 kali median. Dalam
  seri 2008–2025, 2025 kedua tertinggi sesudah 2018 (di atas 2010 = 1.907 dan 2009 = 1.767). Sumber: idem, hitungan penyusun
  atas jumlah 9 baris klasifikasi=alam per tahun, cakupan=bencana (dihitung ulang 24 Okt 2026) [`bnpb-dibi`]; kunci
  `dibi.alam.meninggal.2025`, `dibi.alam.hilang.2025`, `dibi.alam.meninggal_hilang.2025`, `dibi.alam.meninggal.2018`,
  `dibi.alam.meninggal_hilang.2018`, `dibi.alam.meninggal_hilang.median_2015_2024`. **resmi** (primer; olah).
  - *Catatan patahan:* seri patah di 2024 (`is_bencana` baru dipakai; nonalam, sosial, dan lainnya praktis baru tercatat).
    Seri alam adalah seri yang sebanding antartahun (`dibi/README.md`, Patahan seri 2024). Versi semua klasifikasi 2025
    (2.276) tidak dibandingkan dengan tahun sebelum 2024 (KERANGKA §5 BAB 1, V06); satu-satunya pembanding semua
    klasifikasi yang sah adalah 2024 (642).
- **T1.3** Komposisi korban 2025 per jenis Juklak (kejadian bencana, meninggal / hilang): banjir 1.396 / 189; tanah longsor 244 /
  31; cuaca ekstrem 80 / 1; gelombang pasang dan abrasi 7 / 0; karhutla 4 / 0; gempa bumi 2 / 0; erupsi 2 / 0; tsunami 0 / 0;
  kekeringan 0 / 0; epidemi dan wabah 28 / 0; gagal teknologi 69 / 2; kebakaran permukiman 145 / 6; konflik sosial 8 / 0;
  lainnya (999) 45 / 17. Jenis dalam lingkup kajian (alam, epidemi, gagal teknologi, konflik sosial): 1.840 meninggal dan 223
  hilang = 2.063. Sumber: `data/dibi/rekap_nasional_tahunan.csv` [tahun=2025,cakupan=bencana] per kode_jenis_juklak
  [`bnpb-dibi`]; kunci `dibi.lingkup.meninggal_hilang.2025`, `dibi.kebakaran_permukiman.meninggal_bencana.2025`,
  `dibi.lainnya.meninggal.2025`, `dibi.lainnya.hilang.2025`. Angka **resmi**; pemilahan lingkup **asumsi-kebijakan**
  (KERANGKA §2 butir 3).
- **T1.4** Banjir dan longsor Sumatra (Aceh, Sumatera Utara, Sumatera Barat), jendela DIBI 15 November–31 Desember 2025 (baris
  pertama berkorban 22 November): 1.202 meninggal, 140 hilang, 970.876 mengungsi, 4.679.551 menderita, 55 kab/kota. Rumah
  rusak berat 62.956 (kategori banjir dan longsor) atau 63.019 (semua jenis musim hujan); rumah rusak sedang 53.530 atau 53.596.
  Porsi kejadian ini terhadap meninggal dan hilang bencana alam 2025: 1.342 / 1.956 = 68,6% (versi semua klasifikasi
  1.342 / 2.276 = 59,0%, berdampingan saja). Sumber: `data/dibi/kejadian_besar.csv`
  [kode=sumatra2025,versi=DIBI]; `data/skenario-hidromet/kartu_skenario.csv` [skenario=kasus_sumatra_nov2025] [`bnpb-dibi`];
  kunci `dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang` (lama), `dibi.sumatra2025.mengungsi`,
  `dibi.sumatra2025.rumah_rusak_berat`, `hidromet.sumatra2025.rumah_rusak_berat`, `dibi.sumatra2025.kab_terdampak`,
  `dibi.sumatra2025.porsi_meninggal_hilang_2025` (baru). **resmi** (primer); jendela dan wilayah dipilih penyusun
  (`turunan_penyusun = ya`).
  - *Angka berdampingan (sekunder, tidak untuk naskah final):* BNPB per 12 Januari 2026, 1.189 meninggal dan 141 hilang, dikutip
    Suara Surabaya. Buletin Info Bencana BNPB Desember 2025 hlm. 6 (primer) hanya memuat Aceh: 527 meninggal, 31 hilang
    (`dibi/kejadian_besar.csv` versi pustaka).
- **T1.5** Renas PB 2025–2029 Tabel 2.8, Sasaran 1 "Mengurangi Jumlah Penduduk Terdampak Bencana melalui Peningkatan Kualitas
  Kesiapsiagaan, Peringatan Dini, dan Penanggulangan Kedaruratan Bencana": 1.a "Proporsi jumlah kematian penduduk (dan
  hilang) akibat bencana per 100.000 jiwa", PROYEKSI 2025 = 0,22, TARGET 2029 = "Menurun"; 1.b "Proporsi jumlah penduduk
  terdampak bencana per 100.000 jiwa", 2.643, "Menurun"; 1.c penduduk per 100.000 di daerah berisiko yang tercakup peringatan
  dini, 11.060 ke 52.000 (sekitar 11% ke 52% penduduk daerah berisiko). Sumber:
  `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` hlm. 32 [`bnpb-2025-renas`]; kunci
  `renas.indikator_1a.proyeksi_2025`, `renas.indikator_1b.proyeksi_2025` (baru), `renas.indikator_1c.2025`,
  `renas.indikator_1c.2029` (usulan bab air). **resmi** (primer).
  - *Angka berdampingan:* RPJMN KP 08.04.02 "Persentase cakupan layanan peringatan dini di daerah berisiko bencana": 6,00
    (baseline), 6,10 (2025), 6,32 (2029) (T2.9). Dua target resmi untuk cakupan peringatan dini berselisih jauh: Renas 1.c
    sekitar 11% ke 52%, RPJMN 6,00% ke 6,32%. Definisi dan penyebut keduanya tidak tertulis di sumber yang dibaca.
- **T1.6** Proksi penyusun untuk 1.a tahun 2025 (DIBI dibagi penduduk; bukan realisasi resmi). Angka utama, bencana alam:
  1.956 / 287.198.383 (BPS, penduduk pertengahan 2026) = 0,68; 1.956 / 284.670.000 (BPS, SUPAS 2025) = 0,69; 1.956 /
  271.680.290 (penduduk KRB InaRISK) = 0,72 per 100.000; meninggal alam saja 0,60 (BPS 2026). Versi semua klasifikasi,
  berdampingan saja: 0,79; 0,80; 0,84; meninggal saja 0,71. Besaran proyeksi 0,22 dalam jiwa: sekitar 632 meninggal dan
  hilang (penyebut BPS 2026) atau 626 (SUPAS 2025). Sumber: T1.1, T1.2; BPS tabel Jumlah Penduduk Pertengahan Tahun 2026, diperbarui
  30 Juni 2026, salinan `data/air-jawa/mentah/bps/penduduk_nasional_2026.txt` baris 48–72 [`bps-2026-penduduk`]; BPS Provinsi
  Bengkulu, 8 Mei 2026, "Indonesia pada pertengahan tahun 2025 berisi 284,67 juta manusia" (diakses 24 Okt 2026)
  [`bps-bengkulu-2026-supas`]; `nonalam-sosial/krb_covid19_wilayah.csv` [tingkat=nasional_api] [`bnpb-2026-krb`]; kunci
  `bps.penduduk.2026`, `bps.penduduk.supas_2025`, `dibi.alam.per100rb.2025_bps2026`, `dibi.alam.per100rb.2025_supas`,
  `dibi.alam.per100rb.2025_krb`, `dibi.nasional.per100rb.2025_bps2026`, `dibi.nasional.per100rb.2025_supas`,
  `dibi.nasional.per100rb.2025_krb`, `airjawa.nasional.penduduk_krb` (usulan bab air). Rasio **resmi** (olah DIBI dan BPS);
  perbandingannya dengan 0,22 **asumsi-kebijakan** (rumus BNPB untuk 0,22 tidak tertulis, dan seri resmi Renstra Tabel 1.7
  tidak dapat direproduksi dengan rumus ini; T1.15); setara jiwa (`renas.indikator_1a.setara_jiwa_2025`) **asumsi-kebijakan**.
  - *Catatan rasio:* proksi alam 0,68 kira-kira 3 kali 0,22 (versi semua klasifikasi 3,6 kali). Rasio ini membandingkan
    proksi penyusun dengan proyeksi BNPB yang metodenya tidak diketahui; naskah menulisnya sebagai "di atas proyeksi",
    tidak sebagai "realisasi 1.a sekian kali target".
- **T1.7** Proksi penyusun untuk 1.b tahun 2025 (versi semua klasifikasi; bukan realisasi resmi): Juklak 7/2023 hlm. 28 mendefinisikan "Terdampak/Penderita" sebagai orang yang menderita
  akibat dampak buruk bencana "namun masih dapat menempati tempat tinggalnya", terpisah dari pengungsi. Menderita DIBI 2025
  11.809.388 / 284.670.000 = 4.148 per 100.000 (BPS 2026: 4.112); bila pengungsi ditambahkan, 4.563 (BPS 2026: 4.523).
  Keduanya di atas proyeksi 2.643. Sumber: `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` hlm. 28 [`bnpb-2023-juklak7`];
  T1.1; kunci `dibi.nasional.terdampak_per100rb.2025`. **resmi** (olah); definisi "terdampak" Renas tidak tertulis.
- **T1.8** IRB nasional: baseline 2019 = 144,02; capaian 2020–2024 = 141,65; 138,81; 135,56; 132,25; 128,52, dengan target 141,14;
  138,26; 135,38; 132,50; 129,62. "Secara akumulatif ... mengalami penurunan sebesar 10,76% atau sebesar 15,5 poin. Dengan
  demikian, target pada Renstra BNPB Tahun 2020-2024 yaitu menurunkan IRB sebesar 10% selama 5 tahun, telah tercapai."
  Paket irbi mereproduksi semua angka itu dari API (rerata 498 kab ber-`fix_values`). Sumber:
  `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` hlm. 52 (Tabel 1.6) [`bnpb-2025-renstra`]; `data/irbi/README.md` §5
  [`bnpb-irbi`]; kunci `irbi.nasional.2019`, `irbi.nasional.2024`, `irbi.nasional.persen_2019_2024` (lama; nilai registri
  −10,7584). **resmi** (primer).
- **T1.9** IRBI 2025 tidak sebanding dengan 2015–2024: nilai per bahaya 2025 semuanya bilangan bulat; `total` = jumlah kolom
  bahaya di 0% kab (2015: 58%); rerata naik +19,43 ke 147,95 setelah turun tiap tahun 2016–2024; Spearman peringkat 2024 ke 2025
  = 0,589 (2016–2024 paling rendah 0,88). Rerata nasional 2025 tidak pernah diterbitkan BNPB. Sumber: `data/irbi/README.md` §4
  [`bnpb-irbi`]. Statistik dari data **resmi**; kesimpulan "skala berubah" **asumsi-kebijakan** (tafsiran penyusun, belum
  dikonfirmasi dokumen BNPB). Dasar KD-4.
- **T1.10** Indikator IRB di dokumen perencanaan: RPJMN 2025–2029 Lampiran III hlm. 913, PP 08.04 "Persentase penurunan nilai
  Indeks Risiko Bencana Nasional", baseline 1,54 (2023), target 1,2 (2025) dan 1,2 (2029); Renstra hlm. 84 dan Renas 4.c memuat
  1,2% per tahun. Sumber: riset E §E11(b) (tabel dicek dari gambar halaman) [`ri-2025-perpres12-rpjmn`]; riset A §2.2–2.3
  [`bnpb-2025-renas`, `bnpb-2025-renstra`]; kunci `rpjmn.pp_irb.baseline_2023` (baru), `rpjmn.iks_penurunan_irb_persen`
  (usulan bab air). **resmi** (primer).
- **T1.11** Renstra Tabel 1.4 "Tren dalam Penanggulangan Bencana Berdasarkan NAR 2023", tren 1 "Peningkatan Rasio Korban per
  Kejadian Bencana": "Jumlah kejadian bencana menurun dalam tiga tahun terakhir, namun jumlah korban tewas meningkat,
  menunjukkan dampak yang semakin parah." Tren 2: ambiguitas regulasi dan kewenangan. Sumber:
  `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` hlm. 23–24 [`bnpb-2025-renstra`]. **resmi** (kutipan Renstra; dokumen NAR
  2023 belum dibuka).
  - *Dibantah oleh (sebagian):* DIBI kini, kejadian bencana 2015–2023: 1.694; 2.306; 2.866; 3.401; 3.829; 4.649; 5.402; 3.544;
    5.400. Tidak ada tiga tahun turun berturut-turut. Bagian korban cocok: meninggal 2020–2022 = 376, 728, 858 (`data/dibi/README.md`
    Angka kunci). Periode "tiga tahun terakhir" di NAR tidak diketahui (Celah).
- **T1.12** IRBI 2023 provinsi yang dilanda kejadian November 2025: Aceh 146,90 (Tinggi), Sumatera Barat 144,38 (Tinggi), Sumatera
  Utara 140,65 (Sedang); 13 provinsi Tinggi dan 25 Sedang secara nasional. Sumber: `data/irbi/irbi_agregat_provinsi.csv`
  [prov_kode=11/12/13,tahun=2023] (cocok Renstra Tabel 1.1); Renas hlm. 19 (riset A §1.3) [`bnpb-irbi`, `bnpb-2025-renas`]; kunci
  `irbi.aceh.2023`, `irbi.sumut.2023`, `irbi.sumbar.2023` (baru), `irbi.prov.tinggi.2023` (lama). **resmi** (primer). Nilai 2024
  ketiga provinsi (144,29; 139,84; 142,55) hanya cocok dengan media sekunder (Katadata) dan tidak dipakai.
- **T1.13** WorldRiskReport 2025: "the Philippines (WRI 46.56) once again ranking at the top", diikuti India (40,73) dan Indonesia
  (39,80); indeks mencakup 193 negara. Sumber: https://www.welthungerhilfe.org/news/publications/detail/worldriskreport-2025
  (diakses 24 Okt 2026) [`wrr-2025`]; kunci `wrr.2025.indonesia_peringkat`, `wrr.2025.indonesia_wri`. **terverifikasi** (primer,
  lembaga nonpemerintah). Hanya pembanding; tidak dipakai sebagai capaian.
- **T1.14** Pemicu peninjauan karena bencana tersedia di Renas Pasal 7 ayat (2) dan hlm. 125; rincian di PK2 (T2.1–T2.2).
  **resmi**.
- **T1.15** Renstra BNPB 2025–2029 Tabel 1.7 "Capaian Indikator Kinerja Sasaran Strategis 2 Tahun 2020-2024", sasaran
  "Terselamatkannya sebanyak mungkin jiwa pada saat keadaan darurat bencana", IKU "Rata-rata angka kematian akibat bencana
  saat keadaan darurat per 100.000 jiwa": 2020 = 0,43 ("Menjadi Baseline"); 2021 target turun 2,5% (0,42), capaian naik
  48,84% (0,64), "Belum tercapai"; 2022 target 0,41, capaian 0,14, "Tercapai"; 2023 target 0,40, capaian 0,10, "Tercapai";
  2024 target 0,39, capaian 0,15, "Tercapai". Hlm. 53: target menurunkan angka itu 10% selama 5 tahun "telah tercapai", dan
  judul Grafik 1.6 menulis penyebutnya "per 100.000 penduduk wilayah terdampak". Sumber:
  `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` hlm. 52–53 [`bnpb-2025-renstra`]; kunci
  `renstra.iku_kematian_darurat.2020`, `renstra.iku_kematian_darurat.2024` (baru). **resmi** (primer).
  - *Berdampingan (tidak dapat direproduksi):* DIBI meninggal dibagi penduduk nasional memberi sekitar 0,27 (2021; 728
    meninggal alam) dan 0,31 (2022; 858), lawan 0,64 dan 0,14 di Tabel 1.7. Arah 2021 ke 2022 pun berlawanan. Seri Renstra
    karena itu memakai definisi lain (kematian "saat keadaan darurat", penyebut penduduk wilayah terdampak), dan proksi
    penyusun di T1.6 bukan ukuran yang sejenis. Hitungan penyusun; penyebut penduduk 2021–2022 dari proyeksi BPS sekitar
    272–276 juta, **asumsi-kebijakan** (pembanding kasar saja).

### Inferensi

- **I1.1 [Inferensi tim]** IRB dan korban tercatat mengukur dua hal berbeda. IRB adalah risiko termodelkan dari bahaya,
  kerentanan, dan kapasitas (Renstra hlm. 5); DIBI mencatat kejadian. KERANGKA §2 butir 7 melarang keduanya dipakai saling
  memvalidasi. Turunnya IRB 2019–2024 (T1.8) dan lonjakan korban 2025 (T1.1) karena itu tidak bertentangan secara logis,
  tetapi menunjukkan bahwa indikator kinerja yang dinyatakan tercapai tidak memberi tahu apakah korban turun. Ini berlaku
  juga bagi IKU kematian Renstra (T1.15): IKU itu dinyatakan tercapai 2022–2024, tetapi memakai definisi "saat keadaan
  darurat" dan penyebut wilayah terdampak, sehingga tidak sama dengan jumlah korban tercatat per penduduk nasional. Alasan
  Grand Design "sekarang" di 1.1 bertumpu pada tiga hal yang bersumber: korban alam 2025 tertinggi sejak 2018 (T1.2), dua
  ukuran resmi yang dinyatakan tercapai tidak mengukur korban tercatat nasional (T1.8, T1.15), dan seri IRB tidak dapat
  dilanjutkan ke 2025 tanpa catatan metode (T1.9, KD-4). Perbandingan dengan proyeksi 0,22 hanya pendukung (T1.6).
- **I1.2 [Inferensi tim]** Proyeksi 0,22 setara sekitar 630 meninggal dan hilang per tahun (T1.6), dekat median alam
  2015–2024 (583,5; T1.2). Besaran itu mendekati tahun tanpa kejadian katastrofik. Satu kejadian besar (2018, 2025) cukup
  untuk melampauinya beberapa kali lipat. Ini penilaian atas kesamaan besaran; cara BNPB menghitung 0,22 tidak tertulis,
  dan seri IKU Renstra yang sekeluarga (0,10–0,64; T1.15) memakai metode yang tidak dapat direproduksi dari DIBI. Naskah
  tidak boleh menyiratkan bahwa 0,22 dan proksi penyusun dihitung dengan cara yang sama.
- **I1.3 [Inferensi tim]** Lonjakan 2025 didorong satu rangkaian kejadian. Tanpa rangkaian Sumatra, meninggal dan hilang
  bencana alam 2025 sekitar 614 (1.956 dikurangi 1.342): di bawah 2021 (815) dan 2022 (895), sedikit di atas 2024 (603) dan
  2019 (589), yaitu dalam rentang tahun biasa. Hitungan versi semua klasifikasi (sekitar 930) tidak dipakai karena memuat
  sekitar 320 korban jenis yang baru tercatat sejak 2024. Pengurangan ini tetap mencampur dua cakupan (Sumatra semua laporan
  dalam jendela pilihan penyusun, nasional kejadian bencana alam); di jendela Sumatra baris `is_bencana = false` membawa 0
  meninggal, jadi selisihnya kecil. Pelajarannya untuk Grand Design: korban nasional ditentukan oleh kejadian katastrofik,
  sehingga sasaran korban perlu dibaca bersama skenario terburuk (Bab 6–7), bukan hanya rerata tahunan.
- **I1.4 [Inferensi tim]** Dua dari tiga provinsi yang dilanda kejadian November 2025 sudah berkelas Tinggi pada IRBI 2023
  (T1.12). Ini disajikan berdampingan, bukan sebagai bukti bahwa IRBI "memprediksi" kejadian. Yang dapat ditarik untuk Bab 10:
  kelas risiko yang sudah diketahui belum tercermin pada korban, sehingga pertanyaan kebijakannya adalah konversi kelas risiko
  ke tindakan prabencana.
- **I1.5 [Inferensi tim]** Sesuai P04, Bab 1 menyebut IRB 2024 dalam satu kalimat sebagai capaian berikut catatan seri, lalu
  merujuk Bab 5. WorldRiskReport 2025 (T1.13) tidak perlu masuk Bab 1; bila dipakai, hanya sebagai pembanding di Bab 2 atau 5
  dengan label terverifikasi, tanpa kata "peringkat ketiga paling berisiko" di judul.
- **I1.6 [Inferensi tim]** Tesis KERANGKA memilih 1.a dan 1.b sebagai sasaran utama karena "langsung terukur dari DIBI". 1.a
  terukur sebagai proksi penyusun (T1.6), tetapi BNPB punya seri kematian per 100.000 dengan metode lain (IKU Renstra,
  T1.15), jadi "langsung terukur" baru berlaku bila definisi, penyebut, dan baseline 1.a ditulis. 1.b terukur hanya bila
  definisi "terdampak" ditetapkan (menderita saja atau menderita ditambah mengungsi; T1.7). Bab 1 cukup menyebut proksi 1.a
  dengan angka dan 1.b tanpa angka, atau menulis kedua versi 1.b, selalu dengan kata "proksi penyusun".

### Celah

- Tahun dasar, penyebut, dan cakupan jenis untuk proyeksi 0,22 dan 2.643 tidak tertulis di Renas. Data diminta dari Deputi
  Bidang Sistem dan Strategi (pengampu Renas). Sampai tersedia, naskah menulis "proyeksi 2025" dan memakai penyebut yang
  disebut terang.
- Metode IKU Renstra "Rata-rata angka kematian akibat bencana saat keadaan darurat per 100.000 jiwa" (T1.15) tidak
  ditemukan: arti "saat keadaan darurat" (hanya kejadian berstatus darurat, atau masa tanggap darurat), penyebut "penduduk
  wilayah terdampak", dan cara merata-ratakan. Hubungan IKU ini dengan Renas 1.a juga tidak tertulis. Selama belum jelas,
  0,68–0,84 disebut proksi penyusun dan perbandingan dengan 0,22 berlabel asumsi-kebijakan. Permintaan ke Biro Perencanaan
  (pengampu Renstra) dan Deputi Bidang Sistem dan Strategi.
- Kalimat "tertinggi sejak 2018" memakai seri alam. Indikator 1.a menghitung kematian "akibat bencana" tanpa memilah jenis;
  naskah menulis terang bahwa angka utama bab adalah bencana alam karena hanya seri itu yang sebanding antartahun (V06).
- Tabel BPS penduduk pertengahan 2025 tidak ditarik; angka SUPAS 2025 dibaca dari berita BPS Provinsi Bengkulu, publikasi
  nasional SUPAS (30 Juni 2026, katalog 2101048) belum dibuka isinya. Penyebut utama tetap disebut namanya.
- Dokumen National Assessment Report 2023 tidak dibuka; periode "tiga tahun terakhir" dan sumber angkanya tidak diketahui.
  Naskah mengutipnya hanya lewat Renstra dengan seri DIBI di sebelahnya.
- Isi kategori DIBI "Lainnya" (kode 999) 2025, 45 meninggal dan 17 hilang, belum diperiksa per baris. Permintaan klarifikasi ke
  Pusdatinkom.
- DIBI data hidup; angka 2025 dapat berubah bila BNPB merevisi. Self-check paket `dibi` akan gagal bila itu terjadi.
- Kerugian rupiah Sumatra 2025 (PDNA, R3P) tidak dibuka; Bab 1 tidak memuat kerugian.
- Metode dan baseline IRBI 2025 belum terdokumentasi (KERANGKA §7 butir 12); ditulis sebagai KD-4, bukan kesimpulan.

---

## PK2. Bagaimana kajian ini menjadi masukan peninjauan Renas PB 2025–2029?

### Inti

Renas PB ditinjau berkala tiap dua tahun dan dapat ditinjau sewaktu-waktu bila terjadi bencana (Perban BNPB 1/2025 Pasal 7);
perubahan berkala paling lambat tahun ketiga (2027), perubahan karena bencana paling lambat tahun keempat (2028), dan
rekomendasinya wajib termuat dalam hasil evaluasi tahunan atau paruh waktu (hlm. 125). Kedua jalur tidak setara: perubahan
karena bencana menurut hlm. 125 "dapat dilakukan terhadap program dan kegiatan dalam rencana aksi", sedangkan isu utama
kajian (definisi dan baseline indikator 1.a dan 1.b, catatan metode IRBI untuk 4.c, sasaran utama) adalah perubahan sasaran
dan indikator, yang jelas tertampung hanya di jalur berkala dan evaluasi paruh waktu 2027. Banjir dan longsor Sumatra 2025
menjadi pemicu ayat (2) untuk program dan kegiatan rencana aksi saja. Pintu berpasal bagi kajian rekomendasi: Unsur
Pengarah (Perpres 1/2019 Pasal 10–11) dan siklus pemantauan dan evaluasi Renas (hlm. 123–125: pra-pelaksanaan triwulan
IV 2026, evaluasi tahunan 2026, evaluasi paruh waktu 2027). Rakor Kemenko PMK untuk peninjauan Renas adalah usulan
penyusun (KERANGKA §6), bukan jalur berpasal. Program Penyusunan Peraturan BNPB 2026 belum memuat perubahan Renas, tetapi
Perka BNPB 6/2014 Pasal 8 ayat (2) membuka penyusunan rancangan di luar program itu lewat izin prakarsa Kepala BNPB.

### Temuan bersumber

- **T2.1** Perban BNPB 1/2025 Pasal 7: (1) "RENAS PB Tahun 2025-2029 ditinjau secara berkala setiap 2 (dua) tahun sesuai hasil
  pemantauan, pengendalian, dan evaluasi pelaksanaan"; (2) "Dalam hal diperlukan, RENAS PB Tahun 2025-2029 dapat ditinjau
  sewaktu-waktu jika terjadi bencana sesuai hasil pemantauan, pengendalian, dan evaluasi"; (3) pemantauan, pengendalian, dan
  evaluasi Renas menjadi bagian dari pemantauan, pengendalian, dan evaluasi RIPB 2020–2044. Ditetapkan 6 Januari 2025. Sumber:
  `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` hlm. 4–5 [`bnpb-2025-renas`]. **resmi** (primer).
- **T2.2** Renas §4.6 Pembaruan: perubahan berdasarkan peninjauan berkala "dilakukan maksimal di tahun ketiga periode
  pelaksanaan"; perubahan karena bencana "dilakukan maksimal di tahun keempat" dan "dapat dilakukan terhadap program dan
  kegiatan dalam rencana aksi"; untuk keduanya, rekomendasi peninjauan "harus termuat dalam hasil pemantauan dan evaluasi
  tahunan atau evaluasi paruh waktu". Sumber: idem hlm. 125. **resmi** (primer).
- **T2.3** Renas §4.5: pemantauan pra-pelaksanaan pada triwulan IV tahun T-1 dengan meninjau Renja K/L penanggung jawab; forum
  koordinasi dengan K/L penanggung jawab paling lambat triwulan II tahun berjalan; evaluasi tahunan "maksimal hingga minggu
  terakhir di TW II tahun berikutnya"; evaluasi paruh waktu di tahun ketiga dengan luaran antara lain "Rekomendasi perbaikan
  RENAS PB Tahun 2025-2029 (bila perlu)". Sumber: idem hlm. 123–124. **resmi** (primer).
- **T2.4** Perpres 87/2020 (RIPB 2020–2044): Pasal 3 ayat (3) RIPB menjadi bahan RPJMN dan RPJMD; Pasal 4 ayat (2) Renas
  ditetapkan Kepala BNPB; Pasal 6 pemantauan tahunan dilaporkan kepada Presiden melalui menteri koordinator bidang pembangunan
  manusia dan kebudayaan; Pasal 7 ayat (1) RIPB ditinjau berkala tiap lima tahun atau sewaktu-waktu. Sumber: riset E §E11(a),
  teks dibuka di https://peraturan.bpk.go.id/Details/146481/perpres-no-87-tahun-2020 (diakses 23 Okt 2026)
  [`ri-2020-perpres87`]. **resmi** (primer lewat riset E; teks tidak ada di korpus lokal).
- **T2.5** PP 21/2008 Pasal 6 ayat (2)–(7): perencanaan PB berbasis analisis risiko, dikoordinasikan BNPB/BPBD, berlaku lima
  tahun, ditinjau tiap dua tahun. Sumber: riset E §E11(d) [`ri-2008-pp21`]. **resmi** (primer lewat riset E).
- **T2.6** Perpres 1/2019: BNPB dikoordinasikan kementerian koordinator bidang pembangunan manusia dan kebudayaan (Pasal 6);
  Unsur Pengarah "mempunyai tugas memberikan masukan dan saran kepada Kepala dalam penyelenggaraan penanggulangan bencana"
  (Pasal 10), dengan fungsi perumusan konsep kebijakan, pemantauan, dan evaluasi (Pasal 11); Ketua Unsur Pengarah dijabat
  Kepala dengan 20 anggota (Pasal 12). Sumber: `data/lembaga/mentah/teks/perpres-1-2019.json.gz` hlm. 4–5
  [`ri-2019-perpres1`]. **resmi** (primer).
- **T2.7** Program Penyusunan Peraturan BNPB 2026 (Keputusan Kepala BNPB 327/2025, ditetapkan 31 Desember 2025) memuat 11
  rancangan; tidak satu pun perubahan Perban 1/2025. Butir 11: "Monitoring dan Evaluasi Rencana Induk Penanggulangan Bencana
  Tahun 2020-2045", pemrakarsa Deputi Bidang Sistem dan Strategi, Direktorat Pengembangan Strategi Penanggulangan Bencana.
  Sumber: `data/raw/hukum/teks/keputusan-kepala-nomor-327-tahun-2025.json` hlm. 3 dan 5 [`bnpb-2025-progsun`]; kunci
  `progsun.2026.jumlah_rancangan` (usulan bab air). **resmi** (primer).
  - *Angka berdampingan:* Progsun menulis RIPB "2020-2045"; Renas Pasal 7 ayat (3) dan Perpres 87/2020 menulis 2020–2044. Masuk
    lampiran Penyelarasan dokumen BNPB dengan suara BNPB ("BNPB menyelaraskan …"), tidak di badan teks (KERANGKA §2 butir 1).
  - Butir 7 Progsun 2026: "Perubahan atas Peraturan Kepala BNPB Nomor 6 Tahun 2014 tentang Pembentukan Produk Hukum di
    Lingkungan BNPB", pemrakarsa Biro Hukum, Organisasi, dan Kerja Sama (hlm. 4).
- **T2.7a** Perka BNPB 6/2014 tentang Pembentukan Produk Hukum di Lingkungan BNPB (ditetapkan 1 April 2014, BN 2014/557,
  status berlaku) Pasal 8: (1) Tim Teknis menyusun rancangan Peraturan Kepala BNPB berdasarkan Proleg PB; (2) "Tim Teknis
  menyusun rancangan Peraturan Kepala BNPB di luar Proleg PB, setelah terlebih dahulu mengajukan permohonan izin prakarsa
  kepada Kepala BNPB"; (3)–(4) draf awal didahului kajian yang memuat dasar pemikiran, pokok, dan lingkup materi. Sumber:
  `data/raw/hukum/teks/perka-nomor-6-tahun-2014.json` hlm. 5–6; `data/raw/hukum/indeks.json` [`bnpb-2014-perka6`]. **resmi**
  (primer). Catatan: perka ini memakai istilah "Peraturan Kepala BNPB" dan "Proleg PB"; penerapannya pada Peraturan BNPB dan
  Progsun adalah padanan penyusun, dan perka ini sedang dijadwalkan diubah (Progsun 2026 butir 7).
- **T2.8** Sasaran dan indikator Renas Tabel 2.8 yang disentuh kajian: 1.a, 1.b, 1.c (T1.5); 2.a kerugian ekonomi langsung
  relatif terhadap PDB 0,137 ke 0,135; 3.a Indeks Pemulihan Pascabencana 6,5 ke 8; 4.c penurunan nilai IRB 1,2% ke 1,2%.
  Sumber: perban-nomor-1-tahun-2025.json hlm. 32 (1.a–1.c dibaca langsung); riset A §2.2 untuk 2.a–4.c [`bnpb-2025-renas`].
  Indikator 2.a identik dengan sasaran utama PN 8 RPJMN (Lampiran I hlm. 201, baseline 0,140 pada 2022; riset E §E11(b)).
  **resmi** (primer).
- **T2.9** Indikator kapasitas dan peringatan dini di dokumen terkait: RPJMN Lampiran III hlm. 913, KP 08.04.01 persentase daerah
  berkapasitas PB minimal sedang, baseline 62 (2023), 67 (2025), 90 (2029); KP 08.04.02 cakupan layanan peringatan dini 6,00,
  6,10, 6,32. Renstra hlm. 128 menulis kapasitas "dari 67% menjadi 90%". Sumber: riset E §E11(b) [`ri-2025-perpres12-rpjmn`];
  `bnpb-2025-renstra`; kunci `rpjmn.kp_kapasitas.baseline_2023` (baru), `renstra.iks_kapasitas_minimal_sedang.awal` (usulan bab
  air). **resmi** (primer).
  - *Dibantah oleh / berdampingan:* kapasitas kab menurut KRB 2022–2026: rendah 315, sedang 190, tinggi 3 dari 508, yaitu 38%
    minimal sedang (riset A §1.4, §7; API-KRB) [`bnpb-2026-krb`]. Alat ukur berbeda; ditulis berdampingan dan dirujuk ke KD-3.
  - *Berdampingan, peringatan dini:* Renas 1.c 11.060 ke 52.000 per 100.000 penduduk daerah berisiko (sekitar 11% ke 52%;
    T1.5) lawan RPJMN KP 08.04.02 6,00% ke 6,32%. Dua target resmi BNPB untuk cakupan peringatan dini berselisih sekitar
    delapan kali pada 2029.
  - *Catatan kode:* riset E §E11(b) menulis kode KP 08.04.02 untuk dua indikator berbeda (cakupan peringatan dini; daerah
    yang menetapkan status darurat dan menerima intervensi sesuai standar). Gambar halaman RPJMN Lampiran III hlm. 913 tidak
    ada di korpus lokal; kode belum dicek ulang (Celah).
- **T2.10** Pemicu ayat (2): banjir dan longsor Sumatra akhir November 2025, 1.202 meninggal dan 140 hilang (T1.4). KERANGKA §2
  butir 1 memakainya sebagai pemicu peninjauan sewaktu-waktu. **resmi** (angka); penetapannya sebagai pemicu **asumsi-kebijakan**.
- **T2.11** Jalur yang direncanakan kajian sendiri: KD-1 (tetapkan kajian sebagai masukan peninjauan Renas dan hari ke-0),
  KD-4 (catatan metode dan baseline IRBI 2025); keputusan 14 hari pertama butir (5) surat ke Kemenko PMK untuk rakor peninjauan
  Renas oleh Biro Perencanaan dan Deputi Bidang Sistem dan Strategi, butir (6) penugasan catatan metode IRBI 2025. Sumber:
  `KERANGKA.md` §6. **asumsi-kebijakan** (usulan penyusun, belum ditetapkan).

### Inferensi

- **I2.1 [Inferensi tim] Dua jalur waktu, dua jenis isi.** Jalur berkala: dua tahun sejak penetapan 6 Januari 2025 jatuh
  sekitar Januari 2027 (Pasal 7 tidak menyebut titik hitung; tafsiran penyusun), dengan perubahan paling lambat tahun ketiga,
  yaitu 2027, bersama evaluasi paruh waktu 2027 yang luarannya "Rekomendasi perbaikan RENAS PB" (T2.3). Hlm. 125 tidak
  membatasi isi perubahan berkala, jadi sasaran dan indikator masuk lewat jalur ini. Jalur bencana: perubahan paling lambat
  tahun keempat, 2028, dengan pemicu Sumatra 2025; hlm. 125 menyebut perubahan ini "dapat dilakukan terhadap program dan
  kegiatan dalam rencana aksi", sehingga tidak jelas menampung perubahan sasaran atau indikator (T2.1, T2.2, T2.10).
  Pemetaan isu ke jalur ada di I2.6.
- **I2.2 [Inferensi tim] Titik masuk yang tersisa.** Evaluasi tahunan 2025 seharusnya selesai paling lambat akhir triwulan II
  2026, jadi sudah lewat (T2.3). Titik masuk berikutnya: pemantauan pra-pelaksanaan triwulan IV 2026 untuk Renja K/L 2027 (saat
  kajian ditetapkan), evaluasi tahunan 2026 (paling lambat akhir triwulan II 2027), dan evaluasi paruh waktu 2027. Dua yang
  terakhir adalah dokumen tempat rekomendasi peninjauan wajib termuat (T2.2). Bila hari ke-0 jatuh November 2026, rekomendasi
  berlembaga dapat dipetakan ke Renja 2027 dalam pemantauan pra-pelaksanaan.
- **I2.3 [Inferensi tim] Masukan RIPB.** Perpres 87/2020 Pasal 7 membuka peninjauan RIPB lima tahunan, dan tahap pertama RIPB
  berakhir 2024 (T2.4). Kajian dapat menyebut dirinya masukan peninjauan Renas PB dan RIPB sekaligus; pelaksanaan peninjauan
  RIPB tidak ditemukan (Celah), jadi kalimatnya "dapat menjadi masukan", bukan "menjadi bahan peninjauan RIPB yang sedang
  berjalan".
- **I2.4 [Inferensi tim] Status dokumen.** Kajian berstatus kajian rekomendasi dan tidak menetapkan apa pun sendiri. Pintu
  yang berpasal untuk masukan kajian: Unsur Pengarah (masukan dan saran kepada Kepala, fungsi perumusan konsep kebijakan,
  pemantauan, dan evaluasi; Perpres 1/2019 Pasal 10–11; T2.6) dan siklus pemantauan dan evaluasi Renas (hlm. 123–125; T2.2,
  T2.3). Kemenko PMK berpasal sebagai pengoordinasi BNPB (Perpres 1/2019 Pasal 6) dan penerus laporan pemantauan RIPB ke
  Presiden (Perpres 87/2020 Pasal 6), tetapi tidak ada pasal yang menjadikan rakor Kemenko PMK jalur peninjauan Renas; rakor
  menko di Perpres 46/2026 untuk keadaan tertentu (T3.13). Surat ke Kemenko PMK untuk rakor peninjauan Renas adalah usulan
  penyusun (T2.11, **asumsi-kebijakan**). Ini isi subbab 1.5, dengan kedua kelompok pintu ditulis terpisah.
- **I2.5 [Inferensi tim] Instrumen.** Perubahan Renas berbentuk Peraturan BNPB. Progsun 2026 belum memuatnya (T2.7), tetapi
  Perka 6/2014 Pasal 8 ayat (2) membuka penyusunan rancangan di luar program penyusunan lewat permohonan izin prakarsa kepada
  Kepala BNPB (T2.7a), dan ayat (3) mensyaratkan kajian materi, yang dapat diisi kajian ini. Jadi perubahan Renas pada 2026
  atau 2027 tidak terhalang oleh Progsun; yang diperlukan adalah izin prakarsa. Pemrakarsa yang paling dekat menurut tugas
  adalah Deputi Bidang Sistem dan Strategi (pemrakarsa monev RIPB). Usulan tabel yang berubah dari Renas tinggal di Bab 12
  dan Lampiran I (prinsip 13 dan 17).
- **I2.6 [Inferensi tim] Apa yang dibawa ke peninjauan, menurut jalurnya.** (a) Jalur berkala dan evaluasi paruh waktu 2027
  (sasaran dan indikator): definisi, penyebut, dan baseline 1.a dan 1.b, termasuk hubungannya dengan IKU kematian Renstra
  (T1.6, T1.15); catatan metode IRBI 2025 sebagai prasyarat 4.c (T1.9, T1.10); selisih target peringatan dini Renas 1.c
  (sekitar 11% ke 52%) lawan RPJMN KP 08.04.02 (6,00% ke 6,32%) (T1.5, T2.9); dua ukuran kapasitas yang berbeda (62% atau
  67% lawan 38%; T2.9). (b) Jalur bencana dengan pemicu Sumatra 2025 (program dan kegiatan rencana aksi): kegiatan
  prabencana dan kedaruratan untuk banjir dan longsor yang rinciannya di Bab 7 dan Bab 11. Bab 1 hanya menyebutnya sebagai
  daftar isu; angka dan pilihan ada di Bab 5 dan Bab 13.

### Celah

- Laporan pemantauan dan evaluasi tahunan Renas 2025 (tenggat akhir triwulan II 2026) tidak ditemukan; tidak diketahui apakah
  sudah memuat rekomendasi peninjauan. Permintaan ke Deputi Bidang Sistem dan Strategi.
- Pelaksanaan peninjauan lima tahunan RIPB (tahap 2020–2024) tidak ditemukan.
- (Ditutup) Tata cara di luar Progsun sudah dibaca: Perka 6/2014 Pasal 8 ayat (2) (T2.7a). Yang tersisa: perka ini sedang
  dijadwalkan diubah (Progsun 2026 butir 7), jadi ketentuan izin prakarsa perlu dicek ulang bila perubahannya terbit sebelum
  naskah final.
- Kode ganda KP 08.04.02 di riset E §E11(b) belum dicek ke gambar halaman RPJMN Lampiran III hlm. 913 (tidak ada di korpus
  lokal). Definisi dan penyebut "cakupan layanan peringatan dini" RPJMN dan Renas 1.c tidak tertulis di sumber yang dibaca.
- Teks Perpres 87/2020, PP 21/2008, dan lampiran Perpres 12/2025 dibuka riset E dari JDIH BPK tetapi tidak disimpan di korpus
  lokal; kutipan pasal di naskah memakai rumusan riset E dan sebaiknya dicek ulang ke teks sebelum final.
- Unit OTK penanggung jawab pemantauan dan evaluasi Renas menurut Perban 6/2025 jo. 11/2025 belum dicek; unit disebut dengan
  "padanan penyusun" bila belum dipastikan.

---

## PK3. Jenis bencana apa yang dicakup, dan apa arti kerusuhan sosial dan mitigasi dalam kajian ini?

### Inti

Kajian mencakup 13 jenis: sembilan bencana alam (gempa bumi, tsunami, gunung api, banjir dan banjir bandang, tanah longsor,
cuaca ekstrem, gelombang ekstrem dan abrasi, kekeringan, karhutla), tiga nonalam (epidemi dan pandemi, kebakaran industri dan
kegagalan teknologi, kebakaran TPA), dan satu sosial (konflik dan kerusuhan sosial antarkelompok), sesuai P11 dan UU 24/2007
Pasal 1 angka 2–4. Kerusuhan sosial dibatasi pada konflik antarkelompok atau antarkomunitas masyarakat (UU 24/2007 Pasal 1
angka 4; UU 7/2012 Pasal 1 angka 1); unjuk rasa yang berhadapan dengan aparat adalah urusan keamanan dan ketertiban (UU 2/2002
Pasal 13). Mitigasi dipakai dalam arti luas, yaitu pengurangan risiko lintas prabencana, tanggap darurat, dan pascabencana;
arti ini sejalan dengan definisi Pasal 1 angka 9 tetapi lebih luas daripada letak mitigasi di Pasal 44, sehingga ditulis
sebagai definisi kajian. Definisi kerusuhan kajian lebih sempit daripada uraian Renas hlm. 6, yang juga menyebut kerusuhan
bermotif ekonomi; penyempitan itu pilihan kajian (M01, P24). Kebakaran gedung dan permukiman di luar lingkup sebagai keputusan
lingkup (P11, K21; asumsi-kebijakan), bukan akibat kewenangan: UU 23/2014 Lampiran E menaruh sub-urusan Bencana maupun
Kebakaran di semua tingkat pemerintahan, dan Renas hlm. 29 menyebut kebakaran permukiman sebagai risiko nonalam yang
meningkat. Kebakaran industri tetap masuk karena kajian menggolongkannya sebagai gagal teknologi (UU 24/2007 Pasal 1 angka 3;
Juklak 7/2023 kode 203), walaupun pemadamannya tunduk pada sub-urusan Kebakaran yang sama.

### Temuan bersumber

- **T3.1** UU 24/2007 Pasal 1 angka 2: bencana alam "antara lain berupa gempa bumi, tsunami, gunung meletus, banjir, kekeringan,
  angin topan, dan tanah langsor"; angka 3: bencana nonalam "antara lain berupa gagal teknologi, gagal modernisasi, epidemi, dan
  wabah penyakit"; angka 4: bencana sosial "yang meliputi konflik sosial antarkelompok atau antarkomunitas masyarakat, dan
  teror". Sumber: `data/lembaga/mentah/teks/uu-24-2007.json.gz` hlm. 2 [`ri-2007-uu24`]. **resmi** (primer).
- **T3.2** UU 24/2007 Pasal 1 angka 9: "Mitigasi adalah serangkaian upaya untuk mengurangi risiko bencana, baik melalui
  pembangunan fisik maupun penyadaran dan peningkatan kemampuan menghadapi ancaman bencana"; angka 6 (kegiatan pencegahan
  bencana) dan angka 16 (pencegahan bencana: mengurangi atau menghilangkan risiko lewat pengurangan ancaman dan kerentanan).
  Sumber: idem hlm. 3–4. **resmi** (primer).
- **T3.3** Sistematika tahap UU 24/2007: Pasal 33, penyelenggaraan PB "terdiri atas 3 (tiga) tahap meliputi: a. prabencana; b.
  saat tanggap darurat; dan c. pascabencana"; Pasal 34, prabencana meliputi situasi tidak terjadi bencana dan situasi terdapat
  potensi bencana; Pasal 35, situasi tidak terjadi bencana meliputi delapan kegiatan, antara lain pengurangan risiko bencana,
  pencegahan, pemaduan dalam perencanaan pembangunan, dan penegakan rencana tata ruang; Pasal 44, situasi terdapat potensi
  bencana meliputi "a. kesiapsiagaan; b. peringatan dini; dan c. mitigasi bencana"; Pasal 47, mitigasi "dilakukan untuk
  mengurangi risiko bencana bagi masyarakat yang berada pada kawasan rawan bencana" lewat penataan tata ruang, pengaturan
  pembangunan dan tata bangunan, serta pendidikan, penyuluhan, dan pelatihan; Pasal 48, tanggap darurat. Sumber: idem hlm.
  17–18, 21–23. **resmi** (primer).
  - *Dibantah oleh (sebagian):* definisi kerja KERANGKA §2 butir 3 ("mitigasi … dalam arti luas pengurangan risiko lintas tiga
    tahap") lebih luas daripada letak mitigasi di Pasal 44 dan 47, yang menaruhnya di prabencana. Definisi Pasal 1 angka 9 tidak
    membatasi tahap. Keduanya ditulis; arti luas diberi label definisi kajian.
- **T3.4** UU 7/2012 Pasal 1 angka 1: "Konflik Sosial ... adalah perseteruan dan/atau benturan fisik dengan kekerasan antara dua
  kelompok masyarakat atau lebih yang berlangsung dalam waktu tertentu dan berdampak luas yang mengakibatkan ketidakamanan dan
  disintegrasi sosial sehingga mengganggu stabilitas nasional dan menghambat pembangunan nasional"; angka 2: penanganan konflik
  mencakup pencegahan konflik, penghentian konflik, dan pemulihan pascakonflik. Disahkan 10 Mei 2012, status berlaku. Sumber:
  `data/lembaga/mentah/teks/uu-7-2012.json.gz` hlm. 2; `data/lembaga/sumber.csv` [`ri-2012-uu7`]. **resmi** (primer).
- **T3.5** UU 2/2002 Pasal 13: tugas pokok Polri "a. memelihara keamanan dan ketertiban masyarakat; b. menegakkan hukum; dan c.
  memberikan perlindungan, pengayoman, dan pelayanan kepada masyarakat". UU 5/2026 (17 Juni 2026), perubahan ketiga, mengubah
  Pasal 9, 14, 19, 21, 26, 28, 30, 37, 39 dan menyisipkan pasal baru, tanpa mengubah Pasal 13. Sumber:
  `data/lembaga/mentah/teks/uu-2-2002.json.gz` hlm. 6; `uu-5-2026.json.gz` [`ri-2002-uu2`]. **resmi** (primer).
- **T3.6** UU 23/2014 Lampiran huruf E (Ketenteraman dan Ketertiban Umum serta Perlindungan Masyarakat): sub-urusan 2 Bencana
  dibagi menjadi penanggulangan bencana nasional, provinsi, dan kabupaten/kota; sub-urusan 3 Kebakaran: pusat menstandardisasi
  sarana-prasarana dan kompetensi pemadam serta menyelenggarakan sistem informasi kebakaran, provinsi memetakan rawan
  kebakaran, kab/kota melaksanakan "pencegahan, pengendalian, pemadaman, penyelamatan, dan penanganan bahan berbahaya dan
  beracun kebakaran dalam Daerah kabupaten/kota", inspeksi peralatan proteksi, investigasi kejadian, dan pemberdayaan
  masyarakat. Sumber: `data/lembaga/mentah/teks/uu-23-2014.json.gz` PDF hlm. 332–333 [`ri-2014-uu23`]. **resmi** (primer).
- **T3.7** Juklak BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana (ditetapkan 29 Desember 2023): 13 jenis ancaman
  dalam 3 klasifikasi. Alam: 101 banjir (termasuk rob, banjir bandang, banjir dan tanah longsor, tanggul jebol), 102 tanah
  longsor, 103 gelombang pasang dan abrasi, 104 cuaca ekstrem, 105 kekeringan, 106 kebakaran hutan dan lahan, 107 gempa bumi,
  108 tsunami, 109 erupsi gunung api. Nonalam: 201 epidemi dan wabah penyakit, 202 "Kebakaran gedung dan pemukiman", 203 gagal
  teknologi (kegagalan dan kecelakaan industri). Sosial: 301 konflik sosial, dengan nama kejadian "Konflik sosial", "Teror",
  dan "Kerusuhan sosial". Ambang kejadian bencana: 1 meninggal, 50 terdampak/luka/mengungsi, 5 rumah atau fasilitas rusak, 1 ha
  lahan, permintaan bantuan nasional, atau status darurat. Sumber: `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` hlm.
  5–7, 10 [`bnpb-2023-juklak7`]; kunci `juklak7_2023.jumlah_jenis`. **resmi** (primer; katalog JDIH BNPB tanpa PDF, teks dari
  salinan bercap di situs UNFPA).
- **T3.8** KRB 2022–2026 memetakan 14 bahaya: gempa bumi, tsunami, letusan gunung api, banjir, banjir bandang, kekeringan,
  karhutla, tanah longsor, likuefaksi, cuaca ekstrem, gelombang ekstrem dan abrasi, COVID-19, epidemi wabah penyakit, kegagalan
  teknologi. Sumber: Renas Tabel 2.2 hlm. 22 [`bnpb-2025-renas`]; kunci `krb2022.jumlah_bahaya`. **resmi** (primer).
- **T3.9** IRBI menghitung sembilan ancaman: "gempa bumi, tsunami, letusan gunung api, tanah longsor, banjir, kekeringan,
  kebakaran hutan dan lahan, cuaca ekstrem, serta abrasi". Sumber: `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` hlm. 5
  [`bnpb-2025-renstra`]. **resmi** (primer).
- **T3.10** Renas menggolongkan karhutla sebagai ancaman hidrometeorologis (hlm. 6), menyebut ancaman nonalam termasuk wabah,
  zoonosis, hama dan penyakit tanaman, serta kegagalan teknologi "seperti kecelakaan industri, transportasi, konstruksi, sampai
  kegagalan teknologi nuklir, biologi, dan kimia" (hlm. 6). Bunyi utuh tentang bencana sosial (hlm. 6): "Di samping itu juga
  bencana sosial seperti konflik sosial, dan ekonomi yang menimbulkan kerusuhan yang berakibat pada jatuhnya korban jiwa,
  kerusakan aset dan kerugian yang besar." Hlm. 29: "Pertumbuhan penduduk yang pesat dan peningkatan kepadatan penduduk di
  kawasan permukiman meningkatkan risiko bencana non alam seperti bencana kebakaran permukiman", disusul risiko dari
  peningkatan kegiatan industri migas, kimia berbahaya, dan nuklir. Hlm. 30: potensi konflik sosial muncul antara lain akibat
  "ketimpangan sosial dan ekonomi, isu etnis dan agama, pemanfaatan identitas politik, sengketa atas tanah dan sumber daya
  alam, migrasi masuk". Sumber: perban-nomor-1-tahun-2025.json hlm. 6, 29–30 [`bnpb-2025-renas`]. **resmi** (primer).
- **T3.11** DIBI kebakaran permukiman (kode 202): 2025 kejadian bencana 327 kejadian, 145 meninggal, 6 hilang, 12.797 mengungsi;
  semua laporan 881 kejadian, 149 meninggal. 2024: 74 kejadian dan 36 meninggal (kejadian bencana), 83 dan 36 (semua laporan).
  Nonalam, sosial, dan lainnya praktis baru tercatat sejak 2024. Sumber: `data/dibi/rekap_nasional_tahunan.csv`
  [kode_jenis_juklak=202]; `data/dibi/README.md` (Patahan seri 2024) [`bnpb-dibi`]; kunci
  `dibi.kebakaran_permukiman.kejadian_bencana.2025`, `dibi.kebakaran_permukiman.meninggal_bencana.2025`,
  `dibi.kebakaran_permukiman.kejadian_semua.2025`, `dibi.kebakaran_permukiman.meninggal_semua.2025`. **resmi** (primer).
  - *Angka berdampingan:* KERANGKA §5 BAB 1 menulis 881 kejadian dan 149 meninggal (versi semua laporan). Versi kejadian bencana
    327 dan 145. Kedua versi berdasar DIBI yang sama.
- **T3.12** DIBI 2025 jenis lain dalam lingkup: konflik sosial 4 kejadian bencana, 8 meninggal, 2.981 mengungsi; gagal teknologi 3
  kejadian, 69 meninggal, 2 hilang; epidemi dan wabah 3 kejadian, 28 meninggal. Kerusuhan akhir Agustus 2025 tidak tercatat
  sebagai konflik sosial di DIBI (selain satu baris Manokwari); Komnas HAM mencatat 11 meninggal (sekunder). COVID-19 dan
  Plumpang 2023 tidak tercatat di DIBI; kebakaran TPA tidak punya jenis tersendiri. Sumber: `rekap_nasional_tahunan.csv`
  [tahun=2025]; `data/dibi/README.md` (Kejadian besar; Keterbatasan); `data/nonalam-sosial/README.md` [`bnpb-dibi`]; kunci lama
  `sosial.kerusuhan2025.meninggal_dibi`, `sosial.kerusuhan2025.meninggal_komnas`. **resmi** (DIBI) dan sekunder (Komnas HAM lewat
  media).
- **T3.13** Perpres 46/2026 Pasal 3 ayat (2): penyelenggaraan PB dalam keadaan tertentu oleh Kepala BNPB dilakukan pada kondisi
  "a. adanya potensi Bencana dengan tingkat ancaman maksimum yang disebabkan oleh faktor alam, nonalam, dan/atau sosial; b.
  telah terjadi evakuasi/penyelamatan/pengungsian atau gangguan fungsi pelayanan umum yang berdampak luas ...; dan/atau c.
  pemerintah daerah yang wilayahnya dalam proses rekonsiliasi pascakonflik sosial dan memiliki kapasitas fiskal sangat rendah
  atau rendah"; ayat (1) mensyaratkan keputusan rapat koordinasi yang dikoordinasikan menteri koordinator. Sumber:
  `data/raw/hukum/teks/perpres-nomor-46-tahun-2026.json` hlm. 3 [`ri-2026-perpres46`]. **resmi** (primer).
- **T3.14** Keputusan pemilik P11: "Nonalam: pandemi, kebakaran industri, kebakaran TPA. Sosial: kerusuhan dan konflik"; P10:
  skenario terburuk per jenis. KERANGKA §2 butir 3: kebakaran TPA sebagai kategori kajian berlabel tafsiran penyusun; teror dan
  gagal modernisasi tidak dikaji (PEDOMAN §A6); KERANGKA §1 M01 dan P24: Mei 1998 dan Agustus 2025 keluar dari analog. Sumber:
  `KEPUTUSAN.md`; `KERANGKA.md` §1, §2. **asumsi-kebijakan** (keputusan lingkup).
- **T3.15** UU 39/1999 tentang Hak Asasi Manusia berstatus berlaku (LN 1999/165) menurut JDIH BPK. Sumber:
  https://peraturan.bpk.go.id/Details/45361/uu-no-39-tahun-1999 (diakses 24 Okt 2026) [`ri-1999-uu39`]. **resmi** (metadata;
  teks pasal tidak dibuka).
- **T3.16** Konflik sosial berada di dua rezim: status keadaan konflik ditetapkan kepala daerah atau Presiden menurut UU 7/2012,
  sementara konflik sosial juga bencana sosial menurut UU 24/2007, dan sejak Perpres 46/2026 BNPB dapat bertindak dalam keadaan
  tertentu bagi daerah pascakonflik. Sumber: `data/lembaga/celah.csv` C10 (disimpulkan paket lembaga dari teks resmi). **resmi**
  (teks); C10 = pemetaan paket.
- **T3.17** Batas pemisahan kebakaran industri di DIBI. Juklak 7/2023 hlm. 6 memuat nama kejadian 202 hanya "Kebakaran gedung
  dan pemukiman" dan 203 "Kegagalan industri" dan "Kecelakaan industri"; "gedung" di 202 dapat mencakup gedung industri dan
  gudang. Data DIBI yang ditarik paket (`mentah/dibi_nasional.json`, tabel `mv_dibi_dampak_by_kejadian`) untuk 2025 hanya
  memuat satu subjenis di kode 202 (`id_tipe_bencana` 2020, "Kebakaran Gedung dan Permukiman"): 327 kejadian bencana, 145
  meninggal, 6 hilang, ditambah 554 laporan di bawah ambang (4 meninggal); kode 203 satu subjenis (2030, "Gagal Teknologi"):
  3 kejadian bencana, 69 meninggal, 2 hilang. Nama kejadian per baris tidak ada di tabel itu, jadi kebakaran pabrik atau gudang
  yang dicatat di 202 tidak dapat dipisahkan. Sumber: `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` hlm. 6
  [`bnpb-2023-juklak7`]; `data/dibi/mentah/dibi_nasional.json` [tahun=2025, id_tipe_bencana 2020 dan 2030] [`bnpb-dibi`].
  **resmi** (primer); batas pemisahan = keterbatasan data.

### Inferensi

- **I3.1 [Inferensi tim] Taksonomi kajian lawan tiga taksonomi data.** Tabel 1.1 memetakan 13 jenis kajian ke kode Juklak 7/2023,
  bahaya KRB 2022–2026, dan komponen IRBI (T3.7–T3.9). Perbedaan yang ditulis: (a) kebakaran gedung dan permukiman (202) ada di
  Juklak dan DIBI tetapi di luar kajian; padanan kebakaran industri ditulis "203 (kegagalan dan kecelakaan industri); kebakaran
  gedung industri atau gudang yang dicatat di 202 tidak dapat dipisahkan" (lihat T3.17); (b) kode 301 Juklak lebih luas daripada definisi kajian (memuat teror dan kerusuhan
  tanpa syarat antarkelompok), sehingga seri konflik DIBI tidak dipakai apa adanya (KERANGKA §7 butir 14); (c) kebakaran TPA
  tidak punya kode Juklak dan bukan bahaya KRB, sehingga berstatus kategori kajian; (d) likuefaksi adalah bahaya KRB tersendiri
  tetapi dibahas di bawah gempa (Bab 6); (e) konflik, kebakaran TPA, dan kebakaran industri di luar sembilan ancaman IRBI,
  sehingga sel IRBI-nya "tidak dinilai".
- **I3.2 [Inferensi tim] Definisi operasional kerusuhan sosial (Kotak 1.1).** "Kerusuhan sosial dalam kajian ini adalah konflik
  sosial berupa perseteruan atau benturan fisik dengan kekerasan antara dua kelompok masyarakat atau lebih (UU 24/2007 Pasal 1
  angka 4; UU 7/2012 Pasal 1 angka 1)." Di luar lingkup: unjuk rasa yang berhadapan dengan aparat atau negara (urusan keamanan
  dan ketertiban masyarakat, Polri, UU 2/2002 Pasal 13) dan dugaan pelanggaran HAM (Komnas HAM; pasal belum dibuka). Kalimat
  pengecualian ditulis netral tanpa contoh peristiwa politik (P24).
  - *Dibantah oleh (sebagian):* Renas hlm. 6 menyebut "bencana sosial seperti konflik sosial, dan ekonomi yang menimbulkan
    kerusuhan yang berakibat pada jatuhnya korban jiwa" (T3.10), jadi Renas memasukkan kerusuhan bermotif ekonomi tanpa syarat
    antarkelompok; hlm. 30 juga menyebut "pemanfaatan identitas politik" sebagai sumber konflik. Juklak 7/2023 kode 301 pun
    memuat "Kerusuhan sosial" tanpa syarat antarkelompok (T3.7). Definisi kajian karena itu lebih sempit daripada uraian
    Renas, dokumen yang hendak diberi masukan. Alasannya: (1) UU 24/2007 Pasal 1 angka 4 dan UU 7/2012 Pasal 1 angka 1
    mendefinisikan konflik sosial sebagai benturan antarkelompok masyarakat; (2) keputusan M01 dan P24 mengeluarkan unjuk rasa
    yang berhadapan dengan aparat dari analog. Naskah menulis bahwa definisi ini definisi operasional kajian, menyebut uraian
    Renas yang lebih luas di sebelahnya, dan mencatat bahwa kerusuhan bermotif ekonomi antarkelompok tetap masuk.
- **I3.3 [Inferensi tim] Definisi operasional mitigasi (Kotak 1.1).** "Mitigasi dalam judul kajian ini dipakai dalam arti luas
  pengurangan risiko bencana (UU 24/2007 Pasal 1 angka 9) pada ketiga tahap penyelenggaraan, yaitu prabencana, tanggap darurat,
  dan pascabencana (Pasal 33). Dalam sistematika undang-undang, mitigasi bencana adalah salah satu kegiatan prabencana (Pasal
  44 dan 47); kajian memakai arti yang lebih luas karena strateginya mencakup ketiga tahap." Label: definisi kajian
  (asumsi-kebijakan). Subjudul T10 ("Strategi Prabencana, Tanggap Darurat, dan Pascabencana") konsisten dengan arti ini.
- **I3.4 [Inferensi tim] Kebakaran gedung dan permukiman (K21).** Pengecualian ini keputusan lingkup kajian (P11 tidak
  menyebut kebakaran permukiman; K21 meminta paragraf penjelasan), berlabel **asumsi-kebijakan**, bukan akibat kewenangan.
  UU 23/2014 Lampiran E tidak membedakan kebakaran dari banjir dalam hal tingkat pemerintahan: sub-urusan Bencana dibagi ke
  pusat, provinsi, dan kab/kota, dan sub-urusan Kebakaran juga memberi pusat peran (standardisasi sarana-prasarana dan
  kompetensi pemadam, sistem informasi kebakaran) (T3.6). Sub-urusan Kebakaran berlaku pula bagi kebakaran industri dan TPA,
  yang justru dikaji. Berdampingan: Renas hlm. 29 menyebut kebakaran permukiman sebagai risiko nonalam yang meningkat (T3.10),
  dan Juklak 7/2023 menggolongkannya bencana nonalam kode 202 (T3.7). Alasan lingkup yang dapat ditulis: (1) UU 24/2007
  Pasal 1 angka 3 menyebut gagal teknologi, epidemi, dan wabah, tidak menyebut kebakaran permukiman (daftar "antara lain",
  jadi tidak menutup); (2) kebakaran permukiman berulang dalam jumlah besar dengan korban per kejadian kecil (327 kejadian
  bencana, 145 meninggal pada 2025; T3.11), sedangkan kajian memusatkan diri pada skenario terburuk per jenis (P10); (3)
  kebakaran industri masuk sebagai bagian gagal teknologi (KERANGKA §2 butir 3; kode 203) yang potensi korbannya massal
  (Plumpang 2023), dan kebakaran TPA masuk sebagai kategori kajian karena keputusan P11. Ketiga alasan itu tafsiran penyusun.
  Konsekuensi yang wajib ditulis: angka utama bab (alam, 1.956) tidak memuat kebakaran permukiman; versi semua klasifikasi
  (2.030) memuat 145 meninggal kebakaran permukiman (7,1%). Naskah menulis kalimat komposisi: "versi semua klasifikasi 2.030
  meninggal termasuk 145 meninggal akibat kebakaran permukiman, jenis yang tidak dikaji".
- **I3.5 [Inferensi tim]** Perpres 46/2026 memperjelas peran BNPB pada konflik sosial (keadaan tertentu dan daerah pascakonflik),
  sedangkan penanganan konflik tetap rezim UU 7/2012 (T3.13, T3.16). Bab 1 cukup menyatakan bahwa kajian membahas konflik dari
  sisi peran BNPB yang berpasal; pembagian peran rinci di Bab 9 dan 12 (prinsip 17).
- **I3.6 [Inferensi tim]** Epidemi dan pandemi masuk lingkup walaupun DIBI tidak mencatat COVID-19 (T3.12). Bab 1 cukup
  menyebut bahwa angka nonalam dan sosial memakai kartu analog berangka (KERANGKA §2 butir 9), tanpa angka di bab ini.

### Celah

- Teks pasal UU 39/1999 tentang fungsi Komnas HAM belum dibuka; naskah menyebut Komnas HAM tanpa nomor pasal sampai teks dibaca.
- Tidak ada definisi resmi "kebakaran TPA" sebagai jenis bencana; ditulis sebagai kategori kajian berlabel tafsiran penyusun.
- Baris kode 301 DIBI belum dipecah ke nama kejadian (konflik sosial, teror, kerusuhan sosial) di paket; isi kode 999 "Lainnya"
  belum diperiksa. Permintaan ke Pusdatinkom.
- PDF Juklak 7/2023 tidak tersedia di katalog JDIH BNPB; teks dibaca dari salinan bercap di situs UNFPA. Naskah final sebaiknya
  merujuk salinan resmi bila Biro Hukum, Organisasi, dan Kerja Sama dapat menyediakannya.
- Penjelasan UU 24/2007 untuk Pasal 1 tidak diperiksa untuk butir taksonomi.
- Kebakaran pabrik atau gudang di baris 202 DIBI 2025 tidak dapat dipisahkan dari data paket (T3.17). Akibatnya angka
  lingkup 2.063 (yang membuang seluruh 202) mungkin sedikit kurang menghitung kebakaran industri. Permintaan ke Pusdatinkom:
  daftar nama kejadian baris 202 tahun 2025 berisi kata pabrik, gudang, industri, atau kilang. Angka utama bab (alam, 1.956)
  tidak terpengaruh.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Label | Catatan |
| --- | --- | --- | --- | --- | --- |
| Gambar 1.1 Meninggal dan hilang akibat bencana alam di Indonesia, 2015–2025 (jiwa) | Batang tegak 11 tahun, dua segmen (meninggal, hilang), nilai di atas batang; anotasi 2018 (Sulawesi Tengah, Lombok, Selat Sunda), 2025 (Sumatra November 2025, 1.342 dari 1.956), penanda patahan seri 2024 | `dibi/rekap_nasional_tahunan.csv` [klasifikasi=alam,cakupan=bencana], jumlah 9 baris kode 101–109 per tahun, kolom meninggal dan hilang (T1.2) | G1 | resmi | Anotasi 3 butir (batas D-28); tanpa sumbu Y; batang 2018 (6.240) jauh di atas yang lain, nilai tetap ditulis. Catatan gambar: "Bencana alam (kode 101–109); versi semua klasifikasi 2025: 2.030 meninggal dan 246 hilang, termasuk jenis yang baru tercatat sejak 2024." Garis setara 0,22 tidak digambar (asumsi-kebijakan) |
| Kotak 1.1 Definisi operasional | Kerusuhan sosial (I3.2) dengan catatan bahwa uraian Renas hlm. 6 lebih luas; mitigasi (I3.3); kebakaran TPA sebagai kategori kajian; yang di luar lingkup: kebakaran gedung dan permukiman (keputusan lingkup), unjuk rasa melawan aparat, teror, gagal modernisasi | UU 24/2007 Pasal 1 angka 2–4, 9, Pasal 33, 44, 47 (T3.1–T3.3); UU 7/2012 Pasal 1 angka 1 (T3.4); UU 2/2002 Pasal 13 (T3.5); Renas hlm. 6, 29–30 (T3.10) | B5.5 (kotak teks, tanpa kode G) | resmi (pasal); definisi dan lingkup kajian ditandai asumsi-kebijakan | Arti luas mitigasi ditulis sebagai definisi kajian, bukan bunyi pasal; pengecualian kebakaran permukiman tidak ditulis sebagai akibat UU 23/2014 |
| Tabel 1.1 Taksonomi dan lingkup kajian | Baris: 13 jenis kajian, ditambah 2 baris di luar lingkup (kebakaran gedung dan permukiman; teror dan gagal modernisasi). Kolom: klasifikasi UU 24/2007; jenis kajian; kode Juklak 7/2023; bahaya KRB 2022–2026; komponen IRBI (ya/tidak dinilai); bab yang membahas; catatan lingkup | T3.1, T3.7–T3.11, T3.14, T3.17; KERANGKA §5 Lingkup | B5.7 | resmi (padanan); lingkup asumsi-kebijakan | Kolom IRBI "tidak dinilai" untuk konflik, TPA, kebakaran industri, epidemi (prinsip 7). Padanan Juklak kebakaran industri: "203; kebakaran gedung industri atau gudang di 202 tidak dapat dipisahkan" (T3.17) |

## Angka untuk registri

Semua kunci baru ditulis lengkap di `naskah/mitigasi/bukti/bab-01.angka.json` (45 entri; `data/angka.json` utama tidak
disunting). Entri berkas+jalur sudah diuji dengan `ikuti()` dari `bangun/kontrak/naskah.py` dan tidak ada kunci yang bentrok
dengan registri utama; entri nilai+pustaka merujuk kunci di `bab-01.pustaka.json`.

| Kunci | Nilai | Berkas + jalur atau pustaka | Label | Sumber |
| --- | --- | --- | --- | --- |
| dibi.nasional.meninggal_semua_laporan.2025 | 2.037 jiwa | dibi/rekap_nasional_tahunan.csv [tahun=2025,klasifikasi=semua,cakupan=semua_laporan].meninggal | resmi | DIBI BNPB |
| dibi.nasional.hilang_semua_laporan.2025 | 252 jiwa | idem .hilang | resmi | DIBI BNPB |
| dibi.nasional.meninggal_hilang.2025 | 2.276 jiwa | nilai; bnpb-dibi | resmi | olah DIBI (versi komposisi, tidak dibanding pra-2024) |
| dibi.alam.meninggal.2025 | 1.735 jiwa | nilai; bnpb-dibi | resmi | olah DIBI (angka utama) |
| dibi.alam.hilang.2025 | 221 jiwa | nilai; bnpb-dibi | resmi | olah DIBI (angka utama) |
| dibi.alam.meninggal.2018 | 5.477 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.meninggal_hilang.2025 | 1.956 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.meninggal_hilang.2018 | 6.240 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.meninggal_hilang.median_2015_2024 | 583,5 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.meninggal_hilang.tanpa_sumatra_2025 | 614 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.lingkup.meninggal_hilang.2025 | 2.063 jiwa | nilai; bnpb-dibi | resmi (lingkup asumsi-kebijakan) | olah DIBI |
| dibi.kebakaran_permukiman.kejadian_bencana.2025 | 327 kejadian | dibi/rekap_nasional_tahunan.csv [tahun=2025,kode_jenis_juklak=202,cakupan=bencana].kejadian | resmi | DIBI BNPB |
| dibi.kebakaran_permukiman.meninggal_bencana.2025 | 145 jiwa | idem .meninggal | resmi | DIBI BNPB |
| dibi.kebakaran_permukiman.kejadian_semua.2025 | 881 kejadian | idem [cakupan=semua_laporan].kejadian | resmi | DIBI BNPB |
| dibi.kebakaran_permukiman.meninggal_semua.2025 | 149 jiwa | idem [cakupan=semua_laporan].meninggal | resmi | DIBI BNPB |
| dibi.lainnya.meninggal.2025 | 45 jiwa | dibi/rekap_nasional_tahunan.csv [tahun=2025,kode_jenis_juklak=999,cakupan=bencana].meninggal | resmi | DIBI BNPB |
| dibi.lainnya.hilang.2025 | 17 jiwa | idem .hilang | resmi | DIBI BNPB |
| dibi.sumatra2025.mengungsi | 970.876 jiwa | dibi/kejadian_besar.csv [kode=sumatra2025,metrik=mengungsi,versi=DIBI].nilai | resmi | DIBI BNPB |
| dibi.sumatra2025.rumah_rusak_berat | 62.956 unit | idem [metrik=rumah_rusak_berat] | resmi | DIBI BNPB (banjir, longsor) |
| hidromet.sumatra2025.rumah_rusak_berat | 63.019 unit | skenario-hidromet/kartu_skenario.csv [skenario=kasus_sumatra_nov2025,metrik=rumah_rusak_berat].nilai | resmi | DIBI BNPB (jenis musim hujan) |
| dibi.sumatra2025.kab_terdampak | 55 kab/kota | dibi/kejadian_besar.csv [kode=sumatra2025,metrik=kab_terdampak,versi=DIBI].nilai | resmi | DIBI BNPB |
| dibi.sumatra2025.porsi_meninggal_hilang_2025 | 68,6% | nilai; bnpb-dibi | resmi | olah DIBI (penyebut alam 1.956) |
| renas.indikator_1a.proyeksi_2025 | 0,22 per 100.000 | nilai; bnpb-2025-renas | resmi | Renas PB Tabel 2.8 hlm. 32 |
| renas.indikator_1b.proyeksi_2025 | 2.643 per 100.000 | nilai; bnpb-2025-renas | resmi | Renas PB Tabel 2.8 hlm. 32 |
| bps.penduduk.2026 | 287.198.383 jiwa | nilai; bps-2026-penduduk | resmi | BPS 2026 |
| bps.penduduk.supas_2025 | 284,67 juta jiwa | nilai; bps-bengkulu-2026-supas | resmi | BPS SUPAS 2025 |
| dibi.alam.per100rb.2025_bps2026 | 0,68 per 100.000 | nilai; bnpb-dibi | resmi (proksi penyusun) | olah DIBI dan BPS |
| dibi.alam.per100rb.2025_supas | 0,69 per 100.000 | nilai; bnpb-dibi | resmi (proksi penyusun) | olah DIBI dan BPS |
| dibi.alam.per100rb.2025_krb | 0,72 per 100.000 | nilai; bnpb-dibi | resmi (proksi penyusun) | olah DIBI dan InaRISK |
| dibi.nasional.per100rb.2025_bps2026 | 0,79 per 100.000 | nilai; bnpb-dibi | resmi | olah DIBI dan BPS |
| dibi.nasional.per100rb.2025_supas | 0,80 per 100.000 | nilai; bnpb-dibi | resmi | olah DIBI dan BPS |
| dibi.nasional.per100rb.2025_krb | 0,84 per 100.000 | nilai; bnpb-dibi | resmi | olah DIBI dan InaRISK |
| renas.indikator_1a.setara_jiwa_2025 | 632 jiwa | nilai; bnpb-2025-renas | asumsi-kebijakan | olah Renas dan BPS |
| renstra.iku_kematian_darurat.2020 | 0,43 per 100.000 | nilai; bnpb-2025-renstra | resmi | Renstra BNPB Tabel 1.7 hlm. 52 |
| renstra.iku_kematian_darurat.2024 | 0,15 per 100.000 | nilai; bnpb-2025-renstra | resmi | Renstra BNPB Tabel 1.7 hlm. 52 |
| dibi.nasional.terdampak_per100rb.2025 | 4.148 per 100.000 | nilai; bnpb-dibi | resmi | olah DIBI dan BPS |
| irbi.aceh.2023 | 146,90 | irbi/irbi_agregat_provinsi.csv [prov_kode=11,tahun=2023].total_sederhana | resmi | InaRISK BNPB; Renstra Tabel 1.1 |
| irbi.sumut.2023 | 140,65 | idem [prov_kode=12,tahun=2023] | resmi | idem |
| irbi.sumbar.2023 | 144,38 | idem [prov_kode=13,tahun=2023] | resmi | idem |
| rpjmn.pp_irb.baseline_2023 | 1,54% | nilai; ri-2025-perpres12-rpjmn | resmi | RPJMN Lampiran III hlm. 913 |
| rpjmn.kp_kapasitas.baseline_2023 | 62% | nilai; ri-2025-perpres12-rpjmn | resmi | RPJMN Lampiran III hlm. 913 |
| juklak7_2023.jumlah_jenis | 13 jenis | nilai; bnpb-2023-juklak7 | resmi | Juklak BNPB 7/2023 hlm. 5–6 |
| krb2022.jumlah_bahaya | 14 bahaya | nilai; bnpb-2025-renas | resmi | Renas Tabel 2.2 hlm. 22 |
| wrr.2025.indonesia_peringkat | 3 dari 193 | nilai; wrr-2025 | terverifikasi | WorldRiskReport 2025 |
| wrr.2025.indonesia_wri | 39,80 | nilai; wrr-2025 | terverifikasi | WorldRiskReport 2025 |

**Kunci lama yang dipakai ulang (tidak diubah):** `dibi.nasional.meninggal.2025` (2.030), `dibi.nasional.hilang.2025` (246),
`dibi.nasional.kejadian.2025` (5.440,45), `dibi.sumatra2025.meninggal` (1.202), `dibi.sumatra2025.hilang` (140),
`irbi.nasional.2019` (144,02), `irbi.nasional.2024` (128,52), `irbi.nasional.persen_2019_2024` (−10,76), `irbi.prov.tinggi.2023`
(13), `irbi.kab.tinggi.2023` (168), `sosial.kerusuhan2025.meninggal_dibi`, `sosial.kerusuhan2025.meninggal_komnas`,
`tesis.mitigasi`. **Kunci usulan bab air yang juga dipakai:** `airjawa.nasional.penduduk_krb` (271.680.290),
`renas.indikator_1c.2025`, `renas.indikator_1c.2029`, `renstra.iks_kapasitas_minimal_sedang.awal`,
`rpjmn.iks_penurunan_irb_persen`, `progsun.2026.jumlah_rancangan`.

**Catatan untuk penggabung:** (0) `tesis.mitigasi` di registri utama masih memakai `dibi.nasional.meninggal.2025` dan
`dibi.nasional.hilang.2025`; pesan inti KERANGKA (V06) memakai alam, jadi kunci tesis perlu diganti ke `dibi.alam.meninggal.2025`
dan `dibi.alam.hilang.2025`. (1) 17 entri bernilai hasil hitungan paket (jumlah meninggal dan hilang, median, porsi, rasio per
100.000) ditulis sebagai `nilai` karena registri belum bisa menjumlah; cara hitungnya ada di `catatan`. (2) `bps.penduduk.2026`
ditulis sebagai `nilai` karena `air-jawa.json` menyimpan teks "287.198.383,0" yang tidak dibaca `ikuti()` sebagai angka. (3)
Label `irbi.nasional.persen_2019_2024` di registri utama (resmi) sudah sesuai karena angka itu terbit di Renstra hlm. 52.

## Pustaka

Entri CSL-JSON di `naskah/mitigasi/bukti/bab-01.pustaka.json`: 21 sumber berbeda, semua primer. Lima sama dengan `pustaka.json`
utama (`ri-2007-uu24`, `bnpb-2025-renas`, `bnpb-2025-renstra`, `bnpb-dibi`, `bnpb-irbi`), tiga dari `riset/E-pustaka.json`
(`ri-2020-perpres87`, `ri-2025-perpres12-rpjmn`, `ri-2008-pp21`), tiga dari bab air (`ri-2019-perpres1`, `bnpb-2025-progsun`,
`bnpb-2026-krb`); sepuluh baru.

- Undang-undang: `ri-2007-uu24`, `ri-2012-uu7`, `ri-2002-uu2`, `ri-2014-uu23`, `ri-1999-uu39` (metadata saja).
- Peraturan pemerintah dan presiden: `ri-2008-pp21`, `ri-2019-perpres1`, `ri-2020-perpres87`, `ri-2025-perpres12-rpjmn`,
  `ri-2026-perpres46`.
- Peraturan dan keputusan BNPB: `bnpb-2025-renas`, `bnpb-2025-renstra`, `bnpb-2025-progsun`, `bnpb-2023-juklak7`,
  `bnpb-2014-perka6`.
- Data: `bnpb-dibi`, `bnpb-irbi`, `bnpb-2026-krb`, `bps-2026-penduduk`, `bps-bengkulu-2026-supas`.
- Pembanding internasional: `wrr-2025` (terverifikasi).

## Catatan revisi sesudah pemeriksaan (24 Oktober 2026)

Sepuluh temuan pemeriksa dicek ke sumbernya sebelum diterapkan.

1. **Kritis, seri alam (V06): diterima.** KERANGKA §5 BAB 1, P04 dan V06 dibaca ulang. Angka utama, Inti PK1, T1.2, §0,
   §0.1, I1.2, Gambar 1.1, dan registri kini memakai seri alam; 2.030 dan 246 hanya kalimat komposisi tanpa pembanding
   pra-2024. Satu angka dari pemeriksa **tidak dipakai**: median alam 2015–2024 ditulis pemeriksa 596, tetapi hitungan ulang
   atas `dibi/rekap_nasional_tahunan.csv` (jumlah 9 baris klasifikasi=alam, cakupan=bencana) memberi 276, 578, 378, 6.240,
   589, 418, 815, 895, 308, 603, sehingga median = (589 + 603) / 2 = **583,5**, dan 2025 = 3,35 kali median. Angka lain dari
   pemeriksa cocok: 1.956, 6.240, 1.735, 221, 68,6%, 0,68.
2. **Tinggi, tanpa Sumatra: diterima.** 1.956 − 1.342 = 614, di bawah 2021 (815) dan 2022 (895). Klaim "masih di atas tiap
   tahun 2019–2024" dihapus dari I1.3.
3. **Tinggi, Renstra Tabel 1.7: diterima.** Teks hlm. 52–53 cocok kata per kata (0,43; 0,64; 0,14; 0,10; 0,15; "Tercapai"
   2022–2024). Ditambahkan T1.15; hlm. 53 juga menunjukkan penyebut "penduduk wilayah terdampak", yang memperkuat perbedaan
   metode. 0,68–0,84 kini "proksi penyusun"; perbandingan dengan 0,22 berlabel asumsi-kebijakan.
4. **Tinggi, alasan kewenangan kebakaran: diterima.** UU 23/2014 hlm. 332–333 dan Renas hlm. 29 dicek. Inti PK3, I3.4, dan
   Kotak 1.1 kini menulis pengecualian sebagai keputusan lingkup, dengan alasan masuknya kebakaran industri (gagal teknologi,
   kode 203) dan TPA (P11).
5. **Sedang, batas ayat (2): diterima.** Hlm. 125 dicek. Inti PK2, I2.1, dan I2.6 memetakan isu ke jalur berkala (sasaran dan
   indikator) atau jalur bencana (program dan kegiatan rencana aksi).
6. **Sedang, rakor Kemenko PMK: diterima.** Inti PK2 dan I2.4 memisahkan pintu berpasal dari usulan penyusun.
7. **Sedang, Perka 6/2014: diterima.** Pasal 8 ayat (2) dibaca di korpus lokal; ditambahkan T2.7a dan pustaka
   `bnpb-2014-perka6`; I2.5 diubah; Celah ditutup dengan catatan perubahan perka (Progsun butir 7). Tambahan penyusun:
   perka ini memakai istilah lama ("Peraturan Kepala BNPB", "Proleg PB"), jadi penerapannya pada Peraturan BNPB ditulis
   sebagai padanan.
8. **Sedang, kutipan Renas hlm. 6: diterima.** Kalimat utuh dikutip di T3.10 dan dipasang sebagai "Dibantah oleh
   (sebagian)" di I3.2, bersama hlm. 30.
9. **Sedang, peringatan dini 1.c lawan KP 08.04.02: diterima sebagian.** Selisihnya ditulis berdampingan di T1.5 dan T2.9 dan
   masuk I2.6. Kode ganda KP 08.04.02 terkonfirmasi ada di riset E §E11(b), tetapi **belum dapat dicek** ke gambar halaman
   RPJMN Lampiran III hlm. 913 karena berkas itu tidak ada di korpus lokal; dicatat sebagai Celah PK2.
10. **Sedang, kebakaran industri di 202: diterima.** Data paket dicek (`mentah/dibi_nasional.json`): kode 202 dan 203 tahun
    2025 masing-masing hanya punya satu subjenis, tanpa nama kejadian per baris, jadi pemisahan tidak dapat dilakukan.
    Ditambahkan T3.17, catatan padanan di Tabel 1.1, dan Celah PK3.
