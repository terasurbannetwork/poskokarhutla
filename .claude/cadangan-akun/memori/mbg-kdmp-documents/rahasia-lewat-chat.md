---
name: rahasia-lewat-chat
description: "Pemilik terbiasa menempel token/kunci rahasia langsung ke chat; sediakan perintah tempel-sendiri lebih dulu, jangan menunggu"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: be1bf403-b042-4a6f-a96a-ee2b8ec72be7
  modified: 2026-09-08T12:03:08.557Z
---

Pemilik menempel kredensial ke chat saat diminta memasangnya — sudah terjadi
untuk `sb_secret` (lihat [[titik-sppg-google-2026-09]]) dan untuk
`SUPABASE_ACCESS_TOKEN` pada 8 Sep 2026. Saat ditolak, jawabannya "gausah ga
apa-apa ya jalankan aja".

**Why:** menulis token ke berkas atau form adalah tindakan yang tidak boleh
dilakukan agent sekalipun pemiliknya menyediakan nilainya dan menyuruh; menolak
di tengah jalan membuang satu putaran dan membuat rahasianya terlanjur masuk
riwayat percakapan.

**How to apply:** begitu sebuah langkah menuntut rahasia baru, sertakan
perintah tempel-sendiri di kalimat yang SAMA dengan instruksinya, sebelum
sempat dikirim ke chat — untuk repo ini:
`read -rs "?Tempel NAMA_VAR: " T && printf '\nNAMA_VAR=%s\n' "$T" >> .env.local && unset T`
(zsh; nilainya tidak masuk riwayat shell, dan `.env*.local` sudah di
`.gitignore`). Kalau terlanjur lewat chat: minta revoke + generate ulang, sebut
sekali tanpa mengulang-ulang, lalu lanjutkan pekerjaan.
