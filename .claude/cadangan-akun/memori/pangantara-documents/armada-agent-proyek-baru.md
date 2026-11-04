---
name: armada-agent-proyek-baru
description: vonis 28 Sep 2026 — tiap repo/proyek baru wajib dipasangi armada agent bermodel sejak hari pertama; Gemah Ripah jadi rujukan ramping
metadata:
  node_type: memory
  type: feedback
  originSessionId: 03831242-1b47-4c58-9b91-8cadbaf200dd
  modified: 2026-09-28T13:19:31.458Z
---

Tiap GitHub/proyek baru wajib dipasangi armada agent sejak awal: roster.json + build/ilmu.mjs, agent bermodel (pengerja sonnet, pemeriksa pola haiku), ilmu per agent dari kode nyata, AGENTS.md ramping, gerbang model-agent + ilmu-agent. Langkahnya di `~/.claude/AGEN.md`; rujukan ramping `gemah-ripah/scripts/agents` (33 agent, dipasang 28 Sep 2026, commit 434d181), versi penuh pangantara.

**Why:** pemilik melihat empat agent latar Gemah Ripah jalan di Opus; sub-agent tanpa `model:` ikut model sesi induk, sementara pangantara hemat karena frontmatter-nya.

**How to apply:** SessionStart hook `~/.claude/hooks/armada-agent-proyek.mjs` mengingatkan repo yang belum lengkap; tawarkan pemasangan sebelum kerja besar pertama. Global `~/.claude/settings.json` env `CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-5` jadi jaring pengaman lintas proyek. Pasang lewat worktree bersih kalau checkout dipegang banyak sesi ([[sesi-paralel-lintas-mesin]]).
