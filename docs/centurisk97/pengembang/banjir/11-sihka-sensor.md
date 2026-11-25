# Pos SIHKA, sensor, dan panel EWS

Halaman ini menjelaskan pos SIHKA, sensor milik sendiri, dan rancangan panel EWS.

## 19. Pos tinggi air SIHKA (`src/sihka.js`)

Sumber SIHKA Kementerian PU Ditjen SDA (`https://sihka.sda.pu.go.id/api/v1s/telemetry-list`) ditambah pos berambang DSDA DKI dan SIPANTAU Tangerang. Pos kembar sumber berbeda dalam jarak sekitar 300 m digabung; pos berambang resmi menang. Worker tidak pernah mengurai teks sumber (batas CPU 10 ms): teks diikat sebagai parameter dan SQLite mengurai lewat `json_each`. Status per pos (prioritas dari atas):

```
bukan_tinggi (satuan debit atau mdpl) > lama (> 5 jam) > macet (nilai sama 12 jam) > riwayat_kurang (< 7 hari atau n < 100)
> pantauan_terbatas (riwayat 7 sampai < 14 hari) > data_bolong (pembanding 1/2/3 jam hilang)
> naik_di_atas_biasa (kenaikan 3 jam > p99 pos itu; n >= 300; riwayat >= 14 hari; tiga langkah tak turun;
                      lantai 20 cm bila satuan diketahui, bila tidak v >= p95 dan kenaikan >= 2 x p99)
> tertinggi (v > rekor, riwayat >= 30 hari) > biasa
```

Dasar persentil tidak memuat 24 jam terakhir dan memakai jendela 90 hari. Bacaan mentah disimpan 180 hari, arsip harian ke R2 (`arsip/pos_sungai/`, `scripts/banjir/arsip_pos.py`) karena Worker menghapus yang lebih tua. Status resmi pengelola ("Normal", "Siaga 3", "Siaga 2", "Siaga 1") ditampilkan apa adanya dan menang atas status persentil, kecuali data lama atau macet.

## 20. Sensor milik sendiri (`src/sensor.js`, `sensor/`)

Alat lapangan (muka air, hujan, gerakan tanah, muka air gambut, gas) mengirim bacaan bertanda tangan HMAC. Kunci alat DITURUNKAN, tidak disimpan: `kunci_alat = HMAC-SHA256(secret SENSOR_KUNCI_INDUK, id alat)` heksadesimal 64 (`src/sensor.js:20`). Kunci dan tanda tidak pernah dicatat atau dikembalikan. Alat tak dikenal dan tanda salah dijawab sama (401). Waktu kirim harus dalam plus minus 10 menit dari server; `waktu_asli` boleh sampai 24 jam ke belakang. Laju: 30 kiriman per 5 menit per alat dan 300 per menit per alamat IP (`src/sensor.js:15`).

Ambang per alat di `sensor_alat.ambang` berbentuk `{"<kunci nilai>": {"waspada": n, "siaga": n, "awas": n}}`. Tingkat = tertinggi yang terlewati (`nilai >= n`); nilai kosong (sensor rusak) tidak dinilai (`tingkatAmbang`, `:29`). Ambang terlewati masuk antrean `pengingat` (satu baris per alat, tingkat, hari WIB) dan BUKAN peringatan publik, karena bacaan belum diverifikasi manusia. Nilai kosong ditampilkan sebagai gangguan alat. Ambang awal di `sensor/ambang.json` adalah titik awal, bukan keputusan; harus dikalibrasi per lokasi bersama BPBD, PVMBG, atau BMKG, dan nilai tinggi muka air terhadap papan duga masih kosong. Status firmware: kode lulus uji dan dikompilasi, tetapi belum diuji di perangkat keras.

## 21. Panel EWS sensor dan CCTV (paket `ews`, RANCANGAN, belum dikodekan)

Keputusan pemilik 23 November 2026: panel hanya untuk banjir dan gunung api, dipasang di halaman bencananya (tanpa halaman `/ews`), meniru isi dan fungsi tiga dasbor rujukan (bukan merek atau tata letak), tanpa data contoh. Rancangan agen: satu mesin `public/inti/pantau_alat.js` dan `.css` dinyalakan lewat kunci registri `kemampuan.alat` di `public/bencana.json`; nama `ews` tidak dipakai karena sudah milik langganan email dan tangga tindakan. Tidak ada tabel kejadian baru.

Bentuk pos tunggal untuk semua sumber: `{id, sumber, jenis, nama, lat, lon, kab, nilai, satuan, waktu, ambang, tingkat, alat:{baterai, suhu}, basi}`. Aturan (`data/kajian-bnpb/ews/ALGORITMA.md`):

```
tingkat(pos): basi -> "tanpa_data" (abu); sumber pvmbg -> level resmi PVMBG; sumber sihka dengan status resmi -> status resmi apa adanya;
              ambang kosong -> tanpa warna tingkat; selain itu -> tingkatAmbang(ambang, nilai)
basi(pos) = waktu kosong atau (kini - waktu) > BATAS[jenis]       BATAS bawaan: tma 30 menit, hujan 30 menit, geofon 10 menit
ringkas   = jumlah pos; di_atas_ambang (Waspada ke atas dan tidak basi); terputus (basi); kamera
grafik    = 24 jam; maksimum 288 titik (tma, hujan; interval 5 menit, HIPOTESIS) atau 1.440 titik ringkasan per menit (geofon); celah > 2x interval = putus garis
urutan    = tingkat tertinggi, lalu basi, lalu nama; tidak berubah saat data diperbarui kecuali tingkat berubah
```

Sensor basi tampil abu dengan label "Tidak ada data terkini" dan waktu terakhir; nilainya tidak dihapus dan tidak dijadikan 0. Ambang hanya dari sumber tercatat; tanpa ambang tercatat pos hanya menampilkan nilai. CCTV hanya dari aliran dengan izin tertulis. Data dan CCTV dari dasbor vendor dan MHEWS BNPB belum diambil sampai izin tertulis ada (Q1).

Status kode: baru ada `src/sensor.js`, `sensor_alat`, `sensor_baca`, `sensor_lapor` (migrasi `0089_sensor.sql`) dan pos SIHKA. Belum ada `public/inti/pantau_alat.*`, `src/alat.js`, kunci `kemampuan.alat`, jenis alat `geofon`, atau rute `GET /api/alat/*`.
