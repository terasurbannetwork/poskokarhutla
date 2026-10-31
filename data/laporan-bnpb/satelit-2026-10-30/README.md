# Laporan Penanganan Pengendalian Karhutla 301026

- Cut-off 30 Okt 2026, 17.00 WIB. Isi = berkas website tayang 17.30–17.31 WIB (`web/`): harian30.json, peta_karhutla.json s.d. 29 Okt,
  belum_kini.json 30 Okt, hotspot.json (titik terakhir 14.56 WIB), kluster.json, kluster_hari 27–29 Okt, udara riwayat.
- Cara = versi "s.d. 17.00 WIB" deck 291026 (`../satelit-2026-10-29/dua-versi/jalan.py`), pilihan pemilik 29 Okt malam: luas terbakar
  dan belum padam dari hari api yang sama. Kolom 28 dan 29 Okt = hari itu sendiri (website). Kolom 30 Okt: belum padam = belum_kini.json;
  luas dan padam = hitungan sendiri dari hotspot.json dengan rumus peta_karhutla (website belum menerbitkan luas 30 Okt).
  Uji rumus terhadap hari terbit 29 Okt: 7.250 ha vs website 7.252 ha, tidak ada provinsi beda > 5 ha.
- Nasional 30 Okt: 5.125 hotspot, 2.273 firespot, luas 7.812 ha, belum padam 1.970 ha. Padam 6.131 ha (titik 28 Okt tanpa deteksi 29–30 Okt).
  Tabel: 6 teratas hotspot 30 Okt: Kalteng 1.018, Kaltim 969, Sulteng 597, Sultra 466, NTT 342, Sulsel 340. cek6: 72 sel cocok.
- Slide 3 dari WA satgas 30 Okt (`wa-satgas.txt`, "LAPORAN UPAYA PEMADAMAN"; pesan "LAPORAN PENANGANAN" memuat bagian yang sama ditambah
  Situasi Umum 737 HS/±680 ha/±23 ha di 6 provinsi, yang di deck diganti angka website). Judul dan pil = tanggal laporan 30 Okt,
  kegiatannya 29 Okt. OMC 3 provinsi, 14 sortie 19.300 kg (Kalteng 9 sortie 11.300 kg, Sumsel 4 sortie 7.200 kg, Kalsel 1 sortie 800 kg).
  Hujan 5 provinsi (Kalbar, Kalteng, Kalsel, Sumsel, Jambi).
- Armada 58 unit (23 patroli/OMC + 35 WB). Beda dengan 29 Okt (59): patroli Kalteng 2→3, Kalsel 9→8, Jatim 1→0. WA tanpa rekap instansi
  dan rekap 28 Okt (59 unit) tidak lagi berjumlah sama, jadi baris PEMILIK tidak tampil.
- Tiga PDF rekap heli PDW (Riau & Kalteng, Kalbar & Kalsel, Sumsel & Jambi) = rekap kumulatif per kontrak armada sewaan BNPB (jam terbang,
  sortie, WB, liter). Slide 3 tidak memuat jam terbang dan PDF tidak memuat armada TNI/Kemenhut/Pemda, jadi deck tidak berubah.
- Firespot keempat hari langsung dari website; hitungan sendiri `firespot_hari.seri` tidak dijalankan (ia menarik cuaca 92 hari untuk
  612 sel dan kuota Open-Meteo habis). Cuaca pil hanya ditarik untuk sel 6 provinsi tabel, 3 hari terakhir.

Dibuat di Windows:

```powershell
$env:PYTHONUTF8=1; C:\Python314\python data\laporan-bnpb\satelit-2026-10-30\jalan.py      # BARU=1 untuk unduh ulang web/
```

Perbaikan generator untuk Windows (30 Okt): `penanganan.py` memanggil python yang sedang jalan (`-X utf8 -E`, bukan `python3 -I`) dan
PDF lewat `pdf.py` (PowerPoint bila tanpa soffice); `penanganan/peta.mjs` dan `ikon.mjs` memakai `fileURLToPath`; `penanganan/kisi.py`
mencari Arial di `C:\Windows\Fonts`; butuh Pillow (`python -m pip install pillow`). `wa_operasi.py` mengenali "Hujan dilaporkan terjadi di X".
