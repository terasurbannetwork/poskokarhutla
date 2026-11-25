# DESIGN-SYSTEM: Peta Situs

Paket ini tidak membuat gaya baru (AGENTS §3.9). Semua komponen sudah ada.

| Pintu | Komponen menu | Sumber gaya |
| --- | --- | --- |
| Publik | `details.bencana` di kepala, tombol `.bc-pred` untuk Prediksi; tombol Lapor dan Masuk memakai kelas `.bc-pred` yang sama | `public/inti/tema.css`, gaya kepala yang ada |
| Staf | Panel kiri `.db-nav.mp-side` di layar lebar dan menu atas `.mp-menu` + `.mp-sub` di layar sempit, keduanya sudah ada di `menu_pusdalops.js`; tanpa tombol pindah sisi, panel bisa ditarik | `public/inti/dasbor.css`, `data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md` |
| Admin (di dalam Staf) | `.ad-grup` `<details name>` yang sudah ada, isinya dari registri | `public/admin/admin.css` |
| BPBD, Petugas, Kampus | Menu yang sudah ada di tiap modul; isinya dari registri | CSS modul masing-masing |

## Aturan

- Ikon garis tanpa kotak atau latar (memori pemilik "ikon tanpa garis luar").
- Deretan subhalaman penuh dari ujung ke ujung, dibagi rata, dan berikon.
- Tanpa teks kapital semua dan tanpa titik tengah sebagai pemisah.
- Nama butir menu ditulis lewat skill `bahasa-indonesia-plain`: pendek, kata benda, tanpa singkatan yang tidak dikenal publik.
- Klik menu tidak membekukan layar. Tautan polos, tanpa kerja berat di handler (`~/.claude/INP.md`).
