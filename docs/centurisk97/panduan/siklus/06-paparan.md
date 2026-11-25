# Paparan di zona bahaya

Halaman ini menjelaskan cara menghitung bangunan, fasilitas, dan jiwa yang berada di dalam zona bahaya.

## Paparan: bangunan, fasilitas, dan jiwa di dalam zona bahaya

Data yang dipakai: bangunan terdeteksi satelit oleh Google (Open Buildings, hanya yang keyakinannya minimal 0,70), jumlah penduduk per kecamatan dari WorldPop (peta penduduk berbasis satelit), data kependudukan (Dukcapil) per desa, dan batas zona bahaya. Kejadian aktif dihitung ulang tiap 3 jam.

1. Wilayah dibagi menjadi kotak-kotak bujur sangkar kecil (sekitar 110 meter). Satu kotak dianggap berada di dalam zona bila titik tengah kotak itu berada di dalam zona. Kotak yang menyilang batas zona tidak dibagi.
2. Zona bahaya: karhutla memakai lingkaran 1, 3, dan 5 km dari gugus titik panas aktif; banjir memakai bidang genangan kejadian; gempa memakai pita intensitas guncangan; gunung api memakai kawasan rawan bencana I, II, dan III.
3. Bangunan terpapar adalah jumlah bangunan di kotak-kotak yang berada di dalam zona.
4. Jiwa terpapar dihitung dari jumlah penduduk kecamatan dikali porsi bangunan kecamatan yang berada di zona. Cara ini dilakukan terpisah untuk WorldPop, Dukcapil, dan GHSL (peta penduduk dari Uni Eropa), sehingga ada tiga hasil.

Contoh: sebuah kecamatan berpenduduk 10.000 jiwa punya 2.000 bangunan, dan 600 di antaranya berada di zona. Jiwa terpapar menurut sumber itu adalah 10.000 kali 600 per 2.000, yaitu 3.000 jiwa. Bila tiga sumber menghasilkan 3.000, 3.032, dan 2.700, selisihnya 332 dan semuanya ditampilkan.

Contoh karhutla: kotak berjarak 0,9 km berisi 100 bangunan, 2,5 km berisi 200, 4,9 km berisi 300, dan 6 km berisi 400. Radius 1 km memuat 100 bangunan, radius 3 km memuat 300, radius 5 km memuat 600, dan kotak 6 km tidak dihitung.

Tingkat bahaya per kotak (untuk peta InaRISK) memakai nilai bahaya H: di bawah 0,33 berarti rendah, 0,33 sampai 0,66 sedang, di atas 0,66 tinggi, dan bila datanya tidak ada ditulis "tidak terliput". Batas ini belum punya sumber resmi.

Fasilitas vital (sekolah, fasilitas kesehatan, dan lainnya) dihitung per sumber data dan tidak dijumlahkan antarsumber. Contoh: 5 sekolah menurut Dapodik dan 3 menurut OSM ditulis "Dapodik 5, OSM 3, selisih 2", bukan 8.

Seberapa bisa dipercaya: semua angka paparan adalah perkiraan model. Satelit bisa salah mengenali bangunan, dan posisi punya galat sekitar 0,8 km pada kotak kasar serta sekitar 80 meter pada kotak halus 110 meter. Desa yang tidak punya batas wilayah dihampiri dengan titik pusat desa, sehingga ketelitiannya rendah.

## Perkiraan kerusakan bangunan dari satelit

Belum ada angka. Rencananya, bangunan yang terendam banjir diperkirakan dari citra radar satelit, lalu urutan kabupaten yang dihasilkan dibandingkan dengan urutan kerusakan menurut DIBI. Syarat lulusnya sudah dikunci sebelum citra dilihat, dan sampai sekarang belum ada hasil yang lulus: uji awal baru memakai sedikit pasangan kejadian sehingga belum cukup, uji gempa gagal, dan uji karhutla ditunda. Selama belum lulus, tidak ada angka bangunan rusak dari satelit.
