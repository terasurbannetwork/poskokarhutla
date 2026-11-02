# Laporan Kejadian Bencana Harian 021126

- Sumber kejadian: WA Koordalops pagi 1 Nov 07.00 s.d. 2 Nov 07.00 WIB (28 laporan, 14 menonjol, 5 kejadian baru: banjir Aceh Barat,
  longsor Kab. Malang, puting beliung Majene, karhutla Sinjai dan Kota Parepare; `wa-koordalops.txt`; laphar PDF 01112026 di Desktop pemilik).
  BMKG PM2.5 2 Nov 06.00 WIB (`wa-bmkg.txt`). PVMBG status gunung api 2 Nov 06.00 WIB (`wa-pvmbg.txt`): 0 Awas, 3 Siaga, 24 Waspada, 42 Normal.
- Angka karhutla tally dengan tabel website tab Belum padam 1 Nov (kluster_hari/2026-11-01.json).
- **Format resmi baru (2 Nov 2026, pemilik):** baseline "Paparan Kepala BNPB 011126". Isi dari generator `harian.py` (`dk.SIAGA = True`,
  `dk.GA_GAYAS = ['lingkaran']`), dibingkai mesin ppt-konsultan lewat `lewat_deck.bingkai(susun=..., spek_tambah={'panel_sisi': 'gelap'})`:
  sampul (logo KRIS resmi dalam kotak putih di kiri kotak BerAKHLAK, kanan atas, juga di penutup; logo BNPB x1,3 (`kris.besar_logo_bnpb`), `kris.pasang_logo`, berkas `generator/sampul/media/kris-logo.png`), empat slide isi dengan penanda
  bagian di atas (01 Ringkasan Situasi, 02 Kejadian Baru, 03 Pengkinian Kejadian Sebelumnya, 04 Status Siaga Bencana; tanpa daftar isi
  dan pembatas, `halaman_tetap`), kaki "Sumber:" (GIS BNPB; PVMBG Badan Geologi), penutup Call Center 117.
  Gunung api: kartu per gunung dengan diagram zona bahaya lingkaran (cincin tiap 5 km, irisan sektor berarah, U), desa/kecamatan di dalam
  zona dari `generator/ga_wilayah.py` (perkiraan dari poligon desa, bukan peta KRB resmi; daftar desa lengkap di catatan pembicara).
- Dibuat di Windows:
  `$env:PYTHONUTF8=1; $env:DECK_BNPB="$HOME\.claude\skills\ppt-konsultan\bnpb"; C:\Python314\python data\laporan-bnpb\harian-2026-11-02\jalan.py`
  (mesin ppt-konsultan terpasang di `~/.claude/skills/ppt-konsultan`, venv `bnpb/.venv` Python 3.13; PDF lewat PowerPoint).
