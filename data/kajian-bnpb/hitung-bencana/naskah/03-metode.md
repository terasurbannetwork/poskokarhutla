# BAB 3 Metode

Status: Fase 2, draf untuk dibaca pemilik. Angka berasal dari `analisis/hasil/*.json` dan ringkasannya di `riset/SIM-KRITERIA.md` dan `riset/SIM-KARHUTLA.md`. Uji kerangka (3.5) baru dirancang di bab ini; hasilnya dilaporkan di Bab 7.


## 3.1 Pendekatan dua sisi

Kajian ini bekerja dari dua arah yang saling mengunci.

Sisi pertama bersifat induktif. Kita mengumpulkan paradoks penghitungan bencana, yaitu kasus yang jawabannya berbeda tergantung siapa yang menghitung dan aturan apa yang dipakai. Paradoks diperlakukan sebagai data primer. Contohnya dua api karhutla berjarak 1 km yang menyatu beberapa jam kemudian: dihitung satu kejadian atau dua tergantung aturan gabung yang dipilih, dan jawaban itu bisa diukur pada data nyata.

Sisi kedua bersifat deduktif. Kita merancang definisi dan klasifikasi dari regulasi, teori, dan praktik internasional. Hasilnya kerangka tiga lapis: unit kejadian (L1), ambang masuk (L2), dan skala keparahan (L3), ditambah aturan dampak dan kerugian (D) serta aturan penyajian (S). Pegangan teorinya bencana sebagai hasil bahaya, paparan, dan kerentanan yang dibagi kapasitas. Pegangan ini ikut diuji dan tidak diterima begitu saja.

Kedua sisi dipertemukan lewat satu aturan. Kerangka dianggap sah hanya bila lolos seluruh katalog paradoks. Cara kerjanya sama dengan uji unit pada perangkat lunak. Tiap paradoks adalah satu kasus uji, kerangka adalah kode yang diuji, dan kerangka yang gagal pada satu kasus harus diperbaiki atau keterbatasannya diakui secara tertulis. Kerangka yang menjawab paradoks A dengan logika yang bertentangan dengan jawabannya untuk paradoks B juga dianggap gagal, walaupun kedua jawabannya masuk akal bila dibaca sendiri-sendiri (3.5).

Kajian berjalan dalam tiga fase dengan titik henti. Bedah enam kriteria Juklak 7/2023 dan katalog paradoks dikerjakan pada Fase 1. Kerangka dan ujinya dikerjakan pada Fase 2. Usulan revisi Juklak, naskah lengkap, dan dokumen akhir menjadi hasil Fase 3. Pada tiap titik henti, pemilik kajian membaca hasilnya dan menjawab pertanyaan terbuka.

## 3.2 Sumber data

Tabel 3.1 memuat enam kelompok sumber yang dipakai. Angka antarsumber tidak dijumlah. Tiap angka di naskah menyebut sumber dan periodenya.

Tabel 3.1. Sumber data kajian

| Sumber | Berkas | Periode | Satuan | Jumlah baris | Keterbatasan utama |
| --- | --- | --- | --- | ---: | --- |
| DIBI, tarikan dasbor publik | `analisis/hasil/dibi_mentah_2024_2026.json`, ditarik 12 November 2026 lewat `analisis/tarik_dibi.py` | 1 Januari 2024 sampai 12 November 2026 | Baris DIBI (hari, kabupaten/kota, jenis) | 15.974 | Bukan jalur resmi; 2024 tidak lengkap; tanpa kolom luas lahan |
| Logbook Pusdalops, DOCX harian | Arsip lokal 302 hari, diurai lewat `analisis/urai_logbook_mentah.py` ke `analisis/hasil/logbook_baris_harian.json` | 1 Januari sampai 29 Oktober 2026 | Baris harian mentah | 9.329 | Angka dampak dari teks bebas; 1.461 baris tabel tidak terurai |
| Logbook Pusdalops, CSV | `data/pusdalops/logbook_kejadian.csv` | 2011 sampai 1 November 2026 | Kejadian pada tingkat catatan | 56.685 | Tanpa kolom korban jiwa dan terdampak; 659 tanggal kejadian tidak sah |
| Logbook Koordalops | `data/laporan-bnpb/bulanan/2026-10/masukan/logbook_kejadian.json` | 1 Januari sampai 11 November 2026 | Kejadian | 2.346 | Dipakai sebagai pembanding antarsumber saja; 446 kejadian tanpa tanggal mulai |
| Hotspot FIRMS VIIRS | Tiga arsip gabungan (`analisis/sim_data.py`) | 15 Oktober sampai 11 November 2026 | Deteksi satelit | 295.488 (nominal dan tinggi, daratan Indonesia) | 28 hari; bukan luas terbakar; S-NPP berhenti 1 November 2026 |
| Regulasi dan pustaka | `riset/REGULASI.md`, `riset/PUSTAKA.md` | Teks asli, dibuka 12 November 2026 | Pasal dan kutipan | tidak berlaku | Teks Juklak 7/2023 berasal dari salinan tidak resmi (Q-02) |

Sumber: `analisis/hasil/*.json`, `riset/SIM-KRITERIA.md`, `riset/SIM-KARHUTLA.md`, `riset/REGULASI.md`.

Enam catatan berikut menjelaskan tiap kelompok sumber pada Tabel 3.1.

**DIBI.** Tarikan memakai antarmuka dasbor publik DIBI (`dibi.bnpb.go.id`, jalur data bagan Superset) dan tidak menggabungkan baris kembar, sehingga satu baris sama dengan satu kombinasi hari, kabupaten/kota, dan jenis. Ada 26 kolom: 8 kolom identitas (tanggal, wilayah, jenis, kategori, dan penanda `is_bencana`), `jumlah_kejadian`, 16 kolom dampak, dan jumlah baris sumber. Tidak ada kolom luas lahan, permintaan bantuan, atau status darurat. DIBI 2024 hanya memuat 3.752 baris, dibanding 8.946 baris pada 2025, sehingga angka utama kajian memakai 12 bulan terakhir (13 November 2025 sampai 12 November 2026, 4.185 baris).

**Logbook DOCX.** Arsip harian Pusdalops diurai ulang dengan fungsi yang disalin tanpa perubahan dari pengurai laporan bulanan (`data/laporan-bnpb/bulanan/2026-10/logbook_okt.py`). Keluarannya baris harian sebelum digabung, sehingga deduplication key dapat dibandingkan (3.4). Hanya angka dan nama wilayah yang disimpan.

**Logbook CSV.** Arsip ini sudah berupa satu baris per kejadian dengan jumlah laporan dan hari dilaporkan, sebanyak 56.685 baris, dan menjadi dasar tren 2011 sampai 2026. Lonjakan 2013 mencerminkan kelengkapan arsip dan bukan kejadian yang naik sembilan kali lipat (Lampiran G).

**Hotspot.** Arsip terpanjang yang berstempel waktu dan dapat dipakai utuh adalah gabungan tiga sumber FIRMS VIIRS (S-NPP, NOAA-20, NOAA-21) setelah kembarannya dibuang. Dari 420.428 deteksi, 311.804 jatuh di daratan Indonesia menurut poligon kecamatan; setelah keyakinan rendah dibuang tinggal 295.488 titik, atau 140.813 piksel 375 m yang unik. MODIS tidak dipakai karena pikselnya 1 km.

**Regulasi dan pustaka.** Semua kutipan pasal diambil dari teks asli yang dibuka langsung. Satu pengecualian penting: teks Juklak 7/2023 berasal dari salinan PDF yang diunggah UNFPA Indonesia, bukan dari laman resmi JDIH BNPB, dan halaman 1 berupa gambar yang belum terbaca. Seluruh kutipan Juklak karena itu masuk daftar periksa sampai salinan resmi diperoleh. Praktik internasional (EM-DAT, DesInventar, Sendai, GLIDE, PAGER, GDACS, dan lima negara pembanding) dibuka dari sumber aslinya; yang tidak bisa dibuka ditandai [BELUM TERVERIFIKASI] di `riset/PUSTAKA.md`.

## 3.3 Penyusunan katalog paradoks

Katalog dibangun dalam tiga tahap.

Tahap pertama, **47 paradoks awal** (P-01 sampai P-47) berasal dari rancangan kajian. Semuanya dipertahankan.

Tahap kedua, **18 paradoks tambahan** (P-48 sampai P-65) berasal dari data. Cara menemukannya: membandingkan DIBI dengan logbook dan laporan harian, lalu mencatat setiap pola yang menghasilkan dua jawaban berbeda untuk pertanyaan yang sama. Contohnya pecahan `jumlah_kejadian` di DIBI, baris tanpa angka dampak, jenis gabungan "banjir dan tanah longsor", dan dua tangga ambang di Pusdalops.

Tahap ketiga, tiap paradoks dibedah dalam format tujuh butir yang seragam:

1. kasus konkret, diutamakan kejadian nyata Indonesia dengan sumber;
2. mengapa ini paradoks, yaitu dua jawaban yang sama-sama masuk akal tetapi bertentangan;
3. jawaban aturan saat ini, atau "tidak diatur" bila memang tidak diatur;
4. jawaban praktik dunia;
5. opsi penyelesaian, paling sedikit dua, masing-masing dengan akibatnya pada jumlah kejadian, tren, keadilan antardaerah, insentif pelapor, dan beban kerja pencatat;
6. uji empiris bila datanya ada;
7. rekomendasi, atau rujukan ke pertanyaan terbuka dengan bawaan sementara yang ditandai [BAWAAN SEMENTARA].

Paradoks dikelompokkan menjadi tujuh: identitas kejadian (A, 18 paradoks), ambang masuk (B, 14), ukuran dan korban (C, 13), kerugian dan uang (D, 4), klasifikasi besar, sedang, dan kecil (E, 5), penyajian (F, 7), serta kelembagaan (G, 4).

Terakhir, paradoks disambungkan menjadi **dependency map**. Tiap paradoks mencatat paradoks yang menentukan jawabannya ("Bergantung pada") dan paradoks yang jawabannya ia tentukan ("Menentukan"). Dari 65 paradoks terbentuk 239 hubungan arah (`analisis/hasil/peta_ketergantungan.json`). Dua ukuran dihitung dari graf itu: jumlah paradoks yang ditentukan langsung, dan skor PageRank pada graf yang dibalik, sehingga paradoks yang menjadi hulu bagi paradoks lain yang juga hulu mendapat skor lebih tinggi. Hasilnya P-45 (siapa berwenang menyatakan satu kejadian) menentukan 15 paradoks lain secara langsung dengan skor 10,1 persen, tertinggi dari semuanya. Kelemahan metode ini dicatat: hubungan ditetapkan per kelompok, sehingga hubungan antarkelompok cenderung kurang tercatat. Paradoks inti karena itu dipilih dari peringkat graf ditambah penilaian atas lapisan kerangka (Bab 5.5).

## 3.4 Simulasi

Semua simulasi memakai data nyata di repo. Skrip dan angka mentahnya ada di `analisis/` (Lampiran G).

### 3.4.1 Aturan gabung karhutla

Kejadian karhutla didefinisikan sebagai komponen terhubung, dihitung pada 295.488 titik (Tabel 3.1). Dua deteksi satelit dianggap sekawan bila jarak Haversine di antara keduanya paling jauh D kilometer dan selisih waktunya paling lama W jam. Penggabungan bersifat transitif (single-linkage): bila A sekawan dengan B dan B sekawan dengan C, ketiganya satu kejadian walaupun A dan C berjauhan. Pasangan dicari dengan struktur pohon k-d (`scipy.spatial.cKDTree`) dan komponen dengan `connected_components`.

Grid simulasi menguji sembilan sel: jarak D = 0,5, 1, dan 2 km dikalikan jendela W = 6, 24, dan 72 jam. Sel acuan adalah D = 1 km dan W = 24 jam. Untuk tiap sel kita mencatat jumlah kejadian, sebaran titik dan piksel per kejadian, jumlah kejadian berdurasi lebih dari 7 hari, jumlah kejadian lintas kabupaten dan provinsi, jumlah penggabungan, dan jumlah kejadian yang menyala lagi.

Dua definisi turunan dipakai berikut ini.

- **Penggabungan bermakna** berarti bahwa pada 24 jam pertamanya kejadian terdiri dari sedikitnya dua kelompok terpisah, dan tiap kelompok memuat sedikitnya 3 piksel unik.
- **Menyala lagi** berarti ada deteksi lebih awal dalam D km dari kejadian yang awalnya sesudah deteksi itu, dengan selisih waktu lebih dari W jam.

### 3.4.2 Luas dan ambang luas

Data kita tidak memuat luas terbakar. Luas karena itu diganti proxy: jumlah piksel 375 m yang unik sepanjang umur kejadian dikalikan 14,0625 ha. Proxy ini kasar. Satu piksel yang sama berulang dihitung sekali, api kecil di dalam piksel dihitung 14,06 ha, dan api yang tertutup awan atau asap tidak terlihat sama sekali.

Akibat langsung dari proxy ini, ambang luas 1 ha dan 10 ha tidak menyaring apa pun, sebab kejadian terkecil sudah 14,06 ha. Ambang yang efektif adalah 2 piksel (28,1 ha), 4 piksel (56,25 ha, lolos ambang 50 ha), dan 8 piksel (112,5 ha, lolos ambang 100 ha). Simulasi tetap menjalankan keempat ambang (1, 10, 50, dan 100 ha) supaya keterbatasan ini terlihat dalam angka dan tidak berhenti sebagai pernyataan.

### 3.4.3 Urutan penerapan ambang

Hasil bergantung pada urutan operasi. Dua urutan dibandingkan pada sel acuan.

- urutan (a): kelompok harian yang di bawah ambang dibuang lebih dulu, baru sisanya digabung antarhari;
- urutan (b): kejadian digabung lebih dulu, baru yang di bawah ambang dibuang.

Selisih antara (a) dan (b) mengukur seberapa jauh urutan mengubah jumlah kejadian dan luas. Bagian ini menjawab pertanyaan apakah ambang diterapkan sebelum atau sesudah kejadian dibentuk (P-13, P-14).

### 3.4.4 Deduplication key logbook

Logbook Pusdalops menulis kejadian yang sama berulang tiap hari dengan keterangan "Update". Jumlah kejadian karena itu bergantung pada kunci yang dipakai untuk membuang duplikat. Lima varian dibandingkan pada 9.329 baris harian mentah (Januari sampai Oktober 2026):

Tabel 3.2. Lima varian deduplication key logbook

| Varian | Kunci |
| --- | --- |
| V1 | jenis, provinsi, kabupaten/kota, tanggal kejadian |
| V1g | V1 ditambah penggabungan kabupaten yang beririsan; sama dengan yang dipakai `logbook_2026.json` |
| V2 | jenis, provinsi, kabupaten/kota, dengan jeda antarkemunculan paling lama 7 hari; tanpa tanggal |
| V3 | jenis, provinsi, tanggal kejadian; tanpa kabupaten/kota |
| V4 | tanpa deduplication; tiap baris harian dihitung |

Sumber: `analisis/uji_kunci_logbook.py`, keluaran `analisis/hasil/uji_kunci_logbook.json`.

Untuk tiap varian kita juga membandingkan tiga aturan angka dampak ketika satu kejadian muncul di lebih dari satu hari laporan:

- **maks** memakai nilai terbesar sepanjang kemunculan;
- **jumlah** memakai penjumlahan seluruh kemunculan;
- **terakhir** memakai nilai pada laporan terakhir.

Logbook menulis angka kumulatif, sehingga aturan jumlah diperkirakan melipatgandakan dampak. Simulasi mengukur seberapa besar kelipatannya, dan seberapa jauh maks dan terakhir berbeda karena angka sering dikoreksi turun pada laporan berikutnya. Untuk varian V1, dinamika antarhari juga dihitung: kejadian yang dikoreksi turun, kejadian yang naik kelas (tidak lolos ambang di hari pertama, lolos di laporan kemudian), dan selisih antara tanggal kejadian dan tanggal pertama dilaporkan.

### 3.4.5 Uji kriteria K1 sampai K3 di DIBI

Tiga kriteria dampak Juklak 7/2023 diuji pada baris DIBI tarikan 12 November 2026. Definisi uji ada di kotak berikut.

:::metode
Definisi uji kriteria pada DIBI. Satuan uji adalah baris DIBI (hari, kabupaten/kota, jenis). Sebuah baris lolos bila memenuhi sedikitnya satu dari tiga kriteria berikut.

K1: jumlah meninggal paling sedikit 1.

K2: jumlah terdampak (kolom DIBI "menderita"), luka, dan mengungsi, dijumlah, paling sedikit 50. Bila K2 dibaca sebagai salah satu kategori saja yang mencapai 50, jumlah baris yang lolos minimal satu kriteria turun dari 1.903 ke 1.899 pada 12 bulan terakhir, sehingga tafsir ini tidak mengubah kesimpulan.

K3: jumlah rumah rusak berat, sedang, dan ringan, ditambah satuan pendidikan, rumah ibadah, fasilitas kesehatan, kantor, dan jembatan yang rusak, paling sedikit 5. Rumah terendam tidak dihitung. Kolom `fasum_rusak` dipisah dan tidak dihitung.

K4 sampai K6 tidak dapat diuji: DIBI tidak punya kolom luas lahan, permintaan bantuan nasional, atau status keadaan darurat.
:::

Kepekaan diuji dengan mengubah satu ambang dan menghitung ulang jumlah baris yang lolos. K1 diuji pada 1, 3, dan 10 orang; K2 diuji pada 10, 50, 100, dan 500 jiwa, dan K3 pada 1, 5, 10, dan 50 unit. Gabungan ketiganya diuji pada beberapa kombinasi, termasuk aturan EM-DAT (paling sedikit 10 meninggal atau 100 terdampak) sebagai pembanding. Pengujian juga memeriksa tiga hal: kriteria mana yang menjadi penentu tunggal, akibat logika ATAU dibanding logika DAN, dan konsentrasi dampak pada baris teratas. Pengujian per jenis bencana dilakukan untuk sembilan kelompok jenis.

### 3.4.6 Skala keparahan

Empat opsi skala keparahan (a absolut, b relatif terhadap kapasitas daerah, c terkait tingkat status darurat, d indeks gabungan) disimulasikan pada data 2024 sampai 2026. Rancangan dan hasilnya diuraikan di Bab 7.

## 3.5 Uji kerangka

Setelah kerangka dirancang (Bab 6), kerangka diuji dalam empat cara. Hasilnya dilaporkan di Bab 7.

**Matriks paradoks dan lapisan.** Tiap dari 65 paradoks diberi satu dari tiga status terhadap tiap lapisan kerangka yang relevan: TERJAWAB (kerangka memberi jawaban tunggal yang dapat dioperasikan), SEBAGIAN (jawaban memerlukan keputusan pemilik yang belum diambil atau data yang belum ada), atau GAGAL (kerangka tidak memberi jawaban atau jawabannya salah pada kasus uji). Tiap status GAGAL harus diperbaiki atau diakui sebagai keterbatasan dengan alasan tertulis.

**Uji konsistensi.** Semua pasangan jawaban diperiksa untuk memastikan tidak ada dua paradoks yang dijawab dengan logika yang saling bertentangan. Contohnya aturan gabung L1 tidak boleh membuat jawaban untuk P-05 (lintas batas) berlawanan dengan jawaban untuk P-48 (pecahan kejadian). Pemeriksaan dilakukan berpasangan pada 239 hubungan di dependency map (3.3), mulai dari paradoks yang paling banyak menentukan paradoks lain. Pertentangan yang ditemukan dicatat sebagai temuan di Bab 7, bukan disembunyikan lewat penafsiran.

**Uji ulang pada data 2024 sampai 2026.** Kerangka diterapkan pada DIBI dan logbook 2024 sampai 2026, lalu dibandingkan dengan angka resmi: jumlah kejadian, sebaran keparahan, dan tren. Karena DIBI 2024 tidak lengkap (3.752 baris), perbandingan tren memakai periode sebanding dan menandai series break data.

**Uji adversarial.** Seorang pemeriksa baru yang tidak punya riwayat penulisan mencoba mematahkan kerangka dengan paradoks baru. Paradoks baru yang lolos dari kerangka dimasukkan ke katalog (diberi kode P-66 dan seterusnya) dan kerangkanya diperbaiki.

## 3.6 Pemeriksaan mutu

Ada tiga lapis pemeriksaan.

**Pemeriksa independen.** Pada akhir tiap fase (Bab 3.1), naskah diperiksa oleh pemeriksa yang tidak ikut menulisnya dan tidak membawa riwayat penulisannya. Penulis tidak memeriksa naskahnya sendiri. Pemeriksa membaca dokumen akhir dan melaporkan temuan, termasuk angka yang tidak cocok dengan berkas sumber.

**Detektor anti-slop.** Setiap berkas naskah dijalankan melalui detektor otomatis (`data/kajian-bnpb/qa/slop.py`) yang mengikuti aturan di `data/kajian-bnpb/ANTI-SLOP.md`. Detektor menolak tanda baca terlarang, frasa kosong, dan paragraf tanpa angka atau rujukan. Detektor memberi skor 0 sampai 100 per 1.000 kata; berkas lulus bila skor di bawah 20 dan tanpa pola berbobot kritis atau tinggi. Naskah dianggap selesai hanya bila detektor melaporkan lolos.

**Aturan kejujuran.** Empat aturan berlaku untuk seluruh naskah:

- tidak ada angka, pasal, kejadian, kutipan, atau sitasi yang dikarang;
- yang belum dapat diverifikasi ditandai [BELUM TERVERIFIKASI] dan masuk daftar periksa;
- kasus rekaan ditandai [ILUSTRASI];
- pertanyaan yang memerlukan keputusan pemilik ditulis sebagai pertanyaan terbuka (Q-xx) dengan bawaan sementara yang ditandai [BAWAAN SEMENTARA] dan dikumpulkan di `KEPUTUSAN.md`.

Data pribadi tidak masuk naskah. Nama korban, petugas, dan pelapor serta nomor telepon tidak disimpan di berkas analisis maupun di naskah.

## 3.7 Keterbatasan data

Tujuh keterbatasan berikut memengaruhi cara angka di kajian ini dibaca.

1. **DIBI tidak resmi lewat antarmuka dan dikoreksi susulan.** Tarikan memakai jalur dasbor publik, bukan unduhan resmi dari walidata. DIBI sering dikoreksi susulan, sehingga angka 12 bulan terakhir dapat berubah bila tarikan diulang. Arti resmi kolom `is_bencana` dan `jumlah_kejadian` pecahan adalah tafsiran dari pola data dan belum dikonfirmasi Pusdatinkom.
2. **DIBI 2024 tidak lengkap.** Hanya 3.752 baris, dibanding 8.946 baris pada 2025. Kenaikan 138 persen itu mencerminkan kelengkapan, bukan kejadian. Analisis tren yang melewati 2024 ditandai tidak sebanding.
3. **Tidak ada kolom luas.** DIBI tidak menyimpan luas lahan, sehingga K4 tidak dapat diuji dan hasil karhutla (1,4 persen baris lolos) hanya batas bawah. K5 dan K6 juga tidak ada di DIBI.
4. **Angka logbook diurai dari teks bebas.** Meninggal, terdampak, rumah, dan hektare diambil dengan pola teks. Hektare terbukti terinflasi oleh salah urai (contohnya angka maksimum Januari sampai Oktober yang mencapai 2,1 juta ha) dan tidak dipakai untuk menguji K4. Sebanyak 1.461 baris tabel tidak terurai karena tidak punya tanggal atau provinsi.
5. **Hotspot bukan luas terbakar.** Satu piksel 375 m dihitung 14,06 ha tanpa melihat luas api sebenarnya. Awan, asap, dan hujan menutupi deteksi, sehingga jeda tanpa deteksi belum tentu berarti api padam. Sumber panas non-api seperti kilang dan tambang tidak disaring pada simulasi ini.
6. **Arsip satelit pendek dan sensor berganti.** Arsip berstempel waktu hanya 28 hari (15 Oktober sampai 11 November 2026) dan memuat puncak 22 Oktober. Jumlah titik per hari turun dari 42.137 pada 22 Oktober ke sekitar 2.000 sampai 5.000 pada awal November. S-NPP berhenti didistribusikan pada 1 November 2026 pukul 13.00 UTC, sehingga jumlah titik per hari tidak sebanding sepanjang arsip. Kejadian di tepi arsip terpotong. Simulasi ini juga bukan backtest terhadap kejadian resmi.
7. **Wawancara belum dilakukan.** Daftar pertanyaan untuk Pusdalops BNPB, BPBD (paling sedikit tiga provinsi dengan tipe bencana berbeda), dan Pusdatinkom sudah disusun (Lampiran E), tetapi belum ada jawaban. Asal-usul angka ambang, arti kolom DIBI, dan praktik penggabungan di lapangan karena itu masih bersandar pada bukti dokumen dan data.

Keterbatasan lain yang lebih sempit disebut di tempat angkanya dipakai, dan dikumpulkan di Bab 10.
