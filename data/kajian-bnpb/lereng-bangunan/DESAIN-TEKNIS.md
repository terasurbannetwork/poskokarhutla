# DESAIN-TEKNIS: Bangunan di lereng terjal

Status 23 Nov 2026. Berkas di bawah belum ada; bentuknya usulan yang mengikuti pola modul longsor dan paparan.

## 1. Berkas dan pemilik

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/longsor/lereng_dem.py` | pembaca DEM, lereng persen Horn, uji sintetis (`uji`) | `longsor` |
| `scripts/longsor/lereng_bangunan.py` | baca Overture lewat DuckDB, kelas S D G L T, agregat desa dan kecamatan (lab: numpy, rasterio, duckdb di venv) | `longsor` |
| `scripts/longsor/lereng_uji.py` | uji desa longsor, kriteria beku, bootstrap, permutasi | `longsor` |
| `scripts/longsor/lereng_kejadian.py` | citra sebelum dan sesudah, potongan melintang | `longsor` |
| `scripts/longsor/lereng_param.json`, `lereng_sidik.json` | parameter dan sidik beku | `longsor` |
| `scripts/longsor/data_kejadian_desa.json` | 21 desa dengan sumber bertanggal (LT-12) | `longsor` |
| `public/longsor/data/lereng/indeks.json` | kotak yang dihitung, lembar DEM, rilis Overture, tanggal, versi kode | `longsor` |
| `public/longsor/data/lereng/<kab4>.json` | agregat desa dan kecamatan satu kab/kota | `longsor` |
| `public/longsor/data/lereng/kejadian/<id>.json` dan gambar | perubahan tutupan dan potongan melintang | `longsor` |
| `public/longsor/data/lereng/uji.json` | hasil uji desa | `longsor` |
| `public/longsor/lereng.html`, `lereng.js`, `lereng.css` | layar (Q13) | `longsor` bersama `layar-peta` |
| `tests/longsor/lereng.test.mjs` | uji bentuk keluaran dan layar | `longsor` |
| `tests/agen/gerbang-lereng-bangunan.test.mjs` | gerbang tanpa kata aman, kosong bukan nol, label | `penulis-gerbang` |
| `src/**`, `migrations/**` | hanya bila sel halus staf (LT-27) | `warga-api` |
| `scripts/siklus/paparan.py`, `bahaya_kelas.py` | pembaca lapisan bahaya (LT-23) | `siklus` |
| `.github/workflows/**` | tidak ada workflow di fase 1; usulan saja | `mekanik-mesin` |

Dipakai ulang tanpa disalin: `scripts/banjir/genangan/tiff_mini.py` (pembaca TIFF, dimuat dengan importlib bernama unik, seperti `scripts/longsor/dasar.py` memuat `umum.py` banjir), `scripts/banjir/genangan/medan.py` (pola DEMNAS dan GLO-30), `scripts/siklus/sumber.json` (rilis Overture), `scripts/geo/batas.py` dan `public/geo/**` (batas), `scripts/umum/bangunan.py` dan `scripts/pemetaan/kelengkapan.py` (pembanding kelengkapan), `scripts/siklus/paparan.py` (kontrak keluaran). Modul `umum.py` dan `kejadian.py` ada di banjir dan longsor: muat lewat importlib bernama unik.

## 2. Aliran data

```
DEMNAS (unduh manual) --\
                         +--> lereng_dem.py --> lereng_persen per piksel (RAM, tidak disimpan)
GLO-30 (S3, COG)     ---/                                   |
Overture (DuckDB httpfs, bbox kotak) ------------------------+--> lereng_bangunan.py
public/geo/desa + kecamatan (batas) -------------------------+       |
                                                              data/raw/lereng/<kab4>/ (gitignored, per bangunan)
                                                                      v
                                           public/longsor/data/lereng/<kab4>.json (agregat)
                                           public/longsor/data/lereng/indeks.json
```

## 3. Skema keluaran

`indeks.json`:

```
{ "versi": "1", "ambang_persen": 40, "bunyi_ambang": ">=",
  "overture_rilis": "2026-10-21.0", "dibuat": "ISO",
  "kotak": [ {"kab": "3204", "nama": "...", "status": "dihitung|belum dihitung|belum ada DEMNAS",
              "lembar_demnas": ["..."], "glo30": ["..."], "sidik": "..."} ] }
```

`<kab4>.json`:

```
{ "kab": "3217", "kec": [ { "kd": "32.17.01", "n_total": 0, "n_S": 0, "n_D": 0, "n_G": 0, "n_L": 0, "n_T": 0,
     "luas_km2": 0.0, "kerapatan": 0.0, "fraksi": 0.0, "cakupan_demnas": 0.0, "cakupan_glo30": 0.0,
     "kelengkapan": {"kelas": "tidak diketahui", "rasio": null, "sumber": null},
     "cara_titik": 0.0, "angka": "ada|belum ada DEMNAS" } ],
  "desa": [ ...bentuk sama, "kd": "32.17.01.2001", "nama": null|"..." ],
  "tanpa_desa": 0 }
```

Aturan bentuk: bila `angka` bukan "ada", semua `n_*` dan ukuran bernilai `null` (bukan 0); `n_total` tetap diisi bila diketahui. Tidak ada koordinat atau id bangunan. Total berkas Bandung Raya dianggarkan di bawah 2 MB (diukur di LT-09, bukan diasumsikan). Berkas per kab/kota dimuat sesuai pilihan, tidak satu berkas nasional.

`uji.json`: kriteria beku (sidik), n positif dan negatif, AUC dalam strata tiap skor dan pembanding, selang, p permutasi, jumlah desa dikeluarkan karena cakupan, `gagal_cocok` (desa yang tak bisa dicocokkan ke satu `kd`, dengan alasan), n positif per kab, lima pembanding (termasuk skor DEMNAS saja dan GLO-30 saja), selang bootstrap berpasangan atas selisih, peringkat persentil per positif, vonis, label "awal".

`kejadian/<id>.json`: id, tanggal kejadian, dua tanggal citra, kelas awan, parameter ambang, kotak, nama berkas gambar, lereng mahkota (dua DEM), profil (titik, tinggi dua DEM, lereng ruas), pengganda vertikal, sumber resmi yang dirujuk (tautan).

## 4. Pembacaan DEM dan bangunan

- DEMNAS: GeoTIFF per lembar; mentah di luar repo (`data/raw/lereng/dem/`), indeks lembar mencatat nama berkas, kotak, dan sidik. Cakupan per piksel nodata dihitung dan menjadi `cakupan_demnas`.
- GLO-30: COG per ubin 1 derajat dari `copernicus-dem-30m` (pola `medan.py`); hanya ubin yang menutupi kotak.
- Overture: DuckDB `read_parquet` pada jalur S3 rilis terkunci dengan filter `bbox`; hanya kolom `id`, `geometry`, `sources`, `bbox`. Dipecah per kotak kab/kota. Bangunan berpusat di luar poligon kab dibuang dengan hitungan.
- Pembaca di jalur CI atau layar tetap stdlib: layar hanya membaca JSON jadi.

## 5. Kontrak dengan F2

`lereng_bangunan.py` menulis juga `terpapar_lereng.json` terkunci (sel 110 m selaras `halus_<prov>.json`, hanya berisi hitungan S, D, G per sel) di `data/terkunci/lereng/`, bukan `public/`, hanya setelah Q4 dan Q5 dijawab (LT-23, LT-27). `paparan.py` membacanya sebagai bahaya tetap. Hitungan F2 dan modul ini tidak dijumlahkan karena sumber bangunannya berbeda.

## 6. Versi, sidik, dan keterulangan

`lereng_param.json` memuat ambang, `n_min_rincian` (20, bawaan teknis tanpa sumber), ambang cakupan DEMNAS dan GLO-30, jejak dan cincin, skor utama uji, kriteria vonis, tanggal rilis, dan jalur kotak; `lereng_sidik.json` memuat sha256-nya. Skrip menolak jalan bila sidik tidak cocok kecuali dengan bendera versi baru. Hasil hitung memuat versi kode (hash git) dan lembar. Keterulangan diuji dengan kotak kecil (LT-21).

## 7. Anggaran dan batas

| Hal | Bawaan | Menunggu |
| --- | --- | --- |
| Waktu hitung satu kab/kota | diukur di LT-08 | Q17 |
| Ukuran `<kab4>.json` | di bawah 500 KB per kab/kota (diukur) | LT-09 |
| Ukuran gambar kejadian | di bawah 300 KB per gambar (diukur) | LT-15 |
| Memori | blok per baris ubin, bukan seluruh kotak sekaligus | LT-04 |

## 8. Keputusan teknis

| ADR | Keputusan | Alasan |
| --- | --- | --- |
| ADR-1 | Lereng dihitung sendiri (Horn) di kode repo, bukan lewat GDAL | Satu rumus yang diuji sintetis dan diaudit; GDAL tidak ada di jalur stdlib. |
| ADR-2 | Per bangunan pada resolusi asli, tanpa resampling DEM | Menjaga arti "dua peta sepakat". |
| ADR-3 | Peta kolom lewat MapLibre `fill-extrusion` bila lolos pemeriksaan skill; kalau tidak, batang isometrik di kanvas | Tidak menambah pustaka; MapLibre 4.7.1 sudah di repo. |
| ADR-4 | Tidak ada tabel D1 dan rute Worker di fase 1 | Semua keluaran statis agregat; sel halus staf (LT-27) baru butuh Worker. |
