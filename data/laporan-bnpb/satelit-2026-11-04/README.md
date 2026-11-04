# Laporan Penanganan Pengendalian Karhutla 041126

- Cut-off 4 Nov 2026, 18.00 WIB (pemilik 4 Nov). Cara sama dengan 031126. Isi diambil dari salinan website di `web/`: harian30 terbit 17.47,
  peta_karhutla dan belum_kini 17.48, titik terakhir di hotspot.json 14.50 WIB. Uji rumus luas 3 Nov: hitungan sendiri 7.659 ha, website 7.651 ha.
- Nasional 4 Nov: 4.469 hotspot, 1.859 firespot, luas terbakar 9.040 ha, belum padam 3.422 ha. Tabel memuat enam provinsi:
  Kalteng, Papsel, Kaltim, NTT, Sultra, Sulteng. Tally 72 sel cocok.
- Slide operasi diambil dari teks satgas yang ditempel pemilik (`wa-satgas.txt`, laporan 4 Nov, kegiatan 3 Nov) dan rekap gelar
  pesawat "Data: 4 November 2026", yang disambung di akhir berkas. Personel 71.878. Armada 46 unit (18 patroli/OMC dan 28 WB) dengan
  baris PEMILIK BNPB 32, TNI 10, Kemenhut 1, Pemda 1, PT Sinarmas 1, PT LNG 1. Semai OMC: Kalteng 5 sortie/5.000 kg,
  Sumsel 3 sortie/2.400 kg, Kalsel 2 sortie/1.188 kg (800 kg NaCl dan 388 kg dry ice), jadi lencana menunjukkan 10 sortie/8.588 kg.
- Isi `satgas.py` mengikuti angka 4 Nov: target 645,86 ha/157 FS, padam 164,43 ha/75 FS (darat 121,93, termasuk ±50 ha TNTP yang
  padam karena hujan, dan udara 42,50), sisa 481,43 ha/82 FS. Riau dihitung 0 FS padam supaya cocok dengan rekap 75 FS.
- Generator yang diubah hari ini:
  - `wa_operasi.py` kini membaca butir "•" pada rekap gelar dan menghitung "Water Bombing (WB)" sebagai WB.
  - Teks "pada 15 FS" tidak lagi dibaca sebagai tanggal.
  - "Hujan *lebat* terjadi di" dikenali.
  - "Banyuasin" tetap tercatat walau sudah ada "Musi Banyuasin".
  - Data hari-hari lama tidak berubah.
  - `penanganan/bnpb.py`: pemilik swasta baru (PT LNG) memakai pil PT Sinarmas. Bila enam pil tidak muat, bantalan tulisan dikecilkan.

Bangun ulang: `PYTHONUTF8=1 C:/Python314/python jalan.py`, lalu
`PYTHONUTF8=1 DECK_BNPB=C:/Users/USER/.claude/skills/ppt-konsultan/bnpb C:/Python314/python bingkai.py`. Gerbang deck.py lolos (315 angka).
