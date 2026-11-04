---
name: kesiapan-provinsi-2026-09
description: "Vonis 25 Sep 2026: 12 langkah peluncuran per provinsi dipantau Super Admin di /admin?tab=kesiapan; langkah 4/8/9 masih manual"
metadata:
  node_type: memory
  type: project
  originSessionId: f479e259-a6ab-4067-a3f4-4cebab0d2297
  modified: 2026-09-25T14:32:50.735Z
---

The owner wants 12 launch steps tracked per province (supplier mapping, koperasi and supplier admin, price finalization, PKS with suppliers, supplier data, KDMP data, SPPG data, meeting with KPPG and Kareg, koperasi–KDMP PKS, KDMP training, SPPG training, SPPG recipes). The tracker uses real KDMP and SPPG data.

Built as the Admin chip "Kesiapan Provinsi". Only `jabatan = super_admin` can see or use it. The numbers come from the RPC `kesiapan_provinsi_papan` (migration 20260927030000). Manual entries, deadlines and notes are stored in the `kesiapan_provinsi` table.

Steps 4, 8 and 9 are entered by hand because no table records PKS agreements or meetings yet.

Also on 25 Sep 2026, the board moved into the new HR menu (`/hr`, chip `kesiapan`). The "Skema kursi per provinsi" session owns `app/(app)/hr/**`. Two more parts were added to the HR menu:
- Perjanjian & Dokumen: editable signer names, bulk PKS for Koperasi–KDMP and Koperasi–Supplier, four bank and operations letters, bulk PDF export, and automatic archiving to the existing Google Drive archive (a folder per province). The owner chose DRAFT templates first; the template text lives in the DB so the real wording can replace it without a code change.
- Penugasan Lapangan: holders of the provincial team seats plus the PIC Kab/Kota are assigned the SPPG and KDMP they escort.

**Why:** the owner said "jadi bisa track progressnya".

**How to apply:** once the `perjanjian` table exists, steps 4 and 9 count signed PKS agreements; step 8 stays manual until a meetings table exists. Do not build a second progress board. Related: [[kdmp-sppg-integrasi-2026-09]].
