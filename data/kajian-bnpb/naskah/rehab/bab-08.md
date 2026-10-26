---
kajian: rehab
bab: 8
judul: Skenario Terburuk Beban Rehabilitasi dan Rekonstruksi per Jenis Bencana
pertanyaan: Berapa rumah, jembatan, layanan air, dan durasi pulih pada skenario terburuk yang masuk akal per jenis bencana; di provinsi dan kab/kota mana beban itu jatuh; dan berapa kebutuhan lapis darurat air dan akses per skenario?
status: final
target_halaman: 14
---

# Skenario Terburuk Beban Rehabilitasi dan Rekonstruksi per Jenis Bencana {#bab:skenario-rr}

::: ringkasan-bab
**Temuan:**

- Banjir merusak {{angka:rehab.dibi.jembatan_rusak.banjir.2025}} jembatan pada 2025 saja dan {{angka:rehab.dibi.jembatan_rusak.banjir.prov_tahun_maks}} dalam satu provinsi-tahun (Aceh 2025), sedangkan lantai provinsi-tahun jenis lain hanya {{angka:rehab.dibi.jembatan_rusak.gempa.prov_tahun_maks_2018_2025}} sampai {{angka:rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026}} jembatan. Kesiapan jembatan darurat nasional karena itu dihitung dari kartu banjir dan kartu musim hujan, sedangkan kartu geologi menentukan kebutuhan bentang panjang.
- Lantai rumah rusak berat tercatat adalah tsunami Aceh dan Nias 2004 dengan {{angka:rehab.lantai.tsunami.aceh2004.rumah_rusak_brr}} rumah hancur atau rusak berat, disusul gempa Padang 2009 ({{angka:dibi.padang2009.rumah_rb}}) dan banjir Sumatra 2025 ({{angka:rehab.lantai.banjir.sumatra2025.rumah_rb}}). Gempa Flores 2026 belum dapat menjadi lantai karena verifikasi BNPB menurunkan rusak berat menjadi {{angka:rehab.lantai.gempa.flores2026.rumah_rb_terverifikasi}} dari separuh data.
- Kerusakan layanan air hanya terkuantifikasi untuk gempa ({{angka:rehab.pipa.lombok.spam_rusak}} titik sistem penyediaan air minum (SPAM) Lombok 2018) dan banjir ({{angka:rehab.pipa.sumatra2025.spam_terdampak}} SPAM Sumatra 2025). Hunian tetap (huntap) Sulawesi Tengah dan Jembatan Palu IV pulih lebih lama daripada masa Rencana Rehabilitasi dan Rekonstruksi Pascabencana (R3P) paling lama {{angka:perban2017_5.r3p_masa_tahun}} tahun.

**Angka kunci:**

- {{angka:rehab.musim.2025_26.mengungsi}} jiwa mengungsi pada musim hujan 2025/2026, lantai kesiapan musim 2026/2027 [@bnpb-dibi].
- {{angka:rehab.darurat.banjir.air_m3_hari}} m³ air bersih per hari dibutuhkan setelah hari ketiga untuk pengungsi tercatat banjir Sumatra 2025 menurut standar Perka BNPB 7/2008 [@bnpb-2008-kebutuhan-dasar].
- {{angka:rehab.pulih.sumatra2025.jembatan_daerah_terdampak}} jembatan daerah terdampak banjir Sumatra 2025, {{angka:rehab.pulih.sumatra2025.jembatan_daerah_fungsi_persen_2026_05|persen}} fungsional per 7 Mei 2026 [@pu-2026-pemulihan-sumatera-mei].

**Rekomendasi:**

- @rek:r-rr-06 Hitung stok bailey per Direktorat PD Wilayah (Usulan baru; Deputi Bidang Logistik dan Peralatan; Kementerian Pekerjaan Umum (PU) dan Tentara Nasional Indonesia (TNI); empat belas hari pertama).
- @rek:r-rr-01 Tambah kolom air dan jembatan di Data dan Informasi Bencana Indonesia (DIBI) (Usulan baru; Pusat Data, Informasi, dan Komunikasi Kebencanaan; Kementerian PU dan Badan Penanggulangan Bencana Daerah (BPBD); 100 hari).
- @rek:r-rr-05 Tetapkan standar hari pemasangan akses darurat (Sudah ada, perlu dikembangkan; Deputi Bidang Penanganan Darurat; Kementerian PU dan TNI; 2026–2027).
:::

## Aturan Kartu {#sub:aturan-kartu}

**Tiap kartu memakai lantai, yaitu kejadian tercatat terburuk untuk jenis yang sama, dengan periode acuan geologi 1996–2025, hidrometeorologi 2008–2025, dan jembatan 2018–2025.** DIBI baru mengisi kolom jembatan sejak 2018, sehingga lantai akses lebih pendek daripada lantai rumah [@bnpb-dibi]. Skenario tidak boleh lebih ringan daripada lantai untuk wilayah yang sama. Kartu memuat empat besaran rehabilitasi dan rekonstruksi (RR) yang kolomnya tampil pada @tbl:ketersediaan; korban jiwa menjadi baris konteks. Gempa Flores 15 Agustus 2026 berada di luar periode acuan, tetapi masuk kartu gempa karena DIBI mencatat {{angka:rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026}} jembatan rusak karena gempa di Nusa Tenggara Timur pada 2026, lebih dari tiga kali lantai provinsi-tahun gempa 2018–2025. Angka itu sementara dan mencakup semua gempa di provinsi itu pada 2026.

**Lantai rumah cuaca ekstrem memakai tahun nasional, yaitu {{angka:rehab.dibi.rumah_rusak.cuaca_ekstrem.tahun_maks}} rumah rusak pada 2019; longsor memakai kab-tahun atau tahun nasional.** Lima kartu lain memakai satu kejadian. Jumlah setahun adalah batas atas satu kejadian, sehingga sel antarkartu tidak dibandingkan langsung. Lantai jembatan juga memakai provinsi-tahun, karena DIBI tidak mencatat jembatan per kejadian dan per status jalan [@bnpb-dibi]. Paket skenario model geologi tidak dipakai sebagai angka kartu, sebab skenario dasarnya di bawah magnitudo maksimum dan rumah modelnya diturunkan dari jiwa, bukan dari data bangunan.

::: tabel {#tbl:ketersediaan}
judul: Ketersediaan kuantifikasi lantai per jenis bencana dan besaran RR di Indonesia, 1996–2026
sumber: DIBI BNPB; Kementerian PU; Kementerian PUPR; BRR NAD-Nias; Kemenko PMK; pengolahan kajian ini
keyakinan: resmi
data_per: 23 Okt 2026
catatan: "Setahun" berarti lantai dari jumlah kab-tahun atau tahun nasional, batas atas satu kejadian. Sel tanpa sumber ditulis "tidak dikuantifikasi", bukan nol.

| JENIS | RUMAH | JEMBATAN ATAU AKSES | LAYANAN AIR | DURASI PULIH |
| --- | --- | --- | --- | --- |
| Gempa bumi | kejadian | provinsi-tahun; NTT 2026 sementara | kejadian (Lombok, Cianjur) | tercatat |
| Tsunami | kejadian | panjang jalan saja; jembatan tidak tercatat | proksi keluaran RR, bukan kerusakan | tercatat |
| Likuefaksi | kejadian gabungan Sulawesi Tengah 2018 | satu jembatan bentang panjang | respons pengolah air, sebagian | tercatat |
| Banjir dan banjir bandang | kejadian | provinsi-tahun dan rilis Kementerian PU | kejadian (Sumatra 2025) | tercatat dan target |
| Tanah longsor | setahun | provinsi-tahun | tidak dikuantifikasi | tidak dikuantifikasi |
| Erupsi gunung api | kejadian | provinsi-tahun | tidak dikuantifikasi | tidak dikuantifikasi |
| Cuaca ekstrem | setahun | provinsi-tahun | tidak dikuantifikasi | tidak dikuantifikasi |
:::

**Kebutuhan lapis darurat air dihitung dari standar Perka BNPB 7/2008, yaitu {{angka:perka_2008.air_bersih_awal_liter_hari}} liter per orang per hari pada tiga hari pertama dan {{angka:perka_2008.air_bersih_liter_hari}} liter sesudahnya.** Titik air paling jauh {{angka:perka_2008.jarak_sumber_air_m}} meter dari pengungsi [@bnpb-2008-kebutuhan-dasar]. Rasio satuan yang dipakai adalah {{angka:rehab.darurat.asumsi.orang_per_keran}} orang per keran [@sphere-2018], sekitar {{angka:rehab.darurat.asumsi.jiwa_per_sumur}} jiwa per sumur Badan Geologi [@esdm-2019-sumur-bor], dan {{angka:rehab.darurat.asumsi.truk_m3_hari}} m³ per truk tangki per hari, hasil kali kapasitas truk Lombok dengan lima rit per hari di Cianjur [@pupr-2019-satgas-lombok; @pupr-2023-cianjur]. Basis jiwa adalah pengungsi tercatat atau jiwa kehilangan hunian, yaitu rumah rusak berat dan sedang dikali {{angka:rehab.darurat.asumsi.jiwa_per_rumah|fmt=1}} jiwa per rumah. Basis Padang 2009 hanya memuat rusak berat, karena DIBI tidak mencatat rusak sedang 2008–2009 secara terpisah. Truk dan sumur adalah dua jalan alternatif dan tidak dijumlah (@tbl:lapis-darurat).

::: tabel {#tbl:lapis-darurat}
judul: Kebutuhan lapis darurat air setara per kartu skenario RR di Indonesia (unit setara)
sumber: Perka BNPB 7/2008; Sphere 2018; Kementerian ESDM 2019; Kementerian PUPR 2019 dan 2023; DIBI BNPB; BRR NAD-Nias; pengolahan kajian ini
keyakinan: asumsi-kebijakan
angka: 2; 3; 4; 5; 6; 7
data_per: 25 Okt 2026
catatan: Truk setara dan sumur setara adalah alternatif, tidak dijumlah. Basis tsunami memakai definisi kehilangan tempat tinggal BRR; basis longsor dan cuaca ekstrem adalah jumlah setahun nasional.

| KARTU | BASIS (jiwa) | AIR HARI 1–3 (m³/hari) | AIR SESUDAHNYA (m³/hari) | TRUK SETARA | KERAN | SUMUR SETARA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Gempa bumi, Padang 2009 | {{angka:rehab.lantai.gempa.padang2009.jiwa_kehilangan_hunian}} | {{angka:rehab.darurat.gempa.air_m3_hari_awal}} | {{angka:rehab.darurat.gempa.air_m3_hari}} | {{angka:rehab.darurat.gempa.truk_setara}} | {{angka:rehab.darurat.gempa.keran}} | {{angka:rehab.darurat.gempa.sumur_setara}} |
| Tsunami, Aceh dan Nias 2004 | {{angka:brr.aceh2004.kehilangan_tempat_tinggal}} | {{angka:rehab.darurat.tsunami.air_m3_hari_awal}} | {{angka:rehab.darurat.tsunami.air_m3_hari}} | {{angka:rehab.darurat.tsunami.truk_setara}} | {{angka:rehab.darurat.tsunami.keran}} | {{angka:rehab.darurat.tsunami.sumur_setara}} |
| Likuefaksi, Sulawesi Tengah 2018 | {{angka:rehab.lantai.likuefaksi.sulteng2018.jiwa_kehilangan_hunian}} | {{angka:rehab.darurat.likuefaksi.air_m3_hari_awal}} | {{angka:rehab.darurat.likuefaksi.air_m3_hari}} | {{angka:rehab.darurat.likuefaksi.truk_setara}} | {{angka:rehab.darurat.likuefaksi.keran}} | {{angka:rehab.darurat.likuefaksi.sumur_setara}} |
| Banjir, Sumatra 2025 | {{angka:dibi.sumatra2025.mengungsi}} | {{angka:rehab.darurat.banjir.air_m3_hari_awal}} | {{angka:rehab.darurat.banjir.air_m3_hari}} | {{angka:rehab.darurat.banjir.truk_setara}} | {{angka:rehab.darurat.banjir.keran}} | {{angka:rehab.darurat.banjir.sumur_setara}} |
| Tanah longsor, nasional 2025 | {{angka:rehab.dibi.mengungsi.longsor.tahun_maks}} | {{angka:rehab.darurat.longsor.air_m3_hari_awal}} | {{angka:rehab.darurat.longsor.air_m3_hari}} | {{angka:rehab.darurat.longsor.truk_setara}} | {{angka:rehab.darurat.longsor.keran}} | {{angka:rehab.darurat.longsor.sumur_setara}} |
| Erupsi, Merapi 2010 | {{angka:dibi.merapi2010.mengungsi}} | {{angka:rehab.darurat.erupsi.air_m3_hari_awal}} | {{angka:rehab.darurat.erupsi.air_m3_hari}} | {{angka:rehab.darurat.erupsi.truk_setara}} | {{angka:rehab.darurat.erupsi.keran}} | {{angka:rehab.darurat.erupsi.sumur_setara}} |
| Cuaca ekstrem, nasional 2019 | {{angka:rehab.dibi.mengungsi.cuaca_ekstrem.tahun_maks}} | {{angka:rehab.darurat.cuaca_ekstrem.air_m3_hari_awal}} | {{angka:rehab.darurat.cuaca_ekstrem.air_m3_hari}} | {{angka:rehab.darurat.cuaca_ekstrem.truk_setara}} | {{angka:rehab.darurat.cuaca_ekstrem.keran}} | {{angka:rehab.darurat.cuaca_ekstrem.sumur_setara}} |
| Musim hujan 2025/2026 | {{angka:rehab.musim.2025_26.mengungsi}} | {{angka:rehab.darurat.musim.air_m3_hari_awal}} | {{angka:rehab.darurat.musim.air_m3_hari}} | {{angka:rehab.darurat.musim.truk_setara}} | {{angka:rehab.darurat.musim.keran}} | {{angka:rehab.darurat.musim.sumur_setara}} |
:::

**Respons tercatat di Sumatra 2025, yaitu {{angka:rehab.pipa.sumatra2025.sarana_darurat}} sarana darurat dan {{angka:rehab.pipa.sumatra2025.sumur_bor_pu}} sumur bor Kementerian PU per 2 Februari 2026, sama-sama berjumlah ratusan unit seperti hitungan {{angka:rehab.darurat.banjir.sumur_setara}} sumur setara.** Sarana darurat mencakup instalasi pengolah air bergerak dan mobil tangki, juga hidran umum, sehingga tidak sebanding satu lawan satu dengan sumur [@pu-2026-spam-februari]. Hitungan itu hanya mencakup pengungsi tercatat, padahal pelanggan perusahaan air minum yang jaringannya terputus dapat beralih ke sumur; angka itu karena itu batas bawah kebutuhan air permukiman. Angka yang sama juga batas atas kebutuhan pengungsi serentak, karena DIBI menjumlah pengungsi per laporan. Kolom sumur dibaca sebagai setara kapasitas, bukan janji layanan, sebab hari sampai sumur berfungsi tidak tercatat sistematis; tingkat sumur kering dan uji mutu airnya juga belum tercatat.

**Biaya satuan lapis darurat berlabel estimasi model ada di Bab 6 dan Bab 7 dan tidak dijumlah ke kartu, sehingga kartu tidak menjadi anggaran program.** 

**Kebutuhan jembatan bailey tidak dapat dihitung, karena DIBI tidak membedakan jembatan putus dari rusak dan tidak mencatat bentang.** Satu-satunya pasangan angka adalah {{angka:rehab.pulih.sumatra2025.jembatan_nasional_putus_aceh_2025_12}} jembatan nasional putus di Aceh per 1 Desember 2025 [@binamarga-2025-jembatan-aceh] terhadap {{angka:rehab.dibi.jembatan_rusak.prov.aceh.2025}} jembatan rusak DIBI di Aceh pada 2025. Definisi dan status jalan keduanya berbeda, sehingga rasionya tidak dipakai sebagai koefisien. Stok bailey nasional, stok instalasi pengolahan air bergerak, dan daftar kit pipa bergerak tidak ditemukan di sumber terbuka; kartu agregat musim hujan karena itu belum dapat dibandingkan dengan stok (@rek:r-rr-06). Kit pipa bergerak SIPPA (Bab 6) masih dalam uji coba sejak Oktober 2026 dan belum dihitung.

## Gempa Bumi {#sub:gempa}

**Gempa Padang 2009 adalah lantai rumah gempa dengan {{angka:dibi.padang2009.rumah_rb}} rumah rusak berat dan {{angka:rehab.lantai.gempa.padang2009.rumah_rusak}} rumah rusak di enam belas kab/kota.** Pengungsi tercatat hanya {{angka:dibi.padang2009.mengungsi}} jiwa karena pencatatan pengungsi 2009 tidak lengkap, sedangkan jiwa kehilangan hunian setara {{angka:rehab.lantai.gempa.padang2009.jiwa_kehilangan_hunian}} [@bnpb-dibi]. Lantai pengungsi gempa adalah Lombok 2018 dengan {{angka:dibi.lombok2018.mengungsi}} jiwa. Gempa Tasikmalaya 2 September 2009 merusak {{angka:rehab.lantai.gempa.jabar2009.rumah_rusak}} rumah di Jawa Barat, lebih banyak daripada Lombok 2018 ({{angka:dibi.lombok2018.rumah_rusak}}). Untuk Cianjur 2022, DIBI mencatat {{angka:dibi.cianjur2022.rumah_rusak}} rumah rusak. R3P Cianjur mencatat {{angka:r3p.cianjur2022.rumah_rusak}}; keduanya resmi dan ditulis berdampingan.

**Jembatan rusak karena gempa berjumlah {{angka:rehab.dibi.jembatan_rusak.gempa.2018_2025}} unit secara nasional pada 2018–2025, dengan provinsi-tahun terberat {{angka:rehab.dibi.jembatan_rusak.gempa.prov_tahun_maks_2018_2025}} jembatan di Maluku 2019.** Gempa Flores Mw {{angka:rehab.lantai.gempa.flores2026.magnitudo_bmkg|fmt=1}} pada Sesar Naik Flores [@bmkg-2026-flores] menggeser lantai itu menjadi {{angka:rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026}} jembatan di Nusa Tenggara Timur pada 2026, angka sementara tahun berjalan [@bnpb-dibi].

**Layanan air gempa terkuantifikasi di dua kejadian: {{angka:rehab.pipa.lombok.spam_rusak}} titik SPAM rusak di Lombok 2018 dan {{angka:rehab.pipa.cianjur.titik_spam_rusak}} titik di Cianjur 2022 [@pupr-2019-satgas-lombok; @pupr-2023-cianjur].** Kerusakan Lombok umumnya pada pipa polietilena densitas tinggi (HDPE). Kerusakan air Flores 2026 tidak disebut di rilis BNPB yang dibuka.

**Untuk gempa Flores 2026, versi DIBI sebesar {{angka:rehab.lantai.gempa.flores2026.rumah_rusak_dibi}} rumah rusak di sebelas kab/kota melampaui data awal BNPB {{angka:rehab.lantai.gempa.flores2026.rumah_data_awal}}, dan verifikasi mendapati {{angka:rehab.lantai.gempa.flores2026.rumah_tidak_rusak_terverifikasi}} rumah tidak rusak.** Dari {{angka:rehab.lantai.gempa.flores2026.rumah_terverifikasi}} rumah yang terverifikasi per 7 September 2026, rusak berat hanya {{angka:rehab.lantai.gempa.flores2026.rumah_rb_terverifikasi}} [@bnpb-2026-flores-verifikasi]. Versi DIBI karena itu dibaca sebagai batas atas yang dibantah verifikasi, dan Flores belum menjadi lantai rumah. Keempat versi tampil berdampingan pada @tbl:flores-versi, dan BNPB menyebut data verifikasi masih dinamis.

::: tabel {#tbl:flores-versi}
judul: Versi angka rumah rusak gempa Flores 15 Agustus 2026 menurut sumber dan tanggal (unit)
sumber: DIBI BNPB per 23 Okt 2026; BNPB 23 Agu dan 7 Sep 2026; USGS 2026
keyakinan: campuran
angka: 3; 4
data_per: 25 Okt 2026
catatan: Semua angka sementara. Angka BNPB 7 September adalah data awal yang diverifikasi, bukan jumlah rumah rusak; rusak berat terverifikasi dihitung dari separuh data.

| VERSI | TANGGAL DATA | RUMAH RUSAK | RUSAK BERAT | KEYAKINAN |
| --- | --- | ---: | ---: | --- |
| DIBI, sebelas kab/kota | tarik 23 Okt 2026 | {{angka:rehab.lantai.gempa.flores2026.rumah_rusak_dibi}} | {{angka:rehab.lantai.gempa.flores2026.rumah_rb_dibi}} | resmi |
| BNPB, rilis hari kedelapan | 22 Agu 2026 | {{angka:rehab.lantai.gempa.flores2026.rumah_rusak_bnpb_2026_08_22}} | {{angka:rehab.lantai.gempa.flores2026.rumah_rb_bnpb_2026_08_22}} | resmi |
| BNPB, data awal dan verifikasi | 7 Sep 2026 | {{angka:rehab.lantai.gempa.flores2026.rumah_data_awal}} | {{angka:rehab.lantai.gempa.flores2026.rumah_rb_terverifikasi}} | resmi |
| USGS, rumah hancur | Agu 2026 | – | {{angka:usgs.flores2026.rumah_hancur}} | terverifikasi |
:::

**Rumah Lombok selesai {{angka:rehab.pulih.lombok2018.persen_selesai_2020_03|fmt=1|persen}} dari {{angka:rehab.pulih.lombok2018.rumah_sasaran}} sasaran per Maret 2020, sekitar sembilan belas bulan setelah gempa.** Realisasi R3P Lombok mencapai {{angka:kemenkopmk.lombok2018.realisasi_persen|fmt=2|persen}} per 11 September 2023 [@kemenkopmk-2024-rehabrekon-lombok]. Perbaikan SPAM reguler dan swadaya Lombok selesai akhir 2018 [@pupr-2019-satgas-lombok], dan rehabilitasi lima SPAM Cianjur mencapai {{angka:rehab.pipa.cianjur.spam_rehab_realisasi_fisik_2023_09|fmt=2|persen}} progres fisik per September 2023 terhadap rencana {{angka:rehab.pipa.cianjur.spam_rehab_rencana_fisik_2023_09|fmt=2|persen}}, sekitar sepuluh bulan setelah gempa [@pupr-2023-cianjur]. Sebagai pembanding, sembilan per sepuluh layanan air Kobe 1995 pulih dalam {{angka:rehab.pipa.pulih.kobe_90}} hari [@jsce-2011-nojima].

:::: skenario {#tbl:kartu-gempa}
jenis: gempa
judul: Gempa bumi setara Padang 2009, dengan lantai akses gempa Flores 2026
dasar: Lantai rumah Padang 2009 dan lantai pengungsi Lombok 2018 dari DIBI periode geologi 1996–2025; lantai jembatan provinsi-tahun 2018–2025, digeser Flores 2026 yang masih sementara.
kemungkinan: tidak dinilai: lantai Padang 2009 adalah gempa di luar megathrust tanpa dasar peluang lima tahun; peluang megathrust Jawa ada di matriks kemungkinan dan dampak RR
peta: gambar/rehab/bab08-kartu-gempa.png
lembaga: Deputi Bidang Rehabilitasi dan Rekonstruksi; Kementerian Pekerjaan Umum; Kementerian Energi dan Sumber Daya Mineral; BPBD provinsi
sumber: DIBI BNPB [@bnpb-dibi]; BNPB [@bnpb-2026-flores-verifikasi]; Kementerian PUPR [@pupr-2019-satgas-lombok; @pupr-2023-cianjur]
kaki: Angka tercatat, bukan proyeksi model; Flores 2026 sementara; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah rusak berat Padang 2009 | {{angka:dibi.padang2009.rumah_rb}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, rumah rusak Padang 2009 | {{angka:rehab.lantai.gempa.padang2009.rumah_rusak}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, rumah rusak Flores 2026 | {{angka:rehab.lantai.gempa.flores2026.rumah_rusak_bnpb_2026_08_22}} | {{angka:rehab.lantai.gempa.flores2026.rumah_rusak_dibi}} | resmi | BNPB 22 Agu 2026 dan DIBI; sementara |
| Infrastruktur/fisik, jembatan rusak provinsi-tahun | {{angka:rehab.dibi.jembatan_rusak.gempa.prov_tahun_maks_2018_2025}} | {{angka:rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026}} | resmi | DIBI BNPB; Maluku 2019 dan NTT 2026 (sementara) |
| Layanan sipil, titik SPAM rusak Lombok 2018 | {{angka:rehab.pipa.lombok.spam_rusak}} | – | resmi | Kementerian PUPR |
| Kependudukan, pengungsi tercatat Lombok 2018 | {{angka:dibi.lombok2018.mengungsi}} | – | resmi | DIBI BNPB |
| Kependudukan, korban jiwa Padang 2009 | {{angka:dibi.padang2009.meninggal}} | – | resmi | DIBI BNPB |
| Lingkungan, dampak lingkungan | – | – | – | tidak dikuantifikasi di sumber yang dibuka |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.gempa.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali basis Padang 2009 |
| Kebutuhan respons, truk tangki atau sumur setara | {{angka:rehab.darurat.gempa.sumur_setara}} | {{angka:rehab.darurat.gempa.truk_setara}} | asumsi-kebijakan | alternatif, tidak dijumlah: sumur (rendah), truk (tinggi) |
:::

::: kebijakan
Basis Padang 2009 sebesar {{angka:rehab.lantai.gempa.padang2009.jiwa_kehilangan_hunian}} jiwa membutuhkan {{angka:rehab.darurat.gempa.air_m3_hari}} m³ air per hari setelah hari ketiga. Respons Lombok 2018 mengaktifkan {{angka:rehab.pipa.lombok.sumur_bor_darurat}} sumur irigasi air tanah berkapasitas total {{angka:rehab.pipa.lombok.sumur_jiat_kapasitas_lps}} liter per detik, bersama {{angka:rehab.pipa.lombok.truk_tangki}} truk tangki dan {{angka:rehab.pipa.lombok.ipa_darurat}} instalasi pengolah air, untuk {{angka:dibi.lombok2018.mengungsi}} pengungsi. Jumlah sumur dan truk lebih kecil daripada hitungan setara, tetapi debit tiap sumur yang diaktifkan jauh melampaui sumur Badan Geologi; hitungan itu kapasitas pembanding, bukan kebutuhan terukur.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Versi rumah rusak Cianjur 2022, DIBI lawan R3P | {{angka:dibi.cianjur2022.rumah_rusak}} | {{angka:r3p.cianjur2022.rumah_rusak}} | – | versi R3P sekitar dua kali lipat versi DIBI |
| Versi rumah rusak Flores 2026, DIBI lawan data awal BNPB | {{angka:rehab.lantai.gempa.flores2026.rumah_rusak_dibi}} | {{angka:rehab.lantai.gempa.flores2026.rumah_data_awal}} | – | rusak berat terverifikasi {{angka:rehab.lantai.gempa.flores2026.rumah_rb_terverifikasi}} dari separuh data |
| Lantai jembatan provinsi-tahun, tanpa dan dengan 2026 | {{angka:rehab.dibi.jembatan_rusak.gempa.prov_tahun_maks_2018_2025}} | {{angka:rehab.dibi.jembatan_rusak.prov.ntt.gempa.2026}} | – | kebutuhan jembatan darurat gempa naik lebih dari tiga kali |
:::

::: respons
- Jembatan darurat gempa disiapkan untuk bentang panjang dan beban, bukan jumlah (@rek:r-rr-05).
- Sumur bor darurat dan truk tangki dihitung dari pengungsi tercatat dengan standar Perka BNPB 7/2008.
- Kerusakan SPAM dicatat per titik di DIBI (@rek:r-rr-01).
:::

::: pemulihan
- SPAM Lombok pulih akhir 2018, dalam tahun kejadian.
- Rumah Lombok {{angka:rehab.pulih.lombok2018.persen_selesai_2020_03|fmt=1|persen}} selesai sekitar sembilan belas bulan setelah gempa.
- Realisasi R3P Lombok {{angka:kemenkopmk.lombok2018.realisasi_persen|fmt=2|persen}} per September 2023.
:::
::::

## Tsunami {#sub:tsunami}

**Tsunami Aceh dan Nias 2004 menghancurkan atau merusak berat {{angka:rehab.lantai.tsunami.aceh2004.rumah_rusak_brr}} rumah dan merusak {{angka:rehab.lantai.tsunami.aceh2004.jalan_rusak_km}} km jalan menurut Badan Rehabilitasi dan Rekonstruksi (BRR) NAD-Nias.** Dalam masa kerja empat tahun, BRR membangun {{angka:rehab.lantai.tsunami.aceh2004.rumah_brr}} rumah dan {{angka:rehab.lantai.tsunami.aceh2004.jalan_dibangun_km}} km jalan [@brr-2009-scattered-beads, hlm. x, xiii]. Angka itu laporan pelaksana sendiri dan berlabel resmi. Sebanyak {{angka:brr.aceh2004.kehilangan_tempat_tinggal}} orang kehilangan tempat tinggal di Aceh dan Nias tanpa pemilahan [@brr-2009-nias]; definisinya berbeda dari pengungsi tercatat DIBI. Jumlah jembatan rusak Aceh 2004 tidak ditemukan di buku BRR, sehingga sel akses memuat panjang jalan saja.

**Lantai tsunami di DIBI adalah Selat Sunda 22 Desember 2018 dengan {{angka:rehab.lantai.tsunami.selatsunda2018.rumah_rb}} rumah rusak berat dan {{angka:rehab.lantai.tsunami.selatsunda2018.mengungsi}} pengungsi, tanpa jembatan rusak tercatat.** Tsunami Palu 2018 dan Mentawai 2010 tercatat dalam kategori gabungan [@bnpb-dibi]. Kerusakan layanan air tsunami tidak dikuantifikasi. Proksi yang tersedia adalah keluaran RR, yaitu hampir {{angka:rehab.lantai.tsunami.aceh2004.sumur_mdf}} sumur atau sumber air yang dibangun Multi Donor Fund (MDF) di Aceh dan Nias menurut laporan pengelola dana sendiri [@mdf-2011-progress]. Salinitas air tanah Aceh Barat turun dari lebih dari {{angka:rehab.akuifer.aceh_barat_salinitas_awal}} menjadi kurang dari {{angka:rehab.akuifer.aceh_barat_salinitas_akhir}} mS/cm dalam {{angka:rehab.akuifer.aceh_barat_waktu_pulih_salinitas}} tahun pada curah hujan tinggi [@marohn-2012-aceh-barat], sehingga sumur darurat pascatsunami memerlukan rekomendasi Badan Geologi.

:::: skenario {#tbl:kartu-tsunami}
jenis: tsunami
judul: Tsunami setara Aceh dan Nias 2004, dengan lantai DIBI Selat Sunda 2018
dasar: Lantai rumah dan akses dari laporan BRR untuk Aceh dan Nias 2004, karena DIBI tidak memuat kejadian itu dalam satuan yang sama; lantai DIBI Selat Sunda 2018 ditulis berdampingan.
kemungkinan: tidak dinilai: tsunami selain megathrust Jawa tidak punya dasar peluang lima tahun di bahan kajian
peta: gambar/rehab/bab08-kartu-tsunami.png
lembaga: Deputi Bidang Rehabilitasi dan Rekonstruksi; Kementerian Pekerjaan Umum; Kementerian Energi dan Sumber Daya Mineral; BPBD provinsi
sumber: BRR NAD-Nias [@brr-2009-scattered-beads; @brr-2009-nias]; DIBI BNPB [@bnpb-dibi]; MDF [@mdf-2011-progress]; Marohn dkk. [@marohn-2012-aceh-barat]
kaki: Angka tercatat dan laporan pelaksana, bukan proyeksi model; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah hancur atau rusak berat Aceh dan Nias 2004 | {{angka:rehab.lantai.tsunami.aceh2004.rumah_rusak_brr}} | – | resmi | BRR, laporan pelaksana |
| Infrastruktur/fisik, rumah rusak berat Selat Sunda 2018 | {{angka:rehab.lantai.tsunami.selatsunda2018.rumah_rb}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, jalan rusak Aceh 2004 (km) | {{angka:rehab.lantai.tsunami.aceh2004.jalan_rusak_km}} | – | resmi | BRR; jembatan tidak tercatat |
| Layanan sipil, sumur atau sumber air dibangun MDF | {{angka:rehab.lantai.tsunami.aceh2004.sumur_mdf}} | – | terverifikasi | MDF; keluaran RR, bukan kerusakan; batas atas |
| Kependudukan, kehilangan tempat tinggal Aceh dan Nias | {{angka:brr.aceh2004.kehilangan_tempat_tinggal}} | – | resmi | BRR; definisi berbeda dari pengungsi DIBI |
| Lingkungan, waktu pulih salinitas air tanah Aceh Barat (tahun) | {{angka:rehab.akuifer.aceh_barat_waktu_pulih_salinitas}} | – | terverifikasi | Marohn dkk. 2012 |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.tsunami.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali basis BRR |
| Kebutuhan respons, truk tangki setara | {{angka:rehab.darurat.tsunami.truk_setara}} | – | asumsi-kebijakan | sumur tidak dihitung di air tanah asin |
:::

::: kebijakan
Basis {{angka:brr.aceh2004.kehilangan_tempat_tinggal}} jiwa membutuhkan {{angka:rehab.darurat.tsunami.air_m3_hari}} m³ air per hari setelah hari ketiga, setara {{angka:rehab.darurat.tsunami.truk_setara}} truk tangki. Truk tangki lebih relevan daripada sumur setara selama salinitas belum pulih, sekitar {{angka:rehab.akuifer.aceh_barat_waktu_pulih_salinitas}} tahun.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Lantai dengan dan tanpa Aceh 2004, rumah rusak berat | {{angka:rehab.lantai.tsunami.aceh2004.rumah_rusak_brr}} | {{angka:rehab.lantai.tsunami.selatsunda2018.rumah_rb}} | – | lantai rumah turun dua orde tanpa Aceh 2004 |
:::

::: respons
- Truk tangki dan instalasi pengolahan air didahulukan di pesisir terdampak air asin.
- Sumur darurat dibangun hanya dengan rekomendasi Badan Geologi.
- Jembatan rusak karena tsunami dicatat di DIBI, yang selama ini mencatat nol (@rek:r-rr-01).
:::

::: pemulihan
- Rencana Induk RR Aceh dan Nias berlaku empat tahun menurut Perpres 30/2005.
- BRR membangun {{angka:rehab.lantai.tsunami.aceh2004.rumah_brr}} rumah dalam masa kerja empat tahun.
- Salinitas air tanah pulih sekitar {{angka:rehab.akuifer.aceh_barat_waktu_pulih_salinitas}} tahun pada curah hujan tinggi.
:::
::::

## Likuefaksi {#sub:likuefaksi}

**Kerusakan likuefaksi tidak terpisah di DIBI; kejadian gabungan Sulawesi Tengah 2018 mencatat {{angka:rehab.lantai.likuefaksi.sulteng2018.rumah_rb}} rumah rusak berat dan {{angka:dibi.sulteng2018.rumah_rusak}} rumah rusak.** Angka itu gabungan tiga penyebab dalam satu kejadian, dengan {{angka:dibi.sulteng2018.mengungsi}} pengungsi [@bnpb-dibi]. Kartu likuefaksi karena itu memakai angka gabungan sebagai batas atas. DIBI mencatat {{angka:rehab.dibi.jembatan_rusak.prov.sulteng.gempa.2018}} jembatan rusak di Sulawesi Tengah 2018. Jembatan Palu IV runtuh pada 28 September 2018 dan penggantinya sepanjang {{angka:rehab.pelajaran.sulteng.palu4_panjang}} m dibuka 13 Februari 2026, lebih dari tujuh tahun kemudian [@ocg-2026-palu4]. Untuk air, Kementerian Energi dan Sumber Daya Mineral (ESDM) mengoperasikan {{angka:rehab.pipa.palu.pengolah_esdm_unit}} unit pengolah air untuk {{angka:rehab.akuifer.sulteng2018.ipa_esdm_jiwa}} jiwa mulai hari ke-19 setelah gempa. Unit itu tersebar di lima belas lokasi [@esdm-2018-air-sulteng]. Huntap Sulawesi Tengah yang belum selesai berjumlah {{angka:rehab.pelajaran.sulteng.huntap_sisa_jun2024}} dari {{angka:rehab.pelajaran.sulteng.huntap_target}} unit yang ditetapkan per 15 Juni 2024, lima tahun delapan bulan setelah gempa [@kemenkopmk-2024-huntap-sulteng]. Di zona merah likuefaksi, sumur darurat dibatasi sampai ada rekomendasi Badan Geologi, sehingga kolom truk tangki lebih relevan daripada sumur setara.

:::: skenario {#tbl:kartu-likuefaksi}
jenis: likuefaksi
judul: Likuefaksi setara kejadian gabungan Sulawesi Tengah 2018
dasar: Porsi likuefaksi tidak terpisah di DIBI; kartu memakai angka gabungan gempa, tsunami, dan likuefaksi Sulawesi Tengah 2018 sebagai batas atas, ditambah Jembatan Palu IV sebagai lantai bentang panjang.
kemungkinan: tidak dinilai: likuefaksi tidak punya dasar peluang lima tahun di bahan kajian
peta: gambar/rehab/bab08-kartu-likuefaksi.png
lembaga: Deputi Bidang Rehabilitasi dan Rekonstruksi; Kementerian Pekerjaan Umum; Kementerian Energi dan Sumber Daya Mineral; BPBD provinsi
sumber: DIBI BNPB [@bnpb-dibi]; Kementerian ESDM [@esdm-2018-air-sulteng]; Kemenko PMK [@kemenkopmk-2024-huntap-sulteng]; Oriental Consultants Global [@ocg-2026-palu4]
kaki: Angka gabungan, batas atas; tidak disejajarkan dengan kartu gempa dan tsunami; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah rusak berat gabungan Sulawesi Tengah 2018 | {{angka:rehab.lantai.likuefaksi.sulteng2018.rumah_rb}} | – | resmi | DIBI BNPB; batas atas |
| Infrastruktur/fisik, rumah rusak gabungan | {{angka:dibi.sulteng2018.rumah_rusak}} | – | resmi | DIBI BNPB; batas atas |
| Infrastruktur/fisik, jembatan rusak provinsi 2018 | {{angka:rehab.dibi.jembatan_rusak.prov.sulteng.gempa.2018}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, bentang Jembatan Palu IV pengganti (m) | {{angka:rehab.pelajaran.sulteng.palu4_panjang}} | – | terverifikasi | Oriental Consultants Global |
| Layanan sipil, jiwa terlayani pengolah air darurat | {{angka:rehab.akuifer.sulteng2018.ipa_esdm_jiwa}} | – | resmi | Kementerian ESDM; respons, bukan kerusakan |
| Kependudukan, pengungsi tercatat | {{angka:dibi.sulteng2018.mengungsi}} | – | resmi | DIBI BNPB |
| Lingkungan, luas zona merah | – | – | – | tidak dikuantifikasi di sumber yang dibuka |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.likuefaksi.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali jiwa kehilangan hunian |
| Kebutuhan respons, truk tangki setara | {{angka:rehab.darurat.likuefaksi.truk_setara}} | – | asumsi-kebijakan | sumur dibatasi di zona merah |
:::

::: kebijakan
Basis {{angka:rehab.lantai.likuefaksi.sulteng2018.jiwa_kehilangan_hunian}} jiwa kehilangan hunian membutuhkan {{angka:rehab.darurat.likuefaksi.air_m3_hari}} m³ air per hari, sedangkan pengolah air darurat yang tercatat melayani {{angka:rehab.akuifer.sulteng2018.ipa_esdm_jiwa}} jiwa. Huntap dan Jembatan Palu IV melampaui masa R3P paling lama {{angka:perban2017_5.r3p_masa_tahun}} tahun.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Porsi likuefaksi dalam rumah rusak berat gabungan | {{angka:rehab.lantai.likuefaksi.sulteng2018.rumah_rb}} | tidak terpisah | – | kartu tetap batas atas sampai DIBI memisah penyebab |
:::

::: respons
- Pengolah air dan truk tangki didahulukan; sumur di zona merah ditahan sampai ada rekomendasi Badan Geologi.
- Jembatan bentang panjang didata kebutuhan beban dan bentangnya sejak hari pertama (@rek:r-rr-05).
- Kerusakan dicatat terpisah per penyebab di DIBI (@rek:r-rr-01).
:::

::: pemulihan
- Pengolah air darurat beroperasi mulai hari ke-19.
- Huntap tersisa {{angka:rehab.pelajaran.sulteng.huntap_sisa_jun2024}} unit lima tahun delapan bulan setelah gempa.
- Jembatan Palu IV pengganti dibuka 13 Februari 2026, sekitar tujuh tahun empat bulan setelah runtuh.
:::
::::

## Banjir dan Banjir Bandang {#sub:banjir}

**Banjir dan longsor Sumatra 15 November–31 Desember 2025 merusak {{angka:rehab.lantai.banjir.sumatra2025.rumah_rusak}} rumah, termasuk {{angka:rehab.lantai.banjir.sumatra2025.rumah_rb}} rusak berat, di Aceh, Sumatera Utara, dan Sumatera Barat.** DIBI mencatat {{angka:dibi.sumatra2025.mengungsi}} pengungsi dengan menjumlah tiap laporan [@bnpb-dibi]. Untuk Aceh, jumlah per laporan itu {{angka:rehab.lantai.banjir.sumatra2025.mengungsi_aceh_dibi}}, sedangkan Buletin Info Bencana menulis stok {{angka:dibi.sumatra2025.mengungsi_aceh_buletin}} per 31 Desember 2025, sehingga angka DIBI adalah batas atas pengungsi serentak. Versi rumah juga berbeda, yaitu sekitar {{angka:rehab.pulih.sumatra2025.rumah_rusak_bnpb_2025_12}} menurut BNPB dan {{angka:rehab.pulih.sumatra2025.rumah_terdampak_pkp_2026_01}} rumah terdampak menurut Kementerian Perumahan dan Kawasan Permukiman (PKP) [@dpr-2026-info-singkat-sumatra].

**Jembatan adalah besaran banjir: {{angka:rehab.dibi.jembatan_rusak.banjir.2025}} jembatan rusak karena banjir pada 2025 secara nasional, dan {{angka:rehab.dibi.jembatan_rusak.banjir.prov_tahun_maks}} di Aceh saja.** Tiga provinsi Sumatra mencatat {{angka:rehab.dibi.jembatan_rusak.banjir.sumatra3prov.2025}} jembatan rusak kategori banjir pada 2025 [@bnpb-dibi]. Kementerian PU mencatat {{angka:rehab.pulih.sumatra2025.jembatan_daerah_terdampak}} jembatan daerah terdampak per 7 Mei 2026, definisi yang lebih luas daripada rusak [@pu-2026-pemulihan-sumatera-mei], dan Bina Marga mencatat {{angka:rehab.pulih.sumatra2025.jembatan_nasional_putus_aceh_2025_12}} jembatan nasional putus di Aceh per 1 Desember 2025 [@binamarga-2025-jembatan-aceh]. Ketiga angka ditulis berdampingan karena definisi dan status jalannya berbeda.

**Layanan air terdampak di {{angka:rehab.pipa.sumatra2025.spam_terdampak_feb2026}} SPAM per 2 Februari 2026, dengan {{angka:rehab.pipa.sumatra2025.spam_berfungsi_feb2026}} sudah berfungsi.** Per 7 Mei 2026, Kementerian PU mencatat {{angka:rehab.pipa.sumatra2025.spam_terdampak}} SPAM terdampak dengan sekitar {{angka:rehab.pipa.sumatra2025.persen_fungsi_mei2026|fmt=1|persen}} berfungsi [@pu-2026-spam-februari; @pu-2026-pemulihan-sumatera-mei]. Pada tanggal itu jalan nasional beserta jembatannya pulih {{angka:rehab.pulih.sumatra2025.jalan_jembatan_nasional_fungsi_persen_2026_05|persen}}.

**Jalan daerah pulih {{angka:rehab.pulih.sumatra2025.jalan_daerah_fungsi_persen_2026_05|persen}} dan jembatan daerah baru {{angka:rehab.pulih.sumatra2025.jembatan_daerah_fungsi_persen_2026_05|persen}} per 7 Mei 2026, sekitar lima setengah bulan setelah kejadian.** Akses daerah karena itu menjadi lapis yang tertinggal [@pu-2026-pemulihan-sumatera-mei]. Perbaikan permanen SPAM ditargetkan Agustus 2028 [@pu-2026-spam-februari]; angka itu target, bukan durasi tercatat.

:::: skenario {#tbl:kartu-banjir}
jenis: banjir
judul: Banjir dan banjir bandang setara Sumatra November–Desember 2025
dasar: Lantai rumah dan pengungsi dari kejadian majemuk banjir dan longsor Sumatra 2025 di DIBI periode hidrometeorologi 2008–2025; lantai jembatan provinsi-tahun Aceh 2025, berdampingan dengan rilis Kementerian PU.
kemungkinan: tidak dinilai: tidak ada dasar peluang per jenis; peluang musim agregat ada di kartu musim hujan 2026/2027
peta: gambar/rehab/bab08-kartu-banjir.png
lembaga: Deputi Bidang Rehabilitasi dan Rekonstruksi; Kementerian Pekerjaan Umum; Satgas Sumatra; BPBD provinsi
sumber: DIBI BNPB [@bnpb-dibi]; Kementerian PU [@pu-2026-spam-februari; @pu-2026-pemulihan-sumatera-mei]; Bina Marga [@binamarga-2025-jembatan-aceh]
kaki: Angka tercatat, bukan proyeksi model; pengungsi DIBI dijumlah per laporan, batas atas; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah rusak berat Sumatra 2025 | {{angka:rehab.lantai.banjir.sumatra2025.rumah_rb}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, rumah rusak Sumatra 2025 | {{angka:rehab.lantai.banjir.sumatra2025.rumah_rusak}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, jembatan rusak tiga provinsi 2025 | {{angka:rehab.dibi.jembatan_rusak.banjir.sumatra3prov.2025}} | – | resmi | DIBI BNPB, kategori banjir |
| Infrastruktur/fisik, jembatan daerah terdampak | {{angka:rehab.pulih.sumatra2025.jembatan_daerah_terdampak}} | – | resmi | Kementerian PU; terdampak, lebih luas dari rusak |
| Layanan sipil, SPAM terdampak | {{angka:rehab.pipa.sumatra2025.spam_terdampak_feb2026}} | {{angka:rehab.pipa.sumatra2025.spam_terdampak}} | resmi | Kementerian PU, Februari dan Mei 2026 |
| Kependudukan, pengungsi tercatat | {{angka:dibi.sumatra2025.mengungsi}} | – | resmi | DIBI BNPB; jumlah per laporan, batas atas |
| Lingkungan, luas genangan | – | – | – | luas genangan per kejadian tidak tersedia secara nasional |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.banjir.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali pengungsi tercatat |
| Kebutuhan respons, truk tangki atau sumur setara | {{angka:rehab.darurat.banjir.sumur_setara}} | {{angka:rehab.darurat.banjir.truk_setara}} | asumsi-kebijakan | alternatif, tidak dijumlah: sumur (rendah), truk (tinggi) |
:::

::: kebijakan
Pengungsi tercatat {{angka:dibi.sumatra2025.mengungsi}} jiwa membutuhkan {{angka:rehab.darurat.banjir.air_m3_hari}} m³ air per hari setelah hari ketiga, setara {{angka:rehab.darurat.banjir.keran}} keran. Respons tercatat sudah mencapai {{angka:rehab.pipa.sumatra2025.sarana_darurat}} sarana darurat dan {{angka:rehab.pipa.sumatra2025.sumur_bor_pu}} sumur bor Kementerian PU per 2 Februari 2026, belum termasuk sumur TNI dan Polri yang hanya tercatat di media.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Versi rumah rusak, DIBI lawan BNPB | {{angka:rehab.lantai.banjir.sumatra2025.rumah_rusak}} | {{angka:rehab.pulih.sumatra2025.rumah_rusak_bnpb_2025_12}} | – | rumah terdampak menurut Kementerian PKP {{angka:rehab.pulih.sumatra2025.rumah_terdampak_pkp_2026_01}} |
| Pengungsi Aceh, jumlah per laporan lawan stok Buletin | {{angka:rehab.lantai.banjir.sumatra2025.mengungsi_aceh_dibi}} | {{angka:dibi.sumatra2025.mengungsi_aceh_buletin}} | – | kebutuhan air darurat Aceh turun bila memakai stok |
| Jembatan, DIBI tiga provinsi lawan Kementerian PU | {{angka:rehab.dibi.jembatan_rusak.banjir.sumatra3prov.2025}} | {{angka:rehab.pulih.sumatra2025.jembatan_daerah_terdampak}} | – | definisi berbeda: rusak lawan terdampak |
:::

::: respons
- Jembatan darurat dihitung dari kartu banjir dan kartu musim hujan, bukan dari kartu geologi (@rek:r-rr-06).
- Sarana air darurat dan sumur bor semua pelaksana dicatat dalam satu daftar (@rek:r-rr-11).
- Pengungsi dibaca dengan stok Buletin per tanggal di samping jumlah DIBI per laporan.
:::

::: pemulihan
- SPAM sekitar {{angka:rehab.pipa.sumatra2025.persen_fungsi_mei2026|fmt=1|persen}} berfungsi per 7 Mei 2026, sekitar lima setengah bulan setelah kejadian.
- Jembatan daerah baru {{angka:rehab.pulih.sumatra2025.jembatan_daerah_fungsi_persen_2026_05|persen}} fungsional pada tanggal yang sama; jalan nasional beserta jembatannya {{angka:rehab.pulih.sumatra2025.jalan_jembatan_nasional_fungsi_persen_2026_05|persen}}.
- Perbaikan permanen SPAM ditargetkan Agustus 2028, sekitar dua tahun delapan bulan setelah kejadian.
:::
::::

## Tanah Longsor {#sub:longsor}

**Longsor tidak punya kejadian tunggal besar di DIBI; kab-tahun terberat adalah Kab. Pacitan 2017 dengan {{angka:rehab.lantai.longsor.pacitan2017.rumah_rusak}} rumah rusak.** Tahun nasional terberat mencatat {{angka:rehab.dibi.rumah_rb.longsor.tahun_maks}} rumah rusak berat pada 2017, serta {{angka:rehab.dibi.rumah_rusak.longsor.tahun_maks}} rumah rusak dan {{angka:rehab.dibi.mengungsi.longsor.tahun_maks}} pengungsi pada 2025 [@bnpb-dibi]. Jembatan rusak karena longsor mencapai {{angka:rehab.dibi.jembatan_rusak.longsor.tahun_maks}} unit pada 2020 secara nasional, dengan provinsi-tahun terberat Jawa Tengah 2020 sebanyak {{angka:rehab.dibi.jembatan_rusak.longsor.prov_tahun_maks}}. Data longsor DIBI 2024 tidak lengkap. Kategori gabungan banjir dan tanah longsor tercatat terpisah sejak 2018. Kerusakan air dan durasi pulih longsor tidak ditemukan di sumber yang dibuka kajian ini.

:::: skenario {#tbl:kartu-longsor}
jenis: longsor
judul: Tanah longsor setara tahun nasional terberat dan kab-tahun Pacitan 2017
dasar: Tidak ada kejadian tunggal longsor besar di paket data; lantai rumah memakai kab-tahun Pacitan 2017 dan tahun nasional terberat 2008–2025, batas atas satu kejadian.
kemungkinan: tidak dinilai: tidak ada dasar peluang per jenis; patahan kategori 2018 dan 2024 memotong seri
peta: gambar/rehab/bab08-kartu-longsor.png
lembaga: Deputi Bidang Rehabilitasi dan Rekonstruksi; Kementerian Pekerjaan Umum; Kementerian Energi dan Sumber Daya Mineral; BPBD provinsi
sumber: DIBI BNPB [@bnpb-dibi]
kaki: Angka setahun, batas atas satu kejadian; layanan air dan durasi pulih tidak dikuantifikasi; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah rusak kab-tahun Pacitan 2017 | {{angka:rehab.lantai.longsor.pacitan2017.rumah_rusak}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, rumah rusak tahun nasional 2025 | {{angka:rehab.dibi.rumah_rusak.longsor.tahun_maks}} | – | resmi | DIBI BNPB; setahun |
| Infrastruktur/fisik, jembatan rusak provinsi-tahun dan nasional | {{angka:rehab.dibi.jembatan_rusak.longsor.prov_tahun_maks}} | {{angka:rehab.dibi.jembatan_rusak.longsor.tahun_maks}} | resmi | DIBI BNPB; Jawa Tengah 2020 dan nasional 2020 |
| Layanan sipil, layanan air terganggu | – | – | – | tidak dikuantifikasi; tidak ada sumber yang ditemukan |
| Kependudukan, pengungsi tahun nasional 2025 | {{angka:rehab.dibi.mengungsi.longsor.tahun_maks}} | – | resmi | DIBI BNPB; setahun |
| Lingkungan, luas longsoran | – | – | – | tidak dikuantifikasi di sumber yang dibuka |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.longsor.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali pengungsi setahun |
:::

::: kebijakan
Pengungsi longsor setahun {{angka:rehab.dibi.mengungsi.longsor.tahun_maks}} jiwa membutuhkan {{angka:rehab.darurat.longsor.air_m3_hari}} m³ air per hari, setara {{angka:rehab.darurat.longsor.truk_setara}} truk tangki.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Porsi longsor dalam rangkaian Sumatra 2025 | tidak terpisah | – | – | rumah rusak longsor dapat naik bila porsi Sumatra dipisah dari banjir |
| Data longsor DIBI 2024 | tidak lengkap | – | – | tahun 2024 tidak dipakai untuk lantai |
:::

::: respons
- Jembatan darurat longsor dihitung dari lantai provinsi-tahun {{angka:rehab.dibi.jembatan_rusak.longsor.prov_tahun_maks}} unit.
- Jembatan rusak dicatat per kejadian dan per status jalan (@rek:r-rr-01).
- Standar hari pemasangan akses darurat berlaku juga untuk ruas tertimbun longsor (@rek:r-rr-05).
:::

::: pemulihan
- Durasi pulih longsor tidak dikuantifikasi di sumber mana pun.
- Baseline waktu pulih akses dan air dibentuk paling lambat 2027 (@rek:r-rr-02).
:::
::::

## Erupsi Gunung Api {#sub:erupsi}

**Lantai rumah erupsi adalah Kelud 13–14 Februari 2014 dengan {{angka:rehab.lantai.erupsi.kelud2014.rumah_rb}} rumah rusak berat di Kab. Kediri dan Kab. Malang.** Angka itu lima kali Merapi 2010 ({{angka:rehab.lantai.erupsi.merapi2010.rumah_rb}} rumah rusak berat), sedangkan Merapi tetap lantai pengungsi erupsi dengan {{angka:dibi.merapi2010.mengungsi}} jiwa [@bnpb-dibi]. Kelud mencatat {{angka:rehab.lantai.erupsi.kelud2014.mengungsi}} pengungsi. Jembatan rusak kategori erupsi gunung api mencapai {{angka:rehab.dibi.jembatan_rusak.erupsi.prov_tahun_maks}} unit di Sumatera Barat pada 2024. Gladak Perak, jembatan bentang {{angka:rehab.akses.semeru2021.gladak_perak_bentang_m}} m yang terdampak erupsi Semeru 2021, dinilai Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan (Kemenko PMK) tidak memungkinkan dipasangi bailey. Kerusakan air erupsi tidak dikuantifikasi; mata air dan pipa gravitasi di lereng menjadi risiko yang hanya dapat ditulis kualitatif.

:::: skenario {#tbl:kartu-erupsi}
jenis: gunungapi
judul: Erupsi gunung api setara Kelud 2014, dengan lantai pengungsi Merapi 2010
dasar: Lantai rumah Kelud 2014 dan lantai pengungsi Merapi 2010 dari DIBI periode geologi 1996–2025; lantai jembatan provinsi-tahun Sumatera Barat 2024.
kemungkinan: periode ulang tidak dinilai: kelas peluang letusan setara Kelud 2014 tidak tersedia di bahan kajian
peta: gambar/rehab/bab08-kartu-erupsi.png
lembaga: Deputi Bidang Rehabilitasi dan Rekonstruksi; Kementerian Energi dan Sumber Daya Mineral; Kementerian Pekerjaan Umum; BPBD provinsi
sumber: DIBI BNPB [@bnpb-dibi]
kaki: Angka tercatat, bukan proyeksi model; layanan air dan durasi pulih tidak dikuantifikasi; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah rusak berat Kelud 2014 | {{angka:rehab.lantai.erupsi.kelud2014.rumah_rb}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, jembatan rusak provinsi-tahun | {{angka:rehab.dibi.jembatan_rusak.erupsi.prov_tahun_maks}} | – | resmi | DIBI BNPB; Sumatera Barat 2024 |
| Infrastruktur/fisik, bentang jembatan di luar kemampuan bailey (m) | {{angka:rehab.akses.semeru2021.gladak_perak_bentang_m}} | – | resmi | Kemenko PMK; Gladak Perak, Semeru 2021 |
| Layanan sipil, layanan air terganggu | – | – | – | tidak dikuantifikasi; tidak ada sumber yang ditemukan |
| Kependudukan, pengungsi tercatat Merapi 2010 | {{angka:dibi.merapi2010.mengungsi}} | – | resmi | DIBI BNPB |
| Lingkungan, luas tertutup material erupsi | – | – | – | tidak dikuantifikasi di sumber yang dibuka |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.erupsi.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali pengungsi Merapi 2010 |
| Kebutuhan respons, truk tangki setara | {{angka:rehab.darurat.erupsi.truk_setara}} | – | asumsi-kebijakan | Perka BNPB 7/2008; truk setara |
:::

::: kebijakan
Pengungsi Merapi 2010 sebanyak {{angka:dibi.merapi2010.mengungsi}} jiwa membutuhkan {{angka:rehab.darurat.erupsi.air_m3_hari}} m³ air per hari setelah hari ketiga, setara {{angka:rehab.darurat.erupsi.truk_setara}} truk tangki. Respons air erupsi tidak tercatat di sumber yang dibuka.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Lantai pengungsi, Merapi 2010 lawan Kelud 2014 | {{angka:dibi.merapi2010.mengungsi}} | {{angka:rehab.lantai.erupsi.kelud2014.mengungsi}} | – | kebutuhan air darurat turun bila lantai pengungsi Kelud dipakai |
| Relokasi permukiman kawasan rawan bencana III | kualitatif | – | – | tuas kualitatif; tidak dihitung |
:::

::: respons
- Truk tangki menjadi sumber air darurat selama mata air dan pipa gravitasi lereng belum diperiksa.
- Kebutuhan jembatan bentang panjang di luar kemampuan bailey didata lebih dulu (@rek:r-rr-05).
- Pipa gravitasi di lereng didata per titik (@rek:r-rr-01).
:::

::: pemulihan
- Durasi pulih erupsi tidak dikuantifikasi di sumber yang dibuka.
- Jembatan bentang panjang seperti Gladak Perak memerlukan konstruksi permanen karena bailey dinilai tidak memungkinkan.
- Relokasi kawasan rawan bencana III dicatat kualitatif.
:::
::::

## Cuaca Ekstrem {#sub:cuaca-ekstrem}

**Cuaca ekstrem merusak {{angka:rehab.dibi.rumah_rusak.cuaca_ekstrem.tahun_maks}} rumah dan membuat {{angka:rehab.dibi.mengungsi.cuaca_ekstrem.tahun_maks}} jiwa mengungsi pada 2019, tahun nasional terberat.** Rumah rusak berat terbanyak tercatat pada 2012, yaitu {{angka:rehab.dibi.rumah_rb.cuaca_ekstrem.tahun_maks}} [@bnpb-dibi]. Kab-tahun terberat adalah Kab. Bandung 2019 dengan {{angka:rehab.lantai.cuaca_ekstrem.bandung2019.rumah_rusak}} rumah rusak. Jembatan rusak provinsi-tahun terberat {{angka:rehab.dibi.jembatan_rusak.cuaca_ekstrem.prov_tahun_maks}} unit di Jawa Tengah 2025. Kategori puting beliung dan angin kencang berubah pada 2018–2023 dan belum tertutup untuk 2024, sehingga seri dibaca dengan patahan. Layanan air dan durasi pulih permanen tidak dikuantifikasi untuk jenis ini.

:::: skenario {#tbl:kartu-cuaca}
jenis: cuaca-ekstrem
judul: Cuaca ekstrem setara tahun nasional 2019 dan kab-tahun Bandung 2019
dasar: Tidak ada kejadian tunggal cuaca ekstrem besar di paket data; lantai rumah memakai tahun nasional terberat dan kab-tahun Bandung 2019, batas atas satu kejadian.
kemungkinan: tidak dinilai: tidak ada dasar peluang per jenis; kategori DIBI bergeser 2018–2023
peta: gambar/rehab/bab08-kartu-cuaca-ekstrem.png
lembaga: Deputi Bidang Penanganan Darurat; Deputi Bidang Rehabilitasi dan Rekonstruksi; BMKG; BPBD provinsi
sumber: DIBI BNPB [@bnpb-dibi]
kaki: Angka setahun, batas atas satu kejadian; layanan air tidak dikuantifikasi; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah rusak kab-tahun Bandung 2019 | {{angka:rehab.lantai.cuaca_ekstrem.bandung2019.rumah_rusak}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, rumah rusak tahun nasional 2019 | {{angka:rehab.dibi.rumah_rusak.cuaca_ekstrem.tahun_maks}} | – | resmi | DIBI BNPB; setahun |
| Infrastruktur/fisik, rumah rusak berat tahun nasional 2012 | {{angka:rehab.dibi.rumah_rb.cuaca_ekstrem.tahun_maks}} | – | resmi | DIBI BNPB; setahun |
| Infrastruktur/fisik, jembatan rusak provinsi-tahun | {{angka:rehab.dibi.jembatan_rusak.cuaca_ekstrem.prov_tahun_maks}} | – | resmi | DIBI BNPB; Jawa Tengah 2025 |
| Layanan sipil, layanan air terganggu | – | – | – | tidak dikuantifikasi; tidak ada sumber yang ditemukan |
| Kependudukan, pengungsi tahun nasional 2019 | {{angka:rehab.dibi.mengungsi.cuaca_ekstrem.tahun_maks}} | – | resmi | DIBI BNPB; setahun |
| Lingkungan, dampak lingkungan | – | – | – | tidak dikuantifikasi di sumber yang dibuka |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.cuaca_ekstrem.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali pengungsi setahun |
:::

::: kebijakan
Pengungsi cuaca ekstrem setahun {{angka:rehab.dibi.mengungsi.cuaca_ekstrem.tahun_maks}} jiwa membutuhkan {{angka:rehab.darurat.cuaca_ekstrem.air_m3_hari}} m³ air per hari, setara {{angka:rehab.darurat.cuaca_ekstrem.truk_setara}} truk tangki. Beban RR cuaca ekstrem terletak pada rumah, dengan {{angka:rehab.dibi.rumah_rusak.cuaca_ekstrem.tahun_maks}} rumah rusak pada 2019, bukan pada air darurat.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Patahan kategori puting beliung dan angin kencang | 2018–2023 | 2024 | – | rumah rusak 2024 dapat tercatat lebih rendah karena kategori belum tertutup |
:::

::: respons
- Kebutuhan air darurat dihitung dari pengungsi tercatat dengan standar Perka BNPB 7/2008.
- Jembatan rusak dicatat per kejadian dan per status jalan (@rek:r-rr-01).
- Kategori kejadian dicatat konsisten agar seri DIBI tidak patah lagi.
:::

::: pemulihan
- Durasi pulih permanen tidak dicatat di sumber yang dibuka.
- Jembatan rusak provinsi-tahun paling banyak {{angka:rehab.dibi.jembatan_rusak.cuaca_ekstrem.prov_tahun_maks}} unit, di Jawa Tengah 2025.
- Rumah rusak berat tahun terberat {{angka:rehab.dibi.rumah_rb.cuaca_ekstrem.tahun_maks}} unit (2012).
:::
::::

## Kartu Agregat Musim Hujan 2026/2027 untuk Kesiapan RR {#sub:musim-hujan}

**Musim hujan 1 Oktober 2025–30 April 2026 adalah musim terberat tercatat secara nasional, dengan {{angka:rehab.musim.2025_26.rumah_rb}} rumah rusak berat dan {{angka:rehab.musim.2025_26.mengungsi}} pengungsi.** Rumah rusak sedang {{angka:rehab.musim.2025_26.rumah_rs}} dan rusak ringan {{angka:rehab.musim.2025_26.rumah_rr}} pada musim yang sama [@bnpb-dibi]. Musim La Niña 2020/2021, yang dipilih kajian sebagai pembanding, jauh lebih ringan, yaitu {{angka:rehab.musim.lanina_2020_21.rumah_rb}} rumah rusak berat, sekitar seperlima musim 2025/2026, dan {{angka:rehab.musim.lanina_2020_21.mengungsi}} pengungsi. Perbandingan dengan musim La Niña karena itu hanya ditulis sebagai baris kepekaan, bukan dasar lantai.

**Peluang paling sedikit satu musim seburuk lantai dalam lima musim adalah {{angka:hidromet.nasional.lantai.peluang_5_musim|fmt=1|persen}}, pita kemungkinan 4.** Peluang itu turunan kajian dari seri musim DIBI dan berlabel asumsi kebijakan. Pengungsi musim lantai membutuhkan {{angka:rehab.darurat.musim.air_m3_hari}} m³ air per hari setelah hari ketiga, setara {{angka:rehab.darurat.musim.truk_setara}} truk tangki atau {{angka:rehab.darurat.musim.sumur_setara}} sumur. Jembatan rusak musim tidak dapat dihitung dari rekap tahunan, sehingga kartu memakai {{angka:rehab.dibi.jembatan_rusak.2025}} jembatan rusak semua jenis pada tahun kalender 2025 dengan catatan periode berbeda [@bnpb-dibi]. Inventaris jembatan darurat, kit pipa, instalasi pengolahan air bergerak, dan truk tangki per Direktorat PD Wilayah dibandingkan dengan kartu ini dalam empat belas hari pertama (@rek:r-rr-06).

:::: skenario {#tbl:kartu-musim}
jenis: banjir
judul: Musim hujan nasional setara 2025/2026 untuk kesiapan RR musim 2026/2027
dasar: Lantai musim hujan terberat tercatat 1 Oktober 2025–30 April 2026 untuk banjir, banjir bandang, longsor, banjir dan longsor, serta cuaca ekstrem dari DIBI; musim La Niña 2020/2021 sebagai pembanding.
kemungkinan: 4
peta: gambar/rehab/bab08-kartu-musim-hujan.png
lembaga: Deputi Bidang Logistik dan Peralatan; Deputi Bidang Penanganan Darurat; Kementerian Pekerjaan Umum; TNI
sumber: DIBI BNPB [@bnpb-dibi]; Perka BNPB 7/2008 [@bnpb-2008-kebutuhan-dasar]
kaki: Angka musim tercatat; peluang lima musim turunan kajian, asumsi kebijakan; jembatan memakai tahun kalender 2025; kolom korban jiwa kepekaan tidak dihitung karena kartu memuat beban RR.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Infrastruktur/fisik, rumah rusak berat musim 2025/2026 | {{angka:rehab.musim.2025_26.rumah_rb}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, rumah rusak sedang musim 2025/2026 | {{angka:rehab.musim.2025_26.rumah_rs}} | – | resmi | DIBI BNPB |
| Infrastruktur/fisik, jembatan rusak semua jenis 2025 | {{angka:rehab.dibi.jembatan_rusak.2025}} | – | resmi | DIBI BNPB; tahun kalender, bukan musim |
| Layanan sipil, SPAM terdampak Sumatra 2025 | {{angka:rehab.pipa.sumatra2025.spam_terdampak}} | – | resmi | Kementerian PU; satu kejadian dalam musim |
| Kependudukan, pengungsi musim 2025/2026 | {{angka:rehab.musim.2025_26.mengungsi}} | – | resmi | DIBI BNPB; jumlah per laporan |
| Lingkungan, luas genangan musim | – | – | – | luas genangan per musim tidak tersedia secara nasional |
| Ekonomi, biaya pemulihan | – | – | – | biaya satuan di Bab 6 dan Bab 7, tidak dijumlah |
| Kebutuhan respons, air sesudah hari ketiga (m³/hari) | {{angka:rehab.darurat.musim.air_m3_hari}} | – | asumsi-kebijakan | Perka BNPB 7/2008 dikali pengungsi musim |
| Kebutuhan respons, truk tangki atau sumur setara | {{angka:rehab.darurat.musim.sumur_setara}} | {{angka:rehab.darurat.musim.truk_setara}} | asumsi-kebijakan | alternatif, tidak dijumlah: sumur (rendah), truk (tinggi) |
:::

::: kebijakan
Peluang paling sedikit satu musim setara lantai dalam lima musim {{angka:hidromet.nasional.lantai.peluang_5_musim|fmt=1|persen}}. Pada lantai itu kebutuhan air darurat {{angka:rehab.darurat.musim.air_m3_hari}} m³ per hari dan {{angka:rehab.darurat.musim.keran}} keran, yang menjadi pembanding inventaris per Direktorat PD Wilayah.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Musim analog, 2025/2026 lawan La Niña 2020/2021, rumah rusak berat | {{angka:rehab.musim.2025_26.rumah_rb}} | {{angka:rehab.musim.lanina_2020_21.rumah_rb}} | – | rumah rusak berat sekitar seperlima bila musim La Niña dipakai |
| Musim analog, 2025/2026 lawan La Niña 2020/2021, pengungsi | {{angka:rehab.musim.2025_26.mengungsi}} | {{angka:rehab.musim.lanina_2020_21.mengungsi}} | – | kebutuhan air darurat turun kira-kira separuh |
:::

::: respons
- Inventaris jembatan darurat, kit pipa, instalasi pengolahan air bergerak, dan truk tangki dibandingkan dengan kartu ini (@rek:r-rr-06).
- Standar hari pemasangan akses darurat ditetapkan sebelum puncak musim (@rek:r-rr-05).
- Kerusakan SPAM dan jembatan per kejadian dicatat di DIBI (@rek:r-rr-01).
:::

::: pemulihan
- R3P disusun paling lama {{angka:perban2017_5.r3p_hari_maks}} hari dan berlaku paling lama {{angka:perban2017_5.r3p_masa_tahun}} tahun.
- Jembatan daerah dan SPAM permanen dipantau terhadap masa R3P.
- Perbaikan permanen SPAM Sumatra ditargetkan Agustus 2028.
:::
::::

## Sebaran per Provinsi dan Kab/Kota {#sub:sebaran}

**Jembatan rusak karena banjir 2018–2025 terpusat di Aceh ({{angka:rehab.sebaran.jembatan_2018_2025.banjir.aceh}}), Sumatera Barat ({{angka:rehab.sebaran.jembatan_2018_2025.banjir.sumbar}}), dan Sulawesi Selatan ({{angka:rehab.sebaran.jembatan_2018_2025.banjir.sulsel}}), dari {{angka:rehab.sebaran.jembatan_2018_2025.banjir.n_prov}} provinsi yang mencatatnya.** Kalimantan Barat menyusul dengan {{angka:rehab.sebaran.jembatan_2018_2025.banjir.kalbar}} jembatan [@bnpb-dibi]. Jembatan rusak karena longsor terbanyak di Jawa Barat ({{angka:rehab.sebaran.jembatan_2018_2025.longsor.jabar}}) dan Jawa Tengah ({{angka:rehab.sebaran.jembatan_2018_2025.longsor.jateng}}). Sebaran jembatan hanya tersedia sampai provinsi; jembatan per kab/kota tidak tercatat di DIBI yang tersedia. Geografi rumah rusak berat berbeda: gempa 2015–2025 terpusat di NTB ({{angka:rehab.sebaran.rb_2015_2025.gempa.ntb}}), Sulawesi Tengah ({{angka:rehab.sebaran.rb_2015_2025.gempa.sulteng}}), dan Jawa Barat ({{angka:rehab.sebaran.rb_2015_2025.gempa.jabar}}), sedangkan banjir terpusat di Aceh ({{angka:rehab.sebaran.rb_2015_2025.banjir.aceh}}). Rumah rusak berat karena longsor terbanyak di Jawa Barat ({{angka:rehab.sebaran.rb_2015_2025.longsor.jabar}}), dan karena cuaca ekstrem di Jawa Barat ({{angka:rehab.sebaran.rb_2015_2025.cuaca_ekstrem.jabar}}) dan Jawa Tengah ({{angka:rehab.sebaran.rb_2015_2025.cuaca_ekstrem.jateng}}) [@bnpb-dibi]. Nusa Tenggara Timur masuk daftar provinsi beban gempa sejak 2026, dengan angka sementara. Panel jembatan dan panel rumah pada @gbr:peta-sebaran menunjukkan dua geografi yang berbeda, dan panel ketiga menunjukkan beban berulang.

::: gambar {#gbr:peta-sebaran}
berkas: gambar/rehab/bab08-peta-sebaran-provinsi.png
jenis: peta
judul: Jembatan rusak 2018–2025, rumah rusak berat 2015–2025, dan beban berulang per provinsi di Indonesia (unit)
sumber: DIBI BNPB, rekap provinsi tahunan bencana alam 2015–2026; pengolahan kajian ini
keyakinan: resmi
lebar: penuh
data_per: 23 Okt 2026
catatan: Panel (a) jembatan dan (b) rumah memakai bulatan sebanding; panel (c) menghitung tahun berkerusakan. Sisipan NTT 2026 bertanda sementara.
:::

**Kab/kota penanggung beban puncak berbeda dari kab/kota penanggung beban berulang: Kota Padang mencatat {{angka:rehab.sebaran.kab.gempa.kota_padang}} rumah rusak gempa 2008–2026, sedangkan Kab. Sukabumi mencatat rumah rusak gempa di {{angka:rehab.sebaran.kab.gempa.sukabumi_tahun}} tahun berbeda.** Sebanyak {{angka:rehab.sebaran.kab.gempa.n_kab}} kab/kota mencatat rumah rusak gempa [@bnpb-dibi]. Untuk longsor 2015–2025, {{angka:rehab.sebaran.kab.longsor.n_kab_tiap_tahun}} dari {{angka:rehab.sebaran.kab.longsor.n_kab}} kab/kota mencatat rumah rusak di setiap tahun; untuk cuaca ekstrem, {{angka:rehab.sebaran.kab.cuaca_ekstrem.n_kab_tiap_tahun}} dari {{angka:rehab.sebaran.kab.cuaca_ekstrem.n_kab}}. Hanya {{angka:rehab.sebaran.kab.berulang3.n_kab}} kab/kota, yaitu Kab. Bogor dan Kab. Sukabumi, mencatat rumah rusak karena gempa maupun longsor dan cuaca ekstrem di paling sedikit {{angka:rehab.sebaran.kab.berulang3.min_tahun}} tahun pada 2015–2025, walau jembatan per kab/kota belum terhitung.

**Kab. Aceh Utara mencatat {{angka:rehab.sebaran.kab.banjir.aceh_utara_2025.rumah_rusak}} rumah rusak karena banjir pada 2025 dengan {{angka:rehab.sebaran.kab.banjir.aceh_utara_2025.mengungsi}} pengungsi.** Aceh memegang lantai banjir untuk rumah dan jembatan, dan menanggung bagian terbesar SPAM terdampak. Kab. Aceh Tamiang memegang rumah rusak berat banjir terbanyak 2008–2026, yaitu {{angka:rehab.sebaran.kab.banjir.aceh_tamiang.rb}} [@bnpb-dibi]. Aceh karena itu calon terkuat uji coba paket air dan akses (@rek:r-rr-14). Kab. Nagekeo tidak dimasukkan ke @tbl:kab-beban, karena versi DIBI sebesar {{angka:rehab.lantai.gempa.flores2026.nagekeo_rusak_dibi}} rumah rusak melebihi data awal BNPB {{angka:rehab.lantai.gempa.flores2026.nagekeo_data_awal}}, dan verifikasi mendapati {{angka:rehab.lantai.gempa.flores2026.nagekeo_tidak_rusak_terverifikasi}} rumah tidak rusak [@bnpb-2026-flores-verifikasi].

::: tabel {#tbl:kab-beban}
judul: Kab/kota penanggung beban puncak dan beban berulang per jenis bencana di Indonesia, 2008–2026 (unit)
sumber: DIBI BNPB, rekap kab/kota tahunan bencana alam 2008–2026; pengolahan kajian ini
keyakinan: resmi
angka: 4
data_per: 23 Okt 2026
catatan: Daftar penanda frekuensi dan puncak, bukan daftar perhatian RR. Rumah rusak mencakup rusak berat, sedang, dan ringan kecuali disebut rusak berat.

| JENIS | KAB/KOTA | BESARAN | NILAI | PERIODE |
| --- | --- | --- | ---: | --- |
| Gempa bumi | Kota Padang | rumah rusak | {{angka:rehab.sebaran.kab.gempa.kota_padang}} | 2008–2026 |
| Gempa bumi | Kab. Padang Pariaman | rumah rusak | {{angka:rehab.sebaran.kab.gempa.padang_pariaman}} | 2008–2026 |
| Gempa bumi | Kab. Cianjur | rumah rusak | {{angka:rehab.sebaran.kab.gempa.cianjur}} | 2008–2026 |
| Gempa bumi | Kab. Lombok Barat | rumah rusak | {{angka:rehab.sebaran.kab.gempa.lombok_barat}} | 2008–2026 |
| Gempa bumi dan tsunami | Kota Palu | rumah rusak | {{angka:rehab.sebaran.kab.gempa_tsunami.kota_palu}} | 2018 |
| Gunung api | Kab. Kediri | rumah rusak | {{angka:rehab.sebaran.kab.gunungapi.kediri}} | 2008–2026 |
| Tsunami | Kab. Lampung Selatan | rumah rusak | {{angka:rehab.sebaran.kab.tsunami.lampung_selatan}} | 2008–2026 |
| Banjir | Kab. Aceh Utara | rumah rusak | {{angka:rehab.sebaran.kab.banjir.aceh_utara_2025.rumah_rusak}} | 2025 |
| Banjir | Kab. Aceh Tamiang | rumah rusak berat | {{angka:rehab.sebaran.kab.banjir.aceh_tamiang.rb}} | 2008–2026 |
| Tanah longsor | Kab. Pacitan | rumah rusak, sepuluh tahun berkerusakan | {{angka:rehab.sebaran.kab.longsor.pacitan}} | 2015–2025 |
| Cuaca ekstrem | Kab. Bogor | rumah rusak, sebelas tahun berkerusakan | {{angka:rehab.sebaran.kab.cuaca_ekstrem.bogor}} | 2015–2025 |
:::

## Matriks Kemungkinan dan Dampak RR {#sub:matriks}

**Hanya dua kelompok ancaman yang punya dasar peluang lima tahun: musim hujan setara lantai ({{angka:hidromet.nasional.lantai.peluang_5_musim|fmt=1|persen}}, pita 4) dan megathrust Jawa ({{angka:geologi.jawa_gabungan.peluang_5th|fmt=2|persen}} untuk Mw {{angka:pusgen.jawa.mmaks|fmt=1}} gabungan, pita 2).** Megathrust Jawa per segmen berpeluang {{angka:geologi.jawa_segmen.peluang_5th|fmt=2|persen}} dalam lima tahun, pita 3 [@pusgen-2024-peta-gempa]. Kedua peluang megathrust adalah turunan Poisson kajian dari periode ulang Pusat Studi Gempa Nasional (PuSGeN) 2024, bukan angka PuSGeN, dan berlabel asumsi kebijakan. Jenis lain, termasuk gempa di luar megathrust Jawa, tidak punya dasar peluang dan ditempatkan di panel "dampak dinilai, kemungkinan tidak dinilai" pada @gbr:matriks-rr.

**Kelas dampak RR memakai lantai rumah rusak: kelas 5 untuk paling sedikit {{angka:rehab.kelas_dampak_rr.ambang_5}} rumah, kelas 4 untuk {{angka:rehab.kelas_dampak_rr.ambang_4}} sampai di bawahnya, dan kelas 3 mulai {{angka:rehab.kelas_dampak_rr.ambang_3}}.** Ambang itu usulan kajian dan dihitung ulang bila Bab 3 menetapkan ambang lain. Lantai gempa dan lantai tsunami berada di kelas 5, begitu pula banjir. Erupsi berada di kelas 4, karena tahun Kelud 2014 mencatat {{angka:rehab.dibi.rumah_rusak.erupsi.2014}} rumah rusak [@bnpb-dibi]. Cuaca ekstrem berada di kelas 4 dengan {{angka:rehab.dibi.rumah_rusak.cuaca_ekstrem.tahun_maks}} rumah rusak setahun, dan longsor di kelas 3 dengan {{angka:rehab.dibi.rumah_rusak.longsor.tahun_maks}}; keduanya jumlah setahun, bukan satu kejadian. Likuefaksi ditulis gabungan dan batas atas, tidak sejajar dengan gempa dan tsunami. Titik megathrust Jawa berada di kelas 5, karena skenario tidak boleh lebih ringan daripada lantai tsunami Aceh dan Nias 2004; Pangandaran 2006 di kajian mitigasi hanya memberi lantai korban jiwa dan tidak memuat jumlah rumah. Kemungkinan dan dampak tidak dikalikan menjadi skor.

::: gambar {#gbr:matriks-rr}
berkas: gambar/rehab/bab08-matriks-kemungkinan-dampak.png
jenis: diagram
judul: Posisi jenis bencana pada matriks kemungkinan lima tahun dan kelas dampak RR di Indonesia
sumber: DIBI BNPB; PuSGeN 2024; pengolahan kajian ini
keyakinan: asumsi-kebijakan
lebar: penuh
data_per: 25 Okt 2026
catatan: Posisi, bukan peringkat; panel kanan memuat jenis yang dampaknya dinilai tanpa kelas kemungkinan.
:::
