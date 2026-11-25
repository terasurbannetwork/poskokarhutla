# Cuaca 72 jam dan pantauan Himawari

Halaman ini menjelaskan cara status cuaca tiga hari per kecamatan dihitung, apa arti peringatan dini BMKG di layar, serta pantauan titik panas dan awan dari satelit Himawari.

## Status cuaca 72 jam per kecamatan

Data yang dipakai: prakiraan hujan dan angin dari layanan cuaca terbuka (kisi sekitar 25 km, diperbarui harian), prakiraan gabungan 51 skenario dari pusat cuaca Eropa (ECMWF; satu skenario adalah satu hasil hitungan model yang dimulai dari kondisi awal yang sedikit berbeda) untuk peluang hujan, tinggi gelombang di titik pesisir, serta peringatan dari BMKG.

1. Untuk tiap kecamatan, ambil hujan harian, embusan angin, dan tinggi gelombang tertinggi dalam 72 jam.
2. Bandingkan dengan tiga batas tiap bahaya (tabel di bawah). Tingkat bahaya adalah berapa batas yang terlewati, dari 0 sampai 3.
3. Untuk peluang hujan ekstrem, hitung berapa persen dari 51 skenario yang menunjukkan hujan besar. Hanya titik skenario sejauh 80 km atau kurang yang dipakai. Contoh: bila 25 dari 51 skenario menunjukkan hujan 50 mm atau lebih, peluangnya sekitar 49%, melewati 40%, sehingga tingkatnya Waspada.
4. Status kecamatan adalah tingkat bahaya yang paling tinggi dari keempatnya.

| Bahaya | Waspada | Siaga | Awas |
| ------ | ------- | ----- | ---- |
| Hujan harian | 50 mm | 100 mm | 150 mm |
| Embusan angin | 54 km/jam | 72 km/jam | 90 km/jam |
| Tinggi gelombang | 2,5 m | 4 m | 6 m |
| Peluang hujan ekstrem (persen skenario yang menunjukkan hujan melewati batas) | 40% skenario menunjukkan 50 mm atau lebih | 40% skenario menunjukkan 100 mm atau lebih | 70% skenario menunjukkan 100 mm atau lebih |

Contoh: sebuah kecamatan diprakirakan hujan 110 mm, embusan 60 km/jam, dan gelombang 1 m. Hujan mencapai Siaga (tingkat 2), angin Waspada (tingkat 1), gelombang Normal. Status kecamatan: Siaga.

Seberapa bisa dipercaya: status ini masih hipotesis. Uji balik, yaitu mencocokkan prakiraan masa lalu dengan kejadian yang sudah terjadi di catatan Pusdalops, menunjukkan hujan model belum terbukti lebih baik daripada kebiasaan kabupaten itu pada bulan yang sama. Pakai sebagai bahan pertimbangan, dan utamakan peringatan resmi BMKG. Kisi 25 km juga terlalu kasar untuk puting beliung atau sel badai kecil.

## Peringatan dini jangka sangat pendek dari BMKG

Peringatan jangka sangat pendek ini diambil dari BMKG tiap 10 menit, ditampilkan apa adanya beserta wilayah dan tingkat keparahannya. Peringatan hanya berlaku sekitar 2 sampai 3 jam, jadi panel kosong bukan berarti wilayah itu bebas bahaya. Bila BMKG tidak bisa dihubungi, data lama tetap tampil dengan jam terbit aslinya dan Centurisk97 tidak mengarang peringatan.

## Titik panas Himawari dan peringatan api baru

Satelit Himawari-9 memindai (memotret) wilayah Indonesia tiap 10 menit. Centurisk97 menarik datanya tiap 30 menit, dengan keterlambatan sekitar 1 jam. Ini jauh lebih sering daripada satelit titik panas lain. Sebuah titik ditandai "api baru" bila memenuhi semua syarat berikut:

1. Terdeteksi pada 2 pindaian atau lebih (satu pindaian adalah satu kali satelit memotret).
2. Deteksi terakhir paling lama 60 menit sebelum acuan (waktu pindaian terbaru yang dipakai saat dihitung), dan acuan tidak lebih tua dari 3 jam.
3. Tingkat keyakinan satelit 2 atau 3 (dari skala 1 sampai 3, makin tinggi makin yakin).
4. Tidak ada titik panas dari satelit lain yang lebih teliti (VIIRS, dengan keyakinan sedang atau tinggi) dalam 4 km selama 24 jam terakhir.
5. Berada di wilayah Indonesia.

Contoh: sebuah titik muncul di dua pindaian berturut-turut, tidak ada titik panas satelit lain dalam 4 km sejak kemarin, maka titik itu ditandai api baru.

Tiap penanda memberi alarm berjari-jari 2 km dan satu kabar ringkas ke Posko pusat. Kabar itu menyebut lokasinya masih perkiraan dalam radius 2 km dan meminta penerima menunggu deteksi VIIRS atau konfirmasi lapangan. Alarm berubah menjadi terkunci bila tugas api dibuat di dekatnya, dan hilang bila 6 jam tanpa pindaian baru. Lokasi bisa meleset sekitar 2 km.

## Awan dingin dan awan tumbuh cepat

Satelit Himawari membaca suhu puncak awan. Awan dingin berarti suhu puncak 235 K (sekitar minus 38 derajat Celsius) atau lebih rendah, dan sangat dingin bila 208 K (sekitar minus 65 derajat) atau lebih rendah. Awan tumbuh cepat dikenali dari dua pindaian berjarak 30 menit yang menunjukkan puncak awan mendingin paling sedikit 8 derajat dalam 30 menit. Ini analisis Centurisk97 berstatus hipotesis dan belum diuji terhadap hujan lebat; data lebih dari 6 jam dibuang dari layar.
