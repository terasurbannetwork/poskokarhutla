---
name: cermin-bahan-ops
description: "Vonis 26 Sep 2026 — semua layar Bahan Baku WAJIB dicerminkan utuh ke Barang Ops (Order, PO Supplier, Procurement); sapu seluruh halaman, jangan per keluhan"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 318d6e80-efa7-4c57-ad9b-3934e1690a0b
  modified: 2026-09-26T08:43:04.631Z
---

Semua yang ada di sisi Bahan Baku wajib sama persis di sisi Barang Ops: urutan blok, sub-tab berlencana, container lipat, bar cari + satu set Excel/PDF, EmptyState berjudul+penjelas, Log, strip SegmentedToggle. Pemilik mengulang ini berkali-kali dalam satu hari (26 Sep 2026: Order, PO Mingguan, Selisih PO, Daftar PO, Update Harga, Daftar Harga) dan marah ("berapa kali gw suruh ya samakan").

**Why:** tiap perbaikan per-keluhan meninggalkan sub-tab saudara yang masih beda; pemilik menemukannya satu per satu.

**How to apply:** begitu pemilik menunjuk SATU selisih bahan vs ops, sapu SEMUA sub-tab halaman itu sekaligus (tabel selisih dulu, lalu samakan), pakai satu komponen berparameter `jenis`, dan pasang gerbang cermin (mis. gerbang-cermin-po-ops.test.ts). Jangan tunggu keluhan berikutnya. Terkait [[katalog-per-kab-kota]].
