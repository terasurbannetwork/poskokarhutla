---
name: prioritas-data-sppg-2026-09
description: "Prioritas isi sppg_bgn versi pemilik (alamat lengkap, kontak orang, yayasan; dokumen 2026 dulu), cara kerja malam mandiri, dan hemat token dengan Opus untuk detail"
metadata: 
  node_type: memory
  type: project
  originSessionId: 39ad6aaa-d9ab-4df3-8ecb-1e93a5ab7726
  modified: 2026-09-10T19:35:33.513Z
---

Malam 10-11 Sep 2026 pemilik menyerahkan semua keputusan ke agent ("Gw ga mau
memberikan input lagi", target selesai 09:00) dengan tiga prioritas isi `sppg_bgn`:
(1) alamat dilengkapi sampai jalan/nomor, (2) kontak orang di dapur, SPPI atau
perwakilan yayasan/mitra dengan nama + nomor, (3) yayasan tiap dapur. Dokumen 2026
dan akhir 2025 didahulukan karena data awal sudah banyak terisi.

**Why:** data 2025 awal (Surat Perintah 56) sudah mengisi nama kepala hampir semua;
yang masih bolong justru alamat, kontak, dan yayasan, dan itu dibawa BA Verval
2026. RPC `bgn_terapkan_dokumen` sekarang mengisi alamat (hanya kalau >15 karakter
lebih panjang) dan kolom `perwakilan_yayasan`/`perwakilan_yayasan_wa`.

**How to apply:** saat menambah sumber dokumen, ukur sumbangannya ke tiga kolom itu
(bukan nama kepala). Pemilik mendekati batas pemakaian: pantau tiap 30 menit (cron
:11/:41), matikan pemantau per-dokumen, laporan ringkas, dan pekerjaan detail yang
berat (parser kelas baru, kode panjang) didelegasikan ke Agent model `opus`; Fable
merencanakan dan memeriksa. Jaringan Mac mini (router 192.168.8.x) putus dua kali
malam itu; skrip panen harus tetap idempoten dan ada penunggu jaringan
(`~/bgn-radar/scribd-baca/tunggu-jaringan.sh`). Terkait [[scribd-unduh-massal-kena-ban]].
