# Rencana panen data publik (29 Okt 2026)

Permintaan pemilik: 41 sumber publik baru. Tiap sumber harus **diolah** dengan
rumus menjadi analisis yang punya keluaran, dan sedapat mungkin jadi model
prediksi yang diuji balik. Dokumen ini adalah kontraknya. Agen pengerja
mengambil baris miliknya dan hanya mengerjakan cakupan itu.

## Aturan yang berlaku untuk semua baris

1. **Tidak ada jadwal per menit.** Tugas baru di Worker paling cepat sekali per
   jam, dan lewat dispatcher `* * * * *` yang sudah ada di `src/worker.js`.
   Jangan tambah cron trigger: akun Free cuma boleh 5. Pipeline Python dirantai
   ke workflow yang sudah ada (`data.yml` harian, `titik.yml` 3-jam,
   `statis.yml` bulanan, `lab.yml` manual). Jangan bikin workflow baru kecuali
   tak ada yang cocok.
2. **Anggaran Cloudflare Free**, diperiksa sebelum kode ditulis:
   - per invokasi maksimal 50 subrequest dan ~10 ms CPU;
   - D1 maksimal 100 rb tulis per hari dan 5 jt baca per hari;
   - aset statis maksimal 20.000 berkas (sekarang 9.696 berkas di `public/`) dan 25 MiB per berkas.

   Akibatnya: tiap sumber menulis **berkas bergulir tetap**, bukan satu berkas
   per hari. Satu sumber paling banyak 3 berkas, dan tiap berkas ≤ 2 MB kecuali
   ada alasan tertulis.
3. **Stdlib dulu.** Raster besar (MERIT, SoilGrids, canopy, MapBiomas, MAIAC,
   Overture) diolah di `lab.yml` atau di lokal, yang boleh pakai
   numpy/rasterio. Yang di-commit hanya agregat per kab/kec/sel.
4. **Kunci API** dibaca dari env, tidak pernah ditulis ke berkas. Pengerja
   tidak membuat akun. Kalau kunci belum ada, kodenya tetap jadi dan uji
   live-nya ditandai MENUNGGU KUNCI.
5. **Model jujur.** Tiap model menyebut sasaran, fitur, pembagian waktu (latih
   lama, uji baru, tanpa bocor), metrik, dan pembanding naif (persistensi atau
   klimatologi). Hasilnya ditulis LOLOS atau GAGAL apa adanya. Yang tidak punya
   label untuk diuji ditulis sebagai **indeks** atau **fitur**, bukan "model
   prediksi". Semua model diperiksa `validasi-model`.
6. **Atribusi dan syarat pakai** tiap sumber dicatat di keluarannya
   (`atribusi`, `lisensi`).

## Peta sumber → olahan → model → keluaran

Kolom Jadwal menyebut workflow tempat skrip dirantai.

### Karhutla (pipa-data, model-sebaran)

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 1 | RADD + GLAD-S2 (GFW Data API) | Laju tebang (ha/30 hari) per kab; fraksi di gambut dan di konsesi | P(titik api ≤ 90 hari \| alert tebang di sel 1 km), regresi logistik (umur alert, gambut, musim FWI). Latih 2021–23, uji 2024–25. Metrik: AUC dan lift desil teratas vs riwayat titik saja | `public/data/alert_tebang.json` | data.yml |
| 2 | Sentinel-3 SLSTR FRP malam | Fraksi deteksi malam per cluster = FRP malam / FRP total | P(cluster bertahan > 72 jam \| fraksi malam), logistik. Label durasi dari arsip `kluster_hari`. Metrik: AUC vs FWI saja | `public/data/slstr_malam.json` | titik.yml |
| 3 | Perhutanan Sosial (PIAPS) | Pangsa titik/luas di areal PS per prov | Fitur untuk #1; tanpa model sendiri | `public/data/ps.json` | statis.yml |
| 4 | MapBiomas Indonesia | Matriks transisi Markov tutupan lahan per tahun | P(jadi sawit ≤ 3 tahun \| terbakar), dilatih pada kebakaran 2015 dan diuji pada kebakaran 2019 | `public/data/transisi_lahan.json` | lab, tahunan |
| 5 | ATR/BPN Bhumi (HGU) | Atribusi titik ke pemegang HGU; indeks residivis = tahun berapi / tahun teramati | P(api berulang di HGU tahun depan \| riwayat), dibandingkan dengan pembanding persistensi | `public/data/hgu_api.json` | statis.yml |
| 6 | ESDM MOMI (izin tambang) | Titik api dan genangan di dalam IUP | Fitur untuk #1 dan model banjir | `public/data/tambang.json` | statis.yml |
| 7 | Canopy height (Meta/WRI 1 m) | Muatan bahan bakar W = a·hᵇ (alometri, dari literatur) per sel | Fitur baru di model sebaran. LOLOS bila AUC uji naik dan Brier tidak memburuk | `public/data/bahan_bakar.json` | lab, sekali |

### Udara dan cuaca (cuaca-udara)

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 8 | Sentinel-5P TROPOMI | CO_anom = (CO − median 30 hari provinsi bersih) / MAD; AI > 1 = asap | CO_anom besok ~ FRP hari ini + angin + CO_anom hari ini. Metrik: RMSE vs persistensi | `public/udara/data/tropomi_*.json` | udara.yml |
| 9 | OpenAQ | Bias CAMS per stasiun | MOS: PM2.5_obs ~ PM2.5_CAMS + angin + hujan. Metrik: MAE bulan uji vs CAMS mentah | `public/udara/data/openaq_mos.json` | udara.yml |
| 10 | NASA GEOS-CF | Ensambel CAMS + GEOS-CF dengan bobot 1/MSE terhadap #9 | Metrik: MAE ensambel vs anggota terbaik | `public/udara/data/geoscf.json` | udara.yml |
| 11 | MAIAC AOD 1 km | PM2.5 = β₀ + β₁·AOD + β₂·BLH + β₃·RH + efek provinsi | Peta PM2.5 1 km. Uji tinggalkan-satu-stasiun (R², RMSE) | `public/udara/data/pm25_1km.json` | lab, harian bila ringan |
| 12 | OGIMET SYNOP (~170 stasiun BMKG) | Verifikasi POD/FAR/CSI hujan > 20 mm dan bias suhu | MOS koreksi prakiraan Open-Meteo per stasiun. Metrik: CSI uji vs mentah | `public/banjir/data/cuaca_verif_synop.json` | data.yml |
| 13 | NOAA GHCN-Daily | P95 per stasiun, tren Sen, GEV untuk hujan periode ulang 10/50 tahun | Ambang ekstrem untuk #12 dan model longsor | `public/data/iklim_stasiun.json` | statis.yml |

### Banjir (banjir)

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 14 | Copernicus EMS Rapid Mapping | Poligon dampak sebagai set validasi | CSI/POD/FAR model genangan kita vs poligon EMS | `public/banjir/data/ems.json` | data.yml |
| 15 | International Charter (aktivasi) | Latensi kejadian → aktivasi | P(bencana skala Charter \| korban awal, bahaya), logistik pada riwayat. Kalau label < 30, ditulis indeks | `public/data/charter.json` | data.yml |
| 16 | NASA LANCE MCDWD | Luas banjir harian per kab, persistensi | P(banjir terdeteksi besok \| GloFAS, hujan 3 hari), logistik. Metrik: AUC vs persistensi | `public/banjir/data/mcdwd.json` | banjir.yml |
| 17 | MERIT Hydro | HAND per sel; kerentanan genangan = HAND < 5 m × luas hulu | Fitur model genangan; diuji dengan #14 dan #16 | `public/banjir/data/hand_kab.json` | lab, sekali |

### Longsor (agen baru `longsor`)

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 18 | SoilGrids | Kelompok hidrologi tanah dari pasir/liat → Curve Number; Q = (P − 0,2S)² / (P + 0,8S) | Fitur longsor dan banjir | `public/longsor/data/tanah.json` | lab, sekali |
| 19 | NASA Global Landslide Catalog + DIBI longsor | Label kejadian | Sasaran untuk #20 | `public/longsor/data/kejadian.json` | statis.yml |
| 20 | NASA LHASA (rumus dibangun ulang) | Kerentanan (lereng, tanah, sesar, tutupan) × hujan 7 hari > P95 → bahaya tinggi/sedang | Nowcast longsor harian per kec. Uji: POD/FAR dan AUC vs #19 pada tahun yang ditahan | `public/longsor/data/nowcast.json` | data.yml |

### Gempa dan tsunami (gempa)

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 21 | EMSC Seismicportal + laporan dirasakan | Residu MMI = dirasakan − prediksi GMPE kita, per region | GMPE terkoreksi bias. Metrik: RMSE MMI uji vs GMPE mentah | `public/gempa/data/emsc_residu.json` | gempa.yml |
| 22 | Nevada Geodetic Lab GNSS | Kecepatan (kuadrat terkecil linear + musiman); transien = residu > 3σ | Indeks regangan sebagai fitur `peluang_gempa.py`; bukan prediksi | `public/gempa/data/gnss.json` | statis.yml |
| 23 | NOAA NDBC DART | Residu tinggi kolom air sesudah pasut dibuang; ambang deteksi | Bandingkan dengan tinggi/waktu tiba dari model tsunami kita pada kejadian lampau | `public/gempa/data/dart.json` | gempa.yml |

### Gunung api, kekeringan, air (gunungapi-kering, neraca-air)

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 24 | MIROVA (**sudah jadi**) | Penanda VRP: ambang = median + 3·1,4826·MAD (90 hari) | P(level MAGMA naik ≤ 30 hari \| sinyal), dicatat prospektif karena tak ada arsip | `public/gunungapi/data/mirova.json` | titik.yml |
| 25 | Copernicus GDO (CDI, SPI, anomali lengas) | Kesepakatan dengan status kekeringan kita (Cohen κ) | Anggota ensambel status kekeringan | `public/kekeringan/data/gdo.json` | data.yml |
| 26 | KATAM Kementan | Fase tanam × defisit air (HTH/neraca) → risiko puso | P(puso) dikalibrasi ke data puso | `public/kekeringan/data/katam.json` | statis.yml |
| 27 | GRACE-FO | Anomali simpanan air (TWSA) per wilayah sungai Jawa, tren Sen | AR(1) + musiman, prakiraan 3 bulan, uji hindcast; dibandingkan dengan simpanan model neraca | `public/data/neraca_air/grace.json` | statis.yml |

### Kerentanan, kapasitas, risiko (ruang-bnpb)

Inti olahannya rumus resmi Perka BNPB 2/2012: **R = H × V / C**.

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 28 | BPS WebAPI | z-score kemiskinan, kepadatan, % lansia/balita per kab | Bagian V | `public/data/bnpb/kerentanan.json` | statis.yml |
| 29 | Meta Relative Wealth Index (HDX) | RWI terbalik, dirata-rata ke kec/kab | Bagian V | (sama dengan #28) | statis.yml |
| 30 | Dukcapil GIS | Penduduk rentan terpapar = Σ desa dalam zona bahaya | Jiwa terpapar per kejadian | `public/data/bnpb/terpapar.json` | statis.yml |
| 31 | PODES BPS | Frekuensi bencana dan fasilitas per desa, bila tabel terbuka | Label tambahan untuk model kerugian | `public/data/bnpb/podes.json` | statis.yml |
| 32 | Indeks Ketahanan Daerah BNPB | C per kab | Bagian C | `public/data/bnpb/ikd.json` | statis.yml |
| 33 | DJPK Kemenkeu (APBD) | Belanja BPBD + BTT per kapita; kesenjangan = rank(R) − rank(anggaran) | Korban/kerugian per kejadian (DIBI) ~ H, V, C, regresi binomial negatif. Latih 2015–21, uji 2022–25. Pembanding: H saja | `public/data/bnpb/risiko_hvc.json` | statis.yml |
| 34 | SIRANAP Kemenkes | Tempat tidur kosong per kab | Hari sampai penuh = kosong / (penduduk terpapar × ΔRR rawat ISPA per 10 µg/m³ PM2.5 dari literatur) | `public/data/bnpb/rs_kapasitas.json` | data.yml |

### Sinyal sosial dan infrastruktur (pipa-umum)

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 35 | Google Trends + Wikipedia pageviews | z-score lonjakan istilah ("asap", "banjir", "longsor") per prov | Deteksi dini vs kejadian DIBI: POD/FAR dan waktu tunggu | `public/data/sinyal_sosial.json` | data.yml |
| 36 | GDELT | Volume berita ter-geokode + nada, z-score | Sama dengan #35, digabung jadi satu skor | `public/data/gdelt.json` | data.yml |
| 37 | ReliefWeb API | Ekstraksi kebutuhan (hunian, pangan, air) dari laporan | Durasi tanggap darurat ~ jenis, korban, H (regresi survival). Kalau label < 30, ditulis indeks | `public/data/reliefweb.json` | data.yml |
| 38 | IODA (+ Cloudflare Radar bila token mengizinkan) | Padam internet: z-score sinyal vs garis dasar jam yang sama 7 hari | Label untuk #39 | `public/data/internet_padam.json` | data.yml |
| 39 | OpenCelliD | Menara di zona bahaya / total menara | P(internet padam \| bahaya, kepadatan menara), logistik pada label #38 | `public/data/menara.json` | statis.yml |
| 40 | Overture Maps (places) | Indeks akses logistik = jarak ke gudang/SPBU/pasar terdekat per kec | Indeks, bukan prediksi | `public/data/logistik.json` | lab, triwulan |
| 41 | Mapillary | Cakupan foto dasar (foto/km jalan, umur foto) di zona bahaya | Indeks pendukung penilaian kerusakan, bukan prediksi | `public/data/foto_dasar.json` | statis.yml |

### Warga-api

| # | Sumber | Rumus / analisis | Model prediksi + uji | Keluaran | Jadwal |
|---|---|---|---|---|---|
| 42 | ADS-B (per jam) | Jam hadir heli per prov per hari; celah respons = cluster prioritas tanpa heli | P(heli hadir besok \| cluster aktif, FWI, jarak bandara). Metrik: AUC minggu uji | D1 + ringkasan JSON | Worker, 1×/jam |

## Kunci yang harus didaftarkan pemilik sendiri

Pengerja tidak membuat akun. Isi kunci ke `.env` dan secret Actions:

| Variabel | Daftar di | Dipakai oleh |
|---|---|---|
| `BPS_KEY` | webapi.bps.go.id | #28 |
| `OPENAQ_KEY` | explore.openaq.org | #9 |
| `OPENCELLID_KEY` | opencellid.org | #39 |
| `MAPILLARY_TOKEN` | mapillary.com/developer | #41 |
| `CDSE_USER` / `CDSE_PASS` | dataspace.copernicus.eu | #2 |
| `MERIT_USER` / `MERIT_PASS` | formulir MERIT Hydro (Univ. Tokyo) | #17 |
| `RELIEFWEB_APPNAME` | apidoc.reliefweb.int (appname disetujui) | #37 |
| `CF_RADAR_TOKEN` | token Cloudflare dengan izin Radar Read | #38 (opsional) |

`EARTHDATA_TOKEN` sudah ada tetapi habis sekitar 11 Desember 2026. Token ini
dipakai #11, #16, #27, dan mungkin #8.

## Urutan gelombang

Paling banyak 4–5 agen jalan bersamaan. Satu agen per pemilik per gelombang,
supaya berkas ilmu tidak bentrok.

| Gelombang | Isi |
|---|---|
| 1 (jalan) | ADS-B (warga-api), TROPOMI (cuaca-udara), RADD/GLAD (pipa-data), MIROVA (selesai) |
| 2 | ruang-bnpb #28–34 · banjir #14–17 |
| 3 | gempa #21–23 · gunungapi-kering #25–26 · neraca-air #27 · longsor #18–20 |
| 4 | cuaca-udara #9–13 · pipa-data #2–6 · model-sebaran #7 |
| 5 | pipa-umum #35–41 · penulis-gerbang (gerbang jadwal + anggaran aset) |
| Akhir | `validasi-model` untuk semua model; rantai workflow (`mekanik-mesin`); kartu layar menyusul |

Gerbang baru (gelombang 5, `penulis-gerbang`):
- uji yang menolak tugas Worker lebih sering dari per jam, dan menolak cron trigger tambahan di `wrangler*.jsonc`;
- uji yang menolak workflow berjadwal lebih rapat dari per jam;
- uji yang menolak bila jumlah berkas `public/` lewat 15.000 (75% dari plafon).
