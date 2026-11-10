# ALUR: Tangga Peringatan

## Alur data

1. Workflow lain menyegarkan masukan (`iklim_bmkg.py`, `peringatan_bmkg.py`, sepekan, factsheet, kab10, nowcast, petir, Himawari, `terbit.py`).
2. `scripts/prediksi/tangga.py` membaca semuanya. Berkas hilang, rusak, atau basah melewati batas basi: dicatat di `gagal`, anak tangganya kosong, kode lain jalan terus.
3. Pernyataan disimpan di tingkat cakupannya (nasional, provinsi, kabupaten); sinyal dihitung per kabupaten dari pernyataan BMKG yang berlaku.
4. `tangga.json` ditulis atomik (berkas sementara lalu ganti). Bila hasil kosong sama sekali dan berkas lama ada, berkas lama dipertahankan.
5. Satu baris arsip hari itu ditambahkan bila belum ada.
6. `jalan.py giliran` memanggil `tangga.py` lebih dulu, sebelum langkah Overpass yang sering lambat; kegagalannya tidak menggagalkan `jalan.py`.

## Alur staf di layar

1. Buka `/prediksi`, tab Tangga.
2. Pilih provinsi, lalu kabupaten (bisa juga dari daftar "menguat" di atas).
3. Baca tangga dari atas (musim) ke bawah (jam). Di tiap anak tangga: kolom Kering di kiri, kolom Basah di kanan.
4. Baca pil sinyal di kepala kolom: "menguat" bila skala yang lebih dekat menyatakan peringkat lebih tinggi dengan cakupan sama; "searah" bila sama atau lebih tinggi tetapi datar atau cakupan beda; "belum selaras" bila dua skala bercakupan sama berselisih dua peringkat atau lebih. Pil "sinyal belum diuji balik" selalu menyertai. Klik "Aturan" untuk membaca definisinya.
5. Lembaga ditampilkan terpisah: BMKG dan Centurisk97 (prediksi kita) tidak pernah digabung.

## Keadaan

| Keadaan | Tampilan |
| --- | --- |
| `tangga.json` belum ada | "Data tangga belum tersedia." |
| Sumber anak tangga gagal atau basi | "Belum ada data" dan alasan singkat |
| Sumber ada, kabupaten/provinsi tidak disebut | "Tidak disebut dalam pernyataan ini" |
| Pernyataan tingkat provinsi | pil "tingkat provinsi" |
| Pernyataan nasional | pil "tingkat nasional" |
