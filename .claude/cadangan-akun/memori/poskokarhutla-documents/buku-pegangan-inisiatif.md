---
name: buku-pegangan-inisiatif
description: "Owner wants every new taste/correction written to Buku Pegangan and skill keputusan-pemilik.md proactively, then republished, without being asked"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 68b5896f-3aa5-474b-967d-6023d8fdb0a4
  modified: 2026-10-27T07:24:43.550Z
---

Every new taste rule or correction the owner gives (deck, layar, data wording) goes immediately into `docs/buku-pegangan/pantau-bencana.md` (next numbered item), `~/.claude/skills/ppt-konsultan/bnpb/references/keputusan-pemilik.md`, rebuilt with `python3 docs/buku-pegangan/bangun.py pantau-bencana` and republished to artifact https://claude.ai/artifact/5sPCWCh2susGkjnmW7tL7Z (same url, never a new artifact).

**Why:** 27 Okt 2026 owner: "Lu harus inisiatif ya memperbarui buku pegangan" — they had to keep asking "catat ya".

**How to apply:** batch the rules from each revision round and publish at the end of that round, in the same turn; mention the new item numbers in the reply. See [[selera-ppt-final]].
