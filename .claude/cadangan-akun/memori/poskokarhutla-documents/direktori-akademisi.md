---
name: direktori-akademisi
description: "/akademisi expert directory built 28 Oct 2026; owner decisions, data location, harvest sources and their limits"
metadata:
  node_type: memory
  type: project
  originSessionId: 1cc99590-9126-4574-8553-e6b5439200dc
  modified: 2026-10-28T14:09:17.597Z
---

/akademisi (Direktori Pakar Kebencanaan) went live 28 Oct 2026. Plan: `docs/bnpb/RENCANA-AKADEMISI.md`.

Owner decisions (28 Oct): only BNPB staff and admin may open it (UU PDP); collect all publicly listed contacts; polite harvesting allowed (no spoofed headers); build features 1 (expert per incident), 3 (map over risk index), 5 (track-record badges with proof), 7 (disaster study centers); hak koreksi and dummy button still required.

Data: repo is PUBLIC, so expert data never goes in repo or public/. It is one JSON in R2 MEDIA `akademisi/induk.json`, served by `GET /api/akademisi` (src/akademisi.js, stafOK). Upload with `npx wrangler r2 object put poskokarhutla-foto/akademisi/induk.json --file ... --remote`.

Sources: OpenAlex (backbone, needs owner's API key in env OPENALEX_KEY for cursor paging and >$0.10/day; key was pasted in chat 28 Oct, owner may rotate it), SINTA author search via real Chrome (photo, official campus name, prodi), SINTA affiliation logos, PDDikti via real Chrome (gelar, jabatan, education years; API returns 401 to non-browsers). Harvest scripts lived in the 28 Oct session scratchpad, not the repo.

Update 28 Oct evening: OPENALEX_KEY is now a worker secret (owner set it) and in local `.dev.vars` (gitignored). `/api/akademisi/karya/:id` proxies OpenAlex works (paging, filters) plus public ORCID record (bio, education, employment). SINTA profile detail for 1,793 authors harvested via BrowserOS neo (in-page fetch, 1.5 s delay, no blocks) into R2 `akademisi/sinta/<id % 64>.json`, served by `/api/akademisi/sinta/:id`; old induk backed up at `akademisi/cadangan/induk-2026-10-28.json`. PDDikti is behind reCAPTCHA: do NOT mass-harvest it (anti-bot evasion); jabatan/pendidikan come only from public ORCID, or ask owner about an official PDDikti data request. Diaspora (e.g. Bagus Muljadi, never affiliated with an Indonesian institution in OpenAlex) cannot be found automatically: owner supplies names, add by OpenAlex ID with column 16 = "diaspora".

Known gaps: non-academics like Abdul Muhari have no OpenAlex affiliation and split profiles (merged by exact name); PDDikti enrichment, dummy button, and features 1/3/5/7 not built yet. Related: [[kepala-situs-wajib]], [[ruang-bnpb]].
