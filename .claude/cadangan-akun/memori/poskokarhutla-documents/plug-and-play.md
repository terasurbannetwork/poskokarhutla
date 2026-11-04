---
name: plug-and-play
description: "New hazard modules must plug karhutla's own modules via registry per MODUL-PLUG-AND-PLAY.md; no invented layouts/models/copies"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b482387d-9ec5-4073-8e4a-e175ce6969a6
  modified: 2026-10-16T09:26:09.305Z
---

Owner (16 Oct 2026): "modulnya yang dari karhutla kaya plug and play ya. Jadi jangan ngide dengan model-model lain. Lu tetap berpaku pada artifacts."

**Why:** agents building cuaca/udara/gunungapi/kekeringan/gempa copied banjir CSS three times, wrote their own card adapters (gempa/kartu.js), and used navigator.share instead of the karhutla Bagikan engine — each module drifting into its own variant.

**How to apply:** every new hazard page must reuse karhutla modules exactly as `docs/multi-bencana/MODUL-PLUG-AND-PLAY.md` classifies them (A: use as-is; B: registry list/migration; C: shared engine + per-hazard adapter registered from the hazard's own file; D: copy only the pattern). No copied CSS/JS between modules: shared pieces live in `public/inti/`. No new models or layouts beyond what the published artifacts (RENCANA-20-JAM, RINCI-*, PAKET-FITUR, buku pegangan artifact) specify. Put this rule in every agent brief. Related: [[aturan-berulang]], [[kendali-mutu]]

Clarified same day: "kalo memang perlu menambahkan konteks baru atau emang ga sesuai ya ga apa. Cuma ya kalo sesuai ya pakai lah... kodingannya udah ada semua ya tiru aja semua. Biar bisa kaya mirroring gitu." So: default = mirror karhutla's code/feature exactly; adding hazard-specific context (e.g. tsunami status, volcano radius) is allowed when karhutla has no equivalent or it genuinely doesn't fit — but state why in the report.
