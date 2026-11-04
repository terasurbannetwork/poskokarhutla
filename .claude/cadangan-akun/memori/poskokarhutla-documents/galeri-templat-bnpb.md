---
name: galeri-templat-bnpb
description: "322 numbered BNPB slide templates (T-sN-NN) in ppt-konsultan; gallery, status, owner gate decisions 2-3 Nov 2026"
metadata:
  node_type: memory
  type: project
  originSessionId: e9df044c-3b6b-432c-88ae-3ed47fc5f722
  modified: 2026-11-03T04:05:25.068Z
---

Galeri pola BNPB: `~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-templat/` (`GALERI.md`, `galeri-templat.pdf`,
`templat-semua.jsonl`; rebuild `scripts/galeri_templat.py`). 7 groups: s1-s6 copy McKinsey/BCG/PwC/Bain mutu-5 slides,
s7 = owner's 31 Oct reference slides (Pertamina/Danantara style). Sesi arah gives each slide a T-code.

State 3 Nov 2026 (final): 28 of 33 group decks pass gates; 5 fail on real empty panel space left on purpose (structure
kept): s1-3, s1-4, s1-5, s2-3, s2-4 (see CELAH.md). s1-s7 all checked by a clean verifier; mirip averages 2.0-3.6 of 5.
s1/s2 spek were edited directly: never rerun their buat_spek.py.

**Why:** owner wanted all reference slides rebuilt up front, then approved stricter gates ("Pasang gerbang").
**How to apply:** owner decisions: layout modules (PLOT = False) panel limit 15%, text/table panels 5%, slide 25%; judul
never describes colour/layout; justify stays on (1 Nov decision beats old narrow-column-left rule). Waiting on owner: 3D
illustrations with licence, flag SVG download permission (PH, AU, CN, VN), regulation PDFs for mockups. See [[ppt-konsultan]].
