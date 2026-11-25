# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute API, tabel D1 beserta migrasinya, dan prefiks R2 yang dipakai modul karhutla.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `scripts/data/harian.py` | titik panas 7 hari, ST-DBSCAN, FWI, BNPB; menulis `hotspot*.json`, `kluster*.json`, `fwi.json`, `wilayah.json`, `meta.json` |
| `scripts/data/titik_unik.py` | satu definisi lokasi unik; keluaran `titik_setara.json` (24 jam) |
| `scripts/data/firms_sumber.py` | pemilihan SP atau NRT per sensor per hari, `SNPP_AKHIR`, rasio N20/S-NPP |
| `scripts/data/aturan.py` | status taktis, keparahan, prioritas, gunung api |
| `scripts/data/fwi.py` | Van Wagner FWI, FFMC jam |
| `scripts/data/titik_palsu.py` | daftar sumber panas tetap |
| `scripts/data/titik_hari.py`, `harian_panjang.py`, `harian30.py` | arsip per hari dan deret panjang |
| `scripts/data/peta_karhutla.py` | luas, belum padam, padam per provinsi, kabupaten, kecamatan |
| `scripts/data/laporan.py` | laporan harian dan kurva musim; juga memanggil `presiden.py` lewat `ringkasan.py` |
| `scripts/data/insiden.py`, `arsip_insiden.py`, `progresi.py` | insiden, arsip deteksi, perkembangan |
| `scripts/data/luas_citra.py` | luas dNBR per insiden |
| `scripts/data/gambut_bara.py`, `khg_prioritas.py`, `tanah_gambut.py` | gambut |
| `scripts/data/konsesi_kompleks.py`, `scripts/scrape/konsesi.py`, `scripts/scrape/khg.py`, `scripts/scrape/kemenhut_gdb.py` | konsesi dan KHG |
| `scripts/data/satelit_riwayat.py` | `satelit/riwayat.json` kumulatif |
| `scripts/data/uji_ambang_prioritas.py` | uji balik aturan Prioritas provinsi |
| `scripts/data/preventif.py` | rencana pencegahan per kecamatan langganan api; keluaran `preventif.json` ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/peluang_karhutla.py`, `peluang_laju.json` | peluang bahaya api FWI 7 hari; keluaran `peluang.json` ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/taktik.py` | rekomendasi cara pemadaman per kompleks; kunci `rekomendasi` di `tugas_kompleks.json` ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/watak_kluster.py` | pola lokasi per kluster; kunci `wt` di `kluster.json` dan `kluster_awal.json` ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/senyap.py` | daerah senyap; keluaran `senyap.json` ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/bnpb_gis.py` | data publik gis.bnpb.go.id; keluaran `inarisk.json` dan `bpbd.json` ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/kumulatif.py` | titik panas kumulatif tahun berjalan; keluaran `kumulatif.json` ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/bias_luas.py`, `sampling_luas.py` | pembanding luas terbakar ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/data/lab_dnbr.py`, `lab_front.py`, `lab_luas.py`, `lab_padam.py`, `scripts/data/lab_kriteria/` | skrip lab, bukan produksi ([Kesegaran dan mesin pendukung](/docs/pengembang/data-karhutla/kesegaran-mesin), bagian 17) |
| `scripts/geo/batas.py` | pencarian wilayah dari batas administrasi |
| `src/titik.js` | Worker: ambil FIRMS ke D1, jeda per sensor, `SNPP_BERHENTI` |
| `src/satelit.js` | Worker: ringkasan jeda lintasan |
| `public/prioritas.js`, `public/peta_karhutla.js`, `public/peta_kab.js`, `public/angka_kawasan.js`, `public/satelit_data.js` | layar |

Kode data bersifat Python 3.12 pustaka standar saja, tanpa `pip install` di Actions. Berkas TIFF dan netCDF dibaca manual. Skrip memakai `python3 -I` dan wajib berdiri sendiri. Kunci API hanya lewat variabel lingkungan; skrip repo tidak boleh memuat path absolut mesin.

## Rute API (Worker)

| Metode | Jalur | Hak | Catatan |
| --- | --- | --- | --- |
| GET | `/api/titik` | publik | 8 putaran terakhir dari D1, cache tepi 600 detik; galat FIRMS tersaji dengan kunci diganti `***` |
| GET | `/api/status` | publik | 200 atau 503, cache 60 detik |
| GET, HEAD | `/api/satelit/jeda` | publik | satu baris `satelit_ringkas`, cache 6 jam; belum ada baris = 503 tanpa cache |

## Tabel D1 dan migrasi

| Tabel | Migrasi | Isi |
| --- | --- | --- |
| `titik_terbaru` | `migrations/0002_titik.sql` | satu baris per putaran FIRMS, 8 terakhir, `isi` JSON maksimum 2.000.000 karakter |
| `satelit_ringkas` | 0075 (`migrations/0075_satelit_granul.sql:17`) | ringkasan jeda lintasan; ditulis cron menit 19 (`src/worker.js:1025`) hanya bila belum ada atau lebih dari 25 jam; `src/satelit.js:129-138` menjawab 503 bila tabel atau baris belum ada |

Worker memakai satu cron `* * * * *` (batas 5 jadwal cron akun Free): FIRMS ke D1 pada menit 15 tiap 3 jam UTC, bersih-bersih menit 17 (`AGENTS.md` bagian 2).

## Prefiks R2

Tidak ada prefiks R2 khusus modul ini. Berkas data terbit lewat static assets Cloudflare (`terbit.yml`). Berkas Himawari dan arsip prospektif memakai R2 di modul lain.

