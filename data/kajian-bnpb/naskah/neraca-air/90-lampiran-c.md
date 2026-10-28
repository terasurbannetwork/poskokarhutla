---
kajian: neraca-air
lampiran: C
judul: Waduk, Transfer, dan Parameter Model
status: draf
---

# Waduk, Transfer, dan Parameter Model {#lamp:koefisien}

Tabel waduk dan transfer memakai satu sumber per baris. Hanya Kedung Ombo dan Saluran Tarum Barat yang bersumber resmi [@bbwspj-2021-bendungan; @dsda-dki-2026-tarum-barat]; angka lain berasal dari paket data Kajian Ketahanan Air yang merujuk sumber sekunder, dan permintaan angka pengelola tercatat di @lamp:celah.

::: tabel {#tbl:c-waduk}
judul: Waduk besar dan transfer antar-DAS dalam model neraca air, data 2005–2026
csv: data/neraca-air/waduk.csv
kolom: nama="NAMA"; jenis="JENIS"; tampungan_juta_m3="TAMPUNGAN (juta m³)" fmt=0; debit_m3s="DEBIT (m³ per detik)" fmt=1; keyakinan="KEYAKINAN"; sumber="SUMBER"
sumber: Tabel waduk kajian ini; BBWS Pemali Juana 2021; Dinas Sumber Daya Air Provinsi DKI Jakarta 2026
keyakinan: campuran
catatan: Sel "–" = besaran tidak berlaku untuk jenis itu; Cirata dan Jatiluhur dijalankan sebagai satu sistem.
:::

::: tabel {#tbl:c-param}
judul: Parameter model dan kebutuhan irigasi, versi pertama Oktober 2026
sumber: Parameter model kajian ini; FAO-56; SNI Neraca Sumber Daya Air 2002
keyakinan: campuran
angka: 2

| PARAMETER | NILAI | KEYAKINAN | CATATAN |
| --- | ---: | --- | --- |
| Kapasitas air tersedia tanah (mm) | {{angka:neraca.param.taw_mm}} | asumsi-kebijakan | seragam untuk semua sel |
| Koefisien tanaman bak | {{angka:neraca.param.kc}} | asumsi-kebijakan | tidak dikalibrasi |
| Pecahan aliran dasar | {{angka:neraca.param.alpha|fmt=1}} | asumsi-kebijakan | dipilih dengan data tahun kering |
| Waktu tinggal aliran dasar (bulan) | {{angka:neraca.param.k_bulan}} | asumsi-kebijakan | tetap sesudah kalibrasi |
| Perkolasi sawah (mm/hari) | {{angka:neraca.param.perkolasi}} | asumsi-kebijakan | gaya KP-01 |
| Penyiapan lahan (mm) | {{angka:neraca.param.penyiapan}} | asumsi-kebijakan | gaya KP-01 |
| Hujan efektif | {{angka:neraca.param.hujan_efektif_persen|persen}} | asumsi-kebijakan | pecahan hujan bulanan |
| Intensitas musim tanam ketiga | {{angka:neraca.param.mt3_persen|persen}} | asumsi-kebijakan | palawija |
| Kebutuhan hidup layak per kapita (m³/kapita/tahun) | {{angka:neraca.param.khla}} | resmi | hanya untuk status gaya Permen LH 17/2009 |
:::
