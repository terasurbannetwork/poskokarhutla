---
kajian: air
bab: 4
judul: Kondisi Sumber Daya Air Pulau Jawa
pertanyaan: Berapa porsi rumah tangga tiap provinsi yang minum dari sumur dan mata air, sumber yang rentan saat kemarau? Berapa luas irigasi per kewenangan, dan di mana daerah irigasi kewenangan pusat terpusat? Bendungan mana yang kehilangan tampungan menurut dokumen resmi, dan kota mana yang laju penurunan muka tanahnya terverifikasi?
status: final
target_halaman: 14
---

# Kondisi Sumber Daya Air Pulau Jawa {#bab:kondisi-air}

::: ringkasan-bab
**Temuan:**

- Sumur dan mata air menjadi sumber air minum {{angka:airjawa.banten.sumur_mata_air_semua_2023|fmt=2}}–{{angka:airjawa.diy.sumur_mata_air_semua_2023|fmt=2|persen}} rumah tangga di lima provinsi selain DKI Jakarta pada 2023, sedangkan akses air minum layak 2025 sudah {{angka:airjawa.jateng.air_minum_layak_2025|fmt=2|persen}} atau lebih di semua provinsi, sehingga ukuran layak tidak membedakan kerentanan kemarau.
- Balai Besar Wilayah Sungai (BBWS) Pemali-Juana kehilangan {{angka:airjawa.bendungan.pj.sedimentasi_total|fmt=2|satuan}} atau {{angka:airjawa.bendungan.pj.kehilangan_persen|persen}} tampungan desain {{angka:airjawa.bendungan.n_pj2021|satuan}} per Juli 2021, dan Cacaban serta Kedungombo menyumbang {{angka:airjawa.bendungan.pj.cacaban_kedungombo_porsi_sedimentasi_persen|persen}} kehilangan itu.
- Daerah irigasi (DI) kewenangan kabupaten/kota memegang {{angka:airjawa.jawa.irigasi_kabkota_porsi_persen|persen}} dari {{angka:airjawa.jawa.irigasi_total_ha|satuan}} irigasi Jawa menurut penetapan 2015, sedangkan DI Jatiluhur sendiri memegang {{angka:airjawa.di.jatiluhur.porsi_di_pusat_jawa_persen|persen}} luas DI kewenangan pusat di Jawa dan bergantung pada kaskade Citarum.

**Angka kunci:**

- {{angka:airjawa.turun_tanah.pekalongan.gnss_cpkl|satuan}} penurunan muka tanah di stasiun *Global Navigation Satellite System* (GNSS) CPKL, Kota Pekalongan, 2010–2021 [@susilo-2023-gnss].
- {{angka:airjawa.jawa.irigasi_porsi_nasional_persen|persen}} luas daerah irigasi nasional berada di Jawa menurut Permen PUPR 14/2015 [-@pupr-2015-permen14, Lampiran].
- {{angka:airjawa.bendungan.kedungombo.inklinometer_rusak}} dari {{angka:airjawa.bendungan.kedungombo.inklinometer}} inklinometer Bendungan Kedungombo rusak per Juli 2021 [@bbwspj-2021-bendungan].

**Rekomendasi:** @rek:r-a03, @rek:r-a14
:::

::: gambar {#gbr:foto-b04-brantas}
berkas: gambar/foto/air-b04-brantas.jpg
jenis: foto
judul: Sungai Brantas di Minggiran, Jawa Timur, September 2021
pengarang: NFarras
lisensi: CC BY-SA 4.0
url: https://commons.wikimedia.org/wiki/File:Brantas_River_in_Minggiran,_East_Java.jpg
potong: dipotong tengah ke rasio 2:1
lebar: penuh
:::


**Lima komponen air yang dikaji di Pulau Jawa dikelola pelaksana yang berbeda, dan UU 17/2019 tentang Sumber Daya Air membagi peran mereka saat daya rusak air menjadi bencana.** Menurut Pasal 35 ayat (2), pengendalian daya rusak air diutamakan pada pencegahan melalui perencanaan dalam Pola Pengelolaan Sumber Daya Air, yang menurut Pasal 39 ayat (1) disusun Pemerintah Pusat dan pemerintah daerah sesuai kewenangannya [@ri-2019-uu17]. Ayat (5) menyerahkan penanggulangan daya rusak air yang dinyatakan sebagai bencana kepada ketentuan peraturan perundang-undangan, yaitu UU 24/2007 [@ri-2007-uu24], dan ayat (6) memberi gubernur dan/atau bupati/wali kota wewenang mengambil tindakan darurat dalam keadaan yang membahayakan. @gbr:hulu-hilir menempatkan Balai Besar Wilayah Sungai (BBWS) dan Perum Jasa Tirta (PJT) di waduk, BBWS juga di irigasi kewenangan pusat, dan dinas kabupaten/kota di irigasi kecil. Perusahaan daerah air minum (PDAM) memegang air minum perpipaan, Badan Geologi memegang air tanah, dan Badan Penanggulangan Bencana Daerah (BPBD) bekerja saat daya rusak air menjadi bencana. Data yang belum terbuka untuk tiap komponen diminta kepada lembaga pemegangnya (@sub:celah).

::: gambar {#gbr:hulu-hilir}
berkas: gambar/air/bab04-diagram-hulu-hilir.png
jenis: diagram
judul: Komponen sumber daya air Pulau Jawa sepanjang aliran sungai dan lembaga pelaksananya, 2026
sumber: UU 17/2019 Pasal 35; Permen PUPR 14/2015 Pasal 9–11; pengolahan Pantau Bencana
keyakinan: resmi
lebar: penuh
catatan: Panah menunjukkan aliran tanggung jawab, bukan besaran aliran air.
:::

## Ketersediaan dan Pemakaian Air {#sub:ketersediaan}

**Indeks pemakaian air (IPA) Pulau Jawa pada 2010 adalah {{angka:airjawa.jawa.ipa_2010_persen|persen}}, kelas kritis sedang, atau {{angka:airjawa.jawa.ipa_2010_tanpa_pemeliharaan_persen|persen}} tanpa aliran pemeliharaan sungai.** Angka ini keluaran model hujan-limpasan tingkat pulau yang dikutip @bps-2020-slhi dan belum diuji balik, sehingga tidak dapat diturunkan ke wilayah sungai (WS) atau kabupaten/kota. Model yang sama memberi Sumatera {{angka:airjawa.sumatera.ipa_2010_persen|persen}} serta Bali dan Nusa Tenggara {{angka:airjawa.bali_nusra.ipa_2010_persen|persen}}. Sumber itu mencatat air permukaan Jawa {{angka:airjawa.jawa.air_permukaan_m3s|satuan}}, atau {{angka:airjawa.jawa.porsi_air_permukaan_persen|persen}} air permukaan nasional.

**Pada musim kemarau, {{angka:airjawa.nasional.ws_tak_terpenuhi_kemarau}} dari {{angka:airjawa.nasional.ws_jumlah_analisis|satuan}} di Indonesia tidak dapat memenuhi kebutuhan airnya, dan {{angka:airjawa.jawa.ws_tak_terpenuhi_kemarau}} di antaranya berada di Jawa.** Angka ini hasil analisis tekanan air World Bank yang disusun bersama Badan Perencanaan Pembangunan Nasional (Bappenas) dan berlabel estimasi model [@bankdunia-2021-air, hlm. 14].

**Rencana Pengelolaan Sumber Daya Air (RPSDA) WS Jratunseluna 2024 menghitung defisit rata-rata {{angka:airjawa.jratunseluna.defisit_m3s|satuan}} dari kebutuhan eksisting {{angka:airjawa.jratunseluna.kebutuhan_eksisting_m3s|satuan}}.** Tabel neraca pada hlm. 191 dokumen resmi Kementerian Pekerjaan Umum (PU, dahulu Kementerian PUPR) itu mencatat defisit di setiap bulan menurut analisis neraca 2023, dan angkanya berlabel estimasi model [-@kemenpupr-2024-rpsda-jratunseluna, hlm. 26]. Defisit air baku untuk rumah tangga, perkotaan, irigasi, dan industri terutama terjadi di Kabupaten Grobogan, Pati, Demak, dan Blora serta Kota Semarang [-@kemenpupr-2024-rpsda-jratunseluna, hlm. 27]; urutan sebutan itu bukan peringkat, dan dokumen tidak merinci defisit per kabupaten/kota. Kebutuhan WS ini diproyeksikan {{angka:airjawa.jratunseluna.kebutuhan_proyeksi_m3s|satuan}} dalam dua puluh tahun. Sebagai angka tercatat di wilayah yang sama, akses air minum layak Grobogan {{angka:airjawa.grobogan.air_minum_layak_2025|fmt=2|persen}} pada 2025, terendah di Jawa Tengah (@sub:air-minum). Pola dan RPSDA sembilan WS lain di Jawa terbuka tetapi belum dibaca untuk bab ini, sedangkan dokumen WS Pemali-Comal tidak ditemukan.

## Air Baku dan Air Minum {#sub:air-minum}

**Pada 2023, sumur dan mata air melayani {{angka:airjawa.banten.sumur_mata_air_semua_2023|fmt=2}}–{{angka:airjawa.diy.sumur_mata_air_semua_2023|fmt=2|persen}} rumah tangga di lima provinsi selain DKI Jakarta, sedangkan leding hanya {{angka:airjawa.banten.leding_2023|fmt=2}}–{{angka:airjawa.jateng.leding_2023|fmt=2|persen}}.** Rincian per provinsi tampil pada @tbl:sumber-air-minum. Kelompok sumur dan mata air dalam kajian ini menjumlahkan kolom sumur bor atau pompa dengan sumur dan mata air terlindung maupun tak terlindung pada tabel Badan Pusat Statistik (BPS) [@bps-2024-sumber-air-minum-prov]. Sumber tak terlindung, yang paling rentan saat kemarau, menyumbang {{angka:airjawa.jatim.sumber_tak_terlindung_2023|fmt=2|satuan}} di Jawa Timur sampai {{angka:airjawa.banten.sumber_tak_terlindung_2023|fmt=2|satuan}} di Banten. Porsi sumur dan mata air tanpa sumber tak terlindung adalah {{angka:airjawa.banten.sumur_mata_air_terlindung_2023|fmt=2}}–{{angka:airjawa.diy.sumur_mata_air_terlindung_2023|fmt=2|persen}}, angka batas bawah[^kolom-bps].

::: tabel {#tbl:sumber-air-minum}
judul: Sumber air minum utama rumah tangga per provinsi di Pulau Jawa, 2023, dan akses air minum layak, 2025 (persen rumah tangga)
sumber: BPS, Survei Sosial Ekonomi Nasional 2023 dan 2025, tabel sumber air minum dan tabel air minum layak menurut provinsi
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Nama kolom air dalam kemasan dan sumber tak terlindung dibaca dari urutan judul tabel BPS.

| PROVINSI | LEDING (%) | SUMUR DAN MATA AIR TERLINDUNG (%) | SEMUA SUMUR DAN MATA AIR (%) | AIR DALAM KEMASAN (%) | AIR MINUM LAYAK 2025 (%) |
| --- | ---: | ---: | ---: | ---: | ---: |
| DKI Jakarta | {{angka:airjawa.dki.leding_2023|fmt=2}} | {{angka:airjawa.dki.sumur_mata_air_terlindung_2023|fmt=2}} | {{angka:airjawa.dki.sumur_mata_air_semua_2023|fmt=2}} | {{angka:airjawa.dki.air_kemasan_2023|fmt=2}} | {{angka:airjawa.dki.air_minum_layak_2025|fmt=2}} |
| Jawa Barat | {{angka:airjawa.jabar.leding_2023|fmt=2}} | {{angka:airjawa.jabar.sumur_mata_air_terlindung_2023|fmt=2}} | {{angka:airjawa.jabar.sumur_mata_air_semua_2023|fmt=2}} | {{angka:airjawa.jabar.air_kemasan_2023|fmt=2}} | {{angka:airjawa.jabar.air_minum_layak_2025|fmt=2}} |
| Jawa Tengah | {{angka:airjawa.jateng.leding_2023|fmt=2}} | {{angka:airjawa.jateng.sumur_mata_air_terlindung_2023|fmt=2}} | {{angka:airjawa.jateng.sumur_mata_air_semua_2023|fmt=2}} | {{angka:airjawa.jateng.air_kemasan_2023|fmt=2}} | {{angka:airjawa.jateng.air_minum_layak_2025|fmt=2}} |
| DI Yogyakarta | {{angka:airjawa.diy.leding_2023|fmt=2}} | {{angka:airjawa.diy.sumur_mata_air_terlindung_2023|fmt=2}} | {{angka:airjawa.diy.sumur_mata_air_semua_2023|fmt=2}} | {{angka:airjawa.diy.air_kemasan_2023|fmt=2}} | {{angka:airjawa.diy.air_minum_layak_2025|fmt=2}} |
| Jawa Timur | {{angka:airjawa.jatim.leding_2023|fmt=2}} | {{angka:airjawa.jatim.sumur_mata_air_terlindung_2023|fmt=2}} | {{angka:airjawa.jatim.sumur_mata_air_semua_2023|fmt=2}} | {{angka:airjawa.jatim.air_kemasan_2023|fmt=2}} | {{angka:airjawa.jatim.air_minum_layak_2025|fmt=2}} |
| Banten | {{angka:airjawa.banten.leding_2023|fmt=2}} | {{angka:airjawa.banten.sumur_mata_air_terlindung_2023|fmt=2}} | {{angka:airjawa.banten.sumur_mata_air_semua_2023|fmt=2}} | {{angka:airjawa.banten.air_kemasan_2023|fmt=2}} | {{angka:airjawa.banten.air_minum_layak_2025|fmt=2}} |
| Indonesia | {{angka:airjawa.nasional.leding_2023|fmt=2}} | {{angka:airjawa.nasional.sumur_mata_air_terlindung_2023|fmt=2}} | {{angka:airjawa.nasional.sumur_mata_air_semua_2023|fmt=2}} | {{angka:airjawa.nasional.air_kemasan_2023|fmt=2}} | {{angka:airjawa.nasional.air_minum_layak_2025|fmt=2}} |
:::

**DKI Jakarta berbeda karena {{angka:airjawa.dki.air_kemasan_2023|fmt=2|persen}} rumah tangganya minum air dalam kemasan dan hanya {{angka:airjawa.dki.sumur_mata_air_semua_2023|fmt=2|persen}} yang minum dari sumur dan mata air.** Air dalam kemasan di tabel BPS memuat air bermerek maupun isi ulang, dan Banten juga bertumpu padanya dengan {{angka:airjawa.banten.air_kemasan_2023|fmt=2|persen}} rumah tangga [@bps-2024-sumber-air-minum-prov]. Kajian ini menilai kerentanan kemarau di kedua provinsi itu bergeser ke harga dan rantai pasok depot isi ulang, penilaian yang belum dapat dibuktikan dengan data yang tersedia. Sumur bor atau pompa melayani {{angka:airjawa.diy.sumur_bor_pompa_2023|fmt=2|persen}} rumah tangga DI Yogyakarta, {{angka:airjawa.jatim.sumur_bor_pompa_2023|fmt=2|persen}} di Jawa Timur, dan {{angka:airjawa.banten.sumur_bor_pompa_2023|fmt=2|persen}} di Banten. Di kota pesisir utara, pengambilan air tanah terkait dengan penurunan muka tanah (@sub:muka-tanah), sehingga komponen air minum dan penurunan muka tanah tidak dapat dibaca terpisah.

**Akses air minum layak 2025 sudah {{angka:airjawa.jateng.air_minum_layak_2025|fmt=2|persen}} di Jawa Tengah sampai {{angka:airjawa.dki.air_minum_layak_2025|fmt=2|persen}} di DKI Jakarta, di atas angka nasional {{angka:airjawa.nasional.air_minum_layak_2025|fmt=2|persen}}.** Rentang sempit ini tidak membedakan provinsi menurut kerentanan kemarau [@bps-2025-air-minum-layak-prov]. Di Jawa Tengah, {{angka:airjawa.jateng.n_kab_layak_bawah95_2025}} dari {{angka:airjawa.jateng.n_kab}} kabupaten/kotanya masih di bawah {{angka:airjawa.ambang.layak_hitung_persen|persen}}. Angka terendah ada di Grobogan, {{angka:airjawa.grobogan.air_minum_layak_2025|fmt=2|persen}}, lalu Banjarnegara {{angka:airjawa.banjarnegara.air_minum_layak_2025|fmt=2|persen}} dan Purworejo {{angka:airjawa.purworejo.air_minum_layak_2025|fmt=2|persen}} [@bps-jateng-2026-air-minum].

::: koreksi
Akses air minum layak {{angka:airjawa.jateng.air_minum_layak_2025|fmt=2|persen}} sampai {{angka:airjawa.dki.air_minum_layak_2025|fmt=2|persen}} pada 2025 tidak berarti air tersedia saat kemarau. Layak tidak sama dengan aman atau berpipa, dan leding dalam Survei Sosial Ekonomi Nasional (Susenas) adalah sumber air minum utama rumah tangga, bukan cakupan jaringan perpipaan Kementerian PU [@bps-2025-air-minum-layak-prov].
:::

::: temuan
judul: Grobogan mencatat akses air minum layak terendah di Jawa Tengah, {{angka:airjawa.grobogan.air_minum_layak_2025|fmt=2|persen}} pada 2025, dan berada di WS yang defisit air baku
sifat: penilaian

**Bukti:** BPS Jawa Tengah mencatat akses layak Grobogan {{angka:airjawa.grobogan.air_minum_layak_2025|fmt=2|persen}} pada 2025 [@bps-jateng-2026-air-minum], dan RPSDA WS Jratunseluna 2024 menyebut Grobogan di antara lima kabupaten/kota tempat defisit air baku WS itu terutama terjadi [-@kemenpupr-2024-rpsda-jratunseluna, hlm. 27]. Defisit {{angka:airjawa.jratunseluna.defisit_m3s|satuan}} adalah angka seluruh WS, bukan defisit Grobogan sendiri.

**Dampak:** Dua dokumen resmi dari dua instansi menunjuk kabupaten yang sama, sehingga Grobogan menjadi bahan profil kemarau di Bab 5. Empat bendungan kecil Grobogan yang kehilangan {{angka:airjawa.bendungan.nglangon.kehilangan_persen|fmt=2}}–{{angka:airjawa.bendungan.butak.kehilangan_persen|fmt=2|persen}} tampungan hanya kehilangan {{angka:airjawa.bendungan.pj.grobogan4_sedimentasi|fmt=2|satuan}} bersama-sama, sehingga bukan bukti utama.

**Pembuka:** Pusat Data, Informasi, dan Komunikasi Kebencanaan meminta volume distribusi air dan desa terdampak per kabupaten/kota untuk kemarau 2026 (@rek:r-a03).
:::

**Data sumber air minum per kabupaten/kota baru ditarik untuk {{angka:airjawa.jateng.n_kab}} kabupaten/kota di Jawa Tengah, dan hanya untuk akses layak 2025.** Tabel serupa untuk lima provinsi lain belum ditarik dari BPS provinsi, sedangkan cakupan sistem penyediaan air minum (SPAM) perpipaan per kabupaten/kota dari Kementerian PU dan data distribusi air bersih BPBD saat kemarau 2023 dan 2026 tidak ditemukan. Sumber air untuk mandi dan cuci, tempat kebutuhan volume saat kemarau berada, juga belum ditarik.

## Irigasi {#sub:irigasi}

**Pulau Jawa memiliki {{angka:airjawa.jawa.irigasi_total_ha|satuan}} daerah irigasi menurut penetapan 2015, atau {{angka:airjawa.jawa.irigasi_porsi_nasional_persen|persen}} luas nasional, dan {{angka:airjawa.jawa.irigasi_permukaan_ha|satuan}} di antaranya irigasi permukaan.** Penetapan itu tercantum dalam Permen PUPR 14/2015 [-@pupr-2015-permen14, Lampiran]. Menurut kewenangan, pemerintah pusat memegang {{angka:airjawa.jawa.irigasi_pusat_ha|satuan}} ({{angka:airjawa.jawa.irigasi_pusat_porsi_persen|persen}}) di {{angka:airjawa.jawa.n_di_pusat|satuan}}, provinsi {{angka:airjawa.jawa.irigasi_provinsi_ha|satuan}} ({{angka:airjawa.jawa.irigasi_provinsi_porsi_persen|fmt=1|persen}}) di {{angka:airjawa.jawa.n_di_provinsi|satuan}}, dan kabupaten/kota {{angka:airjawa.jawa.irigasi_kabkota_ha|satuan}} ({{angka:airjawa.jawa.irigasi_kabkota_porsi_persen|persen}}) di {{angka:airjawa.jawa.n_di_kabkota|satuan}}. DI yang lebih luas dari {{angka:airjawa.ambang.di_pusat_ha|satuan}} menjadi kewenangan pusat, begitu pula DI lintas provinsi dan lintas negara serta DI strategis nasional; DI di bawah {{angka:airjawa.ambang.di_kabkota_ha|satuan}} dalam satu kabupaten/kota menjadi kewenangan kabupaten/kota (Pasal 9–11). Komposisi per provinsi tampil pada @gbr:irigasi-kewenangan.

::: gambar {#gbr:irigasi-kewenangan}
berkas: gambar/air/bab04-batang-irigasi-kewenangan.png
jenis: grafik
judul: Luas daerah irigasi per provinsi di Pulau Jawa menurut kewenangan, penetapan 2015 (persen luas)
sumber: Permen PUPR 14/2015, rekap Lampiran I–III; pengolahan Pantau Bencana
keyakinan: resmi
lebar: penuh
data_per: 23 Okt 2026
:::

**DI kewenangan pusat tercatat di {{angka:airjawa.jawa.n_kab_di_pusat}} kabupaten/kota, tetapi Indramayu, Karawang, Subang, dan Bekasi memegang {{angka:airjawa.pantura_jabar.irigasi_pusat_ha|satuan}} atau {{angka:airjawa.pantura_jabar.irigasi_pusat_porsi_persen|persen}} luasnya.** Luas itu dipasok tiga sumber air yang berbeda. DI Jatiluhur seluas {{angka:airjawa.di.jatiluhur.luas_ha|satuan}}, seluruhnya di keempat kabupaten itu, bergantung pada kaskade Citarum. Bagian Indramayu dari DI Rentang, {{angka:airjawa.di.rentang.indramayu_ha|satuan}}, dipasok Sungai Cimanuk lewat Waduk Jatigede, satu-satunya waduk di sungai itu [@setkab-2015-jatigede]. Sisanya {{angka:airjawa.pantura_jabar.irigasi_pusat_di_lain_ha|satuan}} berasal dari DI pusat lain. Indramayu sendiri memegang {{angka:airjawa.indramayu.irigasi_pusat_ha|satuan}} DI kewenangan pusat, sedangkan irigasi permukaan terluas ada di Karawang, {{angka:airjawa.karawang.irigasi_permukaan_ha|satuan}} (@gbr:irigasi-kab).

::: gambar {#gbr:irigasi-kab}
berkas: gambar/air/bab04-peta-irigasi-permukaan-kab.png
jenis: peta
judul: Luas irigasi permukaan per kabupaten/kota di Pulau Jawa menurut penetapan daerah irigasi 2015 (ha)
sumber: Pengolahan data Pantau Bencana dari Permen PUPR 14/2015, Lampiran III
keyakinan: resmi
lebar: penuh
data_per: 23 Okt 2026
catatan: Bulatan sebanding luas; atribusi kab/kota dari pindaian lampiran, lolos cek rekap provinsi.
:::

**Baru {{angka:airjawa.irigasi.subtotal_cocok}} dari {{angka:airjawa.irigasi.n_subtotal_kab}} subtotal kabupaten/kota dalam lampiran Permen PUPR 14/2015 yang cocok penuh dengan baris DI di bawahnya.** Jumlah per provinsi tetap sama dengan rekap resmi, sehingga peta per kabupaten/kota dapat dipakai dengan catatan itu [-@pupr-2015-permen14, Lampiran III]. Sembilan kabupaten/kota tidak memiliki irigasi permukaan, yaitu Kabupaten Administrasi Kepulauan Seribu, lima kota administrasi di DKI Jakarta, Kota Bekasi, Kota Surabaya, dan Kota Tangerang Selatan. Penetapan itu berumur sebelas tahun. Pengganti atau pemutakhirannya tidak ditemukan. Tidak ada data pembanding luas terairi setelah 2015, sehingga kajian ini tidak menyatakan luas penetapan lebih besar atau lebih kecil daripada luas terairi 2026.

**Pada data nasional 2014, {{angka:airjawa.nasional.irigasi_ruined_kabkota_persen|persen}} jaringan irigasi kewenangan kabupaten/kota berkategori rusak berat, dibanding {{angka:airjawa.nasional.irigasi_ruined_pusat_persen|fmt=2|persen}} kewenangan pusat.** Kewenangan provinsi mencatat {{angka:airjawa.nasional.irigasi_ruined_provinsi_persen|fmt=2|persen}} rusak berat pada rincian Gambar 33 laporan World Bank (2021), yang bersumber dari Rencana Strategis Direktorat Jenderal Sumber Daya Air 2015–2019 [@bankdunia-2021-air, hlm. 65]. Teks laporan yang sama menulis {{angka:airjawa.nasional.irigasi_kondisi_buruk_persen|persen}} sistem irigasi Indonesia berkondisi buruk, angka yang tidak dapat direkonstruksi dari rinciannya. Rincian itu memberi {{angka:airjawa.nasional.irigasi_poor_ruined_persen|persen}} untuk kategori buruk dan rusak berat bersama, dan {{angka:airjawa.nasional.irigasi_selain_baik_persen|persen}} untuk semua kategori selain baik [-@bankdunia-2021-air, hlm. 64–65]. Rincian per provinsi tidak tersedia. Bila pola nasional itu berlaku di Jawa, porsi jaringan rusak terbesar ada di DI kabupaten/kota yang memegang {{angka:airjawa.jawa.irigasi_kabkota_porsi_persen|persen}} luas irigasi Jawa; dugaan ini belum dapat dibuktikan dengan data yang ada. **DI Jatiluhur memegang {{angka:airjawa.di.jatiluhur.porsi_irigasi_waduk_persen|persen}} dari {{angka:airjawa.nasional.irigasi_waduk_ha|satuan}} irigasi padi yang dipasok waduk secara nasional.** Dalam sepuluh tahun sebelum studi Tarigan dan Tukayo terbit pada 2013, luas terairi DI ini turun {{angka:airjawa.di.jatiluhur.turun_terairi_mh_ha|satuan}} pada musim hujan dan {{angka:airjawa.di.jatiluhur.turun_terairi_mk_ha|satuan}} pada musim kemarau seiring turunnya debit Citarum [@tarigan-2013-citarum]. Kajian ini menilai DI Jatiluhur, yang memegang {{angka:airjawa.di.jatiluhur.porsi_di_pusat_jawa_persen|persen}} luas DI pusat Jawa, sebagai titik tunggal yang perlu dibawa ke profil kemarau di Bab 5. DI Rentang seluas {{angka:airjawa.di.rentang.luas_ha|satuan}} bergantung pada Cimanuk dan Jatigede, sehingga menjadi titik tunggal kedua yang terpisah dari kaskade Citarum. Separuh luas irigasi Jawa berada di DI kabupaten/kota yang masing-masing lebih kecil dari {{angka:airjawa.ambang.di_kabkota_ha|satuan}}, sehingga pelaksana daerah untuk irigasi saat kemarau adalah dinas kabupaten/kota, di samping BBWS.

## Waduk dan Bendungan {#sub:bendungan}

**Inventaris BBWS Pemali-Juana status Juli 2021 mencatat tampungan {{angka:airjawa.bendungan.n_pj2021|satuan}} turun dari {{angka:airjawa.bendungan.pj.volume_normal_total|fmt=2|satuan}} menurut desain menjadi {{angka:airjawa.bendungan.pj.tampungan_2021_total|fmt=2|satuan}}.** Kehilangannya {{angka:airjawa.bendungan.pj.sedimentasi_total|fmt=2|satuan}}, atau {{angka:airjawa.bendungan.pj.kehilangan_persen|persen}} [@bbwspj-2021-bendungan]. Cacaban kehilangan {{angka:airjawa.bendungan.cacaban.sedimentasi|fmt=2|satuan}} ({{angka:airjawa.bendungan.cacaban.kehilangan_persen|fmt=2|persen}} tampungannya) dan Kedungombo {{angka:airjawa.bendungan.kedungombo.sedimentasi|fmt=2|satuan}} ({{angka:airjawa.bendungan.kedungombo.kehilangan_persen|fmt=2|persen}}), bersama-sama {{angka:airjawa.bendungan.pj.cacaban_kedungombo_porsi_sedimentasi_persen|persen}} kehilangan balai itu. Tampungan Cacaban tinggal {{angka:airjawa.bendungan.cacaban.tampungan_terukur|fmt=2|satuan}} dari {{angka:airjawa.bendungan.cacaban.kapasitas_desain|satuan}}, dan layanan irigasinya turun dari {{angka:airjawa.bendungan.cacaban.irigasi_desain_ha|satuan}} menjadi {{angka:airjawa.bendungan.cacaban.irigasi_2021_ha|satuan}}. Empat bendungan kecil di Kabupaten Grobogan yang dibangun pada 1901–1914 kehilangan {{angka:airjawa.bendungan.nglangon.kehilangan_persen|fmt=2}}–{{angka:airjawa.bendungan.butak.kehilangan_persen|fmt=2|persen}} tampungan masing-masing, tetapi bersama-sama hanya {{angka:airjawa.bendungan.pj.grobogan4_sedimentasi|fmt=2|satuan}}. Urutan menurut persen dan menurut volume berbeda, sehingga @tbl:bendungan-pj menyajikan keduanya berdampingan.

::: gambar {#gbr:foto-jatiluhur-panoramio}
berkas: gambar/foto/air-jatiluhur-panoramio.jpg
jenis: foto
judul: Waduk Jatiluhur, Kabupaten Purwakarta, Maret 2010
pengarang: jsomalie
lisensi: CC BY 3.0
url: https://commons.wikimedia.org/wiki/File:Waduk_jatiluhur_-_panoramio.jpg
potong: dipotong tengah ke rasio 4:3
lebar: dua-kolom
:::


::: tabel {#tbl:bendungan-pj}
judul: Volume desain dan tampungan terukur bendungan BBWS Pemali-Juana, status Juli 2021 (juta m³)
csv: data/air-jawa/bendungan.csv
saring: bbws_sumber=BBWS Pemali-Juana (inventaris 2021)
urut: -sedimentasi_juta_m3
kolom: nama="BENDUNGAN"; kab_nama="KAB/KOTA"; kapasitas_desain_juta_m3="VOLUME DESAIN (juta m³)" fmt=2; tampungan_terukur_juta_m3="TAMPUNGAN 2021 (juta m³)" fmt=2; sedimentasi_juta_m3="KEHILANGAN (juta m³)" fmt=2; kehilangan_tampungan_persen="KEHILANGAN (%)" fmt=2
sumber: BBWS Pemali-Juana, Daftar Inventarisasi Bendungan, status Juli 2021; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kehilangan = volume desain dikurangi tampungan 2021; persen seluruh balai di Subbab 4.4.
:::

**Dari {{angka:airjawa.bendungan.pj.piezometer}} piezometer di {{angka:airjawa.bendungan.n_pj2021|satuan}} itu, {{angka:airjawa.bendungan.pj.piezometer_rusak}} rusak pada Juli 2021, dan kerusakan terberat ada pada *V-notch* dan inklinometer.** *V-notch* yang rusak {{angka:airjawa.bendungan.pj.vnotch_rusak}} dari {{angka:airjawa.bendungan.pj.vnotch}}, inklinometer {{angka:airjawa.bendungan.pj.inklinometer_rusak}} dari {{angka:airjawa.bendungan.pj.inklinometer}}, dan alat ukur penurunan {{angka:airjawa.bendungan.pj.settlement_rusak}} dari {{angka:airjawa.bendungan.pj.settlement}} [@bbwspj-2021-bendungan]. Kedungombo, yang memegang {{angka:airjawa.bendungan.kedungombo.porsi_tampungan_2021_persen|persen}} tampungan 2021 balai itu, kehilangan fungsi {{angka:airjawa.bendungan.kedungombo.inklinometer_rusak}} dari {{angka:airjawa.bendungan.kedungombo.inklinometer}} inklinometer, {{angka:airjawa.bendungan.kedungombo.settlement_rusak}} dari {{angka:airjawa.bendungan.kedungombo.settlement}} alat ukur penurunan, dan {{angka:airjawa.bendungan.kedungombo.vnotch_rusak}} dari {{angka:airjawa.bendungan.kedungombo.vnotch}} *V-notch*, sedangkan piezometernya rusak {{angka:airjawa.bendungan.kedungombo.piezometer_rusak}} dari {{angka:airjawa.bendungan.kedungombo.piezometer}}. Bendungan terbesar balai ini menggabungkan kehilangan tampungan absolut yang besar dengan instrumen pemantau deformasi yang paling rusak; implikasinya bagi rencana tindak darurat (RTD) bendungan dan rencana kontinjensi kabupaten/kota di hilir dibahas di Bab 6 dan Bab 8. Erosi dan sedimentasi serta perembesan termasuk daya rusak air menurut Penjelasan Pasal 35 ayat (3) huruf b dan k UU 17/2019 [@ri-2019-uu17].

::: kartu-angka
pil: INSTRUMEN KEAMANAN RUSAK
nada: perhatian
sumber: BBWS Pemali-Juana, Daftar Inventarisasi Bendungan, status Juli 2021
keyakinan: resmi

| NILAI | SATUAN | LABEL | IKON | WARNA |
| --- | --- | --- | --- | --- |
| {{angka:airjawa.bendungan.pj.piezometer_rusak}} | dari {{angka:airjawa.bendungan.pj.piezometer}} | piezometer rusak | bendungan | merah |
| {{angka:airjawa.bendungan.pj.vnotch_rusak}} | dari {{angka:airjawa.bendungan.pj.vnotch}} | *V-notch* rusak | bendungan | merah |
| {{angka:airjawa.bendungan.pj.inklinometer_rusak}} | dari {{angka:airjawa.bendungan.pj.inklinometer}} | inklinometer rusak | bendungan | merah |
| {{angka:airjawa.bendungan.kedungombo.inklinometer_rusak}} | dari {{angka:airjawa.bendungan.kedungombo.inklinometer}} | inklinometer Kedungombo | bendungan | merah |
:::

**Di kaskade Citarum, volume Waduk Jatiluhur turun dari {{angka:airjawa.bendungan.jatiluhur.volume_1964|satuan}} pada 1964 menjadi {{angka:airjawa.bendungan.jatiluhur.volume_2000|satuan}} pada 2000, kehilangan {{angka:airjawa.bendungan.jatiluhur.kehilangan_1964_2000_persen|persen}} dalam kurun itu.** Deret ini berasal dari laporan akhir Perum Otorita Jatiluhur 2000 yang dikutip @sheftiana-2021-jatiluhur. Di hulunya, sedimentasi memperpendek waktu paruh tampungan Waduk Saguling, yaitu waktu sampai setengah kapasitasnya terisi sedimen, dari {{angka:airjawa.bendungan.saguling.paruh_umur_awal|satuan}} menjadi {{angka:airjawa.bendungan.saguling.paruh_umur_akhir|satuan}} dalam sepuluh tahun sebelum 2013 [@tarigan-2013-citarum]. Survei batimetri sesudah 2000 untuk Jatiluhur maupun Cirata dan Saguling tidak ditemukan dari sumber primer.

**Paket data kajian memuat {{angka:airjawa.bendungan.n_paket|satuan}}; data sedimentasi dan instrumen resmi hanya ada untuk {{angka:airjawa.bendungan.n_pj2021|satuan}} BBWS Pemali-Juana (@gbr:bendungan-pj).** Sisanya bersumber sekunder dan tidak dipakai di bab ini. Delapan BBWS lain di Jawa serta PJT I dan PJT II tidak membuka inventaris setara, sehingga kajian ini tidak dapat menyatakan apa pun tentang keamanan bendungan di Brantas, Citarum, atau Bengawan Solo. Status keamanan resmi per bendungan, termasuk klasifikasi bahaya dan rekomendasi Komisi Keamanan Bendungan, serta RTD per bendungan juga tidak ditemukan. Data balai ini berstatus Juli 2021, dan tidak ada data yang lebih baru untuk menilai tampungan dan instrumen pada kemarau 2026 [@bbwspj-2021-bendungan].

::: gambar {#gbr:bendungan-pj}
berkas: gambar/air/bab04-peta-bendungan-pemali-juana.png
jenis: peta
judul: Bendungan BBWS Pemali-Juana menurut volume desain dan kehilangan tampungan, status Juli 2021
sumber: BBWS Pemali-Juana, Daftar Inventarisasi Bendungan, status Juli 2021; pengolahan Pantau Bencana
keyakinan: resmi
lebar: penuh
data_per: 23 Okt 2026
catatan: Data sedimentasi dan instrumen hanya BBWS Pemali-Juana; letak lima bendungan di dokumen dikoreksi.
:::

## Air Tanah {#sub:air-tanah}

**Keppres 26/2011 menetapkan cekungan air tanah (CAT) di Indonesia sebanyak {{angka:airjawa.nasional.cat_jumlah|satuan}}, dan {{angka:airjawa.jawa.cat_jumlah|satuan}} di antaranya berada di provinsi Jawa.** CAT di provinsi Jawa tercantum berurutan dalam keputusan itu [@keppres-2011-cat, Lampiran I]. Tanah ambles dan intrusi termasuk daya rusak air menurut Penjelasan Pasal 35 ayat (3) huruf i dan j UU 17/2019 [@ri-2019-uu17]. Badan Geologi menargetkan zona konservasi air tanah tersusun di CAT prioritas pada 2029 dan di seluruh CAT pada 2045, dengan {{angka:airjawa.nasional.sumur_pantau_air_tanah|satuan}} sumur pantau air tanah di seluruh Indonesia; rincian pembangunan sumur pantau di artikel yang sama tidak berjumlah sama [@badangeologi-2025-capaian]. Data air tanah per kabupaten/kota, baik volume pengambilan berizin maupun muka air tanah dan intrusi, tidak tersedia.

**Badan Geologi menyatakan enam CAT di Jawa rusak, yaitu Jakarta, Karawang-Bekasi, Semarang, Bandung-Soreang, Bogor, dan Serang-Tangerang, dalam artikel situs resminya 22 Januari 2024.** Daftar itu pernyataan Pelaksana Tugas Kepala Badan Geologi, bukan dokumen penetapan status [@badangeologi-2024-cat]. Artikel itu tidak memuat kategori status dan kriteria penetapannya, juga tidak mencantumkan tanggal penetapan. Teksnya berasal dari CNBC Indonesia yang dimuat ulang di kanal instansi, dan keputusan menteri yang dirujuknya mengatur persetujuan penggunaan air tanah, bukan penetapan status CAT. Pekalongan disebut di artikel yang sama sebagai contoh penurunan tanah di pesisir utara, tetapi CAT Pekalongan-Pemalang tidak termuat di daftar itu (@tbl:cat-rusak). Siaran pers Kementerian Energi dan Sumber Daya Mineral (ESDM) 8 Januari 2025 menyebut ada daerah dengan cadangan air tanah "rawan, kritis, dan rusak" tanpa menyebut namanya, dengan dasar Permen ESDM 14/2024 [@esdm-2025-perizinan-air-tanah]. Karena hanya berupa pernyataan, daftar CAT rusak tidak dipakai sebagai syarat daftar perhatian kabupaten/kota di Bab 3.

::: tabel {#tbl:cat-rusak}
judul: Cekungan air tanah di Pulau Jawa yang dinyatakan rusak oleh Badan Geologi tanpa dokumen penetapan, 2009 dan 2024
sumber: Badan Geologi, artikel situs resmi 22 Januari 2024; Kementerian ESDM, 18 Agustus 2009; Keppres 26/2011 Lampiran I
keyakinan: resmi
catatan: Kode CAT menurut Keppres 26/2011; dokumen penetapan status dan kriterianya tidak ditemukan.

| KODE | CAT MENURUT KEPPRES 26/2011 | NAMA DI PERNYATAAN BADAN GEOLOGI | PERNYATAAN INSTANSI |
| :---: | --- | --- | --- |
| 68 | Serang-Tangerang | Serang-Tangerang | rusak (2024) |
| 70 | Jakarta | Jakarta | rusak (2024); kritis hingga rusak (2009) |
| 71 | Bogor | Bogor | rusak (2024) |
| 75 | Bekasi-Karawang | Karawang-Bekasi | rusak (2024) |
| 80 | Bandung-Soreang | Bandung-Soreang | rusak (2024) |
| 103 | Pekalongan-Pemalang | – | tidak termuat di daftar; Pekalongan disebut sebagai contoh penurunan tanah di pesisir utara |
| 116 | Semarang-Demak | Semarang | rusak (2024) |
:::

**Pada 2009, pengambilan air tanah akuifer dalam di CAT Jakarta sekitar {{angka:airjawa.jakarta.ambil_akuifer_dalam_2009}} dari potensi {{angka:airjawa.jakarta.potensi_akuifer_dalam_2009|satuan}}, atau {{angka:airjawa.jakarta.ambil_porsi_potensi_2009|persen}}, dua kali batas anjuran {{angka:airjawa.jakarta.batas_anjuran_porsi_2009|persen}}.** Kepala Badan Geologi saat itu menyatakan CAT Jakarta sudah masuk zona kritis hingga rusak [@esdm-2009-cat-jakarta]. Pada 2023, Kementerian ESDM mencatat pemantauan air tanah di {{angka:airjawa.jakarta.lokasi_pantau_air_tanah|satuan}} dan menyebut rumah tangga yang memakai air tanah lebih dari {{angka:airjawa.jakarta.ambang_izin_rumah_tangga|satuan}} wajib berizin [@esdm-2023-pengendalian-air-tanah]. Perubahan laju penurunan tanah Jakarta sesudahnya ada di @sub:muka-tanah.

## Penurunan Muka Tanah dan Pesisir Utara {#sub:muka-tanah}

**Di antara dua puluh stasiun Global Navigation Satellite System (GNSS) kontinu di pesisir utara Jawa, CPKL di Kota Pekalongan turun paling cepat, {{angka:airjawa.turun_tanah.pekalongan.gnss_cpkl|satuan}} pada 2010–2021.** Stasiun milik Badan Informasi Geospasial (BIG) lainnya mencatat {{angka:airjawa.turun_tanah.indramayu.gnss_crol|fmt=2|satuan}} di Indramayu (CROL), {{angka:airjawa.turun_tanah.tegal.gnss_ctgl|fmt=2|satuan}} di Kota Tegal (CTGL), {{angka:airjawa.turun_tanah.jakarta.gnss_cjkt|fmt=2|satuan}} di Jakarta Utara (CJKT), dan {{angka:airjawa.turun_tanah.semarang.gnss_csem|fmt=2|satuan}} di Kota Semarang (CSEM) [@susilo-2023-gnss]. Tiap stasiun mewakili satu titik, bukan nilai kota.

::: gambar {#gbr:foto-muara-citarum}
berkas: gambar/foto/air-muara-citarum.jpg
jenis: foto
judul: Muara Sungai Citarum di pesisir utara Jawa Barat, Oktober 2021
pengarang: Dasnusantara
lisensi: CC BY-SA 4.0
url: https://commons.wikimedia.org/wiki/File:Muara_sungai_Citarum.jpg
potong: dipotong tengah ke rasio 4:3
lebar: dua-kolom
:::



::: gambar {#gbr:muka-tanah}
berkas: gambar/air/bab04-rentang-penurunan-muka-tanah.png
jenis: grafik
judul: Laju penurunan muka tanah terukur per kota di Pulau Jawa menurut metode dan periode, 1982–2023 (cm per tahun)
sumber: @susilo-2023-gnss; @aditiya-2023-semarang; @sidiq-2021-pantura; @sidiq-2023-pekalongan; @abidin-2011-jakarta; @abidin-2013-semarang; @abidin-2015-jakarta; @virtriana-2026-bandung; @esdm-2023-pengendalian-air-tanah; Badan Geologi 2018 dalam RPSDA WS Jratunseluna 2024
keyakinan: terverifikasi
lebar: penuh
data_per: 23 Okt 2026
catatan: Satu batang satu metode dan periode, tidak diperingkat antarmetode; kota tanpa batang belum diukur.
:::

**Patok dalam Badan Geologi di Kota Pekalongan turun {{angka:airjawa.turun_tanah.pekalongan.patok_2021_2022|satuan}} dalam sekitar satu setengah tahun sampai Oktober 2022, searah dengan stasiun CPKL.** @susilo-2023-gnss menyatakan patok dan CPKL tidak dapat dibandingkan satu lawan satu karena lokasinya berbeda dan deret GNSS berakhir pada 2021; keduanya juga dilaporkan dalam makalah yang sama, sehingga kajian ini hanya mencatat kesamaan arah. Pengukuran radar satelit *Interferometric Synthetic Aperture Radar* (InSAR) di kota yang sama mencatat penurunan kumulatif sampai {{angka:airjawa.turun_tanah.pekalongan.widodo2024_kumulatif|satuan}} pada 2014–2022 [@widodo-2024-pekalongan], laju sampai {{angka:airjawa.turun_tanah.pekalongan.sidiq2021|satuan}} pada 2016–2020 [@sidiq-2021-pantura], dan {{angka:airjawa.turun_tanah.pekalongan.sidiq2023|satuan}} pada 2016–2023 dengan nilai tertinggi di barat kota [@sidiq-2023-pekalongan].

**InSAR mencatat penurunan maksimum {{angka:airjawa.turun_tanah.semarang_demak.aditiya2023|satuan}} di Semarang utara-timur dan Demak pada 2015–2022, sedangkan stasiun GNSS Kota Semarang hampir stabil.** Studi yang sama mencatat {{angka:airjawa.turun_tanah.kendal.aditiya2023|satuan}} di Kendal dan korelasi {{angka:airjawa.turun_tanah.semarang.aditiya2023_korelasi|fmt=2}} antara muka air tanah dan deformasi [@aditiya-2023-semarang]. Pada 2016–2020, Semarang dan Demak turun sampai {{angka:airjawa.turun_tanah.semarang_demak.sidiq2021|satuan}} [@sidiq-2021-pantura], dan pada 1999–2011 laju lokal tertinggi Semarang mencapai {{angka:airjawa.turun_tanah.semarang.abidin2013_maks|satuan}} [@abidin-2013-semarang]. Angka resmi Badan Geologi 2018 yang dikutip RPSDA WS Jratunseluna mencatat Kota Semarang {{angka:airjawa.turun_tanah.semarang.badangeologi2018|satuan}} dan Kabupaten Demak lebih dari {{angka:airjawa.turun_tanah.demak.badangeologi2018|satuan}}, tanpa menyebut periode ukur dan metode [-@kemenpupr-2024-rpsda-jratunseluna, hlm. 262].

**Kementerian ESDM mencatat laju penurunan tanah di CAT Jakarta {{angka:airjawa.turun_tanah.jakarta.esdm_2015_2022|fmt=2|satuan}} pada 2015–2022, lebih rendah daripada {{angka:airjawa.turun_tanah.jakarta.esdm_1997_2005|satuan}} hingga {{angka:airjawa.turun_tanah.jakarta.esdm_1997_2005_maks|satuan}} pada 1997–2005.** Metode angka resmi itu tidak disebut [@esdm-2023-pengendalian-air-tanah]. Literatur dengan metode lain mencatat laju umumnya {{angka:airjawa.turun_tanah.jakarta.abidin2015|satuan}} pada 1982–2014 [@abidin-2015-jakarta] dan {{angka:airjawa.turun_tanah.jakarta.abidin2011|satuan}} pada 1982–2010 [@abidin-2011-jakarta], sedangkan InSAR 2016–2020 mencatat maksimum lebih dari {{angka:airjawa.turun_tanah.jakarta.sidiq2021|satuan}} [@sidiq-2021-pantura]. Penurunan laju itu sejalan dengan pengendalian air tanah Jakarta, tetapi data yang ada tidak cukup untuk menyatakan hubungan sebab-akibat.

**Titik InSAR tertinggi di wilayah Bandung tercatat {{angka:airjawa.turun_tanah.kab_bandung.virtriana2026|satuan}} di Kabupaten Bandung dan {{angka:airjawa.turun_tanah.bandung_barat.virtriana2026|fmt=1|satuan}} di Kabupaten Bandung Barat.** Sumber yang dibaca tidak menyebut periode ukurnya [@virtriana-2026-bandung]. Surabaya baru memiliki laju searah garis pandang satelit, bukan laju vertikal, sampai {{angka:airjawa.turun_tanah.surabaya.anjasmara2020_los|satuan}} di Asemrowo pada 2015–2017 [@anjasmara-2020-surabaya]. Laju vertikal terverifikasi untuk Cirebon, Bekasi, Subang, dan Surabaya belum ada.

## Daerah Aliran Sungai dan Tutupan Lahan Hulu {#sub:das}

**Di hulu daerah aliran sungai (DAS) Citarum pada 2000–2009, hutan menyusut dari {{angka:airjawa.citarum.hutan_2000_ha|satuan}} menjadi {{angka:airjawa.citarum.hutan_2009_ha|satuan}} dan permukiman bertambah dari {{angka:airjawa.citarum.permukiman_2000_ha|satuan}} menjadi {{angka:airjawa.citarum.permukiman_2009_ha|satuan}}.** Data debit 1984–2008 menunjukkan tren debit menurun walaupun tren curah hujan naik [@tarigan-2013-citarum]. Kajian ini membaca penyusutan hutan hulu, pemendekan waktu paruh Saguling dari {{angka:airjawa.bendungan.saguling.paruh_umur_awal|satuan}} menjadi {{angka:airjawa.bendungan.saguling.paruh_umur_akhir|satuan}}, dan penurunan luas terairi DI Jatiluhur sebagai satu rantai yang melintasi pelaksana pada @gbr:hulu-hilir. Besar sumbangan tiap mata rantai tidak dinyatakan karena datanya tidak tersedia. Tutupan lahan hulu terkini per DAS dan daftar DAS prioritas resmi belum ditarik, sehingga gambaran hulu di bab ini terbatas pada Citarum.

## Celah Data dan Permintaan kepada Pemegang Data {#sub:celah}

**Tujuh kelompok data kondisi sumber daya air Pulau Jawa belum tersedia terbuka (@tbl:celah-air), dan lima di antaranya sudah tertaut rekomendasi permintaan data di Bab 10.** Volume distribusi air bersih kemarau masuk @rek:r-a03; irigasi, bendungan, air tanah, dan penurunan muka tanah masuk @rek:r-a14. Air minum per kabupaten/kota di luar Jawa Tengah serta neraca WS dan tutupan hulu belum memiliki unit pemilik di Badan Nasional Penanggulangan Bencana (BNPB) dan tetap sebagai permintaan data kepada lembaga pemegangnya.

[^kolom-bps]: Tabel BPS 2023 memuat sebelas judul kolom, tetapi tiap baris hanya delapan nilai yang jumlahnya sama dengan kolom Jumlah. Nama kolom air dalam kemasan dan dua kolom tak terlindung dibaca dari urutan judul dan belum dicocokkan ke publikasi BPS *Indikator Perumahan dan Kesehatan Lingkungan 2023*, sehingga {{angka:airjawa.banten.sumur_mata_air_terlindung_2023|fmt=2}}–{{angka:airjawa.diy.sumur_mata_air_terlindung_2023|fmt=2|persen}} ditulis sebagai batas bawah.
