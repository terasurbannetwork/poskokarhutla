# Referensi: gempa, gunung api, longsor

Halaman ini memuat rujukan teknis untuk gempa, tsunami, gunung api, dan longsor.

## Gempa dan tsunami

| Berkas | Peran |
| --- | --- |
| `src/gempa.js` | Worker: ambil BMKG dan USGS, gabung, kelompokkan kejadian, rute `/api/gempa/*` |
| `migrations/0009_gempa.sql` | tabel `gempa`, `gempa_kejadian`, `gempa_sumber` |
| `public/gempa/index.html`, `tab.js`, `peta.js`, `panel.js`, `laci.js`, `kejadian.js`, `insight.js`, `tren.js`, `dampak.js`, `berita.js`, `metode.js`, `sim.js`, `tsunami.js`, `guncangan.js`, `susulan.js`, `pager.js`, `kerusakan.js`, `evakuasi.js`, `bukti.js`, `beruntun.js`, `tsunami_zona.js`, `inatews.js`, `operasi.js` | layar dan model peramban |
| `scripts/gempa/riwayat.py` | riwayat USGS sejak 1900, risiko riwayat, `meta.json` |
| `scripts/gempa/susulan.py`, `peluang_gempa.py`, `guncangan.py`, `pager.py`, `prospektif.py` | model susulan, laju, guncangan, PAGER, uji prospektif |
| `scripts/gempa/inatews.py`, `katalog_pdf.py`, `kajian_magma.py` | arsip InaTEWS, katalog PDF BMKG, kajian MAGMA |
| `scripts/gempa/tsunami_zona.py`, `dart.py`, `gnss.py`, `emsc.py`, `beruntun.py`, `bukti.py`, `dampak.py`, `laporan_gempa.py`, `berita.py`, `citra.py`, `bahaya.py`, `sesar.py`, `vs30.py`, `batimetri.py` | pipa data pendukung |
| `scripts/gempa/uji_js_susulan.py`, `uji_js_guncangan.py`, `uji_js_pager.py`, `uji_js_tsunami.py` | kesetaraan Python dan JS |

Rute API (`src/gempa.js:290-312`; hanya GET dan HEAD, selain itu kode 405; cache tepi 60 detik; kunci cache hanya jalur dan `jam` tervalidasi; galat D1 memberi 503, kecuali `terbaru` memberi daftar kosong):
- `GET /api/gempa/terbaru?jam=24|72|168|720`: publik, maksimum 3.000 baris, bawaan 72.
- `GET /api/gempa/status`: publik, umur tiap sumber.
- `GET /api/gempa/kejadian`: publik, kejadian 30 hari terakhir (maksimum 200).
- `GET /api/gempa/kejadian/<G0001>`: publik, kode harus berpola `G\d{4,}`.

Pendaftaran di Worker: `src/worker.js:937`; cron `* * * * *` (`CRON_GEMPA`, `worker.js:110`) memanggil `perbaruiGempa` lalu pemeriksaan peringatan dan email EWS; pembersihan tiap menit 17 (`worker.js:1080`). Tab Operasi memakai `GET /api/pb/titik` (hak sesi; 403 "di luar wilayah" tetap menampilkan tab).

Workflow: `gempa.yml` harian 01.10 UTC (`10 1 * * *`: uji skrip, catatan prospektif susulan, laporan harian, laju dan peluang, DART dan EMSC prospektif boleh gagal, arsip InaTEWS boleh gagal, prospektif guncangan dan PAGER, commit ke `main`, penjaga data beku `cek_basi.py`); `arsip-bmkg.yml` tiap 3 jam (`25 */3 * * *`, arsip InaTEWS); `lintas.yml` harian 02.10 UTC memanggil `tsunami_zona.py` dan `beruntun.py` (`lintas.yml:371-372`; komentar `lintas.yml:359` yang menyebut `beruntun.py` belum dirantai sudah usang) dan meng-commit `beruntun_arsip`, `beruntun.json`, `tsunami_zona.json`, `zona_tsunami_kamus.json`. `pager.py catat`, `prospektif.py catat`, dan `prospektif.py nilai` ikut dijalankan harian di `gempa.yml:67-78`. Lapisan bulanan gempa dijalankan `statis.yml` (cron tanggal 2 pukul 19.00 UTC): `riwayat.py`, `bahaya.py`, `sesar.py`, `bukti.py`, `citra.py` (`statis.yml:103-110`) dan `gnss.py` ambil dan hitung (`statis.yml:227-228`), yang meng-commit `riwayat_m5`, `riwayat_prov`, `riwayat_grid`, `risiko`, dan `gnss.json` ke `public/gempa/data`. Berita gempa, `katalog_pdf.py`, dan `kajian_magma.py` dijalankan tangan atau belum ada di workflow.

Keluaran `public/gempa/data/`: `riwayat_m5.json`, `riwayat_prov.json`, `riwayat_grid.json`, `risiko.json`, `meta.json`, `model_susulan.json`, `model_guncangan.json`, `prospektif_susulan.json`, `prospektif_gempa.json`, `prospektif_pager.json`, `laju.json`, `peluang.json`, `laporan.json`, `inatews_*.json`, `katalog_merusak.json`, `katalog_tsunami.json`, `tsunami_zona.json`, `zona_tsunami_kamus.json`, `beruntun.json`, `dart.json`, `gnss.json`, `emsc_*.json`, `bukti.json`, `sesar.geojson`, `batas_lempeng.geojson`, `batimetri.bin`, `vs30.bin`. Berkas di `public/gempa/data/` hanya terbit bila di-commit; keluaran yang ditulis CI memakai `public/data/` atau `public/banjir/data/` (mis. `berita_gempa.json`, `dampak_gempa.json`).

R2: tidak ada prefiks khusus modul gempa. Prefiks `ews/` pada binding `MEDIA` hanya direncanakan paket EWS.

Uji dan gerbang: `python3 scripts/gempa/<skrip>.py uji` untuk tiap skrip; `python3 scripts/gempa/uji_js_susulan.py`, `uji_js_guncangan.py`, `uji_js_pager.py`, `uji_js_tsunami.py`; `node --test tests/gempa/*.test.mjs` (inatews, kerusakan, kerusakan_nyata, nama_wilayah, pager, pb44, prospektif, silang_beruntun, silang_tsunami); `node --test tests/warga/gempa.test.mjs tests/warga/gempa_susulan.test.mjs`; `npm run uji:agen` (gerbang pemilik berkas, `tanpa-salin`, gerbang model: `kinerja_uji`, `dibuat`, `catatan`, pasangan `uji_js*.py`, berkas prospektif); `npm run bencana:cek` bila registri tersentuh. Layar diuji di `http://localhost:8800/gempa/`.

## Gunung api

| Berkas | Peran |
| --- | --- |
| `src/gunungapi.js` | Worker: level MAGMA ke D1, rute `GET /api/gunungapi/terbaru` (publik, cache tepi 60 detik) |
| `migrations/0021_arsip_cap_gunungapi.sql` | `gunungapi_level`, `gunungapi_ubah` (dan `cuaca_arsip` milik nowcast) |
| `public/gunungapi/*.js`, `gunungapi.css`, `index.html`, `simulasi.html`, `laporan.html` | layar |
| `scripts/gunungapi/magma.py`, `paparan.py`, `abu.py`, `peluang_abu.py`, `uji_abu.py`, `prospektif.py`, `mirova.py`, `risiko.py`, `factsheet.py`, `laporan.py`, `dampak.py`, `berita.py`, `citra.py`, `pop_grid.py`, `arsip_magma.py`, `riwayat_level.py` | pipa data dan model |
| `scripts/gunungapi/uji_lahar.mjs`, `uji_setara.mjs` | uji lahar dan kesetaraan Python dan JS |

Keluaran: `public/banjir/data/gunungapi_status.json`, `abu_gunungapi.json`, `abu_peluang.json`, `prospektif_abu.json`, `dampak_gunungapi.json` (CI menimpa `public/gunungapi/data` saat terbit, sehingga keluaran model ditulis di `public/banjir/data`); di `public/gunungapi/data/`: `gunung.json`, `paparan.json`, `paparan_geo.json`, `kegempaan.json`, `perubahan_level.json`, `riwayat_level.json`, `rezim_letusan.json`, `mirova.json`, `risiko.json`, `bandara.json`, `pop/<id>.json`, `catatan/<KODE>.jsonl`.

Workflow: `titik.yml` memperbarui status gunung api tiap 3 jam (`magma.py cepat`, `titik.yml:317`); `lintas.yml` harian 02.10 UTC (`magma.py`, `paparan.py`, `citra.py`, `peluang_abu.py`, `mirova.py`, uji mandiri `uji_lahar.mjs`, `uji_setara.mjs`, `uji_abu.py`, `abu.py uji`, `laporan.py uji` pada `lintas.yml:100-104`); `statis.yml` bulanan tanggal 2 pukul 19.00 UTC (`paparan.py`, `citra.py`, `risiko.py`, `pop_grid.py`). Berkas permanen (`kegempaan.json`, `catatan/<KODE>.jsonl`, `perubahan_level.json`) harus di-`git add` oleh langkah workflow, bukan cache.

Uji: `node --test tests/gunungapi/sim_tanggap.test.mjs`; `node scripts/gunungapi/uji_lahar.mjs`; `node tests/warga/gunungapi_arsip.test.mjs` lewat `npm run uji:warga`; `python3 scripts/gunungapi/<skrip>.py uji`. Pemeriksa untuk teks dari lembaga: `security-reviewer`.

## Longsor

| Berkas | Peran |
| --- | --- |
| `scripts/longsor/dasar.py` | jalur, daftar 7.270 kecamatan, pencari titik ke kecamatan, sel hujan 0,5 derajat |
| `scripts/longsor/rumus.py`, `model.py` | rumus S, nowcast, uji balik |
| `scripts/longsor/kejadian.py`, `pvmbg.py`, `tanggapan_pvmbg.py` | label GLC, DIBI, PVMBG |
| `scripts/longsor/lab_tanah.py`, `lab_lereng.py`, `hujan_riwayat.py` | lab lokal (numpy dan rasterio di venv; panen hujan bertahap karena kuota harian Open-Meteo) |
| `scripts/longsor/ambang_kab.py`, `model_lhasa2.py`, `PRAREG-LHASA2.md`, `PRAREG-LHASA2-AMANDEMEN.md` | percobaan pemulihan, belum dibekukan |
| `scripts/longsor/lereng_dem.py`, `lereng_bangunan.py` | paket lereng bangunan (sebagian) |
| `public/banjir/longsor.js`, `sim_longsor.js` | layar dan simulasi (di halaman banjir) |

Keluaran `public/longsor/data/`: `kejadian.json`, `tanah.json`, `kerentanan.json`, `pvmbg.json`, `tanggapan_pvmbg.json`, `uji_balik.json`, `nowcast.json`. Tidak ada rute Worker, tabel D1, atau prefiks R2 khusus longsor; foto warga lewat registri (`foto_kategori`: Longsor, Retakan tanah, Evakuasi, Lainnya). Workflow: `lintas.yml:274` menjalankan `model.py diri` lalu `model.py harian` dan meng-commit `public/longsor/data/nowcast.json` (di langkah "Panen MIROVA, GDO, nowcast longsor"). Panen berat (`hujan_riwayat.py`, `lab_*`, `kerentanan`, `uji`) dijalankan lokal. Uji: `node --test tests/longsor/longsor.test.mjs`; `python3 scripts/longsor/dasar.py`, `rumus.py`, `model.py diri`, `kejadian.py uji`, `hujan_riwayat.py uji`, `lab_lereng.py uji`, `lereng_dem.py uji`, `lereng_bangunan.py uji`. Pemeriksa: `validasi-model`.
