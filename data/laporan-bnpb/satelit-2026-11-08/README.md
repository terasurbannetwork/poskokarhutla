# Laporan Penanganan Pengendalian Karhutla 081126

- Cut-off 8 Nov 2026, 18.00 WIB, cara sama dengan 061126 (rev2). Dibangun 18.08 WIB.
- Kolom 8 Nov (hotspot, luas, belum padam, padam) = `satelit.hitung` atas FIRMS yang ditarik 18.06 WIB. Lintasan terakhir: VIIRS NOAA-21 14.35 WIB, MODIS 15.41 WIB.
- Kolom 6 dan 7 Nov = berkas situs hari itu sendiri (`web/`, harian30 dan peta_karhutla terbit 13.56 WIB).
- **Rev3 (9 Nov), folder `Revisi 3/`** = rev2 + 2 halaman perusahaan (`perusahaan.py`, kartu Perusahaan dan Modal asing tab Insight; `web/aktor_karhutla.json` terbitan 9 Nov 07.20 WIB, jendela hotspot terkini 2 s.d. 9 Nov melewati cut-off slide 1 sampai 3). Bendera dari `bendera.mjs`. Angka 3 slide pertama tidak berubah. Kalimat layar "dengan titik panas terbanyak" tidak dipakai: 8 perusahaan itu peringkat 4 sampai 45 dari 99.
- **Pakai rev2** bila tanpa halaman perusahaan (rev1 + logo KRIS di tiap slide, pemilik 8 Nov). Firespot 8 Nov = `kluster.json` situs terbit 18.26 WIB sesudah titik.yml dipicu manual (data s.d. 15.41 WIB). Versi pertama `(firespot 13.56)` memakai terbitan 13.56 WIB (data s.d. 11.14 WIB) dan firespotnya 587, jangan dipakai. PDF tanpa akhiran rev juga versi pertama (terkunci penampil saat bangun ulang).
- Nasional 8 Nov: 2.529 hotspot, 976 firespot, luas 5.335 ha, belum padam 1.925 ha. Enam provinsi tabel: Kalteng, Papua Selatan, Sultra, Kaltim, Sumsel, Sulsel. Tally 72 sel cocok.
- Slide Operasi dari teks satgas 8 Nov (kegiatan 7 Nov) yang ditempel pemilik (`wa-satgas.txt`, rincian peralatan tidak disalin): 71.878 personel, armada 43 unit (18 patroli/OMC, 25 WB), OMC Kalteng 4 sortie/3.600 kg NaCl, hujan di 4 provinsi. Tidak ada rekap gelar pesawat, jadi baris PEMILIK tidak tampil.
- Gerbang deck.py lolos (300 angka).

Bangun ulang: `PYTHONUTF8=1 C:/Python314/python jalan.py` (hapus `web/` atau `BARU=1` untuk data situs baru), lalu `bingkai.py` dengan `DECK_BNPB`, PATH `.venv/Scripts` skill, dan `SOFFICE`. Hapus dulu berkas `(generator).pptx` supaya bingkai memakai hasil jalan.py yang baru.
