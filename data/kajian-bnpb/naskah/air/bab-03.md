---
kajian: air
bab: 3
judul: Metodologi dan Data
pertanyaan: Komponen air dan indikator mana yang tersedia per kab/kota, provinsi, balai besar wilayah sungai, titik, atau tidak tersedia sama sekali? Bagaimana kab/kota masuk daftar perhatian, dan bagaimana skenario terburuk, lantai, kemungkinan, serta skala dampaknya ditetapkan? Angka mana yang berbeda versi, dan versi mana yang dipakai?
status: final
target_halaman: 9
---

# Metodologi dan Data {#bab:metodologi}

::: ringkasan-bab
**Temuan:**

- Hanya satu dari lima komponen air, yaitu luas daerah irigasi bergaris dasar 2015, yang tersedia untuk seluruh {{angka:airjawa.jawa.n_kab}} kab/kota Pulau Jawa. Daftar kab/kota kajian karena itu bertumpu pada data kejadian dan risiko Badan Nasional Penanggulangan Bencana (BNPB), yaitu Data dan Informasi Bencana Indonesia (DIBI) dan Indeks Risiko Bencana Indonesia (IRBI).
- {{angka:airjawa.perhatian.varian3.banjir}} kab/kota masuk daftar perhatian banjir, {{angka:airjawa.perhatian.varian3.longsor}} tanah longsor, dan {{angka:airjawa.perhatian.varian3.kekeringan}} kekeringan menurut aturan dua dari lima syarat bersumber resmi atau terverifikasi; daftar banjir bergeser antara {{angka:airjawa.perhatian.rentang_varian.banjir}} kab/kota bila aturan pelaksanaannya diganti.
- {{angka:hidromet.jawa.lantai.meninggal_hilang}} meninggal dan hilang pada musim hujan 2008/2009 menjadi lantai skenario musim hujan Pulau Jawa. Pita model musim analog 2020/2021 melampaui {{angka:hidromet.jawa.lanina.meninggal_hilang_tercatat}} jiwa yang tercatat pada musim itu karena rasio korban jangka panjang dikalikan ke jumlah kejadian musim analog yang tinggi.

**Angka kunci:**

- {{angka:airjawa.jawa.spearman_irbi_dibi.kekeringan|fmt=2}}–{{angka:airjawa.jawa.spearman_irbi_dibi.longsor|fmt=2}} korelasi peringkat IRBI 2025 dengan jumlah kejadian DIBI 2015–2025 per kab/kota (pengolahan data InaRISK dan DIBI).
- {{angka:hidromet.jawa.musim.kemungkinan_lantai_5th|persen}} peluang musim hujan Jawa menyamai atau melampaui lantai dalam lima tahun, pita keempat *National Risk Register* (NRR) (pengolahan data DIBI).
- {{angka:airjawa.air_minum.n_kab_jateng}} dari {{angka:airjawa.jawa.n_kab}} kab/kota memiliki data air minum layak per kab/kota, seluruhnya di Jawa Tengah menurut tabel Badan Pusat Statistik Jawa Tengah 2025.

**Rekomendasi:** @rek:r-a03, @rek:r-a14, @rek:r-a17
:::

::: gambar {#gbr:foto-b03-brantas-nganjuk}
berkas: gambar/foto/air-b03-brantas-nganjuk.jpg
jenis: foto
judul: Sungai Brantas di antara Jatikalen dan Megaluh, Kabupaten Nganjuk, April 2023
pengarang: Pemerintah Kabupaten Nganjuk
lisensi: PD
url: https://commons.wikimedia.org/wiki/File:Sungai_Brantas_Jatikalen_Megaluh.jpg
potong: dipotong tengah ke rasio 2:1
lebar: penuh
:::


## Kerangka Analisis {#sub:kerangka}

**Kajian ini menilai {{angka:airjawa.jawa.n_kab}} kab/kota di enam provinsi Pulau Jawa dari data kejadian dan risiko Badan Nasional Penanggulangan Bencana (BNPB).** Data kejadian berasal dari Data dan Informasi Bencana Indonesia (DIBI) per kab/kota per tahun 2008–2026 yang ditarik 23 Oktober 2026 pukul 15.23 WIB [@bnpb-dibi]. Data risiko berasal dari Indeks Risiko Bencana Indonesia (IRBI) 2015–2025 [@bnpb-irbi] dan Kajian Risiko Bencana (KRB) 2022–2026 InaRISK yang memuat penduduk terpapar dan potensi kerugian [@bnpb-2026-krb], keduanya disusun menurut Perka BNPB 2/2012 [@bnpb-2012-pengkajian-risiko]. Komponen air tampil pada tingkat wilayah yang datanya tersedia, dan tingkat yang kosong ditulis sebagai permintaan data. Alur pada @gbr:rantai-metode bergerak dari sumber data ke paket data per tema, lalu ke empat aturan kajian (daftar perhatian; skenario dan lantai; kerugian; kepekaan) yang dipakai bab-bab berikutnya.

::: gambar {#gbr:rantai-metode}
berkas: gambar/air/rantai-metode.png
jenis: diagram
judul: Rantai metode dari sumber data ke bab pemakai, kajian ketahanan air Pulau Jawa 2026
sumber: Pengolahan Pantau Bencana dari DIBI BNPB, InaRISK BNPB, BPS, Kementerian Pekerjaan Umum, dan literatur terverifikasi
keyakinan: asumsi-kebijakan
lebar: penuh
data_per: 23 Okt 2026

Kotak Estimasi model adalah keluaran simulasi, bukan Data Bencana menurut Perban BNPB 1/2023.
:::

## Unit Analisis dan Resolusi Data per Komponen {#sub:resolusi}

**Dari lima komponen air, hanya luas daerah irigasi (DI) yang tersedia untuk seluruh {{angka:airjawa.jawa.n_kab}} kab/kota, dengan garis dasar 2015.** Luas itu diatribusi dari Lampiran I–III Peraturan Menteri PUPR Nomor 14/PRT/M/2015 hasil pengenalan karakter optik, dengan total Jawa {{angka:airjawa.irigasi.jawa_total_ha|satuan}} [@pupr-2015-permen14]. Sebanyak {{angka:airjawa.irigasi.n_subtotal_cocok}} dari {{angka:airjawa.irigasi.n_subtotal_kab}} subtotal Lampiran III cocok penuh dengan baris DI di bawahnya; subtotal tetap dipakai karena lolos cek terhadap rekap resmi. DI kewenangan pusat ada di {{angka:airjawa.irigasi.n_kab_di_pusat}} kab/kota. Kondisi jaringan dan pemutakhiran status DI tidak ditemukan, sehingga luas DI menandai prasarana dan tidak menjawab di mana air kurang.

::: gambar {#gbr:foto-peta-ws-bengawan-solo}
berkas: gambar/foto/air-peta-ws-bengawan-solo.jpg
jenis: foto
judul: Peta Wilayah Sungai Bengawan Solo, Kementerian PUPR, 2015
pengarang: Kementerian PUPR
lisensi: PD
url: https://commons.wikimedia.org/wiki/File:Peta_WS_Bengawan_Solo_(id-java).jpg
lebar: penuh
:::

**Air minum layak per kab/kota hanya tersedia untuk {{angka:airjawa.air_minum.n_kab_jateng}} kab/kota Jawa Tengah, dan komponen lain juga hanya tersedia sebagian.** Angka air minum itu berasal dari tabel Badan Pusat Statistik (BPS) Jawa Tengah yang diperbarui 14 April 2026, dan indikator layak tidak sama dengan aman atau perpipaan. Data bendungan memuat {{angka:airjawa.bendungan.n_paket}} titik, {{angka:airjawa.bendungan.n_resmi_pj2021}} di antaranya dari inventaris Balai Besar Wilayah Sungai (BBWS) Pemali-Juana 2021 [@bbwspj-2021-bendungan] dan sisanya bersumber sekunder, sehingga data itu belum merupakan inventaris lengkap. Air tanah hanya tersedia sebagai potensi {{angka:airjawa.jawa.cat_jumlah}} cekungan air tanah (CAT) tingkat pulau [@bps-2020-slhi]. Status tujuh CAT rusak hanya berasal dari pernyataan pejabat Badan Geologi yang dikutip media, sehingga tidak dipakai sebagai syarat daftar perhatian.

**Laju penurunan muka tanah hanya tersedia sebagai baris literatur per kota; untuk Kota Pekalongan saja, dua kajian terverifikasi memberi {{angka:airjawa.turun_tanah.pekalongan.sidiq2023}} dan {{angka:airjawa.turun_tanah.pekalongan.widodo2024|satuan}}.** Periode dan metode ukurnya berbeda antarbaris, sehingga angka satu kota tidak diturunkan ke kab/kota lain. Laju terverifikasi menyebut tujuh kab/kota, yaitu Kab. Bandung, Kab. Bandung Barat, Kota Semarang, Kota Pekalongan, Kab. Demak, Kab. Kendal, dan Kota Surabaya. Angka Demak berasal dari wilayah gabungan dengan Semarang utara-timur, angka Surabaya diukur menurut garis pandang satelit, dan data stasiun Global Navigation Satellite System (GNSS) belum ditarik.

**Pulau Jawa terbagi atas {{angka:airjawa.ws.jumlah}} wilayah sungai (WS), tetapi tautan kab/kota ke WS yang resmi hanya ada untuk WS kategori C dan menyebut dua kab/kota** [@pupr-2015-permen04]. Batas WS juga belum tersedia sebagai data vektor, sehingga rekomendasi per WS diturunkan ke BBWS dan DI kewenangan pusat. Penyebut per jiwa memakai penduduk KRB, yaitu {{angka:airjawa.jawa.penduduk_krb|satuan}} untuk Jawa [@bnpb-2026-krb]. WorldPop R2025A hanya dipakai untuk sebaran di dalam kab/kota karena meleset di pulau kecil dan kota padat [@worldpop-2025]. Tingkat ketersediaan semua komponen dirangkum pada @tbl:resolusi.

::: tabel {#tbl:resolusi}
judul: Tingkat ketersediaan data per komponen dan indikator kajian air Pulau Jawa, data per 2026
sumber: Pengolahan Pantau Bencana dari BPS Jawa Tengah 2025, Permen PUPR Nomor 14/PRT/M/2015, BBWS Pemali-Juana 2021, BPS 2020, DIBI BNPB, dan InaRISK BNPB
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Sel kosong = tingkat tidak tersedia; status tujuh CAT rusak bersumber sekunder, tidak dicantumkan.

| KOMPONEN | KAB/KOTA | PROVINSI | BBWS ATAU WS | TITIK, KOTA, ATAU PULAU | TIDAK TERSEDIA | KEYAKINAN | PEMEGANG DATA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Air minum layak | {{angka:airjawa.air_minum.n_kab_jateng}} kab/kota Jawa Tengah | enam provinsi | – | – | kab/kota di lima provinsi | resmi | BPS provinsi |
| Irigasi (luas DI) | {{angka:airjawa.jawa.n_kab}} kab/kota, garis dasar 2015 | enam provinsi | DI pusat per BBWS | – | kondisi jaringan | resmi | Kementerian Pekerjaan Umum |
| Waduk dan bendungan | – | – | BBWS Pemali-Juana lengkap | {{angka:airjawa.bendungan.n_paket}} titik | inventaris lengkap | resmi dan sekunder per titik | BBWS; Perum Jasa Tirta (PJT) I; PJT II |
| Air tanah | – | – | – | {{angka:airjawa.jawa.cat_jumlah}} CAT tingkat pulau | per kab/kota; zona konservasi | resmi | Kementerian Energi dan Sumber Daya Mineral (ESDM), Badan Geologi |
| Penurunan muka tanah | tujuh kab/kota tertaut | – | – | baris literatur per kota | pengukuran sendiri | terverifikasi | peneliti; pemegang data GNSS |
| Neraca air dan indeks pemakaian air (IPA) | – | – | – | pulau, 2010 | per WS | estimasi-model | Kementerian Pekerjaan Umum |
| Kejadian (DIBI) | {{angka:airjawa.jawa.n_kab}} kab/kota | enam provinsi | – | – | – | resmi | Pusat Data, Informasi, dan Komunikasi Kebencanaan |
| Risiko (IRBI, KRB) | {{angka:airjawa.jawa.n_kab}} kab/kota | enam provinsi | – | – | kelas per bahaya | resmi | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| Debit sungai | – | – | – | – | seluruhnya | – | Kementerian Pekerjaan Umum (BBWS) |
| Genangan rob | kab/kota berkejadian (DIBI) | – | – | titik peringatan Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) | luas genangan | resmi | BMKG |
:::

## Sumber, Produsen Data, dan Label Keyakinan {#sub:sumber}

**Perban BNPB 1/2023 membatasi Data Bencana pada data yang sesuai kriteria walidata bencana [@bnpb-2023-satudata, hlm. 2], sehingga keluaran simulasi Pantau Bencana dalam kajian ini menjadi data pendukung berlabel.** Tiap gambar dan tabel yang memuat keluaran model membawa pernyataan produsen di samping label Estimasi model, dan lampiran data per kab/kota diusulkan diserahkan ke Pusat Data, Informasi, dan Komunikasi Kebencanaan sebagai walidata (@rek:r-a17). Kajian air memakai empat dari lima label keyakinan kajian; label Penilaian pakar tidak dipakai. Resmi berarti terbitan lembaga pemerintah berwenang, sedangkan Terverifikasi berarti sumber primer nonpemerintah yang dibaca langsung. Estimasi model berarti keluaran model atau simulasi dengan tambahan "belum diuji balik" atau "uji balik gagal", dan Asumsi kebijakan berarti nilai pilihan kajian. Angka sekunder dari media atau ringkasan tidak dikutip nilainya.

## IRBI dan DIBI Dibaca Berdampingan {#sub:irbi-dibi}

**Korelasi peringkat IRBI 2025 dengan jumlah kejadian DIBI 2015–2025 per kab/kota hanya {{angka:airjawa.jawa.spearman_irbi_dibi.kekeringan|fmt=2}} untuk kekeringan, {{angka:airjawa.jawa.spearman_irbi_dibi.banjir|fmt=2}} untuk banjir, dan {{angka:airjawa.jawa.spearman_irbi_dibi.longsor|fmt=2}} untuk tanah longsor.** Korelasi tetap lemah bila kejadian diganti jumlah tahun berkejadian atau ukuran korban DIBI. IRBI menggambarkan risiko termodelkan dan DIBI mencatat kejadian yang dilaporkan, sehingga keduanya tidak saling memvalidasi dan disajikan berdampingan pada @tbl:irbi-dibi.

**IRBI 2025 tidak dipakai untuk memeringkat kab/kota karena nilainya bilangan bulat dengan banyak nilai kembar; indeks kekeringan hanya memiliki {{angka:airjawa.jawa.irbi2025.kekeringan_nilai_unik}} nilai unik untuk {{angka:airjawa.jawa.n_kab}} kab/kota.** Status total 2025 pun nyaris seragam, yaitu {{angka:airjawa.jawa.irbi2025.n_sedang}} Sedang dan {{angka:airjawa.jawa.irbi2025.n_tinggi}} Tinggi (Kab. Sukabumi), sedangkan kelas per bahaya tidak tersedia di sumber [@bnpb-irbi]. Nilai 2025 juga tidak dibandingkan dengan 2015–2024 karena skalanya berubah. IRBI 2025 tidak menilai abrasi di {{angka:airjawa.jawa.irbi2025.abrasi_kosong}} kab/kota dan tanah longsor di {{angka:airjawa.jawa.irbi2025.longsor_kosong}} kab/kota, padahal {{angka:airjawa.jawa.irbi2025.longsor_kosong_berkejadian}} kab/kota dari kelompok terakhir mencatat kejadian longsor DIBI, antara lain Kota Adm. Jakarta Selatan dan Kota Yogyakarta. Sel seperti itu ditulis "tidak dinilai" dan tidak dibaca sebagai nol.

## Aturan Daftar Perhatian Kab/Kota {#sub:daftar}

Kab/kota masuk daftar perhatian suatu bahaya bila memenuhi paling sedikit dua dari lima syarat di bawah ini, menurut data IRBI 2025 dan DIBI 2015–2025 [@bnpb-irbi; @bnpb-dibi]. Syarat tidak dijumlah menjadi skor dan tidak menghasilkan peringkat; nilai kembar di batas kelas ikut masuk, dan daftar berlabel Asumsi kebijakan.

- (a) Nilai IRBI 2025 bahaya itu berada di kelas teratas dari lima kelas nilai untuk {{angka:airjawa.jawa.n_kab}} kab/kota, dengan batas kelas yang sama dengan peta.
- (b) DIBI mencatat kejadian bahaya itu pada paling sedikit tiga dari sebelas tahun 2015–2025, dihitung dari jumlah baris kejadian.
- (c) Jumlah meninggal dan hilang atau jumlah mengungsi DIBI 2015–2025 berada di kuartil atas Jawa.
- (d) Kondisi struktural air terverifikasi, yaitu laju penurunan muka tanah terverifikasi atau DI kewenangan pusat.
- (e) Status siaga darurat atau tanggap darurat berulang menurut surat keputusan kepala daerah, bila datanya diperoleh.

Syarat (b) dan (c) bergantung pada cara DIBI mencatat. Juklak BNPB 7/2023 mencatat satu kejadian sebagai bencana bila memenuhi salah satu kriteria, yaitu {{angka:juklak_2023.ambang.meninggal|satuan}} meninggal, {{angka:juklak_2023.ambang.terdampak|satuan}} terdampak/luka/mengungsi, {{angka:juklak_2023.ambang.rumah_rusak|satuan}} rumah atau fasilitas publik rusak, {{angka:juklak_2023.ambang.lahan|satuan}} lahan, atau adanya permintaan bantuan nasional maupun penetapan status darurat [@bnpb-2023-standar-data, hlm. 7]. Seri DIBI juga berpatahan; kategori Banjir Bandang, Banjir dan Tanah Longsor, serta Banjir Rob baru muncul pada 2018 dan kosong pada 2024, sedangkan tanah longsor 2024 hanya {{angka:dibi.nasional.longsor_kejadian_2024}} kejadian nasional, jauh di bawah tahun lain yang mencatat {{angka:dibi.nasional.longsor_kejadian_tahun_lain|satuan}} [@bnpb-dibi].

**Uji aturan pada {{angka:airjawa.jawa.n_kab}} kab/kota memperlihatkan bahwa ambang tiga dari sebelas tahun hampir tidak membedakan kab/kota untuk banjir, karena {{angka:airjawa.perhatian.syarat_b.banjir}} kab/kota memenuhinya.** Sebanyak {{angka:airjawa.perhatian.banjir_tiap_tahun}} kab/kota bahkan mencatat banjir pada kesebelas tahun, sedangkan ambang yang sama dipenuhi {{angka:airjawa.perhatian.syarat_b.longsor}} kab/kota untuk tanah longsor dan {{angka:airjawa.perhatian.syarat_b.kekeringan}} untuk kekeringan. Pada syarat (a), batas interval sama hanya menangkap {{angka:airjawa.perhatian.syarat_a.banjir_interval_sama}} kab/kota banjir karena satu nilai pencilan di Kota Mojokerto, sedangkan batas kuantil menangkap {{angka:airjawa.perhatian.syarat_a.banjir_kuantil}}. Syarat (c) kosong untuk kekeringan karena DIBI tidak mencatat korban jiwa maupun pengungsi akibat kekeringan pada 2015–2025. Penanda struktural (d) dipenuhi tujuh kab/kota melalui penurunan muka tanah dan {{angka:airjawa.irigasi.n_kab_di_pusat}} melalui DI kewenangan pusat, sedangkan surat keputusan status darurat untuk syarat (e) tidak diperoleh.

**Kajian mengunci empat pilihan pelaksanaan, dan hasilnya {{angka:airjawa.perhatian.varian3.banjir}} kab/kota untuk banjir, {{angka:airjawa.perhatian.varian3.longsor}} untuk tanah longsor, serta {{angka:airjawa.perhatian.varian3.kekeringan}} untuk kekeringan.** Pertama, batas kelas syarat (a) memakai kuantil dengan nilai kembar ikut, sama dengan kelas peta. Kedua, syarat (d) dipetakan per bahaya, yaitu penurunan muka tanah untuk banjir dan rob, DI kewenangan pusat untuk kekeringan, dan tanpa penanda untuk tanah longsor; memakai DI pusat untuk semua bahaya akan menaikkan daftar banjir menjadi {{angka:airjawa.perhatian.varian4.banjir}} kab/kota tanpa kaitan sebab dengan banjir. Ketiga, ambang syarat (b) tetap tiga dari sebelas tahun. Keempat, syarat (c) kekeringan mengikuti teks aturan, dan varian dengan jumlah menderita dan mengungsi menjadi uji kepekaan ({{angka:airjawa.perhatian.varian3.kekeringan_c_terdampak}} kab/kota). Nama kab/kota per bahaya tampil di Bab 5 dan Bab 6 menurut urutan kode wilayah.

::: tabel {#tbl:daftar-perhatian}
judul: Jumlah kab/kota di daftar perhatian menurut varian aturan dan bahaya, Pulau Jawa, 2015–2025 (kab/kota)
sumber: Pengolahan Pantau Bencana dari InaRISK BNPB (IRBI 2025) dan DIBI BNPB 2015–2025
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Baris ketiga varian yang dipakai; kolom terakhir mengganti syarat (c) dengan menderita dan mengungsi.
angka: 4; 5; 6; 7

| BATAS KELAS SYARAT (A) | PEMETAAN SYARAT (D) | AMBANG SYARAT (B) | BANJIR | TANAH LONGSOR | KEKERINGAN | KEKERINGAN, (C) TERDAMPAK |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| interval sama | per bahaya | tiga tahun atau lebih | {{angka:airjawa.perhatian.varian1.banjir}} | {{angka:airjawa.perhatian.varian1.longsor}} | {{angka:airjawa.perhatian.varian1.kekeringan}} | {{angka:airjawa.perhatian.varian1.kekeringan_c_terdampak}} |
| interval sama | semua penanda | tiga tahun atau lebih | {{angka:airjawa.perhatian.varian2.banjir}} | {{angka:airjawa.perhatian.varian2.longsor}} | {{angka:airjawa.perhatian.varian2.kekeringan}} | {{angka:airjawa.perhatian.varian2.kekeringan_c_terdampak}} |
| kuantil | per bahaya | tiga tahun atau lebih | {{angka:airjawa.perhatian.varian3.banjir}} | {{angka:airjawa.perhatian.varian3.longsor}} | {{angka:airjawa.perhatian.varian3.kekeringan}} | {{angka:airjawa.perhatian.varian3.kekeringan_c_terdampak}} |
| kuantil | semua penanda | tiga tahun atau lebih | {{angka:airjawa.perhatian.varian4.banjir}} | {{angka:airjawa.perhatian.varian4.longsor}} | {{angka:airjawa.perhatian.varian4.kekeringan}} | {{angka:airjawa.perhatian.varian4.kekeringan_c_terdampak}} |
| interval sama | per bahaya | kuartil atas Jawa | {{angka:airjawa.perhatian.varian5.banjir}} | {{angka:airjawa.perhatian.varian5.longsor}} | {{angka:airjawa.perhatian.varian5.kekeringan}} | {{angka:airjawa.perhatian.varian5.kekeringan_c_terdampak}} |
| kuantil | per bahaya | kuartil atas Jawa | {{angka:airjawa.perhatian.varian6.banjir}} | {{angka:airjawa.perhatian.varian6.longsor}} | {{angka:airjawa.perhatian.varian6.kekeringan}} | {{angka:airjawa.perhatian.varian6.kekeringan_c_terdampak}} |
:::

## Skenario Terburuk yang Masuk Akal {#sub:skenario}

Skenario terburuk yang masuk akal (*reasonable worst case*) mengikuti definisi National Risk Register (NRR) Pemerintah Inggris, yaitu perwujudan terburuk suatu risiko yang masih masuk akal setelah variasi yang sangat tidak mungkin disisihkan [@cabinetoffice-2025-nrr, hlm. 11]. Perban BNPB 2/2023 Pasal 7 meminta rencana kontinjensi memuat skenario kejadian dan asumsi dampak di samping karakteristik ancaman, dan lampirannya membuka pertimbangan sejarah kejadian terburuk [@bnpb-2023-renkon, hlm. 4 dan 14]. Skenario tidak boleh lebih ringan daripada lantai, yaitu kejadian atau musim tercatat terburuk untuk jenis dan wilayah yang sama. Tiap jenis bahaya mendapat kartu sendiri dengan lantai kejadian tunggal dan tahun tercatat terburuk untuk jenis dan wilayah itu; kartu musim hujan dan musim kemarau adalah kartu agregat operasional dan tidak menggantikan kartu per jenis. Yang boleh disisihkan hanya kejadian berpeluang lima tahun di bawah {{angka:nrr_2025.pita1_batas_persen|persen}} dengan alasan tertulis. Periode acuan hidrometeorologi adalah delapan belas musim hujan 2008/2009–2025/2026, dengan penanda patahan pada 2018 dan 2024.

**Lantai meninggal dan hilang musim hujan Pulau Jawa adalah {{angka:hidromet.jawa.lantai.meninggal_hilang|satuan}} pada 2008/2009, tetapi metrik lain mencapai puncaknya pada musim berbeda.** Meninggal terbanyak, {{angka:hidromet.jawa.musim_2025.meninggal|satuan}}, terjadi pada 2025/2026; mengungsi terbanyak, {{angka:hidromet.jawa.musim_2013.mengungsi|satuan}}, pada 2013/2014; dan rumah rusak berat terbanyak, {{angka:hidromet.jawa.musim_2009.rumah_rb|satuan}}, pada 2009/2010 [@bnpb-dibi]. Musim 2019/2020 mencatat {{angka:hidromet.jawa.musim_2019.mengungsi|satuan}} mengungsi bila rekaman Kota Bekasi 1 Januari 2020 sebanyak {{angka:hidromet.jawa.jabodetabek2020.mengungsi_bekasi|satuan}}, yang belum terverifikasi, ikut dihitung; kedua angka itu ditulis berdampingan. Lantai ditetapkan per metrik.

**Pita model musim analog 2020/2021 melampaui {{angka:hidromet.jawa.lanina.meninggal_hilang_tercatat|satuan}} meninggal dan hilang yang tercatat pada musim itu, karena musim itu memuat {{angka:hidromet.jawa.lanina.kejadian}} kejadian, terbanyak dari delapan belas musim.** Model, yang belum diuji balik, memberi {{angka:hidromet.jawa.lanina.korban_jiwa|satuan}} meninggal dan hilang dengan mengalikan jumlah kejadian musim analog dengan rasio meninggal dan hilang per kejadian per jenis 2010–2025. Rasio tahunan Jawa turun ketika jumlah kejadian naik. Untuk tanah longsor, {{angka:hidromet.jawa.lanina.kejadian_longsor}} kejadian dikalikan median rasio {{angka:hidromet.jawa.rasio_longsor_median_2010_2025|fmt=2}} memberi batas rendah {{angka:hidromet.jawa.lanina.korban_jiwa_longsor|rendah|satuan}}, padahal rasio musim itu sendiri {{angka:hidromet.jawa.lanina.rasio_longsor_musim|fmt=2}}. Penurunan rasio itu sejalan dengan pencatatan kejadian kecil yang makin lengkap; dugaan ini belum diuji. Nilai skenario per metrik adalah nilai terbesar dari batas tinggi pita model dan lantai, batas pita di bawah lantai dinaikkan ke lantai dengan catatan, dan batas tinggi model hanya tampil di kartu skenario bersama penjelasan ini.

**Peluang musim hujan Jawa menyamai atau melampaui lantai dalam lima tahun adalah {{angka:hidromet.jawa.musim.kemungkinan_lantai_5th|persen}}, di pita keempat NRR dan dekat batas pita kelima.** NRR menilai peluang skenario itu sendiri terjadi paling sedikit sekali dalam lima tahun, dengan batas pita {{angka:nrr_2025.pita1_batas_persen|persen}}, {{angka:nrr_2025.pita2_atas_persen|persen}}, {{angka:nrr_2025.pita4_bawah_persen|persen}}, dan {{angka:nrr_2025.pita5_batas_persen|persen}} [@cabinetoffice-2025-nrr, hlm. 12]. Tiap metrik lantai tercapai satu kali dalam delapan belas musim, dan peluang itu dihitung dari laju Poisson satu per delapan belas musim. Karena lantai adalah nilai terbesar seri, frekuensi itu ditentukan panjang seri. Tiap musim terburuk per metrik juga lebih sering terjadi daripada pita pertama, sehingga tidak ada musim Jawa yang boleh disisihkan.

**Perban BNPB 2/2023 tidak memuat kelas atau ambang dampak, sehingga skala dampak lima kelas dalam kajian ini sepenuhnya Asumsi kebijakan.** Asumsi dampak diproyeksikan terhadap lima aspek Pasal 7 ayat (5), yaitu lingkungan, kependudukan, ekonomi, infrastruktur/fisik, dan layanan sipil [@bnpb-2023-renkon]. Kelas skenario mengikuti aspek terberat. Ambang kelas ditarik dari sebaran DIBI per provinsi per tahun pada @tbl:skala-dampak dengan skala logaritmik seperti NRR [@cabinetoffice-2025-nrr, hlm. 13–15], dan unit skala disamakan dengan unit kartu. Aspek ekonomi dan lingkungan tidak dapat dikelaskan dari DIBI, sehingga ditulis "tidak dinilai" atau memakai nilai aset terpapar KRB sebagai batas atas berlabel.

::: tabel {#tbl:skala-dampak}
judul: Sebaran dampak DIBI per provinsi per tahun sebagai dasar skala dampak, Indonesia, 2008–2025
sumber: Pengolahan Pantau Bencana dari DIBI BNPB 2008–2025, klasifikasi bencana alam, cakupan bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Persentil inklusif per provinsi per tahun; aspek ekonomi dan lingkungan tidak tercatat di DIBI.
angka: 3; 4; 5; 6

| ASPEK PERBAN 2/2023 | BESARAN DIBI | MEDIAN | PERSENTIL 90 | PERSENTIL 99 | MAKSIMUM |
| --- | --- | ---: | ---: | ---: | ---: |
| Kependudukan | meninggal dan hilang (jiwa) | {{angka:dibi.provinsi_tahun.meninggal_hilang.p50}} | {{angka:dibi.provinsi_tahun.meninggal_hilang.p90}} | {{angka:dibi.provinsi_tahun.meninggal_hilang.p99}} | {{angka:dibi.provinsi_tahun.meninggal_hilang.maks}} |
| Kependudukan | mengungsi (jiwa) | {{angka:dibi.provinsi_tahun.mengungsi.p50}} | {{angka:dibi.provinsi_tahun.mengungsi.p90}} | {{angka:dibi.provinsi_tahun.mengungsi.p99}} | {{angka:dibi.provinsi_tahun.mengungsi.maks}} |
| Infrastruktur/fisik | rumah rusak (unit) | {{angka:dibi.provinsi_tahun.rumah_rusak.p50}} | {{angka:dibi.provinsi_tahun.rumah_rusak.p90}} | {{angka:dibi.provinsi_tahun.rumah_rusak.p99}} | {{angka:dibi.provinsi_tahun.rumah_rusak.maks}} |
| Layanan sipil | fasilitas rusak (unit) | – | – | – | – |
| Ekonomi | – | – | – | – | – |
| Lingkungan | – | – | – | – | – |
:::

Matriks pada @tbl:kuantifikasi menjadi kontrak isi kartu skenario Bab 5 dan Bab 6, dan menyebut apakah suatu besaran resmi, turunan, estimasi model, atau tidak dikuantifikasi untuk tiap jenis [@bnpb-dibi; @bnpb-2026-krb]. Besaran luka tidak dipakai karena tidak stabil antartahun dan tidak tersedia dalam data skenario.

## Kerugian Materiil dan Imateriil {#sub:kerugian}

**Kerugian materiil ditulis dalam tiga besaran terpisah yang tidak dijumlah, dengan nilai aset terpapar KRB sebagai batas atas, misalnya {{angka:hidromet.jawa.kekeringan.kerugian_potensi_krb|rupiah}} untuk kekeringan di Pulau Jawa** (@tbl:kerugian). Nilai aset terpapar KRB 2022–2026 mencakup seluruh kelas bahaya dan tidak dijumlah antarbahaya [@bnpb-2026-krb]. Kerugian kejadian analog diambil dari penilaian resmi, misalnya kerusakan dan kerugian banjir Jabodetabek awal Februari 2007 sebesar {{angka:bukti.dala_jabodetabek_2007.kerugian|rupiah}} menurut Badan Perencanaan Pembangunan Nasional (Bappenas) [@bappenas-2007-dala]. Kebutuhan stimulan rumah hanya dihitung untuk tanah longsor dan banjir bandang, tidak disebut kerugian materiil untuk banjir genangan, dan diberi label "kebutuhan stimulan rumah (batas bawah)". Besaran stimulan resmi tidak ditemukan dalam korpus Jaringan Dokumentasi dan Informasi Hukum (JDIH) BNPB, sehingga baris stimulan berlabel Asumsi kebijakan.

::: tabel {#tbl:kerugian}
judul: Tiga besaran kerugian materiil untuk kartu skenario Pulau Jawa, 2007–2026
sumber: InaRISK BNPB (KRB 2022–2026); Bappenas (2007)
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Nilai aset terpapar batas atas, tidak dijumlah; besaran stimulan rumah resmi tidak ditemukan.
angka: 3

| BESARAN | CAKUPAN | NILAI PULAU JAWA | KEYAKINAN | SUMBER |
| --- | --- | ---: | --- | --- |
| Aset terpapar KRB, banjir | seluruh kelas bahaya; batas atas | {{angka:hidromet.jawa.banjir.kerugian_potensi_krb|rupiah}} | resmi | InaRISK BNPB, KRB 2022–2026 |
| Aset terpapar KRB, tanah longsor | seluruh kelas bahaya; batas atas | {{angka:hidromet.jawa.longsor.kerugian_potensi_krb|rupiah}} | resmi | InaRISK BNPB, KRB 2022–2026 |
| Aset terpapar KRB, kekeringan | seluruh kelas bahaya; batas atas | {{angka:hidromet.jawa.kekeringan.kerugian_potensi_krb|rupiah}} | resmi | InaRISK BNPB, KRB 2022–2026 |
| Kerugian kejadian analog | banjir Jabodetabek awal Februari 2007 | {{angka:bukti.dala_jabodetabek_2007.kerugian|rupiah}} | resmi | Bappenas (2007) |
| Kebutuhan stimulan rumah | tanah longsor dan banjir bandang; batas bawah | – | asumsi-kebijakan | besaran resmi tidak ditemukan |
:::

**Kerugian imateriil ditulis dalam satuan fisik berupa korban meninggal dan hilang serta pengungsi-hari, dengan lama mengungsi tujuh hari sebagai nilai tengah.** Rentang lama mengungsi tiga sampai tiga puluh hari adalah asumsi, karena DIBI hanya mencatat jumlah pengungsi. Nilai statistik jiwa tidak dipakai, dan tahun hidup yang disesuaikan disabilitas tidak dihitung karena data luka dan bobot disabilitas tidak tersedia. Kebutuhan respons di kartu mengikuti Perka BNPB 7/2008, yaitu air bersih {{angka:perka_2008.air_bersih_awal_liter_hari|satuan}} pada tiga hari pertama lalu {{angka:perka_2008.air_bersih_liter_hari|satuan}}, serta air minum {{angka:perka_2008.air_minum_liter_hari|satuan}} [@bnpb-2008-kebutuhan-dasar, hlm. 10]; penanganan pengungsi mengikuti Perban BNPB 3/2018 [@bnpb-2018-pengungsi].

## Analisis Kepekaan {#sub:kepekaan}

**Kepekaan korban terhadap cakupan peringatan dini memakai rasio mortalitas {{angka:bukti.wmo_2022.rasio_mortalitas|satuan}} dari asosiasi lintas negara, sehingga hasilnya berlabel Asumsi kebijakan dan hanya tampil di kartu dan grafik Bab 6.** Rasio itu membandingkan mortalitas bencana di negara bercakupan peringatan dini terbatas dengan negara bercakupan substansial atau lebih [@wmo-2022-peringatan-dini] dan belum menjadi efek sebab-akibat. Faktor pengali korban membandingkan mortalitas rerata tertimbang penduduk yang tercakup dan tidak tercakup peringatan dini pada cakupan awal dan target.

Dua lintasan cakupan disajikan berdampingan karena penyebutnya berbeda. Lintasan Rencana Nasional Penanggulangan Bencana (Renas PB) indikator 1.c, dari {{angka:renas.indikator_1c.2025}} ke {{angka:renas.indikator_1c.2029|satuan}} di daerah berisiko, memberi faktor {{angka:hidromet.jawa.lanina.pd_renas.faktor|fmt=3}} [@bnpb-2025-renas, hlm. 32]. Lintasan Indikator Kinerja Program (IKP) Rencana Strategis (Renstra) BNPB, dari {{angka:renstra.ikp_peringatan_dini.2025|fmt=2|persen}} ke {{angka:renstra.ikp_peringatan_dini.2029|fmt=2|persen}}, memberi faktor {{angka:hidromet.jawa.lanina.pd_renstra_ikp.faktor|fmt=3}} [@bnpb-2025-renstra, hlm. 133]. Faktor hanya dikalikan ke jenis selain tanah longsor, sehingga korban model tanah longsor ({{angka:hidromet.jawa.lanina.korban_jiwa_longsor|satuan}}, belum diuji balik) tidak berubah. Jenis gabungan banjir dan tanah longsor tetap dikalikan karena bukan jenis tanah longsor dalam klasifikasi kajian, dan varian tanpa jenis gabungan itu tampil berdampingan di kartu.

## Rekonsiliasi Angka {#sub:rekonsiliasi}

**Dua belas besaran kajian air memiliki lebih dari satu versi angka atau definisi, dan dua di antaranya berupa pertentangan antardokumen resmi** (@tbl:rekonsiliasi). Versi resmi yang dibaca di dokumen penerbitnya dipakai, sedangkan versi sekunder hanya dicatat keberadaannya. Dua versi resmi yang bertentangan ditulis berdampingan tanpa dirata-rata. Versi yang berbeda karena definisi diberi nama besarannya dan tidak disebut bertentangan; contohnya empat angka cakupan peringatan dini yang memakai tiga penyebut. Pertentangan resmi pertama menyangkut pengungsi banjir Jabodetabek awal 2020, yang tercatat {{angka:hidromet.jawa.jabodetabek2020.mengungsi_dibi|satuan}} di DIBI dan {{angka:hidromet.jawa.jabodetabek2020.pengungsi_renstra|satuan}} di Renstra BNPB [@bnpb-dibi; @bnpb-2025-renstra]; yang kedua menyangkut provinsi IRBI terendah 2023.

## Keterbatasan dan Indikator yang Belum Dapat Ditarget {#sub:keterbatasan}

**Data air tanah per kab/kota dan debit sungai tidak tersedia untuk satu pun dari {{angka:airjawa.jawa.n_kab}} kab/kota Jawa, begitu pula luas genangan rob.** Indikator yang bergantung pada data itu belum dapat diberi target dan tercantum pada @tbl:keterbatasan bersama lembaga pemegangnya. Seri DIBI berpatahan pada 2018 dan 2024, dan IRBI 2025 tidak sebanding dengan IRBI 2015–2024. Semua angka korban model belum diuji balik terhadap kejadian, dan mesin neraca air dan padi dalam simulasi belum diuji balik terhadap puso atau produksi. Aturan peringatan kekeringan berbasis indeks presipitasi terstandar tiga bulanan gagal uji balik. Angka padi dan puso model pun hanya dimuat di lampiran.

