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
