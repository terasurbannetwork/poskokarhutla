# Mesin fisika Simulasi

Halaman ini mencatat mesin fisika Simulasi dan jejak api kompleks aktif.

## Mesin fisika Simulasi (`public/index.html:6706` sampai 6830, port `simfisika.py`)

Mesin ini menghitung laju api permukaan dengan sistem prakiraan perilaku api Kanada (FBP) dan menyebarkannya di kisi dengan algoritma waktu tempuh minimum (Dijkstra) yang dipakai juga oleh model seperti FlamMap dan FARSITE. Belum divalidasi untuk Indonesia.

Laju ujung api per bahan bakar (m per menit):

```
ISI       = 0,208 * fWI(angin) * fFF(FFMC)
fFF(F)    = 91,9 * exp(-0,1386 m) * (1 + m^5,31 / 4,93e7),  m = 147,27723 (101 - F) / (59,5 + F)
fWI(W)    = exp(0,05039 W)                          bila W <= 40
          = 12 (1 - exp(-0,0818 (W - 28)))          bila W > 40
ROS       = a * (1 - exp(-b * ISI))^c * CF * fBUI
fBUI      = exp(50 ln(0,90) (1/BUI - 1/32))         hanya semak dan hutan; BUI <= 0 -> 1
CURING(c) = 0,005 (exp(0,061 c) - 1)                bila c < 58,8
          = 0,176 + 0,02 (c - 58,8)                 bila c >= 58,8
```

Laju belakang memakai ISI dengan efek angin berbalik (`bisi = 0,208 exp(-0,05039 W) fFF`). Bentuk elips: `a = (kepala + belakang) / 2`, `b = a / LB`, dengan rasio panjang-lebar `LB = 1 (angin < 1 km/jam), 1,1 W^0,464` untuk tipe rumput dan `1 + 8,729 (1 - exp(-0,030 W))^2,155` untuk lainnya. Laju ke tiap dari 16 arah tetangga diperoleh dari persamaan elips yang berpusat di titik api. Laju antara dua sel adalah rata-rata harmonik laju kedua sel kali faktor skenario.

Parameter bahan bakar (`BAHAN`, `public/index.html:6707`, sama dengan `simfisika.py`):

| Bahan bakar | a | b | c | CF | Catatan |
| --- | --- | --- | --- | --- | --- |
| Gambut terbuka atau bekas terbakar | 190 | 0,031 | 1,4 | curing 80% | O-1a; bara bawah permukaan 2,7 cm per jam |
| Alang-alang, rumput | 190 | 0,031 | 1,4 | curing 90% | O-1a |
| Sabana (NTT, Papua Selatan) | 250 | 0,035 | 1,7 | curing 95% | O-1b |
| Semak, hutan sekunder | 30 | 0,0232 | 1,6 | 1 | proksi D-1, efek BUI |
| Hutan lindung di tanah mineral | 30 | 0,0232 | 1,6 | 0,5 | proksi D-1 kali 0,5 (asumsi serasah di bawah tajuk) |
| Kebun sawit | 190 | 0,031 | 1,4 | curing 60% | asumsi |

Aturan tambahan di `sebar` (`public/index.html:6763`): waktu tempuh dihitung per jam dengan antrean prioritas biner (FIFO: api menunggu bila laju kurang dari 0,6 meter per jam); hujan 3 mm per jam atau lebih memadamkan api permukaan di tanah mineral, sedangkan di gambut api dianggap tetap membara dan menyala lagi; garis tak terbakar (air, sekat) tidak boleh dilompati lewat langkah diagonal atau kuda; serangan awal mengunci porsi keliling api sebesar `garis terbangun / keliling` dan menghentikan api bila porsi mencapai 1. Kisi 240 kali 240 sel dengan sisi sel minimal 120 m (kisi minimal 28,8 km, melebar bila benih tersebar). FFMC awal diambil dari kompleks dan dibawa per jam dengan `hffmc` memakai suhu, kelembapan, angin, dan hujan skenario.

Skenario (`SKEN`, `cuacaSkenario`, `public/index.html:6716`, `6938`): Prakiraan memakai cuaca per jam Open-Meteo apa adanya; Kemarau ekstrem meniadakan hujan, menurunkan RH 15 poin (minimal 10 persen), dan menaikkan suhu 2 derajat; Angin kencang memakai embusan prakiraan atau 1,5 kali angin rata-rata, mana yang lebih besar; Hujan datang menambahkan hujan pada jam yang dipilih; Serangan awal membangun garis kendali; Sekat memasang garis tak terbakar tegak lurus arah penjalaran dominan 24 jam.

Kalibrasi (`Sim.kalibrasi`, `public/index.html:7007`): bila kompleks punya riwayat 2 hari atau lebih dan luas 100 hektare atau lebih, pengali laju global dicari dengan bisection 9 langkah antara 0,02 dan 2 hingga pertumbuhan 24 jam sama dengan luas dibagi hari aktif; hasilnya dilaporkan lemah bila pengali di bawah 0,025 atau di atas 1,9. Tanpa syarat itu pengali 1 dan kartu memberi peringatan bahwa model belum terkalibrasi dan pada uji cenderung melebihkan luas hingga puluhan kali.

Kesetaraan koreksi: efek BUI pada JavaScript dan Python sudah sama (`50 ln(0,90) (1/BUI - 1/32)`; pada `simfisika.py:35` nilai BUI0 32 dan kuantitas pengali 50 dipisahkan). Tiap perubahan satu sisi harus diikuti sisi lain.

## Jejak api kompleks aktif (`jejak.py`)

Mesin sama dengan model sel di peramban (Python setara `SebaranModel.ramal`, Monte Carlo, fitur dari `fitur.baris_sel`). Keadaan awal tiap kompleks adalah deteksi VIIRS sensor primer (nominal atau tinggi, 7 hari, `hotspot.json`) di kotak poligon kompleks (`kluster.json`); sel aktif adalah terdeteksi 24 jam sebelum acuan. Peluang sel adalah frekuensi kumulatif dari `JEJAK_MC` putaran (bawaan 20; minimal 8), hanya sel dengan peluang 5 persen atau lebih ditulis (`AMBANG_P = 0.05`), maksimal 3.000 sel per cakrawala per kompleks, berkas maksimal 1.900.000 byte, 300 kompleks, anggaran 900 detik, maksimal 90 detik per kompleks. Urutan kompleks: level, penduduk sekitar (WorldPop 3 kali 3 sel), lalu skor. Berkas menulis `status` (`ok`, `tanpa_viirs`, `tanpa_primer`, `data_basi` bila `hotspot.json` lebih tua dari 12 jam) dan `cakupan` (jumlah aktif, diramal, alasan dilewati). Beda dengan peramban: `umur_jam` diukur sejak deteksi pertama kompleks (sesuai data latih), sedangkan peramban memulai 0; tidak ada `p_lepas` karena model membesar untuk titik baru, bukan kompleks.
