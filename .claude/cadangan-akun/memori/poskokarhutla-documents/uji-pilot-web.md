---
name: uji-pilot-web
description: "/uji-pilot no-login field-test page (26 Oct 2026): token link, reports with geotagged photos, migration 0061 pending in prod"
metadata:
  node_type: memory
  type: project
  originSessionId: 7829cc04-e88e-471f-8a31-95aa661a6ac0
  modified: 2026-10-26T16:59:01.701Z
---

Owner asked 26 Oct 2026 for a web page for the SIPPA Kalteng pilot test: open to anyone with the link (no login), mobile-first, pick one of 10 sites, then Google Maps navigation, info, GPS route steps, install guide, tips; plus an equipment appendix and field reports (photo + geotag + time) modelled on the public photo uploader. Recorded as SIPPA decisions 58 and 59.

Built: route `/uji-pilot#t=<token>` (src/uji_pilot.js, public/pipa/uji_pilot.*, migration 0061_uji_pilot.sql, tests/warga/uji_pilot.test.mjs). Only sha256 of the token is in code (TOKEN_SHA); the raw token was given to the owner in chat and is not stored anywhere in the repo. Dossier builder moved to scripts/data/sippa/pilot/ (local, needs Pillow + Chrome); `ekspor_web.py` regenerates src/uji_pilot_data.js.

**Why:** field crews have no accounts; verification of the pilot (decision 53) needs timestamped, geotagged evidence per stage.
**How to apply:** live since 27 Oct 00:5x (commit d9fa7c68); prod D1 already had table uji_pilot_lapor (API returned no belum_aktif). Deploy gates that bit: posko.test whitelist of PUBLIK_TANPA_SESI, api.test registry copy of imported public modules, tests/sippa/cakupan.json, SIPPA wording "titik panas" and no toFixed in public/pipa. Rotating the link = new token, replace TOKEN_SHA, redeploy. Field-dossier rules: [[dossier-lapangan]].
