# Laporan Penanganan Pengendalian Karhutla 301026

- Cut-off 30 Okt 2026, 17.00 WIB. Isi = salinan website 18.07 WIB di `web/` (titik.yml 17.30, lintasan terakhir 14.56 WIB): harian30.json,
  peta_karhutla.json s.d. 29 Okt, belum_kini.json 30 Okt, hotspot.json, kluster.json, kluster_hari 27-29 Okt, riwayat udara.
  `jalan.py` tidak mengunduh ulang, jadi bangun ulang memberi angka yang sama.
- Dua versi, luas terbakar dan belum padam dari hari api yang sama (pemilik 29 Okt: "hari yang sama biar pasti"):
  - `python3 jalan.py utuh` -> "hari utuh 29 Okt": kolom 30 Okt = hari utuh 29 Okt website (luas 7.252, belum padam 1.825, padam 3.800 ha).
  - `python3 jalan.py kini` -> "s.d. 17.00 WIB": kolom 30 Okt = belum_kini.json website (1.970 ha), luas 7.812 dan padam 6.131 ha hitungan
    sendiri dari hotspot.json (rumus peta_karhutla). Uji rumus pada 29 Okt yang sudah terbit: luas 7.250 vs website 7.252 ha, padam
    3.628 vs 3.800 ha.
- Tally: 760 sel per versi (hotspot, firespot, luas, belum padam, padam per provinsi per hari) cocok dengan `web/`, tanpa beda.
  Nasional 30 Okt: 5.125 titik, 2.273 firespot. Baris tabel: Kalteng, Kaltim, Sulteng, Sultra, NTT, Sulsel.
- Slide 3 dari WA Ghozi 30 Okt 10.55 (`wa-satgas.txt`, pesan "LAPORAN UPAYA PEMADAMAN"; kegiatan 29 Okt). Personel 71.878. OMC:
  Kalteng 9 sortie (8.400 kg NaCl + 2.900 kg dry ice), Sumsel 4 sortie (5.600 + 1.600 kg), Kalsel 1 sortie (800 kg NaCl); lencana SEMAI
  14 sortie, 19.300 kg. Hujan 5 provinsi. Parser: "Hujan dilaporkan terjadi di X ... dengan intensitas" (Sumsel, tanpa cetak tebal) kini
  terbaca; versi pertama deck menulis Sumsel "BELUM HUJAN".
- Armada 58 (23 patroli/OMC + 35 WB). WA tanpa rekap gelar; beda dengan rekap 28 Okt: Jawa Timur patroli/OMC 1 -> 0 (PK-SCH, OMC BNPB
  menurut rekap 28 Okt) dan satu patroli/OMC pindah Kalsel 9 -> Kalteng 3. Baris PEMILIK = rekap instansi 28 Okt dikurangi PK-SCH: BNPB 40,
  TNI 15, Kemenhut 1, Pemda 1, PT Sinarmas 1 (dijaga assert di `jalan.py`).
- Tiga PDF rekap operasi udara PDW 1 (Riau, Kalteng), PDW 3 (Kalbar, Kalsel), Sumsel-Jambi: rekap kontrak sewa BNPB dengan jam terbang
  kumulatif sejak Maret, tanpa angka harian dan tanpa unit TNI/Kemenhut/Pemda/PT Sinarmas; slide 3 tidak memuat jam terbang, jadi tidak
  mengubah deck.
- Mesin: Open-Meteo macet ±25 menit sebelum menjawab; PowerPoint tidak bisa membuka berkas dari folder baru (AppleEvent timed out), PDF
  diekspor lewat salinan sementara di ../satelit-2026-10-29.

Bangun ulang: `PLAYWRIGHT_MJS=<playwright>/index.mjs python3 jalan.py utuh|kini`, lalu ekspor PDF lewat PowerPoint.
