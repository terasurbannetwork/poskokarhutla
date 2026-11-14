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
| SA-09 | Target di renlap | blok Renlap Operasi Udara menampilkan target OMC dari zona; PDF/KML/GPX renlap memuatnya | `layar-peta` + `pipa-data` → `selera-angka` | SA-08 |

Migrasi produksi diterapkan pemilik.

## Fase 3: layar

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-11 | Kerangka seksi dan peta | data lewat rute berkas SA-08; seksi `#semai` di panel kiri, bilah sumber, lapisan peta (titik api, awan, angin, zona, base, kota), kotak lapisan, bilah jam dan putar | `layar-peta` → `inp-reviewer`, `selera-angka` | SA-04, SA-08 |
| SA-12 | Kolom kanan Pos komando | Rekomendasi, Zona usulan, Peringatan asap, tabel Cluster aktif, kartu Cara memutuskan dan Yang tidak terlihat, Salin ringkasan, dialog Jadikan target | `layar-peta` → `inp-reviewer`, `selera-angka` | SA-05, SA-08 |
| SA-13 | Tinjau BMKG dan Mitra | pemilih peran, bobot, mode Nimbus, jeda, tabel faktor, CSV, `operasi_semai_murni.js` + uji silang; tampilan Mitra dan ringkasan Inggris | `layar-peta` → `inp-reviewer`, `validasi-model` | Q4, Q5, Q12 (bawaan) |
| SA-16 | Gerbang klaim | `gerbang-semai-klaim.test.mjs`; berkas baru masuk daftar gerbang Operasi Udara | `penulis-gerbang` | – |

## Fase 4: kejujuran

| Tiket | Isi | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | --- | ------- | -------------------- | -------- |
| SA-10 | Uji prospektif dan rapor | `semai_nilai.py` ALGORITMA §12; kartu Rapor uji; sortie lawan zona | `pipa-data` → `validasi-model` | rahasia GSMaP/Earthdata (pemilik), Q10 (bawaan) |
| SA-17 | Uji balik musim 2023 | putar ulang zona dengan analisis ulang (ERA5 jam-an, bukan IFS, dicatat sebagai beda) dan hotspot arsip; hujan IMERG Final; hasil di `riset/R5-UJI-BALIK-2023.md`, tidak tampil di layar sebelum pemilik membaca | `model-sebaran` → `validasi-model` | – |

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

SA-01 → SA-02 → SA-03 → SA-04 → SA-05 → SA-06 → SA-07 → SA-08 → SA-11 → SA-12 → SA-09 → SA-13 → SA-16 → SA-10 → SA-17.
SA-02 dan SA-07 boleh berjalan bersamaan (berkas tidak beririsan). SA-11 boleh mulai dengan `semai.json` dari SA-04 tanpa SA-05
(lapisan asap kosong berlabel "belum tersedia", bukan data karangan).
