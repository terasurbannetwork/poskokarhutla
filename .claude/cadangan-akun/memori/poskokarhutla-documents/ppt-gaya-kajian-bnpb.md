---
name: ppt-gaya-kajian-bnpb
description: Owner's preferred BNPB analytical deck style (Grand Design decks, 26 Oct 2026); small fonts OK, whitespace must be filled with more data
metadata:
  type: feedback
---

On 26 Oct 2026 the owner shared four BNPB Grand Design decks as the style they like (navy 051C2C + orange D9600B, panels with header band and confidence pills such as Resmi/Asumsi kebijakan, KPI strips, small-caps table headers, coded recommendations table, 2x4 conclusion grid with orange "Arahan yang diminta" band). Only complaint: too much white space. Implemented as `"gaya": "kajian"` in ppt-konsultan (`mesin/kajian.js`, `references/gaya-bnpb.md`).

**Why:** owner said "ukuran hurufnya ga masalah kecil tapi white spacenya ga banyak ... banyakin aja datanya": small text reads as too small only because panels are half empty.

**How to apply:** keep small fonts (7 pt floor in kajian style); fill panels with more rows, columns, number blocks, or a second figure instead of enlarging text; never stretch a panel taller than its content. Language vetoes from the same review: no generic title labels like "Pesan Kunci: ..., empat keputusan ..." (reads as AI slop), and never make a data source the actor ("DIBI mencatat") but write "Berdasarkan data DIBI, terdapat ...". Both are gated in `periksa.py`/`bahasa.py`. Earlier veto on dark backgrounds still applies, so the kajian cover stays light unless the owner says otherwise. Related: [[ppt-keputusan-selera]], [[ppt-merek-bnpb]].
