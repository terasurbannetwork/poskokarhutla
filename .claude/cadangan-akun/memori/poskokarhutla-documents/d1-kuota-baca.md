---
name: d1-kuota-baca
description: Production D1 is on the Free tier (5M rows read/day); 28 Oct 2026 the whole site went 500 when SIHKA status + tugas_api scans exhausted it
metadata:
  node_type: memory
  type: project
  originSessionId: 97ceb9e2-a06b-41b8-a855-d20a7aec52da
  modified: 2026-10-27T18:57:46.732Z
---

Production D1 `poskowarga` runs on the Cloudflare Free tier: 5 million rows read per day, reset 00:00 UTC (07.00 WIB). When it is exhausted every D1-backed route fails (worker error 1101, /api/status 503).

28 Oct 2026 incident: SIHKA status query (~250k rows per run) was called every 10 minutes via perbaruiHujan, plus a per-minute tugas_api scan in peringatan.js without a fitting index. Hotfix 5338162a: one jeda (180 min) inside bangunStatus in src/sihka.js, and migration 0072 index tugas_api(level, status, dummy, dibuat) — owner applies 0072 to prod.

**Why:** any new per-minute or per-10-minute cron query that scans a growing table can take the whole site down, not just its own feature.

**How to apply:** before adding cron work, estimate rows read per run × runs per day; check with `npx wrangler d1 insights poskowarga --sort-by reads --sort-direction DESC --timePeriod 1d --json` (reads analytics, does not spend D1 quota). Keep daily total well under 5M or ask owner about Workers Paid. Related: [[terbit-gagal]].
