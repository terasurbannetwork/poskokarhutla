---
name: karhutla-data-sistem
description: "All karhutla figures in decks (hotspot, firespot, burned area, belum padam, affected area) come only from our own system, never from Koordalops/BPBD reports, even when the owner sends those reports"
metadata:
  node_type: memory
  type: feedback
  originSessionId: ba54ecbb-5c94-4f1a-bf0b-d9865f18d3fb
  modified: 2026-10-31T14:43:07.910Z
---

Every karhutla figure in a deck comes from our own system: hotspot, firespot, luas terbakar, belum padam and area terdampak. Use the website and generator outputs, for example `penanganan_*.json` from `data/laporan-bnpb/generator`.

Koordalops, BPBD and laporan harian WA texts are never the source of these numbers, even when the owner pastes those reports and says "update dengan data terbaru". From those reports, use only non-karhutla events, status darurat, and operational facts such as personnel, aircraft and OMC.

**Why:** on 26 Oct 2026 I replaced the Malaysia deck's slide 6 with Koordalops "sisa dalam penanganan" figures. The owner was angry: "Nggak anjing kan gw bilang lu catet ya. Semua data hotspot firespot lahan terbakar belum padam terdampak. Semua dari sistem kita". The rule was already catalogued as 5.01 in `selera-pemilik.md`.

On 29 Oct 2026 the owner confirmed the boundary for satgas reports ("Laporan Upaya Pemadaman oleh Satgas", the Mensesneg karhutla report): every satgas number may be absorbed into reports except hotspot, firespot, luas terbakar and luas belum padam. That includes personnel, equipment, sorties, water-bombing counts and litres, OMC sorties and kg, and aircraft. The WA report tracker only records whether each report kind arrived.

On 31 Oct 2026 the owner allowed the official KLHK/SiPongi burned-area figures (annual and regional entries in the deck registry) to be cited as official, with a clear source label. Buku Data BNPB 2024 Tabel L14 (per-province only) must never be cited as a national burned area. The gate `tests/agen/gerbang-luas-karhutla.test.mjs` enforces this.

**How to apply:** before putting any karhutla number on a slide, check that it comes from system output. If system data and a field report disagree, show the system figure and do not mix the two. Related: [[selera-ppt-final]], [[penanganan-generator-offline]].
