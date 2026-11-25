# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute API, tabel D1, dan prefiks R2 modul ini.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `scripts/sebaran/umum.py` | Kisi 375 m, muat VIIRS, lahan, bootstrap |
| `scripts/sebaran/lacak.py` | Pelacak peristiwa |
| `scripts/sebaran/cuaca.py` | Cuaca ERA5 per jam, ENSO dan IOD |
| `scripts/sebaran/fitur.py` | `FITUR_SEL`, FWI, `Seri`, `Konteks`, `calon`, `baris_sel` |
| `scripts/sebaran/gbdt.py`, `gbdt_np.py` | Regresi logistik dan GBDT (stdlib dan numpy), metrik |
| `scripts/sebaran/latih.py`, `latih_jalan.py` | Sampel latih, setel di 2023, uji 2024 sampai 2026, ekspor `model_sebaran.json` |
| `scripts/sebaran/lolos.py` | Model "akan membesar": `bangun`, `cv`, `selang`, `akhir` |
| `scripts/sebaran/simfisika.py` | Port mesin fisika dan model negara lain (pembanding) |
| `scripts/sebaran/kasus.py`, `galat.py`, `pendorong.py`, `musim_awal.py`, `cerita_data.py` | Uji balik 123 kasus, analisis kesalahan, pendorong, musim, data cerita |
| `scripts/sebaran/prospektif.py`, `prospektif_historis.py`, `gerbang.py`, `jejak.py` | Uji prospektif, uji balik historis, gerbang, jejak api |
| `scripts/sebaran/risiko_mingguan.py`, `risiko_produksi.py` | Indeks 7 hari: uji balik dan model produksi P1 |
| `scripts/sebaran/prioritas.py`, `kalibrasi_wilayah.py`, `pfvi_balik.py` | Skor prioritas, kalibrasi wilayah, PFVI |
| `scripts/sebaran/lab_tutupan.py`, `bahan_bakar.py` | Laboratorium (butuh numpy, rasterio; tidak masuk workflow) |
| `scripts/sebaran/uji_js.py`, `splice_sebaran.py` | Kesetaraan Python dan JavaScript; sisip skrip ke `index.html` (sudah dijalankan 13 Okt 2026) |
| `scripts/sebaran/SEBARAN_MODEL.md`, `RISET-SEBARAN.md`, `RISET-PFVI.md`, `PAPER-PFVI.md` | Dokumentasi riset |
| `public/sebaran_model.js` | Evaluator `window.SebaranModel` (`muat`, `cuaca`, `lahan`, `ramal`, `uji`, `muatGerbang`, `gerbangBoleh`) |
| `public/insight_sebaran.js` | Eksibit Insight (sebagian disembunyikan) |
| `public/cerita_karhutla.js`, `cerita_karhutla.css` | Cerita Musim 2026 dan Pendorong |
| `public/sim_data.js`, `sim_3d.js`, `sim_topo.js`, `sim_panel.js`, `sim_armada.js`, `sim_adegan.js`, `sim_perlakuan.js` (dan `.css`) | Tambalan tab Simulasi |
| `public/index.html` (baris 1624, 6706 sampai 7150, 6494) | Halaman Simulasi, mesin fisika, kartu Metode |
| `public/risiko7.js`, `public/risiko7.css` | Lapisan peta peluang 7 hari |
| `src/risiko7.js` | Rute Worker data indeks 7 hari |
| `src/ews.js` | Pembaca `jejak_api.json` untuk peringatan email (milik `warga-api`) |
| `data/risiko_p1/` | Artefak model P1 yang di-commit |

Berkas bernama "* 2.*" (akhiran spasi dua) adalah salinan nyasar sinkronisasi dan tidak boleh disunting atau dipakai (`AGENTS.md` bagian 9). Saat dokumen ini ditulis tidak ada berkas semacam itu yang terlacak untuk modul ini.

## Rute API

| Metode dan jalur | Hak | Keterangan |
| --- | --- | --- |
| `GET`, `HEAD /api/risiko7` | Admin (token atau sesi) atau akun pemirsa; tamu 401 | Mengalirkan R2 `risiko/terbaru.json` apa adanya, `cache-control: private, no-store`; 503 `belum_ada` bila belum terbit atau kosong; 503 `tanpa_penyimpanan` bila tidak ada binding R2; 500 `terlalu_besar` di atas 8 MiB (`MAKS_BYTE` di `src/risiko7.js:8`, pemeriksaan `o.size > MAKS_BYTE` di baris 20) |
| `GET`, `HEAD /api/risiko7/prospektif` | Sama | R2 `risiko/prospektif.json` |
| `GET`, `HEAD /api/risiko7/akses` | Publik (selalu 200) | `{masuk: true atau false}` tanpa menyentuh R2 |

Metode selain GET dan HEAD pada jalur ini dijawab 405 (diuji di `tests/warga/risiko7.test.mjs`). Rute didaftarkan di `src/worker.js:677`. Catatan kepemilikan: `public/data/kekeringan_prospektif.json` berpasangan dengan uji prospektif tetapi dibuat oleh `scripts/kekeringan/prakiraan.py:559` (modul kekeringan, bukan modul ini). Modul ini tidak memiliki rute lain: data model, gerbang, prospektif, dan jejak api dibaca langsung sebagai berkas statis `public/data/*.json` oleh peramban, dan `jejak_api.json` dibaca Worker lewat `src/ews.js`.

## Tabel D1 dan migrasi

Tidak ada tabel D1 atau migrasi milik modul ini. Peringatan email membaca tabel `titik_terbaru` yang milik modul lain (`src/ews.js:91`).

## Prefiks R2 (bucket `poskokarhutla-foto`)

| Kunci | Isi |
| --- | --- |
| `risiko/terbaru.json`, `risiko/prospektif.json` | Keluaran indeks 7 hari P1 |
| `arsip/prospektif.jsonl.gz` | Arsip catatan uji prospektif model membesar (ramalan, nilai, vonis, gerbang, sensor) |
| `arsip/risiko_p1.jsonl.gz`, `arsip/risiko_n20.jsonl.gz` | Arsip catatan prospektif P1 dan arsip NOAA-20 bergulir 150 hari |

Cache latih besar (`*.pkl`, `*.jsonl`, `cuaca/`, sekitar 1,4 GB) ada di GitHub Release `model-cache-2026-10-15`; setelah melatih ulang buat rilis baru bertanggal, jangan menimpa yang lama.
