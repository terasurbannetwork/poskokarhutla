# Memasang model sebaran & cerita ke `public/index.html`

Berkas baru (tidak menyentuh index.html):

| Berkas | Isi |
| --- | --- |
| `public/sebaran_model.js` | evaluator model data (`window.SebaranModel`): cuaca → fitur → peluang per sel 375 m, 72 jam, Monte Carlo, dampak |
| `public/data/model_sebaran.json` | model gradient boosting (pohon datar), ambang, tabel ONI/DMI, kinerja uji |
| `public/cerita_karhutla.js` / `.css` | cerita bergulir 7 bab (`window.Cerita`), otomatis menambah kartu "Baca cerita" di atas Insight |
| `public/data/sebaran_cerita.json`, `sebaran_kasus.json`, `musim_awal.json`, `tren_karhutla.json`, `sebaran_pendorong.json` | data cerita |

## 1. Pasang (sudah dijalankan 13 Okt 2026)

`python3 scripts/sebaran/splice_sebaran.py` (jangkar harus cocok tepat sekali; `--cek` untuk memeriksa saja) menambah
1 baris CSS (`cerita_karhutla.css`) dan 4 skrip sesudah `sim_perlakuan.js`: `sebaran_model.js`, `cerita_karhutla.js`,
`insight_sebaran.js`, `sim_data.js`. Semua modul menambal objek yang sudah ada:

- `insight_sebaran.js`: exhibit Insight "Apa yang membuat api membesar" (lahan/konsesi & cuaca, rasio dengan selang 95%),
  "Uji model pada kejadian lalu" (123 kasus; baris → dialog ramalan vs teramati), "Di mana model masih keliru",
  "Kalau ada titik di X", serta "Musim 2026" (disembunyikan atas permintaan pemilik).
- `cerita_karhutla.js`: kartu "Baca cerita" di Insight → cerita 7 bab di tempat.
- `sim_data.js`: kotak centang "Model data (dilatih) di samping model fisika" di Simulasi. Setelah skenario fisika selesai,
  `SebaranModel.ramal()` dijalankan dari titik api 24 jam kompleks (cuaca Open-Meteo 40 hari lalu + 4 hari ke depan),
  garis biru di peta = sel berpeluang ≥ 5% untuk jam yang dipilih di penggeser waktu, kartu ringkasan berisi luas
  24/48/72 jam (P10–P90), peluang membesar, arah utama, gambut/kawasan lindung/desa yang terkena.

## 2. API evaluator (`window.SebaranModel`)

`ramal({model, lat, lon, waktu, cuaca, lahan, sel0?, frp?, mc = 40, seed, hari = 3})` → `{luas[3] {p10,p50,p90,rata},
luasJam[73], p_lepas, arah {deg, km}, sel [{k, lon, lat, p[3]}], kena {ha_harapan, gambut_ha, lindung_ha, sel_jalan, desa[],
jiwa}, cuaca[3], strata, geser}`. `lahan` = {gambut, kawasan, konsesi, sanksi, kanal, jalan, desa, riwayat, penduduk}
(berkas di public/data). Menolak koordinat di luar Indonesia, waktu rusak, model rusak, FRP negatif, dan seri cuaca yang
tidak mencakup 31 hari sebelum dan 72 jam sesudah titik. `cuaca(lat, lon)` (forecast) dan `cuacaTanggal(lat, lon, waktu)`
(forecast ≤ 8 hari lalu, arsip ERA5 untuk tanggal lebih lama).

Mesin fisika situs (`tabelLaju`) memakai efek BUI `exp(32·ln 0,9·(1/BUI − 1/32))`; FBP (pers. 54) memakai 50, bukan 32.
Port Python `simfisika.py` sudah memakai 50 (`efek_bui`). Bila index.html diperbaiki, ganti 32 pertama di baris `fBUI`.

## 3. Uji

- `python3 scripts/sebaran/uji_js.py` — kesetaraan Python ↔ JS (fitur & peluang hari-1 pada titik awal nyata, selisih
  maks harus < 1e-4) + penolakan masukan di luar jangkauan.
- `public/_uji_model.html` dipakai sekali di peramban lalu dihapus (lihat RISET-SEBARAN.md).

## 4. Memperbarui model

```
python3 scripts/sebaran/lacak.py          # peristiwa dari viirs.csv (~1 menit)
python3 scripts/sebaran/cuaca.py          # cuaca per jam (kuota Open-Meteo, berkas di-cache)
python3 scripts/sebaran/latih.py bangun   # sampel
python3 scripts/sebaran/latih.py latih    # setel di 2023, uji 2024-2026, ekspor model_sebaran.json
python3 scripts/sebaran/lacak.py panjang  # S-NPP 2012-2026 (peristiwa_panjang.jsonl)
python3 scripts/sebaran/cuaca.py ekstra   # lengas tanah, lapisan batas, awan, radiasi (sampel)
SEBARAN_TANPA_UJI=1 python3 scripts/sebaran/latih.py latih   # putaran penyetelan (validasi saja)
python3 scripts/sebaran/galat.py          # analisis kesalahan validasi (himpunan-uji: laporan saja)
python3 scripts/sebaran/kasus.py          # pustaka uji-balik >= 100 kasus
python3 scripts/sebaran/pendorong.py elevasi  # analisis pendorong (+ ketinggian OpenTopoData)
python3 scripts/sebaran/pendorong.py panjang  # lahan saja, 2012-2026
python3 scripts/sebaran/musim_awal.py     # awal musim & tren
python3 scripts/sebaran/cerita_data.py    # data cerita
```
Tiap skrip punya `uji` (asersi invarian) kecuali tahap berat.

## 5. Per jam sungguhan: Himawari-9 (JAXA P-Tree) — belum dipasang

VIIRS S-NPP melihat Indonesia ± 2 kali sehari (13:30 & 01:30 waktu setempat). Arsip FIRMS di repo ini HANYA S-NPP
(NOAA-20/21 belum diunduh); menambah NOAA-20 (`VIIRS_NOAA20_NRT`/`_SP`) dan NOAA-21 lewat `scripts/data/firms.py`
memberi 4–6 lintasan, masih bukan per jam. Per jam (10 menit) butuh satelit geostasioner Himawari-9.

Yang harus dibuat pemilik (sekali, gratis, tidak bisa diwakilkan):
1. Daftar di JAXA Himawari Monitor P-Tree: https://www.eorc.jaxa.jp/ptree/registration_top.html — isi nama, email,
   afiliasi, tujuan (non-komersial/riset/kebencanaan), setujui ketentuan (atribusi "Himawari data supplied by P-Tree
   System, JAXA").
2. JAXA mengirim akun FTP lewat email (ID = alamat email dengan `@` diganti `_`, plus kata sandi).
3. Simpan sebagai rahasia: `PTREE_USER`, `PTREE_PASS` di `.env` lokal (sudah di-.gitignore) dan GitHub Actions secrets.
   Jangan pernah di-commit.

Produk yang dipakai: Himawari L2 Wild Fire (`/pub/himawari/L2/WLF/` di `ftp.ptree.jaxa.jp`, 10 menit, piksel ±2 km,
CSV per pindaian berisi lat, lon, FRP, keyakinan). Periksa nama versi direktori setelah login; strukturnya
`.../YYYYMM/DD/HH/` per jam.

Rancangan colokan (belum ditulis karena butuh kredensial):
- `scripts/sebaran/himawari.py`: `ftplib` (stdlib) + `PTREE_USER/PASS` dari lingkungan → unduh CSV 10 menit untuk N jam
  terakhir → saring kotak Indonesia → baris dengan skema yang sama dengan `muat_viirs()` (`t` menit, `lat`, `lon`, `frp`,
  `dn`) tetapi `sumber="H9"` dan piksel 2 km.
- Pelacak: `lacak.hubungkan(t, lat, lon, jarak=2000, jeda=3*60)` untuk Himawari saja; peristiwa VIIRS dicocokkan ke
  peristiwa Himawari bila ≤ 2 km & ≤ 1 jam, jadi tiap peristiwa punya urutan per 10 menit (awal lebih presisi) dan sel
  375 m dari VIIRS.
- Model: tambah langkah 1 jam (`calon` dari piksel Himawari aktif, target = sel VIIRS/ Himawari baru dalam 1 jam) dan fitur
  `jam_lokal`; evaluator JS sudah menerima `hari` 1–3, cukup ditambah `langkah_jam`.
- Alternatif tanpa pendaftaran: data mentah Himawari L1b di AWS Open Data (`noaa-himawari9`), tetapi itu radiansi; deteksi
  api harus dibangun sendiri (algoritme kontekstual 3,9/11 µm). Lebih berat, tidak disarankan.
