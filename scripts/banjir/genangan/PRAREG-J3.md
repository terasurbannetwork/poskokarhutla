# Pra-registrasi J3: kalibrasi model genangan Jakarta

Didaftarkan 28 Okt 2026 (pemilik setuju), SEBELUM ada kalibrasi atau skor. Pola kunci dari `pemicu.py` (sha256 + `buka` sekali) dan jangkar commit
dari `prospektif.py`. Mesin: `mesin.mjs` + `public/banjir/sim_genangan.js`. Rancangan: `docs/multi-bencana/RANCANGAN-GENANGAN-JAKARTA.md` §7-§8.

## Keputusan pemilik (28 Okt)
- Pintu air di SEMUA muara alur (sel alur bertetangga laut), tertutup saat muka laut di atas muka air sel; lokasi pintu OSM tidak menentukan.
- Pompa dari OSM (`pompa.json`). Kapasitas bilangan tanpa satuan dibaca L/dtk (ASUMSI, ditandai `satuan_asumsi` di keluaran); teks yang tak terbaca jelas diabaikan.
- J2.5 (alur OSM dibakar ke DEM, tanggul pantai 2,5 m, muara terbuka) adalah bagian mesin yang dikunci.

## Pilihan resolusi dan hujan (berdasar data, bukan selera)
- **dx 100 m** (`--faktor 12`, dx 99,6 m). Diukur 28 Okt: 2020-01, 96 jam, 500 x 388 sel = 182 dtk. 33 m (`--faktor 4`) ~27 kali lebih berat
  (9 kali sel, 3 kali langkah): ~80 menit per run, kalibrasi Kd per kecamatan butuh puluhan run. 33 m dipakai hanya untuk SATU cek sensitivitas pada konfigurasi final.
- **Hujan: ERA5 0,25 derajat per jam (Open-Meteo archive), `--hujan era5`**, satu-satunya sumber untuk semua enam kejadian. Alasan: tersedia utuh untuk semua
  kejadian kalibrasi dan uji tanpa jam kosong (0 null di 5 berkas yang sudah ada); IFS historical forecast kosong 79 jam di awal 2017-01 dan versi modelnya
  berganti 2017-2025 (tak homogen); GSMaP harian gauge hanya Nov-Apr (+25-31 Okt) sehingga TIDAK mencakup 2024-08 dan bukan data jam (disagregasi `gsmap_dis` dibuang).
  ERA5 sama dengan produk pemandu GloFAS (debit hulu) dan sumber `pemicu.py`. Kelemahan diketahui: meremehkan puncak konvektif kota; ditangani satu kenop global (di bawah).
- **Status masukan**: hujan_jam 2017-01, 2018-01, 2020-01, 2021-02 ada; debit hulu (GloFAS) ada untuk keenam kejadian (28 Okt). hujan_jam **2024-08 dan 2025-04 BELUM**:
  kuota harian Open-Meteo habis 28 Okt (`Daily API request limit exceeded`). Panen ulang `python3 scripts/banjir/genangan/hujan_jam.py` sesudah reset (hanya mengambil berkas yang belum ada),
  sebelum `sidik` dijangkar. Hujan dan debit adalah masukan, bukan label; label uji tidak dibaca saat panen (jendela diambil dari `gsmap.py PUNCAK`, tanggal puncak yang sudah tercatat).
- Catatan 2020-01: berkas hujan jam mulai 29 Des 2019, jadi hujan antecedent CN (168 jam) untuk run mulai 30 Des hanya 24 jam (cenderung kering); diterima, dicatat.

## Kejadian (jendela simulasi 96 jam dari 00:00 WIB; mulai = puncak laporan PetaBencana - 2 hari)
| ID | mulai | peran |
| --- | --- | --- |
| 2017-01 (puncak 21 Feb 2017) | 2017-02-19 | kalibrasi |
| 2018-01 (puncak 15 Feb 2018) | 2018-02-13 | kalibrasi |
| 2020-01 (puncak 1 Jan 2020) | 2019-12-30 | kalibrasi |
| 2021-02 (puncak 20 Feb 2021) | 2021-02-18 | pagar validasi: dipakai memutuskan berhenti/menolak kenop, tidak ikut menyetel |
| 2024-08 (puncak 18 Agu 2024) | 2024-08-16 | UJI |
| 2025-04 (puncak 24 Apr 2025) | 2025-04-22 | UJI |

2025-03 BUKAN kejadian uji (puncak laporan 2025 = April: 1.292 laporan vs 231 di Maret); ia tetap ada di berkas panen tetapi `muatLabel` menolaknya.
Tabel yang sama ada di `KEJADIAN_J3` (`mesin.mjs`) dan ikut sidik. Label uji TIDAK dibaca (`muatLabel` melempar) sampai `kunci_j3.py buka`.

## Parameter beku (nilai sekarang; sumber/asumsi di kode)
| Parameter | Nilai | Sumber / asumsi |
| --- | --- | --- |
| dx, hujan, jam | 100 m (`--faktor 12`), ERA5 jam, 96 | di atas |
| ALUR (dalam m, lebar m, Manning n) | river 3/30/0,035; canal 2,5/15/0,035; drain 1/5/0,03; potong_ekstra 3 m | ASUMSI normalisasi Ciliwung/KBB (`mesin.mjs`) |
| TANGGUL_M | 2,5 m MSL | ASUMSI tanggul pantai/NCICD, tak terverifikasi |
| Muka laut | 0,6 m tetap, tunggang pasang 1 m (`--muka 0.6 --rentang 1`) | ASUMSI skenario; BUKAN pasang teramati (rob dilaporkan terpisah) |
| Skala hulu, radius hulu | 1, 10 km | ASUMSI: Q GloFAS di titik snap = seluruh sungai; fraksi DAS tak ada |
| CN | 80 | SCS-CN kondisi II (TR-55), seragam |
| CEKUNGAN_MAKS | 0,5 m | ASUMSI derau DEM (`sim_genangan.js`) |
| Subsidensi | skala 1 | literatur Abidin 2011 / Sidiq 2021, seragam (batas atas) |
| Pintu air / pompa | semua muara / OSM, L/dtk | keputusan pemilik 28 Okt |

Nilai tepatnya ada di blok BEKU di bawah dan di `mesin.mjs`/`sim_genangan.js`; semuanya masuk sidik. Mengubah salah satu = kriteria baru dengan tanggal registrasi baru.

## Kenop bebas (satu-satunya yang boleh disetel, pada kejadian kalibrasi saja)
| Kenop | Rentang (grid, ditulis sebelum run) | Catatan |
| --- | --- | --- |
| Kd per kecamatan (mm/jam, `--kd-kec`) | {2, 3, 5, 8, 12, 20, 30, 40} | 44 kecamatan; penalti MU*abs(ln(Kd/Kd*)) dengan Kd* = Kd seragam terbaik; selang ketidakpastian bootstrap laporan TIDAK dihitung di versi ini |
| `skala_hujan` global (`--skala-hujan`) | {1,0; 1,25; 1,5; 1,75; 2,0} | SATU angka untuk semua kejadian (koreksi bias puncak ERA5), tidak disetel per kejadian |

Kalibrasi memakai 2017-01, 2018-01, 2020-01 saja. Skor 2021-02 hanya menghentikan/menolak. Tidak ada kenop lain; kenop tambahan = kriteria baru.

## Algoritma kalibrasi (`kalibrasi_j3.py`, beku lewat sidik)
Kerugian kecamatan per kejadian = w x ((1 - POD_kec) + LAMBDA x fraksi_basah_kec), w = max(jumlah laporan kecamatan, N_MIN); LAMBDA 1,0, N_MIN 5, MU 0,05. Kecamatan tanpa laporan pada kejadian >= 100 laporan: w = N_MIN dan hanya suku basah.
Pembobotan dan LAMBDA 1,0 membuat Kd ekstrem tidak menang dengan membasahi semua (membasahi seluruh kecamatan berharga 1,0 per bobot, sama dengan melewatkan semua laporan).
Tahap 1: tiap `skala_hujan` pada Kd seragam 12, semua kejadian kalibrasi, skala* = kerugian total terkecil. Tahap 2: tiap Kd seragam pada skala*; Kd* = Kd seragam terbaik; peta per kecamatan = argmin (kerugian kecamatan + MU x abs(ln(Kd/Kd*))).
Peta per kab/kota (5 kenop) = argmin yang sama atas jumlah kecamatan tiap kab/kota (pembanding laporan-saja). Tahap 3: peta kecamatan dan peta kab dijalankan pada kejadian kalibrasi.
**Aturan**: peta Kd per kecamatan dipakai hanya bila (i) kerugian totalnya di kejadian kalibrasi < kerugian Kd seragam DAN (ii) leave-one-event-out menang: Kd dipilih dari dua kejadian, dinilai di kejadian yang disisihkan, jumlah kerugian peta < seragam pada ketiga penyisihan (dijalankan SEBELUM `buka`, dari tabel tahap 2); selain itu model final = Kd seragam (`final` di hasil_j3.json).
**Pagar 2021-02** (dinilai dengan model final; hanya dilaporkan, tidak memilih apa pun): DITOLAK bila POD < 0,40, atau luas basah > 25% luas darat DKI, atau POD tidak melebihi POD InaRISK pada luas basah sama. Ditolak = `ditolak_pagar` true dan `buka` menolak.
Anggaran run = 5E (tahap 1) + 7E (tahap 2) + 2E (tahap 3) + 3 (pagar), E = 3 kejadian = 54 run, ~3 menit tiap run pada 100 m (dicetak sebelum jalan). Cache run terkunci ke sidik dan isi peta Kd.
`hasil_j3.json` memuat `sidik` yang dihasilkannya dan peta Kd (kecamatan dan kab) INLINE; vonis membaca dari sana. `buka` mensyaratkan `hasil.sidik` = sidik sekarang, `j3_sidik.json` di commit jangkar memuat sidik yang sama, dan hash `hasil_j3.json` (skala*, Kd*, peta Kd) tercatat di `j3_sidik.json` (`hasil_sha256`) dan cocok. Label uji hanya terbaca bila sidik di state sama dengan sidik sekarang.

## Pengungkapan (ditetapkan sambil MELIHAT jumlah laporan)
- Frekuensi Spearman 2024-2025 memuat laporan kejadian uji itu sendiri (bukan data independen); ia menguji peringkat ruang, bukan prediksi. Selang bootstrap per hari lebar karena hanya sekitar 8 hari berlaporan per kelompok; vonis memakai batas bawah selang, jadi lebar selang berpihak pada ketat.
- State buka dan vonis (`j3_state.json`) DILACAK git; `buka` dan tiap mode vonis (`vonis`, `sensitivitas`) berjalan SEKALI, penghapusan atau penulisan ulang terlihat di diff. Kalibrasi menolak jalan bila sudah dibuka.
- Jendela simulasi diturunkan dari TANGGAL PUNCAK laporan (hari dengan laporan terbanyak, dihitung dari seluruh PetaBencana 27 Okt 2026, termasuk tahun uji), bukan dari hujan.
- Pilihan 2025-04 (bukan 2025-03) ditetapkan sesudah melihat jumlah laporan per bulan (1.292 vs 231). Pilihan 2024-08 mengikuti puncak 2024.
- Ambang 100 laporan untuk kriteria "kecamatan tanpa laporan" ditetapkan sesudah melihat jumlah laporan per kejadian, dan kejadian kalibrasi/uji dengan < 100 laporan membuat kriteria itu KOSONG; vonis menyatakannya eksplisit dan tidak dianggap lolos.
- Ambang 25% luas basah tidak diubah (keputusan pemilik); presisi (bagian sel basah dengan laporan dalam 300 m) dilaporkan sebagai tambahan, tidak menghakimi.

## Metrik (definisi operasional, BEKU: dipertahankan sebagai pilihan resmi; `skor_j3.py` mengimplementasikannya)
Unit ruang: kecamatan DKI (44, `public/geo/kecamatan/31.json`). Basah: kedalaman maks selama jendela 96 jam >= 10 cm (`ASUMSI.TERGENANG`), dikurangi isi alur
(kedalaman di atas tepi untuk sel alur). Kecamatan basah: >= 5% luas selnya basah (konsisten §5.4).
Laporan: PetaBencana per kejadian = laporan dengan `t` di jendela simulasi (WIB), titik di dalam poligon DKI; laporan di luar poligon DKI DIBUANG (tak masuk
penyebut mana pun); duplikat (t, lon, lat, kedalaman) dibuang. `muatLabel` mengerjakan ini. Laporan ber-kedalaman = `kedalaman_cm` > 0.
1. **POD** = bagian laporan yang punya sel basah dalam radius 300 m (kedalaman maks jendela; tanpa pencocokan jam, karena resolusi hujan 1 jam), digabung atas dua kejadian uji. Selang 95% bootstrap per hari WIB (1.000 ulangan, benih 7).
   Lulus bila POD >= 0,6 DAN batas bawah selang POD > POD pembanding (a) dan (b), pembanding dengan luas basah SAMA dengan model.
2. **Ketajaman**: luas basah model <= 25% luas darat DKI pada tiap kejadian uji; DAN pada kejadian dengan >= 100 laporan di DKI, kecamatan tanpa satu pun laporan yang basah <= 40% dari kecamatan tanpa laporan.
3. **Galat kedalaman**: median |kedalaman model maks dalam 300 m - kedalaman laporan| atas laporan ber-kedalaman (model 0 ikut, galat = laporan) <= 40 cm.
4. **Spearman** >= 0,5: peringkat 44 kecamatan oleh kedalaman puncak p90 model (rata-rata dua kejadian uji) vs jumlah hari ber-laporan per kecamatan 2024-01-01..2025-12-31 (frekuensi teramati 2024-2025; kriteria §7 diuji pada frekuensi, bukan kejadian). Dilaporkan pula vs frekuensi 2017-2023 (tidak menghakimi).
5. **Rob dilaporkan terpisah**: kecamatan pesisir utara dilaporkan dengan dan tanpa laporan di luar hujan (muka laut tetap 0,6 m; bukan model rob). Tidak masuk vonis.
6. **Pembanding (wajib), semuanya pada LUAS BASAH SAMA dengan model per kejadian**: (a) InaRISK bahaya banjir per kecamatan, diurut skor dan ditandai sampai luas darat sama; (b) mesin yang SAMA dengan satu Kd seragam (Kd* dari run kalibrasi yang sama, anggaran run identik) dan skala_hujan sama, ambang kedalaman diatur agar luas basahnya sama dengan model, luas basah aslinya dilaporkan berdampingan. Dilaporkan, tidak menghakimi: (c) Kd per kab/kota (5 kenop), (d) sel darat acak (HAND/ketinggian tidak dipakai di versi ini). Selisih POD dinilai dengan bootstrap berpasangan (hari yang sama), batas bawah > 0 terhadap (a) dan (b).
7. **Hasil dilaporkan pada dx final (100 m)** ditambah satu cek sensitivitas pada 33 m (konfigurasi final, tanpa penyetelan ulang); selisih yang mengubah vonis dilaporkan apa adanya.
Gagal = keluaran tetap tampil berlabel "Eksperimental, tidak lolos uji".

## Aturan buka (satu kali)
1. `python3 scripts/banjir/genangan/kunci_j3.py sidik` mencetak sha256 atas: `mesin.mjs`, `sim_genangan.js`, `kunci_j3.py`, `PRAREG-J3.md` (blok BEKU termasuk), dan skrip penilai, penyetel, dan vonis (`skor_j3.py`, `kalibrasi_j3.py`, `vonis_j3.py`; WAJIB ada sebelum jangkar), skrip panen (`gsmap.py`, `hujan_jam.py`, `petabencana.py`, `debit_hulu.py`, `bersama.py`), dan manifes sha256 MASUKAN data (geometri kecamatan, pompa, InaRISK, hulu, subsidensi, DEM, alur OSM, label PetaBencana, hujan_jam semua kejadian, seri hulu mentah). Masukan yang hilang (hujan_jam 2024-08/2025-04 sebelum panen) membuat `cek`/`buka` menolak.
2. Sesi induk menulis sidik dan commit pendaftaran ke `j3_sidik.json` (`jangkar_commit` seperti `JANGKAR_COMMIT` di `prospektif.py`). `cek` gagal bila ada berkas yang berbeda dari sidik, atau dari versi di commit jangkar.
3. Kalibrasi hanya boleh berjalan bila `cek` hijau. Vonis (`vonis_j3.py`, juga leave-one-event-out dan cek 33 m) berjalan sesudah `buka`. Label kejadian uji tertutup (`muatLabel`).
4. `buka` menolak bila sidik beda, jangkar tak bisa diverifikasi (bukan leluhur HEAD), penilai belum ada, atau sudah pernah dibuka; kalau lolos, menulis `data/raw/banjir/genangan/j3_state.json` dan label uji terbaca SEKALI untuk vonis. Vonis tidak diulang.
5. Mengubah kode, parameter, atau angka kriteria sesudah sidik = kriteria baru, tanggal baru.

## Amandemen
- **28 Okt 2026, 09.15 WIB, sidik 61fe334d8f diganti.** Kalibrasi pertama (jangkar 497c0613) crash di awal tahap 3: `jalankan_mesin` menimpa peta Kd (dict) dengan jalurnya lalu memanggil `.items()`. Tahap 1 dan 2 sudah selesai (36 run kalibrasi); hasil_j3.json tidak ditulis, label uji dan pagar tidak dibaca, `buka` tidak pernah jalan. Perbaikan satu baris di `kalibrasi_j3.py` plus satu uji regresi; logika, parameter, kriteria, dan masukan tidak berubah. Semua 45 run diulang dari nol di bawah sidik baru (cache lama terkunci ke sidik lama dan tidak dipakai).

## Beku
<!-- BEKU:mulai -->
```json
{
 "tanggal_registrasi": "2026-10-28",
 "dx_faktor": 12, "jam": 96, "hujan": "era5", "cn": 80, "muka": 0.6, "rentang": 1, "skala_subsiden": 1, "skala_hulu": 1, "radius_hulu_km": 10, "tanggul_m": 2.5,
 "kd_grid_mm_jam": [2, 3, 5, 8, 12, 20, 30, 40], "skala_hujan_grid": [1.0, 1.25, 1.5, 1.75, 2.0],
 "kalibrasi": ["2017-01", "2018-01", "2020-01"], "pagar": ["2021-02"], "uji": ["2024-08", "2025-04"],
 "ambang_basah_m": 0.10, "radius_laporan_m": 300, "kec_basah_min_frac": 0.05,
 "lulus": {"pod_min": 0.6, "luas_basah_maks": 0.25, "kec_tanpa_laporan_basah_maks": 0.4, "galat_median_maks_cm": 40, "spearman_min": 0.5},
 "bootstrap": {"ulangan": 1000, "benih": 7, "satuan": "hari WIB"},
 "kalibrasi_algo": {"kd_awal": 12, "lambda": 1.0, "mu": 0.05, "n_min": 5, "laporan_banyak": 100},
 "mulai": {"2017-01": "2017-02-19", "2018-01": "2018-02-13", "2020-01": "2019-12-30", "2021-02": "2021-02-18", "2024-08": "2024-08-16", "2025-04": "2025-04-22"},
 "pagar_ambang": {"pod_min": 0.4, "luas_basah_maks": 0.25, "kalahkan_inarisk_luas_sama": true}
}
```
<!-- BEKU:akhir -->
