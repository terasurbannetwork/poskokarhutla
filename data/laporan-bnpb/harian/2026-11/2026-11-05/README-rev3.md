# Laporan Kejadian Bencana Harian 051126 versi 3 (dibuat 6 Nov 2026)

- Pemilik 6 Nov: "datanya pokoknya dari sini" = teks Dit. Koordalops kepada Menko PMK, periode 4 Nov 07.00 s.d. 5 Nov 07.00 WIB
  (`wa-menko.txt`, 23 laporan, 20 menonjol). Pemilik memilih periode 4-5 Nov (bukan 5-6 Nov).
- `jalan_rev3.py` = salinan `harian-2026-11-06/jalan.py` dengan tanggal mundur sehari dan `REV3 = True`; website sama dengan laporan
  051126 asli (salinan `kerja-051126/web` di `kerja-051126-rev3/web`, data.json asli tidak ditimpa); BMKG dan PVMBG 5 Nov.
- Isi: 2 slide, tanpa sampul, penutup, lampiran, Kejadian Baru, Pengkinian; logo KRIS dan BNPB di tiap slide.
  - Slide 1 ringkasan: 23 kejadian menonjol di 16 provinsi. Kartu Kejadian bencana dipecah per jenis (gempa bumi, banjir, tanah longsor)
    dengan ikon dan warna jenisnya. Perlu perhatian dihapus. Panel INFORMASI BENCANA: bencana, provinsi, kab/kota (karhutla tingkat
    provinsi = kabupaten bersisa api di website, sisa terbesar dulu, "+N" sisanya), dampak KK ditambah MD.
  - Slide 2: status siaga gunung api PVMBG 5 Nov apa adanya.
- Alternatif kab/kota (6 Nov siang; Bang Ghozi: "tulis aja kab kota ke bawah dicoba"; Alfatehan: "perlu lampiran"; pemilik: "coba 2-2nya,
  kasih beberapa alternatif slide"). Satu kali jalan membangun keempatnya dari halaman isi yang sama (`Deck.ALT_RINCI`):
  - `(rev3 alt1)`: 3 slide. Ringkasan, Rincian lokasi (kab/kota karhutla menurun lengkap, 60 kab/kota dengan sisa api per kab/kota,
    dibagi rata tiga kolom; kekeringan dan bencana lainnya di kolom keempat), Status siaga.
  - `(rev3 alt2)`: isi sama, rincian jadi lampiran sesudah Status siaga ("Lampiran: Rincian Lokasi Kejadian Bencana", tanpa penanda bagian).
  - `(rev3 alt3)`: 2 slide. Kab/kota menurun langsung di slide 1: peta diperkecil, panel Informasi bencana melebar jadi dua tabel
    (karhutla: kab/kota sisa terbesar + "dan N lainnya" dengan sisa gabungan; bencana lainnya dengan KK dan MD bertumpuk).
    Dua nama per provinsi tidak muat (baris 6 pt), jadi satu nama.
- Alternatif 4 dan 5 (6 Nov sore; Bang Ghozi: "jangan +10", "gapapa kebawah juga tulisannya"; pemilik: "bener2 sesuain aja layoutnya,
  petanya bisa diperkecil"): semua 60 kab/kota karhutla ditulis menurun di slide ringkasan (`Deck.s2_alt`), tanpa "+N".
  Kartu angka jadi satu baris tipis; baris provinsi bertint dengan total sisa, kab/kota menjorok di bawahnya dengan sisa (ha);
  provinsi yang terpotong kolom diulang "(lanjutan)". Peta diperkecil; label provinsi yang menabrak dilewati (lingkaran tetap).
  - `(rev3 alt4)`: kiri peta + tabel bencana lainnya; kanan karhutla 4 kolom; strip "Yang akan dilakukan BNPB" tetap di bawah.
  - `(rev3 alt5)`: kiri peta + "Yang akan dilakukan BNPB" bertumpuk; kanan karhutla 3 kolom + panel bencana lainnya setinggi slide.
  - "Penukal Abab Lematang Ilir" ditulis PALI (tidak muat di kolom).
  - `HANYA="(rev3 alt4),(rev3 alt5)"` membangun sebagian varian; PDF yang sedang dibuka disimpan berakhiran jam.
- Versi 4 (6 Nov sore, pemilik: "ternyata sekarang di slide itu gausah bahas karhutla lagi"): `jalan_rev4.py` (turunan jalan_rev3,
  folder kerja `kerja-051126-rev4`) membuang semua kejadian karhutla. 15 laporan (26 dikurangi 8 karhutla WA dan 3 tambahan website),
  12 kejadian menonjol di 5 provinsi (6 kekeringan, 6 bencana lainnya). Kolom "Pemadaman prioritas" diganti "Kejadian baru"
  (Gayo Lues 1 MD); PM2.5 disebut "kualitas udara", bukan asap karhutla. Peta tanpa garis merah perlu perhatian (juga di jalan_rev3
  untuk bangun berikutnya).
- Jalankan: `$env:PYTHONUTF8=1; $env:DECK_BNPB="$HOME\.claude\skills\ppt-konsultan\bnpb"; C:\Python314\python data\laporan-bnpb\harian\2026-11\2026-11-05\jalan_rev3.py`
