# Simulasi: apa itu satu kejadian karhutla

Skrip: `analisis/sim_karhutla.py` (memakai `analisis/sim_data.py`). Angka mentah: `analisis/hasil/sim_karhutla.json`. Semua angka di bawah dihitung dari berkas itu; jalankan ulang dengan `python sim_karhutla.py <cache.npz>` (sekitar 3 menit).

## 1. Data

Arsip titik panas berstempel waktu terpanjang di repo yang bisa dipakai utuh adalah gabungan tiga sumber FIRMS VIIRS (S-NPP, NOAA-20, NOAA-21), dibuang kembarannya:

| Kode | Berkas | Isi |
| --- | --- | --- |
| S1 | `data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-22/firms-raw-15-22okt.tar.gz` | NRT per sensor per hari, 15-22 Okt 2026 |
| S2 | `data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-25/firms-7hari-publik-25okt-0721.tar.gz` | 7 hari Asia Tenggara, 17-24 Okt 2026 |
| S3 | `data/laporan-bnpb/generator/cache/raw/VIIRS_*_NRT-<tgl>.csv` | cache generator laporan, 24 Okt-11 Nov 2026 |

- Rentang: 15 Okt 2026 03.19 UTC sampai 11 Nov 2026 18.37 UTC (28 hari kalender UTC).
- 420.428 deteksi VIIRS; 311.804 jatuh di daratan Indonesia (poligon `public/geo/kecamatan`, lewat `scripts/data/wilayah.py`). Keyakinan: 16.316 rendah, 286.354 nominal, 9.134 tinggi.
- Dipakai: nominal dan tinggi saja (seperti kluster sistem, `harian.py`): 295.488 titik, 140.813 piksel 375 m unik (S-NPP 86.651, NOAA-20 106.889, NOAA-21 101.948). MODIS tidak dipakai (piksel 1 km).
- Arsip yang lebih pendek dan hanya dipakai untuk pembanding: `public/data/hotspot.json` (5-12 Okt 2026, 195.254 titik VIIRS nominal/tinggi dalam 7 hari) dan `public/data/kluster.json` (12.683 kluster). `public/data/kluster_hari/*.json` hanya 7 berkas (18-24 Okt) dan `data/beku` hanya manifes, tidak dipakai.
- Cacat yang diketahui: titik per hari turun dari 42.137 (22 Okt) ke sekitar 2.000-5.000 (awal Nov); S-NPP berhenti didistribusikan 1 Nov 2026 13.00 UTC; 22 Okt di S1 parsial (dilengkapi S2); 12 Nov belum ada. Kejadian yang menyentuh 15 Okt terpotong di awal, yang menyentuh 11 Nov terpotong di akhir.

Aturan sistem kita sekarang (`scripts/data/harian.py` baris 36, 283-326, 510-575): DBSCAN Haversine ruang-waktu, `EPS_KM`=1,5 (adaptif: min(1,5, max(0,6, 1,5 x piksel terbesar pasangan)) km), `MIN_PTS`=1, selisih waktu 48 jam, `JENDELA_HARI`=7, `AKTIF_JAM`=72 (`AKTIF_GAMBUT_JAM`=168), VIIRS nominal/tinggi. Titik tunggal tetap kejadian.

## 2. Metode

Kejadian = komponen terhubung (single-linkage, transitif): dua deteksi sekawan bila jarak Haversine <= D km dan selisih waktu <= W jam. Pasangan dicari dengan `scipy.spatial.cKDTree`, komponen dengan `connected_components`.

- Luas = PROKSI: jumlah piksel 375 m unik sepanjang umur kejadian x 14,0625 ha. Ini bukan luas terbakar: satu piksel yang sama berulang dihitung sekali, api kecil di dalam piksel dihitung 14,06 ha, api yang tertutup awan atau asap tidak terlihat.
- Penggabungan: kejadian yang pada 24 jam pertamanya terdiri dari >= 2 kelompok terpisah (aturan D, W yang sama dalam jendela itu). "Bermakna" bila masing-masing >= 3 piksel unik.
- Menyala lagi: ada deteksi lebih awal dalam D km dari kejadian yang awalnya sesudah deteksi itu, dengan selisih waktu > W, jadi dihitung kejadian baru.

## 3. Tabel 9 sel (arsip 15 Okt-11 Nov, 295.488 titik)

| D km | W jam | Kejadian | Titik per kejadian median / p90 | Piksel median / p90 | Durasi > 7 hari (tak sentuh tepi) | Lintas kab / prov | Penggabungan (>=2 kelompok / bermakna) | Menyala lagi (jeda >= 120 j) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0,5 | 6 | 94.091 | 1 / 5 | 1 / 4 | 0 (0) | 511 / 50 | 0 / 0 | 48.991 (5.330) |
| 0,5 | 24 | 61.138 | 1 / 6 | 1 / 4 | 169 (72) | 305 / 36 | 604 / 148 | 18.157 (5.304) |
| 0,5 | 72 | 50.039 | 1 / 6 | 1 / 4 | 739 (366) | 256 / 31 | 875 / 149 | 8.291 (5.406) |
| 1 | 6 | 77.367 | 1 / 7 | 1 / 5 | 0 (0) | 605 / 54 | 0 / 0 | 47.501 (6.605) |
| **1** | **24** | **49.088** | 1 / 7 | 1 / 5 | 193 (88) | 334 / 37 | 328 / 135 | 20.189 (6.575) |
| 1 | 72 | 37.953 | 1 / 8 | 1 / 6 | 860 (439) | 295 / 32 | 553 / 132 | 10.074 (6.642) |
| 2 | 6 | 65.402 | 2 / 8 | 1 / 6 | 0 (0) | 756 / 72 | 0 / 0 | 46.247 (6.801) |
| 2 | 24 | 38.963 | 1 / 8 | 1 / 6 | 213 (109) | 425 / 51 | 302 / 113 | 20.626 (6.683) |
| 2 | 72 | 27.322 | 2 / 10 | 1 / 7 | 960 (462) | 378 / 46 | 514 / 125 | 10.088 (6.626) |

Bacaan:
- Jumlah kejadian berubah 3,4 kali lipat (27.322 sampai 94.091) hanya karena memilih D dan W. Tidak ada angka "benar"; angka bergantung definisi.
- Kejadian dengan W = 6 jam tidak pernah berdurasi > 7 hari dan 52-71% kejadiannya berstatus "menyala lagi" dengan jeda median 23,6 jam: itu artefak jarak antarlintasan satelit (jeda 12-24 jam sering tanpa deteksi di api yang sama), bukan api padam lalu menyala. W minimal praktis >= 24 jam. Jeda median 72,0 jam di W = 24 mencerminkan pengulangan lintasan harian kelipatan 24 jam.
- Median kejadian 1 titik dan 1 piksel di semua sel: 57,4% kejadian sel acuan hanya 1 piksel (28.179 dari 49.088), 52,8% titik tunggal (25.910).
- Kejadian lintas kabupaten hanya 0,68% (334) di sel acuan; lintas provinsi 37. 251 di antaranya <= 20 piksel (garis batas administratif memotong api kecil).
- Penggabungan sungguhan (>= 2 kelompok bermakna di 24 jam pertama) hanya 135 dari 49.088 kejadian (0,28%) di sel acuan; jika kelompok sekecil apa pun dihitung 328 (0,67%).

## 4. Ambang luas (sel acuan D = 1 km, W = 24 jam)

Total proksi 2.192.681 ha dari 49.088 kejadian. Satu piksel = 14,06 ha, jadi **ambang 1 ha dan 10 ha tidak menyaring apa pun** pada proksi ini; ambang efektif: 2 piksel = 28,1 ha, 4 piksel = 56,25 ha (lolos 50 ha), 8 piksel = 112,5 ha (lolos 100 ha).

| Ambang | Kejadian lolos | % kejadian | % total proksi luas tercakup |
| --- | --- | --- | --- |
| 1 ha | 49.088 | 100 | 100 |
| 10 ha | 49.088 | 100 | 100 |
| 50 ha | 7.714 | 15,7 | 62,5 |
| 100 ha | 2.869 | 5,8 | 47,2 |

Ekor panjang: 10 kejadian terbesar menyumbang 4,9% total proksi; 1% kejadian terbesar (490) menyumbang 27,1%. Persentil piksel unik: median 1, p90 5, p95 8, p99 28, p99,9 164; terbesar 1.217, 1.203, 1.200 piksel. 29,2% titik berada di kejadian >= 100 piksel. Pembanding dari `kluster.json` (luas = garis luar organik `garis_api.py`, 5-12 Okt): median 28,1 ha, p90 140,6 ha, p99 956,2 ha; ambang 50 ha meloloskan 3.447 dari 12.683 kluster (27,2%) yang membawa 81,2% total luas, ambang 100 ha meloloskan 1.669 (13,2%) yang membawa 69,2%. Ambang 1 dan 10 ha juga tidak menyaring di sana.

Sensitivitas: bila keyakinan rendah ikut (311.804 titik), kejadian sel acuan menjadi 52.269 (+6,5%) dan yang >= 50 ha 8.238 (+6,8%).

## 5. Kepekaan urutan (sorites/salami), sel acuan

(a) buang kelompok harian (<= 1 km, hari WIB sama) di bawah ambang, lalu gabung antarhari; (b) gabung dulu, lalu buang kejadian di bawah ambang.

| Ambang | Kelompok harian lolos / total 68.272 | (a) kejadian | (b) kejadian | Selisih (a minus b) | Proksi ha (a) | Proksi ha (b) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 ha | 68.272 | 49.088 | 49.088 | 0 | 2.192.681 | 2.192.681 |
| 10 ha | 68.272 | 49.088 | 49.088 | 0 | 2.192.681 | 2.192.681 |
| 28,1 ha | 31.046 | 20.237 | 20.909 | -672 (-3,2%) | 1.732.514 | 1.796.414 |
| 50 ha | 11.907 | 6.771 | 7.714 | -943 (-12,2%) | 1.222.833 | 1.370.334 |
| 100 ha | 4.440 | 2.284 | 2.869 | -585 (-20,4%) | 837.211 | 1.033.791 |

Arah selisih: menyaring harian dulu menghasilkan lebih sedikit kejadian dan lebih sedikit luas, karena kelompok harian kecil yang menjadi jembatan antara dua api besar ikut terbuang dan api yang tumbuh pelan (di bawah ambang tiap hari tetapi di atas ambang bila diakumulasi) hilang. Nilai ini membuktikan hasil bergantung urutan operasi: selisih 12% (50 ha) dan 20% (100 ha). Pada ambang 1 dan 10 ha urutan tidak berpengaruh karena ambangnya tidak aktif.

## 6. Dibanding aturan sistem kita

- Aturan `harian.py` dijalankan pada arsip 15 Okt-11 Nov (tanpa jendela 7 hari): 45.104 kluster, 23.690 titik tunggal, 7.195 kluster >= 50 ha proksi. Sel acuan D=1/W=24 memberi 49.088 kejadian. Sel terdekat dengan aturan sistem (eps adaptif 0,6-1,5 km, 48 jam) adalah antara D=1/W=24 dan D=2/W=72 (38.963 dan 27.322 pada W=24 dan 72).
- Dengan jendela 7 hari berakhir 11 Nov: 6.950 kluster, 2.566 aktif (titik terakhir <= 72 jam). Berkas `public/data/kluster.json` yang sedang tayang adalah snapshot 12 Okt (12.683 kluster); belum ada snapshot 11 Nov di repo.
- Validasi rekonstruksi: aturan yang sama pada `hotspot.json` 5-12 Okt (px diisi 0,4 km karena berkas tidak menyimpan scan/track, batas atas) memberi 23.936 kluster (10.652 aktif <= 72 jam) lawan 12.683 di `kluster.json`. Angka sebenarnya berada di antara dua nilai itu, jadi rekonstruksi masuk akal tetapi tidak persis (filter level 0 titik tunggal, gunung api, dan px sebenarnya tidak direplikasi).
- Berbeda dari simulasi ini, sistem kita membatasi umur kejadian 7 hari lewat jendela dan tidak mengenal durasi > 7 hari; kluster berusia >= 7 hari di `kluster.json` ada 389.

## 7. Contoh nyata (sel D = 1, W = 24; koordinat dibulatkan 2 desimal; tanggal WIB 2026; dipilih dari kejadian yang awalnya tampak sesudah 16 Okt supaya tidak terpotong awal arsip)

- **Menyatu**: 17-26 Okt, Kapuas (Kalimantan Tengah), sekitar -2,49; 114,37 dan -2,41; 114,37: dua kelompok (116 dan 19 piksel) berjarak 8,9 km di 24 jam pertama, akhirnya satu kejadian 690 piksel (proksi 9.703 ha, 4.434 titik). Contoh lain: 18-24 Okt, Muaro Jambi (-1,39; 104,05 dan -1,39; 104,11), 81 dan 15 piksel, akhirnya 479 piksel melebar ke Tanjung Jabung Timur (52 titik). Ada 105 kandidat serupa.
- **Terpecah**: 22-24 Okt, Kapuas, -2,51; 114,57, sebuah kejadian 170 piksel yang di 24 jam terakhir tinggal dua kelompok (87 dan 5 piksel, jarak 4,4 km). Contoh lain: 18-24 Okt, Morowali Utara, kelompok 12 dan 35 piksel berjarak 6,0 km; sebagian titik di Tojo Una-Una dan Poso. Ada 81 kandidat.
- **Berpindah**: kejadian >= 72 jam dan >= 10 piksel, jarak pusat 24 jam pertama ke 24 jam terakhir terbesar hanya 6,8 km (16-24 Okt, Boven Digoel, -6,14; 140,07 ke -6,20; 140,06, 283 piksel) dan 6,4 km (Pasuruan/Malang, -7,75; 112,62 ke -7,78; 112,57). Median 669 kejadian yang dinilai: 1,11 km. Artinya api "berpindah" jauh jarang; pada data ini kejadian menyebar melebar, bukan berpindah.
- **Menyala lagi** (D=1, W=72): 8.933 kejadian punya sedikitnya satu pasangan deteksi berjeda >= 5 hari; 6.642 kejadian (angka tabel) deteksi terdekat sebelumnya berjeda >= 5 hari. Angka yang dipakai naskah: 6.642 (catatan sesi induk, 12 Nov 2026). Contoh: Kotawaringin Barat (-3,31; 111,93), deteksi terakhir 24 Okt, menyala lagi 29 Okt (jeda 120 jam), kejadian kedua 295 piksel; Pulang Pisau (-2,92; 113,93), 15 Okt lalu 26 Okt (251 jam), 232 piksel; Morowali Utara (-1,46; 121,63), 25 Okt lalu 31 Okt (132 jam), 184 piksel.
- **Lintas kabupaten**: terbesar 15-26 Okt (terpotong awal arsip), Seruyan dan Kotawaringin Barat, Kalimantan Tengah, 1.217 piksel (proksi 17.114 ha), 2.741 titik di Seruyan dan 1.129 di Kotawaringin Barat; dua lainnya serupa (Seruyan dan Kotawaringin Barat 1.200 piksel; Seruyan dan Kotawaringin Timur 810 piksel). Jadi satu api diaduk dua bupati, dua BPBD, dua laporan.

## 8. Keterbatasan

- Titik panas bukan api dan bukan luas terbakar: satu piksel 375 m = 14,06 ha tanpa memedulikan luas api sebenarnya; piksel melebar ke tepi sapuan (sampai sekitar 0,7 km, lihat `px`).
- Awan, asap, dan hujan menutupi deteksi; jeda tanpa deteksi belum tentu api padam (terutama gambut membara). Sebaliknya sumber panas non-api (gunung api, kilang, tambang) tidak disaring di simulasi ini; sistem kita menyaring gunung api.
- Keyakinan rendah dibuang di analisis utama (alarm palsu); sensitivitasnya ada di bagian 4.
- Arsip hanya 28 hari dan memuat puncak 22 Okt; musim lain, wilayah gambut kering, dan S-NPP yang berhenti 1 Nov membuat jumlah titik per hari tidak sebanding sepanjang arsip. Kejadian di tepi arsip terpotong; kolom "tak sentuh tepi" memberi pembanding.
- Bukan uji balik lawan kejadian resmi (DIBI, laporan BPBD). Kabupaten diberikan lewat poligon kecamatan yang disederhanakan; titik di garis batas bisa salah kabupaten.
- Hari WIB dipakai untuk kelompok harian; semua selisih waktu dalam jam UTC.
- Pencarian pasangan memakai proyeksi tetap lintang 3 derajat Selatan lalu disaring Haversine; selisih jarak di atas 1,04 kali D tidak dicari (dapat melewatkan pasangan di tepi D pada lintang jauh dari 3 derajat, kesalahan di bawah 2%).
