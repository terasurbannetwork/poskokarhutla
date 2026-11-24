# RISET: Insiden Kaya

Bahan riset untuk PKH-06 dan PKH-07. Bukan keputusan; keputusan ada di `KEPUTUSAN-INSIDEN.md`. Disusun 24 Nov 2026.
Penanda keyakinan: **[V]** dibaca di berkas sumber, **[D]** diukur pembanding pada data mereka (belum pada data kita), **[K]** fakta kode kita yang dibaca 24 Nov 2026.

## 1. Apa yang kita punya (kode kita)

| Bahan | Fakta | Tanda |
| ----- | ----- | ----- |
| `scripts/data/insiden.py` | ID stabil `<kode prov>-<yymmdd WIB>-<urut>`; satu komponen terhubung (celah ≤ 0,6 km atau tumpang tindih) = satu insiden; yang tertua menang, sisanya `gabung`; status `aktif`, `tak_terdeteksi`, `gabung`; riwayat paling banyak 40 putaran; `SEGAR_JAM = 12` untuk piksel aktif; `PIKSEL_HA` 14,0625 ha; `luas_koreksi` memakai faktor SiPongi per provinsi | [K] |
| Keadaan insiden | `public/data/insiden.json` adalah status bergulir lewat cache `data-` di `titik.yml`, tidak ada di git; deteksi yang dibaca hanya `hotspot24.json` (48 jam) | [K] |
| Arsip deteksi per insiden | **Belum ada.** `public/data/titik_hari/*.json` berisi jumlah per hari, bukan titik. `data/raw/firms/*.csv` hanya lokal, tidak di CI | [K] |
| Sensor | S-NPP berhenti didistribusikan 1 Nov 2026; sesudahnya acuan VIIRS adalah NOAA-20 dan NOAA-21; rasio N20 ke N 0,89 dipakai untuk hitungan setara, tidak diperlukan untuk waktu tiba | [K] |
| `scripts/umum/bangunan.py` | Open Buildings v3, `AMBANG_KEYAKINAN = 0.70`; keluaran grid kasar 0,01 derajat (`grid_<prov>.json`) dan sel halus 1/1000 derajat (110 m) `halus_<prov>.json`; sel di luar poligon dicoba dengan offset pantai | [K] |
| Cakupan grid | Per 24 Nov 2026 di `data/terkunci/bangunan`: `grid_13`, `grid_33`, `grid_63` dan `halus_13` (5,1 MB), `halus_33` (19,7 MB), `halus_63` (3,6 MB), `kec.json`. Artinya Sumatera Barat, Jawa Tengah, Kalimantan Selatan | [K] |
| Tempat hidup grid | `data/terkunci/` ada di `.gitignore`; dibuat di `bangunan.yml` (bulanan: unduh 278 ubin ±12,7 GB, matriks per pulau; harian: grid dari cache, hitung ulang `terpapar.json`), diunggah ke R2 | [K] |
| `scripts/umum/paparan_bangunan.py` | Paparan karhutla 1/3/5 km dari **poligon kompleks** dengan grid kasar 1,1 km (galat kasar ±0,8 km, terlalu kasar untuk 500 m); fungsi `jarak_km`, `di_geom`, `Grid`, `agregasi` dipakai ulang | [K] |
| `scripts/siklus/paparan.py` | Sel halus 110 m (galat ±0,08 km), `GALAT_HALUS_KM = 0.08`, `zona_dari_bagian(daftar, ..., radius_km)`, tanpa koordinat bangunan tunggal di keluaran, tak pernah ke `public/`; `assert K.AMBANG_BANGUNAN == BG.AMBANG_KEYAKINAN` | [K] |
| Layar | Pop-up insiden dan "laci cluster" ada di `public/index.html` dan `public/riwayat_sel.js` (laci "Tren lokasi dan prakiraan" yang membaca `riwayat_sel/<tx>_<ty>.json`); titik pasang pasti ditetapkan di IK-00 | [K] |

Kesimpulan teknis: mesin Open Buildings dan geometri sudah ada dan cukup; yang kurang adalah **arsip deteksi per insiden** dan pelacak progresi itu sendiri.

## 2. Rujukan pembanding: `progression.py` dan `fire-progression.md` (MIT)

Sumber: `pipeline/src/haze/progression.py` (401 baris) dan `docs/research/fire-progression.md`, repo `pantaukarhutla/pantau-karhutla`, lisensi MIT. [V]

Metode yang diambil:

1. **Epoch pengamatan.** Setiap deteksi dalam ±1° dari kotak insiden menandai satu lintasan; lintasan berjarak < 1,5 jam digabung (S-NPP dan NOAA-20 berselisih ±50 menit). [V]
2. **Waktu tiba per sel 375 m** = deteksi pertama dikurangi setengah jeda ke epoch sebelumnya (jeda tanpa epoch sebelumnya atau ≤ 0 dianggap 12 jam, batas atas 24 jam). Deteksi ulang sesudahnya dianggap bara, bukan penjalaran. [V]
3. **Permukaan waktu tiba**: sel di dalam jejak (deteksi yang didilasi lalu ditutup 2 iterasi) diisi median waktu tiba 5 sel terdeteksi terdekat; sel terdeteksi tidak boleh lebih lambat dari deteksinya. [V]
4. **Garis depan** pukul 14.00 WIB tiap hari (07.00 UTC), sesudah lintasan siang; langkah yang maju kurang dari satu sel disebut "unresolved", bukan nol. [V]
5. **Laju** = persentil 90 jarak kemajuan sel baru dari area yang sudah tercapai (transformasi jarak); sel baru > 2 km dari garis sebelumnya dikeluarkan dari laju dan dicatat sebagai lompatan. [V]
6. **Lompatan**: per hari, sel pertama-terdeteksi terjauh yang berjarak 2 sampai 10 km dari semua sel yang tercapai sebelumnya; arah geometri asal ke tujuan, tanpa klaim angin. [V]
7. **Titik awal**: deteksi paling awal (dalam 1 jam dari yang pertama), rata-rata berbobot FRP, dikurangi setengah jeda; `started_earlier` bila ≥ 5 sel saat pertama terlihat. [V]
8. **Peristiwa kunci**: pertumbuhan cepat (z kokoh ≥ 3 dan ≥ 100 ha), lompatan terbesar (5 teratas), macet (≥ 2 langkah tak terukur sementara api masih terdeteksi). Tidak diambil kecuali macet (D17 di KEPUTUSAN).
9. **Dimasukkan hanya yang punya ≥ 20 deteksi** (`MIN_DETECTIONS`). Dibangun ulang bila deteksi berubah atau sudah > 12 jam. [V]

Hasil ukur pembanding pada data mereka (VIIRS, 60 insiden terbesar 2019 dan 2023, 20% sel ditahan, kebanyakan gambut): [D]

| Metode | MAE (jam) | median galat (jam) | dalam ±12 jam | dalam ±24 jam |
| ------ | --------- | ------------------ | ------------- | ------------- |
| Tetangga terdekat | 42,0 | 12,7 | 0,49 | 0,62 |
| Linear Delaunay | 38,4 | 15,7 | 0,43 | 0,61 |
| **Median 5 terdekat** | **34,8** | **11,8** | **0,54** | **0,68** |

Catatan penting dari dokumen itu: waktu tiba gambut bising pada skala 1 sampai 2 hari karena api muncul lagi dari bara; antarmuka tidak boleh menampilkan isokron di bawah harian untuk gambut; angka ±24 jam tidak persis sebanding dengan perimeter independen karena kebenaran uji adalah deteksi yang ditahan.

**Yang tidak diambil dari mereka**: ketergantungan numpy, scipy, pandas, duckdb, `dem.py`, panah, profil elevasi, pembangunan jalur tampilan React. Yang diambil adalah metode dan parameternya; kodenya ditulis ulang di stdlib (D3), dengan pemberitahuan lisensi MIT dalam kepala `progresi.py` dan di halaman metodologi.

## 3. Rujukan pembanding: bangunan dekat api

- Mereka memakai bangunan **OSM** dalam 500 m dari petak 375 m. [V dari RISET pembanding]
- Kita memakai Open Buildings v3 ≥ 0,70 yang lebih lengkap di Kalimantan dan Papua; di Jawa OSM relatif padat. Keduanya tidak boleh dijumlah.
- Karena grid halus kita 110 m, definisi "dalam 500 m dari pusat petak" bisa ditegakkan dengan galat sekitar ±0,08 km (grid kasar 1,1 km tidak cukup).
- **Temuan penting**: grid bangunan kita baru ada di tiga provinsi dan dua di antaranya (Sumatera Barat, Jawa Tengah) bukan pusat karhutla; yang relevan untuk karhutla adalah Kalimantan Selatan. Provinsi gambut besar belum tercakup. Ini membuat PKH-07 pada hari pertama hanya menjawab sebagian (D13, Q5).

## 4. Temuan yang memengaruhi rancangan

1. **Pencocokan insiden kita lebih ketat daripada kelompok kebakaran pembanding.** Celah 0,6 km memisahkan api yang berjarak 2 sampai 10 km menjadi insiden berbeda, sehingga "lompatan" di dalam satu insiden jarang muncul dan angkanya akan banyak nol bukan karena api tak melompat. Pertanyaan Q4 menanyakan tanda antar-insiden.
2. **Deteksi tidak diarsipkan per insiden.** Tanpa arsip, waktu tiba tidak bisa dihitung untuk api yang sudah berumur lebih dari 48 jam (Q1).
3. **Sensor berganti.** S-NPP berhenti 1 Nov 2026. Uji tahan pada 2019 dan 2023 memakai S-NPP dan NOAA-20; di produksi sesudah 1 Nov hanya NOAA-20 dan NOAA-21 (jeda sama 12 jam bila keduanya digabung, karena keduanya satu bidang orbit berselisih ±50 menit). Uji harus dicatat dengan komposisi sensor.
4. **Satu piksel = 14,0625 ha** padahal yang terbakar di dalamnya jauh lebih kecil (R11 di `insiden.py`). "Luas dijangkau" pada isokron adalah luas sel yang dilalui garis depan, batas atas, **bukan luas terbakar**. Ditulis di `title` kepala tabel.
5. **Waktu lokal lintasan siang.** Lintasan siang VIIRS ±13.30 waktu matahari lokal. Garis 14.00 WIB jatuh sebelum lintasan di Aceh bagian barat (95°E: ±14.10 WIB) dan jauh sesudahnya di Papua (141°E: sekitar 16.24 waktu matahari). Karena waktu tiba sudah dikurangi setengah jeda, sel yang terlihat saat lintasan itu tetap masuk garis hari itu pada wilayah timur dan jatuh ke garis hari berikutnya di ujung barat; efeknya satu lintasan, dicatat sebagai keterbatasan, bukan dikoreksi (ALGORITMA §3).
6. **Pembulatan privasi.** Jumlah bangunan kecil di dekat api yang titiknya publik bisa menunjuk satu rumah; selisih antarhari bisa membuka sel (KEAMANAN-PRIVASI §3).

## 5. Sumber

- Repo MIT: https://github.com/pantaukarhutla/pantau-karhutla (`progression.py`, `docs/research/fire-progression.md`).
- Chen dkk. 2022 dan Indradjad dkk. 2024 (FEDS/fireatlas), sebagai latar pelacakan kejadian yang sudah dikutip `insiden.py`.
- Veraverbeke dkk. 2014 dan Parks 2014 (interpolasi waktu tiba), dikutip dokumen pembanding.
- Sirko dkk. 2021, Google Open Buildings v3, CC BY 4.0.
- Schroeder dkk. 2014 (piksel VIIRS I-band 375 m), dikutip `insiden.py`.
