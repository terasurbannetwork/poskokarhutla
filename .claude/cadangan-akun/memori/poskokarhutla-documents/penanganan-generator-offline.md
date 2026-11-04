---
name: penanganan-generator-offline
description: "How to run data/laporan-bnpb/generator/penanganan.py fast on this laptop (26 Oct 2026): fixes needed, offline firespot from web, cache rules"
metadata:
  node_type: memory
  type: reference
  originSessionId: 68b5896f-3aa5-474b-967d-6023d8fdb0a4
  modified: 2026-10-26T10:10:47.531Z
---

`data/laporan-bnpb/generator/penanganan.py` builds the 2-slide Laporan Penanganan Pengendalian Karhutla (peta hotspot, tabel 6 provinsi). The full run is slow. `cuaca_riwayat` pulls 25 Open-Meteo batches (~1 min each, 612 land cells), and `firespot_hari` needs about 10 days of FIRMS history.

Fast path used 26 Oct 2026, ~10 seconds:
- Runner: `data/laporan-bnpb/generator/penanganan_web.py` (env `KLUSTER_DIR` = folder of downloaded k<DD>.json; date and jam set on its last line). It monkeypatches `firespot_hari.seri` to read the web archive `https://centurisk97.id/data/kluster_hari/<YYYY-MM-DD>.json`, using `w[prov][4]` = titik firespot hari itu. Hotspot, luas, belum padam and padam come from `satelit.hitung` on the FIRMS CSV cache in `cache/raw/`.
- Cache rule: a cached day is valid only if pulled after the cut-off. So use `--jam` earlier than the pull time, then relabel the cut-off text in the PPTX.
- Pass `--bmkg <wa.txt>` so the pils come from the BMKG WA text, not from weather data.

Fixes applied that day (uncommitted at the time):
- The scripts hard-coded `/Users/alfatehanseptianta`. Replaced with `$HOME` in `harian_peta.mjs`, `harian_ikon.mjs`, `penanganan/peta.mjs` and `penanganan/tambah_peta.py`.
- Subprocess `python3` must be ≥3.12 (f-string backslash). Put the ppt-konsultan `.venv/bin/python` first in PATH as `python3`.
- Playwright 1.63 wants chromium_headless_shell-1248. Symlinked `~/Library/Caches/ms-playwright/chromium_headless_shell-1248` → `-1243`.
- Added `penanganan/logo/81.png` and `82.png` from `public/lambang/provinsi/` (Maluku, Maluku Utara).
- `wa_operasi.bmkg` now accepts PM2.5 lines without "µg/m³".

The web `laporan.json` titik/luas use a different definition than the deck, so never mix them into the table. `peta_karhutla.json` matches the deck (luas, belum) but lags a day. Related: [[deck-urgen-kerjakan-di-berkas]], [[laporan-harian-bnpb]].
