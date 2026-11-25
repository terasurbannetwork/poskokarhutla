# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute, serta tabel dan penyimpanan yang berkaitan dengan peta utama.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `public/index.html` | Layar peta utama (HTML, CSS, dan JS inline). `TABS` baris 1737, `hitung()` 1951, `Peta` 1985, `Lapis` 2269, `renderDaftar` 2711, `Laci` 3303, `Tren` 3820 (rumus skor `skorRiwayat` 3732), `Insight` 4068, `Berita` 4579, `Posko` 5458, `renderMetode` 5774, `Sim` 6814 |
| `public/pembanding.js` | Bagian "Insiden api" dan "Alasan peringkat" di laci, kartu Insight tambahan, `PKH.setara()` |
| `public/prioritas.js` | Ikon dan dialog Prioritas provinsi (`Prioritas.jalan`, `Prioritas.hitung`) |
| `public/dampak.js` | Tab Dampak |
| `public/ringkasan.js` | Tab Dashboard |
| `public/riwayat_sel.js`, `riwayat_nasional.js`, `riwayat_daerah.js` | Tren lokasi di laci, riwayat nasional dan daerah |
| `public/peta_karhutla.js`, `peta_kab.js`, `lapisan5.js`, `angka_kawasan.js`, `insight_sebaran.js`, `titik_live.js`, `waktu_kluster.js` | Lapisan angka per provinsi dan kabupaten, lapisan peta, hitungan sisi peramban |
| `public/inti/kartu.js`, `inti/kartu.css` | Mesin kartu standar `.ex.ex-std` |
| `scripts/data/titik_unik.py`, `peta_karhutla.py`, `laporan.py`, `harian.py`, `aturan.py`, `insiden.py`, `arsip_insiden.py`, `progresi.py`, `riwayat_petak.py`, `riwayat_sel.py`, `musim.py`, `dampak.py` | Pipeline Python 3 stdlib |
| `scripts/umum/paparan_insiden.py`, `bangunan.py`, `paparan_bangunan.py` | Bangunan dekat api (milik `pipa-umum`) |
| `src/worker.js` | Gerbang halaman (`PUBLIK_TANPA_SESI`, `halamanTerkunci`), `/api/status` (baris 939) |

## Rute

| Metode dan jalur | Hak |
| --- | --- |
| `GET /` | Halaman HTML terkunci; rute berasal dari registri bencana (`ruteBencana()` menghasilkan "/" dari entri `karhutla` di `public/bencana.json`, `src/bencana.js:25`, dipasang di `HTML_RUTE`, `src/worker.js:722`), bukan baris statis. Perlu sesi (staf, instansi, atau pemirsa sesuai tab); keputusan hak dihitung di `layaniHTML` (`src/worker.js:808` sampai `835`) |
| `GET /api/status` | Publik (cache tepi 60 detik); umur data per sumber, 503 bila sumber kunci basi |
| `GET /api/titik` | Publik (data titik cepat dari D1, FIRMS tiap 3 jam) |
| `GET /k/<id cluster>` | Tautan bagikan cluster (`Bagikan.bukaKompleks`); aturan hak belum terdokumentasi di kode yang dibaca |
| `GET /data/*.json` | Aset statis publik tanpa Worker |

Peta utama tidak punya rute tulis sendiri. Insiden, progresi, dan bangunan insiden tidak punya rute Worker (`DESAIN-TEKNIS.md` insiden bagian 5).

## Tabel D1 dan R2

Peta utama karhutla membaca berkas statis. D1 dipakai untuk titik cepat (`/api/titik`) dan tabel Worker lain yang bukan bagian modul ini; tabel dan migrasi spesifik peta utama belum terdokumentasi di kode yang dibaca. Grid bangunan terkunci diunggah ke R2 bucket `poskokarhutla-foto` awalan `bangunan/` oleh `bangunan.yml` dan dibaca Worker setelah login. Arsip dan rincian sel insiden tidak diunggah ke R2.
