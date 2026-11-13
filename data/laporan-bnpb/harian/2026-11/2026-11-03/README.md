# Laporan Kejadian Bencana Harian 031126

- Sumber kejadian: WA Koordalops pagi 2 Nov 07.00 s.d. 3 Nov 07.00 WIB (26 laporan, 18 menonjol; `wa-koordalops.txt`).
  Kejadian baru (6): cuaca ekstrem Kab. Dairi (1 MD, 1 luka), banjir dan longsor Kab. Lumajang (±1.417 KK), longsor Kab. Lumajang (2 MD),
  longsor Kab. Badung (2 hilang), karhutla Kab. Parigi Moutong (±110 ha, masih terbakar), karhutla Kab. Kolaka Timur (±8,5 ha, padam 3 Nov 04.30 WITA).
- Laphar PDF 02112026 (106 hlm., 23 entri bagian A) di tangan pemilik. Entri laphar yang tidak masuk rekap WA (tidak menonjol):
  TPA Degayu Kota Pekalongan, karhutla Kab. Klaten, banjir Kab. Malang, banjir Kab. Deli Serdang; Parigi Moutong tercatat dua kali (entri 10 dan 20).
- BMKG PM2.5 3 Nov 06.00 WIB (`wa-bmkg.txt`): tertinggi Pangkalan Bun 252,8 (Berbahaya). Siaga hujan lebat dan angin kencang: Sumatera Barat.
- PVMBG 3 Nov 06.00 WIB (`wa-pvmbg.txt`): 0 Awas, 3 Siaga (Anak Krakatau, Merapi, Semeru), 23 Waspada, 43 Normal.
- Pengurai WA dibetulkan untuk bahan hari ini (`generator/wa_harian.py`, uji `python3 wa_harian.py`): salah ketik "Tanah Logsor",
  judul tanpa "di" (Simalungun), "±8.5 ha" (Kolaka Timur, sempat terbaca 85 ha), "jiwa MD" pada cuaca ekstrem (Dairi), "org hilang" (Badung).
- Format sama dengan 021126 (`jalan.py` = salinan 021126, tanggal maju sehari). Belum dijalankan: sesi cloud tidak bisa menjangkau
  centurisk97.id dan FIRMS, dan mesin ppt-konsultan tidak terpasang. Jalankan di Windows:
  `$env:PYTHONUTF8=1; $env:DECK_BNPB="$HOME\.claude\skills\ppt-konsultan\bnpb"; C:\Python314\python data\laporan-bnpb\harian\2026-11\2026-11-03\jalan.py`
