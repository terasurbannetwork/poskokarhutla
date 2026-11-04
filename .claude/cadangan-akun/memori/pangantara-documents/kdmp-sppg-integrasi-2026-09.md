---
name: kdmp-sppg-integrasi-2026-09
description: "Vonis 25 Sep 2026 membalik \"KDMP berdiri sendiri\" (27 Agt) — jembatan otomatis, KDMP = agregator semua supplier dapur yang ditautkannya, invoice ke dapur = invoice KDMP"
metadata:
  node_type: memory
  type: project
  originSessionId: 76fa6775-80af-4990-9596-a9a1cb8adc68
  modified: 2026-09-25T13:09:48.513Z
---

Vonis pemilik 25 Sep 2026: "integrasikan KDMP dan SPPG semaksimal mungkin". Dipilih **jembatan otomatis** (tabel kdmp_* tetap terpisah, disambung fungsi pemindah/trigger), bukan lebur total, bukan baca-saja. Semua alur: order dapur -> PO koperasi, terima -> tagihan, harga lintas jalur, jurnal & forecast.

Kalimat pengunci: "KDMP yang disambungkan dengan SPPG maka dia akan mengagregasi semua supplier ke SPPG tersebut. Invoicenya nanti pakai Invoice KDMP tersebut."

**Why:** membalik vonis 27 Agt 2026 (700 §9, gerbang `gerbang-kdmp-berdiri-sendiri.test.ts`), yang sendiri menulis "jembatan dibangun saat pemilik bilang siap; bentuknya satu fungsi pemindah, bukan pembongkaran".

**How to apply:** gerbang berdiri-sendiri diubah jadi daftar jembatan RESMI (bukan dihapus); tiap jembatan baru masuk daftar itu + uji e2e. Dapur yang tertaut KDMP tidak ditagih supplier langsung — satu kewajiban satu jalur (lihat 700 §9.16 soal bayar dua kali). Terkait [[kdmp-penjual-warga]], [[nav-sppg-kdmp-2026-09]].
