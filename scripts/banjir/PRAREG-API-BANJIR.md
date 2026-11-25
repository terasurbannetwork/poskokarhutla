# Pra-registrasi: api tahun t, banjir tahun t+1 per kab/kota

Ditulis 2026-11-25 SEBELUM melihat hasil apa pun. Skrip: `scripts/banjir/api_banjir.py`.
Latar: `RISET-KAJIAN-LUAR.md` §2.4 (Landscape 360, klaim +25% aliran permukaan dari gambut dan hutan terbakar, dari model yang tak bisa diverifikasi). Kita uji dengan data sendiri.

## Hipotesis
H1: kab/kota dengan api lebih banyak dari biasanya pada tahun t punya lebih banyak kejadian banjir pada tahun t+1 daripada kab yang sama pada tahun lain dan kab lain pada tahun yang sama. Tidak ada klaim sebab.

## Data (yang benar-benar ada di repo)
- **Luas terbakar per kab per tahun TIDAK ada.** `luas_resmi.json` (SiPongi) dan `luas_satelit.json` (GWIS MCD64A1) hanya per provinsi; `ujiluas_kab.json` hanya beberapa kab, satu periode 2023. Membangunnya dari citra tidak muat dalam 2 jam.
- **Pengganti yang dipakai: jumlah titik panas MODIS Terra+Aqua per kab per tahun** (`public/data/riwayat_wilayah/kab.json`, kunci `ym`, 2003-2026, keyakinan >= 30, api vegetasi; 2026 belum lengkap). Ini ukuran paparan api, BUKAN luas terbakar. Bias yang diketahui: titik panas tak sebanding dengan luas (api kecil berulang di lahan pertanian dihitung banyak, api besar tertutup awan atau asap bisa terlewat; rasio luas per titik berbeda antar provinsi dan jenis lahan); tidak membedakan gambut dari mineral; kab dengan banyak lahan tebas bakar naik ke atas. Hasil karena itu menjawab "paparan api" bukan "luas bakar". Ini penyimpangan dari rumusan tugas dan dicatat di ringkasan.
- Label banjir: `public/banjir/data/kejadian.json`, `kab[prov|nama].banjir[tahun]` (DIBI 2008-, tahun kompilasi CKAN untuk 2024; DIBI 2024 tidak lengkap). Kunci kab sama dengan berkas api (510 kab cocok). Label Groundsource per kab (`label_banjir.py gs`) tidak ada di mesin ini (cache `data/raw/banjir/label20/` tak ada, parquet 667 MB); tidak dipakai. Pertanyaan terbuka Q2.
- Tren pelaporan DIBI kuat naik (458 baris 2008 ke 1.300-3.000 per tahun sesudah 2020); ditangani efek tahun.

## Desain
- Panel kab x tahun. Tahun api t = 2008..2022, tahun banjir t+1 = 2009..2023 (15 pasang). 2024 (DIBI tak lengkap) dan 2025-2026 tidak masuk utama; 2024 tidak dipakai sama sekali.
- Himpunan kab: kab yang pernah punya api bermakna, yaitu rata-rata titik MODIS per tahun 2008-2022 >= 20 (`rk`/`m` tak dipakai; dihitung ulang dari `ym`). Kab dengan nol banjir seluruh 2009-2023 dibuang (tak ada informasi di dalam kab).
- x = log(1+titik MODIS tahun t); z = log(1+banjir tahun t+1); p = log(1+banjir tahun t) (persistensi).
- Utama (M1): efek tetap dua arah, kab dan tahun. Dengan panel seimbang, x, z, p di-demean dua arah lalu OLS z~ pada x~ dan p~. Tiap kab menjadi kendalinya sendiri; tren pelaporan nasional dan ukuran penduduk tetap kab terserap. p wajib sebagai pembanding persistensi (sejarah banjir kab).
- M0 (pembanding): sama tanpa x, hanya p, dilaporkan sebagai R2 dalam-kab; tambahan R2 oleh x dilaporkan. Catatan: lag-DV dalam efek tetap punya bias Nickell (T=15, kecil); M1b tanpa p juga dilaporkan sebagai sensitivitas.
- Interval: bootstrap klaster per kab, 1.000 ulangan, seed 20261125, persentil 2,5-97,5.
- Pembaur ENSO (El Nino 2009, 2015, 2019, 2023 membawa api; sesudahnya La Nina membawa hujan): (a) efek tahun sudah membandingkan kab terbakar dan tak terbakar pada pasangan tahun yang sama; (b) uji pasangan-tahun eksplisit: tiap t, bagi kab ke sepertiga atas dan bawah menurut anomali api (x dikurangi rata-rata kab), selisih rata-rata anomali banjir (z dikurangi rata-rata kab) atas minus bawah; rata-rata atas 15 tahun, bootstrap per kab; (c) pisah beta menurut t tahun El Nino vs lainnya; (d) plasebo: x tahun t+2 (api SESUDAH banjir) memprediksi banjir t+1; bila ini juga positif berarti iklim bersama atau tren lokal, bukan api.
- Satuan: beta pada log-log = persen perubahan banjir per 1% titik; dilaporkan juga per penggandaan titik: 2^beta - 1. Klaim +25% adalah aliran permukaan, bukan jumlah kejadian; tidak dapat dibandingkan langsung, hanya arah dan urutan besar.

## Aturan vonis (dikunci sekarang)
Dibaca dari M1:
- **didukung** bila beta > 0 dengan CI95 > 0, DAN uji pasangan-tahun CI95 > 0, DAN plasebo CI95 memuat 0.
- **tertahan (kemungkinan pembaur iklim)** bila beta > 0 CI95 > 0 tetapi plasebo CI95 > 0 atau pasangan-tahun memuat 0.
- **tidak terbukti** bila CI95 beta memuat 0.
- **berlawanan** bila CI95 beta < 0.
Selalu berlabel hipotesis; bukan sebab; bukan "aman".

## Pertanyaan terbuka (bawaan sementara)
- Q1: luas terbakar per kab (mis. MapBiomas Fire per kab) untuk menggantikan titik panas. Bawaan: titik MODIS.
- Q2: label Groundsource per kab sebagai hasil kedua. Bawaan: tidak dipakai (cache tak ada).
- Q3: ambang api bermakna 20 titik per tahun dipilih sebelum hasil; tidak diubah.

## Hasil (dijalankan sekali, 2026-11-25, tanpa perubahan sesudah melihat hasil)
Berkas: `public/banjir/data/lab/api_banjir.json`, `api_banjir_ringkas.md`. 223 kab, 3.345 pasangan kab-tahun.
- M1 (efek tetap kab dan tahun, kendali riwayat banjir): beta 0,0176, CI95 -0,0083 sampai 0,0451; per penggandaan titik panas +1,2 persen (CI95 -0,6 sampai +3,2). R2 dalam-kab bertambah 0,0005 oleh api; persistensi sendiri 0,0211.
- M1b tanpa kendali persistensi: beta 0,0034 (CI95 -0,023 sampai 0,031).
- Pasangan-tahun, sepertiga atas minus bawah: 0,004 (CI95 -0,059 sampai 0,053).
- Menurut tahun api: El Nino (2009, 2015, 2019, hanya 3 tahun) beta -0,112 (CI95 -0,186 sampai -0,037); tahun lain 0,004 (CI95 -0,030 sampai 0,036).
- Plasebo api t+2: -0,030 (CI95 -0,055 sampai -0,001), dengan atau tanpa x_t.
- **Vonis menurut aturan: tidak terbukti** (CI95 beta memuat 0). Efek positif besar seperti klaim +25 persen tidak tampak; batas atas CI95 per penggandaan titik hanya sekitar +3 persen.

## Penyimpangan dan catatan
- Paparan api dari titik panas MODIS, bukan luas terbakar (data per kab tidak ada). Konsisten dengan prareg, tetapi bukan rumusan tugas awal.
- Plasebo dijalankan dengan dua spesifikasi (dengan dan tanpa x_t); prareg tidak merinci, keduanya dilaporkan, keduanya sama.
- Plasebo CI memuat nilai negatif kecil dan tahun El Nino negatif: tanda tidak stabil, tidak ditafsir (3 tahun, tanpa koreksi banyak uji). Tidak mengubah vonis.
- Groundsource tidak dipakai (Q2); DIBI 2024 dan sesudahnya dikeluarkan.
