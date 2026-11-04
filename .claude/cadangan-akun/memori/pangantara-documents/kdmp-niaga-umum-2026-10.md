---
name: kdmp-niaga-umum-2026-10
description: "Vonis 3 Okt 2026 — KDMP diperkuat ala Gemah Ripah untuk pelanggan non-MBG; rel tagihan TERPISAH, driver link WA, segmen Gemah Ripah, 6 fase berurutan; rentang harga kab/kota disetujui GM Regional + Procurement Manager"
metadata:
  node_type: memory
  type: project
  originSessionId: 29441f73-f10d-4c23-b574-9c673628f568
  modified: 2026-10-03T08:49:11.533Z
---

KDMP tidak lagi cuma melayani SPPG: pelanggan umum (warung, restoran, pemda, rumah tangga) seperti Gemah Ripah. Rencana & checklist: `docs/usulan/kdmp-niaga-umum/`.

**Why:** pemilik: "tidak hanya untuk MBG saja tapi juga yang lain bisa juga".

**How to apply:**
- Rel penjualan/tagihan non-SPPG TERPISAH dari `kdmp_po`/`kdmp_tagihan` (jangan buka trigger uang SPPG); dashboard & kas menjumlah dua rel di tingkat baca.
- Segmen B2B/B2G/B2C ikut Gemah Ripah, SPPG = B2G subsegmen SPPG/MBG, disinkron dari `kdmp_sppg`.
- Driver lewat link WA `/kdmp-antar/[token]`, bukan akun.
- Enam fase berurutan tanpa berhenti per fase (pelanggan → penjualan → peta live → stok → CRM → pemasok/dashboard).
- Rentang harga jual KDMP per kab/kota tiap minggu: berlaku hanya setelah General Manager Regional (gm_provinsi) DAN Procurement Manager (manager_procurement) sama-sama setuju; harga di luar rentang ditandai, tidak ditolak.

Lihat juga [[kdmp-sppg-integrasi-2026-09]], [[kdmp-rantai-vonis-2026-10-01]].

Keputusan susulan 3 Okt 2026 (sore):
- Barang Ops: barang `umum` (katalog pusat) vs `lokal` (milik satu koperasi, ditambah/dihapus koperasi itu sendiri). Barang lokal DIBELI lewat order dapur SPPG yang dipasok koperasi itu (bukan alur beli koperasi terpisah).
- Tab "Pemasok Koperasi" (Pemasok | Pasok) ada di Procurement Bahan Baku DAN Barang Ops.
- Pengurus koperasi BOLEH menulis buku koperasinya sendiri (jurnal, SHU).
- Kursi dapur (kasppg dkk) TIDAK boleh melihat profit/margin/selisih pagu — ditutup di layar dan di RPC `dashboard_tren`.
- Kursi KDMP tidak boleh Sepakat/Tolak menu di Kalender; kolom/tombol yang tak berlaku untuk peran itu tidak dicetak.
- Peran `admin_sppg` dicabut (CHECK di user_profiles).

Keputusan 4 Okt 2026 (referensi harga):
- Prioritas saran rentang: survei lapangan → Disperindag kab → PIHPS kab → Disperindag prov → PIHPS prov; HET = batas atas, bukan sumber.
- HET diisi hanya admin pusat + Procurement Manager (RLS het_harga, migrasi 20261004030000).
- Target survei 3 pasar per kab/kota per minggu (Tim Lapangan + Tim Procurement).
- Ejaan provinsi baku "Kepulauan Bangka Belitung" (juga di het_harga).
