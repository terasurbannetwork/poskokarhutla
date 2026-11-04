---
name: ppt-konsultan
description: Owner wants final-without-revision consulting PPTs; skill ppt-konsultan trained 25 Oct 2026 on 14 favorite decks; use it for every deck
metadata:
  node_type: memory
  type: feedback
  originSessionId: 68b5896f-3aa5-474b-967d-6023d8fdb0a4
  modified: 2026-10-25T16:52:32.078Z
---

Every PPT/deck/paparan request goes through skill `ppt-konsultan` (`~/.claude/skills/ppt-konsultan`), layered on `alfatehan-pptx-rules`. Owner: "Gw langsung bisa dapat ppt final ga perlu gw ubah". Favorite decks live in `~/Documents/6. Belajar/Pinka` (Scenario Planning MBG, JAPFA, Dairy Farm [1], Buku Pangan, Deloitte Time Saver, ADB_Consulting, AI GCDS, Pedoman Susu BGN, Yayasan Kader Bangsa PDF, White Paper Indonesia Emas) plus four carbon decks uploaded 25 Oct (NBS to Wamen, Pertamina Carbon Business, NZE Roadmap, Karbon Kredit).

**Why:** owner is a policy/food-security consultant presenting to ministers, BUMN, donors; revisions are the pain.

**How to apply:** action titles with numbers, exec summary first, min 10 pt, one font family, source on every numeric slide, totals re-summed (`cekJumlah`). Render QA with LibreOffice profile that has Roboto in `user/fonts` or it renders serif. Owner also wanted the learning copied into Buku Pegangan Utama: bab `s-presentasi-pptx.md` exists locally, but the claude.ai parent artifact LB5fLW5WrVS44NkAZt796C was not readable from this account on 25 Oct (not republished). Related: [[kendali-mutu]]. Since 26 Oct every deck must pass `periksa.py` (incl. tata.py geometry/contrast and bahasa.py language/sensitive/tone) and `rupa.py` (dead space at most 25%); chart choice per `references/panduan-grafik.md`, tone per `references/nada.md`. A clean-context verifier that recomputes every number from raw data is mandatory before handing over: on the 26 Oct test deck it caught 7 substantive errors (mixed MODIS/VIIRS, BNPB 2026 'luas' likely = luas dipadamkan, old agency name KLHK) that all mechanical gates passed. Since 26 Oct: single skill. BNPB decks go through `bnpb/scripts/deck.py --akar assets/proyek-bnpb`; data comes from repo via `bnpb/scripts/sinkron_repo.py` (2,285 registry numbers, DIBI CSV, pustaka) and `bnpb/scripts/cari_data.py` (also JDIH full text 233 docs / 9,294 segments). Five Grand Design decks rebuilt and gate-clean (D-39 dead space <=22%) in `~/Documents/6. Belajar/Pinka/Grand Design BNPB 261026/`. PPT rules chapter is Bab 37 of Buku Pegangan Utama (artifact PCc5A2wAdrSww3ebnxEiSn, source docs/buku-pegangan/rujukan/utama.md).

Since 31 Oct 2026: start every deck from `bnpb/references/peta-konteks.md` (13 deck types incl. `lembaga-lain`; PNRE and METI formats retired to `format/_pensiun/`) and `bnpb/scripts/rancang.py brief.json`; research of 189 McKinsey/BCG/PwC/Bain reports 2024-2026 lives in `references/konsultan-2026-*.md` and pustaka `--baru`. All 19 old specs were upgraded; outputs plus clean-judge rapor in `~/Downloads/Deck Standar Baru 311026/`. Requires [[jangan-hapus-libreoffice]].
