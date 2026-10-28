---
kajian: neraca-air
bab: 4
judul: Pasokan Air
pertanyaan: Berapa air permukaan yang terbentuk di Pulau Jawa, kapan air itu tersedia, dan kab/kota mana yang bergantung pada aliran dari hulu?
status: draf
target_halaman: 7
---

# Pasokan Air {#bab:pasokan}

::: ringkasan-bab
**Temuan:**

- Dari hujan {{angka:neraca.jawa.p|ringkas|satuan}}, {{angka:neraca.jawa.et_persen_p|persen}} kembali ke udara sebagai evapotranspirasi dan sisanya menjadi limpasan {{angka:neraca.jawa.r_miliar|satuan}}.
- Juni–Oktober hanya menyumbang {{angka:neraca.jawa.r_kemarau_persen_tahunan|persen}} limpasan tahunan.
- Kab/kota hilir sungai besar menerima sebagian besar airnya dari hulu: aliran masuk menyumbang {{angka:neraca.kab.indramayu.qin_persen|persen}} ketersediaan tahunan Kabupaten Indramayu.

**Angka kunci:**

- {{angka:neraca.validasi.selisih_bps_persen|persen}} selisih limpasan rerata model dengan angka BPS 2020 [@bps-2020-slhi].

**Rekomendasi:** @rek:n-pos-duga
:::

**Pulau Jawa menerima hujan {{angka:neraca.jawa.p|ringkas|satuan}} menurut CHIRPS, rerata 1991–2025 pada luas {{angka:neraca.jawa.luas_km2|satuan}} [@chc-2026-chirps].** Evapotranspirasi aktual model mengembalikan {{angka:neraca.jawa.eta|ringkas|satuan}} ke udara, dan limpasan lokal yang menjadi air permukaan terbarukan sebesar {{angka:neraca.jawa.r|ringkas|satuan}} (@tbl:neraca-jawa). Limpasan ini mencakup aliran langsung dan aliran dasar; air tanah dalam tidak dihitung sebagai pasokan [@pantaubencana-2026-neraca-air].

Evapotranspirasi menyerap {{angka:neraca.jawa.et_persen_p|persen}} hujan [@nasa-2026-power].

## Neraca Pulau Jawa {#sub:neraca-pulau}

::: tabel {#tbl:neraca-jawa}
judul: Neraca air Pulau Jawa per tahun dan per musim kemarau, rerata iklim 1991–2025 dan kebutuhan 2025
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini
keyakinan: estimasi-model
angka: 2

| BESARAN | NILAI (juta m³) |
| --- | ---: |
| Hujan | {{angka:neraca.jawa.p}} |
| Evapotranspirasi aktual | {{angka:neraca.jawa.eta}} |
| Limpasan lokal (air permukaan terbarukan) | {{angka:neraca.jawa.r}} |
| Limpasan Juni–Oktober | {{angka:neraca.jawa.r_kemarau}} |
| Kebutuhan kotor empat sektor | {{angka:neraca.jawa.total}} |
| Kebutuhan konsumtif | {{angka:neraca.jawa.konsumtif}} |
| Kebutuhan konsumtif Juni–Oktober | {{angka:neraca.jawa.c_kemarau}} |
:::

**Limpasan memuncak pada Januari sampai Maret dan turun ke titik terendah pada Agustus (@gbr:garis-bulanan).** Kebutuhan konsumtif bulanan bergerak dengan pola tanam: naik pada bulan penyiapan lahan dan rendah pada puncak musim hujan, ketika hujan efektif menutup sebagian kebutuhan padi. Pada Juni–Oktober limpasan Pulau Jawa {{angka:neraca.jawa.r_kemarau|ringkas|satuan}}, atau {{angka:neraca.jawa.r_kemarau_persen_tahunan|persen}} limpasan tahunan [@pantaubencana-2026-neraca-air].

::: gambar {#gbr:garis-bulanan}
berkas: gambar/neraca-air/neraca-garis-bulanan.png
jenis: grafik
judul: Limpasan lokal dan kebutuhan konsumtif bulanan Pulau Jawa, rerata 1991–2025 dan kebutuhan 2025
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini
keyakinan: estimasi-model
lebar: penuh
:::

## Pembanding Pulau dan Muara {#sub:pembanding}

**Limpasan rerata model berselisih {{angka:neraca.validasi.selisih_bps_persen|persen}} dari ketersediaan air permukaan Jawa {{angka:neraca.validasi.bps_r|satuan}} yang dikutip Badan Pusat Statistik (BPS) 2020.** Angka BPS berasal dari model hujan-limpasan berbasis satelit periode 2003–2015, sehingga kedua angka sama-sama model dan tidak ada yang menjadi pengukuran [@bps-2020-slhi; @radhika-2017-jsda]. Untuk tahun 2020 saja limpasan model berselisih {{angka:neraca.validasi.selisih_bps_2020_persen|persen}} dari angka BPS, di atas ambang {{angka:neraca.validasi.ambang_bps_persen|persen}}, kemungkinan karena 2020 tahun basah. Aliran tahunan model di {{angka:neraca.validasi.n_muara}} muara sungai besar berada pada {{angka:neraca.validasi.rasio_rentang|rentang}} kali debit Global Flood Awareness System (GloFAS), dengan median {{angka:neraca.validasi.rasio_median}}. GloFAS versi 4 adalah model hidrologi global yang dikelola Copernicus Emergency Management Service [@cems-2026-glofas; @harrigan-2020-glofas]. Parameter tampungan model dikalibrasi ke GloFAS di muara yang sama, sehingga kecocokan ini menunjukkan konsistensi antara dua model dan tidak menjadi uji independen; rincian ada di Bab 8.

## Aliran Antar-Kab/Kota {#sub:aliran-antar}

**Ketersediaan air kab/kota hilir sebagian besar berasal dari hulu (@gbr:peta-aliran-hulu).** Pangsa aliran masuk dihitung sebagai aliran dari kab/kota hulu dibagi limpasan lokal ditambah aliran masuk itu. Di Kabupaten Indramayu pangsa itu {{angka:neraca.kab.indramayu.qin_persen|persen}}, sedangkan Kota Surabaya hampir tidak menerima aliran dari kab/kota lain dalam penelusuran daerah aliran sungai (DAS) ini, sehingga kekurangan kemaraunya dihitung dari limpasan setempat [@pantaubencana-2026-neraca-air]. Kab/kota seperti ini menanggung akibat pemakaian dan operasi waduk di hulu, sehingga kekurangannya ditangani bersama kab/kota hulu dan pengelola wilayah sungai.

::: gambar {#gbr:peta-aliran-hulu}
berkas: gambar/neraca-air/neraca-peta-aliran-hulu.png
jenis: peta
judul: Pangsa aliran masuk dari kab/kota hulu dalam ketersediaan air tahunan, rerata 1991–2025
sumber: Pengolahan data Pantau Bencana, penelusuran aliran HydroBASINS level sembilan dan model neraca air kajian ini
keyakinan: estimasi-model
lebar: penuh
:::

## Surplus Lokal {#sub:surplus-lokal}

**Peringkat surplus memakai limpasan lokal dikurangi kebutuhan konsumtif, karena neraca kab/kota hilir memuat air yang hanya lewat (@tbl:surplus-lokal).** Delapan dari sepuluh kab/kota dengan surplus lokal terbesar berada di Jawa Barat dan Banten, dan dua lainnya adalah Kabupaten Cilacap dan Kabupaten Malang [@pantaubencana-2026-neraca-air]. Surplus ini mengalir ke hilir dan menjadi pasokan kab/kota lain, sehingga tidak berarti air menganggur.

::: tabel {#tbl:surplus-lokal}
judul: Sepuluh kab/kota dengan surplus lokal tahunan terbesar, rerata iklim 1991–2025 dan kebutuhan 2025
csv: data/neraca-air/kab.csv
urut: -R_minus_C_tahunan
batas: 10
kolom: nama_tanda="KAB/KOTA"; prov_nama="PROVINSI"; R_tahunan="LIMPASAN LOKAL (juta m³)" fmt=0; konsumtif_tahunan="KONSUMTIF (juta m³)" fmt=0; R_minus_C_tahunan="SURPLUS LOKAL (juta m³)" fmt=0; qin_persen="PANGSA ALIRAN HULU (%)" fmt=0
peringkat: ya
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini
keyakinan: estimasi-model
catatan: † kebutuhan industri tidak dihitung (data BPS tidak tersedia).
:::
