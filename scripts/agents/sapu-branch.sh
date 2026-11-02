#!/bin/bash
# Pemilik tidak mau branch menumpuk (2 Nov 2026). Dipanggil hook Stop tiap
# sesi selesai menjawab: hapus branch lokal yang SELURUH commit-nya sudah ada
# di main. Worktree dilepas tanpa --force, jadi yang terkunci sesi lain atau
# masih punya ubahan belum commit otomatis ditolak git dan aman.
cd "$(dirname "$0")/../.." || exit 0
for b in $(git for-each-ref --format='%(refname:short)' refs/heads | grep -v '^main$'); do
  [ "$(git rev-list --count "main..$b" 2>/dev/null)" = 0 ] || continue
  wt=$(git worktree list --porcelain | awk -v r="branch refs/heads/$b" '/^worktree /{p=substr($0,10)} $0==r{print p}')
  if [ -n "$wt" ]; then git worktree remove "$wt" 2>/dev/null || continue; fi
  git branch -d "$b" >/dev/null 2>&1
done
git worktree prune
