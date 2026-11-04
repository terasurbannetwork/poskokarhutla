---
name: kdmp-rantai-vonis-2026-10-01
description: "Vonis 1 Okt 2026 — order dapur otomatis jadi draf PO KDMP, pasangan agregator ditagih lewat kdmp_tagihan, gerbang aktif koperasi dilonggarkan"
metadata:
  node_type: memory
  type: project
  originSessionId: 5bb71b1c-9289-489a-a7b5-55b58f6532fe
  modified: 2026-10-01T08:55:59.106Z
---

Pemilik 1 Okt 2026, menjawab tiga pertanyaan rantai KDMP×SPPG (saat itu 83.360 dari 83.362 koperasi masih `calon`, transaksi KDMP nol):

1. **Order dapur → PO koperasi: otomatis.** Diterjemahkan jadi DRAF `kdmp_po` otomatis ke koperasi tertaut; mengirimnya tetap keputusan manusia (prinsip kanon 2).
2. **Pasangan `kdmp_sppg.agregator=true`: tagihan KDMP diizinkan.** Satu kewajiban satu jalur: tagihan supplier langsung ke dapur itu yang ditutup, bukan dua-duanya hidup (700 §9.16 bayar dua kali).
3. **Gerbang aktif koperasi (`kdmp_gerbang_aktif`): dilonggarkan.** SK/NPWP/rekening jadi kekurangan bertanda, bukan penghalang status aktif; rekening baru wajib di titik bayar.

**Why:** rantai sudah terbukti jalan ujung ke ujung (uji e2e 147), yang menahan cuma prasyarat manual dan gerbang aktif yang terlalu ketat.

**How to apply:** jangan kembalikan PO manual-only atau gerbang aktif ketat tanpa vonis baru. Terkait [[kdmp-sppg-integrasi-2026-09]], [[nav-sppg-kdmp-2026-09]].
