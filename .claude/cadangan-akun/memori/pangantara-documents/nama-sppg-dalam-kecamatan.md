---
name: nama-sppg-dalam-kecamatan
description: "Vonis 26 Sep 2026 — baris SPPG di bawah kepala grup kecamatan cukup nama desa (\"Air Itam\"), bukan \"B.I. Air Itam\"; plus standar tabel yang ditegaskan hari itu"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a6142637-cfe0-4dee-b14c-b5de4210cd0c
  modified: 2026-09-26T09:40:25.630Z
---

Nama SPPG di baris yang sudah berada di bawah kepala sub-grup kecamatan TIDAK mengulang kecamatannya: "B.I. Air Itam" → "Air Itam" (`namaDapurPendek(nama, { kabupaten, kecamatan, tanpaKecamatan: true })`). Tabel/daftar yang cuma dikelompokkan per kota tetap memakai singkatan kecamatan ("B.I. Air Itam", aturan 21 Sep).

**Why:** pemilik: "kalo BI Air Itam cukup Air Itam ya" — kecamatan sudah tercetak di kepala grup, singkatan di tiap baris jadi pengulangan.

**How to apply:** tiap tabel per SPPG hari itu ditegaskan berbentuk: lencana kode + nama pendek, grup Kota → Kecamatan lipat, wadah membulat (bukan kotak), SortTh, uang Rp kiri digit kanan, warna uang merah/hijau saja, tanpa paragraf keterangan, tanpa chip rinci (label jumlah "19 SPPG"), ikon aksi polos tanpa lingkaran, layar uang dibelah Bahan Baku | Barang Ops. Gerbang: `tests/unit/gerbang-nama-dalam-kecamatan.test.ts`. Terkait [[caps-lock-dilarang]].
