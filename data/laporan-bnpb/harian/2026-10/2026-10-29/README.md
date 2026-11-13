# Laporan Kejadian Bencana Harian 291026

- Sumber kejadian: WA Koordalops pagi 28 Okt 07.00 s.d. 29 Okt 07.00 WIB (26 laporan, 17 menonjol; `wa-koordalops.txt`).
  BMKG PM2.5 29 Okt 06.00 WIB (`wa-bmkg.txt`). PDF Koordalops 28102026 di Downloads pemilik.
- Cut-off 07.00 WIB. Angka karhutla tally dengan tabel website tab Belum padam, RAB 28 OKT (kluster_hari/2026-10-28.json):
  terbakar s.d. 28 Okt; firespot, sisa, status API = tabel 28 Okt. Arsip website 28 Okt ditulis 20.41 WIB dengan data
  macet di 06.05 WIB (jalan titik.yml gagal 05.13-14.38 WIB), jadi firespot Papsel dan Maluku kosong. Pemilik: "kalau ada data kosong
  ambil data/hari terakhir, satu baris searah, label tetap hari ini" -> baris Papsel dan Maluku memakai data 27 Okt seluruhnya
  (Papsel 292 firespot, sisa 647 ha; Maluku 44 firespot, 62 ha), label kolom tetap 28 Okt.
- Masuk dari website (tidak di WA): Sulteng 85, Maluku 68 ha (>= 50 ha); Sultra, Sulsel (Prioritas). Papua Selatan: WA melapor Merauke,
  ditulis sebagai baris provinsi dengan angka provinsi website (1.618 ha), satu kejadian, tidak dobel.
- Perlu perhatian = Prioritas atau sisa >= 100 ha. Kartu laporan = 26 WA + 4 tambahan = 30.
- WA masih lapor sisa, website belum padam 0 ha: tetap ditangani hanya bila website mencatat luas terbakar baru hari itu > 0
  (pil "42 ha baru 28 Okt", bukan "sisa ± 0 ha"): Kalteng. Firespot tanpa luas = selesai: Kalsel (2 firespot), Kalbar (13).
  Selesai juga: Riau, TN Way Kambas. Deck 281026 menandai Jambi selesai (WA 58 ha, 19 firespot).
- Slide status banjir (fitur generator bila data banjir ada) tidak dipakai: format biasa 4 slide.
- Bangun ulang: `PLAYWRIGHT_MJS=... python3 jalan.py`; ekspor PDF lewat PowerPoint (`open -a` dulu, lalu save as PDF).
