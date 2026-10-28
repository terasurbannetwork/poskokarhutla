# Pra-registrasi J4 (DRAF, BELUM DIKUNCI): uji PROSPEKTIF model genangan Jakarta, musim hujan 2026/27

Draf 28 Okt 2026. Pemilik memilih jalur prospektif sesudah J3 dinyatakan tidak sah (`DIAGNOSIS-J3.md`: label uji 98 sampai 99,6% laporan latihan). Dokumen ini BELUM jadi pra-registrasi sampai pemilik menyetujui dan sesi induk menjangkarkannya (pola `PRAREG-J3.md` + `kunci_j3.py` + `JANGKAR_COMMIT` di `prospektif.py`; kunci J4 belum dibangun). Kalibrasi J4 hanya memakai kejadian kalibrasi lama (2017-01, 2018-01, 2020-01 menyetel; 2021-02 hanya dilaporkan); 2024-08 dan 2025-04 tidak dibuka. Sumber label: `SUMBER-LABEL-J4.md`. Skrip penilai: `skor_j4.py`; penyetel: `kalibrasi_j4.py`; hasil: `j4_kalibrasi.json`.

## 1. Model yang dibekukan

| Bagian | Nilai |
| --- | --- |
| Kode | `mesin.mjs`, `public/banjir/sim_genangan.js`, `skor_j4.py`, `petabencana.py` (saring) pada commit jangkar; sidik sha256 seperti `kunci_j3.py` |
| Medan | M0: rata-rata blok 100 m (`--faktor 12`, `--agregasi mean`), cekungan maks 0,5 m (`--cekungan-maks 0.5`) = J3. Lima varian medan dicoba (tabel 2); tidak satu pun mengalahkan M0 di luar kebisingan, jadi tidak diubah |
| Hujan | kalibrasi: GSMaP harian gauge v8 x bentuk jam ERA5 (`--hujan gsmap_dis --bentuk era5`), skala 1. Operasional (prospektif): GSMaP NRT per jam (produk G pada `m1_hujan.jsonl`), total harian = jumlah 24 jam, bentuk jam = GSMaP itu sendiri. ERA5 arsip tertinggal ~5 hari sehingga tak bisa dipakai saat prakiraan |
| Drainase | Kd seragam 8 mm/jam (grid {0,5; 1; 2; 3; 5; 8; 12}; AUC datar 0,598 sampai 0,606, minimum BUKAN di tepi grid) |
| Tetap dari J3 | 96 jam, CN 80, muka laut 0,6 m + tunggang 1 m, subsidensi skala 1, hulu skala 1 radius 10 km, tanggul 2,5 m, alur/pintu/pompa OSM, ALUR, `ASUMSI.TERGENANG` 0,10 m |
| Hulu | Open-Meteo Flood API (GloFAS) `past_days` + prakiraan (reanalisis dipakai saat kalibrasi; produk beda, dicatat) |
| Jendela | `mulai` = hari pemicu D - 2, 00.00 WIB, 96 jam (struktur kalibrasi: puncak jatuh di hari ke-3) |

Aturan pilih kalibrasi (ditulis sebelum run, `kalibrasi_j4.py`): luas basah <= 25% pada tiap kejadian penyetel, lalu AUC rata-rata (bobot kejadian sama, 1/3), selisih < 0,005 jatuh ke yang lebih sederhana. Pengecualian jujur: untuk hujan, aturan AUC murni memilih ERA5 x1,0 (AUC 0,613) karena AUC menyukai genangan sempit (hujan efektif 2017-01 hanya 15 Mm3 vs 110 Mm3 pada GSMaP); GSMaP dipilih atas perintah pemilik (sumber teramati, bukan kenop skala).

### 1.1 Tabel kalibrasi: J3 lawan kandidat J4 (label baru tersaring, 4 kejadian)

AUC = laporan vs 4.000 titik darat acak (kedalaman maks dalam 300 m). HSS terhadap titik darat acak seimbang; (p) = bagian dari 100 medan basah acak berklaster 5x5 sel, luas sama, yang HSS-nya >= model.

| Kejadian (n laporan) | Model | luas basah | AUC | POD / POFD | HSS (p) |
| --- | --- | --- | --- | --- | --- |
| 2017-01 (1.190) | J3 (Kd 2, ERA5 x2) | 17,0% | 0,536 | 0,86 / 0,86 | 0,002 (0,47) |
|  | J4 (GSMaP, Kd 8) | 7,6% | 0,552 | 0,34 / 0,28 | 0,064 (0,06) |
| 2018-01 (110) | J3 | 8,5% | 0,603 | 0,56 / 0,29 | 0,274 (0,00) |
|  | J4 | 7,3% | 0,611 | 0,46 / 0,23 | 0,235 (0,01) |
| 2020-01 (175) | J3 | 10,6% | 0,628 | 0,64 / 0,39 | 0,248 (0,00) |
|  | J4 | 8,4% | 0,642 | 0,54 / 0,27 | 0,278 (0,00) |
| 2021-02 (316, tidak menyetel) | J3 | 11,1% | 0,580 | 0,60 / 0,51 | 0,099 (0,04) |
|  | J4 | 7,7% | 0,597 | 0,35 / 0,29 | 0,068 (0,12) |
| Rata-rata 3 penyetel | J3 / J4 | | 0,589 / 0,602 | | 0,175 / 0,192 |

Pembanding sederhana pada kejadian yang sama (AUC; hanya konteks, tidak menyetel apa pun): elevasi terendah dalam 300 m (DEMNAS 100 m) 0,613 / 0,704 / 0,612 / 0,395 dan InaRISK per kecamatan 0,532 / 0,594 / 0,555 / 0,457 (urutan 2017-01, 2018-01, 2020-01, 2021-02). Jadi perbaikan J4 atas J3 (+0,008 sampai +0,017 AUC per kejadian) lebih kecil dari galat sampling (AUC 110 laporan: galat baku ~0,03), dan pada tiga kejadian penyetel model fisik belum mengalahkan "titik paling rendah" (kecuali 2020-01: 0,642 vs 0,612). 2017-01 (1.190 dari 1.791 laporan, 66%) tetap mendominasi bila laporan dijumlah; semua angka di sini per kejadian dengan bobot sama. Perbaikan medan: fraksi sel basah yang berada di sel cekungan yang diangkat 0,49 sampai 0,51 pada J4 (J3 0,50 sampai 0,66; dasar 0,23); varian medan M2 (cekungan 1,5 m) menurunkannya ke 0,28 sampai 0,44 dengan AUC sama dalam kebisingan (0,586 vs 0,589), tetapi aturan pilih menahan M0. Varian lain (`j4_kalibrasi.json` tahap 1 sampai 3) dilaporkan lengkap di sana.

## 2. Pemicu kejadian (hujan saja)

Hari pemicu D (tanggal WIB): rata-rata aritmetik dari `mm` 42 kecamatan daratan DKI pada baris `m1_hujan.jsonl` hari D (GSMaP NRT, 24 berkas jam 17Z D-1 sampai 16Z D, tidak dikeluarkan) >= **X = 40 mm**. Baris yang `dikeluarkan` membuat hari itu dilewati dan dicatat (tidak diisi nol). Tier cadangan **X2 = 30 mm** disimulasikan juga, dilaporkan, dan dipakai vonis hanya lewat aturan di bagian 6.

Alasan X (dari klimatologi, ditetapkan sebelum musim, bukan dari hasil model): GSMaP harian gauge v8, rata-rata 9 sel 0,1 derajat (lon 106,75 sampai 106,95, lat -6,35 sampai -6,15), Nov-Apr 2016/17 sampai 2024/25 (1.692 hari): persentil 90 = 22,6 mm; 95 = 32,9; 97 = 41,0; 98 = 47,4; 99 = 60,6. Hari >= 40 mm: 54 dalam 9 musim, rata-rata 6,0 per musim (3, 6, 4, 14, 6, 3, 5, 6, 6; 5 dari 9 musim >= 6). Hari >= 30 mm: 105, rata-rata 11,7 (rentang 5 sampai 22). Tiga kejadian kalibrasi bersih bermaksimum harian 43, 63, 84 mm (2020-01, 2018-01, 2017-01). X = 40 sedikit di bawah batas hujan lebat BMKG 50 mm/hari karena NRT cenderung meremehkan puncak dan karena rata-rata kota meredam puncak titik; ia juga cukup rendah untuk memberi kira-kira 5 sampai 6 kejadian per musim. Catatan: ambang 9-sel (gauge, hari UTC) dan pemicu 42-kecamatan NRT (hari WIB) adalah dua ukuran terkait, bukan identik; selisihnya dilaporkan (perbandingan harian pada hari gauge v8 tersedia).

## 3. Urutan wajib: prediksi dulu, label kemudian

Prediksi dijalankan pada D+2 pagi (hujan D+1 lengkap, struktur jendela sama dengan kalibrasi), ditulis append-only ke `data/banjir/genangan/j4_prediksi.jsonl` dengan: tanggal D, jendela, sidik kode, sha256 masukan hujan dan hulu, sha256 raster kedalaman maks, ringkasan (luas basah, per kecamatan), `prev` = hash baris sebelumnya (rantai), dan di-commit sendiri. Pengumpul label (j4_label) menolak mengambil label kejadian yang barisnya belum ada di `HEAD` dengan stempel waktu commit lebih awal. Prediksi tidak pernah membaca label; label diambil H+1 sampai H+7 sesudah akhir jendela (D+2 00.00 WIB), jadi laporan yang terbit lebih dulu tetap diambil setelah prediksi tersimpan. Baris yang hilang tidak diisi ulang. Kegagalan satu hari (sumber hujan, hulu, mesin) dicatat dengan alasan dan kejadian itu keluar dari uji; jumlah yang keluar dilaporkan (lebih dari 20% kejadian keluar = vonis ditahan).

## 4. Label

Utama: PetaBencana ID-JK, `disaster_type = flood`, jendela 96 jam WIB, di dalam poligon DKI, dedup (t, lon, lat, kedalaman), saring latihan `petabencana.py saring`:

1. teks diawali (setelah `#`/spasi) "duta", "hkb", "hkn", "trainer", "bakrie", "smp"/"smpn", "youth4gotongroyong", "112_bpbdjkt", atau "bpbd" + 1 sampai 4 kata nama saja;
2. teks memuat kata: simulasi, latihan, pelatihan, uji coba, percobaan, sosialisasi, gladi, drill, testing, retest, training, pelatih, tes, test, hkb, hkn, 112challange;
3. lebih dari 20 laporan di satu sel 0,001 derajat pada satu hari WIB (latihan massal).

Pola ini kesimpulan dari teks arsip 27.930 laporan, bukan konfirmasi PetaBencana; residu (nama saja) mungkin lolos dan dicatat. Pada empat kejadian kalibrasi saringan membuang < 1%. Daftar aturan tambahan hanya boleh ditambah SEBELUM label musim dibuka. Cadangan: BPBD genangan RW (bila permohonan data disetujui, lewat amandemen tertulis sebelum datanya dibuka), `uji_banjir` D1 (genangan + kontrol, bila migrasi 0064/0065, akun, dan rute ekspor ada). Berita dan GFM hanya pemeriksaan silang kejadian. Kejadian dengan < 10 laporan tersaring ditandai "tanpa label" dan keluar dari AUC/HSS (dilaporkan).

## 5. Metrik dan syarat lulus (per kejadian bobot sama)

Untuk tiap kejadian terjudge dihitung `skor_j4.nilai`: AUC; POD, POFD; HSS (kontrol seimbang); null berklaster 5x5 dan 10x10 sel (luas basah sama, 100 benih, seed 7). Pembanding wajib di kejadian yang sama: (a) InaRISK per kecamatan (`bahaya.json`), (b) J3 final (M0, ERA5 x2,0, Kd 2: bagian 1.1) dijalankan dengan hujan yang sama, (c) elevasi terendah dalam 300 m (dilaporkan; menentukan label "bernilai tambah", bukan "lulus"). Selang 95%: bootstrap dua tingkat (kejadian, lalu laporan per hari WIB), 1.000 ulangan, benih 7.

LULUS bila SEMUA: (i) batas bawah AUC rata-rata > 0,5; (ii) HSS rata-rata > 0 dan p (null berklaster 5x5) < 0,05 pada >= 60% kejadian terjudge; (iii) batas bawah selisih AUC (J4 - InaRISK) > 0; (iv) batas bawah selisih AUC (J4 - J3 final) > 0. BERNILAI TAMBAH bila lulus dan batas bawah selisih AUC (J4 - elevasi terendah) > 0. Selain itu TIDAK LULUS. Luas basah > 25% pada kejadian terjudge mana pun = ketajaman gagal (dilaporkan, tidak mengubah vonis). Vonis akhir dikunci sekali.

Harapan jujur yang ditulis sekarang: pada kalibrasi J4 hanya menyaingi J3 dan InaRISK dan kalah dari elevasi terendah; kami memperkirakan hasil "lulus tipis" atau "tidak lulus", dan tidak akan menyetel ulang untuk mengubahnya.

## 6. Jumlah kejadian dan waktu vonis

Kejadian terjudge = hari pemicu X = 40 mm dengan prediksi dan >= 10 laporan tersaring. Minimum 6 kejadian dan >= 150 laporan tersaring dijumlah. Vonis pada yang lebih dulu: (a) kejadian terjudge ke-10, atau (b) 30 Apr 2027 (data musim Nov-Apr; label dikumpulkan sampai 7 Mei 2027). Bila pada 30 Apr 2027 kejadian X = 40 kurang dari 6, vonis memakai semua kejadian X2 = 30 mm (minimum 6, aturan sama). Bila tetap < 6 atau < 150 laporan: "belum cukup data", tidak ada vonis, pengumpulan lanjut ke musim 2027/28 dengan kriteria yang sama. Dari klimatologi 2016-2025: peluang >= 6 kejadian X = 40 pada satu musim Nov-Apr 5/9; pada X2 = 30 8/9.

## 7. Pengumpulan otomatis (rancangan, BELUM dibangun)

Kendala dasar: DEM 180 MB dan alur OSM ada di `data/raw/banjir/*` (git-ignore), jadi runner GitHub tak punya masukan mesin. Rancangan: bake DEM 100 m (`--faktor 12`, mean, 500 x 388 sel, ~0,5 MB gz) dan `saluran_osm.json` (3 MB) ke berkas yang dilacak git atau rilis aset, dengan opsi `--dem-100m` di `mesin.mjs` (hasil harus identik dengan jalur penuh; uji regresi di swa-uji), dan opsi hujan `gsmap` jam langsung dari `j4_hujan_jam.jsonl`.

| Berkas | Fungsi | Jadwal |
| --- | --- | --- |
| `scripts/banjir/genangan/j4_hujan_jam.py` | per hari WIB: 24 jam x 9 sel GSMaP NRT (+ pola G/N) ke `data/banjir/genangan/j4_hujan_jam.jsonl` (append-only), ~1 KB/hari; FTP kedua atas berkas yang sama dengan M1 (m1 terkunci, tidak diubah) | harian, sesudah M1 |
| `scripts/banjir/genangan/j4_pemicu.py` | baca `m1_hujan.jsonl`, hitung rata-rata 42 kecamatan, tulis `j4_kejadian.jsonl` untuk D dengan D+1 <= kemarin dan D >= beku | harian |
| `scripts/banjir/genangan/j4_prakira.py` | untuk kejadian tanpa prediksi: ambil hulu (Flood API), jalankan `mesin.mjs`, simpan raster ringkas gz (~1 MB) + baris rantai hash ke `j4_prediksi.jsonl`; commit sendiri | harian |
| `scripts/banjir/genangan/j4_label.py` | H+1..H+7: tarik PetaBencana, saring, tulis `j4_label.jsonl` hanya bila prediksi kejadian itu sudah di HEAD; tahap berikutnya mengisi hari yang terlewat | harian |
| `scripts/banjir/genangan/j4_nilai.py` | kriteria bagian 5 dan 6, menolak jalan bila sidik beda; vonis sekali | manual / akhir musim |
| `.github/workflows/genangan_j4.yml` (pemilik `mekanik-mesin`) | cron `30 22 * * *` UTC (05.30 WIB), sesudah M1 04.30; `concurrency: group: m1-prospektif`, `timeout-minutes: 60`, pola commit M1 (`pull --rebase`, tiga percobaan) | harian |

Batas dan kuota: satu simulasi ~3 menit di Mac, diperkirakan 8 sampai 15 menit pada runner 2-vCPU; 6 sampai 17 kejadian per musim berarti kurang dari 4 jam Actions per musim (jauh di bawah 2.000 menit/bulan akun gratis). Hari tanpa pemicu hanya menjalankan langkah ringan (< 3 menit). Open-Meteo Flood API: 8 titik x kejadian, jauh di bawah kuota harian; GSMaP FTP butuh `GSMAP_USER`/`GSMAP_PASS` (sudah ada di Actions). Raster ~1 MB x 17 = ~17 MB per musim di git, dapat diterima; bila tidak, simpan di R2 dengan hash di JSONL. Sebelum dibekukan: uji kering memutar ulang 2020-01 lewat jalur operasional (GSMaP jam + Flood API) dan membandingkan AUC dengan jalur kalibrasi (tolak bila beda > 0,02). Risiko: FTP JAXA atau Flood API turun pada hari pemicu (kejadian keluar; dilaporkan), runner Linux vs Mac beda bit (hash dicatat dari runner, bukan dibandingkan lintas mesin), D1 uji lapangan butuh keputusan pemilik di luar wilayah ini.

## 8. Amandemen dan batas

Mengubah kode, parameter, X, aturan saring, atau angka kriteria sesudah jangkar = kriteria baru. Sebelum jangkar, perubahan ditulis di sini dengan tanggal. Belum dijangkar: tidak ada `j4_sidik.json`, tidak ada `kunci_j4.py`, tidak ada workflow. Berkas J3 (`j3_*.json`, `kunci_j3.py`) tidak diubah; `mesin.mjs`, `petabencana.py`, `bersama`-nya berubah sejak sidik J3 (opsi opt-in, bawaan identik; terbukti: raster M0 sama persis dengan cache J3 pada empat kejadian), sehingga `kunci_j3.py cek` akan melaporkan beda, yang memang benar.
