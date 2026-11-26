# DESAIN-TEKNIS

## Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/siklus/kelas_kab.py` | perbaikan cakupan, bahaya tambahan, kelas per desa ke `data/raw/siklus/kelas_desa.json` dan ringkasan publik `public/data/kelas_bahaya_desa_tinggi.json` (50 teratas dan jumlah per kab) | `siklus` |
| `scripts/prediksi/status_prakiraan.py`, `status_prakiraan_kriteria.json`, `.sidik.v3`, `status_prakiraan_uji.py` | BDG | `prediksi` |
| `scripts/prediksi/analisis_wilayah.py` | membangun `analisis.json` | `prediksi` |
| `scripts/data/iklim.py` | cadangan IOD BoM di `iklim.json` | `pipa-data` |
| `scripts/banjir/debit_glofas.py` | keluaran `public/banjir/data/debit_kab.json` | `banjir` |
| `scripts/kekeringan/hth.py` | tetap; dijadwalkan | `gunungapi-kering` |
| `.github/workflows/dampak_peringatan.yml`, `banjir.yml`, `data.yml` | langkah baru | `mekanik-mesin` |
| `src/dampak_peringatan.js` | rute `/analisis` (publik, daftar izin) dan `/rekomendasi` (staf) | `warga-api` |
| `src/bmkg_desa.js` | rute `/api/bmkg/desa` | `warga-api` |
| `src/rekomendasi_katalog.js` | katalog bersumber | `warga-api` |
| `public/lapor/peringatan*.js`, `lapor.css`, `index.html` | layar | `layar-peta` |
| `public/inti/dampak_peringatan.js` | fungsi murni status per hari dan urutan | `inti-layar` |
| `docs/centurisk97/**` | definisi dan sumber | `docs-situs` |
| `tests/alun-peringatan/**` | uji | `penulis-gerbang` |

## Rute

- `GET /api/dampak-peringatan/analisis`: R2 `dampak_peringatan/analisis.json`, publik, cache 300 detik, lajuIP.
- `GET /api/dampak-peringatan/rekomendasi?bahaya=&status=`: `stafOK` pusdalops, koordalops, pimpinan, admin; no-store.
- `GET /api/bmkg/desa?kab=<4 angka>&hal=<n>`: publik, lajuIP, Cache API 3 jam per desa, antrean 50 per menit; galat BMKG diteruskan sebagai `{galat}` tanpa isi mentah.

## Tanpa D1 baru

Semua keluaran berkas di R2 atau `public/`. Tidak ada migrasi.

## Status per hari

`status.json` sudah memuat `hari[0..3]`; layar memilih indeks.
