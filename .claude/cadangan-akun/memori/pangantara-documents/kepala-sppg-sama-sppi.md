---
name: kepala-sppg-sama-sppi
description: "Vonis 24 Sep 2026 — Kepala SPPG = SPPI, satu orang; istilah di layar \"Kepala SPPG\", data dijaga trigger sppg_bgn_kepala_satu"
metadata:
  node_type: memory
  type: project
  originSessionId: 6e4e212a-c6e8-4ed1-af87-4587e04569f8
  modified: 2026-09-24T08:04:17.155Z
---

Pemilik 24 Sep 2026: "WA Kepala SPPG itu sama dengan WA SPPI ya. Ka SPPG ya SPPI. Satukan aja ya istilahnya."

- `sppg_bgn`: kontak_nama/kepala_nama/sppi_nama selalu berisi teks sama; kontak_wa/sppi_wa sepakat. Trigger `sppg_bgn_kepala_satu` + `gabung_nama_kepala()` (migrasi 20260924153000, 20260924160000), uji `tests/e2e/106-kepala-satu-kontak.sql`. Konflik sumber digabung "A / B", diselesaikan orang lapangan lewat modal revisi.
- sppi_wa ber-peran `perwakilan_yayasan` = nomor yayasan, TIDAK disalin ke kontak_wa.
- Label per dapur "SPPI" diganti "Kepala SPPG" (admin: "Kepala SPPG (BGN)" karena ada field Kepala SPPG akun internal). "Korwil SPPI", tab SPPI di KDMP, dan papan kontak (koordinator) sengaja dibiarkan.

**Why:** dua baris/dua kolom untuk satu kursi bikin nomor WA terpasang ke nama yang salah.
**How to apply:** jangan hidupkan lagi baris/kolom SPPI terpisah per dapur; tulis kontak lewat kolom mana pun, trigger menyamakan.
