# Paparan Karhutla Provinsi Jambi 251026 (deck uji peta 3D dan slot foto)

Deck uji keputusan pemilik 25 Okt 2026 (Buku Pegangan, Selera presentasi > Komponen > Peta dan Slot foto): peta provinsi 3D
yang dimiringkan dan slot foto, dipasang di pembangun paparan wilayah Jambi 241026. Cut-off 25 Okt 2026 23.30 WIB, angka 25 Okt sementara,
jendela 18–25 Okt. Dua slide: provinsi (peta 3D + slot foto) dan banjir/longsor 26–28 Okt. Slide 2–3 paparan 24 Okt dibuang karena ceritanya
Kumpeh/Muaro Jambi, sedangkan 25 Okt Muaro Jambi 0 titik dan tidak ada cluster Prioritas.

Komponen bersama (dipakai deck lain):

- `../generator/peta3d.py`: tiap kabupaten freeform native bernama `Kabupaten - <Nama>`, tinggi x0,8, tiga lapis sisi slate, bayangan kabur
  (SVG, dirender `render.mjs`). Uji: `python3 ../generator/peta3d.py`.
- `../generator/foto.py`: slot foto membulat, potong cover lewat `srcRect`, kredit 7 pt, pita keterangan navy. Uji: `python3 ../generator/foto.py`.

Beda dengan deck 24 Okt:

- Titik = lokasi unik 375 m per hari WIB, M + N + N20 + N21 sedang/tinggi, tanpa industri (`data.py` memakai `titik_unik`). Selisih 1–2
  titik per hari dengan `harian30.json` live ditoleransi di `angka.py`.
- Luas dan belum padam tidak diassert ke website: `peta_karhutla.json` live (25 Okt 14.30) masih faktor lama, sekitar 10% di atas
  `satelit.py` (faktor N20 4,12 / N21 4,16).
- Penanda cluster dan nomor tiga cluster teratas native, dengan garis penunjuk. Label memakai level sebenarnya (25 Okt: Siaga).
- Panel Kejadian dan status dibangun dari data; baris operasi WA 23 Okt dibuang. Sisa ruang panel diisi foto
  `data/kajian-bnpb/gambar/foto/mit-b10-pemadam.jpg` (DenY Krisbiyantoro, CC BY-SA 4.0, Sebangau 2019) bila tingginya >= 50 pt.
- PM2.5 masih angka BMKG 24 Okt 19.00, labelnya bertanggal.

Bangun ulang (data web ditarik dari situs live ke `web/`):

    for f in harian30 kluster_awal peta_karhutla peta_karhutla_kab; do curl -sf -o web/$f.json https://centurisk97.id/data/$f.json; done
    for f in status riwayat; do curl -sf -o web/banjir/$f.json https://centurisk97.id/banjir/data/$f.json; done
    python3 ../generator/satelit.py --tanggal 2026-10-25 --jam 23:30 --hari 8 --keluar satelit.json
    python3 data.py && python3 angka.py
    python3 buat.py ref/j.pptx keluar.pptx
