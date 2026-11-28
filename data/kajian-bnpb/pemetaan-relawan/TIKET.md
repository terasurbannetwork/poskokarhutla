# TIKET: Pemetaan bangunan oleh relawan

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya. Awalan HR (PM sudah dipakai paket pintu masuk).

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| HR-01 | Konstanta `konst.py` = `konst.js` dengan uji identik | kampus | T3 | - |
| HR-02 | Pembaca N_pembanding per kab dalam zona bahaya (pakai ulang `bangunan.py`) | kampus | T1 | HR-01 |
| HR-03 | Uji sambungan ohsome dan jalur baca balik hashtag: kueri nyata, ukur batas laju, putuskan jalur (ohsome, API changeset OSM, atau layanan statistik hashtag), tulis hasil di RISET C | kampus | T11 | - |
| HR-04 | `kelengkapan.py`: N_osm lewat ohsome, rasio, kelas, keluaran agregat | kampus | T1, T2, T8 | HR-02, HR-03 |
| HR-05 | Uji kejujuran manual 10 kab dan kalibrasi ambang (26 Nov 2026: bagian mesin selesai, menunggu periksa pemilik; lihat bagian HR-05 di bawah) | kampus (+ validasi-model) | T10 | HR-04, Q6 |
| HR-06 | Migrasi `pm_proyek`, `pm_gabung`, `pm_riwayat` + cakupan | warga-api (+ migrasi-idempoten) | T6, T7 | - |
| HR-07 | `paket.py`: AOI GeoJSON, instruksi, saran citra, hashtag | kampus | T8 | HR-04, Q4 |
| HR-08 | Rute `src/pemetaan.js` dengan hak staf, pemilik, kampus | warga-api (+ guard-api, security-reviewer) | T4, T5, T12 | HR-06, Q1, Q2 |
| HR-13 | Daftar periksa penyuntingan terorganisir sebelum status `dikirim`: halaman wiki OSM kegiatan, pemberitahuan ke komunitas OSM lokal, hashtag terdaftar; dicentang staf per proyek | kampus + warga-api | T4 (status dikirim ditolak bila daftar belum lengkap) | HR-08 |
| HR-09 | Layar daftar prioritas, paket, proyek terbuka, sumbangan | kampus (+ inp-reviewer, selera-angka) | T9, tinjau lokal | HR-08, HR-04 |
| HR-10 | Keputusan sumber data bila kab memadai (pembanding saja atau beralih) | pemilik, siklus | keputusan tertulis | Q5, HR-05 |
| HR-11 | Workflow `pemetaan.yml` bulanan | mekanik-mesin | workflow lolos dry run | HR-04 |
| HR-12 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | HR-06 |

## HR-05: hasil uji kejujuran T10 (26 Nov 2026)

**Status: menunggu periksa pemilik.** Bagian mesin selesai; kelas manual belum diisi manusia, jadi belum ada vonis. Ambang Q6 tetap HIPOTESIS dan pil "Belum diuji" tetap.

Kriteria dikunci lebih dulu di `RENCANA-UJI.md` bagian "Kriteria T10 terkunci" (sidik SHA-256 `89731d7d…57fa2a5`, dicek `uji_jujur.py`), baru undian dijalankan. Bagian itu harus tetap jadi bagian terakhir RENCANA-UJI, karena sidiknya dihitung sampai akhir berkas.

Mesin: `python3 -I scripts/pemetaan/uji_jujur.py --undi` (benih 20261126). Data OSM ohsome per 27 Jul 2026, pembanding Google Open Buildings v3 keyakinan 0,7 ke atas, zona = seluruh poligon kab (aproksimasi HR-04). Satu kab dilewati karena rasionya null: 9211. Berkas: `uji-jujur/lembar_isian.csv` (untuk pemeriksa, tanpa kelas mesin) dan `uji-jujur/kunci_mesin.json` (kelas mesin, rasio, petak, tautan).

| Kab4 | Kab/kota | Strata | Bangunan OSM | Bangunan Open Buildings | Rasio | Kelas mesin | Rasio di petak 1, 2, 3 |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| 8172 | Kota Tual | perkotaan | 14.192 | 24.187 | 0,59 | tipis | null, 0,61, 0,64 |
| 1971 | Kota Pangkal Pinang | perkotaan | 11.304 | 114.717 | 0,10 | tipis | 0,00, 0,00, 0,69 |
| 7171 | Kota Manado | perkotaan | 106.547 | 180.848 | 0,59 | tipis | 0,54, 0,65, 0,58 |
| 3371 | Kota Magelang | perkotaan | 28.403 | 48.941 | 0,58 | tipis | 0,67, 0,37, 0,86 |
| 1309 | Kab. Kepulauan Mentawai | perdesaan | 25.943 | 29.496 | 0,88 | memadai | null, 0,45, null |
| 7208 | Kab. Parigi Moutong | perdesaan | 159.164 | 240.348 | 0,66 | sedang | 0,47, 1,11, 0,80 |
| 1214 | Kab. Nias Selatan | perdesaan | 21.035 | 66.738 | 0,32 | tipis | null, 0,79, 0,09 |
| 6409 | Kab. Penajam Paser Utara | perdesaan | 20.585 | 79.622 | 0,26 | tipis | null, 0,20, 0,06 |
| 1811 | Kab. Mesuji | campuran | 78.785 | 119.102 | 0,66 | sedang | 0,49, null, 0,93 |
| 3603 | Kab. Tangerang | campuran | 674.690 | 1.093.125 | 0,62 | sedang | 0,81, 0,82, 1,19 |

Rasio petak null berarti pembanding di petak itu kurang dari 100 bangunan, bukan nol. Rasio petak hanya pelengkap (kriteria butir 9), tidak menentukan vonis.

Catatan baca (bukan vonis): tiga dari empat kota jatuh tepat di bawah 0,6 (0,58 sampai 0,59), jadi kelas kota sangat peka terhadap ambang. Mentawai berkelas memadai padahal kepadatan Open Buildings hanya 4,9 bangunan per km persegi; ini bisa berarti pembanding kurang di perdesaan (faktor pengganggu ALGORITMA §2). Petak manual yang akan menjawabnya.

### Yang harus dikerjakan pemilik

1. Buka `uji-jujur/lembar_isian.csv`. Per baris, buka tautan petak 1 (`id_citra` menampilkan bangunan OSM di atas citra Esri, perlu masuk akun OSM; `google_citra` dan `osm` tanpa masuk). Petak = kotak sekitar 1 km di sekitar titik tengah tautan.
2. Perkirakan persen bangunan di citra yang sudah punya poligon OSM, tulis `persen_osm_perkiraan` dan `kelas_manual` (`tipis` di bawah 60 persen, `sedang` 60 sampai 85 persen, `memadai` di atas 85 persen). Petak tak terbaca: pindah ke petak 2 lalu 3 dan tulis nomornya di `petak_dipakai`; bila ketiganya tak terbaca tulis `tak terbaca`.
3. Jangan membuka `kunci_mesin.json` sebelum kesepuluh baris terisi.
4. Jalankan `python3 -I scripts/pemetaan/uji_jujur.py --vonis`. Cocok 7 dari 10 ke atas = `lulus`; di bawahnya = `gagal`, dan ambang baru diuji dengan undian baru (benih 20261127), tidak dengan lembar ini. Vonis diulang pemeriksa bersih `validasi-model` sebelum pil dilepas.
