---
name: aturan-ke-gerbang
description: "Owner rule 30 Oct 2026 — every new owner rule goes to a gate test or hook first; memory holds only facts, pointers, unmeasurable taste"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 552185c2-e99d-4e23-bf1b-44dbd94f23bf
  modified: 2026-10-30T11:05:18.615Z
---

Owner (30 Oct 2026, after the memory audit, "Catat hal ini ke depan ya biar lebih baik lagi semuanya"): stop relying on memory for rules. When the owner says "catat"/"catet" or repeats a correction, first ask whether a machine can check it. If it can, write a gate test (tests/agen/**, run by `npm run uji:agen`) or a hook (.claude/settings.json) in the same turn, and fix existing violations in the same commit (no exception list). Memory then gets at most one line: "gerbang: <test file>". Status snapshots (migration numbers, owner to-dos, backlogs) go to docs/STATUS/TIKET in the repo, never memory.

**Why:** the 30 Oct audit (docs/buku-pegangan/AUDIT-ATURAN-HARNESS.md) found memory-only rules broken at scale: "·" in 154 public files, em dash in 67, 9 of 34 pages without the site header. Rules the owner repeated 25+ times were never gated. 22 of 61 memory files were stale status snapshots, and several memories contradicted each other (table alignment, worktree vs AGENTS.md §3.3).

**How to apply:** for a new rule, pick the first that fits: (1) gate test, (2) hook, (3) skill/reference file (PPT rules go to keputusan-pemilik.md), (4) memory only for facts about the owner, pointers, or taste a machine can't measure. Before writing a rule, check it doesn't conflict with an existing one. If it does, ask the owner which wins and delete the loser. The work plan is in the audit file §4. Related: [[kendali-mutu]], [[aturan-berulang]], [[selera-ppt-final]].
