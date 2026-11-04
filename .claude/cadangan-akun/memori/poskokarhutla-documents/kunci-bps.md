---
name: kunci-bps
description: BPS WebAPI key from owner (1 Nov 2026) lives in macOS Keychain, never in files or git
metadata:
  type: reference
---

Owner gave the BPS WebAPI key on 1 Nov 2026. Stored in macOS Keychain only: `security find-generic-password -a centurisk97 -s bps-webapi -w`. Never write the value into any file, commit, log, or chat. Base URL `https://webapi.bps.go.id/v1/api/...`, key in path `/key/<K>/`. Unblocks Podes aggregates, lansia, disabilitas per kab for [[direktori-data-strategis]]. Not yet a GitHub secret (ask owner before `gh secret set`).

OpenAlex API key (owner, 1 Nov 2026) also in Keychain: `security find-generic-password -a centurisk97 -s openalex-api -w`; pass as `api_key=` query param (env OPENALEX_KEY in panen2/skrip2/pendanaan.py). Same rule: never in files, git, logs, or chat.
