---
name: selera-teks-grafik
description: Owner taste 29 Oct 2026: paragraph text justified; every chart/figure must be interactive (hover tooltip)
metadata:
  type: feedback
---

Paragraph text blocks (summaries, bios, narrative paragraphs) are always `text-align: justify` (with `hyphens: auto`).

Every chart or figure is always interactive: hover or touch shows a guide line, a highlighted point, and a tooltip with the value and the change from the previous point. Static SVG charts are not enough.

**Why:** the owner said "Agar justify. Lu catet lah" and "grafik atau figur gini selalu pengen interaktif. Catat" while reviewing /akademisi on 29 Oct 2026.

**How to apply:** apply to every new or touched page on centurisk97.id and to artifacts. Reference implementation: `grafik()` + `sorotGrafik()` in `public/akademisi.js`. Related: [[aturan-berulang]], [[kepala-situs-wajib]].
