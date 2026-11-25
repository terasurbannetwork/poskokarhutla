# Referensi: kekeringan, pesisir, sensor

Halaman ini memuat rujukan teknis untuk kekeringan, pesisir, sensor, dan gerbang uji.

## Kekeringan

| Berkas | Peran |
| --- | --- |
| `scripts/kekeringan/status.py`, `spi.py`, `hth.py`, `prakiraan.py`, `neraca.py`, `padi.py`, `fao.py`, `tutupan.py`, `posko.py`, `embung.py`, `dampak.py`, `bukti.py`, `laporan.py`, `riwayat.py`, `berita.py` | pipa dan model |
| `scripts/kekeringan/ujibalik.py`, `ambang.py`, `ambang2.py`, `label.py`, `ujilabel.py`, `bayangan.py`, `uji_rantai.py` | uji balik dan model bayangan |
| `scripts/kekeringan/gdo.py`, `resmi.py`, `peringatan_bmkg.py` | sumber resmi dan pembanding |
| `public/kekeringan/*.js`, `kekeringan.css`, `simulasi.html`, `simulasi.css`, `laporan.html` | layar |

Keluaran `public/data/`: `kekeringan_meta.json`, `kekeringan_grid.json`, `kekeringan_wilayah.json`, `kekeringan_tren.json`, `kekeringan_hth.json`, `kekeringan_prakiraan.json`, `kekeringan_neraca.json`, `kekeringan_padi.json`, `kekeringan_ujibalik.json`, `kekeringan_prospektif.json`, `kekeringan_resmi.json`, `kekeringan_bnpb.json`, `kekeringan_bukti.json`, `kekeringan_laporan.json`, `kekeringan_riwayat.json`, `dampak_kekeringan.json`, `posko_kekeringan.json`; `public/kekeringan/data/`: `gdo.json`, `embung.json`, `tutupan.json`, `hindcast.json`, `peluang_bayangan*.json`; `public/banjir/data/`: `kering_peluang.json`, `peringatan_bmkg.json`, `peringatan_bmkg_arsip.json`. Tidak ada rute Worker, tabel D1, atau R2 khusus.

Workflow: `lintas.yml` harian 02.10 UTC (`status.py uji` dan `status.py` pada `lintas.yml:260-261`, `peluang_kering.py` pada `:262`, `gdo.py` pada `:273`; uji mandiri `neraca`, `ujibalik`, `ambang`, `ambang2`, `dampak`, `posko`, dan `uji_rantai.py` pada `:106`); `statis.yml` bulanan (`embung.py`). Uji balik diperbarui bulanan (`UMUR_MAKS_HARI = 30`, `ujibalik.py:45`). Cache SEAS5 sebagian sempat ditolak karena tanggal batch Open-Meteo maju sehari (diperbaiki `selaraskan_cache`). Uji: `node --test tests/kekeringan/sim_tanggap.test.mjs`; `python3 scripts/kekeringan/<skrip>.py uji`. Pemeriksa: `validasi-model`, `selera-angka`.

## Pesisir

| Berkas | Peran |
| --- | --- |
| `scripts/pesisir/abrasi.py` | abrasi Landsat per transek |
| `scripts/pesisir/rob_label.py` | label kejadian rob (tanggal dan kabupaten saja) |
| `public/pesisir/pesisir.js`, `peta.js`, `hitung.js`, `insight.js`, `tren.js`, `dampak.js`, `brief.js`, `grafik.js`, `operasi.js`, `index.html` | layar; hitungan murni di `hitung.js` agar teruji di node |

Data dibaca layar: `public/pesisir/data/abrasi.json`, `rob_kejadian.json`, dan milik banjir `../banjir/data/rob.json`, `pasut_30h.json`, `../banjir/data/pasut.json`, `cuaca_gelombang.json`, `../data/peringatan.json` (peringatan gelombang BMKG), dan `../data/logbook_riwayat.json` (tab Tren); `paparan_kab.json` hanya dipakai tab Dampak (`public/pesisir/pesisir.js:60-61`, `tren.js:54`, `dampak.js:51`). Registri: `sumber_status` memantau `abrasi` (batas 9.000 jam), `rob` 30, `pasut` 48, `gelombang` 30. Workflow: `statis.yml:185` menjalankan `abrasi.py` setahun sekali (hanya bulan Februari atau `workflow_dispatch` tangan, kondisi pada `statis.yml:167-171`; cache adegan Landsat dipulihkan antartahun, sesuai batas `sumber_status` abrasi 9.000 jam); data rob, pasut, dan gelombang diperbarui `banjir.yml` harian 00.20 UTC. Tidak ada rute Worker, tabel D1, atau R2 khusus. Uji: `python3 scripts/pesisir/abrasi.py uji`, `python3 scripts/pesisir/rob_label.py uji`, `node --test tests/pesisir/layar.test.mjs`. Pemeriksa: `validasi-model` untuk metode dan angka laju, `selera-angka` untuk tampilan.

## Sensor milik sendiri (fondasi panel EWS)

`src/sensor.js` dan `migrations/0089_sensor.sql` (`sensor_alat`, `sensor_baca`, `sensor_lapor`; pengingat memakai tabel dari migrasi 0088). Rute (`src/sensor.js` bagian `RUTE_SENSOR`):
- `POST /api/sensor/baca`: tanda tangan HMAC-SHA256 badan mentah di header `X-Sensor-Tanda`; kunci alat diturunkan dari secret induk `SENSOR_KUNCI_INDUK` dan id alat (tidak disimpan); `waktu` harus dalam 10 menit dari waktu server, `waktu_asli` boleh sampai 24 jam lalu; nilai 1 sampai 8 entri; laju per alat 30 per 5 menit, per IP 300 per menit. Ambang terlewati menjadi baris antrean `pengingat` (satu baris per alat, tingkat, hari WIB), bukan peringatan publik.
- `POST /api/sensor/lapor`: hanya alat jenis `gateway`; teks 1 sampai 500 karakter; masuk antrean `pengingat` Pusdalops.
- `GET /api/sensor/status`: hanya sesi staf peran `pusdalops`, `koordalops`, atau `pimpinan`; status alat, umur bacaan, dan tingkat; basi bila lebih dari 1 jam; tanpa cache.
Uji: `tests/warga/logbook_sensor.test.mjs`, `tests/warga/jeda_sensor.test.mjs`, `npm run uji:sensor` (unittest di `tests/sensor`). Pemeriksa: `guard-api`, `security-reviewer`.

## Gerbang dan agent

`npm run uji:agen` (tiap berkas kode tepat satu pemilik, gerbang `gerbang-bencana`, `gerbang-model-agent`, gerbang token warna, gerbang paket modul), `npm run uji:warga`, `npm run bencana:cek` (bentuk registri `kemampuan.*`). Ilmu agent: `node scripts/agents/ilmu.mjs baca gempa`, `... baca gunungapi-kering`, `... baca longsor`, `... baca pesisir`. Pengerja tidak memverifikasi pekerjaannya sendiri; pemeriksa bersih dipilih dari kolom "bisa" di `.claude/ilmu-agent/KATALOG.md`.
