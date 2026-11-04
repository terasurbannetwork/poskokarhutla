---
name: ppt-tabel-dan-cutoff
description: "BNPB deck rules: headers centered; CUT OFF pill only on daily-data decks (gated in deck.py since 1 Nov); title fills line; presenter on cover"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 68b5896f-3aa5-474b-967d-6023d8fdb0a4
  modified: 2026-10-26T03:31:19.788Z
---

All table column headers are plain uppercase text centered over their column, never pills or colored labels, in every deck ("Catat agar semua header rata tengah"; "Gw ga mau header dibuat label gini ... tidak dalam bentuk pil", 26 Oct 2026). The BNPB engine (bnpb/scripts/deck.py, peringkat and lampiran tables) now does this by default.

The owner removed the CUT OFF DATA pill from the Australia meeting deck ("Cut off gini: gausah ada ya", 26 Oct) and again from the Merauke aerial deck (1 Nov). Since 1 Nov 2026 deck.py enforces it: the pill is drawn only when spek format is harian/penanganan or `data_harian: true` (see keputusan-pemilik.md, 1 Nov gate list).

A panel that is 13–15% empty still reads as "white space banyak banget" to the owner. The D-40 limit is now 10% (bar-chart panels 45%).

Slide titles fill the first line to the edge of the title box. Never balance the two lines, which leaves the right side empty ("kanan tuh kosong"). The second line must hold at least two words. The engine does this with seimbang_runs(penuh=True).

A deck presented by an official names the presenter on the cover, as the daily report does: DISAMPAIKAN OLEH, then full name and degrees (Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si., M.Si. (Han)), then the title Kepala Badan Nasional Penanggulangan Bencana. Use spec field `penyaji`. Never write only "Disampaikan oleh Kepala BNPB".

Confidence pills (Resmi, Terverifikasi, Estimasi model) are no longer shown on slides, from 26 Oct 2026 onward ("Ga perlu ada ini ya Resmi dan Terverifikasi ke depan"). The engine default is `slide.pil_keyakinan: false`; labels stay in the spec and the manifest, and QA D-14 follows the switch.

Text that sits beside an icon or code (finding rows, list rows) is vertically centered on the icon, never top-aligned ("harusnya rata middle", 26 Oct 2026). The engine centers daftar_temuan rows.

No visible codes: no "Finding A.1" or "Temuan B.1" labels on finding rows, and no "A1." prefix on slide titles ("Gw ga pengen deh ada Finding gini gini", 26 Oct 2026). The engine default is `slide.kode_temuan: false`. Codes may stay in the spec for tracking.

Table body cells follow centered headers: the first (label) column is left-aligned, every other text and number column is centered. When the label column leaves more than 40% of the width empty, the engine spreads the spare width across the metric columns so numbers do not bunch on the right.

Text that runs to 2–3 lines (bullet lists, strip text) is justified, with the last line left-aligned ("ke depannya ... kalo dia 2-3 baris ... justify", 26 Oct 2026). Bullets are native PowerPoint bullets in Roboto so the space after the bullet does not stretch. Status values in tables are shown as labelled pills, e.g. Response red and Alert outlined orange (column option `pil`). Disaster-type tables use row icons instead of rank numbers (`ikon_baris`). Never write "dashboard" or "today" in deck text; give the date.

**Why:** the owner judges the render by eye. Gate thresholds that pass at 15% still look empty to them.
**How to apply:** fill panels with data rows or numbered bullets until D-40 passes at 10%. Never stretch rows. Related: [[ppt-gaya-kajian-bnpb]], [[ppt-keputusan-selera]].
