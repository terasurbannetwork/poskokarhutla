---
name: kendali-mutu
description: Owner is a perfectionist; every subagent output must be reviewed by the main session line by line and by a clean verifier before commit
metadata:
  node_type: memory
  type: feedback
  originSessionId: b482387d-9ec5-4073-8e4a-e175ce6969a6
  modified: 2026-10-16T04:48:27.589Z
---

Owner (16 Oct 2026, during the 20-hour run): "Gw adalah perfeksionis sedetail itu... lu harus control freak dan lu harus review lagi kerjaan agent lu." Any mistake they find after delivery is treated as a failure.

**Why:** owner checks every screen down to single numbers and wording; agents' self-reports are not proof.

**How to apply:** never commit a subagent's diff on its report alone. Read the diff yourself, check the screen in the browser preview (1440 and 390, console), run the gates, and dispatch a separate clean-context verifier for non-trivial changes. Look especially for side effects of bulk replacements (awkward phrasing, broken i18n keys). Related: [[aturan-berulang]]

Also (16 Oct 2026): the git token on this machine has no `workflow` scope — any commit touching `.github/workflows/**` is rejected on push. Wire new pipeline steps through scripts the existing workflow already calls (e.g. end of `scripts/banjir/posko.py`), and tell agents not to edit workflows.

Gate ownership check (`gerbang-ilmu-agent`) reads TRACKED files only: run `npm run uji:agen` after `git add`, before commit, or new files slip past it (happened twice 16 Oct).

Never remove an agent's worktree (`git worktree remove -f -f`) until its completion notification has arrived — after a session interruption some background agents survive; removing their worktree destroyed one mid-task (16 Oct). Locked worktrees = agent likely alive.

When the owner interrupts the conversation ("[Request interrupted by user]"), every background agent dies with it (16 Oct: all four died at 13:40, discovered 80 min later only because the owner noticed the empty Background tasks panel). After any interruption, immediately check worktree file mtimes; relaunch dead agents with a salvage step (`git -C <old worktree> diff <base> | git apply --3way` + copy untracked files) and tell the owner.
