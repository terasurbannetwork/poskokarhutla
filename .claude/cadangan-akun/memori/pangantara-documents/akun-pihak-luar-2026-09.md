---
name: akun-pihak-luar-2026-09
description: "Vonis 26 Sep 2026 — pihak luar dapat akun + portal web (/mitra), supplier dulu; link WA token tetap hidup; akun luar TANPA user_profiles"
metadata:
  node_type: memory
  type: project
  originSessionId: 410c51a6-c0d0-4b65-8ce6-e77dbdc35c89
  modified: 2026-09-26T08:50:36.822Z
---

26 Sep 2026 pemilik: "untuk setiap supplier tolong dibuatkan juga akunnya ... hanya bisa lihat yang berhubungan sama bahan baku yang dipasoknya" lalu "Pihak Luar dibuatkan akun biar dia bisa lah untuk isi dengan mau liat bentuk web". Dipilih: supplier dulu, link token lama TETAP hidup.

Bentuknya: tabel `akun_luar(user_id, jenis, ref)`, fungsi `akun_mitra_buat`, TANPA baris user_profiles (pola portal guru) sehingga requireStaff & RLS internal memberi nol (uji e2e 129). Portal `app/(mitra)/mitra`, API `app/api/mitra/*` ber-`requireMitra()` (lib/mitra-guard.ts), hub di SupplierDetail (supplier-akun-sel.tsx). Usulan: docs/usulan/akun-pihak-luar.

**Why:** melengkapi kanon prinsip 1 (link WA) — akun = pintu kedua, bukan pengganti.
**How to apply:** pihak luar lain (aslap, driver, guru, koperasi) = fase 2 dengan `jenis` baru di akun_luar, pola sama. Tugas 8 (kanon/700/Buku Pegangan) belum. Terkait [[kdmp-sppg-integrasi-2026-09]].
