# Audit keandalan prakiraan banjir, gempa, dan /prediksi (24 November 2026)

## Kesimpulan

Belum ada prakiraan banjir atau gempa di sistem ini yang terbukti lebih baik dari pembanding sederhana (klimatologi atau persistensi).
Ini bukan karena kodenya salah hitung. Penyebabnya ada tiga:

1. Data kejadian (DIBI dan logbook) mengukur kebiasaan melapor, bukan kejadian sebenarnya.
2. Hujan resolusi 0,25 derajat terlalu kasar untuk banjir tingkat kecamatan.
3. Model susulan dan model peluang gempa memakai satu set parameter untuk semua rangkaian gempa.

Uji bersih satu-satunya adalah uji prospektif yang sedang berjalan. Vonis pertama yang sah baru bisa diambil sekitar Januari 2027 untuk banjir, dan butuh lebih banyak gempa utama untuk susulan.

Ada empat hal yang perlu dibetulkan sekarang, karena layar atau laporan menampilkan lebih dari yang didukung angka (bagian 4).

## 1. Banjir

| Komponen | Hasil uji | Vonis | Sumber |
|---|---|---|---|
| Status kecamatan 4 hari (uji balik 2022-2025, hujan ERA5 dianggap prakiraan sempurna) | Waspada: POD 0,57, FAR 0,97, ETS 0,018. Siaga: POD 0,13, ETS 0,029 | Tidak lulus (batas ETS 0,1). Hanya Jawa yang berskill | `public/banjir/data/validasi.json`, `scripts/banjir/RISET-LOGBOOK.md` |
| Status prospektif sejak 19 Okt (23 hari, 60 kejadian) | ETS model 0,036 lawan klimatologi 0,038 (tunda 0). Tunda 3 hari: 0,020 lawan 0,062 | Kalah atau seri dengan klimatologi; data belum cukup (syarat 60 hari dan 100 kejadian) | `public/banjir/data/prospektif_skor.json` |
| BNJ di /prediksi | POD 8%, FAR 86%, BSS klimatologi -0,37, 24 kejadian | Belum unggul | `public/prediksi/data/skor.json` |
| Pemicu genangan DKI (M0) | ETS 0,174 lawan klimatologi 0,180 | Gagal, tampil berlabel hipotesis | `public/banjir/data/kecamatan_pemicu.json` |
| Genangan Jakarta J4 | AUC 0,602 lawan heuristik elevasi 0,646 | Belum ada kejadian prospektif, dibekukan sampai 30 Apr 2027 | `scripts/banjir/genangan/PRAREG-J4.md` |
| HAND | CSI 0,446 lawan sel terendah 0,46 | Belum lulus, label hipotesis | `public/banjir/data/lab/uji_hand_ringkas.md` |
| Nowcast Jakarta, MCDWD, GeoGLOWS, GBDT kab-hari | BSS 0,001; AUC 0,57 lawan 0,79; dETS -0,021 | Semua gagal | `scripts/banjir/*` |
| Rob | POD 0,73, FAR 0,98, 26 kejadian, persentil dipilih di data uji | Optimis, belum sah | `public/banjir/data/rob.json` |

Kandidat yang sedang dibekukan dan menunggu uji prospektif: CAMPUR (buka 29 Jun 2027), KAB2-OPS (1 Jun 2027), HULU (15 Feb dan 15 Sep 2027), Siaga-persentil (30 Nov 2027), Flood Hub (15 Jun 2027).
Berkas bersidik tidak boleh disunting sebelum tanggal itu.

## 2. Gempa

| Komponen | Hasil uji | Vonis | Sumber |
|---|---|---|---|
| Peluang susulan M5 (Reasenberg-Jones; a -2,84, b 1,19, p 0,90; uji 2023-2026, 406 gempa utama) | BSS 0,0021, selang bootstrap memuat nol. N-test: teramati 177, harapan 366. Bin peluang 0,5-1: ramal 67,5%, teramati 55,6% | Terbit, tanpa skill | `public/gempa/data/model_susulan.json` |
| Susulan M6 dan Mu-1, penyesuaian per rangkaian | BSS -0,005 dan -0,030 | Kalah, sudah disembunyikan | sama |
| Susulan prospektif | Sekitar 15 gempa unik (24 entri karena revisi magnitudo jadi entri baru); M5: 0 dari 18 terjadi, harapan 2,4 | Terlalu sedikit | `prospektif_susulan.json` |
| Guncangan MMI per kecamatan (BSSA14/Zhao 2006, Vs30 400 seragam) | Lawan 1.474 tempat kajian MAGMA: MAE 0,73 kelas. Dekat pusat (<25 km): bias +1,28. Gempa dalam: bias -1,61. Prospektif: 2 dinilai, keduanya meleset >1 kelas | Layar menulis "belum diuji" | `model_guncangan.json`, `kajian_magma.json` |
| Peluang 12 bulan (Poisson, uji 2016-2025) | M6+ dan M7+ lulus; M5+ dan M7+ dangkal gagal (sudah null) | Laju latar, bukan prakiraan | `public/gempa/data/laju.json` |
| Gempa beruntun dekat gunung api | Binomial negatif, 11 nyala dari 96.462 pasangan | Hipotesis | `beruntun.json` |
| PAGER dan kerusakan | Disetel ke 8 gempa, bisa meleset 5,3 kali lipat; angka korban kalibrasi belum dicocokkan ke sumber | Belum dinilai | `kalibrasi_kerusakan.json` |

Catatan: baris Model di `.claude/ilmu-agent/gempa.md` masih memuat parameter rencana lama (a -1,67, b 0,91, p 1,08). Parameter yang berlaku ada di `model_susulan.json`.

## 3. /prediksi (prakiraan 3 hari)

| Kode | Pembanding | Hari sasaran dinilai | Hasil | Catatan |
|---|---|---|---|---|
| HJN >= 1 mm | ERA5 | 18 | Brier 0,110 lawan klimatologi 0,149; POD 99%, FAR 15% | Hujan terjadi di 82% kab-hari, peluang model hampir konstan 0,95. Menang tapi informasinya sedikit |
| HJN >= 20 mm (dasar label kolom "teruji") | ERA5 | 18 | BSS 0,063; POD 3-9%, FAR 62-71% | Vonis bolak-balik antara 12 dan 23 Nov |
| HJN >= 50 mm | ERA5 | 18 | Tidak pernah memberi peluang >= 0,5; 76 kejadian semuanya terlewat | Vonis "mengalahkan" tidak sah |
| API titik panas | FIRMS | 6 (terhenti sejak 12 Nov) | BSS 0,23 | Arsip pengamatan bocor (bagian 4) |
| BNJ banjir | DIBI | 9 | BSS -0,37 | Belum unggul |
| LSR longsor | DIBI | 9 | 56 alarm, 0 kena | Belum unggul |
| ASP, ROB, GEL, CEX | tidak ada pengamatan | 0 | | Belum teruji, sesuai |

Kelemahan cara nilai di `scripts/prediksi/nilai.py`:
- "Klimatologi" dihitung dari arsip pengamatan sendiri sejak 29 Okt, bukan iklim bertahun-tahun.
- Persistensi dinilai 0/1, jadi hampir selalu dikalahkan prakiraan berpeluang.
- Ambang 30 pasangan dihitung per kab-hari: kurang dari satu hari (514 kab), dan kab bertetangga saling berkorelasi.
- Tidak ada selang kepercayaan atau uji beda.
- `ujibalik.json` tidak pernah dibuat workflow, sehingga layar meminta berkas yang tidak ada (404).

## 4. Yang perlu dibetulkan sekarang

1. **Arsip pengamatan titik panas bocor.** `scripts/data/titik_hari.py` hanya menyimpan hari dengan >= 1.000 titik (berkas terakhir 27 Okt), dan `hotspot.json` hanya 7 hari bergulir. Prakiraan API untuk 31 Okt sampai 16 Nov tidak pernah dinilai dan tidak bisa dinilai lagi. Perbaikan: `nilai.py` menyimpan `amatan/API.json` harian seperti `amatan/HJN.json`. Pemilik: `prediksi`.
2. **Label kolom "teruji" untuk Hujan dan Titik panas terlalu kuat.** Hujan "teruji" berdasar BSS 0,06 pada ambang 20 mm tanpa selang kepercayaan. Titik panas hanya 6 hari. Usulan: vonis butuh minimal 30 hari sasaran (bukan 30 kab-hari) dan batas bawah selang bootstrap BSS di atas 0. Sampai itu, labelnya "belum teruji". Label ketiga "belum unggul" belum tercatat di `KEPUTUSAN-BESOK.md` K3. Pemilik: `prediksi`, keputusan pemilik.
3. **Laporan khusus gempa.** `data/laporan-bnpb/insidental/gempa_khusus.py` menampilkan peluang susulan 24 jam, 3 hari, dan 7 hari tanpa menyebut bahwa model tidak lebih baik dari pembanding. Varian alternatif memakai peluang 30 hari, padahal yang divalidasi hanya sampai 7 hari. Usulan: tambah satu kalimat batasan dan buang p30. Pemilik: `pipa-data`.
4. **Entri ganda prospektif susulan.** Id memuat lat/lon, jadi revisi magnitudo USGS tercatat sebagai gempa baru. Kuncinya perlu id USGS. Pemilik: `gempa`.

### Status perbaikan (24 Nov 2026, pemilik: "Kerjakan semua")

| No | Dikerjakan | Bukti |
|---|---|---|
| 1 | `nilai.py` `amatan_api` menyimpan tiap hari lengkap hotspot.json (termasuk hari sepi) ke `amatan/API.json` dan `amatan/KRH.json`. Hari 31 Okt sampai 16 Nov tetap hilang. | `python scripts/prediksi/nilai.py uji` |
| 2 | Vonis baru (`HARI_MIN` 30 hari, `selang_beda` bootstrap per hari), dicatat sebagai K17 di `KEPUTUSAN-BESOK.md`. Pada data 23 Nov semua kode menjadi "belum teruji" (hujan 17 hari, banjir dan longsor 9 hari). | sama |
| 3 | `gempa_khusus.py`: kepala panel "hipotesis", baris Keandalan di halaman susulan, kesimpulan dibatasi 7 hari (dulu 30). Dicek dengan bangun ulang Nias (satu halaman) dan Talaud (dua halaman). Berkas lama `gempa-talaud-2026-11-22/alternatif_susulan.py` (p30) tidak diubah karena laporan itu sudah terkirim. | render PDF lokal |
| 4 | `susulan.py`: entri yang sama (menit sama, geser < 0,2 derajat) diberi `ganda`, tidak dinilai, tidak ikut metrik. Berkas 24 Nov: 24 entri menjadi 15 gempa, 9 ganda, 9 dinilai. | `python scripts/gempa/susulan.py uji` |

Tinjauan pemeriksa bersih (6 temuan) sudah dibetulkan:
- Pil vonis kini menulis jumlah hari sasaran di samping n kab-hari (`terbit.py` `hari_vonis`).
- Vonis model bayangan (AP dan banding model lama) ikut aturan 30 hari.
- Teks "n >= 30" yang basi sudah diganti.
- Rantai revisi lokasi gempa (A ke B ke C) dianggap satu gempa.
- Kata "tetap" yang selalu tercetak sudah dibuang.
- Baris Keandalan kini diturunkan dari selang bootstrap `model_susulan.json`, tidak ditulis mati.

## 5. Penyesuaian metode (riset luar, untuk antrean model)

| Usulan | Alasan | Sumber |
|---|---|---|
| N-test susulan memakai campuran Poisson berbobot sebaran a (cara USGS) atau binomial negatif, lewat pyCSEP (uji N, L, S, T) | Kegagalan N-test kita sebagian karena uji mengandaikan Poisson murni, padahal jumlah susulan terlalu tersebar | USGS OAF background (earthquake.usgs.gov/data/oaf/background.php); Savran dkk. 2022 (zenodo.org/records/7064845) |
| Susulan Bayesian: parameter generik sebagai awal, diperbarui per jam dari data rangkaian; kandidat ETAS untuk gempa M >= 6,5 | USGS kini memakai RJ atau ETAS; Italia memakai ensemble ETAS, ETES, STEP; satu set parameter tidak cocok untuk semua rangkaian | USGS OAF overview; Spassiani dkk. 2023 (OEF-Italy) |
| Uji retrospektif dengan kriteria dibekukan dulu: Palu 2018, Lombok 2018, Cianjur 2022, Pasaman Barat 2022 | Belum ada uji prakiraan susulan untuk Indonesia yang terbit | Penelusuran pustaka, 24 Nov 2026 |
| Peluang 12 bulan dari laju sumber PuSGeN 2024 dan seismisitas yang dihaluskan, dengan sebaran binomial negatif | Laju katalog satu dekade sensitif terhadap rentetan Sumatra 2004-2010 | PuSGeN 2024 (Kementerian PU); Kagan, arXiv 1609.08217 |
| Verifikasi banjir dengan SEDI (bias disetel ke 1), Brier skill per bulan, diagram reliabilitas, dipisah per tunda dan per tingkat kab/kecamatan | ETS dan CSI merosot untuk kejadian langka; FAR melonjak di skala kecil (FFGS Thailand: FAR 0,5 provinsi, 0,85 kabupaten) | Ferro dan Stephenson 2011; memo verifikasi ECMWF 2014 |
| Hari tanpa laporan DIBI diperlakukan "tidak diketahui", bukan "tidak banjir"; validasi silang dengan Sentinel-1 dan berita | Laju laporan naik 823 hari banjir (2016) jadi 2.938 (2025); klimatologi menang karena mengukur kebiasaan melapor | `scripts/banjir/AUDIT-MODEL-2026-11.md` |
| Pembanding wajib sebelum label "teruji": GloFAS dan Google Flood Hub di DAS besar, FFGS BMKG untuk banjir bandang | Flood Hub pada tunda 5 hari setara GloFAS tunda 0 (Nearing dkk., Nature 2024) | Nearing dkk. 2024; Harrigan dkk., HESS 2023 |
| Validasi blok waktu dan wilayah (tinggalkan satu tahun, tinggalkan satu provinsi) | Data uji 2024-2025 sudah dibuka lebih dari 8 kali | `scripts/banjir/AUDIT-MODEL-2026-11.md` |

Tiga hal yang gagal diverifikasi dari sumber primer: nilai parameter RJ per wilayah (Page dkk. 2016, hanya dalam gambar), tanggal pasti USGS beralih ke ETAS, dan angka presisi per periode ulang di Nearing dkk. 2024 (berbayar).

Semua perubahan model melewati `validasi-model` dan tidak boleh menyentuh berkas bersidik sebelum tanggal bukanya.
