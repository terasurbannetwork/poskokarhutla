# Referensi: workflow, keluaran, uji

Halaman ini mendaftar workflow GitHub Actions, berkas keluaran data, serta uji dan perintah.

## Workflow GitHub Actions

Semua jadwal `cron` dalam UTC. Jadwal adalah nominal: lihat [penjaga jadwal](/docs/pengembang/arsitektur/penjadwalan) untuk cadangan pemicu.

| Workflow | Jadwal | Fungsi |
| --- | --- | --- |
| `titik.yml` | `40 */3 * * *`, `10 9 * * *`, `55 22 * * *` | Titik panas tiap 3 jam plus dua putaran menjelang cut-off laporan |
| `data.yml` | `20 14 * * *` | Pembaruan harian: titik, kompleks, posko, BNPB, feed Atom, lalu terbit |
| `banjir.yml` | `20 0 * * *` | Data banjir harian |
| `gempa.yml` | `10 1 * * *` | Data gempa |
| `lintas.yml` | `10 2 * * *` | Data lintas bencana |
| `prediksi.yml` | `50 1 * * *` | Prediksi harian |
| `statis.yml` | `0 19 2 * *` | Lapisan statis (OSM, WorldPop) |
| `titik_palsu.yml` | `0 20 3 * *` | Sumber panas tetap (bulanan) |
| `himawari.yml` | `7,37 * * * *` | Titik Himawari tiap 30 menit |
| `jarak_pandang.yml` | `12 22-23,0-10 * * *` | Jarak pandang BMKG |
| `udara.yml` | `40 6,18 * * *` | Kualitas udara |
| `semai.yml` | `0 10,22 * * *` | Peluang semai awan |
| `siklus.yml` | `50 3 * * *`, `50 5 * * 0`, `40 4 5 * *`, `20 1-22/3 * * *` | Gudang R2 Siklus Bencana |
| `kemitraan.yml`, `kemitraan-pakar.yml` | `30 2 * * *`; `0 3 2 * *` | Data dan pencocokan pakar Kemitraan Kampus |
| `bangunan.yml` | `30 20 3 * *`, `30 8 * * *` | Paparan bangunan Open Buildings |
| `inarisk.yml` | `45 4 * * 2` | Cermin InaRISK mingguan |
| `pemetaan.yml` | `30 5 4 * *` | Kelengkapan bangunan OSM per kab |
| `akademisi.yml`, `direktori-bulanan.yml` | `0 20 1 * *`; `0 1 3 * *` | Direktori akademisi dan jaringan |
| `arsip-bmkg.yml` | `25 */3 * * *` | Arsip BMKG 3 jam |
| `nowcast-bandang.yml` | `25 * * * *` | Nowcast bandang, arsip prospektif |
| `genangan_j4.yml`, `m1_prospektif.yml` | `30 22 * * *`; `30 15 * * *`, `30 21 * * *` | Pengumpul prospektif genangan |
| `panen-lab-banjir.yml` | `17 */4 * * *`, `30 3 3 * *` | Panen data lab banjir (IMERG, GloFAS) |
| `uji-bmkg.yml` | `40 23 * * *` | Uji akses BMKG |
| `bersih_cache.yml` | `50 */3 * * *`, `25 10 * * *` | Bersihkan cache lama |
| `jaga.yml` | `50 * * * *` | Penjaga kesegaran dan pemicu workflow terlewat |
| `paritas.yml` | push, pull request, `30 1 * * 1` | Gerbang paritas bencana |
| `jalur-mutlak.yml` | push, pull request | Gerbang jalur mutlak |
| `terbit_antre.yml` | push `main` dan `staging` pada jalur tertentu | Menunggu slot lalu men-dispatch `terbit.yml` |
| `terbit.yml` | dispatch | Uji, pulihkan cache data, `wrangler deploy` (main) atau unggah versi pratinjau (staging) |
| `lab.yml` | push `claude/**` atau dispatch | Uji lab model karhutla, bukan produksi |
| `graf.yml`, `gsmap_musim.yml`, `laporan-harian.yml`, `nowcast-jkt-imerg.yml`, `osm-nasional.yml`, `panen-s1-banjir.yml`, `renlap.yml`, `renlap-pb.yml` | dispatch saja | Pekerjaan sekali jalan atau manual |

## Berkas keluaran data

- `public/data/` (sekitar 200 entri): titik panas (`hotspot*.json`, `titik24.json`), `meta.json`, `laporan.json`, `wilayah.json`, `kluster*.json`, `kumulatif.json`, `musim_harian.json`, `fwi.json`, `peringatan.json`, kekeringan (`kekeringan_*.json`), DIBI (`dibi_*.json`), feed (`feeds/`), konsesi (`konsesi2026/`), riwayat sel (`riwayat_sel/`), arsip kluster harian (`kluster_hari/`, disimpan 8 hari), dan lainnya.
- `public/<modul>/data/`: `banjir`, `bnpb`, `cuaca`, `gempa`, `gunungapi`, `inti`, `kekeringan`, `longsor`, `pesisir`, `prediksi`, `siklus`, `udara`.
- Yang tidak terbit: daftar di `public/.assetsignore` (berkas uji, data perusahaan bernama, arsip progresi, data tanpa izin).

## Uji dan perintah

| Perintah | Cakupan |
| --- | --- |
| `npm run uji:agen` | Gerbang `tests/agen/*.test.mjs` dan `tests/inti/*.test.mjs` |
| `npm run uji:warga` | Uji Worker dan D1 (`tests/warga/*.test.mjs`, 224 berkas) |
| `npm run uji:wa` | `scripts/wa/uji_urai_laporan.py uji` dan `tests/wa/lapangan_tarik.test.mjs`; seluruh `node --test tests/wa/*.test.mjs` untuk bot |
| `npm run uji:banjir`, `uji:prediksi`, `uji:udara`, `uji:siklus`, `uji:sippa`, `uji:kemitraan`, `uji:layar`, `uji:insiden`, `uji:hidromet`, `uji:sensor`, `uji:ai`, `uji:paritas` | Uji per modul |
| `npm run uji` | Rangkaian penuh (agen, warga, sippa, banjir, udara, prediksi, wa, siklus, paritas) |
| `node scripts/agents/uji_ulang.mjs <berkas uji>` | Menjalankan ulang uji yang gagal sesaat (dipakai `terbit.yml`) |
| `npm run agents:build`, `agents:check` | Membangun dan memeriksa definisi agent dan `KATALOG.md` dari roster |
| `npm run bencana:js`, `bencana:cek` | Membangun dan memeriksa `src/bencana.generated.js` dari `public/bencana.json` |
| `npm run tinjau` | Server tinjau lokal di port 8800 |
| `npm run dorong` | Push `main` dengan antre satu pendorong |
| `node scripts/agents/ilmu.mjs <pemilik, baca, cek, catat, kasus, atau prompt>` | Ilmu dan jejak agent |
| `npm run token:ukur` | Ukur pemakaian token konteks |
