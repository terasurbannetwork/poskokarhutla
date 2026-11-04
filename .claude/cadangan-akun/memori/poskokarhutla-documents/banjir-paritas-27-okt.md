---
name: banjir-paritas-27-okt
description: "27 Oct 2026 all karhutla improvements ported to banjir (commit 46d543a0); open owner items: D1 0064/0065, /uji-lapangan gate, Turnstile on photo"
metadata:
  node_type: memory
  type: project
  originSessionId: 93dbfc1a-3c16-4500-8adb-a4fc0af0e87d
  modified: 2026-10-27T09:05:49.711Z
---

27 Oct 2026, start of rainy season: owner said "semua gas" to port 12 karhutla changes to banjir. Landed in 46d543a0 (+ anchor 70182aa6).

- Daily archive contract: `public/banjir/data/wilayah_hari.json` + `hari/<tgl>.json` + `hari/indeks.json`, written by `scripts/banjir/wilayah_hari.py`; read by `public/banjir/wilayah.js` and `data/laporan-bnpb/generator/banjir_data.py`. Events counted by unique `kejadian_kode`; "terpapar" (not "terdampak"); rob null when not monitored.
- Prospective test pre-registered in `scripts/banjir/PRAREG-PROSPEKTIF.md`, criteria + scoring functions frozen to commit 46d543a0; do not edit scoring functions in `prospektif.py` (it refuses to score).

**Why:** owner pivots to flood season; validasi-model blocked double counting and unanchored verdicts before commit.

**How to apply:** open owner items: apply D1 migrations 0064_push_banjir and 0065_uji_banjir to prod; decide whether instansi officers (not admin/pemirsa) may open /uji-lapangan; Turnstile on photo upload from that form untested. Related: [[plug-and-play]], [[program-15-jam]].
