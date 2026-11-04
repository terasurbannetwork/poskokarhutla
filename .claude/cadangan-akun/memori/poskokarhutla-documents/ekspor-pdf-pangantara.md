---
name: ekspor-pdf-pangantara
description: "All PDF exports follow the pangantara PDF kit look (navy band header, centered navy column headers, zebra, page n of m) and carry images; table headers are always centered"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a3a5d4c7-bb81-46ce-a517-0256d42d1af7
  modified: 2026-10-30T08:44:37.224Z
---

Owner rule (30 Oct 2026, repeated): every table header is CENTER-aligned — on screen, in Excel, and in PDF. PDF exports must copy the pangantara visual language in /Users/priyankaalfatehan28/Documents/GitHub/pangantara/lib/pdf/kit.ts: navy gradient band at the top (brand label, bold title, up to 3 label/value pairs on the right), a 2px navy2 accent line, navy column headers repeated on every page, light zebra rows, label column left, numbers and other columns centered (decision 30 Oct), grid #e3e9f2, footer "Hal n dari m". Exports must include images (photos, logos), not a plain text table; short identifiers instead of long URLs.

**Why:** the owner judged the plain jsPDF table "masa gini doang" and has asked for centered headers many times.

**How to apply:** for /direktori and any new export, build the PDF from a print-styled HTML page (images load without CORS) following that kit; check headers are centered before showing the owner. Related: [[aturan-berulang]], [[ppt-tabel-dan-cutoff]].
