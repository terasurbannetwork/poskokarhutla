---
name: nav-fokus-jabatan-2026-09
description: "Vonis 27 Sep 2026, tim provinsi cuma lihat menu tupoksinya (Finance, Finance Support, Procurement, HR, Operational); GM Regional semua menu; dashboard juga disesuaikan per peran"
metadata:
  node_type: memory
  type: project
  originSessionId: 4adfac87-4a41-4418-9a83-0e9765358565
  modified: 2026-09-27T11:43:08.654Z
---

Vonis pemilik 27 Sep 2026 (diperbarui sore): kursi tim provinsi dan staf di bawahnya cuma melihat menu tupoksinya.
- Finance (manager_finance, tim_akuntan, CFO): Dashboard, Resep, Kalender, Invoice, Pembayaran, Akuntansi, Koordinasi, PO Supplier. Finance Staff ikut Finance Manager, 150 SPPG per orang dibagi langsung per dapur.
- Finance Support (finance_support): di bawah Finance Manager, 1 per 300 SPPG (tetap berkabupaten, satu akun boleh beberapa kab). Tugas uang NON-dapur: bayar Barang Ops, ambil Petty Cash, bayar operasional, pembagian, gaji/honor/insentif, reimburse, pengeluaran rutin. Menu: Dashboard, Pembayaran, Akuntansi, Koordinasi.
- Procurement (manager_procurement, tim_procurement): Dashboard, Resep, Kalender, Procurement/Katalog, Order, PO Supplier, Pembayaran (cuma sub-tab Bahan Baku & Barang Ops), Koordinasi.
- HR (manager_hr, hr_staff): Dashboard, Koordinasi (HR tinggal di sana), Komunikasi, Monitoring, Belajar.
- Operational (manager_humas, tim_humas, staf_lapangan): Dashboard, Resep, Kalender, Procurement (cuma Daftar Harga TANPA nama supplier, Update Harga, Request Bahan, Forecast, Katalog, Lengkapi Data & Temuan), PO Supplier, Invoice, Operasional, Koordinasi, Belajar. Tim Lapangan 1 per 30 SPPG (5 per Operational Staff), dibagi langsung per dapur.
- HR Staff ikut HR Manager. Menu Monitoring KPI di Koordinasi → HR: KPI per kursi DISETUJUI ("gas semua"), periode MINGGUAN, rancangan docs/usulan/kpi-kursi/proposal.md. Pembagian dapur per orang (urut kab→kec→kode, 30/150/300) disetujui. Tim provinsi masuk ringkasan eksekutif Dashboard dengan kartu dibatasi per jabatan (disetujui).
- GM Regional & PIC Kab/Kota: semua menu.
- Menu fokus sedikit: pill meregang penuh selebar kartu (batas 13rem cuma untuk role <= 2 tab).
- Dashboard juga harus disesuaikan per peran (isi kartu yang perlu dilihat saja).

**Why:** role induknya (pic_dapur, procurement) dipakai bersama akun dapur, jadi `nav_peran` per role tidak bisa dipakai.
**How to apply:** peta di `lib/nav-fokus-jabatan.ts`, dipasang di filter tab AppNav, dijaga `tests/unit/nav-fokus-jabatan.test.ts`; rumus kursi di `lib/formasi-provinsi.ts`. Cuma menutup pintu navbar, hak halaman tetap PAGE_ACCESS/RLS. Terkait [[hr-bagan-organisasi-2026-09]], [[bagan-gmr-2026-09]].
