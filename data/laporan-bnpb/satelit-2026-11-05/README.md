# Laporan Penanganan Pengendalian Karhutla 051126

- Cut-off 5 Nov 2026, 18.00 WIB. Cara sama dengan 041126. Dibangun 17.47 atas arahan Bang Ghozi ("dri skrg aja, judulnya tetep 18.00").
  Data dari salinan website di `web/`: harian30, peta_karhutla, dan belum_kini terbit 17.10 (putaran cut-off titik.yml). Titik
  terakhir di hotspot.json 15.26 WIB. Uji rumus luas 4 Nov: hitungan sendiri 10.169 ha, website 10.107 ha (selisih 0,6%;
  >5 ha di Papsel, Maluku, Kaltim, NTB, paling besar 21 ha). Tally 72 sel cocok.
- Nasional 5 Nov: 4.737 hotspot, 1.962 firespot, luas terbakar 8.924 ha, belum padam 5.191 ha. Tabel memuat enam provinsi:
  Papsel, Kalteng, Kaltim, Sultra, Kalsel, Sulteng.
- Slide operasi diambil dari teks satgas yang ditempel pemilik (`wa-satgas.txt`, laporan 5 Nov, kegiatan 4 Nov). Hari ini tidak ada
  rekap gelar pesawat, jadi baris PEMILIK armada tidak tampil. Armada 46 unit (18 patroli/OMC dan 28 WB). OMC: Kalteng 5 sortie/5.000 kg,
  Sumsel 2/1.600 kg, Kalsel 1/800 kg, jumlahnya 8 sortie/7.400 kg. Hujan di 5 provinsi.
  Dua kalimat hujan Jambi di teks dibalik urutannya dan lokasi 4 Nov dicetak tebal, supaya hujan Jambi ikut terbaca.
- `satgas.py` (tidak tampil di deck; dipakai untuk baris sumber): target 588,99 ha/156 FS, padam 147,29 ha/79 FS (darat 126,79 ha,
  udara 20,50 ha), sisa 441,70 ha/77 FS.

Bangun ulang: hapus `(generator).pptx`, lalu `PYTHONUTF8=1 C:/Python314/python jalan.py`, lalu
`PYTHONUTF8=1 DECK_BNPB=~/.claude/skills/ppt-konsultan/bnpb C:/Python314/python bingkai.py`. Gerbang deck.py lolos (310 angka).

## Lampiran kab/kota (ditambah 5 Nov 18.40)

Pemilik dan Bang Ghozi (WA 18.21) menilai angka per provinsi bisa menyesatkan, jadi rinciannya ditaruh di lampiran. Lampiran A1 memuat
58 kab/kota dari enam provinsi tabel dalam 3 halaman, sehingga deck sekarang 6 halaman. `lampiran_hitung.py` memakai salinan `web/`
yang sama (terbitan 17.10):
- hotspot per kab dari `satelit.hitung` tingkat kab; firespot per kab dari `fs_ini` di kluster.json. Jumlah keduanya per provinsi sama persis dengan slide 2.
- Luas dan belum padam per kab dihitung sendiri, lalu total provinsi slide 2 dibagi ke kab/kota sesuai porsi hitungan itu (pembulatan sisa terbesar).
  Selisih sebelum pembagian: luas paling banyak 2 ha (pembulatan); belum padam Papua Selatan 24 ha (1.656 vs belum_kini 1.632).
  Nilai sebelum dibagi tersimpan di `lampiran-kab.json` (`luas_sendiri`, `belum_sendiri`).
Bangun ulang lampiran: jalankan `lampiran_hitung.py` dengan `DECK_BNPB` diset, lalu `bingkai.py`. Gerbang deck.py lolos (552 angka).

## Lampiran gaya harian (5 Nov 18.50)

Pemilik minta desain lampiran mirip daftar kejadian selesai di deck harian, dengan isi yang sama. `lampiran_slide.py` menggambar
lampiran memakai mesin `harian.Deck`, dengan templat dan ikon dari `../harian-2026-11-05/kerja-051126`. Bentuknya: kepala oranye,
dua kolom, baris induk provinsi berisi angka slide 2, lalu anak kab/kota. Ikon oranye berarti ada firespot, abu berarti tidak ada,
dan belum padam ditulis sebagai pil. Hasilnya `lampiran-kab.pptx` (2 halaman), yang diimpor oleh `bingkai.py`.
Tabel `lampiran-tabel` deck.py diganti. Deck sekarang 5 halaman; gerbang deck.py lolos (594 angka).
- `generator/lewat_deck.py`: di Windows, impor dari pptx lain kini ikut disalin ke folder kerja. Sebelumnya semua impor ditimpa
  menjadi isi.pptx.
- PDF utama terkunci karena sedang dibuka di aplikasi, jadi hasilnya disimpan sebagai `... 051126 (rev1).pptx/.pdf`.
Urutan bangun ulang: `lampiran_hitung.py` (dengan DECK_BNPB), `lampiran_slide.py`, lalu `bingkai.py`.

## Lampiran rev2: gaya tabel karhutla harian (5 Nov 19.05)

Pemilik minta tampilan seperti kolom Terbakar, Firespot, dan Sisa di tabel karhutla deck harian:
- kepala navy dua baris (label dan tanggal 5 NOV);
- terbakar ditulis "± X ha" tebal;
- firespot berupa pil biru muda, belum padam berupa pil oranye, keduanya selebar kolom;
- nilai 0 tetap memakai pil, tetapi abu dengan ikon abu;
- jumlah kab/kota provinsi berupa pil oranye.

Kotak KETERANGAN di bawah panel menjelaskan ikon dan warna pil. Gerbang D-10 menolak "hari ini", jadi legenda menulis "5 Nov".
Keluarannya `... 051126 (rev2).pptx/.pdf`; `bingkai.py` sekarang menulis ke nama rev2.

## Lampiran rev3: kepala kotak berwarna, angka polos (5 Nov 19.20)

Pemilik: "jgn pill deh, ini aja headernya bikin gini". Kepala kolom sekarang berupa kotak berwarna seperti slide 2, masing-masing
dengan ikon, label, dan satuan: hotspot navy, firespot merah, luas abu-biru, belum padam oranye. Ikonnya disalin dari pptx generator
ke `ikon-kepala/`. Isi sel berupa angka polos rata tengah; nilai 0 ditulis abu. Jumlah kab/kota provinsi ditulis sebagai teks abu.
KETERANGAN berisi ikon baris (ada atau tanpa firespot 5 Nov), arti 0, dan catatan pembagian luas/belum padam.
Keluaran `... 051126 (rev3).pptx/.pdf`.
