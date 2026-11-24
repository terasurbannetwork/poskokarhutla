# TIKET: Kedalaman gambut hilang dari InSAR (`IG-*`)

Kerjakan berurutan. Ambil satu tiket, kerjakan hanya cakupannya, buktikan dengan perintah di `RENCANA-UJI.md`. Tiket yang menunggu Q tidak dikerjakan sebelum Q dijawab (bawaan sementara boleh dipakai bila tertulis).
Subagen tidak commit dan tidak push; sesi induk yang melakukannya (AGENTS §9). Pengerja pemilik berkas lewat `node scripts/agents/ilmu.mjs pemilik <berkas>`.

| Tiket | Fitur | Cakupan | Pengerja → pemeriksa | Bukti siap | Menunggu |
| ----- | ----- | ------- | -------------------- | ---------- | -------- |
| IG-00 | Mesin dan pemilik | bagian baru di `AGENTS.md` (§2.45, terpasang 24 Nov 2026) dan peta modul; entri roster untuk `tests/insar-gambut/**` (tanpa pemilik menurut `ilmu.mjs pemilik`); skrip `uji:insar`; `.assetsignore` tidak perlu (tanpa berkas publik) | `mekanik-mesin` → `penulis-gerbang` | `npm run agents:build`, `npm run uji:agen` hijau | – |
| IG-01 | Periksa data dan impor | bingkai LiCSAR Palangka Raya dan pasangan; nama lapisan keluaran LiCSBAS (koherensi, galat loop); apakah `subsiden` bisa diimpor tanpa efek samping; apakah `luas_citra.py` mengekspos piksel topeng | `pipa-data` → `validasi-model` | catatan temuan di `tests/insar-gambut/CATATAN.md` | Q1 |
| IG-02 | Kunci kriteria | RENCANA-UJI §2 dikunci dan di-commit **sebelum** lab | `validasi-model` (pemeriksa bersih) → pemilik | commit dengan tanggal | Q6 |
| IG-03 | Lab C-band | `insar_gambut.py` (fungsi A sampai E, `--uji`) dan satu lab Palangka Raya 2026 | `pipa-data` → `validasi-model` | `--uji` hijau, `hasil_lab.json` | IG-01, IG-02, Q1, Q3 |
| IG-04 | Uji sebab selisih | ALGORITMA F dan G: salah bungkus (ambang dihitung ulang dari panjang gelombang), dekorelasi, oksidasi pasca-api | `pipa-data` → `validasi-model` | tabel uji sebab di `hasil_lab.md` | IG-03 |
| IG-05 | Kandidat L-band | hanya catatan: sumber data, lisensi, cara memproses di luar repo; tidak ada unduhan | `pipa-data` | catatan di `hasil_lab.md` | Q4 |
| IG-06 | Laporan selisih | InSAR lawan literatur dan penjelasannya tertulis (bukti PKH-34) | `pipa-data` → `validasi-model` | `hasil_lab.md` dinilai pemeriksa bersih | IG-04 |
| IG-07 | Jalur kalibrasi bersyarat | hanya bila vonis `selaras`: kunci baru di `kalibrasi.py`, dipakai `pasang_kalibrasi`, berpil hipotesis | `pipa-data` → `validasi-model`, `selera-angka` | `gambut_bara.py` swa-uji, kartu ditinjau lokal | IG-06, Q2, **vonis selaras** |
| IG-08 | Gerbang | `tests/insar-gambut/gerbang.test.mjs` sesuai RENCANA-UJI §5 | `penulis-gerbang` | merah pada pelanggar contoh, hijau pada keadaan asli | IG-03 |
| IG-09 | Periksa manual | pemeriksa bersih menulis ulang vonis | `validasi-model` | `tests/insar-gambut/hasil_manual.md` | IG-06 |

## Urutan usulan

1. IG-00, IG-01 (paralel).
2. IG-02 (kunci), IG-08 (kerangka gerbang).
3. IG-03, IG-04, IG-06.
4. IG-09. IG-05 dan IG-07 hanya bila dibuka.

## Pelajaran yang dibawa

- Jangan percaya angka α atau selisih pembanding; ukur sendiri.
- Jangan menulis 0 untuk yang tak terukur.
- Jangan membuat mesin InSAR kedua; L-band dikerjakan di luar repo.
- Jangan menyetel kriteria sesudah melihat hasil.
- Jangan mengunduh sebelum izin pemilik.
