# Aksi antisipatif desa langganan

Tanggal: 1 November 2026. Status: disetujui pemilik untuk dikerjakan (program 8 jam), versi 2.
Versi 1 (daftar fitur A–E) digantikan oleh strategi tiga lapis di bawah; komponennya tetap terpakai.

## Diagnosis dari logbook Pusdalops 2011–2023 (37.992 kejadian)

| Masalah | Bukti |
| ------- | ----- |
| Tahu terlambat atau tidak tahu | Kebakaran lahan Jawa hanya 1–5% hari-titik api yang dilaporkan; Papua 0,3–1 kejadian per kab per tahun |
| Tahu sepotong | Median satu kejadian dilaporkan satu kali; korban terhitung ganda |
| Tidak terjangkau | Akses putus 923 entri, sinyal putus 306 |
| Barang tidak di tempat | Logistik/BBM 431, sumber air pemadaman 283, alat berat 206 |
| Prediksi harian lemah | Banjir dari hujan gagal luar-sampel 2022 (ETS 0,006), kalah dari persisten |
| Musiman sangat pasti | 85 kab banjir dan 52 kab longsor 7 dari 7 tahun (2014–2020) |

Kesimpulan: bertindak pada kepastian musim di desa langganan, bukan menunggu ramalan harian.
Prakiraan harian dan sensor dipakai untuk eskalasi.

## Tiga lapis

1. **Siapkan sebelum musim** (akses, logistik, alat berat, air): daftar desa langganan terisolir,
   saran stok penyangga per bulan, kontrak siaga alat berat, SIPPA di karhutla langganan, SOP pra-musim.
2. **Mata di desa** (tak terlapor, laporan sekali, sinyal): pelapor desa lewat WA dengan pengingat
   lanjutan H+1/H+3; daftar daerah senyap harian (sinyal satelit/cuaca tanpa laporan); sensor
   lapangan; radio mesh LoRa untuk desa tanpa sinyal.
3. **Satu catatan baku** (mutu data, belajar): form logbook terstruktur, laporan otomatis, kalibrasi
   ulang kalender tiap akhir musim.

## Komponen yang dibangun sekarang dan pemiliknya

| Kode | Komponen | Berkas | Pengerja |
| ---- | -------- | ------ | -------- |
| L1 | API logbook + sensor + migrasi D1 | `src/logbook.js`, `src/sensor.js`, `migrations/0088_logbook.sql`, `migrations/0089_sensor.sql`, `tests/warga/**` | `warga-api` |
| L2 | Layar staf: form logbook, daerah senyap, desa terisolir, stok, SOP | `public/bnpb/logbook*`, `public/bnpb/senyap*`, `public/bnpb/siaga*`, `scripts/bnpb/**`, `tests/bnpb/**` | `ruang-bnpb` |
| L3 | Data: daerah senyap harian, desa terisolir | `scripts/data/senyap.py`, `scripts/data/desa_terisolir.py`, `public/data/senyap.json`, `data/pusdalops/desa_terisolir.csv` | `pipa-data` |
| S | Sensor: firmware, gateway, simulator, ambang | `sensor/**`, `tests/sensor/**` | `sensor` (agent baru) |
| P | Peta publik: riwayat dan musim | `public/index.html`, `public/riwayat_daerah.js` | `layar-peta` |
| K | Peta kolaborasi + permintaan data + deck | `docs/kolaborasi/**`, deck di `docs/deck-bnpb/` | general-purpose + skill `ppt-konsultan` |

## Kontrak L1 (dipakai L2, S)

Semua rute staf memakai `stafOK(env, req, ["pusdalops","koordalops","pimpinan"])` dari `src/staf.js`.

### Logbook

- `logbook_kejadian(id TEXT PK, jenis, prov, kab, kec, desa, lat, lon, mulai TEXT ISO, status 'buka'|'tutup', dibuat, diubah)`
- `logbook_entri(id TEXT PK, kejadian_id FK, waktu, md, hilang, luka, mengungsi_jiwa, mengungsi_kk,
  rumah_rb, rumah_rs, rumah_rr, rumah_terendam, luas_ha, kendala TEXT JSON array kode, kebutuhan TEXT JSON array kode,
  catatan, sumber_instansi, oleh, dibuat)`. Angka dampak = nilai terkini, entri lanjutan menimpa, tidak menjumlah.
- Wilayah memakai kunci `prov|nama` yang sama dengan `public/geo` dan `logbook_riwayat.json`.
- Kode kendala: `akses, logistik, sinyal, air, personel, alat_berat, gambut, cuaca, data, dana, malam, sosial, listrik, angin`.
- Kode kebutuhan: `makanan, tenda, sandang, air_bersih, obat, perahu, material, alat_berat, pompa, dana`.
- Rute:
  - `POST /api/logbook/kejadian` buat kejadian + entri pertama.
  - `POST /api/logbook/kejadian/:id/entri` entri lanjutan.
  - `GET /api/logbook/buka?kab=` kejadian buka di kab (14 hari) untuk tombol "lanjutan dari".
  - `GET /api/logbook/hari?tgl=YYYY-MM-DD` entri periode 07.00–07.00 WIB (bahan laporan harian).
  - `POST /api/logbook/kejadian/:id/tutup`.
- Pemeriksa wajar memakai batas seperti `BATAS_WAJAR` di `scripts/umum/laphar_arsip.py`; angka di atas batas ditolak kecuali `yakin: true`.
- Pengingat lanjutan: kejadian buka tanpa entri baru 24 jam dan 72 jam masuk antrean `src/pengingat.js`
  (bila BPBD pelapor punya nomor WA, teks pengingat siap dikirim lewat `src/wa.js`; pengiriman tetap lewat alur yang ada).

### Sensor

- `sensor_alat(id TEXT PK, jenis 'tma'|'hujan'|'longsor'|'gambut'|'gas', kab, desa, lat, lon, ambang JSON, kunci_hash, aktif, dibuat)`
- `sensor_baca(alat_id, waktu, nilai JSON, baterai, rssi, PRIMARY KEY(alat_id, waktu))`
- `POST /api/sensor/baca`: badan `{alat, waktu, nilai:{...}, baterai, rssi}`, tanda tangan HMAC-SHA256 badan
  dengan kunci per alat di header `X-Sensor-Tanda`; ditolak bila tanda salah, alat tidak aktif, atau waktu >10 menit dari kini.
  Batas laju per alat. Ambang terlewati → baris di `peringatan` yang ada atau antrean pengingat.
- `GET /api/sensor/status` (staf): alat, bacaan terakhir, umur bacaan, status ambang.
- Gateway (LoRaWAN ChirpStack/TTN webhook, Meshtastic MQTT, atau seluler langsung) menerjemahkan ke kontrak ini.

## Batasan

- Repo publik: data mentah logbook hanya di `data/raw` dan R2 privat; yang terbit agregat tanpa korban arsip.
- Migrasi produksi, secret alat, dan deploy dijalankan pemilik. Subagent tidak commit atau push.
- Tiap layar lewat `selera-angka` + `inp-reviewer`; rute lewat `guard-api` + `security-reviewer`;
  migrasi lewat `migrasi-idempoten`; angka model lewat `validasi-model`.

## Pilot

Kluster longsor Jawa Tengah (Banjarnegara, Banyumas, Cilacap, Magelang, Temanggung), musim November–Maret.
Ukuran: laporan per kejadian median 1 → ≥3; waktu tahu dalam jam; stok tersedia sebelum kejadian;
persentase sinyal tanpa laporan yang ditelepon.
