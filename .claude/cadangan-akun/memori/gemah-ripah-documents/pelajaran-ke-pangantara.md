---
name: pelajaran-ke-pangantara
description: "Tugas tertunda (24 Sep 2026): setelah Gemah Ripah selesai & sempurna, catat semua knowledge/model/selera lalu jadikan kamus untuk memperkuat pangantara (kecuali palet warna)"
metadata:
  node_type: memory
  type: project
  originSessionId: 5bbdd857-6372-483b-abe6-be916858611d
  modified: 2026-09-26T04:08:48.634Z
---

Pemilik minta (24 Sep 2026): SETELAH Gemah Ripah benar-benar selesai dan sempurna (semua agent polesan/fitur/audit lapor, gerbang hijau, tayang), kumpulkan seluruh pembelajarannya lalu bawa ke repo pangantara sebagai kamus/pelajaran.

Isi yang dicatat:
- Selera UI/tabel yang diputus sepanjang sesi (lihat [[selera-tabel-ui]]): baris grup subtotal per kolom, nol hitungan, grup per minggu, tanggal slot tetap, desimal seragam, legenda satu baris, toolbar hanya search+ikon, filter di BarFilter bawah, Ringkasan lipat default tertutup, satu tabel per tampilan, data berbaris = tabel, form opname = lembar hitung, retur via modal, periode dua baris, grafik pastel + kontrol sebaris kanan, Rp kiri angka kanan.
- Model/pola teknis: gerbang baru (batas-klien 'use client', RpCell wajib, dsb), komponen bersama, pola DB (nomor_urut, jurnal otomatis, aturan_mutasi, trip_otomatis, langganan, daftar_harga, stok anti-minus), impor xlsx lewat RPC, uji integrasi rolled-back.
- Proses: urutan menu = alur usaha, perbandingan periode like-for-like, dsb.

**Status 26 Sep 2026:** kamus `950-pelajaran-gemah-ripah.md` sudah ditulis di kanon pangantara. Pemilik memvonis ke-10 bentrok aturan "Ikut GR" (tabel geser+kolom menempel, nol sel dua baris, nol "…", legenda satu baris, subtotal per kolom, Ringkasan di tiap halaman daftar, KPI putih, persen rata kanan, tanggal slot tanpa koma, tutup buku boleh). Penerapannya ke pangantara pakai gerbang ber-ratchet (daftar utang hanya boleh menyusut).

**Kecuali**: model warna/desain merek. Pangantara punya palet & desain sendiri; jangan bawa hijau-emas Gemah Ripah.

**Why:** pemilik ingin pelajaran satu proyek menguatkan sistem pangantara (kanon selera-pinka ada di repo pangantara, di-symlink ke sini).
**How to apply:** jangan mulai sebelum Gemah Ripah dinyatakan selesai. Saat mulai: tulis ke kanon selera-pinka di repo pangantara (references/*) sebagai kamus + usulan gerbang, bukan menimpa keputusan pangantara yang sudah ada tanpa vonis pemilik.
