# Pra-registrasi: apakah relief ratio DAS memprediksi banjir bandang Sumatra lebih baik daripada pembanding sederhana

Status: DIBEKUKAN sebelum satu pun label bandang dipetakan ke DAS (25 Nov 2026). Kode: `scripts/banjir/relief_das.py`. Latar: `scripts/banjir/RISET-KAJIAN-LUAR.md` §2.13 (tabel relief ratio sebuah unggahan media sosial memakai skala berbeda per provinsi, jadi dihitung sendiri). Pola mengikuti `PRAREG-BANDANG.md`: beku dulu, vonis tertulis dulu, pembanding wajib, selang bootstrap.

Satu-satunya hal yang sudah dilihat sebelum menulis ini: daftar berkas, jumlah DAS Sumatra per tingkat HydroBASINS (204 sub-DAS level 7 di kotak Sumatra sebelum saringan), dan bentuk berkas DIBI. Tidak ada satu pun label bandang yang dipetakan ke DAS, dan tidak ada relief ratio yang dihitung.

## 1. Pertanyaan

Satu hipotesis: skor relief ratio sebuah DAS Sumatra memisahkan DAS yang sempat tercatat banjir bandang (periode uji) dari DAS lain LEBIH BAIK daripada pembanding sederhana (luas DAS, riwayat bandang kabupaten, jumlah penduduk). Arah dibekukan: relief tinggi = lebih rawan. Ini uji kekuatan pembeda, bukan klaim sebab.

## 2. Unit analisis

- **DAS = sub-DAS HydroBASINS v1c level 7**, berkas `hybas_au_lev07_v1c.zip` (Sumatra ada di berkas `au`, bukan `as`), disimpan di `data/raw/banjir/relief/`. Alasan level 7: median 1.700 km2, sepadan dengan DAS yang disebut unggahan (Kluet, Teunom, dan sejenisnya, ratusan sampai ribuan km2). Level 6 (sekitar 6.000 km2) menggabungkan banyak DAS sungai pendek yang berbeda sifat; level 9 (repo sudah memakainya untuk `bukti_das.py`) terlalu kecil sehingga relief per unit nyaris sama dengan lereng setempat dan satu kejadian kabupaten menyentuh puluhan unit. Sub-DAS dipakai apa adanya, tidak digabung ke hulu.
- **Sumatra** = sub-DAS yang titik tengah (rata-rata simpul cincin pertama) memenuhi: bujur 95,0 sampai 106,2 dan lintang -6,0 sampai 5,9, DAN di sisi Sumatra garis Selat Malaka (lintang < 4,5 - 0,9 x (bujur - 99,0) untuk bujur >= 99,3), DAN bukan Bangka-Belitung (bujur > 105,0 dan lintang > -3,5) DAN bukan Kepulauan Riau (bujur > 103,7 dan lintang > -1,2). Garis kasar, diakui; sub-DAS tepi bisa salah sisi.
- **Dikeluarkan:** luas < 200 km2 (relief ratio tak bermakna pada pecahan pesisir) dan sub-DAS tanpa satu pun titik pusat kecamatan di dalamnya (tak ada jalur ke label dan ke pembanding riwayat; jumlahnya dilaporkan, bukan diam-diam dibuang).

## 3. Definisi relief ratio

Relief ratio (Schumm 1956) = (H_maks - H_min) / L_b, tanpa satuan (m per m), dengan:

- H_maks, H_min = elevasi tertinggi dan terendah di antara titik cuplik DAS (§4); H_min dipakai sebagai pengganti elevasi muara karena titik muara tidak diketahui dari HydroBASINS (muara memang titik terendah DAS).
- L_b = panjang DAS = jarak terjauh antara dua simpul poligon DAS (diameter Feret, haversine). Dipilih ini dan BUKAN panjang alur terpanjang karena HydroBASINS tidak memuat jaringan sungai dan `dist_main` adalah jarak ke muara hilir, bukan panjang dalam DAS. Ini definisi Schumm yang asli ("panjang dimensi terpanjang") dan satu-satunya yang bisa dihitung tanpa DEM penuh.
- Satuan dilaporkan juga sebagai persen (x 100) hanya untuk dibandingkan dengan tabel unggahan; uji memakai peringkatnya.

## 4. Elevasi

- **Copernicus GLO-90 lewat Open-Meteo Elevation API** (sama dengan `faktor_kec.py`; `faktor_kec.py` mengakui kisi 90 m). Cuplik tetap: kisi segi-empat di dalam poligon dengan jarak sel dipilih supaya tepat 24 sampai 30 titik per DAS (maks. 30; bila kurang dari 24, semua yang ada), ditambah tidak ada titik batas. Total sekitar 5.000 titik, di bawah kuota harian. Cache jawaban per titik di `data/raw/banjir/relief/elev.json`; ulangan memakai cache.
- **Kelemahan yang diakui dan dibekukan:** 24-30 titik tak menangkap puncak sebenarnya, jadi H_maks dan relief terukur rendah, lebih rendah di DAS luas. Ini bias yang berkorelasi dengan luas, dan luas adalah pembanding wajib; bila relief hanya meniru luas, ia tidak akan mengalahkan pembanding. Bukan alasan mengganti DEM sesudah hasil.
- **FABDEM**: tidak dipakai. Hanya untuk uji internal, tidak pernah tampil di layar (lisensi). **DEMNAS**: tidak diunduh (ukuran).

## 5. Label

- Positif: DIBI `bandang` (`data/raw/banjir/dibi_tanggal.json`, baris `[jenis[], prov, kab, tanggal, kejadian]`, jenis memuat `bandang`, `kejadian >= 1`), Sumatra = kode provinsi 11 sampai 18 (Aceh, Sumut, Sumbar, Riau, Jambi, Sumsel, Bengkulu, Lampung). Resolusi label hanya kabupaten, jadi **pemetaan ke DAS**: sub-DAS dianggap positif bila memuat sedikitnya satu titik pusat kecamatan (`pusat_kec.json`) milik kabupaten yang punya sedikitnya satu kabupaten-hari bandang pada periode uji. Pencocokan nama kabupaten lewat `label_bersatu.Kunci` (normalisasi); kabupaten tak cocok dilaporkan.
- **Kelemahan yang diakui:** label ini bocor ke semua DAS satu kabupaten (kabupaten bandang menandai semua DAS yang memuat pusat kecamatannya), jadi kontras relief hanya bisa berasal dari bagaimana DAS terbagi di antara kabupaten. Tidak ada label bandang tingkat DAS. Pembanding menghadapi pelabelan yang sama.
- Label dihitung per kabupaten-hari lalu per kabupaten, bukan per kejadian; satu kabupaten dengan 5 hari bandang tetap satu positif.

## 6. Pembagian waktu

- **Riwayat (hanya untuk pembanding persistensi):** 2018-01-01 sampai 2021-12-31.
- **Uji (label):** 2022-01-01 sampai 2026-10-31 (akhir tanggal DIBI pada berkas). Kabupaten yang positif hanya dari 2022-2026 dihitung; riwayat dan label tidak berbagi hari. DIBI 2024 tidak lengkap dan 2025-2026 mungkin belum terisi susulan; ini mengurangi positif, tidak disetel.
- Relief, luas, dan penduduk tidak punya dimensi waktu dan tidak dilatih: skor relief = nilai relief ratio mentah, tanpa model, tanpa parameter yang disetel. Karena itu tidak ada set latih, dan pembagian waktu menjaga hanya pembanding riwayat dari kebocoran.

## 7. Pembanding wajib

Tiap pembanding juga skor mentah per DAS:

1. **Luas DAS** (`sub_area` HydroBASINS).
2. **Riwayat bandang kabupaten** (persistensi): jumlah kabupaten-hari bandang riwayat (§6) dari kabupaten-kabupaten pusat kecamatan DAS, dibobot porsi titik pusat kecamatan DAS itu.
3. **Penduduk DAS**: jumlah penduduk sel 0,25 derajat `public/data/penduduk.json` yang titik tengahnya di dalam poligon DAS.

Pembanding terbaik = yang AUC ujinya tertinggi (dipilih di data uji, jadi sengaja konservatif bagi relief).

## 8. Ukuran dan selang

AUC (Mann-Whitney, seri setengah) untuk relief dan tiap pembanding pada label uji. Selang bootstrap persentil 95%, 5.000 ulangan, biji 11, resampel blok = DAS dikelompokkan menurut `main_bas` (satu sistem sungai besar satu blok), resampel identik bagi relief dan semua pembanding (berpasangan). Selang dilaporkan untuk AUC relief, AUC tiap pembanding, dan dAUC = AUC relief - AUC pembanding terbaik. Ulangan tanpa kedua kelas dilewati dan dihitung.

## 9. Aturan vonis (dibekukan)

- **Belum cukup data:** bila positif atau negatif uji < 15 DAS, atau < 8 blok `main_bas` berisi positif. Tidak ada vonis lain.
- **LULUS:** batas bawah 2,5% dAUC (relief - pembanding terbaik) > 0 DAN AUC relief titik >= 0,60.
- **TIDAK LULUS:** dAUC titik <= 0, atau batas atas 97,5% dAUC < 0.
- **TIDAK MEYAKINKAN:** selain itu.
- Arti LULUS hanya "relief ratio memberi pembeda tambahan di DAS Sumatra pada label kabupaten"; bukan "rawan secara alami", bukan sebab, bukan peringatan; tidak ada kata "aman". Tanpa LULUS, relief tidak tampil di layar mana pun dan tidak masuk skor gabungan.

## 10. Pertanyaan terbuka (bawaan sementara)

- Q1: apakah pemilik mau DEM lebih rapat (GLO-30 atau DEMNAS) bila relief TIDAK MEYAKINKAN karena bias cuplik? Bawaan: tidak diulang tanpa jawaban pemilik; percobaan baru = protokol baru.
- Q2: apakah label tingkat DAS (nama sungai di berita bandang) layak dikumpulkan? Bawaan: tidak ada, label tetap DIBI kabupaten.
- Q3: Aceh, Sumut, Sumbar saja (provinsi yang disebut unggahan) vs seluruh Sumatra. Bawaan: seluruh Sumatra; subset provinsi dilaporkan deskriptif saja.

## 11. Batas yang diakui

Relief dari 24-30 titik; L_b bukan panjang alur; label kabupaten; HydroBASINS level 7 bukan DAS administratif; tidak ada uji knickpoint, lereng, atau jarak sesar; hasil tidak dapat diperluas ke luar Sumatra.

## Catatan perubahan

- 25 Nov 2026: draf dan beku. Tidak ada perubahan sesudah data dilihat.

## 12. Hasil (satu kali jalan, 25 Nov 2026, tanpa perubahan protokol)

`python3 scripts/banjir/relief_das.py jalan` -> `public/banjir/data/lab/relief_das.json` dan `relief_das_ringkas.md`.

- 176 sub-DAS Sumatra lolos saringan luas dan sisi Sumatra; 7 dikeluarkan (tanpa pusat kecamatan atau elevasi kurang), 169 dinilai: 52 positif, 117 negatif, 32 blok `main_bas` berisi positif (syarat cukup data terpenuhi).
- AUC (selang 95% bootstrap blok): relief 0,73 (0,61 sampai 0,83); luas 0,57 (0,47 sampai 0,68); riwayat bandang kabupaten 0,76 (0,69 sampai 0,83); penduduk 0,66 (0,57 sampai 0,78).
- Pembanding terbaik: riwayat. dAUC relief minus riwayat = -0,03, selang 95% -0,12 sampai 0,05.
- **Vonis: TIDAK LULUS** (dAUC titik <= 0). Relief mengalahkan luas dan penduduk secara titik, tetapi tidak mengalahkan riwayat kabupaten. Tidak ada penyimpangan dari §1 sampai §9. Relief tidak tampil di layar dan tidak masuk skor gabungan.
- Bacaan hati-hati: relief punya pembeda sungguhan (batas bawah AUC 0,61), tetapi label kabupaten dan riwayat kabupaten sangat berkorelasi; uji ini tidak bisa memisahkan "DAS curam" dari "kabupaten yang sering tercatat". Mengulang dengan DEM rapat atau label tingkat DAS adalah protokol baru (Q1, Q2).
