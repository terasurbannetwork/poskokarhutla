---
name: commit-path-berkas-baru
description: git commit -- <path> tidak membawa berkas baru (untracked); wajib git add -- <path> dulu — sempat memecah deploy produksi BS 3 Okt 2026
metadata:
  type: feedback
---

Saat index git dipakai bersama (agent lain/GitHub Desktop men-stage berkas setengah jadi), orkestrator meng-commit per path dengan `git commit -- <path>`. Itu HANYA membawa berkas yang sudah terlacak; komponen baru tertinggal, build Vercel gagal (impor hilang), produksi tertahan di versi lama.

**Why:** commit bc6b961 (3 Okt 2026) tanpa RincianMenu.tsx dkk. → deploy Error; pemilik yang tanpa sengaja menyelamatkan lewat commit "gasg".
**How to apply:** selalu `git add -- <path...> && git commit -m … -- <path...>`; sesudah push cek `git status --short` tidak menyisakan `??` di wilayah yang baru di-commit, dan cek status deploy Vercel. Lihat [[git-cuma-main]].
