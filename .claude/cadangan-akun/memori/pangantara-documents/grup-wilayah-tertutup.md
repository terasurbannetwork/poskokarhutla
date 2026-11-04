---
name: grup-wilayah-tertutup
description: Vonis 7 Okt 2026, seluruh app: tabel bergrup kab/kota→kecamatan lahir TERTUTUP, yang terlihat cuma daftar kab/kota
metadata:
  type: feedback
---

Tabel yang dikelompokkan per Kab/Kota (dan Kecamatan) lahir dengan SEMUA grup tertutup: cuma daftar kab/kota + ringkasannya; kecamatan juga tertutup. Pencarian aktif boleh membuka grup yang cocok. Pemilik dua kali di sesi yang sama: "Ada list kab kota nya tapi belum ada yang terbuka", lalu "kecamatannya gausah kebuka dulu. Secara default yang keliatan kab/kota dulu. Cek semua ya."

**Why:** header Lampung = 15 kab/kota × puluhan kecamatan × 1.174 dapur; grup terbuka membuat layar pertama jadi tembok baris.

**How to apply:** `useGrupTertutup({ bakuTutup: true })` untuk grup wilayah (bawaan hook = terbuka, jangan dibalik global karena grup non-wilayah memakainya). Dijaga `tests/unit/gerbang-grup-wilayah-tertutup.test.ts`; aturan #237 di 200-rincian-selera.md. Terkait [[standar-tabel-sppg-2026-09-27]], [[nama-sppg-dalam-kecamatan]].
