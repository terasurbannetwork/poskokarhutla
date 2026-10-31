# Uji silang titik panas vs logbook BNPB karhutla 2026

Skrip: `scripts/data/uji_logbook_karhutla.py` (`uji` = swauji; tanpa argumen = jalan sungguhan, ~2,5 menit, FIRMS lokal).
Keluaran: `public/data/validasi_logbook_karhutla.json`. Laporan saja: faktor dan aturan hidup TIDAK diubah.

Bahan: 732 kejadian karhutla logbook Pusdalops (1 Jan-29 Okt 2026) vs titik unik 375 m/hari WIB M+N+N20+N21.
Arsip FIRMS lokal berhenti 12 Okt, jadi 89 kejadian yang jendelanya lewat 11 Okt dibuang; 633 dipakai (16 lagi gugur: tanpa kode kab atau nama kab tak cocok poligon).
Kab dicocokkan lewat nama, jendela cari = mulai-3 .. max(terlihat akhir, surut).

## Hasil
| Uji | Angka |
| --- | --- |
| Deteksi (>=1 titik di kab pada jendela) | 589/633 = 93,0%; >=3 titik 85,9% |
| per kelas ha | <5: 88,2%; 5-50: 97,5%; 50-500: 98,3%; >500: 92,9% |
| provinsi terendah | Kalsel 76,5%, Maluku 78,6%, Aceh 82,4% (>=3 titik hanya 62,7%) |
| Luas: satelit/BPBD, kejadian tunggal, n=440 | median 10,0 (CI95 8,3-12,4), IQR 1,3-35,2; galat log rata-rata 3,0 |
| Luas per kelas ha | <5: 29x; 5-50: 11x; 50-500: 1,2x; >500: 0,02x |
| Luas, kab dengan <=5 titik (n=84) | median 1,66 (CI 1,3-3,1) |
| Durasi: padam kita - surut logbook, n=174 | median +2 hari (CI95 2-3), IQR 1-6; kita lebih lambat di 75% |
| Durasi median | logbook 1 hari, kita 3 hari |
| Kesenjangan: kab-minggu >=30 titik tanpa kejadian logbook | 86,6% (3.188 kab-minggu); terbanyak Kalbar, NTT, Kalteng, Sumsel, Jatim |

## Putusan (jujur)
- **Deteksi: bagus.** 93% kejadian BPBD punya titik di kabnya. Catatan: ini tingkat kab pada jendela ~1 minggu, jadi sebagian kena api lain di kab itu (kab besar). Bukan bukti titik jatuh di api yang sama. Yang lolos (7%) terkonsentrasi di api kecil <5 ha dan Kalsel/Maluku/Aceh.
- **Luas: TIDAK ada faktor kalibrasi yang konsisten.** Rasio bergantung ukuran: api kecil dilebih-lebihkan 29x (titik kab mencampur api lain), api >500 ha dikecilkan 50x (satu titik 375 m/hari tak menangkap kebakaran gambut besar, dan ha BPBD kasar). Median keseluruhan 10x tidak berarti apa-apa; faktor "saran" 0,41 ha/titik di JSON hanya angka mekanis, jangan dipakai. Pencocokan titik ke api individual (jarak ke koordinat kejadian) dibutuhkan, dan logbook tidak punya koordinat.
- **Durasi: kita padam ~2 hari lebih lambat.** Aturan 48 jam menambah 2 hari mekanis, ditambah titik api lain di kab. BPBD menyebut "padam" lebih awal. Selisih ini wajar, bukan galat aturan. Tak ada alasan mengubah 48 jam dari data ini.
- **Celah pelaporan:** ~87% kab-minggu bertitik banyak tidak ada kejadian logbook. Logbook hanya merekam yang dilaporkan BPBD ke Pusdalops, bukan semua karhutla; bukan bukti titik palsu.

## Dilewati / batas
- Tanpa koordinat kejadian: semua pencocokan tingkat kab, bukan per api.
- Arsip FIRMS lokal hanya s.d. 12 Okt; Okt akhir tidak diuji. Kuota FIRMS tidak dipakai.
- Nama provinsi logbook tidak seragam (Kep. Babel vs Kepulauan Bangka Belitung); tidak dibenahi di sini (milik `scripts/umum`).
- 6 kab tak cocok poligon (Kep. Tanimbar, Kep. Sangihe, Pare-pare, Lhokseumawe, Bantaeng, Ponorogo-kota); lihat `kab_tak_cocok_atau_tanpa_titik`.
- Pembanding model-null sudah ada (bagian di bawah); pada angka 93%/94% di atas, baca selalu bersama itu.

## Pembaruan: sumber arsip titik_hari (jalan di CI)
Sumber utama kini `public/data/titik_hari/*` (CSV FIRMS hanya cadangan; bila keduanya tak ada, keluar 0 dan JSON lama dibiarkan). Arsip hanya menyimpan hari >= 1.000 lokasi unik nasional, jadi data per kab lengkap hanya sejak 3 Jul 2026 (`awal_data_lengkap`); kejadian yang jendelanya mulai sebelum itu dibuang. Cutoff = hari arsip terakhir (27 Okt).
Angka (625 kejadian, 3 Jul-27 Okt): deteksi 94,4% (>=3 titik 89,6%); rasio luas median 10,8 (IQR 1,5-37); durasi kita - logbook median +5 hari (CI 4-7, n=212; lebih lebar daripada +2 pada seluruh tahun karena kemarau Okt api gambut bertahan). Kurva harian disimpan di `riwayat` (maks 400).

## Pembanding peluang (null) untuk deteksi
Keberatan: di kemarau hampir tiap kab rawan punya titik dalam seminggu, jadi 94% bisa menggelembung. Diuji dua null, 200 undian per kejadian, seed tetap (20261029), pagar +-14 hari dari kejadian logbook karhutla di kab itu:
- **Null A**: kab sama, jendela digeser ke tanggal acak 3 Jul-27 Okt. 123 kejadian tak punya tanggal yang lolos pagar (kab yang hampir sepanjang periode ada kejadiannya), jadi null A n=484.
- **Null B**: waktu sama, kab acak sewilayah provinsi tanpa kejadian logbook dalam pagar (hanya kab yang punya titik di arsip). n=607.
Selang 95% = bootstrap antar-kab (1.000 ulang). Jendela penuh = [mulai-3, akhir]; ketat = [mulai-1, mulai+1].

| Jendela | Diamati | Null A (lift, selisih) | Null B (lift, selisih) |
| --- | --- | --- | --- |
| Penuh | 93,0% / 94,2% | 85,4%; lift 1,09 (1,04-1,15); +7,6 poin (3,9-11,7) | 82,2%; lift 1,15 (1,11-1,19); +12,0 poin (9,0-14,9) |
| Ketat +-1 hari | 92,4% / 93,2% | 77,2%; lift 1,20 (1,13-1,28); +15,2 poin (10,2-20,3) | 76,6%; lift 1,22 (1,17-1,27); +16,7 poin (13,2-19,7) |

Per kelas ha (jendela penuh, null B): <5 ha lift 1,16; 5-50 1,17; 50-500 1,12; >500 1,10. Null A: 1,10 / 1,10 / 1,03 / 1,09. Jendela ketat: lift 1,17-1,25 di semua kelas. Selang tiap sel ada di JSON (`deteksi.model_null`); `riwayat` membawa `null_A/B`, `lift_A/B`, `ketat_*`.

**Vonis (bahasa biasa):** Dari 94 kejadian dari 100 yang dilaporkan BPBD ada titik panas di kabnya, tetapi kalau kejadiannya kita taruh di minggu acak atau di kab acak yang tidak melapor, 77-85 dari 100 tetap "terdeteksi". Jadi sebagian besar angka 94% adalah kemarau, bukan kecerdasan deteksi; nilai tambah nyatanya sekitar 8-17 poin persen (lift 1,1-1,2), nyata secara statistik tetapi jauh lebih kecil dari kesan 94%. Alat ini sah untuk menyatakan "titik panas tidak meleset dari laporan", bukan untuk menyatakan "titik panas menemukan kejadian yang dilaporkan". Pembuktian per api tetap butuh koordinat kejadian. Catatan: kab yang tak punya titik sama sekali di arsip tidak ikut jadi kandidat null B (cenderung menaikkan null sedikit).

## Arsip 2014-2022 (31 Okt 2026)
`python3 scripts/data/uji_logbook_karhutla.py arsip` -> `public/data/validasi_logbook_karhutla_arsip.json` (2026 tak disentuh). Logbook CSV Pusdalops vs FIRMS lokal/unduhan (MODIS + S-NPP 2014-2018; + NOAA-20 2019+); jendela [mulai-3, terakhir_dicatat]; kab bernol titik tetap dihitung (deteksi 0). 2011-2013 dan 2021 tidak diuji.

| Tahun | n | Deteksi | Null A (kab sama) | Lift A | Null B (kab acak) | Lift B [CI95] |
| --- | --- | --- | --- | --- | --- | --- |
| 2014 | 57 | 68,4% | 41,2% | 1,66 | 73,5% | 0,93 [0,69-1,14] |
| 2015 | 121 | 78,5% | 36,7% | 2,14 | 74,6% | 1,05 [0,92-1,17] |
| 2016 | 52 | 71,2% | 39,4% | 1,81 | 58,2% | 1,22 [0,90-1,58] |
| 2017 | 166 | 80,7% | 26,4% | 3,07 | 69,6% | 1,16 [1,01-1,28] |
| 2018 | 498 | 83,5% | 32,6% | 2,57 | 61,3% | 1,38 [1,27-1,46] |
| 2019 | 749 | 85,0% | 41,8% | 2,04 | 61,6% | 1,38 [1,28-1,46] |
| 2020 | 331 | 84,3% | 38,5% | 2,19 | 56,7% | 1,49 [1,35-1,61] |
| 2022 | 156 | 82,1% | 39,7% | 2,07 | 60,7% | 1,35 [1,16-1,50] |

Baca: waktu (kab sama, hari acak) selalu dikalahkan; terhadap kab acak sewaktu, 2014-2016 TIDAK lebih baik (CI mencakup 1), 2017-2022 lift 1,16-1,49 (2017 tipis). Deteksi mentah bergantung sensor dan musim, bandingkan lift. Tanpa laporan dianggap tanpa api, jadi kedua pembanding konservatif. 2022 hanya 272 hari tercatat. Kab dicocokkan ke poligon sekarang.

## Silang DIBI x logbook
`python3 scripts/data/silang_dibi_logbook.py` -> `public/data/silang_dibi_logbook.json`. DIBI harian hanya Okt 2025-Okt 2026 (tak beririsan), jadi jendela +-3 hari tidak mungkin; dipakai DIBI tahunan per kab x jenis 2015-2022, pencocokan sel (kab, tahun, jenis). Logbook ada di DIBI 79,5%, DIBI ada di logbook 88,8%; gempa terendah (38,6% / 75%). DIBI sebagian besar bersumber laporan Pusdalops: ini kesepakatan dua turunan satu sumber, bukan validasi independen. Kejadian DIBI tak terpetakan ke kab (67-157/tahun) tidak ikut dihitung.
