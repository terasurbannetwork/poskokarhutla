# Peta data eksternal: sumber, keluaran, konsumen, kelas (10 Nov 2026)

Dibuat mekanis (skrip di skrip audit sekali jalan) dari `scripts/**`, `src/**`, `public/**`, `.github/workflows/*.yml`. Baca saja; repo tidak disunting. Data lengkap per baris: `peta_data.json`.

## 1. Ringkasan per kelas

| Kelas | Keluaran (keluarga berkas) | Berkas fisik | Dari sumber eksternal |
|---|---:|---:|---:|
| TAMPIL_ANALISIS | 218 | 292 | 68 |
| TAMPIL_MENTAH | 178 | 2701 | 32 |
| HANYA_PIPELINE | 135 | 173 | 41 |
| YATIM | 12 | 12 | 1 |
| SALINAN_NYASAR | 12 | 76 | 0 |
| **Total** | **555** | **3254** | **142** |

Keluarga = satu berkas, atau satu pola berkas bernomor (`kemitraan/daerah/N.json` = 514 berkas). Baris Worker/D1 (FIRMS, gempa, nowcast, MAGMA, adsb.fi, SIHKA, DSDA, OpenAlex) ditambah manual (8 baris, `n_berkas` 0).

Aturan kelas: **TAMPIL_*** bila ada rujukan di `public/**` (layar), `src/**` (Worker), generator laporan/deck atau kode Dalops. ANALISIS bila nama keluaran atau nama berkas konsumennya bertanda analisis (insight, tren, risiko, prediksi, status, skor, rapor, banding, dampak, prioritas, ...), selain itu MENTAH. **HANYA_PIPELINE** bila hanya skrip/workflow yang membaca. **YATIM** bila tidak ada pembaca sama sekali setelah diperiksa ulang `grep -F` basename dan stem di `public/ src/ scripts/ .github/` dan nama dinamis (template string). Kelas ANALISIS vs MENTAH adalah heuristik nama; angka kedua kelas itu perkiraan, tiga kelas lainnya sudah diperiksa ulang.

Dikoreksi tangan setelah pemeriksaan ulang: `kemenhut/terbakar_<tahun>/N.json` (72 berkas) NAMANYA dinamis di `public/index.html:2276` sehingga bukan yatim; pecahan `presiden/*.json` dibundel ke `semua.json`; `kejadian_gunungapi_geo.json` benar yatim (hanya `_awal` dimuat, `public/gunungapi/kejadian.js:9`).

## 2. YATIM (12) dan salinan nyasar (12)

- `public/data/bahan_bakar_uji.json` (1 berkas, 1 KB): hanya disebut scripts/agents/roster.json (daftar pemilik); tak dimuat layar atau skrip
- `public/banjir/data/kejadian_gunungapi_geo.json` (1 berkas, 3 KB): tab Kejadian gunung api hanya memuat kejadian_gunungapi_awal.json (public/gunungapi/kejadian.js:9); poligon _geo ditulis scripts/umum/kejadian.py:190 tetapi tidak digambar
- `public/data/lab/kerusakan_ringkas.md` (1 berkas, 2 KB): keluaran sekali jalan/alat uji, tidak dirujuk layar atau skrip lain
- `public/data/og/_uji_dalops.js` (1 berkas, 222 KB): keluaran sekali jalan/alat uji, tidak dirujuk layar atau skrip lain
- `public/banjir/data/replay/maret2025_cari.json` (1 berkas, 1599 KB): keluaran sekali jalan/alat uji, tidak dirujuk layar atau skrip lain
- `public/data/lab/log/ringkas.txt` (1 berkas, 7 KB): log diagnostik uji laboratorium ter-commit ke public; tak dimuat siapa pun
- `public/data/lab/log/lab_luas_uji.txt` (1 berkas, 2 KB): log diagnostik uji laboratorium ter-commit ke public; tak dimuat siapa pun
- `public/data/lab/log/uji_ujibanding.txt` (1 berkas, 0 KB): log diagnostik uji laboratorium ter-commit ke public; tak dimuat siapa pun
- `public/data/lab/log/citra.txt` (1 berkas, 7 KB): log diagnostik uji laboratorium ter-commit ke public; tak dimuat siapa pun
- `public/data/lab/log/lab_padam_jalan.txt` (1 berkas, 4 KB): log diagnostik uji laboratorium ter-commit ke public; tak dimuat siapa pun
- `public/data/lab/log/lab_padam_uji.txt` (1 berkas, 1 KB): log diagnostik uji laboratorium ter-commit ke public; tak dimuat siapa pun
- `public/data/lab/log/lab_luas_jalan.txt` (1 berkas, 5 KB): log diagnostik uji laboratorium ter-commit ke public; tak dimuat siapa pun

Salinan nyasar " 2" (AGENTS.md bagian 9, jangan disunting atau dipakai; layak dihapus): `cuaca/data/jaringan_peringatan 2.json`, `cuaca/data/evakuasi_tsunami 2.json`, `cuaca/data/gerakan_tanah_pu 2.json`, `banjir/data/bendungan 2.json`, `banjir/data/pasut_30h 2.json`, `banjir/data/pos_pu 2.json`, `udara/data/omc_arsip 2.json`, `data/wilayah/N N.json`, `data/wilayah/indeks 2.json`, `data/lahan/pippib/N_-N N.json`, `data/lahan/pippib/N_N N.json`, `data/lahan/pippib/indeks 2.json`

## 3. Sumber eksternal terbanyak (host, jumlah keluarga yang ditulisnya, kelas)

| Host | Keluaran | Kelas |
|---|---:|---|
| api.open-meteo.com | 21 | TAMPIL_MENTAH 6, TAMPIL_ANALISIS 11, HANYA_PIPELINE 4 |
| archive-api.open-meteo.com | 19 | TAMPIL_MENTAH 4, TAMPIL_ANALISIS 10, HANYA_PIPELINE 5 |
| gis.bnpb.go.id | 18 | TAMPIL_MENTAH 6, TAMPIL_ANALISIS 10, YATIM 1, HANYA_PIPELINE 1 |
| firms.modaps.eosdis.nasa.gov | 16 | TAMPIL_MENTAH 2, TAMPIL_ANALISIS 7, HANYA_PIPELINE 7 |
| zenodo.org | 10 | TAMPIL_ANALISIS 2, HANYA_PIPELINE 8 |
| www.bmkg.go.id | 8 | TAMPIL_ANALISIS 8 |
| open-meteo.com | 8 | TAMPIL_ANALISIS 8 |
| dibi.bnpb.go.id | 8 | TAMPIL_ANALISIS 7, TAMPIL_MENTAH 1 |
| esa-worldcover.s3.eu-central-1.amazonaws.com | 7 | TAMPIL_ANALISIS 1, HANYA_PIPELINE 6 |
| psl.noaa.gov | 7 | TAMPIL_ANALISIS 1, HANYA_PIPELINE 6 |
| earthquake.usgs.gov | 6 | TAMPIL_ANALISIS 6 |
| cdn.bmkg.go.id | 6 | TAMPIL_ANALISIS 4, HANYA_PIPELINE 2 |
| inarisk.bnpb.go.id | 5 | TAMPIL_ANALISIS 5 |
| www.globalfloods.eu | 5 | TAMPIL_ANALISIS 5 |
| maritim.bmkg.go.id | 5 | TAMPIL_MENTAH 2, TAMPIL_ANALISIS 3 |
| previous-runs-api.open-meteo.com | 5 | TAMPIL_ANALISIS 4, HANYA_PIPELINE 1 |
| www.flashwildfireservices.ca | 4 | TAMPIL_ANALISIS 2, TAMPIL_MENTAH 2 |
| flood-api.open-meteo.com | 4 | TAMPIL_ANALISIS 3, HANYA_PIPELINE 1 |
| aviationweather.gov | 3 | TAMPIL_ANALISIS 1, TAMPIL_MENTAH 2 |
| web-aviation.bmkg.go.id | 3 | TAMPIL_ANALISIS 1, TAMPIL_MENTAH 2 |
| marine-api.open-meteo.com | 3 | TAMPIL_ANALISIS 3 |
| data.bnpb.go.id | 3 | TAMPIL_ANALISIS 3 |
| maps.nccs.nasa.gov | 3 | TAMPIL_ANALISIS 3 |
| services1.arcgis.com | 3 | TAMPIL_ANALISIS 3 |
| raw.githubusercontent.com | 3 | TAMPIL_MENTAH 2, TAMPIL_ANALISIS 1 |
| www.seismicportal.eu | 3 | HANYA_PIPELINE 3 |
| maps.mail.ru | 3 | TAMPIL_MENTAH 1, HANYA_PIPELINE 2 |
| power.larc.nasa.gov | 2 | HANYA_PIPELINE 1, TAMPIL_ANALISIS 1 |
| maps.isric.org | 2 | TAMPIL_MENTAH 1, HANYA_PIPELINE 1 |
| prims.brgm.go.id | 2 | TAMPIL_ANALISIS 1, TAMPIL_MENTAH 1 |

Jadwal: `data.yml` harian 14:20 UTC (68 skrip), `titik.yml` 3-jam (40 menit) + 09:10 + 22:55, `banjir.yml` 00:20, `lintas.yml` 02:10, `udara.yml` 06:40/18:40, `gempa.yml` 01:10, `prediksi.yml` 01:50, `arsip-bmkg.yml` tiap 3 jam, `himawari.yml` 07/37 tiap jam, `nowcast-bandang.yml` menit 25; Worker cron `* * * * *` (src/worker.js:939-1021). Per keluaran ada di kolom `jadwal` JSON.

## 4. Lima belas sambungan: nilai tinggi, kerja terkecil

1. **[nilai tinggi, kerja kecil]** Rapor model lawan Pusdalops: hit rate, FAR, dan selisih jam per bulan dari validasi_logbook_*(+_arsip). Metode: hitung hit/miss/false alarm terhadap kejadian logbook per kab, bukan model baru.
   - Keluaran: `data/validasi_logbook_banjir.json`, `data/validasi_logbook_longsor_arsip.json`, `data/validasi_logbook_karhutla_arsip.json`, `data/validasi_logbook_banjir_arsip.json` (+2)
   - Tempat: kartu Rapor di public/banjir/insight.js, public/longsor/insight.js, public/kekeringan/insight.js
2. **[nilai tinggi, kerja kecil]** Penanda aktivasi citra darurat (Copernicus EMS, Charter, MCDWD, GFM): kab Siaga hari ini yang punya peta cepat resmi diberi tautan dan umur citra.
   - Keluaran: `banjir/data/charter.json`, `banjir/data/mcdwd_model.json`, `banjir/data/ems.json`, `banjir/data/mcdwd.json` (+1)
   - Tempat: public/banjir/kejadian.js (kartu kejadian aktif)
3. **[nilai tinggi, kerja kecil]** Kurva reliabilitas dan skor lawan baseline per tenggang (+1..+3) dari pasangan.json; cacah sampel per sel ditampilkan agar tak presisi palsu.
   - Keluaran: `prediksi/data/pasangan.json`, `prediksi/data/koreksi_riwayat.jsonl`, `prediksi/data/arsip/N-N.jsonl`, `prediksi/data/amatan/konfirmasi.json` (+1)
   - Tempat: layar Rapor public/prediksi
4. **[nilai tinggi, kerja kecil]** Kartu Selisih angka: kejadian dan korban per prov x tahun x jenis dari DIBI lawan Dalops lawan kejadian.json, selisih ditampilkan sebagai selisih bukan galat (aturan rekonsiliasi_dalops_dibi.py).
   - Keluaran: `data/silang_dibi_logbook.json`, `data/bnpb/dibi_kab_tahun.json`
   - Tempat: public/bnpb/silang.js (sudah menampilkan rekonsiliasi; tambah dibi_kab_tahun dan kejadian.json sebagai kolom ketiga)
5. **[nilai tinggi, kerja sedang]** Kartu Siapa lebih akurat: prakiraan BMKG lawan Open-Meteo lawan amatan SYNOP/METAR per kab (MAE hujan, bias suhu, 30 hari). Verifikasi, bukan model baru. Sesi BMKG sedang mengerjakan berkasnya.
   - Keluaran: `banjir/data/cuaca_synop_arsip.json`, `banjir/data/cuaca_sepekan.json`, `banjir/data/cuaca_bandara_bmkg.json`, `banjir/data/cuaca_sepekan_arsip.json` (+10)
   - Tempat: public/cuaca/insight.js dan status.js
   - Catatan: berkas terkait sedang dikerjakan sesi lain (MAGMA/BMKG)
6. **[nilai tinggi, kerja sedang]** Penjelasan 'mengapa Siaga': di pop-up kecamatan tampilkan ambang GRRR/persentil, pemicu hujan terpenting, koreksi bias aktif, dan genangan historis terdekat. Hanya membaca keluaran model yang sudah ada.
   - Keluaran: `banjir/data/grrr_ambang.json`, `banjir/data/kecamatan_pemicu.json`, `banjir/data/genangan_nasional.json`, `banjir/data/riwayat_grid_longsor.json` (+7)
   - Tempat: pop-up kecamatan public/banjir/peta.js dan kartu Insight public/banjir/insight.js
7. **[nilai tinggi, kerja sedang]** Kartu Tally indikator kekeringan: kelas resmi (BMKG HTH/SPI, BNPB, GDO) berdampingan dengan hipotesis internal per kabupaten, hitung kesepakatan kelas (Cohen kappa) dan daftar kab yang berbeda. Pil hipotesis tetap (FAR 97%).
   - Keluaran: `data/persentil_fwi.json`, `data/kekeringan_prospektif.json`, `data/kalibrasi_wilayah.json`, `data/kekeringan_resmi.json` (+4)
   - Tempat: public/kekeringan/insight.js (kartu Insight yang ada) dan metode.js
8. **[nilai tinggi, kerja sedang]** Kartu Tiga sumber PM2.5/gas: stasiun (OpenAQ/BMKG) lawan model (GEOS-CF/CAMS) lawan satelit (TROPOMI) per kota; selisih jadi pita ketidakpastian pada angka AQI.
   - Keluaran: `udara/data/awan_himawari.json`, `udara/data/tropomi_seri.json`, `udara/data/prakiraan_arsip.json`, `udara/data/openaq_mos.json` (+3)
   - Tempat: public/udara/insight.js
9. **[nilai tinggi, kerja sedang]** Kartu Zona PVMBG lawan nowcast: kab dengan nowcast LHASA tinggi tetapi di luar zona kerentanan PVMBG (dan sebaliknya), plus tanggapan PVMBG terbaru per kejadian.
   - Keluaran: `longsor/data/tanggapan_pvmbg.json`, `longsor/data/tanah.json`, `longsor/data/pvmbg.json`, `longsor/data/uji_balik.json`
   - Tempat: public/longsor/insight.js
10. **[nilai tinggi, kerja sedang]** Sama dengan pipeline scripts/gunungapi/magma.py -> banjir/data/gunungapi_status.json: dua penyimpan level dari sumber yang sama (lihat ketidakcocokan #3). Jadikan D1 satu-satunya level 'terkini', file harian hanya riwayat.
   - Keluaran: `D1 gunungapi_level, gunungapi_ubah`
   - Tempat: src/worker.js dan layar terkait
   - Catatan: berkas terkait sedang dikerjakan sesi lain (MAGMA/BMKG)
11. **[nilai tinggi, kerja besar]** Layar neraca air Jawa belum ada: kartu 'Kab defisit air bulan ini' (neraca bulanan lawan kebutuhan sektor) dengan GRACE sebagai pembanding tren tampungan.
   - Keluaran: `data/neraca_air/grace.json`, `data/neraca_air/deret_bulanan.json`, `data/neraca_air/aliran.json`, `data/neraca_air/kab.json`
   - Tempat: public/kekeringan/insight.js (kartu Insight) atau tab baru Air
12. **[nilai sedang, kerja kecil]** Akses darat ke kompleks: jarak jalan terdekat dan kanal sekat bakar terdekat sebagai kolom di tabel kompleks; sudah dipakai skrip insiden, tambah ke layar.
   - Keluaran: `data/kanal.json`, `data/jalan.geojson`, `data/osm_nasional/N.json`, `data/osm/63.json` (+4)
   - Tempat: tabel kompleks public/index.html
13. **[nilai sedang, kerja kecil]** Irisan titik panas 24 jam dengan konsesi tambang (ESDM) dan perhutanan sosial (KLHK): jumlah titik dan luas per kompleks, tampil di kartu kompleks. Murni irisan spasial.
   - Keluaran: `data/ps.json`, `data/tambang.json`
   - Tempat: public/laporan_konsesi.js dan kartu kompleks di public/index.html
14. **[nilai sedang, kerja kecil]** Masukkan ke kartu ringkas Presiden (rob) dan ke rapor prospektif abu gunung api (uji prospektif harus terlihat).
   - Keluaran: `banjir/data/prospektif_abu.json`, `banjir/data/rob_presiden.json`
   - Tempat: public/presiden.js, public/gunungapi/insight.js
15. **[nilai sedang, kerja kecil]** Irisan luas terbakar Kemenhut 2025/2026 dengan konsesi/PIPPIB per provinsi: tabel 'terbakar di dalam izin' sebagai kartu laporan konsesi.
   - Keluaran: `data/kemenhut/terbakar_2025/N.json`, `data/kemenhut/terbakar_2026/N.json`
   - Tempat: public/laporan_konsesi.js

Daftar penuh usulan (149 keluaran) ada di JSON: filter `usulan != ""`.

## 5. Ketidakcocokan angka (tally)

1. **Titik panas 24 jam, lima angka untuk hal yang kelihatan sama** (acuan data 2026-10-12T12:27Z, data lokal basi tapi pola berlaku di produksi).
   - `public/data/hotspot.json` baris `jam >= -24`: **37.899** (semua keyakinan); keyakinan >= 1: 35.653.
   - `public/data/titik24.json`: **18.511** (dedup kotak 0,005 derajat; `scripts/warga/titik24.py:23-33`; dipakai Lapor Warga, SIPPA `scripts/data/sippa/pemicu.py`, `public/inti/adapter.js:11`).
   - `kluster.json` jumlah `n24` per kompleks: **28.497** (hanya titik yang masuk kompleks, `scripts/data/harian.py:582-615`); jumlah `api24`: 22.265 (koordinat di poligon).
   - `public/data/hotspot24.json`: **64.454** baris karena jendela 48 jam (`scripts/data/harian.py:731-734`); `/api/titik` (D1 `titik_terbaru`, `src/titik.js:38-41`) memakai keyakinan sendiri.
   - Panel Presiden (`scripts/data/presiden.py:85,353`) dan berita (`scripts/data/berita.py:635`) menjumlah `n24`, jadi menampilkan 28.497, bukan 37.899. Saran: satu fungsi `titik24()` di `scripts/umum` + label jendela di tiap kartu.
2. **Kejadian banjir tahunan, dua umpan BNPB**: `public/data/bnpb/dibi_kab_tahun.json` (DIBI Superset; jumlah kab; `scripts/bnpb/risiko_hvc.py:288`) lawan `public/banjir/data/kejadian.json` dan `dampak.json` (data.bnpb.go.id; `scripts/banjir/kejadian.py:295`). 2019: 783 lawan 784; 2020: 1521 lawan 1518; 2021: 1790 lawan 1794; 2023: 1252 lawan 1255; **2024: 1457 lawan 1420**. 2025 hanya ada di DIBI (2991). Layar /bnpb memakai DIBI, layar /banjir memakai data.bnpb: angka tahun sama berbeda antar layar.
3. **Level gunung api, dua penyimpan dari MAGMA yang sama**: Worker D1 `gunungapi_level` (`src/gunungapi.js:47-61`, tiap 30 menit) lawan `banjir/data/gunungapi_status.json` (pipeline `scripts/gunungapi/magma.py`, jadwal harian; sekarang 42 Normal, 24 Waspada, 3 Siaga, 0 Awas) lawan `gunungapi/data/riwayat_level.json` (surat PVMBG di arsip Pusdalops). Selang pembaruan beda, jadi level yang tampil di EWS dan di layar /gunungapi bisa selisih sampai satu siklus. Sesi MAGMA sedang menyentuh area ini.
4. **Kejadian Dalops lawan DIBI**: sudah ada rekonsiliasi (`scripts/bnpb/rekonsiliasi_dalops_dibi.py`, `public/bnpb/silang.js`) tetapi hanya tingkat prov x tahun x jenis; layar kejadian lain (`public/kejadian.js`, `kejadian/kekeringan-N.json`) tidak memakai kunci yang sama (`scripts/bnpb/kunci_kejadian.py`).
5. **Luas terbakar**: `luas_resmi.json` (SiPongi, sampai 2026-07, `public/akademisi.js:2816`) lawan luas satelit/konsesi di `public/data/konsesi2026/*` dan `kluster.json` `luas`; tiga angka dengan definisi beda dan tanpa baris perbandingan di layar mana pun.

Belum diperiksa mendalam (butuh sesi sendiri): korban (`src/korban.js` lawan DIBI `meninggal_hilang` lawan logbook), banjir (status Siaga `status.json` lawan `kejadian_aktif_awal.json` lawan D1 `sihka`), gempa (BMKG `gempa` D1 lawan `public/gempa/data` lawan USGS/EMSC).

## 6. Sedang dikerjakan sesi lain (jangan dihitung yatim)

52 keluarga ditandai `sedang_dikerjakan` di JSON. Pohon kerja: `public/banjir/data/{bmkg_upt,iklim_bmkg,iklim_bmkg_arsip}.json`, `public/udara/data/kualitas_bmkg{,_arsip}.json`, `public/gunungapi/data/{glosari,rezim_letusan}.json`, `public/cuaca/resmi.js`, `scripts/gunungapi/arsip_magma.py`, `scripts/cuaca/{iklim_bmkg,maritim}.py`, `scripts/udara/kualitas_bmkg.py`, serta perubahan `public/gunungapi/{app,insight}.js`, `public/cuaca/{index.html,insight.js,status.js}`. Berkas yang baru dikaitkan sesi itu (`pedoman_krb`, `perubahan_level`, `kegempaan`, `catatan`) saya kelaskan TAMPIL_MENTAH, bukan yatim. Ada juga `scripts/agents/peta_data.py`, `docs/PETA-DATA.md`, `docs/peta_data.json` (belum dilacak) dari sesi lain yang rupanya mengerjakan peta serupa; tidak disentuh.

## 7. Skrip berhost eksternal tanpa keluaran publik terdeteksi (147)

Menulis ke R2/D1/`data/**` luar `public`, atau penulisnya tak terdeteksi heuristik 'write'. Contoh 25 pertama: `kekeringan/fao.py`, `kekeringan/gdo.py`, `kekeringan/peringatan_bmkg.py`, `cuaca/iklim_bmkg.py`, `cuaca/bandara_bmkg.py`, `cuaca/petir.py`, `banjir/peringatan.py`, `cuaca/sepekan.py`, `cuaca/bmkg_kab10.py`, `omc/bmkg_omc.py`, `udara/kualitas_bmkg.py`, `bnpb/drone.py`, `data/cuaca_jam.py`, `prediksi/catat.py`, `udara/pm25_mos.py`, `banjir/hujan.py`, `data/sippa/pilot/tarik.py`, `data/sippa/pilot/analisis.py`, `banjir/sungai_pos.py`, `banjir/unit_respons.py`, `bnpb/kebakaran.py`, `cuaca/sarana.py`, `data/sippa/osm_prov.py`, `gempa/bukti.py`, `gunungapi/paparan.py`. Daftar penuh: `scratchpad/pd/skrip_tanpa_keluaran.json`.

## 8. Batas metode
- Penulis keluaran ditebak dari baris yang memuat nama berkas dan kata tulis/dump/OUT; sebagian keluaran bernama dinamis tak punya penulis terdeteksi (kolom `sumber` berisi 'tidak ada penulis'). Sumber eksternal 134 keluarga terdeteksi; sisanya turunan atau manual.
- Konsumen dicari lewat nama berkas literal, pola direktori, dan template `${}`; peta nama lewat objek (mis. `BERKAS[nama]` di `public/bnpb/perencanaan.js:10`) terdeteksi lewat literal di objek itu.
- Tes (`tests/**`) tidak dihitung sebagai konsumen. Tabel D1 hasil sumber luar di luar delapan baris manual (`hujan_*`, `sihka_*`) belum dilacak sampai layar.
- Usulan hanya membaca/menyilangkan keluaran yang sudah ada; tidak ada model prediksi baru. Hotspot dan luas: hanya dari sistem sendiri, bukan Koordalops.
