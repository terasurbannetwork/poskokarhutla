---
name: nav-sppg-kdmp-2026-09
description: "Vonis 23+25 Sep 2026 isi navbar Ka SPPG vs kursi KDMP (KDMP kini lihat Resep/Kalender baca-saja, menu KDMP paling akhir), strip nav satu baris sampai 10 menu"
metadata:
  node_type: memory
  type: project
  originSessionId: f8b017cd-fb2f-4b73-a80a-202b43faef7f
  modified: 2026-09-23T11:52:00.871Z
---

Vonis pemilik 23 Sep 2026 soal navbar:

- **Ka SPPG**: Dashboard, Resep, Kalender, Procurement, Order, Operasional, Belajar. Procurement WAJIB tetap ada (SPPG perlu tahu harga, tingkat 'items' = harga jual). Resep tetap menu sendiri, TIDAK dilebur ke Kalender. Tren di dashboard boleh, tanpa profit/margin/selisih pagu.
- **Kursi KDMP** (kdmp_admin/operator/koordinator): Resep & Kalender DIBUANG dari nav (lewat setelan `nav_peran` di DB, rute tetap hidup). Label tetap "Procurement" (bukan "Katalog & Harga"), dan koperasi harus bisa melihat tab Forecast di dalamnya (sudah terbuka lewat PAGE_ACCESS['/forecast'] ∋ KURSI_KDMP).
- Strip nav: ≤10 menu = satu baris (AppNav `barisTab`). Keluhan asalnya: 5+5 dua baris "putih-putih banyak".

**Why:** koperasi tidak masak, kebutuhannya terbaca di Order/Forecast; dapur perlu harga.
**How to apply:** jangan mengusulkan lagi membuang Procurement dari Ka SPPG atau melebur Resep ke Kalender. Diputus juga ("gas"): untuk kursi KDMP, menu KDMP duduk tepat sesudah Dashboard (di AppNav, bukan nav_urutan global) dan Belajar jadi chip di /kdmp (nav /belajar disembunyikan untuk KDMP lewat nav_peran). Nav KDMP akhir: Dashboard, KDMP, Procurement, Order, PO Supplier, Invoice, Pembayaran.

**Revisi 25 Sep 2026 (membalik sebagian vonis 23 Sep):**
- Kursi KDMP DAPAT lagi menu Resep & Kalender, BACA-SAJA, cuma SPPG yang dilayani koperasinya. Dipasang dengan menambah kdmp_admin/kdmp_operator/kdmp_koordinator ke `nav_peran` untuk /resep dan /kalender (settings DB). Baca-saja dijamin DB (`can_manage_menu()`/`can_edit_menu_row()` tanpa peran KDMP) + UI (`canManage`/`canManageMenu`); cakupan baca lewat `get_my_sppg_ids()` → `my_sppg_lewat_kdmp()`.
- Menu KDMP untuk kursi KDMP pindah ke PALING AKHIR (AppNav `urutanNav`), bukan sesudah Dashboard lagi.
- Dashboard: kartu Cakupan disembunyikan untuk kursi KDMP; Log Data Supplier & Bahan di Procurement disembunyikan untuk KURSI_KDMP; tombol Admin WA berjudul "PIC <provinsi>" tanpa keterangan.
- Belajar juga kembali ke nav kursi KDMP (nav_peran '/belajar' + 3 peran KDMP), membalik "Belajar jadi chip di /kdmp".
- Supplier dipecah Umum (kab/kota, admin/procurement) vs Lokal (milik satu KDMP, kolom suppliers.cakupan/kdmp_id, migrasi 20260925170000); KDMP cuma menulis/minta update harga supplier Lokal miliknya. KDMP juga dapat Order baca-saja (tanpa Surat Jalan) dan Akuntansi baca-saja untuk SPPG binaannya.
