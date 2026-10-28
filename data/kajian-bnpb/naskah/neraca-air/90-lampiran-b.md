---
kajian: neraca-air
lampiran: B
judul: Validasi Debit Muara
status: draf
orientasi: lanskap
---

# Validasi Debit Muara {#lamp:validasi}

Debit model dibandingkan dengan debit GloFAS versi 4 di sel sungai terdekat muara perkiraan, periode 1991–2024 [@cems-2026-glofas]. Kalibrasi dan validasi memakai GloFAS yang sama di {{angka:neraca.validasi.n_muara}} muara ini, sehingga tabel menunjukkan konsistensi antara dua model dan belum menjadi uji lawan pengukuran [@pantaubencana-2026-neraca-air].

::: tabel {#tbl:b-muara}
judul: Debit model dan GloFAS di dua belas muara sungai besar Pulau Jawa, rerata 1991–2024 (m³ per detik)
csv: data/neraca-air/muara.csv
kolom: sungai="SUNGAI"; model_m3s="MODEL TAHUNAN" fmt=1; glofas_m3s="GLOFAS TAHUNAN" fmt=1; rasio="RASIO TAHUNAN" fmt=2; model_kemarau_m3s="MODEL JUN–OKT" fmt=1; glofas_kemarau_m3s="GLOFAS JUN–OKT" fmt=1; rasio_kemarau="RASIO JUN–OKT" fmt=2; r_bulanan="KORELASI BULANAN" fmt=2
sumber: Pengolahan data Pantau Bencana; GloFAS versi 4 lewat Open-Meteo Flood API
keyakinan: estimasi-model
catatan: Rasio = model dibagi GloFAS; ambang usulan rasio {{angka:neraca.validasi.ambang_rendah|fmt=2}}–{{angka:neraca.validasi.ambang_tinggi|fmt=2}}.
:::

::: tabel {#tbl:b-kering}
judul: Rasio debit Juni–Oktober model terhadap GloFAS pada tahun kering 1997, 2015, 2019, dan 2023
csv: data/neraca-air/muara.csv
kolom: sungai="SUNGAI"; rasio_1997="1997" fmt=2; rasio_2015="2015" fmt=2; rasio_2019="2019" fmt=2; rasio_2023="2023" fmt=2
sumber: Pengolahan data Pantau Bencana; GloFAS versi 4 lewat Open-Meteo Flood API
keyakinan: estimasi-model
catatan: Rasio kecil berarti aliran model terlalu rendah dan kekurangan dilebih-lebihkan; rasio besar sebaliknya.
:::
