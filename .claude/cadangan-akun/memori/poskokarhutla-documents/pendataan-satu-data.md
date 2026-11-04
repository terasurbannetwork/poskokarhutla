---
name: pendataan-satu-data
description: Satu Data BNPB pendataan Fase 1 (/pendataan + /admin/pendataan) live 26 Oct 2026; owner decisions and open items for Fase 2
metadata:
  node_type: memory
  type: project
  originSessionId: 40f90ee1-13dd-4362-808b-81f1027797df
  modified: 2026-10-26T15:51:40.614Z
---

26 Oct 2026: after a BNPB internal data meeting, owner asked for a "Satu Data BNPB" style system. Fase 1 (information gathering + who-has-submitted monitoring) went live on centurisk97.id (commits 048f5d82, 8ed006c0). Design: docs/bnpb/PENDATAAN.md; form fields: public/bnpb/pendataan_spek.js.

Owner decisions: target only 10 BNPB units (Pusdatin, Dit Dalops, Dit Wilayah 1/2/3, Dit RRP/RRI/RRS, Dit Pengelolaan Logistik, Dit Optimasi Jaringan Logistik); every choice has "Lainnya" + manual text; many data entries and many app entries per account; respondents self-register (approved by Super Admin); built on the website, Fase 1 only. End goals: richer Centurisk97 dashboard, aligned daily disaster + karhutla reports, time-series trend analysis for leadership.

**Why:** owner wants to stop manual data requests between units; Fase 2/3 = data catalogue, per-data access rights, routine input feeding the existing laporan harian/karhutla engines.

**How to apply:** /pendataan is in PUBLIK_TANPA_SESI (centurisk97.id is closed by default). Open items: Turnstile not active in prod (konfig returns null), no tenggat/terlambat yet, no auto-cleanup of old pending accounts, admin screen has no screen test. Related: [[ruang-bnpb]], [[laporan-harian-bnpb]].
