---
name: tinjau-lokal
description: Owner reviews every screen change locally at http://localhost:8800 before/without waiting for push+deploy; always give that link
metadata:
  node_type: memory
  type: feedback
  originSessionId: fd723a4d-d5c3-4f9f-82fd-7d703dd94938
  modified: 2026-11-11T04:15:02.106Z
---

Owner (11 Nov 2026): "ke depan gw mau review di lokal ... otomatis dibuatkan lokalnya, untuk semua sesi". Pushing and waiting for GitHub deploy is too slow.

Server tinjau lokal: `scripts/agents/tinjau_lokal.mjs` on port 8800 — screen code from the working tree, data/API/login proxied from centurisk97.id. Persistent via launchd `id.centurisk97.tinjau-lokal`, which the OWNER installs with `npm run tinjau:pasang` (auto mode blocks Claude from installing launchd agents). Rule lives in AGENTS.md §3.8, gated by tests/agen/gerbang-tinjau-lokal.test.mjs.

**Why:** owner reviews UI themselves; dev_lokal.mjs (wrangler, empty local D1, no staff account) showed "Laporan operasi hanya untuk akun staf" and stale 12 Okt data, so local review was useless.

**How to apply:** after any screen change, end with `http://localhost:8800/<path>`; if 8800 is down, start `npm run tinjau` in background. Bump `?v=` cache versions anyway for production. Owner logs in at localhost:8800/admin/masuk; writes hit production. Related: [[claude-yang-push]].
