# PRD: Siklus Bencana (`/siklus`)

Dokumen kedua dalam urutan otoritas. Kalah dari `KEPUTUSAN-AWAL.md` (disingkat KA); menang atas ALUR dan dokumen di bawahnya. Versi 1.0, 10 Nov 2026.

**Konvensi.** Fitur berkode F1 sampai F7 dan lapis dasar G0. Butir bernomor `F<n>-NN` (untuk G0: `G0-NN`). Peran: WG warga/publik, BP BPBD, PD pusdalops, KO koordalops, PM pimpinan, SA Super Admin. Pertanyaan terbuka mengikuti KA bagian H (U1 dan seterusnya); bawaan sementaranya dipakai dan hasil yang bergantung padanya diberi tanda. Label keyakinan: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan`, `hipotesis`, `menunggu` (KA 8).

## 1. Latar dan masalah

Siklus bencana kita terpotong menurut modul. Peringatan, kejadian, dampak, kaji cepat, rehab-rekon, dan rencana kontingensi ada di layar dan tabel yang berbeda, tanpa satu ID kejadian yang menyatukannya (R1 A, I.1). Akibatnya:

1. **Satu kejadian punya banyak wajah.** DIBI, Logbook Pusdalops, sistem kita, dan banjir memakai kunci kejadian dan kunci wilayah berbeda. Kode karhutla `K####` diberi ulang tiap hari. Hanya 58,9 persen kejadian logbook yang juga ada di DIBI (R3 bagian 4).
2. **Riwayat tidak terjangkau.** DIBI harian di repo hanya setahun (4.404 baris); riwayat 2011-2026 (57.161 baris) di mesin pemilik; logbook CSV kotor (644 tanggal kosong, sekitar 10 tahun mustahil).
3. **Paparan hanya sampai kecamatan dan tiga provinsi.** Grid bangunan baru ada untuk 13, 33, 63; fasilitas vital tidak punya layar; kelas bahaya InaRISK per bangunan tidak ada.
4. **Dampak baru diketahui lama sesudah kejadian.** Tidak ada perkiraan dalam hitungan jam; gempa punya mesin tetapi banjir tidak punya genangan per kejadian.
5. **Jitupasna tidak bersambung ke R3P.** Meja rehab mencatat usulan dan pencairan tetapi tidak menghitung nilai kerusakan, tidak punya harga satuan, dan tidak punya draf R3P.
6. **Renkon hanya metadata dan gladi tanpa bahan.** Meja renkon menyimpan tanggal dan tautan; isi rencana dan asumsi dampak tidak hidup.
7. **Tidak ada sinyal jangka panjang.** Tidak ada proyeksi iklim di repo; bangunan yang tumbuh di zona bahaya tidak terukur.
8. **Pintu terpisah.** `/semua`, `/bnpb`, meja, MCP, dan AI tidak satu pintu menurut fase dan peran.

Program ini menyatukannya dalam satu pintu `/siklus` tanpa mengganti modul yang ada (KA 22), memakai ulang kode (KA bagian E), dan menaruh lapis gudang data lebih dulu (G0).

## 2. Sasaran terukur

Sasaran ini bawaan [Awal]; pemilik boleh mengubahnya. Ambang numerik yang tidak berasal dari riset ditandai dasar.

| Kode | Sasaran | Ukuran | Gelombang |
| --- | --- | --- | --- |
| S1 | Riwayat kejadian bersatu | 57.161 baris DIBI harian 2011-2026 terpasang ke ID `KJ-`; jumlah baris logbook yang dibuang dilaporkan, bukan disembunyikan | G1 |
| S2 | Satu kunci wilayah | 100 persen kejadian berkunci BPS 4 digit; kejadian yang gagal dipetakan tampil dengan kolom "wilayah belum terpetakan", tidak dihapus | G1 |
| S3 | Paparan berlapis | grid bangunan 38 provinsi (kini 3); paparan per desa dan fasilitas vital per zona bahaya | G1 |
| S4 | Selisih sumber tertulis | tiap kejadian dengan lebih dari satu sumber dampak menampilkan angka berdampingan dan selisihnya | G1 |
| S5 | Kaji cepat berrentang | gempa M5 ke atas: keluaran tersedia sesudah grid USGS terbit; tiap angka rentang berlabel `estimasi-model` | G2 |
| S6 | Uji balik F3 | galat kalibrasi tertulis di layar; selama uji balik belum lolos, label tetap `estimasi-model` (KA 9) | G2 |
| S7 | R3P berdasar Perban 5/2017 | draf mencakup lima sektor Pasal 8 ayat (2); nilai kerusakan memakai rumus Perka 15/2011 hal. 40-41 | G3 |
| S8 | Renkon yang kedaluwarsa terlihat | renkon masa berlaku 3 tahun (Perban 2/2023) tampil dengan hari tersisa | G4 |
| S9 | Sinyal iklim berlabel jujur | semua keluaran F6 berlabel `hipotesis` sampai uji historis selesai | G4 |
| S10 | Jejak aset | tambahan berkas `public/` paling banyak 200; tidak ada kueri pindai D1 di cron | semua |

## 3. Pengguna dan peran

| Peran | Masuk lewat | Boleh |
| --- | --- | --- |
| WG warga/publik | tanpa masuk | halaman `/siklus/kejadian/:id` bagian ringkasan resmi saja (U3 bawaan) |
| BP BPBD | akun instansi yang sudah ada (`src/instansi.js`); pemetaan ke peran ditetapkan di DESAIN-TEKNIS | membaca kejadian dan paparan wilayahnya; mengisi isian kaji cepat dan Jitupasna daerahnya |
| PD pusdalops | sesi staf peran `pusdalops` | menulis: verifikasi kejadian, kaji cepat, logbook, pemasangan sumber |
| KO koordalops | sesi staf peran `koordalops` | menulis: semua PD, ditambah transisi fase kejadian dan renkon |
| PM pimpinan | sesi staf peran `pimpinan` | baca semua; tanda setuju draf R3P (U7 bawaan), tidak menggantikan dokumen resmi |
| SA Super Admin | `superOK` | semua PD dan KO, ditambah tombol dummy dua ikon |

Tidak ada peran baru (KA 27a). Halaman staf `/siklus/*` masuk `run_worker_first`.

### 3.1 Matriks fitur x peran

B baca, T tulis, R ringkasan resmi saja, - tidak ada akses.

| Fitur | WG | BP | PD | KO | PM | SA |
| --- | --- | --- | --- | --- | --- | --- |
| G0 gudang data dan registri | - | - | B | B | B | T |
| F1 Buku Besar Kejadian | R | B | T | T | B | T |
| F2 Peta Paparan per Bangunan | - | B | B | B | B | T |
| F3 Kaji Cepat Otomatis | - | B | T | T | B | T |
| F4 Jitupasna ke R3P | - | T (daerahnya) | T | T | B + setuju | T |
| F5 Renkon Hidup dan Gladi | - | B | T | T | B | T |
| F6 Risiko Masa Depan | R (ringkasan) | B | B | B | B | T |
| F7 Pintu Tunggal | R (tautan publik) | B | B | B | B | T |

Paparan bangunan rinci tidak pernah tampil ke WG (KA 14). Data lapangan dan draf F4 dan F5 hanya staf (KA 15).

## 4. Aturan lintas fitur

1. Angka antarsumber tidak dijumlah atau dirata-rata; tampil berdampingan dengan selisih tertulis (KA 7).
2. Tiap angka: nilai, sumber, waktu, label keyakinan. Data tidak ada tertulis "tidak ada", bukan nol (KA 8).
3. Karhutla: titik panas, firespot, luas, belum padam, terdampak hanya dari sistem kita (KA 6). `terdampak` karhutla dari sumber lain bernilai `null` dan tidak tampil.
4. Tanpa registri pengungsi per orang, tanpa NIK, KK, atau KTP (KA 12-13). F3 dan F4 hanya memperkirakan jumlah jiwa.
5. Tabel D1 berawalan `sk_`, kolom `dummy`; migrasi `ON CONFLICT DO NOTHING`, nomor berikutnya yang kosong.
6. Tidak ada kueri pindai D1 di cron; agregat dibaca dari R2 atau berkas (KA 27).
7. Layar: kepala situs bersama, kartu standar `.ex.ex-std`, kelas `.sk-*`, tanpa kaki sumber, tanpa titik tengah dan em dash.
8. Tiap layar punya tombol dummy dua ikon untuk SA (KA 26).

## 5. G0: Lapis gudang data dan registri sumber

**Tujuan.** Semua data publik Siklus lewat satu gudang berlapis dan satu registri, sehingga sumber baru tunduk pada lisensi, jeda, dan gerbang `gerbang-peta-data` (KA 16).

**Kebutuhan fungsional.**

- G0-01 Registri `scripts/siklus/sumber.json`: tiap sumber punya id, fitur pemakai, pemilik, endpoint, lisensi dan atribusi, jadwal, jeda minta, status (hidup, bersyarat, gagal), tanggal uji, dan catatan batas. Awal: 42 sumber hasil uji R2, termasuk yang gagal.
- G0-02 Tiga lapis R2 di bucket `MEDIA`: `siklus/mentah/` (salinan apa adanya, bertanggal), `siklus/bersih/` (dinormalkan, kunci BPS 4 digit, label keyakinan), `siklus/saji/` (agregat siap layar). Layar membaca lapis saji saja.
- G0-03 Anggaran ukuran: awalan `siklus/` paling besar 4 GB (KA 27); anggaran per lapis dan per fitur tertulis di registri; pipeline menolak unggah yang melampaui anggaran dan melaporkannya.
- G0-04 Jadwal satu berkas `siklus.yml`; tidak menambah cron Worker. Keluaran besar ke R2, tidak di-commit (KA 28).
- G0-05 Data raksasa (Overture bangunan, NEX-GDDP) dibaca di tempat dengan DuckDB pada tahap lab; hanya agregat per desa, sel, atau kabupaten yang disimpan (KA 29).
- G0-06 Pembersihan riwayat: DIBI harian 2011-2026 (57.161 baris) diunggah ke `siklus/mentah/` lewat langkah baru, dibersihkan, dan laporan jumlah baris dibuang tertulis per alasan. Logbook CSV (56.685 baris) dibersihkan dengan aturan sama; baris logbook per kejadian tidak masuk `public/`.
- G0-07 Satu pembaca kunci: semua keluaran berkunci BPS 4 digit; jembatan lewat `kab_kunci` dan `hvc_dasar.kab_kode`.

**Sumber data.** Registri sendiri; R2; berkas yang disebut R1 bagian A sampai C.

**Keluaran.** `sumber.json`; `siklus/{mentah,bersih,saji}/`; laporan pembersihan `siklus/saji/laporan_bersih.json`.

**Larangan.** Memecahkan CAPTCHA; menyalin data raksasa utuh ke R2; sumber tanpa lisensi tercatat; menambah berkas `public/` lebih dari 200 (KA 28).

**Kriteria terima.** Gerbang `gerbang-peta-data` hijau; tiap sumber di registri punya pemakai dan jadwal; laporan pembersihan menyebut jumlah baris dibuang; `du` awalan `siklus/` di bawah anggaran.

## 6. F1: Buku Besar Kejadian

**Tujuan.** Satu ID dan satu halaman tiap kejadian, dari peringatan sampai pulih.

**Kebutuhan fungsional.**

- F1-01 ID kejadian `KJ-<tahun>-<8 base32 Crockford>` dikeluarkan sistem dari SHA-256 kunci pendiri (ALG F1.2) dan tidak dipakai ulang. Tabel `sk_kejadian`, `sk_kejadian_kab` (kabupaten per kejadian), dan tabel pemetaan `sk_kejadian_sumber` (sumber, kode sumber) ke `KJ-`. Alasan: `K####` tidak stabil (R1 I.1; KA 17). Sesuai KA 27c, D1 hanya memuat kejadian hidup dan yang dipromosikan; arsip DIBI dan Logbook di R2 dengan ID yang sama. `sk_kejadian` adalah satu-satunya buku kejadian; Rantai per KIB dan `meja_dampak` dirujuk baca saja lewat tabel pemetaan (KA U21), nomor KIB masuk kolom nomor induk bila tersedia.
- F1-02 Pemasangan memakai `kunci_kejadian.pasangkan` (jendela 3 hari, jenis kanonik, kab BPS, tanggal mulai). Aturan DATA-DAMPAK: satu cocok menambah entri, nol membuat kejadian baru, lebih dari satu ditolak dan staf diminta memilih. Satu pemilik pemasangan; tidak berebut dengan meja `dampak`. Gabung hanya manual oleh KO; tidak ada pecah, salah gabung dibetulkan lewat koreksi manual baris sumber yang tercatat di jejak.
- F1-03 Sumber yang dipasang: DIBI harian (setahun di repo, penuh di R2 setelah G0-06), Logbook Pusdalops (hidup D1 dan CSV bersih), kejadian lintas bencana (`_awal.json` banjir, gunung api, cuaca, udara, kekeringan), gempa (D1 `gempa_kejadian`), karhutla lewat sel atau kompleks, rob, rumah rusak, korban.
- F1-04 Fase kejadian: `terdeteksi`, `terverifikasi`, `tanggap`, `transisi`, `pemulihan`, `selesai` (lihat ALUR). Transisi oleh PD atau KO, tercatat dengan siapa dan kapan.
- F1-05 Halaman `/siklus/kejadian` (daftar, saring jenis, wilayah, fase, rentang tanggal) dan `/siklus/kejadian/:id` (kartu: ringkasan, garis waktu, dampak per sumber berdampingan, paparan dari F2, kaji cepat dari F3, pemulihan dari F4).
- F1-06 Angka dampak per sumber ditampilkan berdampingan dengan selisih. Tidak ada kolom "total gabungan".
- F1-07 Kunci silang GDACS dan GLIDE, USGS FDSN id disimpan sebagai pengenal luar, bukan sebagai angka (R2 F1). PetaBencana tidak tampil publik sebelum lisensi datanya dikonfirmasi.
- F1-08 Bentuk `_awal.json` yang dibaca `public/semua/kejadian.js` tidak berubah; Buku Besar jadi lapis di atasnya.
- F1-09 Halaman publik hanya memuat ringkasan resmi (U3 bawaan); rincian dan nama korban hanya staf (`src/korban.js`).

**Sumber data.** DIBI, Logbook, `_awal.json`, D1 `gempa_kejadian`, `logbook_kejadian`, `rumah_rusak`, `korban`; GDACS, GLIDE, USGS (kunci silang).

**Keluaran.** D1 `sk_kejadian`, `sk_kejadian_sumber`; R2 `siklus/saji/kejadian/*`; layar `/siklus/kejadian*`; rute `/api/siklus/kejadian*`.

**Larangan.** Memakai `K####` sebagai kunci; menjumlah angka antarsumber; menulis baris logbook per kejadian ke `public/`; memakai ReliefWeb (U6); memakai angka karhutla dari Koordalops (KA 6); format nomor induk Walidata diasumsikan (tidak ditemukan; `KJ-` sementara).

**Kriteria terima.** Uji pemasangan: tiga kasus (satu cocok, nol, lebih dari satu); kejadian karhutla yang kodenya berubah hari berikutnya tetap satu `KJ-`; halaman publik tidak memuat nama korban; selisih DIBI lawan logbook tertulis.

## 7. F2: Peta Paparan per Bangunan

**Tujuan.** Bangunan, fasilitas vital, dan jiwa di tiap zona bahaya.

**Kebutuhan fungsional.**

- F2-01 Lengkapi grid bangunan 38 provinsi lewat `bangunan.yml` (kini 13, 33, 63). Provinsi tanpa grid ditandai `terliput:false`; tidak pernah ditulis nol bangunan. Ambang keyakinan 0,70 tetap bawaan; per sel S2 menunggu keputusan pemilik (R3 pertanyaan 7).
- F2-02 Silang bangunan dengan zona bahaya: karhutla, banjir (poligon `kejadian_aktif_geo.json`), gempa (MMI), gunung api (KRB), dan kelas InaRISK. Kelas InaRISK per bangunan lewat sampling per sel (raster tidak disimpan); satu batas kelas (0,33 dan 0,66 bawaan repo) dengan catatan: sumber resmi batas tidak ditemukan.
- F2-03 Tingkat desa: agregat jumlah dan luas jejak bangunan per desa dari Open Buildings (utama). Agregat Overture (dibaca di tempat) DITUNDA: tidak dibangun di G1 dan tidak ada tiketnya sampai diputus; tinggi dan jenis bangunan tidak diasumsikan karena atribut terisi di bawah 2 persen (R2).
- F2-04 Jiwa per zona dari WorldPop per kecamatan, Dukcapil per desa, GHSL POP 100 m; tiga sumber ditampilkan berdampingan, tidak dirata-rata. WorldPop dan Dukcapil memakai berkas yang sudah ada di repo (`public/data/penduduk.json`, titik pusat desa); tidak ada adapter baru.
- F2-05 Fasilitas vital: sekolah (65.551 berkoordinat, Sekolah Kita bila izin Pusdatin diperoleh), kesehatan (Geofabrik OSM, Overture places, Wikidata; label cakupan `estimasi-model`), ibadah, kantor pemerintah, jalan dan jembatan dari Geofabrik. Kategori mengikuti InaRISK (RS, puskesmas, sekolah, madrasah, bandara, pelabuhan, obvitnas); daftar baku di Perka tidak ditemukan.
- F2-06 Layar `/siklus/paparan`: pilih wilayah (BPS 4 digit), bahaya, dan kelas; keluaran agregat per desa dan per kecamatan. Rincian per bangunan dibaca setelah masuk, lewat rute berkunci yang memakai pola `src/bangunan.js`.
- F2-07 Kontrak lama (`terpapar.json`, `kec.json`, `grid_<prov>.json`, tiga rute `/api/bangunan/*`, MCP `bangunan_terpapar`) tidak berubah; perluasan berupa berkas dan rute baru.
- F2-08 Plafon ukuran: `halus_33.json` 19,7 MB; 38 provinsi didesain muat di R2 dan dibaca per provinsi, tidak di `public/`. Naik paket (U1) bukan prasyarat.

**Sumber data.** Open Buildings, Overture, GHSL, WorldPop, Dukcapil, Sekolah Kita/Dapodik, Geofabrik, Wikidata, InaRISK (ArcGIS), `fasilitas.json`, `sekolah.json`.

**Keluaran.** R2 `siklus/saji/paparan/*` dan `bangunan/*`; layar `/siklus/paparan`; rute `/api/siklus/paparan*`.

**Larangan.** Paparan rinci di `public/`; NIK atau identitas pemilik; menganggap tinggi atau jenis bangunan dari Overture; menyalin Overture utuh ke R2 (sekitar 11 GB WKB); memakai SIRS Kemenkes; menulis kelas bahaya seolah resmi bila batas kelas bersumber repo.

**Kriteria terima.** Provinsi tanpa grid tampil "tidak terliput"; tiga sumber jiwa berdampingan; `public/` bertambah paling banyak sesuai anggaran 200 berkas; uji pola `src/bangunan.js` (butuh sesi).

## 8. F3: Kaji Cepat Otomatis

**Tujuan.** Perkiraan dampak dalam hitungan jam sesudah kejadian, selalu rentang.

**Kebutuhan fungsional.**

- F3-01 Gempa lebih dulu: grid USGS ShakeMap (`grid.xml` atau `cont_mmi.json`, `coverage_mmi_low_res`) sebagai sumber baru; mesin `guncangan.py` dan `pager.py` yang sudah terkalibrasi dipakai. Galat kalibrasi tertulis di layar (kalibrasi 3,06; `faktor_loo` 5,34; model meleset sampai 5 kali).
- F3-02 Rentang korban gempa dari selisih model: PAGER global v2 dan ITB Indonesia ditampilkan sebagai batas rentang (R3 3.1); pilihan model dasar menunggu pemilik. Di bawah MMI 4 nol.
- F3-03 Kerusakan rumah gempa tidak ada di mesin; kurva kerapuhan resmi BNPB tidak ditemukan. Tahap awal: tidak ditampilkan (tertulis "menunggu"), bukan nol.
- F3-04 Banjir tahap pertama: poligon kejadian aktif (`kejadian_aktif_geo.json`) x paparan F2 x `dampak.json`; jam pertama = kecamatan Siaga atau Awas x penduduk x sekolah dan faskes. Sentinel-1 per kabupaten belum dipakai layar; masuk F3 hanya setelah punya pembaca dan pemakai.
- F3-05 Kerusakan banjir menurut kedalaman memakai kurva JRC Asia (hunian 0,33 pada 0,5 m, 0,49 pada 1 m, dan seterusnya) setelah ada kedalaman; konversi rupiah (kurs, tahun harga) berlabel `asumsi-kebijakan`.
- F3-06 Lampu malam tidak dipakai sampai uji baliknya lolos (R1 D).
- F3-07 Layar `/siklus/kaji` (daftar) dan `/siklus/kaji/:id` (kartu rentang, label, sumber, waktu, galat kalibrasi). Hasil tertaut ke `KJ-` dari F1.
- F3-08 Tiap keluaran berlabel `estimasi-model`; tidak pernah ditulis sebagai angka resmi BNPB (KA 9). Model yang belum lolos uji tetap tampil dengan pil hipotesis jelas (KA 11).
- F3-09 Isian kaji cepat meja `kaji_cepat` (Juklak 3/2022) tetap di tempatnya; F3 menampilkan perkiraan otomatis di samping hasil verifikasi petugas, berdampingan.

**Sumber data.** USGS ShakeMap, PAGER, `riwayat_m5.json`, `kalibrasi_kerusakan.json`, `kejadian_aktif_geo.json`, `dampak.json`, F2.

**Keluaran.** R2 `siklus/saji/kaji/<KJ>.json`; D1 `sk_kaji`; layar `/siklus/kaji*`; rute `/api/siklus/kaji*`.

**Larangan.** Angka tunggal tanpa rentang; menyebut angka resmi; registri pengungsi per orang; memakai lampu malam; menyambung S1 sebelum ada pembaca.

**Kriteria terima.** Uji dengan gempa arsip (contoh USGS us6000tkt2, M7,8 Ende, 14 Agt 2026); keluaran selalu `[bawah, atas]`; gagal ambil grid memberi status "menunggu", bukan nol.

## 9. F4: Jitupasna ke R3P Digital

**Tujuan.** Dari isian lapangan, hitung kerusakan dan kerugian, draf R3P, sampai pemantauan pelaksanaan.

**Kebutuhan fungsional.**

- F4-01 Tabel `sk_*` (bukan `meja_catatan`): `sk_jitupasna`, `sk_jitupasna_baris` (unit rusak per sektor dan tingkat), `sk_r3p`, `sk_r3p_kegiatan`. Tertaut ke `KJ-` dan kaji lewat kolom teks tanpa FK (pola `pemulihan.kejadian_id`).
- F4-02 Rumah rusak per rumah memakai `rumah_rusak.js` (tanpa identitas pemilik di kolom publik); tidak ada tabel rumah rusak kedua.
- F4-03 Nilai kerusakan = unit rusak per tingkat (RB di atas 70 persen, RS 30 sampai 70, RR di bawah 30) x harga satuan per tingkat (Perka 15/2011 hal. 40-41). "Hancur total" dipisah dari RB sesuai formulir; peta baku ditunggu (R3 pertanyaan 3).
- F4-04 Nilai kerugian per sektor berdasarkan asumsi (misalnya lama pemulihan) dengan pemeriksaan hitung ganda antarsektor, cakupan, dan kewajaran (Kotak 1 hal. 41).
- F4-05 Harga satuan: dimasukkan manual dari dokumen HSBGN atau Perka yang ada di pustaka, berlabel `asumsi-kebijakan` (U4), disesuaikan dengan IKK BPS (var 2515) hanya dalam tahun yang sama dan IHPB konstruksi (var 1018). Tidak ada API harga PUPR.
- F4-06 Tarif stimulan rumah RB/RS/RR: `asumsi-kebijakan` 60/30/15 juta bawaan (U8), sumber sekunder; teks Juklak 5/2024 belum ditemukan. Dana Tunggu Hunian Rp600.000 per bulan, tiga bulan (Juklak DTH 1/2023, repo).
- F4-07 Struktur draf R3P mengikuti Perban 5/2017: enam tahap (Pasal 2), lima sektor (Pasal 8 ayat (2)), batas 90 hari sejak tanggap darurat. Draf tidak tampil seolah dokumen resmi; penetapan oleh kepala daerah atau Kepala BNPB (Pasal 5-6). Tanda setuju PM di sistem tidak menggantikan dokumen resmi (U7).
- F4-08 Struktur laporan Jitupasna: gambaran bencana, akibat dan dampak, kebutuhan R3, perkiraan biaya, penutup (Perka 15/2011 hal. 41).
- F4-09 Pemantauan pelaksanaan menyambung `pemulihan.js` (huntara, huntap, DTH, jembatan gantung, sumur bor) dan alur rehab meja (`usulan` ke `selesai`).
- F4-10 Layar `/siklus/pulih` dan `/siklus/pulih/:id`. Formulir lapangan luring memakai pola `public/pipa/antre.js` (IndexedDB, idempoten).
- F4-11 Unduh draf R3P sebagai dokumen berkop, hanya staf; ekspor angka berlabel.
- F4-12 Daerah percontohan belum ditetapkan (U5): dummy dan satu kejadian arsip.

**Sumber data.** `rumah_rusak`, `pemulihan`, `meja_catatan` (baca), `keputusan.js`, `turunan/profil_kerugian.csv`, BPS IKK/IHPB, dokumen HSBGN/Perka manual.

**Keluaran.** D1 `sk_jitupasna*`, `sk_r3p*`; layar `/siklus/pulih*`; rute `/api/siklus/pulih*`; draf R3P unduhan staf.

**Larangan.** Menambah tabel `meja_*` (CHECK tidak bisa diubah); tabel rumah rusak kedua; NIK, KK, KTP; memakai harga IKK lintas tahun; tarif stimulan tampil tanpa pil `asumsi-kebijakan`; draf tampil sebagai dokumen resmi.

**Kriteria terima.** Uji hitung: unit x harga satuan sama dengan nilai; nilai disetujui tidak melebihi usulan (pola `cek` meja); migrasi idempoten; satu kejadian arsip menghasilkan draf lima sektor.

## 10. F5: Renkon Hidup dan Gladi

**Tujuan.** Rencana kontingensi yang diperbarui dari data, dan latihan dari kejadian nyata.

**Kebutuhan fungsional.**

- F5-01 Isi renkon di `sk_renkon` (judul, bencana, wilayah, skenario, asumsi dampak lima aspek, kerangka respon, kesenjangan sumber daya, status). Meja renkon `src/meja_spek.js` tetap sebagai metadata dokumen dan tertaut lewat ID.
- F5-02 Struktur mengikuti Perban 2/2023: persiapan, pelaksanaan, finalisasi (Pasal 4); asumsi dampak lima aspek (lingkungan, kependudukan, ekonomi, infrastruktur, layanan sipil; Pasal 7 ayat (5)); kerangka bab Lampiran. Ejaan resmi "kontingensi" (R3 pertanyaan 9). Daftar klaster baku tidak ada; tidak diciptakan.
- F5-03 Asumsi dampak adalah isian manual staf. Sistem hanya menyajikan usulan angka dari rumus ALG F5.1 (paparan F2, riwayat F1, `logbook_kebutuhan.json`) di samping isian; usulan diterima atau diubah staf dan tidak pernah menimpa.
- F5-04 Kebutuhan dasar mengikuti Perka 7/2008 (3 m2 per orang, 2.100 kkal, 400 g beras, air 7 lalu 15 liter per hari); Sphere 2018 sebagai pembanding (U9 bawaan).
- F5-05 Stok dari LogPal dan personel dari `/petugas` dibaca sebagai kesenjangan sumber daya; tidak membuat stok kedua. Data asli gudang di luar repo.
- F5-06 Masa berlaku 3 tahun (Perban 2/2023 Pasal 21 ayat (1), sesuai `jam_aturan.json`, UA-5); pemutakhiran lebih awal bila faktor risiko berubah atau ada kejadian. Pengingat lewat `pengingat.js`; jenis baru butuh bangun ulang CHECK, dikerjakan warga-api bila perlu.
- F5-07 Gladi (`/siklus/gladi`): Gladi Ruang dan Gladi Lapang menurut Juklak 4/2026; dokumen Direktif Latihan, RGB, ROL, matriks permasalahan. Gladi posko tidak punya juklak sendiri.
- F5-08 Gladi tahap pertama memutar ulang data kejadian dari F1 sebagai skenario; bukan simulasi genangan. Gladi hanya untuk kejadian yang sudah dipromosikan ke D1 (garis waktu ada di D1); kejadian yang masih di arsip R2 dipromosikan dulu. Replay Maret 2025 tetap satu kejadian, lisensi DEM NC, berlabel "Model sederhana, bukan prakiraan".
- F5-09 Keluaran gladi minimal rekomendasi perbaikan kebijakan, renkon, dan sarana prasarana (Juklak 4/2026), tertaut kembali ke `sk_renkon`.
- F5-10 Daerah percontohan belum ada (U5): dummy dan satu kejadian arsip.

**Sumber data.** Meja renkon, LogPal, `/petugas`, `logbook_entri`, `logbook_kebutuhan.json`, F1, F2, `kebutuhan_musim.json`.

**Keluaran.** D1 `sk_renkon*`, `sk_gladi*`; layar `/siklus/renkon*`, `/siklus/gladi`; rute `/api/siklus/renkon*`.

**Larangan.** Mengarang daftar klaster; stok kedua; menyebut gladi sebagai prakiraan; menimpa dokumen renkon yang sudah ditetapkan tanpa persetujuan; memakai replay Maret 2025 untuk keperluan komersial (NC).

**Kriteria terima.** Renkon dengan `berlaku_sampai` lewat tampil kedaluwarsa; gladi dari kejadian yang sudah dipromosikan menghasilkan keluaran rekomendasi; kesenjangan stok memakai angka LogPal tanpa salinan.

## 11. F6: Risiko Masa Depan dan Tata Ruang

**Tujuan.** Profil risiko 2030 dan 2050, bangunan yang tumbuh di zona bahaya. Bukan ramalan kejadian (KA 10).

**Kebutuhan fungsional.**

- F6-01 Belum ada data proyeksi di repo, jadi dibangun dari NEX-GDDP-CMIP6 (pr, tas; empat skenario SSP; 35 model; grid 0,25 derajat) dibaca di tempat, hasil agregat per kabupaten ke R2 (KA 29). Potongan bbox belum teruji.
- F6-02 Indeks ETCCDI hanya tiga: Rx1day, Rx5day, CDD (CWD, R20mm, R95pTOT tidak dibuat). Keluaran selisih terhadap dasar, bukan jumlah kejadian. Dasar menurut ALG F6.2 (historical model sendiri; CHIRPS v3 pembanding bias, UA-6).
- F6-03 Muka laut: AR6 (Zenodo) dan PSMSL; rentang 17 sampai 83 persen ditampilkan; penurunan muka tanah pesisir tidak dihitung, ditulis demikian.
- F6-04 Bangunan tumbuh: GHSL BUILT-S epoch 1975 sampai 2030 per 5 tahun (2025 dan 2030 adalah model) disilang dengan zona bahaya F2. Data mentah GHSL belum ada; diunduh di lab.
- F6-05 Tata ruang: PIPPIB dan konsesi dari repo; RTRW tidak otomatis (ATR/BPN gagal), diisi dari lampiran Perda daerah percontohan bila ada. Analisis tumbuh di zona bahaya berlabel `hipotesis` (tanpa dasar angka peraturan).
- F6-06 Semua keluaran berlabel `hipotesis` sampai uji historis selesai. Kamus `yakin` kemitraan (4 nilai) disatukan dengan 6 nilai KA 8; pemilik berkas itu agent `kampus`.
- F6-07 Tidak meniru 514 berkas per kabupaten di `public/`; satu berkas per provinsi atau R2 (batas 200 berkas).
- F6-08 Layar `/siklus/masa-depan`: dua horizon (2030, 2050), pilih skenario, bandingkan ke dasar; rentang antar model.

**Sumber data.** NEX-GDDP-CMIP6, CHIRPS v3, AR6, PSMSL, GHSL, `profil_daerah` (baca), PIPPIB, konsesi.

**Keluaran.** R2 `siklus/saji/masa_depan/*`; layar `/siklus/masa-depan`; rute `/api/siklus/masadepan*`.

**Larangan.** Ramalan kejadian; angka tunggal tanpa rentang model; menyalin NEX-GDDP utuh; mengklaim RTRW tanpa sumber; label selain `hipotesis`.

**Kriteria terima.** Semua kartu berpil `hipotesis`; skenario SSP tampil sebagai rentang; ukuran R2 dalam anggaran G0-03.

## 12. F7: Pintu Tunggal

**Tujuan.** Satu pintu per fase dan per peran di atas semua modul yang ada.

**Kebutuhan fungsional.**

- F7-01 `/siklus` menampilkan siklus (pengurangan risiko, kesiapsiagaan, tanggap darurat, pascabencana) dengan kartu tiap fase menuju layar yang ada dan layar F1 sampai F6; kartu menurut peran yang sedang masuk.
- F7-02 Membungkus `/semua`, `src/mcp.js`, `src/ai.js`; tidak mengganti. Alat MCP publik ditambah hanya yang bersumber dari F1 (ringkasan resmi), tanpa membuka paparan rinci.
- F7-03 Asisten AI hanya memakai alat publik MCP dan angka dari hasil alat (aturan `src/ai.js`); tiap jawaban menyebut label keyakinan.
- F7-04 Pembuka profil wilayah: `ProfilWilayah.buka(kode4)` dari kepala situs bersama.
- F7-05 Tautan `/siklus` di menu utama menunggu U2; bawaan tersembunyi seperti `/bnpb`.
- F7-06 Peringatan fase: kejadian yang `tanggap` menjelang batas PDNA (BNPB: dua minggu sebelum darurat berakhir, BPBD: satu minggu; Perka 15/2011 hal. 16) memunculkan pengingat.

**Sumber data.** Semua keluaran F1 sampai F6, `public/bencana.json`, `src/hak.js`.

**Keluaran.** Layar `/siklus`; tambahan kartu di `public/bnpb/pintu.js` (milik sesi lain, koordinasi).

**Larangan.** Mengganti `/semua`; membuka alat MCP berkunci ke publik; kartu menuju layar yang belum ada.

**Kriteria terima.** Tiap kartu menuju halaman yang hidup; peran WG hanya melihat kartu publik; jawaban AI menyebut sumber alat.

## 13. Gelombang

| Gelombang | Isi | Prasyarat |
| --- | --- | --- |
| G1 | G0 + F1 + F2 | dokumen siap; migrasi `sk_*` oleh warga-api |
| G2 | F3 | G1 (ID kejadian, paparan) |
| G3 | F4 | G1; U4, U8 bawaan |
| G4 | F5 + F6 + F7 | G1 sampai G3 |

## 14. Ketergantungan antarfitur

| Fitur | Bergantung pada | Alasan |
| --- | --- | --- |
| F1 | G0 | riwayat dan registri |
| F2 | G0 | gudang, anggaran, bangunan.yml |
| F3 | F1, F2 | ID kejadian; paparan untuk dampak |
| F4 | F1, F3 | kejadian; perkiraan sebagai pembanding isian |
| F5 | F1, F2, F4 | riwayat, paparan, kebutuhan pemulihan |
| F6 | F2, G0 | paparan dasar, agregat iklim |
| F7 | F1 sampai F6 | pintu |

## 15. Di luar cakupan

- Radar Pemulihan, Kompas Dana dan Bantuan, Aksi Dini Terpicu (KA 2). Tidak dibuat diam-diam sebagai bagian fitur lain.
- Registri pengungsi per orang (dicoret 19 Okt, KA 12); NIK, KK, KTP.
- Mengganti `/semua`, MCP, AI (KA 22); tabel `meja_*` baru; tabel rumah rusak kedua.
- Sumber ReliefWeb (U6), HDX HAPI, lampu malam, SIRS Kemenkes.
- Kenaikan paket Cloudflare (U1), cron Worker baru.
- Fitur yang tidak tertulis di dokumen folder ini (KA 5).

## 16. Pertanyaan terbuka yang berdampak

U1 paket Cloudflare (F2, F6); U2 menu utama (F7); U3 halaman publik (F1); U4 harga satuan (F4); U5 daerah percontohan (F4, F5); U6 appname ReliefWeb (F1); U7 pengesahan draf R3P (F4); U8 tarif stimulan (F4); U9 kebutuhan hunian (F5); U10 taksonomi sektor Jitupasna (F4). Belum ada nomor di KA untuk: ambang Open Buildings, batas kelas InaRISK, model kematian gempa, format nomor induk kejadian (R3 pertanyaan 5 sampai 8); tidak dijawab dengan karangan.
