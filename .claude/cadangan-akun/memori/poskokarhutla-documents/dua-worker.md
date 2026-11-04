---
name: dua-worker
description: "Production worker is centurisk97; public site moved to centurisk97.id on 22 Oct 2026, pantau.terasurban.com deliberately released"
metadata:
  node_type: memory
  type: project
  originSessionId: d34911e6-fb5e-4688-a107-aca73a08cfe0
  modified: 2026-10-22T06:13:37.879Z
---

On 2026-10-17, the custom domain pantau.terasurban.com was found to be served by a second Worker, `centurisk97` (not in the repo, stale: titik basi, older page hash). terbit.yml deploys `poskokarhutla` (wrangler.jsonc name), which was only live at poskokarhutla.terasurbannetwork.workers.dev. Owner was told to move the domain to poskokarhutla in the Cloudflare dashboard.

**Why:** a push showing green in terbit.yml does not prove the public domain changed.
**How to apply:** when checking "tayang", compare pantau.terasurban.com/ and /api/status against poskokarhutla.terasurbannetwork.workers.dev; if they differ, the domain still points to centurisk97. Related: [[terbit-gagal]].

**Resolved later 17 Oct 2026 (commit bf9b1a7):** wrangler.jsonc name changed to `centurisk97`, the worker that holds the domain, secrets and cron. Production = centurisk97; the `poskokarhutla` worker is an orphan without secrets. Do NOT move the domain to poskokarhutla. Staging preview: https://staging-centurisk97.terasurbannetwork.workers.dev (branch `staging`, see [[hanya-main]]).

**Domain moved 22 Oct 2026 (owner confirmed):** the public site is now https://centurisk97.id (HTML behind an admin login gate; JSON/JS/CSS public). pantau.terasurban.com was deliberately released and is NXDOMAIN; do not treat its absence as an outage and do not try to restore it. Check "tayang" on centurisk97.id (an asset or data file, plus /api/status), not on pantau.terasurban.com. **22 Oct 2026, owner: "Jangan ganti domain dulu."** 16 files still reference pantau.terasurban.com (src/ews.js ASAL_PUBLIK, src/pengingat.js SITUS, scripts/bnpb/risiko.py, scripts/gempa/laporan_gempa.py, og/i18n SITUS, canonical/og meta in public/*.html) and repo var URL_STATUS still points there, so jaga/lintas/banjir go red hourly. Do not replace them until the owner says so; mention it only as a known open item. Some workflows still mention the old host (gempa.yml BMKG archive comment, URL_STATUS defaults to poskokarhutla.terasurbannetwork.workers.dev).

**22 Oct 2026 later (owner approved Fase 0 api padam, butir 0.1):** operational refs moved to centurisk97.id (commit c6665052): src/ews.js, src/pengingat.js, scripts/bnpb/risiko.py, URL_STATUS defaults in banjir/jaga/titik/data/lintas.yml, and repo var URL_STATUS = https://centurisk97.id/api/status. Still on old domain on purpose: canonical/og meta in public/*.html, og/i18n SITUS, gempa laporan; change those only when owner asks.
