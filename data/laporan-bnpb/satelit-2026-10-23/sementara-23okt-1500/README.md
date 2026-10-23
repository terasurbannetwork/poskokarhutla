# Deck 231026 versi cut-off 23 Okt 15.00 WIB (data 23 Okt sementara)

Permintaan pemilik 23 Okt siang: "Buat cut off 15.00 WIB". Kolom 21/22/23 Okt dengan hari 23 Okt yang belum lengkap, pola sama dengan
`../../satelit-2026-10-22/sementara-22okt-1625/`.

- Website belum menerbitkan luas 23 Okt, jadi angka dihitung dari FIRMS mentah: `firms-raw-15-23okt-1458.tar.gz` = tarikan 22 Okt 16.25
  (UTC 15-20) ditambah UTC 21, 22, 23 Okt yang ditarik ulang 23 Okt 14.58 WIB. `hitung_nasional.py`: `CUT = 23 Okt 15.00 WIB`,
  `HARI = 20-23 Okt`. Hari 22 Okt hasil hitung ulang = website (24.328 titik, 51.057 vs 51.055 ha, 26.373 ha belum padam).
- `ganti.py`: kolom 21/22/23, judul 23 Oktober, "api 21 Okt telah padam pada 23 Okt", cut-off 15.00 WIB.
- `koordalops.py`: posisi baris pil PM2.5 dan cuaca mengikuti urutan hotspot 23 Okt (Kalteng, Kalsel, Sumsel, Kalbar, Kaltim, Papsel).
  Slide operasi tetap data 22 Okt (laporan WA 23 Okt).
- `sementara.py`: catatan kaki "Angka 23 Okt sementara, data s.d. 15.00 WIB."

Belum masuk pada 15.00 WIB: lintasan siang-sore sesudah sekitar 13 WIB dan seluruh lintasan malam 23 Okt. Indonesia timur paling rendah
(Papua Selatan 384 titik vs 1.169 pada 22 Okt), dan "telah padam" di subjudul terlalu besar karena lokasi yang belum terlihat lagi
dianggap padam.

Bangun ulang: ekstrak tar ke `raw2/`, `python3 -I hitung_nasional.py`, `cp angka_nasional.json angka.json`, lalu urutan di
`../README.md` dengan `koordalops.py` ke `t2.pptx` dan `python3 -I sementara.py t2.pptx <keluar> "Angka 23 Okt sementara, data s.d. 15.00 WIB."`.
