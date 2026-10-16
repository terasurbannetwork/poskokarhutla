# Sumber data terbuka per bencana

Diverifikasi 15 Okt 2026 dari jaringan Mac pemilik, satu kali per endpoint, jeda 1,5 detik.
**Belum ada yang diuji dari runner GitHub Actions atau Cloudflare Workers**: itu wajib dilakukan
di ALUR tahap 1 sebelum workflow ditulis.

Tanda: **[OK]** HTTP 200 dan isi diperiksa · **[OK-hdr]** 200, isi belum diurai ·
**[AUTH]** butuh kunci/token gratis · **[BLOK]** gagal · **[BV]** belum diverifikasi (dari pengetahuan, jangan dibangun sebelum diambil sekali).

## 0. Temuan yang mengubah rancangan

1. **BMKG menolak UA pendek.** Semua `data.bmkg.go.id`, `api.bmkg.go.id`, `www.bmkg.go.id` menjawab
   `403 Forbidden` untuk `User-Agent: Mozilla/5.0`, dan 200 untuk UA peramban lengkap
   (`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36`).
   `scripts/umum/jaring.py` wajib mengirim UA lengkap untuk host BMKG. Belum diuji dari IP Actions.
   Karena ini menyamar sebagai peramban, beban ke BMKG dijaga sekecil mungkin: `If-None-Match` /
   `If-Modified-Since`, polling 1 menit hanya `autogempa.json`, berkas lain 5 menit, dan bila tetap
   diblok, hubungi BMKG untuk akses resmi alih-alih mencari cara menembus.
   Cadangan bila Actions diblok: panen BMKG lewat cron Worker, atau lewat Mac mini (pola panen Radar).
2. **MAGMA (PVMBG) tidak punya API JSON terbuka.** `magma.esdm.go.id/api/v1/...` menjawab 401.
   Halaman HTML publik bisa dipanen tetapi rapuh. Modul gunung api harus menganggap pemanen ini
   bisa patah kapan saja: `uji` dengan contoh HTML tersimpan, dan cadangan GDACS.
3. **ReliefWeb v1 mati (410).** v2 butuh `appname` yang didaftarkan lewat formulir.
4. **OpenAQ v3 butuh `X-API-Key` (gratis).** WAQI butuh token gratis dan melarang redistribusi data massal.
5. **ArcGIS BNPB terbuka tanpa login**: `https://gis.bnpb.go.id/server/rest/services?f=json` [OK],
   folder `inarisk`, `inarisk_darurat`, `Bencana_Harian`, `Bencana_Mingguan`,
   `TSUNAMI_DAN_GELOMBANG_TINGGI`, `InAWARE`, `Gunung_Semeru`, `Gunungapi_Merapi`,
   layanan `Kejadian_Bencana_Mingguan` (FeatureServer). Ini calon sumber bersama uji balik semua bencana.

## 1. Gempa bumi

| Sumber | URL | Format / frekuensi | Ketentuan | Status |
| --- | --- | --- | --- | --- |
| BMKG gempa terbaru M5+ | https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json | JSON, detik–menit setelah kejadian | Data terbuka BMKG, sebut BMKG | [OK] (UA lengkap) |
| BMKG 15 gempa M5+ terakhir | https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json | JSON | idem | [OK] |
| BMKG 15 gempa dirasakan | https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json | JSON, termasuk M kecil (mis. M2,7) | idem | [OK] |
| BMKG peta guncangan | `https://static.bmkg.go.id/<Shakemap>` (contoh `20261015223238.mmi.jpg`) | JPG | idem | pola URL [BV] |
| USGS FDSN | https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-11&maxlatitude=6&minlongitude=95&maxlongitude=141&minmagnitude=5 | GeoJSON/CSV, sejak 1900 | Domain publik AS | [OK] |
| USGS umpan ringkas | https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson | GeoJSON, tiap menit | idem | [OK] |
| USGS hitung | `.../fdsnws/event/1/count?starttime=2000-01-01&...&minmagnitude=4.5` | teks | idem | [OK] = 26.004 kejadian M4,5+ sejak 2000 |
| EMSC SeismicPortal | https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1&minlat=-11&maxlat=6&minlon=95&maxlon=141 | GeoJSON | Gratis, sebut EMSC | [OK] |
| USGS ShakeMap | `properties.detail` → `products.shakemap` (`cont_mmi.json`, `grid.xml`) | JSON/XML | idem | [BV] |

Kolom BMKG: `Tanggal`, `Jam`, `DateTime` (ISO UTC), `Coordinates`, `Lintang`, `Bujur`, `Magnitude`
(teks), `Kedalaman` (teks berakhiran "km"), `Wilayah`, `Potensi` (teks tsunami), `Dirasakan`
(MMI per tempat, mis. "III Darajat"), `Shakemap`.
Kolom USGS: `mag`, `place`, `time` (ms epoch), `mmi`, `cdi`, `alert` (PAGER), `tsunami`, `sig`,
`magType`, `ids`, `detail`, kedalaman di geometri.

## 2. Tsunami

| Sumber | URL | Catatan | Status |
| --- | --- | --- | --- |
| Kolom `Potensi` BMKG | autogempa.json | Hanya teks "tidak berpotensi tsunami" / "berpotensi tsunami" | [OK] |
| InaTEWS | https://inatews.bmkg.go.id/ | Halaman peringatan | [BV] |
| PTWC (NOAA) Atom | https://www.tsunami.gov/events/xml/PHEBAtom.xml | Atom, saring judul untuk wilayah Indonesia | [OK] |
| InaRISK bahaya tsunami | `https://gis.bnpb.go.id/server/rest/services/inarisk` dan folder `TSUNAMI_DAN_GELOMBANG_TINGGI` | `MapServer/<id>/query?where=1=1&f=geojson` | folder [OK], id lapisan [BV] |
| GDACS | https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ | Bendera tsunami pada gempa | [OK] |

## 3. Gunung api

| Sumber | URL | Format | Status |
| --- | --- | --- | --- |
| MAGMA informasi letusan | https://magma.esdm.go.id/v1/gunung-api/informasi-letusan | HTML ±50 KB; rincian `.../<uuid>/show` | [OK] dipanen HTML |
| MAGMA VONA | https://magma.esdm.go.id/v1/vona | HTML | [OK] dipanen HTML |
| MAGMA API | https://magma.esdm.go.id/api/v1/home/gunung-api | JSON | [AUTH] 401, prosedur token tidak terdokumentasi |
| Daftar level I–IV | https://magma.esdm.go.id/v1/gunung-api/ | HTML | [BV] |
| Peta KRB | MAGMA (PDF) dan folder BNPB `Gunung_Semeru`, `Gunungapi_Merapi` | PDF / MapServer | folder [OK], poligon KRB [BV] |
| GVP WFS katalog letusan | https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wms?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW:E3WebApp_Eruptions1960&outputFormat=application/json | GeoJSON | [OK-hdr] |
| GVP RSS mingguan | https://volcano.si.edu/news/WeeklyVolcanoRSS.xml | RSS | [BLOK] 403 |
| GDACS gunung api | https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=VO&country=Indonesia | GeoJSON | [OK] (Krakatau Oranye 4 Sep 2026) |
| VAAC Darwin | https://www.bom.gov.au/products/IDD41300.shtml | teks | [BV] (301) |
| Angin lapisan atas | Open-Meteo `wind_speed_700hPa`, `500hPa`, `300hPa` | JSON | [OK] (layanan yang sama) |
| Sentinel-5P SO2, MIROVA | Copernicus Data Space; mirovaweb.it | NetCDF / tanpa API | [BV], dilewati untuk stdlib |

## 4. Cuaca ekstrem, angin, siklon, gelombang tinggi

| Sumber | URL | Format | Status |
| --- | --- | --- | --- |
| BMKG nowcast RSS | https://www.bmkg.go.id/alerts/nowcast/id | RSS 2.0, tiap 10–30 menit | [OK] |
| BMKG CAP per peringatan | `https://www.bmkg.go.id/alerts/nowcast/id/<KODE>_alert.xml` (dari `<link>` RSS) | CAP 1.2 dengan `<polygon>` | pola [OK], isi [BV] |
| BMKG prakiraan | https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.03.1001 | JSON per kelurahan, 3-jaman 3 hari | [OK] |
| Open-Meteo prakiraan + ERA5 | https://api.open-meteo.com/v1/forecast, https://archive-api.open-meteo.com/v1/archive | JSON | [OK]; nonkomersial 10.000 panggilan/hari |
| IBTrACS | https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.WP.list.v04r01.csv (juga `SP`, `SI`) | CSV 6-jaman | [OK]; domain publik |
| GDACS siklon | `eventlist=TC` | GeoJSON | [OK] |
| JTWC | metoc.navy.mil | teks | [BLOK] 403 |
| TCWC Jakarta | https://www.bmkg.go.id/cuaca/siklon-tropis | halaman | [BV], tanpa umpan mesin |
| Open-Meteo Marine | https://marine-api.open-meteo.com/v1/marine?latitude=-8&longitude=115&hourly=wave_height | JSON (tinggi, periode, arah gelombang, swell) | [OK] |
| BMKG Maritim | https://maritim.bmkg.go.id/ | PDF/gambar | [BV]; sudah dipanen sebagian di `scripts/banjir/peringatan.py` dan `rob.py` |

## 5. Tanah longsor (bagian modul banjir)

| Sumber | URL | Status |
| --- | --- | --- |
| Open-Meteo hujan + kelembapan tanah | API yang sudah dipakai | [OK] |
| GPM IMERG | https://gpm1.gesdisc.eosdis.nasa.gov/data/GPM_L3/GPM_3IMERGHHL.07/ | [AUTH] Earthdata, HDF5 (berat untuk stdlib) |
| NASA LHASA | https://gpm.nasa.gov/data/landslides | [BLOK] 404, portal pindah |
| PVMBG prakiraan gerakan tanah | https://vsi.esdm.go.id/ | [BV], PDF bulanan |
| InaRISK longsor | `gis.bnpb.go.id/server/rest/services/inarisk` | folder [OK] |

## 6. Kekeringan

| Sumber | URL | Status |
| --- | --- | --- |
| BMKG HTH | halaman lama 404 | [BLOK]; hitung HTH sendiri dari hujan harian |
| CHIRPS harian 0,05° | https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05/ | [OK]; GeoTIFF `.tif.gz`, domain publik, jeda ±2 hari |
| ONI | https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt | [OK] (sudah dipakai `iklim.py`) |
| SOI | https://www.cpc.ncep.noaa.gov/data/indices/soi | [OK-hdr] |
| DMI (IOD) | https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data | [OK] |
| Kelembapan tanah ERA5 | archive-api.open-meteo.com `soil_moisture_0_to_7cm` | [OK] |

## 7. Kualitas udara

| Sumber | URL | Status |
| --- | --- | --- |
| Open-Meteo Air Quality (CAMS) | https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-6.2&longitude=106.8&hourly=pm10,pm2_5 | [OK]; juga `us_aqi`, `carbon_monoxide`, `dust`, `aerosol_optical_depth`; sudah dipakai `scripts/data/asap.py` |
| WAQI/AQICN | https://api.waqi.info/feed/<kota>/?token=<token> | [AUTH] token gratis; larang redistribusi massal |
| OpenAQ v3 | https://api.openaq.org/v3/locations | [AUTH] kunci gratis |
| ISPU KLHK | https://ispu.menlhk.go.id/ | [BLOK] habis waktu |

## 8. Lintas bencana

| Sumber | URL | Status |
| --- | --- | --- |
| GDACS | https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP dan `SEARCH?eventlist=EQ;TC;VO;FL;DR&country=Indonesia` | [OK]; kolom `alertlevel`, `alertscore`, `glide`, `severitydata`; sebut GDACS/EC JRC |
| BNPB ArcGIS | https://gis.bnpb.go.id/server/rest/services?f=json, `Kejadian_Bencana_Mingguan/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson` | [OK] root; kolom layanan [BV] |
| BNPB DIBI | https://dibi.bnpb.go.id/ | 301; sudah dipanen lewat Superset tamu di `scripts/banjir/kejadian.py` |
| ReliefWeb v2 | https://api.reliefweb.int/v2/disasters?appname=<terdaftar> | [AUTH] |
| Copernicus EMS | https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/ | [BV] |

## 9. Boleh dipublikasi ulang?

Wajib diisi sebelum sumber dipakai di layar publik.

| Sumber | Boleh tayang ulang | Syarat |
| --- | --- | --- |
| BMKG (data terbuka) | Ya | Sebut BMKG |
| USGS, IBTrACS, CPC/PSL NOAA, PTWC | Ya | Domain publik AS; sebut sumber |
| EMSC | Ya | Sebut EMSC |
| GDACS | Ya | Sebut GDACS/EC JRC |
| Open-Meteo (termasuk CAMS, Marine) | Ya, nonkomersial | Sebut Open-Meteo dan penyedia model (ECMWF/Copernicus) |
| BNPB ArcGIS / InaRISK / DIBI | Ketentuan tidak tertulis | Sebut BNPB; tanyakan bila dipakai massal |
| MAGMA / PVMBG (HTML) | Tidak ada lisensi terbuka | Atribusi eksplisit PVMBG, tautan ke halaman asli, ikuti kebijakan situsnya; tanyakan izin tertulis sebelum rilis |
| WAQI | Terbatas | Hanya nilai terkini bertaut; dilarang redistribusi massal; tidak disimpan sebagai seri |
| OpenAQ | Ya | Sebut OpenAQ dan pemilik stasiun |
| ReliefWeb | Ya | Atribusi UN OCHA; periksa hak cipta per item |
| Wikimedia Commons (foto dummy) | Ya | Lisensi per berkas di `kredit.json` |

## 10. Rahasia yang dibutuhkan

| Nama | Untuk | Tempat |
| --- | --- | --- |
| `OPENAQ_KEY` | Validasi udara | Secret GitHub Actions |
| `WAQI_TOKEN` | Stasiun kota (tampil dengan atribusi, tanpa redistribusi massal) | Secret Actions |
| `RELIEFWEB_APPNAME` | Laporan kemanusiaan | Secret Actions |
| `EARTHDATA_TOKEN` | Hanya bila IMERG diputuskan dipakai | Secret Actions |

Tidak satu pun boleh masuk berkas yang dilacak git (AGENTS.md §9).
