---
name: kdmp-admin-gemah-ripah
description: "Vonis 5 Okt 2026: KDMP di Pangantara tiru Admin (Pengguna, Tampilan, Dokumen, Pengaturan, Link Eksternal, Sistem, Arsip), Stok, Akuntansi Gemah Ripah; Sortir tidak dibuat; akuntansi diintegrasikan"
metadata:
  type: project
---

Pemilik 5 Okt 2026 (16.23 WITA) kirim tangkapan layar Gemah Ripah (`~/Documents/GitHub/gemah-ripah`) + "Untuk KDMP di Pangantara ... tambahin ya ada Adminnya. Tiru ya. Asal tidak ada yang berlawanan."

- Admin: Pengguna (ringkasan per peran, grup per peran, belum ganti sandi, WA/Ubah/Tutup-Buka/Batal), Tampilan, Dokumen (tema umum + per dokumen, pratinjau A4: Invoice, Surat Jalan, Kwitansi, Penawaran, PO, Slip Gaji, PKS, Laporan), Pengaturan, Link Eksternal, Sistem, Arsip.
- Stok: Stok Barang, Hitung Fisik, Barang Rusak. **Sortir TIDAK** ("Sortir gausah ada").
- Akuntansi: Jurnal, Buku Besar, COA, Mutasi Bank, Rekonsiliasi, Biaya, Laporan, Tutup Buku (+PPN, Ekspor Master) — "diatur ya diintegrasikan" dengan jurnal koperasi yang ada.

**Why:** Gemah Ripah = rujukan niaga umum KDMP ([[kdmp-niaga-umum-2026-10]]).
**How to apply:** pemetaan + gap di `docs/usulan/kdmp-admin-gemah-ripah/proposal.md`; yang berlawanan dengan kanon Pangantara disesuaikan, bukan disalin.

Tambahan 5 Okt sore: pemilik kirim juga Pembayaran, Pemasok, PO Supplier, Invoice, Order, Pelanggan (CRM/pipeline/aktivitas/peta), Dashboard (insight klien, bauran, matriks margin, keuangan, siklus kas) + "Tiru semua". **Model insight Gemah Ripah wajib diterapkan ke SEMUA gerai** (apotek, sewa, ojek, paket, produksi, saprotan), bukan cuma SPPG dan B2C: satu mesin insight di atas view transaksi gabungan per koperasi, disaring per gerai.

Vonis 5 Okt malam: "push sampai jadi. Gas terus. Semua lu tentukan sendiri" — gelombang W0..W5 jalan otonom tanpa tanya; keputusan default di proposal bagian 10 berlaku.

Status 5 Okt malam: W0..W5 (Admin, Stok, Akuntansi, Insight lintas 13 gerai, Pembayaran, Pemasok/PO, Pelanggan CRM, Order/Invoice, Dashboard, Personalia, Affiliate/Hadiah, Dokumen+Cek AI, PPN/Ekspor Master) terapan di DB + live di origin 75fa6e601. Drift sejak 20261006 nol. Default diputus: pengawas koperasi boleh BACA dashboard/insight/kas; gaji driver hanya sopir armada (bukan mitra Ojek Desa); teks PKS masih "Rancangan" sampai pemilik periksa (PKS_TEKS_DIPERIKSA).
