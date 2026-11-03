# Nowcast banjir Jakarta 1-6 jam: inventaris data (fase 1)

Status 1 Nov 2026: inventaris dan kerangka fitur saja. Belum ada model, ambang, workflow, atau tampilan layar. Protokol: `scripts/banjir/PRAREG-NOWCAST-JKT.md`. Kode: `scripts/banjir/nowcast_jkt.py` (`inventaris`, `tempuh`, `fitur`, `uji`).

Angka di bawah dihitung dengan `python3 scripts/banjir/nowcast_jkt.py inventaris --jaringan --arsip <salinan R2>` dan `tempuh` pada 1 Nov 2026. Label PetaBencana hanya dihitung per bulan. Lokasi dan jam laporan tidak dibaca.

## 1. Sumber per sumber

| Sumber | Yang benar-benar ada | Frekuensi | Latensi nyata | Cakupan | Cap waktu |
| --- | --- | --- | --- | --- | --- |
| TMA SIHKA (PU SDA) | D1 `sihka_baca`, dihapus Worker sesudah 180 hari. Arsip harian `arsip_pos.py` mulai **2026-10-19**. R2 `arsip/pos_sungai/` berisi 19-27 Okt (29-31 Okt belum ada karena `susul --maks 7` masih mengejar). Lokal hanya 19, 20, 31 Okt | dipanen tiap jam (menit 23). Feed membawa bacaan 6 jam ke belakang, jeda median antar bacaan 60 menit | **tidak tercatat**: arsip hanya menyimpan (pos, t, v), tanpa waktu diterima. Bacaan yang datang terlambat lewat raw 6 jam tidak bisa dibedakan | 62 pos di kotak Jabodetabek. Rantai Ciliwung: Katulampa (A) 200 jam, Panus Depok (T) 184 jam, Manggarai (M) **0 bacaan** | t = stempel bacaan sumber (UTC epoch) |
| TMA DSDA DKI | sama (id `d:*`), masuk Worker mulai **2026-10-27** (`sungai_resmi.js`, migrasi 0066) | dipanen tiap jam (menit 38). Status terakhir, stempel tiap jam pas | minimal 38 menit (stempel :00, dipanen :38). Lebih dari itu tidak tercatat | 38 pos, 23 berambang Siaga (a1/a2/a3). Katulampa d:116, Depok d:118, Manggarai d:122 (17 dari 24 jam pada 31 Okt), Karet d:163, Pesanggrahan d:160 | stempel DSDA |
| TMA lebih tua | hanya satu kejadian replay 2-4 Mar 2025 (`hulu_hilir.json`, dari media/BPBD, bukan deret) | - | - | Katulampa, Depok, Manggarai | jam dari teks |
| Peringatan CAP BMKG (nowcast) | D1 `cuaca_arsip` (0021) lewat `GET /api/cuaca/arsip`, mulai **2026-10-19 03.53 UTC**. 1.749 peringatan s.d. 1 Nov, DKI **24** (semuanya "Hujan Lebat dan Petir", Moderate). `peringatan.json` hanya potret harian (tidak berguna untuk 3 jam) | Worker menarik RSS tiap 10 menit | `pertama_dilihat - mulai`: p10 -5, p50 10, p90 20 menit. **Tercatat per baris**, jadi latensi bisa ditegakkan persis | poligon (<= 8 cincin x 12 titik) atau bbox | mulai, selesai, pertama_dilihat |
| GSMaP NRT per jam | `data/banjir/genangan/j4_hujan_jam.jsonl` (ditulis `j4_operasi.py hujan`, hanya dibaca di sini): 30 sel 0,1 derajat, **2026-10-28..31** (4 hari). `m1_hujan.jsonl` hanya total/maks harian | ditarik sekali sehari (06.00 WIB) untuk hari kemarin | klaim JAXA ~4 jam, **belum terukur**. Tidak ada penarikan per jam | kotak Jakarta 30 sel | jam berkas UTC, disimpan per jam WIB |
| GSMaP arsip jam 2017-2025 | **tidak ada**. Hanya harian (`gsmap_harian.json`) dan jam untuk 7 jendela kejadian J1 | - | - | - | - |
| IMERG Early 30 menit (NASA GES DISC, `GPM_3IMERGHHE.07`) | arsip publik sejak **2016-11-01** (daftar folder tanpa login; V07B arsip, V07C operasional), ~7 MB per berkas global; belum diunduh (butuh `EARTHDATA_TOKEN`, ada di Actions) | 30 menit | stempel daftar folder 11-31 Okt 2026 (21 hari): p50 4,45, p99 4,93, maks 6,23 jam; dibekukan 6 jam | global 0,1 derajat; OPeNDAP memotong 7 x 7 sel Jakarta (~1 KB per slot) | akhir slot UTC di nama berkas |
| ERA5 jam (Open-Meteo) | 7 jendela kejadian (`genangan/hujan_jam/`) | jam | **~5 hari**, jadi tidak boleh menjadi fitur nowcast. Hanya untuk diagnosis | 20 titik 0,25 derajat | WIB |
| Pos hujan SIHKA | D1 `hujan_baca`, **disimpan 3 hari** saja (`SIMPAN_HARI = 3`). Tidak ada arsip | panen tiap 10 menit, hanya bacaan terakhir. Separuh bacaan pos 5 menit hilang | ~10 menit | Jawa-Bali | stempel sumber |
| PetaBencana ID-JK | cache 2016-12..**2026-10-10** (`genangan/petabencana/`). Tersaring latihan: `petabencana_banjir.json` (10.402 laporan) | laporan warga | `created_at` = waktu kirim. Arsip API bisa diambil kapan saja | 42 kecamatan daratan lewat `KecDKI` | created_at UTC -> WIB |
| Logbook Pusdalops | `data/pusdalops/logbook_kejadian.csv` | harian | - | **kabupaten/kota, tanggal saja**. Tak berguna untuk tenggang jam | tanggal |

## 2. Daya uji label (hitungan per bulan saja)

PetaBencana tersaring (`petabencana.saring`). Jendela uji J3 dibuang segera sesudah dibaca (`tanpa_j3(jendela_j3())`), bulan 2024-08 dan 2025-04 dibuang utuh, dan laporan sejak jangkar J4 (28 Okt 2026) dibuang. Jumlah laporan per musim Nov-Apr:

| Musim | Laporan | Catatan |
| --- | --- | --- |
| 2016/17 | 2.937 | Feb 2017: 1.798 (Qlue, satu hari 1.057) |
| 2017/18 | 1.004 | |
| 2018/19 | 132 | |
| 2019/20 | 2.100 | Jan-Feb 2020 |
| 2020/21 | 543 | Feb 2021: 437 |
| 2021/22 | 118 | |
| 2022/23 | 128 | |
| 2023/24 | 608 | |
| 2024/25 | 537 | tanpa Apr 2025 (J3) |
| **2025/26** | **52** | Nov 1, Des 14, Jan 17, Feb 4, Mar 12, Apr 4 |

Kesimpulan daya:

- **Uji arsip model lengkap (TMA + CAP): daya nol.** Arsip TMA mulai 19 Okt 2026 dan CAP 19 Okt 2026, semuanya kemarau, dan bulan sesudahnya sudah masuk masa prospektif J4. Tidak ada satu pun musim hujan yang punya TMA jam-jaman dan label sekaligus.
- **Uji arsip hujan saja (Jalur A): bisa, dan arsip MEMUTUSKAN untuk jalur ini** (PRAREG bagian A). Label 2016/17-2025/26 dibagi per musim: latih 6.173, validasi 661, uji 1.290 laporan. Hujannya IMERG Early 30 menit (arsip publik sejak 2016-11-01, latensi dibekukan 6 jam). Vonisnya "batas atas, sebelum prospektif 2026/27" karena arsip V07B dan operasional V07C tidak punya hari tumpang.
- **Prospektif 2026/27: daya kemungkinan tidak cukup.** Bila musim ini seperti 2025/26 (52 laporan), jumlah kecamatan x jendela positif paling banyak 52 dan jauh lebih sedikit sesudah laporan dalam satu jendela dikelompokkan. Hari kejadian independen mungkin di bawah 8. Vonis yang paling mungkin "belum cukup data", kecuali ada sumber label kedua (bagian 5).

## 3. Waktu tempuh hulu-hilir (korelasi silang, tanpa label)

`nowcast_jkt.py tempuh`: korelasi kenaikan 1 jam pos hulu vs pos hilir pada jeda 0-12 jam, satu sumber per pasangan.

| Pasangan | Hasil 19 Okt-1 Nov 2026 | Pembanding |
| --- | --- | --- |
| Katulampa (A) -> Panus Depok (T), SIHKA | puncak jeda **2 jam**, r = 0,17, n = 128 jam berpasangan (jeda lain \|r\| <= 0,10) | `hulu_hilir.json` 1-3 jam (replay Mar 2025) |
| Depok -> Manggarai | tidak bisa: Manggarai SIHKA 0 bacaan, DSDA baru 2 hari (n < 24) | `hulu_hilir.json` 5-9 jam |
| Katulampa -> Manggarai | tidak bisa (sama) | 8-14 jam |

Artinya: sinyalnya lemah karena kemarau (kenaikan kecil, sebagian derau sensor: Depok sekali melompat 53 ke 217 cm). Bila Katulampa-Manggarai memang 8-14 jam, **batas fisik banjir luapan Ciliwung di Jakarta Selatan/Timur jauh di atas 6 jam**: pos hulu memberi tenggang lebih panjang daripada hujan. Untuk genangan lokal (hujan di kota, drainase), batasnya ditentukan latensi hujan (GSMaP ~4 jam, CAP ~10 menit). Hitungan diulang di musim hujan sebelum sidik (PRAREG bagian 4.2).

## 4. Beda dengan yang sudah ada

| | M1 (`tangki.py`, beku s.d. 30 Apr 2027) | J4 (`j4_operasi.py`, beku) | Nowcast bandang | **Pilot ini** |
| --- | --- | --- | --- | --- |
| Unit | kecamatan x hari WIB | sel genangan x jendela 96 jam | kecamatan bahaya bandang x jalan | kecamatan x jam terbit, tenggang 1-6 jam |
| Masukan | GSMaP harian (jumlah jam) | GSMaP harian x bentuk ERA5 | GSMaP NRT jam | TMA pos (lokal + hulu), CAP BMKG, GSMaP NRT jam (bersyarat) |
| Keluaran | ya/tidak per hari | peta kedalaman | fitur saja | peluang terkalibrasi |
| Label | PetaBencana >= 10 cm atau n_musim | PetaBencana 96 jam | DIBI/logbook bandang | PetaBencana tersaring dalam (t, t+L] |

Pilot ini tidak menyunting dan tidak menyalin kode M1/J4. Ia hanya MEMBACA `j4_hujan_jam.jsonl` (keluaran append-only J4, di luar sidik). Labelnya dikumpulkan sendiri dan tidak pernah masuk berkas J4/M1.

## 5. Yang butuh pemilik

Keputusan pemilik 1 Nov 2026: "pakai yang ada". Butir 1, 2, dan 4 di bawah TIDAK dikejar. Jalur A (hujan IMERG di arsip, arsip memutuskan) menggantikannya (PRAREG bagian A). Yang masih terbuka: butir 3, 5 (workflow unduhan IMERG), dan 6.


1. **Sumber label kedua per jam**: data genangan RW BPBD DKI (berjam), laporan JAKI/Qlue, atau log TMC/Posko DSDA. Tanpa salah satunya, prospektif 2026/27 hampir pasti "belum cukup data". Permohonan data yang sama dengan cadangan J4.
2. **Arsip TMA lebih panjang dari BBWS Ciliwung-Cisadane / DSDA** (2017-2025, jam-jaman, minimal Katulampa, Depok, Manggarai, Karet, Pesanggrahan, Angke, Sunter). Hanya ini yang bisa membuat uji arsip model TMA mungkin, dan sekaligus menetapkan waktu tempuh dari puluhan kejadian, bukan satu.
3. **Kolom waktu diterima di `sihka_baca`** (pemilik kode: `warga-api`, migrasi D1 baru). Tanpanya latensi TMA tak bisa dibuktikan dan arsip bisa memuat bacaan yang tiba terlambat.
4. **Radar BMKG mentah (CMAX/QPE Cengkareng) atau GSMaP Now** (jalur FTP belum diketahui, tanya JAXA). Hujan dengan latensi < 1 jam adalah satu-satunya jalan untuk genangan lokal 1-3 jam. Radar butuh perjanjian data BMKG.
5. **Unduhan IMERG Early arsip** 2016-11..2026-04, kotak Jakarta 7 x 7 sel: workflow `nowcast-jkt-imerg.yml` (`mekanik-mesin`) memanggil `nowcast_jkt.py imerg_unduh --bulan YYYY-MM` dengan `EARTHDATA_TOKEN`. Biayanya ~88.800 permintaan dan ~30 jam total; simpanan gzip ~3-5 MB. GSMaP arsip hanya lewat probe (PRAREG A.6).
6. **Penjadwal tiap jam** untuk prospektif sejati (GitHub Actions atau Worker; pemilik `mekanik-mesin` / `warga-api`). Rancangan sekarang memakai putar ulang harian (PRAREG bagian 3.3), bukan terbit langsung.

## 6. Hasil uji jalur A (3 Nov 2026)

Jalur A memakai hujan IMERG Early 30 menit saja (PRAREG-NOWCAST-JKT, amandemen A1). Latih 2016/17-2019/20, validasi 2020/21-2021/22, uji 2022/23-2025/26 dibuka sekali (`nowcast_jkt.py nilai --jalur A`). Model dikunci di origin sebelum uji dibuka (commit abcab4cb); vonis di `scripts/banjir/nowcast_jkt_vonis.json` (commit 19a2354f). Arsip IMERG 60 bulan lengkap per sel (>= 95% slot) sebelum latih; beberapa bulan butuh dua putaran unduh ulang karena batas 40 menit per job.

**Vonis: TIDAK LULUS di semua lead.** Holm 1,0 untuk lead 1, 2, 3, 4, dan 6 jam; `andal_sampai` = 0 jam. Varian tanpa saringan label juga TIDAK LULUS.

| Lead | n kec-slot | Episode | Positif | Brier klimatologi | Brier persistensi | Brier hujan | BSS lawan klimatologi | p lawan persistensi | Kemiringan kalibrasi CI95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 jam | 660.072 | 97 | 589 | 0,000893 | 0,000892 | 0,000892 | +0,0010 | 0,96 | -0,12 s.d. 0,98 |
| 2 jam | 659.904 | 97 | 1.098 | 0,001664 | 0,001662 | 0,001662 | +0,0015 | 0,92 | -0,75 s.d. 0,60 |
| 3 jam | 659.736 | 96 | 1.583 | 0,002399 | 0,002395 | 0,002395 | +0,0016 | 0,60 | -1,13 s.d. 0,30 |
| 4 jam | 659.568 | 96 | 2.049 | 0,003103 | 0,003099 | 0,003099 | +0,0015 | 0,32 | 0,20 s.d. 1,71 |
| 6 jam | 659.232 | 95 | 2.943 | 0,004454 | 0,004447 | 0,004447 | +0,0015 | 0,71 | -0,28 s.d. 0,85 |

BSS lawan klimatologi per musim (lead 3 jam): 2022/23 +0,0017, 2023/24 -0,0014, 2024/25 +0,0043, 2025/26 +0,0129. Di semua lead tiga syarat gagal: p gabungan lawan klimatologi dan persistensi di atas alfa (model tidak mengalahkan persistensi), syarat 3 (CI kemiringan kalibrasi di dalam rentang PRAREG), dan syarat 4 (porsi baris hilang dan selisih hilang positif/negatif dalam batas). Syarat 0 (jumlah episode) lolos.

Tafsir:
- Hujan satelit 30 menit tidak menambah apa pun di atas persistensi ("kalau sekarang banjir, sebentar lagi masih banjir"): Brier model hujan sama dengan persistensi sampai enam desimal. Skor di atas klimatologi berasal dari persistensi, bukan dari hujan.
- Pertanyaan "berapa jam maksimal dengan akurasi 95%": dengan hujan saja, belum ada lead yang andal.
- Sub-sampel V07C (algoritme operasional sejak Mar 2026) hanya 5 episode dan 15 sampai 85 positif; p kecil tetapi n terlalu kecil untuk dipegang. Angka ini batas atas sebelum prospektif 2026/27.

Batasan: label PetaBencana jarang dan runtuh di 2025/26; IMERG Early 0,1 derajat (49 sel) kasar untuk banjir kota yang ditentukan drainase; arsip V07B dipakai untuk latih sedangkan operasional V07C.

Langkah berikut sesuai PRAREG: jalur B (TMA pos sungai + peringatan CAP BMKG) dinilai prospektif mulai musim 2026/27, karena arsip TMA baru ada sejak 19 Okt 2026. Tidak ada layar yang menampilkan nowcast jalur A.
