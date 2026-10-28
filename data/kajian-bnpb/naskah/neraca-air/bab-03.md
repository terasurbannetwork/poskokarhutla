---
kajian: neraca-air
bab: 3
judul: Metode dan Data
pertanyaan: Bagaimana pasokan, aliran antar-kab/kota, dan kebutuhan dihitung, data apa yang dipakai, dan asumsi apa yang menentukan hasilnya?
status: draf
target_halaman: 7
---

# Metode dan Data {#bab:metode}

::: ringkasan-bab
**Temuan:**

- Pasokan dihitung per sel iklim dengan bak lengas tanah bulanan, lalu dialirkan melalui {{angka:neraca.hitung.subdas}} bagian daerah aliran sungai (DAS) dari hulu ke hilir dan dibagi ke kab/kota menurut luas irisan.
- Dua parameter tampungan dipilih dengan data tahun kering; pilihan itu menjaga aliran kemarau tahun kering tetap ada, dengan harga aliran Juni–Oktober rerata yang belum lolos ambang validasi.

**Angka kunci:**

- {{angka:neraca.param.n_sel|satuan}} kisi iklim sepersepuluh derajat yang menyentuh kab/kota Jawa, dengan seri {{angka:neraca.param.tahun_iklim|satuan}} [@chc-2026-chirps; @nasa-2026-power].

**Rekomendasi:** @rek:n-waduk, @rek:n-industri
:::

**Neraca tiap kab/kota tiap bulan mengikuti persamaan hujan dikurangi evapotranspirasi aktual, dikurangi aliran keluar, ditambah aliran masuk, dikurangi pemakaian, sama dengan perubahan simpanan.** Bentuk ini sama dengan neraca sumber daya air spasial SNI Neraca Sumber Daya Air 2002, dengan langkah bulanan dan aliran antarwilayah yang ditelusuri [@bsn-2002-sni6728]. Konservasi massa diperiksa tiap kali model dijalankan: hujan habis menjadi evapotranspirasi dan aliran keluar sesudah pemakaian, ditambah perubahan simpanan, dengan galat di bawah sepersepuluh persen [@pantaubencana-2026-neraca-air].

## Pasokan: Hujan, Penguapan, dan Limpasan {#sub:metode-pasokan}

**Hujan bulanan diambil dari CHIRPS dan evapotranspirasi acuan dihitung dengan rumus Penman-Monteith Food and Agriculture Organization (FAO) dari data National Aeronautics and Space Administration (NASA) Prediction Of Worldwide Energy Resources (POWER).** CHIRPS menggabungkan pengamatan satelit dan stasiun pada kisi halus [@chc-2026-chirps; @funk-2015-chirps]. Evapotranspirasi acuan dihitung dari suhu, radiasi, kelembapan, dan angin bulanan di {{angka:neraca.param.n_titik_power|satuan}} kisi setengah derajat [@nasa-2026-power; @allen-1998-fao56]. Rancangan awal memakai satu sumber, yaitu reanalisis ERA5-Land lewat Open-Meteo; sumber itu tidak menyediakan hujan ERA5-Land untuk Jawa dan dibatasi kuota, sehingga ERA5 dipakai sebagai pembanding di DI Yogyakarta [@openmeteo-2026-era5].

**Tiap sel memakai bak lengas tanah dengan kapasitas air tersedia {{angka:neraca.param.taw_mm|satuan}} dan koefisien tanaman {{angka:neraca.param.kc}}.** Evapotranspirasi aktual turun ketika lengas tanah berkurang, dan surplus bak menjadi limpasan. Surplus dibagi ke aliran langsung dan aliran dasar; aliran dasar melewati tampungan linear dengan pecahan {{angka:neraca.param.alpha|fmt=1}} dan waktu tinggal {{angka:neraca.param.k_bulan|satuan}}, supaya sungai tidak kering seketika ketika hujan berhenti [@thornthwaite-1957-neraca; @allen-1998-fao56].

## Aliran Antar-Kab/Kota {#sub:metode-aliran}

**Batas daerah aliran sungai (DAS) tingkat sub-DAS diambil dari HydroBASINS level sembilan: {{angka:neraca.param.n_subdas|satuan}} sub-DAS di Pulau Jawa dengan luas rerata {{angka:neraca.param.subdas_rerata_km2|satuan}}.** Tiap sub-DAS diiris dengan batas kab/kota dan sel iklim lewat kisi sampel seperseratus derajat, dan rantai hilirnya diikuti sampai laut [@hydrosheds-2026-hydrobasins; @lehner-2013-hydrobasins]. Celah pantai tanpa sub-DAS dialirkan langsung ke laut. Aliran sebulan dianggap sampai di muara pada bulan yang sama, karena waktu tempuh sungai di Jawa lebih pendek dari sebulan.

**Pemakaian di hulu mengurangi aliran yang sampai ke hilir.** Air yang dipakai kab/kota hulu tidak tersedia lagi bagi kab/kota di bawahnya, kecuali aliran balik irigasi {{angka:neraca.param.aliran_balik_persen|persen}}. Sub-DAS yang terbelah dua kab/kota membagi alirannya menurut pecahan luas. Kota kecil yang lebih sempit dari satu sub-DAS menerima air menurut pecahan luasnya terhadap sungai yang melintas, sehingga angkanya kasar; {{angka:neraca.hitung.kota_kecil}} kab/kota ditandai demikian di tabel.

**Lima sistem waduk besar dan Saluran Tarum Barat dimasukkan sebagai tabel bersumber.** Waduk menahan air ketika aliran masuk melebihi pelepasan sasaran, yaitu rerata aliran tanpa waduk, dan melepasnya ketika aliran turun. Saluran Tarum Barat mengalirkan {{angka:neraca.param.tarum_barat_l_det|satuan}} dari sistem Jatiluhur ke kota-kota DKI Jakarta [@dsda-dki-2026-tarum-barat]. Hanya satu angka tampungan waduk yang bersumber resmi, yaitu Kedung Ombo [@bbwspj-2021-bendungan]; sumber tiap baris ada di @lamp:koefisien.

## Kebutuhan Air {#sub:metode-kebutuhan}

**Kebutuhan dihitung untuk empat sektor dengan koefisien yang sumbernya tercatat (@tbl:koefisien).** Penduduk 2025 dan 2030 diambil dari WorldPop yang disesuaikan dengan Proyeksi Penduduk Badan Pusat Statistik (BPS) per provinsi, dan pangsa penduduk perkotaan dari tabel BPS yang sama [@worldpop-2025; @bps-2026-proyeksi-prov; @bps-2026-perkotaan-prov]. Ternak dihitung dari populasi BPS 2024, dan industri dari tenaga kerja industri besar dan sedang [@bps-2026-ternak-kab; @bps-2026-industri-kab]. Kebutuhan irigasi bulanan dihitung dari luas irigasi permukaan Permen PUPR 14/PRT/M/2015 dengan pola tanam padi, padi, palawija [@pupr-2015-permen14; @pu-2013-kp01].

::: tabel {#tbl:koefisien}
judul: Koefisien kebutuhan air dan parameter model, 2002–2026
sumber: SNI Neraca Sumber Daya Air 2002; FAO-56; Permen LH 17/2009; parameter model kajian ini
keyakinan: campuran
angka: 2

| BESARAN | NILAI | KEYAKINAN | SUMBER |
| --- | ---: | --- | --- |
| Domestik perkotaan (liter/kapita/hari) | {{angka:neraca.param.dom_kota}} | resmi | SNI Neraca Sumber Daya Air 2002 bagian 5 |
| Domestik perdesaan (liter/kapita/hari) | {{angka:neraca.param.dom_desa}} | resmi | SNI Neraca Sumber Daya Air 2002 bagian 5 |
| Sapi dan kerbau (liter/ekor/hari) | {{angka:neraca.param.sapi}} | resmi | SNI Neraca Sumber Daya Air 2002 Tabel 4 |
| Kambing dan domba (liter/ekor/hari) | {{angka:neraca.param.kambing}} | resmi | SNI Neraca Sumber Daya Air 2002 Tabel 4 |
| Unggas (liter/ekor/hari) | {{angka:neraca.param.unggas|fmt=1}} | resmi | SNI Neraca Sumber Daya Air 2002 Tabel 4 |
| Industri (liter/pekerja/hari) | {{angka:neraca.param.industri_l}} | asumsi-kebijakan | pedoman Kementerian PU 2005, dikutip sekunder |
| Efisiensi irigasi | {{angka:neraca.param.efisiensi_persen|persen}} | asumsi-kebijakan | gaya KP-01, parameter kajian ini |
| Aliran balik irigasi | {{angka:neraca.param.aliran_balik_persen|persen}} | asumsi-kebijakan | keputusan pemilik kajian, 26 Oktober 2026 |
| Kapasitas air tersedia tanah (mm) | {{angka:neraca.param.taw_mm}} | asumsi-kebijakan | parameter kajian ini |
| Waktu tinggal aliran dasar (bulan) | {{angka:neraca.param.k_bulan}} | asumsi-kebijakan | kalibrasi GloFAS, Bab 8 |
:::

**Kebutuhan irigasi gaya KP-01 adalah kebutuhan potensial.** Angka itu menganggap seluruh luas irigasi permukaan ditanami sesuai pola dengan efisiensi {{angka:neraca.param.efisiensi_persen|persen}}, tanpa memeriksa apakah air benar-benar diberikan. Untuk Pulau Jawa hasilnya {{angka:neraca.jawa.irigasi_persen_sni|persen}} dari pembanding SNI {{angka:neraca.param.sni_l_det_ha|satuan}} [@bsn-2002-sni6728]. Kebutuhan konsumtif 2030 hanya menambah pertumbuhan penduduk domestik menurut proyeksi BPS berbasis Sensus Penduduk 2010; kebutuhan sektor lain tetap 2025 [@bps-2026-proyeksi-prov].

## Skenario dan Label Keyakinan {#sub:skenario-label}

**Lima skenario iklim dipakai: rerata 1991–2025 dan empat tahun kering 1997, 2015, 2019, dan 2023.** Skenario tahun kering memakai hujan dan penguapan tahun itu dengan kebutuhan 2025, sehingga menjawab pertanyaan berapa kekurangan bila iklim tahun itu berulang hari ini. Musim kemarau Juni–Oktober menyumbang {{angka:neraca.jawa.r_kemarau_persen_tahunan|persen}} limpasan tahunan rerata [@pantaubencana-2026-neraca-air].

**Label estimasi model menempel pada tiap angka neraca, dan angka yang bersandar pada asumsi diberi label asumsi kebijakan.** Koefisien SNI dan batas wilayah berlabel resmi. Data kosong tetap kosong: kab/kota tanpa data industri tidak diberi nol, dan tanda † di tabel menunjukkan kebutuhan industrinya tidak dihitung [@bps-2026-industri-kab].
