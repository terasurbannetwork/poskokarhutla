# Mesin fisika penjalaran api

Peringatan utama: pada uji, mesin ini cenderung melebihkan luas hingga puluhan kali bila laju tidak disesuaikan dengan pertumbuhan yang teramati. Pakai hanya untuk membandingkan skenario.

Pertanyaan: bila cuaca dan tindakan berbeda, kapan api tiba di tiap lokasi dan berapa luasnya?

Gambaran: api merambat seperti riak air yang lebih cepat searah angin dan melalui bahan yang kering. Peta dibagi menjadi petak, dan sistem menghitung berapa lama api sampai dari petak ke petak.

Langkah hitung:

1. Tiap petak diberi jenis bahan bakar: gambut, alang-alang, sabana, semak atau hutan sekunder, hutan lindung, atau kebun sawit. Tiap jenis punya laju rambat dasar sendiri, dan sebagian memakai perkiraan pengganti atau asumsi.
2. Laju api di ujung depan dihitung dengan sistem prakiraan perilaku api Kanada dari kekeringan serasah halus dan kecepatan angin. Untuk semak dan hutan, kekeringan bahan bakar yang lebih dalam ikut diperhitungkan; untuk jenis lahan lain tidak. Makin kering dan makin kencang angin, makin cepat api.
3. Bentuk api digambarkan memanjang searah angin, sehingga laju diperoleh ke tiap arah.
4. Api dijalarkan dari petak ke petak dengan cara mencari waktu tempuh tercepat, cara yang juga dipakai perangkat lunak perilaku api lain di dunia. Hasilnya waktu tiba api di tiap petak.

Aturan tambahan:

1. Bila laju kurang dari 0,6 meter per jam, api menunggu.
2. Hujan 3 mm per jam atau lebih memadamkan api permukaan di tanah mineral. Pada gambut api dianggap tetap membara dan menyala lagi.
3. Air dan sekat tidak boleh dilompati.

Tiap skenario mengubah masukannya: Kemarau ekstrem meniadakan hujan, menurunkan kelembapan 15 poin, dan menaikkan suhu 2 derajat. Angin kencang memakai embusan prakiraan atau 1,5 kali angin rata-rata (mana yang lebih besar). Hujan datang menambah hujan pada jam yang dipilih. Serangan awal membangun garis kendali yang menghentikan api bila seluruh kelilingnya sudah tertutup. Sekat memasang garis tak terbakar tegak lurus arah penjalaran utama.

Kalibrasi: bila kompleks sudah punya riwayat 2 hari atau lebih dan luas 100 hektare atau lebih, laju disesuaikan agar pertumbuhan 24 jam sama dengan yang teramati. Tanpa syarat itu, laju tidak disesuaikan dan kartu memberi peringatan.

Seberapa bisa dipercaya: mesin ini diambil dari cara kerja negara lain dan belum divalidasi untuk Indonesia. Pada 123 kejadian lampau, ukuran kesalahan perkiraan luas 72 jam adalah 3,50, jauh lebih buruk daripada menganggap luas awal tidak berubah (1,01; makin kecil makin baik). Maka mesin ini dipakai hanya untuk membandingkan skenario satu sama lain, misalnya seberapa besar bedanya bila regu tiba 6 jam lebih cepat, bukan untuk menyebut luas pasti.
