# Laporan Kejadian Bencana Harian 091126

- `jalan_rev4.py` = salinan `harian-2026-11-08/jalan_rev4.py`, tanggal maju sehari (2 slide, tanpa karhutla, hanya kejadian baru 24 jam). Website diunduh segar (data s.d. 8 Nov).
- Sumber: WA Koordalops 8 Nov 07.00 s.d. 9 Nov 07.00 WIB (19 laporan, 17 menonjol), BMKG dan PVMBG 9 Nov 06.00 WIB, laphar PDF 8 Nov.
- Slide 1: 3 kejadian baru (banjir Gayo Lues, banjir Deli Serdang, cuaca ekstrem Jember); Mamasa karhutla ikut dibuang; 11 laporan sesudah 8 laporan karhutla dikurangi. Dampak Gayo Lues dari kerusakan laphar (±100 rumah RB) karena WA menulis Pendataan.
- Gunung api: 0 Awas, 3 Siaga, 24 Waspada, 42 Normal.
- Perbaikan generator: kepala WA "pukul", "Prov. NTT", baris BMKG tanpa titik tidak lagi menelan "b. Imbauan", tingkat Awas BMKG tampil.
- `dalops_banjir.py --unggah` gagal di Windows (`npx` tidak ditemukan subprocess, wrangler belum login): Pantau Banjir belum terbarui dari laporan ini.
- Jalankan: `PYTHONUTF8=1 DECK_BNPB="$HOME/.claude/skills/ppt-konsultan/bnpb" /c/Python314/python data/laporan-bnpb/harian/2026-11/2026-11-09/jalan_rev4.py`
