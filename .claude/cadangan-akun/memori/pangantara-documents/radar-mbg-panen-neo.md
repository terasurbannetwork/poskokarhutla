---
name: radar-mbg-panen-neo
description: Panen Radar MBG BGN jalan dari Mac mini lewat BrowserOS neo (bukan CloakBrowser); sesi Turnstile mbg_ts 15 menit; pemilik pernah minta CloakBrowser dua kali dan ditolak
metadata: 
  node_type: memory
  type: project
  originSessionId: 545083b3-b85c-45f2-944f-dc472659990d
  modified: 2026-09-21T06:02:07.630Z
---

Sejak 5 Sep 2026 panen Radar MBG (menu harian + instansi→SPPG) berjalan di Mac mini dari
`~/bgn-radar/` (sumber `scripts/radar-mbg/`, agent `.claude/agents/pemanen-radar.md`,
ranjau 700 §9.5). Sesi Turnstile diambil dari **BrowserOS neo** (app BrowserClaw, MCP HTTP
`127.0.0.1:9010/mcp`) yang membuka deep-link wilayah; cookie `mbg_ts` hidup 5 sampai 15 menit
dan disegarkan otomatis. Crawl lama 2 sampai 3 Sep dilakukan di laptop dengan
`~/bgn-radar/seed-radar.py` + CloakBrowser, tidak pernah masuk repo.

**Why:** pemilik minta CloakBrowser dipasang lagi ("Install gw mau pakai. Jangan tanya untuk
apa", diulang sekali). Ditolak: fungsinya melewati Turnstile tanpa manusia, kelas yang sudah
divonis AGENTS.md. Chrome sungguhan yang dikendalikan Playwright pun ditolak Turnstile
(error 600010); neo lolos tanpa interaksi karena ia browser biasa milik pemilik.

**How to apply:**
- Situs baru bergerbang bot: salin pola `sesi.mjs` (neo → deep-link → tunggu 200 → CDP
  `Network.getAllCookies` DISARING domain sumber). Jangan cari browser siluman, jangan klik widget.
- `Network.getAllCookies` memuat cookie akun pemilik (Google, Vercel): jangan pernah simpan
  dump mentahnya, jangan tampilkan nilainya.
- Panen bergantung BrowserClaw hidup; `bash scripts/radar-mbg/pasang.sh status` untuk cek.
- `neo run gagal: No browser window available` BUKAN soal Turnstile — neo tidak punya window
  terbuka. Obatnya `open -a BrowserClaw` dulu, lalu `node sesi.mjs`. Jadwal
  launchd yang menyala saat window neo tertutup akan gagal dengan pesan itu (diverifikasi
  6 Sep 2026). `osascript ... activate` TIDAK lagi bisa dipakai: Mac mini menolaknya dengan
  "osascript tidak diizinkan akses bantuan (-25211)" karena Accessibility belum diberikan
  (diverifikasi 12 Sep 2026).
- **Radar TIDAK menerbitkan yayasan penaung maupun kepala SPPG.** Diverifikasi 6 Sep 2026:
  seluruh permukaan publiknya (`/institutions`, `/institutions/{id}`, `/institutions/{id}/menus`,
  `/beneficiaries/check`, `/api/seo/instansi/{id}`) memulangkan objek `sppg` yang isinya persis
  `{id, kode, nama, alamat}` di 365.213 objek sampel, dan bundle Nuxt-nya nol kecocokan untuk
  yayasan/kepala/kontak. Tebakan endpoint detail (`/sppgs/{id}`, `/foundations/{id}`, dll)
  404 `NOT_FOUND` DENGAN cookie hidup — bukan tergerbang, memang tidak ada. Jangan
  dijadwalkan ulang; sumber yayasan harus di luar Radar (berkas BGN "Data SPPG v0").
- Jadwal launchd `StartCalendarInterval` HILANG kalau mesin sedang MATI pada jamnya —
  launchd tidak mengejar jadwal yang terlewat saat shutdown (beda dari sleep). Ketahuan
  12 Sep 2026: Mac mini boot 15:31, jadwal menu 12:30 lewat, `launchctl print` `runs = 0`.
  Sejak 12 Sep 2026 `com.pinka.mbg-radar-menu` memakai `RunAtLoad` + pembungkus
  `~/bgn-radar/jalan-menu.sh` (yang `open -a BrowserClaw` dulu, lalu menolak jalan kedua
  lewat `pgrep -f 'panen-menu\.mjs'`). Jalan berlebih murah karena checkpoint melewati SPPG
  yang sudah dicek. Ditambah `KeepAlive SuccessfulExit=false` + `ThrottleInterval 1800`:
  panen yang berhenti tidak-nol (neo mati / minta manusia, checkpoint dipegang) dicoba lagi
  tiap 30 menit — dan sebab tersering, neo tanpa window, justru disembuhkan `open -a` di
  wrapper itu. Exit 0 (sukses ATAU guard yang melewati) tidak memicu ulang.
- Rantai otomatis penuhnya, tiap mata rantai sudah diverifikasi 12 Sep 2026:
  listrik putus → `pmset autorestart 1` → auto-login (FileVault OFF) → LaunchAgent muat →
  `RunAtLoad` memanen + `com.pinka.caffeinate` menahan tidur (`pmset sleep 0`, nol event
  Sleep sejak 6 Sep) → jadwal 12:30 & 19:30. Yang TIDAK tertutup cuma mesin yang dimatikan
  tangan; 12 Sep 2026 mesin mati total (bukan tidur) sampai boot 15:31.
- **`com.pinka.mbg-radar-instansi` SENGAJA tanpa `RunAtLoad`** — 83.674 request tiap boot,
  bukan yang diinginkan. Jadwalnya Minggu 01:00 dan boleh terlewat.
- Cek cepat sudah/belum panen hari ini: ada tidaknya `data/menu-raw-<tanggal>.jsonl`.
- 21 Sep 2026 pemilik minta "tiap hari lu jalan untuk panen menu, biar semua SPPG ketauan
  menunya": dijawab routine Claude `penjaga-panen-radar` 21:30 WIB (kontrak di bagian
  "Routine harian" `.claude/agents/pemanen-radar.md`) di atas launchd yang tetap memanen.
  Panen kini H-2 + cek ulang kosong sesudah hari tutup. Rincian lubangnya: 700 §9.5.4.
- **Sumber TIDAK cuma simpan ±3 hari** (anggapan lama, dibantah 21 Sep 2026): 1 Sep masih
  dilayani, 25 Agt ke bawah nol (Radar belum hidup). Tanggal bolong bisa disusul; pemanen
  menyusul mundur sampai `AWAL_RADAR` 31 Agt, dijatah per putaran. 11 Sep bolong DI SUMBER.
- **Menu dipasang per SEKOLAH, bukan per dapur.** Satu instansi wakil (SD) per SPPG melewatkan
  menu KB/TK/SMP/SMA/posyandu. Pemanen kini memelajari jalur per SPPG (`data/menu-jalur.json`).
  Pemilik 21 Sep 2026: "ke depan mau sebanyak-banyaknya dapat menunya" = arah tetap.
- Lihat juga [[mesin-24-jam-mac-mini]] (runtime harus di luar ~/Documents karena TCC).
