---
kajian: mitigasi
bab: 5
judul: BAB 5 PROFIL RISIKO NASIONAL
jenis: berkas bukti
disusun: 24 Oktober 2026
status: bukti draf (belum melewati penyunting substansi)
pemilik_berkas: pipa-data (ilmu.mjs pemilik)
pasangan: bab-05.angka.json (92 usulan kunci registri), bab-05.pustaka.json (CSL-JSON, 22 sumber)
---

# Berkas bukti BAB 5 PROFIL RISIKO NASIONAL, Grand Design Mitigasi Bencana Indonesia 2026–2030

Aturan yang dipakai: Buku Pegangan L56–L57 dan `PEDOMAN-DESAIN.md` §C9 (empat bagian per pertanyaan kunci), `KERANGKA.md`
§2 (prinsip 5–9, 12, 18), §5 BAB 5, §6 (KD-3, KD-4), §7 (celah 12, 13, 14, 25), dan `KEPUTUSAN.md` (P9, P10). Label
keyakinan memakai empat kode registri: **resmi**, **terverifikasi**, **estimasi-model**, **asumsi-kebijakan**. Butir
bertanda **[Inferensi tim]** adalah penilaian penyusun, bukan fakta bersumber. Hitungan yang ditandai [dihitung penyusun
bukti] dibuat 24 Oktober 2026 dari paket data repo dengan Python stdlib (skrip kerja di luar repo; belum menjadi skrip
paket, lihat Celah PK1).

Bahan yang dibaca: `riset/A-dokumen-bnpb.md` (§1.1–1.4, §2.3, §7, §8), `riset/E-dokumen-primer.md` (§E1, §E11, §E15,
§E18, §3), `riset/C-benchmark.md` (§1.2), `riset/D-inventaris-platform.md` (§6), `riset/B-air-jawa.md` (tidak dipakai:
lingkup Jawa dan air). Paket data: `irbi` (README §1–6), `dibi` (README), `turunan` (`bangun/turunan.py`; paket tanpa
README), `nonalam-sosial` (README, `krb_covid19_kab.csv`, `skenario_terburuk.csv`), `skenario-hidromet` (README,
`dibi_kab_tahun.csv`, `dibi_geologi_kab_tahun.csv`, `paparan_kab.csv`, `musim_hujan.csv`), cache
`riset/mentah/ks_*.json` (InaRISK kajian-summary). Korpus `data/raw/hukum/teks` (Renas, Renstra, Perban 2/2023) dan
katalog `data/raw/hukum/indeks.json`. Berkas bukti saudara yang dirujuk agar angka tidak bercabang:
`naskah/mitigasi/bukti/bab-02.md`, `bab-03.md` (aturan daftar perhatian, korelasi per bahaya, skala dampak, dasar
kemungkinan), `bab-04.md`. Sumber web dibuka 24 Oktober 2026: halaman JDIH BNPB Perka 3/2012, *A Guide to the 2026
National Risk Register* (Cabinet Office, PDF dibaca dengan `pdftotext`), siaran Kemenko PMK 12 September 2025, halaman
gov.uk National Risk Register 2025.

## 0. Kerangka bab dari KERANGKA.md §5

- **Judul:** BAB 5 PROFIL RISIKO NASIONAL (15 hlm).
- **Subbab:** 5.1 Capaian IRB 2015–2024; 5.2 Potret IRBI 2025 per Bahaya; 5.3 Sebaran per Pulau; 5.4 Sebaran per Provinsi
  dan Provinsi Utama; 5.5 Daftar Perhatian Kab/Kota; 5.6 Kapasitas Daerah: Dua Ukuran; 5.7 Keterpaparan Penduduk dan Aset;
  5.8 Penilaian Risiko Nasional Terbanding.
- **Tujuan bab:** menunjukkan di mana risiko terkonsentrasi dari pulau sampai kab/kota, dan jenis bencana mana yang berada
  di kelas dampak tertinggi.
- **Pertanyaan kunci:** (1) Di pulau, provinsi, dan kab/kota mana risiko terkonsentrasi menurut IRBI dan DIBI? (2) Mengapa
  capaian IRB tidak diikuti penurunan korban? (3) Berapa daerah berkapasitas minimal sedang menurut dua ukuran resmi?
  (4) Jenis bencana apa yang berada di kelas dampak tertinggi, dan untuk jenis mana kemungkinan dapat dinilai?
- **Temuan kunci yang diharapkan (KERANGKA):** IRB nasional 2019–2024 144,02 ke 128,52, turun 10,76% (Resmi), 2015–2018
  Asumsi kebijakan; IRBI 2025 169 Tinggi, 345 Sedang (Resmi), agregat pulau dan provinsi 2025 Asumsi kebijakan, kelas
  provinsi resmi 2023 13 Tinggi (tertinggi Sulawesi Barat, Maluku, Kepulauan Bangka Belitung); kapasitas 67% (Renstra,
  IKD) lawan 38% (KRB 2022–2026: 193 dari 508) berdampingan sampai KD-3 diputus; keterpaparan KRB per bahaya (gempa
  praktis seluruh penduduk; banjir 113,8 juta; longsor 25,3 juta; likuefaksi 86,7 juta; tsunami 5,3 juta; gunung api 5,9
  juta); Spearman IRBI 2025 lawan kejadian DIBI untuk 514 kab dihitung dan dilaporkan; matriks terbanding per jenis
  (15 jenis `tema.json`, satu titik per kartu per jenis; KERANGKA baris 1226 dan 1583, keputusan V05/V08 baris 225) dengan
  panel "dampak dinilai, kemungkinan tidak dinilai" (COVID-19 kelas tertinggi pada aspek kependudukan).
- **Komponen (KERANGKA):** Gambar 5.1 tren IRB nasional dan per pulau 2015–2024 (G2); Gambar 5.2 peta status IRBI 2025 per
  kab/kota (G19, ramp T8); Gambar 5.3 peta kecil berganda IRBI 2025 per bahaya (G19); Tabel 5.1 peta panas bahaya × pulau
  (G16); Gambar 5.4 kelas provinsi 2023 resmi (G19); Tabel 5.2 provinsi utama dua kriteria (B5.7); Tabel 5.3 ringkasan
  daftar perhatian per bahaya (B5.7); Gambar 5.5 kapasitas kab KRB (G19) dan Tabel 5.4 dua ukuran kapasitas; Gambar 5.6
  matriks kemungkinan × dampak (G17, B5.27) dengan panel jenis tanpa dasar peluang.
- **Status data menurut KERANGKA:** ada; sebagian (indeks provinsi 2025 tanpa metode resmi; IKD per kab tidak ada di paket).
- **Keputusan yang diminta yang bergantung pada bab ini:** KD-3 (alat ukur kapasitas untuk IKS 90% pada 2029) dan KD-4
  (catatan metode dan baseline IRBI 2025). Deck slide B1 dan B2 mengambil angkanya dari bab ini.
- **Keputusan atas temuan uji yang mengikat bab ini (KERANGKA §1):** P04 (IRB 2024 dibahas di sini sebagai capaian), P07
  dan R21 (sasaran IRB dan kapasitas tidak terukur konsisten), P08 dan B06 (daftar perhatian dengan aturan syarat, provinsi
  utama dua kriteria), D07, K14, B22 (tren 2015–2024; potret 2025 terpisah; kelas provinsi resmi 2023), D14 (IRBI dan DIBI
  disandingkan dengan korelasi).

### 0.1 Hasil cek terhadap KERANGKA yang wajib diketahui penulis bab

1. **"67% (Renstra, IKD)" adalah target 2025, bukan capaian.** Renstra hlm. 125 menulis "target tahun 2025 sebesar 67
   persen dan tahun 2029 bertambah menjadi 90 persen"; tabel target hlm. 132 dan 152: 67% (2025), 73% (2026), 79% (2027),
   85% (2028), 90% (2029), kolom baseline kosong. Baseline resmi ada di RPJMN Lampiran III hlm. 913: 62% (2023). Renstra
   tidak menyebut alat ukur indikator ini secara tertulis; hlm. 85 hanya menjelaskan IKD sebagai upaya mengukur kapasitas.
   Kalimat naskah: "RPJMN 62% (baseline 2023), target Renstra 67% (2025)", bukan "67% menurut IKD".
2. **KRB 2022–2026 memuat tiga ukuran kapasitas, bukan satu.** Kab/kota 193 dari 508 minimal sedang (38,0%), kecamatan
   3.069 dari 7.222 (42,5%), provinsi 31 dari 34 (91,2%, Renas Tabel 2.7). Bila jumlah kab dibobot penduduk KRB, porsi
   penduduk yang tinggal di kab berkapasitas minimal sedang 67,0%. Angka 67,0% ini kebetulan sama dengan target Renstra
   2025 dan tidak boleh ditulis sebagai sumber angka Renstra.
3. **Spearman IRBI 2025 lawan kejadian DIBI per kab negatif**: −0,38 (514 kab, total IRBI lawan kejadian alam DIBI
   2015–2025 cakupan semua laporan); lawan meninggal dan hilang −0,04. Korelasi per bahaya sudah dihitung `bab-03.md` P1
   (banjir −0,313 sampai gunung api +0,254); bab ini memakai kunci itu dan menambah korelasi indeks total.
4. **Jawa terbanyak secara absolut karena penduduknya, bukan kebalikan dari peta IRBI 2025.** Jawa memuat 1 dari 169 kab
   Tinggi (Kab. Sukabumi) dan 47,2% kejadian DIBI 2015–2025, tetapi juga 56,1% penduduk (WorldPop 2026). Per kapita Jawa
   justru di bawah rerata nasional: 12,3 kejadian dan 1,86 meninggal dan hilang per 100.000 penduduk (2015–2025) lawan
   nasional 14,7 dan 4,70; porsi penduduk terpapar banjir KRB (55,5%) praktis sama dengan porsi penduduknya. Naskah menulis
   porsi kejadian, korban, dan keterpaparan di samping porsi penduduk (T1.8a) dan tidak menulis "risiko terkonsentrasi di
   luar Jawa" atau "Jawa kebalikan IRBI" tanpa menyebut ukurannya.
5. **Kemerosotan IRB 2015–2024 tampak di sembilan bahaya**, termasuk gempa, tsunami, dan gunung api yang bahaya fisiknya
   tidak berubah dalam lima tahun (median per bahaya turun 9,9% sampai 24,6% pada 2019–2024). Penurunan per bahaya itu
   umumnya satu pengali per kab, bukan sembilan pengamatan bebas (T2.3), dan pembaruan peta bahaya sebagai masukan indeks
   belum dikecualikan. Ini bahan PK2.
6. **Daftar perhatian kab/kota mitigasi mencakup 426 dari 514 kab (82,9%)**, 903 pasangan kab–bahaya. Tabel 5.3 dan
   Lampiran A tetap dipakai, tetapi naskah tidak boleh menyebutnya "kab prioritas" (`bab-03.md` P1 Inferensi sudah
   mengusulkan perbaikan aturan 3.8).
7. **Matriks 5.8 bergantung pada ambang yang belum dikunci di Bab 3.** `bab-03.md` P2 mengusulkan pita fatalitas Cabinet
   Office (1–8, 9–40, 41–200, 201–1.000, > 1.000) dan Tabel 3.4 dasar kemungkinan; posisi di bab ini memakai usulan itu
   dan berlabel asumsi-kebijakan sampai Bab 3 dikunci.
8. **Angka keterpaparan KERANGKA cocok dengan Renas Tabel 2.5 hlm. 24** (gempa 272.405.410; banjir 113.829.496; longsor
   25.252.687; likuefaksi 86.689.779; tsunami 5.341.282; gunung api 5.864.711). API InaRISK juga memuat kolom
   `jiwa_terpapar` dengan nilai lebih kecil (mis. banjir 109.618.626, gempa 131.881.978) yang artinya tidak terdokumentasi;
   naskah memakai `terpapar` (sama dengan Renas).
9. **Tiga provinsi terendah 2023 bertentangan antardokumen resmi** (Renas: DKI, Papua Pegunungan, DIY; Renstra Tabel 1.1
   dan API: Kepulauan Riau di bawah DIY). Lima sel indeks provinsi 2023 tidak cocok dengan Renstra (Maluku Utara, Kalimantan
   Barat, Sumatera Selatan, Bali, NTB), tetapi kelas kelimanya sama di kedua versi, sehingga hitungan 13 Tinggi dan 25 Sedang
   tetap resmi.
10. **Cakupan DIBI di bab ini dua macam.** Angka per pulau dan provinsi memakai `dibi/rekap_provinsi_tahunan.csv` cakupan
    bencana (semua klasifikasi); angka per kab memakai `skenario-hidromet/dibi_kab_tahun.csv` dan
    `dibi_geologi_kab_tahun.csv` yang tidak menyaring `is_bencana` (semua laporan, alam saja). Selisih meninggal dan hilang
    2015–2025: 13.479 (provinsi, semua klasifikasi, bencana) lawan 13.063 (kab, alam, semua laporan). Cakupan wajib ditulis
    di catatan tiap gambar dan tabel.

---

## PK1. Di pulau, provinsi, dan kab/kota mana risiko terkonsentrasi menurut IRBI dan DIBI?

### Inti

Menurut IRBI 2025, risiko termodelkan terkonsentrasi di timur dan barat Indonesia di luar Jawa dan Kalimantan: 169 kab
berstatus Tinggi, di antaranya 37 dari 42 kab di Papua, 19 dari 21 di Maluku, 40 dari 81 di Sulawesi, 21 dari 41 di Bali
dan Nusa Tenggara, dan 50 dari 154 di Sumatra, sedangkan Jawa dan Kalimantan masing-masing hanya satu. Menurut DIBI
2015–2025, kejadian tercatat terbanyak secara absolut di Jawa (47,2% kejadian, sebanding dengan 56,1% penduduk; per kapita
di bawah rerata nasional) dan korban di Sulawesi (41,3% meninggal dan hilang dengan 7,4% penduduk, hampir seluruhnya
Sulawesi Tengah 2018). Dari lima kab dengan meninggal dan hilang terbanyak, tiga berstatus Tinggi pada tahun kejadiannya
menurut seri IRB 2015–2024 dengan ambang turunan (Kota Palu 2018, Kab. Cianjur 2022, Kab. Pandeglang 2018), dua Sedang
(Kab. Lombok Utara, Kab. Sigi); kelimanya Sedang pada IRBI 2025, potret yang terbit sesudah kejadian. Kedua sumber menunjuk
wilayah yang berbeda dan korelasi peringkat per kab negatif (−0,38), sehingga profil risiko disajikan berdampingan, tidak
digabung menjadi satu peringkat.

### Temuan bersumber

**IRBI 2025 per pulau, provinsi, dan kab (5.2–5.4)**

- **T1.1** Status IRBI 2025 kolom `status` API: 169 Tinggi, 345 Sedang dari 514 kab/kota; batas teramati Sedang tertinggi
  175,68, Tinggi terendah 176,14. Sumber: `irbi/irbi_kab_2025.csv` kolom `status_total_resmi`; `irbi/README.md` §3 [`bnpb-irbi`];
  kunci `irbi.kab.tinggi.2025`, `irbi.kab.sedang.2025` (usulan mitigasi bab-03). **resmi**.
- **T1.2** Per pulau (kab Tinggi / kab; porsi penduduk WorldPop 2026 di kab Tinggi): Papua 37/42 (79,9%); Maluku 19/21
  (82,5%); Sulawesi 40/81 (37,3%); Bali dan Nusa Tenggara 21/41 (35,9%); Sumatra 50/154 (30,3%); Kalimantan 1/56 (2,6%);
  Jawa 1/119 (1,8%; Kab. Sukabumi). Penduduk di 169 kab Tinggi 43.105.491 dari 286.674.532 jiwa (15,0%). Sumber:
  `irbi/irbi_agregat_pulau.csv` [tahun=2025] kolom `n_tinggi`, `n_kab`; `irbi/irbi_kab_2025.csv` kolom `penduduk_2026`
  [dihitung penyusun bukti] [`bnpb-irbi`, `worldpop-2025`]; kunci `irbi.pulau.*.kab_tinggi.2025`,
  `airjawa.jawa.irbi2025.n_tinggi` (usulan air bab-03), `irbi2025.kab_tinggi.penduduk`, `irbi2025.kab_tinggi.porsi_penduduk`.
  Jumlah kab **resmi**; pengelompokan pulau dan porsi penduduk **asumsi-kebijakan** (pulau = kode provinsi, `irbi/README.md`
  §3; penduduk WorldPop, bukan BPS).
- **T1.3** Per provinsi, kab Tinggi terbanyak: Nusa Tenggara Timur 19 dari 22; Sumatera Utara 14 dari 33; Aceh 13 dari 23;
  Sulawesi Tenggara 12 dari 17; Maluku 10 dari 11; Papua Barat 7 dari 7 dan Papua Barat Daya 6 dari 6 (seluruh kab).
  Dua belas provinsi tanpa satu pun kab Tinggi: lima provinsi Jawa (semua kecuali Jawa Barat yang punya satu), ditambah Bali, Kepulauan
  Bangka Belitung, Kepulauan Riau, Kalimantan Barat, Kalimantan Tengah, Kalimantan Selatan, Kalimantan Utara. Sumber:
  `irbi/irbi_kab_2025.csv` [dihitung penyusun bukti, dikelompokkan per `prov_kode`] [`bnpb-irbi`]. **resmi** (hitungan atas
  status resmi).
- **T1.4** Indeks provinsi 2025 tidak punya metode resmi. Kelas provinsi turunan 2025 (rerata kab dibanding ambang ~176:
  15 Tinggi, 23 Sedang) bukan angka terbit dan tidak dikutip sebagai kelas. Sumber: `irbi/irbi_hitung_kelas.csv`
  [tingkat=provinsi,tahun=2025]; `irbi/README.md` §3 [`bnpb-irbi`]. **asumsi-kebijakan**.
- **T1.5** Kelas provinsi resmi 2023: 13 Tinggi, 25 Sedang. Urut indeks: Sulawesi Barat 160,08; Maluku 160,03; Kepulauan
  Bangka Belitung 155,61; Sulawesi Tenggara 153,08; Bengkulu 148,75; Papua Barat Daya 148,44; Maluku Utara 148,40 (Renstra
  148,71); Kalimantan Utara 148,16; Aceh 146,90; Papua Barat 145,76; Sulawesi Selatan 144,47; Kalimantan Timur 144,43;
  Sumatera Barat 144,38 (semua Tinggi); terendah DKI Jakarta 61,31. Sumber: `irbi/irbi_agregat_provinsi.csv` [tahun=2023]
  kolom `total_sederhana`, `label_total_sederhana`; Renas hlm. 19; Renstra Tabel 1.1 hlm. 6–8; RPJMN Lampiran I hlm. 30
  [`bnpb-irbi`, `bnpb-2025-renas`, `bnpb-2025-renstra`, `ri-2025-perpres12-rpjmn`]; kunci `irbi.prov.tinggi.2023`,
  `irbi.prov.dinilai.2023` (lama). **resmi** (33 sel cocok Renstra; lima sel berlabel turunan, kelas sama).
  - *Angka berdampingan:* tiga provinsi terendah 2023 menurut Renas hlm. 19 DKI Jakarta, Papua Pegunungan, DIY; menurut
    Renstra Tabel 1.1 dan API, Kepulauan Riau (107,79) di bawah DIY (108,15) (`irbi/README.md` §5).
- **T1.6** Rerata IRBI 2025 per pulau (rerata kab, tidak pernah diterbitkan BNPB): Maluku 211,74; Papua 205,52; Sulawesi
  177,47; Bali dan Nusa Tenggara 171,07; Sumatra 154,69; Kalimantan 105,80; Jawa 99,43; Indonesia 147,95. Rerata per bahaya
  2025 tertinggi per kolom: banjir Papua 24,9; longsor Papua 21,6; kekeringan Papua 20,4; tsunami Maluku 22,2; abrasi Maluku
  19,0; gunung api Maluku 19,0; gempa Papua 14,1; cuaca ekstrem Sumatra 18,2; karhutla Papua 16,4. Jawa terendah untuk
  total (99,43), banjir (13,9), abrasi (8,7), karhutla (9,0), dan gunung api (9,0); Kalimantan terendah untuk gempa (1,4),
  tsunami (6,0), dan longsor (8,1). Sumber: `irbi/irbi_agregat_pulau.csv` [tahun=2025] kolom `*_sederhana`, `*_n_kab`
  [`bnpb-irbi`]; kunci `irbi.jawa.rerata_2025`, `irbi.maluku.rerata_2025`. **asumsi-kebijakan** (rerata per bahaya dan pulau
  pilihan penyusun; sel null dikeluarkan).
- **T1.7** Total IRBI 2025 bukan jumlah kolom bahaya di 0% kab; nilai per bahaya bilangan bulat; tidak boleh dipakai
  memeringkat karena nilai kembar. Sumber: `irbi/README.md` §4, §6 [`bnpb-irbi`]; `bab-03.md` P1. **asumsi-kebijakan**
  (analisis penyusun atas data resmi).

**DIBI 2015–2025 per pulau, provinsi, dan kab (5.3–5.4)**

- **T1.8** Porsi pulau, DIBI 2015–2025 semua klasifikasi, cakupan bencana (kejadian; meninggal dan hilang): Jawa 47,2%;
  22,2% (2.998 jiwa). Sumatra 24,5%; 20,9% (2.813). Kalimantan 11,9%; 2,5% (335). Sulawesi 8,4%; 41,3% (5.569). Bali dan
  Nusa Tenggara 5,5%; 9,0% (1.213). Maluku 1,8%; 1,0% (141). Papua 0,8%; 3,0% (410). Total 42.079,44 kejadian dan 13.479
  meninggal dan hilang. Sumber: `dibi/rekap_provinsi_tahunan.csv` [klasifikasi=semua,cakupan=bencana,tahun 2015–2025]
  kolom `pulau`, `kejadian`, `meninggal`, `hilang` [dijumlah penyusun bukti] [`bnpb-dibi`]; kunci
  `dibi.pulau.jawa.porsi_kejadian_2015_2025`, `dibi.pulau.sulawesi.porsi_meninggal_hilang_2015_2025`,
  `dibi.pulau.papua.porsi_kejadian_2015_2025`. **resmi** (olah). Seri patah 2024 (`dibi/README.md`); kejadian kekeringan
  mengukur intensitas pelaporan (KERANGKA prinsip 7).
- **T1.8a** Porsi pulau berdampingan dengan porsi penduduk dan per 100.000 penduduk (penduduk WorldPop 2026; kejadian dan
  meninggal dan hilang DIBI 2015–2025 seperti T1.8, jumlah sebelas tahun, tidak dibagi per tahun). Porsi penduduk: Jawa
  56,1%; Sumatra 21,7%; Sulawesi 7,4%; Kalimantan 6,1%; Bali dan Nusa Tenggara 5,5%; Papua 2,0%; Maluku 1,2%. Kejadian per
  100.000: Jawa 12,3; Sumatra 16,6; Kalimantan 28,4; Sulawesi 16,8; Bali dan Nusa Tenggara 14,5; Maluku 22,8; Papua 5,6;
  nasional 14,7. Meninggal dan hilang per 100.000: Jawa 1,86; Sumatra 4,53; Kalimantan 1,90; Sulawesi 26,39; Bali dan
  Nusa Tenggara 7,63; Maluku 4,25; Papua 7,13; nasional 4,70. Porsi penduduk terpapar banjir KRB di Jawa 55,5% (T1.15)
  lawan porsi penduduk 56,1%. Satuan per 100.000 searah dengan indikator Renas 1.a. Sumber: `irbi/irbi_kab_2025.csv`
  kolom `pulau`, `penduduk_2026`; `dibi/rekap_provinsi_tahunan.csv` [klasifikasi=semua,cakupan=bencana,tahun 2015–2025]
  [dihitung penyusun bukti] [`worldpop-2025`, `bnpb-dibi`]; kunci `dibi.pulau.jawa.porsi_penduduk_2026`,
  `dibi.pulau.jawa.meninggal_hilang_per100rb_2015_2025`, `dibi.nasional.meninggal_hilang_per100rb_2015_2025`,
  `dibi.pulau.jawa.kejadian_per100rb_2015_2025`, `dibi.pulau.sulawesi.meninggal_hilang_per100rb_2015_2025`.
  **asumsi-kebijakan** (penyebut WorldPop satu tahun untuk jumlah sebelas tahun; bukan BPS, KERANGKA §7 butir 25).
- **T1.9** Provinsi dengan meninggal dan hilang 2015–2025 terbanyak (cakupan bencana, semua klasifikasi): Sulawesi Tengah
  4.925; Jawa Barat 1.271; Aceh 823; Sumatera Utara 767; Sumatera Barat 690; NTB 663; Jawa Tengah 563; Jawa Timur 533.
  Sumber: `dibi/rekap_provinsi_tahunan.csv` [dijumlah penyusun bukti] [`bnpb-dibi`]. **resmi** (olah).
  - *Angka berdampingan:* paket `turunan/provinsi_utama.csv` (DIBI per kab, alam, semua laporan) memberi Sulawesi Tengah
    4.925, Jawa Barat 1.260, Aceh 794, Sumatera Utara 739, Sumatera Barat 690. Selisih dari beda cakupan (§0.1 butir 10).
- **T1.10** Kab dengan meninggal dan hilang 2015–2025 terbanyak (alam, semua laporan) dan status IRBI 2025-nya: Kota Palu
  4.194 (Sedang); Kab. Cianjur 643 (Sedang); Kab. Lombok Utara 469 (Sedang); Kab. Sigi 415 (Sedang); Kab. Pandeglang 319
  (Sedang); Kab. Agam 293 (Tinggi); Kab. Aceh Utara 262 (Tinggi); Kab. Donggala 239 (Tinggi). Kota Palu sendiri 32,1% dari
  13.063 meninggal dan hilang tingkat kab. Sumber: `skenario-hidromet/dibi_kab_tahun.csv`, `dibi_geologi_kab_tahun.csv`
  [tahun 2015–2025]; `irbi/irbi_kab_2025.csv` [dihitung penyusun bukti] [`bnpb-dibi`, `bnpb-irbi`]; kunci
  `dibi.kab.palu.meninggal_hilang_2015_2025`, `dibi.kab.palu.porsi_2015_2025`. **resmi** (olah; status resmi).
  - *Status sebelum kejadian (seri 2015–2024):* tahun korban terbesar dan nilai total IRB kab pada tahun itu, dikelaskan
    dengan ambang turunan > 144 (ambang yang menghasilkan tepat 168 Tinggi dan 346 Sedang, angka resmi Renas 2023;
    `irbi/irbi_hitung_kelas.csv` berlabel resmi hanya untuk 2023): Kota Palu 2018 (4.194 jiwa) 162,70, Tinggi (nilai sama
    2017–2020); Kab. Cianjur 2022 (613) 207,62, Tinggi (Tinggi di seluruh 2015–2024: 250,0 sampai 165,17); Kab. Pandeglang
    2018 (304) 215,20, Tinggi; Kab. Lombok Utara 2018 (469) 120,62, Sedang; Kab. Sigi 2018 (405) 52,16, Sedang. Jadi 3 dari
    5 kab berstatus Tinggi pada tahun kejadiannya. Status Sedang pada IRBI 2025 adalah potret sesudah kejadian; skala 2025
    tidak sebanding dengan 2015–2024 (T2.11). Renas hlm. 19 mencantumkan Kab. Sigi di antara lima kab/kota dengan indeks
    terendah 2023. Sumber: `irbi/irbi_kab_2015_2025.csv` kolom `total`, `kelas_total`; `skenario-hidromet/dibi_kab_tahun.csv`,
    `dibi_geologi_kab_tahun.csv`; korpus `perban-nomor-1-tahun-2025.json` hlm. 19 [dihitung penyusun bukti] [`bnpb-irbi`,
    `bnpb-dibi`, `bnpb-2025-renas`]; kunci `irbi_dibi.kab_korban_top5.tinggi_tahun_kejadian`. **asumsi-kebijakan** (ambang
    turunan); kutipan Renas **resmi**.
- **T1.11** Porsi kab Tinggi IRBI 2025 (15,0% penduduk): 17,9% kejadian dan 24,3% meninggal dan hilang DIBI 2015–2025;
  untuk 2025 saja 57,6% meninggal dan hilang (1.130 dari 1.961 tingkat kab), karena kab paling berat kejadian Sumatra
  November 2025 (Aceh Utara 251, Agam 233, Tapanuli Tengah 164, Tapanuli Selatan 101) berstatus Tinggi; di Aceh, Sumatera
  Utara, Sumatera Barat 20 dari 38 kab berkorban 2025 berstatus Tinggi dan memuat 985 dari 1.373 jiwa. Sumber: idem
  [dihitung penyusun bukti] [`bnpb-dibi`, `bnpb-irbi`]; kunci `irbi_dibi.kab_tinggi.porsi_kejadian_2015_2025`,
  `irbi_dibi.kab_tinggi.porsi_meninggal_hilang_2015_2025`, `irbi_dibi.kab_tinggi.porsi_meninggal_hilang_2025`.
  **asumsi-kebijakan** (silang dua sumber resmi). Tanggal ekspor IRBI 2025 tidak tertulis di API (`irbi/README.md` §1).
  Siaran Kemenko PMK 12 September 2025 menulis bahwa "perhitungan IRBI 2025 akan segera rampung pada Desember mendatang"
  (https://kemenkopmk.go.id/node/5841, dibuka ulang 24 Okt 2026) [`kemenkopmk-2025-sinkronisasi-irb`], sehingga IRBI 2025
  besar kemungkinan diselesaikan sesudah kejadian November 2025 (**terverifikasi**, siaran pers). Porsi 57,6% tidak boleh
  dibaca sebagai IRBI 2025 "menangkap" kejadian 2025.

**IRBI dan DIBI berdampingan, korelasi per kab (5.2, 5.4)**

- **T1.12** Spearman per kab (n = 514, peringkat rata-rata untuk nilai kembar): total IRBI 2025 lawan jumlah kejadian alam
  DIBI 2015–2025 −0,380; lawan meninggal dan hilang −0,044; lawan mengungsi +0,016. Pembanding: penduduk WorldPop 2026 lawan
  kejadian +0,633; total IRBI 2025 lawan penduduk −0,465. Hanya 3 kab tanpa kejadian 2015–2025. Sumber: `irbi/irbi_kab_2025.csv`;
  `skenario-hidromet/dibi_kab_tahun.csv`, `dibi_geologi_kab_tahun.csv` [dihitung penyusun bukti] [`bnpb-irbi`,
  `bnpb-dibi`, `worldpop-2025`]; kunci `irbi_dibi.nasional.spearman.total_kejadian`,
  `irbi_dibi.nasional.spearman.total_meninggal_hilang`, `irbi_dibi.nasional.spearman.total_penduduk`,
  `irbi_dibi.nasional.spearman.penduduk_kejadian`. **asumsi-kebijakan** (analisis penyusun atas data resmi).
- **T1.13** Spearman per bahaya (dihitung `bab-03.md` P1 dengan `n_baris`): banjir −0,313; longsor −0,056; kekeringan
  −0,068; cuaca ekstrem −0,018; gelombang dan abrasi +0,150; karhutla +0,029; gempa +0,231; gunung api +0,254. Hitungan ulang
  bab ini dengan kolom `kejadian` memberi arah dan besar yang sama (banjir −0,302; gempa +0,275 bila gempa_tsunami ikut).
  Sumber: kunci `irbi_dibi.nasional.spearman.*` (usulan mitigasi bab-03). **asumsi-kebijakan**.

**Keterpaparan KRB 2022–2026 per bahaya dan sebarannya (5.7)**

- **T1.14** Potensi penduduk terpapar per bahaya (KRB 2022–2026, Renas Tabel 2.5 hlm. 24): gempa 272.405.410; kekeringan
  272.564.439; COVID-19 dan epidemi 272.566.688 (ketiganya melebihi penduduk wilayah API 271.680.290, ditulis "praktis
  seluruh penduduk"); cuaca ekstrem 255.437.799; banjir 113.829.496; likuefaksi 86.689.779; tanah longsor 25.252.687; banjir
  bandang 15.391.846; gunung api 5.864.711; tsunami 5.341.282; gelombang ekstrem dan abrasi 4.129.597; kegagalan teknologi
  713.784; karhutla tidak disajikan. Multibahaya 271.130.365. Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 22 dan 24;
  `riset/mentah/ks_*.json` kolom `terpapar` (cocok) [`bnpb-2025-renas`, `bnpb-2026-krb`]; kunci `renas.krb.terpapar_*`
  (usulan mitigasi bab-02). **resmi**.
  - *Angka berdampingan:* kolom API `jiwa_terpapar` lebih kecil (gempa 131.881.978; banjir 109.618.626; longsor 20.736.093;
    likuefaksi 77.370.182; tsunami 4.252.077; gunung api 1.000.037; cuaca ekstrem 226.329.236); artinya tidak terdokumentasi
    (`nonalam-sosial/README.md` `krb_covid19_kab.csv`). Tidak dipakai.
- **T1.15** Porsi Jawa dari penduduk terpapar KRB (jumlah 514 kab): banjir 55,5%; banjir bandang 52,7%; longsor 51,8%; cuaca
  ekstrem 57,9%; kekeringan 55,9%; gelombang dan abrasi 17,9% (terbesar Sulawesi 26,2%, Maluku 18,2%). Jumlah per kab
  sedikit berbeda dari angka nasional Renas (banjir 113.826.725 lawan 113.829.496) karena enam kab lama bukan unit KRB.
  Sumber: `skenario-hidromet/paparan_kab.csv` kolom `krb_terpapar_jiwa` [dijumlah penyusun bukti] [`bnpb-2026-krb`]; kunci
  `hidromet.jawa.banjir.krb_porsi_nasional_persen`, `hidromet.jawa.longsor.krb_porsi_nasional_persen` (usulan air bab-02).
  **resmi** (olah).
- **T1.16** Potensi kerugian fisik dan ekonomi per bahaya (juta rupiah; nilai aset terpapar, batas atas, tidak dijumlah
  antarbahaya): cuaca ekstrem 2.744.332.847; gempa 1.111.318.267; banjir 1.006.919.180; kekeringan 967.552.017; karhutla
  709.049.963; longsor 696.025.976; likuefaksi 351.875.950; banjir bandang 147.673.335; tsunami 42.978.422; gelombang dan
  abrasi 21.624.931; gunung api 12.048.691; multibahaya 4.082.564.437. Jumlah kolom per bahaya 1,91 kali multibahaya.
  Sumber: korpus Renas hlm. 24–25 Tabel 2.6 [`bnpb-2025-renas`]; kunci `renas.krb.kerugian_*`
  (usulan mitigasi bab-02 dan bab-03). **resmi**.
  - *Angka berdampingan:* gelombang ekstrem dan abrasi di Renas fisik 18.365.352 dan ekonomi 3.259.579 (total 21.624.931),
    di API fisik 18.314.902 dan ekonomi 6.050.513 (`riset/mentah/ks_gelombang-ekstrim-dan-abrasi.json`). Naskah memakai Renas.
- **T1.17** KRB multibahaya per provinsi (Renas Tabel 2.7 hlm. 25): kelas risiko Tinggi di 33 dari 34 provinsi lama, DKI
  Jakarta Rendah; tingkat bahaya Tinggi di 34 provinsi; kerentanan Tinggi kecuali Sulawesi Utara (Sedang). Sumber: korpus
  `perban-nomor-1-tahun-2025.json` hlm. 25 [`bnpb-2025-renas`]. **resmi**. Kelas KRB tidak membedakan provinsi; IRBI 2023
  membedakan (13 Tinggi).

**Daftar perhatian dan provinsi utama (5.4, 5.5)**

- **T1.18** Daftar perhatian dasar (≥ 2 syarat) per bahaya: cuaca ekstrem 272 kab; banjir 253; longsor 202; karhutla 62;
  gelombang dan abrasi 47; gempa 30; tsunami 16; gunung api 12; kekeringan 9; total 903 pasangan kab–bahaya, 426 kab unik
  (82,9% dari 514). Kab menurut jumlah bahaya: 1 bahaya 141; 2 bahaya 149; 3 bahaya 89; 4 bahaya 40; 5 bahaya 5; 6 bahaya 2
  (Kab. Sukabumi, Kab. Padang Pariaman). Per pulau: Jawa 108 dari 119; Sumatra 136 dari 154; Sulawesi 65 dari 81;
  Kalimantan 40 dari 56; Bali dan Nusa Tenggara 34 dari 41; Papua 24 dari 42; Maluku 19 dari 21. Sumber:
  `turunan/daftar_perhatian.csv` [kajian=mitigasi, masuk=True] [dihitung penyusun bukti]; `turunan/daftar_perhatian_kepekaan.csv`;
  kunci `perhatian.mitigasi.*.n` (lama), `perhatian.mitigasi.kab_unik`, `perhatian.mitigasi.pasangan`. **asumsi-kebijakan**.
- **T1.19** Irisan dengan IRBI 2025: 135 dari 169 kab Tinggi masuk daftar perhatian bahaya apa pun; 34 kab Tinggi tidak
  masuk (karena daftar meminta dua syarat dan syarat DIBI menumpuk di kab padat penduduk). Sumber: idem dan
  `irbi/irbi_kab_2025.csv` [dihitung penyusun bukti]; kunci `perhatian.mitigasi.irisan_tinggi`,
  `perhatian.mitigasi.tinggi_tidak_masuk`. **asumsi-kebijakan**.
- **T1.20** Provinsi utama menurut dua kriteria (`turunan/provinsi_utama.csv`): jumlah kab daftar perhatian, Jawa Tengah
  33 dan Jawa Timur 33 (kembar), Sumatera Utara 32, Jawa Barat 26, Aceh 22, Sulawesi Selatan 22; meninggal dan hilang
  2015–2025, Sulawesi Tengah 4.925, Jawa Barat 1.260, Aceh 794, Sumatera Utara 739, Sumatera Barat 690. Jawa Barat dan
  Sumatera Utara ada di lima besar kedua kriteria; Aceh kembar dengan Sulawesi Selatan (22 kab) di batas peringkat 5
  menurut daftar perhatian (peringkat 5 dan 6 di berkas tanpa dasar pemecah seri). Sulawesi Tengah peringkat 14 menurut daftar; Jawa Tengah
  peringkat 7 menurut korban. Sumber: `turunan/provinsi_utama.csv`; kunci `perhatian.mitigasi.prov33.n_kab`,
  `perhatian.mitigasi.prov35.n_kab`, `perhatian.mitigasi.prov72.meninggal_hilang`, `perhatian.mitigasi.prov32.meninggal_hilang`
  (usulan mitigasi bab-03), `perhatian.mitigasi.prov12.n_kab`, `perhatian.mitigasi.prov11.meninggal_hilang` (baru).
  **asumsi-kebijakan** (aturan); meninggal dan hilang **resmi** (dijumlah).

### Inferensi

- **I1.1 [Inferensi tim]** "Di mana risiko terkonsentrasi" punya tiga jawaban yang sah dan berbeda: (a) IRBI 2025
  menunjuk kab kecil berkapasitas rendah di Papua, Maluku, Nusa Tenggara Timur, dan Sulawesi (T1.2–T1.3); (b) DIBI dan
  KRB menunjuk Jawa sebagai tempat kejadian dan penduduk terpapar terbanyak secara absolut, sebanding dengan porsi
  penduduknya, sedangkan per kapita Jawa di bawah rerata nasional (T1.8, T1.8a, T1.15); (c) korban jiwa menumpuk pada
  segelintir kejadian geologi dan hidrometeorologi besar (Palu 2018, Sumatra 2025; T1.9–T1.11). Bab 5 menyajikan ketiganya
  berdampingan dengan ukurannya, sesuai prinsip 7 dan D14. Kalimat yang memilih satu ukuran sebagai "risiko sebenarnya"
  tidak didukung data.
- **I1.2 [Inferensi tim]** Korelasi negatif total IRBI dengan kejadian (−0,38) mengikuti pola penduduk: kab padat
  (kebanyakan di Jawa) punya lebih banyak laporan kejadian (+0,63 dengan penduduk) dan nilai IRBI lebih rendah (−0,47
  dengan penduduk). IRBI adalah indeks per kab yang tidak membesar mengikuti jumlah orang terpapar, sedangkan DIBI
  menghitung kejadian dan korban absolut. Ini menjelaskan, bukan membantah, kedua sumber; `bab-03.md` P1 menyimpulkan hal
  yang sama untuk banjir.
- **I1.3 [Inferensi tim]** Status yang relevan untuk menilai IRB sebagai penyaring adalah status sebelum kejadian, bukan
  IRBI 2025 yang terbit sesudahnya. Pada seri 2015–2024 dengan ambang turunan > 144, 3 dari 5 kab dengan korban terbanyak
  berstatus Tinggi pada tahun kejadiannya (Palu, Cianjur, Pandeglang; 5.111 dari 5.985 jiwa di kelima kab pada tahun
  kejadiannya), dua Sedang (Lombok Utara, Sigi; T1.10). Untuk 2025, 57,6% korban jatuh di kab Tinggi IRBI 2025, tetapi
  IRBI 2025 kemungkinan dirampungkan sesudah kejadian (T1.11), jadi angka itu bukan uji ramalan. Turunnya Palu, Cianjur,
  dan Pandeglang ke Sedang pada 2025 dapat berasal dari perubahan skala 2025 (T2.11) atau dari komponen kerentanan dan
  kapasitas; data terbuka tidak memisahkannya.
  Yang boleh ditulis (label asumsi-kebijakan, ambang turunan): "Tiga dari lima kab dengan korban terbanyak 2015–2025
  berstatus Tinggi pada tahun kejadiannya; Lombok Utara dan Sigi berstatus Sedang. Status IRB menangkap sebagian, tidak
  seluruh, kejadian paling mematikan, sehingga skenario terburuk tetap memakai lantai kejadian tercatat, bukan status IRB
  saja."
- **I1.4 [Inferensi tim]** Untuk slide B1 ("{a} dari 514 kab/kota berstatus Tinggi pada IRBI 2025, terbanyak di {pulau}
  ({b})"): a = 169; pulau dengan kab Tinggi terbanyak menurut jumlah adalah Sumatra (50), menurut porsi Maluku (90,5%) dan
  Papua (88,1%). Judul yang jujur menyebut ukurannya, mis. "169 dari 514 kab/kota berstatus Tinggi pada IRBI 2025; 37 dari
  42 kab di Papua, 1 dari 119 di Jawa". Kalimat ini perlu catatan bahwa Jawa memuat 47,2% kejadian tercatat dan 56,1%
  penduduk, sehingga per 100.000 penduduk kejadian Jawa (12,3) di bawah rerata nasional (14,7) (T1.8a).
- **I1.5 [Inferensi tim]** Daftar perhatian yang memuat 82,9% kab (T1.18) berguna sebagai lampiran per bahaya, tetapi
  tidak memisahkan prioritas nasional. Bab 5 cukup menampilkan Tabel 5.3 per bahaya dengan jumlah, uji kepekaan, dan irisan
  dengan status IRBI; kab dengan empat bahaya atau lebih (47 kab) dan 34 kab Tinggi yang tidak masuk daftar layak disebut
  sebagai temuan, bukan sebagai peringkat.
- **I1.6 [Inferensi tim]** Dua kriteria provinsi utama tidak boleh digabung menjadi satu skor. Bila naskah perlu satu
  kalimat: "Jawa Barat dan Sumatera Utara masuk lima besar menurut kedua kriteria; Aceh kembar dengan Sulawesi Selatan di
  batas lima besar daftar perhatian." Jawa Tengah dan Jawa Timur ditulis kembar; Aceh dan Sulawesi Selatan juga ditulis
  kembar (aturan yang sama).

### Celah

| Yang dicari | Status | Penyajian tanpa mengarang | Pemegang data |
| --- | --- | --- | --- |
| Indeks dan kelas provinsi IRBI 2025 resmi | tidak ditemukan (metode provinsi 2025 tidak terdokumentasi) | provinsi memakai kelas resmi 2023; agregat 2025 berlabel asumsi-kebijakan | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| Tanggal data dan tanggal ekspor IRBI 2025 | tidak tertulis di respons API ("legacy rows"); siaran Kemenko PMK 12 Sep 2025 menyebut perhitungan rampung Desember 2025 (T1.11) | tidak menulis bahwa IRBI 2025 "menangkap" atau "melewatkan" kejadian 2025 | InaRISK BNPB |
| Penduduk BPS per kab | belum ditarik (KERANGKA §7 butir 25) | porsi penduduk memakai WorldPop dengan label; penyebut nasional resmi penduduk KRB InaRISK | BPS |
| Cakupan `is_bencana` di DIBI per kab | cache paket tidak menyaring | "semua laporan" di catatan tabel; tarik ulang | `pipa-data` |
| KRB per kab untuk gempa, tsunami, gunung api, likuefaksi | belum ditarik ke paket (paket geologi hanya nasional) | keterpaparan geologi hanya angka nasional | InaRISK BNPB |
| Skrip reproduksi hitungan pulau, provinsi, Spearman total, dan irisan daftar perhatian | belum di paket | angka bertanda [dihitung penyusun bukti]; usul fungsi di `bangun/turunan.py` | `pipa-data` |
| README paket `turunan` | tidak ada | pemilik paket menambah README dengan label dan keterbatasan | `pipa-data` |

---

## PK2. Mengapa capaian IRB tidak diikuti penurunan korban?

### Inti

IRB nasional turun 10,76% pada 2019–2024 dan target Renstra dinyatakan tercapai, tetapi meninggal dan hilang akibat
bencana hidrometeorologi rata-rata 399 jiwa per tahun pada 2015–2019 dan 424 pada 2020–2024, lalu 1.952 pada 2025.
Penurunan IRB tampak di sembilan bahaya, termasuk gempa, tsunami, dan gunung api yang bahaya fisiknya tidak berubah dalam
lima tahun, dan pada 230 dari 400 kab yang nilainya berubah semua kolom bahaya bergeser dengan satu pengali yang sama.
Penurunan itu paling mungkin berasal dari komponen non-bahaya di dalam indeks [Inferensi tim]; pembaruan peta bahaya
sebagai masukan indeks belum dikecualikan, dan penurunan itu tidak berasal dari korban yang tercatat. Jawa, yang IRB-nya turun paling tajam (−24,9%), justru mencatat rata-rata korban 2020–2024 lebih
tinggi daripada 2015–2019. IRB dan DIBI mengukur hal yang berbeda, sehingga capaian IRB tidak dapat dipakai sebagai bukti
penurunan korban.

### Temuan bersumber

- **T2.1** IRB nasional: baseline 2019 144,02; 2020–2024 141,65; 138,81; 135,56; 132,25; 128,52; turun 10,76% atau 15,5 poin,
  "target ... menurunkan IRB sebesar 10% selama 5 tahun, telah tercapai". 2015–2018 (156,43; 150,58; 148,82; 145,85) adalah
  turunan paket tanpa angka terbit. Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 52 (Tabel 1.6); `irbi/irbi_tren_2015_2024.csv`
  [tingkat=nasional]; `irbi/irbi_bukti_skala_tahunan.csv` [`bnpb-2025-renstra`, `bnpb-irbi`]; kunci `irbi.nasional.2019`,
  `irbi.nasional.2024`, `irbi.nasional.persen_2019_2024` (lama, **resmi**), `irbi.nasional.2015` (lama, **asumsi-kebijakan**).
- **T2.2** IRB per pulau, persen 2019–2024 (rerata kab): Jawa −24,90; Kalimantan −11,18; Bali dan Nusa Tenggara −9,95;
  Sulawesi −7,55; Sumatra −6,41; Maluku +0,21; Papua +1,11. Papua dan Papua Barat dihitung dengan batas 2025, tidak sebanding
  dengan seri Renstra (34 provinsi), dan arah Papua di seri terbit berlawanan (+11,82%). Sumber: `irbi/irbi_tren_2015_2024.csv`
  [tingkat=pulau, metode=rerata_sederhana] kolom `persen_2019_2024`; `irbi/README.md` §3 [`bnpb-irbi`]; kunci
  `irbi.*.persen_2019_2024`. **asumsi-kebijakan**.
- **T2.3** Median nilai IRB per bahaya per kab turun di sembilan dari sembilan bahaya 2019 ke 2024: banjir 24,00 ke 20,32
  (−15,3%); longsor −13,5%; kekeringan −23,1%; cuaca ekstrem −23,8%; abrasi −24,6%; gempa bumi 15,67 ke 13,41 (−14,5%); tsunami
  −10,4%; karhutla −9,9%; gunung api −13,2%. 2015 ke 2024 juga turun di sembilan bahaya (gempa bumi 18,62 ke 13,41).
  Sembilan median ini bukan sembilan pengamatan bebas: dari 514 kab, 400 berubah nilainya 2019 ke 2024; pada 368 di
  antaranya semua kolom bahaya yang terisi berubah, dan pada 230 semua kolom berubah dengan satu rasio yang identik
  (contoh Kab. Cianjur 2016 ke 2017: tiap kolom × 0,6864). Penurunan per bahaya umumnya satu pengali per kab. Sumber:
  `irbi/irbi_bukti_skala_bahaya.csv` kolom `median` [tahun 2015, 2019, 2024]; `irbi/irbi_kab_2015_2025.csv` kolom
  bahaya [tahun 2019, 2024] [persen dan rasio dihitung penyusun bukti; kab berubah = sedikitnya satu kolom berbeda; satu
  rasio = selisih relatif rasio antarkolom < 10⁻⁴; sel kosong dikeluarkan] [`bnpb-irbi`]; kunci
  `irbi.bahaya.gempabumi.median_2019`, `irbi.bahaya.gempabumi.median_2024`, `irbi.bahaya.banjir.median_2019`,
  `irbi.bahaya.banjir.median_2024`, `irbi.kab.berubah_2019_2024`, `irbi.kab.satu_pengali_2019_2024`. **asumsi-kebijakan**
  (analisis penyusun atas data resmi).
- **T2.4** Komponen IRBI: bahaya, kerentanan, dan kapasitas (Renstra hlm. 5); IKD "merupakan upaya untuk mengukur kapasitas
  penanggulangan bencana", dengan "7 prioritas, 71 indikator, dan 284 pertanyaan yang mesti dijawab dalam setiap pengisian",
  dan IKD "nantinya akan mempengaruhi" IRBI (hlm. 85). Rumus R = H × V / C ada di lampiran Perka BNPB 2/2012 yang tidak
  terbuka (BN 2014/1096 yang diunduh hanya memuat batang tubuh). Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 5 dan
  85 [`bnpb-2025-renstra`]; `riset/A-dokumen-bnpb.md` §1.1; salinan Perka 2/2012 dari bnpb.go.id dibaca 24 Okt 2026
  [`bnpb-2012-pengkajian-risiko`]; kunci `renstra.ikd.jumlah_indikator` (usulan mitigasi bab-02). **resmi** (kutipan);
  rumus **terverifikasi** sekunder.
- **T2.5** Laju perubahan kab: median perubahan kab 0 pada 2016–2022 dan porsi kab yang naik 0% sampai 22,6% per tahun;
  rerata nasional tetap turun tiap tahun (−1,76 sampai −5,85 poin). Sumber: `irbi/irbi_bukti_skala_tahunan.csv` kolom
  `median_perubahan_kab`, `porsi_kab_naik`, `perubahan_dari_tahun_lalu` [`bnpb-irbi`]. **asumsi-kebijakan** (analisis
  penyusun atas data resmi).
- **T2.6** Meninggal dan hilang nasional, kejadian bencana semua klasifikasi: 2015 = 276; 2016 = 578; 2017 = 378; 2018 =
  6.264; 2019 = 629; 2020 = 418; 2021 = 815; 2022 = 895; 2023 = 308; 2024 = 642; 2025 = 2.276. Dipilah alam: hidrometeorologi
  276; 463; 373; 364; 520; 417; 620; 257; 279; 547; 1.952; geologi (gempa, tsunami, erupsi) 0; 115; 5; 5.876; 69; 1; 195; 638;
  29; 56; 4. Rerata hidrometeorologi 2015–2019 = 399,2 dan 2020–2024 = 424,0. Geologi 6.988 dari 13.056 meninggal dan hilang
  alam 2015–2025 (53,5%), 5.876 di antaranya 2018. Sumber: `dibi/rekap_nasional_tahunan.csv` [klasifikasi=alam dan semua,
  cakupan=bencana] [dijumlah penyusun bukti] [`bnpb-dibi`]; kunci `dibi.nasional.meninggal_hilang.2025`,
  `dibi.nasional.meninggal_hilang.2018` (usulan bab-01), `dibi.alam.hidromet.meninggal_hilang_rerata_2015_2019`,
  `dibi.alam.hidromet.meninggal_hilang_rerata_2020_2024`, `dibi.alam.hidromet.meninggal_hilang.2025`,
  `dibi.alam.geologi.meninggal_hilang_2015_2025`, `dibi.alam.meninggal_hilang_2015_2025`. **resmi** (olah); seri patah 2024.
- **T2.7** Jawa, meninggal dan hilang per tahun (cakupan bencana, semua klasifikasi): 2015–2019 134; 292; 221; 492; 95
  (rerata 246,8); 2020–2024 170; 236; 715; 75; 174 (rerata 274,0); 2025 394. Sumber: `dibi/rekap_provinsi_tahunan.csv`
  [pulau=Jawa] [dijumlah penyusun bukti] [`bnpb-dibi`]; kunci `dibi.jawa.meninggal_hilang_rerata_2015_2019`,
  `dibi.jawa.meninggal_hilang_rerata_2020_2024`. **resmi** (olah). 2022 memuat gempa Cianjur (602 meninggal, 8 hilang,
  `dibi/kejadian_besar.csv`).
- **T2.8** Renstra Tabel 1.4 mengutip NAR 2023: "Jumlah kejadian bencana menurun dalam tiga tahun terakhir, namun jumlah
  korban tewas meningkat". Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 23–24 [`bnpb-2025-renstra`]. **resmi**
  (kutipan; NAR tidak dibuka).
  - *Dibantah oleh (sebagian):* seri kejadian DIBI kini tidak memuat tiga tahun turun berturut-turut di 2015–2023 (rincian
    di `bab-01.md` T1.11).
- **T2.9** Korelasi per tahun kejadian alam dan meninggal alam 2015–2025: Spearman 0,22 (n = 11). Sumber: kunci
  `dibi.nasional.spearman_kejadian_meninggal.2015_2025` (usulan mitigasi bab-04). **asumsi-kebijakan** (analisis penyusun
  atas data resmi, sejajar T1.12 dan T1.13). Bab-04 memberi kunci ini label resmi (olah); selisih label dilaporkan ke
  pemilik kunci bab-04.
- **T2.10** Kapasitas KRB dan status IRBI 2025 per kab berkaitan erat: dari 315 kab berkapasitas KRB rendah, 148 (47,0%)
  berstatus Tinggi; dari 193 kab berkapasitas minimal sedang, 17 (8,8%) berstatus Tinggi. Jawa (95,8% kab berkapasitas
  minimal sedang) memuat 1 kab Tinggi; Papua (2,4%) 37 kab Tinggi. Sumber: `nonalam-sosial/krb_covid19_kab.csv` kolom
  `kapasitas_kab`; `irbi/irbi_kab_2025.csv` [dihitung penyusun bukti] [`bnpb-2026-krb`, `bnpb-irbi`]; kunci
  `krb_irbi.persen_tinggi_kapasitas_rendah`, `krb_irbi.persen_tinggi_kapasitas_minimal_sedang`. **asumsi-kebijakan** (silang
  dua sumber resmi).
- **T2.11** IRBI 2025 tidak sebanding dengan 2015–2024 (nilai bulat, total bukan jumlah kolom, Spearman 0,589, rerata naik
  19,43), sehingga capaian 2025 tidak dapat dinilai dan perbandingan naif memberi kenaikan 15,1%. Sumber: `irbi/README.md`
  §4; `bab-03.md` P1; kunci `irbi.skala.spearman_2025`, `irbi.nasional.persen_naif_2024_2025` (usulan mitigasi bab-03).
  **asumsi-kebijakan**. Dasar KD-4.

### Inferensi

- **I2.1 [Inferensi tim]** Mekanisme yang paling didukung data: IRB turun karena masukan non-bahaya. Bahaya fisik gempa,
  tsunami, dan gunung api tidak berubah dalam lima tahun, tetapi median nilainya turun 10–15% (T2.3) bersamaan dengan bahaya
  lain, dan pada 230 kab semua kolom bahaya bergeser dengan satu pengali; pola satu pengali ini sesuai dengan indeks yang dibagi kapasitas (rumus R = H × V / C, sekunder) dan dengan Renstra yang
  menyebut IKD memengaruhi IRBI (T2.4). Kab berkapasitas KRB rendah lima kali lebih sering berstatus Tinggi (T2.10). Data
  yang terbuka tidak memisahkan berapa bagian penurunan berasal dari kapasitas dan berapa dari kerentanan; kalimat naskah
  memakai "paling mungkin dari komponen non-bahaya", bukan angka. Premis "bahaya tidak berubah" hanya berlaku untuk bahaya
  fisik: masukan komponen bahaya di indeks bisa berganti (mis. peta bahaya diperbarui), dan ini belum dicek karena komponen
  H, V, C per kab tidak terbuka (Celah PK2). Pengali yang sama di semua kolom juga cocok dengan perubahan masukan bersama
  apa pun yang membagi atau mengalikan seluruh kolom, jadi pola ini mendukung, tidak membuktikan, peran kapasitas.
- **I2.2 [Inferensi tim]** Mengapa kapasitas yang naik tidak tampak pada korban: (a) kapasitas IKD diisi lewat 284
  pertanyaan per daerah, alat yang mengukur kelengkapan kelembagaan dan kebijakan, bukan hasil; tidak ada sumber yang dibuka
  yang menguji IKD terhadap korban; (b) korban didominasi kejadian langka bermagnitudo besar (2018: 6.264; 2025: 2.276;
  geologi 53,5% korban alam 2015–2025), yang tidak berubah frekuensinya mengikuti indeks lima tahunan; (c) IRB nasional
  adalah rerata kab tanpa bobot penduduk, sedangkan korban menumpuk di sedikit kab (Palu 32,1% korban tingkat kab 2015–2025).
  Butir (a) penilaian penyusun; (b) dan (c) bersumber (T2.6, T1.10).
- **I2.3 [Inferensi tim]** Bukti tandingan yang wajib ditulis: tanpa 2018, rerata korban 2015–2017 dan 2019 (465) lebih
  rendah daripada 2020–2024 (616), tetapi rerata hidrometeorologi hampir datar (399 lawan 424) dan korelasi tahunan kejadian
  dengan korban lemah (0,22). Lima tahun terlalu pendek untuk menyimpulkan bahwa korban naik; yang dapat disimpulkan adalah
  korban tidak turun sementara IRB turun. Naskah memakai "tidak ikut turun", bukan "naik".
- **I2.4 [Inferensi tim]** Jawa adalah kasus paling jelas (IRB −24,9%, korban rerata naik dari 246,8 ke 274,0; T2.2, T2.7),
  tetapi kenaikan itu bertumpu pada satu kejadian (Cianjur 2022). Kalimat aman: "Penurunan IRB terbesar terjadi di Jawa,
  dan korban di Jawa pada 2020–2024 tidak lebih rendah daripada 2015–2019."
- **I2.5 [Inferensi tim]** Implikasi untuk bab grand design dan register: indikator korban Renas 1.a dan 1.b (langsung dari
  DIBI) layak menjadi sasaran utama, dengan IRB sebagai indikator pendamping setelah baseline 2025 terbit (KD-4). Ini
  sejalan dengan tesis KERANGKA §5 dan tidak memerlukan klaim bahwa IRB "salah".

### Celah

- Lampiran Perka 2/2012 (rumus dan bobot komponen) dan buku IRBI 2021–2024 tidak dibuka; kontribusi bahaya, kerentanan,
  dan kapasitas terhadap penurunan IRB tidak dapat diurai. Permintaan ke Direktorat Pemetaan dan Evaluasi Risiko Bencana:
  komponen H, V, C per kab per tahun 2015–2025.
- Nilai IKD per kab per tahun tidak ada di paket dan tidak terbuka (KERANGKA status data); uji apakah kenaikan IKD berkaitan
  dengan korban tidak dapat dilakukan.
- Evaluasi independen IKD terhadap hasil (korban, pengungsi) tidak ditemukan; tidak ditulis sebagai kegagalan IKD.
- Dokumen NAR 2023 tidak dibuka (sama dengan `bab-01.md`).
- Nilai IRB 2024 per provinsi resmi hanya ada di media sekunder (Katadata); tidak dipakai.

---

## PK3. Berapa daerah berkapasitas minimal sedang menurut dua ukuran resmi?

### Inti

Menurut indikator RPJMN dan Renstra, 62% daerah berkapasitas minimal sedang pada 2023 (baseline RPJMN), dengan target 67%
pada 2025, 73% pada 2026, dan 90% pada 2029; capaian 2024 dan 2025 tidak ditemukan di dokumen yang dibuka. Menurut KRB
2022–2026, hanya 193 dari 508 kab/kota (38,0%) berkapasitas minimal sedang, sementara di tingkat provinsi 31 dari 34 (91,2%)
dan kecamatan 42,5%; sebarannya timpang dari Jawa 95,8% sampai Papua 2,4%. Kedua ukuran berbeda alat, unit, dan tahun, dan
ditampilkan berdampingan sampai KD-3 diputus.

### Temuan bersumber

- **T3.1** RPJMN 2025–2029 Lampiran III hlm. 913, KP 08.04.01 "Persentase daerah dengan tingkat kapasitas PB minimal sedang":
  baseline 62 (2023), target 67 (2025), 90 (2029). Sumber: riset E §E11(b) (dicek dari gambar halaman)
  [`ri-2025-perpres12-rpjmn`]; kunci `rpjmn.kp_kapasitas.baseline_2023` (usulan mitigasi bab-01), `rpjmn.kp_kapasitas.target_2025`
  (usulan mitigasi bab-02). **resmi**.
- **T3.2** Renstra BNPB 2025–2029: IKS "Persentase Daerah yang memiliki tingkat kapasitas penanggulangan bencana minimal
  kategori sedang dari 67% menjadi 90%" (hlm. 85, 128, 132); "target tahun 2025 sebesar 67 persen dan tahun 2029 bertambah
  menjadi 90 persen" (hlm. 125); target tahunan 67%, 73%, 79%, 85%, 90% (Tabel hlm. 132 dan 152, kolom baseline "-").
  Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 85, 125, 128, 132, 152 [`bnpb-2025-renstra`]; kunci
  `renstra.iks_kapasitas_minimal_sedang.awal` dan `.2029` (usulan air bab-01), `renstra.iks_kapasitas_minimal_sedang.2026`
  (baru). **resmi**.
- **T3.3** IKD: "upaya untuk mengukur kapasitas penanggulangan bencana di wilayah administrasi, baik di tingkat
  kabupaten/kota dan provinsi", 7 prioritas, 71 indikator, 284 pertanyaan (Renstra hlm. 85); rata-rata IKD 0,46, kategori
  sedang (hlm. 70, tahun tidak tertulis). Sumber: korpus Renstra [`bnpb-2025-renstra`]; kunci `renstra.ikd.rerata` (usulan
  mitigasi bab-02). **resmi** (kutipan).
  - *Perka BNPB 3/2012* tentang Panduan Penilaian Kapasitas Daerah dalam Penanggulangan Bencana berstatus BERLAKU
    (ditetapkan 12 Januari 2012); isinya tidak dibuka karena halaman JDIH menulis "Dokumen belum tersedia" dan PDF-nya
    membalas 404. Sumber: `data/raw/hukum/indeks.json` (slug perka-nomor-3-tahun-2012, `teks_ok` false);
    https://jdih.bnpb.go.id/dokumen/Peraturan/perka-nomor-3-tahun-2012 (diakses 24 Okt 2026) [`bnpb-2012-kapasitas-daerah`].
    **resmi** hanya untuk metadata status. Renstra hlm. 70 dan 85 tidak menyebut Perka ini; kaitannya dengan IKD (7
    prioritas, 71 indikator, 284 pertanyaan) **[Inferensi tim]** dari kesamaan judul dan riset A §1.1, tidak terverifikasi.
  - *Ambang kelas IKD* (rendah 0,01–0,39; sedang 0,40–0,79; tinggi 0,80–1,00) hanya dari dokumen kinerja BPBD Luwu Timur
    (riset A §1.1). **terverifikasi** sekunder; tidak untuk naskah final.
- **T3.4** Kapasitas KRB 2022–2026 per kab/kota (sama untuk semua bahaya): rendah 315, sedang 190, tinggi 3, dinilai 508;
  minimal sedang 193 (38,0%). Tiga kab berkapasitas tinggi: Kebumen, Magelang, Klaten (Jawa Tengah). Enam kab lama bukan
  unit KRB (Toba, Kep. Siau Tagulandang Biaro, Bolaang Mongondow Selatan, Pangkajene dan Kepulauan, Pohuwato, Pasangkayu).
  Kecamatan: rendah 4.153, sedang 2.996, tinggi 73 dari 7.222 (42,5% minimal sedang). Sumber: `riset/mentah/ks_*.json` kunci
  `kapasitas_kabupaten`, `kapasitas_kecamatan` (identik di 13 bahaya); `nonalam-sosial/krb_covid19_kab.csv` kolom
  `kapasitas_kab`; `nonalam-sosial/README.md` [`bnpb-2026-krb`]; kunci `krb.nasional.kab_kapasitas_rendah`, `_sedang`,
  `_tinggi`, `krb.nasional.kapasitas_minimal_sedang_persen` (usulan mitigasi bab-03), `krb.nasional.kab_kapasitas_dinilai`
  (bab-02), `krb.kec.kapasitas_minimal_sedang_persen` (baru). **resmi** (olah).
- **T3.5** Kapasitas KRB multibahaya per provinsi (Renas Tabel 2.7 hlm. 25): Tinggi Jawa Tengah; Rendah Kepulauan Bangka
  Belitung, Kalimantan Selatan, Papua Barat; 30 provinsi lain Sedang. Minimal sedang 31 dari 34 (91,2%). Sumber: korpus
  `perban-nomor-1-tahun-2025.json` hlm. 25 [`bnpb-2025-renas`]; kunci `krb.prov.kapasitas_minimal_sedang`,
  `krb.prov.kapasitas_minimal_sedang_persen`. **resmi** (persen dihitung penyusun bukti).
- **T3.6** Kapasitas KRB kab per pulau (minimal sedang / dinilai): Jawa 114/119 (95,8%); Bali dan Nusa Tenggara 19/41 (46,3%);
  Sulawesi 18/76 (23,7%); Sumatra 32/153 (20,9%); Kalimantan 7/56 (12,5%); Maluku 2/21 (9,5%); Papua 1/42 (2,4%). Provinsi
  dengan seluruh kab berkapasitas rendah: Kalimantan Selatan, Kepulauan Bangka Belitung, Papua Barat, Papua Barat Daya, Papua
  Pegunungan, Papua Selatan, Papua Tengah. Provinsi dengan seluruh kab minimal sedang: DKI Jakarta, Jawa Barat, Jawa Tengah,
  Banten, Bali. Sumber: `nonalam-sosial/krb_covid19_kab.csv` kolom `pulau`, `provinsi`, `kapasitas_kab` [dihitung penyusun
  bukti] [`bnpb-2026-krb`]; kunci `krb.jawa.kab_kapasitas_minimal_sedang_persen` (usulan air bab-07),
  `krb.pulau.*.kab_kapasitas_minimal_sedang_persen` (baru). **resmi** (olah); pengelompokan pulau **asumsi-kebijakan**.
- **T3.7** Porsi penduduk KRB yang tinggal di kab berkapasitas minimal sedang: 181.988.385 dari 271.680.290 (67,0%). Sumber:
  `nonalam-sosial/krb_covid19_kab.csv` kolom `penduduk`, `kapasitas_kab` [dihitung penyusun bukti] [`bnpb-2026-krb`]; kunci
  `krb.kab.porsi_penduduk_kapasitas_minimal_sedang`. **asumsi-kebijakan** (pembobotan pilihan penyusun).
- **T3.8** Kepatuhan pengukuran: 79 daerah belum menyusun IKD 2024, 87 daerah belum mengaktifkan KRB, 63 daerah belum
  menuntaskan SPM sub-urusan bencana (Direktur MPBG Kemendagri, rapat 4 September 2025). Siaran menulis "Target nasional
  adalah 90 persen kabupaten/kota mencapai level menengah hingga tinggi pada 2029", tepat sesudah paragraf Direktur
  Pemetaan dan Evaluasi PB BNPB, tanpa menandai kalimat itu sebagai ucapannya. Sumber: https://kemenkopmk.go.id/node/5841
  (siaran 12 September 2025, dibuka ulang 24 Okt 2026) [`kemenkopmk-2025-sinkronisasi-irb`]; kunci
  `kemenkopmk.daerah_belum_ikd_2024`, `kemenkopmk.daerah_belum_krb`, `kemenkopmk.daerah_belum_spm_bencana` (usulan air
  bab-07), `kemenkopmk.iks_kapasitas_penyebut` (baru). **terverifikasi** (siaran pers kementerian yang merangkum pernyataan
  pejabat; selaras label [SEKUNDER] riset A untuk angka 79/87/63).
- **T3.9** Silang kapasitas KRB dan status IRBI 2025: 148 kab berkapasitas rendah dan berstatus Tinggi, berpenduduk
  34.538.191 (WorldPop 2026). Sumber: idem T2.10 [dihitung penyusun bukti]; kunci `krb_irbi.kab_kapasitas_rendah_tinggi`,
  `krb_irbi.kab_kapasitas_rendah_tinggi_penduduk`. **asumsi-kebijakan**.

### Inferensi

- **I3.1 [Inferensi tim]** "Dua ukuran resmi" lebih tepat ditulis "dua alat ukur resmi dengan lima angka": IKD (RPJMN 62%
  baseline 2023; target Renstra 67% untuk 2025) dan KRB 2022–2026 (kab 38,0%, kecamatan 42,5%, provinsi 91,2%). Penyebut
  "daerah" pada IKS tidak didefinisikan di Renstra (provinsi, kab/kota, atau keduanya, 552 daerah), tetapi siaran Kemenko
  PMK 12 September 2025 menulis target 90% itu untuk kab/kota (T3.8, terverifikasi). Bila penyebut kab/kota dipakai, ukuran
  KRB yang sebanding adalah kab 38,0%, bukan provinsi 91,2%; ini masukan langsung KD-3. Angka 91,2% provinsi KRB tetap
  menunjukkan betapa besar pengaruh pilihan unit. Tabel 5.4 wajib memuat kolom alat, unit, tahun, penyebut, angka, dan sumber.
- **I3.2 [Inferensi tim]** Akibat pilihan KD-3 terhadap jarak ke 90% pada 2029: dengan baseline RPJMN 62%, jarak 28 poin
  persen dalam enam tahun; dengan kapasitas KRB kab 38,0%, jarak 52 poin persen atau 265 kab tambahan (90% dari 508 = 458
  kab, kini 193). Pilihan
  (b) membuat sasaran jauh lebih berat tetapi dapat diperiksa per kab dari InaRISK; pilihan (a) memakai alat yang 79 daerah
  belum isi untuk 2024 (T3.8). Ini masukan KD-3, bukan rekomendasi pilihan.
- **I3.3 [Inferensi tim]** Kecocokan 67,0% (porsi penduduk di kab berkapasitas KRB minimal sedang) dengan target Renstra 67%
  adalah kebetulan yang tidak dapat diuji dengan dokumen yang dibuka; naskah tidak menyebutnya sebagai penjelasan.
- **I3.4 [Inferensi tim]** Ketimpangan Jawa (95,8%) lawan Papua (2,4%) dan 148 kab yang sekaligus berkapasitas rendah dan
  berstatus Tinggi (34,5 juta jiwa) adalah bahan sasaran kapasitas berbasis wilayah di bab grand design. Karena status IRBI
  sendiri dipengaruhi kapasitas (I2.1), silang ini tidak boleh dibaca sebagai dua bukti bebas.

### Celah

- Capaian IKS kapasitas 2024 dan 2025 (realisasi terhadap target 67%) tidak ditemukan di dokumen yang dibuka. Permintaan ke
  Direktorat Pemetaan dan Evaluasi Risiko Bencana dan Biro Perencanaan (LAKIP BNPB 2025).
- Teks Perka BNPB 3/2012 tidak tersedia di JDIH ("Dokumen belum tersedia"); isinya, termasuk apakah ia pedoman IKD, serta
  kelas dan ambang IKD resmi tidak dibuka. Naskah tidak mengutip ambang IKD dan tidak menyebut Perka ini sebagai dasar IKD.
- IKD per daerah per tahun tidak ada. Penyebut "daerah" tidak didefinisikan di Renstra; Tabel 5.4 menulis "Renstra tidak
  mendefinisikan; siaran Kemenko PMK 12 Sep 2025 menyebut kab/kota" (terverifikasi, siaran pers). Definisi resmi penyebut
  (mis. manual indikator IKS) tetap dicari ke Biro Perencanaan.
- Metode kelas kapasitas KRB 2022–2026 (apakah memakai IKD tahun tertentu) tidak terdokumentasi di API; tidak diklaim bahwa
  KRB dan IKD memakai atau tidak memakai alat yang sama.
- Kapasitas KRB enam kab lama bukan unit KRB tidak dinilai; ditulis kosong, bukan rendah.

---

## PK4. Jenis bencana apa yang berada di kelas dampak tertinggi, dan untuk jenis mana kemungkinan dapat dinilai?

### Inti

Dengan pita fatalitas yang diusulkan Bab 3 (Cabinet Office: kelas 5 > 1.000 meninggal dan hilang), lima dari 15 jenis
`tema.json` berada di kelas 5 pada aspek kependudukan menurut kejadian tercatat terbesar dalam periode acuan: epidemi dan
pandemi (COVID-19, 161.870 meninggal resmi), tsunami (Aceh 2004, 126.741 atau 127.720 meninggal dan 93.285 hilang menurut
dua halaman buku BRR 2009; resmi, KEPUTUSAN T14), konflik sosial (Maluku 1999–2002, sedikitnya 5.000 meninggal), gempa bumi
(Sulawesi Tengah 2018, 4.140 meninggal dan 705 hilang, gabungan gempa, tsunami, dan likuefaksi; Yogyakarta 2006, 5.749
meninggal), serta banjir (banjir saja 2025, 1.585 meninggal dan hilang). Likuefaksi ikut kelas 5 bila angka gabungan
Sulawesi Tengah 2018 diterima, dan gunung api ikut bila pengungsi dihitung (Merapi 2010, 447.982 mengungsi). Kemungkinan
lima tahun yang dipasangkan dengan skenario dampak yang sama hanya dapat dinilai untuk tiga jenis lewat dua kartu: gempa
dan tsunami megathrust selatan Jawa (periode ulang PuSGeN 2024, pita 2–3, lantai Pangandaran 2006 kelas 4) dan banjir
(musim hujan seburuk lantai 2025/2026, 23,7%, pita 4). Dua belas jenis, termasuk longsor, cuaca ekstrem, kekeringan, dan
karhutla yang hanya punya peluang fase iklim, masuk panel "dampak dinilai, kemungkinan tidak dinilai". Semua kelas dan pita
berlabel asumsi-kebijakan sampai ambang Bab 3 dikunci.

### Temuan bersumber

**Kerangka penilaian**

- **T4.1** Perban BNPB 2/2023 Pasal 7 ayat (5): asumsi dampak diproyeksikan terhadap aspek lingkungan, kependudukan, ekonomi,
  infrastruktur/fisik, dan layanan sipil (hlm. 4); Lampiran: skenario "dapat mempertimbangkan sejarah kejadian bencana
  terburuk yang pernah terjadi" dan lima aspek dampak (hlm. 14). Tidak ada kelas atau ambang 1–5. Sumber: korpus
  `perban-nomor-2-tahun-2023.json` hlm. 4 dan 14 [`bnpb-2023-renkon`]. **resmi**.
- **T4.2** Cabinet Office (2026): kemungkinan risiko nonmalisius = peluang terjadi dalam lima tahun ke depan; pita 1–5:
  < 0,2%, 0,2–1%, 1–5%, 5–25%, > 25%; dampak 1 (Minor) sampai 5 (Catastrophic), "Driven by the most severe consequences across
  seven dimensions"; skenario terburuk yang masuk akal = versi terburuk yang masuk akal setelah ekstrem yang sangat tidak
  mungkin disisihkan (hlm. 7 menurut nomor cetak; dibaca ulang 24 Okt 2026). Panduan memplot tiap risiko pada matriks
  dampak × kemungkinan dengan skenario terburuk yang masuk akal sebagai satuannya; kalimat "skenario yang sama" tidak tertulis
  harfiah, tetapi kemungkinan didefinisikan sebagai peluang "this" (risiko yang sama) terjadi. NRR 2025 memuat pita fatalitas 1–8, 9–40, 41–200, 201–1.000, > 1.000 (hlm. 14, dibaca
  `bab-03.md`). Sumber: https://assets.publishing.service.gov.uk/media/6a7c4412aadaaddf89b6e484/A_Guide_to_the_2026_National_Risk_Register.pdf
  (diakses 24 Okt 2026, `pdftotext` hlm. 7) [`cabinetoffice-2026-nrr-panduan`]; [`cabinetoffice-2025-nrr`]; kunci
  `nrr_2025.pita1_batas_persen`, `nrr_2025.pita5_batas_persen` (usulan air bab-03), `nrr_2025.fatalitas.kelas1_atas` sampai
  `kelas4_atas` (usulan mitigasi bab-03). **terverifikasi** (dokumen resmi pemerintah asing; rujukan metode, bukan standar
  Indonesia).
- **T4.3** Usulan Bab 3: aspek kependudukan dikelaskan dengan pita fatalitas di atas dan pita mengungsi kelipatan lima yang
  ditambatkan pada p50 DIBI provinsi-tahun (≤ 1.400, ≤ 7.000, ≤ 35.000, ≤ 175.000, > 175.000); aspek ekonomi dan lingkungan
  "tidak dinilai" dari DIBI; Tabel 3.4 dasar kemungkinan per jenis. Sumber: `naskah/mitigasi/bukti/bab-03.md` P2 Inferensi.
  **asumsi-kebijakan** (belum dikunci).

**Dampak: kejadian tercatat dan analog terbesar per jenis (aspek kependudukan)**

- **T4.4** Gempa bumi: Sulawesi Tengah 2018 4.140 meninggal, 705 hilang, 212.719 mengungsi (DIBI, gempa, tsunami, dan
  likuefaksi); gempa 2018 nasional 5.423 meninggal dan hilang; Cianjur 2022 602 meninggal, 8 hilang, 115.382 mengungsi.
  Sumber: `dibi/kejadian_besar.csv` [versi=DIBI]; `dibi/rekap_nasional_tahunan.csv` [tahun=2018,kode_jenis_juklak=107]
  [`bnpb-dibi`]; kunci `dibi.sulteng2018.meninggal` (lama), `dibi.alam.gempa.meninggal_hilang_maks_tahun`. **resmi** (olah;
  baris `sulteng2018` bertanda `turunan_penyusun` = ya: jendela 28 Sep sampai 31 Okt 2018, kategori Gempabumi dan Tsunami,
  provinsi 72, cakupan semua laporan dipilih penyusun; korban gempa, tsunami, dan likuefaksi tidak terpisah). Pembanding
  satu jenis: Yogyakarta 2006 5.749 meninggal (USGS, sesar darat) [`usgs-usp000ej1c`] **terverifikasi**. Kelas fatalitas 5.
  - *Megathrust selatan Jawa (Kartu 6.1):* lantai tercatat Pangandaran 2006, 665 meninggal dan 65 hilang, seluruh kematian
    akibat tsunami (USGS impact-text) [`usgs-usp000ensm`] **terverifikasi**: kelas 4. Korban guncangan analog skenario
    Mw 9,1 11.000–140.000 (KERANGKA Bab 6 K2; `skenario-geologi/README.md` §5–6) **estimasi-model**, pita lebih dari satu orde:
    kelas 5 bila dipakai. Keduanya ditulis berdampingan.
- **T4.5** Banjir dan banjir bandang: Sumatra November 2025 1.202 meninggal, 140 hilang, 970.876 mengungsi; banjir 2025
  nasional 1.585 meninggal dan hilang (tahun terbesar 2008–2025); musim hujan 2025/2026 nasional 1.692 (lantai). Sumber:
  `dibi/kejadian_besar.csv` [kode=sumatra2025]; `dibi/rekap_nasional_tahunan.csv` [kode_jenis_juklak=101];
  `skenario-hidromet/musim_hujan.csv` [`bnpb-dibi`]; kunci `dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang`,
  `hidromet.nasional.lantai.meninggal_hilang` (lama), `dibi.alam.banjir.meninggal_hilang_maks_tahun`. Label: banjir setahun
  2025 (kode 101 saja) **resmi** (olah) dan menjadi dasar kelas; Sumatra 2025 **resmi (olah; jendela dan kategori dipilih
  penyusun)**: baris `sumatra2025` bertanda `turunan_penyusun` = ya, jendela 15 Nov sampai 31 Des 2025, kategori Banjir DAN
  Longsor, provinsi 11, 12, 13, cakupan semua laporan, sehingga korban longsor ikut terhitung (DIBI 2025 longsor nasional
  244 meninggal dan 31 hilang); angka ini analog kejadian majemuk, bukan banjir murni. Kelas fatalitas 5 (dari 1.585
  banjir saja); mengungsi 5 (banjir saja 2025: 1.126.773 mengungsi, `dibi/rekap_nasional_tahunan.csv` [tahun=2025,
  kode_jenis_juklak=101]).
- **T4.6** Tanah longsor: tahun nasional terbesar 2008–2025 354 meninggal dan hilang (2014), mengungsi terbesar 17.484 (2025);
  jumlah setahun adalah batas atas satu kejadian. Sumber: `dibi/rekap_nasional_tahunan.csv` [kode_jenis_juklak=102] [dihitung
  penyusun bukti] [`bnpb-dibi`]; kunci `dibi.alam.longsor.meninggal_hilang_maks_tahun`. **resmi** (olah). Kelas fatalitas
  paling tinggi 4.
- **T4.7** Tsunami: tahun nasional terbesar DIBI 2008–2025 503 meninggal dan hilang (Mentawai 2010: 447 + 56, gempa dan
  tsunami; baris `mentawai2010` bertanda `turunan_penyusun`); Selat Sunda 2018 437 meninggal, 16 hilang, 42.325 mengungsi
  (longsoran lereng Anak Krakatau, bukan megathrust); Pangandaran 2006 665 meninggal (USGS). Aceh 2004 masuk periode acuan
  geologi 30 tahun (1996–2025) dan menjadi lantai tsunami nasional dengan sumber buku BRR (KERANGKA §2 butir 9; KEPUTUSAN
  T14 menerima terbitan BRR NAD-Nias sebagai sumber resmi). *Angka berdampingan:* buku BRR *The Scattered Beads* (2009)
  hlm. x menulis 126.741 meninggal dan 93.285 hilang, sedangkan infografik capaian empat tahun di buku yang sama (hlm. PDF 15)
  dan buku BRR *Nias* (2009) hlm. xiii menulis 127.720 meninggal dan 93.285 hilang [`brr-2009-scattered-beads`,
  `brr-2009-nias`]. Di `dibi/kejadian_besar.csv`, 126.741 tercatat sebagai versi BRR via Republika (resmi) dan 127.720
  sebagai versi CNN Indonesia (terverifikasi); keduanya berasal dari BRR. Sumber: `dibi/kejadian_besar.csv` [kode=aceh2004,
  mentawai2010, selatsunda2018]; `dibi/rekap_nasional_tahunan.csv` [kode_jenis_juklak=108]; riset E §E4 [`bnpb-dibi`,
  `usgs-usp000ensm`]; kunci `dibi.alam.tsunami.meninggal_hilang_maks_tahun`, `tsunami.aceh2004.meninggal_brr` (baru).
  **resmi** (DIBI; buku BRR menurut T14); Pangandaran **terverifikasi**. Kelas fatalitas 5 (Aceh 2004); 4 bila hanya
  DIBI 2008–2025.
- **T4.8** Gunung api: Merapi 2010 386 meninggal, 447.982 mengungsi (DIBI); tahun terbesar 394 meninggal dan hilang (2010).
  Sumber: `dibi/kejadian_besar.csv` [kode=merapi2010]; `dibi/rekap_nasional_tahunan.csv` [kode_jenis_juklak=109]
  [`bnpb-dibi`]; kunci `dibi.alam.gunungapi.meninggal_hilang_maks_tahun`. **resmi**. Kelas fatalitas 4; mengungsi 5.
- **T4.9** Cuaca ekstrem 81 (2025), gelombang pasang dan abrasi 36 (2011), kekeringan 6 (2023), karhutla 24 (2015)
  meninggal dan hilang pada tahun nasional terbesar 2008–2025; mengungsi terbesar 10.680, 4.032, 7, 804. Sumber:
  `dibi/rekap_nasional_tahunan.csv` [klasifikasi=alam,cakupan=bencana] [dihitung penyusun bukti] [`bnpb-dibi`]; kunci
  `dibi.alam.cuaca_ekstrem.meninggal_hilang_maks_tahun`, `dibi.alam.gelombang.meninggal_hilang_maks_tahun`,
  `dibi.alam.kekeringan.meninggal_hilang_maks_tahun`, `dibi.alam.karhutla.meninggal_hilang_maks_tahun`. **resmi** (olah).
  Kelas fatalitas paling tinggi 3, 2, 1, 2.
  - *Angka berdampingan (karhutla):* kematian berlebih akibat asap September–Oktober 2015 di Indonesia 91.600 (selang 95%
    24.000–159.200), model GEOS-Chem Koplitz dkk. (2016) [`koplitz-2016-haze`; riset E §E15]. **estimasi-model** (sejajar
    kematian berlebih WHO di T4.10; jurnal terverifikasi, angkanya keluaran model, bukan korban tercatat). Bila dipakai,
    karhutla naik ke kelas fatalitas 5 dengan label estimasi-model; DIBI 2015 mencatat 24. Label ini sama dengan `bab-04.md`
    butir 20 (estimasi-model).
  - *Angka berdampingan (kekeringan):* korban jiwa tidak berlaku; terdampak terbesar 7.798.763 (2018, DIBI; KERANGKA Bab 7),
    yang tidak termasuk pita fatalitas maupun mengungsi.
- **T4.10** Epidemi dan pandemi: COVID-19 161.870 meninggal (Kemenkes 2024 via Renstra hlm. 14), kematian berlebih 2020–2021
  806.815–1.343.849 (model WHO), status bencana nasional 1.165 hari. Sumber: `nonalam-sosial/skenario_terburuk.csv`
  [`bnpb-2025-renstra`, `who-2023-kematian-berlebih`]; kunci `nonalam.covid19.meninggal` (**resmi**),
  `nonalam.covid19.kematian_berlebih` (**estimasi-model**) (lama). Kelas fatalitas 5.
- **T4.11** Kebakaran industri dan kegagalan teknologi: Plumpang 2023 17 meninggal pada hari kedua (Kepala BNPB), 1.085
  pengungsi; 29 meninggal per 18 Maret 2023 (BPBD DKI via media, sekunder); Morowali 2023 20 meninggal (sekunder). Sumber:
  `nonalam-sosial/skenario_terburuk.csv`; kunci `nonalam.plumpang2023.meninggal` (lama). **resmi** (17); sekunder (29, 20)
  tidak untuk naskah final. Kelas fatalitas 2.
- **T4.12** Kebakaran TPA: tidak ada korban jiwa tercatat di analog; 16 TPA terbakar serentak 2023 (Kepala BNPB); asap
  Sarimukti 3.000 KK; dampak utama di aspek lingkungan dan layanan publik. Sumber: `nonalam-sosial/skenario_terburuk.csv`;
  kunci `nonalam.tpa.terbakar_2023` (lama). **resmi**. Kelas kependudukan tidak relevan; aspek lingkungan dan layanan "tidak
  dinilai" dari DIBI.
- **T4.13** Konflik sosial: Maluku 1999–2002 sedikitnya 5.000 meninggal (mungkin 10.000) dan sekitar 700.000 mengungsi (ICG
  2002); Poso sekitar 1.000 (HRW 2002); Sampit 2001 sekitar 500 (ICG 2001). Sumber: `nonalam-sosial/skenario_terburuk.csv`
  [`icg-2002-maluku`]; kunci `sosial.maluku.meninggal_bawah`, `sosial.maluku.pengungsi` (lama). **terverifikasi**. Kelas
  fatalitas 5; mengungsi 5.
  - *Aturan sumber yang sama untuk semua jenis:* kelas ditentukan oleh kejadian terbesar dalam periode acuan (hidrometeorologi
    DIBI 2008–2025; geologi, nonalam, sosial 1996–2025) dengan sumber resmi atau terverifikasi yang terbuka, labelnya
    ditulis di samping kelas. Dengan aturan ini Maluku (ICG, terverifikasi) dan Aceh 2004 (BRR, resmi menurut T14)
    sama-sama menentukan kelas 5; angka estimasi-model (WHO, Koplitz, korban guncangan analog) tidak menentukan kelas dan
    hanya tampil berdampingan.
- **T4.13a** Likuefaksi: analog Sulawesi Tengah 2018 (KERANGKA Kartu 6.5); DIBI tidak memisahkan korban likuefaksi
  dari gempa dan tsunami (baris `sulteng2018` gabungan 4.140 meninggal, 705 hilang, 212.719 mengungsi); keterpaparan KRB
  likuefaksi 86.689.779 jiwa (T1.14). Sumber: `dibi/kejadian_besar.csv` [kode=sulteng2018]; KERANGKA Kartu 6.5 [`bnpb-dibi`,
  `bnpb-2025-renas`]. **resmi** (olah, gabungan). Kelas fatalitas dan mengungsi "5 gabungan, tidak terpisah".
- **T4.13b** Rob: analog terdekat di paket adalah banjir Demak–Kudus 2024, 11 meninggal, 0 hilang, 60.706 mengungsi,
  257.387 menderita; DIBI mengategorikannya Banjir (baris `demak2024` bertanda `turunan_penyusun`, jendela 5 Feb sampai
  31 Mar 2024). Rob murni tidak punya baris kejadian besar di paket; Kartu 6.3 K1 mencatat 1 meninggal untuk gelombang,
  abrasi, dan rob Jawa. Sumber: `dibi/kejadian_besar.csv` [kode=demak2024]; KERANGKA Kartu 6.3 K1 [`bnpb-dibi`]. **resmi**
  (olah; kategori dan jendela dipilih penyusun). Kelas fatalitas 2; mengungsi 4 (≤ 175.000).

**Kemungkinan: jenis yang punya dasar peluang**

- **T4.14** ENSO: dalam 18 musim acuan 2008/2009–2025/2026 La Niña 7 (2008, 2010, 2011, 2017, 2020, 2021, 2022), El Niño kuat
  (ONI NDJ ≥ 1,5) 3 (2009, 2015, 2023); 84,7% jendela lima tahun 1950–2025 memuat paling sedikit satu musim La Niña dan
  38,9% memuat El Niño kuat musim kemarau. Musim lantai 2025/2026 ber-ONI NDJ −0,6 dan tidak ditandai La Niña di paket.
  Sumber: `skenario-hidromet/musim_hujan.csv`; `riset/mentah/oni_cpc.txt` [`noaa-2026-oni`]; kunci
  `hidromet.nasional.musim_lanina.n`, `hidromet.nasional.pasca_elnino.n_musim` (lama), `enso.elnino_kuat_porsi_jendela5`
  (usulan air bab-03), `hidromet.nasional.musim_2025.oni` (lama). **resmi** (hitungan musim); porsi jendela
  **asumsi-kebijakan**.
  - *Peluang fase bukan peluang dampak:* 84,7% dan 38,9% adalah peluang terjadinya fase ENSO, bukan peluang kejadian
    sebesar analog dampak. Tak satu pun dari 7 musim La Niña 2008/09–2022/23 mendekati 1.000 meninggal dan hilang nasional
    (terbesar 2010/11: 599; 2020/21: 537; 2022/23: 268; 2021/22: 173), sementara lantai 1.692 terjadi pada musim ber-ONI
    −0,6 yang tidak ditandai La Niña. Dari tiga musim El Niño kuat (2009, 2015, 2023), karhutla bermeninggal 0, 24, dan 4,
    dan kekeringan 0, 0, dan 6; dampak terbesar masing-masing jenis hanya terjadi pada satu dari tiga. Sumber:
    `skenario-hidromet/musim_hujan.csv` kolom `la_nina`, `meninggal`, `hilang` [wilayah=nasional];
    `dibi/rekap_nasional_tahunan.csv` [kode_jenis_juklak=105, 106; tahun 2009, 2015, 2023] [dihitung penyusun bukti]
    [`bnpb-dibi`]. **resmi** (olah).
- **T4.15** Peluang lima tahun musim seburuk lantai nasional 23,7% (1 − (18/19)^5, posisi plot Weibull; pita 4). Sumber:
  `bab-03.md` P2; kunci `hidromet.nasional.lantai.peluang_5_musim` (usulan mitigasi bab-03). **asumsi-kebijakan**.
- **T4.16** Megathrust Jawa, turunan Poisson dari periode ulang PuSGeN 2024 (Tabel 6.2 hlm. 342–343): Mw 9,1 gabungan
  (periode ulang 600 tahun) 0,83% (pita 2); Mw 8,9 per segmen (400 tahun) 1,24% (pita 3); Sumba Mw 8,5 periode ulang "No
  Data". Sumber: riset E §E1 [`pusgen-2024-peta-gempa`]; kunci `geologi.jawa_gabungan.peluang_5th`,
  `geologi.jawa_segmen.peluang_5th` (usulan mitigasi bab-03). **asumsi-kebijakan** (turunan; bukan angka PuSGeN).
- **T4.17** Laju gempa M6+ platform 12,97 per tahun lolos uji balik 2016–2025; M7+ dangkal gagal uji balik. Sumber:
  `bab-03.md` P2; `riset/D-inventaris-platform.md` §6. **estimasi-model** (lolos uji balik untuk M6+). Laju nasional ini
  bukan peluang skenario terburuk per wilayah dan tidak dipakai untuk posisi kartu.
- **T4.18** Jenis tanpa dasar peluang: gunung api, gelombang ekstrem dan abrasi, rob, likuefaksi, pandemi, kebakaran
  industri, kebakaran TPA, konflik ("tidak dinilai"); gempa sesar darat dan megathrust Sumatra dan Sumba juga belum dinilai
  sampai tabel PuSGeN dibaca. Longsor, cuaca ekstrem, kekeringan, dan karhutla hanya punya peluang fase iklim yang tidak
  dipasangkan dengan skenario dampaknya (T4.14), sehingga masuk panel yang sama. Sumber: `bab-03.md` P2 rancangan Tabel 3.4; PEDOMAN §B5.27; KERANGKA §2 butir 9. **asumsi-kebijakan** (keputusan
  kajian).

### Inferensi

- **I4.1 [Inferensi tim]** Rancangan posisi Gambar 5.6 (kelas aspek kependudukan; kemungkinan lima tahun; semua
  asumsi-kebijakan sampai Bab 3 dikunci):

  | Jenis (kartu) | Dasar dampak (angka tercatat atau analog; label) | Kelas fatalitas | Kelas mengungsi | Kemungkinan 5 tahun untuk skenario yang sama | Panel |
  | --- | --- | --- | --- | --- | --- |
  | Gempa bumi dan tsunami megathrust selatan Jawa (Kartu 6.1) | lantai Pangandaran 2006: 665 meninggal, 65 hilang, seluruhnya akibat tsunami (terverifikasi); korban guncangan model Mw 9,1 11.000–140.000 (estimasi-model, berdampingan) | 4 (5 menurut model) | tidak tercatat di paket | 0,83% Mw 9,1 gabungan (pita 2); 1,24% Mw 8,9 per segmen (pita 3) | matriks: satu titik untuk gempa, satu untuk tsunami |
  | Gempa bumi sesar darat dan majemuk (Kartu 6.3, 6.5) | Sulawesi Tengah 2018: 4.845 meninggal dan hilang, 212.719 mengungsi (resmi, olah, gabungan); Yogyakarta 2006: 5.749 (terverifikasi) | 5 | 5 | tidak dinilai (laju sesar darat belum dibaca dari PuSGeN Tabel 6.9) | dampak saja |
  | Tsunami nasional (Kartu 6.2, 6.6) | Aceh 2004: 126.741 atau 127.720 meninggal, 93.285 hilang (buku BRR, resmi menurut T14); Mentawai 2010: 503; Selat Sunda 2018: 453 (longsoran Anak Krakatau) | 5 | 5 (635.384 kehilangan tempat tinggal, BRR; bukan definisi mengungsi DIBI) | tidak dinilai (megathrust Sumatra belum dibaca; longsoran gunung api tanpa dasar) | dampak saja |
  | Likuefaksi (Kartu 6.5) | Sulawesi Tengah 2018, gabungan dengan gempa dan tsunami; tidak terpisah di DIBI | 5 gabungan | 5 gabungan | tidak dinilai | dampak saja |
  | Gunung api (Kartu 6.4) | Merapi 2010: 386, 447.982 mengungsi (resmi) | 4 | 5 | tidak dinilai | dampak saja |
  | Banjir dan banjir bandang (kartu agregat musim hujan nasional) | lantai musim 2025/2026: 1.692 meninggal dan hilang hidrometeorologi; banjir saja 2025: 1.585 dan 1.126.773 mengungsi (resmi, olah); Sumatra 2025: 1.342 banjir dan longsor (resmi, olah; jendela dan kategori dipilih penyusun) | 5 | 5 | 23,7% musim seburuk lantai (pita 4) | matriks |
  | Tanah longsor | tahun terbesar 354 (2014); mengungsi 17.484 (2025) | ≤ 4 | 3 | tidak dinilai (hanya fase iklim) | dampak saja |
  | Cuaca ekstrem | tahun terbesar 81 (2025); mengungsi 10.680 | ≤ 3 | 3 | tidak dinilai (hanya fase iklim) | dampak saja |
  | Gelombang ekstrem dan abrasi | tahun terbesar 36 (2011); mengungsi 4.032 | ≤ 2 | 2 | tidak dinilai | dampak saja |
  | Rob | Demak–Kudus 2024: 11 meninggal, 60.706 mengungsi (resmi, olah; kategori DIBI Banjir) | 2 | 4 | tidak dinilai | dampak saja |
  | Kekeringan | 6 (2023); terdampak 7,8 juta (2018) | 1 | 1 | tidak dinilai (El Niño kuat 38,9% adalah peluang fase; dampak itu pada 1 dari 3 El Niño kuat) | dampak saja |
  | Karhutla | 24 (DIBI 2015); 91.600 kematian berlebih asap (estimasi-model, berdampingan) | 2 (5 menurut model) | 1 | tidak dinilai (idem; karhutla bermeninggal pada 2 dari 3 El Niño kuat, kelas 2 pada 1) | dampak saja |
  | Epidemi dan pandemi | COVID-19: 161.870 meninggal (resmi) | 5 | tidak berlaku | tidak dinilai | dampak saja |
  | Kebakaran industri | Plumpang 2023: 17 (resmi) | 2 | 1 | tidak dinilai | dampak saja |
  | Kebakaran TPA | 0 meninggal; 16 TPA serentak 2023 | 0 | tidak tercatat | tidak dinilai | dampak saja |
  | Konflik sosial | Maluku 1999–2002: ≥ 5.000, sekitar 700.000 mengungsi (terverifikasi) | 5 | 5 | tidak dinilai | dampak saja |

  Lingkup n = 15 jenis `tema.json` (gempa dan tsunami muncul di dua kartu; banjir bandang menyatu dengan banjir sesuai
  V05/V08). Kelas jenis = kelas kartu tertinggi. Untuk slide B2 ("{a} dari {n} jenis bencana berada di kelas dampak
  tertinggi; peluang lima tahun dapat dinilai untuk {m} jenis"): n = 15; m = 3 (gempa, tsunami, banjir; kemungkinan
  dipasangkan dengan skenario dampak yang sama); a = 5 menurut fatalitas tercatat (gempa, tsunami, banjir, epidemi dan
  pandemi, konflik), 6 bila kelas mengungsi ikut (gunung api), 7 bila likuefaksi dihitung dari angka gabungan Sulawesi
  Tengah 2018. Judul memakai satu versi dan catatan menyebut versi lain. Titik matriks gempa dan tsunami berada di kelas 4
  (lantai tercatat Kartu 6.1), lebih rendah daripada kelas jenisnya (5, dari kartu yang kemungkinannya tidak dinilai);
  catatan gambar menyebut ini agar pembaca tidak menyimpulkan gempa atau tsunami hanya kelas 4.
  Perubahan dari versi sebelumnya (n = 13, m = 7): likuefaksi dan rob ditambahkan (KERANGKA baris 1226 dan 1583); fase
  La Niña 84,7% dan El Niño kuat 38,9% tidak lagi dipakai sebagai pita karena bukan peluang skenario dampak yang
  dipasangkan (T4.14); gempa Sulawesi Tengah dan tsunami Mentawai, Selat Sunda, dan Aceh tidak lagi dipasangkan dengan
  peluang megathrust Jawa; longsor dan cuaca ekstrem tidak punya dasar peluang sendiri.
- **I4.2 [Inferensi tim]** Satuan tidak seragam: jenis berkejadian besar memakai satu kejadian, jenis tanpa kejadian tunggal
  yang menonjol memakai jumlah setahun. Jumlah setahun adalah batas atas satu kejadian, jadi kelas jenis itu tidak mungkin
  lebih tinggi daripada yang ditulis ("≤"). Lantai skenario (KERANGKA §2 butir 9) dijaga dengan aturan sumber yang sama
  untuk semua jenis (T4.13): kelas jenis diambil dari kejadian tercatat terbesar dalam periode acuan, termasuk Aceh 2004
  untuk tsunami (lantai tsunami nasional, kelas 5) dan Maluku untuk konflik, bukan dari model. Versi sebelumnya melanggar
  lantai untuk tsunami (kelas 4 padahal Aceh 2004 dalam periode acuan); kini diperbaiki. Titik matriks per kartu boleh di
  bawah kelas jenis bila kartunya punya lantai sendiri yang lebih rendah (Kartu 6.1 Pangandaran), dan ini ditulis di
  catatan.
- **I4.3 [Inferensi tim]** KERANGKA meminta "COVID-19 kelas tertinggi pada aspek kependudukan": data mendukung (161.870
  resmi, dua orde di atas ambang kelas 5; Aceh 2004 setara orde yang sama), tetapi kelas 5 adalah kelas terbuka, sehingga
  pandemi, tsunami, gempa, konflik, dan banjir berbagi kelas yang sama walau besarnya berbeda dua orde. Naskah menulis angka di samping kelas agar pembaca melihat
  bedanya. Kematian berlebih WHO (pita 1,7 kali) dan Koplitz (6,6 kali) boleh tampil di kartu karena pitanya di bawah satu
  orde, selalu berdampingan dengan angka resmi.
- **I4.4 [Inferensi tim]** Kemungkinan dan dampak tidak boleh dikalikan menjadi satu skor risiko per jenis: dasar
  kemungkinannya berbeda sifat (periode ulang, frekuensi empiris musim), dan dua belas jenis tidak punya dasar yang
  dipasangkan dengan skenario dampaknya. Aturan Weibull lantai (1 − (18/19)^5) tidak diterapkan per jenis atas seri tahunan
  2008–2025, karena aturan itu memberi 23,7% (pita 4) untuk tahun terburuk jenis apa pun secara konstruksi dan tidak
  membedakan jenis. Pita 4 banjir memakai aturan yang sama atas musim lantai nasional, sehingga dasarnya juga lemah; ia
  dipertahankan hanya karena Tabel 3.4 usulan Bab 3 menetapkannya untuk kartu musim. Bila Bab 3 menolak aturan itu, banjir
  pindah ke panel dan m = 2.
  Matriks menampilkan posisi, bukan peringkat.
- **I4.5 [Inferensi tim]** Keterpaparan KRB (T1.14) tidak dipakai sebagai kelas dampak: gempa dan kekeringan praktis
  seluruh penduduk, sehingga tidak membedakan jenis; ia ditampilkan sebagai kolom konteks di kartu, bukan posisi matriks.

### Celah

- Ambang kelas 1–5 belum dikunci di Bab 3 (Perban 2/2023 tidak memuatnya); seluruh kolom kelas di atas asumsi-kebijakan dan
  harus dihitung ulang bila ambang Bab 3 berbeda.
- Aspek ekonomi, lingkungan, infrastruktur/fisik, dan layanan sipil belum dikelaskan untuk semua jenis; kartu menulis
  "tidak dinilai" dengan alasan, bukan nol.
- Periode ulang megathrust Sumatra, Sumba, dan laju sesar darat belum dibaca dari PuSGeN 2024 Tabel 6.2 dan 6.9.
- Buku BRR 2009 diterima sebagai sumber resmi (KEPUTUSAN T14); tsunami kelas 5. Dua angka meninggal BRR (126.741 dan
  127.720) belum direkonsiliasi oleh penerbitnya; naskah menulis keduanya berdampingan.
- Korban banjir dan longsor Sumatra 2025 per jenis tidak dipisah di `dibi/kejadian_besar.csv`; pemisahan per kategori
  diusulkan sebagai turunan `pipa-data`.
- Tidak ada skenario pandemi resmi berangka; kelas pandemi dari analog COVID-19 tanpa perkalian (KERANGKA §7 butir 28).
- Korban tsunami skenario tidak dikuantifikasi sampai genangan InaRISK `Inun_*` × penduduk dipakai (KERANGKA §7 butir 3).

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Label | Catatan |
| --- | --- | --- | --- | --- | --- |
| Gambar 5.1 Indeks Risiko Bencana nasional dan per pulau, 2015–2024 | Garis nasional (2019–2024 resmi, 2015–2018 turunan, gaya garis berbeda) dan 7 garis pulau; anotasi baseline 2019 dan 2024 (128,52; −10,76%) | `irbi/irbi_tren_2015_2024.csv` [tingkat=nasional dan pulau, metode=rerata_sederhana] (T2.1, T2.2) | G2 | resmi (nasional 2019–2024); asumsi-kebijakan (lainnya) | Tanpa titik 2025 (prinsip 7); catatan Papua batas 2025 tidak sebanding Renstra |
| Gambar 5.2 Status IRBI 2025 per kab/kota | Peta 514 kab, dua kelas resmi (Tinggi, Sedang), ramp oranye T8; pil pulau berisi "kab Tinggi / kab" | `irbi/irbi_kab_2025.csv` kolom `status_total_resmi`; `irbi_agregat_pulau.csv` (T1.1, T1.2) | G19 | resmi | Catatan skala 2025 tidak sebanding 2015–2024; tanpa peringkat |
| Gambar 5.3 IRBI 2025 per bahaya, peta kecil berganda | 9 panel, 5 kelas nilai kuintil per bahaya; sel kosong "tidak dinilai" | `irbi/irbi_kab_2025.csv` kolom bahaya | G19 | resmi (nilai); asumsi-kebijakan (kelas kuintil) | Legenda kelas teratas "≥ batas" agar sama dengan syarat (a) daftar perhatian (`bab-03.md` P1) |
| Tabel 5.1 Rerata IRBI 2025 per bahaya × pulau | 7 pulau + Indonesia × 9 bahaya + total; jumlah kab bernilai per sel | `irbi/irbi_agregat_pulau.csv` [tahun=2025] kolom `*_sederhana`, `*_n_kab` (T1.6) | G16 | asumsi-kebijakan | Total bukan jumlah kolom; sel null "tidak dinilai" |
| Gambar 5.4 Kelas IRBI provinsi 2023 | Peta 38 provinsi, 13 Tinggi dan 25 Sedang | `irbi/irbi_agregat_provinsi.csv` [tahun=2023]; `irbi_hitung_kelas.csv` (T1.5) | G19 | resmi | Catatan konflik tiga terendah Renas lawan Renstra |
| Tabel 5.2 Provinsi utama menurut dua kriteria | 38 provinsi; kab daftar perhatian dan peringkat; meninggal dan hilang 2015–2025 dan peringkat | `turunan/provinsi_utama.csv`; `dibi/rekap_provinsi_tahunan.csv` sebagai angka berdampingan (T1.9, T1.20) | B5.7 | asumsi-kebijakan (aturan); resmi (korban) | Urut kode wilayah; kembar Jateng dan Jatim ditulis kembar |
| Tabel 5.3 Ringkasan daftar perhatian per bahaya | 9 bahaya: jumlah kab dasar, varian kepekaan (b ±1 tahun, a dua kelas teratas), irisan dengan kab Tinggi; baris jumlah kab unik 426 | `turunan/daftar_perhatian.csv`, `daftar_perhatian_kepekaan.csv`, `irbi/irbi_kab_2025.csv` (T1.18, T1.19) | B5.7 | asumsi-kebijakan | Rinci per kab di Lampiran A; bukan peringkat |
| Gambar 5.5 Kapasitas kab/kota KRB 2022–2026 | Peta 508 kab tiga kelas; 6 kab bukan unit KRB "tidak dinilai" | `nonalam-sosial/krb_covid19_kab.csv` kolom `kapasitas_kab` (T3.4, T3.6) | G19 | resmi | Pil Jawa 95,8% dan Papua 2,4% |
| Tabel 5.4 Kapasitas daerah: dua alat ukur | Baris: IKD (RPJMN baseline 2023, target Renstra 2025, 2026, 2029), KRB kab, KRB kecamatan, KRB provinsi; kolom alat, unit, tahun, penyebut, angka, sumber | T3.1–T3.5, T3.8 | B5.7 | resmi (baris dokumen); terverifikasi (penyebut dari siaran) | Penyebut IKS: "Renstra tidak mendefinisikan; siaran Kemenko PMK 12 Sep 2025 menyebut kab/kota" (terverifikasi, siaran pers); dasar KD-3 |
| Gambar 5.6 Matriks kemungkinan × dampak | Sumbu kemungkinan pita NRR 1–5, sumbu dampak kelas 1–5 aspek terberat; 15 jenis `tema.json`, satu titik per kartu per jenis; 3 jenis di matriks (gempa dan tsunami lewat Kartu 6.1, banjir lewat kartu musim), 12 jenis di panel "dampak dinilai, kemungkinan tidak dinilai" | I4.1; `skenario-hidromet/musim_hujan.csv`, `riset/mentah/oni_cpc.txt`, `dibi/kejadian_besar.csv`, `dibi/rekap_nasional_tahunan.csv`, `nonalam-sosial/skenario_terburuk.csv` | G17 | asumsi-kebijakan | Pil "Asumsi kebijakan"; angka di samping kelas; tidak dibuat sebelum ambang Bab 3 dikunci |
| Usulan tambahan: Tabel silang status IRBI 2025 × kapasitas KRB | 2 × 3 sel (Tinggi, Sedang × rendah, sedang, tinggi) dengan jumlah kab dan penduduk | `irbi/irbi_kab_2025.csv`, `nonalam-sosial/krb_covid19_kab.csv` (T2.10, T3.9) | B5.7 | asumsi-kebijakan | Boleh digabung ke Tabel 5.4 sebagai panel bawah |

## Angka untuk registri

Semua kunci baru ditulis lengkap di `naskah/mitigasi/bukti/bab-05.angka.json` (`data/angka.json` utama tidak disunting).
Entri berkas+jalur diuji dengan `ikuti()` dari `bangun/kontrak/naskah.py`; tidak ada kunci yang bentrok dengan registri
utama atau dengan usulan bab lain (bab-01 sampai bab-04 mitigasi, bab-01 sampai bab-08 air).

| Kunci | Nilai | Berkas + jalur atau pustaka | Label | Sumber |
| --- | --- | --- | --- | --- |
| irbi.pulau.papua.kab_tinggi.2025 | 37 kab/kota | irbi/irbi_agregat_pulau.csv [pulau_kode=PAP,tahun=2025].n_tinggi | resmi | InaRISK BNPB |
| irbi.pulau.papua.kab.2025 | 42 kab/kota | idem .n_kab | resmi | InaRISK BNPB |
| irbi.pulau.maluku.kab_tinggi.2025 | 19 kab/kota | idem [pulau_kode=MAL] .n_tinggi | resmi | InaRISK BNPB |
| irbi.pulau.maluku.kab.2025 | 21 kab/kota | idem .n_kab | resmi | InaRISK BNPB |
| irbi.pulau.sulawesi.kab_tinggi.2025 | 40 kab/kota | idem [pulau_kode=SUL] .n_tinggi | resmi | InaRISK BNPB |
| irbi.pulau.sulawesi.kab.2025 | 81 kab/kota | idem .n_kab | resmi | InaRISK BNPB |
| irbi.pulau.bnt.kab_tinggi.2025 | 21 kab/kota | idem [pulau_kode=BNT] .n_tinggi | resmi | InaRISK BNPB |
| irbi.pulau.bnt.kab.2025 | 41 kab/kota | idem .n_kab | resmi | InaRISK BNPB |
| irbi.pulau.sumatra.kab_tinggi.2025 | 50 kab/kota | idem [pulau_kode=SUM] .n_tinggi | resmi | InaRISK BNPB |
| irbi.pulau.sumatra.kab.2025 | 154 kab/kota | idem .n_kab | resmi | InaRISK BNPB |
| irbi.pulau.kalimantan.kab_tinggi.2025 | 1 kab/kota | idem [pulau_kode=KAL] .n_tinggi | resmi | InaRISK BNPB |
| irbi.pulau.kalimantan.kab.2025 | 56 kab/kota | idem .n_kab | resmi | InaRISK BNPB |
| irbi.jawa.rerata_2025 | 99,43 | irbi/irbi_agregat_pulau.csv [pulau_kode=JAW,tahun=2025].total_sederhana | asumsi-kebijakan | olah InaRISK |
| irbi.maluku.rerata_2025 | 211,74 | idem [pulau_kode=MAL] | asumsi-kebijakan | olah InaRISK |
| irbi.sumatra.persen_2019_2024 | −6,41% | irbi/irbi_tren_2015_2024.csv [tingkat=pulau,kode=SUM,metode=rerata_sederhana].persen_2019_2024 | asumsi-kebijakan | olah InaRISK |
| irbi.jawa.persen_2019_2024 | −24,90% | idem [kode=JAW] | asumsi-kebijakan | olah InaRISK |
| irbi.bnt.persen_2019_2024 | −9,95% | idem [kode=BNT] | asumsi-kebijakan | olah InaRISK |
| irbi.kalimantan.persen_2019_2024 | −11,18% | idem [kode=KAL] | asumsi-kebijakan | olah InaRISK |
| irbi.sulawesi.persen_2019_2024 | −7,55% | idem [kode=SUL] | asumsi-kebijakan | olah InaRISK |
| irbi.maluku.persen_2019_2024 | +0,21% | idem [kode=MAL] | asumsi-kebijakan | olah InaRISK |
| irbi.papua.persen_2019_2024 | +1,11% | idem [kode=PAP] | asumsi-kebijakan | olah InaRISK; batas 2025 |
| irbi.bahaya.banjir.median_2019 | 24,00 | irbi/irbi_bukti_skala_bahaya.csv [bahaya=banjir,tahun=2019].median | asumsi-kebijakan | olah InaRISK |
| irbi.bahaya.banjir.median_2024 | 20,32 | idem [tahun=2024] | asumsi-kebijakan | olah InaRISK |
| irbi.bahaya.gempabumi.median_2019 | 15,67 | idem [bahaya=gempabumi,tahun=2019] | asumsi-kebijakan | olah InaRISK |
| irbi.bahaya.gempabumi.median_2024 | 13,41 | idem [tahun=2024] | asumsi-kebijakan | olah InaRISK |
| irbi.kab.berubah_2019_2024 | 400 kab/kota | nilai; bnpb-irbi | asumsi-kebijakan | olah InaRISK |
| irbi.kab.satu_pengali_2019_2024 | 230 kab/kota | nilai; bnpb-irbi | asumsi-kebijakan | olah InaRISK |
| irbi2025.kab_tinggi.penduduk | 43.105.491 jiwa | nilai; worldpop-2025 | asumsi-kebijakan | olah InaRISK dan WorldPop |
| irbi2025.kab_tinggi.porsi_penduduk | 15,0% | nilai; worldpop-2025 | asumsi-kebijakan | olah InaRISK dan WorldPop |
| irbi_dibi.nasional.spearman.total_kejadian | −0,380 | nilai; bnpb-irbi | asumsi-kebijakan | olah InaRISK dan DIBI |
| irbi_dibi.nasional.spearman.total_meninggal_hilang | −0,044 | nilai; bnpb-irbi | asumsi-kebijakan | olah InaRISK dan DIBI |
| irbi_dibi.nasional.spearman.total_penduduk | −0,465 | nilai; bnpb-irbi | asumsi-kebijakan | olah InaRISK dan WorldPop |
| irbi_dibi.nasional.spearman.penduduk_kejadian | 0,633 | nilai; bnpb-dibi | asumsi-kebijakan | olah DIBI dan WorldPop |
| irbi_dibi.kab_tinggi.porsi_kejadian_2015_2025 | 17,9% | nilai; bnpb-dibi | asumsi-kebijakan | olah InaRISK dan DIBI |
| irbi_dibi.kab_tinggi.porsi_meninggal_hilang_2015_2025 | 24,3% | nilai; bnpb-dibi | asumsi-kebijakan | olah InaRISK dan DIBI |
| irbi_dibi.kab_tinggi.porsi_meninggal_hilang_2025 | 57,6% | nilai; bnpb-dibi | asumsi-kebijakan | olah InaRISK dan DIBI |
| dibi.pulau.jawa.porsi_kejadian_2015_2025 | 47,2% | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.pulau.jawa.porsi_meninggal_hilang_2015_2025 | 22,2% | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.pulau.sulawesi.porsi_meninggal_hilang_2015_2025 | 41,3% | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.pulau.papua.porsi_kejadian_2015_2025 | 0,8% | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.pulau.jawa.porsi_penduduk_2026 | 56,1% | nilai; worldpop-2025 | asumsi-kebijakan | olah WorldPop |
| dibi.pulau.jawa.kejadian_per100rb_2015_2025 | 12,3 per 100.000 | nilai; bnpb-dibi | asumsi-kebijakan | olah DIBI dan WorldPop |
| dibi.pulau.jawa.meninggal_hilang_per100rb_2015_2025 | 1,86 per 100.000 | nilai; bnpb-dibi | asumsi-kebijakan | olah DIBI dan WorldPop |
| dibi.pulau.sulawesi.meninggal_hilang_per100rb_2015_2025 | 26,39 per 100.000 | nilai; bnpb-dibi | asumsi-kebijakan | olah DIBI dan WorldPop |
| dibi.nasional.meninggal_hilang_per100rb_2015_2025 | 4,70 per 100.000 | nilai; bnpb-dibi | asumsi-kebijakan | olah DIBI dan WorldPop |
| irbi_dibi.kab_korban_top5.tinggi_tahun_kejadian | 3 dari 5 kab | nilai; bnpb-irbi | asumsi-kebijakan | olah InaRISK dan DIBI (ambang turunan > 144) |
| dibi.kab.palu.meninggal_hilang_2015_2025 | 4.194 jiwa | nilai; bnpb-dibi | resmi | olah DIBI (semua laporan) |
| dibi.kab.palu.porsi_2015_2025 | 32,1% | nilai; bnpb-dibi | resmi | olah DIBI (semua laporan) |
| dibi.alam.hidromet.meninggal_hilang_rerata_2015_2019 | 399,2 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.hidromet.meninggal_hilang_rerata_2020_2024 | 424,0 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.hidromet.meninggal_hilang.2025 | 1.952 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.geologi.meninggal_hilang_2015_2025 | 6.988 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.meninggal_hilang_2015_2025 | 13.056 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.jawa.meninggal_hilang_rerata_2015_2019 | 246,8 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.jawa.meninggal_hilang_rerata_2020_2024 | 274,0 jiwa | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.gempa.meninggal_hilang_maks_tahun | 5.423 jiwa (2018) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.banjir.meninggal_hilang_maks_tahun | 1.585 jiwa (2025) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.longsor.meninggal_hilang_maks_tahun | 354 jiwa (2014) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.tsunami.meninggal_hilang_maks_tahun | 503 jiwa (2010) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.gunungapi.meninggal_hilang_maks_tahun | 394 jiwa (2010) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.cuaca_ekstrem.meninggal_hilang_maks_tahun | 81 jiwa (2025) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.gelombang.meninggal_hilang_maks_tahun | 36 jiwa (2011) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.kekeringan.meninggal_hilang_maks_tahun | 6 jiwa (2023) | nilai; bnpb-dibi | resmi | olah DIBI |
| dibi.alam.karhutla.meninggal_hilang_maks_tahun | 24 jiwa (2015) | nilai; bnpb-dibi | resmi | olah DIBI |
| perhatian.mitigasi.kab_unik | 426 kab/kota | nilai; bnpb-irbi | asumsi-kebijakan | olah turunan |
| perhatian.mitigasi.pasangan | 903 pasangan | nilai; bnpb-irbi | asumsi-kebijakan | olah turunan |
| perhatian.mitigasi.irisan_tinggi | 135 kab/kota | nilai; bnpb-irbi | asumsi-kebijakan | olah turunan dan InaRISK |
| perhatian.mitigasi.tinggi_tidak_masuk | 34 kab/kota | nilai; bnpb-irbi | asumsi-kebijakan | olah turunan dan InaRISK |
| perhatian.mitigasi.prov12.n_kab | 32 kab/kota | turunan/provinsi_utama.csv [prov=12].n_kab_daftar_perhatian | asumsi-kebijakan | olah turunan |
| perhatian.mitigasi.prov11.meninggal_hilang | 794 jiwa | turunan/provinsi_utama.csv [prov=11].meninggal_hilang_2015_2025 | resmi | DIBI BNPB (dijumlah) |
| renstra.iks_kapasitas_minimal_sedang.2026 | 73% | nilai; bnpb-2025-renstra | resmi | Renstra hlm. 132 |
| krb.kec.kapasitas_minimal_sedang_persen | 42,5% | nilai; bnpb-2026-krb | resmi | olah KRB 2022–2026 |
| krb.prov.kapasitas_minimal_sedang | 31 dari 34 provinsi | nilai; bnpb-2025-renas | resmi | Renas Tabel 2.7 hlm. 25 |
| krb.prov.kapasitas_minimal_sedang_persen | 91,2% | nilai; bnpb-2025-renas | resmi | olah Renas Tabel 2.7 |
| krb.pulau.sumatra.kab_kapasitas_minimal_sedang_persen | 20,9% | nilai; bnpb-2026-krb | resmi | olah KRB 2022–2026 |
| krb.pulau.bnt.kab_kapasitas_minimal_sedang_persen | 46,3% | nilai; bnpb-2026-krb | resmi | olah KRB 2022–2026 |
| krb.pulau.kalimantan.kab_kapasitas_minimal_sedang_persen | 12,5% | nilai; bnpb-2026-krb | resmi | olah KRB 2022–2026 |
| krb.pulau.sulawesi.kab_kapasitas_minimal_sedang_persen | 23,7% | nilai; bnpb-2026-krb | resmi | olah KRB 2022–2026 |
| krb.pulau.maluku.kab_kapasitas_minimal_sedang_persen | 9,5% | nilai; bnpb-2026-krb | resmi | olah KRB 2022–2026 |
| krb.pulau.papua.kab_kapasitas_minimal_sedang_persen | 2,4% | nilai; bnpb-2026-krb | resmi | olah KRB 2022–2026 |
| krb.kab.porsi_penduduk_kapasitas_minimal_sedang | 67,0% | nilai; bnpb-2026-krb | asumsi-kebijakan | olah KRB 2022–2026 |
| krb_irbi.kab_kapasitas_rendah_tinggi | 148 kab/kota | nilai; bnpb-2026-krb | asumsi-kebijakan | olah KRB dan InaRISK |
| krb_irbi.kab_kapasitas_rendah_tinggi_penduduk | 34.538.191 jiwa | nilai; worldpop-2025 | asumsi-kebijakan | olah KRB, InaRISK, WorldPop |
| krb_irbi.persen_tinggi_kapasitas_rendah | 47,0% | nilai; bnpb-2026-krb | asumsi-kebijakan | olah KRB dan InaRISK |
| krb_irbi.persen_tinggi_kapasitas_minimal_sedang | 8,8% | nilai; bnpb-2026-krb | asumsi-kebijakan | olah KRB dan InaRISK |
| matriks.mitigasi.jenis_lingkup | 15 jenis | nilai; cabinetoffice-2025-nrr | asumsi-kebijakan | KERANGKA §5 BAB 5 dan slide B2 (`tema.json`) |
| matriks.mitigasi.kemungkinan_dinilai | 3 jenis | nilai; cabinetoffice-2025-nrr | asumsi-kebijakan | olah penyusun (Tabel 3.4 usulan) |
| matriks.mitigasi.kelas5_fatalitas | 5 jenis | nilai; cabinetoffice-2025-nrr | asumsi-kebijakan | olah penyusun |
| matriks.mitigasi.kelas5_fatalitas_atau_mengungsi | 6 jenis | nilai; cabinetoffice-2025-nrr | asumsi-kebijakan | olah penyusun |
| matriks.mitigasi.kelas5_dengan_gabungan | 7 jenis | nilai; cabinetoffice-2025-nrr | asumsi-kebijakan | olah penyusun (likuefaksi dari angka gabungan) |
| tsunami.aceh2004.meninggal_brr | 126.741 jiwa (berdampingan 127.720) | nilai; brr-2009-scattered-beads | resmi | buku BRR 2009 (KEPUTUSAN T14) |
| kemenkopmk.iks_kapasitas_penyebut | kab/kota | nilai; kemenkopmk-2025-sinkronisasi-irb | terverifikasi | siaran Kemenko PMK 12 Sep 2025 |

**Kunci lama dan usulan bab lain yang dipakai ulang (tidak diubah):** `irbi.nasional.2015`, `irbi.nasional.2019`,
`irbi.nasional.2024`, `irbi.nasional.persen_2019_2024`, `irbi.prov.tinggi.2023`, `irbi.prov.dinilai.2023`,
`perhatian.mitigasi.*.n`, `dibi.sulteng2018.meninggal`, `dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang`,
`hidromet.nasional.lantai.meninggal_hilang`, `hidromet.nasional.musim_lanina.n`, `hidromet.nasional.pasca_elnino.n_musim`,
`hidromet.nasional.musim_2025.oni`, `nonalam.covid19.meninggal`, `nonalam.covid19.kematian_berlebih`,
`nonalam.plumpang2023.meninggal`, `nonalam.tpa.terbakar_2023`, `sosial.maluku.meninggal_bawah`, `sosial.maluku.pengungsi`
(registri utama); `dibi.nasional.meninggal_hilang.2025`, `dibi.nasional.meninggal_hilang.2018`, `rpjmn.kp_kapasitas.baseline_2023`
(mitigasi bab-01); `renas.krb.terpapar_*`, `renas.krb.kerugian_*`, `krb.nasional.kab_kapasitas_dinilai`,
`rpjmn.kp_kapasitas.target_2025`, `renstra.ikd.rerata`, `renstra.ikd.jumlah_indikator` (mitigasi bab-02);
`irbi.kab.tinggi.2025`, `irbi.kab.sedang.2025`, `irbi.skala.spearman_2025`, `irbi.nasional.persen_naif_2024_2025`,
`irbi_dibi.nasional.spearman.*`, `krb.nasional.kab_kapasitas_rendah`, `_sedang`, `_tinggi`,
`krb.nasional.kapasitas_minimal_sedang_persen`, `perhatian.mitigasi.prov33.n_kab`, `perhatian.mitigasi.prov35.n_kab`,
`perhatian.mitigasi.prov72.meninggal_hilang`, `perhatian.mitigasi.prov32.meninggal_hilang`, `nrr_2025.fatalitas.*`,
`hidromet.nasional.lantai.peluang_5_musim`, `geologi.jawa_gabungan.peluang_5th`, `geologi.jawa_segmen.peluang_5th`
(mitigasi bab-03); `dibi.nasional.spearman_kejadian_meninggal.2015_2025` (mitigasi bab-04); `airjawa.jawa.irbi2025.n_tinggi`,
`enso.elnino_kuat_porsi_jendela5`, `nrr_2025.pita1_batas_persen`, `nrr_2025.pita5_batas_persen` (air bab-03);
`hidromet.jawa.banjir.krb_porsi_nasional_persen`, `hidromet.jawa.longsor.krb_porsi_nasional_persen` (air bab-02);
`renstra.iks_kapasitas_minimal_sedang.awal`, `.2029` (air bab-01); `krb.jawa.kab_kapasitas_minimal_sedang_persen`,
`kemenkopmk.daerah_belum_ikd_2024`, `kemenkopmk.daerah_belum_krb`, `kemenkopmk.daerah_belum_spm_bencana` (air bab-07).

**Catatan untuk penggabung:** (1) Entri bernilai hasil hitungan (jumlah, porsi, rerata, Spearman, irisan) ditulis sebagai
`nilai` karena registri belum bisa menjumlah atau mengorelasikan; cara hitungnya ada di `catatan`. (2) Jumlah kab Tinggi per
pulau diberi label `resmi` mengikuti `airjawa.jawa.irbi2025.n_tinggi`; registri utama memberi `irbi.sumatra.kab_tinggi.2023`
label asumsi-kebijakan karena kelas kab 2023 memakai ambang turunan, sedangkan status 2025 dibaca langsung dari API.
(3) Kunci `renstra.iks_kapasitas_minimal_sedang.awal` (67) sebaiknya diberi catatan "target 2025 (Renstra hlm. 125, 132),
bukan capaian" saat digabung (§0.1 butir 1).

## Pustaka

Entri CSL-JSON di `naskah/mitigasi/bukti/bab-05.pustaka.json`: 22 sumber berbeda. Sembilan sama dengan pustaka utama atau
bab saudara (`bnpb-2025-renas`, `bnpb-2025-renstra`, `bnpb-irbi`, `bnpb-dibi`, `worldpop-2025`, `bnpb-2026-krb`,
`ri-2025-perpres12-rpjmn`, `bnpb-2023-renkon`, `bnpb-2012-pengkajian-risiko`), lima dari riset E dan bab air
(`kemenkopmk-2025-sinkronisasi-irb`, `pusgen-2024-peta-gempa`, `noaa-2026-oni`, `cabinetoffice-2025-nrr`,
`koplitz-2016-haze`), dua dari paket `nonalam-sosial` (`who-2023-kematian-berlebih`, `icg-2002-maluku`), dua baru
(`bnpb-2012-kapasitas-daerah`, `cabinetoffice-2026-nrr-panduan`), empat disalin dari `bab-04.pustaka.json` saat
perbaikan temuan pemeriksa (`brr-2009-nias`, `brr-2009-scattered-beads`, `usgs-usp000ensm`, `usgs-usp000ej1c`).

- Peraturan dan rencana: `bnpb-2025-renas`, `bnpb-2025-renstra`, `ri-2025-perpres12-rpjmn`, `bnpb-2023-renkon`,
  `bnpb-2012-pengkajian-risiko`, `bnpb-2012-kapasitas-daerah` (metadata; teks tidak tersedia).
- Data resmi: `bnpb-irbi`, `bnpb-dibi`, `bnpb-2026-krb`, `noaa-2026-oni`.
- Data dan dokumen pendukung: `worldpop-2025` (terverifikasi), `pusgen-2024-peta-gempa`, `kemenkopmk-2025-sinkronisasi-irb`
  (terverifikasi, siaran pers).
- Rujukan metode: `cabinetoffice-2025-nrr`, `cabinetoffice-2026-nrr-panduan` (terverifikasi).
- Analog dan pembanding: `brr-2009-nias`, `brr-2009-scattered-beads` (resmi menurut KEPUTUSAN T14), `usgs-usp000ensm`,
  `usgs-usp000ej1c` (terverifikasi), `who-2023-kematian-berlebih` (estimasi model), `koplitz-2016-haze` (estimasi model
  peneliti), `icg-2002-maluku` (terverifikasi).

## Catatan perbaikan atas temuan pemeriksa (24 Oktober 2026)

Dua belas temuan dicek ke paket data, korpus, dan sumber web sebelum diubah. Semua diterima; tiga diterima dengan koreksi
angka atau cakupan.

1. **Status IRBI 2025 sesudah kejadian (tinggi):** diterima. Dicek di `irbi/irbi_kab_2015_2025.csv`: nilai dan kelas
   per tahun cocok dengan temuan (Palu 162,70 pada 2017–2020; Cianjur Tinggi 2015–2024; Pandeglang 215,2 pada 2018;
   Lombok Utara 120,62 dan Sigi 52,16 pada 2018). Tahun korban terbesar tiap kab dicek di paket DIBI per kab. T1.10, I1.3,
   Inti PK1 diubah; klaim "tidak dapat diuji" dihapus; Renas hlm. 19 (Sigi terendah 2023) dicek di korpus dan dirujuk.
   Tambahan dari pengecekan: siaran Kemenko PMK menulis perhitungan IRBI 2025 rampung Desember 2025 (T1.11).
2. **Standar ganda tsunami (tinggi):** diterima. KEPUTUSAN T14 sudah menerima buku BRR sebagai sumber resmi, jadi status
   "menunggu keputusan" keliru sejak awal. Tsunami kelas 5. Koreksi atas temuan: 126.741 dan 127.720 sama-sama berasal dari
   buku BRR (hlm. x dan infografik *The Scattered Beads*; *Nias* hlm. xiii, catatan `bab-04.pustaka.json`), bukan satu dari
   BRR dan satu dari CNN; keduanya ditulis berdampingan.
3. **Kemungkinan dan dampak dari skenario berbeda (tinggi):** diterima dan diterapkan juga ke kekeringan dan karhutla
   (El Niño kuat adalah peluang fase yang sama sifatnya dengan La Niña). Koreksi kecil: musim La Niña terbesar adalah
   2010/11 (599), bukan 2020/21 (537); kesimpulan tetap. Halaman panduan NRR dibaca ulang: definisi ada di hlm. 7 nomor
   cetak (sebelumnya ditulis hlm. 6), dan frasa "skenario yang sama" tidak tertulis harfiah; prinsipnya tersirat dari
   definisi kemungkinan dan RWCS. m turun dari 7 ke 3.
4. **n = 13 lawan 15 (tinggi):** diterima; `tema.json` `kosakata.jenis_bencana` memuat 15 jenis. Likuefaksi dan rob
   ditambahkan. Analog rob `demak2024` berkategori Banjir di DIBI; ini ditulis sebagai keterbatasan.
5. **Jawa per kapita (sedang):** diterima; 56,1% penduduk dihitung ulang dari `irbi_kab_2025.csv`. T1.8a baru memuat porsi
   penduduk dan angka per 100.000.
6. **Kepastian mekanisme PK2 (sedang):** diterima; Inti dan §0.1 butir 5 diturunkan ke inferensi.
7. **Sembilan bahaya bukan sembilan bukti (sedang):** diterima dengan koreksi angka. Hitungan ulang 2019 ke 2024: 400 kab
   berubah (cocok), tetapi kab dengan satu rasio identik di semua kolom 230, bukan 240 (235 pada toleransi 1%; aturan
   pemeriksa tidak tertulis). Kunci `irbi.bahaya.n_turun_2019_2024` diganti `irbi.kab.berubah_2019_2024` dan
   `irbi.kab.satu_pengali_2019_2024`.
8. **Perka 3/2012 (sedang):** diterima; label resmi hanya untuk metadata status, kaitan dengan IKD bertanda [Inferensi tim].
9. **Penyebut kab/kota di siaran Kemenko PMK (sedang):** diterima; kalimat dibuka ulang dan dikutip; label diturunkan ke
   terverifikasi; atribusi "BNPB menyebut" diganti.
10. **Sumatra 2025 tercampur longsor (sedang):** diterima; dasar kelas banjir kini banjir saja 2025 (1.585 meninggal dan
    hilang; 1.126.773 mengungsi), Sumatra 2025 berlabel resmi (olah; jendela dan kategori dipilih penyusun). Catatan
    jendela ditambahkan untuk Sulawesi Tengah 2018 dan Mentawai 2010.
11. **Aceh kembar Sulawesi Selatan (sedang):** diterima; dicek di `turunan/provinsi_utama.csv` (keduanya 22 kab).
12. **Label Koplitz dan T2.9 (sedang):** diterima. Koplitz kini estimasi-model; `bab-04.md` butir 20 sudah memakai
    estimasi-model, jadi untuk Koplitz tidak ada selisih yang perlu dilaporkan. Untuk Spearman 0,22, `bab-04.angka.json`
    memberi label resmi, sedangkan bab ini memakai asumsi-kebijakan; selisih ini dilaporkan ke pemilik kunci bab-04.
