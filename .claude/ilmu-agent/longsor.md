# Ilmu longsor

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/longsor.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca longsor`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus longsor "..."`.

## Peta berkas & tabel

Semua di `scripts/longsor/` (stdlib kecuali `lab_*`), keluaran `public/longsor/data/`, uji `tests/longsor/longsor.test.mjs`.

| Berkas | Isi |
| ------ | --- |
| `dasar.py` | jalur, `daftar_kec()` (7.270 kec, urutan id tetap `prov|kab|kec`), `Cari` titik->kec, `titik_sampel`, `sel_hujan` (sel 0,5 derajat). `ambil/simpan` dipakai ulang dari `scripts/banjir/umum.py` lewat importlib. JANGAN dinamai `umum.py` (bentrok modul banjir). |
| `rumus.py` | rumus murni + `uji()`: tekstur USDA -> HSG -> CN -> Q, skor lereng/tanah/sesar, kerentanan S, P95, `jumlah7`, `bahaya`, `auc`, `pod_far` |
| `kejadian.py` | #19: GLC (salinan ArcGIS, Indonesia) + DIBI longsor 2015-kini -> `kejadian.json` (statis.yml) |
| `lab_tanah.py` | #18, lab sekali (numpy+rasterio di venv): SoilGrids WCS pasir/liat 5-15 cm -> `tanah.json` |
| `lab_lereng.py` | lab sekali: DEM Terrarium z10 -> lereng p75 per kec + jarak sesar -> `data/raw/longsor/fitur_statis.json` (gitignored) |
| `hujan_riwayat.py` | lab bertahap: Open-Meteo Archive harian 2017-kini per sel 0,5 derajat -> `data/raw/longsor/hujan.json` (gitignored, BERLANJUT) |
| `model.py` | `kerentanan` (-> `kerentanan.json`), `uji` (-> `uji_balik.json`), `harian` (-> `nowcast.json`, cocok dirantai data.yml setelah hujan banjir), `diri` |

Keluaran: `kejadian.json` 230 KB, `tanah.json` 320 KB, `kerentanan.json` 460 KB, `uji_balik.json` 1 KB, `nowcast.json` ~ <50 KB (bergulir, tetap).
Indeks kec di `nowcast.json` = urutan `kec` di `kerentanan.json`.

## Aturan & invarian

- Bobot S (0,6 lereng, 0,2 tanah, 0,2 sesar) dan ambang kelas TETAP, tidak dilatih pada label. Mengubahnya setelah melihat hasil uji = bocor; naikkan versi dan tulis di Kasus.
- P95 hujan 7 hari dari tahun latih 2017-2021 saat uji; `kerentanan.json` memakai seluruh riwayat (untuk produksi).
- Uji: sasaran kab-hari DIBI "Tanah Longsor"+"Gerakan Tanah" (gab=0), tahun 2022, 2023, 2025. 2024 dibuang (DIBI 2024 tidak lengkap, 221 baris).
- Vonis LOLOS hanya jika AUC model >= pembanding terbaik + 0,02, AUC >= 0,60, dan POD > POD hujan-saja pada laju peringatan sama. Gerbang node mengecek konsistensi vonis dengan angka.
- Nowcast memakai `a7` (hujan 7 hari teramati H-7..H-1) dari `public/banjir/data/hujan.json` (Open-Meteo forecast) dibanding P95 ERA5: dua model hujan berbeda, t bukan ukuran pasti.

## Ranjau yang pernah meledak

- data.nasa.gov Socrata `dd9e-wu2v` mati (404/500) dan `maps.nccs.nasa.gov` tak terpecahkan DNS-nya: GLC diambil dari salinan ArcGIS Online (`services1.arcgis.com/yFGHRCyBneULM8ci`), skema kolom beda antar-salinan (`country_na` vs `ctry_name`). GLC berhenti 2021, Indonesia 431 titik, hanya 2017-2018 beririsan dengan hujan riwayat.
- SoilGrids VRT lewat `/vsicurl` gagal ("Cannot read 5941912 bytes"); REST 5 panggilan/menit. Yang jalan: WCS `maps.isric.org/mapserv?map=/map/sand.map` per jendela 4 derajat, `SCALESIZE` 200x200 (~30 dtk/jendela).
- Open-Meteo Archive: kuota 5.000 bobot/jam; satu lokasi 2017-kini ~ bobot 23, jadi ~225 sel/jam. Harvest berhenti dengan `KuotaHabis`; jalankan ulang tiap jam sampai 948 sel. Tanpa itu `nowcast.json` melaporkan `tanpa_nilai` besar.
- Tanah Indonesia 95% HSG D (clay loam) di SoilGrids: CN hampir konstan 84, faktor tanah nyaris tak membedakan kec.
- Sesar GEM dibuang bila garis keluar kotak Indonesia (sesar.py), jarak sesar kec dekat batas bisa terlalu jauh.

## Gerbang yang menghakimi

`node --test tests/longsor/longsor.test.mjs`; `python3 scripts/longsor/{dasar,rumus}.py`, `model.py diri`, `kejadian.py uji`, `hujan_riwayat.py uji`, `lab_lereng.py uji` (butuh numpy). Pemeriksa: `validasi-model`.

## Kasus

- 29 Okt 2026, uji balik pertama: GAGAL. AUC model 0,724, hujan-saja 0,704, kerentanan-saja 0,612, klimatologi kab x bulan 0,779 (325 kab, 2.091 kab-hari positif dari 355.875). Klimatologi menang karena beda laju lapor antar-kabupaten; hujan 7 hari ERA5 0,5 derajat terlalu kasar untuk longsor. Jangan "perbaiki" dengan menyetel bobot pada tahun uji.
