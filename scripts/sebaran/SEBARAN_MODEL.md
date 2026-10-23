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

`ramal({model, lat, lon, waktu, cuaca, lahan, sel0?, frp?, frpJumlah?, titik?, ulang?, mc = 40, seed, hari = 3})` → `{luas[3] {p10,p50,p90,rata,p10_mc,p90_mc},
luasJam[73], p_lepas, arah {deg, km}, sel [{k, lon, lat, p[3]}], kena {ha_harapan, gambut_ha, lindung_ha, sel_jalan, desa[],
jiwa}, cuaca[3], strata, geser}`. `lahan` = {gambut, kawasan, konsesi, sanksi, kanal, jalan, desa, riwayat, penduduk}
(berkas di public/data). `titik` = deteksi 7 hari [{t ms, lat, lon, s: "N"|"N20"}] dari hotspot.json: bila ada dan sel awal
< 10, `lolos` = {p, waspada, ambang, mode} dari model khusus membesar (lolos.py) dan `p_lepas` = p itu (`p_lepas_mc` = cara lama);
sel awal >= 10 -> `sudah_besar`. P10/P90 dilebarkan per lahan & hari dengan `model.selang.q` (konformal, target 80%). Menolak koordinat di luar Indonesia, waktu rusak, model rusak, FRP negatif, dan seri cuaca yang
tidak mencakup 31 hari sebelum dan 72 jam sesudah titik. `cuaca(lat, lon)` (forecast) dan `cuacaTanggal(lat, lon, waktu)`
(forecast ≤ 8 hari lalu, arsip ERA5 untuk tanggal lebih lama).

Mesin fisika situs (`tabelLaju`) memakai efek BUI `exp(32·ln 0,9·(1/BUI − 1/32))`; FBP (pers. 54) memakai 50, bukan 32.
Port Python `simfisika.py` sudah memakai 50 (`efek_bui`). Bila index.html diperbaiki, ganti 32 pertama di baris `fBUI`.

## 3. Uji

- `python3 scripts/sebaran/uji_js.py` — kesetaraan Python ↔ JS (fitur & peluang hari-1 pada titik awal nyata, selisih
  maks harus < 1e-4) + penolakan masukan di luar jangkauan.
- `python3 scripts/sebaran/uji_js.py sensor` — sebagian yang tidak butuh data mentah: VIIRS utama sadar waktu (S-NPP/N21) Python ↔ JS.
- `python3 scripts/sebaran/{sensor,prospektif,jejak,gerbang}.py uji` — sensor utama, pra-registrasi/vonis/kesehatan prospektif, kontrak jejak, gerbang pembanding.
- Pra-registrasi prospektif: angka beku dikunci `KRITERIA_SHA256` (dicek `uji` dan `ringkas()`, tanpa jalan pintas env); selang AUC bootstrap 2000 ulangan berkelompok
  per (tanggal, sel 0,5 derajat); `vonis_akhir` ditetapkan sekali saat n_dinilai >= 200 dan n_lolos >= 20 (tersimpan di `vonis.jsonl`, ikut arsip), `vonis_berjalan` hanya tampilan.
- `python3 scripts/sebaran/gerbang.py` menulis `public/data/gerbang_model.json` (boleh_tampil per keluaran: model_sel, mesin_fisika, jejak_api, lolos). Jalankan ulang
  setiap `sebaran_kasus.json`/`model_sebaran.json`/`prospektif.json` berubah. Pembaca gagal-tertutup (hilang/rusak = sembunyikan).
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
python3 scripts/sebaran/lolos.py bangun   # baris "akan membesar" per titik api baru (+ konteks titik sekitar, NOAA-20)
python3 scripts/sebaran/lolos.py cv       # validasi silang tinggal-satu-tahun 2015-2023: ablasi & kisi (lolos_cv.json)
python3 scripts/sebaran/lolos.py selang   # selang luas konformal (kunci "selang" di model_sebaran.json)
python3 scripts/sebaran/lolos.py akhir    # lihat-kedua uji 2024-2026, 123 kasus, ekspor "lolos"/"lolos_ulang"
python3 scripts/sebaran/prospektif.py     # uji prospektif (CI tiap 3 jam, titik.yml) -> public/data/prospektif.json
```
Mesin 8 GB: `lolos.py` berjalan satu proses (LOLOS_PROSES=1) dan memakai 5% negatif (bobot 20); selang memakai 2 proses.
Tiap skrip punya `uji` (asersi invarian) kecuali tahap berat.

## 5. Sensor: pergantian S-NPP -> NOAA-21, dan Himawari-9 (JAXA P-Tree) yang SUDAH terpasang

### 5a. VIIRS utama sadar waktu (dipasang 23 Okt 2026)

Model dilatih pada VIIRS S-NPP ("N", lintas ~13:30/01:30 waktu setempat). FIRMS berhenti mendistribusikan S-NPP pada 1 Nov 2026 13:00 UTC
(`SNPP_AKHIR` di `scripts/data/peta_karhutla.py`, milik pipa-data, yang memakai NOAA-21 sebagai pengganti). Tanpa penanganan, jalur prediksi yang
mengunci sensor "N" (`prospektif.py`, `jejak.py`, `sebaran_model.js`) akan sunyi tanpa error. Sekarang semuanya memakai "VIIRS utama":
`N` sebelum `SNPP_AKHIR`, `N21` sesudahnya (satu bidang orbit dan jam lintas dengan NOAA-20, paling mirip S-NPP; semua VIIRS TIDAK digabung karena
distribusi fitur berubah dan model dilatih per S-NPP).
- Sumber tunggal: `scripts/sebaran/sensor.py` (`SNPP_AKHIR`, `utama_pada`, `baris_utama`, `peralihan`, `kelompok`); self-check `sensor.py uji` membaca teks
  `peta_karhutla.py` dan menolak bila konstantanya beda. Sisi JS: `SNPP_AKHIR_MS`/`sensorUtama` di `sebaran_model.js`, dibuktikan setara Python lewat
  `python3 scripts/sebaran/uji_js.py sensor` (tanpa data mentah; `uji_js.py` penuh butuh cache `data/raw/firms/viirs.csv`).
- `hotspot.json` (harian.py) membawa semua sensor termasuk `N21` (`titik_json(lambda p: True)`); `SENSOR_UTAMA` di harian.py hanya mengatur hitungan ringkasan
  provinsi, bukan isi `hotspot.json`.
- Keluaran: `prospektif.json` (`sensor_utama`, `per_sensor.N21|peralihan`, tiap ramalan di `ramalan.jsonl` membawa `sensor_utama` dan `kelompok`), `jejak_api.json`
  (`sensor_utama`, `peralihan`), hasil `SebaranModel.ramal` (`sensor_utama`, `peralihan`). Kelompok `peralihan` = jendela fitur 7 hari atau label 72 jam memuat
  batas, jadi campuran S-NPP dan N21; ia dan `N21` dinilai TERPISAH, tidak masuk metrik S-NPP (`mode.*`, gerbang, vonis).
- BELUM DIUKUR: pergeseran distribusi fitur N21 vs S-NPP (jumlah titik per lintasan, FRP, piksel di tepi sapuan). Ramalan memakai N21 adalah ekstrapolasi.
  Usulan skrip pembanding (`banding_n21.py`, belum ditulis/dijalankan; butuh `FIRMS_MAP_KEY`): arsip `VIIRS_NOAA21_SP` vs `VIIRS_SNPP_SP` 2023-03 s.d. 2026 untuk
  9 provinsi prioritas, bandingkan per hari deteksi nominal/tinggi, FRP median, sel 375 m unik dan fitur `lolos.konteks` pada titik api yang sama, dengan selang
  bootstrap. Bila bermakna, `lolos.py` harus disetel ulang pada N21 sebelum ramalan N21 boleh dihitung teruji.

### 5b. Himawari-9 (JAXA P-Tree): terpasang, belum diarsip

Per jam (10 menit) butuh satelit geostasioner. Sudah terpasang: `scripts/data/himawari.py` (L2 WLF v010, `ftplib`, secret `PTREE_USER`/`PTREE_PASS` di
GitHub Actions) dijalankan `.github/workflows/himawari.yml` tiap 30 menit (menit 7 dan 37), jendela 3 jam terhadap pindaian terbaru (`HIMAWARI_JAM`),
keluaran `public/data/himawari.json` diunggah langsung ke R2 (tidak dikomit, tidak ada di `public/data` lokal). Belum diarsip: tiap putaran menimpa jendela 3 jam,
jadi riwayat per jam TIDAK ADA untuk melatih apa pun. Atribusi: "Himawari data supplied by P-Tree System, JAXA". Piksel ±2 km, `Reliability 1` dan titik
gunung api dibuang oleh parser.

Belum dikerjakan (rancangan; butuh arsip dulu, lalu persetujuan pemilik):
- Arsip bergulir `himawari.json` (mis. gz per hari ke R2/git) supaya ada riwayat 10 menit.
- Pelacak: `lacak.hubungkan(t, lat, lon, jarak=2000, jeda=3*60)` untuk Himawari saja; peristiwa VIIRS dicocokkan bila ≤ 2 km & ≤ 1 jam.
- Model langkah 1 jam (`calon` dari piksel Himawari aktif; evaluator JS sudah menerima `hari` 1-3, cukup `langkah_jam`) dilatih hanya setelah arsip cukup panjang
  dan melewati uji prospektif pra-registrasi yang sama (`prospektif.json` `kriteria`).
- Alternatif tanpa akun: Himawari L1b di AWS Open Data (`noaa-himawari9`), tetapi radiansi mentah; deteksi api harus dibangun sendiri. Tidak disarankan.

NOAA-20 sudah ada di arsip latih (`data/raw/firms/viirs_noaa20.csv`, fitur `n20_0`/`n20_14`); NOAA-21 belum diarsip untuk pelatihan.

## Melanjutkan di perangkat lain

Hasil uji, log, dan state prospektif ada di git (`data/raw/sebaran/*.json|*.log`, `prospektif/`).
Cache latih besar (`*.pkl`, `*.jsonl`, `cuaca/`, ±1,4 GB) ada di GitHub Release `model-cache-2026-10-15`:

```
gh release download model-cache-2026-10-15 -p sebaran-cache.tar.gz -D /tmp
tar -xzf /tmp/sebaran-cache.tar.gz -C data/raw
```

Setelah melatih ulang, buat rilis baru dengan tanggalnya sendiri, jangan menimpa yang lama.
