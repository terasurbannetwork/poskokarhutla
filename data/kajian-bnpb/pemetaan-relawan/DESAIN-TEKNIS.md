# DESAIN-TEKNIS: Pemetaan bangunan oleh relawan

Rancangan; belum ada kode. Pemilik berkas diputuskan saat tiket diambil (kampus untuk layar dan pipeline, warga-api untuk `src/` dan migrasi).

## Berkas

| Berkas | Isi |
| --- | --- |
| `scripts/pemetaan/kelengkapan.py` | Hitung N_osm lewat ohsome dan rasio per kab; tulis `public/data/kemitraan/pemetaan_kelengkapan.json` (hanya agregat per kab, tanpa nama orang). |
| `scripts/pemetaan/konst.py` dan `public/pemetaan/konst.js` | Ambang dan bobot; uji identik. |
| `scripts/pemetaan/paket.py` | Bangun paket proyek: AOI GeoJSON, instruksi, hashtag. Keluaran ke R2 privat, bukan `public/`. |
| `src/pemetaan.js` | Rute staf dan kampus. |
| `migrations/NNNN_pemetaan.sql` | Tabel di bawah. |
| `public/kemitraan/pemetaan.js` | Layar. |

## Tabel (rancangan)

| Tabel | Kolom penting |
| --- | --- |
| `pm_proyek` | id, kab4, bahaya, status (CHECK daftar ALUR), aoi_r2 (kunci), hashtag_dasar, tautan_tm (diisi staf), rasio_awal, rasio_akhir, tanggal_data, dibuat, disetujui_oleh |
| `pm_gabung` | proyek_id FK, institusi_id FK, hashtag (`CentuRisk-<kode>`), dibuat |
| `pm_riwayat` | proyek_id FK, status, catatan, oleh, waktu (append-only) |

Satu `kab4` hanya boleh punya satu proyek aktif (indeks unik sebagian). Tabel `pm_` tidak menyalin kolom kejadian; proyek antisipatif bukan kejadian, jadi tidak menaut `sk_kejadian`.

## Rute

| Rute | Hak |
| --- | --- |
| GET `/api/kemitraan/pemetaan/prioritas` | staf |
| POST `/api/kemitraan/pemetaan/proyek` | staf, menyiapkan |
| POST `.../proyek/<id>/setuju` | pemilik |
| POST `.../proyek/<id>/tautan` | staf |
| POST `.../proyek/<id>/gabung` | akun kampus |
| GET `.../sumbangan` | staf, agregat |

## Pipeline

Satu workflow bulanan, `pemetaan.yml` (milik mekanik-mesin), menjalankan kelengkapan lalu pembacaan balik sumbangan. Data ohsome dicache per kab; permintaan sopan (jeda antar kueri, pengulangan dengan jeda naik). Batas laju diukur di HR-03.

## ADR

ADR-1: ohsome dipilih karena publik tanpa kunci dan punya riwayat; Overpass tidak cocok untuk hitungan skala kab (sudah memaksa 63 kueri untuk Jakarta di `gedung.py`). ADR-2: tidak ada integrasi tulis Tasking Manager, mengikuti D3.
