# DESAIN-TEKNIS

## Berkas (pemilik `prediksi`)
- `scripts/prediksi/dasar.py`: `KODE` += `GEL`, `CEX`; validasi entri mengenal kolom barunya.
- `scripts/prediksi/catat.py`: `ambil_hujan` meminta `wind_gusts_10m` dan mengisi kamus embusan; `entri_cex`, `entri_gel`, `kab_titik` (titik ke kab), `uji` diperluas.
- `scripts/prediksi/nilai.py`: GEL dan CEX "menunggu" dengan alasan.
- `scripts/prediksi/terbit.py`: `TAMPIL`/`LABEL` += GEL (`hs`, `lv`), CEX (`emb`, `lv`); kunci `geo` per kab; aturan baru.
- `scripts/prediksi/aturan.json`: melaut aktif, angin kencang baru.
- `scripts/prediksi/tangga.py`: `muat_kering_kita` (sepekan, bulan).
- `public/prediksi/index.html`, `prediksi.js`, `prediksi.css`: tab Besok baru; peta memuat `/vendor/maplibre/*` dan batas `/geo/kabupaten/<prov>.json` saat tampilan Peta pertama kali dibuka.
- `tests/prediksi/prediksi.test.mjs`: uji fungsi murni level sel, urutan, angka pil.

## Kontrak `prediksi.json`
Tiap kab: `{id, nama, prov, pn, jiwa, geo, HJN, API, BNJ, LSR, ASP, ROB?, GEL?, CEX?}`; tiap kode tiga baris (H+1..H+3) kolom `kode.<K>.kol`. `kode.<K>.vonis["<kol>|<n>"]` = `[vonis, n, bss, terkalibrasi]`.

## Kinerja
Tabel 514 baris dirender bertahap (60 baris, "Tampilkan lagi"). Klik pil/segmen: chrome diperbarui segera, isi tabel dan peta lewat `nanti()` (INP). Peta: satu sumber GeoJSON, warna lewat ekspresi `match` pada properti level, ganti bencana = `setPaintProperty`, bukan bangun ulang.
