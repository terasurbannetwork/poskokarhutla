# Deck 251026 versi cut-off 25 Okt 15.00 WIB (data 25 Okt sementara)

Permintaan pemilik 25 Okt sore: "versi baru untuk hari ini, cut-off jam 15.00, cek data apakah ada update". Aturan sama dengan
`../README.md` (firespot titik di cluster firespot "ya", hotspot tanpa sumber panas industri, PM2.5 BMKG pada jam cut-off). Sumber deck:
`../../satelit-2026-10-24/sementara-24okt-1500/sumber-241026-cutoff-0700.pptx`.

- FIRMS 7 hari publik ditarik ulang sampai 25 Okt 16.30 WIB (`firms-7hari-publik-25okt-1630.tar.gz`; terakhir NOAA-20 06.22 UTC, S-NPP 05.59,
  NOAA-21 07.03, MODIS 06.25). Pemilik memilih menunggu lintasan siang: Kalteng sudah lengkap (NOAA-21 05.10, S-NPP 05.50, NOAA-20 06.10 UTC,
  pola yang sama dengan 22-24 Okt maju 10-20 menit/hari) tetapi titiknya jauh lebih sedikit dari 24 Okt (asap/awan; Koordalops mencatat hujan
  deras di Seruyan). Lintasan siang Sumsel belum ada; /api/titik website (FIRMS API berkunci, 16.15 WIB, data s.d. 15.03) memuat jumlah yang
  sama, jadi bukan beda sumber. Sumsel 25 Okt (336 titik) masih rendah.
- Lintasan siang Sumatra (hotspot): S-NPP dan NOAA-20 siang hanya menyapu sampai ~107-108 BT; Sumsel baru disapu NOAA-21 13.57 WIB (2 titik,
  bukan sensor hotspot). Orbit S-NPP ~14.30 dan NOAA-20 ~14.50 WIB di atas Sumatra belum masuk FIRMS s.d. 17.30 WIB. Atas permintaan pemilik
  deck dibuat dengan data yang ada; kaki slide tabel diberi "lintasan siang Sumatra belum masuk".
- Angka: `hitung_nasional.py` (`CUT = 25 Okt 15.00`, `HARI = 22-25 Okt`) -> `angka_22-25.json`; firespot titik `firespot_24-25.json`
  (25 Okt dinilai 15.00, 24 Okt pada 24.00). Baris tabel = 6 teratas 24 Okt (`URUT_HARI=2`), sama dengan versi pagi.
- Pil PM2.5 (`pil1500.py`): BMKG 15.00 (22 dari 27 stasiun; Palangkaraya tidak melapor sejak 12.00, jadi Kalteng = Pangkalanbun 60,5 dan
  kemungkinan terlalu rendah): Kalbar 310 berbahaya (Mempawah), Kalsel 187 sangat tidak sehat (Banjarbaru), Sumsel 78 (Talang Betutu),
  Kalteng 61; Papsel dan Sultra "< 56" (nilai ke-10 Muaro Jambi 56,0). Cuaca BMKG 23-25 Okt.
- Slide operasi (`ops24wa.py`, menggantikan ops24.py) = data 24 Okt dari WA "LAPORAN PENANGANAN KARHUTLA DI ENAM PROVINSI PRIORITAS"
  25 Okt 18.03 (sumber yang sama dengan slide lama): personel 71.878 (rincian tidak berubah); armada 63 unit = 24 patroli/CASA/OMC + 39 heli WB
  (Jawa Barat WB 3, sebelumnya 1; baris dipindah ke bawah Jambi); OMC Kalteng 8 sortie 7.500 kg (NaCl 3.000 + dry ice 4.500), hujan deras
  Seruyan; Kalsel 2 sortie 2.000 kg NaCl, hujan Tapin dan Kotabaru; Sumsel 8 sortie 12.100 kg (dry ice 3.300 + NaCl 8.800), hujan Muba,
  Palembang, Banyuasin, OKI; Kalbar tanpa OMC, hujan sedang Kapuas Hulu; total 18 sortie 21.600 kg; hujan dilaporkan di 6 provinsi.
  Beda dengan Laporan Harian Koordalops 24102026: OMC Kalteng 9 sortie / dry ice 5.300 kg (satu sortie dry ice 800 kg PK-SNK lebih); dipakai
  angka WA. Personel per instansi (TNI 13.396 dst.) tidak ada di kedua laporan dan tidak diubah.
- Kaki slide peta dan tabel: atas permintaan pemilik hanya kalimat dasar "*Data berdasarkan GIS ... (FIRMS: VIIRS dan MODIS)."; catatan
  "sementara", definisi firespot, dan "lintasan siang Sumatra belum masuk" (s.d. 18.16 WIB S-NPP berhenti 06.01 UTC) dihapus dari slide.

Bangun ulang: raw2 = normalkan.py atas tar; `python3 -I hitung_nasional.py`; firespot.py; `FIRESPOT=firespot_24-25.json node peta.mjs`;
`URUT_HARI=2 FIRESPOT=firespot_24-25.json python3 -I perbarui.py <sumber> angka_22-25.json t1.pptx "25 Okt 2026, 15.00 WIB" "Angka 25 Okt sementara, data s.d. 15.00 WIB." peta-25okt.png`;
`pil1500.py t1 t2`; `firespot_tabel.py t2 firespot_24-25.json t3`; `ops24wa.py t3 <keluar>` (lalu kaki slide peta dan tabel dikembalikan ke kalimat dasar).
