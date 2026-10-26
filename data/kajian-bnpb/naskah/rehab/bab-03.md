---
kajian: rehab
bab: 3
judul: Metodologi dan Data
pertanyaan: Apa yang dapat dan tidak dapat dibaca dari DIBI untuk rumah, jembatan, dan air? Bagaimana lantai skenario, empat besaran rehabilitasi dan rekonstruksi, dan daftar perhatian kab/kota didefinisikan? Angka mana yang berbeda versi, dan bagaimana versi itu ditulis?
status: final
target_halaman: 8
---

# Metodologi dan Data {#bab:rr-metodologi}

::: ringkasan-bab
**Temuan:**

- Tabel publik Data dan Informasi Bencana Indonesia (DIBI) memuat {{angka:rehab.dibi.kolom_dampak_n}} kolom dampak tanpa kolom air minum, jalan, status jalan, maupun hari pulih, sedangkan kolom jembatan rusaknya bernilai nol untuk semua tahun 2008–2017. Per kejadian gempa, DIBI mencatat {{angka:rehab.dibi.jembatan_rusak.lombok2018}} jembatan rusak untuk Lombok 2018 dan {{angka:rehab.dibi.jembatan_rusak.sulteng2018}} untuk Sulawesi Tengah 2018, sehingga angka jembatan DIBI adalah batas bawah, bukan inventaris.
- Dari empat besaran rehabilitasi dan rekonstruksi (RR), hanya rumah rusak yang terukur untuk semua jenis bencana. Lantai skenario gempa adalah {{angka:bappenas.yogya2006.rumah_hancur}} rumah hancur di Yogyakarta 2006, berdampingan dengan {{angka:dibi.padang2009.rumah_rb}} rumah rusak berat di Padang 2009 sebagai lantai DIBI. Daftar perhatian kab/kota baru dapat dihitung dari dua syarat (bahaya dan kerusakan rumah) dari empat yang ditetapkan, dan jumlahnya berubah dari {{angka:rehab.perhatian.sementara.n}} ke {{angka:rehab.perhatian.sementara.n_dua_kelas}} kab/kota saat ambang dilonggarkan.
- Lima kelompok angka berbeda versi. Hitung ulang DIBI menurunkan porsi banjir dalam jembatan rusak 2018–2025 menjadi {{angka:rehab.dibi.jembatan_rusak.porsi_banjir_persen|fmt=1|persen}}, dan dokumen sektor mencatat kerusakan lebih besar daripada DIBI: Rencana Rehabilitasi dan Rekonstruksi Pascabencana (R3P) Cianjur memuat {{angka:rehab.rekon.cianjur2022.rumah_rusak_r3p}} rumah rusak, lawan {{angka:dibi.cianjur2022.rumah_rusak}} di DIBI.

**Angka kunci:**

- {{angka:rehab.dibi.jembatan_rusak.2018_2025}} jembatan rusak akibat bencana alam pada 2018–2025, {{angka:rehab.dibi.jembatan_rusak.2025}} di antaranya pada 2025 [@bnpb-dibi].
- {{angka:rehab.rekon.sumatra2025.jembatan_daerah_pu}} jembatan daerah terdampak banjir Sumatra 2025 per 7 Mei 2026, lawan {{angka:rehab.dibi.jembatan_rusak.sumatra2025_jendela}} jembatan rusak di DIBI untuk kejadian yang sama [@pu-2026-infrastruktur-sumatra-mei; @bnpb-dibi].
- {{angka:rehab.rekon.sumatra2025.spam_fungsi_persen_mei|fmt=1|persen}} dari {{angka:rehab.rekon.sumatra2025.spam_terdampak_mei}} Sistem Penyediaan Air Minum (SPAM) terdampak di Sumatra berfungsi per 7 Mei 2026, diukur dalam unit, bukan jiwa terlayani [@pu-2026-infrastruktur-sumatra-mei].

**Rekomendasi:**

- @rek:r-rr-01 Tambah kolom air dan jembatan di DIBI (Sudah ada, perlu dikembangkan; Pusat Data, Informasi, dan Komunikasi Kebencanaan; Kementerian Pekerjaan Umum, BPBD; 100 hari).
- @rek:r-rr-02 Tetapkan garis dasar waktu pulih air dan akses (Usulan baru; Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur; Kementerian Pekerjaan Umum; 2026–2027).
- @rek:r-rr-09 Ukur pemulihan air dalam jiwa terlayani (Usulan baru; Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur; Kementerian Pekerjaan Umum; 2026–2027).
:::

## Data, Produsen, dan Label Keyakinan {#sub:rr-data-label}

**Dari sembilan kelompok sumber pada @tbl:rr-sumber, hanya dua yang berupa data keluaran unit kerja Badan Nasional Penanggulangan Bencana (BNPB), yaitu Data dan Informasi Bencana Indonesia (DIBI) dan Indeks Risiko Bencana Indonesia (IRBI) 2025.** Peraturan Badan (Perban) BNPB 1/2023 menetapkan Satu Data Bencana sebagai tata kelola data yang akurat, mutakhir, terpadu, dan dapat dibagipakaikan [@bnpb-2023-satudata, hlm. 2]. DIBI ditarik dari dasbor publik Pusat Data, Informasi, dan Komunikasi Kebencanaan (Pusdatinkom) pada 23 Oktober 2026 [@bnpb-dibi], dan IRBI dari InaRISK [@bnpb-irbi]. Angka air dan akses per kejadian berasal dari penerbit lain, terutama Kementerian Pekerjaan Umum dan Rencana Rehabilitasi dan Rekonstruksi Pascabencana (R3P) kabupaten. Saringan bawaan DIBI di seluruh kajian ini memakai klasifikasi alam dan cakupan bencana, dengan tahun final sampai 2025; baris 2026 masih sementara dan tidak masuk jumlah periode.

**Tiap angka membawa satu dari empat label keyakinan: resmi, terverifikasi, estimasi model, atau asumsi kebijakan.** Angka yang dibaca dari kutipan pihak lain, termasuk berita media yang mengutip BNPB atau kementerian, hanya masuk Lampiran D dan tidak dipakai di badan teks sampai rilis lembaga asalnya dibuka. Hitungan penyusun atas data resmi, seperti porsi banjir sebesar {{angka:rehab.dibi.jembatan_rusak.porsi_banjir_persen|fmt=1|persen}}, diberi tambahan label "analisis penyusun" supaya pembaca membedakannya dari angka yang diterbitkan lembaga. Catatan atas @tbl:rr-sumber. Teks Juklak BNPB 7/2023 dibaca dari salinan di luar Jaringan Dokumentasi dan Informasi Hukum (JDIH) BNPB; label resmi berlaku dengan catatan salinan sampai PDF JDIH diperoleh.

::: tabel {#tbl:rr-sumber}
judul: Sumber data, penerbit, cakupan, dan label keyakinan kajian rehabilitasi dan rekonstruksi air dan akses, 1996–2026
sumber: Analisis kajian ini atas DIBI BNPB, InaRISK BNPB, Juklak BNPB 7/2023, R3P Kabupaten Cianjur 2022, Kementerian Pekerjaan Umum, Bappenas 2006, BRR 2009, dan Perban BNPB 1/2023
keyakinan: campuran
data_per: 25 Okt 2026

| DATA | PENERBIT | CAKUPAN | KEYAKINAN | CATATAN PAKAI |
| --- | --- | --- | --- | --- |
| DIBI | BNPB, Pusdatinkom | rumah 2008–2025, jembatan 2018–2025, tahun, jenis, provinsi | resmi | nol dibaca "tidak tercatat"; 2026 sementara |
| IRBI 2025 | BNPB, InaRISK | kab/kota, per bahaya | resmi | kelas per bahaya adalah kuintil turunan penyusun |
| Petunjuk Pelaksanaan (Juklak) BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana | BNPB | formulir dan petunjuk isian | resmi | menunjukkan isian yang diminta tetapi tidak tampil di DIBI |
| R3P Gempa Bumi Kabupaten Cianjur 2022 | Pemerintah Kabupaten Cianjur | satu kejadian | resmi | kerusakan air dan jembatan dalam rupiah, bukan unit |
| Rilis pemulihan Sumatra, 5 Februari dan 11 Mei 2026 | Kementerian Pekerjaan Umum | tiga provinsi | resmi | SPAM, jembatan, dan jalan dalam unit berfungsi |
| Rilis jembatan nasional Aceh, 3 Desember 2025 | Direktorat Jenderal Bina Marga, Balai Pelaksanaan Jalan Nasional (BPJN) Aceh | jalan nasional Aceh | resmi | jembatan roboh atau terputus |
| Penilaian kerusakan Yogyakarta 2006 | Bappenas | satu kejadian | resmi | penilaian awal; dua versi dalam dokumen yang sama |
| Laporan BRR NAD dan Nias 2009 | BRR | Aceh dan Nias 2004 | resmi | Aceh dan Nias tidak terpilah |
| Berita yang mengutip BNPB dan Kementerian Perumahan dan Kawasan Permukiman (PKP) | media | Sumatra 2025 | terverifikasi | hanya Lampiran D sampai rilis lembaga asal dibuka |
:::

## DIBI untuk Beban Rehabilitasi dan Rekonstruksi {#sub:rr-dibi}

### Kolom, Patahan, dan Isian yang Tidak Tampil

**Tabel publik DIBI memuat {{angka:rehab.dibi.kolom_dampak_n}} kolom dampak, dan tidak satu pun mencatat air minum, Sistem Penyediaan Air Minum (SPAM), sumur, jalan, status jalan, atau hari pulih.** Kolom yang ada mencakup korban dan pengungsi, tiga tingkat kerusakan rumah dan rumah terendam, serta jembatan rusak. Kolom lain memuat fasilitas pendidikan dan fasilitas ibadat. Fasilitas kesehatan dan fasilitas umum juga punya kolom, begitu pula kantor [@bnpb-dibi]. Untuk RR, DIBI karena itu dapat dipakai menghitung rumah rusak sejak 2008 dan jembatan rusak sejak 2018 per tahun dan provinsi menurut jenis bencana. Kerusakan sistem air tidak dapat dibaca darinya, begitu pula panjang jalan rusak dan waktu pulih. @tbl:rr-kolom-dibi merangkum kolom yang dipakai beserta patahannya.

::: gambar {#gbr:foto-rr-petobo-2018}
berkas: gambar/foto/rehab-b03-petobo-2018.jpg
jenis: foto
judul: Kerusakan di Petobo, Palu, setelah gempa Sulawesi Tengah, Oktober 2018
pengarang: Devina Andiviaty
lisensi: CC BY-SA 3.0
url: https://commons.wikimedia.org/wiki/File:Petobo_portrait_after_Sulawesi_earthquake_1.jpg
potong: dipotong tengah ke rasio 2:1
lebar: penuh
:::

**Kolom jembatan rusak bernilai nol untuk semua tahun 2008–2017, lalu mencatat {{angka:rehab.dibi.jembatan_rusak.2018_2025}} jembatan pada 2018–2025.** Tahun 2025 sendiri menyumbang {{angka:rehab.dibi.jembatan_rusak.2025}} jembatan atau {{angka:rehab.dibi.jembatan_rusak.porsi_2025_persen|fmt=1|persen}} dari jumlah periode, dan banjir menyumbang {{angka:rehab.dibi.jembatan_rusak.banjir_2018_2025}} jembatan. Tanah longsor tercatat {{angka:rehab.dibi.jembatan_rusak.longsor_2018_2025}} jembatan, gempa bumi {{angka:rehab.dibi.jembatan_rusak.gempa_2018_2025}}, erupsi {{angka:rehab.dibi.jembatan_rusak.erupsi_2018_2025}}, cuaca ekstrem {{angka:rehab.dibi.jembatan_rusak.cuaca_ekstrem_2018_2025}}, dan gelombang pasang {{angka:rehab.dibi.jembatan_rusak.gelombang_2018_2025}} [@bnpb-dibi]. Pada cakupan semua laporan jumlahnya {{angka:rehab.dibi.jembatan_rusak.semua_laporan_2018_2025}}, karena sejak patahan seri 2024 sebagian laporan tidak lagi ditandai bencana. Baris 2026 sampai 23 Oktober sudah mencatat {{angka:rehab.dibi.jembatan_rusak.2026_sementara}} jembatan, tetapi masih sementara.

**Kolom rumah rusak sedang bernilai nol pada 2008–2009, dan kolom fasilitas umum rusak bernilai nol pada 2008–2009 serta 2017.** Tahun 2016 dan 2018 di kolom yang sama berisi, sehingga nol pada 2017 menunjukkan kolom kosong yang diisi nol, bukan tahun tanpa kerusakan (analisis penyusun). Pada 2015–2025 DIBI mencatat {{angka:rehab.dibi.rumah_rb.2015_2025}} rumah rusak berat, {{angka:rehab.dibi.rumah_rs.2015_2025}} rusak sedang, dan {{angka:rehab.dibi.rumah_rr.2015_2025}} rusak ringan, serta {{angka:rehab.dibi.fasum_rusak.2015_2025}} fasilitas umum rusak tanpa pemisahan SPAM [@bnpb-dibi]. Seluruh nol DIBI di kajian ini dibaca "tidak tercatat" kecuali ada bukti lain. Jumlah per kab/kota juga dapat menghitung satu orang di lebih dari satu laporan, karena korban meninggal memakai nominal terakhir dan pengungsi nominal terbesar [@bnpb-2023-standar-data, hlm. 21–22].

::: tabel {#tbl:rr-kolom-dibi}
judul: Kolom DIBI yang dipakai kajian rehabilitasi dan rekonstruksi, patahan seri, dan isian Juklak BNPB 7/2023 yang tidak tampil, 2008–2025
sumber: DIBI BNPB, dasbor publik, ditarik 23 Oktober 2026; Juklak BNPB 7/2023 hlm. 8, 12, 23–24, 29, 38
keyakinan: resmi
data_per: 25 Okt 2026

| KELOMPOK | KOLOM | PATAHAN ATAU STATUS | AKIBAT BAGI KAJIAN |
| --- | --- | --- | --- |
| Tampil di DIBI | rumah rusak berat, sedang, ringan | rusak sedang nol pada 2008–2009 | rumah rusak sedang sebanding sejak 2010 |
| Tampil di DIBI | jembatan rusak | nol pada 2008–2017 | periode acuan jembatan 2018–2025 |
| Tampil di DIBI | fasilitas umum rusak | nol pada 2008–2009 dan 2017; tanpa pemisahan SPAM | tidak dipakai sebagai ukuran air |
| Tampil di DIBI | cakupan bencana dan semua laporan | patahan seri 2024 | tren dibaca pada cakupan bencana |
| Diminta Juklak, tidak tampil | jembatan rusak berat, sedang, ringan; jalan rusak dalam km; jaringan air dalam uraian dan rupiah | ada di formulir | diminta ke Pusdatinkom sebagai data yang mungkin ada |
| Tidak diminta Juklak | status jalan tempat jembatan; satuan fisik air (unit SPAM, sambungan, jiwa); durasi pulih | tidak ada di formulir | diusulkan sebagai isian baru (@rek:r-rr-01) |
:::

**Juklak BNPB 7/2023 mendaftar {{angka:rehab.juklak7.prasarana_vital_n}} jenis prasarana dan sarana vital, termasuk jaringan air bersih atau minum dan jalan serta jembatan.** Formulirnya meminta jalan dalam km dan jembatan menurut tingkat kerusakan, sedangkan jaringan air hanya diisi uraian dan taksiran kerugian dalam juta rupiah; satuan fisik dan jumlah jiwa terdampak tidak diminta [@bnpb-2023-standar-data, hlm. 8, 12, 23]. Status jalan hanya muncul sebagai contoh panjang jalan yang diisi, petunjuk jembatan cukup meminta jumlah unit, dan waktu pulih tidak diminta di bagian mana pun [@bnpb-2023-standar-data, hlm. 23–24, 38]. Menurut analisis kajian ini, celah DIBI terdiri atas dua lapis. Lapis pertama berupa isian Juklak yang tidak diturunkan ke tabel publik, dan lapis kedua berupa isian yang belum diminta sama sekali; hanya lapis kedua yang menuntut perubahan standar data (@rek:r-rr-01). Catatan atas @tbl:rr-kolom-dibi. Kelompok terakhir adalah usulan kajian ini dan menuntut perubahan standar data, bukan penurunan isian yang sudah ada.

### Uji Jembatan per Kejadian

**Pada jendela kejadian yang sama dengan rekap kejadian besar, DIBI mencatat {{angka:rehab.dibi.jembatan_rusak.sumatra2025_jendela}} jembatan rusak untuk banjir Sumatra 2025 dan {{angka:rehab.dibi.jembatan_rusak.lombok2018}} untuk gempa Lombok 2018.** Jembatan rusak Sumatra tersebar di {{angka:rehab.dibi.jembatan_rusak.sumatra2025_kab_n}} kab/kota. Banjir Seroja 2021 tercatat {{angka:rehab.dibi.jembatan_rusak.seroja2021}} jembatan, banjir Jabodetabek 2020 {{angka:rehab.dibi.jembatan_rusak.jabodetabek2020}} (seluruhnya di Kabupaten Bogor), gempa Sulawesi Tengah 2018 {{angka:rehab.dibi.jembatan_rusak.sulteng2018}}, gempa Cianjur 2022 {{angka:rehab.dibi.jembatan_rusak.cianjur2022}}, dan banjir Demak 2024 {{angka:rehab.dibi.jembatan_rusak.demak2024}} [@bnpb-dibi]. Saringan memakai tanggal, kategori, provinsi, dan kab/kota yang disebut rekap; tanpa saringan kab/kota, jembatan di kabupaten lain ikut terhitung. Hitungan ini menghasilkan ulang jumlah rumah rusak berat rekap untuk semua kejadian berjendela, sehingga perbedaannya bukan akibat saringan (@gbr:rr-jembatan-kejadian).

**R3P Cianjur memuat kerusakan jembatan kabupaten {{angka:rehab.rekon.cianjur2022.r3p_jembatan_kab_rp|rupiah}} dan jembatan desa {{angka:rehab.rekon.cianjur2022.r3p_jembatan_desa_rp|rupiah}}, padahal DIBI mencatat {{angka:rehab.dibi.jembatan_rusak.cianjur2022}} jembatan rusak untuk kejadian itu.** R3P mencatat dalam rupiah, bukan unit, sehingga jumlah jembatan rusak di Cianjur tetap tidak diketahui [@cianjur-2022-r3p, hlm. 55–56]. Menurut analisis kajian ini, angka jembatan DIBI per kejadian gempa tidak layak menjadi lantai skenario. Besaran akses di kartu gempa Bab 8 karena itu ditulis "tidak terukur di DIBI" dengan R3P atau dokumen pemilik aset sebagai sumber. Catatan atas @gbr:rr-jembatan-kejadian. Lombok 2018 dan Demak 2024 bernilai nol dan berlabel "tidak tercatat". Batang pembanding Sumatra memuat jembatan daerah terdampak saja.

::: gambar {#gbr:rr-jembatan-kejadian}
berkas: gambar/rehab/bab03-jembatan-per-kejadian.png
jenis: grafik
judul: Jembatan rusak tercatat DIBI per kejadian besar 2018–2025, dengan pembanding Kementerian Pekerjaan Umum untuk Sumatra 2025
sumber: Pengolahan data DIBI BNPB per kejadian, ditarik 23 Oktober 2026; Kementerian Pekerjaan Umum, data 7 Mei 2026
keyakinan: resmi
lebar: penuh
data_per: 25 Okt 2026
:::

## Data Air dan Akses di Luar DIBI {#sub:rr-luar-dibi}

**Angka air per kejadian berasal dari Kementerian Pekerjaan Umum: {{angka:rehab.rekon.sumatra2025.spam_berfungsi_feb}} dari {{angka:rehab.rekon.sumatra2025.spam_terdampak_feb}} SPAM terdampak di Sumatra berfungsi per 2 Februari 2026.** Per 7 Mei 2026 jumlah SPAM terdampak menjadi {{angka:rehab.rekon.sumatra2025.spam_terdampak_mei}}, dan {{angka:rehab.rekon.sumatra2025.spam_fungsi_persen_mei|fmt=1|persen}} di antaranya fungsional [@pu-2026-spam-sumatra-feb; @pu-2026-infrastruktur-sumatra-mei]. Kementerian Pekerjaan Umum juga membangun {{angka:rehab.rekon.sumatra2025.sumur_bor_pu_feb}} sumur bor per 2 Februari 2026. Angka SPAM itu mengukur unit berfungsi, bukan jiwa yang kembali menerima air perpipaan, sehingga persentase fungsional tidak ditulis sebagai persentase warga berair. Kajian ini mengusulkan ukuran jiwa terlayani dan liter per orang per hari (@rek:r-rr-09).

**R3P Cianjur mencatat kerusakan subsektor air bersih dan sanitasi sebesar {{angka:rehab.rekon.cianjur2022.r3p_air_sanitasi_kerusakan_rp|rupiah}}; jumlah sambungan atau jiwa terdampak tidak dirinci.** Kerusakan itu meliputi sambungan rumah dan pipa distribusi serta reservoir; sarana air bersih SPAM perkotaan dicatat terpisah dalam subsektor sumber daya air sebesar {{angka:rehab.rekon.cianjur2022.r3p_spam_perkotaan_rp|rupiah}} [@cianjur-2022-r3p, hlm. 53, 57]. Bentuk rupiah ini mengikuti pedoman pengkajian kebutuhan pascabencana, yang menilai kerusakan sebagai jumlah unit fisik rusak dikali harga satuan [@bnpb-2011-pdna, hlm. 40]. Unit fisiknya tidak ikut diterbitkan. Perban BNPB 5/2017 Pasal 8 sudah memuat air bersih dan sanitasi serta sumber daya air dan transportasi darat sebagai sektor infrastruktur R3P [@bnpb-2017-r3p, hlm. 7].

**Untuk akses, Kementerian Pekerjaan Umum mencatat {{angka:rehab.rekon.sumatra2025.jembatan_daerah_pu}} jembatan daerah dan {{angka:rehab.rekon.sumatra2025.jalan_daerah_ruas_pu}} ruas jalan daerah terdampak banjir Sumatra 2025 per 7 Mei 2026.** Jembatan daerah yang fungsional baru {{angka:rehab.rekon.sumatra2025.jembatan_daerah_fungsi_persen_mei|persen}}, ruas jalan daerah {{angka:rehab.rekon.sumatra2025.jalan_daerah_fungsi_persen_mei|persen}}, sedangkan jalan dan jembatan nasional terdampak {{angka:rehab.rekon.sumatra2025.nasional_fungsi_persen_mei|persen}} [@pu-2026-infrastruktur-sumatra-mei]. BPJN Aceh mencatat {{angka:rehab.rekon.sumatra2025.jembatan_nasional_aceh_putus}} jembatan roboh atau terputus di jalan nasional Aceh sampai 1 Desember 2025 [@binamarga-2025-aceh-14-jembatan].

**Jumlah jembatan nasional terdampak di ketiga provinsi Sumatra tidak ditemukan; yang tersedia hanya angka {{angka:rehab.rekon.sumatra2025.jembatan_nasional_aceh_putus}} jembatan untuk Aceh.** Data titik SPAM rusak dari buku Satuan Tugas Kementerian Pekerjaan Umum untuk Lombok 2018 dan Cianjur 2022 belum dibuka ulang dan tidak dipakai di bab ini.

## Skenario Terburuk Beban Rehabilitasi dan Rekonstruksi {#sub:rr-skenario}

### Lantai, Periode Acuan, dan Empat Besaran

**Skenario terburuk tidak boleh lebih ringan daripada kejadian atau tahun tercatat terburuk untuk jenis dan wilayah yang sama dalam periode acuan.** Periode acuannya 2008–2025 untuk hidrometeorologi dan 1996–2025 untuk geologi, sesuai prinsip lantai kerangka induk. Untuk jembatan periodenya 2018–2025 karena seri DIBI baru terisi sejak 2018. Empat besaran RR yang diukur adalah rumah rusak (berat, sedang, ringan), jembatan rusak beserta akses terputus, kemudian layanan air terganggu dan durasi pemulihan per lapis; korban jiwa dan kerugian rupiah menjadi baris konteks. Lapis permanen mengikuti masa R3P paling lama {{angka:rehab.hukum.r3p_tahun_maks}} tahun, dan R3P disusun paling lama {{angka:perban2017_5.r3p_hari_maks}} hari, dimulai pada masa tanggap darurat [@bnpb-2017-r3p, hlm. 4, 10]. Kebutuhan air lapis darurat dihitung dari {{angka:perka_2008.air_bersih_awal_liter_hari|satuan}} pada tiga hari pertama, lalu {{angka:perka_2008.air_bersih_liter_hari|satuan}} [@bnpb-2008-kebutuhan-dasar].

::: gambar {#gbr:foto-rr-cianjur-runtuh-2022}
berkas: gambar/foto/rehab-b08-cianjur-runtuh-2022.jpg
jenis: foto
judul: Bangunan runtuh di Kabupaten Cianjur, 23 November 2022
pengarang: Badan Nasional Penanggulangan Bencana (BNPB)
lisensi: PD
url: https://commons.wikimedia.org/wiki/File:Cianjur_earthquake_damage_1.jpg
potong: dipotong tengah ke rasio 2:1
lebar: penuh
:::

**Lantai kejadian gempa adalah {{angka:bappenas.yogya2006.rumah_hancur}} rumah hancur di Yogyakarta 2006, ditulis berdampingan dengan {{angka:dibi.padang2009.rumah_rb}} rumah rusak berat Padang 2009 sebagai lantai DIBI.** Penilaian Badan Perencanaan Pembangunan Nasional (Bappenas) memuat dua versi jumlah rumah hancur dalam dokumen yang sama, sehingga lantai ditulis sebagai rentang [@bappenas-2006-dala-yogya, hlm. 15]. Untuk tsunami, lantai kejadiannya sampai {{angka:brr.aceh2004.rumah_rusak}} rumah hancur atau rusak berat di Aceh 2004 [@brr-2009-scattered-beads, hlm. x], di samping {{angka:rehab.dibi.selatsunda2018.rumah_rb}} rumah rusak berat Selat Sunda 2018 di DIBI. Definisi "hancur" pada kedua dokumen itu tidak persis sama dengan rusak berat menurut Juklak BNPB 7/2023; selisih definisi ditulis di catatan tabel dan tidak dipakai untuk menurunkan lantai. Jumlah rumah yang dibangun Badan Rehabilitasi dan Rekonstruksi (BRR) Aceh adalah ukuran keluaran pemulihan, sehingga tidak dipakai sebagai lantai kerusakan.

**Untuk jembatan banjir, lantai kejadian memakai {{angka:rehab.lantai.jembatan.banjir.kejadian}} jembatan daerah terdampak Sumatra 2025, berdampingan dengan {{angka:rehab.lantai.jembatan.banjir.tahun_terburuk}} jembatan pada tahun banjir terburuk DIBI.** Angka Kementerian Pekerjaan Umum belum memuat jembatan nasional, dan angka DIBI menghitung jumlah tanpa status jalan; keduanya tidak sebanding satu lawan satu [@pu-2026-infrastruktur-sumatra-mei; @bnpb-dibi]. Lantai tahun dan lantai kejadian menjawab pertanyaan berbeda: kartu Bab 8 memakai lantai kejadian untuk skenario dan lantai tahun untuk kesiapan tahunan. Tahun 2026 sementara sudah mencatat {{angka:rehab.dibi.rumah_rb.gempa_2026_sementara}} rumah rusak berat akibat gempa, tetapi tidak masuk lantai karena di luar periode acuan dan belum final. @tbl:rr-lantai merangkum lantai per jenis. Catatan atas @tbl:rr-lantai. RB = rumah rusak berat. Lantai tahun adalah jumlah nasional satu tahun; lantai kejadian adalah satu kejadian. Lantai jembatan DIBI adalah batas bawah. "Hancur" pada Bappenas dan "hancur atau rusak berat" pada BRR tidak persis sama dengan RB Juklak BNPB 7/2023. Kerusakan likuefaksi dan tsunami Sulawesi Tengah 2018 tercampur ke baris gempa.

::: tabel {#tbl:rr-lantai}
judul: Lantai tercatat rumah rusak dan jembatan rusak per jenis bencana, 1996–2025
sumber: DIBI BNPB, ditarik 23 Oktober 2026; Kementerian Pekerjaan Umum, data 7 Mei 2026; Bappenas (2006); BRR (2009)
keyakinan: resmi
data_per: 25 Okt 2026

| JENIS | LANTAI TAHUN, RB (DIBI) | LANTAI KEJADIAN, RUMAH | LANTAI JEMBATAN |
| --- | --- | --- | --- |
| Banjir dan banjir bandang | 2025: {{angka:rehab.lantai.rumah.banjir.tahun_terburuk}} | Sumatra 2025 (banjir dan longsor): {{angka:dibi.sumatra2025.rumah_rusak_berat}} RB, {{angka:rehab.dibi.sumatra2025.rumah_rusak}} rusak (DIBI) | kejadian Sumatra 2025: {{angka:rehab.lantai.jembatan.banjir.kejadian}} jembatan daerah terdampak (Kementerian Pekerjaan Umum); tahun 2025: {{angka:rehab.lantai.jembatan.banjir.tahun_terburuk}} (DIBI) |
| Tanah longsor | 2017: {{angka:rehab.lantai.rumah.longsor.tahun_terburuk}} | belum dihitung; menunggu turunan per kab/kota | tahun terburuk: {{angka:rehab.lantai.jembatan.longsor.tahun_terburuk}} (DIBI) |
| Gempa bumi | 2009: {{angka:rehab.lantai.rumah.gempa.tahun_terburuk}} | Yogyakarta 2006: {{angka:bappenas.yogya2006.rumah_hancur}} hancur (Bappenas); Padang 2009: {{angka:dibi.padang2009.rumah_rb}} RB, {{angka:rehab.dibi.padang2009.rumah_rusak}} rusak (DIBI) | tahun terburuk: {{angka:rehab.lantai.jembatan.gempa.tahun_terburuk}} (DIBI); tidak layak sebagai lantai |
| Tsunami | 2018: {{angka:rehab.lantai.rumah.tsunami.tahun_terburuk}} | Aceh 2004: sampai {{angka:brr.aceh2004.rumah_rusak}} hancur atau rusak berat (BRR); Selat Sunda 2018: {{angka:rehab.dibi.selatsunda2018.rumah_rb}} RB (DIBI) | tidak tercatat di DIBI 2018–2025 |
| Likuefaksi | tidak terpisah dari gempa | tidak terpisah dari gempa Sulawesi Tengah 2018 | tidak terpisah |
| Erupsi gunung api | 2014: {{angka:rehab.lantai.rumah.erupsi.tahun_terburuk}} | Merapi 2010: {{angka:rehab.dibi.merapi2010.rumah_rb}} RB (DIBI) | tahun terburuk: {{angka:rehab.lantai.jembatan.erupsi.tahun_terburuk}} (DIBI) |
| Cuaca ekstrem | 2012: {{angka:rehab.lantai.rumah.cuaca_ekstrem.tahun_terburuk}} | tidak ada baris kejadian besar | tahun terburuk: {{angka:rehab.lantai.jembatan.cuaca_ekstrem.tahun_terburuk}} (DIBI) |
:::

### Ketersediaan Kuantifikasi per Besaran

**Dari tujuh jenis bencana, besaran rumah terukur untuk enam jenis.** Layanan air dan durasi pulih hanya terukur untuk banjir Sumatra 2025 dari sumber yang sudah dibuka. @tbl:rr-kuantifikasi menunjukkan bahwa jembatan terukur sebagai batas bawah untuk jenis hidrometeorologi dan erupsi, dan likuefaksi tidak terpisah di besaran mana pun. Durasi pulih tidak punya seri domestik: satu-satunya kurva yang dapat digambar adalah dua titik air Sumatra 2025 (2 Februari dan 7 Mei 2026) dan satu titik jembatan daerah (7 Mei 2026), dengan Kobe dan Tohoku sebagai pembanding di Bab 6. Hari sampai akses darurat terbuka tidak tercatat di sumber mana pun yang dibuka, sehingga besaran durasi untuk akses ditulis "tidak terukur" dan garis dasarnya menjadi pokok @rek:r-rr-02. Catatan atas @tbl:rr-kuantifikasi. "Belum diverifikasi" berarti sumber primer untuk sel itu belum dibuka pada penyusunan bab ini; sel itu tidak dipakai sebagai angka sampai sumbernya dibuka.

::: tabel {#tbl:rr-kuantifikasi}
judul: Ketersediaan kuantifikasi empat besaran rehabilitasi dan rekonstruksi per jenis bencana, 2008–2025
sumber: Analisis kajian ini atas DIBI BNPB, Kementerian Pekerjaan Umum, Bappenas (2006), dan BRR (2009)
keyakinan: asumsi-kebijakan
data_per: 25 Okt 2026

| JENIS | RUMAH | JEMBATAN DAN AKSES | LAYANAN AIR | DURASI PULIH |
| --- | --- | --- | --- | --- |
| Gempa bumi | terukur (DIBI; sebelum 2008 Bappenas) | sangat di bawah kerusakan; R3P dalam rupiah | belum diverifikasi | belum diverifikasi |
| Tsunami | terukur (BRR untuk Aceh 2004) | belum diverifikasi | belum diverifikasi | belum diverifikasi |
| Likuefaksi | tidak terpisah dari gempa | tidak terpisah | tidak terpisah | tidak terpisah |
| Banjir dan banjir bandang | terukur | batas bawah (DIBI sejak 2018); per kejadian dari Kementerian Pekerjaan Umum | Sumatra 2025 (Kementerian Pekerjaan Umum) | Sumatra 2025, dua titik |
| Tanah longsor | terukur | batas bawah | tidak ada | tidak ada |
| Erupsi gunung api | terukur | batas bawah | tidak ada | tidak ada |
| Cuaca ekstrem | terukur | batas bawah | tidak berlaku | tidak ada |
:::

## Biaya Satuan sebagai Pembanding {#sub:rr-biaya}

**Pedoman pengkajian kebutuhan pascabencana BNPB 2011 menilai kerusakan sebagai jumlah unit fisik rusak dikali harga satuan, sehingga biaya satuan sudah menjadi bahan baku penilaian.** Pedoman yang sama memasukkan gangguan akses dan gangguan fungsi ke dalam cakupan pengkajian [@bnpb-2011-pdna, hlm. 40]. Kajian ini memakai biaya satuan berlabel dan bertahun harga hanya sebagai pembanding pilihan teknis di Bab 5–7. Pagu dan total program tidak disajikan, begitu pula ukuran ekonomi seperti rasio manfaat-biaya, dan biaya satuan tidak dijumlah menjadi kebutuhan program. Bahan biaya satuan Bab 5–7 berasal dari tiga dokumen anggaran instansi yang angkanya dikutip dari dokumen asal dan belum diperiksa ulang pada penyusunan bab ini, yaitu rencana pengeboran sumur Badan Geologi 2020 [@esdm-2019-sumur-750], SPAM Banjarbakula tahap II 2023 [@setkab-2023-banjarbakula], dan jembatan gantung Kementerian Pekerjaan Umum 2025 [@pu-2025-jembatan-gantung]. Aturan label kajian ini: hasil bagi angka resmi tanpa model diberi label asumsi kebijakan dengan keterangan "hitungan penyusun atas data resmi", dan label estimasi model hanya dipakai untuk keluaran model. Daftar harga satuan resmi untuk pipa polietilena densitas tinggi per km per diameter, jembatan bailey per meter, dan sumur bor tidak ditemukan, sehingga sel itu di tabel biaya bertuliskan "tidak ada harga satuan resmi".

## Aturan Daftar Perhatian Rehabilitasi dan Rekonstruksi {#sub:rr-perhatian}

**Daftar perhatian sementara dengan dua dari empat syarat menghasilkan {{angka:rehab.perhatian.sementara.n}} kab/kota, dan {{angka:rehab.perhatian.sementara.n_dua_kelas}} kab/kota bila syarat bahaya dilonggarkan ke dua kelas teratas.** Kab/kota masuk daftar bila memenuhi paling sedikit dua dari empat syarat pada @tbl:rr-perhatian. Syarat jembatan rusak per kab/kota tidak punya data di paket kajian, karena jembatan per kab/kota hanya tersedia untuk {{angka:rehab.dibi.jembatan_rusak.kejadian_besar_kab_n}} kejadian besar [@bnpb-dibi]. Syarat cekungan air tanah kritis atau penurunan muka tanah juga belum dapat dinilai karena poligon zona konservasi tidak ada di repositori. Hasil sementara karena itu menjadi bahan uji metode dan tidak tampil sebagai daftar perhatian di badan teks; daftar final masuk Lampiran A setelah turunan lengkap.

**Syarat bahaya dipenuhi {{angka:rehab.perhatian.sementara.n_syarat_a}} kab/kota dan syarat kerusakan rumah dipenuhi {{angka:rehab.perhatian.sementara.n_syarat_c}} kab/kota.** Kelas teratas per bahaya adalah kuintil turunan penyusun, karena sumber resmi IRBI tidak memuat ambang kelas per bahaya [@bnpb-irbi]. Syarat kerusakan memakai proksi rumah rusak total 2015–2025 di kuartil atas, paling sedikit {{angka:rehab.perhatian.sementara.ambang_c}} unit, karena rumah rusak berat per kab/kota untuk periode itu tidak tersedia. Jumlah proksi di seluruh kab/kota bernilai, {{angka:rehab.perhatian.sementara.rumah_rusak_kab_jumlah}} rumah, dekat dengan jumlah nasional ketiga tingkat kerusakan, yaitu {{angka:rehab.dibi.rumah_rusak.2015_2025}} [@bnpb-dibi]. Proksi ini tidak memuat rumah terendam, tetapi rumah rusak ringan yang banyak pada banjir membuatnya condong ke kab/kota banjir (analisis penyusun).

::: tabel {#tbl:rr-perhatian}
judul: Syarat daftar perhatian rehabilitasi dan rekonstruksi kab/kota, status data, dan hasil sementara, 2015–2025
sumber: Analisis kajian ini atas IRBI 2025 InaRISK BNPB dan DIBI BNPB per kab/kota 2015–2025
keyakinan: asumsi-kebijakan
data_per: 25 Okt 2026

| SYARAT | ISI | STATUS DATA | HASIL SEMENTARA |
| --- | --- | --- | --- |
| (a) Bahaya | IRBI 2025 untuk banjir, longsor, atau gempa bumi di kelas nilai teratas nasional | dapat dihitung; kelas kuintil turunan | {{angka:rehab.perhatian.sementara.n_syarat_a}} kab/kota |
| (b) Jembatan berulang | jembatan rusak tercatat pada paling sedikit dua tahun dari 2018–2025 | tidak ada jembatan per kab/kota per tahun | belum dinilai |
| (c) Rumah | rumah rusak berat 2015–2025 di kuartil atas | proksi rumah rusak total | {{angka:rehab.perhatian.sementara.n_syarat_c}} kab/kota |
| (d) Air tanah | cekungan air tanah berzona kritis atau rusak, atau kawasan penurunan muka tanah terverifikasi | poligon tidak tersedia | belum dinilai |
| Uji kepekaan | (a) dan (c) pada kelas teratas, lalu dua kelas teratas | dapat dihitung | {{angka:rehab.perhatian.sementara.n}} lawan {{angka:rehab.perhatian.sementara.n_dua_kelas}} kab/kota |
:::

**Kab/kota dengan beban rumah rusak terbesar 2015–2025, seperti Aceh Utara, Cianjur, dan Kota Palu, baru masuk daftar pada ambang longgar.** IRBI 2025 mereka tidak berada di kuintil teratas [@bnpb-irbi], sehingga IRBI mengukur bahaya dan risiko sedangkan DIBI mencatat kerusakan, dan keduanya menunjuk kab/kota yang berbeda (analisis penyusun). Untuk RR, syarat kerusakan tercatat layak berbobot lebih besar; setelah turunan jembatan per kab/kota tersedia, kajian ini mengusulkan uji varian "syarat (b) atau (c) wajib" di samping aturan dua dari empat. Catatan atas @tbl:rr-perhatian. Syarat (d) adalah penanda kehati-hatian air tanah, bukan syarat prioritas bantuan. Hasil sementara bukan daftar final.

**Daftar perhatian kajian mitigasi memuat {{angka:perhatian.mitigasi.banjir.n}} kab/kota untuk banjir dan {{angka:perhatian.mitigasi.gempa.n}} untuk gempa bumi.** Aturannya disusun per bahaya, sehingga jumlah itu menjadi pembanding besaran dan tidak dibandingkan langsung dengan daftar RR.

## Rekonsiliasi Angka {#sub:rr-rekonsiliasi}

**Lima kelompok angka berbeda versi, dan semuanya ditulis berdampingan pada @tbl:rr-rekonsiliasi tanpa memilih satu versi.** Kelompok itu adalah rincian DIBI per jenis bencana, jembatan Sumatra 2025, rumah rusak Sumatra 2025, rumah rusak Cianjur 2022, dan SPAM Sumatra 2025. Pada jembatan Sumatra, DIBI mencatat {{angka:rehab.dibi.jembatan_rusak.sumatra2025_jendela}} jembatan pada jendela kejadian dan {{angka:rehab.dibi.jembatan_rusak.tiga_prov_sumatra.2025}} pada seluruh 2025 di tiga provinsi, sedangkan Kementerian Pekerjaan Umum mencatat {{angka:rehab.rekon.sumatra2025.jembatan_daerah_pu}} jembatan daerah terdampak [@bnpb-dibi; @pu-2026-infrastruktur-sumatra-mei].

**Untuk rumah rusak Cianjur 2022, R3P memuat {{angka:rehab.rekon.cianjur2022.rumah_rusak_r3p}} rumah rusak, sekitar dua kali {{angka:dibi.cianjur2022.rumah_rusak}} rumah di DIBI.** Angka rumah R3P itu bersumber dari keputusan bupati, bukan dari laporan tanggap darurat [@cianjur-2022-r3p, hlm. 55].

::: catatan
**Catatan hitung per jenis.** Rincian jembatan rusak dan rumah rusak berat per jenis bencana dihitung pada 2018–2025 untuk jembatan dan 2015–2025 untuk rumah. Menjumlah baris 2026 yang masih sementara membuat rincian melampaui total {{angka:rehab.dibi.jembatan_rusak.2018_2025}} jembatan. Dengan batas periode itu, porsi banjir adalah {{angka:rehab.dibi.jembatan_rusak.porsi_banjir_persen|fmt=1|persen}}, jembatan rusak akibat gempa {{angka:rehab.dibi.jembatan_rusak.gempa_2018_2025}}, dan rumah rusak berat akibat gempa {{angka:rehab.dibi.rumah_rb.gempa_2015_2025}} [@bnpb-dibi]. Seluruh bab kajian ini memakai hitungan berbatas periode tersebut.
:::

**Target perbaikan permanen SPAM Agustus 2028 hanya berlaku untuk {{angka:rehab.rekon.sumatra2025.spam_sumbar_target_n}} SPAM di Sumatera Barat, bukan seluruh Sumatra.** Rilis Kementerian Pekerjaan Umum 5 Februari 2026 menyebut target bertahap itu untuk Sumatera Barat, dan rilis 11 Mei 2026 tidak memuat target permanen [@pu-2026-spam-sumatra-feb; @pu-2026-infrastruktur-sumatra-mei]. Target permanen untuk Aceh dan Sumatera Utara tidak diketahui karena rencana induk RR Sumatra belum dibuka. Versi rumah rusak Sumatra dari BNPB dan Kementerian Perumahan dan Kawasan Permukiman sejauh ini hanya terbaca lewat berita media, sehingga angkanya dicatat di Lampiran D sampai rilis lembaga asal dibuka. Catatan atas @tbl:rr-rekonsiliasi. Definisi dan tanggal berbeda per sumber; angka tidak dijumlahkan. Sel "–" pada baris media berarti angka hanya tersedia dari kutipan pihak lain dan dicatat di Lampiran D.

::: tabel {#tbl:rr-rekonsiliasi}
judul: Rekonsiliasi angka yang berbeda versi untuk jembatan, rumah, dan SPAM pada kejadian Sumatra 2025 dan Cianjur 2022
sumber: DIBI BNPB, ditarik 23 Oktober 2026; Kementerian Pekerjaan Umum, 5 Februari dan 11 Mei 2026; Ditjen Bina Marga BPJN Aceh, 3 Desember 2025; R3P Kabupaten Cianjur 2022; Renstra BNPB 2025–2029
keyakinan: campuran
data_per: 25 Okt 2026

| KELOMPOK | NILAI | DEFINISI DAN TANGGAL | SUMBER | KEYAKINAN |
| --- | ---: | --- | --- | --- |
| Jembatan Sumatra 2025 | {{angka:rehab.dibi.jembatan_rusak.sumatra2025_jendela}} | jembatan rusak, jendela 15 November sampai 31 Desember 2025 | DIBI BNPB | resmi |
| Jembatan Sumatra 2025 | {{angka:rehab.dibi.jembatan_rusak.tiga_prov_sumatra.2025}} | jembatan rusak, semua kejadian alam 2025 di tiga provinsi | DIBI BNPB | resmi |
| Jembatan Sumatra 2025 | {{angka:rehab.rekon.sumatra2025.jembatan_daerah_pu}} | jembatan daerah terdampak, data 7 Mei 2026 | Kementerian Pekerjaan Umum | resmi |
| Jembatan Sumatra 2025 | {{angka:rehab.rekon.sumatra2025.jembatan_nasional_aceh_putus}} | jembatan roboh atau terputus di jalan nasional Aceh, sampai 1 Desember 2025 | BPJN Aceh | resmi |
| Rumah Sumatra 2025 | {{angka:rehab.dibi.sumatra2025.rumah_rusak}} | rumah rusak berat, sedang, ringan, 15 November sampai 31 Desember 2025 | DIBI BNPB | resmi |
| Rumah Sumatra 2025 | – | versi BNPB Desember 2025 dan Kementerian PKP Januari 2026 | berita media | terverifikasi |
| Rumah Cianjur 2022 | {{angka:dibi.cianjur2022.rumah_rusak}} | rumah rusak, lima kabupaten, 21–30 November 2022 | DIBI BNPB | resmi |
| Rumah Cianjur 2022 | {{angka:rehab.rekon.cianjur2022.rumah_rusak_kab_dibi}} | rumah rusak, Kabupaten Cianjur saja | DIBI BNPB | resmi |
| Rumah Cianjur 2022 | {{angka:rehab.rekon.cianjur2022.rumah_rusak_renstra}} | rumah rusak | Renstra BNPB 2025–2029 | resmi |
| Rumah Cianjur 2022 | {{angka:rehab.rekon.cianjur2022.rumah_rusak_r3p}} | rumah rusak, keputusan bupati tahap II hasil reviu BNPB | R3P Kabupaten Cianjur | resmi |
| SPAM Sumatra 2025 | {{angka:rehab.rekon.sumatra2025.spam_terdampak_feb}} | SPAM terdampak, 2 Februari 2026 | Kementerian Pekerjaan Umum | resmi |
| SPAM Sumatra 2025 | {{angka:rehab.rekon.sumatra2025.spam_berfungsi_feb}} | SPAM berfungsi, 2 Februari 2026 | Kementerian Pekerjaan Umum | resmi |
| SPAM Sumatra 2025 | {{angka:rehab.rekon.sumatra2025.spam_terdampak_mei}} | SPAM terdampak, 7 Mei 2026 | Kementerian Pekerjaan Umum | resmi |
| SPAM Sumatra 2025 | – | versi jumlah SPAM berfungsi Februari 2026 dari rapat Satuan Tugas | berita media | terverifikasi |
:::

::: catatan
**Perbandingan dengan sumber lain.** Pada dua kelompok, DIBI lebih rendah daripada dokumen sektor: jembatan Sumatra {{angka:rehab.dibi.jembatan_rusak.sumatra2025_jendela}} lawan {{angka:rehab.rekon.sumatra2025.jembatan_daerah_pu}} jembatan daerah, dan rumah Cianjur {{angka:dibi.cianjur2022.rumah_rusak}} lawan {{angka:rehab.rekon.cianjur2022.rumah_rusak_r3p}}. Dugaan kajian ini, yang belum diuji, adalah perbedaan saat pencatatan (DIBI dari laporan tanggap darurat; R3P dan Kementerian Pekerjaan Umum dari verifikasi kemudian) dan perbedaan definisi ("terdampak" lawan "rusak"). R3P Cianjur sendiri menulis total sektor infrastruktur {{angka:rehab.rekon.cianjur2022.r3p_infrastruktur_total_rp|rupiah}} sebagai total subsektor sumber daya air, padahal rincian subsektor itu berjumlah {{angka:rehab.rekon.cianjur2022.r3p_sda_rincian_rp|rupiah}} [@cianjur-2022-r3p, hlm. 53–58].
:::

## Keterbatasan {#sub:rr-keterbatasan}

**Jembatan rusak per kab/kota hanya tersedia untuk {{angka:rehab.dibi.jembatan_rusak.kejadian_besar_kab_n}} kejadian besar, sehingga lantai jembatan per wilayah masih ditulis pada tingkat provinsi.** Aceh mencatat {{angka:rehab.dibi.jembatan_rusak.prov.aceh.2025}} jembatan rusak pada 2025 dan menjadi lantai provinsi sampai tarikan DIBI per kab/kota dengan kolom jembatan rusak 2018–2025 tersedia [@bnpb-dibi]. Rumah rusak berat per kab/kota 2015–2025 juga belum ada dan diganti proksi rumah rusak total.

**Lantai geologi 1996–2007 diambil dari dokumen penilaian Bappenas 2006 dan BRR 2009, karena dasbor publik DIBI baru mulai 2008.** Kejadian 1996–2007 lain, seperti gempa Nias 2005 yang terpisah dari Aceh, belum dinilai. Porsi likuefaksi pada kerusakan Sulawesi Tengah 2018 tidak terpisah di DIBI, dan kerusakan tsunami kejadian yang sama tercampur ke baris gempa, sehingga lantai tsunami DIBI sebesar {{angka:rehab.dibi.selatsunda2018.rumah_rb}} rumah rusak berat terlalu rendah untuk dibaca sendiri [@bnpb-dibi]. Teks Juklak BNPB 7/2023 dibaca dari salinan di luar JDIH BNPB.

**Empat kelompok dokumen primer belum dibuka atau tidak ditemukan per 25 Oktober 2026 dan membatasi rekonsiliasi pada @sub:rr-rekonsiliasi.** Kelompok itu adalah rilis BNPB dan Kementerian Perumahan dan Kawasan Permukiman tentang rumah rusak Sumatra, rencana induk RR Sumatra menurut Keppres 1/2026, R3P Lombok 2018 dan Sulawesi Tengah 2018, serta buku Satuan Tugas Kementerian Pekerjaan Umum untuk Lombok dan Cianjur.

**Apakah Pusdatinkom menyimpan isian jaringan air dari {{angka:rehab.juklak7.prasarana_vital_n}} jenis prasarana vital per laporan belum diketahui.** Pertanyaan itu masuk permintaan data Lampiran L, tanpa klaim bahwa data itu ada atau tidak ada (@rek:r-rr-01).
