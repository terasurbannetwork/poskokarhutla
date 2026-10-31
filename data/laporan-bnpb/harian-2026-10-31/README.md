# Laporan Kejadian Bencana Harian 311026

- Sumber kejadian: WA Koordalops pagi 30 Okt 07.00 s.d. 31 Okt 07.00 WIB (28 laporan, 18 menonjol, 3 kejadian baru; `wa-koordalops.txt`).
  BMKG PM2.5 31 Okt 07.00 WIB (`wa-bmkg.txt`; nilai Pekanbaru 35566.7 di WA janggal, tidak tampil di deck).
  PVMBG status gunung api 31 Okt 07.00 WIB (`wa-pvmbg.txt`): 0 Awas, 3 Siaga, 24 Waspada, 42 Normal.
- Aturan dan susunan sama dengan 301026 (5 slide). Angka karhutla tally dengan tabel website tab Belum padam 30 Okt
  (kluster_hari/2026-10-30.json).
- Masuk dari website (tidak di WA): Papua Selatan, Sulteng, Sultra, NTB, NTT, Gorontalo, Papua Barat. Kartu laporan = 28 WA + 7 = 35;
  kejadian menonjol 18 + 7 = 25. Sinjai (Sulsel) dan Kota Tual (Maluku) dilapor WA per kabupaten; di slide 4 jadi baris provinsi,
  di slide 3 tetap angka kabupaten.
- Jambi: firespot website 30 Okt kosong (sisa 2 ha), baris memakai data 27 Okt (19 firespot, sisa 0 ha). Pemilik: sisa 0 ha = selesai
  (aturan di jalan.py: sisa 0 ha tanpa luas terbakar baru = selesai).
- Slide 4 (pengkinian) memuat "Laporan pertama <tanggal>" per kejadian: episode berjalan di public/data/laphar_riwayat.json
  (s.d. 28 Okt) + arsip WA harian-*/wa-koordalops.txt; provinsi yang hanya dari website ditulis "Dari data satelit".
- Slide 3 karhutla padam: label "Api sudah padam" di kanan hektaran. Judul tanpa jenis bernilai 0 ("0 kekeringan" dihapus).
- Versi alternatif satu slide rincian (jalan_gabung.py) dibuang pemilik; tidak dipakai lagi.
- Dibuat di Windows: `$env:PYTHONUTF8=1; C:\Python314\python data\laporan-bnpb\harian-2026-10-31\jalan.py`; PDF otomatis lewat PowerPoint.
