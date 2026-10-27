# Riset sumber data banjir dan genangan Indonesia

Diuji 27 Okt 2026 dengan curl GET, User-Agent `pantaubencana-riset/1.0 (+https://centurisk97.id; riset nonkomersial)`. Tidak ada login, CAPTCHA, atau proteksi bot yang dilewati; yang terkunci hanya dicatat. Ambang siaga resmi hanya ada bila disebut. Lisensi: hampir semua portal pemerintah tidak menyatakan lisensi terbuka; pakai nonkomersial, sebut sumber, cache, dan jangan membebani.

Sudah dipakai repo ini: SIHKA telemetry-list, DSDA DKI HTML, SIPANTAU Kota Tangerang, BMKG nowcast RSS/CAP, Open-Meteo, GloFAS, BMKG Maritim.

## 1. Tinggi muka air sungai, pintu air, waduk

| Sumber | Endpoint | Format | Cakupan | Update | Ambang | Uji curl | Catatan |
|---|---|---|---|---|---|---|---|
| DSDA DKI, status terakhir pintu air (BARU, lebih baik dari HTML) | `https://poskobanjir.dsdadki.web.id/datatmalaststatus.json` | JSON array | 38 pos (Jakarta + hulu: Katulampa, Depok, Cibalok-Gadog, dll), lat/lon, tinggi saat ini dan sebelumnya, CCTV_URL | tiap 10 menit (TANGGAL 19:10 saat uji) | Ya: `SIAGA1..SIAGA4` (cm) + `STATUS_SIAGA` | 200 JSON 23,5 KB, 27 Okt 2026 | Menggantikan scraping HTML. Dipakai pula oleh banyak repo GitHub (backend_JIR, dll). Tanpa auth. |
| DSDA DKI, XML sama | `https://poskobanjir.dsdadki.web.id/xmldata.xml` | XML `DocumentElement/SP_GET_LAST_STATUS_PINTU_AIR` | sama dengan di atas | sama | Ya | 200 text/xml 33 KB | Cadangan format; skema sama. |
| DSDA DKI, Sistem Informasi Banjir (pintu air, pos pengamatan, rumah pompa) | `https://sisteminformasibanjir.jakarta.go.id/api/report/{pintuAirReports\|posPengamatanReports\|rumahPompaReports}/{YYYY-MM-DD}?format=json` | JSON | pintu air, pos, 94 pompa (menurut situs pembanding) | per jam | Ya (`status_siaga`) | **401 Unauthorized** tanpa header `token` | API ini dipanggil SPA pantaubanjir.jakarta.go.id dengan token klien yang tertanam di JS. Tidak dipakai; token itu bukan hak publik yang dinyatakan. Minta akses resmi ke DSDA/Jakarta Smart City untuk pompa. |
| SIHKA PU (sudah dipakai) | `https://sihka.sda.pu.go.id/api/v1s/telemetry-list` | JSON 474 KB | 1.849 stasiun: 767 DUGA AIR, 936 CURAH HUJAN, 146 KLIMATOLOGI; seluruh Indonesia | duga air terbaru 14:10 UTC (hidup) | tidak ada di payload | 200 | Catatan: sebagian stasiun curah hujan memuat timestamp masa depan (2026-11-10); saring `timestamp > now`. Endpoint lain (`telemetry-detail`, `station-list`, dst) 404. |
| SIPANTAU Kota Tangerang (sudah dipakai) | `https://api.dpuprkotang.info/nuxt/posduga` | JSON | pos duga Kota Tangerang (Angke, Cisadane, dst) | hidup | di payload | 200 JSON 34 KB | tanpa perubahan. |
| BBWS Bengawan Solo | `https://hidrologi.bbws-bsolo.net/` | HTML SPA, muatan terenkripsi/diobfuskasi | pos hidrologi Bengawan Solo | ? | ? | 200, 170 KB | Isi data dikirim sebagai blob terenkripsi; tidak ada endpoint JSON terlihat. Tidak diurai (sengaja mengaburkan). Kemungkinan datanya sudah masuk SIHKA. |
| BBWS Citarum | `https://sih3.bbwscitarum.com/` | HTML | Citarum | ? | ? | **403** (Cloudflare) | Terkunci, dicatat saja. |
| BBWS Ciliwung-Cisadane | `bbwsciliwungcisadane.com` | - | - | - | - | 301 ke situs judi (`indo178official.com`) | **JANGAN DIPAKAI: domain dibajak.** Cari domain resmi baru; data Ciliwung/Cisadane sudah lewat SIHKA + DSDA. |
| Jasa Tirta I (Brantas) | `https://jasatirta1.co.id/` | HTML | Brantas | ? | ? | 200 hanya beranda | Subdomain hidrologi tidak resolve (`hidrologi.jasatirta1.co.id`, `sih.jasatirta1.co.id`). Tidak ditemukan endpoint publik. |
| Pemkot Pekanbaru EWS | `https://ews.pekanbaru.go.id/` | HTML | Pekanbaru | ? | ? | 200 tapi tubuh kosong (0 byte) | Perlu inspeksi browser; belum ada endpoint. |
| Pemkot Medan EWS | `https://ews.medan.go.id/` | - | - | - | - | 403 | Terkunci. |
| Semarang, Surabaya, Bandung, Makassar, Palembang, Samarinda, Banjarmasin | tebakan host (`ews.*`, `banjir.*`, `sipantau.*`) | - | - | - | - | DNS tidak resolve / 404 | Tidak ada endpoint yang ditemukan. `banjirkita.banjarmasinkota.go.id` 404. Butuh riset lapangan (kontak BPBD/Dinas PU kota) atau penelusuran DevTools di aplikasi mereka. |
| Jakarta Satu (ArcGIS) | `https://jakartasatu.jakarta.go.id/server/rest/services/Banjir_Jakarta` | ArcGIS REST | folder Banjir_Jakarta, BPBD, DSDA | - | - | folder terdaftar publik, layer **499 Token Required** | Tidak dapat dipakai tanpa token. |

## 2. Curah hujan terukur

| Sumber | Endpoint | Format | Cakupan | Update | Ambang | Uji curl | Catatan |
|---|---|---|---|---|---|---|---|
| DSDA DKI pos hujan (BARU) | `https://poskobanjir.dsdadki.web.id/datacurahhujan.json` | JSON array | **88 pos** (cocok dengan situs pembanding), lat/lon, `DAS_POLDER`, `KOTA_KAB` | tiap 10 menit (semua 88 bertanggal 27 Okt) | tidak ada ambang di data; legenda halaman: 0,5-20 ringan, 20-50 sedang, 50-100 lebat, 100-150 sangat lebat, >150 ekstrem (mm/hari) | 200 JSON 62 KB | Kolom: `KETINGGIAN_TERAKHIR`, `KETINGGIAN_HARI_INI` (akumulasi 07:00-06:59), `CURAH_HUJAN_1_MINGGU/BULAN/TAHUN`. Halaman `Pages/CurahHujan.aspx` basi (data 2022); jangan dipakai. |
| SIHKA CURAH HUJAN (sudah dipakai) | lihat atas | JSON | 936 stasiun | hidup | - | 200 | |
| BMKG AWS Center | `https://awscenter.bmkg.go.id/` | HTML | jaringan AWS/ARG BMKG | ? | - | 200 halaman 12 KB | Tidak ada API terbuka terlihat; perlu login/izin. |
| BMKG Data Online | `https://dataonline.bmkg.go.id/` | HTML (butuh registrasi) | data historis | harian | - | 200 | Tidak untuk real-time otomatis; registrasi diperlukan. |
| BMKG prakiraan cuaca | `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.03.1001` | JSON | per kelurahan (adm4), 3 hari / 3 jam | 3 jam | - | 200 JSON 8 KB | Sumber resmi prakiraan (bukan observasi); rate limit 60/menit/IP per dokumentasi BMKG. Tidak ada endpoint peringatan dini JSON lain (`/publik/radar`, `/publik/peringatan-dini-cuaca` 404). |

## 3. Radar, nowcast, satelit

| Sumber | Endpoint | Format | Cakupan | Update | Ambang | Uji curl | Catatan |
|---|---|---|---|---|---|---|---|
| BMKG nowcast RSS (sudah dipakai) | `https://www.bmkg.go.id/alerts/nowcast/id` | RSS+CAP | seluruh Indonesia | ~10-30 menit | CAP severity | 200 XML 20 KB | |
| BMKG Radar (SIDARMA) | `https://radar.bmkg.go.id:8090/radarlist`, `.../sidarmaimage?token=`; publik: `https://api-apps.bmkg.go.id/api/radar-image` | JSON + PNG | ~40 radar | 10 menit | - | `api-apps` **403 Forbidden**; `radar.bmkg.go.id` tidak terjangkau dari mesin uji | Memerlukan API key (dokumentasi `radar.bmkg.go.id/api/documentation`). Ajukan key resmi ke BMKG. |
| BMKG nowcasting situs | `https://nowcasting.bmkg.go.id/` | - | - | - | - | 403 Cloudflare "Just a moment" | Terkunci; catat. |
| NASA GIBS (IMERG) | `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi` | WMTS (PNG) | global; layer `IMERG_Precipitation_Rate` | ~30 menit, latensi beberapa jam | - | GetCapabilities 200 (5,3 MB) | Terbuka tanpa login, tapi hanya citra visual, bukan nilai mentah. URL tile uji tebakan saya 404; baca TileMatrix dari capabilities. |
| JAXA GSMaP NRT, IMERG Early (data mentah), Himawari rainfall | sharaku.eorc.jaxa.jp / Earthdata | GeoTIFF/binary | global | 1 jam | - | tidak diuji | Butuh registrasi gratis/login; dilewati sesuai aturan. |
| Open-Meteo `minutely_15` (sudah dipakai) | `https://api.open-meteo.com/v1/forecast?...&minutely_15=precipitation` | JSON | global | 15 menit | - | 200 | |

## 4. Pasang surut dan banjir rob

| Sumber | Endpoint | Format | Cakupan | Update | Ambang | Uji curl | Catatan |
|---|---|---|---|---|---|---|---|
| IOC Sea Level Station Monitoring (BARU) | `https://www.ioc-sealevelmonitoring.org/service.php?query=data&code={kode}&format=json&timestart=YYYY-MM-DD&timestop=YYYY-MM-DD` | JSON `[{slevel,stime,sensor}]` | 33 stasiun Indonesia (BIG): `sema` Semarang, `sura` Surabaya, `koli` Kolinamil Jakarta, `beno` Benoa, `cili` Cilacap, dll | 1-15 menit | tidak ada | 200 untuk sema/sura/koli/beno, 27 Okt 2026 | Data mentah real-time, belum QC; tetap perlu datum/anomali (nilai `slevel` ~0,01 m untuk sema/sura mencurigakan, pastikan datum). Daftar: `list.php?showall=a&output=contacts` (nama pada baris tabel tidak sejajar, cocokkan kode dengan lat/lon). Syarat: data sementara, sebut IOC/BIG. |
| BMKG Maritim pasut (sudah dipakai) | - | - | - | - | - | - | |
| BIG pasut | `tides.big.go.id`, `sealevelmonitoring.big.go.id` | - | - | - | - | DNS gagal | Tidak terjangkau; IOC adalah cermin praktisnya. |

## 5. Genangan dan banjir crowdsourced

| Sumber | Endpoint | Format | Cakupan | Update | Ambang | Uji curl | Catatan |
|---|---|---|---|---|---|---|---|
| PetaBencana.id laporan | `https://api.petabencana.id/reports?geoformat=geojson&timeperiod=86400&disaster=flood` | GeoJSON | nasional, titik laporan + `flood_depth` (cm) + foto | real-time | kedalaman cm | 200; laporan terbaru 26 Okt 2026; `timeperiod=604800` memberi 8 fitur | Hidup tapi volume kecil (Indonesia saat ini sepi laporan). Parameter `disaster` harus `flood`. Server kadang 502 pada `/floods`, `/cities`, `/reports/archive` pada api.* (coba ulang). |
| PetaBencana.id poligon banjir (RW) | `https://data.petabencana.id/floods?admin=ID-JK&format=json&minimum_state=1` | TopoJSON | Jakarta RW, `state` 1-4 | real-time | state 1-4 | 200 (3,4 KB, bila ada genangan); tanpa `minimum_state` dan tanpa `format` → 500 | `admin` kode ISO provinsi; cakupan hanya kota yang aktif (Jakarta, Surabaya, Bandung, dll). Sumber pelapor: Grasp/Twitter/Telegram/aplikasi. Lisensi data: ODbL (menurut proyek); sebut PetaBencana.id. |
| JakSAFE | tidak ada API publik terpisah | - | - | - | - | - | Terhubung ke Qlue/PetaBencana; tidak diuji. |
| Copernicus GFM (Sentinel-1) | `https://geoserver.gfm.eodc.eu/geoserver/gfm/wms` | WMS | global; layer `observed_flood_extent`, `observed_water_extent`, `reference_water_mask` | tiap overpass S1 (6-12 hari per titik) | - | GetCapabilities 200 (2,3 MB) | Terbuka untuk WMS; GetMap dengan TIME layer. Bukan real-time penuh; berguna validasi pasca-kejadian. |
| GloFAS WMS | `https://ows.globalfloods.eu/glofas-ows/ows.py` | WMS | global, hazard 100 th, dll | harian | return-period | GetCapabilities 200 | Peta saja; debit sungai lewat Open-Meteo (sudah dipakai). `global-flood-api.open-meteo.com` tidak terjangkau saat uji (ulangi). |
| GDACS | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&country=Indonesia` | JSON | global | harian | alert level | 204 (tidak ada event sejak 1 Okt) | Hidup; kosong saat ini. |

## 6. Referensi risiko dan histori

| Sumber | Endpoint | Format | Cakupan | Update | Uji curl | Catatan |
|---|---|---|---|---|---|---|
| BNPB GIS ArcGIS | `https://gis.bnpb.go.id/server/rest/services?f=json` | ArcGIS REST | folder `inarisk`, `InAWARE`, `Bencana_Harian`, `Bencana_Mingguan`, `Banjir_*`; service `Kelas_Banjir` (MapServer), `Kejadian_Bencana_Mingguan` (FeatureServer) | mingguan | 200 daftar publik | Layer tertentu mungkin butuh token; hanya daftar yang diuji. Berguna untuk kelas rawan banjir dan kejadian historis. |
| InaRISK | `https://inarisk.bnpb.go.id/` | SPA | risiko banjir | statis | 200 (halaman) | Data lewat gis.bnpb.go.id (`inarisk`). |
| DIBI | `https://dibi.bnpb.go.id/` | HTML | kejadian historis | - | 200 | Tidak ada API JSON; ekspor manual. |
| Air tanah SIPASTI (Badan Geologi) | `sipasti.esdm.go.id` / `sipasti.geologi.esdm.go.id` | - | - | - | DNS gagal | Pencarian web tidak menemukan situs resminya; domain belum terverifikasi. |

## Cara kerja ditemukan dan peringatan

- Endpoint JSON DSDA ditemukan dari repo GitHub publik (`Alif-Fikri/backend_JIR`, `banghasan/monitor-air-telegram`, dll), bukan dari proteksi apa pun.
- `sisteminformasibanjir.jakarta.go.id` dipanggil dengan token klien yang diambil dari JS; tidak dipakai di riset ini.
- Hasil uji bersifat satu kali; endpoint tanpa SLA, gunakan cache 5-10 menit dan jaga User-Agent jujur.
- Skrip uji sempat menampilkan isi berkas sebelumnya saat curl gagal (kode 000); tabel di atas hanya memuat hasil yang diverifikasi ulang.

## Prioritas pasang

1. **`datatmalaststatus.json` (DSDA)**: menggantikan scraping HTML, memberi ambang SIAGA1-4 dan koordinat resmi untuk 38 pos, JSON stabil dan sudah dipakai banyak pihak.
2. **`datacurahhujan.json` (DSDA)**: 88 pos hujan Jakarta+hulu (Katulampa, Depok, Gunung Mas) persis seperti situs pembanding; kunci untuk nowcast hulu-hilir Ciliwung.
3. **PetaBencana.id reports + floods TopoJSON**: satu-satunya sumber genangan terverifikasi per RW/titik dengan kedalaman cm; murah dan hidup.
4. **IOC Sea Level (sema, sura, koli, beno, cili)**: pasut observasi real-time untuk rob Semarang, Surabaya, Jakarta; melengkapi prakiraan BMKG Maritim. Cek datum dulu.
5. **BMKG prakiraan per kelurahan (`api.bmkg.go.id/publik/prakiraan-cuaca`)**: prakiraan resmi 3 jam untuk validasi Open-Meteo; hormati batas 60/menit.
6. **Copernicus GFM WMS**: bukti banjir terobservasi satelit untuk validasi uji balik dan lapisan "jejak banjir"; tanpa kunci.
7. **gis.bnpb.go.id (`Kelas_Banjir`, `inarisk`)**: lapisan rawan statis sebagai konteks risiko; periksa layer mana yang tanpa token.
8. **BMKG Radar API (minta key resmi)**: radar adalah celah terbesar untuk nowcast; surat ke BMKG untuk key dibanding scraping.
9. **Akses resmi rumah pompa DSDA (`rumahPompaReports`)**: satu-satunya sumber status 94 pompa; ajukan akses/token resmi, bukan memakai token SPA.
10. **Pemda kota (Semarang, Surabaya, Bandung, Medan, dll)**: belum ada endpoint publik ditemukan; kerjakan lewat BPBD/Dinas PU atau inspeksi DevTools berizin.
