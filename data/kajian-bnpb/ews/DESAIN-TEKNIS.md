# DESAIN-TEKNIS: Panel EWS

## Berkas dan pemilik

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `public/inti/pantau_alat.js`, `public/inti/pantau_alat.css` | mesin panel bersama: kartu, pemberitahuan, grafik, CCTV | `inti-layar` |
| `public/bencana.json` | kunci baru `kemampuan.alat = {"sumber": [...], "jenis": [...]}` untuk banjir dan gunungapi | `inti-layar` |
| `scripts/umum/bencana.py` | pemeriksa bentuk `kemampuan.alat` | `pipa-umum` |
| `public/banjir/*`, `public/gunungapi/*` | memasang panel di halaman masing-masing (satu baris pemanggil) | `banjir`, `gunungapi-kering` |
| `src/alat.js` | `GET /api/alat/pos?bencana=`, `GET /api/alat/seri?pos=&jam=24` | `warga-api` |
| `migrations/<berikut>_sensor_geofon.sql` | tambah jenis `geofon` ke CHECK `sensor_alat.jenis` (tabel dibuat ulang idempoten). `sensor_baca` dan `sensor_lapor` punya `REFERENCES sensor_alat (id)` (migrasi 0089): pembuatan ulang wajib menjaga FK dan baris, diperiksa khusus oleh `migrasi-idempoten` | `warga-api`; kontrak alat dan firmware geofon diperiksa agent `sensor` |
| `tests/warga/alat_*.test.mjs` | uji integrasi rute dan uji murni tingkat dan basi (pola `tests/warga/logbook_sensor.test.mjs`) | `warga-api` (glob `tests/warga/**` sudah miliknya) |

## Bentuk pos (KEPUTUSAN D2)

```json
{"id": "sensor:TMA-AGAM-01", "sumber": "sensor", "jenis": "tma", "nama": "Batang Agam hulu",
 "lat": -0.3, "lon": 100.4, "kab": "13.06",
 "nilai": {"tinggi_cm": 182, "laju_cm_jam": 4}, "utama": "tinggi_cm", "satuan": "cm",
 "waktu": 1763886300000, "ambang": {"tinggi_cm": {"waspada": 150, "siaga": 200, "awas": 250}},
 "tingkat": "waspada", "alat": {"baterai": 3.98, "suhu": null}, "basi": false}
```

`id` berawalan sumber supaya tidak bentrok antarsumber.

## Rute

| Rute | Hak | Isi |
| --- | --- | --- |
| `GET /api/alat/pos?bencana=banjir` | sesuai Q2: sumber publik untuk semua, sensor sendiri untuk staf | daftar pos bentuk D2 + `ringkas` (G3) + `gagal: [sumber]` |
| `GET /api/alat/seri?pos=<id>&jam=24` | sama dengan pos | titik `[waktu, nilai]`, ambang, interval |

- Kueri D1 dibatasi: pos terakhir per alat satu kueri, seri satu alat per permintaan, `LIMIT` tetap. Cache tepi 60 detik untuk sumber publik.
- Rute `GET /api/sensor/status` yang lama tetap ada (dipakai alat staf), tidak diubah.

## Sumber luar

Adapter di `src/alat.js` per sumber: `sensor` (D1), `sihka` (baca `public/banjir/data/pos_sungai.json` yang sudah ada), `pvmbg` (baca `gunungapi_status.json` dan `kegempaan.json`). Sumber berizin (Q1) ditambah sebagai adapter baru yang membaca `ews/<sumber>/terkini.json` di binding R2 `MEDIA`, diisi Worker terjadwal; jadwal masuk cron tunggal `* * * * *` yang sudah ada (batas 5 jadwal akun Free).

## CCTV

Daftar kamera di `ews/cctv.json` pada binding R2 `MEDIA` (bukan di `public/`, karena alamat aliran bisa berisi token): `{id, pos, nama, url_hls, izin: "<surat/tanggal>"}`. Entri tanpa `izin` ditolak saat dimuat.
