---
kajian: air
lampiran: I
judul: Keluaran Model Berlabel
status: final
---

# Keluaran Model Berlabel {#lamp:model}

Lampiran ini memuat keluaran mesin platform Pantau Bencana yang tidak dipakai sebagai angka utama di badan teks: mesin neraca air dan padi untuk analog kemarau 2015 (@sub:dampak-kemarau) dan simulasi ulang banjir Jabodetabek Maret 2025 [@pantaubencana-2026-validasi-banjir]. Keluaran simulasi platform bukan Data Bencana menurut Perban BNPB 1/2023, sehingga tiap tabel membawa label Estimasi model dan pernyataan produsen [@bnpb-2023-satudata].

**Pernyataan produsen.** Kedua tabel dihasilkan platform Pantau Bencana dari data terbuka, bukan oleh unit kerja BNPB. Mesin neraca dan padi belum pernah diuji balik terhadap data puso atau produksi Kementerian Pertanian dan BPS. Padi di dalamnya adalah padi tadah hujan tanpa irigasi dan sawahnya berasal dari tutupan lahan model, sehingga yang bermakna hanya selisih terhadap iklim normal [@bps-2016-padi-2015].

::: tabel {#tbl:i-kekeringan}
judul: Keluaran mesin neraca air dan padi untuk analog kemarau 2015 di Pulau Jawa dan pembanding iklim normal, estimasi model 2015
csv: data/skenario-hidromet/lampiran_kekeringan_model.csv
saring: wilayah=jawa
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=1; satuan="SATUAN"
sumber: Platform Pantau Bencana, mesin neraca air dan padi dengan hujan dan evapotranspirasi NASA POWER 2015 dan klimatologi 1991–2020
keyakinan: estimasi-model
data_per: 23 Okt 2026
catatan: Metrik tahun memakai cuaca 2015, normal memakai klimatologi; puso model bukan definisi Kementan.
:::

**Replay banjir Maret 2025 menunjukkan galat lokasi yang besar: luas tergenang model di Kota Bekasi sekitar empat belas kali luas hasil survei ITB, sedangkan kedalaman model di titik laporan terlalu dangkal lebih dari satu setengah meter.** Karena itu angka model hanya peraga dan tidak dipakai di kartu skenario Bab 6; angka DIBI di tabel yang sama tetap resmi [@bnpb-dibi].

::: tabel {#tbl:i-replay}
judul: Catatan DIBI dan keluaran simulasi ulang banjir Jabodetabek 2–8 Maret 2025
csv: data/skenario-hidromet/kartu_skenario.csv
saring: skenario=kasus_replay_maret2025
kolom: metrik="METRIK (NAMA DI PAKET DATA)"; nilai="NILAI" fmt=0; satuan="SATUAN"; label="KEYAKINAN"
sumber: DIBI BNPB, ditarik 23 Oktober 2026; platform Pantau Bencana, replay genangan Maret 2025
keyakinan: campuran
data_per: 23 Okt 2026
catatan: Estimasi model kisi Jabodetabek timur, ambang tergenang 10 cm, mengungsi tujuh hari.
:::
