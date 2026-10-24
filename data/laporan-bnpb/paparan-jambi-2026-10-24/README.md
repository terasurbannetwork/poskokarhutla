# Paparan Karhutla Provinsi Jambi 241026

Per 24 Oktober, cut-off 24 Okt 2026 24.00 WIB (hari 24 Okt penuh), jendela 17–24 Okt. Templat: deck pemilik
"Paparan Karhutla Jawa Timur - Malang - Arjuno 231026.pptx" (`ref/j.pptx`); slide 1–3 ikut pola paparan Lampung 241026, slide 4 = slide
banjir peralihan musim templat Jatim. Empat slide: provinsi, Kab. Muaro Jambi, gambut Kumpeh–Sadu, banjir dan longsor 25–27 Okt.

Sumber angka (semua titik, luas, belum padam = data kita):

- Provinsi, kabupaten, kecamatan: `satelit.json` = `generator/satelit.py --tanggal 2026-10-24 --jam 23:59 --hari 8` (mesin website).
  17–23 Okt diassert sama dengan `peta_karhutla*.json` website, titik sama dengan `harian30.json` (`angka.py`).
- Peta titik: CSV FIRMS mentah `generator/cache/raw` (`data.py`, jumlah per hari diassert = website). Batas TN Berbak tidak dipakai
  (OSM tak tersedia saat dibuat), kawasan = kecamatan Kumpeh, Kumpeh Ulu, Sadu, Berbak.
- Cluster: `kluster_awal.json` website. Banjir: `web/banjir/status.json` (status deterministik 24–27 Okt per kecamatan),
  `riwayat.json` (DIBI BNPB 2008–2025).
- Fakta lapangan non-luas: WA Laporan Penanganan Karhutla 24 Okt (operasi 23 Okt), WA BMKG 24 Okt 19.00 (PM2.5), Laporan Harian
  Dit. Koordalops 24 Okt (Siaga Darurat Prov. Jambi, prakiraan BMKG).

Bangun ulang:

    python3 ../generator/satelit.py --tanggal 2026-10-24 --jam 23:59 --hari 8 --keluar satelit.json
    python3 data.py && python3 angka.py && python3 peta.py && node ikon.mjs
    node render.mjs peta-jambi.svg peta-jambi.png peta-kawasan.svg peta-kawasan.png
    python3 buat.py ref/j.pptx keluar.pptx

`buat.py` menolak titik tengah, em dash, angka luas lapangan Satgas, dan sisa teks templat Jatim.
