---
kajian: air
lampiran: F
judul: Metode, Asumsi, dan Rekonsiliasi Angka
status: final
---

# Metode, Asumsi, dan Rekonsiliasi Angka {#lamp:metode}

Metode kajian diuraikan di Bab 3, dan lampiran ini mengumpulkan rinciannya di satu tempat. Resolusi data per komponen ada di @tbl:resolusi, skala dampak di @tbl:skala-dampak, ketersediaan kuantifikasi di @tbl:kuantifikasi, kerugian materiil di @tbl:kerugian, dan rekonsiliasi angka berbeda versi di @tbl:rekonsiliasi. Tiap angka bertoken di naskah tercatat di registri angka beserta sumber dan tanggal tariknya. Skrip reproduksinya tersimpan bersama registri, dan angka dibekukan per 23 Oktober 2026 [@bnpb-dibi; @bnpb-irbi].

::: tabel {#tbl:f-asumsi}
judul: Asumsi kebijakan yang menentukan hasil kajian dan letak pemakaiannya, 2026–2030
sumber: Bab 3, Bab 5, Bab 6, dan Bab 8 kajian ini
keyakinan: asumsi-kebijakan

| ASUMSI | DIPAKAI DI | DASAR DAN UJI |
| --- | --- | --- |
| Kab/kota masuk daftar perhatian bila memenuhi paling sedikit dua dari lima syarat per bahaya | @sub:daftar; Lampiran G | Varian aturan diuji pada @tbl:daftar-perhatian |
| Lantai skenario musim hujan adalah musim terburuk per metrik dalam seri DIBI 2008/2009 sampai 2025/2026 | @sub:skenario; Bab 6 | Uji kepekaan musim pembanding di Subbab 3.8 |
| Peluang lima tahun dihitung dari laju Poisson satu per delapan belas musim | @sub:skenario | Frekuensi ditentukan panjang seri, bukan model iklim |
| Ukuran gangguan air bersih saat kemarau adalah jiwa terdampak per kab/kota sampai volume air tersalur tersedia | Bab 5; @rek:r-a03 | Jiwa terdampak juga mengukur intensitas pelaporan |
| Kerugian materiil disajikan per besaran dan tidak dijumlah | @sub:kerugian | Tiga besaran berlabel berbeda |
| Unit pemimpin rekomendasi mengikuti struktur organisasi BNPB yang berlaku | Bab 10 | Perban BNPB 6/2025 jo. 11/2025 |
:::

**Rekap luas daerah irigasi per provinsi dalam Permen PUPR 14/2015 dicocokkan dengan jumlah baris daerah irigasi yang teratribusi ke kab/kota** (@tbl:f-irigasi) [@pupr-2015-permen14]. Selisih menunjukkan luas yang tidak dapat diberikan ke satu kab/kota, terutama daerah irigasi lintas kab/kota.

::: tabel {#tbl:f-irigasi}
judul: Rekonsiliasi rekap dan baris daerah irigasi Permen PUPR 14/2015 per kewenangan, provinsi, dan jenis, penetapan 2015 (ha)
csv: data/air-jawa/irigasi_rekonsiliasi.csv
kolom: kewenangan="KEWENANGAN"; prov_kode="KODE"; jenis="JENIS"; rekap_n_di="DI MENURUT REKAP" fmt=0; rekap_ha="LUAS REKAP (ha)" fmt=0; ocr_ha_teratribusi_kab="LUAS TERATRIBUSI KE KAB/KOTA (ha)" fmt=0; ha_tak_teratribusi="SELISIH (ha)" fmt=0; persen_tak_teratribusi="SELISIH (%)" fmt=2
sumber: Permen PUPR Nomor 14/PRT/M/2015 Lampiran I–III, hasil pengenalan karakter optik; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kode provinsi menurut Kemendagri; selisih negatif = jumlah baris melebihi rekap tercetak.
:::

**Jumlah delapan belas baris inventaris bendungan BBWS Pemali-Juana cocok dengan total tercetak untuk tujuh dari delapan besaran; selisih sedimentasi berasal dari dokumen sumber** (@tbl:f-bendungan) [@bbwspj-2021-bendungan].

::: tabel {#tbl:f-bendungan}
judul: Rekonsiliasi jumlah baris dan total tercetak inventaris bendungan BBWS Pemali-Juana, status Juli 2021
csv: data/air-jawa/bendungan_rekonsiliasi.csv
kolom: kolom="BESARAN (NAMA KOLOM PAKET DATA)"; jumlah_18_baris="JUMLAH BARIS" fmt=3; total_tercetak_dokumen="TOTAL TERCETAK" fmt=3; selisih="SELISIH" fmt=3
sumber: BBWS Pemali-Juana, Daftar Inventarisasi Bendungan, status Juli 2021; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Luas dalam ha, volume dan tampungan dalam juta m³, piezometer dalam unit.
:::

## Tabel Pendukung Bab 1 Pendahuluan {#sub:f-bab01}


::: tabel {#tbl:resolusi-data}
judul: Tingkat data terendah per komponen air dan data lintas komponen di Pulau Jawa, 2026
sumber: Pengolahan data Pantau Bencana dari Permen PUPR Nomor 14/PRT/M/2015, BBWS Pemali-Juana (2021), BPS Provinsi Jawa Tengah (2026), InaRISK BNPB (IRBI dan KRB), DIBI BNPB, dan Radhika dkk. (2017)
keyakinan: campuran
data_per: 24 Okt 2026
catatan: "Tidak ada" = tidak ditemukan di paket data; "–" = tidak dinilai; rincian di Bab 3 dan Bab 4.

| KOMPONEN | TINGKAT TERENDAH | DATA YANG TERSEDIA | KEYAKINAN | PEMEGANG DATA |
| --- | --- | --- | --- | --- |
| Air baku dan air minum | kab/kota, hanya Jawa Tengah | akses air minum layak 2025 untuk {{angka:airjawa.air_minum.n_kab_jateng}} kab/kota Jawa Tengah; lima provinsi lain per provinsi | resmi | BPS provinsi |
| Irigasi | kab/kota | luas daerah irigasi {{angka:airjawa.irigasi.jawa_total_ha}} ha menurut kewenangan dan jenis, penetapan 2015; kondisi jaringan tidak ada | resmi | Kementerian PU |
| Waduk dan bendungan | titik bendungan | {{angka:airjawa.bendungan.n_paket}} bendungan dalam paket, {{angka:airjawa.bendungan.n_resmi_pj2021}} dari inventaris resmi, sisanya sekunder; bukan inventaris lengkap | resmi | BBWS; Perum Jasa Tirta |
| Air tanah | pulau | per kab/kota tidak ada | – | Kementerian Energi dan Sumber Daya Mineral (Badan Geologi) |
| Penurunan muka tanah | kota | laju per kota dari literatur, antarbaris tidak sebanding, sebagian baris sekunder; pengukuran sendiri belum dijalankan | terverifikasi | literatur bertelaah sejawat |
| Bahaya dan kejadian | kab/kota | IRBI 2015–2025 dan DIBI 2008–2026 untuk {{angka:airjawa.jawa.n_kab}} kab/kota | resmi | BNPB |
| Penduduk | kab/kota | penduduk KRB {{angka:airjawa.jawa.penduduk_krb}} jiwa; WorldPop 2026 sebagai pembanding | resmi | BNPB |
| Wilayah sungai | WS | {{angka:airjawa.ws.jumlah}} WS; batas vektor dan debit sungai tidak ada | resmi | Kementerian PU |
| Neraca air | pulau | ketersediaan air permukaan keluaran model; neraca per WS tidak ada dalam paket | estimasi-model | Kementerian PU |
:::

## Tabel Pendukung Bab 2 Tinjauan Pustaka {#sub:f-bab02}


::: tabel {#tbl:praktik}
judul: Praktik pembanding kajian air menurut kekuatan bukti, 1956–2026
sumber: Kompendium program kajian ini dengan rubrik kekuatan bukti, 23 Okt 2026 [@yamamoto-1984-tokyo; @bankdunia-2023-pamsimas; @dfat-2023-pamsimas; @eea-tt-rftr; @deltaprogramma-2026]; Perban BNPB 1/2026; Kepmen ESDM Nomor 291.K/GL.01/MEM.G/2023 [@esdm-2023-air-tanah]
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Program luar negeri tanpa status Indonesia; kolom padanan menyebut program Indonesia setara.

| PRAKTIK DAN LOKASI | KEKUATAN BUKTI | POSISI | PADANAN DI INDONESIA | BATAS PENGALIHAN KE JAWA | KEYAKINAN |
| --- | --- | --- | --- | --- | --- |
| Pengendalian pengambilan air tanah dengan pasokan pengganti, Tokyo | kuat, bertumpu pada deret Tokyo | Program (bukti kuat) | persetujuan penggunaan air tanah dan NSPK Renas PB 2.4.4.a; Sudah ada, perlu dikembangkan; belum dievaluasi | pasokan pengganti untuk industri dan bangunan di kota Pantura belum dapat dinilai; hasil butuh lebih dari satu dekade | terverifikasi |
| PAMSIMAS, perdesaan Indonesia | sedang | Program dengan syarat | program dalam negeri, periode 2008–2023 | sumber air tahan kemarau belum diukur; tidak terkait rencana kontinjensi kekeringan badan penanggulangan bencana daerah (BPBD) | terverifikasi |
| Room for the River, Belanda | sedang | Uji coba terukur | belum ada; pengendalian banjir sungai di Jawa didominasi normalisasi dan tanggul | lahan bantaran padat; perlu DAS uji dengan lahan tersedia | estimasi-model |
| Hibah mitigasi FEMA bersyarat analisis manfaat-biaya, Amerika Serikat | sedang | Rujukan tata kelola | Dana Bersama (Perban BNPB 1/2026), belum mensyaratkan analisis manfaat-biaya | data kerugian rupiah per kejadian belum konsisten | terverifikasi |
| Delta Programme, Belanda | lemah | Rujukan tata kelola | tidak dinilai; yang dirujuk hanya laporan kemajuan berangka | kewenangan air terbagi antarlembaga tanpa pelapor kemajuan tunggal | resmi |
| Sekolah Lapang Iklim BMKG, sentra pangan | lemah | Program berjalan, wajib evaluasi dampak | program dalam negeri | tanpa evaluasi berpembanding; tidak terkait rencana kontinjensi kekeringan | resmi |
| Sumur resapan dan lubang resapan biopori, DKI Jakarta dan kota lain | lemah | Program berjalan, wajib evaluasi dampak | program dalam negeri | butuh muka air tanah dalam dan tanah permeabel; pengukuran skala kota tidak ditemukan | terverifikasi |
| Citarum Harum, DAS Citarum | lemah | Program berjalan, wajib evaluasi dampak | program dalam negeri (Perpres 15/2018) | deret indeks kualitas air resmi tidak ditemukan | terverifikasi |
| Sodetan dan bendungan kering Ciliwung, Jabodetabek | lemah | Program berjalan, wajib evaluasi dampak | program dalam negeri | evaluasi pascaoperasi atas luas dan lama genangan belum ada | terverifikasi |
| Desa dan Kelurahan Tangguh Bencana, nasional | belum terbukti | Program berjalan, wajib evaluasi dampak | program dalam negeri (Perban BNPB 7/2025) | tanpa garis dasar dan desa pembanding | resmi |
| Embung dan panen air hujan, lahan tadah hujan | belum terbukti | Program berjalan, wajib evaluasi dampak | program dalam negeri | inventaris volume dan fungsi embung tidak terbuka | terverifikasi |
| Polder dan pompa kota pesisir, Jakarta, Semarang, Pekalongan | belum terbukti | Program berjalan, wajib evaluasi dampak | program dalam negeri | syaratnya penurunan muka tanah yang sudah dihentikan | terverifikasi |
:::

## Tabel Pendukung Bab 3 Metodologi {#sub:f-bab03}


::: tabel {#tbl:rekonsiliasi}
judul: Rekonsiliasi angka yang berbeda versi dalam kajian air Pulau Jawa, 2007–2026
sumber: Pengolahan Pantau Bencana dari InaRISK BNPB, DIBI BNPB, BPS, WorldPop, BBWS Pemali-Juana, Permen PUPR Nomor 14/PRT/M/2015, Dinas Sumber Daya Air DKI Jakarta, Renas PB 2025–2029, dan Renstra BNPB 2025–2029
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Kolom keyakinan memuat label versi yang dipakai. Versi sekunder tidak dikutip nilainya.

| BESARAN | VERSI DAN NILAI | KEYAKINAN | SEBAB BEDA | YANG DIPAKAI DAN ALASAN |
| --- | --- | --- | --- | --- |
| Penduduk Pulau Jawa | KRB {{angka:airjawa.jawa.penduduk_krb}} jiwa ({{angka:airjawa.jawa.porsi_penduduk_krb_persen|persen}} nasional); WorldPop {{angka:airjawa.jawa.penduduk_worldpop_2026|ringkas}} jiwa; Kota Yogyakarta {{angka:airjawa.kab3471.penduduk_worldpop}} (WorldPop) lawan {{angka:airjawa.kab3471.penduduk_krb}} (KRB) | resmi | sumber dan metode berbeda | KRB sebagai penyebut; WorldPop hanya untuk sebaran di dalam kab/kota |
| Kapasitas Waduk Jatiluhur dan Cirata | dua versi sekunder bertentangan untuk tiap waduk; versi resmi tidak ditemukan | – | artikel sumber berbeda | tidak dikutip; data diminta ke PJT II |
| Tampungan Waduk Kedung Ombo | kapasitas desain {{angka:airjawa.bendungan.kedungombo.vol_normal}}; kapasitas efektif {{angka:airjawa.bendungan.kedungombo.vol_efektif|fmt=1}}; tampungan terukur 2021 {{angka:airjawa.bendungan.kedungombo.tampungan_2021|fmt=2|satuan}} | resmi | tiga besaran berbeda | ditulis dengan nama besarannya |
| Luas DI Jatiluhur bagian Kab. Bekasi | {{angka:airjawa.irigasi.jatiluhur.bekasi_ha|satuan}} (Berita Negara 2015 No. 638 hlm. 16); versi lain dari catatan sekunder | resmi | versi sekunder tidak cocok dengan total DI | angka resmi, karena keempat bagian menjumlah ke total DI {{angka:airjawa.irigasi.jatiluhur.luas_di|satuan}} |
| Sedimentasi waduk BBWS Pemali-Juana | total tercetak {{angka:airjawa.bendungan.pj.sedimentasi_total|fmt=2}}; jumlah baris {{angka:airjawa.bendungan.pj.sedimentasi_jumlah_baris|fmt=3|satuan}} | resmi | selisih di dokumen sumber | keduanya ditulis; selisih dicatat |
| Laju penurunan muka tanah pesisir Jawa Tengah | Kota Pekalongan {{angka:airjawa.turun_tanah.pekalongan.sidiq2023}} dan {{angka:airjawa.turun_tanah.pekalongan.widodo2024|satuan}}; Semarang utara-timur dan Demak {{angka:airjawa.turun_tanah.semarang_demak.aditiya2023|satuan}} | terverifikasi | periode, sensor, statistik, dan arah ukur berbeda | baris terverifikasi berdampingan; tanpa satu angka kota |
| Tanggul pantai National Capital Integrated Coastal Development (NCICD) Fase A | trase kritis {{angka:ncicd.fase_a.trase_kritis_km|satuan}}, kewenangan Pemprov DKI {{angka:ncicd.fase_a.kewenangan_dki_km|satuan}}, terbangun {{angka:ncicd.fase_a.terbangun_km|satuan}} per 17 Juli 2025 [@dsda-2025-ncicd]; versi lain tanpa tanggal | resmi | tanggal data berbeda | versi Dinas Sumber Daya Air DKI Jakarta, berumur sekitar lima belas bulan |
| Cakupan peringatan dini | keterpenuhan sistem {{angka:renstra.sistem_pd_keterpenuhan_persen|persen}} (Renstra hlm. 70); IKP Renstra {{angka:renstra.ikp_peringatan_dini.2025|fmt=2|persen}} ke {{angka:renstra.ikp_peringatan_dini.2029|fmt=2|persen}}; Renas PB 1.c {{angka:renas.indikator_1c.2025}} ke {{angka:renas.indikator_1c.2029|satuan}}; IKP sirene {{angka:renstra.ikp_sirine.2025|fmt=2|persen}} ke {{angka:renstra.ikp_sirine.2029|fmt=2|persen}} | resmi | tiga penyebut berbeda | lintasan IKP Renstra dan Renas PB 1.c berdampingan |
| Pengungsi banjir Jabodetabek awal 2020 | DIBI empat belas kab/kota {{angka:hidromet.jawa.jabodetabek2020.mengungsi_dibi}}; DIBI Jabodetabek dan Lebak {{angka:hidromet.jawa.jabodetabek2020.mengungsi_dibi_lebak}}; Renstra BNPB {{angka:hidromet.jawa.jabodetabek2020.pengungsi_renstra}} | resmi | cakupan wilayah berbeda; rekaman Kota Bekasi {{angka:hidromet.jawa.jabodetabek2020.mengungsi_bekasi}} tidak terbukti | kedua penerbit berdampingan; pembanding Renstra memakai DKI Jakarta ({{angka:hidromet.jawa.jabodetabek2020.mengungsi_dki}}) |
| Kab/kota krisis air bersih 2023 | DIBI mencatat kekeringan di {{angka:airjawa.kekeringan.kab_2023}} dari {{angka:airjawa.jawa.n_kab}} kab/kota; angka krisis air bersih dari kutipan media | resmi | definisi berbeda | DIBI; angka media tidak dikutip |
| IRBI provinsi terendah 2023 | Renas PB hlm. 19: DKI Jakarta, Papua Pegunungan, DI Yogyakarta; Renstra BNPB Tabel 1.1: Kepulauan Riau {{angka:irbi.prov2023.kepri|fmt=2}} di bawah DI Yogyakarta {{angka:irbi.prov2023.diy|fmt=2}} | resmi | dua dokumen resmi bertentangan | keduanya ditulis berdampingan |
| IPA Pulau Jawa 2010 | {{angka:airjawa.jawa.ipa_2010_persen|persen}} dengan aliran pemeliharaan; {{angka:airjawa.jawa.ipa_2010_tanpa_pemeliharaan_persen|persen}} tanpa aliran pemeliharaan | estimasi-model | sumber sama, definisi berbeda | ditulis dengan nama besarannya |
:::

::: tabel {#tbl:keterbatasan}
judul: Indikator dan data yang belum dapat ditarget beserta lembaga pemegangnya, kajian air Pulau Jawa, data per 2026
sumber: Analisis kajian ini atas data DIBI BNPB, InaRISK BNPB, BPS, BMKG, dan Kementerian Pekerjaan Umum
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026

| INDIKATOR ATAU DATA | STATUS | PENYAJIAN DALAM KAJIAN | PEMEGANG DATA |
| --- | --- | --- | --- |
| Air minum layak per kab/kota di DKI Jakarta, Jawa Barat, DI Yogyakarta, Jawa Timur, dan Banten | tabel BPS provinsi tidak termuat | tingkat provinsi berlabel | BPS provinsi |
| Kondisi jaringan irigasi per DI; pemutakhiran status DI setelah 2015 | tidak ditemukan | garis dasar 2015 berlabel | Kementerian Pekerjaan Umum (Direktorat Jenderal Sumber Daya Air) |
| Inventaris bendungan lengkap; sedimentasi di luar BBWS Pemali-Juana | tidak ditemukan | titik berpita; baris sekunder terpisah | BBWS; PJT I; PJT II |
| Air tanah per kab/kota; zona konservasi CAT; rilis primer status CAT | tidak ditemukan terbuka | tidak dipakai sebagai syarat daftar perhatian | Kementerian ESDM (Badan Geologi) |
| Laju penurunan muka tanah terukur per kab/kota | belum ditarik | kota tanpa titik ukur ditulis belum diukur | pemegang data GNSS |
| Neraca air dan IPA per WS; batas WS vektor | tidak ditemukan dalam data kajian | IPA per pulau sebagai konteks; Pola dan Rencana Pengelolaan Sumber Daya Air dirujuk | Kementerian Pekerjaan Umum |
| Debit sungai Jawa | tidak ada titik | permintaan data | Kementerian Pekerjaan Umum (BBWS) |
| Luas genangan rob | tidak ada | kab/kota berkejadian rob DIBI | BMKG; Badan Informasi Geospasial |
| Penduduk BPS per kab/kota | gagal ditarik | penyebut penduduk KRB | BPS |
| Awal musim per zona musim ke kab/kota | belum diolah | tingkat provinsi | BMKG |
| Distribusi air kemarau; status darurat; desa terdampak | tidak ada di DIBI | permintaan data (@rek:r-a03) | Badan Penanggulangan Bencana Daerah (BPBD) |
| Puso per kab/kota; kalender tanam | belum ditarik | permintaan data | Kementerian Pertanian; BPS |
:::

::: tabel {#tbl:kuantifikasi}
judul: Ketersediaan kuantifikasi per jenis bahaya dan besaran skenario, Pulau Jawa, 2008–2026
sumber: Pengolahan Pantau Bencana dari DIBI BNPB, InaRISK BNPB (KRB 2022–2026), dan Bappenas (2007)
keyakinan: asumsi-kebijakan
catatan: R resmi; T turunan; E estimasi model; – tidak dikuantifikasi.

| JENIS | MENINGGAL DAN HILANG | PENGUNGSI | RUMAH RUSAK | LUAS | KERUGIAN MATERIIL | KEMUNGKINAN |
| --- | --- | --- | --- | --- | --- | --- |
| Banjir | R tercatat; E pita | R | R | R (bahaya tinggi KRB, batas atas) | R (aset terpapar KRB; kejadian analog 2007) | T |
| Banjir bandang | R tercatat; E pita | R | R | R (KRB) | R (KRB); T stimulan | T |
| Tanah longsor | R tercatat; E pita | R | R | R (KRB) | R (KRB); T stimulan | T |
| Cuaca ekstrem | R tercatat; E pita | R | R | – | R (KRB) | T |
| Gelombang ekstrem dan abrasi | R tercatat; E pita | R | R | R (KRB); E laju garis pantai lima situs | R (KRB) | T |
| Rob | R tercatat (nol) | R | R | – | – | – |
| Kekeringan | – | – | – | R (bahaya tinggi KRB) | R (KRB) | T (terdampak) |
| Penurunan muka tanah | – | – | – | – | – | – |
:::

::: tabel {#tbl:irbi-dibi}
judul: Korelasi peringkat IRBI 2025 dan kejadian DIBI 2015–2025 per kab/kota di Pulau Jawa menurut bahaya
sumber: Pengolahan Pantau Bencana dari InaRISK BNPB (IRBI 2025) dan DIBI BNPB 2015–2025
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Spearman IRBI 2025 per bahaya lawan kejadian DIBI per kab/kota; yang tidak dinilai IRBI tidak dihitung.
angka: 2; 3; 4

| BAHAYA | KAB/KOTA DINILAI | NILAI UNIK IRBI 2025 | KORELASI SPEARMAN | CATATAN |
| --- | ---: | ---: | ---: | --- |
| Kekeringan | {{angka:airjawa.jawa.n_kab}} | {{angka:airjawa.jawa.irbi2025.kekeringan_nilai_unik}} | {{angka:airjawa.jawa.spearman_irbi_dibi.kekeringan|fmt=2}} | median IRBI {{angka:airjawa.jawa.irbi2025.kekeringan_median}} |
| Banjir | {{angka:airjawa.jawa.irbi2025.banjir_n_dinilai}} | {{angka:airjawa.jawa.irbi2025.banjir_nilai_unik}} | {{angka:airjawa.jawa.spearman_irbi_dibi.banjir|fmt=2}} | Kab. Adm. Kepulauan Seribu tidak dinilai |
| Tanah longsor | {{angka:airjawa.jawa.irbi2025.longsor_n_dinilai}} | {{angka:airjawa.jawa.irbi2025.longsor_nilai_unik}} | {{angka:airjawa.jawa.spearman_irbi_dibi.longsor|fmt=2}} | {{angka:airjawa.jawa.irbi2025.longsor_kosong_berkejadian}} kab/kota tidak dinilai tetapi berkejadian |
:::

## Tabel Pendukung Bab 8 Grand Design dan Strategi {#sub:f-bab08}


::: tabel {#tbl:agenda-bukti}
judul: Agenda bukti program air berjalan di Pulau Jawa, garis dasar, pembanding, ukuran hasil, dan tahun hasil, 2026–2030
sumber: Kompendium program Pantau Bencana; Perban BNPB 7/2025; Perpres 12/2024; PP 37/2010; Perban BNPB 2/2024; analisis kajian ini
keyakinan: asumsi-kebijakan
data_per: 24 Okt 2026
catatan: Semua kolom metode usulan penyusun; – pembanding tidak tersedia.

| PROGRAM | GARIS DASAR | PEMBANDING | UKURAN HASIL | PEMIMPIN; UNIT BNPB | TAHUN HASIL |
| --- | --- | --- | --- | --- | --- |
| Destana di desa rawan kekeringan dan longsor | swapenilaian Perban BNPB 7/2025 diverifikasi penilai independen; instrumen desa belum dibina harus dibentuk 2027 | desa rawan sejenis yang belum dibina, dinilai dengan instrumen yang sama | perubahan tingkat ketangguhan; meninggal, hilang, dan menderita per desa bila data desa tersedia | Kementerian Desa dan Pembangunan Daerah Tertinggal, BNPB, Kementerian Sosial; Direktorat Kesiapsiagaan | 2030 |
| PAMSIMAS di desa rawan kekeringan | fungsi sistem saat kemarau 2026 | desa tanpa PAMSIMAS di kab yang sama | desa yang meminta distribusi air darurat saat kemarau 2027 | Kementerian PU; Direktorat Mitigasi Bencana | 2027–2028 |
| OMC untuk tampungan waduk | catatan sortie terbuka mulai musim berikut | hari dan DAS tanpa penerbangan; stasiun kontrol | curah hujan dan aliran masuk waduk sasaran | BMKG; data dan koordinasi oleh BNPB | evaluasi 2029 |
| Sekolah Lapang Iklim dan kalender tanam | produksi peserta dan nonpeserta pada musim yang sama | lahan pembanding varietas sama | produksi per hektare dan puso | BMKG, Kementan; Direktorat Mitigasi Bencana | 2028 |
| Embung dan panen air hujan | inventaris volume dan fungsi embung | desa sejenis tanpa embung di kab yang sama | desa yang meminta distribusi air darurat saat kemarau | Kementan, Kementerian PU; Direktorat Mitigasi Bencana | 2029 |
| Citarum Harum | deret indeks kualitas air resmi yang konsisten antarsumber | deret sebelum program | indeks kualitas air per segmen sungai | pemda; Direktorat Mitigasi Bencana | 2029 |
| Sumur resapan | peta kelayakan hidrogeologi | kawasan tanpa sumur resapan | genangan terukur | pemda; tanpa unit pelaksana BNPB | 2029 |
| Polder dan pompa | inventaris kapasitas dan keandalan pompa | musim sebelum perbaikan | luas dan lama genangan | Kementerian PU, pemda; Direktorat Mitigasi Bencana | 2029 |
| Sodetan dan bendungan kering Ciliwung | data debit dan genangan BBWS 2025 | kejadian sebelum operasi | luas dan lama genangan di kelurahan sasaran | Kementerian PU; Direktorat Mitigasi Bencana | 2028 |
| RTD bendungan dengan keikutsertaan BPBD hilir | garis dasar 2027 | bendungan yang RTD-nya belum melibatkan BPBD | gladi bersama BPBD hilir; waktu peringatan | Pemilik bendungan; Direktorat Kesiapsiagaan | 2029 |
| Peringatan dini berfungsi | garis dasar per kab/kota Jawa | – | alat terpelihara, pesan sampai warga, gladi tahunan | Direktorat Peringatan Dini | 2029 |
:::

::: tabel {#tbl:studi-kasus-pamsimas}
judul: Studi kasus PAMSIMAS: layanan air perdesaan dan ketahanan sumbernya saat kemarau, 2008–2023
sumber: Ringkasan laporan penyelesaian Bank Dunia PAMSIMAS III [@rwsn-2023-pamsimas]; evaluasi independen PAMSIMAS untuk Departemen Luar Negeri dan Perdagangan Australia [@dfat-2023-pamsimas]; kompendium program Pantau Bencana
keyakinan: terverifikasi
data_per: 24 Okt 2026

| LABEL | ISI |
| --- | --- |
| Masalah | Sistem air perdesaan kekurangan air pada pemakaian puncak atau kemarau walau tercatat berfungsi penuh |
| Pelaksana | Kementerian PU dengan pengelola tingkat desa; peran BNPB data dan KRB |
| Cara | Pembangunan dan rehabilitasi sistem air oleh masyarakat dengan iuran pengelola desa |
| Hasil | {{angka:bukti.p13.jiwa_terlayani|satuan}} terlayani di lebih dari {{angka:bukti.p13.desa|satuan}}; {{angka:bukti.p13.berfungsi_persen|persen}} sistem tercatat berfungsi baik; evaluator independen menemukan kekurangan air saat kemarau |
:::

## Tabel Pendukung Bab 4 Kondisi Sumber Daya Air {#sub:f-bab04}


::: tabel {#tbl:celah-air}
judul: Data kondisi sumber daya air Pulau Jawa yang belum tersedia dan lembaga pemegangnya, status Oktober 2026
sumber: Pemeriksaan ketersediaan data kajian ini atas Subbab 4.1 sampai Subbab 4.7, sampai 24 Oktober 2026
keyakinan: asumsi-kebijakan

| YANG BELUM TERSEDIA | PEMEGANG DATA | TINDAK LANJUT |
| --- | --- | --- |
| Sumber air minum per kabupaten/kota di luar Jawa Tengah dan cakupan SPAM perpipaan per kabupaten/kota | BPS provinsi; Kementerian PU | belum ada pemilik di BNPB; tetap sebagai permintaan data |
| Volume distribusi air bersih dan desa terdampak per kabupaten/kota saat kemarau | BPBD provinsi | @rek:r-a03 |
| Kondisi jaringan per daerah irigasi dan luas terairi sesudah 2015 | Kementerian PU; Kementerian Pertanian; Kementerian Agraria dan Tata Ruang/Badan Pertanahan Nasional (ATR/BPN) | @rek:r-a14 |
| Tampungan terukur, sedimentasi, instrumen, klasifikasi bahaya, dan RTD bendungan di luar BBWS Pemali-Juana | Kementerian PU; PJT I; PJT II | @rek:r-a14 |
| Dokumen penetapan status CAT, zona konservasi, muka air tanah, dan pengambilan berizin per kabupaten/kota | Kementerian ESDM (Badan Geologi) | @rek:r-a14 |
| Laju vertikal penurunan muka tanah per kota pesisir utara, termasuk Cirebon, Bekasi, Subang, dan Surabaya | BIG; Kementerian ESDM (Badan Geologi) | @rek:r-a14 |
| Pola dan RPSDA WS Pemali-Comal, neraca per kabupaten/kota, pos duga air, dan tutupan lahan hulu per DAS | Kementerian PU; Badan Meteorologi, Klimatologi, dan Geofisika (BMKG); Kementerian Kehutanan; Kementerian Lingkungan Hidup/Badan Pengendalian Lingkungan Hidup (KLH/BPLH) | belum ada pemilik di BNPB; tetap sebagai permintaan data |
:::

## Tabel Pendukung Bab 6 Profil Risiko Musim Hujan {#sub:f-bab06}


::: tabel {#tbl:analog-elnino}
judul: Musim hujan setelah El Niño kuat di Pulau Jawa dan lantai yang tetap berlaku untuk musim 2026/2027
sumber: DIBI BNPB 2008–2026; NOAA CPC, ONI; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
angka: 2; 3; 4; 5
catatan: Lantai korban musim 2008/2009 (didominasi banjir) dan lantai pengungsi musim 2013/2014.

| MUSIM | ONI NDJ | MENINGGAL DAN HILANG (jiwa) | LONGSOR (jiwa) | MENGUNGSI (jiwa) |
| --- | ---: | ---: | ---: | ---: |
| 2009/2010 | {{angka:hidromet.jawa.pasca_elnino.oni_2009|fmt=2}} | {{angka:hidromet.jawa.pasca_elnino.mh_2009}} | {{angka:hidromet.jawa.musim_2009.longsor_mh}} | {{angka:hidromet.jawa.pasca_elnino.mengungsi_2009}} |
| 2015/2016 | {{angka:hidromet.jawa.pasca_elnino.oni_2015|fmt=2}} | {{angka:hidromet.jawa.pasca_elnino.mh_2015}} | {{angka:hidromet.jawa.musim_2015.longsor_mh}} | {{angka:hidromet.jawa.pasca_elnino.mengungsi_2015}} |
| 2023/2024 | {{angka:hidromet.jawa.pasca_elnino.oni_2023|fmt=2}} | {{angka:hidromet.jawa.pasca_elnino.mh_2023}} | {{angka:hidromet.jawa.musim_2023.longsor_mh}} | {{angka:hidromet.jawa.pasca_elnino.mengungsi_2023}} |
| Lantai, tetap berlaku | – | {{angka:hidromet.jawa.lantai.meninggal_hilang}} | – | {{angka:hidromet.jawa.musim_2013.mengungsi}} |
:::

::: tabel {#tbl:bahan-pesisir}
judul: Bahan skenario gelombang ekstrem, abrasi, dan rob pesisir utara Pulau Jawa, 2015–2030
sumber: DIBI BNPB 2015–2026; KRB BNPB 2022–2026; RPSDA WS Jratunseluna 2024; Susilo dkk. (2023); Aditiya dan Ito (2023); pengolahan Pantau Bencana
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Luas rawan rob hanya WS Jratunseluna; WS lain tidak dikuantifikasi.

| BESARAN | NILAI | KEYAKINAN |
| --- | --- | --- |
| Meninggal dan hilang gelombang ekstrem dan abrasi, 2015–2026 | {{angka:dibi.jawa.gelombang_abrasi.meninggal_2015_2026}} meninggal; {{angka:dibi.jawa.gelombang_abrasi.hilang_2015_2026}} hilang | resmi |
| Terpapar gelombang ekstrem dan abrasi | {{angka:hidromet.jawa.gelombang_abrasi.krb_terpapar|satuan}} | resmi |
| Kabupaten/kota berkejadian rob, 2015–2025 | {{angka:dibi.jawa.rob.n_kab_2015_2025|satuan}} | resmi |
| Terdampak rob Kota Pekalongan, 2015–2025 | {{angka:dibi.kotapekalongan.rob.terdampak_2015_2025|satuan}} | resmi |
| Luas rawan rob WS Jratunseluna, simulasi pasang acuan RPSDA | {{angka:airjawa.rob.jratunseluna.luas_rawan_ha|satuan}} | estimasi-model |
| Tambahan penurunan muka tanah 2026–2030, GNSS Kota Pekalongan | {{angka:airjawa.turun_tanah.pekalongan.tambahan_2026_2030_gnss|satuan}} | asumsi-kebijakan |
| Tambahan penurunan muka tanah 2026–2030, Semarang utara-timur dan Demak | {{angka:airjawa.turun_tanah.semarang_demak.tambahan_2026_2030|satuan}} | asumsi-kebijakan |
| Luas genangan rob teramati | – | tidak dikuantifikasi: data teramati tidak tersedia |
:::

::: tabel {#tbl:garis-dasar}
judul: Garis dasar Pulau Jawa yang harus dibentuk atau dikutip, pemegang data, dan tenggat, 2026–2027
sumber: Perban BNPB 2/2024; PP 37/2010; lampiran petunjuk teknis DAK irigasi [@djpk-2024-dak-irigasi]; Susilo dkk. (2023); RPSDA Jratunseluna 2024; analisis kajian ini
keyakinan: asumsi-kebijakan
data_per: 24 Okt 2026
catatan: Kolom dasar resmi; bentuk garis dasar dan tenggat usulan penyusun; neraca air dikutip, tidak dihitung.

| GARIS DASAR | DASAR | PEMEGANG DATA | TENGGAT |
| --- | --- | --- | --- |
| Cakupan peringatan dini per kab/kota Jawa | Perban BNPB 2/2024 Pasal 3 dan Pasal 25 | Direktorat Peringatan Dini; BPBD | 2027 |
| Bendungan hulu permukiman yang RTD-nya disusun dengan keikutsertaan BPBD hilir | PP 37/2010 Pasal 52 dan Penjelasan (wajib) | Pembangun dan Pemilik bendungan; Direktorat Kesiapsiagaan | 2027 |
| RTD yang sudah dipakai di rencana kontinjensi BPBD hilir | usulan penyusun; Perban BNPB 2/2023 | BPBD; Direktorat Kesiapsiagaan | 2027 |
| Desa terdampak kekeringan dan liter air tersalur per kab/kota per musim | Perka BNPB 7/2008; UU 24/2007 Pasal 53 | BPBD; Pusat Data, Informasi, dan Komunikasi Kebencanaan | 2027 |
| Laju penurunan muka tanah terukur per kota pesisir utara | pengukuran resmi berkala belum ada | Badan Geologi; Badan Informasi Geospasial | 2027 |
| Kondisi jaringan daerah irigasi kewenangan daerah usulan DAK | lampiran petunjuk teknis DAK irigasi (e-PAKSI) | pemda | 2027 |
| Neraca air per wilayah sungai | Pola dan RPSDA {{angka:airjawa.ws.n_pola_rpsda|satuan}} kewenangan pusat | Kementerian PU | dikutip |
:::
