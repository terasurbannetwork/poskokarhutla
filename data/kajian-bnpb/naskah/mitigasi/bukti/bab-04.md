# Berkas bukti BAB 4 HISTORI BENCANA INDONESIA

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9). Penulis bab menulis hanya dari berkas ini
dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-04.angka.json`: kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/mitigasi/bukti/bab-04.pustaka.json`: entri CSL-JSON (36 sumber).

Bahan yang dibaca: `KERANGKA.md` §2, §5 (Bab 4), §6, §7, §8; `KEPUTUSAN.md`; Buku Pegangan L56–L64 (titik tengah
dilarang, angka kunci di depan) dan baris "Program kajian hanya yang terbukti"; `PEDOMAN-DESAIN.md` §C9, tabel kode
grafik G1–G24, §B5.30; `riset/A`–`E`; paket `data/dibi/` (README, `rekap_nasional_tahunan.csv`,
`rekap_provinsi_tahunan.csv`, `kejadian_besar.csv`, `rekonsiliasi.csv`, `mentah/dibi_nasional.json`), paket
`data/nonalam-sosial/` (README, `peristiwa.csv`, `covid19_nasional.csv`, `skenario_terburuk.csv`), paket
`data/skenario-hidromet/` (README, `musim_hujan.csv`, `kartu_skenario.csv`), `data/skenario-geologi/` (README,
`analog.csv`), `data/program-terbukti/kompendium_program.csv` dan `bukti_dampak.csv`, `data/angka.json`; korpus
`data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` (isi: Petunjuk Pelaksanaan BNPB Nomor 7 Tahun 2023) dan
`perban-nomor-5-tahun-2025.json` (Renstra BNPB 2025–2029); sumber web yang dibuka 24 Oktober 2026 (disebut per butir).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah RI, dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal bertinjauan, USGS, ICG, HRW) |
| estimasi-model | Keluaran model yang belum diuji balik terhadap data Indonesia (termasuk model peneliti bertinjauan) |
| asumsi-kebijakan | Pilihan penyusun (jendela, pengelompokan, ambang) |
| sekunder | Berita atau kutipan pihak lain; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**.

Konvensi DIBI yang dipakai di seluruh berkas (dari `dibi/README.md` §Definisi): "kejadian bencana" = cakupan
`bencana` (laporan `is_bencana = true`, ambang Juklak 7/2023); "kejadian alam" = kode jenis 101–109 cakupan `bencana`,
sebanding antartahun untuk cakupan kategori tetapi tidak untuk ambang (saringan `is_bencana` baru berlaku untuk data
2024, jadi 2015–2023 tidak tersaring dan 2024–2025 tersaring; versi alam semua laporan ditulis berdampingan untuk
2024–2025); "semua laporan" = cakupan `semua_laporan`, sama dengan grafik publik DIBI.
Angka DIBI per kejadian besar memakai jendela tanggal dan wilayah pilihan penyusun (`turunan_penyusun = ya`).

---

## Kerangka bab (dari KERANGKA.md §5, BAB 4)

- **Judul:** BAB 4 HISTORI BENCANA INDONESIA (11 hlm).
- **Subbab:** 4.1 Kejadian dan Dampak 2015–2026; 4.2 Kejadian Besar 1996–2025; 4.3 Pola Korban: Kejadian dan Korban
  Bergerak Berbeda; 4.4 Bencana Nonalam dan Sosial dalam Catatan; 4.5 Pelajaran dari Kejadian Besar.
- **Tujuan bab:** memberi histori yang jujur terhadap patahan seri dan menyediakan analog skenario per jenis.
- **Pertanyaan kunci:**
  1. Bagaimana kejadian dan korban berubah 2015–2025 bila patahan seri diperhitungkan?
  2. Kejadian besar apa yang menjadi analog skenario terburuk per jenis?
  3. Pelajaran apa yang konsisten muncul dari kejadian besar?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Kejadian alam 101–109 2015–2025 dan korban: puncak 2018 (5.500 meninggal) dan 2025 (2.030); patahan 2024 ditandai | Dikonfirmasi, diselaraskan ke KERANGKA terbaru (V06, V16): angka utama seri alam 2018 = 5.477 meninggal dan 763 hilang, 2025 = 1.735 meninggal dan 221 hilang; 2.030 hanya versi semua klasifikasi dengan catatan patahan. **Ditambah:** korelasi peringkat kejadian alam dan meninggal alam 2015–2023 (sebelum patahan ambang) 0,17, dan 0,22 bila 2024–2025 ikut (melintasi patahan); geologi 0,91% kejadian alam tetapi 54,3% meninggal alam (P1) |
| Kejadian besar berangka (Merapi 386, Mentawai 447 + 56, Lombok 564, Sulteng 4.140 + 705, Selat Sunda 437 + 16, Jabodetabek 2020, Seroja 184 + 47, Semeru 64 + 9, Cianjur 602, Sumatra 1.202 + 140, karhutla 2015 dan 2019, COVID-19 161.870, Plumpang, Sarimukti, Sambas, Maluku, Poso, Sampit) | **Dikoreksi sebagian:** Lombok DIBI kini 569 (564 adalah angka riset A dengan jendela lain); Seroja 184 + 47 adalah versi Renstra, DIBI 154 + 34; Cianjur DIBI = Renstra 602, tetapi dokumen R3P Cianjur menulis 334 per 7 Des 2022. **Ditambah:** Pangandaran 2006 (665 meninggal, USGS impact-text, terverifikasi; lantai megathrust selatan Jawa), Padang 2009 (DIBI 1.195), Wasior 2010 (170 + 118), Gempa NTT Agustus 2026 (DIBI sementara 151 meninggal di NTT) yang belum ada di `kejadian_besar.csv` (P2) |
| Aceh 2004, Nias 2005, Yogyakarta 2006 hanya setelah sumber primer dibuka | Yogyakarta: USGS 5.749 (terverifikasi). Aceh dan Nias: Buku Utama Rencana Induk tetap tidak ditemukan; buku resmi BRR NAD–Nias dibuka (riset E §E4; seri buku BRR *The Scattered Beads* dibuka ulang 24 Okt 2026) dan memuat 127.720 meninggal dan 93.285 hilang pada halaman capaian 4 tahun, 126.741 meninggal pada teks naratif buku yang sama, serta 966 meninggal (Nias 2005). Status: **bawaan diterapkan, dapat dibalik** (KERANGKA §5 Bab 4 dan §8: buku BRR berlabel resmi) (P2) |
| DIBI tidak mencatat COVID-19, Plumpang, Balongan, Morowali; kerusuhan Agustus 2025 tidak tercatat sebagai konflik sosial | Dikonfirmasi. **Catatan:** paket `nonalam-sosial` menandai kerusuhan Agustus 2025 dan Mei 1998 `luar_lingkup` (prinsip 3: unjuk rasa berhadapan dengan aparat). Rekomendasi data karena itu menyangkut kejelasan klasifikasi, bukan memasukkannya sebagai konflik sosial (Bahan subbab 4.4) |
| Kebakaran gedung dan permukiman 83 (2024) dan 881 (2025), konteks lingkup | Dikonfirmasi pada versi semua laporan; versi kejadian bencana 74 dan 327 (Bahan subbab 4.4) |

- **Komponen (KERANGKA):** Gambar 4.1 kejadian per tahun bertumpuk kelompok geologi, hidrometeorologi, nonalam dan
  sosial dengan penanda patahan 2024 (G9); Gambar 4.2 meninggal dan hilang per tahun (G1); Tabel 4.1 kejadian besar dan
  pelajarannya (B5.7); Tabel 4.2 rekonsiliasi korban kejadian besar (B5.7); Halaman studi kasus 4.1 peringatan dini dan
  evakuasi Merapi 2010 (B5.30; Surono dkk. 2012), dengan InaTEWS dan tsunami Palu 2018 sebagai kotak pembanding
  (KERANGKA §5 Bab 4, versi terbaru).
- **Status data (KERANGKA):** ada; sebagian (Aceh 2004 dan Nias 2005 dari buku BRR, bawaan; R3P Sulteng tidak
  ditemukan; COVID-19 di luar DIBI). **Pembaruan:** naskah penuh Surono dkk. (2012) kini terbuka (salinan PDF McGill),
  termasuk dasar hitungan jiwa terselamatkan; Palu 2018 kini punya dua sumber primer bertinjauan
  (Widiyanto dkk. 2019; Harnantyari dkk. 2020) dan satu dokumen BNPB (Info Bencana September 2018).

Catatan lingkup: aturan lantai skenario (KERANGKA §2 butir 9) berlaku di P2 karena bab ini memasok analog; tiap angka
model di bab ini (model hidrometeorologi, Koplitz dkk., kematian berlebih WHO, perkiraan jiwa terselamatkan Merapi)
ditulis berdampingan dengan angka tercatat. Strategi dan program tidak dibahas di bab ini (prinsip 17); posisi bukti
program yang disebut (InaTEWS, BRR, Lombok, Rekompak) hanya dicatat supaya penulis tidak menyebutnya "terbukti".

---

## P1. Bagaimana kejadian dan korban berubah 2015–2025 bila patahan seri diperhitungkan?

### Inti

Kejadian bencana alam (kode 101–109; sebanding antartahun untuk cakupan kategori, tidak untuk ambang) naik dari 1.694
(2015) ke 5.402 (2021) dan 5.400 (2023), lalu tercatat 3.471,5 (2024) dan 5.077,45 (2025) setelah saringan ambang
Juklak 7/2023 berlaku. Dengan saringan yang disamakan (alam, semua laporan, tanpa ambang seperti 2015–2023), 2024 =
3.550,5 dan 2025 = 8.359,45, yaitu rekor. Jadi turunnya 2023 ke 2024 tidak dapat dibaca sebagai penurunan risiko, dan
tingkat 2025 bergantung pada saringan. Korban tidak mengikuti jumlah kejadian: 11.477 meninggal dan 1.579 hilang
bencana alam pada 2015–2025 (semua klasifikasi 11.873 dan 1.606), dengan dua puncak, 2018 (5.477 meninggal dan 763
hilang) dan 2025 (1.735 dan 221; semua klasifikasi 2.030 dan 246). Korelasi peringkat kejadian alam dan meninggal
alam 2015–2023 hanya 0,17 (0,22 bila 2024–2025 ikut, melintasi patahan). Geologi menyumbang 0,91% kejadian alam
tetapi 54,3% meninggal alam; hidrometeorologi 2025 menewaskan 1.731 orang, 3,2 kali maksimum 2015–2024 (545) dan
2,2 kali maksimum 2008–2024 (774, tahun 2010, Wasior).

### Temuan bersumber

1. **Seri tahunan DIBI 2015–2026:**

   | Tahun | Kejadian bencana | Kejadian alam | Kejadian alam semua laporan | Meninggal bencana | Meninggal alam | Hilang semua klasifikasi | Hilang alam |
   | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
   | 2015 | 1.694 | 1.694 | 1.694 | 219 | 219 | 57 | 57 |
   | 2016 | 2.306 | 2.306 | 2.306 | 482 | 482 | 96 | 96 |
   | 2017 | 2.866 | 2.866 | 2.866 | 309 | 309 | 69 | 69 |
   | 2018 | 3.401 | 3.398 | 3.398 | 5.500 | 5.477 | 764 | 763 |
   | 2019 | 3.829 | 3.814 | 3.814 | 517 | 478 | 112 | 111 |
   | 2020 | 4.649 | 4.649 | 4.649 | 376 | 376 | 42 | 42 |
   | 2021 | 5.402 | 5.402 | 5.402 | 728 | 728 | 87 | 87 |
   | 2022 | 3.544 | 3.544 | 3.544 | 858 | 858 | 37 | 37 |
   | 2023 | 5.400 | 5.400 | 5.400 | 275 | 275 | 33 | 33 |
   | 2024 | 3.548 | 3.471,5 | 3.550,5 | 579 | 540 | 63 | 63 |
   | 2025 | 5.440,45 | 5.077,45 | 8.359,45 | 2.030 | 1.735 | 246 | 221 |
   | 2026 (sementara, s.d. 23 Okt) | 2.299 | 2.204 | 2.859 | 548 | 427 | 21 | 21 |
   | Jumlah 2015–2025 | | 41.621,95 | | 11.873 | 11.477 | 1.606 | 1.579 |

   Sumber: `data/dibi/README.md` (tabel Angka kunci) dan `data/dibi/rekap_nasional_tahunan.csv` (baris
   `klasifikasi=semua, cakupan=bencana`; kolom alam = jumlah sembilan baris `klasifikasi=alam`, kolom "alam semua
   laporan" = jumlah yang sama pada `cakupan=semua_laporan`); DIBI BNPB, ditarik 23 Oktober 2026. Label: resmi (kolom
   alam: olah(resmi)). Sebelum 2024 cakupan bencana sama dengan semua laporan karena saringan `is_bencana` belum
   berlaku; karena itu kolom "alam semua laporan" adalah satu-satunya kolom kejadian dengan saringan yang sama di
   seluruh 2015–2025. Angka utama Bab 4 = kolom alam (V06, V16).
2. **Patahan seri 2024 ada dua:** (a) bendera `is_bencana = false` baru dipakai sejak data 2024, sehingga cakupan
   bencana sebelum 2024 tidak tersaring ambang; (b) kategori nonalam, sosial, dan lainnya praktis baru tercatat sejak
   2024: 2018–2023 hanya 0–15 kejadian per tahun (2018: 3; 2019: 15; 2020–2023: 0), sedangkan 2025 = 363 kejadian
   dengan 295 meninggal. Sumber: `dibi/README.md` §Patahan seri 2024; `rekap_nasional_tahunan.csv` (kode 201, 202,
   203, 301, 999). Label: resmi.
3. **BNPB sendiri mengaitkan angka 2024 dengan "mekanisme pencatatan baru"** (konferensi pers 7 Januari 2025). Sumber:
   `dibi/rekonsiliasi.csv` (`kejadian_nasional`, 2024, nilai 2.107). Label: resmi, verifikasi sekunder (dikutip media);
   hanya untuk menjelaskan patahan, tidak untuk badan teks sebagai angka.
4. **Ambang kejadian bencana Juklak 7/2023:** sedikitnya satu dari enam kriteria (1 orang meninggal; 50 orang
   terdampak, luka, atau mengungsi; 5 unit rumah atau fasilitas publik rusak; 1 hektar lahan; permintaan bantuan
   nasional; status keadaan darurat). Ditetapkan 29 Desember 2023. Sumber:
   `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` halaman 7 (butir 3) dan halaman 10. Label: resmi.
5. **`is_bencana` bukan fungsi ambang murni:** pada 2025 ada 7 meninggal di laporan `is_bencana = false`; meninggal 2025
   = 2.030 (kejadian bencana) / 2.037 (semua laporan) / 1.735 (bencana alam). Sumber: `dibi/README.md` §Definisi.
   Label: resmi.
6. **Patahan kategori hidrometeorologi:** banjir bandang, banjir dan tanah longsor, banjir rob, dan puting beliung baru
   muncul 2018 dan kosong pada 2024; tanah longsor 2024 hanya 219 kejadian (tahun lain 584–1.251). Sumber:
   `data/skenario-hidromet/README.md` (paragraf Patahan kategori DIBI). Label: resmi (pengamatan atas data DIBI).
7. **Kejadian 2024 punya delapan versi, ditulis berdampingan:** 3.636 (DIBI semua laporan), 3.548 (kejadian bencana),
   3.471,5 (bencana alam), 3.472 (CKAN 2010–2024; sama dengan DIBI alam), 3.129 (Buletin BNPB, 11 bulan), 2.107
   (konferensi pers 7 Jan 2025, sekunder), 5.593 (dikutip Antara, sekunder, tidak dapat direproduksi), 1.476 (Tulisan
   Hukum BPK DIY, sekunder). Sumber: `dibi/README.md` §Rekonsiliasi kejadian 2024; `dibi/rekonsiliasi.csv`. Label: per
   baris; hanya empat versi pertama yang resmi primer.
8. **Kejadian 2025 punya empat versi:** 9.305,45 (semua laporan), 5.440,45 (kejadian bencana), 5.077,45 (bencana
   alam), 2.778 (jumlah 12 Buletin bulanan, data Pusdalops sebelum verifikasi triwulan). Angka 9.305 di riset A §4.1
   adalah versi semua laporan dan tidak boleh disebut "kejadian bencana 2025". Sumber: `dibi/README.md`. Label: resmi.
9. **Komposisi korban 2015–2025 per kelompok (cakupan bencana):** geologi (gempa bumi, tsunami, erupsi) 377,2
   kejadian (0,91% dari 41.621,95 kejadian alam) dan 6.236 meninggal (54,3% dari 11.477 meninggal alam);
   hidrometeorologi 41.244,75 kejadian dan 5.241 meninggal (45,7%); nonalam 303, sosial 47, lainnya 46 meninggal.
   Jumlah semua kelompok = 11.873. Sumber: `rekap_nasional_tahunan.csv`. Label: olah(resmi), jumlah baris per kategori.
10. **Hidrometeorologi 2025 di luar rentang sepuluh tahun sebelumnya:** meninggal hidrometeorologi 2015–2024 berkisar 219
    (2015) sampai 545 (2021); 2025 = 1.731 (banjir 1.396, longsor 244, cuaca ekstrem 80), atau 3,18 kali maksimum
    2015–2024. Dengan periode acuan hidrometeorologi KERANGKA §2 butir 9 (DIBI 2008–2025), maksimum sebelumnya 774
    (2010, tahun Wasior), sehingga rasionya 2,24 kali. Kedua rasio ditulis berdampingan; jendela adalah
    asumsi-kebijakan. Sumber: `rekap_nasional_tahunan.csv`. Label: olah(resmi).
11. **Kejadian dan korban hampir tidak berkorelasi:** korelasi peringkat Spearman kejadian alam dan meninggal alam per
    tahun = 0,17 untuk 2015–2023 (n = 9, sebelum patahan ambang; 0,23 bila meninggal ditambah hilang). Bila 2024–2025
    ikut, angkanya 0,22 (n = 11; 0,26 dengan hilang), tetapi seri itu melintasi patahan 2024; dengan kejadian dan
    meninggal alam semua laporan untuk 2024–2025 (saringan seragam) angkanya 0,29. 2021 (5.402) dan 2023 (5.400) adalah
    dua tahun kejadian terbanyak; 2023 mencatat meninggal terendah kedua (275) setelah 2015 (219). Sumber: hitungan tim
    atas `rekap_nasional_tahunan.csv`. Label: olah(resmi).
12. **NAR 2023 menurut Renstra:** "jumlah kejadian bencana menurun dalam tiga tahun terakhir, namun jumlah korban tewas
    meningkat" (tren "Peningkatan Rasio Korban per Kejadian Bencana"). Sumber: Renstra BNPB 2025–2029,
    `perban-nomor-5-tahun-2025.json` halaman 24, Tabel 1.4. Label: resmi (kutipan Renstra atas NAR 2023).
    **Dibantah sebagian oleh** seri DIBI kini: kejadian alam naik 2019 → 2020 → 2021 (3.814 → 4.649 → 5.402) lalu
    turun 2022 (3.544); yang cocok hanya pasangan 2021 → 2022 (kejadian turun, meninggal naik 728 → 858). Tahun dasar
    NAR tidak disebut Renstra; DIBI data hidup.
13. **2026 sementara:** 2.299 kejadian bencana dan 548 meninggal sampai 23 Oktober 2026, termasuk gempa bumi di Nusa
    Tenggara Timur dengan 151 meninggal, 170.055 mengungsi, dan 29.315 rumah rusak berat (DIBI NTT, kategori
    Gempabumi, 3,73 kejadian; nasional Agustus 2026: 152 meninggal). Sumber: `rekap_provinsi_tahunan.csv`
    (`tahun=2026, provinsi=Nusa Tenggara Timur, kategori_dibi=Gempabumi, cakupan=bencana`);
    `dibi/mentah/dibi_nasional.json` (bulan 8). Label: resmi, sementara (final sekitar Februari 2027 menurut dasbor DIBI).
14. **Seri lebih panjang:** dasbor publik DIBI mulai 2008; meninggal 2009 = 1.614 dan 2010 = 1.630 (tahun Padang 2009,
    Merapi, Mentawai, dan Wasior 2010), lalu 282–532 pada 2011–2014. Kejadian pra-2008 tidak tersedia lewat dasbor ini
    meskipun teks dasbor menyebut DIBI memuat kejadian sejak 1815. Sumber: `rekap_nasional_tahunan.csv`;
    `dibi/README.md` §Keterbatasan. Label: resmi.
15. **Data dinamis lawan data statis:** Juklak 7/2023 membedakan data dinamis (sementara, berubah selama keadaan darurat)
    dan data statis (tetap). Meninggal = nominal terakhir; menderita, mengungsi, luka = nominal terbesar selama tanggap
    darurat, dijumlah lintas laporan. Sumber: `juknis-nomor-7-tahun-2023.json` halaman 3; `dibi/README.md` §Definisi
    (Juklak hlm. 22, 28). Label: resmi.
16. **Luka/sakit DIBI tidak stabil** (2015: 370; 2018: 21.218) dan banyak baris tanpa isian; hanya batas bawah. Sumber:
    `dibi/README.md` §Keterbatasan. Label: resmi (catatan mutu).

### Inferensi

- **[Inferensi tim]** Kenaikan kejadian alam 2015–2021 lebih aman dibaca sebagai gabungan bahaya dan intensitas
  pelaporan daripada sebagai kenaikan bahaya: prinsip 7 KERANGKA sudah menyatakan bahwa jumlah kejadian kekeringan
  mengukur pelaporan, dan patahan kategori 2018 (temuan 6) terjadi di tengah kenaikan itu. Naskah sebaiknya tidak
  menulis "bencana makin sering" tanpa kalimat ini.
- **[Inferensi tim]** Jumlah kejadian bukan ukuran keparahan dan bukan ukuran kinerja penanggulangan bencana. Korban
  ditentukan oleh sedikit kejadian geologi berkorban massal (2018, 2022) dan, pada 2025, oleh satu rangkaian banjir dan
  longsor. Sasaran berbasis korban (Renas 1.a dan 1.b) lebih bermakna, tetapi angka tahunannya didominasi kejadian
  tunggal; pelaporan capaian perlu menyertakan angka dengan dan tanpa kejadian terbesar tahun itu (lihat P3 temuan 6).
- **[Inferensi tim]** Klaim "2025 tertinggi sejak 2018" untuk korban aman di dua seri: versi semua klasifikasi (2.030) memuat 295
  meninggal nonalam, sosial, dan lainnya yang sebelum 2024 tidak tercatat, tetapi versi alam saja (1.735) juga lebih
  tinggi daripada tiap tahun 2019–2024 (275–858). Naskah memakai versi alam untuk perbandingan antartahun dan menyebut
  2.030 sebagai angka tahun itu.
- **[Inferensi tim]** Hidrometeorologi 2025 (1.731) di luar rentang 2015–2024 (219–545) dan di luar rentang periode
  acuan 2008–2024 (maksimum 774, 2010). Rasio korban per kejadian
  yang dihitung dari 2010–2024 akan meremehkan musim seperti 2025/26; ini dasar lantai di P2.
- **[Inferensi tim]** Klaim NAR 2023 di Renstra tidak dipakai sebagai temuan Bab 4 tanpa tahun dasar; Bab 4 menulis
  pola yang terukur dari DIBI (korelasi 0,17 untuk 2015–2023) dan menyebut kutipan NAR sebagai pandangan BNPB sebelumnya.

### Celah

- **Kejadian pra-2008** tidak tersedia di dasbor publik DIBI. Disajikan: seri grafik mulai 2015 (atau 2008 sebagai
  opsi), kejadian pra-2008 hanya di Tabel 4.1 dari sumber per kejadian. Permintaan data ke Pusdatinkom: rekap DIBI
  1815–2007 yang disebut teks dasbor.
- **Tahun dasar NAR 2023** tidak diketahui; dokumen NAR tidak dibuka. Disajikan sebagai kutipan Renstra berlabel.
- **Luka-luka** tidak dipakai (KERANGKA celah 7).
- **2026 sementara**; angka final sekitar Februari 2027. Grafik memberi arsir dan label "sementara".
- **Perubahan angka antara data dinamis dan statis** tidak terdokumentasi di sumber terbuka (lihat Sulteng di P2:
  jumlah meninggal dan hilang naik, jadi bukan reklasifikasi saja). Permintaan data ke Pusdatinkom: catatan perubahan angka per kejadian besar.
- **Kerugian rupiah** tidak ada di paket `dibi`; kolom `estimasi_kerugian_rumah` tidak terdokumentasi satuannya, dan seri
  CKAN nilai kerusakan dan kerugian R3P 2015–2024 belum ditarik. Bab 4 tidak menulis kerugian tahunan nasional.

---

## P2. Kejadian besar apa yang menjadi analog skenario terburuk per jenis?

### Inti

Analog terberat per jenis yang angkanya bersumber primer: tsunami Aceh 2004 (127.720 meninggal dan 93.285 hilang
menurut halaman capaian buku resmi BRR; teks naratif BRR 126.741, ditulis berdampingan) sebagai lantai tsunami
nasional, tsunami Pangandaran 2006 (665 meninggal, USGS) sebagai lantai megathrust selatan Jawa, Mentawai 2010 (447 +
56) dan Selat Sunda 2018 (437 + 16) sebagai lantai wilayahnya, gempa darat Yogyakarta 2006 (5.749, USGS), gempa-tsunami-likuefaksi Sulawesi Tengah 2018 (DIBI
4.140 meninggal dan 705 hilang), erupsi Merapi 2010 (386 meninggal, 447.982 mengungsi), banjir dan longsor Sumatra
November 2025 (1.202 dan 140, 970.876 mengungsi) dengan musim hujan 2025/26 nasional (1.692 meninggal dan hilang) sebagai
lantai hidrometeorologi, karhutla 2015 (DIBI 24 meninggal; model peneliti 91.600 kematian berlebih akibat asap),
pandemi COVID-19 (161.870), kebakaran terminal BBM Plumpang 2023 (17 meninggal pada hari kedua; 29 per 18 Maret menurut BPBD DKI, sekunder),
kebakaran 16 TPA serentak 2023, dan konflik Maluku 1999–2002 (sedikitnya 5.000 meninggal, sekitar 700.000 mengungsi).
Enam jenis (likuefaksi, tanah longsor, cuaca ekstrem, gelombang ekstrem dan abrasi, rob, kekeringan) belum punya
lantai yang ditetapkan karena turunan `skenario-hidromet/lantai_jenis.csv` belum ada; tahun tercatat terburuknya
dicatat sebagai konteks. Untuk tsunami, lantai ditetapkan per wilayah (KERANGKA §2 butir 9); untuk hidrometeorologi, model La Niña
(525–1.204) lebih ringan daripada musim tercatat (1.692) sehingga tidak boleh menjadi skenario terburuk.

### Temuan bersumber

**Geologi**

1. **Aceh 2004 (tsunami):** dua angka meninggal BRR, ditulis berdampingan: 127.720 meninggal dan 93.285 hilang
   (halaman capaian 4 tahun) dan 126.741 meninggal dengan 93.285 hilang (teks naratif); 635.384 orang kehilangan
   tempat tinggal; 139.195 rumah hancur atau rusak berat. Sumber: (a) BRR NAD–Nias (2009), *Nias: Membangun Melalui
   Jalan yang Jarang Dilalui*, hlm. xiii (Capaian 4 Tahun) dan Tabel 1.1, arsip BNPB
   https://aset-sejarah.dibi.bnpb.go.id/assets/arsip/670de67d21dc8.pdf, dibuka riset E 23 Okt 2026
   (`riset/E-dokumen-primer.md` §E4; 127.720); berkas ini melebihi batas unduh saat dicek ulang 24 Okt 2026, jadi
   halaman tidak dibaca ulang; (b) BRR NAD–Nias (2009), seri buku BRR *Case Study: The Scattered Beads*, arsip BNPB
   https://aset-sejarah.dibi.bnpb.go.id/media/assets/arsip/6748628c6962c.pdf, dibuka 24 Okt 2026: hlm. x (PDF 12)
   "A total of 126,741 lives were lost and, in the wake of the disaster, an additional 93,285 people declared
   missing" dan "up to 139,195 homes were destroyed or severely damaged"; halaman infografik capaian 4 tahun (PDF
   15) "127,720 people killed and 93,285 missing". Label: resmi (keduanya buku lembaga pelaksana pemerintah; bawaan
   KERANGKA, dapat dibalik); Buku Utama Rencana Induk (Lampiran Perpres 30/2005) tidak ditemukan. Selisih 979 tidak
   dijelaskan BRR. Versi lain: "lebih dari 230.000" (PBB, seluruh kawasan Samudra Hindia, tidak sebanding). DIBI dasbor
   publik: 0 baris (`kejadian_besar.csv` `aceh2004`). **Catatan paket data:** `kejadian_besar.csv` menisbatkan 126.741
   ke "BRR dikutip Republika" dan 127.720 ke CNN Indonesia; keduanya ternyata ada di dokumen BRR primer. Baris
   `aceh2004` perlu direkonsiliasi (tambah versi BRR primer untuk kedua angka) sebelum Tabel 4.2 dipakai.
2. **Nias 2005 (gempa):** 966 meninggal (850 saat gempa), 11.579 luka, lebih dari 70.000 kehilangan tempat tinggal.
   Sumber: buku BRR yang sama (riset E §E4). Label: resmi. Versi lain 979, "hampir 1.000", 850 (sekunder,
   `rekonsiliasi.csv`); 850 cocok dengan bagian "saat gempa".
3. **Yogyakarta 2006 (gempa sesar darat):** 5.749 meninggal. Sumber: USGS event usp000ej1c via
   `public/gempa/data/factsheet_gempa.json` (`kejadian_besar.csv` `yogya2006`, versi USGS). Label: terverifikasi. Versi
   lain ±5.700 (Bappenas dkk., dikutip jurnal, sekunder). Dipakai sebagai analog guncangan di
   `skenario-geologi/analog.csv`.
3a. **Pangandaran 17 Juli 2006 (gempa M7,7 megathrust selatan Jawa, tsunami):** 665 meninggal dan 65 hilang. Rincian:
    Ciamis 413 meninggal (15 hilang), Tasikmalaya 62 (2), Banjar 15, Garut 1, Cilacap 157 (15), Kebumen 10 (33),
    Banyumas 1, Gunungkidul 3, Bantul 3. Seluruh kematian dan kerusakan akibat tsunami, run-up tertinggi 4,6 m di
    Widarapayung (3,6 m Cikembulan, 3,4 m Parangkusumo, 1,8 m Pangandaran); sedikitnya 1.540 bangunan rusak atau hancur
    di Jawa Barat dan 83 di Jawa Tengah. Sumber: USGS event usp000ensm, produk impact-text, berkas
    `riset/mentah/usp000ensm.geojson` (diunduh 23 Okt 2026; dibaca 24 Okt 2026); `skenario-geologi/README.md` §4.2.
    Label: terverifikasi (jumlah per kab = olah(terverifikasi)). Lantai Kartu 6.1 megathrust selatan Jawa (KERANGKA §2
    butir 9, V13). DIBI dasbor publik mulai 2008: tidak ada baris.
4. **Padang 2009 (gempa slab):** DIBI 1.195 meninggal dan 2 hilang, 271.540 rumah rusak, 16 kab; USGS 1.117. Sumber:
   `kejadian_besar.csv` `padang2009`. Label: resmi / terverifikasi; beda tidak terjelaskan (`rekonsiliasi.csv`).
5. **Mentawai 2010 (tsunami):** DIBI 447 meninggal dan 56 hilang; USGS 445. Sumber: `kejadian_besar.csv`. Label:
   resmi / terverifikasi.
6. **Sulawesi Tengah 2018 (gempa, tsunami, likuefaksi):** DIBI 4.140 meninggal (Kota Palu 3.624, Sigi 289, Donggala 212,
   Parigi Moutong 15), 705 hilang, 4.438 luka, 212.719 mengungsi, 110.214 rumah rusak. Sumber: `kejadian_besar.csv`
   `sulteng2018`; `rekonsiliasi.csv`. Label: resmi. Ditulis berdampingan: USGS 2.077 meninggal, 1.075 hilang, 4.438
   luka (terverifikasi, halaman event us1000h3p4); BNPB 21 Okt 2018 2.256 meninggal dan 1.309 hilang (data dinamis,
   dikutip JPNN, sekunder). Luka DIBI sama persis dengan USGS; mengapa meninggal DIBI hampir dua kali USGS tidak dapat
   dibuktikan dari data publik (`status_bukti` tidak terbukti). `skenario-geologi/README.md` mencatat 4.141 (jendela
   tarik berbeda).
7. **Sulawesi Tengah 2018, rangkaian bahaya menurut BNPB:** gempa M7,7 pukul 17.02 WIB (direvisi M7,4) memicu tsunami
   di pantai Donggala dan Teluk Palu (Talise) serta likuefaksi di Petobo, Balaroa, dan empat wilayah di Sigi; listrik
   padam dan komunikasi terputus; status tanggap darurat provinsi 14 hari sampai 11 Oktober 2018. Sumber: BNPB, *Info
   Bencana* September 2018, hlm. 1,
   https://bnpb.go.id/storage/app/media/uploads/24/info-bencana-september-2018-rev.pdf (diakses 24 Okt 2026). Label:
   resmi.
8. **Selat Sunda 2018 (tsunami akibat longsor lereng Anak Krakatau):** DIBI 437 meninggal, 16 hilang, 14.059 luka,
   42.325 mengungsi (BNPB 31 Des 2018: 33.721, sekunder). Penyebab: Renstra BNPB halaman 16. Sumber:
   `kejadian_besar.csv`; `perban-nomor-5-tahun-2025.json` hlm. 16. Label: resmi.
9. **Lombok 2018 (rangkaian gempa):** DIBI 569 meninggal (29 Jul–30 Sep 2018, NTB dan Bali), 406.202 mengungsi, 217.855
   rumah rusak; USGS 563; baris DIBI 5 Agu 2018 saja 528 (`skenario-geologi/analog.csv`); 560 BNPB (sekunder); 564
   (riset A, jendela lain). Sumber: `kejadian_besar.csv`; `rekonsiliasi.csv`. Label: resmi / terverifikasi.
10. **Cianjur 2022 (gempa sesar darat):** DIBI 602 meninggal dan 8 hilang, 115.382 mengungsi, 57.337 rumah rusak;
    Renstra 602 meninggal, 56.548 rumah rusak, 108.720 mengungsi. **Berdampingan dengan** dokumen R3P Cianjur 2022
    (portal BNPB, "contoh dokumen R3P bencana masif"): hlm. PDF 13, "Berdasarkan data BPBD Kabupaten Cianjur, hingga 7
    Desember 2022": 334 meninggal, 8 hilang, 114.683 mengungsi, dan 53.408 rumah rusak (12.956 berat, 15.196 sedang,
    25.256 ringan), yaitu data dinamis yang lebih awal daripada DIBI statis; hlm. PDF 55: 114.315 rumah rusak (20.969
    berat, 24.584 sedang, 68.762 ringan) menurut SK Bupati 360/KEP.401-BPBD/BPBD/2022 tahap II hasil reviu BNPB;
    kerusakan dan kerugian Rp4,55 triliun. DIBI statis tetap angka utama untuk korban. Sumber:
    `kejadian_besar.csv`; `rekonsiliasi.csv`; riset E §E5
    (https://eproposalrr.bnpb.go.id/manual/panduan_contoh-dokumen-r3p-bencana-masif_1739152465.pdf). Label: resmi
    (R3P: resmi dengan catatan status dokumen; nomor penetapan tidak tercantum).
11. **Merapi 2010 (erupsi):** DIBI 386 meninggal (Sleman 277, Magelang 56, Klaten 41, Boyolali 12), 447.982 mengungsi,
    2.919 rumah rusak. Sumber: `kejadian_besar.csv`; `rekonsiliasi.csv`. Label: resmi. Versi lain: 347 (rekap BNPB 1 Des
    2010) dan 386 (rekap 12 Des 2010), keduanya sekunder; beda tanggal rekap. Surono dkk. (2012): hampir 400 meninggal
    dan sekitar sepertiga juta orang mengungsi, letusan terbesar dalam lebih dari seabad (abstrak); di badan artikel
    hlm. 129 penulis mengutip data BNPB 367 meninggal, 277 luka, dan 410.388 mengungsi (riset E §E16; DOI
    10.1016/j.jvolgeores.2012.06.018; naskah penuh dibuka 24 Okt 2026 lewat salinan PDF McGill). Label: terverifikasi
    (367 dan 410.388 adalah kutipan penulis atas BNPB pada tanggal yang tidak disebut; DIBI 386 tetap angka utama).
12. **Semeru 2021:** DIBI 64 meninggal dan 9 hilang, 10.565 mengungsi. Sumber: `kejadian_besar.csv`. Label: resmi.
13. **Gempa NTT Agustus 2026 (sementara):** DIBI 2026 NTT kategori Gempabumi 151 meninggal, 1.804 luka, 170.055
    mengungsi, 29.315 rumah rusak berat, 132.296 rumah rusak. Sumber: `rekap_provinsi_tahunan.csv`. Label: resmi,
    sementara. Kejadian ini belum ada di `kejadian_besar.csv`. Halaman berita BNPB tentang gempa M7,7 di NTT 15 Agustus
    2026 ditemukan lewat mesin pencari tetapi tidak terbuka (timeout tiga kali, 24 Okt 2026); media mengutip BNPB 111
    meninggal per 30 Agustus 2026 (sekunder). Tidak ada angka kejadian ini selain DIBI yang boleh masuk badan teks.

**Hidrometeorologi**

14. **Sumatra November 2025 (banjir dan longsor Aceh, Sumatera Utara, Sumatera Barat):** DIBI 1.202 meninggal, 140 hilang,
    6.037 luka, 970.876 mengungsi, 4.679.551 menderita, 62.956 rumah rusak berat, 228.006 rumah rusak, 55 kab (jendela 15
    Nov–31 Des 2025, kategori Banjir dan Longsor). Sumber: `kejadian_besar.csv` `sumatra2025`. Label: resmi. Versi
    lain: BNPB 12 Jan 2026 1.189 meninggal, 141 hilang, 195.542 pengungsi yang masih bertahan (sekunder); Buletin Info
    Bencana BNPB Desember 2025 hlm. 6, Aceh saja: 527 meninggal, 31 hilang, lebih dari 356.655 mengungsi (resmi primer,
    cakupan satu provinsi). Kartu `kasus_sumatra_nov2025` di `skenario-hidromet/kartu_skenario.csv` menulis 63.019 rumah
    rusak berat karena memuat semua jenis musim hujan (termasuk cuaca ekstrem); meninggal sama, 1.202.
15. **Musim hujan 2025/26 nasional (1 Okt 2025–30 Apr 2026) adalah musim tercatat terberat:** 1.506 meninggal dan 186 hilang
    (1.692), 1.043.740 mengungsi, 65.929 rumah rusak berat. Pembanding musim La Niña analog 2020/21: 465 meninggal dan 72
    hilang. Sumber: `skenario-hidromet/musim_hujan.csv` (`wilayah=nasional`); registri
    `hidromet.nasional.lantai.meninggal_hilang`. Label: resmi. **Berdampingan dengan model:** kartu La Niña nasional
    525–1.204 korban jiwa (registri `hidromet.nasional.lanina.korban_jiwa`, estimasi-model, belum diuji balik).
16. **Wasior 2010 (banjir bandang):** DIBI 170 meninggal dan 118 hilang. Sumber: `kejadian_besar.csv`. Label: resmi.
17. **Seroja 2021 (siklon tropis, NTT dan NTB):** DIBI 154 meninggal, 34 hilang, 54.268 rumah rusak (jendela 3–30 Apr
    2021); **berdampingan dengan** Renstra 184 meninggal, 47 hilang, 136 luka, "siklon terbesar kedua yang pernah terjadi
    di Indonesia" (BNPB, 2022). Sumber: `kejadian_besar.csv`; `perban-nomor-5-tahun-2025.json` hlm. 11. Label: resmi
    (keduanya); beda tidak terjelaskan.
18. **Jabodetabek awal 2020 (banjir kota):** DIBI 51 meninggal, 433.628 mengungsi, dengan satu rekaman Kota Bekasi
    366.274 (84,5%) berstatus tidak terbukti; DIBI DKI saja 36.424 mengungsi; Renstra "banjir di DKI Jakarta" 61
    meninggal, 11.569 pengungsi, 3.245 rumah rusak. Sumber: `kejadian_besar.csv`; `rekonsiliasi.csv`;
    `perban-nomor-5-tahun-2025.json` hlm. 11. Label: resmi. Riset A §4.4 menulis DIBI 60 meninggal dan 450.717
    mengungsi dengan jendela lain; paket `dibi` yang dipakai.
19. **Tanah longsor Serasan 2023:** DIBI 43 meninggal dan 4 hilang = Renstra 43 meninggal. Sumber: `kejadian_besar.csv`;
    Renstra hlm. 11. Label: resmi.
20. **Karhutla 2015:** DIBI 24 meninggal di 33 kab. **Berdampingan dengan model:** 91.600 kematian berlebih di
    Indonesia akibat paparan PM2,5 asap 2015 (selang 95%: 24.000–159.200), dari model GEOS-Chem. Sumber:
    `kejadian_besar.csv` `karhutla2015`; Koplitz dkk. (2016), *Environmental Research Letters* 11: 094023, bagian 3.4,
    https://doi.org/10.1088/1748-9326/11/9/094023 (dibuka 24 Okt 2026). Label: resmi (DIBI); estimasi-model (Koplitz,
    model peneliti bertinjauan, bukan korban tercatat). Luas 2015: SiPongi 2.611.411,44 ha (jumlah 2015 di
    `riset/mentah/sipongi_luas_2015_2026.json`, ditarik 23 Okt 2026; registri Bab 7 `sipongi.karhutla2015.luas_ha`;
    label resmi); Bank Dunia "2.6 million hectares" Juni–Oktober 2015 menurut pemerintah (terverifikasi). Angka 261.060
    ha yang beredar adalah salah kutip pergeseran desimal dan tidak dipakai. Kerugian: "at least USD 16.1 billion (IDR
    221 trillion)", setara 1,9% PDB 2015 (Bank Dunia, Feb 2016, *The Cost of Fire*, Indonesia Sustainable Landscapes
    Knowledge Note 1, versi teks documents1.worldbank.org, dibuka 24 Okt 2026). Label: terverifikasi, sama dengan
    registri Bab 7 `bankdunia.karhutla2015.kerugian_usd`.
21. **Karhutla 2019 dan 2023:** luas indikasi SiPongi 1.649.258 ha (2019) dan 1.161.192,9 ha (2023); DIBI 10 meninggal
    (2019) dan 4 (2023). Sumber: `kejadian_besar.csv` (versi SiPongi dari `public/data/luas_resmi.json`). Label: resmi.

**Nonalam**

22. **Pandemi COVID-19:** 6.811.945 kasus terkonfirmasi dan 161.870 meninggal (Kementerian Kesehatan 2024 dikutip
    Renstra hlm. 14; kumulatif sampai sekitar akhir Juni 2023, jangan ditulis "hingga Maret 2023"); meninggal per tahun
    2020 = 22.138 dan 2021 = 121.956 (covid19.go.id); status bencana nasional nonalam 13 Apr 2020–21 Jun 2023 = 1.165
    hari. Sumber: `nonalam-sosial/covid19_nasional.csv`; `nonalam-sosial/README.md` Angka kunci. Label: resmi. WHO
    162.059 (terverifikasi). **Berdampingan dengan model:** kematian berlebih WHO 2020–2021 806.815–1.343.849 (selang
    95%; estimasi-model, selalu sebagai rentang; registri `nonalam.covid19.kematian_berlebih`). DIBI: 0 baris.
23. **Plumpang 2023 (kebakaran terminal BBM):** 17 meninggal, 49 luka berat, 18 hilang, 1.085 pengungsi (Kepala BNPB
    pada hari kedua, dikutip Setkab 5 Mar 2023). Sumber: `nonalam-sosial/peristiwa.csv` `plumpang2023`. Label: resmi.
    Versi lain 21 (13 Mar) dan 29 (BPBD DKI mengutip Dinkes DKI, data s.d. 18 Mar 2023, dikutip Merah Putih,
    sekunder; `nonalam-sosial/skenario_terburuk.csv`). Kepekaan: ledakan smelter Morowali Desember 2023, 20 meninggal
    (Polda Sulteng via Antara, sekunder). DIBI: 0 baris. Jenis di `tema.json`: "Kebakaran industri".
24. **Kebakaran TPA 2023:** 16 TPA terbakar hebat bersamaan pada kemarau El Niño 2023 (Kepala BNPB, rapat koordinasi
    21 Jun 2024); Sarimukti 80% lahan terbakar dan 3.000 KK terdampak asap (BNPB 26 Agt 2023). Sumber: `peristiwa.csv`.
    Label: resmi. Tanpa angka korban jiwa di sumber yang dibuka.
25. **Gagal teknologi dalam DIBI 2018–2026:** 10 kejadian, 90 meninggal, terbesar ambruknya musala Ponpes Al Khoziny
    2025 (DIBI 63; Basarnas 67, sekunder). Sumber: `nonalam-sosial/README.md` Angka kunci. Label: resmi.

**Sosial**

26. **Konflik Maluku dan Maluku Utara 1999–2002:** sedikitnya 5.000 meninggal (mungkin sampai 10.000), hampir 700.000
    mengungsi. Sumber: ICG Asia Report N°31 (8 Feb 2002), `peristiwa.csv` `maluku1999`. Label: terverifikasi.
27. **Analog konflik lain:** Poso 1998–2002 sekitar 1.000 meninggal dan lebih dari 100.000 mengungsi (Human Rights Watch,
    4 Des 2002); Sampit 2001 sekitar 500 meninggal dan sekitar 108.000 pengungsi (ICG Asia Report N°19, 27 Jun 2001);
    Sambas 1996–1997 sekitar 500 (perkiraan 300–3.000, ICG mengutip HRW) dan Sambas 1999 186 (hitungan resmi tiga bulan
    pertama, ICG); pengungsi internal tercatat resmi lebih dari 1 juta pada 2001 (laporan seminar Brookings-CUNY, Jun
    2001). Sumber: `peristiwa.csv`. Label: terverifikasi.
28. **Wamena 2019:** DIBI konflik sosial 36 meninggal, 84 luka, 6.634 mengungsi; Presiden RI "33 orang telah meninggal"
    (Setkab, 30 Sep 2019). Sumber: `kejadian_besar.csv`; `peristiwa.csv`. Label: resmi (keduanya).
29. **Di luar lingkup:** Kerusuhan Mei 1998 (288–1.217 meninggal menurut empat versi di laporan TGPF) dan kerusuhan
    Agustus 2025 (Komnas HAM 11 meninggal, sekunder) bertanda `lingkup = luar_lingkup` di `peristiwa.csv`, sesuai
    KERANGKA §2 prinsip 3. Label: per baris. Tidak dipakai sebagai analog.
30. **Aturan pemilihan analog:** lantai = skenario tidak boleh lebih ringan daripada kejadian atau musim tercatat terburuk
    dalam periode acuan untuk jenis dan wilayah yang sama; nonalam dan sosial: skenario terburuk = analog terbesar dalam
    30 tahun terakhir beserta alasan analog yang disisihkan. Sumber: `KERANGKA.md` §2 butir 9. Label: asumsi-kebijakan.

### Inferensi

- **[Inferensi tim] Usulan Tabel analog per jenis (masukan Bab 6–9):**

  | Jenis | Analog terberat (angka utama) | Label | Catatan lantai |
  | --- | --- | --- | --- |
  | Tsunami tektonik, nasional | Aceh 2004: 127.720 meninggal, 93.285 hilang (BRR capaian); 126.741 (BRR naratif) berdampingan | resmi (buku BRR; bawaan, dapat dibalik) | Lantai tsunami nasional hanya dengan sumber buku BRR (KERANGKA §2 butir 9) |
  | Tsunami tektonik, megathrust selatan Jawa | Pangandaran 2006: 665 meninggal, 65 hilang; run-up 4,6 m Widarapayung | terverifikasi (USGS impact-text) | Lantai Kartu 6.1; skenario selatan Jawa di bawah 665 melanggar lantai |
  | Tsunami tektonik, Mentawai–Enggano | Mentawai 2010: DIBI 447 + 56 | resmi | Lantai Kartu 6.2; USGS 445 berdampingan |
  | Gempa darat (guncangan) | Yogyakarta 2006: 5.749 | terverifikasi | Skenario sesar darat Jawa di bawah 5.749 melanggar lantai |
  | Gempa slab | Padang 2009: DIBI 1.195 | resmi | USGS 1.117 berdampingan |
  | Gempa berantai (tsunami, likuefaksi) | Sulteng 2018: DIBI 4.140 + 705 | resmi | USGS 2.077 + 1.075 berdampingan |
  | Tsunami vulkanik, Selat Sunda | Selat Sunda 2018: 437 + 16 | resmi | Lantai tsunami wilayah Selat Sunda; tsunami nontektonik tercatat sebagai celah InaTEWS (P3 temuan 6) |
  | Likuefaksi | Analog belum ditetapkan | | DIBI tidak punya kategori likuefaksi; korban Petobo, Balaroa, dan Sigi 2018 tergabung dalam angka Sulteng 4.140 + 705 dan tidak dapat dipisah dari data publik. KERANGKA §7 celah 5: likuefaksi tanpa skenario |
  | Tanah longsor | Kejadian tunggal: Serasan 2023, DIBI 43 + 4 (kandidat, belum lantai); tahun tercatat terburuk 2014, 331 meninggal dan 23 hilang | resmi; olah(resmi) | Lantai ditetapkan dari `lantai_jenis.csv` (belum ada); tidak diketik di naskah sebelum turunan itu ada (KERANGKA §2 butir 9) |
  | Cuaca ekstrem | Analog kejadian tunggal belum ditetapkan; tahun tercatat terburuk 2025, 80 meninggal dan 1 hilang | olah(resmi) | Menunggu `lantai_jenis.csv` |
  | Gelombang ekstrem dan abrasi | Analog kejadian tunggal belum ditetapkan; tahun tercatat terburuk (meninggal + hilang) 2011, 4 meninggal dan 32 hilang | olah(resmi) | Menunggu `lantai_jenis.csv` |
  | Rob | Analog belum ditetapkan | | DIBI mencatat banjir rob sebagai subkategori banjir sejak 2018 dan kosong pada 2024 (P1 temuan 6), jadi tidak ada seri sendiri; menunggu `lantai_jenis.csv` |
  | Kekeringan | Tahun tercatat terburuk: terdampak 7.798.763 (2018, DIBI); meninggal terbanyak 6 (2023) | olah(resmi) | KERANGKA Kartu 7.3 sudah memakai terdampak 2018 sebagai lantai; korban jiwa tidak berlaku; jumlah kejadian mengukur pelaporan (prinsip 7) |
  | Gunung api | Merapi 2010: 386; 447.982 mengungsi | resmi | Korban erupsi terbesar di DIBI 2008–2026 (tahun berikutnya paling banyak 64 + 9, Semeru 2021) |
  | Banjir (kejadian) | Sumatra Nov 2025: 1.202 + 140; 970.876 mengungsi | resmi | Kasus tercatat, tanpa rentang |
  | Hidrometeorologi (musim) | Musim 2025/26: 1.692 meninggal dan hilang | resmi | Model La Niña 525–1.204 lebih ringan; lantai = 1.692 |
  | Banjir bandang | Wasior 2010: 170 + 118 | resmi | |
  | Siklon | Seroja 2021: DIBI 154 + 34; Renstra 184 + 47 | resmi | Dua versi berdampingan |
  | Karhutla | 2015: DIBI 24; model 91.600 (24.000–159.200) | resmi; estimasi-model | Angka model tidak masuk judul |
  | Pandemi | COVID-19: 161.870 | resmi | Kematian berlebih WHO hanya rentang |
  | Kebakaran industri | Plumpang 2023: 17 (resmi, hari ke-2) lawan 29 (BPBD DKI 18 Mar, sekunder) | resmi; sekunder | Kepekaan: Morowali 2023, 20 (sekunder); Al Khoziny 2025 (DIBI 63) adalah runtuhnya bangunan, bukan kebakaran industri; penempatannya keputusan Bab 8 |
  | Kebakaran TPA | 2023: 16 TPA serentak | resmi | Tanpa korban jiwa tercatat |
  | Konflik sosial | Maluku 1999–2002: sedikitnya 5.000; sekitar 700.000 mengungsi | terverifikasi | Dalam 30 tahun (1996–2025); Sambas 1996–1997 juga di dalam jendela |

- **[Inferensi tim] Lantai tsunami per wilayah, sesuai KERANGKA §2 butir 9.** Megathrust selatan Jawa = Pangandaran
  2006 (665 meninggal); Mentawai–Enggano = Mentawai 2010 (447 + 56); Selat Sunda = Selat Sunda 2018 (437 + 16);
  nasional = Aceh 2004 dengan sumber buku BRR (bawaan diterapkan, dapat dibalik). Bila bawaan Aceh dibalik, lantai per
  wilayah tetap berlaku dan Aceh pindah ke catatan kaki Tabel 4.1. Sulteng 2018 bukan lantai tsunami murni karena
  korbannya gabungan gempa, tsunami, dan likuefaksi; tempatnya baris "gempa berantai".
- **[Inferensi tim] Kartu hidrometeorologi wajib memakai lantai tercatat.** Batas atas model La Niña (1.204) di bawah
  musim 2025/26 tercatat (1.692). Kartu menulis 1.692 sebagai skenario minimum dan model hanya sebagai pita pembanding
  berlabel; ini memenuhi PELAJARAN WAJIB dan KERANGKA §2 butir 9.
- **[Inferensi tim] Sulteng 2018:** DIBI (data statis, resmi) menjadi angka utama dan USGS serta BNPB Oktober 2018
  ditulis berdampingan. Jumlah meninggal dan hilang naik 1.280 (36%), dari 3.565 (21 Okt 2018) ke 4.845 (DIBI), jadi
  reklasifikasi hilang menjadi meninggal saja tidak menjelaskannya; sebabnya tidak terbukti dari data publik dan tidak
  ditulis sebagai penjelasan di naskah.
- **[Inferensi tim] Karhutla:** korban DIBI karhutla (24 pada 2015) tidak mewakili beban asap. Kartu analog menulis
  keduanya dan menyebut sifat masing-masing (korban tercatat lawan kematian berlebih model). Lebar pita Koplitz 6,6 kali,
  di bawah satu orde, jadi boleh di kartu (KERANGKA §2 butir 9, larangan tampil), tidak di judul.
- **[Inferensi tim] COVID-19 adalah pembunuh terbesar 2015–2025 dan tidak tercatat di DIBI:** 161.870 meninggal = 13,6
  kali seluruh meninggal kejadian bencana DIBI 2015–2025 (11.873). Definisi berbeda (kematian terkonfirmasi lawan
  korban kejadian), jadi rasio ini hanya untuk menyatakan besaran, tidak dijumlahkan ke seri DIBI.
- **[Inferensi tim] Gempa NTT Agustus 2026** layak masuk Tabel 4.1 sebagai baris 2026 (sementara) dengan angka DIBI saja;
  rumah rusak beratnya (29.315) dua kali lebih besar daripada Cianjur 2022 (DIBI 13.730), meskipun meninggalnya lebih
  kecil (151 lawan 602).

### Celah

- **Buku Utama Rencana Induk RR Aceh–Nias** tidak ditemukan (BPK, Bappenas, BPHN; riset E §E4). Status Aceh dan Nias:
  bawaan KERANGKA diterapkan (buku BRR berlabel resmi), dapat dibalik pemilik. Bila dibalik, Aceh dan Nias hanya di
  catatan kaki Tabel 4.1 dan lantai tsunami tetap per wilayah (Pangandaran, Mentawai, Selat Sunda).
- **Lantai enam jenis** (likuefaksi, tanah longsor, cuaca ekstrem, gelombang ekstrem dan abrasi, rob, kekeringan
  kejadian tunggal) menunggu turunan `skenario-hidromet/lantai_jenis.csv` (KERANGKA §10); angka di tabel analog hanya
  konteks tahun tercatat terburuk nasional.
- **R3P Lombok dan Sulteng, PDNA final ketiganya** tidak ditemukan (riset E §E5; KERANGKA celah 9). Bab 4 tidak menulis
  kerugian rupiah Lombok dan Sulteng.
- **Rekap akhir BNPB Sulteng** tidak dibuka. Mesin pencari menampilkan versi 2.101 meninggal dan 1.373 hilang (akhir 2018,
  Kontan mengutip BNPB) dan 4.340 meninggal dan hilang (Metro TV 2025 mengutip BNPB); keduanya sekunder dan tidak
  dibuka, jadi tidak masuk badan teks maupun Tabel 4.2. Permintaan data ke Pusdatinkom: catatan revisi angka Sulteng.
- **Gempa NTT Agustus 2026:** halaman BNPB tidak terbuka; hanya angka DIBI sementara yang dipakai. Permintaan: tambah baris
  di `kejadian_besar.csv` dengan jendela tanggal setelah paket `dibi` ditarik ulang.
- **Luas karhutla 2015:** tertutup; SiPongi 2.611.411,44 ha ada di `riset/mentah/sipongi_luas_2015_2026.json`
  (`public/data/luas_resmi.json` mulai 2018, jadi berkas riset itu yang dipakai).
- **Kerugian karhutla 2015 (Bank Dunia):** tertutup; versi teks Knowledge Note dibuka 24 Okt 2026 (terverifikasi).
- **Konflik:** angka pemerintah untuk Maluku, Poso, Sampit, dan Sambas tidak dibuka; analog memakai ICG dan HRW
  (terverifikasi). Seri DIBI konflik tidak dipakai sebagai analog (dugaan entri ganda; Bahan subbab 4.4).
- **Kejadian lebih dari 30 tahun** (mis. erupsi atau tsunami sebelum 1996) tidak ditelusuri; tidak dikutip.

---

## P3. Pelajaran apa yang konsisten muncul dari kejadian besar?

### Inti

Enam pelajaran berulang dan bersumber: (L1) rantai peringatan dini putus di hilir, seperti di Palu 2018 tempat peringatan
BMKG terbit tetapi tidak sampai ke warga sebelum tsunami tiba 3–8 menit setelah gempa, dan 82,5% responden mengungsi
setelah melihat orang lain; (L2) kejadian besar bersifat berantai (gempa ke tsunami dan likuefaksi, erupsi ke longsor ke
tsunami, banjir dan longsor lintas provinsi); (L3) korban terkonsentrasi: lima kejadian menyumbang 60,6% meninggal
bencana alam 2015–2025; (L4) angka korban bergeser antara data dinamis dan statis (Sulteng 2.256 pada 21 Okt 2018 lawan
DIBI 4.140; Merapi 347 pada 1 Des lawan 386 pada 12 Des 2010); (L5) bencana
nonalam terbesar tidak tercatat di DIBI; (L6) pemulihan dibentuk khusus untuk tiap kejadian besar tanpa evaluasi
independen, sehingga buktinya lemah.

### Temuan bersumber

1. **L1, Palu 2018, peringatan terbit:** BMKG mengeluarkan peringatan tsunami status Waspada di pantai Donggala bagian
   barat dan Siaga di Donggala bagian utara, Mamuju bagian utara, dan Kota Palu bagian barat; listrik padam dan akses
   komunikasi terputus. Sumber: BNPB, *Info Bencana* September 2018, hlm. 1 (URL di P2 temuan 7; diakses 24 Okt 2026).
   Label: resmi.
2. **L1, Palu 2018, waktu tiba:** tsunami tiba sekitar 3–8 menit setelah guncangan utama (sekitar 3 menit di Kota
   Donggala dan Lero, sekitar 10 menit di ujung Teluk Palu); run-up tertinggi 10,73 m di Tondo; saksi menyebut gelombang
   pertama memicu evakuasi. Sumber: Widiyanto dkk. (2019), *Natural Hazards and Earth System Sciences* 19: 2781–2794,
   https://doi.org/10.5194/nhess-19-2781-2019 (CC BY 4.0; dibuka 24 Okt 2026). Label: terverifikasi.
3. **L1, Palu 2018, hilir:** survei kuesioner sebulan setelah kejadian di Donggala dan Palu: 82,5% penduduk mengungsi
   setelah melihat orang lain mengungsi; tidak ada peringatan resmi yang diterima warga sebelum tsunami tiba; banyak
   yang mengalami kemacetan saat evakuasi, terutama di Kota Palu. Sumber: Harnantyari dkk. (2020), *International Journal
   of Disaster Risk Reduction* 43: 101389, https://doi.org/10.1016/j.ijdrr.2019.101389 (metadata Crossref; abstrak lewat
   API Semantic Scholar, dibuka 24 Okt 2026; naskah penuh tidak dibuka). Label: terverifikasi.
4. **L1, Palu 2018, versi media (pembanding saja):** peringatan terbit sekitar 5 menit setelah gempa 17.02 WIB dan
   dicabut 17.37 WIB (Kepala BMKG dikutip Kontan, 29 Sep 2018); sensor pasang surut terdekat sekitar 200 km dari Palu
   (BMKG dikutip CGTN). Sumber: `program-terbukti/bukti_dampak.csv` B013–B016. Label: sekunder menurut konvensi berkas
   ini (paket memberi terverifikasi karena dibuka langsung, tetapi angka adalah kutipan pejabat di media); tidak masuk
   badan teks sampai buletin BMKG atau laporan UNDRR-UNESCO-IOC-BMKG-BNPB 2019 dibuka.
5. **L1, cakupan hilir nasional:** "tingkat keterpenuhan sistem peringatan dini bencana baru mencapai 6 persen" bagi
   masyarakat terpapar di kawasan risiko tinggi. Sumber: Renstra BNPB, `perban-nomor-5-tahun-2025.json` hlm. 70
   (`bukti_dampak.csv` B017). Label: resmi. Penyebutnya berbeda dengan IKP 6,10% ke 6,32% (Tabel 4.6), jadi keduanya
   tidak dibandingkan langsung.
6. **L1, posisi bukti InaTEWS:** kekuatan bukti "sedang" (kejadian tunggal); posisi "Program berjalan, wajib evaluasi
   dampak"; celah: mata rantai terakhir (sirene, Pusdalops siaga terus-menerus), tsunami nontektonik (Selat Sunda 2018),
   cakupan 6%. Sumber: `program-terbukti/kompendium_program.csv` baris P03. Label: resmi (rubrik paket). InaTEWS tidak
   boleh disebut "terbukti".
7. **L1, Merapi 2010:** PVMBG mengeluarkan prakiraan besaran tiap fase tepat waktu; radius zona evakuasi 10, 15, dan
   20 km dari puncak menjadi parameter kenaikan tingkat ancaman; perluasan dari 10 ke 15 km pada 3 November 2010
   menaikkan jumlah pengungsi menjadi lebih dari 100.000, lalu diperluas lagi ke 20 km. Menurut penulis, prakiraan dan
   evakuasi itu menyelamatkan 10.000–20.000 jiwa, "a conservative estimate based on BNPB reports of 2300 houses
   destroyed and multiplied by 4 to 8 people associated with each household" (hlm. 129). Sumber: Surono dkk. (2012),
   naskah penuh dibuka 24 Okt 2026 lewat salinan PDF McGill
   (https://www.eps.mcgill.ca/~courses/c567/Week%204%20-%20Deformation%201/Surono%20et%20al%202012,%20Merapi%202010%20eruption.pdf),
   hlm. 121 (abstrak), 126–127 (fase magmatik), 129. Label: fakta kronologi terverifikasi; angka 10.000–20.000
   **estimasi-model** (perkiraan penulis, belum diuji: jumlah rumah hancur dikali 4–8 jiwa per rumah tangga, dengan
   anggapan semua penghuni akan tewas tanpa evakuasi), selalu **berdampingan dengan** korban tercatat DIBI 386.
8. **L2, bahaya berantai:** Sulteng 2018 gempa memicu tsunami dan likuefaksi (BNPB *Info Bencana* September 2018); Selat
   Sunda 2018 longsor lereng Anak Krakatau memicu tsunami (Renstra hlm. 16); gempa Sulawesi Barat 2021 memicu longsor yang
   memutus jalur Mamuju–Majene (Renstra hlm. 11); Sumatra 2025 banjir dan longsor di tiga provinsi, 55 kab
   (`kejadian_besar.csv`). Label: resmi. KERANGKA §7 celah 5: likuefaksi tanpa skenario.
9. **L3, konsentrasi korban:** lima kejadian (Sulteng 2018 4.140, Sumatra 2025 1.202, Cianjur 2022 602, Lombok 2018 569,
   Selat Sunda 2018 437) = 6.950 meninggal, 60,6% dari 11.477 meninggal bencana alam 2015–2025 (59,9% bila hilang ikut
   dihitung: 7.819 dari 13.056). Per tahun (penyebut alam): tiga kejadian 2018 = 94,0% meninggal 2018 (5.146 dari
   5.477); Cianjur = 70,2% meninggal 2022 (602 dari 858); Sumatra = 69,3% meninggal 2025 (1.202 dari 1.735). Versi
   semua klasifikasi, berdampingan dengan catatan patahan 2024: 58,5% (dari 11.873), 93,6% (dari 5.500), 59,2% (dari
   2.030). Sumber: `kejadian_besar.csv` (versi DIBI);
   `rekap_nasional_tahunan.csv`. Label: olah(resmi); jendela per kejadian pilihan penyusun.
10. **L4, angka bergeser antara data dinamis dan statis:** Sulteng 2.256 meninggal (21 Okt 2018, data dinamis) lawan DIBI
    4.140 (statis); Merapi 347 (rekap 1 Des 2010) lawan 386 (rekap 12 Des 2010 = DIBI). Sumber: `rekonsiliasi.csv`;
    Juklak 7/2023 hlm. 3. Label: resmi (versi sekunder hanya pembanding). **Bukan dinamis lawan statis, dicatat
    terpisah:** (a) beda definisi metrik, Sumatra 2025 pengungsi DIBI 970.876 (nominal terbesar dijumlah lintas
    laporan) lawan 195.542 (pengungsi yang masih bertahan 12 Jan 2026, sekunder), sekitar 5 kali; (b) beda sumber dan
    tahap verifikasi, Cianjur rumah rusak DIBI 57.337 lawan BPBD 7 Des 2022 53.408 lawan SK Bupati tahap II 114.315 (R3P,
    riset E §E5).
11. **L5, nonalam di luar DIBI:** COVID-19, Plumpang 2023, Balongan 2021, dan Morowali 2023 tidak punya baris DIBI;
    kategori epidemi baru muncul 2024. Sumber: `kejadian_besar.csv` (`covid19`, `plumpang2023`, `baris_dibi = 0`);
    `nonalam-sosial/README.md` §Rekonsiliasi. Label: resmi.
12. **L6, pemulihan:** BRR Aceh–Nias kekuatan bukti lemah (laporan sendiri), posisi "Rujukan tata kelola", celah "tiap
    bencana besar membentuk pengaturan ad hoc baru; pelajaran manajemen BRR belum dibakukan"; Rekompak Yogyakarta 2006
    lemah, "Rujukan tata kelola"; rehabilitasi rumah Lombok 2018 lemah, "Pelajaran, bukan teladan" (data progres resmi
    tidak konsisten dalam satu rilis). Sumber: `kompendium_program.csv` baris P07, P08, P09. Label: resmi (rubrik
    paket). **Dibantah oleh** tidak ada; catatan: `riset/C-benchmark.md` tabel ringkas baris 17 menulis BRR "sudah terbukti
    di Indonesia", dan klaim itu bertentangan dengan rubrik kompendium (lemah), jadi tidak dipakai.
13. **L6, kerangka waktu pemulihan resmi:** Rencana Induk Aceh–Nias berlaku empat tahun sesuai RPJMN 2004–2009
    (Perpres 30/2005 Pasal 2, riset E §E4); BRR bekerja April 2005–April 2009. Sumber: riset E §E4;
    `kompendium_program.csv` P08. Label: resmi.

### Inferensi

- **[Inferensi tim] L1 tidak dapat ditulis sebagai "InaTEWS gagal" atau "InaTEWS terbukti".** Bukti primer
  menunjukkan tiga mata rantai: peringatan terbit (BNPB), waktu tiba sangat singkat (3–8 menit), dan warga tidak
  menerima peringatan resmi sebelum tsunami tiba, dengan listrik dan komunikasi padam. Pelajaran yang aman: untuk
  tsunami dekat, keputusan evakuasi warga terjadi sebelum pesan resmi mana pun dapat sampai, sehingga evakuasi mandiri
  atas tanda alam dan jalur evakuasi menentukan. Merapi 2010 memberi sisi sebaliknya (prakiraan tepat waktu untuk
  bahaya yang berkembang berhari-hari), tetapi angka jiwa terselamatkan adalah perkiraan penulis.
- **[Inferensi tim] Studi kasus 4.1 = peringatan dini dan evakuasi Merapi 2010, dengan InaTEWS dan Palu 2018 sebagai
  kotak pembanding** (KERANGKA terbaru). Naskah penuh Surono dkk. kini terbuka, jadi kronologi radius 10, 15, 20 km dan
  pengungsi dapat dikutip. Dua batas untuk penulis: (a) angka 10.000–20.000 adalah estimasi kasar penulis (rumah hancur
  dikali 4–8 jiwa), berlabel estimasi-model dan selalu di samping korban tercatat 386; (b) satu kejadian, jadi PVMBG
  atau sistem peringatan gunung api tidak disebut "terbukti". Usulan terbuka untuk orkestrator: Palu didukung dua
  artikel bertinjauan dan satu dokumen BNPB, sehingga kotak pembanding Palu boleh memuat judul berangka sendiri (3–8
  menit; 82,5%).
- **[Inferensi tim] L3 mengubah cara membaca capaian.** Karena satu sampai tiga kejadian menentukan korban tahunan,
  indikator korban per tahun berfluktuasi besar walau sistem tidak berubah. Kombinasi yang jujur: angka tahunan,
  angka tanpa kejadian terbesar, dan daftar kejadian penentu. Ini bahan Bab 12, bukan rekomendasi di Bab 4.
- **[Inferensi tim] L4 adalah alasan teknis memakai DIBI (statis) sebagai angka utama** dan menulis versi lain
  berdampingan. Untuk kerusakan rumah Cianjur saja, SK Bupati tahap II di R3P (114.315) sekitar dua kali DIBI (57.337)
  dan dua kali data BPBD 7 Des 2022 (53.408); untuk korban, data R3P (334, 7 Des 2022) justru lebih lama daripada DIBI
  statis (602). Satu kasus tidak cukup untuk menyimpulkan bahwa R3P lebih mutakhir daripada DIBI secara umum.
- **[Inferensi tim] L5 menyangkut kelengkapan data, bukan mandat.** DIBI mencatat bencana nonalam sejak 2024 dengan
  kategori Juklak 7/2023, tetapi kejadian nonalam terbesar dekade ini (COVID-19) dan kebakaran industri besar tidak
  tercatat. Rekomendasi data ke Pusdatinkom masuk register (Bab 13), bukan Bab 4.
- **[Inferensi tim] L6 tidak boleh ditulis sebagai keberhasilan BRR.** Yang dapat ditulis: keluaran yang dilaporkan BRR
  (140.304 rumah permanen terhadap 139.195 rumah hancur atau rusak berat) dengan label laporan sendiri, dan pola
  kelembagaan ad hoc yang berulang.

### Celah

- **Buletin peringatan BMKG untuk Palu 2018** (jam terbit dan jam berakhir) tidak dibuka; laporan bersama UNDRR,
  UNESCO-IOC, BMKG, dan BNPB 2019 tentang keterbatasan peringatan dini tsunami Palu ditolak server saat dibuka
  (kompendium P03). Disajikan: jam terbit dan jam cabut tidak ditulis di badan teks.
- **Naskah penuh Harnantyari dkk.** tidak dibuka; hanya abstrak. Surono dkk. kini terbuka penuh (salinan PDF McGill;
  HAL insu-00723412 menolak akses otomatis 24 Okt 2026).
- **Evaluasi independen pemulihan** (BRR, Rekompak, Lombok, Palu, Cianjur) tidak ditemukan (kompendium P07–P09).
  Disajikan: "belum ada evaluasi independen yang dipublikasikan"; permintaan ke Deputi Bidang Rehabilitasi dan
  Rekonstruksi.
- **Evaluasi waktu evakuasi Selat Sunda 2018** tidak ditelusuri; pelajaran tsunami vulkanik hanya dari baris celah
  kompendium P03 dan Renstra hlm. 16.
- **Pelajaran Kamaishi, Bangladesh, dan Chile** bukan kejadian Indonesia; tempatnya Bab 2 dan Bab 11 (prinsip 17).

---

## Bahan subbab 4.4 Bencana nonalam dan sosial dalam catatan (bukan pertanyaan kunci)

### Inti

DIBI baru mencatat bencana nonalam dan sosial secara rapat sejak 2024 (2025: 363 kejadian, 295 meninggal termasuk
kategori lainnya), tetapi kejadian nonalam terbesar (COVID-19, Plumpang, Balongan, Morowali) tidak punya baris, seri
konflik sosial memuat dugaan entri ganda, dan kebakaran TPA tidak punya jenis sendiri. Kebakaran gedung dan permukiman
(881 laporan pada 2025) tercatat di DIBI tetapi di luar lingkup kajian.

### Temuan bersumber

1. **Kode jenis Juklak 7/2023:** 13 kode, 101–109 alam, 201 epidemi dan wabah, 202 kebakaran gedung dan permukiman, 203
   gagal teknologi, 301 konflik sosial; kode 999 "lainnya" adalah kode DIBI di luar Juklak. Sumber: `dibi/README.md`
   §Definisi (Juklak hlm. 6); `juknis-nomor-7-tahun-2023.json` hlm. 33–34, 49–51. Label: resmi.
2. **Kebakaran gedung dan permukiman:** 83 laporan (2024) dan 881 (2025, 149 meninggal) pada cakupan semua laporan; 74
   dan 327 (145 meninggal) pada cakupan kejadian bencana. Sumber: `rekap_nasional_tahunan.csv` (kode 202). Label: resmi.
   Di luar lingkup P11 (KERANGKA §2 prinsip 3).
3. **Konflik sosial DIBI 2019–2026:** 17 kejadian, 93 meninggal, 14.804 mengungsi (2026 sementara: 8 kejadian, 46
   meninggal, 4.279 mengungsi); memuat dugaan entri ganda Maluku Tengah (3 Apr 2025 dan 3 Apr 2026) dan baris Jayawijaya
   7 Mei 2026 (33 meninggal) yang bertanggal hari jembatan Wouma putus (24 jenazah tenggelam menurut Polres, sekunder).
   Sumber: `nonalam-sosial/README.md` Angka kunci dan §Rekonsiliasi. Label: resmi (catatan mutu).
4. **Entri ganda epidemi:** Nias Selatan 9 Jan 2025 (14 meninggal) tercatat di dua subjenis, sehingga epidemi 2025 terbaca
   28 meninggal. Sumber: `nonalam-sosial/README.md` §Rekonsiliasi. Label: resmi (catatan mutu).
5. **Kerusuhan Agustus 2025** hanya tercatat satu baris konflik sosial (Manokwari, 1 meninggal); baris Agustus 2025
   kategori lainnya dan kebakaran permukiman belum diperiksa per kab. Sumber: `rekonsiliasi.csv` `kerusuhan2025`. Label:
   resmi. Peristiwa ini `luar_lingkup` menurut prinsip 3 (`peristiwa.csv`).
6. **Desa dengan perkelahian massal:** 2.031 desa/kelurahan (2,41%) pada 2024, naik dari 1.553 (1,85%) pada 2021; 150
   desa dengan korban meninggal. Sumber: BPS, Statistik Potensi Desa Indonesia 2024 (`nonalam-sosial/README.md`;
   registri `sosial.desa_perkelahian.2024`). Label: resmi; satuan desa, bukan kejadian atau korban.
7. **Kebakaran TPA** tidak punya jenis sendiri di DIBI; rangkaian 2023 (16 TPA) hanya tercatat di berita BNPB. Sumber:
   `nonalam-sosial/README.md` §Rekonsiliasi; `peristiwa.csv`. Label: resmi.

### Inferensi

- **[Inferensi tim]** Seri DIBI nonalam dan sosial tidak dipakai untuk tren (patahan 2024 dan entri ganda); Bab 4
  menyebut angka tahunannya sebagai catatan, dan analog diambil dari sumber per kejadian (P2).
- **[Inferensi tim]** KERANGKA menulis "kerusuhan Agustus 2025 tidak tercatat sebagai konflik sosial; ketiadaan ini
  menjadi rekomendasi data". Karena prinsip 3 menaruh unjuk rasa yang berhadapan dengan aparat di luar lingkup,
  rekomendasi yang konsisten adalah aturan klasifikasi yang tertulis (di mana kejadian semacam itu dicatat, bila
  dicatat), bukan memasukkannya ke konflik sosial.

### Celah

- **Baris DIBI kategori lainnya dan kebakaran permukiman Agustus 2025** belum diperiksa per kab dan tanggal.
- **Kebakaran TPA tanpa jenis DIBI**: tidak ada seri; disajikan sebagai daftar kejadian berangka dari BNPB.
- **Data korban gagal teknologi resmi final** (Plumpang, Morowali) tidak ditemukan; Plumpang memakai angka hari kedua.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Gambar 4.1 | Kejadian per tahun 2015–2025 (2026 diarsir, sementara), bertumpuk: hidrometeorologi, geologi, nonalam dan sosial (kode 201–301 dan 999), penanda garis "patahan pencatatan 2024" | `dibi/rekap_nasional_tahunan.csv`, cakupan `bencana` | G9 | Geologi hanya 20–88 kejadian per tahun pada 2015–2025 (0,91% kejadian alam), jadi segmennya tipis: tulis angka geologi di dalam atau di samping batang. Total di atas batang memakai pecahan DIBI (5.440,45); bulatkan di label, angka penuh di catatan. Catatan: "Sebelum 2024 cakupan bencana tidak tersaring ambang Juklak 7/2023 dan hampir tanpa nonalam dan sosial; untuk tren pakai kejadian alam". Label resmi |
| Gambar 4.2 | Meninggal dan hilang per tahun 2015–2025 (batang bertumpuk dua seri), 2026 diarsir; seri alam (V06); anotasi 2018 (Sulteng, Lombok, Selat Sunda = 94,0% meninggal alam) dan 2025 (Sumatra = 69,3% meninggal alam); versi semua klasifikasi (2.030) hanya di catatan dengan patahan 2024 | `rekap_nasional_tahunan.csv`; `kejadian_besar.csv` | G1 | Catatan: "COVID-19 (161.870 meninggal, Kemenkes) tidak tercatat di DIBI dan tidak digambar". Opsi bila halaman cukup: 2008–2025 (18 periode, masih ≤ 24) untuk memperlihatkan 2009 dan 2010. Label resmi; anotasi porsi olah(resmi) |
| Tabel 4.1 | Kejadian besar 2004–2026 dan pelajarannya: jenis, kejadian, meninggal dan hilang, mengungsi, sumber angka utama, label, analog untuk (P2), kode pelajaran L1–L6 (P3) | `kejadian_besar.csv`; `nonalam-sosial/peristiwa.csv`; riset E §E4, §E5, §E16; Widiyanto dkk.; Harnantyari dkk. | B5.7 | Baris: Aceh 2004, Nias 2005, Yogyakarta 2006, Pangandaran 2006 (665 meninggal, 65 hilang, USGS, terverifikasi; lantai tsunami selatan Jawa), Padang 2009, Wasior 2010, Mentawai 2010, Merapi 2010, karhutla 2015, Lombok 2018, Sulteng 2018, Selat Sunda 2018, Wamena 2019, COVID-19, Jabodetabek 2020, Seroja 2021, Semeru 2021, Cianjur 2022, Plumpang 2023, TPA 2023, Sumatra 2025, Gempa NTT 2026 (sementara); konflik 1996–2002 dalam satu baris kelompok (Sambas, Maluku, Poso, Sampit). Aceh dan Nias: bawaan diterapkan (buku BRR, resmi), dapat dibalik. Satu sumber utama per baris; versi lain ke Tabel 4.2 |
| Tabel 4.2 | Rekonsiliasi korban kejadian besar: kejadian, metrik, versi (nilai, sumber, tanggal rekap, label), penjelasan, status bukti | `dibi/rekonsiliasi.csv` (bagian `peristiwa`); riset E §E5 (Cianjur R3P) | B5.7 | Baris wajib: Sulteng (DIBI, USGS, BNPB 21 Okt), Lombok (569, 563, 528), Merapi (386, 347), Seroja (DIBI, Renstra), Cianjur (DIBI, Renstra, R3P: meninggal dan rumah rusak), Jabodetabek (DIBI, DKI saja, Renstra), Sumatra (DIBI, Buletin Aceh, BNPB 12 Jan), Aceh (BRR capaian 127.720, BRR naratif 126.741, PBB kawasan; baris `aceh2004` di `kejadian_besar.csv` direkonsiliasi dulu), COVID-19 (Kemenkes, WHO, kematian berlebih sebagai rentang). Versi sekunder ditandai dan tidak menjadi angka utama |
| Halaman studi kasus 4.1 | Judul berangka usulan: "Merapi 2010: zona evakuasi diperluas bertahap 10, 15, lalu 20 km; 386 meninggal tercatat dari sekitar sepertiga juta pengungsi". Masalah: letusan terbesar Merapi dalam lebih dari seabad. Pelaksana: PVMBG (prakiraan), BNPB dan pemerintah daerah (perintah dan pelaksanaan evakuasi). Cara: prakiraan besaran tiap fase dan perluasan radius (3 Nov 10 ke 15 km, pengungsi lebih dari 100.000; lalu 20 km). Hasil: DIBI 386 meninggal, 447.982 mengungsi; perkiraan penulis 10.000–20.000 jiwa terselamatkan (estimasi-model: 2.300 rumah hancur dikali 4–8 jiwa). Kotak pembanding: InaTEWS dan Palu 2018, tsunami tiba 3–8 menit, 82,5% responden mengungsi setelah melihat warga lain, tidak ada peringatan resmi yang diterima warga sebelum tsunami tiba; DIBI 4.140 + 705 (gabungan gempa, tsunami, likuefaksi) | Surono dkk. 2012 (naskah penuh); `kejadian_besar.csv`; BNPB *Info Bencana* Sep 2018; Widiyanto dkk. 2019; Harnantyari dkk. 2020; Renstra hlm. 70 | B5.30 | Kejadian tunggal: PVMBG dan InaTEWS tidak disebut terbukti; posisi InaTEWS "Program berjalan, wajib evaluasi dampak". Angka jiwa terselamatkan berpil estimasi-model dan tidak masuk judul. Jam terbit dan jam cabut peringatan Palu tidak ditulis (sekunder). Label per angka: resmi, terverifikasi, estimasi-model |
| Gambar 4.3 (usulan) | Porsi kejadian lawan porsi meninggal 2015–2025 per kelompok: geologi 0,91% kejadian dan 54,3% meninggal; hidrometeorologi 99,1% dan 45,7% (alam saja) | `rekap_nasional_tahunan.csv` | G8 | Dua batang 100%, dua kategori; hanya bila halaman cukup. Mendukung subbab 4.3. Label olah(resmi) |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/mitigasi/bukti/bab-04.angka.json` dengan bentuk entri `data/angka.json` (bentuk A:
`berkas` + `jalur` relatif ke `data/`; bentuk B: `nilai` + `pustaka`). `data/angka.json` tidak disunting. Kunci yang
sudah ada dipakai ulang dan tidak didaftar lagi: `dibi.nasional.meninggal.2025`, `dibi.nasional.kejadian.2025`,
`dibi.nasional.hilang.2025`, `dibi.sulteng2018.meninggal`, `dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang`,
`hidromet.nasional.lantai.meninggal_hilang`, `hidromet.nasional.lanina.korban_jiwa`, `nonalam.covid19.meninggal`,
`nonalam.covid19.kematian_berlebih`, `nonalam.plumpang2023.meninggal`, `nonalam.tpa.terbakar_2023`,
`sosial.maluku.meninggal_bawah`, `sosial.maluku.pengungsi`, `sosial.desa_perkelahian.2024`,
`sosial.kerusuhan2025.meninggal_dibi`. Angka sekunder tidak masuk registri.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| dibi.nasional.kejadian.2015 | 1.694 | dibi/rekap_nasional_tahunan.csv `[tahun=2015,klasifikasi=semua,cakupan=bencana].kejadian` | resmi | DIBI 2015 |
| dibi.nasional.kejadian.2018 | 3.401 | idem `[tahun=2018,...].kejadian` | resmi | DIBI 2018 |
| dibi.nasional.kejadian.2021 | 5.402 | idem `[tahun=2021,...].kejadian` | resmi | DIBI 2021 |
| dibi.nasional.kejadian.2023 | 5.400 | idem `[tahun=2023,...].kejadian` | resmi | DIBI 2023 |
| dibi.nasional.kejadian.2024 | 3.548 | idem `[tahun=2024,...].kejadian` | resmi | DIBI 2024 |
| dibi.nasional.kejadian_semua_laporan.2024 | 3.636 | idem `[tahun=2024,klasifikasi=semua,cakupan=semua_laporan].kejadian` | resmi | DIBI 2024 |
| dibi.nasional.kejadian_semua_laporan.2025 | 9.305,45 | idem `[tahun=2025,klasifikasi=semua,cakupan=semua_laporan].kejadian` | resmi | DIBI 2025 |
| dibi.nasional.meninggal.2015 | 219 | idem `[tahun=2015,klasifikasi=semua,cakupan=bencana].meninggal` | resmi | DIBI 2015 |
| dibi.nasional.meninggal.2018 | 5.500 | idem `[tahun=2018,...].meninggal` | resmi | DIBI 2018 |
| dibi.nasional.hilang.2018 | 764 | idem `[tahun=2018,...].hilang` | resmi | DIBI 2018 |
| dibi.nasional.meninggal.2022 | 858 | idem `[tahun=2022,...].meninggal` | resmi | DIBI 2022 |
| dibi.nasional.meninggal.2023 | 275 | idem `[tahun=2023,...].meninggal` | resmi | DIBI 2023 |
| dibi.nasional.meninggal_semua_laporan.2025 | 2.037 | idem `[tahun=2025,klasifikasi=semua,cakupan=semua_laporan].meninggal` | resmi | DIBI 2025 |
| dibi.nasional.meninggal.2026 | 548 | idem `[tahun=2026,klasifikasi=semua,cakupan=bencana].meninggal` | resmi | DIBI 2026 sementara |
| dibi.nasional.kejadian_alam.2024 | 3.471,5 | pustaka bnpb-2026-dibi | resmi | olah jumlah sembilan baris alam |
| dibi.nasional.kejadian_alam.2025 | 5.077,45 | pustaka bnpb-2026-dibi | resmi | idem |
| dibi.nasional.meninggal_alam.2025 | 1.735 | pustaka bnpb-2026-dibi | resmi | idem |
| dibi.nasional.kejadian_alam.2015_2025 | 41.621,95 | pustaka bnpb-2026-dibi | resmi | olah |
| dibi.nasional.meninggal.2015_2025 | 11.873 | pustaka bnpb-2026-dibi | resmi | olah jumlah 11 tahun |
| dibi.nasional.hilang.2015_2025 | 1.606 | pustaka bnpb-2026-dibi | resmi | olah, semua klasifikasi |
| dibi.nasional.meninggal_alam.2015_2025 | 11.477 | pustaka bnpb-2026-dibi | resmi | olah, kode 101–109 |
| dibi.nasional.hilang_alam.2015_2025 | 1.579 | pustaka bnpb-2026-dibi | resmi | olah, kode 101–109 |
| dibi.nasional.meninggal_alam.2018 | 5.477 | pustaka bnpb-2026-dibi | resmi | olah |
| dibi.nasional.hilang_alam.2018 | 763 | pustaka bnpb-2026-dibi | resmi | olah |
| dibi.nasional.hilang_alam.2025 | 221 | pustaka bnpb-2026-dibi | resmi | olah |
| dibi.nasional.kejadian_alam_semua_laporan.2024 | 3.550,5 | pustaka bnpb-2026-dibi | resmi | olah, alam cakupan semua_laporan |
| dibi.nasional.kejadian_alam_semua_laporan.2025 | 8.359,45 | pustaka bnpb-2026-dibi | resmi | idem |
| dibi.nasional.meninggal_geologi.2015_2025 | 6.236 | pustaka bnpb-2026-dibi | resmi | olah kode 107–109 |
| dibi.nasional.meninggal_geologi_porsi.2015_2025 | 54,3% | pustaka bnpb-2026-dibi | resmi | olah 6.236 / 11.477 |
| dibi.nasional.kejadian_geologi_porsi.2015_2025 | 0,91% | pustaka bnpb-2026-dibi | resmi | olah 377,2 / 41.621,95 |
| dibi.nasional.meninggal_hidromet.2025 | 1.731 | pustaka bnpb-2026-dibi | resmi | olah kode 101–106 |
| dibi.nasional.meninggal_hidromet_maks.2015_2024 | 545 | pustaka bnpb-2026-dibi | resmi | olah, tahun 2021; jendela asumsi-kebijakan |
| dibi.nasional.meninggal_hidromet_maks.2008_2024 | 774 | pustaka bnpb-2026-dibi | resmi | olah, tahun 2010; periode acuan KERANGKA §2 butir 9 |
| dibi.nasional.spearman_kejadian_meninggal.2015_2025 | 0,22 | pustaka bnpb-2026-dibi | resmi | olah Spearman n = 11; melintasi patahan 2024 |
| dibi.nasional.spearman_kejadian_meninggal.2015_2023 | 0,17 | pustaka bnpb-2026-dibi | resmi | olah Spearman n = 9; sebelum patahan |
| dibi.nasional.nonalam_sosial_lainnya.kejadian.2025 | 363 | pustaka bnpb-2026-dibi | resmi | olah kode 201–301, 999 |
| dibi.nasional.nonalam_sosial_lainnya.meninggal.2025 | 295 | pustaka bnpb-2026-dibi | resmi | idem |
| dibi.kebakaran_permukiman.kejadian.2024 | 83 | dibi/rekap_nasional_tahunan.csv `[tahun=2024,kode_jenis_juklak=202,cakupan=semua_laporan].kejadian` | resmi | DIBI 2024 |
| dibi.kebakaran_permukiman.kejadian.2025 | 881 | idem `[tahun=2025,...].kejadian` | resmi | DIBI 2025 |
| dibi.kebakaran_permukiman.meninggal.2025 | 149 | idem `[tahun=2025,...].meninggal` | resmi | DIBI 2025 |
| dibi.kejadian_besar.lima_teratas_porsi_meninggal.2015_2025 | 60,6% | pustaka bnpb-2026-dibi | resmi | olah 6.950 / 11.477 (alam); semua klasifikasi 58,5% |
| dibi.kejadian_besar.porsi_meninggal.2018 | 94,0% | pustaka bnpb-2026-dibi | resmi | olah 5.146 / 5.477 (alam); semua klasifikasi 93,6% |
| dibi.sumatra2025.porsi_meninggal.2025 | 69,3% | pustaka bnpb-2026-dibi | resmi | olah 1.202 / 1.735 (alam); semua klasifikasi 59,2% |
| dibi.sumatra2025.mengungsi | 970.876 | dibi/kejadian_besar.csv `[kode=sumatra2025,metrik=mengungsi,versi=DIBI].nilai` | resmi | DIBI |
| dibi.sulteng2018.hilang | 705 | dibi/kejadian_besar.csv `[kode=sulteng2018,metrik=hilang,versi=DIBI].nilai` | resmi | DIBI |
| dibi.lombok2018.meninggal | 569 | idem `[kode=lombok2018,metrik=meninggal,versi=DIBI].nilai` | resmi | DIBI |
| dibi.selatsunda2018.meninggal | 437 | idem `[kode=selatsunda2018,...]` | resmi | DIBI |
| dibi.selatsunda2018.hilang | 16 | idem | resmi | DIBI |
| dibi.cianjur2022.meninggal | 602 | idem `[kode=cianjur2022,...]` | resmi | DIBI |
| dibi.cianjur2022.rumah_rusak | 57.337 | idem `[kode=cianjur2022,metrik=rumah_rusak,versi=DIBI].nilai` | resmi | DIBI |
| dibi.merapi2010.meninggal | 386 | idem `[kode=merapi2010,...]` | resmi | DIBI |
| dibi.merapi2010.mengungsi | 447.982 | idem | resmi | DIBI |
| dibi.mentawai2010.meninggal | 447 | idem | resmi | DIBI |
| dibi.mentawai2010.hilang | 56 | idem | resmi | DIBI |
| dibi.padang2009.meninggal | 1.195 | idem | resmi | DIBI |
| dibi.wasior2010.meninggal | 170 | idem | resmi | DIBI |
| dibi.wasior2010.hilang | 118 | idem | resmi | DIBI |
| dibi.seroja2021.meninggal | 154 | idem | resmi | DIBI |
| dibi.seroja2021.hilang | 34 | idem | resmi | DIBI |
| renstra.seroja2021.meninggal | 184 | dibi/kejadian_besar.csv `[kode=seroja2021,metrik=meninggal,versi=pustaka].nilai` | resmi | Renstra hlm. 11 |
| renstra.seroja2021.hilang | 47 | idem `[kode=seroja2021,metrik=hilang,versi=pustaka]` | resmi | idem |
| dibi.semeru2021.meninggal | 64 | dibi/kejadian_besar.csv | resmi | DIBI |
| dibi.semeru2021.hilang | 9 | idem | resmi | DIBI |
| dibi.jabodetabek2020.meninggal | 51 | idem | resmi | DIBI |
| renstra.jabodetabek2020.meninggal | 61 | idem versi pustaka | resmi | Renstra hlm. 11 |
| renstra.jabodetabek2020.mengungsi | 11.569 | idem versi pustaka | resmi | Renstra hlm. 11 |
| dibi.karhutla2015.meninggal | 24 | idem | resmi | DIBI |
| dibi.wamena2019.meninggal | 36 | idem | resmi | DIBI |
| dibi.ntt2026.gempa.meninggal | 151 | dibi/rekap_provinsi_tahunan.csv `[tahun=2026,provinsi=Nusa Tenggara Timur,kategori_dibi=Gempabumi,cakupan=bencana].meninggal` | resmi | DIBI 2026 sementara |
| dibi.ntt2026.gempa.mengungsi | 170.055 | idem `.mengungsi` | resmi | idem |
| dibi.ntt2026.gempa.rumah_rusak_berat | 29.315 | idem `.rumah_rusak_berat` | resmi | idem |
| usgs.sulteng2018.meninggal | 2.077 | dibi/kejadian_besar.csv `[kode=sulteng2018,metrik=meninggal,label=terverifikasi].nilai` | terverifikasi | USGS us1000h3p4 |
| usgs.yogya2006.meninggal | 5.749 | dibi/kejadian_besar.csv `[kode=yogya2006,metrik=meninggal,versi=USGS].nilai` | terverifikasi | USGS usp000ej1c |
| sipongi.karhutla2019.luas_ha | 1.649.258 ha | dibi/kejadian_besar.csv `[kode=karhutla2019,metrik=luas_ha].nilai` | resmi | SiPongi |
| brr.aceh2004.meninggal | 127.720 | pustaka brr-2009-nias | resmi | BRR NAD–Nias 2009, capaian 4 tahun |
| brr.aceh2004.meninggal_naratif | 126.741 | pustaka brr-2009-scattered-beads | resmi | BRR, The Scattered Beads hlm. x |
| usgs.pangandaran2006.meninggal | 665 | pustaka usgs-usp000ensm | terverifikasi | USGS impact-text, jumlah per kab |
| usgs.pangandaran2006.hilang | 65 | pustaka usgs-usp000ensm | terverifikasi | idem |
| usgs.pangandaran2006.runup_maks | 4,6 m | pustaka usgs-usp000ensm | terverifikasi | Widarapayung |
| r3p.cianjur2022.rumah_rusak_bpbd | 53.408 | pustaka bnpb-2022-r3p-cianjur | resmi | data BPBD 7 Des 2022, hlm. PDF 13 |
| sipongi.karhutla2015.luas_ha | (kunci Bab 7) | dipakai ulang | resmi | 2.611.411,44 ha |
| bankdunia.karhutla2015.kerugian_usd | (kunci Bab 7) | dipakai ulang | terverifikasi | US$16,1 miliar |
| brr.aceh2004.hilang | 93.285 | pustaka brr-2009-nias | resmi | idem |
| brr.nias2005.meninggal | 966 | pustaka brr-2009-nias | resmi | idem |
| r3p.cianjur2022.meninggal | 334 | pustaka bnpb-2022-r3p-cianjur | resmi | R3P Cianjur, data BPBD 7 Des 2022 |
| r3p.cianjur2022.rumah_rusak | 114.315 | pustaka bnpb-2022-r3p-cianjur | resmi | SK Bupati tahap II |
| koplitz.asap2015.kematian_berlebih | 91.600 (24.000–159.200) | pustaka koplitz-2016-asap | estimasi-model | Koplitz dkk. 2016 |
| surono.merapi2010.jiwa_terselamatkan | 10.000–20.000 | pustaka surono-2012-merapi | estimasi-model | perkiraan penulis, belum diuji; berdampingan dengan 386 |
| harnantyari.palu2018.evakuasi_melihat_orang_lain | 82,5% | pustaka harnantyari-2020-palu | terverifikasi | survei sebulan pascakejadian |
| widiyanto.palu2018.waktu_tiba | 3–8 menit | pustaka widiyanto-2019-palu | terverifikasi | survei lapangan |
| widiyanto.palu2018.runup_maks | 10,73 m | pustaka widiyanto-2019-palu | terverifikasi | Tondo |
| renstra.peringatan_dini.keterpenuhan | 6% | program-terbukti/bukti_dampak.csv `[id=B017].nilai_angka` | resmi | Renstra hlm. 70 |
| covid19.rasio_terhadap_dibi.2015_2025 | 13,6 kali | pustaka bnpb-2025-renstra | resmi | olah 161.870 / 11.873 |

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/mitigasi/bukti/bab-04.pustaka.json` (36 entri; kunci `id` dipakai kolom `pustaka`
registri). Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| bnpb-2026-dibi | BNPB, Data Informasi Bencana Indonesia (DIBI), dasbor publik 1, ditarik 23 Okt 2026 | primer |
| bnpb-2025-ckan | BNPB, data.bnpb.go.id, Jumlah Kejadian Bencana Menurut Jenis 2010–2024 | primer |
| bnpb-2023-juklak7 | Juklak BNPB 7/2023 Standar Data Kejadian dan Dampak Bencana (korpus) | primer |
| bnpb-2025-renstra | Perban BNPB 5/2025 Renstra BNPB 2025–2029 (korpus) | primer |
| bnpb-2018-info-bencana-sep | BNPB, Info Bencana September 2018 | primer |
| bnpb-2025-buletin-des | BNPB, Buletin Info Bencana Vol. 6 No. 12, Desember 2025 | primer |
| bnpb-2022-r3p-cianjur | R3P Gempa Bumi Kabupaten Cianjur 2022 (portal BNPB) | primer (dibuka riset E) |
| brr-2009-nias | BRR NAD–Nias (2009), Nias: Membangun Melalui Jalan yang Jarang Dilalui | primer (dibuka riset E) |
| ri-2005-perpres30 | Perpres 30/2005 Rencana Induk RR Aceh–Nias (batang tubuh) | primer (dibuka riset E) |
| usgs-us1000h3p4 | USGS, M 7.5 Palu, 28 Sep 2018 | primer |
| usgs-usp000ej1c | USGS, M 6.3 Java, 26 Mei 2006 (UTC) | primer |
| usgs-us1000g3ub | USGS, M 6.9 Lombok, 5 Agu 2018 | primer |
| usgs-usp000h237 | USGS, M 7.6 Sumatra (Padang), 30 Sep 2009 | primer |
| usgs-us7000d030 | USGS, M 6.2 Sulawesi Barat, 15 Jan 2021 | primer |
| widiyanto-2019-palu | Widiyanto dkk. (2019), NHESS 19: 2781–2794 | primer |
| harnantyari-2020-palu | Harnantyari dkk. (2020), IJDRR 43: 101389 | primer (abstrak) |
| surono-2012-merapi | Surono dkk. (2012), JVGR 241–242: 121–135 | primer (naskah penuh, salinan McGill) |
| usgs-usp000ensm | USGS, M 7.7 Java (Pangandaran), 17 Jul 2006, impact-text | primer |
| brr-2009-scattered-beads | BRR NAD–Nias (2009), Case Study: The Scattered Beads | primer |
| koplitz-2016-asap | Koplitz dkk. (2016), ERL 11: 094023 | primer |
| who-2023-kematian-berlebih | WHO (2023), estimasi kematian berlebih COVID-19 | primer |
| satgas-2022-covid19 | Satgas Penanganan COVID-19, data.covid19.go.id (arsip) | primer |
| sipongi-luas | SiPongi, indikasi luas kebakaran (public/data/luas_resmi.json) | primer |
| setkab-2023-plumpang | Setkab, 5 Mar 2023 (Kepala BNPB, Plumpang) | primer |
| setkab-2019-wamena | Setkab, 30 Sep 2019 (Presiden, Wamena) | primer |
| bnpb-2024-tpa | BNPB, 22 Jun 2024 (16 TPA 2023) | primer |
| bnpb-2023-sarimukti | BNPB, 26 Agt 2023 (Sarimukti) | primer |
| icg-2002-maluku | ICG Asia Report N°31 (2002) | primer |
| icg-2001-kalimantan | ICG Asia Report N°19 (2001) | primer |
| hrw-2002-poso | Human Rights Watch, siaran pers 4 Des 2002 | primer |
| brookings-2001-pengungsi | Brookings-CUNY, Report of Seminar on Internal Displacement in Indonesia (2001) | primer |
| bps-2024-podes | BPS, Statistik Potensi Desa Indonesia 2024 | primer |
| kontan-2018-palu | Kontan, 29 Sep 2018 (mengutip Kepala BMKG) | sekunder |
| jpnn-2018-sulteng | JPNN, Oktober 2018 (mengutip BNPB 21 Okt) | sekunder |
| suarasurabaya-2026-sumatra | Suara Surabaya, Januari 2026 (mengutip BNPB 12 Jan) | sekunder |
| worldbank-2016-cost-fire | Bank Dunia (2016), The Cost of Fire, Knowledge Note 1 (versi teks dibuka) | primer |

Sumber berbeda untuk bab ini: 36 entri, 33 primer dan 3 sekunder (sekunder tidak untuk badan teks).

---

## Catatan perbaikan setelah pemeriksaan (24 Oktober 2026)

Empat belas temuan pemeriksa dicek ke sumber. Sebelas diterapkan seperti diusulkan. Tiga diterapkan dengan koreksi
rincian setelah sumbernya dibuka:

- **Atribusi Aceh 2004 (temuan sedang):** diterapkan dengan koreksi. Pemeriksa menyebut paket data menisbatkan 126.741 ke
  BRR dan 127.720 ke CNN, sehingga bukti dianggap terbalik. Setelah dicek, keduanya ada di dokumen BRR primer: seri buku
  BRR *The Scattered Beads* (arsip BNPB 6748628c6962c.pdf, dibuka 24 Okt 2026) memuat 126.741 di teks naratif (hlm. x)
  dan 127.720 di infografik capaian 4 tahun (PDF 15). Halaman capaian yang sama di buku *Nias* dibaca riset E (hlm.
  xiii). Jadi bukti tidak terbalik. Yang keliru adalah atribusi di `kejadian_besar.csv`, yang perlu direkonsiliasi oleh
  pemilik paket `dibi`. PDF buku *Nias* (670de67d21dc8.pdf) melebihi batas unduh WebFetch, jadi Tabel 1.1 tidak dibaca
  ulang. Frasa rumah diseragamkan menjadi "hancur atau rusak berat".
- **Label Bank Dunia (temuan sedang):** diterapkan dengan koreksi. Bab 4 kini terverifikasi, sama dengan registri Bab 7,
  karena versi teks Knowledge Note dibuka 24 Okt 2026 dan memuat US$16,1 miliar dan 1,9% PDB. Ada ketidakselarasan yang
  tersisa di luar cakupan berkas ini: catatan `worldbank-2016-cost-fire` di `bab-07.pustaka.json` masih menulis
  "tidak terbuka". Pemilik Bab 7 perlu memperbaruinya.
- **R3P Cianjur (temuan sedang):** diterapkan. Satu rincian dikoreksi: 53.408 rumah rusak (BPBD 7 Des) ada di paragraf
  korban hlm. PDF 13, sedangkan 114.315 (SK tahap II) ada di hlm. PDF 55 menurut riset E. Jadi keduanya tidak di
  paragraf yang sama.
- **Merapi 2010:** studi kasus mengikuti KERANGKA terbaru. Naskah penuh Surono dkk. dibuka lewat salinan McGill, karena
  HAL insu-00723412 menolak akses otomatis. Badan artikel menunjukkan dasar hitungan 10.000–20.000 (2.300 rumah hancur
  dikali 4–8 jiwa), jadi label estimasi-model dari pemeriksa dipertahankan.
