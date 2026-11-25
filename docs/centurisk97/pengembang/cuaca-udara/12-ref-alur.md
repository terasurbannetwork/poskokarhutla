# Referensi: workflow dan uji

Halaman ini mendaftar workflow GitHub Actions serta uji dan gerbang modul ini.

## Workflow GitHub Actions

| Workflow | Jadwal (UTC) | Fungsi |
| -------- | ------------ | ------ |
| `udara.yml` | `40 6,18 * * *` | Pipeline udara, MOS dan GEOS-CF (boleh gagal), commit `public/udara/data`, terbit ke Cloudflare. Batas 60 menit; grup konkurensi `udara`. |
| `himawari.yml` | `7,37 * * * *` | Titik Himawari, unggah R2, arsip gz, awan tumbuh (boleh gagal). Batas 16 menit. |
| `semai.yml` | `0 10,22 * * *` | Unduh IFS, lintasan asap, zona semai, unggah ke R2, arsip putaran append-only. Batas 30 menit. Penjaga jadwal `scripts/terbit/jaga_jadwal.mjs`. |
| `lintas.yml` | `10 2 * * *` | Rantai harian lintas bencana: berita, MJO (`scripts/cuaca/mjo.py`), dan langkah Cuaca ekstrem yang menjalankan `cuaca.py`, `peluang_cuaca.py`, `bmkg_kab10.py` (`.github/workflows/lintas.yml:136-138`). |
| `arsip-bmkg.yml` | `25 */3 * * *` | Arsip BMKG: InaTEWS, ikhtisar cuaca harian (`factsheet.py`), factsheet karhutla, potensi hujan sepekan (`sepekan.py`), OMC resmi (`bmkg_omc.py`) dan petir (`petir.py`), awan Himawari per kabupaten, teks iklim dan kualitas udara BMKG, cuaca bandara (`bandara_bmkg.py`) (`.github/workflows/arsip-bmkg.yml:32-75`). |
| `jarak_pandang.yml` | `12 22-23,0-10 * * *` | METAR jarak pandang BMKG dan embusan NOAA tiap jam. |

## Uji dan gerbang

- `npm run uji:udara` (`node --test tests/udara/*.test.mjs`: layar, satelit, simulasi, stasiun).
- `npm run uji:hidromet` dan `npm run uji:hidromet:jaringan` (metar, mjo, awan_himawari, awan_tumbuh, dan lain-lain).
- Self-check Python: `python3 -I scripts/udara/lintasan.py uji`, `python3 -I scripts/operasi/semai.py uji`, `python3 -I scripts/operasi/semai_ifs.py uji`, `python3 scripts/omc/nilai.py uji`, `python3 scripts/omc/panen.py uji`, `python3 scripts/omc/bmkg_omc.py uji`, dan `python3 scripts/<modul>/<skrip>.py uji` untuk tiap skrip udara (dijalankan otomatis di langkah "Uji aturan" `udara.yml`).
- `node --test tests/operasi/semai_layar.test.mjs` (fungsi murni layar semai); `node --test tests/warga/omc.test.mjs`, `cuaca_nowcast.test.mjs`, `himawari.test.mjs`, `alarm.test.mjs`, `operasi_semai.test.mjs` (lewat `npm run uji:warga`).
- `npm run uji:agen` (gerbang struktur, termasuk jumlah agent, paket modul, dan kartu standar).
- Ukur INP geser bilah jam dan pilih zona (target p75 di bawah 200 ms) dan tinjauan di `http://localhost:8800/operasi#semai`.
- Catatan: dokumen paket menyebut `semai-klaim.test.mjs` sebagai gerbang frasa terlarang; berkas itu belum ada di `tests/`.
