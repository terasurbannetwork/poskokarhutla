---
kajian: mitigasi
lampiran: F
judul: Metode Simulasi, Asumsi, dan Ketersediaan Kuantifikasi
status: final
---

# Metode Simulasi, Asumsi, dan Ketersediaan Kuantifikasi {#lamp:metode}

Metode kajian diuraikan di Bab 3: matriks ketersediaan kuantifikasi per jenis di @tbl:kuantifikasi, skala dampak lima kelas di @tbl:skala-dampak, dasar kemungkinan lima tahun di @tbl:kemungkinan, dan tiga besaran kerugian materiil di @tbl:kerugian. Lampiran ini menambahkan asumsi yang dipakai mesin simulasi dan kartu skenario, uji kepekaan model gempa, dan daftar celah data yang tertutup sesudah dokumen primer dibuka. Audit metode platform 21 Oktober 2026 menilai model korban gempa tidak layak untuk gempa nyata, sehingga keluaran model hanya tampil di kartu dan lampiran dengan label [@pantaubencana-2026-skenario-geologi].

## Asumsi Model dan Kartu {#sub:f-asumsi}

**Semua asumsi di @tbl:f-asumsi berlabel Asumsi kebijakan kecuali standar kebutuhan dasar dan pita peluang, yang dikutip dari dokumen resmi atau terverifikasi.** Ambang skala dampak dikunci penyusun sebelum kelas kartu diisi, dan pita fatalitas *National Risk Register* Inggris berfungsi sebagai rujukan metode, bukan ambang resmi Indonesia [@cabinetoffice-2025-nrr, hlm. 12–14].

::: tabel {#tbl:f-asumsi}
judul: Asumsi mesin simulasi dan kartu skenario, nilai, pemakaian, dan label keyakinan, kajian mitigasi 2026
sumber: Perka BNPB 7/2008; Cabinet Office (2025); Cabinet Office Jepang (2025); paket skenario geologi dan hidrometeorologi Pantau Bencana; Bab 3 dan Bab 11 kajian ini
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Faktor evakuasi tsunami adalah tuas kepekaan, bukan perkiraan korban.

| ASUMSI | NILAI | DIPAKAI DI | KEYAKINAN |
| --- | --- | --- | --- |
| Jiwa per rumah | {{angka:geologi.asumsi.jiwa_per_rumah|fmt=1|satuan}} | rumah terdampak gempa dari jiwa; lantai kebutuhan respons gempa | asumsi-kebijakan |
| Lama mengungsi untuk pengungsi-hari | tujuh hari, rentang tiga sampai tiga puluh hari | kerugian imateriil hidrometeorologi | asumsi-kebijakan |
| Jendela pengungsi serentak | tiga puluh hari | lantai kebutuhan respons per wilayah direktorat | asumsi-kebijakan |
| Ambang penyisihan kejadian | peluang lima tahun di bawah {{angka:nrr_2025.pita1_batas_persen|fmt=1|persen}} | skenario terburuk yang masuk akal | terverifikasi |
| Pita peluang lima tahun | {{angka:nrr_2025.pita2_atas_persen|persen}}, {{angka:nrr_2025.pita4_bawah_persen|persen}}, dan {{angka:nrr_2025.pita5_batas_persen|persen}} sebagai batas pita | kelas kemungkinan kartu | terverifikasi |
| Periode acuan lantai | delapan belas musim hujan 2008/2009–2025/2026; 1996–2025 untuk geologi, nonalam, dan sosial | lantai skenario | asumsi-kebijakan |
| Standar beras dan air minum | {{angka:perka_2008.beras_gram_hari|satuan}}; {{angka:perka_2008.air_minum_liter_hari|satuan}} | kebutuhan respons harian | resmi |
| Standar air bersih | {{angka:perka_2008.air_bersih_awal_liter_hari|satuan}} pada tiga hari pertama, lalu {{angka:perka_2008.air_bersih_liter_hari|satuan}} | kebutuhan respons harian | resmi |
| Standar jamban dan hunian | satu jamban untuk {{angka:perka_2008.jamban_orang}} orang; {{angka:perka_2008.hunian_m2_orang|satuan}} | kebutuhan respons harian | resmi |
| Faktor evakuasi segera tsunami | dasar satu; survei {{angka:nankai.faktor_survei|fmt=3}}; tinggi {{angka:nankai.faktor_70|fmt=3}} | tuas kepekaan kartu tsunami | asumsi-kebijakan |
| Stimulan rumah per tingkat kerusakan | besaran dua skema, tidak terdapat dalam korpus JDIH BNPB | kebutuhan stimulan rumah, batas bawah kerugian materiil | asumsi-kebijakan |
| Rasio mortalitas cakupan peringatan dini lintas negara | {{angka:wmo.2022.rasio_mortalitas|satuan}} | kepekaan peringatan dini hidrometeorologi selain tanah longsor | asumsi-kebijakan |
:::

**Rasio mortalitas lintas negara adalah rasio asosiasi antarnegara yang belum diuji untuk Indonesia, bukan efek kausal** [@wmo-2022-peringatan-dini]. Angkanya tidak dipakai sebagai dasar tesis atau keputusan, dan hanya tampil di kartu dan grafik kepekaan berlabel (@sub:hm-peringatan). Uji kepekaan aturan daftar perhatian dimuat di @tbl:daftar-perhatian. Korban tsunami tidak dihitung sampai genangan resmi InaRISK dipakai.

## Kepekaan Model Gempa {#sub:f-kepekaan}

**Kepatuhan bangunan adalah tuas korban guncangan yang dihitung model: tanpa tembok tanpa tulangan, korban model megathrust selatan Jawa pada magnitudo maksimum menjadi {{angka:geologi.kepekaan.bangunan_penuh.jawa_mmaks}} kali dasar** (@tbl:f-kepekaan). Besar efek tuas itu belum diukur di Indonesia, sehingga faktor kepekaan dibaca sebagai arah, bukan perkiraan korban yang dapat dicegah (@sub:tuas). Jam kejadian membandingkan okupansi rumah malam hari ({{angka:geologi.okupansi.malam|fmt=2}}) dengan rata-rata ({{angka:geologi.okupansi.rata|fmt=2}}), dan tuas evakuasi tsunami tidak dimuat.

::: tabel {#tbl:f-kepekaan}
judul: Kepekaan korban guncangan dan rumah rusak berat model terhadap kepatuhan bangunan dan jam kejadian per skenario gempa, estimasi 2026
csv: data/turunan/lampiran_geologi_kepekaan.csv
kolom: skenario="SKENARIO"; tuas="TUAS"; nilai_tuas="NILAI TUAS"; korban_rendah="KORBAN RENDAH (jiwa)" fmt=0; korban_tengah="KORBAN TENGAH (jiwa)" fmt=0; korban_tinggi="KORBAN TINGGI (jiwa)" fmt=0; rb_tengah="RUMAH RUSAK BERAT TENGAH (unit)" fmt=0; faktor_terhadap_dasar="FAKTOR TERHADAP DASAR" fmt=2
grup: SKENARIO
sumber: Platform Pantau Bencana, mesin guncangan dan kerusakan; WorldPop 2026
keyakinan: estimasi-model; belum diuji balik
data_per: 23 Okt 2026
catatan: Tuas kepatuhan bangunan adalah porsi tembok tanpa tulangan, beton terkekang, dan kayu.
:::

## Celah Data yang Tertutup {#sub:f-celah}

**Enam celah data yang diakui kerangka kajian tertutup sesudah dokumen primer dibuka, dan isinya kini dipakai di badan teks** (@tbl:f-celah). Celah yang tetap terbuka tercantum di @tbl:belum-diketahui beserta lembaga pemegangnya.

::: tabel {#tbl:f-celah}
judul: Celah data kajian mitigasi yang tertutup sesudah pembukaan dokumen primer, Oktober 2026
sumber: PuSGeN 2024; Koplitz dkk. (2016); UU 1/1970; UU 3/2014; PP 11/1979; JDIH BPK; paket lembaga Pantau Bencana
keyakinan: campuran
data_per: 24 Okt 2026

| CELAH | YANG DIBUKA | DIPAKAI DI | KEYAKINAN |
| --- | --- | --- | --- |
| Magnitudo maksimum megathrust hanya dari sumber sekunder | Peta Sumber dan Bahaya Gempa 2024: Mw {{angka:pusgen.jawa.mmaks|fmt=1}} segmen gabungan Jawa dan Mw {{angka:pusgen.jawa_segmen.mmaks|fmt=1}} per segmen | Bab 6, kartu megathrust | resmi |
| Magnitudo maksimum sesar darat tidak bersumber | Peta Sumber dan Bahaya Gempa 2024: Lembang Mw {{angka:pusgen.lembang.mmaks|fmt=1}} dan Opak Mw {{angka:pusgen.opak.mmaks|fmt=1}} | Bab 6, kartu sesar darat dengan korban dari analog | resmi |
| Beban kesehatan asap karhutla | Koplitz dkk. (2016): {{angka:koplitz.asap2015.kematian_berlebih|satuan}} kematian berlebih akibat asap 2015 | Bab 7, berdampingan dengan korban tercatat | estimasi-model |
| Rezim keselamatan kebakaran industri | mandat tertulis Menteri ESDM, Menteri Perindustrian, dan Menteri Ketenagakerjaan; BNPB tidak disebut | Bab 8 dan Bab 12 | resmi |
| Teks Perpres 87/2020, Perpres 75/2021, Lampiran Perpres 12/2025, PP 21/2008, dan PP 22/2008 | teks dari JDIH BPK | Bab 1, Bab 2, dan Bab 12 | resmi |
| Nomenklatur K/L belum terpetakan | daftar lembaga bernomenklatur Oktober 2026 di paket lembaga | seluruh rekomendasi dan matriks lembaga | resmi |
:::
