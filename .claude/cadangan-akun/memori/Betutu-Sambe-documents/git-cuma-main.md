---
name: git-cuma-main
description: Pemilik mau repo hanya punya branch main; worktree/branch agent wajib dihapus sesudah ter-push (27 Sep 2026)
metadata:
  type: feedback
---

Pemilik melihat 10 branch & 4 worktree di GitHub Desktop dan menegur: "jadikan cuma ada main".

**Why:** branch sisa agent membingungkan pemilik di GitHub Desktop; semua kerja memang ke main.
**How to apply:** tiap agent ber-worktree wajib, sesudah kerjanya ter-push ke main, menjalankan `git worktree remove <path>` + `git branch -d <branch>`; orkestrator mengecek `git branch` & `git worktree list` di akhir tugas. Jangan pernah push branch ke remote.
