# Laporan Penanganan Pengendalian Karhutla 281026

- Cut-off 28 Okt 2026, 17.00 WIB (baku Penanganan). Isi = berkas website tayang 16.56 WIB (titik.yml 16.53 hijau): harian30.json,
  peta_karhutla.json s.d. 27 Okt. `jalan.py` sama caranya dengan 271026 (lihat ../satelit-2026-10-27/README.md), kecuali hotspot SEMUA hari
  dari harian30.json (tabel Real Time/Riwayat website); peta_karhutla.json berbeda 1-4 titik untuk 17 provinsi pada 26-27 Okt.
  Tally pemilik ("pastikan datanya tally dengan website"): 494 sel per provinsi (hotspot, firespot, luas, belum padam tiga kolom; padam),
  total slide 1, dan subjudul slide 2 dicocokkan dengan berkas website tayang: tanpa beda. Nasional 28 Okt: 766 titik, 446 firespot;
  luas 5.769 ha dan belum padam 1.682 ha (hari utuh 27 Okt, berlabel 28 Okt).
- FIRMS NRT belum menerbitkan lintasan siang 28 Okt sampai 16.50 WIB (NOAA-20 terakhir 27 Okt 23.37, NOAA-21 28 Okt 02.02, S-NPP 00.58,
  MODIS 06.05 WIB), jadi hotspot 28 Okt hanya lintasan malam/pagi dan belum_kini.json 28 Okt belum ada. Belum padam pakai hari utuh
  27 Okt, dilabeli 28 Okt seperti luas (`param_ha`: luas_00 tanpa belum_kini).
- titik.yml hari ini merah di langkah "Periksa kesegaran data yang tayang" (/api/status 503: sumber "kualitas" basi sejak 27 Okt 14.54);
  data titik tetap terbit.
- Baris tabel: 6 teratas hotspot 28 Okt: Kaltim, Kalteng, Papsel, Sulteng, Sulsel, Sultra.
- Pil PM2,5 = rata-rata provinsi model CAMS hari utuh terakhir di website (udara/data/riwayat.json, 27 Okt), kategori P.14/2020. Versi
  pertama memakai salinan repo yang tertinggal (26 Okt: Kalteng 346 Berbahaya); website 27 Okt Kalteng 230,8 = Sangat Tidak Sehat, ditulis "231 SGT TDK SEHAT" (pemilik memilih singkatan); teks pil yang lebih
  lebar dari kotaknya dikecilkan hurufnya secukupnya (bnpb.isi_pil, 6,6 ke 5,3 pt), pil lain tetap.
- Slide 3 dari WA Ghozi 28 Okt 16.25 (`wa-satgas.txt`): judul dan pil tanggal = tanggal laporan WA 28 Okt (pemilik: "bukannya udah
  ada tanggal 28?"), kegiatannya (WB, OMC, hujan) 27 Okt; armada dari rekap gelar "Data: 28 Oktober"
  (24 patroli/OMC + 35 WB = 59; BNPB 41, TNI 15, Kemenhut 1, Pemda 1, PT Sinarmas 1), bukan bagian armada badan WA yang masih menyalin
  27 Okt (Jabar 1 patroli, Jateng 2 WB TNI; 61 unit). Koreksi Ghozi 27 Okt sudah ada di rekap: WB Riau 3, 1 WB BNPB Papua Barat Daya
  (kerja sama PT LNG Tangguh). Pil ARMADA UDARA bertanggal rekap (28 Okt).
  OMC 3 provinsi: Kalteng 8 sortie (11.200 kg NaCl + 500 kg dry ice, termasuk lintas Kalsel), Sumsel 8 sortie (9.200 kg NaCl + 1.700 kg
  dry ice), Kalsel 2 sortie (2.000 kg NaCl). Hujan 4 provinsi (Kalbar, Kalteng, Kalsel, Sumsel); hujan Jambi bertanggal 26 Okt, tidak dihitung.
- Excel "Rekap OMC PPK Prastato Tahun 2026" dan daftar wilayah OMC PDW I bahan rekap OMC (../omc-2026-10-28), bukan deck ini.

Bangun ulang: `PLAYWRIGHT_MJS=<playwright>/index.mjs python3 jalan.py`, lalu ekspor PDF lewat PowerPoint.
