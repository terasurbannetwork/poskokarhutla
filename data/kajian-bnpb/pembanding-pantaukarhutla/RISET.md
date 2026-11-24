# Pembanding: pantaukarhutla.com (24 Nov 2026)

Bahan riset, bukan keputusan. Tiap butir yang mau dibangun tetap lewat paket dokumen dan tiket modul pemiliknya (AGENTS §3.7).

## Sumber

- Situs: https://pantaukarhutla.com, data statis JSON di `https://data.pantaukarhutla.com/v1/` (`dashboard`, `alerts`, `events/live`, `events/<id>`, `progression/<id>`, `spread/*`, `smoke/{smog,wind,plumes,cities,stations,transboundary}`, `himawari/early`, `danger`, `outlook`, `compare`, `history/*`, `feeds/<provinsi>.xml`).
- Kode: https://github.com/pantaukarhutla/pantau-karhutla, lisensi MIT. Push terakhir 21 Okt 2026, situs lebih baru. Bebas dipakai, asal pemberitahuan lisensinya ikut.
- Stack: pipeline Python `haze` (uv, DuckDB, pytest 29 berkas), web Vite + React + MapLibre, keluaran ke R2, Actions tiap 2 jam.
- Riset tertulis di `docs/research/` (16 berkas, ±500 KB) dan `docs/models.md`.
- Ekspor data mereka (pembanding angka, tidak masuk repo): `~/Downloads/kebakaran-2026.{csv,geojson}` (7.244 kebakaran), `desa-waspada-api.csv` (1.824 desa), `wilayah-2026.csv`.
- Video Instagram mereka di `~/Downloads/savefromins.com*.mp4`: 12 video, 7 soal karhutla, sisanya cuaca dan banjir.

## Posisi kita

**Kita lebih kuat:**
- Model sebaran api: GBDT, FBP, kalibrasi Platt, hindcast, prospektif.
- Koreksi PM2,5 dengan stasiun, plus ansambel GEOS-CF.
- Atribusi asap domestik sampai konsesi.
- Model risiko yang didaftarkan sebelum dilatih.
- Luas terbakar: Olofsson, dNBR, MCD64.

**Setara:**
- Pengelompokan insiden dengan ID tetap.
- Hitungan setara SiPongi.
- Riwayat sel terbakar.
- Aturan status.

**Kita lebih lemah atau belum punya:**
- Perkembangan api per insiden, nama desa, Himawari teruji, feed RSS, Asia Tenggara, lintas negara, uji balik model asap, skor prakiraan kota, api 3D di peta utama, aturan performa peta, desa waspada.

## Layak diambil, urut nilai

1. **Skor prakiraan PM2,5 kota.** Tiap prakiraan dicatat, lalu setelah harinya lewat dinilai terhadap stasiun ISPU dalam 25 km: kategori tepat, meleset ≤ 1, dan pembanding persistensi. Rujukan: `pipeline/src/haze/verify.py`.
2. **Perkembangan api per insiden.**
   - Waktu tiba per sel = deteksi pertama dikurangi setengah jeda lintasan, lalu diisi median 5 tetangga.
   - Garis depan pukul 14.00 WIB.
   - Laju = p90 kemajuan.
   - Lompatan > 2 km dicatat sebagai api ke lokasi baru.
   - Kemajuan di bawah 1 sel ditulis `resolved:false`, bukan 0.
   - Rujukan: `progression.py`, `docs/research/fire-progression.md`.
3. **Bangunan dekat api per insiden.**
   - Mereka memakai bangunan OSM dalam 500 m dari petak 375 m.
   - Kita pakai mesin yang sudah ada (`scripts/umum/paparan_bangunan.py`, Google Open Buildings ≥ 0,70), yang lebih lengkap di Kalimantan dan Papua.
   - Angka per insiden boleh tampil; rincian sel tetap di balik sesi (AGENTS §2.9).
4. **Himawari teruji.**
   - Simpan reliability 5 saja (presisi 91% vs 74% untuk rel 3).
   - Tampilkan hanya bila belum ada VIIRS dalam 5 km selama 72 jam, terlihat dua kali dalam 1 jam, dan tidak dekat sumber statis atau daftar 428 alarm palsu (`pipeline/static/himawari_false_alarms.csv`).
   - Kita sekarang memakai rel ≥ 3 (`scripts/data/himawari.py`). Data P-Tree tidak boleh diredistribusi.
5. **Uji balik model asap.**
   - Uji terhadap AOD MODIS (AUC 0,86–0,87; tanpa angin 0,74).
   - Uji garis asap per kebakaran terhadap ERA5: 2.038 jalur, ujung meleset median 33 km pada 24 jam; angin dianggap tetap 121 km.
   - `lintasan.py`, `atribusi.py` dan `asal.py` kita belum pernah diuji.
   - Rujukan: `scripts/backtest_smoke_*.py`, `calibrate_smoke.py`.
6. **Feed Atom per provinsi.**
   - ID tetap = jenis + subjek + hari, tanpa state.
   - Ambang:
     - Kebakaran baru: ≥ 10 titik gambut atau ≥ 20 titik non-gambut dalam 48 jam (nasional 20/50).
     - Meluas: ≥ 50 piksel per hari.
     - Risiko ekstrem: ≥ 25% wilayah.
   - Rujukan: `alerts.py`.
7. **Api 3D dan cahaya matahari.**
   - `web/src/fire3d.ts` (365 baris): lapisan kustom WebGL2, partikel api dan asap dihitung di shader. Bisa dipindah ke JS biasa untuk `public/index.html`.
   - `sun.ts` dan `map/lighting.ts`: posisi matahari dan redaman kabut menentukan warna langit, kecerahan citra, dan hillshade.
   - `windParticles.ts`: partikel angin di canvas 2D.
   - Rumus lengkapnya ada di laporan agent 24 Nov dan di berkas sumbernya.
8. **Aturan performa peta** (`docs/rendering-performance.md`):
   - Semua lapisan tanah dalam satu blok urutan lapisan.
   - Tidak ada `setPaintProperty` berkala.
   - Tidak membaca elevasi per partikel.
   - Tile medan 64 px.
   - DPR paling tinggi 2.
   - HUD `?perf`.
9. **Lain-lain:**
   - Perbandingan Asia Tenggara S-NPP 2012–2025, total dan per 1.000 km².
   - Desa waspada: dua daftar dengan laju hindcast 39% dan 11,6%.
   - Prospek musim P(hujan < 4 mm/hari).
   - Saran sekolah sesuai SE Mendikdasmen 20/2026.
   - "Bukan yang pertama": persen petak insiden yang pernah terbakar, per tahun.
   - "Api terdekat, di jalur angin menuju sini" untuk Cek lokasi.

## Sumber data yang belum kita pakai

| Sumber | Endpoint | Catatan |
| --- | --- | --- |
| ISPU langsung | `https://ispu.kemenlh.go.id/apimobile/v1/getStations` | tanpa kunci; kita sekarang lewat WAQI/OpenAQ |
| DOE Malaysia | `eqms.doe.gov.my/api3/publicmapproxy/...CAQM_MCAQM_Current_Reading/MapServer/0/query` | satuan API, dibalik ke µg/m³; hanya 24 jam |
| NEA Singapura | `https://api-open.data.gov.sg/v2/real-time/api/pm25` | UA bawaan urllib kena 403 |
| GFWED GEOS-5 | `portal.nccs.nasa.gov/datashare/GlobalFWI/v2.0/fwiCalcs.GEOS-5/...` | FWI +8 hari, untuk warm start |
| SiPongi hotspot | `opsroom.sipongidata.my.id/api/opsroom/indoHotspot?...` | angka pembanding resmi |
| BRIN hotspot | `hotspot.brin.go.id/getCSV?...` | kelas 7/8/9 dan nama kecamatan |
| BNPB karhutla | `gis.bnpb.go.id/.../2026_karhutla/mv_prov_karhutla_2026/FeatureServer/3` | personel, sorti, OMC; jarang diperbarui |
| VIIRS Nightfire | (EOG) | benih daftar suar gas |
| FireCCI S311 | `dap.ceda.ac.uk/neodc/esacci/fire/data/burned_area/Sentinel3_SYN/` | pembanding luas |
| FIRMS GeoParquet | `https://data.source.coop/portolan-mirrors/firms-catalog/catalog.json` | arsip FIRMS 2000 sampai sekarang, cloud-native |

## Jebakan data yang mereka temukan

- **ISPU:**
  - `a_pm25` adalah rata-rata berjalan 24 jam, bukan nilai per jam.
  - Buang baris dengan `c_pm25` null.
  - Buang juga bila `a_pm25 > 1,5·a_pm10 + 5`.
  - `time_z` salah untuk Balikpapan, Kutai Barat, Bontang, Tarakan.
- **Satelit:**
  - NOAA-21 menaikkan hitungan 1,6–1,7× dibanding SiPongi; tren antartahun pakai S-NPP saja.
  - S-NPP kosong 44 hari di 2026.
- **Luas:** jumlah per event menghitung dobel. Pakai sel unik per satelit, rata-rata antarsatelit, dikali 14,06 ha × k (k = 0,49 terhadap KLHK).
- **Pemakaian:**
  - Kuota Open-Meteo 10.000 per hari; arsipnya kena 429 dari IP bersama.
  - Lapisan P-Tree Himawari dan KML ASMC tidak boleh diterbitkan ulang.

## Repo GitHub lain yang relevan

- **[gisrad/wildfire-watch](https://github.com/gisrad/wildfire-watch)** (MIT): Cloudflare Worker + D1, stack sama dengan kita. Cron 30 menit dengan lease D1, memisahkan karhutla dari PLTU/smelter/suar, dan menyaring titik di wilayah negara tetangga.
- **[romainsildev/pyroscope](https://github.com/romainsildev/pyroscope)** (MIT): ruang operasi kebakaran Prancis. Kebakaran bernama, perimeter dan front, replay citra 10 menit, pesawat pemadam lewat ADS-B, FWI lokal. Pola ADS-B relevan untuk Operasi Udara.
- **[portolan-mirrors/firms-catalog](https://github.com/portolan-mirrors/firms-catalog)** (Apache-2.0): arsip seluruh FIRMS sebagai GeoParquet, diperbarui tiap jam.
- **[neekaru/ispunet-ai](https://github.com/neekaru/ispunet-ai)** (tanpa lisensi): endpoint ISPU hasil dekompilasi aplikasi KLHK. Boleh dibaca sebagai rujukan, jangan disalin.
- **[anasysuf/sekitarku](https://github.com/anasysuf/sekitarku)** (MIT): dasbor udara, cuaca, karhutla, gunung api, gempa (BMKG FDRS, SiPongi+, MAGMA).
- **[Din131/indonesia-haze-monitor](https://github.com/Din131/indonesia-haze-monitor)**: pipeline Actions tiap 3 jam ke Pages, dengan validasi sebelum terbit.
- **[leejianrong/haze-info](https://github.com/leejianrong/haze-info)** (tanpa lisensi): penjelasan kabut asap Okt 2026. Aturan atribusi perusahaan berbasis bukti ada di ADR-0002.
- **Mesin dan pustaka:**
  - [lautenberger/elmfire](https://github.com/lautenberger/elmfire): model sebaran level set.
  - [bcgov/wps](https://github.com/bcgov/wps): layanan prediksi kebakaran BC.
  - [gagreene/cffdrs](https://github.com/gagreene/cffdrs): FWI Python.
  - [LevineLabDuke/fireProgression](https://github.com/LevineLabDuke/fireProgression): progresi harian VIIRS, dalam R.
  - [mscross/pysplit](https://github.com/mscross/pysplit): lintasan HYSPLIT.

Pencarian GitHub berhenti karena kena batas laju API. Kata kunci yang belum dicari: `sipongi`, `bmkg api`, `himawari fire`, `fire danger forecast`.
