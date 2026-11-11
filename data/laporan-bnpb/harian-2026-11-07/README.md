# Laporan Kejadian Bencana Harian 071126

- `jalan_rev4.py` = salinan `harian-2026-11-06/jalan_rev4.py`, tanggal maju sehari (2 slide, tanpa karhutla, panel Informasi bencana,
  logo KRIS + BNPB). Website diunduh segar ke `kerja-071126-rev4/web`, data website s.d. 6 Nov.
- Sumber: WA Koordalops 6 Nov 07.00 s.d. 7 Nov 07.00 WIB (25 laporan, 16 menonjol), BMKG dan PVMBG 7 Nov 06.00 WIB.
  Tanpa karhutla: 16 laporan, 7 kejadian menonjol di 5 provinsi (1 gempa bumi NTT, 4 banjir, 1 angin kencang Lampung Selatan,
  1 tanah longsor Simalungun). Gunung api: 0 Awas, 3 Siaga, 23 Waspada, 43 Normal.
- Perbaikan generator hari ini:
  - `wa_harian.py`: "Kebakaran Lahan di Kab. Magelang" kini karhutla (dulu jatuh ke "lainnya" = Kebakaran TPA).
  - `harian.py tindak.muat`: nama + angka + "dan N lainnya" tidak muat -> nama tanpa angka, bukan elipsis (gerbang D-17 sempat gagal:
    "Deli Serdang ±1.701 KK…").
  - Tanpa karhutla dan kekeringan: kolom ketiga Yang akan dilakukan BNPB tidak lagi dobel "Kejadian baru", tapi Pemulihan dari kejadian
    lama (Gempa bumi NTT); kartu "0 kekeringan" dibuang; judul dipecah per jenis ("1 gempa bumi, 4 banjir, 1 angin kencang, dan 1 tanah
    longsor"), bukan "7 bencana lainnya".
- Jalankan: `PYTHONUTF8=1 DECK_BNPB="$HOME/.claude/skills/ppt-konsultan/bnpb" /c/Python314/python data/laporan-bnpb/harian-2026-11-07/jalan_rev4.py`
- Revisi 09.00 (atasan, Bang Ghozi: "Tambahkan dong. Bromo waspada", "Yg 24 jam terakhir", "Slide 2 aman kok", "Slide 1 aja, di kinikan
  datanya"): erupsi Gn. Bromo Kamis 5 Nov 17.11 WIB (kolom abu ± 500 m, status Waspada, radius 1 km dari kawah aktif; PVMBG lewat pos
  pengamatan, dikutip media 6 Nov) ditambahkan di `jalan_rev4.py` sebagai kejadian slide 1 (jenis baru `erupsi` di `harian.py JENIS_LAIN`, label "Erupsi Gn. Bromo" atas permintaan pemilik, kolom BENCANA melebar,
  Kab. Probolinggo, dampak "–"). Jadi 17 laporan, 8 kejadian menonjol di 6 provinsi. Slide 2 tidak berubah.
- Revisi 09.20 (pemilik: "coba yg ntt gempa hapus, itu slide 1 tuh yg bener2 terkini dalam 24 jam aja"): kejadian Pengkinian Data / Update
  (gempa NTT, banjir Aceh Selatan) dibuang; 6 kejadian menonjol di 4 provinsi (3 banjir, 1 angin kencang, 1 tanah longsor, 1 erupsi
  Gn. Bromo); laporan tetap 17. Kolom ketiga Yang akan dilakukan BNPB = Gunung api (memantau Gn. Bromo, radius aman kawah).
- 09.30: slide 2 sempat jadi penutup "Terima kasih" (halaman generator bergeser tanpa slide Pengkinian); `jalan_rev4.py` kini mencari halaman ringkasan dan status siaga dari judulnya.
- 10.20 (pemilik: "yang banjir cek masih ada apa udah surut", "pake label pill ya, termasuk yg kk dll nya"): tabel Informasi bencana
  (`harian.py info_bencana`, `dk.INFO_PIL`) memakai pil DAMPAK (KK) dan kolom baru KONDISI dari Kondisi Mutakhir laphar 6 Nov: Deli Serdang
  berangsur surut (genangan 5-50 cm), Serdang Bedagai ditangani BPBD (tanpa info surut), Padang Pariaman sudah surut, Lampung Selatan aman,
  Simalungun pembersihan material, Bromo Waspada radius 1 km. Panel melebar ke kiri, peta mengecil.
