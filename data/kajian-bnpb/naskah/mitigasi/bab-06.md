---
kajian: mitigasi
bab: 6
judul: Bencana Geologi
pertanyaan: Berapa penduduk terpapar resmi per bahaya geologi, dan di mana? Apa yang dapat dan tidak dapat dikuantifikasi untuk megathrust dan tsunami? Berapa korban kejadian analog sesar darat, erupsi, dan gempa majemuk, dan tuas apa yang paling menekan korban?
status: draf
target_halaman: 15
---

# Bencana Geologi {#bab:geologi}

::: ringkasan-bab
**Temuan:**

- Kajian Risiko Bencana (KRB) 2022–2026 mencatat {{angka:renas.krb.terpapar_gempa}} jiwa terpapar gempa bumi, praktis seluruh penduduk. Indeks Risiko Bencana Indonesia (IRBI) 2025 tidak menaruh satu pun dari {{angka:irbi.tsunami.kab_kelas_atas.2025}} kab/kota kelas nilai teratas tsunami di Pulau Jawa, sehingga sebaran risiko geologi tidak dapat dibaca dari satu ukuran.
- Untuk megathrust selatan Jawa yang resmi hanya bahayanya, yaitu magnitudo maksimum Mw {{angka:pusgen.jawa.mmaks}} dengan periode ulang {{angka:pusgen.jawa.periode_ulang|satuan}}; korban tsunami skenario tidak dikuantifikasi dan kartu memakai lantai tercatat {{angka:usgs.yogya2006.meninggal}} meninggal (Yogyakarta 2006) dan {{angka:usgs.pangandaran2006.meninggal}} meninggal (Pangandaran 2006).
- Data menunjuk mutu bangunan sebagai tuas korban guncangan dan evakuasi segera sebagai tuas korban tsunami dan erupsi, tetapi besar efeknya hanya berasal dari model yang belum diuji atau dari Jepang, dan tidak satu pun dari delapan program terkait geologi di kompendium kajian ini berbukti kuat.

**Angka kunci:**

- {{angka:renas.krb.terpapar_tsunami}} jiwa terpapar tsunami menurut KRB 2022–2026 [@bnpb-2025-renas, hlm. 24].
- {{angka:pusgen.megathrust.segmen_2024}} segmen megathrust dan {{angka:pusgen.sesar_aktif_2024}} sesar aktif dalam Peta Sumber dan Bahaya Gempa 2024 [@pusgen-2024-peta-gempa].
- {{angka:dibi.sulteng2018.meninggal}} meninggal dan {{angka:dibi.sulteng2018.hilang}} hilang akibat gempa majemuk Sulawesi Tengah 2018 [@bnpb-2026-dibi].

**Rekomendasi:** @rek:r-m05, @rek:r-m17, @rek:r-m19
:::

**Paparan resmi geologi terbesar adalah gempa bumi dengan {{angka:renas.krb.terpapar_gempa}} jiwa, disusul likuefaksi {{angka:renas.krb.terpapar_likuefaksi}}, gunung api {{angka:renas.krb.terpapar_gunungapi}}, dan tsunami {{angka:renas.krb.terpapar_tsunami}} jiwa.** Angka paparan gempa itu melampaui jumlah penduduk wilayah di basis data yang sama, sehingga mencakup praktis seluruh penduduk dan tidak membedakan wilayah [@bnpb-2026-krb-geologi]. Potensi kerugian fisik dan ekonomi per bahaya dari KRB yang sama, mulai dari {{angka:renas.krb.kerugian_gempa|rupiah}} untuk gempa, adalah nilai aset terpapar yang tidak dijumlah antarbahaya [@bnpb-2025-renas, hlm. 24–25]. Status resmi tiap bahaya tampil pada @tbl:status-geologi.

::: tabel {#tbl:status-geologi}
judul: Paparan, aset di kelas bahaya tinggi, dan kelas IRBI per bahaya geologi di Indonesia, KRB 2022–2026 dan IRBI 2025
sumber: Renas PB 2025–2029 dari KRB 2022–2026 [@bnpb-2025-renas, hlm. 24–25]; InaRISK BNPB, ringkasan KRB per bahaya [@bnpb-2026-krb-geologi]; IRBI 2025 [@bnpb-irbi]
keyakinan: resmi
angka: 2; 3; 4; 5; 6; 7
data_per: 24 Okt 2026
catatan: Kelas nilai teratas adalah kuintil teratas nilai kab/kota per bahaya, pilihan penyusun; likuefaksi tidak punya nilai IRBI per kab/kota; arti kolom aset dibaca dari nama medan data KRB.

| BAHAYA | TERPAPAR (jiwa) | POTENSI KERUGIAN | SEKOLAH KELAS TINGGI | PUSKESMAS KELAS TINGGI | KAB/KOTA BERNILAI IRBI | KAB/KOTA KELAS TERATAS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Gempa bumi | {{angka:renas.krb.terpapar_gempa}} | {{angka:renas.krb.kerugian_gempa|rupiah}} | {{angka:krb.gempa.sekolah_kelas_tinggi}} | {{angka:krb.gempa.puskesmas_kelas_tinggi}} | {{angka:irbi.gempa.kab_dinilai.2025}} | {{angka:irbi.gempa.kab_kelas_atas.2025}} |
| Likuefaksi | {{angka:renas.krb.terpapar_likuefaksi}} | {{angka:renas.krb.kerugian_likuefaksi_rp|rupiah}} | {{angka:krb.likuefaksi.sekolah_kelas_tinggi}} | {{angka:krb.likuefaksi.puskesmas_kelas_tinggi}} | – | – |
| Letusan gunung api | {{angka:renas.krb.terpapar_gunungapi}} | {{angka:renas.krb.kerugian_gunungapi_rp|rupiah}} | {{angka:krb.gunungapi.sekolah_kelas_tinggi}} | {{angka:krb.gunungapi.puskesmas_kelas_tinggi}} | {{angka:irbi.gunungapi.kab_dinilai.2025}} | {{angka:irbi.gunungapi.kab_kelas_atas.2025}} |
| Tsunami | {{angka:renas.krb.terpapar_tsunami}} | {{angka:renas.krb.kerugian_tsunami_rp|rupiah}} | {{angka:krb.tsunami.sekolah_kelas_tinggi}} | {{angka:krb.tsunami.puskesmas_kelas_tinggi}} | {{angka:irbi.tsunami.kab_dinilai.2025}} | {{angka:irbi.tsunami.kab_kelas_atas.2025}} |
:::

**KRB per kab/kota untuk keempat bahaya geologi belum tersedia di paket data kajian ini, sehingga angka paparan resmi hanya ditulis pada tingkat nasional.** Penarikan ulang data per kab/kota dari layanan InaRISK pada 24 Oktober 2026 gagal tersambung dalam tiga percobaan. Sebaran per kab/kota di bab ini karena itu memakai dua ukuran pengganti yang ditulis berdampingan dan berlabel, yaitu nilai IRBI 2025 per bahaya sebagai status resmi dan keluaran skenario platform sebagai estimasi model. Korelasi peringkat IRBI 2025 dengan jumlah laporan kejadian 2015–2025 per kab/kota hanya {{angka:irbi_dibi.nasional.spearman.gempa|fmt=2}} untuk gempa dan {{angka:irbi_dibi.nasional.spearman.gunungapi|fmt=2}} untuk gunung api [@bnpb-irbi; @bnpb-2026-dibi]. Catatan metode IRBI 2025 belum terbit, sehingga sebab rendahnya kesesuaian itu tidak dapat dipastikan.

## Gempa Bumi Megathrust {#sub:megathrust}

### Bahaya dan Status Resmi

**Pusat Studi Gempa Nasional (PuSGeN) 2024 menetapkan magnitudo maksimum segmen gabungan megathrust Jawa Mw {{angka:pusgen.jawa.mmaks}}, sepanjang {{angka:pusgen.jawa.panjang|satuan}}, dengan periode ulang {{angka:pusgen.jawa.periode_ulang|satuan}}.** Segmen Jawa bagian barat dan timur masing-masing bermagnitudo maksimum Mw {{angka:pusgen.jawa_segmen.mmaks}} dengan periode ulang {{angka:pusgen.jawa_segmen.periode_ulang|satuan}}, sedangkan segmen Mentawai-Siberut, Mentawai-Pagai, dan Enggano masing-masing Mw {{angka:pusgen.mentawai.mmaks}} dengan periode ulang {{angka:pusgen.mentawai.periode_ulang|satuan}} [@pusgen-2024-peta-gempa, hlm. 342–343]. Segmen Sumba bermagnitudo maksimum Mw {{angka:pusgen.sumba.mmaks}} tanpa data periode ulang. Buku PuSGeN memuat bahaya dan tidak memuat skenario korban. Renas PB 2025–2029 mencatat bahwa zona sumber bahaya dan kawasan rawan bencana gempa bumi dan tsunami belum teridentifikasi lengkap karena metode identifikasinya belum memadai [@bnpb-2025-renas, hlm. 27–28].

**Bila periode ulang resmi dibaca dengan asumsi Poisson, peluang gempa Mw {{angka:pusgen.jawa.mmaks}} di selatan Jawa dalam lima tahun adalah {{angka:geologi.jawa_gabungan.peluang_5th|fmt=2|persen}}.** Peluang gempa Mw {{angka:pusgen.jawa_segmen.mmaks}} per segmen Jawa adalah {{angka:geologi.jawa_segmen.peluang_5th|fmt=2|persen}}, dan per segmen Mentawai-Siberut, Mentawai-Pagai, atau Enggano {{angka:geologi.mentawai_segmen.peluang_5th|fmt=2|persen}}. Ketiganya turunan penyusun, di atas ambang penyisihan, sehingga tidak ada skenario yang disisihkan; peluang segmen Sumba tidak dinilai.

**Tidak ada skenario korban megathrust resmi dari PuSGeN atau Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) yang terbuka, dan rencana kontingensi megathrust nasional tidak ditemukan.** Satu-satunya proyeksi korban resmi yang terbaca adalah contoh dalam lampiran Perban BNPB 2/2023, yang dikutip dari rencana kontingensi tsunami megathrust Provinsi Jawa Timur 2021 [@bnpb-2023-renkon, hlm. 17]. Contoh itu memproyeksikan korban meninggal {{angka:renkon.jatim2021.rasio_meninggal|persen}} penduduk terpapar di tiap kab; tabelnya terpotong dan dasar rasio tetap itu tidak terbaca.

### Skenario Platform dan Angka Tercatat

**Skenario platform pada Mw {{angka:pusgen.jawa.mmaks}} memberi {{angka:geologi.jawa_mmaks.jiwa_mmi7|rentang|ringkas}} jiwa pada intensitas *Modified Mercalli Intensity* (MMI) VII atau lebih, dengan nilai tengah {{angka:geologi.jawa_mmaks.jiwa_mmi7|ringkas}} jiwa di {{angka:geologi.jawa_mmaks.kab_mmi7|satuan}}.** Angka itu estimasi model yang belum diuji balik: persamaan prediksi guncangan tanahnya belum diuji terhadap arsip intensitas BMKG, dan bidang patahannya {{angka:geologi.jawa_mmaks.panjang_bidang|satuan}}, lebih pendek dari segmen resmi {{angka:pusgen.jawa.panjang|satuan}}, sehingga guncangan ke barat dan timur kemungkinan kurang [@pantaubencana-2026-skenario-geologi]. Jawa Timur, Jawa Tengah, dan Jawa Barat memuat porsi jiwa terpapar terbesar, dengan Kab. Bandung, Kab. Malang, dan Kab. Jember di urutan teratas (@gbr:mmi-jawa). Skenario ilustratif Jawa di bawah magnitudo maksimum memberi {{angka:geologi.jawa.jiwa_mmi7|rentang|ringkas}} jiwa pada MMI VII atau lebih, dan tidak dipakai di kartu.

::: gambar {#gbr:mmi-jawa}
berkas: gambar/mitigasi/bab06-peta-mmi-jawa.png
jenis: peta
judul: Jiwa terpapar guncangan MMI VII atau lebih per kab/kota pada skenario megathrust Jawa Mw 9,1 PuSGeN 2024 dengan geometri platform (jiwa)
sumber: Simulasi skenario Pantau Bencana, belum divalidasi; magnitudo maksimum dari PuSGeN 2024; penduduk WorldPop 2026
keyakinan: estimasi-model; belum diuji balik
lebar: penuh
data_per: 24 Okt 2026
catatan: Nilai tengah per kab/kota; bidang patahan platform lebih pendek dari segmen resmi, sehingga guncangan di ujung barat dan timur kemungkinan kurang.
:::

**Mesin korban gempa platform menghitung {{angka:geologi.mesin.yogya2006_model|satuan}} untuk gempa Yogyakarta 2006, sedangkan USGS mencatat {{angka:usgs.yogya2006.meninggal}} meninggal.** Model itu dikalibrasi pada delapan gempa kerak dengan faktor galat uji silang {{angka:geologi.mesin.faktor_loo|fmt=1}} kali, dan untuk Padang 2009 di luar sampel model memberi angka di atas {{angka:dibi.padang2009.meninggal}} meninggal yang tercatat di DIBI [@usgs-usp000ej1c; @bnpb-2026-dibi]. Rasio korban per jiwa terpapar yang dipakai mesin, {{angka:geologi.analog_guncangan.rasio|rentang|fmt=3|persen}}, berasal dari enam gempa kerak dan slab, tanpa satu pun analog megathrust. Pita korban guncangan skenario Mw {{angka:pusgen.jawa.mmaks}} karena itu lebih dari satu orde, sehingga hanya tampil di lampiran, dan kartu memakai lantai tercatat.

**Kejadian tercatat terburuk 1996–2025 menjadi lantai kartu megathrust: Yogyakarta 2006 dengan {{angka:usgs.yogya2006.meninggal}} meninggal untuk guncangan Jawa dan Padang 2009 dengan {{angka:dibi.padang2009.meninggal}} meninggal untuk Sumatra bagian barat.** Lantai tsunami adalah Pangandaran 2006 dengan {{angka:usgs.pangandaran2006.meninggal}} meninggal dan {{angka:usgs.pangandaran2006.hilang}} hilang untuk selatan Jawa, serta Mentawai 2010 dengan {{angka:dibi.mentawai2010.meninggal}} meninggal dan {{angka:dibi.mentawai2010.hilang}} hilang untuk Sumatra bagian barat [@usgs-usp000ensm; @bnpb-2026-dibi]. Batas bawah pita korban model Mentawai berada di bawah lantai Padang 2009, tetapi tidak dinaikkan karena Padang 2009 gempa intraslab di sumber lain.

:::: skenario {#tbl:kartu-megathrust-jawa}
jenis: gempa
judul: Megathrust selatan Jawa Mw {{angka:pusgen.jawa.mmaks}} PuSGeN 2024 pada geometri platform
dasar: Magnitudo maksimum dan periode ulang segmen gabungan Jawa dari PuSGeN 2024; sebaran guncangan dari mesin platform; korban ditulis sebagai lantai tercatat karena pita model lebih dari satu orde.
kemungkinan: 2
peta: gambar/mitigasi/bab06-kartu-megathrust-jawa.png
lembaga: Deputi Bidang Penanganan Darurat; BMKG; Kementerian Energi dan Sumber Daya Mineral; BPBD provinsi
sumber: PuSGeN 2024 [@pusgen-2024-peta-gempa]; KRB 2022–2026 [@bnpb-2026-krb-geologi]; USGS [@usgs-usp000ej1c; @usgs-usp000ensm]; @widiyantoro-2020-tsunami; simulasi skenario Pantau Bencana [@pantaubencana-2026-skenario-geologi]
kaki: Simulasi skenario Pantau Bencana, belum divalidasi; pita korban, rumah rusak, pengungsi, dan kerugian skenario hanya di lampiran karena lebih dari satu orde.
data_per: 24 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Kependudukan, korban jiwa guncangan (lantai Yogyakarta 2006) | {{angka:usgs.yogya2006.meninggal}} | – | terverifikasi | USGS; pita model di lampiran |
| Kependudukan, korban jiwa tsunami (lantai Pangandaran 2006) | {{angka:usgs.pangandaran2006.meninggal}} | – | terverifikasi | USGS, ditambah {{angka:usgs.pangandaran2006.hilang}} hilang; korban tsunami skenario tidak dikuantifikasi |
| Kependudukan, jiwa terpapar MMI VII atau lebih | {{angka:geologi.jawa_mmaks.jiwa_mmi7|rendah|ringkas}} | {{angka:geologi.jawa_mmaks.jiwa_mmi7|tinggi|ringkas}} | estimasi-model | simulasi Pantau Bencana; persamaan guncangan belum diuji |
| Lingkungan, luas guncangan MMI VI atau lebih (km2) | {{angka:geologi.jawa_mmaks.luas_mmi6}} | – | estimasi-model | simulasi Pantau Bencana |
| Lingkungan, pantai dicapai tsunami kurang dari {{angka:geologi.ambang.tiba_menit}} menit (km) | {{angka:geologi.jawa_mmaks.pantai_30mnt|rendah}} | {{angka:geologi.jawa_mmaks.pantai_30mnt|tinggi}} | estimasi-model | waktu tiba belum diuji terhadap kejadian |
| Ekonomi, kerugian materiil | – | – | – | pita stimulan rumah lebih dari satu orde, hanya di lampiran |
| Infrastruktur/fisik, rumah rusak berat | – | – | – | pita lebih dari satu orde; data bangunan tidak ada |
| Layanan sipil, sekolah di kelas bahaya tinggi tsunami (nasional) | {{angka:krb.tsunami.sekolah_kelas_tinggi}} | – | resmi | InaRISK KRB; angka Pulau Jawa saja tidak tersedia |
| Kebutuhan respons, pengungsi | – | – | – | aturan rumah rusak berat dan sedang × {{angka:geologi.asumsi.jiwa_per_rumah|fmt=1}} diuji pada tiga kejadian; angka skenario di lampiran |
:::

::: kebijakan
Pada model platform, korban guncangan menjadi {{angka:geologi.kepekaan.bangunan_naik.jawa_mmaks}} kali korban dasar bila separuh stok tembok tanpa tulangan diganti beton terkekang, dan {{angka:geologi.kepekaan.bangunan_penuh.jawa_mmaks}} kali bila seluruhnya diganti. Kurva beton di mesin masih kurva sebelum kode bangunan, sehingga manfaat kepatuhan penuh kemungkinan terlalu kecil.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Kepatuhan bangunan, sebagian | stok sekarang | separuh tembok tanpa tulangan diganti | {{angka:geologi.kepekaan.bangunan_naik.jawa_mmaks}} kali dasar | tidak dihitung: rumah rusak model hanya di lampiran |
| Kepatuhan bangunan, penuh | stok sekarang | tanpa tembok tanpa tulangan | {{angka:geologi.kepekaan.bangunan_penuh.jawa_mmaks}} kali dasar | tidak dihitung: rumah rusak model hanya di lampiran |
| Evakuasi segera saat guncangan kuat | {{angka:nankai.evakuasi_rendah_persen|persen}} warga | {{angka:nankai.evakuasi_tinggi_persen|persen}} warga | {{angka:nankai.faktor_70|fmt=3}} kali kematian tsunami (faktor Jepang, atas paparan) | tidak berubah: evakuasi tidak mengurangi rumah rusak |
| Jam kejadian | rata-rata | malam hari | {{angka:geologi.kepekaan.malam|fmt=2}} kali korban guncangan | tidak berubah |
:::

::: respons
- Evakuasi mandiri saat guncangan kuat di pantai yang dicapai tsunami kurang dari {{angka:geologi.ambang.tiba_menit}} menit.
- Pengungsian disiapkan dari jumlah rumah rusak berat dan sedang yang terdata, bukan dari angka skenario.
- Rencana kontingensi tsunami provinsi memakai Mw {{angka:pusgen.jawa.mmaks}} dan lantai Pangandaran 2006 (@rek:r-m05).
:::

::: pemulihan
- Penilaian kerusakan memakai satu instrumen rumah rusak untuk DIBI dan R3P (@rek:r-m17).
- Stimulan rumah diperlakukan sebagai batas bawah kerugian perumahan.
- Penataan permukiman pesisir mengikuti genangan tsunami resmi saat tersedia.
:::
::::

:::: skenario {#tbl:kartu-megathrust-mentawai}
jenis: gempa
judul: Megathrust Mentawai dan Enggano Mw {{angka:pusgen.mentawai.mmaks}} PuSGeN 2024
dasar: Magnitudo maksimum dan periode ulang segmen Mentawai-Siberut, Mentawai-Pagai, dan Enggano dari PuSGeN 2024; sebaran guncangan dari mesin platform; korban ditulis sebagai lantai tercatat.
kemungkinan: 3
peta: gambar/mitigasi/bab06-kartu-megathrust-mentawai.png
lembaga: Deputi Bidang Penanganan Darurat; BMKG; Kementerian Energi dan Sumber Daya Mineral; BPBD Sumatera Barat dan Bengkulu
sumber: PuSGeN 2024 [@pusgen-2024-peta-gempa]; DIBI BNPB [@bnpb-2026-dibi]; simulasi skenario Pantau Bencana [@pantaubencana-2026-skenario-geologi]
kaki: Simulasi skenario Pantau Bencana, belum divalidasi; pita korban model ditulis utuh di lampiran tanpa dipotong ke lantai.
data_per: 24 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Kependudukan, korban jiwa guncangan (lantai Padang 2009) | {{angka:dibi.padang2009.meninggal}} | – | resmi | DIBI BNPB; USGS {{angka:usgs.padang2009.meninggal}} |
| Kependudukan, korban jiwa tsunami (lantai Mentawai 2010) | {{angka:dibi.mentawai2010.meninggal}} | – | resmi | DIBI BNPB, ditambah {{angka:dibi.mentawai2010.hilang}} hilang; korban tsunami skenario tidak dikuantifikasi |
| Kependudukan, jiwa terpapar MMI VII atau lebih | {{angka:geologi.mentawai_mmaks.jiwa_mmi7|rendah|ringkas}} | {{angka:geologi.mentawai_mmaks.jiwa_mmi7|tinggi|ringkas}} | estimasi-model | simulasi Pantau Bencana |
| Lingkungan, luas guncangan MMI VI atau lebih (km2) | {{angka:geologi.mentawai_mmaks.luas_mmi6}} | – | estimasi-model | simulasi Pantau Bencana |
| Lingkungan, pantai dicapai tsunami kurang dari {{angka:geologi.ambang.tiba_menit}} menit (km) | {{angka:geologi.mentawai_mmaks.pantai_30mnt|rendah}} | {{angka:geologi.mentawai_mmaks.pantai_30mnt|tinggi}} | estimasi-model | waktu tiba belum diuji terhadap kejadian |
| Ekonomi, kerugian materiil | – | – | – | pita lebih dari satu orde, hanya di lampiran |
| Infrastruktur/fisik, rumah rusak berat | – | – | – | pita lebih dari satu orde; data bangunan tidak ada |
| Layanan sipil, puskesmas di kelas bahaya tinggi tsunami (nasional) | {{angka:krb.tsunami.puskesmas_kelas_tinggi}} | – | resmi | InaRISK KRB; angka per segmen tidak tersedia |
| Kebutuhan respons, pengungsi tercatat Mentawai 2010 | {{angka:dibi.mentawai2010.mengungsi}} | – | resmi | DIBI BNPB; pengungsi skenario di lampiran |
:::

::: kebijakan
Bila seluruh tembok tanpa tulangan diganti beton terkekang, korban guncangan model menjadi {{angka:geologi.kepekaan.bangunan_penuh.mentawai_mmaks}} kali korban dasar; angka tinggi tsunami terbitan bertinjauan untuk segmen ini tidak tersedia di bahan kajian.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Kepatuhan bangunan, penuh | stok sekarang | tanpa tembok tanpa tulangan | {{angka:geologi.kepekaan.bangunan_penuh.mentawai_mmaks}} kali dasar | tidak dihitung: rumah rusak model hanya di lampiran |
| Evakuasi segera saat guncangan kuat | {{angka:nankai.evakuasi_rendah_persen|persen}} warga | survei warga Jepang {{angka:nankai.evakuasi_survei_persen|fmt=1|persen}} | {{angka:nankai.faktor_survei|fmt=3}} kali kematian tsunami (faktor Jepang, atas paparan) | tidak berubah |
:::

::: respons
- Evakuasi mandiri saat guncangan kuat di pesisir Kota Padang dan Kota Bengkulu.
- Rencana kontingensi tsunami Sumatera Barat dan Bengkulu memakai lantai Mentawai 2010 (@rek:r-m05).
- Pengungsian dihitung dari rumah rusak yang terdata.
:::

::: pemulihan
- Penilaian kerusakan dengan instrumen rumah rusak yang sama (@rek:r-m17).
- Pemulihan permukiman pulau kecil dengan rute evakuasi yang tercapai sebelum tsunami tiba.
- Stimulan rumah sebagai batas bawah kerugian perumahan.
:::
::::

## Gempa Bumi Sesar Darat Dekat Permukiman {#sub:sesar-darat}

**Gempa sesar darat Yogyakarta 2006 menewaskan {{angka:usgs.yogya2006.meninggal}} orang menurut USGS dan menimbulkan kerusakan dan kerugian {{angka:bappenas.yogya2006.kerusakan_kerugian|rupiah}} menurut penilaian awal Bappenas.** Penilaian awal itu mencatat {{angka:bappenas.yogya2006.meninggal}} meninggal. Sektor perumahan menyumbang {{angka:bappenas.yogya2006.perumahan|rupiah}}, lebih dari separuh total, dan rumah hancur tercatat {{angka:bappenas.yogya2006.rumah_hancur|rentang}} unit karena dokumen yang sama memuat dua versi [@bappenas-2006-dala-yogya; @usgs-usp000ej1c]. Penilaian awal itu menilai teknik membangun yang buruk dan bahan bangunan bermutu rendah sebagai penyumbang besar jumlah korban. Gempa ini menjadi lantai kartu sesar darat karena korbannya terbesar di antara gempa darat Jawa sejak 1996, sedangkan dasbor publik DIBI tidak memuat kejadian sebelum 2008.

**Gempa Cianjur 2022 tercatat {{angka:dibi.cianjur2022.meninggal}} meninggal, {{angka:dibi.cianjur2022.hilang}} hilang, {{angka:dibi.cianjur2022.mengungsi}} pengungsi, dan {{angka:dibi.cianjur2022.rumah_rusak}} rumah rusak di DIBI untuk lima kab/kota.** R3P Kabupaten Cianjur mencatat {{angka:r3p.cianjur2022.rumah_rusak}} rumah rusak menurut surat keputusan bupati tahap II hasil reviu BNPB. Kerusakan dan kerugiannya {{angka:r3p.cianjur2022.kerusakan_kerugian|rupiah}}, termasuk perumahan {{angka:r3p.cianjur2022.perumahan|rupiah}} [@bnpb-2026-dibi; @cianjur-2022-r3p]. Baris Kab. Cianjur saja di DIBI memuat {{angka:dibi.cianjur2022.mengungsi_kab_cianjur}} pengungsi. Selisih rumah rusak DIBI dan R3P tidak dijelaskan kedua sumber, sehingga keduanya ditulis berdampingan.

**R3P Cianjur mengosongkan {{angka:r3p.cianjur2022.desa_dikosongkan|satuan}} di jalur Sesar Cugenang dari permukiman.** Evaluasi dampak penataan itu tidak ditemukan [@cianjur-2022-r3p].

**PuSGeN 2024 memberi magnitudo maksimum Mw {{angka:pusgen.lembang.mmaks}} untuk Sesar Lembang, Mw {{angka:pusgen.cimandiri.mmaks|rentang}} untuk empat segmen Cimandiri, dan Mw {{angka:pusgen.opak.mmaks}} untuk Sesar Opak.** Segmen Cianjur bermagnitudo maksimum Mw {{angka:pusgen.cianjur.mmaks}} [@pusgen-2024-peta-gempa, hlm. 368–371]. Magnitudo maksimum Opak lebih besar daripada gempa Yogyakarta 2006, dan magnitudo maksimum Lembang dan Cimandiri lebih besar daripada gempa Cianjur 2022. Kartu sesar darat karena itu menulis kedua kejadian sebagai lantai, bukan sebagai skenario terburuk, sampai skenario sesar darat dijalankan dengan magnitudo maksimum resmi. Gempa Cianjur 2022 sudah setara magnitudo maksimum segmennya, sehingga besar korbannya lebih dijelaskan oleh mutu bangunan dan letak permukiman daripada besar gempanya; ini penilaian kajian, bukan hasil uji.

**Gempa Laut Flores Agustus 2026 menambah analog gempa dan tsunami di Nusa Tenggara Timur, dengan {{angka:dibi.ntt2026.gempa.meninggal}} meninggal tercatat sementara di DIBI dan sedikitnya {{angka:usgs.flores2026.meninggal}} menurut USGS.** USGS mencatat {{angka:usgs.flores2026.rumah_hancur}} rumah hancur dan tsunami tercatat maksimum {{angka:usgs.flores2026.tsunami_maks|satuan}}, dari sesar naik dangkal di dalam lempeng Sunda, bukan dari zona subduksi [@usgs-us6000tkt2]. DIBI mencatat {{angka:dibi.ntt2026.gempa.mengungsi}} pengungsi di provinsi itu [@bnpb-2026-dibi]. Kejadian ini di luar periode acuan lantai 1996–2025 dan sumbernya tidak punya kartu, sehingga belum dibuatkan kartu; angka DIBI difinalkan sekitar Februari 2027.

:::: skenario {#tbl:kartu-sesar-darat}
jenis: gempa
judul: Gempa sesar darat dekat permukiman setara Yogyakarta 2006 dan Cianjur 2022
dasar: Kartu analog; dua kejadian tercatat dipakai sebagai lantai karena magnitudo maksimum resmi Sesar Lembang, Cimandiri, dan Opak lebih besar daripada kedua kejadian itu; skenario sesar darat dengan magnitudo maksimum resmi belum dijalankan.
kemungkinan: periode ulang tidak dinilai: PuSGeN 2024 memberi magnitudo maksimum dan laju geser, tetapi periode ulang per sesar belum diturunkan kajian ini
peta: gambar/mitigasi/bab06-kartu-sesar-darat.png
lembaga: Deputi Bidang Penanganan Darurat; Kementerian Pekerjaan Umum; Kementerian Energi dan Sumber Daya Mineral; BPBD Jawa Barat dan DI Yogyakarta
sumber: USGS [@usgs-usp000ej1c]; @bappenas-2006-dala-yogya; DIBI BNPB [@bnpb-2026-dibi]; R3P Cianjur [@cianjur-2022-r3p]; PuSGeN 2024 [@pusgen-2024-peta-gempa]
kaki: Kejadian analog tercatat, bukan proyeksi model; R3P Cianjur berstatus contoh dokumen di portal BNPB tanpa nomor penetapan.
data_per: 24 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Kependudukan, korban jiwa Yogyakarta 2006 (lantai) | {{angka:usgs.yogya2006.meninggal}} | – | terverifikasi | USGS; Bappenas {{angka:bappenas.yogya2006.meninggal}} |
| Kependudukan, korban jiwa Cianjur 2022 | {{angka:dibi.cianjur2022.meninggal}} | – | resmi | DIBI BNPB, ditambah {{angka:dibi.cianjur2022.hilang}} hilang |
| Kependudukan, pengungsi tercatat Cianjur 2022 | {{angka:dibi.cianjur2022.mengungsi}} | – | resmi | DIBI BNPB; pengungsi Yogyakarta 2006 tidak tercatat |
| Infrastruktur/fisik, rumah rusak Cianjur 2022 | {{angka:dibi.cianjur2022.rumah_rusak}} | {{angka:r3p.cianjur2022.rumah_rusak}} | resmi | rendah DIBI BNPB, tinggi R3P Cianjur |
| Infrastruktur/fisik, rumah hancur Yogyakarta 2006 | {{angka:bappenas.yogya2006.rumah_hancur|rendah}} | {{angka:bappenas.yogya2006.rumah_hancur|tinggi}} | resmi | Bappenas, dua versi dalam satu dokumen |
| Ekonomi, kerusakan dan kerugian Yogyakarta 2006 | {{angka:bappenas.yogya2006.kerusakan_kerugian|rupiah}} | – | resmi | Bappenas, penilaian awal |
| Ekonomi, kerusakan dan kerugian Cianjur 2022 | {{angka:r3p.cianjur2022.kerusakan_kerugian|rupiah}} | – | resmi | R3P Cianjur |
| Lingkungan, desa dikosongkan di jalur Sesar Cugenang | {{angka:r3p.cianjur2022.desa_dikosongkan}} | – | resmi | R3P Cianjur |
| Layanan sipil, fasilitas rusak | – | – | – | rekap fasilitas rusak per kejadian tidak tersedia di bahan kajian |
| Kebutuhan respons, pengungsi dari rumah rusak Kab. Cianjur | {{angka:geologi.pengungsi_rumah.cianjur}} | – | asumsi-kebijakan | aturan rumah rusak berat dan sedang × {{angka:geologi.asumsi.jiwa_per_rumah|fmt=1}}; tercatat {{angka:dibi.cianjur2022.mengungsi_kab_cianjur}} |
:::

::: kebijakan
Magnitudo maksimum resmi Sesar Opak Mw {{angka:pusgen.opak.mmaks}} dan Sesar Lembang Mw {{angka:pusgen.lembang.mmaks}} berada di atas kedua kejadian analog, sehingga korban kejadian sesar darat berikutnya di Jawa tidak dibatasi angka lantai ini.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Sumber angka Cianjur 2022 | DIBI | R3P | {{angka:dibi.cianjur2022.meninggal}} ke {{angka:r3p.cianjur2022.meninggal}} | rumah rusak {{angka:dibi.cianjur2022.rumah_rusak}} ke {{angka:r3p.cianjur2022.rumah_rusak}} |
| Sumber angka Yogyakarta 2006 | USGS | Bappenas | {{angka:usgs.yogya2006.meninggal}} ke {{angka:bappenas.yogya2006.meninggal}} | tetap {{angka:bappenas.yogya2006.kerusakan_kerugian|rupiah}} |
:::

::: respons
- Pencarian dan pertolongan di permukiman padat dengan rumah tembok tanpa tulangan.
- Pengungsian disiapkan dari rumah rusak berat dan sedang yang terdata.
- Pendataan korban dengan tanggal rekap agar angka dinamis dan statis dapat direkonsiliasi.
:::

::: pemulihan
- Penataan permukiman di jalur sesar seperti desa yang dikosongkan di Cugenang.
- Rekonstruksi rumah dengan pengawasan standar bangunan tahan gempa.
- Seri kerusakan dan kerugian R3P dibuka untuk pembanding kejadian berikutnya (@rek:r-m17).
:::
::::

## Tsunami {#sub:tsunami}

**KRB 2022–2026 mencatat {{angka:renas.krb.terpapar_tsunami}} jiwa terpapar tsunami dan {{angka:renas.krb.luas_tinggi_tsunami|satuan}} kelas bahaya tinggi, termasuk {{angka:renas.krb.tsunami.terpapar_umur_rentan}} jiwa umur rentan dan {{angka:renas.krb.tsunami.terpapar_disabilitas}} penyandang disabilitas.** Di kelas bahaya tinggi tsunami tercatat {{angka:krb.tsunami.sekolah_kelas_tinggi}} sekolah, {{angka:krb.tsunami.puskesmas_kelas_tinggi}} puskesmas, dan {{angka:krb.tsunami.rs_kelas_tinggi}} rumah sakit secara nasional [@bnpb-2025-renas, hlm. 22, 24; @bnpb-2026-krb-geologi]. Angka aset itu dibaca dari nama medan data KRB karena dokumentasinya tidak dibuka. Data sekolah dan fasilitas kesehatan yang hanya mencakup sembilan provinsi berlaku untuk mesin skenario platform, bukan untuk paparan resmi.

**IRBI 2025 memberi nilai tsunami untuk {{angka:irbi.tsunami.kab_dinilai.2025}} kab/kota, dan tidak satu pun dari {{angka:irbi.tsunami.kab_kelas_atas.2025}} kab/kota kelas nilai teratasnya berada di Pulau Jawa.** Kab. Sukabumi dan Kab. Pangandaran memiliki nilai tsunami tertinggi di Jawa, tetapi di bawah batas kelas teratas [@bnpb-irbi]. Daftar perhatian tsunami kajian ini, yang memuat {{angka:perhatian.mitigasi.tsunami.n|satuan}}, karena itu hanya memuat Kab. Pandeglang dari Pulau Jawa. Tiga syaratnya gagal bersamaan di pantai selatan Jawa: IRBI tidak menaruh kab Jawa di kelas teratas, proksi pesisir rendah luput di pantai selatan Jawa Barat, dan syarat kejadian sejak 2008 melewatkan Pangandaran 2006. Daftar itu karena itu dibaca dengan keterbatasan tersebut sampai genangan resmi tersedia.

**Tinggi tsunami terbitan bertinjauan untuk skenario Mw {{angka:pusgen.jawa.mmaks}} di selatan Jawa mencapai sekitar {{angka:widiyantoro.jawa_barat.tinggi_tsunami|satuan}} di pulau-pulau kecil selatan Banten dan sekitar {{angka:widiyantoro.jawa_timur.tinggi_tsunami|satuan}} di Jawa Timur, dengan rata-rata maksimum {{angka:widiyantoro.jawa.tinggi_rerata_maks|satuan}} sepanjang pantai selatan Jawa.** Angka itu keluaran model, bukan *run-up* terukur [@widiyantoro-2020-tsunami]. Skenario yang memasukkan sesar naik belakang memberi tinggi maksimum hingga {{angka:supendi.ujung_kulon.tinggi_tsunami|satuan}} di pantai selatan Jawa dekat Semenanjung Ujung Kulon dan pantai barat Sumatra paling selatan [@supendi-2022-megathrust]. Angka Supendi dkk. berlaku untuk selatan Jawa bagian barat dan Selat Sunda, tidak untuk segmen Mentawai dan Enggano.

**Korban tsunami skenario tidak dikuantifikasi karena genangan resmi InaRISK belum dipakai, dan proksi platform memberi {{angka:geologi.jawa_mmaks.jiwa_pesisir_30mnt_pulau_jawa}} jiwa kecamatan pesisir rendah di Pulau Jawa yang dicapai tsunami dalam {{angka:geologi.ambang.tiba_menit}} menit pada Mw {{angka:pusgen.jawa.mmaks}}.** Untuk skenario megathrust Jawa termasuk Bali dan Nusa Tenggara Barat, angkanya {{angka:geologi.jawa_mmaks.jiwa_pesisir_30mnt}} jiwa, dan untuk Mentawai {{angka:geologi.mentawai.jiwa_pesisir_30mnt}} jiwa [@pantaubencana-2026-skenario-geologi]. Proksi itu menghitung seluruh penduduk kecamatan yang pusatnya rendah dan melewatkan kecamatan yang pusatnya tinggi. Pada Mw {{angka:pusgen.jawa.mmaks}}, proksi luput di {{angka:geologi.jawa_mmaks.lubang_proksi_kab|satuan}} yang tiba tsunaminya kurang dari {{angka:geologi.ambang.tiba_menit}} menit, termasuk Kab. Malang, Kab. Tasikmalaya, Kab. Garut, Kab. Cianjur, dan Kab. Sukabumi (@gbr:tsunami-30mnt). Pembandingnya contoh renkon Jawa Timur 2021 yang mencatat {{angka:renkon.jatim2021.banyuwangi_terpapar}} jiwa terpapar di Banyuwangi tanpa batas waktu tiba, dengan definisi yang berbeda dari proksi [@bnpb-2023-renkon, hlm. 17].

::: gambar {#gbr:tsunami-30mnt}
berkas: gambar/mitigasi/bab06-peta-tsunami-30mnt.png
jenis: peta
judul: Jiwa kecamatan pesisir rendah dengan tiba tsunami {{angka:geologi.ambang.tiba_menit}} menit atau kurang dan panjang pantai tiba kurang dari {{angka:geologi.ambang.tiba_menit}} menit, skenario megathrust Jawa Mw 9,1 dan Mentawai Mw 8,9 (jiwa)
sumber: Simulasi skenario Pantau Bencana, belum divalidasi; magnitudo maksimum dari PuSGeN 2024
keyakinan: estimasi-model; belum diuji balik
lebar: penuh
data_per: 24 Okt 2026
catatan: Paparan, bukan genangan; skenario Jawa termasuk Bali dan Nusa Tenggara Barat; daftar kab/kota yang luput dari proksi tercetak di samping peta; tinggi indikatif tidak ditampilkan.
:::

**Kejadian tsunami tercatat menunjukkan waktu tiba yang pendek: tsunami Palu 2018 tiba {{angka:widiyanto.palu2018.waktu_tiba|rentang|satuan}} setelah guncangan dengan *run-up* terukur tertinggi {{angka:widiyanto.palu2018.runup_maks|fmt=2|satuan}}.** Stasiun pasang surut Pantoloan di dalam Teluk Palu tetap merekam, tetapi pengiriman datanya terhenti karena jaringan komunikasi putus [@widiyanto-2019-palu]. Survei warga Donggala dan Palu mencatat {{angka:harnantyari.palu2018.evakuasi_melihat_orang_lain|fmt=1|persen}} responden mengungsi setelah melihat orang lain mengungsi, dan tidak ada peringatan resmi yang diterima sebelum tsunami tiba [@harnantyari-2020-palu]. Lantai tsunami Selat Sunda adalah kejadian 2018 dengan {{angka:dibi.selatsunda2018.meninggal}} meninggal dan {{angka:dibi.selatsunda2018.hilang}} hilang, dan lantai nasional adalah Aceh 2004 dengan {{angka:brr.aceh2004.meninggal}} meninggal dan {{angka:brr.aceh2004.hilang}} hilang [@bnpb-2026-dibi].

**Renas PB menargetkan sarana diseminasi informasi gempa dan tsunami naik dari {{angka:renas.diseminasi_gempa_tsunami.unit_2024|satuan}} pada 2024 menjadi {{angka:renas.diseminasi_gempa_tsunami.unit_2029|satuan}} pada 2029, dan stasiun pasang surut dari {{angka:renas.pasut.unit_2024}} menjadi {{angka:renas.pasut.unit_2029}} unit, dengan BMKG sebagai penanggung jawab.** Renstra BNPB mencatat keterpenuhan peringatan dini {{angka:renstra.peringatan_dini.keterpenuhan_persen|persen}} [@bnpb-2025-renas, hlm. 52–53]. Target itu mengukur alat dan keluaran. Untuk pantai yang dicapai tsunami dalam hitungan menit, data kajian ini tidak menunjukkan bahwa penambahan alat saja menekan korban; waktu terbit peringatan InaTEWS pada tsunami Palu 2018 belum dapat dikutip dari sumber primer.

## Gunung Api {#sub:gunungapi}

**KRB 2022–2026 mencatat {{angka:renas.krb.terpapar_gunungapi}} jiwa terpapar letusan gunung api, dan zona Kawasan Rawan Bencana (KRB) III PVMBG 2018 untuk tiga puluh gunung memuat {{angka:geologi.krb30.jiwa_krb3}} jiwa.** Merapi dan Agung memuat {{angka:geologi.krb30.porsi_merapi_agung_krb3|fmt=1|persen}} jiwa KRB III itu, sedangkan KRB II dan KRB I masing-masing memuat {{angka:geologi.krb30.jiwa_krb2}} dan {{angka:geologi.krb30.jiwa_krb1}} jiwa dengan penduduk WorldPop 2026 [@pantaubencana-2026-skenario-geologi]. Cakupan zona PVMBG itu lebih sempit daripada paparan KRB nasional, sehingga kedua angka tidak dibandingkan langsung. IRBI 2025 memberi nilai gunung api untuk {{angka:irbi.gunungapi.kab_dinilai.2025}} kab/kota, dengan {{angka:irbi.gunungapi.kab_kelas_atas.2025}} di kelas nilai teratas [@bnpb-irbi]. Pemutakhiran zona per gunung sesudah 2018 belum diperiksa kajian ini.

**Erupsi Merapi 2010 tercatat {{angka:dibi.merapi2010.meninggal}} meninggal, {{angka:dibi.merapi2010.mengungsi}} pengungsi, dan {{angka:dibi.merapi2010.rumah_rusak}} rumah rusak di DIBI, korban erupsi terbesar di DIBI sejak 2008.** Surono dkk. memperkirakan prakiraan Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) yang tepat waktu menyelamatkan {{angka:surono.merapi2010.jiwa_terselamatkan|rentang}} jiwa; angka itu perkiraan penulis, bukan hasil evaluasi berpembanding [@surono-2012-merapi; @bnpb-2026-dibi]. Erupsi Semeru 2021 tercatat {{angka:dibi.semeru2021.meninggal}} meninggal dan {{angka:dibi.semeru2021.hilang}} hilang. Penilaian kerusakan dan kerugian Merapi 2010 tidak ditemukan.

**Model sapuan awan panas dan lahar setara Merapi 2010 memberi {{angka:geologi.merapi2010.jiwa_sapuan}} jiwa di area sapuan tanpa evakuasi, dan pengungsi {{angka:geologi.merapi2010.pengungsi_radius20}} jiwa bila radius pengungsian sama dengan 2010.** Sebaran model tidak cocok dengan kejadian, karena paparan sapuan model terbesar jatuh di Magelang, sedangkan korban nyata terbanyak berada di Sleman [@pantaubencana-2026-skenario-geologi]. Angka sapuan karena itu hanya menjadi konteks paparan dan tidak dibagi dengan korban tercatat. Kartu gunung api memakai Merapi 2010 sebagai analog dan menyebut Agung sebagai paparan KRB III terbesar kedua tanpa skenario.

:::: skenario {#tbl:kartu-gunungapi}
jenis: gunungapi
judul: Erupsi gunung api setara Merapi 2010
dasar: Kartu analog; Merapi dan Agung memuat {{angka:geologi.krb30.porsi_merapi_agung_krb3|fmt=1|persen}} jiwa KRB III tiga puluh gunung; korban dan pengungsi dari catatan DIBI musim erupsi 2010, model sapuan hanya pembanding paparan.
kemungkinan: periode ulang tidak dinilai: kelas peluang letusan setara 2010 tidak tersedia di bahan kajian
peta: gambar/mitigasi/bab06-kartu-gunungapi.png
lembaga: Kementerian Energi dan Sumber Daya Mineral; Deputi Bidang Penanganan Darurat; BPBD DI Yogyakarta dan Jawa Tengah
sumber: DIBI BNPB [@bnpb-2026-dibi]; @surono-2012-merapi; KRB PVMBG 2018 dan simulasi skenario Pantau Bencana [@pantaubencana-2026-skenario-geologi]
kaki: Kejadian analog tercatat; model sapuan adalah simulasi skenario Pantau Bencana, belum divalidasi.
data_per: 24 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Kependudukan, korban jiwa tercatat Merapi 2010 | {{angka:dibi.merapi2010.meninggal}} | – | resmi | DIBI BNPB |
| Kependudukan, jiwa di area sapuan tanpa evakuasi | {{angka:geologi.merapi2010.jiwa_sapuan}} | – | estimasi-model | simulasi Pantau Bencana; sebaran tidak cocok dengan kejadian |
| Kependudukan, jiwa di KRB III tiga puluh gunung | {{angka:geologi.krb30.jiwa_krb3}} | – | resmi | zona PVMBG 2018 dengan penduduk WorldPop 2026 |
| Lingkungan, luas sapuan awan panas dan lahar (ha) | {{angka:geologi.merapi2010.luas_sapuan}} | – | estimasi-model | simulasi Pantau Bencana |
| Ekonomi, stimulan rumah (batas bawah) | {{angka:stimulan.merapi2010.rumah_dibi|rupiah}} | – | asumsi-kebijakan | rumah rusak DIBI; penilaian kerugian tidak ditemukan |
| Infrastruktur/fisik, rumah rusak | {{angka:dibi.merapi2010.rumah_rusak}} | – | resmi | DIBI BNPB |
| Layanan sipil, puskesmas di kelas bahaya tinggi gunung api (nasional) | {{angka:krb.gunungapi.puskesmas_kelas_tinggi}} | – | resmi | InaRISK KRB |
| Kebutuhan respons, pengungsi tercatat 2010 | {{angka:dibi.merapi2010.mengungsi}} | – | resmi | DIBI BNPB |
| Kebutuhan respons, pengungsi model pada radius 2010 | {{angka:geologi.merapi2010.pengungsi_radius20}} | – | estimasi-model | simulasi Pantau Bencana, penduduk 2026 |
:::

::: kebijakan
Prakiraan PVMBG pada 2010 diperkirakan penulisnya menyelamatkan {{angka:surono.merapi2010.jiwa_terselamatkan|rentang}} jiwa; tidak ada evaluasi berpembanding yang mengukur efek evakuasi itu.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Evakuasi berbasis prakiraan PVMBG | tanpa prakiraan tepat waktu | prakiraan 2010 | {{angka:surono.merapi2010.jiwa_terselamatkan|rentang}} terselamatkan (perkiraan penulis) | tidak berubah: evakuasi tidak mengurangi rumah rusak |
| Radius pengungsian | tercatat 2010 | radius 2010 pada penduduk 2026 | tidak dihitung | pengungsi {{angka:dibi.merapi2010.mengungsi}} ke {{angka:geologi.merapi2010.pengungsi_radius20}} |
:::

::: respons
- Evakuasi bertahap mengikuti status gunung api dari PVMBG.
- Pengungsian untuk penduduk KRB III Merapi dan Agung.
- Logistik pengungsian untuk masa erupsi yang dapat berlangsung berminggu-minggu, seperti Oktober sampai Desember 2010.
:::

::: pemulihan
- Penilaian kerusakan dan kerugian erupsi disimpan sebagai seri R3P (@rek:r-m17).
- Relokasi permukiman di zona KRB III mengikuti zona PVMBG terbaru.
- Pemulihan penghidupan pengungsi yang lahannya tertimbun material erupsi.
:::
::::

## Gempa, Tsunami, dan Likuefaksi Majemuk {#sub:majemuk}

**Gempa majemuk Sulawesi Tengah 2018, yang memicu tsunami dan likuefaksi, tercatat {{angka:dibi.sulteng2018.meninggal}} meninggal, {{angka:dibi.sulteng2018.hilang}} hilang, {{angka:dibi.sulteng2018.mengungsi}} pengungsi, dan {{angka:dibi.sulteng2018.rumah_rusak}} rumah rusak di DIBI untuk empat kab/kota.** BNPB mencatat kerusakan dan kerugian sementara per 20 Oktober 2018 lebih dari {{angka:bnpb.sulteng2018.kerusakan_kerugian|rupiah}}, termasuk perumahan {{angka:bnpb.sulteng2018.perumahan|rupiah}}, dengan likuefaksi menimbun permukiman Petobo, Jono Oge, dan Sibalaya [@bnpb-2026-dibi; @bnpb-2018-kerugian-sulteng]. USGS mencatat sedikitnya {{angka:usgs.sulteng2018.meninggal}} meninggal dan {{angka:usgs.sulteng2018.hilang}} hilang [@usgs-us1000h3p4]. Sebab angka DIBI hampir dua kali USGS tidak dapat dibuktikan dari data publik, sehingga keduanya ditulis berdampingan dan DIBI menjadi angka utama.

**KRB 2022–2026 mencatat {{angka:renas.krb.terpapar_likuefaksi}} jiwa terpapar likuefaksi dengan potensi kerugian {{angka:renas.krb.kerugian_likuefaksi_rp|rupiah}}, tetapi DIBI tidak memisahkan korban likuefaksi dari korban gempa dan tsunami Sulawesi Tengah.** Kelas bahaya tinggi likuefaksi memuat {{angka:krb.likuefaksi.sekolah_kelas_tinggi}} sekolah secara nasional [@bnpb-2025-renas, hlm. 24–25; @bnpb-2026-krb-geologi]. Kartu majemuk karena itu menulis korban gabungan. Penilaian kerusakan dan kerugian akhir atau R3P final Sulawesi Tengah tidak ditemukan, sehingga angka kerugian di kartu adalah angka sementara resmi.

**Stimulan rumah BNPB menutup sebagian kecil kerugian kejadian: kerusakan dan kerugian Sulawesi Tengah {{angka:geologi.pembanding.sulteng_total_rasio|fmt=2}} kali stimulan rumah, dan Cianjur {{angka:geologi.pembanding.cianjur_total_rasio|fmt=2}} kali bila jumlah rumah diambil dari DIBI.** Bila jumlah rumah Cianjur diambil dari R3P, stimulan mendekati nilai kerusakan perumahan R3P dengan rasio {{angka:r3p.cianjur2022.rasio_perumahan_stimulan|fmt=2}} (@tbl:pembanding-kerugian). Pembanding ini menguatkan aturan kajian bahwa stimulan rumah hanya batas bawah kerugian perumahan. Rasio itu tidak dikalikan ke skenario, karena hanya bersandar pada tiga kejadian dengan instrumen penilaian yang berbeda [@cianjur-2022-r3p; @bnpb-2018-kerugian-sulteng; @kemenkopmk-2024-rehabrekon-lombok].

::: tabel {#tbl:pembanding-kerugian}
judul: Angka kerugian resmi kejadian gempa dibanding stimulan rumah BNPB, 2006–2022 (rupiah)
sumber: R3P Cianjur [@cianjur-2022-r3p]; BNPB 22 Oktober 2018 [@bnpb-2018-kerugian-sulteng]; Kemenko PMK 20 Mei 2024 [@kemenkopmk-2024-rehabrekon-lombok]; @bappenas-2006-dala-yogya; pengolahan stimulan dari DIBI BNPB [@pantaubencana-2026-skenario-geologi]
keyakinan: campuran
angka: 2; 3; 4
data_per: 24 Okt 2026
catatan: Stimulan adalah rumah rusak berat, sedang, dan ringan dikali nilai stimulan per unit skema BNPB terbaru; stimulan dan rasio hitungan kajian ini (asumsi kebijakan). Angka Lombok berupa kebutuhan R3P, bukan kerusakan dan kerugian. Sel "–" karena rumah tercatat Yogyakarta 2006 tidak ada di DIBI dan penilaian kerugian Merapi 2010 tidak ditemukan.

| KEJADIAN | ANGKA KERUGIAN RESMI | STIMULAN RUMAH | RASIO | KEYAKINAN |
| --- | ---: | ---: | ---: | --- |
| Cianjur 2022, perumahan (rumah R3P) | {{angka:r3p.cianjur2022.perumahan|rupiah}} | {{angka:stimulan.cianjur2022.rumah_r3p|rupiah}} | {{angka:r3p.cianjur2022.rasio_perumahan_stimulan|fmt=2}} | resmi |
| Cianjur 2022, total (rumah DIBI) | {{angka:r3p.cianjur2022.kerusakan_kerugian|rupiah}} | {{angka:stimulan.cianjur2022.rumah_dibi|rupiah}} | {{angka:geologi.pembanding.cianjur_total_rasio|fmt=2}} | resmi |
| Sulawesi Tengah 2018, perumahan (sementara) | {{angka:bnpb.sulteng2018.perumahan|rupiah}} | {{angka:stimulan.sulteng2018.rumah_dibi|rupiah}} | {{angka:geologi.pembanding.sulteng_perumahan_rasio|fmt=2}} | resmi |
| Sulawesi Tengah 2018, total (sementara) | {{angka:bnpb.sulteng2018.kerusakan_kerugian|rupiah}} | {{angka:stimulan.sulteng2018.rumah_dibi|rupiah}} | {{angka:geologi.pembanding.sulteng_total_rasio|fmt=2}} | resmi |
| Lombok 2018, kebutuhan R3P | {{angka:kemenkopmk.lombok2018.kebutuhan_r3p|rupiah}} | {{angka:stimulan.lombok2018.rumah_dibi|rupiah}} | {{angka:geologi.pembanding.lombok_rasio|fmt=2}} | resmi |
| Yogyakarta 2006, total (penilaian awal) | {{angka:bappenas.yogya2006.kerusakan_kerugian|rupiah}} | – | – | resmi |
| Merapi 2010 | – | {{angka:stimulan.merapi2010.rumah_dibi|rupiah}} | – | resmi |
:::

:::: skenario {#tbl:kartu-majemuk}
jenis: likuefaksi
judul: Gempa, tsunami, dan likuefaksi majemuk setara Sulawesi Tengah 2018
dasar: Kartu analog; kejadian majemuk tercatat terbesar sejak DIBI dimulai, dipadukan dengan paparan resmi KRB likuefaksi; korban likuefaksi tidak terpisah dari korban gempa dan tsunami.
kemungkinan: periode ulang tidak dinilai: kejadian majemuk tidak punya model peluang di bahan kajian
peta: gambar/mitigasi/bab06-kartu-majemuk.png
lembaga: Deputi Bidang Penanganan Darurat; BMKG; Kementerian Energi dan Sumber Daya Mineral; Kementerian Pekerjaan Umum; BPBD Sulawesi Tengah
sumber: DIBI BNPB [@bnpb-2026-dibi]; BNPB 22 Oktober 2018 [@bnpb-2018-kerugian-sulteng]; USGS [@usgs-us1000h3p4]; @widiyanto-2019-palu; KRB 2022–2026 [@bnpb-2025-renas]
kaki: Kejadian analog tercatat; kerusakan dan kerugian adalah angka sementara resmi per 20 Oktober 2018.
data_per: 24 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Kependudukan, korban jiwa tercatat DIBI | {{angka:dibi.sulteng2018.meninggal}} | – | resmi | DIBI BNPB, ditambah {{angka:dibi.sulteng2018.hilang}} hilang |
| Kependudukan, korban jiwa menurut USGS | {{angka:usgs.sulteng2018.meninggal}} | – | terverifikasi | USGS, ditambah {{angka:usgs.sulteng2018.hilang}} hilang |
| Kependudukan, pengungsi tercatat | {{angka:dibi.sulteng2018.mengungsi}} | – | resmi | DIBI BNPB |
| Kependudukan, jiwa terpapar likuefaksi (nasional) | {{angka:renas.krb.terpapar_likuefaksi|ringkas}} | – | resmi | KRB 2022–2026 |
| Lingkungan, *run-up* tsunami terukur tertinggi (m) | {{angka:widiyanto.palu2018.runup_maks|fmt=2}} | – | terverifikasi | Widiyanto dkk. (2019), Tondo |
| Ekonomi, kerusakan dan kerugian sementara | {{angka:bnpb.sulteng2018.kerusakan_kerugian|rupiah}} | – | resmi | BNPB, per 20 Oktober 2018 |
| Infrastruktur/fisik, rumah rusak | {{angka:dibi.sulteng2018.rumah_rusak}} | – | resmi | DIBI BNPB |
| Layanan sipil, sekolah di kelas bahaya tinggi likuefaksi (nasional) | {{angka:krb.likuefaksi.sekolah_kelas_tinggi}} | – | resmi | InaRISK KRB |
| Kebutuhan respons, pengungsi dari rumah rusak | {{angka:geologi.pengungsi_rumah.sulteng}} | – | asumsi-kebijakan | aturan rumah rusak berat dan sedang × {{angka:geologi.asumsi.jiwa_per_rumah|fmt=1}}; tercatat {{angka:dibi.sulteng2018.mengungsi}} |
:::

::: kebijakan
Kerusakan dan kerugian sementara Sulawesi Tengah {{angka:geologi.pembanding.sulteng_total_rasio|fmt=2}} kali stimulan rumah, sehingga stimulan tidak dipakai sebagai kerugian materiil penuh kejadian majemuk.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Sumber angka korban | DIBI | USGS | {{angka:dibi.sulteng2018.meninggal}} ke {{angka:usgs.sulteng2018.meninggal}} | tidak berubah |
| Ukuran kerugian | kerusakan dan kerugian sementara | stimulan rumah | tidak berubah | {{angka:bnpb.sulteng2018.kerusakan_kerugian|rupiah}} ke {{angka:stimulan.sulteng2018.rumah_dibi|rupiah}} |
:::

::: respons
- Evakuasi mandiri saat guncangan kuat, karena tsunami tiba dalam hitungan menit.
- Pencarian dan pertolongan di permukiman yang tertimbun likuefaksi.
- Pengungsian dihitung dari rumah rusak yang terdata.
:::

::: pemulihan
- Penataan ulang permukiman di zona likuefaksi.
- Penilaian kerusakan dan kerugian akhir dibuka sebagai seri R3P (@rek:r-m17).
- Pemulihan layanan pesisir Teluk Palu.
:::
::::

## Kesenjangan Spesifik dan Implikasi {#sub:kesenjangan}

### Tuas Penekan Korban {#sub:tuas}

**Data yang ada menunjuk dua tuas menurut jenis bahaya: pada model platform korban guncangan Mw {{angka:pusgen.jawa.mmaks}} turun ke {{angka:geologi.kepekaan.bangunan_penuh.jawa_mmaks}} kali bila kepatuhan bangunan penuh, dan kematian tsunami Nankai {{angka:nankai.faktor_70|fmt=3}} kali bila evakuasi segera {{angka:nankai.evakuasi_tinggi_persen|persen}} lawan {{angka:nankai.evakuasi_rendah_persen|persen}}.** Angka bangunan berasal dari mesin platform yang belum diuji balik. Angka evakuasi adalah rasio dari estimasi model Cabinet Office Jepang 2025; di delapan kombinasi kasusnya rasio itu berkisar {{angka:nankai.faktor_rentang_kasus|rentang|fmt=3}}, sehingga {{angka:nankai.faktor_70|fmt=3}} adalah nilai yang paling hati-hati [@cao-japan-2025-nankai]. Paket skenario juga mencantumkan pengali untuk evakuasi separuh warga, tetapi pengali itu tidak ada di dokumen Cabinet Office dan tidak dipakai. Dua tuas itu tidak diperingkat dengan satu angka nasional: paparan guncangan Jawa jauh lebih besar daripada proksi pesisir rendah, tetapi kematian per jiwa terpapar tsunami pada Mentawai 2010 sekitar dua orde lebih tinggi daripada guncangan.

::: gambar {#gbr:tuas-geologi}
berkas: gambar/mitigasi/bab06-tuas-evakuasi-bangunan.png
jenis: grafik
judul: Faktor kematian tsunami menurut porsi evakuasi segera dan faktor korban guncangan menurut kepatuhan bangunan, empat skenario megathrust (kali dasar)
sumber: Cabinet Office Jepang 2025 [@cao-japan-2025-nankai]; simulasi skenario Pantau Bencana, belum divalidasi [@pantaubencana-2026-skenario-geologi]
keyakinan: estimasi-model; belum diuji balik
lebar: penuh
data_per: 24 Okt 2026
catatan: Faktor evakuasi berpil asumsi kebijakan dan diterapkan pada paparan, bukan pada korban tsunami; faktor bangunan berpil estimasi model.
:::

**Bukti dampak tuas itu di Indonesia belum ada: dari delapan program terkait geologi di kompendium kajian ini, tidak satu pun berbukti kuat, dan keterpenuhan peringatan dini menurut Renstra baru {{angka:renstra.peringatan_dini.keterpenuhan_persen|persen}}.** InaTEWS terukur di hulu, yaitu kecepatan terbit peringatan, tetapi dampaknya terhadap korban belum dievaluasi, dan satu-satunya kejadian dekat sumber yang diperiksa, Palu 2018, menunjukkan rantai hilirnya gagal [@pantaubencana-2026-program-terbukti; @harnantyari-2020-palu]. Desa dan Kelurahan Tangguh Bencana (Destana) dan Satuan Pendidikan Aman Bencana (SPAB) belum terbukti, artinya bukti dampaknya tidak ditemukan. Rekompak, Badan Rehabilitasi dan Rekonstruksi (BRR) Aceh dan Nias, dan rehabilitasi rumah Lombok 2018 berbukti lemah karena dinilai dari laporan pelaksana sendiri. Bukti luar negeri berkekuatan sedang hanya dipakai lewat padanannya di Indonesia: kode bangunan Chile mencatat kegagalan {{angka:bukti.p22.gagal_3lantai_persen|fmt=1|persen}} pada {{angka:bukti.p22.bangunan_3lantai}} bangunan tiga lantai atau lebih pada gempa Maule 2010, dengan padanan pengawasan standar bangunan Renas PB 2.3.4.a.

::: tabel {#tbl:program-geologi}
judul: Posisi bukti delapan program terkait bencana geologi dalam kompendium program kajian ini
sumber: Kompendium program kajian ini [@pantaubencana-2026-program-terbukti]
keyakinan: campuran
catatan: Belum terbukti berarti bukti dampak tidak ditemukan, bukan program tidak bermanfaat; program luar negeri hanya dipakai lewat padanannya di Indonesia.

| PROGRAM | KEKUATAN BUKTI | POSISI | CATATAN | KEYAKINAN |
| --- | --- | --- | --- | --- |
| Destana | belum terbukti | program berjalan, wajib evaluasi dampak | indikator berupa cakupan desa dibina | resmi |
| SPAB | belum terbukti | program berjalan, wajib evaluasi dampak | indikator berupa jumlah peserta dibina | resmi |
| InaTEWS | hulu terukur, dampak terhadap korban belum dievaluasi | program berjalan, wajib evaluasi dampak | peringatan resmi tidak sampai sebelum tsunami Palu 2018 | terverifikasi |
| Rekompak Yogyakarta dan Jawa Tengah 2006 | lemah | rujukan tata kelola | laporan pelaksana dan donor sendiri | terverifikasi |
| BRR Aceh dan Nias | lemah | rujukan tata kelola | angka keluaran laporan sendiri | resmi |
| Rehabilitasi dan rekonstruksi rumah Lombok 2018 | lemah | pelajaran, bukan teladan | mutu rumah terhadap guncangan belum diuji | resmi |
| Pendidikan kebencanaan Kamaishi, Jepang | sedang | program dengan syarat | padanan di Indonesia: SPAB | terverifikasi |
| Kode bangunan Chile NCh433 | sedang | program dengan syarat | padanan di Indonesia: Renas PB 2.3.4.a | terverifikasi |
:::

**Untuk tsunami dekat sumber, model platform memberi {{angka:geologi.jawa_mmaks.pantai_30mnt|rentang|satuan}} pantai selatan Jawa yang dicapai tsunami kurang dari {{angka:geologi.ambang.tiba_menit}} menit pada Mw {{angka:pusgen.jawa.mmaks}}, dan tsunami Palu 2018 tiba {{angka:widiyanto.palu2018.waktu_tiba|rentang|satuan}} setelah guncangan.** Pada waktu tiba sependek itu, cakupan peringatan dini dalam Renas PB dan Renstra BNPB tidak cukup sebagai tuas tunggal. Syarat yang tercatat dari Palu adalah sensor muka laut di dalam teluk yang tetap mengirim data, pesan yang sampai ke rumah tangga, dan warga yang mengungsi mandiri saat guncangan kuat [@widiyanto-2019-palu; @harnantyari-2020-palu]. Rasio korban tetap {{angka:renkon.jatim2021.rasio_meninggal|persen}} dalam contoh renkon Jawa Timur dan rasio {{angka:geologi.mentawai2010.rasio_tsunami|fmt=1|persen}} dari Mentawai 2010 tidak dipakai untuk menghitung korban tsunami skenario. Rasio pertama asumsi tetap yang dasarnya tidak terbaca, sedangkan rasio kedua berasal dari satu kejadian di pulau kecil dengan tiba sangat cepat.

### Kesenjangan Data {#sub:kesenjangan-data}

**Delapan kesenjangan data menahan kuantifikasi skenario geologi, dan yang paling menentukan adalah genangan tsunami resmi yang belum dipakai, sehingga korban tsunami skenario di kedua kartu megathrust tidak dikuantifikasi.** Kesenjangan lain berupa skenario korban resmi pusat yang tidak ada, mesin korban gempa yang meleset {{angka:geologi.mesin.faktor_loo|fmt=1}} kali pada uji silang, dan evaluasi dampak program yang tidak ditemukan (@tbl:kesenjangan-geologi). Tiap kesenjangan ditulis sebagai kebutuhan data dengan pemegang datanya, dan strateginya diuraikan di Bab 11 dan Bab 13 [@pantaubencana-2026-skenario-geologi; @bnpb-2023-renkon].

::: tabel {#tbl:kesenjangan-geologi}
judul: Kesenjangan data bencana geologi, kebutuhan datanya, dan pemegang data
sumber: Analisis kajian ini
keyakinan: asumsi-kebijakan

| KESENJANGAN | KEBUTUHAN DATA | PEMEGANG DATA |
| --- | --- | --- |
| Skenario korban resmi pusat tidak ada; renkon megathrust Jawa Timur 2021 hanya terbaca sebagai contoh di Perban BNPB 2/2023 | dokumen renkon megathrust provinsi | BPBD provinsi; Direktorat Kesiapsiagaan |
| Genangan tsunami InaRISK belum dipakai; proksi luput di pantai selatan Jawa Barat | penduduk dalam genangan per skenario per kab/kota | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| IRBI 2025 tsunami tanpa kab/kota Jawa di kelas teratas | catatan metode IRBI 2025 | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| Periode ulang segmen Sumba dan sesar naik busur belakang Flores tidak tersedia; geometri segmen resmi belum dipakai | periode ulang dan geometri segmen | PuSGeN; Kementerian Pekerjaan Umum |
| Penilaian akhir Merapi 2010, Sulawesi Tengah 2018, dan Lombok 2018 tidak ditemukan | seri kerusakan dan kerugian R3P | Deputi Bidang Rehabilitasi dan Rekonstruksi |
| Mesin korban gempa meleset pada Yogyakarta 2006; persamaan guncangan belum diuji | arsip intensitas dirasakan | BMKG |
| Data bangunan, sekolah, dan fasilitas kesehatan per kab/kota di zona skenario tidak ada | inventaris bangunan dan aset per kab/kota | Kementerian Pekerjaan Umum; Pusat Data, Informasi, dan Komunikasi Kebencanaan |
| Evaluasi dampak program geologi di Indonesia tidak ditemukan | evaluasi dampak berpembanding | pemimpin program menurut Renas PB |
:::

:::: matriks-rekomendasi {#tbl:rekomendasi-geologi}
judul: Rekomendasi internal BNPB untuk data skenario bencana geologi
kelompok: internal
sumber: Analisis kajian ini; Perban BNPB 2/2023; register rekomendasi bersama

::: rek {#rek:r-m05}
langkah: Masukkan skenario megathrust ke renkon pesisir
jenis: data
status: dikembangkan
program: Rencana kontingensi tsunami menurut Perban BNPB 2/2023
unit: Direktorat Kesiapsiagaan; Direktorat Pemetaan dan Evaluasi Risiko Bencana
kl: BMKG; Kementerian Energi dan Sumber Daya Mineral
waktu: 2026-2027
indikator: renkon tsunami provinsi pesisir selatan Jawa dan barat Sumatra memuat Mw {{angka:pusgen.jawa.mmaks}} dan Mw {{angka:pusgen.mentawai.mmaks}} dengan lantai tercatat dan korban dari genangan resmi
dasar: Perban BNPB 2/2023 [@bnpb-2023-renkon]; @sub:tsunami

Proyeksi korban resmi yang terbaca hanya contoh renkon Jawa Timur 2021 dengan rasio tetap.
:::

::: rek {#rek:r-m17}
langkah: Tarik data kerusakan R3P dan samakan instrumen
jenis: data
status: dikembangkan
program: Pengkajian kebutuhan pascabencana dan R3P BNPB
unit: Deputi Bidang Rehabilitasi dan Rekonstruksi; Pusat Data, Informasi, dan Komunikasi Kebencanaan
kl: Kementerian Dalam Negeri; Kementerian Perumahan dan Kawasan Permukiman
waktu: 2026-2027
indikator: seri kerusakan dan kerugian R3P 2015–2024 terbuka dan instrumen penilaian kerusakan rumah satu untuk DIBI dan R3P
dasar: @sub:sesar-darat; @sub:majemuk

Rumah rusak Cianjur 2022 berbeda dua kali antara DIBI dan R3P, dan R3P final Sulteng tidak ditemukan.
:::
::::

:::: matriks-rekomendasi {#tbl:rekomendasi-geologi-lintas}
judul: Rekomendasi lintas K/L untuk evaluasi dampak program bencana geologi
kelompok: lintas
sumber: Analisis kajian ini; kompendium program kajian ini

::: rek {#rek:r-m19}
langkah: Jalankan agenda evaluasi dampak program berjalan
jenis: data
status: dikembangkan
program: Destana, SPAB, dan InaTEWS
unit: Direktorat Mitigasi Bencana
kl: BMKG; Kementerian Pendidikan Dasar dan Menengah; Kementerian Desa dan Pembangunan Daerah Tertinggal
waktu: 2028-2030
indikator: laporan evaluasi dampak InaTEWS hilir (waktu tiba dan penerimaan warga), SPAB, dan Destana terbit dengan desa dan sekolah pembanding
dasar: kompendium program [@pantaubencana-2026-program-terbukti]; @sub:tuas

Tidak satu pun program Indonesia untuk bencana geologi punya evaluasi dampak berpembanding.
:::
::::
