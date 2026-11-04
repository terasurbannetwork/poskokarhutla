---
name: direktori-jejak-tkt-riwayat
description: 30 Oct 2026 /direktori additions (Riwayat dengan BNPB, Jejak kejadian 12 events, TKT inovasi) and what still waits on owner (R2 upload, push, D1 0087)
metadata:
  type: project
---

30 Oct 2026 owner picked three directory features: Riwayat dengan BNPB (D1 0087 akademisi_riwayat, all staff write, author or admin edit), Jejak kejadian (12 big events: kronologi, dampak, respons, dokumen, riset, pelajaran berhasil/kurang/strategi with "Analisis" pill), and TKT per inovasi (perkiraan from public evidence, rubric 1-9, kesiapan class "siap dipakai" not "siap beli" since many are free gov apps; e-Katalog found for none).

Code committed 13b23fb7 (local, not pushed at the time). Data built in session scratchpad 84f86b6e-.../scratchpad/r2: inovasi_tkt.json, kejadian_jejak.json (gabung_jejak.js), lembaga_jkt.json (jkt_patch.js: Jakarta addresses were matched to Kab. Kuningan/Kota Medan/Kota Padang because bpbd.json has no DKI). Auto-mode blocked prod R2 upload; owner must approve. Many jejak numbers rest on Wikipedia or search snippets (agent reports list them).

Local `wrangler dev` broke 30 Oct (miniflare getWorkerRegistry missing); a static preview server lives at scratchpad/pratinjau.mjs (port 8795).

**Why:** owner wants all-in-one lessons per disaster and to see which innovations are ready to use vs still in lab.
**How to apply:** before re-harvesting, start from those scratchpad files if present; never present jejak numbers as verified official. Related: [[direktori-akademisi]], [[direktori-semua-terhubung]], [[bagian-dalam-kartu]].

1 Nov 2026: prod D1 poskowarga migrations 0076-0087 applied (owner ran apply, first try hit transient Cloudflare 7403, retry succeeded). Riwayat BNPB table now live.
