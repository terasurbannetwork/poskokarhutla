---
name: laporan-harian-bnpb
description: "Daily BNPB \"Laporan Kejadian Bencana Harian\" PPTX deck engine lives in ~/Documents/Laporan-Harian-BNPB/mesin; format + owner taste in its README"
metadata:
  node_type: memory
  type: reference
  originSessionId: 733dbc58-eeb0-46e2-9df1-72d0f95e4115
  modified: 2026-10-22T07:47:32.708Z
---

Owner regularly asks for the daily BNPB deck "Laporan Kejadian Bencana Harian" (4 slides: cover, ringkasan+peta, rincian per jenis, penutup; Roboto, navy/oranye/merah). Engine (pptxgenjs + sharp) copied 22 Oct 2026 from volatile /private/tmp scratchpads to `~/Documents/Laporan-Harian-BNPB/mesin/`. New day = copy `harianNN_isi.js` + `buat_harianNN.py`, edit, then `python3 buat_harianNN.py && node harianNN.js`; output in `mesin/out/`. Same engine also builds Paparan Kepala BNPB (presiden_*.js). README there has format and taste.

**Why:** the first copies lived only in session scratchpads under /private/tmp and would vanish on reboot.
**How to apply:** when asked for a daily report or paparan, start from that folder, never rebuild from scratch; keep new build scripts there, not in scratchpad. Related: [[ruang-bnpb]], [[tanpa-titik-tengah]].

**27 Oct 2026, owner verdict: keep the OLD format.** A rebuild of both daily decks in the ppt-konsultan BNPB engine (proyek-laporan, harian 251026 and penanganan 261026) was judged worse: "Ga jadi lebih jelek ternyata. Pakai yang sebelumnya aja". Daily reports (Laporan Kejadian Bencana Harian, Laporan Penanganan Pengendalian Karhutla) stay on the repo generators `data/laporan-bnpb/generator/harian.py` and `penanganan.py` with the owner templates. Do not restyle them with deck.py taste rules unless the owner asks again. The proyek-laporan builders remain only as an archive.
