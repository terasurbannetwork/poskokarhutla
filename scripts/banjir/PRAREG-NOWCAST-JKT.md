# Pra-registrasi NOWCAST-JKT (DRAF, belum dikunci): peluang banjir per kecamatan Jakarta, tenggang 1-6 jam

Draf 1 Nov 2026, fase 1. Dokumen ini baru menjadi pra-registrasi sesudah sesi induk mengisi sidik (bagian 9). Sampai itu, semua angka di sini boleh diubah dengan catatan tanggal di bagian 10, dan tidak ada label musim 2026/27 yang boleh dibaca. Inventaris data: `docs/banjir/NOWCAST-JKT.md`. Kode: `scripts/banjir/nowcast_jkt.py`.

Tujuan pemilik: "3 jam lagi kecamatan X banjir, peluang P", dengan P terkalibrasi (P = 30% berarti terjadi sekitar 30% kali). Tambahan pemilik (1 Nov 2026): cari tenggang terpanjang yang masih andal, dengan evaluasi per tenggang 1, 2, 3, 4, 6 jam. Vonis utama tetap 3 jam.

Keputusan pemilik 1 Nov 2026: "pakai yang ada". Tidak ada data tambahan dari BBWS, BPBD, atau radar BMKG. Karena itu ada **dua jalur**:

| | Jalur A: hujan saja | Jalur B: TMA + CAP + hujan |
| --- | --- | --- |
| Masukan | IMERG Early 30 menit (bagian A.1) | pos TMA DSDA/SIHKA, CAP BMKG, hujan (bagian 3-5) |
| Diuji di | arsip PetaBencana 2016/17-2025/26, dan arsip **memutuskan** untuk jalur ini | prospektif 2026/27 |
| Pembanding | klimatologi, persistensi (CAP BMKG tidak ada di arsip sebelum 19 Okt 2026, jadi tidak ada pembanding BMKG) | klimatologi, persistensi, CAP BMKG |
| Kemungkinan hasil | ada daya (bagian A.3) | kemungkinan besar "belum cukup data" (bagian 8.1 butir 2) |

Bagian 1, 2, 6 (skor), 7 (kriteria), 8.1, dan 9 berlaku untuk kedua jalur. Bagian 3-5 dan 8 adalah Jalur B.

## 1. Unit

- **Utama: kecamatan daratan DKI (42) x jam terbit t** (tiap jam pas WIB), satu prakiraan per tenggang L ∈ {1, 2, 3, 4, 6} jam. Kecamatan mengikuti permintaan pemilik dan poligon label yang sudah ada (`KecDKI`, `public/geo/kecamatan/31.json`).
- Jendela tiap jam saling tumpang tindih. Ketergantungan itu ditangani bootstrap blok 5 hari (bagian 6), bukan dengan menjarangkan jam terbit.
- Unit pendamping (kota administrasi) dan subset awal kejadian: **ditunda ke amandemen, bukan syarat** (bagian 9b).

## 2. Label

Positif(kec, t, L) = paling sedikit satu laporan PetaBencana ID-JK yang memenuhi semua syarat berikut:
- `disaster_type = flood`;
- lolos `petabencana.saring` (aturan teks latihan dan burst > 20 per sel 0,001 derajat per hari WIB), sebagaimana di commit sidik;
- `created_at` dalam (t, t+L] WIB;
- titiknya di dalam poligon kecamatan;
- dedup (t, lon, lat, kedalaman).

Label dikumpulkan paling cepat 7 hari sesudah akhir jendela, supaya laporan susulan ikut, dan hanya untuk baris prakiraan yang sudah ada di `origin/main` (pola J4). **Sensitivitas (dikerjakan `nilai`)**: vonis juga dihitung tanpa saringan latihan, yaitu cache mentah `petabencana.dari_cache()`, tipe flood, dedup (t, lon, lat, kedalaman). Hasilnya ditulis berdampingan (`vonis_tanpa_saring`, `arah_beda`). Bila arahnya berbeda, perbedaan itu dicatat, dan vonis utama tidak diganti. Model dan Platt TIDAK dilatih ulang pada label tanpa saringan; hanya offset klim yang dihitung ulang dari label itu, sehingga offset prakiraan tidak sama dengan offset latih. Karena itu `vonis_tanpa_saring` dan `arah_beda` dibaca deskriptif saja, dan kegagalan syarat 3 pada sensitivitas ini bukan bukti apa pun.

Periode terlarang untuk membaca label:
- J3 (jendela uji 2024-08-16 dan 2025-04-22, masing-masing 96 jam): dibuang dengan `tanpa_j3(jendela_j3())` segera sesudah dibaca. Selain itu, **bulan 2024-08 dan 2025-04 dibuang utuh**.
- Sejak jangkar J4 (28 Okt 2026): tidak ada label yang dibaca sebelum sidik pilot ini. Sesudah sidik, label hanya dibaca oleh `nowcast_jkt.py latih/nilai` dengan aturan di atas. Pilot ini tidak menulis apa pun ke berkas J4/M1, dan J4/M1 tidak membaca keluarannya.
- **Jendela label (t, t+L] juga tidak boleh menyentuh bulan terlarang.** Unit yang t-nya sah tetapi t+L masuk bulan terlarang, masuk masa J4, atau keluar musim tidak punya peran (`nowcast_jkt.peran(t, L)`, diuji).

**Sumber laporan.** Label = `petabencana_banjir.json` (keluaran `petabencana.saring`). Persistensi dan sensitivitas = `petabencana.dari_cache()` (skema `ringkas`, punya `tipe` dan `teks`). `petabencana_laporan.json` TIDAK dipakai, karena skemanya tanpa `tipe`/`teks` (lihat `skor_j4.py`); memakainya membuat persistensi selalu 0. `muat_label` gagal keras bila cache mentah tidak memuat satu pun tipe flood.

**Saringan label vs saringan persistensi (pembeda).** Label memakai `petabencana.saring` penuh: tipe flood, aturan teks latihan, lalu burst > 20 laporan per (hari WIB, sel 0,001 derajat) dihitung atas **seluruh hari**. Burst itu tidak kausal, karena memakai laporan sesudah t pada hari yang sama. Fitur persistensi (bagian A.2) memakai saringan kausal: tipe flood dan aturan teks latihan per laporan (keduanya kausal), dengan burst dihitung **kumulatif sampai t** (`nowcast_jkt.persisten`). Akibatnya, laporan yang kemudian menjadi bagian dari burst latihan tetap terhitung persisten pada jam sebelum burst itu terlihat, persis seperti yang dialami operasional. Pembeda ini diuji (`uji` butir 12).

## A. Jalur A: hujan saja, arsip memutuskan

### A.1 Sumber hujan per jam: IMERG Early 30 menit (`GPM_3IMERGHHE.07`)

Tiga calon diperiksa pada 1 Nov 2026:

| Calon | Bukti | Vonis |
| --- | --- | --- |
| (i) GSMaP per jam, FTP JAXA | Kredensial hanya ada di Actions, jadi tidak ada contoh yang bisa diunduh dari mesin lokal. Anonim hanya melihat `/pub` (dicoba). Bukti tak langsung: `gsmap_harian.json` produk `gauge_v8` 2016-10-25..2025-12-31 (1.771 hari) terunduh lewat Actions, dan log `m1_prospektif` 31 Okt (run 41245933596) mengambil 24 berkas jam NRT dalam ~42 detik (~1,75 detik/berkas). Berkas global 3.600 x 1.200 float32 = 17,3 MB tanpa kompresi; ukuran gz belum terukur. Arsip 2016-2026 = 10 musim x ~181 hari x 24 = ~43.400 berkas, ~21 jam di Actions. **Arsip NRT (`realtime_ver`) sampai 2016 BELUM terverifikasi**, sedangkan arsip `standard/hourly_G` adalah produk terkoreksi gauge berlatensi berhari-hari (bukan produk operasional), sehingga skornya terlalu optimistis | cadangan dan sensitivitas, bukan utama |
| (ii) ERA5 per jam, Open-Meteo | contoh diunduh: 1 titik x 24 jam = 892 byte. 1 Jan 2020 (banjir besar Jakarta) di sel -6,25/106,75 hanya maks 2,9 mm/jam, total ~29 mm. Data terakhir tersedia 27 Okt 06.00 WIB saat diperiksa 1 Nov malam (latensi ~5,5 hari). 0,25 derajat | **hanya pembanding "hujan sempurna"** (hujan aktual dalam jendela, tanpa latensi), dilaporkan saja; tidak pernah menjadi masukan |
| (iii) IMERG Early 30 menit, GES DISC | daftar folder publik tanpa login: berkas ada sejak **2016-11-01** (V07B), ~7 MB per berkas global; struktur `.dds` publik: `precipitation[time=1][lon=3600][lat=1800]`, sama dengan `scripts/cuaca/imerg.py`. Data butuh `EARTHDATA_TOKEN` (permintaan data tanpa token dialihkan 302 ke login), dan secret itu SUDAH dipakai `lintas.yml`. Latensi dari stempel daftar folder (`nowcast_jkt.py imerg_latensi`): 31 Okt p10 4,40, p50 4,90, maks 4,90 jam; 25 Okt maks 4,92 jam. OPeNDAP memotong di server, jadi satu slot hanya mengirim 7 x 7 sel (~1 KB) | **utama** |

Alasan memilih IMERG Early:
1. Arsip dan operasional memakai algoritme Early yang sama. Early hanya memakai data sebelum slot itu, jadi kausal.
2. Latensinya terukur tanpa login.
3. Unduhannya kecil, karena dipotong di server.
4. Token sudah ada ("pakai yang ada").

Cacat yang dicatat:
- **Versi**: daftar folder menunjukkan V07B sampai 2026-03-03 (hari 062) dan V07C sejak 2026-03-04 (hari 063). Tiap hari hanya satu versi, jadi **tidak ada periode tumpang**, dan selisih fitur h1/h3/h6 maupun skor antarversi tidak bisa dihitung. Akibatnya:
  - vonis Jalur A ditulis **"batas atas, sebelum prospektif 2026/27"**;
  - layar tidak boleh menyebut hasil Jalur A sebagai kinerja operasional;
  - skor juga dilaporkan terpisah untuk bagian uji ber-V07C (2026-03-04..2026-04-30), sebagai deskriptif dengan n kecil.
- Format ASCII hidup belum dikonfirmasi; `imerg.parse` sengaja longgar dan mencetak "skema IMERG" pertama.

**Latensi dibekukan: `LAT_IMERG` = 6 jam.** Slot 30 menit yang berakhir e dipakai bila e + 6 jam <= t.
- Pengukuran: `imerg_latensi --dari 2026-10-11 --sampai 2026-10-31`, 21 hari termasuk 3 akhir pekan, 1.008 slot. Hasilnya p50 4,45, p90 4,92, p99 4,93, maks 6,23 jam (satu slot, 20 Okt).
- Aturan: p99 + margin 1 jam, dibulatkan ke atas = 6 jam.
- Satu slot pada 21 Okt memberi 0,35 jam. Ini tidak masuk akal untuk Early, jadi stempel folder bukan bukti sempurna. Batas atasnya tetap dipakai.
- Bila `imerg_latensi` pada musim uji memberi p99 > 6 jam, perintah itu keluar dengan kode 3 dan angkanya dilaporkan. Latensi tidak diubah sesudah sidik.

### A.2 Fitur (dibekukan)

`nowcast_jkt.hujan_imerg`, sel IMERG 0,1 derajat terdekat dengan pusat kecamatan:
- `h1`, `h3`, `h6`: mm dalam 1, 3, dan 6 jam terakhir yang tersedia;
- `a24`: mm dalam 24 jam sebelum jendela 6 jam itu;
- `klim`: sama dengan bagian 4, tetapi hanya dibangun dari musim **latih** (A.3).

Slot hilang di dalam jendela membuat fiturnya `None`, bukan 0. Baris dengan fitur `None` dikeluarkan dan dihitung untuk syarat 4.

- `persist`: 0/1, ada laporan dalam (t-3j, t] dengan saringan kausal (bagian 2). Jendela ini sama untuk semua L dan masuk model, sehingga yang diuji adalah hujan **di atas** persistensi.
- `klim` pada baris **latih** dihitung **luar-lipatan, tinggal-satu-musim**: baris musim m memakai klim dari musim latih lain. Baris validasi dan uji memakai klim dari seluruh musim latih (`nowcast_jkt.pasang_klim`, diuji butir 13). Sel kosong jatuh berurutan ke laju DKI (bulan, blok jam), laju lipatan, lalu laju latih.

Akibat latensi 6 jam: hujan terbaru yang terlihat berakhir 6 jam sebelum t. Untuk L = 3, hujan yang menyebabkan banjir dalam (t, t+3j] sebagian besar belum teramati. Jalur A menguji apakah hujan 6-12 jam sebelumnya (genangan lambat surut, air kiriman) masih menambah informasi di atas persistensi laporan. Bisa jadi tidak, dan itu jujur.

### A.3 Pembagian waktu (dibekukan sekarang, per musim Nov-Apr)

| Peran | Musim | Laporan tersaring |
| --- | --- | --- |
| latih (klim, koefisien) | 2016/17, 2017/18, 2018/19, 2019/20 | 2.937, 1.004, 132, 2.100 = **6.173** |
| validasi (Platt, pemeriksaan) | 2020/21, 2021/22 | 543, 118 = **661** |
| uji (dibuka SEKALI) | 2022/23, 2023/24, 2024/25 tanpa Mar-Apr, 2025/26 | 128, 608, 502, 52 = **1.290** |

Hitungan ini memakai `nowcast_jkt.peran` dan `hitung_bulanan`.

Yang dikeluarkan dari semua peran:
- bulan J3 2024-08 dan 2025-04, utuh;
- **2025-03**: kejadian J1/J2 di `bersama.KEJADIAN`, labelnya pernah dibaca;
- semua waktu sejak jangkar J4 (28 Okt 2026).

Hari puncak per tahun di `gsmap.py PUNCAK` sudah terlihat. Yang terlihat hanya tanggalnya, bukan lokasinya, dan hari itu tidak dipakai menyetel apa pun di pilot ini. Hal ini dicatat sebagai ancaman (bagian 8.1 butir 8).

**Daya musim uji kecil (2022/23 128 dan 2025/26 52), diputuskan sekarang:**
- Vonis memakai **gabungan keempat musim uji**, satu kali.
- Tidak ada vonis per musim.
- Skor per musim hanya dilaporkan, dan hanya untuk musim dengan >= 40 positif.
- Syarat tambahan kestabilan: BSS titik > 0 pada paling sedikit separuh musim uji yang punya >= 40 positif. Bila kurang dari dua musim memenuhi, syarat ini dilaporkan "tak teruji", bukan gagal (`nilai_L.stabil`).
- Bootstrap blok 5 hari (bagian 6) tetap berlaku, sehingga 2023/24 dan 2024/25 yang dominan terlihat lebar CI-nya, bukan disembunyikan.

### A.4 Model, pembanding, kriteria

- **Model** (`hujan`): regresi logistik dengan offset `logit(klim)`, fitur `persist` + log1p(h1, h3, h6, a24), L2 λ = 1 pada fitur terstandar. Satu model per tenggang, dilatih pada musim latih. Platt dipasang pada prakiraan musim validasi. Model lalu dibekukan sebelum uji dibuka (`latih` menulis `nowcast_jkt_model.json`, `nilai` menolak model yang belum persis ada di `origin/main`). Tidak ada latih bergulir di Jalur A.
- **Pembanding** (latih dan Platt yang sama, baris yang sama):
  - (a1) `klim`;
  - (a2 = a3) persistensi + `klim`. Model sendiri berisi persistensi + hujan, jadi ΔBS(a2 - model) mengukur **tambahan informasi hujan** di atas persistensi;
  - "Hujan sempurna" (plafon informasi hujan): **ditunda ke amandemen, bukan syarat** (bagian 9b).
  - Pembanding BMKG tidak ada, karena arsip CAP baru mulai 19 Okt 2026.
- **Kriteria**: bagian 7 apa adanya, tanpa syarat BMKG pada syarat 2, ditambah syarat kestabilan A.3. Vonis utama L = 3; kurva 1/2/3/4/6 dengan Holm. Σp/Σy hanya dilaporkan (bagian 7).
- **Validasi tidak boleh mengubah fitur** setelah melihat hasil. Bila model kalah dari persistensi di validasi, hasil itu dicatat, dan uji tetap dibuka sekali dengan model yang sama. Ini supaya tidak ada iterasi pada data yang dipakai menilai.

### A.5 Urutan kerja Jalur A (SATU-SATUNYA penjaga; jangkar commit)

Arsip label sudah ada di disk. Karena itu, satu-satunya yang mencegah penyetelan pada label adalah urutan ini. Ini **kunci urutan, bukan pagar teknis**: siapa pun bisa membuka berkas label di luar `nowcast_jkt.py`. Kode hanya menjamin bahwa jalur `latih`/`nilai` tidak berjalan di luar urutan, dan jejak git menunjukkan kapan kunci dibuat.

1. Unduh IMERG (A.6), tanpa label.
2. `fitur_hujan`, tanpa label.
3. Sesi induk meng-commit dan push PRAREG + `nowcast_jkt.py`, lalu menjalankan `nowcast_jkt.py jangkar` SEKALI. Perintah itu menolak bila berkas kotor atau HEAD belum di `origin/main`. Hasilnya `nowcast_jkt_sidik.json`, yang lalu di-commit dan di-push.
4. `latih --jalur A`. Perintah ini memeriksa dulu bahwa model belum ada, baru memanggil `muat_label()`.
   - `muat_label()` tidak berparameter; versi privat `_muat_label` hanya untuk uji.
   - Ia satu-satunya fungsi tingkat atas yang membuka berkas laporan berlokasi. Ini diuji lewat AST: akses kunci `lon`/`lat` dengan dua gaya kutip dan `.get` hanya ada di `_muat_label` dan dua fungsi berdata non-laporan (`fitur`: pos TMA dan kecamatan; `baca_gsmap`: sel GSMaP). Nama `PB_BANJIR` hanya ada di `_muat_label` dan `cmd_inventaris` (hitungan per bulan), dan `dari_cache` hanya ada di `_muat_label`.
   - Ia **menolak** bila kunci tidak sah: berkas sidik tidak ada, sidik beda, jangkar bukan leluhur HEAD atau tidak di `origin/main`, atau berkas beku berbeda dari commit jangkar.
   - `latih` mencatat `sha_label` (sha256 id, waktu, dan kecamatan label, mentah, dan tanpa-saring).
5. Commit dan push `nowcast_jkt_model.json`.
6. `nilai --jalur A`, sekali. Perintah ini memeriksa dulu: penanda `nowcast_jkt.buka`, sidik model, dan model persis ada di `origin/main`. Baru sesudah itu ia memanggil `muat_label()` dan menolak bila `sha_label` beda dari saat latih. Ia menulis penanda lebih dulu, baru `nowcast_jkt_vonis.json`.

Kode `latih/nilai` dan uji sintetiknya (positif disuntik dari peluang yang diketahui, Brier dekat Brier peluang benar, model nol tidak lulus) **sudah ditulis sebelum kunci pertama**, sehingga ikut sidik.

### A.6 Spesifikasi workflow unduhan (untuk `mekanik-mesin`; jangan dibuat oleh pengerja banjir)

- **Nama**: `nowcast-jkt-imerg.yml`, hanya `workflow_dispatch`.
- **Masukan**: `bulan_awal` (bawaan 2016-11), `bulan_akhir` (bawaan 2026-04), `maks_paralel` (bawaan 3).
- **Matriks**: satu job per bulan Nov-Apr dalam rentang, 60 bulan. `max-parallel` 3 supaya sopan ke GES DISC. `fail-fast: false`.
- **Langkah per job**:
  1. checkout;
  2. pulihkan `data/raw/banjir/nowcast_jkt/imerg/<bulan>.jsonl.gz` bila ada (artefak atau R2 `arsip/imerg_jkt/`);
  3. `python3 scripts/banjir/nowcast_jkt.py uji`;
  4. `EARTHDATA_TOKEN=${{ secrets.EARTHDATA_TOKEN }} python3 scripts/banjir/nowcast_jkt.py imerg_unduh --bulan <bulan>`; perintah ini melanjutkan sendiri, dan kode 1 berarti tidak ada kemajuan;
  5. unggah berkas ke R2 `arsip/imerg_jkt/<bulan>.jsonl.gz` dengan pola `arsip_pos.py`: get dulu, jangan timpa objek yang lebih lengkap.
- **Job akhir**: menggabung hitungan slot per bulan (harus 48 x hari) ke ringkasan log. Tidak ada commit data, karena ukurannya ~20 MB mentah.
- **Biaya**:
  - ~1.812 hari x (1 daftar folder + 48 slot) = ~88.800 permintaan;
  - ~1,2 detik per permintaan (diukur dari sini pada `.dds`) memberi ~30 jam total, ~30 menit per bulan, ~10 jam dinding dengan 3 paralel;
  - kiriman data ~1 KB per slot = ~90 MB;
  - simpanan gzip ~3-5 MB total (49 nilai per slot).
- **GSMaP sebagai cadangan**: satu job `probe` dengan `GSMAP_USER/PASS` menulis ke log (a) apakah `/realtime_ver/v8/hourly_G/2016/11/01/` ada dan (b) ukuran satu berkas (`ftp.size`). Unduhan GSMaP arsip penuh hanya dirancang bila (a) benar.

## 3. Waktu terbit dan data yang boleh dipakai (Jalur B)

Pada waktu terbit t, hanya data yang tersedia sebelum t yang boleh dipakai:

| Data | Syarat boleh dipakai pada t | Asal latensi |
| --- | --- | --- |
| TMA (DSDA `d:*`, SIHKA) | stempel bacaan <= t - `LAT_TMA` (60 menit); bacaan terakhir yang dipakai tidak lebih tua dari t - 3 jam | Worker memanen DSDA menit 38 dan SIHKA menit 23 tiap jam. **Sementara**: angka ini dinaikkan ke p95 latensi terukur sebelum sidik bila kolom waktu diterima sudah ada (bagian 8) |
| CAP BMKG | `pertama_dilihat <= t` dan `mulai <= t < selesai`; titik pusat kecamatan di dalam poligon (bbox bila tanpa poligon) | dicatat per baris di `cuaca_arsip` |
| GSMaP NRT per jam | jam [h, h+1) dipakai bila h + 1 jam + `LAT_GSMAP` (4 jam) <= t | klaim JAXA. **Bersyarat**: fitur ini dikeluarkan bila p95 umur jam terbaru yang terukur lebih dari 5 jam sebelum sidik |
| IMERG Early 30 menit | slot berakhir e dipakai bila e + `LAT_IMERG` (6 jam) <= t | terukur dari stempel daftar folder GES DISC (bagian A.1) |
| ERA5, logbook, DIBI | tidak boleh menjadi fitur (latensi berhari-hari, atau resolusi harian/kabupaten) | |
| PetaBencana sebelum t | hanya untuk pembanding persistensi, dengan `created_at <= t` | |

**3.3 Cara terbit pada fase 2.** Putar ulang harian: pada hari D+1, fitur dan peluang untuk tiap jam hari D dihitung dari arsip dengan aturan latensi di atas, lalu ditulis append-only (rantai hash, sidik kode) dan di-push. Semua ini terjadi sebelum label hari D boleh dibaca (paling cepat D+8). Putar ulang setara dengan terbit langsung **hanya bila** arsip sama dengan yang tersedia pada t. Itu benar untuk CAP (`pertama_dilihat`), tetapi untuk TMA belum terbukti (bagian 8.1 butir 5). Terbit langsung tiap jam ke layar baru boleh sesudah lulus dan sesudah ada penjadwal tiap jam.

## 4. Fitur (Jalur B; dibekukan, sedikit)

Untuk tiap kecamatan k dan waktu t, dihitung `nowcast_jkt.fitur` tanpa label:

| Fitur | Isi |
| --- | --- |
| `klim` | offset logit: laju dasar kecamatan x bulan x blok jam (4 blok 6 jam WIB), PetaBencana tersaring Nov-Apr pada musim **latih + validasi Jalur A (2016/17-2021/22)**, susut ke laju DKI dengan pseudo-hitungan 20 jam-kecamatan. Musim uji Jalur A tidak pernah dibaca untuk Jalur B. Dihitung sekali sebelum sidik |
| `rasio_siaga3` | TMA terakhir dibagi ambang Siaga 3 (`a3`) pos DSDA berambang terdekat dalam 4 km dari pusat kecamatan; tidak ada pos = 0 plus indikator `tanpa_pos` |
| `naik3_lokal` | kenaikan TMA 3 jam pos itu (cm) |
| `katulampa_naik3`, `depok_naik3` | kenaikan 3 jam pos hulu Ciliwung (DSDA, cadangan SIHKA). Bernilai untuk semua kecamatan pada fase 2a. Fase 2b memberi interaksi dengan bendera "kecamatan dilalui Ciliwung" dari geometri OSM, dibekukan sebelum sidik |
| `cap_aktif` | 0/1 |
| `gsmap3` | jumlah 3 jam GSMaP terakhir yang tersedia, sel terdekat (bersyarat, bagian 3) |

Nilai hilang diisi 0 dan diberi indikator. Standardisasi memakai rerata dan simpangan baku dari arsip TMA 19 Okt 2026 sampai tanggal sidik, tanpa label.

**4.2 Waktu tempuh sebagai batas fisik.** `nowcast_jkt.py tempuh` menghitung korelasi silang kenaikan 1 jam pos hulu vs pos hilir pada jeda 0-12 jam, tanpa label. Hasil kemarau 2026: Katulampa -> Depok puncak 2 jam (r = 0,17, n = 128). Depok/Katulampa -> Manggarai belum bisa dihitung. Sebelum sidik, hitungan diulang dengan data musim hujan yang ada dan dicatat di bagian 10. Hasilnya **tidak menyetel fitur**: fitur hulu tetap kenaikan 3 jam, dan jeda tempuh hanya dipakai untuk menafsirkan kurva skor vs tenggang (tenggang di atas jeda tempuh hulu -> kecamatan tidak bisa ditolong pos hulu).

## 5. Model dan kalibrasi (Jalur B)

- **Model**: regresi logistik dengan offset `logit(klim)`, fitur bagian 4, penalti L2 λ = 1 pada fitur terstandar. Satu model per tenggang L.
- **Latih asal-bergulir** (prosedur dibekukan, bukan koefisien): tiap Senin 00.00 WIB, model dilatih ulang pada semua baris berlabel yang jendelanya selesai paling lambat 7 hari sebelumnya. Model baru berlaku untuk jam terbit minggu itu.
- **Kalibrasi**: Platt (2 parameter) pada prakiraan luar-sampel model-model sebelumnya. Platt dipakai hanya bila sudah ada >= 30 positif luar-sampel. Isotonik tidak dipakai, karena positifnya terlalu sedikit dan isotonik akan menghafal.
- **Mulai dingin**: selama data latih punya < 20 positif untuk L itu, yang terbit adalah `klim` saja dan ditandai "belum terlatih". Baris itu tidak ikut dinilai, untuk model maupun pembanding.
- **Pembanding** (prosedur latih bergulir dan Platt yang sama, unit sama):
  - (a1) klimatologi `klim`;
  - (a2) persistensi: indikator ada laporan di kecamatan dalam (t-3j, t] ditambah `klim`;
  - (b) BMKG saja: `cap_aktif` ditambah `klim`.

## 6. Pembagian waktu dan skor

- **Jalur A**: pembagian dan vonis di bagian A.3-A.4.
- **Jalur B**: TMA dan CAP tidak punya arsip musim hujan, jadi tidak diuji di arsip. Prospektif yang memutuskan: mulai jam terbit pertama sesudah commit sidik di-push, Nov-Apr, sampai 30 Apr 2027 (label ditutup 8 Mei 2027). Bila belum cukup data, berlanjut ke musim 2027/28 dengan kriteria yang sama. Hujan di Jalur B memakai IMERG Early dengan `LAT_IMERG` yang sama. GSMaP NRT (`gsmap3`, `LAT_GSMAP` 4 jam) hanya dipakai bila p95 latensi terukurnya <= 5 jam sebelum sidik, dan bila Jalur A tidak menolak hujan sama sekali.
- **Skor per tenggang L yang dikerjakan `nilai_L`** (dilaporkan sebagai kurva vs L):
  - Brier Score per model dan BSS terhadap klim;
  - ΔBS terhadap persistensi, dan terhadap BMKG (Jalur B saja);
  - p bootstrap per pembanding, p_L, dan p Holm;
  - **CI95 kemiringan kalibrasi sebagai angka** (dicetak per L);
  - rasio Σp/Σy;
  - BSS per musim;
  - jumlah episode dan positif;
  - proporsi hilang positif/negatif.
- Untuk Jalur A, ringkasan yang sama dihitung juga pada **bagian uji ber-V07C** (t >= 2026-03-04, `IMERG_V07C_MULAI`, deskriptif) dan pada **label tanpa saringan** (sensitivitas).
- Reliabilitas per bin + Wilson, ETS/POD/FAR pada p >= 0,3, dan POD pada FAR tetap: **ditunda ke amandemen, bukan syarat** (bagian 9b).
- **Bootstrap**: blok **5 hari kalender** berpasangan (semua kecamatan dan jam di blok itu ikut bersama). Blok tidak ditentukan dari label, jadi resampel tidak bergantung pada hasil. B = 10.000, benih 20261101. Model dan pembanding memakai resampel yang sama.
- **p-nilai**: p = (jumlah ulangan dengan ΔBS* <= 0 + 1)/(B + 1), dihitung per pembanding. Per tenggang, syarat 1 dan 2 digabung sebagai p_L = maks p (uji irisan-gabungan).
- **Kemiringan kalibrasi**: regresi logistik y ~ a + b logit(p) pada data ber-bin 0,25 logit, dengan CI dari 1.000 resampel blok yang sama. Resampel yang terpisah sempurna dibuang dan jumlahnya dilaporkan. **Lebih dari 5% resampel gagal = syarat 3 gagal.**
- **Satuan**: skor, jumlah positif, dan syarat hilang semuanya memakai unit yang sama (kecamatan x jam terbit, tiap jam). n efektif = jumlah episode.

## 7. Kriteria lulus (sama untuk tiap L)

Tenggang L LULUS bila kelima syarat berikut terpenuhi:

0. Ada paling sedikit **20 episode**. Episode = hari WIB yang punya unit positif, dengan jeda < 2 hari digabung. Kurang dari itu: "belum cukup data", bukan gagal. Jumlah unit positif dilaporkan.
   Alasan memilih 20 episode, bukan 100 positif: positif di dalam satu badai saling bergantung (puluhan kecamatan x jam dari satu hujan), sehingga 100 positif bisa berasal dari 2-3 badai. Episode adalah satuan yang mendekati independen dan sama dengan n efektif bootstrap.
1. BSS terhadap klim: p (ΔBS klim - model) dari bootstrap.
2. ΔBS (persistensi - model), dan untuk Jalur B juga ΔBS (BMKG - model). Syarat 1 dan 2 lulus bersama bila p_L = maks p <= 0,05 (utama L = 3) atau p Holm <= 0,05 (kurva).
3. Kalibrasi: **seluruh CI95 kemiringan berada di dalam [0,7; 1,4]**, dan paling banyak 5% resampel gagal. Batas ini dipertahankan.
   Daya dari `nowcast_jkt.py daya --ulang 8` (sintetik, 700 hari x 40 unit, kemiringan benar γ, sebaran logit unit `sd_unit` 0,8 atau 0,3). Kolomnya: lulus dari 8, lalu lebar CI rata-rata:

   | positif | γ = 0,85 | γ = 1,0 | γ = 1,2 |
   | --- | --- | --- | --- |
   | ~170-190 (sd 0,8 / 0,3) | 4/8, 0,27 / 3/8, 0,36 | 8/8, 0,27 / 7/8, 0,37 | 5/8, 0,28 / 4/8, 0,38 |
   | ~335 | 4/8, 0,20 / 5/8, 0,26 | 8/8, 0,20 / 8/8, 0,25 | 8/8, 0,20 / 7/8, 0,27 |
   | ~785 | 8/8, 0,13 / 8/8, 0,17 | 8/8, 0,14 / 8/8, 0,17 | 8/8, 0,14 / 8/8, 0,18 |

   Model yang kemiringannya benar (γ = 1) hampir selalu lulus mulai ~165 positif. Model yang terlalu yakin atau terlalu ragu (γ 0,85 atau 1,2) baru lulus andal pada ratusan positif. Itu memang maksud syaratnya.
   Batas tabel ini: simulasi menyebar positif ke 700 hari sehingga menghasilkan 122-193 episode, padahal 1.290 laporan uji kemungkinan jatuh pada puluhan episode. Bootstrap blok 5 hari memakai episode sebagai satuan efektif, jadi CI kemiringan nyata bisa sampai dua kali lebih lebar dari tabel dan daya untuk γ 0,85 atau 1,2 lebih rendah. Perkiraan kasar positif L = 3 (tanpa membaca lokasi atau waktu): batas atas 1.290 x 3 ≈ 3.900 kecamatan-jam, dikali 0,3-0,5 karena laporan menggumpal, sekitar 600-1.500 sebelum unit hilang. Ini perkiraan, bukan hasil hitung.
4. Data hilang (beku):
   - proporsi unit **positif** yang hilang <= 10%;
   - |proporsi hilang positif - proporsi hilang negatif| <= 1,96 x galat baku **dua-proporsi terpoolkan**, sqrt(p̄(1-p̄)(1/n_pos + 1/n_neg));
   - baris yang hilang untuk model mana pun dikeluarkan untuk **semua** model dan pembanding.

**Σp/Σy (kalibrasi rata-rata)**: untuk Jalur A dilaporkan saja, tidak menjadi faktor lulus. Untuk Jalur B, syarat Σp/Σy dalam [0,7; 1,43] tetap menjadi faktor lulus.
- Alasan untuk Jalur A: laju laporan runtuh (2.937 pada 2016/17, 52 pada 2025/26), jadi tingkat dasar musim uji jauh di bawah latih/validasi. Pilihan lain, klim dan Platt bergulir kausal, menambah dua kenop (panjang jendela, laju pembaruan) yang harus dipilih tanpa data. Dengan 1.290 laporan uji, estimasi bergulirnya juga sangat bising.
- Kemiringan dan ΔBS bersifat relatif (model dan pembanding memakai offset klim yang sama), jadi tetap sah walau tingkat dasar bergeser.
- Akibatnya, Jalur A **tidak bisa** menjamin "30% = 30%" pada laju laporan 2026. Kalibrasi absolut hanya bisa dibuktikan Jalur B.

Aturan vonis:
- **Vonis utama: L = 3 jam**, α = 0,05 tanpa koreksi.
- **Tenggang andal terpanjang** = L terbesar sehingga semua L' <= L lulus, dengan koreksi Holm atas 5 tenggang pada syarat 1 dan 2. Bila L = 3 lulus tetapi L = 1 atau 2 tidak, keganjilan itu dilaporkan dan klaim "andal sampai 3 jam" tidak dibuat.
- Vonis dikunci sekali (`nowcast_jkt.buka`).

Arti LULUS, ditulis jujur: peluang model lebih tepat (Brier) daripada klimatologi, persistensi laporan, dan peringatan BMKG, untuk **laporan warga PetaBencana**, bukan untuk banjir sebenarnya. Sebelum lulus, layar tidak menampilkan peluang, atau menampilkannya dengan pill "Hipotesis, belum lolos uji".

## 8. Kebijakan bila data kurang (Jalur B; Jalur A di bagian A.2-A.3)

- **Fitur hilang** pada satu jam terbit: diisi 0 plus indikator (bagian 4). Jam terbit tetap dinilai.
- **Pos lokal mati > 24 jam**: kecamatan memakai `tanpa_pos` sampai pos hidup lagi. Jumlah jamnya dilaporkan.
- **Sumber mati total** (DSDA dan SIHKA, atau CAP) > 6 jam: jam-jam itu keluar dari penilaian dan dicatat di `nowcast_jkt_gagal.jsonl` (fase 2). Jam itu tidak diputar ulang selektif sesudah label terlihat.
- **Latensi TMA**: bila kolom waktu diterima belum ada saat sidik, `LAT_TMA` dinaikkan ke 2 jam (konservatif) dan dicatat. Fitur hulu tetap dipakai, karena jeda tempuh Ciliwung beberapa jam.
- **Label kurang** (syarat 0): pengumpulan berlanjut ke musim berikutnya. Sumber label kedua hanya boleh masuk lewat amandemen tertulis sebelum datanya dibuka.

## 8.1 Ancaman validitas

1. **Bias pelapor**: PetaBencana berasal dari warga yang punya ponsel dan mau melapor. Kepadatan laporan mengikuti penduduk dan kampanye, bukan kedalaman air. Klim per kecamatan menyerap sebagian bias tetap, tetapi tidak menyerap bias waktu.
2. **Laju laporan runtuh**: 2.937 laporan pada 2016/17, 52 pada 2025/26. Pergeseran laju antar musim membuat klim latih terlalu tinggi untuk musim uji dan 2026/27. Σp/Σy menunjukkannya (dilaporkan; faktor lulus hanya di Jalur B). Klim tidak disetel ulang pada data uji.
3. **Latihan/drill** (`DIAGNOSIS-J3.md`: 98-99,6% label uji J3 adalah latihan): saringan mengurangi masalah ini tetapi tidak membuktikannya hilang, jadi `nilai` juga menghitung sensitivitas tanpa saringan. Latihan pada hari kering tidak berkorelasi dengan TMA/hujan dan akan menurunkan skor, bukan menaikkannya.
4. **Cakupan malam**: laporan malam/subuh lebih sedikit karena orang tidur. Banjir pukul 02.00 tercatat pukul 06.00, jadi tenggang semu 4 jam. Blok jam di klim menyerap rata-ratanya. Kurva vs L harus dibaca dengan ini: L panjang tampak lebih baik karena laporan terlambat.
5. **Latensi TMA tidak terbukti**: arsip tidak menyimpan waktu diterima. Bacaan SIHKA yang tiba terlambat (raw 6 jam) bisa masuk fitur dalam putar ulang, padahal saat t belum ada. Dampaknya optimistis, dan karena itu `LAT_TMA` konservatif dipakai sampai kolom waktu diterima tersedia.
6. **Pos TMA dekat laut** (Cengkareng Drain, Pasar Ikan, Marina Ancol): dipengaruhi pasang-surut. Rasio Siaga 3 bisa > 1 di hari kering (Cengkareng Drain 1,38 pada 31 Okt 2026). Ini fitur apa adanya, tidak dikoreksi.
7. **Satu kota, satu musim**: hasil tidak berlaku di luar Jakarta.
8. **Jalur A, label arsip pernah disentuh**: tanggal hari puncak per tahun (`gsmap.py PUNCAK`) dan hitungan per bulan sudah terlihat. Lokasi laporan musim uji belum dibaca untuk pilot ini. Bulan kejadian J1/J2 di musim uji (2025-03) dikeluarkan.
9. **Jalur B: kemungkinan besar "belum cukup data"**: 52 laporan pada 2025/26. Bila 2026/27 serupa, syarat 0 (20 episode) kemungkinan tidak tercapai. Vonis itu bukan kegagalan model, dan pengumpulan berlanjut. Tidak ada label tambahan (keputusan pemilik "pakai yang ada").
10. **IMERG di kota**: sel 0,1 derajat (~11 km) dan hujan konvektif Jakarta yang berumur kurang dari 1 jam. Early Run cenderung meremehkan puncak. Ini menurunkan skor dan tidak membuatnya optimistis.
11. **Persistensi kausal vs label penuh**: label memakai burst seharian (tidak kausal), persistensi memakai burst sampai t. Laporan latihan massal yang belum terlihat sebagai burst pada t masuk persistensi. Ini benar untuk operasional, tetapi membuat persistensi sedikit lebih buruk daripada persistensi berlabel bersih.

## 9. Kunci

Sidik (`nowcast_jkt.manifes`) = sha256 atas:
- PRAREG ini;
- `nowcast_jkt.py`, termasuk `latih/nilai`, `daya`, dan uji sintetiknya;
- semua yang membentuk label, jendela J3, kecamatan, dan cek git: `genangan/petabencana.py`, `lab_genangan_radar.py`, `genangan/bersama.py`, `genangan/mesin.mjs` (tabel KEJADIAN_J3), `genangan/kunci_j4.py` (fungsi git), `wilayah.py`, `umum.py`, `public/geo/kecamatan/31.json`, `public/banjir/data/pusat_kec.json`;
- **hasil** `jendela_j3()`;
- dari `scripts/cuaca/imerg.py`, **isi fungsi `parse`** (`inspect.getsource`) dan konstanta `HILANG`.

Berkas `imerg.py` milik `cuaca-udara` sengaja tidak di-hash utuh, supaya perubahan lain di sana tidak membatalkan kunci. Perubahan pada `parse` tetap membatalkannya.

Tabel `klim` dihitung ulang dari label oleh kode yang sudah tersidik, jadi tidak perlu di-hash terpisah. Jalur A dikunci dua kali: protokol sebelum label latih dibaca (`jangkar`), lalu model sebelum uji dibuka (`nowcast_jkt_model.json` di `origin/main`). Penguncinya dengan pola `kunci_j4.py` (berkas `nowcast_jkt_sidik.json`, jangkar = commit yang sudah di-push). Kunci dibuat pada fase 2, sebelum jam terbit pertama yang dinilai. Mengubah apa pun sesudah jangkar = kriteria baru dan jam penilaian mulai dari nol.

## 9b. Ditunda ke amandemen, bukan syarat

Butir berikut pernah ditulis di draf, tetapi kode belum mengerjakannya. Karena itu butir ini tidak menjadi syarat dan tidak boleh dikutip sebagai hasil. Masing-masing hanya boleh masuk lewat amandemen tertulis **sebelum** uji dibuka:
- pembanding "hujan sempurna" (IMERG atau ERA5 dalam (t, t+L] tanpa latensi);
- unit pendamping kota administrasi (5);
- subset awal kejadian (tanpa laporan dalam (t-6j, t]);
- reliabilitas per bin (kuantil dan tetap) dengan selang Wilson;
- ETS/POD/FAR pada p >= 0,3;
- POD pada FAR tetap 0,5 dan 0,7.

## 10. Catatan perubahan sebelum kunci

- 1 Nov 2026: draf fase 1. Tenggang 1/2/3/4/6 dengan kriteria sama per tenggang dan kurva skor vs tenggang (permintaan pemilik). Waktu tempuh dari korelasi silang ditambahkan sebagai batas fisik tafsir.
- 1 Nov 2026: tinjauan `validasi-model` (PERLU PERBAIKAN), seluruh butirnya dikerjakan:
  - klim luar-lipatan;
  - persistensi masuk model (a3) dengan saringan kausal;
  - LAT_IMERG 6 jam dari 21 hari pengukuran;
  - V07B/V07C tanpa tumpang, sehingga vonis "batas atas";
  - bootstrap blok 5 hari, B 10.000, p maks dan Holm;
  - syarat 0 = 20 episode;
  - kemiringan di dalam [0,7; 1,4];
  - Σp/Σy hanya dilaporkan untuk Jalur A;
  - syarat hilang pada positif;
  - sidik fungsi `parse`;
  - latih/nilai + uji sintetik sebelum kunci;
  - jendela label tidak menyentuh bulan terlarang;
  - penjaga `muat_label`.
- 1 Nov 2026: pemeriksaan ulang `validasi-model`:
  - persistensi dan sensitivitas dari `dari_cache()` (PB_MENTAH lama tanpa tipe/teks, persist selalu 0), dengan penjaga flood > 0;
  - skor V07C dan sensitivitas dikerjakan; janji yang belum ada di kode dipindah ke bagian 9b;
  - sidik diperluas;
  - `muat_label` tanpa parameter, ditambah `sha_label` dan urutan cek;
  - syarat 4 memakai z terpoolkan;
  - gerbang 5% resampel kemiringan gagal;
  - angka daya dari `daya`.
- 1 Nov 2026: keputusan pemilik "pakai yang ada". Draf dipecah jadi Jalur A (IMERG Early, arsip memutuskan, pembagian musim beku, 2025-03 dikeluarkan) dan Jalur B (prospektif). Uji arsip A0 "hanya menolak" diganti Jalur A. `klim` Jalur B dibatasi ke musim 2016/17-2021/22.

## 11. Amandemen

### A1 (1 Nov 2026, sesudah jangkar 0ad40db0, sebelum model ada dan sebelum uji dibuka)

**Kejadian.** Jangkar pertama memakai commit `50305ad8`, dan berkas sidiknya di-commit di `0ad40db0`. Run unduhan IMERG Actions **41314881450** (bulan 2017-01) gagal total:
- hasilnya `0 slot baru, 1488 gagal`;
- tiap balasan OPeNDAP (365 karakter) tercatat "balasan tak terurai" oleh diagnosa `imerg_unduh`;
- format balasan live menaruh nama variabel di depan indeks (`precipitation[0][i], v, ...`), sedangkan `imerg.parse` (milik `cuaca-udara`) hanya mengenali baris yang diawali indeks (`[0][i], ...`), sehingga mengembalikan `{}`.

**Belum ada satu pun data IMERG yang terunduh.**

**Latih yang gagal (dicatat jujur).** Sesudah jangkar, sesi induk menjalankan `nowcast_jkt.py latih --jalur A` satu kali. Yang terjadi:
1. `muat_label()` lolos kunci. Ia memuat ke memori seluruh arsip label tersaring dan cache mentah, **semua musim termasuk musim uji**, karena `muat_label` tidak menyaring per peran. Ia juga menghitung `sha_label` atas semuanya.
2. `susun()` hanya membangun baris untuk peran latih dan validasi pada L = 1 (`peran(t, L)`): label y untuk baris itu dan klim dari baris latih.
3. `latih()` lalu berhenti dengan "matriks singular", karena semua baris punya fitur hujan `None` (cache IMERG kosong), sehingga himpunan latih dan validasi kosong.

Akibatnya:
- tidak ada model yang ditulis;
- tidak ada koefisien, skor, atau hitungan yang dicetak; jejak galat hanya berisi tumpukan panggilan;
- label musim uji **tidak dipakai di perhitungan apa pun dan tidak tampil**, tetapi sempat termuat ke memori dan ikut masuk hash;
- label latih dan validasi L = 1 sempat dihitung di memori tanpa ditampilkan.

**Perubahan (satu-satunya):**
1. `scripts/cuaca/imerg.py` `parse` (perbaikan `cuaca-udara`): nama variabel di depan indeks kini opsional, dengan fixture live 7 x 7 di ujinya. Hash `getsource(parse)` di sidik berubah, sehingga kunci harus diperbarui.
2. `nowcast_jkt.py`, prosedural saja:
   - `jangkar --amandemen "A<n>: alasan"`: menolak bila alasan kosong, bila belum pernah dijangkar, atau bila model/penanda buka sudah ada; rekaman jangkar lama disimpan di `riwayat`;
   - `latih` memeriksa kelengkapan IMERG (>= 95% slot 30 menit tiap bulan Nov-Apr musim latih dan validasi, `imerg_lengkap`) **sebelum** memanggil `muat_label`, supaya label tidak lagi dibaca ketika hujan belum ada.

Fitur, latensi, model, kalibrasi, pembagian musim, pembanding, dan kriteria lulus **tidak berubah**. Uji belum pernah dibuka. Sidik baru ditulis oleh `jangkar --amandemen` sesudah ketiga berkas di-commit dan di-push.
