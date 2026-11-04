---
name: caps-lock-dilarang
description: Pemilik menolak teks KAPITAL penuh di layar maupun di kertas; sudah tiga kali divonis, terakhir 8 Sep 2026
metadata:
  type: feedback
---

Tidak boleh ada teks KAPITAL penuh yang sampai ke mata orang: nama orang, nama
lembaga, nama wilayah, kepala kelompok, baris total. Berlaku untuk LAYAR dan
untuk lembar cetak/ekspor.

Vonisnya sudah tiga kali, dan tiap kali karena perapiannya dipasang per TEMPAT,
bukan per kolom:
- 7 Sep 2026 — "KOTA PADANGSIDIMPUAN" di tabel wilayah.
- 8 Sep 2026 pagi — "YAYASAN SINERGI TIGA TUJUH DELAPAN" di hasil pencarian.
- 8 Sep 2026 sore — nama manajer di lembar cetak sebaran: "Bro kan udah gw
  bilang gw ga mau ada yang CAPS LOCK. Lu mikir lah. Catat. Jangan lupa lagi."

**Why:** data impor (BGN, simkopdes, Dapodik) memang KAPITAL penuh — 16 rb dari
17 rb baris `sppg_bgn.yayasan`, 500 rb dari 543 rb `sekolah_nasional.sekolah` —
jadi yang tampil apa adanya bukan pengecualian, itu bentuk bawaannya.

**How to apply:** `rapikanNamaOrang()` untuk nama orang (ia membuang gelar),
`rapikanJikaKapital()` / `rapikanNamaWilayah()` untuk lembaga & wilayah, semua
dari `lib/format.ts`. DISPLAY-ONLY: jangan rapikan nilai yang dipakai
mencocokkan ke DB. Juga jangan pakai CSS `uppercase` untuk label baru.
Gerbangnya `tests/unit/gerbang-caps-lock.test.ts` — sejak 8 Sep 2026 memindai
`.ts` dan `.tsx`, karena lubang terakhirnya ada di berkas lembar cetak yang
tidak punya satu pun JSX. Kolom baru yang terbukti kapital didaftarkan di
`KOLOM_KAPITAL`, bukan diperbaiki diam-diam di satu layar.
