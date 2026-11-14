# DESAIN-TEKNIS: Peluang Semai Awan dan Prakiraan Asap

## 1. Berkas

Tidak ada folder baru di `public/` atau `scripts/`; semua berkas masuk folder modul yang sudah ada (gerbang paket modul tetap hijau,
seksi ini tetap tercantum di AGENTS §2.14).

| Berkas | Isi | Pemilik |
| ------ | --- | ------- |
| `scripts/operasi/semai_ifs.py` | ambil `.index` dan rentang byte ECMWF 0,1 derajat, urai dengan `eccodes`, potong ke wilayah, simpan `data/raw/semai/<putaran>/<langkah>.npz` (float16, tidak di-commit) | `pipa-data` |
| `scripts/operasi/semai.py` | turunan, gerbang, faktor, skor, zona, sel kandidat, PNG awan; menulis `semai.json`; subperintah `uji` luring tanpa eccodes | `pipa-data` |
| `scripts/operasi/semai_murni.py` | fungsi murni tanpa I/O (LCL, level beku, w ke m/s, ramp, skor, NMS zona, jendela 85%, DMS, pembulatan mitra, ringkasan teks); dipakai `semai.py` dan uji | `pipa-data` |
| `scripts/operasi/semai_bobot.json` | semua ambang dan bobot ALGORITMA, berlabel `"status": "HIPOTESIS"`, ber-`versi` | `pipa-data` |
| `scripts/operasi/semai_beku.py` | salin `semai.json` ke arsip R2 append-only; menolak menimpa | `pipa-data` |
| `scripts/operasi/fixture_semai.json` | potongan nyata satu putaran (2 x 2 derajat sekitar Palangkaraya dan Kendari) untuk `uji`; berkas, bukan folder baru | `pipa-data` |
| `scripts/operasi/semai_nilai.py` | uji prospektif (ALGORITMA §12), GSMaP atau IMERG, `omc_sortie`; menulis `semai_rapor.json` | `pipa-data` → `validasi-model` |
| `scripts/udara/lintasan.py` | diperkaya: angin IFS bila ada, pelepasan 3 per jam 15 menit 24 jam, bobot FRP, beban per jam, lintas batas 5% | `cuaca-udara` |
| `scripts/udara/data/kota_tetangga.json` | kota >= 15.000 jiwa di MY SG BN TL PNG dari GeoNames cities15000 (CC BY 4.0), sekali bangun | `cuaca-udara` |
| `.github/workflows/semai.yml` | jadwal 10.00 dan 22.00 UTC; `pip install eccodes numpy`; jalan `semai_ifs` → `semai` → `lintasan` (mode semai) → `semai_beku` → `semai_nilai`; unggah ke R2 `poskokarhutla-foto/operasi/semai/` (pola `bangunan.yml`); commit hanya `public/data/operasi/semai_rapor.json` | `mekanik-mesin` |
| `scripts/terbit/jaga_jadwal.mjs` | tambah `{wf: "semai.yml", maks: 770}` (menit, sama dengan `udara.yml`) | `mekanik-mesin` |
| `src/operasi_semai.js` | rute baca berkas R2 dan rute target (§5) | `warga-api` |
| `migrations/0129_semai_target.sql` | tabel `op_semai_target` (§4); nomor diperiksa ulang saat tiket | `warga-api` |
| `public/operasi_semai.js` | seksi `#semai`: lapisan peta, bilah jam, kolom kanan, peran, Tinjau, ringkasan | `layar-peta` |
| `public/operasi_semai_murni.js` | port JS fungsi skor, zona, DMS, pembulatan, ringkasan (diuji silang lawan Python) | `layar-peta` |
| `public/operasi_semai.css` | gaya `.sm-*` | `layar-peta` |
| `tests/operasi/semai*.test.mjs` | uji murni JS, uji silang Python lawan JS, uji rute | `penulis-gerbang` |

`numpy` dan `eccodes` hanya di `semai.yml` (Q1). `semai.py uji` dan `semai_murni.py` stdlib murni.

## 2. Ambil data ECMWF

```
dasar = https://data.ecmwf.int/forecasts/{YYYYMMDD}/{HH}z/ifs/0p1/oper/{YYYYMMDDHH}0000-{step}h-oper-fc
{dasar}-sfc.index, {dasar}-sfc.grib2, {dasar}-pl.index, {dasar}-pl.grib2
```

- Baris `.index` = JSON per baris: `param`, `levelist` (pl), `_offset`, `_length` (terverifikasi 14 Nov 2026).
- Field `sfc`: `lcc, mucape, tclw, tp, 10u, 10v, 2t, 2d` (8). Field `pl`: `u, v` di 850, 700, 200 (6); `r` 850 (1); `t, gh` di
  1000, 925, 850, 700, 600, 500 (12); `w` 850, 700 (2) = 21. Total 29 field x 13 langkah (0 sampai 36) = 377 permintaan rentang,
  sekitar 840 MB (terukur SA-01: 64,6 MB per langkah). `tp` disimpan dalam mm; `r` 850 hPa bisa sampai sekitar 105% dan dipangkas ke 100.
- Permintaan rentang berurutan per berkas, digabung bila berdekatan; coba ulang 3 kali dengan jeda; 6 unduhan paralel paling banyak.
- Putaran dipilih: putaran 00 atau 12 terbaru yang `.index` langkah 36-nya sudah ada; bila belum, putaran sebelumnya. Jam terbit
  terverifikasi 14 Nov 2026: putaran 00z 0,1 derajat lengkap 09.34 UTC (0,25 derajat 07.34 UTC), jadi jadwal 10.00 dan 22.00 UTC.
- Grid global 0,1 derajat (3600 x 1801, lintang 90 ke -90, bujur -180 ke 179,9) dipotong ke 94..142, -12..7.
- Cadangan (Q1 ditolak atau ECMWF gagal 2 putaran): GFS 0,25 derajat NOMADS filter (`filter_gfs_0p25.pl`, subset wilayah dan
  variabel di server), berlabel "GFS 0,25° cadangan".

## 3. Keluaran R2 `operasi/semai/semai.json`

```json
{
  "dibuat": "2026-11-14T10:14:00Z", "versi_bobot": "1", "mode": "bawaan",
  "putaran": {"model": "ECMWF IFS", "res": 0.1, "init": "2026-11-14T00:00:00Z", "lisensi": "CC BY 4.0"},
  "sumber": {"firms": {"piksel": 1564, "satelit": ["SNPP", "NOAA20"], "hilang": ["NOAA21"], "jam": "2026-11-14T08:34Z"}},
  "langkah": [12,15,18,21,24,27,30,33,36],
  "raster": {"awan": "semai_awan_{l}.png", "asap": "semai_asap_{l}.png", "bbox": [94,-12,142,7]},
  "angin": {"step": 1.0, "u": [[...]], "v": [[...]]},
  "alasan_kosong": null,
  "zona": [{"id": "2026111400-A", "huruf": "A", "lat": -1.4, "lon": 115.3, "skor": 0.74, "langkah": 30,
            "jendela": ["2026-11-15T06:00Z", "2026-11-15T09:00Z"], "zona_waktu": "WIB",
            "prov_kode": "62", "prov": "Kalimantan Tengah", "kota": "Palangka Raya", "hujan": {"lat": -1.4, "lon": 115.35, "tau_menit": 30},
            "Q": 0.566, "D": 0.890, "T": 1.0, "Q_nimbus": 0.608, "skor_nimbus": 0.78,
            "komp": {"cape": 0.53, "air": 0.36, "rh": 1, "geser": 0.54, "naik": 0.4},
            "masukan": {"lcc": 0.94, "mucape": 2300, "tclw": 0.14, "geser": 5.8, "rh850": 98, "tdasar": 22.1, "hangat_m": 3900, "w": 0.4,
                        "angin_dari": "E", "angin_kmj": 13, "geser_km": 6, "frp_25km": 442},
            "cluster": "K0001", "base": {"id": "PKY", "nama": "Tjilik Riwut", "km": 176, "menit": 35},
            "tanda": ["awan_teramati"], "mitra": {"lat": -4.5, "lon": 122.0}}],
  "kandidat_kolom": ["lat","lon","langkah","Q","D","T","cape","air","rh","geser","naik"],
  "kandidat": [[-1.4, 115.3, 30, 0.566, 0.890, 1.0, 0.53, 0.36, 1, 0.54, 0.4], "... sampai 400"],
  "cluster": [{"id": "K0001", "lat": -1.5, "lon": 115.4, "prov_kode": "62", "prov": "Kalimantan Tengah", "kota": "Palangka Raya", "piksel": 15, "frp24": 336, "akhir": "...", "zona": "A"}],
  "asap": {"lintas": {"negara": "TL", "jam": "2026-11-15T09:00Z", "kota": "Dili", "cluster": "k-13"},
           "kota": [{"nama": "Parepare", "negara": "ID", "tiba_jam": 3, "tingkat": "tinggi"}]},
  "nimbus": {"zona": [...]}
}
```

- `kandidat` = larik kolom tetap (tanpa kunci per baris) supaya < 60 KB. Kepala kolom ditulis di `kandidat_kolom`.
- `nimbus` = zona hasil mode "seperti Nimbus" untuk Tinjau BMKG (dihitung di Python juga, supaya uji silang).
- Batas ukuran `semai.json` 300 KB; PNG per langkah < 120 KB (palet 4 warna, deflate `zlib` stdlib, ditulis dengan `struct`).
- Mitra memakai `mitra` yang dibulatkan di server; ringkasan Mitra dibangun dari blok itu.

Semua berkas prakiraan masuk **R2, bukan git**: `operasi/semai/semai.json`, `operasi/semai/awan_<langkah>.png`,
`operasi/semai/asap_<langkah>.png` (ditimpa tiap putaran, jadi riwayat git tidak membengkak oleh 18 PNG per 12 jam) dan
`operasi/semai/arsip/<YYYYMMDDHH>.json` (salinan `semai.json` tanpa `kandidat`, `angin`, raster; `semai_beku.py` menolak menimpa;
sekitar 40 KB per putaran). Koordinat zona dengan begitu juga di balik sesi (KEAMANAN §3).
`public/data/operasi/semai_rapor.json` (agregat tanpa koordinat, di git): `{dibuat, n, laju_zona, laju_banding, selisih, wilson95,
desil:[...], sortie:{n, dalam_zona, tanpa_jam}}`.

## 4. Skema D1 (`migrations/0129_semai_target.sql`)

```sql
CREATE TABLE IF NOT EXISTS op_semai_target (
  id         TEXT PRIMARY KEY,               -- acak (crypto.randomUUID), bukan zona+base, supaya hapus lunak tidak memblokir isian ulang
  zona_id    TEXT NOT NULL,
  putaran    TEXT NOT NULL,                  -- 2026111400
  base_id    TEXT NOT NULL REFERENCES op_base(id),
  tanggal    TEXT NOT NULL,                  -- tanggal renlap WIB
  lat        REAL NOT NULL CHECK (lat BETWEEN -12 AND 7),
  lon        REAL NOT NULL CHECK (lon BETWEEN 94 AND 142),
  mulai      TEXT NOT NULL, selesai TEXT NOT NULL,
  skor       REAL NOT NULL CHECK (skor BETWEEN 0 AND 1),
  alasan_json TEXT NOT NULL,
  catatan    TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh       TEXT NOT NULL,                  -- id akun, bukan nama
  dibuat     TEXT NOT NULL,
  terhapus   TEXT, alasan_hapus TEXT, dihapus_oleh TEXT
);
CREATE INDEX IF NOT EXISTS op_semai_target_tgl ON op_semai_target(tanggal, base_id);
CREATE UNIQUE INDEX IF NOT EXISTS op_semai_target_unik ON op_semai_target(zona_id, base_id) WHERE terhapus IS NULL;
```

Tabel sendiri, bukan `op_target`: `op_target.jenis` dibatasi `CHECK (jenis IN ('patroli','wb'))` dan `renlapMesin` menghapus
`op_target` tiap renlap dibangkitkan ulang (`src/operasi_udara.js:170`); target semai tidak boleh hilang karena itu.
Hapus lunak dengan alasan (K17 Operasi Udara).

## 5. Rute (`src/operasi_semai.js`, digabung di `src/worker.js`)

| Rute | Hak | Isi |
| ---- | --- | --- |
| `GET /api/operasi/semai/berkas/<nama>` | sama dengan `/api/operasi/peta` | membaca R2 `operasi/semai/<nama>`; nama hanya dari daftar tetap (`semai.json`, `awan_<langkah>.png`, `asap_<langkah>.png`, langkah 0 sampai 36 kelipatan 3); `Cache-Control: private, max-age=600` |
| `POST /api/operasi/semai/target` | Q3: peran `pusdalops`, `tmc`, moderator | badan `{zona_id, putaran, base_id, tanggal, catatan?}`; `putaran` cocok `^\d{10}$` dan sama dengan 10 angka awal `zona_id`; server membaca R2 `operasi/semai/arsip/<putaran>.json` dan mengambil lat, lon, jendela, skor, alasan dari zona itu (klien tidak boleh mengirim koordinat); tolak bila zona tidak ada (404), jendela terbangnya sudah lewat (400), tanggal di luar hari ini atau besok WIB (400), base tidak ada (400), atau target aktif zona+base yang sama sudah ada (409); batas 30 isian per hari per akun, baris terhapus ikut dihitung (429) |
| `GET /api/operasi/semai/target?tanggal=` | sama dengan `/api/operasi/peta` | daftar target (tanpa `terhapus`) |
| `POST /api/operasi/semai/target/hapus` | Q3 | `{id, alasan}` alasan wajib 5 sampai 300 huruf; hapus lunak |

Layar Renlap Operasi Udara membaca `GET /api/operasi/semai/target` dan menampilkan target OMC di blok base itu dengan pil ungu "OMC,
dari zona semai A"; renlap PDF/KML/GPX ikut memuatnya (tiket SA-09).

## 6. Layar

- Layar mengambil `semai.json` dan raster lewat `GET /api/operasi/semai/berkas/*`, bukan aset statis.
- `public/operasi_semai.js` dimuat malas saat hash `#semai` pertama kali dibuka (klasik, tanpa build), memakai global `peta`
  dari `operasi_peta.js`.
- Sumber dan lapisan MapLibre: `sm-awan` (image source, 4 sudut bbox), `sm-asap` (image), `sm-angin` (GeoJSON garis), `sm-zona`
  (GeoJSON titik + garis titik hujan), `sm-cluster` (Mitra). Ganti langkah = `source.updateImage({url})`.
- Tinjau: `operasi_semai_murni.js` menghitung ulang dari `kandidat` saat bobot berubah; mode Nimbus memakai `nimbus.zona` siap pakai.
- Ringkasan teks dibangun `operasi_semai_murni.js` (`ringkasan(data, peran)`), disalin dengan `navigator.clipboard.writeText`.

## 7. Jadwal dan biaya

- `semai.yml`: `cron: "0 10,22 * * *"`, `concurrency: semai`, batas waktu 30 menit. Perkiraan: unduh 840 MB sekitar 3 sampai 5 menit,
  urai dan hitung sekitar 5 menit, lintasan sekitar 2 menit. Bila langkah 36 putaran terbaru belum ada, pakai putaran sebelumnya dan
  tandai basi (ALGORITMA §10).
- Git hanya menerima `semai_rapor.json` (beberapa KB). R2: sekitar 2 MB ditimpa tiap putaran, arsip sekitar 30 MB per tahun.
- `semai_nilai.py` berjalan di `semai.yml` yang sama (menilai putaran lama yang sudah matang).
- Tidak ada cron Cloudflare baru (gerbang anggaran CF). Tidak ada baca D1 terjadwal; rute target hanya saat diklik.

## 8. Rahasia

- Akun GSMaP NRT (JAXA) atau Earthdata (IMERG): GitHub secret `GSMAP_USER`/`GSMAP_PASS` atau `EARTHDATA_TOKEN`, dibuat pemilik.
  Tanpa rahasia, `semai_nilai.py` keluar bersih dengan peringatan dan rapor "verifikasi hujan belum tersambung".
- FIRMS memakai MAP_KEY yang sudah ada.
