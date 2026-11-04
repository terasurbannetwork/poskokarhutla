---
name: ocr-pdf-pindaian-swift-vision
description: PDF pindaian (pdftotext nol kata) dibaca murah lewat Swift PDFKit + Vision di Mac ini, bukan dengan membaca halaman sebagai gambar
metadata:
  type: reference
---

PDF hasil pindaian (mis. 41 SOP BGN, 15 Sep 2026) memulangkan NOL kata dari
`pdftotext`. Membacanya sebagai gambar lewat tool Read memakan ribuan token per
halaman; ~480 halaman berarti ratusan ribu token untuk teks yang sebenarnya
bisa didapat gratis.

Jalur murahnya: skrip Swift yang merender tiap halaman dengan PDFKit lalu
mengenali teksnya dengan `VNRecognizeTextRequest` (`recognitionLanguages`
`["id-ID","en-US"]`, level `.accurate`, skala render 2x). `swift`/`swiftc` sudah
ada di mesin ini. 41 PDF selesai dalam satu putaran `xargs -P 6`.

**Ranjau:** dua berkas memulangkan 6-7 byte (cuma form-feed) saat dijalankan
paralel dan itu TIDAK memunculkan error — jejaknya cuma ukuran berkas. Periksa
`wc -w` tiap keluaran sebelum menyerahkannya ke agent; yang kosong dijalankan
ulang satu per satu.

Repo ini juga punya `ocr-server/` (Mac mini, `lib/ocr-server.ts`), tapi untuk
kerja sekali jalan skrip Swift lebih pendek daripada menyalakan servernya.
