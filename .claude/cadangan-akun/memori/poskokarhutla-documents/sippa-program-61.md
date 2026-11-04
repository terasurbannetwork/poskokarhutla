---
name: sippa-program-61
description: "SIPPA keputusan 61 (46 rekomendasi) built 27-28 Oct 2026; what is live, what the owner still has to do in prod"
metadata:
  node_type: memory
  type: project
  originSessionId: 97ceb9e2-a06b-41b8-a855-d20a7aec52da
  modified: 2026-10-27T20:35:35.814Z
---

Keputusan SIPPA 60 (no permanent pipe network, corridor funds → 6 extra kits, T3 = 20 kits) and 61 (46 of 50 recommendations, TIKET §11 SP-100..145) were built in one session 27-28 Oct 2026 and deployed (terbit ac2dac00 success). Data now covers 7 provinces (62, 16, 63, 61, 15, 14, 93; 3068 kompleks).

Owner to-dos left open at the end:
- Apply pending prod D1 migrations after the 07.00 WIB quota reset (0070 lapangan/pinjam, 0072 tugas_api index, 0073 fase 3, 0074 index).
- Upload the 7-province data to R2 sippa/ (kelayakan_kompleks, kelayakan_sel, zona, brgm_pembasahan, konsesi_kompleks, akses_kompleks); the session's upload was blocked by the permission classifier.
- Secrets for Renlap Generator: worker GITHUB_TOKEN (actions:write) and RENLAP_KUNCI; same RENLAP_KUNCI plus CLOUDFLARE_* as GitHub repo secrets for renlap.yml.
- Optional WAF rate limit on /api/renlap/data, /api/renlap/img, /api/sippa/renlap/*/selesai.
- Pending owner decisions: anggaran buka by moderator vs Super Admin; national pagu visible to provincial staff; pinjam penerima free text; sel22 for new provinces needs full FIRMS 2012-2025 raw or FIRMS_MAP_KEY.

**Why:** next session must not assume these are done just because code is live.
**How to apply:** check `npx wrangler d1 migrations list poskowarga --remote` and R2 objects before debugging empty SIPPA screens. Related: [[d1-kuota-baca]], [[terbit-gagal]].
