---
name: standar-tabel-sppg-2026-09-27
description: "Vonis 27 Sep 2026 (berulang, pemilik kesal \"kenapa lu ga ngerti-ngerti\"): rincian satu tingkat di bawah cakupan, grup Kota→Kecamatan lipat, lencana kode+nama, pemilih cakupan lebar penuh & isi seragam, Bahan|Ops di semua kartu"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 4adfac87-4a41-4418-9a83-0e9765358565
  modified: 2026-09-27T09:16:44.933Z
---

Pemilik mengulang aturan ini berkali-kali 27 Sep 2026 dan kesal karena tabel demi tabel meleset:
- Rincian = satu tingkat di bawah cakupan: nasional→provinsi, provinsi→kab/kota, kab/kota→kecamatan, kecamatan→SPPG. Berlaku semua akun termasuk Super Admin (grafik Tren juga).
- Tabel per SPPG: grup Kota → sub-grup KECAMATAN lipat → baris SPPG. Tidak boleh satu tingkat kota saja, tidak boleh grup per nama dapur, tidak boleh tabel dalam tabel.
- Kode + nama = SATU kolom: lencana kode (pil navy) + nama pendek. Bukan kolom Kode teks polos terpisah, bukan teks tebal "LA-BL-001 Labuhan Dalam".
- 28 Sep 2026: sub-grup KECAMATAN bawaan TERTUTUP (acuan resmi `app/(app)/monitoring/triase-tabel-hari-ini.tsx`, "yang lain dibuat gini juga"); sapuan + gerbang `gerbang-subgrup-kecamatan` dikerjakan hari itu.
- 1 Okt 2026 (diulang, "lu dengerin ga sih?"): di tabel MATRIKS angka, baris Kota dan Kecamatan WAJIB membawa subtotal angkanya di baris yang sama (kolom pertama Wilayah menempel), Subtotal/Rata-rata label+angka satu baris. Kecamatan lipat tanpa angka = belum jadi. Gerbang: gerbang-subgrup-kecamatan Pola A/B.
- Acuan bentuk yang disukai: "Hari Ini Lintas SPPG" dan `components/monitoring/TabelAnggaranMingguan.tsx`.
- Pemilih cakupan SPPG: LEBAR PENUH kontainer ("itu perintah gw dari awal"), isi seragam bentuk Dashboard (nama PIC + ikon WA + jumlah SPPG), angka jelas jumlah SPPG.
- Setiap kartu yang punya padanan ops dibelah Bahan Baku | Barang Ops, satu sakelar per kartu.
- Setiap bar cari kartu punya ikon Excel + PDF.

**Why:** pemilik melihat cakupan GMR Lampung (1.174 dapur) dan tiap tabel yang cuma bertingkat kota tidak terbaca.
**How to apply:** sebelum menyentuh tabel/kartu Dashboard/Monitoring/Kalender, cek kelima butir; pasang gerbang mekanis, jangan cuma prosa. Terkait [[nama-sppg-dalam-kecamatan]], [[cermin-bahan-ops]].
