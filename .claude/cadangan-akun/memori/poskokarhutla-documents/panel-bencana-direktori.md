---
name: panel-bencana-direktori
description: "Where the disaster-type filter panel appears on /direktori (multi-select; hidden on tokoh, wilayah, riset, inovasi)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a3a5d4c7-bb81-46ce-a517-0256d42d1af7
  modified: 2026-10-30T07:51:52.512Z
---

Owner decisions (30 Oct 2026) on the /direktori disaster-type chip panel (.ak-bpanel):
- It is multi-select like a checklist (OR filter, URL ?bencana=a,b), "Semua bencana" clears.
- Hidden on Tokoh publik, Lembaga (has its own kategori chips), Sistem data (has Per rumpun chart), Pendanaan, Wilayah, all Riset sub-tabs (Riset daerah, Kejadian besar, Pusat studi, Aset riset) and Inovasi (Inovasi filters via clickable "Per rumpun" bars instead). Shown on Pakar (Akademisi) and Pustaka only.
- One source of truth: letakBencana() + BENCANA_VIEW in public/akademisi.js; never add a second visibility rule elsewhere (that caused regressions).

**Why:** the owner removed it tab by tab where it duplicated another filter or did not actually filter.

**How to apply:** when adding a tab or sub-view, decide explicitly whether the panel filters it; default hidden. Related: [[deretan-pilihan-ujung-ke-ujung]], [[bagian-dalam-kartu]].
