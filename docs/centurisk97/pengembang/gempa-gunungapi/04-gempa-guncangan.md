# Gempa: katalog, guncangan, susulan

Halaman ini menguraikan metode katalog gempa, guncangan, peluang susulan, dan laju 12 bulan.

## Gempa: katalog, penggabungan, dan kejadian

Sumber: BMKG (`autogempa.json`, `gempaterkini.json`, `gempadirasakan.json` di `data.bmkg.go.id/DataMKG/TEWS/`) dan USGS FDSN (kotak lintang -11,5 sampai 6,5, bujur 94 sampai 142, M 4,5 atau lebih) (`src/gempa.js:15`).

Langkah (`src/gempa.js`):
1. Cron Worker `* * * * *` memanggil `perbaruiGempa` (`src/gempa.js:226`) tiap menit untuk `autogempa`; menit kelipatan 5 menambah `gempaterkini`, `gempadirasakan`, dan USGS 3 hari terakhir. ETag per sumber disimpan di `gempa_sumber`; bila semua jawaban 304, penanda sehat diperbarui hanya tiap 10 menit.
2. Penguraian BMKG: `Magnitude` dan `Kedalaman` adalah teks, diurai ke angka; kunci alami `DateTime|Coordinates` (BMKG tidak punya id). `Potensi` diurai oleh `uraiPotensi` (`src/gempa.js:26`): teks "tidak berpotensi tsunami" menjadi kode 0; teks "berpotensi tsunami" tanpa "tidak" menjadi 1 sampai 3 menurut kata Waspada, Siaga, Awas (tanpa tingkat menjadi 1); selain itu `NULL`.
3. Penggabungan BMKG dan USGS bila selisih waktu 90 detik atau kurang dan jarak 100 km atau kurang (`TOL_MS`, `TOL_KM`); BMKG menang atas magnitudo dan lokasi. Data USGS disaring dari Filipina, Timor Leste, Papua Nugini, Malaysia, dan seterusnya (`ASING`, `src/gempa.js:62`), dengan poligon kecamatan didahulukan atas teks `place`.
4. Wilayah: provinsi dan kabupaten dari pusat kecamatan terdekat dalam 300 km (`WIL_MAKS_KM`); gempa di laut jauh hanya memuat teks wilayah sumber.
5. Pengelompokan kejadian (`kelompokkan`): gempa M 5 atau lebih bergabung ke kejadian yang masih aktif bila jaraknya di dalam jendela Gardner-Knopoff, `R = 10^(0,1238 M + 0,983)` km (`src/gempa.js:153`); kejadian aktif 3 hari, atau 7 hari bila M 6,5 atau lebih (`src/gempa.js:154`). Gempa M di bawah 5 tertaut ke kejadian sebagai susulan bila masuk jendela `R = exp(-1,024 + 0,804 M)` km dan `T = exp(-2,87 + 1,235 M)` hari, T dipotong 35 hari (`src/gempa.js:184-187`).
6. Pembersihan menit 17 tiap jam: baris `m < 4` berumur lebih dari 90 hari tanpa kejadian dihapus (`src/gempa.js:246`).

Batasan: BMKG hanya memuat 15 butir `Dirasakan` dan 30 buletin terakhir, sehingga arsip D1 dan arsip InaTEWS di repo (append-only) menjadi bahan uji balik. Hari Worker mati berarti data uji hilang selamanya.

## Gempa: guncangan satu gempa (GMPE dan GMICE)

Berkas: `scripts/gempa/guncangan.py` dan kembaran peramban `public/gempa/guncangan.js`; kesetaraan Python dan JS diuji `uji_js_guncangan.py`.

```
Rjb = max(0, Repi - L/4),  log10 L = -2,44 + 0,59 M          (Wells-Coppersmith 1994)
PGA kerak       : BSSA14 (Boore dkk. 2014)
PGA antarmuka   : Zhao dkk. 2006, subduksi antarmuka
PGA intraslab   : Zhao dkk. 2006, magnitudo dipotong 7,8 (OpenQuake NSHMP 2014)
lg = log10(PGA dalam cm/s2)
MMI = 1,78 + 1,55 lg       bila lg <= 1,57
MMI = -1,6 + 3,7 lg        selain itu                        (Worden dkk. 2012)
```

Nilai koefisien dari `public/gempa/data/model_guncangan.json`. MMI dipotong 1 sampai 10; di luar 3 sampai 8 ditandai ekstrapolasi. Kecamatan dihitung sampai MMI turun di bawah 2, paling jauh 400 km. Jenis sumber ditebak dari kedalaman: 50 km atau lebih dianggap intraslab; gempa dangkal 15 sampai 50 km dengan M 7 atau lebih dianggap antarmuka bila jaraknya 200 km atau kurang dari segmen subduksi PB2002 (`radius_palung_km = 200`). Vs30 seragam 400 m/s kecuali di Simulasi, yang memakai peta Vs30 per sel 0,05 derajat dari proksi kemiringan DEM (`scripts/gempa/vs30.py`, koreksi Wald-Allen 2007, galat tipikal sekitar 30 persen, tabelnya "belum dicocokkan ke makalah asli").

Status uji: berkas model menulis `kinerja_uji.status = "belum_diuji"` terhadap arsip laporan Dirasakan. Uji prospektif berjalan terpisah (lihat bagian Uji prospektif guncangan dan PAGER). Koefisien ditranskripsi tanpa salinan digital; `validasi-model` wajib mencocokkannya ke makalah. Uji kesetaraan hanya membuktikan Python sama dengan JS, bukan benarnya koefisien. Model cenderung 0,5 sampai 1,5 kelas MMI lebih rendah di pantai yang jauh dari megathrust (contoh Pangandaran 2006 dan Banyuwangi 1994). Status: HIPOTESIS.

Koreksi dengan laporan warga EMSC (`scripts/gempa/emsc.py`): pembagian waktu 60, 20, 20 persen, uji dibuka sekali; RMSE uji tanpa koreksi 1,556 kelas lawan 1,598 dengan koreksi terpilih (`wilayah+jarak`); vonis GAGAL, koreksi tidak dipakai. Pembanding MAGMA (`kajian_magma.py`): 1.627 tempat dari 508 kajian, bias +0,26 kelas, MAE 0,73, dan bias -1,61 untuk gempa dalam lebih dari 300 km (n = 44); hanya pembanding, koefisien tidak disetel.

## Gempa: peluang susulan

Berkas: `scripts/gempa/susulan.py`, `public/gempa/susulan.js`; keluaran `model_susulan.json`, `prospektif_susulan.json`.

```
lambda(t) = 10^(a + b (Mu - Mmin) + (alfa - b)(Mu - 6)) (t + c)^(-p)
N  = integral lambda dt di [t1, t2]
P(>= 1 susulan) = 1 - exp(-N)
a ~ Normal(mu, sigma)  (81 simpul, z dari -4 sampai 4); peluang tampil = rata-rata P atas sebaran a;
rentang 10 sampai 90 persen = P pada mu -+ 1,2816 sigma
```

Parameter berlaku (`model_susulan.json`): a = -2,8369, b = 1,192, p = 0,9, c = 0,05 hari, mc = 4,7, sigma a = 0,9422, alfa = 1,0576. Gempa utama: M 5 atau lebih di Indonesia yang tidak berada di jendela Gardner-Knopoff gempa lebih besar sebelumnya. Latih 2000 sampai 2019 (2.333 gempa utama), validasi 2020 sampai 2022 (322), uji 2023 sampai kini minus 7 hari (406); uji dibuka satu kali oleh perintah `latih`. Target yang diterbitkan: hanya M 5 atau lebih (`terbit_target`: m5 benar, m6 salah, m_1 salah). Penyesuaian per rangkaian (Bayes) diuji dan kalah, jadi `terbit_sesuaikan = false`.

Status uji: BSS terhadap pembanding sederhana (proporsi gempa sekelas yang diikuti susulan) hanya 0,0021, jadi model belum terbukti lebih baik. Cacah susulan rata-rata terlalu tinggi dan pada peluang tinggi model meramal 67,5 persen padahal teramati 55,6 persen. Uji prospektif: 24 gempa utama dicatat, 18 sudah dinilai, 0 susulan M 5 terjadi, harapan model 2,4. Status: HIPOTESIS. Rentang 10 sampai 90 persen hanya untuk Mu sampai 5,5; jam pertama tidak dimodelkan; jendela jarak terlalu sempit untuk megathrust.

## Gempa: laju 12 bulan

Berkas: `scripts/gempa/peluang_gempa.py` (`laju.json`, `peluang.json`). Laju dari USGS M 5 atau lebih tahun 1990 sampai 2025 setelah deklasterisasi Gardner-Knopoff; dangkal berarti kedalaman 70 km atau kurang; wilayah dengan kurang dari 3 kejadian tidak ditampilkan peluangnya. `P(>= 1 dalam 12 bulan) = 1 - exp(-laju)` (Poisson).

Uji balik laju 1990 sampai 2015 ke cacah 2016 sampai 2025 (selang Poisson 90 persen): M 5 atau lebih teramati 1.120 di bawah selang 1.144 sampai 1.258 (gagal); M 6 atau lebih 119 dalam selang 115 sampai 153 (lolos); M 7 atau lebih 14 dalam selang 13 sampai 28 (lolos tipis); M 7 atau lebih dangkal 8 di bawah selang 10 sampai 23 (gagal). Kelas yang gagal uji tidak menampilkan angka peluang (`p12 = null`); M 7 atau lebih tampil sebagai selang Garwood 90 persen dari cacah 2016 sampai 2025. Dugaan sementara untuk kelas M 7 atau lebih dangkal: periode latih memuat rentetan Sumatra 2004 sampai 2010 dan dekade uji sepi; dugaan ini belum diuji (`.claude/ilmu-agent/gempa.md:69`). Peluang M 5 atau lebih per hari tidak dipakai.
