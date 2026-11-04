---
name: ruang-bnpb
description: Owner is now staf ahli BNPB; Ruang Koordinasi BNPB (13 systems M1-M14 minus M8) built 19 Oct 2026; prod D1 migrations 0022-0028 need the owner to run them; wave 2 (20 Oct) added pengingat, pimpinan, rehab/gudang, sitrep archive, offline queue, screen tests
metadata:
  node_type: memory
  type: project
  originSessionId: bcb19ea2-133e-477c-99b5-fa6fc3a89f4a
  modified: 2026-10-19T15:42:39.314Z
---

19 Oct 2026: owner became staf ahli BNPB and asked for systems that fix BNPB performance. Built "Ruang Koordinasi" behind `/bnpb` (not in main nav): relawan + PTN/MoU, alun-alun (public forum; owner's term, interpreted as forum), riset kemitraan, Meja Kerja (kaji cepat, logistik, DSP, renkon, Destana + rapor BPBD), sitrep, indeks risiko kecamatan, kebutuhan musim, berkas Gakkum. M8 (pengungsi) was explicitly dropped by the owner. Status and owner to-dos: `docs/bnpb/STATUS.md`.

**Why:** the auto-mode classifier blocks `wrangler d1 migrations apply --remote` as a production deploy, so migrations 0022-0028 must be applied by the owner; until then the new APIs answer 503 (Lapor Warga keeps working without 0027).

**How to apply:** for new BNPB work, read `docs/bnpb/ARSITEKTUR.md` first (shared helpers in `src/bnpb.js`, `public/admin/bersama.js`, `public/inti/nanti.js`; owner agent `ruang-bnpb`). Unapplied migrations may be edited in place; check `wrangler d1 migrations list --remote` first. Related: [[kendali-mutu]], [[gas-menyapu]], [[terbit-gagal]].


Screen tests: `npm run uji:layar` (Chrome headless, tests/bnpb/) must stay 0 todo. Commit only when each suite prints `ℹ fail 0`; a grep for pass/fail in an `&&` chain once let failing commits through.
