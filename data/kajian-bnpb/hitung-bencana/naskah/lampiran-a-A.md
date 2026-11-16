# Lampiran A, kelompok A: Identitas kejadian (apa itu "satu" kejadian)

Status: Fase 1, draf untuk dibaca pemilik. Sumber angka dan kutipan: `riset/SIM-KARHUTLA.md`, `riset/SIM-KRITERIA.md`, `riset/REGULASI.md`, `riset/PUSTAKA.md`, `scripts/wa/panduan_resmi.json`, dan satu skrip tambahan `analisis/tambahan_A.py` (keluaran `analisis/hasil/tambahan_A.json`). Semua kutipan Juklak 7/2023 berasal dari salinan PDF UNFPA Indonesia dan masuk daftar periksa sampai salinan resmi diperoleh (Q-02).

## Pengantar kelompok

Delapan belas paradoks di kelompok ini berpangkal pada satu kekosongan. Petunjuk Pelaksanaan (Juklak) Badan Nasional Penanggulangan Bencana (BNPB) Nomor 7 Tahun 2023 menetapkan kapan sesuatu masuk hitungan melalui enam kriteria ambang, tetapi tidak mendefinisikan apa yang dihitung. Kata "kejadian" tidak ada di daftar pengertian Bab I huruf D. Juklak hanya memberi tiga aturan hitung (satu tipe utama, lintas wilayah, dua lokasi satu hari) dan Kode Identitas Bencana (KIB) 16 digit. Api yang menyatu, banjir yang naik lagi, gempa susulan, kekeringan yang berbulan-bulan, kejadian yang melewati pergantian tahun, dan kejadian di laut atau dari luar negeri tidak diatur. Akibatnya jumlah kejadian bergantung pada siapa yang menghitung dan dengan kunci apa. Satu kelompok data bisa menghasilkan 2.809 atau 8.715 kejadian hanya karena deduplication key berbeda (P-38). Kelompok ini menjadi bahan lapisan pertama kerangka kajian, yaitu unit kejadian (L1). Tiga paradoks, yakni P-01 (menyatu), P-38 (tulis ulang harian), dan P-05 (lintas batas), ditandai sebagai paradoks inti karena jawabannya menentukan banyak paradoks di kelompok lain.

Konvensi angka: "sel acuan" berarti jarak penggabungan 1 km dan time window 24 jam pada arsip hotspot satelit VIIRS (Visible Infrared Imaging Radiometer Suite) 15 Oktober sampai 11 November 2026. Luas karhutla dalam simulasi adalah proxy (jumlah piksel unik dikali 14,06 hektare), bukan luas terbakar.

---

### P-01 Menyatu

**Kelompok:** A (paradoks inti). **Bergantung pada:** P-12, P-45, P-60. **Menentukan:** P-02, P-03, P-04, P-13, P-14, P-38, P-43, P-59.

1. **Kasus.** Contoh kajian: api 10 hektare dan 20 hektare berjarak 1 km menyatu beberapa jam kemudian [ILUSTRASI]. Data nyata (`riset/SIM-KARHUTLA.md` bagian 7): di Kapuas, Kalimantan Tengah, 17 sampai 26 Oktober 2026, dua kelompok hotspot (116 dan 19 piksel, berjarak 8,9 km) pada 24 jam pertama akhirnya menjadi satu kejadian 690 piksel (proxy 9.703 hektare, 4.434 titik). Di Muaro Jambi, 18 sampai 24 Oktober, kelompok 81 dan 15 piksel menjadi 479 piksel dan melebar ke Tanjung Jabung Timur.
2. **Mengapa ini paradoks.** Jawaban A: satu kejadian, karena bahan bakar yang bersambung membuat api yang sama ditangani satu front. Jawaban B: dua kejadian, karena dua laporan sudah masuk dan pelapor mencatat luasnya sendiri-sendiri. Luasnya juga ganda: jumlah awal (30 hektare pada contoh) atau luas akhir setelah menyatu. Pada Kapuas, 135 piksel di hari pertama menjadi 690 piksel; area di antara dua api ikut terbakar sehingga jumlah awal selalu terlalu kecil.
3. **Jawaban aturan saat ini.** Juklak tidak mengatur api yang menyatu. Satu-satunya kalimat yang dekat ada di Lampiran I hlm. 20: dampak pada beberapa kecamatan dengan waktu berbeda tetap satu kejadian. Aturan sistem kita (`scripts/data/harian.py`) mengelompokkan hotspot dengan jarak adaptif 0,6 sampai 1,5 km dan selisih waktu 48 jam; titik tunggal tetap kejadian. Panduan Pusdalops 2025 tidak mengatur penggabungan.
4. **Jawaban praktik dunia.** GlobFire menganggap area terbakar yang bersentuhan atau berpotongan sebagai satu kebakaran, terpisah bila selisih waktunya lebih dari 5 hari, dan tidak aktif setelah 16 hari tanpa tambahan (https://www.nature.com/articles/s41597-019-0312-2). FIRED memakai 5 piksel dan 11 hari; kebakaran Rim 2013 (lebih dari 100.000 hektare) menjadi satu kejadian di FIRED tetapi 14 di Global Fire Atlas. Sistem peringatan GDACS (Global Disaster Alert and Coordination System) menilai ambang 5.000 hektare pada perimeter hasil delineasi, jadi penggabungan menentukan lolos atau tidaknya (https://www.gdacs.org/Knowledge/models_wf.aspx). Simpulan pustaka: "satu kebakaran" adalah konstruksi analitik.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Gabung otomatis menurut aturan ruang dan waktu tertulis; luas = luas gabungan akhir, tidak dijumlah | Turun sedikit; luas kejadian besar naik banyak | Stabil selama aturan tidak berubah | Api lintas kabupaten menjadi satu kejadian (P-05) | Memecah laporan tidak menambah jumlah | Rendah bila mesin yang menghitung; Pusdatinkom memeriksa |
| B. Tetap terpisah, diberi tautan "menyatu dengan" | Tertinggi | Mudah bergeser mengikuti kebiasaan lapor | Tiap kabupaten tetap punya kejadiannya | Mendorong laporan terpisah | Sedang; tautan dibuat manual |

6. **Uji empiris.** Memilih jarak dan jendela mengubah jumlah kejadian 3,4 kali lipat, dari 27.322 (2 km, 72 jam) sampai 94.091 (0,5 km, 6 jam). Pada sel acuan (49.088 kejadian), penggabungan sungguhan, yaitu dua kelompok masing-masing sedikitnya 3 piksel di 24 jam pertama, hanya 135 kejadian (0,28 persen); bila kelompok sekecil apa pun dihitung, 328 (0,67 persen). Jadi aturan penggabungan hampir tidak mengubah jumlah, tetapi mengubah luas dan siapa yang melapor. Memilih jarak dan jendela jauh lebih menentukan daripada memutuskan menggabung atau tidak. Pada ambang 1 hektare Juklak, kedua api dalam contoh lolos sendiri-sendiri, sehingga penggabungan baru berarti bila ambang diganti (P-13). Sumber: `analisis/hasil/sim_karhutla.json`, 15 Oktober sampai 11 November 2026.
7. **Rekomendasi sementara.** Pilih opsi A dengan aturan sistem kita, rujuk Q-06 dan Q-08. [BAWAAN SEMENTARA] aturan `harian.py`: jarak gabung 1,5 kali ukuran piksel terbesar pasangan titik, paling kecil 0,6 km dan paling besar 1,5 km, selisih waktu 48 jam, berantai; satu kejadian dibatasi 30 hari, lalu kejadian yang masih aktif dibuka sebagai kejadian baru bertaut. Luas dilaporkan sebagai luas gabungan akhir (gabungan poligon, bukan jumlah luas awal). Mesin menerapkan aturan tertulis ini dengan jejak; penggabungan yang sah tidak dibatalkan, tetapi penggabungan yang terbukti keliru (misalnya deteksi palsu yang menjembatani dua api) dibatalkan dengan jejak. Angka 0,28 persen pada butir 6 dihitung pada sel acuan (1 km, 24 jam), bukan pada aturan ini.

---

### P-02 Terpecah

**Kelompok:** A. **Bergantung pada:** P-01, P-04. **Menentukan:** P-14, P-59.

1. **Kasus.** Dalam arsip satelit 15 Oktober sampai 11 November 2026 (`riset/SIM-KARHUTLA.md` bagian 7), sebuah kejadian di Kapuas, 22 sampai 24 Oktober, berukuran 170 piksel dan pada 24 jam terakhir tinggal dua kelompok (87 dan 5 piksel, berjarak 4,4 km). Contoh lain: Morowali Utara, 18 sampai 24 Oktober, kelompok 12 dan 35 piksel berjarak 6,0 km, sebagian titiknya jatuh di Tojo Una-Una dan Poso. Penyebab terpecahnya (sungai, hujan, sekat bakar) tidak terlihat dari satelit. Contoh kajian, satu api terbelah sungai menjadi tiga kantong, adalah [ILUSTRASI].
2. **Mengapa ini paradoks.** Jawaban A: tetap satu kejadian, karena asalnya sama dan penanganannya satu komando. Jawaban B: tiga kejadian, karena tiap kantong berkembang sendiri, mungkin di kabupaten berbeda, dan bisa padam pada hari berbeda. Aturan penggabungan (P-01) bersifat transitif: api yang bersatu tetap satu, tetapi api yang terbelah tidak otomatis menjadi lebih dari satu.
3. **Jawaban aturan saat ini.** Tidak diatur. Juklak tidak mengatur kapan satu kejadian menjadi beberapa. Pengelompokan hotspot sistem kita hanya menggabung berdasarkan jarak dan waktu, sehingga kantong yang menjauh lebih dari batas jarak otomatis menjadi kluster baru pada hari berikutnya.
4. **Jawaban praktik dunia.** Global Fire Atlas membiarkan api bersebelahan yang selisih tanggalnya melebihi ambang tetap terpisah, dan memindahkan gugus tepi kecil ke api tetangga yang sekurangnya 10 kali lebih besar (https://essd.copernicus.org/articles/11/529/2019/). FIRED menggabung semua perimeter yang tumbuh bersama ke satu identitas pertama. Tidak ada pustaka yang memecah satu kejadian menjadi beberapa hanya karena bentuknya.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Satu kejadian tetap; kantong dicatat sebagai bagian (segmen) dengan luas masing-masing | Tidak bertambah | Stabil | Segmen di kabupaten lain tetap tercatat di kabupaten itu | Tidak ada keuntungan memecah | Sedang; segmen perlu penanda |
| B. Pecah menjadi kejadian baru bila kantong terpisah melewati jarak dan jeda yang ditetapkan, dengan induk-anak | Naik sedikit | Bergeser bila jeda diubah | Kabupaten yang memegang kantong mendapat kejadiannya sendiri | Mendorong pelapor memecah | Tinggi; perlu keputusan tiap pecahan |

6. **Uji empiris.** Kandidat terpecah pada sel acuan berjumlah 81 dari 49.088 kejadian, sekitar 0,17 persen (hitungan kami dari angka `riset/SIM-KARHUTLA.md`). Skala yang kecil ini berarti keputusan P-02 lebih berpengaruh pada api besar daripada pada jumlah nasional. Uji sebenarnya perlu laporan BPBD yang menyebut penyebab pecah; belum ada di repo.
7. **Rekomendasi sementara.** Pilih opsi A: kejadian tidak dipecah karena bentuk; pemecahan hanya bila semua bagian padam penuh lebih dari jeda Q-09. [BAWAAN SEMENTARA] Q-09 (7 hari tanpa laporan aktif).

---

### P-03 Api berpindah (kapal Theseus)

**Kelompok:** A. **Bergantung pada:** P-01, P-04, P-60. **Menentukan:** P-11.

1. **Kasus.** Contoh kajian: api merambat 30 km dalam 2 minggu dan lokasi awalnya sudah padam [ILUSTRASI]. Dalam data nyata, kejadian yang berumur sedikitnya 72 jam dan berukuran sedikitnya 10 piksel paling jauh bergeser 6,8 km antara pusat 24 jam pertama dan 24 jam terakhir (Boven Digoel, 16 sampai 24 Oktober 2026, 283 piksel, dari -6,14; 140,07 ke -6,20; 140,06) dan 6,4 km (Pasuruan dan Malang). Median 669 kejadian yang dinilai: 1,11 km (`riset/SIM-KARHUTLA.md` bagian 7).
2. **Mengapa ini paradoks.** Jawaban A: masih satu kejadian, karena tiap langkah perambatan menyambung ke langkah sebelumnya. Jawaban B: sudah kejadian lain, karena tidak ada satu pun titik awal yang masih menyala, seperti kapal yang semua papannya telah diganti. Aturan penggabungan transitif condong ke A dan dapat merangkai kejadian yang akhirnya sangat jauh dari asalnya.
3. **Jawaban aturan saat ini.** Tidak diatur. Sistem kita membatasi umur kluster dengan jendela 7 hari (`JENDELA_HARI`), sehingga kejadian lebih panjang otomatis terbelah menjadi kluster berurutan; `public/data/kluster.json` masih memuat 389 kluster berusia sedikitnya 7 hari.
4. **Jawaban praktik dunia.** GlobFire menyimpan hubungan ruang-waktu dalam graf dan menganggap satu kebakaran selama masih ada tambahan area terbakar dalam 16 hari. FIRED memilih jendela 11 hari justru supaya kebakaran panjang tidak terpecah (kasus Rim). Global Fire Atlas memakai ambang persistensi 4 sampai 10 hari per sel.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Satu kejadian selama rantai kontinuitas ruang-waktu tidak putus | Paling sedikit | Stabil | Kabupaten yang dilalui api ikut tercatat sebagai bagian | Tidak ada keuntungan memecah | Rendah; segmen wilayah dicatat otomatis |
| B. Umur maksimum kejadian (mis. 7 hari); lewat itu kejadian baru dengan tautan | Lebih banyak pada kejadian panjang | Menggelembung pada musim kemarau panjang | Daerah dengan api panjang tampak punya banyak kejadian | Mendorong penutupan dan pembukaan kejadian berulang | Sedang |

6. **Uji empiris.** Pada sel acuan, kejadian berdurasi lebih dari 7 hari berjumlah 193 (0,39 persen), dan 88 di antaranya tidak menyentuh tepi arsip. Perpindahan jauh nyaris tidak ada di 28 hari data: kejadian menyebar melebar, bukan berpindah. Artinya paradoks ini jarang muncul di data VIIRS, tetapi bergantung pada musim; musim kemarau panjang dan lahan gambut belum diuji karena arsip hanya 28 hari. Perlu arsip satu musim penuh.
7. **Rekomendasi sementara.** Pilih opsi A: perpindahan api tidak memecah kejadian, dan segmen wilayah disimpan lewat daftar wilayah kejadian. Tidak ada jendela umur kluster; yang memutus kejadian hanya jeda tanpa aktivitas dan batas durasi 30 hari per kejadian, sesudahnya kejadian yang masih aktif dibuka sebagai kejadian baru dengan tautan "lanjutan dari" (Q-09, Q-06). Jendela 7 hari pada butir 3 hanya cara sistem kita menandai kluster harian dan tidak dipakai sebagai batas umur kejadian. [BAWAAN SEMENTARA] jeda 7 hari dan batas 30 hari sampai diuji pada musim penuh (Bab 10.4).

---

### P-04 Menyala lagi

**Kelompok:** A. **Bergantung pada:** P-01, P-61. **Menentukan:** P-06, P-08, P-35.

1. **Kasus.** Data nyata, dengan jarak 1 km dan jendela 72 jam serta jeda sedikitnya 5 hari (`riset/SIM-KARHUTLA.md` bagian 7): di Kotawaringin Barat (-3,31; 111,93) deteksi terakhir 24 Oktober 2026 menyala lagi 29 Oktober (jeda 120 jam) dengan 295 piksel; di Pulang Pisau (-2,92; 113,93) deteksi 15 Oktober lalu 26 Oktober (251 jam), 232 piksel; di Morowali Utara (-1,46; 121,63) 25 Oktober lalu 31 Oktober (132 jam), 184 piksel. Jenis lahan di tiga titik itu tidak diperiksa.
2. **Mengapa ini paradoks.** Jawaban A: kejadian yang sama, karena bahan bakar dan titik apinya sama, dan gambut sering membara di bawah permukaan walau satelit tidak melihat. Jawaban B: kejadian baru, karena api permukaan sudah padam dan dinyatakan selesai, dan nyala berikutnya perlu penanganan baru.
3. **Jawaban aturan saat ini.** Tidak diatur. Sistem kita menganggap kluster aktif bila titik terakhirnya paling lama 72 jam (`AKTIF_JAM`) atau 168 jam untuk gambut (`AKTIF_GAMBUT_JAM`); lewat itu nyala di tempat yang sama menjadi kluster baru.
4. **Jawaban praktik dunia.** GlobFire memisahkan area terbakar yang bersentuhan bila selisih waktunya lebih dari 5 hari; FIRED memakai 11 hari; Global Fire Atlas memakai persistensi sampai 10 hari untuk sel yang jarang terbakar dan 4 hari untuk sel yang sering terbakar. Tidak ada pustaka yang secara khusus menangani gambut membara.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Kejadian sama bila nyala berikutnya dalam jeda Q-09 (7 hari; gambut lebih panjang); dicatat sebagai "aktif kembali" | Lebih sedikit | Stabil | Daerah gambut tidak dirugikan jeda pendek | Tidak ada keuntungan membuka kejadian baru | Rendah |
| B. Kejadian baru tiap kali ada jeda, diberi tautan "terkait" | Lebih banyak | Naik bila deteksi satelit terputus awan | Daerah berawan tampak lebih banyak kejadian | Mendorong membuka kejadian baru | Sedang |

6. **Uji empiris.** Pada sel acuan, 20.189 dari 49.088 kejadian (41,1 persen) berstatus "menyala lagi", dan 6.575 di antaranya (13,4 persen) dengan jeda sedikitnya 120 jam. Pada jendela 6 jam, 52 sampai 71 persen kejadian berstatus menyala lagi dengan jeda median 23,6 jam; itu artefak jarak antarlintasan satelit, bukan api padam lalu menyala. Jadi jendela di bawah 24 jam tidak layak dipakai. Pada jarak 1 km dan jendela 72 jam, 6.642 kejadian didahului deteksi terdekat yang berjeda sedikitnya 5 hari (`analisis/hasil/sim_karhutla.json`, kunci `grid_9_sel`). Angka 8.933 di bagian contoh berkas yang sama menghitung kejadian yang punya pasangan berjeda 5 hari atau lebih walaupun ada deteksi lain yang lebih dekat, sehingga lebih longgar; yang dipakai 6.642. Tidak ada data jenis lahan; dibutuhkan peta gambut.
7. **Rekomendasi sementara.** Pilih opsi A; rujuk Q-09. [BAWAAN SEMENTARA] 7 hari tanpa laporan aktif berarti kejadian baru; hari tanpa pengamatan satelit yang layak (tertutup awan atau asap) tidak dihitung dalam 7 hari; jeda yang lebih panjang untuk gambut menunggu uji musim penuh (Bab 10.4).

---

### P-05 Lintas batas

**Kelompok:** A (paradoks inti). **Bergantung pada:** P-12, P-45. **Menentukan:** P-14, P-36, P-48, P-55, P-59.

1. **Kasus.** Gempa Nusa Tenggara Timur 15 Agustus 2026 tercatat di Data dan Informasi Bencana Indonesia (DIBI) pada 11 kabupaten, masing-masing 0,091 kejadian; Manggarai mencatat 62 meninggal dan Nagekeo 20 meninggal, dengan 23.034 dan 51.332 rumah rusak (`riset/SIM-KRITERIA.md` bagian 6, tarikan DIBI 12 November 2026). Di karhutla, satu kejadian di Seruyan dan Kotawaringin Barat (15 sampai 26 Oktober 2026) berukuran 1.217 piksel, dengan 2.741 titik di Seruyan dan 1.129 di Kotawaringin Barat. Banjir satu daerah aliran sungai di tiga kabupaten adalah contoh kajian [ILUSTRASI].
2. **Mengapa ini paradoks.** Jawaban A: satu kejadian, karena pemicunya satu dan peta bahayanya satu. Jawaban B: tiga kejadian, karena tiap bupati menetapkan status, tiap BPBD melapor, dan tiap kabupaten memiliki ambang dan kapasitasnya.
3. **Jawaban aturan saat ini.** Juklak Bab II huruf B angka 4 huruf b: "jumlah kejadian secara nasional dihitung sebagai satu kejadian, pada level provinsi jumlah kejadian dihitung berdasarkan provinsi terdampak, pada level kabupaten/kota ... berdasarkan kabupaten/kota terdampak." Catatan KIB (hlm. 7): kode wilayah mengikuti episentrum; bila episentrum di laut, mengikuti wilayah terdampak terdekat; ditentukan Pusdatinkom lewat verifikasi. Perka 8/2011 Pasal 1 angka 8 (sudah tidak berlaku menurut peta peraturan repo) menghitung satu kejadian bila bencana pada tanggal yang sama melanda lebih dari satu wilayah. Ambang tidak disebut berlaku di tingkat mana.
4. **Jawaban praktik dunia.** EM-DAT memberi satu entri per negara, semuanya terikat satu nomor DisNo, dan ambang dinilai per entri negara (https://doc.emdat.be/docs/data-structure-and-content/emdat-public-table/). Nomor GLIDE memuat kode negara tiga huruf, sehingga cenderung satu nomor per negara; aturan eksplisit untuk lintas negara [BELUM TERVERIFIKASI]. DesInventar mencatat per unit geografis terendah.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Dua angka bernama berbeda: kejadian nasional (satu) dan kejadian-kabupaten (satu per kabupaten terdampak) | Dua deret | Stabil bila tiap deret konsisten | Setiap kabupaten tampak penuh | Tidak ada keuntungan memecah | Sedang; perlu kode kejadian induk |
| B. Hanya kejadian per kabupaten, induk sebagai penanda | Tinggi | Naik bila kejadian lintas wilayah sering | Adil per kabupaten | Netral | Rendah |
| C. Hanya kejadian nasional | Rendah | Stabil | Merugikan kabupaten kecil | Netral | Rendah |

6. **Uji empiris.** Di karhutla, kejadian lintas kabupaten hanya 0,68 persen (334 dari 49.088) di sel acuan; lintas provinsi 37; 251 dari 334 (75 persen) berukuran 20 piksel atau kurang, artinya garis batas administratif memotong api kecil. Di DIBI, 643 baris (4,0 persen) berpecahan (lihat P-48). Ambang diterapkan pada kejadian utuh atau per kabupaten belum diuji karena DIBI tidak punya kolom luas.
7. **Rekomendasi sementara.** Pilih opsi A; rujuk Q-03. [BAWAAN SEMENTARA] dua angka disajikan dengan nama berbeda (jumlah kejadian nasional dan jumlah catatan kabupaten); nomor induk kejadian dibawa oleh semua catatan kabupaten; jumlah kejadian provinsi tidak dijumlah menjadi angka nasional.

---

### P-06 Berulang

**Kelompok:** A. **Bergantung pada:** P-04, P-39. **Menentukan:** P-08, P-35, P-38.

1. **Kasus.** Banjir surut 2 hari lalu naik lagi adalah contoh kajian [ILUSTRASI]. Data nyata dari DIBI 2024 sampai 12 November 2026 (`analisis/tambahan_A.py`): banjir tercatat 4.376 rangkaian hari berurutan pada pasangan kabupaten dan jenis yang sama, dengan 3.902 jeda di antara rangkaian pada kabupaten yang sama; 425 jeda (10,9 persen) hanya 1 atau 2 hari, 1.018 (26,1 persen) sampai 7 hari, dan 1.099 (28,2 persen) 8 sampai 30 hari. Untuk karhutla, 565 dari 2.427 jeda (23,3 persen) hanya 1 atau 2 hari.
2. **Mengapa ini paradoks.** Jawaban A: satu kejadian, karena hujan dan sungai yang sama membawa genangan naik lagi, dan warga yang mengungsi belum pulang. Jawaban B: dua kejadian, karena air sempat surut dan kegiatan kembali, sehingga kenaikan kedua adalah peristiwa baru. Kalau tanggal dipakai sebagai kunci, KIB otomatis berbeda karena tanggal ada di dalam kode.
3. **Jawaban aturan saat ini.** Tidak diatur (`riset/REGULASI.md` bagian 9 butir 10). KIB memuat tanggal kejadian dan satu digit indeks; Panduan Pusdalops menambahkan sufiks -001 (kejadian baru), -002 dan -003 (pengkinian), tetapi tidak menjelaskan kapan pengkinian dan kapan kejadian baru.
4. **Jawaban praktik dunia.** Tidak ada aturan baku untuk banjir yang naik lagi di pustaka yang kami buka. Pembanding terdekat adalah delineasi kebakaran, yang memutus kejadian berdasarkan jeda waktu (5, 11, atau 16 hari; lihat P-01). EM-DAT mencatat tahun mulai dan tahun akhir, dengan hari dan bulan akhir boleh kosong untuk kejadian bertahap.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Satu kejadian bila jeda tidak lebih dari Q-09 (7 hari); gelombang kedua dicatat sebagai fase | Lebih sedikit | Stabil | Daerah rawan banjir musiman tidak digelembungkan | Tidak ada keuntungan membuka kejadian baru | Sedang; fase perlu dicatat |
| B. Kejadian baru tiap hari dengan KIB baru | Paling banyak | Menggelembung pada musim hujan panjang | Daerah dengan banjir berhari-hari tampak banyak kejadian | Mendorong kejadian baru | Rendah |

6. **Uji empiris.** Kunci logbook tanpa tanggal dengan jeda tidak lebih dari 7 hari (V2) menghasilkan 2.809 kejadian Januari sampai Oktober 2026, dibanding 3.860 pada kunci berbasis tanggal (V1), selisih 27,2 persen (`riset/SIM-KRITERIA.md` bagian 4). Banjir dan karhutla di DIBI mencatat tanggal pencatatan, sehingga jeda 1 atau 2 hari bisa berasal dari keterlambatan lapor. Perlu laporan BPBD yang menyebut air surut untuk memastikan.
7. **Rekomendasi sementara.** Pilih opsi A; rujuk Q-09. [BAWAAN SEMENTARA] 7 hari tanpa laporan aktif berarti kejadian baru, dengan batas durasi 30 hari per kejadian; kambuhan sesudah batas itu menjadi kejadian baru bertaut "lanjutan dari".

---

### P-07 Berantai

**Kelompok:** A. **Bergantung pada:** P-09, P-45. **Menentukan:** P-23, P-25, P-50, P-64.

1. **Kasus.** Gempa, tsunami, dan likuifaksi di Palu, 28 September 2018 [BELUM TERVERIFIKASI: tanggal dan rincian bahaya berasal dari pengetahuan umum; sumber primer belum dibuka dan angka korban sengaja tidak dicantumkan]. Contoh yang tercatat di data kita: DIBI 2024 sampai 2026 memuat 47 baris "Banjir dan Tanah Longsor" dan 1 baris "Gempa Bumi dan Tsunami" (`analisis/hasil/tambahan_A.json`).
2. **Mengapa ini paradoks.** Jawaban A: satu kejadian, karena pemicunya satu dan sebabnya berantai. Jawaban B: tiga kejadian, karena tiap bahaya punya mekanisme, daerah paparan, dan penanganan berbeda. Korban juga bermasalah: orang yang tertimbun bangunan akibat gempa dan orang yang terseret tsunami disebabkan oleh bahaya yang berbeda, padahal ditemukan di tempat yang sama.
3. **Jawaban aturan saat ini.** Juklak Bab II huruf B angka 4 huruf a: bila satu kejadian melibatkan lebih dari satu tipe, "ditentukan satu tipe kejadian utama"; contoh di hlm. 19: banjir menyebabkan tanah longsor, jenisnya banjir, namanya "banjir dan tanah longsor". Cara memilih tipe utama tidak diatur. Likuifaksi tidak ada di daftar nama kejadian Panduan Pusdalops untuk gempa bumi (gempa tektonik, gempa vulkanik, gempabumi, runtuhan).
4. **Jawaban praktik dunia.** EM-DAT mencatat satu entri dengan kolom Associated Types; sekitar 15 persen entri punya satu tipe asosiasi dan sekitar 3,5 persen punya dua atau lebih; tsunami adalah subtipe gempa bumi (https://doc.emdat.be/docs/data-structure-and-content/disaster-classification-system/). DesInventar membedakan event dari disaster dan mengakui perangkatnya "still unable to facilitate the grouping" bencana berantai (https://preparecenter.org/wp-content/uploads/2021/04/DesInventar_MethodologicalGuide_8.1.9.pdf). GLIDE memberi satu nomor per kejadian dengan kode jenis dua huruf; aturan berantai [BELUM TERVERIFIKASI] (https://www.glidenumber.net/glide/public/about.jsp). Makalah UNSD mencatat badan nasional lazim melaporkan kaskade sebagai satu kejadian menurut pemicu awal, dan Indonesia memakai kelas khusus gempa-tsunami (https://unstats.un.org/unsd/classifications/ExpertGroup/egm2017/ac340-Bk4.PDF).
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Induk-anak: satu induk, satu anak per bahaya; korban dicatat sekali pada bahaya penyebab langsung | Satu induk, tiga anak | Stabil di induk | Daerah yang terkena bahaya sekunder tetap tercatat | Netral; korban tidak bisa dihitung dua kali | Tinggi; atribusi tiap korban |
| B. Satu tipe utama dengan daftar tipe terkait (cara Juklak dan EM-DAT) | Satu | Stabil | Dampak bahaya sekunder hilang dari statistik per jenis | Netral | Rendah |
| C. Tiga kejadian terpisah | Tiga | Menggelembung | Merata | Mendorong memecah | Rendah, tetapi risiko double counting |

6. **Uji empiris.** Baris DIBI bergabung hanya 48 dari 15.974 (0,30 persen); di logbook Januari sampai Oktober 2026, "banjir dan longsor" 45 kejadian (V1) dari total 3.935. Kasus gempa bumi berantai nyaris tidak ada di data, sehingga tidak ada simulasi; dibutuhkan rangkaian bahaya per kejadian dari BPBD atau laporan Palu.
7. **Rekomendasi sementara.** Pilih opsi A; rujuk Q-10. [BAWAAN SEMENTARA] pohon kejadian: akar dengan anak per bahaya ikutan (anak boleh punya anak); jumlah kejadian menghitung akar, statistik per jenis menghitung tiap simpul; korban dicatat sekali pada bahaya penyebab langsung dan dijumlah sekali di akar; ambang dan kelas dinilai pada akar.

---

### P-08 Susulan

**Kelompok:** A. **Bergantung pada:** P-06, P-07. **Menentukan:** P-35, P-42.

1. **Kasus.** Ratusan gempa susulan mengikuti gempa utama, dan salah satunya kembali merusak rumah yang sudah retak. Repo ini belum memuat katalog gempa untuk membuktikan kasus tertentu; contoh ini [ILUSTRASI]. DIBI 2024 sampai 12 November 2026 memuat 218 baris gempa bumi (kategori: 220), 60 di antaranya dalam 12 bulan terakhir (`riset/SIM-KRITERIA.md` bagian 1.3).
2. **Mengapa ini paradoks.** Jawaban A: bagian dari kejadian induk, karena sumber series breaknya sama, dan menghitung tiap susulan membanjiri statistik. Jawaban B: kejadian baru bila susulan itu sendiri merusak, karena warga, pemerintah, dan penanganannya memperlakukannya sebagai gempa baru, dan dampaknya bisa jauh dari induk.
3. **Jawaban aturan saat ini.** Tidak diatur (`riset/REGULASI.md` bagian 9 butir 10). Juklak hanya menyebut tipe "gempabumi" dan tidak menyebut susulan. Tiga aturan hitungnya (tipe utama, lintas wilayah, dua lokasi satu hari) tidak menjawab.
4. **Jawaban praktik dunia.** EM-DAT mencatat gempa dan dampak turunannya sebagai satu entri (lihat P-07). USGS PAGER menilai satu gempa menurut perkiraan korban dan kerugian (https://earthquake.usgs.gov/data/pager/background.php), sehingga ukurannya tidak mengikuti hitungan susulan. Aturan khusus penggabungan susulan dalam basis data bencana [BELUM TERVERIFIKASI].
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Susulan masuk kejadian induk sebagai episode; dampak tambahan dicatat sebagai pengkinian | Satu | Stabil | Daerah dengan susulan merusak ditangani sebagai satu paket | Netral | Rendah |
| B. Susulan dengan dampak sendiri dan melewati Q-09 atau di luar wilayah dampak induk menjadi kejadian baru, bertaut dengan induk | Lebih banyak | Naik pada tahun rangkaian gempa | Daerah di luar wilayah induk tercatat sendiri | Netral | Sedang |
| C. Tiap gempa yang lolos ambang adalah kejadian | Paling banyak | Menggelembung | Merata | Mendorong pencatatan tiap getaran | Tinggi |

6. **Uji empiris.** Belum ada data. Dibutuhkan katalog gempa Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) atau USGS yang dipasangkan dengan baris DIBI gempa 2024 sampai 2026 untuk menghitung berapa baris yang termasuk rangkaian yang sama.
7. **Rekomendasi sementara.** Pilih gabungan A dan B: susulan di zona yang sama menjadi bagian kejadian induk selama 30 hari, dengan batas 90 hari per kejadian; zona adalah kabupaten yang terdampak gempa utama ditambah kabupaten yang bersinggungan dengannya. Kejadian baru bila gempa yang magnitudonya sama atau lebih besar dari gempa utama menimbulkan dampak yang dapat dipisahkan menurut wilayah, atau pusatnya di luar zona. Rujuk Q-15. [BAWAAN SEMENTARA] 30 hari dengan batas 90 hari; jeda umum Q-09 (7 hari) tidak dipakai untuk gempa karena susulan yang merusak dapat muncul berminggu-minggu.

---

### P-09 Majemuk

**Kelompok:** A. **Bergantung pada:** P-45. **Menentukan:** P-07, P-50.

1. **Kasus.** DIBI 2024 sampai 12 November 2026 memuat 47 baris bernama "Banjir dan Tanah Longsor" dan 43 baris "Banjir Bandang", di samping 4.886 baris "Banjir" dan 1.617 baris "Tanah Longsor" (`analisis/hasil/tambahan_A.json`). Logbook harian Januari sampai Oktober 2026 memuat 45 kejadian "banjir dan longsor" (kunci V1) di samping 801 banjir dan 425 longsor (`riset/SIM-KRITERIA.md`, `analisis/hasil/uji_kunci_logbook.json`).
2. **Mengapa ini paradoks.** Jawaban A: satu kejadian, karena hujan yang sama dan satu keluarga bahaya. Jawaban B: dua kejadian, karena banjir di lembah dan longsor di lereng ditangani tim berbeda dan dampaknya bisa dipisah. Banjir bandang menambah soal: ia aliran air yang membawa material lereng, sehingga sulit diletakkan di jenis banjir atau longsor.
3. **Jawaban aturan saat ini.** Juklak Bab II huruf B angka 4 huruf a: satu tipe kejadian utama, tetapi cara menentukannya tidak diatur. Panduan Pusdalops menempatkan banjir bandang, banjir rob, banjir genangan, dan "banjir dan tanah longsor" sebagai nama kejadian di bawah jenis banjir (kode 101).
4. **Jawaban praktik dunia.** EM-DAT memakai kolom Associated Types di luar pohon hierarki utama; pasangan tersering adalah banjir dengan longsor. Makalah UNSD menyatakan pelaporan pada tingkat "family" umumnya menghilangkan masalah ini karena kaskade sering berada dalam family yang sama (lihat P-07).
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Tipe utama menurut penyebab dampak terbesar, tipe lain dicatat sebagai tipe terkait | Satu | Stabil | Daerah lereng tidak hilang dari statistik longsor bila tipe terkait ikut dihitung | Netral | Rendah |
| B. Tipe utama menurut pemicu awal (hujan menyebabkan banjir) | Satu | Stabil | Longsor yang mematikan tertulis banjir | Mendorong menamai banjir | Rendah |
| C. Dua kejadian di bawah satu induk (induk-anak, Q-10) | Satu induk, dua anak | Stabil di induk | Merata | Netral | Sedang |

6. **Uji empiris.** Bila 45 kejadian banjir-longsor logbook dibagi ke jenis penyusunnya, banjir naik 5,6 persen (801 ke 846) dan longsor 10,6 persen (425 ke 470) pada V1. Pilihan tipe utama menggeser hitungan per jenis, bukan total.
7. **Rekomendasi sementara.** Pilih opsi C untuk kejadian majemuk, mengikuti Q-10, dengan tipe utama induk menurut dampak terbesar, diusulkan Pusdalops dan diputuskan Pusdatinkom (Q-14 dan Q-08). Bahaya berbeda jenis tanpa rantai sebab terdokumentasi menjadi kejadian terpisah. Ukuran "dampak terbesar" (kelas tertinggi menurut Tabel 6.5, lalu meninggal dan hilang terbesar) masih usulan. [BAWAAN SEMENTARA] induk dengan anak per bahaya.

---

### P-10 Lambat

**Kelompok:** A. **Bergantung pada:** P-39, P-61. **Menentukan:** P-11, P-35, P-53.

1. **Kasus.** Kekeringan di DIBI: 269 baris sepanjang 2024 sampai 12 November 2026, menumpuk di Juni sampai September dan pada hari tertentu (11 Juni 2024 enam baris; 28 Juli 2026 empat baris), karena tanggalnya adalah hari pencatatan (`riset/SIM-KRITERIA.md` bagian 6 butir 13). Rangkaian hari berurutan kekeringan di DIBI hanya 266, median 1 hari, paling panjang 2 hari (`analisis/tambahan_A.py`). Di logbook, durasi kejadian kekeringan (kunci V2, 270 kejadian) berkisar median 1 hari, persentil ke-90 16 hari, paling panjang 136 hari.
2. **Mengapa ini paradoks.** Jawaban A: satu kejadian per musim, karena kekeringan tidak punya awal dan akhir yang jelas. Jawaban B: banyak kejadian, tiap kali satu desa melapor kehabisan air, karena pencatatannya berbasis laporan. Kabut asap lebih sulit: ia dampak karhutla yang melewati batas kabupaten, tetapi tidak ada jenis kabut asap di 13 jenis ancaman, dan abrasi berlangsung bertahun-tahun.
3. **Jawaban aturan saat ini.** Tidak diatur. Juklak tidak menyebut tanggal mulai dan selesai bagi kejadian lambat. Panduan Pusdalops memberi nama kejadian kekeringan meteorologis, hidrologis, dan pertanian, tetapi tidak menetapkan kapan mulai dan berakhir.
4. **Jawaban praktik dunia.** WMO (2012) dan Japan Meteorological Agency menandai kekeringan dari Standardized Precipitation Index (SPI) sekitar -1 atau lebih rendah yang berlanjut (https://ds.data.jma.go.jp/gmd/cpd/monitor/climatview/spi_commentary.html). EM-DAT membolehkan hari dan bulan akhir kosong untuk kejadian bertahap. Panduan teknis Sendai memotong atribusi kesehatan kekeringan pada akhir tahun dan 6 bulan setelah keadaan darurat berakhir [BELUM TERVERIFIKASI untuk angka 6 bulan karena dibaca dari ringkasan tabel].
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Satu kejadian per musim per kabupaten; mulai saat laporan pertama atau penetapan status, selesai setelah jeda panjang tanpa laporan | Rendah | Stabil | Kabupaten kecil tidak kalah dari yang banyak melapor | Tidak ada keuntungan melapor berulang | Rendah |
| B. Kejadian per desa atau per laporan | Tinggi | Mengikuti kebiasaan lapor | Merugikan daerah yang lapornya rapi | Mendorong banyak laporan | Tinggi |
| C. Ukuran berbasis indeks (mulai saat SPI melewati ambang) | Rendah | Stabil | Merata, tetapi butuh data curah hujan | Netral | Sedang; butuh pengolah data |

6. **Uji empiris.** Kekeringan lolos hampir seluruhnya lewat K2 (94,6 persen baris, K2 saja pada 122 dari 129 baris dalam 12 bulan; lihat Bab 4.5). Jumlah kekeringan juga bergantung sumber: Koordalops 330, logbook (V1g) 137 (`riset/SIM-KRITERIA.md` bagian 7). Karena angka bergantung sumber, sebagian besar jumlah kekeringan adalah hasil cara mencatat.
7. **Rekomendasi sementara.** Pilih opsi A, dengan opsi C sebagai pengujian silang. Rujuk Q-16. [BAWAAN SEMENTARA] kekeringan: satu kejadian per kabupaten per periode kemarau menurut zona musim BMKG, selesai pada akhir periode itu atau akhir SK status, mana yang lebih akhir; kabut asap: anak dari karhutla sumbernya; abrasi: satu kejadian per tahun kalender. Durasi logbook persentil ke-90 kekeringan 16 hari hanya pembanding.

---

### P-11 Lintas tahun

**Kelompok:** A. **Bergantung pada:** P-10, P-27, P-39. **Menentukan:** P-35, P-46.

1. **Kasus.** Logbook harian 2026 memuat 71 kejadian bertanggal di luar 2026, yaitu kejadian Desember 2025 yang masih dipantau (`riset/SIM-KRITERIA.md` bagian 6 butir 20). Di logbook CSV, 557 baris berbeda tahun antara tanggal kejadian dan tahun terakhir dicatat: banjir 255, cuaca ekstrem 106, longsor 83, kebakaran permukiman 27. Di DIBI 2024 sampai 12 November 2026, hanya dua pasangan 31 Desember dan 1 Januari pada kabupaten dan jenis yang sama (satu banjir, satu longsor), dengan satu contoh banjir di Lombok Tengah, 31 Desember 2024 (`analisis/hasil/tambahan_A.json`).
2. **Mengapa ini paradoks.** Jawaban A: tahun mulai, karena kejadian lahir sekali. Jawaban B: tahun dampak, karena korban dan kerusakan yang jatuh pada tahun berbeda perlu tahun masing-masing agar statistik tahunan benar. Kedua jawaban menggeser rekor tahun, dan keduanya bertabrakan dengan KIB yang membawa tanggal kejadian.
3. **Jawaban aturan saat ini.** Tidak diatur secara khusus. KIB membawa tahun kejadian di digit 8 angka tanggal. Juklak membedakan data dinamis dan data statis, dengan data statis dirilis bulanan, triwulan, semester, dan tahunan (hlm. 3), tanpa menyebut kejadian lintas tahun.
4. **Jawaban praktik dunia.** EM-DAT mencatat tahun mulai dan tahun akhir; hari dan bulan awal terdefinisi untuk kejadian mendadak. Kerangka Sendai melaporkan agregat tahunan per negara dan mewajibkan kriteria tetap sepanjang 2005 sampai 2030 (A/71/644).
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Tahun tanggal mulai; seluruh dampak dilaporkan pada tahun itu, dengan penanda "lintas tahun" | Satu per kejadian | Tahun mulai tampak berat | Daerah banjir Desember menanggung rekor tahun lalu | Netral | Rendah |
| B. Dampak dibagi per tahun menurut tanggal dampak | Satu kejadian, dua tahun dampak | Lebih tepat | Lebih adil, tetapi butuh dampak harian | Netral | Tinggi |
| C. Tahun selesai | Satu per kejadian | Tahun berikutnya menumpuk | Merugikan daerah dengan kejadian akhir tahun | Mendorong menunda penutupan | Rendah |

6. **Uji empiris.** Jumlah lintas tahun di DIBI hampir nol karena DIBI mencatat satu baris per hari dan tidak menautkan hari, jadi DIBI tidak dapat mengukur paradoks ini (P-39). Logbook lebih berguna: 71 kejadian menggeser total 2026 sekitar 1,9 persen (71 dari 3.827 berkas). Tanggal dibaca dari cap waktu tanpa koreksi zona, sehingga pergeseran satu hari di sekitar 31 Desember mungkin terjadi (daftar periksa).
7. **Rekomendasi sementara.** Pilih opsi A; rujuk Q-13 dan Q-07. [BAWAAN SEMENTARA] tahun tanggal mulai, dampak dilaporkan pada tahun itu dengan penanda lintas tahun; angka statis dibekukan per rilis.

---

### P-12 Titik lawan wilayah

**Kelompok:** A. **Bergantung pada:** P-45, P-60. **Menentukan:** P-05, P-55, P-56.

1. **Kasus.** Kejadian karhutla terbesar dalam arsip satelit 15 Oktober sampai 11 November 2026 berukuran 1.217 piksel, tersebar di Seruyan dan Kotawaringin Barat (`riset/SIM-KARHUTLA.md` bagian 7). KIB hanya memuat satu kabupaten, yaitu episentrum. Di logbook CSV, 1.481 baris (2,6 persen) memuat lebih dari satu kabupaten, paling banyak 35 kabupaten dalam satu baris, dan 2.395 baris tidak mengisi kabupaten (`riset/SIM-KRITERIA.md` bagian 5).
2. **Mengapa ini paradoks.** Jawaban A: satu titik cukup, karena titik memudahkan penomoran, pemetaan, dan pencocokan data. Jawaban B: wilayah harus dicatat, karena kejadian bukan titik, dan titik di tepi kabupaten salah menyatakan siapa yang terdampak.
3. **Jawaban aturan saat ini.** Juklak mencatat lokasi sampai kelurahan atau desa dan "letak geografis" di formulir (hlm. 11). KIB memuat satu kode kabupaten menurut episentrum; bila laut, menurut wilayah terdampak terdekat (Catatan hlm. 7). Juklak tidak memuat kolom luas khusus karhutla dan tidak menjelaskan identitas kabupaten terdampak selain episentrum (`riset/REGULASI.md` bagian 9 butir 12).
4. **Jawaban praktik dunia.** GDACS menilai karhutla pada perimeter kebakaran individual. GlobFire dan FIRED menyimpan poligon. EM-DAT menyimpan entri per negara. DesInventar memilih resolusi seragam pada unit geografis terendah.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Poligon atau perimeter, titik perwakilan, dan daftar wilayah terdampak | Tidak berubah | Stabil | Semua wilayah terdampak tercatat | Netral | Sedang; butuh pengukuran atau citra |
| B. Titik episentrum dan daftar kabupaten | Tidak berubah | Stabil | Kabupaten tepi tercatat, luas tidak | Netral | Rendah |
| C. Hanya titik | Tidak berubah | Stabil | Kabupaten di luar titik tidak terlihat | Netral | Rendah |

6. **Uji empiris.** Kejadian lintas kabupaten 334 dari 49.088 (0,68 persen) di sel acuan, dan 251 dari 334 (75 persen) berukuran 20 piksel atau kurang, artinya batas administratif memotong api kecil. Pembanding luas lain: kluster sistem kita (`public/data/kluster.json`, 5 sampai 12 Oktober 2026) memiliki median 28,1 hektare dan persentil ke-90 140,6 hektare dari garis luar organik. Kabupaten diberikan lewat poligon kecamatan yang disederhanakan, sehingga titik di garis batas bisa salah kabupaten.
7. **Rekomendasi sementara.** Pilih opsi A untuk kejadian berluas dan opsi B bila poligon tidak tersedia. Satu kejadian punya satu titik perwakilan, daftar kabupaten, dan sumber luas (P-60). [BAWAAN SEMENTARA] opsi B sampai Q-08 dijawab.

---

### P-38 Tulis ulang harian

**Kelompok:** A (paradoks inti). **Bergantung pada:** P-39, P-45, P-59. **Menentukan:** P-27, P-35, P-41, P-61.

1. **Kasus.** Logbook harian Pusdalops menulis ulang kejadian yang sama setiap hari dengan "Update". Pengurai kita (`data/laporan-bnpb/bulanan/2026-10/logbook_okt.py`) menetapkan kunci kejadian (kelompok jenis, provinsi, kabupaten, tanggal kejadian) dan mengambil nilai terbesar lintas hari; aturan ini sendiri adalah objek kajian. Dari 9.329 baris harian mentah 1 Januari sampai 29 Oktober 2026 muncul 3.935 kejadian, 1.349 di antaranya tampil di dua hari laporan atau lebih (`analisis/hasil/uji_kunci_logbook.json`).
2. **Mengapa ini paradoks.** Jawaban A: kunci berbasis tanggal kejadian, karena identitas kejadian lahir bersama hari mulainya. Jawaban B: kunci tanpa tanggal tetapi dengan jeda, karena 36,9 persen kejadian multi-hari (464 dari 1.256) ditulis dengan lebih dari satu tanggal kejadian, sehingga kunci tanggal memecah satu kejadian menjadi beberapa.
3. **Jawaban aturan saat ini.** Juklak tidak mengatur deduplication harian. Panduan Pusdalops mengatur sufiks KIB (-001 kejadian baru, -002 dan -003 pengkinian), tetapi arsip logbook diurai dari teks sehingga kunci diperkirakan, bukan dibaca dari KIB (pemakaian sufiks di arsip tidak diperiksa).
4. **Jawaban praktik dunia.** EM-DAT memakai satu nomor DisNo per kejadian dan tiap negara satu entri. GLIDE memakai satu nomor per kejadian. Identitas diberikan satu kali oleh pencatat, bukan disimpulkan belakangan.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Identitas eksplisit: KIB dan sufiks diusulkan Pusdalops pada laporan pertama, disahkan Pusdatinkom, dan dibawa pada pengkinian | Tepat, stabil | Stabil | Merata | Tidak ada keuntungan menulis ulang | Tinggi di awal, rendah sesudahnya |
| B. Kunci berbasis tanggal (V1 atau V1g) | Tinggi | Bergeser bila tanggal ditulis berbeda | Daerah dengan tanggal berubah dihitung dua kali | Mendorong mengubah tanggal | Rendah |
| C. Kunci tanpa tanggal dengan jeda 7 hari (V2) | Rendah | Stabil | Menyatukan kejadian berulang (P-06) | Netral | Rendah |

6. **Uji empiris.** Kejadian Januari sampai Oktober 2026 menurut varian kunci: V1 (jenis, provinsi, kabupaten, tanggal) 3.860; V1g (V1 dengan penggabungan kabupaten beririsan, sama dengan `logbook_2026.json`) 3.756; V2 (jenis, provinsi, kabupaten, jeda tidak lebih dari 7 hari) 2.809; V3 (jenis, provinsi, tanggal, tanpa kabupaten) 2.913; V4 (tanpa deduplication) 8.715. Selisih V1 dengan V2 27,2 persen; V4 adalah 2,3 kali V1. Aturan angka: dampak dengan aturan jumlah melipatgandakan 8 sampai 30 kali (meninggal 20,6 kali, jiwa 8,5 kali, rumah 29,6 kali) karena logbook menulis angka kumulatif. Terakhir lebih rendah dari terbesar 7 persen (meninggal), 7 persen (jiwa), dan 63 persen (rumah). Sumber: `riset/SIM-KRITERIA.md` bagian 4, logbook DOCX 302 hari.
7. **Rekomendasi sementara.** Pilih opsi A sebagai tujuan; sampai berjalan, pakai V1g (kunci jenis, provinsi, kabupaten, tanggal dengan penggabungan kabupaten beririsan) sebagai kunci data lama dan jelaskan batasnya. Aturan angka mengikuti Q-07: meninggal dan kerusakan memakai nominal terakhir; hilang, luka, terdampak, dan mengungsi memakai nominal terbesar selama masa kejadian; meninggal dan hilang untuk kelas dihitung sebagai nilai terbesar jumlah keduanya per laporan; menjumlah angka antarhari dilarang. Rujuk juga Q-08: Pusdatinkom sebagai walidata memutuskan identitas kejadian dan menerbitkan nomor induk, sedangkan Pusdalops dan BPBD mengusulkan. [BAWAAN SEMENTARA] aturan angka Q-07 di atas.

---

### P-39 Tanggal kejadian lawan tanggal laporan

**Kelompok:** A. **Bergantung pada:** P-27, P-59. **Menentukan:** P-11, P-35, P-38, P-46.

1. **Kasus.** Dari 3.935 kejadian logbook DOCX 2026 (kunci V1), selisih antara tanggal kejadian dan tanggal pertama dilaporkan memiliki median 1 hari dan persentil ke-90 3 hari; 7,8 persen lebih dari 3 hari dan 5,9 persen berbeda bulan; persentil ke-99 adalah 80 hari. Ada 29 kejadian dengan tanggal kejadian setelah tanggal laporan dan 46 dengan tahun di luar 2026 atau Desember 2025, umumnya salah ketik. Di logbook CSV, 885 baris bertanggal kejadian setelah pertama dicatat dan 659 tanggal tidak sah, 644 di antaranya kosong (`riset/SIM-KRITERIA.md` bagian 4 dan 5).
2. **Mengapa ini paradoks.** Jawaban A: tanggal kejadian, karena fisiknya terjadi saat itu dan bulan bencana harus sesuai. Jawaban B: tanggal laporan pertama, karena tidak pernah berubah dan bulan yang sudah dirilis tidak bergeser. Memakai A berarti bulan yang sudah terbit bisa bertambah kejadian; memakai B berarti kejadian akhir bulan tampak jatuh di bulan berikutnya.
3. **Jawaban aturan saat ini.** Juklak mensyaratkan waktu kejadian pada KIB (delapan angka tanggal) dan membedakan data dinamis (minimal sekali sehari) dan data statis (periode yang "telah ditentukan"), tetapi tidak menyatakan mekanisme koreksi atau pembekuan (hlm. 3 sampai 4). Panduan Pusdalops menetapkan jendela pantau 07.00 WIB hari H-1 sampai 07.00 WIB hari H, jadi kejadian pukul 22.00 pada tanggal 4 muncul di laporan tanggal 5 menurut rancangan.
4. **Jawaban praktik dunia.** EM-DAT memakai tahun mulai dan tahun akhir dengan hari dan bulan awal yang terdefinisi untuk kejadian mendadak. Kerangka Sendai mensyaratkan metadata yang konsisten bila metodologi berubah. Aturan EM-DAT tentang pelaporan terlambat tidak ditemukan [BELUM TERVERIFIKASI].
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Tanggal kejadian (waktu setempat) untuk hitung; tanggal laporan sebagai metadata; rilis ulang diberi nomor versi | Tepat per bulan | Bulan lama bisa naik sekitar 6 persen | Daerah terpencil yang melapor terlambat tidak dirugikan | Mendorong tanggal diisi benar | Sedang; versi perlu dikelola |
| B. Tanggal laporan pertama | Stabil per rilis | Bergeser sedikit tiap bulan | Daerah terpencil tampak bergeser ke bulan berikutnya | Mendorong tanggal laporan dimajukan | Rendah |

6. **Uji empiris.** Dengan opsi A, sekitar 5,9 persen kejadian berbeda bulan antara tanggal kejadian dan tanggal laporan pertama, artinya tiap bulan yang sudah terbit dapat bertambah sekitar satu dari 17 kejadian setelah rilis. Satu kejadian menurut satuan WIB atau UTC pun berpindah hari (simulasi satelit memakai hari WIB; selisih waktu dalam jam UTC).
7. **Rekomendasi sementara.** Pilih opsi A dengan nomor versi pada tiap rilis statis; rujuk Q-07 dan Q-13. [BAWAAN SEMENTARA] tanggal kejadian untuk hitungan, tanggal laporan sebagai metadata, angka statis dibekukan per rilis.

---

### P-48 Pecahan kejadian

**Kelompok:** A. **Bergantung pada:** P-05, P-45. **Menentukan:** P-14, P-33, P-36, P-37.

1. **Kasus.** DIBI mencatat `jumlah_kejadian` pecahan pada 643 dari 15.974 baris (4,03 persen) tarikan 12 November 2026: 0,5 pada 379 baris, 0,333 pada 99, 0,25 pada 45, 0,091 pada 22. Contoh: banjir Brebes 26 Februari 2024, dua baris masing-masing 0,5 kejadian dengan 56.399 dan 31.380 terdampak; banjir Bogor 3 Maret 2025, 0,5 kejadian, 1 meninggal, 29.555 terdampak; banjir Jembrana 10 September 2025, 0,25 kejadian, 61.610 terdampak; gempa Bandung 18 September 2024, 0,167 kejadian, 56.489 terdampak; gempa NTT 15 Agustus 2026, 0,091 kejadian per kabupaten. Sebaliknya 556 baris memuat jumlah kejadian sedikitnya 2 (`analisis/hasil/anomali_dibi.json`).
2. **Mengapa ini paradoks.** Jawaban A: pecahan, karena satu kejadian harus berjumlah satu secara nasional. Jawaban B: satu per kabupaten, karena tiap kabupaten mengalami kejadian penuh dan BPBD-nya menangani sendiri.
3. **Jawaban aturan saat ini.** Juklak: kejadian lintas wilayah dihitung satu secara nasional, satu per provinsi terdampak, dan satu per kabupaten terdampak; Lampiran I hlm. 20 memberi contoh gempa yang berdampak empat kabupaten, "dihitung satu kejadian tiap kabupaten". Pecahan tidak ada dalam Juklak. Kolom `jumlah_kejadian` DIBI membagi satu kejadian menurut kabupaten; arti resmi kolom ini belum dikonfirmasi (Lampiran E.4 butir 1). Perka 8/2011 menghitung satu kejadian bila tanggal sama dan lebih dari satu wilayah.
4. **Jawaban praktik dunia.** EM-DAT mempertahankan satu nomor DisNo dengan entri per negara, tanpa pecahan. Pecahan bukan praktik yang kami temukan di pustaka.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Satu per kabupaten (nilai 1) dan kode kejadian induk; jumlah nasional dihitung dari kode induk unik | Dua deret bernama | Stabil | Kabupaten dengan kerusakan berat tampak penuh | Tidak ada keuntungan memecah | Sedang; induk perlu dikelola |
| B. Pertahankan pecahan | Satu deret, kecil per kabupaten | Stabil di nasional | Kabupaten besar tampak kecil (0,091) | Netral | Rendah |

6. **Uji empiris.** Kelompok baris pecahan dengan hari, provinsi, jenis, dan nilai yang sama berjumlah 286; pada 220 di antaranya (77 persen) jumlah kabupaten dikali nilai pecahan sama dengan satu, sehingga pecahan tampaknya pembagian satu kejadian ke kabupaten dalam provinsi yang sama (`analisis/tambahan_A.py`; dugaan ini perlu dikonfirmasi ke Pusdatinkom). Sebanyak 82 baris pecahan memiliki meninggal atau terdampak sedikitnya 1.000. Bila peringkat kabupaten memakai `jumlah_kejadian`, gempa NTT hampir tidak tampak (0,091), sedangkan bila memakai baris, 11.
7. **Rekomendasi sementara.** Pilih opsi A; rujuk Q-03. [BAWAAN SEMENTARA] dua angka disajikan dengan nama berbeda, pecahan tidak dipakai sebagai satuan penyajian.

---

### P-50 Jenis gabungan

**Kelompok:** A. **Bergantung pada:** P-07, P-09. **Menentukan:** P-35, P-36.

1. **Kasus.** Kolom `jenis_bencana` DIBI memuat 34 label berbeda untuk 13 jenis ancaman, termasuk "Banjir dan Tanah Longsor" (47 baris), "Banjir Bandang" (43), "Banjir Rob" (27), "Banjir Genangan" (24), "Angin Kencang" (341), "Puting Beliung" (75), "Angin Topan" (23), "Gempa Bumi dan Tsunami" (1), dan "Tsunami" (2). Kolom `kategori_bencana` merapikannya menjadi 14 kategori: "Banjir dan Tanah Longsor" masuk Banjir, "Gempa Bumi dan Tsunami" masuk Gempabumi, tetapi "Tsunami" berdiri sendiri (2 baris). Logbook harian menulis "banjir dan longsor" sebagai jenis tersendiri (45 kejadian), sementara Koordalops memisahkan kekeringan (330 kejadian) (`analisis/hasil/tambahan_A.json`, `riset/SIM-KRITERIA.md` bagian 7).
2. **Mengapa ini paradoks.** Jawaban A: jenis gabungan masuk jenis tersendiri, karena kejadiannya memang gabungan. Jawaban B: jenis gabungan dipecah ke jenis dasar, supaya jumlah per jenis dapat dibandingkan lintas sumber. Hitungan per jenis akhirnya bergantung pada sumber, bukan pada bahayanya.
3. **Jawaban aturan saat ini.** Juklak: satu tipe utama, jenis banjir dan nama kejadian "banjir dan tanah longsor" (hlm. 19). Kode ganda 202 untuk dua jenis berbeda di Lampiran I hlm. 19 dan perbedaan kode Lampiran II hlm. 34 juga memperumit (`riset/REGULASI.md` bagian 1.5).
4. **Jawaban praktik dunia.** EM-DAT memisahkan tipe utama dan Associated Types, dan sejak September 2023 membuang grup "Complex" (14 entri) (lihat P-07). Makalah UNSD menyatakan Indonesia memakai kelas khusus gempa-tsunami.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Dua kolom baku: jenis (kode 3 digit, 13 jenis) dan nama kejadian (daftar tertutup) | Tidak berubah | Stabil | Merata | Netral | Rendah; daftar tertutup |
| B. Jenis gabungan sebagai jenis tersendiri | Berubah per jenis | Bergeser bila daftar diperluas | Daerah dengan banyak gabungan tampak berbeda | Mendorong menamai gabungan | Rendah |

6. **Uji empiris.** Bila logbook memecah 45 kejadian banjir-longsor ke jenis dasar, banjir naik 5,6 persen dan longsor 10,6 persen (V1, Januari sampai Oktober 2026). DIBI kategori Banjir menyerap 47 baris gabungan tetapi memisahkan 2 baris Tsunami, jadi perlakuannya tidak seragam.
7. **Rekomendasi sementara.** Pilih opsi A: jenis dari 13 kode baku, nama kejadian dari daftar tertutup, dan jenis terkait di kolom terpisah; satu kejadian punya satu jenis utama dan daftar jenis termuat (Q-10, Q-14). [BAWAAN SEMENTARA] opsi A.

---

### P-56 Kejadian tanpa wilayah darat

**Kelompok:** A. **Bergantung pada:** P-05, P-12. **Menentukan:** P-18, P-36.

1. **Kasus.** Gelombang tinggi yang menenggelamkan kapal, kapal tenggelam, dan gempa dengan episentrum di laut (contoh kajian) [ILUSTRASI]. Data DIBI 2024 sampai 12 November 2026 memuat 111 baris kategori Gelombang pasang dan abrasi, 220 baris gempa bumi, dan 2 baris tsunami (`analisis/hasil/tambahan_A.json`). Logbook CSV memuat kategori kecelakaan (2 kejadian pada 2011, 7 pada 2012, 83 pada 2013). Proporsi gempa dengan episentrum di laut tidak dapat dihitung dari data repo.
2. **Mengapa ini paradoks.** Jawaban A: dicatat di kabupaten terdekat atau tempat korban didaratkan, karena KIB wajib punya kode kabupaten. Jawaban B: tidak bisa dicatat di darat, karena tidak ada kabupaten tempat kejadian, dan menetapkan satu kabupaten secara paksa merugikan kabupaten itu dalam statistik.
3. **Jawaban aturan saat ini.** Juklak Catatan KIB (hlm. 7): bila episentrum di lautan, kode wilayah berdasarkan jarak terdekat wilayah terdampak, ditentukan Pusdatinkom melalui verifikasi. Kapal tenggelam dan kecelakaan transportasi tidak ada di 13 jenis ancaman; apakah masuk lingkup tidak diatur (tabel jenis hlm. 5 terbaca berantakan dari ekstraksi, perlu cek visual).
4. **Jawaban praktik dunia.** DesInventar memerlukan unit geografis terendah; EM-DAT mencatat per negara; GDACS menilai gempa menurut penduduk dalam radius 100 km dari episentrum, sehingga laut tidak menjadi masalah teknis (https://www.gdacs.org/Knowledge/models_eq.aspx).
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Wilayah terdampak terdekat (aturan Juklak) dengan titik koordinat laut disimpan | Tidak berubah | Stabil | Kabupaten pantai menanggung kejadian yang titiknya di laut | Netral | Rendah; Pusdatinkom memverifikasi |
| B. Kode "lepas pantai" dan dampak dialokasikan ke kabupaten asal korban | Tidak berubah | Stabil | Lebih adil | Netral | Sedang |
| C. Kecelakaan pelayaran di luar lingkup bencana; gelombang dan gempa tetap | Turun untuk kejadian pelayaran | Stabil | Netral | Netral | Rendah |

6. **Uji empiris.** Belum ada data. Dibutuhkan katalog gempa BMKG dengan episentrum, pemetaan jarak ke garis pantai, dan baris DIBI gempa 2024 sampai 2026 untuk menghitung proporsi kejadian bertitik laut.
7. **Rekomendasi sementara.** Pilih opsi A (aturan Juklak) dan simpan titik laut. Lingkup kecelakaan pelayaran ditanyakan ke pemilik lewat Q-17. [BAWAAN SEMENTARA] opsi A; kecelakaan pelayaran di luar lingkup sampai dikonfirmasi.

---

### P-64 Bahaya dari luar negeri

**Kelompok:** A. **Bergantung pada:** P-07, P-45. **Menentukan:** P-10, P-40.

1. **Kasus.** Asap kebakaran yang melintasi batas negara, abu gunung api negara tetangga, dan tsunami jarak jauh (contoh kajian) [ILUSTRASI]. Panduan Pusdalops mencantumkan "tsunami jarak jauh" sebagai nama kejadian di bawah jenis tsunami (kode 108). Pada data satelit kita, 311.804 dari 420.428 deteksi VIIRS jatuh di daratan Indonesia (`riset/SIM-KARHUTLA.md` bagian 1); 108.624 sisanya berada di luar daratan Indonesia (laut atau negara tetangga, tidak dipilah), dan api di luar negeri tidak masuk hitungan kejadian kita.
2. **Mengapa ini paradoks.** Jawaban A: dicatat bila menimbulkan dampak di wilayah Indonesia, karena warga kita yang terdampak dan BPBD yang menangani. Jawaban B: tidak dicatat, karena kejadian sumbernya bukan di yurisdiksi kita, dan penyebabnya tidak bisa kita ubah. Hal sebaliknya juga berlaku: asap dari karhutla kita yang melintas ke negara tetangga.
3. **Jawaban aturan saat ini.** Tidak diatur. Juklak tidak menyebut kejadian berasal dari luar negeri. Kabut asap tidak punya jenis sendiri; dampaknya tidak tertangkap K1 sampai K4 (Bab 4.5 butir 5).
4. **Jawaban praktik dunia.** EM-DAT memberi satu entri per negara terdampak, semuanya terikat satu DisNo. Nomor GLIDE memuat kode negara (satu nomor per negara menurut struktur, aturan eksplisit [BELUM TERVERIFIKASI]). GDACS menilai karhutla pada perimeter dari data global.
5. **Opsi penyelesaian.**

| Opsi | Jumlah kejadian | Tren | Keadilan antardaerah | Insentif pelapor | Beban pencatat |
| --- | --- | --- | --- | --- | --- |
| A. Dampak di wilayah kita dicatat sebagai kejadian sendiri dengan penanda "sumber luar negeri" dan rujukan nomor eksternal | Naik sedikit | Naik pada tahun asap | Daerah perbatasan tercatat | Netral | Sedang |
| B. Tidak dicatat sebagai kejadian; hanya rujukan | Tidak berubah | Stabil | Dampak lintas batas tidak terlihat | Netral | Rendah |
| C. Dicatat hanya bila ada permintaan bantuan atau status dari daerah kita | Naik sedikit | Stabil | Bergantung kemauan daerah (P-15) | Mendorong permintaan | Rendah |

6. **Uji empiris.** Belum ada data dampak lintas batas di repo. Dibutuhkan laporan BPBD tentang asap atau abu dari luar negeri dan arsip hotspot negara tetangga untuk menilai seberapa sering kasus ini terjadi.
7. **Rekomendasi sementara.** Rujuk Q-18. [BAWAAN SEMENTARA] opsi A: dampak di wilayah kita dicatat dengan penanda "sumber luar negeri" dan rujukan nomor kejadian eksternal.

---

## Usulan pertanyaan terbuka

- **Q-13 Tahun pencatatan kejadian lintas tahun** (P-11, P-39). Pertanyaan: kejadian yang melewati 31 Desember dihitung di tahun mulai atau dibagi menurut tanggal dampak? [BAWAAN SEMENTARA] tahun tanggal mulai, dampak dilaporkan pada tahun itu dengan penanda lintas tahun.
- **Q-14 Aturan memilih tipe utama** (P-07, P-09, P-50). Pertanyaan: siapa dan menurut apa tipe utama kejadian majemuk ditentukan (pemicu awal atau dampak terbesar)? [BAWAAN SEMENTARA] dampak terbesar, diusulkan Pusdalops dan diputuskan Pusdatinkom (searah Q-08).
- **Q-15 Gempa susulan** (P-08). Pertanyaan: susulan yang merusak lagi adalah episode kejadian induk atau kejadian baru? [BAWAAN SEMENTARA] episode induk selama 30 hari di zona yang sama (batas 90 hari); kejadian baru bila magnitudonya sama atau lebih besar dari gempa utama dengan dampak terpisah, atau pusatnya di luar zona.
- **Q-16 Kejadian lambat** (P-10). Pertanyaan: kapan kekeringan, kabut asap, dan abrasi mulai dan selesai? [BAWAAN SEMENTARA] kekeringan satu kabupaten per periode kemarau zona musim BMKG; kabut asap anak dari karhutla sumbernya; abrasi per tahun kalender.
- **Q-17 Lingkup kejadian di laut** (P-56). Pertanyaan: apakah kecelakaan pelayaran dan kapal tenggelam masuk lingkup bencana dan bagaimana kabupaten ditetapkan? [BAWAAN SEMENTARA] di luar lingkup sampai dikonfirmasi; kejadian laut dari 13 jenis memakai wilayah terdampak terdekat.
- **Q-18 Bahaya dari luar negeri** (P-64). Pertanyaan: apakah dampak asap atau abu dari luar negeri di wilayah kita dicatat sebagai kejadian? [BAWAAN SEMENTARA] dicatat dengan penanda "sumber luar negeri" dan rujukan nomor eksternal.
- **Q-19 Identitas kejadian dibawa lintas laporan** (P-38). Pertanyaan: apakah Pusdalops membawa KIB dengan sufiks yang diusulkan sejak laporan pertama dan pada tiap pengkinian, disahkan Pusdatinkom (Q-08 dan Q-40), sebagai pengganti kunci yang disimpulkan dari teks? [BAWAAN SEMENTARA] ya, sebagai tujuan; V1g dipakai sementara.

## Daftar periksa

Semua [BELUM TERVERIFIKASI] dan catatan verifikasi di berkas ini:

1. Semua kutipan Juklak 7/2023 (Bab II huruf B angka 3 dan 4, Catatan KIB hlm. 7, Lampiran I hlm. 19 dan 20) berasal dari PDF UNFPA, bukan JDIH BNPB (Q-02). Halaman tabel jenis (hlm. 5) terbaca berantakan, sehingga klaim bahwa kapal tenggelam tidak ada di 13 jenis (P-56) perlu cek visual.
2. P-05, P-07, P-64: aturan nomor GLIDE untuk kejadian lintas negara dan berantai belum diverifikasi.
3. P-07: tanggal dan rincian bahaya Palu 28 September 2018 berasal dari pengetahuan umum; sumber primer belum dibuka dan angka korban tidak dicantumkan.
4. P-08: aturan khusus penggabungan susulan di basis data bencana belum ditemukan di pustaka yang dibuka.
5. P-10: angka 6 bulan pada panduan teknis Sendai dibaca dari ringkasan tabel di `riset/PUSTAKA.md` bagian 3.
6. P-39: aturan EM-DAT tentang pelaporan terlambat tidak ditemukan.
7. P-04: selisih 8.933 lawan 6.642 sudah direkonsiliasi (beda definisi jeda: pasangan deteksi mana pun lawan deteksi terdekat); yang dipakai 6.642. Pembacaan 6.575 sebagai bagian dengan jeda sedikitnya 120 jam mengikuti kepala kolom tabel.
8. P-06, P-11, P-10, P-48: `analisis/tambahan_A.py` membaca tanggal DIBI dari cap waktu (milidetik epoch) tanpa koreksi zona; pergeseran satu hari mungkin terjadi, terutama di sekitar 31 Desember. Rangkaian hari berurutan DIBI memakai tanggal pencatatan, bukan tanggal kejadian fisik.
9. P-48: tafsir `jumlah_kejadian` sebagai pembagian satu kejadian ke kabupaten adalah dugaan dari pola data; arti resmi dikonfirmasi ke Pusdatinkom (Lampiran E.4 butir 1).
10. P-38: apakah sufiks KIB (-001, -002, -003) dari Panduan Pusdalops dipakai konsisten di arsip logbook tidak diperiksa.
11. P-03, P-04: simulasi satelit hanya mencakup 28 hari (15 Oktober sampai 11 November 2026); kejadian di tepi arsip terpotong dan musim lain belum diuji. Jenis lahan (gambut) tidak diperiksa.
12. P-05: Perka 8/2011 berstatus tidak berlaku menurut `peta_peraturan.json` repo; dokumen pencabutnya tidak diperiksa.
