# Laporan Penanganan Pengendalian Karhutla 031126

- Cut-off 3 Nov 2026, 18.00 WIB (pemilik 3 Nov). Isi = salinan website di `web/` (harian30 17.40, peta_karhutla dan belum_kini 17.41;
  titik terakhir hotspot.json 15.49 WIB). Versi "per sekarang": luas 6.413 ha dan padam hitungan sendiri dari hotspot.json
  (uji 2 Nov: 6.929 vs website 6.925 ha, tidak ada provinsi beda > 5 ha); belum padam 2.150 ha dari belum_kini.json.
- Nasional 3 Nov: 3.066 hotspot, 1.145 firespot. Enam baris tabel: Kalteng, Sumsel, Papsel, NTT, Jambi, Kaltim. Tally 72 sel cocok.
- Slide operasi dari teks satgas yang ditempel pemilik (`wa-satgas.txt`, laporan 3 Nov, kegiatan 2 Nov): personel 71.878; armada 51
  (21 patroli/OMC + 30 WB); OMC Kalteng 6 sortie (9.800 kg NaCl + 800 kg dry ice), Kalsel 2 sortie 1.800 kg, Sumsel 2 sortie 5.600 kg,
  lencana 10 sortie 18.000 kg. Hujan 6 provinsi: blok "7. Papua Selatan" (Bandara Senggo, Mappi) ditambahkan dari daftar hujan
  2 Nov yang ditempel pemilik.
- `satgas.py` (slide Hasil Pemadaman, tidak dipanggil bingkai sejak 2 Nov) diisi angka 3 Nov: target 622,10 ha/148 FS, padam 141,57 ha/
  64 FS (darat 89,07 + udara 52,50), sisa 480,53 ha/84 FS. Riau dihitung 0 FS padam (titik belum padam seluruhnya) supaya cocok rekap 64 FS.
- Baris sumber tabel: PM2,5 CAMS 1 Nov (hari terakhir di riwayat.json website).

Bangun ulang: `PYTHONUTF8=1 C:/Python314/python jalan.py`, lalu
`PYTHONUTF8=1 DECK_BNPB=$HOME/.claude/skills/ppt-konsultan/bnpb python bingkai.py`. Gerbang deck.py lolos (303 angka).

- Revisi 3 Nov malam (pemilik):
  - "untuk laporan karhutla gausah pake cover depan belakang": deck kini 3 slide (peta, tabel, operasi). `generator/lewat_deck.py`
    membuang sampul dan penutup untuk format `penanganan`, jadi laporan berikutnya ikut.
  - Kepala tabel panel MODIFIKASI CUACA ikut contoh pemilik (tabel LANGKAH | RINCIAN | PENANGGUNG JAWAB): pita navy 14 pt,
    tulisan putih tebal rata tengah tanpa jarak huruf, ditambah kepala PROVINSI (`generator/penanganan/bnpb.py` kepala_omc).
  - Bang Ghozi ("Hujan = hujan ringan aja", diperjelas pemilik: "yang hujan lebat tetep tulis hujan lebat aja, tapi yang hujan doang,
    tulisnya jadi hujan ringan"): pil hujan slide operasi menulis intensitas laporan satgas apa adanya; laporan tanpa intensitas jadi
    "HUJAN RINGAN" (`generator/penanganan/bnpb.py` label_hujan). Hari ini: Kalteng dan Kalsel HUJAN RINGAN, Sumsel HUJAN LEBAT.
  - "spacingnya masih berantakan yang di tabel omc": baris OMC dan SEMAI kini berjarak sama, celah judul, kepala, dan baris seragam,
    garis pemisah tipis antarbaris (`rapikan_omc`).
