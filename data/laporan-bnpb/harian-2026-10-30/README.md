# Laporan Kejadian Bencana Harian 301026

- Sumber kejadian: WA Koordalops pagi 29 Okt 07.00 s.d. 30 Okt 07.00 WIB (32 laporan, 28 menonjol, 8 kejadian baru; `wa-koordalops.txt`).
  BMKG PM2.5 30 Okt 06.00 WIB (`wa-bmkg.txt`). PVMBG status gunung api 30 Okt 06.00 WIB (`wa-pvmbg.txt`): 0 Awas, 3 Siaga, 24 Waspada, 42 Normal.
- Cut-off 07.00 WIB, angka karhutla tally dengan tabel website tab Belum padam 29 Okt (kluster_hari/2026-10-29.json), aturan sama dengan 291026.
  Masuk dari website (tidak di WA): Sultra, Maluku, Sulsel, NTT, Kaltim, Malut, Papua Barat. Kartu laporan = 32 WA + 7 tambahan = 39.
- Susunan baru (pemilik dan atasannya, 30 Okt), 5 slide:
  1. sampul; 2. ringkasan;
  3. **Kejadian baru**: tabel Karhutla format biasa (masih terbakar di atas, padam di bawah), box Bencana lainnya format biasa,
     keduanya dengan keterangan BPBD singkat; panel Gunung api untuk publik (status, radius, sektor, ancaman, kawasan dihindari, imbauan).
     Teks lengkap PVMBG ada di catatan pembicara slide 3;
  4. **Pengkinian kejadian sebelumnya** (16 karhutla, 4 kekeringan, 8 bencana lainnya); 5. penutup. Tanpa lampiran.
- Keterangan karhutla yang bentrok dengan satelit ikut data website: Morowali Utara (BPBD "api sudah padam" untuk kejadian ±2 ha,
  satelit 41 firespot dan sisa ±46 ha di kabupaten) ditulis "Satelit masih mendeteksi api".
- Kota Sorong memakai angka kota (±183 ha), bukan Kab. Sorong: pengurai WA kini mempertahankan awalan "Kota".
- Dibuat di Windows: `$env:PYTHONUTF8=1; C:\Python314\python data\laporan-bnpb\harian-2026-10-30\jalan.py`; PDF otomatis lewat PowerPoint
  (`generator/pdf.py`), font tertanam Roboto-Bold dan Roboto-Regular.
