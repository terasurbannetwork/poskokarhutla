---
kajian: rehab
bab: 12
judul: BAB 12 KESIMPULAN DAN REKOMENDASI
jenis: berkas bukti
disusun: 25 Oktober 2026
status: bukti draf (belum melewati penyunting substansi)
pemilik_berkas: belum ditetapkan (KERANGKA rehab §12; glob data/** saat ini jatuh ke pipa-data)
pasangan: bab-12.angka.json (usulan kunci registri rehab.*), bab-12.pustaka.json (CSL-JSON, 43 sumber)
---

# Berkas bukti BAB 12 KESIMPULAN DAN REKOMENDASI, Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030

Aturan yang dipakai: Buku Pegangan L56–L64 dan `PEDOMAN-DESAIN.md` §C9 (empat bagian per pertanyaan kunci; Bab
Kesimpulan berisi wawasan baru dan kalimatnya tidak boleh mengulang kalimat bab lain, gerbang "Pengulangan lintas bab"),
`rehab/KERANGKA.md` §3 (tesis), §4 BAB 12, §6 (register R-RR dan KD-R), §10 (celah), `rehab/KEPUTUSAN-AWAL.md`
(Q1–Q20 berstatus keputusan; R1–R5), lalu `KEPUTUSAN.md`. Label keyakinan: **resmi**, **terverifikasi**,
**estimasi-model**, **asumsi-kebijakan**. Angka berverifikasi sekunder hanya di lampiran rekonsiliasi (R3, Q16) dan di
berkas ini hanya muncul di bagian Celah. Butir bertanda **[Inferensi tim]** adalah penilaian penyusun.

**Sifat bab ini.** Bab 12 tidak membawa data baru dari lapangan. Bahannya adalah berkas bukti Bab 1–9 yang sudah
diperiksa (`naskah/rehab/bukti/bab-01.md` sampai `bab-09.md`; Bab 10 dan 11 belum tersedia saat berkas ini disusun),
register KERANGKA §6, dan teks peraturan yang dicek ulang sesi ini. Tiap temuan tetap menyebut sumber asalnya (berkas
data, pasal, atau rilis), bukan sekadar "lihat Bab N", supaya penyunting substansi dapat memeriksa langsung.

Bahan yang dibaca ulang sesi ini: korpus `data/raw/hukum/teks` untuk Perban BNPB 4/2024 Pasal 5, Perban 1/2026 Pasal 14,
Perban 5/2017 Pasal 2, 8, 10, 12, Perban 6/2017 Pasal 14, Perban 1/2023 Pasal 7–8, Perban 4/2020 Pasal 11 dan 13
(semua dibaca dari `halaman[].t`); `data/program-terbukti/kompendium_program.csv` (kolom `kekuatan` dan `posisi` untuk
P07, P08, P09, P13, P16); `rehab/riset/E-pelajaran-program.md` (tabel kompendium, kolom kekuatan bukti). Sumber web
dibuka 25 Oktober 2026: rilis Setneg 13 Agustus 2026 (angka jembatan TNI AD, Polri, dan sumber air TNI AD dicek ulang
dan cocok); pencarian progres Satgas PRR Oktober 2026 (hanya ditemukan media, lihat P6 Celah).

## 0. Kerangka bab dari rehab/KERANGKA.md §4

- **Judul:** BAB 12 KESIMPULAN DAN REKOMENDASI (perkiraan 4 hlm).
- **Subbab:** 12.1 Kesimpulan; 12.2 Keputusan yang Diminta dari Kepala BNPB; 12.3 Rekomendasi Internal BNPB; 12.4
  Rekomendasi Lintas K/L; 12.5 Yang Sengaja Tidak Direkomendasikan; 12.6 Yang Belum Diketahui.
- **Tujuan bab:** tidak ditulis eksplisit di KERANGKA. Dipakai rumusan kerja: menutup kajian dengan kesimpulan yang
  menjawab tesis §3, keputusan yang dapat diambil Kepala BNPB, dan rekomendasi berlapis, berunit, dan berpasal.
- **Pertanyaan kunci:** KERANGKA tidak mendaftar pertanyaan kunci untuk Bab 12. Enam pertanyaan di bawah diturunkan
  satu per subbab (P1 = 12.1 sampai P6 = 12.6), supaya struktur §C9 tetap utuh.
- **Temuan kunci yang diharapkan:** tidak didaftar KERANGKA. Yang dikunci KERANGKA untuk bab ini: daftar "yang tidak
  direkomendasikan" (lima butir) dan komponen kisi prioritas 3×3 bila rekomendasi lebih dari sembilan (L31, G18), serta
  register §6.
- **Komponen (KERANGKA):** kisi prioritas 3×3 bila rekomendasi > 9 (L31, G18); register (§6).
- **Status data menurut KERANGKA:** tidak dinyatakan; menurut berkas ini: ada untuk P1–P5 (dari Bab 1–9), sebagian
  untuk P6.

### 0.1 Koreksi atas KERANGKA yang wajib dibawa ke Bab 12 (rangkuman dari berkas bukti Bab 1–9, dicek ulang)

| No | Tertulis di KERANGKA | Hasil pemeriksaan | Dampak pada Bab 12 |
|---|---|---|---|
| K1 | Tesis §3: jembatan rusak "sekitar 91% karena banjir" | 89,2% (banjir 3.419 dari 3.833), `dibi/rekap_nasional_tahunan.csv` [alam, bencana], kunci `rehab.dibi.jembatan_rusak.porsi_banjir_persen` (bab-01 §0.1 butir 1) | Kalimat tesis yang dikunci di Bab 12 memakai "sekitar 89%" |
| K2 | "SPAM Sumatra permanen Agustus 2028" | Target Agustus 2028 hanya untuk Sumatera Barat (rilis PU 5 Februari 2026; bab-01 §0.1 butir 2) | Kesimpulan tidak menulis target permanen Sumatra secara umum |
| K3 | "14 jembatan nasional putus di Aceh" | 14 jembatan roboh atau terputus menurut inspeksi BPJN Aceh; hanya satu disebut jalan nasional (bab-01 §0.1 butir 4) | Tanpa kata "nasional" |
| K4 | Dana Bersama pascabencana bersandar Juklak 1/2025 (§4 Bab 9–11, KD-R2) | Induk Juklak 1/2025 (Perban 1/2024) dicabut Perban 1/2026 (10 Maret 2026); norma terkini Perban 1/2026 Pasal 14 ayat (5) (bab-02 T1.16; dicek ulang sesi ini) | KD-R2 dan R-RR-07 merujuk Perban 1/2026 |
| K5 | Keppres 1/2026 belum dibuka (§10 butir 10) | Sudah dibuka (salinan JDIH Kemenko Infrastruktur): Kepala BNPB Wakil Ketua II Tim Pelaksana; Menteri PU koordinator Bidang Infrastruktur (bab-01 §0.1 butir 6) | Jalur KD-R3 lewat Satgas Keppres 1/2026, bukan hanya rakor Kemenko PMK |
| K6 | Lantai erupsi Merapi 2010 (2.465 RB) | Kelud 2014 12.404 RB lebih berat (bab-08 tabel koreksi) | Kesimpulan skenario memakai lantai Kelud |
| K7 | R-RR-01 berstatus Usulan baru | Juklak BNPB 7/2023 butir 5e sudah meminta data jaringan air bersih/minum dan jalan-jembatan (bab-03 P1) | Usul status R-RR-01 diubah ke "Sudah ada, perlu dikembangkan" (P3) |

---

## P1. Apa kesimpulan utama kajian, dan apakah tesis kerja KERANGKA §3 bertahan setelah Bab 1–9?

### Inti

Tesis bertahan dengan dua koreksi angka: kerusakan akses akibat bencana alam besar dan naik tajam (3.833 jembatan pada
2018–2025, 1.088 pada 2025, sekitar 89% karena banjir), sedangkan kerusakan sistem air tidak tercatat sama sekali di
DIBI dan aset desa berada di luar hibah RR. Wawasan yang hanya terlihat setelah semua bab dirangkai adalah bahwa titik
lemah yang tercatat ada di serah ke lapis permanen untuk aset daerah dan desa: jalan dan jembatan nasional Sumatra
berfungsi 100% per Mei 2026, jembatan daerah tertinggal sekitar sepertiga (67%) sementara jalan daerah 94%, dan dua dari
tiga contoh lapis permanen yang tercatat (Jembatan Palu IV dan huntap Sulawesi Tengah) melampaui masa R3P tiga tahun,
sementara program RR air atau akses Indonesia (Palu IV, DI Gumbasa) belum pernah dievaluasi secara independen. Apakah
lapis darurat cukup cepat tidak dapat dinilai dari data yang ada (lihat butir 6).

### Temuan bersumber

1. **Beban akses.** Jembatan rusak akibat bencana alam 2018–2025: 3.833; 2025: 1.088 (28,4% dari delapan tahun; 2,8
   kali rerata 2018–2024 sebesar 392,1); banjir 3.419 (89,2%). Sumber: `dibi/rekap_nasional_tahunan.csv`, baris
   `klasifikasi=alam`, `cakupan=bencana`; kunci `rehab.dibi.jembatan_rusak.2018_2025`, `rehab.dibi.jembatan_rusak.2025`,
   `rehab.dibi.jembatan_rusak.rasio_2025_rerata`, `rehab.dibi.jembatan_rusak.porsi_banjir_persen` (bab-01.angka.json);
   pustaka `bnpb-dibi`. Label: resmi. **Dibantah oleh** angka riset F dan KERANGKA (banjir 3.490, porsi sekitar 91%),
   yang menjumlah 3.947 dan tidak dapat direproduksi (bab-01 §0.1 butir 1). Catatan patahan seri 2024: Juklak 7/2023
   menambah ambang kejadian (dapat menurunkan angka) tetapi formulirnya juga mulai meminta jembatan per RB, RS, RR (hlm.
   12, 23–24; dapat menaikkan pencatatan), jadi arah pengaruhnya tidak pasti. Dasar yang kuat adalah besarnya: 1.088 pada
   2025 jauh di atas rentang 2018–2024.
2. **Air tidak tercatat di DIBI.** Dari 19 kolom dampak DIBI tidak ada kolom air minum, SPAM, sumur, status jalan, desa
   terputus, atau hari pulih; padahal Juklak BNPB 7/2023 butir 5e mendaftar jaringan air bersih/minum dan jalan-jembatan
   sebagai prasarana vital, dan formulirnya meminta jembatan menurut RB, RS, RR. Sumber: `dibi/README.md`;
   `data/raw/hukum/teks/juknis-nomor-7-tahun-2023.json` hlm. PDF 8, 12, 23–24; kunci `rehab.dibi.kolom_dampak_n`,
   `rehab.juklak7.prasarana_vital_n` (bab-03.angka.json); pustaka `bnpb-dibi`, `bnpb-2023-standar-data`. Label: resmi
   (teks Juklak dari salinan non-JDIH).
3. **Aset desa di luar hibah RR.** Perban BNPB 4/2024 Pasal 5: kegiatan RR "tidak dapat membiayai" antara lain "biaya
   perencanaan, pengawasan, operasional, dan pemeliharaan" (huruf b), "pembelian lahan" (huruf d), "aset rusak milik
   pemerintah desa" (huruf e). Sumber: `data/raw/hukum/teks/perban-nomor-4-tahun-2024.json` hlm. 4, dicek sesi ini;
   kunci `rehab.hukum.hibah_rr_larangan_pembiayaan_huruf` (bab-02.angka.json); pustaka `bnpb-2024-hibah-rr`. Label:
   resmi.
4. **Selisih pemulihan aset nasional dan daerah, Sumatra 2025.** Per 7 Mei 2026: jalan dan jembatan nasional terdampak
   fungsional 100%; sekitar 67% dari 1.181 jembatan daerah terdampak; 94% dari 2.421 ruas jalan daerah; sekitar 95,5%
   dari 178 SPAM terdampak berfungsi. Sumber: rilis ePPID Kementerian PU 11 Mei 2026; kunci
   `rehab.akses.sumatra2025.jalan_jembatan_nasional_persen_fungsi_mei2026`,
   `rehab.akses.sumatra2025.jembatan_daerah_persen_fungsi_mei2026`, `rehab.pipa.sumatra2025.persen_fungsi_mei2026`
   (bab-01.angka.json); pustaka `pu-2026-infrastruktur-sumatera-mei` (diakses 25 Oktober 2026 oleh penyusun Bab 1).
   Label: resmi. Selisih nasional lawan jembatan daerah 33 poin persen (khusus jembatan; untuk jalan daerah selisihnya 6
   poin): kunci baru `rehab.pulih.sumatra2025.selisih_nasional_daerah_poin` (olahan). **Dibantah sebagian oleh** DIBI 2025 tiga provinsi
   744 jembatan (`rehab.dibi.jembatan_rusak.sumatra3prov.2025`); keduanya ditulis berdampingan, karena PU menghitung
   jembatan daerah terdampak dan DIBI jembatan rusak semua status.
5. **Durasi lapis permanen terhadap masa R3P.** Masa R3P paling lama 3 tahun (Perban 5/2017 Pasal 10, dicek sesi ini,
   hlm. 9–10), dihitung sejak R3P ditetapkan. Dua dari tiga contoh tercatat melampauinya: huntap Sulawesi Tengah tersisa
   382 dari 5.598 per Juni 2024, sekitar lima tahun delapan bulan setelah bencana dan belum selesai (pustaka
   `kemenkopmk-2024-huntap-sulteng`, kunci `rehab.pelajaran.sulteng.huntap_sisa_jun2024`, resmi); Jembatan Palu IV dibuka
   sekitar 7,4 tahun setelah runtuh (pustaka `ocg-2026-palu4`, kunci `rehab.akses.palu4.tahun_runtuh_ke_buka`,
   terverifikasi olahan), sekitar 2,5 kali masa R3P (kunci baru `rehab.pulih.palu4_kali_masa_r3p`, asumsi-kebijakan,
   olahan, n=1). Contoh ketiga masih di dalam masa R3P: target permanen SPAM Sumatera Barat Agustus 2028, sekitar 2 tahun
   9 bulan setelah kejadian dan lebih pendek lagi bila dihitung dari penetapan R3P (pustaka `pu-2026-spam-sumatera-feb`,
   kunci `rehab.pipa.sumbar.target_permanen`, resmi); ini target, bukan durasi tercatat.
6. **Lapis darurat Sumatra: angka tercatat lawan model.** Sumatra 2025: 128 sumur bor PU (25 Ditjen SDA, 103 Cipta
   Karya), 37 di antaranya selesai per 2 Februari 2026, dan 537 sarana air darurat yang jenisnya tidak dirinci rilis PU
   (pustaka `pu-2026-spam-sumatera-feb`, kunci `rehab.pipa.sumatra2025.sumur_bor_feb2026`,
   `rehab.akuifer.sumatra2025.pu_sumur_selesai_feb2026`, `rehab.pipa.sumatra2025.sarana_darurat_feb2026`, resmi).
   Kebutuhan model lantai banjir sekitar 14.563 m³ per hari, setara sekitar 486 sumur atau 729 truk, dengan basis 970.876
   jiwa mengungsi (DIBI, jumlah per laporan) (kunci `rehab.darurat.banjir.air_m3_hari`, `rehab.darurat.banjir.sumur_setara`,
   `rehab.darurat.banjir.truk_setara`, bab-08.angka.json, asumsi-kebijakan dari Perka 7/2008 dan rasio Badan Geologi).
   Berdampingan: 128 sumur PU setara sekitar 26% dari 486 sumur-setara model (37 selesai, sekitar 8%); sumur TNI AD dan
   Polri tidak berdaftar. Tidak ada data waktu pemasangan, jadi kecepatan lapis darurat tidak dapat dinilai.
7. **Bukti program air dan akses.** Tidak ada program RR air atau akses berbukti kuat. Di Indonesia: Jembatan Palu IV
   (jembatan) dan rehabilitasi DI Gumbasa (air) berkekuatan "lemah", hanya keluaran dan klaim peresmian, tanpa evaluasi
   independen. Luar negeri: SCIRT Christchurch (air dan jembatan) "sedang"; pemulihan air Kobe "lemah"
   (`rehab/riset/E-pelajaran-program.md` tabel Kompendium calon dan bagian 4). Untuk konteks rumah dan tata kelola, bukan
   air atau akses: BRR Aceh-Nias (lintas), Rekompak, dan rumah Lombok "lemah" (`program-terbukti/kompendium_program.csv`
   P08, P07, P09); CSRRP huntap Sulteng (Indonesia) "sedang (bersyarat)"; hibah bertermin Nepal "sedang". PAMSIMAS
   "sedang" tetapi program reguler prabencana (P13). Program jembatan TNI AD dan Polri belum punya evaluasi dampak sehingga
   berposisi "Program berjalan, wajib evaluasi dampak" (KERANGKA prinsip 9). Label: asumsi-kebijakan (analisis penyusun
   dengan rubrik kompendium; rubrik bukan penilaian resmi pemerintah).
8. **Lantai skenario berubah setelah KERANGKA.** Gempa Mw 7,7 Flores 15 Agustus 2026: DIBI tarik 23 Oktober 2026 mencatat
   131.331 rumah rusak dan 29.303 RB di 11 kab/kota. DIBI juga mencatat 36 jembatan rusak di NTT sepanjang 2026 untuk
   kategori gempa, termasuk gempa Flores (angka provinsi-tahun, juga memuat gempa NTT lain 2026 dan tidak memuat Bima,
   Kota Bima, dan Selayar; sementara), lebih dari tiga kali (3,6) lantai provinsi-tahun gempa 2018–2025 (10). Sumber: kunci `rehab.lantai.gempa.flores2026.rumah_rusak_dibi`, `rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026`,
   `rehab.dibi.jembatan_rusak.gempa.prov_tahun_maks_2018_2025` (bab-08.angka.json); pustaka `bnpb-dibi`. Label: resmi,
   sementara. **Dibantah oleh** rilis BNPB 22 Agustus 2026 (53.971 rumah rusak) dan rilis verifikasi (51.591 rumah
   terverifikasi dari 102.384 data awal) (pustaka `bnpb-2026-flores-hari8`, `bnpb-2026-flores-verifikasi`); ditulis
   berdampingan.

### Inferensi

- **[Inferensi tim]** Kalimat tesis untuk kunci `rehab.tesis` (usulan, menggantikan §3): "Pada 2018–2025 DIBI mencatat
  3.833 jembatan rusak akibat bencana alam, sekitar 89% karena banjir dan 1.088 pada 2025 saja, sedangkan kerusakan
  sistem air minum tidak tercatat di DIBI dan aset desa berada di luar hibah rehabilitasi dan rekonstruksi; Grand Design
  2026–2030 menjadikan waktu pulih akses dan air sebagai ukuran keberhasilan rehabilitasi dan rekonstruksi, mengikat
  program jembatan dan sumur bor TNI, Polri, dan Kementerian PU ke R3P, dan membentuk baseline kerusakan dan pemulihan
  layanan air per kab/kota paling lambat 2027." Label: resmi untuk angka dan pasal; asumsi-kebijakan untuk komitmen.
- **[Inferensi tim]** Pola dua kecepatan yang tercatat (aset nasional cepat; jembatan daerah, desa, dan lapis permanen
  lambat) menunjuk satu titik tekan: titik serah lapis sementara ke permanen untuk aset non-nasional. Itulah tempat jalur
  dana tertutup (Pasal 5 huruf b dan e), pemilik aset darurat tidak tertulis, dan pencatatan berhenti. Lapis darurat
  tampak bergerak (128 sumur PU dan 537 sarana dalam sekitar dua bulan), tetapi menilainya "cepat" atau "dalam orde
  kebutuhan" belum didukung data waktu dan daftar sumur TNI AD dan Polri (butir 6). Wawasan ini menjadi alasan KD-R2 dan
  KD-R3 didahulukan; penambahan stok darurat ditunda penilaiannya, bukan ditolak.
- **[Inferensi tim]** Kalimat "program RR air atau akses Indonesia belum pernah dievaluasi secara independen" lebih jujur
  daripada "berbukti lemah": label lemah di rubrik berarti tidak ada evaluasi, bukan bahwa evaluasi menunjukkan dampak
  kecil.
- **[Inferensi tim]** Karena ukuran pemulihan air yang tersedia hanya unit SPAM berfungsi, angka 95,5% tidak boleh dibaca
  sebagai 95,5% jiwa pulih; kesimpulan menulisnya sebagai unit dan menyebut bahwa jiwa terlayani tidak diketahui.
- **[Inferensi tim]** Satu-satunya bukti dampak ketat untuk akses (RCT jembatan pejalan kaki Rwanda) berasal dari luar
  RR; kesimpulan memakainya sebagai rancangan evaluasi, bukan sebagai klaim bahwa program jembatan Indonesia berdampak.

### Celah

- Jiwa atau sambungan yang kehilangan air per kejadian tidak tercatat di sumber resmi mana pun yang dibuka; kesimpulan
  menulis "tidak diketahui" dan merujuk R-RR-01 dan R-RR-09.
- Progres Sumatra setelah 7 Mei 2026 dari sumber resmi tidak ditemukan; angka Oktober 2026 hanya ada di media (lihat P6).
- Data jembatan per kab 2018–2025 belum ditarik; kesimpulan sebaran berhenti di tingkat provinsi.

---

## P2. Keputusan apa yang diminta dari Kepala BNPB, dengan dasar dan akibat tiap pilihan?

### Inti

Empat keputusan (KD-R1 sampai KD-R4) dan lima keputusan 14 hari pertama. KD-R1, KD-R3, dan keputusan 14 hari dapat
diambil Kepala BNPB dengan instrumen yang ada (koordinasi monev, walidata, penetapan R3P, forum Satgas); KD-R2 hanya dapat
diusulkan Kepala BNPB bersama Kemenkeu dan Kemendesa, karena hibah RR dan Dana Bersama melibatkan Kemenkeu dan dasar
larangan aset desa di atas Perban belum diperiksa; KD-R4 memerlukan kesepakatan dengan Kementerian ESDM. Dua keputusan
perlu dibetulkan dasarnya: KD-R2 merujuk Perban 1/2026 (bukan Juklak 1/2025), dan KD-R3 dapat menumpang Satgas Keppres
1/2026 yang menempatkan Kepala BNPB sebagai Wakil Ketua II Tim Pelaksana.

### Temuan bersumber

1. **KD-R1 (waktu pulih sebagai ukuran).** Dasar: Perban 6/2017 Pasal 10 mendefinisikan keluaran (outcome) RR sebagai
   "manfaat yang dirasakan oleh masyarakat korban bencana dan lingkungan" (`perban-nomor-6-tahun-2017.json` hlm. 10,
   bab-02 T1.12); Pasal 14 ayat (2) BNPB dan/atau BPBD mengoordinasikan monev (dicek sesi ini, hlm. 13); Perban 1/2023
   Pasal 7–8: walidata bencana adalah unit kerja BNPB yang bertugas memastikan ketersediaan data dan menyiapkan standar
   (dicek sesi ini, hlm. 5–6). Tidak ditemukan standar waktu pulih air atau akses di peraturan BNPB (bab-02 C1.1). Pustaka
   `bnpb-2017-rr`, `bnpb-2023-satudata`. Label: resmi.
2. **KD-R2 (jalur dana aset desa).** Dasar masalah: Perban 4/2024 Pasal 5 huruf b, d, e (butir P1.3). Perban 1/2026
   tidak menyebut dan tidak melarang aset desa. Pasal 14 ayat (5) hanya kriteria penelaahan: permohonan tahap
   pascabencana wajib merujuk R3P yang ditetapkan dan diajukan pada masa keberlakuan R3P (hlm. 6–7). Pasal 9 ayat (2):
   pemohon terdiri atas kementerian/lembaga dan Pemerintah Daerah (hlm. 5); Pasal 12: kelompok masyarakat dapat
   mengajukan melalui Pemerintah Daerah (hlm. 6); desa tidak tercantum sebagai pemohon. Pasal 25 ayat (1): rekomendasi
   disampaikan Kepala BNPB kepada menteri keuangan dan pemohon (hlm. 10). Sumber: `perban-nomor-1-tahun-2026.json`,
   dicek sesi ini; bab-02 T1.16. Pustaka `bnpb-2026-dana-bersama`, `bnpb-2024-hibah-rr`. Label: resmi. **Dibantah sebagian oleh** katalog JDIH lokal yang masih
   menandai Juklak 1/2025 BERLAKU padahal induknya dicabut (bab-02 T1.16, C1.3).
3. **KD-R3 (ikat program jembatan TNI AD dan Polri ke R3P).** Skala: TNI AD 3.008 titik, 2.500 selesai, 508 proses, 798
   di daerah bencana; Polri 895 unit, 874 selesai, 17 dibangun, 4 rencana, swadaya di 30 Polda; per 13 Agustus 2026.
   Sumber: rilis Setneg 13 Agustus 2026, dibuka ulang sesi ini 25 Oktober 2026, angka cocok; kunci
   `rehab.jembatan.garuda.titik_2026_08`, `rehab.jembatan.garuda.selesai_2026_08`,
   `rehab.jembatan.garuda.titik_wilayah_bencana_2026_08`, `rehab.jembatan.polri_mpp.jumlah_total_2026_08`,
   `rehab.jembatan.polri_mpp.selesai_2026_08`; pustaka `setneg-2026-jembatan-tni-polri`. Label: resmi. Kedua program
   adalah program reguler (TNI AD hanya 798 dari 3.008 titik di daerah bencana), bukan kegiatan RR dalam R3P. Norma
   pelaporan: Perban 6/2017 Pasal 14 ayat (4) "Setiap pelaksana kegiatan Rehabilitasi dan Rekonstruksi Pascabencana wajib
   menyusun dan menyampaikan laporan" kepada BPBD dan/atau BNPB (dicek sesi ini, hlm. 13); pasal ini hanya mengikat
   pelaksana kegiatan RR, jadi tidak berlaku otomatis bagi program jembatan TNI AD dan Polri. Jalur forum: Keppres 1/2026,
   Kepala BNPB Wakil Ketua II Tim Pelaksana, Menteri PU koordinator Bidang Infrastruktur (pustaka `ri-2026-keppres1`;
   bab-01 §0.1 butir 6). Label: resmi. Catatan nama (R2): rilis resmi TNI AD tidak memakai "Garuda" maupun "Satgas"
   (bab-09 PK2 butir 1); kunci `rehab.jembatan.garuda.*` tetap dipakai sebagai nama kunci, naskah menulis "program
   jembatan TNI AD yang dipimpin KSAD".
4. **KD-R4 (protokol sumur bor RR bersama Badan Geologi).** Dasar: 421 CAT menjadi acuan zona konservasi, tetapi zona per
   CAT baru ditargetkan 2029 untuk CAT prioritas dan 2045 untuk seluruh CAT (pustaka `badangeologi-2025-capaian`; kunci
   `rehab.akuifer.zona_konservasi_target_prioritas`, `rehab.akuifer.zona_konservasi_target_semua_cat`, resmi); tidak ada
   protokol yang menyebut siapa menguji mutu sumur darurat dan dengan parameter apa, sedangkan Permenkes 2/2023 menuntut
   E. coli 0 CFU/100 ml (pustaka `kemenkes-2023-permenkes2`, kunci `rehab.akuifer.permenkes_ecoli_maks`, resmi; bab-07
   PK3). Satu-satunya jalur serah terima sumur tertulis adalah hibah BMN Badan Geologi ke pemda (pustaka
   `esdm-2023-hibah-bmn`, resmi; bab-07 PK5).
5. **Keputusan 14 hari (5 butir).** KERANGKA §6: penugasan Deputi Bidang RR; inventaris bailey, kit pipa, IPA mobile, truk
   tangki per Direktorat PD Wilayah; permintaan data ke PU, Badan Geologi, TNI AD, Polri; permintaan teks Inpres 18/2025;
   penugasan Pusdatinkom merancang kolom DIBI. OTK berlaku: Deputi Bidang RR terdiri atas Direktorat RR Perumahan,
   Direktorat RR Infrastruktur, Direktorat RR Sosial, Ekonomi, dan Lingkungan Hidup (Perban 11/2025 mengubah Pasal 82
   Perban 6/2025; pustaka `bnpb-2025-otk-ubah`; bab-02 T2.10). Label: resmi (struktur); asumsi-kebijakan (penugasan).
   Butir "permintaan teks Keppres 1/2026" di KERANGKA gugur karena teks sudah dibuka (K5).

### Inferensi

- **[Inferensi tim]** Urutan pita keputusan di Pesan Kunci: KD-R1, KD-R3, KD-R2, lalu KD-R4. Alasannya: KD-R1 dan KD-R3
  hanya memerlukan penetapan dan forum yang sudah ada (Perban 6/2017, Perban 1/2023, Keppres 1/2026); KD-R2 memerlukan
  perubahan Perban 4/2024 atau koordinasi Kemenkeu (Perban 4/2024 Pasal 2 ayat (2)) dan Kemendesa; KD-R4 memerlukan
  kesepakatan dengan Kementerian ESDM. Urutan KERANGKA (R1, R2, R3) tidak salah, tetapi waktu tempuh R2 paling panjang.
- **[Inferensi tim]** KD-R3: pengikatan jembatan TNI AD dan Polri di daerah bencana ke R3P adalah syarat agar kewajiban
  lapor Perban 6/2017 Pasal 14 ayat (4) berlaku, bukan akibat dari kewajiban itu. Begitu jembatan dicantumkan sebagai
  kegiatan RR dalam R3P, pelaksananya menjadi "pelaksana kegiatan RR" dan wajib melapor ke BNPB atau BPBD.
- **[Inferensi tim]** KD-R2: jalur Dana Bersama untuk aset desa baru mungkin bila Pemerintah Daerah mengajukan
  permohonan atas jembatan atau SPAM desa yang tercantum di R3P (Perban 1/2026 Pasal 9 ayat (2), Pasal 14 ayat (5)).
  Keputusan akhirnya melewati rekomendasi Kepala BNPB ke Menteri Keuangan (Pasal 25), jadi KD-R2 dirumuskan sebagai usul
  Kepala BNPB bersama Kemenkeu dan Kemendesa, bukan keputusan yang dapat diambil BNPB sendiri. Bila larangan aset desa
  Perban 4/2024 Pasal 5 huruf e ternyata turunan PP atau PMK hibah daerah, mengubah Perban saja tidak membuka jalur itu.
- **[Inferensi tim]** Akibat pilihan (b) "tidak" untuk KD-R3 kini dapat diberi besaran: 798 titik TNI AD di daerah
  bencana dan jembatan Polri di daerah bencana berjalan tanpa pemilik aset tertulis di R3P; besaran ini resmi, sedangkan
  risikonya (aset yatim) adalah penilaian.
- **[Inferensi tim]** KD-R1 sebaiknya menyebut bahwa sasaran waktu pulih berlabel asumsi-kebijakan sampai baseline 2027
  terbentuk (Q11), dengan pembanding Kobe 90% dalam 38 hari dan Tohoku 90% dalam 36 hari (pustaka `jsce-2011-lifeline`,
  terverifikasi) dan titik Sumatra (81% unit sekitar hari ke-72, 95,5% unit sekitar hari ke-166; kunci
  `rehab.pipa.sumatra2025.persen_fungsi_feb2026`, `rehab.pipa.sumatra2025.hari_ke_mei2026`, estimasi-model). Satuan
  berbeda (rumah tangga lawan unit SPAM), jadi hanya arah yang dibandingkan.

### Celah

- Keputusan Kepala BNPB tentang kegiatan yang dapat dibiayai DSP (Perban 4/2020 Pasal 11: "akan ditetapkan oleh Kepala
  BNPB", dicek sesi ini, hlm. 11) dan rincian kegiatan hibah RR (Perban 4/2024 Pasal 2 ayat (2)) tidak ditemukan di
  korpus. Disajikan sebagai "tidak ditemukan di korpus JDIH lokal; diminta ke Biro Hukum, Organisasi, dan Kerja Sama".
- Inpres 18/2025 belum dibuka utuh (hanya ringkasan halaman JDIH Kemenko Infrastruktur, pustaka
  `kemenkoinfra-2026-inpres18`). Naskah tidak mengutip isinya.
- Dasar hukum pembentukan program jembatan TNI AD tidak ditemukan.
- Dasar larangan pembiayaan aset rusak milik pemerintah desa (Perban 4/2024 Pasal 5 huruf e) di atas Perban, yaitu PP
  atau PMK tentang hibah daerah, belum diperiksa. Sampai diperiksa, ruang KD-R2 yang dapat dibuka lewat perubahan Perban
  saja tidak diketahui.

---

## P3. Rekomendasi internal BNPB mana yang diusulkan, pada lapis dan unit mana?

### Inti

Delapan dari 15 rekomendasi register dapat dijalankan BNPB dengan instrumennya sendiri (penetapan Kepala, perubahan
Perban atau Perka, juklak, dan DIBI), dengan K/L sebagai produsen data atau mitra konsultasi: R-RR-01, 02, 03, 05, 06,
09, 11, 15. Pusatnya adalah pencatatan dan ukuran: kolom DIBI, baseline waktu pulih, baris waktu pulih di templat R3P,
dan ukuran jiwa terlayani; sisanya menyelaraskan norma darurat yang sudah berumur lebih dari 15 tahun.

### Temuan bersumber

1. **R-RR-01 kolom DIBI (lintas, Pusdatinkom, 100 hari).** Dasar: Juklak 7/2023 butir 5e dan formulir hlm. 12 sudah
   meminta jaringan air bersih/minum (hanya uraian dan taksiran rupiah) dan jembatan per RB, RS, RR; jalan per status
   jalan (hlm. 23–24); tidak tampil di tabel publik DIBI (bab-03 P1; pustaka `bnpb-2023-standar-data`). Perban 1/2023
   Pasal 8 huruf b dan d: walidata memastikan ketersediaan data dan menyiapkan norma, standar, pedoman, dan kriteria
   (dicek sesi ini). Label: resmi.
2. **R-RR-02 baseline waktu pulih dan R-RR-09 ukuran jiwa terlayani (Direktorat RR Infrastruktur, 2026–2027).** Dasar:
   ketiadaan standar waktu pulih (bab-02 C1.1); yang tercatat resmi untuk air hanya unit atau titik (Lombok 37 titik,
   Cianjur 10 titik, Sumatra 176 lalu 178 SPAM; kunci `rehab.pipa.lombok.spam_rusak`, `rehab.pipa.cianjur.titik_kerusakan_pipa`,
   `rehab.pipa.sumatra2025.spam_terdampak`; pustaka `kemenpupr-2019-satgas-lombok`, `kemenpupr-2023-cianjur`,
   `pu-2026-infrastruktur-sumatera-mei`). Standar lapis permanen SPM air minum 60 liter per orang per hari (kunci
   `rehab.pipa.standar.spm_kuantitas`, resmi). Label: resmi.
3. **R-RR-03 baris waktu pulih di templat R3P (Deputi Bidang RR).** Perban 5/2017 Pasal 8 ayat (2) huruf b: sektor
   infrastruktur meliputi "transportasi darat" dan "sumber daya air, air bersih dan sanitasi" untuk "pemulihan fungsi
   pelayanan publik" (dicek sesi ini, hlm. 7); Pasal 2 ayat (2)–(3): R3P paling lama 90 hari dan dimulai saat tanggap
   darurat. Pustaka `bnpb-2017-r3p`. Label: resmi.
4. **R-RR-05 standar hari pemasangan akses darurat dan R-RR-06 stok bailey.** Hari sampai akses darurat terbuka tidak
   dicatat sistematis; tiga contoh resmi: bailey Krueng Beutong berfungsi sekitar 39 hari setelah tercatat putus, bailey
   Temanggung masih dirakit 26 hari setelah putus, Gladak Perak 2021 bailey dinyatakan tidak memungkinkan (bentang 192 m)
   (kunci `rehab.akses.sumatra2025.krueng_beutong_hari_ke_fungsi`, `rehab.akses.temanggung2026.hari_putus_ke_laporan_rakit`,
   `rehab.akses.semeru2021.gladak_perak_bentang_m`; pustaka `pu-2026-bailey-odol`, `jatengprov-2026-bailey-plosogaden`,
   `kemenkopmk-2021-gladak-perak`). Norma BNPB yang menyebut rangka baja atau bailey hanya Perka 12/2010 dan Perka
   15/2011, dan Perka 12/2010 masih bernomenklatur "Departemen Pekerjaan Umum" (pustaka `bnpb-2010-perka12`; bab-02
   inferensi). Label: resmi.
5. **R-RR-06 kebutuhan bailey tidak dapat dihitung dari data.** DIBI tidak membedakan jembatan putus dari rusak dan
   tidak mencatat bentang (bab-08 PK3 Inti). Label: resmi (ketiadaan kolom). Barang DSP yang diserahterimakan menjadi
   tanggung jawab penerima (Perban 4/2020 Pasal 13 ayat (4), dicek sesi ini, hlm. 12; pustaka `bnpb-2020-dsp`).
6. **R-RR-11 daftar sumur darurat (Pusdatinkom, 100 hari).** Pelaksana sumur Sumatra dan sesudahnya: PU 128 sumur bor
   (37 selesai per 2 Februari 2026), TNI AD 3.000 sumber air bersih (jenis tidak disebut, dicek ulang di rilis Setneg 13
   Agustus 2026), Polri dan Badan Geologi tanpa daftar terbuka (kunci `rehab.akuifer.sumatra2025.pu_sumur_selesai_feb2026`,
   `rehab.akuifer.tniad_sumber_air_2026_08`; pustaka `pu-2026-spam-sumatera-feb`, `setneg-2026-jembatan-tni-polri`).
   Label: resmi.
7. **R-RR-15 penyelarasan dokumen.** Perban 5/2017 Pasal 12 mencabut Perka 17/2010 (dicek sesi ini, hlm. 10), tetapi
   katalog JDIH lokal menandainya BERLAKU; Perban 6/2017 Pasal 9 ayat (1) di bawah judul Rekonstruksi berbunyi
   "Penyelenggaraan Rehabilitasi"; Juklak 1/2025 kehilangan induk (bab-02 T1.16, T1.20, T1.21). Pustaka `bnpb-2017-r3p`,
   `bnpb-2017-rr`. Label: resmi.

### Inferensi

- **[Inferensi tim]** Status R-RR-01 sebaiknya diubah dari "Usulan baru" ke "Sudah ada, perlu dikembangkan", karena
  kewajiban mencatat sudah ada di Juklak 7/2023; yang baru adalah satuan fisik (unit SPAM, sambungan, jiwa) dan
  penerbitan kolom ke tabel publik. Dengan perubahan ini register menjadi 10 Usulan baru dan 5 Sudah ada, perlu
  dikembangkan (lihat Angka untuk registri).
- **[Inferensi tim]** Dasar R-RR-06 di KERANGKA ("Kartu 8.9") perlu ditambah "kebutuhan bailey tidak terhitung dari
  DIBI": inventaris tetap berguna sebagai daftar persediaan, tetapi tidak boleh disajikan sebagai pemenuhan kebutuhan
  terhitung.
- **[Inferensi tim]** R-RR-05 lebih tepat dipasang sebagai pembaruan Perka 12/2010 (yang juga dituju R-RR-15) daripada
  instrumen baru, supaya satu revisi menutup dua rekomendasi.
- **[Inferensi tim]** Pembagian internal dan lintas K/L di P3 dan P4 adalah klasifikasi penyusun menurut siapa yang
  memegang instrumen penetapnya, bukan kolom register KERANGKA.

### Celah

- Pembagian tugas internal Direktorat RR Infrastruktur per pasal Perban 11/2025 belum dibaca (bab-02 C2.2); unit
  pemimpin R-RR-02, 09 ditulis pada tingkat direktorat.
- Apakah Pusdatinkom menyimpan isian jaringan air bersih/minum per laporan tidak diketahui (bab-03 Celah); ditulis
  sebagai permintaan data.

---

## P4. Rekomendasi lintas K/L mana yang diusulkan, dan lewat jalur koordinasi apa?

### Inti

Tujuh rekomendasi memerlukan tindakan atau instrumen K/L lain: R-RR-04 (jembatan TNI AD dan Polri ke R3P), R-RR-07 (jalur
dana jembatan dan SPAM desa), R-RR-08 (pemicu peralihan truk ke pipa), R-RR-10 (protokol sumur bor dengan Badan
Geologi), R-RR-12 (syarat sumber air huntap), R-RR-13 (evaluasi dampak jembatan pedesaan), dan R-RR-14 (uji coba paket
air dan akses di satu kabupaten Sumatra). Peran BNPB di semuanya adalah koordinasi, data, penetapan R3P, dan pendanaan
DSP atau hibah, bukan perintah ke program K/L (Q8); jalurnya Satgas Keppres 1/2026 untuk Sumatra dan rakor Kemenko PMK
untuk yang nasional.

### Temuan bersumber

1. **Batas mandat.** RR tanggung jawab pemda kecuali prasarana kewenangan Pemerintah (PP 21/2008 Pasal 57 ayat (1), Pasal
   76 ayat (1)); BNPB dan/atau BPBD penanggung jawab dan koordinator, K/L dan perangkat daerah teknis pelaksana (Perban
   6/2017 Pasal 12–13). Pustaka `ri-2008-pp21`, `bnpb-2017-rr`; bab-02 PK2. Label: resmi.
2. **R-RR-04.** Lihat P2 butir 3 (skala program, norma lapor Pasal 14 ayat (4) yang hanya mengikat pelaksana kegiatan
   RR, forum Keppres 1/2026); penerapannya ke program TNI AD dan Polri lewat pencantuman di R3P ada di P2 Inferensi. Tambahan:
   biaya per unit TNI AD dan Polri tidak diumumkan; PU jembatan gantung 2025 43 unit Rp246,36 miliar (rata-rata sekitar
   Rp5,73 miliar per unit, asumsi-kebijakan) (kunci `rehab.jembatan.pu.gantung_2025_unit`,
   `rehab.jembatan.pu.gantung_biaya_rata2_2025`; pustaka `pu-2025-jembatan-gantung`). Label: resmi; asumsi-kebijakan
   untuk rata-rata.
3. **R-RR-07.** Lihat P2 butir 2. Perban 4/2024 Pasal 2 ayat (2): rincian kegiatan hibah RR ditetapkan Kepala BNPB
   setelah berkoordinasi dengan kementerian keuangan (bab-02 T1.15). Pasal 27: kegiatan yang tidak selesai menjadi
   tanggung jawab pemda lewat APBD (bab-02 T1.14). Pustaka `bnpb-2024-hibah-rr`. Label: resmi.
4. **R-RR-08.** Tidak ada peraturan BNPB atau PU yang menetapkan pemicu peralihan truk tangki ke perpipaan sementara;
   daftar kegiatan "jaringan air bersih" DSP ada di Perban 2/2018 yang dicabut (bab-06 PK2; pustaka
   `bnpb-2018-dsp-dicabut`, `bnpb-2020-dsp`). Praktik Cianjur: hidran turun dari 172 (hari ke-27) ke 59 sekitar empat
   bulan kemudian; truk dibatasi lima rit per hari (kunci `rehab.pipa.cianjur.hidran_puncak`,
   `rehab.pipa.cianjur.hidran_2023_03`, `rehab.pipa.cianjur.rit_truk_per_hari`; pustaka `kemenpupr-2023-cianjur`).
   Standar darurat Perka 7/2008: 7 liter tiga hari pertama lalu 15 liter per orang per hari (pustaka
   `bnpb-2008-kebutuhan-dasar`; R4). Label: resmi.
5. **R-RR-10.** Lihat P2 butir 4. Rasio 2.000 jiwa per sumur adalah rasio program reguler (takaran tersirat sekitar
   43–104 liter per orang per hari), bukan rasio darurat (kunci `rehab.akuifer.sumur_bg_jiwa_per_sumur`, resmi;
   `rehab.akuifer.takaran_tersirat_lpd_min`, `_maks`, estimasi-model; bab-07 PK2). Pengendalian pengambilan air tanah
   untuk menghentikan penurunan tanah (Tokyo, Osaka, Bangkok) berkekuatan "kuat" (`program-terbukti/kompendium_program.csv`
   P16). Label: resmi.
6. **R-RR-12.** Juklak BNPB 3/2023: lokasi huntara "harus memiliki akses pada layanan kesehatan, air bersih dan
   sanitasi" (hlm. 7; pustaka `bnpb-2023-huntara`); ketentuan serupa untuk huntap tidak ditemukan (bab-07 PK5 butir 10).
   Huntap Tondo (1.102 unit) masih memakai sumur bor lebih dari tiga tahun setelah bencana (pustaka
   `setneg-2022-huntap-tondo`, kunci `rehab.akuifer.huntap_tondo_unit`). Pelajaran negatif Haiyan: 31% unit huntap
   selesai kosong pada 2022 (riset E, kekuatan sedang-negatif). Label: resmi; terverifikasi untuk Haiyan.
7. **R-RR-13.** RCT Rwanda: sekitar 97 jembatan, sekitar 10.000 rumah tangga di 290 desa, biaya sekitar US$100.000 per
   jembatan, imbal hasil 78–98% (estimasi-model); Nicaragua: banjir tanpa jembatan menurunkan pendapatan 18%
   (terverifikasi) (kunci `rehab.pembanding.rwanda_*`, `rehab.pembanding.nicaragua_turun_pendapatan_persen`; pustaka
   `jpal-2026-rwanda`, `aea-2024-rwanda`, `brooks-2020-nicaragua`). TNI AD melaporkan 7.807 desa terhubung dan sekitar
   4,5 juta penerima manfaat (kunci `rehab.jembatan.tniad.desa_terhubung_2026_08`, pustaka `setneg-2026-jembatan-tni-polri`,
   resmi, klaim pelaksana tanpa evaluasi).
8. **R-RR-14.** Q20 (KEPUTUSAN-AWAL): satu paket air dan akses di satu kabupaten Sumatra 2026–2027 dengan garis dasar dan
   pembanding. Kab penanggung beban puncak banjir termasuk Kab. Aceh Utara (92.450 rumah rusak hidrometeorologi
   2015–2025; kunci `rehab.dibi.kab.acehutara.rumah_rusak_hidromet.2015_2025`, bab-04.angka.json). Label: resmi untuk
   angka; asumsi-kebijakan untuk pilihan lokasi.

### Inferensi

- **[Inferensi tim]** Untuk Sumatra, jalur R-RR-04, 07, 08, 14 paling pendek lewat Satgas Keppres 1/2026 (Bidang
  Infrastruktur dikoordinasikan Menteri PU; Bidang Pengelolaan Data oleh Kepala BPS), karena Kepala BNPB duduk di Tim
  Pelaksana. Untuk kejadian di luar Sumatra, jalurnya rakor Kemenko PMK seperti di KERANGKA.
- **[Inferensi tim]** R-RR-13 harus ditulis sebagai evaluasi dampak program TNI AD, Polri, dan PU, bukan sebagai bukti
  bahwa program itu berdampak; klaim 7.807 desa terhubung adalah keluaran, bukan dampak.
- **[Inferensi tim]** R-RR-10 dan R-RR-11 berpasangan: protokol tanpa daftar tidak dapat dipantau, daftar tanpa protokol
  tidak menjamin mutu. Keduanya sebaiknya satu paket di kisi prioritas.

### Celah

- Daftar lokasi jembatan TNI AD dan Polri di daerah bencana, pemilik aset sesudah selesai, dan biaya per unit tidak
  terbuka; ditulis "tidak diumumkan" dan masuk permintaan data 14 hari.
- R3P Aceh, Sumatera Utara, Sumatera Barat dan rencana induk RR Sumatra 2026–2028 tidak terbuka; tidak dapat diperiksa
  apakah jembatan dan sumur K/L sudah tercantum.
- Kesediaan Kemendesa dan Kemendagri membuka jalur dana desa untuk aset rusak bencana belum ada di sumber mana pun.

---

## P5. Apa yang sengaja tidak direkomendasikan, dan mengapa?

### Inti

Lima hal sengaja tidak direkomendasikan karena melanggar batas mandat, batas konservasi air tanah, larangan pagu (P5),
keputusan nama program (R2), atau prinsip lensa layanan: BNPB membangun jembatan atau SPAM permanen sendiri; sumur bor
di zona rusak tanpa rekomendasi Badan Geologi; satu angka total kebutuhan RR nasional; "Jembatan Merah Putih" sebagai
program tunggal; dan unit SPAM berfungsi sebagai ukuran tunggal pemulihan.

### Temuan bersumber

1. **Membangun aset permanen di luar pemilik aset.** PP 21/2008 Pasal 57 ayat (1) dan Pasal 76 ayat (1) (RR tanggung
   jawab pemda kecuali kewenangan Pemerintah); UU 23/2014 Lampiran membagi urusan SPAM dan jalan antartingkat
   pemerintahan; Perban 6/2017 Pasal 13 ayat (6): hasil RR menjadi aset Pemerintah, pemda, dan/atau masyarakat. Pustaka
   `ri-2008-pp21`, `ri-2014-uu23`, `bnpb-2017-rr`; bab-02 PK2. Label: resmi.
2. **Sumur di zona rusak.** Badan Geologi menyatakan sejumlah CAT rusak (pernyataan, bukan penetapan); penurunan muka
   tanah pesisir utara Jawa Tengah terukur (pustaka `esdm-2009-cat-jakarta`, `esdm-2020-penurunan-pantura`; bab-07 PK1).
   Q10 (KEPUTUSAN-AWAL): sumur RR hanya di luar zona rusak dan kritis atau dengan rekomendasi teknis Badan Geologi.
   Pembatasan pengambilan air tanah berbukti kuat menghentikan penurunan tanah (P16). Label: resmi; kuat (rubrik).
3. **Satu angka total kebutuhan.** P5 dan Q4: biaya satuan berlabel boleh, pagu dan total tidak. Biaya satuan yang ada
   saling tidak sebanding: SPAM permanen sekitar Rp0,37–1,57 miliar per l/dt (proyek besar, estimasi-model); sumur dalam
   Rp472–572 juta per unit (estimasi-model); jembatan gantung PU sekitar Rp5,73 miliar per unit (asumsi-kebijakan)
   (kunci `rehab.pipa.biaya.per_lps_jatiluhur1`, `rehab.pipa.biaya.per_lps_banjarbakula`,
   `rehab.akuifer.biaya_sumur_dalam_per_unit_2020`, `rehab.jembatan.pu.gantung_biaya_rata2_2025`). Label sesuai kunci.
4. **"Jembatan Merah Putih" sebagai program tunggal.** Satu-satunya pemakaian resmi yang dibuka: "Jembatan Merah Putih
   Presisi" (Polri, 30 Polda); nama itu juga dipakai media, Kodim, Kodam, dan pemda untuk jembatan lain (bab-05 PK3;
   pustaka `tribratanews-2026-mpp-januari`, `setneg-2026-jembatan-tni-polri`). R2 (KEPUTUSAN-AWAL). Label: resmi.
5. **Unit SPAM berfungsi sebagai ukuran tunggal.** Yang tercatat resmi hanya unit atau titik, bukan jiwa atau
   sambungan (bab-06 PK1); Kobe dan Tohoku mengukur rumah tangga tersambung (1,26 juta dan 2 juta rumah tangga padam;
   kunci `rehab.pipa.intl.kobe_rumah_tangga_padam`, `rehab.pipa.intl.tohoku_rumah_tangga_padam`; pustaka
   `jsce-2011-lifeline`). Cianjur: dua SPAM huntap tertinggal (78,21% dan 80,88%) saat lima SPAM lain 98,31% (kunci
   `rehab.pipa.cianjur.spam_huntap_sirnagalih_realisasi_2023_09`, `rehab.pipa.cianjur.spam_rehab_progres_mk_2023_09`).
   Label: resmi; terverifikasi untuk Jepang.

### Inferensi

- **[Inferensi tim]** Tambahan yang sebaiknya masuk 12.5 (usulan, belum di KERANGKA): (6) menambah stok darurat sebagai
  jawaban utama, **bersyarat**: butir ini baru layak dikunci setelah jumlah sumur TNI AD dan Polri serta waktu
  pemasangan lapis darurat diketahui (R-RR-11). Yang tercatat baru 128 sumur PU lawan 486 sumur-setara model (P1 butir
  6), jadi kecukupan lapis darurat belum dapat dinyatakan; alasan yang sudah berdiri hanyalah bahwa stok tanpa jalur
  permanen tidak menutup titik serah (pola Sulteng). (7) menyebut program mana pun "terbukti" berdampak; tidak ada
  program RR air atau akses berbukti kuat, dan program Indonesia belum pernah dievaluasi independen (P1 butir 7).
- **[Inferensi tim]** Tiap butir 12.5 ditulis dengan satu baris "mengapa tidak" dan pasal atau keputusan yang
  menahannya, bukan sekadar daftar, supaya terbaca sebagai pilihan, bukan kelalaian (L63 argumen tandingan).

### Celah

- Tidak ada. Kelima butir KERANGKA punya dasar tertulis; dua butir tambahan adalah inferensi dan ditandai.

---

## P6. Apa yang belum diketahui, dan data apa diminta dari siapa?

### Inti

Yang belum diketahui terbagi tiga: (1) ukuran pemulihan yang tidak pernah dicatat (jiwa tanpa air, desa terputus, hari
pulih, jembatan per status jalan dan per kab); (2) dokumen primer yang belum terbuka (R3P tiga provinsi Sumatra, rencana
induk RR Sumatra, Inpres 18/2025, keputusan Kepala BNPB tentang kegiatan DSP, daftar program TNI AD dan Polri, poligon
zona konservasi CAT); (3) bukti dampak program dalam negeri yang belum pernah dievaluasi. Masing-masing punya pemegang
data yang dapat dimintai dalam 14 hari pertama.

### Temuan bersumber

1. **Celah ukuran.** DIBI tanpa kolom air, desa terputus, hari pulih; jembatan tanpa status jalan dan baru terisi sejak
   2018 (kunci `rehab.dibi.jembatan_rusak.tahun_awal_terisi`, `rehab.dibi.jembatan_rusak.nol_2008_2017`); jembatan per
   kejadian gempa nyaris nol (Lombok 2018 nol, Sulteng 2018 tujuh, Cianjur 2022 dua; kunci
   `rehab.dibi.jembatan_rusak.lombok2018`, `rehab.dibi.jembatan_rusak.sulteng2018`, `rehab.dibi.jembatan_rusak.cianjur2022`).
   Pustaka `bnpb-dibi`. Label: resmi.
2. **Celah dokumen.** KERANGKA §10 (12 celah) dan §11; diperbarui oleh Bab 1–9: Keppres 1/2026 tertutup (sudah dibuka);
   Inpres 18/2025, Juklak 5/2024 (berkas tidak ada, katalog `pdf: []`), keputusan Kepala BNPB tentang DSP, R3P Sumatra
   tetap terbuka (bab-01, bab-02 T1.25, bab-09). Label: resmi (status pencarian).
3. **Celah mutu air.** Tidak ditemukan satu pun data E. coli sumur darurat dari kejadian besar Indonesia (bab-07 PK3).
   Label: resmi (ketiadaan data).
4. **Celah bukti program.** Tidak ada evaluasi independen pemulihan SPAM pascabencana di Indonesia; program jembatan TNI
   AD dan Polri tanpa evaluasi dampak (bab-06, bab-05 PK2). Label: resmi (ketiadaan evaluasi).
5. **Progres Sumatra Oktober 2026 hanya di media.** Pencarian 25 Oktober 2026: konferensi pers Satgas PRR 5 Oktober 2026
   melaporkan jembatan daerah Aceh 58,93%, Sumut 93,98%, Sumbar 59,50%, dan jalan dan jembatan nasional pulih 100%,
   lewat CNN Indonesia (pustaka `cnn-2026-satgas-prr`). Label: **sekunder**, tidak masuk badan teks (R3); hanya lampiran
   rekonsiliasi. Angka ini, bila sumber resmi dibuka, akan menjadi titik ketiga kurva jembatan daerah (Mei 2026: 67% dari
   1.181, resmi).

### Inferensi

- **[Inferensi tim]** Tabel 12.6 sebaiknya memakai tiga kolom: yang belum diketahui, pemegang data, dan rekomendasi atau
  keputusan 14 hari yang menutupnya. Pemetaan usulan: ukuran pemulihan ke Pusdatinkom dan Kementerian PU (R-RR-01, 02,
  09); R3P dan rencana induk ke Satgas Keppres 1/2026 dan pemda (keputusan 14 hari butir 3); daftar program ke TNI AD dan
  Polri (R-RR-04, 11); poligon zona dan sumur 2021–2026 ke Badan Geologi (R-RR-10); keputusan DSP ke Biro Hukum,
  Organisasi, dan Kerja Sama (R-RR-15); bukti dampak ke agenda bukti Bab 10.10 (R-RR-13, 14).
- **[Inferensi tim]** Kalimat "yang belum diketahui" di naskah harus berbeda dari kalimat Celah Bab 3, 6, 7, dan 9 (gerbang
  pengulangan lintas bab); Bab 12 menulisnya sebagai daftar pemegang data dan tenggat, bukan mengulang uraian celah.

### Celah

- Bab 10 (Grand Design) dan Bab 11 (kelembagaan, pembiayaan, peta jalan) belum punya berkas bukti saat berkas ini
  disusun; indikator, peta jalan, dan tabel instrumen hukum yang dirujuk 12.2–12.4 harus dicocokkan ulang setelah keduanya
  tersedia.
- Status resmi progres Sumatra setelah 7 Mei 2026 tidak ditemukan di ePPID PU atau Setkab pada pencarian sesi ini.

---

## Komponen

| Kode | Objek | Isi | Sumber data | G/B | Status |
|---|---|---|---|---|---|
| Kotak 12.1 | Temuan kunci kesimpulan | Kalimat tesis terkunci (P1 Inferensi); 3 kartu angka: jembatan rusak 2018–2025; jembatan daerah 67% lawan nasional 100% Mei 2026 (selisih 33 poin, khusus jembatan; jalan daerah 94%); Jembatan Palu IV: 7,4 tahun, sekitar 2,5 kali masa R3P (satu jembatan, bukan ukuran umum aset permanen) | `dibi/rekap_nasional_tahunan.csv`; `pu-2026-infrastruktur-sumatera-mei`; `ocg-2026-palu4`; kunci di bab-12.angka.json | B5.5, B5.4 | ada |
| Gambar 12.1 | Kisi prioritas 3×3 rekomendasi R-RR-01 sampai R-RR-15 | Wajib karena 15 > 9 (L31). Sumbu: horizon (100 hari, 2026–2027, 2028–2030; P4) lawan dasar (aksi wajib menurut peraturan, sudah ada perlu dikembangkan, usulan baru) | KERANGKA §6, dengan koreksi status R-RR-01 (P3) | G18 | ada |
| Tabel 12.1 | Keputusan yang diminta | KD-R1 sampai KD-R4: keputusan, pilihan (a)/(b), akibat, pasal dasar (P2) | KERANGKA §6; Perban 6/2017, 1/2023, 4/2024, 1/2026; Keppres 1/2026 | B5.5 keputusan, B5.25 | ada |
| Tabel 12.2 | Rekomendasi internal BNPB | 8 baris (R-RR-01, 02, 03, 05, 06, 09, 11, 15): langkah, lapis, status P7, unit, waktu, dasar | KERANGKA §6; P3 | B5.13 | ada |
| Tabel 12.3 | Rekomendasi lintas K/L | 7 baris (R-RR-04, 07, 08, 10, 12, 13, 14) dengan kolom forum (Satgas Keppres 1/2026 atau rakor Kemenko PMK) | KERANGKA §6; P4 | B5.13 | ada |
| Kotak 12.2 | Yang sengaja tidak direkomendasikan | 5 butir KERANGKA + 2 usulan; tiap butir satu baris alasan dan dasar | P5 | B5.5 catatan | ada |
| Tabel 12.4 | Yang belum diketahui dan pemegang datanya | Kolom: celah, pemegang data, penutup (R-RR atau keputusan 14 hari) | P6; KERANGKA §10, §11 | B5.7 | ada |

---

## Angka untuk registri

Usulan kunci baru khusus Bab 12. Kunci angka bab lain yang dipakai di berkas ini tidak diulang (lihat
`bab-01.angka.json` sampai `bab-08.angka.json`). Hitungan register dari tabel KERANGKA §6 dijalankan ulang sesi ini.

| Kunci | Nilai | Berkas sumber + jalur | Label | Sumber |
|---|---|---|---|---|
| rehab.rekomendasi.jumlah | 15 | `rehab/KERANGKA.md` §6, baris R-RR-01 sampai R-RR-15 | asumsi-kebijakan | Register rekomendasi Grand Design rehab |
| rehab.rekomendasi.horizon_100hari | 4 | KERANGKA §6 kolom Waktu: R-RR-01, 04, 11 (100 hari), R-RR-06 (14 hari) | asumsi-kebijakan | idem |
| rehab.rekomendasi.horizon_2026_2027 | 10 | KERANGKA §6 kolom Waktu = 2026–2027 | asumsi-kebijakan | idem |
| rehab.rekomendasi.horizon_2028_2030 | 1 | KERANGKA §6 kolom Waktu = 2028–2030 (R-RR-13) | asumsi-kebijakan | idem |
| rehab.rekomendasi.usulan_baru_kerangka | 11 | KERANGKA §6 kolom Status = Usulan baru | asumsi-kebijakan | idem |
| rehab.rekomendasi.sudah_ada_dikembangkan_kerangka | 4 | KERANGKA §6 kolom Status = Sudah ada, perlu dikembangkan | asumsi-kebijakan | idem |
| rehab.rekomendasi.usulan_baru | 10 | setelah koreksi status R-RR-01 (P3 Inferensi) | asumsi-kebijakan | idem; Juklak 7/2023 |
| rehab.rekomendasi.sudah_ada_dikembangkan | 5 | idem | asumsi-kebijakan | idem |
| rehab.rekomendasi.internal_bnpb | 8 | klasifikasi P3 (R-RR-01, 02, 03, 05, 06, 09, 11, 15) | asumsi-kebijakan | penyusun |
| rehab.rekomendasi.lintas_kl | 7 | klasifikasi P4 (R-RR-04, 07, 08, 10, 12, 13, 14) | asumsi-kebijakan | penyusun |
| rehab.keputusan.jumlah | 4 | KERANGKA §6 KD-R1 sampai KD-R4 | asumsi-kebijakan | idem |
| rehab.keputusan.hari14_jumlah | 5 | KERANGKA §6 "Keputusan 14 hari pertama" butir (1)–(5) | asumsi-kebijakan | idem |
| rehab.tidak_direkomendasikan.jumlah | 5 | KERANGKA §4 BAB 12 "Yang tidak direkomendasikan" | asumsi-kebijakan | idem |
| rehab.pulih.sumatra2025.selisih_nasional_daerah_poin | 33 | 100 (`rehab.akses.sumatra2025.jalan_jembatan_nasional_persen_fungsi_mei2026`) dikurangi 67 (`rehab.akses.sumatra2025.jembatan_daerah_persen_fungsi_mei2026`) | resmi (olahan) | Kementerian PU 11 Mei 2026 |
| rehab.pulih.palu4_kali_masa_r3p | 2,5 | 7,4 tahun (`rehab.akses.palu4.tahun_runtuh_ke_buka`) dibagi 3 tahun (Perban 5/2017 Pasal 10) | asumsi-kebijakan (olahan) | OC Global 2026; Perban 5/2017 |

JSON: `naskah/rehab/bukti/bab-12.angka.json`. Tidak menyunting `data/angka.json`.

---

## Pustaka

Entri CSL-JSON di `naskah/rehab/bukti/bab-12.pustaka.json` (43 entri). Dibuka atau dibaca ulang sesi ini (25 Oktober
2026): korpus lokal `bnpb-2024-hibah-rr`, `bnpb-2026-dana-bersama`, `bnpb-2017-r3p`, `bnpb-2017-rr`, `bnpb-2023-satudata`,
`bnpb-2020-dsp`; web `setneg-2026-jembatan-tni-polri`; paket `pantau-program-terbukti`. Entri lain disalin dari pustaka
Bab 1–8 dengan catatan verifikasi dan tanggal akses aslinya. `cnn-2026-satgas-prr` berverifikasi sekunder dan hanya
menopang bagian Celah.

---

## Catatan revisi atas temuan pemeriksa (25 Oktober 2026)

Sembilan temuan dicek ke sumber; semuanya diterima, tidak ada yang ditolak.

1. SPAM Sumbar dikeluarkan dari daftar "melampaui" (P1 butir 5): target Agustus 2028 masih di dalam masa R3P. Inti
   kini "dua dari tiga contoh tercatat"; kartu Kotak 12.1 menjadi "Jembatan Palu IV: 7,4 tahun, sekitar 2,5 kali masa
   R3P"; catatan kunci `rehab.pulih.palu4_kali_masa_r3p` diberi n=1.
2. P1 butir 7 ditulis ulang dengan program air dan akses yang tepat (dicek ke tabel Kompendium calon riset E): Palu IV,
   DI Gumbasa (lemah), SCIRT (sedang), Kobe (lemah). Nepal dan CSRRP (Indonesia, rumah) dipindah ke konteks rumah. Label
   diturunkan ke asumsi-kebijakan (rubrik penyusun).
3. Perban 6/2017 Pasal 14 ayat (4) dicek: hanya mengikat pelaksana kegiatan RR, tercetak hlm. 13 (juga ayat (2); hlm.
   12 dikoreksi di P2 butir 1 dan 3). Penerapan ke program TNI AD dan Polri dipindah ke P2 Inferensi.
4. Perban 1/2026 Pasal 9 ayat (2), 12, 14 ayat (5), 25 dicek; P2 butir 2 tidak lagi menyebut "jalur pengisi yang ada".
   Ditambahkan Pasal 12 (kelompok masyarakat melalui Pemda), yang tidak disebut pemeriksa tetapi relevan.
5. P1 butir 6 kini hanya angka berdampingan (128 sumur, 37 selesai, lawan 486 sumur-setara model, basis 970.876 jiwa
   per bab-08.angka.json); "cepat" dan "orde kebutuhan" dipindah ke Inferensi; usul 12.5 (6) diberi syarat.
6. "Aset daerah tertinggal sepertiga" menjadi "jembatan daerah 67%, jalan daerah 94%".
7. Flores: 36 jembatan ditulis sebagai provinsi-tahun NTT 2026 kategori gempa, termasuk Flores, 3,6 kali (cocok dengan
   bab-08.md dan catatan kunci).
8. Patahan seri Juklak 7/2023 ditulis dua arah.
9. Celah P2 ditambah dasar larangan aset desa di atas Perban; KD-R2 dirumuskan sebagai usul bersama Kemenkeu dan
   Kemendesa (P2 Inti dan Inferensi).
