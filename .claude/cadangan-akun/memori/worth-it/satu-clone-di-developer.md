---
name: satu-clone-di-developer
description: Worth It cuma dikerjakan di ~/Developer/worth-it; clone ~/Documents/GitHub/worth-it (iCloud) dilarang dipakai
metadata:
  node_type: memory
  type: feedback
  originSessionId: c237fac7-eff4-4834-a285-e3d639efc302
  modified: 2026-10-11T06:52:48.165Z
---

Satu-satunya clone kerja Worth It adalah `~/Developer/worth-it`. Clone lama di
`~/Documents/GitHub/worth-it` ada di folder yang disinkron iCloud dan TIDAK boleh
dipakai untuk commit, merge, atau push.

**Why:** 11 Okt 2026 clone Documents ternyata menyimpan 46 commit (gelombang 3-5)
yang tak pernah di-push, sementara GitHub maju 14 commit lewat clone Developer dan
sesi cloud. Akibatnya 17 berkas konflik, dua sesi Claude menggabungkan bersamaan di
worktree yang sama, dan GitHub Desktop pemilik ikut membuka merge sendiri. iCloud
juga pernah menggusur isi repo (berkas dataless) dan melahirkan ref sampah
`main 2` / `HEAD 2`. Pemilik: "gw ga mau ada masalah dengan icloud lagi".

**How to apply:** sebelum kerja git di Worth It, pastikan cwd `~/Developer/worth-it`.
Bila diminta menyentuh repo di `~/Documents/GitHub/*`, ingatkan risiko iCloud dulu.
Sebelum merge besar, cek `ListAgents` supaya tidak ada sesi lain di worktree yang
sama. Branch `claude/*` dari sesi cloud digabung ke main lalu dihapus, jangan
dibiarkan menumpuk.
