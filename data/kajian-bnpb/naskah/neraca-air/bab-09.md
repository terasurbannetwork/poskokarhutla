---
kajian: neraca-air
bab: 9
judul: Implikasi bagi Penanggulangan Bencana Kekeringan
pertanyaan: Bagaimana BNPB dan BPBD memakai neraca ini untuk kesiapan musim kemarau, dan data apa yang harus diminta supaya angkanya naik dari estimasi model?
status: draf
target_halaman: 6
---

# Implikasi bagi Penanggulangan Bencana Kekeringan {#bab:implikasi}

::: ringkasan-bab
**Temuan:**

- {{angka:tesis.neraca-air|teks}}
- Dua pemakaian sah sekarang: daftar periksa kesiapan kemarau dan pemilihan wilayah skenario kontinjensi; menghitung volume air darurat dari angka model belum sah.

**Angka kunci:**

- {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota masuk daftar periksa kesiapan kemarau 2027, berpenduduk {{angka:neraca.hitung.n80_neg_pend|ringkas}} jiwa [@pantaubencana-2026-neraca-air].

**Rekomendasi:** @rek:n-daftar-periksa, @rek:n-renkon, @rek:n-pos-duga, @rek:n-waduk, @rek:n-industri
:::

**Penanggulangan bencana kekeringan menurut UU 24/2007 mencakup kesiapsiagaan sebelum kemarau dan pemenuhan kebutuhan dasar saat kemarau [@ri-2007-uu24].** Neraca per kab/kota dari Badan Nasional Penanggulangan Bencana (BNPB) ini membantu dua langkah itu dengan menunjukkan di mana air permukaan tidak cukup untuk kebutuhan Juni–Oktober. Prakiraan musim kemarau dan pemantauan El Niño Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) menjadi pemicu waktu pemakaian daftar ini [@bmkg-2026-musim-kemarau].

## Pemakaian yang Sah Sekarang {#sub:pemakaian-sah}

**Peringkat neraca kemarau andalan dipakai sebagai daftar periksa, dan data Badan Penanggulangan Bencana Daerah (BPBD) membetulkan urutannya.** Daftar berisi {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota dengan neraca kemarau andalan negatif; tiap BPBD memeriksa sumber air darurat dan titik pengambilan untuk mobil tangki sebelum Juni 2027 [@pantaubencana-2026-neraca-air]. Kab/kota yang mencatat kekeringan di Data dan Informasi Bencana Indonesia (DIBI) tetapi tidak masuk daftar, misalnya karena persoalan akses air rumah tangga, tetap diperiksa lewat catatan kejadian (@sub:dibi).

**Skenario tahun kering dipakai untuk memilih wilayah dalam rencana kontinjensi kekeringan; volume air darurat tidak dihitung darinya.** Pada iklim 2015 neraca Juni–Oktober negatif di {{angka:neraca.skenario.2015.n_kab_neg}} kab/kota dan pada iklim 1997 di {{angka:neraca.skenario.1997.n_kab_neg}}, dengan bias yang berbeda arah [@pantaubencana-2026-neraca-air]. Kab/kota yang negatif pada semua skenario tahun kering menjadi calon pertama untuk kaji ulang rencana kontinjensi.

::: temuan
judul: Volume kekurangan dari model belum layak dipakai untuk menghitung kebutuhan tangki atau embung
sifat: penilaian

**Bukti:** median aliran Juni–Oktober model {{angka:neraca.validasi.rasio_kemarau_median}} kali GloFAS di {{angka:neraca.validasi.n_muara}} muara, di luar ambang validasi, dan GloFAS sendiri model [@cems-2026-glofas].

**Dampak:** volume kekurangan per kab/kota dapat salah besar ke dua arah, sehingga pengadaan yang dihitung dari angka itu berisiko kurang atau berlebih.

**Pembuka:** data pos duga air dan operasi waduk dari Kementerian Pekerjaan Umum (@rek:n-pos-duga, @rek:n-waduk).
:::

## Data yang Harus Diminta {#sub:data-diminta}

**Tiga permintaan data menentukan apakah label estimasi model bisa naik.** Debit pos duga Balai Besar Wilayah Sungai (BBWS) memberi uji independen untuk aliran kemarau; operasi waduk memperbaiki neraca {{angka:neraca.hitung.hilir_waduk}} kab/kota yang ditandai hilir waduk; data industri menutup kekosongan di {{angka:neraca.hitung.industri_kosong}} kab/kota [@pantaubencana-2026-neraca-air; @bps-2026-industri-kab]. Ketiganya dipegang kementerian dan lembaga di luar BNPB, sehingga jalurnya permintaan data resmi.

:::: matriks-rekomendasi {#tbl:rekomendasi}
judul: Rekomendasi kajian neraca air Pulau Jawa untuk BNPB, 2026–2030
kelompok: internal
sumber: Analisis kajian ini; UU 24/2007; UU 17/2019
keyakinan: asumsi-kebijakan

::: rek {#rek:n-daftar-periksa}
langkah: Pakai peringkat kemarau sebagai daftar periksa 2027
jenis: kapasitas
status: baru
unit: Direktorat Kesiapsiagaan; Direktorat Penanganan Darurat Wilayah I; Direktorat Penanganan Darurat Wilayah II; Direktorat Penanganan Darurat Wilayah III
kl: –
waktu: 100-hari
indikator: lembar periksa sumber air darurat terisi oleh BPBD di kab/kota dengan neraca kemarau andalan negatif sebelum Juni 2027
dasar: Temuan B.1; UU 24/2007 [@ri-2007-uu24]

Daftar disusun dari tabel Lampiran A dan dibetulkan dengan laporan penyaluran air bersih BPBD 2023–2026.
:::

::: rek {#rek:n-renkon}
langkah: Masukkan skenario kering ke rencana kontinjensi
jenis: kapasitas
status: baru
unit: Direktorat Kesiapsiagaan; Direktorat Pemetaan dan Evaluasi Risiko Bencana
kl: BMKG
waktu: 2026-2027
indikator: rencana kontinjensi kekeringan kab/kota yang negatif pada semua skenario tahun kering memuat skenario iklim 2015 atau 2019
dasar: Temuan B.2; UU 24/2007 [@ri-2007-uu24]

Skenario dipakai untuk memilih wilayah dan bulan kritis; volume air darurat dihitung dari data BPBD.
:::

::: rek {#rek:n-pos-duga}
langkah: Minta debit pos duga dan neraca Pola PSDA
jenis: data
status: baru
unit: Pusat Data, Informasi, dan Komunikasi Kebencanaan; Direktorat Pemetaan dan Evaluasi Risiko Bencana
kl: Kementerian PU
waktu: 100-hari
indikator: debit bulanan pos duga di dua belas muara dan titik batas kab/kota diterima dan dipakai menguji aliran Juni–Oktober
dasar: Temuan C.1; UU 17/2019 [@ri-2019-uu17]

Validasi lawan pengukuran menggantikan validasi antarmodel yang dipakai versi ini.
:::

::: rek {#rek:n-waduk}
langkah: Minta tampungan efektif dan pelepasan bulanan waduk besar
jenis: data
status: baru
unit: Pusat Data, Informasi, dan Komunikasi Kebencanaan
kl: Kementerian PU
waktu: 2026-2027
indikator: tampungan efektif dan pelepasan bulanan enam waduk besar Jawa tersedia dengan sumber resmi per baris
dasar: Temuan C.2; PP 30/2024 [@ri-2024-pp30]

Lima dari enam angka tampungan waduk dalam model masih bersumber sekunder.
:::

::: rek {#rek:n-industri}
langkah: Minta data pengambilan air industri per kab/kota
jenis: data
status: baru
unit: Pusat Data, Informasi, dan Komunikasi Kebencanaan
kl: BPS; Kementerian Perindustrian
waktu: 2026-2027
indikator: tenaga kerja atau pengambilan air industri per kab/kota DI Yogyakarta dan Jawa Timur tersedia untuk pembaruan neraca
dasar: Temuan C.2 [@bps-2026-industri-kab]

Kebutuhan industri kini kosong di seluruh kab/kota DI Yogyakarta dan Jawa Timur serta Kepulauan Seribu.
:::
::::

## Pembaruan Berkala {#sub:pembaruan}

**Neraca ini dibangun ulang bila data baru masuk, dan pembaruan bulanan baru berguna setelah validasi aliran kemarau lolos.** Model beserta data masukannya tersimpan sebagai paket terbuka dengan uji konservasi massa, sehingga BNPB dapat menjalankannya ulang dengan pos duga atau data waduk yang diterima [@pantaubencana-2026-neraca-air]. Label estimasi model diturunkan hanya untuk bagian yang sudah lolos uji lawan pengukuran.
