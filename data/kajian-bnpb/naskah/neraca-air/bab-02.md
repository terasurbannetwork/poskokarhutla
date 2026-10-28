---
kajian: neraca-air
bab: 2
judul: Pendekatan Neraca Air di Indonesia
pertanyaan: Pendekatan neraca air apa yang sudah berlaku di Indonesia, apa yang diukur masing-masing, dan di mana posisi kajian ini di antara pendekatan itu?
status: draf
target_halaman: 5
---

# Pendekatan Neraca Air di Indonesia {#bab:tinjauan}

::: ringkasan-bab
**Temuan:**

- Empat pendekatan resmi atau setengah resmi menghitung neraca air di Indonesia; tidak satu pun menyajikan neraca bulanan per kab/kota dengan aliran masuk dari hulu.
- Daya dukung air gaya Permen LH 17/2009 menetapkan kebutuhan {{angka:neraca.param.khla|satuan}} dan tidak memuat musim maupun aliran dari hulu, sehingga kajian ini memakainya hanya sebagai pembanding.

**Angka kunci:**

- {{angka:neraca.validasi.bps_r|satuan}} air permukaan Pulau Jawa per tahun menurut BPS 2020, angka model satelit 2003–2015 [@bps-2020-slhi; @radhika-2017-jsda].

**Rekomendasi:** @rek:n-pos-duga
:::

**Standar Nasional Indonesia (SNI) Neraca Sumber Daya Air 2002 menjadi dasar teknis neraca sumber daya air spasial yang paling terbuka.** Standar terbitan Badan Standardisasi Nasional (BSN) itu memuat koefisien kebutuhan domestik {{angka:neraca.param.dom_kota|satuan}} untuk perkotaan dan {{angka:neraca.param.dom_desa|satuan}} untuk perdesaan, kebutuhan ternak per ekor, dan kebutuhan irigasi {{angka:neraca.param.sni_l_det_ha|satuan}} [@bsn-2002-sni6728]. Bagian kelima standar itu memakai bak lengas tanah bulanan cara Thornthwaite dan Mather untuk memecah hujan menjadi limpasan dan simpanan [@thornthwaite-1957-neraca]. Penggantinya, SNI Neraca Sumber Daya Alam 2015, tidak tersedia terbuka; penyusun belum membuka teksnya, sehingga kajian ini memakai koefisien 2002 [@bsn-2015-sni6728].

## Empat Pendekatan yang Berlaku {#sub:empat-pendekatan}

**Keempat pendekatan berbeda pada unit dan langkah waktunya serta pada perlakuan aliran dari hulu (@tbl:pendekatan).** Pola dan Rencana Pengelolaan Sumber Daya Air (PSDA) menghitung neraca per wilayah sungai (WS) dengan debit andalan dan waduk yang dioperasikan, kewenangan Kementerian Pekerjaan Umum menurut UU 17/2019 dan PP 30/2024 [@ri-2019-uu17; @ri-2024-pp30; @kemenpupr-pola-rpsda-jawa]. Penetapan WS sendiri diatur Permen PUPR 04/PRT/M/2015 [@pupr-2015-permen04]. Daya dukung air dalam Permen LH 17/2009 membandingkan ketersediaan dan kebutuhan tahunan per wilayah administrasi [@klh-2009-permen17]. Badan Pusat Statistik (BPS) menerbitkan satu angka ketersediaan air permukaan per pulau [@bps-2020-slhi].

::: tabel {#tbl:pendekatan}
judul: Pendekatan neraca air di Indonesia dan perbedaannya dengan kajian ini, 2002–2026
sumber: SNI Neraca Sumber Daya Air 2002; Permen LH 17/2009; UU 17/2019; BPS 2020; analisis kajian ini
keyakinan: resmi

| PENDEKATAN | UNIT DAN LANGKAH WAKTU | INTI HITUNGAN | BEDA DENGAN KAJIAN INI |
| --- | --- | --- | --- |
| SNI Neraca Sumber Daya Air 2002 | daerah aliran sungai (DAS) atau wilayah administrasi; tahunan, bak lengas bulanan | pasokan dikurangi pemanfaatan dengan koefisien kebutuhan | kajian ini memakai koefisiennya dan menambah aliran antar-kab/kota |
| Permen LH 17/2009 | wilayah administrasi; tahunan | ketersediaan dari koefisien limpasan dan hujan lawan penduduk dikali kebutuhan layak | tanpa musim dan tanpa aliran dari hulu; dipakai sebagai pembanding |
| Pola dan Rencana PSDA | wilayah sungai; langkah waktu menurut dokumen tiap WS | debit andalan lawan kebutuhan per simpul, waduk dioperasikan | lebih rinci untuk waduk tetapi tidak per kab/kota; belum tersedia digital bagi kajian ini |
| BPS 2020 | pulau; tahunan | ketersediaan air permukaan dari model satelit | satu angka pulau; dipakai sebagai pembanding total |
| Kajian ini | kab/kota; bulanan 1991–2025 | bak lengas tanah per sel, penelusuran aliran per sub-DAS, kebutuhan empat sektor | label estimasi model sampai divalidasi lawan pos duga air |
:::

## Daya Dukung Air Gaya Permen LH 17/2009 {#sub:ddl}

**Permen LH 17/2009 menyatakan status daya dukung air surplus bila ketersediaan melebihi kebutuhan dan defisit bila sebaliknya, tanpa ambang rasio.** Ketersediaan dihitung dari koefisien limpasan tertimbang dikali hujan tahunan dan luas; kebutuhan dihitung dari jumlah penduduk dikali {{angka:neraca.param.khla|satuan}}, angka kebutuhan hidup layak [@klh-2009-permen17]. Kajian ini menghitung status gaya peraturan itu dengan limpasan lokal model sebagai ketersediaan, sehingga hasilnya berbeda dengan status yang ditetapkan daerah dan tidak menjadi status resmi (@sub:ddl-hasil).

**Kebutuhan hidup layak per kapita dalam peraturan itu jauh di atas kebutuhan domestik.** Angka {{angka:neraca.param.khla|satuan}} sama dengan dua kali kebutuhan domestik dan pangan, sedangkan kebutuhan domestik SNI untuk penduduk perkotaan {{angka:neraca.param.dom_kota|satuan}} [@klh-2009-permen17; @bsn-2002-sni6728]. Status defisit gaya Permen LH 17/2009 karena itu lebih mudah tercapai daripada neraca kajian ini, yang memakai kebutuhan sektor per bulan.

## Posisi Kajian Ini {#sub:posisi}

**Kajian ini tidak menggantikan neraca Pola PSDA dan tidak menetapkan status daya dukung.** Kajian ini menyusun neraca bulanan per kab/kota dari data global dan nasional yang terbuka: hujan CHIRPS, meteorologi National Aeronautics and Space Administration (NASA) Prediction Of Worldwide Energy Resources (POWER), batas daerah aliran sungai (DAS) tingkat sub-DAS dari HydroBASINS, dan debit pembanding Global Flood Awareness System (GloFAS) [@chc-2026-chirps; @nasa-2026-power; @hydrosheds-2026-hydrobasins; @cems-2026-glofas]. Kekuatannya ada pada cakupan seragam {{angka:neraca.jawa.n_kab}} kab/kota dan seri {{angka:neraca.param.tahun_iklim|satuan}}; kelemahannya ada pada tidak adanya pengukuran lapangan, yang diuraikan di Bab 8.

**Indikator kekeringan meteorologi berbasis satelit untuk Pulau Jawa sudah diterbitkan, tetapi indikator itu dibangun dari hujan dan tidak menghitung kebutuhan air [@siswanto-2022-kekeringan].** Neraca kajian ini menambahkan sisi kebutuhan dan aliran antarwilayah, sehingga kab/kota yang kering secara meteorologi tetapi menerima aliran besar dari hulu terbaca berbeda dengan kab/kota yang bergantung pada limpasannya sendiri.
