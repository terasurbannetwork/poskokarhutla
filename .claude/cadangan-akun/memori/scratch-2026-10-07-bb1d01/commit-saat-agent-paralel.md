---
name: commit-saat-agent-paralel
description: Jangan commit di latar saat agent paralel menyunting worktree yang sama; pakai commit berpath eksplisit; iCloud mengosongkan berkas di ~/Documents
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8194da3f-90e2-4a9b-ab9a-e2052f457c1d
  modified: 2026-10-08T15:20:03.950Z
---

Saat banyak sub-agent menyunting satu worktree, orkestrator commit hanya dengan `git commit -- <path...>` (path eksplisit), di foreground, dan tidak pernah di latar. `git add` lalu `git commit` biasa menyapu berkas staged milik commit lain, dan lint-staged (husky pre-commit) menyimpan/memulihkan cadangan stash sehingga editan agent yang ditulis selama commit berjalan bisa tertimpa versi lama (kejadian Worth It all-in 8 Okt 2026: migrasi 20261009860000 dan hasil paket masuk/admin/legal hilang, dipulihkan dari `stash@{0}` lint-staged).

**Why:** pekerjaan agent hilang diam-diam; ketahuan hanya karena laporan agent tidak cocok dengan isi disk.

**How to apply:** sesudah tiap commit, cek berkas yang dilaporkan agent benar-benar ada (`git ls-files`, grep penanda). Bila hilang, cari di `git stash list` (cadangan lint-staged) dan pulihkan hanya berkas yang sejak itu tidak diubah lagi.

Juga: repo di `~/Documents/GitHub` disinkron iCloud dan berkasnya bisa jadi "dataless" (terbaca 0 byte), merusak node_modules/Next/ESLint. Cek `find . -type f -flags +dataless`; pulihkan berkas terlacak dari HEAD; taruh node_modules/.next di folder `*.nosync` + symlink. Saran permanen ke pemilik: matikan Optimize Mac Storage atau pindahkan repo keluar dari Documents. Lihat [[worth-it-all-in]].
