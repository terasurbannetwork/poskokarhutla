# Dari data mentah ke level 3 hari

Halaman ini menjelaskan dari mana angka prakiraan tiga hari berasal sampai menjadi level Normal, Waspada, Siaga, atau Awas.

Bagian ini menjelaskan dari mana angka di layar berasal. Tiap topik dimulai dengan ringkasan singkat; yang ingin tahu hitungan lengkapnya bisa membaca bagian "Rincian".


## Prakiraan 3 hari: dari data mentah ke level

**Ringkasannya.** Setiap pagi sistem mengambil prakiraan cuaca, gelombang, angin, dan kualitas udara untuk tiga hari ke depan, ditambah catatan titik panas dari satelit. Untuk tiap kabupaten/kota, data itu dibandingkan dengan ambang yang sudah ditetapkan, lalu hasilnya diberi level 0 sampai 3. Banjir dan longsor sedikit berbeda: levelnya diambil dari status banjir dan longsor tiap kecamatan di halaman banjir Centurisk97, lalu dipilih yang tertinggi di antara kecamatan dalam kabupaten/kota itu.

Dua hal perlu diingat. Pertama, satu titik di pusat kabupaten/kota mewakili seluruh kabupaten/kota, sehingga kondisi setempat yang berbeda bisa meleset. Kedua, tiap pagi prakiraan untuk besok, lusa, dan H+3 disimpan apa adanya dan tidak pernah diubah, supaya nanti bisa dicocokkan dengan kejadian sebenarnya tanpa ada yang diubah belakangan. Proses pembaruan dimulai sekitar pukul 08.50 WIB tiap hari dan data tampil setelah proses itu selesai. Sumber iklim dan musim berumur lebih lama dan diperbarui lebih jarang.

**Rincian: data yang dipakai.** Hujan, kelembapan tanah, gelombang, dan angin berasal dari layanan prakiraan cuaca global. Peluang hujan dan potensi karhutla berasal dari beberapa prakiraan sekaligus dengan kondisi awal yang sedikit berbeda (disebut ansambel); sebaran hasilnya memberi gambaran peluang. Asap berasal dari prakiraan kualitas udara. Titik panas (lokasi yang dideteksi satelit lebih panas dari sekitarnya) berasal dari satelit pemantau api. Muka laut berasal dari data rob. Kabupaten/kota yang tidak berpantai tidak punya kolom gelombang dan rob.

**Rincian: langkah hitung per bencana.**

1. Hujan: dihitung jumlah hujan 24 jam, jam mulai hujan, lama hujan (jumlah jam dengan hujan sedikitnya 0,5 mm), dan peluang melewati 1, 20, dan 50 mm. Bila prakiraan ansambel tersedia, peluang dibaca dari sebarannya. Bila tidak, dipakai skor kasar: makin dekat jumlah hujan ke ambang, makin tinggi skornya (0,8 bila sudah mencapai ambang, 0,4 bila sudah separuh, 0,05 selain itu). Skor kasar ini berlabel "skor kasar", bukan peluang yang sudah diperiksa terhadap kenyataan.
2. Banjir dan longsor: level tertinggi di antara kecamatan dalam kabupaten/kota (0 Normal sampai 3 Awas), ditambah peluang jalur hujan mencapai Siaga bila ansambel tersedia. Kabupaten/kota tanpa kecamatan berstatus dicatat Normal.
3. Titik panas: peluangnya memadukan seberapa sering ada titik panas dalam tiga hari terakhir dengan peluang indeks bahaya kebakaran hutan yang tinggi. Indeks ini menunjukkan seberapa mudah api menyebar karena cuaca kering dan berangin.
4. Asap: kadar PM2,5 rata-rata 24 jam dibandingkan tiga batas kategori mutu udara nasional: 55,4 (tidak sehat), 150,4 (sangat tidak sehat), dan 250,4 (berbahaya) mikrogram per meter kubik.
5. Gelombang: tinggi gelombang tertinggi di titik pesisir kabupaten/kota. Rob: apakah muka laut harian tertinggi melewati batas tinggi air yang hanya terlampaui sekitar 5 dari 100 hari di titik itu.
6. Angin: embusan tertinggi 10 meter di atas tanah dalam km per jam.

**Ambang level di layar:**

| Bencana | Level 0 | Level 1 Waspada | Level 2 Siaga | Level 3 Awas |
| --- | --- | --- | --- | --- |
| Hujan (24 jam) | kurang dari 20 mm | 20 sampai kurang dari 50 mm | 50 sampai kurang dari 100 mm | 100 mm ke atas |
| Titik panas (peluang) | kurang dari 20% | 20% sampai kurang dari 50% | 50% sampai kurang dari 80% | 80% ke atas |
| Gelombang | kurang dari 1,25 m | 1,25 sampai kurang dari 2,5 m | 2,5 sampai kurang dari 4,0 m | 4,0 m ke atas |
| Angin (embusan) | kurang dari 46 km/jam | 46 sampai kurang dari 63 | 63 sampai kurang dari 89 | 89 km/jam ke atas |

Asap memakai tiga batas kategori di atas (tidak ada batas terlewati sampai tiga batas terlewati). Rob berlevel 2 bila muka laut melewati batas dan 0 bila tidak. Banjir dan longsor memakai level kecamatan apa adanya. Level satu baris di tabel adalah level tertinggi di antara selnya. Warna titik panas hanya untuk tampilan, bukan status resmi.

**Contoh hitungan titik panas.** Sebuah kabupaten punya titik panas pada 2 dari 3 hari terakhir, sehingga porsinya sekitar 0,67. Peluang indeks bahaya kebakaran tinggi dari ansambel adalah 0,40. Rata-rata keduanya sekitar 0,53. Setelah disesuaikan sedikit oleh rumus tetap, hasilnya tetap sekitar 0,53, dibulatkan ke kelipatan lima menjadi 55%, dan berwarna oranye (Siaga).
