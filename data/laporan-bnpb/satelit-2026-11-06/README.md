# Laporan Penanganan Pengendalian Karhutla 061126

- Cut-off 6 Nov 2026, 18.00 WIB (pemilik 6 Nov 18.5x: "cut off 18.00"; versi pertama 17.00). Dibangun 18.30 dengan cara yang sama dengan 051126. Datanya salinan situs di `web/`: harian30 dan
  peta_karhutla terbit 17.42, titik terakhir di hotspot.json 16.04 WIB.
- **Versi hari utuh.** `belum_kini.json` untuk 6 Nov belum terbit (masih terbitan 5 Nov 23.45), jadi jalan.py jatuh ke versi deck 291026:
  luas terbakar, belum padam, dan padam yang berlabel 6 Nov adalah angka hari utuh 5 Nov. Begitu juga kolom 4 dan 5 Nov.
- Nasional 6 Nov: 844 hotspot, 370 firespot, luas terbakar 12.817 ha, belum padam 5.863 ha. Enam provinsi di tabel: Kaltim, Sultra,
  Kalteng, Sulteng, Sumsel, Sulsel. Papua Selatan keluar dari enam besar karena hotspotnya tinggal 15. Tally 72 sel cocok.
- Slide Operasi dari teks satgas 6 Nov (kegiatan 5 Nov) dan rekap gelar pesawat 6 Nov yang ditempel pemilik (`wa-satgas.txt`): 71.878 personel,
  armada 44 unit (18 patroli/OMC, 26 WB), OMC Kalteng 4 sortie/4.000 kg NaCl, hujan di 5 provinsi. Kalimat hujan Jambi 5 Nov didahulukan
  supaya terbaca (cara sama dengan 051126). Isi deck: peta, tabel, operasi (3 halaman). Lampiran kab/kota sempat dipasang (6 halaman), lalu dihapus pemilik 6 Nov ("lampirannya hapus aja");
  skripnya tetap di folder ini dan caranya dicatat di `../generator/README.md` bagian Lampiran kab/kota. Gerbang lolos (308 angka).
- Panel PENANGANAN slide Operasi kini tiga kolom sama lebar, angka 20 pt (pemilik 6 Nov: "size and spacingnya kurang proporsional"; `generator/penanganan/bnpb.py` tanpa_instansi).
- Lampiran: karena versinya hari utuh, sebaran luas dan belum padam per kab/kota diambil dari `peta_karhutla_kab.json` 5 Nov
  (d = [indeks hari, luas, belum]), lalu dibagi ulang ke total provinsi di slide 2. Jumlah keenam provinsi sama dengan slide 2.
- PM2,5 di pil tabel memakai CAMS 5 Nov, karena riwayat.json hanya memuat hari yang sudah selesai.

Bangun ulang: `PYTHONUTF8=1 C:/Python314/python jalan.py`, lalu `lampiran_hitung.py` dan `lampiran_slide.py` (keduanya dengan
`DECK_BNPB`), lalu `bingkai.py` (dengan PATH `.venv/Scripts` skill dan `SOFFICE`). Gerbang deck.py lolos (603 angka).

## rev1 dan rev2: satu kolom = satu hari (6 Nov 19.2x-19.5x)

Pemilik: versi hari utuh "mendampingkan data yang beda" (hotspot 6 Nov disandingkan dengan luas/belum padam 5 Nov; Kalteng 3.904 ha dibagi
122 hotspot tampak 32 ha/titik). Lalu: "bener2 pakai data terbaru sampai waktu cut off, jgn bandingin pake data usang".
- rev2 (`jalan.py`, blok SEGAR): FIRMS ditarik langsung 19.40 WIB ke `firms/` (disalin ke `../generator/cache/raw`). MODIS 6 Nov sampai
  17.38 WIB, website berhenti 16.04. VIIRS NOAA-20/21 lintasan siang 6 Nov belum diterbitkan NASA (0 baris), jadi VIIRS 6 Nov hanya
  lintasan malam. Hotspot, luas, belum padam, padam kolom 6 Nov = `satelit.hitung` (rumus website) atas data itu s.d. 18.00.
  Firespot 6 Nov tetap kluster.json website (terbit 17.42; data s.d. 16.04).
- Kolom 4 dan 5 Nov = berkas website hari itu sendiri (harian30, peta_karhutla).
- `uji_belum.py`: belum padam hitungan sendiri 5 Nov 23.45 vs belum_kini website: enam provinsi tabel selisih <= 5 ha; Papua Selatan
  1.912 vs 1.201, Maluku 83 vs 48, Maluku Utara 33 vs 27.
- Nasional 6 Nov s.d. 18.00: 849 hotspot, 370 firespot, luas 1.483 ha, belum padam 724 ha. Keluaran `... 061126 (rev2).pptx/.pdf`.
