---
name: kepala-situs-wajib
description: "every centurisk97.id page must use the shared site header (navy bar, logo, bencana menu, tabs, theme) and Centurisk97 design tokens"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1cc99590-9126-4574-8553-e6b5439200dc
  modified: 2026-10-28T04:36:50.626Z
---

Every page on centurisk97.id, including staff-only pages like /akademisi, must carry the shared site header: `header.top` navy gradient bar with logo, the bencana menu (`details.bencana`, drawn by `/inti/kepala.js`), nav tabs, burger on narrow screens, and theme button. Styles come from `/inti/kepala.css`, `/inti/tema.css`, `/inti/gaya.css`; colors from the Centurisk97 tokens (`--paper`, `--card`, `--surface`, `--ink`, `--ink2`, `--line`, `--brand`, `--brand2`, `--f2` orange for key numbers, `--display` Plus Jakarta Sans), not a page-local palette.

**Why:** 28 Oct 2026 owner saw /akademisi with its own grey iOS-style palette and no site header and said every centurisk page must have the header model so it looks good and consistent.

**How to apply:** For a new page, copy the header markup from `public/tentang.html` (or `public/akademisi.html`, which already does it), link the three inti stylesheets, and use the tokens. gaya.css makes `<main>` position:fixed, so scrolling pages should use a div container and `body{padding-top:var(--top)}`. Related: [[gaya-kartu-insight]], [[aturan-berulang]].
