---
name: selera-deck-malaysia
description: "Owner's deck taste distilled from the Malaysia bilateral deck revisions (26 Oct 2026): titles, what to delete, tables, icons, wording"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 68b5896f-3aa5-474b-967d-6023d8fdb0a4
  modified: 2026-10-26T13:22:10.119Z
---

Distilled from slide-by-slide corrections on the Malaysia meeting deck (Kepala BNPB with Timbalan Ketua Perwakilan Malaysia, 27 Oct 2026). Project: ppt-konsultan `bnpb/assets/proyek-malaysia`; output `~/Documents/6. Belajar/Pinka/Pertemuan BNPB Malaysia 271026/`.

**Titles**
- Plain, short, formal sentences, usually dictated by the owner word for word. Use them exactly.
  - Examples: "Area terdampak kebakaran di 2026"; "Kerja sama teknologi kedua belah pihak mencakup 7 topik".
- No interpretive add-ons such as "diarahkan pada kemampuan yang belum dimiliki Indonesia".
- Slide 2 is called "Executive Summary", never "Pesan kunci".

**Diplomatic tone**
- Indonesia stays in control and is never needy.
  - "bantuan", not "aset".
  - "Berada dalam kewenangan Pemerintah Indonesia", not "di bawah komando".
  - Offers are "dipertimbangkan sesuai kebutuhan aktual".
- No status darurat, no "siap 3 hari", no "landasan kerja sama", no "butir wicara".
- The delegation lists foreign members only (BNPB people are not listed).

**Delete freely**
- Pita bawah, KPI card strips, "tertinggi" callouts and explanatory bullets are removed when they add nothing.
- Only keep a card strip when the gate needs fill and the cards carry real data.

**Data**
- Per-date phrasing: "Berdasarkan data 26 Oktober 2026, terdapat X firespot di Y provinsi utama".
- Satellite figures are starred, with a source line "*Berdasarkan data satelit NASA FIRMS (VIIRS dan MODIS)".
- Tables show percentages plus a total row.
- Show only the relevant metric (e.g. Aktif only, not Terbakar).
- Separate topics go in separate containers.

**Visual**
- Only the label column is left-aligned; other columns centered (decision 30 Oct). Use `rata: 'l'` on the label column and `bobot` in deck.py tabel_peringkat.
- Bullet lists become icon rows ("bagusin, kasih icon") using panel `temuan` items with short bold lead plus short text.
- Map: label every colored province; legend lists only classes present, with the thresholds inside the legend (no separate "Kelas peta" bullet).

**Why:** owner corrected each of these directly, slide by slide, the evening before the meeting.
**How to apply:** apply on every BNPB bilateral or foreign-partner deck before showing the first draft. Related: [[aturan-deck-26-okt-rinci]], [[ppt-tabel-dan-cutoff]], [[ppt-keputusan-selera]], [[ppt-audiens-asing]].
