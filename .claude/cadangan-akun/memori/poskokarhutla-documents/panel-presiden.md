---
name: panel-presiden
description: "/presiden panel (15 karhutla widgets + map) built 22 Oct 2026 for the presidential dashboard; public, embeddable, data regenerated in CI"
metadata:
  node_type: memory
  type: project
  originSessionId: 63562041-9ff1-4d82-b607-a2ff0b77f3df
  modified: 2026-10-22T14:12:03.771Z
---

On 22 Oct 2026 the owner asked for karhutla material "for the presidential dashboard": lightweight, action-oriented ("tindak lanjut"), as many widgets as possible, and later "on the map too". Built `/presiden` (cards + Peta tab) and JSON feed `/data/presiden/*`. Contract: `docs/presiden/KONTRAK.md`.

Owner decisions: public without session (aggregate only, no personal data), embeddable from any domain (iframe), feed CORS `*`. Company names may show; WALHI name/columns/counts must NOT show (17 Oct rule in [[fitur-disembunyikan]]).

**Why:** the audience is the President's office; any wrong or over-precise number is a credibility failure.

22 Oct evening audit (5 clean verifiers, 2 rounds): stale cards are dimmed with "Data terakhir <date>" (owner decision); asap counts only fire-prone provinces (national CAMS PM2.5 is mostly Java urban); posko.json is algorithm-suggested locations, never "terdata"; luas card = official SiPongi only; konsesi ranking covers only named companies (~31% of points), WALHI still never named; KLHK is now Kementerian Kehutanan + KLH. `/api/status` watches `presiden` (8 h). Gate: tests/warga/presiden.test.mjs. Peringatan BMKG widget removed on owner's request 22 Oct (feed daily, nowcast valid 3 h); panel = 14 widgets, generator deletes leftover feed files. Open owner questions: enforce CSP? iframe allowlist?

**How to apply:** local `public/data/*.json` is days stale (fresh data lives in the Actions cache and deploys from titik.yml), so "basi" pills seen locally are expected; verify the live site after deploy. Model estimates are rounded ("sekitar"), hotspot counts stay exact, and every title carries its data date. Related: [[kendali-mutu]], [[terbit-gagal]].
