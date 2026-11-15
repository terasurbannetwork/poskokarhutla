# DESIGN-SYSTEM: Perkiraan kerusakan satelit

Mengikuti kartu standar AGENTS.md 3.5 (kepala kartu nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber, kepala tabel navy tulisan putih, kartu berjarak 20 px, tanpa huruf kapital semua, tanpa pemisah titik tengah, tombol ikon polos) dan token tema `public/inti/tema.css`.

| Komponen | Isi |
| --- | --- |
| Kartu "Perkiraan satelit" di halaman Jitupasna kejadian | Pil status uji per bahaya (menunggu uji, gagal uji, lulus terbatas, lulus). Bila lulus: tabel kab (baris) dengan kolom terdampak (batas bawah), tanggal citra, cakupan citra, tombol terima. Pil keyakinan `estimasi-model` dan tulisan "perkiraan satelit, belum diverifikasi" tampil di dalam kartu, bukan di kaki. |
| Kartu gempa | Pil "gagal uji" dan satu baris alasan singkat; tanpa tabel angka. |
| Laci terima | Kab, angka perkiraan, isian jumlah dan tingkat oleh staf, catatan asal terisi otomatis. |
| Peta kecil | Lapisan air atau area terbakar sebagai poligon agregat dan batas kab; tanpa titik bangunan. |

Klik baris membuka laci seketika; peta dimuat tertunda (INP). Bila status bukan lulus, kartu tidak memuat sel angka sama sekali (bukan 0, bukan strip).
