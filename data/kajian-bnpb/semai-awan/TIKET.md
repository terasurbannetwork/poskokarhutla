# TIKET: Peluang Semai Awan dan Prakiraan Asap (`SA-*`)

Kerjakan berurutan. Ambil satu tiket, kerjakan hanya cakupannya, buktikan dengan perintah di `RENCANA-UJI.md`, tiket layar ditinjau
pemilik di `http://localhost:8800/operasi#semai`, baru tiket berikutnya. Tiket yang menunggu Q memakai bawaan [SEMENTARA] kecuali
ditulis "berhenti".

## Fase 1: data dan mesin (tanpa layar)

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-01 | Uji kelayakan ECMWF 0,1 derajat | `semai_ifs.py --cek`: index, rentang byte, eccodes, potong wilayah, waktu dan ukuran satu putaran; hasil dicatat di `riset/R4-UJI-IFS.md`. Bila > 15 menit atau gagal: berhenti, lapor pemilik | `pipa-data` → `mekanik-mesin` | Q1 (bawaan dipakai) |
| SA-02 | Fungsi murni | `semai_murni.py` + `semai_bobot.json` + `semai.py uji` (RENCANA-UJI §1) | `pipa-data` → `validasi-model` | – |
| SA-03 | Turunan dan gerbang | `semai.py`: turunan §2, gerbang §3, raster awan PNG per langkah | `pipa-data` → `validasi-model` | – |
| SA-04 | Faktor, skor, zona | §4 sampai §8: kandidat, Q D T, dua mode, zona, jendela 85%, base, kota, `semai.json` | `pipa-data` → `validasi-model` | Q2, Q6, Q7, Q8, Q9 (bawaan) |
| SA-05 | Asap | `lintasan.py` mode semai §9: angin IFS, pemanasan 12 jam, 3 pelepasan per jam, bobot FRP, beban per jam, raster asap, kota 20 km, lintas batas 5%, poligon daratan PNG di `negara()`; `kota_tetangga.json` | `cuaca-udara` → `validasi-model` | Q11 (bawaan) |
| SA-06 | Workflow | `semai.yml` 10.00 dan 22.00 UTC, unggah R2 `operasi/semai/`, `jaga_jadwal.mjs` (770 menit), batas ukuran berkas, gagal-lunak; `semai_beku.py` append-only di R2; satelit hilang §10 | `mekanik-mesin` → `penulis-gerbang` | Q1 |

## Fase 2: target renlap

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-07 | Migrasi | `migrations/0129_semai_target.sql` (nomor diperiksa ulang) | `warga-api` → `migrasi-idempoten` | – |
| SA-08 | Rute berkas dan target | `src/operasi_semai.js` (baca R2 berdaftar tetap, target), digabung `src/worker.js`; uji RENCANA-UJI §4 | `warga-api` → `guard-api`, `security-reviewer` | Q3 (bawaan) |
| SA-09 | Target dan rute di renlap | blok Renlap Operasi Udara menampilkan target OMC dari zona; rute terbang OMC ALGORITMA §7c (CP base, titik masuk, pola tabur, kembali) di halaman cetak renlap (`public/renlap_cetak.*`), KML, GPX, dan pratinjau garis rute di peta seksi semai | `layar-peta` + `pipa-data` → `selera-angka` | SA-08 |

Migrasi produksi diterapkan pemilik.

## Fase 3: layar

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-11 | Kerangka seksi dan peta | data lewat rute berkas SA-08; seksi `#semai` di panel kiri, bilah sumber, lapisan peta (titik api, awan, angin, zona, base, kota), kotak lapisan, bilah jam dan putar | `layar-peta` → `inp-reviewer`, `selera-angka` | SA-04, SA-08 |
| SA-12 | Kolom kanan Pos komando | Rekomendasi, Zona usulan, Peringatan asap, tabel Cluster aktif, kartu Cara memutuskan dan Yang tidak terlihat, Salin ringkasan, dialog Jadikan target | `layar-peta` → `inp-reviewer`, `selera-angka` | SA-05, SA-08 |
| SA-13 | Tinjau BMKG dan Mitra | pemilih peran, bobot, mode Nimbus, jeda, tabel faktor, CSV, `operasi_semai_murni.js` + uji silang; tampilan Mitra dan ringkasan Inggris | `layar-peta` → `inp-reviewer`, `validasi-model` | Q4, Q5, Q12 (bawaan) |
| SA-16 | Gerbang klaim | `gerbang-semai-klaim.test.mjs`; berkas baru masuk daftar gerbang Operasi Udara | `penulis-gerbang` | – |

## Fase 3b: renlap semai lengkap

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-22 | Ketinggian dan bahan | `semai.py`: ketinggian dasar awan per zona, deteksi inversi berasap, usulan bahan, jumlah sortie dan bahan (ALGORITMA §7b); `muatan_kg` kosong di `semai_bobot.json`; tampil di kartu Rekomendasi, dialog target, dan renlap OMC (PDF/KML/GPX) | `pipa-data` + `layar-peta` → `validasi-model`, `selera-angka` | SA-05, SA-09; angka jumlah: Q15, Q16 |
| SA-23 | Mulai dari target | `kandidat_target` di pipeline untuk kab bercluster dan KHG prioritas; pemilih target di kolom kanan; zona target dihitung di peramban (ALGORITMA §7b) | `pipa-data` + `layar-peta` → `inp-reviewer`, `validasi-model` | SA-13 |

## Fase 3c: kabar dan jejak keputusan

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-24 | Peringatan sebelum subuh | `semai.yml` putaran 22.00 UTC menulis ringkasan; bot WA Mac mini (`scripts/wa/**`) mengirimnya pukul 05.15 WIB; peringatan asap merah masuk Perlu tindakan | `wa-bot` + `layar-peta` → `security-reviewer` | Q17 (bawaan) |
| SA-25 | Log keputusan harian | migrasi `op_semai_putusan` (base, tanggal, terbang/tidak, zona_id, alasan, putaran, oleh, dibuat; hapus lunak); rute tulis peran S7, baca pembaca `/operasi`; kartu "Keputusan hari ini" per base di seksi; ekspor CSV | `warga-api` + `layar-peta` → `guard-api`, `migrasi-idempoten` | – |

## Fase 4: kejujuran

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-10 | Uji prospektif dan rapor | `semai_nilai.py` ALGORITMA §12; kartu Rapor uji; sortie lawan zona | `pipa-data` → `validasi-model` | rahasia GSMaP/Earthdata (pemilik), Q10 (bawaan) |
| SA-17 | Uji balik musim 2023 | putar ulang zona dengan analisis ulang (ERA5 jam-an, bukan IFS, dicatat sebagai beda) dan hotspot arsip; hujan IMERG Final; hasil di `riset/R5-UJI-BALIK-2023.md`, tidak tampil di layar sebelum pemilik membaca | `model-sebaran` → `validasi-model` | – |

## Fase 5: dari benchmark (`riset/R5-BENCHMARK.md`, diputuskan penyusun atas S9)

| Tiket | Isi | Keputusan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | --------- | -------------------- | -------- |
| SA-26 | Jejak sortie nyata: bahan, kg, jumlah flare, jam tabur mulai dan selesai per sortie, terhubung ke zona | dikerjakan; memakai `omc_sortie` dan form `/admin/omc` yang ada, kolom yang kurang lewat migrasi baru | `warga-api` + `layar-peta` → `migrasi-idempoten`, `guard-api` | – |
| SA-27 | Evaluasi target-kontrol: hujan satelit di sasaran lawan wilayah kontrol yang dicocokkan angin dan lintang | dikerjakan bersama SA-10, di rapor yang sama | `pipa-data` → `validasi-model` | akun GSMaP |
| SA-29 | Penggeser arsip putaran (24 jam, 48 jam, 7 hari) untuk meninjau zona lalu | dikerjakan; arsip R2 sudah ada | `layar-peta` + `warga-api` → `inp-reviewer` | – |
| SA-30 | Laporan pasca-operasi harian A4: keputusan (SA-25), sortie (SA-26), zona, hasil rapor | dikerjakan sesudah SA-25 dan SA-26 | `layar-peta` → `selera-angka` | – |
| SA-33 | Tingkat peringatan asap lintas batas: "waspada" sekali, "siaga" bila menyeberang di dua putaran harian berturut-turut (pola ASMC) | dikerjakan di SA-05/SA-12 dari arsip | `cuaca-udara` + `layar-peta` → `validasi-model` | – |
| SA-35 | Jejak ADS-B pesawat OMC dicocokkan dengan zona dan jendela terbang | dikerjakan; memakai jejak ADS-B Operasi Udara yang sudah ada (`/api/operasi/jejak`), bukan sumber baru | `layar-peta` + `warga-api` → `inp-reviewer` | – |
| SA-28 | Tanda "hujan alami sudah cukup" | ditunda: GSMaP terlambat sekitar 4 jam, jadi tidak bisa jadi penanda saat terbang; gerbang G6 sudah menyaring hujan deras prakiraan | – | nowcast Himawari (SA-19) |
| SA-31 | Biaya per sortie dan per mm | ditolak: K19 Operasi Udara, kontrak tanpa harga | – | – |
| SA-32 | Label kepadatan asap teramati (Himawari) | ditunda: tingkat asap model sudah tiga tingkat; pengamatan asap Himawari tiket lanjutan | – | – |
| SA-34 | Sebaran ensemble per zona | ditunda: ensemble ECMWF terbuka 0,25 derajat 51 anggota, sekitar 20 kali volume unduhan; dinilai ulang sesudah rapor SA-10 | – | – |

## Lanjutan (tidak dikerjakan sebelum pemilik memutuskan)

| Tiket | Isi | Menunggu |
| ----- | --- | -------- |
| SA-14 | Pembasahan gambut tanpa api aktif: faktor manfaat dari kekeringan gambut (DC, kepadatan hotspot 3 sampai 7 hari) | Q9 |
| SA-15 | Tautan baca mitra tanpa login (hanya blok `mitra`) | Q5 |
| SA-21 | Base OMC di luar Sumatera dan Kalimantan masuk `op_base` | Q13 |
| SA-18 | Peran `bmkg` dan akun peninjau | Q4 |
| SA-19 | Himawari B13 jam-an sebagai pemeriksa awan nyata per zona (bukan per kabupaten) dan pembaruan zona antarputaran | sesudah SA-10 punya n >= 30 |
| SA-20 | Peringatan asap lintas batas masuk Perlu tindakan Ringkasan dan WA bot | pemilik |

## Urutan

SA-01 → SA-02 → SA-03 → SA-04 → SA-05 → SA-06 → SA-07 → SA-08 → SA-11 → SA-12 → SA-09 → SA-13 → SA-22 → SA-23 → SA-25 → SA-24 → SA-26 → SA-35 → SA-29 → SA-33 → SA-16 → SA-10 (+ SA-27) → SA-30 → SA-17.
SA-02 dan SA-07 boleh berjalan bersamaan (berkas tidak beririsan). SA-11 boleh mulai dengan `semai.json` dari SA-04 tanpa SA-05
(lapisan asap kosong berlabel "belum tersedia", bukan data karangan).
