# Kejadian, cek kabar, usulan langkah

Halaman ini menjelaskan cara sistem memilih kejadian, memeriksa kabar luar, dan menyusun usulan langkah.

Bagian ini menjelaskan dari mana angka di halaman-halaman di atas berasal. Rumusnya sederhana dan bisa Anda hitung sendiri dengan kalkulator.

## Menentukan kejadian yang tampil dan status selesainya

Data yang dipakai: catatan harian Pusdalops dan rekap WhatsApp Koordalops. Diperbarui setiap hari.

1. Sistem mengumpulkan semua kejadian per jenis bencana.
2. Sebuah kejadian ikut tampil bila mulainya masih dalam jendela waktu jenisnya, dan kabar terakhirnya tidak lebih tua dari batas senyap jenis itu.
3. Kejadian yang kabarnya lebih tua dari sepekan dikelompokkan terpisah sebagai "senyap" supaya tidak memanjangkan lama kejadian pekan ini.
4. Status selesai dibaca dari teks kondisi terakhir. Teks seperti "belum surut", "masih tergenang", atau "air naik" dihitung belum selesai. Teks seperti "sudah surut", "surut total", atau "kembali normal" dihitung selesai. Teks "mulai surut" atau "berangsur surut" tetap dihitung belum selesai. Bila ragu, hasilnya belum selesai.
5. Di layar, kejadian dikelompokkan per kabupaten/kota. Angka diambil dari kejadian terakhir yang mengisinya.

Dua istilah di tabel berikut: jendela mulai adalah seberapa jauh ke belakang sebuah kejadian boleh dimulai agar masih ditampilkan; batas senyap adalah berapa lama sebuah kejadian boleh tanpa kabar baru sebelum disembunyikan.

| Jenis | Jendela mulai | Batas senyap |
| --- | --- | --- |
| Banjir, longsor, karhutla | 30 hari | 30 hari |
| Gempa | 120 hari | 14 hari |
| Kekeringan | 120 hari | 30 hari |
| Gunung api | 120 hari | 30 hari |
| Cuaca, gelombang, kebakaran permukiman | 30 hari | 14 hari |

Contoh 1: kejadian banjir yang dimulai 20 hari lalu, dengan kabar terakhir 10 hari lalu yang berbunyi "belum surut", masih tampil sebagai belum selesai. Bila kabar terakhirnya 35 hari lalu, kejadian itu tidak tampil lagi.

Contoh 2: gempa yang dimulai 40 hari lalu (masih dalam jendela 120 hari) tetapi kabar terakhirnya 20 hari lalu tidak tampil, karena batas senyap gempa hanya 14 hari.

Seberapa bisa dipercaya: aturan membaca teks ini sederhana dan bisa meleset kalau kalimat laporannya tidak lazim. Karena itu, ketika ragu, sistem memilih "belum selesai".

## Cek kabar luar

Tujuan: untuk kejadian yang belum dilaporkan selesai, memeriksa apakah ada bukti dari luar laporan BPBD. Hasilnya tidak pernah menutup kejadian.

Data yang dipakai: berita yang dikumpulkan sistem, data banjir dan longsor per kecamatan, titik panas karhutla, indeks kekeringan, dan level gunung api dari PVMBG. Diperbarui setiap hari.

1. Sebuah artikel dianggap cocok bila menyebut kabupaten/kota yang sama dengan kejadian, terbit paling lambat satu hari sebelum kabar terakhir kejadian, dan memuat kata yang sesuai jenis bencananya.
2. Isi artikel dibaca untuk menentukan arahnya. Aturan ini dicek berurutan: pertama "masih", baru "pulih". Artikel "masih" bila membahas korban atau penanganan, atau memuat kata seperti masih, terendam, mengungsi, belum surut, belum padam, atau tanggap darurat. Artikel "pulih" bila memuat kata seperti kembali normal, warga kembali ke rumah, atau status darurat dicabut, dan tidak memuat kata "belum". Artikel yang tidak masuk keduanya diabaikan.
3. Sistem juga melihat data alam. Banjir dan longsor dianggap normal bila level peringatan tertinggi di antara semua kecamatan di kabupaten itu 1 atau kurang (level 1 berarti Waspada, yaitu tingkat paling ringan). Karhutla dilihat dari titik panas dua hari terakhir. Kekeringan dilihat dari indeks kekeringan. Gunung api dianggap aktif bila level resmi PVMBG 2 atau lebih. Cuaca, gempa, gelombang, dan kebakaran permukiman tidak punya data alam.
4. Label ditentukan. Bila ada berita pulih yang lebih baru daripada berita masih, labelnya Kemungkinan selesai. Bila ada berita masih, labelnya Masih berlangsung. Bila tidak ada berita, jumlah hari tanpa kabar sudah mencapai ambang, dan data alam normal, labelnya Kemungkinan selesai. Selain itu: Belum ada kabar luar. Ambang hari tanpa kabar (masih hipotesis awal): banjir 3 hari, longsor 7 hari, karhutla 3 hari, kekeringan 14 hari.
5. Setiap label membawa bukti (paling banyak lima artikel terbaru beserta media, tanggal, dan tautan), sehingga staf bisa memeriksa sendiri.

Contoh: kejadian banjir, kabar terakhir BPBD 4 hari lalu. Tidak ada artikel yang cocok, dan semua kecamatan di kabupaten itu berlevel 1 atau kurang. Karena 4 hari lebih dari ambang 3 hari dan data alam normal, labelnya Kemungkinan selesai, dengan dasar data alam.

Seberapa bisa dipercaya: belum diuji. Label harian disimpan agar kelak bisa dibandingkan dengan laporan selesai resmi, tetapi rapor ketepatannya belum ada. Pakai label ini hanya sebagai petunjuk siapa yang perlu ditanya.

## Menentukan siapa yang perlu ditanya

Sebuah kelompok kejadian masuk daftar Perlu ditanya bila belum selesai dan memenuhi salah satu syarat: kabar terakhir sudah berumur satu hari atau lebih, jumlah KK kosong, jumlah jiwa kosong, tinggi genangan kosong (untuk jenis yang punya tinggi), atau berlabel Kemungkinan selesai walau angkanya lengkap. Urutannya: label kabar luar dulu (Kemungkinan selesai, lalu Belum ada kabar luar, lalu Masih), kemudian hari tanpa kabar terpanjang, lalu umur kejadian.

## Peringatan dini per kabupaten/kota

Data yang dipakai: status peringatan banjir dan longsor per kecamatan dari prakiraan Centurisk97, diperbarui harian. Level Waspada bernilai 1, Siaga 2, dan Awas 3.

1. Untuk tiap kabupaten/kota, sistem mengambil level tertinggi di antara semua kecamatannya pada tiap hari.
2. Kabupaten/kota yang berlevel 2 atau lebih (Siaga atau Awas) pada salah satu hari dimasukkan ke daftar.
3. Urutan: level tertinggi dulu, lalu yang pekan ini sudah punya catatan kejadian, lalu hujan tiga hari terbanyak.

Contoh: kabupaten A punya tiga kecamatan dengan level 1, 1, dan 2 pada hari Selasa. Level tertingginya 2, jadi kabupaten A masuk daftar. Kabupaten B yang semua kecamatannya level 1 tidak masuk.

Level ini dipakai apa adanya, tidak dihitung ulang.

## Usulan langkah dan pencatatan tindak lanjut

Usulan langkah disusun per kabupaten/kota dengan prioritas: Terdampak belum surut, lalu Awas, lalu Siaga, lalu Pantauan khusus. Langkahnya hanya dari data yang ada:

1. Untuk daerah terdampak belum surut: penuhi kebutuhan dan atasi kendala menurut catatan piket; konfirmasi status surut ke BPBD bila laporan terakhir sudah lama; tuntaskan pendataan bila jumlah KK dan jiwa kosong.
2. Untuk daerah Awas dan Siaga: kecamatan berlevel tertinggi yang sudah punya posko diberi langkah "Posko", yang belum punya diberi "siapkan evakuasi"; kecamatan berlereng dengan level 2 atau lebih diberi "pantau lereng". Tenggat dihitung dari hari pertama level itu tercapai.
3. Pantauan khusus: kabupaten/kota berlevel 1 yang sepekan ini sudah surut.

Status tiap langkah (belum, proses, selesai) bisa diisi staf lewat tombol di tabel. Setiap perubahan tersimpan beserta riwayatnya dan tidak bisa dihapus. Satu pengisi dibatasi 120 perubahan per 10 menit, dan catatan paling banyak 300 huruf. Langkah yang sudah selesai tidak dibuka lagi otomatis keesokan harinya.
