---
name: stop-hook-global
description: Spinner hangs after a finished turn were caused by pangantara auto-commit Stop hooks in ~/.claude/settings.json; removed 19 Oct 2026
metadata:
  node_type: memory
  type: project
  originSessionId: 8a48da22-1d5e-4297-ac97-de99cf268b7f
  modified: 2026-10-19T06:10:14.096Z
---

On 19 Oct 2026 the owner removed two global Stop hooks from `~/.claude/settings.json`. Both ran pangantara's `auto-commit-push.sh` (git in iCloud, timeouts of 240 s and 1800 s), which kept the spinner going in every repo after Claude had finished. Only the cavemem Stop hook is left. The backup is `~/.claude/settings.json.bak-stophook`.

**Why:** the owner repeatedly had to stop sessions by hand. See [[icloud-documents]].
**How to apply:** if "spinner after done" comes back, first check `jq '.hooks.Stop' ~/.claude/settings.json`. Running `npm run mesin:pasang` in pangantara re-adds `stop-luar-repo.sh`. The auto-mode classifier blocks Claude from editing this file, so give the owner the command to run.
