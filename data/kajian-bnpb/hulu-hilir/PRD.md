# PRD: Hulu ke hilir per kejadian

## 1. Tujuan

Staf Pusdalops, Koordalops, dan pimpinan membaca, dalam satu kartu dan satu lampiran cetak per kejadian banjir atau banjir bandang, rangkaian dari hulu ke hilir: DAS mana yang bekerja, hutan hilang di lereng apa dan di zona mana dan dekat sungai atau tidak, kapan hilangnya terhadap kejadian, hujan seperti apa yang turun, air menggenang seluas apa menurut radar dan menurut produk resmi, jalan dan desa mana yang tergenang, dan apakah peta bahaya yang kita pakai memang menunjuk tempat yang tergenang. Semuanya berlabel keadaan atau perkiraan, bukan sebab.

## 2. Pengguna dan hak

| Peran | Lihat | Ubah |
| --- | --- | --- |
| Pusdalops (PD), Koordalops (KO) | semua kejadian | memulai hitungan, mengganti DAS (D2), menandai Diperiksa, Dipakai, Tarik |
| BPBD kab (BP) | kejadian di kab wilayahnya, rincian disaring ke kab itu | tidak |
| Pimpinan | baca | tidak |
| Publik | tidak (Q6) | tidak |

## 3. Fitur

Kode F memetakan ke keputusan pemilik K1 sampai K8 di `KEPUTUSAN-HULU-HILIR.md`.

- F-1 (K1) Hutan hilang per tahun per kelas lereng (kurang dari 25, 25 sampai 40, lebih dari 40 persen, tak terdata) per DAS dan per sub-DAS, dengan porsi hutan awal per kelas sebagai penyebut dan laju hilang per kelas.
- F-2 (K2) Sempadan sungai 100 m kiri kanan per sub-DAS: luas, berhutan, kritis, dibuka tahun kejadian, dibuka sesudah.
- F-3 (K3) Zona hulu, tengah, hilir per DAS: luas, hutan awal, hutan hilang per tahun, genangan, porsi tiap zona.
- F-4 (K4) Hujan per DAS: IMERG 30 menit (puncak mm per jam, jam puncak, jam mulai naik, total jendela kejadian) dan CHIRPS (total tiga hari, bulan, tahun) dengan peringkat sejak tahun dasar; satu kalimat templat "hujan beberapa hari, bukan hujan setahun" hanya bila angkanya mendukung.
- F-5 (K5) Genangan berdampingan: GFM (dari `banjir_gfm`) dan produk resmi UNOSAT atau Charter bila tersedia; luas, luas per zona, kilometer jalan tergenang, jumlah desa tergenang (dua definisi, Q17).
- F-6 (K6) Label waktu hutan hilang: sebelum, tahun kejadian, sesudah; dengan alert mingguan bila lolos Q5. Tampil di setiap angka hutan hilang, bukan di satu tempat saja.
- F-7 (K7) Kartu "Hulu ke hilir" di `/siklus/kaji/:id` dan lampiran cetak A4 yang ditautkan dari kaji ulang, enam angka ringkas masuk potret beku kaji ulang.
- F-8 (K8) Uji bahaya: porsi genangan di kelas bahaya tinggi lawan porsi luas kelas itu, per kejadian uji dan gabungan, dengan vonis tertulis.
- F-12 (K11) Peta bekas longsor per kejadian dari citra sebelum dan sesudah: jumlah, luas, sebaran per kecamatan, DAS, sub-DAS, kelas lereng, zona; label "perkiraan dari citra".
- F-13 (K11) Golongan bekas longsor menurut tutupan sebelum (hutan utuh, lahan sudah terbuka, tak tentu) dan uji hipotesis "hutan hilang memperparah" dengan laju per km2 per kelas lereng, ditulis dengan aturan bahasa ALGORITMA 12 yang menjaga hujan ekstrem tetap terbaca (angka hujan satu blok dengan angka uji).
- F-14 (K11, K6) Hutan hilang tahun kejadian di dalam bekas longsor kejadian dikeluarkan dari "sebelum" dan dari "dibuka manusia".
- F-15 (K11) Jarak bekas longsor ke alur sungai dan pelebaran alur atau endapan lembah (selisih tanah terbuka di koridor sungai sebelum dan sesudah).
- F-16 (K11) Penggeser citra sebelum dan sesudah per lokasi (sampai 6) lewat `public/inti/geser.*`.
- F-17 (K11) Inventaris bekas longsor sebagai label kejadian untuk agent `longsor` (hanya sesudah vonis kalibrasi).
- F-9 Metode dan batas: lipat `<details>` memuat sumber, tahun data, ambang, hipotesis, kalimat templat, dan kalimat "bukan penyebab terbukti".
- F-10 Peta kejadian: DAS (garis), sempadan (garis tipis), zona (tiga warna kelas), sel genangan (titik 110 m) dan titik bukti hutan hilang sejak tahun Y dalam sel 5 km; tanpa koordinat bangunan.
- F-11 Tinjau lokal di `http://localhost:8800/siklus/kaji`.

## 4. Larangan

- Tanpa kalimat sebab dan tanpa kata dari daftar terlarang di ALGORITMA 9 (satu-satunya daftar). Kartu tanpa kalimat kesimpulan (AGENTS 3.5); kalimat templat hanya di lampiran cetak dan lipatan Metode. Yang dipakai: "di DAS ini", "berada di", "teramati radar", "di area genangan".
- Tanpa menjumlah atau merata-rata antarsumber (GFM, UNOSAT, DIBI, angka Pemkab, IMERG, CHIRPS).
- Kosong tidak pernah jadi nol: zona tak ada, tanpa DEM, tanpa lintasan, tanpa alert, tahun belum tercakup, produk resmi tak tersedia semuanya tertulis alasannya.
- Tanpa ambang yang disetel pengguna dan tanpa hitung ulang di peramban.
- Tanpa angka bangunan terendam dan tanpa data per bangunan atau per orang.
- Tanpa versi publik sebelum Q6 dijawab "ya".
- Tanpa buku kejadian kedua, tanpa tabel D1 baru untuk isi (hanya satu model di `sk_kaji`).
- Tanpa kalimat "hutan hilang memperparah longsor", "hutan melindungi", atau "longsor karena penebangan"; tanpa luas longsor dalam hektare sebagai fakta sebelum dibandingkan dengan inventaris manual atau resmi (Q22).
- Tanpa detektor bekas longsor kedua di luar `lereng_kejadian.py` (D17).
- Tanpa angka dari model tertutup tanpa uji (aturan RISET-KAJIAN-LUAR 4).

## 5. Ukuran berhasil

- Replikasi lunak Aceh Tamiang 24 sampai 26 Nov 2025 selesai ujung ke ujung dalam anggaran Q11 dan tiap angka punya sumber atau alasan kosong. Selisih terhadap angka storymap dilaporkan apa adanya, bukan disetel (ALGORITMA 10).
- Satu tahun kejadian tidak pernah tampil sebagai "sebelum" tanpa alert.
- Uji bahaya terkunci punya vonis tertulis (lulus, tidak terbukti, atau tak dapat dinilai) sebelum label "hipotesis" bagian itu berubah.
- Layar lolos `inp-reviewer` dan `selera-angka`, ditinjau pemilik di `http://localhost:8800/siklus/kaji`.
- Golden luring `hitung_hansen` (dibuat HH-01 sebelum menyunting `bukti_das.py`) identik, dan `bukti_das.py uji` serta `tests/banjir/bukti.test.mjs` tetap hijau (D1).
