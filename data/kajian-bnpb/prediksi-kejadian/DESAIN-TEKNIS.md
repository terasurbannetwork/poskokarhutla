# DESAIN-TEKNIS

## Berkas dan pemilik
| Berkas | Perubahan | Pemilik |
| --- | --- | --- |
| `public/bnpb/dalops.js` | `muatStatus()` diganti `muatPrakiraan()` dari `/prediksi/data/prediksi.json` dan `lalu.json`; `pra` dinyalakan untuk cuaca, gelombang, udara; seksi baru dan lapis peta | `ruang-bnpb` |
| `public/bnpb/dalops_karhutla.js` | prakiraan `API` dan seksi yang sama | `ruang-bnpb` |
| `public/bnpb/dalops_hitung.js` | fungsi murni `pasangkan()`, `ubin()`; level sel dari `/prediksi/besok_inti.js` | `ruang-bnpb` |
| `tests/bnpb/dalops_prakiraan.test.mjs` | uji fungsi murni + uji golden banjir | `ruang-bnpb` |
| `src/dalops.js` | rute `GET /api/dalops/lapor?jenis=&sejak=` (sesi staf Dalops) | `warga-api` |
| `src/prediksi.js` | `GET /api/prediksi/konfirmasi` menambah baris `sumber: "logbook"` dari R2 `dalops/<jenis>.json` | `warga-api` |
| `scripts/prediksi/konfirmasi.py`, `nilai.py` | `SUMBER` += `logbook`; skor per label | `prediksi` |

Level sel tidak disalin. Dalops memuat `/prediksi/besok_inti.js` (fungsi murni, `window.Besok.levelSel`) yang sama dengan `/prediksi`, jadi aturan level tetap satu sumber. `dalops_hitung.js` hanya menambah `pasangkan()` dan `ubin()`.

## Kontrak rute baru
`GET /api/dalops/lapor?jenis=banjir&sejak=YYYY-MM-DD` -> `{laporan: [{tiket, jenis, tingkat, kab, lat, lon, waktu, status, periksa}]}`. Paling banyak 2000 baris, `sejak` paling jauh 14 hari. Sesi staf yang sama dengan `/api/dalops/*` (Q3). Tanpa kolom lain dari `lapor_sesi`.

## Kinerja
`lalu.json` (sekitar 200 KB) dimuat sekali saat seksi dibuka pertama kali. Ganti tanggal atau ubin: chrome segera, isi tabel dan `setPaintProperty` peta lewat jeda (INP). Titik laporan satu sumber GeoJSON, disaring dengan `setFilter`.

## Golden
Untuk tanggal yang sama, level banjir dan longsor per kab dari jalur baru harus sama dengan jalur `status.json` lama (uji golden, PB-03 paritas: banjir tidak boleh mundur).
