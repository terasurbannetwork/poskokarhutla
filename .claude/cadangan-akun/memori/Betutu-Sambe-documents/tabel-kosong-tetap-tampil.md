---
name: tabel-kosong-tetap-tampil
description: "Vonis 28 Sep 2026 (diulang 2x dalam satu sesi): tabel data tetap digambar walau kosong — kepala kolom + satu baris \"Belum ada …\", bukan EmptyState menggantikan tabel"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2bd94398-93d4-48a7-bc74-5c5e10785e4a
  modified: 2026-09-28T04:50:27.563Z
---

Pemilik dua kali dalam sehari (Pengeluaran, lalu Harga Bahan Baku & Barang Ops di Dashboard) minta: "Munculin aja dulu tabelnya walaupun isinya kosong".

**Why:** EmptyState besar yang menggantikan tabel menyembunyikan bentuk data (kolom apa saja yang nanti terisi); pemilik mau kerangka tabelnya selalu terlihat.

**How to apply:** jangan `if (rows.length === 0) return <EmptyState/>` untuk kartu bertabel. Gambar `<table>` lengkap (thead, tfoot/Grand Total bila ada), dan di `<tbody>` satu `<tr><td colSpan={n}>Belum ada … </td></tr>` teks polos tanpa emoji. EmptyState tetap sah untuk layar non-tabel dan untuk "terkunci untuk peran ini". Sudah diterapkan: PengeluaranMatrix/pengeluaran-tabel, HargaBahanBakuBlok, HargaBarangOpsIsi. Belum ada gerbang mekanis — kandidat pemindai: berkas ber-`<table` yang juga me-return `<EmptyState` dini. Terkait [[standar-tabel-sppg-2026-09-27]].
