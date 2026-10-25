# Berkas bukti BAB 8 GRAND DESIGN DAN STRATEGI

Kajian: Grand Design Ketahanan Air Pulau Jawa 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9; Buku Pegangan L56–L64). Penulis bab menulis
hanya dari berkas ini dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/air/bukti/bab-08.angka.json`: kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/air/bukti/bab-08.pustaka.json`: entri CSL-JSON (lihat bagian Pustaka).

Bahan yang dibaca: `KERANGKA.md` §0, §1, §2, §4 (Bab 7–9), §6, §7, §8; `KEPUTUSAN.md`; Buku Pegangan L56–L64;
`PEDOMAN-DESAIN.md` §C9; `riset/A`–`E` (riset E sudah ada saat berkas ini ditulis); berkas bukti Bab 1–4 Kajian 1
(dipakai ulang bila butirnya sudah diverifikasi, disebut per butir); paket `data/program-terbukti/` (README, kompendium,
renas, renstra, organisasi), `data/lembaga/` (matriks_air, celah, peran, sumber, teks mentah UU 24/2007, UU 17/2019,
PP 30/2024, PP 37/2010, Perpres 12/2024), `data/air-jawa/` (ws, ws_kab), `data/dibi/rekap_provinsi_tahunan.csv`,
`data/skenario-hidromet/` (musim_hujan, kalender_bulanan_pulau), `data/turunan/` (daftar_perhatian, kepekaan),
`data/angka.json`; korpus `data/raw/hukum/teks` (Perban 1/2025, 2/2023, 2/2024, 3/2026, 4/2020, 6/2025, 7/2025,
9/2025, 11/2025; Juklak 4/2026, 7/2026; indeks JDIH untuk Juklak 10/2023); `public/udara/data/omc_hasil.json` dan
`scripts/omc/nilai.py`; sumber web yang dibuka 24 Oktober 2026 (disebut per butir).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah; dokumen, tabel, atau peraturan dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal, laporan evaluasi independen, data terbuka) |
| estimasi-model | Keluaran model yang belum diuji balik, siapa pun pembuatnya |
| asumsi-kebijakan | Pilihan penyusun (definisi, ambang, pemetaan, rumus arah 2030) |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks naskah final**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**. Program
disebut dengan posisi rubrik paket `program-terbukti` (KERANGKA §2 butir 12). Kata "terbukti" hanya boleh dipakai untuk
baris berkolom `kekuatan` = `kuat`; satu-satunya baris itu untuk kajian air adalah P16 (luar negeri).

---

## Kerangka bab (dari KERANGKA.md §4, BAB 8)

- **Judul:** BAB 8 GRAND DESIGN DAN STRATEGI (16 hlm).
- **Subbab:** 8.1 Kerangka Program; 8.2 Sasaran 2029 dan Arah 2030; 8.3 Strategi per Komponen, Musim, dan Fase; 8.4
  Rekomendasi per BBWS dan Daerah Irigasi Kewenangan Pusat; 8.5 Daftar Perhatian Kab/Kota dan Instrumen Daerah; 8.6
  Posisi Risiko BNPB terhadap Tanggul Laut Pantura; 8.7 Desa, Sekolah, dan Relawan; 8.8 Rencana Aksi Musim Hujan
  2026/2027; 8.9 Kesiapan Musim Kemarau 2027; 8.10 Agenda Bukti 2026–2030.
- **Tujuan bab:** menyusun sasaran, strategi, dan aksi yang dapat dijalankan dengan instrumen yang berlaku, dimulai
  sebelum puncak musim hujan 2026/2027.
- **Pertanyaan kunci:**
  1. Sasaran 2029 apa yang punya baseline resmi untuk Jawa, dan baseline apa yang harus dibentuk?
  2. Aksi apa per komponen, musim, dan fase, siapa pemimpinnya, dan apa peran BNPB?
  3. Apa yang harus selesai sebelum puncak musim hujan Desember 2026–Februari 2027?
  4. Apa posisi BNPB terhadap Tanggul Laut Pantura?
  5. Bagaimana program berjalan tanpa evaluasi dampak dibuktikan sampai 2030?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Irisan Jawa Renas 1.a dan 1.b dari DIBI | **Dapat dihitung** (P1 T1.3–T1.5). Renas sendiri hanya memuat proyeksi 2025 nasional (0,22 dan 2.643 per 100.000) dan target 2029 "Menurun" tanpa angka; definisi "terdampak" tidak tertulis di teks Renas yang dibaca |
| Renas 1.c per kab/kota Jawa; baseline diminta ke Direktorat Peringatan Dini | **Tetap celah** (KERANGKA §7 butir 33). Ditambah: baseline RPJMN KP 08.04.02 = 6,00 (riset E11b), sedangkan Renstra menulis N/A |
| Target proses RTD bendungan terintegrasi renkon BPBD (baseline 2027) | **Sebagian.** Yang diwajibkan pasal: Pembangun menyusun RTD dengan mengikutsertakan instansi teknis (Penjelasan: contoh SKPD urusan PB), konsultasi ke bupati/wali kota dan gubernur, penetapan oleh Pemilik, sosialisasi ke pemda, dan penyelamatan masyarakat sesuai peraturan di bidang PB (PP 37/2010 Pasal 52–54, 56 ayat (3), 57). "Integrasi RTD ke renkon BPBD" tidak tertulis; itu usulan penyusun (asumsi-kebijakan). **Koreksi istilah:** RTD di PP 37/2010 hanya untuk bendungan; untuk tanggul dan polder pengait tertulisnya PP 30/2024 Pasal 96 ayat (1) huruf c–d (SOP prasarana dan SOP evakuasi), bukan "RTD" |
| Baseline GNSS/InSAR (2027), e-PAKSI (2027), neraca per WS dari Pola/RPSDA | e-PAKSI dikonfirmasi ada; kewajibannya hanya untuk DI kewenangan pemda yang diusulkan lewat DAK (P1 T1.13). Untuk DI kewenangan pusat sumber itu tidak mengatur, jadi baseline pusat menjadi permintaan data ke Ditjen SDA. **Pola/RPSDA tersedia untuk 10 WS kewenangan pusat** (riset E6), jadi neraca per WS bukan lagi celah penuh |
| Target tampungan Kementerian PU hanya konteks | Tetap: angka 70 m³/kapita hanya sekunder (bab-02 C2.4). Konteks resmi pengganti: RPJMN KP 08.04.05 (19 ke 100) |
| Matriks komponen × musim × fase dengan kategori bukti | Draf 30 sel disusun tim (P2 I2.1), jumlah sel per kategori dilaporkan sebagai draf; tidak ada sel yang bertumpu pada program berbukti kuat atau sedang di Jawa |
| Per BBWS tiga lapis; RTD dan peringatan dini per WS | Dasar pasal dikonfirmasi dengan batas: RTD wajib melibatkan instansi teknis (PP 37/2010), sistem peringatan dini dan SOP evakuasi per WS adalah pengaturan oleh pengelola SDA (PP 30/2024 Pasal 94 ayat (5), 96); tautan kab–WS resmi hanya 18 baris (P2 T2.17) |
| Tanggul Laut Pantura: prasyarat P16, telaah risiko lewat Kemenko PMK, Korea sebagai alasan evaluasi independen | Dikonfirmasi; **ditambah:** Kepala BNPB sudah anggota Dewan SDA Nasional (Perpres 53/2022, Keppres 18/2024). Korea tetap sekunder (laporan BAI 2018 asli tidak dibuka) |
| Rencana Aksi Musim Hujan, puncak Desember–Februari | **Koreksi untuk Jawa:** puncak Januari 2027 (sebagian Jawa) dan Februari 2027 (sebagian besar Jawa); Desember adalah awal musim di sebagian besar Jawa (bab-01 §0.1 butir 2) |
| Kesiapan Kemarau 2027: PDKM, tampungan, Katam, asuransi pertanian | Asuransi pertanian dikonfirmasi (Renas 2.5.1.c). PDKM hanya sekunder; Katam dan status tampungan tetap celah |
| OMC: Sudah ada (BMKG), bukti dampak belum terukur | Dikonfirmasi: fungsi BMKG (Perpres 12/2024 Pasal 4, 5, 24). Di Renas, modifikasi cuaca hanya muncul di indikator hari operasi kedaruratan (gabungan karhutla, banjir, kekeringan, longsor) kegiatan 1.2.1.h "Pembinaan dan Pengawasan TRC PB Multi Sektor di Tingkat Daerah"; BNPB salah satu PJ kegiatan TRC itu, bukan PJ OMC. Sortie tercatat di platform: 0 |
| Destana: Program berjalan, wajib evaluasi dampak; garis dasar tingkat ketangguhan Perban 7/2025 | **Sebagian: penilaian ada, opsional dan mandiri.** Penilaian Ketangguhan "dapat dilakukan" dan "dilakukan secara mandiri oleh Desa dan Kelurahan", hanya untuk desa yang menjalankan tahap pelaksanaan Program Destana (Perban 7/2025 Pasal 14 ayat (1), (4)); itu swa-penilaian, bukan garis dasar evaluasi dampak. Pembanding desa belum Destana dan penilai independen belum ada instrumennya |

- **Komponen (KERANGKA):** Halaman kerangka 8.1 (B5.12); Tabel 8.1 indikator (B5.19, G22); Tabel 8.2 matriks komponen ×
  musim × fase (B5.22); Gambar 8.1 garis waktu tiga fase per musim (B5.12); Tabel 8.3 per BBWS (B5.7); Tabel 8.4 daftar
  perhatian × instrumen daerah (B5.7); Kotak 8.1 Tanggul Laut Pantura (B5.5); Gambar 8.2 kalender Rencana Aksi (G23,
  tabel native); Tabel 8.5 keputusan 14 hari pertama (B5.7); Tabel 8.6 agenda bukti (B5.7); Halaman studi kasus 8.1
  PAMSIMAS (B5.30, bukti sedang). Rincian di bagian Komponen.
- **Status data (KERANGKA):** sebagian (Pola/RPSDA; baseline 1.c per kab Jawa; data ZOM BMKG per kab; keberadaan wadah
  koordinasi WS). **Pembaruan:** Pola/RPSDA 10 WS dan dasar Dewan SDA Nasional serta TKPSDA WS sudah terbuka (riset E6,
  E13); baseline 1.c per kab dan ZOM per kab tetap tidak ada.

Catatan lingkup: Bab 8 adalah satu-satunya tempat strategi (prinsip 17). Lembaga dan pembiayaan rinci tinggal di Bab 9;
rekomendasi bernomor tinggal di Bab 10 (register bersama §6). Lantai skenario (prinsip 9) berlaku di subbab 8.8 dan 8.9:
perencanaan musim tidak boleh memakai skenario lebih ringan daripada musim tercatat terburuk di Jawa.

---

## P1. Sasaran 2029 apa yang punya baseline resmi untuk Jawa, dan baseline apa yang harus dibentuk?

### Inti

Dari sasaran resmi yang menyangkut air, hanya indikator korban Renas 1.a dan 1.b yang dapat diiris untuk Jawa dari
DIBI. Untuk kajian air baris utamanya hidrometeorologi: meninggal dan hilang di Jawa 0,094 per 100.000 penduduk pada
2024 dan 0,154 pada 2025 (median 2015–2024 0,097). Baris semua bencana, padanan definisi Renas, 0,115 (2024) dan 0,260
(2025; median 0,13) disandingkan dengan proyeksi nasional Renas 0,22 untuk 2025, dengan catatan bahwa 160 dari 394 jiwa
pada 2025 (40,6%) berasal dari bencana nonalam (kebakaran permukiman 89, gagal teknologi 71), bukan bencana air. Target 2029
Renas untuk keduanya hanya "Menurun". Target berangka lain (Renas 1.c, desa dibina, asuransi pertanian, desa
berketahanan RPJMN) bersifat nasional tanpa baseline per kab/kota Jawa, sehingga Bab 8 memakainya sebagai target nasional
dan menetapkan pembentukan baseline Jawa bertenggat untuk cakupan peringatan dini, keikutsertaan BPBD dalam RTD bendungan,
laju penurunan muka tanah, dan kondisi jaringan DI kewenangan daerah (e-PAKSI); kondisi DI kewenangan pusat menjadi
permintaan data.

### Temuan bersumber

**Sasaran resmi dan angkanya**

- **T1.1 Renas Tabel 2.8.** Kolom "PROYEKSI 2025" dan "TARGET 2029": 1.a proporsi jumlah kematian penduduk (dan hilang)
  akibat bencana per 100.000 jiwa 0,22 ke "Menurun"; 1.b proporsi penduduk terdampak per 100.000 jiwa 2.643 ke
  "Menurun"; 1.c penduduk per 100.000 jiwa di daerah berisiko yang tercakup informasi peringatan dini 11.060 ke 52.000.
  Sumber: `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` hlm. 32 [`bnpb-2025-renas`]; kunci baru
  `renas.indikator_1a.proyeksi_2025`, `renas.indikator_1b.proyeksi_2025`; kunci lama `renas.indikator_1c.2025`,
  `renas.indikator_1c.2029` (bab-01). **resmi**. Catatan: teks Renas yang dibaca tidak mendefinisikan "terdampak"
  (pencarian kata "menderita" dan "penduduk terdampak" di seluruh teks, 24 Okt 2026).
- **T1.2 RPJMN dan Renstra.** RPJMN Lampiran III hlm. 913 (BNPB, dicek dari gambar halaman): PP 08.04 penurunan nilai
  IRB nasional baseline 1,54 (2023), target 1,2; KP 08.04.01 daerah berkapasitas PB minimal sedang 62 (2023), 67 (2025),
  90 (2029); KP 08.04.02 cakupan layanan peringatan dini di daerah berisiko 6,00 (baseline), 6,10 (2025), 6,32 (2029);
  KP 08.04.04 desa berketahanan bencana multipihak 10,31 (baseline), 10,49 (2025), 11,74 (2029). Lampiran II hlm.
  437–440: KP 08.04.05 Kementerian PU rasio kab/kota yang menerapkan infrastruktur berketahanan bencana di lokasi
  prioritas 19 ke 100. Sumber: `riset/E-dokumen-primer.md` E11(b) [`ri-2025-perpres12-rpjmn`]; kunci baru
  `rpjmn.kp080402.peringatan_dini_baseline`, `rpjmn.kp080404.*`, `rpjmn.kp080401.kapasitas_baseline_2023`,
  `rpjmn.kp080405.*`. **resmi**.
  - *Angka berdampingan:* Renstra menulis kapasitas "67% ke 90%" (kunci lama `renstra.iks_kapasitas_minimal_sedang.awal`)
    memakai target 2025 sebagai titik awal; baseline RPJMN 62 (2023). Renstra menulis baseline peringatan dini N/A;
    RPJMN 6,00 (`program-terbukti/renstra_bnpb_2025_2029.csv`; riset E11b).
- **T1.3 Indikator kegiatan Renstra yang menyentuh Bab 8** (target 2025 ke 2029): daerah yang memiliki Destana 2,58% ke
  3,26%; daerah yang memiliki dokumen rencana aksi kesiapsiagaan 4,27% ke 5,82% (keduanya Direktorat Kesiapsiagaan);
  daerah yang mengaktivasi posko saat penetapan status keadaan darurat 15% ke 35% (unit Renstra Pusat Pengendalian
  Operasi, yang diganti Perban 11/2025); layanan sistem diseminasi peringatan dini berbasis sirine yang memadai 6,09% ke
  6,29% (Direktorat Peringatan Dini). Sumber: `program-terbukti/renstra_bnpb_2025_2029.csv` (Renstra hlm. 134–136)
  [`bnpb-2025-renstra`]; kunci baru `renstra.ikk_destana.*`, `renstra.ikk_renaksi_kesiapsiagaan.*`,
  `renstra.ikk_posko_status.*`. **resmi** (indikator nasional, tanpa rincian Jawa).
- **T1.4 Aksi Renas berangka yang menyangkut air** (baseline 2024 ke target 2029, nasional): 4.5.1.a desa/kelurahan
  yang mendapat pemberdayaan menghadapi bencana 2.234 ke 7.234 (PJ Kementerian Desa PDT, BNPB, Kementerian Sosial);
  1.1.2.a desa dengan sarana prasarana peringatan dini 8.412 ke 8.642 (PJ 11 K/L termasuk Kementerian PU dan BMKG); 1.2.1.c
  Pusdalops daerah yang dibina 395 ke 525 (PJ BNPB); 2.5.1.c luas pertanaman terlindungi asuransi pertanian 278.806 ke
  1.250.000 ha (PJ Kementan); 2.4.4.a NSPK mitigasi dan adaptasi subsiden tanah, target 5 dokumen (PJ KLH; BNPB tidak
  tercantum); 2.4.2.a bangunan pengaman pantai 3.635,42 ke 5.453,12 km (PJ Kementerian PU). Sumber:
  `program-terbukti/renas_aksi_terkait.csv` (Renas hlm. 51, 56, 84, 86, 87, 107) [`bnpb-2025-renas`]; kunci baru
  `renas.aksi_451a.*`, `renas.aksi_112a.*`, `renas.aksi_121c.*`, `renas.aksi_251c.*`; kunci lama
  `renas.aksi_244a.target_2029`, `renas.aksi_242a.*` (bab-02). **resmi**. Pagu indikatif sengaja tidak disalin (P5).

**Irisan Jawa yang dapat dibentuk dari DIBI**

- **T1.5 Renas 1.a irisan Jawa** (meninggal + hilang per 100.000; DIBI cakupan kejadian bencana, semua klasifikasi;
  penyebut tetap SP2020 Jawa 151,59 juta):

  | Tahun | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026* |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Meninggal + hilang, semua bencana | 134 | 292 | 221 | 492 | 95 | 170 | 236 | 715 | 75 | 174 | 394 | 227 |
  | Per 100.000 | 0,088 | 0,193 | 0,146 | 0,325 | 0,063 | 0,112 | 0,156 | 0,472 | 0,049 | 0,115 | 0,260 | 0,150 |
  | Meninggal + hilang, hidrometeorologi (kode 101–106) | 134 | 291 | 217 | 156 | 88 | 169 | 153 | 105 | 74 | 142 | 234 | 176 |
  | Per 100.000 | 0,088 | 0,192 | 0,143 | 0,103 | 0,058 | 0,111 | 0,101 | 0,069 | 0,049 | 0,094 | 0,154 | 0,116 |

  \* 2026 sampai tanggal tarik, sementara. Median 2015–2024: semua bencana 0,13; hidrometeorologi 0,097. Pembanding
  nasional dengan cara sama (penyebut SP2020 270,20 juta): 0,238 (2024) dan 0,842 (2025). Sumber:
  `data/dibi/rekap_provinsi_tahunan.csv` (`pulau=Jawa`, `cakupan=bencana`; `klasifikasi=semua` untuk baris semua
  bencana; `klasifikasi=alam` dan `kode_jenis_juklak` 101–106 untuk hidrometeorologi), dihitung 24 Okt 2026 [`bnpb-dibi`];
  penduduk: BRS BPS No. 7/01/Th. XXIV (riset E10) [`bps-2021-sp2020`]; kunci baru `airjawa.renas1a.*`. Label:
  olah(resmi). Komposisi selisih baris semua dan hidrometeorologi (sumber sama, per `kode_jenis_juklak`): 2018 selisih
  336 jiwa, 325 di antaranya tsunami (kode 108, Banten; tsunami Selat Sunda), 7 gempa, 2 gagal teknologi, 2 lainnya; 2021
  selisih 83 jiwa (73 erupsi gunung api Jawa Timur, 10 gempa); 2022 selisih 610 jiwa, seluruhnya gempa (602 + 8 di Jawa
  Barat); 2025 selisih 160 jiwa, seluruhnya nonalam (kebakaran permukiman kode 202: 89; gagal teknologi kode 203: 71).
  Jadi lonjakan 2018 berasal dari tsunami Selat Sunda dan 2022 dari gempa Jawa Barat, sedangkan kenaikan baris semua
  bencana 2024 ke 2025 sebagian besar bukan bencana air (baris hidrometeorologi naik 0,094 ke 0,154; selisih 2024 hanya 32
  jiwa: kebakaran permukiman DKI 31, gempa 1). Kunci baru `airjawa.renas1a.jawa_hidromet_2024`,
  `airjawa.renas1a.jawa_2018_tsunami`, `airjawa.renas1a.jawa_2022_gempa`, `airjawa.renas1a.jawa_2025_nonalam`,
  `airjawa.renas1a.jawa_2025_nonalam_persen`, `airjawa.renas1a.jawa_2025_kebakaran_permukiman`,
  `airjawa.renas1a.jawa_2025_gagal_teknologi`.
  Untuk kajian air, baris hidrometeorologi menjadi baris utama; baris semua bencana tetap disajikan sebagai padanan
  definisi Renas 1.a.
- **T1.6 Renas 1.b irisan Jawa** (jumlah kolom `menderita` per 100.000, semua bencana, penyebut sama): 1.931 (2024),
  1.713 (2025); median 2015–2024 1.681; rentang 340 (2015) sampai 3.603 (2018). Pembanding nasional 2024 dengan cara sama:
  2.817. Sumber: idem; kunci baru `airjawa.renas1b.*`. Label: olah(resmi) untuk angka; **asumsi-kebijakan** untuk
  pemetaan "terdampak" ke kolom `menderita` (Renas tidak mendefinisikannya, T1.1).
- **T1.7 Patahan seri DIBI.** DIBI berpatahan seri 2024 (definisi kejadian bencana Juklak 7/2023 sejak data 2024) dan
  patahan kategori 2018 dan 2024; tren memakai penanda patahan (KERANGKA §2 butir 7; `dibi/README.md`;
  `juklak_2023.ambang.meninggal` di bab-03). **resmi** (aturan) dan asumsi-kebijakan (cara sajikan).

**Lantai dan model yang wajib berdampingan bila sasaran dikaitkan dengan musim**

- **T1.8 Lantai skenario musim hujan Jawa.** Meninggal + hilang tercatat terbesar dalam 18 musim: 270 (2008/2009;
  173 + 97); terbesar dalam 10 musim terakhir: 237 (2025/2026; 216 + 21). Sumber: `skenario-hidromet/musim_hujan.csv`;
  kunci lama `hidromet.jawa.lantai.meninggal_hilang`, `hidromet.jawa.lantai.meninggal_hilang_10_musim`,
  `hidromet.jawa.musim_2025.meninggal`. **resmi**.
  - *Disandingkan dengan model:* korban jiwa model musim analog La Niña Jawa 254–547 (kunci lama
    `hidromet.jawa.lanina.korban_jiwa`), **estimasi-model, belum diuji balik**. Batas bawah pita (254) di bawah lantai
    tercatat (270), jadi pita tidak boleh tampil tanpa catatan lantai (prinsip 9; bab-03 Catatan wajib).
  - **Catatan wajib komposisi lantai.** 270 memuat kegagalan tanggul Situ Gintung, 27 Maret 2009: baris DIBI Kab.
    Tangerang, banjir, 100 meninggal dan 93 hilang (193 jiwa, 71,5% dari 270). Sumber: `riset/mentah/dibi_hidromet.json`
    (baris per kab-tanggal, tarik DIBI dasbor publik 23 Okt 2026), sama dengan `skenario-hidromet/dibi_kab_tahun.csv` baris
    Kab. Tangerang 2009 banjir [`bnpb-dibi`]; kunci bab-06 `dibi.situgintung2009.meninggal`, `dibi.situgintung2009.hilang`,
    `hidromet.jawa.lantai.porsi_situgintung_persen` (dipakai ulang, tidak didaftarkan ganda). **resmi**. Pencocokan baris
    DIBI "banjir" Kab. Tangerang dengan Situ Gintung adalah pencocokan tim lewat tanggal dan wilayah (DIBI tidak menyebut
    nama situ; bab-06 sudah mengecek tanggalnya). Penyebab, dua sumber berdampingan: Harsoyo (2010, Jurnal Sains &
    Teknologi Modifikasi Cuaca 11(1): 9–17) menyimpulkan curah hujan hanya faktor penyerta, sedangkan penyebab utama
    adalah tanggul yang menua dan pelimpah yang tidak lagi berfungsi sesuai rancangan [`harsoyo-2010-situ-gintung`];
    **terverifikasi** (halaman artikel dan abstrak dibuka 24 Okt 2026). Tim Tanggap Darurat PVG (berita Kementerian ESDM
    6 Apr 2009) memperkirakan penyebabnya curah hujan tinggi di hulu, retakan pada tubuh tanggul, dan limpasan di mercu
    [`esdm-2009-situ-gintung`]; **resmi** (dibuka 24 Okt 2026). Keduanya sepakat bahwa kondisi tanggul ikut menentukan.
    Tanpa kejadian itu, musim 2008/2009 menjadi 77 jiwa dan meninggal + hilang terbesar dalam 18 musim menjadi 237
    (2025/2026; berikutnya 2013/2014, 216); kunci baru `hidromet.jawa.musim_2008.tanpa_27mar2009`,
    `hidromet.jawa.lantai.tanpa_27mar2009`. Lantai perencanaan tetap 270 (KERANGKA §2 prinsip 9 dan register P01: lantai
    Jawa 2008/09 = 270; bab-06 [Inferensi tim]: tidak ada musim Jawa yang boleh disisihkan dari lantai, karena kejadian
    kelas Situ Gintung dapat terulang); 237 disajikan berdampingan sebagai lantai musim hujan tanpa kegagalan prasarana,
    berbentuk baris kepekaan (KERANGKA §2 prinsip 10, pola "dengan dan tanpa analog terbesar"). Terhadap baris itu, batas
    bawah pita model (254) berada di atas 237.
    Kasus ini adalah bukti tercatat untuk butir RTD bendungan dan situ (8.4, 8.8): baris kab-tanggal dengan meninggal +
    hilang terbesar di data hidrometeorologi Jawa (sumber sama, 2008–2026; berikutnya Banjarnegara 12 Des 2014, 110 jiwa)
    berasal dari kegagalan prasarana tampungan air.
- **T1.9 Kepekaan peringatan dini (dua lintasan).** Pada lantai Jawa, faktor lintasan Renas 1.c 0,6034 memberi 162,9
  jiwa, faktor lintasan Renstra 0,998 memberi 269,5 jiwa; keduanya rasio lintas negara (R = 8), bukan efek kausal. Sumber:
  kunci lama `hidromet.jawa.lantai.pd_renas.*`, `hidromet.jawa.lantai.pd_renstra.*`. **asumsi-kebijakan**. Prinsip 10:
  hanya di kartu dan grafik berpil Asumsi kebijakan, tidak di tesis, Pesan Kunci, atau judul temuan.

**Baseline yang harus dibentuk dan dasar pembentukannya**

- **T1.10 Cakupan peringatan dini per kab/kota Jawa tidak ada.** Data Renas 1.c dan KP 08.04.02 hanya nasional (T1.1,
  T1.2). KERANGKA §7 butir 33. Platform sistem peringatan dini dikelola Deputi Bidang Pencegahan (Perban 2/2024 Pasal 3
  ayat (2)) dan penyelenggaraan di daerah oleh BPBD lewat platform itu (Pasal 25). Sumber:
  `data/raw/hukum/teks/perban-nomor-2-tahun-2024.json` hlm. 4–5, 12 [`bnpb-2024-peringatan-dini`]. **resmi**.
- **T1.11 RTD bendungan.** RTD disusun Pembangun bendungan dengan instansi teknis dan masyarakat terpengaruh,
  dikonsultasikan ke bupati/wali kota dan gubernur terdampak, ditetapkan Pemilik (PP 37/2010 Pasal 52–54); Penjelasan
  menyebut perangkat daerah urusan PB sebagai contoh instansi teknis. Tindakan pengamanan bendungan dilakukan Pengelola
  bendungan (Pasal 56 ayat (2)); tindakan penyelamatan masyarakat "dilakukan sesuai dengan ketentuan peraturan
  perundang-undangan" (ayat (3)), yang menurut Penjelasan adalah peraturan di bidang penanggulangan bencana; RTD yang
  ditetapkan disosialisasikan Pembangun ke masyarakat terpengaruh dan pemerintah provinsi serta kab/kota (Pasal 57).
  Sumber: bab-01 T2.11; `lembaga/matriks_air.csv` A17–A19, A31; `lembaga/mentah/teks/pp-37-2010.json.gz` [`ri-2010-pp37`].
  **resmi**. Batas: PP 37/2010 tidak mewajibkan RTD "diintegrasikan ke renkon BPBD"; yang wajib adalah keikutsertaan
  instansi teknis (termasuk SKPD PB sebagai contoh) dalam penyusunan, konsultasi, dan sosialisasi. Integrasi ke renkon
  adalah usulan penyusun (asumsi-kebijakan) yang dapat bertumpu pada Pasal 56 ayat (3) dan Perban 2/2023. Data berapa bendungan di Jawa yang RTD-nya sudah ditetapkan dan terhubung
  renkon BPBD tidak ditemukan (penelusuran web 24 Okt 2026, kueri "rencana tindak darurat bendungan" dan "Komisi Keamanan
  Bendungan"). Satu contoh terbuka: BBWS menggelar konsultasi masyarakat RTD Bendungan Grawan (Rembang) dengan OPD terkait,
  camat, dan kepala desa dari 14 desa di dua kecamatan; BPBD tidak disebut di berita resmi itu. Sumber: Pemkab Rembang,
  https://rembangkab.go.id/?p=17265 (terbit 2 Sep 2022; diakses 24 Okt 2026) [`rembang-2022-rtd-grawan`]. **resmi** (situs
  pemda; tanggal acara di teks tidak konsisten dengan tanggal terbit).
- **T1.12 Tanggul dan polder tidak diatur RTD.** PP 30/2024 Pasal 96 ayat (1): pengaturan pencegahan daya rusak air
  meliputi (a) penetapan kawasan daya rusak air pada setiap WS, (b) penetapan sistem peringatan dini pada setiap WS,
  (c) penetapan prosedur operasi standar sarana dan prasarana pengendalian daya rusak air, (d) penetapan prosedur operasi
  standar evakuasi korban bencana akibat daya rusak air; ayat (2) pembinaan meliputi pelatihan tanggap darurat; ayat (4)
  pengendalian meliputi upaya pemindahan penduduk dari kawasan daya rusak air. Sumber:
  `lembaga/mentah/teks/pp-30-2024.json.gz` hlm. 64–66 [`ri-2024-pp30`]. **resmi**. Siapa yang menetapkan: Pasal 96 tidak
  menyebutnya; Pasal 94 ayat (5) menempatkan tanggung jawab pengendalian daya rusak air pada "Menteri,
  menteri/pimpinan lembaga pemerintah nonkementerian, gubernur, dan/atau bupati/wali kota, serta Pengelola Sumber Daya
  Air Wilayah Sungai dan Masyarakat"; kawasan daya rusak air ditetapkan Menteri, gubernur, atau bupati/wali kota setelah
  berkoordinasi dengan menteri/pimpinan lembaga pemerintah nonkementerian (Pasal 97 ayat (2), (3)). BNPB tidak disebut
  namanya. Tafsir tim: penetapan sistem peringatan dini dan SOP evakuasi per WS dipimpin pengelola SDA (Kementerian
  PU/BBWS, pemda sesuai kewenangan WS); BNPB dan BPBD berada pada renkon dan koordinasi.
- **T1.13 Kondisi jaringan irigasi: e-PAKSI.** Lampiran petunjuk teknis DAK Fisik Bidang Irigasi (salinan berkop Presiden
  RI, hlm. 2392–2396, diunggah DJPK Kemenkeu April 2024): pemda yang mengusulkan DAK irigasi wajib mengumpulkan data
  inventarisasi aset dan penilaian kinerja sistem irigasi, secara digital lewat e-PAKSI (menggabungkan Pengelolaan Aset
  Irigasi dan Indeks Kinerja Sistem Irigasi) atau manual memakai blangko Permen PUPR tentang PAI dan O&P. Sumber:
  https://djpk.kemenkeu.go.id/wp-content/uploads/2024/04/Bidang-Irigasi.pdf (diunduh dan dibaca lewat `pdftotext`, 24 Okt
  2026) [`djpk-2024-dak-irigasi`]. **resmi**. Nomor Perpres induk lampiran tidak terbaca di berkas yang diunduh.
  **Lingkup:** lampiran itu mengatur menu DAK provinsi dan kab/kota. Data kondisi teknis disiapkan untuk "seluruh daerah
  irigasi yang menjadi kewenangannya", dan kewajiban pengumpulan data inventarisasi aset dan penilaian kinerja berlaku
  "khusus untuk daerah irigasi yang akan diusulkan penanganannya melalui DAK Bidang Irigasi" (hlm. 2395–2396, dibaca
  ulang 24 Okt 2026). Sumber itu tidak mengatur DI kewenangan pusat; jadi e-PAKSI di sini wajib hanya untuk DI kewenangan
  pemda yang diusulkan lewat DAK, dengan pemda sebagai pelaksana.
  Angka kondisi jaringan per provinsi Jawa tetap tidak ditemukan (riset B tabel irigasi; KERANGKA §7 butir 20).
- **T1.14 Laju penurunan muka tanah.** Laju terverifikasi per titik ada (GNSS CPKL Pekalongan 10,7 cm/th; Susilo dkk.
  2023), tetapi satu stasiun tidak mewakili kota (CSEM Semarang 0,08 cm/th berdampingan dengan 2–10 cm/th Badan Geologi
  2018 di RPSDA Jratunseluna). Sumber: bab-04 P4; riset E17, E6 [`susilo-2023-gnss`,
  `kemenpupr-2024-rpsda-jratunseluna`]. **terverifikasi** (GNSS), **resmi** (kutipan Badan Geologi dalam dokumen PU).
  Pengukuran resmi berkala per kota pesisir utara tidak ditemukan.
- **T1.15 Neraca air per WS tersedia di Pola/RPSDA 10 WS kewenangan pusat** (Bengawan Solo, Brantas, Jratunseluna,
  Progo-Opak-Serang, Citarum, Ciliwung-Cisadane, Cimanuk-Cisanggarung, Citanduy, Serayu-Bogowonto,
  Cidanau-Ciujung-Cidurian); Pemali-Comal (WS kategori B) tidak ditemukan. Contoh: RPSDA Jratunseluna 2024 hlm. 27–28,
  rata-rata defisit air baku 41,60 m³/detik. Sumber: riset E6 [`kemenpupr-pola-rpsda-jawa`,
  `kemenpupr-2024-rpsda-jratunseluna`]; kunci baru `airjawa.ws.n_pola_rpsda`,
  `airjawa.rpsda.jratunseluna.defisit_air_baku_m3s`. **resmi** (dokumen); angka defisit **estimasi-model** (keluaran
  neraca rencana).

### Inferensi

- **I1.1 [Inferensi tim] Tabel 8.1 memakai tiga jenis baris.** (a) Berbaseline resmi dan terukur untuk Jawa: Renas 1.a
  dan 1.b irisan Jawa (T1.5, T1.6), dengan "Target 2029 (resmi, Renas): Menurun". (b) Target nasional tanpa irisan
  Jawa: Renas 1.c, 4.5.1.a, 1.1.2.a, 1.2.1.c, 2.5.1.c; RPJMN KP 08.04.02 dan 08.04.04 (T1.2, T1.4); kolom Jawa ditulis
  "–" dengan catatan "baseline Jawa belum ada". (c) Sasaran pembentukan baseline bertenggat: cakupan peringatan dini per
  kab/kota Jawa (2027), persentase bendungan di hulu permukiman yang RTD-nya disusun dengan keikutsertaan BPBD hilir
  (2027; wajib menurut PP 37/2010 Pasal 52), dengan baris tambahan berpil Asumsi kebijakan untuk RTD yang sudah dipakai
  di renkon BPBD (usulan penyusun), laju penurunan muka tanah terukur per kota pesisir utara (2027), kondisi jaringan DI
  kewenangan daerah yang diusulkan DAK lewat e-PAKSI (2027; pelaksana pemda), dan neraca per WS diambil dari RPSDA,
  bukan dibuat kajian (P3). Kondisi jaringan DI kewenangan pusat tidak menjadi baris sasaran; ia permintaan data ke
  Ditjen SDA karena sumber e-PAKSI tidak mengatur DI pusat (T1.13).
- **I1.2 [Inferensi tim] Baseline 1.a Jawa dipilih median, bukan satu tahun, dan baris utamanya hidrometeorologi.** Seri
  semua bencana Jawa sangat bergelombang (0,049 sampai 0,472) karena tsunami Selat Sunda 2018 dan gempa Jawa Barat 2022
  (T1.5). Median 2015–2024 (0,097 hidrometeorologi; 0,13 semua bencana) lebih stabil untuk "Menurun". Pilihan median adalah
  asumsi-kebijakan dan ditulis begitu. Kondisi terakhir untuk kajian air adalah 0,154 (hidrometeorologi 2025); 0,260 (semua
  bencana 2025) disandingkan sebagai padanan definisi Renas dengan catatan bahwa 160 dari 394 jiwa (40,6%) berasal dari
  kebakaran permukiman (89) dan gagal teknologi (71), sehingga kenaikan 0,115 ke 0,260 tidak boleh dibaca sebagai
  memburuknya risiko air.
- **I1.3 [Inferensi tim] Ukuran keberhasilan kajian air berbeda per musim** (tesis KERANGKA §4): musim hujan diukur dengan
  baris hidrometeorologi 1.a; musim kemarau dengan 1.b dan jumlah kab berkejadian kekeringan, karena kekeringan Jawa 0
  meninggal 2015–2026 (bab-01 T1.9).
- **I1.4 [Inferensi tim] Arah 2030 hanya dengan rumus tertulis** (prinsip 11). Contoh yang dapat dipakai penulis, berlabel
  Asumsi kebijakan: 1.c "arah 2030 = target 2029 + kenaikan tahunan rata-rata 2025–2029", yaitu 52.000 + (52.000 −
  11.060) / 4 = 62.235 per 100.000; untuk 1.a dan 1.b, "arah 2030 = tidak melebihi median Jawa 2015–2024". Keduanya
  pilihan penyusun, bukan target resmi.
- **I1.5 [Inferensi tim]** Target RPJMN KP 08.04.05 milik Kementerian PU (19 ke 100) dan target bangunan pengaman pantai
  Renas 2.4.2.a hanya konteks di Tabel 8.1, tidak menjadi sasaran BNPB (KERANGKA P22).

### Celah

- Baseline Renas 1.c per provinsi dan kab/kota Jawa (KERANGKA §7 butir 33). **Permintaan:** Direktorat Peringatan Dini
  (Deputi Bidang Pencegahan). **Penyajian:** sasaran nasional saja.
- Definisi resmi "penduduk terdampak" untuk 1.b dan cara hitung proyeksi 2025 (0,22; 2.643) tidak ditemukan di teks Renas.
  **Penyajian:** pemetaan ke kolom `menderita` ditulis sebagai asumsi-kebijakan. **Permintaan:** Direktorat Pengembangan
  Strategi PB (metadata indikator Renas).
- Penduduk BPS per kab/kota dan per tahun belum ditarik (KERANGKA §7 butir 25); rasio memakai penyebut tetap SP2020.
- Jumlah bendungan di Jawa dengan RTD ditetapkan dan jumlah yang sudah terhubung renkon BPBD. **Permintaan:** Ditjen SDA
  (Balai Teknik Bendungan), BBWS, PJT I dan II. **Penyajian:** baseline dibentuk 2027.
- Angka kondisi jaringan DI kewenangan pusat dan per provinsi (sumber e-PAKSI yang dibaca tidak mewajibkan pendataan DI
  pusat; T1.13). **Permintaan:** Ditjen SDA. **Penyajian:** permintaan data, bukan aksi wajib.
- Pengukuran resmi berkala penurunan muka tanah per kota pesisir utara. **Permintaan:** Badan Geologi dan BIG (stasiun CORS).

---

## P2. Aksi apa per komponen, musim, dan fase, siapa pemimpinnya, dan apa peran BNPB?

### Inti

Lima komponen air dipimpin lembaga lain: air baku dan irigasi pusat oleh Kementerian PU (BBWS, PJT I dan II), air minum
oleh pemda dan BUMD SPAM, jaringan tersier oleh Kementan, air tanah dan amblesan oleh Kementerian ESDM dan pemda, NSPK
penurunan muka tanah oleh KLH. Peran BNPB yang tertulis berada di tiga tempat: komando dan kebutuhan dasar saat tanggap
darurat (UU 24/2007), keikutsertaan BPBD dalam RTD bendungan (PP 37/2010), dan sistem peringatan dini serta renkon (Perban
2/2024, 2/2023). Sistem peringatan dini dan SOP evakuasi per WS di rezim SDA adalah pengaturan oleh pengelola SDA (PP
30/2024 Pasal 94 ayat (5), 96), dengan BNPB dan BPBD pada renkon dan koordinasi. Dari 12 baris kompendium kajian air hanya
satu berbukti kuat (P16, luar negeri) dan satu program dalam negeri berbukti sedang (PAMSIMAS); karena itu draf matriks 30
sel didominasi aksi wajib menurut peraturan (15 sel, dua di antaranya terbatas), dengan 6 sel program berjalan yang wajib
dievaluasi dan 6 sel tidak berlaku beralasan; tidak ada sel yang bertumpu pada program berbukti kuat atau sedang di Jawa.

### Temuan bersumber

**Pemimpin per komponen (mandat tertulis)**

- **T2.1 Air baku.** Pusat menjamin air baku di WS lintas negara, lintas provinsi, strategis nasional (pemetaan penyusun
  ke Kementerian PU); provinsi di WS lintas kab/kota; kab/kota di WS dalam satu kab/kota (UU 17/2019); pengelola SDA
  penugasan PJT I (Brantas, Bengawan Solo) dan PJT II (Citarum). Sumber: `lembaga/matriks_air.csv` A01–A06
  [`ri-2019-uu17`]. **resmi** (A01 dipetakan penyusun).
- **T2.2 Air minum.** SPAM lintas kab/kota oleh provinsi, di kab/kota oleh kab/kota; penyelenggara BUMN/BUMD, UPT/UPTD,
  kelompok masyarakat, badan usaha (PP 122/2015). Sumber: `matriks_air.csv` A07–A10. **resmi** (A07 dipetakan penyusun).
- **T2.3 Irigasi.** DI > 3000 ha dan lintas provinsi oleh pusat, 1000–3000 ha oleh provinsi, < 1000 ha oleh kab/kota
  (Permen PUPR 14/2015); jaringan tersier Kementan; Inpres 2/2025 pengambilalihan sementara oleh PU (14 provinsi luar
  Jawa). Sumber: `matriks_air.csv` A11–A16; `lembaga/celah.csv` C05 [`pupr-2015-permen14`]. **resmi**.
- **T2.4 Waduk dan bendungan.** Menteri SDA menangani keamanan bendungan; RTD disusun Pembangun, ditetapkan Pemilik,
  dikonsultasikan ke kepala daerah; BPBD sebagai contoh instansi teknis. Sumber: `matriks_air.csv` A17–A19, A31
  (T1.11). **resmi**.
- **T2.5 Air tanah dan penurunan muka tanah.** Zona konservasi CAT lintas provinsi (pusat; pemetaan ke Kementerian ESDM),
  CAT dalam provinsi (provinsi); dasar spasial berbeda UU 23/2014 lawan UU 17/2019 (C07); pengendalian amblesan oleh
  Menteri bidang air tanah, gubernur, bupati/wali kota (PP 43/2008) dan "ambles" sebagai kawasan daya rusak air (PP
  30/2024 Pasal 97); NSPK subsiden Renas 2.4.4.a PJ KLH. Sumber: `matriks_air.csv` A20–A27; C06; T1.4. **resmi**.
- **T2.6 Batas mandat Pasal 35.** Pencegahan di Pola PSDA; penanggulangan daya rusak air yang dinyatakan bencana sesuai
  peraturan perundang-undangan (dibaca penyusun sebagai UU 24/2007); tindakan darurat oleh gubernur dan bupati/wali kota
  dalam keadaan membahayakan; kekeringan tidak tercantum sebagai daya rusak air. Sumber: bab-01 T2.1–T2.3, I2.1
  [`ri-2019-uu17`]. **resmi** (pasal); tautan ke UU 24/2007 = tafsiran penyusun.

**Instrumen BNPB dan BPBD per fase (berpasal)**

- **T2.7 Tanggap darurat.** Kebutuhan dasar meliputi kebutuhan air bersih dan sanitasi (UU 24/2007 Pasal 53 huruf a;
  `lembaga/mentah/teks/uu-24-2007.json.gz` hlm. 24) [`ri-2007-uu24`]; standar minimal air bersih 15 liter per orang per
  hari dan air minum 2,5 liter (Perka BNPB 7/2008 hlm. 10; kunci lama `perka_2008.air_bersih_liter_hari`,
  `perka_2008.air_minum_liter_hari`) [`bnpb-2008-kebutuhan-dasar`]. Status keadaan darurat terdiri atas siaga darurat,
  tanggap darurat, dan transisi darurat ke pemulihan; siaga darurat adalah keadaan ketika potensi ancaman sudah mengarah
  ke bencana, ditandai informasi peningkatan ancaman dari sistem peringatan dini (Perban 4/2020 hlm. 3); DSP digunakan
  selama masa keadaan darurat, keadaan tertentu, dan pertimbangan risiko berdampak luas yang ditetapkan Kepala BNPB
  (Pasal 20 ayat (1), hlm. 16) [`bnpb-2020-dsp`]. **resmi**.
- **T2.8 Pascabencana.** Rehabilitasi meliputi antara lain perbaikan prasarana dan sarana umum dan pemulihan fungsi
  pelayanan publik (UU 24/2007 Pasal 58 ayat (1) huruf b, j); rekonstruksi meliputi penerapan rancang bangun yang tepat dan
  tahan bencana (Pasal 59 ayat (1) huruf d). Sumber: `uu-24-2007.json.gz` hlm. 25–26. **resmi**.
- **T2.9 Prabencana dan kesiapsiagaan.** Renkon bagian dari RPKB dan dapat berubah menjadi rencana operasi saat darurat
  (Perban 2/2023 Pasal 2); ditetapkan pemerintah atau pemda sesuai kewenangan (Pasal 3); asumsi dampak diproyeksikan ke
  lima aspek termasuk layanan sipil (Pasal 7 ayat (5)); diuji lewat latihan kesiapsiagaan sampai geladi posko dan geladi
  lapang (Pasal 19); berlaku 3 tahun dan direviu paling sedikit 6 bulan sekali (Pasal 21) [`bnpb-2023-renkon`]; kunci baru
  `perban2023.renkon.*`. RPKB Daerah diuji coba lewat Gladi Ruang setelah ditetapkan (Perban 9/2025 Pasal 27)
  [`bnpb-2025-rpkb`]. RPBD bagian dari perencanaan pembangunan daerah (RPJMD, Renstra PD, RKPD, Renja), mengacu RIPB dan
  Renas, dengan perumusan masalah, tujuan, dan sasaran untuk lima tahun mendatang (Perban 3/2026 Pasal 2, 4, 24, 27;
  ditetapkan 6 Okt 2026) [`bnpb-2026-rpbd`]. SPM sub-urusan
  bencana kab/kota dijabarkan dalam Juklak 4/2026 (gladi kesiapsiagaan; ditetapkan 15 Sep 2026) sampai Juklak 7/2026
  (komunikasi, informasi, dan edukasi rawan bencana) [`bnpb-2026-juklak-gladi`, `bnpb-2026-juklak-kie`]. **resmi**.
- **T2.10 Komponen sistem peringatan dini.** Platform; konektivitas data; interoperabilitas data; rekomendasi aksi
  merespon peringatan dini; diseminasi; aksi merespon peringatan dini; pemanfaatan oleh pengguna (Perban 2/2024 Pasal 2
  ayat (3)). Sumber: `perban-nomor-2-tahun-2024.json` hlm. 4. **resmi**.
- **T2.11 Unit BNPB berlaku.** Deputi Bidang Pencegahan (Direktorat Mitigasi Bencana, Kesiapsiagaan, Peringatan Dini);
  Deputi Bidang Penanganan Darurat (Direktorat Koordinasi Pengendalian Operasi Darurat; Direktorat Penanganan Darurat
  Wilayah I untuk Jawa Tengah dan DIY, Wilayah II untuk DKJ, Banten, Jawa Barat, Wilayah III untuk Jawa Timur); Deputi
  Bidang Sistem dan Strategi; Deputi Bidang Logistik dan Peralatan; Pusdatinkom (Perban 6/2025 jo. 11/2025). Sumber:
  `program-terbukti/organisasi_bnpb.csv`; `program-terbukti/README.md` §5 [`bnpb-2025-otk`, `bnpb-2025-otk-ubah`].
  **resmi**.

**Program dan kategori bukti**

- **T2.12 Sebaran kompendium untuk kajian air** (12 baris, `kajian` = air-jawa atau keduanya): menurut kekuatan, kuat 1
  (P16), sedang 3 (P13, P18, P24), lemah 5 (P04, P11, P12, P14, P17), belum terbukti 3 (P01, P10, P15); menurut posisi,
  Program (bukti kuat) 1, Program dengan syarat (bukti sedang) 1 (P13), Program berjalan, wajib evaluasi dampak 7 (P01,
  P04, P10, P11, P12, P14, P15), Uji coba terukur 1 (P18), Rujukan tata kelola 2 (P17, P24). Program dalam negeri 8 baris:
  7 wajib evaluasi dampak dan 1 program dengan syarat (PAMSIMAS). Sumber: `program-terbukti/kompendium_program.csv` kolom
  `kajian`, `kekuatan`, `posisi`, dihitung 24 Okt 2026; sama dengan bab-02 T4.1. Label: olah(terverifikasi).
- **T2.13 Pemimpin dan peran BNPB per program air** (kolom `pemimpin`, `peran_bnpb`, `kode_peran_bnpb`): Destana P01
  (Kemendes PDT, BNPB, Kemensos; NSPK, K); SLI P04 (BMKG; koordinasi, P); embung P10 (Kementan, Kementerian PU;
  koordinasi, P); sumur resapan P11 (pemda; koordinasi, P); Citarum Harum P12 (pemda; data-KRB, P); PAMSIMAS P13
  (Kementerian PU; data-KRB, P); sodetan dan bendungan kering Ciliwung P14 (Kementerian PU; data-KRB, P); polder P15
  (Kementerian PU; data-KRB, P); P16 padanan (KLH/BPLH sebagai PJ Renas 2.4.4.a; data-KRB, P). Sumber: idem. **resmi**
  (pemetaan paket dari Renas) dan asumsi-kebijakan (kode peran paket).
- **T2.14 OMC.** BMKG menyelenggarakan fungsi kebijakan, pelaksanaan, dan koordinasi di bidang modifikasi cuaca
  (Perpres 12/2024 Pasal 4 huruf a–c), dengan Deputi Bidang Modifikasi Cuaca (Pasal 5 huruf g) yang antara lain
  melaksanakan pemantauan, evaluasi, dan pelaporan di bidang modifikasi cuaca (Pasal 24 huruf f). Sumber:
  `lembaga/mentah/teks/perpres-12-2024.json.gz` hlm. 2–3, 8–9; `lembaga/peran.csv` R096 [`ri-2024-perpres12-bmkg`]. Renas
  1.2.1.h, kolom KEGIATAN: "Pembinaan dan Pengawasan Tim Reaksi Cepat (TRC) Penanggulangan Bencana Multi Sektor di
  Tingkat Daerah". Kolom INDIKATOR: (1) "Jumlah Hari Operasi Penanggulangan Kedaruratan Bencana Karhutla, Banjir,
  Kekeringan, dan Longsor (Termasuk Modifikasi Cuaca)", satuan hari, target 2029 950 hari (gabungan keempat bahaya, bukan
  hari OMC); (2) "Jumlah pangkalan aju", satuan unit, target 2029 5 unit; baseline NA; lokasi daerah terdampak; PJ BMKG,
  Kementerian Kehutanan, BNPB. Sumber: `perban-nomor-1-tahun-2025.json` hlm. 57–58 [`bnpb-2025-renas`]; kunci baru
  `renas.aksi_121h.hari_operasi_2029`, `renas.aksi_121h.pangkalan_aju_2029`. **resmi**; kolom OCR bertumpuk di halaman
  itu, jadi target dibaca dari urutan teks. Tafsir: BNPB adalah salah satu PJ kegiatan TRC yang indikator hari
  operasinya mencakup modifikasi cuaca; Renas tidak menjadikan BNPB PJ OMC dan tidak memuat indikator OMC tersendiri.
- **T2.15 Prioritas air saat kekurangan** (rezim SDA, bukan BNPB): bila air tidak mencukupi, kebutuhan pokok sehari-hari
  diprioritaskan dan urutan prioritas per WS ditetapkan pemerintah pusat atau daerah (UU 17/2019 Pasal 8 sebagaimana
  diubah UU 6/2023 Pasal 53); penggunaan SDA dalam keadaan memaksa (Pasal 31). Sumber: bab-01 T2.5, T2.7 [`ri-2023-uu6`].
  **resmi**.

**Per BBWS dan daftar perhatian (8.4, 8.5)**

- **T2.16 WS dan BBWS.** 24 WS Jawa; 10 kewenangan pusat (A2 6, A3 4) dipegang 9 BBWS (BBWS Serayu-Opak memegang
  Serayu-Bogowonto dan Progo-Opak-Serang); Pemali-Comal kategori B tetapi memuat aset pusat (Cacaban, Penjalin). Sumber:
  `air-jawa/ws.csv` [`pupr-2015-permen04`]; kunci lama `airjawa.ws.jumlah`, `airjawa.ws.kewenangan_pusat`. **resmi**.
- **T2.17 Tautan kab ke WS/BBWS yang resmi hanya 18 baris:** 3 baris kategori C (Kepulauan Seribu; Jepara untuk
  Karimunjawa dan Wiso-Gelis) dan 15 baris tautan BBWS–DI kewenangan pusat lintas provinsi untuk 14 kab (Klaten tercatat
  di BBWS Bengawan Solo dan Serayu-Opak; per BBWS: Bengawan Solo 8, Citanduy 4, Serayu-Opak 2, Cimanuk-Cisanggarung 1).
  777 baris lain adalah kandidat menurut provinsi, bukan keanggotaan WS (777 + 18 = 795 baris). Dari 14
  kab bertautan BBWS–DI, 12 masuk paling sedikit satu daftar perhatian (tidak masuk: Kota Banjar, Sukoharjo). Sumber:
  `air-jawa/ws_kab.csv` kolom `jenis_tautan`, `label`; `turunan/daftar_perhatian.csv`, dihitung 24 Okt 2026; kunci baru
  `perhatian.air.bbws_di.*`. Label: resmi (tautan); olah(asumsi-kebijakan) (irisan dengan daftar perhatian).
- **T2.18 Daftar perhatian kajian air** (aturan paling sedikit dua syarat; asumsi-kebijakan): kekeringan 53, banjir 67,
  longsor 57 kab/kota; gabungan 98 dari 119 kab/kota masuk paling sedikit satu daftar; 27 masuk ketiganya, 25 masuk dua, 46
  masuk satu. Per provinsi (gabungan): Jawa Tengah 32, Jawa Timur 30, Jawa Barat 22, Banten 6, DKI Jakarta 4, DIY 4. Kab
  di ketiga daftar: Bandung, Bandung Barat, Banyumas, Batang, Bekasi, Bogor, Bojonegoro, Cianjur, Cilacap, Cirebon, Jember,
  Jepara, Jombang, Karawang, Kebumen, Madiun, Magelang, Nganjuk, Pekalongan, Pemalang, Ponorogo, Purwakarta, Purworejo,
  Serang, Subang, Sukabumi, Tasikmalaya (semua kabupaten). Uji kepekaan per bahaya: kekeringan 42–66, banjir 66–78,
  longsor 56–63. Sumber: `turunan/daftar_perhatian.csv`, `turunan/daftar_perhatian_kepekaan.csv`; kunci lama
  `perhatian.air.*.n`; kunci baru `perhatian.air.gabungan.n`, `perhatian.air.tiga_bahaya.n`. Label: asumsi-kebijakan.
  Catatan: syarat (d) daftar kekeringan adalah "daerah irigasi kewenangan pusat", jadi irisan dengan BBWS (T2.17) sebagian
  terbentuk oleh definisi.
- **T2.19 Instrumen daerah: kepatuhan nasional.** Per rapat 4 September 2025, Direktur MPBG Kemendagri menyebut 63 daerah
  belum menuntaskan SPM sub-urusan bencana, 87 belum mengaktifkan KRB, 79 belum menyusun IKD 2024. Sumber: Kemenko PMK,
  siaran 12 Sep 2025, https://kemenkopmk.go.id/node/5841 (riset E18) [`kemenkopmk-2025-sinkronisasi-irb`]; kunci baru
  `kemendagri.*`. **resmi** (pernyataan pejabat dalam siaran resmi). Nama daerah tidak disebut, jadi tidak dapat diiris
  ke Jawa.
- **T2.20 RPSDA sudah menyebut BPBD dan BNPB sebagai pelaksana kegiatan daya rusak air**, misalnya RPSDA Ciliwung-Cisadane
  2019 (kajian peringatan dini banjir, tindak darurat, posko); kata BPBD muncul 50 kali di RPSDA Brantas 2021, 44 di
  Serayu-Bogowonto 2017, 29 di Jratunseluna 2024. Sumber: riset E6 [`kemenpupr-2019-rpsda-ciliwung-cisadane`,
  `kemenpupr-2021-kepmen904`, `kemenpupr-2024-rpsda-jratunseluna`]. **resmi**.
- **T2.21 PSN bendungan.** Permenko Perekonomian 16/2025 Lampiran bagian G: 48 bendungan dan 9 proyek irigasi PSN; 19
  bendungan di Jawa (antara lain Kuningan, Ciawi, Sukamahi, Leuwikeris, Cipanas, Sadawarna, Karian, Pidekso, Bener,
  Jragung, Karangnongko, Bendo, Semantok) dan rehabilitasi DI Rentang dan DI Glapan. Sumber: riset E8
  [`kemenko-ekon-2025-permenko16`]; kunci baru `airjawa.psn.*`. **resmi**.

### Inferensi

- **I2.1 [Inferensi tim] Draf Tabel 8.2 matriks komponen × musim × fase (30 sel).** Kategori menurut prinsip 12; "aksi
  wajib" = aksi wajib menurut peraturan (berpasal). Pemimpin mengikuti T2.1–T2.6; peran BNPB memakai kosakata prinsip 14.

  | Sel | Aksi (dasar) | Kategori | Pemimpin; peran BNPB |
  | --- | --- | --- | --- |
  | Air baku dan air minum, kemarau, prabencana | Renkon kekeringan kab/kota dengan baris kebutuhan air bersih (Perban 2/2023 Pasal 3, 7, 21). PAMSIMAS (P13, bukti sedang) bukan dasar sel ini; evaluasi ketahanan sumbernya saat kemarau masuk agenda bukti 8.10 (I5.1) | Aksi wajib (renkon) | Pemda dan BPBD (renkon); NSPK (renkon). PAMSIMAS: Kementerian PU; data-KRB |
  | idem, kemarau, tanggap darurat | Air bersih 15 l dan air minum 2,5 l per orang per hari (UU 24/2007 Pasal 53 huruf a; Perka 7/2008); status siaga/tanggap darurat dan DSP bila status ditetapkan (Perban 4/2020 Pasal 20) | Aksi wajib | Kepala daerah dan BPBD; komando darurat, pendanaan |
  | idem, kemarau, pascabencana | Pemulihan sarana air bersih dan fungsi layanan publik (UU 24/2007 Pasal 58 ayat (1) huruf b, j) | Aksi wajib | Pemda; koordinasi |
  | idem, musim hujan, prabencana | Asumsi dampak layanan sipil (air bersih pengungsi) di renkon banjir dan longsor (Perban 2/2023 Pasal 7 ayat (5)) | Aksi wajib | BPBD; NSPK |
  | idem, musim hujan, tanggap darurat | Air bersih dan sanitasi pengungsi (Pasal 53) | Aksi wajib | BPBD; komando darurat |
  | idem, musim hujan, pascabencana | Rehabilitasi SPAM rusak (Pasal 58; PP 122/2015 penyelenggara) | Aksi wajib | Pemda, BUMD SPAM; koordinasi |
  | Irigasi, kemarau, prabencana | Penyesuaian tanam dengan prakiraan musim (SLI BMKG P04, lemah) | Program berjalan, wajib evaluasi dampak | BMKG, Kementan; koordinasi |
  | idem, kemarau, tanggap darurat | Urutan prioritas air saat tidak mencukupi (UU 17/2019 Pasal 8 jo. UU 6/2023; Pasal 31) | Aksi wajib (rezim SDA) | Pemerintah pusat/daerah rezim SDA; tidak memimpin |
  | idem, kemarau, pascabencana | Perlindungan gagal panen lewat asuransi pertanian (Renas 2.5.1.c); DSP tidak diperluas ke puso kekeringan (KERANGKA R04) | Program berjalan, wajib evaluasi dampak (asuransi pertanian tanpa baris kompendium; posisi usulan penyusun) | Kementan; koordinasi |
  | idem, musim hujan, prabencana | Data kondisi jaringan DI kewenangan daerah yang diusulkan DAK lewat e-PAKSI (lampiran juknis DAK irigasi; T1.13). DI kewenangan pusat: permintaan data ke Ditjen SDA, tanpa label aksi wajib | Aksi wajib terbatas DI daerah usulan DAK | Pemda (DI kewenangan daerah usulan DAK); data-KRB. DI pusat: Ditjen SDA (permintaan data) |
  | idem, musim hujan, tanggap darurat | Tindakan darurat dalam keadaan membahayakan (UU 17/2019 Pasal 35 ayat (6)) | Aksi wajib | Gubernur, bupati/wali kota; komando darurat bila status |
  | idem, musim hujan, pascabencana | DSP puso banjir (Juknis BNPB 1/2024 menurut KERANGKA R04) | Belum dapat dikategorikan (teks juknis tidak dibuka) | – |
  | Waduk dan bendungan, kemarau, prabencana | Pemantauan tampungan waduk sebagai pemicu; OMC (fungsi BMKG, Perpres 12/2024; di Renas modifikasi cuaca hanya disebut di indikator hari operasi kedaruratan 1.2.1.h) | Program berjalan, wajib evaluasi dampak (OMC: Sudah ada, bukti dampak belum terukur) | BMKG, BBWS, PJT; koordinasi |
  | idem, kemarau, tanggap darurat | Alokasi air waduk menurut prioritas (UU 17/2019 Pasal 8) | Aksi wajib (rezim SDA) | Kementerian PU, PJT; tidak memimpin |
  | idem, kemarau, pascabencana | Tidak berlaku: kemarau tidak merusak bendungan dalam catatan; sedimentasi adalah risiko kronis (Bab 4) | Tidak berlaku | – |
  | idem, musim hujan, prabencana | Wajib: BPBD hilir ikut serta dalam penyusunan RTD sebagai instansi teknis, RTD dikonsultasikan ke kepala daerah dan disosialisasikan ke pemda (PP 37/2010 Pasal 52 ayat (1) dan Penjelasan, 53, 57). Usulan penyusun (asumsi-kebijakan): RTD yang ditetapkan dipakai di renkon BPBD hilir (Perban 2/2023) | Aksi wajib (keikutsertaan BPBD); integrasi ke renkon = usulan penyusun | Pembangun dan Pemilik bendungan (Kementerian PU/BBWS, PJT); BPBD ikut serta; renkon dan koordinasi |
  | idem, musim hujan, tanggap darurat | Pengamanan bendungan oleh Pengelola (PP 37/2010 Pasal 56 ayat (2)); peringatan dan evakuasi hilir menurut RTD, penyelamatan masyarakat sesuai peraturan PB (Pasal 56 ayat (3)); sistem peringatan dini dan SOP evakuasi per WS yang ditetapkan pengelola SDA (PP 30/2024 Pasal 94 ayat (5), 96 ayat (1) huruf b, d; Perban 2/2024) | Aksi wajib | Pengelola bendungan (pengamanan); pengelola SDA, yaitu Kementerian PU/BBWS dan pemda sesuai kewenangan WS (SOP per WS); BPBD (penyelamatan masyarakat); komando darurat bila status |
  | idem, musim hujan, pascabencana | Rehabilitasi prasarana (UU 24/2007 Pasal 58) | Aksi wajib | Kementerian PU, pemda; koordinasi |
  | Air tanah, kemarau, prabencana | Data muka air tanah dan zona konservasi CAT belum ada (KERANGKA §7 butir 16) | Belum dapat dikategorikan (permintaan data) | Kementerian ESDM |
  | idem, kemarau, tanggap darurat | Sumber air tanah darurat tidak bersumber di bahan | Belum dapat dikategorikan | – |
  | idem, kemarau, pascabencana | Tidak berlaku: tidak ada kerusakan pascabencana khas air tanah | Tidak berlaku | – |
  | idem, musim hujan, prabencana | Sumur resapan dan biopori (P11, lemah) | Program berjalan, wajib evaluasi dampak | Pemda; koordinasi |
  | idem, musim hujan, tanggap darurat | Tidak berlaku: air tanah bukan tuas tanggap darurat banjir | Tidak berlaku | – |
  | idem, musim hujan, pascabencana | Tidak berlaku | Tidak berlaku | – |
  | Penurunan muka tanah dan pesisir utara, lintas musim (ditulis di sel kemarau, prabencana) | Pengendalian pengambilan air tanah dengan pasokan pengganti (P16, bukti kuat hanya di Tokyo dan Bangkok). Padanan di Indonesia, berjalan, belum dievaluasi: Pergub DKI 93/2021 zona bebas air tanah (sekunder; teks tidak dibuka) dan Kepmen ESDM 291.K/2023 jo. 443.K/2023 (judul dan siaran pers saja, teks tidak dibaca; bab-02 T2.8, C2.1, C2.5, C4.4) | Program berjalan, wajib evaluasi dampak (padanan P16; bukti kuat hanya di luar negeri) | KLH (Renas 2.4.4.a), Kementerian ESDM, PU, pemda; data-KRB, usul kontributor |
  | idem, kemarau, tanggap darurat | Tidak berlaku: amblesan bukan kejadian kemarau | Tidak berlaku | – |
  | idem, kemarau, pascabencana | Tidak berlaku | Tidak berlaku | – |
  | idem, musim hujan, prabencana | Renkon rob dan banjir pesisir (Perban 2/2023 Pasal 3); SOP evakuasi korban daya rusak air per WS sebagai pengaturan oleh pengelola SDA (PP 30/2024 Pasal 94 ayat (5), 96 ayat (1) huruf d) | Aksi wajib | SOP per WS: pengelola SDA (Kementerian PU/BBWS, pemda sesuai kewenangan WS). Renkon: pemda dan BPBD. BNPB: renkon dan koordinasi, bukan NSPK atas SOP itu |
  | idem, musim hujan, tanggap darurat | Operasi pompa dan polder (P15, belum terbukti); komando SKPDB kab/kota (Juklak 10/2023) | Program berjalan, wajib evaluasi dampak | Pemda, Kementerian PU; komando darurat |
  | idem, musim hujan, pascabencana | Rehabilitasi prasarana pesisir (UU 24/2007 Pasal 58) | Aksi wajib | Pemda, Kementerian PU; koordinasi |

  Hitungan draf (dihitung ulang 24 Okt 2026 sesudah koreksi pemeriksa): aksi wajib menurut peraturan 15 (dua di antaranya
  terbatas: e-PAKSI hanya DI daerah usulan DAK; RTD hanya keikutsertaan BPBD, integrasi ke renkon usulan penyusun);
  program berjalan, wajib evaluasi dampak 6; tidak berlaku beralasan 6; belum dapat dikategorikan 3; program dengan syarat
  0; program (bukti kuat) 0; uji coba terukur 0. Jumlah 30. Perubahan dari draf sebelumnya: sel PAMSIMAS pindah dari
  "program dengan syarat" ke "aksi wajib (renkon)" dan sel penurunan muka tanah pindah dari "program (bukti kuat)" ke
  "program berjalan, wajib evaluasi dampak". Ini hitungan draf tim (asumsi-kebijakan), bukan data; dihitung ulang setelah
  matriks naskah dikunci.
- **I2.2 [Inferensi tim]** Separuh sel bersandar pada aksi wajib menurut peraturan karena kompendium memuat sedikit
  program dalam negeri yang dievaluasi. Kalimat naskah yang tepat: "15 dari 30 sel diisi aksi yang diwajibkan peraturan,
  dua di antaranya hanya sebagian; tidak ada sel yang bertumpu pada program berbukti kuat atau sedang di Jawa: P16 hadir
  lewat padanan yang belum dievaluasi, dan PAMSIMAS (bukti sedang) masuk agenda bukti". Room for the River (P18) tidak
  dipetakan ke sel karena banjir sungai bukan salah satu dari lima komponen; ia tetap kandidat uji coba terukur di bab
  rekomendasi.
- **I2.3 [Inferensi tim] Tabel 8.3 per BBWS tiga lapis tanpa preskripsi teknis.** (a) Sinyal risiko kab yang tertaut resmi:
  hanya 14 kab lewat DI pusat lintas provinsi dan 2 kab kategori C (T2.17); kab lain disebut per provinsi dengan catatan
  "kandidat, bukan keanggotaan WS". (b) "Sudah ada": kegiatan RPSDA yang sudah menyebut BPBD/BNPB (T2.20) dan PSN bendungan
  per nama (T2.21). (c) Permintaan BNPB berpasal: keikutsertaan BPBD hilir dalam penyusunan RTD bendungan (PP 37/2010
  Pasal 52 ayat (1)), dengan pemakaian RTD di renkon sebagai usulan penyusun; serta penetapan sistem peringatan dini dan
  SOP evakuasi per WS oleh pengelola SDA (PP 30/2024 Pasal 94 ayat (5), 96 ayat (1) huruf b, d), dengan BNPB dan BPBD
  pada renkon dan koordinasi. Pemali-Comal tanpa Pola/RPSDA: baris (c) saja.
- **I2.4 [Inferensi tim] Tabel 8.4 daftar perhatian × instrumen daerah** tidak dapat diisi per kab dari data yang ada (T2.19
  tanpa nama daerah). Kolom instrumen (RPBD Perban 3/2026, RPKB Perban 9/2025, renkon Perban 2/2023, SPM Juklak 4–7/2026)
  diisi "permintaan data" untuk 98 kab, dengan 27 kab tiga bahaya sebagai urutan permintaan pertama, bukan peringkat.

### Celah

- Status RPBD, RPKB, renkon, dan SPM per kab/kota Jawa. **Permintaan:** Direktorat Kesiapsiagaan, Direktorat Sistem PB,
  dan Kemendagri (Ditjen Bina Pembangunan Daerah). **Penyajian:** kolom "permintaan data".
- Teks Juknis BNPB 1/2024 (DSP puso banjir) dan Juklak 10/2023 (SKPDB kab/kota; indeks JDIH mencatat ditetapkan 29 Des
  2023, berlaku, tanpa berkas teks) tidak dibuka. **Penyajian:** sel matriks "belum dapat dikategorikan"; Juklak 10/2023
  disebut dengan judul dan tanggal saja.
- Batas WS vektor dan keanggotaan kab per WS (KERANGKA §7 butir 21). **Permintaan:** Ditjen SDA (peta Lampiran V Permen
  04/2015 dalam bentuk vektor).
- Nomenklatur K/L kompendium belum dipetakan penuh ke `lembaga.csv` (KERANGKA §7 butir 36); naskah memakai `lembaga.csv`.
- Asuransi pertanian tidak punya baris kompendium dan evaluasi dampak; posisinya di matriks adalah usulan penyusun.

---

## P3. Apa yang harus selesai sebelum puncak musim hujan Desember 2026–Februari 2027?

### Inti

Untuk Jawa, BMKG memprakirakan awal musim hujan November 2026 (sebagian Jawa) dan Desember 2026 (sebagian besar Jawa)
dengan puncak Januari dan Februari 2027; jadi yang harus selesai paling lambat akhir November 2026, sebelum awal musim
di sebagian besar Jawa, adalah keputusan 14 hari pertama, penyampaian prakiraan ke BPBD, reviu renkon banjir dan longsor,
uji rantai peringatan dini, dan inventarisasi logistik per Direktorat Penanganan Darurat Wilayah. Tenggat itu hanya
terpenuhi bila hari ke-0 paling lambat pertengahan November. Catatan DIBI menempatkan 75,4% meninggal dan hilang akibat
banjir, longsor, banjir bandang, dan cuaca ekstrem di Jawa 2008–2025 pada November–April (Januari 16,8%; November dan
Desember 21,4%), dan perencanaan tidak boleh memakai skenario lebih ringan dari 270 meninggal dan hilang (musim
2008/2009). Angka 270 memuat 193 jiwa dari satu baris DIBI Kab. Tangerang 27 Maret 2009, tanggal jebolnya tanggul Situ
Gintung; tanpa kejadian itu angka terbesar 237 (2025/2026), disajikan berdampingan sebagai baris kepekaan. Kemarau 2026 masih berjalan (55 kab/kota
tercatat kekeringan sampai 23 Oktober, sementara), sehingga BPBD yang sama beralih dari distribusi air bersih ke siaga banjir
dalam beberapa minggu.

### Temuan bersumber

- **T3.1 Prakiraan musim 2026/2027 untuk Jawa.** Awal musim hujan November 2026 di sebagian Jawa, Desember 2026 di sebagian
  besar Jawa; puncak Januari 2027 di sebagian Jawa, Februari 2027 di sebagian besar Jawa; awal musim mundur di 529 ZOM
  (61,08% luas daratan); musim lebih pendek di 482 ZOM; HTH terpanjang 131 hari (Bantul). Sumber: BMKG, siaran pers 22 Sep
  2026 (bab-01 T1.2–T1.4; riset E9) [`bmkg-2026-musim-hujan`]; kunci lama `bmkg.musim_2026.*`. **resmi**.
  - *Dibantah oleh (sebagian):* KERANGKA menulis puncak "Desember 2026–Februari 2027"; untuk Jawa yang bersumber adalah
    Januari–Februari 2027 (bab-01 T1.3).
- **T3.2 Jarak awal ke puncak pendek.** Direktur Perubahan Iklim BMKG (2 Okt 2026): awal dan puncak musim hujan berdekatan;
  perlu antisipasi intensitas tinggi dalam periode pendek; El Niño bertahan sampai awal 2027. Sumber: InfoPublik 2 Okt 2026
  (bab-01 T1.5) [`infopublik-2026-awal-puncak`]. **resmi**, verifikasi **sekunder** (rilis BMKG 2 Okt tidak ditemukan di daftar
  siaran pers BMKG; riset E9).
- **T3.3 Kalender tercatat Jawa 2008–2025.** Meninggal + hilang akibat banjir, longsor, banjir dan longsor, banjir bandang,
  dan cuaca ekstrem: jumlah 3.277; per bulan Januari 550 (16,8%), Februari 465, Maret 482, April 273, Mei 187, Juni 216,
  Juli 70, Agustus 51, September 126, Oktober 156, November 331, Desember 370. November–April 2.471 (75,4%); Desember–
  Februari 1.385 (42,3%); November–Desember 701 (21,4%). Kejadian kekeringan Juni–September 789 dari 889 (88,8%). Sumber:
  `skenario-hidromet/kalender_bulanan_pulau.csv` (`pulau=Jawa`; per tanggal kejadian 2008–2025; `bangun/skenario-hidromet.py`
  fungsi `turunan_dibi`) [`bnpb-dibi`]; kunci baru `hidromet.jawa.kalender.*`. Label: olah(resmi); pola tercatat dipengaruhi
  intensitas pelaporan (catatan skrip paket).
- **T3.4 Lantai dan model** (T1.8): lantai 270 (2008/2009); 237 (2025/2026); pita model La Niña 254–547 estimasi-model, batas
  bawah di bawah lantai. Musim 2025/2026: 216 meninggal, 21 hilang, 1.460 kejadian. Sumber: `skenario-hidromet/musim_hujan.csv`.
  **resmi** dan **estimasi-model**. **Catatan wajib:** 270 memuat 193 jiwa (71,5%) dari satu baris DIBI Kab. Tangerang
  banjir 27 Maret 2009, tanggal jebolnya tanggul Situ Gintung (T1.8); tanpa kejadian itu musim 2008/2009 = 77 dan angka
  terbesar 18 musim = 237 (2025/2026), baris kepekaan yang batas bawah pita modelnya (254) berada di atasnya.
- **T3.5 Kemarau 2026 masih berjalan.** 55 kab/kota Jawa dengan kejadian kekeringan, 67 kejadian, 1.300.190 terdampak, 0
  meninggal sampai 23 Okt 2026 (sementara). Sumber: bab-01 T1.8; kunci lama `airjawa.kekeringan.kab_2026`,
  `airjawa.kekeringan.terdampak_2026`. **resmi**.
- **T3.6 Keputusan 14 hari pertama (kandidat KERANGKA §6):** (1) penetapan hari ke-0 dan penugasan unit Rencana Aksi; (2)
  penyampaian prakiraan awal musim per ZOM ke BPBD dengan permintaan pemutakhiran renkon banjir dan longsor (Perban
  2/2023) dan uji rantai peringatan dini (Perban 2/2024), oleh Direktorat Kesiapsiagaan dan Direktorat Peringatan Dini;
  (3) permintaan data operasional kemarau 2026 ke BPBD provinsi dan Pusdalops, oleh Pusdatinkom; (4) inventarisasi
  cadangan logistik dan peralatan per Direktorat PD Wilayah, oleh Deputi Bidang Logistik dan Peralatan; (5) surat ke
  Kemenko PMK untuk rakor peninjauan Renas, oleh Biro Perencanaan dan Deputi Bidang Sistem dan Strategi; (6) penugasan
  catatan metode IRBI 2025 (KD-4). Sumber: `KERANGKA.md` §6. Label: asumsi-kebijakan (usulan kajian), instrumen tiap butir
  **resmi** (T2.9, T2.10).
- **T3.7 Dasar reviu renkon dalam waktu singkat.** Renkon berlaku 3 tahun dan dapat direviu paling sedikit 6 bulan sekali;
  hasil reviu dapat dimutakhirkan dan pemutakhiran memperbarui masa berlaku (Perban 2/2023 Pasal 21); pemutakhiran antara
  lain lewat inventarisasi dan pemeliharaan kesiapan sumber daya secara berkala dan pertemuan kaji ulang (Pasal 18 ayat
  (3)). Sumber: `perban-nomor-2-tahun-2023.json` hlm. 7–8 [`bnpb-2023-renkon`]. **resmi**.
- **T3.8 Status siaga darurat sebagai tuas aksi dini.** Definisi siaga darurat terkait informasi peningkatan ancaman dari
  sistem peringatan dini (Perban 4/2020 hlm. 3); status ditetapkan Presiden, gubernur, atau bupati/wali kota sesuai skala
  (PP 21/2008 Pasal 23 ayat (2); riset E11d) [`bnpb-2020-dsp`, `ri-2008-pp21`]. **resmi**.
- **T3.9 Hari ke-100.** Hari ke-0 = tanggal penetapan Kepala BNPB; bila 1, 15, atau 30 November 2026, hari ke-100 jatuh 9
  Februari, 23 Februari, atau 10 Maret 2027. Sumber: bab-01 T1.14. **asumsi-kebijakan** (tanggal belum ditetapkan;
  aritmetika pasti).
- **T3.10 Kesiapan Musim Kemarau 2027: angka lantai tercatat.** Kab/kota Jawa dengan kejadian kekeringan terbanyak 76
  (2019); terdampak terbesar 4.924.057 (2018); luas bahaya tinggi kekeringan KRB 2.877.406 ha. Sumber: kunci lama
  `airjawa.kekeringan.kab_2019`, `hidromet.jawa.kekeringan.dibi_terdampak_2018`, `hidromet.jawa.kekeringan.luas_bahaya_tinggi`.
  **resmi**. Jumlah kab DIBI mengukur intensitas pelaporan, bukan keparahan (prinsip 7; 2015 hanya 3 kab).
- **T3.11 Pemicu kemarau 2027 yang tersedia.** Prakiraan musim kemarau BMKG (rilis 2026 terbit 10 Juni 2026,
  `bmkg-2026-musim-kemarau`; **resmi**); El Niño bertahan sampai awal 2027 (T3.2); asuransi pertanian Renas 2.5.1.c
  278.806 ke 1.250.000 ha (T1.4; **resmi**). Peringatan dini kekeringan meteorologis BMKG per dasarian dengan status
  Waspada, Siaga, Awas dan kriteria HTH ditemukan hanya di pemberitaan, misalnya 197 daerah berstatus Awas pada penilaian
  September 2026 (Katadata, https://katadata.co.id/ekonomi-hijau/investasi-hijau/6ab4bc44a2f77/197-daerah-berstatus-awas-kekeringan-bantul-hampir-lima-bulan-tanpa-hujan,
  diakses 24 Okt 2026) [`katadata-2026-pdkm`]. **sekunder**; halaman resmi PDKM BMKG tidak terbuka (404 pada
  bmkg.go.id/iklim/peringatan-dini-kekeringan).
- **T3.12 Prioritas distribusi air dan kebutuhan minimal** (T2.7, T2.15): 15 l air bersih per orang per hari; prioritas
  kebutuhan pokok sehari-hari saat air tidak mencukupi. **resmi**.

### Inferensi

- **I3.1 [Inferensi tim] Draf Gambar 8.2 kalender Rencana Aksi Musim Hujan 2026/2027 (per bulan × unit; hanya instrumen
  berlaku).**

  | Bulan | Pusat (Deputi Pencegahan, Deputi Penanganan Darurat, Logistik, Pusdatinkom) | Daerah (BPBD, BBWS, PJT) |
  | --- | --- | --- |
  | November 2026 (hari ke-0 sampai ke-30; awal musim sebagian Jawa; tenggat akhir November) | Keputusan 14 hari (T3.6); penyampaian prakiraan BMKG; permintaan reviu renkon (Perban 2/2023 Pasal 21); uji rantai peringatan dini selesai paling lambat akhir November (Perban 2/2024 Pasal 2 ayat (3) huruf e–g); inventarisasi logistik per Direktorat PD Wilayah I/II/III | Reviu renkon banjir dan longsor selesai paling lambat akhir November; gladi posko atau ruang (Perban 2/2023 Pasal 19; Perban 9/2025 Pasal 27; Juklak 4/2026); keikutsertaan BPBD hilir dalam konsultasi RTD bendungan; penutupan operasi kekeringan yang masih berjalan |
  | Desember 2026 (awal musim sebagian besar Jawa) | Kesiapan pengerahan Direktorat Koordinasi Pengendalian Operasi Darurat; pemantauan prakiraan dan peringatan dini harian | Penetapan siaga darurat bila ada informasi peningkatan ancaman; gladi susulan hanya bagi daerah yang belum sempat pada November |
  | Januari–Februari 2027 (puncak; hari ke-100 jatuh di sini bila hari ke-0 awal sampai pertengahan November) | Komando dan pendampingan status darurat (SKPDB); DSP bila status ditetapkan (Perban 4/2020 Pasal 20) | Tanggap darurat; air bersih pengungsi (Pasal 53); SOP evakuasi per WS dan RTD |
  | Maret–April 2027 | Kajian cepat musim berjalan untuk Kesiapan Kemarau 2027 | Transisi darurat dan rehabilitasi (Pasal 58); data kejadian ke Pusdatinkom |

- **I3.2 [Inferensi tim]** Skenario perencanaan musim hujan Jawa 2026/2027 memakai lantai 270 meninggal dan hilang, bukan pita
  model; pita model hanya pembanding di kartu, dengan catatan bahwa batas bawahnya di bawah lantai. Lantai itu wajib
  disertai catatan bahwa 193 dari 270 jiwa berasal dari satu baris DIBI 27 Maret 2009 (Kab. Tangerang; tanggal jebolnya
  tanggul Situ Gintung), dan baris kepekaan 237 (tanpa kejadian itu). Komposisi ini memperkuat butir RTD bendungan dan
  situ di 8.4 dan 8.8: musim tercatat terburuk di Jawa ditentukan oleh kegagalan prasarana tampungan, bukan oleh hujan
  ekstrem saja. Musim pasca El Niño kuat
  di Jawa tidak lebih mematikan dalam catatan DIBI (bab-01 T1.11), jadi naskah tidak menulis bahwa El Niño memperparah musim
  hujan berikutnya.
- **I3.3 [Inferensi tim]** Bulan dengan korban terbanyak (Januari–Maret, 45,7% dari 3.277) jatuh sesudah awal musim, tetapi
  November dan Desember sudah membawa 701 jiwa (21,4%) dan awal musim sebagian Jawa jatuh pada November (T3.1). Jadi
  jendela prabencana yang tersisa adalah sisa Oktober sampai November 2026, dengan tenggat akhir November untuk uji rantai
  peringatan dini dan reviu renkon (I3.1). Ini argumen waktu KD-1, bukan angka korban baru.
- **I3.4 [Inferensi tim] Kesiapan Kemarau 2027 (1,5 hlm)** memakai urutan pemicu: prakiraan musim kemarau BMKG, status
  tampungan waduk (PJT, BBWS), cadangan air baku, prioritas distribusi (UU 17/2019 Pasal 8), kalender tanam, dan asuransi
  pertanian. Skenario perencanaan tidak boleh lebih ringan dari 76 kab/kota dan 4.924.057 terdampak; PDKM dirujuk sebagai
  produk BMKG tanpa kriteria angka sampai halaman resmi dibuka.

### Celah

- Prakiraan awal dan puncak musim per ZOM yang ditumpangkan ke kab/kota (KERANGKA §7 butir 35; riset E9 tidak menemukan tabel
  per ZOM). **Permintaan:** BMKG (Deputi Bidang Klimatologi). **Penyajian:** tingkat "sebagian Jawa / sebagian besar Jawa".
- Rilis primer BMKG 2 Oktober 2026 (T3.2 tetap sekunder).
- Status renkon banjir dan longsor per kab/kota Jawa (tanggal penetapan, reviu terakhir). **Permintaan:** BPBD provinsi lewat
  Direktorat Kesiapsiagaan.
- Status tampungan waduk harian/bulanan (PJT I, PJT II, BBWS) dan Katam musim 2026/2027 (KERANGKA §7 butir 34; situs katam.info
  tidak terjangkau 24 Okt 2026). **Permintaan:** Kementerian PU dan Kementan.
- Kriteria resmi PDKM BMKG (HTH dan ambang curah hujan per dasarian). **Penyajian:** tidak dikutip angka kriterianya.
- Data operasional kemarau 2026 (status darurat SK, distribusi air, desa terdampak; KERANGKA §7 butir 24). **Permintaan:**
  keputusan 14 hari butir (3).

---

## P4. Apa posisi BNPB terhadap Tanggul Laut Pantura?

### Inti

BNPB tidak duduk di Dewan Pengarah BOP Pantura Jawa (Perpres 77/2025), tetapi Menko PMK yang mengoordinasikan BNPB adalah
Wakil Ketua Dewan Pengarah dan Kepala BNPB sudah anggota Dewan SDA Nasional (Perpres 53/2022, Keppres 18/2024); jadi posisi
risiko BNPB dapat disampaikan tanpa mengubah Perpres. Posisi yang bersumber: tanggul memerlukan prasyarat pengendalian
pengambilan air tanah dengan pasokan pengganti (satu-satunya program berbukti kuat, P16, dari Tokyo dan Bangkok), SOP
evakuasi dan sistem peringatan dini per WS untuk kegagalan tanggul dan polder dihubungkan ke renkon BPBD pesisir, dan
evaluasi independen; polder dan pompa belum terbukti (P15), dan pelajaran Empat Sungai Korea hanya bersumber sekunder.

### Temuan bersumber

- **T4.1 BOP Pantura Jawa.** Lembaga nonstruktural di bawah Presiden untuk persiapan, perencanaan, pembangunan, dan
  pengembangan Pantura Jawa; konsiderans menyebut penurunan muka tanah, defisit neraca air, kenaikan muka laut, banjir laut,
  dan Giant Sea Wall sebagai PSN RPJMN; Dewan Pengarah diketuai Menko IPK, Wakil Ketua Menko Perekonomian, Menko PMK, Menko
  Pemberdayaan Masyarakat, Menko Pangan; 30 kepala daerah anggota; Kementerian ESDM dan BNPB tidak tercantum. Sumber:
  bab-01 T2.13; bab-02 T2.13 [`ri-2025-perpres77`]; kunci lama `perpres77.dewan_pengarah.kepala_daerah`. **resmi**.
- **T4.2 RPJMN.** Lampiran I hlm. 73: PSN Swasembada Air memuat Giant Sea Wall Pantai Utara Jawa (baru); hlm. 111: percepatan
  persiapan giant sea wall; hlm. 29: penurunan tanah di Jakarta dan Semarang 1–15 cm per tahun; hlm. 216: isu Wilayah Jawa
  memuat rob dan penurunan muka tanah di pesisir utara. Sumber: riset E8, E11b [`ri-2025-perpres12-rpjmn`]. **resmi**.
- **T4.3 Forum yang sudah memuat BNPB.** Perpres 53/2022 Pasal 7 ayat (1) huruf d angka 14 menetapkan "kepala badan yang
  melaksanakan tugas pemerintahan di bidang penanggulangan bencana" sebagai anggota Dewan SDA Nasional; Keppres 18/2024
  keanggotaan memuat Kepala BNPB; TKPSDA WS lintas negara, lintas provinsi, dan strategis nasional ditetapkan Menteri (Permen
  PU 2/2024 Pasal 4, 5), tanpa menyebut BNPB atau BPBD. Sumber: riset E13 [`ri-2022-perpres53`, `ri-2024-keppres18`,
  `kemenpu-2024-permen2`]. **resmi**. Pemetaan jabatan ketua Dewan SDA (menko bidang kemaritiman dan investasi) ke kabinet
  2024–2029 belum dapat dipastikan (riset E13).
- **T4.4 BNPB dikoordinasikan Kemenko PMK** (Perpres 1/2019 Pasal 6); RIPB dilaporkan ke Presiden melalui menko PMK (Perpres
  87/2020 Pasal 6 ayat (3)). Sumber: bab-01 T2.10; riset E11a [`ri-2019-perpres1`, `ri-2020-perpres87`]. **resmi**.
- **T4.5 NSPK subsiden.** Renas 2.4.4.a: target 5 dokumen; PJ KLH; kontributor Kementerian Hukum, Kemenko PMK, Kemenko
  Infrastruktur; BNPB tidak tercantum. Sumber: T1.4; kunci lama `renas.aksi_244a.target_2029`. **resmi**.
- **T4.6 Bukti P16 (bukti kuat, luar negeri).** Tokyo: pengambilan air tanah 23 wilayah ku 1.160.000 m³/hari (1964) ke 128.000
  m³/hari (1975), larangan sumur bertahap 1971–1974, air pengganti dari Sungai Tone, laju maksimum 27 cm/tahun lalu turun
  tiap tahun sejak 1972; Bangkok: hingga 120 mm/tahun (1981) ke sekitar 20 mm/tahun sesudah pembatasan pompa sejak akhir
  1980-an. Syarat: pasokan pengganti sebelum larangan, zona kritis berbasis pengukuran, tarif, penegakan izin, hasil lebih
  dari satu dekade. Sumber: `kompendium_program.csv` P16; bab-02 T4.2–T4.4 [`yamamoto-1984-tokyo`, `tanaka-2013-bangkok`];
  kunci lama `bukti.p16.*`. **terverifikasi** (bukti Tokyo dan Bangkok).
  - *Padanan di Indonesia (label terpisah):* kolom padanan kompendium P16 menulis "zona bebas air tanah DKI dan
    pengendalian izin air tanah, dengan NSPK mitigasi penurunan muka tanah Renas 2.4.4.a", status "dikembangkan", tanpa
    menyebut Kepmen ESDM 291.K/2023. Pergub DKI 93/2021 Zona Bebas Air Tanah: **sekunder** (riset B §6.3; teks tidak
    dibuka; bab-02 T2.8 (d), C2.5). Kepmen ESDM 291.K/GL.01/MEM.G/2023 jo. 443.K/GL.01/MEM.G/2023: judul dan siaran pers
    saja, teks tidak dibaca (**resmi** untuk isi siaran pers; bab-02 T2.8 (c), C2.1) [`esdm-2023-air-tanah`]. Evaluasi
    dampak kedua padanan tidak ditemukan (bab-02 C4.4).
  - *Dibantah oleh / berdampingan:* puncak Tokyo sekitar 24 cm/tahun (sekunder) lawan 27 cm/tahun (UNESCO); Bangkok sekitar
    1 atau 2–3 cm/tahun (sekunder) lawan 20 mm/tahun (AIST) (bab-02 T4.3).
- **T4.7 Kondisi Jawa yang menentukan prasyarat.** Jakarta, Pekalongan, Semarang, dan Demak turun paling sedikit sekitar 9
  kali laju kenaikan muka laut global (Susilo dkk. 2023, CC BY) [`susilo-2023-gnss`] (**terverifikasi**); GNSS CPKL Pekalongan
  10,7 cm/th (bab-04); RPSDA Jratunseluna 2024 mengutip Badan Geologi 2018: Semarang 2–10 cm/th, Demak lebih dari 10 cm/th
  (**resmi**, kutipan dalam dokumen PU); rumah tangga bersumber air minum leding 2023: Jawa Tengah 12,97%, DKI 7,64%, Jawa
  Barat 4,66%, Banten 2,18% (bab-04 P1; **resmi**; leding bukan cakupan perpipaan PU).
- **T4.8 Luas rawan rob resmi berupa simulasi.** RPSDA Jratunseluna 2024: genangan rob 22.897 ha (hlm. 27–28); Tabel 5.86
  luas rawan rob per kecamatan dari simulasi pasang 1,8 m ("Hasil Analisis, 2023"). Sumber: riset E6
  [`kemenpupr-2024-rpsda-jratunseluna`]; kunci baru `airjawa.rpsda.jratunseluna.rob_ha`. **estimasi-model** (dokumen resmi
  Kementerian PU). *Disandingkan dengan tercatat:* luas genangan rob teramati tidak ada; DIBI mencatat kejadian rob (kalender
  Jawa 2008–2025: 0 meninggal dan hilang akibat rob; T3.3 sumber sama). KERANGKA §7 butir 23.
- **T4.9 Polder dan pompa: belum terbukti (P15).** Tidak ditemukan evaluasi kinerja kuantitatif; kajian Polder Jati Pinggir
  menemukan kapasitas saluran dan pompa kurang; syarat: penurunan tanah dihentikan, pompa dan listrik cadangan dipelihara.
  Sumber: `kompendium_program.csv` P15. **terverifikasi**.
- **T4.10 Pengait tertulis untuk kegagalan tanggul dan polder** adalah SOP sarana prasarana dan SOP evakuasi korban per WS,
  serta pelatihan tanggap darurat dan upaya pemindahan penduduk (PP 30/2024 Pasal 96; T1.12). RTD PP 37/2010 hanya untuk
  bendungan. **resmi**.
- **T4.11 Pelajaran Pekalongan (sekunder) dan pembanding model.** Pejabat Bappenas (13 Nov 2024): tanggul 2019 sudah tenggelam
  pada 2022; penurunan sekitar 12–30 cm/tahun (Investor Trust) [`investortrust-2024-pekalongan`]. **sekunder**. *Berlawanan
  arah:* Novita dkk. (2021) menghitung genangan rob Kabupaten Pekalongan November 2020 783,99 ha menjadi 1,68 ha dengan tanggul
  [`novita-2021-pekalongan`]. **estimasi-model**. Laporan Bappenas 2019 tidak ditemukan (riset E19).
- **T4.12 Empat Sungai Korea (sekunder).** Menurut pemberitaan atas laporan Badan Pemeriksa (감사원) 4 Juli 2018: biaya 50
  tahun sekitar 31 triliun won, manfaat sekitar 6,6 triliun won, rasio manfaat-biaya 0,21, manfaat pencegahan banjir 0 won
  **karena hampir tidak ada banjir selama periode analisis** (keterbatasan yang ditulis media itu sendiri); dari air yang
  diamankan bendung hanya 8,6% dapat dimanfaatkan. Sumber: Seoul Shinmun, 4 Jul 2018,
  https://m.seoul.co.kr/news/2018/07/04/20180704800068 (diakses 24 Okt 2026) [`seoulshinmun-2018-empat-sungai`]; The Asia
  Business Daily 11 Agu 2020 (bab-02 T4.9) [`asiae-2020-empat-sungai`]. **sekunder** (laporan BAI asli tidak dibuka).
  *Argumen tandingan tercatat:* komite evaluasi 2014 mencatat capaian pencegahan banjir; Kementerian Lingkungan Korea (2020)
  menyatakan kesimpulan bendung menaikkan muka banjir bertumpu pada model virtual (pemberitaan; sekunder).

### Inferensi

- **I4.1 [Inferensi tim] Isi Kotak 8.1 (tanpa biaya, P5).** (1) Prasyarat: pengendalian pengambilan air tanah dengan pasokan
  pengganti di kota pesisir utara, mengikuti urutan P16; pemimpin KLH (NSPK Renas 2.4.4.a), Kementerian ESDM, Kementerian PU,
  dan pemda; BNPB mengusulkan diri menjadi kontributor 2.4.4.a pada peninjauan Renas. (2) Kegagalan tanggul dan polder masuk
  renkon BPBD pesisir lewat SOP evakuasi dan sistem peringatan dini per WS yang ditetapkan pengelola SDA (PP 30/2024 Pasal
  94 ayat (5), 96), bukan istilah RTD; pemakaiannya di renkon adalah usulan penyusun, dengan BNPB dan BPBD pada renkon dan
  koordinasi. (3) Telaah
  risiko bencana masuk tata kelola BOP Pantura Jawa lewat Kemenko PMK (Wakil Ketua Dewan Pengarah) dan lewat keanggotaan
  Kepala BNPB di Dewan SDA Nasional. (4) Evaluasi independen sebagai syarat tata kelola. Ini isi KD-5 pilihan (a).
- **I4.2 [Inferensi tim] Argumen tandingan (L63).** Pendukung tanggul dapat menunjuk hitungan Novita dkk. (genangan turun
  tajam dengan tanggul) dan kebutuhan perlindungan segera. Posisi kajian: tanggul dapat mengurangi genangan jangka pendek,
  tetapi tanpa penghentian amblesan fungsinya menurun (P15 syarat; pernyataan Pekalongan sekunder). Kalimat "tanggul
  tenggelam" tidak boleh masuk naskah final dengan sumber berita.
- **I4.3 [Inferensi tim] Status Korea di naskah final.** Angka BAI hanya lewat media; manfaat banjir 0 won lahir dari periode
  tanpa banjir, jadi angka itu tidak boleh ditulis sebagai bukti "tanggul atau bendung tidak berguna". Sesuai bab-02 C4.1 dan
  KERANGKA §8, Korea keluar dari badan teks final bila laporan BAI tetap tidak dibuka; di draf ia hanya alasan evaluasi
  independen, bukan bukti kegagalan.
- **I4.4 [Inferensi tim]** Luas rawan rob 22.897 ha adalah satu-satunya angka luas rob resmi untuk satu WS, tetapi keluaran
  simulasi. Ia boleh tampil di Kotak 8.1 berpil Estimasi model dengan baris "luas genangan teramati: tidak tersedia".

### Celah

- Laporan BAI 2018 asli (Empat Sungai) dan laporan Bappenas tentang tanggul Pekalongan 2019 (riset E19).
- Rancangan kelembagaan BOP Pantura Jawa sesudah Perpres 77/2025 (rencana induk, studi kelayakan, AMDAL) tidak dibuka; panjang
  dan progres tanggul hanya sekunder (bab-02 T3.4) dan tidak dikutip.
- Keanggotaan TKPSDA WS di Jawa yang berlaku saat ini dan apakah BPBD duduk di dalamnya. **Permintaan:** Ditjen SDA.
- Penerbit persetujuan penggunaan air tanah per Oktober 2026 (bab-02 C2.1).
- Pengukuran luas genangan rob teramati per kab/kota pesisir utara. **Permintaan:** BIG dan BBWS.

---

## P5. Bagaimana program berjalan tanpa evaluasi dampak dibuktikan sampai 2030?

### Inti

Tujuh dari delapan program dalam negeri kajian air berstatus "Program berjalan, wajib evaluasi dampak", termasuk Destana
(belum terbukti) dan OMC (Sudah ada, sortie tercatat di platform 0, bukti dampak belum terukur). Peraturan baru menyediakan
bahan, belum garis dasar evaluasi dampak: Perban 7/2025 menyediakan Penilaian Ketangguhan yang "dapat dilakukan" dan
"dilakukan secara mandiri oleh Desa dan Kelurahan" hanya untuk desa yang menjalankan tahap pelaksanaan Program Destana
(Pasal 14 ayat (1), (4)), evaluasi dampak jangka panjang sebagai salah satu pilihan kegiatan pendampingan ("dan/atau",
Pasal 11), dan evaluasi tahunan yang hasilnya berupa laporan penyelenggaraan (Pasal 19); BMKG punya fungsi pemantauan dan
evaluasi modifikasi cuaca (Perpres 12/2024 Pasal 24). Pembanding desa belum Destana dan penilai independen belum ada
instrumennya. Agenda bukti 2026–2030 karena itu menyusun per program garis dasar, pembanding, ukuran hasil, unit, dan
tahun hasil, dengan PAMSIMAS (bukti sedang) sebagai contoh evaluasi independen yang menemukan data administrasi terlalu
optimistis.

### Temuan bersumber

- **T5.1 Destana (P01; belum terbukti; Program berjalan, wajib evaluasi dampak).** Data resmi hanya cakupan: 2.234 desa
  dibina (baseline Renas) dengan target 7.234, dibanding 53.000 desa di daerah rawan; IKK daerah yang memiliki Destana 2,58% ke
  3,26%. Celah kompendium: tidak ada evaluasi dampak; Penilaian Ketangguhan belum dipakai sebagai garis dasar; dana desa belum
  optimal untuk ketangguhan. Sumber: `kompendium_program.csv` P01. **resmi**.
- **T5.2 Perban 7/2025 (ditetapkan 24 Okt 2025).** Kutipan utuh pasal yang menentukan:
  - Pasal 11: "Pendampingan sebagaimana dimaksud dalam Pasal 6 ayat (2) huruf c dilaksanakan melalui: a. pemantauan
    keberlanjutan program; b. peningkatan kapasitas lanjutan; c. bantuan teknis dan konsultasi; d. penyebaran hasil dan
    pembelajaran; e. evaluasi dampak jangka panjang; dan/atau f. peningkatan kolaborasi antar pihak." Evaluasi dampak
    jangka panjang adalah satu pilihan kegiatan pendampingan, bukan kewajiban.
  - Pasal 14 ayat (1): "Untuk mengukur tingkat ketangguhan Desa dan Kelurahan yang dilaksanakan sesuai tahapan
    penyelenggaraan Program Destana sebagaimana dimaksud dalam Pasal 6 ayat (2) huruf b, dapat dilakukan Penilaian
    Ketangguhan Desa dan Kelurahan." Pasal 6 ayat (2) huruf b adalah tahap pelaksanaan; Penilaian Ketangguhan juga
    tercantum sebagai aktivitas tahap pelaksanaan (Pasal 8 ayat (1) huruf e).
  - Pasal 14 ayat (4): "Penilaian sebagaimana dimaksud pada ayat (1) dilakukan secara mandiri oleh Desa dan Kelurahan."
  - Pasal 14 ayat (2), (5), (6): penilaian menjadi acuan penetapan tingkat ketangguhan; dilakukan paling sedikit setiap 3
    tahun; tingkat tangguh utama, madya, pratama. Rekomendasi penilaian ditindaklanjuti desa (ayat (7)) dan dipakai untuk
    perencanaan pembangunan (Pasal 15).
  - Pasal 19: evaluasi "dapat dilakukan berdasarkan hasil Penilaian Ketangguhan Desa dan Kelurahan dan/atau hasil
    pemantauan" (ayat (1)), minimal 1 kali setahun (ayat (2)); "Hasil evaluasi ... berupa laporan penyelenggaraan Program
    Destana" (ayat (3)), disampaikan pejabat pimpinan tinggi madya bidang pencegahan kepada Kepala BNPB (ayat (4)). Ini
    laporan penyelenggaraan, bukan evaluasi dampak.
  - Lainnya: pemantauan dan evaluasi capaian memakai sistem informasi yang memuat antara lain hasil Penilaian Ketangguhan
    (Pasal 20 ayat (1), (3) huruf c); Destana dilaksanakan sesuai SNI yang menjadi indikator Destana (Pasal 13 ayat
    (2)–(3)); mencabut Perka BNPB 1/2012 (Pasal 22).
  Sumber: `data/raw/hukum/teks/perban-nomor-7-tahun-2025.json` hlm. 5–8 (dibaca ulang 24 Okt 2026) [`bnpb-2025-destana`];
  kunci baru `perban2025_7.destana.penilaian_tahun`. **resmi**. **Tafsir yang dapat ditulis:** Perban 7/2025 menyediakan
  swa-penilaian opsional untuk desa Destana, bukan garis dasar evaluasi dampak. Instrumen ini tidak berlaku bagi desa
  belum Destana dan tidak memuat penilai independen.
- **T5.3 SPAB dan relawan (8.7).** SPAB (P02, belum terbukti) dipimpin Kemendikdasmen dan Kemenag; BNPB kontributor Renas
  2.1.2.a; target 38.946.645 peserta didik dibina. Perban 7/2025 Pasal 1 angka 6 mendefinisikan Tim Relawan PB tingkat desa
  dan kelurahan. Sumber: `kompendium_program.csv` P02; `perban-nomor-7-tahun-2025.json` hlm. 2. **resmi**. SPAB tidak khas
  air; disebut satu kalimat (prinsip 17).
- **T5.4 PAMSIMAS (P13; sedang; Program dengan syarat).** Laporan penyelesaian Bank Dunia 2023 (ringkasan RWSN): layanan air
  berkelanjutan untuk sekitar 24,8 juta jiwa di lebih dari 35.553 desa, sekitar 91% sistem berfungsi baik; evaluasi independen
  untuk DFAT (Jan 2023): banyak sistem yang tercatat berfungsi penuh kekurangan air pada pemakaian puncak atau kemarau; EIRR
  36,1% dikoreksi menjadi 30,8% dengan sampel 42 desa. Syarat: pengelola desa berfungsi, iuran cukup, sumber air tahan kemarau,
  pemantauan fungsi independen. Celah: tidak terkait renkon kekeringan BPBD; kelanjutan fase sesudah fase III tidak
  diverifikasi. Sumber: `kompendium_program.csv` P13; bab-02 T4.6 [`rwsn-2023-pamsimas`, `dfat-2023-pamsimas`]; kunci lama
  `bukti.p13.*`. **terverifikasi**; EIRR **estimasi-model**, disandingkan dengan temuan lapangan.
- **T5.5 OMC: protokol evaluasi platform dan catatan sortie.** `scripts/omc/nilai.py` menilai sortie dengan selisih-dalam-
  selisih terhadap stasiun kontrol, dibandingkan pita diurnal hari tanpa OMC, dan dikalibrasi uji plasebo pada tanggal semu
  (lolos bila n efektif paling sedikit 30 dan batas atas Clopper-Pearson satu sisi 95% laju "sejalan" palsu paling tinggi
  10%); keluarannya hanya kesesuaian, bukan sebab-akibat. `public/udara/data/omc_hasil.json` (diperbarui 23 Okt 2026):
  `sortie` 0, `episode` kosong; keterbatasan antara lain arsip PM2,5 baru sekitar 5 hari, hujan dinilai dari METAR bandara
  dalam 150 km, jendela efek adalah hipotesis operasional. Label: keluaran platform Pantau Bencana, bukan Data Bencana Perban
  1/2023 (prinsip 19); **asumsi-kebijakan** (metode) dan fakta pencatatan (0 sortie). Protokol itu dirancang untuk asap dan
  jarak pandang karhutla, bukan untuk pengisian waduk.
- **T5.6 OMC dalam rezim resmi:** fungsi BMKG dan Deputi Bidang Modifikasi Cuaca dengan fungsi pemantauan, evaluasi, dan
  pelaporan (Perpres 12/2024 Pasal 24 huruf f). Di Renas, modifikasi cuaca hanya muncul di indikator kegiatan 1.2.1.h
  "Pembinaan dan Pengawasan Tim Reaksi Cepat (TRC) Penanggulangan Bencana Multi Sektor di Tingkat Daerah": hari operasi
  kedaruratan karhutla, banjir, kekeringan, longsor, termasuk modifikasi cuaca, 950 hari (gabungan); indikator kedua
  pangkalan aju 5 unit; PJ BMKG, Kementerian Kehutanan, BNPB (T2.14). **resmi**. BNPB salah satu PJ kegiatan TRC itu, bukan
  PJ OMC.
- **T5.7 Program air lain yang wajib evaluasi** (kolom `celah` kompendium): SLI P04 tanpa lahan pembanding dan tidak terkait
  renkon kekeringan; embung P10 tanpa inventaris volume dan fungsi; sumur resapan P11 tanpa peta kelayakan hidrogeologi dan
  pengukuran kinerja; Citarum Harum P12 deret IKA tidak konsisten antarsumber; sodetan dan bendungan kering P14 tanpa evaluasi
  pascaoperasi luas dan lama genangan (Ciawi menurunkan debit puncak 20,87% saat banjir Maret 2025 menurut data BBWS yang
  dikutip media); polder P15 tanpa evaluasi kinerja. Sumber: `kompendium_program.csv` P04, P10–P15. **terverifikasi**
  (kompendium); angka P14 dari media mengutip BBWS.
- **T5.8 Bentuk pelaporan kemajuan berangka (P17; lemah; Rujukan tata kelola).** Delta Programme melaporkan kemajuan tahunan
  per agenda (keamanan banjir 82% menuju 2050; air tawar dan adaptasi ruang sekitar 10%); indikator pelaksanaan, bukan dampak.
  Padanan di Indonesia: Dewan SDA Nasional dan wadah koordinasi WS, status padanan di kompendium "belum dipastikan" (sebelum
  riset E13). Sumber: `kompendium_program.csv` P17 [`deltaprogramma-2026`]; kunci lama `bukti.p17.*`. **resmi** (Pemerintah
  Belanda). *Pembaruan:* keberadaan Dewan SDA Nasional dan dasar TKPSDA WS kini terkonfirmasi (T4.3).
- **T5.9 Syarat manfaat-biaya tidak ada di Dana Bersama prabencana.** Perban BNPB 1/2026 Pasal 14 ayat (4) dan Pasal 16 ayat
  (3), serta Juklak 1/2025, 3/2025, 4/2025, 6/2025, 2/2026 tidak memuatnya (dicek mesin paket). Penyaluran prabencana dan
  pascabencana atas permohonan tertulis pemda atau K/L kepada BNPB (Perpres 75/2021 Pasal 8 ayat (1); riset E11c). Sumber:
  `program-terbukti/README.md` §4 butir 6 [`bnpb-2026-dana-bersama`, `ri-2021-perpres75`]. **resmi**.

### Inferensi

- **I5.1 [Inferensi tim] Draf Tabel 8.6 agenda bukti 2026–2030** (unit BNPB berlaku; pemimpin program bukan BNPB disebut di
  kolom pemimpin; semua kolom metode adalah usulan penyusun):

  | Program | Garis dasar | Pembanding | Ukuran hasil | Pemimpin; unit BNPB | Tahun hasil |
  | --- | --- | --- | --- | --- | --- |
  | Destana di desa rawan kekeringan dan longsor Jawa (P01) | Desa Destana: hasil swa-penilaian Penilaian Ketangguhan Perban 7/2025 (opsional, mandiri; Pasal 14 ayat (1), (4)) sebagai bahan, diverifikasi penilai independen. Desa belum Destana: **instrumen harus dibentuk** (Penilaian Ketangguhan tidak berlaku bagi mereka), 2027 | Desa rawan sejenis yang belum dibina, dinilai dengan instrumen yang sama oleh penilai independen (**instrumen harus dibentuk**) | Perubahan tingkat ketangguhan pada penilaian berikut (paling lambat 3 tahun); meninggal, hilang, dan menderita DIBI per desa bila data desa tersedia | Kemendes PDT, BNPB, Kemensos; Direktorat Kesiapsiagaan | 2030 |
  | PAMSIMAS di desa rawan kekeringan (P13) | Fungsi sistem saat kemarau 2026 (data PU) | Desa non-PAMSIMAS di kab yang sama | Desa yang meminta distribusi air darurat saat kemarau 2027 | Kementerian PU; Direktorat Mitigasi Bencana (data-KRB) | 2027–2028 |
  | OMC untuk tampungan waduk | Catatan sortie terbuka (lokasi, waktu, bahan) mulai musim berikut | Hari dan DAS tanpa sortie; stasiun kontrol | Curah hujan dan aliran masuk waduk sasaran, dengan protokol selisih-dalam-selisih dan uji plasebo yang disesuaikan | BMKG (Deputi Bidang Modifikasi Cuaca); BNPB salah satu PJ kegiatan TRC Renas 1.2.1.h yang indikator hari operasinya mencakup modifikasi cuaca (peran data dan koordinasi, bukan pemimpin evaluasi) | Mulai 2027, evaluasi 2029 |
  | SLI dan kalender tanam (P04) | Produksi peserta dan non-peserta pada musim yang sama | Lahan pembanding varietas sama | Produksi per ha dan puso | BMKG, Kementan; Direktorat Mitigasi Bencana | 2028 |
  | Sumur resapan (P11) | Peta kelayakan hidrogeologi | Kawasan tanpa sumur resapan | Genangan terukur | Pemda; tidak ada unit pelaksana BNPB | 2029 |
  | Polder dan pompa (P15) | Inventaris kapasitas dan keandalan pompa | Musim sebelum perbaikan | Luas dan lama genangan | Kementerian PU, pemda; Direktorat Mitigasi Bencana (data-KRB) | 2029 |
  | Sodetan dan bendungan kering Ciliwung (P14) | Data debit dan genangan BBWS 2025 | Kejadian sebelum operasi | Luas dan lama genangan di kelurahan sasaran | Kementerian PU; data-KRB | 2028 |
  | RTD bendungan dengan keikutsertaan BPBD hilir (wajib, PP 37/2010 Pasal 52) dan pemakaiannya di renkon (usulan penyusun) | Baseline 2027 (T1.11) | Bendungan yang RTD-nya belum melibatkan BPBD | Gladi bersama BPBD hilir; waktu peringatan | Pemilik bendungan; Direktorat Kesiapsiagaan | 2029 |
  | Peringatan dini berfungsi | Baseline per kab Jawa (T1.10) | – | Alat terpelihara, pesan sampai warga, gladi tahunan (definisi KERANGKA) | Direktorat Peringatan Dini | 2029 |

- **I5.2 [Inferensi tim]** "Belum terbukti" ditulis sebagai "bukti dampak tidak ditemukan pada penelusuran 23–24 Okt 2026",
  bukan "tidak bermanfaat" (prinsip 12). Naskah tidak menyebut Destana, OMC, embung, polder, atau sumur resapan "terbukti".
- **I5.3 [Inferensi tim] Studi kasus 8.1 PAMSIMAS** cocok dengan rubrik B5.30 (bukti sedang): empat pertanyaan studi kasus
  dapat dijawab dari dua sumber (RWSN, DFAT), dan pelajarannya langsung untuk kemarau (sistem tercatat berfungsi tetapi
  kekurangan air saat kemarau). Pasangan model dan tercatat: EIRR (estimasi-model) disandingkan dengan temuan lapangan.
- **I5.4 [Inferensi tim]** Protokol OMC platform dapat dipakai sebagai kerangka, tetapi ukuran hasilnya harus diganti dari PM2,5
  dan jarak pandang ke curah hujan DAS dan aliran masuk waduk; tanpa catatan sortie terbuka dari BMKG, evaluasi tidak dapat
  dimulai. Rekomendasi pertamanya adalah pencatatan sortie terbuka, bukan klaim efek.
- **I5.5 [Inferensi tim]** Status instrumen evaluasi dampak Destana: **sebagian: penilaian ada, opsional dan mandiri.**
  Perban 7/2025 menyediakan swa-penilaian opsional untuk desa Destana (Pasal 14 ayat (1), (4)), evaluasi dampak jangka
  panjang sebagai salah satu pilihan kegiatan pendampingan (Pasal 11, "dan/atau"), evaluasi tahunan yang hasilnya laporan
  penyelenggaraan (Pasal 19), dan sistem informasi (Pasal 20). Itu bukan garis dasar evaluasi dampak. Yang harus dibentuk:
  (a) instrumen penilaian yang sama untuk desa pembanding belum Destana; (b) penilai independen atau verifikasi atas
  swa-penilaian; (c) kewajiban penilaian pada desa sampel agar garis dasar tidak bergantung pada pilihan desa. Status P7
  tetap "Sudah ada, perlu dikembangkan" sesuai kolom `status_label` P01, dengan isi "perlu dikembangkan" = ketiga instrumen
  itu.

### Celah

- Daftar desa Destana di Jawa beserta hasil Penilaian Ketangguhan (Perban 7/2025 Pasal 20 sistem informasi). **Permintaan:**
  Direktorat Kesiapsiagaan.
- Catatan sortie OMC BMKG di Jawa (lokasi, waktu, bahan, DAS sasaran) dan data aliran masuk waduk. **Permintaan:** BMKG
  (Deputi Bidang Modifikasi Cuaca), PJT I dan II, BBWS.
- Kelanjutan PAMSIMAS sesudah fase III dan data fungsi sistem saat kemarau 2026. **Permintaan:** Ditjen Cipta Karya.
- SNI Destana yang dirujuk Perban 7/2025 Pasal 13 tidak dibuka. Pedoman Penilaian Ketangguhan yang ditetapkan Kepala
  BNPB (Pasal 16) tidak ditemukan di korpus; isinya (indikator, siapa memverifikasi) belum diketahui.
- Instrumen pembanding untuk desa belum Destana dan penilai independen tidak ada di Perban 7/2025. **Penyajian:**
  "instrumen harus dibentuk" di Tabel 8.6. **Permintaan:** Direktorat Kesiapsiagaan.
- Data dampak per desa (DIBI per desa) tidak ada; ukuran hasil Destana per desa bergantung pada pencatatan BPBD.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Halaman kerangka 8.1 | Pilar (musim hujan: korban jiwa; musim kemarau: air bersih dan pangan), sasaran, program berkode dengan kategori bukti | Tesis KERANGKA §4; T1.5, T2.12; I2.1 | B5.12 | Program diberi pil posisi rubrik; P16 hanya dengan kata "padanan di Indonesia" |
| Tabel 8.1 Indikator | Baris: Renas 1.a Jawa (semua dan hidrometeorologi), 1.b Jawa, 1.c nasional, KP 08.04.02, KP 08.04.04, Renas 4.5.1.a, 1.1.2.a, 1.2.1.c, 2.5.1.c; baris pembentukan baseline (peringatan dini Jawa, RTD-renkon, penurunan muka tanah, e-PAKSI). Kolom: Kondisi (tahun di kepala kolom), Target 2029 (resmi, sumber), arah 2030 (Asumsi kebijakan, rumus), lembaga | `bab-08.angka.json` kunci `airjawa.renas1a.*`, `airjawa.renas1b.*`, `renas.*`, `rpjmn.*`; kunci lama `renas.indikator_1c.*` | B5.19, G22 (S24 kondisi ke target) | Nilai belum ada ditulis "–" dengan catatan kaki; 1.b berpil Asumsi kebijakan untuk definisi; target PU hanya konteks |
| Tabel 8.2 Matriks komponen × musim × fase | 30 sel dengan aksi, kategori bukti, pemimpin, peran BNPB | I2.1; T2.1–T2.15 | B5.22 dengan baris komponen | Hitungan per kategori ditulis di keterangan sebagai draf sampai dikunci; sel "tidak berlaku" beralasan |
| Gambar 8.1 Garis waktu tiga fase per musim | Prabencana, tanggap darurat, pascabencana untuk kemarau dan musim hujan; bulan risiko dari kalender DIBI | T3.1, T3.3 | B5.12 | Bulan dari `kalender_bulanan_pulau.csv`; pil "pola tercatat, dipengaruhi pelaporan" |
| Tabel 8.3 Rekomendasi per BBWS | 9 BBWS (10 WS pusat) dan Pemali-Comal: kab tertaut resmi, kegiatan RPSDA "Sudah ada", PSN bendungan, permintaan berpasal | `air-jawa/ws.csv`, `ws_kab.csv` (label resmi saja), riset E6, E8 | B5.7 | Tanpa preskripsi teknis; kab kandidat ditulis per provinsi dengan catatan |
| Tabel 8.4 Daftar perhatian × instrumen daerah | 98 kab/kota, bahaya, kolom RPBD, RPKB, renkon, SPM | `turunan/daftar_perhatian.csv`; T2.18–T2.19 | B5.7 | Kolom instrumen "permintaan data"; urut kode wilayah, bukan peringkat; lampiran G untuk daftar lengkap |
| Kotak 8.1 Posisi Tanggul Laut Pantura | Empat butir posisi; argumen tandingan; satu angka simulasi rob berpil Estimasi model | T4.1–T4.12; I4.1–I4.4 | B5.5 | Tanpa biaya dan panjang tanggul; Korea hanya di draf bila tetap sekunder |
| Gambar 8.2 Kalender Rencana Aksi Musim Hujan 2026/2027 | Bulan × unit, November 2026–April 2027, hari ke-0 dan hari ke-100 ditandai | I3.1; T3.1, T3.6, T3.9 | G23 (tabel native) | Puncak Jawa Januari–Februari; jangan menulis puncak Desember untuk Jawa |
| Tabel 8.5 Keputusan 14 hari pertama | Enam butir KERANGKA §6 dengan unit OTK berlaku dan instrumen | T3.6; T2.11 | B5.7 | Unit memakai `organisasi_bnpb.csv`; tanpa unit OTK lama |
| Tabel 8.6 Agenda bukti | Program, garis dasar, pembanding, ukuran hasil, unit, tahun hasil | I5.1; T5.1–T5.8 | B5.7 | Semua kolom metode berlabel usulan penyusun |
| Halaman studi kasus 8.1 PAMSIMAS | Empat pertanyaan studi kasus; angka RWSN dan DFAT; pelajaran kemarau | T5.4 | B5.30 | Bukti sedang; EIRR berpil Estimasi model berdampingan dengan temuan lapangan |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/air/bukti/bab-08.angka.json` dengan bentuk entri `data/angka.json` (bentuk A:
`berkas` + `jalur` relatif ke `data/`; bentuk B: `nilai` + `pustaka`). `data/angka.json` tidak disunting. Semua entri baru
memakai bentuk B karena nilainya hasil hitungan lintas baris atau berformat Indonesia di CSV sumber (titik ribuan, koma
desimal, tanda %), yang tidak dapat dibaca `ikuti()` sebagai angka. Angka sekunder tidak masuk registri.

**Kunci lama yang dipakai ulang (tidak diubah):** `renas.indikator_1c.2025`, `renas.indikator_1c.2029`,
`renstra.ikp_peringatan_dini.*`, `renstra.iks_kapasitas_minimal_sedang.*`, `airjawa.kekeringan.kab_2019`,
`airjawa.kekeringan.kab_2026`, `airjawa.kekeringan.terdampak_2026`, `bmkg.musim_2026.*` (bab-01); `renas.aksi_244a.target_2029`,
`renas.aksi_242a.*`, `perpres77.dewan_pengarah.kepala_daerah`, `bukti.p16.*`, `bukti.p13.*`, `bukti.p17.*`,
`airjawa.ws.kewenangan_pusat` (bab-02); `perka_2008.air_bersih_liter_hari`, `perka_2008.air_minum_liter_hari`,
`juklak_2023.ambang.meninggal` (bab-03); `hidromet.jawa.lantai.*`, `hidromet.jawa.lanina.korban_jiwa`,
`hidromet.jawa.lantai.pd_renas.*`, `hidromet.jawa.lantai.pd_renstra.*`, `hidromet.jawa.musim_2025.meninggal`,
`hidromet.jawa.kekeringan.dibi_terdampak_2018`, `hidromet.jawa.kekeringan.luas_bahaya_tinggi`, `perhatian.air.*.n`
(`data/angka.json`); `dibi.situgintung2009.meninggal`, `dibi.situgintung2009.hilang`,
`hidromet.jawa.lantai.porsi_situgintung_persen` (bab-06, belum digabung ke `data/angka.json`).

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| renas.indikator_1a.proyeksi_2025 | 0,22 per 100.000 | pustaka bnpb-2025-renas (Tabel 2.8, hlm. 32) | resmi | Renas PB 2025–2029 |
| renas.indikator_1b.proyeksi_2025 | 2.643 per 100.000 | idem | resmi | idem |
| airjawa.renas1a.jawa_2024 | 0,115 per 100.000 | pustaka bnpb-dibi (olah `dibi/rekap_provinsi_tahunan.csv`) | resmi | olah DIBI; penyebut SP2020 |
| airjawa.renas1a.jawa_2025 | 0,260 per 100.000 | idem | resmi | idem |
| airjawa.renas1a.jawa_median_2015_2024 | 0,13 per 100.000 | idem | resmi | idem (median 10 tahun) |
| airjawa.renas1a.jawa_hidromet_2024 | 0,094 per 100.000 | idem | resmi | idem (kode 101–106) |
| airjawa.renas1a.jawa_hidromet_2025 | 0,154 per 100.000 | idem | resmi | idem (kode 101–106) |
| airjawa.renas1a.jawa_hidromet_median_2015_2024 | 0,097 per 100.000 | idem | resmi | idem |
| airjawa.renas1a.nasional_2024 | 0,238 per 100.000 | idem | resmi | idem; penyebut SP2020 nasional |
| airjawa.renas1a.nasional_2025 | 0,842 per 100.000 | idem | resmi | idem |
| airjawa.renas1a.jawa_2018_tsunami | 325 jiwa | idem | resmi | olah DIBI; kode 108 Banten (tsunami Selat Sunda) |
| airjawa.renas1a.jawa_2022_gempa | 610 jiwa | idem | resmi | olah DIBI; kode 107 Jawa Barat |
| airjawa.renas1a.jawa_2025_nonalam | 160 jiwa | idem | resmi | olah DIBI; kode 202 + 203 |
| airjawa.renas1a.jawa_2025_nonalam_persen | 40,6% | idem | resmi | olah DIBI; 160/394 |
| airjawa.renas1a.jawa_2025_kebakaran_permukiman | 89 jiwa | idem | resmi | olah DIBI; kode 202 |
| airjawa.renas1a.jawa_2025_gagal_teknologi | 71 jiwa | idem | resmi | olah DIBI; kode 203 |
| airjawa.renas1b.jawa_menderita_2024 | 1.931 per 100.000 | idem | asumsi-kebijakan | olah DIBI; definisi terdampak = menderita |
| airjawa.renas1b.jawa_menderita_2025 | 1.713 per 100.000 | idem | asumsi-kebijakan | idem |
| airjawa.renas1b.jawa_menderita_median_2015_2024 | 1.681 per 100.000 | idem | asumsi-kebijakan | idem |
| rpjmn.kp080402.peringatan_dini_baseline | 6,00% | pustaka ri-2025-perpres12-rpjmn (Lamp. III hlm. 913) | resmi | RPJMN 2025–2029 |
| rpjmn.kp080404.desa_berketahanan_baseline | 10,31% | idem | resmi | idem |
| rpjmn.kp080404.desa_berketahanan_2029 | 11,74% | idem | resmi | idem |
| rpjmn.kp080401.kapasitas_baseline_2023 | 62% | idem | resmi | idem |
| rpjmn.kp080405.infrastruktur_berketahanan_baseline | 19 | pustaka ri-2025-perpres12-rpjmn (Lamp. II hlm. 437–440) | resmi | idem; indikator Kementerian PU |
| rpjmn.kp080405.infrastruktur_berketahanan_2029 | 100 | idem | resmi | idem |
| renstra.ikk_destana.2025 | 2,58% | pustaka bnpb-2025-renstra (hlm. 135–136) | resmi | Renstra BNPB |
| renstra.ikk_destana.2029 | 3,26% | idem | resmi | idem |
| renstra.ikk_renaksi_kesiapsiagaan.2025 | 4,27% | pustaka bnpb-2025-renstra (hlm. 134–135) | resmi | idem |
| renstra.ikk_renaksi_kesiapsiagaan.2029 | 5,82% | idem | resmi | idem |
| renstra.ikk_posko_status.2025 | 15% | pustaka bnpb-2025-renstra (hlm. 135–136) | resmi | idem; unit Renstra diganti Perban 11/2025 |
| renstra.ikk_posko_status.2029 | 35% | idem | resmi | idem |
| renas.aksi_451a.baseline_2024 | 2.234 desa/kelurahan | pustaka bnpb-2025-renas (hlm. 107) | resmi | Renas 4.5.1.a |
| renas.aksi_451a.target_2029 | 7.234 desa/kelurahan | idem | resmi | idem |
| renas.aksi_112a.desa_baseline_2024 | 8.412 desa/kelurahan | pustaka bnpb-2025-renas (hlm. 51) | resmi | Renas 1.1.2.a |
| renas.aksi_112a.desa_target_2029 | 8.642 desa/kelurahan | idem | resmi | idem |
| renas.aksi_121c.baseline_2024 | 395 daerah | pustaka bnpb-2025-renas (hlm. 56) | resmi | Renas 1.2.1.c |
| renas.aksi_121c.target_2029 | 525 daerah | idem | resmi | idem |
| renas.aksi_251c.baseline_2024 | 278.806 ha | pustaka bnpb-2025-renas (hlm. 87) | resmi | Renas 2.5.1.c |
| renas.aksi_251c.target_2029 | 1.250.000 ha | idem | resmi | idem |
| renas.aksi_121h.hari_operasi_2029 | 950 hari | pustaka bnpb-2025-renas (hlm. 57–58) | resmi | Renas 1.2.1.h (kegiatan TRC); gabungan empat bahaya, bukan hari OMC; OCR bertumpuk |
| renas.aksi_121h.pangkalan_aju_2029 | 5 unit | idem | resmi | Renas 1.2.1.h indikator (2); OCR bertumpuk |
| kemendagri.spm_bencana_belum_tuntas_2025 | 63 daerah | pustaka kemenkopmk-2025-sinkronisasi-irb | resmi | Kemendagri via Kemenko PMK |
| kemendagri.krb_belum_aktif_2025 | 87 daerah | idem | resmi | idem |
| kemendagri.ikd2024_belum_2025 | 79 daerah | idem | resmi | idem |
| perhatian.air.gabungan.n | 98 kab/kota | pustaka bnpb-irbi,bnpb-dibi (olah `turunan/daftar_perhatian.csv`) | asumsi-kebijakan | olah paket turunan |
| perhatian.air.tiga_bahaya.n | 27 kab/kota | idem | asumsi-kebijakan | idem |
| perhatian.air.bbws_di.n_kab | 14 kab/kota | pustaka pupr-2015-permen14 (olah `air-jawa/ws_kab.csv`) | resmi | Permen PUPR 14/2015 Lamp. I |
| perhatian.air.bbws_di.n_masuk | 12 kab/kota | pustaka pupr-2015-permen14,bnpb-irbi | asumsi-kebijakan | irisan dengan daftar perhatian |
| airjawa.ws.n_pola_rpsda | 10 WS | pustaka kemenpupr-pola-rpsda-jawa | resmi | Ditjen SDA |
| airjawa.psn.n_bendungan_jawa | 19 bendungan | pustaka kemenko-ekon-2025-permenko16 | resmi | Permenko Perekonomian 16/2025 |
| airjawa.psn.n_bendungan_nasional | 48 bendungan | idem | resmi | idem |
| airjawa.rpsda.jratunseluna.rob_ha | 22.897 ha | pustaka kemenpupr-2024-rpsda-jratunseluna (hlm. 27–28) | estimasi-model | RPSDA Jratunseluna 2024 |
| airjawa.rpsda.jratunseluna.defisit_air_baku_m3s | 41,60 m³/detik | idem | estimasi-model | idem |
| hidromet.jawa.kalender.porsi_nov_apr | 75,4% | pustaka bnpb-dibi (olah `skenario-hidromet/kalender_bulanan_pulau.csv`) | resmi | olah DIBI 2008–2025 |
| hidromet.jawa.kalender.porsi_des_feb | 42,3% | idem | resmi | idem |
| hidromet.jawa.kalender.porsi_januari | 16,8% | idem | resmi | idem |
| hidromet.jawa.kalender.kekeringan_porsi_jun_sep | 88,8% | idem | resmi | idem |
| hidromet.jawa.musim_2008.tanpa_27mar2009 | 77 jiwa | pustaka bnpb-dibi (olah `skenario-hidromet/musim_hujan.csv` dan `riset/mentah/dibi_hidromet.json`) | resmi | olah DIBI; 270 − 193 |
| hidromet.jawa.lantai.tanpa_27mar2009 | 237 jiwa | idem | resmi | olah DIBI; baris kepekaan, bukan pengganti lantai 270 |
| perban2023.renkon.masa_berlaku_tahun | 3 tahun | pustaka bnpb-2023-renkon (Pasal 21 ayat (1)) | resmi | Perban BNPB 2/2023 |
| perban2023.renkon.reviu_bulan | 6 bulan | pustaka bnpb-2023-renkon (Pasal 21 ayat (2)) | resmi | idem |
| perban2025_7.destana.penilaian_tahun | 3 tahun | pustaka bnpb-2025-destana (Pasal 14 ayat (5)) | resmi | Perban BNPB 7/2025 |
| rembang.rtd_grawan.desa | 14 desa | pustaka rembang-2022-rtd-grawan | resmi | Pemkab Rembang |

**Catatan untuk penulis (token):** `format_angka` membulatkan pecahan ke satu desimal bila opsi `fmt` tidak diberi
(diuji: `airjawa.renas1a.jawa_2024` tampil "0,1"). Pakai `fmt=3` untuk kunci `airjawa.renas1a.*` (kecuali median semua
bencana, `fmt=2`; kunci jiwa dan persen tanpa `fmt`) dan `fmt=2` untuk `renas.indikator_1a.proyeksi_2025` dan
`rpjmn.kp080402.peringatan_dini_baseline`. Semua 63 kunci baru sudah dibaca `Konteks.nilai()` dan `suntik()` dari
`bangun/kontrak/naskah.py` tanpa galat (24 Okt 2026, registri `data/angka.json` digabung dengan bab-06 dan bab-08,
pustaka bab-08 ditambahkan).

**Catatan untuk penggabung:** kunci daftar perhatian, kalender, dan irisan Renas Jawa adalah hitungan lintas baris; dapat
diganti bentuk A bila paket `turunan` atau `dibi` kelak menyimpan baris ringkasnya. Draf hitungan sel matriks (P2 I2.1) dan
sebaran kompendium (T2.12) sengaja tidak didaftarkan sampai matriks naskah dikunci (sama dengan bab-02 C4.6).

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/air/bukti/bab-08.pustaka.json` (kunci `id` dipakai kolom `pustaka` registri). Entri yang
sama dengan berkas bukti Bab 1–4 atau `riset/E-pustaka.json` disalin dengan `id` yang sama. Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| bnpb-2025-renas | Perban BNPB 1/2025, Renas PB 2025–2029 | primer |
| bnpb-2025-renstra | Perban BNPB 5/2025, Renstra BNPB 2025–2029 | primer |
| ri-2025-perpres12-rpjmn | Perpres 12/2025 RPJMN 2025–2029 dan lampiran | primer |
| ri-2020-perpres87 | Perpres 87/2020 RIPB 2020–2044 | primer |
| ri-2007-uu24 | UU 24/2007 Penanggulangan Bencana | primer |
| ri-2019-uu17 | UU 17/2019 Sumber Daya Air | primer |
| ri-2023-uu6 | UU 6/2023 Penetapan Perppu Cipta Kerja | primer |
| ri-2024-pp30 | PP 30/2024 Pengelolaan SDA | primer |
| ri-2010-pp37 | PP 37/2010 Bendungan | primer |
| ri-2008-pp21 | PP 21/2008 Penyelenggaraan PB | primer |
| ri-2019-perpres1 | Perpres 1/2019 BNPB | primer |
| ri-2025-perpres77 | Perpres 77/2025 BOP Pantura Jawa | primer |
| ri-2022-perpres53 | Perpres 53/2022 Dewan SDA Nasional | primer |
| ri-2024-keppres18 | Keppres 18/2024 keanggotaan Dewan SDA Nasional | primer |
| kemenpu-2024-permen2 | Permen PU 2/2024 (TKPSDA WS) | primer |
| ri-2024-perpres12-bmkg | Perpres 12/2024 BMKG | primer |
| ri-2021-perpres75 | Perpres 75/2021 Dana Bersama PB | primer |
| bnpb-2025-destana | Perban BNPB 7/2025 Destana | primer |
| bnpb-2020-dsp | Perban BNPB 4/2020 Penggunaan DSP | primer |
| bnpb-2023-renkon | Perban BNPB 2/2023 Rencana Kontingensi | primer |
| bnpb-2024-peringatan-dini | Perban BNPB 2/2024 Sistem Peringatan Dini Bencana | primer |
| bnpb-2026-rpbd | Perban BNPB 3/2026 Pedoman Penyusunan RPBD | primer |
| bnpb-2025-rpkb | Perban BNPB 9/2025 Penyusunan dan Uji Coba RPKB Daerah | primer |
| bnpb-2025-otk | Perban BNPB 6/2025 OTK BNPB | primer |
| bnpb-2025-otk-ubah | Perban BNPB 11/2025 Perubahan OTK | primer |
| bnpb-2026-juklak-gladi | Juklak BNPB 4/2026 SPM gladi kesiapsiagaan | primer |
| bnpb-2026-juklak-kie | Juklak BNPB 7/2026 SPM komunikasi, informasi, edukasi | primer |
| bnpb-2023-juklak-skpdb | Juklak BNPB 10/2023 SKPDB kab/kota (metadata JDIH saja) | primer (metadata) |
| bnpb-2026-dana-bersama | Perban BNPB 1/2026 Penyaluran Dana Bersama PB | primer |
| bnpb-2008-kebutuhan-dasar | Perka BNPB 7/2008 Pemenuhan Kebutuhan Dasar | primer |
| bnpb-dibi | DIBI BNPB | primer |
| bnpb-irbi | IRBI BNPB (InaRISK) | primer |
| bps-2021-sp2020 | BPS, BRS Hasil Sensus Penduduk 2020 | primer |
| bmkg-2026-musim-hujan | BMKG, siaran pers 22 Sep 2026 | primer |
| bmkg-2026-musim-kemarau | BMKG, siaran pers 10 Jun 2026 | primer |
| infopublik-2026-awal-puncak | InfoPublik, 2 Okt 2026 (draf saja) | sekunder |
| pupr-2015-permen14 | Permen PUPR 14/PRT/M/2015 | primer |
| pupr-2015-permen04 | Permen PUPR 04/PRT/M/2015 | primer |
| kemenpupr-pola-rpsda-jawa | Ditjen SDA, daftar Pola dan RPSDA | primer |
| kemenpupr-2024-rpsda-jratunseluna | RPSDA WS Jratunseluna 2024 | primer |
| kemenpupr-2019-rpsda-ciliwung-cisadane | RPSDA WS Ciliwung-Cisadane 2019 | primer |
| kemenpupr-2021-kepmen904 | Kepmen PUPR 904/KPTS/M/2021 RPSDA Brantas | primer |
| kemenko-ekon-2025-permenko16 | Permenko Perekonomian 16/2025 (PSN) | primer |
| kemenkopmk-2025-sinkronisasi-irb | Kemenko PMK, siaran 12 Sep 2025 | primer |
| djpk-2024-dak-irigasi | Lampiran juknis DAK Fisik Bidang Irigasi (DJPK Kemenkeu, 2024) | primer |
| rembang-2022-rtd-grawan | Pemkab Rembang, RTD Bendungan Grawan (2022) | primer |
| harsoyo-2010-situ-gintung | Harsoyo (2010), Jurnal Sains & Teknologi Modifikasi Cuaca 11(1): 9–17 | primer |
| esdm-2009-situ-gintung | Kementerian ESDM, Laporan Tim Tanggap Darurat PVG Bencana Situ Gintung (6 Apr 2009) | primer |
| rwsn-2023-pamsimas | RWSN, ringkasan laporan penyelesaian Bank Dunia PAMSIMAS | primer |
| dfat-2023-pamsimas | Evaluasi independen PAMSIMAS untuk DFAT (2023) | primer |
| deltaprogramma-2026 | Delta Programme 2026 (Pemerintah Belanda) | primer |
| yamamoto-1984-tokyo | Yamamoto, Case History 9.4 Tokyo (UNESCO) | primer |
| tanaka-2013-bangkok | Tanaka dan Mio (2013), JpGU | primer |
| susilo-2023-gnss | Susilo dkk. (2023), Scientific Data 10: 421 | primer |
| novita-2021-pekalongan | Novita dkk. (2021) | primer (abstrak) |
| investortrust-2024-pekalongan | Investor Trust, 13 Nov 2024 | sekunder |
| asiae-2020-empat-sungai | The Asia Business Daily, 11 Agu 2020 | sekunder |
| seoulshinmun-2018-empat-sungai | Seoul Shinmun, 4 Jul 2018 | sekunder |
| katadata-2026-pdkm | Katadata, September 2026 (PDKM) | sekunder |

Sumber berbeda untuk bab ini: 59 entri, 54 primer (satu hanya metadata, `bnpb-2023-juklak-skpdb`) dan 5 sekunder
(sekunder tidak untuk badan teks).

---

## Catatan pemeriksaan (24 Oktober 2026)

Sebelas temuan pemeriksa dicek ulang ke sumber. Nomor baris di temuan merujuk versi lama; letak di bawah memakai nomor butir.

| No | Temuan | Hasil cek ke sumber | Tindakan |
| --- | --- | --- | --- |
| 1 | Perban 7/2025: "dapat" dan "mandiri" dibuang | Benar. Teks Pasal 11, 14, 19 dibaca ulang (`perban-nomor-7-tahun-2025.json`) | T5.2 mengutip utuh; Inti P5, I5.1 (Destana), I5.5, tabel kerangka (Destana) diubah ke "sebagian: penilaian ada, opsional dan mandiri"; instrumen pembanding dan penilai independen ditulis "harus dibentuk"; celah ditambah |
| 2 | Kategori sel penurunan muka tanah dan PAMSIMAS menggelembung | Benar (kolom `kekuatan` = kuat hanya P16 luar negeri) | Sel diubah; hitungan dihitung ulang dari tabel: aksi wajib 15 (dua terbatas), program berjalan wajib evaluasi 6, tidak berlaku 6, belum dapat dikategorikan 3; kalimat I2.2 dan Inti P2 diganti |
| 3 | Label padanan P16 terlalu tinggi | Benar | T4.6 dipisah: Tokyo dan Bangkok terverifikasi; Pergub DKI 93/2021 sekunder; Kepmen ESDM 291.K/2023 judul dan siaran pers saja |
| 4 | Lonjakan 2018 bukan gempa | Benar: 2018 selisih 336 = tsunami 325 + gempa 7 + gagal teknologi 2 + lainnya 2; 2021 selisih 83 = erupsi 73 + gempa 10; 2022 = gempa 610 | T1.5 dan I1.2 diganti; kunci baru |
| 5 | Komposisi 2025 tidak disebut | Benar: 160 nonalam (kebakaran permukiman 89, gagal teknologi 71) | Baris hidrometeorologi menjadi baris utama di Inti P1, T1.5, I1.2; kunci baru termasuk `jawa_hidromet_2024` |
| 6 | Lantai 270 didominasi Situ Gintung | Benar: 193 dari 270 (71,5%, bukan 71% seperti ditulis temuan; dibulatkan sama dengan bab-06); tanpa kejadian itu 77 dan terbesar 237 | Catatan wajib di T1.8, T3.4, Inti P3, I3.2; kasus dipakai untuk RTD bendungan dan situ. **Tidak diikuti sebagian:** 237 tidak menggantikan 270 sebagai lantai perencanaan, karena KERANGKA register P01 menetapkan lantai Jawa 270 dan bab-06 menolak menyisihkan musim apa pun; 237 tampil sebagai lantai tanpa kegagalan prasarana dalam bentuk baris kepekaan. Penyebab jebol ditulis dua sumber berdampingan (Harsoyo 2010; Tim PVG ESDM 2009), karena keduanya berbeda tentang bobot hujan |
| 7 | Renas 1.2.1.h: kegiatan dan indikator tergabung | Benar (hlm. 57: kegiatan "Pembinaan dan Pengawasan Tim Reaksi Cepat (TRC)..."; indikator (1) 950 hari, (2) pangkalan aju 5 unit) | T2.14, T5.6, I5.1 (OMC), tabel kerangka (OMC), sel matriks waduk diubah; kunci `renas.aksi_121h.pangkalan_aju_2029` ditambah; catatan kunci 950 hari diperbaiki |
| 8 | e-PAKSI tidak mengatur DI pusat | Benar (PDF DJPK hlm. 2396 dibaca ulang lewat `pdftotext`: "seluruh daerah irigasi yang menjadi kewenangannya. Khusus untuk daerah irigasi yang akan diusulkan penanganannya melalui DAK Bidang Irigasi, Pemerintah Daerah wajib ...") | T1.13, I1.1, sel matriks irigasi, Inti P1, celah, tabel kerangka dibatasi ke DI daerah usulan DAK; DI pusat menjadi permintaan data |
| 9 | 17 lawan 18 baris | Benar (`ws_kab.csv` 18 baris label resmi; 777 + 18 = 795) | T2.17 dan tabel kerangka diganti 18; rujukan diganti T2.17 |
| 10 | Tenggat Desember tidak konsisten | Benar | Tenggat tunggal akhir November di Inti P3, I3.1 (butir pindah ke November), I3.3 (jendela sisa Oktober sampai November, 21,4% korban November dan Desember) |
| 11 | RTD dan SOP per WS salah tempat kewenangan | Benar pada pokoknya. **Koreksi kecil atas temuan:** Pasal 94 ayat (5) PP 30/2024 juga menyebut "menteri/pimpinan lembaga pemerintah nonkementerian" dan "Masyarakat", tidak hanya Menteri, gubernur, bupati/wali kota, dan pengelola SDA WS; Pasal 96 sendiri tidak menyebut penetap. BNPB tidak disebut namanya, jadi kesimpulan temuan tetap berlaku | Sel RTD: wajib = keikutsertaan BPBD; integrasi ke renkon = usulan penyusun. Sel SOP per WS: pemimpin pengelola SDA; BNPB "renkon dan koordinasi". T1.12 ditambah kutipan Pasal 94 ayat (5) dan 97 |
