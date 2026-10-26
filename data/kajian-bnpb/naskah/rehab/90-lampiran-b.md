---
kajian: rehab
lampiran: B
judul: Profil Provinsi Beban Rehabilitasi dan Rekonstruksi
status: final
---

# Profil Provinsi Beban Rehabilitasi dan Rekonstruksi {#lamp:provinsi}

Profil tiga puluh delapan provinsi merangkum rumah rusak 2015–2025, jembatan rusak 2018–2025, dan fasilitas umum rusak 2015–2025 menurut DIBI dengan klasifikasi bencana alam dan cakupan kejadian bencana [@bnpb-dibi]. Seri jembatan dimulai 2018 karena kolom itu bernilai nol untuk 2008–2017 (@sub:rr-dibi). Jumlah seluruh provinsi sama dengan rekap nasional: {{angka:rehab.dibi.rumah_rb.2015_2025}} rumah rusak berat, {{angka:rehab.dibi.jembatan_rusak.2018_2025}} jembatan rusak, dan {{angka:rehab.dibi.fasum_rusak.2015_2025}} fasilitas umum rusak.

**Urutan provinsi mengikuti jembatan rusak 2018–2025, karena peta jembatan adalah peta beban kronis, sedangkan rumah rusak berat terpusat pada tahun kejadian besar** (@sub:sebaran-provinsi). Aceh mencatat {{angka:rehab.dibi.jembatan_rusak.prov.aceh.2018_2025}} jembatan rusak, terbanyak, dan {{angka:rehab.dibi.jembatan_rusak.prov.aceh.2025}} di antaranya pada 2025. Kolom fasilitas umum tidak memisah SPAM, sehingga kerusakan sistem air tidak dapat dibaca dari tabel ini (@tbl:rr-kolom-dibi). Kolom kab/kota daftar perhatian menghitung kab/kota yang masuk daftar sementara di @tbl:a-kab dan berlabel asumsi kebijakan.

::: tabel {#tbl:b-provinsi}
judul: Rumah rusak, jembatan rusak, fasilitas umum rusak, dan kab/kota daftar perhatian per provinsi, Indonesia, 2015–2025
csv: data/turunan/lampiran_rehab_prov.csv
kolom: provinsi="PROVINSI"; pulau="PULAU"; rb="RUMAH RB" fmt=0; rs="RUMAH RS" fmt=0; rr="RUMAH RR" fmt=0; jembatan_2018_2025="JEMBATAN 2018–2025" fmt=0; jembatan_2025="JEMBATAN 2025" fmt=0; fasum="FASUM" fmt=0; kab_perhatian="PERHATIAN" fmt=0
total: ya
sumber: DIBI BNPB, rekap provinsi tahunan, klasifikasi bencana alam, cakupan kejadian bencana, ditarik 23 Okt 2026; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: RB rusak berat, RS rusak sedang, RR rusak ringan; seri 2024 disaring Juklak BNPB 7/2023.
:::

**Rekap nasional per tahun menunjukkan dua puncak, 2018 dan 2025, pada rumah rusak berat maupun jembatan rusak** (@tbl:b-tahun). Kejadian lintas kab/kota dibagi rata di sumber, sehingga jumlah kejadian dibulatkan.

::: tabel {#tbl:b-tahun}
judul: Kejadian dan kerusakan akibat bencana alam per tahun menurut DIBI, Indonesia, 2015–2025
csv: data/turunan/lampiran_rehab_tahun.csv
kolom: tahun="TAHUN" fmt=teks; kejadian="KEJADIAN" fmt=0; rb="RUMAH RB" fmt=0; rs="RUMAH RS" fmt=0; rr="RUMAH RR" fmt=0; jembatan="JEMBATAN" fmt=0; fasum="FASUM" fmt=0; fasyankes="FASYANKES" fmt=0
total: ya
sumber: DIBI BNPB, rekap nasional tahunan, klasifikasi bencana alam, cakupan kejadian bencana, ditarik 23 Okt 2026
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Jembatan nol pada 2015–2017 karena kolom belum terisi; kejadian dibulatkan.
:::
