# Sumber data BNPB yang bisa dipanen (survei 18 Okt 2026)

Semua di bawah bisa diambil tanpa login dengan curl biasa, KECUALI yang ditandai. Lisensi apiv4 dan
GeoServer InaRISK tidak tertulis: sebut "Sumber: InaRISK BNPB" dan jangan klaim lisensi terbuka.
Batas laju belum diuji: panen bulanan, beri jeda antarpanggilan, cache di Actions.

## 1. InaRISK apiv4 (`https://inarisk.bnpb.go.id/apiv4/…`), JSON

| Endpoint | Isi | Dipakai untuk |
| --- | --- | --- |
| `/data-irbi-full` | NDJSON 2 MB, 5.654 baris `{pcode, tahun 2015-2025, banjir, longsor, karlahut, kekeringan, gempabumi, tsunami, gunungapi, abrasi, cuaca_ekstrem, total, status, pembanding}` | Tren indeks risiko 11 tahun per kab per bahaya: pop-up kab, prior prediksi, "risiko naik/turun" |
| `/irbi/{kode_kab}` | satu kab, tahun terakhir | — |
| `/get-infra-risk/{ALL\|kode_kab}/{bahaya}` | penduduk, bangunan, RS, puskesmas, sekolah, madrasah, bandara, pelabuhan, obvitnas per kelas aman/rendah/sedang/tinggi | Kartu "siapa yang terpapar" per kab. Satu panggilan per kab, jalankan bulanan |
| `/kajian-summary/{bahaya}/ALL?level=nasional` | jiwa terpapar, kerugian fisik/ekonomi Rp, luas per kelas, kapasitas | Angka nasional pembanding |
| `/provinsi`, `/kabupaten/{prov}`, `/kecamatan/{kab}` | kode wilayah | — |
| `/layers/infrastructure` | daftar MapServer: jalan, jembatan, sungai, DAS, sesar, desa pesisir, titik RS/puskesmas/sekolah/bandara | Lapisan peta |
| `/posgagah/download-kegiatan-geojson/{id}/{kode_prov}` | kegiatan PRB lapangan (13 = Penilaian Ketangguhan Desa) | BUANG kolom `User Pemantau` (nama petugas) |

## 2. InaRISK raster ArcGIS (piksel 100 m, nilai 0-1)

Daftar 40 layer: `https://inarisk.bnpb.go.id/v4/config/arcgis-layers.json`.
Pola: `https://gis.bnpb.go.id/server/rest/services/inarisk/<layer>/ImageServer/identify?geometry={"x":LON,"y":LAT,"spatialReference":{"wkid":4326}}&geometryType=esriGeometryPoint&returnGeometry=false&returnCatalogItems=false&f=json`
→ `{"value":"0.528609"}`. `layer_bahaya_gempabumi` adalah MapServer (pakai `/MapServer/identify`).

Per bahaya ada `layer_bahaya_*`, `layer_kerentanan_*`, `layer_risiko_*` untuk banjir, banjir bandang,
cuaca ekstrem, gelombang ekstrem & abrasi, gempa bumi, karhutla, kekeringan, letusan gunung api,
likuefaksi, tanah longsor, tsunami, multi. Kapasitas satu layer: `layer_peta_kapasitas`.
Repo sudah pakai bahaya (`getSamples`); KERENTANAN, KAPASITAS, RISIKO BELUM.

## 3. GeoServer `https://inarisk1.bnpb.go.id/geoserver/` (WMS/WFS terbuka, 159 layer)

- `basemap:Destana_all_point`: 2.039 desa Destana (desa, kec, kab, PROGRAM, PELAKSANA, TAHUN).
  `wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=basemap:Destana_all_point&outputFormat=application/json`
- `basemap:Historis_Banjir_2015-2021`, `historis_longsor_2015_2021`, `Historis_Cuaca_Ekstrem` (per kab).
- `INA_Megathrust` (15 segmen).
- `raster:Inun_7_8_Mw` … `Inun_9_0_Mw`: genangan tsunami skenario (cakupan belum dicek).
- `raster:INARISKPOP_2020`, `Population_Density2025`; `Citra:preFlood_*`, `postFlood_*`.

## 4. data.bnpb.go.id (CKAN, `/api/3/action/datastore_search?resource_id=…`)

Unduhan berkas langsung kena Cloudflare 403; hanya tabel `datastore_active` yang bisa.
Sudah dipakai: `data-bencana-indonesia` (scripts/banjir/kejadian.py, gunungapi/dampak.py, kekeringan/dampak.py).

| Dataset | resource_id | Isi |
| --- | --- | --- |
| Status keadaan darurat 2025 | `5599c3f4-71f2-4f8b-9846-304fca0fdc8a` | 495 SK: id_kab, jenis, siaga/tanggap/transisi, tgl mulai-akhir, tautan surat |
| Rekap penetapan status per kab 2025 | `cd7361bd-d094-492f-94cd-018574c8ab9a` | jumlah SK per kab |
| Kerusakan & kerugian R3P (usulan pemda) | `f2cd9b7a-c56c-49f9-9a55-8ad40da0d763` | Rp per kab per kejadian, 2017-2024; belum diverifikasi |
| Luas lahan/kebun/hutan rusak | `1e489e0a-77a1-4ac5-9511-ce436aee0132` | ha per jenis bencana, nasional 2010-2024 |
| Luas sawah rusak | `cda5f236-01f8-4b1f-945d-192806480fac` | ha per jenis, nasional 2010-2024 |
| Kejadian per kab 2010-2024 | `21044ffd-c397-4b3c-acbd-5adaa03d79e3` | total per tahun |

## 5. katalogketangguhan.bnpb.go.id

WordPress + iframe Power BI (Desa Rawan Bencana, ID-PKD 2025 baseline 75.261 desa, Renkon). Tidak ada
API; unduhan perlu login; curl 403. Untuk Destana pakai GeoServer di atas.
