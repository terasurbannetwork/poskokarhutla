# Laporan Penanganan Pengendalian Karhutla 231026

Cut-off 23 Okt 2026 07.00 WIB, kolom 20/21/22 Okt, gaya sama dengan deck 221026 (`../satelit-2026-10-22/`).

- Angka slide peta dan tabel diambil dari data website `https://centurisk97.id/data/peta_karhutla.json` (dibuat 23 Okt 11.15 WIB),
  bukan FIRMS mentah. Untuk 19–21 Okt hasilnya identik dengan `../satelit-2026-10-22/angka_nasional.json` (0 beda).
- `ganti.py` = `../satelit-2026-10-22/sementara-22okt-1625/ganti.py` dengan `CUTOFF = '23 Okt 2026, 07.00 WIB'`.
- `koordalops.py`: `ganti_tabel()` diisi PM2.5 BMKG 23 Okt 04.00 WIB dan prakiraan cuaca 23–25 Okt dari Laporan Harian Dit. Koordalops
  22102026. `ganti_operasi()` diisi ringkasan WA "Laporan Penanganan Karhutla di Enam Provinsi Prioritas" 23 Okt (data 22 Okt): armada 58 unit
  (22 patroli/CASA/OMC, 36 heli WB) dengan baris ke-9 Papua Selatan, OMC Kalteng 7 sortie dan Sumsel 9 sortie (13.600 kg dry ice + NaCl).
  Baris PEMILIK dibuang karena pembagian BNPB/TNI-nya perkiraan 21 Okt yang tidak bisa diperbarui. Personel 71.878 sama dengan laporan WA.
- Hotspot di laporan WA (Kalteng 13.132, Kalsel 978, dst.) adalah hitungan hari 23 Okt yang sedang berjalan; deck ini memakai hari penuh 22 Okt
  (12.682, 1.464), sama dengan luas terbakar dan belum padam di laporan WA itu.

Bangun ulang (dari folder kerja yang berisi `deck/src.pptx` = `../satelit-2026-10-21/sumber-asli-BNPB-211026.pptx` dan `deck/x/` hasil unzip):

    node peta.mjs
    python3 -I ganti.py . t1.pptx
    python3 -I tambah_peta.py t1.pptx peta-20okt.png angka_nasional.json
    python3 -I koordalops.py t1.pptx "Laporan Penanganan Pengendalian Karhutla 231026.pptx"
    python3 -I cek6.py "Laporan Penanganan Pengendalian Karhutla 231026.pptx"
