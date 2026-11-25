# DESAIN-TEKNIS: Pemetaan bekas longsor dari satelit

## Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/longsor/bekas.py` | komposit, rdNDVI, saringan, poligon, agregat; subperintah `uji` (luring, array sintetis), `kab`, `prasyarat` | `longsor` |
| `scripts/longsor/bekas_radar.py` | kerapatan perubahan Sentinel-1 per sel 1 km | `longsor` |
| `scripts/longsor/bekas_kriteria.json`, `bekas_sidik.json` | kriteria terkunci dan sidik | `longsor` (+ `validasi-model`) |
| `scripts/longsor/bekas_uji.py` | sampel acak berlapis, kappa, akurasi tertimbang, vonis | `longsor` |
| `tests/longsor/bekas*.test.mjs` | invarian keluaran dan vonis | `longsor` |
| rute baca staf di `src/siklus*.js` | baca agregat dari R2 | `warga-api` |
| lapisan di `public/siklus/**` | tampil (Q5) | `siklus` |

## Ketergantungan

numpy, rasterio, pyproj di venv sementara (pola `s1_genangan.py`), tidak di repo dan tidak di workflow harian. Sumber: Earth Search STAC `sentinel-2-l2a`, Planetary Computer `sentinel-1-rtc`, Copernicus DEM GLO-30 (Planetary Computer `cop-dem-glo-30`), Hansen GFC lewat pembaca `bukti_das.py`.

## Penyimpanan

Hasil per kejadian ke R2 `longsor/bekas/<kab>/<tanggal>/` (GeoJSON poligon disederhanakan, JSON agregat, PNG bukti <= 120 KB). Tidak ada berkas di `public/` sebelum Q6 dijawab. Tanpa tabel D1 baru; status vonis di JSON R2.

## Batas wilayah

Kab dari `public/data/bnpb/wilayah.json` (daftar kode); poligon kecamatan dari `public/geo/kecamatan/<prov>.json` (batas wilayah BIG lewat `scripts/geo/batas.py`, disederhanakan). Atribusi BIG ikut di metadata.

## Ukuran

Satu kab sekitar 2.000 km2 = sekitar 20 juta piksel 10 m per pita per adegan; dibaca dari COG per jendela, overview tidak dipakai untuk isyarat (pelajaran kerusakan satelit v1: overview 110 m membuat satelit mendekati plasebo). Komposit median dihitung per ubin 1.024 x 1.024 piksel, tidak seluruh kab di memori; batas memori sekitar 2 GB **[HIPOTESIS]**. `bekas.py uji` hanya memakai numpy dan array sintetis; bacaan COG hanya di subperintah lain.

## Penjaga mesin

`bekas.py kab` menolak jalan bila sidik kriteria tidak cocok atau `jangkar_commit` null; menulis `null` (bukan 0) untuk bagian tak terliput; vonis bukan lulus mengosongkan `kec`.
