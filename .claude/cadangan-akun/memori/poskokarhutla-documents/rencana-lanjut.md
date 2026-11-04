---
name: rencana-lanjut
description: "Advanced program approved 22 Oct 2026 (Himawari alarm, instant push+email, SLA/kinerja dashboard, calibration, forecast gate, routes, CAP, Gakkum hash, offline crew); all live; owner to-dos remain"
metadata:
  node_type: memory
  type: project
  originSessionId: 9f0a90da-6c0a-4aba-b6cf-fc88fba75318
  modified: 2026-10-22T09:54:50.227Z
---

22 Oct 2026 the owner approved the "level lanjut" list plus a kinerja/SLA analytics dashboard and email alongside push. Contract and status: `docs/bnpb/RENCANA-LANJUT.md` (§1 contracts, §2.1 Worker queue W1–W9, §3 owner to-dos). Everything shipped and live by commit a11a65c1 (terbit success, checked live).

Decisions taken by default (owner may reverse): own road graph before Valhalla; SLA verdict only for existing rules (konfirmasi ≤ 6 h, kabar ≤ 24 h), other stages show percentiles; Rapor BPBD weights unchanged; no person names in darurat push/email; crew page shows tasks in the crew's kabupaten only (max 20); kinerja page+API rights = admin or any staf role.

Honest results: forecast "akan membesar" still hidden (stricter gate, 2 consecutive passes; prospective 17% vs historical ~3% base-rate gap unexplained); drought round 2 failed (728 candidates, best is diagnosis not forecast), pill stays; calibration and dNBR wait for real field data (n ≥ 20).

**Why:** owner wants api padam faster and provable.
**How to apply:** owner still must apply prod D1 migrations 0036–0046, verify Resend domain + EMAIL_FROM, confirm VAPID secrets, set PIPA_TOKEN (Worker + GitHub), set SLA targets, rotate leaked FIRMS/Earthdata keys (`.env 2`). Tests that run the cron must avoid the 3-hour push window (UTC hour %3==0, minute ≥ 25) — see tests/warga/sla_koreksi.test.mjs luarRingkasan. Related: [[api-padam]], [[gas-menyapu]], [[terbit-gagal]].
