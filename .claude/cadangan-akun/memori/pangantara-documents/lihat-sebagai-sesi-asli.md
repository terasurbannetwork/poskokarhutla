---
name: lihat-sebagai-sesi-asli
description: "Vonis 3 Okt 2026 — \"Lihat sebagai\" wajib masuk sebagai akun sungguhan kursi itu (sesi+RLS+data), bukan tukar tampilan; satu akun uji per kursi, boleh tulis, tercatat di audit_log"
metadata:
  node_type: memory
  type: project
  originSessionId: 29441f73-f10d-4c23-b574-9c673628f568
  modified: 2026-10-03T07:43:22.167Z
---

"Lihat sebagai" bukan lagi tukar-peran di cookie: Super Admin benar-benar login sebagai satu akun pemegang kursi (route `app/api/admin/lihat-sebagai`, `lib/lihat-sebagai-sesi.ts`), pulang lewat cookie HMAC `lihat_sebagai_asal` (12 jam).

**Why:** pemilik tidak mau capek ganti akun, tapi tampilan harus "tampilan beneran ketika akun dengan peran lain yang masuk". Mode lama bocor: Aslap/Admin SPPG tetap melihat Profit/Prs dan data semua SPPG milik Super Admin.

**How to apply:** pilihan pemilik = satu akun uji per kursi (akun bernama "Uji …" didahulukan, lalu akun pertama by created_at), boleh menulis, tiap MASUK/KEMBALI dicatat `audit_log` table_name 'lihat_sebagai' actor = Super Admin asal. Kursi tanpa akun (Admin SPPG, Operator KDMP per 3 Okt) membalas 404 "Belum ada akun untuk kursi ini". Jangan hidupkan lagi tukar-peran cookie.
