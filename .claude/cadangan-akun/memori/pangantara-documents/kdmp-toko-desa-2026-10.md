---
name: kdmp-toko-desa-2026-10
description: "vonis 4 Okt 2026 Toko Desa KDMP (warga belanja ke koperasi lewat link ala Astro/Alfagift): satu sistem pintu terpisah, tanpa OTP, harga = kdmp_harga, semua warga, stok manual"
metadata:
  node_type: memory
  type: project
  originSessionId: 29441f73-f10d-4c23-b574-9c673628f568
  modified: 2026-10-04T13:55:16.659Z
---

Toko publik koperasi desa `/toko/<kode>` (usulan `docs/usulan/kdmp-toko-desa/`: proposal, spec, tugas, riset layar Astro & Alfagift dari tangkapan layar pemilik). Diputus pemilik 4 Okt 2026:

- **Satu sistem dengan Pangantara, pintu terpisah** (pemilik bertanya "harus dipisah?"; jawabannya tidak: katalog, harga, stok, pelanggan, rel umum `kdmp_penjualan`, kas, driver sudah di sini). Katalog statis + revalidasi karena DB compute kecil.
- **Tanpa OTP** nomor WA; tahan dengan batas laju + honeypot + konfirmasi pengurus.
- **Harga = harga jual koperasi** (`kdmp_harga` mingguan, dijaga `kdmp_rentang_harga` GM+PM); toko tak punya kolom harga sendiri.
- **Semua warga** boleh belanja; anggota dikenali → kartu anggota + perkiraan SHU (menggantikan poin/koin/misi).
- **Stok manual dulu** (tersedia/sisa/habis/pre-order), gudang menyusul.
- Model: kartu produk Alfagift, kerangka+keranjang Astro, cara pesan Ambil/Antar ala Alfagift, Belanja Rutin ala Alfagift, komponen + pola checkout aman dari Betutu Sambe `/pesan`.

**Why:** pemilik minta "Ambil model yang terbaik dan cocok untuk diterapkan di KDKMP" setelah mengirim ~60 tangkapan layar.
**How to apply:** jangan tanya ulang empat keputusan ini; implementasi mengikuti `tugas.md` fase 1-4. Rel penjualan non-SPPG: [[kdmp-niaga-umum-2026-10]].
