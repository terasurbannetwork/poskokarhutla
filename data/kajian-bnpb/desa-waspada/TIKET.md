# TIKET: Desa Waspada (`DW-*`)

Kerjakan berurutan. Ambil satu tiket, kerjakan hanya cakupannya, buktikan dengan perintah di `RENCANA-UJI.md`, minta pemilik meninjau tiket layar di `http://localhost:8800/desa-waspada`, baru tiket berikutnya. Tiket yang menunggu Q tidak dikerjakan sebelum Q dijawab (bawaan sementara boleh dipakai bila tertulis).
Subagen tidak commit dan tidak push; sesi induk yang melakukannya (AGENTS §9). Pengerja pemilik berkas lewat `node scripts/agents/ilmu.mjs pemilik <berkas>`.

| Tiket | Fitur | Cakupan | Pengerja → pemeriksa | Bukti siap | Menunggu |
| ----- | ----- | ------- | -------------------- | ---------- | -------- |
| DW-00 | Mesin dan pemilik | bagian §2.43 di `AGENTS.md` **(SELESAI 24 Nov 2026, dibuat bersama paket ini)**; sisa roster **SELESAI 24 Nov 2026** (layar-peta, penulis-gerbang, pipa-data); masih sisa: ~~entri roster~~ untuk `public/desa-waspada/**` dan `tests/desa-waspada/**` (kini tanpa pemilik menurut `ilmu.mjs pemilik`), skrip `uji:desa` di `package.json` dan masuk `npm run uji`; baris `.assetsignore` untuk `data/desa_waspada.json` dan `desa-waspada/` (KEAMANAN §5 butir 4) | `mekanik-mesin` → `penulis-gerbang` | `npm run agents:build`, `npm run uji:agen` hijau | – |
| DW-01 | Pencari desa dipakai ulang | periksa apakah `insiden.py` bisa diimpor tanpa efek samping; bila tidak, pindah kelas `Desa` (dan `pip`, `cincin`, `norm_kab` yang dipakainya) ke `scripts/data/desa_cari.py` dan `insiden.py` mengimpornya; periksa bahwa keluaran `insiden.json` tidak berubah; periksa bentuk kolom `wilayah` `hotspot.json` dan bahwa sumber panas tetap sudah terbuang | `pipa-data` → `validasi-model` | `insiden.py --uji` hijau, `insiden.json` identik untuk masukan sama | – |
| DW-02 | F-5 statik bulanan | `desa_waspada.py statik`: B1 (tahun terbakar per desa dari `riwayat_petak.bin`), C1 (gambut dari `gambut.geojson`, semua desa di kab beririsan), `data/desa_statik.json` (di-commit, bukan cache; ukuran dicatat); **ukur** waktu, memori, jumlah desa, persen petak tanpa desa; periksa lisensi `gambut.geojson` (Q7); langkah di `statis.yml` bila muat | `pipa-data` + `mekanik-mesin` → `validasi-model`, `higiene-repo` | `--uji` bagian statik, ukuran dan waktu tercatat | Q7 (bawaan dipakai) |
| DW-03 | F-3 hindcast (kecuali ambang: kunci di RENCANA-UJI §2; `lulus` hanya sesudah Q2 dijawab) | `desa_waspada.py laju` sesuai ALGORITMA D; kriteria dikunci tertulis di RENCANA-UJI §2 **sebelum** dijalankan; S-NPP 2023, lalu NOAA-20 2023, lalu metode B1 alternatif; catat persen titik dekat batas; hasil beku `scripts/data/desa_waspada_laju.json` dan `tests/desa-waspada/hasil_laju.json` | `pipa-data` → `validasi-model` (pemeriksa bersih) | tiga hasil berdampingan, vonis, Wilson, `n` | Q2, Q3, Q4 (bawaan dipakai), DW-01, DW-02 |
| DW-04 | F-1, F-2 daftar A dan B | fungsi murni A1 sampai B2, `--uji` (RENCANA-UJI §3); fixture meniru bentuk nyata `hotspot.json` (sensor `N`, `N20`, `N21`, `M`; `tgl_wib` `MM-DD`) | `pipa-data` → `validasi-model` | `--uji` hijau | DW-01, DW-02 |
| DW-05 | F-4 dan keluaran | peluang kab/kota (C2), `public/data/desa_waspada.json` sesuai DESAIN-TEKNIS §3, batas ukuran, `terpotong`, langkah di `titik.yml` dengan `::warning`; ukur waktu langkah | `pipa-data` + `mekanik-mesin` → `validasi-model`, `higiene-repo` | berkas contoh dari data produksi, ukuran dan waktu tercatat | DW-03, DW-04 |
| DW-06 | Cadangan peluang FWI sel | **opsional, dibuka hanya bila pemilik meminta peluang lebih halus dari kab/kota**: kolom FWI `ps` per sel 0,5 derajat dari `fwi_ansambel.json` di samping `API.p` | `pipa-data` → `validasi-model` | – | **tidak dikerjakan sebelum diminta** |
| DW-07 | F-6, F-7, F-8 halaman | `public/desa-waspada/**`: kartu A, B, laju, filter, cari, urut, peta mini, ekspor CSV (penetral sel, 16 kolom); sebelum menulis: `modern-web-guidance` dan `bahasa-indonesia-plain` | `layar-peta` → `inp-reviewer`, `selera-angka`, `security-reviewer` | tinjau di lokal, INP < 200 ms (`?perf`), tiga lebar | DW-05, Q8 (bawaan dipakai) |
| DW-08 | F-9 tautan | tautan menu situs ke `/desa-waspada`; tidak ada kartu baru di `index.html` (Q6) | `layar-peta` → `selera-angka` | tautan tayang di lokal | DW-07, **Q1 dijawab untuk dipasang di menu publik** |
| DW-09 | F-10 gerbang | `tests/agen/gerbang-desa-waspada.test.mjs` (RENCANA-UJI §5), daftar `LAYAR` kartu dan tanpa-kesimpulan | `penulis-gerbang` | gerbang merah pada pelanggar contoh, hijau pada keluaran asli | DW-05, DW-07 |
| DW-10 | Periksa manual | 3 desa di 3 provinsi (RENCANA-UJI §4), ditulis pemeriksa bersih | `validasi-model` (konteks bersih) | `tests/desa-waspada/hasil_manual.md` | DW-05 |
| DW-11 | Terbit dan pemantauan | tunggu `terbit.yml` sukses, cek berkas langsung dan `/api/status`; halaman metodologi memuat atribusi pembanding MIT dan sumber poligon | `mekanik-mesin` + `layar-peta` | berkas tayang, ukuran terbit | semua |

## Urutan usulan

1. DW-00, DW-01 (bisa paralel; berkas tidak beririsan).
2. DW-02, lalu DW-04.
3. DW-03 (hindcast dikunci sebelum angka dilihat), lalu DW-05.
4. DW-07 dan DW-09 bersama; DW-10.
5. DW-08 sesudah Q1 dijawab; DW-11.
6. DW-06 hanya bila diminta.

## Pelajaran yang dibawa

- Jangan percaya bahwa laju pembanding berlaku di poligon, sensor, dan sumber riwayat kita; DW-03 adalah syarat tampil angka laju, bukan pelengkap.
- Jangan menulis 0 untuk yang tak terukur atau tak tercakup (gambut, laju, peluang).
- Jangan menyebut peluang kab/kota sebagai peluang desa.
- Jangan menjumlah titik dari dua definisi (VIIRS n/h dan angka utama).
- Jangan menyalahkan desa: tidak ada kata sebab atau pelaku.
