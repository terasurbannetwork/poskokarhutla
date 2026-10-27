# RANCANGAN: model banjir nasional (resep karhutla)

Status: berjalan, 27 Okt 2026. Pengerja `banjir`, pemeriksa `validasi-model` (wajib).
Jalur Jakarta/kota (simulasi 2D `sim_genangan.js`, DEMNAS, PetaBencana) TIDAK di sini: lihat
`docs/multi-bencana/RANCANGAN-GENANGAN-JAKARTA.md` dan `docs/banjir/RISET-MODEL-GENANGAN.md`.

## Keputusan

Semua opsi dicoba, bertahap. Tiap lapisan hanya tampil kalau mengalahkan pembanding sederhana
(pola `scripts/sebaran/gerbang.py`); gagal = tetap aturan sekarang, keluaran berlabel eksperimental.

| Tahap | Isi | Padanan karhutla | Pembanding |
| --- | --- | --- | --- |
| N1 | Katalog Copernicus GFM se-Indonesia 2015-kini (metadata STAC), luas tergenang per kecamatan per lintasan lewat HTTP Range, air tetap dan mask dibuang, kontrol latar pra-kejadian | `luas_citra.py` (dNBR) + arsip FIRMS | - |
| N2 | Bangunan di piksel tergenang (Google Open Buildings v3, sel 110 m dari `scripts/umum/bangunan.py`) | `paparan_bangunan.py` | - |
| N3 | GBDT peluang banjir kabupaten-hari, label DIBI, fitur hujan ERA5 + memori basah + statis | `latih.py`, `lolos.py` | aturan `status.py`, klimatologi, regresi logistik |
| N4 | Label GFM ditambahkan ke N3; model sel ~250 m (peta peluang genangan) | model sel 375 m | persistensi, HAND-bak |
| N5 | HAND dari DEM sebagai fitur dan simulasi bak (cadangan bila tak ada lintasan satelit) | `simfisika.py` | GFM teramati |
| N6 | Gerbang + prospektif append-only per model | `gerbang.py`, `prospektif.py` | - |

`model_kab.py` mode `buka` (uji 2024-2025) dijalankan sekali, SESUDAH kriteria di
`scripts/banjir/RISET-MODEL-KAB.md` di-commit.

## Sumber luar yang dinilai

- **Google Flood Forecasting API**: gratis, CC BY 4.0, prakiraan banjir sungai 7 hari (seperti Flood Hub), plus
  Inundation History (frekuensi air 1999-2020) dan debit GRRR 1980-2023. Akses lewat waitlist + Google Cloud Project:
  **pemilik yang mendaftar.** Bila masuk, dipakai sebagai masukan/pembanding untuk sungai besar, bukan dibangun ulang.
- **DEMNAS 8 m** (akun BIG): sudah dimosaik untuk Jakarta oleh jalur kota; nasional butuh unduh per lembar oleh pemilik.
  Sementara: Copernicus GLO-30.
- **Simulasi hidrodinamika 2D**: hanya per DAS prioritas (jalur kota). Tidak nasional.

## Batas yang ditulis di layar

Radar buta di kota padat (GFM mask), lintasan 6-12 hari sehingga banjir singkat dan bandang terlewat: luas = batas bawah.
Open Buildings menghitung bangunan, bukan rumah. DIBI per kabupaten dan tanggalnya bisa tanggal laporan.
