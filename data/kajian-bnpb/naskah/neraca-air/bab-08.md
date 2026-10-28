---
kajian: neraca-air
bab: 8
judul: Validasi dan Keterbatasan
pertanyaan: Bagian mana dari model yang sudah sejalan dengan pembanding, bagian mana yang belum, dan keterbatasan apa yang membatasi pemakaian angkanya?
status: draf
target_halaman: 6
---

# Validasi dan Keterbatasan {#bab:keterbatasan}

::: ringkasan-bab
**Temuan:**

- Limpasan tahunan lolos dua pembanding: selisih {{angka:neraca.validasi.selisih_bps_persen|persen}} dari angka BPS 2020 (tahun 2020 saja {{angka:neraca.validasi.selisih_bps_2020_persen|persen}}, di atas ambang) dan rasio {{angka:neraca.validasi.rasio_rentang|rentang}} terhadap Global Flood Awareness System (GloFAS) di {{angka:neraca.validasi.n_muara}} muara; kedua pembanding itu model.
- Aliran Juni–Oktober tidak lolos: median rasio {{angka:neraca.validasi.rasio_kemarau_median}}, di luar ambang {{angka:neraca.validasi.ambang_rendah|fmt=2}}–{{angka:neraca.validasi.ambang_tinggi|fmt=2}}.
- Kab/kota dengan neraca kemarau andalan negatif lebih jarang tercatat kekeringan di DIBI 2015–2025: {{angka:neraca.hitung.n80_neg_dibi_persen|persen|cacah}} lawan {{angka:neraca.hitung.n80_pos_dibi_persen|persen|cacah}}.

**Angka kunci:**

- {{angka:neraca.validasi.r_median}} median korelasi debit bulanan model dan GloFAS di {{angka:neraca.validasi.n_muara}} muara [@cems-2026-glofas].

**Rekomendasi:** @rek:n-pos-duga, @rek:n-waduk, @rek:n-industri
:::

**Validasi kajian ini membandingkan model dengan dua model lain, karena data pos duga air Balai Besar Wilayah Sungai (BBWS) dan neraca Pola Pengelolaan Sumber Daya Air (PSDA) digital tidak tersedia bagi penyusun.** Pembandingnya adalah angka ketersediaan air permukaan Jawa yang dikutip Badan Pusat Statistik (BPS) 2020 dan debit Global Flood Awareness System (GloFAS) versi 4 di {{angka:neraca.validasi.n_muara}} muara sungai besar [@bps-2020-slhi; @cems-2026-glofas]. Lolos dalam pemeriksaan ini berarti konsisten dengan dua model lain dan belum berarti terbukti benar (@tbl:validasi).

## Hasil Pemeriksaan {#sub:hasil-validasi}

::: tabel {#tbl:validasi}
judul: Hasil validasi model neraca air terhadap BPS 2020 dan GloFAS di dua belas muara, 1991–2025
sumber: Pengolahan data Pantau Bencana; GloFAS versi 4 lewat Open-Meteo; BPS 2020
keyakinan: estimasi-model
angka: 2

| PEMERIKSAAN | NILAI | AMBANG | VONIS |
| --- | ---: | --- | --- |
| Limpasan total Jawa lawan BPS 2020, selisih | {{angka:neraca.validasi.selisih_bps_persen|persen}} | paling besar {{angka:neraca.validasi.ambang_bps_persen|persen}} | lolos |
| Limpasan tahun 2020 saja lawan BPS 2020, selisih | {{angka:neraca.validasi.selisih_bps_2020_persen|persen}} | paling besar {{angka:neraca.validasi.ambang_bps_persen|persen}} | di atas ambang |
| Rasio aliran tahunan model/GloFAS, median | {{angka:neraca.validasi.rasio_median}} | {{angka:neraca.validasi.ambang_rendah|fmt=2}}–{{angka:neraca.validasi.ambang_tinggi|fmt=2}} | lolos |
| Rasio aliran tahunan, rentang dua belas muara | {{angka:neraca.validasi.rasio_rentang|rentang}} | {{angka:neraca.validasi.ambang_luas|rentang}} | lolos |
| Korelasi debit bulanan, median | {{angka:neraca.validasi.r_median}} | paling kecil {{angka:neraca.validasi.ambang_r|fmt=1}} | lolos |
| Rasio aliran Juni–Oktober, median | {{angka:neraca.validasi.rasio_kemarau_median}} | {{angka:neraca.validasi.ambang_rendah|fmt=2}}–{{angka:neraca.validasi.ambang_tinggi|fmt=2}} | tidak lolos |
| Rasio aliran Juni–Oktober, rentang | {{angka:neraca.validasi.rasio_kemarau_rentang|rentang}} | {{angka:neraca.validasi.ambang_luas|rentang}} | tidak lolos |
:::

**Kalibrasi dan validasi memakai GloFAS yang sama di muara yang sama, sehingga pemeriksaan ini dalam sampel.** Rasio tahunan sudah mendekati satu sebelum kalibrasi; kalibrasi hanya menggeser pecahan aliran dasar dari setengah ke {{angka:neraca.param.alpha|fmt=1}} dengan waktu tinggal {{angka:neraca.param.k_bulan|satuan}} [@pantaubencana-2026-neraca-air]. Pasangan parameter yang memenuhi kedua median justru memadamkan aliran muara pada tahun kering, padahal tahun kering adalah produk utama kajian ini, sehingga pilihan jatuh pada pasangan yang menjaga aliran tahun kering. Rincian per muara ada di @lamp:validasi.

## Peringkat Neraca dan Catatan Kejadian {#sub:dibi}

**Kab/kota dengan neraca kemarau andalan negatif lebih jarang tercatat mengalami kekeringan di Data dan Informasi Bencana Indonesia (DIBI): {{angka:neraca.hitung.n80_neg_dibi_persen|persen|cacah}} lawan {{angka:neraca.hitung.n80_pos_dibi_persen|persen|cacah}}.** Dari {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota dengan neraca kemarau andalan negatif, {{angka:neraca.hitung.n80_neg_dibi_ada}} tercatat dalam kejadian kekeringan DIBI 2015–2025; dari {{angka:neraca.hitung.n80_pos}} kab/kota lainnya, {{angka:neraca.hitung.n80_pos_dibi_ada}} tercatat [@bnpb-dibi; @pantaubencana-2026-neraca-air]. Median kejadian per kab/kota {{angka:neraca.hitung.dibi_median_neg}} lawan {{angka:neraca.hitung.dibi_median_pos}}, dengan rerata {{angka:neraca.hitung.dibi_rerata_neg|fmt=1}} lawan {{angka:neraca.hitung.dibi_rerata_pos|fmt=1}}.

**Angka kejadian per kab/kota berupa pecahan karena satu kejadian DIBI yang mencakup beberapa kab/kota dibagi rata di antara kab/kota itu.** Jumlah kejadian di kelompok neraca negatif {{angka:neraca.hitung.dibi_total_neg|fmt=2}} dan di kelompok lainnya {{angka:neraca.hitung.dibi_total_pos|fmt=2}} [@bnpb-dibi]. Periodenya juga berbeda: catatan DIBI mencakup 2015–2025, sedangkan neraca kemarau andalan dihitung dari iklim 1991–2025. Perbandingan ini deskriptif dan belum menjadi validasi.

**Dua penjelasan masih berupa hipotesis yang belum diuji kajian ini.** Pertama, kab/kota karst yang bergantung pada sumur dangkal bisa mencatat kekeringan tiap tahun walau limpasannya surplus. Kedua, kota yang dilayani perpipaan bisa defisit di model tanpa mencatat kejadian; {{angka:neraca.hitung.n80_neg_kota_kecil}} dari {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota dengan neraca kemarau andalan negatif adalah kota atau kabupaten kecil yang airnya terutama kiriman hulu [@pantaubencana-2026-neraca-air]. Sampai hipotesis itu diuji, peringkat kajian ini dipakai sebagai daftar periksa dan dipasangkan dengan data penyaluran air bersih Badan Penanggulangan Bencana Daerah (BPBD) (@rek:n-daftar-periksa).

## Keterbatasan {#sub:keterbatasan}

**Keterbatasan utama ada pada data yang belum didapat, dan tiap keterbatasan menunjuk satu permintaan data (@tbl:keterbatasan).** Keterbatasan ini mengikuti catatan validasi model dan tabel waduk kajian [@pantaubencana-2026-neraca-air; @bbwspj-2021-bendungan].

::: tabel {#tbl:keterbatasan}
judul: Keterbatasan model neraca air dan akibatnya pada angka, versi pertama, Oktober 2026
sumber: Analisis kajian ini; catatan validasi model neraca air
keyakinan: asumsi-kebijakan

| KETERBATASAN | AKIBAT PADA ANGKA | YANG DIBUTUHKAN |
| --- | --- | --- |
| Tanpa pos duga air BBWS | aliran kemarau belum terukur; label tetap estimasi model | debit bulanan pos duga muara dan titik antar-kab/kota |
| Waduk disederhanakan, satu dari enam tampungan bersumber resmi | neraca kab/kota hilir waduk bergantung asumsi pelepasan rata | tampungan efektif dan pelepasan bulanan dari pengelola waduk |
| Industri hanya besar dan sedang, kosong di DI Yogyakarta dan Jawa Timur | kebutuhan Jawa Timur dan DI Yogyakarta batas bawah | pengambilan air industri per kab/kota |
| Irigasi kebutuhan potensial | kekurangan kemarau dibesarkan bila luas tanam turun | luas tanam per musim dan pemberian air daerah irigasi |
| Air tanah, perpipaan, dan transfer selain Tarum Barat tidak dimodelkan | kota tampak defisit walau dilayani sumber lain | volume air baku perpipaan dan pengambilan air tanah per kab/kota |
| Sub-DAS rerata {{angka:neraca.param.subdas_rerata_km2|satuan}} | kota kecil membaca aliran sungai yang lewat | sub-DAS lebih rinci atau titik pengambilan nyata |
:::

**Evapotranspirasi acuan dihitung dari rerata bulanan kisi setengah derajat, lebih kasar dari reanalisis ERA5-Land.** Di DI Yogyakarta, evapotranspirasi acuan yang dipakai lebih tinggi dari ERA5, sedangkan hujan CHIRPS dan ERA5 sejalan; efek perbedaan itu pada limpasan belum dipisahkan [@nasa-2026-power; @openmeteo-2026-era5]. Proyeksi penduduk memakai tabel BPS berbasis Sensus Penduduk 2010, dan koefisien kebutuhan memakai SNI versi 2002 karena teks SNI 2015 belum dibuka [@bps-2026-proyeksi-prov; @bsn-2015-sni6728].
