# Laporan Kejadian Bencana Harian 281026

- Sumber kejadian: WA Koordalops pagi 27 Okt 07.00 s.d. 28 Okt 07.00 WIB (26 laporan, 20 menonjol; `wa-koordalops.txt`).
  BMKG PM2.5 28 Okt 06.00 WIB (`wa-bmkg.txt`). PDF Koordalops 27102026 di Downloads pemilik.
- Cut-off 07.00 WIB. Angka karhutla tally dengan tabel website tab Belum padam, SEL 27 OKT (terbit 28 Okt 08.07 WIB):
  terbakar = Luas terbakar s.d. 27 Okt; firespot, sisa, dan status API = tabel 27 Okt (kluster_hari/2026-10-27.json).
- Provinsi Prioritas di tabel itu wajib masuk (Papua Selatan, Sumsel, Sultra). Provinsi dengan belum padam >= 50 ha juga
  masuk walau tidak di WA (Kaltim 461, Sulsel 95, Sulteng 64, Kalsel 62 ha). Selesai: Riau, Jambi (belum padam 0; WA Jambi
  sisa 58 ha, website menang), Bangka Selatan, Lampung Selatan, Kuningan, Toraja Utara.
- FIRMS: cache/raw diisi dari FIRMS publik 7 hari (SouthEast_Asia_7d), dipecah per hari UTC.
- Bangun ulang: `PLAYWRIGHT_MJS=... python3 jalan.py`, lalu ekspor PDF lewat PowerPoint.
