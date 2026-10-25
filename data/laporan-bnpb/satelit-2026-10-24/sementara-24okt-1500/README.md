# Deck 241026 versi cut-off 24 Okt 15.00 WIB (data 24 Okt sementara)

Dibangun ulang 25 Okt pagi atas permintaan pemilik ("pakai data kemarin, cut-off jam 3 sore tanggal 24"), dengan semua penyesuaian
deck 251026 (`../../satelit-2026-10-25/`): baris tabel = 6 teratas hari terakhir, lambang Sultra, hotspot tersaring sumber panas industri
seperti tab Real Time, peta Roboto, firespot. Sumber deck: `sumber-241026-cutoff-0700.pptx` (deck 07.00 pemilik). Slide operasi tidak
disentuh (data 23 Okt, sesuai cut-off).

- Angka: FIRMS 7 hari publik ditarik 25 Okt 07.21 WIB (`../../satelit-2026-10-25/firms-7hari-publik-25okt-0721.tar.gz`), deteksi sesudah
  24 Okt 15.00 WIB dibuang (`hitung_nasional.py`, `CUT`). Kolom 22/23/24 Okt; luas/belum tidak disaring, hotspot tanpa titik industri
  (`titik_palsu.json`, tanpa kawah). `angka_21-24.json`.
- Firespot = TITIK (permintaan pemilik), bukan cluster: `firespot.py` memakai `scripts/data/harian.py` (dbscan, firespot) persis seperti
  website: cluster ST-DBSCAN titik VIIRS S-NPP/NOAA-20/NOAA-21 berkeyakinan sedang/tinggi 7 hari, tanpa gunung api dan industri, dinilai
  pola SIPANTAU ("ya"/"mungkin"). Firespot titik hari d = titik S-NPP/NOAA-20 n/h hari d sebelum cut-off di cluster "ya" (selalu <= hotspot).
  24 Okt dinilai pada 15.00, 23 Okt pada 24.00 (pembanding panah). `firespot_23-24.json` (per provinsi + titik untuk peta).
  Paritas dengan data/kluster.json website (25 Okt 05.04): status "ya" per cluster sama di Sultra 76/76, Sulsel 44/44, Malut 32/32;
  jumlah cluster aktif beda di provinsi gambut karena website mempertahankan cluster gambut kering 168 jam dan berkas FIRMS publik baru
  mulai 17 Okt. Website tidak menerbitkan titik anggota cluster, jadi jumlah titik firespot tidak bisa dicocokkan langsung.
- Pil PM2.5 (`pil15.py`): stasiun BMKG pukul 15.00 dari dasbor cews.bmkg.go.id (deret 5 hari, `pm25_24okt_1500.json`): Kalteng 2.588
  (Palangkaraya; di atas 2.000 yang biasa ditolak project sebagai sensor rusak), Kalbar 360 (Mempawah), Kalsel 153 sangat tidak sehat
  (Banjarbaru), Sumsel 67 (Musi 2 Palembang); Papsel dan Sultra di luar 10 besar = "< 67". Cuaca BMKG 23-25 Okt.
- Slide 1: kartu FIRESPOT (titik) + kolom firespot dengan panah vs 23 Okt; titik firespot kuning di peta. Slide 2: kolom FIRESPOT 24 Okt
  (`firespot_tabel.py`).

Bangun ulang (raw2 = normalkan.py atas tar di atas):
    python3 -I hitung_nasional.py && cp angka_nasional.json angka_21-24.json   # lalu firespot_23-24.json lewat firespot.py (muat, hitung)
    FIRESPOT=firespot_23-24.json node peta.mjs
    FIRESPOT=firespot_23-24.json python3 -I perbarui.py sumber-241026-cutoff-0700.pptx angka_21-24.json t1.pptx "24 Okt 2026, 15.00 WIB" "Angka 24 Okt sementara, data s.d. 15.00 WIB." peta-24okt.png
    python3 -I pil15.py t1.pptx t2.pptx
    python3 -I firespot_tabel.py t2.pptx firespot_23-24.json "Laporan Penanganan Pengendalian Karhutla 241026 data 24 Okt sementara.pptx"
