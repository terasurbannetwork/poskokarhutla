---
name: genangan-jakarta-j3-j4
description: "Jakarta inundation model: J3 failed 28 Oct 2026 (drill labels); J4 prospective test 2026/27 LOCKED 28 Oct (anchor ceddfc49), sidik freezes shared banjir files"
metadata:
  node_type: memory
  type: project
  originSessionId: 93dbfc1a-3c16-4500-8adb-a4fc0af0e87d
  modified: 2026-10-28T08:19:23.843Z
---

J3 (pre-registered calibration) ended GAGAL on 28 Oct 2026: its test labels were PetaBencana drill reports, and 2024-08 had no rain (DIAGNOSIS-J3.md).

J4 prospective test for the 2026/27 rainy season was **locked 28 Oct 2026**. Anchor commit ceddfc49, sidik e5d65748…, file `scripts/banjir/genangan/j4_sidik.json`.

Owner decisions:
- LULUS = better than random (syarat i) only; vs J3, vs InaRISK, vs "lowest point within 300 m" and syarat ii are report-only.
- Operational rain = GSMaP NRT daily total × ERA5 hourly shape, same as calibration. Prakira runs D+2..D+9, waiting for ERA5.
- X = 34 mm final.

Workflow `.github/workflows/genangan_j4.yml` runs daily 05.30 WIB, append-only to `data/banjir/genangan/j4_*`. GSMaP secrets are already set. Honest expectation: the model ties or loses to the lowest-point heuristic on 2 of 3 calibration events.

**Why:** the sidik hashes shared files: `public/banjir/sim_genangan.js`, `scripts/banjir/umum.py`, `wilayah.py`, `bahaya.json`, `hulu.json`, `pompa.json`, `public/geo/kecamatan/31.json`, `mesin.mjs`, `petabencana.py`. If any of them changes, `kunci_j4 cek` goes red and the prakira step stops, silently losing events.

**How to apply:**
- Before editing those files during Nov 2026–Apr 2027, check `python3 scripts/banjir/genangan/kunci_j4.py cek`, and keep a copy or ask the owner.
- Never re-tune using 2024-08/2025-04.
- Vonis comes at the 10th event or 30 Apr 2027.

Related: [[banjir-paritas-27-okt]], [[kendali-mutu]].
