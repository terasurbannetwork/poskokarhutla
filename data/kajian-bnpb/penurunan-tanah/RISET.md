# RISET: Penurunan tanah dari InSAR

## 1. Benchmark

| Sistem | Yang ditiru | Batas |
| --- | --- | --- |
| Copernicus European Ground Motion Service (EGMS) | Laju gerak tanah vertikal dan timur-barat dari Sentinel-1, ketelitian milimeter per tahun, referensi ke GNSS, lapisan dikalibrasi dan diverifikasi. | Hanya mencakup Eropa; tidak ada produk setara untuk Indonesia. Dipakai sebagai teladan label dan galat, bukan sebagai data. |
| COMET LiCSAR dan LiCSBAS (Lazecky dkk. 2020; Morishita dkk. 2020) | Interferogram Sentinel-1 terbuka dan perangkat deret waktu yang sudah dipakai untuk Indonesia (Perdana dkk. 2025 memakai LiCSBAS dan GACOS di Medan). | LiCSAR tidak punya produk laju untuk Indonesia (bagian 2). |
| ASF HyP3 | InSAR sesuai permintaan satu pasangan per pekerjaan. | Butuh login Earthdata; satu pasangan per pekerjaan, deret waktu harus dirakit sendiri. |

Rentang laju di literatur repo (`public/banjir/data/subsiden_literatur.json`, dibaca 21 Okt 2026): Jakarta umumnya 1-15 cm/tahun, beberapa lokasi 20-28 (Abidin dkk. 2011, 1982-2010) dan maksimum lebih dari 5 cm (Sidiq dkk. 2021, SBAS Sentinel-1 2016-2020); Semarang 6 sampai 19 (Abidin dkk. 2013) dan 8 (Sidiq dkk. 2021); Pekalongan 5 sampai 16 (Sidiq dkk. 2023) dan 7 (Sidiq dkk. 2021); Surabaya 4,5 (Anjasmara dkk. 2020, LOS); Medan 0,84 sampai 13,56 (Tambunan dkk. 2026) dan 4,86 (Perdana dkk. 2025). Rentang tidak sebanding antarkota (periode, metode, vertikal atau LOS berbeda). Rerata BRIN 3,5 cm per tahun untuk Jakarta: belum ada di repo, tidak diverifikasi.

## 2. Yang sudah ada di repo (diukur 15 Nov 2026)

| Hal | Berkas | Fakta |
| --- | --- | --- |
| Dekomposisi dan agregasi | `scripts/banjir/subsiden.py:68` (`vertikal`), `:102` (`agregasi`), `:133` (`hitung`) | Stdlib saja. Satu geometri: vU = vLOS dibagi U. Dua geometri: selesaikan vU dari dua persamaan vLOS = E*vE + U*vU (vN diabaikan). Pencilan |LOS| di atas 400 mm per tahun dibuang (`:29`), U minimum 0,3 (`:30`), determinan minimum 0,35 (`:31`). |
| Gerbang pola | `scripts/banjir/subsiden.py:124` | Median Jakarta Utara harus lebih turun minimal 1 cm per tahun dari Jakarta Selatan; bila tidak, tidak ada berkas yang ditulis (`:211`). Hanya berlaku untuk Jakarta: kota lain belum punya gerbang. |
| Keluaran | `scripts/banjir/subsiden.py:215` menulis `public/banjir/data/subsiden.json` | Berkas itu TIDAK ADA hari ini (dicek `ls public/banjir/data/subsiden*`: hanya `subsiden_literatur.json`). Skrip belum pernah dijalankan pada data nyata; hanya `python3 scripts/banjir/subsiden.py uji`. |
| Kolom per kecamatan | `scripts/banjir/subsiden.py:117` | kec, kab, n piksel, cakupan persen, med dan p90 dalam cm per tahun (negatif turun). Tidak ada galat baku piksel, tidak ada tanggal deret waktu. |
| Akses data dan resep | `scripts/banjir/RISET-SUBSIDEN.md:6-29` | CEDA mendukung HTTP Range (berkas unw dan cc 2 sampai 10 MB penuh); JASMIN `vlos_eur.tif` hanya proyeksi gerak lempeng, bukan deformasi; LiCSBAS01 v1.6.3 menunjuk server mati sehingga butuh pengunduh sendiri; frame Jakarta 047D_09652_111009 dan 098A_09673_121312, Semarang dan Demak 076D_09725_121107 dan 127A_09749_121312, Pekalongan 076D_09725_121107 dan 025A_09718_120810, Surabaya 003D_09757_111111 dan 054A_09773_111213. |
| Hambatan izin | `scripts/banjir/RISET-SUBSIDEN.md:34-36` | 21 Okt 2026: izin menolak menjalankan atau menyunting kode LiCSBAS hasil klon; butuh keputusan pemilik atas aturan izin untuk `~/licsbas/lb.sh` dan `~/licsbas/ambil.py`. Jadi Q1. |
| Literatur | `public/banjir/data/subsiden_literatur.json` | Berlabel hipotesis, enam kota (jakarta, semarang, pekalongan, surabaya, medan, cirebon yang kosong). Beku oleh sidik J4 (`scripts/banjir/genangan/j4_sidik.json`). |
| Lapis peta | `public/banjir/lapis_ekstra.js:39-46` (`subsidenTitik`, `SUB_WARNA`), `:88-93` (lapis `ekstra-sub`), `:116` (`kartuSub`), `:130` dan `:136` (legenda) | Titik per kota, nilai gambar = maksimum yang dikutip, bukan kontur. `public/banjir/peta.js:5` memuat literatur; `:163` baris kartu rob. |
| Catatan kaki rob | `public/banjir/lapis_air.js:122` | "Surja badai, gelombang, dan penurunan tanah tidak termasuk." |
| Model rob | `scripts/banjir/rob.py` (710 baris) | Prakiraan muka laut dan status per hari dari Open-Meteo Marine, IOC, BMKG; ambang persentil (`PERSENTIL` baris 39). Tidak ada proyeksi tahunan dan tidak ada komponen penurunan tanah. |
| Abrasi | `scripts/pesisir/abrasi.py:58` | Lima situs: Sayung, Pekalongan, Indramayu, Subang, Bekasi (Landsat). Garis pantai, bukan elevasi. |
| Elevasi | `scripts/banjir/RISET-ROB.md:152-165` | DeltaDTM v1.1 (MAE 0,43 m, CC BY 4.0, Asia.zip 17,3 GB) dinilai terbaik tetapi tidak diunduh dan tidak dipakai kode mana pun hari ini (dicek grep). |
| Batas wilayah | `public/geo/kecamatan/<kodeprov>.json`, `public/geo/desa/<kab>.json` | Berkas desa hanya memuat properti `kd` (kode kelurahan/desa, misal `31.01.01.1001`); nama harus dicari dari tabel lain. |

## 3. Opsi pengambilan data (dibandingkan)

| Opsi | Cara | Kelebihan | Kekurangan | Status |
| --- | --- | --- | --- | --- |
| A. LiCSBAS atas interferogram LiCSAR | Pengunduh sendiri ambil jendela kota dengan GDAL dari CEDA, lalu `LiCSBAS02` sampai `16`, hasil `vel.filt.mskd` dibaca `subsiden.py`. | Deret waktu penuh dengan galat; tanpa akun; resep sudah ada; `subsiden.py` siap. | Berat dan lama (puluhan gigabyte sementara, jam komputasi); kode eksternal diblokir izin (Q1); butuh GDAL dan conda. | Terhenti di Q1. |
| B. ASF HyP3 InSAR sesuai permintaan | Kirim pasangan Sentinel-1 lewat HyP3, ambil produk interferogram tak terbuka lipatan. | Tanpa pemrosesan SAR lokal. | Butuh login Earthdata (pemilik); kuota kredit bulanan (besarnya tidak diverifikasi di riset ini); satu pasangan per pekerjaan, deret waktu dan inversi tetap harus dirakit (perangkat lunak MintPy atau LiCSBAS atas hasilnya); tidak ada hasil terukur di repo. | Cadangan, Q2. |
| C. Kecepatan dari literatur | `subsiden_literatur.json`, rentang terpilih per kota. | Sudah ada dan terverifikasi; tanpa komputasi. | Per kota, bukan per wilayah; periode dan metode tidak seragam; tidak bisa membedakan kecamatan. | Cadangan wajib bila A dan B tidak jalan: proyeksi per kota berlabel hipotesis. |
| D. EGMS | Unduh langsung. | Benchmark mutu. | Tidak mencakup Indonesia. | Tidak dipakai sebagai data. |

Vonis riset: A adalah jalur utama bila Q1 dibuka; C adalah jalur yang tetap tayang bila tidak. B tidak menjadi syarat. Tidak ada yang dijalankan dalam penyusunan paket ini.

## 4. Mengapa tidak di GitHub Actions

Resep A memakai conda (GDAL 3.13, scipy, h5py), mengunduh puluhan gigabyte sementara, dan menjalankan jam-jam komputasi. `banjir.yml` punya batas 120 menit total dan sudah dipenuhi hujan, sungai, dan rob (`.github/workflows/banjir.yml:31`). Yang masuk repo hanya `subsiden.json` (satu berkas kecil per penyegaran).

## 5. Yang tidak ada

Tidak ada data GNSS mentah atau levelling di repo, tidak ada deret waktu penurunan, tidak ada angka penurunan per kelurahan, tidak ada proyeksi rob tahunan, tidak ada uji balik rob terhadap penurunan.

## 6. Riset dan laporan tambahan (dicari 23 Nov 2026)

Dicari sesudah pemilik mengirim dua video pendek media sosial: Gedebage, Bandung ("sampai 17 cm per tahun menurut pengukuran satelit tim ITB") dan Muara Baru, Jakarta Utara ("tanah turun sampai 10 cm per tahun, sekitar 24 kali lebih cepat daripada laut"). Berkas videonya tidak tersimpan di repo; isinya dicatat dari judul. Angka di bawah dibaca dari abstrak, ringkasan hasil pencarian, dan berita, belum dari teks lengkap. Tidak ada yang masuk `subsiden_literatur.json` (beku J4) atau layar sebelum sumber primernya dibaca.

### 6.1 Cekungan Bandung (belum ada di paket ini)

| Wilayah | Angka | Periode dan metode | Sumber |
| --- | --- | --- | --- |
| Gedebage, Dayeuhkolot | rata-rata sekitar 10 cm/tahun, maksimum sekitar 17 | Sentinel-1 InSAR 2014-2021, divalidasi GPS (Springer 2023, penulis ITB) | ringkasan https://pengabdian.dpmk.itb.ac.id/proyek/pemetaaan-dampak-penurunan-muka-tanah-di-wilayah-gedebage-kota-bandung |
| Gedebage | 4 sampai 15 cm/tahun | GNSS dan InSAR 2016-2019 (IOP Conf. Series 2021, KK Geodesi ITB) | https://www.proquest.com/docview/2591369949 |
| Cekungan Bandung, bagian tengah | sampai 18,7 cm/tahun, disertai kerusakan bangunan | geodesi satelit (Rygus dkk. 2023) | https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_journals_2863873888 |
| Cekungan Bandung | -24 sampai +4 cm/tahun | ENVISAT dan ALOS PALSAR 2002-2011 (Ge dkk. 2014) | sama dengan baris di atas (rujukan sekunder) |

Catatan: Bandung tidak berpantai, jadi dampaknya banjir genangan cekungan (Citarum hulu, Dayeuhkolot, Baleendah, Gedebage), bukan rob. Keluaran untuk Bandung harus dipasang ke peta genangan dan kejadian banjir, bukan ke proyeksi rob. Lihat Q3 di KEPUTUSAN.

### 6.2 Pantura dan Jawa

| Wilayah | Angka | Periode dan metode | Sumber |
| --- | --- | --- | --- |
| Seluruh Jawa, 10 zona (sekitar 60 juta jiwa) | puncak Jakarta sekitar 15, Semarang 16, Pekalongan 11 cm/tahun | Sentinel-1 SBAS 2017-2023 | https://mdpi.com/2076-3417/15/7/3732 |
| Semarang dan Demak | maksimum 10 sampai 12 cm/tahun; sekitar 20 persen luas Semarang | SBAS dengan GACOS 2015-2022 (Aditiya dan Ito 2023, IJAEOG) | https://doaj.org/article/bc659cefcb624b38a679829477d8e2d1 |
| Pantura (BRIN, berita) | Jakarta utara 5-6, Pekalongan 10-19, Demak 16, Sidoarjo 14 cm/tahun | PS-InSAR, belum ada laporan primer | https://news.republika.co.id/berita/tfw5st475/temuan-brin-jakarta-cirebon-hingga-demak-permukaan-tanah-pesisir-pantura-terus-menurun , https://www.medcom.id/pendidikan/riset-penelitian/lKYDnWok-penurunan-tanah-di-jakarta-mengkhawatirkan-tak-terasa-tapi-dampaknya-nyata |
| Muka laut pantura | 2,4 sampai 4,3 mm/tahun (rata-rata sekitar 0,42 cm/tahun, 1993-2025) | altimetri | https://inet.detik.com/science/d-8513502/pantura-makin-tenggelam-kenaikan-muka-laut-hingga-4-3-mm-per-tahun |
| Pantura (BMKG) | penurunan tanah disebut pemicu banjir; contoh Semarang, Pekalongan, Demak | pernyataan | https://lestari.kompas.com/read/2024/03/15/180000586/bmkg-ungkap-sebab-pantura-langganan-banjir--permukaan-tanah-turun-tiap-tahun |

### 6.3 Jakarta Utara dan Muara Baru

| Sumber | Angka | Catatan |
| --- | --- | --- |
| Dinas SDA DKI | Muara Baru sekitar 10 cm/tahun (tertinggi); Muara Angke melandai dari sekitar 7 (2023) ke 4,5 cm/tahun (2026); 255 titik, rata-rata 3,9 cm/tahun (data 2023, Muara Baru 7,7 dan 10 di titik lain); pemantauan berikutnya Agustus 2026 | https://dsda.jakarta.go.id/detail-artikel/penurunan-permukaan-tanah-jakarta-melambat-perlindungan-pesisir-terus-diperkuat/172 , https://dsda.jakarta.go.id/detail-artikel/19 . Calon pembanding validasi (Q11) karena berupa pengukuran lapangan berkala. |
| Jurnal BRIN 2024 (PS-InSAR dan MICMAC) | rata-rata -5,71 cm/tahun, dominan Jakarta Utara dan Barat | https://ejournal.brin.go.id/JTL/article/view/1125 |
| Undip (DInSAR 2016-2019) | Jakarta Utara rata-rata -11, maksimum -15,6 cm/tahun | https://ejournal3.undip.ac.id/index.php/geodesi/article/download/25161/22370 |
| Pernyataan Menko (CNBC, Nov 2024) | Muara Baru 10 cm/tahun, perkiraan 1 m dalam 10 tahun | https://www.cnbcindonesia.com/news/20241105172015-7-585866/penampakan-tanda-tanda-jakarta-terancam-tenggelam-muncul-di-muara-baru/amp . Berita, bukan pengukuran. |

Klaim video "24 kali lebih cepat dari laut" sama dengan 10 dibagi sekitar 0,42 cm/tahun; perbandingan ini sah sebagai ilustrasi tetapi mencampur angka titik maksimum dengan rerata regional muka laut. Layar tidak meniru gaya ini (D1: dua angka terpisah berlabel).

### 6.4 Data terbuka global yang bisa jadi masukan tanpa LiCSBAS

| Dataset | Isi | Sumber | Yang perlu dicek |
| --- | --- | --- | --- |
| Shirzaei dkk. 2024, "InSAR-Based Coastal Land Subsidence" (Virginia Tech, DOI 10.7294/25864435.v1, terbit 23 Mei 2024) | 17 berkas CSV per kota, kolom bujur, lintang, sudut datang radar, VLM vertikal dalam kerangka IGS14 (cm/tahun), simpangan baku VLM (cm/tahun). Satu-satunya kota Indonesia: Jakarta (`LLIVS_IGS14_Jakarta.csv`, 5,8 MB). Dicek lewat API figshare 23 Nov 2026 | https://data.lib.vt.edu/articles/dataset/InSAR-Based_Coastal_Land_Subsidence/25864435/1 (API: https://api.figshare.com/v2/articles/25864435) | Lisensi CC0 1.0 (domain publik): boleh dipakai dan dimasukkan ke repo. Periode dan satelit belum terbaca (ada di README.rtf dan makalahnya). Semarang, Surabaya, Pekalongan tidak ada. Belum diunduh. |
| Tay dkk. 2022, Nature Sustainability | 48 kota pesisir, median 16,2 mm/tahun | https://www.nature.com/articles/s41893-022-00947-z | ketersediaan raster |
| Oelsmann dkk. 2026, Nature Communications (DOI 10.1038/s41467-026-72293-z) | gabungan dataset gerak tanah per segmen pesisir DIVA; penduduk pesisir mengalami sekitar 6 mm/tahun kenaikan muka laut relatif | https://zenodo.org/records/19831244 (kode, BSD 2-Clause, 51,4 MB, data masukan tidak diterbitkan ulang), https://github.com/oelsmann/global_hybrid_vlm_estimates | per segmen pesisir, terlalu kasar untuk kecamatan; Indonesia tidak disebut khusus |
| ESA, Sinking cities Indonesia | ringkasan bukti geodesi satelit per kota | https://earth.esa.int/eogateway/documents/20142/37627/Sinking-cities-Indonesia-space-geodetic-evidence-rates-spatial-distribution-land-subsidence.pdf | rujukan, bukan data |

Vonis 23 Nov 2026: Shirzaei 2024 menjadi opsi E di bagian 3, data siap pakai untuk Jakarta tanpa menunggu Q1. Karena sudah vertikal, langkah `vertikal` dilewati; tetapi `agregasi` (`subsiden.py:103`) menerima kisi mm/tahun, bukan titik cm/tahun, jadi perlu satu pembaca kecil (titik ke kisi, atau titik-dalam-poligon langsung) beserta konversi satuan dan kolom simpangan baku sebagai `vstd`. Sesudah itu tetap lewat gerbang pola Jakarta Utara lawan Selatan dan label hipotesis (D4). Kerangka IGS14 berarti laju absolut, bukan relatif terhadap titik acuan lokal seperti LiCSBAS; perbedaan ini ditulis di berkas keluaran. Kota lain tetap menunggu Q1 atau literatur. Unduhan menunggu izin pemilik.

### 6.5 Pemeriksaan awal data Shirzaei 2024 Jakarta (24 Nov 2026)

Berkas `data/banjir/subsiden/LLIVS_IGS14_Jakarta.csv.gz` (md5 cocok dengan figshare). Dihitung dengan Python stdlib, tanpa batas kecamatan:

| Ukuran | Nilai |
| --- | --- |
| Baris | 65.251, unik 49.901 (15.350 baris duplikat persis) |
| Cakupan | bujur 106,686 sampai 106,974; lintang -6,374 sampai -6,090 |
| Gerak vertikal | median +0,23 cm/tahun; p5 -1,36; p95 +1,01; paling turun -6,23 |
| Simpangan baku | median 0,014 cm/tahun |
| Utara (lintang di atas -6,15) lawan selatan (di bawah -6,25) | median +0,16 lawan +0,16 cm/tahun |
| Kotak sekitar Muara Baru (bujur 106,79-106,82, lintang -6,115 sampai -6,09) | 147 titik, median -1,88, paling turun -5,83 cm/tahun |

Vonis sementara: data ini TIDAK lolos gerbang pola `subsiden.py` (Jakarta Utara harus lebih turun minimal 1 cm/tahun dari Jakarta Selatan); dengan potongan lintang kasar selisihnya nol. Angkanya juga jauh di bawah literatur dan pengukuran Dinas SDA (Muara Baru sekitar 10 cm/tahun, bagian 6.3). Dugaan yang belum diperiksa: kerangka IGS14 dan titik acuan membuat median kota bergeser ke nol atau positif, periode pengamatannya berbeda, atau berkas ini hanya sebagian kota. Langkah berikut sebelum dipakai: baca bagian metode makalah Shirzaei 2024 (periode, satelit, acuan), lalu hitung ulang per kecamatan dengan batas `public/geo/kecamatan/31.json` (berkas beku J4, hanya dibaca). Sebelum itu tidak ada angka dari data ini yang tayang.

### 6.6 Hitung ulang per kecamatan data Shirzaei 2024 (24 Nov 2026)

Titik unik dipetakan ke kisi 0,001 derajat (sekitar 110 m; median titik per sel, cm diubah ke mm, simpangan baku jadi `vstd`), lalu dijalankan lewat `agregasi()` dan `gerbang_pola()` di `scripts/banjir/subsiden.py` dengan batas `public/geo/kecamatan/31.json` (hanya dibaca). 42 dari 44 kecamatan punya cukup titik.

| Kota administrasi | Kecamatan | Median laju kecamatan (cm/tahun) |
| --- | --- | --- |
| Jakarta Utara | 6 | +0,55 |
| Jakarta Pusat | 8 | +0,75 |
| Jakarta Timur | 10 | +0,35 |
| Jakarta Barat | 8 | +0,2 |
| Jakarta Selatan | 10 | +0,1 |

Paling turun: Kembangan -1,2 dan Penjaringan -1,1 (p90 -2,5). Kelapa Gading +1,0 dan Sawah Besar +1,2, padahal Kelapa Gading tercatat turun cepat di literatur (bagian 6.3).

Vonis: TIDAK LOLOS gerbang pola (Jakarta Utara +0,55 lawan Selatan +0,1). Pergeseran titik nol saja tidak menjelaskannya, karena urutan antarwilayah juga terbalik dari semua sumber lain. Halaman dataset tidak menautkan makalah dan pencarian belum menemukan makalah induknya, jadi periode dan titik acuannya tetap belum diketahui. Data ini tidak dipakai untuk layar maupun proyeksi; hanya disimpan sebagai pembanding. Jalur utama tetap LiCSBAS sendiri (Q1) dengan validasi Dinas SDA (Q11).

### 6.7 Putaran LiCSBAS pertama Jakarta (24 Nov 2026, Q1 diizinkan pemilik di percakapan)

Pengunduh `~/licsbas/ambil.py` (pengganti LiCSBAS01) memotong interferogram CEDA ke jendela bujur 106,55 sampai 107,20, lintang -6,65 sampai -5,95. Server CEDA memberi sekitar 16 KB/detik per sambungan; dengan 20 sambungan, 694 pasangan selesai dalam sekitar 2 jam. Pasangan sesudah pertengahan 2024 banyak yang 404 di CEDA.

| Frame | Pasangan diminta | Lengkap | Citra dipakai | Rentang |
| --- | --- | --- | --- | --- |
| 047D_09652_111009 (turun, Dt maks 48 hari) | 334 | 244 | 75 | 10 Jan 2020 sampai 31 Mar 2023 |
| 098A_09673_121312 (naik, Dt maks 24 hari) | 360 | 267 | 72 | 2 Jan 2020 sampai 21 Jun 2024 |

LiCSBAS 1.6.3 perlu dua tambalan kecocokan matplotlib 3.11 di luar repo: `grid(b=` menjadi `grid(visible=` di klon, dan shim `~/licsbas/shim/sitecustomize.py` untuk `register_cmap`. Langkah: 02 (multilook 3, sekitar 330 m), 11, 12, 13, 14, 15 (ambang bawaan, 24,7% piksel dimasker), 16 dengan deramp derajat 1, tanpa GACOS.

Laju LOS median (mm/tahun, negatif menjauhi satelit):

| Lokasi | Turun `vel` | Turun `vel.filt.mskd` | Naik `vel` | Naik `vel.filt.mskd` |
| --- | --- | --- | --- | --- |
| Muara Baru | -13,2 | -4,4 | -20,7 | -30,0 |
| Pluit | -17,2 | -7,5 | -23,3 | -32,5 |
| Kelapa Gading | -11,7 | +1,2 | +1,7 | -2,2 |
| Cengkareng | -3,9 | +3,3 | -19,2 | -23,7 |
| Jakarta Selatan | -8,4 | -1,0 | -4,2 | +15,1 |
| Bogor (acuan) | -3,8 | -0,4 | -76,9 | -3,9 |

`subsiden.py hitung` dengan acuan lintang -6,55: gerbang pola GAGAL (Jakarta Utara 0,0 lawan Jakarta Selatan +0,95 cm/tahun), tidak ada berkas yang ditulis.

Bacaan: arah pesisir barat laut (Muara Baru, Pluit) sudah terlihat turun di kedua frame, tapi kedua frame tidak sepakat di Kelapa Gading, Cengkareng, Jakarta Selatan, dan Bogor. Laju mentah frame naik di Bogor -77 mm/tahun tidak masuk akal secara fisik dan menandakan galat atmosfer atau unwrapping besar; filter langkah 16 dengan deramp mengubah laju sampai 30 mm/tahun dan membalik tanda di beberapa tempat. Muara Baru hanya 5 sampai 7 piksel sesudah masker karena koherensinya rendah (0,18 di frame turun). Putaran ini belum layak dipakai.

Perbaikan yang perlu dicoba berurutan, tanpa mengubah gerbang: (1) koreksi atmosfer GACOS (unduh per tanggal citra) dan langkah 16 tanpa deramp; (2) jendela lebih kecil (Jakarta saja, acuan dataran stabil di dalam frame) supaya ramp tidak menelan sinyal; (3) ambang masker koherensi lebih ketat dan pemeriksaan `12bad_ifg.txt`; (4) bila CEDA tetap kosong sesudah 2024, ASF HyP3 (Q2) untuk 2024 sampai 2026.

### 6.8 Putaran LiCSBAS kedua Jakarta: GACOS dan jendela kecil (24 Nov 2026)

Perubahan dari putaran pertama, gerbang dan `subsiden.py` tidak diubah:

1. Koreksi atmosfer GACOS dari produk LiCSAR per tanggal (`epochs/<tgl>/<tgl>.sltd.geo.tif` di CEDA, tanpa pesan ke gacos.net), langkah `LiCSBAS03op_GACOS.py --fillhole`. Frame turun: 73 dari 75 tanggal ada. Frame naik: hanya 78 dari 143 tanggal, GACOS kosong (404) sejak Juni 2021 sebagian dan sejak September 2022 seluruhnya, jadi deret naik terpotong di 31 Agustus 2022.
2. Jendela dipotong ke Jakarta saja (bujur 106,65 sampai 107,00, lintang -6,45 sampai -6,05) dengan `LiCSBAS05op_clip_unw.py`.
3. Langkah 16 tanpa deramp (`-r` dihapus).
4. Masker langkah 15 tetap bawaan (C-band). Ambang lebih ketat tidak dipakai karena masalah putaran pertama ada di frame naik, bukan di pikselnya.

| | Frame turun 047D | Frame naik 098A |
| --- | --- | --- |
| Citra | 73 (10 Jan 2020 sampai 31 Mar 2023) | 72 (2 Jan 2020 sampai 31 Agu 2022) |
| Interferogram buruk (`12bad_ifg`) | 10 (putaran 1: 16) | 34 (putaran 1: 179) |
| Piksel termasker | 1,7% | 5,4% |

`subsiden.py hitung Jakarta 31 ... "2020-2023" -6,30 20200102 20230331` (acuan lintang -6,30 di dalam jendela, Jagakarsa dan sekitarnya): **gerbang pola LOLOS**, Jakarta Utara -1,3 lawan Jakarta Selatan +0,1 cm/tahun, 42 kecamatan, galat acuan 0,55 cm/tahun. Acuan -6,35 memberi angka yang sama. Kecamatan terdalam (median, p90 dalam cm/tahun): Koja -1,9 dan -2,5; Penjaringan -1,7 dan -3,9 (cakupan 78%); Tanjung Priok -1,3 dan -2,2; Cilincing -1,3 dan -2,3; Pademangan -0,7 dan -1,4; Kramatjati dan Makasar -0,7. Jakarta Selatan dan Pusat umumnya antara -0,5 dan +0,3.

Uji kepekaan: filter ruang langkah 16 diperkecil dari 2 km ke 0,5 km mengubah median paling banyak 0,1 cm/tahun, jadi besaran tidak ditekan filter.

Validasi ALGORITMA 6:
- 6.1 (pembanding literatur) **lolos**: p90 terdalam 3,9 cm/tahun di dalam rentang 2,5 sampai 28; median kecamatan pesisir terdalam 1,9 tidak lebih dangkal dari laju terkecil literatur Jakarta (1, Abidin 2011). Angkanya tetap di bawah titik ukur Muara Baru sekitar 10 cm/tahun (bagian 6.3); dugaan: piksel 300 m dan masker koherensi menyaring cekungan paling cepat yang koherensinya rendah.
- 6.2 (uji tahan-waktu separuh awal lawan separuh akhir) **belum dijalankan**.
- 6.3 (GNSS atau levelling) belum ada data (Q11).

Karena 6.2 belum ada vonis, `subsiden.json` dan `proyeksi_tanah.json` hasil putaran ini TIDAK ditaruh di `public/` dan tidak tayang. Berkasnya disimpan di luar repo di mesin pemilik (`~/licsbas/keluaran/`), bersama skrip pengunduh `~/licsbas/ambil.py` dan `~/licsbas/gacos.py` serta `~/licsbas/jalan2.sh`. Semua angka di bagian ini berlabel hipotesis (D4).

### 6.9 Uji tahan-waktu ALGORITMA 6.2, putaran kedua Jakarta (24 Nov 2026)

Cara: deret `cum_filt.h5` tiap frame (filter bawaan langkah 16, sama dengan `vel.filt.mskd` putaran 6.8) dibelah di 1 Juni 2021. Laju tiap piksel dicocokkan garis lurus pada tiap separuh, piksel yang dimasker di putaran 6.8 tetap dimasker, lalu kedua laju separuh diolah dengan `subsiden.hitung` yang sama (acuan lintang -6,30, tanpa mengubah kode). Skrip di luar repo: `~/licsbas/tahan.py`. Swa-ujinya: laju seluruh deret dari rumus yang sama sama dengan `vel` LiCSBAS (median selisih 0,0 mm/tahun).

| Separuh | Frame turun | Frame naik | Gerbang pola (Utara, Selatan, cm/tahun) | Galat acuan |
| --- | --- | --- | --- | --- |
| Awal | 10 Jan 2020 sampai 16 Mei 2021, 33 citra | 2 Jan 2020 sampai 20 Mei 2021, 39 citra | lolos (-1,05; +0,1) | 0,89 |
| Akhir | 8 Agu 2021 sampai 31 Mar 2023, 40 citra | 13 Jun 2021 sampai 31 Agu 2022, 33 citra | lolos (-1,35; -0,05) | 0,45 |

Galat prediksi pergeseran separuh akhir dari laju separuh awal sama dengan selisih laju dikali lama separuh akhir, jadi syarat "galat kurang dari 2 s" setara dengan selisih laju per kecamatan kurang dari 2 s (s dari putaran 6.8: akar galat piksel kuadrat ditambah galat acuan kuadrat). Hasil di 42 kecamatan bercakupan minimal 30%: median selisih 0,2 cm/tahun lawan median 2 s 1,1 cm/tahun. **Vonis 6.2: lolos**, 42 dari 42 kecamatan di bawah 2 s. Selisih terbesar 0,5 (Taman Sari), lalu 0,4 (Tambora, Grogol Petamburan, Pasar Minggu, Gambir, Tanjung Priok, Pademangan).

Catatan jujur:
- Uji ini menguji kestabilan laju di dalam deret yang sama, bukan ketepatannya terhadap kebenaran (ALGORITMA 6.2).
- s didominasi galat acuan (0,55) yang masih batas bawah, karena piksel dianggap bebas (ALGORITMA 4, butir terbuka n_efektif). Dengan n_efektif yang lebih jujur, ambang 2 s melebar dan uji ini makin mudah lolos.
- Di pesisir utara separuh akhir sedikit lebih dalam dari separuh awal (Koja -1,6 lalu -1,9; Tanjung Priok -1,0 lalu -1,4; Pademangan -0,4 lalu -0,8). Itu masih di dalam 2 s, jadi belum bisa disebut percepatan.

Status tayang: 6.1 dan 6.2 lolos, 6.3 (GNSS atau levelling) belum ada data (Q11), jadi semua angka tetap hipotesis (D4). Sebelum tayang masih ada dua hal: (1) pilihan n_efektif (a) variogram atau (b) bootstrap blok, yang menurut ALGORITMA 4 dipilih pemilik atau pemeriksa sebelum angka tayang; (2) tinjauan `validasi-model` untuk PT-06. Sampai itu `subsiden.json` tetap di luar `public/`.

### 6.10 Galat bootstrap blok (K3) dan tinjauan validasi-model (24 Nov 2026)

Pemilik memilih bootstrap blok spasial untuk n_efektif (KEPUTUSAN K3). `subsiden.py` versi 3: galat median kecamatan dan galat acuan dihitung dengan 200 ulangan bootstrap blok, blok 0,01 derajat (D9, bawaan sementara), kecamatan dengan kurang dari 4 blok tidak diberi galat dan tidak diproyeksikan. Ini mengoreksi angka di 6.8 dan 6.9: galat acuan 0,58 cm/tahun (bukan 0,55), galat median kecamatan 0,04 sampai 0,29 (median 0,08; pesisir Koja 0,25, Penjaringan 0,29, Tanjung Priok 0,24, Cilincing 0,14), dan butir "n_efektif belum dipilih" di 6.9 sudah tidak berlaku. Uji 6.2 diulang dengan galat baru: median selisih 0,2 lawan median 2 s 1,17, 42 dari 42 kecamatan di bawah 2 s.

Kepekaan ukuran blok (hasil yang sama, hanya blok diubah):

| Blok | Galat acuan | Kecamatan bergalat | Median galat kecamatan | Median s |
| --- | --- | --- | --- | --- |
| 0,01 derajat (~1,1 km) | 0,58 | 42 dari 42 | 0,08 | 0,59 |
| 0,03 derajat (~3,3 km) | 0,66 | 33 dari 42 (Koja hilang) | 0,12 | 0,67 |
| 0,05 derajat (~5,5 km) | 0,72 | 18 dari 42 (Koja, Tanjung Priok hilang) | 0,18 | 0,75 |

Tinjauan `validasi-model` (konteks bersih), vonis **BELUM layak tayang**. Temuan yang diterima:
1. Uji 6.2 hanya uji konsistensi di dalam satu pengolahan, bukan uji independen: `cum_filt.h5` berasal dari satu inversi SBAS seluruh deret (langkah 13) dan filter waktu seluruh deret (langkah 16), interferogram yang melintasi 1 Juni 2021 ikut kedua separuh, dan masker diambil dari deret penuh. Dayanya juga hampir nol: 38 dari 42 kecamatan lajunya lebih kecil dari 2 s, jadi laju yang berubah separuhnya pun tetap lolos. Ambang yang lebih tepat 2·akar(s_awal² + s_akhir²) (median sekitar 2,1) juga lolos 42 dari 42, dan sama tidak diskriminatifnya.
2. Blok 0,01 derajat kemungkinan terlalu kecil: derau atmosfer sisa dan galat orbit berkorelasi 5 sampai 20 km, jadi galat kecamatan masih terlalu sempit. Blok yang lebih besar membuat banyak kecamatan pesisir kehilangan galat (tabel di atas). Belum ada variogram residu.
3. Validasi 6.1 lolos tipis: p90 terdalam 3,9 di bawah "lebih dari 5" Sidiq 2021 dan sekitar 2,5 kali lebih dangkal dari titik ukur Muara Baru. Gerbang pola lolos dengan margin 0,4 dari ambang 1,0, dan baru lolos sesudah putaran 2 mengubah GACOS, jendela, deramp, dan acuan, jadi gerbang itu sempat dipakai sebagai umpan balik penyetelan dan bukan bukti independen.
4. Periode dua geometri berbeda (naik berakhir 31 Agustus 2022, turun 31 Maret 2023); dekomposisi vertikal mencampur periode itu.

Status: angka Jakarta tetap tidak tayang dan tetap hipotesis (D4); kata "terukur" tidak dipakai sampai validasi GNSS atau levelling (6.3, Q11). Swa-uji `~/licsbas/tahan.py` diperketat ke selisih di bawah 0,5 mm/tahun (nilai sebenarnya 0,0). Langkah yang tersisa: variogram residu untuk menentukan ukuran blok (mengganti bawaan D9), uji tahan-waktu independen dengan dua inversi LiCSBAS terpisah per separuh, dan menyamakan periode kedua geometri.

### 6.11 Variogram derau laju Jakarta untuk ukuran blok D9 (24 Nov 2026)

Skrip lab di luar repo: `~/licsbas/variogram.py`. Variogram empiris (selang 1 km sampai 20 km, 4.000 piksel acak, model eksponensial) pada dua medan derau per frame, dalam laju searah pandang (LOS, mm/tahun):
- **acuan**: `vel.filt.mskd` putaran 6.8 di area acuan (lintang di bawah -6,30), dianggap tanpa deformasi;
- **selisih**: laju separuh akhir dikurangi separuh awal (bagian 6.9), sehingga laju yang tetap hilang dan yang tersisa derau.

Swa-uji skrip: medan acak bebas memberi jarak korelasi 0 km, medan halus buatan memberi sekitar 15 km.

| Medan | γ 1,5 km | γ 5,5 km | γ 10,5 km | γ 15,5 km | γ 19,5 km | Plafon (sill) sampai 20 km |
| --- | --- | --- | --- | --- | --- | --- |
| Turun, acuan | 1,8 | 4,3 | 6,6 | 9,7 | 11,4 | tidak ada |
| Turun, selisih | 0,2 | 0,7 | 1,1 | 1,4 | 1,4 | hampir rata sesudah 15 km |
| Naik, acuan | 30,9 | 88,5 | 146,0 | 169,6 | 213,3 | tidak ada |
| Naik, selisih | 1,1 | 5,4 | 11,4 | 14,3 | 14,5 | hampir rata sesudah 15 km |

(γ dalam (mm/tahun)², semivarians.)

Bacaan:
1. Derau tidak punya jarak korelasi pendek. γ terus naik sampai 15 sampai 20 km, artinya derau didominasi komponen panjang gelombang besar (sisa atmosfer atau orbit berbentuk kemiringan bidang) yang selebar kota. Tidak ada ukuran blok di dalam satu kecamatan yang bisa menangkapnya. Bootstrap blok di `subsiden.py` (K3, D9) tetap benar untuk derau pendek, tetapi galat kecamatannya tetap batas bawah untuk galat antar-kecamatan yang berjauhan.
2. Besarnya untuk perbandingan Jakarta Utara lawan Selatan (pusat berjarak sekitar 15 km): simpangan baku beda dua titik = akar(2γ). Frame turun 4,4 mm/tahun LOS, kira-kira 0,5 cm/tahun vertikal (U 0,81). Frame naik 18,4 mm/tahun LOS, kira-kira 2,4 cm/tahun vertikal (U 0,78). Selisih Utara lawan Selatan di 6.8 hanya 1,4 cm/tahun. Kalau variogram acuan frame naik memang derau, selisih itu **tidak bermakna secara statistik**, dan lolosnya gerbang pola bisa kebetulan.
3. Catatan batas: area acuan (Jagakarsa sampai Depok utara) mungkin tidak benar-benar diam, jadi variogram acuan bisa memuat sinyal asli dan menjadi batas atas derau. Medan selisih lebih bersih tetapi hanya mengukur derau yang berubah antarseparuh, bukan kemiringan tetap yang sama di kedua separuh, jadi medan itu batas bawah. Derau sesungguhnya ada di antara keduanya. Frame naik jauh lebih berderau daripada frame turun di kedua ukuran.

Akibat: D9 (blok 0,01 derajat) tidak bisa diganti dengan angka dari variogram, karena variogram tidak punya plafon di dalam jendela. Yang dibutuhkan bukan blok lebih besar, melainkan suku galat jarak: galat beda laju antara kecamatan dan area acuan = akar(2γ(h)) pada jarak h, ditambahkan ke s. Itu perubahan rumus yang perlu keputusan pemilik. Sebelum itu angka Jakarta tetap tidak tayang.

### 6.12 Galat jarak dari variogram (K4), Jakarta (24 Nov 2026)

`subsiden.py` versi 4: variogram empiris laju vertikal piksel area acuan (sesudah dikurangi median, selang 1 km sampai 40 km, 1.500 piksel acak, benih tetap) dihitung di dalam `hitung` dan ditulis di berkas (`variogram_acuan`). Tiap kecamatan mendapat `galat_jarak` = akar(2γ(h)), h = jarak pusat piksel kecamatan ke pusat piksel acuan, dan `tak_beda_nol` bila |laju| < 2 s dengan s = akar(galat² + galat acuan² + galat jarak²). `proyeksi_tanah.py` memakai s tiga suku, dan menahan tayang bila `galat_jarak` tidak ada. Swa-uji: medan tetap memberi γ 0, medan v = x memberi γ(h) mendekati h²/4, interpolasi dan ekstrapolasi γ benar.

Variogram vertikal acuan (cm/tahun)²: 0,09 di 0,5 km; 0,37 di 4,5 km; 0,59 di 9,5 km; 0,74 di 14,5 km; 0,95 di 19,5 km; 1,16 di 24,5 km; 1,06 di 29,5 km. Tidak ada kecamatan di luar selang terjauh (tanpa ekstrapolasi).

Hasil putaran 6.8 dengan galat baru (gerbang pola tetap lolos, -1,3 lawan +0,1; galat acuan 0,58):

| Kecamatan | Laju median | Galat jarak | s | Status |
| --- | --- | --- | --- | --- |
| Koja | -1,9 | 1,45 | 1,58 | belum beda dari nol |
| Penjaringan | -1,7 | 1,47 | 1,61 | belum beda dari nol |
| Tanjung Priok | -1,3 | 1,53 | 1,65 | belum beda dari nol |
| Cilincing | -1,3 | 1,44 | 1,56 | belum beda dari nol |
| Pademangan | -0,7 | 1,53 | 1,64 | belum beda dari nol |

**42 dari 42 kecamatan belum beda dari nol** pada 2 s. Median galat jarak Jakarta Utara 1,5 dan Jakarta Selatan 1,2 cm/tahun. Galat jarak sekarang suku terbesar s.

Batas yang tetap berlaku: variogram acuan mungkin memuat sinyal asli (6.11), jadi s ini konservatif, dan derau sebenarnya bisa lebih kecil. Yang paling mungkin mengecilkan galat adalah deret yang lebih panjang: derau atmosfer yang tak berkorelasi antartanggal mengecil kira-kira sebanding 1/T^1,5 terhadap lama deret T, dan deret sekarang hanya sekitar 3 tahun (frame naik 2,7 tahun). LiCSAR punya interferogram kedua frame sejak sekitar 2016 (belum diunduh, putaran 6.7 dibatasi sejak 2020). Kesimpulan saat ini: data putaran 2 cukup untuk pola (pesisir barat laut paling dalam), tetapi belum cukup untuk angka per kecamatan yang bermakna. Tidak tayang.

### 6.13 Putaran LiCSBAS ketiga Jakarta: deret 2016 sampai 2023 dan uji tahan-waktu independen (24 Nov 2026)

Pemilik meminta deret diperpanjang ke 2016 supaya galat mengecil. Pasangan baru diunduh dengan `~/licsbas/ambil.py` (pasangan sejak 1 Januari 2016, Dt paling lama 48 hari untuk frame turun dan 24 hari untuk frame naik): frame turun menjadi 608 pasangan, frame naik 471. GACOS LiCSAR ditambahkan per tanggal, lalu dijalankan langkah 02, 03, 05 (jendela Jakarta yang sama), 11 sampai 16 tanpa deramp (`~/licsbas/jalan3.sh`). LiCSBAS lama perlu satu tambalan lagi untuk matplotlib baru: `set_major_locator` tidak lagi mengembalikan locator (`LiCSBAS_plot_lib.py`, di luar repo).

| | Frame turun 047D | Frame naik 098A |
| --- | --- | --- |
| Citra | 167 (12 Apr 2016 sampai 31 Mar 2023) | 159 (23 Jan 2016 sampai 31 Agu 2022) |
| Interferogram buruk | 43 | 70 |
| Piksel dipertahankan | 96,1% | 86,9% |
| Celah jaringan | 6, terpanjang Des 2016 sampai Okt 2019 tersambung | 11 |

**Hasil deret penuh** (`subsiden.py` v4, acuan -6,30):
- **Gerbang pola GAGAL**: Jakarta Utara -0,95 lawan Jakarta Selatan -0,25 cm/tahun, selisih 0,7, di bawah syarat 1,0.
- Galat mengecil: galat acuan 0,10 (putaran 2: 0,58), galat jarak sekitar 0,9 (putaran 2: sekitar 1,5). Variogram vertikal acuan 0,14 (cm/tahun)² di 4,5 km dan 0,33 di 19,5 km, kira-kira separuh putaran 2.
- 2 dari 42 kecamatan beda dari nol pada 2 s: Penjaringan -2,2 (p90 -3,5) dan Kembangan -2,1 (p90 -3,0). Sesudahnya Kalideres -1,6, Cengkareng -1,3, Kebon Jeruk -1,2, Koja -1,2, Pesanggrahan -1,1, Cilincing -1,0; semuanya belum beda dari nol.
- 6.1: p90 terdalam 3,5 masih di dalam 2,5 sampai 28, tetapi gerbang pola sudah gagal.

**Uji tahan-waktu versi 6.9 tidak berlaku untuk deret ini**: belah dari satu inversi menghasilkan selisih median 0,0, karena inversi dengan celah jaringan memaksa laju lurus melewati celah. Ini kebocoran yang disebut tinjauan 6.10.

**Uji tahan-waktu independen** (`~/licsbas/belah.sh`): interferogram dibelah di 1 Juli 2019 (separuh awal hanya pasangan yang berakhir sebelum tanggal itu, separuh akhir hanya yang mulai sesudahnya), lalu langkah 11 sampai 16 dijalankan terpisah untuk tiap separuh. Frame turun 285 dan 294 interferogram, frame naik 133 dan 191.
- Gerbang pola: separuh awal gagal (-0,9 lawan -0,15), separuh akhir lolos (-1,5 lawan +0,4).
- Laju kecamatan kedua separuh hanya berkorelasi 0,44.
- Median selisih 0,4 cm/tahun di bawah ambang 2·akar(s_awal² + s_akhir²) yang mediannya 3,4. Semua 42 kecamatan di bawah ambang, tetapi ambang selebar itu tidak diskriminatif.

| Kecamatan | Separuh awal 2016-2019 | Separuh akhir 2019-2023 | Deret penuh |
| --- | --- | --- | --- |
| Penjaringan | -2,0 | -2,2 | -2,2 |
| Kembangan | -2,1 | -0,7 | -2,1 |
| Kalideres | -1,6 | -0,6 | -1,6 |
| Cengkareng | -1,3 | -0,5 | -1,3 |
| Koja | -1,0 | -2,1 | -1,2 |
| Cilincing | -0,9 | -1,5 | -1,0 |
| Tanjung Priok | -0,7 | -1,5 | -0,8 |
| Pesanggrahan | -1,3 | +0,6 | -1,1 |
| Jagakarsa | +0,3 | +0,4 | +0,3 |

Bacaan:
1. Satu-satunya sinyal yang tahan di semua ukuran adalah **Penjaringan sekitar -2 cm/tahun**: sama di kedua separuh independen, beda dari nol di deret penuh, dan cocok dengan literatur yang menunjuk pesisir barat laut (Muara Baru, Pluit).
2. Barat (Kembangan, Kalideres, Cengkareng) dalam di separuh awal tetapi dangkal di separuh akhir; timur laut (Koja, Cilincing, Tanjung Priok) sebaliknya. Ini bisa perubahan laju sungguhan atau derau, dan data ini belum bisa membedakannya.
3. Deret penuh mengikuti separuh awal untuk kecamatan barat, padahal separuh akhir berisi lebih banyak citra. Dugaan: celah jaringan frame naik 2017 sampai 2019 dan batasan laju lurus inversi. Belum diperiksa.

Status: gerbang pola gagal di deret terpanjang, jadi menurut ALGORITMA 5 `subsiden.py` tidak menulis berkas. Angka Jakarta **tidak tayang**. Keluaran lab disimpan di luar repo: `~/licsbas/keluaran/subsiden_16.json`. Data mentah putaran ini memakan sekitar 7 GB di `~/licsbas`.
