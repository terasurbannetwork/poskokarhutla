# Risiko operasional, kebutuhan, siaga

Halaman ini menjelaskan metode indeks risiko, kebutuhan musim, dan siaga pra-musim.

## Indeks risiko operasional per kecamatan

`scripts/bnpb/risiko.py` menulis `public/banjir/data/risiko_kecamatan.json`, dijalankan harian di `lintas.yml` dan `titik.yml`.

```
RISIKO (0 sampai 100) = 100 x BAHAYA x KETERPAPARAN x (1 - w x KAPASITAS)   w = 0,3
BAHAYA = maks dari bahaya per bencana yang tersedia (0 sampai 1)
KETERPAPARAN = peringkat persentil penduduk kecamatan (WorldPop 2026)
KAPASITAS statis = 1 - jarak ke kantor BPBD terdekat / 100 km
Kelas: skor < 15 Rendah, < 35 Sedang, < 60 Tinggi, selebihnya Sangat tinggi   (AMBANG = [15, 35, 60])
```

Bahaya per bencana: karhutla = maks(FWI / 14 dari sel 0,5 derajat terdekat, titik panas 3 hari / 5), tutup 1; banjir = bahaya InaRISK (maks banjir, bandang, longsor) x (0,2 + 0,8 x peluang hujan 50 mm atau lebih hari ini atau besok); gempa = indeks bahaya InaRISK di pusat kecamatan; gunung api = tingkat PVMBG (II 0,4; III 0,75; IV 1) x zona KRB (I 0,33; II 0,66; III 1); kekeringan, cuaca, dan udara = tingkat 0 sampai 3 dibagi 3 (udara dari PM2,5 rata-rata 24 jam: Tidak sehat 1, Sangat tidak sehat 2, Berbahaya 3; Baik dan Sedang dihitung 0). Kapasitas dinamis (relawan siap) hanya menaikkan kapasitas tampilan: `kap = statis + (1 - statis) x 0,5 x min(1, siap / (penduduk kab / 10.000))`, dan hanya bila siap 10 atau lebih serta jam kerja sah 30 hari lebih dari 0. Daftar prioritas selalu memakai kapasitas statis supaya tidak bisa ditekan lewat pendaftaran relawan. Komponen hilang disimpan `null`. Sekolah dan faskes hanya ada di sembilan provinsi prioritas, jadi ditampilkan tetapi tidak masuk skor. Sumber harian lebih tua dari 7 hari dibuang.

Status uji balik (`ujibalik_risiko.py`, vonis keseluruhan `lulus: false`): hanya komponen statis banjir, longsor, dan gempa yang bisa diuji. Banjir dan longsor tidak lebih baik dari peringkat penduduk dan riwayat kejadian paruh pertama. Gempa M5 ke atas lebih baik dari peringkat penduduk tetapi tidak lebih baik dari peta bahaya InaRISK saja. Kekeringan: ambang hipotesis, POD 0,23 dan FAR 0,93, sehingga kalah dari bahaya teruji bila nilainya sama dan ditandai `hipotesis: true` di daftar prioritas. Komponen harian tidak dapat diuji mundur karena indeks harian tidak punya riwayat.

![Tangga kelas risiko kecamatan: skor di bawah 15 Rendah, 15 sampai 34 Sedang, 35 sampai 59 Tinggi, 60 ke atas Sangat tinggi. Ambang kerja tetap dari scripts/bnpb/risiko.py, indeks komposit yang belum diuji balik.](gambar/ruang-bnpb-tangga-risiko.svg)

`prioritas.py` memilih kecamatan prioritas dampak: kelasnya naik dan sekarang Tinggi atau lebih, atau skor yang dihitung hanya dari bahaya harian sudah Sangat tinggi. Berlabel belum diuji balik.

## Risiko kabupaten R = H x V / C dan uji korban jiwa

`scripts/bnpb/risiko_hvc.py` menghitung R per jenis dan jumlahnya per kabupaten: H dari indeks bahaya InaRISK 0 sampai 1 (rata-rata kecamatan, bukan maksimum, karena maksimum menjenuhkan: 440 dari 515 kab bernilai 100 untuk banjir), V dari `kerentanan.json` (z-skor lalu fungsi normal kumulatif), C dari raster kapasitas InaRISK (`ikd.json`, penyebut paling kecil 0,05). Model korban jiwa memakai sebaran binomial negatif dengan latih tahun 2021 ke bawah dan uji 2022 sampai tahun penuh terakhir, vonis lulus bila batas bawah selang 95 persen (bootstrap per kabupaten) selisih skor-log M2 terhadap M1 dan M0 lebih dari 0. Berkas keluaran melabeli: "INDEKS peringkat, BUKAN prediksi korban", vonis GAGAL. Rumus ini tidak boleh disebut IRB resmi. `inarisk_vs_kejadian.py` membandingkan kelas bahaya (H di bawah 1/3 rendah, 2/3 atau lebih tinggi) dengan laju kejadian DIBI per 100 ribu penduduk dan per 1.000 km2 (sering bila persentil ke-75 ke atas dan paling sedikit 3 kejadian; jarang bila persentil ke-25 ke bawah). Jenis yang kelas rendah atau tingginya kurang dari 10 kabupaten ditandai tak bermakna.

## Perkiraan kebutuhan musim

`scripts/bnpb/kebutuhan.py`, dijalankan di `lintas.yml`. Bukan model baru: klimatologi titik panas dikalikan koefisien operasional tertulis.

```
TITIK(p, H, skenario) = rerata tahun skenario dari jumlah titik panas jendela H hari yang sama (2019 sampai 2025)
KOMPLEKS    = TITIK / titik_per_kompleks(p)
JAM_TERBANG = KOMPLEKS x porsi_prioritas(p) x 3 jam   (rendah 1,5; tinggi 6)
REGU_HARI   = KOMPLEKS x regu_hari_per_kompleks(p) x 1,5 rotasi;  REGU_RATA = REGU_HARI / H
TERDAMPAK   = penduduk kecamatan berkompleks tingkat 2 ke atas x min(1, KOMPLEKS / kompleks_operasi(p))
RUPIAH      = JAM_TERBANG x Rp150 juta + REGU_HARI x 15 x biaya_orang_hari(p) + TERDAMPAK x 2 x Rp15 ribu
```

Biaya per orang per hari (`biaya_orang_hari`) adalah gabungan: 0,4 x uang harian provinsi (porsi personel BKO) + 0,4 x honor Masyarakat Peduli Api Rp100 ribu (porsi MPA) + konsumsi Rp150 ribu. Angka 15 adalah orang per regu (Permen LHK P.32/2016), heli Rp150 juta per jam terbang, masker 2 per orang terdampak, harga masker Rp15 ribu. Tarif dan koefisien adalah asumsi kerja (uang harian dari standar biaya 2026 per provinsi, nilai bawaan Rp380 ribu) (`scripts/bnpb/kebutuhan.py:34-49, 72-74, 128`). Provinsi dengan kurang dari 5 kompleks operasi (`MIN_KOMPLEKS = 5`) bernilai `null`, bukan nol. Skenario: Rerata 2019 sampai 2025 dan Tahun El Nino. Label: "perkiraan, belum diuji balik".

## Perencanaan dan siaga pra-musim

`scripts/bnpb/perencanaan.py` menulis `kab_prioritas.json`, `kalender_operasi.json`, `stok_prapemusim.json` dari arsip logbook; dijalankan lokal (tidak ada di workflow). Aturan:

- Kab prioritas: urut beban kejadian menurun sampai kumulatif 46 persen (`BEBAN = 0,46`). Hasil dihitung: 51 kab dari 514.
- Musim (`musim()`): hitungan bulanan dihaluskan rata geser 3 bulan melingkar; ambang = maks(1, rerata); bulan aktif bila sama atau di atas ambang; celah satu bulan ditutup; runtun yang dalamnya tidak lebih tinggi daripada luarnya di setidaknya separuh tahun dasar dibuang.
- Keyakinan (`yakin()`): rendah bila n kurang dari 100, tanpa musim, musim hanya di kurang dari dua pertiga tahun dasar, kontras dalam lawan luar musim kurang dari 1,5, tak cocok dengan puncak titik panas (beda lebih dari 2 bulan), atau arsip per tahun berbeda dari riwayat; tinggi bila n 300 atau lebih dan musim di sedikitnya tujuh per sembilan tahun.
- Kalender hanya dibuat bila provinsi x jenis memuat 30 kejadian atau lebih; persen kategori kebutuhan hanya bila 10 kejadian berisi atau lebih; ekstrapolasi stok null bila cakupan isian di bawah 10 persen.

`siaga.py` (jalan harian di `data.yml`): bulan musim bila peluang paling sedikit 0,5 (`AMBANG_MUSIM`), saran stok memakai kode kebutuhan logbook tanpa jumlah, SOP pra-musim dengan hitung mundur (contoh banjir: 60, 45, 30, 21, 14, 7 hari sebelum musim).
