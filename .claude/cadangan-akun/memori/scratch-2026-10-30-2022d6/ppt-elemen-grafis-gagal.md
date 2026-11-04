---
name: ppt-elemen-grafis-gagal
description: Code-generated decorative graphics on BNPB covers were rejected four times; do not add them by default
metadata:
  type: feedback
---

On 31 Oct 2026 the owner rejected every decorative graphic I generated in code for BNPB covers: the line fan ("jelek banget"), the triangle-cropped photo (the BNPB brand guide also forbids redrawn triangles), the dotted Indonesia map ("jelek"), and the orange "Arus Ketangguhan" ribbons ("Anjing sumpah jelek banget"). The approved cover is clean: sharp stacked photos on the right fading at the seam, a big title filling the column width, a hairline divider, the presenter, the date pill, "© year BNPB" with the italic slogan, the HD BerAKHLAK logo, and the "Ditujukan khusus" pill at the bottom right.

**Why:** Spline- or primitive-based ornaments look amateur next to designer-drawn brand elements like the HUT RI 79 "Aliran Sungai".

**How to apply:** Don't add generated ornaments by default. A brand graphic element should come from a designer-made vector file (SVG or EMF) that the owner supplies or approves; the engine then only places it according to the usage rules. The code stays off by default (`motif`, `elemen`, `latar_sampul`, `gaya_bingkai` tipografi/kartu). Related: [[ppt-variasi-tata-letak]].
