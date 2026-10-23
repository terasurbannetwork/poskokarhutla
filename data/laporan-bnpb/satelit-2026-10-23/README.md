# Laporan Penanganan Pengendalian Karhutla 231026

Cut-off 23 Okt 2026 07.00 WIB, kolom 20/21/22 Okt, gaya sama dengan deck 221026 (`../satelit-2026-10-22/`).

- Angka slide peta dan tabel diambil dari data website `https://centurisk97.id/data/peta_karhutla.json` (dibuat 23 Okt 11.15 WIB),
  bukan FIRMS mentah. Untuk 19–21 Okt hasilnya identik dengan `../satelit-2026-10-22/angka_nasional.json` (0 beda).
- `ganti.py` = `../satelit-2026-10-22/sementara-22okt-1625/ganti.py` dengan `CUTOFF = '23 Okt 2026, 07.00 WIB'`.
- `koordalops.py`: `ganti_tabel()` diisi PM2.5 BMKG 23 Okt 04.00 WIB dan prakiraan cuaca 23–25 Okt dari Laporan Harian Dit. Koordalops
  22102026. Slide operasi (`ganti_operasi()`) BELUM diperbarui: masih data 21 Okt dari ringkasan WA 22 Okt, judulnya bertanggal 21 Okt.
  Perlu ringkasan WA "Laporan Karhutla 23 Oktober 2026" untuk armada per provinsi, OMC, dan semai 22 Okt.

Bangun ulang (dari folder kerja yang berisi `deck/src.pptx` = `../satelit-2026-10-21/sumber-asli-BNPB-211026.pptx` dan `deck/x/` hasil unzip):

    node peta.mjs
    python3 -I ganti.py . t1.pptx
    python3 -I tambah_peta.py t1.pptx peta-20okt.png angka_nasional.json
    python3 -I koordalops.py t1.pptx "Laporan Penanganan Pengendalian Karhutla 231026.pptx"
    python3 -I cek6.py "Laporan Penanganan Pengendalian Karhutla 231026.pptx"
