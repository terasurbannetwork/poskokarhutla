---
name: keyakinan-rendah-drone-gambut
description: 28 Oct 2026 owner reversed 25 Oct rule — hotspot counts now include low-confidence; bara gambut needs night detection; /admin/drone page built
metadata:
  node_type: memory
  type: project
  originSessionId: c4bc0e00-80bc-4227-b6ab-6637e4999faf
  modified: 2026-10-28T11:04:08.821Z
---

On 28 Oct 2026 the owner decided hotspot COUNTS include low-confidence detections (titik_unik.KEYAKINAN_MIN = 0), reversing the 25 Oct "sedang/tinggi saja" rule. Reason: smouldering peat is low-temperature and smoke-covered, so it lands in the low class (Tansey 2008: MODIS misses ~60% in Kalteng peat; adding low-confidence improves fit).

**Why:** owner asked after peat-fire literature research (scripts/data/RISET-BARA-GAMBUT.md).

**How to apply:**
- Luas, insiden factors, NOAA-20/S-NPP ratio, S-NPP baselines, and clusters STAY sedang/tinggi (coefficients measured on n/h). Never change those without recalibrating.
- Bara gambut persistence = >=2 dates AND at least one night (18-06 WIB) detection; low-confidence VIIRS in same pixel adds evidence. Still a hypothesis, no validated threshold.
- History (musim_harian, titik_tahun, titik_hari, kumulatif_mn) rebuilt locally from FIRMS archive in data/raw/firms/arsip_281026; CI restores repo versions when cache lacks "semua keyakinan".
- Drone: map icon kl-drone on clusters with bara.sel -> /admin/drone (staf/instansi). Docs docs/bnpb/PANDUAN-DRONE-GAMBUT.md. KMZ never tested on real DJI Pilot 2; dock dispatch (Tahap 2) not built.
- Owner keeps the Metode tab hidden (asked 28 Oct).

Related: [[karhutla-data-sistem]], [[gas-menyapu]]
