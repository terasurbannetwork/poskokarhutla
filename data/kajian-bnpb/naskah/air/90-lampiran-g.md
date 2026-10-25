---
kajian: air
lampiran: G
judul: Daftar Perhatian per Bahaya
status: final
---

# Daftar Perhatian per Bahaya {#lamp:perhatian}

Daftar perhatian memuat {{angka:perhatian.air.kekeringan.n}} kab/kota untuk kekeringan, {{angka:perhatian.air.banjir.n}} untuk banjir, dan {{angka:perhatian.air.longsor.n}} untuk tanah longsor menurut aturan dua syarat @sub:daftar [@bnpb-irbi; @bnpb-dibi]. Daftar ini bukan peringkat dan diurutkan menurut kode wilayah. Varian aturan dan selisih jumlahnya ada di @tbl:daftar-perhatian, sedangkan kabupaten yang masuk ketiga daftar ada di @tbl:perhatian-instrumen.

::: tabel {#tbl:g-kekeringan}
judul: Kab/kota daftar perhatian kekeringan di Pulau Jawa menurut kode wilayah, 2015–2025
csv: data/turunan/daftar_perhatian.csv
saring: kajian=air; bahaya=kekeringan; masuk=True
urut: kode
kolom: nama="KAB/KOTA"; irbi2025="IRBI 2025" fmt=0; n_tahun_dibi="TAHUN TERCATAT 2015–2025" fmt=0; meninggal_hilang_2015_2025="MENINGGAL DAN HILANG (jiwa)" fmt=0; mengungsi_2015_2025="MENGUNGSI (jiwa)" fmt=0; n_syarat="SYARAT DIPENUHI" fmt=0
sumber: Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025, DIBI BNPB 2015–2025, dan Permen PUPR 14/2015
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Aturan dan ambang asumsi kebijakan; IRBI dan DIBI resmi; syarat DI kewenangan pusat ikut dihitung.
:::

::: tabel {#tbl:g-banjir}
judul: Kab/kota daftar perhatian banjir di Pulau Jawa menurut kode wilayah, 2015–2025
csv: data/turunan/daftar_perhatian.csv
saring: kajian=air; bahaya=banjir; masuk=True
urut: kode
kolom: nama="KAB/KOTA"; irbi2025="IRBI 2025" fmt=0; n_tahun_dibi="TAHUN TERCATAT 2015–2025" fmt=0; meninggal_hilang_2015_2025="MENINGGAL DAN HILANG (jiwa)" fmt=0; mengungsi_2015_2025="MENGUNGSI (jiwa)" fmt=0; n_syarat="SYARAT DIPENUHI" fmt=0
sumber: Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025, dan DIBI BNPB 2015–2025
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Aturan dan ambang asumsi kebijakan; IRBI dan DIBI resmi; syarat status darurat berulang belum diisi.
:::

::: tabel {#tbl:g-longsor}
judul: Kab/kota daftar perhatian tanah longsor di Pulau Jawa menurut kode wilayah, 2015–2025
csv: data/turunan/daftar_perhatian.csv
saring: kajian=air; bahaya=longsor; masuk=True
urut: kode
kolom: nama="KAB/KOTA"; irbi2025="IRBI 2025" fmt=0; n_tahun_dibi="TAHUN TERCATAT 2015–2025" fmt=0; meninggal_hilang_2015_2025="MENINGGAL DAN HILANG (jiwa)" fmt=0; mengungsi_2015_2025="MENGUNGSI (jiwa)" fmt=0; n_syarat="SYARAT DIPENUHI" fmt=0
sumber: Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025, dan DIBI BNPB 2015–2025
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Aturan dan ambang asumsi kebijakan; IRBI dan DIBI resmi; IRBI longsor tidak dinilai bersel kosong.
:::

## Tabel Pendukung Bab 5 Profil Risiko Musim Kemarau {#sub:g-bab05}


::: tabel {#tbl:banding-irbi-dibi}
judul: Nilai IRBI 2025, luas bahaya kekeringan kelas tinggi KRB, dan catatan DIBI 2015–2025 di lima kab/kota Pulau Jawa
sumber: InaRISK BNPB, IRBI 2025 dan KRB 2022–2026; pengolahan data Pantau Bencana dari DIBI BNPB 2015–2025
keyakinan: resmi
data_per: 24 Okt 2026
catatan: Urut kode wilayah; varian dasar; varian syarat (c) jiwa terdampak memasukkan Blora, Kendal, Gunungkidul.

| KAB/KOTA | IRBI 2025 | LUAS BAHAYA TINGGI KRB (ha) | TAHUN BERKEJADIAN 2015–2025 | TERDAMPAK 2015–2025 (jiwa) | DAFTAR PERHATIAN |
| --- | ---: | ---: | ---: | ---: | --- |
| Kabupaten Sukabumi | {{angka:airjawa.sukabumi.irbi2025_kekeringan}} | {{angka:airjawa.sukabumi.krb_kekeringan_luas_tinggi}} | {{angka:airjawa.sukabumi.dibi_tahun_kekeringan_1525}} | {{angka:airjawa.sukabumi.terdampak_kekeringan_1525}} | masuk |
| Kabupaten Blora | {{angka:airjawa.blora.irbi2025_kekeringan}} | {{angka:airjawa.blora.krb_kekeringan_luas_tinggi}} | {{angka:airjawa.blora.dibi_tahun_kekeringan_1525}} | {{angka:airjawa.blora.terdampak_kekeringan_1525}} | tidak masuk |
| Kabupaten Kendal | {{angka:airjawa.kendal.irbi2025_kekeringan}} | {{angka:airjawa.kendal.krb_kekeringan_luas_tinggi}} | {{angka:airjawa.kendal.dibi_tahun_kekeringan_1525}} | {{angka:airjawa.kendal.terdampak_kekeringan_1525}} | tidak masuk |
| Kota Semarang | {{angka:airjawa.kota_semarang.irbi2025_kekeringan}} | {{angka:airjawa.kota_semarang.krb_kekeringan_luas_tinggi}} | {{angka:airjawa.kota_semarang.dibi_tahun_kekeringan_1525}} | {{angka:airjawa.kota_semarang.terdampak_kekeringan_1525}} | tidak masuk |
| Kabupaten Gunungkidul | {{angka:airjawa.gunungkidul.irbi2025_kekeringan}} | {{angka:airjawa.gunungkidul.krb_kekeringan_luas_tinggi}} | {{angka:airjawa.gunungkidul.dibi_tahun_kekeringan_1525}} | {{angka:airjawa.gunungkidul.terdampak_kekeringan_1525}} | tidak masuk |
:::

## Tabel Pendukung Bab 8 Grand Design dan Strategi {#sub:g-bab08}


::: tabel {#tbl:perhatian-instrumen}
judul: Kabupaten yang masuk tiga daftar perhatian kajian air dan instrumen daerah yang diminta statusnya, Pulau Jawa 2026
sumber: Pengolahan data Pantau Bencana dari IRBI BNPB 2025 dan DIBI BNPB (daftar perhatian); Perban BNPB 3/2026, 9/2025, 2/2023; Juklak BNPB 4/2026–7/2026
keyakinan: asumsi-kebijakan
data_per: 24 Okt 2026
catatan: Urut kode wilayah, bukan peringkat; semua sel instrumen berstatus permintaan data.

| PROVINSI | KABUPATEN DI TIGA DAFTAR | INSTRUMEN YANG DIMINTA STATUSNYA |
| --- | --- | --- |
| Jawa Barat | Bogor, Sukabumi, Cianjur, Bandung, Tasikmalaya, Cirebon, Subang, Purwakarta, Karawang, Bekasi, Bandung Barat | RPBD; RPKB; rencana kontinjensi kekeringan, banjir, longsor; SPM |
| Jawa Tengah | Cilacap, Banyumas, Kebumen, Purworejo, Magelang, Jepara, Batang, Pekalongan, Pemalang | RPBD; RPKB; rencana kontinjensi kekeringan, banjir, longsor; SPM |
| Jawa Timur | Ponorogo, Jember, Jombang, Nganjuk, Madiun, Bojonegoro | RPBD; RPKB; rencana kontinjensi kekeringan, banjir, longsor; SPM |
| Banten | Serang | RPBD; RPKB; rencana kontinjensi kekeringan, banjir, longsor; SPM |
:::

::: tabel {#tbl:daftar-perhatian-kekeringan}
judul: Daftar perhatian kekeringan kab/kota di Pulau Jawa menurut syarat, 2015–2025
sumber: Pengolahan data Pantau Bencana dari IRBI BNPB 2025, DIBI BNPB 2015–2025, dan Permen PUPR 14/2015
keyakinan: asumsi-kebijakan
data_per: 24 Okt 2026
catatan: Syarat (a) IRBI kelas teratas, (b) DIBI tiga tahun atau lebih, (d) DI pusat; urut kode, bukan peringkat.

| SYARAT | JUMLAH (kab/kota) | KAB/KOTA |
| --- | ---: | --- |
| (a), (b), dan (d) | {{angka:perhatian.air.kekeringan.n_abd}} | Sukabumi, Cianjur, Ciamis, Cirebon, Karawang, Kota Tasikmalaya, Purbalingga, Klaten, Jepara, Temanggung, Pekalongan, Ngawi, Serang |
| (b) dan (d) | {{angka:perhatian.air.kekeringan.n_bd}} | Bogor, Majalengka, Indramayu, Subang, Bekasi, Cilacap, Banyumas, Kebumen, Purworejo, Magelang, Sragen, Grobogan, Rembang, Pati, Demak, Pemalang, Tegal, Ponorogo, Blitar, Jember, Bondowoso, Situbondo, Nganjuk, Magetan, Bojonegoro, Tuban |
| (a) dan (d) | {{angka:perhatian.air.kekeringan.n_ad}} | Tasikmalaya, Karanganyar, Batang, Kota Magelang, Kota Pekalongan, Sleman, Jombang, Madiun, Kota Mojokerto |
| (a) dan (b) | {{angka:perhatian.air.kekeringan.n_ab}} | Bandung, Purwakarta, Bandung Barat, Boyolali, Semarang |
:::

## Tabel Pendukung Bab 6 Profil Risiko Musim Hujan {#sub:g-bab06}


::: tabel {#tbl:perhatian-longsor}
judul: Kabupaten/kota daftar perhatian tanah longsor di Pulau Jawa yang memenuhi tiga syarat, menurut kode wilayah, 2015–2025
csv: data/turunan/daftar_perhatian.csv
saring: kajian=air; bahaya=longsor; n_syarat=3
urut: kode
kolom: nama="KAB/KOTA"; irbi2025="IRBI 2025" fmt=0; n_tahun_dibi="TAHUN TERCATAT 2015–2025" fmt=0; meninggal_hilang_2015_2025="MENINGGAL DAN HILANG 2015–2025 (jiwa)" fmt=0; n_syarat="SYARAT DIPENUHI" fmt=0
sumber: Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025, dan DIBI BNPB 2015–2025
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Bukan peringkat; aturan Subbab 3.5 berlabel asumsi kebijakan; syarat status darurat berulang belum diisi.
:::

::: tabel {#tbl:perhatian-banjir}
judul: Kabupaten/kota daftar perhatian banjir di Pulau Jawa yang memenuhi tiga syarat, menurut kode wilayah, 2015–2025
csv: data/turunan/daftar_perhatian.csv
saring: kajian=air; bahaya=banjir; n_syarat=3
urut: kode
kolom: nama="KAB/KOTA"; irbi2025="IRBI 2025" fmt=0; n_tahun_dibi="TAHUN TERCATAT 2015–2025" fmt=0; meninggal_hilang_2015_2025="MENINGGAL DAN HILANG 2015–2025 (jiwa)" fmt=0; mengungsi_2015_2025="MENGUNGSI 2015–2025 (jiwa)" fmt=0
sumber: Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025, dan DIBI BNPB 2015–2025
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: Kabupaten Bekasi dan Kota Pekalongan (empat syarat) tidak tampil; daftar lengkap di Lampiran G.
:::
