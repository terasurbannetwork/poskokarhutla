# Batasan dan tanya jawab

Halaman ini mencatat batasan peta karhutla dan menjawab pertanyaan yang paling sering muncul.

## Batasan

- Titik panas adalah deteksi satelit. Itu bukan luas terbakar dan bukan bukti api sedang menyala atau sudah berhenti. Layar tidak boleh dipakai untuk menyimpulkan keadaan dari tidak adanya titik.
- Titik berkeyakinan rendah ikut dihitung pada angka titik panas, tetapi luas terbakar, cluster, dan faktor insiden hanya memakai keyakinan nominal dan tinggi.
- Angka titik panas di sini tidak sama dengan SiPongi atau GIS BNPB. Jangan menjumlahkan atau menyamakannya.
- Pensiunnya satelit S-NPP pada 1 November 2026 mengubah hitungan satuan laporan. Jendela tiga hari penuh dengan satuan baru berlaku mulai 3 November 2026.
- Luas cluster hanya perkiraan dari piksel. Luas insiden terkoreksi hanya perkiraan perencanaan.
- Perkembangan api tidak bisa dilacak untuk insiden dengan kurang dari 20 piksel unik atau arsip kurang dari dua hari. Arsip baru ada sejak 1 Juli 2026. Pada saat uji, dari 54 insiden aktif hanya 3 yang cukup besar.
- Angka bangunan dekat api baru tersedia untuk sebagian provinsi. Nol terdeteksi bukan jaminan tidak ada bangunan.
- Peta ini tidak menyebut keadaan "bebas api". Hasil nol berarti tidak ada deteksi pada data yang tersedia, bukan kepastian.
- Siapa saja yang boleh membuka halaman utama dan tautan bagikan cluster belum terdokumentasi di satu tempat. Hubungi pengelola akun bila akses ditolak.
- Beberapa hal belum diputuskan pengelola Centurisk97 di BNPB, misalnya kriteria lulus uji perkembangan api dan apakah perkiraan titik awal boleh tampil publik. Sampai diputuskan, fitur terkait memakai bawaan sementara yang hati-hati.

## Pertanyaan umum

### Mengapa jumlah titik panas di sini berbeda dengan SiPongi?

Centurisk97 menghitung lokasi yang berbeda pada satu hari dan memakai semua satelit dan semua tingkat keyakinan. SiPongi dan GIS BNPB menghitung titik mentah. Dua cara ini wajar menghasilkan angka berbeda. Di dashboard tersedia angka setara SiPongi untuk membandingkan.

### Apakah luas terbakar di peta sama dengan luas resmi?

Tidak. Luas di peta adalah perkiraan dari satelit. Luas resmi berasal dari laporan KLHK dan BNPB, dan angka 129.899 hektare milik BNPB adalah luas yang dipadamkan, bukan luas terbakar.

### Kalau sebuah cluster berstatus "tidak terdeteksi", apakah apinya sudah padam?

Belum tentu. Awan, asap, atau jeda antar lintasan satelit bisa menutupi, dan bara di gambut dapat bertahan di bawah permukaan. Sistem baru menganggap api padam bila 48 jam tidak ada titik di lokasi itu, itu pun sebatas perkiraan.

### Mengapa ada cluster yang berlabel "Mungkin firespot, perlu dicek"?

Karena pola deteksinya dalam tiga hari belum cukup kuat untuk dianggap api nyata menurut metode Kemenhut. Statusnya dibatasi sampai status 1 sampai petugas atau pengamatan berikutnya mengonfirmasi.

### Apa arti tanda "hipotesis"?

Model itu belum lulus uji balik. Uji balik adalah mencocokkan hasil model dengan kejadian masa lalu yang sudah diketahui. Model berlabel hipotesis boleh dipakai sebagai bahan pertimbangan, tetapi belum terbukti cukup tepat untuk dijadikan satu-satunya dasar keputusan.

### Mengapa angka belum padam tidak boleh dijumlahkan antarhari?

Karena angkanya menggambarkan keadaan pada satu hari. Api yang sama terlihat di hari berikutnya sehingga akan terhitung berkali-kali bila dijumlahkan.

### Apa bedanya cluster dan insiden?

Cluster adalah kelompok titik panas yang berdekatan pada waktu tertentu. Insiden adalah cluster berstatus 2 ke atas yang diberi nomor tetap, sehingga api yang sama dapat diikuti dari hari ke hari walaupun bentuk clusternya berubah.

### Mengapa kartu perkembangan api dan bangunan dekat api belum muncul?

Perhitungannya sudah berjalan, tetapi tampilan kartunya belum dibangun. Penjelasan metodenya sudah ada di halaman [Prioritas provinsi dan insiden api](/docs/peta-karhutla/prioritas-insiden) supaya Anda tahu apa yang akan ditampilkan nanti.
