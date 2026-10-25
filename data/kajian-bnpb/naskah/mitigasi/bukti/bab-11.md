# Berkas bukti BAB 11 GRAND DESIGN MITIGASI 2026–2030

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9; Buku Pegangan L56–L64). Penulis bab menulis
hanya dari berkas ini dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-11.angka.json`: 91 kunci angka baru (3 bentuk berkas + jalur, 88 bentuk nilai +
  pustaka), belum digabung ke `data/angka.json`; diperiksa mesin terhadap `data/angka.json` dan semua
  `naskah/*/bukti/*.angka.json` supaya tidak ada kunci ganda.
- `naskah/mitigasi/bukti/bab-11.pustaka.json`: 63 entri CSL-JSON (56 primer, 7 olahan tim atau metadata).

Bahan yang dibaca: `KERANGKA.md` §1.2 (V01, V02, V05 dan V08, V06, V07), §2 (prinsip 1, 4, 6, 7, 9–15, 17), §5 (Bab 7,
10–13, deck E1–E4), §6 (KD-1 sampai KD-4, keputusan 14 hari), §7 (celah 9, 13, 15, 24, 33, 35), §8 (E1, E4, E9, E11);
`KEPUTUSAN.md` (P4–P11, T10, T14); Buku Pegangan L56–L64; `PEDOMAN-DESAIN.md` §C9 dan tabel kode G1–G25; riset A §2, §7;
riset C §5; riset E §E4, §E9, §E11, §E16; berkas bukti mitigasi Bab 1–10 dan 13 serta air Bab 3, 5, 8 (dipakai ulang bila
butirnya sudah diverifikasi, disebut per butir); paket `data/program-terbukti/` (README, `kompendium_program.csv`,
`bukti_dampak.csv`, `organisasi_bnpb.csv`), `data/lembaga/peran.csv`, `data/dibi/` (`rekap_nasional_tahunan.csv`,
`kejadian_besar.csv`), `data/skenario-hidromet/` (`kalender_bulanan_pulau.csv`, `musim_hujan.csv`, `kartu_skenario.csv`,
README), `data/skenario-geologi/` (`gempa_kab.csv`, `ringkasan.csv`, `pembanding_pdna.csv`, README), cache mentah
`riset/mentah/dibi_hidromet.json` dan `dibi_geologi.json` (tarik 23 Okt 2026), `public/udara/data/omc_hasil.json`; korpus
`data/raw/hukum/teks/` (Perban 1/2025, 2/2023, 2/2024, 3/2018, 4/2020, 4/2024, 5/2017, 6/2017, 7/2025, 11/2025; Perka 3/2016,
7/2008, 15/2011, 17/2011; Juklak 3/2022, 4/2023, 1/2023, 3/2023, 3/2024, 15/2025, 16/2025; Perpres 17/2018, 46/2026) dan
indeks JDIH `data/raw/hukum/indeks.json` (Juklak 5/2024, 6/2023, 9/2023, 10/2023; Perka 17/2010, 5/2012, 4/2013); teks UU
24/2007 dan UU 7/2012 di `lembaga/mentah/teks/`; sumber web yang dibuka ulang 24 Oktober 2026 (disebut per butir).

Semua hitungan lintas baris di berkas ini dihitung ulang penyusun bukti pada 24 Oktober 2026 dari berkas yang disebut,
bukan disalin dari draf sebelumnya.

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah RI; dokumen, tabel, peraturan, atau rilis dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal bertinjauan, laporan evaluasi independen, Bank Dunia) |
| estimasi-model | Keluaran model yang belum diuji balik terhadap data Indonesia, siapa pun pembuatnya |
| asumsi-kebijakan | Pilihan penyusun (aturan jendela, pemetaan sel, jiwa per rumah, rumus arah 2030, penetapan lantai perencanaan) |
| sekunder | Berita atau ringkasan pihak lain; dokumen primer tidak terbuka. **Tidak masuk badan teks sebagai angka utama** dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**. Rujukan "registri
`kunci`" berarti kunci di `data/angka.json`; "kunci lama `kunci` (bab-NN)" berarti kunci di berkas bukti lain; "kunci baru
`kunci`" berarti kunci di `bab-11.angka.json`. Program disebut dengan posisi rubrik paket `program-terbukti` (KERANGKA §2
butir 12). **Kata "terbukti" hanya boleh dipakai untuk baris berkolom `kekuatan` = `kuat`**, dan di kompendium hanya ada dua,
keduanya luar negeri: P16 (pengendalian air tanah Tokyo, Osaka, Bangkok) dan P19 (paket kesiapsiagaan siklon Bangladesh;
yang terbukti adalah paketnya, bukan unsur tunggal). InaTEWS (P03) dan PAMSIMAS (P13) berbukti sedang; P03 berposisi
"Program berjalan, wajib evaluasi dampak". Destana (P01), SPAB (P02), embung (P10), polder (P15) "belum-terbukti"; P04–P09,
P11, P12, P14 "lemah"; OMC tidak punya baris kompendium.

---

## Kerangka bab (dari KERANGKA.md §5, BAB 11)

- **Judul:** BAB 11 GRAND DESIGN MITIGASI 2026–2030 (17 hlm).
- **Subbab:** 11.1 Kerangka Program; 11.2 Sasaran 2029 dan Arah 2030; 11.3 Alur Langkah Penanggulangan; 11.4 Matriks
  Strategi Fase × Jenis Bencana; 11.5 Operasi Musiman: Kemarau dan Musim Hujan; 11.6 Rencana Aksi Musim Hujan 2026/2027
  Tingkat Nasional dan Kesiapan Kemarau 2027; 11.7 Kebutuhan Respons dan Logistik per Wilayah; 11.8 Desa, Sekolah, dan
  Relawan; 11.9 Pemulihan per Instrumen; 11.10 Agenda Bukti 2026–2030.
- **Tujuan bab:** menyusun strategi tiga tahap yang berpasal, berpemicu, dan berbukti, dimulai musim 2026/2027.
- **Pertanyaan kunci:**
  1. Sasaran apa yang terukur dengan data sekarang?
  2. Langkah apa dari peringatan dini sampai R3P, siapa memutus, dan pada pemicu apa?
  3. Apa aksi per fase untuk tiap jenis, dengan kategori bukti?
  4. Apa yang dikerjakan BNPB saat kemarau dan saat musim hujan, termasuk 2026/2027?
  5. Berapa kebutuhan respons skenario terburuk per Direktorat Penanganan Darurat Wilayah?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Sasaran utama Renas 1.a dan 1.b dari DIBI; 1.c dua lintasan sampai KD-2; IRB turun 1,2% per tahun terhadap baseline IRBI 2025 skala baru (KD-4); kapasitas 90% dengan alat ukur KD-3; arah 2030 berlabel | Dikonfirmasi. **Koreksi seri (V06):** baris utama 1.a memakai bencana alam (2025: 1.956 meninggal dan hilang, 0,68 per 100.000 penduduk BPS 2026); semua klasifikasi (2.276; 0,79) hanya berdampingan. **Ditambah:** median alam 2015–2024 (583,5 jiwa) setara 0,22 per 100.000 dengan penyebut SP2020, sebesar proyeksi Renas 1.a 2025 (P1 T1.3); RPJMN memuat indikator status darurat "sesuai standar" 75 ke 100 tanpa definisi standar di bahan (P1 T1.6) |
| Alur: peringatan dini, siaga darurat, tanggap darurat (SKPDB, kaji cepat, penilaian awal, penilaian perkembangan, DSP), transisi, Jitupasna, R3P, RR, hibah; pemicu khusus per jenis; status oleh Presiden, gubernur, bupati/wali kota | Dikonfirmasi pada teks. **Koreksi urutan:** penilaian awal (Juklak 4/2023) mendahului kaji cepat (Juklak 3/2022), dan SKPDB diaktivasi *berdasarkan* penetapan status (Perka 3/2016 Pasal 3 ayat (1)), bukan sebelum kaji cepat. **Ditambah:** tenggat berangka (kaji cepat 1 × 24 jam, laporan awal berisi rekomendasi status 1 × 24 jam setelah tiba, laporan lanjutan 3 × 24 jam; R3P paling lama 90 hari dan dimulai saat tanggap darurat); keadaan tertentu Perpres 46/2026; Perban 2/2024 Pasal 14 masih menunjuk unit OTK lama (P2) |
| Matriks fase × jenis: baris aksi berpasal, kolom pemicu dan instrumen, kategori bukti per sel, jumlah sel per kategori | Disusun sebagai draf 39 sel (13 jenis, sama dengan Bab 10): 28 sel hanya berisi aksi wajib menurut peraturan, 8 Program berjalan wajib evaluasi dampak, 2 Rujukan tata kelola, 1 Program dengan syarat, 0 Program (bukti kuat) dalam negeri (P3) |
| Operasi musiman: kalender bahaya bulanan per pulau dari DIBI (musim hujan termasuk gelombang; kemarau dengan kebakaran TPA dan permukiman sebagai konteks); pemicu BMKG, ENSO, IOD, PDKM, siaga darurat; aksi per tahap; unit | Turunan kalender **sudah ada** (`skenario-hidromet/kalender_bulanan_pulau.csv`, 9 jenis hidrometeorologi). **Ditambah:** pola tidak seragam: kejadian musim hujan Maluku memuncak Juni–Juli (46,1% kejadian dan 74,4% meninggal dan hilang Juni–Oktober); karhutla Sumatera punya puncak kedua Februari–Maret; gelombang dan rob di Jawa tercatat lebih banyak Mei–Agustus (53,7% dan 68,0% kejadian), tetapi dari beberapa episode (tanpa Juli 2018 gelombang 42,9% lawan 44,2% November–April; rob hanya 2020–2023 dan 2025), jadi tidak dipakai merombak panel; patahan kategori 2018 dicatat di pil. Kebakaran TPA dan kebakaran permukiman tidak ada di kalender maupun cache (P4) |
| Rencana Aksi Musim Hujan 2026/2027: provinsi dengan awal musim per ZOM November–Desember 2026; dasar kartu agregat 7.1 dan 7.2; unit ditambah Direktorat PD Wilayah | **Sebagian.** Tabel per ZOM tidak terbuka; BMKG 22 Sep 2026 menyebut awal dan puncak per wilayah dengan kata "sebagian" dan "sebagian besar". Kartu 7.1 (lantai 1.692) dan 7.2 (ekspektasi 199–373) dipakai. **Koreksi:** puncak Desember berlaku untuk sebagian besar Sumatera, Kalimantan, Sulawesi Barat; Jawa, Bali, Nusa Tenggara, dan Papua memuncak Januari–Februari 2027 (P4) |
| Kebutuhan respons: pengungsi tercatat puncak (hidrometeorologi) atau penghuni rumah RB+RS (gempa) × standar Perka 7/2008 dan Perban 3/2018, per Direktorat PD Wilayah I–III | Dihitung dari DIBI per tanggal: puncak 30 hari serentak per direktorat, dua definisi gempa berdampingan (P5). **Ditambah:** definisi gempa KERANGKA (penghuni RB+RS tercatat × 3,9) menaikkan lantai Wilayah III ke 464.120 (Sumatera Barat 2009; pengungsi tercatat DIBI hanya 6.554); periode acuan geologi 30 tahun memasukkan Yogyakarta 2006 (Wilayah I) dan tsunami 2004 (Aceh dan Nias, tidak terpilah, Wilayah I dan II) sebagai baris berdampingan berdefinisi kehilangan rumah, bukan lantai. Rumus rumah gagal untuk gunung api (Merapi 2010: 10.230 lawan 447.982 tercatat) |
| Destana 2.234 ke 7.234 dari 53.000 desa rawan; evaluasi dampak dengan tingkat ketangguhan Perban 7/2025; SPAB BNPB kontributor; relawan dan kearifan lokal hanya berdokumen primer | Dikonfirmasi. Relawan punya pedoman Perka 17/2011; dokumen primer kearifan lokal tidak ditemukan dan tidak ditulis (Bahan 11.8) |
| Pemulihan per instrumen: DTH (Juklak 1/2023; 15/2025), huntara (Juklak 3/2023), stimulan DSP (Juklak 5/2024), hibah RR (Perban 4/2024), R3P (Perban 5/2017); Sumatra 2025 kasus berjalan; sinkronisasi nomenklatur RR dengan Kemendagri | Dikonfirmasi kecuali Juklak 5/2024 (teks tidak tersedia di JDIH). **Ditambah:** Juklak 15/2025 menyalurkan DTH langsung dari BNPB ke rekening penerima, berbeda dari Juklak 1/2023 lewat BPBD; R3P Aceh selesai 35 hari setelah kejadian; Inpres 18/2025. **Sinkronisasi nomenklatur:** dokumen sinkronisasi BNPB–Kemendagri tidak ditemukan; yang berpasal hanya kewajiban lapor hibah RR ke Mendagri (Perban 4/2024 Pasal 28), dan indeks JDIH BNPB masih menandai Perka 17/2010 berlaku padahal dicabut Perban 5/2017 Pasal 12 (Bahan 11.9) |
| Agenda bukti: Destana, SPAB, InaTEWS, OMC; embung dan polder pindah ke Kajian 1 Tabel 8.6 | Dikonfirmasi; OMC tercatat 0 sortie di platform (Bahan 11.10). Embung (P10) dan polder (P15) tidak masuk Tabel 11.5 |

- **Komponen (KERANGKA):** Halaman kerangka 11.1 (B5.12); Tabel 11.1 indikator (B5.19, G22); Gambar 11.1 alur langkah
  berpemicu (B5.23, G21); Tabel 11.2 matriks fase × jenis dengan kolom pemicu (B5.22); Gambar 11.2 kalender bahaya bulanan per
  pulau (G16); Tabel 11.3 operasi musiman (B5.7); Gambar 11.3 kalender Rencana Aksi Musim Hujan 2026/2027 (G23); Tabel 11.4
  kebutuhan respons per Direktorat PD Wilayah (B5.7); Tabel 11.5 agenda bukti (B5.7); Halaman studi kasus 11.1 Bangladesh
  (B5.30, bukti kuat) dan 11.2 Odisha (B5.30, bukti sedang). Rincian di bagian Komponen.
- **Status data (KERANGKA):** sebagian (kalender bulanan dan baseline 1.c per provinsi perlu turunan atau permintaan data).
  **Pembaruan:** kalender bulanan per pulau sudah ada; baseline 1.c per provinsi tetap tidak ada (celah KERANGKA §7 butir 33);
  tabel prakiraan per ZOM tetap tidak terbuka (butir 35); pengungsi tercatat pra-2008 tidak ada di DIBI.

Catatan lingkup: Bab 11 adalah satu-satunya tempat strategi (prinsip 17). Mandat lembaga dan pembiayaan rinci tinggal di
Bab 12; rekomendasi bernomor di Bab 13 (register bersama §6). Lantai skenario (prinsip 9) berlaku di 11.5–11.7: perencanaan
musim dan kebutuhan respons tidak boleh memakai angka lebih ringan daripada kejadian atau musim tercatat terburuk untuk
wilayah yang sama. Tanpa pagu dan biaya proyek (P5); angka rupiah hanya besaran bantuan per penerima yang tertulis di juklak.

---

## P1. Sasaran apa yang terukur dengan data sekarang?

### Inti

Yang terukur langsung dari data resmi sekarang hanya indikator korban Renas 1.a dan, dengan definisi tertulis, 1.b: untuk
bencana alam, meninggal dan hilang 2025 (1.956 jiwa) setara 0,68 per 100.000 penduduk BPS 2026, sekitar 3,1 kali proyeksi
Renas 0,22, padahal median alam 2015–2024 (583,5 jiwa) setara 0,20 sampai 0,22 per 100.000, sebesar proyeksi itu; versi semua
klasifikasi (2.276; 0,79) hanya ditulis berdampingan. Cakupan peringatan dini 1.c hanya punya angka nasional dalam dua lintasan
yang penyebutnya berbeda (KD-2), penurunan IRB 1,2% per tahun tidak dapat diukur sampai catatan metode IRBI 2025 terbit (KD-4),
dan kapasitas 90% punya dua alat ukur yang bertentangan, 67% lawan 38% (KD-3).

### Temuan bersumber

**Sasaran resmi**

- **T1.1 Renas Tabel 2.8.** 1.a proporsi kematian (dan hilang) akibat bencana per 100.000 jiwa: proyeksi 2025 0,22, target 2029
  "Menurun"; 1.b penduduk terdampak per 100.000 jiwa: 2.643, "Menurun"; 1.c penduduk per 100.000 di daerah berisiko yang
  tercakup informasi peringatan dini: 11.060 ke 52.000. Sumber: `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` hlm. 32
  [`bnpb-2025-renas`]; kunci lama `renas.indikator_1a.proyeksi_2025`, `renas.indikator_1b.proyeksi_2025` (mitigasi bab-01),
  `renas.indikator_1c.2025`, `renas.indikator_1c.2029` (air bab-01). **resmi**. Tahun dasar, penyebut, dan cakupan jenis proyeksi
  0,22 dan 2.643 tidak tertulis di Renas (mitigasi bab-01 Celah).
- **T1.2 RPJMN 2025–2029 Lampiran III hlm. 913 (BNPB):** PP 08.04 penurunan nilai IRB nasional baseline 1,54 (2023), target 1,2
  (2025 dan 2029); KP 08.04.01 daerah berkapasitas PB minimal sedang 62 (2023), 67 (2025), 90 (2029); KP 08.04.02 cakupan
  layanan peringatan dini 6,00, 6,10, 6,32; KP 08.04.02 "Persentase daerah yang menetapkan status keadaan darurat dan menerima
  intervensi sesuai standar" 75, 100, 100; KP 08.04.03 daerah pascabencana masif yang ditangani 100, 100, 100; KP 08.04.04 desa
  berketahanan bencana multipihak 10,31, 10,49, 11,74. Sumber: `riset/E-dokumen-primer.md` §E11(b) (dicek dari gambar halaman)
  [`ri-2025-perpres12-rpjmn`]; kunci lama `rpjmn.pp_irb.baseline_2023`, `rpjmn.kp_kapasitas.*`, `rpjmn.kp080402.peringatan_dini_baseline`,
  `rpjmn.kp080404.*`; kunci baru `rpjmn.kp080402b.status_darurat_standar.baseline`, `.2029`, `rpjmn.kp080403.pascabencana_masif.2029`.
  **resmi**.

**Realisasi yang dapat dihitung dari DIBI**

- **T1.3 Renas 1.a nasional, seri 2015–2025** (meninggal + hilang, cakupan kejadian bencana; penyebut tetap SP2020 270,20 juta,
  sama dengan berkas bukti air bab-08). Baris alam (kode 101–109) adalah seri utama Kajian 2 sejak V06; baris semua klasifikasi
  memuat nonalam yang baru tercatat sejak 2024, kebakaran permukiman (di luar lingkup P11), dan kategori lainnya:

  | Tahun | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026* |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Alam: meninggal + hilang | 276 | 578 | 378 | 6.240 | 589 | 418 | 815 | 895 | 308 | 603 | 1.956 | 448 |
  | Alam: per 100.000 (SP2020) | 0,102 | 0,214 | 0,140 | 2,309 | 0,218 | 0,155 | 0,302 | 0,331 | 0,114 | 0,223 | 0,724 | 0,166 |
  | Semua klasifikasi: meninggal + hilang | 276 | 578 | 378 | 6.264 | 629 | 418 | 815 | 895 | 308 | 642 | 2.276 | 569 |
  | Semua klasifikasi: per 100.000 (SP2020) | 0,102 | 0,214 | 0,140 | 2,318 | 0,233 | 0,155 | 0,302 | 0,331 | 0,114 | 0,238 | 0,842 | 0,211 |

  \* 2026 sampai tarik 23 Okt 2026, sementara. Median 2015–2024: alam 583,5 jiwa = 0,216 per 100.000 (SP2020) atau 0,203
  (penduduk BPS pertengahan 2026, 287.198.383); semua klasifikasi 603,5 = 0,223 atau 0,210. Realisasi 2025 alam: 0,724 (SP2020),
  0,68 (BPS 2026); semua klasifikasi: 0,79 (BPS 2026), 0,80 (SUPAS 2025), 0,84 (SP2020 dan penduduk KRB). Sumber:
  `data/dibi/rekap_nasional_tahunan.csv` [`klasifikasi=alam`, `cakupan=bencana`, dijumlah per tahun; dan `klasifikasi=semua`,
  `kode_jenis_juklak` kosong], dihitung 24 Okt 2026 [`bnpb-2026-dibi`]; penduduk BRS BPS 21 Jan 2021 [`bps-2021-sp2020`], BPS 2026
  [`bps-2026-penduduk`]; kunci lama `dibi.alam.meninggal_hilang.2025`, `dibi.nasional.meninggal_hilang.*`, `dibi.nasional.per100rb.2025_*`
  (mitigasi bab-01), `dibi.alam.per100rb.2025_bps2026`, `dibi.alam.rasio_proyeksi_1a.2025` (mitigasi bab-13), `airjawa.renas1a.nasional_2024`,
  `airjawa.renas1a.nasional_2025` (air bab-08); kunci baru `dibi.alam.meninggal_hilang.median_2015_2024`,
  `dibi.alam.per100rb.median_2015_2024_sp2020`, `dibi.alam.per100rb.median_2015_2024_bps2026`, `dibi.alam.per100rb.2025_sp2020`,
  `dibi.alam.per100rb.2018_sp2020`, `dibi.alam.meninggal_hilang.2026_sementara`, `dibi.nasional.per100rb.median_2015_2024_sp2020`,
  `dibi.nasional.meninggal_hilang.2026_sementara`. Label: olah(resmi). Patahan seri 2024 (definisi kejadian bencana Juklak 7/2023)
  berlaku (KERANGKA §2 butir 7).
- **T1.4 Renas 1.b:** Juklak 7/2023 mendefinisikan "Terdampak/Penderita" sebagai orang yang menderita dampak buruk bencana tetapi
  masih menempati tempat tinggalnya, terpisah dari pengungsi; menderita DIBI 2025 (semua klasifikasi) = 4.148 per 100.000 (SUPAS
  2025), 4.563 bila pengungsi ditambahkan; keduanya di atas proyeksi 2.643. Sumber: mitigasi bab-01 T1.7 [`bnpb-2023-juklak7`]; kunci
  lama `dibi.nasional.terdampak_per100rb.2025`. **resmi** (olah); definisi "terdampak" di Renas tidak tertulis.
- **T1.5 Lantai korban musim hujan nasional:** musim 2025/2026 = 1.692 meninggal dan hilang (1.506 + 186), terberat dalam 18 musim
  dan 2,8 kali musim terberat kedua; median 18 musim 301,5. Sumber: `skenario-hidromet/musim_hujan.csv`; registri
  `hidromet.nasional.lantai.meninggal_hilang`; kunci lama `hidromet.nasional.musim.median_meninggal_hilang` (mitigasi bab-07). **resmi**.
  - *Disandingkan dengan model:* pita model rasio musim terberat 395,8–954,3, rasio lantai terhadap batas tinggi model 1,77 (kunci
    lama `hidromet.nasional.lantai.rasio_batas_tinggi_model`, mitigasi bab-07). **estimasi-model, belum diuji balik.** Model berada di
    bawah angka tercatat, jadi sasaran musim tidak boleh ditulis dari pita model.

**Sasaran yang belum dapat diukur atau ganda alat ukurnya**

- **T1.6 Status darurat "sesuai standar":** indikator RPJMN KP 08.04.02 kedua (75 ke 100) menyebut "intervensi sesuai standar"
  tanpa rujukan standar di halaman yang dibuka (T1.2). Standar minimal kebutuhan dasar yang tertulis di korpus adalah Perka BNPB
  7/2008 (P5 T5.7). Label: **resmi** (indikator); tautan ke Perka 7/2008 = tafsiran penyusun.
- **T1.7 Peringatan dini, dua lintasan.** Renas 1.c 11.060 ke 52.000 per 100.000 (kelipatan 4,7) lawan IKP Renstra dan RPJMN 6,10% ke
  6,32% (naik 0,22 poin, baseline RPJMN 6,00); penyebut berbeda; Renstra juga mencatat keterpenuhan sistem peringatan dini 6% dari
  masyarakat terpapar di kawasan risiko tinggi. Faktor pengali korban (R = 8, WMO 2022) 0,603 untuk lintasan Renas dan 0,998 untuk
  lintasan Renstra; pada lantai nasional 1.692 memberi 1.020,9 lawan 1.688,6. Sumber: kunci lama `renas.indikator_1c.kelipatan_2025_2029`,
  `renstra.ikp_peringatan_dini.*` (air bab-10, bab-01), `renstra.peringatan_dini.keterpenuhan_persen` (mitigasi bab-03), registri
  `hidromet.nasional.lantai.pd_renas.korban_jiwa`, `hidromet.nasional.lantai.pd_renstra.korban_jiwa`; mitigasi bab-07 P3 butir 8
  [`bnpb-2025-renas`, `bnpb-2025-renstra`, `wmo-2022-peringatan-dini`]. **resmi** (target); faktor **asumsi-kebijakan** (asosiasi
  lintas negara, bukan efek kausal; hanya di kartu berpil, prinsip 10 dan V02). Dasar KD-2.
- **T1.8 IRB 1,2% per tahun tidak dapat dilanjutkan ke 2025.** IRB nasional turun 144,02 (2019) ke 128,52 (2024), 10,76%, dan Renstra
  menyatakan target 10% tercapai; tetapi IRBI 2025 berskala patah (nilai per bahaya bilangan bulat; `total` = jumlah kolom bahaya di 0%
  kab; Spearman peringkat 2024 ke 2025 = 0,589), dan rerata nasional 2025 tidak pernah diterbitkan. Sumber: mitigasi bab-01 T1.8–T1.9;
  `data/irbi/README.md` §4 [`bnpb-irbi`, `bnpb-2025-renstra`]; registri `irbi.nasional.persen_2019_2024`; kunci lama `irbi.skala.*`
  (mitigasi bab-03). **resmi** (data); "skala berubah" **asumsi-kebijakan**. Dasar KD-4.
- **T1.9 Kapasitas daerah, tiga angka berdampingan:** Renstra "67% ke 90%" (memakai target 2025 sebagai titik awal; IKD rerata 0,46);
  RPJMN baseline 62% (2023); kapasitas KRB 2022–2026: 37,99% kab minimal sedang (315 rendah, 190 sedang, 3 tinggi dari 508 kab dinilai);
  Renstra menargetkan 73% pada 2026. Sumber: kunci lama `renstra.iks_kapasitas_minimal_sedang.*` (air bab-01; mitigasi bab-05),
  `rpjmn.kp_kapasitas.baseline_2023` (mitigasi bab-01), `krb.nasional.kapasitas_minimal_sedang_persen`, `krb.nasional.kab_kapasitas_*`
  (mitigasi bab-03), `renstra.ikd.rerata` (mitigasi bab-02). **resmi** (ketiganya). Dasar KD-3; dua ukuran tidak saling membantah
  secara logis karena alat ukurnya berbeda, tetapi jarak ke 90% berbeda 52 poin.
- **T1.10 Jalur perubahan sasaran:** usulan perubahan target dan alat ukur (KD-2, KD-3, KD-4) hanya lewat jalur berkala Renas
  (Pasal 7 ayat (1)), paling lambat 2027; jalur bencana (ayat (2), pemicu Sumatra November 2025) paling lambat 2028 dan hanya untuk
  program dan kegiatan; keduanya wajib termuat di hasil monev tahunan atau evaluasi paruh waktu. Sumber: KERANGKA §2 butir 1 dan V01;
  kunci lama `renas.perubahan_berkala.tahun_maks`, `renas.perubahan_bencana.tahun_maks` (air bab-10) [`bnpb-2025-renas`]. **resmi**.

### Inferensi

- **I1.1 [Inferensi tim] Tabel 11.1 memakai tiga jenis baris.** (a) Terukur sekarang, berbaseline DIBI: 1.a (kondisi 2025 alam 0,68
  dengan penyebut BPS 2026, semua klasifikasi 0,79 berdampingan; median alam 2015–2024 0,20 dengan penyebut yang sama) dan 1.b (dengan
  definisi Juklak 7/2023 tertulis di catatan kaki), "Target 2029 (resmi, Renas): Menurun". (b) Target resmi yang alat ukurnya menunggu
  keputusan: 1.c (KD-2), IRB 1,2% (KD-4), kapasitas 90% (KD-3), dengan kolom kondisi menulis kedua angka berdampingan. (c) Target RPJMN
  pendamping: status darurat sesuai standar (75 ke 100), pascabencana masif (100), desa berketahanan (10,31 ke 11,74), peringatan dini
  KP 08.04.02.
- **I1.2 [Inferensi tim] Proyeksi 0,22 kemungkinan setara median sepuluh tahun.** Kesamaan 0,216 (median alam 2015–2024, SP2020) dan
  0,223 (semua klasifikasi) dengan 0,22 adalah kesamaan besaran, bukan bukti cara hitung. Arti kebijakannya: "Menurun" dari 0,22 berarti
  di bawah tahun biasa, dan satu kejadian katastrofik (2018: 2,309; 2025: 0,724, keduanya alam, SP2020) menggagalkannya. Naskah boleh
  menulis 1.a dua lapis: tahun biasa (median bergerak) dan tahun dengan kejadian katastrofik (dilaporkan terpisah), tanpa menyiratkan
  bahwa BNPB menghitung 0,22 dengan cara itu.
- **I1.3 [Inferensi tim] Arah 2030 dengan rumus tertulis (prinsip 11), berlabel Asumsi kebijakan:** 1.c "target 2029 + kenaikan
  tahunan rata-rata 2025–2029" = 52.000 + (52.000 − 11.060) / 4 = 62.235 per 100.000 (sama dengan rumus kajian air); 1.a "tidak
  melebihi median sepuluh tahun terakhir"; IRB "1,2% per tahun dari baseline 2025 skala baru" = turun kumulatif 5,86% sampai 2030
  (1 − 0,988⁵), hanya bila baseline terbit; kapasitas "90% dipertahankan dengan alat ukur hasil KD-3".
- **I1.4 [Inferensi tim]** Musim hujan 2026/2027 tidak diberi sasaran korban tersendiri dari model; ukuran keberhasilan musim adalah
  baris hidrometeorologi 1.a dibanding lantai 1.692 dan median musim 301,5, ditulis "pola tercatat".

### Celah

- Baseline 1.c per provinsi dan kab/kota (KERANGKA §7 butir 33). **Permintaan:** Direktorat Peringatan Dini. **Penyajian:** nasional saja.
- Tahun dasar, penyebut, dan cakupan jenis proyeksi 0,22 dan 2.643 (apakah alam saja atau semua klasifikasi). **Permintaan:** Direktorat
  Pengembangan Strategi PB (metadata indikator Renas). **Penyajian:** alam sebagai baris utama, semua klasifikasi berdampingan.
- Definisi "intervensi sesuai standar" dan daftar daerah yang dihitung untuk KP 08.04.02 kedua. **Permintaan:** Deputi Bidang
  Penanganan Darurat dan Bappenas (metadata indikator RPJMN).
- Catatan metode IRBI 2025 (KD-4). **Permintaan:** Direktorat Pemetaan dan Evaluasi Risiko Bencana.

---

## P2. Langkah apa dari peringatan dini sampai R3P, siapa memutus, dan pada pemicu apa?

### Inti

Rantainya berpasal lengkap: peringatan dini dikeluarkan K/L teknis (BMKG, Badan Geologi, Kemenkes) dan masuk platform BNPB yang
memberi rekomendasi aksi; status siaga, tanggap, dan transisi darurat ditetapkan Presiden, gubernur, atau bupati/wali kota atas
rekomendasi badan PB; penilaian awal oleh warga dan petugas lokal mendahului kaji cepat TRC PB (paling lambat 1 × 24 jam, laporan
awal berisi rekomendasi status), dan SKPDB serta DSP baru terbuka setelah status ditetapkan; R3P disusun paling lama 90 hari sejak
tanggap darurat dan menjadi syarat hibah RR. Pemicu per jenis berbeda: tingkat aktivitas gunung api ESDM (Awas: warga mengungsi atas
perintah pemda), peringatan tsunami BMKG, KLB atau wabah menurut UU 17/2023, dan status keadaan konflik menurut UU 7/2012; bila status
tidak ditetapkan, Kepala BNPB dapat bertindak dalam keadaan tertentu setelah rakor menko (Perpres 46/2026).

### Temuan bersumber

**Kerangka undang-undang**

- **T2.1 Prabencana dalam situasi berpotensi bencana** meliputi kesiapsiagaan, peringatan dini, dan mitigasi (UU 24/2007 Pasal 44).
  Peringatan dini dilakukan melalui pengamatan gejala, analisis, "pengambilan keputusan oleh pihak yang berwenang", penyebarluasan
  informasi, dan pengambilan tindakan oleh masyarakat (Pasal 46 ayat (2)). Kesiapsiagaan memuat antara lain penyusunan dan uji coba
  rencana penanggulangan kedaruratan, penyediaan barang pasokan kebutuhan dasar, dan penyiapan lokasi evakuasi (Pasal 45 ayat (2)).
  Sumber: `lembaga/mentah/teks/uu-24-2007.json.gz` hlm. 21–22 [`ri-2007-uu24`]. **resmi**.
- **T2.2 Tanggap darurat** meliputi pengkajian cepat, penentuan status keadaan darurat, penyelamatan dan evakuasi, pemenuhan kebutuhan
  dasar, pelindungan kelompok rentan, pemulihan segera prasarana vital (Pasal 48); saat status ditetapkan BNPB dan BPBD mendapat
  kemudahan akses (pengerahan SDM, peralatan, logistik, pengadaan, komando memerintahkan sektor/lembaga; Pasal 50 ayat (1)); penetapan
  status sesuai skala bencana (Pasal 51). Pascabencana = rehabilitasi dan rekonstruksi (Pasal 57–59). Sumber: idem hlm. 22–25. **resmi**.

**Peringatan dini dan siapa memutus**

- **T2.3 Sistem peringatan dini BNPB:** tujuh komponen (platform, konektivitas, interoperabilitas, rekomendasi aksi, diseminasi, aksi,
  pemanfaatan; Perban 2/2024 Pasal 2 ayat (3)); platform dikelola Deputi Bidang Pencegahan (Pasal 3); K/L menyampaikan data peringatan
  dini bahaya untuk tsunami, banjir, erupsi gunung api, pergerakan tanah, kekeringan, cuaca ekstrem, karhutla, gempa bumi, epidemik,
  kegagalan nuklir dan radiologi, teknologi industri, dan bahaya lain (Pasal 7 ayat (2)); layanan informasi 24 jam (Pasal 8 huruf b);
  rekomendasi aksi strategis oleh kelompok kerja dan teknis oleh BPBD (Pasal 14–15), yang berfungsi "menunjang pengambilan keputusan
  oleh pihak yang berwenang" (Pasal 16 ayat (1)). Sumber: `data/raw/hukum/teks/perban-nomor-2-tahun-2024.json` hlm. 4–5, 8–9
  [`bnpb-2024-peringatan-dini`]; kunci lama `perban2_2024.jenis_data_bahaya` (air bab-07). **resmi**.
  - *Dibantah oleh (OTK):* kelompok kerja Pasal 14 ayat (3) terdiri atas Direktorat Kesiapsiagaan, Pusat Pengendalian Operasi, dan
    Direktorat Fasilitasi Penanganan Korban dan Pengungsi; dua unit terakhir diganti Perban 11/2025. Sumber: idem hlm. 8;
    `program-terbukti/organisasi_bnpb.csv` (status "diganti Perban 11/2025") [`bnpb-2025-otk-ubah`]; mitigasi bab-10 P2 temuan 7.
    **resmi**. Penyajian: lampiran Penyelarasan dokumen BNPB, suara BNPB.
- **T2.4 Pemicu per jenis (mandat tertulis):**
  - *Gunung api:* empat tingkat aktivitas Normal, Waspada, Siaga, Awas (Pasal 1 angka 10); peringatan dini "dikeluarkan oleh
    Kementerian Energi dan Sumber Daya Mineral, disampaikan melalui pemerintah daerah" sesuai prosedur tetap Kepala Badan Geologi;
    pada tingkat Awas masyarakat di KRB I dan II "segera mengungsi berdasarkan perintah dari pemerintah daerah" sesuai rekomendasi teknis
    ESDM; di KRB III, pada Siaga masyarakat tidak boleh beraktivitas dan mulai bersiap mengungsi, pada Awas segera mengungsi; di KRB II
    pada Siaga mulai menyiapkan diri mengungsi sambil menunggu perintah pemda. Ditetapkan dan diundangkan 9 Sep 2011. Sumber: Permen ESDM
    15/2011 Lampiran I angka 4–6, http://jdih.esdm.go.id/common/dokumen-external/permen%20ESDM%2015%202011.pdf (dibuka 24 Okt 2026;
    lapisan teks hasil pindai Adobe Paper Capture, dibaca lewat `pdftotext`, hlm. 5, 8–9) [`esdm-2011-permen15`]; `lembaga/peran.csv`
    R054 (UU 23/2014 Lampiran: penetapan status dan peringatan dini bahaya gunung api). Kunci baru `esdm2011_15.tingkat_aktivitas`.
    **resmi**. Status berlaku Permen ini tidak ditandai pencabutan pada halaman yang dibuka.
  - *Tsunami dan gelombang:* BMKG menyelenggarakan peringatan dini "gelombang laut berbahaya" dan "tsunami" (UU 31/2009, `peran.csv`
    R052, pemetaan penyusun "Badan" = BMKG). InaTEWS: peringatan Palu 2018 terbit sekitar 5 menit setelah gempa, dicabut pukul 17.37 WIB
    karena sensor muka laut terdekat sekitar 200 km (kunci lama `bukti.p03.palu_menit`, `bukti.p03.sensor_km`, mitigasi bab-02)
    [`pantaubencana-2026-program-terbukti`]. **resmi** (mandat), **terverifikasi** (kronologi Palu).
  - *Cuaca ekstrem, kekeringan, karhutla:* BMKG memberi peringatan dini iklim ekstrem, prakiraan musim, dan prakiraan potensi karhutla
    (`peran.csv` R072, R095); karhutla: gubernur dan bupati/wali kota sebagai komandan satuan tugas, BPBD koordinator, BNPB fungsi
    komando pengerahan sumber daya tingkat nasional (Inpres 3/2020; `peran.csv` R094, R100, R101) [`ri-2020-inpres3`]. **resmi**.
    Inpres 3/2020 masih menyebut BPPT dan Menteri LHK (C04, mitigasi bab-10 P1).
  - *Epidemi:* KLB ditetapkan dan dicabut bupati/wali kota, gubernur, atau Menteri (UU 17/2023 Pasal 353); daerah terjangkit wabah
    ditetapkan Menteri (Pasal 368); norma pengait dengan status darurat bencana tidak ditemukan (C09). Sumber: `peran.csv` R110, R111;
    mitigasi bab-08 P1 [`ri-2023-uu17`]. **resmi**.
  - *Konflik sosial:* status keadaan konflik ditetapkan bila konflik "tidak dapat dikendalikan oleh Polri dan terganggunya fungsi
    pemerintahan" (UU 7/2012 Pasal 14), berskala kab/kota, provinsi, nasional (Pasal 15), oleh bupati/wali kota atau gubernur setelah
    konsultasi pimpinan DPRD, atau Presiden (Pasal 16–18; `peran.csv` R130, R131); pendanaan penghentian konflik dan rekonsiliasi dari
    DSP APBN dan/atau BTT APBD (Pasal 55 ayat (1)). Sumber: `lembaga/mentah/teks/uu-7-2012.json.gz` hlm. 10–11, 27 [`ri-2012-uu7`];
    kunci lama `uu7_2012.status_konflik.hari_maks` (mitigasi bab-09). **resmi**.

**Status, keadaan tertentu, dan dana**

- **T2.5 Status keadaan darurat:** ditetapkan pemerintah "atas dasar rekomendasi Badan yang diberi tugas untuk menanggulangi bencana",
  terdiri atas siaga darurat, tanggap darurat, transisi darurat ke pemulihan; siaga darurat "ditandai dengan adanya informasi peningkatan
  ancaman berdasarkan sistem peringatan dini yang diberlakukan dan pertimbangan dampak"; transisi darurat saat ancaman menurun tetapi
  gangguan kehidupan masih berlangsung. Sumber: `perban-nomor-4-tahun-2020.json` hlm. 3 [`bnpb-2020-dsp`]. **resmi**.
- **T2.6 Siapa menetapkan:** tingkat nasional Presiden, provinsi gubernur, kab/kota bupati/wali kota (Perpres 17/2018 Pasal 2 ayat (2);
  PP 21/2008 Pasal 23 ayat (2)). Sumber: `perpres-nomor-17-tahun-2018.json` hlm. 3 [`ri-2018-perpres17`]; riset E §E11(d)
  [`ri-2008-pp21`]. **resmi**.
- **T2.7 Keadaan tertentu (tanpa status atau setelah status berakhir):** Kepala BNPB dapat melaksanakan PB termasuk kemudahan akses
  "setelah mendapatkan keputusan dalam rapat koordinasi antarkementerian/lembaga yang dikoordinasikan oleh menteri koordinator yang
  membidangi koordinasi penyelenggaraan penanggulangan bencana", pada tiga kondisi: potensi bencana dengan tingkat ancaman maksimum;
  telah terjadi evakuasi atau gangguan layanan umum berdampak luas; daerah dalam rekonsiliasi pascakonflik berkapasitas fiskal sangat
  rendah atau rendah (Perpres 46/2026 Pasal 3 ayat (1)–(2), ditetapkan dan diundangkan 16 Juli 2026). Sumber:
  `perpres-nomor-46-tahun-2026.json` hlm. 3–4 [`ri-2026-perpres46`]; kunci lama `perpres46_2026.kondisi_keadaan_tertentu` (mitigasi
  bab-09). **resmi**. Pedoman pelaksananya (ayat (4)) masih Perban 5/2018 yang belum diubah (mitigasi bab-10).
- **T2.8 DSP:** digunakan selama masa keadaan darurat, keadaan tertentu, dan pertimbangan risiko berdampak luas yang ditetapkan Kepala
  BNPB (Perban 4/2020 Pasal 20 ayat (1)); pertanggungjawaban paling lambat 3 bulan setelah status berakhir dengan melampirkan SK status
  (Pasal 21 ayat (2) huruf a). Sumber: idem hlm. 16 [`bnpb-2020-dsp`]; kunci lama `perban2020_4.dsp.*` (air bab-09). **resmi**.

**Tanggap darurat: urutan dan tenggat**

- **T2.9 Penilaian awal (Juklak 4/2023, ditetapkan 6 Nov 2023):** dilakukan masyarakat, relawan, dan petugas lokal untuk mengumpulkan
  informasi awal "sebagai bahan masukan pelaksanaan pengkajian cepat situasi dan kebutuhan" oleh TRC PB multisektor. Sumber:
  `juklak-nomor-4-tahun-2023.json` hlm. 1–2, 5 [`bnpb-2023-juklak-penilaian-awal`]. **resmi**.
- **T2.10 Kaji cepat (Juklak 3/2022, ditetapkan 30 Des 2022):** pada siaga darurat paling lambat 1 × 24 jam setelah informasi tanda-tanda
  mengarah ke bencana diterima; pada tanggap darurat paling lambat 1 × 24 jam setelah informasi awal kejadian; TRC PB bergerak paling
  lambat 1 × 24 jam setelah perintah; laporan awal paling lambat 1 × 24 jam setelah tiba, "disusun untuk memberikan rekomendasi dalam
  penetapan status keadaan darurat bencana" termasuk perkiraan lama status; laporan lanjutan paling lambat 3 × 24 jam setelah tiba untuk
  rencana operasi. Format kebutuhan memakai 15 liter air bersih per orang per hari dan 1 jamban per 20 orang. Sumber:
  `juklak-nomor-3-tahun-2022.json` hlm. 7–8, 16, 18, 25 [`bnpb-2022-juklak-kajicepat`]; kunci baru `juklak2022_3.kaji_cepat_jam`,
  `juklak2022_3.laporan_awal_jam`, `juklak2022_3.laporan_lanjutan_jam`. **resmi**.
- **T2.11 SKPDB (Perka 3/2016):** penanganan darurat dilaksanakan melalui sistem komando "yang diaktivasi berdasarkan penetapan status
  keadaan darurat bencana" (Pasal 3 ayat (1)); dibedakan untuk status kab/kota (satu kab, beberapa kab dalam satu provinsi, beberapa
  kab di beberapa provinsi), provinsi, nasional (ayat (2)); disesuaikan dengan status siaga, tanggap, transisi (ayat (3)); prinsip
  pengutamaan peran kab/kota dengan pendampingan provinsi dan pusat (Pasal 2); pos komando mengkaji kebutuhan berdasarkan kaji cepat dan
  rencana kontingensi serta melakukan kajian awal RR (Pasal 9 ayat (1) huruf a–b). Juklak SKPDB di indeks JDIH hanya Juklak 10/2023
  untuk status kab/kota (ditetapkan 29 Des 2023; berkas tidak tersedia). Sumber: `perka-nomor-3-tahun-2016.json` hlm. 6–10
  [`bnpb-2016-skpdb`]; indeks JDIH [`bnpb-2023-juklak-skpdb`]. **resmi**.
- **T2.12 Penilaian perkembangan:** Juklak 6/2023 (ditetapkan 21 Des 2023) tercatat berlaku di indeks JDIH tanpa berkas. Sumber: indeks
  JDIH [`bnpb-2023-juklak-penilaian-perkembangan`]. **resmi** (metadata saja).
- **T2.13 Pengungsi dalam rantai komando:** pengelolaan data pengungsi terintegrasi ke SKPDB (Perban 3/2018 Pasal 10), dengan prioritas
  data nama, alamat, usia, jenis kelamin, kelompok rentan, kebutuhan dasar (Pasal 12 huruf d); data terpilah diatur Juklak 9/2023
  (judul JDIH "Petunjuk Pelaksanaan Nomor 9 Tahun 2023", ditetapkan 29 Des 2023, berkas tidak tersedia; alamat halamannya memakai kata
  "juknis"). Sumber: `perban-nomor-3-tahun-2018.json` hlm. 8–9 [`bnpb-2018-pengungsi`]; indeks JDIH [`bnpb-2023-juklak-pengungsi-terpilah`].
  **resmi**.

**Transisi sampai RR**

- **T2.14 Jitupasna dan R3P:** Jitupasna (PDNA) memuat penilaian kerusakan, kerugian, dan kebutuhan aspek fisik dan kemanusiaan
  (Perka 15/2011, ditetapkan 8 Des 2011; definisi Jitupasna juga di Perban 6/2017 Pasal 1 angka 6); R3P disusun bersama BNPB/BPBD, K/L,
  perangkat daerah melalui enam tahap (persiapan sampai penetapan), "paling lama 90 (sembilan puluh) hari", dan "dimulai pada saat tanggap
  darurat" (Perban 5/2017 Pasal 2 ayat (1)–(3), ditetapkan 7 Nov 2017); penanggung jawab Kepala BNPB, gubernur, bupati/wali kota menurut
  skala (Pasal 5); isi memuat Jitupasna (Pasal 8–9); jangka waktu R3P paling lama 3 tahun (Pasal 10). Sumber: `perka-nomor-15-tahun-2011.json`
  hlm. 5–7 [`bnpb-2011-jitupasna`]; `perban-nomor-5-tahun-2017.json` hlm. 4–11 [`bnpb-2017-r3p`]; kunci baru `perban2017_5.r3p_hari_maks`,
  `perban2017_5.r3p_masa_tahun`. **resmi**.
- **T2.15 RR dan hibah:** strategi RR meningkatkan koordinasi, menggerakkan sumber daya dan pendanaan, membangun efektivitas dan tata
  kelola (Perban 6/2017 Pasal 7, ditetapkan 27 Des 2017). Pemda calon penerima hibah RR wajib sudah ber-BPBD, punya kebutuhan RR melebihi
  anggaran PB APBD, "telah menyusun dokumen rencana rehabilitasi dan rekonstruksi pascabencana", dan siap menganggarkan perencanaan dan
  pengawasan (Perban 4/2024 Pasal 6 ayat (1), ditetapkan 10 Sep 2024); sembilan tahap dari pengusulan sampai penyetoran sisa dana
  (Pasal 7); usulan tertulis kepala daerah kepada Kepala BNPB (Pasal 8); laporan berkala tiap 3 bulan dan laporan akhir disampaikan
  kepada Kepala BNPB, menteri keuangan, dan menteri dalam negeri (Pasal 28 ayat (2)–(3)). Sumber: `perban-nomor-6-tahun-2017.json` hlm. 7,
  14; `perban-nomor-4-tahun-2024.json` hlm. 5, 11, 14 [`bnpb-2017-rr`, `bnpb-2024-hibah-rr`]; kunci baru `perban2024_4.hibah_tahapan`,
  `perban2024_4.laporan_berkala_bulan`. **resmi**.

**Kelemahan yang dicatat BNPB sendiri**

- **T2.16 Renas hlm. 26–27:** "belum adanya peraturan perundangan dan petunjuk pelaksanaan bagaimana operasional dan pembentukan Tim
  Reaksi Cepat Penanggulangan Bencana (TRC PB) multisektor"; regulasi standar logistik dan peralatan untuk pemda "sudah tidak relevan";
  "kurang optimalnya koordinasi multisektor dalam penerapan" SKPDB; BTT dan DSP belum tersinkronisasi. Renstra hlm. 73: definisi status
  siaga darurat belum jelas; fase tanggap darurat belum terkoordinasi baik. Sumber: `perban-nomor-1-tahun-2025.json` hlm. 26–27
  [`bnpb-2025-renas`]; mitigasi bab-10 P2 temuan 5–6 [`bnpb-2025-renstra`]. **resmi**.

**Kasus berjalan: Sumatra November 2025**

- **T2.17 Garis waktu bersumber:** kejadian banjir dan longsor Aceh, Sumatera Utara, Sumatera Barat mulai 22 Nov 2025 (DIBI); Juklak
  15/2025 DTH khusus tiga provinsi ditetapkan 15 Des 2025; R3P Aceh ditargetkan selesai 20 Des 2025, selesai disusun 27 Des 2025 setelah
  tertunda pergantian pimpinan BPBA, ditandatangani Gubernur 30 Des 2025, dan disampaikan ke BNPB 2 Jan 2026 (35 dan 41 hari setelah
  kejadian, di dalam batas 90 hari Perban 5/2017); Inpres 18/2025 tentang Percepatan Penanganan Darurat, Rehabilitasi, dan Rekonstruksi
  Pascabencana Alam di tiga provinsi ditetapkan 29 Des 2025, dengan Menko Infrastruktur dan Pembangunan Kewilayahan mengoordinasikan
  penyelesaian masalah pembangunan infrastruktur dan pemda diminta berkoordinasi dengan BNPB (ringkasan halaman JDIH); Perban 11/2025
  (OTK baru Deputi Penanganan Darurat) ditetapkan 30 Des 2025. Sumber: `dibi/kejadian_besar.csv` [kode=sumatra2025] [`bnpb-2026-dibi`];
  `juklak-nomor-15-tahun-2025.json` hlm. 8 [`bnpb-2025-juklak15`]; Kemenko PMK, 11 Mar 2026, https://kemenkopmk.go.id/node/6211 (dibuka
  ulang 24 Okt 2026) [`kemenkopmk-2026-r3p-aceh`]; JDIH Kemenko Infrastruktur,
  https://jdih.kemenkoinfra.go.id/inpres-182025-percepatan-penanganan-darurat-rehabilitasi-dan-rekonstruksi-pascabencana-alam-di-provinsi-aceh-provinsi-sumatera-utara-dan-provinsi-sumatera-barat
  (dibuka ulang 24 Okt 2026) [`kemenkoinfra-2026-inpres18`]; `perban-nomor-11-tahun-2025.json` hlm. 14 [`bnpb-2025-otk-ubah`]; kunci baru
  `sumatra2025.r3p_aceh_hari_selesai`, `sumatra2025.r3p_aceh_hari_ke_bnpb`. **resmi**. Teks PDF Inpres 18/2025 tidak dibuka; isi instruksi
  kepada Kepala BNPB tidak diklaim.
  - *Dibantah oleh (sekunder):* ANTARA menulis Aceh menyerahkan dokumen R3P ke BNPB 3 Feb 2026 (https://en.antaranews.com/news/403542,
    tidak dibuka penuh). Tanggal resmi yang dipakai: 2 Jan 2026 (Kemenko PMK).

### Inferensi

- **I2.1 [Inferensi tim] Gambar 11.1 alur langkah berpemicu (urutan yang benar menurut teks):**

  | Tahap | Pemicu | Yang memutus | Instrumen yang terbuka | Tenggat tertulis |
  | --- | --- | --- | --- | --- |
  | 1. Peringatan dini | Data bahaya K/L (BMKG, ESDM, Kemenkes, dan lain-lain) masuk platform | K/L teknis menerbitkan; "pihak yang berwenang" memutus tindakan | Rekomendasi aksi strategis (pokja BNPB) dan teknis (BPBD) | Layanan 24 jam |
  | 2. Penilaian awal | Tanda-tanda bencana atau kejadian | Warga, relawan, petugas lokal | Informasi awal ke BPBD | – |
  | 3. Kaji cepat | Informasi awal | Kepala BPBD menugaskan TRC PB | Laporan awal berisi rekomendasi status | Bergerak 1 × 24 jam; laporan awal 1 × 24 jam setelah tiba; lanjutan 3 × 24 jam |
  | 4. Status siaga atau tanggap darurat | Rekomendasi badan PB | Bupati/wali kota, gubernur, Presiden menurut skala | SKPDB aktif; kemudahan akses Pasal 50; DSP; bantuan kebutuhan dasar | – |
  | 4a. Keadaan tertentu (bila status tidak ditetapkan atau berakhir) | Tiga kondisi Perpres 46/2026 | Kepala BNPB setelah rakor menko pembidang PB | Kemudahan akses; DSP | – |
  | 5. Penilaian perkembangan dan rencana operasi | Laporan lanjutan | Komandan posko | Rencana operasi dari renkon | – |
  | 6. Transisi darurat ke pemulihan | Eskalasi ancaman menurun, gangguan berlanjut | Kepala daerah | DTH, huntara | DTH 3 bulan dan/atau keputusan Kepala BNPB |
  | 7. Jitupasna dan R3P | Dimulai saat tanggap darurat | Kepala BNPB, gubernur, bupati/wali kota | Dokumen R3P | Paling lama 90 hari; R3P berlaku paling lama 3 tahun |
  | 8. RR dan hibah | R3P ditetapkan; kebutuhan melebihi APBD | Kepala daerah mengusulkan; Kepala BNPB | Hibah RR (9 tahap); stimulan rumah DSP | Laporan hibah tiap 3 bulan ke BNPB, Kemenkeu, Kemendagri |

  Pemicu khusus per jenis masuk di tahap 1 dan 4 (gunung api, tsunami, KLB, status konflik; T2.4). Dua jalur paralel yang tidak
  bertaut di norma: status KLB/wabah dan status keadaan konflik.
- **I2.2 [Inferensi tim] Satu kejadian, tiga direktorat.** Rangkaian Sumatra 2025 melintasi Aceh (Direktorat PD Wilayah I), Sumatera
  Utara (Wilayah II), dan Sumatera Barat (Wilayah III) menurut pembagian Perban 11/2025 (P5 T5.1). Perka 3/2016 sudah mengatur kejadian
  "beberapa kabupaten/kota di beberapa provinsi" (T2.11), tetapi OTK tidak menulis direktorat mana yang memimpin pendampingan bila satu
  kejadian melintasi dua atau tiga wilayah. Rumusan yang aman: "pembagian wilayah direktorat belum memuat aturan kejadian lintas
  wilayah"; bukan "komando gagal" (tidak ada evaluasi SKPDB Sumatra yang terbuka, mitigasi bab-10 Celah).
- **I2.3 [Inferensi tim]** Tenggat berangka terkuat di rantai ada di dua ujung: kaji cepat (jam) dan R3P (90 hari). Di tengahnya, status,
  rencana operasi, dan penilaian perkembangan tidak bertenggat di teks yang dibuka. Kasus Aceh menunjukkan tenggat R3P dapat dipenuhi
  (35 hari), sehingga tenggat yang paling perlu ditambah ada di tengah rantai, bukan di ujung.
- **I2.4 [Inferensi tim]** Norma pemicu evakuasi berbasis prakiraan untuk cuaca ekstrem dan banjir tidak ditemukan; yang tertulis hanya
  untuk gunung api (Awas, Permen ESDM 15/2011). Celah kompendium P20 (Odisha) menulis hal yang sama.

### Celah

- Teks Juklak 10/2023 (SKPDB kab/kota), Juklak 6/2023 (penilaian perkembangan), dan Juklak 9/2023 (pengungsi terpilah): JDIH tidak
  menyediakan berkas. **Permintaan:** Biro Hukum, Organisasi, dan Kerja Sama. **Penyajian:** judul dan tanggal saja.
- Prosedur tetap Kepala Badan Geologi tentang penyampaian peringatan gunung api (dirujuk Permen ESDM 15/2011) dan teks Perpres 93/2019
  (InaTEWS) tidak dibuka. **Penyajian:** pemicu tsunami ditulis dari mandat UU 31/2009 tanpa kategori level.
- Isi Inpres 18/2025 terhadap BNPB. **Penyajian:** hanya judul, tanggal, koordinasi infrastruktur, dan kewajiban pemda berkoordinasi
  dengan BNPB seperti ditulis halaman JDIH Kemenko Infra.
- Waktu rata-rata dari kejadian ke penetapan status per kab/kota (indikator yang dapat memeriksa tahap 3–4) tidak ada di DIBI.
  **Permintaan:** Pusdatinkom dan Direktorat Koordinasi Pengendalian Operasi Darurat (arsip SK status).

---

## P3. Apa aksi per fase untuk tiap jenis, dengan kategori bukti?

### Inti

Dari 39 sel matriks (3 fase × 13 jenis lingkup), 28 sel hanya dapat diisi aksi yang diwajibkan peraturan karena tidak ada program
dalam negeri di kompendium; 11 sel punya program dalam negeri, terdiri atas 8 "Program berjalan, wajib evaluasi dampak", 2 "Rujukan
tata kelola", dan 1 "Program dengan syarat (bukti sedang)" (PAMSIMAS untuk kekeringan prabencana). Tidak ada sel dengan program dalam
negeri berbukti kuat; bukti kuat hanya tersedia sebagai padanan luar negeri (Bangladesh untuk cuaca ekstrem dan gelombang, pengendalian
air tanah untuk banjir dan rob). Sel tanggap darurat dan pascabencana paling kosong: masing-masing 11 dari 13 hanya berisi aksi wajib.

### Temuan bersumber

- **T3.1 Baris aksi berpasal:** prabencana dalam situasi tidak terjadi bencana meliputi perencanaan, pengurangan risiko, pencegahan,
  pemaduan dalam perencanaan pembangunan, persyaratan analisis risiko, penegakan tata ruang, pendidikan dan pelatihan, standar teknis
  (UU 24/2007 Pasal 35); situasi berpotensi bencana Pasal 44–47 (T2.1); tanggap darurat Pasal 48 (T2.2); pascabencana Pasal 57–59.
  Sumber: `uu-24-2007.json.gz` hlm. 18, 21–25 [`ri-2007-uu24`]. **resmi**.
- **T3.2 Kompendium:** 25 program; berbukti kuat 2, keduanya luar negeri; program dalam negeri terbaik berbukti sedang (P03 InaTEWS,
  P13 PAMSIMAS). Sumber: `program-terbukti/kompendium_program.csv`; README §4 [`pantaubencana-2026-program-terbukti`]; kunci lama
  `program.kompendium.n`, `program.kompendium.kuat`, `program.kompendium.kuat_dalam_negeri`, `program.kompendium.sedang_dalam_negeri`
  (air bab-07). Label: asumsi-kebijakan (rubrik paket).
- **T3.3 Hitungan Bab 10 (kategori kekuatan, termasuk luar negeri):** 39 sel; tanpa program 20; tanpa kuat atau sedang 24; tanpa kuat
  atau sedang dalam negeri 34; sel kuat luar negeri 5; nonalam dan sosial 12 sel tanpa program. Sumber: mitigasi bab-10 P5; kunci lama
  `mitigasi.sel_program.*`. Label: asumsi-kebijakan.
- **T3.4 Hitungan posisi dalam negeri per sel (rubrik prinsip 12, aturan pemetaan sama dengan Bab 10: rob ke banjir, likuefaksi ke
  gempa; program luar negeri P16–P25 tidak diberi status Indonesia; per sel diambil posisi dalam negeri tertinggi):** aksi wajib
  menurut peraturan saja 28; Program berjalan, wajib evaluasi dampak 8 (gempa prabencana dan tanggap darurat, tsunami prabencana dan
  tanggap darurat, gunung api, banjir, longsor, karhutla prabencana); Rujukan tata kelola 2 (gempa dan tsunami pascabencana: Rekompak P07,
  BRR P08); Program dengan syarat 1 (kekeringan prabencana: PAMSIMAS P13); Program (bukti kuat) dalam negeri 0. Dari 28 sel aksi wajib, 8
  punya padanan luar negeri berbukti kuat atau sedang (banjir tanggap darurat P20; banjir pascabencana P23; cuaca ekstrem tiga fase P19,
  P20, P23; gelombang prabencana dan tanggap darurat P19; kekeringan pascabencana P23). Per fase, sel aksi wajib saja: prabencana 6,
  tanggap darurat 11, pascabencana 11. Kepekaan 15 jenis (rob dan likuefaksi dipisah): 45 sel, aksi wajib saja 33. Sumber: olah dari
  `kompendium_program.csv` kolom `fase`, `bencana`, `kekuatan`, `posisi`, `lokasi`, dihitung ulang 24 Okt 2026; kunci baru
  `mitigasi.sel_posisi.*`. Label: asumsi-kebijakan (draf; dihitung ulang setelah matriks naskah dikunci). Konsisten dengan T3.3:
  28 = 20 sel tanpa program + 8 sel hanya luar negeri.
- **T3.5 Kolom pemicu dan instrumen per jenis:** lihat T2.4–T2.8 (gunung api: tingkat aktivitas ESDM; tsunami dan gelombang: BMKG;
  cuaca ekstrem, kekeringan, karhutla: BMKG, Inpres 3/2020, siaga darurat; epidemi: KLB dan wabah UU 17/2023; konflik: status keadaan
  konflik UU 7/2012 dan keadaan tertentu Perpres 46/2026 Pasal 3 ayat (2) huruf c; kebakaran industri: rezim keselamatan sektoral ESDM,
  Perindustrian, Ketenagakerjaan, mitigasi bab-08 P3; kebakaran TPA: sistem tanggap darurat sampah kab/kota UU 18/2008 Pasal 9, mitigasi
  bab-08 P4). **resmi**.
- **T3.6 Posisi yang wajib dijaga penulis:** InaTEWS "sedang" dari satu kejadian dan berposisi "Program berjalan, wajib evaluasi dampak";
  PAMSIMAS "sedang" dengan bantahan internal (evaluasi DFAT 2023: data MIS terlalu optimistis); Bangladesh "kuat" untuk paket intervensi,
  tidak untuk CPP sendirian (Haque dkk. 2012: dampak terpisah shelter, tanggul, atau penyadaran belum dibuktikan); Odisha "sedang" (dua
  badai berbeda, 1999 lawan 2013). Sumber: `kompendium_program.csv` P03, P13, P19, P20 kolom `kekuatan_catatan`; `bukti_dampak.csv` B117.
  **terverifikasi** (rubrik paket).

### Inferensi

- **I3.1 [Inferensi tim] Draf Tabel 11.2 matriks fase × jenis (39 sel; kategori menurut posisi dalam negeri; pemicu dari T2.4):**

  | Jenis | Pemicu status dan instrumen | Prabencana (aksi; kategori) | Tanggap darurat (aksi; kategori) | Pascabencana (aksi; kategori) |
  | --- | --- | --- | --- | --- |
  | Gempa bumi | Tanpa peringatan; status setelah kaji cepat; informasi gempa BMKG | Tata ruang dan bangunan (Pasal 47), renkon, SPAB/Destana; InaTEWS P03; Berjalan, wajib evaluasi (padanan sedang LN: Kamaishi P21, kode bangunan Chile P22) | Kaji cepat, SKPDB, evakuasi, kebutuhan dasar; P03; Berjalan, wajib evaluasi | DTH, huntara, stimulan, R3P, hibah RR; Rekompak P07, BRR P08; Rujukan tata kelola (Lombok P09 Pelajaran) |
  | Tsunami | Peringatan dini tsunami BMKG; evakuasi mandiri saat guncangan kuat | P03, P01, P02; Berjalan, wajib evaluasi (padanan P21) | P03; Berjalan, wajib evaluasi | P08; Rujukan tata kelola |
  | Letusan gunung api | Tingkat aktivitas ESDM; Awas: mengungsi atas perintah pemda | P01, P02 (belum terbukti); Berjalan, wajib evaluasi | Evakuasi KRB menurut tingkat; Aksi wajib | Aksi wajib (Pasal 58–59) |
  | Banjir dan banjir bandang (dengan rob) | Prakiraan dan peringatan BMKG; RTD bendungan (PP 37/2010); siaga darurat | P04, P11, P12, P14, P15, P01, P02; Berjalan, wajib evaluasi (padanan kuat LN: P16 untuk rob dan amblesan) | Aksi wajib (padanan sedang LN: Odisha P20, padanan Indonesia renkon dan RPKB) | Aksi wajib (padanan sedang LN: P23, padanan Indonesia Dana Bersama dan Asuransi BMN) |
  | Tanah longsor | Peringatan dini pergerakan tanah (Perban 2/2024 Pasal 7) | P01; Berjalan, wajib evaluasi | Aksi wajib | Aksi wajib |
  | Cuaca ekstrem | Peringatan dini cuaca BMKG | Aksi wajib (padanan kuat LN: paket Bangladesh P19; padanan Indonesia relawan, Destana, peringatan dini) | Aksi wajib (padanan kuat LN P19) | Aksi wajib (padanan sedang LN P23) |
  | Gelombang ekstrem dan abrasi | Peringatan gelombang BMKG | Aksi wajib (padanan kuat LN P19) | Aksi wajib (padanan kuat LN P19) | Aksi wajib |
  | Kekeringan | Prakiraan musim kemarau, PDKM BMKG, siaga darurat | PAMSIMAS P13; Program dengan syarat (bukti sedang); P04, P10 Berjalan | Air bersih 7 lalu 15 liter (Pasal 53; Perka 7/2008); Aksi wajib | Aksi wajib (padanan sedang LN P23) |
  | Karhutla | Siaga darurat; satgas Inpres 3/2020 | P06, P01 Berjalan, wajib evaluasi; P05 Uji coba terukur | Pemadaman, OMC (Renas 1.2.1.h); Aksi wajib | Aksi wajib |
  | Epidemi dan pandemi | KLB, wabah (UU 17/2023); darurat bencana nonalam | Aksi wajib | Aksi wajib | Aksi wajib |
  | Kebakaran industri | Rezim keselamatan sektoral; status bila ditetapkan | Aksi wajib | Aksi wajib | Aksi wajib |
  | Kebakaran TPA | Sistem tanggap darurat sampah kab/kota (UU 18/2008) | Aksi wajib | Aksi wajib | Aksi wajib |
  | Kerusuhan dan konflik sosial | Status keadaan konflik (UU 7/2012); keadaan tertentu rekonsiliasi (Perpres 46/2026) | Aksi wajib | Aksi wajib (DSP/BTT Pasal 55) | Aksi wajib |

  Kalimat naskah yang aman: "28 dari 39 sel diisi aksi yang diwajibkan peraturan; 11 sel bertumpu pada program dalam negeri, dan hanya
  satu di antaranya berposisi Program dengan syarat." Program luar negeri ditulis "Padanan di Indonesia: <program>" beserta status
  padanannya (prinsip 12).
- **I3.2 [Inferensi tim]** Strategi tiap sel "aksi wajib" adalah menjalankan aksi berpasal dengan ukuran hasil, bukan memperluas program.
  Sesuai P6, perluasan hanya diusulkan untuk posisi kuat dan sedang; delapan sel "Berjalan, wajib evaluasi" mendapat rekomendasi evaluasi
  dampak (Bahan 11.10 untuk Destana, SPAB, InaTEWS; Kajian 1 Tabel 8.6 untuk program air), bukan klaim keberhasilan.
- **I3.3 [Inferensi tim]** Tanggap darurat dan pascabencana yang kosong bukti bukan berarti operasinya tidak berjalan; dampaknya belum
  pernah diukur dengan cara yang dapat dikutip (sama dengan mitigasi bab-10 Inferensi).

### Celah

- Pemetaan sel adalah pilihan penyusun; berkas data sel belum ada di paket. **Usul (sama dengan Bab 10):** `program-terbukti/sel_mitigasi.csv`
  ditulis pemilik paket supaya DOCX, PPTX, dan web identik.
- Kompendium tidak memuat program evakuasi gunung api berbasis status (Merapi 2010; Surono dkk. 2012, riset E16) atau peringatan dini longsor.

---

## P4. Apa yang dikerjakan BNPB saat kemarau dan saat musim hujan, termasuk 2026/2027?

### Inti

Kalender DIBI 2008–2025 menunjukkan musim hujan bukan satu kalender nasional: kejadian banjir, longsor, dan cuaca ekstrem menumpuk
November–April di Bali dan Nusa Tenggara (84,9%) dan Jawa (75,8%), lebih merata di Sumatera, Kalimantan, Sulawesi, dan Papua (57–61%),
dan memuncak Juni–Juli di Maluku; kekeringan dan karhutla menumpuk Juni–Oktober (Jawa 92,7%), dengan puncak kedua karhutla
Februari–Maret di Sumatera. Gelombang dan rob di Jawa tercatat lebih banyak Mei–Agustus, tetapi pola itu berasal dari beberapa episode
(tanpa Juli 2018 porsi gelombang Mei–Agustus 42,9%, di bawah November–April 44,2%; rob hanya tercatat 2020–2023 dan 2025), jadi belum
menjadi dasar perubahan kalender. Untuk 2026/2027 BMKG memprakirakan awal musim
hujan mundur di 529 ZOM, dengan puncak Desember di sebagian besar Sumatera dan Kalimantan tetapi Januari–Februari 2027 di Jawa, Bali,
Nusa Tenggara, dan Papua, sementara kemarau 2026 masih berjalan (peringatan kekeringan Awas di 22 provinsi pada dasarian II Oktober).
Rencana Aksi Musim Hujan 2026/2027 karena itu harus berurutan per wilayah dan direktorat, dengan lantai Kartu 7.1 (1.692 meninggal dan
hilang) sebagai skenario terburuk dan Kartu 7.2 (199–373) sebagai ekspektasi, bukan satu tanggal nasional.

### Temuan bersumber

**Kalender bahaya tercatat per pulau (DIBI 2008–2025)**

- **T4.1 Porsi kejadian musim hujan (banjir, banjir bandang, banjir dan longsor, longsor, cuaca ekstrem) per pulau:**

  | Pulau | Kejadian | Porsi November–April | Tiga bulan teratas (porsi kejadian) | Porsi meninggal dan hilang November–April |
  | --- | --- | --- | --- | --- |
  | Bali dan Nusa Tenggara | 2.705 | 84,9% | Januari 26,1%, Februari 21,0%, Maret 12,1% | 82,3% (April 31,7%, Seroja 2021) |
  | Jawa | 24.135 | 75,8% | Februari 16,2%, Januari 15,8%, Maret 13,0% | 75,4% |
  | Sumatera | 9.695,5 | 60,6% | Januari 12,0%, Maret 10,3%, Desember 10,2% | 81,0% (November 52,6%, Sumatra 2025) |
  | Kalimantan | 3.166 | 60,4% | Januari 13,9%, Maret 11,3%, Mei 9,8% | 52,2% |
  | Papua | 331 | 58,3% | Februari 14,5%, Maret 12,1%, April 11,5% | 44,0% (Oktober 39,7%, Wasior 2010) |
  | Sulawesi | 4.581 | 56,8% | Januari 13,6%, Februari 10,8%, Maret 10,5% | 57,4% (Juli 19,8%) |
  | Maluku | 777 | 41,6% | Juni 18,7%, Juli 14,2%, Mei 12,4% | 13,5% (Juni–Oktober 74,4%) |

  Sumber: `skenario-hidromet/kalender_bulanan_pulau.csv` (per tanggal kejadian 2008–2025; `n_tahun` per sel pulau-bulan-jenis paling
  banyak 18 untuk banjir, longsor, cuaca ekstrem, 16 gelombang_abrasi, 15 kekeringan dan karhutla, 6 banjir_longsor, 5 banjir_bandang
  dan rob; `bangun/skenario-hidromet.py` fungsi `turunan_dibi`), dijumlah ulang penyusun bukti 24 Okt 2026 [`bnpb-2026-dibi`]; kunci baru `hidromet.kalender.<pulau>.hujan_kejadian_porsi_nov_apr`,
  `hidromet.kalender.maluku.hujan_kejadian_porsi_jun_okt`, `hidromet.kalender.maluku.hujan_mh_porsi_jun_okt`. Label: olah(resmi). Pola
  tercatat dipengaruhi intensitas pelaporan (catatan skrip paket); porsi meninggal didominasi satu kejadian besar per pulau, jadi waktu
  operasi dibaca dari porsi kejadian.
  - *Patahan seri (KERANGKA §2 butir 7, berlaku T4.1–T4.3):* di `riset/mentah/dibi_hidromet.json` jenis "Banjir Bandang", "Banjir dan
    Tanah Longsor", "Banjir Rob", "Puting Beliung", dan "Angin Kencang" baru muncul sejak 2018, dan 2024 tidak lengkap untuk longsor,
    banjir bandang, banjir dan longsor, rob, cuaca ekstrem (`TAHUN_TAK_LENGKAP` skrip paket). Porsi lima jenis musim hujan karena itu
    menggabungkan jenis berseri 18 tahun dengan jenis berseri 6–7 tahun; porsi dibaca sebagai pola tercatat, bukan seri seragam.
- **T4.2 Porsi kejadian kemarau (kekeringan dan karhutla) Juni–Oktober:** Jawa 92,7% (puncak September 27,0%); Bali dan Nusa Tenggara
  89,2%; Sulawesi 82,6% (September 40,3%); Kalimantan 75,2% (Agustus–September 47,0%); Sumatera 67,4% dengan Februari–Maret 19,1%
  (karhutla Riau di awal tahun). Nasional (mitigasi bab-07): kekeringan 84% kejadian Juni–September, karhutla 69% Juli–Oktober. Sumber:
  idem; kunci lama `hidromet.nasional.kalender.porsi_kekeringan_jun_sep` (mitigasi bab-07); kunci baru `hidromet.kalender.jawa.kemarau_kejadian_porsi_jun_okt`,
  `hidromet.kalender.kalimantan.kemarau_kejadian_porsi_jun_okt`, `hidromet.kalender.sumatera.kemarau_kejadian_porsi_jun_okt`,
  `hidromet.kalender.sumatera.kemarau_kejadian_porsi_feb_mar`. Label: olah(resmi).
- **T4.3 Gelombang ekstrem, abrasi, dan rob (kolom `jenis` = `gelombang_abrasi` dan `rob` di berkas yang sama):** gelombang dan abrasi
  585 kejadian, nasional 61,5% November–April (Januari 21,0%); Sulawesi 80,0%, Papua 85,0%, Kalimantan 77,3% di November–April;
  Sumatera 45,5% November–April lawan 39,6% Mei–Agustus. Jawa: 95 kejadian di 16 tahun (2008–2025 tanpa 2010 dan 2023), 35,8%
  November–April lawan 53,7% Mei–Agustus (Juli 22,1%, Juni 15,8%), tetapi 18 dari 95 kejadian jatuh pada Juli 2018 saja.
  - *Per tahun (Jawa, kejadian Mei–Agustus/November–April dari jumlah):* 2013 9/0 dari 13, 2016 7/1 dari 12, 2018 19/2 dari 21;
    13 tahun lain bersama 16/31 dari 49 (2012 0/6, 2021 2/6, 2020 4/4).
  - *Uji tanpa satu tahun (leave-one-year-out):* tanpa 2018, Mei–Agustus 43,2% (32/74) sama dengan November–April 43,2%; tanpa Juli
    2018 saja, 42,9% (33/77) lawan 44,2% (34/77). Tanpa tahun lain mana pun porsi Mei–Agustus 51,2–57,3%. "Puncak" Mei–Agustus Jawa
    bergantung pada satu episode.
  - Rob 230 kejadian nasional. Jawa 98,5 kejadian (pecahan karena satu rekaman bisa dibagi antar-kab), tercatat hanya di 2020, 2021,
    2022, 2023, dan 2025 (2025: 1 kejadian): 68,0% Mei–Agustus (Mei 31,5%, Juni 29,4%). Dari 60 kejadian Mei–Juni, 20 berasal dari Juni
    2020 dan 18 dari Mei 2022. Per tahun Mei–Agustus/jumlah: 2020 24/26, 2021 5/20,5 (November–April 15,5), 2022 30/42, 2023 7/9.
    Tanpa satu tahun porsi Mei–Agustus 59,3–79,5%, tetapi dasarnya empat tahun efektif. Sulawesi seluruhnya Desember–Februari.
  Sumber: idem dan `riset/mentah/dibi_hidromet.json` (provinsi Jawa: DKI Jakarta, Jawa Barat, Banten, Jawa Tengah, DIY, Jawa Timur;
  tanggal `dt` dibaca WIB seperti skrip paket), dijumlah ulang 24 Okt 2026 dan diuji ulang per tahun 24 Okt 2026; kunci baru
  `hidromet.kalender.gelombang.nasional_porsi_nov_apr`, `hidromet.kalender.jawa.gelombang_porsi_mei_agu`,
  `hidromet.kalender.jawa.rob_porsi_mei_agu`. Label: olah(resmi); jumlah kejadian kecil per pulau (Papua 20, Kalimantan 44, Jawa
  gelombang 95, Jawa rob 98,5 dalam 5 tahun); rob dan sebagian jenis di balik patahan kategori 2018.
- **T4.4 Kalender nasional musim hujan (semua pulau, meninggal dan hilang):** November 21,6% (dipengaruhi kuat Sumatra 2025), Januari
  12,3%, Maret 11,1%. Sumber: kunci lama `hidromet.nasional.kalender.porsi_mh_november` (mitigasi bab-07). **olah(resmi)**.

**Pemicu musim 2026/2027**

- **T4.5 Prakiraan BMKG per wilayah (siaran pers 22 Sep 2026):**

  | Wilayah | Awal musim hujan | Puncak musim hujan |
  | --- | --- | --- |
  | Sumatera | November: sebagian Sumatera; Desember: sebagian Lampung | Desember: sebagian besar Sumatera; Januari: Riau bagian selatan, Kepri bagian tengah, Lampung bagian utara; Februari: Lampung bagian tengah |
  | Jawa | November: sebagian; Desember: sebagian besar | Januari: sebagian; Februari: sebagian besar |
  | Bali | November: sebagian; Desember: sebagian besar | Januari: Bali bagian tengah; Februari: sebagian besar |
  | Nusa Tenggara | November: sebagian NTB, sebagian kecil NTT; Desember: sebagian besar NTB dan NTT | Januari: NTB bagian barat, sebagian NTT; Februari: sebagian NTB, sebagian besar NTT |
  | Kalimantan | November: sebagian; Desember: sebagian Kalimantan Selatan | Desember: sebagian besar; Januari: sebagian besar Kalimantan Tengah, sebagian Kalimantan Barat |
  | Sulawesi | November: sebagian; Desember: sebagian besar | Desember: sebagian besar Sulawesi Barat, sebagian Sulawesi Utara dan Sulawesi Tengah; Januari: sebagian; Februari: Sulawesi Barat bagian selatan, sebagian Sulawesi Selatan, Sulawesi Tenggara bagian selatan |
  | Maluku | November: sebagian Maluku dan Maluku Utara; Desember: sebagian Maluku | Desember: sebagian kecil Maluku; Januari: Maluku bagian barat, sebagian kecil Maluku Utara; Februari: sebagian Maluku |
  | Papua | November: Papua Barat bagian utara, sebagian Papua Selatan; Desember: Papua Selatan bagian selatan | Desember: Papua Barat Daya bagian barat, Papua bagian utara, Papua Selatan bagian barat; Januari: sebagian; Februari: sebagian besar |

  Nasional: awal mundur di 529 ZOM (61,08%); awal November 185 ZOM, Desember 266 ZOM; puncak Desember 155 ZOM, Januari 162, Februari 190;
  sifat atas normal 147 ZOM (18,55%); durasi lebih pendek di 482 ZOM. Sumber: BMKG, https://www.bmkg.go.id/siaran-pers/bmkg-el-nino-sangat-kuat-sedang-terjadi-musim-hujan-2026-2027-diprediksi-datang-lebih-lambat
  (dibuka ulang 24 Okt 2026) [`bmkg-2026-siaran-musim-hujan`]; kunci lama `bmkg.musim_2026.*` (air bab-01; mitigasi bab-07). **resmi**.
  Subtotal ZOM per kategori tidak saling menjumlah; kutip per kategori (riset E §E9).
- **T4.6 ENSO, IOD, dan kekeringan berjalan:** indeks ENSO ASO +3,08 (sangat kuat), IOD +0,703; peringatan dini kekeringan meteorologis
  dasarian II Oktober kategori Awas di sebagian kab/kota pada 22 provinsi (BMKG 13 Okt 2026); NOAA CPC 8 Okt 2026: El Niño kuat sampai
  sangat kuat kemungkinan bertahan sampai Januari–Maret 2027. Kemarau 2026 (DIBI sementara s.d. 23 Okt): kekeringan 122 kejadian,
  1.949.544 terdampak; karhutla 1.024 kejadian. Sumber: mitigasi bab-07 P2 butir 2, 3, 5 [`bmkg-2026-dinamika-okt1`,
  `noaa-cpc-2026-ensodisc`, `bnpb-2026-dibi`]; kunci lama `bmkg.dasarian_okt1_2026.enso_aso`, `bmkg.pdkm_okt2_2026.prov_awas_nasional`,
  `dibi.nasional.kekeringan.terdampak.2026`, `dibi.nasional.karhutla.kejadian.2026`. **resmi** (BMKG, DIBI), **terverifikasi** (CPC).
- **T4.7 Kartu agregat operasional 7.1 dan 7.2 (dasar skenario Rencana Aksi, KERANGKA §5 Bab 11 dan V05/V08):** Kartu 7.1 musim hujan
  tercatat terburuk nasional 2025/2026: 1.506 meninggal, 186 hilang, 1.043.740 mengungsi (jumlah semusim, cakupan semua laporan),
  Sumatra November 2025 1.202 meninggal dan 140 hilang; Kartu 7.2 musim hujan dengan El Niño kuat (2009/10 373, 2015/16 199, 2023/24
  246 meninggal dan hilang) sebagai ekspektasi operasional, sedangkan skenario terburuk 2026/2027 tetap lantai 1.692. Sumber:
  `skenario-hidromet/kartu_skenario.csv` (`musim_hujan_lantai`, `musim_hujan_pasca_elnino`), `musim_hujan.csv` [wilayah=nasional,
  tahun_awal=2025]; mitigasi bab-07 P1–P2; registri `hidromet.nasional.lantai.meninggal_hilang`, `hidromet.nasional.pasca_elnino.n_musim`;
  kunci lama `hidromet.nasional.musim_2025.mengungsi` (mitigasi bab-03), `hidromet.nasional.pasca_elnino.meninggal_hilang_*` (mitigasi
  bab-07). **resmi**.
  - *Angka berdampingan:* 1.043.740 mengungsi adalah jumlah semusim; puncak serentak 30 hari nasional musim itu 981.483 (P5 T5.2).
    Definisi berbeda, bukan konflik sumber.
- **T4.8 Lantai kemarau:** kekeringan terdampak terbesar nasional 2018 (7.798.763; Jawa saja 4.924.057, Kajian 1), karhutla luas terbesar
  2015 (2.611.411,44 ha). Sumber: mitigasi bab-07 P2 butir 6, 12; kunci lama `hidromet.nasional.kekeringan.dibi_terdampak_2018`,
  `sipongi.karhutla2015.luas_ha`. **resmi**.

**Unit dan instrumen per tahap**

- **T4.9 Unit OTK berlaku:** Deputi Bidang Pencegahan (Direktorat Mitigasi Bencana, Kesiapsiagaan, Peringatan Dini); Deputi Bidang
  Penanganan Darurat (Direktorat Koordinasi Pengendalian Operasi Darurat; Direktorat PD Wilayah I, II, III; Pasal 70–79C Perban 6/2025
  sebagaimana diubah Perban 11/2025); Deputi Bidang Logistik dan Peralatan; Deputi Bidang Rehabilitasi dan Rekonstruksi (tiga direktorat
  sektor); Deputi Bidang Sistem dan Strategi; Pusdatinkom; Pusdiklat PB. Sumber: `program-terbukti/organisasi_bnpb.csv`;
  `perban-nomor-11-tahun-2025.json` hlm. 3–7 [`bnpb-2025-otk`, `bnpb-2025-otk-ubah`]. **resmi**.
- **T4.10 Instrumen prabencana musiman:** renkon berlaku 3 tahun dan direviu paling sedikit 6 bulan sekali, diuji lewat latihan sampai
  geladi (Perban 2/2023 Pasal 19, 21); RPKB daerah diuji lewat gladi ruang (Perban 9/2025 Pasal 27); SPM sub-urusan bencana Juklak 4–7/2026.
  Sumber: air bab-08 T2.9 [`bnpb-2023-renkon`, `bnpb-2025-rpkb`, `bnpb-2026-juklak-gladi`]; kunci lama `perban2023.renkon.*`. **resmi**.
- **T4.11 OMC:** Renas 1.2.1.h pembinaan dan pengawasan operasi penanggulangan kedaruratan karhutla, banjir, kekeringan, longsor (termasuk
  modifikasi cuaca), target 950 hari operasi, PJ BMKG, Kementerian Kehutanan, BNPB; fungsi modifikasi cuaca di BMKG (Perpres 12/2024).
  Sumber: air bab-08 T2.14 [`bnpb-2025-renas`, `ri-2024-perpres12-bmkg`]; kunci lama `renas.aksi_121h.hari_operasi_2029`. **resmi**.
- **T4.12 Keputusan 14 hari pertama (kandidat KERANGKA §6):** penetapan hari ke-0 dan penugasan unit; penyampaian prakiraan ke BPBD dengan
  permintaan pemutakhiran renkon banjir dan longsor dan uji rantai peringatan dini; permintaan data operasional kemarau 2026;
  inventarisasi logistik per Direktorat PD Wilayah; surat ke Kemenko PMK untuk rakor peninjauan Renas; penugasan catatan metode IRBI 2025;
  penugasan pemuatan rekomendasi ke evaluasi tahunan Renas 2026. Sumber: `KERANGKA.md` §6. Label: asumsi-kebijakan (usulan kajian);
  instrumen tiap butir **resmi** (T2.3, T4.10).

### Inferensi

- **I4.1 [Inferensi tim] Draf Gambar 11.3 kalender Rencana Aksi Musim Hujan 2026/2027 tingkat nasional (hanya instrumen berlaku; urut
  menurut puncak BMKG):**

  | Bulan | Wilayah yang memasuki puncak (BMKG) | Pusat | Direktorat PD Wilayah dan daerah |
  | --- | --- | --- | --- |
  | November 2026 (hari ke-0 sampai ke-30) | Awal musim di sebagian semua pulau; kemarau masih berjalan di 22 provinsi berstatus Awas kekeringan | Keputusan 14 hari; penyampaian prakiraan; permintaan reviu renkon (Perban 2/2023 Pasal 21); inventarisasi logistik terhadap Tabel 11.4 | Wilayah I (Aceh, Riau, Kalimantan Tengah, Kalimantan Utara), II (Sumatera Utara, Jambi, Sumatera Selatan, Kalimantan Timur), III (Sumatera Barat, Bengkulu, Kalimantan Barat, Kalimantan Selatan): siaga lebih dulu karena puncak Desember; penutupan operasi kekeringan |
  | Desember 2026 | Puncak sebagian besar Sumatera, Kalimantan, Sulawesi Barat, sebagian Sulawesi Utara dan Tengah; awal sebagian besar Jawa, Bali, NTB, NTT, Sulawesi | Uji rantai peringatan dini (Perban 2/2024 Pasal 2 ayat (3) huruf d–g); kesiapan pengerahan Direktorat Koordinasi Pengendalian Operasi Darurat | Tanggap darurat bila status; gladi posko atau ruang di provinsi Jawa, Bali, Nusa Tenggara, Sulawesi (Juklak 4/2026) |
  | Januari–Februari 2027 (hari ke-100 jatuh di sini bila hari ke-0 November) | Puncak Jawa, Bali, Nusa Tenggara, Papua, sebagian Sulawesi dan Maluku | SKPDB pendampingan; DSP bila status | Wilayah I (Jawa Tengah, DIY, Bali, Papua), II (DKJ, Banten, Jawa Barat, NTB), III (Jawa Timur, NTT, Sulawesi Selatan): puncak; transisi dan R3P di wilayah yang memuncak Desember |
  | Maret–April 2027 | Akhir musim di sebagian besar barat; Maluku memasuki musim bahaya tercatat Mei–Juli | Kajian cepat musim berjalan untuk Kesiapan Kemarau 2027 | Rehabilitasi; Maluku dan Maluku Utara (Wilayah III dan I) menyiapkan renkon banjir dan longsor untuk Mei–Juli |

- **I4.2 [Inferensi tim] Hari ke-0 November terlambat untuk Sumatera dan Kalimantan.** Wilayah yang memuncak Desember hanya punya sekitar
  30 hari prabencana setelah hari ke-0; argumen waktu untuk KD-1 opsi (a) lebih kuat dibaca per wilayah. Ini argumen waktu, bukan angka
  korban baru.
- **I4.3 [Inferensi tim] Maluku perlu kalender sendiri.** Bahaya musim hujan tercatat di Maluku memuncak Juni–Juli, berlawanan dengan Jawa;
  Rencana Aksi Musim Hujan nasional yang berhenti April akan melewatkan musim bahaya Maluku. Kalender berpemicu 2028–2030 (prinsip 11)
  sebaiknya per pulau.
- **I4.4 [Inferensi tim] Gelombang dan rob Jawa Mei–Agustus: pola dari beberapa episode, belum dasar perubahan kalender.** Porsi
  gelombang Jawa Mei–Agustus (53,7%) hilang bila Juli 2018 disisihkan (42,9% lawan 44,2% November–April); rob Jawa (68,0%) hanya
  tercatat di empat tahun efektif 2020–2023 dan dua episode (Juni 2020, Mei 2022) menyumbang 38 dari 60 kejadian Mei–Juni (T4.3).
  Karena itu Gambar 11.2 tidak dirombak: gelombang tetap di panel musim hujan sesuai KERANGKA 11.5, rob ditampilkan sebagai baris
  terpisah berpil "5 tahun data, patahan 2018", dan Kesiapan Kemarau 2027 tidak memuat renkon rob atas dasar ini. Perubahan panel baru
  dipertimbangkan sesudah uji kepekaan dengan seri lebih panjang (misalnya peringatan gelombang tinggi BMKG atau rob per stasiun pasang
  surut), bukan dari DIBI saja.
- **I4.5 [Inferensi tim] Draf Tabel 11.3 operasi musiman (pemicu, aksi, unit):**

  | Musim | Pemicu | Aksi prabencana | Aksi saat status | Unit BNPB; K/L |
  | --- | --- | --- | --- | --- |
  | Kemarau | Prakiraan musim kemarau BMKG; PDKM Waspada, Siaga, Awas; titik panas dan prakiraan potensi karhutla; status ENSO | Reviu renkon kekeringan dan karhutla; patroli dan pembasahan; persiapan OMC (Renas 1.2.1.h) | Siaga darurat; air bersih 7 lalu 15 liter per orang per hari; satgas karhutla (Inpres 3/2020); DSP | Direktorat Kesiapsiagaan, Peringatan Dini; Direktorat PD Wilayah; Deputi Logistik; BMKG, Kemenhut, KLH, pemda |
  | Musim hujan | Prakiraan awal dan puncak per ZOM; peringatan dini cuaca ekstrem; status IOD dan ENSO; RTD bendungan | Reviu renkon banjir dan longsor; uji rantai peringatan dini; gladi; inventarisasi logistik | Siaga dan tanggap darurat; SKPDB; kebutuhan dasar; DSP; R3P dimulai | Direktorat Peringatan Dini, Kesiapsiagaan; Direktorat Koordinasi Pengendalian Operasi Darurat dan PD Wilayah; Deputi Logistik; Deputi RR; BMKG, Kementerian PU, Badan Geologi, Basarnas, Kemensos |
  | Kesiapan Kemarau 2027 | Prakiraan musim kemarau 2027 BMKG (belum terbit); CPC: El Niño bertahan sampai Januari–Maret 2027 | Lantai: 7.798.763 terdampak kekeringan (2018) dan 2.611.411,44 ha karhutla (2015); renkon karhutla Sumatera disiapkan sebelum Februari | Sama dengan kemarau | Sama dengan kemarau |

### Celah

- Tabel prakiraan per ZOM dan tumpang susun ZOM ke kab/kota (KERANGKA §7 butir 35). **Permintaan:** BMKG (Kedeputian Klimatologi).
  **Penyajian:** tingkat wilayah dengan kata BMKG "sebagian" dan "sebagian besar".
- Kalender tidak memuat kebakaran TPA (DIBI tanpa jenis) dan kebakaran permukiman (di luar lingkup P11, hanya konteks); baris kebakaran
  gedung dan permukiman juga tidak ikut ditarik ke `dibi_hidromet.json`. **Penyajian:** catatan di Gambar 11.2, tanpa angka bulanan.
- Prakiraan musim kemarau 2027 BMKG belum terbit; Kesiapan Kemarau 2027 memakai lantai tercatat.
- Status renkon banjir, longsor, dan rob per kab/kota (tanggal penetapan, reviu terakhir). **Permintaan:** BPBD provinsi lewat Direktorat
  Kesiapsiagaan.

---

## P5. Berapa kebutuhan respons skenario terburuk per Direktorat Penanganan Darurat Wilayah?

### Inti

Dengan lantai = angka terbesar di antara pengungsi tercatat DIBI dalam satu jendela 30 hari dan, untuk gempa, penghuni rumah rusak
berat dan sedang tercatat × 3,9 (definisi KERANGKA prinsip 9), di provinsi wilayah kerja tiap direktorat 2008–2025, kebutuhan respons
perencanaan adalah Wilayah I 954.305 jiwa (banjir dan longsor Aceh, November 2025), Wilayah II 468.967 jiwa (banjir Jabodetabek, Januari
2020) atau 425.233 bila rekaman Kota Bekasi yang diragukan disisihkan (gempa Lombok 2018), dan Wilayah III 464.120 jiwa (gempa Sumatera
Barat 2009, dari rumah rusak berat; pengungsi tercatat DIBI-nya hanya 6.554, dan pengungsi tercatat terbesar Wilayah III adalah gempa
Ambon 2019, 230.965). Kejadian pra-DIBI dalam periode acuan geologi 30 tahun ditulis berdampingan dengan definisi lain (kehilangan rumah,
bukan pengungsi tercatat): Yogyakarta 2006 di Wilayah I (600.000 sampai 1 juta, Bappenas), yang batas atasnya 4,8% di atas lantai, dan
tsunami 2004 (635.384 untuk Aceh dan Nias, tidak terpilah; Aceh di Wilayah I, Nias di Wilayah II). Dengan standar Perka 7/2008, lantai
Wilayah I setara 381,7 ton beras, 2,39 juta liter air minum, dan 47.715 jamban per hari; angka ini batas atas pengungsi serentak karena
DIBI menjumlah pengungsi per kejadian (Aceh: DIBI 946.889 lawan Buletin BNPB 356.655, ditulis berdampingan). Bila Aceh dihitung dengan stok
Buletin, lantai Wilayah I menurut definisi pengungsi tercatat turun ke 447.982 (erupsi Merapi 2010); memilih tidak merencanakan di bawah
baris kehilangan rumah pra-2008 adalah pilihan kebijakan tim, bukan akibat data.

### Temuan bersumber

**Wilayah kerja**

- **T5.1 Pembagian provinsi:** Wilayah I 13 provinsi (Aceh, Riau, Kepulauan Riau, Jawa Tengah, DIY, Bali, Kalimantan Tengah, Kalimantan
  Utara, Sulawesi Tenggara, Sulawesi Tengah, Maluku Utara, Papua, Papua Selatan; Pasal 74); Wilayah II 13 provinsi ditambah Daerah Ibu
  Kota Nusantara (Sumatera Utara, Jambi, Sumatera Selatan, Lampung, DKJ, Banten, Jawa Barat, NTB, Kalimantan Timur, Sulawesi Utara,
  Gorontalo, Papua Barat, Papua Tengah; Pasal 77); Wilayah III 12 provinsi (Bengkulu, Sumatera Barat, Bangka Belitung, Jawa Timur,
  Kalimantan Barat, Kalimantan Selatan, Sulawesi Selatan, Sulawesi Barat, NTT, Maluku, Papua Barat Daya, Papua Pegunungan; Pasal 79A).
  Direktorat Koordinasi Pengendalian Operasi Darurat menyusun kebijakan teknis, NSPK, dan pemantauan pengendalian operasi (Pasal 71–72).
  Sumber: `perban-nomor-11-tahun-2025.json` hlm. 4–7 (ditetapkan 30 Des 2025); `program-terbukti/organisasi_bnpb.csv`
  [`bnpb-2025-otk-ubah`]; kunci baru `respons.direktorat.w1.n_prov`, `respons.direktorat.w2.n_prov`, `respons.direktorat.w3.n_prov`.
  **resmi**.

**Pengungsi tercatat puncak (DIBI 2008–2025, jendela 30 hari bergeser, semua provinsi satu direktorat dijumlah serentak)**

- **T5.2 Hidrometeorologi (banjir, banjir bandang, banjir dan longsor, longsor, cuaca ekstrem):**
  - Wilayah I: 954.305 (6 Nov–5 Des 2025; Aceh 946.889, 99,2%; Aceh Utara 304.631, Aceh Tamiang 262.087, Aceh Timur 204.867).
  - Wilayah II: 468.967 (31 Des 2019–29 Jan 2020; Jawa Barat 397.484, di antaranya Kota Bekasi 366.274 = 78,1% jendela); tanpa rekaman
    Kota Bekasi 31 Des 2019–10 Jan 2020: 338.360 (1–30 Jan 2014; Karawang 182.837, DKI 80.600, Kota Manado 40.000).
  - Wilayah III: 180.213 (6 Jan–4 Feb 2021; Kalimantan Selatan 177.432).
  - Nasional serentak: 981.483 (7 Nov–6 Des 2025).
  - Menambah gelombang dan rob tidak mengubah puncak (selisih ≤ 18 jiwa).

  Sumber: `riset/mentah/dibi_hidromet.json` (58.992 baris per tanggal-kab-jenis, tarik 23 Okt 2026; pemetaan jenis dari kunci `jenis`
  berkas itu), provinsi ke direktorat dari Perban 11/2025 (T5.1), dihitung ulang penyusun bukti 24 Okt 2026 dengan tanggal stempel `dt`
  dibaca UTC [`bnpb-2026-dibi`]; kunci baru `respons.w1.hidromet_puncak30`, `respons.w2.hidromet_puncak30`,
  `respons.w2.hidromet_puncak30_tanpa_bekasi2020`, `respons.w2.porsi_kota_bekasi2020`, `respons.w3.hidromet_puncak30`,
  `respons.nasional.hidromet_puncak30`. Label: olah(resmi); jendela 30 hari **asumsi-kebijakan**. Kepekaan zona waktu: bila `dt` dibaca
  WIB, Wilayah I 954.315, Wilayah III 180.247, nasional 981.477 (selisih ≤ 34 jiwa). Rekaman Kota Bekasi Januari 2020 tidak terbukti
  (KERANGKA §7 butir 15), jadi uji kepekaan dengan dan tanpa rekaman itu wajib.
- **T5.3 Geologi (gempa, tsunami, erupsi), DIBI 2008–2025, dua definisi berdampingan:**

  | Direktorat | Pengungsi tercatat DIBI terbesar | Penghuni rumah RB + RS tercatat × 3,9 terbesar (gempa) | Catatan |
  | --- | --- | --- | --- |
  | Wilayah I | 447.982 (erupsi Merapi 2010: Jawa Tengah 288.005, DIY 159.977); gempa Sulteng 2018 212.719 | 245.961 (Sulteng 2018) | Rumus rumah tidak berlaku untuk erupsi (Merapi 10.230 lawan 447.982) |
  | Wilayah II | 406.202 (gempa Lombok 2018, NTB) | 425.233 (Lombok 2018: RB 75.138 + RS 33.896) | Selisih 4,7% |
  | Wilayah III | 230.965 (gempa Ambon 2019, Maluku) | 464.120 (gempa Sumatera Barat 30 Sep 2009: RB 119.005, RS tidak dicatat terpisah, RR 152.535) | Pengungsi tercatat Sumatera Barat 2009 hanya 6.554 (Agam saja): pencatatan pengungsi 2009 tidak lengkap |

  Sumber: `riset/mentah/dibi_geologi.json` (1.014 baris, dihitung sama, 24 Okt 2026); `dibi/kejadian_besar.csv` [versi=DIBI;
  kode=padang2009, lombok2018, merapi2010, ambon2019] [`bnpb-2026-dibi`]; `skenario-geologi/pembanding_pdna.csv` (Cianjur, Lombok,
  Sulteng, Merapi); ×3,9 jiwa per rumah dari `skenario-geologi/README.md` (rumah = jiwa/3,9, `kerusakan.js`)
  [`pantaubencana-2026-skenario-geologi`]; kunci lama `dibi.merapi2010.mengungsi` (mitigasi bab-04), `dibi.lombok2018.mengungsi`,
  `dibi.sulteng2018.mengungsi` (mitigasi bab-06), `dibi.lombok2018.rumah_rusak`; kunci baru `dibi.ambon2019.mengungsi`,
  `dibi.padang2009.rumah_rb` (bentuk berkas + jalur), `respons.w1.geologi_rbrs_puncak30`, `respons.w2.geologi_rbrs_puncak30`,
  `respons.w3.geologi_rbrs_puncak30`. Label: **resmi** (pengungsi dan rumah tercatat); penghuni = olah(resmi) dengan **asumsi-kebijakan**
  3,9 jiwa per rumah. Aturan rumah diuji pada kejadian yang pengungsinya tercatat lengkap: Cianjur 2022 115.799 lawan 114.683, Lombok
  425.233 lawan 406.202, Sulteng 245.954 lawan 221.450 (selisih 1–11%).
  - *Angka berdampingan:* Sulteng 2018 212.719 (jendela 28 Sep–31 Okt 2018, `kejadian_besar.csv`) lawan 221.450 (`pembanding_pdna.csv`,
    jendela lain). Perbedaan jendela, bukan konflik sumber.
- **T5.4 Geologi pra-DIBI dalam periode acuan 30 tahun (1996–2025, prinsip 9), bukan pengungsi tercatat:**
  - Aceh dan Nias, tsunami 26 Des 2004: 635.384 orang kehilangan tempat tinggal (Aceh dan Nias, tidak terpilah), 139.195 rumah rusak
    atau hancur (penghuni × 3,9 = 542.861). Aceh masuk Wilayah I (Perban 11/2025 Pasal 74), Nias (Sumatera Utara) Wilayah II (Pasal 77);
    karena angka tidak terpilah, baris ini tidak dibebankan ke satu direktorat dan tidak dipakai sebagai lantai kepekaan Wilayah I.
    Sumber: BRR NAD–Nias (2009), arsip BNPB https://aset-sejarah.dibi.bnpb.go.id/assets/arsip/670de67d21dc8.pdf, Bagian 1 Tabel 1.1
    (hlm. PDF 27 menurut riset E §E4, baris 134–135, yang memparafrasekan); mitigasi bab-04 P2 [`brr-2009-nias`]. Penyusun bab ini belum
    membuka buku itu sendiri: pembacaan 24 Okt 2026 gagal karena berkas PDF melampaui batas ukuran pembaca, dan berkas tidak diunduh.
    Kunci lama `brr.aceh2004.meninggal` (mitigasi bab-04); kunci baru `brr.aceh2004.kehilangan_tempat_tinggal`. **resmi** (KEPUTUSAN
    T14: buku BRR diterima sebagai sumber resmi), dengan syarat kutipan halaman dicek ke buku sebelum masuk isi utama.
  - Nias, gempa 28 Mar 2005 (Wilayah II): lebih dari 70.000 kehilangan tempat tinggal. Sumber: idem; kunci baru
    `brr.nias2005.kehilangan_tempat_tinggal`. **resmi** (KEPUTUSAN T14). Di bawah lantai Wilayah II.
  - Yogyakarta dan Jawa Tengah, gempa 27 Mei 2006 (Wilayah I): 600.000 sampai satu juta orang kehilangan rumah; rumah hancur 154.000
    sampai 157.000 (penghuni × 3,9 = 600.600 sampai 612.300) dan rusak 202.000 sampai 260.000 (dua versi di dokumen yang sama). Sumber:
    penilaian awal kerusakan dan kerugian Bappenas, pemda DIY, pemda Jawa Tengah (Juni 2006), dibuka mitigasi bab-06 P3 butir 1
    [`bappenas-2006-dala-yogya`]; kunci lama `bappenas.yogya2006.rumah_hancur` (mitigasi bab-06); kunci baru
    `bappenas.yogya2006.kehilangan_rumah`. **resmi** (penilaian awal). Mitigasi bab-06 Celah menyatakan angka ini bukan pengungsi tercatat.
  - DIBI dasbor publik tidak memuat kejadian sebelum 2008 (`kejadian_besar.csv` `yogya2006`, `aceh2004`: 0 baris).
- **T5.5 Sumatra 2025 per provinsi dan direktorat (DIBI 15 Nov–31 Des 2025):** Aceh 946.889 mengungsi, 591 meninggal dan hilang (Wilayah I);
  Sumatera Utara 13.157 dan 414 (Wilayah II); Sumatera Barat 10.830 dan 337 (Wilayah III); jumlah 970.876 dan 1.342 (sama dengan registri
  `dibi.sumatra2025.*`). Sumber: idem T5.2, dihitung ulang 24 Okt 2026; kunci baru `respons.sumatra2025.mengungsi_sumut`,
  `respons.sumatra2025.mengungsi_sumbar`, `respons.sumatra2025.mh_aceh`, `respons.sumatra2025.mh_sumut`, `respons.sumatra2025.mh_sumbar`.
  Label: olah(resmi).
  - *Dibantah oleh:* Buletin Info Bencana BNPB Desember 2025 hlm. 6 (data per 31 Des 2025, Aceh saja): "lebih dari" 356.655 mengungsi
    (`dibi/kejadian_besar.csv` versi pustaka, verifikasi primer; kunci baru `dibi.sumatra2025.mengungsi_aceh_buletin`)
    [`bnpb-2025-buletin-des`], **resmi**; BNPB per 12 Jan 2026 lewat Suara Surabaya: 195.542 pengungsi masih bertahan, **sekunder**. DIBI
    menjumlah pengungsi per laporan kejadian, Buletin dan konferensi pers menulis stok pada satu tanggal; ketiganya ditulis berdampingan
    dengan definisinya.

**Model sebagai pembanding (bukan lantai)**

- **T5.6 Skenario gempa platform, pengungsi = (RB + RS tengah) × 3,9:** selatan Jawa M8,5 (di bawah Mmaks): 434.833 (Wilayah I 216.912,
  Wilayah II 12.710, Wilayah III 205.211); Mentawai M8,8: 563.701 (Wilayah III 486.584, Wilayah II 73.901, Wilayah I 3.216). Varian Mmaks
  (selatan Jawa M9,1: 9.735.362, yaitu Wilayah I 3.709.974, Wilayah II 2.171.079, Wilayah III 3.854.305; Mentawai M8,9: 891.831, Wilayah III
  734.144). Sumber: `skenario-geologi/gempa_kab.csv` kolom `pengungsi` (dijumlah per direktorat penyusun bukti 24 Okt 2026), `ringkasan.csv`,
  README §4.4 [`pantaubencana-2026-skenario-geologi`]; kunci lama `geologi.jawa_mmaks.pengungsi`, `geologi.mentawai_mmaks.pengungsi`
  (mitigasi bab-06); kunci baru `respons.model.jawa.pengungsi_w1`, `respons.model.jawa.pengungsi_w3`, `respons.model.mentawai.pengungsi_w3`,
  `respons.model.jawa_mmaks.pengungsi_w1`, `respons.model.jawa_mmaks.pengungsi_w3`. **estimasi-model** (rumah = jiwa/3,9, bukan data
  bangunan; kerusakan rumah model belum diuji) dan asumsi-kebijakan (×3,9). Magnitudo Mmaks kini resmi PuSGeN 2024 (KERANGKA §8 E1), tetapi
  `ringkasan.csv` masih melabelnya "Mmaks (sekunder)"; koreksi label dibawa ke pemilik paket. Mw 9,1 tidak boleh disisihkan (peluang lima
  tahun 0,83% di atas 0,2%, prinsip 9), tetapi angkanya model dan hanya tampil di Lampiran C dan kolom pembanding.

**Standar kebutuhan dan sistem logistik**

- **T5.7 Perka BNPB 7/2008 (ditetapkan 17 Des 2008):** tempat penampungan 3 m² per orang; beras 400 gram per orang per hari atau setara,
  dapur umum 2 kali makan, setara 2.100 kkal; air bersih 7 liter per orang per hari pada tiga hari pertama lalu 15 liter; air minum 2,5 liter;
  satu jamban keluarga maksimal untuk 20 orang; jarak sumber air paling jauh 500 m. Sumber: `perka-nomor-7-tahun-2008.json` hlm. PDF 2, 9,
  12, 13 [`bnpb-2008-kebutuhan-dasar`]; kunci lama `perka_2008.air_bersih_liter_hari`, `perka_2008.air_minum_liter_hari` (air bab-03),
  `perka_2008.air_bersih_3hari_liter`, `perka_2008.jarak_sumber_air_m` (air bab-05); kunci baru `perka_2008.beras_gram_hari`,
  `perka_2008.kkal_hari`, `perka_2008.hunian_m2_orang`, `perka_2008.jamban_orang`. **resmi**.
  - *Angka berdampingan:* huntara minimal 3,5 m² per orang (Juklak 3/2023 hlm. 4) lawan penampungan sementara 3 m² (Perka 7/2008):
    instrumen berbeda, keduanya berlaku. Kunci baru `juklak2023_3.huntara_m2_orang`.
- **T5.8 Kebutuhan per hari pada lantai (olah T5.2–T5.4 × T5.7):**

  | Direktorat dan baris | Definisi | Lantai (jiwa) | Beras (ton/hari) | Air bersih hari 1–3 (juta l/hari) | Air bersih sesudahnya (juta l/hari) | Air minum (juta l/hari) | Jamban | Luas penampungan (ha) |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Wilayah I, lantai perencanaan (Aceh 2025) | A pengungsi kumulatif DIBI | 954.305 | 381,7 | 6,68 | 14,31 | 2,39 | 47.715 | 286,3 |
  | Wilayah I, kepekaan stok Aceh (lantai jatuh ke Merapi 2010) | A dengan Aceh diganti C (lihat bawah) | 447.982 | 179,2 | 3,14 | 6,72 | 1,12 | 22.399 | 134,4 |
  | Wilayah I, pembanding pra-2008 batas atas Yogyakarta 2006 | D kehilangan rumah | 1.000.000 | 400,0 | 7,00 | 15,00 | 2,50 | 50.000 | 300,0 |
  | Wilayah II, lantai perencanaan dengan Bekasi 2020 | A pengungsi kumulatif DIBI | 468.967 | 187,6 | 3,28 | 7,03 | 1,17 | 23.448 | 140,7 |
  | Wilayah II, tanpa Bekasi 2020 (Lombok 2018, rumah) | B penghuni rumah × 3,9 | 425.233 | 170,1 | 2,98 | 6,38 | 1,06 | 21.262 | 127,6 |
  | Wilayah II, tanpa Bekasi 2020 (Lombok 2018, pengungsi tercatat) | A pengungsi kumulatif DIBI | 406.202 | 162,5 | 2,84 | 6,09 | 1,02 | 20.310 | 121,9 |
  | Wilayah III, lantai perencanaan (Sumatera Barat 2009, rumah) | B penghuni rumah × 3,9 | 464.120 | 185,6 | 3,25 | 6,96 | 1,16 | 23.206 | 139,2 |
  | Wilayah III, pembanding pengungsi tercatat (Ambon 2019) | A pengungsi kumulatif DIBI | 230.965 | 92,4 | 1,62 | 3,46 | 0,58 | 11.548 | 69,3 |

  Definisi: A = pengungsi tercatat DIBI dijumlah per laporan kejadian dalam jendela 30 hari (batas atas pengungsi serentak); B = penghuni
  rumah RB + RS tercatat × 3,9 (KERANGKA prinsip 9); C = stok pengungsi pada satu tanggal (Buletin BNPB); D = kehilangan rumah pra-2008
  di dokumen penilaian (bukan pengungsi tercatat, T5.4). Baris D dan tsunami 2004 (635.384, Aceh dan Nias tidak terpilah) bukan lantai.
  Rumus: beras = jiwa × 0,4 kg; air bersih = jiwa × 7 atau 15 l; air minum = jiwa × 2,5 l; jamban = jiwa / 20; luas = jiwa × 3 m². Baris
  kepekaan stok Aceh: bila rekaman Aceh November–Desember 2025 diskalakan ke stok Buletin (356.655 dari 946.889), puncak hidrometeorologi Wilayah I
  menjadi 364.071 (jendela 6 Nov–5 Des 2025; dihitung ulang dari `riset/mentah/dibi_hidromet.json` 24 Okt 2026, skala proporsional per
  tanggal adalah asumsi penyusun), di bawah pengungsi tercatat erupsi Merapi 2010 (447.982, T5.3), jadi lantai menurut definisi A–C
  menjadi 447.982. Baris ini mencampur stok (C) dengan jumlah kumulatif (A) dan hanya kepekaan.
  - **[Inferensi tim]** Usulan agar lantai Wilayah I tidak diturunkan di bawah sekitar 600.000 (batas bawah kehilangan rumah Yogyakarta 2006,
    definisi D) adalah pilihan kebijakan, bukan akibat data: angka D bukan pengungsi tercatat. Label: **asumsi-kebijakan**. Kunci baru `respons.w1.beras_ton_hari`, `respons.w1.jamban`,
  `respons.w2.beras_ton_hari`, `respons.w3.beras_ton_hari`, `respons.w3.jamban`. Label: asumsi-kebijakan (lantai dan rumus), olah(resmi)
  (masukan). Bukan stok gudang atau anggaran.
- **T5.9 Sistem logistik yang berlaku:** Kepka 308/2024 menetapkan enam klaster, Klaster Logistik dikoordinasi BNPB; koordinator Klaster
  Logistik Nasional dijabat Deputi Bidang Logistik dan Peralatan; anggota menyiapkan sumber daya logistik, angkutan, pergudangan, dan tenaga
  bongkar muat (Juklak 16/2025 hlm. 1, 4–5); bantuan logistik dan peralatan untuk kesiapsiagaan "dapat dialokasikan untuk keperluan buffer
  stock minimal sepuluh persen" dari jumlah pengadaan (Juklak 3/2024 hlm. 3, ditetapkan 21 Mar 2024); Renas mencatat standar logistik dan
  peralatan untuk pemda sudah tidak relevan dan sistem informasi logistik belum dimutakhirkan (hlm. 27); IKP Renstra daerah terfasilitasi
  logistik 35% ke 75%. Sumber: `juklak-nomor-16-tahun-2025.json`, `juklak-nomor-3-tahun-2024.json`, `perban-nomor-1-tahun-2025.json` hlm. 27
  [`bnpb-2025-juklak16`, `bnpb-2024-juklak-logistik`, `bnpb-2025-renas`]; kunci lama `renstra.ikp_logistik.*`, `lembaga.klaster.kepka308`
  (mitigasi bab-10); kunci baru `juklak2024_3.buffer_stock_persen`. **resmi**. OCR halaman 3 Juklak 3/2024 terbaca "(1096)" untuk "(10%)".
- **T5.10 Dasar pengungsi:** Perban 3/2018 (T2.13); pengungsi kebutuhan dasar UU 24/2007 Pasal 48 huruf d dan Pasal 53. **resmi**.

### Inferensi

- **I5.1 [Inferensi tim] Draf Tabel 11.4.** Kolom: direktorat; provinsi; lantai hidrometeorologi tercatat (jendela dan provinsi penyumbang);
  lantai geologi tercatat dua definisi (pengungsi; penghuni rumah × 3,9); baris pra-2008 (kehilangan tempat tinggal); lantai perencanaan =
  yang terbesar di antara angka tercatat 2008–2025; model pembanding berlabel; kebutuhan per hari (T5.8); unit logistik dan gudang
  (permintaan data). Lantai Wilayah III jatuh pada gempa, bukan musim hujan, dan bergantung pada asumsi 3,9 jiwa per rumah; Wilayah II
  bergantung pada satu rekaman yang diragukan. Ketiga lantai sekarang berada di kisaran 0,42 sampai 0,95 juta jiwa, sehingga tidak ada
  direktorat yang boleh merencanakan di bawah sekitar 0,4 juta pengungsi serentak.
- **I5.2 [Inferensi tim] Buffer stock persentase pengadaan tidak terikat skenario.** Juklak 3/2024 menetapkan buffer minimal 10% dari
  pengadaan, bukan dari kebutuhan skenario per wilayah. Rekomendasi untuk Deputi Bidang Logistik dan Peralatan: stok penyangga per Direktorat
  PD Wilayah ditetapkan terhadap lantai Tabel 11.4 (misalnya hari-hari pertama sebelum distribusi daerah berjalan), dengan pembagian peran
  pusat, provinsi, kab/kota menurut prinsip SKPDB.
- **I5.3 [Inferensi tim] Latihan berbasis skenario.** Pusdiklat PB dan Direktorat Kesiapsiagaan dapat memakai tiga lantai ini sebagai skenario
  gladi tingkat direktorat (renkon Perban 2/2023 Pasal 19; RPKB Perban 9/2025 Pasal 27). Direktorat Sistem PB menautkan lantai ke renkon
  provinsi. Ketiganya rekomendasi kajian, bukan mandat tertulis.
- **I5.4 [Inferensi tim] Model di atas lantai.** Mentawai M8,8 di Wilayah III (486.584) hanya 1,05 kali lantai rumah 464.120 tetapi 2,1 kali
  pengungsi tercatat Ambon 2019; Mw 9,1 selatan Jawa (3,7 sampai 3,9 juta per direktorat) sekitar delapan kali lantai Wilayah III. Prinsip 9
  melarang angka model di judul tanpa penjelasan. Kartu menulis lantai tercatat sebagai angka utama dan model sebagai baris berpil "Estimasi
  model"; arti operasionalnya: Mw 9,1 melampaui kapasitas satu direktorat dan menjadi skenario status nasional (Perpres 17/2018 Pasal 2),
  bukan dasar stok direktorat.
- **I5.5 [Inferensi tim] Pencatatan pengungsi gempa lama tidak lengkap.** Sumatera Barat 2009 punya 119.005 rumah rusak berat tetapi 6.554
  pengungsi tercatat; untuk gempa sebelum aturan Juklak 7/2023, pengungsi tercatat tidak dapat menjadi lantai sendirian, sehingga definisi
  rumah KERANGKA dipakai berdampingan.

### Celah

- Stok logistik dan peralatan per gudang BNPB dan BPBD (INALOGPAL) terhadap lantai. **Permintaan:** Deputi Bidang Logistik dan Peralatan
  (keputusan 14 hari butir 4).
- Stok pengungsi harian (puncak serentak) tidak dicatat DIBI. **Permintaan:** Pusdatinkom dan Direktorat PD Wilayah (laporan harian Perban
  3/2018 Pasal 28).
- Bukti rekaman Kota Bekasi Januari 2020 (KERANGKA §7 butir 15). **Permintaan:** BPBD Kota Bekasi lewat Pusdatinkom.
- Pengungsi tercatat pra-2008 (Aceh 2004, Yogyakarta 2006) tidak ada di DIBI; yang ada hanya kehilangan tempat tinggal di dokumen resmi.
  **Penyajian:** baris berdampingan dan kepekaan, bukan lantai.
- Jiwa per rumah 3,9 adalah asumsi platform; rata-rata anggota rumah tangga per provinsi BPS tidak ditarik. **Permintaan:** BPS (SUPAS 2025
  per provinsi) untuk mengganti 3,9 di Wilayah III.
- Standar logistik pemda yang baru (perubahan Perban 4/2018 di Progsun 2026, mitigasi bab-10) belum terbit.

---

## Bahan subbab 11.8 Desa, Sekolah, dan Relawan (konteks, bukan pertanyaan kunci)

### Inti

Destana menjangkau 2.234 desa/kelurahan (baseline Renas 2024) dengan target 7.234 pada 2029, dibanding 53.000 desa di daerah rawan, dan
belum punya evaluasi dampak; Perban 7/2025 sudah memuat penilaian ketangguhan tiga tingkat paling sedikit tiap 3 tahun dan evaluasi dampak
jangka panjang, sehingga garis dasar evaluasi tidak memerlukan instrumen baru. SPAB dialihkan ke kementerian pendidikan sejak 2023 dengan
BNPB sebagai kontributor, dan relawan punya pedoman Perka 17/2011.

### Temuan bersumber

- **T8.1 Destana (P01; belum terbukti; Program berjalan, wajib evaluasi dampak):** 2.234 ke 7.234 (Renas 4.5.1.a hlm. 107; PJ Kemendes PDT,
  BNPB, Kemensos); 53.000 desa di daerah rawan (Renstra hlm. 69); IKK daerah yang memiliki Destana 2,58% ke 3,26%. Sumber:
  `bukti_dampak.csv` B001–B005; kunci lama `renas.aksi_451a.*`, `renstra.ikk_destana.*` (air bab-08), `renstra.desa_rawan` (air bab-07)
  [`bnpb-2025-renas`, `bnpb-2025-renstra`]. **resmi**.
- **T8.2 Perban 7/2025 (ditetapkan 24 Okt 2025):** evaluasi dampak jangka panjang dalam tahap pendampingan (Pasal 11 huruf e); penilaian
  ketangguhan paling sedikit setiap 3 tahun (Pasal 14 ayat (5)); tingkat utama, madya, pratama (ayat (6)); evaluasi minimal sekali setahun
  (Pasal 19); sistem informasi (Pasal 20); mencabut Perka 1/2012. Sumber: air bab-08 T5.2 [`bnpb-2025-destana`]; kunci lama
  `perban2025_7.destana.penilaian_tahun`. **resmi**.
- **T8.3 SPAB (P02; belum terbukti):** dialihkan ke kementerian pendidikan sejak 2023 (Renstra hlm. 20); Renas 2.1.2.a 4.433.262 ke
  38.946.645 peserta didik (PJ Kemendikdasmen dan Kemenag; BNPB kontributor). Padanan luar negeri: pendidikan kebencanaan Kamaishi (P21,
  sedang). Sumber: `bukti_dampak.csv` B008–B010; kunci lama `bukti.p02.spab_2024`, `bukti.p02.spab_2029` (mitigasi bab-02). **resmi**.
- **T8.4 Relawan:** relawan PB adalah orang atau kelompok yang bekerja sukarela dalam PB; standar minimum kemampuan menjadi syarat terdaftar;
  lembaga pembina meliputi instansi pemerintah, dunia usaha, perguruan tinggi, organisasi masyarakat (Perka 17/2011, ditetapkan 30 Des 2011);
  Tim Relawan PB tingkat desa dan kelurahan (Perban 7/2025 Pasal 1 angka 6). Sumber: `perka-nomor-17-tahun-2011.json` hlm. 4–7
  [`bnpb-2011-relawan`]; air bab-08 T5.3. **resmi**.
- **T8.5 Kepatuhan daerah:** per September 2025, 63 daerah belum menuntaskan SPM sub-urusan bencana, 87 belum mengaktifkan KRB, 79 belum
  menyusun IKD 2024 (Kemendagri lewat Kemenko PMK). Sumber: air bab-08 T2.19 [`kemenkopmk-2025-sinkronisasi-irb`]; kunci lama `kemendagri.*`.
  **resmi** (pernyataan pejabat).

### Inferensi

- **[Inferensi tim]** Destana berstatus "Sudah ada, perlu dikembangkan": yang dikembangkan adalah cara evaluasi (garis dasar penilaian
  ketangguhan di desa Destana dan desa pembanding), bukan perluasan cakupan atas nama bukti. Target 7.234 tetap target resmi Renas.
- **[Inferensi tim]** Relawan dan kearifan lokal tidak diberi klaim efektivitas; kearifan lokal tidak ditulis karena dokumen primernya tidak
  ditemukan.

### Celah

- Daftar desa Destana dan hasil penilaian ketangguhan (sistem informasi Pasal 20). **Permintaan:** Direktorat Kesiapsiagaan.
- Jumlah relawan terdaftar per provinsi. **Permintaan:** Direktorat Kesiapsiagaan.
- Dokumen primer kearifan lokal (misalnya smong) tidak dibuka; tidak ditulis di naskah.

---

## Bahan subbab 11.9 Pemulihan per Instrumen (konteks, bukan pertanyaan kunci)

### Inti

Instrumen pemulihan berlapis dan bertenggat: DTH Rp600.000 per bulan selama status atau 3 bulan dan/atau menurut keputusan Kepala BNPB
(Juklak 1/2023; Juklak 15/2025 khusus Aceh, Sumatera Utara, Sumatera Barat menyalurkan langsung dari BNPB), huntara minimal 3,5 m² per orang
(Juklak 3/2023), stimulan rumah DSP (Juklak 5/2024, berkas tidak tersedia di JDIH), R3P paling lama 90 hari, dan hibah RR yang mensyaratkan
R3P dan wajib dilaporkan ke Kemendagri (Perban 4/2024). Sumatra 2025 adalah kasus berjalan: R3P Aceh selesai 35 hari setelah kejadian, dan
Bappenas memutakhirkan rencana induk percepatan; dokumen sinkronisasi nomenklatur RR dengan Kemendagri tidak ditemukan.

### Temuan bersumber

- **T9.1 DTH (Juklak 1/2023, ditetapkan 16 Agu 2023):** diberikan selama status keadaan darurat atau keadaan tertentu dan "dapat diberikan
  selama 3 (tiga) bulan dan/atau berdasarkan Keputusan Kepala BNPB"; nilai maksimal Rp600.000 per bulan atau Rp20.000 per hari; disalurkan
  lewat BPBD dengan rekening penampung DSP; mencabut Juklak 2/2022. Sumber: `juklak-nomor-1-tahun-2023.json` hlm. 3–4, 6 [`bnpb-2023-dth`];
  kunci baru `juklak2023_1.dth_rp_bulan`, `juklak2023_1.dth_bulan`. **resmi**.
  - *Angka berdampingan:* Juklak 15/2025 (15 Des 2025): nilai "sebesar" Rp600.000 per bulan (bukan "maksimal"), 3 bulan dan/atau keputusan
    Kepala BNPB, disalurkan "dari BNPB ke rekening buku Tabungan penerima sesuai Keputusan Kepala Daerah". Sumber:
    `juklak-nomor-15-tahun-2025.json` hlm. 4 [`bnpb-2025-juklak15`]. **resmi**. Juklak 2/2022 DTH berstatus tidak berlaku di indeks JDIH.
- **T9.2 Huntara (Juklak 3/2023, 24 Okt 2023):** ruang hunian minimal 3,5 m² per orang; tenda sejak awal kedaruratan; penilaian awal oleh
  petugas pos lapangan; pelaporan 5W. Sumber: `juklak-nomor-3-tahun-2023.json` hlm. 4, 7, 19, 22, 26 [`bnpb-2023-huntara`]. **resmi**.
- **T9.3 Stimulan rumah DSP (Juklak 5/2024, 10 Jun 2024):** tercatat berlaku di indeks JDIH tanpa berkas PDF. Besaran stimulan Rp60/30/15 juta
  yang dipakai paket hanya bersumber berita (air bab-03). Sumber: indeks JDIH, https://jdih.bnpb.go.id/dokumen/Peraturan/juklak-nomor-5-tahun-2024
  [`bnpb-2024-juklak-stimulan`]. **resmi** (metadata); besaran **sekunder**, tidak untuk naskah.
- **T9.4 R3P, hibah, dan instrumen RR lama:** T2.14–T2.15. Juklak 9/2024 (13 Nov 2024) mengatur mekanisme pelaksanaan, pelaporan, dan
  pemantauan hibah RR. Indeks JDIH masih menandai "BERLAKU" untuk Perka 17/2010 (pedoman umum RR), Perka 5/2012 (pedoman monev RR), dan
  Perka 4/2013 (juknis RR sektor permukiman).
  - *Dibantah oleh:* Perban 5/2017 Pasal 12: Perka 17/2010 "dicabut dan dinyatakan tidak berlaku"; Pasal 13 meminta Perka yang berkaitan
    langsung dengan rencana RR menyesuaikan diri. Indeks JDIH juga mencatat Perka 17/2010 di "BN 2014 (1553)" sedangkan Perban 5/2017
    menulis Berita Negara 2010 Nomor 1553. Sumber: `perban-nomor-5-tahun-2017.json` hlm. 10; `data/raw/hukum/indeks.json`
    [`bnpb-2017-r3p`, `bnpb-2010-perka17-rr`]. **resmi**. Penyajian: lampiran Penyelarasan dokumen BNPB, suara BNPB.
- **T9.5 Kemendagri dalam rantai RR (sinkronisasi nomenklatur):** norma yang tertulis hanya kewajiban pemda penerima hibah RR melapor tiap
  3 bulan dan laporan akhir kepada Kepala BNPB, menteri keuangan, dan menteri dalam negeri (Perban 4/2024 Pasal 28 ayat (2)–(3); T2.15).
  Dalam rakor Kemenko PMK tentang sinergi multipihak RR, wakil Kemendagri menyatakan penyelenggaraan RR harus mengacu kewenangan pemda
  menurut UU 23/2014 dan UU 24/2007, dengan konsekuensi pada pertanggungjawaban dan rentang kendali; kata "nomenklatur" dan
  "sinkronisasi" tidak muncul di siaran itu. Sumber: `perban-nomor-4-tahun-2024.json` hlm. 11 [`bnpb-2024-hibah-rr`]; Kemenko PMK,
  https://kemenkopmk.go.id/node/5475 (dibuka 24 Okt 2026; kepala halaman menulis 31 Jan 2025, badan berita menulis 2024)
  [`kemenkopmk-2025-rakor-rr`]. **resmi**.
- **T9.6 Sumatra 2025:** R3P Aceh (T2.17); BPBA membentuk Posko Tim Percepatan untuk transisi; Kemenko PMK akan mengoordinasikan mekanisme
  diskresi perbaikan infrastruktur pusat di daerah; R3P menjadi rujukan utama pemutakhiran rencana induk PRRP Sumatera dalam pendampingan
  Bappenas 9–11 Mar 2026 di Kantor Gubernur Aceh. Sumber: https://kemenkopmk.go.id/node/6211 [`kemenkopmk-2026-r3p-aceh`]. **resmi**.
  Angka kebutuhan rupiah rencana induk hanya di berita (sekunder) dan di luar P5; tidak dikutip.

### Inferensi

- **[Inferensi tim]** Instrumen per penerima (DTH, huntara, stimulan) sudah tertulis, tetapi juklak per kejadian (15/2025) menggeser cara salur
  dari BPBD ke BNPB langsung. Ini preseden yang perlu ditulis sebagai pilihan desain (kecepatan lawan peran daerah), bukan sebagai kelemahan.
- **[Inferensi tim]** "Sinkronisasi nomenklatur RR dengan Kemendagri" hanya dapat ditulis sebagai kebutuhan, bukan temuan: yang berpasal adalah
  jalur laporan hibah ke Kemendagri dan posisi Kemendagri bahwa RR mengikuti kewenangan pemda. Rekomendasinya (Bab 13) cukup "menyelaraskan
  nomenklatur kegiatan RR BNPB dengan klasifikasi urusan dan kegiatan pemda yang ditetapkan Kemendagri", berlabel usulan penyusun.
- **[Inferensi tim]** Tumpukan instrumen RR dari 2008 sampai 2024, termasuk Perka 17/2010 yang tercatat berlaku padahal sudah dicabut, adalah
  bahan lampiran Penyelarasan dokumen BNPB (suara BNPB), bukan temuan RE.

### Celah

- Teks Juklak 5/2024 dan besaran stimulan resmi. **Permintaan:** Deputi Bidang Rehabilitasi dan Rekonstruksi.
- Dokumen R3P Sumatera Utara dan Sumatera Barat serta status penetapan R3P Aceh oleh BNPB. **Permintaan:** Deputi Bidang RR.
- Teks rencana induk PRRP Sumatera (Bappenas). **Penyajian:** disebut keberadaannya saja.
- Dokumen sinkronisasi nomenklatur RR BNPB–Kemendagri (misalnya pemetaan kegiatan RR ke klasifikasi dan kodefikasi kegiatan pemda) tidak
  ditemukan di korpus maupun penelusuran web 24 Okt 2026; Permendagri 18/2025 tentang BPBD hanya terbaca dari berita dan tidak dipakai.
  **Permintaan:** Biro Perencanaan BNPB dan Ditjen Bina Pembangunan Daerah Kemendagri.

---

## Bahan subbab 11.10 Agenda Bukti 2026–2030 (konteks, bukan pertanyaan kunci)

### Inti

Empat program berjalan yang dibiayai negara di lingkup Kajian 2 belum punya evaluasi dampak berpembanding: Destana dan SPAB "belum terbukti",
InaTEWS berbukti sedang dari satu kejadian, dan OMC tidak punya baris kompendium dengan catatan sortie di platform 0. Agenda bukti menetapkan
per program garis dasar, pembanding, ukuran hasil, unit, dan tahun hasil, memakai instrumen yang sudah ada (penilaian ketangguhan Destana,
fungsi evaluasi BMKG untuk OMC); embung dan polder masuk agenda bukti Kajian 1 (Tabel 8.6).

### Temuan bersumber

- **T10.1 Destana dan SPAB:** T8.1–T8.3. **resmi**.
- **T10.2 InaTEWS (P03; sedang):** hulu cepat (Palu 2018), hilir lemah: keterpenuhan peringatan dini 6%; sirene terpasang 23 (2025) ke 170 (2029);
  diseminasi sirene memadai 6,09% ke 6,29%. Celah kompendium: mata rantai terakhir, tsunami nontektonik (Selat Sunda 2018). Sumber:
  `kompendium_program.csv` P03; kunci lama `renstra.sirene_terpasang.*`, `renstra.diseminasi_sirene_memadai.*` (air bab-07). **resmi** dan
  **terverifikasi**.
- **T10.3 OMC:** Renas 1.2.1.h (950 hari operasi; T4.11); fungsi pemantauan, evaluasi, pelaporan modifikasi cuaca di Deputi Bidang Modifikasi Cuaca
  BMKG (Perpres 12/2024 Pasal 24 huruf f); `public/udara/data/omc_hasil.json` (diperbarui 23 Okt 2026): `sortie` 0, catatan "Kesesuaian lokasi
  atau waktu dengan sasaran belum membuktikan sebab-akibat"; protokol platform selisih-dalam-selisih dengan uji plasebo (air bab-08 T5.5).
  BMKG 20 Okt 2026: penyemaian dry ice untuk asap karhutla, BNPB mengoordinasikan (mitigasi bab-07). Sumber: [`ri-2024-perpres12-bmkg`,
  `bnpb-2025-renas`, `bmkg-2026-siaran-asap`]. **resmi** (rezim); keluaran platform bukan Data Bencana Perban 1/2023 (prinsip 19).
- **T10.4 Embung (P10) dan polder (P15), belum terbukti, pindah ke Kajian 1:** KERANGKA §5 Bab 11 dan V04/V10 memindahkan keduanya ke Tabel 8.6
  Kajian 1 (register bersama berkajian air). Sumber: `KERANGKA.md` §1.2 V04, §5. Tidak ditulis ulang di Tabel 11.5 (prinsip 17).

### Inferensi

- **[Inferensi tim] Draf Tabel 11.5 agenda bukti** (semua kolom metode usulan penyusun):

  | Program | Garis dasar | Pembanding | Ukuran hasil | Pemimpin; unit BNPB | Tahun hasil |
  | --- | --- | --- | --- | --- | --- |
  | Destana (P01) | Penilaian ketangguhan Perban 7/2025 di desa Destana dan desa rawan belum Destana, 2027 | Desa rawan sejenis belum dibina | Perubahan tingkat ketangguhan; meninggal, hilang, menderita per desa bila data desa tersedia | Kemendes PDT, BNPB, Kemensos; Direktorat Kesiapsiagaan | 2030 |
  | SPAB (P02) | Waktu evakuasi dan porsi siswa ikut gladi di sekolah sampel, 2027 | Sekolah belum SPAB | Waktu evakuasi; kerusakan gedung pada kejadian | Kemendikdasmen, Kemenag; Direktorat Kesiapsiagaan (kontributor) | 2029 |
  | InaTEWS hilir (P03) | Waktu dari peringatan BMKG sampai pesan di desa pesisir, per kab | Kab tanpa sirene atau tanpa Pusdalops siaga terus-menerus | Porsi warga menerima pesan; waktu evakuasi pada gladi dan kejadian | BMKG; Direktorat Peringatan Dini | 2028 |
  | OMC | Catatan sortie terbuka (lokasi, waktu, bahan, sasaran) mulai musim berikut | Hari dan wilayah tanpa sortie; stasiun kontrol | Curah hujan sasaran, aliran masuk waduk, PM2,5 dan jarak pandang asap | BMKG (Deputi Bidang Modifikasi Cuaca); BNPB sebagai PJ Renas 1.2.1.h | Mulai 2027, evaluasi 2029 |

  Catatan kaki tabel: "Embung dan polder: agenda bukti Kajian 1 Tabel 8.6."
- **[Inferensi tim]** "Belum terbukti" ditulis "bukti dampak tidak ditemukan pada penelusuran 23–24 Okt 2026", bukan "tidak bermanfaat" (prinsip 12).

### Celah

- Catatan sortie OMC BMKG terbuka. **Permintaan:** BMKG.
- Data waktu sampai pesan peringatan dini per kab. **Permintaan:** Direktorat Peringatan Dini dan BMKG.

---

## Studi kasus (11.1 Bangladesh, 11.2 Odisha)

- **Bangladesh (P19; kuat untuk paket):** kematian siklon 500.300 (1970, Haque dkk. Tabel 1; versi lain 300.000 kajian WMO dan 1 juta
  angka pemerintah menurut kepala CPP), 138.958 (1991), 410 (1997), 4.234 (Sidr 2007), 197 (2009); penurunan lebih dari 100 kali dalam 40
  tahun; lebih dari 20.000 relawan saat siaga siklon; efek terpisah tiap unsur belum dibuktikan. Padanan di Indonesia: relawan PB, Destana,
  peringatan dini tsunami, status "dikembangkan". Sumber: `bukti_dampak.csv` B108–B119; kunci lama `bukti.p19.*` (mitigasi bab-02), registri
  `bukti.bangladesh_siklon.*` [`haque-2012-siklon`, `undrr-2020-bhola`]. **terverifikasi**.
  - *Angka berdampingan:* registri `bukti.bangladesh_siklon.kematian_1970` = 500.000 lawan Tabel 1 Haque 500.300; penulis memakai satu angka
    dengan pembulatan yang disebut, dan penggabung registri menyamakannya.
- **Odisha (P20; sedang):** Phailin 2013 44 meninggal (RDNA; 38 versi feature Bank Dunia 72 jam), lebih dari 1 juta dievakuasi dalam 36 jam,
  13,2 juta terdampak; Siklon Super 1999 sekitar 10.000 meninggal dan 18 juta terdampak. Pembanding hanya dua badai berbeda. Padanan di
  Indonesia: renkon (Perban 2/2023) dan RPKB (Perban 9/2025). Sumber: `bukti_dampak.csv` B120–B126; kunci lama `bukti.p20.*` (mitigasi bab-02)
  [`odisha-2013-phailin`, `bankdunia-2013-phailin`]. **resmi** (RDNA Pemerintah Odisha) dan **terverifikasi**.

---

## Koreksi untuk KERANGKA dan paket data (dibawa ke pemiliknya; berkas ini tidak menyunting berkas lain)

1. KERANGKA Bab 11 alur: urutan menjadi penilaian awal, kaji cepat, penetapan status, aktivasi SKPDB (Juklak 4/2023; Juklak 3/2022; Perka 3/2016
   Pasal 3 ayat (1)).
2. KERANGKA 11.6: "provinsi dengan awal musim per ZOM November–Desember" diganti "wilayah menurut siaran BMKG 22 Sep 2026" sampai tabel ZOM terbuka;
   puncak Desember hanya untuk sebagian besar Sumatera, Kalimantan, Sulawesi Barat.
3. KERANGKA Status data Bab 11: kalender bulanan sudah ada (`skenario-hidromet/kalender_bulanan_pulau.csv`); README paket belum menyebut berkas
   itu di tabel Berkas (pemilik `pipa-data`).
4. KERANGKA kebutuhan respons: untuk kejadian tercatat, pengungsi tercatat dan penghuni rumah RB+RS tercatat × 3,9 ditulis berdampingan dan
   lantai = yang lebih besar; dengan aturan ini lantai Wilayah III = Sumatera Barat 2009 (464.120), bukan Ambon 2019. Untuk skenario platform,
   RB+RS adalah keluaran model (pembanding). Rumus rumah tidak berlaku untuk gunung api.
5. Perban 2/2024 Pasal 14 ayat (3) memakai unit OTK lama (sama dengan mitigasi bab-10).
6. Matriks Bab 11 memakai 13 jenis (39 sel) seperti Bab 10; 15 jenis hanya kepekaan.
7. KERANGKA 11.5: gelombang dan rob Jawa tercatat lebih banyak Mei–Agustus, tetapi itu pola dari beberapa episode (gelombang: tanpa Juli
   2018 porsinya 42,9% lawan 44,2% November–April; rob: hanya 2020–2023 dan 2025). Tidak diusulkan perombakan panel Gambar 11.2 sebelum
   ada uji kepekaan dengan seri lebih panjang; yang diusulkan hanya baris rob terpisah berpil N dan rentang tahun, dan catatan patahan
   kategori 2018 di pil gambar.
8. Paket `skenario-geologi/ringkasan.csv`: label "Mmaks (sekunder)" untuk jawa-mmaks dan mentawai-mmaks perlu diganti setelah PuSGeN 2024
   dibuka (KERANGKA §8 E1).
9. Lampiran Penyelarasan dokumen BNPB: indeks JDIH menandai Perka 17/2010 berlaku padahal dicabut Perban 5/2017 Pasal 12; nomor Berita Negara
   Perka 17/2010 berbeda (2014 lawan 2010); halaman Juklak 9/2023 beralamat "juknis".
10. KERANGKA §5 Bab 11 temuan pemulihan "sinkronisasi nomenklatur RR dengan Kemendagri": tidak ada dokumen sumber; ditulis sebagai kebutuhan
    berlabel usulan penyusun (Bahan 11.9).

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Halaman kerangka 11.1 | Tiga tahap, sasaran 2029, program berkode dengan pil posisi bukti; jumlah sel per kategori (I3.1) | P1, P3; `kompendium_program.csv` | B5.12 | Tidak ada pil "terbukti" untuk program dalam negeri; P19 dan P16 hanya lewat "Padanan di Indonesia" |
| Tabel 11.1 indikator | Baris 1.a (kondisi 2025 alam 0,68, semua klasifikasi 0,79 berdampingan, median alam 0,20), 1.b (definisi Juklak 7/2023), 1.c dua lintasan, IRB 1,2% (menunggu KD-4), kapasitas tiga angka (KD-3), RPJMN status darurat sesuai standar, pascabencana masif, desa berketahanan; kolom Target 2029 (resmi, sumber) dan arah 2030 (Asumsi kebijakan, rumus) | `bab-11.angka.json` `dibi.alam.*`, `dibi.nasional.*`, `rpjmn.*`, `renas.indikator_1c.arah_2030`, `irb.arah_2030_kumulatif_persen`; kunci lama P1 | B5.19, G22 | Nilai tanpa baseline ditulis "–" dengan catatan kaki; penyebut disebut di kepala kolom; catatan patahan seri 2024 |
| Gambar 11.1 alur langkah berpemicu | Delapan tahap I2.1 dengan pemicu, pemutus, instrumen, tenggat; jalur keadaan tertentu; jalur KLB dan konflik | T2.1–T2.15 | B5.23, G21 | Diagram aliran berikon tanpa lebar sebanding; tenggat hanya yang tertulis |
| Tabel 11.2 matriks fase × jenis | 13 baris × pemicu + tiga fase, kategori posisi per sel | I3.1; T3.4 | B5.22 | Hitungan sel di keterangan: 28 aksi wajib, 8 berjalan, 2 rujukan, 1 dengan syarat; draf sampai dikunci |
| Gambar 11.2 kalender bahaya bulanan per pulau | 7 pulau × 12 bulan, panel menurut KERANGKA 11.5 (musim hujan: banjir, banjir bandang, longsor, cuaca ekstrem, gelombang; kemarau: kekeringan, karhutla) ditambah baris rob terpisah, isi sel = porsi kejadian | `skenario-hidromet/kalender_bulanan_pulau.csv` | G16 (tabel peta panas) | Pil "pola tercatat, dipengaruhi pelaporan" dan "patahan kategori 2018: banjir bandang, banjir dan longsor, rob baru tercatat sejak 2018; 2024 tidak lengkap"; rob berpil "Jawa 98,5 kejadian, 2020–2023 dan 2025"; Maluku ditandai; gelombang Jawa Mei–Agustus hanya catatan kaki dengan uji tanpa Juli 2018 (T4.3), tidak ditandai sebagai puncak; meninggal tidak dipakai untuk warna; catatan TPA dan permukiman tidak tercatat |
| Tabel 11.3 operasi musiman | Pemicu, aksi prabencana, aksi saat status, unit (I4.5) | T4.5–T4.11 | B5.7 | Unit dari OTK berlaku |
| Gambar 11.3 kalender Rencana Aksi Musim Hujan 2026/2027 | Bulan × wilayah dan direktorat, November 2026–April 2027, hari ke-0 dan ke-100; dasar Kartu 7.1 dan 7.2 | I4.1; T4.5, T4.7 | G23 (tabel native) | Puncak berurutan per wilayah; jangan menulis satu puncak nasional |
| Tabel 11.4 kebutuhan respons per Direktorat PD Wilayah | Lantai hidromet, lantai geologi dua definisi, baris pra-2008, lantai perencanaan, model pembanding, kebutuhan per hari | T5.1–T5.8 | B5.7 | Baris kepekaan Bekasi 2020 dan stok Aceh (Merapi 2010); baris pembanding pra-2008 Yogyakarta 2006 dan tsunami 2004 (Aceh dan Nias tidak terpilah); kolom definisi A–D; pil "batas atas pengungsi serentak" dan "3,9 jiwa per rumah, Asumsi kebijakan"; model berpil Estimasi model |
| Tabel 11.5 agenda bukti | Empat program (Destana, SPAB, InaTEWS, OMC) | T10.1–T10.3 | B5.7 | Kolom metode berlabel usulan penyusun; catatan kaki embung dan polder ke Kajian 1 Tabel 8.6 |
| Studi kasus 11.1 Bangladesh | Empat pertanyaan studi kasus; deret kematian; catatan "paket, bukan unsur" | Studi kasus P19 | B5.30 | Angka 1970 tiga versi berdampingan |
| Studi kasus 11.2 Odisha | Phailin lawan 1999; evakuasi 36 jam | Studi kasus P20 | B5.30 | Bukti sedang; 44 lawan 38 berdampingan |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/mitigasi/bukti/bab-11.angka.json` dengan bentuk entri `data/angka.json` (bentuk A: `berkas` + `jalur`
relatif ke `data/`; bentuk B: `nilai` + `pustaka`). `data/angka.json` tidak disunting. Hampir semua entri bentuk B karena nilainya hitungan
lintas baris dari cache mentah, kutipan peraturan, atau rumus. Angka sekunder tidak masuk registri.

**Kunci lama yang dipakai ulang (tidak diubah):** `renas.indikator_1a.proyeksi_2025`, `renas.indikator_1b.proyeksi_2025`,
`dibi.nasional.meninggal_hilang.*`, `dibi.nasional.per100rb.2025_*`, `dibi.nasional.terdampak_per100rb.2025`, `dibi.alam.meninggal_hilang.2025`,
`rpjmn.pp_irb.baseline_2023`, `rpjmn.kp_kapasitas.*` (mitigasi bab-01, bab-02); `dibi.alam.per100rb.2025_bps2026`,
`dibi.alam.rasio_proyeksi_1a.2025` (mitigasi bab-13); `renas.indikator_1c.*`, `renstra.ikp_peringatan_dini.*`,
`renstra.iks_kapasitas_minimal_sedang.*`, `bmkg.musim_2026.*` (air bab-01); `perka_2008.*` (air bab-03, bab-05); `renas.aksi_451a.*`,
`renas.aksi_121h.hari_operasi_2029`, `renstra.ikk_destana.*`, `rpjmn.kp080402.peringatan_dini_baseline`, `rpjmn.kp080404.*`,
`perban2023.renkon.*`, `perban2025_7.destana.penilaian_tahun`, `kemendagri.*` (air bab-08); `renas.perubahan_berkala.tahun_maks`,
`renas.perubahan_bencana.tahun_maks` (air bab-10); `krb.nasional.*`, `renstra.peringatan_dini.keterpenuhan_persen`, `irbi.skala.*`,
`hidromet.nasional.musim_2025.mengungsi` (mitigasi bab-03); `dibi.merapi2010.mengungsi`, `brr.aceh2004.*`, `dibi.lombok2018.*`,
`dibi.sulteng2018.mengungsi`, `bappenas.yogya2006.rumah_hancur`, `geologi.*.pengungsi` (mitigasi bab-04, bab-06);
`hidromet.nasional.kalender.*`, `hidromet.nasional.musim.median_meninggal_hilang`, `hidromet.nasional.pasca_elnino.*`,
`bmkg.dasarian_okt1_2026.enso_aso`, `bmkg.pdkm_okt2_2026.prov_awas_nasional`, `hidromet.nasional.lantai.rasio_batas_tinggi_model`,
`hidromet.nasional.kekeringan.dibi_terdampak_2018`, `sipongi.karhutla2015.luas_ha`, `dibi.nasional.kekeringan.terdampak.2026`,
`dibi.nasional.karhutla.kejadian.2026` (mitigasi bab-07); `uu7_2012.status_konflik.hari_maks`, `perpres46_2026.kondisi_keadaan_tertentu`
(mitigasi bab-09); `mitigasi.sel_program.*`, `renstra.ikp_logistik.*`, `lembaga.klaster.kepka308` (mitigasi bab-10); `bukti.p19.*`,
`bukti.p20.*`, `bukti.p03.*`, `bukti.p02.*` (mitigasi bab-02); registri `hidromet.nasional.lantai.*`, `dibi.sumatra2025.*`,
`irbi.nasional.persen_2019_2024`, `bukti.bangladesh_siklon.*`.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| rpjmn.kp080402b.status_darurat_standar.baseline | 75 % | pustaka ri-2025-perpres12-rpjmn (Lampiran III hlm. 913) | resmi | Perpres 12/2025 RPJMN 2025–2029 Lampiran III |
| rpjmn.kp080402b.status_darurat_standar.2029 | 100 % | pustaka ri-2025-perpres12-rpjmn (Lampiran III hlm. 913) | resmi | Perpres 12/2025 RPJMN 2025–2029 Lampiran III |
| rpjmn.kp080403.pascabencana_masif.2029 | 100 % | pustaka ri-2025-perpres12-rpjmn (Lampiran III hlm. 913) | resmi | Perpres 12/2025 RPJMN 2025–2029 Lampiran III |
| dibi.alam.meninggal_hilang.median_2015_2024 | 583,5 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| dibi.alam.per100rb.median_2015_2024_sp2020 | 0,216 per 100.000 penduduk | pustaka bnpb-2026-dibi, bps-2021-sp2020 | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB dan BPS SP2020 |
| dibi.alam.per100rb.median_2015_2024_bps2026 | 0,203 per 100.000 penduduk | pustaka bnpb-2026-dibi, bps-2026-penduduk | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB dan BPS 2026 |
| dibi.alam.per100rb.2025_sp2020 | 0,724 per 100.000 penduduk | pustaka bnpb-2026-dibi, bps-2021-sp2020 | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2025 dan BPS SP2020 |
| dibi.alam.per100rb.2018_sp2020 | 2,309 per 100.000 penduduk | pustaka bnpb-2026-dibi, bps-2021-sp2020 | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2018 dan BPS SP2020 |
| dibi.alam.meninggal_hilang.2026_sementara | 448 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| dibi.nasional.per100rb.median_2015_2024_sp2020 | 0,223 per 100.000 penduduk | pustaka bnpb-2026-dibi, bps-2021-sp2020 | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB dan BPS SP2020 |
| dibi.nasional.meninggal_hilang.2026_sementara | 569 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| renas.indikator_1c.arah_2030 | 62.235 per 100.000 penduduk | pustaka bnpb-2025-renas (hlm. 32) | asumsi-kebijakan | Pengolahan Pantau Bencana dari Renas PB 2025–2029 Tabel 2.8 |
| irb.arah_2030_kumulatif_persen | 5,86 % | pustaka ri-2025-perpres12-rpjmn (Lampiran III hlm. 913) | asumsi-kebijakan | Pengolahan Pantau Bencana dari PP 08.04 RPJMN (IRB turun 1,2% per tahun) |
| esdm2011_15.tingkat_aktivitas | 4 tingkat | pustaka esdm-2011-permen15 (Pasal 1 angka 10; Lampiran I angka 4–6) | resmi | Permen ESDM 15/2011 |
| juklak2022_3.kaji_cepat_jam | 24 jam | pustaka bnpb-2022-juklak-kajicepat (hlm. 7–8) | resmi | Juklak BNPB 3/2022 |
| juklak2022_3.laporan_awal_jam | 24 jam | pustaka bnpb-2022-juklak-kajicepat (hlm. 16) | resmi | Juklak BNPB 3/2022 |
| juklak2022_3.laporan_lanjutan_jam | 72 jam | pustaka bnpb-2022-juklak-kajicepat (hlm. 16) | resmi | Juklak BNPB 3/2022 |
| perban2017_5.r3p_hari_maks | 90 hari | pustaka bnpb-2017-r3p (Pasal 2 ayat (2)–(3), hlm. 4) | resmi | Perban BNPB 5/2017 |
| perban2017_5.r3p_masa_tahun | 3 tahun | pustaka bnpb-2017-r3p (Pasal 10, hlm. 10) | resmi | Perban BNPB 5/2017 |
| perban2024_4.hibah_tahapan | 9 tahap | pustaka bnpb-2024-hibah-rr (Pasal 7, hlm. 5) | resmi | Perban BNPB 4/2024 |
| perban2024_4.laporan_berkala_bulan | 3 bulan | pustaka bnpb-2024-hibah-rr (Pasal 28 ayat (2)–(3), hlm. 11) | resmi | Perban BNPB 4/2024 |
| sumatra2025.r3p_aceh_hari_selesai | 35 hari | pustaka kemenkopmk-2026-r3p-aceh, bnpb-2026-dibi | resmi | Pengolahan Pantau Bencana dari Kemenko PMK (11 Mar 2026) dan DIBI |
| sumatra2025.r3p_aceh_hari_ke_bnpb | 41 hari | pustaka kemenkopmk-2026-r3p-aceh, bnpb-2026-dibi | resmi | Pengolahan Pantau Bencana dari Kemenko PMK (11 Mar 2026) dan DIBI |
| mitigasi.sel_posisi.total | 39 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.aksi_wajib_saja | 28 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.berjalan_wajib_evaluasi | 8 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.rujukan_tata_kelola | 2 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.program_syarat | 1 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.program_kuat_dalam_negeri | 0 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.aksi_wajib_padanan_luar_negeri | 8 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.aksi_wajib_prabencana | 6 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.aksi_wajib_tanggap_darurat | 11 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.aksi_wajib_pascabencana | 11 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| mitigasi.sel_posisi.kepekaan_15_jenis.aksi_wajib_saja | 33 sel | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan; pemetaan penyusun | Pengolahan Pantau Bencana: posisi dalam negeri tertinggi per sel, kompendium_program.csv × 13 jenis × 3 fase (berkas bukti mitigasi bab-11, P3) |
| hidromet.kalender.bnt.hujan_kejadian_porsi_nov_apr | 84,9 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.jawa.hujan_kejadian_porsi_nov_apr | 75,8 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.sumatera.hujan_kejadian_porsi_nov_apr | 60,6 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.kalimantan.hujan_kejadian_porsi_nov_apr | 60,4 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.papua.hujan_kejadian_porsi_nov_apr | 58,3 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.sulawesi.hujan_kejadian_porsi_nov_apr | 56,8 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.maluku.hujan_kejadian_porsi_nov_apr | 41,6 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.maluku.hujan_kejadian_porsi_jun_okt | 46,1 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.maluku.hujan_mh_porsi_jun_okt | 74,4 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.jawa.kemarau_kejadian_porsi_jun_okt | 92,7 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.kalimantan.kemarau_kejadian_porsi_jun_okt | 75,2 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.sumatera.kemarau_kejadian_porsi_jun_okt | 67,4 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.sumatera.kemarau_kejadian_porsi_feb_mar | 19,1 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.gelombang.nasional_porsi_nov_apr | 61,5 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.jawa.gelombang_porsi_mei_agu | 53,7 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| hidromet.kalender.jawa.rob_porsi_mei_agu | 68,0 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 (skenario-hidromet/kalender_bulanan_pulau.csv) |
| respons.direktorat.w1.n_prov | 13 provinsi | pustaka bnpb-2025-otk-ubah (Pasal 74, hlm. 4) | resmi | Perban BNPB 11/2025 |
| respons.direktorat.w2.n_prov | 13 provinsi | pustaka bnpb-2025-otk-ubah (Pasal 77, hlm. 6) | resmi | Perban BNPB 11/2025 |
| respons.direktorat.w3.n_prov | 12 provinsi | pustaka bnpb-2025-otk-ubah (Pasal 79A, hlm. 7) | resmi | Perban BNPB 11/2025 |
| respons.w1.hidromet_puncak30 | 954.305 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.w2.hidromet_puncak30 | 468.967 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.w2.hidromet_puncak30_tanpa_bekasi2020 | 338.360 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.w3.hidromet_puncak30 | 180.213 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.nasional.hidromet_puncak30 | 981.483 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.w2.porsi_kota_bekasi2020 | 78,1 % | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.w1.geologi_rbrs_puncak30 | 245.961 jiwa | pustaka bnpb-2026-dibi, pantaubencana-2026-skenario-geologi | asumsi-kebijakan; olah dari rumah tercatat | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.w2.geologi_rbrs_puncak30 | 425.233 jiwa | pustaka bnpb-2026-dibi, pantaubencana-2026-skenario-geologi | asumsi-kebijakan; olah dari rumah tercatat | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.w3.geologi_rbrs_puncak30 | 464.120 jiwa | pustaka bnpb-2026-dibi, pantaubencana-2026-skenario-geologi | asumsi-kebijakan; olah dari rumah tercatat | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| dibi.ambon2019.mengungsi | 230.965 jiwa | dibi/kejadian_besar.csv `[kode=ambon2019,metrik=mengungsi,versi=DIBI].nilai` | resmi | DIBI BNPB, gempa Ambon–Maluku Tengah 2019 |
| dibi.padang2009.rumah_rb | 119.005 unit | dibi/kejadian_besar.csv `[kode=padang2009,metrik=rumah_rusak_berat,versi=DIBI].nilai` | resmi | DIBI BNPB, gempa Sumatera Barat 30 Sep 2009 |
| dibi.sumatra2025.mengungsi_aceh_buletin | 356.655 jiwa | dibi/kejadian_besar.csv `[kode=sumatra2025,metrik=mengungsi,versi=pustaka,verifikasi=primer].nilai` | resmi | Buletin Info Bencana BNPB Desember 2025 hlm. 6 |
| brr.aceh2004.kehilangan_tempat_tinggal | 635.384 jiwa (Aceh dan Nias, tidak terpilah) | pustaka brr-2009-nias (Bagian 1, Tabel 1.1, hlm. PDF 27 menurut riset E §E4; belum dibuka ulang penyusun) | resmi | BRR NAD–Nias (2009) |
| brr.nias2005.kehilangan_tempat_tinggal | 70.000 jiwa | pustaka brr-2009-nias (Bagian 1 (riset E §E4)) | resmi | BRR NAD–Nias (2009) |
| bappenas.yogya2006.kehilangan_rumah | 600.000 sampai 1.000.000 jiwa | pustaka bappenas-2006-dala-yogya (penilaian awal kerusakan dan kerugian, Juni 2006) | resmi; penilaian awal | Bappenas dan pemda DIY dan Jawa Tengah (2006) |
| respons.sumatra2025.mengungsi_sumut | 13.157 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.sumatra2025.mengungsi_sumbar | 10.830 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.sumatra2025.mh_aceh | 591 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.sumatra2025.mh_sumut | 414 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.sumatra2025.mh_sumbar | 337 jiwa | pustaka bnpb-2026-dibi | resmi | Pengolahan data Pantau Bencana dari DIBI BNPB (tarik 23 Okt 2026) |
| respons.model.jawa.pengungsi_w1 | 216.912 jiwa | pustaka pantaubencana-2026-skenario-geologi | estimasi-model; asumsi-kebijakan ×3,9 | Simulasi skenario Pantau Bencana, belum divalidasi |
| respons.model.jawa.pengungsi_w3 | 205.211 jiwa | pustaka pantaubencana-2026-skenario-geologi | estimasi-model; asumsi-kebijakan ×3,9 | Simulasi skenario Pantau Bencana, belum divalidasi |
| respons.model.mentawai.pengungsi_w3 | 486.584 jiwa | pustaka pantaubencana-2026-skenario-geologi | estimasi-model; asumsi-kebijakan ×3,9 | Simulasi skenario Pantau Bencana, belum divalidasi |
| respons.model.jawa_mmaks.pengungsi_w1 | 3.709.974 jiwa | pustaka pantaubencana-2026-skenario-geologi | estimasi-model; asumsi-kebijakan ×3,9 | Simulasi skenario Pantau Bencana, belum divalidasi |
| respons.model.jawa_mmaks.pengungsi_w3 | 3.854.305 jiwa | pustaka pantaubencana-2026-skenario-geologi | estimasi-model; asumsi-kebijakan ×3,9 | Simulasi skenario Pantau Bencana, belum divalidasi |
| perka_2008.beras_gram_hari | 400 gram per orang per hari | pustaka bnpb-2008-kebutuhan-dasar (Lampiran, hlm. PDF 9) | resmi | Perka BNPB 7/2008 |
| perka_2008.kkal_hari | 2.100 kkal per orang per hari | pustaka bnpb-2008-kebutuhan-dasar (Lampiran, hlm. PDF 9) | resmi | Perka BNPB 7/2008 |
| perka_2008.hunian_m2_orang | 3 m² per orang | pustaka bnpb-2008-kebutuhan-dasar (Lampiran, hlm. PDF 9) | resmi | Perka BNPB 7/2008 |
| perka_2008.jamban_orang | 20 orang per jamban | pustaka bnpb-2008-kebutuhan-dasar (Lampiran, hlm. PDF 13) | resmi | Perka BNPB 7/2008 |
| juklak2023_3.huntara_m2_orang | 3,5 m² per orang | pustaka bnpb-2023-huntara (hlm. 4) | resmi | Juklak BNPB 3/2023 |
| juklak2023_1.dth_rp_bulan | 600.000 Rp per bulan | pustaka bnpb-2023-dth (hlm. 3) | resmi | Juklak BNPB 1/2023 |
| juklak2023_1.dth_bulan | 3 bulan | pustaka bnpb-2023-dth (hlm. 3) | resmi | Juklak BNPB 1/2023 |
| juklak2024_3.buffer_stock_persen | 10 % dari jumlah pengadaan | pustaka bnpb-2024-juklak-logistik (hlm. 3) | resmi | Juklak BNPB 3/2024 |
| respons.w1.beras_ton_hari | 381,7 ton per hari | pustaka bnpb-2008-kebutuhan-dasar, bnpb-2026-dibi | asumsi-kebijakan | Pengolahan Pantau Bencana: lantai perencanaan (berkas bukti mitigasi bab-11, P5) × standar Perka BNPB 7/2008 |
| respons.w1.jamban | 47.715 jamban | pustaka bnpb-2008-kebutuhan-dasar, bnpb-2026-dibi | asumsi-kebijakan | Pengolahan Pantau Bencana: lantai perencanaan (berkas bukti mitigasi bab-11, P5) × standar Perka BNPB 7/2008 |
| respons.w2.beras_ton_hari | 187,6 ton per hari | pustaka bnpb-2008-kebutuhan-dasar, bnpb-2026-dibi | asumsi-kebijakan | Pengolahan Pantau Bencana: lantai perencanaan (berkas bukti mitigasi bab-11, P5) × standar Perka BNPB 7/2008 |
| respons.w3.beras_ton_hari | 185,6 ton per hari | pustaka bnpb-2008-kebutuhan-dasar, bnpb-2026-dibi | asumsi-kebijakan | Pengolahan Pantau Bencana: lantai perencanaan (berkas bukti mitigasi bab-11, P5) × standar Perka BNPB 7/2008 |
| respons.w3.jamban | 23.206 jamban | pustaka bnpb-2008-kebutuhan-dasar, bnpb-2026-dibi | asumsi-kebijakan | Pengolahan Pantau Bencana: lantai perencanaan (berkas bukti mitigasi bab-11, P5) × standar Perka BNPB 7/2008 |

**Catatan untuk penggabung:** kunci kalender, jendela pengungsi, dan sel matriks adalah hitungan lintas baris; dapat diganti bentuk A bila
paket `skenario-hidromet` menyimpan baris ringkas per pulau, bila paket `dibi` menyimpan puncak 30 hari per direktorat, dan bila
`program-terbukti/sel_mitigasi.csv` dibuat. Penulis memakai `fmt=3` untuk `*.per100rb.*` seri SP2020 dan `fmt=1` untuk porsi kalender.

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/mitigasi/bukti/bab-11.pustaka.json` (kunci `id` dipakai kolom `pustaka` registri). Entri yang sama dengan
berkas bukti lain disalin dengan `id` yang sama. Dua berita sekunder (ANTARA R3P Aceh; Suara Surabaya pengungsi Sumatra) hanya disebut sebagai
"dibantah oleh" dan tidak masuk pustaka registri. Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| ri-2007-uu24 | Republik Indonesia (2007). Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana | primer |
| ri-2012-uu7 | Republik Indonesia (2012). Undang-Undang Nomor 7 Tahun 2012 tentang Penanganan Konflik Sosial | primer |
| ri-2023-uu17 | Republik Indonesia (2023). Undang-Undang Nomor 17 Tahun 2023 tentang Kesehatan | primer |
| ri-2008-pp21 | Republik Indonesia (2008). Peraturan Pemerintah Nomor 21 Tahun 2008 tentang Penyelenggaraan Penanggulangan Bencana | primer |
| ri-2018-perpres17 | Republik Indonesia (2018). Peraturan Presiden Nomor 17 Tahun 2018 tentang Penyelenggaraan Penanggulangan Bencana dalam Keadaan Tertentu | primer |
| ri-2026-perpres46 | Republik Indonesia (2026). Peraturan Presiden Nomor 46 Tahun 2026 tentang Perubahan atas Peraturan Presiden Nomor 17 Tahun 2018 (…) | primer |
| ri-2025-perpres12-rpjmn | Republik Indonesia (2025). Peraturan Presiden Nomor 12 Tahun 2025 tentang Rencana Pembangunan Jangka Menengah Nasional Tahun 2025–2029 | primer |
| ri-2024-perpres12-bmkg | Republik Indonesia (2024). Peraturan Presiden Nomor 12 Tahun 2024 tentang Badan Meteorologi, Klimatologi, dan Geofisika | primer |
| ri-2020-inpres3 | Republik Indonesia (2020). Instruksi Presiden Nomor 3 Tahun 2020 tentang Penanggulangan Kebakaran Hutan dan Lahan | primer |
| bnpb-2025-renas | BNPB (2025). Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2025 tentang Rencana Nasional Penanggulangan (…) | primer |
| bnpb-2025-renstra | BNPB (2025). Peraturan Badan Nasional Penanggulangan Bencana Nomor 5 Tahun 2025 tentang Rencana Strategis Badan (…) | primer |
| bnpb-2025-otk | BNPB (2025). Peraturan Badan Nasional Penanggulangan Bencana Nomor 6 Tahun 2025 tentang Organisasi dan Tata Kerja Badan (…) | primer |
| bnpb-2025-otk-ubah | BNPB (2025). Peraturan Badan Nasional Penanggulangan Bencana Nomor 11 Tahun 2025 tentang Perubahan atas Peraturan Badan (…) | primer |
| bnpb-2024-peringatan-dini | BNPB (2024). Peraturan Badan Nasional Penanggulangan Bencana Nomor 2 Tahun 2024 tentang Sistem Peringatan Dini Bencana | primer |
| bnpb-2020-dsp | BNPB (2020). Peraturan Badan Nasional Penanggulangan Bencana Nomor 4 Tahun 2020 tentang Penggunaan Dana Siap Pakai | primer |
| bnpb-2016-skpdb | BNPB (2016). Peraturan Kepala Badan Nasional Penanggulangan Bencana Nomor 3 Tahun 2016 tentang Sistem Komando (…) | primer |
| bnpb-2023-juklak-skpdb | BNPB (2023). Petunjuk Pelaksanaan Nomor 10 Tahun 2023 tentang Sistem Komando Penanganan Darurat Bencana pada Status (…) | primer |
| bnpb-2018-pengungsi | BNPB (2018). Peraturan Badan Nasional Penanggulangan Bencana Nomor 3 Tahun 2018 tentang Penanganan Pengungsi pada (…) | primer |
| bnpb-2008-kebutuhan-dasar | BNPB (2008). Peraturan Kepala Badan Nasional Penanggulangan Bencana Nomor 7 Tahun 2008 tentang Pedoman Tata Cara (…) | primer |
| bnpb-2017-r3p | BNPB (2017). Peraturan Badan Nasional Penanggulangan Bencana Nomor 5 Tahun 2017 tentang Penyusunan Rencana Rehabilitasi (…) | primer |
| bnpb-2025-juklak15 | BNPB (2025). Petunjuk Pelaksanaan Bantuan Dana Tunggu Hunian untuk Provinsi Aceh, Sumatera Utara dan Sumatera Barat (…) | primer |
| bnpb-2025-juklak16 | BNPB (2025). Petunjuk Pelaksanaan Penyelenggaraan Klaster Logistik Penanggulangan Bencana Nomor 16 Tahun 2025 | primer |
| bnpb-2023-renkon | BNPB (2023). Peraturan Badan Nasional Penanggulangan Bencana Nomor 2 Tahun 2023 tentang Penyusunan Rencana Kontingensi (…) | primer |
| bnpb-2025-rpkb | BNPB (2025). Peraturan Badan Nasional Penanggulangan Bencana Nomor 9 Tahun 2025 tentang Penyusunan dan Uji Coba Rencana (…) | primer |
| bnpb-2026-juklak-gladi | BNPB (2026). Petunjuk Pelaksanaan Kepala BNPB Nomor 4 Tahun 2026 tentang Pemenuhan Standar Pelayanan Minimal Sub-Urusan (…) | primer |
| bnpb-2025-destana | BNPB (2025). Peraturan Badan Nasional Penanggulangan Bencana Nomor 7 Tahun 2025 tentang Desa dan Kelurahan Tangguh Bencana | primer |
| bnpb-2023-juklak7 | BNPB (2023). Petunjuk Pelaksanaan Nomor 7 Tahun 2023 tentang Standar Data Kejadian dan Dampak Bencana | primer |
| bnpb-2025-buletin-des | BNPB (2026). Buletin Info Bencana Vol. 6 No. 12, Desember 2025 | primer |
| bnpb-2026-dibi | BNPB (2026). Data Informasi Bencana Indonesia (DIBI), dasbor publik 1 (pdsi_staging.mv_dibi_dampak_by_kejadian) | primer |
| bnpb-irbi | BNPB (tanpa tahun). Indeks Risiko Bencana Indonesia (IRBI) kabupaten/kota 2015–2025 | primer |
| bps-2021-sp2020 | BPS (2021). Hasil Sensus Penduduk 2020 | primer |
| bps-2026-penduduk | BPS (2026). Jumlah Penduduk Pertengahan Tahun (Ribu Jiwa), 2026 | primer |
| bmkg-2026-siaran-musim-hujan | BMKG (2026). BMKG: El Niño Sangat Kuat sedang Terjadi, Musim Hujan 2026/2027 Diprediksi Datang Lebih Lambat | primer |
| bmkg-2026-dinamika-okt1 | BMKG (2026). Analisis Dinamika Atmosfer Dasarian I Oktober 2026 | primer |
| bmkg-2026-siaran-asap | BMKG (2026). BMKG: Pemerintah Manfaatkan Dry Ice untuk Urai Kabut Asap Karhutla di Sumatra dan Kalimantan | primer |
| noaa-cpc-2026-ensodisc | NOAA Climate Prediction Center (2026). ENSO Diagnostic Discussion | primer |
| kemenkopmk-2025-sinkronisasi-irb | Kemenko PMK (2025). Kemenko PMK Dorong Sinkronisasi Indeks Risiko Bencana untuk Perkuat Ketahanan Daerah | primer |
| brr-2009-nias | BRR NAD–Nias (2009). Nias: Membangun melalui jalan yang jarang dilalui | primer |
| bappenas-2006-dala-yogya | Bappenas (2006). Preliminary Damage and Loss Assessment: Yogyakarta and Central Java Natural Disaster | primer |
| wmo-2022-peringatan-dini | WMO (2022). UN warns that half the world is not prepared for disasters | primer |
| pantaubencana-2026-program-terbukti | Pantau Bencana (2026). Paket data program-terbukti: kompendium program, bukti dampak, organisasi BNPB, Renstra, Renas, RIPB | olahan tim (rubrik paket) |
| pantaubencana-2026-skenario-geologi | Pantau Bencana (2026). Paket data skenario-geologi: skenario ilustratif dan kepekaan Mmaks gempa, tsunami, dan gunung api per (…) | olahan tim (estimasi-model) |
| haque-2012-siklon | Haque dkk. (2012). Reduced death rates from cyclones in Bangladesh: What more needs to be done? | primer |
| undrr-2020-bhola | Denis Mc Clean (2020). What's changed since the 1970 Great Bhola Cyclone | primer |
| odisha-2013-phailin | Government of Odisha (2013). India: Cyclone Phailin in Odisha, October 2013, Rapid Damage and Needs Assessment Report | primer |
| bankdunia-2013-phailin | World Bank (2013). Cyclone Phailin in India: Early warning and timely actions saved lives | primer |
| bnpb-2011-jitupasna | BNPB (2011). Peraturan Kepala Badan Nasional Penanggulangan Bencana Nomor 15 Tahun 2011 tentang Pedoman Pengkajian (…) | primer |
| bnpb-2011-relawan | BNPB (2011). Peraturan Kepala Badan Nasional Penanggulangan Bencana Nomor 17 Tahun 2011 tentang Pedoman Relawan (…) | primer |
| bnpb-2017-rr | BNPB (2017). Peraturan Badan Nasional Penanggulangan Bencana Nomor 6 Tahun 2017 tentang Penyelenggaraan Rehabilitasi (…) | primer |
| bnpb-2022-juklak-kajicepat | BNPB (2022). Petunjuk Pelaksanaan Nomor 3 Tahun 2022 tentang Pengkajian Cepat pada Keadaan Darurat Bencana | primer |
| bnpb-2023-dth | BNPB (2023). Petunjuk Pelaksanaan Nomor 1 Tahun 2023 tentang Bantuan Dana Tunggu Hunian | primer |
| bnpb-2023-huntara | BNPB (2023). Petunjuk Pelaksanaan Nomor 3 Tahun 2023 tentang Pemberian Bantuan Hunian Sementara bagi Pengungsi Korban (…) | primer |
| bnpb-2023-juklak-penilaian-awal | BNPB (2023). Petunjuk Pelaksanaan Nomor 4 Tahun 2023 tentang Penilaian Awal | primer |
| bnpb-2023-juklak-penilaian-perkembangan | BNPB (2023). Petunjuk Pelaksanaan Nomor 6 Tahun 2023 tentang Penilaian Perkembangan Penanganan Darurat Bencana | primer (metadata) |
| bnpb-2023-juklak-pengungsi-terpilah | BNPB (2023). Petunjuk Pelaksanaan Nomor 9 Tahun 2023 tentang Pengelolaan Data dan Informasi Pengungsi Terpilah pada (…) | primer (metadata) |
| bnpb-2024-hibah-rr | BNPB (2024). Peraturan Badan Nasional Penanggulangan Bencana Nomor 4 Tahun 2024 tentang Penyelenggaraan Hibah (…) | primer |
| bnpb-2024-juklak-logistik | BNPB (2024). Petunjuk Pelaksanaan Nomor 3 Tahun 2024 tentang Pemberian Bantuan Pemerintah Logistik dan Peralatan (…) | primer |
| bnpb-2024-juklak-stimulan | BNPB (2024). Petunjuk Pelaksanaan Nomor 5 Tahun 2024 tentang Bantuan Dana Siap Pakai Stimulan Perbaikan/Pembangunan (…) | primer (metadata) |
| bnpb-2010-perka17-rr | BNPB (2010). Peraturan Kepala Badan Nasional Penanggulangan Bencana Nomor 17 Tahun 2010 tentang Pedoman Umum (…) | primer (metadata) |
| esdm-2011-permen15 | Kementerian ESDM (2011). Peraturan Menteri Energi dan Sumber Daya Mineral Nomor 15 Tahun 2011 tentang Pedoman Mitigasi Bencana (…) | primer |
| kemenkoinfra-2026-inpres18 | Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan (2025). Inpres 18/2025: Percepatan Penanganan Darurat, Rehabilitasi, dan Rekonstruksi Pascabencana Alam di (…) | primer (ringkasan halaman) |
| kemenkopmk-2026-r3p-aceh | Kemenko PMK (2026). Kemenko PMK Perkuat Sinergi Pemulihan Pascabanjir Aceh melalui Akselerasi R3P | primer |
| kemenkopmk-2025-rakor-rr | Kemenko PMK (2025). Kemenko PMK Gelar Rakor Sinergisitas Multipihak dalam Rehabilitasi dan Rekonstruksi Pascabencana | primer |

---

## Catatan perbaikan pemeriksa (24 Okt 2026)

Empat temuan diterima dan dikerjakan (T4.1, T4.3, I4.1, I4.4, I4.5, Inti P4, Koreksi butir 7, Komponen Gambar 11.2; T5.4, T5.8, Inti P5,
Kerangka bab, Komponen Tabel 11.4; `bab-11.angka.json` dan `bab-11.pustaka.json`). Hitung ulang dari `riset/mentah/dibi_hidromet.json`
mengonfirmasi angka pemeriksa (gelombang Jawa 95 kejadian, 18 di Juli 2018, tanpa Juli 2018 33/77 = 42,9% lawan 44,2%; rob Jawa
2020–2023 dan 1 kejadian 2025; Juni 2020 20 dan Mei 2022 18 kejadian). Bagian yang tidak diikuti apa adanya, dengan alasan:

1. Temuan 2 menyebut jenis musim hujan baru "dipisah setelah Juklak 7/2023". Cache menunjukkan "Banjir Bandang", "Banjir dan Tanah
   Longsor", dan "Banjir Rob" muncul sejak 2018 (patahan kategori 2018, KERANGKA §2 butir 7), dan 2024 tidak lengkap; yang ditulis
   adalah tahun dari data, bukan Juklak 7/2023.
2. Temuan 2 menyebut `n_tahun` banjir_bandang, banjir_longsor, dan rob "1–5 tahun". Di `kalender_bulanan_pulau.csv` maksimum per sel
   banjir_longsor 6, banjir_bandang dan rob 5; yang ditulis angka berkas.
3. Temuan 3 meminta buku BRR Tabel 1.1 dibuka dan halamannya dikutip langsung. Pembacaan 24 Okt 2026 gagal (PDF arsip BNPB melampaui
   batas ukuran pembaca) dan berkas tidak diunduh tanpa izin pemilik. Halaman ditulis "hlm. PDF 27 menurut riset E §E4" dengan syarat
   dicek ke buku sebelum isi utama; label resmi tetap menurut KEPUTUSAN T14.
4. Temuan 4: selain memisahkan definisi, hitung ulang menunjukkan lantai Wilayah I dengan stok Buletin jatuh ke Merapi 2010 (447.982,
   pengungsi tercatat DIBI), bukan ke Aceh 2004 seperti tulisan lama; baris kepekaan diganti ke angka itu.
