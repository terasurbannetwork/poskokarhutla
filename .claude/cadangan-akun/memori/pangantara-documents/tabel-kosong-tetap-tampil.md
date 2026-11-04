---
name: tabel-kosong-tetap-tampil
description: "Vonis 28 Sep 2026, DIULANG 7 Okt 2026 (\"Catat ya. lu harus gini\"): tabel data tetap digambar walau kosong — kepala kolom + satu baris \"Belum ada …\", bukan EmptyState menggantikan tabel; berlaku seluruh app"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2bd94398-93d4-48a7-bc74-5c5e10785e4a
  modified: 2026-10-07T06:30:11.179Z
---

Pemilik dua kali dalam sehari 28 Sep (Pengeluaran, lalu Harga Bahan Baku & Barang Ops di Dashboard) minta: "Munculin aja dulu tabelnya walaupun isinya kosong". 7 Okt 2026 diulang lagi dengan nada final ("Catat ya. lu harus gini", "Lu cek yang lain juga ya") sambil menunjuk tabel KDMP (Top Pelanggan, Komposisi Subsegmen, Bayar ke Pemasok, Stok Menipis) sebagai MODEL yang benar, dan kartu 🛒 "Belum ada belanja di periode ini" sebagai yang salah.

**Why:** EmptyState besar yang menggantikan tabel menyembunyikan bentuk data (kolom apa saja yang nanti terisi); pemilik mau kerangka tabelnya selalu terlihat. Diulang berarti penerapan per-kasus tidak cukup: tiap kartu bertabel baru wajib lahir dengan pola ini.

**How to apply:** jangan `if (rows.length === 0) return <EmptyState/>` untuk kartu bertabel. Gambar `<table>` lengkap (thead; tfoot Total/Rata-rata DISEMBUNYIKAN saat kosong), di `<tbody>` satu baris kosong (`BarisKosong`) teks telegrafis "Belum ada … di periode ini", tanpa emoji, tanpa baris kedua penjelasan. EmptyState tetap sah untuk layar non-tabel, "pilih dapur dulu", dan "terkunci untuk peran ini". Gerbangnya `tests/unit/gerbang-tabel-kosong-tampil.test.ts` (diperkuat 7 Okt lewat sapuan seluruh app). Terkait [[standar-tabel-sppg-2026-09-27]].
