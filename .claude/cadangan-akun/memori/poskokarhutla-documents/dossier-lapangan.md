---
name: dossier-lapangan
description: "Owner rules for SIPPA field dossiers (26 Oct): plain language, one hose line, numbered route, clickable coords, legend only what's drawn"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 7829cc04-e88e-471f-8a31-95aa661a6ac0
  modified: 2026-10-26T16:08:47.738Z
---

Field-team dossiers (SIPPA pilot Kalteng, 26 Oct 2026) must be readable by field crews, not analysts.

- Plain everyday Indonesian ("naik mobil 29 menit", "parkir di ujung jalan"), no jargon like FRP/MW, t0/t24, G0, kelas jalan "track/markas".
- Satellite base must show fire: Sentinel-2 SWIR (scripts/data/citra.py functions), not old Esri imagery of houses. Pick latest readable scene; SCL marks smoke as cloud.
- Exactly one hose line from one water source to the plot; never draw all PRIMS canals/rivers (looks like many hoses). Unnamed RBI "sungai" is not a water source.
- If no real water, say so (uji darat); never invent a source.
- Route map markers numbered to match the step list (1 berangkat, 2 parkir, 3 petak...), with a legend.
- Every coordinate and map marker clickable to Google Maps.
- Legend shows only symbols actually on that map; color legend for SWIR as swatches, not a paragraph.
- Card titles as visible header bars; kit list as a table; header says "Untuk: <what is tested>".
- Equipment photos: Wikimedia Commons only (CC/PD, credit on card), drawings where none fit; owner said license optional but dossier is a BNPB document.
- 3 landscape pages per site is fine when detail needs it. Owner also wants long-hose (1–2 km) test sites alongside short ones.

**Why:** owner reviewed the first versions and flagged each of these as confusing for crews.
**How to apply:** any field dossier, peta lapangan, or arahan tim. Builder lives in session scratchpad (analisis.py, cetak.py, teks.py); rebuild from there rather than from scratch. Related: [[tanpa-titik-tengah]], [[aturan-berulang]].
