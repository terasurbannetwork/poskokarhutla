---
name: program-15-jam
description: "22 Oct 2026 diagnosis — prod D1 stuck at migration 0035, 0 instansi accounts/tasks; 15-hour program docs/bnpb/PROGRAM-15-JAM.md, blocks A-B done"
metadata:
  node_type: memory
  type: project
  originSessionId: 0905be09-fc8a-488d-80f7-4acce970013b
  modified: 2026-10-22T14:42:02.542Z
---

22 Oct 2026 the owner asked for a strategic 15-hour program to make api padam faster. Diagnosis: production D1 `poskowarga` was still at migration 0035 (0036–0048 not applied), with 0 instansi accounts, 0 tugas_api, 0 isian. The whole api-padam system was live in code but unused. Plan and progress: `docs/bnpb/PROGRAM-15-JAM.md` (blocks A–G).

Done: A = `scripts/bnpb/aktivasi.sh` (dry-runs pending migrations on an exported prod schema; all 13 passed) + `docs/bnpb/AKTIVASI.md`. B = `/kabar` public-style page per kabupaten (`public/kabar.*`, `scripts/data/kabar_kab.py`, chained after insiden.py in titik.yml/data.yml, output gitignored `public/data/kabar/`, no company names). C was narrowed: bulk account creation already exists (`POST /api/instansi/admin/buat`); only the WA invite text is missing.

Later 22 Oct: blocks C–G done (invite text in CSV; graph archived to R2 via graf.yml because the graf- cache was evicted by 11.6 GB of data- caches; `jeda_satelit` in /api/status; tests/warga/siklus_insiden.test.mjs). Prod migrations reached 0049 but tugas_api stayed 0: the cron failed every minute on the CHECK `length(rekomendasi) <= 2000` because 0029 in the repo was edited to 3000 after it was applied (local tests can't see it). Another session set MAKS_REKOMENDASI to 2000 (7526857c); prod then had 463 tasks (164 level 3). Same evening (4bf415b9): 0029 restored byte-for-byte to its applied form, new 0050 recreates the tugas_isian_unsur_* triggers with pembasah_l (prod rejected kabar with pembasah), and gate tests/warga/migrasi_beku.test.mjs pins migration hashes (migrasi_beku.json) and forces pas* limits == CHECK. 0050 awaits owner apply via `scripts/bnpb/aktivasi.sh --terapkan`. Prod also has a `kunci_api` table that no repo migration creates.

**Why:** the bottleneck is adoption and activation, not more model features.
**How to apply:** /kabar is still behind the centurisk97.id login gate until the owner approves adding it to `PUBLIK_TANPA_SESI`. Worker secret names: email key is `EMAIL_API_KEY`; VAPID_* and PIPA_TOKEN were missing on 22 Oct. Open finding: `/data/tugas_kompleks.json` is public and contains konsesi holder names. Related: [[api-padam]], [[rencana-lanjut]], [[gas-menyapu]].
