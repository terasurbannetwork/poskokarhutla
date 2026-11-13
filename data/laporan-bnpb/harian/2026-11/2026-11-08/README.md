# Laporan Kejadian Bencana Harian 081126

- `jalan_rev4.py` = salinan `harian-2026-11-07/jalan_rev4.py`, tanggal maju sehari (2 slide, tanpa karhutla, hanya kejadian baru 24 jam).
  Website diunduh segar ke `kerja-081126-rev4/web` (data website s.d. 7 Nov).
- Sumber: WA Koordalops 7 Nov 07.00 s.d. 8 Nov 07.00 WIB (24 laporan, 20 menonjol), BMKG dan PVMBG 8 Nov 06.00 WIB.
  Slide 1: 4 cuaca ekstrem baru di 3 provinsi (Serdang Bedagai, Ciamis, Bogor, Kendal); 13 laporan sesudah laporan karhutla dikurangi.
  Gunung api: 0 Awas, 3 Siaga, 24 Waspada, 42 Normal.
- Erupsi Gn. Bromo (5 Nov) yang ditambahkan 7 Nov tidak ikut lagi: di luar 24 jam dan tidak ada di WA Koordalops/PVMBG 8 Nov.
- Perbaikan generator: tanpa kejadian lama, kolom ketiga Yang akan dilakukan BNPB dulu jatuh ke "Pemulihan: Cuaca ekstrem Sumatera Utara"
  (kejadian baru disebut pemulihan). Kini jadi "Peringatan dini BMKG" (Siaga hujan lebat + angin kencang); `wa_harian.bmkg` mengurai
  daftar Siaga hujan lebat (`siaga`).
- Jalankan: `PYTHONUTF8=1 DECK_BNPB="$HOME/.claude/skills/ppt-konsultan/bnpb" /c/Python314/python data/laporan-bnpb/harian/2026-11/2026-11-08/jalan_rev4.py`
