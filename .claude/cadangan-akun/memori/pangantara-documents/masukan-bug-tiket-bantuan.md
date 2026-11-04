---
name: masukan-bug-tiket-bantuan
description: "Vonis 26 Sep 2026 — fitur request fitur/laporan bug dibangun di atas tabel tiket_bantuan yang sudah ada, papan IT di /admin?tab=masukan, tombol Masukan di header"
metadata:
  node_type: memory
  type: project
  originSessionId: 96189d4b-11be-4c2b-93e5-bb3478d20444
  modified: 2026-09-26T13:43:31.694Z
---

Pemilik 26 Sep 2026: pengguna (Ka SPPG, KDMP, staf) harus bisa request fitur
dan lapor bug; hasilnya masuk halaman sendiri untuk Tim IT DAN Super Admin.

Keputusan: perluas `tiket_bantuan` (sudah ada sejak migrasi 20260902170000,
panel `TiketBantuanPanel` di /notifikasi?tab=bantuan), bukan tabel baru.
Kolom baru: jenis, prioritas, halaman, lampiran_url, ditugaskan_ke,
ditutup_pada; status +dikerjakan/+ditolak. Migrasi 20260928200000.
Papan IT: /admin?tab=masukan (kursi kepala_it/tim_it ber-role admin, jadi
policy admin sudah mencakup). Pintu kirim: components/MasukanTombol.tsx di
AppNav + POST /api/tiket-bantuan (WA ke it_support_whatsapp_number).

**Why:** Super Admin tidak pernah memakai lonceng (`pakaiLonceng` cuma
SPPG/KDMP), jadi tiket lama tak pernah terlihat pemilik; itu sebab dia mengira
fiturnya belum ada.

**How to apply:** kalau ada permintaan "kotak saran", "lapor bug", "request
fitur": arahkan ke tiket_bantuan + tab masukan, jangan bikin tabel/panel
kedua. Usulan: docs/usulan/masukan-bug/. Terkait [[hr-bagan-organisasi-2026-09]].
