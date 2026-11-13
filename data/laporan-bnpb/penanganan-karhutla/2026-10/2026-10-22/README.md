# Deck BNPB 22 Okt 2026 dari data satelit sendiri

Laporan Penanganan Pengendalian Karhutla 221026, cut-off 22 Okt 2026 07.00 WIB, kolom 19/20/21 Okt.
Metode, skrip, dan tata letak sama dengan `../satelit-2026-10-21/` (lihat README di sana). Yang berubah:

- Data FIRMS ditarik ulang 22 Okt 14.55 WIB (`firms-raw-15-22okt.tar.gz`): hari UTC 21 dan 22 baru, 15-20 sama dengan tarikan 21 Okt.
- Hari WIB 21 Okt kini lengkap. Deck 211026 v0 (cut-off 21 Okt 22.33 WIB) belum memuat lintasan malam 23-24 WIB,
  antara lain NOAA-21 jam 17 UTC (5.078 titik). Contoh: hotspot Papua Selatan 21 Okt naik dari 528 ke 1.039.
- `hitung3.py`, `hitung_nasional.py`: `CUT = 22 Okt 07.00 WIB`. `ganti.py`: `CUTOFF` baru dan tanda ± di subjudul slide tabel dibuang
  (selera pemilik).
- Bukti pipeline: dengan data dan cut-off lama, skrip yang sama menghasilkan deck 211026 v0 identik (0 berkas zip berbeda).
  `cek6.py`: 54 sel dan baris Jumlah slide tabel cocok.

Bagian bersumber BNPB diisi `koordalops.py` (dijalankan sesudah `tambah_peta.py`) dari Laporan Harian Dit. Koordalops BNPB
21102026 (PDF) dan ringkasan WA "Laporan Karhutla 22 Oktober 2026" (data 21 Okt):

- Slide tabel: pil PM2.5 = stasiun BMKG tertinggi per provinsi (daftar 10 tertinggi 22 Okt 06.00 WIB; di luar daftar = "< nilai ke-10"),
  pil cuaca = potensi cuaca sepekan BMKG 20-26 Okt.
- Slide operasi: judul 21 Okt; armada 56 unit (20 patroli/CASA/OMC, 36 heli WB) per provinsi dari ringkasan WA; OMC 4 provinsi, hujan
  di Kalbar dan Kalteng; semai dry ice 10 sortie 8.400 kg.
- Tidak berubah karena tidak ada data baru: rincian personel per unsur (TNI 13.396 dst.; total 71.878 sama dengan laporan).
- Baris PEMILIK (BNPB 44, TNI 10, Kemenhut 1, PT Sinarmas 1) adalah PERKIRAAN: registrasi sipil = sewa BNPB, nomor militer = TNI.
  PDF tidak punya bagian Kalsel, jadi 9 unit diasumsikan sipil; bila 2 di antaranya TNI menjadi 42/12. Perlu konfirmasi Koordalops.
- Ringkasan WA (56) tidak sepenuhnya cocok dengan PDF: Kalsel tanpa bagian, Kalteng 8 WB vs 7 di PDF, Sumsel 4 patroli vs 3 di PDF
  (roster Sumsel di PDF bertanggal 20 Okt). Angka slide mengikuti ringkasan WA.

Hari WIB 22 Okt sengaja tidak dipakai: pada 14.55 WIB baru sekitar 60% lintasan masuk (NOAA-21 siang, Aqua, dan lintasan malam belum ada).
