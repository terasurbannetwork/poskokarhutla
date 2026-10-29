---
kajian: neraca-air
bab: 7
judul: Tahun Kering 1997, 2015, 2019, dan 2023
pertanyaan: Bila iklim kemarau 1997, 2015, 2019, atau 2023 berulang dengan kebutuhan 2025, berapa kab/kota kekurangan air, dan seberapa jauh angka itu bisa dipercaya?
status: draf
target_halaman: 6
---

# Tahun Kering 1997, 2015, 2019, dan 2023 {#bab:tahun-kering}

::: ringkasan-bab
**Temuan:**

- Dengan kebutuhan 2025, neraca Juni–Oktober negatif di {{angka:neraca.skenario.1997.n_kab_neg}} kab/kota pada iklim 1997, {{angka:neraca.skenario.2015.n_kab_neg}} pada 2015, {{angka:neraca.skenario.2019.n_kab_neg}} pada 2019, dan {{angka:neraca.skenario.2023.n_kab_neg}} pada 2023, dibanding {{angka:neraca.skenario.klim.n_kab_neg}} pada iklim rerata.
- Bias model berbeda arah antartahun: pada 1997 model memadamkan aliran di {{angka:neraca.validasi.kering_nol_1997}} dari {{angka:neraca.validasi.n_muara}} muara, sedangkan pada 2019 aliran Jratunseluna model {{angka:neraca.validasi.jratunseluna_2019}} kali Global Flood Awareness System (GloFAS). Angka tahun kering adalah indikasi tekanan dan tidak menjadi batas atas atau batas bawah.

**Angka kunci:**

- {{angka:neraca.skenario.1997.rasio_c_r_persen|persen}} rasio kebutuhan konsumtif terhadap limpasan Juni–Oktober pada iklim 1997, angka kebutuhan potensial lawan limpasan model yang melebih-lebihkan kekurangan [@pantaubencana-2026-neraca-air].

**Rekomendasi:** @rek:n-renkon, @rek:n-pos-duga
:::

**Hujan Juni–Oktober Pulau Jawa turun dari {{angka:neraca.skenario.klim.p_kemarau|ringkas|satuan}} pada iklim rerata menjadi {{angka:neraca.skenario.1997.p_kemarau|ringkas|satuan}} pada 1997 dan {{angka:neraca.skenario.2015.p_kemarau|ringkas|satuan}} pada 2015 (@tbl:skenario).** *Oceanic Niño Index* (ONI) Juli–September tercatat {{angka:oni.jas_1997|fmt=2}} pada 1997, {{angka:oni.jas_2015|fmt=2}} pada 2015, {{angka:oni.jas_2019|fmt=2}} pada 2019, dan {{angka:oni.jas_2023|fmt=2}} pada 2023, sehingga kemarau 2019 kering tanpa El Niño kuat [@noaa-2026-oni; @chc-2026-chirps]. Kebutuhan konsumtif naik pada tahun kering karena hujan efektif untuk padi berkurang, sehingga tekanan datang dari dua sisi.

## Lima Skenario {#sub:lima-skenario}

::: tabel {#tbl:skenario}
judul: Neraca Juni–Oktober Pulau Jawa per skenario iklim, rerata 1991–2025 dan tahun kering 1997, 2015, 2019, 2023 dengan kebutuhan 2025
csv: data/neraca-air/skenario.csv
kolom: label="SKENARIO"; P_kemarau="HUJAN (juta m³)" fmt=0; R_kemarau="LIMPASAN (juta m³)" fmt=0; C_kemarau="KONSUMTIF (juta m³)" fmt=0; rasio_C_R_persen="KONSUMTIF/LIMPASAN (%)" fmt=1; n_kab_neg="KAB/KOTA NERACA NEGATIF" fmt=0
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini
keyakinan: estimasi-model
catatan: Bias tahun kering bergantung tahun (Subbab 7.3); kebutuhan irigasi adalah kebutuhan potensial.
:::

**Jumlah kab/kota dengan neraca Juni–Oktober negatif naik dari {{angka:neraca.skenario.klim.n_kab_neg}} pada iklim rerata menjadi {{angka:neraca.skenario.2023.n_kab_neg}} sampai {{angka:neraca.skenario.1997.n_kab_neg}} pada tahun kering (@gbr:batang-skenario).** Tahun 2023 lebih ringan dari tiga tahun kering lain, dengan hujan Juni–Oktober {{angka:neraca.skenario.2023.p_kemarau|ringkas|satuan}} [@pantaubencana-2026-neraca-air]. Urutan antartahun ini mengikuti urutan hujan kemarau, kecuali 2019 yang lebih berat dari 2015 karena limpasan model 2019 lebih kecil.

::: gambar {#gbr:batang-skenario}
berkas: gambar/neraca-air/neraca-batang-skenario.png
jenis: grafik
judul: Kab/kota dengan neraca Juni–Oktober negatif per skenario iklim, rerata 1991–2025 dan tahun kering 1997, 2015, 2019, 2023
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini
keyakinan: estimasi-model
lebar: penuh
:::

## Kab/Kota Paling Tertekan pada Iklim 1997 {#sub:kab-1997}

**Pada iklim 1997, {{angka:neraca.kab.n97_1.nama|teks}} mencatat neraca Juni–Oktober {{angka:neraca.kab.n97_1.n1997|satuan}}, terendah di Pulau Jawa (@tbl:kab-1997).** Sebelas dari lima belas kab/kota di daftar ini juga ada di daftar neraca kemarau andalan terendah (@tbl:n80-terendah), sehingga kedua ukuran menunjuk wilayah yang sama [@pantaubencana-2026-neraca-air]. Empat lainnya, yaitu Demak, Lamongan, Ngawi, dan Klaten, berada di daerah aliran sungai (DAS) Bengawan Solo dan Jratunseluna, yang aliran muaranya dipadamkan model pada 1997, sehingga angkanya paling terpengaruh bias.

::: tabel {#tbl:kab-1997}
judul: Lima belas kab/kota dengan neraca Juni–Oktober terendah pada iklim 1997 dan kebutuhan 2025
csv: data/neraca-air/kab.csv
urut: N_kemarau_1997
batas: 15
kolom: nama_tanda="KAB/KOTA"; prov_nama="PROVINSI"; N_kemarau="NERACA JUN–OKT RERATA (juta m³)" fmt=0; N80_kemarau="NERACA KEMARAU ANDALAN (juta m³)" fmt=0; N_kemarau_1997="NERACA JUN–OKT 1997 (juta m³)" fmt=0; N_kemarau_2015="NERACA JUN–OKT 2015 (juta m³)" fmt=0
peringkat: ya
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini
keyakinan: estimasi-model
catatan: Bias 1997 melebih-lebihkan kekurangan; † kebutuhan industri tidak dihitung.
:::

## Arah Bias Tahun Kering {#sub:bias-kering}

**Median rasio aliran Juni–Oktober model terhadap Global Flood Awareness System (GloFAS) di {{angka:neraca.validasi.n_muara}} muara adalah {{angka:neraca.validasi.kering_median_1997}} pada 1997, {{angka:neraca.validasi.kering_median_2015}} pada 2015, {{angka:neraca.validasi.kering_median_2019}} pada 2019, dan {{angka:neraca.validasi.kering_median_2023}} pada 2023.** Pada 1997 model memadamkan aliran di {{angka:neraca.validasi.kering_nol_1997}} muara, sehingga kekurangan 1997 dilebih-lebihkan. Pada 2015, 2019, dan 2023 aliran model di sebagian muara melebihi GloFAS, misalnya Jratunseluna {{angka:neraca.validasi.jratunseluna_2019}} kali pada 2019, sehingga kekurangan di hilirnya dihitung terlalu kecil [@cems-2026-glofas; @pantaubencana-2026-neraca-air].

**Karena arah biasnya bergantung tahun, skenario tahun kering tidak dipakai sebagai batas atas atau batas bawah.** Rentang {{angka:neraca.skenario.2023.n_kab_neg}} sampai {{angka:neraca.skenario.1997.n_kab_neg}} kab/kota menunjukkan besarnya tekanan, dan perencanaan kontinjensi memakainya untuk memilih wilayah; volume air darurat tidak dihitung dari angka ini. GloFAS sendiri model, sehingga rasio di atas juga belum menjadi kesalahan terukur (Bab 8).

::: catatan
Kebutuhan irigasi dihitung penuh pada tahun kering. Di lapangan, sebagian petani menunda atau mengurangi tanam ketika air irigasi tidak cukup, sehingga kebutuhan nyata pada tahun kering bisa lebih kecil dari angka potensial. Data luas tanam per musim tidak dipakai dalam versi ini.
:::
