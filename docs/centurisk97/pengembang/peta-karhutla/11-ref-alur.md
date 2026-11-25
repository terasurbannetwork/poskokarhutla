# Referensi: workflow, keluaran, uji

Halaman ini mendaftar workflow, keluaran data, perintah uji, dan dokumen paket.

## Workflow GitHub Actions

| Workflow | Jadwal | Peran |
| --- | --- | --- |
| `titik.yml` | `40 */3 * * *` UTC, ditambah `10 9 * * *` dan `55 22 * * *` UTC | Titik panas, `insiden.py`, `arsip_insiden.py` (baris 173 sampai 177), `progresi.py` dengan anggaran terbit 8 MB (baris 181 sampai 187), `titik_setara.json`; deploy `public/` tanpa commit |
| `data.yml` | `20 14 * * *` UTC (21.20 WIB) | Pembaruan harian: kluster, FWI, luas, riwayat |
| `statis.yml` | `0 19 2 * *` UTC | Lapisan statis (OSM, WorldPop); direncanakan juga data statis desa |
| `bangunan.yml` | `30 20 3 * *` dan `30 8 * * *` UTC | Grid bangunan bulanan; angka bangunan insiden harian disalurkan ke deploy `titik.yml` lewat cache `insiden-bangunan-` (dipulihkan di `.github/workflows/titik.yml:51` sampai `58`; langkah hitung `paparan_insiden.py` dan penyimpan cache ada di `bangunan.yml:242` sampai `257`) |
| `terbit.yml` | tiap perubahan | Menerbitkan tampilan |

## Keluaran di `public/data`

`hotspot.json`, `hotspot24.json`, `hotspot72.json`, `titik_hari/`, `titik_tahun.json`, `titik_setara.json`, `kluster.json`, `kluster_hari/`, `peta_karhutla.json`, `peta_karhutla_kab.json`, `peta_karhutla_wil.json`, `insiden.json`, `tugas_kompleks.json`, `harian_panjang.json`, `sejarah.json`, `musim.json`, `dampak.json`, `riwayat_sel/`, `progresi/<id>.json` dan `progresi/indeks.json` (terbit; arsip dan `petak/` tidak), `insiden_bangunan.json` (rencana), `desa_waspada.json` (rencana, belum ada). Saat dokumen ini ditulis, folder `public/data/progresi/` dan berkas `insiden_bangunan.json` belum ada di salinan kerja karena dibangun di cache CI, tidak di-commit.

## Uji dan gerbang

| Perintah | Menjaga |
| --- | --- |
| `npm run uji:insiden` | `progresi.py --uji`, `paparan_insiden.py --uji`, `arsip_insiden.py --uji` (`package.json:13`) |
| `python3 -I scripts/data/progresi.py uji-tahan` | Uji tahan A10, menulis `tests/insiden/hasil_uji.json` (butuh CSV FIRMS lokal) |
| `python3 scripts/data/insiden.py --uji` | Aturan insiden |
| `python3 scripts/data/titik_unik.py` | Definisi lokasi unik |
| `python3 scripts/data/harian.py uji` | Uji tanpa jaringan; jangan jalankan tanpa argumen karena itu produksi |
| `npm run uji:agen` | Semua gerbang di `tests/agen/**`, di antaranya `hotspot-mundur`, `peta-kab`, `peta-karhutla`, `gerbang-kartu-std`, `gerbang-kartu-renggang`, `gerbang-peta-data`, `gerbang-performa-peta` |
| `scripts/data/uji_ambang_prioritas.py` | Uji balik aturan Prioritas provinsi (butuh CSV VIIRS lokal) |

Gerbang khusus paket belum ada: `tests/agen/gerbang-insiden-kaya.test.mjs` (IK-11), `gerbang-desa-waspada.test.mjs` (DW-09), dan `gerbang-alat-gambar.test.mjs` (AG-07). Tinjau layar di `http://localhost:8800/` (`npm run tinjau`).

## Dokumen paket

`data/kajian-bnpb/insiden-kaya/` (KEPUTUSAN-INSIDEN, ALGORITMA, DESAIN-TEKNIS, TIKET `IK-*`), `desa-waspada/` (KEPUTUSAN-DESA, TIKET `DW-*`), `alat-gambar/` (KEPUTUSAN-GAMBAR, TIKET `AG-*`), `ambang-hotspot/` (kajian PDF, PPTX, dan Word), dan `docs/cara-kerja.md`.
