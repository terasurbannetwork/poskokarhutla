---
name: scribd-unduh-massal-kena-ban
description: "Unduh Scribd beruntun lewat browser neo memicu blokir 403 \"automated download queries\" (9 Sep 2026); jeda manusiawi wajib, bukti = berkas mendarat"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 39ad6aaa-d9ab-4df3-8ecb-1e93a5ab7726
  modified: 2026-09-10T05:44:28.105Z
---

Unduh massal di Scribd (akun Premium pemilik, lewat BrowserOS neo) berhenti mendarat
setelah ~8 berkas beruntun pada 9 Sep 2026 23:57 WIB. Sebabnya BUKAN neo: endpoint
`www.scribd.com/document_downloads/direct/...` membalas `403 "your computer or network
may be sending automated download queries"`. Tombol Unduh tetap bilang "Pengunduhan
Dimulai", chrome://downloads tidak mencatat apa pun, jadi kegagalannya diam. Blokir
masih aktif 12+ jam kemudian (kelas harian, bukan cooldown menit).

**Why:** Pemilik minta dicatat "biar ga keulang lagi": klik beruntun tanpa jeda
dibaca Scribd sebagai bot, dan akunnya sendiri yang kena. Mengganti IP untuk
menembus blokir ditolak (itu menghindari deteksi anti-abuse layanan).

**How to apply:** Untuk situs mana pun yang punya rate-limit unduhan (Scribd, dan
sejenisnya): satu dokumen per ≥90 detik, berhenti di kegagalan pertama, bukti
sukses = berkas muncul di `~/Downloads` (bukan `ok:true` klik), dan JANGAN fetch
URL unduhan langsung berulang karena memperpanjang blokir. Jalur yang TIDAK kena
limit dan sudah terbukti (10 Sep 2026, paritas 123/123 kode dengan PDF asli):
BACA lewat penampil Scribd, `scripts/scribd-bgn/baca-viewer.mjs` → XML gaya
pdftotext → `panen-pdf.mjs <dir>/xml --tulis`. Akun Premium boleh membaca tanpa
batas, jadi itu jalur utama untuk dokumen Scribd, unduhan cuma cadangan. Situs
pengunduh pihak ketiga (vdownloaders dsb.) ditolak diotomatiskan. Terkait
[[radar-mbg-panen-neo]].
