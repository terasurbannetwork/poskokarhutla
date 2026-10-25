---
kajian: mitigasi
bab: 3
judul: METODOLOGI
jenis: berkas bukti
status: draf bukti
disusun: 24 Oktober 2026
dasar: KERANGKA.md §2, §5 Bab 3, §6, §7, §8; KEPUTUSAN.md; PEDOMAN-DESAIN.md §B5.27, §C9; Buku Pegangan L56–L64
---

# BAB 3 METODOLOGI: berkas bukti

Berkas ini bahan penulis Bab 3 Kajian 2 (*Grand Design Mitigasi Bencana Indonesia 2026–2030*). Penulis bab hanya menulis
dari berkas ini dan dari registri angka (`data/angka.json`, ditambah usulan `bab-03.angka.json` setelah digabung sesi
induk). Kalimat faktual yang tidak ada di sini dipindah ke Celah atau dihapus (PEDOMAN §C9).

**Konvensi.**

- Jalur berkas relatif ke `data/kajian-bnpb/`. Kunci registri ditulis dengan awalan `kunci:`. Kunci yang sudah diusulkan
  berkas bukti lain dan belum digabung ditandai asalnya, mis. `(usulan air bab-03)` atau `(usulan mitigasi bab-01)`.
- Label keyakinan: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan` (KERANGKA §2 butir 6; NASKAH-SPEK §9).
  Tambahan setelah titik koma menjelaskan asal, mis. `asumsi-kebijakan; analisis penyusun atas data resmi`. Status
  `sekunder` berarti dokumen penerbit belum dibuka; angka sekunder hanya boleh tampil sebagai pembanding di tabel
  rekonsiliasi. Label "penilaian pakar" tidak dipakai di bab ini.
- Butir bertanda **[dihitung penyusun bukti]** dihitung 24 Okt 2026 dari berkas paket yang disebut, dengan cara hitung
  tertulis. Hitungan itu belum ada di skrip bangun paket; sebelum naskah final pemilik paket (`pipa-data`) perlu
  memindahkannya ke `bangun/` supaya dapat diulang.
- Paket `turunan` (`data/turunan/*.csv`, skrip `bangun/turunan.py`) dibangun ulang penyusun bukti ke folder sementara pada
  24 Okt 2026: kelima CSV identik byte per byte dengan salinan di repo dan self-check hijau.
- Bagian "Inferensi" adalah analisis tim penyusun, bukan fakta sumber, dan tidak boleh ditulis di naskah dengan suara
  sumber.

---

## 0. Kontrak bab (dari KERANGKA §5, BAB 3)

**Judul:** BAB 3 METODOLOGI (9 hlm).

**Subbab:** 3.1 Data, Produsen, dan Label Keyakinan; 3.2 IRBI: Patahan Skala 2025 dan Aturan Pakai; 3.3 DIBI: Cakupan,
Patahan Seri, dan Batas Tafsir; 3.4 Skenario Terburuk yang Masuk Akal; 3.5 Kemungkinan dan Skala Dampak; 3.6 Tabel
Kerusakan dan Matriks Ketersediaan Kuantifikasi; 3.7 Kerugian Materiil dan Imateriil; 3.8 Aturan Daftar Perhatian dan
Provinsi Utama; 3.9 Rekonsiliasi Angka; 3.10 Keterbatasan.

**Tujuan bab:** menetapkan aturan yang membuat kartu skenario, daftar perhatian, dan sasaran dapat diperiksa.

**Pertanyaan kunci dan subbab yang dijawabnya:**

| No | Pertanyaan kunci | Subbab |
| --- | --- | --- |
| P1 | Bagaimana IRBI dan DIBI dibaca tanpa membandingkan skala yang patah? | 3.1, 3.2, 3.3, 3.8 |
| P2 | Bagaimana skenario terburuk, lantai, kemungkinan, dan dampak didefinisikan untuk semua jenis? | 3.4, 3.5 |
| P3 | Metrik apa yang dapat dikuantifikasi per jenis, dan dengan label apa? | 3.6, 3.7 |
| P4 | Angka mana yang berbeda versi? | 3.9, 3.10 |

**Aturan daftar perhatian (3.8, kutipan KERANGKA):** per kelompok bahaya. Hidrometeorologi: (a) IRBI 2025 bahaya itu di
kelas nilai teratas nasional, (b) kejadian tercatat ≥ 3 dari 11 tahun 2015–2025, (c) meninggal dan hilang atau mengungsi
di kuartil atas; masuk bila ≥ 2 syarat. Geologi: (a) IRBI 2025 di kelas nilai teratas, (b) paparan KRB atau jiwa pesisir
rendah tiba ≤ 30 menit (Estimasi model) di kuartil atas, (c) kejadian berkorban sejak 2008; masuk bila ≥ 2 syarat.
Provinsi utama = provinsi dengan jumlah kab daftar perhatian terbanyak atau meninggal dan hilang DIBI 2015–2025 tertinggi;
kedua kriteria ditulis. Uji kepekaan ambang; label Asumsi kebijakan.

**Temuan kunci yang diharapkan KERANGKA, hasil cek ke data 24 Okt 2026:**

| Butir KERANGKA | Hasil cek | Status |
| --- | --- | --- |
| IRBI 2025: nilai per bahaya bilangan bulat; total = jumlah kolom bahaya di 0% kab; rerata naik 19,43; Spearman 0,589; rerata 147,95 belum terbit | `irbi/irbi_bukti_skala_tahunan.csv` baris 2025: 147,9496; +19,4256; 0,5889; porsi 0,0; `irbi_bukti_skala_bahaya.csv` porsi bilangan bulat 1,0 di 9 bahaya | cocok |
| DIBI: `is_bencana` sejak 2024; nonalam dan sosial praktis sejak 2024 | `dibi/rekap_nasional_tahunan.csv`: cakupan bencana = semua laporan di 2008–2023; nonalam+sosial+lainnya 0–15 kejadian per tahun 2018–2023, 76,5 (2024), 363 (2025) | cocok |
| Banjir bandang, banjir dan longsor, rob, puting beliung muncul 2018, kosong 2024 | `riset/mentah/dibi_hidromet.json`: keempatnya pertama 2018, tidak ada baris 2024; tiga pertama juga tidak ada 2019 | cocok |
| Tanah longsor 2024 hanya 219 kejadian | 219 cakupan semua laporan; 207 cakupan bencana (= CKAN 207) | cocok; dua cakupan ditulis |
| Lantai nasional musim hujan 2025/26 1.692 meninggal dan hilang, di atas batas atas model 2020/21 (1.204) | `skenario-hidromet/musim_hujan.csv` 1.506 + 186; `kartu_skenario.csv` La Niña 524,8–1.203,8 | cocok untuk lantai agregat |
| Lantai per jenis dari `skenario-hidromet/lantai_jenis.csv` (prinsip 9; §5 Bab 3) | berkas tidak ada di `data/skenario-hidromet/` (dicek 24 Okt 2026) | **tidak terpenuhi**: lantai per jenis belum ditetapkan (P2 Celah) |
| Lantai geologi: Pangandaran 2006 (665), Mentawai 2010 (447 + 56), Selat Sunda 2018 (437 + 16) | `skenario-geologi/analog.csv` baris `pangandaran-2006` 665; `dibi/kejadian_besar.csv` `mentawai2010` 447 + 56, `selatsunda2018` 437 + 16 | cocok (P2) |
| La Niña 7 dari 18 musim; El Niño kuat 3 dari 18 | `musim_hujan.csv`: La Niña 2008, 2010, 2011, 2017, 2020, 2021, 2022; ONI NDJ ≥ 1,5: 2009, 2015, 2023 | cocok |
| Gempa: laju Poisson M6+ platform atau PuSGeN | laju M6+ 12,97 per tahun lolos uji balik (`public/gempa/data/laju.json`); PuSGeN 2024 kini terbuka dengan periode ulang segmen (riset E §E1) | cocok setelah perbaikan: megathrust Jawa dari PuSGeN; gempa lain dari laju M6+ per provinsi (Tabel 3.4), dengan catatan bahwa laju itu peluang kejadian pemicu, bukan peluang skenario korban |
| Rekonsiliasi kejadian 2024, jiwa terpapar, kapasitas, segmen megathrust, peringatan dini, korban kejadian besar (termasuk Cianjur 2022 DIBI lawan R3P) | semua versi ditemukan di sumbernya (P4 butir 1–18); ada versi tambahan: kapasitas 62% (RPJMN), peringatan dini 6,00 (RPJMN), segmen "16" dibantah PuSGeN | cocok setelah butir 18 (Cianjur) ditambahkan; versi awal berkas ini melewatkan Cianjur |

**Komponen yang direncanakan:** Tabel 3.1 sampai 3.8 dan Gambar 3.1 (rinci di bagian Komponen).

**Status data menurut KERANGKA:** ada; turunan baru DIBI hidrometeorologi per kab per tahun dan DIBI gempa per kab.
Hasil cek: keduanya ada (`skenario-hidromet/dibi_kab_tahun.csv` 16.404 baris; `dibi_geologi_kab_tahun.csv` 779 baris)
tetapi belum didokumentasikan di README paket (lihat P1 Celah).

---

## P1. Bagaimana IRBI dan DIBI dibaca tanpa membandingkan skala yang patah?

### Inti

IRBI 2025 berdiri sendiri: skalanya berubah (nilai per bahaya bilangan bulat, total tidak lagi jumlah kolom bahaya,
rerata naik 19,43 poin, Spearman peringkat kab dengan 2024 hanya 0,589), sehingga tren IRB hanya 2015–2024 dan capaian
penurunan 1,2% per tahun untuk 2025 tidak dapat diukur sampai BNPB menerbitkan baseline skala baru. DIBI dibaca dengan
penanda patahan 2018 (kategori) dan 2024 (ambang `is_bencana`, nonalam dan sosial), dengan cakupan yang selalu disebut,
karena paket kajian sendiri memakai dua cakupan berbeda. IRBI dan DIBI tidak saling memvalidasi: secara nasional korelasi
peringkat keduanya lemah dan untuk banjir justru negatif (−0,31), sehingga daftar perhatian yang meminta dua syarat dari
sumber berbeda lebih tahan daripada salah satu sendiri; tetapi aturan 3.8 seperti tertulis menghasilkan daftar yang
ukurannya ditentukan sifat data (banjir 253 kab, kekeringan 9 kab), bukan risiko.

### Temuan bersumber

**Data, produsen, dan label (3.1)**

- "Data Bencana adalah Data mengenai Bencana yang sesuai kriteria yang ditetapkan oleh walidata bencana" (Perban BNPB
  1/2023 Pasal 1 angka 3); Walidata Bencana adalah unit kerja BNPB yang mengumpulkan, memeriksa, mengelola, dan
  menyebarluaskan data dari produsen (Pasal 1 angka 5); Produsen Data Bencana adalah unit kerja di lingkungan BNPB yang
  menghasilkan data berdasarkan tugas dan kewenangannya (Pasal 1 angka 6). Sumber: korpus
  `data/raw/hukum/teks/perban-nomor-1-tahun-2023.json` hlm. 2; pustaka `bnpb-2023-satudata`. [resmi]
- KERANGKA §2 butir 19: keluaran simulasi platform Pantau Bencana bukan Data Bencana menurut Perban 1/2023; tiap gambar
  dan tabel model memuat pernyataan produsen di samping label Estimasi model. [asumsi-kebijakan, posisi kajian]
- Paket data kajian dan produsen aslinya: DIBI (Pusdatinkom BNPB, Superset dasbor publik 1, ditarik 23 Okt 2026 15.23
  WIB), IRBI dan KRB 2022–2026 (InaRISK BNPB, `apiv4/data-irbi-full` dan `apiv4/kajian-summary`), ONI (NOAA CPC), SiPongi
  (Kementerian Kehutanan), PuSGeN 2024 (Kementerian PU), WHO, BPS, peraturan (korpus JDIH BNPB lokal 191 berkas teks).
  Hanya DIBI, IRBI, dan KRB yang berasal dari produsen Data Bencana dalam arti Perban 1/2023 Pasal 1 angka 6; yang lain
  penerbit. Sumber: README paket `dibi`, `irbi`, `skenario-hidromet`, `skenario-geologi`, `nonalam-sosial`;
  `riset/E-dokumen-primer.md` §E1. [resmi untuk daftar penerbit]
- Paket memakai empat label keyakinan dengan arti yang sama dengan registri; paket `dibi` menambahkan kolom `verifikasi`
  (primer/sekunder) dan `turunan_penyusun`; paket `nonalam-sosial` menambahkan `sekunder` dan `narasi` (baris tanpa
  angka). Sumber: `dibi/README.md` bagian Label; `nonalam-sosial/README.md` bagian Label. [resmi untuk konvensi]
- Rubrik kekuatan bukti program (dipakai Bab 11): `kuat` = deret pra-pasca resmi atau studi bertinjauan; `sedang` =
  terukur tetapi satu kejadian, tanpa pembanding terkontrol, atau model terdokumentasi; `lemah` = laporan sendiri pelaksana
  atau klaim pejabat; `belum-terbukti` = evaluasi dampak tidak ditemukan. Dari 25 program kompendium: 2 kuat, 8 sedang,
  11 lemah, 4 belum terbukti. Kedua program berbukti kuat ada di luar negeri (pengendalian air tanah Tokyo dan Bangkok;
  paket kesiapsiagaan siklon Bangladesh, yang terbukti paketnya, bukan tiap unsur). Sumber:
  `program-terbukti/README.md` §2 dan §4 butir 1; `program-terbukti/kompendium_program.csv` kolom `kekuatan`
  [dihitung penyusun bukti]. [resmi untuk rubrik paket; kekuatan per baris menurut sumbernya]

**IRBI: patahan skala 2025 dan aturan pakai (3.2)**

- Nilai per bahaya 2025 semuanya bilangan bulat (porsi bilangan bulat 1,0 di sembilan bahaya) dengan 24 sampai 34 nilai
  unik per bahaya; 2024 kontinu (banjir 310 nilai unik, 2025 hanya 29). Sumber: `irbi/irbi_bukti_skala_bahaya.csv`;
  `kunci: irbi.skala.banjir_nilai_unik_2024`, `kunci: irbi.skala.banjir_nilai_unik_2025`. [asumsi-kebijakan; analisis
  penyusun atas data resmi]
- `total` sama dengan jumlah kolom bahaya pada 58,03% kab 2015, 16,15% kab 2024, dan 0% kab 2025. Sumber:
  `irbi/irbi_bukti_skala_tahunan.csv` kolom `porsi_total_sama_jumlah_bahaya`; `kunci: irbi.skala.porsi_total_jumlah_2015`,
  `kunci: irbi.skala.porsi_total_jumlah_2025`. [asumsi-kebijakan; analisis penyusun atas data resmi]
- Rerata nasional turun tiap tahun 2016–2024 (−5,85 sampai −1,76 poin), lalu naik +19,43 ke 147,95 pada 2025; porsi kab
  yang naik 63,04% (paling tinggi 22,57% pada 2016–2024); Spearman peringkat kab dengan tahun sebelumnya 0,589 (paling
  rendah 0,88 pada 2016–2024); total maksimum 214,8 menjadi 278,51. Rerata 2025 belum pernah diterbitkan BNPB. Sumber:
  `irbi/irbi_bukti_skala_tahunan.csv`; `irbi/README.md` §2 dan §4; `kunci: irbi.nasional.2025_rerata`,
  `kunci: irbi.skala.perubahan_2025`, `kunci: irbi.skala.porsi_kab_naik_2025`, `kunci: irbi.skala.spearman_2025`,
  `kunci: irbi.skala.spearman_2016`, `kunci: irbi.skala.maks_2024`, `kunci: irbi.skala.maks_2025`. [asumsi-kebijakan;
  turunan dari data resmi]
- Kesimpulan paket: IRBI 2025 tidak boleh dibandingkan dengan 2015–2024; tren hanya 2015–2024. Kesimpulan "skala berubah"
  adalah tafsiran penyusun paket dan belum dikonfirmasi dokumen BNPB. Sumber: `irbi/README.md` §4. [asumsi-kebijakan]
- Seri resmi 2019–2024: 144,02; 141,65; 138,81; 135,56; 132,25; 128,52; turun 10,76% (15,5 poin) dari baseline 2019,
  tereproduksi persis dengan basis 498 kab ber-`fix_values`. Sumber: Renstra hlm. 52 dan Tabel 1.6; `irbi/README.md` §3,
  §5; `kunci: irbi.nasional.2019`, `kunci: irbi.nasional.2024`, `kunci: irbi.nasional.persen_2019_2024`. [resmi]
- Bila 2025 dibandingkan naif dengan 2024, IRB tampak naik 15,1% (147,95 / 128,52 − 1), berlawanan arah dengan sasaran
  turun 1,2% per tahun. Sumber: `irbi/irbi_bukti_skala_tahunan.csv` [dihitung penyusun bukti];
  `kunci: irbi.nasional.persen_naif_2024_2025`. [asumsi-kebijakan; ilustrasi efek patahan, bukan perubahan risiko]
- Sasaran penurunan IRB: Renas 4.c 1,2% (2025) dan 1,2% (2029) (Renas Tabel 2.8 hlm. 32); IKU RPJMN PP 08.04 baseline
  1,54 (2023), target 1,2 (Lampiran III hlm. 913, riset E §E11b); Renstra "1,2% setiap tahunnya" (hlm. 128, 132). Sumber:
  korpus `perban-nomor-1-tahun-2025.json` hlm. 32; `perban-nomor-5-tahun-2025.json` hlm. 128, 132;
  `kunci: rpjmn.pp_irb.baseline_2023` (usulan mitigasi bab-01). [resmi]
- Kelas kab 2025 dari kolom `status` API: 169 Tinggi, 345 Sedang (Sedang tertinggi 175,68, Tinggi terendah 176,14). Kelas
  2015–2024 tidak ada di API; ambang > 144 disimpulkan dari kelas resmi provinsi (174 dari 174 sel Renstra Tabel 1.1) dan
  cocok dengan Renas 2023 (168 Tinggi, 346 Sedang). Kelas provinsi 2025 (15 Tinggi, 23 Sedang menurut ambang turunan ~176)
  bukan angka terbit. Kelas per bahaya tidak ada di sumber mana pun yang dibuka. Sumber: `irbi/README.md` §3;
  `irbi/irbi_hitung_kelas.csv`; `kunci: irbi.kab.tinggi.2025`, `kunci: irbi.kab.sedang.2025`, `kunci: irbi.kab.tinggi.2023`.
  [resmi untuk 2023 dan 2025 kab; asumsi-kebijakan untuk ambang turunan dan kelas provinsi 2025]
- Audit metode platform 21 Okt 2026: IRBI layak, tetapi tidak untuk memeringkat karena banyak nilai kembar; kolom
  `pembanding` (label `SEB_60`) tidak terdokumentasi. Sumber: `irbi/README.md` §6; `riset/D-inventaris-platform.md` §2.
  [resmi untuk vonis internal; dokumen audit tidak dibuka penyusun bukti]
- Rumus R = H × V / C ada di lampiran Perka BNPB 2/2012 (berlaku); korpus lokal hanya memuat batang tubuh 3 halaman,
  sehingga metode IRBI 2025 tidak dapat dilacak ke lampiran. Sumber: `data/raw/hukum/teks/perka-nomor-2-tahun-2012.json`
  (3 halaman); `data/raw/hukum/indeks.json` (status BERLAKU); `riset/A-dokumen-bnpb.md` §1.1; pustaka
  `bnpb-2012-pengkajian-risiko`. [resmi untuk status; rumus sekunder]

**DIBI: cakupan, patahan seri, dan batas tafsir (3.3)**

- Ambang kejadian bencana (Juklak BNPB 7/2023 hlm. 7 butir 3): penyebab salah satu jenis bencana dan paling sedikit satu
  dari 1 orang meninggal; 50 orang terdampak, luka, atau mengungsi; 5 unit rumah atau fasilitas publik rusak; 1 hektare
  lahan; permintaan bantuan nasional; atau penetapan status darurat. Kejadian lintas wilayah dihitung satu secara nasional
  dan per wilayah terdampak di tingkat provinsi dan kab/kota (butir 4b). Sumber: korpus
  `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` hlm. 7; pustaka `bnpb-2023-juklak7`. [resmi; teks dari salinan
  non-JDIH, lihat Celah]
- Meninggal dan hilang dicatat sebagai nominal terakhir; luka/sakit, menderita, dan mengungsi sebagai nominal terbesar
  selama masa tanggap darurat (Juklak 7/2023 hlm. 21–22). Satu orang dapat terhitung di lebih dari satu laporan kab/tanggal
  saat dijumlah. Sumber: korpus `juknis-nomor-7-tahun-2023.json` hlm. 21–22; `dibi/README.md` bagian Definisi. [resmi]
- Juklak 7/2023 memuat 13 kode jenis (101–109 alam; 201 epidemi dan wabah, 202 kebakaran gedung dan permukiman, 203 gagal
  teknologi; 301 konflik sosial dengan subjenis konflik sosial, teror, dan kerusuhan sosial) di hlm. 6; hlm. 19 Juklak yang
  sama mencetak "202" untuk kebakaran gedung dan untuk gagal teknologi. DIBI memakai 203. Sumber: korpus
  `juknis-nomor-7-tahun-2023.json` hlm. 6 dan 19; `dibi/README.md` bagian Definisi; `kunci: juklak7_2023.jumlah_jenis`
  (usulan mitigasi bab-01). [resmi]
- Patahan seri 2024: sebelum 2024 semua laporan ditandai bencana (cakupan bencana = semua laporan di 2008–2023); 2024
  memisahkan 88 kejadian di bawah ambang (3.636 semua laporan lawan 3.548 bencana); 2025 memisahkan 3.865 kejadian
  (9.305,45 lawan 5.440,45, atau 41,5% laporan). BNPB sendiri mengaitkan angka 2024 dengan "mekanisme pencatatan baru"
  (konferensi pers 7 Jan 2025). Sumber: `dibi/rekap_nasional_tahunan.csv` [selisih dihitung penyusun bukti];
  `dibi/README.md` bagian Patahan seri; `kunci: dibi.nasional.kejadian.2024`, `kunci: dibi.nasional.kejadian_semua_laporan.2024`,
  `kunci: dibi.nasional.kejadian.2025`, `kunci: dibi.nasional.kejadian_semua_laporan.2025`. [resmi]
- Nonalam, sosial, dan lainnya praktis baru tercatat sejak 2024: 3 kejadian (2018), 15 (2019), 0 (2020–2023), 76,5 (2024),
  363 (2025: nonalam 333, sosial 4, lainnya 26), cakupan bencana. Sumber: `dibi/rekap_nasional_tahunan.csv`
  [dijumlah penyusun bukti]; `kunci: dibi.nasional.nonalam_sosial.kejadian.2025`. [resmi]
- Patahan kategori: Banjir Bandang, Banjir dan Tanah Longsor, Banjir Rob, dan Puting Beliung pertama muncul 2018, tidak
  ada baris 2024 (tiga yang pertama juga tidak ada 2019); Gerakan Tanah baru 2021; Cuaca Ekstrem tidak ada 2018–2019, nol
  pada 2020, dan 26, 7, 32 kejadian pada 2021–2023 karena pencatatan pindah ke Puting Beliung dan Angin Kencang; Tanah
  Longsor 2024 hanya 219 kejadian (tahun lain 2015–2025: 502–1.251). Cakupan bencana mencatat longsor 2024 sebanyak 207,
  sama dengan CKAN. Sumber: `riset/mentah/dibi_hidromet.json` [dijumlah penyusun bukti per `jenis_bencana` dan tahun];
  `skenario-hidromet/README.md` bagian DIBI; `dibi/rekap_nasional_tahunan.csv` baris 2024 kode 102;
  `kunci: dibi.nasional.longsor.kejadian_semua_laporan.2024`, `kunci: dibi.nasional.longsor.kejadian.2024`. [resmi]
- `is_bencana` bukan fungsi ambang murni: laporan `is_bencana = false` yang membawa korban meninggal ada (2025: 7 meninggal
  di 3 kelompok provinsi-jenis; 2026: 6 meninggal). Meninggal 2025: 2.030 kejadian bencana, 2.037 semua laporan, 1.735
  bencana alam. Sumber: `dibi/README.md` bagian Pengecualian; `kunci: dibi.nasional.meninggal.2025`,
  `kunci: dibi.nasional.meninggal_semua_laporan.2025` (usulan mitigasi bab-01). [resmi]
- DIBI dasbor publik tidak memuat kejadian pra-2008; COVID-19, Plumpang 2023, Balongan 2021, dan Morowali 2023 tidak
  punya baris; kerusuhan akhir Agustus 2025 tidak tercatat sebagai konflik sosial (selain satu baris Manokwari); baris
  konflik memuat dugaan entri ganda (Maluku Tengah 3 Apr 2025 dan 3 Apr 2026) dan baris Jayawijaya 7 Mei 2026 (33
  meninggal) yang bertanggal hari jembatan Wouma putus; kebakaran TPA tidak punya jenis sendiri. Sumber: `dibi/README.md`
  bagian Keterbatasan; `nonalam-sosial/README.md` bagian Rekonsiliasi; KERANGKA §7 butir 14. [resmi]
- Kejadian lintas k kab disimpan sebagai pecahan 1/k per kab, sehingga frekuensi kab dihitung dengan `n_baris`; luka/sakit
  sangat tidak stabil (2015: 370; 2018: 21.218); kerugian rupiah tidak diterbitkan (kolom `estimasi_kerugian_rumah` tanpa
  satuan terdokumentasi). Sumber: `dibi/README.md` bagian Definisi dan Keterbatasan. [resmi]
- **Paket kajian memakai dua cakupan DIBI.** Paket `dibi` memakai cakupan bencana untuk angka kejadian utama, sedangkan
  cache per kab `riset/mentah/dibi_hidromet.json` (dasar `skenario-hidromet/dibi_kab_tahun.csv`, kartu skenario, musim
  hujan, dan daftar perhatian) tidak menyaring `is_bencana`: kejadian banjir 2025 di cache = 2.995, sama dengan cakupan
  semua laporan, sedangkan cakupan bencana 2.318; longsor 2025: 1.171 lawan 332. Sumber: `riset/mentah/dibi_hidromet.json`
  (kolom tanpa `is_bencana`); `dibi/rekap_nasional_tahunan.csv` kategori Banjir dan Longsor 2025; `bangun/skenario-hidromet.py`
  fungsi `tarik_dibi_geologi` ("kueri sama dengan tarik_dibi") [dibandingkan penyusun bukti]. [resmi untuk angka;
  temuan cakupan dihitung penyusun bukti]

**IRBI dan DIBI dibaca berdampingan (3.2, 3.3)**

- Korelasi peringkat Spearman IRBI 2025 per bahaya lawan jumlah laporan DIBI 2015–2025 (`n_baris`) per kab, nasional:
  banjir −0,313 (n = 510), longsor −0,056 (455), kekeringan −0,068 (514), cuaca ekstrem −0,018 (514), gelombang dan abrasi
  +0,150 (326), karhutla +0,029 (467), gempa +0,231 (514), gunung api +0,254 (132). Dengan jumlah tahun berkejadian
  hasilnya hampir sama (banjir −0,325); dengan meninggal dan hilang rentang −0,090 sampai +0,163. Sumber:
  `irbi/irbi_kab_2025.csv`; `skenario-hidromet/dibi_kab_tahun.csv`, `dibi_geologi_kab_tahun.csv` [dihitung penyusun bukti,
  peringkat rata-rata untuk nilai kembar]; `kunci: irbi_dibi.nasional.spearman.*`. [asumsi-kebijakan; analisis penyusun
  atas data resmi]
- Mengapa banjir negatif: kab di kuintil teratas IRBI banjir 2025 (nilai 25–36) punya median 10 laporan banjir 2015–2025,
  sedangkan kuintil terbawah (7–13) median 27; kuintil teratas memuat 2 kab Jawa dari 102 dengan median penduduk 161.037
  jiwa, kuintil terbawah 43 kab Jawa dengan median 498.083 jiwa. Sumber: idem ditambah kolom `penduduk_2026`
  (WorldPop) [dihitung penyusun bukti]; `kunci: irbi_dibi.nasional.banjir.median_laporan_kuintil5`,
  `kunci: irbi_dibi.nasional.banjir.median_laporan_kuintil1`. [asumsi-kebijakan; analisis penyusun atas data resmi]
- Pembanding Jawa (119 kab): Spearman IRBI 2025 lawan kejadian DIBI kekeringan 0,178, banjir 0,187, longsor 0,199 (positif
  lemah). Sumber: `naskah/air/bukti/bab-03.md` P2; `kunci: airjawa.jawa.spearman_irbi_dibi.*` (usulan air bab-03).
  [asumsi-kebijakan; analisis penyusun atas data resmi]
- Sel IRBI 2025 kosong (tidak dinilai, bukan nol) tetapi berkejadian DIBI 2015–2025: longsor 27 dari 59 kab kosong,
  karhutla 20 dari 47, gelombang dan abrasi 12 dari 188, gunung api 8 dari 382, banjir 4 dari 4. Sumber:
  `irbi/irbi_kab_2025.csv`; `skenario-hidromet/dibi_kab_tahun.csv`, `dibi_geologi_kab_tahun.csv` [dihitung penyusun bukti];
  `kunci: irbi.nasional.2025.longsor_kosong`, `kunci: irbi.nasional.2025.longsor_kosong_berkejadian`,
  `kunci: irbi.nasional.2025.karhutla_kosong`, `kunci: irbi.nasional.2025.karhutla_kosong_berkejadian`. [resmi]
- KERANGKA §2 butir 7: IRBI (risiko termodelkan) dan DIBI (kejadian tercatat) tidak saling memvalidasi, disajikan
  berdampingan dengan korelasinya; jumlah kejadian kekeringan DIBI mengukur intensitas pelaporan, bukan keparahan.
  [asumsi-kebijakan, keputusan kajian]

**Aturan daftar perhatian dan provinsi utama diuji pada 514 kab (3.8)** [paket `turunan`, dibangun ulang dan identik;
syarat dihitung dari `turunan/daftar_perhatian.csv` oleh penyusun bukti] [asumsi-kebijakan; turunan dari data resmi dan
estimasi model]

- Daftar dasar (≥ 2 syarat): banjir 253 kab, cuaca ekstrem 272, longsor 202, karhutla 62, gelombang dan abrasi 47, gempa 30,
  tsunami 16, gunung api 12, kekeringan 9. Sumber: `turunan/daftar_perhatian_kepekaan.csv` varian `dasar`;
  `kunci: perhatian.mitigasi.*.n` (sudah di registri).
- Syarat (b) ≥ 3 dari 11 tahun dipenuhi 462 dari 514 kab untuk banjir (90%) dan 385 untuk cuaca ekstrem (75%); sebaran
  banjir: 69 kab berkejadian 11 dari 11 tahun, 66 kab 10 tahun, hanya 52 kab di bawah 3 tahun. Sumber:
  `turunan/daftar_perhatian.csv` kolom `syarat_b`, `n_tahun_dibi`; `kunci: perhatian.mitigasi.banjir.n_syarat_b`,
  `kunci: perhatian.mitigasi.cuaca_ekstrem.n_syarat_b`.
- Syarat (c) untuk kekeringan dipenuhi hanya 2 kab karena meninggal, hilang, dan mengungsi kekeringan hampir nol di semua
  kab; daftar kekeringan karena itu 9 kab. Sumber: idem kolom `syarat_c`; `kunci: perhatian.mitigasi.kekeringan.n_syarat_c`.
- Syarat (b) gempa (paparan KRB per kab) tidak dinilai karena KRB gempa per kab belum ditarik ke paket; daftar gempa hanya
  dari (a) dan (c). Tsunami memakai jiwa pesisir rendah tiba ≤ 30 menit (estimasi model, proksi yang melewatkan pantai
  selatan Jawa Barat); gunung api memakai jiwa KRB III PVMBG. Sumber: `bangun/turunan.py` fungsi `kajian_mitigasi`
  (`paparan["gempa"]` kosong); `turunan/daftar_perhatian.csv` kolom `syarat_d_arti`; `skenario-geologi/README.md` §6 butir 4.
- Kelas nilai teratas (syarat a) memakai batas kuintil v[⌊n × 4/5⌋] dengan nilai sama dengan batas ikut masuk (≥),
  sesuai prinsip 8. Peta G19 (`bangun/visual/peta.mjs` fungsi `aturKelas`) memakai batas yang sama tetapi inklusif ke
  kelas bawah ("≤ batas"; kelas teratas "> batas"). Jumlah kab yang tepat di batas: kekeringan 56 (107 lawan 51), karhutla
  60 (113 lawan 53), cuaca ekstrem 21, banjir 20, gelombang 15, gempa 10, longsor 9, gunung api 5, tsunami 4. Sumber:
  `bangun/turunan.py` fungsi `batas_kuintil`, `syarat_a`; `bangun/visual/peta.mjs` baris 113–123; `irbi/irbi_kab_2025.csv`
  [dihitung penyusun bukti]; `kunci: perhatian.mitigasi.kekeringan.n_kab_di_batas`, `kunci: perhatian.mitigasi.karhutla.n_kab_di_batas`.
- Uji kepekaan: geser (b) ke ≥ 2 atau ≥ 4 tahun mengubah banjir +8 atau −10, longsor +22 atau −25, cuaca ekstrem +16 atau
  −20, gelombang +23 atau −13, karhutla +11 atau −9, kekeringan +8 atau −3; geser (a) ke dua kelas teratas menambah banjir
  51, karhutla 46, gempa 24, longsor 23, cuaca ekstrem 23, kekeringan 18, tsunami 7, gelombang 6, gunung api 4. Sumber:
  `turunan/daftar_perhatian_kepekaan.csv`; `kunci: perhatian.mitigasi.banjir.n_a_dua_kelas`,
  `kunci: perhatian.mitigasi.karhutla.n_a_dua_kelas`.
- Provinsi utama, dua kriteria berdampingan: menurut jumlah kab daftar perhatian (bahaya apa pun), Jawa Tengah 33 kab dan
  Jawa Timur 33 kab (kembar), lalu Sumatera Utara 32 dan Jawa Barat 26; menurut meninggal dan hilang DIBI 2015–2025,
  Sulawesi Tengah 4.925, Jawa Barat 1.260, Aceh 794, Sumatera Utara 739, Sumatera Barat 690. Sulawesi Tengah peringkat 14
  menurut daftar; Jawa Tengah peringkat 7 menurut korban. Sumber: `turunan/provinsi_utama.csv`;
  `kunci: perhatian.mitigasi.prov33.n_kab`, `kunci: perhatian.mitigasi.prov35.n_kab`, `kunci: perhatian.mitigasi.prov72.meninggal_hilang`,
  `kunci: perhatian.mitigasi.prov32.meninggal_hilang`.

### Inferensi

- *Penilaian tim:* rancangan Tabel 3.1 (sumber, produsen, label) dari temuan di atas:

  Kolom kedua bernama "Penerbit", bukan "Produsen": menurut Perban 1/2023 Pasal 1 angka 6 hanya unit kerja di
  lingkungan BNPB yang menjadi Produsen Data Bencana; lembaga lain di tabel ini penerbit data yang dipakai kajian.
  Lembaga luar negeri (NOAA, USGS, WHO, Bank Dunia) tidak ada di daftar sumber resmi KERANGKA §2 butir 5, sehingga
  berlabel terverifikasi.

  | Data | Penerbit (unit) | Cakupan dan waktu | Label | Catatan pakai |
  | --- | --- | --- | --- | --- |
  | DIBI | BNPB (Pusdatinkom, walidata; produsen Data Bencana) | 2008–2026, per kab, tarik 23 Okt 2026 | resmi | sebut cakupan (bencana atau semua laporan) dan patahan 2018, 2024 |
  | IRBI | BNPB (InaRISK; produsen Data Bencana) | 2015–2025, 514 kab | resmi | 2025 terpisah; tidak memeringkat; sel kosong "tidak dinilai" |
  | KRB 2022–2026 | BNPB (InaRISK; produsen Data Bencana) | 508 unit kab, 14 bahaya (12 bernilai potensi kerugian) | resmi | batas atas; tidak dijumlah antarbahaya |
  | ONI | NOAA CPC (lembaga luar negeri) | 1950–2026 | terverifikasi (sejajar dengan USGS) | fase ENSO, bukan prakiraan |
  | Katalog dan dampak gempa | USGS (lembaga luar negeri) | per kejadian | terverifikasi | pembanding korban dan laju gempa platform |
  | PuSGeN 2024 | Kementerian PU | megathrust dan sesar | resmi | Mmaks dan periode ulang; tanpa skenario korban |
  | SiPongi | Kementerian Kehutanan | 2015–2026 | resmi | luas karhutla |
  | BPS, Podes | BPS | 2020–2026 | resmi | penyebut; desa perkelahian |
  | WHO, Bank Dunia, jurnal | lembaga luar negeri dan peneliti | per kejadian | terverifikasi | pembanding dan analog |
  | Keluaran Pantau Bencana | bukan produsen Data Bencana | per skenario | estimasi-model | pernyataan produsen, pita, galat |

- *Penilaian tim:* sasaran Renas 4.c dan IKU RPJMN PP 08.04 (penurunan IRB 1,2% per tahun) tidak dapat diukur untuk 2025
  dengan data yang terbuka: perbandingan naif memberi kenaikan 15,1%. Selama metode dan baseline skala baru belum terbit,
  Bab 3 menulis capaian 2025 "tidak dapat dinilai" dan menyerahkan keputusannya ke KD-4. Ini sejalan dengan tesis kajian
  yang memakai indikator korban Renas 1.a dan 1.b sebagai sasaran utama sampai baseline terbit.
- *Penilaian tim:* korelasi negatif banjir (−0,31) bukan bukti IRBI keliru. IRBI menggabungkan bahaya, kerentanan, dan
  kapasitas, sehingga kab kecil berkapasitas rendah di luar Jawa bernilai tinggi, sedangkan DIBI mengukur kejadian yang
  dilaporkan dan menumpuk di kab padat penduduk. Konsekuensinya: (1) satu syarat IRBI dan satu syarat DIBI dalam daftar
  perhatian menangkap dua populasi kab yang berbeda, dan kab yang memenuhi keduanya sungguh langka; (2) naskah tidak
  boleh menulis "IRBI dikonfirmasi oleh DIBI" atau sebaliknya.
- *Penilaian tim:* angka kejadian per kab di daftar perhatian dan kartu skenario adalah cakupan semua laporan. Untuk 2024
  dan 2025 cakupan ini memuat laporan di bawah ambang (longsor 2025 3,5 kali cakupan bencana), sehingga syarat (b)
  menggelembung di dua tahun terakhir. Pilihan: menarik ulang cache per kab dengan kolom `is_bencana` (lebih jujur), atau
  menulis "semua laporan" di catatan tabel. Untuk meninggal, selisih kedua cakupan kecil (2025: 2.037 lawan 2.030), jadi
  lantai korban tidak terpengaruh arah amannya.
- *Penilaian tim:* aturan 3.8 seperti tertulis tidak membedakan untuk banjir dan cuaca ekstrem (syarat b dipenuhi 90% dan
  75% kab) dan nyaris kosong untuk kekeringan. Usul untuk 3.8, sejajar dengan usul kajian air: ambang (b) memakai kuartil
  atas nasional jumlah tahun berkejadian per bahaya; syarat (c) kekeringan diganti terdampak (menderita) di kuartil atas
  dengan catatan intensitas pelaporan, atau dihapus sehingga kekeringan meminta (a) dan (b); syarat (b) gempa diisi
  setelah KRB gempa per kab ditarik. Daftar tampil urut abjad atau kode wilayah, bukan urut nilai.
- *Penilaian tim:* batas kelas syarat (a) dan peta G19 harus satu aturan (gerbang D-29). Prinsip 8 memilih nilai kembar
  ikut masuk, jadi legenda peta IRBI per bahaya ditulis "≥ batas" untuk kelas teratas; tanpa itu, sampai 60 kab
  (karhutla) masuk daftar karena syarat (a) tetapi tampil di kelas kedua peta.
- *Penilaian tim:* dua kriteria provinsi utama menunjuk provinsi berbeda: kriteria daftar menonjolkan provinsi dengan
  banyak kab dan banyak laporan (Jawa), kriteria korban menonjolkan provinsi dengan satu kejadian sangat besar
  (Sulawesi Tengah 2018). Naskah menulis keduanya dan tidak memilih satu; Jawa Tengah dan Jawa Timur ditulis kembar.

### Celah

| Yang dicari | Status | Penyajian tanpa mengarang | Pemegang data |
| --- | --- | --- | --- |
| Catatan metode dan baseline IRBI 2025 skala baru; indeks provinsi 2025 | tidak ditemukan | 2025 terpisah; capaian 2025 "tidak dapat dinilai"; KD-4 | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| Lampiran Perka 2/2012 (rumus risiko) dan buku IRBI 2021–2024 | tidak di korpus; PDF buku > 10 MB tidak diunduh | rumus berlabel sekunder; ambang > 144 berlabel turunan | JDIH BNPB; Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| Teks Juklak 7/2023 di JDIH BNPB | katalog tanpa PDF; teks dari salinan di situs UNFPA | label resmi dengan catatan salinan; minta salinan Pusdatinkom | Pusdatinkom |
| Cache DIBI per kab dengan `is_bencana` | tidak ada di kueri paket | tulis "semua laporan" di catatan tabel; tarik ulang | `pipa-data` (paket skenario-hidromet) |
| Dokumentasi `dibi_kab_tahun.csv` dan `dibi_geologi_kab_tahun.csv` di README paket | tidak ada | pemilik paket menambah baris berkas dan cakupannya | `pipa-data` |
| KRB gempa per kab | API ada, belum ditarik (paket geologi hanya nasional `ks_*.json`) | syarat (b) gempa "tidak dinilai" | InaRISK BNPB |
| Skrip reproduksi korelasi IRBI–DIBI nasional dan hitungan syarat | belum di paket | angka ini [dihitung penyusun bukti] | `pipa-data` |
| Arti kolom `pembanding` (`SEB_60`) dan `jiwa_terpapar` API | tidak terdokumentasi | tidak dipakai | InaRISK BNPB |

---

## P2. Bagaimana skenario terburuk, lantai, kemungkinan, dan dampak didefinisikan untuk semua jenis?

### Inti

Skenario terburuk yang masuk akal adalah perwujudan terburuk yang masih masuk akal setelah variasi yang sangat tidak
mungkin disisihkan (Cabinet Office, 2025), dengan lantai: tidak lebih ringan daripada kejadian atau musim tercatat
terburuk untuk jenis dan wilayah yang sama. Pertanyaan ini baru terjawab sebagian: lantai per jenis wajib diambil dari
`skenario-hidromet/lantai_jenis.csv` (KERANGKA §2 butir 9), dan berkas itu belum dibangun, sehingga lantai per jenis
(banjir, banjir bandang, longsor, cuaca ekstrem, karhutla, kekeringan, gelombang dan abrasi, rob, dan lainnya) belum
ditetapkan dan kartu per jenis belum boleh memuat angka lantai. Yang sudah dapat ditulis: lantai agregat musim hujan
nasional 1.692 meninggal dan hilang (2025/2026), di atas batas atas semua pita model (La Niña 525–1.204; musim terberat
396–954 lawan 1.692 meninggal dan hilang tercatat), sehingga pita model hanya pembanding musim berat tipikal; dan lantai
geologi KERANGKA (megathrust selatan Jawa Pangandaran 2006, 665 meninggal; Mentawai–Enggano Mentawai 2010, 447 meninggal
dan 56 hilang; tsunami ditambah Selat Sunda 2018, 437 meninggal dan 16 hilang). Kemungkinan dinilai dalam lima tahun
dengan pita Cabinet Office: fase ENSO dari ONI sebagai baris kepekaan hidrometeorologi (musim lantai 2025/2026 sendiri
bukan episode La Niña), periode ulang PuSGeN 2024 untuk megathrust Jawa (Mw 9,1 0,83%, pita 2; Mw 8,9 per segmen 1,24%,
pita 3), laju Poisson M6+ per provinsi platform untuk gempa lain (peluang kejadian pemicu, bukan peluang skenario);
jenis lain "tidak dinilai". Dampak dinilai kelas 1–5 per aspek Perban BNPB 2/2023 Pasal 7 ayat (5); Perban tidak memuat
ambang kelas, sehingga ambang adalah keputusan kajian, dan pita fatalitas Cabinet Office (1–8, 9–40, 41–200, 201–1.000,
> 1.000) cocok dengan sebaran DIBI provinsi-tahun untuk kartu per provinsi atau per kejadian.

### Temuan bersumber

**Definisi dan pita kemungkinan (3.4, 3.5)**

- Skenario terburuk yang masuk akal "represent the worst plausible manifestation of that particular risk (once highly
  unlikely variations have been discounted)" untuk perencanaan yang proporsional (hlm. 11). Kemungkinan risiko nonmalisius
  dinilai untuk terjadi paling sedikit sekali dalam 5 tahun dengan skor 1–5: < 0,2%, 0,2–1%, 1–5%, 5–25%, > 25% (hlm. 12,
  Tabel 2; hlm. 16). Dampak dinilai di tujuh dimensi, masing-masing skor 0–5, lalu digabung menjadi satu skor (hlm. 13);
  skala dampak dan kemungkinan logaritmik, tiap kolom kemungkinan lima kali kolom sebelumnya (hlm. 15). Contoh indikator
  dampak fatalitas: 1–8, 9–40, 41–200, 201–1.000, > 1.000 untuk skor 1–5 (hlm. 14, Tabel 3). Sumber: Cabinet Office (2025)
  *National Risk Register 2025*,
  https://assets.publishing.service.gov.uk/media/67b5f85732b2aab18314bbe4/National_Risk_Register_2025.pdf, dibuka ulang
  24 Okt 2026 (`pdftotext` hlm. 10–17); pustaka `cabinetoffice-2025-nrr`; `kunci: nrr_2025.*` (usulan air bab-03),
  `kunci: nrr_2025.fatalitas.kelas1_atas` sampai `kelas4_atas`. [terverifikasi]
- KERANGKA §2 butir 9: lantai, penyisihan hanya untuk peluang lima tahun < 0,2% dengan alasan tertulis, "tidak dinilai"
  untuk jenis tanpa dasar peluang, kelas skenario = aspek terberat, larangan tampil untuk angka model yang melampaui angka
  tercatat tanpa penjelasan dan pita yang lebarnya lebih dari satu orde, korban tsunami platform tidak dikutip sampai
  genangan InaRISK `Inun_*` dipakai; nonalam dan sosial memakai analog terbesar 30 tahun terakhir tanpa perkalian.
  [asumsi-kebijakan, keputusan kajian]
- Perban BNPB 2/2023 Pasal 7: cakupan kedaruratan meliputi karakteristik ancaman, skenario kejadian, dan asumsi dampak
  (ayat 1); asumsi dampak diproyeksikan terhadap lingkungan, kependudukan, ekonomi, infrastruktur/fisik, dan layanan sipil
  (ayat 5). Lampiran: skenario didasarkan data dan analisis resmi lembaga berotoritas dan "dapat mempertimbangkan sejarah
  kejadian bencana terburuk yang pernah terjadi" (hlm. 14); aspek kependudukan memuat meninggal, luka, mengungsi;
  kerusakan fisik dinilai tiga kategori ringan, sedang, berat/hilang; aspek kelima bernama "layanan publik/pemerintahan"
  (hlm. 14–15). Tidak ada kelas atau ambang dampak 1–5. Sumber: korpus `data/raw/hukum/teks/perban-nomor-2-tahun-2023.json`
  hlm. 4, 14, 15; pustaka `bnpb-2023-renkon`. [resmi]

**Lantai dan pita model hidrometeorologi (3.4)**

- 18 musim hujan nasional (1 Okt–30 Apr) 2008/2009–2025/2026: musim 2025/2026 terbesar untuk meninggal (1.506), meninggal
  dan hilang (1.692), mengungsi (1.043.740), dan rumah rusak berat (65.929); menderita terbesar 2008/2009 (9.389.379),
  kejadian terbanyak 2024/2025 (4.046). Lantai juga musim terbesar dalam 10 musim terakhir. Sumber:
  `skenario-hidromet/musim_hujan.csv`; `skenario-hidromet/kartu_skenario.csv` baris `musim_hujan_lantai, nasional`;
  `kunci: hidromet.nasional.lantai.meninggal_hilang`, `kunci: hidromet.nasional.lantai.musim`,
  `kunci: hidromet.nasional.lantai.meninggal_hilang_10_musim` (sudah di registri), `kunci: hidromet.nasional.musim_2025.mengungsi`,
  `kunci: hidromet.nasional.musim_2025.rumah_rb`. [resmi; DIBI cakupan semua laporan]
- Metode korban paket: korban = Σ kejadian analog × rasio (meninggal + hilang)/kejadian per jenis 2010–2025; batas tinggi
  persentil 90 dibatasi nilai terbesar kedua "sehingga tahun terburuk tercatat selalu disisihkan"; semua belum diuji balik.
  Sumber: `skenario-hidromet/README.md` bagian Korban jiwa. [estimasi-model; belum diuji balik]. **Dibantah oleh** KERANGKA
  §2 butir 9 (tahun terburuk tidak boleh disisihkan kecuali peluang lima tahun < 0,2%).
- Pita model nasional lawan angka tercatat musim yang sama: musim La Niña 2020/2021 model 524,8–1.203,8 jiwa lawan 465
  meninggal (537 meninggal dan hilang) tercatat; musim terberat 2025/2026 model 395,8–954,3 lawan 1.692 meninggal dan
  hilang tercatat (1.506 meninggal + 186 hilang; pembandingnya meninggal dan hilang karena rasio model memakai meninggal +
  hilang); banjir 2025/2026 model 229,3–580,1 lawan 1.421 meninggal dan hilang tercatat; longsor 2020/2021 model
  250,0–545,9 lawan 153; cuaca ekstrem 2020/2021 model 38,7–110,9 lawan 18. Pita yang melampaui angka tercatat musim yang
  sama: La Niña total (batas atas 1.203,8 = 2,24 kali 537), longsor La Niña (batas bawah 250,0 sudah di atas 153), cuaca
  ekstrem La Niña (batas bawah 38,7 di atas 18). Kartu paket sendiri menandai La Niña dan terberat "pembanding musim berat tipikal, bukan skenario terburuk: batas
  tinggi di bawah lantai tercatat (1692 jiwa)". Sumber: `skenario-hidromet/kartu_skenario.csv`;
  `kunci: hidromet.nasional.lanina.korban_jiwa`, `kunci: hidromet.nasional.lanina.korban_jiwa_longsor` (sudah di registri),
  `kunci: hidromet.nasional.terberat.korban_jiwa`, `kunci: hidromet.nasional.terberat.meninggal_tercatat`,
  `kunci: hidromet.nasional.terberat.korban_jiwa_banjir`, `kunci: hidromet.nasional.terberat.meninggal_hilang_tercatat_banjir`.
  [estimasi-model; belum diuji balik, lawan resmi]
- Gelombang, abrasi, dan rob: pita korban model 5,1–90 jiwa (lebar 17,7 kali) lawan 4 meninggal tercatat pada tahun analog
  2021 (batas bawah 5,1 sudah di atas angka tercatat); rob 0. Kekeringan: pita 0–0,24 (2015) dan 0–4,48 (2018), kematian langsung tidak tercatat. Sumber:
  `skenario-hidromet/kartu_skenario.csv` baris `gelombang_abrasi_rob` dan `kekeringan_2015`;
  `kunci: hidromet.nasional.gelombang_abrasi_rob.korban_jiwa`. [estimasi-model; belum diuji balik]
- Lantai Jawa (kajian air): meninggal dan hilang terbesar 270 (2008/2009). Sumber: `kunci: hidromet.jawa.lantai.meninggal_hilang`
  (sudah di registri). [resmi]
- Lantai per jenis: KERANGKA §2 butir 9 menetapkan "Angka lantai per jenis diambil dari turunan
  `skenario-hidromet/lantai_jenis.csv` ... dan tidak diketik di naskah sebelum turunan itu ada"; §5 Bab 3 mengulanginya.
  Berkas itu tidak ada di `data/skenario-hidromet/` (dicek 24 Okt 2026; isi folder: `kartu_skenario.csv`,
  `musim_hujan.csv`, `dibi_kab_tahun.csv`, dan lainnya, tanpa `lantai_jenis.csv`). Angka per jenis di `kartu_skenario.csv`
  adalah angka musim analog, bukan kejadian tunggal atau tahun terburuk per jenis. Sumber: KERANGKA §2 butir 9 dan §5
  Bab 3; daftar berkas `data/skenario-hidromet/`. [asumsi-kebijakan, keputusan kajian; status berkas dicek penyusun bukti]

**Lantai dan skenario geologi, nonalam, sosial (3.4)**

- Skenario megathrust platform: Jawa M8,5 dan Mentawai M8,8 di bawah Mmaks; kepekaan Mmaks Jawa M9,1 dan Mentawai M8,9.
  Korban guncangan rasio analog: Jawa M8,5 0–2.602 (tengah 0, karena MMI ≥ VII = 0 di pusat kecamatan); Mentawai M8,8
  567–7.708; Jawa M9,1 10.720–136.032; Mentawai M8,9 901–11.435. Pita mesin: Jawa M8,5 29–2.979 (galat LOO ×5,3). Korban
  tsunami: orde besaran, belum layak dikutip. Sumber: `skenario-geologi/ringkasan.csv`; `skenario-geologi/README.md` §1,
  §5, §6; `kunci: geologi.jawa.korban_analog`, `kunci: geologi.jawa_mmaks.korban_analog`, `kunci: geologi.mentawai.korban_analog`.
  [estimasi-model; belum diuji balik]
- Lantai geologi yang ditetapkan KERANGKA §2 butir 9 (periode acuan 1996–2025): megathrust selatan Jawa = Pangandaran
  2006, 665 meninggal (rincian impact-text USGS per kab: Ciamis 413, Cilacap 157, Tasikmalaya 62, dan lainnya; angka lama
  668 tidak ditemukan sumbernya); Mentawai–Enggano = Mentawai 2010, 447 meninggal dan 56 hilang, jumlah 503 (DIBI; USGS
  445); tsunami per wilayah dari kejadian yang sama ditambah Selat Sunda 2018, 437 meninggal dan 16 hilang, jumlah 453
  (DIBI); Aceh 2004 lantai tsunami nasional hanya dengan buku resmi BRR (127.720 meninggal dan 93.285 hilang, status sumber
  menunggu keputusan pemilik, riset E §E4). Sumber: `skenario-geologi/analog.csv` baris `pangandaran-2006` dan
  `mentawai-2010`; `riset/mentah/usp000ensm.geojson`; `dibi/kejadian_besar.csv` kode `mentawai2010`, `selatsunda2018`;
  `kunci: geologi.pangandaran2006.meninggal`, `kunci: dibi.mentawai2010.meninggal`, `kunci: dibi.mentawai2010.hilang`,
  `kunci: dibi.selatsunda2018.meninggal`, `kunci: dibi.selatsunda2018.hilang`. [terverifikasi untuk Pangandaran (USGS);
  resmi untuk DIBI; resmi dengan catatan untuk BRR]
- Kejadian gempa besar lain dalam periode acuan, bukan sumber megathrust: Yogyakarta 2006 5.749 meninggal (USGS; ±5.700
  Bappenas, sekunder), gempa kerak M6,3 yang dipakai paket sebagai analog sesar darat; Padang 2009 1.195 meninggal dan 2
  hilang (DIBI; USGS 1.117), gempa slab M7,6; Sulawesi Tengah 2018 4.140 meninggal dan 705 hilang (DIBI), gempa sesar darat
  majemuk dengan tsunami dan likuefaksi. KERANGKA §5 Bab 6 memakai Yogyakarta 2006 dan Cianjur 2022 sebagai analog kartu
  sesar darat. Sumber: `dibi/kejadian_besar.csv`; `skenario-geologi/README.md` tabel analog (Yogyakarta M6,3; Padang M7,6
  slab) dan §8 ("rasio analog guncangan berasal dari gempa kerak/slab"); `kunci: dibi.yogya2006.meninggal_usgs`,
  `kunci: dibi.padang2009.meninggal`, `kunci: dibi.sulteng2018.meninggal` (sudah di registri), `kunci: dibi.sulteng2018.hilang`.
  [resmi untuk DIBI; terverifikasi untuk USGS]
- PuSGeN 2024 Tabel 6.2: Mmaks megathrust Jawa segmen gabungan 9,1 (1.120 km, periode ulang 600 tahun); Jawa barat 8,9 dan
  Jawa timur 8,9 (periode ulang 400 tahun); Mentawai-Siberut, Mentawai-Pagai, Enggano 8,9; Sumba 8,5 (periode ulang "No
  Data"). Buku memuat bahaya, bukan skenario korban. Sumber: `riset/E-dokumen-primer.md` §E1; pustaka
  `pusgen-2024-peta-gempa` hlm. 342–343; `kunci: pusgen.jawa.mmaks`, `kunci: pusgen.jawa.periode_ulang`,
  `kunci: pusgen.jawa_segmen.periode_ulang`, `kunci: pusgen.sumba.mmaks`. [resmi]. **Memperbarui** `skenario-geologi/README.md`
  §4.1 yang menyebut skenario Bali–Sumba "tanpa sumber" dan Mmaks Jawa sekunder.
- Nonalam dan sosial: tidak ada skenario resmi berangka untuk pandemi, kebakaran TPA, maupun konflik; analog terbesar
  dalam 30 tahun: COVID-19 161.870 meninggal (Kemenkes 2024 via Renstra) dan kematian berlebih 2020–2021 806.815–1.343.849
  (model WHO); Plumpang 2023 17 meninggal hari ke-2 (Kepala BNPB) dan 1.085 pengungsi; kebakaran TPA 2023 16 TPA serentak;
  konflik Maluku 1999–2002 sedikitnya 5.000 (mungkin 10.000) meninggal dan sekitar 700.000 mengungsi (ICG). Sumber:
  `nonalam-sosial/skenario_terburuk.csv`; `nonalam-sosial/README.md` bagian Angka kunci; `kunci: nonalam.covid19.meninggal`,
  `kunci: nonalam.covid19.kematian_berlebih`, `kunci: nonalam.plumpang2023.meninggal`, `kunci: nonalam.tpa.terbakar_2023`,
  `kunci: sosial.maluku.meninggal_bawah`, `kunci: sosial.maluku.pengungsi` (sudah di registri). [resmi; estimasi-model
  untuk kematian berlebih; terverifikasi untuk ICG]

**Dasar kemungkinan per jenis (3.5)**

- ENSO 1950–2025: 24 dari 76 tahun punya NDJ dalam episode La Niña (definisi CPC ≥ 5 musim tumpang berturut ≤ −0,5);
  84,7% dari 72 jendela lima tahun memuat paling sedikit satu musim La Niña; El Niño kuat musim kemarau (episode dengan
  ONI ≥ 1,5 pada JJA sampai SON: 1965, 1972, 1982, 1997, 2015, 2023) muncul di 38,9% jendela; ONI JAS 2026 = 2,16. Dalam
  18 musim acuan: La Niña 7, El Niño kuat (ONI NDJ ≥ 1,5) 3. Sumber: `riset/mentah/oni_cpc.txt` (NOAA CPC) [dihitung ulang
  penyusun bukti 24 Okt 2026, sama dengan hitungan kajian air]; `skenario-hidromet/kartu_skenario.csv`;
  `kunci: enso.lanina_ndj_porsi_jendela5`, `kunci: enso.elnino_kuat_porsi_jendela5` (usulan air bab-03),
  `kunci: hidromet.nasional.musim_lanina.n`, `kunci: hidromet.nasional.pasca_elnino.n_musim` (sudah di registri).
  [asumsi-kebijakan; turunan dari ONI NOAA, terverifikasi]
- BMKG 22 Sep 2026: El Niño sangat kuat (indeks ENSO JAS +2,63); awal musim hujan 2026/2027 mundur di 529 ZOM. Sumber:
  `riset/E-dokumen-primer.md` §E9; pustaka `bmkg-2026-siaran-musim-hujan`. [resmi]
- Megathrust, turunan Poisson dari periode ulang PuSGeN: peluang paling sedikit satu kejadian dalam 5 tahun 1 − e^(−5/600)
  = 0,83% untuk Mw 9,1 gabungan Jawa dan 1 − e^(−5/400) = 1,24% untuk Mw 8,9 per segmen; keduanya di atas ambang
  penyisihan 0,2%. Sumber: `riset/E-dokumen-primer.md` §E1 dan §3 butir 1; `kunci: geologi.jawa_gabungan.peluang_5th`,
  `kunci: geologi.jawa_segmen.peluang_5th`. [asumsi-kebijakan; turunan dari periode ulang resmi, asumsi Poisson bukan
  angka PuSGeN]
- Laju gempa platform 1990–2025 (USGS, declustering Gardner-Knopoff): M6+ 12,97 per tahun, lolos uji balik 2016–2025 (119
  teramati, harapan 133,85, selang 90% 115–153); M7+ 1,83 per tahun (peluang 12 bulan 84%), lolos; M7+ dangkal gagal uji
  balik (8 teramati lawan harapan 15,77). Audit 21 Okt menilai laju M6+ layak dengan catatan. Sumber:
  `public/gempa/data/laju.json` kunci `nasional`, `uji_balik`; `riset/D-inventaris-platform.md` §1.5, §6.
  Laju per provinsi juga tersedia (33 provinsi; uji balik M6+ per provinsi 29 dari 30 dalam selang 90%). Turunan Poisson
  peluang paling sedikit satu gempa M6+ dalam 5 tahun, 1 − e^(−5λ): nasional > 99,9%; mis. Maluku 100,0% (λ 2,167), Aceh
  98,6% (0,861), Sumatera Utara 92,9% (0,528), Sumatera Barat dan Bengkulu 90,6% (0,472), Jawa Barat 83,6% (0,361), DI
  Yogyakarta 42,6% (0,111); Bangka Belitung dan Papua Selatan 0 kejadian. Sumber: idem kunci `provinsi`, `uji_balik.provinsi_m6`
  [peluang 5 tahun dihitung penyusun bukti]; `kunci: gempa.laju_m6.nasional.peluang_5th`,
  `kunci: gempa.laju_m6.prov11.peluang_5th`, `kunci: gempa.laju_m6.prov12.peluang_5th`, `kunci: gempa.laju_m6.prov13.peluang_5th`.
  [estimasi-model; uji balik lolos untuk M6+ dan M7+]
- Kemungkinan untuk jenis lain: PEDOMAN §B5.27 menempatkan pandemi, kebakaran industri, kebakaran TPA, dan konflik di
  panel "dampak dinilai, kemungkinan tidak dinilai". Sumber: `PEDOMAN-DESAIN.md` §B5.27. [asumsi-kebijakan, keputusan
  kajian]

**Skala dampak (3.5, Tabel 3.3)**

- Sebaran DIBI provinsi-tahun 2008–2025 (klasifikasi alam, cakupan bencana, 648 provinsi-tahun yang ada barisnya):
  meninggal dan hilang p50 4, p75 15, p90 41, p99 391, maksimum 4.845; mengungsi p50 1.402, p90 32.484, p99 239.158,
  maksimum 947.399; rumah rusak p50 415, p90 5.521, p99 44.445, maksimum 271.693; rumah rusak berat p50 78, p90 989,
  p99 10.417, maksimum 119.113; fasilitas rusak (pendidikan, ibadat, faskes, fasum, kantor, jembatan) p50 10, p90 169,
  p99 1.406, maksimum 4.875. Sumber: `dibi/rekap_provinsi_tahunan.csv` [dihitung ulang penyusun bukti, persentil
  inklusif; meninggal, mengungsi, rumah rusak sama dengan kajian air]; `kunci: dibi.provinsi_tahun.*` (usulan air bab-03),
  `kunci: dibi.provinsi_tahun.fasilitas_rusak.p50` sampai `.maks`. [resmi; turunan]
- Provinsi-tahun pada pita fatalitas Cabinet Office (meninggal dan hilang): 0 jiwa 135 (20,8%), skor 1 280 (43,2%), skor 2
  167 (25,8%), skor 3 54 (8,3%), skor 4 10 (1,5%), skor 5 2 (0,3%: Sulawesi Tengah 2018 4.845; Sumatera Barat 2009 1.198).
  Semua 18 tahun nasional 2008–2025 jatuh di skor 4 atau 5 (terendah 276 jiwa pada 2015; skor 5 pada 2009, 2010, 2018,
  2025). Sumber: `dibi/rekap_provinsi_tahunan.csv`; pustaka `cabinetoffice-2025-nrr` hlm. 14 [dihitung penyusun bukti];
  `kunci: dibi.provinsi_tahun.n_skor_nrr4`, `kunci: dibi.provinsi_tahun.n_skor_nrr5`, `kunci: dibi.nasional_tahun.meninggal_hilang_min`.
  [asumsi-kebijakan; turunan dari data resmi]

### Inferensi

- *Penilaian tim:* lantai ditetapkan per metrik, per jenis, dan per wilayah kartu. Untuk musim hujan nasional semua metrik
  korban kebetulan jatuh di satu musim (2025/2026), tetapi tidak untuk menderita dan kejadian; untuk Jawa lantai jatuh di
  musim berbeda per metrik (kajian air). Aturan kartu: nilai skenario per metrik = nilai terbesar dari batas tinggi pita
  model dan angka tercatat terburuk periode acuan; batas pita yang jatuh di bawah lantai dinaikkan ke lantai dengan catatan
  "dinaikkan ke lantai tercatat". Untuk musim hujan nasional korban skenario = 1.692 (lantai), karena batas tinggi model
  1.204 di bawahnya.
- *Penilaian tim:* periode acuan per kelompok: hidrometeorologi 18 musim 2008/2009–2025/2026 dengan penanda patahan;
  geologi 1996–2025 (30 tahun, sama dengan horizon analog nonalam dan sosial). Lantai geologi mengikuti KERANGKA §2 butir
  9 per sumber: megathrust selatan Jawa 665 (Pangandaran 2006), Mentawai–Enggano 503 (Mentawai 2010), tsunami ditambah 453
  (Selat Sunda 2018). Dengan lantai itu, batas atas skenario ilustratif Jawa M8,5 (0–2.602) di atas 665, sehingga
  skenario itu tidak melanggar lantai, walau batas bawah dan nilai tengahnya (0) di bawah lantai; menurut aturan kartu di
  butir sebelumnya batas bawah itu dinaikkan ke 665. M8,5 tetap tidak dibawa ke kartu karena KERANGKA §5 Bab 3
  menyebutnya artefak magnitudo ilustratif; Kartu 6.1 memakai Mmaks PuSGeN 9,1 (10.720–136.032, di atas lantai).
  Batas bawah Mentawai M8,8 (567) di atas lantai 503 dan tidak perlu dinaikkan.
- *Penilaian tim, untuk keputusan pemilik:* versi awal berkas ini memakai Yogyakarta 2006 (5.749) dan Padang 2009 (1.195)
  sebagai lantai gempa Jawa dan Sumatera bagian barat. Kedua kejadian itu bukan sumber megathrust (Yogyakarta gempa kerak
  M6,3; Padang gempa slab M7,6), sehingga tidak sejenis dengan skenario megathrust dan tidak dipakai sebagai lantai kartu
  megathrust. Bila pemilik menghendaki lantai "jenis gempa bumi per wilayah" lintas sumber gempa, itu bantahan atas
  KERANGKA §2 butir 9 dan mengubah kesimpulan: Jawa M8,5 akan di bawah lantai (2.602 < 5.749) dan batas bawah Mentawai
  akan naik ke 1.195. Sampai pemilik memutuskan, berlaku lantai KERANGKA; Yogyakarta 2006 tetap lantai kartu sesar darat
  (Kartu 6.3, bersama Cianjur 2022).
- *Penilaian tim:* kemungkinan skenario lantai sendiri berbeda dari kemungkinan fase ENSO. Musim seburuk 2025/2026 adalah
  terburuk dari 18; dengan posisi plot Weibull peluang per musim 1/19, peluang paling sedikit satu musim seburuk itu dalam
  5 musim 1 − (18/19)^5 = 23,7% (pita 4). Musim lantai itu sendiri terjadi di luar episode La Niña: ONI NDJ 2025 −0,60,
  hanya tiga musim tumpang ≤ −0,5 (SON −0,57, OND −0,61, NDJ −0,60), di bawah syarat lima musim definisi CPC
  (`kartu_skenario.csv`: "bukan episode La Nina CPC"; `riset/mentah/oni_cpc.txt`). Karena itu La Niña tidak disebut pemicu
  skenario lantai. Kartu musim hujan memakai pita 4 untuk kemungkinan skenario lantai; peluang La Niña dalam 5 tahun
  (84,7%, pita 5) ditulis di baris kepekaan fase ENSO yang terpisah, bukan sebagai kemungkinan skenario.
  `kunci: hidromet.nasional.lantai.peluang_5_musim`.
- *Penilaian tim:* tidak ada musim hujan atau kejadian geologi dalam periode acuan yang boleh disisihkan: peluang lima tahun
  semuanya di atas 0,2% (lantai musim 23,7%; megathrust 0,83% dan 1,24%). Rekaman Kota Bekasi 2020 bukan soal peluang,
  melainkan keabsahan data; ia ditangani lewat uji kepekaan (nasional: musim terberat tetap 2025/2026 dengan atau tanpa
  rekaman itu).
- *Penilaian tim:* rancangan Tabel 3.4 (dasar kemungkinan per jenis):

  | Jenis | Dasar | Nilai 5 tahun | Pita | Label |
  | --- | --- | --- | --- | --- |
  | Musim hujan (agregat): skenario lantai | lantai dari 18 musim, Weibull 1/19 (musim lantai bukan episode La Niña) | 23,7% | 4 | asumsi-kebijakan |
  | Musim hujan: baris kepekaan fase ENSO | La Niña (ONI), bukan kemungkinan skenario | 84,7% | 5 (kepekaan) | asumsi-kebijakan; ONI terverifikasi |
  | Banjir, banjir bandang, longsor, cuaca ekstrem (kartu per jenis) | menunggu `lantai_jenis.csv` | – | tidak dinilai sampai lantai per jenis ada | – |
  | Kekeringan, karhutla | El Niño kuat musim kemarau (ONI) | 38,9% (fase); musim 2026 sedang berlangsung | 5 | asumsi-kebijakan |
  | Gempa megathrust Jawa Mw 9,1 | periode ulang PuSGeN 600 tahun, Poisson | 0,83% | 2 | asumsi-kebijakan; turunan |
  | Gempa megathrust segmen Mw 8,9 (Jawa barat, Jawa timur) | periode ulang PuSGeN 400 tahun, Poisson | 1,24% | 3 | asumsi-kebijakan; turunan |
  | Gempa lain (megathrust Sumatra, sesar darat, wilayah lain): kejadian pemicu M6+ di provinsi kartu | laju Poisson M6+ per provinsi platform (USGS 1990–2025, lolos uji balik nasional dan 29 dari 30 provinsi) | mis. Aceh 98,6%, Sumatera Barat 90,6%, Jawa Barat 83,6%, DI Yogyakarta 42,6% | 5 bila > 25% (24 provinsi, termasuk DIY); 4 untuk 13,1–24,4% (7 provinsi, mis. Riau, Jambi, Bali); tidak dinilai untuk 2 provinsi tanpa kejadian | estimasi-model; layak dengan catatan (audit 21 Okt) |
  | Gempa lain: skenario korban (lantai) | laju nasional atau provinsi bukan laju per sumber atau per skenario; M6+ tidak selalu merusak | – | tidak dinilai; baris di atas hanya peluang pemicu | – |
  | Gempa megathrust Sumba | periode ulang "No Data" | – | tidak dinilai | – |
  | Tsunami | ikut sumber gempanya | sama dengan megathrust | 2–3 | asumsi-kebijakan |
  | Gunung api, gelombang dan abrasi, rob | tidak ada dasar peluang per skenario | – | tidak dinilai | – |
  | Pandemi, kebakaran industri, kebakaran TPA, konflik | tidak ada dasar peluang | – | tidak dinilai | – |

- *Penilaian tim:* rancangan Tabel 3.3 (skala dampak 1–5, kata Ringan, Terbatas, Sedang, Berat, Sangat berat; PEDOMAN
  §B5.27). Unit skala sama dengan unit kartu. Untuk kartu per provinsi atau per kejadian, aspek kependudukan memakai pita
  fatalitas Cabinet Office (meninggal dan hilang ≤ 8, 9–40, 41–200, 201–1.000, > 1.000), yang secara empiris memisahkan
  sebaran DIBI provinsi-tahun dengan baik (89,8% di skor 0–2, 12 provinsi-tahun di skor 4–5). Mengungsi, rumah rusak
  (aspek fisik), dan fasilitas rusak (aspek layanan publik) memakai langkah logaritmik kelipatan lima yang ditambatkan pada
  p50 sebaran DIBI (mis. mengungsi: ≤ 1.400, ≤ 7.000, ≤ 35.000, ≤ 175.000, > 175.000). Aspek ekonomi dan lingkungan tidak
  dapat dikelaskan dari DIBI; kelasnya "tidak dinilai", atau memakai KRB sebagai batas atas berlabel. Kartu nasional selalu
  jatuh di skor 4–5 pada skala provinsi; untuk kartu nasional dipakai skala yang sama tetapi dibaca "Berat" atau "Sangat
  berat" tanpa membedakan lebih jauh. Ambang dikunci bertanggal sebelum kelas kartu diisi, walau angka kartu sudah ada di
  paket, supaya ambang tidak disetel mengikuti hasil.
- *Penilaian tim:* larangan tampil KERANGKA berdampak besar pada geologi: semua pita korban dan kerugian megathrust lebih
  lebar dari satu orde (rasio analog 12,7–13,6 kali; pita mesin 54–107 kali; kerugian 43–80 kali; Jawa M8,5 berbatas bawah
  0), jadi tidak satu pun masuk judul, kartu angka, atau RE; yang tampil di badan teks adalah Mmaks, periode ulang, paparan
  KRB, dan korban kejadian analog. Pita gelombang dan abrasi (17,7 kali) diperlakukan sama. Larangan kedua (angka model
  melampaui angka tercatat musim yang sama tanpa penjelasan) juga mengenai hidrometeorologi: pita La Niña total (batas
  atas 1.203,8 lawan 537 tercatat), longsor La Niña (250,0–545,9 lawan 153), cuaca ekstrem La Niña (38,7–110,9 lawan 18),
  dan gelombang dan abrasi (5,1–90 lawan 4) tidak tampil di kartu kecuali disertai penjelasan tertulis mengapa model
  melampaui catatan (mis. rasio korban per kejadian 2010–2025 lebih tinggi daripada rasio musim analog itu). Yang lebarnya
  di bawah satu orde dan tidak melampaui catatan musimnya, yaitu pita musim terberat (395,8–954,3, di bawah 1.692) dan pita
  banjir musim terberat (229,3–580,1, di bawah 1.421), boleh tampil sebagai pembanding dengan angka tercatat di sampingnya.
  Kematian berlebih COVID-19 (1,7 kali) dan kematian asap Koplitz (6,6 kali) boleh tampil dengan angka tercatat di
  sampingnya.

### Celah

- **`skenario-hidromet/lantai_jenis.csv` belum dibangun** (pemilik `pipa-data`, paket skenario-hidromet). Isinya per
  KERANGKA §2 butir 9: per jenis dan wilayah kartu, kejadian tunggal tercatat terburuk dan tahun tercatat terburuk, DIBI
  2008–2025, dengan cakupan tertulis. Sampai berkas itu ada, lantai per jenis belum ditetapkan, kartu per jenis tidak
  memuat angka lantai, dan naskah tidak mengetik angka lantai per jenis dari sumber lain.
- Perban 2/2023 tidak memuat kelas atau ambang dampak; skala 1–5 sepenuhnya Asumsi kebijakan dan ditulis terang di 3.5.
- Periode ulang megathrust Sumatra, serta laju per sesar darat, belum dibaca dari PuSGeN 2024 Tabel 6.2 dan 6.9; sampai
  dibaca, kemungkinan gempa lain memakai laju M6+ per provinsi platform (peluang pemicu, bukan peluang skenario) dan
  kemungkinan skenario korbannya "tidak dinilai". Permintaan ke PuSGeN bila tabel tidak memuatnya.
- Status buku BRR 2009 dan pilihan lantai lintas sumber gempa (Yogyakarta 2006, Padang 2009) menunggu keputusan pemilik
  (P2 Inferensi).
- Pita fatalitas Cabinet Office disusun untuk Inggris; pemakaiannya di Indonesia adalah pilihan kajian yang perlu
  disebut sebagai rujukan metode, bukan standar.
- Skenario gempa sesar darat dekat kota (Lembang, Cimandiri, Opak) belum dijalankan walau Mmaks kini resmi (6,6; 6,3–6,8;
  6,9); kartu memakai analog Yogyakarta 2006 dan Cianjur 2022 (KERANGKA §7 butir 4).
- Korban tsunami tetap "tidak dikuantifikasi" sampai genangan InaRISK `Inun_*` × penduduk dipakai (KERANGKA §7 butir 3).
- Status buku BRR 2009 sebagai sumber Resmi untuk Aceh 2004 menunggu keputusan pemilik (riset E §E4); lantai gempa
  Sumatra bagian utara ditulis dengan catatan itu.
- Hitungan lantai Weibull, pita NRR provinsi-tahun, dan langkah logaritmik belum ada di skrip paket.

---

## P3. Metrik apa yang dapat dikuantifikasi per jenis, dan dengan label apa?

### Inti

Yang dapat dikuantifikasi resmi untuk semua jenis alam hanya korban, pengungsi, dan rumah rusak tercatat DIBI, ditambah
paparan dan potensi kerugian KRB 2022–2026 sebagai batas atas; estimasi model hanya untuk hidrometeorologi (rasio DIBI,
belum diuji balik) dan geologi (pita lebar satu orde atau lebih), dan nonalam serta sosial hanya analog berangka tanpa
perkalian. Kerugian materiil dipisah menjadi tiga besaran berlabel tetap: nilai aset terpapar KRB (tidak dijumlah
antarbahaya; jumlah 12 bahaya Rp7.811,98 T, 1,9 kali angka multibahaya resmi Rp4.082,56 T), kerugian kejadian analog
(PDNA/R3P, DaLA, Bank Dunia), dan kebutuhan stimulan rumah (hanya gempa, longsor, banjir bandang). Kerugian imateriil
ditulis dalam satuan fisik: meninggal dan hilang, pengungsi dan pengungsi-hari, YLL di lampiran; luka dan DALY tidak
dihitung.

### Temuan bersumber

**Ketersediaan per kelompok (3.6)**

- Hidrometeorologi (banjir, banjir bandang, longsor, cuaca ekstrem, gelombang dan abrasi, rob, kekeringan, karhutla):
  korban, pengungsi, menderita, dan rumah rusak DIBI per kab 2008–2026; paparan KRB per kab untuk 6 bahaya (karhutla per
  kab membalas nol, tersedia nasional di Renas); pita korban model untuk semua kecuali karhutla (rasio karhutla tidak
  bermakna untuk skenario asap); kekeringan tanpa kematian langsung tercatat; mesin neraca dan padi belum diuji balik
  (hanya lampiran). Sumber: `skenario-hidromet/README.md` bagian Berkas, Paparan, Korban jiwa, Kekeringan, Karhutla.
  [resmi untuk DIBI dan KRB; estimasi-model untuk pita]
- Karhutla: luas SiPongi 2015 2.611.411 ha dan 2019 1.649.258 ha (resmi); kerugian Bank Dunia 2015 USD 16,1 miliar dan
  2019 USD 5,2 miliar (terverifikasi); kematian berlebih akibat asap 2015 di Indonesia 91.600 (selang 95% 24.000–159.200;
  model GEOS-Chem, Koplitz dkk. 2016). Sumber: `skenario-hidromet/README.md` bagian Angka yang bertentangan dan Sumber luar;
  `riset/E-dokumen-primer.md` §E15; pustaka `koplitz-2016-haze`. [resmi; terverifikasi; terverifikasi (estimasi model
  peneliti)]
- Geologi: paparan KRB nasional gempa 272.405.410, tsunami 5.341.282, gunung api 5.864.711 jiwa (gempa melampaui penduduk
  KRB 271.680.290 di rekaman yang sama); KRB PVMBG × WorldPop per gunung (30 gunung); korban, rumah, pengungsi, dan kerugian
  skenario semuanya estimasi model dengan pita; rumah = jiwa/3,9, bukan data bangunan (Open Buildings hanya Kalimantan
  Tengah); sekolah dan faskes terpapar hanya 9 provinsi; GMPE belum diuji. Sumber: `skenario-geologi/README.md` §1, §2, §8;
  `riset/D-inventaris-platform.md` §1.13. [resmi untuk KRB; estimasi-model untuk skenario]
- Nonalam dan sosial: KRB nasional COVID-19 dan epidemi (penduduk terpapar = praktis seluruh penduduk), kegagalan teknologi
  186.940 ha, 713.784 jiwa, potensi kerugian fisik Rp584.288 juta; sebaran kab hanya COVID-19; kerugian rupiah dan
  imateriil tidak ada di sumber yang dibuka (kecuali biaya respons Sarimukti, sekunder); CFR historis hanya sebagai narasi
  agar tidak dikalikan; konflik memakai desa dengan perkelahian massal (BPS Podes 2024: 2.031 desa, 2,41%) sebagai
  indikator, bukan korban. Sumber: `nonalam-sosial/README.md` bagian Berkas dan Keterbatasan;
  `nonalam-sosial/skenario_terburuk.csv`; `kunci: nonalam.gagal_teknologi.terpapar`, `kunci: sosial.desa_perkelahian.2024`
  (sudah di registri). [resmi; terverifikasi; narasi]
- Luka/sakit DIBI tidak stabil dan tidak ada di cache Superset paket skenario; pengungsi hari ke-7 tidak ada di DIBI;
  KERANGKA menghapus keduanya dari kartu. Perban 2/2023 Lampiran tetap menyebut luka di aspek kependudukan. Sumber:
  `skenario-hidromet/README.md` bagian Keterbatasan; KERANGKA §2 butir 9; korpus `perban-nomor-2-tahun-2023.json` hlm. 14.
  [resmi]

**Kerugian materiil dan imateriil (3.7)**

- (a) Nilai aset terpapar, KRB 2022–2026 (Renas Tabel 2.x hlm. 24–25, juta rupiah): gempa 1.111.318.267; banjir
  1.006.919.180; cuaca ekstrem 2.744.332.847; kekeringan 967.552.017; karhutla 709.049.963; longsor 696.025.976;
  likuefaksi 351.875.950; banjir bandang 147.673.335; tsunami 42.978.422; gelombang dan abrasi 21.624.931; gunung api
  12.048.691; kegagalan teknologi 584.288. Multibahaya nasional 4.082.564.437 (fisik 2.356.643.119; ekonomi 1.725.921.319)
  (hlm. 23–24). Jumlah 12 nilai per bahaya (COVID-19 dan epidemi tidak ada di tabel potensi kerugian; KRB memuat 14 bahaya,
  `kunci: krb2022.jumlah_bahaya` usulan mitigasi bab-01) = 7.811.983.867, atau 1,91 kali angka multibahaya. Sumber: korpus
  `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` hlm. 23, 24, 25 [jumlah dihitung penyusun bukti]; pustaka
  `bnpb-2025-renas`; `kunci: renas.krb.kerugian_multibahaya`, `kunci: renas.krb.kerugian_jumlah_per_bahaya`,
  `kunci: renas.krb.kerugian_gempa`, `kunci: renas.krb.kerugian_cuaca_ekstrem`. [resmi; jumlah asumsi-kebijakan; turunan].
  **Dibantah oleh** KERANGKA §5 Bab 2 yang menyebut Rp4.082,56 T "penjumlahan lintas bahaya": jumlah lintas bahaya
  Rp7.811,98 T; angka multibahaya adalah baris nasional tabel provinsi, bukan jumlah kolom bahaya.
- (b) Kerugian kejadian analog: Pedoman Pengkajian Kebutuhan Pascabencana (Perka BNPB 15/2011, berlaku) adalah "gabungan
  kajian dari metode yang selama ini dikenal sebagai Damage and Loss Assesment (DaLA) dengan metode Human Recovery Need
  Assesment (HRNA)"; istilah "Jitupasna" didefinisikan di Perban BNPB 5/2017 Pasal 1 angka 5 dan Perban 6/2017 Pasal 1
  angka 6 sebagai pengkajian dan penilaian akibat, analisis dampak, dan perkiraan kebutuhan. Contoh resmi: R3P Cianjur
  2022 kerusakan Rp3,98 T, kerugian Rp0,57 T, total Rp4,55 T (dokumen contoh di portal BNPB, tanpa nomor penetapan);
  Sulawesi Tengah Rp13,82 T (data sementara 20 Okt 2018); DaLA Jabodetabek 2007 Rp5.184,43 M. Sumber: korpus
  `perka-nomor-15-tahun-2011.json` hlm. lampiran 1 (n = 8), `perban-nomor-5-tahun-2017.json` hlm. 3,
  `perban-nomor-6-tahun-2017.json` hlm. 3; `data/raw/hukum/indeks.json` (status BERLAKU ketiganya);
  `riset/E-dokumen-primer.md` §E5; `skenario-geologi/README.md` §4.4; `skenario-hidromet/README.md` bagian Sumber luar;
  pustaka `bnpb-2011-pdna`, `bnpb-2017-r3p`, `cianjur-2022-r3p`. [resmi]
- Pengali kerugian nyata terhadap stimulan rumah dari rumah rusak DIBI (skema 60/30/15 juta), hanya pembanding, tidak
  dikalikan ke skenario. Cianjur: R3P resmi kerusakan dan kerugian Rp4,55 T dibagi stimulan Kab. Cianjur Rp1,70 T
  (13.633 RB, 16.059 RS, 26.586 RR) = 2,68 [dihitung penyusun bukti]; R3P berstatus "contoh dokumen" di portal BNPB
  tanpa nomor penetapan. Lombok: total kebutuhan R3P Rp11,44 T (Kemenko PMK 20 Mei 2024) dibagi stimulan Rp7,15 T = 1,60
  (skema lama 50/25/10 saat kejadian: 2,01) [dihitung penyusun bukti]; kebutuhan R3P bukan besaran kerusakan dan kerugian.
  Sulawesi Tengah 3,81 (Rp13,82 T, data sementara resmi 20 Okt 2018). Angka media di paket (Cianjur ±Rp4 T perkiraan
  Bupati via medcom, pengali 2,35; Lombok Rp12,1 T via Tempo, pengali 1,69) tinggal sebagai pembanding sekunder. Sumber:
  `riset/E-dokumen-primer.md` §E5; pustaka `cianjur-2022-r3p` hlm. PDF 51, `kemenkopmk-2024-rehabrekon-lombok`;
  `skenario-geologi/pembanding_pdna.csv` kolom `stimulan_60_30_15_rp_juta`, `stimulan_skema_lama_50_25_10_rp_juta`;
  `kunci: kerugian.pengali.cianjur2022_r3p`, `kunci: kerugian.pengali.lombok2018_kemenkopmk`. [resmi untuk R3P Cianjur
  (catatan status contoh dokumen), Kemenko PMK, dan DIBI; pengali asumsi-kebijakan; turunan; angka media sekunder]
- (c) Stimulan rumah: skema lama Rp50/25/10 juta dan skema 2022 ke atas Rp60/30/15 juta (RB/RS/RR); sumber nilai di
  `public/banjir/data/param_banjir.json` adalah siaran Kemenko PMK (Cianjur 2022) dan berita; besaran tidak ditemukan di
  korpus JDIH lokal. Profil kerugian tahunan batas bawah nasional (rumah rusak DIBI × stimulan, 2015–2025): median
  Rp1,60–2,05 T (2019), p90 Rp6,76–8,57 T (= tahun 2025, nilai terbesar kedua dari 11 tahun), maksimum tercatat 2018
  Rp9,46–11,90 T (117.661 RB, 70.304 RS, 182.195 RR); analog ekstrem Sulawesi Tengah 2018 Rp2,90–3,62 T dan Sumatra 2025
  Rp5,60–7,06 T. Lapisan "berat" p90 karena itu menyisihkan tahun terburuk 2018. Sumber: `skenario-geologi/README.md` §3
  baris `param_banjir.json`; `turunan/profil_kerugian.csv` baris `tahun` dan `berat_p90`;
  `kunci: kerugian.nasional.lapisan_sering`, `kunci: kerugian.nasional.lapisan_berat` (sudah di registri),
  `kunci: kerugian.nasional.maks_tercatat`.
  [asumsi-kebijakan; dasar nilai sebagian sekunder]
- KERANGKA §2 butir 9: kebutuhan stimulan rumah hanya untuk gempa, longsor, dan banjir bandang, tidak disebut kerugian
  materiil untuk banjir genangan. **Dibantah oleh** kartu paket: `materiil_batas_bawah` musim La Niña nasional
  (Rp1,85–2,47 T) dan musim terberat (Rp6,04–7,64 T) mengalikan semua rumah rusak musim itu, termasuk banjir genangan, dan
  `turunan/profil_kerugian.csv` memakai semua jenis. Sumber: `skenario-hidromet/kartu_skenario.csv` baris
  `materiil_batas_bawah`; `turunan/profil_kerugian.csv` kolom `sumber`. [asumsi-kebijakan]
- Imateriil: pengungsi-hari = mengungsi × 7 hari (rendah 3, tinggi 30) untuk hidrometeorologi dan × 7/30/90 untuk geologi
  (asumsi durasi); YLL = korban × sisa harapan hidup 25/35/45 tahun (asumsi; umur korban tidak tersedia); VSL dan DALY tidak
  ada di paket. Sumber: `skenario-hidromet/README.md` bagian Imateriil; `skenario-geologi/README.md` §4.4. [asumsi-kebijakan]
- Kebutuhan respons kartu: air bersih 7 liter per orang per hari pada tiga hari pertama lalu 15 liter, air minum 2,5 liter
  (Perka BNPB 7/2008); penanganan pengungsi mengikuti Perban BNPB 3/2018. Sumber: korpus `perka-nomor-7-tahun-2008.json`;
  `perban-nomor-3-tahun-2018.json`; pustaka `bnpb-2008-kebutuhan-dasar`, `bnpb-2018-pengungsi`; `kunci: perka_2008.*`
  (usulan air bab-03). [resmi]

### Inferensi

- *Penilaian tim:* rancangan Tabel 3.5 (matriks ketersediaan kuantifikasi, G16; R = Resmi, T = Turunan, E = Estimasi model,
  – = Tidak dikuantifikasi). Kolom luas dinamai per konsep jenis dan tidak dibandingkan antarjenis.

  | Jenis | Meninggal dan hilang | Pengungsi | Rumah rusak | Luas | Kerugian materiil | Kemungkinan |
  | --- | --- | --- | --- | --- | --- | --- |
  | Gempa bumi | R tercatat; E pita (> 1 orde, lampiran) | R tercatat; E (RB+RS × 3,9) | R tercatat; E (jiwa/3,9) | E (MMI ≥ VI) | R (KRB a); R (R3P Cianjur b); T stimulan c | T (PuSGeN, megathrust Jawa); E (laju M6+ per provinsi, peluang pemicu) lainnya |
  | Tsunami | R tercatat; – skenario | R tercatat | R tercatat | R (KRB); E waktu tiba | R (KRB a) | T (ikut megathrust) |
  | Gunung api | R tercatat; E pola historis | R tercatat; E batas atas | R tercatat | R (KRB PVMBG) | R (KRB a); T stimulan c | – |
  | Banjir | R tercatat; E pita | R | R | R (KRB) | R (KRB a); R (DaLA 2007 b) | T (ONI) |
  | Banjir bandang | R tercatat; E pita | R | R | R (KRB) | R (KRB a); T stimulan c | T (ONI) |
  | Tanah longsor | R tercatat; E pita | R | R | R (KRB) | R (KRB a); T stimulan c | T (ONI) |
  | Cuaca ekstrem | R tercatat; E pita | R | R | – | R (KRB a) | T (ONI) |
  | Gelombang ekstrem dan abrasi, rob | R tercatat; E pita (> 1 orde) | R | R | R (KRB) | R (KRB a) | – |
  | Kekeringan | – (tidak tercatat) | – | – | R (KRB) | R (KRB a) | T (ONI) |
  | Karhutla | R tercatat (DIBI provinsi asap); terverifikasi kematian asap | – | – | R (SiPongi) | terverifikasi (Bank Dunia b); R (KRB nasional a) | T (ONI) |
  | Epidemi dan pandemi | R (COVID-19); E kematian berlebih | – | – | – | – | – |
  | Kebakaran industri dan gagal teknologi | R analog (Plumpang hari ke-2) | R analog | – | R (KRB) | R (KRB a) | – |
  | Kebakaran TPA | – | – | – | R analog (ha per TPA) | – | – |
  | Konflik sosial | terverifikasi analog (ICG) | terverifikasi analog | – | – | – | – |

- *Penilaian tim:* angka multibahaya KRB Rp4.082,56 T tidak boleh dijelaskan sebagai jumlah lintas bahaya, dan jumlah per
  bahaya (Rp7.811,98 T) tidak boleh dipakai sama sekali, karena zona bahaya bertumpuk. Kerugian materiil besaran (a) ditulis
  per bahaya dengan kata "batas atas aset terpapar", tidak pernah dijumlah dan tidak dibandingkan dengan PDB.
- *Penilaian tim:* nama metode di naskah: "Pengkajian Kebutuhan Pascabencana (Jitupasna; Perka BNPB 15/2011 dan Perban
  BNPB 5/2017)", karena istilah Jitupasna resmi lahir di Perban 5/2017, sedangkan Perka 15/2011 menamai metodenya PDNA.
- *Penilaian tim:* besaran (c) harus dipecah per jenis di paket sebelum dipakai: rumah rusak banjir genangan dan cuaca
  ekstrem dikeluarkan dari "kebutuhan stimulan rumah". Profil kerugian tahunan (`turunan/profil_kerugian.csv`) boleh tetap
  semua jenis karena KERANGKA §2 butir 15 menyebutnya "dasar lapisan" pembiayaan, tetapi namanya "profil batas bawah biaya
  rehabilitasi rumah", bukan kerugian materiil.
- *Penilaian tim, untuk keputusan pemilik:* aturan lantai KERANGKA §2 butir 9 ditulis untuk skenario terburuk, bukan untuk
  lapisan pembiayaan; p90 adalah pilihan statistik lapisan, bukan skenario. Supaya penerapannya konsisten dengan model
  korban (yang ditandai "Dibantah oleh" karena menyisihkan tahun terburuk), usul: lapisan berat tetap p90 (Rp6,76–8,57 T)
  tetapi selalu ditulis berdampingan dengan maksimum tercatat 2018 (Rp9,46–11,90 T), dan lapisan ekstrem atau kartu
  pembiayaan terburuk tidak boleh di bawah Rp9,46–11,90 T. Apakah aturan lantai berlaku resmi untuk lapisan pembiayaan
  diputuskan pemilik (KERANGKA §2 butir 15).
- *Penilaian tim:* rancangan Tabel 3.6 (tiga besaran kerugian):

  | Besaran | Isi | Label | Batas pakai |
  | --- | --- | --- | --- |
  | (a) Nilai aset terpapar KRB | potensi kerugian fisik dan ekonomi per bahaya, KRB 2022–2026 | resmi | batas atas; tidak dijumlah antarbahaya |
  | (b) Kerugian kejadian analog | Jitupasna/PDNA, R3P, DaLA, Bank Dunia | resmi atau terverifikasi | per kejadian; angka sementara ditandai |
  | (c) Kebutuhan stimulan rumah | rumah RB/RS/RR × Rp60/30/15 juta (rendah 50/25/10) | asumsi-kebijakan | hanya gempa, longsor, banjir bandang |

### Celah

| Yang dicari | Status | Penyajian tanpa mengarang | Pemegang data |
| --- | --- | --- | --- |
| Besaran stimulan rumah dalam peraturan atau juknis | tidak ditemukan di korpus JDIH lokal | Asumsi kebijakan berdasar sekunder | Deputi Bidang Rehabilitasi dan Rekonstruksi |
| R3P final Lombok dan Sulawesi Tengah; seri CKAN kerusakan dan kerugian R3P 2015–2024 | tidak ditemukan; seri CKAN belum ditarik | angka sementara resmi; total kebutuhan R3P Lombok dari Kemenko PMK | Deputi Bidang Rehabilitasi dan Rekonstruksi; Pusdatinkom |
| `skenario-geologi/pembanding_pdna.csv` masih memakai angka media untuk Cianjur dan Lombok | belum diperbarui | bab ini memakai R3P Cianjur dan Kemenko PMK; pemilik paket memperbarui kolom `angka_kerugian_rp_juta` | `pipa-data` (paket skenario-geologi) |
| Kerugian ekonomi langsung untuk Renas 2.a | tidak tersedia | permintaan data; profil batas bawah berlabel | Kemenkeu; BNPB |
| Luka-luka dan DALY | tidak tercatat stabil; bobot disabilitas tidak ada | "tidak dihitung" | Kemenkes; Pusdatinkom |
| Lama pengungsian per kejadian | tidak tercatat | pengungsi-hari sebagai rentang asumsi | Pusdalops; BPBD |
| Pemecahan `materiil_batas_bawah` per jenis | belum di paket | kartu menulis "termasuk banjir genangan" sampai dipecah | `pipa-data` |
| Kerugian rupiah nonalam dan sosial | tidak ada | sel "–" beralasan | K/L sektor |

---

## P4. Angka mana yang berbeda versi?

### Inti

Sedikitnya 17 butir kajian mitigasi punya lebih dari satu versi (butir 1–16 dan 18; butir 17 catatan registri). Aturannya: versi resmi yang dibaca di dokumen penerbitnya
dipakai; versi sekunder hanya tampil di Tabel 3.8 sebagai pembanding; dua versi resmi yang bertentangan ditulis
berdampingan beserta definisinya tanpa dirata-rata; versi yang berbeda karena definisi (cakupan, penyebut, tanggal rekap)
tidak disebut bertentangan, tetapi diberi nama besarannya. Tiga butir mengubah isi kerangka: baseline kapasitas daerah
resmi 62% (2023), bukan 67%; faktor evakuasi Nankai ×0,662 tidak ada di dokumen primer (pengganti ×0,600); dan klaim "16
segmen megathrust" dibantah PuSGeN.

### Temuan bersumber

1. **Kejadian nasional 2024, delapan versi.** 3.636 (DIBI semua laporan, resmi, primer); 3.548 (DIBI kejadian bencana);
   3.471,5 (DIBI bencana alam 101–109); 3.472 (CKAN 2010–2024, sama dengan DIBI alam); 3.129 (Buletin BNPB, 11 bulan,
   sebagian); 2.107 (konferensi pers 7 Jan 2025, "mekanisme pencatatan baru", resmi, sekunder); 5.593 (konferensi pers yang
   sama via Antara, tidak terbukti); 1.476 (tulisan hukum BPK DIY, tidak terbukti). 2023: 5.400 (DIBI, CKAN) lawan 4.940 dan
   4.935 (media). Sumber: `dibi/rekonsiliasi.csv` topik `kejadian_nasional`; `dibi/README.md` bagian Rekonsiliasi;
   `kunci: dibi.nasional.kejadian.2024`, `kunci: dibi.nasional.kejadian_semua_laporan.2024`, `kunci: dibi.nasional.kejadian_alam.2024`,
   `kunci: ckan.nasional.kejadian.2024`, `kunci: bnpb_pers.nasional.kejadian_2024_a`, `kunci: bnpb_pers.nasional.kejadian_2024_b`.
   [resmi; sebagian sekunder]
2. **Kejadian 2025.** 9.305,45 (semua laporan) lawan 5.440,45 (bencana) lawan 5.077,45 (alam) lawan 2.778 (jumlah 12
   Buletin, data Pusdalops sebelum verifikasi). Angka 9.305 di riset A §4.1 adalah versi semua laporan. Sumber:
   `dibi/README.md` bagian Rekonsiliasi; `kunci: dibi.nasional.kejadian.2025` (sudah di registri),
   `kunci: dibi.nasional.kejadian_semua_laporan.2025`. [resmi]
3. **Jiwa terpapar multibahaya.** 271.130.365 (KRB 2022–2026, Renas hlm. 22–23) lawan 258.071.714 (Buku RBI 2023 via
   Renstra hlm. 8: rendah 8.654.582, sedang 35.897.949, tinggi 213.519.183). Penduduk KRB API 271.680.290; terpapar
   COVID-19 272.566.688 (> penduduk, ganda di 5 kab Sulawesi Barat); terpapar gempa 272.405.410. Sumber: korpus
   `perban-nomor-1-tahun-2025.json` hlm. 22–23; `perban-nomor-5-tahun-2025.json` hlm. 8; `nonalam-sosial/README.md`
   bagian Rekonsiliasi; `kunci: renas.krb.nasional.terpapar_multibahaya`, `kunci: rbi2023.nasional.terpapar_total`
   (usulan air bab-02). [resmi, dua dokumen]
4. **Kapasitas daerah, tiga angka dua alat ukur.** Renstra: "dari 67% menjadi 90%" (hlm. 85, 128, 132; tabel hlm. 132:
   67, 73, 79, 85, 90 untuk 2025–2029); RPJMN KP 08.04.01: baseline 62 (2023), target 67 (2025) dan 90 (2029); KRB
   2022–2026: kapasitas kab rendah 315, sedang 190, tinggi 3 dari 508, sehingga minimal sedang 37,99%. Angka KRB ini
   ditarik dari baris nasional endpoint ringkasan bahaya COVID-19 (`apiv4/kajian-summary/covid-19`), bukan dari ringkasan
   multibahaya. Dicek ulang penyusun bukti ke enam ringkasan bahaya lain di `riset/mentah/krb_kab/` (banjir, banjir
   bandang, cuaca ekstrem, gelombang dan abrasi, kekeringan, longsor; per kab, 514 kab): kelas kapasitas kab identik di
   keenamnya, yaitu 314 rendah, 190 sedang, 3 tinggi, 7 kosong; selisih satu kab rendah karena Kab. Fakfak, yang di paket
   `nonalam-sosial` ditarik ulang lewat kode lain (`nonalam-sosial/README.md` bagian Rekonsiliasi). Jadi kelas kapasitas
   KRB tidak bergantung pada jenis bahaya, tetapi apakah ia sama dengan alat ukur kapasitas penanggulangan bencana Renstra
   atau RPJMN (IKD) tidak tertulis di sumber yang dibuka. Renstra juga menulis
   rata-rata IKD 0,46 (sedang) (hlm. 70). Kemenko PMK (12 Sep 2025): 79 daerah belum menyusun IKD 2024. Sumber: korpus
   `perban-nomor-5-tahun-2025.json` hlm. 70, 85, 132; riset E §E11b dan §E18; `nonalam-sosial/krb_covid19_wilayah.csv`
   baris `nasional_api` [persen dihitung penyusun bukti]; `kunci: rpjmn.kp_kapasitas.baseline_2023` (usulan mitigasi
   bab-01), `kunci: renstra.iks_kapasitas_minimal_sedang.awal` (usulan air bab-01), `kunci: krb.nasional.kab_kapasitas_rendah`,
   `kunci: krb.nasional.kab_kapasitas_sedang`, `kunci: krb.nasional.kab_kapasitas_tinggi`,
   `kunci: krb.nasional.kapasitas_minimal_sedang_persen`. [resmi untuk Renstra, RPJMN, dan jumlah kab KRB; 37,99%
   asumsi-kebijakan; turunan, karena kesetaraan alat ukurnya dengan IKD belum terbukti]
5. **Segmen megathrust dan sesar aktif.** 13 segmen dan 295 segmen sesar aktif (isu RPJMN dikutip Renstra hlm. 69); PuSGeN
   2024: 14 segmen, 401 sesar (2017: 13 segmen, 273 sesar; 2010: 11 segmen, 52 sesar); GeoServer InaRISK layer
   `INA_Megathrust` 15 segmen; "16 segmen" untuk 2017 hanya di sumber sekunder. **Dibantah oleh** PuSGeN 2024 hlm.
   xxxi–xxxii (2017 = 13 segmen); angka 295 tidak cocok dengan PuSGeN 2017 (273). Sumber: korpus
   `perban-nomor-5-tahun-2025.json` hlm. 69; riset E §E1; `docs/multi-bencana/SUMBER-BNPB.md` baris 35;
   `riset/A-dokumen-bnpb.md` §6; `kunci: renstra.megathrust_segmen`, `kunci: renstra.sesar_aktif`,
   `kunci: pusgen.megathrust.segmen_2024`, `kunci: pusgen.megathrust.segmen_2017`, `kunci: pusgen.sesar_aktif_2024`,
   `kunci: pusgen.sesar_aktif_2017`, `kunci: inarisk.geoserver.megathrust_segmen`. [resmi; 16 sekunder]
6. **Cakupan peringatan dini, lima angka tiga penyebut.** Renstra hlm. 70: keterpenuhan sistem peringatan dini "baru
   mencapai 6 persen dari total potensi masyarakat yang terpapar di kawasan yang berisiko tinggi"; IKP Renstra hlm. 133 dan
   161: 6,10% (2025) ke 6,32% (2029); RPJMN KP 08.04.02 baseline 6,00; Renas Tabel 2.8 hlm. 32 indikator 1.c: 11.060 (2025)
   ke 52.000 (2029) per 100.000 jiwa. Dengan rasio mortalitas R = 8 (laporan UNDRR dan WMO 2022, *Global Status of
   Multi-Hazard Early Warning Systems: Target G*: negara bercakupan peringatan dini terbatas bermortalitas bencana delapan
   kali negara bercakupan substansial sampai komprehensif; rasio antarnegara, bukan efek kausal), lintasan Renas memberi
   faktor korban 0,603 (lantai nasional 1.692 menjadi 1.021; bukan efek kausal, rasio antarnegara), lintasan Renstra 0,998
   (1.689). Angka 0,603 dan 1.021 hanya ilustrasi kepekaan, bukan perkiraan korban yang dapat dicegah. Sumber: korpus
   `perban-nomor-5-tahun-2025.json` hlm. 70, 133, 161; `perban-nomor-1-tahun-2025.json` hlm. 32; riset E §E11b;
   `skenario-hidromet/kepekaan_peringatan_dini.csv`; pustaka `undrr-wmo-2022-mhews` (sumber asli; halaman UNDRR dan
   berkas PDF-nya menolak akses penyusun bukti pada 24 Okt 2026, sehingga isi laporan dibaca lewat siaran WMO); pelengkap:
   siaran WMO 13 Okt 2022, https://wmo.int/media/news/un-warns-half-world-not-prepared-disasters, dibuka ulang 24 Okt 2026
   (pustaka `wmo-2022-peringatan-dini`); registri `data/angka.json` mencatat "rasio lintas negara, bukan efek kausal" untuk
   kunci kepekaan yang sama;
   `kunci: renstra.peringatan_dini.keterpenuhan_persen`, `kunci: rpjmn.peringatan_dini.baseline`,
   `kunci: renstra.ikp_peringatan_dini.2025`, `kunci: renas.indikator_1c.2025` (usulan air bab-01),
   `kunci: hidromet.nasional.lantai.pd_renas.korban_jiwa`, `kunci: hidromet.nasional.lantai.pd_renstra.korban_jiwa`
   (sudah di registri), `kunci: bukti.wmo_2022.rasio_mortalitas` (usulan air bab-03). [resmi untuk Renstra, RPJMN, Renas;
   rasio terverifikasi, rasio antarnegara bukan efek kausal; faktor asumsi-kebijakan]
7. **Sulawesi Tengah 2018.** DIBI 4.140 meninggal, 705 hilang, 4.438 luka; BNPB 21 Okt 2018 2.256 meninggal dan 1.309
   hilang (sementara, sekunder); BNPB/Basarnas 2.081 (sekunder); USGS 2.077 meninggal, 1.075 hilang, 4.438 luka (luka sama
   persis dengan DIBI). Sumber: `dibi/rekonsiliasi.csv`; `dibi/kejadian_besar.csv`; `kunci: dibi.sulteng2018.meninggal`
   (sudah di registri), `kunci: dibi.sulteng2018.hilang`, `kunci: bnpb.sulteng2018.meninggal_21okt`. [resmi; terverifikasi; sekunder]
8. **Merapi 2010.** 386 (DIBI = rekap BNPB 12 Des 2010: Sleman 277, Magelang 56, Klaten 41, Boyolali 12); 347 (rekap BNPB
   1 Des 2010, sekunder); 354 (skripsi, sumber primer tidak diketahui); Surono dkk. (2012) "hampir 400". Beda karena
   tanggal rekap. Sumber: `dibi/rekonsiliasi.csv`; riset E §E16; `kunci: dibi.merapi2010.meninggal`,
   `kunci: bnpb.merapi2010.meninggal_1des`. [resmi; sekunder; terverifikasi]
9. **Lombok 2018.** 569 (DIBI, jendela 29 Jul–19 Agu termasuk Bali); 564 (riset A, jendela lain); 563 (USGS); 560 (BNPB via
   IGPA UGM, sekunder). Pengungsi 406.202 (DIBI) lawan 396.032. Sumber: `dibi/rekonsiliasi.csv`; `dibi/README.md` bagian
   Keterbatasan; `kunci: dibi.lombok2018.meninggal`. [resmi; terverifikasi; sekunder]
10. **Banjir Jabodetabek awal 2020.** DIBI 31 Des 2019–8 Jan 2020, 14 kab: 51 meninggal (paket `dibi`) atau 52 (paket
    `skenario-hidromet`), 433.628 mengungsi, didominasi satu rekaman Kota Bekasi 366.274 (84,5%, status tidak terbukti);
    DIBI Jabodetabek + Lebak 61 meninggal, 2 hilang; Renstra hlm. 11: 61 meninggal, 11.569 pengungsi, 3.245 rumah rusak.
    Sumber: `dibi/rekonsiliasi.csv`; `skenario-hidromet/README.md` bagian Angka yang bertentangan;
    `kunci: dibi.jabodetabek2020.meninggal`, `kunci: hidromet.jawa.jabodetabek2020.*` (usulan air bab-03). [resmi, dua penerbit]
11. **Plumpang 2023.** 17 meninggal hari ke-2 dan 1.085 pengungsi (Kepala BNPB via Setkab, resmi); 21 (BPBD DKI per 13 Mar,
    sekunder); 29 (BPBD DKI per 18 Mar, sekunder); 19 (riset A, tidak ditemukan ulang); 579 pengungsi (Kompas TV,
    sekunder). DIBI tidak memuat kejadian ini. Paket `dibi` mengatribusikan 17 ke BPBD DKI via Kompas TV; paket
    `nonalam-sosial` ke Kepala BNPB via Setkab. Sumber: `nonalam-sosial/rekonsiliasi.csv`; `dibi/rekonsiliasi.csv`;
    `kunci: nonalam.plumpang2023.meninggal`, `kunci: nonalam.plumpang2023.meninggal_akhir` (sudah di registri).
    [resmi; sekunder]
12. **Faktor evakuasi segera tsunami (tuas prinsip 10).** KERANGKA dan paket `skenario-geologi` memakai ×1 / ×0,662 /
    ×0,437 (20/50/70%, 50% interpolasi linear). Dokumen primer Cabinet Office (Maret 2025): ~215.000 kematian tsunami
    (evakuasi segera rendah 20%), ~94.000 (tinggi 70%), ~129.000 (survei warga 2023, 53,3%), sehingga ×0,437 terkonfirmasi
    dan ×0,662 tidak ada; rasio survei ×0,600; rasio antarkasus 0,077–0,437. **Dibantah oleh** riset E §E3 untuk ×0,662.
    Sumber: riset E §E3; `skenario-geologi/kepekaan.csv` kolom faktor 0,6623; pustaka `cao-japan-2025-nankai` hlm. 4–5,
    18–19; `kunci: nankai.faktor_70`, `kunci: nankai.faktor_survei`, `kunci: geologi.kepekaan.faktor_50_paket`.
    [terverifikasi untuk dokumen Jepang; asumsi-kebijakan untuk tuas]
13. **IRBI nasional 2019–2020.** Rerata naif 514 kab 143,25 dan 140,96 lawan Renstra 144,02 dan 141,65; selisih hilang
    dengan basis 498 kab ber-`fix_values`. Tiga provinsi terendah 2023: Renas menyebut DKI, Papua Pegunungan, DIY; Renstra
    Tabel 1.1 dan API menempatkan Kepulauan Riau (107,79) di bawah DIY (108,15). Indeks provinsi 2019–2023: 150 dari 174 sel
    Renstra tereproduksi. Sumber: `irbi/README.md` §3 dan §5. [resmi, dua dokumen]
14. **Padang 2009.** DIBI 1.195 meninggal dan 2 hilang; USGS 1.117. Sumber: `dibi/kejadian_besar.csv`;
    `kunci: dibi.padang2009.meninggal`. [resmi; terverifikasi]
15. **Potensi kerugian KRB.** Multibahaya Rp4.082,56 T (Renas) lawan jumlah 12 bahaya Rp7.811,98 T; potensi kerugian
    ekonomi Buku RBI 2023 kelas sedang Rp315,78 T dan tinggi Rp1.409,94 T (Renstra hlm. 8–10, alat ukur lain). Sumber:
    P3; `riset/A-dokumen-bnpb.md` §1.4; `kunci: rbi2023.nasional.kerugian_tinggi` (usulan air bab-02). [resmi; jumlah turunan]
16. **Penyebut penduduk.** BPS 2026 287.198.383 (judul tabel "Ribu Jiwa", nilainya jiwa); KRB InaRISK 271.680.290 (tahun
    basis tidak tertulis); WorldPop 2026 286.674.532 (di dalam poligon); SP2020 270,20 juta. Indikator Renas 1.a per 100.000
    berubah menurut penyebut. Sumber: `air-jawa/README.md` §2 dan §6; `nonalam-sosial/krb_covid19_wilayah.csv`;
    `irbi/README.md` §3; riset E §E10; `kunci: bps.penduduk.2026` (usulan mitigasi bab-01). [resmi; estimasi-model untuk
    WorldPop]
17. **Registri angka utama tidak sejalan dengan label paket.** `data/angka.json` memberi `nonalam.plumpang2023.meninggal_akhir`
    (29) keyakinan resmi, padahal `nonalam-sosial/skenario_terburuk.csv` melabelinya sekunder; `sosial.kerusuhan2025.meninggal_komnas`
    (11) keyakinan resmi, padahal angkanya dari Komnas HAM via berita (resmi, sekunder di `dibi/kejadian_besar.csv`);
    `irbi.nasional.2015` dan `irbi.nasional.persen_2015_2024` kini sudah asumsi-kebijakan (sesuai paket). Sumber:
    `data/angka.json`; `nonalam-sosial/skenario_terburuk.csv`; `dibi/kejadian_besar.csv` kode `kerusuhan2025`.
    [resmi untuk isi; catatan untuk pemilik registri]
18. **Cianjur 2022, DIBI lawan R3P.** Meninggal: DIBI 602 meninggal dan 8 hilang (jendela 21–30 Nov 2022, 5 kab;
    Renstra hlm. 11 juga 602) lawan R3P 334 meninggal dan 8 hilang (data BPBD per 7 Des 2022, dikutip dokumen R3P).
    Rumah rusak: DIBI 57.337 (5 kab, jendela yang sama) atau 56.278 (Kab. Cianjur saja: 13.633 RB, 16.059 RS, 26.586 RR;
    angka yang dikutip KERANGKA); Renstra hlm. 11: 56.548; R3P 114.315 (20.969 RB, 24.584 RS, 68.762 RR) menurut SK
    Bupati 360/KEP.401-BPBD/BPBD/2022 tahap II hasil reviu BNPB. Mengungsi: DIBI 115.382 (5 kab) atau 114.683 (Kab.
    Cianjur), Renstra 108.720, R3P 114.683. Bedanya karena definisi: tanggal rekap (meninggal R3P per 7 Des, DIBI nominal
    terakhir), wilayah (5 kab lawan Kab. Cianjur), dan dasar rumah (laporan tanggap darurat lawan SK Bupati hasil
    verifikasi dan reviu). Keduanya resmi dan ditulis berdampingan; tidak dirata-rata. Sumber: `dibi/kejadian_besar.csv`
    kode `cianjur2022`; `dibi/rekonsiliasi.csv`; `skenario-geologi/pembanding_pdna.csv` baris Cianjur (RB/RS/RR Kab.
    Cianjur); `riset/E-dokumen-primer.md` §E5; pustaka `cianjur-2022-r3p` hlm. PDF 13 dan 55;
    `kunci: dibi.cianjur2022.meninggal`, `kunci: dibi.cianjur2022.rumah_rusak`, `kunci: r3p.cianjur2022.meninggal_7des`,
    `kunci: r3p.cianjur2022.rumah_rusak`. [resmi, dua dokumen; R3P berstatus contoh dokumen tanpa nomor penetapan]

**Keterbatasan (3.10)** [resmi untuk status data]

- DIBI data hidup, dibekukan per tarik 23 Okt 2026 15.23 WIB; 2026 sementara (final sekitar Februari tahun berikutnya).
  Sumber: `dibi/README.md` bagian Definisi dan Keterbatasan.
- Audit metode platform 21 Okt 2026: 329 metode, 14 layak, 150 layak dengan catatan, 165 tidak layak; model korban gempa
  tidak layak untuk gempa nyata (galat LOO ×5,3); rasio analog guncangan dari gempa kerak dan slab diterapkan ke megathrust
  antarmuka tanpa uji; GMPE belum diuji; aturan peringatan kekeringan SPI-3 POD 0,10, FAR 0,99; replay banjir Maret 2025
  luas tergenang 14,5 kali survei ITB. Sumber: `riset/D-inventaris-platform.md` pembuka dan §1; `skenario-geologi/README.md`
  §8; `skenario-hidromet/README.md` bagian Keterbatasan. [resmi untuk vonis internal; dokumen audit tidak dibuka penyusun bukti]
- Sekolah dan faskes terpapar hanya 9 provinsi; bangunan hanya Kalimantan Tengah; penduduk BPS per kab belum ditarik;
  luas genangan rob dan debit sungai tidak ada. Sumber: KERANGKA §7 butir 8, 23, 25; `skenario-geologi/README.md` §8.

### Inferensi

- *Penilaian tim:* rancangan Tabel 3.8 memuat butir 1, 3, 4, 5, 6, 7, 8, 10, 11, 12, 15, dan 18 (yang mengubah angka atau
  arah; Cianjur memuat dua baris, meninggal dan rumah rusak, dengan definisinya); butir 2, 9, 13, 14, 16 cukup di
  Lampiran G. Kolom: butir, versi, sumber, label, verifikasi, definisi, yang dipakai,
  alasan.
- *Penilaian tim:* untuk KD-3, titik awal resmi menuju 90% adalah 62% (RPJMN, IKD, 2023). Angka 38% (KRB 2022–2026,
  baris nasional endpoint COVID-19, identik dengan enam ringkasan bahaya lain) hanya pembanding berlabel asumsi-kebijakan;
  turunan, sampai BNPB menyatakan bahwa kelas kapasitas KRB setara dengan alat ukur IKD. Angka 67% bukan baseline, melainkan target 2025; naskah tidak menulis "dari 67%" tanpa keterangan itu.
  Penyelarasan teks Renstra masuk lampiran Penyelarasan dokumen BNPB dengan suara BNPB.
- *Penilaian tim:* KERANGKA prinsip 10 perlu disunting pemiliknya: tuas evakuasi menjadi ×1 / ×0,600 / ×0,437 (rendah,
  survei, tinggi), dengan catatan bahwa ×0,437 adalah rasio paling konservatif dari delapan kasus; paket `skenario-geologi`
  menyusul. Selama belum disunting, ×0,662 tidak boleh tampil di naskah.
- *Penilaian tim:* jumlah segmen megathrust di naskah memakai PuSGeN 2024 (14). Angka 13/295 dari isu RPJMN ditulis di
  lampiran Penyelarasan sebagai rujukan versi lama; angka 15 GeoServer adalah susunan layer peta, bukan jumlah segmen
  resmi; angka 16 tidak dipakai.
- *Penilaian tim:* korban kejadian besar memakai DIBI sebagai angka utama bila DIBI memuatnya, dengan jendela dan wilayah
  tertulis (`turunan_penyusun = ya`), dan USGS atau rekap BNPB awal sebagai pembanding. Untuk kejadian tanpa baris DIBI
  (Plumpang, COVID-19, Aceh 2004) dipakai versi resmi terbuka paling akhir yang dibuka dari penerbitnya.

### Celah

- Isi temuan BPK atas penanggulangan bencana (IHPS 2018, 2023, 2024, 2025) belum dibaca; tidak diklaim (KERANGKA §7 butir 31).
- Versi 19 meninggal Plumpang (riset A) tidak ditemukan ulang; tidak dipakai.
- Rekaman Kota Bekasi 1 Jan 2020 belum dicek ke BPBD Kota Bekasi; tetap "tidak terbukti" dan ditangani lewat uji kepekaan.
- Tanggal ekspor data IRBI di API tidak tertulis (`meta.source` "database_export"); revisi diam-diam tidak dapat dideteksi
  selain lewat SHA-1 salinan (sama antara 18 dan 23 Okt 2026).
- Laporan LNHAM kerusuhan Agustus 2025 (20 Apr 2026) belum dibuka; versi korban hanya Komnas HAM via berita.

---

## Komponen

| Kode | Komponen | Isi | Sumber data | Pola (PEDOMAN) | Keyakinan |
| --- | --- | --- | --- | --- | --- |
| Tabel 3.1 | Sumber, produsen, dan label | rancangan di P1 Inferensi | README paket; Perban 1/2023 | B5.7 | campuran |
| Tabel 3.2 | Bukti patahan skala IRBI 2025 | per tahun 2015–2025: rerata, perubahan, porsi kab naik, Spearman, porsi total = jumlah bahaya, maks; baris tambahan nilai unik per bahaya 2024 lawan 2025 | `irbi/irbi_bukti_skala_tahunan.csv`; `irbi/irbi_bukti_skala_bahaya.csv` | B5.7 | asumsi-kebijakan; analisis penyusun atas data resmi |
| Tabel 3.3 | Skala dampak 1–5 per aspek | lima aspek Perban 2/2023 × lima kelas; ambang kependudukan dari pita fatalitas Cabinet Office, aspek lain logaritmik dari DIBI; ekonomi dan lingkungan "tidak dinilai" atau KRB batas atas | `dibi/rekap_provinsi_tahunan.csv`; NRR 2025 hlm. 14 | B5.7, B5.27 (kosakata `skala_dampak`, `aspek_dampak`) | asumsi-kebijakan |
| Tabel 3.4 | Dasar kemungkinan per jenis | rancangan di P2 Inferensi | `riset/mentah/oni_cpc.txt`; riset E §E1; `kartu_skenario.csv` | B5.7 | asumsi-kebijakan; turunan |
| Tabel 3.5 | Matriks ketersediaan kuantifikasi | 14 baris jenis × 6 metrik, kode R/T/E/– dan alasan satu kalimat | P3; README paket skenario dan nonalam-sosial | G16 (tabel peta panas §B5.7) | campuran |
| Tabel 3.6 | Tiga besaran kerugian | rancangan di P3 Inferensi | Renas hlm. 24–25; R3P Cianjur; `turunan/profil_kerugian.csv` | B5.7 | resmi; asumsi-kebijakan |
| Tabel 3.7 | Aturan daftar perhatian dan uji kepekaan | syarat per kelompok, jumlah kab per syarat, daftar dasar, varian (b) ±1 tahun dan (a) dua kelas, provinsi utama dua kriteria | `turunan/daftar_perhatian.csv`, `daftar_perhatian_kepekaan.csv`, `provinsi_utama.csv` | B5.7 | asumsi-kebijakan |
| Tabel 3.8 | Rekonsiliasi angka | butir terpilih P4 | `dibi/rekonsiliasi.csv`; `nonalam-sosial/rekonsiliasi.csv`; riset E | B5.7 | per baris |
| Gambar 3.1 | Rantai metode | sumber resmi (DIBI, IRBI/KRB, ONI, PuSGeN, SiPongi, BPS) → paket data → registri angka → bahaya dan histori → lantai → kemungkinan → dampak lima aspek → kelas dan matriks 5×5 → daftar perhatian → program dan rekomendasi; produsen dan label di tiap kotak | KERANGKA §2; Bab ini | B5.23 (diagram vektor; aliran tanpa lebar sebanding, G21) | – |

Usul tambahan (bila halaman cukup, bukan wajib KERANGKA): satu grafik batang rerata IRBI 2015–2025 dengan 2025 dipisah
garis patahan (G1), sumber `irbi/irbi_bukti_skala_tahunan.csv`, untuk memperlihatkan lompatan +19,43 secara visual.

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/mitigasi/bukti/bab-03.angka.json` (bentuk entri sama dengan `data/angka.json`;
`data/angka.json` tidak disunting). Kunci lama dan usulan berkas lain yang dipakai ulang tercantum di `_catatan` JSON.

| Kunci | Nilai | Berkas sumber dan jalur, atau pustaka | Label |
| --- | --- | --- | --- |
| irbi.nasional.2025_rerata | 147,95 | `irbi/irbi_bukti_skala_tahunan.csv` [tahun=2025].rerata_total | asumsi-kebijakan; turunan |
| irbi.skala.perubahan_2025 | +19,43 | idem .perubahan_dari_tahun_lalu | asumsi-kebijakan; analisis penyusun atas data resmi |
| irbi.skala.spearman_2025 | 0,589 | idem [tahun=2025].spearman_dengan_tahun_lalu | idem |
| irbi.skala.spearman_2016 | 0,88 | idem [tahun=2016] | idem |
| irbi.skala.porsi_total_jumlah_2015 | 58,03% | idem [tahun=2015].porsi_total_sama_jumlah_bahaya × 100 | idem |
| irbi.skala.porsi_total_jumlah_2025 | 0% | idem [tahun=2025] | idem |
| irbi.skala.porsi_kab_naik_2025 | 63,04% | idem .porsi_kab_naik × 100 | idem |
| irbi.skala.maks_2024 / maks_2025 | 214,8 / 278,51 | idem .maks_total | resmi (nilai API) |
| irbi.skala.banjir_nilai_unik_2024 / 2025 | 310 / 29 | `irbi/irbi_bukti_skala_bahaya.csv` [bahaya=banjir,tahun=…].n_nilai_unik | asumsi-kebijakan; analisis penyusun |
| irbi.kab.tinggi.2025 / sedang.2025 | 169 / 345 | `irbi/irbi_hitung_kelas.csv` [tingkat=kab,tahun=2025] | resmi |
| irbi.nasional.persen_naif_2024_2025 | +15,1% | dihitung dari baris 2024 dan 2025 | asumsi-kebijakan; ilustrasi |
| irbi_dibi.nasional.spearman.(8 bahaya) | −0,313 sampai +0,254 | dihitung dari `irbi_kab_2025.csv` dan DIBI per kab | asumsi-kebijakan; analisis penyusun atas data resmi |
| irbi_dibi.nasional.banjir.median_laporan_kuintil5 / kuintil1 | 10 / 27 | idem | idem |
| irbi.nasional.2025.longsor_kosong / _berkejadian | 59 / 27 | idem | resmi; dihitung |
| irbi.nasional.2025.karhutla_kosong / _berkejadian | 47 / 20 | idem | resmi; dihitung |
| dibi.nasional.kejadian.2024 | 3.548 | `dibi/rekap_nasional_tahunan.csv` [tahun=2024,klasifikasi=semua,cakupan=bencana].kejadian | resmi |
| dibi.nasional.kejadian_semua_laporan.2024 / .2025 | 3.636 / 9.305,45 | idem cakupan=semua_laporan | resmi |
| dibi.nasional.kejadian_alam.2024 | 3.471,5 | jumlah baris alam 101–109 | resmi; dijumlah |
| ckan.nasional.kejadian.2024 | 3.472 | `dibi/rekonsiliasi.csv` (CKAN) | resmi |
| bnpb_pers.nasional.kejadian_2024_a / _b | 2.107 / 5.593 | `dibi/rekonsiliasi.csv` (konferensi pers) | resmi; sekunder |
| dibi.nasional.longsor.kejadian_semua_laporan.2024 / kejadian.2024 | 219 / 207 | `dibi/rekap_nasional_tahunan.csv` [tahun=2024,kode_jenis_juklak=102,cakupan=…] | resmi |
| dibi.nasional.nonalam_sosial.kejadian.2025 | 363 | jumlah nonalam, sosial, lainnya | resmi; dijumlah |
| dibi.provinsi_tahun.fasilitas_rusak.(p50, p90, p99, maks) | 10; 169; 1.406; 4.875 | dihitung dari `dibi/rekap_provinsi_tahunan.csv` | resmi; turunan |
| dibi.provinsi_tahun.n_skor_nrr4 / n_skor_nrr5 | 10 / 2 | idem dengan pita NRR | asumsi-kebijakan; turunan |
| dibi.nasional_tahun.meninggal_hilang_min | 276 | idem, 2015 | resmi; dijumlah |
| nrr_2025.fatalitas.kelas1_atas … kelas4_atas | 8; 40; 200; 1.000 | pustaka `cabinetoffice-2025-nrr` hlm. 14 | terverifikasi |
| hidromet.nasional.terberat.korban_jiwa | 395,8–954,3 | `skenario-hidromet/kartu_skenario.json` | estimasi-model; belum diuji balik |
| hidromet.nasional.terberat.meninggal_tercatat | 1.506 | idem | resmi |
| hidromet.nasional.terberat.korban_jiwa_banjir | 229,3–580,1 | idem | estimasi-model; belum diuji balik |
| hidromet.nasional.terberat.meninggal_hilang_tercatat_banjir | 1.421 | idem | resmi |
| hidromet.nasional.gelombang_abrasi_rob.korban_jiwa | 5,1–90 | idem | estimasi-model; belum diuji balik |
| hidromet.nasional.musim_2025.mengungsi / rumah_rb | 1.043.740 / 65.929 | `skenario-hidromet/musim_hujan.csv` | resmi |
| hidromet.nasional.lantai.peluang_5_musim | 23,7% | rumus 1 − (18/19)^5 | asumsi-kebijakan |
| geologi.jawa.korban_analog / jawa_mmaks / mentawai | 0–2.602 / 10.720–136.032 / 567–7.708 | `skenario-geologi/ringkasan.csv` | estimasi-model; belum diuji balik |
| dibi.yogya2006.meninggal_usgs | 5.749 | `dibi/kejadian_besar.csv` [kode=yogya2006,versi=USGS] | terverifikasi |
| dibi.padang2009.meninggal; dibi.sulteng2018.hilang | 1.195; 705 | `dibi/kejadian_besar.csv` versi DIBI | resmi |
| pusgen.* (Mmaks, periode ulang, segmen, sesar) | 9,1; 600; 400; 8,5; 14; 13; 401; 273 | pustaka `pusgen-2024-peta-gempa` | resmi |
| geologi.jawa_gabungan.peluang_5th / jawa_segmen.peluang_5th | 0,83% / 1,24% | rumus Poisson dari periode ulang PuSGeN | asumsi-kebijakan; turunan |
| renstra.megathrust_segmen / renstra.sesar_aktif | 13 / 295 | pustaka `bnpb-2025-renstra` hlm. 69 | resmi |
| inarisk.geoserver.megathrust_segmen | 15 | `docs/multi-bencana/SUMBER-BNPB.md` | resmi; keberadaan layer |
| nankai.faktor_70 / faktor_survei | 0,437 / 0,600 | pustaka `cao-japan-2025-nankai` | terverifikasi; rasio dihitung |
| geologi.kepekaan.faktor_50_paket | 0,662 | `skenario-geologi/kepekaan.csv` | asumsi-kebijakan; dibantah dokumen primer |
| renas.krb.kerugian_multibahaya | Rp4.082,56 T | pustaka `bnpb-2025-renas` hlm. 23–24 | resmi |
| renas.krb.kerugian_jumlah_per_bahaya | Rp7.811,98 T | jumlah 12 baris hlm. 24–25 | asumsi-kebijakan; turunan |
| renas.krb.kerugian_gempa / kerugian_cuaca_ekstrem | Rp1.111,32 T / Rp2.744,33 T | idem | resmi |
| krb.nasional.kab_kapasitas_rendah / sedang / tinggi | 315 / 190 / 3 | `nonalam-sosial/krb_covid19_wilayah.csv` [tingkat=nasional_api] (endpoint `kajian-summary/covid-19`; identik dengan enam ringkasan bahaya lain kecuali Fakfak) | resmi |
| krb.nasional.kapasitas_minimal_sedang_persen | 37,99% | dihitung (190 + 3)/508 | asumsi-kebijakan; turunan |
| geologi.pangandaran2006.meninggal | 665 | `skenario-geologi/analog.csv` [id=pangandaran-2006].meninggal | terverifikasi |
| dibi.mentawai2010.meninggal / hilang | 447 / 56 | `dibi/kejadian_besar.csv` [kode=mentawai2010,versi=DIBI] | resmi |
| dibi.selatsunda2018.meninggal / hilang | 437 / 16 | `dibi/kejadian_besar.csv` [kode=selatsunda2018,versi=DIBI] | resmi |
| gempa.laju_m6.nasional.peluang_5th; prov11; prov12; prov13 | > 99,9%; 98,6%; 92,9%; 90,6% | dihitung 1 − e^(−5λ) dari `public/gempa/data/laju.json` | estimasi-model |
| dibi.cianjur2022.meninggal / rumah_rusak | 602 / 57.337 | `dibi/kejadian_besar.csv` [kode=cianjur2022,versi=DIBI] | resmi |
| r3p.cianjur2022.meninggal_7des / rumah_rusak | 334 / 114.315 | pustaka `cianjur-2022-r3p` hlm. PDF 13, 55 | resmi; contoh dokumen |
| kerugian.nasional.maks_tercatat | Rp9,46–11,90 T (2018) | `turunan/profil_kerugian.csv` [lapisan=tahun,tahun=2018] | asumsi-kebijakan |
| kerugian.pengali.cianjur2022_r3p / lombok2018_kemenkopmk | 2,68 / 1,60 | dihitung dari R3P, Kemenko PMK, dan `skenario-geologi/pembanding_pdna.csv` | asumsi-kebijakan; turunan |
| renstra.peringatan_dini.keterpenuhan_persen | 6% | pustaka `bnpb-2025-renstra` hlm. 70 | resmi |
| rpjmn.peringatan_dini.baseline | 6,00% | pustaka `ri-2025-perpres12-rpjmn` Lampiran III hlm. 913 | resmi |
| perhatian.mitigasi.banjir.n_syarat_b / cuaca_ekstrem.n_syarat_b / kekeringan.n_syarat_c | 462 / 385 / 2 | dihitung dari `turunan/daftar_perhatian.csv` | asumsi-kebijakan |
| perhatian.mitigasi.banjir.n_a_dua_kelas / karhutla.n_a_dua_kelas | 304 / 108 | `turunan/daftar_perhatian_kepekaan.csv` | asumsi-kebijakan |
| perhatian.mitigasi.kekeringan.n_kab_di_batas / karhutla.n_kab_di_batas | 56 / 60 | dihitung dari `irbi/irbi_kab_2025.csv` | asumsi-kebijakan; analisis penyusun |
| perhatian.mitigasi.prov33.n_kab / prov35.n_kab | 33 / 33 | `turunan/provinsi_utama.csv` | asumsi-kebijakan |
| perhatian.mitigasi.prov72.meninggal_hilang / prov32.meninggal_hilang | 4.925 / 1.260 | idem | resmi (DIBI); dijumlah |
| dibi.merapi2010.meninggal; bnpb.merapi2010.meninggal_1des | 386; 347 | `dibi/kejadian_besar.csv`; `dibi/rekonsiliasi.csv` | resmi; resmi, sekunder |
| dibi.lombok2018.meninggal; dibi.jabodetabek2020.meninggal | 569; 51 | `dibi/kejadian_besar.csv` versi DIBI | resmi |
| bnpb.sulteng2018.meninggal_21okt | 2.256 | `dibi/rekonsiliasi.csv` | resmi; sekunder |

---

## Pustaka

Entri CSL-JSON di `naskah/mitigasi/bukti/bab-03.pustaka.json` (24 entri, termasuk `undrr-wmo-2022-mhews` dan
`kemenkopmk-2024-rehabrekon-lombok` yang ditambahkan saat perbaikan; kunci sama dengan berkas bukti lain bila
sumbernya sama). Dibuka ulang penyusun bukti pada 24 Okt 2026: NRR 2025 (PDF, hlm. 10–17), siaran WMO 13 Okt 2022, dan
korpus JDIH lokal (Perban 1/2023, 2/2023, 1/2025, 5/2025, 5/2017, 6/2017, Perka 2/2012, 7/2008, 15/2011, Juklak 7/2023).
Dokumen yang dibuka riset E pada 23 Okt 2026 dan dipakai lewat berkas riset itu: PuSGeN 2024, Cabinet Office Jepang
(Nankai), Perpres 12/2025, R3P Cianjur, Koplitz dkk. (2016), siaran BMKG 22 Sep 2026.

Kunci: `bnpb-2025-renas`, `bnpb-2025-renstra`, `bnpb-2023-satudata`, `bnpb-2023-renkon`, `bnpb-2023-juklak7`,
`bnpb-2012-pengkajian-risiko`, `bnpb-2011-pdna`, `bnpb-2017-r3p`, `bnpb-2008-kebutuhan-dasar`, `bnpb-2018-pengungsi`,
`bnpb-irbi`, `bnpb-dibi`, `bnpb-2026-krb`, `noaa-2026-oni`, `cabinetoffice-2025-nrr`, `cao-japan-2025-nankai`,
`pusgen-2024-peta-gempa`, `ri-2025-perpres12-rpjmn`, `wmo-2022-peringatan-dini`, `cianjur-2022-r3p`, `koplitz-2016-haze`,
`bmkg-2026-siaran-musim-hujan`, `undrr-wmo-2022-mhews`, `kemenkopmk-2024-rehabrekon-lombok`.

---

## Catatan perbaikan atas temuan pemeriksa (24 Okt 2026)

Semua sebelas temuan dicek ke sumber sebelum diubah; tidak ada yang ditolak seluruhnya. Dua diterima dengan catatan.

| No | Temuan | Hasil cek | Tindakan |
| --- | --- | --- | --- |
| 1 | Lantai gempa menyimpang dari KERANGKA §2 butir 9 | benar: Pangandaran 665 (`skenario-geologi/analog.csv`), Mentawai 2010 447 + 56, Selat Sunda 2018 437 + 16 (`dibi/kejadian_besar.csv`) tidak disebut; Yogyakarta 2006 (kerak M6,3) dan Padang 2009 (slab M7,6) bukan megathrust | lantai KERANGKA ditulis; kesimpulan "melanggar lantai" dan "dinaikkan ke lantai" dicabut; pilihan lantai lintas sumber gempa diserahkan ke pemilik sebagai bantahan |
| 2 | Lantai per jenis tidak terjawab | benar: `lantai_jenis.csv` tidak ada | baris Celah (pemilik `pipa-data`); Inti dan tabel cek diperbaiki; kartu per jenis tanpa angka lantai |
| 3 | Rekonsiliasi Cianjur 2022 hilang | benar | P4 butir 18 dan Tabel 3.8; tabel cek diperbaiki. Catatan: KERANGKA menulis DIBI 56.278 rumah rusak (Kab. Cianjur saja), `kejadian_besar.csv` 57.337 (5 kab); keduanya ditulis |
| 4 | Laju M6+ tidak dipakai | benar | dipakai per provinsi (estimasi-model) sebagai peluang kejadian pemicu; peluang skenario korban gempa lain tetap "tidak dinilai" dengan alasan tertulis |
| 5 | La Niña disebut pemicu lantai | benar: ONI hanya 3 musim ≤ −0,5 di sekitar NDJ 2025 | baris kepekaan ENSO dipisah; "pemicu" dihapus |
| 6 | Larangan tampil tidak diterapkan ke hidrometeorologi; pembanding 1.506 | benar; ditambah cuaca ekstrem La Niña (38,7 lawan 18) yang juga kena | pita yang melampaui catatan ditandai; pembanding diganti 1.692 |
| 7 | Faktor WMO tanpa catatan kausal; rujukan siaran pers | benar | catatan "bukan efek kausal; rasio antarnegara" ditambahkan; rujukan utama `undrr-wmo-2022-mhews`. **Catatan:** halaman UNDRR dan PDF laporan menolak akses (HTTP 403 dan halaman pemeriksaan keamanan) saat dibuka 24 Okt 2026, sehingga isi laporan masih dibaca lewat siaran WMO; entri pustaka laporan berstatus sekunder sampai PDF dibuka |
| 8 | Kapasitas KRB dari endpoint COVID-19 | benar soal asal endpoint; dicek ulang ke enam ringkasan bahaya lain dan kelas kapasitas kab identik (314/190/3 + 7 kosong; selisih 1 karena Fakfak), sehingga kekhawatiran bahwa kelas itu khusus COVID-19 tidak terbukti | asal endpoint ditulis di teks dan registri; 37,99% diturunkan ke asumsi-kebijakan; turunan karena kesetaraan dengan IKD belum terbukti; titik awal resmi KD-3 tetap 62% |
| 9 | Pengali Cianjur dan Lombok dari media | benar | dihitung ulang: Cianjur 2,68 (R3P Rp4,55 T), Lombok 1,60 (Kemenko PMK Rp11,44 T, besaran kebutuhan); angka media sekunder; permintaan ke `pipa-data` di Celah P3 |
| 10 | Lapisan berat menyisihkan 2018 | benar: p90 = tahun 2025; 2018 Rp9,46–11,90 T | maksimum 2018 ditulis berdampingan; penerapan lantai ke lapisan pembiayaan diserahkan ke pemilik dengan usul |
| 11 | Label ONI dan istilah "Produsen" | benar (Perban 1/2023 Pasal 1 angka 6) | ONI terverifikasi; kolom menjadi "Penerbit" |

