# Ikhtisar pipeline karhutla

Modul ini adalah mesin data karhutla Centurisk97 yang mengubah deteksi satelit menjadi berkas JSON untuk layar peta, laporan harian, dan Worker.

## Ringkasan

Modul ini adalah mesin data karhutla Centurisk97. Tugasnya mengubah deteksi satelit (titik panas) dan lapisan lahan menjadi berkas JSON di `public/data/` yang dibaca layar peta, laporan harian, dan Worker. Isinya meliputi:

- hitungan titik panas per hari dan per wilayah (angka utama, satu definisi untuk semua layar);
- pengelompokan titik menjadi kompleks api, penilaian firespot, status taktis, dan insiden berumur panjang;
- perkiraan luas terbakar, "belum padam", dan "padam" per provinsi dan kabupaten;
- indeks cuaca kebakaran (FWI), estimasi bara gambut, irisan dengan areal konsesi dan Kesatuan Hidrologis Gambut (KHG);
- aturan Prioritas provinsi dari kajian ambang hotspot;
- satu lab yang masih berupa rancangan: kedalaman gambut hilang dari InSAR.

Masalah yang dijawab: satu angka "titik panas" harus bisa dipertanggungjawabkan, tidak menghitung api yang sama dua kali, dan tetap berlaku ketika satelit berganti (S-NPP berhenti didistribusikan FIRMS pada 1 November 2026, 13.00 UTC). Angka Centurisk97 sengaja tidak sama dengan angka SiPongi atau GIS BNPB (titik mentah); selisihnya dijelaskan di halaman metode, mulai dari [Sumber deteksi dan angka utama](/docs/pengembang/data-karhutla/sumber-titik).

Pengguna:

- warga dan media membaca peta utama, pemilih tanggal, dan pop-up kompleks;
- BPBD dan staf BNPB memakai kompleks api, insiden, luas terbakar, belum padam, dan Prioritas provinsi untuk menyiapkan laporan dan pengerahan;
- pimpinan membaca ringkasan yang dibangun dari angka yang sama;
- pengembang dan instansi lain membaca berkas JSON dan `/api/titik`.

Semua model di modul ini diberi status uji balik di halaman metode, mulai dari [Sumber deteksi dan angka utama](/docs/pengembang/data-karhutla/sumber-titik). Model yang belum lulus uji ditulis sebagai HIPOTESIS dan tampil dengan label itu di layar.

![Alur data karhutla: lahan statis, data cuaca, dan NASA FIRMS masuk ke pipeline Python, hasilnya berupa berkas JSON di public/data yang dibaca layar; Worker dan D1 menjawab /api/titik dari FIRMS secara terpisah.](gambar/pipeline-karhutla-alur-data.svg)

## Panduan pengguna

Halaman yang disebut di bawah memuat berkas statis dari `public/data/` dan tidak mewajibkan masuk (login). Pengecualian dicatat pada tiap subbagian. Aturan akses halaman lain di luar modul ini tidak diuraikan di sini.

### Peta utama karhutla (`/`) dan angka titik panas

Akses: publik.

1. Buka `https://centurisk97.id/`. Peta menampilkan titik panas 7 hari terakhir dari `hotspot.json`, lengkap dengan warna menurut keyakinan.
2. Angka titik panas di kartu dan ringkasan adalah jumlah lokasi unik per hari kalender WIB (00.00 sampai 23.59). Satu lokasi adalah satu kotak sekitar 375 m. Kotak yang dilihat beberapa satelit atau beberapa lintasan pada hari yang sama dihitung satu kali.
3. Titik berkeyakinan rendah tetap digambar dan ikut dihitung sejak 28 Oktober 2026. Luas terbakar dan pembentukan kompleks tetap memakai titik berkeyakinan nominal dan tinggi saja.
4. Klik titik atau kompleks untuk membuka pop-up.

Arti angka dan label:

- **Titik panas (hotspot)**: piksel satelit yang jauh lebih panas daripada sekitarnya. Satu titik bukan satu hektare terbakar.
- **Angka platform** berbeda dari SiPongi dan GIS BNPB karena definisinya lokasi unik, memuat empat satelit, dan semua tingkat keyakinan.
- Kata resmi yang dipakai layar adalah "titik panas". Istilah lain untuk hotspot hanya boleh muncul sebagai kutipan istilah resmi (dijaga `tests/agen/gerbang-istilah-titik-api.test.mjs`).

Sering disalahpahami:

- Hari tanpa titik panas belum tentu hari tanpa api. Awan, asap tebal, dan jeda antar lintasan dapat menutupi api, terutama bara gambut.
- Hari dengan lintasan satelit yang hilang di FIRMS (disebut "celah") memberi angka terlalu rendah dan tidak dikoreksi; layar menandai hari itu.
- Angka sesudah 2 November 2026 tidak memuat S-NPP. Perbandingan lintas tahun harus setara sensor (lihat [Sumber deteksi dan angka utama](/docs/pengembang/data-karhutla/sumber-titik), bagian S-NPP).

### Pilih tanggal (arsip titik per hari)

Akses: publik. Sumber: `public/data/titik_hari/`.

1. Di peta utama buka pemilih tanggal ("Pilih tanggal").
2. Tiap sel hari memuat jumlah titik panas nasional hari itu. Yang bisa dibuka: 7 hari terakhir dan hari yang memuat sedikitnya 1.000 lokasi unik (`AMBANG` di `scripts/data/titik_hari.py:26`).
3. Bagian "Terbanyak 2026" menampilkan hari dengan titik terbanyak.
4. Hari yang tidak berarsip tampil nonaktif dengan keterangan "tidak tersedia", bukan berangka 0.

### Kompleks api dan firespot (pop-up kompleks, tautan `/k/K0001`)

Akses: publik.

1. Klik kompleks di peta, atau buka tautan `/k/<id>`. ID `K0001` dan seterusnya dinomori ulang tiap putaran, jadi bukan identitas api yang stabil. Untuk identitas stabil pakai ID insiden (subbagian berikut).
2. Pop-up memuat jumlah titik, titik 24 jam, hari bertahan, status taktis, kelas FWI, dan klasifikasi firespot (`ya` atau `mungkin`).
3. Status taktis memiliki empat tingkat: Pencegahan rutin, Patroli terpadu, Siaga pemadaman awal, Prioritas pemadaman (`scripts/data/aturan.py:20`). "Tanggap darurat" adalah status hukum bupati atau gubernur dan tidak pernah diberikan model.
4. Firespot `mungkin` membatasi status paling tinggi pada "Patroli terpadu" sampai ada cek lapangan.

Sering disalahpahami: kompleks yang tidak terdeteksi 24 jam tidak otomatis padam. Batas aktif 72 jam, dan di gambut kering 168 jam.

### Insiden api (pop-up insiden)

Akses: publik. Sumber: `insiden.json` dan, untuk bagian yang lebih kaya, `public/data/progresi/`.

1. Insiden adalah kompleks tingkat 2 ke atas yang dilacak lintas putaran dengan ID stabil, berbentuk `<kode provinsi>-<yymmdd WIB>-<urut 3 digit>`.
2. Pop-up memuat front terbaru, titik masuk terdekat (garis lurus, bukan rute), radius ketidakpastian, luas koreksi, dan tren.
3. Status "tak terdeteksi" berarti tidak ada deteksi baru. Itu bukan pernyataan padam. Penutupan resmi hanya dari laporan.
4. Perkembangan per hari (garis depan 14.00 WIB, laju, lompatan, perkiraan titik awal) berlabel HIPOTESIS karena uji tahan belum lulus (lihat [Insiden dan luas terbakar](/docs/pengembang/data-karhutla/insiden-luas)).
5. Perkiraan titik awal hanya berupa lingkaran galat, tanpa pernyataan tentang sebab atau pihak.
