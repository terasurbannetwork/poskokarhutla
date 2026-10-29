---
kajian: neraca-air
bab: 5
judul: Kebutuhan Air per Sektor
pertanyaan: Berapa kebutuhan air domestik, irigasi, ternak, dan industri di Pulau Jawa, sektor mana yang menentukan, dan apa yang belum terhitung?
status: draf
target_halaman: 5
---

# Kebutuhan Air per Sektor {#bab:kebutuhan}

::: ringkasan-bab
**Temuan:**

- Irigasi menyumbang {{angka:neraca.jawa.irigasi_persen_total|persen}} kebutuhan kotor dan domestik {{angka:neraca.jawa.domestik_persen_total|persen}}; kebutuhan irigasi itu potensial, {{angka:neraca.jawa.irigasi_persen_sni|persen}} dari angka standar SNI.
- Kebutuhan industri hanya terhitung di {{angka:neraca.hitung.industri_ada}} kab/kota, sehingga angka Jawa Timur, DI Yogyakarta, dan Kepulauan Seribu adalah batas bawah.
- Pertumbuhan penduduk 2025–2030 menaikkan kebutuhan konsumtif hanya {{angka:neraca.jawa.konsumtif_2030_naik_persen|persen}}, karena proyeksi 2030 tidak mengubah irigasi.

**Angka kunci:**

- {{angka:neraca.jawa.total|ringkas|satuan}} kebutuhan kotor empat sektor Pulau Jawa 2025 [@pantaubencana-2026-neraca-air].

**Rekomendasi:** @rek:n-industri
:::

**Kebutuhan kotor empat sektor Pulau Jawa 2025 sebesar {{angka:neraca.jawa.total|ringkas|satuan}}, dan sesudah aliran balik irigasi dikurangi, kebutuhan konsumtif {{angka:neraca.jawa.konsumtif|ringkas|satuan}} (@tbl:sektor).** Kebutuhan konsumtif adalah besaran yang dibandingkan dengan pasokan di seluruh buku ini. Aliran balik irigasi {{angka:neraca.param.aliran_balik_persen|persen}} mengikuti keputusan pemilik kajian dan kembali ke sungai di kab/kota yang sama [@pantaubencana-2026-neraca-air].

::: tabel {#tbl:sektor}
judul: Kebutuhan air Pulau Jawa per sektor, kebutuhan 2025 dan iklim 1991–2025
sumber: Pengolahan data Pantau Bencana dari WorldPop, BPS, Permen PUPR 14/PRT/M/2015, dan koefisien SNI Neraca Sumber Daya Air 2002
keyakinan: estimasi-model
angka: 2; 3

| SEKTOR | KEBUTUHAN (juta m³ per tahun) | CATATAN CAKUPAN |
| --- | ---: | --- |
| Domestik | {{angka:neraca.jawa.domestik}} | seluruh kab/kota; perkotaan dan perdesaan menurut BPS |
| Irigasi, kebutuhan potensial | {{angka:neraca.jawa.irigasi}} | luas irigasi permukaan Permen PUPR 14/PRT/M/2015 |
| Ternak | {{angka:neraca.jawa.ternak}} | tanpa ayam ras dan kuda |
| Industri besar dan sedang | {{angka:neraca.jawa.industri}} | {{angka:neraca.hitung.industri_ada}} kab/kota ber-data |
| Kebutuhan konsumtif | {{angka:neraca.jawa.konsumtif}} | irigasi dikurangi aliran balik |
:::

## Domestik {#sub:domestik}

**Kebutuhan domestik {{angka:neraca.jawa.domestik|ringkas|satuan}} dihitung untuk {{angka:neraca.jawa.pend_2025|ringkas}} jiwa penduduk 2025.** Penduduk perkotaan dihitung {{angka:neraca.param.dom_kota|satuan}} dan perdesaan {{angka:neraca.param.dom_desa|satuan}} menurut SNI Neraca Sumber Daya Air 2002 [@bsn-2002-sni6728]. Penduduk per kab/kota berasal dari WorldPop yang disesuaikan dengan proyeksi Badan Pusat Statistik (BPS) per provinsi, dan pangsa perkotaan disamakan dengan tabel persentase penduduk perkotaan BPS [@worldpop-2025; @bps-2026-proyeksi-prov; @bps-2026-perkotaan-prov]. Kebutuhan ini tidak memisahkan air perpipaan dari sumur rumah tangga, sehingga tidak bisa dibaca sebagai kebutuhan layanan Perusahaan Daerah Air Minum (PDAM).

## Irigasi {#sub:irigasi}

**Kebutuhan irigasi {{angka:neraca.jawa.irigasi|ringkas|satuan}} adalah kebutuhan potensial, {{angka:neraca.jawa.irigasi_persen_sni|persen}} dari angka standar {{angka:neraca.param.sni_l_det_ha|satuan}} yang menghasilkan {{angka:neraca.jawa.irigasi_sni|ringkas|satuan}}.** Hitungan bulanan memakai koefisien tanaman padi dari pedoman Food and Agriculture Organization (FAO) nomor 56, perkolasi {{angka:neraca.param.perkolasi|satuan}}, penyiapan lahan {{angka:neraca.param.penyiapan|satuan}}, hujan efektif {{angka:neraca.param.hujan_efektif_persen|persen}}, dan intensitas musim tanam ketiga {{angka:neraca.param.mt3_persen|persen}} [@allen-1998-fao56; @pu-2013-kp01]. Luas yang dipakai adalah luas irigasi permukaan dalam penetapan daerah irigasi Permen PUPR 14/PRT/M/2015 [@pupr-2015-permen14]. Model tidak tahu luas yang benar-benar ditanami tiap musim, sehingga pada tahun kering, ketika petani menunda tanam, kebutuhan nyata bisa lebih kecil dari angka ini.

## Ternak dan Industri {#sub:ternak-industri}

**Kebutuhan ternak {{angka:neraca.jawa.ternak|satuan}} kecil dibanding sektor lain dan memakai populasi BPS 2024.** Sapi dan kerbau dihitung {{angka:neraca.param.sapi|satuan}} [@bsn-2002-sni6728]. Kambing dan domba memakai {{angka:neraca.param.kambing|satuan}}, sedangkan babi {{angka:neraca.param.babi|satuan}} dan unggas {{angka:neraca.param.unggas|fmt=1|satuan}} [@bps-2026-ternak-kab]. Unggas hanya ayam buras dan itik, karena tabel kab/kota BPS tidak memuat ayam ras.

**Kebutuhan industri {{angka:neraca.jawa.industri|satuan}} hanya mencakup industri besar dan sedang di {{angka:neraca.hitung.industri_ada}} kab/kota.** Tenaga kerja dikali {{angka:neraca.param.industri_l|satuan}}, koefisien pedoman Kementerian Pekerjaan Umum 2005 yang baru dibaca dari kutipan sekunder [@bps-2026-industri-kab]. DI Yogyakarta dan Jawa Timur tidak punya tabel industri besar dan sedang per kab/kota, sehingga {{angka:neraca.hitung.industri_kosong}} kab/kota bertanda † dan kebutuhan industrinya dibiarkan kosong. Pengambilan air industri dari sumur dalam tidak masuk neraca air permukaan ini.

## Proyeksi 2030 {#sub:proyeksi-2030}

**Proyeksi 2030 hanya menambah pertumbuhan penduduk domestik, sehingga kebutuhan konsumtif naik {{angka:neraca.jawa.konsumtif_2030_naik_persen|persen}} menjadi {{angka:neraca.jawa.konsumtif_2030|ringkas|satuan}}.** Proyeksi penduduk berasal dari tabel BPS berbasis Sensus Penduduk 2010, belum hasil Survei Penduduk Antar Sensus (SUPAS) 2025 [@bps-2026-proyeksi-prov]. Proyeksi ini tidak memuat perubahan iklim maupun perubahan luas irigasi dan industri; tujuh dari sepuluh penurunan neraca terbesar ada di Jawa Barat dan Banten (@tbl:turun-2030).

::: tabel {#tbl:turun-2030}
judul: Sepuluh kab/kota dengan penurunan neraca tahunan terbesar dari 2025 ke 2030, iklim 1991–2025
csv: data/neraca-air/kab.csv
urut: selisih_2030
batas: 10
kolom: nama_tanda="KAB/KOTA"; prov_nama="PROVINSI"; N_tahunan="NERACA 2025 (juta m³)" fmt=0; N2030_tahunan="NERACA 2030 (juta m³)" fmt=0; selisih_2030="SELISIH (juta m³)" fmt=1
peringkat: ya
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini; proyeksi penduduk BPS
keyakinan: estimasi-model
catatan: Proyeksi 2030 hanya pertumbuhan penduduk domestik; neraca memuat air yang lewat dari hulu.
:::
