---
name: gas-menyapu
description: "Owner's GitHub Desktop \"gas\" commits sweep every session's uncommitted working-tree changes and push them; never leave half-finished or not-yet-safe edits in the tree"
metadata:
  node_type: memory
  type: project
  originSessionId: c25baee3-0a11-45d7-9dd6-c23c00a203d6
  modified: 2026-10-19T08:24:15.553Z
---

19 Oct 2026: I prepared a registry change (staleness thresholds for berita_* in public/bencana.json) and deliberately held it uncommitted until the data was fresh. Within minutes the owner's GitHub Desktop commit "gas" (ae2cbd5) swept it, plus other sessions' files, and pushed it to main. The owner pushes workflow files this way too, because the CLI token lacks `workflow` scope.

**Why:** the owner commits "everything changed" from GitHub Desktop several times an hour. In this repo the working tree is effectively public within minutes.

**How to apply:** do not "hold" an edit in the tree as a safety measure. Either keep it outside the repo (scratchpad) until it is safe to ship, or make it safe to ship immediately. Assume any edit in the tree can go live at the next push. Related: [[kendali-mutu]], [[terbit-gagal]], [[hanya-main]]
