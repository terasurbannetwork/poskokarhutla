---
kajian: mitigasi
bab: 3
judul: Metodologi
pertanyaan: Bagaimana IRBI dan DIBI dibaca tanpa membandingkan skala yang patah? Bagaimana skenario terburuk, lantai, kemungkinan, dampak, dan kerugian didefinisikan untuk semua jenis bencana, dan dengan label keyakinan apa? Angka mana yang berbeda versi, dan versi mana yang dipakai?
status: draf
target_halaman: 9
---

# Metodologi {#bab:metodologi}

::: ringkasan-bab
**Temuan:**

- Indeks Risiko Bencana Indonesia (IRBI) 2025 tidak sebanding dengan IRBI 2015–2024: rerata nasional naik {{angka:irbi.skala.perubahan_2025|fmt=2}} poin menjadi {{angka:irbi.nasional.2025_rerata|fmt=2}} dan korelasi peringkat kab/kota dengan 2024 hanya {{angka:irbi.skala.spearman_2025|fmt=3}}, sehingga capaian penurunan indeks risiko bencana (IRB) 2025 belum dapat dinilai.
- Lantai musim hujan nasional menurut Data dan Informasi Bencana Indonesia (DIBI) adalah {{angka:hidromet.nasional.lantai.meninggal_hilang|satuan}} meninggal dan hilang pada 2025/2026, di atas batas tinggi semua pita model; lantai per jenis belum dapat ditetapkan.
- Kejadian bencana nasional 2024 tercatat dalam delapan versi; versi resmi primer berkisar {{angka:ckan.nasional.kejadian.2024}} sampai {{angka:dibi.nasional.kejadian_semua_laporan.2024}} kejadian menurut cakupannya, dan baseline resmi kapasitas daerah adalah {{angka:rpjmn.kp_kapasitas.baseline_2023|persen}} pada 2023, bukan {{angka:renstra.iks_kapasitas_minimal_sedang.awal|persen}}.

**Angka kunci:**

- {{angka:irbi_dibi.nasional.spearman.banjir|fmt=2}} korelasi peringkat IRBI 2025 banjir dengan jumlah laporan banjir DIBI 2015–2025 per kab/kota (pengolahan data InaRISK dan DIBI, Badan Nasional Penanggulangan Bencana atau BNPB).
- {{angka:hidromet.nasional.lantai.peluang_5_musim|persen}} peluang paling sedikit satu musim hujan seburuk lantai dalam lima musim, pita keempat *National Risk Register* (NRR) (pengolahan data DIBI BNPB).
- {{angka:perhatian.mitigasi.banjir.n}} kab/kota masuk daftar perhatian banjir, sedangkan kekeringan {{angka:perhatian.mitigasi.kekeringan.n}} kab/kota (pengolahan data IRBI 2025 dan DIBI 2015–2025).

**Rekomendasi:** @rek:r-m01, @rek:r-m08, @rek:r-m20
:::

## Data, Produsen, dan Label Keyakinan {#sub:data-label}

**Dari sepuluh kelompok data kajian, hanya tiga yang dihasilkan produsen Data Bencana menurut Peraturan Badan (Perban) BNPB 1/2023, yaitu DIBI, IRBI, dan Kajian Risiko Bencana (KRB) 2022–2026.** Peraturan itu menetapkan unit kerja di lingkungan BNPB sebagai Produsen Data Bencana [@bnpb-2023-satudata, hlm. 2]. DIBI ditarik dari dasbor publik Pusat Data, Informasi, dan Komunikasi Kebencanaan (Pusdatinkom) pada 23 Oktober 2026 [@bnpb-dibi]; IRBI dan KRB berasal dari InaRISK [@bnpb-irbi; @bnpb-2026-krb]. Lembaga lain pada @tbl:sumber-data adalah penerbit. Keluaran simulasi Pantau Bencana bukan Data Bencana, sehingga selalu berlabel Estimasi model dengan pernyataan produsen.

::: tabel {#tbl:sumber-data}
judul: Sumber data, penerbit, cakupan, dan label keyakinan kajian mitigasi bencana Indonesia, 1950–2026
sumber: Analisis kajian ini atas DIBI BNPB, InaRISK BNPB, NOAA CPC, USGS, PuSGeN 2024, Kementerian Kehutanan, BPS, dan Perban BNPB 1/2023
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Hanya unit kerja BNPB yang menjadi produsen Data Bencana (Perban BNPB 1/2023 Pasal 1 angka 6).

| DATA | PENERBIT | CAKUPAN | KEYAKINAN | CATATAN PAKAI |
| --- | --- | --- | --- | --- |
| DIBI | BNPB, Pusdatinkom (walidata) | 2008–2026, kab/kota | resmi | cakupan selalu disebut; patahan 2018 dan 2024 |
| IRBI | BNPB, InaRISK | 2015–2025, kab/kota | resmi | 2025 terpisah; tidak untuk memeringkat |
| KRB 2022–2026 | BNPB, InaRISK | {{angka:krb2022.jumlah_bahaya}} bahaya, kab/kota | resmi | batas atas; tidak dijumlah antarbahaya |
| Oceanic Niño Index (ONI) | Climate Prediction Center, National Oceanic and Atmospheric Administration (NOAA CPC) | 1950–2026 | terverifikasi | fase El Niño-Southern Oscillation (ENSO), bukan prakiraan |
| Katalog dan dampak gempa | United States Geological Survey (USGS) | per kejadian | terverifikasi | pembanding korban; laju gempa |
| Peta Sumber dan Bahaya Gempa 2024 | Kementerian Pekerjaan Umum, Pusat Studi Gempa Nasional (PuSGeN) | megathrust dan sesar | resmi | magnitudo maksimum dan periode ulang |
| SiPongi | Kementerian Kehutanan | 2015–2026 | resmi | luas karhutla |
| Penduduk dan Potensi Desa (Podes) | Badan Pusat Statistik (BPS) | 2020–2026 | resmi | penyebut |
| Data World Health Organization (WHO), Bank Dunia, jurnal | lembaga luar negeri, peneliti | per kejadian | terverifikasi | pembanding dan analog |
| Keluaran Pantau Bencana | bukan produsen Data Bencana | per skenario | estimasi-model | pernyataan produsen, pita, galat |
:::

Dari lima label keyakinan, kajian memakai empat; label Penilaian pakar tidak muncul. Resmi berarti terbitan lembaga pemerintah berwenang yang dibaca dari dokumen penerbitnya; Terverifikasi berarti sumber primer nonpemerintah atau lembaga luar negeri yang dibaca langsung. Estimasi model membawa tambahan "belum diuji balik" atau "uji balik gagal", sedangkan Asumsi kebijakan menandai pilihan kajian dan hitungan turunan penyusun (@gbr:rantai-metode).

::: gambar {#gbr:rantai-metode}
berkas: gambar/mitigasi/rantai-metode.png
jenis: diagram
judul: Rantai metode dari sumber data ke daftar perhatian dan rekomendasi, kajian mitigasi bencana Indonesia 2026
sumber: Analisis kajian ini atas DIBI BNPB, InaRISK BNPB, NOAA CPC, PuSGeN 2024, SiPongi, dan BPS
keyakinan: asumsi-kebijakan
lebar: penuh
data_per: 23 Okt 2026

Alur bergerak dari sumber resmi ke paket data dan registri angka, lalu ke lantai, kemungkinan, dampak per aspek, kelas skenario, daftar perhatian, dan rekomendasi; simpul berpil Estimasi model memuat pernyataan produsen.
:::

## IRBI: Patahan Skala 2025 dan Aturan Pakai {#sub:irbi}

**Nilai total IRBI 2025 tidak sama dengan jumlah kolom bahaya di kab/kota mana pun ({{angka:irbi.skala.porsi_total_jumlah_2025|fmt=0|persen}}), padahal pada 2015 kesamaan itu berlaku di {{angka:irbi.skala.porsi_total_jumlah_2015|fmt=2|persen}} kab/kota.** Nilai per bahaya 2025 seluruhnya bilangan bulat; indeks banjir tinggal {{angka:irbi.skala.banjir_nilai_unik_2025}} nilai unik dari {{angka:irbi.skala.banjir_nilai_unik_2024}} pada 2024 [@bnpb-irbi]. Setelah turun tiap tahun pada 2016–2024, rerata nasional naik {{angka:irbi.skala.perubahan_2025|fmt=2}} poin menjadi {{angka:irbi.nasional.2025_rerata|fmt=2}}. Porsi kab/kota yang naik mencapai {{angka:irbi.skala.porsi_kab_naik_2025|fmt=2|persen}}, dan korelasi peringkat dengan tahun sebelumnya jatuh ke {{angka:irbi.skala.spearman_2025|fmt=3}} dari paling rendah {{angka:irbi.skala.spearman_2016|fmt=2}} pada 2016–2024 (@tbl:irbi-skala). Kesimpulan bahwa skala berubah adalah tafsiran penyusun dan belum didukung dokumen metode BNPB.

::: tabel {#tbl:irbi-skala}
judul: Rerata, perubahan, dan konsistensi peringkat IRBI kab/kota menurut tahun, Indonesia, 2015–2025
csv: data/irbi/irbi_bukti_skala_tahunan.csv
kolom: tahun="TAHUN" fmt=tahun; n_kab_basis="KAB/KOTA BASIS" fmt=0; rerata_total="RERATA IRB" fmt=2; perubahan_dari_tahun_lalu="PERUBAHAN (poin)" fmt=2; spearman_dengan_tahun_lalu="KORELASI PERINGKAT DENGAN TAHUN LALU" fmt=2; porsi_total_sama_jumlah_bahaya="PORSI TOTAL SAMA DENGAN JUMLAH BAHAYA" fmt=2; maks_total="NILAI MAKSIMUM" fmt=2
sumber: Pengolahan Pantau Bencana dari InaRISK BNPB, IRBI 2015–2025
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Porsi berupa pecahan dari kab/kota basis; basis 2015–2020 adalah kab/kota bernilai tetap sesuai seri resmi. Baris 2025 tidak dibandingkan dengan tahun sebelumnya.
:::

**Seri resmi IRB nasional turun dari {{angka:irbi.nasional.2019|fmt=2}} pada 2019 menjadi {{angka:irbi.nasional.2024|fmt=2}} pada 2024 ({{angka:irbi.nasional.persen_2019_2024|fmt=2|persen|arah}}), dan seri 2015–2024 menjadi satu-satunya dasar tren** [@bnpb-2025-renstra, hlm. 52]. Perbandingan naif 2025 dengan 2024 memberi kenaikan {{angka:irbi.nasional.persen_naif_2024_2025|fmt=1|persen}}. Angka itu berlawanan arah dengan sasaran penurunan IRB {{angka:rpjmn.iks_penurunan_irb_persen|fmt=1|persen}} per tahun pada Rencana Nasional Penanggulangan Bencana (Renas PB) 2025–2029 sasaran 4.c dan Rencana Pembangunan Jangka Menengah Nasional (RPJMN) 2025–2029 PP 08.04 berbaseline {{angka:rpjmn.pp_irb.baseline_2023|fmt=2}} [@bnpb-2025-renas, hlm. 32; @ri-2025-perpres12-rpjmn]. Kajian membaca kenaikan itu sebagai efek patahan skala, bukan perubahan risiko. Capaian 2025 ditulis "tidak dapat dinilai" sampai catatan metode dan baseline skala baru terbit (keputusan KD-4, @rek:r-m01), dan sementara itu sasaran utama memakai indikator korban Renas PB 1.a dan 1.b yang terukur dari DIBI.

**Status IRBI 2025 memuat {{angka:irbi.kab.tinggi.2025}} kab/kota Tinggi dan {{angka:irbi.kab.sedang.2025}} Sedang, tetapi kelas per bahaya tidak ada di sumber mana pun.** Audit metode platform menilai IRBI layak dipakai, tetapi tidak untuk memeringkat karena nilai kembarnya banyak. Sel kosong berarti tidak dinilai, bukan nol: tanah longsor tidak dinilai di {{angka:irbi.nasional.2025.longsor_kosong}} kab/kota, padahal {{angka:irbi.nasional.2025.longsor_kosong_berkejadian}} di antaranya mencatat longsor di DIBI. Lampiran Peraturan Kepala (Perka) BNPB 2/2012 yang memuat rumus risiko tidak ada di korpus Jaringan Dokumentasi dan Informasi Hukum (JDIH) yang dibuka, sehingga metode IRBI 2025 belum dapat dilacak ke rumusnya [@bnpb-2012-pengkajian-risiko].

## DIBI: Cakupan, Patahan Seri, dan Batas Tafsir {#sub:dibi}

**DIBI 2025 menyaring {{angka:dibi.nasional.kejadian_semua_laporan.2025|fmt=0}} laporan menjadi {{angka:dibi.nasional.kejadian.2025|fmt=0}} kejadian bencana, padahal sebelum 2024 semua laporan ditandai bencana.** Pada 2024 pemilahan pertama itu memisahkan {{angka:dibi.nasional.kejadian_semua_laporan.2024}} laporan menjadi {{angka:dibi.nasional.kejadian.2024}} kejadian. Penandanya mengikuti ambang Petunjuk Pelaksanaan (Juklak) BNPB 7/2023: paling sedikit {{angka:juklak7_2023.ambang.meninggal|satuan}} meninggal, {{angka:juklak7_2023.ambang.terdampak|satuan}} terdampak, luka, atau mengungsi, {{angka:juklak7_2023.ambang.rumah_rusak|satuan}} rumah atau fasilitas publik rusak, {{angka:juklak7_2023.ambang.lahan|satuan}} lahan, atau ada permintaan bantuan nasional maupun status darurat [@bnpb-2023-standar-data, hlm. 7]. Penanda itu bukan fungsi ambang murni; meninggal 2025 tercatat {{angka:dibi.nasional.meninggal.2025}} jiwa pada cakupan bencana dan {{angka:dibi.nasional.meninggal_semua_laporan.2025}} pada semua laporan.

**Nonalam, sosial, dan kategori lainnya nol kejadian pada 2020–2023 tetapi {{angka:dibi.nasional.nonalam_sosial.kejadian.2025}} kejadian pada 2025.** Kategori juga patah pada 2018, ketika Banjir Bandang, Banjir dan Tanah Longsor, Banjir Rob, serta Puting Beliung baru muncul; keempatnya tanpa baris pada 2024. Tanah longsor 2024 hanya {{angka:dibi.nasional.longsor.kejadian_semua_laporan.2024}} laporan atau {{angka:dibi.nasional.longsor.kejadian.2024}} kejadian bencana [@bnpb-dibi].

**Paket data kajian memakai dua cakupan DIBI: kejadian longsor 2025 berjumlah {{angka:dibi.nasional.longsor.kejadian_semua_laporan.2025}} pada semua laporan dan {{angka:dibi.nasional.longsor.kejadian.2025}} pada cakupan bencana.** Angka nasional memakai cakupan bencana, sedangkan data per kab/kota untuk kartu skenario dan daftar perhatian memakai semua laporan. Akibatnya, syarat kejadian menggelembung pada 2024 dan 2025, sehingga tiap tabel menyebut cakupannya. Untuk korban jiwa selisih kedua cakupan kecil. Meninggal dan hilang dicatat sebagai nominal terakhir, sedangkan mengungsi sebagai nominal terbesar selama tanggap darurat [@bnpb-2023-standar-data, hlm. 21–22]; luka-luka tidak stabil antartahun dan tidak dipakai. Dasbor publik tidak memuat COVID-19 dan kebakaran Depo Plumpang 2023, kebakaran tempat pemrosesan akhir (TPA) tidak berjenis sendiri, dan baris konflik memuat dugaan entri ganda (@rek:r-m08).

**Korelasi peringkat IRBI 2025 banjir dengan jumlah laporan banjir DIBI 2015–2025 per kab/kota adalah {{angka:irbi_dibi.nasional.spearman.banjir|fmt=2}}; untuk tujuh bahaya lain {{angka:irbi_dibi.nasional.spearman.kekeringan|fmt=2}} sampai {{angka:irbi_dibi.nasional.spearman.gunungapi|fmt=2}}.** Kuintil teratas IRBI banjir bermedian {{angka:irbi_dibi.nasional.banjir.median_laporan_kuintil5}} laporan dan hampir seluruhnya di luar Jawa, sedangkan kuintil terbawah bermedian {{angka:irbi_dibi.nasional.banjir.median_laporan_kuintil1}} laporan. IRBI menggabungkan bahaya, kerentanan, dan kapasitas, sedangkan DIBI mencatat kejadian yang dilaporkan. Keduanya tidak saling memvalidasi dan disajikan berdampingan; di Pulau Jawa korelasi banjirnya positif lemah ({{angka:airjawa.jawa.spearman_irbi_dibi.banjir|fmt=2}}). Jumlah kejadian kekeringan DIBI dibaca sebagai intensitas pelaporan, bukan keparahan.

## Skenario Terburuk yang Masuk Akal {#sub:skenario}

Skenario terburuk yang masuk akal (*reasonable worst case scenario*, RWCS) adalah perwujudan terburuk suatu risiko yang masih masuk akal setelah variasi yang sangat tidak mungkin disisihkan [@cabinetoffice-2025-nrr, hlm. 11]. Perban BNPB 2/2023 Pasal 7 meminta rencana kontinjensi memuat skenario kejadian dan asumsi dampak, dan lampirannya membuka pertimbangan sejarah kejadian terburuk [@bnpb-2023-renkon, hlm. 4 dan 14]. Kajian menambahkan lantai: skenario tidak boleh lebih ringan daripada kejadian atau musim tercatat terburuk untuk jenis dan wilayah yang sama, dalam periode acuan delapan belas musim hujan 2008/2009–2025/2026 untuk hidrometeorologi dan 1996–2025 untuk geologi, nonalam, dan sosial. Kejadian hanya boleh disisihkan bila peluang lima tahunnya di bawah {{angka:nrr_2025.pita1_batas_persen|fmt=1|persen}}, dengan alasan tertulis. Batas pita model yang jatuh di bawah lantai dinaikkan ke lantai dengan catatan.

**Lantai musim hujan nasional adalah {{angka:hidromet.nasional.lantai.meninggal_hilang|satuan}} meninggal dan hilang pada 2025/2026, musim yang juga mencatat {{angka:hidromet.nasional.musim_2025.mengungsi|satuan}} mengungsi dan {{angka:hidromet.nasional.musim_2025.rumah_rb|satuan}} rumah rusak berat** [@bnpb-dibi]. Pita model musim terberat (Estimasi model, belum diuji balik) memberi {{angka:hidromet.nasional.terberat.korban_jiwa|satuan}}, padahal musim itu mencatat {{angka:hidromet.nasional.terberat.meninggal_tercatat}} meninggal dan {{angka:hidromet.nasional.terberat.hilang_tercatat}} hilang. Pita musim La Niña 2020/2021, {{angka:hidromet.nasional.lanina.korban_jiwa|satuan}} (Estimasi model, belum diuji balik), justru berbatas tinggi lebih dari dua kali {{angka:hidromet.nasional.lanina.meninggal_tercatat}} meninggal dan {{angka:hidromet.nasional.lanina.hilang_tercatat}} hilang tercatat musim itu. Model paket menyisihkan tahun terburuk tercatat, bertentangan dengan aturan lantai, sehingga pitanya hanya pembanding musim berat tipikal dan korban skenario nasional sama dengan lantai.

**Lantai per jenis hidrometeorologi belum dapat ditetapkan karena turunan lantai per jenis dalam paket data belum dibangun, padahal batas rendah pita longsor La Niña sudah melampaui {{angka:hidromet.nasional.lanina.meninggal_hilang_tercatat_longsor}} korban tercatatnya.** Angka per jenis di kartu skenario kini adalah angka musim analog, bukan lantai, sehingga kartu per jenis belum memuat angka lantai (@rek:r-m20). Pita yang melampaui catatan musimnya atau lebih lebar dari satu orde besaran, seperti pita cuaca ekstrem La Niña serta pita gelombang ekstrem dan abrasi, tidak tampil di kartu tanpa penjelasan tertulis.

**Lantai megathrust selatan Jawa adalah Pangandaran 2006 dengan {{angka:geologi.pangandaran2006.meninggal|satuan}} meninggal menurut rincian per kab/kota United States Geological Survey (USGS); lantai Mentawai dan Enggano adalah Mentawai 2010 dengan {{angka:dibi.mentawai2010.meninggal}} meninggal dan {{angka:dibi.mentawai2010.hilang}} hilang.** Lantai tsunami memakai kejadian yang sama ditambah Selat Sunda 2018, {{angka:dibi.selatsunda2018.meninggal}} meninggal dan {{angka:dibi.selatsunda2018.hilang}} hilang [@bnpb-dibi]. Yogyakarta 2006 ({{angka:dibi.yogya2006.meninggal_usgs}} meninggal, USGS) dan Padang 2009 ({{angka:dibi.padang2009.meninggal}} meninggal, DIBI) berasal dari gempa kerak dan slab, bukan megathrust; Yogyakarta 2006 menjadi lantai kartu sesar darat bersama Cianjur 2022. Magnitudo maksimum menurut Pusat Studi Gempa Nasional (PuSGeN) adalah Mw {{angka:pusgen.jawa.mmaks|fmt=1}} untuk segmen gabungan Jawa dan Mw {{angka:pusgen.jawa_segmen.mmaks|fmt=1}} per segmen, tanpa skenario korban [@pusgen-2024-peta-gempa, hlm. 342–343].

Pita korban dan kerugian megathrust dari platform semuanya lebih lebar dari satu orde besaran, sehingga yang tampil di badan teks hanya magnitudo maksimum, periode ulang, paparan KRB, dan korban analog. Korban tsunami tidak dikuantifikasi sampai genangan tsunami InaRISK dipakai. Kartu nonalam dan sosial memakai analog terbesar tiga puluh tahun terakhir tanpa perkalian. Untuk COVID-19, misalnya, tercatat {{angka:nonalam.covid19.meninggal|satuan}} meninggal, yang disandingkan dengan kematian berlebih 2020–2021 sebesar {{angka:nonalam.covid19.kematian_berlebih|satuan}} (Estimasi model) menurut model World Health Organization (WHO).

## Kemungkinan dan Skala Dampak {#sub:kemungkinan}

**Perban BNPB 2/2023 tidak memuat kelas atau ambang dampak, sehingga skala dampak lima kelas sepenuhnya Asumsi kebijakan; pada skala itu hanya {{angka:dibi.provinsi_tahun.n_skor_nrr5}} provinsi-tahun DIBI 2008–2025 jatuh di kelas tertinggi.** Dampak dinilai pada lima aspek Pasal 7 ayat (5), dan kelas kartu mengikuti aspek terberat [@bnpb-2023-renkon, hlm. 4]. Kependudukan memakai pita fatalitas NRR, yaitu sampai {{angka:nrr_2025.fatalitas.kelas1_atas}}, {{angka:nrr_2025.fatalitas.kelas2_atas}}, {{angka:nrr_2025.fatalitas.kelas3_atas}}, dan {{angka:nrr_2025.fatalitas.kelas4_atas}} meninggal dan hilang untuk kelas 1–4 [@cabinetoffice-2025-nrr, hlm. 14]. Pita itu memisahkan sebaran provinsi-tahun dengan baik: {{angka:dibi.provinsi_tahun.n_skor_nrr4}} di kelas 4, sedangkan kelas 5 hanya Sulawesi Tengah 2018 dan Sumatera Barat 2009 (@tbl:skala-dampak). Pita NRR disusun untuk Inggris dan di sini berfungsi sebagai rujukan metode. Tahun nasional selalu jatuh di kelas 4 atau 5, terendah {{angka:dibi.nasional_tahun.meninggal_hilang_min|satuan}} pada 2015. Penyusun mengunci ambang itu, lengkap dengan tanggalnya, sebelum mengisi kelas kartu.

::: tabel {#tbl:skala-dampak}
judul: Sebaran dampak DIBI per provinsi per tahun dan ambang kelas dampak per aspek, Indonesia, 2008–2025
sumber: Pengolahan Pantau Bencana dari DIBI BNPB 2008–2025 (bencana alam, cakupan bencana) dan Cabinet Office (2025)
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Persentil inklusif. Fasilitas rusak menjumlahkan fasilitas pendidikan, ibadat, kesehatan, umum, kantor, dan jembatan. Ekonomi dan lingkungan tidak tercatat di DIBI.
angka: 3; 4; 5; 6

| ASPEK | BESARAN DIBI | MEDIAN | PERSENTIL 90 | PERSENTIL 99 | MAKSIMUM | AMBANG KELAS |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Kependudukan | meninggal dan hilang (jiwa) | {{angka:dibi.provinsi_tahun.meninggal_hilang.p50}} | {{angka:dibi.provinsi_tahun.meninggal_hilang.p90}} | {{angka:dibi.provinsi_tahun.meninggal_hilang.p99}} | {{angka:dibi.provinsi_tahun.meninggal_hilang.maks}} | pita fatalitas NRR |
| Kependudukan | mengungsi (jiwa) | {{angka:dibi.provinsi_tahun.mengungsi.p50}} | {{angka:dibi.provinsi_tahun.mengungsi.p90}} | {{angka:dibi.provinsi_tahun.mengungsi.p99}} | {{angka:dibi.provinsi_tahun.mengungsi.maks}} | kelipatan lima mulai median |
| Infrastruktur/fisik | rumah rusak (unit) | {{angka:dibi.provinsi_tahun.rumah_rusak.p50}} | {{angka:dibi.provinsi_tahun.rumah_rusak.p90}} | {{angka:dibi.provinsi_tahun.rumah_rusak.p99}} | {{angka:dibi.provinsi_tahun.rumah_rusak.maks}} | kelipatan lima mulai median |
| Layanan publik | fasilitas rusak (unit) | {{angka:dibi.provinsi_tahun.fasilitas_rusak.p50}} | {{angka:dibi.provinsi_tahun.fasilitas_rusak.p90}} | {{angka:dibi.provinsi_tahun.fasilitas_rusak.p99|fmt=0}} | {{angka:dibi.provinsi_tahun.fasilitas_rusak.maks}} | kelipatan lima mulai median |
| Ekonomi | – | – | – | – | – | tidak dinilai; KRB batas atas |
| Lingkungan | – | – | – | – | – | tidak dinilai |
:::

Kemungkinan adalah peluang skenario terjadi paling sedikit sekali dalam lima tahun, dipetakan ke lima pita NRR: di bawah {{angka:nrr_2025.pita1_batas_persen|fmt=1|persen}}, {{angka:nrr_2025.pita1_batas_persen|fmt=1}}–{{angka:nrr_2025.pita2_atas_persen|persen}}, {{angka:nrr_2025.pita2_atas_persen}}–{{angka:nrr_2025.pita4_bawah_persen|persen}}, {{angka:nrr_2025.pita4_bawah_persen}}–{{angka:nrr_2025.pita5_batas_persen|persen}}, dan di atas {{angka:nrr_2025.pita5_batas_persen|persen}} [@cabinetoffice-2025-nrr, hlm. 12]. Dasar per jenis tercantum pada @tbl:kemungkinan.

**Peluang paling sedikit satu musim hujan seburuk lantai dalam lima musim adalah {{angka:hidromet.nasional.lantai.peluang_5_musim|persen}}, di pita keempat.** Lantai adalah musim terburuk dari delapan belas, sehingga posisi plot Weibull memberinya peluang satu per sembilan belas musim. Musim lantai bukan episode La Niña: Oceanic Niño Index (ONI) hanya tiga musim tumpang berturut di bawah ambang, sedangkan definisi Climate Prediction Center, National Oceanic and Atmospheric Administration (NOAA CPC) meminta lima [@noaa-2026-oni]. Porsi jendela lima tahun yang memuat La Niña sejak 1950, {{angka:enso.lanina_ndj_porsi_jendela5|persen}}, karena itu hanya menjadi baris kepekaan fase El Niño-Southern Oscillation (ENSO) dan tidak dipakai sebagai kemungkinan skenario. Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) menyatakan El Niño sangat kuat berlangsung pada September 2026 [@bmkg-2026-musim-hujan].

**Peluang megathrust Jawa dalam lima tahun adalah {{angka:geologi.jawa_gabungan.peluang_5th|fmt=2|persen}} untuk segmen gabungan dan {{angka:geologi.jawa_segmen.peluang_5th|fmt=2|persen}} per segmen, keduanya di atas ambang penyisihan.** Angka itu turunan Poisson penyusun dari periode ulang PuSGeN {{angka:pusgen.jawa.periode_ulang|satuan}} dan {{angka:pusgen.jawa_segmen.periode_ulang|satuan}}, bukan angka PuSGeN. Gempa lain memakai laju Poisson gempa magnitudo 6 ke atas per provinsi dari katalog USGS 1990–2025 yang lolos uji balik; peluangnya jatuh di pita 5 untuk dua puluh empat provinsi, tetapi itu peluang kejadian pemicu, bukan peluang skenario korban.

::: tabel {#tbl:kemungkinan}
judul: Dasar kemungkinan lima tahun per jenis bencana dan pita NRR, Indonesia, 1950–2026
sumber: Pengolahan Pantau Bencana dari ONI NOAA CPC 1950–2025, DIBI BNPB 2008–2026, PuSGeN 2024, dan katalog gempa USGS 1990–2025
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Peluang megathrust adalah turunan Poisson penyusun. Megathrust Sumba tidak memiliki periode ulang dan tidak dinilai.

| JENIS | DASAR KEMUNGKINAN | NILAI LIMA TAHUN | PITA | KEYAKINAN |
| --- | --- | ---: | --- | --- |
| Musim hujan nasional, lantai | delapan belas musim, posisi plot Weibull | {{angka:hidromet.nasional.lantai.peluang_5_musim|persen}} | 4 | asumsi-kebijakan |
| Musim hujan, kepekaan ENSO | jendela lima tahun memuat La Niña | {{angka:enso.lanina_ndj_porsi_jendela5|persen}} | 5, kepekaan | asumsi-kebijakan |
| Banjir, banjir bandang, longsor, cuaca ekstrem | menunggu lantai per jenis | – | tidak dinilai | – |
| Kekeringan dan karhutla | jendela lima tahun memuat El Niño kuat musim kemarau | {{angka:enso.elnino_kuat_porsi_jendela5|persen}} | 5 | asumsi-kebijakan |
| Megathrust Jawa, segmen gabungan | periode ulang PuSGeN | {{angka:geologi.jawa_gabungan.peluang_5th|fmt=2|persen}} | 2 | asumsi-kebijakan |
| Megathrust Jawa, per segmen | periode ulang PuSGeN | {{angka:geologi.jawa_segmen.peluang_5th|fmt=2|persen}} | 3 | asumsi-kebijakan |
| Tsunami | mengikuti sumber gempanya | – | 2 atau 3 | asumsi-kebijakan |
| Gempa lain | laju provinsi, peluang pemicu saja | – | 4 atau 5 untuk pemicu; skenario tidak dinilai | estimasi-model |
| Gunung api, gelombang ekstrem dan abrasi, rob, nonalam, sosial | tanpa dasar peluang | – | tidak dinilai | – |
:::

## Tabel Kerusakan dan Matriks Ketersediaan Kuantifikasi {#sub:kuantifikasi}

**Untuk sembilan jenis bencana alam, yang terkuantifikasi resmi hanya korban, pengungsi, dan rumah rusak tercatat DIBI, ditambah paparan KRB {{angka:krb2022.jumlah_bahaya}} bahaya sebagai batas atas; kekeringan tidak memiliki korban tercatat** (@tbl:kuantifikasi). Estimasi model hanya ada untuk hidrometeorologi dan geologi, sedangkan nonalam dan sosial memakai analog tanpa perkalian. Tabel kerusakan kartu memuat lima aspek Perban BNPB 2/2023 ditambah kebutuhan respons menurut Perka BNPB 7/2008 dan Perban BNPB 3/2018 [@bnpb-2008-kebutuhan-dasar; @bnpb-2018-pengungsi]. Luka-luka dan pengungsi hari ketujuh tidak dimuat karena tidak tercatat stabil di DIBI, dan rumah terdampak gempa diperkirakan dari jumlah jiwa karena data bangunan hanya tersedia untuk Kalimantan Tengah.

::: tabel {#tbl:kuantifikasi}
judul: Ketersediaan kuantifikasi per jenis bencana dan besaran skenario, Indonesia, 2008–2026
sumber: Pengolahan Pantau Bencana dari DIBI BNPB, InaRISK BNPB (KRB 2022–2026), SiPongi, PuSGeN 2024, ONI NOAA CPC, dan kompendium analog nonalam dan sosial
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: R = resmi; T = turunan dari data resmi; E = estimasi model; – = tidak dikuantifikasi. Huruf a, b, dan c merujuk tiga besaran kerugian pada subbab berikut. Kolom luas tidak dibandingkan antarjenis. Kepekaan berkalkulasi hanya porsi evakuasi segera (tsunami), kepatuhan bangunan (gempa), dan cakupan peringatan dini (hidrometeorologi selain tanah longsor); jenis lain memakai kepekaan pilihan analog tanpa perkalian, dan tanah longsor hanya kualitatif karena faktor peringatan dini tidak dihitung untuknya.

| JENIS | MENINGGAL DAN HILANG | PENGUNGSI | RUMAH RUSAK | LUAS | KERUGIAN MATERIIL | KEMUNGKINAN |
| --- | --- | --- | --- | --- | --- | --- |
| Gempa bumi | R; E pita lebar | R; E | R; E dari jiwa | E (intensitas) | R (a, b); T (c) | T megathrust; E pemicu |
| Tsunami | R; – skenario | R | R | R (KRB); E waktu tiba | R (a) | T |
| Gunung api | R; E pola historis | R; E | R | R (KRB) | R (a); T (c) | – |
| Banjir | R; E pita | R | R | R (KRB) | R (a, b) | T (ONI) |
| Banjir bandang | R; E pita | R | R | R (KRB) | R (a); T (c) | T (ONI) |
| Tanah longsor | R; E pita | R | R | R (KRB) | R (a); T (c) | T (ONI) |
| Cuaca ekstrem | R; E pita | R | R | – | R (a) | T (ONI) |
| Gelombang ekstrem dan abrasi, rob | R; E pita lebar | R | R | R (KRB) | R (a) | – |
| Kekeringan | – | – | – | R (KRB) | R (a) | T (ONI) |
| Karhutla | R; kematian asap terverifikasi | – | – | R (SiPongi) | R (a); terverifikasi (b) | T (ONI) |
| Epidemi dan pandemi | R (COVID-19); E kematian berlebih | – | – | – | – | – |
| Kebakaran industri dan kegagalan teknologi | R analog | R analog | – | R (KRB) | R (a) | – |
| Kebakaran TPA | – | – | – | R analog | – | – |
| Konflik sosial | terverifikasi analog | terverifikasi analog | – | – | – | – |
:::

## Kerugian Materiil dan Imateriil {#sub:kerugian}

**Potensi kerugian multibahaya KRB 2022–2026 adalah {{angka:renas.krb.kerugian_multibahaya|rupiah}}, yaitu baris nasional tabel provinsi dan bukan jumlah kolom bahaya.** Jumlah dua belas nilai per bahaya hampir dua kali angka itu karena zona bahaya bertumpuk, sehingga tidak dipakai [@bnpb-2025-renas, hlm. 23–25]. Karena itu kerugian materiil ditulis dalam tiga besaran yang tidak dijumlah (@tbl:kerugian); nilai aset terpapar gempa, misalnya, {{angka:renas.krb.kerugian_gempa|rupiah}} sebagai batas atas.

**Kerugian nyata Cianjur 2022 adalah {{angka:kerugian.pengali.cianjur2022_r3p|fmt=2}} kali kebutuhan stimulan rumahnya, dan kebutuhan pemulihan Lombok 2018 {{angka:kerugian.pengali.lombok2018_kemenkopmk|fmt=2}} kali, sehingga stimulan rumah hanya batas bawah.** Angka kejadian analog diambil dari Pengkajian Kebutuhan Pascabencana (Jitupasna; Perka BNPB 15/2011 dan Perban BNPB 5/2017), yang menurut Perka BNPB 15/2011 menggabungkan *Damage and Loss Assessment* (DaLA) dan *Human Recovery Needs Assessment* [@bnpb-2011-pdna; @bnpb-2017-r3p]. Rencana Rehabilitasi dan Rekonstruksi Pascabencana (R3P) Cianjur mencatat kerusakan dan kerugian {{angka:r3p.cianjur2022.kerusakan_kerugian|fmt=2|satuan}}, dengan status contoh dokumen tanpa nomor penetapan [@cianjur-2022-r3p]. Angka Lombok adalah total kebutuhan R3P dari Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan [@kemenkopmk-2024-rehabrekon-lombok]. Kedua pengali tidak dikalikan ke skenario.

**Profil batas bawah biaya rehabilitasi rumah nasional mencapai {{angka:kerugian.nasional.maks_tercatat|rupiah}} pada 2018, sedangkan lapisan berat persentil 90 hanya {{angka:kerugian.nasional.lapisan_berat|rupiah}} karena menyisihkan tahun itu.** Kajian selalu menyandingkan keduanya. Profil dihitung dari rumah rusak DIBI dikali stimulan dua skema; besaran stimulan tidak terdapat dalam korpus JDIH BNPB, sehingga berlabel Asumsi kebijakan. Sebagai besaran kerugian, kebutuhan stimulan hanya dihitung untuk gempa, longsor, dan banjir bandang. Kartu musim hujan paket data masih mengalikan rumah rusak banjir genangan, sehingga barisnya diberi catatan sampai dipecah per jenis.

Kerugian imateriil ditulis dalam satuan fisik. Pengungsi-hari adalah pengungsi dikali lama mengungsi asumsi tujuh hari (rentang tiga sampai tiga puluh hari untuk hidrometeorologi), karena DIBI tidak mencatat lama pengungsian. Tahun hidup yang hilang (*years of life lost*, YLL) hanya dimuat di lampiran, sedangkan luka dan *disability-adjusted life years* tidak dihitung. Kebutuhan respons mengikuti Perka BNPB 7/2008: air bersih {{angka:perka_2008.air_bersih_awal_liter_hari|satuan}} pada tiga hari pertama, lalu {{angka:perka_2008.air_bersih_liter_hari|satuan}} [@bnpb-2008-kebutuhan-dasar, hlm. 10].

::: tabel {#tbl:kerugian}
judul: Tiga besaran kerugian materiil dan profil biaya rehabilitasi rumah untuk kartu skenario, Indonesia, 2011–2026
sumber: Renas PB 2025–2029 (KRB 2022–2026); R3P Cianjur 2022; Kemenko PMK (2024); pengolahan Pantau Bencana dari DIBI BNPB 2015–2025
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Profil biaya rehabilitasi rumah adalah dasar lapisan pembiayaan, bukan kerugian materiil.

| BESARAN | ISI DAN CONTOH | KEYAKINAN | BATAS PAKAI |
| --- | --- | --- | --- |
| (a) Nilai aset terpapar KRB | per bahaya; cuaca ekstrem {{angka:renas.krb.kerugian_cuaca_ekstrem|rupiah}} | resmi | batas atas; tidak dijumlah antarbahaya |
| (b) Kerugian kejadian analog | Jitupasna, R3P, DaLA, Bank Dunia | resmi | per kejadian; angka sementara ditandai |
| (c) Kebutuhan stimulan rumah | rumah rusak berat, sedang, ringan dikali stimulan | asumsi-kebijakan | gempa, longsor, banjir bandang; batas bawah |
| Profil biaya rehabilitasi rumah | lapisan berat dan maksimum 2018 | asumsi-kebijakan | keduanya berdampingan |
:::

## Aturan Daftar Perhatian dan Provinsi Utama {#sub:daftar-perhatian}

Kab/kota masuk daftar perhatian suatu bahaya bila memenuhi paling sedikit dua syarat kelompok bahayanya [@bnpb-irbi; @bnpb-dibi]. Syarat tidak dijumlah menjadi skor, daftar tampil menurut kode wilayah, dan aturannya berlabel Asumsi kebijakan.

- Hidrometeorologi: (a) IRBI 2025 bahaya itu di kelas nilai teratas nasional; (b) kejadian tercatat paling sedikit tiga dari sebelas tahun 2015–2025; (c) meninggal dan hilang atau mengungsi DIBI di kuartil atas.
- Geologi: (a) sama dengan hidrometeorologi; (b) paparan KRB atau jiwa pesisir rendah dengan waktu tiba tsunami paling lama tiga puluh menit (Estimasi model) di kuartil atas; (c) kejadian berkorban sejak 2008.
- Provinsi utama: kab/kota daftar perhatian terbanyak, atau meninggal dan hilang DIBI 2015–2025 tertinggi; kedua kriteria ditulis.

Batas kelas teratas adalah kuintil, dengan nilai kembar di batas ikut masuk. Peta IRBI per bahaya wajib memakai batas yang sama dengan legenda "≥ batas"; tanpa itu sampai {{angka:perhatian.mitigasi.karhutla.n_kab_di_batas}} kab/kota karhutla masuk daftar tetapi tampil di kelas kedua peta.

**Aturan dasar menghasilkan {{angka:perhatian.mitigasi.banjir.n}} kab/kota daftar perhatian banjir dan {{angka:perhatian.mitigasi.cuaca_ekstrem.n}} cuaca ekstrem, tetapi hanya {{angka:perhatian.mitigasi.kekeringan.n}} kekeringan; ukuran daftar ditentukan sifat data, bukan besar risiko.** Syarat (b) dipenuhi {{angka:perhatian.mitigasi.banjir.n_syarat_b}} kab/kota untuk banjir, sedangkan syarat (c) kekeringan hanya {{angka:perhatian.mitigasi.kekeringan.n_syarat_c}} kab/kota karena korban kekeringan hampir nol. Syarat (b) gempa tidak dinilai sebab KRB gempa per kab/kota belum ditarik, dan proksi pesisir rendah melewatkan pantai selatan Jawa Barat. Pergeseran terbesar pada @tbl:daftar-perhatian muncul bila syarat (a) dilonggarkan ke dua kelas: banjir naik ke {{angka:perhatian.mitigasi.banjir.n_a_dua_kelas}} dan karhutla dari {{angka:perhatian.mitigasi.karhutla.n}} ke {{angka:perhatian.mitigasi.karhutla.n_a_dua_kelas}} kab/kota. Ambang (b) berbasis kuartil dan syarat (c) kekeringan berbasis terdampak masuk pemutakhiran daftar (@rek:r-m20).

::: tabel {#tbl:daftar-perhatian}
judul: Jumlah kab/kota daftar perhatian menurut bahaya dan varian aturan, Indonesia, 2015–2025 (kab/kota)
sumber: Pengolahan Pantau Bencana dari InaRISK BNPB (IRBI 2025, KRB 2022–2026), DIBI BNPB 2008–2025, dan Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG)
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Syarat (b) geologi bukan jumlah tahun berkejadian sehingga tidak digeser; syarat (b) gempa tidak dinilai. Kejadian per kab/kota memakai cakupan semua laporan.
angka: 2; 3; 4; 5

| BAHAYA | DAFTAR DASAR | SYARAT (B) DUA TAHUN | SYARAT (B) EMPAT TAHUN | SYARAT (A) DUA KELAS |
| --- | ---: | ---: | ---: | ---: |
| Banjir | {{angka:perhatian.mitigasi.banjir.n}} | {{angka:perhatian.mitigasi.banjir.n_b2}} | {{angka:perhatian.mitigasi.banjir.n_b4}} | {{angka:perhatian.mitigasi.banjir.n_a_dua_kelas}} |
| Cuaca ekstrem | {{angka:perhatian.mitigasi.cuaca_ekstrem.n}} | {{angka:perhatian.mitigasi.cuaca_ekstrem.n_b2}} | {{angka:perhatian.mitigasi.cuaca_ekstrem.n_b4}} | {{angka:perhatian.mitigasi.cuaca_ekstrem.n_a_dua_kelas}} |
| Tanah longsor | {{angka:perhatian.mitigasi.longsor.n}} | {{angka:perhatian.mitigasi.longsor.n_b2}} | {{angka:perhatian.mitigasi.longsor.n_b4}} | {{angka:perhatian.mitigasi.longsor.n_a_dua_kelas}} |
| Karhutla | {{angka:perhatian.mitigasi.karhutla.n}} | {{angka:perhatian.mitigasi.karhutla.n_b2}} | {{angka:perhatian.mitigasi.karhutla.n_b4}} | {{angka:perhatian.mitigasi.karhutla.n_a_dua_kelas}} |
| Gelombang ekstrem dan abrasi | {{angka:perhatian.mitigasi.gelombang_abrasi.n}} | {{angka:perhatian.mitigasi.gelombang_abrasi.n_b2}} | {{angka:perhatian.mitigasi.gelombang_abrasi.n_b4}} | {{angka:perhatian.mitigasi.gelombang_abrasi.n_a_dua_kelas}} |
| Kekeringan | {{angka:perhatian.mitigasi.kekeringan.n}} | {{angka:perhatian.mitigasi.kekeringan.n_b2}} | {{angka:perhatian.mitigasi.kekeringan.n_b4}} | {{angka:perhatian.mitigasi.kekeringan.n_a_dua_kelas}} |
| Gempa bumi | {{angka:perhatian.mitigasi.gempa.n}} | – | – | {{angka:perhatian.mitigasi.gempa.n_a_dua_kelas}} |
| Tsunami | {{angka:perhatian.mitigasi.tsunami.n}} | – | – | {{angka:perhatian.mitigasi.tsunami.n_a_dua_kelas}} |
| Gunung api | {{angka:perhatian.mitigasi.gunungapi.n}} | – | – | {{angka:perhatian.mitigasi.gunungapi.n_a_dua_kelas}} |
:::

**Jawa Tengah dan Jawa Timur masing-masing memiliki {{angka:perhatian.mitigasi.prov33.n_kab}} kab/kota daftar perhatian, sedangkan Sulawesi Tengah mencatat {{angka:perhatian.mitigasi.prov72.meninggal_hilang|satuan}} meninggal dan hilang DIBI 2015–2025, sehingga dua kriteria provinsi utama menunjuk provinsi berbeda.** Kriteria daftar menonjolkan provinsi dengan banyak kab/kota dan banyak laporan, sedangkan kriteria korban menonjolkan satu kejadian sangat besar, Sulawesi Tengah 2018. Jawa Barat berada di peringkat kedua menurut korban ({{angka:perhatian.mitigasi.prov32.meninggal_hilang|satuan}}), sementara Sulawesi Tengah hanya peringkat keempat belas menurut daftar.

## Rekonsiliasi Angka {#sub:rekonsiliasi}

**Sedikitnya tujuh belas butir kajian mitigasi memiliki lebih dari satu versi angka; kejadian bencana nasional 2024 saja memiliki delapan versi, dan versi resmi primernya berkisar {{angka:ckan.nasional.kejadian.2024}} sampai {{angka:dibi.nasional.kejadian_semua_laporan.2024}} kejadian menurut cakupan.** Versi resmi yang dibaca di dokumen penerbitnya dipakai, versi sekunder hanya pembanding, dan dua versi resmi yang bertentangan ditulis berdampingan tanpa dirata-rata. Versi yang berbeda karena definisi diberi nama besarannya dan tidak disebut bertentangan. Butir yang mengubah angka atau arah tercantum pada @tbl:rekonsiliasi, sisanya di Lampiran G.

**Tiga butir mengubah rujukan kajian, dimulai dari baseline resmi kapasitas daerah sebesar {{angka:rpjmn.kp_kapasitas.baseline_2023|persen}} pada 2023.** Rencana Strategis (Renstra) BNPB 2025–2029 menulis kenaikan dari {{angka:renstra.iks_kapasitas_minimal_sedang.awal|persen}} ke {{angka:renstra.iks_kapasitas_minimal_sedang.2029|persen}} [@bnpb-2025-renstra, hlm. 85], padahal {{angka:renstra.iks_kapasitas_minimal_sedang.awal|persen}} adalah target 2025 RPJMN KP 08.04.01 [@ri-2025-perpres12-rpjmn]. Kelas kapasitas KRB ({{angka:krb.nasional.kapasitas_minimal_sedang_persen|fmt=2|persen}} kab/kota minimal sedang) belum dinyatakan setara dengan Indeks Ketahanan Daerah, sehingga kelas itu hanya menjadi pembanding dan pilihannya diserahkan ke keputusan KD-3. Butir kedua, faktor evakuasi tsunami paket {{angka:geologi.kepekaan.faktor_50_paket|fmt=3}}, tidak ada di dokumen Cabinet Office Jepang yang memberi {{angka:nankai.faktor_70|fmt=3}} dan {{angka:nankai.faktor_survei|fmt=3}} [@cao-japan-2025-nankai, hlm. 4–5]. Butir ketiga, klaim enam belas segmen megathrust pada peta 2017, dibantah PuSGeN 2024 yang mencatat {{angka:pusgen.megathrust.segmen_2017}} segmen untuk peta 2017 dan {{angka:pusgen.megathrust.segmen_2024}} segmen untuk peta 2024 [@pusgen-2024-peta-gempa].

::: tabel {#tbl:rekonsiliasi}
judul: Rekonsiliasi angka yang berbeda versi dalam kajian mitigasi bencana Indonesia, 2010–2026
sumber: Pengolahan Pantau Bencana dari DIBI BNPB, portal data terbuka BNPB, Renas PB 2025–2029, Renstra BNPB 2025–2029, RPJMN 2025–2029, KRB 2022–2026, PuSGeN 2024, Cabinet Office Jepang (2025), dan R3P Cianjur 2022
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Kolom keyakinan memuat label versi yang dipakai; versi bertanda sekunder hanya pembanding.

| BESARAN | VERSI DAN NILAI | KEYAKINAN | SEBAB BEDA | YANG DIPAKAI |
| --- | --- | --- | --- | --- |
| Kejadian bencana 2024 | DIBI semua laporan {{angka:dibi.nasional.kejadian_semua_laporan.2024}}; kejadian bencana {{angka:dibi.nasional.kejadian.2024}}; bencana alam {{angka:dibi.nasional.kejadian_alam.2024|fmt=1}}; portal data terbuka {{angka:ckan.nasional.kejadian.2024}}; konferensi pers {{angka:bnpb_pers.nasional.kejadian_2024_a}} (sekunder) dan {{angka:bnpb_pers.nasional.kejadian_2024_b}} (sekunder, belum terverifikasi) | resmi | cakupan dan saat rekap | DIBI bercakupan tertulis |
| Jiwa terpapar multibahaya | KRB 2022–2026 {{angka:renas.krb.nasional.terpapar_multibahaya}}; Buku Risiko Bencana Indonesia 2023 {{angka:rbi2023.nasional.terpapar_total}} | resmi | dua edisi kajian | berdampingan |
| Kapasitas daerah | RPJMN baseline 2023 {{angka:rpjmn.kp_kapasitas.baseline_2023|persen}}; target 2025 {{angka:renstra.iks_kapasitas_minimal_sedang.awal|persen}}; KRB {{angka:krb.nasional.kapasitas_minimal_sedang_persen|fmt=2|persen}} | resmi | alat ukur dan tahun | baseline RPJMN; KD-3 |
| Segmen megathrust dan sesar aktif | PuSGeN 2024 {{angka:pusgen.megathrust.segmen_2024}} dan {{angka:pusgen.sesar_aktif_2024}}; PuSGeN 2017 {{angka:pusgen.megathrust.segmen_2017}} dan {{angka:pusgen.sesar_aktif_2017}}; Renstra {{angka:renstra.megathrust_segmen}} dan {{angka:renstra.sesar_aktif}} | resmi | edisi peta | PuSGeN 2024 |
| Cakupan peringatan dini | keterpenuhan sistem {{angka:renstra.peringatan_dini.keterpenuhan_persen|persen}}; RPJMN {{angka:rpjmn.peringatan_dini.baseline|fmt=2|persen}}; Renstra {{angka:renstra.ikp_peringatan_dini.2025|fmt=2|persen}} ke {{angka:renstra.ikp_peringatan_dini.2029|fmt=2|persen}}; Renas PB 1.c {{angka:renas.indikator_1c.2025}} ke {{angka:renas.indikator_1c.2029|satuan}} | resmi | tiga penyebut | berdampingan; KD-2 |
| Sulawesi Tengah 2018 | DIBI {{angka:dibi.sulteng2018.meninggal}} meninggal, {{angka:dibi.sulteng2018.hilang}} hilang; BNPB 21 Oktober 2018 {{angka:bnpb.sulteng2018.meninggal_21okt}} (sekunder) | resmi | tanggal rekap | DIBI |
| Merapi 2010, meninggal | DIBI {{angka:dibi.merapi2010.meninggal}}; rekap 1 Desember 2010 {{angka:bnpb.merapi2010.meninggal_1des}} (sekunder) | resmi | tanggal rekap | DIBI |
| Banjir Jabodetabek 2020, meninggal | DIBI empat belas kab/kota {{angka:dibi.jabodetabek2020.meninggal}}; Renstra {{angka:renstra.jabodetabek2020.meninggal}} | resmi | cakupan wilayah | berdampingan |
| Depo Plumpang 2023, meninggal | Kepala BNPB hari kedua {{angka:nonalam.plumpang2023.meninggal}}; Badan Penanggulangan Bencana Daerah (BPBD) DKI {{angka:nonalam.plumpang2023.meninggal_akhir}} (sekunder); tanpa baris DIBI | resmi | tanggal data | Kepala BNPB |
| Faktor evakuasi tsunami | paket {{angka:geologi.kepekaan.faktor_50_paket|fmt=3}}; Cabinet Office Jepang {{angka:nankai.faktor_70|fmt=3}} dan {{angka:nankai.faktor_survei|fmt=3}} | terverifikasi | interpolasi paket | dokumen primer |
| Potensi kerugian KRB | multibahaya {{angka:renas.krb.kerugian_multibahaya|rupiah}}; jumlah per bahaya {{angka:renas.krb.kerugian_jumlah_per_bahaya|rupiah}} | resmi | zona bertumpuk | multibahaya |
| Cianjur 2022, meninggal | DIBI {{angka:dibi.cianjur2022.meninggal}} (lima kab/kota); R3P {{angka:r3p.cianjur2022.meninggal_7des}} (data 7 Desember 2022) | resmi | tanggal dan wilayah | berdampingan |
| Cianjur 2022, rumah rusak | DIBI {{angka:dibi.cianjur2022.rumah_rusak}} (lima kab/kota); R3P {{angka:r3p.cianjur2022.rumah_rusak}} (hasil verifikasi) | resmi | dasar pendataan | berdampingan |
:::

## Keterbatasan {#sub:keterbatasan}

DIBI adalah data hidup yang dibekukan per tarik 23 Oktober 2026, dan angka 2026 masih sementara [@bnpb-dibi]. Tanggal ekspor IRBI tidak tertulis, teks Juklak BNPB 7/2023 dibaca dari salinan di luar JDIH BNPB, dan hitungan turunan penyusun (korelasi IRBI dengan DIBI, syarat daftar perhatian, peluang lantai, sebaran skala dampak, dan pengali kerugian) belum masuk skrip bangun paket data.

Audit metode platform 21 Oktober 2026 menilai model korban gempa tidak layak untuk gempa nyata; rasio analognya berasal dari gempa kerak dan slab, dan persamaan prediksi guncangannya belum diuji. Skenario ilustratif megathrust Jawa di bawah magnitudo maksimum tidak menghasilkan intensitas VII pada skala *Modified Mercalli Intensity* di pusat kecamatan mana pun, sehingga tidak dibawa ke kartu. Proksi pesisir rendah melewatkan delapan belas kab/kota pada skenario itu, termasuk Lebak, Pandeglang, dan Banyuwangi. Aturan peringatan kekeringan berbasis indeks presipitasi gagal uji balik.

Data sekolah dan fasilitas kesehatan terpapar hanya mencakup sembilan provinsi, sedangkan data penduduk per kab/kota dari Badan Pusat Statistik (BPS), luas genangan rob, dan debit sungai belum tersedia. Skenario sesar darat Lembang, Cimandiri, dan Opak belum dijalankan, sehingga kartunya memakai analog Yogyakarta 2006 dan Cianjur 2022. Kerugian ekonomi langsung untuk indikator Renas PB 2.a ditulis sebagai permintaan data. Rekomendasi @rek:r-m01, @rek:r-m08, dan @rek:r-m20 pada bab kesimpulan menutup celah yang paling menentukan.
