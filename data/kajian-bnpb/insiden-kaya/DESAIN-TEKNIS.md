# DESAIN-TEKNIS: Insiden Kaya

## 1. Berkas dan pemilik

| Berkas | Isi | Pengerja |
| ------ | --- | -------- |
| `scripts/data/progresi.py` (baru) | arsip deteksi per insiden, waktu tiba, isokron, laju, lompatan, titik awal; `--uji` self-check; kepala memuat pemberitahuan lisensi MIT pembanding | `pipa-data` |
| `scripts/data/insiden.py` | tidak diubah perilakunya; hanya memberi daftar insiden (`insiden.json`) | `pipa-data` |
| `scripts/umum/paparan_insiden.py` (baru) | bangunan dalam 500 m dari petak, memakai ulang `Grid`, `jarak_km` dari `paparan_bangunan.py` dan konstanta dari `bangunan.py`; `--uji` | `pipa-umum` |
| `scripts/umum/bangunan.py`, `paparan_bangunan.py` | dipakai ulang; tidak diubah kecuali IK-08 (grid provinsi) | `pipa-umum` |
| `public/data/progresi/<id>.json`, `public/data/progresi/indeks.json` | keluaran publik progresi | `pipa-data` |
| `public/data/insiden_bangunan.json` | angka bangunan per insiden, publik, dibulatkan | `pipa-data` (terbit), `pipa-umum` (hitung) |
| `data/terkunci/insiden/bangunan_<id>.json` | rincian sel halus per insiden, tidak terbit, ke R2 awalan `bangunan/` bila perlu staf | `pipa-umum` |
| `.github/workflows/titik.yml`, `bangunan.yml` | langkah baru dan cache arsip | `mekanik-mesin` |
| `public/index.html`, `public/riwayat_sel.js` atau berkas pop-up insiden hasil IK-00 | dua kartu baru | `layar-peta` |
| berkas JS dan CSS kartu baru (nama ditetapkan IK-09, di `public/`, bukan folder baru) | lihat IK-09 | `layar-peta` |
| `tests/insiden/*.test.mjs` dan `scripts/data/progresi.py --uji`, `scripts/umum/paparan_insiden.py --uji` | uji (RENCANA-UJI) | `pipa-data` (folder uji dipasang di roster oleh IK-00) |
| `tests/agen/gerbang-insiden-kaya.test.mjs` | gerbang | `penulis-gerbang` |

Folder baru yang dibuat: `public/data/progresi/`, `data/terkunci/insiden/`, `tests/insiden/`. Tidak ada folder baru di `scripts/`. IK-00 mendaftarkan pemilik tiap jalur di `scripts/agents/roster.json`, lalu `npm run agents:build` (gerbang `gerbang-ilmu-agent`: tiap berkas kode tepat satu pemilik).

Titik pasang pop-up pasti (insiden di `public/index.html` vs laci cluster `public/riwayat_sel.js`) ditetapkan di IK-00 lewat `node scripts/agents/ilmu.mjs pemilik <berkas>`; dokumen ini tidak menebaknya.

## 2. ADR

### ADR-1: stdlib saja (D3)

Pembanding memakai numpy, scipy, pandas, duckdb. Pipeline kita stdlib; `titik.yml` tidak memasang paket. Pilihan:

| Opsi | Biaya | Dipilih |
| ---- | ----- | ------- |
| Tulis ulang di stdlib (kisi dict, BFS) | lambat sedikit, kode lebih panjang | ya |
| `pip install numpy scipy` di `titik.yml` | langkah pemasangan tiap 3 jam, ketergantungan baru | tidak, kecuali waktu jalan > 5 menit pada insiden terbesar (diukur di IK-05) |

Tolok ukur dimasukkan ke `--uji`: insiden sintetis 20.000 petak harus selesai < 60 detik di runner.

### ADR-2: arsip deteksi per insiden (F-1, Q1)

`hotspot24.json` hanya 48 jam; progresi butuh seluruh riwayat sejak awal api. Arsip: berkas JSON per insiden berisi petak unik `[iy, ix, t_pertama_menit, frp, sensor]` dan daftar epoch (jam dibulatkan 30 menit) di sekitarnya. Hidup di cache `data-` yang sama dengan `insiden.json` (tidak di-commit, tidak terbit); hilang atau rusak = mulai ulang tanpa crash dan insiden tampil "dihitung sejak <tanggal>". Dipangkas bersama insiden (`SIMPAN_HARI`).

Ukuran: 20.000 petak × ±30 B = ±600 KB per insiden terbesar; total ditutup 40 MB (kelebihan: arsip insiden `tak_terdeteksi` dipangkas dulu).

Epoch: tidak semua deteksi di sekitar insiden diarsipkan; hanya waktu unik dibulatkan 30 menit dari deteksi VIIRS dan MODIS dalam ±1° kotak insiden pada tiap putaran.

### ADR-3: tempat hitung bangunan (Q7)

| Opsi | Kelebihan | Kekurangan |
| ---- | --------- | ---------- |
| `bangunan.yml` harian membaca daftar petak dari data terbit | grid sudah ada di sana, tidak menahan `titik.yml` | angka bangunan berumur ≤ 1 hari |
| `titik.yml` tiap 3 jam | angka segar | harus menarik `halus_<prov>.json` (3,6 sampai 19,7 MB per provinsi, 12,7 GB sumber) dari R2 tiap putaran |

Bawaan [SEMENTARA]: opsi pertama. `progresi.py` menulis `public/data/progresi/petak/<id>.json` ringkas (petak segar dan petak keseluruhan dalam format larik sel), `paparan_insiden.py` membacanya di `bangunan.yml` lalu menulis `insiden_bangunan.json`. Karena `bangunan.yml` tidak commit dan tidak terbit (grup concurrency sendiri), IK-07 menentukan jalur terbit: menyerahkan `insiden_bangunan.json` ke langkah terbit yang sudah ada (`data.yml` atau `terbit.yml`), tanpa membuat workflow commit baru.

Catatan: berkas `petak/<id>.json` memuat koordinat sel api (titik panas yang sudah publik), bukan bangunan; boleh terbit atau tetap di cache sesuai jalur IK-07.

### ADR-4: modul lisensi MIT

Kepala `progresi.py` memuat: sumber metode, repo, tahun, lisensi MIT, dan teks pemberitahuan hak cipta penuh. Halaman metodologi memuat satu kalimat rujukan. Tidak ada kode yang disalin harfiah; metode diterjemahkan ke stdlib. Pemeriksa (`higiene-repo`) memastikan pemberitahuan ada.

## 3. Kunci JSON

### 3.1 `public/data/progresi/<id>.json`

```json
{
  "versi": 1,
  "id": "62-261012-001",
  "dibuat": "2026-11-24T13:10:00+07:00",
  "tersedia": true,
  "alasan": null,
  "hitung_sejak": "2026-11-20T08:00:00+07:00",
  "petak_unik": 412,
  "metode": {
    "sel_m": 375, "garis_depan": "14.00 WIB", "waktu_tiba": "deteksi pertama dikurangi setengah jeda lintasan",
    "isi": "median 5 sel terdeteksi terdekat", "uji": {"vonis": "belum|lulus|gagal", "mae_jam": null, "dalam24": null, "berkas": "tests/insiden/hasil_uji.json"},
    "luas_catatan": "luas dijangkau = sel yang dilalui garis depan, batas atas luas terbakar"
  },
  "titik_awal": {"t": "...", "t_paling_awal": "...", "t_paling_akhir": "...", "galat_jam": 6.0, "lat": -2.1234, "lon": 113.4567, "radius_m": 450, "mulai_lebih_awal": false, "sel_saat_pertama": 3},
  "isokron": [{"k": 0, "t": "2026-11-21T07:00:00Z", "luas_ha": 120, "baru_ha": 120, "geometri": {"type": "MultiLineString", "coordinates": []}}],
  "laju": [{"k": 1, "t": "...", "median_km": 0.4, "p90_km": 0.9, "terukur": true}],
  "lompatan": [{"t": "...", "lat": -2.2, "lon": 113.5, "jarak_km": 4.2, "dari": [-2.18, 113.48], "arah_deg": 72}],
  "seri": [{"t": "...", "luas_ha": 120, "baru_ha": 120}]
}
```

Aturan kunci:
- Kunci Indonesia; tidak memakai kunci `lat`/`lon` untuk bangunan di berkas ini (hanya untuk petak api, titik awal, lompatan).
- `laju[].p90_km` bernilai `null` dan `terukur:false` bila di bawah satu sel; tidak pernah 0.
- Ukuran ≤ 150 KB per berkas; geometri disederhanakan ≤ 0,0004 derajat, koordinat 4 desimal; isokron ≤ 30 langkah terbaru.
- `tersedia:false` + `alasan` ("terlalu kecil untuk dilacak", "arsip kurang dari 2 hari") bila tak dihitung.

### 3.2 `public/data/progresi/indeks.json`

```json
{"dibuat": "...", "insiden": {"62-261012-001": {"tersedia": true, "langkah": 6, "laju_p90_km_per_hari": 0.9, "terukur": true, "lompatan": 1, "vonis": "belum"}}, "gabung": {"62-261010-003": "62-261008-001"}}
```
Untuk daftar dan ringkasan di peta tanpa memuat tiap berkas.

### 3.3 `public/data/insiden_bangunan.json`

```json
{
  "dibuat": "...", "sumber": "Google Open Buildings v3 (Sirko dkk. 2021)", "lisensi": "CC BY 4.0", "ambang_keyakinan": 0.7, "radius_m": 500,
  "definisi": "bangunan terdeteksi dalam 500 m dari pusat petak api 375 m; satu bangunan dihitung sekali per insiden",
  "galat_posisi_km": 0.08, "cakupan_provinsi": ["13", "33", "63"],
  "insiden": {"63-261015-002": {"terliput": true, "kumulatif": 85, "kini": 40, "luas_atap_m2": 12400, "tampil": {"kumulatif": "sekitar 85", "kini": "sekitar 40"}, "hitung_utc": "..."},
              "62-261012-001": {"terliput": false, "kumulatif": null, "kini": null, "luas_atap_m2": null, "alasan": "grid bangunan provinsi ini belum dibuat"}}
}
```
`kumulatif` dan `kini` sudah dibulatkan (Q6); nilai mentah hanya di rincian terkunci. Tanpa kunci `sel`, `kec`, `desa`, `lat`, `lon`.

### 3.4 `data/terkunci/insiden/bangunan_<id>.json` (tidak terbit)

`{"id", "dibuat", "sel_halus": [[i, j, n, luas]], "petak": n, "provinsi": "63"}`. Dipakai pemeriksaan manual (IK-07) dan, bila pemilik meminta, tampilan staf (di luar paket ini).

## 4. Alur kerja (workflow)

- `titik.yml`: tambahkan langkah `python3 -I scripts/data/progresi.py` sesudah `insiden.py` dengan pola yang sama (`|| echo "::warning title=progresi::..."`), cache arsip ikut kunci `data-`. Terbit lewat jalur `public/data/progresi/` seperti `insiden`-turunan (IK-05 menetapkan apakah ikut commit `terbit.yml` atau hanya cache + layar membaca langsung; berkas besar ≤ 150 KB × 120 insiden ≈ 18 MB tidak boleh ikut commit tiap 3 jam, jadi default: hanya insiden aktif 14 hari terakhir dan di bawah 8 MB total).
- `bangunan.yml` (harian): langkah `python3 -I scripts/umum/paparan_insiden.py` sesudah `paparan_bangunan.py`.
- Ambang peringatan Actions: bila jumlah insiden > 120 yang punya progresi, tulis `::notice` dan batasi 120 insiden terbesar (pembanding `top = 120`).

## 5. Rute Worker

Tidak ada rute baru. Berkas dibaca statis dari `public/data/`. Rincian terkunci tidak dilayani Worker (D14).

## 6. Kinerja

- Pop-up: satu `fetch` per insiden, tidak ada pemuatan awal; gzip dari Cloudflare.
- Putaran 3 jam: waktu jalan `progresi.py` dicatat per putaran; target < 3 menit untuk 120 insiden.
- Peta: satu sumber GeoJSON per insiden terbuka, dibuang saat pop-up ditutup.

## 7. Kompatibilitas

- Insiden lama tanpa arsip tetap tampil seperti sekarang; dua kartu baru tidak muncul (atau muncul "belum tersedia").
- Pembuangan: menghapus `public/data/progresi/` dan dua langkah workflow mengembalikan keadaan lama tanpa migrasi.
