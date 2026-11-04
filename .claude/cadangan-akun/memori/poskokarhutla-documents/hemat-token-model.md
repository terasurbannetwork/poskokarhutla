---
name: hemat-token-model
description: "Owner wants Opus only to plan; execution goes to Haiku when possible, else Sonnet; save tokens everywhere"
metadata:
  node_type: memory
  type: feedback
  originSessionId: ba54ecbb-5c94-4f1a-bf0b-d9865f18d3fb
  modified: 2026-10-29T06:20:06.860Z
---

Opus (the parent session) plans and decides. All execution goes to subagents: Haiku whenever the work is pattern-matching, counting or reporting against written rules, Sonnet for anything that needs reading several files and fixing things. Push every token-saving lever: rtk, caveman, short prompts that name the file or glob, and parallel independent calls.

**Why:** owner asked on 29 Oct 2026. The earlier plan put everything on Sonnet; now Haiku comes first wherever it can do the job.

**How to apply:** small lookups of a handful of tool calls stay in the parent session, since spawning an agent costs more. Anything bigger goes to the cheapest agent that can do it. On 29 Oct rtk was installed via brew (1.1.0, /opt/homebrew/bin/rtk); before that the hook in ~/.claude/settings.json was failing silently. If rtk gain shows nothing, check `which rtk` first. Related: [[kendali-mutu]]

All measured levers (29 Oct: cavemem SessionStart 26.3 KB, 303 skills, MCP rea, superpowers) and the rules live in repo file `docs/buku-pegangan/HEMAT-TOKEN.md`; handbook chapter "Hemat token" summarises it. Global-settings levers there await owner decision.

Applied 29 Oct on owner "Jalankan semua": cavemem hooks+MCP removed, superpowers kept on (owner re-enabled), 209 skills moved to ~/.claude/skills-arsip, MCP rea/hermes disabled for this repo (browseros-neo re-enabled on owner request). Backup ~/.claude/cadangan-hemat-2026-10-29; restore steps in HEMAT-TOKEN.md section 6. Do not re-enable without asking.
