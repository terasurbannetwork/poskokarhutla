# Model bertingkat wilayah: kecamatan, kabupaten, provinsi, nasional

23 Okt 2026, didaftarkan dan di-commit SEBELUM dijalankan. Permintaan pemilik: konstanta, variabel, dan tren jangan
memakai angka Indonesia secara umum; belajar dari unit terkecil sampai provinsi, dengan koreksi per daerah.

## Masalah yang dijawab

Uji balik 23 Okt menunjukkan ramalan lama kebakaran dari riwayat jendela ~16 km KALAH dari median nasional
(`riwayat_sel_uji.json`). Sebabnya: per jendela datanya sedikit (median beberapa episode), jadi angkanya goyang.
Memakai angka nasional untuk semua daerah juga salah, karena gambut Kalteng berbeda dengan sabana NTT.

## Cara: partial pooling (empirical Bayes), dari kecil ke besar

Untuk setiap besaran B (lama episode, akhir musim, laju dasar, kalibrasi peluang), taksiran di unit u dengan
induk par(u):

```
B_u = (n_u * Bmentah_u + k * B_par(u)) / (n_u + k)
nasional -> provinsi -> kabupaten -> kecamatan -> jendela ~16 km
```

- n_u = jumlah episode (atau tahun) di unit itu. Makin banyak data lokal, makin besar bobot lokal; unit tanpa data
  memakai induknya. k (kekuatan tarikan ke induk) dipilih per tingkat dengan validasi silang HANYA di tahun latih
  (tahun sebelum musim uji), tidak pernah dengan musim uji.
- Lama episode diolah dalam log (sebaran miring), lalu dikembalikan ke hari.
- Unit wilayah = kecamatan/kabupaten/provinsi tempat pusat jendela (`scripts/data/wilayah.py`, batas Kemendagri).

## Besaran yang diuji dan syarat lolos

| Besaran | Pembanding | Lolos bila |
| ------- | ---------- | ---------- |
| Lama episode (umur 3 dan 7 hari) | median nasional, jendela mentah | MAE bertingkat < median nasional dengan batas atas selang 95% bootstrap blok jendela < 0 di KEDUA umur |
| Akhir musim | median nasional, jendela mentah | MAE bertingkat < jendela mentah, batas atas selang < 0 |

- Musim uji sama dengan sebelumnya (2019, 2023), data latih hanya sebelum 1 Januari musim uji.
- Dilaporkan juga per provinsi: tingkat mana yang menang di mana.
- Lolos = boleh tampil di laci dengan nama tingkatnya ("menurut pola Kab. X"); gagal = tidak tampil, ditulis.

## Kalibrasi peluang "membesar" per wilayah (model lolos)

Peluang model dikoreksi per provinsi lalu kabupaten (Platt bertingkat, intersep per unit ditarik ke induk dengan k
yang sama caranya). Diuji dengan tinggalkan-satu-tahun di prediksi luar-lipatan 2015-2023. Lolos bila galat
kalibrasi (ECE) per provinsi turun di mayoritas provinsi dan Brier skill tidak turun di provinsi mana pun dengan
>= 300 api. Himpunan 2024-2026 TIDAK dipakai di sini (sudah dicadangkan untuk uji skor prioritas v2).

## Tren per wilayah

Seri tahunan MODIS 2003-2025 dan VIIRS 2012-2025 per kecamatan, kabupaten, dan provinsi (bukan hanya jendela dan
desa). Aturan tren sama (>= 30 titik di dua blok 10 tahun). Ini deskriptif, tidak ada klaim ramalan.
