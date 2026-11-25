# Metode gunung api

Halaman ini menguraikan metode level, paparan, sebaran abu, lahar, dan rezim letusan gunung api.

## Gunung api: level resmi, letusan, dan kegempaan

Sumber: MAGMA Indonesia PVMBG (tanpa API; halaman HTML publik). Dua jalur:
1. Worker (`src/gunungapi.js`): tiap 30 menit (menit 7, `src/worker.js:1041`) satu permintaan ke `/v1/gunung-api/tingkat-aktivitas`, timeout 8 detik. Hasil ke D1 `gunungapi_level` dan peristiwa ke `gunungapi_ubah` (naik = 1 bila level bertambah). Halaman yang berisi kurang dari 40 gunung ditolak (`MIN_GUNUNG`); tiga putaran gagal (90 menit) menandai data basi.
2. Pipeline (`scripts/gunungapi/magma.py`, `lintas.yml:189` dan `titik.yml:317`): laporan harian per gunung (koordinat, radius rekomendasi dari kalimat "radius N km"), letusan terbaru, dan endpoint JSON bersesi (kegempaan 24 jam, VONA, grafik 90 hari) dengan jeda 1,1 detik. Keluaran `public/banjir/data/gunungapi_status.json`. Level I Normal tidak punya cincin radius. Laporan sebagian hari tidak dibekukan ke `kegempaan.json`.

Pembatas: letusan lama diurai dengan batas tanggal tepat; halaman letusan gagal memakai cakupan (`letusan_cakupan`) sehingga nol hanya ditulis di dalam cakupan.

## Gunung api: paparan, KRB, dan penduduk

`scripts/gunungapi/paparan.py` (`paparan.json`, `paparan_geo.json`) untuk 69 gunung: zona KRB PVMBG (geoportal ESDM, edisi 2018; KRB III, II, I memakai kode 0703, 0702, 0701) didahulukan atas proksi InaRISK dan cincin radius; desa, sekolah, fasilitas kesehatan, dan titik kumpul dari OSM dalam 20 km; penduduk dari WorldPop R2025A 1 km (piksel yang pusatnya di zona, galat tepi sekitar 1 km, per desa dialokasikan ke desa OSM terdekat dalam 3 km); izin tambang WIUP badan usaha; rute evakuasi dari jalan OSM dengan Dijkstra berganda dari titik di luar zona III dan II dan di luar radius rekomendasi ditambah 2 km. Statistik evakuasi dihitung dari desa KRB III dan II saja. Kolom `penduduk_radius` memakai interpolasi `r^2` cincin paparan (grid WorldPop 25 km melebih-lebihkan sampai 760 kali pada radius kecil).

## Gunung api: sebaran abu (skenario, bukan prakiraan letusan)

Berkas: `scripts/gunungapi/abu.py`, kembaran `public/gunungapi/abu_model.js`; `peluang_abu.py`, `uji_abu.py`, `prospektif.py`.

- Skenario: tiap gunung level II atau lebih diandaikan meletus sekarang. Tinggi kolom = tinggi teramati terbaru (letusan MAGMA atau VONA) bila terbit 0 sampai 48 jam sebelum awal skenario; selain itu asumsi per level: II 1.000 m, III 2.000 m, IV 5.000 m (`KOLOM_LEVEL`, `abu.py:70`). Durasi pelepasan 3 jam.
- Adveksi partikel (langkah 15 menit, seed tetap) oleh angin ECMWF IFS 0,25 lapisan tekanan 850 sampai 200 hPa; sebaran vertikal Suzuki (A = 4, k = 5); difusi horizontal `K_h = 1000 m2/s` (asumsi); pengendapan empat kelas butir: 10 um (40 persen, 0,008 m/s), 30 um (30 persen, 0,07), 100 um (20 persen, 0,5), 250 um (10 persen, 1,5) (`KELAS`, `abu.py:69`). Tanpa gerak vertikal angin, pencucian hujan, atau agregasi.
- Ambang penerbangan: `MER = 2500 x (H_km / 2)^(1/0,241) kg/s` (Mastin dkk. 2009); sel kisi 0,1 derajat lolos bila massa sel setara 2 mg/m3 pada tebal awan 2 km (asumsi). Jejak sah bila 5 sel atau lebih lolos; jejak kosong berarti di bawah ambang penerbangan, bukan tidak ada abu. n partikel produksi 5.000. Waktu tiba bandara = jam pertama ada sel lolos (FL350 atau lebih rendah) dalam 25 km bandara.
- Peluang abu (`peluang_abu.py`): ansambel 3 model angin deterministik kali 3 tinggi kolom (0,5x, 1x, 2x) kali 2 durasi (3 dan 6 jam), ditambah 51 anggota ensemble ECMWF untuk level tinggi; bobot sama, tidak dicocokkan ke alat ukur.

Uji balik arah awan terhadap VONA (`uji_abu.py`, jam penilaian 3 ditetapkan sebelum hasil dilihat): hanya 4 dari 29 kejadian punya jejak sah; 25 persen berselisih sudut 45 derajat atau kurang, sama dengan acak 25 persen (p binomial 0,684), pembanding klimatologi 75 persen; periode 2024-04-03 sampai 2026-10-17. Tumpang tindih jangkauan tidak bisa diukur karena VONA tanpa jarak dan arsip VAAC Darwin tidak tersedia. Status: HIPOTESIS. Uji prospektif arah abu (`prospektif.py`) mencatat satu entri per gunung per hari, dinilai VONA pertama di jendela 12 jam; arsip hanya bertambah; entri tanpa VONA beraraah tidak dihitung.

## Gunung api: lahar dan awan panas

`public/gunungapi/sim_lahar.js` (dijalankan di peramban, Web Worker, dan node). Alur: elevasi dari DEM terrarium zoom 12 (sekitar 38 m) lalu isi sink priority-flood, aliran D8, jalur dari kawah, lalu:
- Lahar: LAHARZ; kecepatan Manning dengan `n = 0,06` (asumsi), batas 0,5 sampai 25 m/s; proksimal bawaan null karena lahar hujan tropis mulai di dalam zona proksimal klasik.
- Awan panas: kerucut energi H/L dengan lidah selebar `0,2 x jarak` (`SEBAR_PDC`), kecepatan dibatasi 3 sampai 50 m/s.
Ini ilustrasi bahaya tanpa kalibrasi ke kejadian nyata. Lembah sempit di bawah 80 m tidak terpisah. Uji: `scripts/gunungapi/uji_lahar.mjs` dan `uji_setara.mjs`.

Lapis tanggap (`sim_tanggap.js`): graf jalan berbobot menit, evakuasi dengan kapasitas, peringkat perlakuan (wajib mencoba paket radius kali mulai), masker, bandara. Seluruh kapasitas, biaya, dan persen kendaraan pribadi adalah asumsi yang bisa diganti.

## Gunung api: rezim letusan, uji kegempaan, dan MIROVA

`scripts/gunungapi/arsip_magma.py` mengolah arsip MAGMA (hanya ada di mesin pemilik) menjadi `rezim_letusan.json` tanpa nama pembuat VONA. Cakupan VONA satu arah (0 sampai 30 menit sesudah letusan) dibanding kontrol letusan digeser -37 jam, karena VONA sering terbit. Uji alarm kegempaan (7 dari 107 lawan 36 dari 783) berstatus hipotesis. Kartu peluang letusan 7 hari sengaja tidak dibuat (HIPOTESIS gagal): pada uji balik `uji_peluang` (regresi logistik lawan persistensi; latih sampai 22 Jun 2025, uji 1 Jul 2025 sampai 2 Nov 2026, `arsip_magma.py:123-125`) skill untuk "ada letusan" hanya 0,059 dengan selang 90 persen -0,014 sampai 0,13, dan untuk kolom 1.500 m ke atas -0,02; hasilnya tampil di bab Metode layar (`public/gunungapi/metode.js:34-35`). Uji tren Mann-Kendall dan Theil-Sen atas seri tahunan BNPB ada di `scripts/gunungapi/tren.py`, dan pembanding Merapi 2010 di `scripts/gunungapi/cek_merapi2010.mjs`. MIROVA (`mirova.py`): daya radiatif vulkanik; lisensi nonkomersial dan `izin_olah = "belum"`, jadi hanya tampil dengan atribusi dan tidak menjadi masukan model.
