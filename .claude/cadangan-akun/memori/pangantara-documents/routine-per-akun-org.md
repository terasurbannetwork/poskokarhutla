---
name: routine-per-akun-org
description: Routine Claude Code disimpan lokal per akun × org di claude-code-sessions/<akun>/<org>/scheduled-tasks.json; SKILL.md bukan bukti terdaftar
metadata: 
  node_type: memory
  type: project
  originSessionId: 3e10e217-6edf-44f8-bd3e-682152fb8b7e
  modified: 2026-09-12T14:02:28.811Z
---

Routine (scheduled task) aplikasi Claude Code BUKAN cloud dan BUKAN frontmatter `SKILL.md`.
Jadwal, `enabled`, `cwd`, dan `approvedPermissions` hidup di
`~/Library/Application Support/Claude/claude-code-sessions/<akunUuid>/<orgUuid>/scheduled-tasks.json`,
dipatok per akun × organisasi. `~/.claude/scheduled-tasks/<nama>/SKILL.md` cuma prompt (`name` + `description`).

Kejadian 12 Sep 2026 di Mac mini: login akun/org baru, halaman Routines "No routines yet" padahal 7 folder prompt utuh.
Ditutup dengan daftar ulang lewat `create_scheduled_task` ×7 (stub prompt, lalu pulihkan SKILL.md), salin
`approvedPermissions` + `lastRunAt`, dan `enabled:false` di registri lama (`47e2cdcf…/78271b4d…`).
Registri aktif Mac mini sekarang `7f45c947…/80715bde…`.

**Why:** Dua registri enabled = routine jalan dobel di satu working tree; nol registri = tidak pernah berangkat, dan
`bekal/pasang.sh` hanya `rsync` folder prompt, tidak mendaftarkan apa pun.

**How to apply:** Sesudah ganti akun/org atau pasang mesin baru, jalankan `npm run mesin:status` (memanggil
`scripts/mesin/cek-registri-routine.mjs --cek`) atau `npx vitest run tests/unit/gerbang-routine-terdaftar.test.ts`.
Jangan sunting registri JSON tangan saat app hidup kecuali menyalin izin/stempel; pendaftaran lewat tool. Lihat [[mesin-24-jam-mac-mini]].
