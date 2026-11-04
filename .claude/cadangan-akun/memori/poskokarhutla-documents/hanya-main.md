---
name: hanya-main
description: "Owner wants only the main branch in poskokarhutla — no worktrees, no agent branches"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b482387d-9ec5-4073-8e4a-e175ce6969a6
  modified: 2026-10-17T08:57:53.110Z
---

Owner (16 Oct 2026, after seeing a linked worktree in GitHub Desktop): "Agar cukup main saja ya jangan ada branch".

**Why:** worktrees/branches clutter GitHub Desktop and filled the disk to 96% (see disk history below).

**How to apply:** do not launch agents with `isolation: "worktree"` in this repo; run writing agents directly in the main checkout, one at a time (or in parallel only when their file sets are disjoint and named in the brief). This overrides AGENTS.md §3.3 for this owner. Commit on main with specific paths. If a worktree/branch appears, remove it after its work is merged.

**Staging revoked (17 Oct 2026, 16:00 WIB):** owner said "gw ga mau ada branch" on seeing `staging` in GitHub Desktop; it was deleted locally and on origin. No exceptions now — main only. terbit.yml still lists `staging` in its trigger (harmless, dormant). Related: [[dua-worker]].

27 Oct 2026: staging reappeared (another session pushed "Neraca air Jawa" to it); owner said again "gw ga mau ada branch" and deleted it locally and on origin. Never create or push to any branch other than main; if a session finds another branch, tell the owner and give the delete commands (auto-mode blocks branch deletion from Claude).

Disk history (was memory disk-worktree): on 16 Oct 2026 about 40 worktree agent runs left the Mac 96% full (each worktree carries public/ about 130 MB plus node_modules). If a worktree ever appears, remove it with `git worktree remove -f -f` only after its completion notice arrived, and check `df -h /Users`.
