# ALUR: Desa Waspada

## 1. Alur data (mesin)

```
bulanan, statis.yml (berat, diukur di DW-02)
  riwayat_petak.bin (≥ 3 tahun) + public/geo/desa + gambut.geojson
        └─ desa_waspada.py statik ─▶ data/desa_statik.json  (di-commit ke main, tidak terbit)
              tahun: kd → [tahun_terbakar (petak terbanyak), tahun_terakhir]
              gambut: kd → pecahan (semua desa di kab beririsan gambut; kab lain null)

tiap 3 jam, titik.yml (ringan)
  hotspot.json (jam ≥ -168, VIIRS, nominal/tinggi, bukan sumber tetap)
        └─ Desa.cari(lat, lon, kode kab) ─▶ per desa: titik 7 hari, titik 24 jam, terakhir terlihat
  prediksi.json (dari repo, ditulis prediksi.yml harian; kab[].API[3], p pecahan ─▶ persen) ─▶ peluang kab/kota hari 1..3 + status skor.json
  desa_statik.json + desa_cari.json (nama)
  desa_waspada_laju.json (beku, hasil hindcast lokal)
        └─ desa_waspada.py ─▶ public/data/desa_waspada/<pulau>.json + indeks.json  (A, B, laju, definisi, tanggal)
              └─ deploy ikut titik.yml tanpa commit besar tiap 3 jam

sekali, lokal (hindcast, DW-03)
  data/raw/firms/viirs_2023.csv (dan viirs_n20_2023.csv) + riwayat_petak.bin dimasker 2012-2022 + poligon desa
        └─ desa_waspada.py laju ─▶ scripts/data/desa_waspada_laju.json (dibekukan, di-commit)
```

Urutan di `titik.yml`: sesudah `harian.py` (menulis `hotspot.json`). `prediksi.json` tidak ditunggu: dibaca dari checkout repo. Bila `prediksi.json` basi (> 36 jam, dari `dibuat`) kolom peluang diisi `null`, bukan angka lama.

## 2. Alur pengguna di layar

1. Pengguna membuka `/desa-waspada` dari tautan menu situs. Kepala situs bersama (kepala-situs-wajib) dan judul halaman dicat dulu.
2. Kartu ringkasan (tampil `dibuat` dan `acuan`; peringatan bila `acuan` > 12 jam): dua angka kecil (jumlah desa daftar A, jumlah desa daftar B) dan baris definisi satu kalimat; pil hipotesis bila laju belum lulus (D8, Q2).
3. Kartu "Titik panas 7 hari" (daftar A): pemilih provinsi dan kabupaten, kolom cari nama desa, tabel urut titik 7 hari; peta mini di kiri atau di atas; klik baris memfokuskan pin.
4. Kartu "Pernah terbakar berulang" (daftar B): pemilih yang sama, tabel urut tahun terbakar lalu porsi gambut; peta mini.
5. Kartu "Laju terukur": tabel empat kelompok dengan persen, desa-minggu, selang; tanpa kalimat kesimpulan.
6. Tombol "Unduh CSV" di kanan judul tiap kartu daftar: mengunduh daftar yang sedang terfilter di peramban.

## 3. Keadaan dan teks kosong

| Keadaan | Teks |
| ------- | ---- |
| `desa_waspada.json` belum terbit atau gagal dimuat | "Daftar belum tersedia. Coba lagi nanti." Kartu lain tetap dicat |
| daftar A kosong untuk filter | "Tidak ada desa dengan titik panas 7 hari di sini." (bukan "aman") |
| daftar B kosong untuk filter | "Tidak ada desa yang memenuhi riwayat berulang di sini." |
| laju belum terukur | "belum terukur" di kolom laju, pil "hipotesis" di kepala |
| laju terukur, vonis gagal | angka tampil dengan keterangan di `title` "belum cukup membedakan dari desa lain" |
| gambut tak ada data | "–" |
| peluang kab/kota tak ada (kab tanpa prakiraan atau berkas basi) | "–" |
| daftar A terpotong 2.000 | "Menampilkan 2.000 dari N desa; sisanya ada di ekspor provinsi." |
| tanpa JavaScript | "Halaman ini memerlukan JavaScript." |

## 4. Siapa memegang apa

| Bagian | Pemegang |
| ------ | -------- |
| `scripts/data/desa_waspada.py`, `desa_waspada_laju.json`, hindcast | `pipa-data` → `validasi-model` |
| langkah di `titik.yml` dan `statis.yml`, skrip `uji:desa` | `mekanik-mesin` |
| `public/desa-waspada/**`, tautan menu | `layar-peta` → `inp-reviewer`, `selera-angka` |
| pencari desa bila dipindah ke `desa_cari.py` | `pipa-data` |
| `tests/desa-waspada/**`, `tests/agen/gerbang-desa-waspada.test.mjs` | `penulis-gerbang` |
| kata dan teks layar | `layar-peta` memakai skill `bahasa-indonesia-plain` |
