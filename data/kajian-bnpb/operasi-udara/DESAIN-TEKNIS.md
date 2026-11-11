# DESAIN-TEKNIS: Pantauan Operasi Udara

## 1. Berkas dan pemilik

| Berkas | Isi | Pengerja |
| ------ | --- | -------- |
| `public/operasi_laporan.js` | kartu laporan, rumus murni layar (alasan, batas terang, kepatuhan) | `layar-peta` |
| `public/operasi_peta.js` | `OpsUdara`: muat data, `kelayakan`, foto armada | `layar-peta` |
| `public/operasi_peta.css` | gaya `#opsLaporan` | `layar-peta` |
| `src/operasi_udara.js` | rute `/api/operasi/*`, `catatOperasi` | `warga-api` |
| `src/operasi_hasil.js` | penilaian padam, api muncul lagi | `warga-api` |
| `migrations/0125_operasi_udara_pantau.sql` | kolom baru (§3) | `warga-api` → `migrasi-idempoten` |
| `scripts/wa/renlap_jam.mjs` | unggah PDF renlap sesudah dibuat | `wa-bot` |
| `scripts/operasi/prakiraan_base.py` | prakiraan per jam per base → `public/data/operasi/prakiraan_base.json` | `pipa-data` |
| `tests/warga/operasi_udara.test.mjs`, `tests/warga/operasi_monitor.test.mjs` | uji rute dan hasil | `warga-api` |
| `tests/operasi/*.test.mjs` | uji fungsi murni layar (pemilik folder menurut `ilmu.mjs`: `pipa-data`; `layar-peta` menulis, pemilik folder memeriksa) | `layar-peta` |

Tidak ada folder baru di `public/` atau `scripts/` selain berkas di atas.

## 2. Rute

| Rute | Hak | Masukan | Keluaran | Tiket |
| ---- | --- | ------- | -------- | ----- |
| `POST /api/operasi/renlap/pdf` | Mesin (`Bearer WA_MESIN`, pola `src/jarak_pandang.js`) | query `tanggal`, `versi` (pagi/malam), `base` (id op_base atau `SEMUA`); badan PDF mentah ≤ 15 MB | `{ok, kunci}` | UD-01 |
| `GET /api/operasi/renlap/pdf` | Baca (`/api/operasi/peta`) | `tanggal`, `versi`, `base` | PDF, `attachment`, `private, no-store`, `x-content-type-options: nosniff` | UD-01 |
| `GET /api/operasi/renlap/pdf/daftar` | Baca | `tanggal` | `[{versi, base, ukuran, diunggah}]` dari `MEDIA.list({prefix})` | UD-01 |
| `GET /api/operasi/peta` (ubah) | Baca | – | tambah `armada[].pertama` dari `op_lapor_pertama` (NULL bila tabel/baris belum ada) | UD-02 |
| `GET /api/operasi/status7` | Baca | `dari`, `sampai` (≤ 7 hari) | `{registrasi: [{tanggal, status}]}` 7 hari, satu kueri | UD-03 |
| `GET /api/operasi/monitor` (ubah) | Baca | – | `aksi[].muncul_lagi`, `aksi[].muncul_lagi_utc`, `aksi[].kab` | UD-06, UD-08 |

Batas laju: rute unggah mesin memakai batas yang sama dengan `POST /api/jarak-pandang`. Semua rute baca membatasi rentang ≤ 31 hari.

## 3. Skema D1 (migrasi 0125, tabel samping, idempoten)

`ALTER TABLE ADD COLUMN` tidak idempoten di D1, dan kode yang membaca kolom baru melempar `no such column` bila tayang sebelum migrasi
diterapkan di produksi. Jadi pola 0106 dipakai: **tabel samping** `CREATE TABLE IF NOT EXISTS`. Kode yang membacanya sudah aman lewat
`tanpaTabel()` (menangkap `no such table: op_`), sehingga urutan tayang dan migrasi tidak saling menunggu.

```sql
-- F-1: jam laporan PALING AWAL per pesawat per tanggal (bukan yang diproses pertama)
CREATE TABLE IF NOT EXISTS op_lapor_pertama (
  tanggal TEXT NOT NULL, registrasi TEXT NOT NULL, pertama INTEGER NOT NULL,   -- ms UTC jam terima pesan WA
  PRIMARY KEY (tanggal, registrasi));
-- catatOperasi: INSERT ... ON CONFLICT (tanggal, registrasi) DO UPDATE SET pertama = min(op_lapor_pertama.pertama, excluded.pertama)
-- min() membuat pemutaran ulang pesan lama (scripts/operasi/isi_ulang_wa.mjs) tetap benar.

-- F-10: api muncul lagi 24-72 jam sesudah aksi yang sudah dinilai padam
CREATE TABLE IF NOT EXISTS op_gerak_muncul (
  gerak_id INTEGER PRIMARY KEY,
  muncul_lagi_utc INTEGER,          -- jam titik FIRMS pertama dalam (t0+24 j, t0+72 j]; NULL = belum/tidak ada
  diperiksa_sampai INTEGER NOT NULL -- jam putaran FIRMS terakhir yang sudah diperiksa; aksi selesai dipantau bila >= t0+72 j
);
```
Baris sebelum migrasi tidak diisi dari `diubah` (yang tertimpa): jam laporan tanggal lama tampil "–".
Produksi: migrasi diterapkan pemilik (memori `ruang-bnpb`). Pemeriksa: `migrasi-idempoten`; cek juga `tests/warga/migrasi_beku.test.mjs`.

## 4. R2

Kunci: `operasi/renlap/<YYYY-MM-DD>/<pagi|malam>/<BASE|SEMUA>.pdf`, metadata `{diunggah, ukuran, sha}`. Disusun server dari nilai tervalidasi.

## 5. Pipeline

- `scripts/wa/renlap_jam.mjs`: `pdfDari()` hanya mengembalikan PDF GABUNGAN; helper baru mencari `Renlap <BASE> <tanggal> <versi>.pdf` di folder yang sama (`path.dirname`). Tiap PDF di-POST ke rute UD-01; gagal = log + kabar pemilik sekali per hari (pola `jarak_pandang_jam.mjs`). Idempoten lewat `state.renlap[kunci + ':unggah:' + base]`. Ukuran PDF bergambar nyata diukur dulu di UD-01 sebelum batas 15 MB dikunci.
- `scripts/operasi/prakiraan_base.py` (UD-09): stdlib, Open-Meteo hourly `visibility, wind_speed_10m, wind_gusts_10m, precipitation` untuk 9 base, 12 jam ke depan; keluaran cuaca (bukan data operasi) di `public/data/operasi/prakiraan_base.json`; dijalankan di workflow `jarak_pandang.yml`.
- `src/operasi_hasil.js` (UD-06): **kueri baru**, terpisah dari penilaian padam yang hanya melihat aksi 48 jam dengan `hasil IS NULL`: aksi `padam` berumur 24–72 jam yang `diperiksa_sampai < t0+72 j`, `ORDER BY jam_utc DESC LIMIT 200`, dicek terhadap putaran FIRMS tersimpan (`titik_terbaru`, 8 putaran). `muncul_lagi_utc` lengket: sekali terisi tidak pernah dikosongkan. Putaran yang terlewat tidak membuat aksi dianggap padam bertahan: hanya aksi dengan `diperiksa_sampai >= t0+72 j` yang masuk persen padam bertahan.
- **UD-05a (data)**: jam deteksi pertama cluster belum tersimpan (FIRMS hanya 8 putaran). Pipeline cluster (`scripts/data/**`, pengerja `pipa-data`) menulis `pertama_utc` per cluster dan mempertahankannya antarputaran; waktu respons (UD-05b) baru dihitung untuk cluster yang lahir sesudah UD-05a tayang.

## 6. Layar

| Tiket | Perubahan |
| ----- | --------- |
| UD-01 | kolom Renlap dan blok Renlap: tombol PDF di samping KML/GPX bila ada di daftar; tombol "PDF semua base" di kanan judul kartu Renlap |
| UD-02 | ubin "telat lapor", label jam laporan di kolom Siap, saklar "Telat lapor" |
| UD-03 | strip 7 hari di kartu armada dan pop-up, saklar "Rusak berulang" |
| UD-04 | kolom alasan di kartu target renlap; kartu Kepatuhan per base dan operator |
| UD-05 | kartu Celah jangkauan dan Respons |
| UD-06 | hasil "muncul lagi" di aksi, linimasa, persen padam bertahan |
| UD-07 | label batas terang di baris base |
| UD-08 | kartu Hasil per kabupaten |
| UD-09 | pita prakiraan 6 jam di baris base, asap rute di blok renlap |
| UD-10 | ADS-B: penanda di luar base dan sinyal hilang di kartu armada |
| UD-11 | operator: hari menganggur |

Fungsi murni layar (batas terang, alasan, kepatuhan, respons, status lapor) ditaruh di `public/operasi_laporan.js` dan diekspor lewat `window.OperasiLaporan` supaya bisa diuji di node.
