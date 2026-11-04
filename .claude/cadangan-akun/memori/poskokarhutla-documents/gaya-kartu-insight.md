---
name: gaya-kartu-insight
description: "Owner's visual rules for poskokarhutla pages — Insight-style cards everywhere, no subtitles/notes/KPI boxes, pill labels, \"provinsi yang sering mengalami karhutla\" wording"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 62bb8712-72a0-4432-9f97-d1655c94c3e1
  modified: 2026-10-13T09:51:07.828Z
---

On poskokarhutla (Pantau Bencana Karhutla) the owner wants every page (Insight, Berita, Tren, Kompleks, Dampak) to use the Insight card format: eyebrow category pill + one-sentence finding title with red highlighted numbers + segmented controls (province select sits right of the title) | chart | footer with centred legend + "Sumber: …". No subtitle/unit lines, no explanatory caveat paragraphs, no navy-header KPI stat boxes (fold the number into the card title). Numbers at bar ends and in table columns become pill labels (often with an icon); every bar chart shows its total above the bar; average lines get a navy "rata-rata" pill. Never write "9 provinsi prioritas" in UI text — use "provinsi yang sering mengalami karhutla". Every hover tooltip has a header band and label/value columns; up/down changes coloured (▲ red, ▼ green); no raw ISO dates. Map Overlay panel = Windy-style small icon tiles, one row per category, white background. Tables: never two-line cells (secondary info gets its own column, smaller text), label column left-aligned, all other columns centered (decision 30 Oct, see [[aturan-berulang]]), long lists paginated (pangantara Paginasi style) not "Tampilkan N" buttons; article titles in tables are links; native selects replaced by the pill PilihCantik dropdown.

**Why:** owner repeatedly rejected plain text notes, native selects, "rb" abbreviations in comparisons, and inconsistent card layouts during the 13 Oct 2026 session ("jelek banget").

**How to apply:** when adding or changing any chart/card/tooltip in this repo, reuse `Insight.ex`, `Insight.pil`, `rapikanTip` (index.html) instead of hand-rolled markup; check new text for "prioritas" wording. Related: [[poskokarhutla-preview]]
