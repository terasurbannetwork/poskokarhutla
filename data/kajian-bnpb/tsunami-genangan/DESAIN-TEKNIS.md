# DESAIN-TEKNIS: Simulasi tsunami dengan genangan darat

Nama berkas di bawah adalah rancangan; berkas belum ada sampai tiketnya dikerjakan. Python 3.12 stdlib untuk skrip yang jalan di CI harian; skrip hitung berat dan bergantung mesin hanya jalan lokal atau di langkah CI khusus (D15). Pemilik wilayah: `gempa` (`public/gempa/**`, `scripts/gempa/**`, `tests/gempa/**`).

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/gempa/tsunami_runup.py` | tarik, saring, dan simpan run-up historis NOAA NCEI | gempa |
| `public/gempa/data/tsunami_runup.json` | run-up historis Indonesia dengan atribusi | gempa |
| `scripts/gempa/tsunami_sumber.py` | padanan Python `layak`, `ukuran`, `rupture`; solusi Okada; segmentasi | gempa |
| `scripts/gempa/tsunami_medan.py` | siapkan DEM, batimetri, kekasaran per kotak pantai | gempa |
| `scripts/gempa/tsunami_hitung.py` | pembungkus mesin hitung: tulis masukan, jalankan, baca keluaran, kuantisasi | gempa |
| `scripts/gempa/tsunami_ujibalik.py` | uji balik kelas A dan B, K, kappa, pembanding Abe | gempa |
| `scripts/gempa/tsunami_pustaka.py` | daftar skenario dan pemilih skenario terdekat | gempa |
| `public/gempa/data/tsunami_genangan/indeks.json` | indeks pantai dan skenario | gempa |
| `public/gempa/data/tsunami_genangan/<pantai>/<skenario>.*` | keluaran terkuantisasi per pantai | gempa |
| `public/gempa/data/tsunami_ujibalik.json` | hasil uji balik; label status membaca dari sini | gempa |
| `public/gempa/data/tsunami_prospektif.json` | arsip append-only | gempa |
| `public/gempa/genangan.js` dan `genangan.css` | pembaca keluaran, peta, legenda, angka, batang run-up | gempa |
| `public/gempa/sim.js`, `metode.js`, `tab.js` | pemasangan dan bab Metode | gempa |
| `tests/gempa/tsunami_genangan.test.mjs` | uji bentuk keluaran, label, tanpa kata terlarang, indeks | gempa |
| `tests/gempa/tsunami_okada.test.mjs` | uji murni Okada | gempa |
| `scripts/gempa/uji_js_tsunami.py` | tambah uji kesetaraan Python-JS untuk `layak`, `ukuran`, `rupture` | gempa |
| `.github/workflows/tsunami-genangan.yml` | langkah hitung per gempa (fase 3), hanya diusulkan | mekanik-mesin |
| migrasi D1 dan rute R2 per gempa | tidak ada di fase 1; fase 3 bila Q5 memilih R2 | warga-api |

## 2. Skema keluaran (rancangan)

`indeks.json`:

```json
{
  "dibuat": "2026-12-01T00:00:00Z",
  "versi_model": "genangan-1",
  "status": "hipotesis",
  "mesin": {"nama": "...", "versi": "..."},
  "pantai": {
    "rajegwesi": {"nama": "Banyuwangi sampai Rajegwesi", "kotak": [lonB, latS, lonT, latU], "dem": "demnas", "dem_atribusi": "BIG (DEMNAS)", "resolusi_m": 30}
  },
  "skenario": {
    "sj_m85_a": {"nama": "Megathrust selatan Jawa M 8,5", "m": 8.5, "jenis": "subduksi", "pusat": [lat, lon], "pantai": ["rajegwesi"]}
  }
}
```

Per pantai dan skenario:

```json
{
  "tingkat": "B",
  "kuantisasi_m": 0.05,
  "ambang_tiba_m": 0.2,
  "luas_tergenang_km2": 0.0,
  "luas_darat_kotak_km2": 0.0,
  "d_maks_m": 0.0,
  "tiba_pertama_menit": 0,
  "runup_hitung": [{"lat": 0, "lon": 0, "m": 0}],
  "label": {"tingkat": "B", "status": "hipotesis", "catatan_batas": "..."},
  "sumber": {"okada": {"strike": 0, "dip": 0, "rake": 0, "slip_m": 0, "L_km": 0, "W_km": 0, "atas_km": 0}}
}
```

Nilai di contoh hanyalah penanda bentuk, bukan hasil. Raster kedalaman: satu byte per sel (kelas 0,05 m sampai 8 m; nilai di bawah 0,05 m SENGAJA digabung ke kelas kering dan itu ditulis di legenda dan berkas;  satu nilai khusus untuk "lebih dari 8 m" dan satu untuk "di luar kotak"), dikompres; ukuran dan format akhir (PNG tanpa penghalusan atau biner dengan kompresi) diputuskan di TS-12 dari ukuran nyata. Animasi: bingkai muka air kotak halus pada selang waktu tetap, jumlah dan ukuran menurut Q12.

## 3. Alur data

```
katalog gempa (D1, BMKG/USGS) -> tsunami_sumber (layak, Okada) -> tsunami_hitung (mesin)
                                                                -> kuantisasi -> public/gempa/data/tsunami_genangan/
NOAA NCEI -> tsunami_runup -> tsunami_runup.json -> tsunami_ujibalik -> tsunami_ujibalik.json (label status)
peramban: sim.js + genangan.js membaca indeks, keluaran, runup, ujibalik
```

## 4. Mesin hitung

Pembungkus `tsunami_hitung.py` menyembunyikan mesin di balik satu antarmuka masukan (sumber, grid, kekasaran, durasi) dan keluaran (kedalaman maksimum, waktu tiba, rekaman). Mesin dapat diganti (Q1) tanpa mengubah format keluaran. Versi mesin dan hash masukan ditulis di tiap keluaran. Pemasangan mesin dikunci versinya dan dijalankan di mesin lokal; langkah CI hanya setelah waktu hitung diukur (Q4).

## 5. Sambungan peramban

- `sim.js` tetap memuat `Tsunami.muat()` dan animasi kasar; `genangan.js` ditambahkan sebagai modul terpisah yang dipanggil `sim.js` hanya bila `Tsunami.layak` benar dan indeks memuat skenario terdekat.
- Berkas besar dimuat malas sesudah pantai dipilih; tidak ada pemuatan di awal.
- Tidak ada permintaan jaringan yang membawa koordinat pembaca; pemilihan skenario terdekat dihitung di peramban dari pusat gempa yang sudah ada.
- Tidak ada cache kunci baru; berkas statis melewati aturan cache aset yang ada.

## 6. ADR

| ADR | Putusan | Alasan |
| --- | --- | --- |
| A1 | Hitung di luar peramban | D1 |
| A2 | Keluaran terkuantisasi, bukan float penuh | ukuran berkas dan jejak yang bisa dibaca peramban |
| A3 | Satu antarmuka mesin | mesin bisa diganti saat Q1 berubah |
| A4 | Label status membaca dari `tsunami_ujibalik.json`, bukan dikodekan di layar | label tidak boleh naik sendiri ke "teruji" |
| A5 | Layar baru dipasang lewat modul sendiri, tidak menambah ukuran `sim.js` | `sim.js` sudah 55 KB |
