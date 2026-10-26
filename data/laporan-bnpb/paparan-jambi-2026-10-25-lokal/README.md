# Paparan Karhutla Provinsi Jambi per 25 Okt 2026 (format paparan Lampung 241026)

Deck 4 slide mengikuti `Paparan Karhutla Provinsi Lampung 241026.pdf`: (1) Provinsi Jambi, (2) kabupaten dengan titik terbanyak
(Muaro Jambi), (3) Kawasan Berbak = TN Berbak + Tahura Orang Kayo Hitam, (4) kebutuhan pemadaman Kawasan Berbak.
Deck dibangun dari nol dengan python-pptx (`buat.py`); tidak ada templat yang disalin.

Sumber, semua dari aplikasi kecuali FIRMS mentah:
- Hari penuh: situs centurisk97.id/data (`harian30.json` titik, `peta_karhutla*.json` luas/belum padam).
- Hari sesudah hari terakhir situs (24 Okt dan 25 Okt s.d. cut-off): FIRMS 7 hari publik dihitung dengan metode situs di `data.py`.
  Uji di tiap bangun: FIRMS = situs untuk 19–23 Okt (luas, belum padam, titik) tanpa selisih.
- Kawasan Berbak: poligon `public/data/lahan/kawasan.geojson` no. 1229 (TN) dan 1232 (Tahura); seluruh deret kawasan dari FIRMS.
- Kompleks api `kluster.json`; kebutuhan sarpras = rumus `scripts/data/operasi.py` (target terkurung 3 hari, koefisien `operasi.json`);
  akses dan jarak air `kendala.json`; personel rekap BNPB harian di `operasi.json`; PM2.5 CAMS `udara_kualitas.json` (belum divalidasi).
- RTL di slide 4 adalah usulan dari angka model, bukan laporan lapangan. Tidak ada angka dari media.

Bangun (sesudah 06.00 WIB; lintasan VIIRS malam masuk FIRMS sekitar 3 jam sesudah lewat):

    ./bangun.sh 2026-10-25T06:00

Keluaran `Paparan Karhutla Provinsi Jambi 251026.pptx` dan `.pdf`. PDF = pratinjau Chrome dari shape pptx (`pratinjau.py`), font Roboto.
`./bangun.sh 2026-10-25T00:00 --tanpa-tarik` membangun draf per 24 Okt (hari penuh) dari data yang sudah ditarik.
