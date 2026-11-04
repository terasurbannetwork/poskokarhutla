---
name: ppt-variasi-tata-letak
description: Owner rejects BNPB decks where every data slide is KPI strip + table + side panel; pick exhibit per question
metadata:
  node_type: memory
  type: feedback
  originSessionId: d6d6a6a0-ae33-4cb2-8841-243feffbd535
  modified: 2026-10-30T16:40:07.988Z
---

Owner (30 Oct 2026) complained that every BNPB deck comes out as the same layout (KPI strip + stretched table + side text panel), even though the ppt-konsultan skill holds 96 archetypes and a 3,325-slide library. Root cause: BNPB decks must go through `bnpb/scripts/deck.py`, which only had table/bar/map content; the archetypes live in the general `mesin/bangun.js`.

**Why:** Owner wants consulting-grade decks: action title, one exhibit chosen for the analytical question, evidence panel, implication strip, source (owner pasted a "McKinsey-style presentation" article and asked these principles be kept).

**How to apply:** For BNPB decks use `temuan-visual` (`corong`, `progres`, `tumpuk`) and the other layouts. Use a table only when exact values matter. `deck.py` has a rhythm gate that rejects three identical visual forms in a row. Principles are recorded in `references/cara-berpikir.md` section 1b. `deck-rehab.json` still fails that gate and needs converting.
