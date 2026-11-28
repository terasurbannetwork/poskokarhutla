# DESAIN-TEKNIS

## Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/siklus/kelas_desa_bnpb.py` | tarik berkas kelas desa BNPB bulanan, periksa bentuk, tulis `data/raw/siklus/kelas_desa_bnpb/`, `public/data/kelas_desa_bnpb.json` (per kab: jumlah desa per kelas per bahaya baseline dan proyeksi, K kab, 50 desa teratas) dan berkas per kab `public/data/kelas_desa/<kab4>.json` (kode desa, kelas baseline, kelas proyeksi) | `siklus` |
| `scripts/prediksi/status_prakiraan.py`, `status_prakiraan_kriteria.json`, `.sidik` (lama ke `.sidik.v2`), `status_prakiraan_uji.py`, arsip status dengan `versi_kriteria` | BDG; K dari `kelas_desa_bnpb.json` | `prediksi` |
| `scripts/prediksi/analisis_wilayah.py` | `analisis.json` | `prediksi` |
| `scripts/data/iklim.py` | cadangan IOD BoM di `iklim.json` | `pipa-data` |
| `scripts/banjir/debit_glofas.py` | `public/banjir/data/debit_kab.json` | `banjir` |
| `scripts/kekeringan/hth.py` | tetap; dijadwalkan | `gunungapi-kering` |
| `.github/workflows/dampak_peringatan.yml`, `banjir.yml`, `data.yml` | langkah baru | `mekanik-mesin` |
| `src/potensi.js` | rute `/api/potensi/analisis` (publik, daftar izin), `/api/potensi/rekomendasi` (staf), `/api/bmkg/desa` | `warga-api` |
| `src/rekomendasi_katalog.js` | katalog | `warga-api` |
| `src/peta_situs.js` | entri `/potensi` | `warga-api` |
| `public/potensi/index.html`, `potensi.css`, `app.js` (cangkang), `status.js`, `dampak.js`, `iklim.js`, `analisis.js`, `lapisan.js`, `ringkasan.js`, `sumber.js`, `rekomendasi.js` | layar | `layar-peta` |
| `public/inti/dampak_peringatan.js` | fungsi murni status per hari, urutan, ringkas, kelas kab | `inti-layar` |
| `public/lapor/dampak_peringatan.js` | tautan ke `/potensi` | `layar-peta` |
| `docs/centurisk97/**` | metode dan sumber | `docs-situs` |
| `tests/potensi/**` | uji | `penulis-gerbang` |

## Rute

- `GET /api/potensi/analisis`: R2 `dampak_peringatan/analisis.json`, publik, cache 300 detik, lajuIP.
- `GET /api/potensi/rekomendasi?bahaya=&status=`: `stafOK` pusdalops, koordalops, pimpinan, admin; no-store.
- `GET /api/bmkg/desa?kab=<4 angka>&hal=<n>`: publik, lajuIP, kode kab harus ada di daftar, Cache API 3 jam per desa, antrean 50 per menit; galat BMKG `{galat}` tanpa isi mentah.
- Status dan dampak memakai rute induk `/api/dampak-peringatan/*`.

## Peta

Satu MapLibre (pustaka yang sudah dipakai situs), batas kab `public/geo/kabupaten/`, gaya dasar yang sama dengan peta utama. Tab peta mendaftarkan pemasang lapis dan menyalakan atau mematikan lapisnya; peta dibuat malas saat tab peta pertama dibuka.

## Kode wilayah

Kode kab di rute dan keluaran: 4 angka (`3501`). Berkas `public/geo/desa/` bernama `35.01.json` dengan properti `kd`; nama desa dari `public/geo/desa_cari.json` (atau sumber nama yang dipakai layar desa sekarang). Pemetaan kode ditulis sekali di fungsi bersama, tidak disalin.

## Jadwal dan simpan

- `kelas_desa_bnpb.py --bangun`: job bulanan `dampak_peringatan.yml` (menggantikan `kelas_kab.py --bangun`, yang tetap ada untuk `--banding`). `public/data/kelas_desa_bnpb.json` dan `public/data/kelas_desa/<kab4>.json` (sekitar 514 berkas kecil, data kelas publik) di-commit bila berubah.
- Rute BMKG: bila antrean 50 per menit penuh, respons memuat desa yang sudah tercache dan `antre: n` desa yang belum, layar menulis "sebagian desa belum dimuat"; tidak pernah angka kosong sebagai 0. Batas laju per IP hanya penghitung sementara di memori Worker, tidak disimpan.

## Tanpa D1 baru

Semua keluaran berkas di R2 atau `public/`. Tidak ada migrasi.
