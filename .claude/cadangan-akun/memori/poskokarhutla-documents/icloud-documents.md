---
name: icloud-documents
description: "poskokarhutla lives in iCloud-synced ~/Documents; deleted files resurrect and git ops hang — never `git add -A`, stage explicit paths"
metadata:
  node_type: memory
  type: project
  originSessionId: b482387d-9ec5-4073-8e4a-e175ce6969a6
  modified: 2026-11-02T09:21:04.173Z
---

16–17 Oct 2026: the repo is at ~/Documents/GitHub/poskokarhutla and ~/Documents is synced by iCloud Drive. CSS copies deleted in commit 02e7568 (public/banjir/*.css, public/{gempa,gunungapi,udara}/*.css, gempa/kartu.js) reappeared hours later as untracked files with the old mtime and -rw------- perms; `git add`, `git status` and `git fetch` intermittently hung for minutes. This is also the likely source of the `* 2.*` stray copies AGENTS.md warns about.

**Why:** iCloud restores/locks files it is syncing, racing git.

**How to apply:** stage only explicit paths (never `git add -A public`), check `git status --short | grep '^??'` before committing and delete resurrected copies that nothing references; wrap network git in a timeout (`perl -e 'alarm 60; exec @ARGV' git push`). Suggest to the owner moving the clone outside iCloud (e.g. ~/Developer) when convenient. Related: [[hanya-main]], [[hanya-main]]

17 Oct 2026, 02:00: git add of 7 files hung 1.5 h in the iCloud clone. Fix used: a fresh clone at ~/Developer/poskokarhutla (outside iCloud, branch main only, node_modules symlinked from the old clone) — commit/push there took seconds. Work from ~/Developer/poskokarhutla from now on; brief agents with that path.

2 Nov 2026: the ~/Developer clone had been deleted; iCloud wedged again (gate runs and git status hung for hours, agents stalled at 600 s, an owner "gas" commit 4d4df7ff sat unpushed). Owner approved moving: fresh clone recreated at ~/Developer/poskokarhutla; session changes moved by 3-way merge (base = last pushed commit, not the unpushed gas commit, which already contained them) and pushed from there as 15b1efd0. Brief agents with the ~/Developer path.

2 Nov 2026, 16:30: GitHub Desktop said "Can't find poskokarhutla" because iCloud had evicted 20 `.git/objects/pack` files (`ls -lO` flag `dataless`); `brctl download` stayed at 0%. Diagnose with `/bin/ls -lO .git/objects/pack | grep dataless`. The fresh clone lacks gitignored local data: copied `data/raw` (10 GB, private logbook etc.), `.wrangler`, `.dev.vars` from the old copy with `rsync -a --ignore-existing`; old iCloud copy left in place for the owner to delete. Owner should point GitHub Desktop at ~/Developer/poskokarhutla.
