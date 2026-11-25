# Referensi: SIPPA dan neraca air

Bagian ini memuat referensi teknis SIPPA dan neraca air Jawa.

## SIPPA

| Berkas | Peran |
| --- | --- |
| `src/sippa.js` | seluruh rute `/api/sippa/*`, halaman `/pipa`, `/renlap` (2022 baris) |
| `src/sippa_lapangan.js`, `src/sippa_titik.js` | validasi butir lapangan dan titik |
| `src/uji_pilot.js` | halaman dan API uji pilot bertoken |
| `public/pipa/app.js` | cangkang klien dan router (`LAYAR`, `cocokkanJalur`) |
| `public/pipa/hitung.js` | mesin hitung murni |
| `public/pipa/formulir.js` | validasi butir lapangan (satu sumber bagi klien dan server) |
| `public/pipa/pelihara.js` | kelas aset K1 sampai K10 dan jadwal |
| `public/pipa/layar_*.js`, `layar_*.css` | satu berkas per layar |
| `public/pipa/studio_mesin.js`, `studio_pekerja.js`, `studio_skema.js` | simulator keputusan |
| `public/pipa/adegan.js`, `adegan.css`, `layar_3d.js` | simulasi tiga dimensi |
| `public/pipa/antre.js`, `lapangan.js` | antrean luring dan formulir lapangan |
| `scripts/data/sippa/` | pipeline dan kembaran Python mesin hitung |
| `data/kajian-bnpb/pipa/` | paket dokumen (KEPUTUSAN-SIPPA, PRD, DESIGN-SYSTEM, DESAIN-TEKNIS, KERANGKA-BUKU, RENCANA-UJI, TIKET) |

Rute API (`src/sippa.js:1944` sampai `:2020`). Pemeriksaan hak dilakukan lebih dulu di tiap rute. Hak baca: `pusdalops`, `koordalops`, `pimpinan`, admin. Hak tulis: `pusdalops`, `koordalops`, admin. Rute lapangan memakai kode penugasan.

- Kit dan komponen: `GET`/`POST /api/sippa/kit`, `GET`/`POST /kit/:id`, `POST /komponen/:id`, `POST /gerak/:id`, `POST /tiba/:id`, `POST /tugas`, `POST /tugas-cabut/:id`, `POST /pinjam`, `GET /pinjam`, `POST /pinjam-kembali/:id`, `GET /suku-cadang`.
- Lapangan: `GET /lapangan/saya`, `POST /lapangan/kirim`, `POST /lapangan/foto`, `GET /lapangan`, `GET /lapangan.csv`, `GET /foto/:id`.
- Log dan data: `GET`/`POST /log`, `GET /log.csv`, `GET /probe.csv`, `GET /data/:nama`, `GET /ringkas`, `GET`/`POST /jalan-cek`, `POST /aoi`, `POST /keputusan`, `GET /jejak`.
- A/B dan skenario: `GET /ab`, `POST /ab/unggah`, `POST /ab-status/:id`, `GET /ab.csv`, `GET`/`POST /skenario`, `POST /skenario-hapus/:id`.
- Laporan dan renlap: `GET`/`POST /laporan`, `GET /laporan-berkas/:id`, `POST`/`GET /renlap`, `GET /renlap/:id/pdf`, `POST /renlap/:id/selesai`, `GET /api/renlap/data`, `GET /api/renlap/img`.
- Telemetri: `POST /telemetri` (token perangkat), `GET /telemetri`, `GET`/`POST /perangkat`, `POST /perangkat-cabut/:id`, `GET /alarm`, `POST /alarm-tutup/:id`.
- Aset dan pemeliharaan: `GET`/`POST /aset`, `GET`/`POST /aset/:id`, `POST /inspeksi`, `GET /pelihara`, `GET /pelihara.csv`, `GET`/`POST /stok`, `GET /anggaran`, `POST /anggaran/realisasi`, `POST /anggaran/buka`.
- Dummy peragaan Super Admin: `POST /dummy/isi`, `POST /dummy/hapus`. Kit dummy berkode `SIPPA-901` ke atas; kode kit sungguhan harus di bawah `SIPPA-900`.
- Halaman: `GET /pipa`, `/pipa/:layar`, `/pipa/kit/:id`, `/pipa/aset/:id`, `/pipa/lapangan`, `/admin/pipa` (dialihkan), `/renlap`.

Prinsip penulisan: batas laju hanya pada rute tulis dan kegagalan kode, karena tiap batas laju adalah satu tulisan D1 dari kuota 100 ribu per hari yang dipakai seluruh situs. Tulisan butir lapangan memakai `ON CONFLICT(id) DO NOTHING`, bukan `INSERT OR IGNORE`, supaya pelanggaran CHECK tidak tertelan diam-diam.

Tabel D1 (migrasi `0056` sampai `0059`, `0067`, `0070`, `0073`; migrasi `0074` hanya menambah indeks pada `sippa_lapangan`, dan `0132` hanya indeks pada `sippa_tugas` dan `sippa_log_gelar`; `0101` tidak membuat tabel `sippa_*`): `sippa_inspeksi_cad` (salinan cadangan `sippa_inspeksi`, dibuat di `migrations/0070_sippa_lapangan_pinjam.sql:79`), `sippa_kit`, `sippa_komponen`, `sippa_gerak`, `sippa_tugas`, `sippa_lapangan`, `sippa_foto`, `sippa_log_gelar`, `sippa_petak`, `sippa_probe`, `sippa_bbm`, `sippa_pinjam`, `sippa_jalan_cek`, `sippa_aoi_usul`, `sippa_keputusan`, `sippa_titik_dekat`, `sippa_ab_unggah`, `sippa_skenario`, `sippa_laporan`, `sippa_perangkat`, `sippa_telemetri`, `sippa_telemetri_harian`, `sippa_alarm`, `sippa_aset`, `sippa_inspeksi`, `sippa_stok_gerak`, `sippa_anggaran_realisasi`, `sippa_anggaran_tingkat`, `sippa_renlap`, `sippa_ba_urut`.

R2: prefiks `sippa/` (berkas turunan pipeline), `uji-pilot/<id>` (foto uji pilot), dan foto lapangan SIPPA (kunci dari `sippa_foto`).

Workflow:

- `data.yml` (cron `20 14 * * *` UTC): langkah "Pemicu SIPPA" menjalankan `pemicu.py uji`, `pemicu.py`, dan `prioritas.py`, lalu "Unggah SIPPA ke R2" (boleh gagal). Berkas tahunan diunggah bila input `sippa_tahunan` bernilai 1. Pemicu ke R2 saja, bukan `public/data`.
- `renlap.yml`: membangun renlap PDF dan mengunggahnya ke R2. `terbit.yml` ikut membawa aset. `renlap-pb.yml` bernama mirip tetapi renlap lintas bencana milik modul lain, bukan SIPPA.

Uji dan gerbang:

```
npm run uji:sippa                      # node --test tests/sippa/*.test.mjs
python3 -I scripts/data/sippa/<skrip>.py uji
python3 -I scripts/data/sippa/kembar_cli.py uji   # paritas JS dan Python lewat kasus acuan
```

Gerbang yang menjaga SIPPA: `gerbang-sippa.test.mjs`, `gerbang-cakupan.test.mjs` dan `cakupan.json`, `gerbang-versi.test.mjs` dan `gerbang-versi-layar.test.mjs` (versi berkas statis), `kembar.test.mjs` dan `formulir_paritas.test.mjs` (paritas), `kontras.test.mjs` (kontras warna), serta satu berkas uji per layar.

## Neraca air Jawa

| Berkas | Peran |
| --- | --- |
| `scripts/air/neraca/neraca.py` | bak lengas, routing, waduk, transfer, indikator |
| `scripts/air/neraca/kebutuhan.py` | kebutuhan domestik, irigasi, ternak, industri |
| `scripts/air/neraca/iklim_global.py` | jalur iklim utama (CHIRPS dan NASA POWER) |
| `scripts/air/neraca/iklim.py`, `iklim.json`, `iklim_ekstensi.json` | pembanding ERA5 dan cache iklim, ekstensi tahun berjalan |
| `scripts/air/neraca/topologi.py`, `topologi.json` | topologi sub-DAS dan kabupaten/kota |
| `scripts/air/neraca/glofas.py`, `validasi.py`, `hasil.py` | validasi dan ringkasan otomatis |
| `scripts/air/neraca/grace.py` | simpanan air terestrial dan prakiraan AR(1) |
| `scripts/air/neraca/deret.py` | deret bulanan untuk model banjir |
| `scripts/air/neraca/proyeksi_iklim.py`, `proyeksi_neraca.py` | proyeksi 2041-2060 |
| `scripts/air/neraca/masukan_bps.py`, `tarik_bps.mjs`, `waduk.csv`, `kebutuhan.json` | masukan |
| `data/kajian-bnpb/neraca-air/` | `RANCANGAN.md`, `VALIDASI.md`, `HASIL.md`, `masukan/`, `mentah/`, `pustaka-neraca.json`, `glosarium-neraca.json` |

Berkas keluaran di `public/data/neraca_air/`: `kab.json` (5 skenario x 12 bulan per kabupaten/kota), `ringkas.json`, `aliran.json` (tepi aliran antar-kabupaten/kota), `grace.json`, `deret_bulanan.json`, `proyeksi_iklim.json`, `proyeksi_neraca.json`. Setiap berkas membawa `meta` dengan label dan sumber. `ringkas.json` mencatat `periode_iklim`, `sumber_iklim`, `parameter`, dan `cakupan`.

Pemakai berkas: `scripts/kemitraan/profil_daerah.py` (blok `neraca_air` profil daerah) dan `scripts/banjir/model_kab_campur.py` (fitur deret bulanan).

Tabel D1, rute API, R2, dan workflow: tidak ada. Menurut ilmu agent pemilik, pipeline dijalankan lokal, iklim ditarik bertahap, dan belum ada workflow.

Uji dan gerbang: `python3 -I scripts/air/neraca/<skrip>.py uji` untuk skrip yang punya swauji (`topologi`, `iklim`, `kebutuhan`, `neraca`, `deret`, `proyeksi_iklim`, `proyeksi_neraca`, `iklim_global`, `glofas`, `grace`, `hasil`, `validasi`), diutamakan dengan `PYTHONPYCACHEPREFIX` di luar repositori bila checkout berada di iCloud. Pemeriksa yang ditunjuk untuk metode dan angka adalah `validasi-model`. Gerbang struktur: `npm run uji:agen`.
