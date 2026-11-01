# Laporan Penanganan Pengendalian Karhutla 011126

- Cut-off 1 Nov 2026, 17.00 WIB. Isi = salinan website di `web/` (harian30 17.18, peta_karhutla dan belum_kini 17.19; lintasan terakhir
  hotspot.json 14.35 WIB). Versi "per sekarang" (tim 31 Okt): kolom 1 Nov = belum_kini.json website (1.244 ha), luas 4.842 dan padam
  5.310 ha hitungan sendiri dari hotspot.json (rumus peta_karhutla; uji 31 Okt: 6.923 vs website 6.925 ha); kolom lampau = hari itu sendiri.
- Tally (diperiksa ulang terpisah dari `jalan.py`): 760 sel angka.json cocok dengan `web/`; seluruh angka tabel 6 provinsi, baris Jumlah,
  kartu dan tabel 10 provinsi slide peta ada di teks deck. Nasional 1 Nov: 2.611 titik, 941 firespot. Baris tabel: Kalteng, Papsel,
  Sultra, NTT, Babel, Kalbar.
- Pil PM2,5 = riwayat udara website 31 Okt (Kalteng 55,4 = SEDANG, di bawah ambang 55,5). Pil cuaca: Open-Meteo past_days=1, sel 6
  provinsi tabel; keenamnya HUJAN, sama dengan fwi.json website 1 Nov (rata 1,4-6,0 mm).
- Slide 3 dari WA Ghozi 1 Nov 11.01 (`wa-satgas.txt`, pesan "LAPORAN UPAYA PEMADAMAN"; kegiatan 31 Okt): personel 71.878; armada 52
  (22 patroli/OMC + 30 WB; Lampung tidak ada lagi); OMC Kalteng 8 sortie 8.400 kg NaCl, Sumsel 4 sortie (6.400 kg NaCl + 800 kg dry ice),
  Kalsel 1 sortie 800 kg, lencana 13 sortie 16.400 kg; hujan 5 provinsi. WA tanpa rekap instansi dan armada berubah di beberapa provinsi
  dibanding rekap 28 Okt, jadi baris PEMILIK tidak tampil.
- Deck dibangun sesi lain 1 Nov 18.07; `wa-satgas.txt` dan README ditambahkan sesudahnya saat pemeriksaan.

Bangun ulang: `PLAYWRIGHT_MJS=<playwright>/index.mjs python3 jalan.py` (memakai ulang `web/`; `BARU=1` mengunduh ulang), lalu ekspor PDF
lewat PowerPoint.
