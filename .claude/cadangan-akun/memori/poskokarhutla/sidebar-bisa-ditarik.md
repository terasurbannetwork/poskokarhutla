---
name: sidebar-bisa-ditarik
description: "Semua sidebar/panel samping di layar peta wajib bisa ditarik lebarnya, dan layar peta baru meniru gaya peta utama (index.html)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 459f8ac7-8c69-4e39-9b31-3d9b0636280c
  modified: 2026-11-03T04:35:59.971Z
---

Semua sidebar atau panel samping (terutama yang melayang di atas peta) wajib punya pegangan tarik lebar, pola `.tarik` di `public/index.html`; lebarnya diingat per peramban.

Layar peta baru meniru peta utama, bukan gaya karangan sendiri: panel Overlay berubin (`#lapis` + `ubinLapis`), kartu `#legenda` putih berjudul LEGENDA, titik panas berwarna umur, cluster prioritas berangka, jejak "Indonesia ›", tabel bergaya `.tb`.

**Why:** pemilik, 3 Nov 2026, saat merombak `/bnpb/operasi-lapangan`; pemilik marah ketika legenda dan overlay dibuat dengan gaya lain dari peta utama.

**How to apply:** sebelum membuat panel atau kontrol peta, buka `public/index.html` lalu salin struktur dan CSS-nya. Contoh jadi: `public/bnpb/operasi_lapangan.js` (`pasangTarik`, `renderLegenda`, `LAPIS_GRUP`).
