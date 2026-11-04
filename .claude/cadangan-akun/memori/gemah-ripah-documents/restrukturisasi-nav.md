---
name: restrukturisasi-nav
description: Rencana restrukturisasi navbar Gemah Ripah yang disetujui pemilik (27 Sep 2026) + revisi terakhirnya; dijalankan sesudah agent dashboard & sweep standar-tabel ter-push
metadata:
  type: project
---

Pemilik setujui usulan susunan menu ("Kerjakan ya yang usulan lu", 27 Sep 2026), lalu merevisi:

- **Pembayaran meniru pangantara**: menu dikelompokkan menurut TUJUAN bayar (bayar supplier, bayar driver/gaji, biaya lain), bukan menurut mekanisme bank. Pelajari `~/Documents/GitHub/pangantara` modul pembayarannya dulu.
- **Piutang pindah ke Invoice** (utang vendor ikut sisi Pembayaran/PO Supplier).
- **Mutasi Bank, Cocokkan, Rekonsiliasi pindah ke Akuntansi.** Pembayaran masuk dari pelanggan menempel ke Invoice (pelunasan).
- **Absensi & Gaji Driver ke Pengantaran** (sudah di usulan awal).
- **Nol filter Aktif/Arsip di halaman mana pun.** Semua yang diarsip hanya terlihat di Admin (tab Arsip terpusat dengan pulihkan).
- Harga Khusus & Diskon Volume sudah pindah ke Order (/penjualan) oleh agent Pelanggan.

**Why:** pemilik mau menu mengikuti alur usaha & tujuan uang; arsip di tiap daftar = kebisingan.
**How to apply:** tabel usulan awal ada di transcript sesi 5bbdd857 (Dashboard 5 tab, Pelanggan 7, Order 4, dst, maks ~8 tab per menu, link lama redirect, lib/fokus.ts & rbac ikut). Revisi di atas menang atas tabel itu.
