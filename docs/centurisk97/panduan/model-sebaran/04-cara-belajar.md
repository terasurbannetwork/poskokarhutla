# Cara model belajar dan diuji

Bahan dasar semua perkiraan ini sama: titik panas dari satelit dan data cuaca. Perbedaannya ada pada apa yang diramal dan seberapa jauh sudah teruji.

## Dari mana datanya

| Data | Isi | Seberapa sering |
| --- | --- | --- |
| Satelit VIIRS (S-NPP) | Titik panas sedetail 375 meter | Dua lintasan per hari (sekitar pukul 13.30 dan 01.30 waktu setempat) |
| Satelit VIIRS (NOAA-20) | Titik panas yang sama dari satelit lain | Sekitar 50 menit setelah S-NPP |
| Satelit VIIRS (NOAA-21) | Hanya arsip pendamping untuk uji | Mengikuti arsip |
| Satelit MODIS | Titik panas 2002 sampai 2026 | Harian; dipakai untuk tren 25 tahun |
| Cuaca per jam (untuk belajar) | Hujan, suhu, kelembapan, angin dari data cuaca olahan ulang | Per jam |
| Cuaca prakiraan | Prakiraan 33 hari ke belakang dan 3 sampai 4 hari ke depan | Diperbarui tiap hari |
| El Niño dan IOD | Indeks iklim laut dari NOAA | Bulanan |
| Lahan | Gambut (peta resmi Kementerian Pertanian), kawasan hutan, konsesi, kanal, jalan, desa, jumlah penduduk | Data tetap yang diperbarui berkala |

Satelit S-NPP dipensiunkan mulai 1 November 2026. Satelit utama dapat berpindah ke NOAA-20 bila syarat yang dikunci lebih dulu terpenuhi (lihat bagian Batasan nomor 9).

Satu titik panas mewakili kotak sekitar 375 meter, bukan batas api sebenarnya. Satelit tidak melihat api di bawah awan atau asap tebal. Hari kebakaran dihitung dari pukul 06.00 sampai 06.00 waktu matahari setempat, supaya lintasan dini hari masuk ke hari sebelumnya.

## Cara kerja umum: belajar dari masa lalu, lalu diuji pada tahun yang disembunyikan

Seperti dokter yang membaca ciri pasien lalu membandingkannya dengan ribuan kasus sebelumnya, sistem mempelajari ciri kebakaran lampau, lalu menebak kejadian baru yang cirinya mirip.

Untuk model per kotak, pembagian tahunnya begini: belajar dari kejadian 2015 sampai 2022, tahun 2023 untuk menyetel pengaturan, dan tahun 2024 sampai 2026 disimpan sebagai ujian akhir yang dibuka sekali saja. Cara ini mencegah model tampak pintar hanya karena sudah pernah melihat jawabannya.

Model peluang membesar (WASPADA) memakai cara lain: disetel dengan menguji bergantian pada satu tahun yang disembunyikan dalam rentang 2015 sampai 2023. Ujian 2024 sampai 2026 untuk model ini sudah pernah dilihat, jadi angkanya sedikit lebih optimistis daripada kenyataan. Model yang dipasang di layar dilatih ulang dengan semua tahun.

## Syarat kelayakan tampil: mengalahkan pembanding sederhana

Sebelum sebuah keluaran model boleh tampil sebagai perkiraan utama, ia harus mengalahkan pembanding yang sangat sederhana, misalnya anggapan api tidak berubah. Syaratnya: hasil model harus lebih baik daripada pembanding, dan keunggulan itu harus tetap terlihat setelah memperhitungkan ketidakpastian pengukuran (selang kepercayaan 95 persen, yaitu rentang yang dengan keyakinan 95 persen memuat nilai sebenarnya). Bila data penilaian hilang atau rusak, keluaran model disembunyikan.

Keadaan pada penilaian terakhir yang tersedia (23 Oktober 2026):

| Keluaran | Hasil model | Pembanding | Boleh tampil sebagai perkiraan utama |
| --- | --- | --- | --- |
| Model per kotak (tumpang tindih 24 jam, 123 kejadian) | 0,58 | Api tidak berubah: 0,67 | Tidak; tetap bisa dilihat berlabel eksperimental |
| Mesin fisika (ukuran kesalahan luas 72 jam, makin kecil makin baik) | 3,50 | Luas awal tetap: 1,01 | Tidak; tetap bisa dilihat berlabel belum divalidasi |
| Jejak api (tumpang tindih 72 jam) | 0,55 | Api tidak berubah: 0,61 | Tidak |
| Peluang membesar | Hasil uji balik baik | Menebak dengan laju umum | Tidak, karena uji berjalan belum lolos |

Penilaian ini diperbarui otomatis di situs, jadi keadaan terbaru dapat berbeda. Selalu baca label di layar.
