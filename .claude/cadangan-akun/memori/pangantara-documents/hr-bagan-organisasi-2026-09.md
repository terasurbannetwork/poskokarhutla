---
name: hr-bagan-organisasi-2026-09
description: "Vonis 25 Sep 2026 — menu HR (/hr) lahir, bagan organisasi Pangantara menimpa sebutan kursi tim provinsi; kunci jabatan lama dipertahankan"
metadata:
  node_type: memory
  type: project
  originSessionId: 493d8b6d-6dae-4cd5-88b4-bb14d736c2d4
  modified: 2026-09-25T14:34:35.257Z
---

25 Sep 2026 pemilik menyerahkan PDF "Organisational Chart" (CEO → CFO/COO → Area → Regional; 1 Regional = 100–150 SPPG, 1 Area = 5–10 Regional) dan memutus:
- Humas = Management Representative; Manager Finance = Area Accountant & Tax Manager; PIC Provinsi + GM Provinsi dilebur jadi Area Operational Manager; PIC Kab/Kota masuk bagan; CEO/CFO/COO dibuat di level nasional.
- "jangan di Admin deh" — Tim Provinsi + Kesiapan Provinsi pindah ke menu nav baru **HR** (`/hr`), memantau semua provinsi dengan cakupan provinsi lewat header wilayah.
- "buatkan semua akun mereka dengan passwordnya" — dijalankan sesuai vonis 21 Sep (sandi ACAK + link aktivasi), bukan sandi yang dibagikan. Nama akun bisa diganti di HR › Akun Kursi.
- "pakai versi lu aja" untuk detail yang tak disebut: Regional pakai batas atas 150 SPPG; Procurement tetap ada di bawah COO; Area disusun otomatis per kode provinsi (≤10 Regional).

**Why:** kunci jabatan (`gm_provinsi`, `tim_humas`, dst.) dibaca get_my_sppg_ids(), terbatas_wilayah(), gaji_skema_kursi — yang diganti cuma sebutannya.

**How to apply:** katalog di lib/formasi-provinsi.ts (KURSI_AKTIF, KURSI_NASIONAL), Area di lib/hr-kursi.ts. Sesi lain memegang chip `dokumen` (Perjanjian & Dokumen) dan `penugasan` (Penugasan Lapangan) di /hr. Kalau pemilik menetapkan Area per nama, ganti susunArea() otomatis. Terkait [[menu-personalia-2026-09]] (Personalia dapur belum dilebur ke HR).
