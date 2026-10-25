---
kajian: rehab
bab: 3
judul: METODOLOGI DAN DATA
jenis: berkas bukti
status: draf bukti
disusun: 25 Oktober 2026
dasar: rehab/KERANGKA.md §1, §4 Bab 3, §5, §10; rehab/KEPUTUSAN-AWAL.md (Q1–Q20 disetujui, R1–R5); KEPUTUSAN.md; PEDOMAN-DESAIN.md §C9; Buku Pegangan L56–L64
---

# BAB 3 METODOLOGI DAN DATA: berkas bukti

Bahan penulis Bab 3 *Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030*. Penulis bab
hanya menulis dari berkas ini dan dari registri angka (`data/angka.json`, ditambah usulan `bab-03.angka.json` setelah
digabung sesi induk). Kalimat faktual yang tidak ada di sini dipindah ke Celah atau dihapus (PEDOMAN §C9).

**Konvensi.**

- Jalur berkas relatif ke `data/kajian-bnpb/`. Kunci registri ditulis `kunci:`; kunci usulan berkas ini bernamespace
  `rehab.*` dan ada di `bab-03.angka.json`.
- Label keyakinan: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan` (KEPUTUSAN-AWAL R3). Tambahan
  setelah titik koma menjelaskan asal, mis. `resmi; dijumlah penyusun bukti`. Status `sekunder` berarti angka dibaca
  dari kutipan pihak lain; hanya boleh di tabel rekonsiliasi atau lampiran, tidak di badan teks (R3, Q16).
- Butir bertanda **[dihitung penyusun bukti]** dihitung 25 Okt 2026 dengan Python stdlib dari berkas paket yang
  disebut, saringan tertulis. Jembatan per kejadian sudah ada di `bangun/rehab_angka.py` (uji diri RB per kejadian);
  hitungan lain belum, dan sebelum naskah final dipindah ke skrip itu (KERANGKA §12) oleh pemilik paket.
- Bagian "Inferensi" adalah analisis tim penyusun, bukan fakta sumber, dan tidak boleh ditulis dengan suara sumber.
- Saringan bawaan DIBI di berkas ini: `klasifikasi = alam`, `cakupan = bencana`, tahun final ≤ 2025. Tahun 2026
  sementara (ditarik 23 Okt 2026) dan tidak masuk jumlah periode.

---

## 0. Kontrak bab (dari rehab/KERANGKA.md §4, BAB 3)

**Judul:** BAB 3 METODOLOGI DAN DATA (perkiraan 8 hlm).

**Subbab:** 3.1 Data, Produsen, dan Label; 3.2 DIBI untuk Beban RR: Kolom, Patahan, dan Batas Tafsir; 3.3 Data Air
dan Akses di Luar DIBI; 3.4 Skenario Terburuk Beban RR; 3.5 Biaya Satuan sebagai Pembanding; 3.6 Aturan Daftar
Perhatian RR; 3.7 Rekonsiliasi Angka; 3.8 Keterbatasan.

**Tujuan bab:** membuat semua angka beban, skenario, dan daftar perhatian dapat diperiksa.

**Pertanyaan kunci dan subbab yang dijawabnya:**

| No | Pertanyaan kunci | Subbab |
| --- | --- | --- |
| P1 | Apa yang dapat dan tidak dapat dibaca dari DIBI untuk rumah, jembatan, dan air? | 3.1, 3.2, 3.3 |
| P2 | Bagaimana lantai skenario dan empat besaran RR didefinisikan? | 3.4, 3.5 |
| P3 | Kab/kota mana masuk daftar perhatian dan dengan aturan apa? | 3.6 |
| P4 | Angka mana yang berbeda versi? | 3.7, 3.8 |

**Aturan daftar perhatian RR (3.6, kutipan KERANGKA):** kab/kota masuk bila memenuhi ≥ 2 dari: (a) IRBI 2025 bahaya
banjir, longsor, atau gempa di kelas nilai teratas nasional; (b) jembatan rusak tercatat ≥ 1 pada ≥ 2 tahun dari
2018–2025 (turunan baru per kab); (c) rumah RB 2015–2025 di kuartil atas; (d) berada di CAT berzona kritis atau rusak,
atau di kawasan penurunan muka tanah terverifikasi (penanda kehati-hatian air tanah, bukan syarat prioritas bantuan).
Uji kepekaan ambang; label asumsi-kebijakan.

**Status data (KERANGKA):** sebagian; turunan baru dibutuhkan: jembatan rusak per kab 2018–2025, rumah RB per kab
2015–2025.

**Temuan kunci yang diharapkan KERANGKA, hasil cek ke data 25 Okt 2026:**

| Butir KERANGKA | Hasil cek | Status |
| --- | --- | --- |
| `jembatan_rusak` DIBI 0 untuk 2008–2017; seri efektif 2018 | `dibi/rekap_nasional_tahunan.csv`: 0 di semua baris 2008–2017; 275 (2018) sampai 1.088 (2025) | cocok |
| DIBI tidak punya kolom SPAM | `dibi/mentah/dibi_nasional.json`: 19 kolom dampak, tanpa air, jalan, atau status jalan | cocok, diperluas (P1) |
| Jembatan 2018–2025 3.833; 2025 1.088 | sama, dua berkas rekap | cocok |
| Porsi banjir "sekitar 91%" (3.490); longsor 250, gempa 90, erupsi 52 | kode 101 = 3.419 (89,2%); longsor 246, gempa 52, erupsi 51. Angka KERANGKA/riset F ikut menjumlah 2026 (banjir +71, gempa +38, longsor +4, erupsi +1) | **tidak cocok; dikoreksi** (P4) |
| Rumah RB per jenis 2015–2025: gempa 182.522, banjir 105.016, cuaca ekstrem 25.469, longsor 13.580 | gempa 152.659, banjir 104.296, cuaca ekstrem 24.876, longsor 12.865; selisih = baris 2026 (gempa 29.863) | **tidak cocok; dikoreksi** (P4) |
| Jembatan Sumatra 2025: DIBI tiga provinsi 744 lawan BNPB 498 lawan PU 14 nasional Aceh | 744 cocok; ditambah DIBI jendela kejadian 726 dan PU 1.181 jembatan daerah terdampak (7 Mei 2026, resmi) | cocok, diperluas (P4) |
| Rumah rusak Sumatra: DIBI 228.006; BNPB sekitar 147.000; PKP 189.308 | cocok; dua yang terakhir dibaca dari berita media (JawaPos, Investortrust) dan Info Singkat DPR; rilis lembaga asal belum dibuka | cocok; label turun ke terverifikasi (media), lampiran saja (P4) |
| Cianjur DIBI 57.337 lawan R3P 114.315 | cocok; ditambah Renstra 56.548 dan DIBI Kab. Cianjur saja 56.278 | cocok, diperluas |
| SPAM Sumatra 176 lawan 178; 143 berfungsi (2 Feb 2026) lawan 153 sekunder | cocok; target permanen Agustus 2028 ternyata hanya untuk 60 SPAM Sumatera Barat | cocok; **satu koreksi lingkup** |
| Turunan jembatan per kab 2018–2025 | tidak ada di paket; `dibi/mentah/dibi_peristiwa.json` memuat `jembatan_rusak` per kab hanya untuk 24 kejadian besar | **tidak terpenuhi** (P3 Celah) |
| Turunan rumah RB per kab 2015–2025 | `skenario-hidromet/dibi_kab.csv` ber-RB tetapi periode 2008–2026; `dibi_kab_tahun.csv` per tahun tetapi hanya rumah rusak total | **tidak terpenuhi**; dipakai proksi (P3) |

---

## P1. Apa yang dapat dan tidak dapat dibaca dari DIBI untuk rumah, jembatan, dan air?

### Inti

DIBI dapat dipakai untuk rumah rusak (RB, RS, RR) sejak 2008 dan untuk jumlah jembatan rusak sejak 2018, per tahun,
jenis, dan provinsi. DIBI tidak dapat dipakai untuk kerusakan sistem air, panjang jalan rusak, status jalan dan
jembatan, maupun waktu pulih, karena tabel publiknya tidak memuat kolom itu. Juklak BNPB 7/2023 meminta jembatan
menurut RB/RS/RR, jalan dalam km, dan jaringan air dalam uraian dan rupiah; status jembatan dan durasi pulih tidak
diminta Juklak sama sekali. Untuk gempa, jumlah jembatan DIBI per kejadian sangat rendah (Lombok 2018 nol), jadi angka jembatan DIBI adalah
batas bawah, bukan inventaris.

### Temuan bersumber

**Kolom yang ada dan patahannya**

- Tabel DIBI publik `pdsi_staging.mv_dibi_dampak_by_kejadian` memuat 19 kolom dampak: meninggal, hilang, luka/sakit,
  menderita, mengungsi, menderita_mengungsi, rumah rusak berat/sedang/ringan/total, rumah terendam, pendidikan, rumah
  ibadat, fasyankes, fasum, kantor, jembatan rusak, estimasi kerugian rumah, dan jumlah baris, ditambah jumlah kejadian.
  Tidak ada kolom air minum, SPAM, sumur, jalan, status jalan, atau hari pulih. Sumber: `dibi/mentah/dibi_nasional.json`
  medan `tabel` dan satu baris `data`; `dibi/README.md` bagian Mentah; `kunci: rehab.dibi.kolom_dampak_n`. [resmi]
- Jembatan rusak bernilai 0 di semua baris 2008–2017; 2018–2025: 275; 433; 487; 505; 342; 258; 445; 1.088, jumlah
  3.833; 2026 sampai 23 Okt: 114 (sementara). Sumber: `dibi/rekap_nasional_tahunan.csv` [dihitung penyusun bukti];
  `kunci: rehab.dibi.jembatan_rusak.2018_2025`, `rehab.dibi.jembatan_rusak.2025`,
  `rehab.dibi.jembatan_rusak.nol_2008_2017`. [resmi]
- Pada cakupan semua laporan jumlahnya 3.887 (selisih 54, muncul sejak patahan `is_bencana` 2024); semua klasifikasi
  2025 = 1.114 (26 dari nonalam dan lainnya). Sumber: berkas sama; `kunci: rehab.dibi.jembatan_rusak.semua_laporan_2018_2025`.
  [resmi; dijumlah penyusun bukti]
- Per jenis 2018–2025: banjir 3.419 (89,2%), longsor 246, gempa 52, erupsi 51, cuaca ekstrem 37, gelombang 28;
  kekeringan, karhutla, dan tsunami 0. Sumber: `dibi/rekap_nasional_tahunan.csv` kolom `kode_jenis_juklak`
  [dihitung penyusun bukti]; `kunci: rehab.dibi.jembatan_rusak.banjir_2018_2025` dan lima kunci per jenis.
  [resmi] **Dibantah oleh:** riset F §2 dan KERANGKA §0, §4 (3.490 dan 91%; gempa 90), yang terbukti ikut menjumlah
  baris 2026 (lihat P4).
- Rumah RB 2015–2025 301.311, RS 256.321, RR 743.198. Kolom `rumah_rusak_sedang` bernilai 0 pada 2008–2009, sehingga
  RS tidak sebanding sebelum 2010. Sumber: berkas sama [dihitung penyusun bukti]; `kunci: rehab.dibi.rumah_rb.2015_2025`,
  `rehab.dibi.rumah_rs.2015_2025`, `rehab.dibi.rumah_rr.2015_2025`. [resmi]
- `fasum_rusak` 2015–2025 = 21.703, tetapi kolom ini 0 pada 2008–2009 dan pada 2017 (2016: 1.396; 2018: 3.680), jadi
  tahun 2017 tidak boleh dibaca sebagai "tanpa kerusakan fasum". Kategori ini tidak memisah SPAM. Sumber: berkas sama;
  `kunci: rehab.dibi.fasum_rusak.2015_2025`. [resmi]
- Patahan seri 2024 berlaku untuk tren: sebelum 2024 semua laporan ditandai bencana; kategori nonalam dan sosial
  praktis baru sejak 2024. Sumber: `dibi/README.md` bagian Patahan seri 2024. [resmi]
- Jumlah DIBI per kab bisa menghitung satu orang di lebih dari satu laporan; meninggal = nominal terakhir, mengungsi =
  nominal terbesar (Juklak 7/2023 hlm. 21–22). Sumber: `dibi/README.md` bagian Definisi; pustaka `bnpb-2023-standar-data`.
  [resmi]

**Yang diminta standar data tetapi tidak tampil di DIBI**

- Juklak BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana butir 5e mendaftar data kerusakan dan kerugian
  prasarana dan sarana vital: jaringan air bersih/minum; listrik dan penerangan; telekomunikasi; irigasi; jalan dan
  jembatan; transportasi. Sumber: korpus `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` hlm. PDF 8; pustaka
  `bnpb-2023-standar-data`; `kunci: rehab.juklak7.prasarana_vital_n`. [resmi; teks dari salinan non-JDIH]
- Formulir Juklak yang sama hanya memuat "Jalan: km" dan "Jembatan: RB RS RR" (hlm. 12). Petunjuk isian jalan
  menyebut status jalan sebagai contoh panjang jalan yang diisi ("seperti jalan nasional, provinsi, kabupaten, kota dan
  jalan desa", hlm. 23–24), bukan kolom terpisah; klasifikasi penyajian panjang jalan hanya wilayah dan jenis bencana
  (hlm. 38). Petunjuk jembatan hanya "Tuliskan jumlah jembatan rusak akibat bencana", satuan unit, tanpa status jalan
  (hlm. 24); definisi jembatan "jalan yang terletak di atas permukaan air dan/atau di atas permukaan tanah" dengan
  klasifikasi penyajian wilayah, jenis bencana, dan jenis kerusakan bangunan (hlm. 29, 38). Waktu atau hari pulih tidak
  diminta di bagian mana pun. Jaringan air bersih/minum hanya diisi uraian dan taksiran kerugian (Rp juta), tanpa
  satuan fisik atau jiwa (hlm. 12, 23). Sumber: korpus sama (dicek ulang 25 Okt 2026, hlm. 12, 23, 24, 29, 38). [resmi]
- Perban BNPB 1/2023 Pasal 1 angka 4: Satu Data Bencana adalah kebijakan tata kelola data yang akurat, mutakhir,
  terpadu, dan dapat dibagipakaikan. Sumber: korpus `perban-nomor-1-tahun-2023.json` hlm. 2; pustaka `bnpb-2023-satudata`.
  [resmi]

**Uji jembatan per kejadian (batas tafsir)**

- Jembatan rusak DIBI pada jendela yang sama persis dengan `dibi/kejadian_besar.csv` (tanggal WIB, kategori, provinsi,
  dan kab bila kolom `cakupan_atau_jendela` menyebutnya): Sumatra 2025 726 (Aceh 479, Sumatera Barat 178, Sumatera
  Utara 69; 38 kab dengan jembatan rusak > 0, terbanyak Bener Meriah 144, Aceh Utara 66, Aceh Tengah 61); Seroja 2021
  95; Jabodetabek 2020 33 (Kab. Bogor saja); Ambon 2019 10; Semeru 2021 9; Sulteng 2018 7; Sulbar 2021 7; Cianjur 2022
  2; Demak 2024 0; **Lombok 2018 0**. Uji diri per kejadian: RB jendela sama dengan `kejadian_besar.csv` untuk 25 dari
  25 kejadian berjendela. Sumber: `dibi/mentah/dibi_peristiwa.json` lewat `bangun/rehab_angka.py` (memakai ulang
  `dibi.baris_peristiwa`) [dihitung penyusun bukti]; `kunci: rehab.dibi.jembatan_rusak.sumatra2025_jendela`,
  `rehab.dibi.jembatan_rusak.lombok2018`, `rehab.dibi.jembatan_rusak.sulteng2018`, `rehab.dibi.jembatan_rusak.cianjur2022`,
  `rehab.dibi.jembatan_rusak.seroja2021`, `rehab.dibi.jembatan_rusak.jabodetabek2020`, `rehab.dibi.jembatan_rusak.demak2024`.
  [resmi]
- Koreksi atas versi bukti sebelumnya (Jabodetabek 36, Demak 2): versi itu hanya menyaring tanggal dan provinsi. Tanpa
  saringan kab, RB Jabodetabek menjadi 2.244 (bukan 730) dan jembatannya ikut menghitung Lebak 2 dan Serang 1; jembatan
  Demak yang terhitung ada di Sragen 1 dan Pekalongan 1, di luar Demak dan Kudus. [dihitung penyusun bukti]
- R3P Cianjur memuat kerusakan jembatan kabupaten Rp6,69 miliar dan jembatan desa Rp19,71 miliar (Tabel 3.6), padahal
  DIBI mencatat 2 jembatan untuk kejadian itu. Sumber: pustaka `cianjur-2022-r3p` hlm. PDF 55–56 (dibuka ulang 25 Okt
  2026). [resmi] Catatan: R3P mencatat dalam rupiah, bukan unit, sehingga jumlah jembatan Cianjur tetap tidak
  diketahui.

**Air di dokumen pascabencana**

- R3P Cianjur mencatat air dalam rupiah: subsektor air bersih dan sanitasi kerusakan Rp1.895.861.300 dan kerugian
  Rp399.050.000 (Tabel 3.8, "sambungan rumah, pipa distribusi dan resevoir"); sarana air bersih SPAM perkotaan dalam
  subsektor sumber daya air Rp41,60 miliar. Tidak ada jumlah sambungan atau jiwa terdampak. Sumber: pustaka
  `cianjur-2022-r3p` hlm. PDF 53, 57; `kunci: rehab.rekon.cianjur2022.r3p_air_sanitasi_kerusakan_rp`,
  `rehab.rekon.cianjur2022.r3p_spam_perkotaan_rp`. [resmi]
- Perka BNPB 15/2011: pengkajian akibat bencana meliputi kerusakan, kerugian, gangguan akses, gangguan fungsi, dan
  risiko; nilai kerusakan = jumlah unit fisik rusak dikali harga satuan (hlm. 40). Sumber: korpus
  `perka-nomor-15-tahun-2011.json`; pustaka `bnpb-2011-pdna`. [resmi]
- Perban BNPB 5/2017 Pasal 8: sektor infrastruktur R3P memuat "sumber daya air, air bersih dan sanitasi" dan
  transportasi darat (hlm. 7). Sumber: korpus `perban-nomor-5-tahun-2017.json`; pustaka `bnpb-2017-r3p`. [resmi]
- Angka air per kejadian yang ada berasal dari Kementerian PU, bukan DIBI: Sumatra 2025 176 SPAM terdampak dan 143
  berfungsi per 2 Februari 2026; 178 SPAM dan sekitar 95,5% fungsional per 7 Mei 2026. Sumber: pustaka
  `pu-2026-spam-sumatra-feb`, `pu-2026-infrastruktur-sumatra-mei` (dibuka 25 Okt 2026). [resmi] Lombok 2018 37 titik
  SPAM rusak dan Cianjur 10 titik area kerusakan pipa SPAM menurut buku Satgas PU. Sumber: riset D [10], [12]; buku
  tidak ada di pustaka bab ini. [resmi; belum dibuka ulang (riset D [10],[12])]

### Inferensi

- *Inferensi:* sebagian masalahnya jarak antara formulir Juklak 7/2023 dan tabel DIBI yang diterbitkan (jembatan
  RB/RS/RR dan jalan km diminta tetapi tidak tampil), dan sebagian lagi ketiadaan aturan. Usulan kolom DIBI (R-RR-01,
  D1) karena itu dua lapis: (i) menurunkan isian Juklak yang sudah ada ke tabel publik; (ii) menambah isian yang belum
  diminta Juklak, yaitu status jalan tempat jembatan, satuan fisik air (unit SPAM, sambungan, jiwa) di samping taksiran
  rupiah, dan durasi pulih. Lapis (ii) adalah usulan baru tim yang menuntut perubahan standar data, bukan sekadar
  penurunan isian.
- *Inferensi:* angka jembatan DIBI per kejadian gempa tidak layak menjadi lantai skenario gempa (Lombok 0, Cianjur 2,
  Sulteng 7). Untuk gempa, besaran akses di kartu 8.2 harus ditulis "tidak terukur di DIBI" dengan R3P atau dokumen
  Satgas PU sebagai sumber, atau dibiarkan kosong.
- *Inferensi:* jumlah fasum 2017 = 0 dan RS 2008–2009 = 0 menunjukkan kolom kosong diisi nol. Penulis bab harus
  membaca nol DIBI sebagai "tidak tercatat" kecuali ada bukti lain.

### Celah

- Jembatan per tingkat kerusakan (RB/RS/RR) dan jalan rusak dalam km ada di formulir Juklak 7/2023 tetapi tidak di tabel
  publik DIBI. Disajikan sebagai "tidak tersedia di DIBI publik; diminta ke Pusdatinkom" (Tabel permintaan data
  Lampiran L). Jembatan per status jalan dan durasi pulih tidak diminta Juklak, jadi tidak dapat diminta ke Pusdatinkom
  sebagai data yang ada; keduanya masuk R-RR-01 sebagai usulan perubahan standar.
- Apakah Pusdatinkom menyimpan isian jaringan air bersih/minum per laporan tidak diketahui. Tidak diklaim ada atau
  tidak ada; ditulis sebagai pertanyaan permintaan data.
- Teks Juklak 7/2023 di korpus berasal dari salinan non-JDIH (indonesia.unfpa.org); label resmi dengan catatan salinan
  sampai PDF JDIH diperoleh.
- Buku Satgas PU Lombok dan Cianjur tidak dibuka ulang sesi ini; angkanya dikutip dari riset D dan ditandai begitu.

---

## P2. Bagaimana lantai skenario dan empat besaran RR didefinisikan?

### Inti

Lantai skenario mengikuti KERANGKA induk prinsip 9: skenario tidak boleh lebih ringan daripada kejadian atau tahun
tercatat terburuk untuk jenis dan wilayah yang sama dalam periode acuan (hidrometeorologi 2008–2025, geologi
1996–2025; jembatan 2018–2025 karena seri baru terisi). Empat besaran RR menggantikan besaran P10: rumah rusak
(RB/RS/RR), jembatan rusak dan akses terputus, layanan air terganggu, dan durasi pemulihan per lapis, dengan korban jiwa
dan kerugian rupiah sebagai baris konteks (Q6). Dari empat besaran, hanya rumah yang terukur untuk semua jenis; jembatan
terukur sebagai batas bawah; air dan durasi hanya untuk segelintir kejadian.

### Temuan bersumber

**Definisi (keputusan)**

- Lantai dan periode acuan: KERANGKA induk §1 prinsip 9 (`data/kajian-bnpb/KERANGKA.md` baris 303–318); diterapkan ke
  RR di rehab/KERANGKA §1 prinsip 7. [asumsi-kebijakan; keputusan pemilik]
- Empat besaran RR dan korban jiwa sebagai konteks: rehab/KEPUTUSAN-AWAL P10 dan Q6 (disetujui 25 Okt 2026).
  [asumsi-kebijakan; keputusan pemilik]
- Lapis waktu: darurat (status tanggap darurat dan transisi; Perban 4/2020), sementara, permanen (masa R3P paling lama 3
  tahun, Perban 5/2017 Pasal 10 hlm. 10); R3P disusun paling lama 90 hari dan dimulai saat tanggap darurat (Pasal 2 ayat
  (2)–(3) hlm. 4). Sumber: korpus `perban-nomor-5-tahun-2017.json`; `kunci: rehab.hukum.r3p_tahun_maks`. [resmi]
- Standar lapis darurat untuk menghitung kebutuhan air per skenario: 7 liter per orang per hari tiga hari pertama, lalu
  15 liter (Perka BNPB 7/2008). Sumber: pustaka `bnpb-2008-kebutuhan-dasar`; `kunci: perka_2008.air_bersih_awal_liter_hari`,
  `perka_2008.air_bersih_liter_hari`. [resmi; R4]

**Lantai tercatat per besaran (DIBI, nasional)** [dihitung penyusun bukti dari `dibi/rekap_nasional_tahunan.csv`]

| Jenis | Lantai rumah DIBI (tahun RB terburuk 2008–2025) | Lantai jembatan (2018–2025) | Kejadian tunggal terburuk, rumah rusak (DIBI `dibi/kejadian_besar.csv`, 2008–2025) | Kejadian tunggal terburuk, rumah rusak (dokumen penilaian, 1996–2007) |
| --- | --- | --- | --- | --- |
| Banjir (101) | 2025: 65.648 RB | tahun DIBI 2025: 1.021 (batas bawah); kejadian Sumatra 2025: 1.181 jembatan daerah terdampak (PU, 7 Mei 2026; belum termasuk jembatan nasional) | Sumatra 2025: 62.956 RB, 228.006 rusak (banjir+longsor) | tidak dinilai |
| Longsor (102) | 2017: 2.992 RB | 2020: 61 (semua laporan 2025: 56) | perlu turunan per kab | tidak dinilai |
| Gempa (107) | 2009: 190.612 RB | 2019: 21 (tidak layak, lihat P1) | Padang 2009: 119.005 RB, 271.540 rusak | **Yogyakarta 2006: 154.000–157.000 rumah hancur** (Bappenas, penilaian awal; dua versi di dokumen yang sama) |
| Erupsi (109) | 2014: 12.404 RB | 2024: 31 | Merapi 2010: 2.465 RB | tidak dinilai |
| Cuaca ekstrem (104) | 2012: 6.039 RB | 2025: 12 | tidak ada baris | tidak dinilai |
| Tsunami (108) | 2018: 1.583 RB | 0 | Selat Sunda 2018: 1.583 RB (tsunami Sulteng 2018 tercampur ke gempa) | **Aceh 2004: sampai 139.195 rumah hancur atau rusak berat** (BRR, The Scattered Beads hlm. x; Aceh dan Nias tidak terpilah) |

Lantai kejadian per jenis adalah angka terbesar di baris itu, dibaca berdampingan dengan angka DIBI: gempa = Yogyakarta
2006 (154.000–157.000 hancur) di samping Padang 2009 sebagai lantai DIBI (119.005 RB); tsunami = Aceh 2004 (sampai 139.195)
di samping Selat Sunda 2018 sebagai lantai DIBI (1.583 RB); jembatan banjir per kejadian = 1.181 (PU) di samping 1.021
(DIBI, satu tahun nasional). "Rumah hancur" Bappenas dan "hancur atau rusak berat" BRR tidak sama persis dengan RB
Juklak 7/2023; selisih definisi ditulis di catatan tabel, bukan dipakai untuk menurunkan lantai.

- Rumah yang dibangun BRR di Aceh 2004 (140.304, KERANGKA §5 `rehab.lantai.tsunami.aceh2004.rumah_brr`, T14) adalah
  ukuran keluaran pemulihan, bukan kerusakan. Ia tidak dipakai sebagai lantai kerusakan; tempatnya di Bab 6 sebagai
  capaian. [resmi]

Kunci: `rehab.lantai.jembatan.banjir.tahun_terburuk`, `rehab.lantai.jembatan.banjir.kejadian`,
`rehab.lantai.jembatan.longsor.tahun_terburuk`, `rehab.lantai.jembatan.gempa.tahun_terburuk`,
`rehab.lantai.jembatan.erupsi.tahun_terburuk`, `rehab.lantai.jembatan.cuaca_ekstrem.tahun_terburuk`; lantai rumah
kejadian memakai `bappenas.yogya2006.rumah_hancur` dan `brr.aceh2004.rumah_rusak` (keduanya sudah di `data/angka.json`)
serta kunci KERANGKA §5 `rehab.lantai.gempa.padang2009.rumah_rb`, `rehab.lantai.banjir.sumatra2025.rumah_rb`. [resmi;
Yogyakarta: resmi, penilaian awal]

- Tahun 2026 sementara sudah mencatat 29.863 RB gempa (tertinggi sejak 2018 untuk jenis itu); tidak masuk lantai
  karena di luar periode acuan dan belum final. Sumber: berkas sama. [resmi; sementara]

**Matriks ketersediaan kuantifikasi (bahan Tabel 3.3, G16)** [dihimpun penyusun bukti]

| Jenis | Rumah | Jembatan dan akses | Layanan air | Durasi pulih |
| --- | --- | --- | --- | --- |
| Gempa | terukur (DIBI, resmi; pra-2008 Bappenas) | DIBI sangat di bawah; R3P dalam rupiah | Lombok 37 SPAM (PU, riset D)\* | huntap Sulteng (riset E [14])\* |
| Tsunami | terukur; Aceh 2004 BRR 139.195 rusak | tidak di DIBI; BRR/MDF (riset E)\* | MDF (terverifikasi, riset E)\* | Rencana Induk 4 tahun\* |
| Likuefaksi | tidak terpisah dari gempa Sulteng | tidak terpisah | tidak terpisah | tidak terpisah |
| Banjir dan banjir bandang | terukur | terukur batas bawah (DIBI 2018+) | Sumatra 2025 (PU, resmi) | Sumatra 2025 dua titik (Feb, Mei 2026) |
| Longsor | terukur | terukur batas bawah | tidak ada | tidak ada |
| Erupsi | terukur | terukur batas bawah | tidak ada | tidak ada |
| Cuaca ekstrem | terukur | terukur batas bawah | tidak berlaku | tidak ada |

\* Sel belum diverifikasi penyusun bukti: diisi dari riset D atau E tanpa pustaka primer di `bab-03.pustaka.json`.
Penulis bab menulis sel itu sebagai "ada menurut riset, belum dibuka ulang" sampai sumbernya dibuka dan dimasukkan ke
pustaka.

### Inferensi

- *Inferensi:* karena DIBI jembatan menghitung jumlah tanpa status jalan, lantai jembatan banjir 2025 (1.021) dan angka
  PU untuk kejadian yang sama (1.181 jembatan daerah ditambah jembatan nasional) tidak sebanding satu lawan satu. Kartu
  8.5 memakai 1.181 sebagai lantai (`rehab.lantai.jembatan.banjir.kejadian`) dan menulis 1.021 berdampingan sebagai
  batas bawah DIBI (pelajaran wajib: angka bertentangan berdampingan; skenario tidak lebih ringan dari angka tercatat).
- *Inferensi:* lantai rumah nasional per tahun (mis. gempa 2009 190.612 RB) dan lantai kejadian (Yogyakarta 2006
  154.000–157.000 hancur; Padang 2009 119.005 RB sebagai lantai DIBI) menjawab pertanyaan berbeda; kartu memakai lantai
  kejadian untuk skenario dan lantai tahun untuk kesiapan tahunan.
- *Inferensi:* durasi pulih tidak punya seri domestik; satu-satunya kurva yang dapat digambar adalah Sumatra 2025 dua
  titik air (2 Feb dan 7 Mei 2026) dan satu titik jembatan daerah (7 Mei 2026), dengan Kobe dan Tohoku sebagai
  pembanding (Bab 6).

### Celah

- Lantai per kab (wilayah yang sama) belum dapat dihitung untuk jembatan karena tidak ada jembatan per kab di paket
  selain 24 kejadian besar; disajikan sebagai lantai provinsi (Aceh 480 pada 2025, `kunci: rehab.dibi.jembatan_rusak.prov.aceh.2025`)
  sampai turunan ditarik.
- `skenario-hidromet/lantai_jenis.csv` yang disebut KERANGKA induk tidak ada (dicek naskah mitigasi bab-03); lantai di
  atas dihitung langsung dari rekap DIBI dan perlu dipindah ke skrip.
- Porsi likuefaksi pada kerusakan Sulteng 2018 tidak terpisah di DIBI; tidak dikuantifikasi. Kerusakan tsunami Sulteng
  2018 juga tercampur ke baris gempa, sehingga lantai tsunami DIBI (Selat Sunda 1.583 RB) terlalu rendah untuk dibaca
  sendiri.
- DIBI dasbor publik 1 mulai 2008 (`dibi/kejadian_besar.csv`, baris aceh2004, nias2005, yogya2006 bernilai 0 baris).
  Lantai geologi 1996–2007 karena itu diambil dari dokumen penilaian (Bappenas 2006, BRR 2009), bukan DIBI; kejadian
  1996–2007 lain (mis. Nias 2005 terpisah dari Aceh) belum dinilai.
- Hari sampai akses darurat terbuka tidak tercatat di sumber mana pun yang dibuka; besaran durasi untuk akses ditulis
  "tidak terukur".

---

## P3. Kab/kota mana masuk daftar perhatian dan dengan aturan apa?

### Inti

Aturan KERANGKA (≥ 2 dari empat syarat) belum dapat dijalankan penuh: syarat (b) jembatan per kab dan (d) CAT kritis
atau penurunan muka tanah tidak punya data di repo, dan (c) rumah RB per kab 2015–2025 hanya tersedia sebagai proksi
rumah rusak total. Daftar sementara dengan dua syarat yang dapat dihitung, (a) dan (c-proksi), menghasilkan 40 kab/kota
(73 bila syarat (a) dilonggarkan ke dua kelas teratas). Daftar ini bahan uji metode, bukan daftar final.

### Temuan bersumber

- Syarat (a), IRBI 2025 per bahaya di kelas nilai teratas, dihitung dengan rumus batas kuintil yang sama dengan
  `bangun/turunan.py` (`batas_kuintil`, kelas = 4; nilai kembar di batas ikut): batas banjir 25, longsor 20, gempabumi 11;
  198 kab memenuhi di salah satu bahaya. Sumber: `irbi/irbi_kab_2025.csv` kolom `banjir`, `longsor`, `gempabumi`
  [dihitung penyusun bukti]; `kunci: rehab.perhatian.sementara.n_syarat_a`. [asumsi-kebijakan; analisis penyusun atas
  data resmi]
- Catatan IRBI: tidak ada ambang kelas per bahaya di sumber resmi; kelas per bahaya di sini adalah kuintil turunan.
  Sumber: `irbi/README.md` baris 133–134. [resmi untuk pernyataan; kelasnya asumsi-kebijakan]
- Syarat (c-proksi): rumah rusak total 2015–2025 per kab, jumlah sembilan jenis hidrometeorologi dan empat jenis geologi,
  di kuartil atas (≥ 1.596 unit, aturan `batas_kuartil_atas` turunan.py, nol tidak memenuhi): 129 kab. Jumlah 511 kab
  bernilai = 1.303.151 rumah rusak, dekat dengan nasional RB+RS+RR 2015–2025 = 1.300.830. Sumber:
  `skenario-hidromet/dibi_kab_tahun.csv`, `skenario-hidromet/dibi_geologi_kab_tahun.csv` [dihitung penyusun bukti];
  `kunci: rehab.perhatian.sementara.n_syarat_c`. [asumsi-kebijakan; analisis penyusun atas data resmi]
- Daftar sementara (a dan c-proksi): 40 kab/kota; terbanyak Sumatera Barat 7, Aceh 6, NTT 5, Sumatera Utara 4; rumah
  rusak terbesar di daftar: Sigi 29.757, Kab. Sukabumi 22.853, Donggala 21.844, Pidie Jaya 18.999, Pesisir Selatan
  13.938, Kota Mataram 13.607. Kepekaan dua kelas teratas: 73 kab (Aceh 11, Jawa Barat 8, Sumatera Utara 7, Sumatera
  Barat 7); masuk antara lain Aceh Utara 92.451, Cianjur 62.890, Kota Palu 55.141, Aceh Tamiang 40.941. Sumber: dua
  berkas di atas dan `irbi/irbi_kab_2025.csv` [dihitung penyusun bukti]; `kunci: rehab.perhatian.sementara.n`,
  `rehab.perhatian.sementara.n_dua_kelas`. [asumsi-kebijakan]
- Pembanding daftar perhatian kajian saudara: mitigasi banjir 253 kab, longsor 202, gempa 30 (aturan berbeda, per
  bahaya). Sumber: `turunan/daftar_perhatian_kepekaan.csv` baris `dasar`. [asumsi-kebijakan]
- Jembatan per kab hanya tersedia untuk kejadian besar: Sumatra 2025 38 kab dengan jembatan rusak > 0. Sumber:
  `dibi/mentah/dibi_peristiwa.json` [dihitung penyusun bukti]. [resmi]

### Inferensi

- *Inferensi:* kepekaan daftar sangat besar (40 lawan 73) dan kab dengan beban rumah terbesar 2015–2025 (Aceh Utara,
  Cianjur, Kota Palu) baru masuk pada ambang longgar karena IRBI 2025 mereka tidak di kuintil teratas. Ini menunjukkan
  IRBI (bahaya dan risiko) dan DIBI (kerusakan tercatat) menunjuk kab berbeda; untuk RR, syarat kerusakan tercatat
  layak berbobot lebih besar. Usulan: setelah turunan jembatan per kab ada, uji varian "(b) atau (c) wajib" di samping
  aturan ≥ 2.
- *Inferensi:* syarat (d) harus tetap penanda, bukan syarat masuk, karena kab di CAT kritis bukan berarti beban RR
  besar; ini sesuai KERANGKA dan Q10.
- *Inferensi:* proksi tidak memuat rumah terendam (kolom `rumah_rusak` DIBI = RB+RS+RR, self-check 4 `dibi/README.md`),
  tetapi RR yang banyak pada banjir membuat proksi condong ke kab banjir dibanding syarat RB asli.

### Celah

- Syarat (b): tidak ada jembatan rusak per kab per tahun di paket. Cara penyajian: daftar final menunggu tarikan DIBI per
  kab dengan kolom `jembatan_rusak` 2018–2025 (pemilik paket `pipa-data`, sumber dasbor publik DIBI yang sama dengan
  `dibi/mentah/dibi_prov.json` tetapi dikelompokkan per `id_kab_bps`). Sampai itu, peta per provinsi (Q17).
- Syarat (c): RB per kab 2015–2025 tidak ada; dipakai proksi rumah rusak total dan ditulis sebagai proksi.
- Syarat (d): poligon CAT dan zona konservasi Badan Geologi serta kawasan penurunan muka tanah terverifikasi tidak ada
  di repo (KERANGKA §10 butir 8). Ditulis "belum dinilai", bukan "tidak memenuhi".
- Daftar 40 kab tidak boleh tampil di badan teks sebagai daftar perhatian RR; hanya sebagai ilustrasi metode di Tabel 3.4
  dengan label sementara, atau di Lampiran A setelah turunan lengkap.

---

## P4. Angka mana yang berbeda versi?

### Inti

Lima kelompok angka berbeda versi: (1) rincian DIBI per jenis di KERANGKA dan riset F yang ikut menjumlah 2026;
(2) jembatan Sumatra 2025 (DIBI 726 atau 744, BNPB 498 sekunder, PU 1.181 jembatan daerah dan 14 jembatan nasional
Aceh); (3) rumah rusak Sumatra (DIBI 228.006, BNPB sekitar 147.000, PKP sekitar 189.308); (4) rumah rusak Cianjur
(DIBI 57.337 atau 56.278, Renstra 56.548, R3P 114.315); (5) SPAM Sumatra (176 lawan 178 SPAM; 143 lawan 153 berfungsi)
dan lingkup target permanen Agustus 2028. Semua ditulis berdampingan di Tabel 3.5; tidak dipilih satu.

### Temuan bersumber

**(1) Koreksi internal: rincian per jenis**

- Riset F §2 menulis banjir 3.490 dari 3.833 (sekitar 91%), longsor 250, gempa 90, erupsi 52; dan RB gempa 182.522,
  banjir 105.016, cuaca ekstrem 25.469, longsor 13.580. Jumlah rincian jembatannya 3.947, lebih besar dari total 3.833.
  Hitung ulang dengan 2018–2025 saja: banjir 3.419, longsor 246, gempa 52, erupsi 51; RB 2015–2025 gempa 152.659,
  banjir 104.296, cuaca ekstrem 24.876, longsor 12.865. Selisihnya sama persis dengan baris 2026 (jembatan banjir 71,
  gempa 38, longsor 4, erupsi 1; RB gempa 29.863, banjir 720, cuaca ekstrem 593, longsor 715). Sumber:
  `dibi/rekap_nasional_tahunan.csv` dan `dibi/rekap_provinsi_tahunan.csv` (keduanya memberi angka sama)
  [dihitung penyusun bukti]; `kunci: rehab.dibi.jembatan_rusak.porsi_banjir_persen`, `rehab.dibi.rumah_rb.gempa_2015_2025`
  dan kunci per jenis lain. [resmi] Total (3.833; 301.311) dan angka provinsi (Aceh 633, Sumatera Barat 521; NTB 77.311
  RB 2018–2025) tidak terpengaruh dan cocok.
- Akibatnya kalimat tesis KERANGKA §3 ("sekitar 91% karena banjir") dan tabel kartu Bab 8 (gempa 90, longsor 250,
  erupsi 52 jembatan; cuaca ekstrem 25.469 RB dan 166.830 RR; longsor 13.580 RB) harus memakai angka koreksi (89%; 52;
  246; 51; 24.876; 160.495; 12.865).

**(2) Jembatan Sumatra 2025**

| Angka | Definisi | Sumber | Label |
| --- | --- | --- | --- |
| 726 | DIBI, baris 15 Nov–31 Des 2025, Banjir dan Longsor, Aceh 479, Sumbar 178, Sumut 69 | `dibi/mentah/dibi_peristiwa.json`; `kunci: rehab.dibi.jembatan_rusak.sumatra2025_jendela` | resmi; dijumlah penyusun bukti |
| 744 | DIBI, semua kejadian alam 2025 di tiga provinsi (480 + 182 + 82) | `dibi/rekap_provinsi_tahunan.csv`; `kunci: rehab.dibi.jembatan_rusak.tiga_prov_sumatra.2025` | resmi; dijumlah penyusun bukti |
| 1.181 | jembatan daerah terdampak, sekitar 67% dapat difungsikan, data 7 Mei 2026 | Kementerian PU, pustaka `pu-2026-infrastruktur-sumatra-mei`; `kunci: rehab.rekon.sumatra2025.jembatan_daerah_pu` | resmi |
| 14 | jembatan roboh atau terputus di jalan nasional Aceh, sampai 1 Des 2025 | BPJN Aceh, pustaka `binamarga-2025-aceh-14-jembatan`; `kunci: rehab.rekon.sumatra2025.jembatan_nasional_aceh_putus` | resmi |
| 498 | jembatan rusak, BNPB 10 Des 2025, dikutip Kontan | pustaka `kontan-2025-bnpb-498-jembatan` | resmi; sekunder (lampiran saja) |

- PU 7 Mei 2026 juga mencatat 2.421 ruas jalan daerah terdampak (sekitar 94% fungsional) dan jalan serta jembatan
  nasional terdampak 100% fungsional; DIBI tidak punya kolom jalan. Sumber: pustaka `pu-2026-infrastruktur-sumatra-mei`;
  `kunci: rehab.rekon.sumatra2025.jalan_daerah_ruas_pu`. [resmi]

**(3) Rumah rusak Sumatra 2025**

| Angka | Definisi | Sumber | Label |
| --- | --- | --- | --- |
| 228.006 | DIBI rumah rusak (RB 62.956), 15 Nov–31 Des 2025 | `dibi/kejadian_besar.csv`; `kunci: dibi.sumatra2025.rumah_rusak_berat` | resmi |
| lebih dari 147.000 (Aceh 106.058, Sumut 28.708, Sumbar 12.451; jumlah 147.217) | BNPB (Kapusdatinkom), rumah rusak ringan sampai berat, data sampai Selasa 16 Des 2025 | JawaPos 17 Des 2025, pustaka `jawapos-2025-bnpb-147-ribu-rumah`; Info Singkat DPR menulis "hingga 17 Desember 2025" (`dpr-2026-rumah-sumatra`); `kunci: rehab.rekon.sumatra2025.rumah_rusak_bnpb_des` | terverifikasi (media); sekunder, lampiran saja |
| 189.308 (Aceh 148.339, Sumut 28.043, Sumbar 12.926) | Kementerian PKP, "rumah terdampak" (rusak ringan, sedang, berat, hanyut), data 9 Jan 2026 pukul 17.00 WIB | Investortrust 11 Jan 2026, pustaka `investortrust-2026-pkp-189308-rumah`; dikutip ulang DPR (`dpr-2026-rumah-sumatra`); `kunci: rehab.rekon.sumatra2025.rumah_terdampak_pkp_jan` | terverifikasi (media); sekunder, lampiran saja |

- Rantai angka 147.000 dan 189.308 di Info Singkat DPR adalah lembaga, lalu media, lalu DPR (menurut temuan pemeriksa,
  DPR merujuk berita Antara 16 Des 2025 dan housingestate.id 14 Jan 2026; PDF DPR tidak dapat diunduh ulang 25 Okt
  2026, akses ditolak). DPR menulis "hingga 17 Desember 2025", sehari setelah tanggal data di berita (16 Des); tanggal
  data yang dipakai 16 Des. Angka per provinsi di tabel dibaca langsung dari berita media yang dibuka 25 Okt 2026 dan
  menjumlah ke total. Rilis BNPB dan rilis Kementerian PKP asal belum dibuka; sampai itu kedua angka hanya di lampiran.
  [terverifikasi (media)]
- DPR menilai selisih itu "pemutakhiran yang belum sepenuhnya sinkron" dan berdampak pada prioritas, alokasi, dan jadwal
  RR. Sumber: pustaka `dpr-2026-rumah-sumatra` (dibuka sesi sebelumnya). [resmi untuk penilaian DPR; angka di dalamnya
  sekunder]

**(4) Rumah rusak Cianjur 2022**

| Angka | Definisi | Sumber | Label |
| --- | --- | --- | --- |
| 57.337 | DIBI, 5 kab, 21–30 Nov 2022 (RB 13.730) | `dibi/kejadian_besar.csv`; `kunci: dibi.cianjur2022.rumah_rusak` | resmi |
| 56.278 | DIBI, Kab. Cianjur saja | catatan kunci `dibi.cianjur2022.rumah_rusak` di `data/angka.json` | resmi |
| 56.548 | Renstra BNPB 2025–2029 hlm. 11 | `dibi/kejadian_besar.csv` baris pustaka; pustaka `bnpb-2025-renstra` | resmi |
| 114.315 | R3P (ditetapkan Kepbup Cianjur 360/KEP.118-BAPPERIDA/2023); angka rumah menurut SK Bupati 360/KEP.401-BPBD/BPBD/2022 tahap II hasil reviu BNPB (20.969 RB, 24.584 RS, 68.762 RR) | pustaka `cianjur-2022-r3p` hlm. PDF 55; `kunci: r3p.cianjur2022.rumah_rusak` | resmi |

- RB R3P (20.969) lebih besar dari RB DIBI (13.730) sekitar 1,5 kali; total R3P sekitar 2 kali DIBI. [resmi; rasio
  dihitung penyusun bukti]
- Dokumen R3P sendiri memuat dua kesalahan. (i) R3P menulis total sektor infrastruktur (kerusakan Rp124,04 miliar,
  kerugian Rp90,57 miliar, total Rp214,60 miliar = transportasi darat 170,58 + pos dan telekomunikasi 0,13 + air dan
  sanitasi 2,29 + sumber daya air 41,60, Tabel 3.5) sebagai baris total subsektor sumber daya air di teks 3.1.2.4 dan
  Tabel 3.9; rincian Tabel 3.9 subsektor SDA (DAS 4,14 + irigasi 7,48 + SPAM perkotaan 41,60) hanya berjumlah sekitar
  Rp53,2 miliar (Rp53.215.710.098,40). (ii) Teks 3.1.2.4 juga salah ketik kerugian Rp690.567.957.188,20 untuk
  Rp90.567.957.188,20. Sumber: pustaka `cianjur-2022-r3p` hlm. cetak 53–58 (dibuka ulang 25 Okt 2026, pdftotext).
  [resmi; jumlah rincian dihitung penyusun bukti]

**(5) SPAM Sumatra 2025**

| Angka | Definisi | Sumber | Label |
| --- | --- | --- | --- |
| 143 dari 176 | SPAM berfungsi per 2 Feb 2026 (judul berita menulis 142) | pustaka `pu-2026-spam-sumatra-feb`; `kunci: rehab.rekon.sumatra2025.spam_berfungsi_feb` | resmi |
| sekitar 95,5% dari 178 | SPAM fungsional per 7 Mei 2026 | pustaka `pu-2026-infrastruktur-sumatra-mei`; `kunci: rehab.rekon.sumatra2025.spam_fungsi_persen_mei` | resmi |
| 153 dari 176 | Menteri PU di rapat Satgas, dikutip Investortrust 11 Feb 2026 | riset E [28] | terverifikasi (media); sekunder, lampiran saja |
| Agustus 2028 | target permanen "bertahap", **hanya 60 SPAM Sumatera Barat** | pustaka `pu-2026-spam-sumatra-feb`; `kunci: rehab.rekon.sumatra2025.spam_sumbar_target_permanen` | resmi |
| 128 | sumur bor PU (25 sumur air dalam Ditjen SDA, 103 sumur Ditjen Cipta Karya), 2 Feb 2026 | pustaka sama; `kunci: rehab.rekon.sumatra2025.sumur_bor_pu_feb` | resmi |

- KERANGKA §4 Bab 1, Bab 6, dan §5 (`rehab.pipa.sumatra2025.target_permanen`) menulis target Agustus 2028 seolah untuk
  seluruh Sumatra; berita PU 5 Feb 2026 menyebutnya untuk Sumatera Barat saja, dan berita 11 Mei 2026 tidak memuat
  target permanen. Koreksi lingkup wajib dibawa ke registri.

### Inferensi

- *Inferensi:* pola yang sama berulang di tiga kelompok: DIBI lebih rendah daripada dokumen sektor (jembatan Sumatra
  726 lawan 1.181 daerah; rumah Cianjur 57.337 lawan 114.315). Sebabnya kemungkinan perbedaan saat pencatatan (DIBI
  dari laporan tanggap darurat, R3P dan PU dari verifikasi kemudian) dan definisi ("terdampak" PU dan PKP lawan "rusak"
  DIBI). Dugaan, belum terbukti; ditulis sebagai dugaan di kotak L22.
- *Inferensi:* kesalahan rincian per jenis (1) menunjukkan kebutuhan skrip `bangun/rehab_angka.py` dengan uji diri
  "jumlah per jenis = total periode", sebagaimana diminta KERANGKA §12. Uji itu akan menolak angka riset F.
- *Inferensi:* ukuran pemulihan PU yang tersedia (unit SPAM, unit jembatan, ruas jalan berfungsi) adalah ukuran unit,
  bukan jiwa terlayani (KERANGKA prinsip 4); persen 95,5% tidak boleh ditulis sebagai "95,5% warga kembali berair".

### Celah

- Angka resmi BNPB untuk rumah rusak dan jembatan Sumatra di dokumen BNPB sendiri (rilis, R3P Aceh, Sumut, Sumbar)
  belum dibuka; 147.000 dan 498 tetap sekunder sampai itu. Rilis Kementerian PKP 9 Jan 2026 juga belum dibuka; 189.308
  tetap sekunder. Hasil pencarian 25 Okt 2026 menunjukkan angka pemerintah yang lebih besar untuk pertengahan dan akhir Januari
  2026; beritanya belum dibuka sehingga angkanya tidak ditulis. Rekonsiliasi rumah Sumatra harus memakai angka resmi
  terbaru setelah dibuka.
- Jumlah jembatan nasional terdampak di Sumatra (tiga provinsi) tidak ditemukan di sumber yang dibuka; hanya 14 untuk
  Aceh per 1 Des 2025.
- Rencana induk RR Sumatra (Keppres 1/2026) tidak dibuka; target permanen untuk Aceh dan Sumatera Utara tidak diketahui.
- Rekonsiliasi Lombok dan Sulteng untuk jembatan dan SPAM tidak dapat dibuat karena R3P keduanya tidak ditemukan
  (KERANGKA §10 butir 5).

---

## 3.5 Biaya satuan sebagai pembanding (aturan, untuk penulis)

Bukan pertanyaan kunci tersendiri, tetapi subbab 3.5 butuh aturan bersumber.

- Aturan keputusan: biaya satuan berlabel dengan tahun harga boleh tampil sebagai pembanding pilihan teknis; pagu, total
  program, NPV, dan BCR tidak (KEPUTUSAN-AWAL P5, Q4). [asumsi-kebijakan; keputusan pemilik]
- Dasar metode: Perka 15/2011 menilai kerusakan dengan unit fisik dikali harga satuan (hlm. 40), jadi biaya satuan
  sudah menjadi bahan baku Jitupasna. Sumber: pustaka `bnpb-2011-pdna`. [resmi]
- Contoh yang akan dipakai Bab 5–7 (dari riset, tidak dibuka ulang sesi ini): sumur bor Badan Geologi Rp429,1 miliar
  untuk 750 sumur (rencana 2020) [pustaka `esdm-2019-sumur-750`]; SPAM Banjarbakula tahap II Rp787 miliar untuk 500 l/dt
  (2023) [pustaka `setkab-2023-banjarbakula`]; 43 jembatan gantung PU Rp246,36 miliar (2025) [pustaka
  `pu-2025-jembatan-gantung`]. [resmi untuk angka asal]

*Inferensi:* KERANGKA melabeli hasil bagi sederhana dari angka resmi secara tidak seragam: biaya per sumur dan per l/dt
"estimasi-model", biaya per jembatan gantung "asumsi-kebijakan". Usulan aturan tunggal untuk Bab 3.5: hasil bagi angka
resmi tanpa model = `asumsi-kebijakan; hitungan penyusun atas data resmi`; `estimasi-model` hanya untuk keluaran model
(konvensi naskah mitigasi bab-03). Keputusan label diserahkan ke sesi induk.

*Celah:* daftar harga satuan resmi PU untuk pipa HDPE per km per diameter, bailey per meter, dan sumur bor tidak
ditemukan (KERANGKA §10 butir 6); tabel biaya menulis "tidak ada harga satuan resmi" di sel itu.

---

## Komponen

| Kode | Komponen | Isi | Sumber data | Kode G / B5 |
| --- | --- | --- | --- | --- |
| Tabel 3.1 | Sumber, produsen, label | DIBI, IRBI, Juklak 7/2023, R3P Cianjur, rilis PU, BPJN Aceh, DPR, riset A–F; kolom label dan verifikasi | pustaka bab ini; `dibi/README.md`; `irbi/README.md` | B5.7 |
| Tabel 3.2 | Kolom DIBI yang dipakai dan patahannya | 19 kolom; jembatan nol 2008–2017; RS nol 2008–2009; fasum nol 2008–2009 dan 2017; patahan `is_bencana` 2024; kolom yang diminta Juklak tetapi tidak tampil (air dalam uraian dan rupiah, jalan km, tingkat kerusakan jembatan RB/RS/RR); kolom yang tidak diminta Juklak dan diusulkan R-RR-01 (status jalan tempat jembatan, satuan fisik air, durasi pulih) dipisah | `dibi/mentah/dibi_nasional.json`; `dibi/rekap_nasional_tahunan.csv`; korpus Juklak 7/2023 hlm. 8, 12, 23–24, 38 | B5.7 |
| Tabel 3.3 | Matriks ketersediaan kuantifikasi jenis x besaran RR | 7 jenis x 4 besaran, sel: terukur / batas bawah / per kejadian / tidak ada | P2 matriks | G16 |
| Tabel 3.4 | Aturan daftar perhatian dan uji kepekaan | empat syarat, status data tiap syarat, hasil sementara 40 lawan 73 kab, label sementara | `irbi/irbi_kab_2025.csv`; `skenario-hidromet/dibi_kab_tahun.csv`; `skenario-hidromet/dibi_geologi_kab_tahun.csv`; kunci `rehab.perhatian.sementara.*` | B5.7 |
| Tabel 3.5 | Rekonsiliasi angka dengan kotak "Perbandingan dengan sumber lain" | lima kelompok P4; angka sekunder berpenanda | P4 tabel; pustaka bab ini | B5.7, L22 |
| Gambar 3.1 | Rantai metode | DIBI dan dokumen sektor → beban per besaran → lantai skenario → kartu Bab 8 → daftar perhatian → register | rehab/KERANGKA §1, §4 | B5.23 |
| Gambar 3.2 (usulan tambahan) | Jembatan rusak DIBI per kejadian besar | batang mendatar 10 kejadian (Jabodetabek 2020 = 33, Demak 2024 = 0), Lombok 2018 dan Demak 2024 = 0 diberi anotasi "tidak tercatat"; pembanding PU 1.181 untuk Sumatra | `bangun/rehab_angka.py` atas `dibi/mentah/dibi_peristiwa.json`; pustaka `pu-2026-infrastruktur-sumatra-mei` | G8 |

---

## Angka untuk registri

Semua ditulis di `naskah/rehab/bukti/bab-03.angka.json`. Ringkasan yang dipakai Bab 3:

| Kunci | Nilai | Berkas sumber + jalur atau pustaka | Label |
| --- | --- | --- | --- |
| rehab.dibi.jembatan_rusak.2018_2025 | 3.833 | `dibi/rekap_nasional_tahunan.csv`, alam, bencana, 2018–2025 | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.2025 | 1.088 | sama, 2025 | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.porsi_2025_persen | 28,4 | 1.088 / 3.833 | asumsi-kebijakan; analisis |
| rehab.dibi.jembatan_rusak.nol_2008_2017 | 0 | sama, 2008–2017 | resmi |
| rehab.dibi.jembatan_rusak.semua_laporan_2018_2025 | 3.887 | sama, cakupan semua_laporan | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.banjir_2018_2025 | 3.419 | sama, kode 101 | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.porsi_banjir_persen | 89,2 | 3.419 / 3.833 | asumsi-kebijakan; analisis |
| rehab.dibi.jembatan_rusak.longsor / gempa / erupsi / cuaca_ekstrem / gelombang _2018_2025 | 246 / 52 / 51 / 37 / 28 | sama, kode 102/107/109/104/103 | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.prov_separuh_n | 6 | `dibi/rekap_provinsi_tahunan.csv` | asumsi-kebijakan; analisis |
| rehab.dibi.jembatan_rusak.prov_tercatat_n | 37 | sama | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.prov.aceh.2018_2025 / sumbar.2018_2025 / aceh.2025 | 633 / 521 / 480 | sama | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.tiga_prov_sumatra.2025 | 744 | sama | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.sumatra2025_jendela | 726 | `dibi/mentah/dibi_peristiwa.json`, sumatra2025, 15 Nov–31 Des 2025 | resmi; dijumlah |
| rehab.dibi.jembatan_rusak.lombok2018 / sulteng2018 / cianjur2022 / seroja2021 / jabodetabek2020 / demak2024 | 0 / 7 / 2 / 95 / 33 / 0 | sama, jendela `kejadian_besar.csv` termasuk saringan kab; `bangun/rehab_angka.py` | resmi; dijumlah |
| rehab.dibi.rumah_rb / rumah_rs / rumah_rr .2015_2025 | 301.311 / 256.321 / 743.198 | `dibi/rekap_nasional_tahunan.csv` | resmi; dijumlah |
| rehab.dibi.rumah_rb.gempa / banjir / cuaca_ekstrem / longsor / erupsi _2015_2025 | 152.659 / 104.296 / 24.876 / 12.865 / 3.648 | sama | resmi; dijumlah |
| rehab.dibi.rumah_rr.cuaca_ekstrem_2015_2025 | 160.495 | sama | resmi; dijumlah |
| rehab.dibi.fasum_rusak.2015_2025 | 21.703 | sama | resmi; dijumlah |
| rehab.dibi.kolom_dampak_n | 19 | `dibi/mentah/dibi_nasional.json` | resmi |
| rehab.lantai.jembatan.banjir / longsor / gempa / erupsi / cuaca_ekstrem .tahun_terburuk | 1.021 / 61 / 21 / 31 / 12 | `dibi/rekap_nasional_tahunan.csv` (batas bawah DIBI) | resmi; dijumlah |
| rehab.lantai.jembatan.banjir.kejadian | 1.181 | pustaka `pu-2026-infrastruktur-sumatra-mei`, jembatan daerah saja (lantai kartu 8.5) | resmi |
| rehab.perhatian.sementara.n / n_dua_kelas / n_syarat_a / n_syarat_c | 40 / 73 / 198 / 129 | `irbi/irbi_kab_2025.csv`; `skenario-hidromet/dibi_kab_tahun.csv`, `dibi_geologi_kab_tahun.csv` | asumsi-kebijakan |
| rehab.hukum.r3p_tahun_maks | 3 | Perban 5/2017 Pasal 10, pustaka `bnpb-2017-r3p` | resmi |
| rehab.juklak7.prasarana_vital_n | 6 | Juklak 7/2023 hlm. PDF 8, pustaka `bnpb-2023-standar-data` | resmi |
| rehab.rekon.cianjur2022.rumah_rusak_r3p | 114.315 | pustaka `cianjur-2022-r3p` hlm. PDF 55 | resmi |
| rehab.rekon.cianjur2022.r3p_air_sanitasi_kerusakan_rp | 1.895.861.300 | pustaka sama, Tabel 3.8 | resmi |
| rehab.rekon.cianjur2022.r3p_spam_perkotaan_rp | 41.599.615.049,20 | pustaka sama | resmi |
| rehab.rekon.sumatra2025.spam_terdampak_feb / spam_berfungsi_feb | 176 / 143 | pustaka `pu-2026-spam-sumatra-feb` | resmi |
| rehab.rekon.sumatra2025.spam_terdampak_mei / spam_fungsi_persen_mei | 178 / 95,5 | pustaka `pu-2026-infrastruktur-sumatra-mei` | resmi |
| rehab.rekon.sumatra2025.spam_sumbar_target_permanen | Agustus 2028 (60 SPAM Sumbar) | pustaka `pu-2026-spam-sumatra-feb` | resmi |
| rehab.rekon.sumatra2025.sumur_bor_pu_feb | 128 | pustaka sama | resmi |
| rehab.rekon.sumatra2025.jembatan_daerah_pu / jembatan_daerah_fungsi_persen_mei | 1.181 / 67 | pustaka `pu-2026-infrastruktur-sumatra-mei` | resmi |
| rehab.rekon.sumatra2025.jalan_daerah_ruas_pu | 2.421 | pustaka sama | resmi |
| rehab.rekon.sumatra2025.jembatan_nasional_aceh_putus | 14 | pustaka `binamarga-2025-aceh-14-jembatan` | resmi |
| rehab.rekon.sumatra2025.rumah_rusak_bnpb_des / rumah_terdampak_pkp_jan | 147.000 / 189.308 | pustaka `jawapos-2025-bnpb-147-ribu-rumah`, `investortrust-2026-pkp-189308-rumah`; dikutip ulang `dpr-2026-rumah-sumatra` | terverifikasi (media); sekunder, lampiran saja |

**Koreksi untuk kunci KERANGKA §5 yang belum dibangun:** `rehab.dibi.jembatan_rusak.porsi_banjir_persen` = 89,2 (bukan
sekitar 91); `rehab.pipa.sumatra2025.target_permanen` harus berlingkup "60 SPAM Sumatera Barat".

---

## Pustaka

21 entri di `naskah/rehab/bukti/bab-03.pustaka.json`. Sembilan dipakai ulang dari berkas bukti saudara dengan catatan
halaman diperbarui untuk bab ini (`bnpb-dibi`, `bnpb-irbi`, `bnpb-2023-standar-data`, `cianjur-2022-r3p`,
`bnpb-2017-r3p`, `bnpb-2011-pdna`, `bnpb-2008-kebutuhan-dasar`, `bnpb-2023-satudata`, `bnpb-2025-renstra`); dua dipakai
ulang dari `pustaka.json` induk untuk lantai pra-2008 (`bappenas-2006-dala-yogya`, `brr-2009-scattered-beads`);
sepuluh baru: `pu-2026-spam-sumatra-feb`, `pu-2026-infrastruktur-sumatra-mei`, `binamarga-2025-aceh-14-jembatan`,
`dpr-2026-rumah-sumatra` (keempatnya dibuka 25 Okt 2026), `jawapos-2025-bnpb-147-ribu-rumah`,
`investortrust-2026-pkp-189308-rumah` (media, dibuka 25 Okt 2026, lampiran saja), `kontan-2025-bnpb-498-jembatan`
(sekunder, lampiran saja), `esdm-2019-sumur-750`, `setkab-2023-banjarbakula`, `pu-2025-jembatan-gantung` (tiga terakhir
dari riset C, D, B, tidak dibuka ulang, hanya untuk contoh aturan biaya satuan).

---

## Catatan perbaikan atas temuan pemeriksa (25 Okt 2026)

Sembilan temuan dicek ke sumber; semuanya terbukti dan diperbaiki. Tidak ada temuan yang ditolak.

1. Jembatan per kejadian (tinggi): terbukti. Saringan kab dari `dibi.baris_peristiwa` memberi Jabodetabek 33 (RB 730,
   tanpa saringan kab 2.244) dan Demak 0 (tanpa saringan kab 2: Sragen, Pekalongan). Hitungan dipindah ke
   `bangun/rehab_angka.py`; uji diri RB jendela = `kejadian_besar.csv` lolos untuk 25 dari 25 kejadian berjendela, dan
   10 nilai jembatan yang dikutip bab ini dikunci di skrip.
2. Lantai gempa (tinggi): terbukti. Yogyakarta 2006 154.000–157.000 hancur (registri `bappenas.yogya2006.rumah_hancur`)
   ditambahkan sebagai lantai kejadian 1996–2025, berdampingan dengan Padang 2009 sebagai lantai DIBI; Celah pra-2008
   ditambahkan.
3. Juklak 7/2023 (tinggi): terbukti di korpus hlm. 12, 23, 24, 38. Klaim dibatasi; status jembatan dan durasi pulih
   ditulis sebagai usulan baru R-RR-01.
4. Rumah rusak Sumatra (tinggi): label diturunkan ke terverifikasi (media), lampiran saja. Rujukan DPR ke Antara dan
   housingestate tidak dapat dicek ulang (PDF DPR menolak akses 25 Okt 2026); yang dibuka adalah JawaPos 17 Des 2025
   (BNPB, data 16 Des, rincian per provinsi menjumlah 147.217) dan Investortrust 11 Jan 2026 (PKP, data 9 Jan, rincian
   menjumlah 189.308). Rilis BNPB dan PKP asal belum ditemukan.
5. R3P SDA (sedang): terbukti. Tabel 3.5 R3P: 170,58 + 0,13 + 2,29 + 41,60 = 214,60; rincian Tabel 3.9 = Rp53,2 miliar.
6. Lantai jembatan banjir (sedang): terbukti; kunci `rehab.lantai.jembatan.banjir.kejadian` = 1.181 ditambahkan.
7. Pustaka R3P (sedang): terbukti di halaman awal R3P (Kepbup 360/KEP.118-BAPPERIDA/2023; sumber tabel "Tim Jitupasna
   Kabupaten Cianjur, 2023"). Tahun terbit dan catatan pustaka diperbaiki.
8. Label Lombok dan Cianjur SPAM (sedang): label diturunkan; sel matriks dari riset D/E diberi tanda bintang.
9. Lantai tsunami (sedang): terbukti. Kolom keluaran (140.304 dibangun) dipisah dari kerusakan; lantai kerusakan =
   sampai 139.195 rumah hancur atau rusak berat (BRR, registri `brr.aceh2004.rumah_rusak`).
