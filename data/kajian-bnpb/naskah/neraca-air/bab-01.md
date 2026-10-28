---
kajian: neraca-air
bab: 1
judul: Pendahuluan
pertanyaan: Mengapa BNPB membutuhkan neraca air per kabupaten/kota, dan pertanyaan apa yang dijawab neraca ini? Seberapa kuat angkanya, dan bagaimana membacanya?
status: draf
target_halaman: 4
---

# Pendahuluan {#bab:pendahuluan}

::: ringkasan-bab
**Temuan:**

- Kajian ini menghitung pasokan dan kebutuhan air untuk {{angka:neraca.jawa.n_kab}} kab/kota di enam provinsi Pulau Jawa per bulan, dengan iklim 1991–2025 dan kebutuhan 2025 serta proyeksi 2030.
- Semua angka neraca berlabel estimasi model. Aliran tahunan model cocok dengan pembanding global di dua belas muara, tetapi aliran Juni–Oktober belum lolos validasi, sehingga angka kemarau per kab/kota dibaca sebagai urutan.

**Angka kunci:**

- {{angka:neraca.jawa.r_miliar|satuan}} air permukaan terbarukan Pulau Jawa per tahun menurut model, rerata 1991–2025 [@pantaubencana-2026-neraca-air].
- {{angka:neraca.jawa.pend_2025|ringkas}} jiwa penduduk Pulau Jawa 2025 yang kebutuhan domestiknya dihitung [@worldpop-2025; @bps-2026-proyeksi-prov].

**Rekomendasi:** @rek:n-pos-duga, @rek:n-daftar-periksa
:::

**Kekeringan di Pulau Jawa ditangani per kab/kota, sedangkan data air tersedia per wilayah sungai atau per pulau.** Badan Penanggulangan Bencana Daerah (BPBD) menetapkan status dan menyalurkan air bersih di tingkat kab/kota. Data dan Informasi Bencana Indonesia (DIBI) Badan Nasional Penanggulangan Bencana (BNPB) mencatat kejadian kekeringan di tingkat yang sama [@bnpb-dibi]. Neraca air resmi yang terbuka untuk Jawa berupa satu angka pulau: Badan Pusat Statistik (BPS) mengutip ketersediaan air permukaan {{angka:neraca.validasi.bps_r|satuan}} dari model satelit [@bps-2020-slhi; @radhika-2017-jsda]. Pola dan Rencana Pengelolaan Sumber Daya Air (PSDA) Kementerian Pekerjaan Umum menghitung neraca per wilayah sungai (WS) dan tidak memecahnya ke kab/kota [@kemenpupr-pola-rpsda-jawa].

## Pertanyaan yang Dijawab {#sub:pertanyaan}

**Kajian ini menjawab tiga pertanyaan untuk {{angka:neraca.jawa.n_kab}} kab/kota.** Pertama, berapa air permukaan yang tersedia tiap bulan, termasuk air yang mengalir masuk dari kab/kota hulu. Kedua, berapa kebutuhan domestik, irigasi, ternak, dan industri pada bulan yang sama. Ketiga, kab/kota mana yang kekurangan air pada musim kemarau Juni–Oktober, baik pada tahun biasa maupun pada empat tahun kering 1997, 2015, 2019, dan 2023. Jawaban ketiga menjadi bahan prioritas penyiapan air darurat dan rencana kontinjensi kekeringan, kewenangan yang diatur UU 24/2007 [@ri-2007-uu24].

**Lingkup dan pilihan musim mengikuti keputusan pemilik kajian tanggal 26 Oktober 2026.** Musim kemarau ditetapkan Juni sampai Oktober (lima bulan), kebutuhan dihitung untuk 2025 dan proyeksi 2030, dan tahun 1997 dimasukkan sebagai tahun El Niño terkuat dalam periode data. Aliran balik irigasi dihitung {{angka:neraca.param.aliran_balik_persen|persen}}, dan waduk besar serta Saluran Tarum Barat ke Jakarta dimasukkan sebagai tabel bersumber [@dsda-dki-2026-tarum-barat]. Kebutuhan industri memakai tenaga kerja industri besar dan sedang dari BPS [@bps-2026-industri-kab].

## Cara Membaca Angka {#sub:cara-baca}

**Satu angka neraca kab/kota adalah air tersedia dikurangi kebutuhan konsumtif.** Air tersedia sama dengan limpasan yang terbentuk di kab/kota itu ditambah aliran sungai yang masuk dari kab/kota hulu sesudah dipakai di hulu. Kebutuhan konsumtif sama dengan kebutuhan domestik dan ternak serta industri, ditambah kebutuhan irigasi yang dikurangi aliran balik {{angka:neraca.param.aliran_balik_persen|persen}}. Nilai negatif berarti kekurangan. Neraca termasuk air yang hanya lewat, sehingga neraca dua kab/kota tidak boleh dijumlahkan; untuk peringkat surplus kajian ini memakai limpasan lokal dikurangi kebutuhan (@sub:surplus-lokal).

**Neraca kemarau andalan adalah persentil kedua puluh dari total neraca Juni–Oktober tiap tahun selama 1991–2025.** Kab/kota dengan neraca kemarau andalan negatif kekurangan air pada sedikitnya satu dari lima tahun. Kebutuhan irigasi di dalamnya adalah kebutuhan potensial gaya Kriteria Perencanaan Irigasi KP-01, {{angka:neraca.jawa.irigasi_persen_sni|persen}} dari angka standar {{angka:neraca.param.sni_l_det_ha|satuan}} [@bsn-2002-sni6728], dan berbeda dengan air yang benar-benar dipasok.

::: catatan
Label estimasi model berlaku untuk semua angka neraca sampai validasi lawan pengukuran pos duga air tersedia. Pembanding yang dipakai, yaitu Global Flood Awareness System (GloFAS) dan angka BPS 2020, sendiri juga keluaran model [@cems-2026-glofas; @bps-2020-slhi]. Bab 8 merinci apa yang lolos dan apa yang belum.
:::

**Buku ini disusun dalam sembilan bab.** Bab 2 membandingkan pendekatan neraca air yang berlaku di Indonesia, Bab 3 menguraikan metode dan data, Bab 4 dan Bab 5 menyajikan pasokan dan kebutuhan, Bab 6 neraca per kab/kota, Bab 7 tahun kering, Bab 8 keterbatasan dan validasi, dan Bab 9 implikasi bagi penanggulangan bencana kekeringan. Tabel lengkap {{angka:neraca.jawa.n_kab}} kab/kota ada di @lamp:tabel-kab.
