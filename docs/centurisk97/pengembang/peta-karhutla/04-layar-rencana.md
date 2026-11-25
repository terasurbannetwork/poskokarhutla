# Fitur yang belum ada di layar

Halaman ini mencatat tiga fitur yang baru berupa rancangan atau pipeline dan belum ada kartu atau halamannya di layar.

## Perkembangan api per insiden (belum ada di layar)

Rancangan di `data/kajian-bnpb/insiden-kaya/DESIGN-SYSTEM.md` dan `PRD.md`: dua kartu `.ex.ex-std` di laci cluster, "Perkembangan api" (deret pil hari, tabel, garis depan harian, perkiraan titik awal berlingkar galat, lompatan) dan "Bangunan dekat api" (dua angka kumulatif dan kini, luas atap, lingkaran 500 m). Pipeline penghasil data sudah ada, tetapi tidak ada kode layar yang membaca `public/data/progresi/` atau `insiden_bangunan.json` (pencarian di `public/` tidak menemukannya). Tiket layarnya IK-09 dan IK-10 di `data/kajian-bnpb/insiden-kaya/TIKET.md`.

## Desa Waspada (belum ada)

Rancangan: halaman `/desa-waspada` dengan dua daftar desa. Daftar A adalah desa dengan sedikitnya satu titik panas VIIRS dalam tujuh hari. Daftar B adalah desa tanpa titik minggu ini yang terbakar di sedikitnya 3 dari 14 tahun (2012 sampai 2025). Fitur yang dirancang: peluang kabupaten/kota tiga hari, porsi gambut, peta mini dengan satu pin per desa, filter, cari, urut, dan ekspor CSV yang dibuat di peramban. Sebelum pemilik menjawab Q1 (publik atau di balik sesi staf), halaman dan berkas datanya dibangun tetapi tidak diterbitkan lewat `public/.assetsignore`. Pengerja: `pipa-data` untuk mesin dan `layar-peta` untuk halaman. Tidak ada satu pun berkasnya di repo saat ini (`scripts/data/desa_waspada.py` dan `public/desa-waspada/` tidak ada).

## Alat gambar wilayah (belum ada)

Rancangan: satu tombol "Gambar wilayah" di kontrol peta untuk menggambar poligon, kotak, atau buffer (lingkaran atau kapsul dari garis) berjari-jari 1 sampai 50 km. Hasilnya kartu "Wilayah digambar": luas wilayah digambar, titik panas (lokasi unik per hari) untuk 24 jam, 3 hari, atau 7 hari, siang lawan malam, sel berdeteksi, luas citra insiden bila ada, serta desa dan kecamatan yang beririsan. Hitungan di peramban dari JSON publik, gambar tidak disimpan dan tidak masuk URL. Berkas yang dirancang (`public/alat_gambar*.js`, `tests/gambar/`) belum ada.
