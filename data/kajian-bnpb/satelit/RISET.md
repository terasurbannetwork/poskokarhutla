# RISET: Pemantauan satelit semua bencana, Himawari dulu

Dasar riset untuk paket `data/kajian-bnpb/satelit/`. Keputusan pemilik K9 (25 Nov 2026): bangun pemantauan satelit untuk tiap bencana yang bisa dilihat satelit, mulai dari Himawari karena datanya baru tiap 10 menit.

Tanda: **[terukur]** = dicek di sesi ini (berkas repo, log Actions, daftar bucket). **[sumber]** = dari tautan yang disebut. **[belum diverifikasi]** = pengetahuan umum atau klaim yang belum dicek ke dokumen asli; jangan dikodekan sebelum dicek.

## 1. Yang sudah ada di repo

### 1.1 Titik panas Himawari WLF (JAXA P-Tree)

- `scripts/data/himawari.py:1-20`: menarik CSV L2 WLF v010 per 10 menit dari FTP `ftp.ptree.jaxa.jp` (`HOST`, baris 21), login `PTREE_USER`/`PTREE_PASS` (baris 286). Jendela 3 jam untuk `baris`, 13 jam untuk `penanda`.
- Saringan: `deteksi()` membuang titik di luar kotak Indonesia, bendera gunung api (`gunung > 0`, baris 51), dan reliability di bawah ambang. `baris` menyimpan reliability >= 3 (`BARIS_REL_MIN`, baris 29); `penanda` hanya reliability 5 (baris 28).
- `penanda()` (baris 108): sinyal dini belum terkonfirmasi, aturan PKH-04 dari Pantau Karhutla (MIT): terlihat 2 kali dalam 5-60 menit dan 3 km, tanpa VIIRS 5 km selama 72 jam, di luar 2 km sumber statis (`public/data/titik_palsu.json`) dan 1,5 km daftar alarm palsu.
- `scripts/data/himawari_alarm_palsu.csv`: 431 piksel yang ditandai >= 7 hari tetapi tidak pernah dilihat VIIRS, disalin dari Pantau Karhutla (MIT).
- `scripts/data/himawari_presisi.json`: presisi lawan VIIRS dari SATU jendela 3 jam (acuan 19 Okt 2026 07.10Z): reliability 3 cocok 66,8% (n 295), reliability 5 cocok 82,0% (n 133), jarak 3 km, selisih 30 menit. Catatannya sendiri menyebut angka ini kasar. Pembanding Pantau Karhutla 47 hari: 55%, 74%, 91% untuk reliability 1, 3, 5.
- Worker: `src/alarm_himawari.js` mengubah penanda jadi baris D1 `alarm_himawari` (siaga, terkunci saat tugas api VIIRS dibuat dalam 4 km, hilang sesudah 6 jam), dipanggil cron `* * * * *` saat etag R2 berubah (`src/worker.js:1031`). `/api/himawari` membaca R2 `data/himawari.json` (`src/worker.js:929`); `src/instansi.js:1029` memakainya untuk tugas api (umur <= 60 menit, >= 2 pindaian, level >= 2).
- Workflow `.github/workflows/himawari.yml`: cron `7,37 * * * *`, unggah ke R2 `data/himawari.json` plus arsip `arsip/himawari/YYYY/MM/DD/HHMM.json.gz`, tanpa commit.

### 1.2 Mengapa `/api/status` menyebut himawari basi **[terukur]**

1. **Penyebab langsung: server FTP JAXA menolak sambungan sejak 18 Nov 2026.** Run sukses terakhir `himawari.yml` 18 Nov 2026 09.57Z. Semua run sesudahnya (20 run sejak 21 Nov saja) gagal di `ftplib.FTP(HOST, timeout=30)` (`himawari.py:285`) dengan `ConnectionResetError: [Errno 104]` (18 Nov 10.40Z) lalu `ConnectionRefusedError: [Errno 111]` (23 dan 24 Nov). Gagalnya di TCP, sebelum login, jadi bukan sandi salah.
2. Dari Mac pemilik pada 25 Nov, port 21, 990 (FTPS), dan 2051 (SFTP) `ftp.ptree.jaxa.jp` juga tertutup, sedangkan `noaa-himawari9.s3.amazonaws.com:443` terbuka. Jadi masalahnya bukan blokir IP GitHub saja. Situs `www.eorc.jaxa.jp/ptree/*` membalas 404 ke pengambil web di sesi ini. **[belum diverifikasi]** apakah P-Tree pindah alamat atau menghentikan FTP polos. Konteks: G-Portal JAXA menghentikan FTP pada 2025, memperbarui sistem 1 Okt 2026, dan SFTP barunya hanya menerima kunci publik ([G-Portal renewal](https://gportal.jaxa.jp/renewal/en/index.html)). P-Tree adalah layanan terpisah, jadi pola ini belum tentu berlaku. FAQ P-Tree versi lama menyebut FTPS port 990 dan SFTP port 2051 (hasil pencarian, halamannya kini 404).
3. **Penyebab kedua: penjadwalan.** Dari 48 run terjadwal per hari, GitHub hanya memicu 12 run `schedule` dalam 4 hari sejak 21 Nov. Sisanya datang dari `workflow_dispatch` lewat `scripts/terbit/jaga_jadwal.mjs:21` (`maks: 50` menit), yang dipicu `jaga.yml` tiap jam. Jadi walau FTP pulih, kadens nyatanya sekitar 1 jam, bukan 30 menit.
4. Cara kegagalan: skrip berhenti tanpa menulis (benar, berkas lama tidak dirusak), `/api/status` menghitung umur dari medan `acuan` di R2 (`src/himawari.js:20`, `src/worker.js:538-539`), jadi umurnya naik terus. Langkah `awan_tumbuh` di workflow yang sama tetap sukses (log 24 Nov 20.54Z: 515 kab, 18,3 MB, 4,5 detik) karena sumbernya NOAA.
5. Akibat: alarm Himawari dan kolom `himawari_awal` di tugas api mati sejak 18 Nov tanpa pemberitahuan di layar selain status basi.

Perbaikan yang bisa dicoba tanpa pustaka luar: (a) tanya JAXA alamat dan protokol baru; (b) bila FTPS terbuka lagi, `ftplib.FTP_TLS` stdlib cukup (FTPS implisit port 990 butuh subkelas kecil yang membungkus soket dengan `ssl`); SFTP tidak ada di stdlib; (c) cadangan permanen: deteksi api sendiri dari L1b NOAA (bagian 2.1), yang tidak bergantung pada akun JAXA.

### 1.3 Pembaca Himawari L1b stdlib (NOAA)

- `scripts/udara/awan_himawari.py:1-10`: membaca HSD `HS_H09_..._B13_FLDK_R20_Snn10.DAT.bz2` dari bucket publik `noaa-himawari9`, tanpa kredensial, dengan `bz2` dan `struct`. Hanya segmen S04-S07 yang menutup Indonesia (sekitar 12 MB). `baca_segmen()` (baris 56) membaca blok header, kalibrasi count ke radiansi ke suhu kecerahan (`tb()`), `proyeksi()` (baris 40) memakai proyeksi maju CGMS lintang-bujur ke kolom-garis. Sampel = kisi 0,1 derajat dalam poligon kabupaten. Ambang awan dingin 235 K, sangat dingin 208 K (baris 21). Dijalankan `arsip-bmkg.yml` (cron `25 */3 * * *`).
- `scripts/udara/awan_tumbuh.py:12`: dua pindaian berjarak 30 menit, tumbuh bila Tb turun <= -8 K dan Tb_min <= 253 K, puncak tembus <= 208 K. Catatannya jujur: bukan deteksi badai, sel kecil terlewat.
- `scripts/operasi/semai.py:860`: memakai `awan_himawari.json` (persen awan dingin per kab) sebagai salah satu masukan zona semai.

Ini aset terpenting: pembaca HSD stdlib sudah teruji, jadi kanal lain (B07 3,9 um, B11 8,6 um, B14 11,2 um, B15 12,4 um) tinggal memakai fungsi yang sama.

**Ukuran dan latensi bucket [terukur]**, pindaian 24 Nov 2026 03.00Z: tiap kanal IR 2 km per segmen 2,5-3,2 MB, jadi 4 segmen sekitar 11-12 MB per kanal. B03 0,5 km sekitar 40 MB per segmen (165 MB untuk Indonesia), jangan dipakai rutin. Berkas muncul di bucket pukul 03.11-03.13Z, jadi latensi sekitar 12-14 menit dari mulai pindai. Isi bucket: `AHI-L1b-FLDK/`, `AHI-L1b-Japan/`, `AHI-L1b-Target/`, `AHI-L2-FLDK-Clouds/`, `AHI-L2-FLDK-ISatSS/`, `AHI-L2-FLDK-Winds/`. Tidak ada produk api, abu, atau hujan di sana.

### 1.4 Banjir, hujan, gunung api, kekeringan

- `scripts/banjir/genangan_nasional.py:1-30`: katalog STAC Copernicus GFM se-Indonesia, luas tergenang per kecamatan lewat HTTP Range ke GeoTIFF Equi7 (tanpa GDAL; zstd lewat CLI). Kontrol latar dari lintasan pra 8-45 hari. Mode `kejadian` (baris 829) untuk satu KJ. Dipanggil `siklus.yml`. Atribusi `ATRIBUSI` baris 46.
- `scripts/banjir/gfm_label.py:19,40`: label kab-hari; GFM hanya penguat POSITIF (porsi >= 0,005 dan diamati >= 20 km2); hari tanpa lintasan = tak teramati, bukan 0.
- `scripts/banjir/genangan/gsmap.py:3,34`: GSMaP lewat FTP `hokusai.eorc.jaxa.jp` (login), mode jam dan musim; format berkas sebagian belum diverifikasi. Workflow `gsmap_musim.yml` dan `nowcast-jkt-imerg.yml` tanpa cron (manual). Risiko: keluarga FTP JAXA yang sama dengan P-Tree.
- `scripts/cuaca/imerg.py:1-12`: GPM IMERG Late (sekitar 14 jam) dan Early (sekitar 4 jam) lewat OPeNDAP ASCII, token Earthdata, arsip bulanan append-only. Dijalankan `lintas.yml` (`10 2 * * *`).
- `scripts/gunungapi/mirova.py:1-10,115`: MIROVA VRP dari MODIS/VIIRS, panen HTML, deret 90 hari; lisensi nonkomersial, `izin_olah = "belum"`. Dijalankan `lintas.yml`. Tidak ada pemakaian FIRMS di sekitar kawah; `himawari.py` justru membuang titik berbendera gunung api.
- `scripts/gunungapi/abu.py`: skenario sebaran abu 72 jam (Lagrangian, angin IFS), bukan pengamatan abu.
- `scripts/kekeringan/**`: SPI, HTH, kelembapan tanah, GDO (`gdo.py`: SPI-3 ERA5 dan anomali kelembapan tanah lewat WMS), neraca, peringatan BMKG. **Tidak ada satu pun indeks satelit vegetasi atau suhu permukaan** (tidak ada VHI, NDVI, LST). `RISET-AMBANG.md` mencatat ambang kering gagal uji balik (FAR 97%).
- Modul lain yang sudah memakai satelit: `scripts/banjir/subsiden.py` (InSAR LiCSBAS, `banjir.yml`), `scripts/pesisir/abrasi.py` (Landsat MNDWI, `statis.yml` bulanan), paket `longsor-satelit` (Sentinel-2 rdNDVI, masih dokumen).

### 1.5 Batas jadwal

- Worker: satu cron `* * * * *` (`wrangler.jsonc:20`), batas akun Free 5 jadwal. Cron ini sudah memeriksa etag R2 tiap menit.
- GitHub Actions: kadens terjadwal paling cepat 5 menit, kenyataannya dibuang (bagian 1.2 butir 3). `jaga.yml` dipicu tiap jam oleh Worker lewat `workflow_dispatch` (`src/jaga_jadwal.js`).

## 2. Riset per bencana

Kolom tetap: produk, kanal, kadens, latensi, akses, lisensi, kelayakan stdlib, angka kinerja terbitan, jebakan alarm palsu, rancangan validasi.

Label untuk validasi, sama untuk semua: **Dalops harian BNPB** (kejadian per kab per hari) dan **DIBI**. Keduanya hanya bukti positif dan telat; hari tanpa laporan bukan negatif. Pembanding wajib (mesin `scripts/umum/pembanding.py`, paket Kemampuan Inti): persistensi (kemarin = hari ini) dan klimatologi (peluang kab per bulan), pada jumlah alarm yang sama.

### 2.1 Titik panas (Himawari 10 menit)

- **Produk**: JAXA WLF v010 (CSV, reliability 1-5, FRP). Algoritme kontekstual sendiri dari L1b sebagai cadangan.
- **Kanal**: B07 3,9 um (api), B14 11,2 um (latar), B13; siang tambahan B03/B04 untuk pantulan matahari.
- **Kadens dan latensi**: 10 menit. WLF sekitar 1 jam lewat P-Tree (docstring repo). L1b NOAA sekitar 12-14 menit [terukur].
- **Akses dan lisensi**: P-Tree butuh registrasi; produk Himawari boleh dipakai komersial sejak 1 Feb 2026, data sebelumnya hanya nirlaba ([halaman P-Tree JAXA](https://earth.jaxa.jp/en/data/2529/index.html), hasil pencarian FAQ). L1b NOAA: NOAA Open Data Dissemination, tanpa kredensial **[belum diverifikasi: syarat atribusi JMA]**.
- **Stdlib**: layak. B07 + B14 empat segmen = sekitar 24 MB per pindaian; pembaca sudah ada. Uji kontekstual (latar 11x11 piksel, ambang Tb07 dan selisih Tb07-Tb14 di atas rata-rata latar + k simpangan) cukup dengan `array`. Waktu terukur untuk 18 MB: 4,5 detik di Actions.
- **Kinerja terbitan**: produk Himawari 2 km kehilangan banyak api kecil dibanding VIIRS ([Liu dkk. 2026](https://qzhang95.github.io/Files/RSASE_2026_Validation.pdf)). Kalimantan Tengah, algoritme Himawari-8 sendiri: akurasi 66-75%, galat komisi 28-47%, omisi 25-34% ([Sepriando dkk., JSTMC BRIN](https://ejournal.brin.go.id/JSTMC/article/view/1228)). Random forest berlabel VIIRS: recall 95,6%, presisi 59%, recall api kecil 19 poin di atas produk JAXA ([Remote Sensing 2023](https://www.mdpi.com/2072-4292/15/6/1541)). Di Tiongkok produk WLF menghasilkan sekitar 13 ribu alarm palsu per bulan ([Remote Sens. 2026, 18, 906](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-18-00906/article_deploy/remotesensing-18-00906.pdf)).
- **Jebakan**: pantulan matahari (sunglint) dan atap seng siang hari, flare migas dan smelter (sudah ditangani `titik_palsu.json` dan CSV alarm palsu), tepi awan, gunung api.
- **Perbaikan alarm yang ada**: (1) pulihkan sumber (1.2); (2) jalankan detektor L1b sendiri berdampingan dan bandingkan dengan WLF pada jendela yang sama sebelum memilih; (3) ganti presisi satu-jendela dengan presisi musim dari arsip R2 `arsip/himawari/` lawan `titik_hari`; (4) laporkan juga waktu dahulu (menit Himawari lebih awal dari VIIRS pertama), karena itulah nilai Himawari.
- **Validasi**: label VIIRS 375 m (FIRMS) dalam 3 km dan jendela lintasan; metrik presisi per reliability, recall pada lintasan VIIRS, dan median waktu dahulu. Pembanding: persistensi titik 24 jam sebelumnya dalam 3 km. Tugas api terverifikasi lapangan di D1 sebagai label kedua.

### 2.2 Asap dan AOD

- **Produk**: JAXA ARP (Aerosol Property, AOT 500 nm dan Angstrom) L2 per 10 menit dan L3 per jam, P-Tree NetCDF ([halaman P-Tree](https://earth.jaxa.jp/en/data/2529/index.html)).
- **Kanal**: B01-B04 tampak, B05-B06 NIR. Hanya siang, tanpa awan.
- **Akses**: P-Tree (sumber yang sedang mati); lisensi sama dengan WLF.
- **Stdlib**: NetCDF4/HDF5 tidak terbaca stdlib. Alternatif stdlib: hitung sendiri indeks asap sederhana dari L1b (B01/B03 lawan B04, ditambah B07-B14 untuk menyaring awan), tetapi itu model baru tanpa uji balik. Lebih realistis: PNG atau CSV P-Tree bila ada **[belum diverifikasi]**.
- **Kinerja**: **[belum diverifikasi]** angka validasi ARP lawan AERONET di Indonesia.
- **Jebakan**: asap tipis dianggap awan dan dibuang; AOD siang saja, asap malam tak terlihat; daerah gambut berawan rendah.
- **Validasi**: PM2.5 darat (repo sudah memanen ISPU dan PM2.5 di `scripts/udara/**`) per kota per jam; metrik korelasi peringkat dan kemampuan memisah hari ISPU tidak sehat. Pembanding: PM2.5 jam sebelumnya (persistensi) dan rata-rata bulan.

### 2.3 Abu gunung api

- **Produk**: selisih suhu kecerahan split-window BTD = Tb(B13 10,4) - Tb(B15 12,4) < 0 (absorpsi terbalik); JMA memakai teknik split-window termodifikasi untuk Himawari-9 (dipakai untuk Ruang 2024, [ACRS 2024](https://acrs-aars.org/proceeding/ACRS2024/AB0090.pdf)). VOLCAT (NOAA/CIMSS) tidak menyediakan umpan publik yang bisa kita baca **[belum diverifikasi]**. Rujukan resmi: VAAC Darwin dan Tokyo, VONA PVMBG (sudah dibaca `magma.py`).
- **Kanal**: B11 8,6, B13, B14, B15. **Kadens**: 10 menit, latensi 12-14 menit.
- **Stdlib**: layak, hanya di kotak 100 km sekitar 120-an gunung (sangat kecil). Tiga kanal x 4 segmen = sekitar 36 MB.
- **Kinerja**: BTD sendiri banyak alarm palsu; random forest Himawari menurunkan alarm palsu jauh dibanding BTD tetapi perilakunya berubah antarkejadian ([Cubbons 2022, Oxford](https://eodg.atm.ox.ac.uk/eodg/mphys_reports/2022_Cubbons.pdf)).
- **Jebakan**: uap air tinggi di tropis menekan BTD (perlu koreksi uap air), permukaan gurun dan pasir kering, awan es di atas abu, abu tipis tak terlihat, malam dingin.
- **Validasi**: label = VONA PVMBG dan advisory VAAC Darwin (waktu dan tinggi), letusan di MAGMA. Metrik: deteksi per letusan (berapa letusan VONA yang terlihat dalam 30 menit) dan alarm per gunung per bulan tanpa VONA. Pembanding: persistensi status level dan "letusan kemarin".

### 2.4 SO2

- **Produk**: Himawari tidak punya retrieval SO2 publik. JMA SO2 RGB memakai B10-B09 dan B11-B13 ([panduan JMA](https://www.jma.go.jp/jma/jma-eng/satellite/VLab/QG/RGB_QG_SO2_en.pdf)); kanal 7,3 um (B10) lebih peka dari 8,6 um ([Ishii dkk. 2018](https://earth-planets-space.springeropen.com/track/pdf/10.1186/s40623-018-0793-9)). Hanya letusan besar.
- **Sumber yang lebih baik**: TROPOMI (Sentinel-5P) SO2 NRTI L2, satu lintasan per hari, 5,5 x 3,5 km, di GES DISC lewat OPeNDAP ([GES DISC CMR](https://cmr.earthdata.nasa.gov/virtual-directory/collections/C3412185765-GES_DISC/temporal/2025/06)). Latensi NRTI sekitar 3 jam **[belum diverifikasi]**. Token Earthdata sudah ada untuk IMERG.
- **Stdlib**: OPeNDAP ASCII subset kotak gunung layak (pola `imerg.py`).
- **Jebakan**: SO2 rendah troposfer lemah di TROPOMI; lintasan terpotong awan dan sudut; satu lintasan sehari.
- **Validasi**: label = laporan MAGMA (peningkatan level, letusan) dan VONA. Metrik: kenaikan massa SO2 di kotak 50 km dalam 3 hari sebelum kenaikan level. Pembanding: persistensi deret SO2 dan rata-rata 30 hari.

### 2.5 Konveksi dalam, puncak tembus, angin puting beliung, proksi petir

- **Produk**: pendinginan cepat puncak awan (sudah ada di `awan_tumbuh.py`), puncak tembus (overshooting top) dari B13 dengan uji kontur atau tekstur, selisih B08 (6,2 uap air) - B13 > 0 sebagai penanda puncak di atas tropopause.
- **Kadens**: 10 menit (kini dipakai 30 menit). **Stdlib**: layak, pembaca sama.
- **Kinerja terbitan**: deteksi puncak tembus Himawari-8: POD 62%, FAR 37% (Tiongkok timur); random forest Asia Tenggara POD 77%, FAR 36%; olah bentuk menurunkan FAR dari 49% ke 25% ([MDPI 2024](https://www.mdpi.com/2072-4292/16/11/2015/htm), [AMT 2017](https://amt.copernicus.org/articles/10/1859/2017/amt-10-1859-2017.pdf)). Inisiasi konveksi di Korea: POD 75%, FAR 46%, waktu dahulu 20-40 menit ([EGU 2018](https://meetingorganizer.copernicus.org/EGU2018/EGU2018-11888.pdf)). Tidak ada angka terbitan untuk puting beliung di Indonesia.
- **Jebakan**: resolusi 2 km dan kisi 0,1 derajat melewatkan sel kecil; paralaks (posisi puncak bergeser beberapa km ke arah menjauhi titik subsatelit, sekitar 140,7 BT); awan sirus dingin lebar tanpa hujan.
- **Petir**: Himawari tidak punya pemeta petir. Proksi Tb dan puncak tembus saja; data petir BMKG atau jaringan lain belum dipakai **[belum diverifikasi akses]**.
- **Validasi**: label = kejadian puting beliung dan cuaca ekstrem Dalops dan DIBI per kab per hari, hujan ekstrem IMERG Late >= 50 mm/hari. Metrik: POD dan FAR per kab-hari, waktu dahulu terhadap jam kejadian bila tercatat. Pembanding: klimatologi kab per bulan dan peringatan dini BMKG (dinilai terpisah, tanpa digabung).

### 2.6 Hujan kini (nowcast)

- **Produk**: GSMaP_NOW, hujan setengah jam di wilayah Himawari, diproses dalam 30 menit dengan vektor gerak awan Himawari ([JAXA EORC](https://www.eorc.jaxa.jp/en/earthview/2015/tp151102.html)); GSMaP NRT sekitar 4 jam; GSMaP RIKEN Nowcast tersedia 2 hari terakhir ([FAQ GSMaP](https://sharaku.eorc.jaxa.jp/GSMaP/faq/GSMaP_faq01.html)). IMERG Early sekitar 4 jam.
- **Akses**: FTP `hokusai.eorc.jaxa.jp` dengan registrasi (sudah dipakai `gsmap.py`); lisensi riset, atribusi "GSMaP data by JAXA".
- **Stdlib**: biner float32 gzip, layak (pola `gsmap.py`).
- **Jebakan**: hujan hangat dari awan rendah di pesisir tak terlihat IR; berlebih di bawah sirus; FTP JAXA kini rapuh (1.2).
- **Validasi**: label = pos hujan BMKG atau ARG bila ada, kejadian banjir Dalops. Metrik: CSI pada ambang 20 mm/jam per sel, POD banjir per kab-hari. Pembanding: persistensi hujan jam lalu dan ERA5/IFS.

### 2.7 Kabut

- **Produk**: malam, selisih B07 3,9 - B13 10,4 < sekitar -2 K pada awan rendah hangat (emisivitas berbeda); siang, pantulan B03 tinggi dengan Tb hangat. JMA punya RGB Night Microphysics **[belum diverifikasi ambang]**.
- **Stdlib**: layak, dua kanal.
- **Jebakan**: kabut di bawah awan tinggi tak terlihat; asap gambut malam mirip awan rendah (malah berguna sebagai penanda asap malam, tapi harus diberi label terpisah); senja (pergantian siang-malam).
- **Validasi**: label = jarak pandang METAR bandara (repo sudah punya `jarak_pandang.yml`) < 1 km. Metrik: POD dan FAR per bandara-jam. Pembanding: persistensi jam sebelumnya dan klimatologi jam per bulan.

### 2.8 Suhu permukaan untuk kekeringan

- **Produk**: JAXA LST Himawari (P-Tree) **[belum diverifikasi ketersediaan untuk Indonesia]**; atau hitung sendiri dari split-window B13/B14/B15 pada piksel cerah. Kekeringan lambat, jadi kadens 10 menit tidak perlu: satu komposit siang per hari cukup.
- **Jebakan**: awan hampir selalu menutup musim hujan (piksel cerah sedikit); emisivitas permukaan; jam lintas siang berbeda dengan MODIS.
- **Validasi**: label = kekeringan Dalops dan DIBI per kab-bulan, gagal panen. Pembanding: SPI-3 dan persistensi status bulan lalu. Ingat ambang kekeringan sudah gagal uji balik (FAR 97%); LST baru masuk sebagai hipotesis.

### 2.9 Satelit lain

| Bahaya | Produk dan akses | Kadens dan latensi | Stdlib | Jebakan utama |
| --- | --- | --- | --- | --- |
| Banjir per kab | Copernicus GFM (Sentinel-1, sudah ada). Akurasi sasaran CSI >= 70%; 10 dari 12 kasus uji 2025 CSI 72,7-89,1% ([GFM QA 2025](https://global-flood.emergency.copernicus.eu/news/255-publication-of-the-global-flood-monitoring-annual-product-and-service-quality-assessment-report-2025/)). Sentinel-1C masuk sejak 28 Okt 2025 | lintasan 6-12 hari per tempat; latensi beberapa jam **[belum diverifikasi angka]** | sudah jalan (Range + zstd CLI) | kota padat ter-mask, banjir kecil dan bandang lewat; tak teramati bukan 0 |
| Anomali panas kawah | FIRMS VIIRS/MODIS di kotak 5 km kawah (bendera vulkanik dibuang di `himawari.py`); MIROVA VRP (sudah, izin olah belum) | 2-4 lintasan/hari, NRT sekitar 3 jam | layak (CSV FIRMS, kunci sudah ada) | api lahan di lereng; awan |
| SO2 harian | TROPOMI NRTI (2.4) | 1/hari | layak lewat OPeNDAP ASCII | lihat 2.4 |
| Kekeringan vegetasi | NOAA STAR VHI 4 km mingguan ([STAR VH](https://www.star.nesdis.noaa.gov/smcd/emb/vci/VH/)); tersedia juga deret per provinsi **[belum diverifikasi format ASCII]** | mingguan | berkas grid NetCDF tidak; deret ASCII per wilayah ya | awan tropis membuat VHI berisik; padi irigasi |
| Hujan | GPM IMERG (sudah), GSMaP (sudah, manual) | Early 4 jam, Late 14 jam | sudah | hujan pesisir terlewat |
| Bekas longsor | Sentinel-2 rdNDVI (paket `longsor-satelit`, belum dibangun) | 5 hari, awan | berat: JP2 tidak terbaca stdlib, butuh COG lewat STAC **[belum diverifikasi]** | tebangan, panen, awan |
| Garis pantai | Landsat MNDWI (sudah, `abrasi.py`) | 16 hari, tahunan | sudah | pasang surut saat lintas |
| Penurunan tanah | InSAR LiCSBAS (sudah, `subsiden.py`) | 6-12 hari, diolah bulanan | sudah | koherensi rendah di vegetasi |

Validasi ringkas kelompok ini: banjir dengan Dalops dan DIBI kab-hari (GFM hanya positif, metrik presisi dan recall pada kab-hari yang teramati saja); kawah dengan kenaikan level MAGMA dalam 14 hari; VHI dengan kekeringan DIBI kab-bulan lawan SPI-3; longsor dengan desa longsor DIBI dan Dalops (paket LS sudah mengunci kriterianya); pembanding persistensi dan klimatologi untuk semuanya.

## 3. Urutan bangun dan arsitektur

### 3.1 Urutan menurut nilai keputusan lapangan dibagi usaha

| No | Butir | Nilai lapangan | Usaha | Alasan |
| --- | --- | --- | --- | --- |
| 1 | Pulihkan titik panas Himawari: hubungi JAXA, coba FTPS `FTP_TLS`, beri pemberitahuan "sumber putus" di layar dan status | tinggi (alarm dan tugas api mati sejak 18 Nov) | kecil | kerugian sedang berjalan |
| 2 | Detektor api kontekstual sendiri dari L1b NOAA (B07, B14), jalan berdampingan dengan WLF, dinilai lawan VIIRS dari arsip | tinggi | sedang | menghapus ketergantungan akun JAXA; pembaca sudah ada |
| 3 | Abu gunung api BTD di kotak 100 km gunung level >= II, dinilai lawan VONA | tinggi (penerbangan, evakuasi) | kecil-sedang | tiga kanal, kotak kecil |
| 4 | Konveksi 10 menit: `awan_tumbuh` dari 30 ke 10 menit plus puncak tembus B08-B13, label puting beliung Dalops | sedang-tinggi | kecil | pembaca dan keluaran sudah ada |
| 5 | Anomali panas kawah FIRMS (kotak kawah) plus TROPOMI SO2 harian | sedang | kecil | kunci FIRMS dan token Earthdata sudah ada |
| 6 | GFM harian per kab untuk kejadian aktif (pola insiden karhutla) | sedang-tinggi | sedang | mesin sudah ada; tinggal jadwal dan layar |
| 7 | Kabut malam dan asap malam (B07-B13) dinilai lawan METAR | sedang | kecil | |
| 8 | GSMaP_NOW per kab | sedang | sedang | bergantung FTP JAXA yang rapuh |
| 9 | Asap AOD ARP | sedang | sedang-besar | NetCDF dan sumber P-Tree |
| 10 | LST dan VHI kekeringan | rendah-sedang | sedang | lambat, model kekeringan belum lulus |

Semua angka yang tampil dari butir 2-10 berlabel hipotesis sampai lolos gerbang (paket `kemampuan-inti`, `public/inti/gerbang.js`).

### 3.2 Sketsa arsitektur

```
noaa-himawari9 (S3, 10 mnt, ~13 mnt latensi)
   |  satu runner, satu unduhan per pindaian: B07 B08 B11 B13 B14 B15, S04-S07 (~70 MB)
   v
scripts/satelit/himawari_pindai.py   (stdlib, memakai awan_himawari.baca_segmen/proyeksi)
   |-- api.json      titik api kontekstual
   |-- abu.json      piksel BTD < 0 di kotak gunung
   |-- awan.json     Tb_min, tumbuh, puncak tembus per kab
   |-- kabut.json    malam
   v
R2 data/satelit/<jenis>.json  (timpa) + R2 arsip/satelit/<jenis>/YYYY/MM/DD/HHMM.json.gz
   v
Worker cron * * * * *: etag berubah -> D1 (alarm_* baris baru, hanya yang lolos aturan) -> kabar Posko
   v
public/data/*.json harian (ringkasan, rapor uji) lewat workflow harian yang sudah ada
```

- **Kadens 10 menit**: GitHub Actions terjadwal tidak bisa diandalkan (bagian 1.2). Pilihan: (a) Worker cron yang sudah ada memicu `workflow_dispatch` satelit tiap 10 menit saat pindaian baru muncul (cek `LastModified` S3 dari Worker, satu permintaan per menit); dispatch tidak ikut dibuang GitHub (`jaga_jadwal.mjs:1-4`). Repo publik, jadi menit Actions tidak dibayar, tetapi 144 run per hari memenuhi riwayat Actions. (b) Mac mini yang sudah menjalankan bot WA dengan launchd tiap 10 menit, unggah ke R2; lebih tepat waktu tetapi satu titik gagal. Rekomendasi: (a) utama, (b) cadangan. Worker sendiri tidak cocok membaca HSD: bz2 70 MB per pindaian melewati batas CPU Workers Free **[belum diverifikasi angka batas]**.
- **Satu unduhan untuk semua produk**: semua butir Himawari membaca berkas yang sama, jadi satu skrip pemindai, banyak keluaran. Sekitar 70 MB x 144 = sekitar 10 GB unduhan per hari ke runner GitHub, gratis dari S3 publik ke internet **[belum diverifikasi kebijakan egress bucket NODD]**.
- **D1 lawan R2 lawan `public/data`**: nilai per piksel dan per pindaian ke R2 (ditimpa plus arsip gz, pola `himawari.yml`). D1 hanya baris alarm yang lolos aturan dan statusnya (pola `alarm_himawari`), karena kuota baca D1 Free 5 juta per hari pernah menjatuhkan situs. `public/data` hanya ringkasan harian dan rapor uji yang di-commit workflow harian; 10 menit tidak di-commit (48 commit per hari pernah memicu terbit beruntun).
- **Tetap stdlib**: `bz2`, `struct`, `array`, `urllib`, `json`, `gzip`; tanpa numpy di jalur 10 menit. NetCDF/HDF5 (ARP, LST JAXA, VHI grid) tidak dipakai kecuali sumber menyediakan CSV, PNG berpalet, atau OPeNDAP ASCII.
- **Status putus**: tiap sumber menulis `acuan` dan `status_sumber`; layar menampilkan "sumber terputus sejak ..." alih-alih diam, dan tidak pernah menampilkan 0 untuk sumber yang putus.

## 4. Pertanyaan terbuka untuk pemilik

1. Apakah boleh menghubungi JAXA P-Tree atas nama akun yang ada untuk menanyakan alamat dan protokol baru?
2. Pilihan jadwal 10 menit: dispatch dari Worker, Mac mini, atau keduanya?
3. Apakah detektor api sendiri boleh menggantikan WLF bila lolos uji, atau hanya berdampingan?
4. Atribusi JMA dan NOAA untuk data L1b di layar publik: perlu dicek syaratnya sebelum terbit.
