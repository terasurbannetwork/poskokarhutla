---
name: katalog-per-kab-kota
description: "Vonis 15 Sep 2026 — katalog bahan baku & barang ops sekarang seragam nasional, nanti wajib bisa berbeda per kab/kota (foto, jenis, harga acuan, profit, supplier)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d7bb26c-d0f1-4138-b3e6-9f0e5a37b82b
  modified: 2026-09-15T09:51:45.054Z
---

Vonis pemilik 15 September 2026, saat melihat Procurement dengan scope Aceh:
daftar bahan baku saat ini sama untuk semua provinsi. Untuk sekarang biarkan
seragam ("samain dulu"), tapi arah produknya sudah dikunci: katalog harus bisa
berbeda **per kabupaten/kota**, bukan cuma per provinsi.

Yang harus bisa berbeda per kab/kota nanti:

- foto barang
- jenis/varian barangnya
- harga referensi (acuan)
- profit
- **supplier** — ini yang paling mendesak. Di Aceh baris katalog masih menunjuk
  SUP-008 (pemasok wilayah lain). Yang benar: pemasoknya dipilih ulang untuk
  wilayah itu, bukan diwarisi dari wilayah asal data.

**Why:** instance ini nasional sejak 3 Sep 2026, tapi katalognya masih memakai
asumsi satu wilayah. Supplier yang diwarisi lintas wilayah bukan cuma salah
data — di layar Katalog Barang Ops baris yang sudah punya baris harga minggu
ini jadi `terkunci`, jadi dropdown pemasoknya hilang dan pemilik TIDAK bisa
memilih ulang pemasok yang benar. Salahnya mengunci dirinya sendiri.

**How to apply:** jangan bangun sekarang — pemilik bilang samakan dulu. Saat
dikerjakan, kuncinya bukan menambah kolom provinsi, melainkan memutus asumsi
"satu katalog untuk semua" di rantai `ops_barang`/`items` →
`ops_barang_harga`/`supplier_price_weekly`, dan menyediakan jalan memilih ulang
pemasok untuk baris yang sudah terkunci. Lihat `terkunci` di
`components/barang-ops/katalog-alat.ts` dan padanannya di rel bahan pangan.
Cakupan wilayah kursi ada di `get_my_sppg_ids()`; lihat juga
[[prioritas-data-sppg-2026-09]].
