# Laporan Penanganan Pengendalian Karhutla 271026

- Cut-off ditulis 27 Okt 2026, 15.00 WIB (pemilik: "cutoff seolah2 jam 15.00"). Isinya data website tayang saat dibangun
  (harian30.json 27 Okt 17.43 WIB, titik terakhir 16.17 WIB, jadi lewat dari label 15.00). Pemilik minta data terbaru sore: titik.yml
  dijalankan manual 15.51 WIB (run 40476458216) dan 17.42 WIB (run 40490555367; run terjadwal 17.19 dibatalkan karena tergeser
  Terbitkan tampilan di antrean concurrency `data` yang sama).
- Pemilik: "data harus sama dengan website, bila ada perbedaan data dengan wa/pdf ambil data website". `jalan.py` mengunduh ulang berkas
  website (web/) dan memakai angkanya: hotspot hari ini = harian30.json; hot/luas/belum/padam hari yang sudah terbit (s.d. 26 Okt) =
  peta_karhutla.json; firespot hari ini = jumlah fs_ini kluster.json per provinsi (kolom FS Real Time), hari lampau = kluster_hari kolom 4.
  Luas terbakar = 26 Okt, hari utuh terakhir (website belum menerbitkan luas 27 Okt). Belum padam = 27 Okt dari belum_kini.json, yang tayang
  mulai run 17.42 (commit 30381166: tab Belum padam memakai hari ini sesudah lintasan siang NOAA; pemilik 27 Okt: deck ikut begitu tayang).
  Luas dilabeli tanggal cut-off 00.00-nya (pemilik 27 Okt: "cutoff luas terbakar kan di jam 00"): luas hari utuh 26 Okt = kolom 27 Okt,
  jadi semua kelompok slide 2 berkolom 25, 26, 27 Okt; subjudul padam "api 25 Okt telah padam pada 27 Okt"; slide 1 "terbakar (cut-off 00.00)";
  catatan kaki "luas s.d. 00.00 WIB" (`penanganan.bangun ha_utuh=True, belum_kini=True, luas_00=True`). Belum padam Maluku, Malut, Papua 27 Okt masih kurang lintasan malam (catatan commit website).
  Nasional: 2.595 titik, 1.141 firespot, 1.290 ha belum padam (27 Okt), 10.539 ha terbakar (s.d. 27 Okt 00.00); dicocokkan dengan website 17.43: tanpa beda.
  Uji: hotspot 27 Okt hitung ulang dari hotspot.json = harian30.json tanpa selisih.
- WA satgas 27 Okt 13.41 (6 provinsi prioritas) memakai luas/belum padam 24 Okt (21.071 / 16.586 ha) dan hotspot pagi
  (Sumsel 116, Jambi 27). Deck memakai angka website (Sumsel 128, Jambi 29, luas/belum padam s.d. 26 Okt).
- Baris tabel: 6 teratas hotspot 27 Okt (aturan generator, dipilih pemilik): Kaltim, NTT, Papsel, Sultra, Sulteng, Sulsel.
  Lambang Sulsel ditambahkan ke `generator/penanganan/logo/73.png` (Wikimedia Commons, Coat_of_arms_of_South_Sulawesi.svg, 500 px).
- 3 slide: halaman 3 "Operasi Penanganan Karhutla per Tanggal 26 Oktober 2026" dari WA satgas 27 Okt 13.41 (`wa-satgas.txt`, data 26 Okt;
  pemilik: "tanggal 25 ada contohnya"). Dihidupkan lewat `penanganan.py --operasi`. Armada 24 patroli + 37 WB = rekap WA; OMC Kalteng
  9 sortie/14.400 kg dan Sumsel 5 sortie/8.400 kg NaCl; Kalsel disasar Hercules A-1328 dari Kalteng. Personel per provinsi = WA (dijaga
  generator). Rincian personel per instansi templat
  (TNI 13.396 ... M. Agni 1.758; jumlah 65.529, bukan 71.878, tidak ada di WA) DIBUANG (pemilik 27 Okt: "sesuaikan"; bnpb.tanpa_instansi).
  Subjudul "hujan di 5 provinsi" = semua provinsi yang hujannya dilaporkan WA (termasuk Jambi); judul bagian "OMC DAN HUJAN" karena Kalbar
  hujan tanpa sortie OMC.
- Urutan kelompok tabel slide 2: HOTSPOT, FIRESPOT, LUAS TERBAKAR, BELUM PADAM (sama dengan slide 1; pemilik 27 Okt).
- Pil PM2,5 dan cuaca dari `pil_sendiri` (tanpa WA BMKG).
- `cek6.py`: 72 sel cocok dengan angka.json. PDF diekspor lewat PowerPoint (soffice tidak terpasang).

Bangun ulang: `PLAYWRIGHT_MJS=<playwright>/index.mjs python3 jalan.py` (memakai `wa-satgas.txt`) (butuh cache/raw FIRMS 20 s.d. 25 Okt; website diunduh ulang, jadi angka hari ini ikut versi website saat dijalankan), lalu ekspor PDF.

Revisi tampilan pemilik 27 Okt malam:
- Ikon beda tiap kategori, sama di semua slide: HOTSPOT api templat, FIRESPOT lingkaran bidik deck 25 Okt (`generator/penanganan/ikon/firespot.png`),
  LUAS kotak, BELUM PADAM peringatan; ikon + tulisan kepala kolom rata tengah.
- Subjudul slide 1 tanpa "(cut-off 00.00)"; catatan kaki cukup "*Data berdasarkan GIS ... (FIRMS: VIIRS dan MODIS)." (kalimat Firespot dan
  "Angka 27 Okt sementara" dibuang; `sementara.py` dihapus); angka hektare subjudul slide 2 ber-±.
- Legenda biru slide 2 = "prakiraan cuaca 27 Okt" (pil PM2,5 = rata-rata provinsi model CAMS 26 Okt; tanggalnya tidak lagi ditulis).
- Slide 3: bagian OMC hanya provinsi ber-OMC (Kalbar dibuang, "3 dari 3 provinsi hujan"); baris PEMILIK armada dari rekap WA
  (BNPB 41, TNI 17, Kemenhut 1, Pemda 1, PT Sinarmas 1 = 61; ikon Pemda `generator/penanganan/ikon/pemda.png` dari `ikon.mjs`).
- Catatan Ghozi 18.21 (WB Riau kurang 1, PT LNG Tangguh Papua) untuk deck 28 Okt, tidak dimasukkan.
