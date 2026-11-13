# Laporan Penanganan Pengendalian Karhutla 291026

- Cut-off 29 Okt 2026, 17.00 WIB (baku Penanganan). Isi = berkas website tayang 17.29–17.30 WIB (titik.yml 17.26 hijau): harian30.json,
  peta_karhutla.json s.d. 28 Okt, belum_kini.json 29 Okt (sesudah lintasan siang NOAA). `jalan.py` sama caranya dengan 281026
  (../satelit-2026-10-28/README.md). Luas terbakar dan padam = hari utuh 28 Okt, berlabel 29 Okt; belum padam 29 Okt dari belum_kini.json
  (`belum_kini=True`), hari lampau hari utuh tanpa geser.
- Tally pemilik ("data tally dengan website"): 760 sel per provinsi (hotspot, firespot, luas, belum padam tiga kolom; padam) dicocokkan
  dengan berkas web/: tanpa beda; cek6 72 sel slide tabel cocok. Nasional 29 Okt: 3.245 titik, 1.271 firespot, luas 7.696 ha (hari utuh
  28 Okt), belum padam 1.072 ha (belum_kini 29 Okt). Pil PM2,5 = riwayat udara website 28 Okt (Kalteng 211,1 = SGT TDK SEHAT).
- Baris tabel: 6 teratas hotspot 29 Okt: Kaltim, Sultra, Sulteng, NTT, Sulsel, Kalteng.
- Mesin ini tanpa Roboto di ~/Library/Fonts dan tanpa soffice: peta.mjs kini jatuh ke public/vendor/roboto; PDF diekspor lewat
  PowerPoint. Persen empat digit di tabel slide peta ("▲3.200%") tidak lagi terpotong dua baris (tambah_peta.py wrap="none").
- Slide 3 dari WA Ghozi 29 Okt 18.27 (`wa-satgas.txt`, pesan kedua "LAPORAN UPAYA PEMADAMAN"; pesan pertama memuat bagian yang sama
  ditambah Situasi Umum 55 HS/±48 ha/±4 ha, yang di deck diganti angka website). Judul dan pil = tanggal laporan 29 Okt, kegiatannya
  (WB, OMC, hujan) 28 Okt. Personel 71.878 (sama dengan 28 Okt).
  OMC 3 provinsi: Kalteng 9 sortie (10.600 kg NaCl + 2.400 kg dry ice, termasuk PK-SNK dari Kalsel), Sumsel 7 sortie (8.200 kg NaCl +
  1.700 kg dry ice), Kalsel 1 sortie (1.000 kg NaCl). Hujan 5 provinsi (Kalbar, Kalteng, Kalsel, Sumsel, Jambi), semuanya 28 Okt.
  Lencana SEMAI OMC = total 3 provinsi (17 sortie, 23.900 kg); sampai 28 Okt lencana menjumlah 2 baris yang tampil saja (deck 281026
  menulis 16 sortie/22.600 kg tanpa Kalsel 2 sortie/2.000 kg). Ditemukan pemeriksa independen 29 Okt, yang juga mencocokkan ulang
  semua sel slide 1-2 dan website live 19.22 WIB (byte-identik dengan web/).
- Armada: WA hari ini tanpa rekap gelar/instansi. Badan WA 24 patroli/OMC + 35 WB = 59, per provinsi sama persis dengan rekap gelar
  28 Okt, jadi baris PEMILIK memakai rekap instansi 28 Okt (BNPB 41, TNI 15, Kemenhut 1, Pemda 1, PT Sinarmas 1; pemilik 29 Okt: "ikuti
  data kemarin kalau ada"). Pil ARMADA UDARA bertanggal laporan (29 Okt). Parser: "Kalimantan Timur: *1 unit* tergelar di IKN" dibaca
  Kalimantan Timur/IKN; sasaran OMC "1.000 kg NaCl* di *Muara Enim dan Prabumulih*" ikut terbaca.
- PDF "REKAP JAM TERBANG HELI PATROLI DAN WB - 29 Oktober" (akumulatif s.d. 28 Okt) hanya armada sewaan BNPB (13 patroli + 26 WB + PK-DAN
  reposisi IKN); tanpa TNI/Kemenhut/Pemda/PT Sinarmas dan pesawat khusus OMC, dan slide 3 tidak memuat jam terbang, jadi tidak mengubah
  deck. Beda dengan WA/rekap 28 Okt: IKN PK-DAN sewaan BNPB (rekap: TNI), WB Kalsel 5 BNPB termasuk PK-DBM (WA: 4 BNPB + HA-5234 TNI),
  WB Riau 4 (WA 3, koreksi Ghozi 27 Okt). Deck ikut WA dan rekap 28 Okt.
- Pemilik 29 Okt malam: luas terbakar dan belum padam harus dari hari api yang sama ("hari yang sama biar pasti"); deck di atas memasangkan
  luas hari utuh 28 Okt dengan belum padam 29 Okt (belum_kini). Dua versi di `dua-versi/` (salinan web/ yang sama, cut-off 17.00, tally
  760 sel masing-masing): "hari utuh 28 Okt" (Papsel 4.613 / 1.618 ha; nasional 7.696 / 2.114 ha) dan "s.d. 17.00 WIB" (Papsel 282 / 153 ha;
  nasional 5.804 / 1.072 ha; luas dan padam 29 Okt hitungan sendiri, belum terbit di website). Bangun: `python3 dua-versi/jalan.py utuh|kini`.

Bangun ulang: `PLAYWRIGHT_MJS=<playwright>/index.mjs python3 jalan.py`, lalu ekspor PDF lewat PowerPoint.
