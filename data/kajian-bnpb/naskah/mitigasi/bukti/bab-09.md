---
kajian: mitigasi
bab: 9
judul: BAB 9 BENCANA SOSIAL
jenis: berkas bukti
disusun: 24 Oktober 2026
status: bukti draf (belum melewati penyunting substansi)
pemilik_berkas: pipa-data (ilmu.mjs pemilik)
pasangan: bab-09.angka.json (70 usulan kunci registri), bab-09.pustaka.json (CSL-JSON, 27 sumber)
---

# Berkas bukti BAB 9 BENCANA SOSIAL, Grand Design Mitigasi Bencana Indonesia 2026–2030

Aturan yang dipakai: Buku Pegangan L56–L64 dan `PEDOMAN-DESAIN.md` §C9 (empat bagian per pertanyaan kunci), `KERANGKA.md`
§2 (prinsip 1, 3, 5, 6, 9, 12, 14, 15, 17), §5 BAB 9, §6, §7 (celah 14 dan 28), §10 (paket `nonalam-sosial`), dan
`KEPUTUSAN.md` (P5, P6, P7, P10, P11). Label keyakinan memakai empat kode registri: **resmi**, **terverifikasi**,
**estimasi-model**, **asumsi-kebijakan**. Bab ini tidak memuat angka estimasi-model: tidak ada model konflik, dan proyeksi
korban konflik masuk daftar yang sengaja tidak direkomendasikan (`KERANGKA.md` Bab 13). Angka berlabel **sekunder** (berita
yang mengutip pejabat, dokumen primernya tidak dibuka) hanya pembanding, tidak masuk registri, dan tidak boleh menjadi angka
utama naskah. Butir bertanda **[Inferensi tim]** adalah penilaian penyusun, bukan fakta bersumber. Hitungan bertanda
**[dihitung penyusun bukti]** dibuat 24 Oktober 2026 dari berkas yang disebut dengan Python stdlib (skrip kerja sekali pakai
di luar repo; lihat Celah PK2).

Bahan yang dibaca: `riset/A-dokumen-bnpb.md` (§2 tabel regulasi, §4.1 DIBI per jenis, §5 nonalam dan sosial), `riset/E-dokumen-primer.md`
(tidak memuat konflik sosial selain catatan korpus di baris 6), `riset/C-benchmark.md` (tidak memuat benchmark konflik),
`riset/D-inventaris-platform.md` dan `riset/B-air-jawa.md` (di luar lingkup bab). Paket data: `nonalam-sosial` (README lengkap,
`konflik_podes_provinsi.csv`, `peristiwa.csv`, `regulasi.csv`, `skenario_terburuk.csv`, `rekonsiliasi.csv`,
`dibi_nonalam_sosial_baris.csv`, `dibi_nonalam_sosial_rekap.csv`, `mentah/bps_*.json`), `lembaga` (README, `peran.csv` R016,
R020, R130–R143, `celah.csv` C10, `matriks_bencana.csv`, `matriks_ringkas.csv`, `sumber.csv`, teks
`mentah/teks/uu-7-2012.json.gz`, `uu-24-2007.json.gz`, `uu-2-2002.json.gz`, `uu-5-2026.json.gz`), `program-terbukti` (README §4
dan semua CSV, dipindai untuk konflik sosial). Korpus `data/raw/hukum/teks`: Perpres 46/2026, Perpres 17/2018, Perban 5/2018,
Kepka 327/2025, Perban 1/2025 (Renas PB), Perban 5/2025 (Renstra), Perban 6/2025 dan 11/2025 (OTK); katalog
`data/raw/hukum/indeks.json`. Berkas bukti saudara yang dirujuk agar angka tidak bercabang: `naskah/mitigasi/bukti/bab-04.md`
(analog konflik dan DIBI konflik di Bahan 4.4 dan 4.5).

Sumber web yang dibuka 24 Oktober 2026 (teks PDF diekstrak dengan `pdftotext`, berkas unduhan disimpan di luar repo):
PP 2/2015 (salinan JDIH Kemenkeu, SHA-256 9f89f049…), Permendagri 42/2015 (salinan Berita Negara 2015 No. 506 di laman
Kemendagri), PMK 97/2025 tentang Peta Kapasitas Fiskal Daerah (JDIH Kemenkeu, SHA-256 bd019510…), dan tiga siaran Kemenko PMK
tentang Sistem Nasional Pemantauan Kekerasan (SNPK): 21 April, 10 Juli, dan 31 Oktober 2025.

## 0. Kerangka bab dari KERANGKA.md §5

- **Judul:** BAB 9 BENCANA SOSIAL (6 hlm).
- **Subbab:** 9.1 Definisi Operasional dan Batas Mandat; 9.2 Sebaran Konflik Antarkelompok; 9.3 Kejadian Analog; 9.4
  Instrumen yang Belum Ada; 9.5 Implikasi.
- **Tujuan bab:** mengkuantifikasi konflik sosial antarkelompok dalam batas mandat BNPB.
- **Pertanyaan kunci:** (1) Konflik apa yang masuk bencana sosial menurut UU 24/2007 dan UU 7/2012? (2) Di provinsi mana
  perkelahian massal antarkelompok paling sering? (3) Berapa korban dan pengungsi pada analog terburuk? (4) Apa peran BNPB,
  dan instrumen apa yang belum ada untuk Perpres 46/2026?
- **Temuan kunci yang diharapkan (KERANGKA):** Podes 2024: 2.031 desa (2,41%) dengan perkelahian massal, naik dari 1.553
  (1,85%) pada 2021; 150 desa dengan korban meninggal; tertinggi DKI 18,73%, Maluku 11,41%, Maluku Utara 11,33%. Analog:
  Maluku 1999–2002 sedikitnya 5.000 meninggal dan sekitar 700.000 mengungsi (ICG); Poso sekitar 1.000 dan > 100.000 (HRW);
  Sampit sekitar 500 dan 108.000 (ICG); Sambas 1996–1997 dan 1999; pengungsi tercatat resmi > 1 juta pada 2001; Wamena 2019
  dengan catatan pernyataan Presiden bahwa kejadian itu bukan konflik etnis. Seri DIBI konflik tidak dipakai. Kerusuhan
  Agustus 2025 disebut hanya sebagai celah pencatatan DIBI. Peran BNPB: unsur Satgas nasional (UU 7/2012 Pasal 49); pengungsi
  bersama Kemensos (PP 2/2015); keadaan tertentu Perpres 46/2026 Pasal 3 ayat (2) huruf c. Rekonsiliasi (Pasal 37) dan
  peringatan dini konflik (Pasal 6, 10) tidak dipetakan ke unit BNPB. Pedoman Kepala BNPB menurut Pasal 3 ayat (4) belum ada.
- **Komponen (KERANGKA):** Gambar 9.1 peta persen desa berkonflik per provinsi 2024 (G19); Kartu 9.1 konflik sosial
  antarkelompok (B5.11, analog berangka, kemungkinan "tidak dinilai"); Tabel 9.1 batas mandat per fase (B5.7,
  `nonalam-sosial/regulasi.csv`, `lembaga/peran.csv`).
- **Status data menurut KERANGKA:** ada (Podes, analog terverifikasi); celah (kerugian rupiah; seri DIBI konflik tidak andal).
- **Keputusan atas temuan uji yang mengikat bab ini (KERANGKA §1):** P24 (bahan kerusuhan berisiko politis: Podes dan analog
  antarkelompok saja), M01 (definisi kerusuhan; Mei 1998 dan Agustus 2025 keluar dari analog; metrik perkosaan dihapus; peran
  BNPB tiga hal), M08 (pedoman Perpres 46/2026 belum ada; instrumen Usulan baru), D16 (DIBI konflik tidak dipakai sebagai
  seri), K01 dan B09 (kartu analog berangka tanpa perkalian), K15 (jendela 1996 untuk sosial), K17 (Malino hanya bila sumber
  primer dibuka; tidak dibuka, jadi tidak dipakai).
- **Celah KERANGKA §7 yang berlaku:** butir 14 (baris konflik DIBI diragukan; seri tidak dipakai; ketiadaan baris jadi
  rekomendasi data Pusdatinkom) dan butir 28 (kerugian rupiah sosial tidak ada; sel kerugian "–" beralasan).
- **Batas prinsip 17:** bab ini berhenti di definisi, sebaran, analog, instrumen yang belum ada, dan implikasi. Strategi masuk
  Bab 11, matriks lembaga Bab 12, rekomendasi Bab 13. Temuan kelembagaan di PK4 ditulis sebagai bahan, bukan rekomendasi.

### 0.1 Hasil cek terhadap KERANGKA yang wajib diketahui penulis bab

1. **"Pengungsi bersama Kemensos (PP 2/2015)" tidak didukung teks PP 2/2015.** PP 2/2015 tidak memuat kata "bencana" sama
   sekali (0 kemunculan dalam 2.691 baris teks batang tubuh dan penjelasan, [dihitung penyusun bukti]). Pasal 21 menugaskan
   pemenuhan kebutuhan dasar pengungsi konflik kepada menteri urusan sosial, sebagian kepada menteri pendidikan dan
   kebudayaan serta menteri kesehatan; BNPB tidak disebut. Kalimat naskah: "pemenuhan kebutuhan dasar pengungsi konflik
   menjadi tugas menteri sosial (PP 2/2015 Pasal 21); BNPB tidak disebut dalam PP 2/2015". Peran BNPB atas pengungsi konflik
   hanya terbuka bila penanganan dilakukan dalam rezim PB (status keadaan darurat atau keadaan tertentu).
2. **"Rekonsiliasi tidak dipetakan ke unit BNPB" benar untuk OTK, tetapi UU 24/2007 sendiri memuatnya.** OTK BNPB (Perban
   6/2025 jo. 11/2025) tidak memuat kata "konflik" (0 kemunculan di 59 halaman, [dihitung penyusun bukti]). Namun UU 24/2007
   Pasal 58 ayat (1) huruf f memasukkan "rekonsiliasi dan resolusi konflik" ke kegiatan rehabilitasi pascabencana. Rezim PB
   jadi punya kaitan tertulis ke rekonsiliasi, hanya belum diturunkan ke unit.
3. **Peringatan dini konflik punya tiga kaitan yang berbeda.** UU 7/2012 Pasal 10–11 menugaskan Pemerintah dan pemda; PP 2/2015
   Pasal 5 ayat (4) menaruh koordinasi hasil pemetaan wilayah potensi konflik di kementerian dalam negeri; Renas PB kegiatan
   1.1.2.j menaruh jaringan pengamatan dan pantauan konflik sosial di Kementerian Sosial sebagai penanggung jawab (Kemenag,
   Kemendagri, BIN kontributor; BNPB tidak disebut), sedangkan kegiatan riset 1.2.4.c menyebut BNPB sebagai salah satu
   penanggung jawab. Ketiganya ditulis berdampingan.
4. **"Perban 5/2018 tidak memuat faktor sosial" dikonfirmasi dengan nuansa.** Kata "sosial" muncul tiga kali di Perban 5/2018,
   semuanya sebagai dampak ("kehidupan sosial, ekonomi dan budaya"), bukan sebagai sebab. Sepuluh jenis ancaman di Pasal 3
   ayat (2) huruf a tidak memuat ancaman sosial. Selain itu Pasal 3 ayat (1) mensyaratkan potensi ancaman maksimum **dan**
   evakuasi/gangguan layanan secara kumulatif, sedangkan Perpres 46/2026 Pasal 3 ayat (2) memakai "dan/atau" dan menambah
   kondisi huruf c yang berdiri sendiri.
5. **Kepka 327/2025 ditetapkan 31 Desember 2025, sebelum Perpres 46/2026 (16 Juli 2026).** Ketiadaan perubahan Perban 5/2018
   di Progsun 2026 adalah urutan waktu, bukan kelalaian. Kalimat naskah memakai suara BNPB (prinsip 1): "BNPB menyusun
   perubahan Perban 5/2018 untuk melaksanakan Perpres 46/2026 Pasal 3 ayat (4)".
6. **"Tertinggi DKI 18,73%" benar menurut persen, tetapi penyebut DKI hanya 267 kelurahan.** Menurut jumlah desa, terbanyak
   Jawa Barat (218), Jawa Tengah (205), dan NTT (156); DKI 50 desa. Naskah wajib menyebut ukurannya (persen atau jumlah) dan
   Gambar 9.1 memasang jumlah di samping persen. Angka KERANGKA ini memakai semua jenis; untuk jenis antarkelompok masyarakat
   peringkatnya lain (NTT 97, Jawa Tengah 88, Maluku 79, Maluku Utara 78; persen DKI 7,49%), lihat PK2 Temuan 4a–4c.
7. **Jenis perkelahian Podes tidak saling lepas.** Tujuh jenis menjumlah 2.450 desa-jenis, lebih besar dari 2.031 desa. Jenis
   yang di luar lingkup prinsip 3 (masyarakat dengan aparat keamanan 55, dengan aparat pemerintah 44) tidak dapat dikurangkan
   dari 2.031. Naskah menulis "desa dengan perkelahian massal (semua jenis)" dan menyajikan jenisnya terpisah.
8. **Podes 2021 lawan 2024 tidak sebanding untuk Papua.** Empat provinsi baru tidak punya angka 2021; Papua turun 140 ke 36 dan
   Papua Barat 75 ke 22 karena wilayahnya terbelah, bukan karena konflik berkurang. Dari 32 provinsi yang sebanding, 23 naik
   dan 7 turun.
9. **Sambas 1996–1997:** ICG mengutip perkiraan 300 sampai 3.000 meninggal dan kesimpulan HRW sekitar 500. Pita 300–3.000
   selebar satu orde; kartu angka memakai "sekitar 500" dengan pita di catatan (prinsip 9, larangan tampil).
10. **Kerugian rupiah konflik punya penghitung menurut undang-undang, tetapi datanya tidak ditemukan.** UU 7/2012 Pasal 44 huruf f
    memberi Satgas Penyelesaian Konflik Sosial fungsi "penghitungan jumlah kerugian dan besaran kompensasi". Laporan Satgas
    tidak ditemukan dalam penelusuran ini (Celah PK3).
11. **Syarat fiskal Perpres 46/2026 huruf c hampir tidak menyaring.** PMK 97/2025 menempatkan 24 dari 38 provinsi dan 351 dari
    508 kab/kota di kategori rendah atau sangat rendah. Penyaring sebenarnya adalah frasa "dalam proses rekonsiliasi
    pascakonflik", yang tidak didefinisikan di peraturan mana pun yang dibaca (PK4).
12. **DIBI tidak punya satu pun baris konflik sosial 2020–2024** (`dibi_nonalam_sosial_rekap.csv`: baris konflik hanya 2019, 2025,
    2026). Ini memperkuat keputusan D16.

## PK1. Konflik apa yang masuk bencana sosial menurut UU 24/2007 dan UU 7/2012?

### Inti

Bencana sosial menurut UU 24/2007 meliputi "konflik sosial antarkelompok atau antarkomunitas masyarakat, dan teror"; UU
7/2012 menyempitkan konflik menjadi benturan fisik dengan kekerasan antara dua kelompok masyarakat atau lebih yang berlangsung
dalam waktu tertentu dan berdampak luas. Kajian ini memakai irisan keduanya tanpa teror dan tanpa unjuk rasa yang berhadapan
dengan aparat. Status keadaan konflik (UU 7/2012) dan status keadaan darurat bencana (UU 24/2007) adalah dua status berbeda,
ditetapkan oleh kepala daerah atau Presiden menurut skala.

### Temuan bersumber

1. **Definisi UU 24/2007.** Pasal 1 angka 4: bencana sosial adalah bencana akibat peristiwa yang diakibatkan manusia "yang
   meliputi konflik sosial antarkelompok atau antarkomunitas masyarakat, dan teror". Sumber: `lembaga/mentah/teks/uu-24-2007.json.gz`
   hlm. 2; `nonalam-sosial/regulasi.csv` baris UU 24/2007 Pasal 1 angka 4; pustaka `ri-2007-uu24`. Label: resmi.
   - **Dibantah sebagian oleh** Penjelasan Umum UU 24/2007 (hlm. 36 berkas teks): "Bencana sosial antara lain berupa kerusuhan
     sosial dan konflik sosial dalam masyarakat yang sering terjadi". Penjelasan lebih luas dari batang tubuh karena menyebut
     kerusuhan sosial tanpa syarat antarkelompok. Label: resmi. Definisi operasional kajian (prinsip 3) mengikuti batang tubuh;
     naskah wajib menyebut perbedaan ini, bukan menyembunyikannya.
2. **Definisi UU 7/2012.** Pasal 1 angka 1: konflik sosial adalah "perseteruan dan/atau benturan fisik dengan kekerasan antara
   dua kelompok masyarakat atau lebih yang berlangsung dalam waktu tertentu dan berdampak luas yang mengakibatkan
   ketidakamanan dan disintegrasi sosial sehingga mengganggu stabilitas nasional dan menghambat pembangunan nasional". Pasal
   1 angka 2: penanganan konflik mencakup pencegahan, penghentian, dan pemulihan pascakonflik. Sumber:
   `lembaga/mentah/teks/uu-7-2012.json.gz` hlm. 2; `regulasi.csv`; pustaka `ri-2012-uu7`. Label: resmi.
3. **Sumber konflik menurut UU 7/2012 Pasal 5:** masalah politik, ekonomi, dan sosial budaya; perseteruan antarumat beragama
   atau interumat beragama, antarsuku, dan antaretnis; sengketa batas wilayah desa, kab/kota, atau provinsi; sengketa sumber
   daya alam antarmasyarakat atau antara masyarakat dan pelaku usaha; distribusi sumber daya alam yang tidak seimbang.
   Sumber: berkas teks UU 7/2012 hlm. 5–6. Label: resmi.
4. **Status keadaan konflik berbeda dari status keadaan darurat bencana.** UU 7/2012 Pasal 14: status keadaan konflik ditetapkan
   bila konflik tidak dapat dikendalikan Polri dan fungsi pemerintahan terganggu. Pasal 16, 18, 20: ditetapkan bupati/wali
   kota, gubernur, atau Presiden, masing-masing setelah berkonsultasi dengan pimpinan DPRD atau DPR. Pasal 22: berlaku paling
   lama 90 hari; Pasal 29: dapat diperpanjang paling lama 30 hari. Status darurat bencana ditetapkan pemerintah sesuai skala
   (UU 24/2007 Pasal 51). Sumber: berkas teks UU 7/2012 hlm. 10–14; UU 24/2007 hlm. 23–24; `lembaga/peran.csv` R130, R131;
   kunci `uu7_2012.status_konflik.hari_maks`, `uu7_2012.status_konflik.perpanjangan_hari`. Label: resmi.
5. **Komando penghentian kekerasan di Polri.** UU 7/2012 Pasal 13 ayat (1): penghentian kekerasan fisik dikoordinasikan dan
   dikendalikan oleh Polri; Pasal 34: bantuan kekuatan TNI dikoordinasikan Polri. Sumber: berkas teks UU 7/2012 hlm. 9, 16;
   `peran.csv` R132, R133. Label: resmi.
6. **Unjuk rasa yang berhadapan dengan aparat adalah urusan keamanan dan ketertiban.** UU 2/2002 Pasal 13: tugas pokok Polri
   memelihara keamanan dan ketertiban masyarakat, menegakkan hukum, dan memberi pelindungan. UU 5/2026 (Perubahan Ketiga UU
   2/2002, ditetapkan 17 Juni 2026) mengubah Pasal 14 tetapi tidak mengubah Pasal 13. Sumber: `lembaga/mentah/teks/uu-2-2002.json.gz`,
   `uu-5-2026.json.gz`; `lembaga/sumber.csv`; pustaka `ri-2002-uu2`, `ri-2026-uu5`. Label: resmi.
7. **Teror tidak dikaji** (PEDOMAN §A6; prinsip 3). Kebakaran gedung dan permukiman bukan bencana sosial dan di luar lingkup
   (prinsip 3). Sumber: `KERANGKA.md` §2 prinsip 3. Label: asumsi-kebijakan (keputusan lingkup kajian).
8. **Klasifikasi baris di paket data mengikuti definisi ini.** `peristiwa.csv` kolom `lingkup` menandai `mei1998` dan
   `kerusuhan2025` sebagai `luar_lingkup` (kerusuhan berhadapan dengan aparat atau negara dan dugaan pelanggaran HAM); Sambas,
   Maluku, Poso, Sampit, pengungsi nasional 2001, Wamena 2019 dan 2026 `dalam`. Sumber: `nonalam-sosial/peristiwa.csv`;
   `KERANGKA.md` §1 M01, §10. Label: asumsi-kebijakan (penandaan lingkup penyusun).
   - **Koreksi berkas ini atas penandaan paket:** Wamena 2019 diperlakukan sebagai **kasus batas**, bukan `dalam`, karena Presiden
     menggolongkannya serangan kelompok bersenjata (Temuan 10), yang masuk kekerasan bersenjata dan urusan aparat (prinsip 3).
     Kolom `lingkup` di `peristiwa.csv` perlu diubah pemilik paket (`pipa-data`) menjadi kasus batas; berkas ini tidak menyunting paket.
9. **Kategori Podes yang dapat dipetakan ke definisi.** BPS Podes 2024 Tabel 18.1 mencatat tujuh jenis perkelahian massal per
   desa: antarkelompok masyarakat (920 desa), antardesa/kelurahan (643), masyarakat dengan aparat keamanan (55), masyarakat
   dengan aparat pemerintah (44), pelajar/mahasiswa (575), antarsuku (52), lainnya (161). Sumber:
   `nonalam-sosial/konflik_podes_provinsi.csv` [kode_prov=00]; pustaka `bps-2024-podes`; kunci `sosial.podes.jenis.*`. Label: resmi.
10. **Wamena 2019 dan pernyataan Presiden.** Setkab 30 September 2019 (judul: "Rusuh Wamena Bukan Konflik Etnis"; dibuka ulang 24
    Okt 2026) memuat: Presiden meminta "jangan ada yang menggeser-geser ini menjadi kayak sebuah konflik etnis", lalu "Bukan. Ini
    adalah kelompok kriminal bersenjata yang dari atas dari gunung turun ke bawah dan melakukan pembakaran-pembakaran rumah warga",
    dan "33 orang telah meninggal di sana". DIBI mencatat kejadian itu sebagai jenis "Konflik Sosial". Dua penggolongan resmi ini
    bertentangan: DIBI "Konflik Sosial", Presiden "kelompok kriminal bersenjata". Sumber: `peristiwa.csv` `wamena2019`; pustaka
    `setkab-2019-wamena`. Label: resmi (keduanya).

### Inferensi

- **[Inferensi tim]** Tiga lapis definisi menghasilkan tiga cakupan yang berbeda besarnya: Penjelasan UU 24/2007 (kerusuhan
  sosial dan konflik sosial) paling luas; batang tubuh UU 24/2007 (antarkelompok atau antarkomunitas) di tengah; UU 7/2012
  (berdampak luas, disintegrasi sosial) paling sempit. Data Podes mengukur cakupan yang lebih luas lagi, karena satu
  perkelahian massal satu hari di satu desa tercatat tanpa syarat "berdampak luas". Naskah 9.1 sebaiknya menyajikan ketiganya
  dalam satu bagan taksonomi cakupan, lalu menyatakan bahwa angka Podes adalah indikator potensi, bukan hitungan konflik
  menurut UU 7/2012.
- **[Inferensi tim]** Pemetaan kategori Podes ke definisi kajian: **dalam lingkup** antarkelompok masyarakat, antardesa, antarsuku;
  **belum dapat dipastikan** pelajar/mahasiswa (antarkelompok, tetapi jarang berdampak luas) dan lainnya; **di luar lingkup**
  masyarakat dengan aparat keamanan dan dengan aparat pemerintah (prinsip 3). Karena jenis tidak saling lepas, jumlah desa dalam
  lingkup hanya dapat dinyatakan sebagai batas bawah: sedikitnya 920 desa (jenis antarkelompok saja), paling banyak 2.031.
- **[Inferensi tim]** Wamena 2019 adalah kasus batas, bukan analog dalam lingkup: DIBI menggolongkannya "Konflik Sosial", sedangkan
  Presiden menggolongkannya serangan kelompok kriminal bersenjata yang membakar rumah warga, bukan bentrokan antarkelompok
  masyarakat. Penggolongan Presiden menempatkannya di kekerasan bersenjata dan urusan aparat (prinsip 3). Bila tetap dimuat di
  Kartu 9.1 (KERANGKA meminta Wamena 2019 dengan catatan), barisnya ditandai "kasus batas" dan catatannya menyebut kedua
  penggolongan; Wamena 2019 tidak dipakai sebagai analog modern atau pembanding lantai skenario.
- **[Inferensi tim]** Dua status yang bisa berlaku bersamaan atas satu wilayah (status keadaan konflik oleh kepala daerah dengan
  konsultasi DPRD, dan status keadaan darurat bencana oleh kepala daerah) tidak punya norma pengait di peraturan yang dibaca.
  Ini sejajar dengan dua rezim status epidemi (C09) dan menjadi bahan Bab 10.1, bukan temuan baru Bab 9.

### Celah

- Penjelasan Pasal 1 UU 24/2007 hanya berbunyi "Cukup jelas" (dicek di berkas teks), jadi satu-satunya uraian resmi tambahan
  adalah Penjelasan Umum hlm. 2. PP 21/2008 di luar korpus dan tidak dibuka untuk bab ini; apakah peraturan pelaksana merinci
  bencana sosial belum dicek (KERANGKA §7 butir 29).
- Definisi operasional BPS untuk "perkelahian massal" di Podes 2024 (kuesioner dan pedoman pencacah) tidak dibuka. Statistik
  Kriminal 2024/2025 Lampiran 26 menamai indikator yang sama "konflik massal". Naskah menyebut "perkelahian massal (BPS)" dan
  menulis satuannya desa, periode setahun sebelum pencacahan Podes, tanpa mengklaim definisi BPS.
- Tidak ditemukan putusan atau peraturan yang menyatakan apakah unjuk rasa yang berubah menjadi bentrokan antarkelompok
  warga masuk konflik sosial. Penyajian: kasus seperti itu tidak dipakai sebagai analog.

## PK2. Di provinsi mana perkelahian massal antarkelompok paling sering?

### Inti

Untuk jenis antarkelompok masyarakat (Podes 2024), jumlah desa terbanyak ada di NTT (97), Jawa Tengah (88), Maluku (79), Maluku
Utara (78), dan Jawa Barat (67); menurut persen desa, tertinggi DKI Jakarta (7,49%), Maluku Utara (6,45%), dan Maluku (6,26%). Jenis
antardesa memperkuat pola itu (Maluku Utara 72, Maluku 64, Jawa Tengah 60, NTT 51). Sebagai konteks, untuk semua jenis perkelahian,
DKI 18,73%, Maluku 11,41%, Maluku Utara 11,33%, dan menurut jumlah Jawa Barat 218, Jawa Tengah 205, NTT 156; peringkat semua jenis
itu banyak digerakkan perkelahian pelajar/mahasiswa (DKI 31 dari 50 desa, Jawa Barat 114 dari 218), jenis yang belum dapat
dipastikan masuk lingkup. Secara nasional desa dengan perkelahian massal semua jenis naik dari 1.553 (1,85%) pada 2021 menjadi
2.031 (2,41%) pada 2024, dan 150 desa mencatat korban meninggal.

### Temuan bersumber

1. **Nasional 2024.** 2.031 dari 84.276 desa/kelurahan (2,41%) mengalami perkelahian massal dalam setahun terakhir; 150 desa
   dengan korban meninggal; 1.255 desa dengan korban luka. Sumber: `nonalam-sosial/konflik_podes_provinsi.csv` [kode_prov=00];
   BPS Podes 2024 Tabel 1.1, 18.1, 18.2; pustaka `bps-2024-podes`; kunci `sosial.desa_perkelahian.2024` (registri utama),
   `sosial.desa_kelurahan.2024`, `sosial.desa_perkelahian.persen_2024`, `sosial.desa_korban_meninggal.2024`,
   `sosial.desa_korban_luka.2024`. Label: resmi.
2. **Nasional 2021.** 1.553 desa (1,85%). Kenaikan 2021 ke 2024: 478 desa (+30,8%) [dihitung penyusun bukti]. Sumber:
   `konflik_podes_provinsi.csv` kolom `*_2021` dari BPS Statistik Kriminal 2024/2025 Lampiran 26 (hlm. 136); pustaka
   `bps-2025-statistik-kriminal`; kunci `sosial.desa_perkelahian.2021`, `sosial.desa_perkelahian.persen_2021`,
   `sosial.podes.kenaikan_desa_2021_2024`. Label: resmi.
3. **Lima provinsi tertinggi menurut persen 2024:** DKI Jakarta 18,73% (50 dari 267), Maluku 11,41% (144 dari 1.262), Maluku Utara
   11,33% (137 dari 1.209), Papua Selatan 5,65% (39 dari 690), Papua Barat Daya 4,45% (47 dari 1.056); NTT 4,41% di urutan
   keenam. Sumber: `konflik_podes_provinsi.csv`. Kunci `sosial.podes.dki.*`, `sosial.podes.maluku.*`, `sosial.podes.malut.*`.
   Label: resmi.
4. **Lima provinsi terbanyak menurut jumlah desa 2024:** Jawa Barat 218 (3,66%), Jawa Tengah 205 (2,39%), NTT 156 (4,41%), Maluku 144,
   Maluku Utara 137. Sumber: idem; kunci `sosial.podes.jabar.desa_2024`, `sosial.podes.jateng.desa_2024`,
   `sosial.podes.ntt.desa_2024`. Label: resmi. Temuan 3–4 memakai semua jenis dan hanya konteks; jawaban PK2 ada di Temuan 4a–4c.
4a. **Jenis antarkelompok masyarakat per provinsi 2024 (jawaban PK2).** Menurut jumlah desa: NTT 97, Jawa Tengah 88, Maluku 79,
   Maluku Utara 78, Jawa Barat 67, Jawa Timur 64. Menurut persen desa [dihitung penyusun bukti, kolom jenis dibagi
   `desa_kelurahan_2024`]: DKI Jakarta 7,49% (20 dari 267), Maluku Utara 6,45%, Maluku 6,26%, Papua Selatan 3,91%, Papua Barat Daya
   3,41%, NTT 2,74%. Sumber: `konflik_podes_provinsi.csv` kolom `jenis_antar_kelompok_masyarakat`; kunci
   `sosial.podes.{ntt,jateng,maluku,malut,jabar,dki}.jenis_antar_kelompok_2024`. Label: resmi (jumlah); persen dihitung penyusun.
4b. **Jenis antardesa dan antarsuku per provinsi 2024.** Antardesa: Maluku Utara 72, Maluku 64, Jawa Tengah 60, NTT 51, Jawa Barat 36,
   DKI 16. Antarsuku terbanyak Maluku 5 (nasional 52). Karena jenis tidak saling lepas, ketiga jenis dalam lingkup tidak boleh
   dijumlahkan sebagai jumlah desa (Maluku: 79 + 64 + 5 = 148 desa-jenis, melebihi 144 desa perkelahian). Batas bawah desa dalam
   lingkup per provinsi adalah jenis terbesar. Sumber: idem kolom `jenis_antar_desa_kelurahan`, `jenis_antar_suku`. Label: resmi.
4c. **Porsi pelajar/mahasiswa dalam peringkat semua jenis.** DKI Jakarta 31 dari 50 desa perkelahian, Jawa Barat 114 dari 218; NTT
   hanya 14 dari 156, Maluku 24 dari 144, Maluku Utara 14 dari 137. Sumber: idem kolom `jenis_pelajar_mahasiswa`; kunci
   `sosial.podes.dki.jenis_pelajar_mahasiswa_2024`, `sosial.podes.jabar.jenis_pelajar_mahasiswa_2024`. Label: resmi.
5. **Desa dengan korban meninggal terbanyak:** NTT 18, Jawa Barat 15, Jawa Tengah 12, Papua Tengah 12, Papua Pegunungan 10, Maluku 9.
   Enam provinsi Papua bersama memuat 37 dari 150 desa (24,7%) dengan korban meninggal, padahal hanya 196 dari 2.031 desa
   perkelahian (9,7%) [dihitung penyusun bukti]. Sumber: idem; kunci `sosial.podes.ntt.desa_korban_meninggal_2024`,
   `sosial.podes.papua.desa_korban_meninggal_2024`. Label: resmi (angka per provinsi); asumsi-kebijakan (agregat enam provinsi
   Papua, pengelompokan pilihan penyusun).
6. **Satu-satunya provinsi tanpa perkelahian massal 2024:** Kepulauan Riau (0 dari 430 desa). Sumber: idem. Label: resmi.
7. **Agregat pulau 2024** [dihitung penyusun bukti; pengelompokan pulau = kolom `pulau` paket]: Maluku 281 desa (11,37% desa
   pulau itu), Bali dan Nusa Tenggara 209 (3,86%), Jawa 667 (2,64%; 32,8% dari desa perkelahian nasional), Papua 196 (2,58%),
   Sulawesi 260 (2,45%), Sumatra 375 (1,46%), Kalimantan 43 (0,59%). Sumber: `konflik_podes_provinsi.csv`. Label: asumsi-kebijakan
   (agregat pilihan penyusun atas angka resmi). Catatan ejaan: kolom paket menulis "Bali–Nusa Tenggara"; naskah menulis "Bali
   dan Nusa Tenggara" (prinsip 4).
8. **Perubahan per provinsi 2021 ke 2024.** Dari 32 provinsi yang sebanding (tanpa Papua dan Papua Barat yang terbelah dan empat
   provinsi baru), 23 naik, 7 turun, 2 tetap [dihitung penyusun bukti]. Kenaikan terbesar: Jawa Tengah 95 ke 205, Jawa Barat 158
   ke 218, Maluku Utara 93 ke 137, Sumatera Utara 84 ke 122, Banten 15 ke 52, Sumatera Selatan 20 ke 56. Maluku turun 161 ke 144.
   Sumber: idem; kunci `sosial.podes.prov_naik_2021_2024`. Label: asumsi-kebijakan (olahan penyusun; bergantung pada pilihan
   provinsi yang dikeluarkan).
9. **Jenis perkelahian tidak saling lepas.** Tujuh jenis menjumlah 2.450 desa-jenis lawan 2.031 desa [dihitung penyusun bukti].
   Angka 2.450 hanya catatan, tidak didaftarkan sebagai kunci karena tidak bermakna sebagai hitungan desa. Sumber: idem (kolom
   `jenis_*`). Label: resmi (kolom jenis).
10. **DIBI konflik sosial sebagai pembanding, bukan seri.** DIBI mencatat 17 kejadian konflik sosial 2019–2026 (cakupan bencana),
    93 meninggal, 14.804 mengungsi; per tahun 2019: 5 kejadian, 39 meninggal, 7.544 mengungsi; 2025: 4, 8, 2.981; 2026 (sementara):
    8, 46, 4.279; tidak ada baris 2020–2024. Sumber: `nonalam-sosial/dibi_nonalam_sosial_rekap.csv` [tingkat=nasional,
    jenis_juklak=konflik_sosial, cakupan=bencana]; pustaka `bnpb-dibi`; kunci per tahun `dibi.konflik.{2019,2025,2026}.*`. Label:
    resmi per tahun. Jumlah 2019–2026 (17, 93, 14.804) dihitung penyusun dan hanya catatan Kotak 9.1: tidak didaftarkan sebagai
    kunci karena memuat celah 2020–2024, dugaan entri ganda, baris Jayawijaya 2026, dan angka 2026 sementara (D16).
    - **Dibantah oleh** tanda mutu paket: Maluku Tengah 3 April 2025 dan 3 April 2026 memuat meninggal (4), luka (11), dan rumah
      rusak berat (227) identik (dugaan entri ganda lintas tahun); baris Jayawijaya 7 Mei 2026 (33 meninggal, 1.917 mengungsi)
      bertanggal hari jembatan gantung Wouma putus, dan Polres Jayawijaya mencatat 24 jenazah tenggelam (sekunder, RRI 18 Mei
      2026). Sumber: `rekonsiliasi.csv`; `peristiwa.csv` `wamena2026`. Label: resmi (DIBI) dan sekunder (Polres via RRI).
    - Baris 19 Agustus 2019 adalah satu kejadian yang dibagi ke lima kab di Papua Barat dan Papua Barat Daya (0,2 kejadian per kab,
      tanpa korban); DIBI tidak memuat keterangan yang membedakan konflik antarkelompok dari unjuk rasa. Sumber:
      `dibi_nonalam_sosial_baris.csv`. Label: resmi.
11. **Kerusuhan Agustus 2025 di luar lingkup dan hanya celah pencatatan.** DIBI mencatat satu baris konflik sosial dalam jendela
    itu (Manokwari 28 Agustus 2025, 1 meninggal); Komnas HAM 11 meninggal (sekunder: konferensi pers 7 Nov 2025 via Investortrust;
    rilis primer Komnas HAM tidak ditemukan, ringkasan laporan LNHAM di laman KPAI tidak dapat diunduh 24 Okt 2026). Sumber: kunci
    registri utama `sosial.kerusuhan2025.meninggal_dibi`; angka Komnas HAM dirujuk langsung ke `peristiwa.csv` `kerusuhan2025`
    (lingkup `luar_lingkup`, label sekunder), **bukan** lewat kunci `sosial.kerusuhan2025.meninggal_komnas`. Kunci itu berlabel
    "resmi" di `data/angka.json` padahal sumbernya berita; dilaporkan ke pemilik registri untuk diturunkan ke label yang sesuai.
    Label: resmi (DIBI) dan sekunder (Komnas HAM via berita). Naskah tidak menyebut sebab kerusuhan (KERANGKA
    §5 BAB 9).
12. **Sistem pemantauan kekerasan nasional tersedia di luar BNPB tetapi nonaktif.** Kemenko PMK menyebut SNPK "sudah ada sejak 10
    tahun lalu" dan belum optimal karena kendala teknis dan koordinatif (siaran 21 April 2025); LabPsiPol UI siap menyerahkan
    server dan aplikasi SNPK "meskipun saat ini dalam kondisi nonaktif" (siaran 10 Juli 2025); tahap pertama migrasi memuat data
    SNPK 2019–2023 (siaran 31 Oktober 2025). Sumber: pustaka `kemenkopmk-2025-snpk-revitalisasi`, `kemenkopmk-2025-snpk-hibah`,
    `kemenkopmk-2025-snpk-migrasi`, diakses 24 Okt 2026. Label: resmi.
13. **Renas PB mengakui ketiadaan jaringan pengamatan konflik.** Renas PB 2025–2029 hlm. 30 (isu strategis 4 "Potensi Kejadian
    Konflik Sosial"): tantangan membesar "karena belum adanya sistem jaringan pengamatan potensi konflik sosial yang terpadu".
    Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 30; pustaka `bnpb-2025-renas`. Label: resmi.

### Inferensi

- **[Inferensi tim]** Rumusan PK2 (antarkelompok) dijawab dengan jenis antarkelompok masyarakat dan antardesa, bukan semua jenis.
  Dengan ukuran itu, peringkat bergeser: NTT, Jawa Tengah, Maluku, dan Maluku Utara terbanyak; Jawa Barat turun dari pertama ke
  kelima karena lebih dari separuh desa perkelahiannya adalah jenis pelajar/mahasiswa (114 dari 218). DKI tetap tertinggi menurut
  persen (7,49%), tetapi selisihnya dengan Maluku Utara dan Maluku menyempit (6,45% dan 6,26%), karena 31 dari 50 desa
  perkelahian DKI adalah pelajar/mahasiswa.
- **[Inferensi tim]** Dua peringkat (persen dan jumlah) menjawab dua pertanyaan berbeda. Persen menunjukkan di mana peluang satu
  desa mengalami perkelahian paling besar (Maluku dan Maluku Utara konsisten tinggi pada 2021 dan 2024); jumlah menunjukkan beban
  layanan aparat dan pemda (Jawa Barat dan Jawa Tengah). DKI tinggi di persen karena penyebutnya kecil (267 kelurahan) dan
  kepadatan tinggi; DKI tidak boleh ditulis "provinsi paling rawan konflik" tanpa ukuran.
- **[Inferensi tim]** Kematian lebih terkonsentrasi daripada kejadian: Papua memuat sekitar seperempat desa dengan korban
  meninggal dari kurang dari sepersepuluh desa perkelahian. Untuk tujuan kesiapsiagaan pengungsian dan layanan darurat, sinyal
  korban per desa lebih relevan daripada persen desa. Gambar 9.1 sebaiknya diberi panel kedua atau simbol untuk desa dengan
  korban meninggal.
- **[Inferensi tim]** Kenaikan 30,8% dalam tiga tahun tidak boleh dibaca sebagai tren: hanya dua titik waktu, satuannya desa, dan
  pemekaran Papua mengubah penyebut. Kalimat aman: "naik dari 1.553 desa pada 2021 menjadi 2.031 desa pada 2024".
- **[Inferensi tim]** Sumber data kejadian konflik yang paling layak dijadikan seri bukan DIBI, melainkan SNPK (kejadian dan
  korban per lokasi dari pemantauan media, 2019–2023 sedang dimigrasi ke Kemenko PMK) bersama Podes (tiga tahunan). Usulan ini
  bahan rekomendasi data di Bab 13 (Pusdatinkom dan Kemenko PMK), tidak ditulis sebagai rekomendasi di Bab 9.

### Celah

- **Skrip agregat.** Hitungan bertanda [dihitung penyusun bukti] (agregat pulau, 23 provinsi naik, 37 desa Papua, 2.450 desa-jenis,
  persen jenis antarkelompok per provinsi)
  belum menjadi skrip paket. Penyajian: penulis memakai kunci registri; `bangun/nonalam-sosial.py` perlu menulis agregat ini ke
  CSV turunan sebelum naskah final (pemilik paket: `pipa-data`).
- **Podes per kab/kota** tidak ada di paket (publikasi BPS memuat tingkat provinsi). Gambar 9.1 tingkat provinsi. Permintaan
  data ke BPS untuk tabel kab/kota.
- **Status SNPK 2026** (aktif atau belum, akses data) tidak ditemukan. Penyajian: "SNPK sedang dimigrasi ke Kemenko PMK (Oktober
  2025)"; jangan menulis SNPK sudah beroperasi.
- **Hubungan SNPK dengan kegiatan Renas 1.1.2.j** (jaringan pengamatan konflik, PJ Kemensos) tidak ditemukan.

## PK3. Berapa korban dan pengungsi pada analog terburuk?

### Inti

Analog terburuk dalam jendela 30 tahun (1996–2026) adalah konflik Maluku dan Maluku Utara 1999–2002: sedikitnya 5.000 meninggal
(mungkin 10.000) dan hampir 700.000 mengungsi, hampir sepertiga dari 2,1 juta penduduk (ICG). Analog lain: Poso sekitar 1.000 meninggal
dan lebih dari 100.000 mengungsi, Sampit sekitar 500 dan 108.000; secara nasional pengungsi tercatat resmi lebih dari 1 juta pada
2001. Kerugian rupiah dan luas terdampak tidak ada di sumber yang dibuka; kemungkinan berulang dalam 2026–2030 tidak dinilai.

### Temuan bersumber

1. **Maluku dan Maluku Utara 1999–2002.** "at least 5,000 people (perhaps as many as 10,000) have been killed"; "close to 700,000,
   almost one-third of the population of 2.1 million, became refugees"; darurat sipil di dua provinsi sejak Juni 2000. Sumber:
   ICG Asia Report N°31 (8 Feb 2002, arsip Wayback); `peristiwa.csv` `maluku1999`; `skenario_terburuk.csv`
   [komponen=analog_maluku_*]; pustaka `icg-2002-maluku`; kunci `sosial.maluku.meninggal_bawah`, `sosial.maluku.pengungsi`
   (registri utama), `sosial.maluku.meninggal_atas`. Label: terverifikasi.
2. **Poso 1998–2002.** "An estimated 1,000 people have died"; "more than 100,000 have been displaced". Sumber: HRW, siaran pers 4 Des
   2002; `peristiwa.csv` `poso1998`; pustaka `hrw-2002-poso`; kunci `sosial.poso.meninggal`, `sosial.poso.pengungsi`. Label: terverifikasi.
3. **Sampit 2001.** Sekitar 500 orang Madura terbunuh, mungkin lebih; sekitar 108.000 pengungsi meninggalkan Kalimantan Tengah sampai
   pertengahan April 2001. Sumber: ICG Asia Report N°19 (27 Jun 2001); `peristiwa.csv` `sampit2001`; pustaka `icg-2001-kalimantan`;
   kunci `sosial.sampit.meninggal`, `sosial.sampit.pengungsi`. Label: terverifikasi.
4. **Sambas.** 1996–1997: perkiraan 300 sampai 3.000 meninggal, kesimpulan HRW sekitar 500; 1999: hitungan resmi 186 orang Madura
   terbunuh dalam tiga bulan pertama, perkiraan tidak resmi jauh lebih tinggi. Sumber: ICG Asia Report N°19; `peristiwa.csv`
   `sambas1997`, `sambas1999`; kunci `sosial.sambas1997.meninggal`, `sosial.sambas1999.meninggal`. Label: terverifikasi.
5. **Pengungsi nasional 2001.** "The number of officially recorded internally displaced persons (IDPs) in Indonesia today is more than one
   million"; kelompok kerja koordinasi menyebut 1,2 juta. Bakornas PB diberi tugas koordinasi pengungsi menjadi Bakornas PBP lewat
   Keppres 3/2001. Sumber: Report of Seminar on Internal Displacement in Indonesia, 26–27 Jun 2001 (Brookings-CUNY bersama CERIC UI,
   Komnas HAM, OCHA, UNDP, UNHCR); `peristiwa.csv` `pengungsi2001`; `regulasi.csv` Keppres 3/2001; pustaka `brookings-2001-pengungsi`;
   kunci `sosial.pengungsi_nasional_2001.tercatat_resmi`, `sosial.pengungsi_nasional_2001.kelompok_kerja`. Label: terverifikasi.
6. **Kasus batas tercatat DIBI: Wamena 2019** (bukan analog dalam lingkup; lihat PK1 Temuan 10). DIBI: 36 meninggal, 84 luka/sakit, 6.634 mengungsi. Sumber: `peristiwa.csv`
   `wamena2019` asal DIBI; kunci `dibi.wamena2019.meninggal` (usulan bab-04), `dibi.wamena2019.mengungsi`. Label: resmi.
   - **Dibantah oleh** Presiden RI via Setkab 30 Sep 2019: 33 meninggal. Kunci `sosial.wamena2019.meninggal_presiden`. Label: resmi.
     Kedua angka ditulis berdampingan (`rekonsiliasi.csv`). Penggolongannya juga berdampingan: DIBI "Konflik Sosial", Presiden
     "kelompok kriminal bersenjata".
7. **Wamena Mei 2026 (DIBI 33 meninggal, 1.917 mengungsi, 333 rumah rusak berat).** Sumber: `peristiwa.csv` `wamena2026` asal DIBI;
   kunci `dibi.wamena2026.meninggal`, `dibi.wamena2026.mengungsi`. Label: resmi.
   - **Dibantah oleh** Polres Jayawijaya (24 jenazah tenggelam saat jembatan putus, RRI 18 Mei 2026) dan Polda Papua (874 pengungsi
     konflik, ANTARA 18 Mei 2026). Label: sekunder, hanya pembanding. Naskah tidak memakai baris ini sebagai analog.
8. **Analog yang disisihkan dan alasannya.** Mei 1998 Jakarta (288 sampai 1.217 meninggal dalam empat versi laporan TGPF) dan
   kerusuhan Agustus 2025 (11 meninggal, sekunder) di luar lingkup: kerusuhan berhadapan dengan aparat atau negara dan dugaan
   pelanggaran HAM (prinsip 3; KERANGKA §1 M01). Metrik perkosaan tidak dipakai (M01). Sumber: `peristiwa.csv` kolom `lingkup`;
   `KERANGKA.md` §10. Label: asumsi-kebijakan (keputusan lingkup).
9. **Tidak ada skenario konflik resmi berangka.** Paket mencatat tidak ada skenario resmi untuk konflik dan tidak ada angka luas
   terdampak atau kerugian rupiah konflik di sumber yang dibuka; indikator yang tersedia: pengungsi kejadian besar, desa dengan
   perkelahian dan dengan korban meninggal (150), rumah rusak berat di baris DIBI. Sumber: `skenario_terburuk.csv`
   [jenis=konflik_sosial, komponen=luas_dan_kerugian], `README.md` paket §Keterbatasan. Label: resmi (pernyataan ketiadaan
   berdasarkan sumber yang dibuka).
10. **Penghitung kerugian menurut undang-undang.** UU 7/2012 Pasal 44 huruf f: Satgas Penyelesaian Konflik Sosial menyelenggarakan
    fungsi "penghitungan jumlah kerugian dan besaran kompensasi, restitusi, rehabilitasi, dan/atau rekonstruksi". Sumber: berkas
    teks UU 7/2012 hlm. 21. Label: resmi.
11. **Tidak ada program konflik sosial di paket program terbukti.** Pemindaian semua CSV `program-terbukti` untuk "konflik sosial",
    "bencana sosial", "pascakonflik", dan "rekonsiliasi" menghasilkan 0 baris [dihitung penyusun bukti]. Sumber:
    `program-terbukti/*.csv`; README §5 ("belum terbukti" berarti bukti tidak ditemukan). Label: resmi (hasil pemindaian paket).

### Inferensi

- **[Inferensi tim]** **Lantai skenario (prinsip 9):** skenario terburuk yang masuk akal untuk konflik sosial antarkelompok tidak
  boleh lebih ringan dari Maluku 1999–2002, yaitu sedikitnya 5.000 meninggal dan hampir 700.000 mengungsi (ICG: "close to
  700,000"). Pita 5.000–10.000 selebar dua kali, jadi boleh tampil di kartu angka; pita Sambas 1996–1997 (300–3.000) tidak. Lantai
  ini berlaku untuk **satu kejadian regional**. Cek terhadap semua angka tercatat dalam jendela 1996–2026, bukan hanya DIBI:
  korban meninggal tercatat terbesar tetap Maluku (≥ 5.000; Poso sekitar 1.000, Sampit dan Sambas sekitar 500, DIBI terbesar 36);
  pengungsi tercatat terbesar adalah angka nasional 2001, lebih dari 1 juta tercatat resmi dan 1,2 juta menurut kelompok kerja
  (Brookings-CUNY), yang melampaui 700.000. Jadi skenario konflik serentak multi-wilayah tidak boleh memakai lantai pengungsi di
  bawah lebih dari 1 juta (2001). Kartu 9.1 menulis keduanya: lantai kejadian regional (Maluku) dan rujukan serentak nasional
  (2001).
- **[Inferensi tim]** Kartu 9.1 mengikuti format nonalam dan sosial prinsip 9: analog berangka tanpa perkalian dan tanpa proyeksi
  per wilayah. Isian empat besaran: korban jiwa (≥ 5.000, mungkin 10.000; terverifikasi); luas terdampak "–" (dua provinsi dalam
  darurat sipil sejak Juni 2000 sebagai narasi, bukan luas); kerugian materiil "–" (tidak ada di sumber yang dibuka; penghitungnya
  menurut UU 7/2012 Pasal 44 huruf f adalah Satgas); kerugian imateriil dalam satuan fisik: hampir 700.000 pengungsi, hampir
  sepertiga penduduk. Pengungsi-hari tidak dihitung karena tanggal akhir pengungsian tidak ada di sumber. Baris kebutuhan respons
  ditulis sebagai rujukan standar (Perka BNPB 7/2008) tanpa angka, karena mengalikan 700.000 dengan standar berarti perkalian yang
  dilarang untuk kartu sosial.
- **[Inferensi tim]** Kemungkinan "tidak dinilai": tidak ada dasar peluang untuk konflik setara Maluku dalam 2026–2030 (prinsip 9).
  Naskah tidak boleh memakai kenaikan Podes 2021–2024 sebagai dasar peluang.
- **[Inferensi tim]** Analog terburuk adalah kejadian 1999–2002 yang ditangani sebelum UU 7/2012 dan UU 24/2007 ada. Pelajaran
  kelembagaannya (Bakornas PBP mengoordinasikan lebih dari 1 juta pengungsi) relevan untuk pertanyaan siapa memimpin pengungsian
  konflik skala nasional hari ini (PK4), karena PP 2/2015 kini menaruh pengungsi konflik di menteri sosial, bukan BNPB.
- **[Inferensi tim]** Sesuai P6, tidak ada program konflik yang boleh disebut "terbukti" di Bab 9 atau Bab 11. Sel konflik di
  matriks fase × jenis hanya dapat berisi "aksi wajib menurut peraturan" (UU 7/2012, PP 2/2015) atau "uji coba terukur", tidak
  "program".

### Celah

- **Angka pemerintah untuk Maluku, Poso, Sampit, Sambas** (Kemensos, pemda, Bakornas PBP) tidak dibuka; analog memakai ICG, HRW, dan
  laporan seminar 2001 (terverifikasi). Permintaan data: arsip Bakornas PBP di BNPB dan data pengungsi Kemensos 1999–2004.
- **Kerugian rupiah dan luas terdampak** konflik tidak ditemukan. Sel kerugian "–" dengan alasan "tidak ada di sumber yang dibuka;
  Satgas PKS menurut UU 7/2012 Pasal 44 huruf f adalah penghitungnya" (KERANGKA §7 butir 28).
- **Tanggal akhir dan durasi pengungsian** Maluku, Poso, dan Sampit tidak ada di sumber; pengungsi-hari tidak dihitung.
- **Laporan LNHAM (20 Apr 2026) tentang Agustus 2025** belum dibuka (README paket); tidak relevan bagi analog karena di luar lingkup.
- **Perjanjian Malino** (benchmark rekonsiliasi Poso dan Maluku): sumber primer tidak dibuka; tidak dipakai (K17).

## PK4. Apa peran BNPB, dan instrumen apa yang belum ada untuk Perpres 46/2026?

### Inti

Peran BNPB yang tertulis dalam konflik sosial sempit: unsur Satgas Penyelesaian Konflik Sosial skala nasional (UU 7/2012 Pasal 49),
penyelenggaraan PB dalam keadaan tertentu bila ancaman berasal dari faktor sosial atau bagi daerah dalam rekonsiliasi pascakonflik
berkapasitas fiskal rendah setelah rakor Menko (Perpres 46/2026 Pasal 3), dan rehabilitasi yang memuat rekonsiliasi dan resolusi
konflik dalam rezim PB (UU 24/2007 Pasal 58). Koordinasi penanganan konflik ada di Mendagri, pengungsi konflik di Mensos, dan
penghentian kekerasan di Polri. Pedoman Kepala BNPB yang diperintahkan Perpres 46/2026 Pasal 3 ayat (4) belum ada: Perban 5/2018
masih memuat sepuluh jenis ancaman tanpa faktor sosial, syarat kumulatif, dan tanpa kriteria "proses rekonsiliasi pascakonflik".

### Temuan bersumber

1. **BNPB unsur Satgas nasional.** UU 7/2012 Pasal 49 ayat (2) huruf l: BNPB salah satu dari 15 unsur Pemerintah (huruf a–o) dalam
   Satgas Penyelesaian Konflik Sosial skala nasional; ini satu-satunya penyebutan BNPB dalam UU 7/2012. Satgas bersifat ad hoc
   (Pasal 42), dibentuk bila pranata adat/sosial tidak ada atau tidak berfungsi, musyawarah tidak berjalan atau tidak mencapai
   kesepakatan, dan telah ditetapkan status keadaan konflik (Pasal 42 ayat (2)); Satgas skala nasional diusulkan menteri koordinator
   bidang politik, hukum, dan keamanan kepada Presiden (Pasal 45 huruf c). Sumber: berkas teks UU 7/2012 hlm. 19–25; `regulasi.csv`;
   `peran.csv` R136; kunci `uu7_2012.satgas_nasional.unsur_pemerintah`. Label: resmi.
2. **Fungsi koordinator Satgas kini terbelah.** Fungsi "koordinasi urusan politik, hukum, dan keamanan" sejak 2024 dibagi ke Kemenko
   Polkam dan Kemenko Kumham Imipas (Perpres 90/2025); Deputi Bidang Koordinasi Penanggulangan Bencana dan Konflik Sosial ada di
   Kemenko PMK (Perpres 144/2024). Sumber: `lembaga/celah.csv` C10; `peran.csv` R016, R137, R138, R143; pustaka `ri-2024-perpres144`.
   Label: resmi (teks) dengan pemetaan penyusun (R137, R143 bertanda `dipetakan penyusun`).
3. **Keadaan tertentu menurut Perpres 46/2026.** Pasal 3 ayat (1): Kepala BNPB dapat melaksanakan penyelenggaraan PB termasuk
   kemudahan akses sampai batas waktu tertentu setelah keputusan rakor antar-K/L yang dikoordinasikan menteri koordinator yang
   membidangi koordinasi penyelenggaraan PB. Ayat (2): dilakukan pada kondisi (a) potensi bencana dengan ancaman maksimum akibat
   faktor alam, nonalam, dan/atau sosial; (b) telah terjadi evakuasi/penyelamatan/pengungsian atau gangguan layanan umum berdampak
   luas; dan/atau (c) pemda yang wilayahnya dalam proses rekonsiliasi pascakonflik sosial dan berkapasitas fiskal sangat rendah atau
   rendah menurut peraturan di bidang keuangan negara. Ayat (4): kondisi dan tata cara diatur dalam pedoman yang ditetapkan Kepala
   BNPB. Konsiderans huruf c: Perpres 17/2018 "belum komprehensif mengatur penanggulangan bencana pada kondisi yang wilayahnya
   terkena dampak konflik sosial". Ditetapkan dan diundangkan 16 Juli 2026 (LN 2026/83). Sumber: korpus
   `perpres-nomor-46-tahun-2026.json` hlm. 1–4; pustaka `ri-2026-perpres46`; `peran.csv` R135; kunci
   `perpres46_2026.kondisi_keadaan_tertentu`. Label: resmi.
4. **Pedoman yang berlaku masih Perban 5/2018.** Perban BNPB 5/2018 tentang Kondisi dan Tata Cara Pelaksanaan Penyelenggaraan PB dalam
   Keadaan Tertentu (ditetapkan 27 Agt 2018, diundangkan 13 Des 2018, BN 2018/1644, status BERLAKU di katalog JDIH BNPB) menimbang
   pelaksanaan Pasal 3 ayat (4) Perpres 17/2018. Isinya:
   - Pasal 3 ayat (1): kondisi keadaan tertentu adalah potensi ancaman maksimum **dan** telah terjadi evakuasi atau gangguan layanan
     umum (kumulatif).
   - Pasal 3 ayat (2) huruf a: peringatan dini dari K/L berwenang untuk 10 jenis ancaman (erupsi, longsor, banjir, banjir bandang,
     karhutla, gempa, tsunami, gelombang pasang/badai, kekeringan, serta wabah, epidemi, kegagalan teknologi, ledakan nuklir, kejadian
     antariksa). Tidak ada ancaman sosial atau konflik; kata "konflik", "rekonsiliasi", dan "fiskal" tidak muncul [dihitung penyusun
     bukti].
   - Pasal 4: tata cara mensyaratkan informasi dan rekomendasi peringatan dini/status ancaman dari K/L berwenang secara teknis dan kaji
     cepat BNPB/BPBD; hasilnya bahan rakor yang dipimpin Menko.
   - Pasal 6: 20 anggota rakor (huruf a–t), antara lain Kemendagri, Kemenkeu, Kemenkes, Kemensos, TNI, Polri. Kemenag, Kemenhan,
     Kejaksaan Agung, dan Komnas HAM, yang menjadi unsur Satgas nasional UU 7/2012 Pasal 49 ayat (2) huruf d, h, k, m, tidak disebut
     namanya, tetapi dapat masuk lewat huruf t "kementerian/lembaga terkait lainnya"; nomenklatur lama (Kementerian PUPR, KLHK,
     Kominfo, LAPAN).
   - Pasal 7: Kepala BNPB menetapkan status keadaan tertentu dengan surat keputusan berdasarkan keputusan rakor. Pasal 12: pendanaan
     APBN/APBD dan sumber lain.
   Sumber: korpus `perban-nomor-5-tahun-2018.json` hlm. 1–9; katalog `indeks.json`; pustaka `bnpb-2018-keadaan-tertentu`; kunci
   `perban5_2018.jenis_ancaman`, `perban5_2018.anggota_rakor`. Label: resmi.
5. **Progsun 2026 tidak memuat perubahan Perban 5/2018.** Kepka BNPB 327/2025 (ditetapkan 31 Des 2025) memuat 11 rancangan peraturan;
   tidak satu pun mengubah Perban 5/2018. Sumber: korpus `keputusan-kepala-nomor-327-tahun-2025.json` hlm. 4–5; pustaka
   `bnpb-2025-progsun`; kunci `progsun.2026.jumlah_rancangan` (usulan bab-01 air). Label: resmi.
6. **OTK dan Renstra BNPB tidak memuat konflik sosial.** Perban 6/2025 dan 11/2025 (OTK): 0 kemunculan "konflik"; Renstra BNPB
   2025–2029 (Perban 5/2025): satu kemunculan, tentang bantuan kemanusiaan ke Palestina (hlm. 49) [dihitung penyusun bukti]. Sumber:
   korpus `perban-nomor-6-tahun-2025.json`, `perban-nomor-11-tahun-2025.json`, `perban-nomor-5-tahun-2025.json`; pustaka
   `bnpb-2025-otk`, `bnpb-2025-otk-ubah`, `bnpb-2025-renstra`. Label: resmi.
7. **Renas PB memuat dua kegiatan konflik sosial.** Kegiatan 1.1.2.j "Pengembangan Jaringan Pengamatan dan Pantauan Konflik Sosial":
   indikator jumlah sarana, prasarana, dan jaringan pengamatan konflik sosial yang diperbarui; baseline NA; target 2029: 5
   unit/jaringan; penanggung jawab Kementerian Sosial; kontributor Kemenag, Kemendagri, BIN (hlm. 55). Kegiatan 1.2.4.c "Riset
   pengembangan jaringan pengamatan dan pantauan konflik sosial": target 2029: 10 riset; penanggung jawab Kementerian Sosial, BNPB,
   BRIN, Kemendiktisaintek (hlm. 62). Pagu indikatif tercantum di tabel Renas tetapi tidak dikutip (P5). Sumber: korpus
   `perban-nomor-1-tahun-2025.json` hlm. 55, 62; pustaka `bnpb-2025-renas`; kunci `renas.1_1_2_j.target_2029`,
   `renas.1_2_4_c.target_2029`. Label: resmi. Catatan: kolom tabel ini dibaca dari OCR berlapis; urutan kolom penanggung jawab dan
   kontributor dicek manual terhadap kepala tabel halaman yang sama.
8. **Rezim PP 2/2015 tidak menyebut BNPB.** PP 2/2015: 0 kemunculan kata "bencana" [dihitung penyusun bukti]. Pasal 97: penanganan
   konflik dikoordinasikan menteri urusan dalam negeri bersama K/L terkait, kecuali penghentian kekerasan fisik dan status keadaan
   konflik skala nasional; Pasal 98: untuk skala nasional Presiden dapat menunjuk Menko Polhukam sebagai koordinator. Pasal 5 ayat (4):
   hasil pemetaan wilayah potensi konflik dikoordinasikan kementerian dalam negeri. Pasal 9: tindakan darurat penyelamatan dan
   pelindungan korban oleh Pemerintah dan pemda sesuai kewenangan. Pasal 21–22: kebutuhan dasar pengungsi oleh menteri sosial
   (sebagian oleh menteri pendidikan dan kebudayaan dan menteri kesehatan) atas permintaan pemda, dengan verifikasi. Ditetapkan 2 Feb
   2015 (LN 2015/25). Sumber: salinan JDIH Kemenkeu dibuka ulang 24 Okt 2026; `regulasi.csv`; pustaka `ri-2015-pp2`. Label: resmi.
9. **Tim terpadu konflik di bawah Mendagri tanpa BNPB.** Permendagri 42/2015 (ditetapkan 31 Mar 2015, BN 2015/506), menimbang PP 2/2015
   Pasal 97: Tim Terpadu Penanganan Konflik Sosial tingkat nasional diketuai Menteri Dalam Negeri dengan wakil ketua antara lain
   Kapolri, Panglima TNI, Jaksa Agung, Mensos, Mendikbud, Menkes, Menkeu, Menteri PPN, Kepala BIN; tingkat kab/kota diketuai
   bupati/wali kota dengan sekretariat di Badan Kesbangpol. BNPB dan BPBD tidak disebut; kata "bencana" tidak muncul [dihitung
   penyusun bukti]. Sumber: salinan Berita Negara di laman Kemendagri, dibuka 24 Okt 2026; pustaka `kemendagri-2015-permendagri42`.
   Label: resmi. Status berlaku per Oktober 2026 belum dicek di JDIH BPK (Celah).
10. **Pendanaan konflik memakai dana siap pakai lewat jalur Menkeu.** UU 7/2012 Pasal 55 ayat (1): pendanaan penghentian konflik dan
    rekonsiliasi pascakonflik diambil dari dana siap pakai APBN dan/atau belanja tidak terduga APBD; Pasal 57: pemda berkapasitas
    pendanaan terbatas dapat meminta dana pascakonflik lewat DAK, dikoordinasikan kementerian dalam negeri. PP 2/2015 Pasal 86: usulan
    dana siap pakai disampaikan K/L kepada menteri keuangan bila anggaran K/L tidak mencukupi; Pasal 90 ayat (1): rekonsiliasi
    pascakonflik yang bersifat tanggap darurat dapat memakai dana siap pakai BA BUN; Pasal 91: dana pemulihan pascakonflik diajukan
    pemda kepada menteri keuangan melalui dana transfer ke daerah. Sumber: berkas teks UU 7/2012 hlm. 26–28; PP 2/2015 hlm. 38–40;
    pustaka `ri-2012-uu7`, `ri-2015-pp2`. Label: resmi.
    - **Ditulis berdampingan:** UU 7/2012 Pasal 57 menyebut DAK lewat Kemendagri, PP 2/2015 Pasal 91 menyebut dana transfer ke daerah
      lewat Menkeu. Keduanya resmi; tidak diselaraskan oleh penyusun.
11. **Rehabilitasi PB memuat rekonsiliasi.** UU 24/2007 Pasal 58 ayat (1) huruf f: rehabilitasi dilakukan antara lain melalui
    "rekonsiliasi dan resolusi konflik". Sumber: berkas teks UU 24/2007 hlm. 25; pustaka `ri-2007-uu24`. Label: resmi.
12. **Peta kapasitas fiskal yang dirujuk huruf c tersedia.** PMK 97/2025 tentang Peta Kapasitas Fiskal Daerah (ditetapkan 22 Des 2025)
    memuat lima kategori. Provinsi: sangat rendah 2 (Papua 0,185; Papua Selatan 0,163), rendah 22, sedang 7, tinggi 4, sangat tinggi 3;
    rendah atau sangat rendah 24 dari 38. Kab/kota: sangat rendah 51, rendah 300, sedang 93, tinggi 39, sangat tinggi 25; rendah atau
    sangat rendah 351 dari 508 (69,1%) [dihitung penyusun bukti dari Lampiran]. Provinsi dengan persen desa perkelahian tertinggi: DKI
    Jakarta rendah (0,271), Maluku rendah (0,372), Maluku Utara rendah (0,364). Sumber: PMK 97/2025, JDIH Kemenkeu, dibuka 24 Okt 2026;
    pustaka `kemenkeu-2025-pmk97`; kunci `pmk97_2025.*`. Label: resmi. Catatan: 508 kab/kota karena enam wilayah administrasi DKI bukan
    daerah otonom (514 − 6).
13. **Kategori fiskal kab dengan baris konflik DIBI 2025–2026.** Dari 9 kab otonom yang punya baris konflik sosial DIBI (cakupan
    bencana) 2025–2026, kategori PMK 97/2025: rendah 3 (Manokwari, Kepulauan Aru, Flores Timur), sedang 3 (Maluku Tengah, Halmahera
    Tengah, Seram Bagian Barat), tinggi 1 (Jayawijaya), sangat tinggi 2 (Puncak, Intan Jaya); baris kesepuluh Kota Adm. Jakarta Pusat
    bukan daerah otonom [dihitung penyusun bukti]. Kab analog sejarah: Poso, Sambas, Kotawaringin Timur rendah. Sumber:
    `dibi_nonalam_sosial_baris.csv`; PMK 97/2025 Lampiran; kunci `dibi.konflik.kab_fiskal_rendah_2025_2026`. Label: asumsi-kebijakan
    (gabungan dua sumber resmi pilihan penyusun; mutu baris DIBI lihat PK2 butir 10).
14. **Forum rakor yang disyaratkan.** Rakor keadaan tertentu dikoordinasikan menteri koordinator yang membidangi koordinasi
    penyelenggaraan PB (Perpres 46/2026 Pasal 3 ayat (1)); Kemenko PMK memegang sinkronisasi dan koordinasi kebijakan PB dan konflik
    sosial (Perpres 144/2024). Sumber: `peran.csv` R016, R138; KERANGKA §5 BAB 12 (forum). Label: resmi.

### Inferensi

- **[Inferensi tim]** Peran BNPB dalam konflik sosial dapat dirumuskan dalam tiga kata kerja yang semuanya berpasal: **menjadi unsur**
  Satgas nasional (bila dibentuk Presiden), **menyelenggarakan PB dalam keadaan tertentu** (setelah rakor Menko), dan **merehabilitasi**
  termasuk rekonsiliasi dalam rezim PB. Sesuai kosakata peran prinsip 14, ketiganya masuk "komando darurat" (keadaan tertentu),
  "koordinasi" (Satgas), dan "pendanaan" hanya bila DSP BNPB dipakai dalam keadaan tertentu. Peran pencegahan dan peringatan dini konflik
  tidak tertulis untuk BNPB; satu-satunya kaitan prabencana adalah riset bersama di Renas 1.2.4.c. Ini sama dengan tiga peran yang
  dikunci KERANGKA M01, dengan koreksi bahwa peran pengungsi bukan "bersama Kemensos" menurut PP 2/2015 (§0.1 butir 1).
- **[Inferensi tim]** Matriks fase × konflik di `lembaga/matriks_ringkas.csv` tidak punya satu pun peran prabencana untuk lembaga mana
  pun, padahal UU 7/2012 Pasal 6–11 dan PP 2/2015 Pasal 2–6 memuat pencegahan dan peringatan dini oleh Pemerintah dan pemda. Paket
  `lembaga` perlu menambah baris prabencana (Kemendagri: PP 2/2015 Pasal 5 ayat (4) dan Pasal 97; Kemensos: Renas 1.1.2.j; pemda: UU
  7/2012 Pasal 10) sebelum Tabel 9.1 dibuat. Usulan untuk pemilik paket, bukan sunting oleh berkas ini.
- **[Inferensi tim]** Instrumen yang belum ada untuk Perpres 46/2026, disusun dari selisih teks Perban 5/2018 dan Perpres 46/2026:
  1. Ancaman sosial di daftar jenis ancaman (Pasal 3 ayat (2) huruf a Perban 5/2018) dan penunjukan K/L yang memberi "status ancaman"
     untuk faktor sosial (Pasal 4). Kandidat dari mandat yang ada: kementerian dalam negeri (pemetaan wilayah potensi konflik, PP 2/2015
     Pasal 5 ayat (4)). Ini usulan penugasan, bukan mandat tertulis.
  2. Penyelarasan syarat kumulatif "dan" (Perban 5/2018 Pasal 3 ayat (1)) dengan "dan/atau" Perpres 46/2026.
  3. Kriteria "dalam proses rekonsiliasi pascakonflik sosial": siapa menyatakannya dan dengan dokumen apa. Peraturan yang dibaca tidak
     memuat penetapan semacam itu; status keadaan konflik berlaku paling lama 90 + 30 hari dan berakhir sebelum rekonsiliasi selesai,
     sedangkan rekonsiliasi dilakukan Pemerintah dan pemda (UU 7/2012 Pasal 37) tanpa status. Calon dasar: laporan akhir Satgas (Pasal
     44 huruf h) atau keputusan kepala daerah.
  4. Rujukan peta kapasitas fiskal (PMK 97/2025 dan penggantinya) dan tingkat pemerintahan yang diukur (provinsi atau kab/kota). Contoh:
     Maluku Tengah sedang di tingkat kab tetapi Provinsi Maluku rendah. Karena 69,1% kab/kota dan 24 dari 38 provinsi lolos syarat fiskal,
     pedoman yang tidak mendefinisikan butir 3 akan membuka keadaan tertentu nyaris di mana saja.
  5. Susunan rakor (Pasal 6 Perban 5/2018) yang menyebut nama unsur Satgas nasional UU 7/2012 Pasal 49 ayat (2) yang kini hanya
     dapat masuk lewat huruf t (Kemenag, Kemenhan, Kejaksaan Agung, Komnas HAM) dan nomenklatur Perpres 90/2025.
  6. Hubungan dana siap pakai BNPB dalam keadaan tertentu (PP 22/2008; Perban 4/2020 Pasal 20 ayat (1)) dengan dana siap pakai BA BUN
     untuk penghentian konflik dan rekonsiliasi tanggap darurat (UU 7/2012 Pasal 55; PP 2/2015 Pasal 86, 90). Teks yang dibaca tidak
     menyatakan apakah keduanya pos yang sama.
  Status P7 untuk instrumen ini: perubahan Perban 5/2018 = **Usulan baru** (tidak ada di Progsun 2026), selaras KERANGKA §5 BAB 12
  (pemrakarsa Deputi Bidang Penanganan Darurat dan Biro Hukum, Organisasi, dan Kerja Sama; rakor Kemenko PMK).
- **[Inferensi tim]** Risiko kelembagaan yang perlu ditulis jujur di 9.5: Perpres 46/2026 menambah kewenangan BNPB di wilayah
  pascakonflik, sementara rezim UU 7/2012 dan PP 2/2015 dibangun tanpa BNPB (Mendagri koordinator, Mensos pengungsi, Polri komando
  penghentian). Pedoman BNPB yang tidak menyebut hubungannya dengan Tim Terpadu Permendagri 42/2015 dan Satgas UU 7/2012 berisiko
  menciptakan jalur komando ketiga. Bahan untuk Bab 10.2 dan 12.1, bukan rekomendasi di Bab 9.
- **[Inferensi tim]** Pelajaran dari analog: pengungsian konflik terbesar (lebih dari 1 juta, 2001) dikoordinasikan pendahulu BNPB
  (Bakornas PBP, Keppres 3/2001). Peraturan saat ini tidak menaruh koordinasi pengungsian konflik skala nasional di BNPB. Apakah itu
  kesenjangan atau pembagian kerja yang disengaja bukan keputusan bab ini.

### Celah

- **Pedoman Kepala BNPB menurut Perpres 46/2026 Pasal 3 ayat (4)** tidak ditemukan di katalog JDIH BNPB lokal (indeks per 23 Okt 2026).
  Penyajian: "belum ditetapkan per Oktober 2026 menurut katalog JDIH BNPB"; jangan menulis "BNPB lalai".
- **Status berlaku Permendagri 42/2015** dan perubahannya tidak dicek di JDIH BPK; tanggal pengundangan PMK 97/2025 tidak terbaca di
  salinan elektronik (ditetapkan 22 Des 2025 terbaca). Penyajian: sebut tanggal penetapan saja.
- **Rakor keadaan tertentu yang pernah memakai Perpres 46/2026 Pasal 3 ayat (2) huruf c** tidak ditemukan. Penyajian: kewenangan baru,
  belum ada preseden yang diketahui.
- **Perban 4/2020 Pasal 20** (DSP pada keadaan tertentu) tidak dibaca ulang untuk bab ini; rujuk berkas bukti bab pembiayaan.
- **Dokumen Satgas Penyelesaian Konflik Sosial nasional** (pernah dibentuk atau tidak sejak 2012) tidak ditemukan. Penyajian: tulis
  mandatnya, tanpa klaim keberadaan Satgas.
- **Unit BNPB padanan untuk keadaan tertentu** di OTK berlaku (Perban 6/2025 jo. 11/2025) tidak dipetakan di berkas ini; rujuk
  `program-terbukti/organisasi_bnpb.csv` di Bab 12.

## Komponen

| Komponen | Isi | Sumber data | Kode | Label | Catatan |
| --- | --- | --- | --- | --- | --- |
| Gambar 9.1 Desa/kelurahan dengan perkelahian massal antarkelompok masyarakat per provinsi, 2024 | Panel utama: koroplet 38 provinsi, persen desa jenis antarkelompok masyarakat (5 kelas diskret) dengan simbol sebanding jumlah desa jenis itu; pil NTT 97, Jawa Tengah 88, Maluku 79, Maluku Utara 78, DKI 7,49% (20 dari 267). Panel kecil konteks: semua jenis (DKI 18,73%, Jawa Barat 218, dengan porsi pelajar/mahasiswa DKI 31/50, Jawa Barat 114/218) | `nonalam-sosial/konflik_podes_provinsi.csv` kolom `jenis_antar_kelompok_masyarakat`, `desa_kelurahan_2024`; panel konteks `persen_2024`, `desa_perkelahian_massal_2024`, `jenis_pelajar_mahasiswa` (PK2 T1–T6, T4a–T4c) | G19 + G20 | resmi (jumlah); persen jenis dihitung penyusun | Judul panel konteks wajib "semua jenis perkelahian", tidak boleh terbaca "konflik antarkelompok"; catatan satuan desa dan periode setahun; Kepulauan Riau 0 |
| Usulan tambahan: Gambar 9.2 Desa dengan korban meninggal per provinsi, 2024 | Batang terurut atau simbol; sorot NTT 18, Jawa Barat 15, Papua (6 provinsi) 37 | idem kolom `desa_korban_meninggal_2024` (PK2 T5) | G4 | resmi | Boleh menjadi panel kecil Gambar 9.1 |
| Usulan tambahan: Gambar 9.3 Jenis perkelahian massal, 2024 | 7 jenis, warna lingkup: dalam lingkup (antarkelompok, antardesa, antarsuku), belum pasti (pelajar, lainnya), luar lingkup (dengan aparat) | idem kolom `jenis_*` [kode_prov=00] (PK1 T9, PK2 T9) | G4 | resmi (angka); asumsi-kebijakan (pewarnaan lingkup) | Catatan jenis tidak saling lepas (2.450 lawan 2.031); bukan batang bertumpuk 100% |
| Kartu 9.1 Konflik sosial antarkelompok | Analog terburuk Maluku 1999–2002 empat besaran (≥ 5.000 meninggal, mungkin 10.000; luas "–"; kerugian materiil "–"; hampir 700.000 pengungsi, hampir sepertiga penduduk); rujukan serentak nasional: pengungsi tercatat resmi > 1 juta (2001); baris analog lain (Poso, Sampit, Sambas 1999); baris kasus batas Wamena 2019 dengan kedua penggolongan (DIBI "Konflik Sosial", Presiden "kelompok kriminal bersenjata") dan kedua angka (DIBI 36, Presiden 33); kemungkinan "tidak dinilai"; kebutuhan respons rujukan Perka 7/2008 tanpa angka | `peristiwa.csv`, `skenario_terburuk.csv` [jenis=konflik_sosial], `rekonsiliasi.csv` (PK3 T1–T8) | B5.11 | terverifikasi (analog); resmi (DIBI, Presiden) | Wamena 2019 bukan analog lantai; tanpa perkalian dan proyeksi wilayah (prinsip 9); alasan sel "–" tertulis; analog disisihkan (Mei 1998, Agt 2025) di catatan |
| Tabel 9.1 Batas mandat konflik sosial per fase | Baris lembaga (Pemda, Presiden, Polri, TNI, Kemendagri, Kemensos, Kemenko PMK, Kemenko Polkam, BNPB) × kolom prabencana (pencegahan, peringatan dini), tanggap darurat (penghentian, status, pengungsi), pascabencana (rekonsiliasi, rehabilitasi, rekonstruksi, dana) dengan pasal | `regulasi.csv`; `lembaga/peran.csv` R016, R020, R130–R143; tambahan PK4 T7–T11 (PP 2/2015 Pasal 5, 21, 97; Permendagri 42/2015; Renas 1.1.2.j, 1.2.4.c; UU 24/2007 Pasal 58) | B5.7 | resmi | Pisahkan mandat tertulis dan pemetaan penyusun (prinsip 14); kolom prabencana butuh baris baru di paket `lembaga` |
| Usulan tambahan: Tabel 9.2 Syarat keadaan tertentu: Perpres 46/2026 lawan Perban 5/2018 | Baris: jenis ancaman, sifat syarat (dan lawan dan/atau), kondisi pascakonflik, kriteria rekonsiliasi, rujukan fiskal, K/L pemberi status ancaman, anggota rakor; kolom: Perpres 46/2026, Perban 5/2018, yang belum ada | korpus Perpres 46/2026, Perban 5/2018, PMK 97/2025 (PK4 T3, T4, T12) | B5.7 | resmi (isi peraturan); asumsi-kebijakan (kolom "yang belum ada") | Dasar instrumen Usulan baru di Bab 12.6; status P7 di kolom terakhir |
| Kotak 9.1 Mengapa seri DIBI konflik tidak dipakai | Tiga alasan berangka: tanpa baris 2020–2024; dugaan entri ganda Maluku Tengah; Jayawijaya 2026 bertanggal hari jembatan putus; ditambah SNPK sebagai calon sumber | `dibi_nonalam_sosial_rekap.csv`, `rekonsiliasi.csv`, siaran Kemenko PMK (PK2 T10, T12) | B5.5 | resmi | Rujukan ke Lampiran G (rekonsiliasi angka) |

## Angka untuk registri

Semua kunci baru ditulis lengkap di `naskah/mitigasi/bukti/bab-09.angka.json` (`data/angka.json` utama tidak disunting). Entri
berkas+jalur diuji dengan salinan `ikuti()` dari `bangun/kontrak/naskah.py`; tidak ada kunci yang bentrok dengan registri utama
atau dengan usulan bab lain (dicek terhadap 1.314 kunci di `data/angka.json` dan semua `naskah/*/bukti/*.angka.json` saat ditulis).

Kunci lama yang dipakai ulang, tidak diulang di berkas JSON: `sosial.desa_perkelahian.2024`, `sosial.maluku.meninggal_bawah`,
`sosial.maluku.pengungsi`, `sosial.kerusuhan2025.meninggal_dibi` (registri utama);
`dibi.wamena2019.meninggal` (usulan bab-04 mitigasi); `progsun.2026.jumlah_rancangan` (usulan bab-01 air).

| Kunci | Nilai | Berkas + jalur atau pustaka | Label | Sumber |
| --- | --- | --- | --- | --- |
| sosial.desa_perkelahian.2021 | 1.553 desa | nonalam-sosial/konflik_podes_provinsi.csv [kode_prov=00].desa_perkelahian_massal_2021 | resmi | BPS Statistik Kriminal 2024/2025 Lamp. 26 |
| sosial.desa_perkelahian.persen_2024 | 2,41% | idem .persen_2024 | resmi | BPS Podes 2024 |
| sosial.desa_perkelahian.persen_2021 | 1,85% | idem .persen_2021 | resmi | BPS |
| sosial.desa_kelurahan.2024 | 84.276 desa/kel | idem .desa_kelurahan_2024 | resmi | BPS Podes 2024 Tabel 1.1 |
| sosial.desa_korban_meninggal.2024 | 150 desa | idem .desa_korban_meninggal_2024 | resmi | BPS Podes 2024 Tabel 18.2 |
| sosial.desa_korban_luka.2024 | 1.255 desa | idem .desa_korban_luka_2024 | resmi | BPS Podes 2024 Tabel 18.2 |
| sosial.podes.kenaikan_desa_2021_2024 | 478 desa | nilai; pustaka bps-2025-statistik-kriminal | resmi | olah BPS (2.031 − 1.553) |
| sosial.podes.jenis.antar_kelompok.2024 | 920 desa | konflik_podes_provinsi.csv [kode_prov=00].jenis_antar_kelompok_masyarakat | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.jenis.antar_desa.2024 | 643 desa | idem .jenis_antar_desa_kelurahan | resmi | idem |
| sosial.podes.jenis.antar_suku.2024 | 52 desa | idem .jenis_antar_suku | resmi | idem |
| sosial.podes.jenis.pelajar_mahasiswa.2024 | 575 desa | idem .jenis_pelajar_mahasiswa | resmi | idem |
| sosial.podes.jenis.vs_aparat_keamanan.2024 | 55 desa | idem .jenis_masyarakat_vs_aparat_keamanan | resmi | idem |
| sosial.podes.jenis.vs_aparat_pemerintah.2024 | 44 desa | idem .jenis_masyarakat_vs_aparat_pemerintah | resmi | idem |
| sosial.podes.jenis.lainnya.2024 | 161 desa | idem .jenis_lainnya | resmi | idem |
| sosial.podes.dki.persen_2024 | 18,73% | idem [kode_prov=31].persen_2024 | resmi | BPS |
| sosial.podes.dki.desa_2024 | 50 desa | idem [kode_prov=31].desa_perkelahian_massal_2024 | resmi | BPS |
| sosial.podes.dki.desa_kelurahan_2024 | 267 kel | idem [kode_prov=31].desa_kelurahan_2024 | resmi | BPS |
| sosial.podes.maluku.persen_2024 | 11,41% | idem [kode_prov=81].persen_2024 | resmi | BPS |
| sosial.podes.maluku.desa_2024 | 144 desa | idem [kode_prov=81].desa_perkelahian_massal_2024 | resmi | BPS |
| sosial.podes.malut.persen_2024 | 11,33% | idem [kode_prov=82].persen_2024 | resmi | BPS |
| sosial.podes.malut.desa_2024 | 137 desa | idem [kode_prov=82].desa_perkelahian_massal_2024 | resmi | BPS |
| sosial.podes.jabar.desa_2024 | 218 desa | idem [kode_prov=32].desa_perkelahian_massal_2024 | resmi | BPS |
| sosial.podes.jateng.desa_2024 | 205 desa | idem [kode_prov=33].desa_perkelahian_massal_2024 | resmi | BPS |
| sosial.podes.ntt.desa_2024 | 156 desa | idem [kode_prov=53].desa_perkelahian_massal_2024 | resmi | BPS |
| sosial.podes.ntt.desa_korban_meninggal_2024 | 18 desa | idem [kode_prov=53].desa_korban_meninggal_2024 | resmi | BPS |
| sosial.podes.papua.desa_korban_meninggal_2024 | 37 desa | nilai; pustaka bps-2024-podes | asumsi-kebijakan | olah BPS (6 provinsi Papua) |
| sosial.podes.prov_naik_2021_2024 | 23 provinsi | nilai; pustaka bps-2025-statistik-kriminal | asumsi-kebijakan | olah BPS (dari 32 sebanding) |
| sosial.podes.dki.jenis_antar_kelompok_2024 | 20 desa | konflik_podes_provinsi.csv [kode_prov=31].jenis_antar_kelompok_masyarakat | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.jabar.jenis_antar_kelompok_2024 | 67 desa | konflik_podes_provinsi.csv [kode_prov=32].jenis_antar_kelompok_masyarakat | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.jateng.jenis_antar_kelompok_2024 | 88 desa | konflik_podes_provinsi.csv [kode_prov=33].jenis_antar_kelompok_masyarakat | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.ntt.jenis_antar_kelompok_2024 | 97 desa | konflik_podes_provinsi.csv [kode_prov=53].jenis_antar_kelompok_masyarakat | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.maluku.jenis_antar_kelompok_2024 | 79 desa | konflik_podes_provinsi.csv [kode_prov=81].jenis_antar_kelompok_masyarakat | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.malut.jenis_antar_kelompok_2024 | 78 desa | konflik_podes_provinsi.csv [kode_prov=82].jenis_antar_kelompok_masyarakat | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.dki.jenis_pelajar_mahasiswa_2024 | 31 desa | konflik_podes_provinsi.csv [kode_prov=31].jenis_pelajar_mahasiswa | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.podes.jabar.jenis_pelajar_mahasiswa_2024 | 114 desa | konflik_podes_provinsi.csv [kode_prov=32].jenis_pelajar_mahasiswa | resmi | BPS Podes 2024 Tabel 18.1 |
| sosial.maluku.meninggal_atas | 10.000 jiwa | nonalam-sosial/skenario_terburuk.csv [jenis=konflik_sosial,komponen=analog_maluku_meninggal_atas].nilai | terverifikasi | ICG N°31 |
| sosial.poso.meninggal | 1.000 jiwa | nonalam-sosial/peristiwa.csv [kode=poso1998,metrik=meninggal].nilai | terverifikasi | HRW 2002 |
| sosial.poso.pengungsi | 100.000 jiwa | idem [kode=poso1998,metrik=mengungsi] | terverifikasi | HRW 2002 |
| sosial.sampit.meninggal | 500 jiwa | idem [kode=sampit2001,metrik=meninggal] | terverifikasi | ICG N°19 |
| sosial.sampit.pengungsi | 108.000 jiwa | idem [kode=sampit2001,metrik=mengungsi] | terverifikasi | ICG N°19 |
| sosial.sambas1997.meninggal | 500 jiwa | idem [kode=sambas1997,metrik=meninggal] | terverifikasi | ICG N°19 (mengutip HRW) |
| sosial.sambas1999.meninggal | 186 jiwa | idem [kode=sambas1999,metrik=meninggal] | terverifikasi | ICG N°19 (hitungan resmi) |
| sosial.pengungsi_nasional_2001.tercatat_resmi | 1.000.000 jiwa | idem [kode=pengungsi2001,metrik=mengungsi_tercatat_resmi] | terverifikasi | Brookings-CUNY 2001 |
| sosial.pengungsi_nasional_2001.kelompok_kerja | 1.200.000 jiwa | idem [kode=pengungsi2001,metrik=mengungsi] | terverifikasi | Brookings-CUNY 2001 |
| dibi.wamena2019.mengungsi | 6.634 jiwa | idem [kode=wamena2019,metrik=mengungsi] | resmi | DIBI |
| sosial.wamena2019.meninggal_presiden | 33 jiwa | idem [kode=wamena2019,metrik=meninggal,asal=rujukan] | resmi | Setkab 30 Sep 2019 |
| dibi.wamena2026.meninggal | 33 jiwa | idem [kode=wamena2026,metrik=meninggal] | resmi | DIBI (tanda mutu) |
| dibi.wamena2026.mengungsi | 1.917 jiwa | idem [kode=wamena2026,metrik=mengungsi,asal=DIBI] | resmi | DIBI (tanda mutu) |
| dibi.konflik.2019.kejadian | 5 | nonalam-sosial/dibi_nonalam_sosial_rekap.csv [tingkat=nasional,tahun=2019,jenis_juklak=konflik_sosial,cakupan=bencana].jumlah_kejadian | resmi | DIBI |
| dibi.konflik.2019.meninggal | 39 jiwa | idem .meninggal | resmi | DIBI |
| dibi.konflik.2019.mengungsi | 7.544 jiwa | idem .mengungsi | resmi | DIBI |
| dibi.konflik.2025.kejadian | 4 | idem [tahun=2025] .jumlah_kejadian | resmi | DIBI |
| dibi.konflik.2025.meninggal | 8 jiwa | idem .meninggal | resmi | DIBI |
| dibi.konflik.2025.mengungsi | 2.981 jiwa | idem .mengungsi | resmi | DIBI |
| dibi.konflik.2026.kejadian | 8 | idem [tahun=2026] .jumlah_kejadian | resmi | DIBI (sementara) |
| dibi.konflik.2026.meninggal | 46 jiwa | idem .meninggal | resmi | DIBI (sementara) |
| dibi.konflik.2026.mengungsi | 4.279 jiwa | idem .mengungsi | resmi | DIBI (sementara) |
| dibi.konflik.kab_fiskal_rendah_2025_2026 | 3 kab (dari 9) | nilai; pustaka kemenkeu-2025-pmk97 | asumsi-kebijakan | olah DIBI dan PMK 97/2025 |
| uu7_2012.status_konflik.hari_maks | 90 hari | nilai; pustaka ri-2012-uu7 | resmi | UU 7/2012 Pasal 22 |
| uu7_2012.status_konflik.perpanjangan_hari | 30 hari | nilai; pustaka ri-2012-uu7 | resmi | UU 7/2012 Pasal 29 |
| uu7_2012.satgas_nasional.unsur_pemerintah | 15 unsur | nilai; pustaka ri-2012-uu7 | resmi | UU 7/2012 Pasal 49 ayat (2) |
| perpres46_2026.kondisi_keadaan_tertentu | 3 kondisi | nilai; pustaka ri-2026-perpres46 | resmi | Perpres 46/2026 Pasal 3 ayat (2) |
| perban5_2018.jenis_ancaman | 10 jenis | nilai; pustaka bnpb-2018-keadaan-tertentu | resmi | Perban 5/2018 Pasal 3 ayat (2) huruf a |
| perban5_2018.anggota_rakor | 20 unsur | nilai; pustaka bnpb-2018-keadaan-tertentu | resmi | Perban 5/2018 Pasal 6 |
| renas.1_1_2_j.target_2029 | 5 unit/jaringan | nilai; pustaka bnpb-2025-renas | resmi | Renas PB hlm. 55 |
| renas.1_2_4_c.target_2029 | 10 riset | nilai; pustaka bnpb-2025-renas | resmi | Renas PB hlm. 62 |
| pmk97_2025.prov_rendah_sangat_rendah | 24 provinsi (dari 38) | nilai; pustaka kemenkeu-2025-pmk97 | resmi | PMK 97/2025 Lampiran |
| pmk97_2025.kab_rendah_sangat_rendah | 351 kab/kota | nilai; pustaka kemenkeu-2025-pmk97 | resmi | PMK 97/2025 Lampiran |
| pmk97_2025.kab_dinilai | 508 kab/kota | nilai; pustaka kemenkeu-2025-pmk97 | resmi | PMK 97/2025 Lampiran |
| pmk97_2025.kab_sangat_rendah | 51 kab/kota | nilai; pustaka kemenkeu-2025-pmk97 | resmi | PMK 97/2025 Lampiran |

Catatan penggabungan: (1) Entri bernilai hasil hitungan menulis cara hitungnya di `catatan`; registri belum bisa menjumlah. (2)
Agregat pulau Podes (PK2 T7) sengaja tidak didaftarkan sampai paket menulis CSV turunannya (Celah PK2). (3) Angka sekunder (Polres 24,
Polda 874, Komnas HAM 11) tidak didaftarkan dan tidak dirujuk lewat kunci registri. (4) Jumlah DIBI konflik 2019–2026 dan 2.450
desa-jenis sengaja tidak didaftarkan (D16; tidak bermakna sebagai hitungan desa).

## Pustaka

Entri CSL-JSON di `naskah/mitigasi/bukti/bab-09.pustaka.json`: 27 sumber berbeda. Delapan belas sama dengan pustaka utama atau bab
saudara (`ri-2007-uu24`, `ri-2012-uu7`, `ri-2015-pp2`, `ri-2018-perpres17`, `ri-2026-perpres46`, `ri-2024-perpres144`, `bnpb-2025-renas`,
`bnpb-2025-renstra`, `bnpb-2025-otk`, `bnpb-2025-otk-ubah`, `bnpb-2025-progsun`, `bnpb-dibi`, `bps-2024-podes`, `icg-2001-kalimantan`,
`icg-2002-maluku`, `hrw-2002-poso`, `brookings-2001-pengungsi`, `setkab-2019-wamena`); `ri-2015-pp2` diberi catatan pasal tambahan karena
dibuka ulang 24 Okt 2026. Sembilan baru: `bnpb-2018-keadaan-tertentu`, `bps-2025-statistik-kriminal`, `kemendagri-2015-permendagri42`,
`kemenkeu-2025-pmk97`, `kemenkopmk-2025-snpk-revitalisasi`, `kemenkopmk-2025-snpk-hibah`, `kemenkopmk-2025-snpk-migrasi`, `ri-2002-uu2`,
`ri-2026-uu5`.

- Undang-undang dan peraturan pemerintah: `ri-2007-uu24`, `ri-2012-uu7`, `ri-2015-pp2`, `ri-2002-uu2`, `ri-2026-uu5`.
- Peraturan presiden dan menteri: `ri-2018-perpres17`, `ri-2026-perpres46`, `ri-2024-perpres144`, `kemendagri-2015-permendagri42`,
  `kemenkeu-2025-pmk97`.
- Peraturan dan keputusan BNPB: `bnpb-2018-keadaan-tertentu`, `bnpb-2025-renas`, `bnpb-2025-renstra`, `bnpb-2025-otk`, `bnpb-2025-otk-ubah`,
  `bnpb-2025-progsun`.
- Data resmi: `bnpb-dibi`, `bps-2024-podes`, `bps-2025-statistik-kriminal`.
- Siaran resmi: `setkab-2019-wamena`, `kemenkopmk-2025-snpk-revitalisasi`, `kemenkopmk-2025-snpk-hibah`, `kemenkopmk-2025-snpk-migrasi`.
- Analog (terverifikasi): `icg-2002-maluku`, `icg-2001-kalimantan`, `hrw-2002-poso`, `brookings-2001-pengungsi`.

## Catatan revisi atas temuan pemeriksa (24 Oktober 2026)

Diterima dan dikerjakan: (1) Wamena 2019 diturunkan menjadi kasus batas; kalimat lanjutan Setkab dikutip (dibuka ulang 24 Okt
2026); kalimat "bukan menyangkal sifat antarkelompok" dihapus; kolom `lingkup` di `peristiwa.csv` perlu diubah pemilik paket.
(2) PK2 dijawab dengan jenis antarkelompok masyarakat dan antardesa (Temuan 4a–4c, 8 kunci baru); semua jenis jadi konteks;
Gambar 9.1 diberi panel utama jenis antarkelompok. (3) BIN dihapus dari unsur Satgas nasional (Pasal 49 ayat (2) huruf a–o
dicek di `uu-7-2012.json.gz` hlm. 24–25); Kemenhan ditambah; "tanpa" diganti "tidak disebut namanya, dapat masuk lewat huruf
t". (4) Lantai skenario dicek terhadap semua angka tercatat 1996–2026; rujukan serentak nasional > 1 juta (2001) ditulis;
"hampir 700.000" dipakai konsisten di luar kutipan KERANGKA §0. (5) prov_naik dan papua diberi label asumsi-kebijakan;
jumlah_desa_jenis_2024 dan dibi.konflik.2019_2026.* dihapus dari usulan kunci. (6) Angka Komnas HAM tidak lagi dirujuk lewat
kunci registri; rilis primer Komnas HAM tidak ditemukan (ringkasan LNHAM di kpai.go.id mengembalikan halaman HTML, bukan PDF).

Tidak diubah, dengan alasan: `sosial.podes.kenaikan_desa_2021_2024` (478) dan `pmk97_2025.*` tetap berlabel resmi. Keduanya
penjumlahan atau pengurangan langsung atas kategori resmi tanpa pilihan penyusun (tidak ada provinsi yang dikeluarkan atau
dikelompokkan); berbeda dari agregat pulau, prov_naik, dan papua yang memuat pilihan pengelompokan. `pmk97_2025.kab_dinilai`
(508) adalah daerah otonom yang dinilai Lampiran; enam wilayah administrasi DKI memang bukan daerah otonom, jadi pengurangannya
bukan pilihan penyusun. Bila pemilik registri menetapkan bahwa setiap hasil hitung wajib asumsi-kebijakan, label ini ikut diturunkan.

Untuk pemilik registri `data/angka.json`: kunci `sosial.kerusuhan2025.meninggal_komnas` berlabel keyakinan "resmi" padahal
sumbernya Investortrust (berita); perlu diturunkan atau diganti sumber primer Komnas HAM.
