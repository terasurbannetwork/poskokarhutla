---
name: ppt-format-lembaga
description: Brand format skills per institution installed 26 Oct 2026 (BNPB, PNRE, METI) and how they layer with ppt-konsultan; open conflicts
metadata:
  type: project
---

Owner works across three institutions. On 26 Oct 2026 owner asked for ONE comprehensive PPT builder skill, so all formats live inside `~/.claude/skills/ppt-konsultan` (no separate ppt-format-* skills): `bnpb/` (owner's deck-bnpb Grand Design engine, deck.py on the owner's template), `format/pnre/`, `format/meti/`. Origins: `ppt-format-bnpb` (from Buku Pegangan Pantau Bencana; repo builders `data/laporan-bnpb/generator/` and `data/kajian-bnpb/bangun/pptx/deck.py` with `templat-bnpb.pptx`), `ppt-format-pnre` (Pertamina NRE x Danantara; Poppins/Arial, teal; image assets NOT included, need the owner's assets folder), `ppt-format-meti` (METI v3 Midnight Energy, full bundle from `Documents/1. METI/Template METI/ppt-format-meti-v3.zip`).

**Why:** the brand format must win over ppt-konsultan's house style (Roboto-only, light covers) for decks under those names.

**How to apply:** route by the institution named in the request (table in ppt-konsultan SKILL.md "Format per lembaga"); keep ppt-konsultan for thinking, library, language/tone gates, clean verifier. Open conflicts reported to owner on 26 Oct: brand skills use dark closings/dividers (BNPB 051C2C, METI and PNRE dark slides) vs owner's earlier "latar gelap ga boleh"; BNPB says "Pesan Kunci" as first content slide while owner called "Pesan Kunci: ..." titles AI slop (resolved as: keep the slide, title must be a finding sentence); METI wants a conclusion box after every chart while BNPB bans separate takeaway boxes; PNRE allows yellow highlighter, BNPB bans it. Related: [[ppt-gaya-kajian-bnpb]], [[ppt-konsultan]].
