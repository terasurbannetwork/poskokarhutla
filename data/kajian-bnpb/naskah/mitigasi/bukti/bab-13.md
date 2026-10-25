# Berkas bukti BAB 13 KESIMPULAN DAN REKOMENDASI

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9; Buku Pegangan L56–L64). Penulis bab menulis
hanya dari berkas ini dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-13.angka.json`: 43 kunci angka baru untuk registri (17 versi pertama, 26 pemutakhiran dari LKIP
  BNPB 2025 dan hitungan turunannya; belum digabung ke `data/angka.json`).
- `naskah/mitigasi/bukti/bab-13.pustaka.json`: entri CSL-JSON (lihat bagian Pustaka).

Bahan yang dibaca: `KERANGKA.md` §0, §1.2 (V01–V17), §2 (prinsip 1–20), §4 Bab 10 (tujuan, pertanyaan, komponen yang
dirujuk Bab 13), §5 (Bab 1–13, deck), §6, §7, §8, §10; `KEPUTUSAN.md`; Buku Pegangan L56–L64; `PEDOMAN-DESAIN.md` §A2,
§B5.13, §B5.25–§B5.28, §C9; `riset/E-dokumen-primer.md` §1, E11, §3–4; berkas bukti mitigasi Bab 1–10 beserta
`bab-NN.angka.json` (butir yang sudah diverifikasi dipakai ulang dan disebut per bab dan nomor butir); berkas bukti air Bab 10
(draf register R-A01 sampai R-A21, supaya ID dan keputusan tidak berganda); `data/angka.json`;
`data/dibi/rekap_nasional_tahunan.csv` (dihitung ulang 24 Okt 2026); `data/program-terbukti/kompendium_program.csv` dan
`organisasi_bnpb.csv`; korpus `data/raw/hukum/teks/` yang dibuka ulang untuk bab ini: `perban-nomor-4-tahun-2020.json`
(Pasal 2, Pasal 20), `perban-nomor-1-tahun-2026.json` (Pasal 2, 7, 14, 16), `perka-nomor-6-tahun-2014.json` (Pasal 4, 8),
`keputusan-kepala-nomor-327-tahun-2025.json` (Diktum KESATU sampai KETIGA), `perka-nomor-7-tahun-2008.json` (standar air dan
pangan), `perban-nomor-3-tahun-2018.json` (judul); indeks `data/raw/hukum/indeks.json` (status Perka 6/2014). Penelusuran web
24 Oktober 2026 untuk laporan evaluasi tahunan Renas PB 2025 tidak menemukan dokumen (lihat P2 Celah).

**Pemutakhiran 24 Oktober 2026 (siang).** Versi pertama berkas ini ditulis sebelum berkas bukti Bab 11 dan Bab 12 selesai.
Pemutakhiran ini (a) membaca `naskah/mitigasi/bukti/bab-11.md` (P1, P3, P4, P5, Bahan 11.8–11.10, Koreksi) dan `bab-12.md`
(P2, P3, P4, P5, Bahan, Koreksi), lalu menyelaraskan butir yang berbeda angka atau status; (b) membuka satu dokumen primer
baru yang menutup beberapa celah lama: **Laporan Kinerja BNPB Tahun 2025** (LKIP 2025, 176 hlm., diunduh dari situs resmi
BNPB, SHA-1 berkas `ea574455d935`; nama berkas memuat "R1", tanggal ubah PDF 28 Februari 2026) [`bnpb-2026-lkip2025`].
LKIP 2025 memuat capaian 2025 untuk tiga indikator yang menjadi dasar KD-2, KD-3, dan KD-4, termasuk rumus yang sebelumnya
dicatat "tidak tertulis". Butir baru diberi nomor T1.30 dan seterusnya, T2.15 dan seterusnya; butir lama yang dibantah diberi
catatan "*Dibantah oleh*". Data repo dicek ulang: `dibi/rekap_nasional_tahunan.csv` (seri alam dan semua klasifikasi),
`turunan/profil_kerugian.csv`, `program-terbukti/kompendium_program.csv` (kolom `kekuatan`, `posisi`) dan
`renas_aksi_terkait.csv` (baris 3.1.2.c). Berkas bukti Bab 11 tidak disertai `bab-11.angka.json` dan `bab-11.pustaka.json`
(dicek 24 Okt 2026), jadi kunci bab-11 yang dirujuk di sini belum dapat dipanggil registri.

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah atau lembaga negara RI (termasuk BPK dan MK); dokumen, tabel, atau peraturan dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah RI yang dibuka (jurnal, laporan evaluasi independen, dokumen pemerintah asing, data terbuka) |
| estimasi-model | Keluaran model yang belum diuji balik, siapa pun pembuatnya |
| asumsi-kebijakan | Pilihan penyusun (definisi, ambang, pemetaan, rumus, rubrik, usulan register) |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks naskah final**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**. Program disebut
dengan posisi rubrik paket `program-terbukti` (KERANGKA §2 butir 12). Kata "terbukti" hanya boleh dipakai untuk baris
berkolom `kekuatan` = `kuat`; untuk kajian mitigasi baris itu hanya P19 (kesiapsiagaan siklon Bangladesh, luar negeri; yang
terbukti paketnya) dan P16 (pengendalian air tanah, luar negeri, terpetakan ke sel banjir prabencana). Destana (P01) dan SPAB
(P02) berkekuatan `belum-terbukti`; InaTEWS (P03) `sedang` dengan posisi "Program berjalan, wajib evaluasi dampak".

---

## Kerangka bab (dari KERANGKA.md §5, BAB 13, yang merujuk §4 BAB 10)

- **Judul:** BAB 13 KESIMPULAN DAN REKOMENDASI (4 hlm).
- **Subbab:** 13.1 Kesimpulan; 13.2 Keputusan yang Diminta dari Kepala BNPB; 13.3 Rekomendasi Internal BNPB; 13.4
  Rekomendasi Lintas K/L; 13.5 Yang Sengaja Tidak Direkomendasikan; 13.6 Yang Belum Diketahui.
- **Tujuan bab** (KERANGKA §5 Bab 13: "sama dengan Bab 10 Kajian 1"): menutup dengan keputusan dan rekomendasi yang sama persis
  dengan Pesan Kunci dan deck.
- **Pertanyaan kunci** (dari §4 Bab 10):
  1. Delapan kesimpulan berangka apa yang menopang tesis?
  2. Keputusan apa yang hanya dapat diambil Kepala BNPB, dan apa akibat tiap pilihan?
  3. Rekomendasi apa per horizon dan per unit?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Rekomendasi bernomor dari register bersama, masing-masing dengan langkah, unit pemimpin dan pendukung, peran BNPB, pemimpin K/L, instrumen dan pelaksana daerah, waktu, indikator selesai, dasar, status P7 (§4 Bab 10; §6) | **Register bersama belum ada** (tidak ada `data/rekomendasi.json` dan tidak ada kunci register di `data/angka.json`; dicek 24 Okt 2026). Berkas ini menyusun **draf 36 baris** untuk Kajian 2: 13 baris draf air berkajian keduanya (R-A01–A06, A08–A11, A15, A17, A18) dengan lingkup diperluas ke nasional, ditambah 23 baris khusus mitigasi (R-M01–R-M23; R-M22 dan R-M23 ditambahkan pada pemutakhiran agar dua baris Tabel 12.3 Bab 12, lokus dan target perumahan, punya ID register). ID sementara; dikunci saat register dibangun |
| Keputusan di Pesan Kunci: KD-1, KD-2, KD-3; KD-4 sebagai rekomendasi 100 hari (§5 pesan inti; §6; PEDOMAN §A2, §B5.26) | Dasar kewenangan Kepala BNPB untuk keempatnya dikonfirmasi (P2). **Tiga koreksi atas teks KERANGKA §6:** (a) akibat KD-2 ditulis tanpa "sekitar 0,2%" (putusan V02 di KERANGKA §1.2, yang lebih baru daripada tabel §6); (b) KD-3 (a) ditulis "RPJMN 62% (baseline 2023), target Renstra 67% (2025)", bukan "IKD; baseline Renstra 67%" (bab-05 §0.1 butir 1; riset E11b); (c) KD-1 ditambah satu fakta yang menutup celah lama: rancangan peraturan di luar Progsun dapat disusun dengan izin prakarsa Kepala BNPB (Perka BNPB 6/2014 Pasal 8 ayat (2)). **Pemutakhiran:** (d) KD-2, KD-3, dan KD-4 ditulis ulang dengan capaian 2025 dan rumus indikator dari LKIP BNPB 2025 (T1.31–T1.33, T2.15–T2.17) |
| Yang tidak direkomendasikan: indeks risiko gabungan buatan sendiri; DSP untuk mitigasi prabencana; angka korban titik dari model gempa platform; proyeksi korban konflik (§5 Bab 13) | Keempatnya bersumber (Bahan subbab 13.5, T4.1–T4.4). Ditambah enam butir yang ditolak di berkas bukti bab lain (T4.5–T4.10) |
| Kisi kesimpulan 4 × 2 dan pita keputusan; matriks rekomendasi; kisi prioritas bila rekomendasi lebih dari 9 (§4 Bab 10 Komponen) | Draf kisi (P1 I1.1), pita (P2 I2.1–I2.4), matriks (P3 I3.1) disusun. Kisi prioritas dapat diisi **sementara** karena kelas dampak per jenis di bab-05 PK4 masih asumsi-kebijakan; kunci B5.28 jenuh untuk baris lintas jenis (P3 I3.6) |

- **Komponen (KERANGKA):** kisi kesimpulan 4 × 2 dan pita keputusan (B5.25); matriks rekomendasi (B5.13); kisi prioritas
  bila rekomendasi lebih dari 9 (B5.28). Rincian di bagian Komponen.
- **Status data (KERANGKA):** tidak dicantumkan untuk Bab 13. Bab ini bersandar pada berkas bukti Bab 1–12 dan register
  rekomendasi; register belum dibangun. Berkas bukti Bab 11 dan 12 sudah ada dan dibaca (pemutakhiran); LKIP BNPB 2025
  dibuka dan mengubah tiga butir pita keputusan (T1.30–T1.35).
- **Halaman:** 4.

Catatan lingkup: Bab 13 tidak membawa temuan baru dan tidak mengulang paragraf bab lain (L64; detektor pengulangan §D4);
fakta baru yang dipakai adalah dasar prosedural keputusan (Perka 6/2014) dan capaian indikator 2025 di LKIP BNPB 2025. Supaya
Bab 13 tetap tidak membawa temuan baru, angka LKIP wajib lebih dulu masuk bab asalnya (Bab 5.4 kapasitas, Bab 10.3 peringatan
dini, Bab 11.2 indikator, Bab 12.5 kerugian terhadap PDB); permintaan itu tercatat di bagian Koreksi dengan pemiliknya. Tiap kesimpulan ditulis sebagai angka ditambah artinya bagi keputusan. Lantai skenario (KERANGKA §2 butir 9)
berlaku untuk semua rekomendasi musim: tidak ada rekomendasi yang memakai skenario lebih ringan daripada musim atau kejadian
tercatat terburuk untuk jenis dan wilayah yang sama. Angka model tidak tampil di kisi tanpa angka tercatat di sampingnya.

**Koreksi yang wajib diketahui penulis sebelum menulis (rinci di bagian Koreksi):**

1. **Tesis memakai kategori alam.** KERANGKA §1.2 V06 (diterima 24 Okt 2026) memutuskan tesis, judul A1, Bab 1, dan Bab 4 memakai
   bencana alam: 1.735 meninggal dan 221 hilang pada 2025. Kunci `tesis.mitigasi` di `data/angka.json` masih memakai token
   `dibi.nasional.meninggal.2025` dan `dibi.nasional.hilang.2025` yang jalurnya `klasifikasi=semua` (2.030 dan 246), dan Inti
   bab-01 PK1 juga memakai 2.030 dan 246. Kalimat pertama Bab 13 wajib identik dengan Ringkasan Eksekutif dan slide Pesan
   Kunci (gerbang D-6); sebelum token diganti, ketiganya akan tampil dengan versi semua klasifikasi yang bertentangan dengan V06.
2. **KD-2 tanpa "0,2%"** di pita (V02), walaupun tabel KERANGKA §6 dan Inferensi bab-10 P3 masih memuatnya.
3. **KD-3 baseline 62%**, bukan 67% (bab-05 §0.1 butir 1).
4. **Perpres status dan tingkatan bencana ditulis sebagai kesenjangan berpasal** dengan atribusi tiga sumber resmi (bab-10 P1
   temuan 1), walaupun KERANGKA §8 baris terakhir masih mensyaratkan JDIH Setneg.
5. **KD-3 bukan lagi "alat ukur belum tertulis".** LKIP 2025 menyebut Manual IKU (Kepka BNPB 318/2025) menghitung indikator
   kapasitas sebagai porsi **provinsi** berkategori IKD sedang atau tinggi; capaian 2025 = 50% (19 dari 38 provinsi) terhadap
   target 67% (T1.32). Pilihan KD-3 bergeser dari "alat mana" ke "penyebut mana": provinsi (50%), kab/kota menurut IKD 2025
   (56,2%), atau kab/kota menurut kelas kapasitas KRB (38,0%); 62% (RPJMN 2023) tetap baseline resmi.
6. **KD-2 punya rumus tertulis.** IKP Renstra 6,10% (2025) adalah rerata sederhana dua persentase: tsunami 12,19% dan banjir
   0,01% (LKIP 2025 Tabel 3.4; T1.33). Kalimat "tidak satu pun mendefinisikan cara menghitung tercakup" hanya benar untuk Renas
   1.c.
7. **KD-4 sebagian sudah dijalankan BNPB.** LKIP 2025 menyatakan rerata IRB nasional 2025 = 147,95 sebagai baseline 2026–2029
   dan menghitung penurunan 2025 = 1,03% (target 1,2%, tidak tercapai) dengan kerentanan 2021 (T1.31). Yang belum ada: catatan
   metode yang dapat diperiksa per kab/kota dan rekonsiliasi dengan seri IRBI 2015–2024. Klausa tesis "sampai baseline IRBI 2025
   skala baru diterbitkan" perlu dirumuskan ulang pemilik registri (Koreksi).
8. **Korban 2025 punya dua angka resmi.** DIBI (tarik 23 Okt 2026, alam): 1.735 meninggal dan 221 hilang; LKIP 2025 (data
   terverifikasi, terbit Februari 2026): 1.666 meninggal dan 214 hilang. Keduanya ditulis berdampingan dengan tanggal datanya
   (T1.30).

---

## P1. Delapan kesimpulan berangka apa yang menopang tesis?

### Inti

Delapan angka resmi atau terverifikasi menopang tesis: korban bencana alam 2025 sebesar 1.956 meninggal dan hilang, tertinggi
sejak 2018 dan sekitar 3,1 kali proyeksi Renas 1.a, padahal IRB 2019–2024 turun 10,76%; lantai musim hujan nasional 1.692
meninggal dan hilang (2025/2026), di atas semua pita model; empat dari 13 jenis berkelas dampak tertinggi, dan lima kejadian
menyumbang 58,5% meninggal 2015–2025; risiko termodelkan dan kejadian tercatat menunjuk wilayah yang berbeda (169 kab Tinggi
pada IRBI 2025, terbanyak di Papua dan Maluku, sedangkan 47,2% kejadian tercatat di Jawa, dan lokus prioritas Renas hanya
memuat kab/kota tempat 32,0% korban Sumatra 2025 tercatat); kapasitas daerah 50% provinsi pada 2025 menurut LKIP BNPB (target
67%) lawan 38,0% kab/kota menurut KRB, dengan baseline RPJMN 62% (2023); target peringatan dini naik 0,22 poin di Renstra
lawan 4,70 kali di Renas, dan IKP Renstra 6,10% ternyata rerata sederhana tsunami 12,19% dan banjir 0,01%; Perpres status dan
tingkatan bencana belum ada meskipun MK sudah menjadikan jumlah korban indikator wajib; dan 24 dari 39 sel fase × jenis tanpa
program berbukti kuat atau sedang (Bab 10), atau 28 dari 39 yang hanya berisi aksi wajib menurut peraturan bila hanya program
dalam negeri dihitung (Bab 11), tanpa satu pun program dalam negeri berbukti kuat. Masing-masing berujung pada satu
keputusan atau rekomendasi, sehingga kisi 4 × 2 dibaca sebagai alasan, bukan ringkasan. LKIP BNPB 2025 mencatat angka korban
2025 yang lebih rendah (1.666 meninggal dan 214 hilang) daripada tarikan DIBI Oktober 2026; keduanya ditulis berdampingan.

### Temuan bersumber

**K1. Korban 2025 naik ke tingkat 2018 sementara IRB turun (dasar tesis dan KD-4)**

- **T1.1** DIBI 2025, cakupan kejadian bencana, klasifikasi alam (kode 101–109): 1.735 meninggal, 221 hilang (1.956); 2018:
  5.477 meninggal, 763 hilang (6.240); 2019–2024 paling tinggi 895 (2022). Versi semua klasifikasi 2025: 2.030 meninggal dan
  246 hilang (2.276), memuat nonalam 242 (kebakaran permukiman 145, gagal teknologi 69, epidemi 28), lainnya 45 dan 17 hilang,
  sosial 8; versi ini hanya tampil dengan catatan patahan seri 2024. Sumber: `data/dibi/rekap_nasional_tahunan.csv` [cakupan
  = bencana; baris klasifikasi = alam dijumlah per tahun], dihitung ulang 24 Okt 2026 (sama dengan KERANGKA V06 dan bab-01
  T1.1–T1.3) [`bnpb-dibi`]; kunci lama `dibi.alam.meninggal.2025`, `dibi.alam.meninggal_hilang.2025`,
  `dibi.alam.meninggal_hilang.2018`, `dibi.nasional.meninggal.2025`, `dibi.nasional.hilang.2025`; kunci baru
  `dibi.alam.hilang.2025`, `dibi.alam.meninggal.2018`, `dibi.alam.hilang.2018`. **resmi**.
  - *Dibantah oleh (versi yang masih tertulis):* Inti bab-01 PK1 dan kunci `tesis.mitigasi` memakai 2.030 dan 246 (semua
    klasifikasi). Keduanya benar sebagai angka DIBI, tetapi V06 menetapkan versi alam untuk tesis. Ditulis berdampingan dengan
    nama cakupannya, tidak dirata-rata.
  - **T1.30 (baru)** *Dibantah oleh (angka resmi lain):* LKIP BNPB 2025 hlm. 7 dan Kata Pengantar: "berdasarkan hasil verifikasi data
    bencana", 4.727 kejadian (hidrometeorologi 99,26%, geologi 0,74%), 1.666 meninggal, 214 hilang, 6.799 luka-luka. Selisih 69
    meninggal dan 7 hilang terhadap DIBI alam kemungkinan karena tanggal data (LKIP terbit Februari 2026; DIBI data hidup, ditarik
    23 Okt 2026), bukan karena definisi yang terbaca. Kunci baru `bnpb.lkip2025.meninggal.2025`, `bnpb.lkip2025.hilang.2025`
    [`bnpb-2026-lkip2025`]. **resmi**. "Tertinggi sejak 2018" tetap benar dengan angka LKIP (1.880 lawan 2019–2024 paling tinggi
    895). LKIP hlm. 8 juga menulis bahwa jumlah korban jiwa 2025 "mengalami penurunan dibandingkan dengan tahun sebelumnya"
    (Gambar 1.7; angka gambar tidak terbaca dari teks PDF); kalimat itu bertentangan dengan angka LKIP sendiri dan DIBI (2024:
    603 meninggal dan hilang alam) kecuali "korban jiwa" di gambar itu berarti ukuran lain. Ditulis sebagai pertentangan yang
    belum terjelaskan; naskah tidak mengutip kalimat LKIP itu sebagai temuan.
- **T1.2** Realisasi indikator Renas 1.a 2025: alam 1.956 / 287.198.383 (penduduk BPS pertengahan 2026) = 0,68 per 100.000;
  semua klasifikasi 0,79; proyeksi Renas 2025 = 0,22, sehingga alam sekitar 3,1 kali proyeksi. Cara Renas menghitung 0,22
  (penyebut, cakupan jenis) tidak tertulis. Sumber: bab-01 T1.5–T1.6 [`bnpb-2025-renas`, `bps-2026-penduduk`]; kunci lama
  `renas.indikator_1a.proyeksi_2025`, `bps.penduduk.2026`, `dibi.nasional.per100rb.2025_bps2026`; kunci baru
  `dibi.alam.per100rb.2025_bps2026`, `dibi.alam.rasio_proyeksi_1a.2025`. Label: olah(resmi); rasio memakai cakupan yang
  mungkin berbeda dari proyeksi Renas.
  - *Berdampingan (pemutakhiran):* berkas bukti Bab 11 (P1 T1.3) dan Bab 12 (P2 temuan 5) memakai semua klasifikasi: 2.276
    meninggal dan hilang = 0,79 (BPS 2026) sampai 0,84 (penduduk KRB) per 100.000, sekitar 3,6 kali proyeksi (kunci bab-12
    `renas.indikator_1a.rasio_dibi_2025`). Dihitung ulang 24 Okt 2026 dari `dibi/rekap_nasional_tahunan.csv`: 2.276 / 287.198.383
    × 100.000 = 0,79; / 0,22 = 3,60; versi alam 3,10. Renas tidak membatasi 1.a pada bencana alam, jadi kedua versi sah;
    kisi memakai rentang "3,1–3,6 kali" dengan nama cakupan (I1.1). **olah(resmi)**.
  - *Temuan Bab 11 yang menjelaskan besaran 0,22:* median meninggal dan hilang 2015–2024 (semua klasifikasi) = 603,5 jiwa =
    0,223 per 100.000 dengan penyebut SP2020 270,20 juta (dicek ulang: seri 276; 578; 378; 6.264; 629; 418; 815; 895; 308;
    642). Kesamaan besaran, bukan bukti cara hitung Renas (bab-11 P1 T1.3, I1.2) [`bps-2021-sp2020`, `bnpb-2026-dibi`]; kunci
    bab-11 `dibi.nasional.per100rb.median_2015_2024_sp2020`. **olah(resmi)**.
- **T1.3** Rangkaian banjir dan longsor Aceh, Sumatera Utara, Sumatera Barat (jendela DIBI 15 November–31 Desember 2025): 1.202
  meninggal, 140 hilang, 970.876 mengungsi, 63.019 rumah rusak berat. Sumber: bab-01 T1.4; bab-07 P1 [`bnpb-dibi`]; kunci lama
  `dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang`, `dibi.sumatra2025.mengungsi`, `hidromet.sumatra2025.rumah_rusak_berat`.
  **resmi** (jendela pilihan penyusun).
- **T1.4** IRB nasional 144,02 (2019) ke 128,52 (2024), turun 10,76%, target Renstra 2020–2024 dinyatakan tercapai; penurunan
  terjadi serempak di sembilan bahaya, termasuk gempa, tsunami, dan gunung api; meninggal dan hilang hidrometeorologi rata-rata
  399 per tahun (2015–2019), 424 (2020–2024), 1.952 (2025). Sumber: bab-01 T1.8; bab-05 PK2 [`bnpb-2025-renstra`, `bnpb-irbi`,
  `bnpb-dibi`]; kunci lama `irbi.nasional.2019`, `irbi.nasional.2024`, `irbi.nasional.persen_2019_2024`,
  `irbi.bahaya.n_turun_2019_2024`, `dibi.alam.hidromet.meninggal_hilang_rerata_2015_2019`,
  `dibi.alam.hidromet.meninggal_hilang_rerata_2020_2024`, `dibi.alam.hidromet.meninggal_hilang.2025`. **resmi** (angka);
  pembacaan "serempak di sembilan bahaya" olah(resmi).
- **T1.5** IRBI 2025 tidak sebanding dengan 2015–2024: Spearman peringkat 2024 ke 2025 = 0,589; total sama dengan jumlah kolom
  bahaya di 0% kab; rerata 147,95 tidak pernah diterbitkan BNPB. IKS RPJMN PP 08.04 menargetkan penurunan 1,2% per tahun dengan
  baseline 1,54 (2023). Sumber: bab-03 P1; bab-01 T1.9–T1.10 [`bnpb-irbi`, `ri-2025-perpres12-rpjmn`]; kunci lama
  `irbi.skala.spearman_2025`, `irbi.nasional.2025_rerata`, `rpjmn.pp_irb.baseline_2023`. **resmi** (data); simpulan "skala patah"
  asumsi-kebijakan.
  - *Dibantah oleh (sebagian):* LKIP BNPB 2025 menyatakan rerata 147,95 dan menjadikannya baseline 2026–2029 (T1.31). Klausa
    "rerata 147,95 tidak pernah diterbitkan BNPB" gugur; klausa "skala 2025 tidak sebanding dengan 2015–2024" justru dikonfirmasi
    LKIP sendiri.
- **T1.31 (baru) IRB menurut LKIP BNPB 2025.** Rerata IRB nasional 2025 = 147,95, yang "akan menjadi baseline perhitungan
  Indeks Risiko Bencana di tahun 2026-2029" (hlm. 19). Komponen 2025:
  bahaya dari KRB provinsi 2021 (11 jenis bahaya), kerentanan dari proyeksi 2025–2045 yang dibagikan lewat SEB Kemendagri dan
  Bappenas, kapasitas dari IKD 71 indikator. Untuk menilai IKSS penurunan IRB 2025, BNPB menghitung ulang dengan kerentanan 2021:
  IRB 2025 = 170,17 lawan IRB 2024 = 171,95, turun 1,03% terhadap target 1,2%, dan LKIP menyatakan target tidak tercapai
  (capaian 85,83%). LKIP juga mengakui perbedaan signifikan antara IRB 2013–2024 dan IRB yang disusun 2025 karena data bahaya dan
  kerentanan dimutakhirkan. Sumber: LKIP 2025 hlm. x, 18–20 [`bnpb-2026-lkip2025`]; kunci baru `bnpb.lkip2025.irb.baseline_2026_2029`,
  `bnpb.lkip2025.irb.nasional_2025_kerentanan2021`, `bnpb.lkip2025.irb.nasional_2024_krb2021`,
  `bnpb.lkip2025.irb.penurunan_persen.2025`. **resmi**. Penurunan dihitung ulang: (171,95 − 170,17) / 171,95 = 1,035%.
  - *Bertentangan, ditulis berdampingan:* IRB nasional 2024 = 128,52 menurut seri IRBI 2015–2024 (T1.4; kunci
    `irbi.nasional.2024`) lawan 171,95 menurut LKIP 2025 (komponen KRB 2021). Dua perhitungan dengan komponen berbeda untuk
    tahun yang sama; tidak dipilih salah satu dan tidak dirata-rata.
- **T1.6** Sejak 28 Agustus 2026, Pasal 7 ayat (2) UU 24/2007 dimaknai MK: status bencana nasional sekurang-kurangnya 3 dari 5
  indikator "dengan menempatkan jumlah korban sebagai indikator utama yang harus dipenuhi". Sumber: bab-10 P1 temuan 2
  [`mk-2026-putusan261`]; kunci lama `mk.putusan261_2025.indikator_minimal`, `uu24.pasal7.indikator`. **resmi**.
- **T1.34 (baru) Kerugian ekonomi langsung 2025 menurut LKIP BNPB 2025.** Indikator Tujuan Renstra "Proporsi Kerugian Ekonomi
  Langsung Akibat Bencana Relatif Terhadap PDB" (sama dengan Renas 2.a dan PN 8 RPJMN indikator 4): kerugian 2025 Rp51,3 T
  dibagi PDB 2025 Rp23.656,2 T = 0,217%, **belum termasuk** dampak Siklon Tropis Senyar di Aceh, Sumatera Utara, dan Sumatera
  Barat (November 2025) karena R3P-nya masih disusun saat laporan ditulis. Proyeksi Renas 2025 = 0,137; baseline RPJMN 0,140
  (2022). Sumber: LKIP 2025 hlm. x, 18 [`bnpb-2026-lkip2025`]; kunci baru `bnpb.lkip2025.kerugian_pdb_persen.2025`,
  `bnpb.lkip2025.kerugian_rp.2025`; kunci lama `renas.indikator_2a.proyeksi_2025`, `rpjmn.pn8_kerugian_pdb.baseline_2022` (bab-02). **resmi**. Cara
  menghitung Rp51,3 T tidak diuraikan di bagian yang dibaca.
  - *Dibantah oleh / berdampingan:* berkas bukti Bab 12 (P3 Celah) dan KERANGKA §7 butir 10 menulis kerugian ekonomi langsung
    untuk Renas 2.a "tidak tersedia". Angka 2025 kini ada (resmi, tanpa Senyar); seri tahunan, metode, dan versi dengan Senyar
    tetap tidak ada. Profil kerugian rumah batas bawah Bab 12 (2025: Rp6,76–8,57 T) tetap dipakai sebagai ukuran lain, bukan
    pengganti (`turunan/profil_kerugian.csv` baris tahun 2025, dicek ulang) [`pantaubencana-2026-profil-kerugian`].

**K2. Lantai musim hujan nasional 1.692 dan jendela 2026/2027 (dasar KD-1)**

- **T1.7** Musim hujan 2025/2026 (Oktober–April): 1.506 meninggal, 186 hilang (1.692), 1.043.740 mengungsi, 65.929 rumah rusak
  berat; terberat dalam 18 musim acuan 2008/2009–2025/2026, 2,8 kali musim terberat kedua (600, 2018/2019); median 18 musim
  301,5. Sumber: bab-07 P1; bab-03 P2 [`bnpb-2026-dibi`]; kunci lama `hidromet.nasional.lantai.meninggal_hilang`,
  `hidromet.nasional.musim_2025.meninggal`, `hidromet.nasional.musim_2025.hilang`, `hidromet.nasional.musim_2025.mengungsi`,
  `hidromet.nasional.musim_2025.rumah_rb`, `hidromet.nasional.musim.kedua_terberat_meninggal_hilang`,
  `hidromet.nasional.musim.median_meninggal_hilang`. **resmi**.
- **T1.8** *Disandingkan dengan model:* pita model rasio La Niña nasional 525–1.204 dan musim terberat 396–954 korban jiwa
  (**estimasi-model, belum diuji balik**); lantai 1,77 kali batas atas model musim yang sama. Tiga musim selama El Niño kuat
  (2009/2010, 2015/2016, 2023/2024) mencatat 373, 199, 246 meninggal dan hilang (**resmi**), semuanya di bawah lantai. Sumber:
  bab-03 P2; bab-07 P1–P2; kunci lama `hidromet.nasional.lanina.korban_jiwa`, `hidromet.nasional.terberat.korban_jiwa`,
  `hidromet.nasional.lantai.rasio_batas_tinggi_model`, `hidromet.nasional.pasca_elnino.meninggal_hilang_2009`, `_2015`, `_2023`.
- **T1.9** Musim 2026/2027 dimulai di bawah El Niño sangat kuat: ONI JAS 2026 = 2,16 (peringkat 1 dari 77 nilai JAS 1950–2026,
  NOAA); indeks ENSO BMKG JAS +2,63, ASO +3,08; BMKG: awal musim mundur di 529 ZOM (61,08% luas daratan Indonesia; bukan
  porsi jumlah ZOM), awal November di 185 ZOM, Desember di 266 ZOM; puncak bertahap: Desember 2026 di 155 ZOM (36,94% luas
  daratan), Januari 2027 di 162 ZOM (25,68%), Februari 2027 di 190 ZOM (16,79%) (persentase dari air bukti bab-02). Sumber: bab-07 P2 temuan 1–4 [`bmkg-2026-siaran-musim-hujan`,
  `bmkg-2026-dinamika-okt1`, `noaa-2026-oni`]; kunci lama `oni.jas_2026`, `oni.jas_2026.peringkat`, `bmkg.musim_2026.enso_jas`,
  `bmkg.dasarian_okt1_2026.enso_aso`, `bmkg.musim_2026.zom_awal_mundur`, `bmkg.musim_2026.persen_awal_mundur`; kunci baru
  `bmkg.musim_2026.zom_awal_november`, `bmkg.musim_2026.zom_awal_desember`, `bmkg.musim_2026.zom_puncak_februari`.
  **resmi** (BMKG) dan olah(terverifikasi) (peringkat ONI). Catatan BMKG: subtotal ZOM per kategori tidak saling menjumlah.
- **T1.10** Kalender tercatat nasional 2008–2026: November menyumbang 21,6% meninggal dan hilang lima jenis musim hujan, sangat
  dipengaruhi Sumatra 2025; kekeringan 84% kejadian Juni–September. Hari ke-100 sesudah hari ke-0 1, 15, atau 30 November 2026
  jatuh 9 Februari, 23 Februari, atau 10 Maret 2027. Sumber: bab-07 P2 temuan 8 [`bnpb-2026-dibi`]; kunci lama
  `hidromet.nasional.kalender.porsi_mh_november`, `hidromet.nasional.kalender.porsi_kekeringan_jun_sep`; kunci baru
  `peta_jalan.hari100.hari0_1nov2026`, `peta_jalan.hari100.hari0_15nov2026`, `peta_jalan.hari100.hari0_30nov2026`. Label:
  olah(resmi) (kalender); asumsi-kebijakan (tanggal hari ke-0 belum ditetapkan; aritmetika pasti; sama dengan air bab-01 T1.14).
- **T1.10a (pemutakhiran, dari Bab 11) Puncak tidak serentak.** BMKG 22 Sep 2026: puncak musim hujan Desember untuk sebagian
  besar Sumatera, Kalimantan, dan Sulawesi Barat; Januari–Februari 2027 untuk Jawa, Bali, Nusa Tenggara, dan Papua (puncak
  Desember 155 ZOM, Januari 162, Februari 190). Kalender DIBI 2008–2025: porsi kejadian musim hujan November–April 84,9% di Bali
  dan Nusa Tenggara, 75,8% di Jawa, 57–61% di Sumatera, Kalimantan, Sulawesi, dan Papua, tetapi 41,6% di Maluku, yang memuncak
  Juni–Juli. Sumber: bab-11 P4 T4.1, T4.4 [`bmkg-2026-siaran-musim-hujan`, `bnpb-2026-dibi`]; `skenario-hidromet/kalender_bulanan_pulau.csv`;
  kunci bab-11 `hidromet.kalender.<pulau>.hujan_kejadian_porsi_nov_apr`. **resmi** (BMKG) dan olah(resmi) (kalender).
- **T1.11** Lantai kemarau untuk Kesiapan Kemarau 2027 (tercatat terburuk 2008–2025): kekeringan terdampak 7.798.763 (2018);
  kekeringan meninggal 6 (Kab. Puncak 2023); karhutla 2.611.411,44 ha (SiPongi 2015) dengan 24 meninggal DIBI. *Disandingkan
  dengan model:* kematian berlebih akibat asap 2015 91.600 (selang 95% 24.000–159.200; Koplitz dkk. 2016, **estimasi-model**
  peneliti), sekitar 3.800 kali 24 meninggal DIBI di 33 kab (91.600 / 24 = 3.817; bab-04 butir 20), atau sekitar 7.600 kali
  12 meninggal DIBI di provinsi asap (91.600 / 12 = 7.633; bab-07 P4 Inti). Dua penyebut DIBI berbeda cakupan wilayah; rasio
  selalu ditulis bersama penyebutnya, tidak dicampur. Sumber: bab-07 P2 temuan 12, P4 [`bnpb-2026-dibi`, `sipongi-luas`,
  `koplitz-2016-asap`]; kunci lama `hidromet.nasional.kekeringan.dibi_terdampak_2018`, `dibi.puncak2023.kekeringan.meninggal`,
  `sipongi.karhutla2015.luas_ha`, `koplitz.asap2015.kematian_berlebih`. **resmi** (tercatat).

**K3. Kelas dampak tertinggi dan kejadian langka (skenario terburuk lintas jenis)**

- **T1.12** Dengan pita fatalitas usulan Bab 3 (kelas 5 > 1.000 meninggal dan hilang), 4 dari 13 jenis berkelas 5 pada aspek
  kependudukan: epidemi dan pandemi (COVID-19 161.870 meninggal resmi; kematian berlebih 2020–2021 menurut model WHO
  806.815–1.343.849, **estimasi-model**), gempa bumi (Sulawesi Tengah 2018: 4.140 meninggal, 705 hilang), konflik sosial (Maluku
  1999–2002: sedikitnya 5.000 meninggal, mungkin 10.000, **terverifikasi**, ICG), banjir (Sumatra 2025: 1.202 dan 140); gunung
  api kelas 5 bila pengungsi dihitung (Merapi 2010: 447.982). Kemungkinan lima tahun dapat dinilai untuk 7 jenis. Sumber:
  bab-05 PK4 T4.4–T4.14 [`bnpb-dibi`, `bnpb-2025-renstra`, `who-2023-kematian-berlebih`, `icg-2002-maluku`,
  `cabinetoffice-2025-nrr`]; kunci lama `matriks.mitigasi.kelas5_fatalitas`, `matriks.mitigasi.kelas5_fatalitas_atau_mengungsi`,
  `matriks.mitigasi.kemungkinan_dinilai`, `matriks.mitigasi.jenis_lingkup`, `nonalam.covid19.meninggal`,
  `nonalam.covid19.kematian_berlebih`, `dibi.sulteng2018.meninggal`, `dibi.sulteng2018.hilang`, `sosial.maluku.meninggal_bawah`.
  Label: resmi atau terverifikasi (angka); kelas dan pita **asumsi-kebijakan** (ambang belum dikunci).
- **T1.13** Korban terkumpul pada kejadian langka: lima kejadian menyumbang 58,5% meninggal 2015–2025; geologi 0,91% kejadian
  alam tetapi 54,3% meninggal alam. Sumber: bab-04 P1, P3 [`bnpb-2026-dibi`]; kunci lama
  `dibi.kejadian_besar.lima_teratas_porsi_meninggal.2015_2025`, `dibi.nasional.kejadian_geologi_porsi.2015_2025`,
  `dibi.nasional.meninggal_geologi_porsi.2015_2025`. **resmi** (olah).
- **T1.14** Megathrust Jawa: Mmaks 9,1 (segmen gabungan, periode ulang 600 tahun) dan 8,9 per segmen (400 tahun) menurut PuSGeN
  2024 (**resmi**); peluang lima tahun 0,83% dan 1,24% (turunan penyusun dengan asumsi Poisson, **asumsi-kebijakan**), di atas
  ambang penyisihan 0,2%. Paparan tsunami KRB 2022–2026: 5.341.282 jiwa (**resmi**); korban tsunami skenario tidak
  dikuantifikasi; lantai tercatat megathrust selatan Jawa = Pangandaran 2006, 665 meninggal (USGS, **terverifikasi**). Sumber:
  bab-06 P1–P2; bab-03 P2 [`pusgen-2024-peta-gempa`, `bnpb-2025-renas`, `usgs-usp000ensm`]; kunci lama `pusgen.jawa.mmaks`,
  `pusgen.jawa.periode_ulang`, `geologi.jawa_gabungan.peluang_5th`, `geologi.jawa_segmen.peluang_5th`, `renas.krb.terpapar_tsunami`,
  `usgs.pangandaran2006.meninggal`.
  - *Model berdampingan (hanya kartu dan lampiran):* jiwa pesisir rendah dicapai gelombang ≤ 30 menit pada Jawa Mw 9,1:
    3.442.456 (**estimasi-model; proksi, bukan genangan**). Proksi yang sama melewatkan 18 kab pada skenario Jawa M8,5, termasuk pantai
    selatan Jawa Barat, Lebak, Pandeglang, dan Banyuwangi (KERANGKA §5 Bab 3; bab-06); jumlah kab terlewat untuk Mw 9,1 tidak disebut di
    bahan.
    Kunci lama `geologi.jawa_mmaks.jiwa_pesisir_30mnt`, `geologi.jawa.lubang_proksi_kab`.
- **T1.15** Renkon megathrust nasional tidak ditemukan; satu-satunya contoh resmi yang dibuka adalah renkon tsunami Jawa Timur
  2021 di lampiran Perban 2/2023 (Banyuwangi 165.202 dan Jember 139.835 terpapar). Tidak ada skenario korban resmi PuSGeN atau
  BMKG yang terbuka. Sumber: bab-06 P2 dan Celah; KERANGKA §7 butir 1 [`bnpb-2023-renkon`, `pusgen-2024-peta-gempa`]; kunci
  lama `renkon.jatim2021.banyuwangi_terpapar`, `renkon.jatim2021.jember_terpapar`. **resmi** (ketiadaan hasil penelusuran).

**K4. Risiko termodelkan dan kejadian tercatat menunjuk wilayah berbeda**

- **T1.16** IRBI 2025: 169 kab/kota berstatus Tinggi; Papua 37 dari 42, Maluku 19 dari 21, Sulawesi 40 dari 81, Bali dan Nusa
  Tenggara 21 dari 41, Sumatra 50 dari 154; Jawa dan Kalimantan masing-masing 1. DIBI 2015–2025: Jawa 47,2% kejadian; Sulawesi
  41,3% meninggal dan hilang (hampir seluruhnya Sulawesi Tengah 2018); lima kab dengan korban terbanyak berstatus Sedang pada
  IRBI 2025. Spearman peringkat IRBI 2025 lawan kejadian DIBI per kab −0,38. Sumber: bab-05 PK1 [`bnpb-irbi`, `bnpb-dibi`];
  kunci lama `irbi.kab.tinggi.2025`, `irbi.pulau.*.kab_tinggi.2025`, `dibi.pulau.jawa.porsi_kejadian_2015_2025`,
  `dibi.pulau.sulawesi.porsi_meninggal_hilang_2015_2025`, `irbi_dibi.nasional.spearman.total_kejadian`. **resmi** (angka);
  korelasi asumsi-kebijakan (analisis penyusun atas data resmi).
- **T1.16a (pemutakhiran, dari Bab 12) Lokus prioritas Renas lawan kejadian terbesar 2025.** Renas Tabel 2.3 memuat 171 lokus
  prioritas unik (Jawa 66, Sumatera 40, Sulawesi 28) yang menjadi pertimbangan utama lokasi rencana aksi; dari 1.342 meninggal
  dan hilang banjir dan longsor Sumatra (15 Nov–31 Des 2025, 55 kab/kota), 429 (32,0%) tercatat di kab/kota lokus; tujuh dari
  sepuluh kab/kota dengan korban terbanyak bukan lokus (antara lain Aceh Utara 251, Tapanuli Tengah 164). Sumber: bab-12 P2
  temuan 10–11 [`bnpb-2025-renas`, `bnpb-2026-dibi`]; kunci bab-12 `renas.lokus_prioritas.entri_unik`,
  `dibi.sumatra2025.mh_di_lokus_renas_persen`. Label: resmi (olah; pencocokan nama kab/kota oleh penyusun Bab 12). Satu kejadian
  tidak menguji metode pemilihan lokus (bab-12 Inferensi).
- **T1.17** 148 kab berkapasitas KRB rendah sekaligus berstatus IRBI 2025 Tinggi, sekitar 34,5 juta jiwa (WorldPop 2026);
  status IRBI sendiri dipengaruhi kapasitas, jadi silang ini bukan dua bukti bebas. Sumber: bab-05 PK3 I3.4 [`bnpb-2026-krb`,
  `bnpb-irbi`, `worldpop-2025`]; kunci lama `krb_irbi.kab_kapasitas_rendah_tinggi`, `krb_irbi.kab_kapasitas_rendah_tinggi_penduduk`.
  Label: asumsi-kebijakan (silang dua data resmi; penduduk estimasi-model).
- **T1.18** Daftar perhatian menurut aturan 3.8 seperti tertulis mencakup 426 dari 514 kab (82,9%; 903 pasangan kab–bahaya);
  ukurannya ditentukan sifat data (banjir 253 kab, kekeringan 9 kab), bukan risiko. Sumber: bab-03 P1; bab-05 §0.1 butir 6;
  kunci lama `perhatian.mitigasi.kab_unik`, `perhatian.mitigasi.pasangan`. **asumsi-kebijakan**.

**K5. Kapasitas daerah: dua alat ukur, tiga angka (dasar KD-3)**

- **T1.19** RPJMN Lampiran III hlm. 913, KP 08.04.01: baseline 62% (2023), target 67% (2025) dan 90% (2029); Renstra menulis
  "dari 67% menjadi 90%" dan tidak menyebut alat ukur secara tertulis; kelas kapasitas KRB 2022–2026: rendah 315, sedang 190,
  tinggi 3 dari 508 kab/kota (37,99% minimal sedang); provinsi 31 dari 34 (91,2%); sebaran kab dari Jawa 95,8% sampai Papua 2,4%.
  Sumber: bab-05 PK3, §0.1 butir 1–2; riset E11b [`ri-2025-perpres12-rpjmn`, `bnpb-2025-renstra`, `bnpb-2026-krb`]; kunci lama
  `rpjmn.kp_kapasitas.baseline_2023`, `rpjmn.kp_kapasitas.target_2025`, `renstra.iks_kapasitas_minimal_sedang.2029`,
  `krb.nasional.kapasitas_minimal_sedang_persen`, `krb.prov.kapasitas_minimal_sedang_persen`,
  `krb.pulau.papua.kab_kapasitas_minimal_sedang_persen`, `krb.jawa.kab_kapasitas_minimal_sedang_persen`. **resmi**.
  - *Dibantah oleh / koreksi:* KERANGKA §6 KD-3 (a) dan §2 butir 13 menulis "baseline Renstra 67%" atau 67% sebagai titik
    awal; teks RPJMN menunjukkan 67% adalah target 2025. Kunci air `renstra.iks_kapasitas_minimal_sedang.awal` (nilai 67)
    bernama "awal"; maknanya titik awal Renstra, bukan baseline. Inti P1 berkas bukti Bab 11 juga menulis "67% lawan 38%";
    T1.9 berkas yang sama sudah memuat ketiga angka berdampingan.
  - *Dibantah oleh (pemutakhiran):* klausa "Renstra tidak menyebut alat ukur secara tertulis" benar untuk teks Renstra, tetapi
    alat ukurnya tertulis di Manual IKU (Kepka BNPB 318/2025) menurut LKIP 2025 (T1.32).
- **T1.32 (baru) Kapasitas menurut LKIP BNPB 2025.** IKSS 1.2 "Persentase Daerah yang memiliki tingkat kapasitas
  penanggulangan bencana minimal kategori sedang": target 67%, capaian 50% (persentase capaian 74,63%). Rumus menurut Manual IKU
  (Kepka BNPB 318/2025): jumlah provinsi berkategori IKD sedang dan tinggi dibagi seluruh provinsi; nilai IKD provinsi = rerata
  IKD kab/kota; kategori IKD rendah di bawah 0,4, sedang 0,4–0,8, tinggi di atas 0,8. Lampiran 2 (IKD per provinsi) memuat 19
  dari 38 provinsi bernilai 0,4 atau lebih (dihitung penyusun; tertinggi DIY 0,76, terendah Papua Pegunungan 0,21; Aceh 0,38,
  Sumatera Utara 0,37, Sumatera Barat 0,38). Tingkat kab/kota 2025: 469 dari 514 kab/kota menilai IKD; 225 rendah, 274 sedang,
  15 tinggi (minimal sedang 289 = 56,2%); kab/kota yang belum pernah menilai diberi 0,2. LKIP sendiri mencatat rerata provinsi
  dapat berkategori sedang meskipun kapasitas kab/kota di dalamnya timpang. Sumber: LKIP 2025 hlm. x, 15–16, 20–22, 112–113
  [`bnpb-2026-lkip2025`]; kunci baru `bnpb.lkip2025.kapasitas.prov_minimal_sedang_persen.2025`,
  `bnpb.lkip2025.kapasitas.prov_minimal_sedang_n.2025`, `bnpb.lkip2025.ikd.kab_rendah.2025`, `.kab_sedang.2025`,
  `.kab_tinggi.2025`, `.kab_minimal_sedang_persen.2025`, `.kab_menilai.2025`. **resmi**; hitungan 19 provinsi dan 56,2%
  olah(resmi). Menutup celah bab-05 PK3 (capaian IKS 2025, ambang kelas IKD, penyebut "daerah").
  - *Ditulis berdampingan (empat angka, dua penyebut):* RPJMN baseline 62% (2023; penyebut tidak tertulis di halaman yang
    dibuka); LKIP capaian 50% provinsi (2025); IKD kab/kota 56,2% (2025, olah dari LKIP); kelas kapasitas KRB 2022–2026 38,0%
    kab/kota. Keempatnya resmi atau olah(resmi) dan tidak saling meniadakan; yang berbeda adalah alat dan penyebut.
- **T1.20** Kepatuhan pengukuran: 63 daerah belum menuntaskan SPM sub-urusan bencana, 87 belum mengaktifkan KRB, 79 belum menyusun
  IKD 2024 (Kemenko PMK, 12 Sep 2025). BPK (IHPS II 2024, 25 objek pemda): RPKB dan renkon per jenis belum ada, logistik tidak
  disiapkan berdasarkan renkon, KRB dan RPB tidak mutakhir atau tidak ditetapkan; Pemerintah Aceh dan Pemprov Sumatera Barat
  termasuk yang disebut. Sumber: bab-10 P4 temuan 2–3 [`kemenkopmk-2025-sinkronisasi-irb`, `bpk-2025-ihps2-2024`]; kunci lama
  `kemenkopmk.daerah_belum_spm_bencana`, `kemenkopmk.daerah_belum_krb`, `kemenkopmk.daerah_belum_ikd_2024`,
  `bpk.ihps2_2024.pb.objek_pemda`. **resmi**.

**K6. Dua target peringatan dini berbeda arah (dasar KD-2)**

- **T1.21** Renstra IKP (sama dengan RPJMN KP 08.04.02) 6,10% (2025) ke 6,32% (2029), naik 0,22 poin (kelipatan 1,04); Renas 1.c
  11.060 ke 52.000 per 100.000 penduduk di daerah berisiko (kelipatan 4,70), target lintas K/L; dibaca sebagai persen, Renas 2025
  = 11,06%; Renstra hlm. 70 menulis keterpenuhan 6%. Tidak satu pun mendefinisikan cara menghitung "tercakup". Aksi sarana
  diseminasi di desa (Renas 1.1.2.a) dipimpin 11 K/L sektor bahaya tanpa BNPB. Sumber: bab-10 P3 temuan 1–5
  [`bnpb-2025-renstra`, `bnpb-2025-renas`, `ri-2025-perpres12-rpjmn`]; kunci lama `renstra.ikp_peringatan_dini.2025`, `.2029`,
  `renstra.ikp_peringatan_dini.kenaikan_poin_2025_2029`, `renstra.ikp_peringatan_dini.kelipatan_2025_2029`,
  `renas.indikator_1c.2025`, `.2029`, `renas.indikator_1c.kelipatan_2025_2029`, `renas.indikator_1c.2025_persen`,
  `renstra.peringatan_dini.keterpenuhan_persen`. **resmi** (olah untuk kelipatan dan persen).
  - *Dibantah oleh (pemutakhiran):* klausa "tidak satu pun mendefinisikan cara menghitung tercakup" hanya berlaku untuk Renas
    1.c; cara hitung IKP Renstra tertulis di LKIP 2025 (T1.33).
- **T1.33 (baru) Rumus IKP peringatan dini menurut LKIP BNPB 2025 (Tabel 3.4, hlm. 35).** "Persentase cakupan layanan
  peringatan dini di daerah berisiko bencana" (diampu Direktorat Peringatan Dini) capaian 2025 = 6,10%, sama dengan target
  Renstra 2025. Isi tabel: tsunami 5.341.282 jiwa terpapar, 651.000 tercakup layanan peringatan dini (12,19%); banjir
  113.829.496 jiwa terpapar, 10.800 tercakup (0,01%); "Rata-rata 6,10%". Jadi IKP adalah rerata sederhana dua persentase jenis,
  bukan porsi penduduk. Dihitung ulang 24 Okt 2026: (12,19 + 0,01) / 2 = 6,10; porsi tertimbang penduduk = (651.000 + 10.800) /
  (5.341.282 + 113.829.496) = 0,56%. Penyebut tsunami sama dengan paparan KRB di Renas (`renas.krb.terpapar_tsunami`). Sumber:
  [`bnpb-2026-lkip2025`]; kunci baru `bnpb.lkip2025.pd.tsunami_persen.2025`, `.tsunami_tercakup.2025`, `.banjir_persen.2025`,
  `.banjir_tercakup.2025`, `.banjir_terpapar.2025`, `.rerata_persen.2025`, `.tertimbang_persen.2025`. **resmi**; porsi tertimbang
  olah(resmi). Hanya dua dari 13 jenis lingkup kajian yang dihitung.
- **T1.22** BPK: BNPB belum menyusun Rencana Induk Sistem Peringatan Dini Multi Ancaman; rekomendasi Perpres penguatan
  kelembagaan sistem peringatan dini terpadu (IHPS II 2024 hlm. 185–186, 188–189). Renstra menargetkan 1 Rancangan Perpres
  tentang Peringatan Dini Bencana pada 2025; tidak ditemukan terbit per 24 Okt 2026. Hulu: 19,68% kejadian banjir mendapat
  peringatan berbasis dampak BMKG menurut ringkasan DPR atas LHP BPK 2022. Sumber: bab-10 P3 temuan 6, 7, 9
  [`bpk-2025-ihps2-2024`, `bnpb-2025-renstra`, `dpr-2022-deteksi-dini`]; kunci lama `bpk.bmkg.ibf_banjir_terperingatkan_persen`.
  **resmi**.
- **T1.23** *Kepekaan (hanya kartu dan grafik berpil Asumsi kebijakan; prinsip 10, V02):* dengan koefisien asosiasi lintas negara
  R = 8, lintasan Renas memberi lantai 1.692 menjadi sekitar 1.021 (turun 39,7%), lintasan Renstra sekitar 1.689 (turun 0,2%).
  Sumber: bab-07 P3; bab-10 P3 temuan 8 [`wmo-2022-peringatan-dini`]; kunci lama `hidromet.nasional.pd_renas.penurunan_persen`,
  `hidromet.nasional.pd_renstra.penurunan_persen`, `hidromet.nasional.lantai.pd_renas.korban_jiwa`,
  `hidromet.nasional.lantai.pd_renstra.korban_jiwa`. **asumsi-kebijakan** (bukan efek kausal).

**K7. Norma status dan pelaksana yang belum ada atau tidak terhubung**

- **T1.24** Perpres penetapan status dan tingkatan bencana (UU 24/2007 Pasal 7 ayat (3)) belum ada menurut tiga sumber resmi:
  BPK IHPS II 2024 ("Belum disusunnya Perpres penetapan status dan tingkatan bencana"), pertimbangan Putusan MK
  261/PUU-XXIII/2025 ("hingga saat ini belum dilakukan oleh pemerintah"), dan keterangan Pemerintah di MK ("belum dibentuk
  secara tersendiri"). BPK juga mencatat 6 peraturan pelaksana belum disahkan dan 11 belum diinisiasi BNPB. Sumber: bab-10 P1
  temuan 1 [`bpk-2025-ihps2-2024`, `mk-2026-putusan261`, `bpk-2025-status-bencana`]; kunci lama
  `bpk.ihps2_2024.bnpb.peraturan_belum_disahkan`, `bpk.ihps2_2024.bnpb.peraturan_belum_diinisiasi`. **resmi**.
  - *Berdampingan (bukan bantahan):* Pemerintah berpendapat substansinya sudah dielaborasi dalam PP 21/2008 (Penjelasan Pasal 21
    ayat (1) huruf b: penentuan status termasuk penentuan tingkatan bencana) [`ri-2008-pp21`].
- **T1.25** Dua rezim status tanpa norma pengait: KLB dan wabah (UU 17/2023) lawan status darurat bencana (Perpres 17/2018 Pasal 2);
  status keadaan konflik (UU 7/2012) lawan status bencana sosial. Perban 5/2018 belum melaksanakan Perpres 46/2026 (16 Juli 2026)
  yang memperluas keadaan tertentu ke faktor sosial dan daerah dalam rekonsiliasi pascakonflik berkapasitas fiskal rendah, dan
  memerintahkan pedoman Kepala BNPB (Pasal 3 ayat (4)). Progsun BNPB 2026 (Kepka 327/2025, 11 rancangan) tidak memuat perubahan
  Perban 5/2018 maupun perubahan Renas. Sumber: bab-10 P1 temuan 3–5, 11; bab-08 P1; bab-09 PK4 [`ri-2023-uu17`, `ri-2018-perpres17`,
  `ri-2012-uu7`, `ri-2026-perpres46`, `bnpb-2018-keadaan-tertentu`, `bnpb-2025-progsun`]; kunci lama `progsun.2026.jumlah_rancangan`,
  `perban5_2018.jenis_ancaman`. **resmi**; ketiadaan pengait disimpulkan penyusun dari teks yang dibaca.

**K8. Bukti program tipis, terutama di tanggap darurat, pascabencana, nonalam, dan sosial**

- **T1.26** Dari 39 sel (13 jenis × 3 fase), 24 tanpa program berbukti kuat atau sedang (20 tanpa program, 4 hanya lemah atau
  belum terbukti); 5 sel berbukti sedang bersandar pada program dalam negeri (InaTEWS: gempa dan tsunami, prabencana dan tanggap
  darurat; PAMSIMAS: kekeringan prabencana); 0 sel dengan program dalam negeri berbukti kuat; 12 dari 12 sel nonalam dan sosial
  tanpa program; tanggap darurat 8 dan pascabencana 8 dari 13 sel tanpa program. Uji kepekaan: bila InaTEWS dibatasi ke tsunami,
  sel tanpa program naik ke 21. Sumber: bab-10 P5 temuan 1–5 [`pantaubencana-2026-program-terbukti`]; kunci lama
  `mitigasi.sel_program.*`. **asumsi-kebijakan** (pemetaan penyusun atas rubrik paket).
  - *Berdampingan (pemutakhiran, Bab 11 Tabel 11.2):* dengan kategori posisi dalam negeri, 28 sel hanya berisi aksi wajib menurut
    peraturan (20 sel tanpa program ditambah 8 sel yang hanya punya program luar negeri), 8 "Program berjalan, wajib evaluasi
    dampak", 2 "Rujukan tata kelola", 1 "Program dengan syarat (bukti sedang)" (PAMSIMAS, kekeringan prabencana), 0 program dalam
    negeri berbukti kuat; tanggap darurat dan pascabencana masing-masing 11 dari 13 sel hanya aksi wajib. Sumber: bab-11 P3 T3.4;
    kunci bab-11 `mitigasi.sel_posisi.*`. **asumsi-kebijakan**. Dua hitungan memakai pemetaan yang sama dan konsisten (28 = 20 + 8);
    kisi memakai salah satu dengan nama ukurannya, tidak keduanya dicampur dalam satu kalimat tanpa keterangan.
- **T1.27** Kompendium: 25 program; kuat 2, keduanya luar negeri (P16, P19); program dalam negeri terbaik berbukti sedang (P03
  InaTEWS, P13 PAMSIMAS); Destana (P01) dan SPAB (P02) `belum-terbukti` meski berjalan lebih dari 10 tahun; P03 berbukti sedang
  dari kronologi satu kejadian (Palu 2018). Sumber: `program-terbukti/kompendium_program.csv` kolom `kekuatan`, `posisi`,
  dibaca 24 Okt 2026; bab-10 P5 temuan 1, 6 [`pantaubencana-2026-program-terbukti`]; kunci lama `program.kompendium.n`,
  `program.kompendium.kuat`, `program.kompendium.kuat_dalam_negeri`, `program.kompendium.sedang_dalam_negeri`. Label:
  asumsi-kebijakan (rubrik paket).
- **T1.28** Sel kosong program bukan sel kosong norma: mandat tertulis ada untuk kebakaran industri (Menteri ESDM, Menteri
  Perindustrian, Menaker), KLB dan wabah (UU 17/2023), sistem tanggap darurat sampah kab/kota (UU 18/2008 Pasal 9), dan konflik
  (UU 7/2012). Sumber: bab-10 P5 temuan 7; riset E12 [`ri-2008-uu18`, `ri-2023-uu17`, `ri-2012-uu7`]. **resmi**.

**Tesis yang ditopang**

- **T1.29** Tesis kajian mitigasi di registri: kunci `tesis.mitigasi` (`data/angka.json`), bentuk B, slot {a}–{d}. Isinya (KERANGKA
  §5 pesan inti, setelah V06): "Pada 2025 DIBI mencatat 1.735 korban meninggal dan 221 hilang akibat bencana alam, tertinggi sejak
  2018, dengan 1.202 meninggal dan 140 hilang dalam satu rangkaian banjir dan longsor di Aceh, Sumatera Utara, dan Sumatera Barat
  pada akhir November 2025; Grand Design 2026–2030 menetapkan indikator korban Renas PB 1.a dan 1.b, yang langsung terukur dari
  DIBI, sebagai sasaran utama sampai baseline IRBI 2025 skala baru diterbitkan." **resmi**. Teks registri saat ini memakai "dalam
  kejadian bencana" dan token semua klasifikasi (lihat Koreksi butir 1). Pemutakhiran: nilai baseline IRB 2025 (147,95) sudah
  dinyatakan di LKIP 2025 (T1.31), jadi klausa akhir tesis secara harfiah sudah terpenuhi untuk nilainya, tetapi belum untuk
  catatan metode per kab/kota; usul rumusan "sampai catatan metode IRBI 2025 diterbitkan" (Koreksi butir 1 dan butir baru).

### Inferensi

- **I1.1 [Inferensi tim] Draf kisi kesimpulan 4 × 2 (B5.25).** Kolom kiri pertanyaan pimpinan A (bencana dan skenario terburuk)
  dan B.1; kolom kanan B.2 dan C (kesenjangan dan lembaga pembuka). Tiap kotak: angka di depan, satu kalimat arti bagi keputusan,
  label, rujukan bab. Kalimat "arti" adalah inferensi tim dan wajib berbeda dari kalimat pembuka bab asal (L64).

  | Kotak | Angka utama (label) | Arti bagi keputusan | Rujukan |
  | --- | --- | --- | --- |
  | K1 (Temuan A.1) | 1.735 meninggal dan 221 hilang akibat bencana alam 2025 (DIBI, tarik 23 Okt 2026; LKIP 2025: 1.666 dan 214), tertinggi sejak 2018; 3,1–3,6 kali proyeksi Renas 1.a 0,22 (alam lawan semua klasifikasi); IRB 2019–2024 turun 10,76%, IRB 2025 turun 1,03% dari target 1,2% (resmi) | Capaian indeks tidak memberi tahu apakah korban turun; sasaran utama 2026–2029 adalah 1.a dan 1.b dari DIBI, dan sejak Putusan MK jumlah korban juga indikator wajib status nasional | Bab 1.1, 4.1, 5.2 |
  | K2 (Temuan A.2) | 1.692 meninggal dan hilang pada musim hujan 2025/2026, lantai nasional; pita model 525–1.204 (estimasi-model); awal musim mundur di 529 ZOM (61,08% luas daratan Indonesia) (resmi) | Rencana Aksi Musim Hujan 2026/2027 tidak boleh berskenario di bawah 1.692; tiga musim El Niño kuat (199–373) adalah ekspektasi, bukan skenario terburuk | Bab 7.1, 7.6, 11.6 |
  | K3 (Temuan A.3) | 4 dari 13 jenis berkelas dampak 5; lima kejadian = 58,5% meninggal 2015–2025; Mw 9,1 Jawa berpeluang lima tahun 0,83% (resmi; kelas dan peluang asumsi-kebijakan) | Skenario terburuk ditentukan kejadian langka; megathrust tidak boleh disisihkan, tetapi renkon megathrust nasional tidak ditemukan dan korban tsunami belum dapat dihitung | Bab 5.6, 6.2, 8.2, 9.3 |
  | K4 (Temuan B.1) | 169 kab Tinggi (IRBI 2025), 56 di antaranya di Papua dan Maluku; 47,2% kejadian tercatat di Jawa; Spearman −0,38; lokus prioritas Renas memuat kab/kota tempat 32,0% korban Sumatra 2025 tercatat (resmi; korelasi dan pencocokan asumsi-kebijakan) | Penempatan program per wilayah memakai dua ukuran berdampingan dan aturan syarat, bukan satu peringkat atau indeks gabungan; lokus Renas dapat dilengkapi lewat jalur pengendalian tanpa menunggu perubahan Renas | Bab 5.1, 5.3 |
  | K5 (Temuan B.2) | 50% provinsi berkapasitas minimal sedang pada 2025 (LKIP; target 67%, baseline RPJMN 62% pada 2023) lawan 38,0% kab/kota (KRB 2022–2026) dan 56,2% kab/kota menurut IKD 2025 (resmi; 56,2% olah) | Alat ukur Manual IKU berpenyebut provinsi dan target 2025 tidak tercapai; jarak ke 90% adalah 40 poin (provinsi), 33,8 poin (IKD kab/kota), atau 52 poin (KRB kab/kota), bergantung pada penyebut yang dipilih Kepala BNPB | Bab 5.4, 10.4, 11.2 |
  | K6 (Temuan C.1) | Renstra 6,10% ke 6,32% (naik 0,22 poin) lawan Renas 1.c 11.060 ke 52.000 per 100.000 (4,70 kali); IKP 6,10% = rerata tsunami 12,19% dan banjir 0,01% (resmi) | Kenyataan yang sama dapat dilaporkan berhasil di satu dokumen dan gagal di dokumen lain; IKP dapat mencapai target 2029 tanpa kemajuan cakupan banjir; penyelarasan hanya lewat jalur berkala Renas dan evaluasi Renstra 2027 | Bab 10.3, 11.2 |
  | K7 (Temuan C.2) | Perpres status dan tingkatan bencana belum ada (BPK, MK, Pemerintah); 6 peraturan pelaksana belum disahkan dan 11 belum diinisiasi (BPK) (resmi) | Status nasional kini bertumpu pada tafsir MK tanpa tata cara; Perpres 46/2026 dan perubahan Renas tidak ada di Progsun 2026, sehingga izin prakarsa Kepala BNPB menjadi jalur tercepat | Bab 10.1, 12.6 |
  | K8 (Temuan C.3) | 24 dari 39 sel fase × jenis tanpa program berbukti kuat atau sedang (28 hanya aksi wajib bila program luar negeri tidak dihitung); 0 program dalam negeri berbukti kuat; 12 sel nonalam dan sosial kosong (asumsi-kebijakan) | Program berjalan (Destana, SPAB, InaTEWS) diberi evaluasi dampak, bukan klaim keberhasilan; agenda bukti 2026–2030 adalah rekomendasi, bukan pelengkap | Bab 10.8, 11.10 |

- **I1.2 [Inferensi tim] Kode temuan Pesan Kunci (B5.26).** Kode huruf mengikuti pertanyaan pimpinan PEDOMAN §A2 untuk kajian
  mitigasi: A = bencana yang paling mungkin menimbulkan kerugian terbesar dan skenario terburuknya (K1, K2, K3); B = tempat risiko
  terkonsentrasi (K4, K5); C = kesenjangan yang paling menahan dan lembaga pembukanya (K6, K7, K8). Pesan Kunci DOCX memuat
  6–8 temuan (KERANGKA V12; Buku Pegangan L14), jadi kedelapannya dapat tampil. Slide 1 deck memuat 4–6 (S1); usul: Temuan A.1,
  A.2, A.3, B.2, C.1, C.3, karena A.2, B.2, C.1 menopang langsung KD-1, KD-3, KD-2.
- **I1.3 [Inferensi tim] Tesis tetap berdiri** dengan angka alam: 1.956 meninggal dan hilang 2025 lebih tinggi daripada tiap tahun
  2019–2024 dan di bawah 2018, jadi "tertinggi sejak 2018" benar untuk versi alam dan versi semua klasifikasi. Yang harus dijaga:
  token tesis diganti ke versi alam sebelum gerbang D-6, dan klausa "sampai baseline IRBI 2025 skala baru diterbitkan" terikat
  pada KD-4; bila KD-4 tidak diputus, klausa itu tidak punya tanggal.
- **I1.4 [Inferensi tim] Kandidat cadangan kisi** bila penyunting menolak satu kotak: (a) 4 dari 13 jenis "dampak dinilai,
  kemungkinan tidak dinilai" untuk nonalam dan sosial (bab-05 PK4), yang menegaskan bahwa kartu analog tanpa proyeksi adalah
  keputusan metode; (b) Pemerintah Aceh dan Pemprov Sumatera Barat disebut BPK pada 2024 belum memiliki RPKB dan renkon per jenis.
  Butir (b) hanya boleh ditulis sebagai koinsidensi yang dicatat, tidak sebagai sebab korban November 2025 (bab-10 P4 Inferensi).
- **I1.5 [Inferensi tim] Larangan tampil di kisi:** angka efek koefisien R = 8 (39,7%; 0,2%; 1.021) tidak masuk kisi (prinsip 10;
  V02); 91.600 kematian asap hanya berdampingan dengan 24 meninggal tercatat dan berpil estimasi-model; 3.442.456 jiwa pesisir
  rendah hanya dengan catatan kab yang terlewat proksi; pita model La Niña hanya berdampingan dengan 1.692.
- **I1.6 [Inferensi tim] Kepekaan rumus IKP (dasar arti kotak K6).** Karena IKP adalah rerata sederhana dua persentase jenis
  (T1.33), target 2029 6,32% tercapai bila cakupan tsunami naik ke sekitar 12,63% (sekitar 23.600 jiwa tambahan dari 651.000,
  dengan penyebut 5.341.282 tetap) walaupun cakupan banjir tetap 10.800 jiwa. Hitungan: 2 × 6,32 − 0,0095 = 12,6305%; × 5.341.282 =
  674.631; selisih 23.631 (23.604 bila banjir dibulatkan 0,01%). Ini pembacaan rumus, bukan perkiraan kinerja; label
  asumsi-kebijakan (penyebut dan rumus diasumsikan tetap). Kunci baru `pd.ikp_2029.tambahan_tsunami_jiwa`.
- **I1.7 [Inferensi tim] Tiga indikator sasaran BNPB 2025 tidak tercapai atau bertentangan arah dengan dampak.** LKIP 2025
  mencatat IRB turun 1,03% (target 1,2%), kapasitas 50% (target 67%), dan kerugian terhadap PDB 0,217% tanpa Senyar (proyeksi
  Renas 0,137), sementara IKP peringatan dini tepat 6,10%. Kalimat yang aman di 13.1: "capaian 2025 menurut LKIP BNPB" dengan
  angka dan target, tanpa menilai kinerja unit.

### Celah

- DIBI 2026 masih sementara (final sekitar Februari 2027); DIBI data hidup. **Penyajian:** tanggal tarik 23 Okt 2026 di baris
  Sumber kisi dan tesis.
- Cara Renas menghitung proyeksi 0,22 dan 2.643 (penyebut, cakupan jenis) tidak tertulis (bab-01 Celah). **Permintaan:** Deputi
  Bidang Sistem dan Strategi. **Penyajian:** "sekitar 3,1 kali proyeksi" dengan penyebut BPS 2026 disebut terang.
- Ambang kelas dampak 1–5 belum dikunci di Bab 3 (Perban 2/2023 tidak memuatnya); K3 berlabel asumsi-kebijakan sampai dikunci.
- Korban tsunami skenario tidak dikuantifikasi sampai genangan InaRISK `Inun_*` × penduduk dipakai (KERANGKA §7 butir 3).
- Selisih korban 2025 antara LKIP (1.666 dan 214) dan DIBI (1.735 dan 221) serta kalimat LKIP bahwa korban jiwa 2025 turun
  tidak dapat dijelaskan dari bahan; Gambar 1.7 LKIP tidak terbaca dari teks. **Permintaan:** Pusdatinkom (tanggal potong data
  LKIP). **Penyajian:** kedua angka berdampingan dengan tanggal data.
- Lampiran 10 LKIP (Capaian Kinerja BNPB, hlm. 132–157) berupa gambar tanpa lapisan teks; capaian per IKP lain tidak dibaca.
- Berkas bukti Bab 11 dan 12 sudah ada (pemutakhiran); kotak K2, K4, K5, K8 kini merujuk butir bab-11 P3–P4 dan bab-12 P2.
  Angka LKIP belum ada di berkas bukti Bab 5, 10, 11, 12; sampai dimasukkan, kotak K1, K5, K6 belum identik dengan bab asal
  (gerbang KERANGKA §2 butir 20).

---

## P2. Keputusan apa yang hanya dapat diambil Kepala BNPB, dan apa akibat tiap pilihan?

### Inti

Tiga keputusan di pita Pesan Kunci dan satu rekomendasi 100 hari berada di tangan Kepala BNPB karena menyangkut dokumen yang
ditetapkan Kepala sendiri atau jalur yang hanya dapat diwakilinya: KD-1 (menetapkan kajian sebagai masukan peninjauan Renas PB,
yang ditetapkan Kepala, dan menetapkan hari ke-0), KD-2 (menyelaraskan target cakupan peringatan dini antara dua Peraturan BNPB),
KD-3 (memilih alat ukur kapasitas untuk sasaran 90% pada 2029), dan KD-4 (menerbitkan catatan metode dan baseline IRBI 2025).
Akibat terbesar ada pada waktu: perubahan target Renas (KD-2 untuk 1.c, KD-4 untuk 4.c) hanya dapat masuk lewat jalur berkala
Renas yang paling lambat 2027, bersamaan dengan evaluasi tahun ke-3 Renstra; bila ditunda, yang tersisa hanya jalur karena bencana
sampai 2028 untuk program dan kegiatan. KD-3 tidak bergantung pada jalur Renas karena indikator kapasitas tidak ada di Renas Tabel
2.8: penyebut dan alat ukurnya tertulis di Manual IKU (Kepka BNPB 318/2025) dan dapat diubah Kepala dengan keputusan sendiri
kapan saja; yang ikut evaluasi tahun ke-3 Renstra dan wajib konsisten dengan RPJMN KP 08.04.01 hanya angka target 67–90%.
Perubahan Renas dan pedoman Perpres 46/2026 tidak ada di Progsun 2026; Perka BNPB 6/2014 membuka penyusunan di luar program
dengan izin prakarsa Kepala, tetapi Perka itu sendiri dijadwalkan diubah (Progsun 2026 butir 7), jadi jalur ini berlaku sampai
perubahannya ditetapkan. LKIP BNPB 2025 mengubah isi tiga pilihan: KD-2 kini tentang rumus
IKP (rerata sederhana tsunami 12,19% dan banjir 0,01%), KD-3 tentang penyebut (provinsi 50% pada 2025, target 67%, lawan
kab/kota), dan KD-4 tentang catatan metode untuk baseline 147,95 yang nilainya sudah dinyatakan BNPB.

### Temuan bersumber

**Dasar kewenangan Kepala BNPB**

- **T2.1** Renas ditetapkan Kepala BNPB (Perpres 87/2020 Pasal 4 ayat (2)); Renas PB 2025–2029 = Perban BNPB 1/2025, ditetapkan 6
  Januari 2025, ditinjau berkala tiap 2 tahun dan sewaktu-waktu jika terjadi bencana (Pasal 7 ayat (1)–(2)). Renstra BNPB 2025–2029
  = Perban BNPB 5/2025, ditetapkan 3 Oktober 2025. Sumber: bab-01 T2.1, T2.4; air bab-10 T2.1–T2.2 [`ri-2020-perpres87`,
  `bnpb-2025-renas`, `bnpb-2025-renstra`]. **resmi**.
- **T2.2** Perubahan Renstra-KL diatur Perpres 80/2025: konsisten dengan RPJMN (Pasal 22); dasar perubahan antara lain hasil
  pengendalian dan evaluasi Renstra-KL (Pasal 23 ayat (1) huruf c); muatan yang dapat diubah termasuk indikator kinerja dan target
  (Pasal 24 ayat (1) huruf b); disetujui Kementerian Perencanaan setelah Pertemuan Dua Pihak (Pasal 26–29); evaluasi Renstra-KL
  tahun ke-3 dan ke-5 (Pasal 51 ayat (5)–(6)). Sumber: air bab-10 T2.3 [`ri-2025-perpres80`]; kunci lama
  `perpres80.renstra.evaluasi_tahun_ke`, `renstra.evaluasi_tahun_ke3.tahun` (2027). **resmi**.
- **T2.3** BNPB dikoordinasikan Kemenko PMK (Perpres 1/2019 Pasal 6); Unsur Pengarah memberi masukan dan saran kepada Kepala (Pasal
  10). Sumber: bab-01 T2.6 [`ri-2019-perpres1`]. **resmi**.
- **T2.4 (baru untuk kajian mitigasi) Jalur peraturan di luar program tahunan.** Perka BNPB 6/2014 tentang Pembentukan Produk
  Hukum (status BERLAKU menurut indeks JDIH; dirujuk di konsiderans Kepka 327/2025): perencanaan peraturan "dilaksanakan dalam
  Proleg PB" yang "ditetapkan berdasarkan skala prioritas dalam jangka waktu 1 (satu) tahun" (Pasal 4 ayat (1), (4)); "Tim Teknis
  menyusun rancangan Peraturan Kepala BNPB di luar Proleg PB, setelah terlebih dahulu mengajukan permohonan izin prakarsa kepada
  Kepala BNPB" (Pasal 8 ayat (2)). Kepka 327/2025 menetapkan Progsun 2026 untuk satu tahun (Diktum KEDUA) dan mewajibkan Kepala Biro
  Hukum, Organisasi, dan Kerja Sama melaporkan realisasinya tiap triwulan kepada Kepala melalui Sekretaris Utama (Diktum KETIGA).
  Sumber: korpus `perka-nomor-6-tahun-2014.json` hlm. 4–6; `keputusan-kepala-nomor-327-tahun-2025.json` hlm. 2; indeks
  `data/raw/hukum/indeks.json` entri `perka-nomor-6-tahun-2014` (dibuka 24 Okt 2026) [`bnpb-2014-produkhukum`,
  `bnpb-2025-progsun`]. **resmi**. Catatan: Perka 6/2014 menyebut "Peraturan Kepala BNPB" dan unit lama (Deputi Bidang
  Pencegahan dan Kesiapsiagaan); penerapannya pada Peraturan BNPB adalah tafsiran penyusun yang didukung oleh pencantumannya di
  konsiderans Progsun 2026.
  - **Perka 6/2014 sedang dijadwalkan diubah (koreksi pemeriksa, dicek 24 Okt 2026).** Lampiran Kepka 327/2025 butir 7 memuat
    "Rancangan Peraturan BNPB tentang Perubahan atas Peraturan Kepala BNPB Nomor 6 Tahun 2014 tentang Pembentukan Produk Hukum di
    Lingkungan BNPB", pemrakarsa Sekretariat Utama, Biro Hukum, Organisasi, dan Kerja Sama (korpus
    `keputusan-kepala-nomor-327-tahun-2025.json` hlm. 4) [`bnpb-2025-progsun`]. **resmi**. Jadi mekanisme izin prakarsa Pasal 8
    ayat (2) adalah aturan berlaku saat ini yang dapat berubah dalam 2026; isi rancangan perubahannya tidak dibuka. Semua
    rekomendasi yang bersandar pada izin prakarsa (T2.14 (a), R-M02, butir ke-7 keputusan 14 hari) berlaku sampai perubahan itu
    ditetapkan.

**Akibat pilihan KD-1 (masukan peninjauan Renas dan hari ke-0)**

- **T2.5** Jendela Renas (hlm. 123–125): perubahan karena peninjauan berkala maksimal di tahun ketiga (2027); karena bencana maksimal
  di tahun keempat (2028), hanya program dan kegiatan rencana aksi; rekomendasi peninjauan wajib termuat dalam hasil pemantauan dan
  evaluasi tahunan atau paruh waktu; pemantauan pra-pelaksanaan triwulan IV tahun T-1; evaluasi tahunan paling lambat minggu terakhir
  triwulan II tahun T+1; evaluasi paruh waktu di tahun ketiga. Usulan perubahan target dan alat ukur hanya lewat jalur berkala
  (KERANGKA prinsip 1). Sumber: bab-01 T2.2–T2.3 [`bnpb-2025-renas`]; kunci lama `renas.perubahan_berkala.tahun_maks`,
  `renas.perubahan_bencana.tahun_maks`. **resmi**.
- **T2.5a (pemutakhiran, dari Bab 12) Jalur ketiga tanpa mengubah Renas.** Pengendalian Renas memberi rekomendasi tindakan korektif
  yang dapat berupa saran perubahan lokasi, penerima manfaat, volume keluaran, atau bentuk kegiatan; pemantauan pra-pelaksanaan
  triwulan IV tahun T-1 meninjau Renja K/L penanggung jawab. Sumber: bab-12 P2 temuan 2; korpus `perban-nomor-1-tahun-2025.json`
  hlm. 123 [`bnpb-2025-renas`]. **resmi**. Jalur ini tetap terbuka bila KD-1 ditunda, tetapi tidak dapat mengubah target atau alat
  ukur.
- **T2.6** Pemicu jalur bencana: Sumatra November 2025, 1.202 meninggal dan 140 hilang (T1.3). Progsun 2026 tidak memuat perubahan
  Perban 1/2025 (bab-01 T2.7). **resmi**.
- **T2.7** Waktu musim: awal musim November di 185 ZOM dan Desember di 266 ZOM; puncak bertahap, Desember 2026 di 155 ZOM (36,94%
  luas daratan; sebagian besar Sumatera, Kalimantan, Sulawesi Barat), lalu Januari 2027 di 162 ZOM (25,68%) dan Februari 2027 di
  190 ZOM (16,79%; Jawa, Bali, Nusa Tenggara, Papua) (T1.9, T1.10a); Februari bukan puncak nasional; November 21,6% korban
  musim hujan nasional tercatat; hari ke-100 9 Februari sampai 10 Maret 2027 (T1.9–T1.10). Renkon direviu paling sedikit 6 bulan
  sekali (Perban 2/2023 Pasal 21). Sumber: kunci lama `perban2_2023.renkon_reviu_bulan` [`bnpb-2023-renkon`]. **resmi** (BMKG,
  peraturan); asumsi-kebijakan (tanggal).

**Akibat pilihan KD-2 (target cakupan peringatan dini)**

- **T2.8** Lintasan: Renas 1.c kelipatan 4,70; IKP Renstra kelipatan 1,04 (naik 0,22 poin); penyebut berbeda, jadi kelipatan hanya
  menunjukkan arah dan besar ambisi tiap dokumen (T1.21). Baseline Renas 1.c per provinsi dan kab tidak ada (KERANGKA §7 butir 33).
  Capaian hilir Renas 1.c bergantung pada 11 K/L pemegang aksi 1.1.2.a; BNPB penanggung jawab platform dan rencana induk MHEWS
  (Renas 1.1.1.a–c; air bab-10 T2.12). **resmi**.
- **T2.9** IKP Renstra identik dengan RPJMN KP 08.04.02 (baseline 6,00; 6,10 pada 2025; 6,32 pada 2029), sehingga revisi IKP harus
  konsisten dengan RPJMN atau ikut membahas target RPJMN (Perpres 80/2025 Pasal 22; T2.2). Sumber: riset E11b
  [`ri-2025-perpres12-rpjmn`]; kunci lama `rpjmn.peringatan_dini.baseline`. **resmi**.
- **T2.10** Angka kepekaan 39,7% dan 0,2% (T1.23) berlabel asumsi-kebijakan; KERANGKA §1.2 V02 mengeluarkan "0,2%" dari akibat KD-2 di
  Pesan Kunci, slide 1, Bab 10, dan Bab 13. **asumsi-kebijakan** (angka); resmi (putusan dokumen kerja).
  - *Dibantah oleh / bertentangan:* tabel KERANGKA §6 KD-2 (b) masih memuat "sekitar 0,2%", dan Inferensi bab-10 P3 menyebut pilihan
    (b) "terkonfirmasi oleh temuan 8". Putusan V02 lebih baru dan khusus; penulis mengikuti V02.
- **T2.15 (baru) Rumus IKP yang dipakai BNPB untuk capaian 2025.** IKP 6,10% = rerata sederhana cakupan tsunami (12,19%) dan
  banjir (0,01%), dengan penyebut jiwa terpapar KRB per jenis (T1.33); diampu Direktorat Peringatan Dini. Capaian 2025 sama
  dengan target 2025. Porsi tertimbang penduduk kedua jenis 0,56%. Renas 1.c memakai satuan per 100.000 penduduk di daerah
  berisiko dan tidak dihitung di LKIP. Sumber: LKIP 2025 hlm. 35 [`bnpb-2026-lkip2025`]. **resmi**; porsi tertimbang
  olah(resmi). Akibat untuk KD-2: perbedaan Renstra dan Renas bukan hanya penyebut, tetapi juga bentuk rumus (rerata per jenis
  lawan porsi penduduk).

**Akibat pilihan KD-3 (alat ukur kapasitas)**

- **T2.11** Pilihan (a) indikator RPJMN KP 08.04.01: baseline 62% (2023), target 67% (2025) dan 90% (2029); alat ukur tidak tertulis
  di Renstra (IKD diuraikan sebagai "upaya untuk mengukur kapasitas", 71 indikator, rata-rata 0,46 kategori sedang); 79 daerah belum
  menyusun IKD 2024; penyebut "daerah" tidak didefinisikan. Pilihan (b) kelas kapasitas KRB 2022–2026: 193 dari 508 kab/kota (38,0%).
  Jarak ke 90%: 28 poin dari baseline RPJMN; 52 poin dari KRB kab, setara 265 kab tambahan (90% dari 508 = 458 kab, kini 193).
  Sumber: bab-05 PK3 T3.1–T3.8, I3.2 [`ri-2025-perpres12-rpjmn`, `bnpb-2025-renstra`, `bnpb-2026-krb`,
  `kemenkopmk-2025-sinkronisasi-irb`]; kunci lama `renstra.ikd.rerata`, `renstra.ikd.jumlah_indikator`,
  `krb.nasional.kab_kapasitas_dinilai`; kunci baru `kapasitas.jarak_90.rpjmn_poin`, `kapasitas.jarak_90.krb_kab_poin`,
  `kapasitas.target_90.krb_kab_n`, `kapasitas.jarak_90.krb_kab_tambahan`. Label: resmi (angka dasar); jarak olah, berlabel
  asumsi-kebijakan karena membandingkan dua alat yang berbeda unit.
  - *Dibantah oleh (pemutakhiran):* "alat ukur tidak tertulis" dan "penyebut daerah tidak didefinisikan" gugur untuk indikator
    kinerja BNPB: Manual IKU Kepka 318/2025 memakai porsi provinsi berkategori IKD sedang atau tinggi (T1.32, T2.16).
- **T2.12** Teks Perka BNPB 3/2012 (Panduan Penilaian Kapasitas Daerah) tidak tersedia di JDIH; ambang kelas IKD resmi tidak dibuka;
  metode kelas kapasitas KRB (apakah memakai IKD) tidak terdokumentasi. Sumber: bab-05 PK3 Celah. **resmi** (ketiadaan).
  - *Dibantah oleh (sebagian):* ambang kategori IKD (rendah di bawah 0,4; sedang 0,4–0,8; tinggi di atas 0,8) tertulis di LKIP
    2025 hlm. 20. Teks Perka 3/2012 dan metode kelas kapasitas KRB tetap tidak dibuka.
- **T2.16 (baru) Capaian kapasitas 2025 dan jarak ke 90%.** Capaian 2025 = 50% (19 dari 38 provinsi; target 67%, persentase
  capaian 74,63%); IKD kab/kota 2025: 289 dari 514 minimal sedang (56,2%); 469 kab/kota menilai, 45 memakai nilai tahun
  terakhir, kab/kota yang belum pernah menilai diberi 0,2. Jarak ke 90%: provinsi 40 poin (35 provinsi, 16 tambahan); IKD
  kab/kota 33,8 poin (463 kab/kota, 174 tambahan); KRB kab/kota 52 poin (458, 265 tambahan; T2.11). Kendala yang ditulis
  LKIP: bukti dukung IKD dari daerah belum sesuai ketentuan, kapasitas daerah menghitung IKD kurang, indikator IKD belum selaras
  dengan perencanaan daerah. Sumber: LKIP 2025 hlm. x, 20–22, 112–113 [`bnpb-2026-lkip2025`]; kunci baru di T1.32 dan
  `kapasitas.jarak_90.lkip_prov_poin`, `kapasitas.target_90.prov_n`, `kapasitas.jarak_90.ikd_kab_tambahan`. **resmi** (capaian);
  jarak olah, berlabel asumsi-kebijakan (pembulatan ke atas).

**Akibat pilihan KD-4 (catatan metode IRBI 2025; rekomendasi 100 hari)**

- **T2.13** Bukti patahan skala (T1.5) dan IKS RPJMN PP 08.04 penurunan IRB 1,2% per tahun dengan baseline 1,54 (2023). Tanpa catatan
  metode, capaian 2025–2029 tidak sebanding dengan 2015–2024 dan klausa terakhir tesis tidak punya tanggal. Unit: Direktorat Pemetaan
  dan Evaluasi Risiko Bencana (KERANGKA §6). Sumber: bab-01 T1.9–T1.10; bab-03 P1. **resmi** (data dan target); simpulan
  asumsi-kebijakan.
  - *Dibantah oleh (sebagian):* LKIP 2025 sudah mengukur IKS 2025 (turun 1,03%, target 1,2%) dengan menghitung ulang 2025 memakai
    kerentanan 2021, dan menyatakan 147,95 sebagai baseline 2026–2029 (T1.31). Berkas bukti Bab 11 (P1 T1.8: "IRB 1,2% per tahun
    tidak dapat dilanjutkan ke 2025") perlu dimutakhirkan. Yang tetap benar: dataset IRBI 2025 per kab/kota di paket `irbi`
    (bilangan bulat; total = jumlah kolom bahaya) belum disertai catatan metode, dan nilai 2024 dalam dua perhitungan berbeda
    (128,52 lawan 171,95).
- **T2.17 (baru) Unit pengampu indikator menurut LKIP.** Penurunan IRB: Kedeputian Bidang Sistem dan Strategi; kapasitas minimal
  sedang: Direktorat Pemetaan dan Evaluasi Risiko Bencana; IKP peringatan dini: Direktorat Peringatan Dini; desa berketahanan
  (10,46% pada 2025): Direktorat Kesiapsiagaan. Penilaian IKD 2025 berlangsung sampai November 2025 dengan reviu provinsi dan
  verifikasi BNPB. Sumber: LKIP 2025 hlm. 15, 21, 35, 37 [`bnpb-2026-lkip2025`]. **resmi**. Dipakai untuk kolom unit pemimpin
  R-M01, R-M04, R-A10, R-A11.

**Keputusan lain yang juga milik Kepala BNPB (tidak diangkat sebagai KD)**

- **T2.14** (a) Izin prakarsa rancangan di luar Progsun (Perka 6/2014 Pasal 8 ayat (2); T2.4; berlaku sampai perubahan Perka
  6/2014 di Progsun 2026 butir 7 ditetapkan); (b) pedoman keadaan tertentu "yang
  ditetapkan oleh Kepala" (Perpres 46/2026 Pasal 3 ayat (4)); (c) penetapan "pertimbangan adanya risiko Bencana berdampak luas"
  sebagai dasar DSP (Perban 4/2020 Pasal 2 ayat (1) huruf c; Pasal 20 ayat (1)); (d) rekomendasi penyaluran Dana Bersama kepada
  Menteri Keuangan (Perpres 75/2021 Pasal 8 ayat (2)–(4)) dan penetapan prioritas kegiatan Dana Bersama (Perban 1/2026 Pasal 7
  ayat (1)); (e) inisiasi Perpres status dan tingkatan bencana yang direkomendasikan BPK kepada Kepala BNPB (T1.24). Sumber: korpus
  `perban-nomor-4-tahun-2020.json` hlm. 5 dan 16, `perban-nomor-1-tahun-2026.json` hlm. 4 (dibuka ulang 24 Okt 2026); bab-10 P1
  temuan 1, 5 [`bnpb-2014-produkhukum`, `ri-2026-perpres46`, `bnpb-2020-dsp`, `ri-2021-perpres75`, `bnpb-2026-dana-bersama`,
  `bpk-2025-ihps2-2024`]. **resmi**.

### Inferensi

- **I2.1 [Inferensi tim] Draf pita KD-1 (mitigasi; isi sama dengan Kajian 1 kecuali lingkup).** "Menetapkan kajian ini sebagai
  masukan peninjauan Renas PB 2025–2029 dan menetapkan hari ke-0 peta jalan." (a) Tetapkan dalam November 2026: reviu renkon banjir
  dan longsor dapat berjalan sebelum puncak Januari–Februari 2027 di Jawa, Bali, Nusa Tenggara, dan Papua, dan sesegera mungkin
  untuk wilayah yang memuncak Desember 2026 (36,94% luas daratan; sebagian besar Sumatera, Kalimantan, Sulawesi Barat); hari ke-100
  jatuh 9 Februari sampai 10 Maret 2027; usulan perubahan target Renas (KD-2, KD-4) tiba untuk evaluasi tahunan Renas 2026 dan
  perubahan berkala yang paling lambat 2027. (b) Tunda: hari ke-0 makin dekat atau melewati puncak Desember di Sumatera dan
  Kalimantan, sehingga reviu renkon di sana jatuh di tengah musim; sesudah 2027 perubahan Renas hanya lewat jalur karena bencana
  sampai 2028, terbatas pada program dan kegiatan, sehingga KD-2 dan KD-4 tidak lagi dapat masuk Renas periode ini. KD-3 tidak
  terikat jalur Renas (Kepka 318/2025; I2.3). Februari tidak dipakai sebagai "puncak musim" nasional karena porsinya terkecil
  (16,79% luas daratan). Catatan: "sekitar
  Januari 2027" sebagai titik dua tahun tetap tafsiran penyusun. Pemutakhiran (dari bab-11 I4.2): argumen waktu paling kuat untuk
  wilayah yang memuncak Desember (sebagian besar Sumatera dan Kalimantan, Direktorat PD Wilayah I, II, III), yang hanya punya
  sekitar 30 hari prabencana setelah hari ke-0 November; pita cukup menyebut "puncak Desember di Sumatera dan Kalimantan,
  Januari–Februari di Jawa, Bali, Nusa Tenggara, Papua". Akibat (b) tidak menutup jalur pengendalian (T2.5a) untuk lokasi.
- **I2.2 [Inferensi tim] Draf pita KD-2 tanpa angka koefisien asosiasi.** "Menyelaraskan target cakupan peringatan dini." (a) Revisi
  IKP Renstra mendekati lintasan Renas 1.c: diajukan atas evaluasi tahun ke-3 Renstra (2027), disetujui Kementerian PPN/Bappenas,
  konsisten dengan RPJMN (6,32% pada 2029); butuh definisi "tercakup" dan baseline per daerah yang belum ada. (b) Pertahankan IKP
  Renstra (naik 0,22 poin) dan nyatakan Renas 1.c (4,70 kali) sebagai target lintas K/L yang capaian hilirnya bergantung pada 11 K/L
  pemegang aksi 1.1.2.a. Faktor 0,603 dan angka 39,7% atau 0,2% tetap di Kartu 7.x berpil Asumsi kebijakan.
  Pemutakhiran (T2.15): rumusan (a) diperjelas menjadi "Revisi rumus dan target IKP Renstra: porsi penduduk terpapar yang
  tercakup, untuk lebih dari dua jenis, mendekati lintasan Renas 1.c"; akibatnya angka 2025 turun dari 6,10% ke sekitar 0,56%
  bila dihitung tertimbang untuk dua jenis yang sama, jadi target perlu ditetapkan ulang, bukan hanya dinaikkan. Rumusan (b)
  ditambah akibat: "IKP 6,32% dapat tercapai lewat sekitar 23.600 jiwa tambahan di cakupan tsunami tanpa kemajuan banjir (10.800
  dari 113,8 juta jiwa terpapar)" (I1.6). Angka 23.600 adalah pembacaan rumus berlabel Asumsi kebijakan; bila penyunting menilai
  terlalu teknis untuk pita, angka itu tinggal di Bab 10.3 dan pita cukup menulis "tanpa kemajuan cakupan banjir".
- **I2.3 [Inferensi tim] Draf pita KD-3 dengan baseline terkoreksi.** "Memilih alat ukur kapasitas daerah untuk sasaran 90% pada
  2029." (a) Indikator RPJMN KP 08.04.01 (62% pada 2023; target Renstra 67% pada 2025): jarak 28 poin, tetapi alatnya belum tertulis
  di Renstra dan 79 daerah belum menyusun IKD 2024. (b) Kelas kapasitas KRB 2022–2026 (38,0% kab/kota): jarak 52 poin atau 265 kab
  tambahan, dapat diperiksa per kab dari InaRISK. Akibat bersama: unit dan penyebut wajib ditulis; [rumusan lama "perubahan alat
  ukur ikut jalur berkala Renas 2027" dicabut, lihat pemutakhiran di bawah].
  **Pemutakhiran (menggantikan rumusan di atas; T1.32, T2.16).** "Memilih penyebut alat ukur kapasitas daerah untuk sasaran 90% pada
  2029." (a) Pertahankan Manual IKU (Kepka 318/2025): porsi provinsi berkategori IKD minimal sedang; 50% pada 2025 (19 dari 38),
  target 67% tidak tercapai; jarak 40 poin atau 16 provinsi; sederhana diukur tiap tahun, tetapi rerata provinsi dapat menutupi kab/kota
  berkapasitas rendah (diakui LKIP). (b) Ganti penyebut ke kab/kota: IKD 2025 56,2% (jarak 174 kab/kota) atau kelas kapasitas KRB
  38,0% (jarak 265 kab/kota); lebih dekat ke lokasi korban, tetapi 45 kab/kota tidak menilai IKD 2025. Baseline RPJMN 62% (2023)
  ditulis di catatan karena penyebutnya tidak tertulis di halaman yang dibuka. Akibat bersama, dua hal terpisah: (1) penyebut dan alat
  ukur tertulis di Manual IKU (Kepka BNPB 318/2025) yang ditetapkan Kepala, sehingga dapat diubah Kepala dengan perubahan Kepka
  kapan saja (LKIP 2025 hlm. 16 membuka definisinya dengan "persentase wilayah (kabupaten/kota atau provinsi)"); (2) angka target
  67–90% ikut evaluasi tahun ke-3 Renstra (Perpres 80/2025 Pasal 51; 2027) dan wajib konsisten dengan RPJMN KP 08.04.01. Indikator
  kapasitas tidak ada di Renas (Tabel 2.8 hanya 1.a–4.c), jadi KD-3 tidak memakai jalur berkala Renas.
- **I2.4 [Inferensi tim] KD-4 sebagai rekomendasi 100 hari, bukan pita.** Mengikuti KERANGKA §5 dan PEDOMAN §A2: KD-4 tampil di
  matriks rekomendasi (R-M01) dan daftar keputusan 14 hari butir (6), tidak di pita Pesan Kunci. Pita memuat tiga keputusan (batas
  B5.25: 2–3). Pemutakhiran: isi KD-4 bergeser dari "menerbitkan baseline" ke "menerbitkan catatan metode dan nilai per kab/kota
  untuk baseline 147,95 yang sudah dinyatakan di LKIP 2025, serta rekonsiliasi nilai 2024 (128,52 lawan 171,95)". Pilihan (a):
  IKS 2026–2029 dapat diperiksa pihak lain per kab/kota; (b): IKS dilaporkan dari LKIP tanpa metode yang dapat diulang, dan dataset
  IRBI 2025 tetap tidak sebanding dengan 2015–2024. Status P7 R-M01 menjadi "Sudah ada, perlu dikembangkan".
- **I2.5 [Inferensi tim] Pertentangan di KERANGKA yang harus diputus penulis atau penyunting:** (1) §6 KD-2 (b) memuat 0,2%,
  sedangkan V02 mengeluarkannya; ikuti V02. (2) §6 KD-3 (a) menulis "IKD; baseline Renstra 67%", sedangkan RPJMN menulis baseline
  62% dan Renstra tidak menyebut alat ukur; ikuti teks RPJMN. (3) §5 pesan inti (alam) lawan `tesis.mitigasi` (semua klasifikasi);
  ikuti V06. Urutan otoritas (KEPUTUSAN, lalu KERANGKA; putusan uji yang lebih baru di atas tabel lama) mendukung ketiga pilihan,
  tetapi penggantian token tesis adalah tugas pemilik registri.
- **I2.6 [Inferensi tim] Mengapa keempatnya hanya milik Kepala.** KD-1, KD-2, KD-4 menyentuh dokumen yang ditetapkan atau diterbitkan
  BNPB sendiri (Renas, Renstra, IRBI); KD-3 menyentuh Manual IKU (Kepka BNPB 318/2025) yang penyebut dan alat ukurnya dapat diubah
  Kepala dengan keputusan sendiri; hanya angka target indikator sasaran Renstra yang perlu usulan Kepala kepada Kementerian
  PPN/Bappenas lewat evaluasi tahun ke-3 Renstra. Keputusan di T2.14 juga milik Kepala, tetapi bersifat kasus per kasus atau prosedural, sehingga masuk
  register sebagai langkah (R-M02, R-M03, R-M06, R-M18), bukan pita.
- **I2.7 [Inferensi tim] Daftar keputusan 14 hari tetap satu untuk dua kajian.** KERANGKA §6 memuat enam butir; berkas ini mengusulkan
  butir ketujuh (izin prakarsa, R-M02) karena hanya memakai instrumen berlaku dan membuka KD-1 serta pedoman Perpres 46/2026. Penambahan
  ini usulan; pemilik register yang memutus. Syarat: butir ini berlaku sampai perubahan Perka 6/2014 (Progsun 2026 butir 7; T2.4)
  ditetapkan; bila perubahan itu menghapus atau mengubah izin prakarsa, butir ditulis ulang mengikuti aturan baru.

### Celah

- Laporan pemantauan dan evaluasi tahunan Renas 2025 (tenggat akhir triwulan II 2026) tidak ditemukan; penelusuran web 24 Okt 2026
  ("laporan evaluasi Rencana Nasional Penanggulangan Bencana 2025-2029 BNPB") hanya menemukan dokumen daerah. **Permintaan:** Deputi
  Bidang Sistem dan Strategi, Biro Perencanaan.
- Status rancangan perubahan Perka 6/2014 (Progsun 2026 butir 7; T2.4) dan apakah mekanisme izin prakarsa dipertahankan tidak
  diketahui; laporan realisasi triwulanan Progsun (Diktum KETIGA) tidak dibuka. Petunjuk pelaksanaan Perka 6/2014 (keanggotaan
  Tim Teknis, tata cara izin prakarsa) juga tidak dibuka. **Permintaan:** Biro Hukum, Organisasi, dan Kerja Sama.
- Lampiran IV Perpres 80/2025 (tata cara rinci perubahan Renstra-KL) tidak dibuka (air bab-10 Celah).
- Capaian IKS kapasitas 2025 **ditemukan** (LKIP 2025: 50%); capaian 2024, penyebut baseline RPJMN 62% (2023), dan IKD per
  kab/kota per tahun tetap tidak ada (LKIP hanya memuat rerata provinsi dan jumlah kab/kota per kategori; Tabel 3.2–3.3 berupa
  gambar). **Permintaan:** Direktorat Pemetaan dan Evaluasi Risiko Bencana. Teks Kepka BNPB 318/2025 (Manual IKU) tidak dibuka;
  rumus dikutip dari uraian LKIP.
- Catatan metode IRB 2025 yang dapat diulang (bobot komponen, cara agregasi kab/kota ke nasional, alasan nilai per bahaya bilangan
  bulat di dataset) tidak ditemukan; LKIP hanya menyebut sumber komponen. **Permintaan:** Kedeputian Bidang Sistem dan Strategi.
- LKIP 2025 yang dibuka bernama berkas "R1"; apakah ada versi final lain di halaman laporan kinerja BNPB tidak diperiksa lebih
  lanjut. **Penyajian:** sebut "LKIP BNPB 2025 (berkas unggahan situs BNPB, diakses 24 Okt 2026)".
- Apakah Pertemuan Dua Pihak perubahan Renstra BNPB dijadwalkan untuk 2026–2027 tidak diketahui. **Permintaan:** Biro Perencanaan.

---

## P3. Rekomendasi apa per horizon dan per unit?

### Inti

Draf register Kajian 2 berisi 36 rekomendasi: 13 baris bersama dari draf air (kajian keduanya, lingkup diperluas ke nasional) dan 23
baris khusus mitigasi; per horizon 7 keputusan dalam 14 hari pertama, 5 langkah 100 hari, 19 langkah 2026–2027, dan 5 langkah
2028–2030; 27 internal BNPB dan 9 lintas K/L. Unit BNPB yang paling banyak memimpin, termasuk sebagai unit BNPB di baris lintas K/L,
adalah Direktorat Kesiapsiagaan (8 baris), disusul Direktorat Pengembangan Strategi Penanggulangan Bencana (4) dan lima unit dengan
masing-masing 3 baris: Biro Perencanaan, Pusdatinkom, Direktorat Peringatan Dini, Direktorat Pemetaan dan Evaluasi Risiko Bencana, dan
Direktorat Sistem Penanggulangan Bencana. Dua baris ditambahkan dari Bab 12 (lokus lewat jalur pengendalian, R-M22; target perumahan
Renas 3.1.2.c lewat jalur bencana, R-M23); empat baris diubah status atau indikatornya karena LKIP 2025 (R-M01, R-M04, R-A10) dan
Bab 12 (R-M03: status P7 "Sudah ada, perlu dikembangkan"). Hampir semua langkah bersandar pada instrumen yang berlaku; tidak ada program dalam negeri berbukti kuat yang dapat
diusulkan diperluas, sehingga Destana, SPAB, dan InaTEWS masuk sebagai evaluasi dampak, dan P19 (Bangladesh, bukti kuat, luar negeri)
hanya lewat padanannya.

### Temuan bersumber

- **T3.1 Unit BNPB berlaku** (Perban 6/2025 jo. 11/2025): Sekretariat Utama (Biro Perencanaan; Biro Hukum, Organisasi, dan Kerja Sama);
  Deputi Bidang Sistem dan Strategi (Direktorat Pemetaan dan Evaluasi Risiko Bencana; Direktorat Pengembangan Strategi Penanggulangan
  Bencana; Direktorat Sistem Penanggulangan Bencana); Deputi Bidang Pencegahan (Direktorat Mitigasi Bencana; Direktorat Kesiapsiagaan;
  Direktorat Peringatan Dini); Deputi Bidang Penanganan Darurat (Direktorat Koordinasi Pengendalian Operasi Darurat; Direktorat
  Penanganan Darurat Wilayah I, II, III, dengan 38 provinsi terbagi habis); Deputi Bidang Rehabilitasi dan Rekonstruksi (tiga
  direktorat RR); Deputi Bidang Logistik dan Peralatan; Pusat Data, Informasi, dan Komunikasi Kebencanaan; Pusat Pendidikan dan
  Pelatihan Penanggulangan Bencana. Pusat Pengendalian Operasi berstatus "diganti Perban 11/2025". Sumber:
  `program-terbukti/organisasi_bnpb.csv` (dibaca 24 Okt 2026) [`bnpb-2025-otk`, `bnpb-2025-otk-ubah`]. **resmi**.
- **T3.2 Kosakata peran dan kode:** koordinasi, NSPK, monev, data/KRB, pendanaan Dana Bersama, komando darurat (KERANGKA §2 butir 14);
  K = koordinator atau penanggung jawab utama, P = pelaksana atau pendukung, R = penetap status, izin, atau norma, I = informasi dan
  peringatan dini (`lembaga/README.md` §2) [`pantaubencana-2026-paket-lembaga`]. Label: asumsi-kebijakan (kosakata) dan resmi
  (definisi paket).
- **T3.3 Instrumen daerah dan kesiapsiagaan berlaku:** renkon (Perban 2/2023: berlaku 3 tahun, reviu paling sedikit 6 bulan sekali,
  format tiga blok Pasal 7 dengan lima aspek dampak); RPKB Daerah diuji Gladi Ruang (Perban 9/2025 Pasal 27); RPBD (Perban 3/2026); SPM
  sub-urusan bencana (Juklak 4–7/2026, ditetapkan 15 September 2026); sistem peringatan dini dengan evaluasi paling sedikit sekali dalam
  4 bulan (Perban 2/2024 Pasal 29); Destana dengan Penilaian Ketangguhan paling sedikit tiap 3 tahun dan evaluasi dampak jangka panjang
  (Perban 7/2025). Sumber: air bab-10 T3.3, T3.5; bab-10 P4 temuan 8 [`bnpb-2023-renkon`, `bnpb-2024-spdb`, `bnpb-2026-juklak-spm`,
  `bnpb-2025-destana`]; kunci lama `perban2_2023.renkon_masa_berlaku_tahun`, `perban2_2023.renkon_reviu_bulan`,
  `perban2025_7.destana.penilaian_tahun`. **resmi**.
- **T3.4 Standar kebutuhan respons:** pangan setara 2.100 kkal; air bersih 7 liter pada tiga hari pertama, selanjutnya 15 liter per
  orang per hari (Perka BNPB 7/2008); penanganan pengungsi pada keadaan darurat (Perban 3/2018). Sumber: korpus
  `perka-nomor-7-tahun-2008.json` hlm. 9, 12 dan `perban-nomor-3-tahun-2018.json` hlm. 1 (dibuka 24 Okt 2026)
  [`bnpb-2008-kebutuhan-dasar`, `bnpb-2018-pengungsi`]; kunci lama `perka_2008.air_bersih_3hari_liter`, `perka_2008.air_bersih_liter_hari`.
  **resmi**.
- **T3.5 Pembiayaan berpasal (tanpa nominal, P5):** DSP diberikan atas status keadaan darurat, status keadaan tertentu, dan
  pertimbangan risiko bencana berdampak luas yang ditetapkan Kepala BNPB, dan "digunakan selama masa" ketiga keadaan itu (Perban 4/2020
  Pasal 2 ayat (1), Pasal 20 ayat (1)); DSP ditempatkan dalam anggaran BNPB untuk tanggap darurat dan dana kontinjensi bencana APBN untuk
  kesiapsiagaan prabencana (PP 22/2008 Pasal 6 ayat (1)–(2)); Dana Bersama disalurkan untuk prabencana, darurat, pascabencana, dan
  transfer risiko (Perban 1/2026 Pasal 2 ayat (2)) lewat permohonan tertulis pemda atau K/L kepada BNPB (Perpres 75/2021 Pasal 8 ayat
  (1)); dokumen persyaratan verifikasi Dana Bersama adalah KAK, RAB, reviu APIP, spesifikasi, dokumen sistem pengelolaan lingkungan dan
  sosial, dan dokumen lain (Perban 1/2026 Pasal 16 ayat (3)), tanpa analisis manfaat-biaya; kriteria usulan prabencana pemda: kesesuaian
  dengan RKPD, RPBD, dan/atau SPM (Pasal 14 ayat (4)). Sumber: korpus `perban-nomor-4-tahun-2020.json` hlm. 5, 16;
  `perban-nomor-1-tahun-2026.json` hlm. 3, 6–7 (dibuka ulang 24 Okt 2026); riset E11c, E11e [`bnpb-2020-dsp`, `ri-2008-pp22`,
  `bnpb-2026-dana-bersama`, `ri-2021-perpres75`]. Konflik sosial: pendanaan penghentian konflik dan rekonsiliasi dari DSP APBN dan BTT
  APBD (UU 7/2012 Pasal 55 ayat (1); KERANGKA prinsip 15) [`ri-2012-uu7`]. **resmi**.
- **T3.6 Posisi program dan status P7** (`kompendium_program.csv` kolom `kekuatan`, `posisi`, `status_label`, `pemimpin`,
  `peran_bnpb`, `padanan`): P01 Destana belum-terbukti, Program berjalan, wajib evaluasi dampak, Sudah ada, perlu dikembangkan,
  pemimpin Kemendes PDT, NSPK K; P02 SPAB belum-terbukti, Program berjalan, wajib evaluasi dampak, pemimpin Kemendikdasmen, NSPK P; P03
  InaTEWS sedang, Program berjalan, wajib evaluasi dampak, pemimpin BMKG, koordinasi I; P19 Bangladesh kuat, Program (bukti kuat),
  padanan relawan PB, Destana, dan sistem peringatan dini tsunami; P20 Odisha sedang, Program dengan syarat, padanan renkon BPBD dan RPKB;
  P22 kode bangunan Chile sedang, padanan pengawasan standar bangunan Renas 2.3.4.a; P23 asuransi dan pooling sedang, padanan Dana Bersama
  dan asuransi BMN; P24 hibah mitigasi FEMA sedang dengan rasio hasil model, posisi Rujukan tata kelola, padanan Dana Bersama tanpa syarat
  analisis manfaat-biaya. Sumber: dibaca 24 Okt 2026 [`pantaubencana-2026-program-terbukti`]. Label: resmi (pemetaan paket dari Renas)
  dan asumsi-kebijakan (rubrik dan kode peran).
- **T3.7 Rekomendasi BPK yang sudah ditujukan kepada entitas** (IHPS II 2024 Bab IV hlm. 181–190): Kepala BNPB mengesahkan 6 peraturan
  pelaksana dan menginisiasi Perpres status dan tingkatan bencana serta 11 peraturan lain; Kepala BNPB menginisiasi Perpres penguatan
  kelembagaan sistem peringatan dini terpadu dan menyusun rencana induk multiancaman; memutakhirkan pedoman pengkajian risiko dan
  pedoman RPB dengan seluruh jenis ancaman; Menteri Kesehatan memfinalkan rancangan Permenkes krisis kesehatan dan konsep Keputusan Menteri
  tentang Klaster Kesehatan Nasional; Kemendagri menyelesaikan perubahan Permendagri 46/2008 (OTK BPBD). Sumber: bab-10 P1 temuan 1, 3, 9;
  P2 temuan 4; P3 temuan 6; bahan subbab temuan 4 [`bpk-2025-ihps2-2024`]. **resmi**.
- **T3.8 Instrumen yang sudah masuk atau belum masuk Progsun 2026:** butir 3 rancangan Perban analisis risiko bencana pada kegiatan
  pembangunan berisiko tinggi (Direktorat Pemetaan dan Evaluasi Risiko Bencana; instrumen berlaku Perka 5/2008, teks tidak tersedia); butir
  6 perubahan Perban 4/2018 (logistik); butir 11 monev RIPB; tidak ada: pedoman Perpres 46/2026, perubahan Renas, perubahan Perban 2/2024,
  syarat manfaat-biaya Dana Bersama. Dasar BNPB menetapkan persyaratan analisis risiko: UU 24/2007 Pasal 40 ayat (3) dan Pasal 41, sanksi
  Pasal 75–76. Sumber: bab-10 P1 temuan 10–11; bab-08 P3 [`bnpb-2025-progsun`, `bnpb-2008-perka5`, `ri-2007-uu24`]. **resmi**.
- **T3.9 Yang tidak boleh dikorbankan:** InaRISK dan DIBI, Dana Bersama, renkon, SKPDB, Pusdalops daerah 395 ke 525 (Renas 1.2.1.c, PJ
  BNPB), InaTEWS, klaster dan forum PRB, INALOGPAL, call center 117. Sumber: bab-10 bahan subbab temuan 14–15 [`bnpb-2025-renstra`,
  `bnpb-2025-renas`]; kunci lama `renas.aksi_121c.pusdalops.2024`, `.2029`. **resmi** (instrumen); dipertahankan bukan berarti terbukti.
- **T3.10 Data dan Walidata:** produsen Data Bencana hanya unit kerja BNPB (Perban 1/2023 Pasal 1 angka 5–6); keluaran simulasi
  platform bukan Data Bencana (KERANGKA prinsip 19); COVID-19, Plumpang, Balongan, Morowali tanpa baris DIBI; kebakaran TPA tanpa jenis.
  Sumber: bab-10 bahan subbab temuan 2–3 [`bnpb-2023-satudata`, `pantaubencana-2026-paket-nonalam-sosial`]. **resmi**.
- **T3.11 Kebakaran TPA dan konflik, lini pertama di luar BNPB:** UU 18/2008 mewajibkan penutupan TPA pembuangan terbuka paling lama 7
  Mei 2013, tetapi sekitar 369 dari 485 TPA (76,1%) belum berhenti pada akhir 2025; lini pertama sistem tanggap darurat sampah kab/kota
  (Pasal 9 ayat (1) huruf f). Penanganan konflik dikoordinasikan Mendagri, pengungsi konflik Mensos, penghentian kekerasan Polri; BNPB
  unsur Satgas skala nasional (UU 7/2012 Pasal 49). Sumber: bab-08 P4; bab-09 PK4 [`ri-2008-uu18`, `klh-2026-open-dumping`, `ri-2012-uu7`];
  kunci lama `nonalam.tpa.belum_berhenti_porsi`, `nonalam.tpa.tenggat_tutup_uu18`. **resmi**.
- **T3.12 (pemutakhiran, dari Bab 12) Target perumahan Renas lawan satu kejadian.** Renas 3.1.2.c "Rehabilitasi dan Rekonstruksi
  Sektor Perumahan": baseline 2024 1.160, target 2029 5.802 rumah/unit/paket, PJ Kementerian PKP, kontributor BNPB, Kementerian
  ATR/BPN, Kementerian BUMN (nomenklatur Renas). DIBI mencatat 62.956 rumah rusak berat dalam rangkaian Sumatra 15 Nov–31 Des 2025
  (63.019 di kartu skenario dengan penyaring jenis musim hujan). Sumber: `program-terbukti/renas_aksi_terkait.csv` baris 3.1.2.c
  (hlm. 90; dicek ulang 24 Okt 2026); `turunan/profil_kerugian.csv` baris `ekstrem_analog_sumatra2025`; bab-12 P2 temuan 9
  [`bnpb-2025-renas`, `bnpb-2026-dibi`]; kunci bab-12 `renas.aksi_312c.target_2029`, kunci lama `dibi.sumatra2025.rumah_rusak_berat`.
  **resmi**. Target ini program rencana aksi, jadi berada dalam jangkauan jalur bencana (paling lambat 2028; T2.5).
- **T3.13 (pemutakhiran, dari Bab 12) Status P7 pedoman keadaan tertentu.** Perban 5/2018 (keadaan tertentu) berlaku dan hanya
  memuat kondisi alam dan nonalam (10 butir ancaman); Perpres 46/2026 memperluas ke faktor sosial dan pemda dalam rekonsiliasi
  pascakonflik berkapasitas fiskal rendah, dengan pedoman yang ditetapkan Kepala BNPB. Menurut definisi P7, mengubah instrumen yang
  berlaku berstatus "Sudah ada, perlu dikembangkan" (bab-12 P4 temuan 3 dan Inferensi) [`bnpb-2018-keadaan-tertentu`,
  `ri-2026-perpres46`]. **resmi** (teks); status P7 asumsi-kebijakan.
  - *Dibantah oleh:* KERANGKA §5 Bab 12 menulis "Usulan baru"; versi pertama berkas ini mengikutinya di R-M03. Diselaraskan ke Bab 12.
- **T3.14 (pemutakhiran) Ukuran adopsi rekomendasi yang sudah ada.** IKP P1 Renstra (Deputi Bidang Sistem dan Strategi)
  "persentase rekomendasi kebijakan sistem dan strategi yang diintegrasikan oleh K/L/D ke dalam rencana pembangunan/sektoral":
  baseline 82,35%, target 2027 94,12%, 2029 100% (bab-12 P5 temuan 5); capaian 2025 = 100% menurut LKIP 2025 hlm. 21
  [`bnpb-2025-renstra`, `bnpb-2026-lkip2025`]. **resmi**. Dapat menjadi indikator adopsi register kajian tanpa laporan baru (bab-12
  P5 Inferensi).
- **T3.15 (pemutakhiran, dari Bab 11) Lantai kebutuhan respons per Direktorat PD Wilayah.** Pengungsi tercatat DIBI terbanyak dalam
  jendela 30 hari, provinsi satu direktorat dijumlah serentak (2008–2025): Wilayah I 954.305 (Aceh, November 2025); Wilayah II
  468.967 (Jabodetabek, Januari 2020) atau 406.202 bila rekaman Kota Bekasi Januari 2020 yang diragukan disisihkan (gempa Lombok
  2018); Wilayah III 230.965 (gempa Ambon 2019). Dengan Perka 7/2008, lantai Wilayah I setara 381,7 ton beras dan 2,39 juta liter
  air minum per hari. Untuk Aceh, DIBI 946.889 lawan Buletin BNPB Desember 2025 356.655 (stok satu tanggal), ditulis berdampingan.
  Buffer stock logistik ditetapkan sebagai persentase pengadaan (minimal 10%, Juklak 3/2024), bukan terhadap kebutuhan skenario.
  Sumber: bab-11 P5 T5.2–T5.8, I5.2 [`bnpb-2026-dibi`, `bnpb-2008-kebutuhan-dasar`]; kunci bab-11 `respons.w1.hidromet_puncak30`,
  `respons.w2.hidromet_puncak30`, `respons.w2.hidromet_puncak30_tanpa_bekasi2020`, `respons.w3.beras_ton_hari`. Label: olah(resmi);
  jendela 30 hari asumsi-kebijakan. Model gempa platform di atas lantai hanya untuk Wilayah III (Mentawai, estimasi-model).

### Inferensi

- **I3.1 [Inferensi tim] Draf register Kajian 2 (36 baris; ID sementara).** Semua kolom adalah usulan penyusun (asumsi-kebijakan);
  dasar tiap baris bersumber pada butir yang disebut. Baris R-A berasal dari draf air bab-10 I3.1 dan di Kajian 2 berlaku untuk lingkup
  nasional; isi baris air yang khusus Jawa (jumlah kab, BBWS) diganti dengan lingkup nasional di kolom "Perluasan nasional". Kode temuan
  memakai usul I1.2. "Hanya pusat" berarti tanpa jalur daerah.

  **Baris bersama dari draf Kajian 1 (kajian keduanya), dengan perluasan nasional**

  | ID | Langkah | Horizon | Perluasan nasional di Kajian 2 | Dasar tambahan Kajian 2 |
  | --- | --- | --- | --- | --- |
  | R-A01 | Tetapkan hari ke-0 dan tugaskan unit | 14 hari | Unit Rencana Aksi Musim Hujan 2026/2027 nasional, termasuk Direktorat PD Wilayah I, II, III untuk 38 provinsi | Temuan A.2; KD-1 (T1.9–T1.10, T2.5) |
  | R-A02 | Kirim prakiraan musim, minta reviu renkon | 14 hari | BPBD provinsi dengan ZOM berawal musim November (185 ZOM) dan Desember (266 ZOM); renkon banjir dan longsor | Temuan A.2; Perban 2/2023 Pasal 21 (T1.9, T3.3) |
  | R-A03 | Minta data operasional kemarau 2026 | 14 hari | Semua BPBD provinsi; kemarau 2026 sementara: 122 kejadian kekeringan, 1.949.544 terdampak, 1.024 kejadian karhutla (DIBI s.d. 23 Okt) | Temuan A.2; KERANGKA §7 butir 24 (bab-07 P2 temuan 5) |
  | R-A04 | Inventarisasi logistik terhadap lantai musim hujan | 14 hari | Per Direktorat PD Wilayah, terhadap kebutuhan respons skenario tidak lebih ringan dari 1.692 meninggal dan hilang dan 1.043.740 mengungsi (musim 2025/2026), standar Perka 7/2008 dan Perban 3/2018; lantai pengungsi per direktorat dari Tabel 11.4 (Wilayah I 954.305; II 468.967 atau 406.202 tanpa rekaman Bekasi 2020; III 230.965) | Temuan A.2 (T1.7, T3.4, T3.15) |
  | R-A05 | Ajukan rakor peninjauan Renas ke Kemenko PMK | 14 hari | Sama; memuat KD-2 dan KD-4 (KD-3 lewat perubahan Kepka 318/2025, bukan Renas) | KD-1 (T2.5–T2.6) |
  | R-A06 | Uji rantai peringatan dini banjir dan longsor | 100 hari | Kab/kota daftar perhatian banjir dan longsor nasional (`perhatian.mitigasi.banjir.n`, `perhatian.mitigasi.longsor.n`) | Temuan C.1; Perban 2/2024 Pasal 29 (T1.21–T1.22) |
  | R-A08 | Masukkan lantai skenario ke renkon provinsi | 100 hari | Lantai per jenis dari kartu Bab 6–9; nasional 1.692 untuk musim hujan | Temuan A.2, A.3; KERANGKA §2 butir 9 |
  | R-A09 | Siapkan pemicu Kesiapan Musim Kemarau 2027 | 100 hari | Skenario tidak lebih ringan dari 7.798.763 terdampak kekeringan (2018), 6 meninggal (2023), dan 2.611.411 ha karhutla (2015); TPA terbakar serentak 2023 (16 TPA) masuk pemicu | Temuan A.2 (T1.11, T3.11) |
  | R-A10 | Selaraskan target cakupan peringatan dini | 2026–2027 | Sama (KD-2); indikator selesai ditambah: rumus IKP (rerata dua jenis atau porsi penduduk) tertulis di revisi Manual IKU dan Renstra | Temuan C.1; Perpres 80/2025; LKIP 2025 Tabel 3.4 (T2.2, T2.8–T2.10, T2.15) |
  | R-A11 | Bentuk baseline cakupan peringatan dini | 2026–2027 | Per provinsi dan kab/kota nasional, per jenis (bukan hanya tsunami dan banjir); definisi "tercakup" yang dipakai LKIP 2025 (penduduk tercakup layanan per jiwa terpapar KRB) dijadikan titik awal | Temuan C.1; KERANGKA §7 butir 33; LKIP 2025 (T1.33) |
  | R-A15 | Bentuk garis dasar evaluasi dampak Destana | 2026–2027 | Desa di kab daftar perhatian seluruh pulau; P01 belum-terbukti | Temuan C.3; Perban 7/2025 (T1.27, T3.3, T3.6) |
  | R-A17 | Serahkan lampiran data kab/kota ke Walidata | 2026–2027 | Lampiran A, C, D, G Kajian 2 dengan pernyataan produsen | Temuan C.3; Perban 1/2023 (T3.10) |
  | R-A18 | Terbitkan kalender kesiapan musiman berpemicu ENSO | 2028–2030 | Kalender bahaya bulanan per pulau (Gambar 11.2), dengan kalender tersendiri untuk Maluku yang memuncak Juni–Juli | Temuan A.2 (T1.10, T1.10a) |

  **Baris khusus mitigasi: hari ke-0 sampai 14 hari (keputusan; internal BNPB)**

  | ID | Langkah | Unit pemimpin; pendukung | Peran BNPB (kode) | Pemimpin K/L; forum | Instrumen dan pelaksana daerah | Indikator selesai | Dasar | Status P7; posisi bukti |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | R-M01 | Tugaskan catatan metode IRBI 2025 | Direktorat Pemetaan dan Evaluasi Risiko Bencana (KERANGKA §6; di bawah Kedeputian Bidang Sistem dan Strategi, pengampu IKU IRB menurut LKIP 2025); Pusdatinkom | data/KRB (K) | BNPB; internal | hanya pusat | Penugasan tertulis dalam 14 hari; paling lambat hari ke-100 terbit catatan metode yang dapat diulang untuk baseline 147,95 (bobot dan agregasi komponen), nilai per kab/kota dan provinsi 2025 di paket IRBI, dan rekonsiliasi IRB 2024 (128,52 lawan 171,95) | Temuan A.1; KD-4; RPJMN PP 08.04; LKIP 2025 hlm. 18–20 (T1.5, T1.31, T2.13) | Sudah ada, perlu dikembangkan (baseline dinyatakan di LKIP 2025; metode belum terbit); tidak berlaku |
  | R-M02 | Ajukan izin prakarsa peraturan di luar Progsun | Biro Hukum, Organisasi, dan Kerja Sama; Deputi Bidang Sistem dan Strategi, Deputi Bidang Penanganan Darurat | NSPK (R) | BNPB; internal | hanya pusat | Izin prakarsa Kepala untuk (a) perubahan Renas PB dan (b) pedoman Perpres 46/2026 Pasal 3 ayat (4); Tim Teknis terbentuk | Temuan C.2; Perka 6/2014 Pasal 8 ayat (2); Kepka 327/2025 (T2.4, T1.25); berlaku sampai perubahan Perka 6/2014 (Progsun 2026 butir 7) ditetapkan | Usulan baru; tidak berlaku |

  **100 hari**

  | ID | Langkah | Unit pemimpin; pendukung | Peran BNPB (kode) | Pemimpin K/L; forum | Instrumen dan pelaksana daerah | Indikator selesai | Dasar | Status P7; posisi bukti |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | R-M03 | Susun pedoman keadaan tertentu Perpres 46/2026 | Deputi Bidang Penanganan Darurat (Direktorat Koordinasi Pengendalian Operasi Darurat, padanan penyusun); Biro Hukum, Organisasi, dan Kerja Sama | NSPK (R), komando darurat | BNPB; rakor Kemenko PMK (Perpres 46/2026 Pasal 3 ayat (1)); Kemendagri, Kemensos (konflik); Kemenkeu (peta kapasitas fiskal) | Perubahan Perban 5/2018; pemda dalam rekonsiliasi pascakonflik berkapasitas fiskal rendah atau sangat rendah | Rancangan selesai dibahas Panitia antar Kedeputian dalam 100 hari; ditetapkan 2027; memuat faktor alam, nonalam, sosial dan kriteria rekonsiliasi | Temuan C.2; Perpres 46/2026 Pasal 3 ayat (2), (4); PMK 97/2025 (T1.25, T2.14, T3.13) | Sudah ada, perlu dikembangkan (mengubah Perban 5/2018; versi pertama "Usulan baru", dikoreksi mengikuti Bab 12); aksi wajib menurut peraturan |
  | R-M22 | Sarankan perubahan lokasi lewat pengendalian Renas | Direktorat Pengembangan Strategi Penanggulangan Bencana; Biro Perencanaan, Pusdatinkom | monev (K) | BNPB; forum K/L penanggung jawab Renas; K/L PJ aksi yang lokasinya disarankan | hanya pusat; Renja K/L 2027 | Saran perubahan lokasi untuk kab/kota terdampak berat 2025 di luar lokus (tujuh dari sepuluh kab/kota korban terbanyak Sumatra 2025) tersampaikan dalam pemantauan pra-pelaksanaan triwulan IV 2026; usulan penambahan lokus masuk jalur berkala 2027 | Temuan B.1; Renas hlm. 47–48, 123 (T1.16a, T2.5a) | Usulan baru; tidak berlaku |

  **2026–2027**

  | ID | Langkah | Unit pemimpin; pendukung | Peran BNPB (kode) | Pemimpin K/L; forum | Instrumen dan pelaksana daerah | Indikator selesai | Dasar | Status P7; posisi bukti |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | R-M04 | Putuskan penyebut alat ukur kapasitas | Biro Perencanaan; Direktorat Pemetaan dan Evaluasi Risiko Bencana (pengampu IKU kapasitas menurut LKIP 2025), Direktorat Sistem Penanggulangan Bencana | monev (K) | Kementerian PPN/Bappenas (RPJMN KP 08.04.01); Kemendagri (SPM); Pertemuan Dua Pihak | IKD provinsi (Manual IKU Kepka 318/2025), IKD kab/kota, atau kelas kapasitas KRB; BPBD | Putusan KD-3 tertulis dengan penyebut (provinsi atau kab/kota) dan perlakuan kab/kota yang tidak menilai IKD; capaian 2025 (50% provinsi) dan nilai kab/kota dilaporkan berdampingan; usulan masuk evaluasi tahun ke-3 Renstra (2027) | Temuan B.2; KD-3; Perpres 80/2025 Pasal 22–29; LKIP 2025 (T1.19–T1.20, T1.32, T2.11, T2.16) | Sudah ada, perlu dikembangkan (alat ukur tertulis di Manual IKU; penyebut belum diputus terhadap sasaran 90%); tidak berlaku |
  | R-M05 | Masukkan skenario megathrust ke renkon pesisir | Direktorat Kesiapsiagaan; Direktorat Pemetaan dan Evaluasi Risiko Bencana | NSPK (K) | BMKG (InaTEWS), Kementerian ESDM (Badan Geologi, PuSGeN); internal | Renkon tsunami (Perban 2/2023) BPBD provinsi pesisir selatan Jawa dan barat Sumatra; genangan InaRISK `Inun_*` | Renkon memuat Mw 9,1 dan 8,9 dengan lantai tercatat (Pangandaran 2006; Mentawai 2010) dan paparan KRB; korban tsunami dihitung dari genangan resmi, berlabel | Temuan A.3; Perban 2/2023 Pasal 7; renkon Jatim 2021 (T1.14–T1.15) | Sudah ada, perlu dikembangkan; aksi wajib menurut peraturan (InaTEWS P03 bukti sedang) |
  | R-M06 | Usulkan inisiasi Perpres status dan tingkatan | Deputi Bidang Sistem dan Strategi (Direktorat Sistem Penanggulangan Bencana); Biro Hukum, Organisasi, dan Kerja Sama | NSPK (R) | BNPB sebagai pemrakarsa; Kemenko PMK (rakor), Kementerian Sekretariat Negara | hanya pusat; turunannya status oleh kepala daerah | Rancangan Perpres diajukan lewat Kemenko PMK, memuat indikator UU 24/2007 Pasal 7 ayat (2) menurut tafsir MK (minimal 3 dari 5, jumlah korban wajib) dan data DIBI sebagai sumber korban | Temuan C.2, A.1; UU 24/2007 Pasal 7 ayat (3); Putusan MK 261/PUU-XXIII/2025; IHPS II 2024 (T1.6, T1.24, T3.7) | Usulan baru; aksi wajib menurut peraturan |
  | R-M08 | Rapikan pencatatan nonalam dan sosial di DIBI | Pusdatinkom; Direktorat Koordinasi Pengendalian Operasi Darurat | data/KRB (K) | BNPB; Forum Satu Data Indonesia; Kemenkes, KLH/BPLH, Kementerian ESDM sebagai pemasok data | BPBD (pelapor DIBI) | Kode jenis kebakaran TPA ada; baris kejadian besar nonalam (COVID-19, Plumpang, Balongan, Morowali) tercatat atau dirujuk; entri ganda epidemi dibersihkan; isi kode 999 diuraikan | Temuan A.3, C.3; Perban 1/2023; Juklak 7/2023 (T3.10) | Sudah ada, perlu dikembangkan; tidak berlaku |
  | R-M09 | Laporkan realisasi Renas 1.a dan 1.b tahunan | Direktorat Pengembangan Strategi Penanggulangan Bencana; Pusdatinkom | monev (K) | BNPB; rakor Kemenko PMK | hanya pusat | Evaluasi tahunan Renas 2026 memuat 1.a versi alam dan semua klasifikasi dengan penanda patahan 2024, definisi 1.b tertulis, irisan Jawa (R-A21), dan usulan target 2029 berangka untuk 1.a dan 1.b lewat jalur berkala (Tabel 12.3 baris 1); angka korban LKIP dan DIBI direkonsiliasi dengan tanggal data | Temuan A.1; Renas Tabel 2.8, §4.5; LKIP 2025 (T1.1–T1.2, T1.30, T2.5) | Sudah ada, perlu dikembangkan; tidak berlaku |
  | R-M10 | Selaraskan klaster dan dokumen ke OTK | Biro Hukum, Organisasi, dan Kerja Sama; Direktorat Koordinasi Pengendalian Operasi Darurat, Biro Perencanaan | koordinasi (K) | Koordinator enam klaster: Basarnas, Kemensos, BNPB, Kemenkes, Kemendikdasmen, Kemendagri | hanya pusat; klaster daerah | SK klaster nasional terbuka di JDIH dengan nomenklatur Perpres 90/2025; Perban 2/2024, Renstra, Perban 5/2018 menyebut unit OTK berlaku; lampiran Penyelarasan dokumen BNPB ditindaklanjuti | Temuan C.2; Perban 11/2025; bab-10 P2 (T3.1) | Sudah ada, perlu dikembangkan; tidak berlaku |
  | R-M11 | Tetapkan Perban analisis risiko pembangunan berisiko tinggi | Direktorat Pemetaan dan Evaluasi Risiko Bencana; Biro Hukum, Organisasi, dan Kerja Sama | NSPK (R) | BNPB; Kementerian ESDM, Kementerian Perindustrian, dan K/L pemberi perizinan berusaha (nomenklatur dari `lembaga.csv`) | Pelaku usaha berisiko tinggi; BPBD (pemantauan) | Perban ditetapkan dan memuat fasilitas migas dan industri (kebakaran industri) | Temuan C.3; UU 24/2007 Pasal 40 ayat (3), 41, 75–76; Progsun 2026 butir 3 (T1.28, T3.8) | Sudah ada, perlu dikembangkan; aksi wajib menurut peraturan |
  | R-M12 | Susun rencana induk peringatan dini multiancaman | Direktorat Peringatan Dini; Biro Hukum, Organisasi, dan Kerja Sama | informasi (K), NSPK | BNPB; BMKG, Kementerian PU (sistem per WS), Kementerian ESDM (Badan Geologi); rakor Kemenko PMK | BPBD (Perban 2/2024 Pasal 23, 25) | Rencana induk ditetapkan Kepala; Rancangan Perpres peringatan dini diajukan; definisi "tercakup" dimuat | Temuan C.1; IHPS II 2024 hlm. 188–189; Renstra target Rancangan Perpres 2025 (T1.22, T3.7) | Sudah ada, perlu dikembangkan (target Renstra); tidak berlaku |
  | R-M13 | Lengkapi dokumen dasar daerah kapasitas rendah | Direktorat Kesiapsiagaan; Direktorat Pemetaan dan Evaluasi Risiko Bencana | NSPK (K) | BNPB; Kemendagri (SPM) | KRB, RPBD (Perban 3/2026), RPKB (Perban 9/2025), renkon per jenis (Perban 2/2023); BPBD 148 kab kapasitas rendah berstatus Tinggi | Jumlah dari 148 kab dengan KRB mutakhir, RPBD ditetapkan, RPKB dan renkon per jenis (baseline 2027) | Temuan B.1, B.2; IHPS II 2024 (T1.17, T1.20, T3.5) | Sudah ada, perlu dikembangkan; aksi wajib menurut peraturan |
  | R-M16 | Latih komando dengan skenario lantai | Pusat Pendidikan dan Pelatihan Penanggulangan Bencana; Direktorat Kesiapsiagaan, Direktorat Koordinasi Pengendalian Operasi Darurat | NSPK (P), komando darurat | BNPB; internal | Gladi SPM (Juklak 4/2026); Gladi Ruang RPKB (Perban 9/2025 Pasal 27); BPBD provinsi | Gladi berbasis kartu skenario lantai di tiap wilayah Direktorat PD tercatat tiap tahun | Temuan A.2, A.3; KERANGKA §5 Bab 11 (T3.3) | Sudah ada, perlu dikembangkan; aksi wajib menurut peraturan |
  | R-M17 | Tarik data kerusakan R3P dan samakan instrumen | Deputi Bidang Rehabilitasi dan Rekonstruksi; Pusdatinkom | data/KRB (K) | BNPB; Kemendagri, Kementerian PKP | Jitupasna dan R3P (Perka 15/2011, Perban 5/2017); BPBD | Seri kerusakan dan kerugian R3P 2015–2024 terbuka; instrumen penilaian kerusakan rumah satu; bahan indikator Renas 2.a | Temuan C.3; Renas hlm. 28; KERANGKA §7 butir 9–10 (bab-10 bahan subbab temuan 6, 11) | Sudah ada, perlu dikembangkan; tidak berlaku |

  **2028–2030**

  | ID | Langkah | Unit pemimpin; pendukung | Peran BNPB (kode) | Pemimpin K/L; forum | Instrumen dan pelaksana daerah | Indikator selesai | Dasar | Status P7; posisi bukti |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | R-M18 | Tambahkan syarat manfaat-biaya Dana Bersama prabencana | Direktorat Pengembangan Strategi Penanggulangan Bencana; Biro Hukum, Organisasi, dan Kerja Sama | pendanaan Dana Bersama (K) | BNPB; Kemenkeu (pengelola), Kementerian PPN/Bappenas, Kemendagri, Kemenko PMK | Perubahan Perban 1/2026; pemda dan K/L pemohon | Kriteria penyaluran prabencana memuat analisis manfaat-biaya; masuk Progsun atau lewat izin prakarsa | Temuan C.3; Perban 1/2026 Pasal 14 ayat (4), 16 ayat (3); P24 (T3.5–T3.6) | Usulan baru; P24 Rujukan tata kelola (bukti sedang, rasio hasil model), bukan program terbukti |
  | R-M20 | Perbarui daftar perhatian dan lantai | Direktorat Pemetaan dan Evaluasi Risiko Bencana; Pusdatinkom | data/KRB (K) | BNPB; internal | hanya pusat; renkon BPBD sebagai pemakai | Daftar perhatian dihitung ulang dengan baseline IRBI baru (R-M01) dan DIBI 2026–2028; lantai per jenis dimutakhirkan bila kejadian baru lebih berat | Temuan B.1, A.2; KERANGKA §2 butir 8–9 (T1.18) | Usulan baru; tidak berlaku |
  | R-M21 | Sampaikan masukan peninjauan RIPB | Direktorat Pengembangan Strategi Penanggulangan Bencana; Biro Perencanaan | monev (K) | BNPB; Kemenko PMK (jalur laporan RIPB ke Presiden) | hanya pusat | Masukan tertulis memuat sasaran korban (1.a, 1.b), alat ukur kapasitas, dan baseline IRBI baru | Temuan A.1, B.2; Perpres 87/2020 Pasal 6–7; Progsun 2026 butir 11 (T2.1, T3.8) | Sudah ada, perlu dikembangkan (monev RIPB di Progsun); tidak berlaku |

  **Lintas K/L (program dan instrumen yang pemimpinnya bukan BNPB, prinsip 14)**

  | ID | Langkah | Horizon | Pemimpin K/L; forum | Peran BNPB (kode); unit | Instrumen dan pelaksana daerah | Indikator selesai | Dasar | Status P7; posisi bukti |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | R-M07 | Tetapkan norma pengait KLB dan darurat bencana | 2026–2027 | Kementerian Kesehatan; rakor Kemenko PMK | NSPK (P); Direktorat Sistem Penanggulangan Bencana, Deputi Bidang Penanganan Darurat | Permenkes krisis kesehatan (rekomendasi BPK); dinas kesehatan, BPBD | Pasal pengait status KLB atau wabah dengan status keadaan darurat bencana tertulis | Temuan C.2; UU 17/2023; Perpres 17/2018 Pasal 2; IHPS II 2024 hlm. 183 (T1.25, T3.7) | Usulan baru; sel epidemi tanpa program |
  | R-M14 | Selesaikan perubahan Permendagri OTK BPBD | 2026–2027 | Kementerian Dalam Negeri | koordinasi (P); Direktorat Sistem Penanggulangan Bencana | Permendagri 46/2008; pemda | Permendagri pengganti terbit; data kelembagaan BPBD mutakhir | Temuan B.2; IHPS II 2024 hlm. 182–183 (T1.20, T3.7) | Sudah ada, perlu dikembangkan; tidak berlaku |
  | R-M15 | Masukkan TPA pembuangan terbuka ke kesiapan kemarau | 2026–2027 | KLH/BPLH; pemda kab/kota | data/KRB (P), komando darurat bila status ditetapkan; Direktorat Kesiapsiagaan | Sistem tanggap darurat sampah (UU 18/2008 Pasal 9); renkon kemarau BPBD | Daftar TPA pembuangan terbuka per kab/kota diterima dan kab dengan TPA terbakar 2023 dan 2026 masuk pemicu R-A09 | Temuan A.2, C.3; UU 18/2008 (T3.11) | Usulan baru; sel kebakaran TPA tanpa program |
  | R-M19 | Jalankan agenda evaluasi dampak program berjalan | 2028–2030 | BMKG (InaTEWS hilir), Kemendikdasmen (SPAB), Kemendes PDT (Destana; lewat R-A15) | monev (P); Direktorat Mitigasi Bencana | Protokol evaluasi; desa dan sekolah pembanding | Laporan evaluasi dampak InaTEWS hilir (waktu tiba dan penerimaan warga), SPAB, dan Dana Tunggu Hunian Sumatra 2025 terbit | Temuan C.3; Perban 7/2025; Juklak 15/2025 (T1.26–T1.27, T3.6) | Sudah ada, perlu dikembangkan; Program berjalan, wajib evaluasi dampak (P02, P03 belum-terbukti atau sedang) |
  | R-M23 | Tinjau target perumahan Renas 3.1.2.c | 2026–2027 (batas jalur bencana 2028) | Kementerian PKP (PJ 3.1.2.c); forum K/L penanggung jawab Renas, rakor Kemenko PMK | monev (P), kontributor 3.1.2.c; Deputi Bidang Rehabilitasi dan Rekonstruksi | Perubahan rencana aksi Renas lewat jalur bencana; R3P Aceh, Sumatera Utara, Sumatera Barat; pemda | Usulan peninjauan target 5.802 unit (2029) termuat di evaluasi tahunan Renas 2026 atau paruh waktu 2027, dengan pembanding 62.956 rumah rusak berat Sumatra 2025 dan R3P yang ditetapkan | Temuan A.1, C.3; Renas hlm. 90, 124–125 (T1.3, T2.5, T3.12) | Usulan baru; tidak berlaku |

  Hitungan draf (asumsi-kebijakan, belum dikunci; dimutakhirkan): 14 hari 7 (R-A01–A05, R-M01, M02); 100 hari 5 (R-A06, A08, A09,
  R-M03, M22); 2026–2027 19 (R-A10, A11, A15, A17, R-M04–M17, M23); 2028–2030 5 (R-A18, R-M18–M21); jumlah 36. Kelompok B5.13:
  internal BNPB 27 (R-A01–A06, A08, A11, A17, A18; R-M01, M02, M03, M05, M06, M08, M09, M10, M11, M12, M13, M16, M17, M18, M20, M21,
  M22) dan lintas K/L 9 (R-A09, A10, A15; R-M04, M07, M14, M15, M19, M23). R-A09 dan R-A10 masuk lintas K/L mengikuti klasifikasi
  draf air; R-M04 masuk lintas K/L karena alat ukur indikator RPJMN memerlukan Kementerian PPN/Bappenas; R-M22 internal karena
  pengendalian Renas dijalankan BNPB sebagai penyusun Renas, R-M23 lintas K/L karena PJ aksi 3.1.2.c Kementerian PKP.

- **I3.2 [Inferensi tim] Unit terbanyak** (unit pemimpin di draf air untuk baris R-A; unit BNPB di kolom peran untuk baris lintas K/L):
  Direktorat Kesiapsiagaan 8 (R-A02, A08, A09, A15, A18; R-M05, M13, M15); Biro Perencanaan 3 (R-A05, A10, M04); Pusdatinkom 3 (R-A03,
  A17, M08); Direktorat Peringatan Dini 3 (R-A06, A11, M12); Direktorat Pemetaan dan Evaluasi Risiko Bencana 3 (R-M01, M11, M20; pendukung
  utama M04 dan M05); Direktorat Pengembangan Strategi Penanggulangan Bencana 4 (R-M09, M18, M21, M22); Direktorat Sistem Penanggulangan Bencana
  3 (R-M06, M07, M14); Biro Hukum, Organisasi, dan Kerja Sama 2 (R-M02, M10; pendukung M03, M06, M11, M18); masing-masing 1: Kepala BNPB
  (R-A01), Deputi Bidang Logistik dan Peralatan (R-A04), Deputi Bidang Penanganan Darurat (R-M03), Pusdiklat PB (R-M16), Direktorat
  Mitigasi Bencana (R-M19); Deputi Bidang RR 2 (R-M17, M23). Beban 14 hari sampai 100 hari jatuh pada Deputi Bidang Pencegahan dan Deputi Bidang Penanganan Darurat bersamaan dengan puncak musim
  hujan; ini argumen penugasan unit di R-A01.
- **I3.3 [Inferensi tim] Tiga rekomendasi teratas untuk sketsa langkah dan "Risiko pelaksanaan" (B5.13):** R-A02 nasional (reviu renkon
  sebelum puncak; risiko: BPK menemukan pemda tanpa renkon per jenis, dan 63 daerah belum tuntas SPM, jadi yang direviu bisa tidak ada);
  R-M01 (catatan metode IRBI 2025; risiko: LKIP 2025 sudah menyatakan baseline 147,95, sehingga catatan metode dapat dianggap tidak
  perlu, padahal nilai per kab/kota di paket IRBI dan nilai 2024 belum terekonsiliasi); R-M03 (pedoman Perpres 46/2026; risiko: tidak ada di Progsun 2026, sehingga bergantung pada izin prakarsa R-M02 dan rakor menko).
- **I3.4 [Inferensi tim] Relasi antarbutir:** R-A01 membuka A02–A04, A06, A08, M01; R-M02 membuka M03 dan perubahan Renas; R-A05 membuka
  A10, M04, M09; R-M01 membuka M20 dan M21; R-A11 butuh A06 dan M12 (definisi "tercakup"); R-M06 butuh M08 dan M09 (mutu baris korban
  DIBI); R-M13 butuh M04 (alat ukur kapasitas); R-M15 membuka R-A09; R-M18 butuh M02 atau Progsun 2027; R-M19 butuh A15; R-M22 butuh
  R-A01 (hari ke-0 sebelum triwulan IV 2026 berakhir) dan membuka perubahan lokus di R-A05; R-M23 butuh R-M09 (evaluasi tahunan 2026)
  dan R-M17 (data kerusakan R3P).
- **I3.5 [Inferensi tim] Hanya posisi kuat dan sedang yang diusulkan diperluas sebagai program (P6):** tidak ada program dalam negeri
  berbukti kuat; InaTEWS (sedang) masuk sebagai instrumen yang dipertahankan dan dievaluasi hilirnya (R-M05, R-M19), PAMSIMAS tetap di
  register air. P19 dan P20 hanya lewat padanan (relawan PB, Destana, renkon, RPKB). Naskah tidak menyebut Destana, SPAB, InaTEWS, atau
  program pemulihan "terbukti".
- **I3.6 [Inferensi tim] Kisi prioritas (B5.28) sementara.** Kunci: dampak rekomendasi = kelas tertinggi di antara jenis yang disasar
  (kelas 1–3 sedang, 4 tinggi, 5 sangat tinggi), memakai kelas bab-05 PK4 (asumsi-kebijakan). Hasil: 32 baris "sangat tinggi" karena
  menyasar banjir, gempa, epidemi, atau konflik (kelas 5) atau lintas jenis (termasuk R-M22 dan R-M23, banjir dan longsor); 4 baris "sedang" (R-A03, R-A09: kekeringan kelas 1,
  karhutla kelas 2 menurut DIBI; R-M11: kebakaran industri kelas 2; R-M15: kebakaran TPA, kependudukan tidak relevan); 0 baris "tinggi".
  Kisi jenuh: kunci B5.28 tidak membedakan baris lintas jenis. Karhutla naik ke kelas 5 bila kematian asap model dipakai (Koplitz), dan
  itu tidak boleh dilakukan di kisi. Usul: penyunting memutus apakah kunci diterapkan pada jenis yang disasar langsung saja.

### Celah

- Register bersama (ID `R-nn` lintas dua kajian) belum ada; ID R-A dan R-M sementara. **Penyajian:** penulis memakai ID sementara hanya di
  draf; token register diisi saat register dibangun.
- Berkas bukti Bab 11 dan Bab 12 sudah ada (pemutakhiran): R-A04 dan R-M16 kini merujuk lantai Tabel 11.4 (T3.15), R-M18 merujuk Tabel
  12.4 baris 6. Stok logistik per gudang BNPB dan BPBD terhadap lantai tetap tidak ada (bab-11 P5 Celah). **Permintaan:** Deputi Bidang
  Logistik dan Peralatan (keputusan 14 hari butir 4).
- Draf Tabel 12.3 (yang berubah dari Renas) dan Tabel 12.4 (instrumen) di berkas bukti Bab 12 belum memuat ID register; pemetaan:
  baris 1 ke R-M09, 2 ke R-A10, 3 ke R-M04, 4 ke R-M01, 5 ke R-M22, 6 ke R-M23, 7 ke R-M10, 8 ke R-M11, 9 ke R-M06, 10 ke R-M18, 11 ke
  R-M03 (usul penyusun, asumsi-kebijakan).
- Status RPBD, RPKB, renkon, dan SPM per kab/kota tidak ada (bab-10 P4 Celah); indikator R-M13 diukur dari nol sampai data diterima.
  **Permintaan:** Direktorat Kesiapsiagaan, Direktorat Sistem Penanggulangan Bencana, Kemendagri.
- Unit BNPB padanan untuk keadaan tertentu dan pembinaan klaster sesudah Perban 11/2025 tidak tertulis di paket; "Direktorat Koordinasi
  Pengendalian Operasi Darurat" di R-M03, R-M08, R-M10 adalah padanan penyusun.
- Status P7 tiap baris belum dicocokkan dengan tabel silang lima dokumen (RIPB, Renas, Renstra, RPJMN, Progsun; KERANGKA §2 butir 13);
  tabel itu milik Bab 12 dan Lampiran I.
- Teks SK klaster 308/2024 dan 173 tidak dibuka (KERANGKA §7 butir 30); isi Perka 5/2008 tidak tersedia.

---

## Bahan subbab 13.5 dan 13.6 (yang tidak direkomendasikan; yang belum diketahui)

### Inti

Sepuluh hal sengaja tidak direkomendasikan, masing-masing dengan alasan tertulis: empat dari KERANGKA §5 Bab 13 (indeks risiko
gabungan buatan sendiri, DSP untuk mitigasi prabencana, angka korban titik dari model gempa platform, proyeksi korban konflik) dan enam
dari berkas bukti bab lain (perluasan Destana dan SPAB sebagai program terbukti, angka korban tsunami platform, efek koefisien R = 8 di
Pesan Kunci, pita model La Niña sebagai skenario terburuk 2026/2027, capaian IRB sebagai bukti penurunan korban, dan kematian asap model
sebagai angka tercatat). Yang belum diketahui terkumpul pada skenario korban geologi (genangan, bangunan, renkon megathrust), kerugian
rupiah (kecuali angka 2025 tanpa Senyar di LKIP 2025), baseline peringatan dini per daerah, IKD per kab/kota per tahun, catatan metode
IRB 2025 yang dapat diulang, stok logistik terhadap lantai per direktorat, dan pencatatan nonalam dan sosial.

### Temuan bersumber

- **T4.1 Indeks risiko gabungan buatan sendiri:** IRBI dan DIBI tidak saling memvalidasi; peringkat IRBI 2025 lawan kejadian DIBI per kab
  −0,38, untuk banjir −0,313 (bab-03 P1; bab-05 PK1); IRBI tidak dipakai memeringkat karena nilai kembar dan skala 2025 bilangan bulat;
  kab/kota masuk daftar perhatian lewat aturan syarat (KERANGKA §1 P08, D10; §2 butir 7–8). Aturan syarat sendiri masih terlalu lebar
  (426 dari 514 kab), sehingga perbaikannya adalah aturan, bukan indeks baru (bab-03 P1 Inferensi). Kunci lama
  `irbi_dibi.nasional.spearman.total_kejadian`, `irbi_dibi.nasional.spearman.banjir`, `perhatian.mitigasi.kab_unik`.
  **asumsi-kebijakan** (putusan penyusun berdasar sifat data resmi).
- **T4.2 DSP untuk mitigasi prabencana:** DSP terikat pada status keadaan darurat, status keadaan tertentu, dan risiko berdampak luas yang
  ditetapkan Kepala, dan dipakai selama masa itu (Perban 4/2020 Pasal 2 ayat (1), Pasal 20 ayat (1)); PP 22/2008 Pasal 6 ayat (2)
  menempatkan DSP untuk tanggap darurat, sedangkan Pasal 6 ayat (1) menyediakan dana kontinjensi bencana untuk kesiapsiagaan prabencana;
  jendela prabencana tersedia di Dana Bersama (Perban 1/2026 Pasal 2 ayat (2); Perpres 75/2021 Pasal 6 ayat (2), 8). Huruf c Pasal 2
  ayat (1) membuka penetapan kasus per kasus oleh Kepala, bukan saluran program mitigasi. Sumber: T3.5 [`bnpb-2020-dsp`, `ri-2008-pp22`,
  `bnpb-2026-dana-bersama`, `ri-2021-perpres75`]. **resmi**.
- **T4.3 Angka korban titik dari model gempa platform:** galat validasi silang mesin korban ±5,3 kali (faktor LOO 5,341); model memberi
  555 korban untuk Yogyakarta 2006, padahal tercatat 5.749 (USGS); pita korban Jawa Mmaks 10.720–136.032 lebih dari satu orde; GMPE belum
  diuji; KERANGKA §2 butir 9 melarang pita lebih dari satu orde di judul, kartu angka, atau RE. Sumber: bab-06 P2; bab-03 P3; KERANGKA §7
  butir 6 [`pantaubencana-2026-skenario-geologi`, `usgs-usp000ej1c`]; kunci lama `geologi.mesin.faktor_loo`,
  `geologi.mesin.yogya2006_model`, `usgs.yogya2006.meninggal`, `geologi.jawa_mmaks.korban_analog`. **estimasi-model** (keluaran) dan
  terverifikasi (angka tercatat).
- **T4.4 Proyeksi korban konflik:** nonalam dan sosial memakai kartu analog berangka tanpa perkalian dan tanpa proyeksi per wilayah
  (KERANGKA §2 butir 9); kemungkinan berulang 2026–2030 tidak dinilai (bab-09 PK3); seri konflik DIBI diragukan dan tidak dipakai sebagai
  tren (bab-10 bahan subbab temuan 2); Podes 2024 menghitung semua jenis perkelahian massal, bukan hanya antarkelompok (bab-09 PK2).
  Sumber: [`icg-2002-maluku`, `bps-2024-podes`, `pantaubencana-2026-paket-nonalam-sosial`]. **asumsi-kebijakan** (sikap metode) dan resmi
  (data).
- **T4.5 Perluasan Destana dan SPAB sebagai program terbukti:** keduanya `belum-terbukti` meski berjalan lebih dari 10 tahun; posisi
  "Program berjalan, wajib evaluasi dampak" (T1.27); yang direkomendasikan garis dasar evaluasi (R-A15, R-M19). **asumsi-kebijakan**
  (rubrik paket).
- **T4.6 Angka korban tsunami dari platform:** tidak dikutip sampai genangan InaRISK `Inun_*` × penduduk dipakai (KERANGKA §2 butir 9; §7
  butir 3); proksi pesisir rendah melewatkan 18 kab pada skenario Jawa M8,5 (bab-06 P2; KERANGKA §5 Bab 3). **estimasi-model** (proksi).
- **T4.7 Efek koefisien asosiasi R = 8 di tesis, Pesan Kunci, pita, atau judul:** rasio lintas negara, bukan efek kausal; tidak ada uji
  kausal Indonesia (bab-07 Celah; KERANGKA §2 butir 10; V02). **asumsi-kebijakan**.
- **T4.8 Pita model La Niña sebagai skenario terburuk 2026/2027, atau klaim musim 2026/2027 "lebih ringan":** batas atas pita (1.204) di
  bawah lantai 1.692; tiga musim El Niño kuat adalah ekspektasi, bukan batas atas (T1.8; bab-07 P2 Inferensi). **resmi** (tercatat) dan
  estimasi-model (pita).
- **T4.9 Capaian IRB sebagai bukti penurunan korban, atau perbandingan IRBI 2025 dengan 2015–2024:** IRB turun serempak di sembilan bahaya
  sementara korban hidrometeorologi naik (T1.4); skala 2025 patah (T1.5), dan LKIP 2025 sendiri mengakui perbedaan signifikan antara
  IRB 2013–2024 dan IRB 2025; IRB 2025 tetap dilaporkan turun 1,03% pada tahun dengan korban tertinggi sejak 2018 (T1.31). **resmi**
  (data); asumsi-kebijakan (simpulan).
- **T4.10 Kematian asap model sebagai angka tercatat:** 91.600 (24.000–159.200) adalah estimasi model peneliti; DIBI mencatat 24 meninggal
  karhutla 2015 di 33 kab (sekitar 3.800 kali), atau 12 di provinsi asap (sekitar 7.600 kali; bab-07) (T1.11). Ditulis berdampingan dengan label berbeda; tidak di judul. **estimasi-model** (terverifikasi sebagai publikasi).
- **T4.11 Yang belum diketahui, status setelah diperiksa** (KERANGKA §7, baris Kajian 2 atau keduanya):

  | Butir §7 | Celah | Status 24 Okt 2026 | Lembaga pemegang data |
  | --- | --- | --- | --- |
  | 1 | Skenario korban resmi PuSGeN atau BMKG; renkon megathrust nasional | Tetap; PuSGeN 2024 dibuka dan memuat bahaya, bukan korban; satu contoh renkon tsunami Jawa Timur 2021 di lampiran Perban 2/2023 | PuSGeN, BMKG, BPBD provinsi pesisir |
  | 2 | Mmaks Peta Gempa 2024 | **Tertutup** (riset E1) | – |
  | 3 | Genangan tsunami InaRISK `Inun_*` belum dipakai | Tetap | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
  | 4 | Mmaks sesar darat | **Tertutup** (Lembang 6,6; Cimandiri 6,3–6,8; Opak 6,9); skenario sesar darat belum dijalankan | – |
  | 5 | Likuefaksi tanpa skenario | Tetap (kartu analog Sulteng 2018; paparan KRB 86.689.779) | Badan Geologi |
  | 6 | Model korban gempa galat ±5,3 kali; GMPE belum diuji | Tetap | – (keterbatasan model) |
  | 7 | Luka-luka | Tetap (tidak dipakai) | – |
  | 8 | Data bangunan hanya Kalimantan Tengah | Tetap | Kementerian PU, BPS |
  | 9 | PDNA dan R3P final; seri CKAN R3P | Sebagian: R3P Cianjur terbuka; Lombok dan Sulteng tidak; seri CKAN nilai kerusakan dan kerugian proposal pemda 2017–2024 ditarik Bab 12 (310 baris, Rp109,34 T) [`bnpb-2026-ckan-kerusakan-kerugian`], tetapi tidak lengkap dan berulang, belum masuk paket `dibi`; R3P Senyar (Sumatra 2025) masih disusun menurut LKIP 2025 | Deputi Bidang RR; `pipa-data` |
  | 10 | Kerugian ekonomi langsung Renas 2.a | **Sebagian tertutup:** LKIP 2025 memuat 0,217% PDB (Rp51,3 T) untuk 2025 tanpa Senyar (T1.34); metode, seri tahunan, dan versi dengan Senyar tetap tidak ada | Deputi Bidang RR, Kementerian PPN/Bappenas |
  | 11 | DALY | Tetap (tidak dihitung) | – |
  | 12 | IRBI 2025 skala patah | Sebagian: LKIP 2025 menyatakan baseline 147,95 dan penurunan 2025 1,03% (T1.31); catatan metode yang dapat diulang, nilai per kab/kota, dan rekonsiliasi IRB 2024 (128,52 lawan 171,95) tetap tidak ada; masuk KD-4 (R-M01) | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
  | 13 | Kapasitas dua ukuran | Berubah menjadi empat angka dua penyebut: RPJMN 62% (2023), LKIP 50% provinsi (2025), IKD 56,2% kab/kota (2025), KRB 38,0% kab/kota; alat ukur IKU tertulis (Kepka 318/2025); masuk KD-3 (R-M04) | Direktorat Pemetaan dan Evaluasi Risiko Bencana, Kementerian PPN/Bappenas |
  | 14 | DIBI berpatahan; kejadian nonalam besar tanpa baris; TPA tanpa jenis | Tetap; masuk R-M08 | Pusdatinkom |
  | 15 | Rekaman Kota Bekasi Januari 2020 | Tetap (uji kepekaan) | BPBD Kota Bekasi |
  | 23 | Luas genangan rob | Tetap | BIG, BBWS |
  | 24 | Data operasional kekeringan dan kemarau | Tetap; masuk R-A03 | BPBD provinsi, Kementan |
  | 25 | Penduduk BPS per kab | Tetap; penyebut nasional BPS 2026 tersedia | BPS |
  | 26 | Beban kesehatan asap karhutla | **Tertutup** (Koplitz dkk. 2016 dibuka; riset E15) | – |
  | 27 | Rezim keselamatan kebakaran industri | **Tertutup** (riset E12) | – |
  | 28 | Skenario pandemi resmi; kerugian rupiah nonalam dan sosial | Tetap | Kemenkes, Kemenko PMK |
  | 29 | Teks Perpres 87/2020, 75/2021, 12/2025, PP 21/2008, PP 22/2008 | **Tertutup** (riset E11); tidak disimpan di korpus lokal | – |
  | 30 | Teks Kepka 308/2024 dan 173 | Tetap; masuk R-M10 | Biro Hukum, Organisasi, dan Kerja Sama |
  | 31 | Isi temuan BPK; rasio anggaran PB terhadap APBD | Sebagian: IHPS II 2024 dibaca (30 objek); LHP per entitas dan rasio anggaran tidak | BPK, Kemendagri |
  | 32 | Perpres status dan tingkatan bencana | Dipastikan belum ada menurut BPK, pertimbangan MK, dan keterangan Pemerintah; JDIH Setneg tetap tidak dapat dicari | Kementerian Sekretariat Negara |
  | 33 | Baseline Renas 1.c per daerah | Tetap untuk per daerah; tingkat nasional per jenis (tsunami, banjir) tersedia di LKIP 2025 (T1.33); masuk R-A11 | Direktorat Peringatan Dini |
  | baru (Bab 11) | Stok logistik per gudang terhadap lantai per Direktorat PD Wilayah; stok pengungsi harian | Tetap (bab-11 P5 Celah) | Deputi Bidang Logistik dan Peralatan, Pusdatinkom |
  | baru (Bab 12) | Realisasi Dana Bersama, BTT per daerah, Data Pembiayaan PB; teks Juklak 5/2024 (stimulan rumah) | Tetap (bab-12 P3 Celah) | Direktorat Pengembangan Strategi PB, BPDLH, Kemendagri, Deputi Bidang RR |
  | baru (LKIP) | Selisih korban 2025 LKIP lawan DIBI; Lampiran 10 LKIP berupa gambar; teks Kepka 318/2025 | Tetap | Pusdatinkom, Biro Perencanaan |
  | 35 | Awal musim per ZOM ke kab/kota | Tetap; hanya jumlah ZOM nasional | BMKG |
  | 36 | Nomenklatur K/L kompendium ke `lembaga.csv` | **Tertutup**: kolom `kode_lembaga` terisi untuk 25 dari 25 program | – |

  Sumber: berkas bukti mitigasi bab-01 sampai bab-12 bagian Celah; riset E §1, §3–4; `kompendium_program.csv` (dibaca 24 Okt 2026);
  LKIP BNPB 2025 [`bnpb-2026-lkip2025`].
  Label: resmi (status dokumen) dan asumsi-kebijakan (penilaian status).

### Inferensi

- **I4.1 [Inferensi tim] Bentuk subbab 13.5:** daftar sejajar sepuluh butir, tiap butir satu kalimat alasan dengan rujukan; tanpa nada
  menolak usulan pihak lain. Butir T4.8 dan T4.9 dirumuskan "kajian tidak menyimpulkan", bukan "terbukti tidak". Butir T4.5 dirumuskan
  "belum ditemukan bukti dampak", bukan "tidak bermanfaat" (KERANGKA §2 butir 12).
- **I4.2 [Inferensi tim] Bentuk subbab 13.6:** tabel T4.11 diringkas menjadi kelompok yang sudah punya rekomendasi (R-A03, R-A11, R-M01,
  R-M04, R-M05, R-M08, R-M10, R-M17) dan kelompok yang belum punya pemilik di BNPB (data bangunan, genangan rob, penduduk BPS per kab,
  skenario pandemi resmi), sehingga yang belum diketahui berujung pada tindakan. Butir yang tertutup (2, 4, 26, 27, 29, 36) tidak
  ditampilkan dan dirujuk ke Lampiran F.

### Celah

- Daftar 13.5 hanya memuat putusan yang tertulis di KERANGKA dan berkas bukti; usulan lain yang mungkin diajukan pembaca (misalnya
  relokasi permukiman, asuransi parametrik nasional) tidak dibahas di bahan dan tidak boleh ditambahkan penulis tanpa sumber.

---

## Koreksi untuk KERANGKA dan paket data (dibawa ke pemiliknya; berkas ini tidak menyunting berkas lain)

| Tertulis | Temuan | Pemilik |
| --- | --- | --- |
| `data/angka.json` `tesis.mitigasi`: "dalam kejadian bencana" dengan token `dibi.nasional.meninggal.2025` dan `dibi.nasional.hilang.2025` (jalur `klasifikasi=semua`: 2.030 dan 246) | KERANGKA §1.2 V06 menetapkan alam: 1.735 dan 221. Usul token: `dibi.alam.meninggal.2025` (bab-01) dan `dibi.alam.hilang.2025` (baru, berkas ini); teks "akibat bencana alam" | pemilik registri (`pipa-data`) |
| Inti `naskah/mitigasi/bukti/bab-01.md` PK1 memakai 2.030 dan 246 | Sama dengan baris di atas; isi bab-01 T1.2 sudah memuat seri alam | penyusun berkas bukti Bab 1 |
| KERANGKA §6 KD-2 (b): "manfaat korban ... sekitar 0,2%" | Bertentangan dengan V02 di §1.2 KERANGKA yang sama | pemilik KERANGKA |
| KERANGKA §6 KD-3 (a): "IKD (Perka BNPB 3/2012; baseline Renstra 67%)" | Baseline resmi 62% (2023, RPJMN); 67% target 2025; Renstra tidak menyebut alat ukur (bab-05 §0.1 butir 1) | pemilik KERANGKA |
| Kunci air `renstra.iks_kapasitas_minimal_sedang.awal` (67) | Nama "awal" dapat terbaca sebagai baseline; catatan entri perlu menyebut "target 2025 yang dipakai Renstra sebagai titik awal" | pemilik registri |
| KERANGKA §8 baris terakhir: Perpres status "butir tidak ditulis sebagai kesenjangan" bila JDIH Setneg tidak terbuka | Tiga sumber resmi menyatakan belum ada (bab-10 P1 temuan 1) | pemilik KERANGKA |
| KERANGKA §6 keputusan 14 hari: enam butir | Usul butir (7): izin prakarsa di luar Progsun (Perka 6/2014 Pasal 8 ayat (2); R-M02), berlaku sampai perubahan Perka 6/2014 yang dijadwalkan di Progsun 2026 butir 7 ditetapkan | pemilik register |
| Kunci kembar `dibi.nasional.meninggal_alam.2025` (bab-04) dan `dibi.alam.meninggal.2025` (bab-01), keduanya 1.735 | Pertahankan `dibi.alam.meninggal.2025` (pola `dibi.alam.*`); kunci bab-04 dijadikan alias | pemilik registri |
| Kunci kembar `pantau-2026-program-terbukti` (bab-08) dan `pantaubencana-2026-program-terbukti` (bab-06, bab-10) di pustaka | Satu sumber; pertahankan yang kedua | pemilik pustaka |
| **Pemutakhiran 24 Okt 2026:** `tesis.mitigasi` klausa "sampai baseline IRBI 2025 skala baru diterbitkan" | LKIP BNPB 2025 sudah menyatakan baseline 147,95 untuk 2026–2029 (T1.31); usul "sampai catatan metode IRBI 2025 diterbitkan" agar klausa tetap bertanggal pada KD-4 | pemilik registri; pemilik KERANGKA §5 pesan inti |
| KERANGKA §6 KD-3 dan §7 butir 13: "kapasitas dua ukuran" (62/67% lawan 38%) | Empat angka, dua penyebut: RPJMN 62% (2023), LKIP 50% provinsi (2025, target 67%), IKD 56,2% kab/kota (2025), KRB 38,0%; alat ukur IKU tertulis di Kepka 318/2025 (T1.32) | pemilik KERANGKA; penyusun berkas bukti Bab 5 (PK3 Celah tertutup sebagian) |
| KERANGKA §6 KD-2 dan berkas bukti bab-10 P3: "tidak satu pun mendefinisikan cara menghitung tercakup" | IKP Renstra = rerata sederhana tsunami 12,19% dan banjir 0,01% (LKIP 2025 Tabel 3.4; T1.33); hanya Renas 1.c yang tanpa rumus tertulis | pemilik KERANGKA; penyusun berkas bukti Bab 10 |
| KERANGKA §6 KD-4; berkas bukti bab-01 T1.9, bab-03 P1 ("rerata 147,95 tidak pernah diterbitkan BNPB"); bab-11 P1 T1.8 ("IRB 1,2% tidak dapat dilanjutkan ke 2025") | LKIP 2025 menyatakan 147,95 sebagai baseline dan mengukur penurunan 2025 = 1,03% (target 1,2%); IRB 2024 = 171,95 di LKIP lawan 128,52 di seri IRBI, ditulis berdampingan (T1.31) | pemilik KERANGKA; penyusun berkas bukti Bab 1, 3, 11; `pipa-data` (`irbi/README.md` §4) |
| KERANGKA §7 butir 10 dan berkas bukti bab-12 P3 Celah: kerugian ekonomi langsung Renas 2.a "tidak tersedia" | LKIP 2025: 0,217% PDB (Rp51,3 T) untuk 2025 tanpa Senyar (T1.34) | pemilik KERANGKA; penyusun berkas bukti Bab 12 |
| Kunci korban 2025: hanya DIBI tarik 23 Okt 2026 | Tambah angka LKIP 2025 (1.666 meninggal, 214 hilang) sebagai versi resmi lain dengan tanggal data (T1.30) | pemilik registri; penyusun berkas bukti Bab 1 dan 4 |
| Berkas bukti bab-11 Inti P1 dan Tabel 11.1: kapasitas "67% lawan 38%"; 1.a hanya versi semua klasifikasi (0,79; 3,6 kali) | Baseline 62% dan capaian 2025 50% (LKIP) ditulis; 1.a versi alam (0,68; 3,1 kali) ditulis berdampingan supaya kisi Bab 13 identik dengan Bab 11 | penyusun berkas bukti Bab 11 |
| `bab-11.md` menyebut `bab-11.angka.json` (64 kunci) dan `bab-11.pustaka.json` (52 entri), tetapi kedua berkas tidak ada (dicek 24 Okt 2026) | Kunci bab-11 yang dirujuk Bab 13 belum dapat dipanggil registri | penyusun berkas bukti Bab 11 |
| KERANGKA §6 keputusan 14 hari | Usul: saran perubahan lokasi lewat pemantauan pra-pelaksanaan triwulan IV 2026 (R-M22) masuk daftar 100 hari, bukan 14 hari, agar daftar keputusan 14 hari tidak bertambah | pemilik register |

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Kalimat pertama 13.1 | Tesis `tesis.mitigasi` identik dengan RE dan slide Pesan Kunci | T1.29 | gerbang D-6 | Hanya setelah token diganti ke versi alam (Koreksi butir 1) |
| Kisi kesimpulan 13.1 (4 × 2) | Delapan kotak K1–K8, angka di depan, satu kalimat arti, label, rujukan bab, ikon jenis | P1 T1.1–T1.28, I1.1; kunci di bagian Angka | B5.25; tanpa kode G (kisi teks) | Kolom kiri A.1, A.2, A.3, B.1; kanan B.2, C.1, C.2, C.3; tanpa efek R = 8 (I1.5); angka model hanya berdampingan dengan tercatat |
| Pita keputusan 13.2 | KD-1, KD-2, KD-3 dengan pilihan (a) dan (b) beserta akibat | P2 I2.1–I2.3; T2.1–T2.12 | B5.25 | Identik dengan pita di halaman Pesan Kunci (B5.26) dan pita ARAHAN slide 13; KD-2 tanpa "0,2%" dan dengan rumus IKP LKIP; KD-3 sebagai pilihan penyebut (provinsi 50% lawan kab/kota) dengan baseline RPJMN 62% di catatan; angka LKIP hanya setelah masuk Bab 5, 10, 11 |
| Daftar keputusan 14 hari | Satu daftar untuk dua kajian: R-A01–A05, R-M01, R-M02 | P3 I3.1; KERANGKA §6 | enumerasi sejajar (L61) | KD-4 tampil di sini sebagai R-M01, tidak di pita |
| Kisi prioritas 13.3–13.4 | 36 kode rekomendasi pada kisi horizon × dampak | P3 I3.1, I3.6 | B5.28, G18 | Sementara; 32 sel sangat tinggi; kunci dampak dan catatan kejenuhan ditulis di baris terakhir |
| Matriks rekomendasi 13.3 (internal BNPB) dan 13.4 (lintas K/L) | Dua baris per butir: No, LANGKAH, LEMBAGA, WAKTU; RINCIAN, INDIKATOR SELESAI, DASAR | P3 I3.1–I3.4 | B5.13, G23 (kolom WAKTU berpil horizon) | Kode temuan ditulis lengkap "Temuan A.2"; tiga butir teratas diberi sketsa langkah dan "Risiko pelaksanaan" (I3.3); internal 27, lintas K/L 9. Bila 36 baris melampaui 4 hlm, baris 2026–2027 dan 2028–2030 di matriks diringkas ke kode dan langkah, isi lengkap di Lampiran I |
| Daftar 13.5 | Sepuluh butir yang sengaja tidak direkomendasikan | T4.1–T4.10 | enumerasi sejajar (L61) | Satu kalimat alasan per butir dengan rujukan |
| Tabel 13.6 | Yang belum diketahui dan lembaga pemegang data | T4.11 | B5.7 | Butir tertutup tidak ditampilkan; dirujuk ke Lampiran F |
| Slide 12 deck (E4) | "{a} rekomendasi, {b} dalam 100 hari" | P3 I3.1 | S28, S29 | {a} dan {b} menunggu register dikunci; draf: 36 dan 12 (14 hari 7 + 100 hari 5) |
| Slide 13 deck (Kesimpulan) | 8 kesimpulan dan pita ARAHAN | I1.1, I2.1–I2.3 | S32 | Isi sama dengan kisi dan pita DOCX |

Tidak ada gambar data baru di Bab 13; angka di kisi dan pita identik dengan Bab 4–12, Pesan Kunci, dan deck slide 1, 12, dan 13
(KERANGKA §2 butir 20).

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/mitigasi/bukti/bab-13.angka.json` dengan bentuk entri `data/angka.json` (bentuk B: `nilai` +
`pustaka`). `data/angka.json` tidak disunting. Angka sekunder tidak masuk registri. Hitungan register (jumlah rekomendasi per horizon)
sengaja tidak didaftarkan sampai register dikunci (sama dengan sikap air bab-10).

**Kunci lama yang dipakai ulang (tidak diubah):** `tesis.mitigasi`, `dibi.nasional.meninggal.2025`, `dibi.nasional.hilang.2025`,
`dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang`, `hidromet.nasional.lantai.meninggal_hilang`, `hidromet.nasional.lanina.korban_jiwa`,
`hidromet.nasional.lantai.pd_renas.korban_jiwa`, `hidromet.nasional.lantai.pd_renstra.korban_jiwa`, `irbi.nasional.2019`,
`irbi.nasional.2024`, `irbi.nasional.persen_2019_2024`, `nonalam.covid19.meninggal`, `nonalam.covid19.kematian_berlebih`,
`sosial.maluku.meninggal_bawah` (`data/angka.json`); `dibi.alam.meninggal.2025`, `dibi.alam.meninggal_hilang.2025`,
`dibi.alam.meninggal_hilang.2018`, `dibi.sumatra2025.mengungsi`, `hidromet.sumatra2025.rumah_rusak_berat`, `renas.indikator_1a.proyeksi_2025`,
`bps.penduduk.2026`, `dibi.nasional.per100rb.2025_bps2026`, `rpjmn.pp_irb.baseline_2023`, `rpjmn.kp_kapasitas.baseline_2023` (bab-01);
`rpjmn.kp_kapasitas.target_2025`, `renstra.ikd.rerata`, `renstra.ikd.jumlah_indikator`, `krb.nasional.kab_kapasitas_dinilai`,
`renas.krb.terpapar_tsunami` (bab-02); `irbi.skala.spearman_2025`, `irbi.nasional.2025_rerata`, `irbi.kab.tinggi.2025`,
`irbi_dibi.nasional.spearman.banjir`, `pusgen.jawa.mmaks`, `pusgen.jawa.periode_ulang`, `geologi.jawa_gabungan.peluang_5th`,
`geologi.jawa_segmen.peluang_5th`, `krb.nasional.kapasitas_minimal_sedang_persen`, `renstra.peringatan_dini.keterpenuhan_persen`,
`rpjmn.peringatan_dini.baseline`, `hidromet.nasional.terberat.korban_jiwa`, `geologi.jawa_mmaks.korban_analog` (bab-03);
`dibi.kejadian_besar.lima_teratas_porsi_meninggal.2015_2025`, `dibi.nasional.kejadian_geologi_porsi.2015_2025`,
`dibi.nasional.meninggal_geologi_porsi.2015_2025`, `koplitz.asap2015.kematian_berlebih`, `usgs.yogya2006.meninggal` (bab-04);
`irbi.pulau.*.kab_tinggi.2025`, `dibi.pulau.jawa.porsi_kejadian_2015_2025`, `dibi.pulau.sulawesi.porsi_meninggal_hilang_2015_2025`,
`irbi_dibi.nasional.spearman.total_kejadian`, `dibi.alam.hidromet.meninggal_hilang_rerata_2015_2019`,
`dibi.alam.hidromet.meninggal_hilang_rerata_2020_2024`, `dibi.alam.hidromet.meninggal_hilang.2025`, `irbi.bahaya.n_turun_2019_2024`,
`perhatian.mitigasi.kab_unik`, `perhatian.mitigasi.pasangan`, `krb.prov.kapasitas_minimal_sedang_persen`,
`krb.pulau.papua.kab_kapasitas_minimal_sedang_persen`, `krb_irbi.kab_kapasitas_rendah_tinggi`,
`krb_irbi.kab_kapasitas_rendah_tinggi_penduduk`, `matriks.mitigasi.*`, `renstra.iks_kapasitas_minimal_sedang.2026` (bab-05);
`usgs.pangandaran2006.meninggal`, `geologi.jawa_mmaks.jiwa_pesisir_30mnt`, `geologi.jawa.lubang_proksi_kab`, `geologi.mesin.faktor_loo`,
`geologi.mesin.yogya2006_model`, `renkon.jatim2021.banyuwangi_terpapar`, `renkon.jatim2021.jember_terpapar` (bab-06);
`hidromet.nasional.musim_2025.hilang`, `hidromet.nasional.musim.median_meninggal_hilang`,
`hidromet.nasional.musim.kedua_terberat_meninggal_hilang`, `hidromet.nasional.lantai.rasio_batas_tinggi_model`,
`hidromet.nasional.pasca_elnino.meninggal_hilang_2009`, `_2015`, `_2023`, `hidromet.nasional.kalender.porsi_mh_november`,
`hidromet.nasional.kalender.porsi_kekeringan_jun_sep`, `hidromet.nasional.kekeringan.dibi_terdampak_2018`,
`dibi.puncak2023.kekeringan.meninggal`, `sipongi.karhutla2015.luas_ha`, `oni.jas_2026.peringkat`, `bmkg.dasarian_okt1_2026.enso_aso`,
`hidromet.nasional.pd_renas.penurunan_persen`, `hidromet.nasional.pd_renstra.penurunan_persen`, `dibi.nasional.kekeringan.terdampak.2026`,
`dibi.nasional.karhutla.kejadian.2026` (bab-07); `nonalam.tpa.belum_berhenti_porsi`, `nonalam.tpa.tenggat_tutup_uu18`,
`program.kompendium.nonalam` (bab-08); `perban5_2018.jenis_ancaman` (bab-09); `mitigasi.sel_program.*`,
`bpk.ihps2_2024.bnpb.peraturan_belum_disahkan`, `bpk.ihps2_2024.bnpb.peraturan_belum_diinisiasi`, `bpk.ihps2_2024.pb.objek_pemda`,
`mk.putusan261_2025.indikator_minimal`, `uu24.pasal7.indikator`, `renas.indikator_1c.2025_persen` (bab-10); `oni.jas_2026`,
`bmkg.musim_2026.enso_jas`, `bmkg.musim_2026.zom_awal_mundur`, `bmkg.musim_2026.persen_awal_mundur`, `renas.indikator_1c.2025`,
`renas.indikator_1c.2029`, `renstra.ikp_peringatan_dini.2025`, `renstra.ikp_peringatan_dini.2029`, `renstra.iks_kapasitas_minimal_sedang.2029`,
`progsun.2026.jumlah_rancangan` (air bab-01); `perka_2008.air_bersih_liter_hari` (air bab-03); `perka_2008.air_bersih_3hari_liter` (air
bab-05); `kemenkopmk.*`, `perban2_2023.renkon_masa_berlaku_tahun`, `perban2_2023.renkon_reviu_bulan`, `program.kompendium.*`,
`renas.aksi_121c.pusdalops.*`, `bpk.bmkg.ibf_banjir_terperingatkan_persen` (air bab-07); `perban2025_7.destana.penilaian_tahun` (air
bab-08); `renas.indikator_1c.kelipatan_2025_2029`, `renstra.ikp_peringatan_dini.kelipatan_2025_2029`,
`renstra.ikp_peringatan_dini.kenaikan_poin_2025_2029`, `renas.perubahan_berkala.tahun_maks`, `renas.perubahan_bencana.tahun_maks`,
`perpres80.renstra.evaluasi_tahun_ke`, `renstra.evaluasi_tahun_ke3.tahun` (air bab-10); `krb.jawa.kab_kapasitas_minimal_sedang_persen`
(air); pemutakhiran: `dibi.nasional.per100rb.median_2015_2024_sp2020`, `hidromet.kalender.<pulau>.hujan_kejadian_porsi_nov_apr`,
`mitigasi.sel_posisi.*`, `respons.w1.hidromet_puncak30`, `respons.w2.hidromet_puncak30`, `respons.w2.hidromet_puncak30_tanpa_bekasi2020`,
`respons.w3.beras_ton_hari` (bab-11; berkas angka bab-11 belum ada); `renas.indikator_1a.rasio_dibi_2025`, `renas.lokus_prioritas.entri_unik`,
`dibi.sumatra2025.mh_di_lokus_renas_persen`, `renas.aksi_312c.target_2029` (bab-12); `kerugian.nasional.lapisan_sering`,
`kerugian.nasional.lapisan_berat`, `irbi.nasional.2024` (`data/angka.json`); `renas.indikator_2a.proyeksi_2025`,
`rpjmn.pn8_kerugian_pdb.baseline_2022` (bab-02).

Kunci pemutakhiran (26, LKIP BNPB 2025) dicantumkan di akhir tabel; angka sekunder tidak ada di antaranya.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| dibi.alam.hilang.2025 | 221 jiwa | pustaka bnpb-dibi (olah: jumlah kolom `hilang` baris tahun=2025, klasifikasi=alam, cakupan=bencana di `dibi/rekap_nasional_tahunan.csv`) | resmi | DIBI BNPB 2025 |
| dibi.alam.meninggal.2018 | 5.477 jiwa | idem (tahun=2018, kolom `meninggal`) | resmi | DIBI BNPB 2018 |
| dibi.alam.hilang.2018 | 763 jiwa | idem (tahun=2018, kolom `hilang`) | resmi | DIBI BNPB 2018 |
| dibi.alam.per100rb.2025_bps2026 | 0,68 per 100.000 | pustaka bnpb-dibi, bps-2026-penduduk (olah: 1.956 / 287.198.383 × 100.000) | resmi | DIBI BNPB; BPS 2026 |
| dibi.alam.rasio_proyeksi_1a.2025 | 3,1 kali | pustaka bnpb-dibi, bnpb-2025-renas (olah: 0,681 / 0,22; Renas Tabel 2.8 hlm. 32) | resmi | olah realisasi lawan proyeksi Renas 1.a |
| bmkg.musim_2026.zom_awal_november | 185 ZOM | pustaka bmkg-2026-siaran-musim-hujan (siaran pers 22 Sep 2026; bab-07 P2 temuan 1) | resmi | BMKG 2026 |
| bmkg.musim_2026.zom_awal_desember | 266 ZOM | idem | resmi | idem |
| bmkg.musim_2026.zom_puncak_februari | 190 ZOM | idem | resmi | idem |
| peta_jalan.hari100.hari0_1nov2026 | 9 Februari 2027 | pustaka bnpb-2025-renas (olah kalender: hari ke-0 + 100 hari; KERANGKA prinsip 11) | asumsi-kebijakan | peta jalan kajian |
| peta_jalan.hari100.hari0_15nov2026 | 23 Februari 2027 | idem | asumsi-kebijakan | idem |
| peta_jalan.hari100.hari0_30nov2026 | 10 Maret 2027 | idem | asumsi-kebijakan | idem |
| kapasitas.jarak_90.rpjmn_poin | 28 poin persen | pustaka ri-2025-perpres12-rpjmn (olah: 90 − 62; Lampiran III hlm. 913) | asumsi-kebijakan | RPJMN 2025–2029 |
| kapasitas.jarak_90.krb_kab_poin | 52,0 poin persen | pustaka bnpb-2026-krb, ri-2025-perpres12-rpjmn (olah: 90 − 37,99) | asumsi-kebijakan | KRB 2022–2026; RPJMN |
| kapasitas.target_90.krb_kab_n | 458 kab/kota | pustaka bnpb-2026-krb (olah: 90% × 508, dibulatkan ke atas) | asumsi-kebijakan | KRB 2022–2026 |
| kapasitas.jarak_90.krb_kab_tambahan | 265 kab/kota | idem (olah: 458 − 193) | asumsi-kebijakan | idem |
| perka2014_6.proleg.jangka_tahun | 1 tahun | pustaka bnpb-2014-produkhukum (Pasal 4 ayat (4)) | resmi | Perka BNPB 6/2014 |
| progsun.2026.jangka_tahun | 1 tahun | pustaka bnpb-2025-progsun (Diktum KEDUA) | resmi | Kepka BNPB 327/2025 |
| bnpb.lkip2025.meninggal.2025 | 1.666 jiwa | pustaka bnpb-2026-lkip2025 hlm. 7 | resmi | LKIP BNPB 2025 (data terverifikasi) |
| bnpb.lkip2025.hilang.2025 | 214 jiwa | pustaka bnpb-2026-lkip2025 hlm. 7 | resmi | idem |
| bnpb.lkip2025.irb.penurunan_persen.2025 | 1,03% | pustaka bnpb-2026-lkip2025 hlm. x, 19 (IKSS 1.1; target 1,2%) | resmi | idem |
| bnpb.lkip2025.irb.nasional_2025_kerentanan2021 | 170,17 | pustaka bnpb-2026-lkip2025 hlm. 19 | resmi | idem |
| bnpb.lkip2025.irb.nasional_2024_krb2021 | 171,95 | pustaka bnpb-2026-lkip2025 hlm. 19 (bertentangan dengan `irbi.nasional.2024` 128,52) | resmi | idem |
| bnpb.lkip2025.irb.baseline_2026_2029 | 147,95 | pustaka bnpb-2026-lkip2025 hlm. 7, 19 | resmi | idem |
| bnpb.lkip2025.kapasitas.prov_minimal_sedang_persen.2025 | 50% | pustaka bnpb-2026-lkip2025 hlm. x, 20 (IKSS 1.2; target 67%) | resmi | idem |
| bnpb.lkip2025.kapasitas.prov_minimal_sedang_n.2025 | 19 provinsi | pustaka bnpb-2026-lkip2025 Lampiran 2 hlm. 112–113 (olah: IKD ≥ 0,4) | resmi | idem |
| bnpb.lkip2025.ikd.kab_rendah.2025 | 225 kab/kota | pustaka bnpb-2026-lkip2025 hlm. 22 | resmi | idem |
| bnpb.lkip2025.ikd.kab_sedang.2025 | 274 kab/kota | pustaka bnpb-2026-lkip2025 hlm. 22 | resmi | idem |
| bnpb.lkip2025.ikd.kab_tinggi.2025 | 15 kab/kota | pustaka bnpb-2026-lkip2025 hlm. 22 | resmi | idem |
| bnpb.lkip2025.ikd.kab_minimal_sedang_persen.2025 | 56,2% | pustaka bnpb-2026-lkip2025 hlm. 22 (olah: 289 / 514) | resmi | idem |
| bnpb.lkip2025.ikd.kab_menilai.2025 | 469 kab/kota | pustaka bnpb-2026-lkip2025 hlm. 22 | resmi | idem |
| bnpb.lkip2025.pd.tsunami_persen.2025 | 12,19% | pustaka bnpb-2026-lkip2025 Tabel 3.4 hlm. 35 | resmi | idem |
| bnpb.lkip2025.pd.tsunami_tercakup.2025 | 651.000 jiwa | pustaka bnpb-2026-lkip2025 Tabel 3.4 | resmi | idem |
| bnpb.lkip2025.pd.banjir_persen.2025 | 0,01% | pustaka bnpb-2026-lkip2025 Tabel 3.4 | resmi | idem |
| bnpb.lkip2025.pd.banjir_tercakup.2025 | 10.800 jiwa | pustaka bnpb-2026-lkip2025 Tabel 3.4 | resmi | idem |
| bnpb.lkip2025.pd.banjir_terpapar.2025 | 113.829.496 jiwa | pustaka bnpb-2026-lkip2025 Tabel 3.4 | resmi | idem |
| bnpb.lkip2025.pd.rerata_persen.2025 | 6,10% | pustaka bnpb-2026-lkip2025 Tabel 3.4 (rerata sederhana dua jenis) | resmi | idem |
| bnpb.lkip2025.pd.tertimbang_persen.2025 | 0,56% | pustaka bnpb-2026-lkip2025 Tabel 3.4 (olah: 661.800 / 119.170.778) | resmi | idem |
| bnpb.lkip2025.kerugian_pdb_persen.2025 | 0,217% PDB | pustaka bnpb-2026-lkip2025 hlm. x, 18 (tanpa Siklon Senyar) | resmi | idem |
| bnpb.lkip2025.kerugian_rp.2025 | Rp51,3 T | pustaka bnpb-2026-lkip2025 hlm. 18 | resmi | idem |
| kapasitas.jarak_90.lkip_prov_poin | 40 poin persen | pustaka bnpb-2026-lkip2025 (olah: 90 − 50) | asumsi-kebijakan | olah LKIP BNPB 2025 |
| kapasitas.target_90.prov_n | 35 provinsi | pustaka bnpb-2026-lkip2025 (olah: 90% × 38, dibulatkan ke atas) | asumsi-kebijakan | idem |
| kapasitas.jarak_90.ikd_kab_tambahan | 174 kab/kota | pustaka bnpb-2026-lkip2025 (olah: 463 − 289) | asumsi-kebijakan | idem |
| pd.ikp_2029.tambahan_tsunami_jiwa | sekitar 23.600 jiwa | pustaka bnpb-2026-lkip2025 (olah: 2 × 6,32 − 0,0095 = 12,6305%; × 5.341.282 − 651.000) | asumsi-kebijakan | pembacaan rumus IKP; bukan perkiraan |

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/mitigasi/bukti/bab-13.pustaka.json` (66 entri; kunci `id` dipakai kolom `pustaka` registri). Pemutakhiran
menambah `bnpb-2026-lkip2025` (entri baru, dibuka 24 Okt 2026) dan menyalin `bps-2021-sp2020`, `bnpb-2026-ckan-kerusakan-kerugian`,
`pantaubencana-2026-profil-kerugian` dari berkas bukti air Bab 8 dan mitigasi Bab 12. Entri lain disalin
dengan `id` yang sama dari berkas bukti mitigasi Bab 1–10, berkas bukti air Bab 9–10, atau `riset/E-pustaka.json`; catatan entri
`bnpb-2014-produkhukum`, `bnpb-2020-dsp`, `bnpb-2026-dana-bersama`, dan `bnpb-2008-kebutuhan-dasar` dimutakhirkan dengan pasal yang dibuka
ulang 24 Oktober 2026. Ringkas (sumber terpenting untuk bab ini):

| id | Sumber | Verifikasi |
| --- | --- | --- |
| bnpb-dibi | DIBI BNPB (rekap nasional, kejadian besar) | primer |
| bnpb-2026-dibi | DIBI BNPB, dasbor publik 1 (tarikan 23 Okt 2026) | primer |
| bnpb-irbi | IRBI kab/kota 2015–2025 | primer |
| bnpb-2026-krb | Ringkasan KRB 2022–2026 per kab/kota | primer |
| bnpb-2025-renas | Perban BNPB 1/2025, Renas PB 2025–2029 | primer |
| bnpb-2025-renstra | Perban BNPB 5/2025, Renstra BNPB 2025–2029 | primer |
| ri-2025-perpres12-rpjmn | Perpres 12/2025 RPJMN 2025–2029 dan lampiran | primer |
| ri-2025-perpres80 | Perpres 80/2025 Renstra dan Renja K/L | primer |
| ri-2020-perpres87 | Perpres 87/2020 RIPB 2020–2044 | primer |
| bnpb-2014-produkhukum | Perka BNPB 6/2014 Pembentukan Produk Hukum | primer |
| bnpb-2025-progsun | Kepka BNPB 327/2025 Progsun 2026 | primer |
| bnpb-2020-dsp | Perban BNPB 4/2020 Penggunaan DSP | primer |
| bnpb-2026-dana-bersama | Perban BNPB 1/2026 Dana Bersama | primer |
| ri-2021-perpres75 | Perpres 75/2021 Dana Bersama PB | primer |
| ri-2008-pp22 | PP 22/2008 Pendanaan dan Pengelolaan Bantuan Bencana | primer |
| bpk-2025-ihps2-2024 | BPK, IHPS II 2024 | primer |
| mk-2026-putusan261 | Putusan MK 261/PUU-XXIII/2025 | primer |
| ri-2026-perpres46 | Perpres 46/2026 perubahan Perpres 17/2018 | primer |
| bnpb-2018-keadaan-tertentu | Perban BNPB 5/2018 | primer |
| pantaubencana-2026-program-terbukti | Paket data program-terbukti (kompendium) | olahan penyusun |
| pusgen-2024-peta-gempa | PuSGeN, Peta Sumber dan Bahaya Gempa Indonesia 2024 | primer |
| who-2023-kematian-berlebih | WHO, estimasi kematian berlebih COVID-19 | primer (estimasi model) |
| icg-2002-maluku | ICG Asia Report N°31 (2002) | primer non-pemerintah |
| bmkg-2026-siaran-musim-hujan | BMKG, siaran pers prakiraan musim hujan 2026/2027 | primer |
| bnpb-2008-kebutuhan-dasar | Perka BNPB 7/2008 Standar Pemenuhan Kebutuhan Dasar | primer |
| koplitz-2016-asap | Koplitz dkk. (2016), ERL 11:094023 | primer (estimasi model) |
| bnpb-2026-lkip2025 | BNPB, Laporan Kinerja BNPB Tahun 2025 (berkas R1, Februari 2026) | primer (baru, pemutakhiran) |
| bnpb-2026-ckan-kerusakan-kerugian | BNPB, CKAN rekap nilai kerusakan dan kerugian proposal pemda 2017–2024 | primer (nilai pengajuan) |
| pantaubencana-2026-profil-kerugian | Paket turunan profil kerugian rumah batas bawah 2015–2025 | olahan penyusun |
| bps-2021-sp2020 | BPS, BRS hasil Sensus Penduduk 2020 | primer |

## Perbaikan atas temuan pemeriksa (24 Oktober 2026, sore)

Lima temuan diperiksa ke sumber; kelimanya benar dan diterapkan, tidak ada yang ditolak.

1. T1.11 dan T4.10: rasio kematian asap kini ditulis dengan penyebutnya: sekitar 3.800 kali 24 meninggal DIBI (33 kab; bab-04
   butir 20) atau sekitar 7.600 kali 12 meninggal DIBI di provinsi asap (bab-07 P4). Dicek: 91.600 / 24 = 3.817; 91.600 / 12 = 7.633.
2. KD-3 tidak memakai jalur berkala Renas. Dicek: Renas Tabel 2.8 (`perban-nomor-1-tahun-2025.json` hlm. 32–33) hanya memuat 1.a
   sampai 4.c tanpa indikator kapasitas; LKIP 2025 (berkas SHA-1 ea574455d935 diunduh ulang, hlm. cetak 16) membuka definisi dengan
   "persentase wilayah (kabupaten/kota atau provinsi)" dan merujuk Kepka 318/2025. Diubah: Inti P2, I2.1, I2.3, I2.6, R-A05.
3. Perka 6/2014 dijadwalkan diubah (Kepka 327/2025 Lampiran butir 7, hlm. 4; butir 8 adalah perubahan Perban 1/2021, bukan Renas).
   Diubah: T2.4 (subbutir baru), T2.14 (a), Inti P2, I2.7, Celah P2, R-M02, Koreksi butir 14 hari; pustaka `bnpb-2014-produkhukum`
   dan `bnpb-2025-progsun`.
4. T1.9 dan kotak K2: 61,08% adalah porsi luas daratan (529 dari 699 ZOM = 75,7%).
5. T2.7 dan pita KD-1: puncak ditulis bertahap (Desember 36,94%, Januari 25,68%, Februari 16,79% luas daratan); Februari tidak
   lagi disebut puncak nasional; catatan kunci `bmkg.musim_2026.zom_puncak_februari` di `bab-13.angka.json` diperbarui.
