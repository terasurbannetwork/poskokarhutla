# Laporan Kejadian Bencana Harian 041126

- `jalan.py` = salinan 031126, tanggal maju sehari. Website sudah terbit s.d. 3 Nov, jadi angka karhutla berlabel 3 Nov (tidak mundur).
- Sumber kejadian: WA Koordalops 3 Nov 07.00 s.d. 4 Nov 07.00 WIB (31 laporan, 24 menonjol; `wa-koordalops.txt`).
  Kejadian baru (6): karhutla Kab. Luwu, Konawe Kepulauan, Pulau Taliabu, Jayawijaya (semua padam); cuaca ekstrem Kab. Brebes (±33 KK)
  dan Kab. Sumenep (±11 KK). Ditambah 3 provinsi dari tabel website (NTT, Kalsel, Maluku): 34 laporan, 27 kejadian menonjol, 10 perlu perhatian.
- BMKG PM2.5 4 Nov 06.00 WIB: tertinggi Palangka Raya 781,9 (Berbahaya). PVMBG 4 Nov 06.00 WIB: 0 Awas, 3 Siaga, 23 Waspada, 43 Normal.
- Generator dibetulkan:
  - `wa_harian.py`: "sejumlah kejadian 31" (kata "kejadian" sebelum angka); "air perlahan surut ... rumah warga tergenang" = belum tertangani
    (Aceh Selatan, sebelumnya terbaca selesai).
  - `harian.py` slide kejadian baru: baris kabupaten yang digabung ke baris provinsi kini ikut putusan jalan.py "satelit tidak melihat api
    hari laporan = selesai" (tanda `sat.padam_sat`). Sebelumnya Pulau Taliabu tertulis "Satelit masih mendeteksi api" dengan firespot 0.
- Revisi pemilik 4 Nov pagi (generator `harian.py`, berlaku untuk hari berikutnya):
  - Pil kalender laporan pertama + legenda kini juga di panel Kekeringan, Bencana lainnya versi ringkas, dan kartu gunung api
    (Anak Krakatau 2 Jul; Merapi dan Semeru "sebelum 2026" karena sudah ada sejak laphar pertama di arsip). Gerbang di `bangun()`:
    build berhenti bila ada kejadian/gunung bertanggal yang pilnya tidak tampil.
  - Strip "Yang akan dilakukan BNPB": tetap kalimat tindakan gaya lama (pemilik menolak versi "perubahan saja" karena bukan tindakan BNPB),
    datanya diperkaya: perkuat pemadaman dua sisa terbesar, tambah pemadaman di provinsi yang sisanya naik sejak kemarin, masker/ISPA dengan
    nilai PM2.5, layani pengungsi (butir Pengungsi WA kini diurai, `teks.pengungsi`), distribusi air dan kabupaten prioritas.
  - Slide kejadian baru: kabupaten karhutla yang padam di provinsi yang masih ada sisa TIDAK ditulis (pemilik: "hapus aja"); kejadiannya
    terwakili baris provinsi di slide pengkinian (Luwu, Konawe Kepulauan, Pulau Taliabu). Slide 3 jadi 3 kejadian baru.
- Jalankan: `$env:PYTHONUTF8=1; $env:DECK_BNPB="$HOME\.claude\skills\ppt-konsultan\bnpb"; C:\Python314\python data\laporan-bnpb\harian-2026-11-04\jalan.py`
