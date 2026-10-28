---
kajian: neraca-air
bagian: ringkasan-eksekutif
judul: Ringkasan Eksekutif
status: draf
---

# Ringkasan Eksekutif

{{angka:tesis.neraca-air|teks}}

**Temuan A.1:** Air permukaan terbarukan Pulau Jawa {{angka:neraca.jawa.r_miliar|satuan}} menurut model, rerata 1991–2025, selisih {{angka:neraca.validasi.selisih_bps_persen|persen}} dari angka BPS 2020 yang juga keluaran model; untuk tahun 2020 saja selisihnya {{angka:neraca.validasi.selisih_bps_2020_persen|persen}}, di atas ambang {{angka:neraca.validasi.ambang_bps_persen|persen}}. (Estimasi model, Subbab 4.2)

**Temuan A.2:** Kebutuhan konsumtif 2025 sama dengan {{angka:neraca.jawa.rasio_c_r_persen|persen}} limpasan tahunan dan {{angka:neraca.jawa.rasio_c_r_kemarau_persen|persen}} limpasan Juni–Oktober; neraca tahunan negatif hanya di dua kab/kota, keduanya kota pantai kecil. (Estimasi model, Bab 6)

**Temuan B.1:** {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota punya neraca kemarau andalan negatif, artinya kekurangan air Juni–Oktober pada sedikitnya satu dari lima tahun bila kebutuhan irigasi potensial dipenuhi; Jawa Timur {{angka:neraca.prov.jawa_timur.n_n80_neg}}, Jawa Tengah {{angka:neraca.prov.jawa_tengah.n_n80_neg}}, dan Jawa Barat {{angka:neraca.prov.jawa_barat.n_n80_neg}}. Nilai per kab/kota adalah indikasi urutan. (Estimasi model, Subbab 6.3)

**Temuan B.2:** Pada skenario iklim 1997 neraca Juni–Oktober negatif di {{angka:neraca.skenario.1997.n_kab_neg}} kab/kota, pada 2015 di {{angka:neraca.skenario.2015.n_kab_neg}}, pada 2019 di {{angka:neraca.skenario.2019.n_kab_neg}}, dan pada 2023 di {{angka:neraca.skenario.2023.n_kab_neg}}. Bias model berbeda arah antartahun, sehingga keempat angka ini indikasi besarnya tekanan dan tidak menjadi batas atas atau batas bawah. (Estimasi model, Bab 7)

**Temuan C.1:** Aliran tahunan model di {{angka:neraca.validasi.n_muara}} muara sungai besar berada pada {{angka:neraca.validasi.rasio_rentang|rentang}} kali GloFAS, tetapi median aliran Juni–Oktober {{angka:neraca.validasi.rasio_kemarau_median}} kali, di luar ambang {{angka:neraca.validasi.ambang_rendah|fmt=2}}–{{angka:neraca.validasi.ambang_tinggi|fmt=2}}. Kalibrasi dan validasi memakai GloFAS yang sama, dan belum ada data pos duga air. (Estimasi model, Bab 8)

**Temuan C.2:** Kebutuhan industri tidak terhitung di {{angka:neraca.hitung.industri_kosong}} kab/kota (seluruh DI Yogyakarta dan Jawa Timur serta Kepulauan Seribu), dan hanya satu dari enam angka tampungan waduk besar yang bersumber resmi. (Estimasi model dan celah data, Bab 8)

**Keputusan yang diminta:** KD-1 memakai peringkat neraca kemarau sebagai daftar periksa kesiapan musim kemarau 2027. Peringkat itu belum cocok dengan catatan kejadian kekeringan DIBI, jadi dipasangkan dengan data penyaluran air bersih BPBD. KD-2 meminta data pos duga air dan operasi waduk kepada Kementerian Pekerjaan Umum untuk validasi.

{{halaman-baru}}

## Keputusan yang Diminta dan Akibatnya {#sub:re-keputusan}

**Kedua keputusan memakai kajian ini sesuai kekuatan angkanya.** Peringkat kab/kota dipakai sebagai daftar periksa, belum sebagai volume kekurangan, dan validasi lawan pengukuran hanya bisa dilakukan dengan data yang dipegang Kementerian Pekerjaan Umum [@ri-2019-uu17; @kemenpupr-pola-rpsda-jawa]. Rincian rekomendasi ada di Bab 9.

::: keputusan
judul: Keputusan yang diminta dari Kepala BNPB

- KD-1. Memakai peringkat neraca kemarau andalan sebagai daftar periksa kesiapan musim kemarau 2027, dipasangkan dengan data penyaluran air bersih BPBD karena peringkat belum cocok dengan catatan kejadian kekeringan DIBI.
  - Bila dipakai, BPBD di {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota dengan neraca kemarau andalan negatif diminta memeriksa sumber air darurat dan rencana kontinjensi kekeringan sebelum Juni 2027, dan hasilnya membetulkan peringkat.
  - Bila tidak, penyiapan kemarau 2027 tetap bertumpu pada catatan kejadian, yang tidak membedakan kekurangan air permukaan dari gangguan akses air rumah tangga.
- KD-2. Meminta data pos duga air dan operasi waduk kepada Kementerian Pekerjaan Umum.
  - Bila diminta dan diterima, label estimasi model dapat naik untuk aliran kemarau, dan kab/kota hilir waduk tidak lagi bergantung pada asumsi pelepasan rata.
  - Bila tidak, angka kemarau per kab/kota tetap indikasi urutan pada pembaruan berikutnya.
:::

::: kartu-angka
pil: ESTIMASI MODEL
nada: data
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini, iklim 1991–2025 dan kebutuhan 2025
keyakinan: estimasi-model

| NILAI | SATUAN | LABEL | IKON | WARNA |
| --- | --- | --- | --- | --- |
| {{angka:neraca.jawa.rasio_c_r_kemarau_persen|persen}} | | beban air Juni–Oktober | air-baku | biru |
| {{angka:neraca.hitung.n80_kemarau_neg}} | kab/kota | neraca kemarau negatif | wilayah | oranye |
| {{angka:neraca.hitung.n_kemarau_neg}} | kab/kota | negatif kemarau rerata | wilayah | |
:::
