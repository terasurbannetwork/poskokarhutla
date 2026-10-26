---
kajian: mitigasi
lampiran: C
judul: Kartu Skenario dan Keluaran Model per Jenis
status: final
---

# Kartu Skenario dan Keluaran Model per Jenis {#lamp:skenario}

Kartu skenario terburuk yang masuk akal untuk kelima belas jenis bencana dimuat lengkap di Bab 6 sampai Bab 9; @tbl:c-indeks menunjukkan letak tiap kartu dan variannya. Lampiran ini menambahkan keluaran model yang tidak dipakai sebagai angka utama di kartu: pita korban dan kerugian skenario gempa dan gunung api dari platform Pantau Bencana, serta keluaran mesin hidrometeorologi per musim [@pantaubencana-2026-skenario-geologi; @bnpb-dibi]. Pita ditulis utuh tanpa dipotong ke lantai tercatat; lantai tercatat tetap angka utama di kartu (@sub:skenario). Varian a memodelkan jenis alam dengan kemungkinan dan kepekaan. Varian b dan c memakai kejadian analog berangka tanpa perkalian. Rob dimuat dalam kartu gelombang ekstrem dan abrasi.

**Pernyataan produsen.** Keluaran di lampiran ini dihasilkan platform Pantau Bencana dari data terbuka, bukan oleh unit kerja BNPB, sehingga bukan Data Bencana menurut Perban BNPB 1/2023 [@bnpb-2023-satudata]. Galat validasi silang mesin korban gempa {{angka:geologi.mesin.faktor_loo|fmt=1}} kali, dan model memberi {{angka:geologi.mesin.yogya2006_model}} korban untuk Yogyakarta 2006, padahal tercatat {{angka:usgs.yogya2006.meninggal}} [@usgs-usp000ej1c]. Korban tsunami model dan faktor evakuasi interpolasi paket tidak dimuat, karena korban tsunami belum dapat dihitung dari genangan resmi (@sub:rekonsiliasi). Rumah terdampak gempa dihitung dari jiwa dibagi {{angka:geologi.asumsi.jiwa_per_rumah|fmt=1}} jiwa per rumah, bukan dari data bangunan.

::: tabel {#tbl:c-indeks}
judul: Letak kartu skenario terburuk per jenis bencana dan sumber keluaran model, kajian mitigasi 2026
sumber: Bab 6 sampai Bab 9 kajian ini; NASKAH-SPEK varian kartu skenario
keyakinan: asumsi-kebijakan
catatan: Varian a alam dimodelkan; b nonalam dan c sosial memakai kejadian analog tanpa perkalian.

| JENIS | KARTU | VARIAN | KELUARAN MODEL DI LAMPIRAN INI |
| --- | --- | --- | --- |
| Gempa bumi megathrust | @tbl:kartu-megathrust-jawa; @tbl:kartu-megathrust-mentawai | a | @tbl:c-geologi |
| Gempa bumi sesar darat | @tbl:kartu-sesar-darat | a | tidak ada; skenario sesar darat belum dijalankan |
| Tsunami | @tbl:kartu-tsunami | a | paparan pesisir rendah di @tbl:c-geologi; korban tidak dihitung |
| Gunung api | @tbl:kartu-gunungapi | a | @tbl:c-geologi |
| Likuefaksi | @tbl:kartu-majemuk | a | tidak ada; kartu memakai analog Sulawesi Tengah 2018 |
| Banjir dan banjir bandang | @tbl:hm-kartu-banjir | a | @tbl:c-lanina; @tbl:c-terberat |
| Tanah longsor | @tbl:hm-kartu-longsor | a | @tbl:c-lanina; @tbl:c-terberat |
| Cuaca ekstrem | @tbl:hm-kartu-cuaca | a | @tbl:c-lanina; @tbl:c-terberat |
| Gelombang ekstrem, abrasi, dan rob | @tbl:hm-kartu-gelombang | a | @tbl:c-gelombang |
| Kekeringan | @tbl:hm-kartu-kekeringan | a | @tbl:c-kekeringan |
| Karhutla | @tbl:hm-kartu-karhutla | a | @tbl:c-karhutla |
| Musim hujan, kartu agregat | @tbl:hm-kartu-terburuk; @tbl:hm-kartu-2026 | a | @tbl:c-lantai; @tbl:c-pasca-elnino |
| Epidemi dan pandemi | @tbl:kartu-pandemi | b | tidak ada; analog COVID-19 |
| Kebakaran industri dan kegagalan teknologi | @tbl:kartu-industri | b | tidak ada; analog Plumpang 2023 |
| Kebakaran TPA | @tbl:kartu-tpa | b | tidak ada; analog kemarau 2023 |
| Konflik sosial | @tbl:kartu-sosial | c | tidak ada; analog Maluku dan Maluku Utara 1999–2002 |
:::

## Keluaran Model Geologi {#sub:c-geologi}

**Pita korban dan kerugian megathrust dari platform semuanya lebih lebar dari satu orde besaran, sehingga angkanya hanya tampil di lampiran ini** (@tbl:c-geologi). Skenario ilustratif megathrust Jawa di bawah magnitudo maksimum tidak menghasilkan intensitas VII di pusat kecamatan mana pun, dan skenario Sumba tidak memiliki sumber magnitudo. Baris erupsi memakai pola historis Merapi 2010 dan Semeru 2021. Kerugian materiil batas bawah memakai stimulan rumah dan berlabel asumsi kebijakan.

::: tabel {#tbl:c-geologi}
judul: Keluaran model skenario gempa dan gunung api platform Pantau Bencana menurut skenario dan butir, estimasi 2026
csv: data/turunan/lampiran_geologi_model.csv
kolom: skenario="SKENARIO"; butir="BUTIR"; rendah="RENDAH" fmt=ringkas; tengah="TENGAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
grup: SKENARIO
sumber: Platform Pantau Bencana, mesin guncangan, kerusakan, dan sapuan erupsi; WorldPop 2026; KRB PVMBG; DIBI BNPB
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Rendah, tengah, dan tinggi adalah pita model; sel "–" tidak dihitung.
:::

## Keluaran Mesin Hidrometeorologi {#sub:c-hidromet}

**Pita model musim La Niña berbatas tinggi lebih dari dua kali korban tercatat musim analognya, sedangkan pita musim terberat berada di bawah lantai tercatat, sehingga kedua pita hanya pembanding musim berat tipikal** (@sub:skenario). Nama metrik ditulis sesuai paket data agar dapat dilacak, dan baris tahun analog dimuat di judul tabel; baris resmi adalah angka DIBI musim analog, dan baris estimasi model adalah keluaran rasio korban yang belum diuji balik [@bnpb-dibi].

::: tabel {#tbl:c-lanina}
judul: Catatan DIBI dan keluaran mesin untuk musim hujan La Niña 2020/2021 tingkat nasional
csv: data/turunan/lampiran_hidromet.csv
saring: skenario=musim_hujan_lanina
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=ringkas; rendah="RENDAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
sumber: DIBI BNPB, ditarik 23 Oktober 2026; ONI NOAA CPC; InaRISK BNPB, KRB 2022–2026; platform Pantau Bencana, rasio korban
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Kejadian lintas kab/kota dibagi rata; korban model berupa pita belum diuji balik.
:::

::: tabel {#tbl:c-terberat}
judul: Catatan DIBI dan keluaran mesin untuk musim hujan tercatat terberat tingkat nasional, 2025/2026
csv: data/turunan/lampiran_hidromet.csv
saring: skenario=musim_hujan_terberat_tercatat
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=ringkas; rendah="RENDAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
sumber: DIBI BNPB, ditarik 23 Oktober 2026; InaRISK BNPB, KRB 2022–2026; platform Pantau Bencana, rasio korban
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Model paket menyisihkan tahun terburuk tercatat, sehingga pita berada di bawah lantai.
:::

::: tabel {#tbl:c-lantai}
judul: Catatan DIBI musim hujan lantai nasional 2025/2026
csv: data/turunan/lampiran_hidromet.csv
saring: skenario=musim_hujan_lantai
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=ringkas; rendah="RENDAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
sumber: DIBI BNPB, ditarik 23 Oktober 2026; pengolahan Pantau Bencana
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Musim hujan 1 Oktober sampai 30 April; angka 2026 sementara.
:::

::: tabel {#tbl:c-pasca-elnino}
judul: Catatan DIBI tiga musim hujan sesudah El Niño kuat tingkat nasional, 2009/2010, 2015/2016, dan 2023/2024
csv: data/turunan/lampiran_hidromet.csv
saring: skenario=musim_hujan_pasca_elnino
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=ringkas; rendah="RENDAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
sumber: DIBI BNPB, ditarik 23 Oktober 2026; ONI NOAA CPC
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Ketiga musim adalah ekspektasi operasional, bukan skenario terburuk.
:::

::: tabel {#tbl:c-gelombang}
judul: Catatan DIBI dan keluaran mesin untuk gelombang ekstrem, abrasi, dan rob tingkat nasional, tahun analog 2021
csv: data/turunan/lampiran_hidromet.csv
saring: skenario=gelombang_abrasi_rob
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=ringkas; rendah="RENDAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
sumber: DIBI BNPB, ditarik 23 Oktober 2026; InaRISK BNPB, KRB 2022–2026; platform Pantau Bencana
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Pita gelombang ekstrem dan abrasi lebih lebar dari satu orde besaran dan tidak tampil di kartu.
:::

::: tabel {#tbl:c-kekeringan}
judul: Catatan DIBI dan keluaran mesin untuk kekeringan tingkat nasional, 2015 dan 2018
csv: data/turunan/lampiran_hidromet.csv
saring: skenario=kekeringan_2015
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=ringkas; rendah="RENDAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
sumber: DIBI BNPB, ditarik 23 Oktober 2026; InaRISK BNPB, KRB 2022–2026; platform Pantau Bencana
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Mesin neraca air dan padi belum lolos uji balik terhadap kejadian kekeringan DIBI.
:::

::: tabel {#tbl:c-karhutla}
judul: Catatan resmi dan keluaran mesin untuk karhutla 2015 tingkat nasional
csv: data/turunan/lampiran_hidromet.csv
saring: skenario=karhutla_2015
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=ringkas; rendah="RENDAH" fmt=ringkas; tinggi="TINGGI" fmt=ringkas; satuan="SATUAN"; label="KEYAKINAN"
sumber: SiPongi Kementerian Kehutanan; DIBI BNPB; Renas PB 2025–2029 (KRB 2022–2026); Bank Dunia (2016)
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Angka Bank Dunia terverifikasi; dolar Amerika Serikat dan rupiah dua satuan, tidak dijumlah.
:::
