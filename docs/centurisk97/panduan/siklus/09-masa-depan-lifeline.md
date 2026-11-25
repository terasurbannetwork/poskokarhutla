# Risiko masa depan dan Lifeline

Halaman ini menjelaskan cara menghitung risiko masa depan dan usulan status layanan dasar.

## Risiko masa depan

Data: proyeksi iklim harian dari banyak model iklim dunia (NEX-GDDP-CMIP6) pada kotak sekitar 27 km, dalam dua skenario emisi masa depan (SSP2-4.5 yang sedang dan SSP5-8.5 yang tinggi), data kenaikan muka laut dari laporan iklim IPCC, data bangunan GHSL, dan data hujan pengamatan CHIRPS sebagai pembanding.

1. Untuk tiap kotak dan tiap tahun, dihitung tiga indeks: hujan harian terbesar, hujan terbesar dalam lima hari berturut-turut, dan rentang hari kering terpanjang (hari dengan hujan di bawah 1 mm).
2. Perubahan adalah nilai pada horizon yang dilihat dikurangi nilai pada periode dasar 1995 sampai 2014, untuk model yang sama. Persen perubahan dihitung hanya bila nilai dasar lebih dari nol. Contoh: hujan harian terbesar pada masa dasar 120 mm dan pada horizon 138 mm berarti naik 18 mm, atau 15 persen.
3. Antarmodel diambil nilai tengah dan rentang yang memuat sekitar dua pertiga hasil model di bagian tengah (persentil ke-17 sampai ke-83). Rentang itu baru tampil bila ada minimal 5 model, dan dianggap andal mulai 10 model (angka 10 masih usulan).
4. Nilai kabupaten adalah rata-rata kotak yang titik tengahnya di dalam kabupaten. Bila tidak ada kotak di dalam, dipakai kotak yang terdekat dengan titik pusat kabupaten. Karena kotaknya kasar, ada kabupaten yang lebih kecil dari satu kotak.

Muka laut: nilai tengah global tahun 2050 adalah 0,20 m (rentang 0,17 sampai 0,26) pada SSP2-4.5 dan 0,23 m (0,20 sampai 0,29) pada SSP5-8.5, terhadap periode dasar. Angka ini global, tanpa penurunan muka tanah, dan bukan luas genangan.

Pertumbuhan bangunan di zona bahaya dihitung sebagai laju pertumbuhan per tahun (dihitung berbunga) antara dua tahun pengamatan. Indeks konsentrasi lebih dari 1 berarti pertumbuhan bangunan di zona melebihi porsi luas zona terhadap wilayahnya.

Seberapa bisa dipercaya: seluruhnya hipotesis dan belum pernah diuji terhadap kejadian lampau. Ini sinyal perubahan, bukan ramalan. Sebagian data (GHSL dan potongan per kabupaten) belum diproses penuh, sehingga nilainya "menunggu".

## Usulan status layanan dasar

Mesin hanya mengusulkan, dan staf yang menetapkan status resmi. Isyarat yang dipakai, dalam 24 jam terakhir dan hanya untuk kabupaten kejadian: laporan warga (listrik, sinyal, BBM, elpiji, akses, kesehatan), kendala dan kebutuhan di Logbook, kerusakan di meja dampak, dan catatan meja pengungsi (layar kerja staf untuk data pengungsi). Semua ambang berikut masih hipotesis.

| Layanan | Merah | Kuning | Hijau |
| --- | --- | --- | --- |
| Listrik, sinyal | lebih dari separuh pelapor menyebut padam, dan minimal 5 pelapor | minimal 3 pelapor gangguan, atau ada kendala di Logbook, atau unit rusak di meja dampak | minimal 3 pelapor menyebut hidup atau lancar sesudah gangguan terakhir |
| BBM | minimal 5 pelapor menyebut habis | minimal 3 pelapor menyebut terbatas atau habis, atau SPBU rusak | minimal 3 pelapor menyebut tersedia sesudah gangguan |
| Jalan dan akses | minimal 3 pelapor menyebut putus atau tertimbun | minimal 3 pelapor menyebut putus, tertimbun, atau tergenang, atau ada kendala akses di Logbook, atau jalan dan jembatan rusak di meja dampak | tidak diusulkan otomatis |
| Fasilitas kesehatan | tidak diusulkan | minimal 3 pelapor menyebut penuh, atau layanan rusak | tidak diusulkan |
| Air bersih, pangan | lebih dari separuh titik pengungsian terbuka tidak punya | minimal 1 titik tidak punya, atau ada kebutuhan air di Logbook, atau unit air rusak | semua titik terbuka punya dan datanya segar |
| Pengungsian | separuh atau lebih titik terbuka datanya basi lebih dari 3 hari | ada titik yang basi | semua titik terbuka diperbarui dalam 3 hari |

Contoh: 6 pelapor dalam 24 jam, 5 menyebut listrik padam dan 1 menyebut hidup. Lebih dari separuh menyebut padam dan pelapornya minimal 5, jadi usulannya merah. Bila hanya 2 pelapor, jumlahnya belum cukup dan usulannya abu.

Aturan tambahan: tanpa isyarat, usulannya abu. Banyak pelapor di balik satu sambungan internet (misalnya wifi posko) dihitung satu pelapor, sehingga usulan condong ke abu. Kuning dari Logbook atau meja dampak mengalahkan hijau; hijau dari warga mengalahkan kuning dari warga saja. Titik pengungsian yang datanya basi tidak pernah menghasilkan hijau. Data padam internet (IODA) hanya ditampilkan sebagai konteks provinsi, tidak pernah menjadi usulan per kabupaten, dan citra lampu malam satelit belum dipakai.

Seberapa bisa dipercaya: ambang di atas belum diuji. Rencana ujinya: sesudah 30 kejadian, usulan dibandingkan dengan status resmi, lalu dihitung berapa persen yang sama dan berapa persen sel yang resminya merah tetapi usulannya abu. Hasilnya belum ada, jadi pakai sebagai bahan pertimbangan.
