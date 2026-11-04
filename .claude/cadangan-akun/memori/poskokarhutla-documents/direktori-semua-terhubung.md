---
name: direktori-semua-terhubung
description: "In the Direktori Jaringan Kebencanaan every record must link to every related record (person = one profile across pakar/tokoh; org members, makers, funders, publishers all cross-linked)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a3a5d4c7-bb81-46ce-a517-0256d42d1af7
  modified: 2026-10-30T04:36:06.839Z
---

Owner rule (30 Oct 2026): "setiap data harus saling terkoneksi". Every person, organisation, innovation, system, fund, project, journal, book, document, and region links to all related records, shown on both sides (e.g. a pakar who is an IABI member appears on the IABI profile; someone working at ITB appears on the ITB profile; a tokoh who is also a pakar is ONE merged profile).

**Why:** the directory's value is the network ("Direktori Jaringan Kebencanaan"), not isolated lists.

**How to apply:** links are built by scripts/akademisi/hubung.mjs (graf.json, *_id fields, "orang yang sama" edge); every new dataset must be added to hubung.mjs with a test in tests/agen/hubung.test.mjs, and every profile must render a "Terhubung" section from graf.json. Related: [[direktori-akademisi]], [[direktori-tanpa-kasus-kpk]].
