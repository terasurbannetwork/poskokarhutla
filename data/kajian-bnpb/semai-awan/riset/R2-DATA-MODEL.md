# R2. Data dan model cuaca untuk Semai Awan dan prakiraan asap

Riset web, 14 Nov 2026. Tujuan: jalur data murah (Python 3.12, GitHub Actions tiap 3 jam, keluaran JSON kecil) untuk (a) peringkat zona tebar awan 24 jam ke depan dan (b) prakiraan asap 24 jam dari klaster VIIRS beserta kota di bawah asap dan lintas batas negara.

Penanda: [T] terverifikasi di halaman sumber hari ini. [B] belum terverifikasi atau dari pengetahuan umum, wajib diuji sebelum dipakai.

## 1. ECMWF Open Data

Sumber: https://www.ecmwf.int/en/forecasts/datasets/open-data , https://confluence.ecmwf.int/x/C539Kw , https://github.com/ecmwf/ecmwf-opendata

- Resolusi [T]: 0,25 derajat sudah lama ada. Mulai 20 Okt 2026 IFS juga terbit 0,1 derajat (dari HRES sekitar 9 km). AIFS tetap hanya 0,25. Pesaing yang memakai 0,1 derajat tiap 3 jam masuk akal sejak tanggal itu.
- Siklus [T]: 00, 06, 12, 18 UTC. Langkah 00z dan 12z: 0 sampai 144 jam per 3 jam, lalu per 6 jam sampai 360. Langkah 06z dan 18z: 0 sampai 144 per 3 jam. AIFS: per 6 jam sampai 360.
- Latensi [T]: 0,25 derajat terbit di akhir jadwal diseminasi. 0,1 derajat terbit sekitar 2 jam setelahnya. Angka jam mutlak tidak dinyatakan; ukur sendiri (praktik umum 0,25 derajat siap sekitar 7 jam setelah jam siklus [B]).
- Arsip [T]: 12 siklus terakhir (2 sampai 3 hari) di data.ecmwf.int; cermin AWS, Azure, GCP menyimpan lebih lama. Batas 500 sampai 2000 koneksi bersamaan; klien ecmwf-opendata mencoba ulang pada 429 dan 5xx.
- Lisensi [T]: CC BY 4.0 plus Terms of Use ECMWF, boleh didistribusikan dan komersial dengan atribusi.
- Parameter permukaan yang ada [T] (tabel class=od, stream=oper): lcc, mcc, hcc, tcc, tcwv, tcw, tclw, tciw, tcrw, mucape, cp, tp, tprate, ptype, 2t, 2d, skt, 10u, 10v, 100u, 100v, 10fg, msl, sp, sf, ro, ssrd, strd, ttr, dan lain-lain.
- Parameter tingkat tekanan [T]: z, t, u, v, q, w, vo, d, gh, r pada 1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100, 50, 10 hPa. Jadi u/v 850/700/200 dan r 850 tersedia.
- TIDAK ada [T]: cape biasa, cin, blh (tinggi lapisan batas). Hanya mucape. Konsekuensi: CIN dan tinggi lapisan campuran tidak bisa diambil langsung; CIN dihampiri dari profil t dan q (850, 700, 500) atau diabaikan; tinggi campuran untuk asap diganti angin 925 sampai 850 hPa.
- Penamaan berkas [T]: `[root]/[yyyymmdd]/[HH]z/[model]/[resol]/[stream]/[yyyymmdd][HH]0000-[step]h-[stream]-fc.grib2`. Pada 0,1 derajat ada akhiran `sfc` atau `pl` (berkas dipisah); pada 0,25 derajat satu berkas gabungan.
- Subset tanpa eccodes: tiap `.grib2` punya `.index` di URL yang sama (ganti ekstensi) [T]. Isinya satu baris per medan; format JSON-lines berisi `param`, `levelist`, `_offset`, `_length` [B, dari pengetahuan umum, cek satu berkas]. Dengan itu cukup HTTP `Range: bytes=offset-(offset+length-1)` per medan. Satu medan global 0,25 derajat sekitar 0,5 sampai 1,5 MB [B, perkiraan]. Perkiraan satu langkah untuk 8 medan kunci sekitar 5 sampai 10 MB; 9 langkah (0 sampai 24 jam per 3 jam) sekitar 50 sampai 90 MB per siklus. Ukuran berkas tidak diumumkan di dokumentasi [T].
- Dekode GRIB2 dengan stdlib: tidak realistis untuk berkas ECMWF, karena paket data umumnya CCSDS (template 5.42, butuh libaec) [B]; dokumentasi hanya menyebut ecCodes 2.42 atau lebih baru sebagai pembaca yang disarankan, dan CCSDS sebagai standar WMO [T]. Paket simple packing (template 5.0) memang bisa didekode dengan `struct` dan aritmetika bit, tetapi bukan yang dipakai di sini. Opsi nyata: (1) `pip install eccodes` di Actions (roda Python membawa pustaka sejak 2.37 [T dari hasil pencarian]), tarik hanya byte-range lalu `codes_get_values`; (2) `imagecodecs`/`pyaec` untuk blok CCSDS [B]; (3) tulis dekoder AEC murni Python (sekitar 300 baris, lambat tetapi cukup untuk 8 medan). Rekomendasi: opsi 1. Ini melanggar "stdlib saja" untuk satu dependensi, tetapi satu-satunya yang murah dan benar.
- Peringatan 0,1 derajat: sejak 20 Okt presisi (bits per value) diatur per parameter dan berkas dibelah sfc/pl [T]. Daftar parameter 0,1 derajat tidak seragam dengan 0,25 (halaman WMO menyebut tcwv, tcc, mucape hanya di Open Data 0,25 [T]). Verifikasi dulu apakah mucape, tclw, lcc ada di berkas 0,1 sebelum mengunci rancangan.
- AIFS [T]: 0,25 derajat saja, per 6 jam, rilis secepat selesai. Cocok sebagai pembanding kedua murah; kekurangan: langkah 6 jam kasar untuk konveksi harian tropis.

## 2. Open-Meteo

Sumber: https://open-meteo.com/en/docs/ecmwf-api , https://open-meteo.com/en/pricing , https://open-meteo.com/en/docs

- Model [T]: `ecmwf_ifs` (HRES 9 km), `ecmwf_ifs025` (0,25 derajat), `ecmwf_aifs025`. Pembaruan tiap 6 jam. Variabel tingkat tekanan hanya dari model 0,25 derajat (1000 sampai 50 hPa), bukan dari 9 km. Tidak ada entri "ecmwf 0,1 derajat" terpisah; HRES 9 km setara 0,1 derajat dalam praktik.
- Variabel [T]: cape, cloud_cover_low, convective_inhibition, total column integrated water vapour, suhu, titik embun, RH, awan, kecepatan dan arah angin, kecepatan vertikal, tinggi geopotensial per tingkat tekanan. Lifted index dan freezing level tidak tampil di halaman ECMWF (ada K-Index); lifted_index dan freezing_level_height ada di dokumentasi umum untuk model lain (GFS, ICON). Cairan awan (tclw) tidak dicantumkan.
- Model lain [T]: GFS/RRFS 3 sampai 25 km, ICON 2 sampai 11 km, JMA 5 sampai 55 km, CMA GRAPES 15 km. BMKG tidak ada. BOM ACCESS tidak diperbarui sejak 26 Jun 2025.
- Batch [T/B]: koordinat dipisah koma; sumber blog menyebut sampai 1000 lokasi per permintaan [B dari pencarian]; bobot panggilan naik dengan jumlah lokasi dan variabel (rumus tidak terbaca).
- Batas gratis [T]: 600 per menit, 5.000 per jam, 10.000 per hari, 300.000 per bulan; hanya nonkomersial, tanpa jaminan uptime. Komersial wajib langganan (Standard 1 juta panggilan per bulan, Professional 5 juta; harga tidak tampil di halaman).
- Biaya menggrid Indonesia 95 sampai 141 BT, 11 LS sampai 6 LU pada 0,25 derajat: 185 x 69 = 12.765 titik. Satu siklus penuh sudah melampaui kuota harian gratis bila tiap titik dihitung satu panggilan, dan 8 siklus per hari kira-kira 100 ribu titik per hari. Dengan bobot per lokasi hasil sebenarnya lebih tinggi. Kesimpulan: Open-Meteo tidak cocok untuk grid penuh; cocok hanya untuk 50 sampai 300 titik (kota, sel terpilih) sebagai cadangan. Proyek ini publik dan terkait lembaga pemerintah, jadi status "nonkomersial" juga rawan.

## 3. Himawari-9 untuk verifikasi nowcast

- JAXA P-Tree [T]: https://www.eorc.jaxa.jp/ptree/userguide.html . Produk awan: ketebalan optik, jari-jari efektif, suhu puncak awan, tinggi puncak awan, jenis awan (definisi ISCCP). Resolusi 5 km, tiap 10 menit, hanya siang, NetCDF. Fase awan tidak terdaftar di halaman ini [T]. Latensi, FTP, dan pendaftaran tidak dinyatakan [T]; praktik umum: akun gratis, FTP, wajib kutip P-Tree [B]. Lisensi tidak ditulis, hanya syarat kredit.
- NOAA di AWS [T]: https://registry.opendata.aws/noaa-himawari/ , bucket `noaa-himawari9` (us-east-1), tanpa akun (`--no-sign-request`). Full disk tiap 10 menit, Region 1 sampai 3 tiap 2,5 menit. Atribusi diminta, dilarang menyiratkan dukungan NOAA/JMA. Data Level 1b mentah (HSD/NetCDF); untuk suhu kecerahan band 13 (IR 10,4 µm) perlu kalibrasi sendiri. Berat untuk stdlib; pakai NetCDF Level 1b dan dekode di pekerja terpisah, atau cukup Band 13 pada lembar pemantau (kelas pertama).
- BMKG [T]: BMKG punya halaman satelit Himawari dengan syarat atribusi wajib. Pengambilan otomatis harus lewat API resmi; BMKG berhak memblokir pola akses janggal [T].
- Rekomendasi: verifikasi awan memakai suhu kecerahan band 13 dari AWS (tutupan awan dingin di bawah 235 K sebagai proksi awan konvektif), bukan produk P-Tree, karena P-Tree tanpa malam dan tanpa kepastian latensi.

## 4. Verifikasi hujan

- GSMaP NRT [T]: 0,1 derajat, per jam, 60 LU sampai 60 LS, latensi sekitar 4 jam, tanpa koreksi alat ukur. Wajib daftar gratis di sharaku.eorc.jaxa.jp/GSMaP/registration.html; detail FTP dikirim lewat email [T]. Struktur FTP `/realtime_ver/VV/latest/` (24 jam terakhir) dan `/archive/YYYY/MM/DD/` [T]. Format biner/gz; hostname FTP harus diambil dari email pendaftaran. Hari ini halaman peta GSMaP (tanpa daftar) menyediakan unduhan CSV subset per jam [T, dari halaman beranda]; cukup untuk verifikasi beberapa titik.
- IMERG Early [T]: https://gpm.nasa.gov/data/imerg . Latensi sekitar 4 jam, setengah jam, GeoTIFF GIS di `jsimpsonhttps.pps.eosdis.nasa.gov/imerg/gis/early/`, perlu registrasi PPS. Nilai dikali 10 (0,1 mm). Late sekitar 12 sampai 14 jam. Cakupan global, termasuk di luar 60 derajat.
- Radar BMKG [T]: SIDARMA di radar.bmkg.go.id, mozaik GeoJSON, butuh token lewat formulir; laporan komunitas menyebut radar tidak lagi terbuka tanpa autentikasi di sumber lama. Lisensi data.bmkg.go.id tidak ditemukan. Tidak dipakai sebagai komponen wajib; ajukan token ke BMKG lewat BNPB bila dibutuhkan.
- Rekomendasi: GSMaP NRT sebagai kebenaran utama (pendaftaran sekali), IMERG Early sebagai cadangan. Dua-duanya tidak mengukur hasil tebar awan; hanya menilai apakah hujan benar jatuh di zona yang diprakirakan.

## 5. Dispersi asap

- HYSPLIT [T/B]: READY Web API (https://apps.arl.noaa.gov/ready2, POST /api/v1/traj) butuh kunci, 250 panggilan per hari, kunci diberikan atas kebijakan ARL lewat email arl.webmaster@noaa.gov, prioritas pengguna NOAA [T]. Tidak cocok untuk otomasi tiap 3 jam. Jalan lokal: HYSPLIT perlu lisensi pengunduhan gratis setelah registrasi [B], biner Linux jalan di Actions; meteorologi GFS 0,25 derajat format ARL tersedia di NOMADS (`nomads.ncep.noaa.gov/pub/data/nccf/com/hysplit/prod/`) sampai jam 84 per 3 jam [T]. Biaya: tinggi (instalasi, registrasi, berkas ARL ratusan MB, dispersi ratusan partikel per klaster). Untuk 24 jam dan puluhan klaster layak di CPU Actions, tetapi menambah dependensi dan risiko lisensi.
- Advekasi Lagrangian sederhana (disarankan): untuk tiap klaster api (pusat berbobot FRP), lepas partikel tiap jam dengan tinggi awal dari FRP (suntikan 0 sampai 2 km, lapisan campuran siang), advek memakai u/v IFS pada 925/850 hPa (diinterpolasi waktu dan ruang), tambah difusi acak (sigma sekitar 10 sampai 25 km per jam untuk ketidakpastian dan sebaran horizontal), lalu rapatkan partikel ke sel 0,1 derajat sebagai indeks asap relatif. Kota di bawah asap = sel dengan kerapatan di atas ambang. Tidak ada deposisi, kimia, atau sedimentasi; kesalahan umum: lapisan campuran siang-malam salah, asap gambut berlapis rendah bergerak berbeda, gesekan angin darat-laut tidak terwakili pada 0,25 derajat, abai penggerak konveksi. Tampilkan sebagai "arah dan jangkauan indikatif", bukan konsentrasi.
- CAMS global [T]: Atmosphere Data Store (ads.atmosphere.copernicus.eu), gratis, API CDS, lisensi CC BY sejak 2 Jul 2025 [T dari forum]. Resolusi sekitar 0,4 derajat, prakiraan sampai 5 hari, 2 kali sehari, ada PM10/PM2.5 permukaan dan PM10 dari kebakaran hutan [T]. Akses butuh akun ADS gratis, antrean permintaan bisa menit sampai jam, jadi bukan jalur kritis tiap 3 jam. Berguna sebagai pembanding harian atau lapisan latar PM2.5.
- GFAS [T]: emisi dari FRP MODIS, faktor konversi per biom (Heil 2010, Kaiser 2012), faktor emisi Andreae dan Merlet; tahunya buruk untuk gambut, tidak punya siklus harian [T]. Untuk indeks relatif cukup memakai bobot FRP VIIRS tanpa konversi ke massa; konstanta Wooster 2005 (sekitar 0,368 kg per MJ FRE) tidak terverifikasi di sini [B].
- ASMC [T]: asmc.asean.org mengeluarkan laporan harian situasi cuaca dan asap serta peringatan asap lintas batas; daftar produknya (misal dispersi NAME) tidak terverifikasi. Praktik: ASMC memantau titik panas dan asap, negara anggota menyampaikan ke negara tetangga. Untuk tanda lintas batas, pakai prakiraan sendiri dengan label "indikatif, rujuk ASMC".
- Pilihan murah yang bisa dipertahankan: advekasi Lagrangian dengan angin IFS, empat satelit hotspot dan bobot FRP, kerapatan partikel sebagai indeks 0 sampai 1, peringatan eksplisit tentang kesalahan di atas; CAMS PM2.5 sebagai pembanding harian bila akun ADS tersedia. HYSPLIT hanya bila pemilik meminta dispersi berkala yang lebih formal.

## 6. Data api FIRMS

Sumber: https://firms.modaps.eosdis.nasa.gov/api/area/

- Endpoint [T]: `/api/area/csv/[MAP_KEY]/[SOURCE]/[west,south,east,north]/[DAY_RANGE]/[YYYY-MM-DD]`. Sumber NRT: `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`; juga MODIS_NRT dan versi SP.
- Rentang hari [T]: 1 sampai 5 per permintaan. Batas MAP_KEY: 5.000 transaksi per 10 menit; permintaan lebih besar dihitung lebih dari satu. Cukup bagi 3 satelit x 1 kotak.
- Deteksi satelit hilang: panggil `/api/data_availability/` per sumber (tanggal terakhir tersedia) [T]. Cara pelengkap: bandingkan jumlah titik 24 jam per satelit dengan rata-rata 7 hari; satelit dengan nol atau di bawah 20 persen rata-rata ditandai "hilang" dan prakiraan menurunkan keyakinan. Repo ini sudah punya pipeline FIRMS di `scripts/data/**`; pakai ulang, jangan tulis ulang.
- Kolom CSV tidak tercantum di halaman API [T]; ambil dari tabel atribut VIIRS (latitude, longitude, frp, confidence, acq_date, acq_time, daynight, satellite).

## 7. Batas negara dan kota terdekat

- GeoNames `cities15000.zip` [T]: https://download.geonames.org/export/dump/cities15000.zip , CC BY 4.0, wajib atribusi. Sekitar 25 ribu kota dunia, nama, populasi, koordinat; untuk Indonesia, Malaysia, Singapura, Brunei, Timor-Leste, PNG cukup puluhan ratus kota. Kekurangan: banyak kota kecil Indonesia (kecamatan) di bawah 15 ribu tidak ada; pakai `cities5000` atau `allCountries` terfilter bila perlu [B].
- Natural Earth `ne_10m_populated_places` dan batas negara: domain publik [B, tidak terverifikasi dari pencarian ini, diketahui dari umum]. Batas negara 10m cukup kasar untuk lintas batas laut; untuk lintas batas akurat pakai geoBoundaries atau batas yang sudah ada di repo (`scripts/geo/**`). Repo punya referensi 514 kabupaten/kota; kota terdekat ke asap lebih bermakna di level kabupaten daripada kota GeoNames.
- Rekomendasi: kabupaten/kota dari repo untuk Indonesia, GeoNames cities15000 hanya untuk negara tetangga.

## Tumpukan rekomendasi

| Komponen | Pilihan | Alasan | Biaya | Risiko |
| --- | --- | --- | --- | --- |
| Cuaca numerik | ECMWF IFS 0,25 derajat (0,1 derajat setelah diverifikasi), langkah 3 jam, byte-range via `.index` | CC BY, tanpa kunci, ada mucape, tclw, tcwv, lcc, u/v 850/700/200, r 850 | Gratis | Dekode CCSDS butuh `eccodes`; cape/cin/blh tidak ada; berkas 0,1 belum diuji |
| Dekoder | `pip install eccodes` di Actions | Satu-satunya jalur terukur untuk CCSDS | Gratis | Melanggar "stdlib saja" untuk satu paket |
| Cadangan cuaca | Open-Meteo, hanya 50 sampai 300 titik | Mudah, ada cape/cin | Gratis (nonkomersial) | Syarat nonkomersial; tidak cocok untuk grid 12.765 titik |
| Konveksi | mucape, tclw, tcwv, r 850, t/q 850-500; CIN dihampiri atau dibuang | Hanya ini yang terbit | Gratis | Skor zona tebar awan bersifat heuristik, perlu uji balik |
| Api | FIRMS VIIRS SNPP, NOAA-20, NOAA-21 per area API | Pipeline repo sudah ada | Gratis (MAP_KEY) | Satelit hilang, perlu pemeriksaan jumlah |
| Asap | Advekasi Lagrangian sendiri dengan angin IFS 925/850 | Murah, bisa dijelaskan | Gratis | Tanpa kimia, lapisan campuran, gambut; hanya indikatif |
| Pembanding asap | CAMS global PM2.5 via ADS (harian) | CC BY, resmi | Gratis | Antrean, 0,4 derajat, akun ADS |
| Verifikasi hujan | GSMaP NRT, cadangan IMERG Early | Latensi 4 jam, 0,1 derajat | Gratis | Registrasi sekali, FTP hostname lewat email |
| Verifikasi awan | Himawari-9 band 13 dari AWS | Terbuka, 10 menit, malam juga | Gratis | Dekode Level 1b berat; atribusi NOAA/JMA |
| Kota terdekat | Repo (kab/kota) + GeoNames cities15000 untuk luar negeri | Lisensi jelas | Gratis | Atribusi GeoNames wajib |
| Lintas batas | Poligon batas negara + jarak plume | Sederhana | Gratis | Batas laut kasar; jelaskan "indikatif" |

## Pertanyaan terbuka

1. Apakah mucape, tclw, lcc, tcwv ada di berkas 0,1 derajat dan bagaimana ukuran satu medan? Uji satu siklus manual dulu.
2. Boleh menambah dependensi `eccodes` di Actions, atau pemilik minta stdlib murni (maka dekoder AEC ditulis sendiri, atau pakai Open-Meteo terbatas)?
3. Apakah pemilik mau mendaftar akun GSMaP (JAXA), PPS NASA, dan ADS Copernicus (semua gratis, perlu email resmi)?
4. Apakah BNPB bisa meminta token SIDARMA (radar BMKG) lewat jalur resmi?
5. Format indeks `.index` (JSON-lines dengan `_offset` dan `_length`) belum diuji pada berkas Oktober 2026; uji sebelum menulis klien.
6. Batas ambang konveksi untuk zona tebar awan harus dari uji balik terhadap GSMaP; belum ada. Jangan klaim "layak tebar" sebelum itu.
7. Hosting: cermin AWS (`ecmwf-forecasts`) diperlukan bila data.ecmwf.int menolak atau lambat; tentukan sumber utama di rancangan teknis.
