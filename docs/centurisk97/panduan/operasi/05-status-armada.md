# Status armada, kelayakan, jangkauan

Halaman ini menjelaskan bagaimana status armada, kelayakan terbang, dan jangkauan pangkalan dihitung.

## Status armada dari laporan grup satgas

Data: pesan harian di grup percakapan satgas udara, masuk sepanjang hari.

1. Sistem membaca pesan dengan aturan tetap, yaitu mencari pola pada teks. Sistem tidak menebak dan tidak memakai kecerdasan buatan. Pesan yang tidak terbaca tidak ditebak dan tidak disimpan, sehingga staf perlu mengirim ulang atau mengisi manual. Tandanya: pangkalan tetap tampil "Belum lapor".
2. Sistem mencocokkan nomor registrasi pesawat (misalnya yang diawali PK- atau VH-) dan tanda panggil (nama sandi pesawat yang sudah terdaftar). Pesan yang memuat registrasi dan status pesawat bisa dibaca; pesan berisi cerita bebas tanpa keduanya tidak. Alasan tidak siap hanya diambil dari daftar tetap supaya teks bebas tidak membawa nama kru.
3. Tanggal operasi adalah tanggal yang tertulis di pesan bila wajar (tidak lewat besok WIB), selain itu tanggal pesan diterima.
4. Setiap pesawat mendapat satu status per hari: siap, beroperasi, siaga, atau tidak siap.
5. Bila staf mengisi manual, isian manual menang atas bot. Bila satu pesawat punya beberapa pesan pada hari yang sama, aturan pemilihannya belum terdokumentasi di kode; periksa statusnya di layar.

Contoh: sebuah pangkalan punya 4 armada, 3 berstatus siap atau siaga dan 1 belum melapor. Di layar tertulis 3 siap dan 1 "Belum lapor", bukan 1 tidak siap.

## Kelayakan terbang pangkalan

Data: laporan cuaca bandara (METAR) dari BMKG. Jadwal tarikan ke sistem belum terdokumentasi di kode.

1. Cari stasiun cuaca terdekat dalam 60 km dari pangkalan.
2. Bila laporannya lebih tua dari 3 jam, atau tidak ada stasiun, hasilnya "?" (Tanpa METAR atau METAR basi). Pangkalan seperti ini tidak pernah dianggap layak.
3. **Tidak layak** bila jarak pandang kurang dari 1.500 m, ada badai guntur, atau angin atau embusan di atas 30 knot.
4. **Terbatas** bila jarak pandang kurang dari 5.000 m, ada asap atau kabut asap, atau angin atau embusan di atas 20 knot.
5. Selain itu **Layak**.

Contoh: jarak pandang 3.000 m dan angin 12 knot menghasilkan "Terbatas". Ambang ini rancangan tim, bukan ketentuan resmi, dan belum diuji. Pakai sebagai bahan pertimbangan, bukan keputusan terbang.

## Jangkauan pangkalan dan celah

1. Jangkauan sebuah pangkalan adalah jarak jelajah terjauh armadanya (dalam mil laut dikali 1,852). Bila jarak jelajah belum diisi, dipakai 200 km.
2. Gugus api prioritas adalah gugus berlevel 3 ke atas (arti level 3 ada di daftar Perlu tindakan) yang punya titik panas dalam 24 jam terakhir.
3. Disebut **celah** bila tidak ada pangkalan berarmada yang jangkauannya mencakup gugus itu.

Karena jarak jelajah belum terisi untuk satu armada pun, yang berlaku saat ini 200 km di layar. Mesin usulan renlap memakai angka sendiri (lihat butir terakhir bagian berikut), sehingga dua angka jangkauan itu berbeda; keduanya sementara. Untuk perkiraan waktu tempuh dipakai kecepatan kasar 280 km per jam untuk pesawat sayap tetap dan 200 km per jam untuk helikopter. Angka ini sementara.
