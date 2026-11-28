# TIKET: Pemetaan bekas longsor dari satelit

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| LS-01 [SELESAI 26 Nov 2026, jangkar menunggu commit] | Kunci `bekas_kriteria.json`: kejadian kalibrasi dan uji (dipilih mekanis dari DIBI sebelum citra dilihat), ambang, rancangan sampel, pembanding; sidik dan jangkar | longsor (+ validasi-model) | T1 | Q3, Q4 |
| LS-02 | Lembar buta penafsir (dibangun baru): titik sampel dari peta beku, dua penafsir, kappa, penafsir ketiga buta untuk yang tidak sepakat | longsor + pemilik (penafsir) | T3 | LS-01, Q1, Q2 |
| LS-03 [SELESAI 26 Nov 2026, tanpa tarikan citra] | `bekas.py`: komposit, rdNDVI, saringan, poligon, agregat, penjaga sidik | longsor | T2 | LS-01 |
| LS-04 | Lapis tumpang tindih tebangan (Hansen tahun sebelum kejadian, GFW integrated alerts bertanggal) terpisah | longsor | T2 | LS-03, Q7 |
| LS-05 | Uji balik optik: kalibrasi lalu uji sekali; vonis | longsor (+ validasi-model) | T4 | LS-02, LS-03, LS-04 |
| LS-06 | `bekas_radar.py` dan uji balik radar | longsor (+ validasi-model) | T5 | LS-02 |
| LS-07 | Rute baca staf dan lapisan `/siklus`; tanpa angka bila bukan lulus | warga-api + siklus (+ guard-api, security-reviewer, selera-angka, inp-reviewer) | T6, T7, T8, tinjau lokal | LS-05, Q5, Q6 |
| LS-08 | Jalan otomatis per kejadian longsor besar | longsor + mekanik-mesin | T10 | LS-05 lulus, Q8 |

## Status (26 Nov 2026)

**LS-01.** `scripts/longsor/bekas_kriteria.json` (v1) dan `bekas_sidik.json` ditulis SEBELUM data apa pun ditarik. Isi: kejadian uji (Tapanuli Tengah kode 1201 dan kab bersentuhan, 25 Nov 2025; tetangga dihitung mekanis di LS-05), kejadian kalibrasi dipilih mekanis dari DIBI (jendela 7 hari terbanyak, 2019-01-01..2025-06-30, 3 kab: Bogor 2021-02-04 [26], Sukabumi 2021-11-23 [15], Majalengka 2019-04-07 [13]; sidik `kejadian.json` terkunci), ambang lulus ALGORITMA 4 (F1 >= 0,6, presisi >= 0,7, selisih F1 >= 0,10 atas pembanding terkuat global dan di dua strata lereng, CI90 > 0, plasebo <= 10 persen), kappa >= 0,6, titik >= 600 uji dan >= 300 kalibrasi, >= 100 per strata, bootstrap 2.000 benih 20251125, larangan. Tidak dikarang: ambang radar belum ada angkanya di ALGORITMA, jadi tertulis "menunggu" di kriteria. Catatan jujur tertulis: kalibrasi mekanis condong ke Jawa Barat (padat, berkebun), kurang mewakili lereng hutan Tapanuli; bila titik bekas kalibrasi < 30 Q3 dibuka kembali ke pemilik. **Sisa untuk menutup kunci:** commit kedua berkas, lalu isi `jangkar_commit` di `bekas_sidik.json` dengan hash commit itu (sesi induk), baru `bekas.py prasyarat` rc 0. Rancangan sampel (daya CI presisi) dihitung di LS-02/LS-05 dari strata nyata. Bukti: `python3 -I scripts/longsor/bekas.py cek` rc 0.

**LS-03.** `scripts/longsor/bekas.py`: periksa_kunci/kunci, NDVI, rdNDVI, MNDWI, komposit median ber-SCL (min 2 pengamatan), klasifikasi (lereng, NDVI awal, air, sungai; tebangan dipisah ke kelas 2), gugus 8-tetangga >= 3 piksel, agregat per kecamatan (null bila bukan lulus atau terliput < 50 persen). Swa-uji `bekas.py uji` hijau dengan data sintetis: petak longsor terdeteksi, tebangan tersaring terpisah, piksel tunggal tak jadi poligon, awan jadi NaN lalu null (bukan 0), bukan-lulus null. Belum ada: pembaca COG/STAC dan vektorisasi poligon ke GeoJSON (butuh tarikan; subperintah `kab`, tidak dibuat sebelum rencana disetujui). Pembaca TIFF `tiff_mini.py` dipakai ulang lewat `lereng_dem.py` untuk lereng.

## Hasil tarikan (26 Nov 2026, disetujui pemilik; grid saja, belum ada bekas, ambang, luas, atau vonis)

Kode: `scripts/longsor/bekas_tarik.py` (subperintah `uji`, `daftar`, `rencana`, `tarik`, `ringkas`; penjaga `periksa_kunci` di awal `tarik`; swa-uji jaringan lokal: Range, byte terhitung, pengalihan ke host lain ditolak, batas 30 GB berhenti, dekode ubin deflate+prediktor 2, median bersih, kepemilikan ubin, `tarik` menolak tanpa kunci). numpy 2.0.2 di venv `data/raw/longsor/bekas/venv` (Python 3.9.6, 30 MB, gitignored). Host yang disentuh hanya earth-search.aws.element84.com, sentinel-cogs.s3.us-west-2.amazonaws.com, copernicus-dem-30m.s3.amazonaws.com, storage.googleapis.com. Keluaran di `data/raw/longsor/bekas/<kejadian>/` (gitignored): `blok/<ubin>_<baris>_<kolom>.npz` per blok 1.024 x 1.024 piksel 10 m (ndvi_sb, n_sb, ndvi_ss, mndwi_ss, n_ss; uint8, q = round((x+1)*127), 255 = tak ada data), `dem/` GLO-30 mentah, `hansen/` lossyear (30 m), `meta.json`, `ringkas.json`. Komposit: median reflektans per pita dari piksel bersih (SCL 3, 8, 9, 10 dibuang, DN 0 = tak ada), NDVI dan MNDWI dari komposit, minimal 2 pengamatan bersih. Per ubin MGRS (tanpa campur antar ubin); kepemilikan piksel = titik tengah antara pusat ubin tetangga, jadi tidak ganda. Sebelum = 12 adegan (satu terbersih per 1/12 jendela 12 bulan), sesudah = 8 adegan terbersih hari 3-90 (menurut `eo:cloud_cover` ubin).

| Kejadian | Ubin (adegan sebelum/sesudah) | Blok | Waktu | Transfer | Disimpan | Terliput sebelum / sesudah |
| --- | --- | --- | --- | --- | --- | --- |
| Majalengka 2019-04-07 | 49MBN (12/8) | 11 | 8 mnt | 0,89 GB | 71 MB | 100,0 / 97,4 persen |
| Bogor 2021-02-04 | 48MXT, 48MXU, 48MYT, 48MYU (12/8 tiap ubin) | 62 | 31 mnt | 4,60 GB | 117 MB | 97,7 / 92,6 persen |
| Sukabumi 2021-11-23 | 48MXS, 48MXT, 48MYS, 48MYT (12/8) | 75 | 30 mnt | 5,10 GB | 207 MB | 88,8 / 89,7 persen |
| Uji Tapanuli Tengah 2025-11-25 (kab inti saja) | 47NLC, 47NMB, 47NMC, 47NNB, 47NNC (12/8) | 67 | 29 mnt | 4,42 GB | 163 MB | 68,8 / 64,0 persen |

Jumlah: transfer nyata 15,01 GB (batas 30 GB; taksiran awal 20-30 GB terlalu tinggi, per blok sekitar 70 MB termasuk kepala COG), disimpan 562 MB, tanpa unduhan adegan utuh. "Terliput" = persen piksel milik ubin (blok utuh, belum dipotong poligon kab, termasuk laut) yang punya >= 2 pengamatan bersih; bukan terliput kecamatan menurut ALGORITMA 1 (itu dihitung di LS-05 dari poligon). Tanggal adegan per ubin ada di `meta.json` tiap kejadian.

Masalah dan keputusan yang dibutuhkan:
1. **Tetangga uji belum ditarik.** Aturan mekanis kriteria (kab bersentuhan, dihitung dari simpul bersama) menemukan Aceh Singkil, Humbang Hasundutan, Kota Sibolga, Pakpak Bharat, Tapanuli Selatan, Tapanuli Utara. Taksiran awal seluruh gabungan 278 blok, sekitar 15 GB sedangkan sisa batas transfer 15 GB dan disk sedang sekitar 6 GiB: tidak dijalankan. Subperintah `tarik uji_1201_tetangga` siap (blok yang sudah ada dilewati); butuh persetujuan transfer sekitar 11-15 GB dan disk lega.
2. **Dua penyaring D5 belum terbangun:** topeng alur sungai OSM (tak ada sumber di repo; Overpass bukan host yang disetujui) dan peringatan tebangan GFW terintegrasi bertanggal (butuh kunci API GFW). Hansen lossyear sudah ada (tahun-tahun sebelum kejadian, dipakai LS-04/05). Tanpa keduanya penyaring itu tidak diterapkan dan hal ini wajib tertulis di vonis; jangan diisi diam-diam.
3. **Terliput uji rendah (sekitar 64-69 persen)** karena musim hujan Sumatera dan lereng barat; kecamatan di bawah 50 persen akan jadi "tidak terliput" (ALGORITMA 1), bukan nol.
4. **MNDWI tak ada data di sekitar 14 persen piksel** yang gelap (penyebut hijau + SWIR <= 0 setelah offset baseline 04.00); piksel ini kemungkinan air atau bayangan. Keputusan pemakaian saringan MNDWI dikunci di kalibrasi (LS-05); catat bahwa NaN di sana bukan "bukan air".
5. Kuantisasi uint8 NDVI = 1/127 (sekitar 0,008); pengaruh ke ambang rdNDVI -0,20..-0,50 kecil tetapi tercatat. Plasebo musim sama (pembanding a, butuh 12 adegan setahun lebih awal) belum ditarik: tambahan transfer sekitar 1/3 per kejadian, diputuskan di LS-05.
6. Kalibrasi mekanis Jawa Barat sudah dipakai sesuai kunci (risiko transfer ke hutan Tapanuli tetap seperti tertulis di D10).
7. DEM: GLO-30 mentah per ubin 1 derajat (12-48 MB) disimpan; lereng dihitung di LS-05 lewat `lereng_dem.py`.

Pemeriksaan bersih validasi-model (26 Nov 2026): LAYAK lanjut ke LS-02/LS-05, tanpa temuan berat; kebocoran tidak ada, kepemilikan ubin tidak ganda, pagar jaringan lolos, `bekas.py cek` rc 0. Syarat sebelum LS-05 membuka kejadian uji:
- **Penyimpangan sadar dari ALGORITMA 1:** spek meminta median piksel bersih 12 bulan dan hari 3-90; pelaksanaan memakai subsampel 12 adegan sebelum dan 8 adegan sesudah. Angka 12 dan 8 serta cara memilihnya adalah parameter pelaksana yang tidak dikunci sidik (tidak diturunkan dari data, bukan kebocoran), kemungkinan ikut menurunkan terliput uji, dan wajib tertulis di vonis. Sensitivitas hari 3-45 tidak bisa dibuat dari grid tersimpan (hanya satu komposit sesudah); di LS-05 diputuskan apakah ditarik ulang.
- **Jangkar harus di GitHub:** commit kunci 304b89683 dan jangkar ed5ae54b8 belum di origin; jangan di-rebase, dan pastikan masuk origin sebelum kejadian uji dibuka.
- **Air tiga keadaan di LS-05:** `bekas.py` `klasifikasi` kini menganggap MNDWI tak ada data sebagai bukan air; di LS-05 nilai 255 MNDWI jadi "tak terliput", dengan satu assert uji.
- Catatan: galat rdNDVI dari kuantisasi paling besar sekitar 0,011 (NDVI sebelum >= 0,5), sekitar seperlima langkah kisi 0,05; batas 0,5 jatuh di antara dua level, tidak bias. Angka blok dan terliput di `ringkas.json` hanya menghitung blok yang ditarik pada putaran itu; untuk tarikan berlanjut, hitung ulang dari npz di LS-05. Pemeriksa disk memakai `~` (satu volume saat ini). Ubin uji di `meta.json` ada 6 (47NLB berisi 0 blok).
