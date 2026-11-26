# KEAMANAN-PRIVASI

| Data | Publik | Staf | Catatan |
| --- | --- | --- | --- |
| Status per kab per bahaya | ya | ya | hipotesis |
| Analisis nasional | ya | ya | tanpa data orang |
| Kelas bahaya per desa (50 teratas) | ya | ya | kelas InaRISK publik BNPB, bukan paparan |
| Keterpaparan per desa, fasilitas bernama | tidak | ya | induk D18 |
| Rekomendasi per pihak | tidak | ya | K1; katalog di Worker, bukan `public/` |
| Prakiraan BMKG per desa | ya | ya | data terbuka BMKG, atribusi wajib |
| ONI, IOD, debit | ya | ya | |

- Rute rekomendasi menolak tanpa sesi staf (401) dan peran lain (403); diuji.
- Rute BMKG: hanya kode kab 4 angka yang ada di daftar; tidak meneruskan URL bebas; tidak mencatat IP.
- Respons publik diperiksa daftar izin kolom, seperti `/status` induk.
- Atribusi BMKG, BNPB InaRISK, NOAA, Copernicus GloFAS, NASA ditulis di `/docs` sumber.
