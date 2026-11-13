# Laporan Penanganan Pengendalian Karhutla 021126

- Cut-off 2 Nov 2026, 17.00 WIB. Isi = salinan website di `web/` (harian30 17.11, peta_karhutla dan belum_kini 17.12; lintasan terakhir
  hotspot.json 15.11 WIB). Versi "per sekarang": kolom 2 Nov = belum_kini.json website (1.735 ha nasional), luas 6.180 dan padam 4.490 ha
  hitungan sendiri dari hotspot.json (uji 1 Nov: 5.891 vs website 5.865 ha; Papsel 1.328 vs 1.307). Kolom lampau = hari itu sendiri.
- `web-1530/` = salinan terbitan 15.30 (belum_kini 2 Nov belum ada, jadi bangun pertama 17.10 jatuh ke versi hari utuh); diganti bangun
  17.16 sesudah website terbit 17.11.
- Tally `jalan.py`: 72 sel tabel cocok angka.json, baris Jumlah cocok. Nasional 2 Nov: 3.148 hotspot, 1.052 firespot. Baris tabel:
  Papsel, Kalteng, Kaltim, NTT, Sultra, Sulteng.
- Slide 3 dari teks satgas yang ditempel pemilik di sesi Claude 2 Nov (`wa-satgas.txt`, laporan 2 Nov, kegiatan 1 Nov): personel 71.878;
  armada 52 (22 patroli/OMC + 30 WB); OMC Kalteng 6 sortie (6.800 kg NaCl + 2.500 kg dry ice), Kalsel 2 sortie 3.000 kg NaCl, Sumsel
  4 sortie 7.200 kg NaCl, lencana 12 sortie 19.500 kg; hujan 5 provinsi (Kalbar, Kalteng, Kalsel, Sumsel, Jambi).
- Dua perbaikan `generator/wa_operasi.py` hari ini: (1) baris "Realisasi OMC tanggal 19 Oktober - 1 November" (kumulatif) tidak lagi
  dijumlah ke muatan harian (sebelumnya Kalteng terbaca 129.400 kg, Sumsel 91.200 kg); (2) hujan berpola "Hujan ringan–sedang di X"
  tanpa kata "dilaporkan" (Jambi) terbaca. Hasil parser 27 Okt sampai 1 Nov tidak berubah.
- PDF lewat PowerPoint Windows: daftar font PDF menyebut Calibri-Bold/Calibri-Italic (sejak 31 Okt, juga PDF laporan harian), tetapi
  render halaman (Windows.Data.Pdf) tampak Roboto. PDF 30 Okt dan PDF buatan Mac masih berlabel Roboto-Bold.

- **Lewat mesin ppt-konsultan (2 Nov 17.30, pemilik: "utamakan pembuatan slidenya pakai skill itu")**: `bingkai.py` membingkai tiga slide
  generator dengan `deck.py` format `penanganan` (pola laporan harian 021126): sampul + KRIS, penanda bagian (01 Situasi: peta, tabel;
  02 Operasi), kaki Sumber, penutup Call Center 117; 5 slide, gerbang deck.py lolos (huruf terkecil 6 pt, 304 angka diperiksa).
  Hasil generator mentah: `... (generator).pptx`; spek bingkai: `... (spek deck).json`.
- Supaya lolos gerbang deck.py (deck penanganan belum pernah lewat mesin karena ini): kepala kolom peta 4,5 pt jadi 6 pt dengan satuan
  di baris kedua (`generator/penanganan/tambah_peta.py`); judul slide tabel turun 1 pt sampai satu baris (`ganti.py judul_satu_baris`,
  hari ini 24 pt) karena judul dua baris menabrak penanda bagian; D-10 menolak "provinsi prioritas" di baris sumber.

Bangun ulang: `PLAYWRIGHT_MJS=<playwright>/index.mjs python3 jalan.py` (memakai ulang `web/`; `BARU=1` mengunduh ulang), lalu
`DECK_BNPB=~/.claude/skills/ppt-konsultan/bnpb python3 bingkai.py`.
- Sesudah bingkai (2 Nov 17.30–17.50): slide native "Hasil Pemadaman Satgas per Tanggal 2 November 2026" (`satgas.py`: target, padam
  darat/udara, sisa per provinsi + pita hambatan dan upaya dari bagian C teks pemilik); firespot merah tema C8102E (deck.py memetakan
  C9503A ke oranye = belum padam); sumber PM2,5 (CAMS 1 Nov) dan cuaca (Open-Meteo) di kaki slide tabel; pemilik: logo BNPB 1x
  ("terlalu besar", bawaan mesin 1,3x) dan catatan kaki "*Data berdasarkan GIS ..." dihapus beserta bintang kepala kolom
  ("kan udah ada di footer sumber").
- Pemeriksa bersih (`rapor.md`): Judul 4, Grafik 4, Tata letak 3, Sumber dan angka 5, Alur 4, Rasa mahal 4; semua angka dihitung ulang
  cocok. `periksa.py --serah` MENOLAK (Tata letak 3): panel PENANGANAN slide operasi (templat generator) ±60% kosong dan mengulang 22/30
  armada. Menunggu keputusan pemilik untuk membuka templat itu.
- Pemilik 2 Nov ("hapus slide 4"): slide Hasil Pemadaman Satgas dikeluarkan dari susunan `bingkai.py` (`satgas.py` tetap ada, tidak
  dipanggil). Deck akhir 5 slide: sampul, peta, tabel, operasi, penutup; gerbang deck.py lolos (304 angka). Rapor juri di atas menilai versi
  6 slide, belum dinilai ulang.
- Klarifikasi pemilik 2 Nov (label "HUJAN SEDANG"): pil cuaca slide tabel kini kelas intensitas BMKG dari hujan model Open-Meteo 24 jam
  (1 Nov 13.00 s.d. 2 Nov 12.00 setempat) beserta angkanya ("RINGAN 2,1 MM"; di bawah 0,5 mm "TIDAK HUJAN"); legenda "hujan 24 jam s.d.
  2 Nov 12.00" (bukan "prakiraan cuaca"); pil dari WA BMKG pagi ditulis "POTENSI HUJAN". Hari ini keenam provinsi tabel hujan ringan
  1,9 sampai 4,9 mm. Kode: `generator/pil_sendiri.py` (kelas_hujan, uji), `generator/penanganan/bnpb.py` (ganti_tabel).
