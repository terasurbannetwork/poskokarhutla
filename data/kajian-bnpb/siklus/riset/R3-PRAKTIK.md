# R3 Praktik: rujukan peraturan dan metode untuk F1 sampai F7 (10 November 2026)

Tunduk pada `../KEPUTUSAN-AWAL.md`. Dibuat dari repo (`data/hukum/teks/*.txt.gz`, `data/hukum/peta_peraturan.json`, `docs/bnpb/PETA-PERATURAN.md`, `data/kajian-bnpb/{rehab,juklak,pustaka.json}`) lalu web. Label sumber: **[teks]** = teks peraturan dibaca langsung dari korpus repo; **[web-baca]** = halaman web dibaca; **[web-cari]** = hanya ringkasan hasil pencarian, belum dibaca primernya; **[repo]** = kode atau dokumen repo. "Tidak ditemukan" berarti memang tidak ada di sumber yang dibuka sesi ini. Halaman mengikuti penomoran cetak dokumen. Kutipan langsung dibatasi, selebihnya parafrase.

## Bagian 1. F4 Jitupasna ke R3P

### 1.1 Peraturan yang berlaku (status menurut `peta_peraturan.json`, berlaku=true)

| Hal | Peraturan | Isi yang dipakai | Sumber |
| --- | --- | --- | --- |
| Pengkajian kebutuhan pascabencana (Jitupasna, PDNA) | Perka BNPB 15/2011 Pedoman Pengkajian Kebutuhan Pascabencana, ditetapkan 8 Des 2011 | Gabungan DaLA dan HRNA (Pasal 1, hal. 8 BAB I); enam aspek: kemanusiaan, perumahan dan permukiman, infrastruktur, ekonomi, sosial, lintas sektor (Tabel 2.4, hal. 9-10) | [teks] |
| Pedoman umum R3 | Perban BNPB 6/2017 Penyelenggaraan Rehabilitasi dan Rekonstruksi Pascabencana | Jitupasna adalah masukan (input) manajemen R3; proses: rencana dan prioritas, alokasi sumber daya, pelaksanaan, monev, pelaporan (Pasal 10) | [teks] |
| Penyusunan R3P | Perban BNPB 5/2017 Penyusunan Rencana Rehabilitasi dan Rekonstruksi Pascabencana | Enam tahap (Pasal 2 ayat (1)), paling lama 90 hari, dimulai saat tanggap darurat (Pasal 2 ayat (2)-(3)) | [teks] |
| Hibah RR | Perban BNPB 4/2024 Penyelenggaraan Hibah RR Pascabencana; Juklak 9/2024 pelaksanaan dan pelaporan konstruksi hibah RR | Kriteria penerima, dokumen usulan, penilaian | [teks] |

Pengganti Perka 15/2011: **tidak ditemukan**. Ia merujuk Perka 17/2010 (teks tidak ada di korpus; status dicek ke JDIH); Perka 11/2008 sudah dicabut Perban 6/2017.

### 1.2 Sektor dan subsektor (Perka 15/2011, Formulir 05 hal. 84-93; Formulir 04 hal. 58)

Kriteria kerusakan dirinci per sektor. Sektor yang tercantum di Formulir 05: (1) perumahan; (2) infrastruktur dan prasarana publik: jalan dan jembatan, jaringan telekomunikasi, air bersih dan sanitasi; (3) ekonomi produktif: pertanian, infrastruktur pertanian, perikanan, industri kecil dan menengah, perdagangan dan pasar, pariwisata; (4) lintas sektor: lingkungan hidup, sarana pemerintahan, sarana keuangan dan perbankan, sarana ketertiban dan keamanan. Formulir 04 memuat juga sektor kesehatan dan pendidikan. [teks]

Perban 5/2017 Pasal 8 ayat (2) menyusun lingkup R3P dalam lima sektor: permukiman, infrastruktur (transportasi, pos, telekomunikasi, energi, sumber daya air, air bersih dan sanitasi), ekonomi, sosial (psikologis sosial, kesehatan, pendidikan, agama, budaya), lintas sektor (tata pemerintahan, keuangan dan perbankan, lingkungan hidup dan PRB, ketertiban dan keamanan). [teks] Dua taksonomi ini tidak identik; F4 harus memetakan sektor Jitupasna ke lima sektor R3P.

### 1.3 Kategori RB, RS, RR (Perka 15/2011, Formulir 05, mengutip Pedoman Teknis Rumah dan Bangunan Gedung Tahan Gempa Ditjen Cipta Karya 2006 hal. 75-76)

| Kategori | Kerusakan fisik | Penanganan |
| --- | --- | --- |
| Rusak Berat (RB) | di atas 70%; struktur utama sebagian besar rusak atau roboh | rekonstruksi |
| Rusak Sedang (RS) | 30% sampai 70%; sebagian kecil struktur rusak, komponen penunjang sebagian besar rusak | rehabilitasi |
| Rusak Ringan (RR) | di bawah 30%; struktur masih berfungsi | perbaikan ringan |

Kriteria sama (RB di atas 70%) dipakai untuk jalan, jembatan, pertanian. [teks] Formulir rumah memakai empat baris (hancur total, berat, sedang, ringan): "hancur total" dipisah dari RB.

### 1.4 Rumus kerusakan dan kerugian

Perka 15/2011 hal. 40-41 [teks]:

- Nilai kerusakan = jumlah unit fisik rusak menurut tingkat kerusakan (RB, RS, RR) x harga satuan (biaya) menurut tingkat kerusakan; harga satuan diambil saat pengumpulan data primer.
- Nilai kerugian: identifikasi komponen kerugian tiap sektor lalu taksir nilainya; berdasarkan asumsi, misalnya lama pemulihan.
- Wajib periksa: hitung ganda antarsektor (contoh: air minum dan sanitasi dihitung di perumahan lalu di sektor air; usaha menyatu dengan rumah; pertanian pakai harga konsumen dan margin pedagang dihitung lagi), cakupan sektor, dan kewajaran nilai (Kotak 1, hal. 41).
- Analisis gangguan akses, fungsi, dan risiko (Tabel 3.6 sampai 3.8) serta kebutuhan pemulihan (Tabel 3.10, Formulir 10-11). Rekapitulasi kebutuhan ada di Formulir 11 hal. 116.
- Anggaran makro (Formulir 12, hal. 119): estimasi anggaran per sektor memakai tabel satuan biaya kegiatan dikali indeks kemahalan wilayah, sebagai ancar-ancar renaksi, lalu dirinci sesuai kondisi lapangan.
- Struktur laporan PDNA (hal. 41): Bab 1 gambaran bencana; 2 akibat dan dampak; 3 kebutuhan R3; 4 perkiraan biaya; 5 penutup.

### 1.5 Waktu dan pelaku

- PDNA diaktifkan oleh BNPB paling lambat dua minggu sebelum tanggap darurat berakhir, oleh BPBD satu minggu sebelum (hal. 16). Diagram 3.1: perkiraan 1, 3, 1, 1 minggu (pemetaan ke tahap tidak terbaca pasti). [teks]
- SK Tim Kerja PDNA (Formulir 02) ditetapkan Deputi Rehabilitasi dan Rekonstruksi BNPB atau Kepala BPBD. [teks]
- R3P: tim terdiri dari BNPB, Bappenas, K/L (skala nasional) atau BPBD, Bappeda, perangkat daerah (daerah) (Perban 5/2017 Pasal 3). Penanggung jawab: Kepala BNPB (nasional), gubernur (provinsi), bupati atau wali kota (kabupaten/kota) (Pasal 5). Penetapan lewat keputusan yang ditandatangani Kepala BNPB, gubernur, atau bupati atau wali kota (Pasal 6 ayat (2)). [teks]
- Jadi: dokumen PDNA ditetapkan timnya oleh Deputi atau Kepala BPBD; R3P ditandatangani kepala daerah atau Kepala BNPB. Draf di sistem tidak boleh tampil seolah dokumen resmi (selaras U7).

### 1.6 Syarat usulan Hibah RR (Perban 4/2024) [teks]

- Penerima harus (Pasal 6 ayat (1)): BPBD dibentuk dengan perda; nilai kebutuhan R3 di dokumen rencana melebihi anggaran penanggulangan bencana APBD setelah bencana; dokumen rencana R3 sudah ada; daerah siap menganggarkan perencanaan dan pengawasan. Penerima terdahulu wajib menyelesaikan kewajiban lama (ayat (3)).
- Usulan diajukan tertulis oleh kepala daerah kepada Kepala BNPB (Pasal 8). Dokumen (Pasal 9): perda BPBD, dokumen kejadian, dokumen rencana R3, ringkasan APBD penanggulangan bencana, RAB dan gambar teknis (konstruksi), aset tercatat di kartu inventaris barang, kajian kebutuhan nonkonstruksi, SK penerima stimulan, rekapitulasi, dokumen pendukung. Kabupaten dan kota perlu rekomendasi gubernur (Pasal 11).
- Penilaian BNPB: praverifikasi, verifikasi lapangan, reviu APIP (Pasal 14); berita acara praverifikasi ditandatangani BNPB dan pemda (Pasal 15); verifikasi lapangan memeriksa penyebab kerusakan, volume, desain dan nilai, kesiapan daerah, dengan pendampingan K/L (Pasal 16-17).
- Tidak dibiayai (Pasal 5): operasional kantor, perencanaan dan pengawasan, normalisasi sungai, penanganan darurat, pembelian lahan, aset desa. Tambahan volume konstruksi maksimal 10% (Pasal 3 huruf a). Laporan tiga bulanan dan setor sisa dana 120 hari: Juklak 9/2024 (PETA-PERATURAN baris 116).

### 1.7 Standar dana stimulan rumah

- Juklak 5/2024 (DSP stimulan perbaikan rumah): **teks tidak ada** di korpus (`sumber_teks: tidak ada`); isi tarif tidak dapat dibaca dari sumber primer.
- Angka beredar: RB Rp60 juta, RS Rp30 juta, RR Rp15 juta per rumah, dikaitkan dengan Keputusan Kepala BNPB 296.A/2023 oleh dokumen BPK Sulbar; sebelumnya Rp50 juta, Rp25 juta, Rp10 juta sejak 2010 menurut Kemenko PMK (awal 2024). [web-cari/web-baca sekunder] https://kemenkopmk.go.id/node/4634 ; https://sulbar.bpk.go.id/wp-content/uploads/2024/11/Dana-Stimulan-Tahap-2-di-Mamuju-Belum-Pasti-Cair-BPBD-Fokus-pada-Validasi-Data.pdf
- Usulan RB Rp80 juta untuk Sumatra 2026 belum terkonfirmasi disahkan (antaranews.com/berita/5618900).
- Dana Tunggu Hunian: Rp600.000 per bulan, tiga bulan (Juklak DTH 1/2023 dan juklak 2025, PETA-PERATURAN baris 44-45). [repo]
- Label F4 (U4): `asumsi-kebijakan` sampai teks resmi didapat.

## Bagian 2. F5 Renkon dan gladi

### 2.1 Rencana Kontingensi: peraturan yang berlaku

**Perban BNPB 2/2023 Penyusunan Rencana Kontingensi Bencana** (`pustaka.json` id `bnpb-2023-renkon`, https://jdih.bnpb.go.id/storage/file/2023pbbnpb002.pdf). Ejaan resmi "kontingensi". [teks]

- Tahap (Pasal 4): persiapan (kerangka acuan, jenis ancaman dari kajian risiko atau gejala, identifikasi pihak, data; Pasal 5), pelaksanaan (Pasal 6-13: cakupan kedaruratan = karakteristik ancaman, skenario kejadian dengan pakar, asumsi dampak; kerangka respon; rancangan respon = tujuan, sasaran, konsep operasi, struktur organisasi, kegiatan pokok, administrasi dan sumber daya termasuk kesenjangan, pengendalian, kelengkapan operasi), finalisasi (Pasal 14-17: konfirmasi para pihak, berita acara, penetapan oleh Kepala BNPB atau kepala daerah).
- Asumsi dampak diproyeksikan pada lima aspek (Pasal 7 ayat (5)): lingkungan, kependudukan, ekonomi, infrastruktur atau fisik, layanan sipil.
- Masa berlaku umum tiga tahun, boleh dimutakhirkan lebih awal bila faktor risiko berubah atau ada kejadian (Lampiran 1.8). Pemutakhiran (Pasal 18): rencana tindak lanjut, inventarisasi sumber daya berkala, kaji ulang asumsi dampak, prosedur tetap aktivasi, pantau peringatan dini, penetapan ulang. Uji (Pasal 19): diskusi, uji latihan, geladi posko dan geladi lapang.
- Kerangka bab (Lampiran): pengesahan pimpinan (komitmen, tanggal berlaku dan kedaluwarsa, jadwal pemutakhiran); ringkasan eksekutif maksimal dua halaman; BAB I Pendahuluan (1.1 sampai 1.9); II Situasi; III Tujuan dan Sasaran; IV Pelaksanaan; V Administrasi dan Sumber Daya; VI Pengendalian; VII Pemutakhiran dan Pengujian; sembilan lampiran (proyeksi wilayah dan penduduk terdampak, susunan pelaksana, jaring komunikasi, estimasi sumber daya, album peta, rencana evakuasi, komitmen, berita acara, profil lembaga).
- **Sektor atau klaster**: teks hanya menyebut "sektor-sektor atau bidang" yang diturunkan dari dampak langsung; daftar klaster baku **tidak ditemukan**. Jangan menciptakan daftar.
- Terkait: Perban 9/2025 RPKB Daerah (acuan renkon dan rencana operasi, Pasal 3); UU 24/2007 Pasal 45 ayat (2) huruf a dan d (uji coba rencana kedaruratan, gladi; nomor pasal diturunkan dari salinan OCR https://jdih.esdm.go.id/storage/document/uu-24-2007.pdf, cek ulang).

### 2.2 Gladi

**Juklak BNPB 4/2026 Pemenuhan SPM Sub-urusan Bencana Kab/Kota untuk Subkegiatan Gladi Kesiapsiagaan** [teks]:

- Gladi Ruang (BAB II, hal. 4): latihan berbentuk diskusi berbasis skenario untuk memahami, menyempurnakan, dan memvalidasi kebijakan, prosedur, rencana. Gladi Lapang (BAB III, hal. 16): latihan operasional gabungan dengan pengerahan sumber daya dalam simulasi mendekati kejadian nyata; menguji rencana kontingensi, tata kelola, pelaku, sumber daya.
- Dokumen: Direktif Latihan, Rencana Garis Besar (RGB, memuat skenario), Rencana Operasi Latihan (ROL, skenario strategis dan taktis), matriks inventarisasi permasalahan (terbatas), RIG. Keluaran Gladi Ruang minimal rekomendasi perbaikan kebijakan, rencana kontingensi, dan sarana prasarana.
- **Gladi posko** tidak punya juklak sendiri; hanya disebut sebagai bentuk uji (Perban 2/2023 Pasal 19; Juklak 16/2025: TTX/gladi ruang, gladi posko/CPX, gladi lapangan/FTX).

### 2.3 Standar minimum kebutuhan dasar

**Perka BNPB 7/2008 Tata Cara Pemberian Bantuan Pemenuhan Kebutuhan Dasar** (17 Des 2008, berlaku; Lampiran BAB IV hal. 8-13) [teks]:

| Komponen | Standar minimal |
| --- | --- |
| Penampungan sementara | 3 m2 per orang; aman dan sehat; akses fasilitas umum; privasi antarjenis kelamin dan usia |
| Pangan | beras 400 g per orang per hari atau setara; dapur umum dua kali makan; setara 2.100 kkal |
| Air bersih | 7 liter per orang per hari tiga hari pertama, lalu 15 liter; jarak penampungan ke jamban maksimal 50 m; ke titik air maksimal 500 m |
| Air minum | 2,5 liter per orang per hari |
| Sanitasi | satu jamban maksimal 20 orang; jamban dan penampung tinja minimal 30 m dari sumber air tanah; satu tempat sampah 100 liter per 10 keluarga |
| Sandang dan kebersihan | pakaian satu perangkat (dua untuk perempuan dan anak); sabun mandi 250 g dan sabun cuci 200 g per bulan |
| Kesehatan | layanan primer, vitamin A, campak, penyakit menular, kesehatan reproduksi dan jiwa |

Pembaruan Perka 7/2008: **tidak ditemukan** peraturan pengganti. Pembanding Sphere 2018 (`pustaka.json` id `sphere-2018`, https://spherestandards.org/handbook/): air minimal 15 liter, jamban maksimal 20 orang, ruang berlindung 3,5 m2 per orang [web-cari sekunder, buku sendiri belum dibaca; angka 2.100 kkal tidak terkonfirmasi di pencarian]. Perbedaan dengan Perka 7/2008 (air 7 liter awal; 3 m2 lawan 3,5 m2) wajib dipilih, lihat bagian akhir.

## Bagian 3. F3 Kaji cepat otomatis: metode dunia

### 3.1 Kematian gempa (PAGER USGS)

Rumus empiris Jaiswal dan Wald 2010 (Earthquake Spectra 26(4):1017-1037, doi 10.1193/1.3480331): laju kematian pada intensitas S adalah CDF lognormal dua parameter, v(S) = Phi[ ln(S/theta) / beta ], dan korban = jumlah atas tiap kelas MMI dari penduduk terpapar x v(S), nol di bawah MMI 4. [web-cari] https://pubs.usgs.gov/publication/70003714

Parameter tertulis di kode InaSAFE (alat BNPB/AIFDR; `safe/definitions/earthquake.py`) [web-baca] https://raw.githubusercontent.com/inasafe/inasafe/develop/safe/definitions/earthquake.py :

| Model | Parameter | Laju per MMI 6, 7, 8, 9, 10 (dihitung ulang di sini) |
| --- | --- | --- |
| PAGER v2.0 (Jaiswal dkk 2009a, OFR 2009-1136) | theta 13,249; beta 0,151 | 7,8e-8; 1,2e-5; 4,2e-4; 5,2e-3; 3,1e-2 |
| PAGER v1.0 (di docstring) | theta 14,05; beta 0,17 | 2,8e-7; 2,1e-5; 4,6e-4; 4,4e-3; 2,3e-2 |
| ITB (Indonesia) | laju = 10^(0,62275231 x MMI - 8,03314466), MMI 4 ke atas | 5,1e-5; 2,1e-4; 8,9e-4; 3,7e-3; 1,6e-2 |
| ITB Bayesian (Sengara dkk, tabel median) | MMI 2-5: 0; 6: 3,417e-5; 7: 3,878e-4; 8: 1,851e-3; 9: 7,873e-3; 10: 3,145e-2 | sama |

Theta dan beta khusus Indonesia dari OFR 2009-1136 (hal. 19) **tidak ditemukan** (PDF 403); PAGER v1/v2 global. ITB adalah rujukan Indonesia yang terbaca. Rentang F3 (keputusan 9) dapat diambil dari selisih model: MMI 8 antara 4e-4 dan 1,9e-3 per orang terpapar.

Kerugian ekonomi PAGER (Jaiswal dan Wald 2013, Earthquake Spectra, doi 10.1193/1.4000104): rasio kerugian lognormal terhadap MMI dikali faktor pengali negara pada PDB per kapita; parameter per negara **tidak ditemukan**. [web-cari] https://pubs.usgs.gov/publication/70045141

### 3.2 Kerusakan banjir menurut kedalaman (JRC, Huizinga dkk 2017)

JRC Technical Report EUR 28552 EN (JRC105688) "Global flood depth-damage functions", doi 10.2760/16510, https://publications.jrc.ec.europa.eu/repository/handle/JRC105688 [web-baca, teks PDF dibaca; dikutip dari Tabel 3-2, 3-6, 3-11].

Kerusakan (rupiah atau euro) = faktor(kedalaman) x kerusakan maksimum per m2 x luas bangunan. Kurva Asia (faktor kerusakan):

| Kedalaman (m) | 0 | 0,5 | 1 | 1,5 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hunian Asia (Tabel 3-2) | 0 | 0,33 | 0,49 | 0,62 | 0,72 | 0,87 | 0,93 | 0,98 | 1,00 |
| Niaga Asia (3-6) | 0 | 0,38 | 0,54 | 0,66 | 0,76 | 0,88 | 0,94 | 0,98 | 1,00 |
| Industri Asia (3-11) | 0 | 0,28 | 0,48 | 0,63 | 0,72 | 0,86 | 0,91 | 0,96 | 1,00 |

Kerusakan maksimum rata-rata Asia (euro/m2, 2010): hunian 111 (Eropa 750 pada 2007), niaga 138, industri 114, transportasi 209; fungsi Indonesia hunian berada di kelompok 2 sampai 100. Biaya konstruksi per m2 = a x (PDB per kapita)^b, dolar 2010, dengan hunian a = 24,078 dan b = 0,3852; niaga 33,642 dan 0,3574; industri 30,824 dan 0,3249; kerusakan struktur maksimum = biaya x nilai tersusut x (1 - bagian tak bisa rusak) x faktor material; isi perabot = faktor kepentingan isi (0,5 untuk hunian) x struktur; total = struktur + isi. [web-baca] https://climaax.github.io/crabook-test/resources/FAQ/maximum_damages.html Kurva Asia dinormalkan ke 1 pada 6 m dari sumber beragam; ketidakpastian besar. Konversi ke rupiah (kurs, tahun harga) wajib `asumsi-kebijakan`.

Tsunami: studi kerapuhan Sunda Strait dan Palu 2018 (NHESS, GEM) menyebut kedalaman aliran deskriptor terbaik; belum dibaca. [web-cari] https://nhess.copernicus.org/preprints/nhess-2020-395/nhess-2020-395-ATC2.pdf

### 3.3 Kerapuhan bangunan untuk Indonesia

Kurva kerapuhan resmi BNPB: **tidak ditemukan**. Ditemukan, belum dibaca isinya: kurva GPR rumah nonteknis Indonesia (ITB, Buildings 2022, https://mdpi.com/2075-5309/13/1/59) dan kerapuhan dinding pengekang (poster SEISMIC, metode GEM). [web-cari] HAZUS: kurva lognormal P[DS >= ds | S] = Phi[ ln(S / S_median,ds) / beta_ds ]; kerugian = jumlah (peluang tiap tingkat x rasio biaya perbaikan x nilai). Primer: FEMA Hazus Earthquake Technical Manual 6.1 Bagian 5.4.2 (rumus dari sumber sekunder).

### 3.4 Pencitraan: grading Copernicus EMS, Damage Proxy Map, FloodScan

- Copernicus EMS rapid mapping (produk grading): kelas dari EMS-98: rusak (tingkat 1 sampai 3), hancur (4 sampai 5), rusak tak terlihat, mungkin rusak; disebut proksi hampir waktu nyata, bukan data lapangan, dan standar baku penilaian satelit belum ada. [web-baca] https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/detection-methods-damage-assessment/
- ARIA Damage Proxy Map (NASA JPL): peta perubahan koherensi InSAR antara pasangan sebelum dan sesudah; kehilangan koherensi dianggap tanda kerusakan; ambang ditentukan dengan data validasi luar. Rujukan: Yun dkk 2015 (SRL 86). Ambang numerik **tidak ditemukan**. [web-cari] https://directreadout.sci.gsfc.nasa.gov/ndrc_documents/Yun_FPM_DPM_NDRC_share.pdf
- FloodScan (AER): fraksi banjir dari gelombang mikro pasif (AMSR2, GMI) pada sekitar 22 km diturunkan ke 90 m; hanya banjir besar (di atas 19 km2), lemah di pantai 5 sampai 10 km dan di bawah hujan atau vegetasi rapat. [web-cari] https://cdn.shopify.com/s/files/1/0457/2164/9312/files/FloodScan_Data_Users_Guide_v05r01_r03.pdf
- GAR atau CAPRA: kerugian tahunan rata-rata (AAL) = luas di bawah kurva peluang terlampaui kerugian; frekuensi terlampaui kerugian p = jumlah atas peristiwa (frekuensi tahunan x peluang kerugian di atas p dengan syarat peristiwa itu); rasio kerugian bersyarat intensitas lazim berdistribusi beta pada [0,1] (konvensi OpenQuake). [web-cari] https://www.undrr.org/building-risk-knowledge/risk-and-resilience/methodology
- 
## Bagian 4. F1 ID kejadian dan penggabungan

| Standar | Format dan aturan | Sumber |
| --- | --- | --- |
| GLIDE | `XX-YYYY-NNNNNN-CCC`: kode bahaya dua huruf, tahun, nomor seri enam digit, kode negara ISO tiga huruf; contoh EQ-2001-000033-IND. Dikeluarkan GLIDEnumber.net sejak 2004 dengan ADRC. Daftar kode bahaya dan aturan kejadian lintas negara **tidak ditemukan** | [web-baca] https://glidenumber.net/glide/public/about.jsp |
| EM-DAT DisNo | `YYYY-NNNN` (tahun + nomor urut empat digit) lalu kode ISO negara di tabel publik; satu kejadian lintas negara memakai DisNo sama dengan baris per negara. Masuk bila: minimal 10 meninggal atau hilang, atau 100 terdampak, atau pernyataan darurat atau permintaan bantuan internasional; dua sumber | [web-baca] https://doc.emdat.be/docs/data-structure-and-content/emdat-public-table/ ; [web-cari] https://doc.emdat.be/docs/protocols/entry-criteria/ |
| Sendai Framework Monitor | 38 indikator untuk tujuh target A sampai G (A kematian dan hilang per 100.000, B terdampak, C kerugian terhadap PDB, D prasarana dan layanan dasar rusak, E strategi PRB, F kerja sama, G peringatan dini dan informasi risiko); klasifikasi bahaya UNDRR-ISC Hazard Information Profiles 2020 (jumlah 281 menurut ringkasan sekunder; format kode **tidak ditemukan**) | [web-cari] https://www.preventionweb.net/sendai-framework/sendai-framework-indicators |
| Satu Data Bencana (nasional) | Perban BNPB 1/2023 Pasal 8 huruf c: Walidata (unit BNPB pengelola data dan informasi) menyiapkan kriteria kejadian bencana, jangka waktu pengumpulan data kejadian, dan **nomor induk tiap kejadian**; format nomor induk **tidak ditemukan** di korpus. Standar data kejadian dan dampak: Juknis 7/2023 (teks tidak ada); Perka 8/2011 Standarisasi Data Kebencanaan sudah tidak berlaku | [teks] ; [repo] `docs/bnpb/PETA-PERATURAN.md` |

Catatan data: Perban 1/2023 Pasal 4-5 membagi data bencana menjadi prabencana (ancaman, kerentanan, kapasitas, keterpaparan, program PRB), saat tanggap darurat (kejadian, kebutuhan, akibat manusia, kerusakan sosial-ekonomi, prasarana vital, rumah, pelayanan dasar, aset penanganan), pascabencana (dampak per sektor, program pemulihan), dan pembiayaan; peta isi Buku Besar F1. [teks]

Aturan penggabungan kejadian yang sudah ada di repo [repo]: `data/kajian-bnpb/juklak/DATA-DAMPAK.md`: pasangkan dulu sebelum menambah; cocok bila jenis, provinsi, kabupaten, dan tanggal mulai sama; satu cocok berarti tambah entri, nol berarti buat kejadian baru, lebih dari satu berarti tolak dan minta pilih. Angka: 58,9% kejadian logbook Dalops juga ada di DIBI; 75,9% kejadian hanya sekali dilaporkan. Entity resolution usulan (bukan dari peraturan): kunci jenis kanonik + kode kab BPS + tanggal mulai dengan toleransi hari, tinjauan manusia untuk yang ambigu. ReliefWeb tidak dipakai (U6).

## Bagian 5. F2 Paparan

- **GEM Global Exposure Model**: mencakup 215 negara dan wilayah; kelas bangunan memakai GEM Building Taxonomy (v4.0 untuk model Asia Timur; taksonomi v3 diluncurkan Jun 2025 dengan 13 atribut: sistem struktur, bahan, tinggi, atap, fondasi dan lain-lain). Indonesia ada di Asia Tenggara. [web-cari] https://docs.openquake.org/global_risk_model/exposure.html ; https://www.globalquakemodel.org/GEMNews/gem-building-taxonomy-v3-launch . GED4ALL memperluas taksonomi GEM v2 untuk multi-bahaya; laporan GEM Indonesia Exposure Development (AIFDR) belum dibaca.
- **Open Buildings v3 (Google)**: skor keyakinan 0,65 sampai 1,0; tiap sel S2 punya ambang untuk presisi 80%, 85%, 90%; situs resmi menyarankan membuang deteksi di bawah ambang presisi 90%. Indonesia masuk liputan v3 (Mei 2023). [web-cari] https://sites.research.google/open-buildings/ . Repo memakai ambang tunggal 0,70 (`scripts/umum/bangunan.py` AMBANG_KEYAKINAN) [repo]: pertimbangkan ambang per sel.
- **Kelas bahaya InaRISK**: raster 100 m nilai 0 sampai 1 (`docs/multi-bencana/SUMBER-BNPB.md`). Batas kelas di repo tidak seragam: `scripts/bnpb/ikd.py` dan `terpapar.py`: rendah di bawah 0,33, sedang 0,33 sampai 0,66, tinggi di atas 0,66; `inarisk_vs_kejadian.py`: tinggi bila H >= 0,67. Perka 2/2012 Pedoman Umum Pengkajian Risiko Bencana hanya tiga halaman tanpa lampiran dan tidak memuat batas (PETA-PERATURAN baris 101). Sumber resmi batas kelas **tidak ditemukan**. API: `/get-infra-risk/{ALL|kode_kab}/{bahaya}` memberi penduduk, bangunan, RS, puskesmas, sekolah, madrasah, bandara, pelabuhan, obvitnas per kelas. [repo]
- **Fasilitas vital menurut pedoman BNPB**: kategori InaRISK di atas (RS, puskesmas, sekolah, madrasah, bandara, pelabuhan, obvitnas). Perban 1/2023 Pasal 5 menyebut data "prasarana dan sarana vital" dan "pelayanan dasar". Daftar baku fasilitas vital di Perka BNPB **tidak ditemukan**; Perban 3/2022 Pasal 4 hanya menyebut prioritas prasarana dan sarana vital. [teks/repo]

## Bagian 6. F6 Risiko masa depan dan tata ruang

- **NEX-GDDP-CMIP6** (Thrasher dkk 2022, Scientific Data 9:262, doi 10.1038/s41597-022-01393-4): 35 model; delapan variabel (hurs, huss, pr, rlds, rsds, sfcWind, tas, tasmax, tasmin); historis 1950-2014, SSP126/245/370/585 untuk 2015-2100; grid 0,25 derajat harian; BCSD harian dengan acuan GMFD 1960-2014, pemetaan kuantil jendela plus minus 15 hari. Keterbatasan (penulis): pola spasial relatif dianggap tetap, nilai ekstrem bisa terlalu rendah karena penghalusan, hasil hujan bergantung data observasi. CC0 sejak September 2022; `s3://nex-gddp-cmip6`. [web-baca] https://pmc.ncbi.nlm.nih.gov/articles/PMC9163132 ; https://registry.opendata.aws/nex-gddp-cmip6/ . Cocok dengan keputusan 29 (baca di tempat).
- **Indeks ETCCDI** [web-baca] https://etccdi.pacificclimate.org/list_27_indices.shtml : Rx1day (hujan harian maksimum), Rx5day (total maksimum 5 hari berturut), CDD (hari berturut dengan RR di bawah 1 mm), CWD (RR sama atau di atas 1 mm), R10mm dan R20mm, R95pTOT dan R99pTOT (total hujan hari basah di atas persentil ke-95 atau ke-99 periode 1961-1990), SDII, PRCPTOT.
- **IPCC AR6, kenaikan muka laut global relatif 1995-2014**, median dan rentang mungkin 17 sampai 83% (AR6 WG1 Bab 9, lewat tabel HKO) [web-baca] https://www.hko.gov.hk/en/climate_change/proj_global_sea_level.htm :

| Skenario | 2050 | 2100 |
| --- | --- | --- |
| SSP1-1.9 | 0,18 (0,15 sampai 0,23) m | 0,38 (0,28 sampai 0,55) m |
| SSP1-2.6 | 0,19 (0,16 sampai 0,25) | 0,44 (0,32 sampai 0,62) |
| SSP2-4.5 | 0,20 (0,17 sampai 0,26) | 0,56 (0,44 sampai 0,76) |
| SSP3-7.0 | 0,22 (0,18 sampai 0,27) | 0,68 (0,55 sampai 0,90) |
| SSP5-8.5 | 0,23 (0,20 sampai 0,29) | 0,77 (0,63 sampai 1,01) |

Keyakinan rendah SSP5-8.5: 0,88 (0,63 sampai 1,60) m pada 2100. Relatif 1900 tambah 0,158 m [web-cari]. Rata-rata global; penurunan muka tanah pesisir tidak dihitung (rujukan `abidin-2015-jakarta` di `pustaka.json`). Periode lazim AR6 (2021-2040, 2041-2060, 2081-2100) **tidak diverifikasi**.
- **Hukum tata ruang** [teks/web]: UU 24/2007 Pasal 35 memasukkan persyaratan analisis risiko bencana serta pelaksanaan dan penegakan rencana tata ruang sebagai kegiatan prabencana; Pasal 36 ayat (4)-(5): rencana penanggulangan memuat pengenalan ancaman, kerentanan, analisis dampak, pilihan PRB, ditinjau berkala (PP 21/2008: dua tahun, hasil pencarian); Pasal 39 pemaduan ke rencana pembangunan (nomor pasal dari salinan OCR, cek ulang). UU 26/2007 Penataan Ruang: konsiderans berbasis mitigasi bencana, kawasan rawan bencana masuk kawasan lindung, terakhir diubah UU 6/2023, turunan PP 21/2021 memuat peta kawasan rawan bencana. **Pasal 6 dan Pasal 20 UU 26/2007 tidak terverifikasi.** Analisis "bangunan tumbuh di zona bahaya" tidak punya dasar angka peraturan; label `hipotesis`.

## Bagian 7. F7 Pintu tunggal

- **Satu Data**: Perpres 39/2019: data memenuhi standar data, bermetadata, interoperabel, memakai kode referensi atau data induk; peran Pembina, Walidata, Produsen, Forum SDI. [web-cari] https://setkab.go.id/presiden-jokowi-tandangani-perpres-no-392019-tentang-satu-data-indonesia/ . Turunan BNPB, Perban 1/2023: Walidata Bencana adalah unit BNPB pengelola data dan informasi; Forum Satu Data Bencana diketuai Sekretaris Utama, rapat minimal dua kali setahun; penyebaran di portal Satu Data Indonesia dan Satu Data Bencana (Pasal 9, 12). [teks]
- **MHEWS** (WMO, UNDRR, UNESCO 2018): empat elemen: pengetahuan risiko; deteksi, pemantauan, analisis, prakiraan; diseminasi dan komunikasi peringatan; kapasitas kesiapsiagaan dan respons. [web-cari] https://www.preventionweb.net/quick/46954 . UU 24/2007 Pasal 46 ayat (2): pengamatan gejala, analisis, keputusan pihak berwenang, penyebarluasan, tindakan masyarakat. [web-baca]
- **NDMA India SACHET**: platform peringatan terpadu berbasis Common Alerting Protocol (CAP, XML), NDMA bersama C-DOT; lembaga penghasil peringatan (IMD, CWC, INCOIS) dan pengesah di satu platform; SMS dan cell broadcast bergeo-target; umpan CAP RSS untuk media; 36 negara bagian dan wilayah. [web-cari] https://www.microsave.net/2025/07/24/turning-the-tide-how-indias-sachet-system-is-reshaping-disaster-preparedness/
- **FEMA OpenFEMA**: Disaster Declarations Summaries v2 di `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries` (diperbarui tiap 20 menit; v2 menambah Region, Incident Identifier sebelum jadi bencana resmi, Declared Incident Types). Nama kolom persis **tidak terverifikasi**; ambil dari `/api/open/v1/DataSetFields`. [web-cari] https://www.fema.gov/about/openfema/disaster-declarations-summaries
- **Jepang (bosai)**: SIP4D (NIED dan Hitachi) hub berbagi informasi lintas lembaga, kerangka data bersama SIP4D-ZIP (JSA-S1016:2023); J-Alert (peringatan nasional seketika), L-Alert (informasi lokal ke media). Teks Rencana Dasar Penanggulangan Bencana **tidak ditemukan**. [web-cari] https://www.jstage.jst.go.jp/article/jdr/17/6/17_976/_article/-char/en ; https://www.preventionweb.net/quick/99966
- **Di repo**: `/semua`, `src/mcp.js`, `src/ai.js` dibungkus, tidak diganti (keputusan 22).

## Yang harus diputuskan pemilik

1. **Tarif stimulan rumah (U4).** Tiga angka beredar: Rp50/25/10 juta (sejak 2010), Rp60/30/15 juta (Keputusan Kepala BNPB 296.A/2023 menurut dokumen BPK; Kemenko PMK Jan 2024 menyebut peraturan badan belum disusun), usulan Rp80 juta RB untuk Sumatra 2026. Juklak 5/2024 tidak punya teks di korpus. Usul: F4 memakai 60/30/15 berlabel `asumsi-kebijakan` dengan tanggal, sampai teks resmi didapat dan dikonfirmasi pemilik.
2. **Dasar Jitupasna.** Perka 15/2011 masih satu-satunya pedoman dan merujuk pedoman umum yang sudah diganti Perban 6/2017. Pakai Perka 15/2011 apa adanya (rumus kerusakan jelas, rumus kerugian tidak tunggal), atau pemilik menugaskan pengganti? Status Perka 17/2010 perlu dicek ke JDIH.
3. **Dua taksonomi sektor.** Sektor Jitupasna (Formulir 05) dan lima sektor R3P (Perban 5/2017 Pasal 8) tidak identik. Putuskan peta baku dan di mana "roboh total" dipisah dari RB.
4. **Standar kebutuhan dasar.** Perka 7/2008 (air 7 lalu 15 liter, penampungan 3 m2) berbeda dari Sphere 2018 (15 liter, 3,5 m2, belum diverifikasi ke buku). Mana yang menjadi ambang alarm F5? Usul: Perka 7/2008 resmi, Sphere pembanding.
5. **Nomor induk kejadian.** Perban 1/2023 Pasal 8 meminta Walidata menetapkan nomor induk; formatnya tidak ditemukan. Bolehkah F1 memakai ID sendiri yang dipetakan ke GLIDE dan DisNo EM-DAT, dan siap diganti bila Walidata menerbitkan format? Perhatikan GLIDE satu negara per nomor, EM-DAT satu DisNo banyak negara.
6. **Batas kelas InaRISK.** Repo memakai dua definisi (tinggi di atas 0,66 versus 0,67 ke atas). Putuskan satu dan tulis sumber resminya begitu ditemukan; sumber resmi saat ini tidak ditemukan.
7. **Ambang Open Buildings.** Tetap 0,70 tunggal atau ambang per sel S2 untuk presisi 90%?
8. **Parameter F3.** Model kematian gempa mana yang jadi dasar rentang: PAGER global v2 (theta 13,249; beta 0,151) dan ITB Indonesia (rumus 10^(0,62275231 x MMI - 8,03314466)) selisih besar di MMI 6 dan 8. Usul: tampilkan keduanya sebagai batas rentang `estimasi-model`; nilai kurs dan harga untuk JRC wajib `asumsi-kebijakan`.
9. **Ejaan.** Peraturan resmi memakai "kontingensi" (Perban 2/2023); brief awal "kontinjensi". Bawaan: ikut peraturan.
