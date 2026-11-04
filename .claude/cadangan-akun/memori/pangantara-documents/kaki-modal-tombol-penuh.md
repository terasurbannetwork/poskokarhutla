---
name: kaki-modal-tombol-penuh
description: "Vonis 7 Okt 2026, standar seluruh app: tombol di kaki popup sebaris, sama lebar, ujung ke ujung; Batal = tombol berbingkai, bukan teks"
metadata:
  node_type: memory
  type: feedback
  originSessionId: bcc06fe7-5254-4f40-9e5e-c2d60e11b3cb
  modified: 2026-10-07T12:08:11.244Z
---

Popup/modal yang kakinya punya lebih dari satu tombol: SEMUA tombolnya sebaris, ukurannya sama, dan memenuhi lebar kaki dari ujung ke ujung (mis. Simpan Kombinasi · Hapus · Batal = tiga kolom sama lebar). "Batal" dan "Hapus" tetap tombol berbingkai rounded, bukan teks polos. Pemilik: "Catat ya gw mau kalo ada pop up gini ada beberapa button di bawah ya dibuat lebar dan penuh. Tiga-tiganya ujung ke ujung, sebaris dan ukurannya sama."

**Why:** kaki modal kalender menaruh tombol utama kecil di kiri dan Batal teks polos di kanan dengan ruang menganga di tengah; pemilik minta dua kali di sesi yang sama lalu menjadikannya standar.

**How to apply:** tiap modal baru/diubah pakai komponen kaki modal bersama (disapu + digerbang 7 Okt oleh agent tukang-layar; cek nama komponennya di 200-rincian-selera.md); jangan menulis kaki tangan. Satu keluarga dengan aturan "nol ruang menganga" `[&>*]:grow` di kanon. Lihat juga [[tabel-kosong-tetap-tampil]].
