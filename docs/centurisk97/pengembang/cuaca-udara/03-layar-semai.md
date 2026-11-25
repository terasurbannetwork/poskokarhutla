# Layar peluang semai

Halaman ini menjelaskan seksi Peluang semai di halaman Operasi.

## Seksi Peluang semai (`/operasi#semai`)

- **Jalur dan akses**: seksi di halaman Operasi Udara `https://centurisk97.id/operasi#semai`. Berkas prakiraan dilayani `GET /api/operasi/semai/berkas/*` dan hanya dapat dibaca akun moderator, staf berperan `udara`, `pusdalops`, `koordalops`, `pimpinan`, `tmc` (`src/operasi_udara.js:12`, `src/operasi_semai.js:15-21`). Tanpa hak itu, layar menulis "hanya untuk akun staf berperan".
- **Tampilan**: tombol peran memuat Pos komando (aktif), Tinjau BMKG, dan Mitra (dua terakhir dinonaktifkan di layar saat ini; lihat Batasan).

Langkah pakai (Pos komando):

1. Buka seksi. Bilah sumber menampilkan jumlah piksel VIIRS dan satelit yang masuk, putaran ECMWF IFS yang dipakai, dan umur data. Pita kuning muncul bila titik api lebih tua dari 6 jam atau berkas prakiraan lebih tua dari 13 jam.
2. Geser bilah jam atau tekan putar. Bilah berhenti di langkah model (kelipatan 3 jam). Lapisan peta: titik api (merah di atas 40 MW, oranye di bawahnya), awan layak semai, prakiraan asap, angin pengarah 850 sampai 700 hPa, angin asap, zona, kota dan base. Kotak Lapisan dapat digeser lewat kepalanya.
3. Kartu **Rekomendasi** menampilkan zona teratas: provinsi atau kota terdekat, skor 0 sampai 1, jendela terbang jam setempat, koordinat derajat-menit-detik dan desimal (klik untuk menyalin), alasan (C kualitas awan, F daya api, T jarak kota, B base), ketinggian, bahan, dan perkiraan jumlah.
4. Kartu **Zona usulan 24 jam** memuat sampai lima zona A sampai E; klik baris memindahkan peta dan bilah jam. Pil "hati-hati" menandai MUCAPE sangat tinggi; pil "sudah target" menandai zona yang sudah dijadikan target renlap.
5. Kartu **Peringatan asap**: hijau bila asap tidak menyeberang ke negara lain dalam 24 jam; merah bila menyeberang, disertai kota di bawah asap dengan status "sudah berasap" atau "tiba +N jam", tingkat, asal cluster, dan arah datang.
6. **Jadikan target renlap** (peran `pusdalops`, `tmc`, atau moderator): dialog meminta base, tanggal renlap, dan catatan; koordinat, skor, dan jendela diambil server dari arsip putaran, bukan dari isian. Tombol **Renlap OMC** membuka `/renlap-omc?zona=...`: peta rute, sasaran, ketinggian, bahan, jumlah, tabel leg dan check point, serta unduhan KML dan GPX.
7. Tombol **Salin ringkasan** menyalin ringkasan teks Pos komando untuk ditempel ke WA.
8. Kartu **Cluster aktif** (tabel cluster api besar dengan provinsi, piksel, daya api, terakhir terlihat, zona terbaik), serta kartu lipat **Cara memutuskan** dan **Yang tidak terlihat satelit dan model**.

Arti angka dan label:

- **Skor**: rerata geometris gerbang kelayakan dengan tiga faktor; skor di bawah 0,35 tidak ditampilkan sebagai zona. Selisih skor kurang dari 0,02 tidak boleh disebut "lebih baik".
- **Jendela terbang**: blok jam siang berurutan dengan skor paling sedikit 85% dari puncak, dipotong ke 07.00 sampai 16.00 waktu setempat provinsi.
- **Base**: bandara terdekat (garis lurus) dari gabungan base terdaftar dan 136 bandara BMKG; label "bandara, bukan base terdaftar" bila bukan base terdaftar. Menit terbang adalah perkiraan pada 300 km/jam dibulatkan ke 5 menit.
- **Ketinggian**: dasar awan perkiraan dalam kaki, kelipatan 500; "dasar awan tidak terbaca model" bila di luar 300 sampai 3.000 m.
- **Bahan**: "NaCl", atau "dry ice dulu untuk memecah inversi, lalu NaCl" bila ada inversi dan beban asap sedang atau tinggi.
- **Jumlah**: sortie dihitung dari jendela dan menit terbang; muatan bahan tertulis "muatan armada belum diisi" karena belum diputuskan.
- Kalimat baku di layar: "awan layak semai", "usulan, konfirmasi BMKG". Layar tidak pernah menulis "akan hujan" atau "akan padam".

Keadaan kosong yang sah: "Tidak ada cluster api di atas N MW, belum perlu semai" (tidak ada api besar), "Tidak ada awan layak semai yang hanyut ke api dalam 24 jam ke depan", dan "Prakiraan belum tersedia. Putaran terakhir: ..." (`scripts/operasi/semai_murni.py:294-301`).
