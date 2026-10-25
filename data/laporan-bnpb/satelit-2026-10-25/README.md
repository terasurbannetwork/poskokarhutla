# Laporan Penanganan Pengendalian Karhutla 251026 (data pagi ini, sementara)

Cut-off 25 Okt 2026, 06.40 WIB. Dibangun ulang 25 Okt 08.30 WIB dengan aturan yang sama dengan versi 24 Okt 15.00
(`../satelit-2026-10-24/sementara-24okt-1500/README.md`): firespot = titik, hotspot tersaring sumber panas industri seperti tab Real Time,
PM2.5 BMKG pada jam cut-off, peta Roboto. Sumber deck: `../satelit-2026-10-24/sementara-24okt-1500/sumber-241026-cutoff-0700.pptx`.

- Angka: FIRMS 7 hari publik ditarik 25 Okt 07.21 WIB (`firms-7hari-publik-25okt-0721.tar.gz`; VIIRS terakhir 03.49 WIB, MODIS 05.46 WIB;
  lintasan berikutnya sekitar 08.30 WIB, jadi lengkap untuk cut-off 06.40). Tarikan ulang 08.16 gagal (server FIRMS publik habis waktu).
  `hitung_nasional.py` (`CUT = 25 Okt 06.40`, `HARI = 22-25 Okt`) -> `angka_22-25.json`. Hotspot 25 Okt = tab Real Time 25 Okt pagi.
- Slide peta: hari 25 Okt sementara (pembanding 24 Okt). Slide tabel: kolom 23/24/25 Okt, baris = 6 teratas 24 Okt (`URUT_HARI=2`; data
  25 Okt s.d. 06.40 hanya lintasan malam). "Telah padam pada 25 Okt" di subjudul terlalu besar (lokasi yang belum terlihat lagi dianggap padam).
- Firespot titik (`firespot.py`, aturan scripts/data/harian.py; lihat README 24 Okt 15.00): 25 Okt dinilai pada 06.40, 24 Okt pada 24.00
  (pembanding). `firespot_24-25.json`. 25 Okt: 1.745 titik nasional (Kalteng 733, Sumsel 332, Kalbar 199, Papsel 3).
- Pil PM2.5 (`pil25.py`): stasiun BMKG pukul 06.00 (jam terakhir sebelum cut-off; 25 dari 27 stasiun; `pm25_25okt_0600.json`): Kalteng 673
  (Palangkaraya), Kalbar 188 dan Sumsel 174 sangat tidak sehat (Mempawah, Musi 2 Palembang), Kalsel 84 (Banjarbaru); Papsel dan Sultra di
  luar 10 besar = "< 76". Cuaca BMKG 23-25 Okt.
- Slide operasi tetap data 23 Okt: Laporan Harian Koordalops 24102026 hanya memuat karhutla Sumsel dengan kegiatan 23 Okt; tidak ada rekap
  nasional 24 Okt.

Bangun ulang (raw2 = `../satelit-2026-10-24/sementara-24okt-1500/normalkan.py` atas tar di atas):
    python3 -I hitung_nasional.py && cp angka_nasional.json angka_22-25.json   # firespot_24-25.json lewat firespot.py (muat, hitung)
    FIRESPOT=firespot_24-25.json node peta.mjs
    URUT_HARI=2 FIRESPOT=firespot_24-25.json python3 -I perbarui.py ../satelit-2026-10-24/sementara-24okt-1500/sumber-241026-cutoff-0700.pptx angka_22-25.json t1.pptx "25 Okt 2026, 06.40 WIB" "Angka 25 Okt sementara, data s.d. 06.40 WIB." peta-25okt.png
    python3 -I pil25.py t1.pptx t2.pptx
    python3 -I firespot_tabel.py t2.pptx firespot_24-25.json "Laporan Penanganan Pengendalian Karhutla 251026.pptx"
