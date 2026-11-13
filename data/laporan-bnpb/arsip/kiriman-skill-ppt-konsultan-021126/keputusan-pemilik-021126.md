## Keputusan pemilik 2 Nov 2026 (laporan harian format baru, sampul dan penutup)

1. **Logo KRIS** (Kolaborasi, Responsif, Integratif, Sinkronisasi; logo resmi kiriman atasan) di **sampul dan penutup**, dalam kotak putih
   bersudut membulat tepat di kiri kotak BerAKHLAK, tinggi dan gaya kotak sama. Mesin: `deck.py` `pasang_kris()`; berkas
   `assets/logo-bersama/kris.png` (atau `foto/kris.png` di akar proyek). Pengecualian beralasan: `"tanpa_kris": "<alasan>"`.
   Ditolak: baris ikon KRIS buatan sendiri; KRIS di bawah pil tanggal ("padet banget").
2. **Logo BNPB** sampul dan penutup 1,3x ukuran tema ("agak gedein"): `skala_logo_bnpb()`, spek boleh `"skala_logo_bnpb"`.
3. **Baseline deck = "Paparan Kepala BNPB 011126"** (`proyek-kepala/spek/paparan-kepala.json`): daftar isi dan pembatas berpanel foto gelap
   (`"panel_sisi": "gelap"`; foto panel = foto sampul deck), penanda bagian, kaki Sumber berbilah biru muda.
4. **Laporan Kejadian Bencana Harian** (generator repo poskokarhutla + `lewat_deck.bingkai`): empat bagian (Ringkasan Situasi, Kejadian Baru,
   Pengkinian Kejadian Sebelumnya, Status Siaga Bencana) dengan penanda bagian, **tanpa daftar isi dan pembatas** (`halaman_tetap`),
   tanpa pil "kepada" (`tanpa_kepada`), sumber karhutla ditulis "GIS BNPB". Arah mata angin ditulis lengkap, tidak disingkat.
