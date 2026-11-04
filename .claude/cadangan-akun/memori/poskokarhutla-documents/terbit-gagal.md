---
name: terbit-gagal
description: "After every push, confirm the \"Terbitkan tampilan\" run succeeded and live data is fresh; push success ≠ live"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b482387d-9ec5-4073-8e4a-e175ce6969a6
  modified: 2026-10-16T10:07:23.210Z
---

16 Oct 2026: two of my pushes (10bdfc6, f8e818a) never went live — terbit.yml failed with Cloudflare "Maximum number of _headers rules limit of 100 exceeded" (scripts/terbit/versi.py wrote one rule per versioned file; new hazard modules pushed it to 136). I told the owner "sudah tayang" after only curling a few URLs. The same day the owner found live data stale (titik 91 h, banjir/BMKG 3 days) although data workflows reported success. Owner: "Catat ya biar ga gagal lagi".

**Why:** a green `git push` and a 200 on a URL do not prove the new version deployed; data workflows can "succeed" without the data reaching production.

**How to apply:** after each push: `gh run list --workflow terbit.yml --limit 1` until it completes, and it must be success; then check one changed asset on centurisk97.id (site moved there 22 Oct 2026, see [[dua-worker]]) contains the new code, and `curl /api/status` shows no `basi` for aktif sources. Never report "tayang" before that. Adding many new static files: run `python3 scripts/terbit/versi.py` on a temp copy of public/ and count `_headers` rules (limit 100). Related: [[kendali-mutu]]
