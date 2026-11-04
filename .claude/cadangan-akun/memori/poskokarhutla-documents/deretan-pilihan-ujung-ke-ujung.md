---
name: deretan-pilihan-ujung-ke-ujung
description: "Every row of choices (segments, sub-tabs, filter pills, summary chips) spans the full container width edge to edge, evenly divided, each with an icon"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a3a5d4c7-bb81-46ce-a517-0256d42d1af7
  modified: 2026-10-30T06:08:58.869Z
---

Owner rule (30 Oct 2026, said several times, "catet ya"): any row of selectable options — segmented controls, sub-tabs, status/summary filter pills, tab bars — must stretch edge to edge across its container (same width as the panels around it), with buttons divided evenly and an icon on every button. No narrow centered pill groups. Status pills use meaningful colors (running/active = green, done/closed = grey, preparing = amber, cancelled = red) and Indonesian labels.

Repeated again 30 Oct afternoon ("Catat") for the h-index/Karya/Sitasi sort toggle (.ak-urut) inside profile cards: it applies to EVERY toggle group, including small ones inside cards and sheets, not only top-level segments. Gate: tests/agen/direktori-seg.test.mjs.

**Why:** narrow centered pill groups look unfinished next to full-width panels; the owner corrected this repeatedly on /direktori.

**How to apply:** check every new or changed choice row on any page before showing the owner; tell UI subagents this rule explicitly. Related: [[aturan-berulang]], [[tanpa-titik-tengah]].
