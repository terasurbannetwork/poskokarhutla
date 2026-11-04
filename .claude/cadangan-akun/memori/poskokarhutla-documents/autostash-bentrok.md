---
name: autostash-bentrok
description: "git pull --rebase --autostash in the shared checkout conflicts on other sessions' .claude/ilmu-agent files and stages everything"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 7ef992cd-4f1e-4eeb-9d8c-4e9448558421
  modified: 2026-10-30T07:14:23.303Z
---

When a push is rejected in this repo, `git pull --rebase --autostash` pops other sessions' uncommitted edits back with conflicts (27 Oct 2026: `.claude/ilmu-agent/pipa-data.md` and `jejak/pipa-data.jsonl`), leaves every file staged, and keeps the stash.

30 Oct 2026: `git stash -- <file>` + `git stash pop` around a pull popped a 3-day-old autostash instead (the path stash created nothing), leaving 19 other sessions' files as UU conflicts; the owner almost committed them in GitHub Desktop. Fixed with `git checkout HEAD -- <UU files>` (stash kept). Rule: NEVER use git stash in this repo; to pull with a dirty tree use `git pull --no-rebase --no-edit`, or commit first.

**Why:** the checkout is shared by many live sessions, and the ilmu-agent logs are append-only files that several agents write at once, so upstream and the stash both add lines at the same place.

**How to apply:** after such a pull, check `git status` and `git stash list`. Resolve ilmu conflicts by keeping both sides (they are appends: delete the marker lines, then make sure each jsonl line parses). A better option is `git pull --no-rebase --no-edit`: a merge works with a dirty tree as long as no file overlaps, and it worked cleanly on 28 Oct. If you do use the autostash pull, run `git reset` afterwards to unstage the other sessions' files, as they were before the pull, and `git stash drop`. Related: [[gas-menyapu]], [[icloud-documents]].
