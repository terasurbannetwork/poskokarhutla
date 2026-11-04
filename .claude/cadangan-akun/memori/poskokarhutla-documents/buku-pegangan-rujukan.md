---
name: buku-pegangan-rujukan
description: Where Buku Pegangan Pantau Bencana lives (source md, build script, artifact URL, daily routine) — the single place for all site tastes, decisions, gates and agent fleet
metadata:
  type: reference
---

Buku Pegangan Pantau Bencana = all tastes, decisions, gates and agent fleet for the Pantau Bencana site, in one place.

- Source: `docs/buku-pegangan/pantau-bencana.md` (about 320 KB). Read this, not a downloaded copy: an export to `~/Downloads/Buku Pegangan Pantau Bencana.md` on 2026-10-29 held only the title block (288 bytes).
- Build: `python3 docs/buku-pegangan/bangun.py pantau-bencana`, output `docs/buku-pegangan/terbit/pantau-bencana.html`.
- Published: https://claude.ai/artifact/5sPCWCh2susGkjnmW7tL7Z (the URL in `ARTIFACT.json`). On 2026-10-29 that artifact counted as outside the user's organization and could not be opened or updated from the current account, so a copy was published to that account: https://claude.ai/artifact/XEdp3R4s42P9kG6dvyXc1Q (repo commit 18d3bd26). Ask the owner which one is canonical before republishing. URLs of the other books live in `docs/buku-pegangan/ARTIFACT.json`.
- Nightly refresh: routine `buku-pegangan-malam`, 23.00 WIB (re-created 4 Nov 2026 on the new account; old `pembaru-buku-pegangan-pb` did not carry over). Sources: prompt log, owner memory, git fix commits; maintains chapter "Mengenal pemilik". Prompt copy in `docs/buku-pegangan/ROUTINE.md`. Canonical artifact is XEdp3R4s42P9kG6dvyXc1Q.

When to update it: see [[buku-pegangan-inisiatif]].
