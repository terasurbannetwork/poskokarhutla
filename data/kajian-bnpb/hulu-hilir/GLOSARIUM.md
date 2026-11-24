# GLOSARIUM: Hulu ke hilir per kejadian

| Istilah | Arti di paket ini |
| --- | --- |
| Hulu ke hilir | Rangkaian keadaan dari bagian atas DAS (tutupan, lereng) ke bagian bawah (genangan, jalan, desa) untuk satu kejadian. Bukan model sebab akibat. |
| DAS | Daerah aliran sungai: semua sub-DAS HydroBASINS yang alirannya berakhir di titik keluaran yang dipilih (ALGORITMA 1). |
| Sub-DAS | Satu poligon HydroBASINS level 9; unit terkecil perhitungan. |
| Titik keluaran | Sub-DAS terbesar (sampai 25.000 km2) yang memuat pusat kecamatan di kabupaten itu; bukan titik banjir persis. |
| Hutan awal | Tutupan kanopi tahun 2000 paling sedikit 30 persen (Hansen). |
| Hutan hilang | Kehilangan kanopi dari hutan awal pada tahun tertentu, dari sebab apa pun (panen, kebakaran, longsor); pertumbuhan kembali tidak diukur. |
| Cuplikan | Satu dari empat piksel Hansen (sekitar 120 m); hasil dikali luas sel. Angka di bawah 10 ha tampil "~". |
| Lereng persen | 100 kali tangen sudut kemiringan (40 persen sama dengan 21,8 derajat), metode Horn 3x3. |
| GLO-30 | Copernicus DEM 30 m; model permukaan, bukan tanah. |
| DEMNAS | DEM nasional 8 m dari BIG; hanya audit di lembar yang ada. |
| Kelas lereng | di bawah 25, 25 sampai 40, di atas 40 persen, dan "tak terdata". |
| Zona | hulu (di atas 500 mdpl), tengah (50 sampai 500), hilir (di bawah 50), berdasarkan GLO-30. |
| Porsi hutan awal | Bagian hutan awal DAS yang berada di satu kelas; penyebut wajib untuk membaca porsi hilang. |
| Laju hilang | Hektare hilang di satu kelas dibagi hutan awal kelas itu, persen. |
| Sempadan | Koridor selebar 100 m di kiri dan kanan garis sungai (Q3); bukan sempadan menurut peraturan sebelum Q3 dijawab. |
| Berhutan, kritis, dibuka | Kelas sempadan (ALGORITMA 4); "kritis" berarti bukan hutan sejak 2000 atau hilang sebelum kejadian. |
| Label waktu | sebelum, tahun kejadian, sesudah, belum tercakup; hubungan tahun hilang dengan tahun mulai kejadian. |
| Alert hutan | Deteksi kehilangan tutupan bertanggal (GLAD-L, GLAD-S2, RADD); hanya memberi tanggal pada piksel yang Hansen sudah tandai. |
| IMERG | NASA GPM Integrated Multi-satellitE Retrievals, hujan satelit 30 menit (mm per jam) dan harian; koleksi Final, Late, atau Early. |
| CHIRPS | Climate Hazards Group InfraRed Precipitation with Station data, hujan harian dan bulanan 0,05 derajat sejak 1981. |
| Puncak | Laju hujan rata-rata DAS terbesar pada satu slot 30 menit (mm per jam); beda dari puncak sel. |
| Mulai naik | Slot pertama saat laju rata-rata DAS paling sedikit 5 mm per jam selama dua slot (Q10). |
| Peringkat | Urutan nilai tahun kejadian di antara tahun dasar sampai satu tahun sebelumnya: "tertinggi dari n tahun" atau "peringkat k dari n". |
| GFM | Copernicus Global Flood Monitoring, genangan dari radar Sentinel-1; sumber genangan kita (paket genangan-satelit). |
| UNOSAT, Charter | Produk peta genangan resmi dari pihak lain; berdampingan dengan GFM, tidak dijumlah. |
| Kesepakatan | Irisan dibagi gabungan antara dua peta genangan pada kisi 110 m; bukan akurasi. |
| Zona genangan | Bagian genangan yang jatuh di tiap zona elevasi. |
| Desa tergenang (any, 10) | Jumlah desa dengan paling sedikit satu sel tergenang, dan jumlah desa dengan paling sedikit 10 persen luas tergenang. |
| Jalan tergenang | Panjang potongan 50 m segmen jalan yang titik tengahnya di sel tergenang; perkiraan. |
| Indeks bahaya | Raster InaRISK 0 sampai 1 per jenis bahaya; kelas rendah, sedang, tinggi; bukan kedalaman genangan. |
| Lift | Porsi sel tergenang di kelas tinggi dibagi porsi sel kering di kelas tinggi. |
| Hipotesis | Label sampai ada vonis uji; dicabut hanya oleh vonis lulus (HH-11). |
| Keadaan, bukan sebab | Prinsip kalimat paket ini: menyatakan di mana dan seberapa, tidak menyatakan mengapa. |
| Replikasi lunak | Menghitung ulang kejadian rujukan dengan rancangan kita dan melaporkan selisih tanpa menyetel apa pun. |
| Bekas longsor | Objek perubahan dari citra Sentinel-2: tutupan turun tajam, tanah terbuka, lereng di atas ambang; perkiraan dari citra, bukan batas longsor resmi. |
| Komposit | Median per piksel dari adegan Sentinel-2 bersih dalam satu jendela tanggal; piksel awan dan bayangan (SCL) dibuang. |
| Tak teramati | Piksel dengan adegan bersih terlalu sedikit; bukan "tidak ada longsor". |
| Hutan utuh, lahan terbuka | Golongan tutupan sebelum kejadian untuk tiap bekas longsor (ALGORITMA 12). |
| Perubahan antara dua tanggal | Label hasil bila jendela citra lebar; tidak dikaitkan ke kejadian. |
| Tahun kejadian di longsor | Label K6 untuk hutan Hansen tahun Y yang hilang di dalam bekas longsor kejadian; bukan "sebelum" dan bukan "dibuka manusia". |
| Pelebaran alur | Selisih luas tanah terbuka bukan air di koridor sungai antara komposit sebelum dan sesudah. |
| Inventaris manual | Digitasi visual bekas longsor oleh pemilik atau staf di satu kotak kecil, dipakai untuk kalibrasi dan uji ambang. |
