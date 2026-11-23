# RISET: Panel EWS sensor dan CCTV (banjir, gunung api)

Diperiksa 23 Nov 2026. Angka dari layar rujukan yang dikirim pemilik dan dari kode repo; tidak ada angka karangan.

## R1. Tiga dasbor rujukan

| Dasbor | Isi | Backend yang terlihat dari peramban |
| --- | --- | --- |
| EWS Banjir geodashboard.io (Pondok Gede Permai, Cikeas, Cibongas, Cileungsi, Prisdo) | 5 sensor (radar dan penakar hujan), 5 kamera; peta citra satelit; kartu per pos: tinggi air (m atau mdpl), status, ambang batas TMA, curah hujan jam dan hari, suhu alat, baterai, waktu; panel CCTV; kotak Langkah cepat (Pemantauan, Peringatan level 1-3, Keadaan siaga); notifikasi lewat Telegram | aplikasi Nuxt; Directus di `/panel/items/*` |
| EWS Banjir Kota Banda Aceh (Indrapuri, Putroe, Keutapang, KPBaru, KM0) | sama dengan di atas, tema terang biru; 5 sensor, 5 CCTV | Directus `ews.bandaacehkota.go.id/panel`: `items/data_subscriptions?filter[category]=sensor`, `items/cctv`, `items/alarm`, `chart/akumulasi_hujan?collection=<pos>`, `items/vector_tiles`, `items/raster_tiles`; CCTV HLS `restream2.blitztechnology.tech/memfs/<uuid>.m3u8` |
| MHEWS Gunung Ibu BNPB (`mhews.bnpb.go.id/gunung/ibu/`) | sensor lidar (tinggi muka air dan curah hujan lahar, 4 pos), geofon (kecepatan getaran mm/s, frekuensi Hz, grafik seri waktu dengan penggeser rentang), 9 CCTV, sirene lokal; pemberitahuan "4 sensor, tidak ada data terkini" dengan saran periksa koneksi Starlink | aplikasi Nuxt di bawah `/gunung/ibu/` |

Pengamatan yang dipakai:

1. Tiap kartu pos memuat nilai besar, satuan, lalu tabel kecil (status, ambang, hujan jam dan hari, suhu, baterai, waktu). Ini dipakai.
2. Gunung Ibu menampilkan **0** untuk sensor yang terputus dan menulis "Tidak ada data terkini" di kolom status. Angka 0 di sebelah tulisan "tidak ada data" menyesatkan; di sini kosong tetap kosong (KEPUTUSAN D4).
3. Dua dasbor banjir memakai label status **"Aman"**. Repo ini melarang kata itu (KEPUTUSAN D3).
4. Pemberitahuan sensor terputus muncul sebagai dialog yang menutupi seluruh layar. Di sini cukup baris pemberitahuan di atas panel, tidak menghalangi peta (aturan INP dan selera pemilik).
5. Pengambilan langsung ke backend Directus vendor ditolak pemeriksa izin pada 23 Nov 2026. Tanpa izin tertulis, data itu tidak diambil (KEPUTUSAN Q1).

## R2. Bahan yang sudah ada di repo

| Bahan | Berkas | Keadaan |
| --- | --- | --- |
| Rute sensor milik sendiri | `src/sensor.js`: `POST /api/sensor/baca` (HMAC per alat), `POST /api/sensor/lapor`, `GET /api/sensor/status` (staf Pusdalops, Koordalops, Pimpinan) | ada; tabel `sensor_alat`, `sensor_baca`, `sensor_lapor` (migrasi 0089) |
| Firmware dan gateway | `sensor/firmware/{tma,hujan,longsor,gambut,gas}`, `sensor/gateway/` | dikompilasi, BELUM diuji di perangkat keras (`sensor/README.md`) |
| Ambang alat | `sensor/ambang.json`, kolom `sensor_alat.ambang` | titik awal, bukan keputusan (README sensor) |
| Pos tinggi air SIHKA PU | `public/banjir/pos_air.js`, `public/banjir/data/pos_sungai.json`, arsip `scripts/banjir/arsip_pos.py` | tayang di peta `/banjir` dengan status resmi Siaga 1-3 bila pengelola memberi ambang |
| Gunung api MAGMA PVMBG | `scripts/gunungapi/magma.py`, `public/gunungapi/data/kegempaan.json`, `gunungapi_status.json` | level resmi, radius, kegempaan 24 jam |
| Tangga tindakan per tingkat | `public/ews_tindakan.js` (entri `BENCANA`) | ada untuk banjir dan gunung api |
| Registri kemampuan | `public/bencana.json`, pemeriksa `scripts/umum/bencana.py` | kunci `ews` sudah dipakai langganan email; panel baru memakai kunci baru |

## R3. Yang belum ada

- Tidak ada sensor gunung api (geofon) di enum `sensor_alat.jenis`.
- Tidak ada CCTV di repo sama sekali.
- `GET /api/sensor/status` tidak mengembalikan seri waktu, hanya bacaan terakhir.
- Jumlah alat yang sudah terdaftar di D1 produksi belum diperiksa (butuh akses produksi pemilik).
