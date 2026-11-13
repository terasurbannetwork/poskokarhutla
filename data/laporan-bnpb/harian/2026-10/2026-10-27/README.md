# Laporan Kejadian Bencana Harian 271026

- Sumber kejadian: WA Koordalops pagi 26 Okt 07.00 s.d. 27 Okt 07.00 WIB (23 laporan, 19 menonjol; `wa-koordalops.txt`) dan PDF
  Koordalops 26102026. BMKG PM2.5 27 Okt 06.00 WIB. Versi pertama memakai laporan sela 19.00 (`wa-*-sela19.txt`, `wa-bmkg-18.txt`).
- Cut-off 07.00 WIB (pemilik 27 Okt). Data karhutla dari website tayang (terbit s.d. 26 Okt pukul 09.14 WIB; "klo bentrok ambil
  data website"). Hitungan sendiri atas FIRMS publik untuk 25 dan 26 Okt sudah dicocokkan dan identik dengan website (belum padam
  26 Okt: Papsel 1.162, Kalteng 1.140, Kalbar 391, Sultra 95, Kalsel 35, Sumsel 23 ha). FIRMS mentah juga cocok dengan SiPongi.
  - Semua angka karhutla tally dengan tabel website tab Belum padam, SEN 26 OKT ("harus tally data ini"):
    terbakar = Luas terbakar s.d. 26 Okt; firespot, sisa, dan status API = tabel 26 Okt (arsip kluster_hari/2026-10-26.json).
- Provinsi Prioritas di tabel itu wajib masuk: Papua Selatan, Kalimantan Timur, Sulawesi Selatan (dua terakhir ditambahkan).
  Sultra masuk karena Prioritas di kluster_awal tayang. Dalam penanganan bila belum padam > 0 atau Prioritas; Prioritas = perlu
  perhatian. Selesai: Riau, Jambi (belum padam 0), TN Way Kambas, Kuningan.
- Bangun ulang: `PLAYWRIGHT_MJS=... python3 jalan.py` (butuh cache/raw FIRMS 19 s.d. 27 Okt), lalu ekspor PDF lewat PowerPoint.
