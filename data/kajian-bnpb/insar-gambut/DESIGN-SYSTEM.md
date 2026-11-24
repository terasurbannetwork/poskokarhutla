# DESIGN-SYSTEM: Kedalaman gambut hilang dari InSAR

Paket ini tidak punya layar publik (D10). Keluarannya berkas laporan lab. Bila IG-07 pernah dibuka, angka InSAR tampil di kartu emisi gambut yang sudah ada dan mengikuti kartu standar AGENTS §3.5 tanpa komponen baru.

## 1. Laporan lab (`tests/insar-gambut/hasil_lab.md`)

- Tabel: jendela, piksel terbakar, piksel kontrol, `koheren_pct`, `Δh_tambahan` (cm) dengan selang, `D_insar` (cm), vonis.
- Satu baris perbandingan: `D_insar` lawan 15, 33 ± 18, 51 cm.
- Tabel kepekaan (`ALPHA`, kontrol) dan tiga uji sebab.
- Kepala kolom di tengah; angka format Indonesia (koma desimal); satuan di kepala kolom; "tak terukur" bukan 0.
- Tanpa kapital semua, tanpa titik tengah pemisah, tanpa kata vonis keselamatan.

## 2. Bila tampil di kartu emisi gambut (IG-07, bersyarat)

- Satu baris di kartu yang ada, berpil "hipotesis"; `title` memuat metode, wilayah, musim, dan batas.
- Tanpa kartu baru, tanpa grafik baru, tanpa peta penurunan.
