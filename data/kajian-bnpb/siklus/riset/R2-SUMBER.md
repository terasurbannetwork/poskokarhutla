# R2 Sumber data publik: uji nyata ketersediaan (10 Nov 2026)

Program Siklus Bencana, mengikuti keputusan 16 (data publik boleh diambil sebanyak mungkin; lisensi dan atribusi tercatat, jeda sopan, tanpa memecahkan CAPTCHA) dan bagian G (Cloudflare Free, berkas besar tidak di-commit, data raksasa dibaca di tempat). Registri mesinnya `scripts/siklus/sumber.json` (42 sumber, semua yang diuji termasuk yang gagal).

Cara uji: curl dengan User-Agent `Mozilla/5.0 (uji-ketersediaan-data)`, jeda 1 dtk, tanpa email atau data pribadi, unduhan hanya di direktori sementara baru dan tidak dijalankan. Yang dihitung bukan HTTP 200, melainkan isi data Indonesia yang terbaca. Kunci BPS dibaca dari Keychain hanya di proses dan tidak ditulis ke berkas. Satu pengecualian UA: overpass-api.de menolak UA generik (406), sehingga uji Overpass memakai UA proyek `poskokarhutla/1.0`.

Legenda status: hidup = isi Indonesia terbaca dan bisa diotomasi; bersyarat = terbaca tetapi ada syarat (lisensi tidak jelas, butuh akun, rapuh, atau perlu izin); gagal = tidak bisa diambil mesin.

## F1 Kunci kejadian dan rekonsiliasi

| Sumber | Endpoint nyata | Bentuk dan isi | Lisensi | Status | Batas |
| --- | --- | --- | --- | --- | --- |
| GDACS | `gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,DR,WF&country=Indonesia&fromDate=..&toDate=..` | GeoJSON; 57 peristiwa sejak 2010 (76 KB); kolom eventtype, eventid, glide, alertlevel, fromdate, todate, iso3, geometri | bebas dengan atribusi (teks syarat belum dibaca) | hidup | tidak dinyatakan |
| GLIDE | `glidenumber.net/glide/jsonglideset.jsp?level1=IDN&fromyear=..&toyear=..` | JSON; 22 catatan 2025 sampai 2026; glidenumber, event, tanggal, lat, lon, killed, affected, source | tidak dinyatakan | hidup | `maxhit` tidak membatasi |
| USGS FDSN | `earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&...` | GeoJSON; mag, place, time, mmi, alert, tsunami, types | domain publik USGS | hidup | 20.000 hasil per kueri |
| Copernicus EMS | `rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations-info/` | JSON 268 aktivasi (Mar 2023 sampai Okt 2026), NOL aktivasi Indonesia | terbuka (kebijakan Copernicus) | hidup tetapi kosong untuk Indonesia | tidak dinyatakan |
| Charter | `disasterscharter.org/activations` | HTML Next.js 698 KB; 45 sebutan Indonesia; `/api/activations` 404 | tidak dinyatakan | bersyarat (rapuh) | n/a |
| PetaBencana.id | `data.petabencana.id/reports?geoformat=geojson&timeperiod=604800` dan `/reports/archive?start&end` | GeoJSON; 31 laporan per 7 hari; Jan 2025 230 laporan; disaster_type, tags.region_code, text, image_url | data tidak dinyatakan; kode GPL-3.0 | bersyarat | arsip paling lebar 217 hari per panggilan; `/floods` 500 |
| DesInventar | `desinventar.net/DesInventar/download/DI_export_idn.zip` | ZIP 23,97 MB; XML 327 MB; 33.010 kejadian 1815 sampai 2020; shp level 0 sampai 2 | tidak dinyatakan; asal DIBI | hidup | berhenti 2020, tumpang tindih DIBI |
| HDX HAPI | `hapi.humdata.org/api/v2/...` | 403 `Invalid app identifier` | per dataset | bersyarat | butuh app_identifier (base64 nama:email) |
| HDX CKAN | `data.humdata.org/api/3/action/package_search?fq=groups:idn` | JSON; 348 paket Indonesia | per dataset | hidup | tidak dinyatakan |
| ReliefWeb | `api.reliefweb.int/v2/disasters` | v1 410 dicabut; v2 403 appname belum disetujui | butuh appname | gagal (sesuai U6) | n/a |

Catatan F1. GDACS memberi kunci GLIDE; GLIDE sendiri jarang diisi sehingga hanya cocok sebagai kunci silang, tidak sebagai angka. Angka dampak tidak dijumlah antar sumber (keputusan 7): DIBI, Logbook, DesInventar, dan sistem kita tampil berdampingan. PetaBencana adalah satu-satunya aliran waktu nyata laporan warga berkode kabupaten, tetapi lisensi datanya perlu ditanyakan sebelum tampil publik.

## F2 Paparan: bangunan, penduduk, fasilitas vital

| Sumber | Endpoint nyata | Bentuk dan isi | Lisensi | Status | Batas |
| --- | --- | --- | --- | --- | --- |
| Overture bangunan | `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=buildings/type=building/` (HTTPS anonim) | 512 berkas GeoParquet 276,9 GB; 115.179.810 bangunan dalam bbox Indonesia | ODbL-1.0 (turunan OSM dan Microsoft); Google bernilai null | hidup | hitung 711 dtk di DuckDB; baca di tempat |
| Overture tempat | `.../theme=places/type=place/` | 16 berkas 11,9 GB; skema `taxonomy`, `basic_category`; Banda Aceh 0,1 derajat: 6.400 tempat | Apache-2.0, CDLA-Permissive-2.0 | hidup | kualitas perlu uji banding |
| Google Open Buildings v3 | `storage.googleapis.com/open-buildings-data/v3/polygons_s2_level_4_gzip/` | csv.gz per sel S2, 18 MB sampai 1,17 GB | CC BY 4.0 / ODbL menurut dokumentasi | hidup | sudah dipakai repo |
| GHSL BUILT-S R2023A | `jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_BUILT_S_GLOBE_R2023A/` | epoch 1975 sampai 2030 per 5 tahun; 3ss, 30ss, 100 m, 1 km; zip global 3ss 3,38 GB; ada `tiles/` | CC BY 4.0 (dibaca) | hidup | epoch 2025 dan 2030 adalah model |
| GHSL POP R2023A | `.../GHS_POP_GLOBE_R2023A/` | idem; zip global 3ss 13,2 GB | CC BY 4.0 (dibaca) | hidup | idem |
| WorldPop | `hub.worldpop.org/rest/data/pop/wpgp?iso3=IDN` | katalog JSON 21 rekaman 2000 sampai 2020; tif 2020 constrained 103 MB | CC BY 4.0 menurut metadata | hidup | berhenti 2020 |
| Dukcapil ArcGIS | `gis.dukcapil.kemendagri.go.id/arcgis/rest/services/AGR_VISUAL_KEL_FIX/FeatureServer/0` | penduduk per desa (83.489), umur per 5 tahun, kelamin, agama | tidak dinyatakan | hidup | 10.000 rekaman per halaman; sudah dipakai |
| Sekolah Kita (Kemendikdasmen) | `sekolah.data.kemendikdasmen.go.id/v1/sekolah-service/sekolah/cari-sekolah-by-location` (POST JSON) | 560.629 satuan pendidikan; hasil dengan lintang, bujur, npsn, bentuk, status, akreditasi | tidak dinyatakan; API internal SPA | bersyarat | maksimum 200 per panggilan; `cari-sekolah` tanpa koordinat |
| Data Referensi Pendidikan | `referensi.data.kemendikdasmen.go.id/satpen/dikdas/000000/0` | HTML rekap SD dan SMP per provinsi, tanpa koordinat | tidak dinyatakan | bersyarat | hanya uji silang jumlah |
| SIRS Kemenkes | `sirs.kemkes.go.id/fo/home/` | SPA Yankes SSO; tanpa endpoint publik | - | gagal | host alternatif tidak resolve |
| OSM Overpass | `overpass-api.de/api/interpreter` | JSON; kueri clinic dan hospital bbox 0,1 derajat selesai 40 dtk | ODbL 1.0 | bersyarat | UA generik 406; cermin mail.ru 504, kumi timeout, private.coffee 504 |
| Geofabrik | `download.geofabrik.de/asia/indonesia-latest.osm.pbf` | PBF 1,74 GB, harian (261109) | ODbL 1.0 | hidup | belum diunduh |
| Wikidata | `query.wikidata.org/sparql` | 772 rumah sakit berkoordinat; kueri sekolah timeout | CC0 | hidup | timeout 60 dtk |

Catatan F2. Komposisi bangunan Overture di Jakarta 0,2 x 0,2 derajat: 1.419.082 bangunan, 80,5 persen OSM, 6,3 Microsoft, 13,3 Google. Atribut terisi sangat jarang (tinggi 0,07 persen, jumlah lantai 1,3, kelas 1,2), jadi tinggi dan jenis bangunan tidak boleh diasumsikan dari Overture; bangunan hanya jumlah dan luas jejak. Di Banda Aceh 0,1 x 0,1 derajat: 133.727 bangunan (OSM 127.228). Perkiraan ekstrak geometri seluruh Indonesia sekitar 11 GB WKB mentah (rata-rata 98 byte per bangunan, hitungan dari sampel), jauh di atas batas awalan `siklus/` bila disalin utuh, sehingga keputusan 29 (baca di tempat, simpan agregat per desa atau sel) berlaku.

Fasilitas vital. Tidak ada satu sumber lengkap. Sekolah: Sekolah Kita adalah satu-satunya yang resmi dan berkoordinat (560 ribu), tetapi hanya lewat API internal berbatas 200 per panggilan. Cakupan seluruh Indonesia butuh puluhan ribu panggilan grid (perkiraan, belum dijalankan), jadi perlu izin Pusdatin lebih dulu. Rumah sakit dan puskesmas: Kemenkes tidak punya jalur publik yang teruji; OSM (Geofabrik), Overture places (Banda Aceh: 95 hospital, 88 school, 75 elementary_school, 18 dental_clinic), dan Wikidata (772 rumah sakit) menjadi sumber, dengan label cakupan estimasi.

## F3 Kerusakan dan korban cepat

| Sumber | Endpoint nyata | Bentuk dan isi | Lisensi | Status | Batas |
| --- | --- | --- | --- | --- | --- |
| USGS ShakeMap, PAGER, ground-failure | `earthquake.usgs.gov/fdsnws/event/1/query?eventid=<id>&format=geojson` lalu `contents` produk | contoh us6000tkt2 (M7,8 Ende, 14 Agt 2026): `grid.xml` 32,9 MB (743 x 674; MMI, PGA, PGV, PSA03/06/10/30, SVEL), `cont_mmi.json` 31 KB, `coverage_mmi_low_res.covjson` 127 KB, `shape.zip` 11,6 MB; ada losspager, ground-failure (GeoTIFF), dyfi | domain publik USGS | hidup | berkas besar sebaiknya `coverage_*_low_res` atau `cont_*` |
| Copernicus EMS | lihat F1 | tidak ada aktivasi Indonesia pada daftar | terbuka | hidup tetapi kosong | n/a |
| Earth Search (Sentinel-2 dan 1) | `earth-search.aws.element84.com/v1/search` (POST) | 45 item untuk bbox 0,3 derajat 40 hari; Sentinel-2 L2A COG di bucket HTTPS publik | Copernicus (koleksi `proprietary`) | hidup | aset Sentinel-1 ke `s3://`, kemungkinan requester-pays (tak diuji) |
| Planetary Computer | `planetarycomputer.microsoft.com/api/stac/v1/search` + `/api/sas/v1/token/...` | sentinel-1-rtc, aset vv dan vh COG; token SAS anonim berlaku sekitar 1 jam | per koleksi | hidup | token kedaluwarsa jam |
| UNOSAT lewat HDX | `data.humdata.org/api/3/action/package_search?q=UNOSAT Indonesia&fq=groups:idn` | 39 paket; terbaru longsor Jawa Tengah (Mei 2026), Lewotobi (Feb 2026) | umumnya CC BY-SA | hidup | banyak berupa tautan peta web |
| NASA GIBS | `gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi` | GetCapabilities 5,3 MB; ubin `VIIRS_Black_Marble` 200 | NASA terbuka | hidup | nama lapisan NRT harus dari GetCapabilities (tebakan saya 400) |

Catatan F3. Sinyal terbaik yang bisa diotomasi: ShakeMap grid.xml (guncangan, sudah ada modul gempa di repo), Sentinel-1 RTC (genangan, pola sudah ada), dan citra Sentinel-2 L2A (tutupan awan di Indonesia tinggi, perlu agregasi komposit). Hasil estimasi korban tetap rentang `estimasi-model` (keputusan 9). Copernicus EMS dan Charter hanya memberi sinyal bila ada aktivasi Indonesia, yang saat ini nol pada daftar publik.

## F4 Kaji cepat kerusakan dan rencana rehab-rekon

| Sumber | Endpoint nyata | Bentuk dan isi | Lisensi | Status | Batas |
| --- | --- | --- | --- | --- | --- |
| BPS IKK kab/kota | `webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/2515/th/124:125/lang/ind?key=` | 514 kab/kota x 2 tahun (2024, 2025); last_update 2026-10-20 | kunci BPS, atribusi | hidup | kota acuan berganti per tahun (2025 Surabaya=100, 2024 Banjarmasin=100): tahun tak sebanding |
| BPS IHPB konstruksi | `.../var/1018/th/124:125/...` (juga var 885, 24, 1721) | IHPB bahan bangunan menurut kelompok, bulanan; last_update 2026-11-02 | idem | hidup | tahun dasar 2023=100 sejak Jan 2025 |
| Harga satuan PUPR (HSBGN, AHSP) | `data.pu.go.id`, `jdih.pu.go.id`, `binakonstruksi.pu.go.id` | SPA dan halaman; tidak ada dataset harga | - | gagal | `sisdm` dan `ekatalog` tidak resolve |
| INAPROC (data, SPSE, SiRUP) | `data.inaproc.id`, `spse.inaproc.id/nasional/lelang`, `sirup.inaproc.id` | dashboard dan halaman HTML; tanpa JSON terlihat | tidak dinyatakan | bersyarat | `sirup.lkpp.go.id` dan `api.lkpp.go.id` tidak resolve |

Catatan F4 (jawaban awal U4). Tidak ada API harga satuan bangunan dari PUPR yang bisa diotomasi. Rekomendasi: harga satuan dasar dimasukkan manual dari dokumen HSBGN atau Perka yang sudah ada di pustaka dan berlabel `asumsi-kebijakan`, lalu disesuaikan ke daerah dengan IKK BPS (var 2515, hanya pembanding dalam satu tahun yang sama) dan ke waktu kejadian dengan IHPB konstruksi (var 1018). Nilai paket pengadaan di INAPROC dipantau manual.

## F5 Operasi dan logistik

| Sumber | Endpoint nyata | Bentuk dan isi | Lisensi | Status | Batas |
| --- | --- | --- | --- | --- | --- |
| gis.bnpb.go.id InaRISK | `gis.bnpb.go.id/server/rest/services/inarisk` | ArcGIS 11.4, 160 layanan: indeks bahaya, kerentanan, risiko, INARISKPOP_2020, Jalur_evakuasi, Arah_jalur_evakuasi, RENEVAK_tsunami, Peta_Rencana_Evakuasi_Cilacap1; 44 folder di akar | tidak dinyatakan; atribusi BNPB | hidup | folder POI dan Destana tanpa layanan terdaftar |
| data.bnpb.go.id (CKAN) | `data.bnpb.go.id/api/3/action/package_list` | 527 paket | per dataset | hidup | banyak data lama |
| OSM Geofabrik dan Overpass | lihat F2 | jalan, jembatan, tempat ibadah, kantor pemerintah, tempat penampungan | ODbL | hidup (Geofabrik) | Overpass bersyarat |
| Overture places | lihat F2 | government_office 256 di sampel Banda Aceh, hospital, school | Apache-2.0, CDLA | hidup | kualitas perlu uji |
| BIG geoservices RBI | `geoservices.big.go.id/rbi/rest/services` | 25 folder; BANGUNANDANFASUM dan TRANSPORTASI hanya lembar parsial 2014 sampai 2016 | tidak dinyatakan | bersyarat | cakupan tidak nasional |

Catatan F5. Titik kumpul, shelter, dan jalur evakuasi nasional tidak punya satu sumber. Layanan InaRISK memuat jalur dan rencana evakuasi untuk lokasi tertentu (mis. Cilacap, tsunami). Untuk operasi pakai stok LogPal dan personel `/petugas` yang sudah ada (keputusan 21); sumber publik hanya melengkapi peta jalan dan fasilitas.

## F6 Masa depan: sinyal iklim terhadap dasar

| Sumber | Endpoint nyata | Bentuk dan isi | Lisensi | Status | Batas |
| --- | --- | --- | --- | --- | --- |
| NEX-GDDP-CMIP6 | `nex-gddp-cmip6.s3.us-west-2.amazonaws.com/NEX-GDDP-CMIP6/<model>/<skenario>/<run>/<var>/` | 35 model; historical, ssp126, ssp245, ssp370, ssp585; 9 variabel (pr, tas, tasmax, tasmin, hurs, huss, rlds, rsds, sfcWind); NetCDF 0,25 derajat global, satu variabel satu tahun: pr 2015 181,6 MB, tas 2015 244,6 MB; range request 206 | CC0 menurut NASA (tidak dibuka ulang) | hidup | pr satu model satu skenario 2015 sampai 2100 sekitar 15,6 GB global (hitungan); potongan bbox belum diuji |
| CHIRPS v3.0 | `data.chc.ucsb.edu/products/CHIRPS/v3.0/` | harian final `daily/final/sat/<tahun>/` 12,2 MB per hari; bulanan `monthly/global/tifs/` 23,9 MB, terbaru 2026.09 | domain publik (CHC) | hidup | 429 saat permintaan beruntun; jeda 2 dtk |
| PSMSL | `psmsl.org/data/obtaining/rlr.monthly.data/rlr_monthly.zip` | zip 18,97 MB, diubah 19 Okt 2026 | gratis, sitasi | hidup | jumlah stasiun Indonesia belum dihitung |
| AR6 proyeksi muka laut | `zenodo.org/api/records/6382554` | ar6.zip 890 MB; ar6-regional-confidence.zip 9,24 GB; location_list.lst 2,66 MB; rekaman near-term 15335127 (390 MB) | CC BY 4.0 | hidup | halaman alat sealevel.nasa.gov 404 |
| CMEMS | `data.marine.copernicus.eu/products` | portal; unduh butuh akun gratis | terbuka, akun | bersyarat | akun belum dibuat |
| GHSL epoch | lihat F2 | BUILT-S dan POP 1975 sampai 2030 | CC BY 4.0 | hidup | idem |
| ATR/BPN (Bhumi, gistaru) | `gistaru.atrbpn.go.id/arcgis/rest/services` | ArcGIS 200 tetapi daftar layanan kosong; Bhumi SPA tanpa API | - | gagal | RTRW tidak otomatis |
| MODI ESDM | `modi.esdm.go.id` | 302 ke minerbaone; geoportal ESDM 503 | - | gagal | n/a |
| BIG geoservices | lihat F5 | parsial | tidak dinyatakan | bersyarat | n/a |

Catatan F6. Keluaran F6 berlabel `hipotesis` (keputusan 10). Dua jalur data kuat: NEX-GDDP-CMIP6 (hujan dan suhu harian proyeksi) untuk sinyal perubahan hujan ekstrem terhadap dasar, dan GHSL epoch untuk pertumbuhan paparan. CHIRPS menyediakan dasar historis hujan; PSMSL dan AR6 untuk muka laut. Pemotongan NEX ke bbox Indonesia harus dijalankan di lab (keputusan 29), hasil hanya agregat per kabupaten ke R2.

## F7 Asisten

Tidak ada sumber baru; F7 membungkus `/semua`, `src/mcp.js`, `src/ai.js`.

## Sumber yang direkomendasikan per fitur

| Fitur | Pakai | Alasan singkat |
| --- | --- | --- |
| F1 | GDACS + GLIDE (kunci), USGS FDSN, DIBI (sudah ada), PetaBencana (bila lisensi dikonfirmasi), Charter dan Copernicus EMS (sudah ada) | semua tanpa akun dan terbaca; PetaBencana satu-satunya aliran laporan warga berkode kabupaten |
| F2 | Overture bangunan (baca di tempat, agregat per desa), Google Open Buildings (sudah ada), GHSL POP/BUILT-S 100 m, WorldPop dan Dukcapil (sudah ada), Sekolah Kita (setelah izin), Overture places + Geofabrik OSM + Wikidata untuk kesehatan, ibadah, kantor | sumber lisensi terbuka dengan cakupan nasional; fasilitas vital digabung dari beberapa sumber |
| F3 | USGS ShakeMap (+ PAGER, ground-failure), Sentinel-1 RTC via Planetary Computer, Sentinel-2 L2A via Earth Search, UNOSAT/HDX bila ada produk | cepat dan otomatis; keluaran rentang `estimasi-model` |
| F4 | BPS IKK (var 2515) dan IHPB (var 1018) sebagai pengindeks; harga satuan HSBGN/Perka manual berlabel `asumsi-kebijakan` | tidak ada API harga satuan resmi |
| F5 | InaRISK (gis.bnpb.go.id), Geofabrik OSM untuk jalan dan jembatan, Overture places, stok LogPal dan `/petugas` internal | layanan publik terbuka dan data internal sudah ada |
| F6 | NEX-GDDP-CMIP6 (pr, tas), CHIRPS v3, GHSL epoch, AR6 Zenodo + PSMSL | semua tanpa akun, lisensi terbuka |
| F7 | tidak ada | n/a |

## Sumber yang tidak bisa dipakai dan gantinya

| Sumber | Masalah | Pengganti |
| --- | --- | --- |
| ReliefWeb API | v1 410 dicabut; v2 butuh appname disetujui (U6) | GDACS + GLIDE + HDX CKAN; daftar appname bila pemilik setuju |
| HDX HAPI | butuh app_identifier berbasis email | HDX CKAN untuk menemukan dataset sumber; buat akun email proyek bila pemilik setuju |
| SIRS Kemenkes dan host Kemenkes lain | SSO, host tidak resolve | OSM, Overture places, Wikidata (label cakupan estimasi) |
| PUPR harga satuan | tidak ada API atau dataset | HSBGN/Perka manual dari pustaka, IKK dan IHPB BPS untuk penyesuaian |
| INAPROC / SPSE / SiRUP | tanpa JSON; host lama tidak resolve | pantau manual nilai paket |
| ATR/BPN RTRW (Bhumi, gistaru) | tidak ada layanan anonim | lampiran Perda RTRW per daerah percontohan |
| MODI/Geoportal ESDM | 302 dan 503 | tidak dipakai |
| CMEMS | butuh akun | AR6 Zenodo + PSMSL |
| Overpass cermin (mail.ru, kumi, private.coffee) | 504 dan timeout saat uji | overpass-api.de dengan UA proyek; Geofabrik PBF untuk bulk |
| Copernicus EMS untuk Indonesia | nol aktivasi Indonesia di daftar publik | UNOSAT lewat HDX, ShakeMap |
| DesInventar | berhenti 2020, turunan DIBI | DIBI langsung; hanya uji silang |

## Hal yang belum teruji (jujur)

- Teks lisensi GDACS, USGS, Copernicus, CHIRPS, PSMSL, NEX-GDDP, WorldPop dibaca dari pengetahuan umum, bukan dari halaman syarat saat uji ini; sebelum tampil publik, baca dan salin teks lisensinya ke registri.
- Pemotongan bbox NetCDF NEX-GDDP dan unduhan penuh Geofabrik, Open Buildings, serta GHSL tidak dijalankan.
- Batas laju resmi hanya ditemukan pada CHIRPS (429 saat beruntun) dan PetaBencana (jendela arsip); sisanya tidak dinyatakan. Semua crawl memakai jeda minimal 1 sampai 2 dtk.
- Jumlah stasiun PSMSL Indonesia dan jumlah layanan InaRISK dengan data kerugian belum dihitung.
