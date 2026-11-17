# RENCANA-UJI

| Kriteria | Perintah bukti |
| --- | --- |
| Self-check pipeline lulus termasuk GEL, CEX, titik ke kab, aturan baru | `python3 scripts/prediksi/catat.py uji`, `nilai.py uji`, `terbit.py uji`, `tangga.py uji` |
| Titik pelabuhan di laut masuk kab terdekat <= 25 km, titik jauh dibuang | kasus di `catat.py uji` |
| Arsip tetap append-only | `catat.py uji` (jalan ulang tidak menimpa) |
| Fungsi layar murni: level sel, urutan, angka pil | `node --test tests/prediksi/prediksi.test.mjs` |
| Gerbang repo hijau (kartu standar, token warna, tanpa kesimpulan, tipografi) | `npm run uji:agen` |
| Layar tampil tanpa galat konsol, tabel, Perlu tindakan, pop-up, peta | tinjau di `http://localhost:8800/prediksi` |
| Klik pil/segmen tidak membekukan layar | pemeriksa `inp-reviewer` |
| Angka di layar | pemeriksa `selera-angka` |
