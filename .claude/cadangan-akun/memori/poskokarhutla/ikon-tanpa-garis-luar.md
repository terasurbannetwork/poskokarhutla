---
name: ikon-tanpa-garis-luar
description: "Tombol ikon (WA, kalender, pin, dll) tidak boleh punya garis luar/kotak/latar; cukup ikonnya saja"
metadata:
  node_type: memory
  type: feedback
  originSessionId: d7799625-92ed-4840-bae3-6ad19498b2a7
  modified: 2026-11-03T09:20:53.336Z
---

Tombol berikon tampil sebagai ikon polos: tanpa border, tanpa kotak berlatar, tanpa outline bulat. Hover cukup ganti warna (atau sedikit membesar), bukan menambah bingkai.

**Why:** pemilik menegaskan 3 Nov 2026 saat merombak /bnpb/dalops ("icon gw ga pernah mau ada garis luarnya, catat").

**How to apply:** semua layar baru dan yang disentuh, di proyek mana pun. Contoh benar: `.dl-ikon{border:0;background:none}` di public/bnpb/dalops.css. Fokus keyboard tetap boleh pakai outline saat :focus-visible (aksesibilitas). Lihat juga [[sidebar-bisa-ditarik]] untuk selera peta.
