# Referensi: workflow, keluaran, uji

Halaman ini mendaftar workflow GitHub Actions beserta jadwalnya, berkas keluaran di public/data, dan uji serta gerbang modul karhutla.

## Workflow GitHub Actions dan jadwal

Semua berbagi grup `concurrency: group: data`.

| Workflow | Jadwal | Batas waktu | Isi |
| --- | --- | --- | --- |
| `data.yml` | `20 14 * * *` UTC (21.20 WIB) | 90 menit | `harian.py`, arsip titik hari, riwayat harian panjang, kompleks konsesi, ansambel dan tanah, berita, posko, ringkasan |
| `titik.yml` | `40 */3 * * *`, `10 9 * * *`, `55 22 * * *` UTC | 40 menit | `harian.py` dengan `FWI=0`, titik setara 24 jam, peta karhutla, insiden, arsip insiden, progresi, laporan, citra, lalu `wrangler deploy` |
| `statis.yml` | `0 19 2 * *` UTC (tanggal 2) | 300 menit | tarik OSM, lapisan statis, konsesi, commit berkas statis |
| `titik_palsu.yml` | `0 20 3 * *` UTC (tanggal 3) | belum terdokumentasi di sini | `titik_palsu.py segar` |
| `himawari.yml` | `7,37 * * * *` | belum terdokumentasi di sini | api baru Himawari (luar modul) |
| `lab.yml` | tanpa jadwal | 210 menit (per catatan ilmu) | skrip lab; jalan lewat dorongan cabang `claude/**` atau dispatch |

![Jadwal harian pengambilan dan pengolahan data dalam jam UTC: Worker tiap 3 jam, titik.yml rutin tiap 3 jam ditambah dua putaran cut-off, dan data.yml sekali sehari. Sumber: tabel jadwal di atas dan src/worker.js baris 1016.](gambar/pipeline-karhutla-jadwal-harian.svg)

Dua putaran tambahan `titik.yml` (`10 9` = 16.10 WIB dan `55 22` = 05.55 WIB) menjelang batas waktu laporan; GitHub dapat menunda cron sekitar 35 menit (median). Penambahan cron wajib diikuti dua kondisi di workflow dan dijaga `tests/agen/gerbang-antrean-data.test.mjs`. Berkas statis yang tidak dibuat ulang di CI dipulihkan oleh langkah "Pakai lapisan statis dari repo" di `data.yml`, `titik.yml`, `banjir.yml`, dan `terbit.yml`; berkas baru yang di-commit tetapi tidak dibuat CI wajib masuk keempatnya.

## Berkas keluaran di `public/data/`

Titik dan kompleks: `hotspot.json`, `hotspot24.json`, `hotspot72.json`, `kluster.json`, `kluster_awal.json`, `kluster_geo.json`, `kluster_hari/`, `harian30.json`, `harian_panjang.json`, `titik_hari/`, `titik_tahun.json`, `titik_palsu.json`, `titik24.json`. Luas dan laporan: `peta_karhutla.json`, `peta_karhutla_kab.json`, `peta_karhutla_wil.json`, `laporan.json`, `musim_harian.json`, `luas_resmi.json`, `luas_pembanding.json`, `sejarah.json`. Insiden dan taktik: `insiden.json`, `progresi/`, `luas_citra.json`. Lahan: `lahan/gambut.geojson`, `lahan/khg.geojson`, `lahan/konsesi.geojson`, `lahan/kawasan.geojson`, `khg_prioritas.json`, `kompleks_konsesi.json`, `tanah_gambut_bulanan.json`. Satelit: `satelit/riwayat.json`. Daftar lengkap pemakai dan penulis tiap berkas ada di `docs/PETA-DATA.md` (dibangun oleh `python3 scripts/agents/peta_data.py bangun`; jangan disunting tangan).

Batas ukuran: `kejadian_karhutla_awal.json` (dibuat saat CI oleh `scripts/data/harian.py:773`, tidak di-commit) dicatat sekitar 48 KB dari batas 50 KB, jadi tidak boleh ditambah kolom (`.claude/ilmu-agent/pipa-data.md:36`). Angka ukuran `tugas_kompleks.json` yang dibaca Worker tiap menit belum terdokumentasi di kode; berkas itu juga dibuat saat CI dan tidak di-commit.

## Uji dan gerbang

| Perintah | Menjaga |
| --- | --- |
| `python3 -I scripts/data/fwi.py` | rumus FWI terhadap cffdrs |
| `python3 scripts/data/aturan.py` | assert status dan keparahan |
| `python3 scripts/data/titik_unik.py` | definisi lokasi unik |
| `python3 scripts/data/harian.py uji` | uji aturan harian dan assert `2 x AMBANG_MEDIUM_PX <= PRIOR_PX` (jangan menjalankan `harian.py` tanpa argumen: itu jalur produksi) |
| `python3 -I scripts/data/firms_sumber.py` | pemilihan sumber dan batas S-NPP |
| `python3 -I scripts/data/rasio_n20_n.py uji` | rasio sama dengan hasil pilih |
| `python3 scripts/data/peta_karhutla.py --uji` | invarian luas, belum padam, padam |
| `python3 scripts/data/laporan.py uji`, `python3 -I scripts/data/insiden.py --uji`, `python3 -I scripts/data/satelit_riwayat.py --uji`, `python3 -I scripts/data/titik_palsu.py uji` | masing-masing modul |
| `npm run uji:insiden` | `progresi.py`, `paparan_insiden.py`, `arsip_insiden.py` |
| `node --test tests/prioritas.test.mjs` | aturan masuk, bertahan, keluar Prioritas provinsi (garis 180/90, ganti ke 144/72 pada 3 November 2026) |
| `npm run uji:agen` | gerbang istilah titik panas, konsesi, antrean data, data basi, peta data |

Blok "Uji aturan" di `data.yml` menjalankan swa-uji modul lain yang berkaitan, antara lain `geo/batas.py`, `posko.py`, `berita.py` (akurasi sentimen terhadap `label_uji.json`), `citra.py`, `konsesi_kompleks.py`, `dampak.py`, `ansambel.py`, `tanah.py`, `cuaca_jam.py`, dan `ringkasan.py`.

