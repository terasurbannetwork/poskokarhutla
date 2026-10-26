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

## 5. Himawari-9 (JAXA P-Tree): terpasang, belum diarsip

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

## Sensor: S-NPP pensiun 1 Nov 2026 (dicatat 23 Okt 2026, direvisi setelah tinjauan validasi-model)

Aturan peralihan TERKUNCI (`prospektif.pilih_sensor`, dipakai `prospektif.py` dan `jejak.py`; padanan JS `sensorTitik` di
`public/sebaran_model.js`, diuji sama untuk masukan yang sama di `uji_js.py`): primer = S-NPP; pindah ke NOAA-20 hanya bila acuan
>= 2026-11-01T00:00Z DAN S-NPP tak mendeteksi >= 36 jam DAN NOAA-20 >= 20 deteksi sesudah deteksi S-NPP terakhir. Sebelum tanggal itu
celah S-NPP = celah data (aturan lama "NOAA-20 > 36 jam lebih baru" terpicu di 29,8% langkah 3 jam Jul 2024 saat S-NPP hidup). Keputusan
disimpan di `data/raw/sebaran/prospektif/sensor.json` (ikut cache & arsip R2, `pulih` memulihkannya) dan tidak pernah berbalik; jejak.py
membaca, tidak menulis. Jendela buta (deteksi S-NPP terakhir sampai peralihan, `peralihan.buta_jam` di prospektif.json): titik api baru
yang mulai di situ dan sudah > 24 jam saat peralihan tidak pernah diramal.

NOAA-21 hanya pendamping (`n20_0`/`n20_14`) untuk NOAA-20, bukan primer. Keluaran mencatat `sensor`/`pendamping`. Ramalan dinilai dengan
sensornya sendiri: bila deteksi terakhir sensor itu < t0 + 72 jam dan sensor belum dipensiunkan, ramalan DILEWATI dan dinilai lagi nanti;
sesudah peralihan ramalan S-NPP yang terpotong = `kedaluwarsa` + `sensor_berhenti`. Angka `mode` dan gerbang (teruji, kalibrasi_ok,
berturut) dihitung hanya pada ramalan sensor primer sekarang (`gerbang_sensor`); vonis di gerbang.jsonl bersensor dan "berturut" tak
menyeberangi peralihan; sesudah peralihan gerbang mulai dari nol (`catatan_gerbang`: "belum teruji untuk NOAA-20"). Tanpa primer:
`status` "tanpa_viirs" (tak ada S-NPP/NOAA-20) atau "tanpa_primer" (prospektif.json, jejak_api.json; JS `lolos_status`), bukan hasil kosong.

Uji arsip 2024-2026 (model 2015-2023 / sel 2015-2022, persis yang dinilai; p S-NPP mereproduksi `lolos_peluang.pkl` dengan beda 0).
Versi NOAA-20 = peristiwa dari komponen N20, fitur dan label dari N20; pendamping = NOAA-21 SUNGGUHAN (FIRMS SP Jul-Nov 2023-2026 + NRT
Jul-Okt 2026, 949.049 deteksi) dan, sebagai pembanding, S-NPP sebagai pengganti NOAA-21. Pasangan "peristiwa sama" = deteksi pertama
<= 3 jam dan <= 750 m: 71.133 dari 252.582 peristiwa S-NPP 2018+ (yang lain hanya terlihat satu sensor), 32.723 di 2024-2026. Label
lolos sama di 96,2% pasangan, tetapi konkordansi label POSITIF hanya ~55% (N20 lolos bila S-NPP lolos: 747 dari 1.346 = 55,5%).
Selang 95% bootstrap baris (B = 200) TANPA resampel klaster per kompleks/hari: terlalu sempit, baca sebagai batas bawah ketidakpastian.

| Model / himpunan 2024-2026 | S-NPP AUC | NOAA-20 AUC | S-NPP ECE | NOAA-20 ECE | recall di ambang S-NPP -> N20 |
| --- | --- | --- | --- | --- | --- |
| membesar awal, populasi penuh (97.749 / 102.255) | 0,908 [0,903; 0,913] | 0,909 [0,903; 0,914] | 0,0035 | 0,0035 | 0,674 -> 0,665 |
| membesar awal, pasangan (32.723) | 0,895 [0,886; 0,903] | 0,881 [0,873; 0,891] | 0,0045 | 0,0060 | 0,714 -> 0,667 |
| ramal ulang 14 jam, penuh, pendamping N21 | 0,955 [0,952; 0,958] | 0,956 [0,952; 0,959] | 0,0053 | 0,0051 | 0,764 -> 0,758 |
| ramal ulang 14 jam, pasangan, pendamping N21 | 0,955 [0,949; 0,961] | 0,945 [0,939; 0,952] | 0,0124 | 0,0066 | 0,821 -> 0,771 |

Ringkas: TIDAK ada penurunan pada populasi penuh. Pada pasangan (api yang sama) recall turun 4-5 poin (0,714 -> 0,667 awal,
0,821 -> 0,781 ramal ulang dengan pendamping pengganti, 0,771 dengan NOAA-21 sungguhan) dan AUC awal -0,014 [-0,022; -0,004].
Model awal tidak memakai fitur pendamping; untuk ramal ulang NOAA-21 sungguhan vs pengganti S-NPP memberi AUC 0,956 vs 0,957 (n20_0
sama pada 54% peristiwa). Model sel, 208 titik awal uji berpasangan (dari 500): F1 mikro sel baru 24 jam 0,133 vs 0,131 (selisih
-0,002 [-0,047; +0,044]); IoU 24 jam LEBIH TINGGI dengan NOAA-20: 0,617 vs 0,681 (+0,064 [+0,030; +0,105]; persistensi 0,820 vs 0,812).

Rekalibrasi (Platt pada skor luar-lipatan versi N20 2018-2023) TIDAK dipasang: perbaikan tidak terbukti (awal: ECE penuh 0,0035 ->
0,0030 tetapi pasangan 0,0060 -> 0,0068; ramal ulang membaik 0,0056 -> 0,0023 tetapi recall di ambang tetap turun 0,764 -> 0,742) dan
memasangnya berarti memilih ulang ambang recall 70% (risiko penyetelan ulang; `model_sebaran.json` hanya ditulis `lolos.py akhir`).
Prospektif per sensor tetap hakim terakhir. Analisis: skrip `uji_sensor.py` (tahap peristiwa | baris | cocok | lolos | sel | baris21 |
nilai21) di luar repo; pindahkan ke `scripts/sebaran/` bila angka ini perlu dihitung ulang. Batas: cuaca reanalisis.
