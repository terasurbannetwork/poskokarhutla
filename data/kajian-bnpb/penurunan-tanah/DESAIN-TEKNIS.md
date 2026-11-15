# DESAIN-TEKNIS: Penurunan tanah

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `scripts/banjir/subsiden.py` | Dekomposisi dan agregasi (ada); ditambah galat baku, p10, tanggal deret (PT-03) | banjir |
| `scripts/banjir/proyeksi_tanah.py` (baru) | Proyeksi 10 dan 20 tahun dan, bila ada DeltaDTM, luas di bawah ambang; swa-uji `uji` | banjir |
| `scripts/banjir/RISET-SUBSIDEN.md` | Resep; diperbarui sesudah Q1 | banjir |
| `public/banjir/data/subsiden.json` | Laju per kecamatan, gerbang, atribusi, label | banjir (keluaran) |
| `public/banjir/data/proyeksi_tanah.json` (baru) | Penurunan kumulatif tiga rentang per kecamatan | banjir (keluaran) |
| `public/banjir/lapis_ekstra.js`, `peta.js`, `lapis_air.js` | Lapis, kartu, catatan kaki | banjir |
| `tests/banjir/subsiden.test.mjs` (baru) | Bentuk berkas dan aturan layar | banjir |

Berkas beku J4 tidak disunting (KEPUTUSAN D7); `subsiden.py` hanya mengimpor `umum` dan `wilayah`.

## Tempat berjalan

Bukan GitHub Actions. Pemrosesan InSAR (LiCSBAS, GDAL, conda, unduhan puluhan gigabyte sementara, jam komputasi) berjalan manual tahunan di mesin pemilik di `~/licsbas` (di luar repo). Alasan dan perbandingan opsi: RISET bagian 3 dan 4. Hanya `subsiden.json` dan `proyeksi_tanah.json` (kilobyte) di-commit oleh sesi induk. Tidak ada langkah baru di `banjir.yml`.

Satu-satunya langkah otomatis yang pantas: menambah `python3 scripts/banjir/proyeksi_tanah.py uji` dan `python3 scripts/banjir/subsiden.py uji` ke daftar swa-uji di `banjir.yml` (`.github/workflows/banjir.yml` ada di wilayah banjir). Dua uji itu luring dan cepat.

## Bentuk keluaran

`subsiden.json` (sudah ditentukan `subsiden.py:162`): kota, periode, frame (naik, turun), metode_piksel, referensi, gerbang, kecamatan (kec, kab, n, cakupan, med, p90), atribusi, label. Penambahan: p10, galat, tgl_awal, tgl_akhir per kecamatan; `versi`; `dihitung` (tanggal).

`proyeksi_tanah.json`: per kecamatan `{kec, kab, laju_cm_thn:{rendah,pusat,tinggi}, t10_cm:{...}, t20_cm:{...}, cakupan, hipotesis:true}` dan, bila ada DeltaDTM, `{ambang_cm, luas_bawah_ambang_pct}` di bawah kunci terpisah `elevasi`. Label dan atribusi disalin dari `subsiden.json`.

## Rute dan D1

Tidak ada rute Worker, tidak ada tabel D1, tidak ada migrasi. Berkas statis di `public/banjir/data/`, disajikan seperti berkas banjir lain.

## Kuota dan kesegaran

Tidak memakai kuota Open-Meteo. Pemeriksaan kesegaran data tayang (503 bila banjir tua lebih dari 30 jam) tidak berlaku untuk dua berkas ini: kesegarannya tahunan, ditangani tanda A5 di layar.
