# TIKET: Insiden Kaya (`IK-*`)

Kerjakan berurutan. Ambil satu tiket, kerjakan hanya cakupannya, buktikan dengan perintah di `RENCANA-UJI.md`, minta pemilik meninjau tiket layar di `http://localhost:8800/`, baru tiket berikutnya. Tiket yang menunggu Q tidak dikerjakan sebelum Q dijawab (bawaan sementara boleh dipakai bila tertulis).
Subagen tidak commit dan tidak push; sesi induk yang melakukannya (AGENTS §9). Pengerja pemilik berkas lewat `node scripts/agents/ilmu.mjs pemilik <berkas>`.

| Tiket | Fitur | Cakupan | Pengerja → pemeriksa | Bukti siap | Menunggu |
| ----- | ----- | ------- | -------------------- | ---------- | -------- |
| IK-00 | Mesin dan pemilik | bagian §2.42 di `AGENTS.md` **(SELESAI 24 Nov 2026, dibuat bersama pemeriksaan paket ini)**; sisa: entri roster untuk `tests/insiden/**` dan `public/data/progresi/**` (hasil `ilmu.mjs pemilik`: tanpa pemilik; `progresi.py` dan `paparan_insiden.py` otomatis ikut `scripts/data/**` dan `scripts/umum/**`); skrip `uji:insiden` di `package.json` dan masuk `npm run uji`; titik pasang pop-up insiden ditetapkan (belum ditemukan, RISET §1) | `mekanik-mesin` → `penulis-gerbang` | `npm run agents:build`, `npm run uji:agen` hijau | – |
| IK-01 | F-1 arsip deteksi per insiden | **kode dasar SUDAH ADA** (`scripts/data/arsip_insiden.py`, langkah `titik.yml`, jawaban Q1/K6). Sisa: pemangkasan `SIMPAN_HARI` dan tutup 40 MB; `data/progresi/arsip/` ke `public/.assetsignore`; petak > 20.000 ditandai bukan dibuang diam-diam; pisahkan VIIRS dari MODIS; kasus `--uji` baru; arsip terisi 2 putaran berturut di CI | `pipa-data` + `mekanik-mesin` → `validasi-model`, `higiene-repo` | `--uji` kasus arsip; `.assetsignore` lolos RENCANA-UJI §5 butir 6a | – (Q1 dijawab) |
| IK-02 | F-2, F-3 waktu tiba, permukaan, isokron | fungsi murni A2 sampai A5, penyederhanaan geometri, batas 30 langkah | `pipa-data` → `validasi-model` | `--uji` bagian A2 sampai A5, tolok ukur 20.000 petak | – |
| IK-03 | F-7 uji tahan | A10 pada 10 insiden 2019 dan 2023, kriteria dikunci tertulis dulu, `tests/insiden/hasil_uji.json`, vonis ke keluaran; ditambah 3 insiden musim ini dari arsip `titik_hari` (RENCANA-UJI §2 butir 6) | `pipa-data` → `validasi-model` (pemeriksa bersih) | MAE dan persen ±12/±24 jam tercatat, pembanding tetangga terdekat, kedua kelompok berdampingan | Q2, Q11 (bawaan dipakai) |
| IK-04 | F-4, F-5, F-6 laju, lompatan, titik awal | fungsi murni A6 sampai A8, `resolved:false`, lingkaran galat titik awal | `pipa-data` → `validasi-model` | `--uji` bagian A6 sampai A8; contoh lompatan dan `resolved:false` | Q3 (bawaan dipakai) |
| IK-05 | Keluaran dan workflow progresi | tulis `public/data/progresi/<id>.json` dan `indeks.json`, batas ukuran 150 KB, batas insiden 120, jalur terbit tanpa commit 3 jam sekali yang besar, langkah di `titik.yml` dengan `::warning`; ukur waktu jalan (ADR-1) | `pipa-data` + `mekanik-mesin` → `validasi-model`, `higiene-repo` | berkas contoh dari data nyata, ukuran tercatat | IK-01, IK-02, IK-04 |
| IK-06 | F-8 fungsi murni bangunan 500 m | `paparan_insiden.py` B1 sampai B4, `--uji` | `pipa-umum` → `security-reviewer`, `selera-angka` | `--uji` bagian bangunan | – |
| IK-07 | F-8, F-9 bangunan insiden, keterliputan, periksa manual | langkah di `bangunan.yml` (termasuk `halus_*.json` ke cache grid job harian, ukur cache), `insiden_bangunan.json`, rincian terkunci tidak masuk glob unggah R2, jalur terbit lewat deploy `titik.yml`; periksa manual 3 insiden pada citra, ditulis pemeriksa bersih | `pipa-umum` + `pipa-data` + `mekanik-mesin` → `security-reviewer`, `selera-angka` | tiga insiden dicek manual pada citra, hasil di `tests/insiden/hasil_bangunan_manual.md` | IK-05 (daftar petak), Q6, Q7 (bawaan dipakai) |
| IK-08 | F-12 perluasan grid bangunan | langkah pertama: ukur apa yang sudah ada (`wrangler r2 object list` awalan `bangunan/`, run `bangunan.yml` bulanan terakhir); lalu semua provinsi, prioritas karhutla (Riau, Jambi, Sumatera Selatan, Kalimantan Barat, Kalimantan Tengah) lewat `bangunan.yml` bulanan | `pipa-umum` + `mekanik-mesin` → `higiene-repo` | `cakupan_provinsi` bertambah, `terliput:true` untuk insiden provinsi itu | – (Q5 dijawab K7; pengukuran R2 butuh token pemilik atau run `workflow_dispatch` oleh pemilik) |
| IK-09 | F-10 kartu "Perkembangan api" | kartu `.ex.ex-std`, deret pil hari, tabel, lapisan isokron, titik awal, lompatan; keadaan kosong (ALUR §3); sebelum menulis: `modern-web-guidance` dan `bahasa-indonesia-plain` | `layar-peta` → `inp-reviewer`, `selera-angka` | tinjau `http://localhost:8800/`, INP pil < 200 ms (`?perf`), gerbang kartu | IK-05 |
| IK-10 | F-11 kartu "Bangunan dekat api" | dua angka, luas atap, lingkaran 500 m di sekitar petak segar, "belum tercakup", `title` metodologi dan atribusi | `layar-peta` → `selera-angka`, `security-reviewer` | tinjau di lokal, gerbang kartu | IK-07, Q8 (bawaan dipakai) |
| IK-11 | F-13 gerbang | `tests/agen/gerbang-insiden-kaya.test.mjs` (RENCANA-UJI §5), daftar `LAYAR` kartu dan tanpa-kesimpulan | `penulis-gerbang` | gerbang merah pada pelanggaran contoh, hijau pada keluaran asli | IK-05, IK-07 |
| IK-12 | Terbit dan pemantauan | verifikasi tayang: tunggu `terbit.yml` sukses, cek berkas langsung dan `/api/status`; halaman metodologi memuat atribusi MIT dan CC BY | `mekanik-mesin` + `layar-peta` | berkas tayang, ukuran terbit | semua |
| IK-13 | Tanda lompatan antar-insiden | insiden baru ≤ 10 km dari insiden aktif ditandai "kemungkinan lompatan" | `pipa-data` → `validasi-model` | – | **Q4, tidak dikerjakan sebelum dijawab** |

## Urutan usulan

1. IK-00, lalu IK-01 dan IK-06 (bisa paralel; berkas tidak beririsan).
2. IK-02, IK-04, lalu IK-03 (uji tahan dikunci sebelum angka dilihat).
3. IK-05, IK-07 (angka bangunan di Kalimantan Selatan dulu).
4. IK-09 dan IK-10 (layar).
5. IK-11, IK-12.
6. IK-08 boleh jalan kapan saja sesudah IK-00 (Q5 dijawab); IK-07 untuk provinsi tanpa grid menunggu IK-08 selesai per provinsi. IK-13 hanya sesudah pemilik menjawab Q4.

## Pelajaran yang dibawa

- Jangan percaya bahwa metode terpilih pembanding berlaku di data kita; IK-03 adalah syarat tampil angka, bukan pelengkap.
- Jangan menulis 0 untuk yang tak terukur atau tak tercakup (D6, D13).
- Jangan menjumlah bangunan dari dua sumber atau dua definisi (KEPUTUSAN prinsip 4).
