---
kajian: air
bab: 3
judul: METODOLOGI DAN DATA
jenis: berkas bukti
status: draf bukti
disusun: 23 Oktober 2026
diperbaiki: 24 Oktober 2026 (8 temuan pemeriksa; rincian di bagian akhir "Catatan pemeriksaan temuan")
dasar: KERANGKA.md §2, §4 Bab 3, §6, §7, §8; KEPUTUSAN.md; PEDOMAN-DESAIN.md §C9; Buku Pegangan L56–L64
---

# BAB 3 METODOLOGI DAN DATA: berkas bukti

Berkas ini bahan penulis Bab 3 Kajian 1 (*Grand Design Ketahanan Air Pulau Jawa 2026–2030*). Penulis bab hanya menulis
dari berkas ini dan dari registri angka (`data/angka.json`, ditambah usulan `bab-03.angka.json` setelah digabung sesi
induk). Kalimat faktual yang tidak ada di sini dipindah ke Celah atau dihapus (PEDOMAN §C9).

**Konvensi.**

- Jalur berkas relatif ke `data/kajian-bnpb/`. Kunci registri ditulis dengan awalan `kunci:`.
- Label keyakinan: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan` (KERANGKA §2 butir 6; NASKAH-SPEK
  §9). Label paket `olah(x)` ditulis sebagai label x ditambah "turunan". Label paket `sekunder` artinya sumber primer
  belum dibuka; angka sekunder tidak boleh menjadi angka utama dan hanya tampil sebagai pembanding di tabel
  rekonsiliasi. Label "penilaian pakar" tidak dipakai di bab ini.
- Butir bertanda **[dihitung penyusun bukti]** dihitung pada 23 Okt 2026 dari berkas paket yang disebut, dengan cara
  hitung tertulis. Hitungan itu belum ada di skrip bangun paket; sebelum naskah final, pemilik paket (`pipa-data`)
  perlu memindahkannya ke `bangun/` supaya bisa diulang.
- Bagian "Inferensi" adalah analisis tim penyusun, bukan fakta sumber, dan tidak boleh ditulis di naskah dengan suara
  sumber.

---

## 0. Kontrak bab (dari KERANGKA §4, BAB 3)

**Judul:** BAB 3 METODOLOGI DAN DATA (9 hlm).

**Subbab:** 3.1 Kerangka Analisis; 3.2 Unit Analisis dan Resolusi Data per Komponen; 3.3 Sumber, Produsen Data, dan
Label Keyakinan; 3.4 IRBI dan DIBI Dibaca Berdampingan; 3.5 Aturan Daftar Perhatian Kab/Kota; 3.6 Skenario Terburuk
yang Masuk Akal; 3.7 Kerugian Materiil dan Imateriil; 3.8 Analisis Kepekaan; 3.9 Rekonsiliasi Angka; 3.10
Keterbatasan dan Indikator yang Belum Dapat Ditarget.

**Tujuan bab:** membuat setiap angka dan setiap daftar kab/kota dapat diperiksa ulang oleh BPBD dan K/L.

**Pertanyaan kunci dan subbab yang dijawabnya:**

| No | Pertanyaan kunci | Subbab |
| --- | --- | --- |
| P1 | Komponen dan indikator mana yang tersedia per kab/kota, provinsi, BBWS, titik, atau tidak ada? | 3.1, 3.2, 3.3, 3.10 |
| P2 | Bagaimana kab/kota masuk daftar perhatian tanpa memeringkat IRBI dan tanpa indeks buatan sendiri? | 3.4, 3.5 |
| P3 | Bagaimana skenario terburuk, lantai, kemungkinan, dan skala dampak didefinisikan? | 3.6, 3.7, 3.8 |
| P4 | Angka mana yang berbeda versi, dan versi mana yang dipakai? | 3.9, 3.10 |

**Aturan daftar perhatian (ditulis di 3.5, kutipan KERANGKA):** kab/kota masuk daftar perhatian bahaya X bila memenuhi
paling sedikit dua dari: (a) nilai IRBI 2025 bahaya X di kelas nilai teratas dari 5 kelas G19 untuk 119 kab Jawa (nilai
kembar di batas ikut); (b) kejadian DIBI bahaya X tercatat pada ≥ 3 dari 11 tahun 2015–2025 (`n_baris`); (c) meninggal
dan hilang atau mengungsi DIBI 2015–2025 di kuartil atas Jawa; (d, komponen air) kondisi struktural terverifikasi:
kota dengan laju penurunan muka tanah terverifikasi, CAT rusak menurut rilis primer Badan Geologi, atau daerah irigasi
kewenangan pusat; (e, bila data diperoleh) status siaga atau tanggap darurat berulang (SK kepala daerah). Uji kepekaan:
jumlah kab yang berubah bila ambang (b) digeser ±1 tahun dan (a) digeser satu kelas. Label Asumsi kebijakan.

**Temuan kunci yang diharapkan KERANGKA, hasil cek ke data 23 Okt 2026:**

| Butir KERANGKA | Hasil cek | Status |
| --- | --- | --- |
| Irigasi per kab dari OCR Permen PUPR 14/2015, baseline 2015; 96 dari 175 subtotal cocok penuh | `air-jawa/air-jawa.json` `meta.irigasi.subtotal_lampiran3_cocok_baris_di` = 96/175 | cocok |
| Air minum per kab hanya Jawa Tengah (35 kab) | `air-jawa/air_minum.csv`: 35 baris tingkat kab | cocok |
| 37 bendungan (18 resmi BBWS Pemali-Juana, 19 sekunder) | `air-jawa/bendungan.csv` `label_kapasitas`: 18 resmi, 18 sekunder, 1 olah(sekunder) | cocok |
| Penurunan muka tanah per kota, 27 baris, tidak sebanding | `air-jawa/subsiden_kota.csv`: 27 baris (18 terverifikasi, 9 sekunder) | cocok |
| Air tanah per kab tidak ada; IPA per WS tidak ada; kab ke WS resmi hanya kategori C | `air-jawa/README.md` §3, §6 | cocok |
| IRBI 2025 kekeringan Jawa 15 nilai unik, median 10; 118 Sedang, 1 Tinggi | dihitung dari `air-jawa/kab_jawa.csv`; `irbi/irbi_agregat_pulau.csv` | cocok |
| Spearman IRBI 2025 lawan kejadian DIBI: 0,18; 0,19; 0,20; IRBI longsor kosong 23 kab, 15 berkejadian | dihitung: 0,178; 0,187; 0,199; 23 dan 15 | cocok |
| DIBI kekeringan Jawa 2015: 5 kejadian di 3 kab; 2018: 90 kejadian, 4.924.057 terdampak | dihitung dari `air-jawa/dibi_kab_tahun.csv` | cocok |
| Rekonsiliasi Jatiluhur, Cirata, Pekalongan, DI Jatiluhur Bekasi, NCICD, penduduk, peringatan dini | lihat P4 | cocok; NCICD versi DSDA dibuka ulang |

**Komponen yang direncanakan:** Tabel 3.1 sampai 3.8 dan Gambar 3.1 (rinci di bagian Komponen).

**Status data menurut KERANGKA:** ada; celah dicatat di KERANGKA §7 (Pola/RPSDA, air tanah, debit sungai Jawa: 0 titik
GloFAS).

---

## P1. Komponen dan indikator mana yang tersedia per kab/kota, provinsi, BBWS, titik, atau tidak ada?

### Inti

Untuk ke-119 kab/kota Jawa, yang tersedia seragam per kab hanya data kejadian (DIBI), risiko (IRBI dan KRB), penduduk
KRB, dan luas daerah irigasi berbaseline 2015. Air minum per kab hanya ada untuk 35 kab Jawa Tengah, bendungan berupa
37 titik yang bukan inventaris lengkap, penurunan muka tanah per kota dari literatur, sedangkan air tanah per kab, debit
sungai, neraca dan indeks pemakaian air per wilayah sungai, serta batas wilayah sungai vektor tidak ada. Analisis kab/kota
di Bab 4–6 karena itu bertumpu pada data kejadian dan risiko; komponen air struktural tampil pada tingkat yang datanya
ada dan sisanya ditulis sebagai permintaan data.

### Temuan bersumber

**Komponen 1: air baku dan air minum**

- Akses air minum layak 2025 tersedia per kab hanya untuk 35 kab/kota Jawa Tengah (BPS Jawa Tengah, tabel diperbarui
  14 April 2026); lima provinsi lain hanya tingkat provinsi. Sumber: `air-jawa/air_minum.csv` (35 baris
  `tingkat=kab`); `air-jawa/air-jawa.json` `meta.air_minum.kab_jateng_layak_2025`; `kunci: airjawa.air_minum.n_kab_jateng`.
  [resmi]
- "Layak" tidak sama dengan "aman" dan tidak sama dengan "perpipaan"; leding (Susenas) tidak sama dengan cakupan
  perpipaan PU. Tabel sumber air minum leding 2023 per provinsi tidak sejajar (11 judul kolom, 8 nilai per baris); kolom
  leding ditetapkan dari pembanding Kompas 13 Feb 2024 yang mengutip BPS. Sumber: `air-jawa/README.md` §3 baris
  `air_minum.csv`. [resmi; penetapan kolom memakai pembanding sekunder]
- Perpipaan versi PU dan Perpamsi (30,15% lawan 19,47%) tidak dimasukkan paket karena sekunder dan bertentangan.
  Sumber: `air-jawa/README.md` §6; `riset/B-air-jawa.md` §5.1. [sekunder; tidak dipakai]

**Komponen 2: irigasi**

- Luas daerah irigasi (DI) per kab × kewenangan (pusat, provinsi, kab/kota) × jenis (permukaan, air tanah, pompa, rawa,
  tambak) diatribusi dari OCR Lampiran I–III Permen PUPR 14/PRT/M/2015 (Berita Negara 2015 No. 638). Total Jawa
  3.135.123 ha; per jenis (rekap): permukaan 3.001.332, air tanah 74.432, tambak 50.301, pompa 7.503, rawa 1.556 ha. DI
  kewenangan pusat 94, provinsi 457. Sumber: `air-jawa/air-jawa.json` `meta.irigasi`; `kunci: airjawa.irigasi.jawa_total_ha`
  (BAB 1). [resmi; luas per kab turunan]
- Baru 96 dari 175 subtotal Lampiran III yang cocok penuh dengan jumlah baris DI di bawahnya; subtotal tetap dipakai
  karena lolos cek rekap resmi. Luas tak teratribusi ke kab: neto −3 ha, bruto 7 ha. Sumber: `air-jawa/README.md` §5
  butir 5–6; `kunci: airjawa.irigasi.n_subtotal_cocok`, `kunci: airjawa.irigasi.n_subtotal_kab`. [resmi; turunan]
- Ada 73 kab yang memuat DI kewenangan pusat (`irigasi_pusat_ha` > 0). Sumber: `air-jawa/kab_jawa.csv`
  [dihitung penyusun bukti]. [resmi; turunan]
- Angka ini baseline 2015; pemutakhiran Permen 14/2015 tidak ditemukan. Kondisi jaringan per provinsi Jawa tidak
  ditemukan; yang ada hanya angka nasional 46% sistem irigasi berkondisi buruk (de Jong, Bank Dunia 2022, dikutip riset
  B). Sumber: `riset/B-air-jawa.md` §4.1–4.2. [resmi untuk baseline; angka kondisi nasional terverifikasi]

**Komponen 3: waduk dan bendungan**

- Paket memuat 37 bendungan/waduk: 18 dari inventaris BBWS Pemali-Juana status Juli 2021 (resmi), 18 dari riset B
  (sekunder), dan Kuningan sebagai turunan dari angka sekunder. Paket menyatakan ini **bukan inventaris lengkap**.
  Sumber: `air-jawa/bendungan.csv` kolom `label_kapasitas`; `kunci: airjawa.bendungan.n_paket`,
  `kunci: airjawa.bendungan.n_resmi_pj2021`. [resmi dan sekunder per baris]
- Sembilan titik bendungan adalah titik peraga di pusat kab, bukan lokasi bendungan (`koordinat_cek`). Kapasitas
  andal Selorejo, Tukul, Sadawarna, Gongseng, dan Lesti tidak ditemukan. Data sedimentasi hanya untuk bendungan BBWS
  Pemali-Juana. Sumber: `air-jawa/bendungan.csv`; `air-jawa/air-jawa.json` `meta.bendungan.tidak_ditemukan`. [resmi]

**Komponen 4: air tanah**

- Air tanah per kab tidak ada. Status tujuh CAT rusak atau rusak berat (Jakarta, Karawang-Bekasi, Serang-Tangerang,
  Bogor, Bandung-Soreang, Pekalongan-Pemalang, Semarang) hanya dari pernyataan pejabat Badan Geologi November 2023
  yang dikutip media. Peta zona konservasi air tanah resmi tidak ditemukan terbuka. Sumber:
  `air-jawa/cat_air_tanah_rusak.csv`; `riset/B-air-jawa.md` §6.2. [sekunder]
- Potensi cekungan air tanah Jawa: 80 CAT, 41.334 juta m³ per tahun, dari data KLH 2008 yang dikutip BPS (2020),
  tingkat pulau. Sumber: `air-jawa/neraca_jawa.csv`; `kunci: airjawa.jawa.cat_jumlah`. [resmi]

**Komponen 5: penurunan muka tanah (termasuk pesisir utara)**

- `air-jawa/subsiden_kota.csv` memuat 27 baris laju per kota per sumber: 18 terverifikasi (abstrak jurnal dibuka), 9
  sekunder; periode, metode, dan besaran (vertikal atau garis pandang satelit, rentang atau maksimum) tidak sebanding
  antarbaris. Paket melarang menurunkan angka kota ke kab lain. Sumber: `air-jawa/README.md` §3 baris
  `subsiden_kota.csv`. [terverifikasi dan sekunder per baris]
- Tujuh kab punya laju terverifikasi yang menyebut kab itu (maksimum baris terverifikasi, cm per tahun). Ketujuh angka
  tidak sebanding satu sama lain, jadi bila disajikan sebagai daftar wajib berkolom besaran dan periode:

  | Kab/kota | Laju maks | Besaran | Periode | Catatan wajib |
  | --- | ---: | --- | --- | --- |
  | Kab. Bandung (3204) | 22,3 | vertikal, maksimum | Sentinel-1, tahun tak disebut | pasangan angka dan kab mengikuti urutan penulisan sumber ("0,223 dan 0,22 m/th"), bukan pernyataan eksplisit |
  | Kab. Bandung Barat (3217) | 22,0 | vertikal, maksimum | idem | idem |
  | Kota Semarang (3374) | 19 | vertikal, maksimum lokal | 1999–2011 (GPS 2008–2011) | rata-rata ruang 6–7 |
  | Kota Pekalongan (3375) | 19 | vertikal, rentang 10–19 | 2014–2022 | |
  | Kab. Demak (3321) | 12 | vertikal, maksimum | 2015–2022 | angka wilayah gabungan "Semarang utara-timur dan Demak" (Aditiya dan Ito 2023); tidak boleh dibaca sebagai laju Demak sendiri |
  | Kab. Kendal (3324) | 5 | vertikal | 2015–2022 | |
  | Kota Surabaya (3578) | 4,5 | garis pandang satelit (LOS), bukan vertikal | Mei 2015–Sep 2017 | laju vertikal bisa lebih besar; tidak sejajar dengan enam baris lain |

  Baris Harintaka dkk. (2024), berlabel terverifikasi, menyebut Jakarta Utara (3172) dan Cikarang di Kab. Bekasi (3216)
  sebagai penurunan terbesar, tetapi tanpa angka laju; kedua kab itu karena itu tidak memenuhi syarat "laju" dan tidak
  masuk tujuh kab di atas. Baris Jakarta lain tidak menyebut kota administrasi. Sumber: `air-jawa/kab_jawa.csv` kolom
  `subsiden_maks_cm_th_terverifikasi`; `air-jawa/subsiden_kota.csv` kolom `wilayah_literatur`, `kab_kode_disebut`,
  `besaran`, `periode` [dihitung penyusun bukti]. [terverifikasi]
- Platform belum mengukur penurunan muka tanah sendiri (LiCSBAS belum dijalankan); data GNSS Susilo dkk. (2023) belum
  ditarik. Sumber: `air-jawa/README.md` §6; `riset/D-inventaris-platform.md` §3; KERANGKA §8. [resmi untuk status]

**Unit wilayah: wilayah sungai dan BBWS**

- Jawa memuat 24 WS (Permen PUPR 04/PRT/M/2015 Lampiran I): 6 kategori A2, 4 A3, 11 B, 3 C. Tautan kab ke WS yang
  resmi hanya untuk kategori C (3 tautan, menyebut 2 kab); 777 tautan lain adalah kandidat menurut provinsi
  (asumsi-kebijakan); 15 tautan BBWS ke DI kewenangan pusat di 14 kab bukan keanggotaan WS. Batas WS di peta Lampiran V
  belum tersedia sebagai data vektor. Sumber: `air-jawa/ws.csv`, `air-jawa/ws_kab.csv`; `air-jawa/README.md` §3, §6
  [cacah dihitung penyusun bukti]. [resmi untuk WS dan kategori C; asumsi-kebijakan untuk kandidat]
- Indeks pemakaian air per WS tidak ditemukan. Yang ada hanya per pulau 2010: Jawa 54% (kritis sedang), atau 42% tanpa
  aliran pemeliharaan, keluaran model hujan-limpasan Radhika dkk. (2013) yang dikutip BPS (2020). Sumber:
  `air-jawa/ipa_pulau_2010.csv`; `kunci: airjawa.jawa.ipa_2010_persen` (BAB 1). [estimasi-model]

**Data kejadian, risiko, dan iklim**

- DIBI per kab × tahun 2008–2026 × kelompok × `is_bencana`, 119 kab, ditarik 23 Okt 2026 pukul 15.23 WIB dari
  `pdsi_staging.mv_dibi_dampak_by_kejadian`. Sumber: `air-jawa/dibi_kab_tahun.csv`; `air-jawa/air-jawa.json`
  `meta.dibi`. [resmi]
- IRBI per kab per bahaya 2015–2025 (InaRISK `apiv4/data-irbi-full`). Sel kosong 2025: abrasi 58 kab, longsor 23 kab,
  banjir 1 kab (Kep. Seribu); kosong berarti tidak dinilai, bukan nol. Sumber: `air-jawa/irbi_kab_2015_2025.csv`;
  `air-jawa/air-jawa.json` `meta.irbi.kosong_2025`. [resmi]
- KRB 2022–2026 per kab per bahaya (InaRISK `apiv4/kajian-summary`), termasuk penduduk terpapar dan potensi kerugian.
  Sumber: `skenario-hidromet/paparan_kab.csv`; `skenario-hidromet/README.md` bagian Paparan. [resmi]
- Debit sungai: 0 dari 192 titik GloFAS platform berada di Jawa. Luas genangan rob tidak ada; model rob platform
  bertentangan dengan peringatan BMKG. Sumber: `riset/D-inventaris-platform.md` §0 butir 5 dan §3. [resmi untuk status
  data platform]
- Awal musim per zona musim (ZOM) BMKG belum ditumpangkan ke kab/kota. Sumber: KERANGKA §7 butir 35. [status]

**Penduduk sebagai penyebut**

- Penduduk KRB InaRISK: Jawa 152.402.534, nasional 271.680.290 jiwa; tahun basis penduduk tidak tertulis di API.
  Sumber: `nonalam-sosial/krb_covid19_wilayah.csv`; `kunci: airjawa.jawa.penduduk_krb`, `kunci: airjawa.nasional.penduduk_krb`
  (BAB 1). [resmi]
- WorldPop R2025A 2026: Jawa 160.830.619 jiwa; meleset di Kep. Seribu (5.689, 19% dari KRB 29.418) dan Kota Yogyakarta
  (174.017, 42% dari KRB 415.382). Penduduk BPS per kab gagal ditarik (tabel BPS kosong saat dirender). Sumber:
  `air-jawa/README.md` §6; `air-jawa/kab_jawa.csv` kolom `catatan_penduduk`; `kunci: airjawa.kab3101.*`,
  `kunci: airjawa.kab3471.*`. [estimasi-model untuk WorldPop; resmi untuk KRB]

**Produsen data dan label (3.3)**

- "Data Bencana adalah Data mengenai Bencana yang sesuai kriteria yang ditetapkan oleh walidata bencana" (Perban BNPB
  1/2023 tentang Satu Data Bencana, Pasal 1 angka 3); Produsen Data Bencana adalah unit kerja di lingkungan BNPB yang
  menghasilkan data berdasarkan tugas dan kewenangannya (Pasal 1 angka 6). Sumber: korpus
  `data/raw/hukum/teks/perban-nomor-1-tahun-2023.json` hlm. 2; pustaka `bnpb-2023-satudata`. [resmi]
- KERANGKA §2 butir 19: keluaran simulasi platform Pantau Bencana bukan Data Bencana menurut Perban 1/2023, sehingga
  tiap gambar dan tabel model memuat pernyataan produsen di samping label Estimasi model; lampiran data per kab/kota
  diusulkan diserahkan ke Pusat Data, Informasi, dan Komunikasi Kebencanaan sebagai walidata. [asumsi-kebijakan, posisi
  kajian]
- Audit metode platform 21 Okt 2026: 329 metode, 14 layak, 150 layak dengan catatan, 165 tidak layak; IRBI divonis
  layak tetapi tidak untuk memeringkat. Sumber: `riset/D-inventaris-platform.md` pembuka dan §2; `irbi/README.md` §6.
  [resmi untuk vonis internal; dokumen audit tidak dibuka penyusun bukti]
- Paket memakai empat kode keyakinan ditambah `sekunder` dan `olah(x)`; label per kolom ada di
  `air-jawa/air-jawa.json` `meta.label_kolom` dan `air-jawa/README.md` §1, §4. [resmi untuk konvensi]

### Inferensi

- *Penilaian tim:* dari lima komponen air, hanya irigasi yang lengkap per kab, dan itu pun luas berbaseline 2015, bukan
  kondisi jaringan atau defisit air. Karena itu irigasi layak menjadi penanda struktural (syarat d), tetapi tidak
  menjawab di mana air kurang.
- *Penilaian tim:* rancangan Tabel 3.1 (matriks resolusi data) dari temuan di atas:

  | Komponen | Kab/kota | Provinsi | BBWS/WS | Titik/kota | Tidak ada | Label | Pemegang data |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Air minum layak | 35 kab Jateng | 6 provinsi | – | – | kab di 5 provinsi | resmi | BPS provinsi |
  | Irigasi (luas DI) | 119 kab (2015) | 6 provinsi | DI pusat per BBWS | – | kondisi jaringan | resmi; turunan | Kementerian PU |
  | Waduk dan bendungan | – | – | BBWS Pemali-Juana lengkap | 37 titik | inventaris lengkap | resmi dan sekunder | BBWS, PJT I, PJT II |
  | Air tanah | – | – | – | 7 CAT (sekunder) | per kab, zona konservasi | sekunder | Kementerian ESDM (Badan Geologi) |
  | Penurunan muka tanah | 7 kab tertaut | – | – | 27 baris kota | pengukuran sendiri | terverifikasi | literatur; data GNSS |
  | Neraca dan IPA | – | – | – | pulau 2010 | per WS | estimasi-model | Kementerian PU |
  | Kejadian (DIBI) | 119 kab | 6 provinsi | – | – | – | resmi | Pusdatinkom BNPB |
  | Risiko (IRBI, KRB) | 119 kab | 6 provinsi | – | – | kelas per bahaya | resmi | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
  | Debit sungai | – | – | – | 0 titik GloFAS | seluruhnya | – | Kementerian PU |
  | Genangan rob | kab berkejadian (DIBI) | – | – | titik peringatan BMKG | luas | resmi | BMKG |

- *Penilaian tim:* rekomendasi per wilayah sungai harus diturunkan ke BBWS dan DI kewenangan pusat (KERANGKA §2 butir 8)
  karena tautan kab ke WS hanya resmi untuk 2 kab.
- *Penilaian tim:* penyebut penduduk resmi adalah penduduk KRB; WorldPop hanya untuk sebaran di dalam kab. Di Kota
  Yogyakarta dan Kep. Seribu, angka per jiwa berbasis WorldPop akan menggelembung 2 sampai 5 kali.

### Celah

| Yang dicari | Status | Penyajian tanpa mengarang | Pemegang data |
| --- | --- | --- | --- |
| Air minum layak per kab di DKI, Jabar, DIY, Jatim, Banten | tabel BPS provinsi tidak termuat lewat peramban otomatis | tingkat provinsi berlabel; per kab ditulis permintaan data | BPS provinsi |
| Kondisi jaringan irigasi per DI dan pemutakhiran status DI pasca-2015 | tidak ditemukan | baseline 2015 berlabel; permintaan e-PAKSI | Kementerian PU (Ditjen SDA) |
| Inventaris bendungan lengkap, sedimentasi di luar BBWS Pemali-Juana | tidak ditemukan | titik berpita; baris sekunder terpisah | BBWS; PJT I; PJT II |
| Air tanah per kab, zona konservasi CAT, rilis primer status CAT | tidak ditemukan terbuka | celah dan permintaan data; CAT rusak tidak dipakai sebagai syarat daftar perhatian (KERANGKA §8) | Kementerian ESDM (Badan Geologi) |
| Laju penurunan muka tanah terukur (GNSS, InSAR) per kab | belum ditarik atau dijalankan | "kota tanpa titik = belum diukur" | data GNSS Susilo dkk. (2023); keputusan pemilik untuk LiCSBAS |
| Neraca dan IPA per WS, Pola dan Rencana PSDA, batas WS vektor | tidak ditemukan | IPA per pulau sebagai konteks; Pola/RPSDA wajib dibuka (KERANGKA §8) | Kementerian PU |
| Debit sungai Jawa | 0 titik | celah dan permintaan data | Kementerian PU (BBWS) |
| Luas genangan rob | tidak ada | "tidak dikuantifikasi"; kab berkejadian rob DIBI | BMKG; BIG |
| Penduduk BPS per kab | gagal ditarik | penyebut KRB | BPS |
| Awal musim per ZOM ke kab | belum diolah | tingkat provinsi bila gagal | BMKG |
| Distribusi air kemarau, status darurat (SK), desa terdampak | tidak ada di DIBI | permintaan data masuk keputusan 14 hari (KERANGKA §6 butir 3) | BPBD; Pusdalops; Pusdatinkom |
| Puso per kab, kalender tanam | belum ditarik | permintaan data | Kementan; BPS |

---

## P2. Bagaimana kab/kota masuk daftar perhatian tanpa memeringkat IRBI dan tanpa indeks buatan sendiri?

### Inti

Kab/kota masuk daftar perhatian per bahaya bila memenuhi paling sedikit dua dari lima syarat yang masing-masing
bersumber resmi (kelas nilai IRBI teratas, frekuensi kejadian DIBI, korban DIBI kuartil atas, kondisi struktural
terverifikasi, status darurat berulang), tanpa menjumlah skor dan tanpa urutan peringkat; IRBI dan DIBI dibaca
berdampingan karena korelasinya lemah (Spearman 0,18 sampai 0,20). Uji aturan pada data menunjukkan teks KERANGKA belum
cukup rinci: jumlah kab di daftar banjir bergeser dari 27 sampai 97 menurut cara batas kelas, ambang frekuensi, dan
pemetaan syarat struktural, sehingga subbab 3.5 wajib mengunci empat pilihan sebelum daftar Bab 5–6 diisi.

### Temuan bersumber

**Mengapa IRBI tidak dipakai memeringkat**

- IRBI tidak boleh dipakai memeringkat kab karena banyak nilai kembar dan skala 2025 bilangan bulat. Sumber:
  `air-jawa/README.md` §6; `irbi/README.md` §6 (audit metode 21 Okt 2026). [resmi untuk data; vonis audit internal]
- IRBI 2025 Jawa per bahaya: kekeringan 15 nilai unik (5 sampai 19) untuk 119 kab, median 10; banjir 19 nilai unik (118
  kab bernilai); longsor 17 nilai unik (96 kab bernilai). Sumber: `air-jawa/kab_jawa.csv` kolom `irbi2025_*`
  [dihitung penyusun bukti]; `kunci: airjawa.jawa.irbi2025.kekeringan_nilai_unik`, `kunci: airjawa.jawa.irbi2025.kekeringan_median`.
  [resmi]
- Status total IRBI 2025 Jawa: 118 Sedang, 1 Tinggi (Kab. Sukabumi); status total hampir tidak membedakan kab. Sumber:
  `irbi/irbi_agregat_pulau.csv` baris `JAW`, 2025; `irbi/README.md` §6; `kunci: airjawa.jawa.irbi2025.n_tinggi`. [resmi]
- Kelas per bahaya tidak ada di sumber yang dibuka; kolom `status` adalah kelas total semua bahaya. Sumber:
  `irbi/README.md` §3 butir Kelas. [resmi]
- IRBI 2025 tidak boleh dibandingkan dengan 2015–2024: nilai per bahaya 2025 semuanya bilangan bulat; `total` sama dengan
  jumlah kolom bahaya pada 0% kab 2025 (58% pada 2015); Spearman peringkat kab 2024 ke 2025 hanya 0,589 (paling rendah
  0,88 pada 2016–2024); rerata nasional naik 19,43 poin. Sumber: `irbi/README.md` §4. [asumsi-kebijakan; analisis
  penyusun paket atas data resmi]
- Rumus risiko R = H × V / C ada di lampiran Perka BNPB 2/2012, tetapi lampiran itu tidak ada di korpus lokal; batang
  tubuh Perka berstatus berlaku. Sumber: `riset/A-dokumen-bnpb.md` §1.1; pustaka `bnpb-2012-pengkajian-risiko`. [resmi
  untuk status; rumus sekunder]

**IRBI dan DIBI dibaca berdampingan (3.4)**

- Korelasi peringkat Spearman IRBI 2025 lawan jumlah kejadian DIBI 2015–2025 per kab: kekeringan 0,178 (n = 119), banjir
  0,187 (n = 118), longsor 0,199 (n = 96). Sumber: `air-jawa/kab_jawa.csv` kolom `irbi2025_<bahaya>` dan
  `dibi1525_kejadian_<bahaya>` [dihitung penyusun bukti]; `kunci: airjawa.jawa.spearman_irbi_dibi.*`. [asumsi-kebijakan;
  analisis penyusun atas data resmi]
- Korelasi tetap lemah bila DIBI diukur dengan jumlah tahun berkejadian, meninggal dan hilang, atau menderita dan
  mengungsi: rentang 0,005 sampai 0,233 di tiga bahaya (meninggal kekeringan nol di semua kab). Sumber: idem ditambah
  `air-jawa/dibi_kab_tahun.csv` [dihitung penyusun bukti; belum didaftarkan karena hanya penguat Inferensi].
  [asumsi-kebijakan; analisis penyusun atas data resmi]
- IRBI longsor 2025 kosong di 23 kab, dan 15 di antaranya punya kejadian longsor DIBI 2015–2025, mis. Kota Adm. Jakarta
  Selatan 15, Jakarta Timur 13, Kota Yogyakarta 11, Kota Sukabumi 10, Kota Depok 9, Kota Surakarta 9. Sumber:
  `air-jawa/kab_jawa.csv`; `kunci: airjawa.jawa.irbi2025.longsor_kosong_berkejadian`. [resmi]
- KERANGKA §2 butir 7: IRBI (risiko termodelkan) dan DIBI (kejadian tercatat) tidak saling memvalidasi; keduanya
  disajikan berdampingan dengan korelasinya; sel IRBI kosong ditulis "tidak dinilai"; jumlah kejadian kekeringan DIBI
  mengukur intensitas pelaporan, bukan keparahan. [asumsi-kebijakan, keputusan kajian]

**Sifat data DIBI yang menentukan syarat (b) dan (c)**

- Kejadian kekeringan DIBI Jawa: 2015 hanya 5 kejadian di 3 kab (213.399 terdampak), padahal 2015 tahun El Niño kuat
  (ONI JAS 1,73); 2016 nol kejadian; 2018 90 kejadian dan 4.924.057 terdampak; 2019 tercatat di 76 kab; 2023 di 43 kab.
  Sumber: `air-jawa/dibi_kab_tahun.csv` [dihitung penyusun bukti, `is_bencana = 1`]; `kunci: hidromet.jawa.kekeringan.dibi_kejadian_2015`,
  `kunci: hidromet.jawa.kekeringan.dibi_terdampak_2018`, `kunci: airjawa.kekeringan.kab_2019`, `kunci: oni.jas_2015` (BAB 1).
  [resmi]
- Ambang kejadian bencana (Juklak BNPB 7/2023, hlm. 7): cukup satu dari 1 orang meninggal; 50 orang terdampak, luka, atau
  mengungsi; 5 unit rumah atau fasilitas publik rusak; 1 hektare lahan; permintaan bantuan nasional; atau penetapan
  status darurat. Satu kejadian lintas wilayah dihitung satu secara nasional dan per wilayah terdampak di tingkat
  provinsi dan kab/kota. Sumber: korpus `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` hlm. 7; pustaka
  `bnpb-2023-standar-data`; `kunci: juklak_2023.ambang.*`. [resmi; teks dari salinan non-JDIH, lihat Celah]
- DIBI menyimpan kejadian lintas k kab sebagai pecahan 1/k per kab, jadi frekuensi kab memakai `n_baris`. Sumber:
  `dibi/README.md` bagian Definisi. [resmi]
- Patahan seri: `is_bencana = false` baru dipakai sejak data 2024; kategori Banjir Bandang, Banjir dan Tanah Longsor, dan
  Banjir Rob baru muncul 2018 dan kosong pada 2024; Tanah Longsor 2024 hanya 219 kejadian nasional (tahun lain 584
  sampai 1.251). Sumber: `dibi/README.md` bagian Patahan seri 2024; `skenario-hidromet/README.md` bagian DIBI. [resmi]
- `is_bencana` bukan fungsi ambang murni: ada laporan `is_bencana = false` yang membawa korban meninggal, mis. Jawa
  Tengah longsor 2026, 2 meninggal dari 55 laporan. Sumber: `dibi/README.md` bagian Pengecualian. [resmi]

**Uji aturan KERANGKA pada data 119 kab (bahaya banjir, longsor, kekeringan)** [dihitung penyusun bukti dari
`air-jawa/kab_jawa.csv` dan `air-jawa/dibi_kab_tahun.csv`, `is_bencana = 1`, 2015–2025] [asumsi-kebijakan; turunan dari
data resmi]

- Syarat (b) ≥ 3 dari 11 tahun dipenuhi 114 kab untuk banjir, 93 untuk longsor, 54 untuk kekeringan. Sebaran banjir:
  37 kab berkejadian tiap tahun (11 dari 11), 25 kab 10 dari 11 tahun, hanya 5 kab di bawah 3 tahun. `kunci:
  airjawa.perhatian.syarat_b.*`.
- Syarat (a) kelas nilai teratas dari 5 kelas bergantung cara batas kelas: interval sama memberi banjir 1 kab (Kota
  Mojokerto, nilai 32, sedangkan nilai berikutnya 25), longsor 3 (Kab. Karawang, Kab. Bandung Barat, Kab. Jombang),
  kekeringan 8; kuantil (nilai ≥ persentil 80, kembar ikut) memberi banjir 36, longsor 32, kekeringan 32. `kunci:
  airjawa.perhatian.syarat_a.*`.
- Syarat (c) untuk kekeringan kosong: meninggal dan hilang serta mengungsi kekeringan bernilai nol di semua kab
  2015–2025. Bila diganti menderita dan mengungsi kuartil atas (ambang 82.123 jiwa), 30 kab memenuhi.
- Syarat (d): 7 kab dengan laju penurunan muka tanah terverifikasi (P1 Komponen 5: Demak lewat angka wilayah gabungan,
  Surabaya lewat laju LOS; Jakarta Utara dan Kab. Bekasi disebut sumber terverifikasi tanpa angka sehingga tidak
  memenuhi); 73 kab dengan DI kewenangan pusat; CAT rusak tidak
  dipakai karena hanya sekunder (KERANGKA §8 baris Rilis Badan Geologi). Syarat (e) tidak dapat diisi karena SK status
  darurat tidak diperoleh (KERANGKA §7 butir 24).
- Jumlah kab di daftar menurut varian:

  | Varian (a) | Varian (d) | Varian (b) | Banjir | Longsor | Kekeringan* |
  | --- | --- | --- | ---: | ---: | ---: |
  | interval sama | per bahaya | ≥ 3 tahun | 48 | 45 | 42 (52) |
  | interval sama | semua penanda untuk semua bahaya | ≥ 3 tahun | 91 | 76 | 45 (53) |
  | kuantil | per bahaya | ≥ 3 tahun | 67 | 57 | 53 (58) |
  | kuantil | semua penanda untuk semua bahaya | ≥ 3 tahun | 97 | 80 | 54 (59) |
  | interval sama | per bahaya | kuartil atas tahun Jawa | 27 | 31 | 25 (37) |
  | kuantil | per bahaya | kuartil atas tahun Jawa | 35 | 38 | 41 (47) |

  \* Angka tanpa kurung: syarat (c) persis teks KERANGKA (kosong untuk kekeringan). Dalam kurung: (c) kekeringan memakai
  menderita dan mengungsi. "Per bahaya": penurunan muka tanah untuk banjir, DI pusat untuk kekeringan, tanpa penanda untuk
  longsor. Kuartil atas tahun: banjir 11 dari 11 tahun (37 kab), longsor ≥ 10 (36 kab), kekeringan ≥ 4 (32 kab).
  `kunci: airjawa.perhatian.rentang_varian.*` (banjir 27–97, longsor 31–80, kekeringan 25–59; rentang memuat semua
  varian, dengan dan tanpa kurung). Angka 25 dan 41 dihitung ulang 24 Okt 2026 dengan cara yang sama dan cocok dengan
  baris kepekaan di bawah (geser (b) ke ≥ 4 tahun: 42 menjadi 25).
- Uji kepekaan KERANGKA pada varian baris pertama: geser (b) ke ≥ 2 atau ≥ 4 tahun mengubah banjir 0 kab (48 tetap),
  longsor 0 atau −1, kekeringan +14 atau −17 (42 menjadi 56 atau 25); geser (a) satu kelas ke bawah menambah banjir 3,
  longsor 12, kekeringan 7.

### Inferensi

- *Penilaian tim:* syarat (b) dengan ambang ≥ 3 tahun tidak membedakan untuk banjir (114 dari 119 kab) dan longsor (93
  kab). Akibatnya daftar banjir praktis menjadi "(b) ditambah satu syarat lain apa pun", dan ukurannya ditentukan oleh
  pilihan (a), (c), dan (d), bukan oleh risiko. Usul untuk 3.5: ambang (b) memakai kuartil atas Jawa per bahaya, sejajar
  dengan syarat (c), sehingga daftar banjir 27 sampai 35 kab dan longsor 31 sampai 38 kab.
- *Penilaian tim:* cara batas kelas syarat (a) harus sama dengan kelas peta G19 (gerbang D-29 menuntut kelas sama di
  semua panel). Interval sama pada nilai bulat dengan satu pencilan (Kota Mojokerto, IRBI banjir 32) hanya menangkap 1
  kab, sehingga syarat (a) praktis mati; kuantil dengan nilai kembar ikut sesuai prinsip 8 dan lebih tahan pencilan.
  Pilihan ini berlabel Asumsi kebijakan.
- *Penilaian tim:* syarat (c) untuk kekeringan perlu diputus: memakai menderita dan mengungsi (dengan catatan bahwa
  angka itu juga intensitas pelaporan), atau menghapus (c) untuk kekeringan dan meminta dua dari (a), (b), (d).
- *Penilaian tim:* syarat (d) harus dipetakan per bahaya (penurunan muka tanah untuk banjir dan rob, DI pusat untuk
  kekeringan). Memakai DI pusat untuk semua bahaya menaikkan daftar banjir dari 48 ke 91 kab tanpa kaitan sebab dengan
  banjir.
- *Penilaian tim:* korelasi lemah IRBI dan DIBI (0,18 sampai 0,20) berarti keduanya menangkap hal berbeda; daftar
  perhatian yang meminta dua syarat dari sumber berbeda lebih kuat daripada salah satu sendiri. Kab yang IRBI-nya "tidak
  dinilai" tetapi berkejadian (15 kab longsor) tetap bisa masuk lewat (b) dan (c).
- *Penilaian tim:* Bab 3 cukup menyajikan aturan, keempat pilihan yang dikunci, dan tabel kepekaan; nama kab per bahaya
  baru tampil di Bab 5–6. Daftar berlabel Asumsi kebijakan, urut abjad atau kode wilayah, bukan urut nilai.

### Celah

- Cara batas 5 kelas G19 tidak ditetapkan PEDOMAN §B5.9 (hanya "5 kelas diskret"); harus diputus di 3.5 dan dipakai
  sama di peta.
- SK status siaga atau tanggap darurat kab/kota (syarat e) tidak diperoleh; ditulis permintaan data ke BPBD dan
  Pusdatinkom.
- Rilis primer status CAT Badan Geologi belum dibuka; CAT rusak tidak dipakai sebagai syarat.
- DIBI 2024 tidak lengkap untuk longsor dan tiga kategori banjir; hitungan tahun berkejadian 2015–2025 memuat lubang itu.
  Penyajian: catatan patahan di Tabel 3.3.
- Semua angka uji aturan dihitung penyusun bukti; skrip reproduksi belum ada di paket. Sebelum naskah final, pemilik
  paket membangun keluaran `daftar_perhatian` dengan varian yang dikunci.

---

## P3. Bagaimana skenario terburuk, lantai, kemungkinan, dan skala dampak didefinisikan?

### Inti

Skenario terburuk yang masuk akal adalah perwujudan terburuk yang masih masuk akal setelah variasi yang sangat tidak
mungkin disisihkan (Cabinet Office, 2025), dengan lantai: tidak lebih ringan daripada musim atau kejadian tercatat
terburuk untuk jenis dan wilayah yang sama. Untuk musim hujan Jawa 2008/2009–2025/2026, lantai per metrik adalah 216
meninggal (2025/2026), 270 meninggal dan hilang (2008/2009), 525.861 mengungsi (2013/2014; 532.321 bila rekaman Kota
Bekasi 2020 dihitung), dan 6.905 rumah rusak berat (2009/2010). Pita model musim analog 2020/2021 (nama paket
`musim_hujan_lanina`) 254–547 meninggal dan hilang: batas bawahnya di bawah lantai, sedangkan seluruh pitanya di atas
156 meninggal dan hilang tercatat musim analog itu sendiri, karena rasio korban per kejadian jangka panjang dikalikan
ke jumlah kejadian musim analog yang tinggi. Kemungkinan dinilai sebagai peluang skenario itu sendiri terjadi dalam
lima tahun (Cabinet Office, 2025, hlm. 12): musim yang menyamai atau melampaui lantai tercatat 1 kali dalam 18 musim
per metrik, sekitar 24% per lima tahun (pita 4, dekat batas pita 5). Fase ENSO hanya konteks, karena data 18 musim
tidak menunjukkan kaitan La Niña dengan dampak musim hujan Jawa. Dampak dinilai kelas 1–5 per aspek Perban BNPB 2/2023
Pasal 7 ayat (5), tetapi **ambangnya belum ditetapkan**, padahal kartu paket sudah berisi angka skenario; urutan
KERANGKA §2 butir 9 ("sebelum angka skenario diisi") sudah terlanggar, dan bagian skala dampak dari pertanyaan ini baru
terjawab sebagian. Penetapan dan pembekuan ambang menjadi syarat sebelum kartu Bab 5–6 dipakai (Celah).

### Temuan bersumber

**Definisi dan kemungkinan (3.6)**

- Skenario terburuk yang masuk akal menggambarkan perwujudan terburuk yang masih masuk akal dari suatu risiko setelah
  variasi yang sangat tidak mungkin disisihkan, untuk perencanaan yang proporsional. Kemungkinan risiko nonmalisius
  dinilai untuk terjadi dalam periode 5 tahun dan dipetakan ke skor 1–5 dengan pita < 0,2%, 0,2–1%, 1–5%, 5–25%, > 25%.
  Yang dinilai adalah peluang skenario terburuk yang masuk akal itu sendiri terjadi paling sedikit sekali dalam periode
  penilaian, bukan peluang bahaya atau pemicunya secara umum (hlm. 12, dibuka ulang 24 Okt 2026). Dampak: tiap dimensi
  (tujuh dimensi, antara lain kesejahteraan manusia, layanan esensial, ekonomi, lingkungan) dinilai 0–5 lalu digabung
  menjadi satu skor dampak 1–5 yang logaritmik (hlm. 13, 15); contoh indikator kematian: kelas 1 sampai 5 = 1–8, 9–40,
  41–200, 201–1.000, > 1.000 jiwa (Tabel 3, hlm. 14). Sumber: Cabinet Office (2025) *National Risk Register 2025*, hlm. 11 (definisi), 12 dan 16 (pita),
  13–15 (dampak); https://assets.publishing.service.gov.uk/media/67b5f85732b2aab18314bbe4/National_Risk_Register_2025.pdf,
  diakses 23 Okt 2026; pustaka `cabinetoffice-2025-nrr`; `kunci: nrr_2025.*`. [terverifikasi]
- KERANGKA §2 butir 9: lantai skenario tidak boleh lebih ringan daripada kejadian atau musim tercatat terburuk dalam
  periode acuan untuk jenis dan wilayah yang sama; yang boleh disisihkan hanya kejadian berpeluang lima tahun < 0,2%
  (pita 1) dengan alasan tertulis; jenis tanpa dasar peluang ditulis "tidak dinilai"; dampak = kelas 1–5 per aspek
  Perban 2/2023 Pasal 7 ayat (5), kelas skenario = aspek terberat; larangan tampil untuk angka model yang melampaui angka
  tercatat tanpa penjelasan dan untuk pita yang lebarnya lebih dari satu orde. [asumsi-kebijakan, keputusan kajian]
- Perban BNPB 2/2023 Pasal 7: cakupan kedaruratan meliputi karakteristik ancaman, skenario kejadian, dan asumsi dampak
  (ayat 1); skenario disusun dengan masukan narasumber atau pakar yang kompeten (ayat 3); asumsi dampak berupa proyeksi
  akibat langsung berdasarkan skenario dan analisis risiko (ayat 4), diproyeksikan terhadap aspek lingkungan,
  kependudukan, ekonomi, infrastruktur/fisik, dan layanan sipil (ayat 5). Lampiran: skenario didasarkan pada data dan
  analisis resmi lembaga berotoritas dan "dapat mempertimbangkan sejarah kejadian bencana terburuk yang pernah terjadi";
  lampiran menamai aspek kelima "layanan publik/pemerintahan". Sumber: korpus
  `data/raw/hukum/teks/perban-nomor-2-tahun-2023.json` halaman PDF 4 dan 14; pustaka `bnpb-2023-renkon`. [resmi]
- Perban 2/2023 tidak memuat kelas atau ambang dampak 1–5 (dicari di batang tubuh dan lampiran korpus). Skala 1–5
  karena itu keputusan kajian. [resmi untuk ketiadaan; skala asumsi-kebijakan]
- Konteks ENSO (bukan kemungkinan skenario): 1950–2025, 24 dari 76 tahun punya NDJ dalam episode La Niña; 84,7% jendela
  lima tahun berturut memuat paling sedikit satu musim La Niña; El Niño kuat pada musim kemarau (ONI ≥ 1,5 pada JJA
  sampai SON dalam episode: 1965, 1972, 1982, 1997, 2015, 2023) muncul di 38,9% jendela lima tahun. ONI JAS 2026 = 2,16.
  Angka ini peluang fase pemicu, bukan peluang skenario terburuk terjadi, sehingga tidak dipakai sebagai kemungkinan
  (NRR hlm. 12; KERANGKA §2 butir 9: "peluang terjadinya skenario itu"). Sumber: `riset/mentah/oni_cpc.txt` (NOAA CPC)
  [dihitung penyusun bukti; definisi episode CPC ≥ 5 musim tumpang berturut]; `kunci: enso.lanina_ndj_porsi_jendela5`,
  `kunci: enso.elnino_kuat_porsi_jendela5`, `kunci: oni.jas_2026` (BAB 1). [asumsi-kebijakan; turunan dari ONI resmi
  NOAA]
- Kaitan La Niña dengan dampak musim hujan Jawa tidak terdeteksi di data paket (18 musim 2008/2009–2025/2026; 7 musim
  La Niña, 11 musim lain). Rerata meninggal dan hilang per musim 148 (La Niña) lawan 149 (lain); rerata mengungsi
  73.459 lawan 173.977 (arah berlawanan dengan dugaan); rerata rumah rusak berat 2.934 lawan 2.769; rerata kejadian
  1.146 lawan 1.144. Tiga musim mengungsi terbesar (2019/2020, 2013/2014, 2012/2013) semuanya bukan La Niña. Musim
  meninggal dan hilang terbesar (2008/2009, 270) memang La Niña, tetapi peringkat 2 dan 3 (2025/2026, 237; 2013/2014,
  216) bukan. Musim analog 2020/2021 mencatat 146 meninggal (156 meninggal dan hilang). Uji permutasi dua sisi atas
  selisih rerata (semua 31.824 susunan 7 dari 18): meninggal dan hilang p = 0,98, mengungsi p = 0,20, rumah rusak berat
  p = 0,85; Spearman ONI NDJ lawan meninggal dan hilang −0,19. Dengan n sekecil ini hasilnya berarti "kaitan tidak
  terdeteksi", bukan bukti bahwa kaitan tidak ada. Sumber: `skenario-hidromet/musim_hujan.csv` kolom `la_nina`,
  `oni_ndj`, `meninggal`, `hilang`, `mengungsi`, `rumah_rb`, `kejadian` [dihitung penyusun bukti 24 Okt 2026];
  `kunci: hidromet.jawa.musim_lanina.rerata_meninggal_hilang`, `kunci: hidromet.jawa.musim_lain.rerata_meninggal_hilang`,
  `kunci: hidromet.jawa.musim_lanina.rerata_mengungsi`, `kunci: hidromet.jawa.musim_lain.rerata_mengungsi`. [resmi;
  turunan untuk rerata; asumsi-kebijakan, analisis penyusun, untuk uji]
- Kemungkinan musim hujan Jawa yang menyamai atau melampaui lantai: tiap metrik lantai (meninggal 216, meninggal dan
  hilang 270, mengungsi 525.861 atau 532.321, rumah rusak berat 6.905) tercapai 1 kali dalam 18 musim. Dengan laju
  Poisson 1/18 per musim, peluang paling sedikit sekali dalam lima tahun = 1 − e^(−5/18) = 24,3% (pita 4, 5–25%); posisi
  plot Weibull 1/(n + 1) memberi 23,7%, pita yang sama. Karena lantai adalah nilai terbesar seri, frekuensi 1/18 terjadi
  menurut konstruksi; angka ini ditentukan panjang seri, bukan oleh pemicu, dan berada dekat batas pita 5. Sumber:
  `skenario-hidromet/musim_hujan.csv` [dihitung penyusun bukti 24 Okt 2026]; `kunci: hidromet.jawa.musim.kemungkinan_lantai_5th`.
  [asumsi-kebijakan; turunan dari DIBI resmi]
- Paket skenario: La Niña = ONI NDJ termasuk episode CPC; musim analog La Niña Jawa 2020/2021; "musim terberat tercatat"
  Jawa = 2019/2020 menurut peringkat gabungan lima metrik; aturan pemilihan buatan paket sehingga tahun analog berlabel
  asumsi-kebijakan. Karena kaitan La Niña dengan dampak tidak terdeteksi (butir di atas), berkas ini menyebut kartu itu
  "musim analog 2020/2021", bukan "skenario La Niña"; nama paket dan kunci registri (`musim_hujan_lanina`,
  `hidromet.jawa.lanina.*`) tetap sampai diganti pemiliknya (Celah). Sumber: `skenario-hidromet/README.md` bagian Musim
  hujan. [asumsi-kebijakan untuk pemilihan; angka musim resmi]

**Lantai dan pita model (3.6)**

- Metode korban paket: korban = Σ kejadian analog × rasio (meninggal + hilang)/kejadian per jenis 2010–2025; batas
  tinggi = persentil 90 yang dibatasi nilai terbesar kedua, "sehingga tahun terburuk tercatat selalu disisihkan".
  Semua angka korban belum diuji balik. Sumber: `skenario-hidromet/README.md` bagian Korban jiwa. [estimasi-model;
  belum diuji balik]. **Dibantah oleh** KERANGKA §2 butir 9 (lantai): tahun terburuk tidak boleh disisihkan kecuali
  berpeluang < 0,2% dalam 5 tahun.
- Musim analog 2020/2021 (paket: `musim_hujan_lanina`): model 254–547 meninggal dan hilang lawan 156 meninggal dan
  hilang tercatat (146 meninggal, 10 hilang); besaran keduanya sama. Per jenis (meninggal dan hilang): banjir model
  59–148 lawan 36 tercatat; tanah longsor model 164–344 lawan 89; cuaca ekstrem model 19,7–43,1 lawan 9; banjir dan
  longsor model 10,8–11,0 lawan 22 (kedua batas model di bawah angka tercatat). Sumber:
  `skenario-hidromet/kartu_skenario.csv` baris `musim_hujan_lanina, jawa`; `kunci: hidromet.jawa.lanina.korban_jiwa`,
  `kunci: hidromet.jawa.lanina.meninggal_hilang_tercatat`, `kunci: hidromet.jawa.lanina.korban_jiwa_longsor`,
  `kunci: hidromet.jawa.lanina.meninggal_hilang_tercatat_longsor`, `kunci: hidromet.jawa.lanina.korban_jiwa_banjir_longsor`,
  `kunci: hidromet.jawa.lanina.meninggal_hilang_tercatat_banjir_longsor`. [estimasi-model; belum diuji balik, lawan resmi]
- Musim analog 2019/2020: model 205–447 meninggal dan hilang lawan 127 meninggal dan hilang tercatat (124 meninggal, 3
  hilang); banjir model 50–124 lawan 66; banjir dan longsor model 2,1 lawan 24. Sumber: idem baris
  `musim_hujan_terberat_tercatat, jawa`; `kunci: hidromet.jawa.terberat.*`, `kunci: hidromet.jawa.musim_2019.meninggal`,
  `kunci: hidromet.jawa.musim_2019.hilang` (BAB 1). [estimasi-model; belum diuji balik, lawan resmi]
- Mengapa seluruh pita model melampaui angka tercatat musim analognya sendiri (KERANGKA §2 butir 9 melarang angka model
  yang melampaui angka tercatat musim yang sama tampil tanpa penjelasan): model mengalikan jumlah kejadian musim analog
  dengan rasio (meninggal + hilang)/kejadian per tahun kalender 2010–2025 (rendah = median, tinggi = p90 terbatas).
  Rasio tahunan Jawa turun tajam sementara jumlah kejadian naik: tanah longsor 0,27–0,52 per kejadian pada 2010–2014
  (186–485 kejadian per tahun) lawan 0,05–0,13 pada 2019–2023 (347–964 kejadian); banjir 0,15–0,31 lawan 0,03–0,13.
  Musim 2020/2021 memuat 1.816 kejadian, terbanyak dari 18 musim, sehingga 671 kejadian longsor × median 0,2444 memberi
  164, padahal rasio musim itu sendiri 89/671 = 0,13; banjir 470,3 × 0,1251 = 58,9 lawan rasio musim 36/470,3 = 0,08.
  Sumber: `skenario-hidromet/rasio_korban.csv` baris `jawa`; `skenario-hidromet/kartu_skenario.csv`;
  `skenario-hidromet/musim_hujan.csv` kolom `kejadian` [dihitung penyusun bukti 24 Okt 2026]. [resmi; turunan untuk
  rasio; estimasi-model untuk pita]
- Lantai per metrik dari 18 musim hujan Jawa (1 Okt–30 Apr) 2008/2009–2025/2026: meninggal terbanyak 216 (2025/2026);
  meninggal dan hilang terbanyak 270 (2008/2009: 173 + 97); mengungsi terbanyak 532.321 (2019/2020), atau 525.861
  (2013/2014) bila rekaman Kota Bekasi 1 Jan 2020 (366.274, status tidak terbukti) dikeluarkan sehingga 2019/2020 tinggal
  166.047; rumah rusak berat terbanyak 6.905 (2009/2010). Sumber: `skenario-hidromet/musim_hujan.csv`; `dibi/README.md`
  bagian Kejadian besar; `kunci: hidromet.jawa.musim_2025.meninggal`, `kunci: hidromet.jawa.lantai.meninggal_hilang`,
  `kunci: hidromet.jawa.musim_2013.mengungsi`, `kunci: hidromet.jawa.musim_2019.mengungsi_tanpa_bekasi`,
  `kunci: hidromet.jawa.musim_2009.rumah_rb`. [resmi; penjumlahan dan pengurangan dihitung penyusun bukti]
- Kekeringan: kematian langsung tidak tercatat (meninggal kekeringan Jawa 0 pada 2015–2026); tahun terdampak terbesar
  2018 (4.924.057 jiwa, 90 kejadian); cakupan kab terluas 2019 (76 kab). Mesin neraca dan padi platform belum pernah diuji
  balik terhadap puso atau produksi; uji balik aturan peringatan SPI-3 memberi POD 0,10 dan FAR 0,99 (tidak layak), jadi
  angka padi dan puso model hanya di lampiran. Sumber: `skenario-hidromet/README.md` bagian Kekeringan analog 2015;
  `kunci: dibi.jawa.kekeringan.meninggal_2015_2026` (BAB 1), `kunci: hidromet.jawa.kekeringan.dibi_terdampak_2018`.
  [resmi untuk DIBI; estimasi-model, uji balik gagal untuk aturan SPI]

**Skala dampak (3.6, Tabel 3.4)**

- Sebaran jumlah per provinsi per tahun, DIBI klasifikasi alam, cakupan bencana, 2008–2025 (648 provinsi-tahun):
  meninggal dan hilang p50 4, p90 41, p99 391, maksimum 4.845; mengungsi p50 1.402, p90 32.484, p99 239.158, maksimum
  947.399; rumah rusak p50 414, p90 5.521, p99 44.445, maksimum 271.693. Sumber: `dibi/rekap_provinsi_tahunan.csv`
  [dihitung penyusun bukti; persentil inklusif]; `kunci: dibi.provinsi_tahun.*`. [resmi; turunan]
- DIBI tidak menerbitkan kerugian rupiah: kolom `estimasi_kerugian_rumah` ditarik tetapi tidak diterbitkan karena
  satuannya tidak didokumentasikan; luka/sakit sangat tidak stabil antartahun dan tidak ada di DIBI Superset untuk paket
  skenario. Sumber: `dibi/README.md` bagian Keterbatasan; `skenario-hidromet/README.md` bagian Keterbatasan. [resmi]
- DIBI memuat hitungan fasilitas rusak (pendidikan, rumah ibadat, fasyankes, fasilitas umum, kantor, jembatan) yang
  dapat menjadi ukuran aspek layanan sipil dan infrastruktur. Sumber: `dibi/rekap_provinsi_tahunan.csv` kolom
  `pendidikan_rusak` sampai `jembatan_rusak`. [resmi]

**Kerugian materiil dan imateriil (3.7)**

- (a) Nilai aset terpapar KRB 2022–2026 Jawa (potensi kerugian fisik dan ekonomi, seluruh kelas, tidak dijumlah
  antarbahaya): banjir Rp406,46 T; longsor Rp351,72 T; kekeringan Rp450,08 T. Penduduk terpapar KRB kekeringan Jawa
  152.356.122 jiwa, 99,97% penduduk KRB Jawa. Sumber: `skenario-hidromet/kartu_skenario.csv` baris
  `kerugian_potensi_krb_*` dan `terpapar_krb_kekeringan`; `kunci: hidromet.jawa.banjir.kerugian_potensi_krb`,
  `kunci: hidromet.jawa.longsor.kerugian_potensi_krb`, `kunci: hidromet.jawa.kekeringan.kerugian_potensi_krb`,
  `kunci: hidromet.jawa.kekeringan.terpapar_krb`. [resmi]
- (b) Kerugian kejadian analog: banjir Jabodetabek awal Februari 2007, kerusakan Rp1.765,89 M ditambah kerugian
  Rp3.418,70 M = Rp5.184,43 M (Tabel III.1); perkiraan APINDO/AAUI Rp3,6 T yang dikutip laporan yang sama bisa tumpang
  tindih. Rob Semarang Rp0,55–2,8 T adalah estimasi akademik yang sumber primernya belum dibuka. Sumber: Bappenas (2007),
  pustaka `bappenas-2007-dala`; `skenario-hidromet/kartu_skenario.csv` baris `pembanding_rugi_*`;
  `kunci: bukti.dala_jabodetabek_2007.kerugian`. [resmi untuk DaLA; terverifikasi untuk APINDO/AAUI; estimasi-model untuk
  rob Semarang]
- (c) Stimulan rumah: skema lama Rp50/25/10 juta (RB/RS/RR) dan skema 2022 ke atas Rp60/30/15 juta. Sumber nilai ini di
  `public/banjir/data/param_banjir.json` adalah berita (metrotvnews, bisnis.com); pencarian penyusun bukti di seluruh
  korpus JDIH lokal (`data/raw/hukum/teks/`) tidak menemukan besaran stimulan rumah. [asumsi-kebijakan; dasar nilai
  sekunder]
- KERANGKA §2 butir 9: kebutuhan stimulan rumah hanya untuk gempa, longsor, dan banjir bandang, dan tidak disebut
  kerugian materiil untuk banjir genangan. **Dibantah oleh** kartu paket: `materiil_batas_bawah` musim analog 2020/2021 Jawa
  (Rp257,4–337,8 M) mengalikan semua rumah rusak musim itu, termasuk banjir genangan, dengan stimulan. Sumber:
  `skenario-hidromet/kartu_skenario.csv` baris `musim_hujan_lanina, jawa, materiil_batas_bawah`;
  `kunci: hidromet.jawa.lanina.materiil_batas_bawah`. [asumsi-kebijakan]
- Imateriil: pengungsi-hari = mengungsi × 7 hari (rendah 3, tinggi 30), asumsi karena data hanya memberi jumlah
  pengungsi, bukan lamanya; tidak ada VSL atau DALY di paket. Sumber: `skenario-hidromet/README.md` bagian Imateriil;
  `public/banjir/data/param_banjir.json` kunci `param.hari_mengungsi`. [asumsi-kebijakan]
- Kebutuhan respons kartu: bantuan air bersih 7 liter per orang per hari pada tiga hari pertama, lalu 15 liter; air minum
  2,5 liter per orang per hari. Sumber: Perka BNPB 7/2008, korpus `perka-nomor-7-tahun-2008.json` halaman PDF 12
  (tercetak hlm. 10); pustaka `bnpb-2008-kebutuhan-dasar`; `kunci: perka_2008.*`. Penanganan pengungsi mengikuti Perban
  BNPB 3/2018 (pustaka `bnpb-2018-pengungsi`; pasal belum dikutip). [resmi]

**Analisis kepekaan (3.8)**

- Peringatan dini: faktor pengali korban = ((1 − c1) + c1/R) / ((1 − c0) + c0/R), R = 8. Lintasan Renas 1.c (11,06% ke
  52%) memberi faktor 0,603; lintasan IKP Renstra (6,10% ke 6,32%) memberi 0,998, atau manfaat sekitar 0,2%. Sesuai
  KERANGKA §2 butir 10 ("dipecah per jenis; longsor tidak dihitung"), faktor hanya dikalikan ke jenis selain tanah
  longsor; korban model tanah longsor (164–344, sekitar 63–64% dari total) dibiarkan tanpa faktor. Korban musim analog
  2020/2021 Jawa 254–547 menjadi 219–466 dengan lintasan Renas: (254,354 − 163,9803) × 0,6034 + 163,9803 = 218,5 dan
  (546,9468 − 344,0152) × 0,6034 + 344,0152 = 466,5. Jenis gabungan "banjir dan tanah longsor" (10,8–11,0) tetap
  dikalikan karena tidak termasuk jenis tanah longsor di `tema.json`; bila ikut dikeluarkan, hasilnya 223–471.
  **Dibantah oleh** paket: `kepekaan_peringatan_dini.csv` baris `musim_hujan_lanina, jawa, renas_2025` mengalikan
  faktor ke seluruh korban termasuk longsor (153–330); angka paket itu melanggar KERANGKA §2 butir 10 dan tidak dipakai.
  Sumber: `skenario-hidromet/kepekaan_peringatan_dini.csv` kolom `faktor`; `skenario-hidromet/kartu_skenario.csv` baris
  `korban_jiwa_<jenis>` [dihitung penyusun bukti 24 Okt 2026]; `kunci: hidromet.jawa.lanina.pd_renas.faktor`,
  `kunci: hidromet.jawa.lanina.pd_renstra_ikp.faktor`, `kunci: hidromet.jawa.lanina.pd_renas.korban_jiwa` (usulan nilai
  baru di `bab-03.angka.json`, menggantikan entri `data/angka.json`). [asumsi-kebijakan]
- R = 8 berasal dari laporan UNDRR dan WMO: mortalitas bencana di negara bercakupan peringatan dini terbatas delapan kali
  lebih tinggi daripada negara bercakupan substansial sampai komprehensif. Ini asosiasi lintas negara, bukan efek kausal.
  Sumber: WMO, siaran pers 13 Okt 2022, https://wmo.int/media/news/un-warns-half-world-not-prepared-disasters, diakses
  23 Okt 2026; pustaka `wmo-2022-peringatan-dini`; `kunci: bukti.wmo_2022.rasio_mortalitas`. [terverifikasi]
- Tuas penurunan muka tanah bila pengambilan air tanah dihentikan dengan pasokan pengganti (KERANGKA §2 butir 10; §1.1
  B15: dari laju terverifikasi): **belum dihitung untuk Jawa**. Belum ada hitungan yang menerapkan perubahan laju ke tujuh
  kab berlaju terverifikasi (P1 Komponen 5), jadi 3.8 belum memuat baris ini sebagai tuas berkalkulasi (Celah). Bukti
  luar negeri program P16 (Tokyo, Bangkok) bukan analisis kepekaan dan dipindah ke bab program (Bab 8); catatan
  keterbatasannya ada di Catatan wajib.
- Kepekaan pemilihan analog: mengungsi musim 2019/2020 532.321 dengan rekaman Kota Bekasi, 166.047 tanpa rekaman itu.
  Sumber: `dibi/README.md` bagian Kejadian besar; KERANGKA §7 butir 15. [resmi; selisih dihitung penyusun bukti]
- Kepekaan daftar perhatian: lihat P2 (geser ambang (b) dan (a)).

### Inferensi

- *Penilaian tim:* lantai harus ditetapkan per metrik, bukan dengan memilih satu musim analog, karena tidak ada musim yang
  terburuk di semua metrik: musim "terberat tercatat" menurut paket (2019/2020) hanya mencatat 124 meninggal, di bawah
  2025/2026 (216).
- *Penilaian tim:* aturan kartu yang memenuhi lantai: nilai skenario per metrik = nilai terbesar dari batas tinggi pita
  model dan angka tercatat terburuk periode acuan; pita model tetap ditampilkan di samping angka tercatat; batas pita yang
  jatuh di bawah lantai dinaikkan ke lantai dengan catatan "dinaikkan ke lantai tercatat". Untuk musim analog 2020/2021
  Jawa, korban menjadi 270–547 jiwa (lantai 270, batas tinggi model 547). Batas tinggi 547 tetap angka model yang
  melampaui tercatat musim analog (156); ia hanya boleh tampil di kartu bersama penjelasan mekanisme (P3 Temuan, rasio
  jangka panjang × kejadian musim analog) dan tidak di judul (KERANGKA §2 butir 9, larangan tampil).
- *Penilaian tim:* penurunan rasio korban per kejadian sambil jumlah kejadian naik sejalan dengan pencatatan kejadian
  kecil yang makin lengkap (intensitas pelaporan, KERANGKA §2 butir 7), bukan dengan musim yang makin aman. Bila itu
  benar, mengalikan kejadian musim terbaru dengan rasio jangka panjang akan selalu menggelembungkan pita; pemilik paket
  perlu menguji rasio dari tahun yang sezaman dengan musim analog atau mengganti penyebut kejadian dengan ukuran yang
  lebih stabil. Ini dugaan, belum diuji.
- *Penilaian tim:* dalam 18 musim acuan, tiap musim terburuk per metrik terjadi lebih sering daripada pita 1 (< 0,2% per
  lima tahun), jadi tidak ada musim Jawa yang boleh disisihkan. Rekaman Kota Bekasi 2020 bukan soal peluang, melainkan
  keabsahan data; ia ditangani lewat uji kepekaan, bukan penyisihan.
- *Penilaian tim:* periode acuan yang paling dapat dipertanggungjawabkan adalah 18 musim 2008/2009–2025/2026 dengan dua
  penanda patahan (kategori 2018, `is_bencana` dan kelengkapan 2024).
- *Penilaian tim:* kemungkinan kartu musim hujan Jawa ditulis pita 4 (24,3% per lima tahun, frekuensi musim yang
  menyamai atau melampaui lantai, P3 Temuan), dengan catatan "dekat batas pita 5; ditentukan panjang seri 18 musim".
  Peluang fase ENSO (La Niña 84,7%, El Niño kuat 38,9% per jendela lima tahun) tidak dipakai sebagai kemungkinan karena
  itu peluang pemicu, dan data 18 musim tidak menunjukkan kaitan La Niña dengan dampak di Jawa; ENSO cukup sebagai
  konteks dan pemicu kalender 2028–2030 (KERANGKA §2 butir 11), sedangkan prakiraan BMKG 2026/2027 tetap rujukan
  operasional. Untuk kekeringan, kaitan El Niño dengan dampak tercatat belum diuji di berkas ini (2015, tahun El Niño
  kuat, hanya mencatat 5 kejadian), jadi ONI juga tidak boleh langsung menjadi kemungkinan kartu kemarau. Penurunan muka
  tanah (proses menerus), luas genangan rob, dan kebakaran TPA tidak punya dasar peluang dan ditulis "tidak dinilai".
- *Penilaian tim:* unit skala dampak harus sama dengan unit skenario. Sebaran provinsi-tahun cocok untuk kartu per
  provinsi; kartu tingkat Jawa (enam provinsi, satu musim) hampir pasti jatuh di kelas atas skala provinsi. Pilihan:
  ambang dari sebaran 18 musim Jawa, atau kartu per provinsi dengan ambang provinsi-tahun. Ambang sebaiknya logaritmik
  (mengikuti Cabinet Office) dengan titik potong dekat p50, p90, p99 sebaran. Aspek ekonomi dan lingkungan tidak dapat
  dikelaskan dari DIBI; kelasnya ditulis "tidak dinilai" atau memakai KRB sebagai batas atas berlabel.
- *Penilaian tim:* kartu materiil musim hujan Jawa harus dipisah: rumah rusak banjir genangan tidak dikalikan stimulan;
  hanya longsor dan banjir bandang yang memakai besaran (c), dan labelnya "kebutuhan stimulan rumah (batas bawah)", bukan
  "kerugian materiil".
- *Penilaian tim:* rancangan Tabel 3.5 (matriks ketersediaan kuantifikasi; R = Resmi, T = Turunan, E = Estimasi model,
  – = Tidak dikuantifikasi):

  | Jenis (Jawa) | Meninggal dan hilang | Pengungsi | Rumah rusak | Luas | Kerugian materiil | Kemungkinan |
  | --- | --- | --- | --- | --- | --- | --- |
  | Banjir | R tercatat; E pita | R | R | R (bahaya tinggi KRB, batas atas) | R (aset terpapar KRB; DaLA 2007) | T (frekuensi ≥ lantai) |
  | Banjir bandang | R tercatat; E pita (rasio nasional) | R | R | R (KRB) | R (KRB); T stimulan | T (frekuensi ≥ lantai) |
  | Tanah longsor | R tercatat; E pita | R | R | R (KRB) | R (KRB); T stimulan | T (frekuensi ≥ lantai) |
  | Cuaca ekstrem | R tercatat; E pita | R | R | – | R (KRB) | T (frekuensi ≥ lantai) |
  | Gelombang ekstrem dan abrasi | R tercatat; E pita | R | R | R (KRB); E laju garis pantai 5 situs | R (KRB) | T (frekuensi ≥ lantai) |
  | Rob | R tercatat (0) | R | R | – (genangan tidak ada) | E (rob Semarang, primer belum dibuka) | – |
  | Kekeringan | – (tidak tercatat) | – | – | R (bahaya tinggi KRB) | R (KRB) | T (frekuensi ≥ lantai terdampak) |
  | Penurunan muka tanah | – | – | – | – | – | – (proses menerus) |

  Kolom Kemungkinan: frekuensi tahun atau musim yang menyamai atau melampaui lantai jenis itu dalam periode acuan,
  dibaca ke pita NRR (cara hitung di P3 Temuan); angka per jenis baru bisa diisi setelah `skenario-hidromet/lantai_jenis.csv`
  ada (KERANGKA §2 butir 9). Rob "–": kategori baru ada sejak 2018 dan kosong pada 2024, terlalu pendek. ONI tidak
  dipakai di kolom ini.

### Celah

- Besaran stimulan rumah resmi tidak ditemukan di korpus JDIH lokal; nilai paket bersumber berita. Penyajian: label
  Asumsi kebijakan berdasar sekunder; permintaan juknis atau keputusan besaran stimulan ke Deputi Bidang Rehabilitasi dan
  Rekonstruksi.
- PDNA atau DaLA untuk banjir Jawa setelah 2007 (mis. Demak–Kudus Maret 2024) tidak ditemukan; DaLA 2007 dibaca dari
  salinan di locjkt.or.id, bukan domain Bappenas.
- Lama pengungsian per kejadian tidak tercatat; pengungsi-hari tetap asumsi 3–30 hari.
- Kartu paket belum memecah `materiil_batas_bawah` per jenis; pemecahan dibutuhkan untuk memenuhi KERANGKA §2 butir 9 (c).
- Ketiadaan ambang dampak resmi di Perban 2/2023 membuat skala 1–5 sepenuhnya asumsi kebijakan; ditulis terang di 3.6.
- Puso per kab (Kementan) dan produksi padi BPS per provinsi belum ditarik; dampak pangan kekeringan tidak
  dikuantifikasi selain lampiran model.
- Luas genangan rob dan debit sungai tidak ada; kemungkinan untuk rob dan penurunan muka tanah "tidak dinilai".
- **Ambang skala dampak 1–5 (Tabel 3.4) belum ditetapkan; syarat sebelum kartu Bab 5–6 dipakai.** Urutan KERANGKA §2
  butir 9 sudah terlanggar karena `kartu_skenario.csv` terisi lebih dulu. Perbaikan: ambang per aspek ditetapkan dari
  sebaran DIBI saja (persentil `kunci: dibi.provinsi_tahun.*` sudah ada; NRR Tabel 3 hlm. 14 sebagai pembanding
  logaritmik), dengan unit yang sama dengan unit kartu (provinsi-tahun atau musim Jawa, lihat Inferensi), dibekukan
  bertanggal di log keputusan sebelum kartu dibaca, lalu kartu dinilai ulang. Pilihan ambang adalah Asumsi kebijakan dan
  diputus sesi induk atau pemilik, bukan berkas bukti.
- `skenario-hidromet/kepekaan_peringatan_dini.csv` perlu dibangun ulang oleh pemilik paket skenario-hidromet: faktor
  dipecah per jenis dan tidak dikalikan ke tanah longsor (KERANGKA §2 butir 10), dengan putusan tertulis untuk jenis
  gabungan "banjir dan tanah longsor". Sampai itu, `kunci: hidromet.jawa.lanina.pd_renas.korban_jiwa` memakai nilai
  usulan bab ini (219–466), dan entri lama di `data/angka.json` (153–330) tidak dipakai naskah.
- Pita korban model melampaui angka tercatat musim analognya sendiri (2020/2021: 254–547 lawan 156; 2019/2020: 205–447
  lawan 127). Mekanisme tertulis di P3 Temuan, tetapi pemilik paket belum menguji rasio sezaman; sampai diuji balik,
  pita hanya di kartu berpil Estimasi model, tidak di judul atau kartu angka.
- Nama "La Niña" pada paket dan registri (`musim_hujan_lanina`, `hidromet.jawa.lanina.*`) menyiratkan pemicu yang
  kaitannya dengan dampak tidak terdeteksi; usul ke pemilik paket dan registri: ganti menjadi nama musim analog.
- Tuas penurunan muka tanah (KERANGKA §2 butir 10) belum dihitung untuk Jawa; perlu hitungan dari laju terverifikasi
  tujuh kab (P1) oleh pemilik paket air-jawa, dengan koefisien perubahan laju bersumber primer yang dibuka.
- Kaitan El Niño dengan dampak kekeringan tercatat belum diuji; kemungkinan kartu kemarau menunggu uji itu atau
  frekuensi ≥ lantai terdampak.
- Untuk pemilik paket program-terbukti: P16 berlabel kekuatan `kuat` dengan `jenis_eval` `data-resmi-pra-pasca`
  (sebelum-sesudah tanpa pembanding), dan baris Bangkok B100–B101 berlabel `terverifikasi`, `dibuka-langsung`, padahal
  angkanya kutipan abstrak dari Phien-wej dkk. (2006). Usul: buka Phienwej, Giao, Nutalaya (2006), *Engineering Geology*
  82(4): 187–201 (gagal dibuka 24 Okt 2026: ScienceDirect 403, OpenAlex tanpa abstrak) atau labeli B100–B101 sekunder,
  lalu tinjau kekuatan P16.

---

## P4. Angka mana yang berbeda versi, dan versi mana yang dipakai?

### Inti

Sedikitnya 15 butir kajian air punya lebih dari satu versi. Aturannya: versi resmi yang dibaca di dokumen penerbitnya
dipakai; versi sekunder hanya tampil di Tabel 3.7 sebagai pembanding; dua versi resmi yang bertentangan ditulis
berdampingan beserta definisinya, tanpa dirata-rata; versi yang berbeda karena definisi (penyebut, besaran, cakupan)
tidak disebut bertentangan, tetapi diberi nama besarannya.

### Temuan bersumber

1. **Penduduk dan porsi Jawa.** Penduduk KRB Jawa 152.402.534 dari 271.680.290 jiwa (56,10%) [resmi, dipakai sebagai
   penyebut]; WorldPop Jawa 160.830.619 dari 286.674.532 jiwa di dalam poligon (56,1%) [estimasi-model]; SP2020 56,10%
   [resmi lewat rilis yang dibuka BAB 1]; BPS 2026 nasional 287.198.383 jiwa (judul tabel menulis "Ribu Jiwa", nilainya
   jiwa) [resmi], per kab gagal ditarik. Per kab: Kota Yogyakarta 174.017 lawan 415.382; Kep. Seribu 5.689 lawan 29.418.
   Sumber: `air-jawa/README.md` §2, §6; `nonalam-sosial/krb_covid19_wilayah.csv`; `kunci: airjawa.jawa.porsi_penduduk_krb_persen`,
   `kunci: airjawa.jawa.porsi_penduduk_sp2020_persen` (BAB 1), `kunci: airjawa.jawa.porsi_penduduk_persen`.
2. **Kapasitas Jatiluhur** 3.000 lawan 2.440 juta m³ dan **Cirata** 2.165 lawan 1.900 juta m³; keempat angka sekunder
   dari artikel berbeda. Dipakai: tidak ada sebagai angka utama; keduanya hanya di draf Tabel 3.7 sebagai pembanding dan
   tidak tampil di naskah final (KERANGKA §2 butir 5); kuncinya berlabel `sekunder`, sehingga pembaca registri menolak
   menyuntiknya; data diminta ke PJT II. Sumber:
   `air-jawa/bendungan_angka.csv`; `kunci: airjawa.bendungan.jatiluhur.kapasitas_v1` dan `_v2`, `kunci:
   airjawa.bendungan.cirata.kapasitas_v1` dan `_v2`. [sekunder]
3. **Besaran tampungan yang berbeda, bukan versi.** Kedung Ombo kapasitas desain 723, kapasitas efektif 634,6, tampungan
   terukur 2021 683,19 juta m³; Sutami desain 343 dan terukur 2019 178,16 juta m³ (sekunder). Kapasitas efektif dan
   tampungan terukur bukan versi lain kapasitas total desain. Sumber: `air-jawa/bendungan_angka.csv`;
   `air-jawa/README.md` §3 baris `bendungan.csv`. [resmi untuk Kedung Ombo; sekunder untuk Sutami]
4. **Luas DI Jatiluhur bagian Bekasi** 52.728 ha (pindaian BN 638 hlm. 16) lawan 82.728 ha (riset B §4.1). Dipakai 52.728
   karena keempat bagian menjumlah ke total DI 237.790 ha. Sumber: `air-jawa/README.md` §5 butir 7;
   `air-jawa/irigasi_di_pusat_provinsi.csv` baris Jatiluhur; `kunci: airjawa.irigasi.jatiluhur.bekasi_ha`,
   `kunci: airjawa.irigasi.jatiluhur.luas_di`. [resmi]
5. **Ketidakkonsistenan di dalam Permen PUPR 14/2015.** Judul seksi XII Jawa Tengah (pusat) mencetak 110.500 ha padahal
   17 baris DI-nya 110.501; DI Majegan, Brongkol, Sembuh bagian per kab tidak menjumlah ke induk; total Jawa tercetak
   3.135.123 ha lawan jumlah rekap 3.135.124. Dipakai angka induk; selisih jadi baris sisa. Sumber: `air-jawa/README.md`
   §5 butir 4. [resmi]
6. **Sedimentasi BBWS Pemali-Juana**: total tercetak 96,51 juta m³ lawan jumlah 18 baris 96,545. Sumber:
   `air-jawa/bendungan_rekonsiliasi.csv`. [resmi]
7. **Penurunan muka tanah Pekalongan, tujuh baris**: terverifikasi Sidiq dkk. (2023) 5–16, Handoko dkk. > 5, Sidiq dkk.
   (2021) ≤ 7, Widodo dkk. (2024) 10–19 cm per tahun; sekunder Bappenas 12–30, BRIN 2,1–11, pernyataan pers ITB 2022
   "20 cm/thn". Semarang enam baris (terverifikasi Abidin 6–19, Sidiq 2021 ≤ 8, Mous ≥ 10, Aditiya dan Ito 2023 10–12;
   sekunder BRIN 0,9–6, ITB 20). Beda karena periode, sensor (pita C lawan L), statistik (rentang lawan maksimum), dan
   arah ukur. Dipakai: baris terverifikasi berdampingan dengan periode dan metode; tidak ada satu angka kota. Sumber:
   `air-jawa/subsiden_kota.csv`; `air-jawa/README.md` §6; `riset/B-air-jawa.md` §6.1; `kunci: airjawa.turun_tanah.*`.
   [terverifikasi dan sekunder]
8. **NCICD Fase A (tanggul pantai Jakarta)**: trase kritis 39 km, kewenangan Pemprov DKI 20,9 km, terbangun 9,4 km, sisa
   11,5 km, data sampai 17 Juli 2025 (DSDA DKI, terbit 23 Juli 2025, dibuka ulang 23 Okt 2026) [resmi, dipakai]; versi
   lain 43,9 km, 28,279 km, 11,820 km tanpa tanggal jelas [sekunder]. Sumber:
   https://dsda.jakarta.go.id/detail-artikel/update-progres-pekerjaan-ncicd-ini-tanggul-terbangun-per-juli-2025/85,
   diakses 23 Okt 2026; `riset/B-air-jawa.md` §7; `kunci: ncicd.fase_a.*`. Data berumur sekitar 15 bulan saat kajian.
9. **Cakupan peringatan dini, empat angka dengan tiga penyebut**: Renstra hlm. 70, keterpenuhan sistem peringatan dini
   "baru mencapai 6 persen dari total potensi masyarakat yang terpapar di kawasan yang berisiko tinggi"; Renstra hlm. 133
   dan 161, IKP "persentase cakupan layanan peringatan dini di daerah berisiko bencana" 6,10% (2025) ke 6,32% (2029);
   Renas Tabel 2.8 hlm. 32, indikator 1.c "proporsi penduduk per 100.000 jiwa di daerah berisiko bencana yang tercakup
   oleh informasi peringatan dini" 11.060 (2025) ke 52.000 (2029). Renstra hlm. 161 juga memuat "persentase layanan
   sistem diseminasi peringatan dini bencana berbasis sirine yang memadai" 6,09% ke 6,29%. Dipakai: dua lintasan (Renstra
   IKP dan Renas 1.c) berdampingan dengan catatan penyebut (KERANGKA §2 butir 10; KD-2). Sumber: korpus
   `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` hlm. 70, 133, 161; `perban-nomor-1-tahun-2025.json` hlm. 32;
   `kunci: renstra.ikp_peringatan_dini.2025`, `kunci: renstra.ikp_peringatan_dini.2029`, `kunci: renas.indikator_1c.2025`,
   `kunci: renas.indikator_1c.2029` (BAB 1). [resmi]
10. **Banjir Jabodetabek awal 2020**: DIBI 14 kab 52 meninggal, 433.628 mengungsi; DIBI Jabodetabek dan Lebak 61
    meninggal, 2 hilang, 449.791 mengungsi; Renstra 61 meninggal, 11.569 pengungsi, 3.245 rumah rusak; riset A 450.717
    (termasuk Karawang). Rekaman Kota Bekasi 366.274 (84,5% dari 433.628) berstatus tidak terbukti; untuk pembanding
    Renstra dipakai DKI saja (36.424). Sumber: `dibi/README.md` bagian Kejadian besar; `skenario-hidromet/README.md`
    bagian Angka yang bertentangan; `kunci: hidromet.jawa.jabodetabek2020.*`. [resmi, dua penerbit]
11. **Krisis air bersih 2023**: Kapusdatinkom BNPB dikutip IDX Channel 17 Okt 2023: 70–80% kab/kota di Jawa krisis air
    bersih [sekunder]; DIBI mencatat kejadian kekeringan di 43 dari 119 kab (36%) [resmi]. Definisinya berbeda (krisis air
    bersih lawan kejadian yang memenuhi ambang Juklak). Dipakai DIBI; angka 70–80% hanya pembanding bila rilis aslinya
    dibuka. Sumber: `riset/B-air-jawa.md` §8.3; `kunci: airjawa.kekeringan.kab_2023` (BAB 1).
12. **IRBI nasional 2019–2020**: rerata naif 514 kab 143,25 dan 140,96 lawan Renstra 144,02 dan 141,65. Selisih hilang
    dengan basis ber-`fix_values` (498 kab), jadi angka Renstra dipakai. Sumber: `irbi/README.md` §3, §5;
    `riset/A-dokumen-bnpb.md` §1.2. [resmi]
13. **Tiga provinsi IRBI terendah 2023**: Renas hlm. 19 menyebut DKI Jakarta, Papua Pegunungan, DIY; Renstra Tabel 1.1 dan
    API menempatkan Kepulauan Riau (107,79) di bawah DIY (108,15). Konflik antardokumen resmi; keduanya disimpan. Sumber:
    `irbi/README.md` §5. [resmi]
14. **Indeks pemakaian air Jawa 2010**: 54% (dengan aliran pemeliharaan) lawan 42% (tanpa). Sumber sama, definisi
    berbeda; ditulis dengan nama besarannya. Sumber: `air-jawa/ipa_pulau_2010.csv`. [estimasi-model]
15. **Kejadian DIBI dan cakupan**: kejadian kekeringan Jawa per tahun mengukur pelaporan (P2); meninggal nasional 2025 =
    2.030 kejadian bencana, 2.037 semua laporan, 1.735 bencana alam; kejadian nasional 2024 punya tujuh versi (3.636;
    3.548; 3.471,5; 3.472; 3.129; 2.107; 5.593) karena cakupan, waktu tarik, dan patahan pencatatan. Sumber:
    `dibi/README.md` bagian Rekonsiliasi kejadian 2024; `dibi/rekonsiliasi.csv`. [resmi; sebagian sekunder]
16. **Registri angka utama**: `data/angka.json` masih memberi `hidromet.jawa.lanina.tahun_analog` keyakinan resmi (paket:
    asumsi-kebijakan), menunjuk `hidromet.jawa.lanina.pd.cakupan_awal` ke Renstra 6% (lintas indikator), dan memberi
    `irbi.nasional.2015` serta `irbi.nasional.persen_2015_2024` keyakinan resmi (paket irbi: asumsi-kebijakan; turunan).
    Sumber: `skenario-hidromet/README.md` bagian Keterbatasan; `irbi/README.md` §6. [catatan untuk pemilik registri]

### Inferensi

- *Penilaian tim:* sebagian besar pertentangan yang tersisa di kajian air berasal dari angka sekunder (Jatiluhur, Cirata,
  Sutami, NCICD versi kedua, krisis air 2023). Pertentangan antardokumen resmi BNPB hanya dua yang relevan untuk Jawa
  (pengungsi Jabodetabek 2020 dan tiga provinsi terendah 2023) dan keduanya disajikan berdampingan.
- *Penilaian tim:* empat angka cakupan peringatan dini bukan pertentangan, melainkan tiga penyebut berbeda; menuliskannya
  sebagai satu "cakupan peringatan dini" akan menyesatkan pembaca (manfaat 0,2% lawan faktor 0,603).
- *Penilaian tim:* kolom Tabel 3.7 yang cukup: butir; versi; sumber; label; definisi atau besaran; versi yang dipakai;
  alasan. Baris dengan versi sekunder diberi pil sekunder dan tidak dikutip di badan teks.
- *Penilaian tim:* tiga catatan registri di butir 16 perlu dibetulkan pemilik `data/angka.json` sebelum naskah final;
  berkas ini tidak menyuntingnya.

### Celah

- Kapasitas resmi Jatiluhur dan Cirata: permintaan data ke PJT II dan pengelola waduk Cirata.
- Rekaman pengungsi Kota Bekasi Januari 2020: verifikasi ke BPBD Kota Bekasi atau Pusdatinkom; sampai terbukti, uji
  kepekaan dengan dan tanpa rekaman.
- Sumber versi kedua NCICD (43,9 km) tidak dibuka; tidak dikutip.
- Rilis asli Kapusdatinkom tentang krisis air 2023 tidak dibuka; angka 70–80% tidak dikutip di naskah final.
- Teks Juklak 7/2023 di korpus berasal dari salinan di indonesia.unfpa.org karena JDIH BNPB tidak memuat PDF-nya; salinan
  resmi Pusdatinkom dibuka sebelum final.
- KLHS RPJPN 2025–2045 (daya dukung air Jawa) dan lampiran Perpres 12/2025 belum dibuka (riset B §11).

---

## Komponen

| Kode | Komponen | Isi | Sumber data | Kode grafik/pola | Status |
| --- | --- | --- | --- | --- | --- |
| Tabel 3.1 | Matriks resolusi data | komponen × tingkat (kab, provinsi, BBWS/WS, titik, tidak ada) × status × label × pemegang data | `air-jawa/README.md` §3, §6; `air-jawa/kab_jawa.csv` (`tingkat_data_air_minum`); KERANGKA §7 | B5.7; G16 | rancangan di P1 Inferensi |
| Gambar 3.1 | Rantai metode | sumber data → paket → aturan (daftar perhatian, skenario, lantai, kerugian) → bab pemakai; pernyataan produsen di tiap simpul model | KERANGKA §2 butir 5–10, 19; README paket | B5.23; G21 (diagram aliran berikon, tanpa lebar sebanding) | perlu digambar |
| Tabel 3.2 | Korelasi IRBI dan DIBI per bahaya | Spearman per bahaya, n kab, kab IRBI kosong yang berkejadian | `air-jawa/kab_jawa.csv`; kunci `airjawa.jawa.spearman_irbi_dibi.*`, `airjawa.jawa.irbi2025.*` | B5.7 (sebar beranotasi hanya di DOCX, tanpa kata kerja sebab) | angka ada; skrip perlu dipindah ke paket |
| Tabel 3.3 | Aturan daftar perhatian dan uji kepekaan | syarat (a) sampai (e) dengan sumber dan label; empat pilihan yang dikunci; jumlah kab per bahaya per varian; perubahan bila ambang digeser | `air-jawa/kab_jawa.csv`; `air-jawa/dibi_kab_tahun.csv`; kunci `airjawa.perhatian.*` | B5.7 | angka varian ada; varian final belum dikunci |
| Tabel 3.4 | Skala dampak 1–5 per aspek Perban 2/2023 | lima aspek; ambang logaritmik dari sebaran DIBI; aspek tanpa data "tidak dinilai" | `dibi/rekap_provinsi_tahunan.csv`; kunci `dibi.provinsi_tahun.*`; pustaka `bnpb-2023-renkon`, `cabinetoffice-2025-nrr` | B5.7; B5.27 | ambang belum ditetapkan (asumsi kebijakan); syarat sebelum kartu Bab 5–6; urutan KERANGKA §2 butir 9 sudah terlanggar (P3 Celah) |
| Tabel 3.5 | Matriks ketersediaan kuantifikasi | jenis × metrik, kode R/T/E/–, alasan satu kalimat | `skenario-hidromet/kartu_skenario.csv`; `skenario-hidromet/README.md` | G16 | rancangan di P3 Inferensi |
| Tabel 3.6 | Tiga besaran kerugian | aset terpapar KRB; kerugian analog; kebutuhan stimulan (hanya longsor, bandang) | `skenario-hidromet/kartu_skenario.csv`; pustaka `bappenas-2007-dala` | B5.7 | stimulan bersumber sekunder; materiil kartu perlu dipecah |
| Tabel 3.7 | Rekonsiliasi angka | 15 butir P4 dengan versi, sumber, label, definisi, versi dipakai, alasan | P4 | B5.7; PEDOMAN §C6.5 | siap |
| Tabel 3.8 | Indikator yang belum dapat ditarget dan pemegang datanya | dari Celah P1 sampai P4 dan KERANGKA §7 | KERANGKA §7; Celah berkas ini | B5.7 | siap disusun |

Kartu angka bab (bila dipakai di kotak ringkasan bab §B5.3): (1) 0,18–0,20 korelasi IRBI dan DIBI; (2) 114 dari 119 kab
memenuhi syarat frekuensi banjir ≥ 3 tahun; (3) lantai 270 meninggal dan hilang musim hujan Jawa; (4) 35 dari 119 kab
punya data air minum per kab. Semua label sesuai kuncinya.

---

## Angka untuk registri

Usulan kunci baru ditulis lengkap di `naskah/air/bukti/bab-03.angka.json` (bentuk entri sama dengan `data/angka.json`;
semua entri diuji ulang dengan pembaca registri `bangun/kontrak/naskah.py` pada 24 Okt 2026: 94 dari 98 terbaca; empat
kunci kapasitas Jatiluhur dan Cirata berlabel `sekunder` sengaja ditolak karena angka sekunder tidak masuk naskah final).
Kunci
lama dan kunci BAB 1 yang dipakai ulang tidak diulang (daftar di `_catatan` berkas JSON). Nilai di bawah adalah nilai saat
uji, bukan pengganti jalur.

| Kunci | Nilai saat uji | Berkas + jalur, atau pustaka | Label | Sumber |
| --- | --- | --- | --- | --- |
| `airjawa.kab3471.penduduk_worldpop` | 174.017 jiwa | `air-jawa/kab_jawa.csv` `[kode=3471].penduduk_worldpop_2026` | estimasi-model | WorldPop R2025A, penduduk 2026 |
| `airjawa.kab3471.penduduk_krb` | 415.382 jiwa | `air-jawa/kab_jawa.csv` `[kode=3471].penduduk_krb_inarisk` | resmi | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| `airjawa.kab3101.penduduk_worldpop` | 5.689 jiwa | `air-jawa/kab_jawa.csv` `[kode=3101].penduduk_worldpop_2026` | estimasi-model | WorldPop R2025A, penduduk 2026 |
| `airjawa.kab3101.penduduk_krb` | 29.418 jiwa | `air-jawa/kab_jawa.csv` `[kode=3101].penduduk_krb_inarisk` | resmi | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| `airjawa.jawa.irbi2025.n_tinggi` | 1 kab/kota | `irbi/irbi_agregat_pulau.csv` `[pulau_kode=JAW,tahun=2025].n_tinggi` | resmi | InaRISK BNPB, IRBI 2025 (kolom status) |
| `airjawa.jawa.irbi2025.n_sedang` | 118 kab/kota | `irbi/irbi_agregat_pulau.csv` `[pulau_kode=JAW,tahun=2025].n_sedang` | resmi | InaRISK BNPB, IRBI 2025 (kolom status) |
| `airjawa.jawa.irbi2025.kekeringan_nilai_unik` | 15 nilai | pustaka `bnpb-irbi` | resmi; turunan | InaRISK BNPB, IRBI 2025 |
| `airjawa.jawa.irbi2025.kekeringan_median` | 10 | pustaka `bnpb-irbi` | resmi; turunan | InaRISK BNPB, IRBI 2025 |
| `airjawa.jawa.irbi2025.banjir_nilai_unik` | 19 nilai | pustaka `bnpb-irbi` | resmi; turunan | InaRISK BNPB, IRBI 2025 |
| `airjawa.jawa.irbi2025.longsor_nilai_unik` | 17 nilai | pustaka `bnpb-irbi` | resmi; turunan | InaRISK BNPB, IRBI 2025 |
| `airjawa.jawa.irbi2025.longsor_kosong` | 23 kab/kota | pustaka `bnpb-irbi` | resmi | InaRISK BNPB, IRBI 2025 |
| `airjawa.jawa.irbi2025.longsor_kosong_berkejadian` | 15 kab/kota | pustaka `bnpb-irbi` | resmi; turunan | InaRISK BNPB, IRBI 2025; DIBI BNPB 2015–2025 |
| `airjawa.jawa.spearman_irbi_dibi.kekeringan` | 0,178 | pustaka `bnpb-irbi` | asumsi-kebijakan; analisis penyusun atas data resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB dan DIBI BNPB |
| `airjawa.jawa.spearman_irbi_dibi.banjir` | 0,187 | pustaka `bnpb-irbi` | asumsi-kebijakan; analisis penyusun atas data resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB dan DIBI BNPB |
| `airjawa.jawa.spearman_irbi_dibi.longsor` | 0,199 | pustaka `bnpb-irbi` | asumsi-kebijakan; analisis penyusun atas data resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB dan DIBI BNPB |
| `airjawa.perhatian.syarat_b.banjir` | 114 kab/kota | pustaka `bnpb-dibi` | asumsi-kebijakan; turunan dari DIBI resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2015–2025 |
| `airjawa.perhatian.syarat_b.longsor` | 93 kab/kota | pustaka `bnpb-dibi` | asumsi-kebijakan; turunan dari DIBI resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2015–2025 |
| `airjawa.perhatian.syarat_b.kekeringan` | 54 kab/kota | pustaka `bnpb-dibi` | asumsi-kebijakan; turunan dari DIBI resmi | Pengolahan data Pantau Bencana dari DIBI BNPB 2015–2025 |
| `airjawa.perhatian.syarat_a.banjir_interval_sama` | 1 kab/kota | pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari IRBI resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025 |
| `airjawa.perhatian.syarat_a.banjir_kuantil` | 36 kab/kota | pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari IRBI resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025 |
| `airjawa.perhatian.syarat_a.longsor_interval_sama` | 3 kab/kota | pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari IRBI resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025 |
| `airjawa.perhatian.syarat_a.longsor_kuantil` | 32 kab/kota | pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari IRBI resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025 |
| `airjawa.perhatian.syarat_a.kekeringan_interval_sama` | 8 kab/kota | pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari IRBI resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025 |
| `airjawa.perhatian.syarat_a.kekeringan_kuantil` | 32 kab/kota | pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari IRBI resmi | Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025 |
| `airjawa.perhatian.rentang_varian.banjir` | 27–97 kab/kota | pustaka `bnpb-dibi` | asumsi-kebijakan | Pengolahan data Pantau Bencana dari InaRISK BNPB dan DIBI BNPB |
| `airjawa.perhatian.rentang_varian.longsor` | 31–80 kab/kota | pustaka `bnpb-dibi` | asumsi-kebijakan | Pengolahan data Pantau Bencana dari InaRISK BNPB dan DIBI BNPB |
| `airjawa.perhatian.rentang_varian.kekeringan` | 25–59 kab/kota | pustaka `bnpb-dibi` | asumsi-kebijakan | Pengolahan data Pantau Bencana dari InaRISK BNPB dan DIBI BNPB |
| `hidromet.jawa.kekeringan.dibi_kejadian_2015` | 5 kejadian | `skenario-hidromet/kartu_skenario.csv` `[skenario=kekeringan_2015,wilayah=jawa,metrik=dibi_kejadian_2015].nilai` | resmi | DIBI BNPB, kekeringan 2015 |
| `hidromet.jawa.kekeringan.dibi_terdampak_2015` | 213.399 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=kekeringan_2015,wilayah=jawa,metrik=dibi_terdampak_2015].nilai` | resmi | DIBI BNPB, kekeringan 2015 |
| `hidromet.jawa.kekeringan.terpapar_krb` | 152.356.122 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=kekeringan_2015,wilayah=jawa,metrik=terpapar_krb_kekeringan].nilai` | resmi | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| `hidromet.jawa.kekeringan.kerugian_potensi_krb` | 450.079.837.000.000 Rp | `skenario-hidromet/kartu_skenario.csv` `[skenario=kekeringan_2015,wilayah=jawa,metrik=kerugian_potensi_krb_kekeringan].nilai` | resmi | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| `hidromet.jawa.banjir.terpapar_krb` | 63.189.232 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=terpapar_krb_banjir].nilai` | resmi | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| `hidromet.jawa.banjir.kerugian_potensi_krb` | 406.455.114.000.000 Rp | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=kerugian_potensi_krb_banjir].nilai` | resmi | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| `hidromet.jawa.longsor.kerugian_potensi_krb` | 351.716.888.000.000 Rp | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=kerugian_potensi_krb_longsor].nilai` | resmi | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| `hidromet.jawa.musim_2008.meninggal` | 173 jiwa | `skenario-hidromet/musim_hujan.csv` `[wilayah=jawa,tahun_awal=2008].meninggal` | resmi | DIBI BNPB, musim hujan 2008/2009 |
| `hidromet.jawa.musim_2008.hilang` | 97 jiwa | `skenario-hidromet/musim_hujan.csv` `[wilayah=jawa,tahun_awal=2008].hilang` | resmi | DIBI BNPB, musim hujan 2008/2009 |
| `hidromet.jawa.lantai.meninggal_hilang` | 270 jiwa | pustaka `bnpb-dibi` | resmi; turunan | DIBI BNPB, musim hujan 2008/2009 |
| `hidromet.jawa.musim_2013.mengungsi` | 525.861 jiwa | `skenario-hidromet/musim_hujan.csv` `[wilayah=jawa,tahun_awal=2013].mengungsi` | resmi | DIBI BNPB, musim hujan 2013/2014 |
| `hidromet.jawa.musim_2019.mengungsi_tanpa_bekasi` | 166.047 jiwa | pustaka `bnpb-dibi` | resmi; turunan; penyisihan rekaman Kota Bekasi asumsi-kebijakan | DIBI BNPB, musim hujan 2019/2020 |
| `hidromet.jawa.musim_2009.rumah_rb` | 6.905 unit | `skenario-hidromet/musim_hujan.csv` `[wilayah=jawa,tahun_awal=2009].rumah_rb` | resmi | DIBI BNPB, musim hujan 2009/2010 |
| `hidromet.jawa.lanina.korban_jiwa_banjir` | 58,854–147,5556 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=korban_jiwa_banjir].rendah ; [skenario=musim_hujan_lanina,wilayah=jawa,metrik=korban_jiwa_banjir].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana dari DIBI BNPB 2010–2025 |
| `hidromet.jawa.lanina.meninggal_hilang_tercatat_banjir` | 36 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=meninggal_hilang_tercatat_banjir].nilai` | resmi | DIBI BNPB, musim hujan analog |
| `hidromet.jawa.lanina.korban_jiwa_banjir_longsor` | 10,7573–11,0339 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=korban_jiwa_banjir_longsor].rendah ; [skenario=musim_hujan_lanina,wilayah=jawa,metrik=korban_jiwa_banjir_longsor].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana dari DIBI BNPB 2010–2025 |
| `hidromet.jawa.lanina.meninggal_hilang_tercatat_banjir_longsor` | 22 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=meninggal_hilang_tercatat_banjir_longsor].nilai` | resmi | DIBI BNPB, musim hujan analog |
| `hidromet.jawa.terberat.korban_jiwa_banjir` | 49,5066–124,1203 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=korban_jiwa_banjir].rendah ; [skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=korban_jiwa_banjir].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana dari DIBI BNPB 2010–2025 |
| `hidromet.jawa.terberat.meninggal_hilang_tercatat_banjir` | 66 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=meninggal_hilang_tercatat_banjir].nilai` | resmi | DIBI BNPB, musim hujan analog |
| `hidromet.jawa.terberat.korban_jiwa_banjir_longsor` | 2,092–2,1458 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=korban_jiwa_banjir_longsor].rendah ; [skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=korban_jiwa_banjir_longsor].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana dari DIBI BNPB 2010–2025 |
| `hidromet.jawa.terberat.meninggal_hilang_tercatat_banjir_longsor` | 24 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=meninggal_hilang_tercatat_banjir_longsor].nilai` | resmi | DIBI BNPB, musim hujan analog |
| `hidromet.jawa.terberat.korban_jiwa` | 204,5063–447,1256 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=korban_jiwa].rendah ; [skenario=musim_hujan_terberat_tercatat,wilayah=jawa,metrik=korban_jiwa].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana dari DIBI BNPB 2010–2025 |
| `hidromet.jawa.lanina.pd_renas.faktor` | 0,6034 | `skenario-hidromet/kepekaan_peringatan_dini.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,cakupan_awal=renas_2025,cakupan_target=renas_2029].faktor` | asumsi-kebijakan | Pengolahan data Pantau Bencana; rasio mortalitas UNDRR-WMO 2022 |
| `hidromet.jawa.lanina.pd_renstra_ikp.faktor` | 0,998 | `skenario-hidromet/kepekaan_peringatan_dini.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,cakupan_awal=renstra_ikp_2025,cakupan_target=renstra_ikp_2029].faktor` | asumsi-kebijakan | Pengolahan data Pantau Bencana; rasio mortalitas UNDRR-WMO 2022 |
| `hidromet.jawa.lanina.pd_renas.korban_jiwa` | 218,5119–466,4641 jiwa | pustaka `wmo-2022-peringatan-dini` | asumsi-kebijakan | Pengolahan data Pantau Bencana; rasio mortalitas UNDRR-WMO 2022 (menggantikan entri `data/angka.json`; faktor tanpa tanah longsor) |
| `hidromet.jawa.lanina.meninggal_hilang_tercatat` | 156 jiwa | pustaka `bnpb-dibi` | resmi; turunan | DIBI BNPB, musim hujan 2020/2021 (146 + 10) |
| `hidromet.jawa.terberat.meninggal_hilang_tercatat` | 127 jiwa | pustaka `bnpb-dibi` | resmi; turunan | DIBI BNPB, musim hujan 2019/2020 (124 + 3) |
| `hidromet.jawa.lanina.korban_jiwa_longsor` | 163,9803–344,0152 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=korban_jiwa_longsor].rendah ; [...].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana dari DIBI BNPB 2010–2025 |
| `hidromet.jawa.lanina.meninggal_hilang_tercatat_longsor` | 89 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,metrik=meninggal_hilang_tercatat_longsor].nilai` | resmi | DIBI BNPB, musim hujan analog |
| `hidromet.jawa.musim_lanina.rerata_meninggal_hilang` | 148 jiwa | pustaka `bnpb-dibi` | resmi; turunan | DIBI BNPB, 7 musim hujan La Niña Jawa 2008/2009–2025/2026 |
| `hidromet.jawa.musim_lain.rerata_meninggal_hilang` | 149 jiwa | pustaka `bnpb-dibi` | resmi; turunan | DIBI BNPB, 11 musim hujan Jawa lain 2008/2009–2025/2026 |
| `hidromet.jawa.musim_lanina.rerata_mengungsi` | 73.459 jiwa | pustaka `bnpb-dibi` | resmi; turunan | DIBI BNPB, 7 musim hujan La Niña Jawa |
| `hidromet.jawa.musim_lain.rerata_mengungsi` | 173.977 jiwa | pustaka `bnpb-dibi` | resmi; turunan | DIBI BNPB, 11 musim hujan Jawa lain |
| `hidromet.jawa.musim.kemungkinan_lantai_5th` | 24,3 % | pustaka `bnpb-dibi` | asumsi-kebijakan; turunan dari DIBI resmi | Pengolahan data Pantau Bencana dari DIBI BNPB, 18 musim hujan Jawa |
| `bukti.wmo_2022.rasio_mortalitas` | 8 kali | `skenario-hidromet/kepekaan_peringatan_dini.csv` `[skenario=musim_hujan_lanina,wilayah=jawa,cakupan_awal=renas_2025,cakupan_target=renas_2029].R` | terverifikasi | UNDRR dan WMO (2022), Global Status of Multi-Hazard Early Warning Systems |
| `airjawa.bendungan.jatiluhur.kapasitas_v1` | 3.000 juta m3 | `air-jawa/bendungan_angka.csv` `[id=jatiluhur,besaran=kapasitas,catatan=versi 1; bertentangan].nilai` | sekunder (label paket; ditolak pembaca registri, sengaja) | riset B §3.1 (artikel dan jurnal berbeda) |
| `airjawa.bendungan.jatiluhur.kapasitas_v2` | 2.440 juta m3 | `air-jawa/bendungan_angka.csv` `[id=jatiluhur,besaran=kapasitas,catatan=versi 2; bertentangan; minta data PJT II].nilai` | sekunder (label paket; ditolak pembaca registri, sengaja) | riset B §3.1 (artikel dan jurnal berbeda) |
| `airjawa.bendungan.cirata.kapasitas_v1` | 2.165 juta m3 | `air-jawa/bendungan_angka.csv` `[id=cirata,besaran=kapasitas,catatan=versi 1; bertentangan].nilai` | sekunder (label paket; ditolak pembaca registri, sengaja) | riset B §3.1 |
| `airjawa.bendungan.cirata.kapasitas_v2` | 1.900 juta m3 | `air-jawa/bendungan_angka.csv` `[id=cirata,besaran=kapasitas,catatan=versi 2; bertentangan].nilai` | sekunder (label paket; ditolak pembaca registri, sengaja) | riset B §3.1 |
| `airjawa.irigasi.jatiluhur.luas_di` | 237.790 ha | `air-jawa/bendungan_angka.csv` `[id=jatiluhur,besaran=luas_di].nilai` | resmi | Permen PUPR 14/PRT/M/2015 Lampiran I |
| `airjawa.irigasi.jatiluhur.bekasi_ha` | 52.728 ha | pustaka `pupr-2015-permen14, hlm. 16` | resmi | Permen PUPR 14/PRT/M/2015 Lampiran I |
| `hidromet.jawa.jabodetabek2020.mengungsi_dibi` | 433.628 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=kasus_jabodetabek_2020,wilayah=jawa,metrik=mengungsi].nilai` | resmi | DIBI BNPB, 31 Des 2019–8 Jan 2020, 14 kab/kota Jabodetabek |
| `hidromet.jawa.jabodetabek2020.mengungsi_dibi_lebak` | 449.791 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=kasus_jabodetabek_2020,wilayah=jawa,metrik=mengungsi_jabodetabek_lebak].nilai` | resmi | DIBI BNPB, Jabodetabek dan Lebak |
| `hidromet.jawa.jabodetabek2020.pengungsi_renstra` | 11.569 jiwa | `skenario-hidromet/kartu_skenario.csv` `[skenario=kasus_jabodetabek_2020,wilayah=jawa,metrik=pengungsi_renstra].nilai` | resmi | Renstra BNPB 2025–2029 |
| `bukti.dala_jabodetabek_2007.kerugian` | 5.184.430.000.000 Rp | `skenario-hidromet/kartu_skenario.csv` `[skenario=musim_hujan_lanina,wilayah=nasional,metrik=pembanding_rugi_banjir_jabodetabek_2007].nilai` | resmi | Bappenas (2007), penilaian kerusakan dan kerugian banjir Jabodetabek |
| `ncicd.fase_a.trase_kritis_km` | 39 km | pustaka `dsda-2025-ncicd` | resmi | Dinas SDA DKI Jakarta, data 17 Juli 2025 |
| `ncicd.fase_a.kewenangan_dki_km` | 20,9 km | pustaka `dsda-2025-ncicd` | resmi | Dinas SDA DKI Jakarta, data 17 Juli 2025 |
| `ncicd.fase_a.terbangun_km` | 9,4 km | pustaka `dsda-2025-ncicd` | resmi | Dinas SDA DKI Jakarta, data 17 Juli 2025 |
| `juklak_2023.ambang.meninggal` | 1 orang | pustaka `bnpb-2023-standar-data, hlm. 7` | resmi | Juklak BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana |
| `juklak_2023.ambang.terdampak` | 50 orang | pustaka `bnpb-2023-standar-data, hlm. 7` | resmi | Juklak BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana |
| `juklak_2023.ambang.rumah_rusak` | 5 unit | pustaka `bnpb-2023-standar-data, hlm. 7` | resmi | Juklak BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana |
| `juklak_2023.ambang.lahan` | 1 ha | pustaka `bnpb-2023-standar-data, hlm. 7` | resmi | Juklak BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana |
| `perka_2008.air_bersih_liter_hari` | 15 liter per orang per hari | pustaka `bnpb-2008-kebutuhan-dasar, hlm. 10` | resmi | Perka BNPB 7/2008 |
| `perka_2008.air_minum_liter_hari` | 2,5 liter per orang per hari | pustaka `bnpb-2008-kebutuhan-dasar, hlm. 10` | resmi | Perka BNPB 7/2008 |
| `nrr_2025.periode_kemungkinan_tahun` | 5 tahun | pustaka `cabinetoffice-2025-nrr, hlm. 12` | terverifikasi | Cabinet Office (2025), National Risk Register |
| `nrr_2025.pita1_batas_persen` | 0,2 % | pustaka `cabinetoffice-2025-nrr, hlm. 16` | terverifikasi | Cabinet Office (2025), National Risk Register |
| `nrr_2025.pita5_batas_persen` | 25 % | pustaka `cabinetoffice-2025-nrr, hlm. 12` | terverifikasi | Cabinet Office (2025), National Risk Register |
| `enso.lanina_ndj_porsi_jendela5` | 84,7 % | pustaka `noaa-2026-oni` | asumsi-kebijakan; turunan dari ONI | Pengolahan data Pantau Bencana dari NOAA CPC, indeks ONI |
| `enso.elnino_kuat_porsi_jendela5` | 38,9 % | pustaka `noaa-2026-oni` | asumsi-kebijakan; turunan dari ONI | Pengolahan data Pantau Bencana dari NOAA CPC, indeks ONI |
| `dibi.provinsi_tahun.meninggal_hilang.p50` | 4 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.meninggal_hilang.p90` | 41 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.meninggal_hilang.p99` | 391 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.meninggal_hilang.maks` | 4.845 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.mengungsi.p50` | 1.402 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.mengungsi.p90` | 32.484 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.mengungsi.p99` | 239.158 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.mengungsi.maks` | 947.399 jiwa | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.rumah_rusak.p50` | 414 unit | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.rumah_rusak.p90` | 5.521 unit | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.rumah_rusak.p99` | 44.445 unit | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |
| `dibi.provinsi_tahun.rumah_rusak.maks` | 271.693 unit | pustaka `bnpb-dibi` | resmi; turunan | Pengolahan data Pantau Bencana dari DIBI BNPB 2008–2025 |

---

## Pustaka

Entri CSL-JSON di `naskah/air/bukti/bab-03.pustaka.json` (23 entri, semuanya sumber berbeda). Entri yang sudah ada di
`pustaka.json` atau `bab-01.pustaka.json` disalin identik supaya penggabungan tidak bentrok.

| Kunci | Sumber | Dipakai untuk | Verifikasi |
| --- | --- | --- | --- |
| `bnpb-2025-renas` | Perban BNPB 1/2025, Renas PB 2025–2029 | indikator 1.c (P4 butir 9) | primer |
| `bnpb-2025-renstra` | Perban BNPB 5/2025, Renstra BNPB 2025–2029 | IKP peringatan dini hlm. 70, 133, 161; Jabodetabek 2020 | primer |
| `bnpb-2023-renkon` | Perban BNPB 2/2023, Penyusunan Rencana Kontingensi Bencana | Pasal 7; lampiran sejarah terburuk | primer |
| `bnpb-2023-satudata` | Perban BNPB 1/2023, Satu Data Bencana | Pasal 1 angka 3 dan 6 | primer |
| `bnpb-2023-standar-data` | Juklak BNPB 7/2023, Standar Data Kejadian dan Dampak Bencana | ambang kejadian, metode hitung | primer (salinan non-JDIH) |
| `bnpb-2012-pengkajian-risiko` | Perka BNPB 2/2012, Pedoman Umum Pengkajian Risiko Bencana | dasar IRBI dan KRB | primer (batang tubuh) |
| `bnpb-2008-kebutuhan-dasar` | Perka BNPB 7/2008, Pemenuhan Kebutuhan Dasar | standar air bersih dan air minum | primer |
| `bnpb-2018-pengungsi` | Perban BNPB 3/2018, Penanganan Pengungsi | baris kebutuhan respons | primer (judul) |
| `bnpb-irbi` | IRBI kab/kota 2015–2025, InaRISK | P2 | primer |
| `bnpb-dibi` | DIBI BNPB | P2, P3, P4 | primer |
| `bnpb-2026-krb` | KRB 2022–2026 per kab/kota, InaRISK | penduduk, paparan, aset terpapar | primer |
| `worldpop-2025` | WorldPop R2025A | penduduk pembanding | primer |
| `bps-2020-slhi` | BPS, Statistik Lingkungan Hidup Indonesia 2020 | CAT, IPA, neraca | primer |
| `pupr-2015-permen14` | Permen PUPR 14/PRT/M/2015 | irigasi per kab | primer |
| `pupr-2015-permen04` | Permen PUPR 04/PRT/M/2015 | wilayah sungai | primer |
| `bbwspj-2021-bendungan` | Inventaris bendungan BBWS Pemali-Juana 2021 | bendungan resmi, sedimentasi | primer |
| `noaa-2026-oni` | NOAA CPC, Oceanic Niño Index | laju dasar ENSO | primer |
| `cabinetoffice-2025-nrr` | Cabinet Office, National Risk Register 2025 | definisi skenario, pita kemungkinan, skala dampak | primer |
| `wmo-2022-peringatan-dini` | WMO, siaran pers laporan UNDRR dan WMO 2022 | R = 8 | primer |
| `bappenas-2007-dala` | Bappenas, DaLA banjir Jabodetabek 2007 | kerugian analog | primer (salinan non-Bappenas) |
| `dsda-2025-ncicd` | Dinas SDA DKI Jakarta, progres NCICD Juli 2025 | rekonsiliasi NCICD | primer |
| `yamamoto-1984-tokyo` | Yamamoto, UNESCO 1984, studi kasus Tokyo | catatan P16 (Bab 8), bukan kepekaan | primer |
| `tanaka-2013-bangkok` | Tanaka dan Mio, abstrak JpGU 2013, Bangkok | catatan P16 (Bab 8), bukan kepekaan | sekunder untuk angka Bangkok (abstrak mengutip Phien-wej dkk. 2006; primer belum dibuka) |

---

## Catatan wajib untuk penulis bab

- Program tidak dibahas di Bab 3; P16 (pengendalian pengambilan air tanah, Tokyo dan Bangkok) dipindah ke bab program
  (Bab 8). Bila disebut, ikuti kolom `kekuatan` dan `posisi` (`program-terbukti/kompendium_program.csv`; P16: `kuat`,
  "Program (bukti kuat)") dan sertakan tiga catatan: (1) `jenis_eval` P16 `data-resmi-pra-pasca`, perbandingan sebelum
  dan sesudah tanpa pembanding atau kontrafaktual, sehingga penurunan laju belum dapat dipisahkan dari sebab lain;
  (2) kedua angka Bangkok (120 mm per tahun pada 1981; 20 mm per tahun "dalam tahun-tahun terakhir", tanpa periode) dan
  kaitannya dengan pembatasan pompa dikutip abstrak Tanaka dan Mio (2013) dari Phien-wej dkk. (2006), yang belum
  dibuka, jadi sekunder (periode 2007–2010 di `bukti_dampak.csv` B101 adalah periode data penulis di sekitar Sungai Tha
  Chin, bukan periode angka 20 mm Bangkok); hanya bukti Tokyo (B095–B099) yang dibuka langsung; (3) keberlakuan di Jawa
  belum dibahas (pasokan air perpipaan pengganti rendah di pantura, `celah` P16). Jangan menyebut P16 "terbukti" di
  Bab 3; usulan menurunkan kekuatan ke sedang atau menambah catatan desain adalah keputusan pemilik paket
  program-terbukti (Celah).
- Angka model selalu disandingkan dengan angka tercatat musim atau wilayah yang sama (P3); pita yang jatuh di bawah lantai
  tidak boleh tampil tanpa catatan.
- Angka yang bertentangan ditulis berdampingan di Tabel 3.7; badan teks hanya mengutip versi yang dipakai.
- Tanpa pagu dan tanpa biaya proyek (P5): rupiah di bab ini hanya nilai aset terpapar, kerugian kejadian analog, dan
  kebutuhan stimulan berlabel.
- Istilah: "penurunan muka tanah", bukan "subsiden"; "prabencana", "tanggap darurat", "pascabencana".

---

## Catatan pemeriksaan temuan (24 Oktober 2026)

Delapan temuan pemeriksa dicek ke sumber sebelum disunting. Tujuh diterima utuh dan satu diterima dengan penyesuaian;
tidak ada yang ditolak.

| No | Temuan | Hasil cek ke sumber | Tindakan |
| --- | --- | --- | --- |
| 1 | Faktor peringatan dini dikalikan ke korban longsor | KERANGKA §2 butir 10 memuat "dipecah per jenis; longsor tidak dihitung"; korban model longsor 163,98–344,02 dari 254,354–546,9468 (`kartu_skenario.csv`); hitung ulang 218,5–466,5 | Diterima. 3.8 ditulis ulang; kunci `hidromet.jawa.lanina.pd_renas.korban_jiwa` diusulkan bernilai baru; Celah memuat pembangunan ulang `kepekaan_peringatan_dini.csv`. Penyesuaian: jenis gabungan "banjir dan tanah longsor" tetap dikalikan (bukan jenis tanah longsor di `tema.json`), varian tanpa jenis itu 223–471 ditulis berdampingan |
| 2 | Peluang fase ENSO dipakai sebagai kemungkinan skenario | NRR hlm. 12 dibuka ulang: yang dinilai peluang skenario terburuk itu sendiri terjadi; hitung ulang `musim_hujan.csv` mengonfirmasi rerata 148 lawan 149 dan 73.459 lawan 173.977, tiga musim mengungsi terbesar bukan La Niña; uji permutasi p = 0,98 dan 0,20 | Diterima. ENSO menjadi konteks; temuan "kaitan tidak terdeteksi" ditambahkan sebagai temuan bersumber; kemungkinan diganti frekuensi musim ≥ lantai (24,3%, pita 4); Tabel 3.5 kolom Kemungkinan diganti; nama "skenario La Niña" diganti "musim analog 2020/2021" di berkas ini. Catatan untuk pemilik KERANGKA: §2 butir 9 menyebut ONI sebagai sumber per jenis "untuk fase ENSO"; berkas ini membacanya sebagai sumber peluang pemicu, bukan peluang skenario, sesuai definisi butir yang sama dan NRR. Bila ONI tetap mau dipakai, kaitan pemicu dengan dampak perlu ditunjukkan dulu |
| 3 | Inti P3 menyatakan ambang sudah ditetapkan | Tabel 3.4 berstatus "ambang belum ditetapkan", sedangkan `kartu_skenario.csv` sudah berisi angka | Diterima, jalur kedua perbaikan: Inti menyatakan "belum ditetapkan" dan pelanggaran urutan; syarat penetapan dan pembekuan ambang dipindah ke Celah sebelum Bab 5–6. Ambang tidak ditetapkan di berkas bukti karena memilihnya adalah Asumsi kebijakan untuk sesi induk atau pemilik, dan unit skala (provinsi-tahun lawan musim Jawa) belum diputus |
| 4 | Angka varian kekeringan (c) persis teks hilang dari tabel | Hitung ulang dari `kab_jawa.csv` dan `dibi_kab_tahun.csv` memberi 25 dan 41, dan semua angka lain di tabel cocok | Diterima. Tabel diisi 25 (37) dan 41 (47); `rentang_varian.kekeringan` menjadi 25–59 |
| 5 | Label nilai hasil hitung lebih tinggi dari dasarnya | Konvensi bab: olah(x) = label x + "turunan"; label paket Jatiluhur dan Cirata `sekunder` | Diterima. 18 kunci menjadi "resmi; turunan"; `mengungsi_tanpa_bekasi` ditambah penyisihan rekaman asumsi-kebijakan. Penyesuaian: Jatiluhur dan Cirata berlabel `sekunder` sesuai perbaikan, tetapi label itu bukan satu dari lima label `tema.json`, sehingga pembaca registri menolak menyuntiknya (94 dari 98 terbaca). Ini dibiarkan sengaja karena angka sekunder tidak boleh masuk naskah final; Tabel 3.7 draf menulisnya sebagai pembanding berpil sekunder |
| 6 | Pita model melampaui tercatat tanpa penjelasan; pembanding tidak sebanding | `kartu_skenario.csv`: meninggal dan hilang tercatat 156 (2020/2021) dan 127 (2019/2020); `rasio_korban.csv`: rasio Jawa turun sementara kejadian naik | Diterima. Pembanding diganti meninggal dan hilang; mekanisme (kejadian musim analog × rasio 2010–2025) ditulis sebagai temuan dan dugaan intensitas pelaporan sebagai Inferensi; kunci pembanding ditambahkan |
| 7 | Tujuh kab tertaut: kalimat Jakarta keliru, Demak gabungan, Surabaya LOS, pasangan Bandung | `subsiden_kota.csv`: baris Harintaka dkk. (2024) terverifikasi menyebut 3172 dan 3216 tanpa angka; Aditiya dan Ito (2023) wilayah gabungan; Anjasmara dkk. (2020) laju LOS; Virtriana dkk. (2026) pasangan menurut urutan | Diterima. Kalimat Jakarta dikoreksi; tujuh angka disajikan dengan kolom besaran, periode, dan catatan wajib; syarat (d) P2 diberi catatan yang sama |
| 8 | P16 disebut bukti kuat di analisis kepekaan | `kompendium_program.csv` P16: `jenis_eval` `data-resmi-pra-pasca`, `kekuatan` `kuat`; abstrak Tanaka dan Mio (2013) dibuka ulang: kedua angka Bangkok dikutip dari Phien-wej dkk. (2006); primer gagal dibuka | Diterima dengan batas kewenangan: P16 keluar dari 3.8 dan dipindah ke bab program; catatan desain sebelum-sesudah dan status sekunder Bangkok ditulis di Catatan wajib; pustaka `tanaka-2013-bangkok` menjadi sekunder. Kolom `kekuatan` paket tidak diubah di berkas ini karena milik paket program-terbukti; usul peninjauan masuk Celah. Tuas penurunan muka tanah yang diwajibkan KERANGKA §2 butir 10 dicatat "belum dihitung untuk Jawa" |

Koreksi tambahan yang ditemukan saat mengecek temuan 2 dan 3: NRR menilai tiap dimensi dampak 0–5 lalu menggabungkannya
menjadi skor 1–5 (hlm. 13, 15), bukan langsung skala 1–5 per dimensi; kalimat 3.6 dan catatan pustaka
`cabinetoffice-2025-nrr` dibetulkan. Entri pustaka `tanaka-2013-bangkok` di `bab-02`, `bab-06`, `bab-07`, `bab-08`, dan
`bab-10.pustaka.json` masih berverifikasi "primer" dan perlu diselaraskan saat penggabungan.
