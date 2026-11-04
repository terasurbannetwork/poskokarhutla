---
name: multi-bencana-tugas
description: "22 Oct 2026 karhutla ops features (tugas, kartu, ops, push, SLA, laporan harian, paparan) made generic for all hazards; owner to-dos and policy numbers"
metadata:
  node_type: memory
  type: project
  originSessionId: 8b49eb1d-44bf-4739-8225-bbe75a78e4f2
  modified: 2026-10-22T12:48:03.104Z
---

22 Okt 2026: owner asked "semua pengembangan karhutla, lakukan juga di bencana lain". Landed on main (commit 3169c015 plus owner "gas" sweeps), terbit success.

Built: tugas_<id>.json generator (scripts/umum/tugas.py, chained in lintas.yml), migration 0047 tugas_bencana + src/tugas_bencana.js (per-hazard kata/kartu/aturan selesai), Ruang Instansi + layar regu per hazard, ops ICS for all, laporan harian/WA/deck/paparan per hazard (0048 lkb_*, 0049 guards), risiko/F2 add udara/kekeringan/gempa, shared Cerita/video/Lapor Warga (hidden tab like karhutla)/AOD+EFFIS layers.

**Owner to-dos:** apply D1 migrations 0047, 0048, 0049 to prod (until then non-karhutla tasks/laporan degrade silently). Confirm policy numbers: JIWA_MIN=1000 (level-2 task gate, scripts/umum/tugas.py), UMUR_KAJI_CEPAT_JAM=72 (gempa/udara auto-close, src/tugas_bencana.js), LAPORAN_MUNDUR_HARI default 14. Kekeringan tasks are otomatis:false + Hipotesis (see [[kekeringan-hipotesis]]). Rotate FIRMS/Earthdata keys: stray `.env 2` on disk, once tracked in history.

**Why:** owner reviews numbers; these are not sourced. **How to apply:** before touching tugas/laporan for a hazard, read src/tugas_bencana.js map and this ledger. Related: [[api-padam]], [[ruang-instansi]], [[plug-and-play]].
